import React, { useState, useEffect, useRef } from "react";
import { ref, onValue, set, update } from "firebase/database";
import { FF_IOS } from "../shared/constants.js";
import { APP_META } from "../shared/app-meta.js";
import { loreSortKey, parseLoreTime, LORE_DATE_DEFAULT } from "../shared/lore-date.js";
import { UploadReader, dataUriToBlob, findBase64Images, uploadBlobToSupabase, supabaseClient } from "../lib/storage.js";
import { firebaseDb } from "../lib/firebase.js";
import { CHAR_NAMES } from "../data/characters.js";
import { LORE_MONTHS, CHARACTERS, TWITTER_HOME_BASE } from "../data/seeds.js";
import { IgCommentEditor } from "../screens/InstaScreen.jsx";
import { WeatherCityCard, WEATHER_DEFAULTS } from "../screens/WeatherScreen.jsx";
import { WIKI_FEEDS } from "../screens/WikipediaScreen.jsx";
import { KINDLE_DEFAULT_BOOKS } from "../screens/KindleScreen.jsx";
import { YOUTUBE_FEEDS_DEFAULT } from "../screens/YouTubeScreen.jsx";
import { REDDIT_ALL_POSTS } from "../screens/RedditScreen.jsx";
import { CALENDAR_SEED } from "../screens/CalendarScreen.jsx";
import { SNAPCHAT_DEFAULTS } from "../screens/SnapchatScreen.jsx";
import { GROUPME_DEFAULTS } from "../screens/GroupMeScreen.jsx";
import { PIN_DEFAULTS } from "../screens/PinterestScreen.jsx";
import { FACEBOOK_FRIENDS_FEED_DEFAULT, FACEBOOK_PAGES_DEFAULT } from "../screens/FacebookScreen.jsx";
import { EMAILS_BY_CHAR, MAIL_DRAFTS_BY_CHAR, MAIL_DELETED_BY_CHAR } from "../screens/GmailScreen.jsx";
import { fileTypeMeta } from "../screens/FilesScreen.jsx";
import { Field, LoreDateTimeInput } from "../shared/admin-fields.jsx";

// Éditeur générique pour les "posts partagés" (mêmes principes que Twitter : un tableau partagé
// entre les 4 persos, chacun ne voit/modifie que les posts dont il est l'auteur, ajout d'image et
// de date intégrés). Utilisé par Twitter, Tumblr et Facebook — seule la "forme" des données change
// (fieldMap), la mécanique (lister/ajouter/éditer/supprimer ses propres posts) est écrite une fois.
// ── Composants de toggle admin ────────────────────────────────────────────────
// Remplace les caractères › / ▾ dispersés partout dans l'admin par un vrai SVG
// cohérent, avec une zone cliquable de 44px minimum (recommandation iOS HIG pour
// le tactile), une couleur plus visible, et une animation de rotation fluide.
const AdminChevron = ({open, size=16, color="#6b7280"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{
    transform:open?"rotate(180deg)":"rotate(0deg)",
    transition:"transform 0.18s ease",
    flexShrink:0,
  }}>
    <path d="M6 9l6 6 6-6" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
// Header cliquable pour les sections repliables — zone tactile ≥ 44px.
const ToggleHeader = ({onClick, open, children, style={}}) => (
  <div onClick={onClick} style={{
    display:"flex", alignItems:"center", gap:10,
    padding:"12px 14px", cursor:"pointer", userSelect:"none",
    minHeight:44, WebkitTapHighlightColor:"transparent",
    ...style
  }}>
    {children}
    <AdminChevron open={open}/>
  </div>
);

const SharedPostsEditor = ({
  posts, onChange, tab, accent="#6366f1",
  fieldMap={text:"text", img:"img", time:"time"},
  showTitle=false, statFields=[], addExtra={}, addLabel="+ Post", textLabel="Texte", hint,
}) => {
  const F = fieldMap;
  const [openIds, setOpenIds] = useState(()=>new Set());
  const toggle = (id) => setOpenIds(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  const sortKey = (p) => { const t = parseLoreTime(p[F.time]); return t ? t.month*44640+t.day*1440+(t.hour||0)*60+(t.min||0) : -Infinity; };
  const mine = posts.filter(p=>p.author===tab).sort((a,b)=>sortKey(b)-sortKey(a));
  const updPost = (id, patch) => onChange(posts.map(p=>p.id===id?{...p,...patch}:p));
  const removePost = (id) => onChange(posts.filter(p=>p.id!==id));
  const addPost = () => {
    const blank = {id:Date.now(), author:tab, [F.text]:"", [F.time]:"1 oct, 9:00am", ...addExtra};
    statFields.forEach(sf=>{ blank[sf.key] = 0; });
    onChange([blank, ...posts]);
  };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {hint && <div style={{fontSize:11,color:"#9ca3af"}}>{hint} Triés du plus récent au plus ancien — clique pour déplier.</div>}
      {mine.map(post=>{
        const isOpen = openIds.has(post.id);
        return (
        <div key={post.id} className="adm-card" style={{background:"rgba(255,255,255,0.9)",borderRadius:10,border:"1px solid rgba(0,0,0,0.07)",overflow:"hidden"}}>
          <div onClick={()=>toggle(post.id)} style={{display:"flex",gap:10,alignItems:"center",padding:"10px 14px",cursor:"pointer",minHeight:44,WebkitTapHighlightColor:"transparent"}}>
            {post[F.img] && <div style={{width:32,height:32,borderRadius:5,overflow:"hidden",flexShrink:0}}><img src={post[F.img]} style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>}
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,color:"#374151",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{post[F.text]||<em style={{color:"#9ca3af"}}>(vide)</em>}</div>
              <div style={{fontSize:10,color:"#9ca3af"}}>{post[F.time]||"—"}</div>
            </div>
            <AdminChevron open={isOpen}/>
          </div>
          {isOpen && (
          <div style={{display:"flex",flexDirection:"column",gap:6,padding:"0 12px 12px"}}>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"flex-end"}}>
            {showTitle && <Field label="Titre (opt.)" value={post.title||""} onChange={v=>updPost(post.id,{title:v})} width="160px"/>}
            <LoreDateTimeInput value={post[F.time]||""} onChange={v=>updPost(post.id,{[F.time]:v})} width="190px" showLabel={true}/>
            <button onClick={()=>removePost(post.id)} className="adm-del-btn" style={{background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:11}}>✕</button>
          </div>
          {post[F.img] && <div style={{position:"relative",alignSelf:"flex-start"}}>
            <img src={post[F.img]} style={{maxWidth:200,maxHeight:150,borderRadius:8,display:"block"}}/>
            <button onClick={()=>updPost(post.id,{[F.img]:null})} style={{position:"absolute",top:2,right:2,background:"rgba(0,0,0,0.6)",border:"none",color:"#fff",borderRadius:"50%",width:20,height:20,fontSize:12,cursor:"pointer",lineHeight:1}}>✕</button>
          </div>}
          <label style={{alignSelf:"flex-start",background:`${accent}1a`,border:`1px dashed ${accent}66`,color:accent,borderRadius:6,padding:"5px 10px",fontSize:11,cursor:"pointer"}}>
            {post[F.img]?"Changer l'image":"+ Image"}
            <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
              const f=e.target.files?.[0]; if(!f) return;
              const r=new UploadReader(); r.onload=ev=>updPost(post.id,{[F.img]:ev.target.result}); r.readAsDataURL(f); e.target.value="";
            }}/>
          </label>
          <Field label={textLabel} value={post[F.text]||""} onChange={v=>updPost(post.id,{[F.text]:v})} textarea/>
          {statFields.length>0 && (
            <div style={{display:"flex",gap:6,alignItems:"flex-end"}}>
              {statFields.map(sf=>(
                <Field key={sf.key} label={sf.label} value={String(post[sf.key]??0)} onChange={v=>updPost(post.id,{[sf.key]:parseInt(v)||0})} width="auto"/>
              ))}
            </div>
          )}
          </div>
          )}
        </div>
        );
      })}
      <button onClick={addPost}
        style={{background:`${accent}14`,border:`1px dashed ${accent}66`,color:accent,borderRadius:8,padding:"10px 18px",cursor:"pointer",fontSize:12,fontWeight:600,alignSelf:"flex-start"}}>{addLabel}</button>
    </div>
  );
};

// Parse un coller multi-lignes "expéditeur: texte | heure" en thread.
// group=true → expéditeurs nommés (glinda/eoghan/drew/elias/moi) ; sinon moi/eux.
const parseComposerLines = (text, group, tab) => {
  const out = [];
  let lastDate = null; // mémorise la date (jour+mois) du dernier message pour raccourci heure seule
  for(const rawLine of (text||"").split("\n")) {
    const line = rawLine.trim();
    if(!line) continue;
    const m = line.match(/^([^:]+):\s*([\s\S]*)$/);
    if(!m) continue;
    const who = m[1].trim().toLowerCase();
    let rest = m[2];
    let time = "maintenant";
    const tm = rest.match(/\|\s*(.+)$/);
    if(tm) {
      const rawTime = tm[1].trim();
      rest = rest.slice(0, tm.index).trim();
      // Raccourci "heure seule" : si le segment après | est juste une heure (ex: 9:30am, 14h00)
      // sans jour/mois, on la colle à la date du message précédent pour former un timestamp complet.
      const isTimeOnly = /^(\d{1,2}:\d{2}\s*(am|pm)|\d{1,2}h\d{0,2})$/i.test(rawTime);
      if(isTimeOnly && lastDate) {
        time = `${lastDate}, ${rawTime}`;
      } else {
        time = rawTime;
        // Mémoriser la partie "jour mois" ou "DD/MM/YY" pour le prochain raccourci
        const p = parseLoreTime(rawTime);
        if(p) {
          const MONTHS_OUT=['','jan','fév','mar','avr','mai','juin','juil','aoû','sep','oct','nov','déc'];
          lastDate = `${p.day} ${MONTHS_OUT[p.month]}`;
        }
      }
    }
    if(group) {
      let from = (who==="moi"||who==="me") ? tab
        : (["glinda","eoghan","drew","elias"].includes(who) ? who : null);
      if(!from) continue;
      out.push({from, text:rest, time});
    } else {
      out.push({from:(who==="moi"||who==="me")?"me":"them", text:rest, time});
    }
  }
  return out;
};

// Compositeur de conversation — au niveau module (pas de remontage / perte de focus).
const ThreadComposer = ({isGroup, tab, onApply}) => {
  const [open, setOpen] = useState(false);
  const [txt, setTxt]   = useState("");
  const placeholder = isGroup
    ? "glinda: coucou tout le monde | 17 fév, 9:00am\ndrew: salut | 9:01am\nelias: j'arrive | 9:02am"
    : "moi: salut ça va ? | 17 fév, 9:00am\neux: ouais et toi | 9:01am\neux: t'as vu le truc | 9:01am";
  const apply = (mode) => {
    const parsed = parseComposerLines(txt, isGroup, tab);
    if(!parsed.length) return;
    onApply(parsed, mode);
    setTxt(""); setOpen(false);
  };
  return (
    <div style={{marginTop:8}}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{background:"rgba(99,102,241,0.07)",border:"1px solid rgba(99,102,241,0.25)",color:"#4f46e5",borderRadius:6,padding:"5px 12px",cursor:"pointer",fontSize:11,fontWeight:600}}>
        ✎ Composer / coller un échange
      </button>
      {open && (
        <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:8,background:"rgba(99,102,241,0.04)",border:"1px solid rgba(99,102,241,0.15)",borderRadius:8,padding:10}}>
          <textarea value={txt} onChange={e=>setTxt(e.target.value)} rows={7} placeholder={placeholder}
            className="adm-input" style={{background:"rgba(255,255,255,0.9)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a1a2e",padding:"8px 12px",fontSize:12,borderRadius:8,resize:"vertical",fontFamily:"monospace"}}/>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button onClick={()=>apply("replace")}
              style={{background:"#4f46e5",border:"none",color:"#fff",borderRadius:6,padding:"6px 14px",cursor:"pointer",fontSize:11,fontWeight:600}}>↻ Remplacer le fil</button>
            <button onClick={()=>apply("append")}
              style={{background:"#fff",border:"1px solid #4f46e5",color:"#4f46e5",borderRadius:6,padding:"6px 14px",cursor:"pointer",fontSize:11,fontWeight:600}}>+ Ajouter à la fin</button>
          </div>
          <div style={{fontSize:10,color:"#6b7280",lineHeight:1.8,background:"rgba(0,0,0,0.03)",borderRadius:6,padding:"8px 10px"}}>
            <strong>Format :</strong> <code>expéditeur: texte | date+heure</code> — une ligne par message.<br/>
            <strong>Expéditeurs :</strong> {isGroup ? "glinda, eoghan, drew, elias, moi" : "moi, eux"}<br/>
            <strong>Formats de date+heure acceptés :</strong><br/>
            &nbsp;• <code>17 fév, 9:00am</code> — format complet (jour mois, heure)<br/>
            &nbsp;• <code>9:01am</code> — heure seule → hérite du jour du message précédent<br/>
            &nbsp;• <code>17/02/12</code> — format DD/MM/YY (anciens échanges)<br/>
            &nbsp;• Si omis, le message reçoit l'horodatage "maintenant"
          </div>
        </div>
      )}
    </div>
  );
};

const CHASSIS_SAMSUNG = "/assets/seed/f80942059727883a2caa615abcb4c5e1.svg";
// Reusable move buttons component for list reordering
const MoveButtons = ({index, length, onMoveUp, onMoveDown}) => (
  <div style={{display:"flex",gap:2}}>
    <button onClick={onMoveUp} disabled={index===0} style={{background:"none",border:"none",color:index===0?"#d1d5db":"#6b7280",cursor:index===0?"default":"pointer",fontSize:12,padding:"2px 4px",opacity:index===0?0.5:1}}>⬆️</button>
    <button onClick={onMoveDown} disabled={index===length-1} style={{background:"none",border:"none",color:index===length-1?"#d1d5db":"#6b7280",cursor:index===length-1?"default":"pointer",fontSize:12,padding:"2px 4px",opacity:index===length-1?0.5:1}}>⬇️</button>
  </div>
);

// Composant stable pour une ligne de track musicale — en dehors de AdminBackoffice pour éviter
// la recréation des nœuds DOM (et donc la perte de l'event handler onChange) à chaque render.
const MusicTrackRow = ({track, index, total, onCoverChange, onFieldChange, onMoveUp, onMoveDown, onDelete}) => (
  <div className="adm-card" style={{display:"flex",gap:8,alignItems:"center",background:"rgba(255,255,255,0.85)",padding:10,borderRadius:10,border:"1px solid rgba(0,0,0,0.07)",flexWrap:"wrap"}}>
    <label style={{width:40,height:40,borderRadius:6,background:"rgba(99,102,241,0.08)",border:"1px dashed rgba(99,102,241,0.3)",overflow:"hidden",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
      {track.cover
        ? <img src={track.cover} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        : <span style={{fontSize:16}}>🎵</span>}
      <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
        const f=e.target.files?.[0]; if(!f) return;
        onCoverChange(f); e.target.value="";
      }}/>
    </label>
    <input value={track.title||""} onChange={e=>onFieldChange("title",e.target.value)}
      placeholder="Titre" className="adm-input" style={{flex:2,background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a1a2e",padding:"7px 10px",fontSize:12,borderRadius:7}}/>
    <input value={track.artist||""} onChange={e=>onFieldChange("artist",e.target.value)}
      placeholder="Artiste" className="adm-input" style={{flex:2,background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#6b7280",padding:"7px 10px",fontSize:12,borderRadius:7}}/>
    <input value={track.album||""} onChange={e=>onFieldChange("album",e.target.value)}
      placeholder="Album" className="adm-input" style={{flex:2,background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#6b7280",padding:"7px 10px",fontSize:12,borderRadius:7}}/>
    <input value={track.duration||""} onChange={e=>onFieldChange("duration",e.target.value)}
      placeholder="3:00" className="adm-input" style={{width:60,background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#6b7280",padding:"7px 8px",fontSize:11,borderRadius:7}}/>
    <MoveButtons index={index} length={total} onMoveUp={onMoveUp} onMoveDown={onMoveDown}/>
    <button onClick={onDelete} className="adm-del-btn" style={{background:"none",border:"none",color:"#d1d5db",cursor:"pointer",fontSize:16,padding:"2px 6px",borderRadius:5,transition:"all 0.15s"}}>×</button>
  </div>
);

// Apps with dedicated admin sections — utilisée pour la sidebar ET pour choisir
// la section d'ouverture par défaut de l'admin (la première par ordre alphabétique).
const APP_SECTIONS = {
  messages:   {icon:"💬", label:"Messages"},
  phone:      {icon:"📞", label:"Téléphone"},   // Regroupe appels + contacts + messages vocaux
  notes:      {icon:"📝", label:"Notes"},
  gallery:    {icon:"🖼", label:"Galerie"},
  photos:     {icon:"🖼", label:"Galerie"},   // iOS alias → même section "gallery"
  music:      {icon:"🎵", label:"Musique"},
  twitter:    {icon:"🐦", label:"Twitter"},
  pinterest:  {icon:"📌", label:"Pinterest"},
  browser:    {icon:"🌐", label:"Navigateur"},
  safari:     {icon:"🌐", label:"Navigateur"},
  snapchat:   {icon:"👻", label:"Snapchat"},
  grindr:     {icon:"🟡", label:"Grindr"},
  tumblr:     {icon:"📓", label:"Tumblr"},
  reddit:     {icon:"👽", label:"Reddit"},
  calendar:   {icon:"📅", label:"Calendrier"},
  weather:    {icon:"🌤", label:"Météo"},
  settings:   {icon:"⚙️", label:"Réglages"},
  wikipedia:  {icon:"📖", label:"Wikipedia"},
  kindle:     {icon:"📚", label:"Kindle"},
  vpn:        {icon:"🔐", label:"VPN"},
  inaturalist:{icon:"🔬", label:"iNaturalist"},
  soundcloud: {icon:"🎧", label:"SoundCloud"},
  nikeplus:   {icon:"👟", label:"Nike+"},
  shazam:     {icon:"🎵", label:"Shazam"},
  groupme:    {icon:"💬", label:"GroupMe"},
  gmail:      {icon:"✉️", label:"Mails"},
  mail:       {icon:"✉️", label:"Mails"},
  facebook:   {icon:"📘", label:"Facebook"},
  files:      {icon:"📁", label:"Fichiers"},
  insta:      {icon:"📷", label:"Instagram"},
};

// L'app "Téléphone" regroupe désormais Appels, Contacts et Messages vocaux dans un seul onglet admin.
const expandAppSections = (id) => {
  // "phone", "contacts" → tous redirigés vers l'onglet fusionné "phone"
  if(id==="phone" || id==="contacts") return [{key:"phone", ...APP_SECTIONS.phone}];
  const key = id==="photos" ? "gallery" : id==="gmail" ? "mail" : id==="safari" ? "browser" : id;
  return APP_SECTIONS[key] ? [{key, ...APP_SECTIONS[key]}] : [];
};

// Calcule la première section admin disponible (triée alphabétiquement) pour un perso donné.
// Utilisée pour ouvrir l'admin directement sur la bonne section, sans flash sur une valeur fixe.
const firstAppSectionKey = (charData) => {
  const installedApps = [...new Set([...(charData?.apps||[]), ...(charData?.dock||[])])];
  const sections = installedApps
    .flatMap(expandAppSections)
    .filter((s,i,a) => a.findIndex(x=>x.key===s.key)===i)
    .sort((a,b) => a.label.localeCompare(b.label, "fr"));
  return sections[0]?.key || "messages";
};

// ─── IMPORT JSON (additif uniquement) ───────────────────────────────────────────
// Permet d'importer le contenu d'un export JSON (ex: une sauvegarde Firebase) catégorie par
// catégorie, sans jamais écraser ce qui existe déjà : pour chaque catégorie choisie, on calcule
// la liste actuelle la plus fraîche (dataRef), on ne garde du JSON importé que les items qui n'y
// sont pas déjà (dédupliqués via `dedup`), et on les AJOUTE à la liste actuelle (jamais de
// remplacement intégral). Mêmes principes anti-écrasement que le fix appliqué plus haut sur
// Facebook/Twitter/Tumblr/Instagram.
// scope "shared"  → un seul tableau dans sharedThreads, visible par les 4 persos.
// scope "perChar" → un tableau séparé pour chacun des 4 persos (glinda/eoghan/drew/elias).
const IMPORT_DEFS = [
  { id:"fb_shared", app:"facebook", appLabel:"📘 Facebook", label:"Fil d'amis partagé (posts)", scope:"shared",
    getList: (obj) => obj?.sharedThreads?._sharedFacebookPosts || [],
    writeKey: "_sharedFacebookPosts",
    dedup: (p) => p.id ?? `${p.author||p.name}|${p.time}|${p.text}` },
  { id:"fb_pages", app:"facebook", appLabel:"📘 Facebook", label:"Pages suivies (par perso)", scope:"perChar",
    getList: (obj, ck) => obj?.[ck]?.facebookPages?.[ck] || [],
    applyChar: (fresh, ck, merged) => ({...fresh, facebookPages:{...(fresh.facebookPages||{}), [ck]:merged}}),
    dedup: (p) => `${p.name}|${p.time}|${p.text}` },

  { id:"tw_shared", app:"twitter", appLabel:"🐦 Twitter", label:"Tweets partagés", scope:"shared",
    getList: (obj) => obj?.sharedThreads?._sharedTweets || [],
    writeKey: "_sharedTweets",
    dedup: (p) => p.id ?? `${p.author}|${p.time}|${p.text}` },
  { id:"tw_common_extra", app:"twitter", appLabel:"🐦 Twitter", label:"Comptes communs ajoutés", scope:"shared",
    getList: (obj) => obj?.sharedThreads?._sharedTwitterAccountsExtra || [],
    writeKey: "_sharedTwitterAccountsExtra",
    dedup: (p) => p.key ?? p.h },
  { id:"tw_home", app:"twitter", appLabel:"🐦 Twitter", label:"Timeline déco (par perso)", scope:"perChar",
    getList: (obj, ck) => obj?.[ck]?.homeBaseTweets || [],
    applyChar: (fresh, ck, merged) => ({...fresh, homeBaseTweets: merged}),
    dedup: (p) => p.id ?? `${p.h}|${p.time}|${p.text}` },
  { id:"tw_specific_extra", app:"twitter", appLabel:"🐦 Twitter", label:"Comptes suivis spécifiques (par perso)", scope:"perChar",
    getList: (obj, ck) => obj?.[ck]?.twitterAccountsExtra || [],
    applyChar: (fresh, ck, merged) => ({...fresh, twitterAccountsExtra: merged}),
    dedup: (p) => p.key ?? p.h },

  { id:"tb_shared", app:"tumblr", appLabel:"📓 Tumblr", label:"Posts partagés", scope:"shared",
    getList: (obj) => obj?.sharedThreads?._sharedTumblrPosts || [],
    writeKey: "_sharedTumblrPosts",
    dedup: (p) => p.id ?? `${p.username||p.author}|${p.date}|${p.body}` },
  { id:"tb_feed", app:"tumblr", appLabel:"📓 Tumblr", label:"Fil décoratif (par perso)", scope:"perChar",
    getList: (obj, ck) => obj?.[ck]?.tumblr?.feedPosts || [],
    applyChar: (fresh, ck, merged) => ({...fresh, tumblr:{...(fresh.tumblr||{}), feedPosts:merged}}),
    dedup: (p) => p.id ?? `${p.username}|${p.date}|${p.body}` },

  { id:"ig_shared", app:"insta", appLabel:"📷 Instagram", label:"Fil partagé", scope:"shared",
    getList: (obj) => obj?.sharedThreads?._sharedInstaPosts || [],
    writeKey: "_sharedInstaPosts",
    dedup: (p) => p.id ?? `${p.author}|${p.date}|${p.caption}` },
  { id:"ig_grid", app:"insta", appLabel:"📷 Instagram", label:"Grille perso (par perso)", scope:"perChar",
    getList: (obj, ck) => obj?.[ck]?.instagram?.posts || [],
    applyChar: (fresh, ck, merged) => ({...fresh, instagram:{...(fresh.instagram||{}), posts:merged}}),
    dedup: (p) => p.id ?? `${p.date}|${p.caption}` },
];
const IMPORT_CHAR_KEYS = ["glinda","eoghan","drew","elias"];

// Calcule, pour un JSON importé et l'état live (dataRef.current), la liste des catégories trouvées
// avec leur nombre d'items et le nombre d'items réellement NOUVEAUX (pas déjà présents en live).
const scanImportJson = (parsed, liveData) => IMPORT_DEFS.map(def => {
  if(def.scope==="shared") {
    const incoming = def.getList(parsed) || [];
    const current  = def.getList(liveData) || [];
    const currentKeys = new Set(current.map(def.dedup));
    const newItems = incoming.filter(it => !currentKeys.has(def.dedup(it)));
    return {...def, incomingCount: incoming.length, newCount: newItems.length, newItems};
  }
  const perChar = IMPORT_CHAR_KEYS.map(ck => {
    const incoming = def.getList(parsed, ck) || [];
    const current  = def.getList(liveData, ck) || [];
    const currentKeys = new Set(current.map(def.dedup));
    const newItems = incoming.filter(it => !currentKeys.has(def.dedup(it)));
    return {ck, incomingCount: incoming.length, newCount: newItems.length, newItems};
  });
  return {...def, incomingCount: perChar.reduce((s,p)=>s+p.incomingCount,0),
    newCount: perChar.reduce((s,p)=>s+p.newCount,0), perChar};
});

// Bouton "+" entre deux messages pour en insérer un nouveau à cette position
// Décale une chaîne de temps lore ("17 fév, 9:00am") de ±delta minutes.
// Utilisé pour que déplacer un message dans l'admin ajuste automatiquement son
// heure d'une minute, évitant que le tri annule immédiatement le déplacement.
const LORE_MONTHS_IDX = {jan:1,fév:2,mar:3,avr:4,mai:5,juin:6,juil:7,'aoû':8,sep:9,oct:10,nov:11,'déc':12};
const LORE_MONTHS_OUT = ['','jan','fév','mar','avr','mai','juin','juil','aoû','sep','oct','nov','déc'];
const shiftLoreTime = (str, deltaMin) => {
  const p = parseLoreTime(str);
  if(!p) return str; // format non reconnu, on ne touche pas
  const DAYS_IN_MONTH = [0,31,29,31,30,31,30,31,31,30,31,30,31]; // 2012 est bissextile
  let totalMin = (p.month*60*24*31) + ((p.day||1)*60*24) + ((p.hour||0)*60) + (p.min||0) + deltaMin;
  // Reconstruire day/month depuis totalMin (approximation suffisante pour ±1 min)
  let min  = ((totalMin % 60) + 60) % 60;
  let hrs  = Math.floor(totalMin / 60);
  let hour = ((hrs % 24) + 24) % 24;
  let days = Math.floor(hrs / 24);
  let month = ((Math.floor(days / 31) % 12) + 12) % 12 || 12; // approx
  let day   = (days % 31) || 1;
  if(day < 1) { day = 1; } if(day > 28) day = Math.min(day, DAYS_IN_MONTH[month]||28);
  const period = hour < 12 ? 'am' : 'pm';
  const h12    = hour % 12 === 0 ? 12 : hour % 12;
  return `${day} ${LORE_MONTHS_OUT[month]}, ${h12}:${String(min).padStart(2,'0')}${period}`;
};

const InsertMsgBtn = ({onClick}) => (
  <div style={{display:"flex",alignItems:"center",gap:6,margin:"2px 0",opacity:0.6,transition:"opacity 0.15s"}}
    onMouseEnter={e=>e.currentTarget.style.opacity="1"}
    onMouseLeave={e=>e.currentTarget.style.opacity="0.6"}>
    <div style={{flex:1,height:1,background:"rgba(99,102,241,0.2)"}}/>
    <button onClick={onClick} style={{
      background:"rgba(99,102,241,0.1)",border:"1px dashed rgba(99,102,241,0.4)",color:"#6366f1",
      borderRadius:20,width:26,height:26,cursor:"pointer",fontSize:15,display:"flex",
      alignItems:"center",justifyContent:"center",flexShrink:0,padding:0,lineHeight:1,
    }}>+</button>
    <div style={{flex:1,height:1,background:"rgba(99,102,241,0.2)"}}/>
  </div>
);
// Boutons fléchés haut/bas pour déplacer un message dans la liste triée
const MsgMoveBtn = ({dir, onClick, disabled}) => (
  <button onClick={onClick} disabled={disabled} style={{
    background:"none",border:"1px solid rgba(0,0,0,0.12)",borderRadius:4,
    width:20,height:20,cursor:disabled?"default":"pointer",
    color:disabled?"#d1d5db":"#6366f1",fontSize:9,
    display:"flex",alignItems:"center",justifyContent:"center",padding:0,flexShrink:0,
  }}>
    <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor">
      {dir==="up" ? <path d="M5 1L9 9H1z"/> : <path d="M5 9L1 1H9z"/>}
    </svg>
  </button>
);

const AdminBackoffice = ({data, onUpdate, onUpdateShared=()=>{}, onExit, loreDate, onLoreDateChange}) => {
  const [tab, setTab]         = useState("glinda");
  const [openPlaylistAdmin, setOpenPlaylistAdmin] = useState(null);
  const [spotifyLinkByPl, setSpotifyLinkByPl] = useState({});
  const [spotifyStatusByPl, setSpotifyStatusByPl] = useState({});
  // Toujours à jour, contrairement à `data`/`d` qui sont figés dans la closure du render en cours.
  // Indispensable pour les callbacks asynchrones (upload d'image) : par le temps que l'upload
  // termine, `data` a pu changer (autre champ modifié, sync Firebase...) — lire dataRef.current
  // au moment d'écrire évite d'écraser ces changements avec une version périmée.
  const dataRef = useRef(data);
  useEffect(()=>{ dataRef.current = data; }, [data]);
  // ── Musique : auto-fix des ids de pistes manquants ──────────────────────────
  // AVANT : ce correctif tournait DANS le rendu lui-même (un setTimeout posé à chaque passage du
  // bloc "case music", pas dans un useEffect). À chaque re-render où needsId était vrai, ça posait
  // une NOUVELLE écriture Firebase en plus de celles déjà en vol — y compris juste après un upload
  // de pochette, dont l'écriture pouvait se faire écraser par cette écriture concurrente basée sur
  // un état pas encore à jour. Classique anti-pattern "effet de bord pendant le rendu".
  // APRÈS : un vrai useEffect, qui ne se déclenche qu'après le commit, une seule fois par changement
  // réel de `tab` ou de la musique du perso courant — plus de course avec les autres écritures.
  useEffect(()=>{
    const freshChar = dataRef.current[tab] || {};
    const freshMusic = freshChar.music || [];
    if(freshMusic.length > 0 && freshMusic.some(t=>!t.id)) {
      const fixed = freshMusic.map((t,j)=>t.id?t:{...t,id:Date.now()+j});
      onUpdate(tab, {...freshChar, music: fixed});
    }
  }, [tab, data[tab]?.music]);
  // ── Import JSON (additif) ──────────────────────────────────────────────────
  const [importOpen, setImportOpen]     = useState(false);
  const [restoreOpen, setRestoreOpen]   = useState(false);
  const [exportOpen, setExportOpen]     = useState(false);
  const [snapshots, setSnapshots]       = useState([]);
  const [restoreStatus, setRestoreStatus] = useState(null);
  // Options d'export : scope (all | perso), contenu (full | textOnly | imagesOnly), et perso ciblé
  const [exportScope, setExportScope]   = useState("all");     // "all" | "char"
  const [exportChar, setExportChar]     = useState("glinda");  // clé du perso si scope=char
  const [exportContent, setExportContent] = useState("full"); // "full" | "text" | "images"

  // Filtrage du contenu selon le mode d'export
  const IMG_FIELDS = new Set(["avatar","playlistCover","wallpaper","lockWallpaper","cover"]);
  const isBase64 = v => typeof v === "string" && v.startsWith("data:");

  const stripImages = (obj) => {
    if(Array.isArray(obj)) return obj.map(stripImages);
    if(obj && typeof obj === "object") {
      return Object.fromEntries(Object.entries(obj).map(([k,v]) => [k, isBase64(v) ? null : stripImages(v)]));
    }
    return obj;
  };
  const keepOnlyImages = (obj) => {
    if(Array.isArray(obj)) return obj.map(keepOnlyImages);
    if(obj && typeof obj === "object") {
      return Object.fromEntries(Object.entries(obj).map(([k,v]) => [k, isBase64(v) ? v : typeof v==="object"&&v!==null ? keepOnlyImages(v) : null]));
    }
    return obj;
  };

  const doExport = () => {
    const raw = dataRef.current;
    let payload;
    if(exportScope === "char") {
      const ck = exportChar;
      payload = { [ck]: raw[ck], sharedThreads: raw.sharedThreads };
    } else {
      payload = raw;
    }
    let final;
    if(exportContent === "text")   final = stripImages(payload);
    else if(exportContent === "images") final = keepOnlyImages(payload);
    else final = payload;

    const json = JSON.stringify(final, null, 2);
    const blob = new Blob([json], {type:"application/json"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    const charLabel = exportScope==="char" ? `_${exportChar}` : "";
    const contentLabel = exportContent==="text"?"_texte":exportContent==="images"?"_images":"";
    const d = new Date();
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    a.href = url;
    a.download = `it-welcome-to-uma${charLabel}${contentLabel}_${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  }; // null | "loading" | "done" | "error"
  const openRestorePanel = async () => {
    setRestoreOpen(true); setRestoreStatus("loading"); setSnapshots([]);
    if (!firebaseDb) { setRestoreStatus("error"); return; }
    try {
      let unsub;
      unsub = onValue(ref(firebaseDb, "_snapshots"), s => {
        if (unsub) unsub();
        const val = s.val() || {};
        const list = Object.entries(val)
          .map(([ts, snap]) => ({ts, label: snap.label, data: snap.data}))
          .sort((a,b) => b.ts - a.ts); // plus récent en premier
        setSnapshots(list);
        setRestoreStatus(list.length ? null : "empty");
      });
    } catch(e) { setRestoreStatus("error"); }
  };
  const doRestore = async (snap) => {
    if (!firebaseDb || !snap.data) return;
    if (!window.confirm(`Restaurer l'état du ${snap.label} ?\nToutes les données actuelles seront remplacées.`)) return;
    setRestoreStatus("loading");
    try {
      await set(ref(firebaseDb), snap.data);
      setRestoreOpen(false); setRestoreStatus(null);
    } catch(e) { setRestoreStatus("error"); }
  };

  // ── Migration des images base64 restantes vers Supabase Storage ─────────────
  // Certaines images (anciens uploads tombés en fallback avant que Supabase soit configuré/actif)
  // sont encore stockées en base64 dans Firebase — lourdes, et responsables des erreurs
  // "Write too large". Cet outil les retrouve toutes, les upload vers Supabase, et ne renvoie
  // à Firebase que les URLs obtenues (courtes), via un patch multi-chemins ciblé — sans jamais
  // réécrire le reste des données.
  const [migrateOpen, setMigrateOpen]     = useState(false);
  const [migrateStatus, setMigrateStatus] = useState(null); // null | {running,total,done,failed} | {done:true,...}
  const runMigration = async () => {
    if (!supabaseClient) { setMigrateStatus({done:true, total:0, migrated:0, failed:0, error:"Supabase n'est pas configuré."}); return; }
    if (!firebaseDb) { setMigrateStatus({done:true, total:0, migrated:0, failed:0, error:"Firebase n'est pas connecté."}); return; }
    const found = findBase64Images(dataRef.current);
    if (found.length === 0) { setMigrateStatus({done:true, total:0, migrated:0, failed:0}); return; }
    setMigrateStatus({running:true, total:found.length, done:0, failed:0});
    const fbPatch = {};
    let migrated = 0, failed = 0;
    for (const item of found) {
      try {
        const blob = dataUriToBlob(item.value);
        const url = await uploadBlobToSupabase(blob);
        if (url) { fbPatch[item.path] = url; migrated++; }
        else failed++;
      } catch(e) { failed++; }
      setMigrateStatus(s => ({...(s||{}), running:true, total:found.length, done:migrated+failed, failed}));
    }
    if (Object.keys(fbPatch).length > 0) {
      try { await update(ref(firebaseDb), fbPatch); }
      catch(e) { setMigrateStatus({done:true, total:found.length, migrated, failed, error:"Écriture Firebase échouée : "+e.message}); return; }
    }
    setMigrateStatus({done:true, total:found.length, migrated, failed});
  };
  const [importParsed, setImportParsed] = useState(null);
  const [importError, setImportError]   = useState(null);
  const [importFileName, setImportFileName] = useState("");
  const [importSelectedApps, setImportSelectedApps] = useState(new Set()); // appLabel cochés au niveau app
  const [importSelected, setImportSelected] = useState(new Set()); // ids des IMPORT_DEFS cochés
  const [importDone, setImportDone]     = useState(null);
  const importScan = importParsed ? scanImportJson(importParsed, dataRef.current) : [];
  // Calcule les ids sélectionnés en croisant filtre app + sélection fine par catégorie
  const importEffectiveSelected = new Set(
    [...importSelected].filter(id => {
      const def = IMPORT_DEFS.find(d => d.id === id);
      return def && importSelectedApps.has(def.appLabel);
    })
  );
  const toggleImportApp = (appLabel, defs) => {
    const allIds = defs.map(d => d.id);
    const allOn  = allIds.every(id => importSelected.has(id));
    const nextSel  = new Set(importSelected);
    const nextApps = new Set(importSelectedApps);
    if(allOn) {
      allIds.forEach(id => nextSel.delete(id));
      nextApps.delete(appLabel);
    } else {
      allIds.filter(id => defs.find(d=>d.id===id)?.newCount > 0).forEach(id => nextSel.add(id));
      nextApps.add(appLabel);
    }
    setImportSelected(nextSel);
    setImportSelectedApps(nextApps);
  };
  const resetImport = () => { setImportParsed(null); setImportError(null); setImportFileName(""); setImportSelected(new Set()); setImportSelectedApps(new Set()); setImportDone(null); };
  const handleImportFile = (file) => {
    setImportDone(null); setImportError(null); setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        setImportParsed(parsed);
        // Pré-cocher uniquement les catégories qui contiennent au moins un item nouveau
        const scan = scanImportJson(parsed, dataRef.current);
        const newIds = new Set(scan.filter(s=>s.newCount>0).map(s=>s.id));
        setImportSelected(newIds);
        // Pré-cocher les apps correspondantes
        setImportSelectedApps(new Set(IMPORT_DEFS.filter(d=>newIds.has(d.id)).map(d=>d.appLabel)));
      } catch (e) {
        setImportError("Fichier JSON invalide ou illisible : " + e.message);
        setImportParsed(null);
      }
    };
    reader.onerror = () => setImportError("Impossible de lire ce fichier.");
    reader.readAsText(file);
  };
  const runImport = () => {
    const fresh = dataRef.current;
    let added = 0, skipped = 0;
    const charPatches = {};
    importScan.forEach(def => {
      if(!importEffectiveSelected.has(def.id)) return;
      if(def.scope==="shared") {
        const current = def.getList(fresh) || [];
        const currentKeys = new Set(current.map(def.dedup));
        const toAdd = def.newItems.filter(it => !currentKeys.has(def.dedup(it)));
        if(toAdd.length===0) return;
        onUpdate(def.writeKey, [...toAdd, ...current]);
        added += toAdd.length;
        skipped += def.incomingCount - toAdd.length;
      } else {
        def.perChar.forEach(({ck, newItems, incomingCount}) => {
          if(newItems.length===0) { skipped += incomingCount; return; }
          const freshChar = charPatches[ck] || fresh[ck] || {};
          const current = def.getList({[ck]: freshChar}, ck) || [];
          const currentKeys = new Set(current.map(def.dedup));
          const toAdd = newItems.filter(it => !currentKeys.has(def.dedup(it)));
          if(toAdd.length===0) { skipped += incomingCount; return; }
          charPatches[ck] = def.applyChar(freshChar, ck, [...toAdd, ...current]);
          added += toAdd.length;
          skipped += incomingCount - toAdd.length;
        });
      }
    });
    Object.entries(charPatches).forEach(([ck, patch]) => onUpdate(ck, patch));
    setImportDone({added, skipped});
    setImportSelected(new Set());
    setImportSelectedApps(new Set());
  };
  const [section, setSection] = useState(()=>firstAppSectionKey(data?.glinda));
  const [saved, setSaved]     = useState(false);
  const [cropSrc, setCropSrc] = useState(null);
  const [cropTarget, setCropTarget] = useState(null);
  const [cropRatio, setCropRatio] = useState(1);
  const [customAppName, setCustomAppName] = useState("");
  // Set of conv keys currently expanded in the messages admin panel
  const [openConvs, setOpenConvs] = useState(new Set());
  const toggleConv = (key) => setOpenConvs(prev => { const n=new Set(prev); n.has(key)?n.delete(key):n.add(key); return n; });
  const [grindrOpenDms, setGrindrOpenDms] = useState(new Set());
  const toggleGrindrDm = (id) => setGrindrOpenDms(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  const [msgAdminTab, setMsgAdminTab] = useState("inbox"); // "inbox" | "deleted"
  const [mailAdmTab, setMailAdmTab] = useState("inbox"); // "inbox" | "drafts" | "deleted"
  const [twTab, setTwTab] = useState("users"); // "users" | "shared" | "tweets"
  const [tbTab, setTbTab] = useState("users"); // "users" | "shared" | "feed"
  const [igTab, setIgTab] = useState("profile"); // "profile" | "posts"
  // Posts Instagram repliés par défaut (plus pratique pour scroller la liste) — un Set d'ids
  // "ouverts" par section ; vide au départ = tout fermé. Réutilisé par les 3 listes (grille,
  // fil partagé, comptes déco).
  const [igPostsOpen, setIgPostsOpen] = useState(()=>new Set());
  const [igFeedOpen,  setIgFeedOpen]  = useState(()=>new Set());
  const [igDecoOpen,  setIgDecoOpen]  = useState(()=>new Set());
  const [twTweetsOpen, setTwTweetsOpen] = useState(()=>new Set());
  const [fbPagesOpen,  setFbPagesOpen]  = useState(()=>new Set());
  const [tbFeedOpen,   setTbFeedOpen]   = useState(()=>new Set());
  const [mailOpen,     setMailOpen]     = useState(()=>new Set());
  const [eventsOpen,   setEventsOpen]   = useState(()=>new Set());
  const toggleInSet = (setFn) => (id) => setFn(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  // Tri anti-chronologique (plus récent en premier) basé sur le format de date lore. Les dates non
  // reconnues (ex: anciens posts "Oct 2012" sans jour précis) retombent en bas plutôt que de planter.
  const igDateKey = (dateStr) => {
    const p = parseLoreTime(dateStr);
    return p ? p.month*44640 + p.day*1440 + (p.hour||0)*60 + (p.min||0) : -Infinity;
  };
  const sortIgDesc = (list) => [...list].sort((a,b)=>igDateKey(b.date)-igDateKey(a.date));
  const [fbTab, setFbTab] = useState("users"); // "users" | "shared" | "pages"
  const [phoneSubTab, setPhoneSubTab] = useState("calls"); // "calls" | "contacts" | "voicemail"
  const [grindrTab, setGrindrTab] = useState("grid"); // "grid" | "dms" | "profile"
  const [galSection, setGalSection] = useState("roll"); // "roll" | "deleted" | "albums"
  const [calCollapsedSet, setCalCollapsedSet] = useState(new Set()); // jours du calendrier explicitement OUVERTS (fermé par défaut)
  const [isMobile, setIsMobile] = useState(() => document.documentElement.clientWidth < 700);
  const [burgerOpen, setBurgerOpen] = useState(false);
  const [isNarrow, setIsNarrow] = useState(() => document.documentElement.clientWidth < 500);
  const adminRootRef = React.useRef(null);
  useEffect(() => {
    const check = () => {
      const w = document.documentElement.clientWidth;
      setIsMobile(w < 700);
      setIsNarrow(w < 500);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(document.documentElement);
    window.addEventListener("resize", check);
    return () => { ro.disconnect(); window.removeEventListener("resize", check); };
  }, []);

  const char = CHARACTERS.find(c=>c.key===tab);
  const d    = data[tab];
  const upd  = (key, val) => {
    // FIX CRITIQUE : avant, upd utilisait `{...d, [key]:val}` où `d = data[tab]` est une
    // copie figée au dernier rendu. Si on fait plusieurs modifications dans la même session
    // admin (ex: ajouter des messages PUIS uploader une photo de galerie), chaque appel à
    // upd écrase tout l'objet du perso avec une version qui ne contient que les changements
    // faits AVANT le dernier rendu — effaçant silencieusement tout ce qui a été ajouté
    // entre-temps. C'est exactement la même classe de bug que celui corrigé en mai sur
    // Facebook/Twitter/Tumblr, mais upd() elle-même n'avait jamais été corrigée.
    // Fix : on lit toujours depuis dataRef.current[tab] (maintenu à jour en continu par
    // useEffect, indépendamment des re-renders) au moment de l'écriture.
    const freshChar = dataRef.current[tab] || {};
    onUpdate(tab, {...freshChar, [key]:val});
    if(key==="avatar") onUpdate("_sharedAvatars", {...(dataRef.current.sharedThreads?._sharedAvatars||{}), [tab]: val});
  };

  const save = () => { setSaved(true); setTimeout(()=>setSaved(false), 2000); };

  // ── Date lore ─────────────────────────────────────────────────────────────

  const sectionBtn = (s, label) => (
    <button onClick={()=>setSection(s)} style={{padding:"6px 14px",border:"none",background:section===s?"#ffc107":"#1e1e1e",color:section===s?"#000":"#888",cursor:"pointer",fontSize:11,fontWeight:section===s?700:400,borderRadius:0,whiteSpace:"nowrap"}}>
      {label}
    </button>
  );

  // ── Field helpers ──────────────────────────────────────────────────────────
  const row = {display:"flex",gap:14,flexWrap:"wrap"};

  // ── Sections ───────────────────────────────────────────────────────────────
  const renderSection = () => {
    switch(section) {

    case "groupme": return (
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {(()=>{
          const isCustom = (d.groupmeGroups||[]).length > 0;
          const effective = isCustom ? (d.groupmeGroups||[]) : GROUPME_DEFAULTS;
          const updList = (newList) => upd("groupmeGroups", newList);
          const ensureCustom = (i, patch) => {
            if(isCustom) { updList(effective.map((g,j)=>j===i?{...g,...patch}:g)); }
            else { updList(GROUPME_DEFAULTS.map((g,j)=>j===i?{...g,...patch,id:Date.now()+j}:{...g,id:Date.now()+j})); }
          };
          const GM="#00AFF0";
          return (<>
                        {effective.map((g,i)=>(
              <div key={g.id??i} className="adm-card" style={{background:"rgba(255,255,255,0.9)",borderRadius:10,padding:"10px 12px",border:"1px solid rgba(0,0,0,0.07)",display:"flex",flexDirection:"column",gap:6}}>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                  <Field label="Nom du groupe" value={g.name||""} onChange={v=>ensureCustom(i,{name:v})} style={{flex:1}}/>
                  <Field label="Membres" value={String(g.members||0)} onChange={v=>ensureCustom(i,{members:parseInt(v)||0})} width="70px"/>
                  <Field label="Heure" value={g.time||""} onChange={v=>ensureCustom(i,{time:v})} width="70px"/>
                  <Field label="Non-lus" value={String(g.n||0)} onChange={v=>ensureCustom(i,{n:parseInt(v)||0})} width="60px"/>
                  <button onClick={()=>updList(effective.filter((_,j)=>j!==i).map((g,j)=>({...g,id:Date.now()+j})))} style={{background:"none",border:"none",color:"#d1d5db",cursor:"pointer",fontSize:16,padding:"0 4px",marginTop:18}}>×</button>
                </div>
                <Field label="Dernier message" value={g.last||""} onChange={v=>ensureCustom(i,{last:v})}/>
              </div>
            ))}
            <button onClick={()=>updList([...effective.map((g,j)=>isCustom?g:{...g,id:Date.now()+j}),{id:Date.now(),name:"",last:"",time:"",n:0,members:0}])}
              style={{background:"rgba(0,175,240,0.08)",border:"1px dashed rgba(0,175,240,0.35)",color:GM,borderRadius:8,padding:"10px 18px",cursor:"pointer",fontSize:12,fontWeight:600}}>+ Groupe</button>
          </>);
        })()}
      </div>
    );

        case "soundcloud": return (
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {(()=>{
          const sc = d.soundcloud || {};
          const updSC = (k,v) => upd("soundcloud", {...sc, [k]:v});
          const tracks = sc.tracks || [];
          return (<>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:4}}>
              <Field label="Handle"      value={sc.handle||""}      onChange={v=>updSC("handle",v)}/>
              <Field label="Nom affiché" value={sc.displayName||""} onChange={v=>updSC("displayName",v)}/>
              <Field label="Followers"   value={String(sc.followers||0)} onChange={v=>updSC("followers",parseInt(v)||0)} width="90px"/>
              <Field label="Following"   value={String(sc.following||0)} onChange={v=>updSC("following",parseInt(v)||0)} width="90px"/>
            </div>
            <div style={{fontSize:11,fontWeight:600,color:"#374151",marginBottom:4}}>Tracks</div>
            {tracks.map((tr,i)=>(
              <div key={tr.id??i} className="adm-card" style={{background:"rgba(255,255,255,0.85)",borderRadius:10,padding:"10px 12px",border:"1px solid rgba(0,0,0,0.07)",display:"flex",flexDirection:"column",gap:6}}>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <Field label="Titre" value={tr.title||""} onChange={v=>{const t=[...tracks];t[i]={...t[i],title:v};updSC("tracks",t);}} style={{flex:1}}/>
                  <Field label="Durée" value={tr.dur||""} onChange={v=>{const t=[...tracks];t[i]={...t[i],dur:v};updSC("tracks",t);}} width="64px"/>
                  <Field label="Tag" value={tr.tag||""} onChange={v=>{const t=[...tracks];t[i]={...t[i],tag:v};updSC("tracks",t);}} width="120px"/>
                  <button onClick={()=>updSC("tracks",tracks.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:"#d1d5db",cursor:"pointer",fontSize:16,padding:"0 4px",marginTop:18}}>×</button>
                </div>
                <Field label="Description" value={tr.desc||""} onChange={v=>{const t=[...tracks];t[i]={...t[i],desc:v};updSC("tracks",t);}} textarea/>
                <div style={{display:"flex",gap:6}}>
                  <Field label="▶ Plays" value={String(tr.plays||0)} onChange={v=>{const t=[...tracks];t[i]={...t[i],plays:parseInt(v)||0};updSC("tracks",t);}} width="80px"/>
                  <Field label="❤ Likes" value={String(tr.likes||0)} onChange={v=>{const t=[...tracks];t[i]={...t[i],likes:parseInt(v)||0};updSC("tracks",t);}} width="80px"/>
                  <Field label="🔁 Reposts" value={String(tr.reposts||0)} onChange={v=>{const t=[...tracks];t[i]={...t[i],reposts:parseInt(v)||0};updSC("tracks",t);}} width="80px"/>
                  <Field label="Date" value={tr.posted||""} onChange={v=>{const t=[...tracks];t[i]={...t[i],posted:v};updSC("tracks",t);}} width="100px"/>
                </div>
              </div>
            ))}
            <button onClick={()=>updSC("tracks",[...tracks,{id:Date.now(),title:"",dur:"0:00",tag:"",desc:"",plays:0,likes:0,reposts:0,posted:"aujourd'hui",wave:[],comments:[]}])}
              style={{background:"rgba(242,111,33,0.08)",border:"1px dashed rgba(242,111,33,0.4)",color:"#f26f21",borderRadius:8,padding:"10px 18px",cursor:"pointer",fontSize:12,fontWeight:600}}>+ Track</button>
          </>);
        })()}
      </div>
    );

    case "nikeplus": return (
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {(()=>{
          const nk = d.nikeplus || {};
          const upNK = (k,v) => upd("nikeplus", {...nk, [k]:v});
          const runs = nk.runs || [];
          return (<>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:4}}>
              <Field label="Total km" value={String(nk.totalKm||0)} onChange={v=>upNK("totalKm",parseFloat(v)||0)} width="90px"/>
              <Field label="Objectif km" value={String(nk.goalKm||0)} onChange={v=>upNK("goalKm",parseFloat(v)||0)} width="90px"/>
              <Field label="Streak (jours)" value={String(nk.streak||0)} onChange={v=>upNK("streak",parseInt(v)||0)} width="90px"/>
              <Field label="Niveau" value={nk.level||""} onChange={v=>upNK("level",v)} width="80px"/>
            </div>
            <div style={{fontSize:11,fontWeight:600,color:"#374151",marginBottom:4}}>Sorties</div>
            {runs.map((run,i)=>(
              <div key={run.id??i} className="adm-card" style={{background:"rgba(255,255,255,0.85)",borderRadius:10,padding:"10px 12px",border:"1px solid rgba(0,0,0,0.07)",display:"flex",flexDirection:"column",gap:6}}>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                  <Field label="Distance" value={run.distance||""} onChange={v=>{const r=[...runs];r[i]={...r[i],distance:v};upNK("runs",r);}} width="90px"/>
                  <Field label="Date" value={run.date||""} onChange={v=>{const r=[...runs];r[i]={...r[i],date:v};upNK("runs",r);}} width="90px"/>
                  <Field label="Durée" value={run.time||""} onChange={v=>{const r=[...runs];r[i]={...r[i],time:v};upNK("runs",r);}} width="80px"/>
                  <Field label="Allure" value={run.pace||""} onChange={v=>{const r=[...runs];r[i]={...r[i],pace:v};upNK("runs",r);}} width="90px"/>
                  <Field label="Cal" value={String(run.cal||0)} onChange={v=>{const r=[...runs];r[i]={...r[i],cal:parseInt(v)||0};upNK("runs",r);}} width="60px"/>
                  <button onClick={()=>upNK("runs",runs.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:"#d1d5db",cursor:"pointer",fontSize:16,padding:"0 4px",marginTop:18}}>×</button>
                </div>
                <Field label="Note" value={run.note||""} onChange={v=>{const r=[...runs];r[i]={...r[i],note:v};upNK("runs",r);}} textarea/>
              </div>
            ))}
            <button onClick={()=>upNK("runs",[...runs,{id:Date.now(),distance:"",date:"",time:"",pace:"",cal:0,route:"",note:""}])}
              style={{background:"rgba(192,57,43,0.08)",border:"1px dashed rgba(192,57,43,0.35)",color:"#c0392b",borderRadius:8,padding:"10px 18px",cursor:"pointer",fontSize:12,fontWeight:600}}>+ Sortie</button>
          </>);
        })()}
      </div>
    );

    case "shazam": return (
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        <div style={{fontSize:11,color:"#9ca3af",marginBottom:4}}>Historique Shazam.</div>
        {(d.shazam||[]).map((s,i)=>(
          <div key={i} className="adm-card" style={{display:"flex",gap:8,alignItems:"center",background:"rgba(255,255,255,0.85)",padding:"8px 10px",borderRadius:10,border:"1px solid rgba(0,0,0,0.07)",flexWrap:"wrap"}}>
            <Field label="Titre" value={s.title||""} onChange={v=>{const sh=[...d.shazam];sh[i]={...sh[i],title:v};upd("shazam",sh);}}/>
            <Field label="Artiste" value={s.artist||""} onChange={v=>{const sh=[...d.shazam];sh[i]={...sh[i],artist:v};upd("shazam",sh);}} width="140px"/>
            <Field label="Date" value={s.date||""} onChange={v=>{const sh=[...d.shazam];sh[i]={...sh[i],date:v};upd("shazam",sh);}} width="90px"/>
            <button onClick={()=>upd("shazam",(d.shazam||[]).filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:"#d1d5db",cursor:"pointer",fontSize:16,padding:"0 4px"}}>×</button>
          </div>
        ))}
        <button onClick={()=>upd("shazam",[...(d.shazam||[]),{title:"",artist:"",date:"1 oct"}])}
          style={{background:"rgba(29,161,242,0.08)",border:"1px dashed rgba(29,161,242,0.35)",color:"#0a84ff",borderRadius:8,padding:"10px 18px",cursor:"pointer",fontSize:12,fontWeight:600}}>+ Shazam</button>
      </div>
    );

        case "apparence": return (
      <div style={{display:"flex",flexDirection:"column",gap:18}}>

        <div style={{display:"flex",gap:14,flexWrap:"wrap",alignItems:"flex-end"}}>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            <label style={{color:"#9ca3af",fontSize:10,letterSpacing:0.8,fontWeight:600,textTransform:"uppercase"}}>Couleur accent</label>
            <input type="color" value={d.accentColor||"#888"} onChange={e=>upd("accentColor",e.target.value)}
              style={{width:44,height:34,padding:0,border:"1px solid rgba(0,0,0,0.1)",borderRadius:6,background:"none",cursor:"pointer"}}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            <label style={{color:"#9ca3af",fontSize:10,letterSpacing:0.8,fontWeight:600,textTransform:"uppercase"}}>Châssis</label>
            <select value={d.phoneColor||"black"} onChange={e=>upd("phoneColor",e.target.value)}
              className="adm-input" style={{background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a1a2e",padding:"7px 10px",fontSize:12,borderRadius:8}}>
              <option value="black">Black</option>
              <option value="white">White</option>
            </select>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            <label style={{color:"#9ca3af",fontSize:10,letterSpacing:0.8,fontWeight:600,textTransform:"uppercase"}}>Wallpaper</label>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              {d.wallpaper?.startsWith("#") || !d.wallpaper
                ? <input type="color" value={d.wallpaper?.startsWith("#")?d.wallpaper:"#000000"}
                    onChange={e=>upd("wallpaper",e.target.value)}
                    style={{width:44,height:34,padding:0,border:"1px solid rgba(0,0,0,0.1)",borderRadius:6,background:"none",cursor:"pointer"}}/>
                : <div style={{width:44,height:34,borderRadius:6,overflow:"hidden",border:"1px solid rgba(0,0,0,0.1)"}}>
                    <img src={d.wallpaper} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  </div>}
              <label style={{background:"rgba(99,102,241,0.08)",border:"1px dashed rgba(99,102,241,0.35)",color:"#6366f1",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:11,fontWeight:600}}>
                📁 Image<input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new UploadReader();r.onload=ev=>upd("wallpaper",ev.target.result);r.readAsDataURL(f);}}/>
              </label>
              {d.wallpaper&&!d.wallpaper.startsWith("#")&&<button onClick={()=>upd("wallpaper","#000000")} style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:18,padding:"0 4px"}}>×</button>}
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            <label style={{color:"#9ca3af",fontSize:10,letterSpacing:0.8,fontWeight:600,textTransform:"uppercase"}}>Avatar</label>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              {d.avatar&&<img src={d.avatar} style={{width:34,height:34,borderRadius:"50%",objectFit:"cover",border:"1px solid rgba(0,0,0,0.1)"}}/>}
              <label style={{background:"rgba(99,102,241,0.08)",border:"1px dashed rgba(99,102,241,0.35)",color:"#6366f1",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:11,fontWeight:600}}>
                {d.avatar?"🔄":"📁"}<input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new UploadReader();r.onload=ev=>upd("avatar",ev.target.result);r.readAsDataURL(f);}}/>
              </label>
              {d.avatar&&<button onClick={()=>upd("avatar",null)} style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:18,padding:"0 4px"}}>×</button>}
            </div>
          </div>
        </div>

        <div style={{borderTop:"1px solid rgba(0,0,0,0.07)",paddingTop:16}}>
          <div style={{fontSize:12,fontWeight:700,color:"#374151",marginBottom:12}}>📱 Châssis PNG personnalisé</div>
          <div style={{display:"flex",gap:12,alignItems:"flex-start",flexWrap:"wrap"}}>
            <div style={{width:72,height:144,background:"#f3f4f6",border:"1px solid rgba(0,0,0,0.1)",borderRadius:8,overflow:"hidden",position:"relative",flexShrink:0}}>
              {d.chassisPng
                ?<img src={d.chassisPng} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"contain"}}/>
                :<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#ccc",fontSize:22}}>📱</div>}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <label style={{background:"rgba(99,102,241,0.08)",border:"1px dashed rgba(99,102,241,0.35)",color:"#6366f1",borderRadius:8,padding:"8px 14px",cursor:"pointer",fontSize:11,fontWeight:600}}>
                {d.chassisPng?"🔄 Change":"📂 Import PNG"}
                <input type="file" accept="image/png,image/webp" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new UploadReader();r.onload=ev=>upd("chassisPng",ev.target.result);r.readAsDataURL(f);e.target.value="";}}/>
              </label>
              {d.chassisPng&&<button onClick={()=>upd("chassisPng",null)} style={{background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:11}}>✕ Supprimer</button>}
            </div>
            {d.chassisPng&&<div style={{display:"flex",flexDirection:"column",gap:8,flex:1,minWidth:200}}>
              <div style={{color:"#9ca3af",fontSize:11}}>Calibration — aligne l'écran avec la fenêtre du PNG</div>
              {[["top","Haut",d.screenInset?.top??76],["bottom","Bas",d.screenInset?.bottom??82],["left","Gauche",d.screenInset?.left??10],["right","Droite",d.screenInset?.right??10]].map(([k,label,val])=>(
                <div key={k} style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{color:"#6b7280",fontSize:11,width:50,flexShrink:0}}>{label}</span>
                  <input type="range" min={0} max={250} value={val}
                    onChange={e=>upd("screenInset",{...(d.screenInset||{top:76,bottom:82,left:10,right:10}),[k]:parseInt(e.target.value)})}
                    style={{flex:1,accentColor:charColor}}/>
                  <input type="number" value={val}
                    onChange={e=>upd("screenInset",{...(d.screenInset||{top:76,bottom:82,left:10,right:10}),[k]:parseInt(e.target.value)||0})}
                    className="adm-input" style={{width:46,background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a1a2e",padding:"4px 6px",fontSize:11,borderRadius:6,textAlign:"center"}}/>
                </div>
              ))}
              <button onClick={()=>upd("screenInset",{top:76,bottom:82,left:10,right:10})}
                style={{background:"rgba(0,0,0,0.04)",border:"1px solid rgba(0,0,0,0.1)",color:"#6b7280",borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:11,alignSelf:"flex-start"}}>↺ Reset</button>
            </div>}
          </div>
        </div>
      </div>
    );

    case "photos_profil": {
      const CHARS_PROF = [
        {key:"glinda", label:"Glinda 🌸", color:"#e91e8c"},
        {key:"eoghan", label:"Eoghan 🌈", color:"#00d435"},
        {key:"drew",   label:"Drew 🪱",   color:"#aa6caa"},
        {key:"elias",  label:"Elias 👽",  color:"#6672d0"},
      ];
      return (
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{fontSize:11,color:"#9ca3af",lineHeight:1.5}}>
            La photo uploadée ici s'applique comme photo de profil par défaut sur tous les réseaux sociaux qui n'en ont pas de spécifique (Instagram, Twitter, Facebook, Snapchat, Grindr…).
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:16}}>
            {CHARS_PROF.map(({key:ck, label:cl, color:cc})=>{
              const cd = data[ck] || {};
              const av = cd.avatar;
              const updChar = (val) => {
                onUpdate(ck, {...cd, avatar: val});
                // Sync dans _sharedAvatars pour Tumblr etc.
                onUpdate("_sharedAvatars", {...(data.sharedThreads?._sharedAvatars||{}), [ck]: val});
              };
              return (
                <div key={ck} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10,padding:"16px 20px",background:"rgba(255,255,255,0.85)",borderRadius:12,border:`2px solid ${cc}33`,minWidth:140,flex:"1 1 140px",maxWidth:220}}>
                  {/* Avatar preview */}
                  <div style={{width:72,height:72,borderRadius:"50%",overflow:"hidden",border:`3px solid ${cc}`,background:"#e5e5ea",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,position:"relative"}}>
                    {av
                      ? <img src={av} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                      : <span style={{fontSize:28}}>{cl.split(" ")[1]}</span>
                    }
                  </div>
                  <div style={{fontSize:12,fontWeight:700,color:"#374151"}}>{cl.split(" ")[0]}</div>
                  <div style={{display:"flex",flexDirection:"column",gap:6,width:"100%"}}>
                    <label style={{background:`${cc}11`,border:`1px dashed ${cc}88`,color:cc,borderRadius:8,padding:"7px 10px",cursor:"pointer",fontSize:11,fontWeight:600,textAlign:"center",display:"block"}}>
                      {av?"🔄 Changer":"📁 Uploader"}
                      <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new UploadReader();r.onload=ev=>updChar(ev.target.result);r.readAsDataURL(f);e.target.value="";}}/>
                    </label>
                    {av&&<button onClick={()=>updChar(null)} style={{background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",borderRadius:8,padding:"5px 10px",cursor:"pointer",fontSize:11}}>✕ Supprimer</button>}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{fontSize:10,color:"#d1d5db",lineHeight:1.4,marginTop:4}}>
            💡 Si une app a déjà une photo propre (ex: SoundCloud, photo de profil Grindr…), elle garde la sienne. L'avatar global ne remplace que les espaces vides.
          </div>
        </div>
      );
    }

    case "messages": {
      const CHARS = [
        {key:"glinda", label:"Glinda"},
        {key:"eoghan", label:"Eoghan"},
        {key:"drew",   label:"Drew"},
        {key:"elias",  label:"Elias"},
      ].filter(c=>c.key!==tab);

      const duplicateTo = (msg, targetKey) => {
        const targetData = data[targetKey];
        const mirrorThread = msg.thread.map(m=>({...m, from: m.from==="me"?"them":"me"}));
        const newConv = {
          id: Date.now(),
          contact: char.label + (tab==="glinda"?" 🌸":tab==="eoghan"?" ☆":tab==="drew"?" 🪱":" 🖤"),
          thread: mirrorThread,
        };
        onUpdate(targetKey, {...targetData, messages:[newConv, ...(targetData.messages||[])]});
      };

      const inboxMsgs  = (d.messages||[]).filter(m=>!m.isGroup && !m.deleted);
      const deletedMsgs = (d.messages||[]).filter(m=>!m.isGroup && m.deleted);
      const visibleMsgs = msgAdminTab==="inbox" ? inboxMsgs : deletedMsgs;

      const toggleDeleted = (msg) => {
        upd("messages", d.messages.map(m=>m===msg ? {...m, deleted:!m.deleted} : m));
      };

      return (
      <div style={{display:"flex",flexDirection:"column",gap:16}}>

        {/* ── Tab switcher inbox / supprimés ── */}
        <div className="adm-subtabs" style={{display:"flex",gap:0,background:"rgba(0,0,0,0.05)",borderRadius:10,padding:3,alignSelf:"stretch"}}>
          {[["inbox","📥 Boîte de réception",inboxMsgs.length],["deleted","🗑 Supprimés récemment",deletedMsgs.length]].map(([key,label,count])=>(
            <button key={key} onClick={()=>setMsgAdminTab(key)} style={{
              flex:1,padding:"10px 16px",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:msgAdminTab===key?700:400,
              background:msgAdminTab===key?"#fff":"transparent",
              color:msgAdminTab===key?charColor:"#6b7280",
              boxShadow:msgAdminTab===key?"0 1px 3px rgba(0,0,0,0.1)":"none",
              transition:"all 0.15s",
              display:"flex",alignItems:"center",justifyContent:"center",gap:6,
            }}>
              {label}
              <span style={{
                background:msgAdminTab===key?charColor+"22":"rgba(0,0,0,0.08)",
                color:msgAdminTab===key?charColor:"#9ca3af",
                borderRadius:10,padding:"2px 8px",fontSize:11,fontWeight:700,
              }}>{count}</span>
            </button>
          ))}
        </div>

        {/* ── Groupes de ce perso ───────────────────────────────── */}
        {(()=>{
          const myGroups = (d.messages||[]).filter(m=>m.isGroup && (msgAdminTab==="inbox" ? !m.deleted : !!m.deleted));
          if(myGroups.length===0) return null;
          return (
            <div style={{background:"rgba(99,102,241,0.04)",border:"1px solid rgba(99,102,241,0.12)",borderRadius:10,padding:"12px 14px",display:"flex",flexDirection:"column",gap:8}}>
              <div style={{fontSize:11,fontWeight:700,color:"#6366f1",letterSpacing:0.5}}>💬 Groupes</div>
              {myGroups.map(gMsg=>{
                const gid = gMsg.sharedThreadId;
                const meta = gid ? (data.groupMeta?.[gid]||{name:gMsg.contact,members:[]}) : {name:gMsg.contact, members:[]};
                const isSharedGroup = !!gid;
                const gKey = "g_" + (gid||gMsg.id);
                const gOpen = openConvs.has(gKey);
                const threadLen = gid ? (data.sharedThreads?.[gid]||[]).length : (gMsg.thread||[]).length;
                return (
                  <div key={gid||gMsg.id} style={{background:"#fff",borderRadius:8,border:"1px solid rgba(0,0,0,0.07)",overflow:"hidden"}}>
                    {/* ── Header toggle ── */}
                    <div onClick={()=>toggleConv(gKey)} style={{display:"flex",gap:10,alignItems:"center",padding:"12px 14px",cursor:"pointer",userSelect:"none",minHeight:48}}>
                      <span style={{fontSize:18,transition:"transform 0.15s",display:"inline-block",transform:gOpen?"rotate(90deg)":"rotate(0deg)",color:"#9ca3af",flexShrink:0,lineHeight:1,width:20,textAlign:"center"}}>›</span>
                      <span style={{fontSize:13}}>👥</span>
                      {isSharedGroup ? (
                        <input value={meta.name||""} onChange={e=>{
                          const newMeta={...(dataRef.current.groupMeta||{}),[gid]:{...meta,name:e.target.value}};
                          onUpdate("groupMeta",newMeta);
                          // Sync le nom dans tous les messages de tous les persos
                          ['glinda','eoghan','drew','elias'].forEach(k=>{
                            const kd=data[k];if(!kd)return;
                            const updated=kd.messages.map(m=>m.sharedThreadId===gid?{...m,contact:e.target.value}:m);
                            onUpdate(k,{...kd,messages:updated});
                          });
                        }} className="adm-input" placeholder="Nom du groupe"
                          style={{flex:1,background:"rgba(255,255,255,0.9)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a1a2e",padding:"5px 9px",fontSize:12,borderRadius:7,fontWeight:600}}/>
                      ) : (
                        <input value={gMsg.contact||""} onClick={e=>e.stopPropagation()}
                          onChange={e=>{
                            upd("messages", d.messages.map(m=>m===gMsg ? {...m, contact:e.target.value} : m));
                          }}
                          className="adm-input" style={{flex:1,background:"transparent",border:"none",color:"#374151",padding:"2px 0",fontSize:12,fontWeight:600,outline:"none",minWidth:0}}
                          placeholder="Nom du groupe"/>
                      )}
                      <span style={{fontSize:10,color:"#9ca3af",flexShrink:0,marginLeft:"auto"}}>{threadLen} msg</span>
                    </div>
                    {gOpen && isSharedGroup && (
                      <div style={{padding:"0 12px 12px",display:"flex",flexDirection:"column",gap:8,borderTop:"1px solid rgba(0,0,0,0.05)"}}>
                      <div style={{display:"flex",flexDirection:"column",gap:4,paddingTop:10}}>
                        <div style={{fontSize:10,color:"#9ca3af",fontWeight:600,letterSpacing:0.5,textTransform:"uppercase"}}>Membres</div>
                        <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
                          {Object.entries(CHAR_NAMES).map(([k,label])=>{
                            const isMember = (meta.members||[]).includes(k);
                            const CHAR_COLORS={glinda:"#e91e8c",eoghan:"#00d435",drew:"#aa6caa",elias:"#6672d0"};
                            return (
                              <button key={k} onClick={()=>{
                                const cur=meta.members||[];
                                const next=isMember?cur.filter(m=>m!==k):[...cur,k];
                                const newMeta={...(dataRef.current.groupMeta||{}),[gid]:{...meta,members:next}};
                                onUpdate("groupMeta",newMeta);
                                // Ajouter/retirer la conv groupe du perso
                                const kd=data[k];if(!kd)return;
                                if(!isMember){
                                  if(!(kd.messages||[]).some(m=>m.sharedThreadId===gid)){
                                    onUpdate(k,{...kd,messages:[{id:Date.now(),contact:meta.name||gMsg.contact,sharedThreadId:gid,isGroup:true,unread:false,thread:[]},...(kd.messages||[])]});
                                  }
                                } else {
                                  onUpdate(k,{...kd,messages:(kd.messages||[]).filter(m=>m.sharedThreadId!==gid)});
                                }
                              }} style={{
                                padding:"4px 10px",borderRadius:20,border:"1px solid "+(CHAR_COLORS[k]||"#6366f1")+(isMember?"":"44"),
                                background:isMember?CHAR_COLORS[k]+"18":"transparent",
                                color:isMember?CHAR_COLORS[k]:"#9ca3af",
                                fontSize:11,fontWeight:isMember?700:400,cursor:"pointer",
                              }}>{label} {isMember?"✓":"+"}
                              </button>
                            );
                          })}
                          {/* Membres externes (non-persos principaux) */}
                          {(meta.members||[]).filter(m=>!CHAR_NAMES[m]).map(extMember=>(
                            <span key={extMember} style={{padding:"4px 10px",borderRadius:20,background:"rgba(0,0,0,0.06)",color:"#555",fontSize:11,display:"flex",alignItems:"center",gap:4}}>
                              {extMember}
                              <button onClick={()=>{
                                const next=(meta.members||[]).filter(m=>m!==extMember);
                                const newMeta={...(dataRef.current.groupMeta||{}),[gid]:{...meta,members:next}};
                                onUpdate("groupMeta",newMeta);
                              }} style={{background:"none",border:"none",color:"#999",cursor:"pointer",fontSize:12,padding:0,lineHeight:1}}>×</button>
                            </span>
                          ))}
                          {/* Ajouter membre externe */}
                          <input placeholder="+ membre custom…" onKeyDown={e=>{
                            if(e.key==="Enter"&&e.target.value.trim()){
                              const newMember=e.target.value.trim();
                              const next=[...(meta.members||[]),newMember];
                              const newMeta={...(dataRef.current.groupMeta||{}),[gid]:{...meta,members:next}};
                              onUpdate("groupMeta",newMeta);
                              e.target.value="";
                            }
                          }} className="adm-input" style={{background:"rgba(255,255,255,0.8)",border:"1px dashed rgba(0,0,0,0.15)",color:"#555",padding:"4px 9px",fontSize:11,borderRadius:20,width:130}}/>
                        </div>
                      </div>
                      </div>
                    )}
                    {/* ── Éditeur de messages du groupe ── */}
                    {gOpen && isSharedGroup && (()=>{
                      const CHAR_COLORS={glinda:"#e91e8c",eoghan:"#00d435",drew:"#aa6caa",elias:"#6672d0"};
                      const allMembers = meta.members||[];
                      const thread = dataRef.current.sharedThreads?.[gid]||[];
                      // Tri chronologique croissant pour affichage — le tableau écrit en retour suit cet ordre,
                      // Firebase stocke donc toujours les messages dans l'ordre chronologique.
                      const sortedThread = [...thread].sort((a,b)=>loreSortKey(a.time)-loreSortKey(b.time));
                      const writeThread = (t) => onUpdate(gid, t);
                      const senderOptions = allMembers.map(m=>({
                        key:m, label:CHAR_NAMES[m]||m, color:CHAR_COLORS[m]||"#6366f1"
                      }));
                      const defaultSender = allMembers[0]||"glinda";
                      const insertAt = (si) => {
                        const prev = sortedThread[si-1];
                        const next = sortedThread[si];
                        const time = next?.time || prev?.time || "maintenant";
                        const t=[...sortedThread];
                        t.splice(si,0,{from:defaultSender,senderKey:defaultSender,senderName:CHAR_NAMES[defaultSender]||defaultSender,text:"",time});
                        writeThread(t);
                      };
                      return (
                        <div style={{borderTop:"1px solid rgba(0,0,0,0.06)",paddingTop:8,marginTop:4,display:"flex",flexDirection:"column",gap:0}}>
                          <div style={{fontSize:10,color:"#9ca3af",fontWeight:600,letterSpacing:0.5,textTransform:"uppercase",marginBottom:6}}>Messages ({sortedThread.length}) — triés par date</div>
                          <InsertMsgBtn onClick={()=>insertAt(0)}/>
                          {sortedThread.map((m2,si)=>{
                            const mc=CHAR_COLORS[m2.from]||"#6366f1";
                            const updMsg = (patch) => {
                              const t=[...sortedThread]; t[si]={...t[si],...patch}; writeThread(t);
                            };
                            return (
                            <React.Fragment key={si}>
                            <div style={{display:"flex",flexDirection:"column",gap:4,background:"rgba(0,0,0,0.02)",borderRadius:8,padding:"8px 10px",border:"1px solid rgba(0,0,0,0.05)"}}>
                              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                                <div style={{display:"flex",flexDirection:"column",gap:2,flexShrink:0}}>
                                  <MsgMoveBtn dir="up" disabled={si===0} onClick={()=>{const t=[...sortedThread];[t[si-1],t[si]]=[t[si],t[si-1]];t[si]={...t[si],time:shiftLoreTime(t[si].time,-1)};writeThread(t);}}/>
                                  <MsgMoveBtn dir="down" disabled={si===sortedThread.length-1} onClick={()=>{const t=[...sortedThread];[t[si+1],t[si]]=[t[si],t[si+1]];t[si]={...t[si],time:shiftLoreTime(t[si].time,+1)};writeThread(t);}}/>
                                </div>
                                <select value={m2.from} onChange={e=>updMsg({from:e.target.value,senderKey:e.target.value,senderName:CHAR_NAMES[e.target.value]||e.target.value})}
                                  className="adm-input" style={{background:mc+"14",border:"1px solid "+mc+"55",color:mc,padding:"4px 5px",fontSize:10,borderRadius:6,flexShrink:0,fontWeight:700,minWidth:74}}>
                                  {senderOptions.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
                                </select>
                                <div style={{flex:1}}><LoreDateTimeInput value={m2.time||""} onChange={v=>updMsg({time:v})} width="100%" showLabel={false}/></div>
                                <button onClick={()=>{const t=[...sortedThread];t.splice(si,1);writeThread(t);}}
                                  className="adm-del-btn" style={{background:"none",border:"none",color:"#d1d5db",cursor:"pointer",fontSize:16,padding:"0 4px",flexShrink:0}}>×</button>
                              </div>
                              <textarea value={m2.text} onChange={e=>updMsg({text:e.target.value})}
                                rows={Math.max(1,Math.ceil((m2.text||"").length/40))}
                                className="adm-input" style={{width:"100%",resize:"vertical",background:"rgba(255,255,255,0.9)",border:"1px solid rgba(0,0,0,0.08)",color:"#1a1a2e",padding:"6px 10px",fontSize:12,borderRadius:6,lineHeight:1.4,minHeight:36,boxSizing:"border-box"}}/>
                            </div>
                            <InsertMsgBtn onClick={()=>insertAt(si+1)}/>
                            </React.Fragment>
                          )})}
                          <button onClick={()=>writeThread([...sortedThread,{from:defaultSender,senderKey:defaultSender,senderName:CHAR_NAMES[defaultSender]||defaultSender,text:"",time:"maintenant"}])}
                            style={{background:"rgba(0,0,0,0.03)",border:"1px dashed rgba(0,0,0,0.12)",color:"#9ca3af",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:10,alignSelf:"flex-start",marginTop:4}}>+ message</button>
                        </div>
                      );
                    })()}
                    {/* ── Éditeur de messages du groupe — groupe LOCAL (pas de sharedThreadId) ── */}
                    {gOpen && !isSharedGroup && (()=>{
                      const rawLocal = gMsg.thread||[];
                      const sortedLocal = [...rawLocal].sort((a,b)=>loreSortKey(a.time)-loreSortKey(b.time));
                      const writeLocal = (t) => upd("messages", d.messages.map(m=>m===gMsg ? {...m, thread:t} : m));
                      const insertAt = (si) => {
                        const prev=sortedLocal[si-1]; const next=sortedLocal[si];
                        const time=next?.time||prev?.time||"maintenant";
                        const t=[...sortedLocal]; t.splice(si,0,{from:"them",senderName:"",senderKey:"",text:"",time}); writeLocal(t);
                      };
                      return (
                        <div style={{padding:"0 12px 12px",display:"flex",flexDirection:"column",gap:0,borderTop:"1px solid rgba(0,0,0,0.05)"}}>
                          <div style={{fontSize:10,color:"#9ca3af",fontWeight:600,letterSpacing:0.5,textTransform:"uppercase",marginTop:10,marginBottom:6}}>Messages ({sortedLocal.length}) — triés par date</div>
                          <InsertMsgBtn onClick={()=>insertAt(0)}/>
                          {sortedLocal.map((m2,si)=>{
                            const isMe = m2.from==="me";
                            const mc = isMe ? charColor : "#6b7280";
                            const updMsg = (patch) => { const t=[...sortedLocal]; t[si]={...t[si],...patch}; writeLocal(t); };
                            return (
                            <React.Fragment key={si}>
                            <div style={{display:"flex",flexDirection:"column",gap:4,background:"rgba(0,0,0,0.02)",borderRadius:8,padding:"8px 10px",border:"1px solid rgba(0,0,0,0.05)"}}>
                              <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                                <div style={{display:"flex",flexDirection:"column",gap:2,flexShrink:0}}>
                                  <MsgMoveBtn dir="up" disabled={si===0} onClick={()=>{const t=[...sortedLocal];[t[si-1],t[si]]=[t[si],t[si-1]];t[si]={...t[si],time:shiftLoreTime(t[si].time,-1)};writeLocal(t);}}/>
                                  <MsgMoveBtn dir="down" disabled={si===sortedLocal.length-1} onClick={()=>{const t=[...sortedLocal];[t[si+1],t[si]]=[t[si],t[si+1]];t[si]={...t[si],time:shiftLoreTime(t[si].time,+1)};writeLocal(t);}}/>
                                </div>
                                <select value={m2.from} onChange={e=>updMsg({from:e.target.value})}
                                  className="adm-input" style={{background:mc+"14",border:"1px solid "+mc+"55",color:mc,padding:"4px 5px",fontSize:10,borderRadius:6,flexShrink:0,fontWeight:700,minWidth:64}}>
                                  <option value="me">{char?.label}</option>
                                  <option value="them">Eux</option>
                                </select>
                                {!isMe && (
                                  <input value={m2.senderName||""} placeholder="Nom" onChange={e=>updMsg({senderName:e.target.value,senderKey:(e.target.value||"").toLowerCase()})}
                                    className="adm-input" style={{width:80,background:"rgba(255,255,255,0.9)",border:"1px solid rgba(0,0,0,0.08)",color:"#1a1a2e",padding:"4px 6px",fontSize:10,borderRadius:6,flexShrink:0}}/>
                                )}
                                <div style={{flex:1,minWidth:120}}><LoreDateTimeInput value={m2.time||""} onChange={v=>updMsg({time:v})} width="100%" showLabel={false}/></div>
                                <button onClick={()=>{const t=[...sortedLocal];t.splice(si,1);writeLocal(t);}}
                                  className="adm-del-btn" style={{background:"none",border:"none",color:"#d1d5db",cursor:"pointer",fontSize:16,padding:"0 4px",flexShrink:0}}>×</button>
                              </div>
                              <textarea value={m2.text} onChange={e=>updMsg({text:e.target.value})}
                                rows={Math.max(1,Math.ceil((m2.text||"").length/40))}
                                className="adm-input" style={{width:"100%",resize:"vertical",background:"rgba(255,255,255,0.9)",border:"1px solid rgba(0,0,0,0.08)",color:"#1a1a2e",padding:"6px 10px",fontSize:12,borderRadius:6,lineHeight:1.4,minHeight:36,boxSizing:"border-box"}}/>
                            </div>
                            <InsertMsgBtn onClick={()=>insertAt(si+1)}/>
                            </React.Fragment>
                          )})}
                          <button onClick={()=>writeLocal([...sortedLocal,{from:"them",senderName:"",senderKey:"",text:"",time:"maintenant"}])}
                            style={{background:"rgba(0,0,0,0.03)",border:"1px dashed rgba(0,0,0,0.12)",color:"#9ca3af",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:10,alignSelf:"flex-start",marginTop:4}}>+ message</button>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
              {/* Créer un nouveau groupe partagé */}
              <button onClick={()=>{
                const gid="group_"+Date.now();
                const defaultMembers=[tab];
                onUpdate(gid,[]);
                const newMeta={...(dataRef.current.groupMeta||{}),[gid]:{name:"Nouveau groupe",members:defaultMembers}};
                onUpdate("groupMeta",newMeta);
                upd("messages",[{id:Date.now(),contact:"Nouveau groupe",sharedThreadId:gid,isGroup:true,unread:false,thread:[]},...(d.messages||[])]);
              }} style={{background:"rgba(99,102,241,0.07)",border:"1px dashed rgba(99,102,241,0.35)",color:"#6366f1",borderRadius:8,padding:"8px 14px",cursor:"pointer",fontSize:11,fontWeight:600,alignSelf:"flex-start"}}>
                + Créer un nouveau groupe
              </button>
            </div>
          );
        })()}

        {/* ── Conversations 1-à-1 ───────────────────────────────── */}
        {visibleMsgs.map((msg,i)=>{
          const cKey = "c_" + tab + "_" + msg.id + "_" + i;
          const cOpen = openConvs.has(cKey);
          const threadLen = msg.sharedThreadId
            ? (data.sharedThreads?.[msg.sharedThreadId]||[]).length
            : (msg.thread||[]).length;
          const preview = (() => {
            const t = msg.sharedThreadId
              ? (data.sharedThreads?.[msg.sharedThreadId]||[])
              : (msg.thread||[]);
            const last = t[t.length-1];
            return last ? last.text.slice(0,40)+(last.text.length>40?"...":"") : "";
          })();
          return (
          <div key={cKey} className="adm-card" style={{background:"rgba(255,255,255,0.85)",borderRadius:12,border:"1px solid rgba(0,0,0,0.07)",boxShadow:"0 2px 8px rgba(0,0,0,0.04)",overflow:"hidden"}}>
            {/* ── Header toggle ── */}
            <div style={{display:"flex",gap:8,alignItems:"center",padding:"10px 14px",cursor:"pointer",userSelect:"none",minHeight:44,WebkitTapHighlightColor:"transparent"}}
              onClick={()=>toggleConv(cKey)}>
              {/* Reorder arrows */}
              <div style={{display:"flex",flexDirection:"column",gap:2,flexShrink:0}} onClick={e=>e.stopPropagation()}>
                <button onClick={()=>{
                  const all=[...d.messages];const ni=all.indexOf(msg);
                  if(ni===0)return;[all[ni-1],all[ni]]=[all[ni],all[ni-1]];upd("messages",all);
                }} style={{background:"none",border:"1px solid rgba(0,0,0,0.1)",borderRadius:4,width:18,height:18,cursor:"pointer",color:"#6366f1",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",padding:0}}><svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor"><path d="M5 1L9 9H1z"/></svg></button>
                <button onClick={()=>{
                  const all=[...d.messages];const ni=all.indexOf(msg);
                  if(ni===all.length-1)return;[all[ni+1],all[ni]]=[all[ni],all[ni+1]];upd("messages",all);
                }} style={{background:"none",border:"1px solid rgba(0,0,0,0.1)",borderRadius:4,width:18,height:18,cursor:"pointer",color:"#6366f1",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",padding:0}}><svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor"><path d="M5 9L1 1H9z"/></svg></button>
              </div>
              {/* Contact name — editable inline, stop propagation so click doesn't toggle */}
              <input value={msg.contact} onClick={e=>e.stopPropagation()}
                onChange={v=>{const m=[...d.messages];const ni=m.indexOf(msg);m[ni]={...m[ni],contact:v.target.value};upd("messages",m);}}
                className="adm-input" style={{flex:1,background:"transparent",border:"none",color:"#1a1a2e",padding:"2px 0",fontSize:13,fontWeight:600,outline:"none",minWidth:0}}/>
              {!cOpen && preview && (
                <span style={{fontSize:11,color:"#9ca3af",flex:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",minWidth:0}}>{preview}</span>
              )}
              <span style={{fontSize:10,color:"#9ca3af",flexShrink:0,whiteSpace:"nowrap"}}>{threadLen} msg</span>
              <AdminChevron open={cOpen}/>
              {/* Move between inbox / deleted */}
              <button onClick={e=>{e.stopPropagation();toggleDeleted(msg);}}
                title={msg.deleted ? "Restaurer dans la boîte de réception" : "Déplacer vers Supprimés récemment"}
                style={{
                  background:msg.deleted?"rgba(16,185,129,0.1)":"rgba(239,68,68,0.08)",
                  border:`1px solid ${msg.deleted?"rgba(16,185,129,0.3)":"rgba(239,68,68,0.2)"}`,
                  color:msg.deleted?"#059669":"#ef4444",
                  borderRadius:6,padding:"3px 7px",cursor:"pointer",fontSize:11,flexShrink:0,lineHeight:1,
                }}>{msg.deleted ? "↩ Inbox" : "🗑 Suppr."}</button>
              <button onClick={e=>{e.stopPropagation();upd("messages",d.messages.filter(m=>m!==msg));}}
                className="adm-del-btn" style={{background:"none",border:"none",color:"#d1d5db",cursor:"pointer",fontSize:16,padding:"0 2px",flexShrink:0,lineHeight:1,transition:"all 0.15s"}}>✕</button>
            </div>
            {/* ── Collapsible body ── */}
            {cOpen && <div style={{padding:"0 14px 14px",borderTop:"1px solid rgba(0,0,0,0.05)"}}>
              {/* Duplicate to buttons */}
              <div style={{display:"flex",gap:4,flexWrap:"wrap",paddingTop:10,marginBottom:8}}>
                {CHARS.map(c=>(
                  <button key={c.key} onClick={()=>duplicateTo(msg, c.key)}
                    style={{background:"rgba(16,185,129,0.07)",border:"1px solid rgba(16,185,129,0.2)",color:"#059669",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:10,whiteSpace:"nowrap",fontWeight:600}}>
                    ↗ {c.label}
                  </button>
                ))}
              </div>
            {(()=>{
              const isShared = !!msg.sharedThreadId;
              const myL = msg.perspective||'a';
              const otherL = myL==='a'?'b':'a';
              // Tri chronologique — les messages périmés (temps non reconnu) restent en fin.
              // Pour les convs partagées, on travaille directement sur l'array a/b (pas de
              // conversion me/them pour ne pas avoir à reconvertir à l'écriture).
              const rawShared = isShared ? (dataRef.current.sharedThreads?.[msg.sharedThreadId]||[]) : null;
              const rawLocal  = isShared ? null : (msg.thread||[]);
              // thread d'affichage avec from=me/them pour le sélecteur
              const displayThread = isShared
                ? rawShared.map(m=>({...m, from: m.from===myL?'me':'them'}))
                : rawLocal;
              const sortedDisplay = [...displayThread].sort((a,b)=>loreSortKey(a.time)-loreSortKey(b.time));
              const writeThread = (newDisplay) => {
                if(isShared){
                  const raw = newDisplay.map(m=>({...m, from: m.from==='me'?myL:otherL}));
                  onUpdate(msg.sharedThreadId, raw);
                } else {
                  upd("messages", d.messages.map(mm=>mm===msg?{...mm,thread:newDisplay}:mm));
                }
              };
              const insertAt = (si) => {
                const prev=sortedDisplay[si-1]; const next=sortedDisplay[si];
                const time=next?.time||prev?.time||"maintenant";
                const t=[...sortedDisplay];
                t.splice(si,0,{from:"them",text:"",time});
                writeThread(t);
              };
              return (<>
              <InsertMsgBtn onClick={()=>insertAt(0)}/>
              {sortedDisplay.map((msg2,si)=>(
              <React.Fragment key={si}>
              <div style={{display:"flex",flexDirection:"column",gap:4,background:"rgba(0,0,0,0.02)",borderRadius:8,padding:"8px 10px",border:"1px solid rgba(0,0,0,0.05)"}}>
                {/* Row 1: image, sender, time, move, delete */}
                <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                <div style={{display:"flex",flexDirection:"column",gap:2,flexShrink:0}}>
                  <MsgMoveBtn dir="up" disabled={si===0} onClick={()=>{const t=[...sortedDisplay];[t[si-1],t[si]]=[t[si],t[si-1]];t[si]={...t[si],time:shiftLoreTime(t[si].time,-1)};writeThread(t);}}/>
                  <MsgMoveBtn dir="down" disabled={si===sortedDisplay.length-1} onClick={()=>{const t=[...sortedDisplay];[t[si+1],t[si]]=[t[si],t[si+1]];t[si]={...t[si],time:shiftLoreTime(t[si].time,+1)};writeThread(t);}}/>
                </div>
                <label style={{width:34,height:34,borderRadius:7,overflow:"hidden",flexShrink:0,background:"rgba(99,102,241,0.08)",border:"1px dashed rgba(99,102,241,0.3)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",position:"relative"}}>
                  {msg2.img
                    ? <img src={msg2.img} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    : <span style={{fontSize:14,color:"#6366f1"}}>📷</span>}
                  <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                    const f=e.target.files?.[0]; if(!f) return;
                    const r=new UploadReader(); r.onload=ev=>{
                      const t=[...sortedDisplay]; t[si]={...t[si],img:ev.target.result}; writeThread(t);
                    };
                    r.readAsDataURL(f); e.target.value="";
                  }}/>
                </label>
                {msg2.img && <button onClick={()=>{const t=[...sortedDisplay];t[si]={...t[si],img:null};writeThread(t);}}
                  title="Retirer l'image" style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:13,padding:"0 2px",flexShrink:0}}>✕</button>}
                <select value={msg2.from} onChange={e=>{const t=[...sortedDisplay];t[si]={...t[si],from:e.target.value};writeThread(t);}}
                  className="adm-input" style={{background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#374151",padding:"5px 6px",fontSize:11,borderRadius:7,flexShrink:0,minWidth:70}}>
                  <option value="me">moi</option><option value="them">eux</option>
                </select>
                <div style={{flex:1,minWidth:120}}><LoreDateTimeInput value={msg2.time} onChange={v=>{const t=[...sortedDisplay];t[si]={...t[si],time:v};writeThread(t);}} width="100%" showLabel={false}/></div>
                <button onClick={()=>{const t=[...sortedDisplay];t.splice(si,1);writeThread(t);}}
                  className="adm-del-btn" style={{background:"none",border:"none",color:"#d1d5db",cursor:"pointer",fontSize:16,padding:"2px 6px",flexShrink:0,borderRadius:5}}>×</button>
                </div>
                {/* Row 2: message text */}
                <textarea value={msg2.text} onChange={e=>{const t=[...sortedDisplay];t[si]={...t[si],text:e.target.value};writeThread(t);}}
                  rows={Math.max(1,Math.ceil((msg2.text||"").length/40))}
                  className="adm-input" style={{width:"100%",resize:"vertical",background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a1a2e",padding:"6px 10px",fontSize:12,borderRadius:7,lineHeight:1.4,minHeight:36,boxSizing:"border-box"}}/>
              </div>
              <InsertMsgBtn onClick={()=>insertAt(si+1)}/>
              </React.Fragment>
              ))}
              </>);
            })()}
            <button onClick={()=>{
              if(msg.sharedThreadId){
                onUpdate(msg.sharedThreadId,[...(dataRef.current.sharedThreads?.[msg.sharedThreadId]||[]),{from:msg.perspective||'a',text:"",time:"maintenant"}]);
              }else{upd("messages",d.messages.map(mm=>mm===msg?{...mm,thread:[...(mm.thread||[]),{from:"me",text:"",time:"maintenant"}]}:mm));}
            }} style={{background:"rgba(0,0,0,0.04)",border:"1px dashed rgba(0,0,0,0.15)",color:"#9ca3af",borderRadius:6,padding:"5px 12px",cursor:"pointer",fontSize:11,marginTop:4}}>+ message</button>
            <ThreadComposer isGroup={false} tab={tab} onApply={(parsed,mode)=>{
              if(msg.sharedThreadId){
                const cur=dataRef.current.sharedThreads?.[msg.sharedThreadId]||[];
                const myL=msg.perspective||'a';const otherL=myL==='a'?'b':'a';
                const raw=parsed.map(p=>({from:p.from==='me'?myL:otherL,text:p.text,time:p.time}));
                onUpdate(msg.sharedThreadId,mode==="append"?[...cur,...raw]:raw);
              }else{
                upd("messages",d.messages.map(mm=>mm===msg?{...mm,thread:mode==="append"?[...(mm.thread||[]),...parsed]:parsed}:mm));
              }
            }}/>
            </div>}
          </div>
          );
        })}
        {msgAdminTab==="inbox" && (
        <button onClick={()=>upd("messages",[{id:Date.now(),contact:"Nouveau contact",thread:[{from:"them",text:"",time:"maintenant"}]},...(d.messages||[])])}
          style={{background:"rgba(99,102,241,0.08)",border:"1px dashed rgba(99,102,241,0.4)",color:"#6366f1",borderRadius:8,padding:"10px 18px",cursor:"pointer",fontSize:12,fontWeight:600}}>+ Nouvelle conversation</button>
        )}
        {msgAdminTab==="deleted" && deletedMsgs.length===0 && (
          <div style={{textAlign:"center",color:"#9ca3af",fontSize:12,padding:"20px 0"}}>Aucune conversation supprimée.</div>
        )}
      </div>
      );
    }

    case "phone": {
      // ── Sous-onglets : Appels | Contacts | Messages vocaux ──
      const phoneSubTabs = [["calls","📞 Appels"],["contacts","👥 Contacts"],["favorites","⭐ Favoris"],["voicemail","📼 Messages vocaux"]];
      return (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* Sub-tab bar */}
          <div className="adm-subtabs" style={{display:"flex",gap:0,background:"rgba(0,0,0,0.05)",borderRadius:8,padding:2,alignSelf:"flex-start"}}>
            {phoneSubTabs.map(([k,label])=>(
              <button key={k} onClick={()=>setPhoneSubTab(k)} style={{
                padding:"6px 14px",border:"none",borderRadius:6,cursor:"pointer",fontSize:11,
                fontWeight:phoneSubTab===k?700:400,
                background:phoneSubTab===k?"#fff":"transparent",
                color:phoneSubTab===k?charColor:"#6b7280",
                boxShadow:phoneSubTab===k?"0 1px 3px rgba(0,0,0,0.1)":"none",
                transition:"all 0.15s",whiteSpace:"nowrap",
              }}>{label}</button>
            ))}
          </div>

          {/* ── Appels ── */}
          {phoneSubTab==="calls" && (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {(d.calls||[]).map((call,i)=>(
                <div key={call.id} className="adm-card" style={{display:"flex",gap:8,alignItems:"center",background:"rgba(255,255,255,0.85)",padding:10,borderRadius:10,border:"1px solid rgba(0,0,0,0.07)",flexWrap:"wrap"}}>
                  <input value={call.contact} onChange={e=>{const c=[...d.calls];c[i]={...c[i],contact:e.target.value};upd("calls",c);}}
                    placeholder="Contact" className="adm-input" style={{flex:1,background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a1a2e",padding:"7px 10px",fontSize:12,borderRadius:7}}/>
                  <select value={call.type} onChange={e=>{const c=[...d.calls];c[i]={...c[i],type:e.target.value};upd("calls",c);}}
                    className="adm-input" style={{background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#374151",padding:"7px 8px",fontSize:11,borderRadius:7}}>
                    <option value="incoming">incoming</option><option value="outgoing">outgoing</option><option value="missed">missed (entrant)</option><option value="outgoing_missed">outgoing sans réponse</option>
                  </select>
                  <LoreDateTimeInput value={call.time} onChange={v=>{const c=[...d.calls];c[i]={...c[i],time:v};upd("calls",c);}} width="190px" showLabel={false}/>
                  <input value={call.duration||""} onChange={e=>{const c=[...d.calls];c[i]={...c[i],duration:e.target.value||null};upd("calls",c);}}
                    placeholder="Duration" className="adm-input" style={{width:90,background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#6b7280",padding:"7px 8px",fontSize:11,borderRadius:7}}/>
                  <button onClick={()=>upd("calls",d.calls.filter((_,j)=>j!==i))}
                    className="adm-del-btn" style={{background:"none",border:"none",color:"#d1d5db",cursor:"pointer",fontSize:16,padding:"2px 6px",borderRadius:5,transition:"all 0.15s"}}>×</button>
                </div>
              ))}
              <button onClick={()=>upd("calls",[{id:Date.now(),contact:"",type:"outgoing",time:"1 oct",duration:null},...(d.calls||[])])}
                style={{background:"rgba(99,102,241,0.08)",border:"1px dashed rgba(99,102,241,0.4)",color:"#6366f1",borderRadius:8,padding:"10px 18px",cursor:"pointer",fontSize:12,fontWeight:600}}>+ Call</button>
            </div>
          )}

          {/* ── Contacts ── */}
          {phoneSubTab==="contacts" && (()=>{
            const updContact = (id, field, val) => {
              const contacts = d.contacts||[];
              const idx = contacts.findIndex(c=>c.id===id);
              if(idx<0) return;
              const oldName = contacts[idx].name;
              const newContacts = contacts.map(c=>c.id===id?{...c,[field]:val}:c);
              if(field==="name" && oldName && oldName!==val){
                const newCalls = (d.calls||[]).map(c=>c.contact===oldName?{...c,contact:val}:c);
                const newMessages = (d.messages||[]).map(m=>(!m.isGroup && m.contact===oldName)?{...m,contact:val}:m);
                onUpdate(tab, {...d, contacts:newContacts, calls:newCalls, messages:newMessages});
              } else {
                onUpdate(tab, {...d, contacts:newContacts});
              }
            };
            const addContact = () => onUpdate(tab, {...d, contacts:[{id:Date.now(), name:"Nouveau contact", phone:"", photo:null}, ...(d.contacts||[])]});
            const deleteContact = (id) => onUpdate(tab, {...d, contacts:(d.contacts||[]).filter(c=>c.id!==id)});
            const seedContacts = () => {
              const names = new Set();
              (d.calls||[]).forEach(c=>c.contact && names.add(c.contact));
              (d.messages||[]).forEach(m=>!m.isGroup && m.contact && names.add(m.contact));
              const existing = new Set((d.contacts||[]).map(c=>c.name));
              const toAdd = [...names].filter(n=>!existing.has(n)).map((n,i)=>({id:Date.now()+i, name:n, phone:"", photo:null}));
              if(toAdd.length===0){ alert("Aucun nouveau contact à importer — tout est déjà dans la liste."); return; }
              onUpdate(tab, {...d, contacts:[...(d.contacts||[]), ...toAdd]});
            };
            return (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{fontSize:11,color:"#6b7280",lineHeight:1.5}}>
                  Renommer un contact ici met aussi à jour son nom dans les Appels et les Messages de ce perso.
                </div>
                <button onClick={seedContacts}
                  style={{alignSelf:"flex-start",background:"rgba(16,185,129,0.08)",border:"1px dashed rgba(16,185,129,0.4)",color:"#059669",borderRadius:8,padding:"8px 14px",cursor:"pointer",fontSize:11,fontWeight:600}}>
                  ⇩ Importer les noms depuis Appels / Messages
                </button>
                {(d.contacts||[]).map((c)=>(
                  <div key={c.id} className="adm-card" style={{display:"flex",gap:8,alignItems:"center",background:"rgba(255,255,255,0.85)",padding:10,borderRadius:10,border:"1px solid rgba(0,0,0,0.07)",flexWrap:"wrap"}}>
                    <div onClick={()=>document.getElementById(`contact-photo-${tab}-${c.id}`).click()}
                      style={{width:40,height:40,borderRadius:"50%",background:"rgba(99,102,241,0.08)",border:"1px dashed rgba(99,102,241,0.3)",overflow:"hidden",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                      {c.photo ? <img src={c.photo} style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <span style={{fontSize:16}}>👤</span>}
                    </div>
                    <input id={`contact-photo-${tab}-${c.id}`} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                      const f=e.target.files?.[0]; if(!f)return;
                      const r=new UploadReader(); r.onload=ev=>updContact(c.id,"photo",ev.target.result); r.readAsDataURL(f); e.target.value="";
                    }}/>
                    <input value={c.name} onChange={e=>updContact(c.id,"name",e.target.value)}
                      placeholder="Nom" className="adm-input" style={{flex:"1 1 140px",minWidth:0,background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a1a2e",padding:"7px 10px",fontSize:12,borderRadius:7,fontWeight:600}}/>
                    <input value={c.phone||""} onChange={e=>updContact(c.id,"phone",e.target.value)}
                      placeholder="Téléphone (optionnel)" className="adm-input" style={{flex:"1 1 120px",minWidth:0,background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#6b7280",padding:"7px 10px",fontSize:12,borderRadius:7}}/>
                    <button onClick={()=>deleteContact(c.id)}
                      className="adm-del-btn" style={{background:"none",border:"none",color:"#d1d5db",cursor:"pointer",fontSize:16,padding:"2px 6px",flexShrink:0,borderRadius:5,transition:"all 0.15s"}}>×</button>
                  </div>
                ))}
                <button onClick={addContact}
                  style={{background:"rgba(99,102,241,0.08)",border:"1px dashed rgba(99,102,241,0.4)",color:"#6366f1",borderRadius:8,padding:"10px 18px",cursor:"pointer",fontSize:12,fontWeight:600,alignSelf:"flex-start"}}>+ Contact</button>
              </div>
            );
          })()}

          {/* ── Favoris ── */}
          {phoneSubTab==="favorites" && (()=>{
            const allContacts = d.contacts || [];
            const currentFavs = d.phoneFavorites || [];
            const isFav = (name) => currentFavs.includes(name);
            const toggleFav = (name) => {
              const next = isFav(name)
                ? currentFavs.filter(n => n !== name)
                : [...currentFavs, name];
              upd("phoneFavorites", next);
            };
            const moveFav = (idx, dir) => {
              const next = [...currentFavs];
              const swap = idx + dir;
              if(swap < 0 || swap >= next.length) return;
              [next[idx], next[swap]] = [next[swap], next[idx]];
              upd("phoneFavorites", next);
            };
            const contactsWithPhoto = Object.fromEntries((allContacts).map(c=>[c.name, c.photo]));

            return (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div style={{fontSize:11,color:"#6b7280",lineHeight:1.5,background:"rgba(255,193,7,0.07)",border:"1px solid rgba(255,193,7,0.2)",borderRadius:8,padding:"8px 12px"}}>
                  Les favoris apparaissent dans l'onglet ⭐ du téléphone iOS. Cochez les contacts à afficher, et réordonnez-les par glisser ou avec les flèches.
                </div>

                {/* Favoris actifs — réordonnables */}
                {currentFavs.length > 0 && (
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    <div style={{fontSize:11,fontWeight:700,color:"#374151",letterSpacing:0.3,marginBottom:2}}>⭐ Favoris ({currentFavs.length})</div>
                    {currentFavs.map((name, idx) => {
                      const photo = contactsWithPhoto[name] || null;
                      return (
                        <div key={name} style={{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.9)",borderRadius:8,padding:"7px 10px",border:"1px solid rgba(255,193,7,0.25)",boxShadow:"0 1px 3px rgba(255,193,7,0.08)"}}>
                          <span style={{color:"#ffc107",lineHeight:1,flexShrink:0}}>
                            <svg width="16" height="15" viewBox="0 0 24 22" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
                          </span>
                          <div style={{width:28,height:28,borderRadius:"50%",background:"rgba(99,102,241,0.1)",display:"flex",alignItems:"center",justifyContent:"center",color:"#6366f1",fontWeight:700,fontSize:12,flexShrink:0,overflow:"hidden"}}>
                            {photo ? <img src={photo} style={{width:"100%",height:"100%",objectFit:"cover"}}/> : (name||"?")[0]}
                          </div>
                          <span style={{flex:1,fontSize:13,color:"#1a1a2e",fontWeight:600}}>{name}</span>
                          <div style={{display:"flex",gap:2,flexShrink:0}}>
                            <button onClick={()=>moveFav(idx,-1)} disabled={idx===0} style={{background:"none",border:"none",color:idx===0?"#d1d5db":"#9ca3af",cursor:idx===0?"default":"pointer",fontSize:14,padding:"2px 4px",lineHeight:1}}>▲</button>
                            <button onClick={()=>moveFav(idx,1)} disabled={idx===currentFavs.length-1} style={{background:"none",border:"none",color:idx===currentFavs.length-1?"#d1d5db":"#9ca3af",cursor:idx===currentFavs.length-1?"default":"pointer",fontSize:14,padding:"2px 4px",lineHeight:1}}>▼</button>
                          </div>
                          <button onClick={()=>toggleFav(name)} style={{background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",borderRadius:5,padding:"4px 8px",cursor:"pointer",fontSize:10,fontWeight:600,flexShrink:0}}>Retirer</button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Tous les contacts — toggle favori */}
                {allContacts.length > 0 ? (
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    <div style={{fontSize:11,fontWeight:700,color:"#374151",letterSpacing:0.3,marginBottom:2}}>Contacts disponibles</div>
                    {allContacts.map(c => {
                      const active = isFav(c.name);
                      return (
                        <div key={c.id} onClick={()=>toggleFav(c.name)} style={{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.85)",borderRadius:8,padding:"8px 10px",border:`1px solid ${active?"rgba(255,193,7,0.35)":"rgba(0,0,0,0.07)"}`,cursor:"pointer",transition:"border-color 0.15s,background 0.15s",userSelect:"none"}}>
                          <div style={{width:28,height:28,borderRadius:"50%",background:"rgba(99,102,241,0.08)",display:"flex",alignItems:"center",justifyContent:"center",color:"#6366f1",fontWeight:700,fontSize:12,flexShrink:0,overflow:"hidden"}}>
                            {c.photo ? <img src={c.photo} style={{width:"100%",height:"100%",objectFit:"cover"}}/> : (c.name||"?")[0]}
                          </div>
                          <span style={{flex:1,fontSize:13,color:"#1a1a2e",fontWeight:active?700:400}}>{c.name}</span>
                          <div style={{width:20,height:20,borderRadius:"50%",border:`2px solid ${active?"#ffc107":"#d1d5db"}`,background:active?"#ffc107":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}>
                            {active && <svg width="10" height="9" viewBox="0 0 24 22" fill="white"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{fontSize:11,color:"#9ca3af",textAlign:"center",padding:"20px 0"}}>
                    Ajoutez d'abord des contacts dans l'onglet 👥 Contacts.
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Messages vocaux ── */}
          {phoneSubTab==="voicemail" && (()=>{
            const updVm = (id, field, val) => {
              const list = (d.voicemails||[]).map(v=>v.id===id?{...v,[field]:val}:v);
              upd("voicemails", list);
            };
            const addVm = () => upd("voicemails",[{id:Date.now(), contact:"", time:"1 oct, 9:00am", duration:"0:08", transcript:""},...(d.voicemails||[])]);
            const deleteVm = (id) => upd("voicemails", (d.voicemails||[]).filter(v=>v.id!==id));
            const seedVm = () => {
              const missed = (d.calls||[]).filter(c=>c.type==="missed");
              if(missed.length===0){ alert("Aucun appel manqué à importer."); return; }
              const toAdd = missed.map((c,i)=>({id:Date.now()+i, contact:c.contact, time:c.time, duration:"0:08", transcript:""}));
              upd("voicemails",[...(d.voicemails||[]), ...toAdd]);
            };
            return (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{fontSize:11,color:"#6b7280",lineHeight:1.5}}>
                  Sans message vocal ajouté ici, l'onglet "Voicemail" du téléphone affiche par défaut les 3 derniers appels manqués (sans texte).
                </div>
                <button onClick={seedVm}
                  style={{alignSelf:"flex-start",background:"rgba(16,185,129,0.08)",border:"1px dashed rgba(16,185,129,0.4)",color:"#059669",borderRadius:8,padding:"8px 14px",cursor:"pointer",fontSize:11,fontWeight:600}}>
                  ⇩ Importer les appels manqués
                </button>
                {(d.voicemails||[]).map((vm)=>(
                  <div key={vm.id} className="adm-card" style={{display:"flex",flexDirection:"column",gap:6,background:"rgba(255,255,255,0.85)",padding:10,borderRadius:10,border:"1px solid rgba(0,0,0,0.07)"}}>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                      <input value={vm.contact} onChange={e=>updVm(vm.id,"contact",e.target.value)}
                        placeholder="Contact" className="adm-input" style={{flex:"1 1 120px",minWidth:0,background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a1a2e",padding:"7px 10px",fontSize:12,borderRadius:7,fontWeight:600}}/>
                      <LoreDateTimeInput value={vm.time} onChange={v=>updVm(vm.id,"time",v)} width="190px" showLabel={false}/>
                      <input value={vm.duration||""} onChange={e=>updVm(vm.id,"duration",e.target.value)}
                        placeholder="Durée" className="adm-input" style={{width:70,flexShrink:0,background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#6b7280",padding:"7px 8px",fontSize:11,borderRadius:7}}/>
                      <button onClick={()=>deleteVm(vm.id)}
                        className="adm-del-btn" style={{background:"none",border:"none",color:"#d1d5db",cursor:"pointer",fontSize:16,padding:"2px 6px",flexShrink:0,borderRadius:5}}>×</button>
                    </div>
                    <textarea value={vm.transcript||""} onChange={e=>updVm(vm.id,"transcript",e.target.value)}
                      placeholder="Texte du message vocal (ce que la personne dit)…" className="adm-input"
                      style={{width:"100%",minHeight:50,background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a1a2e",padding:"7px 10px",fontSize:12,borderRadius:7,resize:"vertical",boxSizing:"border-box"}}/>
                  </div>
                ))}
                <button onClick={addVm}
                  style={{background:"rgba(99,102,241,0.08)",border:"1px dashed rgba(99,102,241,0.4)",color:"#6366f1",borderRadius:8,padding:"10px 18px",cursor:"pointer",fontSize:12,fontWeight:600,alignSelf:"flex-start"}}>+ Message vocal</button>
              </div>
            );
          })()}
        </div>
      );
    }

    case "calls": return null; // Fusionné dans "phone"
    case "contacts": return null; // Fusionné dans "phone"
    case "voicemail": return null; // Fusionné dans "phone"


    case "notes": return (
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {(d.notes||[]).map((note,i)=>(
          <div key={note.id} className="adm-card" style={{background:"rgba(255,255,255,0.85)",borderRadius:12,padding:14,border:"1px solid rgba(0,0,0,0.07)",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
            <div style={{display:"flex",gap:8,marginBottom:8}}>
              <Field label="Titre" value={note.title} onChange={v=>{const n=[...d.notes];n[i]={...n[i],title:v};upd("notes",n);}} width="60%"/>
              <div style={{display:"flex",flexDirection:"column",gap:5,width:"30%"}}>
                <label style={{color:"#9ca3af",fontSize:10,letterSpacing:0.8,textTransform:"uppercase",fontWeight:600}}>Date</label>
                <input type="date"
                  value={(()=>{const p=parseLoreTime(note.date); return p?.day?`2012-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`:LORE_DATE_DEFAULT;})()}
                  onChange={e=>{
                    const n=[...d.notes];
                    if(!e.target.value){ n[i]={...n[i],date:""}; upd("notes",n); return; }
                    const [,m,dd]=e.target.value.split('-').map(Number);
                    n[i]={...n[i],date:`${dd} ${LORE_MONTHS[m]}`};
                    upd("notes",n);
                  }}
                  className="adm-input" style={{background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a1a2e",padding:"7px 8px",fontSize:11,borderRadius:7}}/>
              </div>
              <button onClick={()=>upd("notes",d.notes.filter((_,j)=>j!==i))}
                className="adm-del-btn" style={{background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:11,marginTop:18,flexShrink:0,transition:"all 0.15s"}}>✕</button>
            </div>
            <Field label="Contenu" value={note.body} onChange={v=>{const n=[...d.notes];n[i]={...n[i],body:v};upd("notes",n);}} textarea/>
          </div>
        ))}
        <button onClick={()=>upd("notes",[{id:Date.now(),title:"",body:"",date:"1 oct"},...(d.notes||[])])}
          style={{background:"rgba(99,102,241,0.08)",border:"1px dashed rgba(99,102,241,0.4)",color:"#6366f1",borderRadius:8,padding:"10px 18px",cursor:"pointer",fontSize:12,fontWeight:600}}>+ Note</button>
      </div>
    );

    case "gallery": {
      const allPhotos = d.gallery || [];
      const albums = d.galleryAlbums || []; // [{id, name, cover}]
      const [galTab, setGalTab] = [galSection, setGalSection];
      const updGallery = (newList) => upd("gallery", newList);
      const updAlbums  = (newList) => upd("galleryAlbums", newList);

      // Photos par contexte
      const photosForTab = (tabKey) => {
        if(tabKey === "roll")    return allPhotos.filter(p => !p.deleted && !p.album);
        if(tabKey === "deleted") return allPhotos.filter(p =>  p.deleted);
        // album custom : photos avec album===tabKey
        return allPhotos.filter(p => !p.deleted && p.album === tabKey);
      };

      const addPhotosFromFiles = (fileList, albumId=null) => {
        if(!fileList || !fileList.length) return;
        const files = Array.from(fileList);
        const total = files.length;
        const baseId = Date.now();
        const targetAlbum = (albumId && albumId!=="roll" && albumId!=="deleted") ? albumId : null;
        const isDeleted = albumId==="deleted";
        let loaded = 0;
        const newPhotos = [];
        files.forEach((f,fi)=>{
          const r = new UploadReader();
          r.onload = ev => {
            newPhotos.push({id:baseId+fi, src:ev.target.result, date:"Oct 2012", color:"#1a1a1a", deleted:isDeleted, album:targetAlbum});
            loaded++;
            if(loaded === total) updGallery([...newPhotos, ...allPhotos]);
          };
          r.readAsDataURL(f);
        });
      };
      const updPhoto = (photoId, patch) => updGallery(allPhotos.map(p=>p.id===photoId?{...p,...patch}:p));
      const removePhoto = (photoId) => updGallery(allPhotos.filter(p=>p.id!==photoId));

      // Tabs : Camera Roll + albums custom + Supprimées
      const tabList = [
        {key:"roll",    label:`📷 Camera Roll`, count: photosForTab("roll").length},
        ...albums.map(a => ({key:String(a.id), label:`📁 ${a.name||"Album"}`, count:photosForTab(String(a.id)).length, albumId:a.id})),
        {key:"deleted", label:`🗑 Supprimées`,  count: photosForTab("deleted").length},
      ];

      // Ensure galTab is valid, default to roll
      const activeTab = tabList.find(t=>t.key===galTab) ? galTab : "roll";
      const currentPhotos = photosForTab(activeTab);

      // Fonction de rendu (pas un composant monté via <PhotoCard/>) : définie dans
      // renderSection, un composant remonté à chaque frappe ferait perdre le focus
      // (le sélecteur de date se refermait). Appelée en place, le nœud DOM survit.
      const renderPhotoCard = (photo) => (
        <div key={photo.id} style={{background:"rgba(255,255,255,0.9)",borderRadius:10,overflow:"hidden",border:"1px solid rgba(0,0,0,0.07)"}}>
          <div style={{aspectRatio:"1",background:photo.color||"#1a1a1a",position:"relative",overflow:"hidden"}}>
            {photo.src
              ? <img src={photo.src} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              : <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,0.12)",fontSize:24}}>📷</div>}
            <label style={{position:"absolute",bottom:4,right:4,cursor:"pointer"}}>
              <span style={{background:"rgba(0,0,0,0.55)",borderRadius:4,padding:"2px 6px",color:"rgba(255,255,255,0.9)",fontSize:9}}>📁</span>
              <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                const f=e.target.files?.[0]; if(!f) return;
                const r=new UploadReader(); r.onload=ev=>updPhoto(photo.id,{src:ev.target.result}); r.readAsDataURL(f); e.target.value="";
              }}/>
            </label>
          </div>
          <div style={{padding:"6px 8px",display:"flex",flexDirection:"column",gap:4}}>
            <input type="date" value={photo.dateISO||LORE_DATE_DEFAULT} onChange={e=>{
                const iso = e.target.value;
                if(!iso){ updPhoto(photo.id,{dateISO:null}); return; }
                const [y,m,dd] = iso.split('-').map(Number);
                updPhoto(photo.id,{dateISO:iso, date:`${dd} ${LORE_MONTHS[m]} ${y}`});
              }}
              className="adm-input" style={{width:"100%",background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.08)",color:"#6b7280",padding:"4px 7px",fontSize:10,borderRadius:6}}/>
            <div style={{display:"flex",gap:4}}>
              {activeTab==="deleted"
                ? <button onClick={()=>updPhoto(photo.id,{deleted:false})} style={{flex:1,background:"rgba(16,185,129,0.07)",border:"1px solid rgba(16,185,129,0.2)",color:"#059669",borderRadius:6,padding:"3px 0",cursor:"pointer",fontSize:10}}>↩</button>
                : <button onClick={()=>updPhoto(photo.id,{deleted:true,album:null})} style={{flex:1,background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.15)",color:"#ef4444",borderRadius:6,padding:"3px 0",cursor:"pointer",fontSize:10}}>🗑</button>}
              <button onClick={()=>removePhoto(photo.id)} style={{flex:1,background:"rgba(0,0,0,0.04)",border:"1px solid rgba(0,0,0,0.1)",color:"#9ca3af",borderRadius:6,padding:"3px 0",cursor:"pointer",fontSize:10}}>✕</button>
            </div>
          </div>
        </div>
      );

      return (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>

          {/* Tab bar scrollable */}
          <div style={{display:"flex",gap:4,overflowX:"auto",paddingBottom:2}}>
            {tabList.map(t=>(
              <button key={t.key} onClick={()=>setGalTab(t.key)} style={{
                padding:"5px 11px",border:"none",borderRadius:6,cursor:"pointer",fontSize:11,whiteSpace:"nowrap",flexShrink:0,
                fontWeight:activeTab===t.key?700:400,
                background:activeTab===t.key?"#fff":"rgba(0,0,0,0.05)",
                color:activeTab===t.key?"#6366f1":"#6b7280",
                boxShadow:activeTab===t.key?"0 1px 3px rgba(0,0,0,0.1)":"none",
              }}>
                {t.label} <span style={{fontSize:9,opacity:0.7}}>({t.count})</span>
              </button>
            ))}
            {/* Bouton créer album */}
            <button onClick={()=>{
              const id = Date.now();
              updAlbums([...albums, {id, name:"Nouvel album", cover:null}]);
              setGalTab(String(id));
            }} style={{padding:"5px 11px",border:"1px dashed rgba(99,102,241,0.35)",borderRadius:6,cursor:"pointer",fontSize:11,color:"#6366f1",background:"rgba(99,102,241,0.05)",flexShrink:0,whiteSpace:"nowrap"}}>
              + Album
            </button>
          </div>

          {/* Album name editor si onglet custom */}
          {activeTab!=="roll" && activeTab!=="deleted" && (()=>{
            const albumIdx = albums.findIndex(a=>String(a.id)===activeTab);
            if(albumIdx<0) return null;
            const album = albums[albumIdx];
            return (
              <div style={{display:"flex",gap:8,alignItems:"center",background:"rgba(99,102,241,0.05)",border:"1px solid rgba(99,102,241,0.12)",borderRadius:8,padding:"8px 12px"}}>
                <label style={{width:36,height:36,borderRadius:6,overflow:"hidden",flexShrink:0,background:"#e5e7eb",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>
                  {album.cover?<img src={album.cover} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:"📁"}
                  <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new UploadReader();r.onload=ev=>updAlbums(albums.map((a,j)=>j===albumIdx?{...a,cover:ev.target.result}:a));r.readAsDataURL(f);e.target.value="";}}/>
                </label>
                <input value={album.name||""} onChange={e=>updAlbums(albums.map((a,j)=>j===albumIdx?{...a,name:e.target.value}:a))}
                  placeholder="Nom de l'album" className="adm-input"
                  style={{flex:1,background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a1a2e",padding:"6px 10px",fontSize:12,borderRadius:7}}/>
                <button onClick={()=>{
                  updAlbums(albums.filter((_,j)=>j!==albumIdx));
                  // retirer l'album des photos
                  updGallery(allPhotos.map(p=>p.album===activeTab?{...p,album:null}:p));
                  setGalTab("roll");
                }} style={{background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:11,whiteSpace:"nowrap"}}>✕ Supprimer</button>
              </div>
            );
          })()}

          {/* Grille de photos */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:10}}>
            {currentPhotos.map(photo=>renderPhotoCard(photo))}
            <label style={{
              aspectRatio:"1",background:"rgba(99,102,241,0.05)",border:"2px dashed rgba(99,102,241,0.25)",
              borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",
              cursor:"pointer",color:"#6366f1",fontSize:28,fontWeight:300,minHeight:80
            }}>
              +
              <input type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>{
                addPhotosFromFiles(e.target.files, activeTab);
                e.target.value="";
              }}/>
            </label>
          </div>
        </div>
      );
    }



    case "icons": return (
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {d.os==="android"&&<div style={{background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:8,padding:"10px 14px",fontSize:11,color:"#059669",fontWeight:500}}>
          📱 These icons apply to Drew's Android phone
        </div>}
        {d.os==="ios"&&<div style={{background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:8,padding:"10px 14px",fontSize:11,color:"#6366f1",fontWeight:500}}>
          🍎 These icons apply to all iOS phones (Glinda, Eoghan & Elias)
        </div>}

        {/* ── Apps principales ── */}
        {[["apps","📱 Apps (grille)"],["dock","⬛ Dock"]].map(([listKey, listLabel])=>{
          const list = d[listKey]||[];
          const dragIdx = { current: null };
          return (
          <div key={listKey} style={{display:"flex",flexDirection:"column",gap:6}}>
            <div style={{fontSize:12,fontWeight:700,color:"#374151",letterSpacing:0.3}}>{listLabel} <span style={{fontSize:10,color:"#9ca3af",fontWeight:400}}>— glisser-déposer pour réordonner</span></div>
            {list.map((appId,i)=>{
              const meta    = APP_META[appId]||{label:appId,iosIcon:"📱"};
              const isAndroid = d.os==="android";
              const cur     = isAndroid ? (data._sharedAndroidIcons?.[appId]) : (d.appIcons?.[appId]);
              const appName = d.appNames?.[appId] ?? meta.label;
              const remove  = () => upd(listKey, list.filter((_,j)=>j!==i));
              const readFile = f => {
                if(!f||!f.type.startsWith("image/")) return;
                const r=new UploadReader();
                r.onload=re=>{
                  if(d.os==="android"){
                    onUpdateShared({...(data._sharedAndroidIcons||{}),[appId]:re.target.result});
                  } else {
                    // Un seul appel onUpdate suffit : updateChar se charge de synchroniser
                    // les appIcons vers tous les autres persos du même OS automatiquement.
                    const freshTab = dataRef.current[tab] || {};
                    const newIcons = {...(freshTab.appIcons||{}),[appId]:re.target.result};
                    onUpdate(tab, {...freshTab, appIcons:newIcons});
                  }
                };
                r.readAsDataURL(f);
              };
              return (
                <div key={appId+i}
                  draggable
                  onDragStart={()=>{ dragIdx.current=i; }}
                  onDragOver={e=>{ e.preventDefault(); e.currentTarget.style.background="rgba(99,102,241,0.08)"; e.currentTarget.style.borderColor="rgba(99,102,241,0.35)"; }}
                  onDragLeave={e=>{ e.currentTarget.style.background="rgba(255,255,255,0.85)"; e.currentTarget.style.borderColor="rgba(0,0,0,0.07)"; }}
                  onDrop={e=>{
                    e.preventDefault();
                    e.currentTarget.style.background="rgba(255,255,255,0.85)";
                    e.currentTarget.style.borderColor="rgba(0,0,0,0.07)";
                    const from=dragIdx.current;
                    if(from==null||from===i) return;
                    const l=[...list];
                    const [moved]=l.splice(from,1);
                    l.splice(i,0,moved);
                    upd(listKey,l);
                    dragIdx.current=null;
                  }}
                  style={{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.85)",borderRadius:8,padding:"7px 10px",border:"1px solid rgba(0,0,0,0.07)",cursor:"grab",transition:"background 0.1s,border-color 0.1s,box-shadow 0.1s"}}>
                  {/* Handle drag */}
                  <span style={{color:"#d1d5db",fontSize:14,flexShrink:0,cursor:"grab",userSelect:"none"}}>⠿</span>
                  {/* Icône */}
                  <label style={{width:36,height:36,background:"#f3f4f6",borderRadius:7,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0,cursor:"pointer",border:"1px solid rgba(0,0,0,0.06)"}}>
                    {cur?<img src={cur} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:meta.iosIcon||"📱"}
                    <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>readFile(e.target.files?.[0])}/>
                  </label>
                  {/* Nom */}
                  <input value={appName} onChange={e=>upd("appNames",{...(d.appNames||{}),[appId]:e.target.value})}
                    className="adm-input" style={{flex:1,background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#374151",fontSize:12,padding:"5px 8px",borderRadius:6}}/>
                  <span style={{fontSize:11,color:"#9ca3af",flexShrink:0,minWidth:40}}>{appId}</span>
                  {cur&&<button onClick={()=>{if(d.os==="android"){const si={...(data._sharedAndroidIcons||{})};delete si[appId];onUpdateShared(si);}else{const ic={...(d.appIcons||{})};delete ic[appId];upd("appIcons",ic);}}} style={{background:"none",border:"none",color:"#9ca3af",cursor:"pointer",fontSize:10,flexShrink:0}}>✕ ico</button>}
                  <button onClick={remove} className="adm-del-btn" style={{background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",borderRadius:5,padding:"4px 8px",cursor:"pointer",fontSize:10,fontWeight:600,flexShrink:0}}>🗑</button>
                </div>
              );
            })}
          </div>
          );
        })}

        {/* ── Ajouter une app ── */}
        {(()=>{
          const allAppIds = Object.keys(APP_META);
          const current = new Set([...(d.apps||[]),...(d.dock||[])]);
          const available = allAppIds.filter(id=>!current.has(id));
          return (
            <div style={{display:"flex",flexDirection:"column",gap:8,paddingTop:8,borderTop:"1px solid rgba(0,0,0,0.06)",marginTop:4}}>
              <span style={{color:"#9ca3af",fontSize:11,fontWeight:600}}>Ajouter une app</span>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                <select className="adm-input" onChange={e=>{
                  if(!e.target.value) return;
                  upd("apps",[...(d.apps||[]),e.target.value]);
                  e.target.value="";
                }} style={{background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#374151",fontSize:11,borderRadius:7,padding:"5px 10px"}}>
                  <option value="">— app existante —</option>
                  {available.map(id=><option key={id} value={id}>{APP_META[id]?.label||id}</option>)}
                </select>
                <span style={{color:"#9ca3af",fontSize:11}}>ou</span>
                <input className="adm-input" placeholder="Nom de l'app custom…" value={customAppName} onChange={e=>setCustomAppName(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter"&&customAppName.trim()){const newId="custom_"+Date.now();upd("apps",[...(d.apps||[]),newId]);upd("appNames",{...(d.appNames||{}),[newId]:customAppName.trim()});setCustomAppName("");}}}
                  style={{background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#374151",fontSize:11,borderRadius:7,padding:"5px 10px",width:160}}/>
                <button className="adm-btn-primary" onClick={()=>{if(!customAppName.trim())return;const newId="custom_"+Date.now();upd("apps",[...(d.apps||[]),newId]);upd("appNames",{...(d.appNames||{}),[newId]:customAppName.trim()});setCustomAppName("");}}
                  style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",color:"#fff",padding:"6px 14px",borderRadius:7,fontWeight:600,fontSize:11,cursor:"pointer"}}>+ Créer</button>
              </div>
              <div style={{color:"#9ca3af",fontSize:10}}>Les apps custom s'affichent avec l'icône que tu importes, sans écran derrière.</div>
            </div>
          );
        })()}
      </div>
    );

    case "music": return (
      <div style={{display:"flex",flexDirection:"column",gap:10}}>

        <div style={{display:"flex",gap:12,alignItems:"center",background:"rgba(255,255,255,0.85)",padding:12,borderRadius:10,border:"1px solid rgba(0,0,0,0.07)"}}>
          <label
            style={{width:64,height:64,borderRadius:8,background:"rgba(99,102,241,0.08)",border:"2px dashed rgba(99,102,241,0.35)",overflow:"hidden",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
            {d.playlistCover
              ? <img src={d.playlistCover} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              : <span style={{fontSize:24}}>🖼</span>}
            <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
              const f=e.target.files?.[0]; if(!f)return;
              const r=new UploadReader(); r.onload=ev=>upd("playlistCover",ev.target.result); r.readAsDataURL(f); e.target.value="";
            }}/>
          </label>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:600,color:"#374151"}}>Cover de la playlist</div>
            <div style={{fontSize:11,color:"#9ca3af"}}>S'affiche dans le lecteur quand rien ne joue</div>
            {d.playlistCover && <button onClick={()=>upd("playlistCover",null)} style={{fontSize:10,color:"#ef4444",background:"none",border:"none",cursor:"pointer",padding:0,marginTop:2}}>Supprimer</button>}
          </div>
        </div>

        {/* ── Playlists ────────────────────────────────────────────────────────
            Même principe anti-closure-périmée que le reste de la musique : updPlaylists relit
            toujours dataRef.current[tab].playlists juste avant d'écrire, et n'écrit que la clé
            "playlists" (jamais tout l'objet du perso). Placée avant la liste des chansons pour
            qu'on gère les playlists avant de scroller tous les morceaux. */}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{fontSize:13,fontWeight:700,color:"#374151"}}>Playlists</div>
          {(()=>{
            const playlists = d.playlists || [];
            const music = d.music || [];
            const updPlaylists = (mutate) => {
              const freshChar = dataRef.current[tab] || {};
              const freshPlaylists = freshChar.playlists || [];
              const next = mutate(freshPlaylists);
              onUpdate(tab, {...freshChar, playlists: next});
            };
            return <>
              {playlists.length===0 && <div style={{fontSize:11,color:"#9ca3af"}}>Aucune playlist pour l'instant.</div>}
              {playlists.map((pl,pi)=>{
                const isOpen = openPlaylistAdmin===pl.id;
                const trackIds = pl.trackIds||[];
                const allSelected = music.length>0 && music.every(t=>trackIds.includes(t.id));
                return (
                  <div key={pl.id} className="adm-card" style={{background:"rgba(255,255,255,0.85)",borderRadius:10,border:"1px solid rgba(0,0,0,0.07)",padding:10,display:"flex",flexDirection:"column",gap:8}}>
                    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                      <label style={{width:40,height:40,borderRadius:6,background:"rgba(99,102,241,0.08)",border:"1px dashed rgba(99,102,241,0.3)",overflow:"hidden",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                        {pl.cover?<img src={pl.cover} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:16}}>🖼</span>}
                        <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                          const f=e.target.files?.[0]; if(!f) return;
                          const r=new UploadReader();
                          r.onload=ev=>updPlaylists(fresh=>{
                            const idx=fresh.findIndex(p=>p.id===pl.id);
                            if(idx<0) return fresh;
                            const next=[...fresh]; next[idx]={...next[idx],cover:ev.target.result}; return next;
                          });
                          r.readAsDataURL(f); e.target.value="";
                        }}/>
                      </label>
                      <input value={pl.name||""} onChange={e=>{
                        const val=e.target.value;
                        updPlaylists(fresh=>{
                          const idx=fresh.findIndex(p=>p.id===pl.id);
                          if(idx<0) return fresh;
                          const next=[...fresh]; next[idx]={...next[idx],name:val}; return next;
                        });
                      }} placeholder="Nom de la playlist" className="adm-input" style={{flex:1,background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a1a2e",padding:"7px 10px",fontSize:12,borderRadius:7,minWidth:120}}/>
                      <span style={{fontSize:11,color:"#9ca3af",flexShrink:0}}>{trackIds.length} morceau{trackIds.length!==1?"x":""}</span>
                      <button onClick={()=>setOpenPlaylistAdmin(isOpen?null:pl.id)} className="adm-btn-primary" style={{background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.3)",color:"#6366f1",padding:"6px 12px",borderRadius:7,fontWeight:600,fontSize:11,cursor:"pointer"}}>{isOpen?"Fermer":"Gérer les morceaux"}</button>
                      <button onClick={()=>{
                        if(pl.cover) updPlaylists(fresh=>{
                          const idx=fresh.findIndex(p=>p.id===pl.id);
                          if(idx<0) return fresh;
                          const next=[...fresh]; next[idx]={...next[idx],cover:null}; return next;
                        });
                      }} style={{fontSize:10,color:"#9ca3af",background:"none",border:"none",cursor:pl.cover?"pointer":"default",padding:0,visibility:pl.cover?"visible":"hidden"}}>Suppr. cover</button>
                      <button onClick={()=>{
                        updPlaylists(fresh=>fresh.filter(p=>p.id!==pl.id));
                        if(isOpen) setOpenPlaylistAdmin(null);
                      }} className="adm-del-btn" style={{background:"none",border:"none",color:"#d1d5db",cursor:"pointer",fontSize:16,padding:"2px 6px",borderRadius:5}}>×</button>
                    </div>
                    {isOpen && (
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>

                        {/* ── Import Spotify ──────────────────────────────────────────────
                            Appelle une fonction serverless Netlify (netlify/functions/spotify-playlist.js)
                            qui fait l'auth Client Credentials + l'appel Spotify côté serveur — le Client
                            Secret Spotify ne transite jamais côté navigateur. Dédoublonne par titre+artiste
                            (insensible à la casse) avant d'ajouter les nouveaux morceaux à `music`. */}
                        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",background:"rgba(30,215,96,0.06)",border:"1px dashed rgba(30,215,96,0.35)",borderRadius:8,padding:8}}>
                          <span style={{fontSize:14,flexShrink:0}}>🎧</span>
                          <input
                            value={spotifyLinkByPl[pl.id]||""}
                            onChange={e=>setSpotifyLinkByPl(prev=>({...prev,[pl.id]:e.target.value}))}
                            placeholder="Lien de playlist Spotify (open.spotify.com/playlist/…)"
                            style={{flex:1,minWidth:180,background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a1a2e",padding:"6px 10px",fontSize:11,borderRadius:6}}/>
                          <button
                            disabled={spotifyStatusByPl[pl.id]==="loading" || !(spotifyLinkByPl[pl.id]||"").trim()}
                            onClick={async ()=>{
                              const link = (spotifyLinkByPl[pl.id]||"").trim();
                              if(!link) return;
                              setSpotifyStatusByPl(prev=>({...prev,[pl.id]:"loading"}));
                              try {
                                const res = await fetch(`/.netlify/functions/spotify-playlist?url=${encodeURIComponent(link)}`);
                                const payload = await res.json();
                                if(!res.ok) throw new Error(payload.error || `Erreur ${res.status}`);
                                const freshChar = dataRef.current[tab] || {};
                                const freshMusic = freshChar.music || [];
                                const freshPlaylists = freshChar.playlists || [];
                                const norm = s => (s||"").trim().toLowerCase();
                                const nextMusic = [...freshMusic];
                                const importedIds = [];
                                (payload.tracks||[]).forEach(t=>{
                                  const existing = nextMusic.find(m=>norm(m.title)===norm(t.title) && norm(m.artist)===norm(t.artist));
                                  if(existing) { importedIds.push(existing.id); return; }
                                  const id = Date.now()+Math.floor(Math.random()*1000000);
                                  nextMusic.push({id, title:t.title||"", artist:t.artist||"", album:t.album||"", duration:t.duration||"", cover:t.cover||null});
                                  importedIds.push(id);
                                });
                                const plIdx = freshPlaylists.findIndex(p=>p.id===pl.id);
                                if(plIdx<0) throw new Error("Playlist introuvable (a-t-elle été supprimée ?)");
                                const nextPlaylists = [...freshPlaylists];
                                const mergedIds = Array.from(new Set([...(nextPlaylists[plIdx].trackIds||[]), ...importedIds]));
                                nextPlaylists[plIdx] = {
                                  ...nextPlaylists[plIdx],
                                  trackIds: mergedIds,
                                  name: (!nextPlaylists[plIdx].name || nextPlaylists[plIdx].name==="Nouvelle playlist") ? (payload.name||nextPlaylists[plIdx].name) : nextPlaylists[plIdx].name,
                                  cover: nextPlaylists[plIdx].cover || payload.cover || null,
                                };
                                onUpdate(tab, {...freshChar, music: nextMusic, playlists: nextPlaylists});
                                setSpotifyStatusByPl(prev=>({...prev,[pl.id]:`✅ ${importedIds.length} morceau${importedIds.length!==1?"x":""} importé${importedIds.length!==1?"s":""}`}));
                              } catch(e) {
                                setSpotifyStatusByPl(prev=>({...prev,[pl.id]:`❌ ${e.message}`}));
                              }
                            }}
                            style={{background:"#1DB954",border:"none",color:"#fff",padding:"6px 14px",borderRadius:6,fontWeight:700,fontSize:11,cursor:spotifyStatusByPl[pl.id]==="loading"?"default":"pointer",opacity:spotifyStatusByPl[pl.id]==="loading"?0.6:1,flexShrink:0}}>
                            {spotifyStatusByPl[pl.id]==="loading" ? "Import…" : "Importer"}
                          </button>
                          {spotifyStatusByPl[pl.id] && spotifyStatusByPl[pl.id]!=="loading" && (
                            <div style={{fontSize:10,color:spotifyStatusByPl[pl.id].startsWith("❌")?"#dc2626":"#16a34a",width:"100%"}}>{spotifyStatusByPl[pl.id]}</div>
                          )}
                        </div>

                        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                          <button onClick={()=>{
                            updPlaylists(fresh=>{
                              const idx=fresh.findIndex(p=>p.id===pl.id);
                              if(idx<0) return fresh;
                              const allIds = music.map(t=>t.id);
                              const next=[...fresh]; next[idx]={...next[idx],trackIds:allIds}; return next;
                            });
                          }} disabled={allSelected} style={{background:allSelected?"rgba(0,0,0,0.03)":"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.3)",color:allSelected?"#9ca3af":"#16a34a",padding:"5px 10px",borderRadius:7,fontWeight:600,fontSize:11,cursor:allSelected?"default":"pointer"}}>+ Tout ajouter</button>
                          <button onClick={()=>{
                            updPlaylists(fresh=>{
                              const idx=fresh.findIndex(p=>p.id===pl.id);
                              if(idx<0) return fresh;
                              const next=[...fresh]; next[idx]={...next[idx],trackIds:[]}; return next;
                            });
                          }} disabled={trackIds.length===0} style={{background:"transparent",border:"1px solid #e5e7eb",color:trackIds.length===0?"#d1d5db":"#6b7280",padding:"5px 10px",borderRadius:7,fontWeight:600,fontSize:11,cursor:trackIds.length===0?"default":"pointer"}}>Tout retirer</button>
                          <button onClick={()=>{
                            const freshChar = dataRef.current[tab] || {};
                            const freshMusic = freshChar.music || [];
                            const freshPlaylists = freshChar.playlists || [];
                            const newTrack = {id:Date.now(), title:"", artist:"", duration:"3:00"};
                            const nextMusic = [newTrack, ...freshMusic];
                            const nextPlaylists = freshPlaylists.map(p=>p.id===pl.id?{...p, trackIds:[...(p.trackIds||[]), newTrack.id]}:p);
                            onUpdate(tab, {...freshChar, music: nextMusic, playlists: nextPlaylists});
                          }} style={{background:"rgba(99,102,241,0.1)",border:"1px dashed rgba(99,102,241,0.4)",color:"#6366f1",padding:"5px 10px",borderRadius:7,fontWeight:600,fontSize:11,cursor:"pointer"}}>🎵 + Nouvelle chanson</button>
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:5,maxHeight:320,overflowY:"auto",background:"rgba(0,0,0,0.02)",borderRadius:8,padding:8}}>
                          {music.length===0 && <div style={{fontSize:11,color:"#9ca3af"}}>Aucun morceau dans la bibliothèque de ce perso.</div>}
                          {music.map(track=>{
                            const checked = trackIds.includes(track.id);
                            const toggleTrack = () => updPlaylists(fresh=>{
                              const idx=fresh.findIndex(p=>p.id===pl.id);
                              if(idx<0) return fresh;
                              const curIds = fresh[idx].trackIds||[];
                              const nextIds = curIds.includes(track.id) ? curIds.filter(id=>id!==track.id) : [...curIds, track.id];
                              const next=[...fresh]; next[idx]={...next[idx],trackIds:nextIds}; return next;
                            });
                            const updTrackField = (field,val) => {
                              const trackId = track.id;
                              const freshChar = dataRef.current[tab] || {};
                              const freshMusic = freshChar.music || [];
                              const idx = freshMusic.findIndex(t=>t.id===trackId);
                              if(idx<0) return;
                              const nextMusic = [...freshMusic];
                              nextMusic[idx] = {...nextMusic[idx], [field]:val};
                              onUpdate(tab, {...freshChar, music: nextMusic});
                            };
                            return (
                              <div key={track.id} onClick={toggleTrack} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:7,cursor:"pointer",background:checked?"rgba(99,102,241,0.1)":"rgba(255,255,255,0.7)",border:checked?"1px solid rgba(99,102,241,0.35)":"1px solid rgba(0,0,0,0.06)"}}>
                                <input type="checkbox" checked={checked} onChange={toggleTrack} onClick={e=>e.stopPropagation()} style={{flexShrink:0}}/>
                                <label onClick={e=>e.stopPropagation()} style={{width:34,height:34,borderRadius:5,background:"rgba(99,102,241,0.08)",border:"1px dashed rgba(99,102,241,0.3)",overflow:"hidden",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                                  {track.cover?<img src={track.cover} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:14}}>🎵</span>}
                                  <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                                    const f=e.target.files?.[0]; if(!f) return;
                                    const trackId = track.id;
                                    const r=new UploadReader();
                                    r.onload=ev=>{
                                      const freshChar = dataRef.current[tab] || {};
                                      const freshMusic = freshChar.music || [];
                                      const idx = freshMusic.findIndex(t=>t.id===trackId);
                                      if(idx<0) return;
                                      const nextMusic=[...freshMusic]; nextMusic[idx]={...nextMusic[idx],cover:ev.target.result};
                                      onUpdate(tab, {...freshChar, music: nextMusic});
                                    };
                                    r.readAsDataURL(f); e.target.value="";
                                  }}/>
                                </label>
                                <div onClick={e=>e.stopPropagation()} style={{flex:1,minWidth:0,display:"flex",gap:6}}>
                                  <input value={track.title||""} onChange={e=>updTrackField("title",e.target.value)}
                                    placeholder="Titre" style={{flex:1,minWidth:0,background:"transparent",border:"none",borderBottom:"1px solid rgba(0,0,0,0.12)",color:"#1a1a2e",fontSize:12,fontWeight:600,padding:"2px 2px"}}/>
                                  <input value={track.artist||""} onChange={e=>updTrackField("artist",e.target.value)}
                                    placeholder="Artiste" style={{flex:1,minWidth:0,background:"transparent",border:"none",borderBottom:"1px solid rgba(0,0,0,0.12)",color:"#6b7280",fontSize:11,padding:"2px 2px"}}/>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <button onClick={()=>{
                updPlaylists(fresh=>[...fresh, {id:"pl_"+Date.now(), name:"Nouvelle playlist", cover:null, trackIds:[]}]);
              }} style={{background:"rgba(99,102,241,0.08)",border:"1px dashed rgba(99,102,241,0.4)",color:"#6366f1",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:12,fontWeight:600,alignSelf:"flex-start"}}>+ Nouvelle playlist</button>
            </>;
          })()}
        </div>

        <div style={{marginTop:2,paddingTop:12,borderTop:"1px solid rgba(0,0,0,0.08)",display:"flex",flexDirection:"column",gap:10}}>
          <div style={{fontSize:13,fontWeight:700,color:"#374151"}}>Chansons</div>
          {/* ── Logique musique réécrite de zéro ──────────────────────────────────
              AVANT : seul onCoverChange lisait/écrivait via dataRef.current (état le plus frais).
              Tous les autres champs (titre/artiste/album/durée, réordonnancement, suppression,
              ajout, et même l'auto-fix des ids manquants) passaient par upd(), qui réécrit TOUT
              l'objet du perso ({...d, music: ...}) à partir de `d`, une copie figée au rendu
              précédent. Comme l'upload de pochette est asynchrone (FileReader) et donc plus lent
              qu'une frappe clavier, taper quoi que ce soit juste après un upload écrasait
              silencieusement la pochette qui venait d'être posée (et potentiellement d'autres
              champs du perso au passage) — exactement la même classe de bug que celui déjà
              corrigé sur Facebook/Twitter/Tumblr/Instagram/Messages plus tôt dans la conversation.
              APRÈS : toute mutation de `music` relit dataRef.current[tab] juste avant d'écrire,
              et n'écrit QUE la clé "music" (jamais tout l'objet du perso). */}
          {(()=>{
            const music = d.music||[];
            // updMusic : seul point d'écriture pour le tableau music, toujours basé sur l'état frais.
            // `mutate` reçoit le tableau music le plus à jour et retourne le nouveau tableau voulu —
            // ça élimine toute fenêtre de course entre deux mutations rapprochées (texte + upload).
            const updMusic = (mutate) => {
              const freshChar = dataRef.current[tab] || {};
              const freshMusic = freshChar.music || [];
              const nextMusic = mutate(freshMusic);
              onUpdate(tab, {...freshChar, music: nextMusic});
            };
            return music.map((track,i)=>(
              <MusicTrackRow
                key={track.id||i}
                track={track}
                index={i}
                total={music.length}
                onCoverChange={file=>{
                  const trackId = track.id;
                  const r = new UploadReader();
                  r.onload = ev => updMusic(freshMusic => {
                    const idx = trackId ? freshMusic.findIndex(t=>t.id===trackId) : i;
                    if(idx<0||idx>=freshMusic.length) return freshMusic;
                    const next = [...freshMusic];
                    next[idx] = {...next[idx], cover: ev.target.result};
                    return next;
                  });
                  r.readAsDataURL(file);
                }}
                onFieldChange={(field,val)=>{
                  const trackId = track.id;
                  updMusic(freshMusic => {
                    const idx = trackId ? freshMusic.findIndex(t=>t.id===trackId) : i;
                    if(idx<0||idx>=freshMusic.length) return freshMusic;
                    const next = [...freshMusic];
                    next[idx] = {...next[idx], [field]:val};
                    return next;
                  });
                }}
                onMoveUp={()=>{
                  const trackId = track.id;
                  updMusic(freshMusic => {
                    const idx = trackId ? freshMusic.findIndex(t=>t.id===trackId) : i;
                    if(idx<=0||idx>=freshMusic.length) return freshMusic;
                    const next = [...freshMusic];
                    [next[idx-1],next[idx]] = [next[idx],next[idx-1]];
                    return next;
                  });
                }}
                onMoveDown={()=>{
                  const trackId = track.id;
                  updMusic(freshMusic => {
                    const idx = trackId ? freshMusic.findIndex(t=>t.id===trackId) : i;
                    if(idx<0||idx>=freshMusic.length-1) return freshMusic;
                    const next = [...freshMusic];
                    [next[idx+1],next[idx]] = [next[idx],next[idx+1]];
                    return next;
                  });
                }}
                onDelete={()=>{
                  const trackId = track.id;
                  updMusic(freshMusic => trackId ? freshMusic.filter(t=>t.id!==trackId) : freshMusic.filter((_,j)=>j!==i));
                }}
              />
            ));
          })()}
          <button onClick={()=>{
            const freshChar = dataRef.current[tab] || {};
            const freshMusic = freshChar.music || [];
            onUpdate(tab, {...freshChar, music: [{id:Date.now(),title:"",artist:"",duration:"3:00"},...freshMusic]});
          }}
            style={{background:"rgba(99,102,241,0.08)",border:"1px dashed rgba(99,102,241,0.4)",color:"#6366f1",borderRadius:8,padding:"10px 18px",cursor:"pointer",fontSize:12,fontWeight:600}}>+ Add manually</button>
        </div>
      </div>
    );

    case "twitter": {
      const twUsers = data.sharedThreads?._sharedTwitterUsers || {};
      // Comptes communs : les 4 vrais persos + les comptes qui circulent dans plusieurs timelines
      // (ou qu'on prévoit de voir apparaître ailleurs). Une seule fiche, synchronisée pour tous.
      const COMMON_KNOWN_BASE = [
        {key:"glindarvf",    h:"@glindarvf",    name:"Glinda R.",        char:"glinda"},
        {key:"eoghanm",      h:"@eoghan_m",      name:"Eoghan M.",        char:"eoghan"},
        {key:"drewworms",    h:"@dreww_orms",    name:"Drew B.",          char:"drew"},
        {key:"noteliasgreen",h:"@noteliasgreen", name:"Elias G.",         char:"elias"},
        {key:"cynthiak",     h:"@cynthia_k",     name:"Cynthia K."},
        {key:"radiohead",    h:"@radiohead",     name:"Radiohead"},
        {key:"boquma",       h:"@boq_uma",       name:"Boq"},
        {key:"asrak",        h:"@asra_k",        name:"Asra"},
        {key:"ilyabeats",    h:"@ilya_beats",    name:"Ilya"},
      ];
      // Comptes spécifiques : ne suivis que par ce perso précis. Pas de section "★ ce perso" puisqu'ils
      // n'appartiennent qu'à une seule timeline — pas de risque de confusion entre persos.
      const SPECIFIC_KNOWN_BASE = {
        glinda:[
          {key:"snsdofficial", h:"@snsd_official", name:"Girls' Generation"},
          {key:"shinee",       h:"@SHINee",        name:"SHINee"},
          {key:"mileycyrus",   h:"@MileyCyrus",    name:"Miley Cyrus"},
          {key:"taylorswift13",h:"@taylorswift13", name:"Taylor Swift"},
        ],
        eoghan:[
          {key:"ladygaga",     h:"@ladygaga",      name:"Lady Gaga"},
          {key:"rihannaworld", h:"@rihannaworld",  name:"Rihanna"},
          {key:"umafootball",  h:"@uma_football",  name:"UMA Moose FB"},
        ],
        drew:[
          {key:"fobofficiel",  h:"@fobofficiel",   name:"Fall Out Boy"},
          {key:"inaturalist",  h:"@inaturalist",   name:"iNaturalist"},
          {key:"nilsk",        h:"@nils_k",        name:"Nils K."},
        ],
        elias:[
          {key:"bmthofficial", h:"@bmthofficial",  name:"Bring Me The Horizon"},
          {key:"creepypasta",  h:"@creepypasta",   name:"CreepyPasta"},
          {key:"profhanlon",   h:"@prof_hanlon",   name:"Mike Hanlon"},
          {key:"derrypolice",  h:"@derrypolice",   name:"Derry Police Dept"},
        ],
      };
      // Comptes ajoutés depuis l'admin (en plus des listes de base ci-dessus), persistés dans data.
      const commonExtra   = data.sharedThreads?._sharedTwitterAccountsExtra || [];
      const specificExtra = d.twitterAccountsExtra || [];
      const COMMON_KNOWN   = [...COMMON_KNOWN_BASE, ...commonExtra];
      const SPECIFIC_KNOWN = {...SPECIFIC_KNOWN_BASE, [tab]: [...(SPECIFIC_KNOWN_BASE[tab]||[]), ...specificExtra]};

      const ALL_KNOWN = [...COMMON_KNOWN, ...(SPECIFIC_KNOWN[tab]||[])];
      const isCommon = (key) => COMMON_KNOWN.some(u=>u.key===key);
      const specificUsers = d.twitterUsers || {};
      const updTwUser = (key, field, val) => {
        if(isCommon(key)) {
          // Même fix que pour les posts partagés : on relit l'état le plus frais avant de
          // patcher une seule clé, pour ne pas écraser les modifs faites par un autre perso
          // sur un AUTRE compte commun (ex: Glinda édite @cynthiak pendant qu'Eoghan édite @boquma).
          const freshTwUsers = dataRef.current.sharedThreads?._sharedTwitterUsers || {};
          const cur = freshTwUsers[key] || twUsers[key] || COMMON_KNOWN.find(u=>u.key===key) || {h:"",name:""};
          onUpdate("_sharedTwitterUsers", {...freshTwUsers, [key]:{...cur, [field]:val}});
        } else {
          const cur = specificUsers[key] || (SPECIFIC_KNOWN[tab]||[]).find(u=>u.key===key) || {h:"",name:""};
          upd("twitterUsers", {...specificUsers, [key]:{...cur, [field]:val}});
        }
      };
      const addCommonAccount = () => {
        const newKey = "common"+Date.now();
        const freshExtra = dataRef.current.sharedThreads?._sharedTwitterAccountsExtra || [];
        onUpdate("_sharedTwitterAccountsExtra", [...freshExtra, {key:newKey, h:"@nouveau_compte", name:"Nouveau compte"}]);
      };
      const addSpecificAccount = () => {
        const newKey = "spec"+Date.now();
        upd("twitterAccountsExtra", [...specificExtra, {key:newKey, h:"@nouveau_compte", name:"Nouveau compte"}]);
      };
      const removeCommonAccount = (key) => onUpdate("_sharedTwitterAccountsExtra", commonExtra.filter(u=>u.key!==key));
      const removeSpecificAccount = (key) => upd("twitterAccountsExtra", specificExtra.filter(u=>u.key!==key));
      const hbTweets = d.homeBaseTweets || [];
      const addHBTweet = () => upd("homeBaseTweets", [...hbTweets, {id:Date.now(),h:"@handle",name:"Nom",text:"",time:"1:00am",av:"?",rp:0,rt:0,fav:0}]);
      const updHB = (id,f,v) => upd("homeBaseTweets", hbTweets.map(t=>t.id===id?{...t,[f]:v}:t));
      const delHB = (id) => upd("homeBaseTweets", hbTweets.filter(t=>t.id!==id));
      return (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* Tab bar */}
          <div className="adm-subtabs" style={{display:"flex",gap:0,background:"rgba(0,0,0,0.05)",borderRadius:8,padding:2,alignSelf:"flex-start"}}>
            {[["users","👥 Mon profil"],["shared","🐦 Mes tweets (partagés)"],["tweets","🗒 Timeline (déco)"]].map(([k,label])=>(
              <button key={k} onClick={()=>setTwTab(k)} style={{
                padding:"6px 14px",border:"none",borderRadius:6,cursor:"pointer",fontSize:11,
                fontWeight:twTab===k?700:400,
                background:twTab===k?"#fff":"transparent",
                color:twTab===k?"#1da1f2":"#6b7280",
                boxShadow:twTab===k?"0 1px 3px rgba(0,0,0,0.1)":"none",
                transition:"all 0.15s",
              }}>{label}</button>
            ))}
          </div>

          {twTab==="users" && <>
            {(()=>{
              const renderUserCard = (u, ov, onRemove) => (
                <div key={u.key} className="adm-card" style={{background:"rgba(255,255,255,0.85)",borderRadius:10,padding:"10px 12px",border:"1px solid rgba(0,0,0,0.07)",display:"flex",flexDirection:"column",gap:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontSize:10,fontWeight:700,color:"#9ca3af",letterSpacing:0.5}}>
                      {u.char ? (char?.key===u.char ? "★ CE PERSO" : u.char.toUpperCase()) : u.key.toUpperCase()}
                    </div>
                    {onRemove && <button onClick={onRemove} style={{background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",borderRadius:6,padding:"3px 7px",cursor:"pointer",fontSize:10}}>✕ Retirer</button>}
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <Field label="Nom"    value={ov.name??u.name} onChange={v=>updTwUser(u.key,"name",v)} style={{flex:1}}/>
                    <Field label="Handle" value={ov.h??u.h}       onChange={v=>updTwUser(u.key,"h",v)}    style={{flex:1}}/>
                  </div>
                  <div style={{display:"flex",gap:10,alignItems:"center"}}>
                    <label style={{width:40,height:40,borderRadius:6,overflow:"hidden",cursor:"pointer",flexShrink:0,background:"#f3f4f6",border:"1px solid rgba(0,0,0,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>
                      {ov.av?<img src={ov.av} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:"🐦"}
                      <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                        const f=e.target.files?.[0]; if(!f) return;
                        const r=new UploadReader(); r.onload=ev=>updTwUser(u.key,"av",ev.target.result); r.readAsDataURL(f); e.target.value="";
                      }}/>
                    </label>
                    <div style={{flex:1}}>
                      <div style={{fontSize:11,fontWeight:600,color:"#374151"}}>Photo de profil</div>
                      <div style={{fontSize:10,color:"#9ca3af"}}>Cliquer pour importer une image</div>
                    </div>
                    {ov.av && <button onClick={()=>updTwUser(u.key,"av",null)} style={{fontSize:10,color:"#ef4444",background:"none",border:"none",cursor:"pointer",padding:0}}>Supprimer</button>}
                  </div>
                  {u.char && (
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      <div style={{display:"flex",gap:10,alignItems:"center"}}>
                        <label style={{width:64,height:36,borderRadius:6,overflow:"hidden",cursor:"pointer",flexShrink:0,background:ov.bannerImg?"transparent":(ov.bannerColor||"#1DA1F2"),border:"1px solid rgba(0,0,0,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff"}}>
                          {ov.bannerImg?<img src={ov.bannerImg} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:"📷"}
                          <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                            const f=e.target.files?.[0]; if(!f) return;
                            const r=new UploadReader(); r.onload=ev=>updTwUser(u.key,"bannerImg",ev.target.result); r.readAsDataURL(f); e.target.value="";
                          }}/>
                        </label>
                        <div style={{flex:1}}>
                          <div style={{fontSize:11,fontWeight:600,color:"#374151"}}>Image du header</div>
                          <div style={{fontSize:10,color:"#9ca3af"}}>Remplace la couleur si présente</div>
                        </div>
                        {ov.bannerImg && <button onClick={()=>updTwUser(u.key,"bannerImg",null)} style={{fontSize:10,color:"#ef4444",background:"none",border:"none",cursor:"pointer",padding:0}}>Supprimer</button>}
                      </div>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <Field label="Couleur du header (si pas d'image)" value={ov.bannerColor||""} onChange={v=>updTwUser(u.key,"bannerColor",v)} placeholder="#1DA1F2" style={{flex:1}}/>
                        <div style={{width:28,height:28,borderRadius:6,background:ov.bannerColor||"#1DA1F2",border:"1px solid #e5e7eb",flexShrink:0,marginTop:18}}/>
                      </div>
                    </div>
                  )}
                </div>
              );
              return (<>
                {/* Profil Twitter du perso courant uniquement — synchronisé via _sharedTwitterUsers */}
                {(()=>{
                  const myCharInfo = COMMON_KNOWN_BASE.find(u=>u.char===tab) || {};
                  const ov = twUsers[myCharInfo.key] || {};
                  return (
                    <div className="adm-card" style={{background:"rgba(255,255,255,0.85)",borderRadius:10,padding:"14px 16px",border:"1px solid rgba(0,0,0,0.07)",display:"flex",flexDirection:"column",gap:10}}>
                      <div style={{fontSize:10,fontWeight:700,color:"#9ca3af",letterSpacing:0.5,marginBottom:2}}>★ CE PERSO — synchronisé pour les 4</div>
                      <div style={{display:"flex",gap:6}}>
                        <Field label="Nom affiché" value={ov.name??myCharInfo.name??""} onChange={v=>updTwUser(myCharInfo.key,"name",v)} style={{flex:1}}/>
                        <Field label="Handle" value={ov.h??myCharInfo.h??""} onChange={v=>updTwUser(myCharInfo.key,"h",v)} style={{flex:1}}/>
                      </div>
                      {/* Photo de profil */}
                      <div style={{display:"flex",gap:10,alignItems:"center"}}>
                        <label style={{width:48,height:48,borderRadius:6,overflow:"hidden",cursor:"pointer",flexShrink:0,background:"#f3f4f6",border:"1px solid rgba(0,0,0,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>
                          {ov.av?<img src={ov.av} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:"🐦"}
                          <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                            const f=e.target.files?.[0]; if(!f) return;
                            const r=new UploadReader(); r.onload=ev=>updTwUser(myCharInfo.key,"av",ev.target.result); r.readAsDataURL(f); e.target.value="";
                          }}/>
                        </label>
                        <div style={{flex:1}}>
                          <div style={{fontSize:11,fontWeight:600,color:"#374151"}}>Photo de profil</div>
                          <div style={{fontSize:10,color:"#9ca3af"}}>Visible sur tous les profils et TL</div>
                        </div>
                        {ov.av && <button onClick={()=>updTwUser(myCharInfo.key,"av",null)} style={{fontSize:10,color:"#ef4444",background:"none",border:"none",cursor:"pointer",padding:0}}>Supprimer</button>}
                      </div>
                      {/* Banner */}
                      <div style={{display:"flex",gap:10,alignItems:"center"}}>
                        <label style={{width:80,height:40,borderRadius:6,overflow:"hidden",cursor:"pointer",flexShrink:0,background:ov.bannerImg?"transparent":(ov.bannerColor||"#1DA1F2"),border:"1px solid rgba(0,0,0,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff"}}>
                          {ov.bannerImg?<img src={ov.bannerImg} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:"📷 Header"}
                          <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                            const f=e.target.files?.[0]; if(!f) return;
                            const r=new UploadReader(); r.onload=ev=>updTwUser(myCharInfo.key,"bannerImg",ev.target.result); r.readAsDataURL(f); e.target.value="";
                          }}/>
                        </label>
                        <div style={{flex:1}}>
                          <div style={{fontSize:11,fontWeight:600,color:"#374151"}}>Image du header</div>
                          <div style={{fontSize:10,color:"#9ca3af"}}>Remplace la couleur si présente</div>
                        </div>
                        {ov.bannerImg && <button onClick={()=>updTwUser(myCharInfo.key,"bannerImg",null)} style={{fontSize:10,color:"#ef4444",background:"none",border:"none",cursor:"pointer",padding:0}}>Supprimer</button>}
                      </div>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <Field label="Couleur du header (si pas d'image)" value={ov.bannerColor||""} onChange={v=>updTwUser(myCharInfo.key,"bannerColor",v)} placeholder="#1DA1F2" style={{flex:1}}/>
                        <div style={{width:28,height:28,borderRadius:6,background:ov.bannerColor||"#1DA1F2",border:"1px solid #e5e7eb",flexShrink:0,marginTop:18}}/>
                      </div>
                    </div>
                  );
                })()}
              </>);
            })()}
          </>}

          {twTab==="shared" && (()=>{
            const allShared = data.sharedThreads?._sharedTweets || [];
            // Fix anti-écrasement : on ne réinjecte JAMAIS la liste reçue telle quelle (elle peut être basée
            // sur un `data` périmé si un autre joueur a écrit pendant ce temps). On relit l'état le plus frais
            // possible via dataRef, on garde les posts des AUTRES auteurs tels qu'ils sont en base, et on ne
            // remplace que les posts de "tab" — exactement ce que l'UI promet ("tu ne peux modifier que les tiens").
            const updAllShared = (list) => {
              const freshAll = dataRef.current.sharedThreads?._sharedTweets || [];
              const others = freshAll.filter(p => p.author !== tab);
              const mine = list.filter(p => p.author === tab);
              onUpdate("_sharedTweets", [...mine, ...others]);
            };
            return (
              <SharedPostsEditor
                posts={allShared} onChange={updAllShared} tab={tab} accent="#1da1f2"
                fieldMap={{text:"text", img:"photo", time:"time"}}
                statFields={[{key:"rp",label:"💬"},{key:"rt",label:"🔁"},{key:"fav",label:"❤"}]}
                addLabel="+ Tweet" textLabel="Texte"
                hint="Ces tweets sont partagés entre tous les persos : ils apparaissent dans les fils et sur le profil du personnage. Tu ne peux modifier que les tiens."
              />
            );
          })()}

          {twTab==="tweets" && (()=>{
            const charKey = tab;
            const isCustom = hbTweets.length > 0;
            const effectiveTweets = isCustom ? hbTweets : (TWITTER_HOME_BASE[charKey]||[]).map((t,i)=>({...t,id:i}));
            const updEffective = (newList) => upd("homeBaseTweets", newList);
            return (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{background:"rgba(29,161,242,0.06)",border:"1px solid rgba(29,161,242,0.15)",borderRadius:8,padding:"8px 12px",fontSize:11,color:"#374151"}}>
                <span style={{fontWeight:700,color:"#1da1f2"}}>Timeline de {CHAR_NAMES[tab]||tab}</span> — Tweets décoratifs de comptes fictifs qui remplissent la TL de ce perso. <strong>Propres à ce perso</strong>, non partagés. Pour qu'un tweet soit visible par tous, utilise l'onglet "Mes tweets (partagés)".
              </div>

              {effectiveTweets.map((t,i)=>{
                const upTw = (patch) => updEffective(effectiveTweets.map((t2,j)=>j===i?{...t2,...patch,id:t2.id||Date.now()+j}:{...t2,id:t2.id||Date.now()+j}));
                const tid = t.id??i;
                const isOpen = twTweetsOpen.has(tid);
                const toggle = toggleInSet(setTwTweetsOpen);
                return (
                <div key={tid} className="adm-card" style={{background:"rgba(255,255,255,0.9)",borderRadius:10,border:"1px solid rgba(0,0,0,0.07)",overflow:"hidden"}}>
                  <div onClick={()=>toggle(tid)} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 12px",cursor:"pointer"}}>
                    <div style={{width:30,height:30,borderRadius:6,overflow:"hidden",background:"#f3f4f6",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:14}}>
                      {(typeof t.av==="string" && (t.av.startsWith("data:")||t.av.startsWith("http")||t.av.startsWith("/")))
                        ? <img src={t.av} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                        : "🐦"}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,color:"#374151",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.h?`@${t.h}`:<em style={{color:"#9ca3af"}}>(sans handle)</em>} {t.text?`— ${t.text}`:""}</div>
                      <div style={{fontSize:10,color:"#9ca3af"}}>{t.time||"—"}</div>
                    </div>
                    <AdminChevron open={isOpen}/>
                  </div>
                  {isOpen && (
                  <div style={{display:"flex",gap:10,alignItems:"flex-start",padding:"0 12px 12px"}}>
                  {/* Avatar du compte */}
                  <label style={{width:44,height:44,borderRadius:6,overflow:"hidden",background:"#f3f4f6",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,border:"1px solid rgba(0,0,0,0.08)",fontSize:16}}>
                    {(typeof t.av==="string" && (t.av.startsWith("data:")||t.av.startsWith("http")||t.av.startsWith("/")))
                      ? <img src={t.av} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                      : "🐦"}
                    <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                      const f=e.target.files?.[0]; if(!f) return;
                      const r=new UploadReader(); r.onload=ev=>upTw({av:ev.target.result}); r.readAsDataURL(f); e.target.value="";
                    }}/>
                  </label>
                  <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:6}}>
                  <div style={{display:"flex",gap:6}}>
                    <Field label="Handle" value={t.h||""} onChange={v=>upTw({h:v})} style={{flex:1}}/>
                    <Field label="Nom"    value={t.name||""} onChange={v=>upTw({name:v})} style={{flex:1}}/>
                    <LoreDateTimeInput value={t.time||""} onChange={v=>upTw({time:v})} width="180px" showLabel={true}/>
                    <div style={{display:"flex",gap:6,alignItems:"flex-start"}}>
                    <MoveButtons 
                      index={i} 
                      length={effectiveTweets.length}
                      onMoveUp={() => { const l=[...effectiveTweets]; [l[i-1],l[i]]=[l[i],l[i-1]]; updEffective(l); }}
                      onMoveDown={() => { const l=[...effectiveTweets]; [l[i+1],l[i]]=[l[i],l[i+1]]; updEffective(l); }}
                    />
                    <button onClick={()=>updEffective(effectiveTweets.filter((_,j)=>j!==i))} className="adm-del-btn" style={{background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:11,marginTop:18}}>✕</button>
                  </div>
                  </div>
                  <Field label="Texte" value={t.text||""} onChange={v=>upTw({text:v})} textarea/>
                  <div style={{display:"flex",gap:6,alignItems:"flex-end"}}>
                    <Field label="💬" value={String(t.rp??0)}  onChange={v=>upTw({rp:parseInt(v)||0})} style={{flex:1}}/>
                    <Field label="🔁" value={String(t.rt??0)}  onChange={v=>upTw({rt:parseInt(v)||0})} style={{flex:1}}/>
                    <Field label="❤"  value={String(t.fav??0)} onChange={v=>upTw({fav:parseInt(v)||0})} style={{flex:1}}/>
                  </div>
                  </div>
                  </div>
                  )}
                </div>
              );})}

              <button onClick={()=>updEffective([...effectiveTweets.map((t,j)=>({...t,id:t.id||Date.now()+j})),{id:Date.now(),h:"@handle",name:"Nom",text:"",time:"1:00am",av:"?",rp:0,rt:0,fav:0}])}
                style={{background:"rgba(29,161,242,0.08)",border:"1px dashed rgba(29,161,242,0.4)",color:"#1da1f2",borderRadius:8,padding:"10px 18px",cursor:"pointer",fontSize:12,fontWeight:600}}>+ Tweet</button>
            </div>
            );
          })()}
        </div>
      );
    }
    case "pinterest": return (
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {(()=>{
          const isCustom = (d.pinterest||[]).length > 0;
          const effective = isCustom ? (d.pinterest||[]) : PIN_DEFAULTS;
          const updList = (newList) => upd("pinterest", newList);
          const ensureCustom = (i, patch) => {
            if(isCustom) { updList(effective.map((p,j)=>j===i?{...p,...patch}:p)); }
            else { updList(PIN_DEFAULTS.map((p,j)=>j===i?{...p,...patch,id:Date.now()+j}:{...p,id:Date.now()+j})); }
          };
          const RED="#e60023";
          return (<>
                        {effective.map((p,i)=>(
              <div key={p.id??i} style={{background:"rgba(255,255,255,0.9)",borderRadius:10,padding:"10px 12px",border:"1px solid rgba(0,0,0,0.07)",display:"flex",gap:10,alignItems:"flex-start"}}>
                {/* Image / Emoji */}
                <label style={{width:64,height:p.tall?96:64,borderRadius:8,overflow:"hidden",cursor:"pointer",flexShrink:0,background:"#f3f4f6",border:"1px solid rgba(0,0,0,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>
                  {p.img?<img src={p.img} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(p.emoji||"📌")}
                  <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                    const f=e.target.files?.[0]; if(!f) return;
                    const r=new UploadReader(); r.onload=ev=>ensureCustom(i,{img:ev.target.result}); r.readAsDataURL(f); e.target.value="";
                  }}/>
                </label>
                <div style={{flex:1,display:"flex",flexDirection:"column",gap:5}}>
                  <Field label="Description" value={p.desc||""} onChange={v=>ensureCustom(i,{desc:v})}/>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
                    <Field label="Board" value={p.board||""} onChange={v=>ensureCustom(i,{board:v})} style={{flex:1}}/>
                    <Field label="Pinner" value={p.pinner||""} onChange={v=>ensureCustom(i,{pinner:v})} style={{flex:1}}/>
                    <Field label="Repins" value={String(p.repins??0)} onChange={v=>ensureCustom(i,{repins:parseInt(v)||0})} style={{width:70}}/>
                    <Field label="Emoji" value={p.emoji||""} onChange={v=>ensureCustom(i,{emoji:v})} style={{width:52}}/>
                    <label style={{display:"flex",alignItems:"center",gap:3,fontSize:10,color:"#555",cursor:"pointer",whiteSpace:"nowrap"}}>
                      <input type="checkbox" checked={!!p.tall} onChange={e=>ensureCustom(i,{tall:e.target.checked})}/>Grand
                    </label>
                  </div>
                  {p.img && <button onClick={()=>ensureCustom(i,{img:null})} style={{background:"none",border:"none",color:"#9ca3af",cursor:"pointer",fontSize:10,textAlign:"left",padding:0}}>× Supprimer l'image</button>}
                </div>
                <button onClick={()=>updList(effective.filter((_,j)=>j!==i).map((p,j)=>({...p,id:Date.now()+j})))} style={{background:"none",border:"none",color:"#d1d5db",cursor:"pointer",fontSize:16,padding:"0 2px",flexShrink:0}}>×</button>
              </div>
            ))}
            <button onClick={()=>updList([...effective.map((p,j)=>isCustom?p:{...p,id:Date.now()+j}),{id:Date.now(),desc:"",emoji:"📌",tall:false,img:null,board:"",pinner:"",repins:0}])}
              style={{background:"rgba(230,0,35,0.08)",border:"1px dashed rgba(230,0,35,0.3)",color:RED,borderRadius:8,padding:"10px 18px",cursor:"pointer",fontSize:12,fontWeight:600}}>+ Pin</button>
          </>);
        })()}
      </div>
    );

    case "snapchat": return (
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {(()=>{
          const defaults = SNAPCHAT_DEFAULTS[tab] || [];
          const isCustom = (d.snaps||[]).length > 0;
          // toujours éditable : si pas encore custom, on copie les défauts au premier edit
          const effective = isCustom ? (d.snaps||[]) : defaults;
          const updList = (newList) => upd("snaps", newList);
          const updSnap = (i, patch) => updList(effective.map((s,j)=>j===i?{...s,...patch}:s));
          const ensureCustom = (i, patch) => {
            if(isCustom) { updSnap(i, patch); }
            else { updList(defaults.map((s,j)=>j===i?{...s,...patch,...{id:Date.now()+j}}:{...s,id:Date.now()+j})); }
          };
          const SC = "#e8c400";
          return (<>
                        {effective.map((snap,i)=>(
              <div key={snap.id??i} className="adm-card" style={{background:"rgba(255,255,255,0.9)",borderRadius:10,border:"1px solid rgba(0,0,0,0.07)",padding:"10px 12px",display:"flex",flexDirection:"column",gap:7}}>
                <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                  {/* Direction : envoyé / reçu */}
                  <div style={{display:"flex",flexDirection:"column",gap:2}}>
                    <label style={{color:"#9ca3af",fontSize:10,letterSpacing:0.6,fontWeight:600,textTransform:"uppercase"}}>Dir.</label>
                    <select value={snap.sent?"sent":"recv"} onChange={e=>ensureCustom(i,{sent:e.target.value==="sent"})}
                      style={{background:"rgba(255,255,255,0.9)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a1a2e",padding:"5px 7px",fontSize:11,borderRadius:7,width:76}}>
                      <option value="recv">📥 Reçu</option>
                      <option value="sent">📤 Envoyé</option>
                    </select>
                  </div>
                  {/* Type : photo / vidéo */}
                  <div style={{display:"flex",flexDirection:"column",gap:2}}>
                    <label style={{color:"#9ca3af",fontSize:10,letterSpacing:0.6,fontWeight:600,textTransform:"uppercase"}}>Type</label>
                    <select value={snap.type||"photo"} onChange={e=>ensureCustom(i,{type:e.target.value,preview:e.target.value==="video"?"🎥":"📸"})}
                      style={{background:"rgba(255,255,255,0.9)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a1a2e",padding:"5px 7px",fontSize:11,borderRadius:7,width:76}}>
                      <option value="photo">📸 Photo</option>
                      <option value="video">🎥 Vidéo</option>
                    </select>
                  </div>
                  {/* Ouvert */}
                  <div style={{display:"flex",flexDirection:"column",gap:2,marginTop:0}}>
                    <label style={{color:"#9ca3af",fontSize:10,letterSpacing:0.6,fontWeight:600,textTransform:"uppercase"}}>État</label>
                    <select value={snap.opened?"opened":"new"} onChange={e=>ensureCustom(i,{opened:e.target.value==="opened"})}
                      style={{background:"rgba(255,255,255,0.9)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a1a2e",padding:"5px 7px",fontSize:11,borderRadius:7,width:80}}>
                      <option value="new">🟥 Nouveau</option>
                      <option value="opened">✓ Ouvert</option>
                    </select>
                  </div>
                  {isCustom && (
                    <div style={{display:"flex",gap:4,alignItems:"flex-start"}}>
                      <MoveButtons 
                        index={i} 
                        length={effective.length}
                        onMoveUp={() => { const l=[...effective]; [l[i-1],l[i]]=[l[i],l[i-1]]; updList(l); }}
                        onMoveDown={() => { const l=[...effective]; [l[i+1],l[i]]=[l[i],l[i+1]]; updList(l); }}
                      />
                      <button onClick={()=>updList(effective.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:"#d1d5db",cursor:"pointer",fontSize:16,padding:"0 4px",marginTop:18}}>×</button>
                    </div>
                  )}
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  <Field label="Contact" value={snap.contact||""} onChange={v=>ensureCustom(i,{contact:v})} style={{flex:1}}/>
                  <LoreDateTimeInput value={snap.time||""} onChange={v=>ensureCustom(i,{time:v})} width="180px"/>
                </div>
              </div>
            ))}
            <button onClick={()=>updList([...effective.map((s,j)=>isCustom?s:{...s,id:Date.now()+j}),{id:Date.now(),contact:"",type:"photo",preview:"📸",time:"Oct 1 at 12:00PM",opened:false,sent:false}])}
              style={{background:"rgba(232,196,0,0.1)",border:"1px dashed rgba(232,196,0,0.5)",color:"#a38900",borderRadius:8,padding:"10px 18px",cursor:"pointer",fontSize:12,fontWeight:600}}>+ Snap</button>
          </>);
        })()}
      </div>
    );

    case "grindr": return (
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {(()=>{
          const OR="#f5811f";
          const myP = d.grindrProfile || {name:"",age:"",headline:"",about:"",photo:null};
          const grid = d.grindr || [];
          
          // Eoghan's default DMs from GrindrScreen hardcoded data
          const GRINDR_DMS_DEFAULTS = {
            eoghan: [
              {id:1, name:"Jackson",  distance:"180 m",   photo:null, online:true,  thread:[
                {from:"them", text:"salut toi 👀",                            time:"10:12 AM"},
                {from:"me",   text:"salut, ça va ?",                          time:"10:14 AM"},
                {from:"them", text:"bien merci 😊 t'es en cours là ?",        time:"10:15 AM"},
                {from:"me",   text:"non j'ai un creux, toi ?",                time:"10:16 AM"},
                {from:"them", text:"pareil, on pourrait se croiser ?",         time:"10:17 AM"},
              ]},
              {id:2, name:"Jungkook", distance:"340 m",   photo:null, online:true,  thread:[
                {from:"them", text:"heyy",                                    time:"Hier"},
                {from:"me",   text:"hey, t'es d'où ?",                        time:"Hier"},
                {from:"them", text:"séoul à la base mais j'étudie ici depuis 2 ans", time:"Hier"},
                {from:"me",   text:"sympa ! tu fais quoi comme études ?",     time:"Hier"},
                {from:"them", text:"musique. toi ?",                          time:"Hier"},
                {from:"me",   text:"éco. on a l'air très différents lol",     time:"Hier"},
                {from:"them", text:"c'est pas plus mal 😏",                   time:"Hier"},
              ]},
              {id:3, name:"James",    distance:"1.2 km",  photo:null, online:false, thread:[
                {from:"them", text:"beau profil",                             time:"Hier"},
                {from:"me",   text:"merci :)",                                time:"Hier"},
                {from:"them", text:"tu cherches quoi sur ici ?",              time:"Hier"},
                {from:"me",   text:"je sais pas encore vraiment",             time:"Hier"},
                {from:"them", text:"honnête au moins 😄",                     time:"Hier"},
              ]},
              {id:4, name:"Mateo",    distance:"600 m",   photo:null, online:true,  thread:[
                {from:"them", text:"coucou 🌻",                               time:"09:03 AM"},
                {from:"me",   text:"coucou ! t'as un prénom sympa",           time:"09:05 AM"},
                {from:"them", text:"espagnol de base haha. t'es étudiant ?",  time:"09:06 AM"},
                {from:"me",   text:"oui à l'UMA. et toi ?",                   time:"09:07 AM"},
                {from:"them", text:"idem ! on est peut-être voisins 😲",      time:"09:08 AM"},
              ]},
              {id:5, name:"Johnny",   distance:"2.1 km",  photo:null, online:false, thread:[
                {from:"them", text:"yo",                                      time:"2d"},
                {from:"me",   text:"yo, ça va ?",                             time:"2d"},
                {from:"them", text:"ouais tranquille. t'aimes la musique ?",  time:"2d"},
                {from:"me",   text:"un peu oui, pourquoi ?",                  time:"2d"},
                {from:"them", text:"je fais des sets le week-end si tu veux passer", time:"2d"},
              ]},
              {id:6, name:"Gary",     distance:"850 m",   photo:null, online:true,  thread:[
                {from:"them", text:"salut 😌",                                time:"11:30 AM"},
                {from:"me",   text:"salut !",                                 time:"11:32 AM"},
                {from:"them", text:"j'aime ton profil, t'es étudiant ?",     time:"11:33 AM"},
                {from:"me",   text:"oui, économie. toi ?",                   time:"11:33 AM"},
                {from:"them", text:"je travaille dans une galerie d'art ici", time:"11:34 AM"},
                {from:"me",   text:"oh c'est cool ! tu fais quoi exactement ?", time:"11:35 AM"},
                {from:"them", text:"commissaire d'expo principalement 🎨",   time:"11:36 AM"},
              ]},
              {id:7, name:"Léo",      distance:"450 m",   photo:null, online:true,  thread:[
                {from:"them", text:"hey 👋",                                  time:"08:50 AM"},
                {from:"me",   text:"hey ! t'es levé tôt",                    time:"09:00 AM"},
                {from:"them", text:"cours à 8h le lundi… la vraie torture",  time:"09:01 AM"},
                {from:"me",   text:"courage haha, t'as quoi comme cours ?",  time:"09:02 AM"},
                {from:"them", text:"architecture. 5 ans de souffrance 😭",   time:"09:03 AM"},
              ]},
              {id:8, name:"Rayan",    distance:"1.8 km",  photo:null, online:false, thread:[
                {from:"them", text:"bonsoir",                                 time:"3d"},
                {from:"me",   text:"bonsoir :)",                              time:"3d"},
                {from:"them", text:"tu fais quoi ce soir ?",                  time:"3d"},
                {from:"me",   text:"rien de spécial, toi ?",                  time:"3d"},
                {from:"them", text:"idem. on pourrait se voir ?",             time:"3d"},
                {from:"me",   text:"pourquoi pas, t'es dans quel coin ?",     time:"3d"},
              ]},
            ],
          };
          
          const isCustom = (d.grindrDms && d.grindrDms.length > 0);
          const dms = isCustom ? d.grindrDms : (GRINDR_DMS_DEFAULTS[tab] || GRINDR_DMS_DEFAULTS.eoghan || []);
          const updDms = (newList) => upd("grindrDms", newList);
          const [gTab, setGTab] = [grindrTab, setGrindrTab];
          return (<>
            {/* Tabs */}
            <div className="adm-subtabs" style={{display:"flex",gap:0,background:"rgba(0,0,0,0.05)",borderRadius:8,padding:2,alignSelf:"flex-start"}}>
              {[["grid","🟡 Grille"],["dms","💬 DMs"],["profile","👤 Profil"]].map(([k,lbl])=>(
                <button key={k} onClick={()=>setGTab(k)} style={{padding:"5px 12px",border:"none",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:gTab===k?700:400,background:gTab===k?"#fff":"transparent",color:gTab===k?OR:"#6b7280",boxShadow:gTab===k?"0 1px 3px rgba(0,0,0,0.1)":"none"}}>
                  {lbl}
                </button>
              ))}
            </div>

            {/* Grille */}
            {gTab==="grid" && <>
              {grid.map((g,i)=>(
                <div key={g.id??i} className="adm-card" style={{background:"rgba(255,255,255,0.85)",borderRadius:10,padding:"10px 12px",border:"1px solid rgba(0,0,0,0.07)",display:"flex",gap:10,alignItems:"flex-start",flexWrap:"wrap"}}>
                  <label style={{width:52,height:52,borderRadius:6,overflow:"hidden",cursor:"pointer",flexShrink:0,background:"#1a1a1a",border:`1px solid ${OR}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,position:"relative"}}>
                    {g.photo?<img src={g.photo} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{color:"#555"}}>📷</span>}
                    <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new UploadReader();r.onload=ev=>{const a=[...grid];a[i]={...a[i],photo:ev.target.result};upd("grindr",a);};r.readAsDataURL(f);e.target.value="";}}/>
                  </label>
                  <div style={{flex:1,display:"flex",flexDirection:"column",gap:5}}>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      <Field label="Nom" value={g.name||""} onChange={v=>{const a=[...grid];a[i]={...a[i],name:v};upd("grindr",a);}} style={{flex:1}}/>
                      <Field label="Distance" value={g.distance||""} onChange={v=>{const a=[...grid];a[i]={...a[i],distance:v};upd("grindr",a);}} width="90px"/>
                      <Field label="Âge" value={g.age||""} onChange={v=>{const a=[...grid];a[i]={...a[i],age:v};upd("grindr",a);}} width="54px"/>
                    </div>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      <label style={{display:"flex",alignItems:"center",gap:3,fontSize:11,color:"#555",cursor:"pointer"}}>
                        <input type="checkbox" checked={!!g.online} onChange={e=>{const a=[...grid];a[i]={...a[i],online:e.target.checked};upd("grindr",a);}}/> En ligne
                      </label>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:4}}>
                    <MoveButtons 
                      index={i} 
                      length={grid.length}
                      onMoveUp={() => { const l=[...grid]; [l[i-1],l[i]]=[l[i],l[i-1]]; upd("grindr",l); }}
                      onMoveDown={() => { const l=[...grid]; [l[i+1],l[i]]=[l[i],l[i+1]]; upd("grindr",l); }}
                    />
                    <button onClick={()=>upd("grindr",grid.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:"#d1d5db",cursor:"pointer",fontSize:16,padding:"0 4px"}}>×</button>
                  </div>
                </div>
              ))}
              <button onClick={()=>upd("grindr",[...grid,{id:Date.now(),name:"",distance:"0.5 mi",age:"",photo:null,online:true}])}
                style={{background:"rgba(245,129,31,0.08)",border:"1px dashed rgba(245,129,31,0.4)",color:OR,borderRadius:8,padding:"10px 18px",cursor:"pointer",fontSize:12,fontWeight:600}}>+ Profil</button>
            </>}

            {/* DMs */}
            {gTab==="dms" && <>
            
              {dms.map((conv,ci)=>{
                const dmKey = `grindr-dm-${tab}-${conv.id}`;
                const isOpen = grindrOpenDms.has(dmKey);
                return (
                <div key={conv.id??ci} className="adm-card" style={{background:"rgba(255,255,255,0.85)",borderRadius:12,border:"1px solid rgba(0,0,0,0.07)",overflow:"hidden"}}>
                  {/* Toggle header */}
                  <div onClick={()=>toggleGrindrDm(dmKey)} style={{display:"flex",gap:8,padding:14,cursor:"pointer",minHeight:44,WebkitTapHighlightColor:"transparent",userSelect:"none",alignItems:"center"}}>
                    <AdminChevron open={isOpen}/>
                    <label style={{width:36,height:36,borderRadius:4,overflow:"hidden",cursor:"pointer",flexShrink:0,background:"#1a1a1a",border:`1px solid ${OR}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,pointerEvents:"none"}}>
                      {conv.photo?<img src={conv.photo} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{color:"#555"}}>📷</span>}
                    </label>
                    <span style={{fontSize:12,fontWeight:600,color:"#374151",flex:1}}>{conv.name||"(sans nom)"} <span style={{color:"#9ca3af",fontSize:10,fontWeight:400}}>{conv.distance}</span></span>
                    <span style={{fontSize:10,color:"#9ca3af",flexShrink:0}}>{(conv.thread||[]).length} msg</span>
                  </div>
                  {/* Collapsible content */}
                  {isOpen && (
                    <div style={{padding:"0 14px 14px",borderTop:"1px solid rgba(0,0,0,0.05)",display:"flex",flexDirection:"column",gap:8}}>
                      <div style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap",alignItems:"center"}}>
                        <label style={{cursor:"pointer",display:"flex",gap:2,fontSize:11,color:"#555"}}>
                          <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new UploadReader();r.onload=ev=>{const nd=[...dms];nd[ci]={...nd[ci],photo:ev.target.result};updDms(nd);};r.readAsDataURL(f);e.target.value="";}}/>
                          📷 Photo
                        </label>
                        <Field label="Nom" value={conv.name||""} onChange={v=>{const nd=[...dms];nd[ci]={...nd[ci],name:v};updDms(nd);}} style={{flex:1,minWidth:120}}/>
                        <Field label="Distance" value={conv.distance||""} onChange={v=>{const nd=[...dms];nd[ci]={...nd[ci],distance:v};updDms(nd);}} width="90px"/>
                        <label style={{display:"flex",alignItems:"center",gap:3,fontSize:11,color:"#555",cursor:"pointer",whiteSpace:"nowrap"}}>
                          <input type="checkbox" checked={!!conv.online} onChange={e=>{const nd=[...dms];nd[ci]={...nd[ci],online:e.target.checked};updDms(nd);}}/> En ligne
                        </label>
                        <div style={{display:"flex",gap:4}}>
                          <MoveButtons 
                            index={ci} 
                            length={dms.length}
                            onMoveUp={() => { const l=[...dms]; [l[ci-1],l[ci]]=[l[ci],l[ci-1]]; updDms(l); }}
                            onMoveDown={() => { const l=[...dms]; [l[ci+1],l[ci]]=[l[ci],l[ci+1]]; updDms(l); }}
                          />
                          <button onClick={e=>{e.stopPropagation();updDms(dms.filter((_,j)=>j!==ci));}} style={{background:"none",border:"none",color:"#d1d5db",cursor:"pointer",fontSize:16,padding:"0 4px"}}>×</button>
                        </div>
                      </div>
                      {(conv.thread||[]).map((msg,mi)=>(
                    <div key={mi} style={{display:"flex",gap:5,marginBottom:4,alignItems:"center"}}>
                      <select value={msg.from} onChange={e=>{const nd=[...dms];nd[ci]={...nd[ci],thread:nd[ci].thread.map((m,j)=>j===mi?{...m,from:e.target.value}:m)};updDms(nd);}}
                        style={{background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a1a2e",padding:"4px 6px",fontSize:10,borderRadius:6,width:64,flexShrink:0}}>
                        <option value="me">moi</option>
                        <option value="them">eux</option>
                      </select>
                      <input value={msg.text||""} onChange={e=>{const nd=[...dms];nd[ci]={...nd[ci],thread:nd[ci].thread.map((m,j)=>j===mi?{...m,text:e.target.value}:m)};updDms(nd);}}
                        className="adm-input" style={{flex:1,background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a1a2e",padding:"4px 8px",fontSize:11,borderRadius:6}}/>
                      <input value={msg.time||""} onChange={e=>{const nd=[...dms];nd[ci]={...nd[ci],thread:nd[ci].thread.map((m,j)=>j===mi?{...m,time:e.target.value}:m)};updDms(nd);}}
                        className="adm-input" style={{width:70,background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#6b7280",padding:"4px 6px",fontSize:10,borderRadius:6}}/>
                      <button onClick={()=>{const nd=[...dms];nd[ci]={...nd[ci],thread:nd[ci].thread.filter((_,j)=>j!==mi)};updDms(nd);}} style={{background:"none",border:"none",color:"#d1d5db",cursor:"pointer",fontSize:14,padding:"0 2px"}}>×</button>
                    </div>
                      ))}
                      <button onClick={()=>{const nd=[...dms];nd[ci]={...nd[ci],thread:[...(nd[ci].thread||[]),{from:"them",text:"",time:""}]};updDms(nd);}}
                        style={{background:"rgba(245,129,31,0.06)",border:"1px dashed rgba(245,129,31,0.3)",color:OR,borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:10,marginTop:4}}>+ Message</button>
                    </div>
                  )}
                </div>
              );
              })}
              <button onClick={()=>updDms([...dms,{id:Date.now(),name:"",distance:"",photo:null,online:true,thread:[]}])}
                style={{background:"rgba(245,129,31,0.08)",border:"1px dashed rgba(245,129,31,0.4)",color:OR,borderRadius:8,padding:"10px 18px",cursor:"pointer",fontSize:12,fontWeight:600}}>+ Conversation</button>
            </>}

            {/* Profil */}
            {gTab==="profile" && (()=>{
              const updP = (patch) => upd("grindrProfile", {...myP, ...patch});
              const photos = myP.photos || [null,null,null,null,null];
              const setPhoto = (idx, val) => {
                const ph = [...photos]; ph[idx] = val; updP({photos:ph});
              };
              return (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {/* Grille 5 photos — comme dans l'app */}
                <div style={{fontSize:11,color:"#9ca3af",marginBottom:2}}>Photos du profil (1 principale + 4 secondaires)</div>
                <div style={{display:"flex",gap:6}}>
                  {/* Photo principale */}
                  <label style={{flex:2,aspectRatio:"1",borderRadius:8,overflow:"hidden",cursor:"pointer",background:"#1a1a1a",border:`2px solid ${OR}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,minHeight:100}}>
                    {photos[0]?<img src={photos[0]} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{color:"#555",opacity:0.5}}>📷</span>}
                    <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new UploadReader();r.onload=ev=>setPhoto(0,ev.target.result);r.readAsDataURL(f);e.target.value="";}}/>
                  </label>
                  {/* 4 photos secondaires */}
                  <div style={{flex:1,display:"grid",gridTemplateColumns:"1fr 1fr",gridTemplateRows:"1fr 1fr",gap:4}}>
                    {[1,2,3,4].map(idx=>(
                      <label key={idx} style={{borderRadius:6,overflow:"hidden",cursor:"pointer",background:"#1a1a1a",border:`1px solid ${OR}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,aspectRatio:"1"}}>
                        {photos[idx]?<img src={photos[idx]} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{color:"#555",opacity:0.4}}>📷</span>}
                        <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new UploadReader();r.onload=ev=>setPhoto(idx,ev.target.result);r.readAsDataURL(f);e.target.value="";}}/>
                      </label>
                    ))}
                  </div>
                </div>
                {/* Champs texte */}
                <div style={{display:"flex",gap:6}}>
                  <Field label="Display Name (15 car. max)" value={myP.name||""} onChange={v=>updP({name:v.slice(0,15)})} style={{flex:1}}/>
                  <Field label="Âge" value={myP.age||""} onChange={v=>updP({age:v})} width="60px"/>
                </div>
                <Field label="About Me (255 car. max)" value={myP.about||""} onChange={v=>updP({about:v.slice(0,255)})} textarea/>
                <Field label="My Tags (séparés par des virgules)" value={myP.tags||""} onChange={v=>updP({tags:v})} textarea/>
                {/* Supprimer les photos */}
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {photos.map((ph,idx)=>ph?(
                    <button key={idx} onClick={()=>setPhoto(idx,null)}
                      style={{background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",borderRadius:5,padding:"3px 8px",cursor:"pointer",fontSize:10}}>
                      ✕ Photo {idx===0?"principale":idx}
                    </button>
                  ):null)}
                </div>
              </div>
              );
            })()}
          </>);
        })()}
      </div>
    );

    case "tumblr": {
      const TB_COLOR = "#35465c";
      const sharedPosts = data.sharedThreads?._sharedTumblrPosts || [];
      // Même fix anti-écrasement que Twitter/Facebook : ne jamais réécrire la liste entière à partir
      // d'un `data` potentiellement périmé. On repart de dataRef (toujours à jour) et on ne touche
      // qu'aux posts de "tab", en préservant ceux des 3 autres persos tels qu'ils sont en base.
      const updShared = (list) => {
        const freshShared = dataRef.current.sharedThreads?._sharedTumblrPosts || [];
        const others = freshShared.filter(p => p.author !== tab);
        const mine = list.filter(p => p.author === tab);
        onUpdate("_sharedTumblrPosts", [...mine, ...others]);
      };
      // Profil Tumblr du perso courant — stocké dans data[tab] + partagé via _sharedAvatars
      const tbProfile = d.tumblr || {};
      const updTbProfile = (patch) => upd("tumblr", {...tbProfile, ...patch});

      const SubTabs = [["users","👤 Mon profil"],["shared","📝 Mes posts (partagés)"],["feed","🗒 Timeline (déco)"]];
      return (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* Tab bar */}
          <div className="adm-subtabs" style={{display:"flex",gap:0,background:"rgba(0,0,0,0.05)",borderRadius:8,padding:2,alignSelf:"flex-start"}}>
            {SubTabs.map(([k,label])=>(
              <button key={k} onClick={()=>setTbTab(k)} style={{
                padding:"6px 14px",border:"none",borderRadius:6,cursor:"pointer",fontSize:11,
                fontWeight:tbTab===k?700:400,
                background:tbTab===k?"#fff":"transparent",
                color:tbTab===k?TB_COLOR:"#6b7280",
                boxShadow:tbTab===k?"0 1px 3px rgba(0,0,0,0.1)":"none",
                transition:"all 0.15s",whiteSpace:"nowrap",
              }}>{label}</button>
            ))}
          </div>

          {/* ── MON PROFIL ── */}
          {tbTab==="users" && (
            <div className="adm-card" style={{background:"rgba(255,255,255,0.85)",borderRadius:10,padding:"14px 16px",border:"1px solid rgba(0,0,0,0.07)",display:"flex",flexDirection:"column",gap:10}}>
              <div style={{fontSize:10,fontWeight:700,color:"#9ca3af",letterSpacing:0.5,marginBottom:2}}>★ CE PERSO — synchronisé pour les 4</div>
              {/* Avatar + Bannière */}
              <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <label style={{width:56,height:56,borderRadius:8,overflow:"hidden",background:tbProfile.avatarBg||"#8e7cc3",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:20,cursor:"pointer",border:"1px solid rgba(0,0,0,0.1)"}}>
                    {d.avatar?<img src={d.avatar} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(d.username||"?")[0].toUpperCase()}
                    <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new UploadReader();r.onload=ev=>{upd("avatar",ev.target.result);onUpdate("_sharedAvatars",{...(data.sharedThreads?._sharedAvatars||{}),[tab]:ev.target.result});};r.readAsDataURL(f);e.target.value="";}}/>
                  </label>
                  <span style={{fontSize:9,color:"#888"}}>Photo de profil</span>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,flex:"1 1 140px",minWidth:0}}>
                  <label style={{width:"100%",height:48,borderRadius:8,overflow:"hidden",background:tbProfile.coverColor||"#2c3e50",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11,cursor:"pointer",border:"1px solid rgba(0,0,0,0.1)"}}>
                    {tbProfile.cover?<img src={tbProfile.cover} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:"📷 Bannière"}
                    <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new UploadReader();r.onload=ev=>updTbProfile({cover:ev.target.result});r.readAsDataURL(f);e.target.value="";}}/>
                  </label>
                  <span style={{fontSize:9,color:"#888"}}>Bannière du header</span>
                </div>
                {d.avatar && <button onClick={()=>{upd("avatar",null);onUpdate("_sharedAvatars",{...(data.sharedThreads?._sharedAvatars||{}),[tab]:null});}} style={{fontSize:10,color:"#ef4444",background:"none",border:"none",cursor:"pointer",padding:0,alignSelf:"flex-start",marginTop:18}}>Suppr. avatar</button>}
              </div>
              {/* Champs */}
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <Field label="Handle Tumblr" value={tbProfile.handle||""} onChange={v=>updTbProfile({handle:v})} style={{flex:"1 1 140px"}}/>
                <Field label="Followers" value={String(tbProfile.followers||"")} onChange={v=>updTbProfile({followers:parseInt(v)||0})} width="80px"/>
                <Field label="Following" value={String(tbProfile.following||"")} onChange={v=>updTbProfile({following:parseInt(v)||0})} width="80px"/>
              </div>
              <Field label="Bio" value={tbProfile.bio||""} onChange={v=>updTbProfile({bio:v})} textarea/>
              {tbProfile.cover && <button onClick={()=>updTbProfile({cover:null})} style={{fontSize:10,color:"#ef4444",background:"none",border:"none",cursor:"pointer",padding:0,alignSelf:"flex-start"}}>× Supprimer la bannière</button>}
            </div>
          )}

          {/* ── MES POSTS PARTAGÉS ── */}
          {tbTab==="shared" && (
            <SharedPostsEditor
              posts={sharedPosts} onChange={updShared} tab={tab} accent={TB_COLOR}
              fieldMap={{text:"body", img:"img", time:"date"}}
              showTitle statFields={[{key:"notes",label:"Notes"}]}
              addExtra={{username:tbProfile.handle||""}} addLabel="+ Post Tumblr" textLabel="Texte"
              hint="Seul toi peux modifier ou supprimer tes propres posts. Ils apparaissent dans le fil de tous les persos."
            />
          )}

          {/* ── FIL DÉCORATIF ── */}
          {tbTab==="feed" && (()=>{
            const effectiveFeedRaw = d.tumblr?.feedPosts || [];
            const updFeed = (list) => upd("tumblr",{...(d.tumblr||{}),feedPosts:list});
            const fkey = (p) => { const t=parseLoreTime(p.date); return t?t.month*44640+t.day*1440+(t.hour||0)*60+(t.min||0):-Infinity; };
            const effectiveFeed = [...effectiveFeedRaw].sort((a,b)=>fkey(b)-fkey(a));
            const updAt = (id,i,patch) => updFeed(effectiveFeedRaw.map((p2,j)=> (id!=null?p2.id===id:j===i) ? {...p2,...patch} : p2));
            return (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{fontSize:11,color:"#6b7280",lineHeight:1.5}}>Tweets décoratifs de comptes fictifs visibles dans la timeline de <strong>{CHAR_NAMES[tab]||tab}</strong> uniquement — non partagés entre persos. Triés du plus récent au plus ancien — clique pour déplier.</div>
                {effectiveFeed.map((post,i)=>{
                  const tid = post.id??i;
                  const isOpen = tbFeedOpen.has(tid);
                  const toggle = toggleInSet(setTbFeedOpen);
                  return (
                  <div key={tid} className="adm-card" style={{background:"rgba(255,255,255,0.85)",borderRadius:10,border:"1px solid rgba(0,0,0,0.07)",overflow:"hidden"}}>
                    <div onClick={()=>toggle(tid)} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 12px",cursor:"pointer"}}>
                      <div style={{width:30,height:30,borderRadius:6,overflow:"hidden",background:post.avatar?"transparent":(post.avatarBg||"#8e7cc3"),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:13,color:"#fff",fontWeight:700}}>
                        {post.avatar?<img src={post.avatar} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(post.username||"?")[0]?.toUpperCase()}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,color:"#374151",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{post.username?`@${post.username}`:<em style={{color:"#9ca3af"}}>(sans pseudo)</em>} {post.body?`— ${post.body}`:""}</div>
                        <div style={{fontSize:10,color:"#9ca3af"}}>{post.date||"—"}</div>
                      </div>
                      <AdminChevron open={isOpen}/>
                    </div>
                    {isOpen && (
                    <div style={{display:"flex",gap:10,alignItems:"flex-start",padding:"0 12px 12px"}}>
                    {/* Avatar du compte */}
                    <label style={{width:44,height:44,borderRadius:6,overflow:"hidden",background:post.avatar?"transparent":(post.avatarBg||"#8e7cc3"),display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,border:"1px solid rgba(0,0,0,0.08)",fontSize:16,color:"#fff",fontWeight:700}}>
                      {post.avatar?<img src={post.avatar} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(post.username||"?")[0]?.toUpperCase()}
                      <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                        const f=e.target.files?.[0]; if(!f) return;
                        const r=new UploadReader(); r.onload=ev=>updAt(post.id,i,{avatar:ev.target.result}); r.readAsDataURL(f); e.target.value="";
                      }}/>
                    </label>
                    <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:6}}>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"flex-end"}}>
                      <Field label="Pseudo" value={post.username||""} onChange={v=>updAt(post.id,i,{username:v})} width="130px"/>
                      <Field label="Titre (opt.)" value={post.title||""} onChange={v=>updAt(post.id,i,{title:v})} style={{flex:1}}/>
                      <LoreDateTimeInput value={post.date||""} onChange={v=>updAt(post.id,i,{date:v})} width="190px" showLabel={true}/>
                      <Field label="Notes" value={String(post.notes||0)} onChange={v=>updAt(post.id,i,{notes:parseInt(v)||0})} width="70px"/>
                      {post.avatar && <button onClick={()=>updAt(post.id,i,{avatar:null})} style={{fontSize:10,color:"#ef4444",background:"none",border:"none",cursor:"pointer",padding:0,alignSelf:"center"}}>× Suppr. photo</button>}
                      <button onClick={()=>updFeed(effectiveFeedRaw.filter(p2=>post.id!=null ? p2.id!==post.id : p2!==post))} className="adm-del-btn" style={{background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:11,marginTop:18}}>✕</button>
                    </div>
                    <Field label="Texte" value={post.body||""} onChange={v=>updAt(post.id,i,{body:v})} textarea/>
                    </div>
                    </div>
                    )}
                  </div>
                  );
                })}
                <button onClick={()=>updFeed([{id:Date.now(),username:"",avatarBg:"#8e7cc3",body:"",notes:0,date:"1 oct",type:"text"},...effectiveFeedRaw])}
                  style={{background:"rgba(53,70,92,0.08)",border:"1px dashed rgba(53,70,92,0.4)",color:TB_COLOR,borderRadius:8,padding:"10px 18px",cursor:"pointer",fontSize:12,fontWeight:600}}>+ Post du fil</button>
              </div>
            );
          })()}
        </div>
      );
    }

    case "insta": {
      const IG_COLOR = "#3d6b8f";
      const igProfile = d.instagram || {};
      const igPosts   = igProfile.posts || [];
      const sharedIgPosts = data.sharedThreads?._sharedInstaPosts || [];
      // Toujours lire depuis dataRef pour éviter les closures périmées → Firebase reçoit bien les données fraîches
      const updIg = (patch) => {
        const fresh = dataRef.current[tab] || {};
        const freshIg = fresh.instagram || {};
        onUpdate(tab, {...fresh, instagram: {...freshIg, ...patch}});
      };
      const updPosts  = (list) => {
        const fresh = dataRef.current[tab] || {};
        const freshIg = fresh.instagram || {};
        onUpdate(tab, {...fresh, instagram: {...freshIg, posts: list}});
      };
      // Même fix anti-écrasement que Facebook/Twitter/Tumblr : ne jamais réécrire tout le tableau
      // à partir d'un `data` potentiellement périmé. On relit dataRef et on ne touche qu'aux posts
      // de "tab", en préservant ceux des autres persos tels qu'ils sont en base.
      const updSharedIg = (list) => {
        const freshShared = dataRef.current.sharedThreads?._sharedInstaPosts || [];
        const others = freshShared.filter(p => p.author !== tab);
        const mine = list.filter(p => p.author === tab);
        onUpdate("_sharedInstaPosts", [...mine, ...others]);
      };

      const decoIg = d.instagramDecorative || [];
      const updDecoIg = (list) => upd("instagramDecorative", list);

      const SubTabs = [["profile","👤 Profil"],["posts","📷 Ma grille"],["feed","🏠 Fil partagé"],["deco","🌐 Comptes déco"]];
      return (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* Tab bar */}
          <div style={{display:"flex",gap:0,background:"rgba(0,0,0,0.05)",borderRadius:8,padding:2,alignSelf:"flex-start"}}>
            {SubTabs.map(([k,label])=>(
              <button key={k} onClick={()=>setIgTab(k)} style={{
                padding:"6px 14px",border:"none",borderRadius:6,cursor:"pointer",fontSize:11,
                fontWeight:igTab===k?700:400,
                background:igTab===k?"#fff":"transparent",
                color:igTab===k?IG_COLOR:"#6b7280",
                boxShadow:igTab===k?"0 1px 3px rgba(0,0,0,0.1)":"none",
                whiteSpace:"nowrap",
              }}>{label}</button>
            ))}
          </div>

          {/* ── PROFIL ── */}
          {igTab==="profile" && (
            <div style={{background:"rgba(255,255,255,0.85)",borderRadius:10,padding:"14px 16px",border:"1px solid rgba(0,0,0,0.07)",display:"flex",flexDirection:"column",gap:10}}>
              <div style={{fontSize:10,fontWeight:700,color:"#9ca3af",letterSpacing:0.5}}>★ CE PERSO</div>
              {/* Photo de profil Instagram spécifique */}
              <div style={{display:"flex",gap:12,alignItems:"center"}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <label style={{width:60,height:60,borderRadius:6,overflow:"hidden",background:"#e0e0e0",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",border:"1px solid rgba(0,0,0,0.1)",flexShrink:0}}>
                    {igProfile.avatar
                      ? <img src={igProfile.avatar} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                      : (d.avatar ? <img src={d.avatar} style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <span style={{fontSize:22,color:"#aaa"}}>👤</span>)
                    }
                    <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                      const f=e.target.files?.[0];if(!f)return;
                      const r=new UploadReader();
                      r.onload=ev=>updIg({avatar:ev.target.result});
                      r.readAsDataURL(f);e.target.value="";
                    }}/>
                  </label>
                  <span style={{fontSize:9,color:"#888",textAlign:"center"}}>Photo Insta</span>
                </div>
                <div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
                  <Field label="Nom affiché" value={igProfile.displayName||""} onChange={v=>updIg({displayName:v})} style={{width:"100%"}}/>
                  {igProfile.avatar && <button onClick={()=>updIg({avatar:null})} style={{fontSize:10,color:"#ef4444",background:"none",border:"none",cursor:"pointer",padding:0,alignSelf:"flex-start"}}>× Suppr. photo Insta</button>}
                </div>
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <Field label="Handle (@)" value={igProfile.handle||""} onChange={v=>updIg({handle:v})} style={{flex:"1 1 140px"}}/>
                <Field label="Followers" value={String(igProfile.followers??"")} onChange={v=>updIg({followers:parseInt(v)||0})} width="80px"/>
                <Field label="Following" value={String(igProfile.following??"")} onChange={v=>updIg({following:parseInt(v)||0})} width="80px"/>
              </div>
              <Field label="Bio" value={igProfile.bio||""} onChange={v=>updIg({bio:v})} textarea/>
              <Field label="Lien (optionnel)" value={igProfile.link||""} onChange={v=>updIg({link:v})} style={{width:"100%"}}/>
            </div>
          )}

          {/* ── POSTS ── */}
          {igTab==="posts" && (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <div style={{fontSize:11,color:"#6b7280",lineHeight:1.5}}>Photos visibles dans la grille Instagram du perso. Chaque post peut avoir une légende, des likes et des commentaires, plusieurs photos, un tag (post en commun avec un autre perso), et être épinglé en tête de grille. Triés du plus récent au plus ancien (épinglé toujours en premier) — clique sur un post pour le déplier.</div>
              {sortIgDesc(igPosts).map((post,i)=>{
                const isOpen = igPostsOpen.has(post.id??i);
                const toggle = toggleInSet(setIgPostsOpen);
                const updPost = (patch) => {
                  const fresh = dataRef.current[tab] || {};
                  const freshIg = fresh.instagram || {};
                  const fp = (freshIg.posts||[]).map(p2 => p2.id===post.id ? {...p2,...patch} : p2);
                  onUpdate(tab, {...fresh, instagram: {...freshIg, posts: fp}});
                };
                const setPinned = (val) => {
                  // Un seul post épinglé à la fois : on dépose les autres en même temps qu'on pose celui-ci.
                  const fresh = dataRef.current[tab] || {};
                  const freshIg = fresh.instagram || {};
                  const fp = (freshIg.posts||[]).map(p2 => ({...p2, pinned: p2.id===post.id ? val : false}));
                  onUpdate(tab, {...fresh, instagram: {...freshIg, posts: fp}});
                };
                const photos = post.photos&&post.photos.length ? post.photos : (post.src?[post.src]:[]);
                const setPhotos = (list) => updPost({photos:list, src:list[0]||null});
                const otherChars = ["glinda","eoghan","drew","elias"].filter(ck=>ck!==tab);
                return (
                  <div key={post.id||i} style={{background:"rgba(255,255,255,0.85)",borderRadius:10,border:"1px solid rgba(0,0,0,0.07)",overflow:"hidden"}}>
                    {/* En-tête repliable */}
                    <div onClick={()=>toggle(post.id??i)} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 12px",cursor:"pointer"}}>
                      <div style={{width:36,height:36,borderRadius:6,overflow:"hidden",background:"#efefef",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,position:"relative"}}>
                        {photos[0]?<img src={photos[0]} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:16}}>📷</span>}
                        {post.pinned && <span style={{position:"absolute",top:-2,right:-2,fontSize:10}}>📌</span>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,color:"#374151",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{post.caption||<em style={{color:"#9ca3af"}}>(sans légende)</em>}</div>
                        <div style={{fontSize:10,color:"#9ca3af"}}>{post.date||"—"}{post.archived?" · archivé":""}{post.taggedWith?` · avec ${CHAR_NAMES[post.taggedWith]||post.taggedWith}`:""}{photos.length>1?` · ${photos.length} photos`:""}</div>
                      </div>
                      <AdminChevron open={isOpen}/>
                    </div>
                    {isOpen && (
                    <div style={{display:"flex",flexDirection:"column",gap:8,padding:"0 12px 12px"}}>
                    {/* Galerie de photos (plusieurs possibles) */}
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"flex-start"}}>
                      {photos.map((src,pi)=>(
                        <div key={pi} style={{position:"relative",width:70,height:70,flexShrink:0}}>
                          <img src={src} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:6,border:"1px solid rgba(0,0,0,0.08)"}}/>
                          <button onClick={()=>setPhotos(photos.filter((_,j)=>j!==pi))} style={{position:"absolute",top:-5,right:-5,background:"#ef4444",border:"2px solid #fff",color:"#fff",borderRadius:"50%",width:18,height:18,fontSize:10,cursor:"pointer",lineHeight:1,padding:0}}>✕</button>
                          {pi>0 && <button onClick={()=>{const l=[...photos];[l[pi-1],l[pi]]=[l[pi],l[pi-1]];setPhotos(l);}} title="Avancer" style={{position:"absolute",bottom:2,left:2,background:"rgba(0,0,0,0.55)",border:"none",color:"#fff",borderRadius:4,width:16,height:16,fontSize:9,cursor:"pointer",lineHeight:1,padding:0}}>‹</button>}
                          {pi===0 && <span style={{position:"absolute",bottom:2,left:2,background:"rgba(0,0,0,0.55)",color:"#fff",fontSize:8,borderRadius:3,padding:"1px 4px"}}>1ère</span>}
                        </div>
                      ))}
                      <label style={{width:70,height:70,borderRadius:6,overflow:"hidden",background:"#efefef",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,border:"1px dashed rgba(0,0,0,0.2)"}}>
                        <span style={{fontSize:20,color:"#9ca3af"}}>+</span>
                        <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                          const f=e.target.files?.[0];if(!f)return;
                          const r=new UploadReader();
                          r.onload=ev=>setPhotos([...photos, ev.target.result]);
                          r.readAsDataURL(f);e.target.value="";
                        }}/>
                      </label>
                    </div>
                    <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                      <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:6}}>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"flex-end"}}>
                          <LoreDateTimeInput value={post.date||""} onChange={v=>updPost({date:v})} width="160px" showLabel={true}/>
                          <Field label="Likes" value={String(post.likes??"")} onChange={v=>updPost({likes:parseInt(v)||0})} width="70px"/>
                          <Field label="📍 Lieu" value={post.location||""} onChange={v=>updPost({location:v||null})} style={{flex:1,minWidth:100}}/>
                          <div style={{display:"flex",flexDirection:"column",gap:2}}>
                            <label style={{color:"#9ca3af",fontSize:9,letterSpacing:0.5,fontWeight:600,textTransform:"uppercase"}}>Avec (tag)</label>
                            <select value={post.taggedWith||""} onChange={e=>updPost({taggedWith:e.target.value||null})} className="adm-input" style={{background:"rgba(255,255,255,0.9)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a1a2e",padding:"6px 8px",fontSize:12,borderRadius:7}}>
                              <option value="">— Aucun —</option>
                              {otherChars.map(ck=><option key={ck} value={ck}>{CHAR_NAMES[ck]||ck}</option>)}
                            </select>
                          </div>
                          <div style={{display:"flex",alignItems:"flex-end",gap:10}}>
                            <label style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#6b7280",cursor:"pointer",paddingBottom:4}}>
                              <input type="checkbox" checked={!!post.pinned} onChange={e=>setPinned(e.target.checked)} style={{cursor:"pointer"}}/>
                              📌 Épinglé
                            </label>
                            <label style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#6b7280",cursor:"pointer",paddingBottom:4}}>
                              <input type="checkbox" checked={!!post.archived} onChange={e=>updPost({archived:e.target.checked})} style={{cursor:"pointer"}}/>
                              Archivé
                            </label>
                          </div>
                          <button onClick={()=>updPosts(igPosts.filter(p2=>p2.id!==post.id))} style={{background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:11,alignSelf:"flex-end"}}>✕</button>
                        </div>
                        <Field label="Légende" value={post.caption||""} onChange={v=>updPost({caption:v})} textarea/>
                      </div>
                    </div>
                    {/* Commentaires */}
                    <IgCommentEditor comments={post.comments||[]} onChange={cm=>updPost({comments:cm})} accentColor={IG_COLOR}/>
                    </div>
                    )}
                  </div>
                );
              })}
              <button onClick={()=>updPosts([...igPosts,{id:Date.now(),src:null,photos:[],pinned:false,taggedWith:null,caption:"",likes:0,date:"Oct 2012",location:null,comments:[],archived:false}])}
                style={{background:"rgba(61,107,143,0.08)",border:"1px dashed rgba(61,107,143,0.4)",color:IG_COLOR,borderRadius:8,padding:"10px 18px",cursor:"pointer",fontSize:12,fontWeight:600}}>+ Post Instagram</button>
            </div>
          )}

          {/* ── FIL PARTAGÉ ── */}
          {igTab==="feed" && (()=>{
            const myHandle = igProfile.handle || d.username || tab;
            const myPosts = sortIgDesc(sharedIgPosts.filter(p=>p.author===tab));
            return (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{fontSize:11,color:"#6b7280",lineHeight:1.5,background:"rgba(61,107,143,0.07)",border:"1px solid rgba(61,107,143,0.2)",borderRadius:8,padding:"8px 12px"}}>
                  Posts visibles dans le <strong>fil d'accueil</strong> de tous les persos. Seul toi peux modifier ou supprimer tes propres posts. Triés du plus récent au plus ancien — clique pour déplier.
                </div>
                {myPosts.map((post,i)=>{
                  const isOpen = igFeedOpen.has(post.id??i);
                  const toggle = toggleInSet(setIgFeedOpen);
                  const updPost = (patch) => { const list=sharedIgPosts.map(p2=>p2.id===post.id?{...p2,...patch}:p2); updSharedIg(list); };
                  return (
                    <div key={post.id||i} style={{background:"rgba(255,255,255,0.85)",borderRadius:10,border:"1px solid rgba(0,0,0,0.07)",overflow:"hidden"}}>
                      <div onClick={()=>toggle(post.id??i)} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 12px",cursor:"pointer"}}>
                        <div style={{width:36,height:36,borderRadius:6,overflow:"hidden",background:"#efefef",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          {post.src?<img src={post.src} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:16}}>📷</span>}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,color:"#374151",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{post.caption||<em style={{color:"#9ca3af"}}>(sans légende)</em>}</div>
                          <div style={{fontSize:10,color:"#9ca3af"}}>{post.date||"—"}</div>
                        </div>
                        <AdminChevron open={isOpen}/>
                      </div>
                      {isOpen && (
                      <div style={{display:"flex",gap:10,alignItems:"flex-start",padding:"0 12px 12px"}}>
                        <label style={{width:64,height:64,borderRadius:6,overflow:"hidden",background:"#efefef",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,border:"1px solid rgba(0,0,0,0.08)"}}>
                          {post.src?<img src={post.src} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:22}}>📷</span>}
                          <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                            const f=e.target.files?.[0];if(!f)return;
                            const r=new UploadReader();
                            r.onload=ev=>{
                              const list=[...((dataRef.current.sharedThreads?._sharedInstaPosts)||[])];
                              const ii=list.findIndex(p=>p.id===post.id);
                              if(ii>=0){list[ii]={...list[ii],src:ev.target.result};updSharedIg(list);}
                            };
                            r.readAsDataURL(f);e.target.value="";
                          }}/>
                        </label>
                        <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:6}}>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                            <LoreDateTimeInput value={post.date||""} onChange={v=>updPost({date:v})} width="160px" showLabel={true}/>
                            <Field label="Likes" value={String(post.likes??"")} onChange={v=>updPost({likes:parseInt(v)||0})} width="70px"/>
                            <Field label="📍 Lieu" value={post.location||""} onChange={v=>updPost({location:v||null})} style={{flex:1,minWidth:100}}/>
                            <button onClick={()=>updSharedIg(sharedIgPosts.filter(p2=>p2.id!==post.id))} style={{background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:11,alignSelf:"flex-end"}}>✕</button>
                          </div>
                          <Field label="Légende" value={post.caption||""} onChange={v=>updPost({caption:v})} textarea/>
                        </div>
                      </div>
                      )}
                    </div>
                  );
                })}
                {sharedIgPosts.filter(p=>p.author!==tab).length>0&&(
                  <div style={{fontSize:11,color:"#9ca3af",padding:"4px 0"}}>
                    {sharedIgPosts.filter(p=>p.author!==tab).length} post(s) d'autres persos dans le fil (non modifiables ici).
                  </div>
                )}
                <button onClick={()=>updSharedIg([...sharedIgPosts,{id:Date.now(),author:tab,handle:myHandle,avatar:dataRef.current[tab]?.avatar||null,src:null,caption:"",likes:0,date:"Oct 2012",location:null,comments:[]}])}
                  style={{background:"rgba(61,107,143,0.08)",border:"1px dashed rgba(61,107,143,0.4)",color:IG_COLOR,borderRadius:8,padding:"10px 18px",cursor:"pointer",fontSize:12,fontWeight:600}}>+ Mon post dans le fil</button>
              </div>
            );
          })()}

          {/* ── COMPTES DÉCO ── */}
          {igTab==="deco" && (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <div style={{fontSize:11,color:"#6b7280",lineHeight:1.5}}>Posts de comptes fictifs visibles dans le fil de <strong>{CHAR_NAMES[tab]||tab}</strong> uniquement — non partagés entre persos. Même principe que la "Timeline déco" sur Twitter ou le "Fil" sur Tumblr. Triés du plus récent au plus ancien — clique pour déplier.</div>
              {sortIgDesc(decoIg).map((post,i)=>{
                const isOpen = igDecoOpen.has(post.id??i);
                const toggle = toggleInSet(setIgDecoOpen);
                const updDeco = (patch) => updDecoIg(decoIg.map(p2=>p2.id===post.id?{...p2,...patch}:p2));
                return (
                  <div key={post.id??i} className="adm-card" style={{background:"rgba(255,255,255,0.85)",borderRadius:10,border:"1px solid rgba(0,0,0,0.07)",overflow:"hidden"}}>
                    <div onClick={()=>toggle(post.id??i)} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 12px",cursor:"pointer"}}>
                      <div style={{width:30,height:30,borderRadius:"50%",overflow:"hidden",background:"#efefef",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:13,fontWeight:700,color:"#9ca3af"}}>
                        {post.avatar?<img src={post.avatar} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(post.handle||"?")[0]?.toUpperCase()}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,color:"#374151",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{post.handle?`@${post.handle}`:<em style={{color:"#9ca3af"}}>(sans handle)</em>} {post.caption?`— ${post.caption}`:""}</div>
                        <div style={{fontSize:10,color:"#9ca3af"}}>{post.date||"—"}</div>
                      </div>
                      <AdminChevron open={isOpen}/>
                    </div>
                    {isOpen && (
                    <div style={{display:"flex",gap:10,alignItems:"flex-start",padding:"0 12px 12px"}}>
                    {/* Avatar du compte */}
                    <label style={{width:48,height:48,borderRadius:"50%",overflow:"hidden",background:"#efefef",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,border:"1px solid rgba(0,0,0,0.08)",fontSize:18,fontWeight:700,color:"#9ca3af"}}>
                      {post.avatar?<img src={post.avatar} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(post.handle||"?")[0]?.toUpperCase()}
                      <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                        const f=e.target.files?.[0]; if(!f) return;
                        const r=new UploadReader(); r.onload=ev=>updDeco({avatar:ev.target.result}); r.readAsDataURL(f); e.target.value="";
                      }}/>
                    </label>
                    {/* Photo du post */}
                    <label style={{width:64,height:64,borderRadius:6,overflow:"hidden",background:"#efefef",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,border:"1px solid rgba(0,0,0,0.08)"}}>
                      {post.src?<img src={post.src} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:22}}>📷</span>}
                      <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                        const f=e.target.files?.[0]; if(!f) return;
                        const r=new UploadReader(); r.onload=ev=>updDeco({src:ev.target.result}); r.readAsDataURL(f); e.target.value="";
                      }}/>
                    </label>
                    <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:6}}>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                        <Field label="Handle" value={post.handle||""} onChange={v=>updDeco({handle:v})} style={{flex:1,minWidth:100}} placeholder="ex: stephenking"/>
                        <LoreDateTimeInput value={post.date||""} onChange={v=>updDeco({date:v})} width="160px" showLabel={true}/>
                        <Field label="Likes" value={String(post.likes??"")} onChange={v=>updDeco({likes:parseInt(v)||0})} width="70px"/>
                        {post.avatar && <button onClick={()=>updDeco({avatar:null})} style={{fontSize:10,color:"#ef4444",background:"none",border:"none",cursor:"pointer",padding:0,alignSelf:"center"}}>× Suppr. photo</button>}
                        <button onClick={()=>updDecoIg(decoIg.filter(p2=>p2.id!==post.id))} style={{background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:11,alignSelf:"flex-start"}}>✕</button>
                      </div>
                      <Field label="Légende" value={post.caption||""} onChange={v=>updDeco({caption:v})} textarea/>
                    </div>
                    </div>
                    )}
                  </div>
                );
              })}
              <button onClick={()=>updDecoIg([{id:Date.now(),handle:"",avatar:null,src:null,caption:"",likes:0,date:"1 oct",location:null,comments:[]},...decoIg])}
                style={{background:"rgba(61,107,143,0.08)",border:"1px dashed rgba(61,107,143,0.4)",color:IG_COLOR,borderRadius:8,padding:"10px 18px",cursor:"pointer",fontSize:12,fontWeight:600}}>+ Post déco</button>
            </div>
          )}
        </div>
      );
    }

    case "reddit": return (
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {(()=>{
          const isCustom = (d.reddit||[]).length > 0;
          const effective = isCustom ? (d.reddit||[]) : REDDIT_ALL_POSTS;
          const updList = (newList) => upd("reddit", newList);
          return (<>
                        {effective.map((post,i)=>(
              <div key={post.id??i} className="adm-card" style={{display:"flex",gap:8,alignItems:"center",background:"rgba(255,255,255,0.85)",padding:"8px 10px",borderRadius:10,border:"1px solid rgba(0,0,0,0.07)",flexWrap:"wrap",opacity:isCustom?1:0.75}}>
                <Field label="Sub" value={post.sub||""} onChange={v=>{const r=[...effective].map((p,j)=>({...p,id:p.id||Date.now()+j}));r[i]={...r[i],sub:v};updList(r);}} width="120px"/>
                <Field label="Titre" value={post.title||""} onChange={v=>{const r=[...effective].map((p,j)=>({...p,id:p.id||Date.now()+j}));r[i]={...r[i],title:v};updList(r);}}/>
                <Field label="Pts" value={String(post.pts||"")} onChange={v=>{const r=[...effective].map((p,j)=>({...p,id:p.id||Date.now()+j}));r[i]={...r[i],pts:v};updList(r);}} width="70px"/>
                <Field label="Comm." value={String(post.comm||0)} onChange={v=>{const r=[...effective].map((p,j)=>({...p,id:p.id||Date.now()+j}));r[i]={...r[i],comm:parseInt(v)||0};updList(r);}} width="60px"/>
                <Field label="Âge" value={post.age||""} onChange={v=>{const r=[...effective].map((p,j)=>({...p,id:p.id||Date.now()+j}));r[i]={...r[i],age:v};updList(r);}} width="60px"/>
                <button onClick={()=>updList(effective.filter((_,j)=>j!==i))} className="adm-del-btn" style={{background:"none",border:"none",color:"#d1d5db",cursor:"pointer",fontSize:16,padding:"0 4px",borderRadius:5}}>×</button>
              </div>
            ))}
            <button onClick={()=>updList([...effective.map((p,j)=>({...p,id:p.id||Date.now()+j})),{id:Date.now(),sub:"r/",title:"",pts:"0",comm:0,age:"1h",saved:false}])} style={{background:"rgba(255,69,0,0.08)",border:"1px dashed rgba(255,69,0,0.35)",color:"#ff4500",borderRadius:8,padding:"10px 18px",cursor:"pointer",fontSize:12,fontWeight:600}}>+ Post</button>
          </>);
        })()}
      </div>
    );

    case "calendar": return (
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {(()=>{
          const seed = CALENDAR_SEED[tab] || {};
          const defaults = Object.entries(seed).flatMap(([day,evts])=>
            (evts||[]).map((title,j)=>({id:day+"_"+j,day:Number(day),month:10,year:2012,title,time:"",location:""}))
          ).sort((a,b)=>a.day-b.day);
          const isCustom = (d.calendar||[]).length > 0;
          const effective = isCustom ? [...(d.calendar||[])].sort((a,b)=>{ const ad=(a.year||2012)*10000+(a.month||10)*100+(a.day||0); const bd=(b.year||2012)*10000+(b.month||10)*100+(b.day||0); return ad-bd; }) : defaults;
          const updList = (newList) => upd("calendar", newList);
          const ensureCustom = (i, patch) => {
            if(isCustom) { updList(effective.map((e,j)=>j===i?{...e,...patch}:e)); }
            else { updList(defaults.map((e,j)=>j===i?{...e,...patch,id:Date.now()+j}:{...e,id:Date.now()+j})); }
          };
          const MONTHS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
          // Group by day key
          const grouped = effective.reduce((acc,ev,i)=>{
            const k=`${ev.year||2012}-${String(ev.month||10).padStart(2,"0")}-${String(ev.day||1).padStart(2,"0")}`;
            if(!acc[k]) acc[k]={label:`${ev.day||1} ${MONTHS[(ev.month||10)-1]} ${ev.year||2012}`,indices:[]};
            acc[k].indices.push(i);
            return acc;
          }, {});
          const dayKeys = Object.keys(grouped).sort();
          const [openDays, setOpenDays] = [calCollapsedSet, setCalCollapsedSet];
          const toggleDay = k => setOpenDays(prev=>{const s=new Set(prev);s.has(k)?s.delete(k):s.add(k);return s;});
          const CAL_RED="#e04444";
          return (<>
            
            {dayKeys.map(k=>{
              const {label, indices} = grouped[k];
              const isOpen = openDays.has(k);
              return (
                <div key={k}>
                  {/* Day header — togglable */}
                  <button onClick={()=>toggleDay(k)} style={{width:"100%",display:"flex",alignItems:"center",gap:8,minHeight:44,WebkitTapHighlightColor:"transparent",background:"rgba(224,68,68,0.07)",border:"1px solid rgba(224,68,68,0.18)",borderRadius:8,padding:"7px 12px",cursor:"pointer",textAlign:"left"}}>
                    <AdminChevron open={isOpen} size={14}/>
                    <span style={{fontSize:12,fontWeight:700,color:"#c0392b",flex:1}}>{label}</span>
                    <span style={{fontSize:10,color:"#9ca3af"}}>{indices.length} événement{indices.length>1?"s":""}</span>
                  </button>

                  {isOpen && indices.map(i=>{
                    const ev = effective[i];
                    return (
                    <div key={ev.id??i} className="adm-card" style={{background:"rgba(255,255,255,0.9)",borderRadius:"0 0 10px 10px",padding:"10px 12px",border:"1px solid rgba(0,0,0,0.07)",borderTop:"none",display:"flex",flexDirection:"column",gap:7,marginTop:0}}>
                      <Field label="Titre" value={ev.title||""} onChange={v=>ensureCustom(i,{title:v})}/>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                        {/* Date picker — même input type=date que partout ailleurs, s'ouvre sur oct 2012 */}
                        <div style={{display:"flex",flexDirection:"column",gap:2}}>
                          <label style={{color:"#9ca3af",fontSize:10,letterSpacing:0.6,fontWeight:600,textTransform:"uppercase"}}>Date</label>
                          <input type="date"
                            value={`${ev.year||2012}-${String(ev.month||10).padStart(2,"0")}-${String(ev.day||1).padStart(2,"0")}`}
                            onChange={e=>{
                              if(!e.target.value) return;
                              const [y,m,dd]=e.target.value.split("-").map(Number);
                              ensureCustom(i,{year:y,month:m,day:dd});
                            }}
                            className="adm-input"
                            style={{background:"rgba(255,255,255,0.9)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a1a2e",padding:"5px 8px",fontSize:11,borderRadius:7}}/>
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:5,width:"90px"}}>
                          <label style={{color:"#9ca3af",fontSize:10,letterSpacing:0.8,textTransform:"uppercase",fontWeight:600}}>Heure</label>
                          <input type="time" value={ev.time||""} onChange={e=>ensureCustom(i,{time:e.target.value})}
                            className="adm-input" style={{background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a1a2e",padding:"8px 8px",fontSize:12,borderRadius:8,width:"90px"}}/>
                        </div>
                        <Field label="Lieu" value={ev.location||""} onChange={v=>ensureCustom(i,{location:v})} width="130px"/>
                        <button onClick={()=>updList(effective.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:"#d1d5db",cursor:"pointer",fontSize:16,padding:"0 4px",marginTop:18}}>×</button>
                      </div>
                    </div>
                  );})}
                </div>
              );
            })}

            <button onClick={()=>{const today={id:Date.now(),day:1,month:10,year:2012,title:"",time:"",location:""};updList(isCustom?[...effective,today]:([...defaults,today].map((e,j)=>({...e,id:Date.now()+j}))))}}
              style={{background:"rgba(224,68,68,0.08)",border:"1px dashed rgba(224,68,68,0.35)",color:"#e04444",borderRadius:8,padding:"10px 18px",cursor:"pointer",fontSize:12,fontWeight:600}}>+ Événement</button>
          </>);
        })()}
      </div>
    );

    case "weather": return (
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {(()=>{
          const wd = d.weather || {};
          const isCustom = wd.cities && wd.cities.length > 0;
          const cities = isCustom ? wd.cities : WEATHER_DEFAULTS.cities;
          const updCities = (newCities) => upd("weather", {...wd, cities:newCities});
          const ensureCustom = (ci, patch) => {
            const base = isCustom ? cities : WEATHER_DEFAULTS.cities;
            updCities(base.map((c,j)=>j===ci?{...c,...patch}:c));
          };
          const updForecast = (ci, fi, patch) => {
            const base = isCustom ? cities : WEATHER_DEFAULTS.cities;
            updCities(base.map((c,j)=>j!==ci?c:{...c,forecast:(c.forecast||[]).map((f,k)=>k===fi?{...f,...patch}:f)}));
          };
          const COND_ICONS=["☀️","🌤️","⛅","🌥️","☁️","🌧️","⛈️","🌨️","🌫️","🌬️"];
          const DAY_OPTS=["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];
          return (<>

            {cities.map((city,ci)=>(
              <WeatherCityCard key={ci} city={city} ci={ci}
                COND_ICONS={COND_ICONS} DAY_OPTS={DAY_OPTS}
                ensureCustom={ensureCustom} updForecast={updForecast}
                updCities={updCities} cities={cities}/>
            ))}

            <button onClick={()=>updCities([...cities.map((c)=>({...c})),{name:"",current:65,condition:"Clear",condIcon:"☀️",forecast:[],updated:""}])}
              style={{background:"rgba(74,144,217,0.08)",border:"1px dashed rgba(74,144,217,0.35)",color:"#1a6bb5",borderRadius:8,padding:"10px 18px",cursor:"pointer",fontSize:12,fontWeight:600}}>+ Ville</button>
          </>);
        })()}
      </div>
    );

    case "settings": return (
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <Field label="Prénom affiché" value={d.settings?.displayName||d.name||""} onChange={v=>upd("settings",{...(d.settings||{}),displayName:v})}/>
          <Field label="Réseau Wi-Fi" value={d.settings?.wifi||""} onChange={v=>upd("settings",{...(d.settings||{}),wifi:v})} width="150px"/>
          <Field label="Opérateur" value={d.settings?.carrier||""} onChange={v=>upd("settings",{...(d.settings||{}),carrier:v})} width="120px"/>
        </div>
        {tab==="elias" && (()=>{
          const defaultItems = [
            {icon:"👽", title:"ZONE 51 : des témoins parlent", src:"TruthSeekers.net", time:"il y a 2:00am"},
            {icon:"🔺", title:"Les Illuminati et le Nouvel Ordre Mondial : preuves 2012", src:"WakeUpAmerica.org", time:"il y a 5:00am"},
            {icon:"🛸", title:"NASA cache des signaux extraterrestres — documents déclassifiés", src:"AlienTruth.com", time:"il y a 8:00am"},
            {icon:"💉", title:"Chemtrails : analyse chimique indépendante", src:"FreeMinds.net", time:"il y a 1j"},
            {icon:"📡", title:"HAARP et le contrôle météorologique — ce qu'ils ne veulent pas que vous sachiez", src:"DeepState.info", time:"il y a 1j"},
          ];
          const items = d.conspiracyFeed || defaultItems;
          const updItems = (list) => upd("conspiracyFeed", list);
          return (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{color:"#888",fontSize:10,letterSpacing:1,textTransform:"uppercase"}}>Widget "Truth Feed" (écran d'accueil)</div>
              <Field label="Titre du widget" value={d.conspiracyFeedTitle||"TRUTH FEED"} onChange={v=>upd("conspiracyFeedTitle",v)} width="220px"/>
              {items.map((item,i)=>(
                <div key={i} className="adm-card" style={{display:"flex",gap:8,alignItems:"center",background:"rgba(255,255,255,0.85)",padding:10,borderRadius:10,border:"1px solid rgba(0,0,0,0.07)",flexWrap:"wrap"}}>
                  <Field label="Icône" value={item.icon||""} onChange={v=>{const f=[...items];f[i]={...f[i],icon:v};updItems(f);}} width="60px"/>
                  <Field label="Titre" value={item.title||""} onChange={v=>{const f=[...items];f[i]={...f[i],title:v};updItems(f);}} width="220px"/>
                  <Field label="Source" value={item.src||""} onChange={v=>{const f=[...items];f[i]={...f[i],src:v};updItems(f);}} width="140px"/>
                  <Field label="Temps (ex: il y a 2:00am)" value={item.time||""} onChange={v=>{const f=[...items];f[i]={...f[i],time:v};updItems(f);}} width="160px"/>
                  <button onClick={()=>updItems(items.filter((_,j)=>j!==i))}
                    className="adm-del-btn" style={{background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:11}}>✕</button>
                </div>
              ))}
              <button onClick={()=>updItems([...items,{icon:"📰",title:"Nouvel article",src:"source.com",time:"il y a 1:00am"}])}
                style={{background:"rgba(220,38,38,0.08)",border:"1px dashed rgba(220,38,38,0.4)",color:"#dc2626",borderRadius:8,padding:"10px 18px",cursor:"pointer",fontSize:12,fontWeight:600,alignSelf:"flex-start"}}>+ Article</button>
            </div>
          );
        })()}
      </div>
    );

    case "wikipedia": return (
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {(()=>{
          const defaults = WIKI_FEEDS[tab] || WIKI_FEEDS.elias;
          const isCustom = (d.wikipedia||[]).length > 0;
          const effective = isCustom ? (d.wikipedia||[]) : defaults;
          const updList = (newList) => upd("wikipedia", newList);
          return (<>
                        {effective.map((art,i)=>(
              <div key={i} style={{display:"flex",gap:8,alignItems:"center",background:"rgba(255,255,255,0.85)",padding:"8px 10px",borderRadius:10,border:"1px solid rgba(0,0,0,0.07)",opacity:isCustom?1:0.75}}>
                <Field label="Titre" value={art[0]||""} onChange={v=>{const w=[...effective];w[i]=[v,art[1]||"",art[2]||""];updList(w);}}/>
                <Field label="Extrait" value={art[1]||""} onChange={v=>{const w=[...effective];w[i]=[art[0]||"",v,art[2]||""];updList(w);}} width="200px"/>
                <Field label="Date" value={art[2]||""} onChange={v=>{const w=[...effective];w[i]=[art[0]||"",art[1]||"",v];updList(w);}} width="90px"/>
                <button onClick={()=>updList(effective.filter((_,j)=>j!==i))} className="adm-del-btn" style={{background:"none",border:"none",color:"#d1d5db",cursor:"pointer",fontSize:16,padding:"0 4px",borderRadius:5}}>×</button>
              </div>
            ))}
            <button onClick={()=>updList([...effective,["","","1 oct"]])} style={{background:"rgba(91,145,206,0.08)",border:"1px dashed rgba(91,145,206,0.35)",color:"#5b91ce",borderRadius:8,padding:"10px 18px",cursor:"pointer",fontSize:12,fontWeight:600}}>+ Article</button>
          </>);
        })()}
      </div>
    );

    case "files": return (
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {(()=>{
          const files = d.files || {folders:[], rootFiles:[]};
          const folders = files.folders || [];
          const rootFiles = files.rootFiles || [];
          const updFiles = (patch) => upd("files", {...files, ...patch});
          const FILE_TYPES = [".pdf",".mp3",".mp4",".mov",".jpg",".png",".doc",".docx",".xls",".xlsx",".ppt",".zip",".txt",".other"];
          const FOLDER_COLOR = "#a07018";

          return (<>
            {/* Dossiers */}
            <div style={{fontSize:12,fontWeight:700,color:"#374151",letterSpacing:0.3}}>📁 Dossiers</div>
            {folders.map((folder,fi)=>(
              <div key={folder.id||fi} className="adm-card" style={{background:"rgba(255,255,255,0.9)",borderRadius:10,border:"1px solid rgba(0,0,0,0.07)",overflow:"hidden"}}>
                {/* Header du dossier */}
                <div style={{background:"rgba(160,112,24,0.08)",padding:"10px 12px",display:"flex",gap:8,alignItems:"center",borderBottom:"1px solid rgba(0,0,0,0.06)"}}>
                  <span style={{fontSize:20}}>📁</span>
                  <input value={folder.name||""} onChange={e=>{const f=[...folders];f[fi]={...f[fi],name:e.target.value};updFiles({folders:f});}}
                    placeholder="Nom du dossier" className="adm-input"
                    style={{flex:1,background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a1a2e",padding:"6px 10px",fontSize:13,borderRadius:7,fontWeight:600}}/>
                  <button onClick={()=>updFiles({folders:folders.filter((_,j)=>j!==fi)})}
                    className="adm-del-btn" style={{background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:11}}>✕</button>
                </div>
                {/* Fichiers dans ce dossier */}
                <div style={{padding:"8px 12px",display:"flex",flexDirection:"column",gap:6}}>
                  {(()=>{
                    const FILE_EXTS=["pdf","mp3","mp4","mov","jpg","png","doc","docx","xls","xlsx","ppt","zip","txt","other"];
                    const LORE_MONTHS_SHORT=["","jan","fév","mar","avr","mai","juin","juil","août","sep","oct","nov","déc"];
                    const buildDate=(v)=>{if(!v)return"";const[,mo,da]=v.split("-").map(Number);return`${da} ${LORE_MONTHS_SHORT[mo]}`;};
                    const parseDateVal=(d)=>{const m=(d||"").match(/(\d+)\s+(\w+)/);if(m){const mn={jan:1,fév:2,mar:3,avr:4,mai:5,juin:6,juil:7,ao:8,sep:9,oct:10,nov:11,déc:12}[m[2].toLowerCase().slice(0,3)]||1;return`2012-${String(mn).padStart(2,"0")}-${String(m[1]).padStart(2,"0")}`;}return"2012-10-01";};
                    return (folder.files||[]).map((file,fj)=>{
                      const rawExt=(file.name||"").includes(".")?(file.name||"").split(".").pop().toLowerCase():(file.ext||"other");
                      const ext=FILE_EXTS.includes(rawExt)?rawExt:"other";
                      const baseName=(file.name||"").includes(".")?(file.name||"").replace(/\.[^.]+$/,""):(file.name||"");
                      const meta=fileTypeMeta(ext);
                      const updFile=(patch)=>{const f=[...folders];const fs=[...(f[fi].files||[])];fs[fj]={...fs[fj],...patch};f[fi]={...f[fi],files:fs};updFiles({folders:f});};
                      return (
                        <div key={file.id||fj} style={{display:"flex",gap:5,alignItems:"center",background:"rgba(0,0,0,0.02)",borderRadius:7,padding:"6px 8px",border:"1px solid rgba(0,0,0,0.05)",flexWrap:"wrap"}}>
                          <span style={{fontSize:16,flexShrink:0}}>{meta.icon}</span>
                          <input value={baseName} onChange={e=>updFile({name:ext&&ext!=="other"?`${e.target.value}.${ext}`:e.target.value})}
                            placeholder="nom du fichier" className="adm-input"
                            style={{flex:2,minWidth:80,background:"rgba(255,255,255,0.9)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a1a2e",padding:"5px 8px",fontSize:12,borderRadius:6}}/>
                          <select value={ext} onChange={e=>{const newExt=e.target.value;updFile({name:newExt&&newExt!=="other"?`${baseName}.${newExt}`:baseName,ext:newExt});}}
                            className="adm-input" style={{width:72,background:"rgba(255,255,255,0.9)",border:"1px solid rgba(0,0,0,0.1)",color:"#374151",padding:"5px 4px",fontSize:11,borderRadius:6,cursor:"pointer"}}>
                            {FILE_EXTS.map(e=><option key={e} value={e}>{e.toUpperCase()}</option>)}
                          </select>
                          <input type="date" value={parseDateVal(file.date)} 
                            onChange={e=>updFile({date:buildDate(e.target.value)})}
                            className="adm-input" style={{flex:1,minWidth:110,background:"rgba(255,255,255,0.9)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a1a2e",padding:"5px 6px",fontSize:11,borderRadius:6}}/>
                          <input value={file.size||""} onChange={e=>updFile({size:e.target.value})}
                            placeholder="4,7 MB" className="adm-input"
                            style={{width:68,background:"rgba(255,255,255,0.9)",border:"1px solid rgba(0,0,0,0.1)",color:"#6b7280",padding:"5px 8px",fontSize:11,borderRadius:6}}/>
                          <button onClick={()=>{const f=[...folders];f[fi]={...f[fi],files:(f[fi].files||[]).filter((_,k)=>k!==fj)};updFiles({folders:f});}}
                            style={{background:"none",border:"none",color:"#d1d5db",cursor:"pointer",fontSize:14,padding:"0 2px",flexShrink:0}}>×</button>
                        </div>
                      );
                    });
                  })()}
                  <button onClick={()=>{const f=[...folders];f[fi]={...f[fi],files:[...(f[fi].files||[]),{id:Date.now(),name:"",date:"",size:""}]};updFiles({folders:f});}}
                    style={{background:"rgba(160,112,24,0.07)",border:"1px dashed rgba(160,112,24,0.35)",color:FOLDER_COLOR,borderRadius:7,padding:"6px 12px",cursor:"pointer",fontSize:11,fontWeight:600,alignSelf:"flex-start"}}>+ Fichier</button>
                </div>
              </div>
            ))}
            <button onClick={()=>updFiles({folders:[...folders,{id:Date.now(),name:"",files:[]}]})}
              style={{background:"rgba(160,112,24,0.08)",border:"1px dashed rgba(160,112,24,0.4)",color:FOLDER_COLOR,borderRadius:8,padding:"10px 18px",cursor:"pointer",fontSize:12,fontWeight:600}}>+ Dossier</button>

            {/* Fichiers à la racine */}
            <div style={{fontSize:12,fontWeight:700,color:"#374151",letterSpacing:0.3,marginTop:8}}>📄 Fichiers à la racine</div>
            {(()=>{
              const FILE_EXTS=["pdf","mp3","mp4","mov","jpg","png","doc","docx","xls","xlsx","ppt","zip","txt","other"];
              const LORE_MONTHS_SHORT=["","jan","fév","mar","avr","mai","juin","juil","août","sep","oct","nov","déc"];
              const buildDate=(v)=>{if(!v)return"";const[,mo,da]=v.split("-").map(Number);return`${da} ${LORE_MONTHS_SHORT[mo]}`;};
              const parseDateVal=(d)=>{const m=(d||"").match(/(\d+)\s+(\w+)/);if(m){const mn={jan:1,fév:2,mar:3,avr:4,mai:5,juin:6,juil:7,ao:8,sep:9,oct:10,nov:11,déc:12}[m[2].toLowerCase().slice(0,3)]||1;return`2012-${String(mn).padStart(2,"0")}-${String(m[1]).padStart(2,"0")}`;}return"2012-10-01";};
              return rootFiles.map((file,i)=>{
                const rawExt=(file.name||"").includes(".")?(file.name||"").split(".").pop().toLowerCase():(file.ext||"other");
                const ext=FILE_EXTS.includes(rawExt)?rawExt:"other";
                const baseName=(file.name||"").includes(".")?(file.name||"").replace(/\.[^.]+$/,""):(file.name||"");
                const meta=fileTypeMeta(ext);
                const updFile=(patch)=>{const rf=[...rootFiles];rf[i]={...rf[i],...patch};updFiles({rootFiles:rf});};
                return (
                  <div key={file.id||i} style={{display:"flex",gap:5,alignItems:"center",background:"rgba(255,255,255,0.85)",borderRadius:8,padding:"8px 10px",border:"1px solid rgba(0,0,0,0.07)",flexWrap:"wrap"}}>
                    <span style={{fontSize:18,flexShrink:0}}>{meta.icon}</span>
                    <input value={baseName} onChange={e=>updFile({name:ext&&ext!=="other"?`${e.target.value}.${ext}`:e.target.value})}
                      placeholder="nom du fichier" className="adm-input"
                      style={{flex:2,minWidth:80,background:"rgba(255,255,255,0.9)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a1a2e",padding:"6px 9px",fontSize:12,borderRadius:7}}/>
                    <select value={ext} onChange={e=>{const newExt=e.target.value;updFile({name:newExt&&newExt!=="other"?`${baseName}.${newExt}`:baseName,ext:newExt});}}
                      className="adm-input" style={{width:72,background:"rgba(255,255,255,0.9)",border:"1px solid rgba(0,0,0,0.1)",color:"#374151",padding:"6px 4px",fontSize:11,borderRadius:7,cursor:"pointer"}}>
                      {FILE_EXTS.map(e=><option key={e} value={e}>{e.toUpperCase()}</option>)}
                    </select>
                    <input type="date" value={parseDateVal(file.date)} 
                      onChange={e=>updFile({date:buildDate(e.target.value)})}
                      className="adm-input" style={{flex:1,minWidth:110,background:"rgba(255,255,255,0.9)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a1a2e",padding:"6px 6px",fontSize:11,borderRadius:7}}/>
                    <input value={file.size||""} onChange={e=>updFile({size:e.target.value})}
                      placeholder="Taille" className="adm-input"
                      style={{width:68,background:"rgba(255,255,255,0.9)",border:"1px solid rgba(0,0,0,0.1)",color:"#6b7280",padding:"6px 8px",fontSize:11,borderRadius:7}}/>
                    <button onClick={()=>updFiles({rootFiles:rootFiles.filter((_,j)=>j!==i)})}
                      style={{background:"none",border:"none",color:"#d1d5db",cursor:"pointer",fontSize:16,padding:"0 2px",flexShrink:0}}>×</button>
                  </div>
                );
              });
            })()}
            <button onClick={()=>updFiles({rootFiles:[...rootFiles,{id:Date.now(),name:"",date:"",size:""}]})}
              style={{background:"rgba(99,102,241,0.08)",border:"1px dashed rgba(99,102,241,0.4)",color:"#6366f1",borderRadius:8,padding:"10px 18px",cursor:"pointer",fontSize:12,fontWeight:600}}>+ Fichier racine</button>
          </>);
        })()}
      </div>
    );

    case "browser": return (
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {(()=>{
          const b = d.browser || {bookmarks:[], history:[]};
          const upB = (patch) => upd("browser", {...b, ...patch});
          return (<>
            {/* Bookmarks */}
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <div style={{fontSize:12,fontWeight:700,color:"#374151"}}>Favoris</div>
              {(b.bookmarks||[]).map((bm,i)=>(
                <div key={bm.id??i} style={{display:"flex",gap:6,alignItems:"center",background:"rgba(255,255,255,0.85)",padding:"8px 10px",borderRadius:8,border:"1px solid rgba(0,0,0,0.07)"}}>
                  <Field label="Titre" value={bm.title||""} onChange={v=>{const bks=[...b.bookmarks];bks[i]={...bks[i],title:v};upB({bookmarks:bks});}} style={{flex:1}}/>
                  <Field label="URL" value={bm.url||""} onChange={v=>{const bks=[...b.bookmarks];bks[i]={...bks[i],url:v};upB({bookmarks:bks});}} style={{flex:1}}/>
                  <button onClick={()=>upB({bookmarks:b.bookmarks.filter((_,j)=>j!==i)})} style={{background:"none",border:"none",color:"#d1d5db",cursor:"pointer",fontSize:16}}>×</button>
                </div>
              ))}
              <button onClick={()=>upB({bookmarks:[...b.bookmarks,{id:Date.now(),title:"",url:""}]})}
                style={{background:"rgba(59,130,246,0.08)",border:"1px dashed rgba(59,130,246,0.35)",color:"#3b82f6",borderRadius:8,padding:"8px 14px",cursor:"pointer",fontSize:11,fontWeight:600}}>+ Favori</button>
            </div>
            {/* History */}
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <div style={{fontSize:12,fontWeight:700,color:"#374151"}}>Historique</div>
              {(b.history||[]).map((h,i)=>(
                <div key={h.id??i} style={{display:"flex",gap:6,alignItems:"center",background:"rgba(255,255,255,0.85)",padding:"8px 10px",borderRadius:8,border:"1px solid rgba(0,0,0,0.07)"}}>
                  <Field label="Titre" value={h.title||""} onChange={v=>{const hist=[...b.history];hist[i]={...hist[i],title:v};upB({history:hist});}} style={{flex:1}}/>
                  <Field label="URL" value={h.url||""} onChange={v=>{const hist=[...b.history];hist[i]={...hist[i],url:v};upB({history:hist});}} style={{flex:1}}/>
                  <LoreDateTimeInput value={h.time||""} onChange={v=>{const hist=[...b.history];hist[i]={...hist[i],time:v};upB({history:hist});}} width="190px"/>
                  <button onClick={()=>upB({history:b.history.filter((_,j)=>j!==i)})} style={{background:"none",border:"none",color:"#d1d5db",cursor:"pointer",fontSize:16}}>×</button>
                </div>
              ))}
              <button onClick={()=>upB({history:[...b.history,{id:Date.now(),title:"",url:"",time:""}]})}
                style={{background:"rgba(59,130,246,0.08)",border:"1px dashed rgba(59,130,246,0.35)",color:"#3b82f6",borderRadius:8,padding:"8px 14px",cursor:"pointer",fontSize:11,fontWeight:600}}>+ Page</button>
            </div>
          </>);
        })()}
      </div>
    );

    case "kindle": return (
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {(()=>{
          const defaults = KINDLE_DEFAULT_BOOKS.map((b,i)=>({id:i,title:b.t,author:b.a,pct:b.p,cover:null}));
          const isCustom = (d.kindle||[]).length > 0;
          const effective = isCustom ? (d.kindle||[]) : defaults;
          const updList = (newList) => upd("kindle", newList);
          const ensureCustom = (i, patch) => {
            if(isCustom) { updList(effective.map((b,j)=>j===i?{...b,...patch}:b)); }
            else { updList(defaults.map((b,j)=>j===i?{...b,...patch,id:Date.now()+j}:{...b,id:Date.now()+j})); }
          };
          const AMZ="#FF9900";
          return (<>
                        {effective.map((book,i)=>(
              <div key={book.id??i} style={{background:"rgba(255,255,255,0.9)",borderRadius:10,border:"1px solid rgba(0,0,0,0.07)",padding:"10px 12px",display:"flex",gap:10,alignItems:"flex-start"}}>
                {/* Couverture */}
                <label style={{width:44,height:62,borderRadius:3,overflow:"hidden",cursor:"pointer",flexShrink:0,background:`hsl(${(i*60)%360},40%,72%)`,border:"1px solid rgba(0,0,0,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,position:"relative"}}>
                  {book.cover
                    ? <img src={book.cover} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    : <span style={{color:"rgba(0,0,0,0.25)",fontSize:20}}>📚</span>}
                  <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                    const f=e.target.files?.[0]; if(!f) return;
                    const r=new UploadReader(); r.onload=ev=>ensureCustom(i,{cover:ev.target.result}); r.readAsDataURL(f); e.target.value="";
                  }}/>
                </label>
                {/* Champs */}
                <div style={{flex:1,display:"flex",flexDirection:"column",gap:5}}>
                  <Field label="Titre" value={book.title||""} onChange={v=>ensureCustom(i,{title:v})}/>
                  <div style={{display:"flex",gap:6}}>
                    <Field label="Auteur" value={book.author||""} onChange={v=>ensureCustom(i,{author:v})} style={{flex:1}}/>
                    <Field label="% lu" value={String(book.pct||0)} onChange={v=>ensureCustom(i,{pct:Math.min(100,Math.max(0,parseInt(v)||0))})} width="60px"/>
                  </div>
                  {book.cover && <button onClick={()=>ensureCustom(i,{cover:null})} style={{background:"none",border:"none",color:"#9ca3af",cursor:"pointer",fontSize:10,textAlign:"left",padding:0}}>× Supprimer la couverture</button>}
                </div>
                <div style={{display:"flex",gap:4,flexDirection:"column",alignItems:"center",flexShrink:0}}>
                  <MoveButtons 
                    index={i} 
                    length={effective.length}
                    onMoveUp={() => { const l=[...effective]; [l[i-1],l[i]]=[l[i],l[i-1]]; updList(l); }}
                    onMoveDown={() => { const l=[...effective]; [l[i+1],l[i]]=[l[i],l[i+1]]; updList(l); }}
                  />
                  <button onClick={()=>updList(effective.filter((_,j)=>j!==i).map((b,j)=>({...b,id:Date.now()+j})))} style={{background:"none",border:"none",color:"#d1d5db",cursor:"pointer",fontSize:16,padding:"0 2px"}}>×</button>
                </div>
              </div>
            ))}
            <button onClick={()=>updList([...effective.map((b,j)=>isCustom?b:{...b,id:Date.now()+j}),{id:Date.now(),title:"",author:"",pct:0,cover:null}])}
              style={{background:"rgba(255,153,0,0.08)",border:"1px dashed rgba(255,153,0,0.4)",color:AMZ,borderRadius:8,padding:"10px 18px",cursor:"pointer",fontSize:12,fontWeight:600}}>+ Livre</button>
          </>);
        })()}
      </div>
    );

    case "vpn": return (
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        <div style={{fontSize:11,color:"#9ca3af",marginBottom:4}}>Serveurs VPN affichés dans l'appli.</div>
        {(()=>{
          const VPN_DEFAULTS=[{loc:"FR Paris",flag:"🇫🇷",ping:12,load:34},{loc:"DE Frankfurt",flag:"🇩🇪",ping:18,load:51},{loc:"NL Amsterdam",flag:"🇳🇱",ping:22,load:28},{loc:"US New York",flag:"🇺🇸",ping:89,load:62},{loc:"JP Tokyo",flag:"🇯🇵",ping:178,load:19}];
          const isCustom = (d.vpnServers||[]).length > 0;
          const effective = isCustom ? d.vpnServers : VPN_DEFAULTS;
          const patch=(i,p)=>upd("vpnServers",effective.map((s,j)=>j===i?{...s,...p}:s));
          return (<>
          {effective.map((srv,i)=>(
          <div key={i} style={{display:"flex",gap:8,alignItems:"center",background:"rgba(255,255,255,0.85)",padding:"8px 10px",borderRadius:10,border:"1px solid rgba(0,0,0,0.07)",flexWrap:"wrap"}}>
            <input value={srv.flag||""} onChange={e=>patch(i,{flag:e.target.value})}
              placeholder="🏳" className="adm-input" style={{width:44,background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a1a2e",padding:"6px 8px",fontSize:16,borderRadius:7,textAlign:"center"}}/>
            <input value={srv.loc||""} onChange={e=>patch(i,{loc:e.target.value})}
              placeholder="Serveur" className="adm-input" style={{flex:1,background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a1a2e",padding:"6px 9px",fontSize:12,borderRadius:7}}/>
            <input value={String(srv.ping||"")} onChange={e=>patch(i,{ping:parseInt(e.target.value)||0})}
              placeholder="Ping ms" className="adm-input" style={{width:70,background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#6b7280",padding:"6px 8px",fontSize:11,borderRadius:7}}/>
            <input value={String(srv.load||"")} onChange={e=>patch(i,{load:parseInt(e.target.value)||0})}
              placeholder="Load %" className="adm-input" style={{width:70,background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#6b7280",padding:"6px 8px",fontSize:11,borderRadius:7}}/>
            {isCustom && <button onClick={()=>upd("vpnServers",effective.filter((_,j)=>j!==i))}
              className="adm-del-btn" style={{background:"none",border:"none",color:"#d1d5db",cursor:"pointer",fontSize:16,padding:"0 4px",borderRadius:5}}>×</button>}
          </div>
          ))}
          <button onClick={()=>upd("vpnServers",[...effective,{flag:"🏳",loc:"",ping:0,load:0}])}
            style={{background:"rgba(91,145,206,0.08)",border:"1px dashed rgba(91,145,206,0.35)",color:"#5b91ce",borderRadius:8,padding:"10px 18px",cursor:"pointer",fontSize:12,fontWeight:600}}>+ Serveur</button>
          </>);
        })()}
      </div>
    );

    case "inaturalist": return (
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:4}}>
          <Field label="Observer" value={d.inaturalist?.observer||""} onChange={v=>upd("inaturalist",{...(d.inaturalist||{}),observer:v})}/>
          <Field label="Observations" value={String(d.inaturalist?.observations||0)} onChange={v=>upd("inaturalist",{...(d.inaturalist||{}),observations:parseInt(v)||0})} width="110px"/>
          <Field label="Espèces" value={String(d.inaturalist?.species||0)} onChange={v=>upd("inaturalist",{...(d.inaturalist||{}),species:parseInt(v)||0})} width="90px"/>
          <Field label="Identifications" value={String(d.inaturalist?.identifications||0)} onChange={v=>upd("inaturalist",{...(d.inaturalist||{}),identifications:parseInt(v)||0})} width="110px"/>
          <Field label="Rang" value={d.inaturalist?.rank||""} onChange={v=>upd("inaturalist",{...(d.inaturalist||{}),rank:v})} width="160px"/>
        </div>
        {(d.inaturalist?.list||[]).map((obs,i)=>(
          <div key={obs.id||i} className="adm-card" style={{background:"rgba(255,255,255,0.85)",borderRadius:12,padding:14,border:"1px solid rgba(0,0,0,0.07)",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
            <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap",alignItems:"center"}}>
              <input value={obs.emoji||""} onChange={e=>{const l=[...(d.inaturalist?.list||[])];l[i]={...l[i],emoji:e.target.value};upd("inaturalist",{...d.inaturalist,list:l});}}
                className="adm-input" style={{width:44,background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a1a2e",padding:"6px 8px",fontSize:16,borderRadius:7,textAlign:"center"}} placeholder="🔬"/>
              <Field label="Nom commun" value={obs.common||""} onChange={v=>{const l=[...(d.inaturalist?.list||[])];l[i]={...l[i],common:v};upd("inaturalist",{...d.inaturalist,list:l});}}/>
              <Field label="Nom latin" value={obs.latin||""} onChange={v=>{const l=[...(d.inaturalist?.list||[])];l[i]={...l[i],latin:v};upd("inaturalist",{...d.inaturalist,list:l});}} width="180px"/>
              <Field label="Date" value={obs.date||""} onChange={v=>{const l=[...(d.inaturalist?.list||[])];l[i]={...l[i],date:v};upd("inaturalist",{...d.inaturalist,list:l});}} width="110px"/>
              <div style={{display:"flex",gap:4,alignItems:"center",marginTop:18}}>
                {[["Research Grade","✓ Research"],["Needs ID","? Needs ID"],["Casual","Casual"]].map(([val,lbl])=>(
                  <button key={val} onClick={()=>{const l=[...(d.inaturalist?.list||[])];l[i]={...l[i],grade:val};upd("inaturalist",{...d.inaturalist,list:l});}}
                    style={{fontSize:9,padding:"3px 7px",border:`1px solid ${obs.grade===val?"#74AC00":"rgba(0,0,0,0.1)"}`,background:obs.grade===val?"#74AC0018":"transparent",color:obs.grade===val?"#74AC00":"#6b7280",borderRadius:5,cursor:"pointer",fontWeight:obs.grade===val?700:400}}>
                    {lbl}
                  </button>
                ))}
              </div>
              <button onClick={()=>{const l=(d.inaturalist?.list||[]).filter((_,j)=>j!==i);upd("inaturalist",{...d.inaturalist,list:l});}}
                className="adm-del-btn" style={{background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:11,marginTop:18}}>✕</button>
            </div>
            <Field label="Lieu" value={obs.place||""} onChange={v=>{const l=[...(d.inaturalist?.list||[])];l[i]={...l[i],place:v};upd("inaturalist",{...d.inaturalist,list:l});}}/>
            <Field label="Note" value={obs.note||""} onChange={v=>{const l=[...(d.inaturalist?.list||[])];l[i]={...l[i],note:v};upd("inaturalist",{...d.inaturalist,list:l});}} textarea style={{marginTop:6}}/>
            <div style={{display:"flex",alignItems:"center",gap:6,marginTop:8}}>
              <label style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#6b7280",cursor:"pointer"}}>
                <input type="checkbox" checked={!!obs.glitch} onChange={e=>{const l=[...(d.inaturalist?.list||[])];l[i]={...l[i],glitch:e.target.checked};upd("inaturalist",{...d.inaturalist,list:l});}}/> Glitch (anomalie narrative)
              </label>
            </div>
          </div>
        ))}
        <button onClick={()=>upd("inaturalist",{...(d.inaturalist||{}),list:[...(d.inaturalist?.list||[]),{id:Date.now(),emoji:"🔬",common:"",latin:"",place:"",date:"1 oct 2012",grade:"Needs ID",ids:0,note:""}]})}
          style={{background:"rgba(116,172,0,0.08)",border:"1px dashed rgba(116,172,0,0.35)",color:"#74AC00",borderRadius:8,padding:"10px 18px",cursor:"pointer",fontSize:12,fontWeight:600}}>+ Observation</button>
      </div>
    );

    case "mail": {
      const MAIL_TAB_DEFS = [
        {key:"inbox",   label:"📥 Inbox",   color:"#4a7ab5", storageKey:"mail_override",  defaultFn:(un)=>EMAILS_BY_CHAR[un]||EMAILS_BY_CHAR.glindatheverygood},
        {key:"drafts",  label:"📝 Drafts",  color:"#6366f1", storageKey:"mail_drafts",    defaultFn:(un)=>MAIL_DRAFTS_BY_CHAR[un]||[]},
        {key:"deleted", label:"🗑 Deleted",  color:"#ef4444", storageKey:"mail_deleted",   defaultFn:(un)=>MAIL_DELETED_BY_CHAR[un]||[]},
      ];
      const curTabDef = MAIL_TAB_DEFS.find(t=>t.key===mailAdmTab);
      const un = d.username || "glindatheverygood";
      const rawMails = d[curTabDef.storageKey]?.[un] ?? curTabDef.defaultFn(un);
      const mails = Array.isArray(rawMails) ? rawMails : curTabDef.defaultFn(un);
      const updMailList = (list) => upd(curTabDef.storageKey, {...(d[curTabDef.storageKey]||{}), [un]: list});
      const newMail = () => updMailList([...mails, {id:Date.now(), from:"", subj:"", preview:"", time:"6 oct, 10:00am", unread:mailAdmTab==="inbox"}]);
      const DEFAULT_EMAILS = {glindatheverygood:"glindatheverygood@uma.edu",eoghan_masuda:"eoghan_masuda@uma.edu",dreww_orms:"dreww_orms@uma.edu",noteliasgreen:"noteliasgreen@uma.edu"};
      const currentEmail = d.mailEmail || DEFAULT_EMAILS[un] || `${un}@uma.edu`;
      return (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* Adresse mail du perso */}
          <div style={{background:"rgba(255,255,255,0.85)",border:"1px solid rgba(0,0,0,0.07)",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
            <div style={{flex:1}}>
              <div style={{fontSize:10,color:"#9ca3af",fontWeight:600,letterSpacing:0.5,textTransform:"uppercase",marginBottom:4}}>Adresse email du perso</div>
              <Field value={currentEmail} onChange={v=>upd("mailEmail",v)} style={{width:"100%"}} placeholder={`${un}@uma.edu`}/>
            </div>
            <div style={{fontSize:10,color:"#9ca3af",lineHeight:1.4,maxWidth:200}}>S'affiche dans le champ "À" des mails reçus sur ce téléphone</div>
          </div>
          {/* 3 onglets */}
          <div className="adm-subtabs" style={{display:"flex",gap:0,background:"rgba(0,0,0,0.05)",borderRadius:10,padding:3,alignSelf:"stretch"}}>
            {MAIL_TAB_DEFS.map(t=>(
              <button key={t.key} onClick={()=>setMailAdmTab(t.key)} style={{
                flex:1,padding:"9px 12px",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,
                fontWeight:mailAdmTab===t.key?700:400,
                background:mailAdmTab===t.key?"#fff":"transparent",
                color:mailAdmTab===t.key?t.color:"#6b7280",
                boxShadow:mailAdmTab===t.key?"0 1px 3px rgba(0,0,0,0.1)":"none",
                transition:"all 0.15s",whiteSpace:"nowrap",
              }}>{t.label}</button>
            ))}
          </div>
          {/* Liste des mails */}
          {mails.map((m,i)=>{
            const updMail = (patch) => { const l=[...mails]; l[i]={...l[i],...patch}; updMailList(l); };
            const mid = m.id??i;
            const isOpen = mailOpen.has(mid);
            const toggle = toggleInSet(setMailOpen);
            return (
              <div key={m.id||i} style={{background:"rgba(255,255,255,0.9)",borderRadius:10,border:"1px solid rgba(0,0,0,0.07)",overflow:"hidden"}}>
                <div onClick={()=>toggle(mid)} style={{display:"flex",gap:10,alignItems:"center",padding:"12px 14px",minHeight:44,WebkitTapHighlightColor:"transparent",cursor:"pointer"}}>
                  {mailAdmTab==="inbox" && <span style={{width:7,height:7,borderRadius:"50%",background:m.unread?"#4a7ab5":"transparent",flexShrink:0}}/>}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:m.unread?700:400,color:"#374151",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.from||<em style={{color:"#9ca3af"}}>(sans expéditeur)</em>} {m.subj?`— ${m.subj}`:""}</div>
                    <div style={{fontSize:10,color:"#9ca3af"}}>{m.time||"—"}</div>
                  </div>
                  <AdminChevron open={isOpen}/>
                </div>
                {isOpen && (
                <div style={{display:"flex",flexDirection:"column",gap:8,padding:"0 14px 14px"}}>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  <Field label="Expéditeur" value={m.from||""} onChange={v=>updMail({from:v})} style={{flex:1,minWidth:140}}/>
                  <LoreDateTimeInput value={m.time||""} onChange={v=>updMail({time:v})} width="180px"/>
                  {mailAdmTab==="inbox" && (
                    <div style={{display:"flex",flexDirection:"column",gap:2,marginTop:18}}>
                      <label style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#6b7280",cursor:"pointer",whiteSpace:"nowrap"}}>
                        <input type="checkbox" checked={!!m.unread} onChange={e=>updMail({unread:e.target.checked})}/> Non lu
                      </label>
                    </div>
                  )}
                  <div style={{display:"flex",gap:4,alignItems:"flex-start"}}>
                    <MoveButtons index={i} length={mails.length}
                      onMoveUp={()=>{const l=[...mails];[l[i-1],l[i]]=[l[i],l[i-1]];updMailList(l);}}
                      onMoveDown={()=>{const l=[...mails];[l[i+1],l[i]]=[l[i],l[i+1]];updMailList(l);}}/>
                    <button onClick={()=>updMailList(mails.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:"#d1d5db",cursor:"pointer",fontSize:16,padding:"0 2px",marginTop:18}}>×</button>
                  </div>
                </div>
                <Field label="Objet" value={m.subj||""} onChange={v=>updMail({subj:v})} style={{width:"100%"}}/>
                <Field label="Aperçu / Corps" value={m.preview||""} onChange={v=>updMail({preview:v})} textarea style={{width:"100%"}}/>
                </div>
                )}
              </div>
            );
          })}
          <button onClick={newMail} style={{background:`rgba(${mailAdmTab==="inbox"?"74,122,181":mailAdmTab==="drafts"?"99,102,241":"239,68,68"},0.08)`,border:`1px dashed rgba(${mailAdmTab==="inbox"?"74,122,181":mailAdmTab==="drafts"?"99,102,241":"239,68,68"},0.4)`,color:curTabDef.color,borderRadius:8,padding:"10px 18px",cursor:"pointer",fontSize:12,fontWeight:600}}>+ Mail ({curTabDef.label.split(" ")[1]})</button>
        </div>
      );
    }

    case "facebook": {
      const FB_COLOR = "#3B5998";
      const nameToKey = Object.fromEntries(Object.entries(CHAR_NAMES).map(([k,v])=>[v,k]));
      const withAuthors = (list) => list.map(p => p.author ? p : {...p, author: nameToKey[p.name] || p.author});
      // Fallback restauré (avait disparu entre la version du 27/06 et celle-ci) : tant que personne n'a
      // encore écrit de vrai post, on retombe sur le contenu de lore par défaut au lieu d'un fil vide.
      const rawShared = data.sharedThreads?._sharedFacebookPosts;
      const sharedFeed = withAuthors(rawShared && rawShared.length ? rawShared : FACEBOOK_FRIENDS_FEED_DEFAULT);
      // FIX BUG ÉCRASEMENT : avant, updFeed réécrivait tout le tableau "_sharedFacebookPosts" avec la
      // liste reçue de SharedPostsEditor, construite à partir de `sharedFeed` (donc du `data` figé au
      // moment du rendu). Si ce `data` était périmé — sync Firebase pas encore arrivée, ou juste après
      // l'ouverture de l'admin — ajouter UN post écrasait silencieusement TOUS les posts des 3 autres
      // persos (et les anciens posts du perso courant) avec cette version périmée.
      // Fix : on relit toujours l'état le plus frais via dataRef (mis à jour en continu, indépendant du
      // re-render), on garde les posts des AUTRES auteurs strictement tels qu'ils sont en base à cet
      // instant, et on ne remplace que les posts de "tab" — ce que l'UI promettait déjà ("Tu ne peux
      // modifier que tes propres posts.") mais que l'écriture ne respectait pas réellement.
      // (même fallback ici : sinon le 1er post réel écraserait le lore par défaut des 3 autres persos)
      const updFeed = (list) => {
        const rawFresh = dataRef.current.sharedThreads?._sharedFacebookPosts;
        const freshFeed = withAuthors(rawFresh && rawFresh.length ? rawFresh : FACEBOOK_FRIENDS_FEED_DEFAULT);
        const others = freshFeed.filter(p => p.author !== tab);
        const mine = list.filter(p => p.author === tab);
        onUpdate("_sharedFacebookPosts", [...mine, ...others]);
      };
      const pages = d.facebookPages?.[tab] || FACEBOOK_PAGES_DEFAULT[tab] || [];
      const updPages = (list) => upd("facebookPages", {...(d.facebookPages||{}), [tab]: list});

      const SubTabs = [["users","👤 Mon profil"],["shared","📰 Mes posts (partagés)"],["pages","📄 Pages suivies"]];
      return (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* Tab bar */}
          <div className="adm-subtabs" style={{display:"flex",gap:0,background:"rgba(0,0,0,0.05)",borderRadius:8,padding:2,alignSelf:"flex-start"}}>
            {SubTabs.map(([k,label])=>(
              <button key={k} onClick={()=>setFbTab(k)} style={{
                padding:"6px 14px",border:"none",borderRadius:6,cursor:"pointer",fontSize:11,
                fontWeight:fbTab===k?700:400,
                background:fbTab===k?"#fff":"transparent",
                color:fbTab===k?FB_COLOR:"#6b7280",
                boxShadow:fbTab===k?"0 1px 3px rgba(0,0,0,0.1)":"none",
                transition:"all 0.15s",whiteSpace:"nowrap",
              }}>{label}</button>
            ))}
          </div>

          {/* ── MON PROFIL ── */}
          {fbTab==="users" && (
            <div className="adm-card" style={{background:"rgba(255,255,255,0.85)",borderRadius:10,padding:"14px 16px",border:"1px solid rgba(0,0,0,0.07)",display:"flex",flexDirection:"column",gap:10}}>
              <div style={{fontSize:10,fontWeight:700,color:"#9ca3af",letterSpacing:0.5,marginBottom:2}}>★ CE PERSO — synchronisé pour les 4</div>
              {/* Photo de profil */}
              <div style={{display:"flex",gap:12,alignItems:"center"}}>
                <label style={{width:56,height:56,borderRadius:8,overflow:"hidden",background:FB_COLOR,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:20,cursor:"pointer",border:"1px solid rgba(0,0,0,0.1)"}}>
                  {d.avatar?<img src={d.avatar} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(CHAR_NAMES[tab]||tab)[0]}
                  <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new UploadReader();r.onload=ev=>{upd("avatar",ev.target.result);onUpdate("_sharedAvatars",{...(data.sharedThreads?._sharedAvatars||{}),[tab]:ev.target.result});};r.readAsDataURL(f);e.target.value="";}}/>
                </label>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:600,color:"#374151"}}>Photo de profil Facebook</div>
                  <div style={{fontSize:10,color:"#9ca3af"}}>Visible sur les posts et dans le fil des autres</div>
                  {d.avatar && <button onClick={()=>{upd("avatar",null);onUpdate("_sharedAvatars",{...(data.sharedThreads?._sharedAvatars||{}),[tab]:null});}} style={{fontSize:10,color:"#ef4444",background:"none",border:"none",cursor:"pointer",padding:0,marginTop:2}}>Supprimer</button>}
                </div>
              </div>
              {/* Nom affiché */}
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <Field label="Nom affiché sur Facebook" value={d.name||CHAR_NAMES[tab]||""} onChange={v=>upd("name",v)} style={{flex:1}}/>
                <Field label="Amis" value={String(d.facebookFriends||"")} onChange={v=>upd("facebookFriends",parseInt(v)||0)} width="80px"/>
              </div>
            </div>
          )}

          {/* ── MES POSTS PARTAGÉS ── */}
          {fbTab==="shared" && (
            <SharedPostsEditor
              posts={sharedFeed} onChange={updFeed} tab={tab} accent={FB_COLOR}
              fieldMap={{text:"text", img:"img", time:"time"}}
              statFields={[{key:"likes",label:"👍 Likes"},{key:"comments",label:"💬 Commentaires"}]}
              addExtra={{name:d.name||CHAR_NAMES[tab]||""}} addLabel="+ Post Facebook" textLabel="Texte du post"
              hint="Visible depuis les 4 téléphones dans le fil d'amis. Tu ne peux modifier que tes propres posts."
            />
          )}

          {/* ── PAGES SUIVIES ── */}
          {fbTab==="pages" && (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <div style={{fontSize:11,color:"#6b7280",lineHeight:1.5}}>Posts de pages suivies par <strong>{CHAR_NAMES[tab]||tab}</strong> uniquement — non partagés entre persos.</div>
              {pages.map((p,i)=>{
                const updPage = (patch) => updPages(pages.map((p2,j)=>j===i?{...p2,...patch}:p2));
                const isOpen = fbPagesOpen.has(i);
                const toggle = toggleInSet(setFbPagesOpen);
                return (
                  <div key={i} className="adm-card" style={{background:"rgba(255,255,255,0.85)",borderRadius:10,border:"1px solid rgba(0,0,0,0.07)",overflow:"hidden"}}>
                    <div onClick={()=>toggle(i)} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 12px",cursor:"pointer"}}>
                      <div style={{width:30,height:30,borderRadius:6,overflow:"hidden",background:FB_COLOR,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:13,color:"#fff",fontWeight:700}}>
                        {p.avatar?<img src={p.avatar} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(p.name||"?")[0]?.toUpperCase()}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,color:"#374151",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name||<em style={{color:"#9ca3af"}}>(sans nom)</em>} {p.text?`— ${p.text}`:""}</div>
                        <div style={{fontSize:10,color:"#9ca3af"}}>{p.time||"—"}</div>
                      </div>
                      <AdminChevron open={isOpen}/>
                    </div>
                    {isOpen && (
                    <div style={{display:"flex",gap:10,alignItems:"flex-start",padding:"0 12px 12px"}}>
                    {/* Avatar de la page */}
                    <label style={{width:44,height:44,borderRadius:6,overflow:"hidden",background:FB_COLOR,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,border:"1px solid rgba(0,0,0,0.08)",fontSize:16,color:"#fff",fontWeight:700}}>
                      {p.avatar?<img src={p.avatar} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(p.name||"?")[0]?.toUpperCase()}
                      <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                        const f=e.target.files?.[0]; if(!f) return;
                        const r=new UploadReader(); r.onload=ev=>updPage({avatar:ev.target.result}); r.readAsDataURL(f); e.target.value="";
                      }}/>
                    </label>
                    <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:6}}>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"flex-end"}}>
                      <Field label="Page" value={p.name||""} onChange={v=>updPage({name:v})} style={{flex:1}} placeholder="ex: Stephen King…"/>
                      <LoreDateTimeInput value={p.time||""} onChange={v=>updPage({time:v})} width="190px" showLabel={true}/>
                      {p.avatar && <button onClick={()=>updPage({avatar:null})} style={{fontSize:10,color:"#ef4444",background:"none",border:"none",cursor:"pointer",padding:0,alignSelf:"center"}}>× Suppr. photo</button>}
                      <div style={{display:"flex",gap:4,alignItems:"flex-start"}}>
                        <MoveButtons index={i} length={pages.length}
                          onMoveUp={()=>{const l=[...pages];[l[i-1],l[i]]=[l[i],l[i-1]];updPages(l);}}
                          onMoveDown={()=>{const l=[...pages];[l[i+1],l[i]]=[l[i],l[i+1]];updPages(l);}}/>
                        <button onClick={()=>updPages(pages.filter((_,j)=>j!==i))} className="adm-del-btn" style={{background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:11,marginTop:18}}>✕</button>
                      </div>
                    </div>
                    <Field label="Texte du post" value={p.text||""} onChange={v=>updPage({text:v})} textarea/>
                    <div style={{display:"flex",gap:6}}>
                      <Field label="👍 Likes" value={String(p.likes??0)} onChange={v=>updPage({likes:parseInt(v)||0})} style={{flex:1}}/>
                      <Field label="💬 Comm." value={String(p.comments??0)} onChange={v=>updPage({comments:parseInt(v)||0})} style={{flex:1}}/>
                    </div>
                    </div>
                    </div>
                    )}
                  </div>
                );
              })}
              <button onClick={()=>updPages([...pages,{name:"",time:"à l'instant",text:"",likes:0,comments:0}])}
                style={{background:"rgba(59,89,152,0.08)",border:"1px dashed rgba(59,89,152,0.4)",color:FB_COLOR,borderRadius:8,padding:"10px 18px",cursor:"pointer",fontSize:12,fontWeight:600}}>+ Page suivie</button>
            </div>
          )}
        </div>
      );
    }

    case "youtube": {
      const ytVideos = d.youtubeVideos?.[tab] || YOUTUBE_FEEDS_DEFAULT[tab] || YOUTUBE_FEEDS_DEFAULT.elias;
      const updYtList = (list) => upd("youtubeVideos", {...(d.youtubeVideos||{}), [tab]: list});
      const addYtVideo = () => updYtList([...ytVideos, {id:Date.now(), ch:"", chAvatar:"📺", age:"1d", views:"0 vue", dur:"0:00", thumb:"#1a1a1a", thumbImg:null, title:""}]);
      return (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {ytVideos.map((v,i)=>{
            const updVid = (patch) => updYtList(ytVideos.map((v2,j)=>j===i?{...v2,...patch,id:v2.id||Date.now()+j}:{...v2,id:v2.id||Date.now()+j}));
            return (
              <div key={v.id??i} className="adm-card" style={{background:"rgba(255,255,255,0.9)",borderRadius:10,padding:"10px 12px",border:"1px solid rgba(0,0,0,0.07)",display:"flex",flexDirection:"column",gap:6}}>
                <div style={{display:"flex",gap:6}}>
                  <Field label="Chaîne" value={v.ch||""} onChange={c=>updVid({ch:c})} style={{flex:1}}/>
                  <div style={{display:"flex",gap:6,alignItems:"flex-start"}}>
                    <MoveButtons
                      index={i}
                      length={ytVideos.length}
                      onMoveUp={() => { const l=[...ytVideos]; [l[i-1],l[i]]=[l[i],l[i-1]]; updYtList(l); }}
                      onMoveDown={() => { const l=[...ytVideos]; [l[i+1],l[i]]=[l[i],l[i+1]]; updYtList(l); }}
                    />
                    <button onClick={()=>updYtList(ytVideos.filter((_,j)=>j!==i))} className="adm-del-btn" style={{background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:11,marginTop:18}}>✕</button>
                  </div>
                </div>
                <Field label="Titre de la vidéo" value={v.title||""} onChange={c=>updVid({title:c})} textarea/>
                <div style={{display:"flex",gap:6}}>
                  <Field label="Âge" value={v.age||""} onChange={c=>updVid({age:c})} style={{flex:1}}/>
                  <Field label="Vues" value={v.views||""} onChange={c=>updVid({views:c})} style={{flex:1}}/>
                  <Field label="Durée" value={v.dur||""} onChange={c=>updVid({dur:c})} style={{flex:1}}/>
                </div>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <div
                    onClick={()=>document.getElementById(`yt-thumb-${tab}-${v.id??i}`).click()}
                    style={{width:64,height:36,borderRadius:6,background:v.thumbImg?undefined:(v.thumb||"#1a1a1a"),border:"2px dashed rgba(204,0,0,0.35)",overflow:"hidden",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                    {v.thumbImg
                      ? <img src={v.thumbImg} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                      : <span style={{fontSize:16,opacity:0.6}}>🖼</span>}
                  </div>
                  <input id={`yt-thumb-${tab}-${v.id??i}`} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                    const f=e.target.files?.[0]; if(!f)return;
                    const r=new UploadReader(); r.onload=ev=>updVid({thumbImg:ev.target.result}); r.readAsDataURL(f); e.target.value="";
                  }}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:600,color:"#374151"}}>Miniature</div>
                    <div style={{fontSize:10,color:"#9ca3af"}}>Cliquez pour importer une image</div>
                  </div>
                  {v.thumbImg && <button onClick={()=>updVid({thumbImg:null})} style={{fontSize:10,color:"#ef4444",background:"none",border:"none",cursor:"pointer",padding:0}}>Supprimer</button>}
                </div>
              </div>
            );
          })}

          <button onClick={addYtVideo}
            style={{background:"rgba(204,0,0,0.08)",border:"1px dashed rgba(204,0,0,0.4)",color:"#cc0000",borderRadius:8,padding:"10px 18px",cursor:"pointer",fontSize:12,fontWeight:600}}>+ Vidéo YouTube</button>
        </div>
      );
    }

    default: {
      // Auto-redirect to first available section
      const firstApp = charAppSections[0];
      if(firstApp && section !== firstApp.key) {
        // Use effect-free redirect via render
        return (() => { setTimeout(()=>setSection(firstApp.key),0); return null; })();
      }
      return null;
    }
    }
  };

  const charColor = char?.color || "#6366f1";
  const charColorLight = charColor + "22";
  const charColorMid   = charColor + "55";

  // ── Section groups for the new sidebar ─────────────────────────────────────
  // Apps installed on this character that have admin sections
  const installedApps = [...new Set([...(d.apps||[]), ...(d.dock||[])])];
  const charAppSections = installedApps
    .flatMap(expandAppSections)
    .filter((s,i,a) => a.findIndex(x=>x.key===s.key)===i) // dédoublonne si gallery+photos tous les deux
    .sort((a,b) => a.label.localeCompare(b.label, "fr"));

  const SECTION_GROUPS = [

    {
      label: "Applications",
      items: charAppSections,
    },
    {
      label: "Apparence",
      items: [
        {key:"apparence",      icon:"🎨", label:"Fond & couleurs"},
        {key:"photos_profil",  icon:"🖼️",  label:"Photos de profil"},
        {key:"icons",          icon:"📱", label:"Icônes d'apps"},
      ]
    },

  ];

  return (
    <div ref={adminRootRef} style={{minHeight:"100vh",background:"#f4f5f7",fontFamily:FF_IOS,display:"flex",flexDirection:"column",color:"#1a1a2e"}}>
      <style>{`
        @keyframes fadeToBlack { from { opacity:0; } to { opacity:1; } }
        @keyframes wakeUp { from { opacity:0; } to { opacity:1; } }
        @keyframes spin360 { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .adm-input { transition: border-color 0.15s, box-shadow 0.15s; }
        .adm-input:focus { outline: none; border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
        .adm-card { transition: box-shadow 0.15s; }
        .adm-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08) !important; }
        .adm-btn-primary { transition: all 0.15s; }
        .adm-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99,102,241,0.3); }
        .adm-del-btn:hover { color: #ef4444 !important; }
        .nav-item:hover { background: rgba(0,0,0,0.04) !important; }
        .nav-item.active { background: var(--char-color-light) !important; color: var(--char-color) !important; font-weight: 700 !important; }
        .char-tab:hover { opacity: 0.85; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 10px; }
        @media (max-width: 560px) {
          .nav-item-label { display: none !important; }
          .nav-item { padding: 8px !important; justify-content: center !important; }
        }
        @media (max-width: 700px) {
          .adm-topbar { flex-wrap: wrap !important; height: auto !important; padding: 8px 12px !important; gap: 6px !important; }
          .adm-topbar-chars { flex: 1 1 100% !important; order: 2 !important; overflow-x: auto !important; scrollbar-width: none !important; border-top: 1px solid #f0f0f0 !important; padding-top: 4px !important; }
          .adm-topbar-chars::-webkit-scrollbar { display: none !important; }
          .adm-topbar-right { margin-left: auto !important; }
          .adm-topbar-date { display: none !important; }
          .adm-topbar-logo-label { display: none !important; }
          .char-tab { padding: 6px 10px !important; font-size: 12px !important; border-bottom: 3px solid transparent !important; }
          .adm-shell { flex-direction: column !important; }
          .adm-sidebar { width: 100% !important; min-height: auto !important; flex-direction: row !important; overflow-x: auto !important; border-right: none !important; border-bottom: 1px solid #e5e7eb !important; padding: 4px 6px !important; scrollbar-width: none !important; }
          .adm-sidebar::-webkit-scrollbar { display: none !important; }
          .adm-sidebar-inner { flex-direction: row !important; gap: 2px !important; padding: 4px !important; }
          .adm-sidebar-charhead { display: none !important; }
          .nav-group-label { display: none !important; }
          .nav-item { padding: 6px 10px !important; white-space: nowrap !important; border-left: none !important; border-bottom: 2px solid transparent !important; border-radius: 6px !important; font-size: 11px !important; }
          .nav-item.active { border-left: none !important; border-bottom: 2px solid var(--char-color) !important; }
          .adm-content { padding: 12px !important; }
          .adm-breadcrumb { padding: 8px 12px !important; }
        }
        .adm-subtabs { overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
        .adm-subtabs::-webkit-scrollbar { display: none; }
        @media (max-width: 700px) {
          .adm-subtabs { align-self: stretch !important; }
        }
      `}</style>

      {/* ── TOP BAR ──────────────────────────────────────────────────────────── */}
      <div className="adm-topbar" style={{background:"#fff",borderBottom:"1px solid #e5e7eb",padding:isMobile?"8px 12px":"0 20px",display:"flex",alignItems:isMobile?"center":"stretch",flexShrink:0,gap:isMobile?6:0,height:isMobile?"auto":52,flexWrap:isMobile?"wrap":"nowrap"}}>

        {/* Logo */}
        <div style={{display:"flex",alignItems:"center",gap:10,paddingRight:20,borderRight:"1px solid #f0f0f0",marginRight:4,flexShrink:0}}>
          <div style={{width:28,height:28,borderRadius:8,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>⚙</div>
          {!isMobile && <div style={{fontWeight:700,fontSize:14,color:"#1a1a2e",letterSpacing:-0.3}}>IT: Welcome to UMA <span style={{color:"#9ca3af",fontWeight:400,fontSize:11}}>admin</span></div>}
        </div>

        {/* Character tabs */}
        <div className="adm-topbar-chars" style={{display:"flex",alignItems:"stretch",flex:isMobile?"1 1 100%":1,gap:0,order:isMobile?2:0,overflowX:isMobile?"auto":"visible",borderTop:isMobile?"1px solid #f0f0f0":"none",paddingTop:isMobile?4:0}}>
          {CHARACTERS.map(c=>{
            const isActive = tab===c.key;
            const emoji = c.key==="glinda"?"🌸":c.key==="eoghan"?"🌈":c.key==="drew"?"🪱":"🖤";
            return (
              <button key={c.key} className="char-tab"
                onClick={()=>{ const firstSection = (()=>{ const apps=[...(data[c.key]?.apps||[]),...(data[c.key]?.dock||[])]; const AS={messages:1,phone:1,notes:1,gallery:1,music:1,twitter:1,pinterest:1,browser:1,snapchat:1,grindr:1,tumblr:1,reddit:1,contacts:1,calendar:1,weather:1,settings:1,wikipedia:1,kindle:1,vpn:1,inaturalist:1}; const key=apps.find(id=>AS[id]); return key==="contacts"?"phone":key || 'apparence'; })(); setTab(c.key); setSection(firstSection); }}
                style={{
                  display:"flex",alignItems:"center",gap:7,padding:"0 16px",
                  border:"none",borderBottom:`3px solid ${isActive?c.color:"transparent"}`,
                  background:"transparent",
                  color:isActive?c.color:"#6b7280",
                  cursor:"pointer",fontSize:13,fontWeight:isActive?700:500,
                  transition:"all 0.15s",flexShrink:0,
                }}>
                <span style={{fontSize:16}}>{emoji}</span>
                <span>{c.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right actions */}
        <div className="adm-topbar-right" style={{display:"flex",alignItems:"center",gap:6,paddingLeft:isMobile?0:12,borderLeft:isMobile?"none":"1px solid #f0f0f0",flexShrink:0,order:isMobile?1:0,marginLeft:isMobile?"auto":0}}>

          {isMobile ? (
            <>
            <div style={{position:"relative"}}>
              <button onClick={()=>setBurgerOpen(o=>!o)}
                style={{background:burgerOpen?"#f3f4f6":"transparent",border:"1px solid #e5e7eb",color:"#374151",padding:"6px 10px",borderRadius:7,fontSize:15,cursor:"pointer",lineHeight:1}}>
                ☰
              </button>
              {burgerOpen && <>
                {/* Overlay invisible pour fermer le menu en cliquant en dehors */}
                <div onClick={()=>setBurgerOpen(false)} style={{position:"fixed",inset:0,zIndex:40}}/>
                <div style={{position:"absolute",top:"calc(100% + 6px)",right:0,background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,boxShadow:"0 10px 30px rgba(0,0,0,0.15)",padding:8,display:"flex",flexDirection:"column",gap:6,zIndex:50,minWidth:210}}>

                  <div style={{display:"flex",alignItems:"center",gap:5,background:"#f8fafc",border:"1px solid #e5e7eb",borderRadius:7,padding:"5px 9px"}}>
                    <span style={{fontSize:12}}>📅</span>
                    <input type="date" value={loreDate} onChange={e=>onLoreDateChange(e.target.value)}
                      style={{background:"transparent",border:"none",color:"#6366f1",fontSize:11,cursor:"pointer",outline:"none",fontFamily:"monospace",fontWeight:600,flex:1}}/>
                  </div>

                  <button onClick={()=>{setExportOpen(true); setBurgerOpen(false);}}
                    style={{background:"transparent",border:"1px solid #e5e7eb",color:"#374151",padding:"8px 12px",borderRadius:7,fontSize:12,cursor:"pointer",fontWeight:500,textAlign:"left"}}>
                    📤 Exporter JSON
                  </button>

                  <button onClick={()=>{ resetImport(); setImportOpen(true); setBurgerOpen(false); }}
                    style={{background:"transparent",border:"1px solid #e5e7eb",color:"#374151",padding:"8px 12px",borderRadius:7,fontSize:12,cursor:"pointer",fontWeight:500,textAlign:"left"}}>
                    📥 Importer JSON
                  </button>

                  <button onClick={()=>{ openRestorePanel(); setBurgerOpen(false); }}
                    style={{background:"transparent",border:"1px solid #e5e7eb",color:"#374151",padding:"8px 12px",borderRadius:7,fontSize:12,cursor:"pointer",fontWeight:500,textAlign:"left"}}>
                    🕐 Restaurer
                  </button>

                  <button onClick={()=>{ setMigrateStatus(null); setMigrateOpen(true); setBurgerOpen(false); }}
                    style={{background:"transparent",border:"1px solid #e5e7eb",color:"#374151",padding:"8px 12px",borderRadius:7,fontSize:12,cursor:"pointer",fontWeight:500,textAlign:"left"}}>
                    🧹 Migrer images
                  </button>

                </div>
              </>}
            </div>

            {/* Retour — sorti du burger, toujours visible juste à côté */}
            <button onClick={onExit}
              style={{background:"transparent",border:"1px solid #e5e7eb",color:"#374151",padding:"6px 12px",borderRadius:7,fontSize:12,cursor:"pointer",fontWeight:500}}>
              ← Retour
            </button>
            </>
          ) : <>

          {/* Date lore */}
          <div style={{display:"flex",alignItems:"center",gap:5,background:"#f8fafc",border:"1px solid #e5e7eb",borderRadius:7,padding:"5px 9px"}}>
            <span style={{fontSize:12}}>📅</span>
            <input type="date" value={loreDate} onChange={e=>onLoreDateChange(e.target.value)}
              style={{background:"transparent",border:"none",color:"#6366f1",fontSize:11,cursor:"pointer",outline:"none",fontFamily:"monospace",fontWeight:600,width:110}}/>
          </div>

          {/* Export JSON */}
          <button onClick={()=>setExportOpen(true)}
            style={{background:"transparent",border:"1px solid #e5e7eb",color:"#374151",padding:"6px 12px",borderRadius:7,fontSize:12,cursor:"pointer",fontWeight:500}}>
            📤 Exporter JSON
          </button>

          {/* Import JSON */}
          <button onClick={()=>{ resetImport(); setImportOpen(true); }}
            style={{background:"transparent",border:"1px solid #e5e7eb",color:"#374151",padding:"6px 12px",borderRadius:7,fontSize:12,cursor:"pointer",fontWeight:500}}>
            📥 Importer JSON
          </button>

          {/* Restaurer un snapshot */}
          <button onClick={openRestorePanel}
            style={{background:"transparent",border:"1px solid #e5e7eb",color:"#374151",padding:"6px 12px",borderRadius:7,fontSize:12,cursor:"pointer",fontWeight:500}}>
            🕐 Restaurer
          </button>

          {/* Migrer les images base64 restantes vers Supabase */}
          <button onClick={()=>{ setMigrateStatus(null); setMigrateOpen(true); }}
            style={{background:"transparent",border:"1px solid #e5e7eb",color:"#374151",padding:"6px 12px",borderRadius:7,fontSize:12,cursor:"pointer",fontWeight:500}}>
            🧹 Migrer images
          </button>

          {/* Back */}
          <button onClick={onExit}
            style={{background:"transparent",border:"1px solid #e5e7eb",color:"#374151",padding:"6px 12px",borderRadius:7,fontSize:12,cursor:"pointer",fontWeight:500}}>
            ← Retour
          </button>

          </>}
        </div>
      </div>

      {/* ── BODY (sidebar + content) ─────────────────────────────────────────── */}
      <div className="adm-shell" style={{flex:1,display:"flex",overflow:"hidden",minHeight:0,flexDirection:"column"}}
        // CSS variable for active char color used by nav-item.active
      >
        <style>{`:root{--char-color:${charColor};--char-color-light:${charColor}18;}`}</style>

        {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
        <div className="adm-sidebar" style={{width:"100%",background:"#fff",borderRight:"none",borderBottom:"1px solid #e5e7eb",display:"flex",flexDirection:"row",flexShrink:0,overflowX:"auto",overflowY:"hidden"}}>
          <div className="adm-sidebar-inner" style={{display:"flex",flexDirection:"row",padding:"6px 8px",gap:2,minWidth:"max-content"}}>

            {/* Character header pill */}
            {false && <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px 12px",borderBottom:"1px solid #f0f0f0",marginBottom:6}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:charColor,boxShadow:`0 0 0 3px ${charColor}22`,flexShrink:0}}/>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:charColor}}>{char?.label}</div>
  
              </div>
            </div>}

            {SECTION_GROUPS.map(group=>(
              <div key={group.label} style={{display:"flex",flexDirection:"row",alignItems:"center"}}>
                {false && <div style={{fontSize:9,fontWeight:700,letterSpacing:1,color:"#c0c4cc",textTransform:"uppercase",padding:"8px 10px 4px"}}>
                  {group.label}
                </div>}
                {group.items.map(item=>{
                  const active = section===item.key;
                  return (
                    <button key={item.key} className={`nav-item${active?" active":""}`}
                      onClick={()=>setSection(item.key)}
                      style={{
                        display:"flex",alignItems:"center",gap:4,
                        width:"auto",textAlign:"left",
                        padding:"6px 10px",border:"none",
                        borderLeft:"none",
                        borderBottom:`2px solid ${active?charColor:"transparent"}`,
                        background:active?charColor+"18":"transparent",
                        color:active?charColor:"#4b5563",
                        fontSize:12,fontWeight:active?700:400,
                        cursor:"pointer",borderRadius:6,
                        transition:"all 0.12s",whiteSpace:"nowrap",flexShrink:0,
                      }}>
                      <span style={{fontSize:14,width:18,textAlign:"center",flexShrink:0}}>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0,background:"#f4f5f7"}}>

          {/* Content header breadcrumb */}
          <div className="adm-breadcrumb" style={{background:"#fff",borderBottom:"1px solid #e5e7eb",padding:isMobile?"8px 12px":"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"#9ca3af"}}>{char?.label}</span>
              <span style={{fontSize:11,color:"#d1d5db"}}>›</span>
              <span style={{fontSize:12,fontWeight:600,color:"#374151"}}>
                {[...SECTION_GROUPS.flatMap(g=>g.items)].find(i=>i.key===section)?.icon}{" "}
                {[...SECTION_GROUPS.flatMap(g=>g.items)].find(i=>i.key===section)?.label || section}
              </span>
            </div>
            <button onClick={save}
              style={{background:saved?"#10b981":"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",color:"#fff",padding:"6px 16px",borderRadius:7,fontWeight:600,fontSize:12,cursor:"pointer",transition:"background 0.2s"}}>
              {saved?"✓ Enregistré":"Enregistrer"}
            </button>
          </div>

          {/* Section content */}
          <div className="adm-content" style={{flex:1,overflowY:"auto",padding:isMobile?"12px":"24px",minHeight:0}}>
            {renderSection()}
          </div>
        </div>
      </div>

      {/* ── MODAL EXPORT JSON ────────────────────────────────────────────────── */}
      {exportOpen && (
        <div onClick={()=>setExportOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1002,padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"min(480px,100%)",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid #e5e7eb",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{fontWeight:700,fontSize:14,color:"#1a1a2e"}}>📤 Exporter JSON</div>
              <button onClick={()=>setExportOpen(false)} style={{background:"none",border:"none",fontSize:18,color:"#9ca3af",cursor:"pointer"}}>×</button>
            </div>
            <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:16}}>
              {/* Scope */}
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8}}>Périmètre</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {[["all","🌍 Tout le projet"],["char","👤 Un seul perso"]].map(([v,label])=>(
                    <button key={v} onClick={()=>setExportScope(v)}
                      style={{padding:"8px 16px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:exportScope===v?700:500,
                        background:exportScope===v?"linear-gradient(135deg,#6366f1,#8b5cf6)":"rgba(0,0,0,0.05)",
                        color:exportScope===v?"#fff":"#374151",transition:"all 0.15s"}}>
                      {label}
                    </button>
                  ))}
                </div>
                {exportScope==="char" && (
                  <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
                    {[["glinda","🌸 Glinda"],["eoghan","🌈 Eoghan"],["drew","🪱 Drew"],["elias","🖤 Elias"]].map(([ck,label])=>(
                      <button key={ck} onClick={()=>setExportChar(ck)}
                        style={{padding:"6px 14px",borderRadius:7,border:"none",cursor:"pointer",fontSize:11,fontWeight:exportChar===ck?700:500,
                          background:exportChar===ck?"rgba(99,102,241,0.15)":"rgba(0,0,0,0.04)",
                          color:exportChar===ck?"#6366f1":"#6b7280",transition:"all 0.15s"}}>
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Contenu */}
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8}}>Contenu</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {[
                    ["full",   "📦 Texte + images", "Export complet — plus lourd mais rien ne manque"],
                    ["text",   "📝 Texte uniquement", "Sans les photos en base64 — léger, rapide, lisible"],
                    ["images", "🖼️ Images uniquement", "Seulement les photos (avatars, galerie, pochettes...)"],
                  ].map(([v,label,desc])=>(
                    <label key={v} onClick={()=>setExportContent(v)} style={{display:"flex",alignItems:"flex-start",gap:10,background:exportContent===v?"rgba(99,102,241,0.06)":"rgba(0,0,0,0.02)",border:`1px solid ${exportContent===v?"rgba(99,102,241,0.25)":"rgba(0,0,0,0.07)"}`,borderRadius:8,padding:"10px 12px",cursor:"pointer"}}>
                      <input type="radio" readOnly checked={exportContent===v} style={{marginTop:2,flexShrink:0,accentColor:"#6366f1"}}/>
                      <div>
                        <div style={{fontSize:12,fontWeight:exportContent===v?700:500,color:exportContent===v?"#6366f1":"#374151"}}>{label}</div>
                        <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>{desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{fontSize:11,color:"#9ca3af",lineHeight:1.5}}>
                Le fichier téléchargé reflète l'état Firebase le plus récent — pas seulement ce qui est affiché à l'écran.
              </div>
            </div>
            <div style={{padding:"12px 20px",borderTop:"1px solid #e5e7eb",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setExportOpen(false)} style={{background:"transparent",border:"1px solid #e5e7eb",color:"#374151",padding:"8px 14px",borderRadius:7,fontSize:12,cursor:"pointer"}}>Annuler</button>
              <button onClick={doExport}
                style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",color:"#fff",padding:"8px 18px",borderRadius:7,fontWeight:700,fontSize:12,cursor:"pointer"}}>
                ⬇️ Télécharger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL RESTAURATION SNAPSHOT ─────────────────────────────────────── */}
      {restoreOpen && (
        <div onClick={()=>setRestoreOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1001,padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"min(500px,100%)",maxHeight:"80vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid #e5e7eb",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontWeight:700,fontSize:14,color:"#1a1a2e"}}>🕐 Restaurer une version</div>
                <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>Un snapshot automatique est pris toutes les 30s lors de tes modifications. Les {snapshots.length||"…"} derniers sont conservés.</div>
              </div>
              <button onClick={()=>setRestoreOpen(false)} style={{background:"none",border:"none",fontSize:18,color:"#9ca3af",cursor:"pointer"}}>×</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
              {restoreStatus==="loading" && <div style={{textAlign:"center",color:"#9ca3af",padding:24,fontSize:13}}>Chargement…</div>}
              {restoreStatus==="empty" && <div style={{textAlign:"center",color:"#9ca3af",padding:24,fontSize:13}}>Aucun snapshot trouvé. Les snapshots se créent automatiquement à partir de la prochaine modification.</div>}
              {restoreStatus==="error" && <div style={{background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",borderRadius:8,padding:"10px 14px",fontSize:12}}>Erreur de lecture. Vérifie la connexion Firebase.</div>}
              {snapshots.map((snap,i)=>(
                <div key={snap.ts} style={{display:"flex",alignItems:"center",gap:12,background:i===0?"rgba(99,102,241,0.05)":"rgba(0,0,0,0.02)",border:`1px solid ${i===0?"rgba(99,102,241,0.2)":"rgba(0,0,0,0.07)"}`,borderRadius:10,padding:"10px 14px"}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:i===0?700:500,color:i===0?"#6366f1":"#374151"}}>{snap.label}{i===0?" — le plus récent":""}</div>
                    <div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>{new Date(parseInt(snap.ts)).toLocaleString("fr-FR")}</div>
                  </div>
                  <button onClick={()=>doRestore(snap)}
                    style={{background:i===0?"linear-gradient(135deg,#6366f1,#8b5cf6)":"rgba(0,0,0,0.06)",border:"none",color:i===0?"#fff":"#374151",padding:"7px 14px",borderRadius:7,fontWeight:600,fontSize:12,cursor:"pointer"}}>
                    Restaurer
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL MIGRATION IMAGES BASE64 → SUPABASE ────────────────────────── */}
      {migrateOpen && (
        <div onClick={()=>{ if(!migrateStatus?.running) setMigrateOpen(false); }} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1001,padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"min(480px,100%)",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid #e5e7eb",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontWeight:700,fontSize:14,color:"#1a1a2e"}}>🧹 Migrer les images vers Supabase</div>
                <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>Retrouve toutes les images encore stockées en base64 (anciens uploads) et les envoie vers Supabase Storage pour alléger Firebase.</div>
              </div>
              {!migrateStatus?.running && <button onClick={()=>setMigrateOpen(false)} style={{background:"none",border:"none",fontSize:18,color:"#9ca3af",cursor:"pointer"}}>×</button>}
            </div>
            <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>
              {!migrateStatus && (
                <div style={{fontSize:12,color:"#6b7280",lineHeight:1.6}}>
                  Cette opération peut prendre un moment selon le nombre d'images à migrer. Ne ferme pas cette fenêtre pendant la migration.
                </div>
              )}
              {migrateStatus?.running && (
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#374151"}}>
                    {migrateStatus.done} / {migrateStatus.total} images traitées…
                  </div>
                  <div style={{height:8,background:"rgba(0,0,0,0.06)",borderRadius:5,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${migrateStatus.total ? Math.round(migrateStatus.done/migrateStatus.total*100) : 0}%`,background:"linear-gradient(90deg,#6366f1,#8b5cf6)",transition:"width 0.2s"}}/>
                  </div>
                  {migrateStatus.failed > 0 && <div style={{fontSize:11,color:"#ef4444"}}>{migrateStatus.failed} échec(s) jusqu'ici — resteront en base64.</div>}
                </div>
              )}
              {migrateStatus?.done && (
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {migrateStatus.error ? (
                    <div style={{background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",borderRadius:8,padding:"10px 14px",fontSize:12}}>{migrateStatus.error}</div>
                  ) : migrateStatus.total===0 ? (
                    <div style={{background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.25)",color:"#059669",borderRadius:8,padding:"10px 14px",fontSize:12,fontWeight:600}}>
                      ✓ Aucune image en base64 trouvée — tout est déjà propre !
                    </div>
                  ) : (
                    <div style={{background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.25)",color:"#059669",borderRadius:8,padding:"10px 14px",fontSize:12,fontWeight:600}}>
                      ✓ {migrateStatus.migrated} image(s) migrée(s) vers Supabase{migrateStatus.failed>0?`, ${migrateStatus.failed} échec(s) (restées en base64)`:""}.
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={{padding:"12px 20px",borderTop:"1px solid #e5e7eb",display:"flex",justifyContent:"flex-end",gap:8}}>
              {!migrateStatus?.running && (
                <button onClick={()=>setMigrateOpen(false)} style={{background:"transparent",border:"1px solid #e5e7eb",color:"#374151",padding:"8px 14px",borderRadius:7,fontSize:12,cursor:"pointer"}}>Fermer</button>
              )}
              {!migrateStatus?.running && (
                <button onClick={runMigration}
                  style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",color:"#fff",padding:"8px 18px",borderRadius:7,fontWeight:700,fontSize:12,cursor:"pointer"}}>
                  {migrateStatus?.done ? "Relancer" : "Lancer la migration"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL IMPORT JSON ────────────────────────────────────────────────── */}
      {importOpen && (
        <div onClick={()=>setImportOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"min(640px,100%)",maxHeight:"85vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid #e5e7eb",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{fontWeight:700,fontSize:14,color:"#1a1a2e"}}>📥 Importer un JSON</div>
              <button onClick={()=>setImportOpen(false)} style={{background:"none",border:"none",fontSize:18,color:"#9ca3af",cursor:"pointer"}}>×</button>
            </div>
            <div style={{padding:"16px 20px",overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:14}}>
              <div style={{fontSize:11,color:"#6b7280",lineHeight:1.5}}>
                Choisis un fichier JSON (export complet ou export par perso). Seules les catégories
                listées ci-dessous sont prises en charge. L'import est <strong>toujours additif</strong> : les
                items déjà présents (détectés par contenu) ne sont jamais dupliqués, et rien n'est supprimé
                ni écrasé — ni dans cette catégorie, ni ailleurs.
              </div>

              <label style={{alignSelf:"flex-start",background:"rgba(99,102,241,0.08)",border:"1px dashed rgba(99,102,241,0.4)",color:"#6366f1",borderRadius:8,padding:"8px 14px",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                {importFileName ? `📄 ${importFileName}` : "Choisir un fichier .json"}
                <input type="file" accept=".json,application/json" style={{display:"none"}} onChange={e=>{
                  const f = e.target.files?.[0]; if(!f) return; handleImportFile(f); e.target.value="";
                }}/>
              </label>

              {importError && (
                <div style={{background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",borderRadius:8,padding:"8px 12px",fontSize:11}}>{importError}</div>
              )}

              {importDone && (
                <div style={{background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.25)",color:"#059669",borderRadius:8,padding:"8px 12px",fontSize:12,fontWeight:600}}>
                  ✓ {importDone.added} élément(s) importé(s){importDone.skipped>0 ? `, ${importDone.skipped} déjà présent(s) ignoré(s)` : ""}.
                </div>
              )}

              {importParsed && !importDone && (()=>{
                const visible = importScan.filter(s=>s.incomingCount>0);
                if(visible.length===0) return (
                  <div style={{fontSize:12,color:"#9ca3af",fontStyle:"italic"}}>Aucune donnée reconnue (Facebook / Twitter / Tumblr / Instagram) trouvée dans ce fichier.</div>
                );
                const grouped = visible.reduce((acc,s)=>{ (acc[s.appLabel]=acc[s.appLabel]||[]).push(s); return acc; },{});
                return (<div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {/* ── Niveau 1 : sélecteurs d'app ── */}
                  <div style={{fontSize:11,fontWeight:700,color:"#9ca3af",letterSpacing:0.5,textTransform:"uppercase"}}>Apps à importer</div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {Object.entries(grouped).map(([appLabel, defs])=>{
                      const appOn = importSelectedApps.has(appLabel);
                      const totalNew = defs.reduce((s,d)=>s+d.newCount,0);
                      return (
                        <button key={appLabel} onClick={()=>toggleImportApp(appLabel, defs)}
                          disabled={totalNew===0}
                          style={{
                            display:"flex",alignItems:"center",gap:6,
                            padding:"8px 14px",borderRadius:8,border:"none",
                            background:appOn?"linear-gradient(135deg,#6366f1,#8b5cf6)":"rgba(0,0,0,0.05)",
                            color:appOn?"#fff":totalNew===0?"#d1d5db":"#374151",
                            fontWeight:appOn?700:500,fontSize:12,cursor:totalNew===0?"default":"pointer",
                            transition:"all 0.15s",
                          }}>
                          {appLabel}
                          <span style={{fontSize:10,background:appOn?"rgba(255,255,255,0.25)":"rgba(0,0,0,0.08)",borderRadius:10,padding:"1px 7px",fontWeight:700}}>
                            {totalNew} nv.
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* ── Niveau 2 : catégories (seulement si l'app est cochée) ── */}
                  {Object.entries(grouped).map(([appLabel, defs])=>{
                    if(!importSelectedApps.has(appLabel)) return null;
                    return (
                      <div key={appLabel} style={{display:"flex",flexDirection:"column",gap:5,background:"rgba(99,102,241,0.03)",border:"1px solid rgba(99,102,241,0.1)",borderRadius:10,padding:"10px 12px"}}>
                        <div style={{fontSize:11,fontWeight:700,color:"#6366f1",marginBottom:2}}>{appLabel} — catégories</div>
                        {defs.map(def=>(
                          <label key={def.id} style={{display:"flex",alignItems:"center",gap:8,background:importEffectiveSelected.has(def.id)?"rgba(99,102,241,0.06)":"rgba(0,0,0,0.02)",border:`1px solid ${importEffectiveSelected.has(def.id)?"rgba(99,102,241,0.2)":"rgba(0,0,0,0.06)"}`,borderRadius:8,padding:"7px 10px",cursor:def.newCount>0?"pointer":"default",opacity:def.newCount>0?1:0.5}}>
                            <input type="checkbox" checked={importEffectiveSelected.has(def.id)} disabled={def.newCount===0}
                              onChange={e=>{
                                const next = new Set(importSelected);
                                e.target.checked ? next.add(def.id) : next.delete(def.id);
                                setImportSelected(next);
                              }}/>
                            <div style={{flex:1}}>
                              <div style={{fontSize:12,color:"#1a1a2e"}}>{def.label}</div>
                              <div style={{fontSize:10,color:"#9ca3af"}}>
                                {def.incomingCount} trouvé(s) — {def.newCount>0 ? `${def.newCount} nouveau(x)` : "déjà tous présents"}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    );
                  })}
                </div>);
              })()}
            </div>
            {importParsed && !importDone && (
              <div style={{padding:"14px 20px",borderTop:"1px solid #e5e7eb",display:"flex",justifyContent:"flex-end",gap:8}}>
                <button onClick={()=>setImportOpen(false)} style={{background:"transparent",border:"1px solid #e5e7eb",color:"#374151",padding:"8px 14px",borderRadius:7,fontSize:12,cursor:"pointer"}}>Annuler</button>
                <button onClick={runImport} disabled={importEffectiveSelected.size===0}
                  style={{background:importEffectiveSelected.size===0?"#d1d5db":"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",color:"#fff",padding:"8px 16px",borderRadius:7,fontWeight:600,fontSize:12,cursor:importEffectiveSelected.size===0?"default":"pointer"}}>
                  Importer la sélection
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export { AdminBackoffice };
