// ─── Fix : la conv 1-à-1 eoghan_elias traitée comme un GROUPE côté Eoghan ─────
// Symptôme : côté Eoghan, la conversation avec Elias s'affiche en mode groupe
// (tous les messages en « them », noms d'expéditeur "a"/"b"). Cause : l'entrée
// d'Eoghan pour le fil partagé `eoghan_elias` a `isGroup:true`. Dans resolveThread,
// la branche groupe fait `m.from === charKey` sur des from valant "a"/"b" → jamais
// "me". De plus une clé parasite `groupMeta.eoghan_elias` renforce le traitement groupe.
//
// Fix minimal, ciblé : retirer isGroup de l'entrée eoghan/messages concernée +
// supprimer groupMeta/eoghan_elias. On NE touche PAS aux perspectives (cohérentes
// avec l'ordre positionnel de l'id : eoghan=a, elias=b).
//
// Usage : node scripts/fix-eoghan-elias.mjs [--apply]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, set } from "firebase/database";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const APPLY = process.argv.includes("--apply");
const TID = "eoghan_elias";

function loadEnv() {
  const out = {};
  const envPath = path.join(ROOT, ".env.local");
  if (fs.existsSync(envPath))
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  for (const k of Object.keys(process.env)) if (k.startsWith("VITE_FIREBASE_")) out[k] = process.env[k];
  return out;
}
const env = loadEnv();
const cfg = {
  apiKey: env.VITE_FIREBASE_API_KEY, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL, projectId: env.VITE_FIREBASE_PROJECT_ID,
};
if (!cfg.databaseURL) { console.error("✖ VITE_FIREBASE_DATABASE_URL manquante."); process.exit(1); }

async function main() {
  const db = getDatabase(initializeApp(cfg));

  const eoSnap = await get(ref(db, "eoghan/messages"));
  const eo = (eoSnap.val() || []);
  const eoArr = Array.isArray(eo) ? eo : Object.values(eo);
  const gmSnap = await get(ref(db, "groupMeta"));
  const gm = gmSnap.val() || {};

  const idx = eoArr.findIndex(m => m.sharedThreadId === TID);
  if (idx < 0) { console.error("✖ Entrée eoghan/messages pour", TID, "introuvable."); process.exit(1); }
  const before = eoArr[idx];

  console.log("── AVANT ────────────────────────────────────────");
  console.log(`  eoghan[${idx}] : contact="${before.contact}" isGroup=${before.isGroup} perspective=${before.perspective} sharedThreadId=${before.sharedThreadId}`);
  console.log(`  groupMeta["${TID}"] présent : ${TID in gm}  → ${JSON.stringify(gm[TID])}`);

  if (!before.isGroup && !(TID in gm)) {
    console.log("\n✓ Déjà propre, rien à faire.");
    process.exit(0);
  }

  // Sauvegarde de sécurité.
  const backupsDir = path.join(__dirname, "_backups");
  fs.mkdirSync(backupsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.writeFileSync(path.join(backupsDir, `eoghan-messages-${stamp}.json`), JSON.stringify(eoArr, null, 2));
  fs.writeFileSync(path.join(backupsDir, `groupMeta-${stamp}.json`), JSON.stringify(gm, null, 2));

  // Correctifs.
  const nextEo = eoArr.map((m, i) => {
    if (i !== idx) return m;
    const { isGroup, ...rest } = m; // retire le flag isGroup
    return rest;
  });

  console.log("\n── APRÈS ────────────────────────────────────────");
  console.log(`  eoghan[${idx}] : isGroup retiré (conv 1-à-1)`);
  console.log(`  groupMeta["${TID}"] : supprimé`);
  console.log(`  (sauvegardes dans scripts/_backups/*-${stamp}.json)`);

  if (!APPLY) { console.log("\n(dry-run) Rien écrit. Relance avec --apply."); process.exit(0); }

  await set(ref(db, "eoghan/messages"), nextEo);
  await set(ref(db, `groupMeta/${TID}`), null);
  console.log("\n✔ Écrit : eoghan/messages (isGroup retiré) + groupMeta/eoghan_elias supprimé.");
  process.exit(0);
}
main().catch(e => { console.error("✖ Erreur :", e); process.exit(1); });
