# Portfolio · Mario Sanchis Colomer

Portfolio personal en producción en **[portfolio.masanco-hub.com](https://portfolio.masanco-hub.com)**.

Sitio estático construido con Astro 6, TypeScript strict, i18n nativo (ES/EN) y
desplegado en VPS propio dentro del ecosistema [masanco-hub](https://masanco-hub.com)
junto a [POLYBOT](https://polybot.masanco-hub.com) y [Gym Tracker](https://gym.masanco-hub.com).

## Stack

- **Astro 6** con `output: 'static'`, `compressHTML`, `inlineStylesheets: 'auto'`
- **TypeScript** con `strict: true` y `allowJs`
- **i18n** nativo (`/` español, `/en/` inglés) con módulos tipados y `hreflang` SEO
- **CSS vanilla** con custom properties, sin Tailwind ni frameworks UI
- **JS vanilla** para theme toggle, scroll spy y reveal-on-scroll (cero dependencias runtime)
- Imágenes con `loading="lazy"` y caches diferenciados por nginx

## Estructura

```
src/
├── pages/
│   ├── index.astro            # ES (root)
│   └── en/index.astro         # EN
├── layouts/BaseLayout.astro   # head, JSON-LD, hreflang, og:locale, anti-FOUC
├── components/                # Nav, Hero, Salesforce, Projects, ProjectCard, Stack, About, Contact
├── data/
│   ├── projects.es.json       # Proyectos con descripciones ES
│   └── projects.en.json       # idem EN
├── i18n/
│   ├── es.ts                  # Strings UI ES
│   ├── en.ts                  # Strings UI EN (tipo: UiStrings)
│   └── index.ts               # getTranslations(lang)
├── styles/global.css
├── scripts/main.js            # Theme toggle + nav spy + reveal
└── types.ts                   # Project, ProjectLink

deploy/
├── nginx/portfolio.masanco-hub.com.conf
└── README.md                  # Setup + update workflow
```

## Desarrollo

```bash
npm install
npm run dev          # http://localhost:4321
npm run build        # dist/ (1 página ES + 1 EN, ~31 KB cada una)
npm run preview      # serve dist/ localmente
```

Node 22+ recomendado (alineado con resto del ecosistema masanco-hub).

## Despliegue

Ver **[deploy/README.md](deploy/README.md)** para setup inicial y workflow de updates al VPS.

## Decisiones técnicas

- **Astro 6 sin framework UI**: el portfolio es 99% contenido estático con 3
  interacciones JS pequeñas (theme, scroll spy, reveal). Cualquier framework
  añadiría peso sin beneficio.
- **CSS sin Tailwind**: el design system son tokens en `:root` con `oklch()` para
  el accent. Mantenible y sin build extra.
- **i18n estructural** (`src/i18n/{es,en}.ts` tipados con `UiStrings`) en vez de
  ternarios inline. Si se añade un 3er idioma, es solo un archivo nuevo.
- **`trailingSlash: 'ignore'`**: Astro genera `/en/index.html`; con `'never'` la
  navegación rompía. `ignore` deja a nginx (vía `try_files`) resolver ambas formas.
- **Imágenes de proyectos**: campo opcional `thumbImage`/`thumbAlt` en cada proyecto.
  Si está, render `<img loading="lazy">`; si no, fallback a SVG mock de
  `ProjectCard.astro`. Las 4 imágenes viven en `public/projects/`.

## Licencia

Sin licencia explícita: el código está disponible para inspección como muestra
de trabajo, pero todos los textos, CV PDFs y assets gráficos son propiedad del
autor y no pueden reutilizarse sin permiso.
