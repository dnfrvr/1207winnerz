// ─── Enrichit l'arc « mononucléose » de Glinda↔Eoghan ────────────────────────
// Nouveau canon : les DEUX ont chopé la mono en se pécho à la soirée d'intégration (fin août).
// On remplace l'arc mono actuel (positions 6-11, entre l'arc Aug 31 et la pharmacie Sep 14) par une
// version enrichie : Eoghan révèle qu'il l'a aussi, et la cause = le baiser à la soirée.
// Opère sur le fil LIVE ACTUEL (déjà reconstitué). a = Glinda, b = Eoghan.
//
// Usage : node scripts/add-mono-detail.mjs [--apply]

import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, set } from "firebase/database";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const APPLY = process.argv.includes("--apply");
const TID = "glinda_eoghan";

const monoArc = [
  {from:'a', time:'10 Sep, 6:12pm',  text:"EOGHAN AU SECOURS J'AI LA MONONUCLÉOSE ?? 🦠😭😭😭"},
  {from:'b', time:'11 Sep, 9:10am',  text:"MA VIE TA GUEULE 😳😳"},
  {from:'b', time:'11 Sep, 9:11am',  text:"attends... le médecin vient de me dire exactement la même chose hier 🦠😭"},
  {from:'a', time:'11 Sep, 9:12am',  text:"NOOON on l'a chopée tous les deux ?? 😭😭"},
  {from:'a', time:'11 Sep, 9:46am',  text:"Le médecin vient de confirmer pour moi aussi 😭 Tu penses que c'est à cause de..."},
  {from:'b', time:'11 Sep, 9:48am',  text:"la soirée d'intégration 🙈 clairement quand on s'est pécho ce soir-là ma vie 😳"},
  {from:'a', time:'11 Sep, 9:49am',  text:"la maladie du baiser mdrrrr on est vraiment trop bêtes 🦠😭"},
  {from:'a', time:'11 Sep, 9:50am',  text:"Je me sens trop mal c'est horrible 😭"},
  {from:'b', time:'11 Sep, 11:05am', text:"j'arrive te faire de la soupe ma vie, on sera malades ensemble 🍲🏃"},
];

function loadEnv(){ const out={}; const p=path.join(ROOT,".env.local");
  if(fs.existsSync(p)) for(const l of fs.readFileSync(p,"utf8").split(/\r?\n/)){ const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if(m) out[m[1]]=m[2].replace(/^["']|["']$/g,""); }
  for(const k of Object.keys(process.env)) if(k.startsWith("VITE_FIREBASE_")) out[k]=process.env[k]; return out; }
const env=loadEnv();
const cfg={apiKey:env.VITE_FIREBASE_API_KEY,authDomain:env.VITE_FIREBASE_AUTH_DOMAIN,databaseURL:env.VITE_FIREBASE_DATABASE_URL,projectId:env.VITE_FIREBASE_PROJECT_ID};
if(!cfg.databaseURL){ console.error("✖ DATABASE_URL manquante."); process.exit(1); }

async function main(){
  const db=getDatabase(initializeApp(cfg));
  const cur=(await get(ref(db,`sharedThreads/${TID}`))).val()||[];
  // Localise l'arc mono par CONTENU (robuste au fait que tu réordonnes le fil en direct) :
  // du message « MONONUCLÉOSE » jusqu'au message « soupe ».
  const startIdx=cur.findIndex(m=>/MONONUCL/i.test(m?.text||""));
  const endIdx=cur.findIndex((m,i)=>i>=startIdx && /soupe/i.test(m?.text||""));
  if(startIdx<0 || endIdx<0 || endIdx<startIdx || (endIdx-startIdx)>10){
    console.error(`✖ Arc mono introuvable/incohérent (start=${startIdx}, end=${endIdx}). Abandon.`);
    process.exit(1);
  }
  console.log(`Arc mono actuel : positions ${startIdx}–${endIdx} (${endIdx-startIdx+1} messages) → remplacé par ${monoArc.length}.`);
  const next=[...cur.slice(0,startIdx), ...monoArc, ...cur.slice(endIdx+1)];

  console.log(`${TID} : ${cur.length} → ${next.length} messages. Aperçu du nouvel arc :\n`);
  next.slice(startIdx,startIdx+monoArc.length).forEach((m,i)=>console.log(`[${i+startIdx}] ${m.from==="a"?"GLINDA":"EOGHAN"} | ${m.time.padEnd(15)} | ${m.text}`));

  if(!APPLY){ console.log("\n(dry-run) Rien écrit. Relance avec --apply."); process.exit(0); }
  fs.mkdirSync(path.join(__dirname,"_backups"),{recursive:true});
  const stamp=new Date().toISOString().replace(/[:.]/g,"-");
  fs.writeFileSync(path.join(__dirname,"_backups",`glinda_eoghan-mono-${stamp}.json`),JSON.stringify(cur,null,2));
  await set(ref(db,`sharedThreads/${TID}`),next);
  console.log("\n✔ Écrit : arc mono enrichi (les deux ont la mono). Sauvegarde dans scripts/_backups/.");
  process.exit(0);
}
main().catch(e=>{ console.error("✖",e); process.exit(1); });
