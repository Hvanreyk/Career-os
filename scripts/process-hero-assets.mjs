/**
 * Turn the generated hero masters in design/hero-src/ into the responsive
 * AVIF/WebP variants the landing-page concepts ship.
 *
 * Run: node scripts/process-hero-assets.mjs
 *
 * Masters come out of gpt-image-2 at 1536x1024 (3:2). Desktop variants are
 * cropped to 8:5 and rendered at 2048x1280; mobile variants are cropped to 4:5
 * at 1200x1500 with a per-image gravity so each composition survives the crop.
 */
import sharp from 'sharp';
import { mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'design/hero-src');
const OUT = path.join(root, 'web/public/hero');

/**
 * Per-direction crop gravity and codec quality.
 *
 * Quality is tuned per image, not global: dense contour linework (v1) and
 * engraved cross-hatching (v5) are high-frequency worst cases that blow the
 * size budget at the default quality, and the dithered plate (v4) is 1-bit
 * content that bloats WebP badly, so all three take a lower WebP quality.
 */
const PLAN = [
  { file: 'h1-window.png', slug: 'h1-window', mobileGravity: 'east', avif: 48, webp: 60 },
  { file: 'h2-desk.png', slug: 'h2-desk', mobileGravity: 'east', avif: 48, webp: 60 },
  { file: 'h3-atrium.png', slug: 'h3-atrium', mobileGravity: 'east', avif: 48, webp: 60 },
  { file: 'h4-network.png', slug: 'h4-network', mobileGravity: 'east', avif: 46, webp: 58 },
  { file: 'h5-theatre.png', slug: 'h5-theatre', mobileGravity: 'east', avif: 48, webp: 60 },
];

const DESKTOP = { w: 2400, h: 1600 };
const MOBILE = { w: 1200, h: 1500 };

async function emit(input, outBase, { w, h }, gravity, opts, isMobile = false) {
  const base = sharp(input).resize(w, h, {
    fit: 'cover',
    position: gravity,
    kernel: 'lanczos3',
  });

  // The mobile crop is a tighter 4:5 window on the same dither, so it carries
  // more high-frequency area per pixel and needs a lower quality to fit budget.
  const avifQ = isMobile ? opts.avif - 10 : opts.avif;
  const webpQ = isMobile ? opts.webp - 10 : opts.webp;
  await base.clone().avif({ quality: avifQ, effort: 7 }).toFile(`${outBase}.avif`);
  await base
    .clone()
    .webp(
      opts.lossless
        ? { lossless: true, nearLossless: true, quality: 60, effort: 6 }
        : { quality: webpQ, effort: 6 },
    )
    .toFile(`${outBase}.webp`);
}

async function main() {
  await mkdir(OUT, { recursive: true });

  for (const { file, slug, mobileGravity, ...opts } of PLAN) {
    const input = path.join(SRC, file);
    try {
      await stat(input);
    } catch {
      console.warn(`skip ${file} — master not found`);
      continue;
    }

    await emit(input, path.join(OUT, `${slug}-desktop`), DESKTOP, 'centre', opts);
    await emit(input, path.join(OUT, `${slug}-mobile`), MOBILE, mobileGravity, opts, true);
    console.log(`✓ ${slug}`);
  }

  const files = (await readdir(OUT)).sort();
  console.log('\nemitted:');
  for (const f of files) {
    const { size } = await stat(path.join(OUT, f));
    console.log(`  ${f.padEnd(34)} ${(size / 1024).toFixed(0).padStart(5)} KB`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
