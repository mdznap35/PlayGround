// NOVA asset pipeline: optimize everything under assets/source/ into
// assets/ready/ (+ public/ copies where the runtime needs them).
// Images → max-dimension resize + WebP (q80) + PNG fallback for icons.
// Audio  → kept as committed (ogg already); manifests personality.
// Run: node scripts/optimize-assets.mjs
// Output contract: assets/ready/<group>/<name>.webp (+ .json manifest).
import sharp from 'sharp';
import { readdirSync, mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'assets', 'source');
const OUT = join(root, 'assets', 'ready');

const MAX_DIM = Number(process.env.NOVA_IMG_MAX || 1024);
const QUALITY = Number(process.env.NOVA_IMG_Q || 80);

const manifest = { generated: new Date().toISOString(), maxDim: MAX_DIM, quality: QUALITY, files: [] };

async function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

const files = await walk(SRC);
if (files.length === 0) {
  console.log('assets/source/ is empty — nothing to optimize. (Curated packs land here.)');
}
for (const f of files) {
  const ext = extname(f).toLowerCase();
  if (!['.png', '.jpg', '.jpeg'].includes(ext)) {
    console.log('skip (not an image):', f);
    continue;
  }
  const rel = f.slice(SRC.length + 1, -ext.length);
  const outDir = join(OUT, dirname(rel));
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, basename(rel) + '.webp');
  const before = statSync(f).size;
  await sharp(f).resize({ width: MAX_DIM, height: MAX_DIM, fit: 'inside', withoutEnlargement: true }).webp({ quality: QUALITY }).toFile(out);
  const after = statSync(out).size;
  manifest.files.push({ src: f.slice(SRC.length + 1), out: 'ready/' + rel + '.webp', before, after });
  console.log(`ok ${rel}: ${before} -> ${after} bytes`);
}
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`manifest: ${manifest.files.length} files`);
