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
    return ".".join(reversed(parts))


def literal_mode(node: ast.Call) -> str | None:
    """The mode argument of open(), when it is a literal we can read."""
    if len(node.args) >= 2 and isinstance(node.args[1], ast.Constant):
        value = node.args[1].value
        return value if isinstance(value, str) else None
    for kw in node.keywords:
        if kw.arg == "mode" and isinstance(kw.value, ast.Constant):
            value = kw.value.value
            return value if isinstance(value, str) else None
    return None


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

    clase_datetime = datetime_names(tree)
    found = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        name = call_name(node)

        # datetime.now() / .today() with no tz, and utcnow() which never has one.
        # The module is identified by the component right before the method, never by
        # the start of the dotted name: `import datetime as dt` makes it `dt.datetime.now`,
        # and a prefix test lets that one through.
        parts = name.split(".")
        if parts[-1] == "utcnow":
            found.append((node.lineno, "utcnow() es naive: usa ZoneInfo('Europe/Madrid')"))
        elif parts[-1] in NAIVE_NOW and len(parts) >= 2 and parts[-2] in clase_datetime:
            has_tz = bool(node.args) or any(kw.arg == "tz" for kw in node.keywords)
            if not has_tz:
                found.append((node.lineno, f"{name}() sin zona horaria: usa ZoneInfo('Europe/Madrid')"))

        # open() in text mode without an explicit encoding.
        elif name == "open":
            mode = literal_mode(node)
            if mode is not None and "b" in mode:
                continue  # binary: encoding does not apply
            if not any(kw.arg == "encoding" for kw in node.keywords):
                found.append((node.lineno, "open() sin encoding='utf-8'"))

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
