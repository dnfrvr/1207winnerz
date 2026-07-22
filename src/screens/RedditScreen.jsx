import React, { useState } from "react";

const REDDIT_ALL_POSTS = [
  {id:1,  sub:"r/conspiracy",     age:"2h",  pts:"2.8k", comm:543,  saved:false, title:"Le gouvernement suit nos téléphones même éteints — thread de preuves compilées",domain:"self.conspiracy"},
  {id:2,  sub:"r/UFOs",           age:"3h",  pts:"5.6k", comm:712,  saved:false, title:"Docs déclassifiés : phénomènes aériens inexpliqués au-dessus de Derry ME — 27 incidents depuis 1985",domain:"foia.gov"},
  {id:3,  sub:"r/Sculpture",      age:"5h",  pts:"3.1k", comm:204,  saved:false, title:"Mon premier bronze grande échelle — 8 mois de travail, enfin terminé [OC]",domain:"i.imgur.com"},
  {id:7,  sub:"r/Maine",          age:"6h",  pts:"891",  comm:178,  saved:false, title:"Lumières étranges au-dessus d'Augusta hier soir — quelqu'un d'autre a vu ça ? [photo en commentaires]",domain:"i.imgur.com"},
  {id:8,  sub:"r/conspiracy",     age:"1d",  pts:"6.2k", comm:831,  saved:true,  title:"Les disparitions de Derry : 27 cas non résolus depuis 1985. Le silence médiatique est assourdissant.",domain:"self.conspiracy"},
  {id:12, sub:"r/creepypasta",    age:"12h", pts:"34",   comm:12,   saved:false, title:"[OC] The Night Watchman — ce qui arrive vraiment aux personnes disparues dans les petites villes",domain:"self.creepypasta"},
  {id:13, sub:"r/Augusta_ME",     age:"4h",  pts:"312",  comm:67,   saved:false, title:"Quelqu'un a remarqué que les flics stationnent près de Cony High tous les soirs cette semaine ?",domain:"self.Augusta_ME"},
  {id:15, sub:"r/Augusta_ME",     age:"1d",  pts:"441",  comm:134,  saved:true,  title:"PSA : si votre enfant joue près de la Kennebec après le coucher du soleil, ne le laissez pas. Quelque chose ne va pas cet été.",domain:"self.Augusta_ME"},
  {id:18, sub:"r/missingpersons", age:"3h",  pts:"2.2k", comm:481,  saved:true,  title:"Anna Green, 8 ans, disparue le 13 juillet — région Augusta/Derry. La police n'a aucune piste. La famille supplie.",domain:"self.missingpersons"},
  {id:22, sub:"r/AskScience",     age:"14h", pts:"5.8k", comm:1102, saved:false, title:"Est-il possible de perdre des souvenirs liés à un lieu géographique précis ? Je demande pour un ami [sérieux]",domain:"self.AskScience"},
  {id:30, sub:"r/stephenking",    age:"2h",  pts:"14k",  comm:2341, saved:false, title:"Ca (le roman) vient d'être réédité — quelqu'un d'autre trouve que Derry ressemble trop à une vraie ville ?",domain:"self.stephenking"},
  {id:31, sub:"r/AskScience",     age:"4h",  pts:"22k",  comm:4102, saved:false, title:"Pourquoi certaines personnes oublient-elles sélectivement des événements traumatiques ?",domain:"science.org"},
  {id:32, sub:"r/paranormal",     age:"5h",  pts:"18k",  comm:3210, saved:false, title:"Thread : les 50 cas de disparitions d'enfants les plus inexpliqués aux États-Unis depuis 1985",domain:"self.paranormal"},
  {id:33, sub:"r/Maine",          age:"6h",  pts:"9.1k", comm:1780, saved:false, title:"Le Maine State Police refuse de commenter les disparitions de cet été. Voici ce qu'on sait.",domain:"pressherald.com"},
  {id:34, sub:"r/UFOs",           age:"8h",  pts:"31k",  comm:6700, saved:false, title:"Image satellite classifiée leak : structure souterraine non répertoriée, comté de Penobscot, Maine",domain:"i.imgur.com"},
  {id:35, sub:"r/conspiracy",     age:"10h", pts:"45k",  comm:8900, saved:false, title:"Pourquoi toutes les grandes disparitions d'enfants aux USA ont-elles lieu en été et dans des petites villes ?",domain:"self.conspiracy"},
  {id:36, sub:"r/Augusta_ME",     age:"12h", pts:"3.2k", comm:890,  saved:false, title:"Le Kennebec River a baissé de 40cm depuis juillet. La ville dit que c'est normal. Ce n'est pas normal.",domain:"self.Augusta_ME"},
  {id:37, sub:"r/creepypasta",    age:"1d",  pts:"12k",  comm:2100, saved:false, title:"[OC] J'ai trouvé des symboles dans les égouts sous ma ville. Je les ai dessinés. Quelqu'un reconnaît ?",domain:"self.creepypasta"},
  {id:38, sub:"r/missingpersons", age:"1d",  pts:"7.8k", comm:1560, saved:false, title:"Michelle Baldwin, 14 ans — les parents disent que la police leur a dit 'd'attendre'. Inadmissible.",domain:"self.missingpersons"},
  {id:4,  sub:"r/conspiracy",     age:"7h",  pts:"1.4k", comm:290,  saved:false, title:"Pourquoi la NSA a-t-elle construit un datacenter d'1M m² dans l'Utah ? Qu'est-ce qu'ils stockent ?",domain:"wired.com"},
  {id:5,  sub:"r/aliens",         age:"8h",  pts:"4.2k", comm:631,  saved:false, title:"Un ex-officier NORAD brise son NDA : 'Ce qu'on a détecté au-dessus du Maine en 1998 n'était pas humain'",domain:"self.aliens"},
  {id:6,  sub:"r/Sculpture",      age:"10h", pts:"1.8k", comm:97,   saved:false, title:"La différence entre sculpture soustractive et additive — guide visuel pour débutants",domain:"artsy.net"},
  {id:9,  sub:"r/UFOs",           age:"1d",  pts:"2.1k", comm:344,  saved:false, title:"Lumières de Phoenix 2012 : nouvelles images de témoin oculaire — 47 min brutes non éditées",domain:"youtube.com"},
  {id:11, sub:"r/aliens",         age:"1d",  pts:"7.8k", comm:1203, saved:false, title:"La NASA a supprimé cette photo de leur serveur en 2009. Quelqu'un l'a sauvegardée. [thread]",domain:"self.aliens"},
  {id:14, sub:"r/Augusta_ME",     age:"9h",  pts:"88",   comm:23,   saved:false, title:"Commémoration pour les enfants disparus samedi au Capitol Park — 11h, tout le monde est bienvenu",domain:"self.Augusta_ME"},
  {id:16, sub:"r/paranormal",     age:"5h",  pts:"1.1k", comm:298,  saved:false, title:"J'entends des voix d'enfants dans mon sous-sol à 3h du matin depuis deux semaines. Pas d'enfants chez moi.",domain:"self.paranormal"},
  {id:17, sub:"r/paranormal",     age:"2d",  pts:"3.3k", comm:720,  saved:false, title:"Des clowns aperçus dans trois petites villes du Maine ce mois-ci : Derry, Augusta, Keene.",domain:"self.paranormal"},
  {id:19, sub:"r/missingpersons", age:"6h",  pts:"987",  comm:203,  saved:false, title:"Michelle Baldwin (14 ans) toujours disparue — les parents disent que la police leur a dit 'd'attendre'.",domain:"self.missingpersons"},
  {id:20, sub:"r/stephenking",    age:"8h",  pts:"4.7k", comm:892,  saved:false, title:"Je lis Ca pour la première fois en 2012. Pourquoi Derry semble si réelle ? J'ai demandé à un habitant du Maine — il s'est tu.",domain:"self.stephenking"},
  {id:21, sub:"r/stephenking",    age:"1d",  pts:"6.1k", comm:1034, saved:false, title:"La géographie dans Ca est troublante de précision. J'ai cartographié chaque lieu — tout existe dans la région d'Augusta.",domain:"self.stephenking"},
  {id:23, sub:"r/Maine",          age:"2d",  pts:"1.2k", comm:299,  saved:false, title:"Le niveau de la Kennebec est anormal depuis cet été. L'État ne dit rien. Quelqu'un surveille ça ?",domain:"self.Maine"},
  {id:39, sub:"r/aliens",         age:"2d",  pts:"28k",  comm:5400, saved:false, title:"La NASA a discrètement supprimé ce dossier de leur serveur en 2009. Quelqu'un l'a sauvegardé.",domain:"self.aliens"},
  {id:40, sub:"r/Sculpture",      age:"2d",  pts:"95k",  comm:4200, saved:false, title:"Le processus de travail de Rodin — photos d'archives rares",domain:"metmuseum.org"},
];

