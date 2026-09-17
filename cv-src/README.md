# Fuente editable de los CVs

Los PDFs de `public/cv-*.pdf` se generan **a mano** desde estos HTML.
Edita el HTML (o `cv.css` para el estilo común) y vuelve a exportar.

## Archivos

| Fuente HTML             | PDF destino (`public/`)   | Contenido                                               |
|-------------------------|---------------------------|---------------------------------------------------------|
| `cv-completo.html`      | `cv-completo.pdf`         | CV completo — ES · perfil Software Engineer / full-stack · 5 proyectos |
| `cv-completo-en.html`   | `cv-completo-en.pdf`      | CV completo — EN · idem                                 |
| `cv-salesforce.html`    | `cv-salesforce.pdf`       | CV enfocado Salesforce — ES · 2 proyectos               |
| `cv-salesforce-en.html` | `cv-salesforce-en.pdf`    | CV enfocado Salesforce — EN · 2 proyectos               |

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

- **CVs completos:** no fuerzan salto de página; el corte lo decide el flujo,
  con `break-inside: avoid` en `.entry` para que ningún proyecto se parta por
  la mitad. Si el corte queda feo, añade `page-break` a la sección `<h2>` donde
  quieras forzar la 2.ª página (ej. `<h2 class="section page-break">`).
- **CVs Salesforce:** siguen forzando el salto con `page-break` en la sección
  *Proyectos personales*.
- Color de acento en `cv.css` → variable `--blue`.
- Tras regenerar los PDFs: `git add`, `commit`, `push` y en el servidor
  `sudo bash /opt/portfolio/repo/deploy/docker/update.sh` (o esperar al
  mantenimiento del sábado). Los PDF van dentro de la imagen: ya no se pueden
  copiar en caliente. Después, purga la URL del PDF en Cloudflare, que los
  cachea. Ver `GUIA-SERVIDOR.md`.
