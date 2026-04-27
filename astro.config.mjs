import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://portfolio.masanco-hub.com',
  output: 'static',
  trailingSlash: 'ignore',
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  build: {
    inlineStylesheets: 'auto',
  },
  compressHTML: true,
});
