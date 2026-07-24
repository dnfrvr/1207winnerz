// ─── Reconstitution narrative du fil Glinda↔Eoghan (ordre + auteurs + heures) ──
// a = Glinda, b = Eoghan. Le PLAN ci-dessous est explicite et relisible : chaque ligne =
// { src: index d'origine du message (on garde son texte/image), from: auteur corrigé, time }.
// Corrections d'auteur vs original : src5 →Glinda, src7 →Glinda (« le médecin vient de confirmer » =
// c'est ELLE qui a la mono), src8 →Eoghan (réponse « la soirée d'intégration, c'est sûr »).
// Réordonnancement clé : le message « j'ai la mononucléose » (src34) remonte au DÉBUT de l'arc
// médecin (Sep 10), au lieu d'être coincé en fin de fil.
//
// Usage : node scripts/reconstruct-glinda-eoghan.mjs [--apply]

import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, set } from "firebase/database";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const APPLY = process.argv.includes("--apply");
const TID = "glinda_eoghan";

// PLAN : nouvel ordre. from: 'a'=Glinda, 'b'=Eoghan.
const PLAN = [
  {src:0,  from:'b', time:'31 Aug, 2:22pm'},  // Eoghan: coucou j'ai oublié ton prénom
  {src:1,  from:'a', time:'31 Aug, 2:24pm'},  // Glinda: toi c'est le gars de la soirée ?
  {src:2,  from:'b', time:'31 Aug, 2:25pm'},  // Eoghan: ouiii 🏈
  {src:3,  from:'a', time:'31 Aug, 2:27pm'},  // Glinda: c'était trop drôle hier
  {src:4,  from:'b', time:'31 Aug, 2:29pm'},  // Eoghan: starbucks demain ? (date 30→31 corrigée)
  {src:5,  from:'a', time:'31 Aug, 2:31pm'},  // Glinda: pareil, à demain ❤️ (auteur E→G)
  // ── Arc mononucléose (Sep 10-11) ──
  {src:34, from:'a', time:'10 Sep, 6:12pm'},  // Glinda: AU SECOURS J'AI LA MONO ?? (remonté ici)
  {src:6,  from:'b', time:'11 Sep, 9:10am'},  // Eoghan: MA VIE TA GUEULE
  {src:7,  from:'a', time:'11 Sep, 9:46am'},  // Glinda: le médecin vient de confirmer (auteur E→G)
  {src:8,  from:'b', time:'11 Sep, 9:48am'},  // Eoghan: la soirée d'intégration, c'est sûr (auteur G→E)
  {src:9,  from:'a', time:'11 Sep, 9:49am'},  // Glinda: je me sens trop mal
  {src:10, from:'b', time:'11 Sep, 11:05am'}, // Eoghan: j'arrive te faire de la soupe
  // ── Pharmacie (Sep 14) ──
  {src:11, from:'a', time:'14 Sep, 11:02am'},
  {src:12, from:'b', time:'14 Sep, 11:03am'},
  {src:13, from:'a', time:'14 Sep, 11:04am'},
  {src:14, from:'b', time:'14 Sep, 11:05am'},
  // ── Soirée de Jackson (Sep 15) ──
  {src:15, from:'b', time:'15 Sep, 6:40pm'},
  {src:16, from:'a', time:'15 Sep, 6:42pm'},
  {src:17, from:'b', time:'15 Sep, 6:44pm'},
  {src:18, from:'a', time:'15 Sep, 6:45pm'},
  // ── Partiel (Sep 20-21) ──
  {src:19, from:'a', time:'20 Sep, 9:10pm'},
  {src:20, from:'b', time:'20 Sep, 9:12pm'},
  {src:21, from:'a', time:'20 Sep, 9:13pm'},
  {src:22, from:'a', time:'21 Sep, 11:30am'},
  {src:23, from:'b', time:'21 Sep, 11:32am'},
  {src:24, from:'a', time:'21 Sep, 11:33am'},
  // ── Soirée Netflix (Sep 29) ──
  {src:25, from:'b', time:'29 Sep, 11:11pm'},
  {src:26, from:'a', time:'29 Sep, 11:13pm'},
  {src:27, from:'b', time:'29 Sep, 11:14pm'},
  {src:28, from:'a', time:'29 Sep, 11:15pm'},
  // ── Match de foot (matin, sans date à l'origine → Oct 6) ──
  {src:29, from:'a', time:'6 Oct, 9:12am'},
  {src:30, from:'b', time:'6 Oct, 9:18am'},
  {src:31, from:'a', time:'6 Oct, 9:20am'},
  {src:32, from:'b', time:'6 Oct, 9:21am'},
  // ── Beat émotionnel (nuit) + fin ──
  {src:33, from:'b', time:'10 Oct, 3:55am'},  // Eoghan: je sais pas comment me sentir
  {src:35, from:'a', time:'15 Oct, 11:57pm'},
  {src:36, from:'a', time:'30 Oct, 2:02am'},
];

