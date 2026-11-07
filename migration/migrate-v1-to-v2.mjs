// ─── Migration v1 (arbre Firebase actuel) → v2 (docs/MODELE_V2.md) ──────────────
// Fonction PURE : lit un export JSON v1, produit un JSON v2 + un rapport. N'écrit jamais en base.
//
// Usage :
//   node migration/migrate-v1-to-v2.mjs                       # autotest sur les seeds (mkData)
//   node migration/migrate-v1-to-v2.mjs export.json out.json  # export réel (snapshot admin ou backup)
//
// Garanties :
//   - aucune liste éditable ne reste un tableau : maps { id stable: { …, order } } ;
//   - toute clé inconnue est conservée (legacy/ ou data/) plutôt que perdue ;
//   - vérification de conservation : chaque texte de la v1 doit se retrouver dans la v2.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { loreSortKey } = await import(pathToFileURL(path.join(ROOT, "src/shared/lore-date.js")).href);

export const PIDS = ["glinda", "eoghan", "drew", "elias"];
const ORDER_STEP = 1000;

// Champs « identité » du téléphone → phones/{pid}/profile (le reste va dans data/).
const PROFILE_FIELDS = new Set([
  "name", "username", "os", "avatar", "wallpaper", "accentColor", "phoneColor", "chassisPng",
  "screenInset", "licence", "reputation", "pronouns", "bio", "appIcons", "appNames", "badges",
  "followers", "following", "playlistName", "devOverrides", "notepadWidget",
]);
// Clés d'affichage « enrichies » écrites par erreur dans le perso par la v1 : ignorées.
const DROPPED_CHAR_FIELDS = new Set(["sharedThreads", "_coTaggedInstaPosts"]);

