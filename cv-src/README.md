# Fuente editable de los CVs

Los PDFs de `public/cv-*.pdf` se generan **a mano** desde estos HTML.
Edita el HTML (o `cv.css` para el estilo común) y vuelve a exportar.

## Archivos

| Fuente HTML             | PDF destino (`public/`)   | Contenido                                  |
|-------------------------|---------------------------|--------------------------------------------|
| `cv-completo.html`      | `cv-completo.pdf`         | CV completo — ES · 4 proyectos             |
| `cv-completo-en.html`   | `cv-completo-en.pdf`      | CV completo — EN · 4 proyectos             |
| `cv-salesforce.html`    | `cv-salesforce.pdf`       | CV enfocado Salesforce — ES · 2 proyectos  |
| `cv-salesforce-en.html` | `cv-salesforce-en.pdf`    | CV enfocado Salesforce — EN · 2 proyectos  |

## Exportar a PDF (Chrome / Edge)

1. Abre el `.html` en el navegador (doble clic).
2. `Ctrl + P` → **Destino: Guardar como PDF**.
3. Opciones:
   - **Papel:** A4
   - **Márgenes:** Ninguno *(los márgenes ya los define `@page` en `cv.css`)*
   - **Escala:** Predeterminada (100%)
   - **Gráficos de fondo:** ✅ activado *(conserva las líneas azules de las secciones)*
   - **Encabezados y pies de página:** ❌ desactivado
4. Guarda sobre el PDF correspondiente en `public/`.

## Notas

- El salto a la 2.ª página lo fuerza la clase `page-break` en la sección
  *Proyectos personales*. Si añades/quitas contenido y el corte queda feo,
  mueve esa clase a otra sección `<h2>`.
- Color de acento en `cv.css` → variable `--blue`.
- Tras regenerar los PDFs: `git add`, `commit`, `push` y en el VPS
  `git pull && npm run build` (o copia el PDF directo, ver `deploy/README.md`).
