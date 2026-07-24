// ─── Rétablir la conv Glinda ↔ Elias (vide côté Glinda) + nettoyer fantômes ────
// Constat live :
//   • Le contenu de la conv Glinda↔Elias (13 msgs) n'existe QUE côté Elias, dans un
//     fil LOCAL « Glinglin 🌸 » (perspective d'Elias : me=elias, them=glinda).
//   • Côté Glinda : une entrée « Elias 🖤 » locale avec 1 seul message VIDE (fantôme).
//   • Il n'existe AUCUN fil partagé glinda_elias → les deux côtés ne se synchronisent pas.
//   • Côté Eoghan : le vrai fil eoghan_elias (22 msgs) est OK ; il reste un fantôme
//     local « Elias 🖤 » (1 msg vide) à supprimer.
//
// Fix : créer sharedThreads/glinda_elias (= les 13 msgs convertis en from a/b, avec
// glinda=a, elias=b — ordre positionnel de l'id, cf. perspectiveOf), faire pointer
// l'entrée de Glinda ET celle d'Elias vers ce fil partagé (fini les fils locaux
// divergents), et supprimer les entrées fantômes locales vides (Glinda + Eoghan).
//
// Usage : node scripts/restore-glinda-elias.mjs [--apply]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, set } from "firebase/database";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const APPLY = process.argv.includes("--apply");
const TID = "glinda_elias"; // positionnel → glinda=a, elias=b

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

const asArr = (v) => (Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : []);
const short = (m) => (m ? (m.text || (m.img ? "[img]" : "")) : "").replace(/\n/g, " ").slice(0, 55);

async function main() {
  const db = getDatabase(initializeApp(cfg));
  const glArr = asArr((await get(ref(db, "glinda/messages"))).val());
  const elArr = asArr((await get(ref(db, "elias/messages"))).val());
  const eoArr = asArr((await get(ref(db, "eoghan/messages"))).val());
  const existingShared = (await get(ref(db, `sharedThreads/${TID}`))).val();

  if (existingShared != null) { console.error(`✖ sharedThreads/${TID} existe déjà (${asArr(existingShared).length} msg). Abandon pour ne rien écraser.`); process.exit(1); }

  const glIdx = glArr.findIndex(m => /elias/i.test(m.contact || "") && !m.sharedThreadId && !m.isGroup);
  const elIdx = elArr.findIndex(m => /glinglin/i.test(m.contact || "") && !m.sharedThreadId && !m.isGroup);
  const eoGhostIdx = eoArr.findIndex(m => /elias/i.test(m.contact || "") && !m.sharedThreadId && !m.isGroup);
  if (elIdx < 0) { console.error("✖ Fil source 'Glinglin 🌸' (local) introuvable chez Elias."); process.exit(1); }
  if (glIdx < 0) { console.error("✖ Entrée 'Elias' (locale) introuvable chez Glinda."); process.exit(1); }

  const srcThread = elArr[elIdx].thread || [];
  // Conversion perspective d'Elias (me=elias=b, them=glinda=a) → format partagé a/b.
  const sharedThread = srcThread
    .filter(m => (m.text && m.text.trim()) || m.img) // on jette d'éventuels msgs vides
    .map(m => { const { from, ...rest } = m; return { ...rest, from: from === "me" ? "b" : "a" }; });

  // Nouvelles entrées (mêmes id conservés) pointant le fil partagé.
  const glEntry = { ...glArr[glIdx], sharedThreadId: TID, perspective: "a", unread: false };
  delete glEntry.thread;
  const elEntry = { ...elArr[elIdx], sharedThreadId: TID, perspective: "b", unread: false };
  delete elEntry.thread;

  const nextGl = glArr.map((m, i) => i === glIdx ? glEntry : m);
  const nextEl = elArr.map((m, i) => i === elIdx ? elEntry : m);
  const nextEo = eoGhostIdx >= 0 ? eoArr.filter((_, i) => i !== eoGhostIdx) : eoArr;

  // ── Rapport ────────────────────────────────────────────────────────────────
  console.log(`• Source (Elias/Glinglin) : ${srcThread.length} msg → ${sharedThread.length} après filtrage vides.`);
  console.log(`• Fil partagé créé : sharedThreads/${TID} (glinda=a, elias=b)\n`);
  console.log("── Aperçu rendu CÔTÉ GLINDA (a) ──");
  sharedThread.forEach((m, i) => console.log(`  [${i}] ${m.from === "a" ? "MOI " : "ELIAS"} | ${(m.time || "?").padEnd(14)} | ${short(m)}`));
  console.log(`\n• Glinda[${glIdx}] : "${glEntry.contact}" local(1 msg vide) → shared:${TID} (persp a)`);
  console.log(`• Elias[${elIdx}]  : "${elEntry.contact}" local(13 msg) → shared:${TID} (persp b)`);
  console.log(`• Eoghan fantôme "Elias 🖤" local : ${eoGhostIdx >= 0 ? `supprimé (index ${eoGhostIdx})` : "aucun"}`);

  if (!APPLY) { console.log("\n(dry-run) Rien écrit. Relance avec --apply."); process.exit(0); }

  // Sauvegardes.
  const bdir = path.join(__dirname, "_backups"); fs.mkdirSync(bdir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.writeFileSync(path.join(bdir, `glinda-messages-${stamp}.json`), JSON.stringify(glArr, null, 2));
  fs.writeFileSync(path.join(bdir, `elias-messages-${stamp}.json`), JSON.stringify(elArr, null, 2));
  fs.writeFileSync(path.join(bdir, `eoghan-messages-${stamp}.json`), JSON.stringify(eoArr, null, 2));

  await set(ref(db, `sharedThreads/${TID}`), sharedThread);
  await set(ref(db, "glinda/messages"), nextGl);
  await set(ref(db, "elias/messages"), nextEl);
  if (eoGhostIdx >= 0) await set(ref(db, "eoghan/messages"), nextEo);
  console.log("\n✔ Écrit : sharedThreads/glinda_elias + glinda/elias/eoghan messages mis à jour.");
  console.log(`  (sauvegardes scripts/_backups/*-${stamp}.json)`);
  process.exit(0);
}
main().catch(e => { console.error("✖ Erreur :", e); process.exit(1); });