// ── utilitaires ──────────────────────────────────────────────────────────────
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
// Firebase renvoie un tableau troué sous forme d'objet {"0":…,"3":…} : on le remet en tableau.
const asArray = (v) => {
  if (Array.isArray(v)) return v.filter((x) => x !== null && x !== undefined);
  if (isObj(v)) {
    const keys = Object.keys(v);
    if (keys.length && keys.every((k) => /^\d+$/.test(k)))
      return keys.sort((a, b) => a - b).map((k) => v[k]).filter((x) => x !== null && x !== undefined);
  }
  return null;
};
// Clé RTDB valide, jamais purement numérique (sinon Firebase la relit comme un tableau).
const safeKey = (raw) => {
  const s = String(raw).replace(/[.#$/[\]\s]/g, "_");
  return /^\d/.test(s) ? `k${s}` : s;
};
const hash = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
};

// Tableau d'objets → map { cléStable: { …item, order } }. Ids existants réutilisés s'ils sont uniques.
const listToMap = (arr, prefix, report, where) => {
  const out = {};
  arr.forEach((item, i) => {
    let key = item && item.id !== undefined && item.id !== null ? safeKey(item.id) : null;
    if (!key || out[key]) {
      if (key) report.warnings.push(`${where} : id en double « ${item.id} » → nouvel id`);
      key = `${prefix}${i}_${hash(JSON.stringify(item))}`;
    }
    out[key] = { ...convert(item, report, `${where}/${key}`), order: (i + 1) * ORDER_STEP };
  });
  return out;
};

// Conversion générique récursive : listes d'objets → maps ; listes de primitives inchangées.
const convert = (v, report, where) => {
  const arr = asArray(v);
  if (arr) {
    if (arr.length && arr.every(isObj)) return listToMap(arr, "i", report, where);
    return arr.map((x) => (isObj(x) || Array.isArray(x) ? convert(x, report, where) : x));
  }
  if (isObj(v)) {
    const o = {};
    for (const [k, x] of Object.entries(v)) if (x !== null && x !== undefined) o[safeKey(k)] = convert(x, report, `${where}/${k}`);
    return o;
  }
  return v;
};

// ── messages ─────────────────────────────────────────────────────────────────
const pairMembers = (tid) => {
  const parts = String(tid).split("_");
  return parts.length === 2 && PIDS.includes(parts[0]) && PIDS.includes(parts[1]) ? parts : null;
};

const convertMessages = (rawList, resolveFrom, report, where) => {
  const list = asArray(rawList) || [];
  const out = {};
  list.forEach((m, i) => {
    if (!isObj(m)) return;
    const { from, ...rest } = m;
    const key = m.id !== undefined && m.id !== null && !out[safeKey(m.id)] ? safeKey(m.id) : `m${i}_${hash(JSON.stringify(m))}`;
    out[key] = { ...convert(rest, report, `${where}/${key}`), ...resolveFrom(from), ts: loreSortKey(m.time || ""), order: (i + 1) * ORDER_STEP };
  });
  return out;
};

// ── migration principale ─────────────────────────────────────────────────────
export function migrate(v1) {
  const report = { counts: {}, warnings: [], dropped: [], legacy: [] };
  const v2 = {
    meta: { schemaVersion: 2, loreDate: v1.loreDate || null, sourceSeedVersion: v1._seedVersion ?? null, migratedAt: new Date().toISOString() },
    phones: {}, threads: {}, threadMessages: {}, feeds: {}, shared: {},
  };
  const st = isObj(v1.sharedThreads) ? v1.sharedThreads : {};
  const groupMeta = isObj(v1.groupMeta) ? v1.groupMeta : {};
  const usedThreads = new Set();

  // 1. Fils partagés (1-à-1 et groupes) depuis sharedThreads
  for (const [tid, raw] of Object.entries(st)) {
    if (tid.startsWith("_")) continue; // feeds / partagés, traités plus bas
    if (!asArray(raw) && raw !== null) { v2.legacy ??= {}; v2.legacy[`sharedThreads_${tid}`] = raw; report.legacy.push(`sharedThreads/${tid}`); continue; }
    const key = safeKey(tid);
    const pair = pairMembers(tid);
    const meta = isObj(groupMeta[tid]) ? groupMeta[tid] : {};
    const members = pair || (asArray(meta.members) || []).filter((p) => PIDS.includes(p));
    v2.threads[key] = {
      kind: pair ? "pair" : "group",
      members: Object.fromEntries((members.length ? members : PIDS).map((p) => [p, true])),
      ...(meta.name ? { name: meta.name } : {}),
      ...convert(Object.fromEntries(Object.entries(meta).filter(([k]) => !["name", "members"].includes(k))), report, `groupMeta/${tid}`),
    };
    const resolveFrom = pair
      ? (f) => (f === "a" ? { from: pair[0] } : f === "b" ? { from: pair[1] } : PIDS.includes(f) ? { from: f } : { from: "npc", npcName: f ?? null })
      : (f) => (PIDS.includes(f) ? { from: f } : { from: "npc", npcName: f ?? null });
    v2.threadMessages[key] = convertMessages(raw, resolveFrom, report, `sharedThreads/${tid}`);
  }

  // 2. Feeds et données partagées (_shared*, _twitterFollows…)
  for (const [name, raw] of Object.entries(st)) {
    if (!name.startsWith("_") || raw === null || raw === undefined) continue;
    const clean = name.replace(/^_shared/, "").replace(/^_/, "");
    const feedName = clean.charAt(0).toLowerCase() + clean.slice(1);
    const arr = asArray(raw);
    if (arr && arr.every(isObj)) { v2.feeds[feedName] = listToMap(arr, "p", report, `feeds/${feedName}`); report.counts[`feeds/${feedName}`] = arr.length; }
    else v2.shared[feedName] = convert(raw, report, `shared/${feedName}`);
  }
  if (v1._sharedAndroidIcons) v2.shared.androidIcons = convert(v1._sharedAndroidIcons, report, "shared/androidIcons");

  // 3. Téléphones
  for (const pid of PIDS) {
    const c = v1[pid];
    if (!isObj(c)) { report.warnings.push(`perso ${pid} absent de l'export`); continue; }
    const phone = { profile: {}, home: {}, inbox: {}, data: {} };
    for (const [field, val] of Object.entries(c)) {
      if (val === null || val === undefined) continue;
      if (DROPPED_CHAR_FIELDS.has(field)) { report.dropped.push(`${pid}/${field}`); continue; }
      if (field === "apps" || field === "dock") { phone.home[field] = asArray(val) || []; continue; }
      if (field === "messages") continue;
      if (PROFILE_FIELDS.has(field)) phone.profile[field] = convert(val, report, `${pid}/${field}`);
      else phone.data[safeKey(field)] = convert(val, report, `${pid}/${field}`);
    }

    // Boîte de réception : pointeurs vers fils partagés + conversations locales (PNJ)
    (asArray(c.messages) || []).forEach((m, i) => {
      if (!isObj(m)) return;
      const { thread, sharedThreadId, perspective, ...entry } = m;
      let tid;
      if (sharedThreadId) {
        tid = safeKey(sharedThreadId);
        if (!v2.threads[tid]) {
          // Pointeur vers un fil absent de sharedThreads : on garde la conv avec son thread local.
          report.warnings.push(`${pid} : fil partagé « ${sharedThreadId} » introuvable → conservé en local`);
          v2.threads[tid] = { kind: pairMembers(sharedThreadId) ? "pair" : "group", members: Object.fromEntries((pairMembers(sharedThreadId) || [pid]).map((p) => [p, true])) };
          v2.threadMessages[tid] = convertMessages(thread, (f) => (f === "me" ? { from: pid } : PIDS.includes(f) ? { from: f } : { from: "npc", npcName: f === "them" ? (m.contact ?? null) : (f ?? null) }), report, `${pid}/messages/${i}`);
        }
        else if ((asArray(thread) || []).length) {
          // Pointeur vers un fil partagé qui porte AUSSI un thread local (incohérence v1) :
          // on ne l'affiche plus, mais on le garde à côté pour vérification manuelle.
          report.warnings.push(`${pid} : la conv « ${m.contact} » pointe vers « ${sharedThreadId} » mais contient aussi ${(asArray(thread) || []).length} message(s) local(aux) → gardés dans inbox/${tid}/legacyLocalThread`);
          entry.legacyLocalThread = convertMessages(thread, (f) => ({ fromRaw: f ?? null }), report, `${pid}/messages/${i}/thread`);
        }
        v2.threads[tid].members[pid] = true;
      } else {
        tid = safeKey(`local_${pid}_${m.id ?? i}`);
        if (v2.threads[tid]) tid = safeKey(`local_${pid}_${m.id ?? "x"}_${i}`);
        v2.threads[tid] = { kind: "local", members: { [pid]: true }, contact: m.contact ?? null, ...(m.isGroup ? { isGroup: true } : {}) };
        v2.threadMessages[tid] = convertMessages(thread, (f) => (f === "me" ? { from: pid } : PIDS.includes(f) ? { from: f } : { from: "npc", npcName: f === "them" || f == null ? (m.contact ?? null) : f }), report, `${pid}/messages/${i}`);
      }
      if (phone.inbox[tid]) report.warnings.push(`${pid} : conversation en double vers « ${tid} » fusionnée`);
      phone.inbox[tid] = { ...convert(entry, report, `${pid}/messages/${i}`), threadId: tid, order: (i + 1) * ORDER_STEP };
      usedThreads.add(tid);
    });
    report.counts[`${pid}/inbox`] = Object.keys(phone.inbox).length;
    v2.phones[pid] = phone;
  }

  // 4. Fils orphelins (présents mais visibles par personne) → signalés, conservés
  for (const tid of Object.keys(v2.threads)) if (!usedThreads.has(tid)) report.warnings.push(`fil « ${tid} » n'apparaît dans aucune boîte de réception (conservé)`);

  // 5. Copies parasites {pid}/sharedThreads : signaler les messages qu'elles ont EN PLUS
  for (const pid of PIDS) {
    const copy = v1[pid]?.sharedThreads;
    if (!isObj(copy)) continue;
    for (const [tid, raw] of Object.entries(copy)) {
      const arr = asArray(raw); if (!arr || tid.startsWith("_")) continue;
      const main = new Set((asArray(st[tid]) || []).map((m) => `${m?.time}|${m?.text}`));
      const extra = arr.filter((m) => isObj(m) && !main.has(`${m.time}|${m.text}`));
      if (extra.length) report.warnings.push(`copie ${pid}/sharedThreads/${tid} : ${extra.length} message(s) absent(s) du fil principal — à vérifier/récupérer`);
    }
  }

  // 6. Clés racine inconnues → legacy (jamais perdues)
  const KNOWN = new Set([...PIDS, "sharedThreads", "groupMeta", "_sharedAndroidIcons", "loreDate", "_seedVersion", "_snapshots"]);
  for (const [k, val] of Object.entries(v1)) if (!KNOWN.has(k)) { v2.legacy ??= {}; v2.legacy[safeKey(k)] = val; report.legacy.push(k); }

  report.counts.threads = Object.keys(v2.threads).length;
  report.counts.threadMessages = Object.values(v2.threadMessages).reduce((n, t) => n + Object.keys(t).length, 0);
  return { v2, report };
}

// ── vérification de conservation ─────────────────────────────────────────────
// Tous les textes (chaînes ≥ 2 caractères) de la v1, hors champs volontairement transformés
// ou ignorés, doivent exister dans la v2.
// `members` : la liste ["glinda",…] devient une map {glinda:true} (les noms passent en clés).
const IGNORED_FIELDS = new Set(["from", "perspective", "sharedThreadId", "members", "_snapshots", "_seedVersion"]);
const collectStrings = (v, out, skipKey) => {
  if (typeof v === "string") { if (v.length >= 2) out.set(v, (out.get(v) || 0) + 1); return; }
  if (Array.isArray(v)) { v.forEach((x) => collectStrings(x, out)); return; }
  if (isObj(v)) for (const [k, x] of Object.entries(v)) if (!IGNORED_FIELDS.has(k) && !(skipKey && skipKey(k))) collectStrings(x, out);
};
export function verify(v1, v2) {
  const before = new Map(), after = new Map();
  const v1Clean = Object.fromEntries(Object.entries(v1).map(([k, v]) =>
    PIDS.includes(k) && isObj(v) ? [k, Object.fromEntries(Object.entries(v).filter(([f]) => !DROPPED_CHAR_FIELDS.has(f)))] : [k, v]));
  collectStrings(v1Clean, before);
  collectStrings(v2, after);
  const missing = [];
  for (const [s, n] of before) if ((after.get(s) || 0) < n) missing.push({ text: s.slice(0, 80), expected: n, found: after.get(s) || 0 });
  return { textsV1: before.size, missing };
}

// ── CLI ──────────────────────────────────────────────────────────────────────
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  // `--seed <sortie>` : migre les seeds (mkData) et écrit le résultat (jeu de données de dev de la v2).
  let [input, output] = process.argv.slice(2);
  if (input === "--seed") { output = process.argv[3]; input = undefined; }
  let v1;
  if (input) v1 = JSON.parse(fs.readFileSync(input, "utf8"));
  else {
    const { mkData } = await import(pathToFileURL(path.join(ROOT, "src/data/characters.js")).href);
    v1 = mkData();
    console.log("(autotest sur les données seed — passer un export réel en argument)");
  }
  const { v2, report } = migrate(v1);
  const check = verify(v1, v2);
  console.log("\n== Comptes =="); for (const [k, n] of Object.entries(report.counts)) console.log(`  ${k.padEnd(28)} ${n}`);
  console.log(`\n== Ignoré (copies parasites) == ${report.dropped.join(", ") || "rien"}`);
  console.log(`== Conservé en legacy == ${report.legacy.join(", ") || "rien"}`);
  console.log(`\n== Avertissements (${report.warnings.length}) ==`); report.warnings.forEach((w) => console.log("  - " + w));
  console.log(`\n== Conservation == ${check.textsV1} textes distincts en v1, ${check.missing.length} manquant(s)`);
  check.missing.slice(0, 30).forEach((m) => console.log(`  ✗ « ${m.text} » (attendu ${m.expected}, trouvé ${m.found})`));
  const kb = (o) => Math.round(JSON.stringify(o).length / 1024);
  console.log(`\nTaille : v1 ${kb(v1)} Ko → v2 ${kb(v2)} Ko`);
  if (output) { fs.writeFileSync(output, JSON.stringify(v2, null, 2)); console.log(`Écrit : ${output}`); }
  process.exitCode = check.missing.length ? 1 : 0;
}
