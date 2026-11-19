// Après le build : le site publié reçoit tout ../public, mais l'appli n'affiche que la version WebP
// (src/lib/img.ts) des images listées dans le manifeste. On retire donc leurs originaux de dist/ ;
// ils restent dans public/ (source de `npm run optimize-images`). Une image sans version optimisée
// (svg, nouvel ajout pas encore optimisé) est gardée telle quelle.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(HERE, "../dist");
const manifest = JSON.parse(fs.readFileSync(path.join(HERE, "../src/lib/img-manifest.json"), "utf8"));

let n = 0, bytes = 0;
for (const [src, opt] of Object.entries(manifest)) {
  const original = path.join(DIST, src);
  if (!fs.existsSync(path.join(DIST, opt)) || !fs.existsSync(original)) continue; // jamais d'image sans remplaçante
  bytes += fs.statSync(original).size;
  fs.rmSync(original);
  n++;
}
console.log(`Originaux retirés du site publié : ${n} (${(bytes / 1e6).toFixed(1)} Mo)`);
