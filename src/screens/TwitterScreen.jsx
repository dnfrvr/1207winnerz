import React, { useState, useRef, useContext } from "react";
import { FF_IOS } from "../shared/constants.js";
import { APP_META } from "../shared/app-meta.js";
import { LoreDateCtx, loreRelativeLabel, loreSortKey } from "../shared/lore-date.js";
import { getCharKey, getSharedAvatars, makeSharedFollows } from "../shared/social-feed.js";
import { TWITTER_HOME_BASE } from "../data/seeds.js";

const TwitterScreen = ({data, isIos, accent, onBack=null, sharedTweets=[], twitterUsers={}, homeBaseTweets=[], onUpdateShared=()=>{}}) => {
  const [tab, setTab] = useState("home");
  const [viewProfile, setViewProfile] = useState(null);
  const scrollRef = useRef(null);
  const loreDateStr = useContext(LoreDateCtx);
  const charKey = getCharKey(data);

  // Auto-sync the 4 chars' twitter display info from their profile data
  const CHAR_TWITTER_KEYS = {
    glinda: {key:"glindarvf", h:"@glindarvf", name:"Glinda R."},
    eoghan: {key:"eoghanm",   h:"@eoghan_m",  name:"Eoghan M."},
    drew:   {key:"drewworms", h:"@dreww_orms", name:"Drew B."},
    elias:  {key:"noteliasgreen", h:"@noteliasgreen", name:"Elias G."},
  };
  const sharedAvatarsTw = getSharedAvatars(data);
  const effectiveTwUsers = {...twitterUsers};
  // Each char: use data.avatar (current char) or sharedAvatars (others), then twitterUsers override
  Object.entries(CHAR_TWITTER_KEYS).forEach(([char, info]) => {
    const charAv = char === charKey ? (data.avatar || sharedAvatarsTw[char]) : sharedAvatarsTw[char];
    effectiveTwUsers[info.key] = {
      h: (twitterUsers[info.key]?.h) || info.h,
      name: (twitterUsers[info.key]?.name) || info.name,
      av: twitterUsers[info.key]?.av || charAv || null,
    };
  });

  const handles = {glinda:"@glindarvf",eoghan:"@eoghan_m",drew:"@dreww_orms",elias:"@noteliasgreen"};
  const names   = {glinda:"Glinda R.",eoghan:"Eoghan M.",drew:"Drew B.",elias:"Elias G."};
  const myHandle = handles[charKey];
  const handleToCharKey = Object.fromEntries(Object.entries(handles).map(([k,h])=>[h,k]));

  // Relations "follow" réelles entre les 4 persos (qui suit qui), partagées comme le reste.
  const {follows: twitterFollows, iFollow, followsMe, toggleFollow} = makeSharedFollows(data, onUpdateShared, "_twitterFollows");

  // ── Shared tweets injected into feeds ──
  // Tri du plus récent au plus ancien, basé sur la vraie date/heure du tweet (lore) plutôt que sur
  // l'ordre d'insertion ou un timestamp JS qui n'est jamais posé par les tweets créés en admin —
  // c'est ce qui faisait qu'un nouveau tweet pouvait se retrouver invisible en bas de liste.
  const othersShared = sharedTweets.filter(t=>t.author!==charKey).map(t=>({
    h:handles[t.author]||"@?", name:names[t.author]||"?",
    text:t.text, time:t.time||"maintenant",
    av: effectiveTwUsers[CHAR_TWITTER_KEYS[t.author]?.key]?.av || (names[t.author]||"?")[0],
    _shared:true, _sort:loreSortKey(t.time),
  })).sort((a,b)=>b._sort-a._sort);

  const myShared = sharedTweets.filter(t=>t.author===charKey).map(t=>({
    h:myHandle, name:names[charKey], text:t.text, time:t.time||"maintenant",
    av: effectiveTwUsers[CHAR_TWITTER_KEYS[charKey]?.key]?.av || names[charKey][0],
    _sort:loreSortKey(t.time),
  })).sort((a,b)=>b._sort-a._sort);

  // ── Home feed base ──
  const HOME_BASE = TWITTER_HOME_BASE;

  // Override tweet display info from editable twitterUsers map
  const resolveTweet = (t) => {
    const key = Object.keys(effectiveTwUsers).find(k => effectiveTwUsers[k].h === t.h);
    if (!key) return t;
    const u = effectiveTwUsers[key];
    return {...t, name: u.name||t.name, h: u.h||t.h, av: u.av||t.av};
  };
  const baseList = homeBaseTweets.length ? homeBaseTweets : (HOME_BASE[charKey]||[]);
  const sharedList = [...myShared, ...othersShared];
  const homeFeed = [
    ...sharedList,
    ...baseList.filter(t=>!sharedList.some(s=>s.text===t.text&&s.h===t.h)),
  ].map(t=>({...resolveTweet(t), _sort:t._sort ?? loreSortKey(t.time)}))
   .sort((a,b)=>b._sort-a._sort);

  // ── Connect ──
  const CONNECT = {
    glinda:[
      {h:"@boq_uma",name:"Boq 🌹",text:"@glindarvf bonne chance aujourd'hui 🌹 vous allez déchirer",time:"1:00am",av:"B",type:"mention",rp:4,rt:11,fav:38},
      {h:"@boq_uma",name:"Boq 🌹",text:"@glindarvf ton analyse en cours d'éco était vraiment pertinente.",time:"2:00am",av:"B",type:"mention",rp:23,rt:34,fav:76},
      {h:"@cynthia_k",name:"Cynthia K.",text:"@glindarvf alors ce tournoi d'échecs demain, on parie que Drew gagne ? 👀",time:"3:00am",av:"C",type:"mention",rp:0,rt:19,fav:76},
      {h:"@dreww_orms",name:"Drew B.",text:"@glindarvf t'es abonnée au club échecs ? tu devrais 👀",time:"5:00am",av:"D",type:"mention",rp:21,rt:14,fav:36},
      {h:"@eoghan_m",name:"Eoghan M.",text:"@glindarvf @dreww_orms rendez-vous à la bibli demain ?",time:"6:00am",av:"E",type:"mention",rp:10,rt:3,fav:49},
    ],
    eoghan:[
      {h:"@ilya_beats",name:"Ilya 🔥",text:"@eoghan_m la soirée d'hier était 🔥🔥🔥 on refait ça quand ?",time:"1:00am",av:"I",type:"mention",rp:4,rt:14,fav:86},
      {h:"@glindarvf",name:"Glinda R.",text:"@eoghan_m ton dernier son est vraiment bien !",time:"5:00am",av:"G",type:"mention",rp:1,rt:18,fav:62},
      {h:"@vicky_d",name:"Vicky",text:"@eoghan_m t'es avec qui ce weekend, asra ou ilya ? on suit plus là",time:"6:00am",av:"V",type:"mention",rp:12,rt:27,fav:13},
    ],
    drew:[
      {h:"@cynthia_k",name:"Cynthia K.",text:"@dreww_orms 1812 elo ??! on a besoin de toi au club ♟️",time:"2:00am",av:"C",type:"mention",rp:19,rt:14,fav:57},
      {h:"@abby_uma",name:"Abby",text:"@dreww_orms t'as les notes du TP ver de terre stp",time:"4:00am",av:"A",type:"mention",rp:3,rt:35,fav:9},
      {h:"@glindarvf",name:"Glinda R.",text:"@dreww_orms je comprends rien aux échecs explique moi",time:"5:00am",av:"G",type:"mention",rp:10,rt:8,fav:32},
    ],
    elias:[
      {h:"@glindarvf",name:"Glinda R.",text:"@noteliasgreen on arrive. tous les quatre. 🤍",time:"15m",av:"G",type:"mention",rp:12,rt:29,fav:88},
      {h:"@eoghan_m",name:"Eoghan M.",text:"@noteliasgreen t'as vraiment posté ça ? 💀",time:"30m",av:"E",type:"mention",rp:25,rt:5,fav:55},
      {h:"@dreww_orms",name:"Drew B.",text:"@noteliasgreen le chapitre 4 de five nights était 🔥",time:"2:00am",av:"D",type:"mention",rp:1,rt:22,fav:32},
      {h:"@creepypasta",name:"CreepyPasta",text:"@noteliasgreen dm us your Derry research 👀",time:"4:00am",av:"👻",type:"mention",rp:7,rt:24,fav:103},
    ],
  };

  const DISCOVER = [
    {tag:"#Election2012",tweets:"2.4M tweets"},{tag:"#Sandy",tweets:"1.8M tweets"},
    {tag:"#GangnamStyle",tweets:"1.2M tweets"},{tag:"#Olympics2012",tweets:"980K tweets"},
    {tag:"#Adele",tweets:"847K tweets"},{tag:"#KONY2012",tweets:"712K tweets"},
    {tag:"#Avengers",tweets:"634K tweets"},{tag:"#OneDirection",tweets:"598K tweets"},
    {tag:"#iPhone5",tweets:"521K tweets"},{tag:"#Skyfall",tweets:"487K tweets"},
    {tag:"#SNSD",tweets:"445K tweets"},{tag:"#Derry",tweets:"2.3K tweets"},
  ];

  const TW_BLUE = "#1DA1F2";
  const rowBg   = isIos ? "linear-gradient(180deg,#fff,#f9f9f9)" : "#1e1e1e";
  const rowBorder = isIos ? "1px solid #e1e8ed" : "1px solid #2a2a2a";
  const textCol = isIos ? "#0f1419" : "#fff";
  const subCol  = "#657786";

  const Avatar = ({av, onClick}) => {
    const isImg = typeof av==="string" && (av.startsWith("data:")||av.startsWith("http")||av.startsWith("/"));
    return (
      <div onClick={onClick} style={{width:36,height:36,borderRadius:6,background:TW_BLUE,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:13,overflow:"hidden",cursor:onClick?"pointer":"default"}}>
        {isImg ? <img src={av} style={{width:"100%",height:"100%",objectFit:"cover"}}/> : (typeof av==="string"?av[0]:"?")}
      </div>
    );
  };

  const Tweet = ({t}) => {
    const otherKey = handleToCharKey[t.h];
    const clickable = otherKey && otherKey!==charKey;
    const goToProfile = clickable ? ()=>{ setViewProfile(otherKey); setTimeout(()=>scrollRef.current?.scrollTo({top:0,behavior:"instant"}),0); } : undefined;
    return (
    <div style={{background:rowBg,padding:"10px 12px",borderBottom:rowBorder,display:"flex",gap:9}}>
      <Avatar av={t.av||"?"} onClick={goToProfile}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"baseline",gap:5,flexWrap:"wrap"}}>
          <span onClick={goToProfile} style={{color:textCol,fontSize:12,fontWeight:700,cursor:clickable?"pointer":"default"}}>{t.name}</span>
          <span onClick={goToProfile} style={{color:subCol,fontSize:11,cursor:clickable?"pointer":"default"}}>{t.h}</span>
          <span style={{color:subCol,fontSize:11,marginLeft:"auto"}}>· {loreRelativeLabel(t.time,loreDateStr)}</span>
        </div>
        <div style={{color:textCol,fontSize:12,lineHeight:1.45,marginTop:2}}>{t.text}</div>
        {t.photo&&<img src={t.photo} style={{width:"100%",borderRadius:6,marginTop:6,display:"block",maxHeight:180,objectFit:"cover",border:`1px solid ${rowBorder.replace("1px solid ","")}`}}/>}
        <div style={{display:"flex",gap:16,marginTop:6,alignItems:"center"}}>
          
          <div style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}>
            <svg width="16" height="15" viewBox="0 0 20 19" fill="none">
              <path d="M2 8C2 4.69 4.69 2 8 2h4C15.31 2 18 4.69 18 8s-2.69 6-6 6h-2.5L5 17v-3H4C2.9 14 2 13.1 2 12V8z" stroke={subCol} strokeWidth="1.6" fill="none" strokeLinejoin="round"/>
            </svg>
            <span style={{fontSize:11,color:subCol}}>{t.rp!=null?t.rp:""}</span>
          </div>
          
          <div style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}>
            <svg width="18" height="16" viewBox="0 0 22 20" fill="none">
              <path d="M4 4h10a2 2 0 012 2v6" stroke={subCol} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20 8l-4 4-4-4" stroke={subCol} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M18 16H8a2 2 0 01-2-2v-6" stroke={subCol} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12l4-4 4 4" stroke={subCol} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{fontSize:11,color:subCol}}>{t.rt!=null?t.rt:""}</span>
          </div>
          
          <div style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}>
            <svg width="15" height="14" viewBox="0 0 20 19" fill="none">
              <path d="M10 17S2 12 2 6.5A4.5 4.5 0 0110 3.3 4.5 4.5 0 0118 6.5C18 12 10 17 10 17z" stroke={subCol} strokeWidth="1.6" fill="none"/>
            </svg>
            <span style={{fontSize:11,color:subCol}}>{t.fav!=null?t.fav:""}</span>
          </div>
        </div>
      </div>
    </div>
    );
  };

  const tabs = [
    {id:"home",label:"Home",icon:(a)=><svg width="18" height="17" viewBox="0 0 22 21" fill="none"><path d="M2 10L11 2l9 8M4 8.5V19a1 1 0 001 1h5v-5h4v5h5a1 1 0 001-1V8.5" stroke={a?"#1da1f2":"#8899a6"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>},
    {id:"connect",label:"Connect",icon:(a)=><svg width="18" height="17" viewBox="0 0 22 21" fill="none"><circle cx="11" cy="8" r="4" stroke={a?"#1da1f2":"#8899a6"} strokeWidth="1.8"/><path d="M4 20c0-3.87 3.13-7 7-7s7 3.13 7 7" stroke={a?"#1da1f2":"#8899a6"} strokeWidth="1.8" strokeLinecap="round"/></svg>},
    {id:"discover",label:"Discover",icon:(a)=><svg width="18" height="17" viewBox="0 0 22 21" fill="none"><circle cx="11" cy="10" r="8" stroke={a?"#1da1f2":"#8899a6"} strokeWidth="1.8"/><path d="M21 20l-3.5-3.5" stroke={a?"#1da1f2":"#8899a6"} strokeWidth="1.8" strokeLinecap="round"/></svg>},
    {id:"me",label:"Me",icon:(a)=><svg width="18" height="17" viewBox="0 0 22 21" fill="none"><circle cx="11" cy="7" r="4" stroke={a?"#1da1f2":"#8899a6"} strokeWidth="1.8"/><path d="M3 20c0-4.42 3.58-8 8-8s8 3.58 8 8" stroke={a?"#1da1f2":"#8899a6"} strokeWidth="1.8" strokeLinecap="round"/></svg>},
  ];

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",background:isIos?"#c0cfd8":"#131619",overflow:"hidden",position:"relative"}}>
      <div style={{background:TW_BLUE,padding:"8px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        {isIos?<button onClick={viewProfile ? ()=>setViewProfile(null) : onBack} style={{background:"linear-gradient(180deg,#1690d8,#1070b0)",border:"1px solid rgba(0,0,0,0.4)",borderRadius:6,color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",padding:"3px 8px",display:"flex",alignItems:"center",gap:2,textShadow:"0 -1px 0 rgba(0,0,0,0.4)",boxShadow:"inset 0 1px 0 rgba(255,255,255,0.2)",flexShrink:0}}>
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M7 1L1 7l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>:<span style={{width:28}}>{viewProfile&&<button onClick={()=>setViewProfile(null)} style={{background:"none",border:"none",color:"#fff",cursor:"pointer",padding:0,display:"flex",alignItems:"center"}}><svg width="10" height="16" viewBox="0 0 8 14" fill="none"><path d="M7 1L1 7l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>}</span>}
        <svg width="22" height="18" viewBox="0 0 24 20" fill="#fff"><path d="M24 2.4c-.9.4-1.8.7-2.8.8 1-.6 1.8-1.6 2.2-2.8-.9.6-2 1-3.1 1.2C19.4.6 18.1 0 16.7 0c-2.7 0-4.9 2.3-4.9 5.1 0 .4 0 .8.1 1.1C8 6 4.4 4 1.9.9c-.4.8-.6 1.6-.6 2.6 0 1.7.9 3.3 2.2 4.2-.8 0-1.6-.2-2.3-.6 0 2.4 1.6 4.4 3.8 4.9-.4.1-.8.2-1.3.2-.3 0-.6 0-.9-.1.6 2 2.3 3.4 4.4 3.4-1.6 1.3-3.6 2.1-5.8 2.1-.4 0-.7 0-1.1-.1C2.3 18.6 4.9 19.4 7.6 19.4c9 0 13.9-7.7 13.9-14.4v-.7c1-.7 1.8-1.6 2.5-2.6"/></svg>
        <span style={{width:28}}/>
      </div>
      {!isIos&&<div style={{background:"#1a1a1a",borderBottom:"1px solid #2a2a2a",display:"flex",flexShrink:0}}>
        {tabs.map(t=><button key={t.id} onClick={()=>{setViewProfile(null);setTab(t.id);}} style={{flex:1,padding:"10px 0 8px",border:"none",background:"transparent",color:tab===t.id&&!viewProfile?"#fff":subCol,cursor:"pointer",fontSize:11,fontWeight:tab===t.id&&!viewProfile?"700":"400",borderBottom:`3px solid ${tab===t.id&&!viewProfile?TW_BLUE:"transparent"}`,display:"flex",flexDirection:"column",alignItems:"center",gap:2,transition:"border-color 0.15s",fontFamily:FF_IOS}}>{typeof t.icon==="function" ? t.icon(tab===t.id&&!viewProfile) : <span style={{fontSize:16}}>{t.icon}</span>}</button>)}
      </div>}
      <div ref={scrollRef} style={{flex:1,overflowY:"auto",background:isIos?"#e8ecef":"#131619"}}>
        {viewProfile ? (()=>{
          const pKey = viewProfile;
          const pInfo = CHAR_TWITTER_KEYS[pKey];
          const pUser = effectiveTwUsers[pInfo.key] || {};
          // Tweets du profil = uniquement les tweets partagés (pas de tweets statiques)
          const pTweets = sharedTweets.filter(t=>t.author===pKey).map(t=>({
            h:handles[pKey], name:pUser.name||names[pKey], text:t.text, time:t.time||"maintenant", av:pUser.av||names[pKey][0],
            _sort:loreSortKey(t.time),
          })).sort((a,b)=>b._sort-a._sort);
          const following = iFollow(pKey);
          const followingCount = {glinda:"312",eoghan:"891",drew:"156",elias:"89"}[pKey]||"—";
          const followersCount = {glinda:"847",eoghan:"2.1K",drew:"234",elias:"445"}[pKey]||"—";
          return (
            <>
              <div style={{
                background:pUser.bannerImg ? `url(${pUser.bannerImg}) center/cover` : (pUser.bannerColor||TW_BLUE),
                padding:"14px 12px 10px",display:"flex",gap:10,alignItems:"flex-end"}}>
                <div style={{width:52,height:52,borderRadius:8,background:"rgba(255,255,255,0.3)",border:"3px solid #fff",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:22,overflow:"hidden",flexShrink:0}}>
                  {pUser.av ? <img src={pUser.av} style={{width:"100%",height:"100%",objectFit:"cover"}}/> : pKey[0].toUpperCase()}
                </div>
                <div style={{flex:1}}>
                  <div style={{color:"#fff",fontWeight:700,fontSize:14}}>{pUser.name||names[pKey]}</div>
                  <div style={{color:"rgba(255,255,255,0.8)",fontSize:12}}>{pUser.h||handles[pKey]}</div>
                </div>
                <button onClick={()=>toggleFollow(pKey)} style={{
                  background:following?"transparent":"#fff", color:following?"#fff":TW_BLUE,
                  border:`1.5px solid #fff`, borderRadius:16, padding:"5px 14px", fontSize:11, fontWeight:700, cursor:"pointer",flexShrink:0}}>
                  {following?"Following":"Follow"}
                </button>
              </div>
              {/* Tous les 4 persos se suivent mutuellement */}
              <div style={{padding:"4px 12px",background:rowBg,borderBottom:rowBorder}}><span style={{fontSize:10,color:subCol,fontWeight:600,background:isIos?"#e1e8ed":"#22303c",borderRadius:3,padding:"2px 6px"}}>Follows you</span></div>
              <div style={{background:rowBg,padding:"8px 12px",borderBottom:rowBorder,display:"flex",gap:20}}>
                {[["Tweets",pTweets.length],["Following",followingCount],["Followers",followersCount]].map(([l,v])=>(
                  <div key={l} style={{textAlign:"center"}}><div style={{color:textCol,fontWeight:700,fontSize:13}}>{v}</div><div style={{color:subCol,fontSize:10}}>{l}</div></div>
                ))}
              </div>
              {pTweets.length===0
                ? <div style={{padding:24,textAlign:"center",color:subCol,fontSize:12}}>No tweets yet.</div>
                : pTweets.map((t,i)=><Tweet key={i} t={t}/>)}
            </>
          );
        })() : <>
        {tab==="home"&&<>
          {homeFeed.map((t,i)=><Tweet key={i} t={t}/>)}
        </>}
        {tab==="connect"&&<>
          <div style={{background:TW_BLUE,padding:"6px 12px"}}><span style={{color:"#fff",fontSize:11,fontWeight:600}}>INTERACTIONS</span></div>
          {(CONNECT[charKey]||[]).map(resolveTweet).map((t,i)=><Tweet key={i} t={t}/>)}
        </>}
        {tab==="discover"&&<>
          <div style={{background:TW_BLUE,padding:"6px 12px"}}><span style={{color:"#fff",fontSize:11,fontWeight:600}}>TRENDING</span></div>
          {DISCOVER.map((d,i)=><div key={i} style={{background:rowBg,padding:"10px 14px",borderBottom:rowBorder,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{color:TW_BLUE,fontSize:13,fontWeight:700}}>{d.tag}</div><div style={{color:subCol,fontSize:11}}>{d.tweets}</div></div><span style={{color:subCol,lineHeight:1}}><svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span></div>)}
        </>}
        {tab==="me"&&<>
          <div style={{
            background:effectiveTwUsers[CHAR_TWITTER_KEYS[charKey].key]?.bannerImg
              ? `url(${effectiveTwUsers[CHAR_TWITTER_KEYS[charKey].key].bannerImg}) center/cover`
              : (effectiveTwUsers[CHAR_TWITTER_KEYS[charKey].key]?.bannerColor||TW_BLUE),
            padding:"14px 12px 10px",display:"flex",gap:10,alignItems:"flex-end"}}>
            <div style={{width:52,height:52,borderRadius:8,background:"rgba(255,255,255,0.3)",border:"3px solid #fff",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:22,overflow:"hidden",flexShrink:0}}>
              {effectiveTwUsers[CHAR_TWITTER_KEYS[charKey].key]?.av
                ? <img src={effectiveTwUsers[CHAR_TWITTER_KEYS[charKey].key].av} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                : charKey[0].toUpperCase()}
            </div>
            <div><div style={{color:"#fff",fontWeight:700,fontSize:14}}>{data.name?.split(" ")[0]}</div><div style={{color:"rgba(255,255,255,0.8)",fontSize:12}}>{myHandle}</div></div>
          </div>
          <div style={{background:rowBg,padding:"8px 12px",borderBottom:rowBorder,display:"flex",gap:20}}>
            {[["Tweets",myShared.length],["Following",charKey==="glinda"?"312":charKey==="eoghan"?"891":charKey==="drew"?"156":"89"],["Followers",charKey==="glinda"?"847":charKey==="eoghan"?"2.1K":charKey==="drew"?"234":"445"]].map(([l,v])=>(
              <div key={l} style={{textAlign:"center"}}><div style={{color:textCol,fontWeight:700,fontSize:13}}>{v}</div><div style={{color:subCol,fontSize:10}}>{l}</div></div>
            ))}
          </div>
          {myShared.length===0
            ? <div style={{padding:24,textAlign:"center",color:subCol,fontSize:12}}>Aucun tweet partagé pour l'instant.</div>
            : myShared.map(resolveTweet).map((t,i)=><Tweet key={i} t={{...t,av:effectiveTwUsers[CHAR_TWITTER_KEYS[charKey].key]?.av||charKey[0].toUpperCase()}}/>)}
        </>}
        </>}
      </div>
      {isIos&&<div style={{background:"linear-gradient(180deg,#e8ecef,#d5dde3)",borderTop:"1px solid #b0bec5",display:"flex",flexShrink:0}}>
        {tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"7px 0",border:"none",background:"transparent",color:tab===t.id?TW_BLUE:subCol,cursor:"pointer",fontSize:10,fontWeight:tab===t.id?700:400,borderTop:`2px solid ${tab===t.id?TW_BLUE:"transparent"}`,display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>{typeof t.icon==="function"?t.icon(tab===t.id):<span style={{fontSize:15}}>{t.icon}</span>}<span>{t.label}</span></button>)}
      </div>}
    </div>
  );
};

export { TwitterScreen };
