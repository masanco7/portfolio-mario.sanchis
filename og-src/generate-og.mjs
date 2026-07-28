/**
 * Open Graph image generator — portfolio.masanco-hub.com
 *
 * Builds public/og-image.png (1200x630) from an SVG composed here, so the social
 * preview never drifts from the site copy again: the role line and the tagline are
 * READ FROM src/i18n/es.ts, not retyped. Change the hero strings, run `npm run og`,
 * commit the PNG.
 *
 * Rasterized with sharp (already present as an Astro dependency). No headless
 * browser involved.
 *
 * Usage:  npm run og
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

/* --- Design tokens: mirrored from src/styles/global.css (dark theme) --------- */
const C = {
  bg: '#0d0f12',
  fg: '#e6e7e9',
  fgMuted: '#9aa1ab',
  fgFaint: '#6b7280',
  border: '#23272e',
  accent: '#53a3f2', // oklch(0.7 0.14 250) resolved to sRGB
  live: '#3fb950',
};

const SANS = "Inter, 'Segoe UI', Arial, sans-serif";
const MONO = "'JetBrains Mono', 'Cascadia Mono', Consolas, monospace";
const MONO_ADVANCE = 0.6; // em per glyph, used to place icons next to right-aligned text

const W = 1200;
const H = 630;
const PAD = 96;

/* --- Copy: single source of truth is the ES i18n module --------------------- */
async function readHeroCopy() {
  const src = await readFile(join(root, 'src', 'i18n', 'es.ts'), 'utf-8');
  const hero = src.match(/hero:\s*\{([\s\S]*?)\n {2}\},/);
  if (!hero) throw new Error('Could not locate the `hero` block in src/i18n/es.ts');

  const pick = (key) => {
    const m = hero[1].match(new RegExp(`${key}:\\s*'([^']*)'`));
    if (!m) throw new Error(`Could not read hero.${key} from src/i18n/es.ts`);
    return m[1];
  };

  // hero.title is HTML ("<strong>Full-Stack Developer</strong> · Salesforce"):
  // strip the tags and split on the middot so each half can be styled separately.
  const [rolePrimary, roleSecondary = ''] = pick('title')
    .replace(/<[^>]+>/g, '')
    .split('·')
    .map((s) => s.trim());

  return { rolePrimary, roleSecondary, tagline: pick('tagline') };
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Right-aligned mono text needs a hand-computed x for its leading icon. */
const monoWidth = (text, size) => text.length * size * MONO_ADVANCE;

function buildSvg({ rolePrimary, roleSecondary, tagline }) {
  const year = 2026; // stamped, not derived — keeps regenerated output byte-stable
  const domain = 'portfolio.masanco-hub.com';
  const location = 'Valencia · ES';

  const gridV = Array.from({ length: 13 }, (_, i) => 60 + i * 90)
    .map((x) => `<line x1="${x}" y1="0" x2="${x}" y2="${H}"/>`)
    .join('');
  const gridH = Array.from({ length: 7 }, (_, i) => 45 + i * 90)
    .map((y) => `<line x1="0" y1="${y}" x2="${W}" y2="${y}"/>`)
    .join('');

  const locX = W - PAD - monoWidth(location, 15) - 22;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${C.bg}"/>

  <g stroke="${C.border}" stroke-width="1" opacity="0.55">${gridV}${gridH}</g>

  <!-- top bar -->
  <rect x="${PAD}" y="82" width="11" height="11" fill="${C.accent}" transform="rotate(45 ${PAD + 5.5} 87.5)"/>
  <text x="${PAD + 26}" y="93" font-family="${MONO}" font-size="15" letter-spacing="1.6" fill="${C.fgFaint}">MASANCO · PORTFOLIO</text>

  <circle cx="${locX}" cy="88" r="5" fill="${C.live}"/>
  <text x="${W - PAD}" y="93" text-anchor="end" font-family="${MONO}" font-size="15" letter-spacing="1.2" fill="${C.fgFaint}">${esc(location)}</text>

  <!-- eyebrow -->
  <line x1="${PAD}" y1="133" x2="${PAD + 30}" y2="133" stroke="${C.fgFaint}" stroke-width="1.5"/>
  <text x="${PAD + 44}" y="139" font-family="${MONO}" font-size="15" letter-spacing="1.6" fill="${C.accent}">PORTFOLIO · ${year}</text>

  <!-- name -->
  <text x="${PAD}" y="245" font-family="${SANS}" font-size="86" font-weight="700" letter-spacing="-2.5" fill="${C.fg}">Mario Sanchis</text>
  <text x="${PAD}" y="336" font-family="${SANS}" font-size="86" font-weight="700" letter-spacing="-2.5" fill="${C.fg}">Colomer.</text>

  <!-- role -->
  <text x="${PAD}" y="424" font-family="${SANS}" font-size="37" font-weight="400" fill="${C.fg}">${esc(rolePrimary)}<tspan fill="${C.fgFaint}" dx="16">·</tspan><tspan fill="${C.fgMuted}" dx="16">${esc(roleSecondary)}</tspan></text>

  <!-- tagline -->
  <text x="${PAD}" y="482" font-family="${SANS}" font-size="27" font-style="italic" fill="${C.fgFaint}">“${esc(tagline)}”</text>

  <!-- footer -->
  <rect x="${PAD}" y="537" width="9" height="9" fill="${C.accent}"/>
  <text x="${PAD + 22}" y="546" font-family="${MONO}" font-size="16" letter-spacing="0.4" fill="${C.fgMuted}">${domain}</text>
  <text x="${W - PAD}" y="546" text-anchor="end" font-family="${MONO}" font-size="14" letter-spacing="1.2" fill="${C.border}">OPEN GRAPH · ${W} × ${H}</text>
</svg>`;
}

const copy = await readHeroCopy();
const svg = buildSvg(copy);

// Keep the SVG next to the script: it is the reviewable artifact, the PNG is output.
await writeFile(join(here, 'og-image.svg'), svg, 'utf-8');

// librsvg lays the SVG out at 72dpi, so render at 2x and downsample: the declared
// og:image size is exactly 1200x630 and the extra sampling keeps the type crisp.
const out = join(root, 'public', 'og-image.png');
const info = await sharp(Buffer.from(svg, 'utf-8'), { density: 144 })
  .resize(W, H, { fit: 'fill', kernel: 'lanczos3' })
  .png({ compressionLevel: 9, palette: false })
  .toFile(out);

console.log(
  `og-image.png ${info.width}x${info.height} (${(info.size / 1024).toFixed(1)} KB) — role: "${copy.rolePrimary} · ${copy.roleSecondary}"`,
);