const RedditScreen = ({data, isIos, accent}) => {
  const [tab,       setTab]       = React.useState("home");
  const [subFilter, setSubFilter] = React.useState(null);
  const [sortTab,   setSortTab]   = React.useState("hot");
  const [searchQ,   setSearchQ]   = React.useState("");
  const RD="#FF4500", META=isIos?"#8e8e93":"#818384", BORDER=isIos?"#c8c7cc":"#343536";
  const CARD=isIos?"#fff":"#272729", LINK=isIos?"#1a1a1a":"#d7dadc", UP="#FF4500";

  const subColor = s => ({
    "r/conspiracy":"#4a9eff","r/UFOs":"#1abc9c","r/aliens":"#9b59b6",
    "r/Sculpture":"#e67e22","r/Maine":"#27ae60","r/creepypasta":"#e74c3c",
    "r/Augusta_ME":"#2ecc71","r/paranormal":"#8e44ad","r/missingpersons":"#c0392b",
    "r/stephenking":"#e74c3c","r/AskScience":"#3498db",
  }[s]||RD);

  const fmtPts = v => { const n=parseFloat(String(v).replace("k",""))*(String(v).includes("k")?1000:1); return n>=1000?(n/1000).toFixed(n>=10000?0:1)+"k":String(n); };

  const ALL_POSTS = (data?.reddit && data.reddit.length > 0) ? data.reddit : REDDIT_ALL_POSTS;
  const myPosts = [
    {id:101, sub:"r/UFOs",       age:"3d",  pts:"47",  comm:12, title:"Symboles trouvés dans les égouts d'Augusta — quelqu'un reconnaît ? [photos]", domain:"i.imgur.com"},
    {id:102, sub:"r/conspiracy", age:"1w", pts:"312", comm:89, title:"Enfants disparus selon un cycle de 27 ans — Derry ME. J'ai un tableur.", domain:"self.conspiracy"},
    {id:103, sub:"r/Augusta_ME", age:"2w", pts:"28",  comm:9,  title:"Ma sœur Anna Green a été enlevée le 13 juillet. Je ne m'arrêterai pas avant de trouver des réponses.", domain:"self.Augusta_ME"},
  ];

  const inbox = [
    {user:"u/TruthSeeker99",     age:"2h",  preview:"re: disparitions de Derry — je documente ça depuis 2009. Il faut qu'on parle en privé.",           unread:true},
    {user:"u/MaineWatcher",      age:"5h",  preview:"re: symboles égouts Augusta — j'ai photographié les mêmes près du canal en 1985. Ils sont encore là.", unread:true},
    {user:"u/AutoModerator",     age:"1d",  preview:"Votre post 'Enfants disparus selon un cycle de 27 ans' a été supprimé pour violation de la règle 4.", unread:false},
    {user:"u/paranormal_Keene",  age:"2d",  preview:"re: clown — c'était près de la Neibolt House, je le jure. Cette maison n'existe pas sur les cartes.",  unread:false},
    {user:"u/RedditCareResources",age:"3d", preview:"Quelqu'un nous a envoyé un rapport Reddit Cares vous concernant. On veut prendre de vos nouvelles.",   unread:false},
  ];

  const subs = [
    {s:"r/Augusta_ME",     members:"4.2k",  color:"#2ecc71", desc:"La ville d'Augusta, Maine. Actu, vie locale, mystères."},
    {s:"r/conspiracy",     members:"312k",  color:"#4a9eff", desc:"Le monde tel qu'il est vraiment."},
    {s:"r/UFOs",           members:"189k",  color:"#1abc9c", desc:"Phénomènes aériens non identifiés."},
    {s:"r/paranormal",     members:"95k",   color:"#8e44ad", desc:"Ce que la science n'explique pas encore."},
    {s:"r/missingpersons", members:"47k",   color:"#c0392b", desc:"Personnes disparues — aide à la recherche."},
    {s:"r/stephenking",    members:"78k",   color:"#e74c3c", desc:"Le roi de l'horreur et son univers."},
    {s:"r/Maine",          members:"62k",   color:"#27ae60", desc:"État du Maine — communauté locale."},
    {s:"r/Sculpture",      members:"44k",   color:"#e67e22", desc:"Art, sculpture, création."},
    {s:"r/creepypasta",    members:"130k",  color:"#e74c3c", desc:"Histoires d'horreur collaboratives."},
    {s:"r/AskScience",     members:"520k",  color:"#3498db", desc:"Questions scientifiques sérieuses."},
    {s:"r/aliens",         members:"210k",  color:"#9b59b6", desc:"Extraterrestres, contact, preuves."},
  ];

  const sorted = (arr) => arr.slice().sort((a,b)=>
    sortTab==="new" ? (b.id-a.id) :
    sortTab==="top" ? (parseFloat(b.pts)-parseFloat(a.pts)) : 0
  );
  const allFiltered   = sorted(subFilter ? ALL_POSTS.filter(p=>p.sub===subFilter) : ALL_POSTS);
  const searchResults = searchQ.length>1 ? ALL_POSTS.filter(p=>p.title.toLowerCase().includes(searchQ.toLowerCase())||p.sub.toLowerCase().includes(searchQ.toLowerCase())) : [];

  const PostCard = ({p}) => isIos ? (
    <div style={{background:CARD,borderBottom:`1px solid ${BORDER}`,overflow:"hidden"}}>
      <div style={{padding:"7px 12px 4px",display:"flex",alignItems:"center",gap:6}}>
        <div style={{width:16,height:16,borderRadius:3,background:subColor(p.sub),flexShrink:0,boxShadow:"0 1px 2px rgba(0,0,0,0.18)"}}/>
        <span style={{fontSize:11,fontWeight:700,color:subColor(p.sub)}}>{p.sub}</span>
        <span style={{fontSize:10,color:META}}>· {p.age}</span>
        {p.domain&&<span style={{fontSize:9,color:META,marginLeft:"auto"}}>{p.domain}</span>}
      </div>
      <div style={{padding:"2px 12px 8px",fontSize:13,fontWeight:600,color:LINK,lineHeight:1.4}}>{p.title}</div>
      <div style={{borderTop:`1px solid ${BORDER}`,padding:"5px 10px",display:"flex",alignItems:"center",gap:8,background:"linear-gradient(180deg,#f0ede7,#e8e4de)"}}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill={UP}><path d="M12 4L4 12h5v8h6v-8h5L12 4z"/></svg>
        <span style={{fontSize:11,fontWeight:700,color:UP}}>{p.pts}</span>
        <div style={{width:1,height:12,background:BORDER}}/>
        <span style={{fontSize:11,color:META}}>{p.comm} comments</span>
        {p.saved&&<span style={{marginLeft:"auto",fontSize:9,color:"#007AFF",fontWeight:700}}>★ saved</span>}
      </div>
    </div>
  ) : (
    <div style={{background:CARD,borderRadius:4,marginBottom:8,overflow:"hidden",border:`1px solid ${BORDER}`}}>
      <div style={{padding:"8px 10px 4px",display:"flex",alignItems:"center",gap:6}}>
        <div style={{width:18,height:18,borderRadius:"50%",background:subColor(p.sub),flexShrink:0}}/>
        <span style={{fontSize:11,fontWeight:700,color:LINK}}>{p.sub}</span>
        <span style={{fontSize:10,color:META}}>· {p.age}</span>
        {p.domain&&<span style={{fontSize:9,color:META,marginLeft:"auto",background:"#3a3a3c",padding:"1px 5px",borderRadius:3}}>{p.domain}</span>}
      </div>
      <div style={{padding:"2px 10px 8px",fontSize:13,fontWeight:600,color:LINK,lineHeight:1.4}}>{p.title}</div>
      <div style={{borderTop:`1px solid ${BORDER}`,padding:"6px 8px",display:"flex",alignItems:"center",gap:4,background:"#1f1f20"}}>
        <div style={{display:"flex",alignItems:"center",gap:4,background:"#3a3a3c",borderRadius:20,padding:"4px 9px"}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill={UP}><path d="M12 4L4 12h5v8h6v-8h5L12 4z"/></svg>
          <span style={{fontSize:11,fontWeight:700,color:UP}}>{p.pts}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4,background:"#3a3a3c",borderRadius:20,padding:"4px 9px"}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke={META} strokeWidth="2"/></svg>
          <span style={{fontSize:11,color:META}}>{p.comm}</span>
        </div>
      </div>
    </div>
  );

  if(isIos) {
    const allSubs = [...new Set(ALL_POSTS.map(p=>p.sub))];

    const TabBar = () => (
      <div style={{background:"linear-gradient(180deg,#e8e6e0,#d0cdc7)",borderTop:"1px solid #b8b6b0",display:"flex",flexShrink:0,height:50,boxShadow:"0 -1px 0 rgba(255,255,255,0.6) inset"}}>
        {[
          ["home",    "Home",    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 11L12 3l9 8M5 9.5V20a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1V9.5" stroke={tab==="home"?RD:"#888"} strokeWidth="2" strokeLinecap="round"/></svg>],
          ["subs",    "Subs",    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1" stroke={tab==="subs"?RD:"#888"} strokeWidth="2"/><rect x="14" y="3" width="7" height="7" rx="1" stroke={tab==="subs"?RD:"#888"} strokeWidth="2"/><rect x="3" y="14" width="7" height="7" rx="1" stroke={tab==="subs"?RD:"#888"} strokeWidth="2"/><rect x="14" y="14" width="7" height="7" rx="1" stroke={tab==="subs"?RD:"#888"} strokeWidth="2"/></svg>],
          ["search",  "Search",  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke={tab==="search"?RD:"#888"} strokeWidth="2"/><path d="M20 20l-3.5-3.5" stroke={tab==="search"?RD:"#888"} strokeWidth="2" strokeLinecap="round"/></svg>],
          ["inbox",   "Inbox",   <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={tab==="inbox"?RD:"#888"} strokeWidth="2"/><path d="M22 6l-10 7L2 6" stroke={tab==="inbox"?RD:"#888"} strokeWidth="2"/></svg>],
        ].map(([key,label,icon])=>(
          <div key={key} onClick={()=>setTab(key)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1,cursor:"pointer",paddingBottom:2}}>
            {icon}
            <span style={{fontSize:9,color:tab===key?RD:"#888",fontWeight:tab===key?700:400}}>{label}</span>
          </div>
        ))}
      </div>
    );

    const SubPills = ({subs:subList}) => (
      <div style={{background:"linear-gradient(180deg,#e8e6e0,#d8d6d0)",borderBottom:"1px solid #c8c7cc",padding:"6px 8px",display:"flex",gap:5,overflowX:"auto",flexShrink:0,WebkitOverflowScrolling:"touch"}}>
        <div onClick={()=>setSubFilter(null)} style={{flexShrink:0,padding:"4px 11px",borderRadius:10,background:subFilter===null?"linear-gradient(180deg,#ff6634,#e84000)":"linear-gradient(180deg,#fff,#e8e6e0)",border:subFilter===null?"1px solid #cc3200":"1px solid #bbb",boxShadow:"0 1px 2px rgba(0,0,0,0.15)"}}>
          <span style={{fontSize:11,fontWeight:700,color:subFilter===null?"#fff":"#555"}}>All</span>
        </div>
        {subList.map(s=>(
          <div key={s} onClick={()=>setSubFilter(s===subFilter?null:s)} style={{flexShrink:0,padding:"4px 11px",borderRadius:10,background:subFilter===s?`linear-gradient(180deg,${subColor(s)},${subColor(s)}bb)`:"linear-gradient(180deg,#fff,#e8e6e0)",border:subFilter===s?`1px solid ${subColor(s)}88`:"1px solid #bbb",boxShadow:"0 1px 2px rgba(0,0,0,0.12)"}}>
            <span style={{fontSize:10,fontWeight:700,color:subFilter===s?"#fff":subColor(s)}}>{s}</span>
          </div>
        ))}
      </div>
    );

    const SortTabs = () => (
      <div style={{display:"flex",background:"linear-gradient(180deg,#e0deda,#d0cec8)",borderBottom:"1px solid #bbb",flexShrink:0}}>
        {["hot","new","top"].map((t,i)=>(
          <div key={t} onClick={()=>setSortTab(t)} style={{flex:1,padding:"7px 0",textAlign:"center",cursor:"pointer",background:sortTab===t?"linear-gradient(180deg,#f5f3ee,#e8e5df)":"transparent",borderRight:i<2?"1px solid #c8c7cc":"none",borderBottom:sortTab===t?"2px solid #FF4500":"none"}}>
            <span style={{fontSize:12,fontWeight:700,color:sortTab===t?RD:"#555"}}>{t==="hot"?"🔥 Hot":t==="new"?"✨ New":"📈 Top"}</span>
          </div>
        ))}
      </div>
    );

    if(tab==="home") return (
      <div style={{flex:1,display:"flex",flexDirection:"column",background:"#efede8",overflow:"hidden",fontFamily:"Helvetica,'Helvetica Neue',Arial,sans-serif"}}>
        <SubPills subs={allSubs}/>
        <SortTabs/>
        <div style={{flex:1,overflowY:"auto",minHeight:0,WebkitOverflowScrolling:"touch",background:"#efede8"}}>
          <div style={{marginTop:10,background:"#fff",borderTop:"1px solid #c8c7cc",borderBottom:"1px solid #c8c7cc"}}>
            {allFiltered.map(p=><PostCard key={p.id} p={p}/>)}
          </div>
          <div style={{height:14}}/>
        </div>
        <TabBar/>
      </div>
    );

    if(tab==="subs") return (
      <div style={{flex:1,display:"flex",flexDirection:"column",background:"#efede8",overflow:"hidden",fontFamily:"Helvetica,'Helvetica Neue',Arial,sans-serif"}}>
        <div style={{padding:"10px 14px 6px",color:"#6d6d72",fontSize:12,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5}}>My Subreddits</div>
        <div style={{flex:1,overflowY:"auto",minHeight:0,background:"#efede8"}}>
          <div style={{background:"#fff",borderTop:"1px solid #c8c7cc",borderBottom:"1px solid #c8c7cc"}}>
            {subs.map((s,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderBottom:i<subs.length-1?"1px solid #e5e5e5":"none",cursor:"pointer"}}>
                <div style={{width:36,height:36,borderRadius:8,background:s.color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}>
                  <span style={{color:"#fff",fontWeight:900,fontSize:11}}>r/</span>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#000"}}>{s.s}</div>
                  <div style={{fontSize:11,color:"#8e8e93",marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.members} members · {s.desc}</div>
                </div>
                <svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M1 1l6 6-6 6" stroke="#c7c7cc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            ))}
          </div>
        </div>
        <TabBar/>
      </div>
    );

    if(tab==="search") return (
      <div style={{flex:1,display:"flex",flexDirection:"column",background:"#efede8",overflow:"hidden",fontFamily:"Helvetica,'Helvetica Neue',Arial,sans-serif"}}>
        <div style={{background:"linear-gradient(180deg,#e8e6e0,#d8d6d0)",borderBottom:"1px solid #c8c7cc",padding:"8px 10px",flexShrink:0}}>
          <div style={{background:"#fff",border:"1px solid #c8c7cc",borderRadius:10,padding:"7px 12px",display:"flex",alignItems:"center",gap:8,boxShadow:"inset 0 1px 3px rgba(0,0,0,0.08)"}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#8e8e93" strokeWidth="2"/><path d="M20 20l-3.5-3.5" stroke="#8e8e93" strokeWidth="2" strokeLinecap="round"/></svg>
            <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search Reddit" style={{flex:1,border:"none",outline:"none",fontSize:13,background:"transparent",color:"#000"}}/>
            {searchQ&&<span onClick={()=>setSearchQ("")} style={{color:"#8e8e93",fontSize:16,cursor:"pointer",lineHeight:1}}>×</span>}
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",minHeight:0,background:"#efede8"}}>
          {searchQ.length<2 ? (
            <div>
              <div style={{padding:"10px 14px 6px",color:"#6d6d72",fontSize:12,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5}}>Recent Searches</div>
              <div style={{background:"#fff",borderTop:"1px solid #c8c7cc",borderBottom:"1px solid #c8c7cc"}}>
                {["derry maine disappearances","anna green missing","symbols sewer augusta","clown sightings 2012"].map((q,i,a)=>(
                  <div key={i} onClick={()=>setSearchQ(q)} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",borderBottom:i<a.length-1?"1px solid #e5e5e5":"none",cursor:"pointer"}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#8e8e93" strokeWidth="2"/><path d="M12 7v5l3 3" stroke="#8e8e93" strokeWidth="2" strokeLinecap="round"/></svg>
                    <span style={{fontSize:13,color:"#000"}}>{q}</span>
                    <svg width="8" height="14" viewBox="0 0 8 14" fill="none" style={{marginLeft:"auto"}}><path d="M1 1l6 6-6 6" stroke="#c7c7cc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                ))}
              </div>
            </div>
          ) : searchResults.length===0 ? (
            <div style={{padding:30,textAlign:"center",color:"#8e8e93",fontSize:13}}>No results for "{searchQ}"</div>
          ) : (
            <div style={{marginTop:10,background:"#fff",borderTop:"1px solid #c8c7cc",borderBottom:"1px solid #c8c7cc"}}>
              {searchResults.map(p=><PostCard key={p.id} p={p}/>)}
            </div>
          )}
        </div>
        <TabBar/>
      </div>
    );

    if(tab==="inbox") return (
      <div style={{flex:1,display:"flex",flexDirection:"column",background:"#efede8",overflow:"hidden",fontFamily:"Helvetica,'Helvetica Neue',Arial,sans-serif"}}>
        <div style={{padding:"10px 14px 6px",color:"#6d6d72",fontSize:12,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5}}>Messages</div>
        <div style={{flex:1,overflowY:"auto",minHeight:0}}>
          <div style={{background:"#fff",borderTop:"1px solid #c8c7cc",borderBottom:"1px solid #c8c7cc"}}>
            {inbox.map((m,i)=>(
              <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"11px 14px",borderBottom:i<inbox.length-1?"1px solid #e5e5e5":"none",background:m.unread?"#fffdf8":"#fff",cursor:"pointer"}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:m.unread?RD:"#c7c7cc",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                  <span style={{color:"#fff",fontWeight:700,fontSize:11}}>u/</span>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:12,fontWeight:m.unread?700:400,color:m.unread?RD:"#555"}}>{m.user}</span>
                    <span style={{fontSize:10,color:"#8e8e93",marginLeft:"auto"}}>{m.age}</span>
                  </div>
                  <div style={{fontSize:12,color:"#555",marginTop:2,lineHeight:1.35,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{m.preview}</div>
                </div>
                {m.unread&&<div style={{width:8,height:8,borderRadius:"50%",background:RD,flexShrink:0,marginTop:5}}/>}
              </div>
            ))}
          </div>
          <div style={{padding:"10px 14px 6px",color:"#6d6d72",fontSize:12,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5}}>My Posts</div>
          <div style={{background:"#fff",borderTop:"1px solid #c8c7cc",borderBottom:"1px solid #c8c7cc"}}>
            {myPosts.map((p,i)=>(
              <div key={i} style={{padding:"10px 14px",borderBottom:i<myPosts.length-1?"1px solid #e5e5e5":"none",cursor:"pointer"}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                  <div style={{width:10,height:10,borderRadius:2,background:subColor(p.sub),flexShrink:0}}/>
                  <span style={{fontSize:10,fontWeight:700,color:subColor(p.sub)}}>{p.sub}</span>
                  <span style={{fontSize:10,color:"#8e8e93"}}>· {p.age}</span>
                  <span style={{fontSize:10,color:RD,marginLeft:"auto",fontWeight:700}}>▲ {p.pts}</span>
                </div>
                <div style={{fontSize:12,fontWeight:500,color:"#000",lineHeight:1.3}}>{p.title}</div>
              </div>
            ))}
          </div>
        </div>
        <TabBar/>
      </div>
    );
  }

  /* ── Android render ── */
  const androidPosts = sorted(subFilter ? ALL_POSTS.filter(p=>p.sub===subFilter) : ALL_POSTS);
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",background:"#1a1a1b",overflow:"hidden",fontFamily:"'Roboto','Droid Sans',Arial,sans-serif"}}>
      <div style={{background:"#1a1a1b",borderBottom:"1px solid #343536",padding:"8px 10px",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
        <div style={{flex:1,background:"#272729",border:"1px solid #343536",borderRadius:20,padding:"6px 12px",display:"flex",alignItems:"center",gap:6}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#818384" strokeWidth="2"/><path d="M20 20l-3.5-3.5" stroke="#818384" strokeWidth="2" strokeLinecap="round"/></svg>
          <span style={{fontSize:12,color:"#818384"}}>Search Reddit</span>
        </div>
        <div style={{width:32,height:32,borderRadius:"50%",background:RD,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <span style={{color:"#fff",fontWeight:900,fontSize:13}}>r/</span>
        </div>
      </div>
      <div style={{display:"flex",background:"#1a1a1b",borderBottom:"1px solid #343536",flexShrink:0}}>
        {["hot","new","top"].map((t,i)=>(
          <div key={t} onClick={()=>setSortTab(t)} style={{flex:1,padding:"9px 0",textAlign:"center",fontSize:12,fontWeight:700,cursor:"pointer",color:sortTab===t?RD:"#818384",borderBottom:sortTab===t?`2px solid ${RD}`:"2px solid transparent"}}>
            {t==="hot"?"🔥":t==="new"?"✨":"📈"} {t.charAt(0).toUpperCase()+t.slice(1)}
          </div>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",minHeight:0,WebkitOverflowScrolling:"touch",padding:"8px 8px 4px"}}>
        {androidPosts.map(p=><PostCard key={p.id} p={p}/>)}
        <div style={{height:8}}/>
      </div>
      <div style={{background:"#1a1a1b",borderTop:"1px solid #343536",display:"flex",flexShrink:0,height:52}}>
        {[["Home",<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 11L12 3l9 8M5 9.5V20a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1V9.5" stroke={RD} strokeWidth="2" strokeLinecap="round"/></svg>],["Popular",<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z" stroke="#818384" strokeWidth="2"/></svg>],["Create",<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill={RD}/><path d="M12 8v8M8 12h8" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>],["Chat",<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="#818384" strokeWidth="2"/></svg>],["Inbox",<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="#818384" strokeWidth="2"/></svg>]].map(([label,icon],i)=>(
          <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,cursor:"pointer",paddingBottom:2}}>
            {icon}
            <span style={{fontSize:9,color:i===0?RD:"#818384"}}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
export { RedditScreen, REDDIT_ALL_POSTS };
