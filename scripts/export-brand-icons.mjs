/**
 * Exports the portal's brand images from one flat vector mark.
 *
 * The mark is the Sugo Tacurong scooter (the Customer App logo since 2026-11-01). Its master is
 * CustomerApp/artwork/kuya-sugo/logo_concepts.mjs (`sugo-scooter`); the Customer App's export_flat_logo.mjs copies it
 * to src/assets/brand/sugo-mark-white.svg and runs this script, so a logo change there reaches the portal too.
 *
 * Writes:
 *   src/assets/brand/sugo-mark.svg   the mark cropped to its own bounds; <BrandMark> draws it in the text colour
 *   public/favicon.png, logo.png, apple-touch-icon.png   the app logo: white mark on Sugo pink
 *   index.html   the `?v=` content hash on those three URLs
 *
 * Run from the web root: `node scripts/export-brand-icons.mjs`
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const require = createRequire('C:/Users/Capstone/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const sharp = require('sharp');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const brand = path.join(root, 'src/assets/brand');
const pink = '#F62459';
const master = await fs.readFile(path.join(brand, 'sugo-mark-white.svg'), 'utf8');
const art = master.replace(/^[\s\S]*?<\/title>/, '').replace(/<\/svg>\s*$/, '');
const document = (content, viewBox = '0 0 512 512', size = 'width="1024" height="1024" ') =>
  `<svg xmlns="http://www.w3.org/2000/svg" ${size}viewBox="${viewBox}">${content}</svg>`;

// Crop the 512-unit square to the mark's own bounds, so it sits flush wherever it is drawn. Density 144 rasterises the
// 1024 px document at 2048 px, four pixels per unit.
const { info } = await sharp(Buffer.from(document(art)), { density: 144 }).trim().png().toBuffer({ resolveWithObject: true });
const x = Math.floor(-info.trimOffsetLeft / 4), y = Math.floor(-info.trimOffsetTop / 4);
const w = Math.ceil((info.width - info.trimOffsetLeft) / 4) - x, h = Math.ceil((info.height - info.trimOffsetTop) / 4) - y;
await fs.writeFile(path.join(brand, 'sugo-mark.svg'), document(art, `${x} ${y} ${w} ${h}`, '') + '\n');

const icon = document(`<path fill="${pink}" d="M0 0h512v512H0z"/>${art}`);
const icons = [['favicon.png', 48], ['logo.png', 192], ['apple-touch-icon.png', 192]];
for (const [name, size] of icons) {
  await sharp(Buffer.from(icon)).resize(size, size).flatten({ background: pink }).png().toFile(path.join(root, 'public', name));
}

// Cloudflare and browsers keep these for a year (max-age=31536000), so index.html (served no-cache) names each by its
// content hash. A new logo gets new URLs, including the og:image, and nothing keeps serving the old one.
const html = path.join(root, 'index.html');
let page = await fs.readFile(html, 'utf8');
for (const [name] of icons) {
  const version = createHash('sha256').update(await fs.readFile(path.join(root, 'public', name))).digest('hex').slice(0, 8);
  page = page.replace(new RegExp(`(/${name.replace('.', '\\.')})(\\?v=[0-9a-f]+)?"`, 'g'), `$1?v=${version}"`);
}
await fs.writeFile(html, page);
console.log(`Portal brand exported: mark ${w}x${h} units, icons white on ${pink}.`);
