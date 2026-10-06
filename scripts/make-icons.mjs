// Generates PWA icons from an inline SVG (no external art needed).
// Run: node scripts/make-icons.mjs  (outputs to public/icons/)
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const svg = (size) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
<rect width="512" height="512" rx="112" fill="#1b2350"/>
<circle cx="256" cy="230" r="120" fill="#7c6cf0"/>
<circle cx="216" cy="210" r="18" fill="#fff"/>
<circle cx="296" cy="210" r="18" fill="#fff"/>
<circle cx="216" cy="212" r="8" fill="#1b2350"/>
<circle cx="296" cy="212" r="8" fill="#1b2350"/>
<path d="M216 272 Q256 300 296 272" stroke="#fff" stroke-width="14" fill="none" stroke-linecap="round"/>
<text x="256" y="440" font-size="72" text-anchor="middle">✨</text>
</svg>`);

mkdirSync(join(root, 'public', 'icons'), { recursive: true });
for (const size of [192, 512]) {
  const out = join(root, 'public', 'icons', `icon-${size}.png`);
  await sharp(svg(size)).resize(size, size).png().toFile(out);
  console.log('wrote', out);
}
