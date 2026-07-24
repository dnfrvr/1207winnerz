// ─── Restauration ciblée des conversations de DREW ───────────────────────────
// Corrige deux problèmes signalés le 2026-07-24 sur le téléphone de Drew :
//   1. Deux conversations « Elias 🖤 » fantômes (threads LOCAUX, sans sharedThreadId)
//      en plus de la vraie (partagée, sharedThreadId "drew_elias"). → supprimées.
//   2. La conversation avec « Nils » (129 messages) qui a disparu / raccourci en live.
//      → restaurée depuis le backup.
//
// Le script NE TOUCHE QU'À `drew/messages`. Il :
//   - lit la config Firebase depuis .env.local (jamais affichée) ;
//   - lit l'état LIVE actuel de drew/messages ;
//   - en sauvegarde une copie horodatée dans scripts/_backups/ (filet de sécurité) ;
//   - calcule le nouvel état (merge : on part du live, on retire les fantômes Elias
//     + les Nils locaux, on réinjecte la vraie conv Nils du backup) ;
//   - N'ÉCRIT QUE si on passe `--apply` (sinon dry-run : montre le plan sans rien changer).
//
// Usage :
//   node scripts/restore-drew-messages.mjs                 # dry-run (aucune écriture)
//   node scripts/restore-drew-messages.mjs --apply         # applique
//   node scripts/restore-drew-messages.mjs --apply --backup "C:/chemin/backup.json"

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, set } from "firebase/database";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── args ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const backupArg = (() => { const i = args.indexOf("--backup"); return i >= 0 ? args[i + 1] : null; })();
const BACKUP_PATH = backupArg || "C:/Users/Proprietaire/Downloads/backup_2026-07-24.json";

// ── config Firebase depuis .env.local (jamais loggée) ─────────────────────────
function loadEnv() {
  const out = {};
  const envPath = path.join(ROOT, ".env.local");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  // process.env a priorité (au cas où lancé avec les vars exportées)
  for (const k of Object.keys(process.env)) if (k.startsWith("VITE_FIREBASE_")) out[k] = process.env[k];
  return out;
}

const env = loadEnv();
const firebaseConfig = {
  apiKey:      env.VITE_FIREBASE_API_KEY,
  authDomain:  env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL,
  projectId:   env.VITE_FIREBASE_PROJECT_ID,
};
if (!firebaseConfig.databaseURL) {
  console.error("✖ Pas de VITE_FIREBASE_DATABASE_URL trouvée (.env.local). Abandon.");
  process.exit(1);
}

// ── conv Nils de référence depuis le backup ───────────────────────────────────
if (!fs.existsSync(BACKUP_PATH)) {
  console.error(`✖ Backup introuvable : ${BACKUP_PATH}`);
  process.exit(1);
}
const backup = JSON.parse(fs.readFileSync(BACKUP_PATH, "utf8"));
const nilsConv = (backup?.drew?.messages || []).find(
  (m) => m.contact === "Nils" && !m.deleted && !m.sharedThreadId && (m.thread || []).length > 50
);
if (!nilsConv) {
  console.error("✖ Conv Nils (>50 msgs) introuvable dans le backup. Abandon.");
  process.exit(1);
}
console.log(`• Conv Nils de référence : ${nilsConv.thread.length} messages (id=${nilsConv.id}).`);

// ── heuristiques de nettoyage ─────────────────────────────────────────────────
// Fantôme Elias = thread LOCAL (pas de sharedThreadId), pas un groupe, nom ~ "Elias".
// La vraie conv Elias est partagée (sharedThreadId "drew_elias") → jamais touchée.
const isEliasGhost = (m) => !m.sharedThreadId && !m.isGroup && /elias/i.test(m.contact || "");
// Nils local (à remplacer par la version longue du backup).
const isLocalNils = (m) => !m.sharedThreadId && !m.isGroup && /^nils/i.test((m.contact || "").trim());

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);

  const snap = await get(ref(db, "drew/messages"));
  const live = snap.val() || [];
  const liveArr = Array.isArray(live) ? live : Object.values(live);
  console.log(`\n• État LIVE actuel : ${liveArr.length} conversations chez Drew.`);

  // Sauvegarde de l'état live avant toute écriture.
  const backupsDir = path.join(__dirname, "_backups");
  fs.mkdirSync(backupsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safetyPath = path.join(backupsDir, `drew-messages-live-${stamp}.json`);
  fs.writeFileSync(safetyPath, JSON.stringify(liveArr, null, 2));
  console.log(`• Sauvegarde de l'état live → ${path.relative(ROOT, safetyPath)}`);

  // Résumé de ce qu'on retire.
  const removedElias = liveArr.filter(isEliasGhost);
  const removedNils = liveArr.filter(isLocalNils);
  console.log("\n── PLAN ─────────────────────────────────────────");
  console.log(`  Retrait fantômes Elias (locaux)      : ${removedElias.length}`);
  removedElias.forEach((m) => console.log(`      – "${m.contact}" (${(m.thread || []).length} msg, id=${m.id}${m.deleted ? ", deleted" : ""})`));
  console.log(`  Retrait Nils local(aux) existant(s)  : ${removedNils.length}`);
  removedNils.forEach((m) => console.log(`      – "${m.contact}" (${(m.thread || []).length} msg, id=${m.id}${m.deleted ? ", deleted" : ""})`));
  console.log(`  Réinjection Nils du backup           : 1 (${nilsConv.thread.length} msg)`);

  // Nouvel état : live sans fantômes Elias ni Nils locaux, + la vraie conv Nils.
  const kept = liveArr.filter((m) => !isEliasGhost(m) && !isLocalNils(m));
  const next = [...kept, { ...nilsConv }];
  console.log(`\n  Résultat : ${liveArr.length} → ${next.length} conversations.`);
  console.log("─────────────────────────────────────────────────");

  if (!APPLY) {
    console.log("\n(dry-run) Rien n'a été écrit. Relance avec --apply pour appliquer.");
    process.exit(0);
  }

  await set(ref(db, "drew/messages"), next);
  console.log("\n✔ Écrit dans Firebase : drew/messages mis à jour.");
  console.log("  (état précédent conservé dans " + path.relative(ROOT, safetyPath) + ")");
  process.exit(0);
}

main().catch((e) => { console.error("✖ Erreur :", e); process.exit(1); });
