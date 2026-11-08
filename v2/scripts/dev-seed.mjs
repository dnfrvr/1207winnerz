// Jeu de données du mode démo : la vraie base migrée si elle existe (migration/_out/v2-from-live.json),
// sinon les seeds migrés. Toujours local (src/dev/seed-v2.json est ignoré par git).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const live = path.join(ROOT, "migration/_out/v2-from-live.json");
const out = path.join(HERE, "../src/dev/seed-v2.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
if (fs.existsSync(live)) {
  fs.copyFileSync(live, out);
  console.log("Démo : vraies données migrées (migration/_out/v2-from-live.json)");
} else {
  execFileSync(process.execPath, [path.join(ROOT, "migration/migrate-v1-to-v2.mjs"), "--seed", out], { stdio: "inherit" });
}
