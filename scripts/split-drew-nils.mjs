// ─── Découpage du fil « Nils » de Drew en 3 conversations ─────────────────────
// Le fil local « Nils » (129 msgs) de Drew est en réalité un agrégat de 3 conversations :
//   • Cynthia — le club / tournoi d'échecs
//   • Matthew — la soirée (« bonne soirée hier soir », « Nils est pas venu »…)
//   • Nils    — la vraie relation (camp, « trésor », la rupture) → tout le reste
//
// On lit l'état LIVE, on en sauvegarde une copie, puis on remplace le fil Nils par
// ses 115 msgs propres et on AJOUTE deux nouvelles convs (Cynthia, Matthew).
// N'écrit QUE si --apply (sinon dry-run).
//
// Usage :
//   node scripts/split-drew-nils.mjs            # dry-run
//   node scripts/split-drew-nils.mjs --apply    # applique

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, set } from "firebase/database";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const APPLY = process.argv.includes("--apply");

// ── Répartition par index dans le fil source (129 msgs) ───────────────────────
const CYNTHIA_IDX = [0, 1, 2, 3, 12, 13];           // échecs
const MATTHEW_IDX = [4, 5, 6, 7, 8, 9, 10, 11];     // soirée
// Nils = tout le reste (calculé plus bas).

// ── config Firebase depuis .env.local ou process.env (jamais loggée) ──────────
function loadEnv() {
  const out = {};
  const envPath = path.join(ROOT, ".env.local");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  for (const k of Object.keys(process.env)) if (k.startsWith("VITE_FIREBASE_")) out[k] = process.env[k];
  return out;
}
const env = loadEnv();
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
};
if (!firebaseConfig.databaseURL) { console.error("✖ VITE_FIREBASE_DATABASE_URL manquante."); process.exit(1); }

const short = (m) => (m ? (m.text || (m.img ? "[image]" : "")) : "").replace(/\n/g, " ").slice(0, 60);

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);

  const snap = await get(ref(db, "drew/messages"));
  const liveRaw = snap.val() || [];
  const live = Array.isArray(liveRaw) ? liveRaw : Object.values(liveRaw);

  const nilsIdx = live.findIndex((m) => m.contact === "Nils" && !m.deleted && !m.sharedThreadId && (m.thread || []).length > 50);
  if (nilsIdx < 0) { console.error("✖ Conv Nils (>50 msgs) introuvable en live."); process.exit(1); }
  const nilsConv = live[nilsIdx];
  const src = nilsConv.thread;
  if (src.length !== 129) {
    console.warn(`⚠ Le fil Nils fait ${src.length} msgs (attendu 129). Vérifie la répartition avant --apply.`);
  }

  // Garde-fou : index de découpe non chevauchants et dans les bornes.
  const overlap = CYNTHIA_IDX.filter((i) => MATTHEW_IDX.includes(i));
  if (overlap.length) { console.error("✖ Index en double entre Cynthia et Matthew :", overlap); process.exit(1); }
  const taken = new Set([...CYNTHIA_IDX, ...MATTHEW_IDX]);
  const nilsIdxList = src.map((_, i) => i).filter((i) => !taken.has(i));

  const pick = (idxs) => idxs.map((i) => src[i]).filter(Boolean);
  const cynthiaThread = pick(CYNTHIA_IDX);
  const matthewThread = pick(MATTHEW_IDX);
  const nilsThread = pick(nilsIdxList);

  // Sauvegarde de sécurité de l'état live.
  const backupsDir = path.join(__dirname, "_backups");
  fs.mkdirSync(backupsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safetyPath = path.join(backupsDir, `drew-messages-presplit-${stamp}.json`);
  fs.writeFileSync(safetyPath, JSON.stringify(live, null, 2));

  // Nouvelles convs (locales, perspective de Drew : "them" = le contact).
  const baseId = Date.now();
  const cynthiaConv = { contact: "Cynthia", id: baseId + 1, unread: false, thread: cynthiaThread };
  const matthewConv = { contact: "Matthew", id: baseId + 2, unread: false, thread: matthewThread };

  // Nouvel état : Nils raccourci + Cynthia + Matthew ajoutés juste après Nils.
  const next = [];
  live.forEach((m, i) => {
    if (i === nilsIdx) { next.push({ ...nilsConv, thread: nilsThread }, cynthiaConv, matthewConv); }
    else next.push(m);
  });

  // ── Rapport ──────────────────────────────────────────────────────────────
  console.log(`• Fil source « Nils » : ${src.length} msgs.`);
  console.log(`• Sauvegarde live → ${path.relative(ROOT, safetyPath)}\n`);
  const report = (label, thread, idxs) => {
    console.log(`── ${label} : ${thread.length} msgs (index ${idxs.length > 8 ? idxs[0] + "…" + idxs[idxs.length - 1] : idxs.join(",")})`);
    console.log(`     1er : [${idxs[0]}] ${short(thread[0])}`);
    console.log(`     der : [${idxs[idxs.length - 1]}] ${short(thread[thread.length - 1])}`);
  };
  report("CYNTHIA (échecs)", cynthiaThread, CYNTHIA_IDX);
  report("MATTHEW (soirée)", matthewThread, MATTHEW_IDX);
  report("NILS (le reste) ", nilsThread, nilsIdxList);
  console.log(`\n  Total réparti : ${cynthiaThread.length + matthewThread.length + nilsThread.length} / ${src.length}`);
  console.log(`  drew.messages : ${live.length} → ${next.length} conversations.`);

  if (!APPLY) { console.log("\n(dry-run) Rien écrit. Relance avec --apply pour appliquer."); process.exit(0); }

  await set(ref(db, "drew/messages"), next);
  console.log("\n✔ Écrit : drew/messages découpé (Nils / Cynthia / Matthew).");
  console.log("  (état précédent : " + path.relative(ROOT, safetyPath) + ")");
  process.exit(0);
}
main().catch((e) => { console.error("✖ Erreur :", e); process.exit(1); });
