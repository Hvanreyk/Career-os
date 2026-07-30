/**
 * Build the MappedLabs identity system from exact geometry.
 *
 * Run: node scripts/build-brand-assets.mjs
 *
 * The symbol is hand-drawn geometry (no traced bitmap). The wordmark is Archivo
 * SemiBold converted to outlines with opentype.js, so shipped SVGs carry no font
 * dependency and render identically everywhere — the brief requires the
 * typography to be exact, which live <text> in an SVG cannot guarantee.
 *
 * Selected concept: A — "Plotted M". See brand/concepts/ for B and C.
 */
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * opentype.js is intentionally NOT a package.json dependency. Adding it caused
 * npm to re-resolve the tree and drop the lightningcss platform binaries from
 * package-lock.json — the exact failure the two most recent commits fixed for
 * Netlify. This script is a one-off asset generator, so install it on demand:
 *
 *   npm i --no-save opentype.js && node scripts/build-brand-assets.mjs
 *
 * Its outputs (web/public/brand/*, web/app/icon.svg, web/lib/lab/wordmark-path.ts)
 * are committed, so a normal build never needs this script or that package.
 */
let ot;
try {
  ot = (await import('opentype.js')).default;
} catch {
  console.error(
    'opentype.js is not installed (this is deliberate — see the note at the top of\n' +
      'this file). To regenerate the brand assets run:\n\n' +
      '  npm i --no-save opentype.js && node scripts/build-brand-assets.mjs\n',
  );
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BRAND = path.join(root, 'web/public/brand');
const APP = path.join(root, 'web/app');

const INK = '#14181A';
const PAPER = '#F4F2ED';
const ACCENT = '#C8452A';

const font = ot.loadSync(path.join(root, 'design/archivo-600.ttf'));

/**
 * Outline a string with manual tracking. opentype's getPath has no letter-spacing,
 * so glyphs are placed one at a time and the advance is adjusted per step.
 */
function outline(text, fontSize, tracking = 0) {
  const scale = fontSize / font.unitsPerEm;
  let x = 0;
  const parts = [];
  for (let i = 0; i < text.length; i++) {
    const glyph = font.charToGlyph(text[i]);
    parts.push(glyph.getPath(x, 0, fontSize).toPathData(3));
    x += glyph.advanceWidth * scale + tracking;
    const kern = font.getKerningValue(glyph, font.charToGlyph(text[i + 1] ?? ''));
    if (kern) x += kern * scale;
  }
  return { d: parts.join(' '), width: x - tracking };
}

/* ── Symbol ────────────────────────────────────────────────────────────────
   One continuous traverse: low, high, down to a station on the datum, high,
   low. The middle vertex sits exactly on the reference line — the mark says
   "measured against a datum", which is the product's whole argument. */
function symbol({ ink, accent, datum = true }) {
  // Traverse inset to leave ~4.75 units of margin inside the 64 box, so the
  // mark never touches its own edge at any size or inside a favicon mask.
  return `${
    datum
      ? `<path d="M2.5 39 H61.5" stroke="${ink}" stroke-width="1.5" opacity="0.28"/>` +
        `<path d="M3.25 35.5 v7 M60.75 35.5 v7" stroke="${ink}" stroke-width="1.5" opacity="0.28"/>`
      : ''
  }<path d="M9 55 L9 9 L32 39 L55 9 L55 55" fill="none" stroke="${ink}" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="32" cy="39" r="4.75" fill="${accent}"/>`;
}

function symbolSvg(opts, { size = 64 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}" role="img" aria-label="MappedLabs">${symbol(opts)}</svg>\n`;
}

/* ── Wordmark lockup ─────────────────────────────────────────────────────── */
const CAP = 72.3 / 100; // Archivo cap height as a fraction of font size.

function wordmarkSvg({ ink, accent, sub = true }) {
  const fs = 44;
  const { d, width } = outline('MappedLabs', fs, -1.15);
  const capPx = fs * CAP; // 31.8 — the wordmark's cap height.

  // The symbol's drawn field is 54.5 units tall inside its 64 box. Scale it so
  // that field runs a little taller than the caps, then centre the two optically.
  const FIELD = 54.5;
  const symScale = (capPx * 1.34) / FIELD;
  const symBox = 64 * symScale;
  const gap = 15;
  const baseline = 54;
  // Align the symbol's field centre with the cap-height centre.
  const symY = baseline - capPx / 2 - symBox / 2;
  const textX = symBox + gap;

  const totalW = Math.ceil(textX + width);
  const totalH = sub ? 80 : 66;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" width="${totalW}" height="${totalH}" role="img" aria-label="MappedLabs">
  <g transform="translate(0 ${symY.toFixed(2)}) scale(${symScale.toFixed(4)})">${symbol({ ink, accent })}</g>
  <g transform="translate(${textX.toFixed(2)} ${baseline})"><path d="${d}" fill="${ink}"/></g>
${
  sub
    ? `  <g transform="translate(${(textX + 1.5).toFixed(2)} ${baseline + 20})"><path d="${outline('CAREER INTELLIGENCE', 9.5, 2.4).d}" fill="${ink}" opacity="0.55"/></g>\n`
    : ''
}</svg>\n`;
}

async function main() {
  await mkdir(BRAND, { recursive: true });

  const files = {
    // Full-colour primaries
    'mappedlabs-symbol.svg': symbolSvg({ ink: INK, accent: ACCENT }),
    'mappedlabs-wordmark.svg': wordmarkSvg({ ink: INK, accent: ACCENT }),
    'mappedlabs-wordmark-plain.svg': wordmarkSvg({ ink: INK, accent: ACCENT, sub: false }),

    // Reversed, for dark grounds
    'mappedlabs-symbol-reversed.svg': symbolSvg({ ink: PAPER, accent: ACCENT }),
    'mappedlabs-wordmark-reversed.svg': wordmarkSvg({ ink: PAPER, accent: ACCENT }),

    // Single-colour, for stamping / one-ink production
    'mappedlabs-symbol-mono-dark.svg': symbolSvg({ ink: INK, accent: INK }),
    'mappedlabs-symbol-mono-light.svg': symbolSvg({ ink: PAPER, accent: PAPER }),
    'mappedlabs-wordmark-mono-dark.svg': wordmarkSvg({ ink: INK, accent: INK, sub: false }),
    'mappedlabs-wordmark-mono-light.svg': wordmarkSvg({ ink: PAPER, accent: PAPER, sub: false }),

    // Favicon master: datum dropped — it turns to noise below 32px.
    'mappedlabs-mark-compact.svg': symbolSvg({ ink: INK, accent: ACCENT, datum: false }),
  };

  for (const [name, body] of Object.entries(files)) {
    await writeFile(path.join(BRAND, name), body, 'utf8');
  }

  // ── Next.js app-router icon conventions ────────────────────────────────
  const compact = symbolSvg({ ink: INK, accent: ACCENT, datum: false });
  await writeFile(path.join(APP, 'icon.svg'), compact, 'utf8');

  // Apple touch icon: needs an opaque, inset mark (iOS applies its own mask).
  const appleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="180" height="180"><rect width="180" height="180" fill="${PAPER}"/><g transform="translate(22 22) scale(2.06)">${symbol({ ink: INK, accent: ACCENT, datum: false })}</g></svg>`;
  await sharp(Buffer.from(appleSvg)).png().toFile(path.join(APP, 'apple-icon.png'));

  // Favicon .ico — 32px raster of the compact mark on paper.
  const icoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" fill="${PAPER}"/><g transform="translate(0 0) scale(1)">${symbol({ ink: INK, accent: ACCENT, datum: false })}</g></svg>`;
  await sharp(Buffer.from(icoSvg)).resize(32, 32).png().toFile(path.join(APP, 'favicon.ico'));

  // Open Graph card — mark, wordmark and positioning line on paper.
  const wm = outline('MappedLabs', 96, -2.6);
  const tag = outline('CAREER INTELLIGENCE FOR HIGH FINANCE', 21, 4.2);
  const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
    <rect width="1200" height="630" fill="${PAPER}"/>
    <path d="M0 470 H1200" stroke="${INK}" stroke-width="1.5" opacity="0.18"/>
    <g transform="translate(96 150) scale(2.35)">${symbol({ ink: INK, accent: ACCENT })}</g>
    <g transform="translate(96 420)"><path d="${wm.d}" fill="${INK}"/></g>
    <g transform="translate(98 520)"><path d="${tag.d}" fill="${INK}" opacity="0.6"/></g>
  </svg>`;
  await sharp(Buffer.from(ogSvg)).png().toFile(path.join(APP, 'opengraph-image.png'));

  // Wordmark outlines for the in-app <Wordmark> component, so the React mark and
  // the exported SVGs come from one source of truth.
  const wmPath = outline('MappedLabs', 44, -1.15);
  await writeFile(
    path.join(root, 'web/lib/lab/wordmark-path.ts'),
    `/**
 * Generated by scripts/build-brand-assets.mjs — do not hand-edit.
 * Archivo SemiBold outlines for the MappedLabs wordmark, set at 44px with
 * -1.15px tracking. Baseline sits at y=0; caps rise to y=-${(44 * 0.723).toFixed(1)}.
 */
export const WORDMARK_PATH =
  '${wmPath.d}';

/** Advance width of the outlined lettering, in the same units as the path. */
export const WORDMARK_WIDTH = ${wmPath.width.toFixed(2)};

/** Cap height of the lettering, in the same units as the path. */
export const WORDMARK_CAP = ${(44 * 0.723).toFixed(2)};
`,
    'utf8',
  );

  console.log(`✓ ${Object.keys(files).length} brand SVGs → web/public/brand/`);
  console.log('✓ wordmark-path.ts → web/lib/lab/');
  console.log('✓ icon.svg, apple-icon.png, favicon.ico, opengraph-image.png → web/app/');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
