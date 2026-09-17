# og-src — imagen Open Graph

Fuente de `public/og-image.png` (1200×630), la preview que se ve al compartir el
portfolio en LinkedIn, WhatsApp, Slack o Twitter.

```bash
npm run og
```

## Por qué existe

El rol y el tagline van **rasterizados dentro del PNG**. Cuando el copy del hero
cambió (de "Salesforce Core Developer · Junior" a "Full-Stack Developer ·
Salesforce") los meta tags se actualizaron solos pero la imagen se quedó
desincronizada: el sitio decía una cosa y la preview de LinkedIn otra.

Por eso el script **lee `hero.title` y `hero.tagline` desde `src/i18n/es.ts`** en vez
de tener el texto duplicado. Flujo al tocar el copy del hero:

```bash
# 1. editas src/i18n/es.ts
npm run og          # 2. regenera public/og-image.png
git add public/og-image.png og-src/og-image.svg
```

El PNG **se commitea** (es un asset servido por nginx, no se genera en el servidor ni durante el build de Docker).

## Cómo funciona

- `generate-og.mjs` compone un SVG de 1200×630 y lo rasteriza con **sharp**.
  Sin navegador headless.
- Se renderiza a 2× (density 144) y se reescala a 1200×630 con lanczos — librsvg
  maqueta a 72 dpi, así que sin eso el PNG saldría a 1600×840 y no coincidiría con
  los `og:image:width` / `og:image:height` declarados en `BaseLayout.astro`.
- `og-image.svg` se escribe al lado como artefacto revisable (el diff en git muestra
  el cambio de texto; el del PNG no).
- Los colores están copiados del tema oscuro de `src/styles/global.css`. El accent
  `#53a3f2` es `oklch(0.7 0.14 250)` resuelto a sRGB.

## Dependencias y fuentes

`sharp` no está en `package.json`: llega con Astro (`astro:assets`) y el script lo
usa desde ahí. Si algún día falla con *Cannot find module 'sharp'*:

```bash
npm i -D sharp
```

Las tipografías del sitio (Inter / JetBrains Mono) vienen de Google Fonts y **no
están instaladas en el sistema**, así que el SVG declara un stack con fallback:
Inter → Segoe UI → Arial, y JetBrains Mono → Cascadia Mono → Consolas. En Windows
cae a Segoe UI / Cascadia Mono, visualmente muy cercanas. Si instalas Inter y
JetBrains Mono como fuentes del sistema, el render mejora sin tocar el script.

Corolario: **genera el PNG en local, no en el servidor** (Ubuntu no tiene esas fuentes y
el resultado saldría distinto).

## Después de actualizar la imagen

Cloudflare cachea el PNG. Tras desplegar hay que purgar esa URL en el panel
(Caching → Configuration → Purge by URL) o LinkedIn seguirá mostrando la vieja.
LinkedIn además cachea por su cuenta: revalidar en
<https://www.linkedin.com/post-inspector/>.

## Pendiente

- Solo hay versión ES. `/en/` usa esta misma imagen, con el tagline en español.
  Para una EN: añadir un segundo pase que lea `src/i18n/en.ts` → `og-image-en.png`
  y cablearlo en `BaseLayout.astro` (`ogImage` según `lang`).
