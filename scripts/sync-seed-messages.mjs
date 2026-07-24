// ─── Synchronise le seed `{char}.messages` (characters.js) depuis le live Firebase ──
// Généralisation de sync-drew-seed.mjs à plusieurs persos. Pour chaque perso, remplace son tableau
// `"messages"` dans src/data/characters.js par la version LIVE, afin que le seed soit une photo
// fidèle de l'histoire (utile si la base est un jour réinitialisée).
//
// ⚠️ Les images base64 (data:...) sont RETIRÉES (mises à null) du seed : sinon elles gonflent le
// bundle JS chargé à chaque visite (Glinda ~538 KB). Le seed n'est qu'un fallback → images absentes
// en re-seed est acceptable ; en live elles restent intactes. (Pour les garder, il faudrait d'abord
// migrer ces images base64 → Supabase via le bouton admin, puis relancer.)
//
// Remplacement par matching de crochets (robuste : ignore crochets dans chaînes, gère échappements),
// on ne touche QU'aux tableaux ciblés. Le fichier est relu/réécrit à chaque perso (offsets frais).
//
// Usage :
//   node scripts/sync-seed-messages.mjs                    # dry-run, persos par défaut
//   node scripts/sync-seed-messages.mjs --apply            # applique (glinda eoghan elias)
//   node scripts/sync-seed-messages.mjs --apply drew elias # persos explicites

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get } from "firebase/database";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const chars = argv.filter(a => !a.startsWith("--"));
const CHARS = chars.length ? chars : ["glinda", "eoghan", "elias"];
const FILE = path.join(ROOT, "src/data/characters.js");

function loadEnv() {
  const out = {};
  const p = path.join(ROOT, ".env.local");
  if (fs.existsSync(p)) for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  for (const k of Object.keys(process.env)) if (k.startsWith("VITE_FIREBASE_")) out[k] = process.env[k];
  return out;
}
const env = loadEnv();
const cfg = { apiKey: env.VITE_FIREBASE_API_KEY, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN, databaseURL: env.VITE_FIREBASE_DATABASE_URL, projectId: env.VITE_FIREBASE_PROJECT_ID };
if (!cfg.databaseURL) { console.error("✖ VITE_FIREBASE_DATABASE_URL manquante."); process.exit(1); }

function matchBracket(text, openIdx) {
  let depth = 0, inStr = false;
  for (let i = openIdx; i < text.length; i++) {
    const c = text[i];
    if (inStr) { if (c === "\\") { i++; continue; } if (c === '"') inStr = false; continue; }
    if (c === '"') { inStr = true; continue; }
    if (c === "[") depth++;
    else if (c === "]") { depth--; if (depth === 0) return i; }
  }
  return -1;
}
// Remplace toute valeur string commençant par "data:" (image base64) par null. Retourne [copie, count].
function stripBase64(node, counter) {
  if (Array.isArray(node)) return node.map(n => stripBase64(n, counter));
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === "string" && v.startsWith("data:")) { counter.n++; out[k] = null; }
      else out[k] = stripBase64(v, counter);
    }
    return out;
  }
  return node;
}

async function main() {
  const db = getDatabase(initializeApp(cfg));

  for (const char of CHARS) {
    const liveRaw = (await get(ref(db, `${char}/messages`))).val() || [];
    const live = Array.isArray(liveRaw) ? liveRaw : Object.values(liveRaw);
    const counter = { n: 0 };
    const clean = stripBase64(live, counter);

    const src = fs.readFileSync(FILE, "utf8");
    const charIdx = src.indexOf(`"${char}": {`);
    if (charIdx < 0) { console.error(`✖ ${char} : clé introuvable, ignoré.`); continue; }
    const marker = '\n    "messages": [';
    const msgKeyIdx = src.indexOf(marker, charIdx);
    if (msgKeyIdx < 0) { console.error(`✖ ${char} : tableau "messages" (niveau perso) introuvable, ignoré.`); continue; }
    const openIdx = src.indexOf("[", msgKeyIdx);
    const closeIdx = matchBracket(src, openIdx);
    if (closeIdx < 0) { console.error(`✖ ${char} : crochet fermant introuvable, ignoré.`); continue; }

    const body = JSON.stringify(clean, null, 2);
    const indented = body.split("\n").map((l, i) => (i === 0 ? l : "    " + l)).join("\n");
    const newSrc = src.slice(0, openIdx) + indented + src.slice(closeIdx + 1);

    const startLine = src.slice(0, openIdx).split("\n").length;
    const endLine = src.slice(0, closeIdx).split("\n").length;
    console.log(`• ${char.padEnd(7)}: ${live.length} convs, lignes ${startLine}–${endLine}, base64 retirées: ${counter.n}, fichier ${src.length}→${newSrc.length}`);

    if (APPLY) {
      if (!fs.existsSync(FILE + ".bak")) fs.writeFileSync(FILE + ".bak", src); // 1 seule sauvegarde (état initial)
      fs.writeFileSync(FILE, newSrc);
    }
  }

  console.log(APPLY ? "\n✔ Appliqué." : "\n(dry-run) Rien écrit. Relance avec --apply.");
  process.exit(0);
}
main().catch(e => { console.error("✖ Erreur :", e); process.exit(1); });
