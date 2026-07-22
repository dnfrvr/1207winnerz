import React from "react";
import { parseLoreTime, getLoreDate } from "../shared/lore-date.js";
import { getCharKey, getSharedAvatars } from "../shared/social-feed.js";

// Facebook — fil d'amis unique et partagé entre les 4 persos (synchronisé via data.sharedThreads._sharedFacebookPosts, comme Twitter).
// Valeurs par défaut tant que rien n'a été modifié depuis l'admin.
const FACEBOOK_PROFILES_DEFAULT = {
  glinda:{name:"Glinda Ravingfool",friends:"342"},
  eoghan:{name:"Eoghan Masuda",    friends:"891"},
  drew:  {name:"Drew Buckley",     friends:"156"},
  elias: {name:"Elias Green",      friends:"89"},
};
const FACEBOOK_FRIENDS_FEED_DEFAULT = [
  {name:"Glinda Ravingfool",time:"2 minutes ago",text:"playlist d'automne en boucle 🍂✨ qui a des recs ?",likes:23,comments:8},
  {name:"Eoghan Masuda",    time:"2 hours ago · 🌍",text:"nouveau son en ligne 🎵 #soundcloud soundcloud.com/eoghan_m",likes:12,comments:3},
  {name:"Drew Buckley",     time:"5 hours ago",text:"Ver de terre de 22 cm découvert ce matin. Record personnel. 🪱",likes:4,comments:7},
  {name:"Cynthia K.",       time:"8 hours ago",text:"Chess club UMA demain 14h salle B204 ! 🏆 cc Glinda, Drew",likes:6,comments:2},
  {name:"Eoghan Masuda",    time:"3 hours ago · 🌍",text:"séance du mat ✅ 6km ce soir ✅ reste à finir Rush 🎸",likes:18,comments:5},
  {name:"Glinda Ravingfool",time:"8 hours ago",text:"JOUR 29 avec mon bff 🎉🎉 tu mérites une médaille de survie @Eoghan",likes:61,comments:14},
  {name:"Ilya Sorokin",     time:"1 day ago",text:"soirée avec eoghan et asra ce soir 👀 incoming chaos",likes:22,comments:4},
  {name:"Drew Buckley",     time:"1 hour ago",text:"Ver de terre de 22 cm découvert ce matin. Record personnel. #Science 🪱",likes:4,comments:7},
  {name:"Cynthia K.",       time:"3 hours ago",text:"@Drew t'as vu le classement des clubs ? L'échecs est PREMIER 🏆🏆",likes:9,comments:3},
  {name:"Elias Green",      time:"5 hours ago",text:"personne ne voit ce que je vois. c'est ok. ça changera.",likes:2,comments:1},
];

// Pages suivies — propres à chaque perso (centres d'intérêt), pas partagées.
// Éditables depuis l'admin via data.facebookPages[charKey].
const FACEBOOK_PAGES_DEFAULT = {
  glinda:[
    {name:"UMA Campus Life",  time:"4 hours ago",text:"🍂 Fall Festival samedi sur le campus ! Musique live, food trucks et surprises.",likes:247,comments:31},
    {name:"Glam & Glow Makeup",time:"6 hours ago",text:"Le smokey eye automnal qui va avec TOUTES vos tenues 🍁💄 tuto en story",likes:1842,comments:96},
    {name:"Sephora",          time:"1 day ago",text:"Notre palette édition automne est en rupture de stock dans 80% des boutiques 😱 nouvelle livraison vendredi",likes:3204,comments:412},
  ],
  eoghan:[
    {name:"UMA Athletics",    time:"5 hours ago",text:"🏃 Bravo à notre équipe de cross-country pour la victoire de dimanche !",likes:54,comments:12},
    {name:"NFL",              time:"7 hours ago",text:"🏈 Week 4 recap: les surprises de la semaine et ce qui nous attend dimanche.",likes:18420,comments:2103},
    {name:"ESPN College Football",time:"1 day ago",text:"Le classement vient de bouger. Qui aurait cru ça en septembre ?",likes:9234,comments:887},
  ],
  drew:[
    {name:"Team Edward Official",time:"2 days ago",text:"BD Twilight vol.3 disponible dès aujourd'hui ! 🌙 #Twilight",likes:2847,comments:341},
    {name:"iNaturalist",      time:"2 days ago",text:"Species of the week: Lumbricus terrestris 🪱 The common earthworm.",likes:431,comments:28},
    {name:"UMA Biology Dept", time:"5 hours ago",text:"📋 Reminder: lab reports due this Friday by midnight. No extensions.",likes:12,comments:2},
  ],
  elias:[
    {name:"Stephen King",     time:"4 hours ago",text:"Derry isn't on most maps. That's never stopped it from being real to the people who grew up there.",likes:18234,comments:1402},
    {name:"My Chemical Romance",time:"1 day ago",text:"Writing. 🖤",likes:48293,comments:5821},
    {name:"Conspiracy Theory Group",time:"2 days ago",text:"THREAD: Les disparitions de Derry, Maine — 1985 à aujourd'hui. 27 ans de silence.",likes:312,comments:89},
    {name:"Bring Me The Horizon",time:"3 days ago",text:"Sempiternal is taking shape. Darker than ever. 🖤",likes:24819,comments:3214},
  ],
};