function loadEnv(){ const out={}; const p=path.join(ROOT,".env.local");
  if(fs.existsSync(p)) for(const l of fs.readFileSync(p,"utf8").split(/\r?\n/)){ const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if(m) out[m[1]]=m[2].replace(/^["']|["']$/g,""); }
  for(const k of Object.keys(process.env)) if(k.startsWith("VITE_FIREBASE_")) out[k]=process.env[k]; return out; }
const env=loadEnv();
const cfg={apiKey:env.VITE_FIREBASE_API_KEY,authDomain:env.VITE_FIREBASE_AUTH_DOMAIN,databaseURL:env.VITE_FIREBASE_DATABASE_URL,projectId:env.VITE_FIREBASE_PROJECT_ID};
if(!cfg.databaseURL){ console.error("✖ DATABASE_URL manquante."); process.exit(1); }

async function main(){
  const db=getDatabase(initializeApp(cfg));
  const src=(await get(ref(db,`sharedThreads/${TID}`))).val()||[];
  if(src.length!==37) console.warn(`⚠ Le fil fait ${src.length} messages (attendu 37).`);
  // Garde-fou : chaque index source utilisé exactement une fois.
  const used=PLAN.map(p=>p.src).sort((a,b)=>a-b);
  const missing=src.map((_,i)=>i).filter(i=>!used.includes(i));
  if(missing.length) console.warn("⚠ Messages source NON replacés :", missing);

  const next=PLAN.map(p=>{ const m=src[p.src]||{}; const {senderKey,senderName,...rest}=m; return {...rest, from:p.from, time:p.time}; });

  console.log(`Reconstitution ${TID} — ${src.length} → ${next.length} messages :\n`);
  next.forEach((m,i)=>{
    const who=m.from==="a"?"GLINDA":"EOGHAN";
    const orig=src[PLAN[i].src];
    const authChg = (orig.from!==m.from) ? " ⚠AUTEUR" : "";
    console.log(`[${String(i).padStart(2)}] ${who.padEnd(6)} | ${m.time.padEnd(15)}${authChg} | ${(m.text||"[img]").replace(/\n/g," ").slice(0,44)}`);
  });

  if(!APPLY){ console.log("\n(dry-run) Rien écrit. Relance avec --apply."); process.exit(0); }
  fs.mkdirSync(path.join(__dirname,"_backups"),{recursive:true});
  const stamp=new Date().toISOString().replace(/[:.]/g,"-");
  fs.writeFileSync(path.join(__dirname,"_backups",`glinda_eoghan-recon-${stamp}.json`),JSON.stringify(src,null,2));
  await set(ref(db,`sharedThreads/${TID}`),next);
  console.log("\n✔ Écrit : sharedThreads/glinda_eoghan reconstitué. Sauvegarde dans scripts/_backups/.");
  process.exit(0);
}
main().catch(e=>{ console.error("✖",e); process.exit(1); });
