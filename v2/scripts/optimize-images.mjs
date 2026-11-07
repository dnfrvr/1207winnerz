// Génère des versions légères (WebP, 1080 px max) des images de public/assets/{seed,live}
// dans public/assets/opt/, plus un manifeste « chemin d'origine → chemin optimisé » que la v2
// utilise à l'affichage (src/lib/img.ts). Les originaux ne sont jamais modifiés.
//
// Usage : npm --prefix v2 run optimize-images   (relancer après l'ajout d'images)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PUBLIC = path.join(ROOT, "public");
const OUT = path.join(PUBLIC, "assets/opt");
const MANIFEST = path.join(ROOT, "v2/src/lib/img-manifest.json");
const DIRS = ["assets/seed", "assets/live"];
const MAX = 1080;

fs.mkdirSync(OUT, { recursive: true });
const manifest = {};
let before = 0, after = 0, n = 0;

for (const dir of DIRS) {
  const abs = path.join(PUBLIC, dir);
  if (!fs.existsSync(abs)) continue;
  for (const file of fs.readdirSync(abs)) {
    if (!/\.(jpe?g|png|webp)$/i.test(file)) continue;
    const src = path.join(abs, file);
    const name = file.replace(/\.[^.]+$/, ".webp");
    const dst = path.join(OUT, name);
    const size = fs.statSync(src).size;
    if (!fs.existsSync(dst) || fs.statSync(dst).mtimeMs < fs.statSync(src).mtimeMs) {
      await sharp(src).rotate().resize({ width: MAX, height: MAX, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 78, effort: 5 }).toFile(dst);
    }
    const out = fs.statSync(dst).size;
    // On ne garde la version optimisée que si elle est vraiment plus légère.
    if (out < size * 0.9) { manifest[`/${dir}/${file}`] = `/assets/opt/${name}`; before += size; after += out; n++; }
  }
}

fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 0));
console.log(`${n} images optimisées : ${(before / 1e6).toFixed(1)} Mo → ${(after / 1e6).toFixed(1)} Mo`);
console.log(`Manifeste : ${path.relative(ROOT, MANIFEST)}`);
