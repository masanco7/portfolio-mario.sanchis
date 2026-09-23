# Guía de estilos

Sistema visual común de masanco-hub (v1, 2026-09-23). Lo comparten **polybot,
finance-manager, gym-tracker y el portfolio**. Integras queda fuera a propósito: es
una herramienta B2B con identidad propia (plana, sin animaciones).

## Qué es común y qué es de cada app

| Común (base `masanco-foundation.css`) | De cada app (su marca) |
|---|---|
| Escala tipográfica, interlineados, tracking | Paleta: acento, superficies, texto |
| Espaciado (base 4 px) | Familia tipográfica |
| Radios por función, alturas de control | Recetas propias de componentes |
| Movimiento, anillo de foco, capas | Tema por defecto (claro u oscuro) |
| Paleta de estados mate (éxito, aviso, peligro, info) | |

La base solo declara variables `--mh-*`: no pinta nada por sí misma. Cada app apunta
sus propios tokens a ella, así que el código de los componentes no cambia de nombres.

**La base es una copia idéntica en los cuatro repos.** Si se toca, se tocan las cuatro
a la vez y se comprueba con `sha256sum` que siguen siendo iguales.

## Escalas

| Tipo | Valor | Uso |
|---|---|---|
| `--mh-fs-2xs` | 11 px | Suelo absoluto: etiquetas en mayúsculas, pestañas |
| `--mh-fs-xs` | 12 px | Chips, ayudas, metadatos |
| `--mh-fs-sm` | 13 px | Tablas densas, botones |
| `--mh-fs-md` | 14 px | Cuerpo de app |
| `--mh-fs-lg` | 16 px | Cuerpo de web, títulos de tarjeta |
| `--mh-fs-reading` | 17 px | Prosa larga (portfolio) |
| `--mh-fs-xl` | 18 px | Títulos de sección en app |
| `--mh-fs-2xl` / `3xl` / `4xl` | 22 / 26 / 32 px | Cabeceras y cifras destacadas |
| `--mh-fs-display` | 48 px | Cifra protagonista de una pantalla |

- **Espaciado:** `--mh-space-1` a `--mh-space-10` = 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 px.
- **Radios por función, no por tamaño:** `tag` 6 · `control` 10 · `card` 14 · `sheet` 20 · `pill`.
- **Controles:** alto 40 px (`--mh-control-h`), 32 px en compacto; **44 px mínimo** en táctil.
- **Movimiento:** `fast` 150 ms (color, hover, pulsación) · `base` 250 ms (hojas,
  diálogos) · `slow` 500 ms (barras, gráficos). Curva `--mh-ease-out`.

## Reglas

1. **Nada literal.** Tamaños de letra, radios, colores y duraciones salen de un token.
   Un `font-size: 13px` suelto es un error de revisión. Única excepción: radios de
   1-3 px en piezas diminutas (barras de progreso, miniaturas, scrollbar).
2. **Legibilidad.** Ningún texto por debajo de 11 px. Texto a 4.5:1 de contraste como
   mínimo; bordes de controles a 3:1. El texto "tenue" también cumple.
3. **Todo lo que se pulsa tiene cuatro estados:** hover, pulsado (escala 0.98; 0.94 en la
   barra de pestañas), foco (`:focus-visible`, anillo del acento de 2 px con 2 px de
   separación) y desactivado (opacidad 0.5 y cursor `not-allowed`).
4. **Plano por defecto.** Sombra solo para lo que flota: hojas, diálogos, barras flotantes,
   botón flotante.
5. **Estados semánticos iguales en todas las apps:** `--mh-success`, `warning`, `danger`,
   `info`, en su variante `-light` en tema claro y `-dark` en tema oscuro. Los fondos
   tintados se derivan con `color-mix(... 12-15%, transparent)` y los bordes al 40 %.
6. **Cifras con `font-variant-numeric: tabular-nums`**: dinero, pesos, P&L, contadores.
7. **Temas:** `data-theme` en `<html>`, `color-scheme` declarado y la `theme-color` del
   navegador igual al fondo, no al acento.
8. **Movimiento reducido:** todo respeta `prefers-reduced-motion`.
9. **Nunca `transition: all`**: anima también el layout. Se listan las propiedades
   (color, fondo, borde, sombra, transform, opacidad).

**Base en este repo:** `src/styles/masanco-foundation.css`.

## Esta app: portfolio

- **Paleta:** azul `oklch` como acento, superficies casi blancas / casi negras. Tema
  automático por sistema con interruptor manual (`msc-theme`).
- **Tipografía:** Inter + JetBrains Mono (la de la base). Las tallas de portada
  (`--fs-xl`, `--fs-2xl`, `--fs-3xl`) son fluidas con `clamp()` y propias del portfolio.
- **Fichero de tokens:** `src/styles/global.css` (bloque `:root`).

| Token de la app | Apunta a |
|---|---|
| `--font-sans` / `--font-mono` | `--mh-font-sans` / `--mh-font-mono` |
| `--fs-xs` · `--fs-sm` · `--fs-base` · `--fs-md` · `--fs-lg` | `xs` · `md` · `lg` · `reading` · `xl` |
| `--sp-1` … `--sp-10` | `--mh-space-1` … `--mh-space-10` |
| `--r-sm` · `--r-md` · `--r-lg` · `--r-xl` | `tag` · `control` · `card` · `sheet` |
| `--success` | `--mh-success-light` / `-dark` |
| `--ease-out` · `--dur-fast` · `--dur-base` | `--mh-ease-out` · `--mh-dur-fast` · `--mh-dur-base` |

Recetas: `.btn-primary` / `.btn-secondary` / `.btn-ghost` (alto táctil de 44 px),
`.tag`, `.project` (tarjeta), `.pmodal` (diálogo), `.section-label` (etiqueta mono).
