#!/usr/bin/env python3
"""Ecosystem rules for Python, checked on the AST rather than with a regex.

A regex over the source text flags the comments and docstrings that *talk about*
these rules -- Polybot has three of those and zero real violations. Walking the
AST only ever sees code, so there is nothing to explain away.
"""

import ast
import subprocess
import sys

NAIVE_NOW = {"now", "today"}
PATH_CLASSES = {"Path", "PurePath", "PosixPath", "WindowsPath"}


def tracked_python_files() -> list[str]:
    out = subprocess.run(
        ["git", "ls-files", "-z", "--", "*.py"],
        capture_output=True, text=True, check=True,
    ).stdout
    return [f for f in out.split("\0") if f]


def call_name(node: ast.Call) -> str:
    """Dotted name of the callee, e.g. 'datetime.now' or 'open'."""
    parts, cur = [], node.func
    while isinstance(cur, ast.Attribute):
        parts.append(cur.attr)
        cur = cur.value
    if isinstance(cur, ast.Name):
        parts.append(cur.id)
    elif isinstance(cur, ast.Call):
        # A method on a fresh object keeps its constructor: `ZipFile(p).open(n)` becomes
        # 'ZipFile().open' and `Path(cfg).open()` becomes 'Path().open', so the open()
        # check can tell a binary archive member from a text file.
        parts.append(call_name(cur) + "()")
    else:
        # A subscript, a literal: nothing to tell it by.
        parts.append("?")
    return ".".join(reversed(parts))


def literal_mode(node: ast.Call, pos: int = 1) -> str:
    """The mode argument of open(): '' when absent, and also when it is not a literal.

    `pos` is its positional index: 1 for open(file, mode), 0 for Path(...).open(mode).

    Deliberate decision: a mode held in a variable is treated as TEXT, so encoding is
    still demanded. If it was really 'rb' the fix is to write the mode as a literal,
    and CI says so loudly. The opposite choice would let `open(f, mode)` in text mode
    through in silence, which is the failure this rule exists for.
    """
    arg = node.args[pos] if len(node.args) > pos else None
    for kw in node.keywords:
        if kw.arg == "mode":
            arg = kw.value
    if arg is None:
        return ""
    if isinstance(arg, ast.Constant) and isinstance(arg.value, str):
        return arg.value
    return ""


def is_path_value(node: ast.AST | None) -> bool:
    """`Path(x)`, `pathlib.Path(x)` or a chain starting at one, like `Path(x).resolve()`."""
    if not isinstance(node, ast.Call):
        return False
    parts = [part.removesuffix("()") for part in call_name(node).split(".")]
    return any(part in PATH_CLASSES for part in parts)


def node_parents(tree: ast.AST) -> dict[ast.AST, ast.AST]:
    parents = {}
    for parent in ast.walk(tree):
        for child in ast.iter_child_nodes(parent):
            parents[child] = parent
    return parents


def scope_of(node: ast.AST, tree: ast.AST, parents: dict[ast.AST, ast.AST]) -> ast.AST:
    cur = node
    while cur in parents:
        cur = parents[cur]
        if isinstance(cur, (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda)):
            return cur
    return tree


def path_names(tree: ast.AST, parents: dict[ast.AST, ast.AST]) -> dict[ast.AST, set[str]]:
    """Plain names bound straight to a Path, so that `p.open()` is seen as a Path open.

    Covers `p = Path(x)`, `p = Path(x).resolve()` and `p: Path = Path(x)`.

    The names are tracked per scope (module/function/lambda), so one function's `p`
    does not make another function's unrelated `p.open()` look like Path.open().
    Known limit, accepted on purpose: this is syntax, not type inference. A Path that
    reaches `.open()` through a function parameter, an attribute (`self.p`), a return
    value or a `/` join is NOT seen. Closing that needs a type checker, not an AST walk.
    """
    names: dict[ast.AST, set[str]] = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign) and is_path_value(node.value):
            scope = scope_of(node, tree, parents)
            names.setdefault(scope, set()).update(
                t.id for t in node.targets if isinstance(t, ast.Name)
            )
        elif (isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name)
                and is_path_value(node.value)):
            scope = scope_of(node, tree, parents)
            names.setdefault(scope, set()).add(node.target.id)
    return names


def is_path_open(name: str, paths: set[str]) -> bool:
    """Path(x).open(), Path(x).resolve().open() or p.open() with p = Path(x)."""
    if not name.endswith(".open"):
        return False
    base = name.split(".")[0]
    parts = [part.removesuffix("()") for part in name.split(".")]
    return base in paths or any(part in PATH_CLASSES for part in parts)


def datetime_names(tree: ast.AST) -> set[str]:
    """Names that stand for the datetime class in this module.

    `from datetime import datetime as DT` makes `DT.now()` just as naive as
    `datetime.now()`, and no amount of string matching on the dotted name would
    see it. The import statements are right there in the tree; read them.
    """
    names = {"datetime"}
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom) and node.module == "datetime":
            for alias in node.names:
                if alias.name == "datetime" and alias.asname:
                    names.add(alias.asname)
    return names


def check(path: str) -> list[tuple[int, str]]:
    try:
        tree = ast.parse(open(path, encoding="utf-8").read(), filename=path)
    except (SyntaxError, UnicodeDecodeError) as exc:
        return [(getattr(exc, "lineno", 0) or 0, f"no se puede analizar: {exc}")]

    parents = node_parents(tree)
    clase_datetime = datetime_names(tree)
    paths = path_names(tree, parents)
    found = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        name = call_name(node)
        scoped_paths = paths.get(scope_of(node, tree, parents), set()) | paths.get(tree, set())

        # datetime.now() / .today() with no tz, and utcnow() which never has one.
        # The module is identified by the component right before the method, never by
        # the start of the dotted name: `import datetime as dt` makes it `dt.datetime.now`,
        # and a prefix test lets that one through.
        parts = name.split(".")
        # Same receiver test as now/today: a local aware wrapper, or pandas'
        # Timestamp.utcnow(), is not the naive standard-library one.
        if parts[-1] == "utcnow" and len(parts) >= 2 and parts[-2] in clase_datetime:
            found.append((node.lineno, "utcnow() es naive: usa ZoneInfo('Europe/Madrid')"))
        elif parts[-1] in NAIVE_NOW and len(parts) >= 2 and parts[-2] in clase_datetime:
            has_tz = bool(node.args) or any(kw.arg == "tz" for kw in node.keywords)
            if not has_tz:
                found.append((node.lineno, f"{name}() sin zona horaria: usa ZoneInfo('Europe/Madrid')"))

        # open() in text mode without an explicit encoding.
        # io.open is the builtin; Path(...).open takes an encoding too.
        elif name in ("open", "io.open") or is_path_open(name, scoped_paths):
            mode = literal_mode(node, 1 if name in ("open", "io.open") else 0)
            if "b" in mode:
                continue  # binary: encoding does not apply
            if not any(kw.arg == "encoding" for kw in node.keywords):
                found.append((node.lineno, "open() sin encoding='utf-8' (si es binario, pon el modo como literal)"))

    return found


def main() -> int:
    total = 0
    for path in tracked_python_files():
        for lineno, message in check(path):
            print(f"::error file={path},line={lineno}::{message}")
            total += 1
    if total:
        print(f"\n{total} incumplimientos de los estandares de Python del ecosistema.")
        return 1
    print("Python: sin datetime naive ni open() sin encoding.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
