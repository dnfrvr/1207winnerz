// ─── Synchronise le seed `drew.messages` (characters.js) depuis le live Firebase ──
// Le seed contenait l'ancienne version fusionnée/incomplète des convs de Drew (« Matthew »
// mélangeant chess+soirée, pas de vrai Nils). On remplace le tableau `"messages"` de Drew dans
// src/data/characters.js par la version LIVE corrigée (Nils 115 / Cynthia 6 / Matthew 8, …), pour
// que le seed soit une photo fidèle de l'histoire — utile si la base est un jour réinitialisée.
//
// Remplacement par matching de crochets (robuste, gère chaînes + échappements), on ne touche QU'À
// ce tableau. Dry-run par défaut ; --apply écrit le fichier (après sauvegarde .bak).
//
// Usage : node scripts/sync-drew-seed.mjs [--apply]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get } from "firebase/database";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const APPLY = process.argv.includes("--apply");
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

// Trouve l'index du `]` fermant correspondant à un `[` (openIdx), en ignorant crochets dans chaînes.
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

async function main() {
  const db = getDatabase(initializeApp(cfg));
  const liveMessages = (await get(ref(db, "drew/messages"))).val() || [];
  const arr = Array.isArray(liveMessages) ? liveMessages : Object.values(liveMessages);
  console.log(`• Live drew.messages : ${arr.length} convs`);

  const src = fs.readFileSync(FILE, "utf8");
  const drewIdx = src.indexOf('"drew": {');
  if (drewIdx < 0) { console.error('✖ Clé "drew" introuvable.'); process.exit(1); }
  // Cible le tableau `messages` au niveau perso (indentation 4 espaces + ouverture immédiate `[`),
  // pas un `"messages":` imbriqué (icône d'app, notif…) qui apparaît avant dans l'objet drew.
  const MARKER = '\n    "messages": [';
  const msgKeyIdx = src.indexOf(MARKER, drewIdx);
  if (msgKeyIdx < 0) { console.error('✖ Tableau "messages" (niveau perso) de drew introuvable.'); process.exit(1); }
  const openIdx = src.indexOf("[", msgKeyIdx);
  const closeIdx = matchBracket(src, openIdx);
  if (closeIdx < 0) { console.error("✖ Crochet fermant introuvable."); process.exit(1); }

  const startLine = src.slice(0, openIdx).split("\n").length;
  const endLine = src.slice(0, closeIdx).split("\n").length;
  console.log(`• Bloc "messages" de drew : lignes ${startLine}–${endLine} (${closeIdx - openIdx} caractères remplacés)`);

  // Sérialise au format du fichier : base 4 espaces (JSON.stringify indente à 2 → +4 sur chaque ligne
  // sauf la 1re qui reste juste après `"messages": `).
  const body = JSON.stringify(arr, null, 2);
  const indented = body.split("\n").map((line, i) => (i === 0 ? line : "    " + line)).join("\n");
  const newSrc = src.slice(0, openIdx) + indented + src.slice(closeIdx + 1);

  console.log(`• Fichier : ${src.length} → ${newSrc.length} caractères`);

  if (!APPLY) { console.log("\n(dry-run) Rien écrit. Relance avec --apply."); process.exit(0); }

  fs.writeFileSync(FILE + ".bak", src);
  fs.writeFileSync(FILE, newSrc);
  console.log(`\n✔ Écrit ${path.relative(ROOT, FILE)} (sauvegarde : characters.js.bak)`);
  process.exit(0);
}
main().catch(e => { console.error("✖ Erreur :", e); process.exit(1); });