const FacebookScreen = ({data, isIos, accent}) => {
  const charKey = getCharKey(data);
  const FB_BLUE = "#3B5998";
  const FB_DARK = "#2d4373";
  const FB_BG   = "#e8eaf0";

  const me = FACEBOOK_PROFILES_DEFAULT[charKey];
  const friendsFeed = data.sharedThreads?._sharedFacebookPosts || FACEBOOK_FRIENDS_FEED_DEFAULT;
  const pagePosts   = data.facebookPages?.[charKey] || FACEBOOK_PAGES_DEFAULT[charKey] || [];
  // Tri unifié : le lore par défaut / les pages utilisent du relatif ("2 minutes ago", "3 hours
  // ago"...), mais "Mes posts (partagés)" utilise le sélecteur LoreDateTimeInput qui produit une
  // date ABSOLUE ("6 oct, 9:00am") — l'ancien tri ne comprenait QUE le relatif, donc tout post réel
  // (date absolue) retombait à 0 et se retrouvait mal placé. On convertit les deux formats vers une
  // même échelle (minutes depuis le début de l'année lore), ancrée sur "maintenant" = fin de la
  // journée lore en cours (loreDate), pour que les deux types de dates s'entremêlent correctement.
  const [, FB_LORE_MONTH, FB_LORE_DAY] = getLoreDate().split('-').map(Number);
  const loreAbsMinutes = (month, day, hour=0, min=0) => (month||0)*44640 + (day||0)*1440 + hour*60 + min;
  const FB_NOW_ABS = loreAbsMinutes(FB_LORE_MONTH, FB_LORE_DAY, 23, 59);
  const toAbsMinutes = (t) => {
    const rel = (t||"").match(/(\d+)\s*(minute|hour|day)/);
    if(rel) {
      const n = parseInt(rel[1]);
      const agoMin = rel[2]==="minute" ? n : rel[2]==="hour" ? n*60 : n*1440;
      return FB_NOW_ABS - agoMin;
    }
    const p = parseLoreTime(t);
    if(p) return loreAbsMinutes(p.month, p.day, p.hour||0, p.min||0);
    return -Infinity; // format non reconnu → en bas du fil plutôt qu'en tête
  };
  const posts = [...friendsFeed, ...pagePosts].sort((a,b)=>toAbsMinutes(b.time)-toAbsMinutes(a.time));

  const sharedAvatars = getSharedAvatars(data);
  const NAME_TO_KEY = {
    "Glinda Ravingfool":"glinda", "Eoghan Masuda":"eoghan",
    "Drew Buckley":"drew", "Elias Green":"elias",
  };
  const Avatar = ({name,author,avatar,size=36,forMe=false}) => {
    // FIX : avant, l'avatar ne se résolvait QUE via NAME_TO_KEY[name] — une correspondance fragile
    // sur le texte exact du nom affiché. Si le nom tapé dans l'admin différait même légèrement de
    // "Eoghan Masuda"/"Drew Buckley" (espace, abréviation, surnom...), la résolution échouait
    // silencieusement et affichait l'initiale au lieu de la vraie photo — même si _sharedAvatars
    // contenait bien la photo. Désormais on utilise post.author en priorité (toujours fiable, posé
    // automatiquement sur chaque post) et on ne retombe sur NAME_TO_KEY que pour les rares posts
    // historiques qui n'auraient pas encore d'author.
    // `avatar` (prop directe) a la priorité absolue : c'est ce qu'utilisent les pages suivies
    // (comptes fictifs sans clé perso, donc author/NAME_TO_KEY ne peuvent rien résoudre pour elles).
    const ck = forMe ? charKey : (author || NAME_TO_KEY[name]);
    const profilePic = avatar || (ck === charKey ? (data.avatar || sharedAvatars[ck]) : sharedAvatars[ck]);
    return profilePic
      ? <div style={{width:size,height:size,borderRadius:4,overflow:"hidden",flexShrink:0}}><img src={profilePic} style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>
      : <div style={{width:size,height:size,borderRadius:4,background:FB_BLUE,border:"1px solid #2a4a7a",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:size*0.38,flexShrink:0}}>
          {name[0]}
        </div>;
  };

  const fmtNum = n => n>999?`${(n/1000).toFixed(0)}K`:n;

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",background:FB_BG,overflow:"hidden"}}>
      {/* FB iOS 2012 top bar */}
      <div style={{background:`linear-gradient(180deg,${FB_BLUE},${FB_DARK})`,padding:"6px 8px",display:"flex",alignItems:"center",gap:6,flexShrink:0,boxShadow:"0 1px 3px rgba(0,0,0,0.4)"}}>
        {/* Hamburger */}
        <div style={{width:34,height:30,borderRadius:4,background:"rgba(255,255,255,0.15)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,flexShrink:0}}>
          {[0,1,2].map(i=><div key={i} style={{width:16,height:2,background:"#fff",borderRadius:1}}/>)}
        </div>
        {/* Icons */}
        <div style={{flex:1,display:"flex",justifyContent:"center",gap:6}}>
          {[
            <svg key="friends" width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="#fff"/></svg>,
            <svg key="msgs" width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M3 4h18v12H9l-4 4v-4H3V4z" fill="#fff"/></svg>,
            <svg key="globe" width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="1.6" fill="none"/><path d="M3 12h18M12 3c2.4 2.4 3.6 5.6 3.6 9s-1.2 6.6-3.6 9c-2.4-2.4-3.6-5.6-3.6-9s1.2-6.6 3.6-9z" stroke="#fff" strokeWidth="1.4" fill="none"/></svg>,
          ].map((ic,i)=>(
            <div key={i} style={{width:34,height:30,borderRadius:4,background:i===0?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              {ic}
            </div>
          ))}
        </div>
        <div style={{width:50,height:30,borderRadius:4,background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <span style={{color:"#fff",fontSize:11,fontWeight:600}}>Sort</span>
        </div>
      </div>
      {/* Feed */}
      <div style={{flex:1,overflowY:"auto",padding:"10px 10px 0"}}>
        {posts.length === 0 && (
          <div style={{padding:"32px 16px",textAlign:"center",color:"#90949c",fontSize:13}}>
            Aucun post pour l'instant.<br/>
            <span style={{fontSize:11,marginTop:6,display:"block"}}>Les posts des personnages apparaîtront ici une fois créés depuis l'admin.</span>
          </div>
        )}
        {posts.map((p,i)=>(
          <div key={i} style={{background:"#fff",marginBottom:8,borderTop:"1px solid #dde3ea",borderBottom:"1px solid #dde3ea"}}>
            {/* Post header */}
            <div style={{padding:"8px 10px",display:"flex",gap:8,alignItems:"flex-start"}}>
              <Avatar name={p.name} author={p.author} avatar={p.avatar}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:"#1d2129"}}>{p.name}</div>
                <div style={{fontSize:11,color:"#90949c",display:"flex",alignItems:"center",gap:4}}>
                  {p.time}
                  <span style={{fontSize:9}}>·</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="#90949c"/></svg>
                </div>
              </div>
            </div>
            {/* Post text */}
            <div style={{padding:"0 10px 8px",fontSize:13,color:"#1d2129",lineHeight:1.45}}>{p.text}</div>
            {p.img && <img src={p.img} style={{width:"100%",display:"block",maxHeight:300,objectFit:"cover"}}/>}
            {/* Like/comment bar */}
            <div style={{borderTop:"1px solid #dde3ea",padding:"4px 10px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",gap:12}}>
                <span style={{color:FB_BLUE,fontSize:12,fontWeight:600,cursor:"pointer"}}>Like</span>
                <span style={{color:"#90949c",fontSize:11}}>·</span>
                <span style={{color:FB_BLUE,fontSize:12,fontWeight:600,cursor:"pointer"}}>Comment</span>
              </div>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:3}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M2 21h2a2 2 0 002-2v-7a2 2 0 00-2-2H2v11zm20-9a2 2 0 00-2-2h-6.31l.95-4.57.03-.32a1.5 1.5 0 00-.44-1.06L13.17 3 7.59 8.59A2 2 0 007 10v9a2 2 0 002 2h9a2 2 0 001.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" fill="#3B5998"/></svg>
                  <span style={{color:"#90949c",fontSize:11}}>{fmtNum(p.likes)}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:3}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 4h18v12H9l-4 4v-4H3V4z" fill="#90949c"/></svg>
                  <span style={{color:"#90949c",fontSize:11}}>{p.comments}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};



export { FacebookScreen, FACEBOOK_PROFILES_DEFAULT, FACEBOOK_FRIENDS_FEED_DEFAULT, FACEBOOK_PAGES_DEFAULT };
