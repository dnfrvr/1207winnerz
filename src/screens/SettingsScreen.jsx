import React, { useState } from "react";
import { IOS6Toggle } from "../shared/ui-kit.jsx";

// Réseaux Wi-Fi / appareils Bluetooth par défaut (si le perso n'a rien de custom).
// Les noms sont un vecteur de lore : le MJ ajoute en admin des réseaux/appareils qui trahissent
// des lieux fréquentés ou des personnes (ex. "Derry Home Hospital", "iPod d'Anna").
const WIFI_DEFAULT = [
  {name:"UMA_Student", secured:true, current:true},
  {name:"UMA_Guest", secured:false},
  {name:"eduroam", secured:true},
];

const LockIcon = () => (
  <svg width="10" height="13" viewBox="0 0 10 13" fill="none"><rect x="1" y="5.5" width="8" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.2"/><path d="M2.6 5.5V4a2.4 2.4 0 014.8 0v1.5" stroke="currentColor" strokeWidth="1.2"/></svg>
);
const WifiBars = () => (
  <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
    <path d="M8 10.2a1 1 0 100 .01" fill="currentColor"/>
    <path d="M4.8 7.4a4.4 4.4 0 016.4 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M2.6 5a7.6 7.6 0 0110.8 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);
const Chevron = () => (
  <span style={{color:"#c8c7cc",lineHeight:1,flexShrink:0}}><svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
);

// Badges d'icônes façon iOS 6 (carré arrondi + dégradé + glyphe blanc) — plus réaliste que des emojis.
const Badge = ({from, to, children}) => (
  <span style={{width:29,height:29,borderRadius:6.5,flexShrink:0,display:"inline-flex",alignItems:"center",justifyContent:"center",
    background:`linear-gradient(180deg,${from},${to})`,boxShadow:"inset 0 1px 0 rgba(255,255,255,0.4), 0 1px 1px rgba(0,0,0,0.18)",border:"1px solid rgba(0,0,0,0.14)"}}>
    {children}
  </span>
);
const GLYPH = {
  airplane: <svg width="17" height="17" viewBox="0 0 24 24" fill="#fff"><path d="M21 15.5V14l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v1.5l8-2.5V18l-2 1.4V21l3.5-1 3.5 1v-1.6L13 18v-4.5l8 2z"/></svg>,
  wifi: <svg width="18" height="14" viewBox="0 0 20 15" fill="none"><circle cx="10" cy="12" r="1.5" fill="#fff"/><path d="M6 8.6a5.6 5.6 0 018 0M3.2 5.6a9.6 9.6 0 0113.6 0" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  bluetooth: <svg width="12" height="17" viewBox="0 0 12 18" fill="none"><path d="M3 5l6 8-3 2.5V2.5l3 2.5-6 8" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  bell: <svg width="16" height="17" viewBox="0 0 20 20" fill="#fff"><path d="M10 2a1 1 0 011 1v.7a5 5 0 013.9 4.8v3l1.4 2.3v1H3.7v-1L5.1 14.5v-3A5 5 0 019 3.7V3a1 1 0 011-1zM8 16.5a2 2 0 004 0H8z"/></svg>,
  sun: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3.6" fill="#fff" stroke="none"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6"/></svg>,
  image: <svg width="18" height="16" viewBox="0 0 22 18" fill="none"><rect x="1.5" y="2" width="19" height="14" rx="2" fill="#fff"/><circle cx="7" cy="7" r="1.8" fill="#59b7f0"/><path d="M3 14.5l5-4.5 3.5 2.5 4-4 4.5 4.5v1.5H3z" fill="#3f8fd0"/></svg>,
  hand: <svg width="15" height="17" viewBox="0 0 18 20" fill="#fff"><path d="M4 9.5V4.4a1.3 1.3 0 012.6 0V8h.5V3a1.3 1.3 0 012.6 0v5h.5V4.2a1.3 1.3 0 012.6 0v6.6c0 3.5-2 6.2-5.2 6.2-1.8 0-3.3-1.5-4.6-3.8L3 10.6a1.2 1.2 0 011.9-1.4z"/></svg>,
  gear: <svg width="17" height="17" viewBox="0 0 24 24" fill="#fff"><path d="M12 8.4a3.6 3.6 0 100 7.2 3.6 3.6 0 000-7.2zm0 2a1.6 1.6 0 110 3.2 1.6 1.6 0 010-3.2z"/><path d="M13 2h-2l-.4 2.3-1.5.6L7 3.7 5.3 5.4l1.2 1.6-.6 1.5L3.6 9v2l2.3.4.6 1.5-1.2 1.6L7 16.3l1.6-1.2 1.5.6L10.6 18h2l.4-2.3 1.5-.6 1.6 1.2 1.7-1.7-1.2-1.6.6-1.5L20 11.6v-2l-2.3-.4-.6-1.5 1.2-1.6L16.6 4.4l-1.6 1.2-1.5-.6z" opacity=".9"/></svg>,
};
const ROW_ICON = {
  airplane:{g:"airplane",from:"#ffb24d",to:"#ff8a1a"},
  wifi:{g:"wifi",from:"#5aa4ef",to:"#2f77cf"},
  bluetooth:{g:"bluetooth",from:"#5aa4ef",to:"#2f77cf"},
  sounds:{g:"bell",from:"#ff7a6b",to:"#f5432f"},
  brightness:{g:"sun",from:"#5aa4ef",to:"#2f77cf"},
  wallpaper:{g:"image",from:"#54c6c0",to:"#2f9e98"},
  privacy:{g:"hand",from:"#9b86e0",to:"#6f57c2"},
  general:{g:"gear",from:"#a6a6ae",to:"#7b7b85"},
};
const RowBadge = ({k}) => { const c=ROW_ICON[k]; return c ? <Badge from={c.from} to={c.to}>{GLYPH[c.g]}</Badge> : null; };

const SettingsScreen = ({data, isIos, accent, onBack}) => {
  const [sub, setSub] = useState(null); // null | "wifi" | "bluetooth"
  const wifi = (data.wifiNetworks && data.wifiNetworks.length) ? data.wifiNetworks : WIFI_DEFAULT;
  const bt   = data.btDevices || [];
  const currentWifi = (wifi.find(w=>w.current) || wifi[0] || {}).name || "Non connecté";
  const ACC   = accent || "#275ba8";
  const rowBg = isIos ? "linear-gradient(180deg,#ffffff,#f5f4ef)" : "#1e1e1e";
  const sep   = isIos ? "#b2b2a8" : "#222";
  const txt   = isIos ? "#000" : "#fff";
  const sub2  = isIos ? "#8e8e93" : "#888";
  const pageBg = isIos ? "#c8ccd0" : "#111";

  const title = sub==="wifi" ? "Wi-Fi" : sub==="bluetooth" ? "Bluetooth" : "Réglages";
  const backLabel = sub ? "Réglages" : "";
  const goBack = sub ? () => setSub(null) : (onBack || (()=>{}));

  const rowStyle = (clickable) => ({background:rowBg,padding:"11px 12px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${sep}`,cursor:clickable?"pointer":"default"});
  const groupLabel = (t) => <div style={{padding:"16px 12px 5px",color:sub2,fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:0.3}}>{t}</div>;

  // ── Header contextuel (un seul, remplace le NavBar du shell) ──
  const header = isIos ? (
    <div style={{background:"linear-gradient(180deg,#b6bac1,#878d97)",height:44,flexShrink:0,display:"flex",alignItems:"center",padding:"0 8px",borderBottom:"1px solid #5d626c",boxShadow:"0 1px 3px rgba(0,0,0,0.3)",position:"relative"}}>
      <button onClick={goBack} style={{background:"linear-gradient(180deg,#878d97,#5d626c)",border:"1px solid rgba(0,0,0,0.45)",borderRadius:6,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",padding:"4px 10px 4px 7px",display:"flex",alignItems:"center",gap:3,textShadow:"0 -1px 0 rgba(0,0,0,0.5)",boxShadow:"inset 0 1px 0 rgba(255,255,255,0.2)",zIndex:1,flexShrink:0}}>
        <svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M7 1L1 7l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        {backLabel && <span>{backLabel}</span>}
      </button>
      <span style={{position:"absolute",left:0,right:0,textAlign:"center",color:"#fff",fontWeight:700,fontSize:17,textShadow:"0 1px 2px rgba(0,0,0,0.5)",letterSpacing:-0.3,pointerEvents:"none"}}>{title}</span>
    </div>
  ) : (
    <div style={{background:"#1f1f1f",height:48,flexShrink:0,display:"flex",alignItems:"center",gap:10,padding:"0 12px",borderBottom:`2px solid ${ACC}`,boxShadow:"0 2px 4px rgba(0,0,0,0.4)"}}>
      <button onClick={goBack} style={{background:"none",border:"none",color:"#fff",cursor:"pointer",fontSize:20,padding:0,display:"flex",alignItems:"center"}}>
        <svg width="12" height="18" viewBox="0 0 8 14" fill="none"><path d="M7 1L1 7l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      <span style={{color:"#fff",fontSize:16,fontWeight:500}}>{title}</span>
    </div>
  );

  let content;
  if(sub==="wifi") {
    content = (<>
      <div style={rowStyle(false)}><RowBadge k="wifi"/><span style={{flex:1,color:txt,fontSize:13}}>Wi-Fi</span><IOS6Toggle value={true} onChange={()=>{}} accent={ACC} isIos={isIos}/></div>
      {groupLabel("Choisir un réseau…")}
      {wifi.map((w,i)=>(
        <div key={i} style={rowStyle(true)}>
          <span style={{color:ACC,fontSize:14,width:14,flexShrink:0}}>{w.current?"✓":""}</span>
          <span style={{flex:1,color:txt,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{w.name}</span>
          <span style={{color:sub2,display:"flex",alignItems:"center",gap:8,flexShrink:0}}>{w.secured!==false && <LockIcon/>}<WifiBars/></span>
          <Chevron/>
        </div>
      ))}
      <div style={{padding:"12px",color:sub2,fontSize:11,lineHeight:1.5}}>Les réseaux connus se reconnectent automatiquement.</div>
    </>);
  } else if(sub==="bluetooth") {
    content = (<>
      <div style={rowStyle(false)}><RowBadge k="bluetooth"/><span style={{flex:1,color:txt,fontSize:13}}>Bluetooth</span><IOS6Toggle value={true} onChange={()=>{}} accent={ACC} isIos={isIos}/></div>
      {groupLabel("Appareils")}
      {bt.length===0
        ? <div style={{padding:"18px 12px",color:sub2,fontSize:12,textAlign:"center"}}>Aucun appareil appairé.</div>
        : bt.map((dev,i)=>(
          <div key={i} style={rowStyle(true)}>
            <span style={{flex:1,color:txt,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{dev.name}</span>
            <span style={{color:dev.connected?ACC:sub2,fontSize:12,flexShrink:0}}>{dev.connected?"Connecté":"Non connecté"}</span>
            <Chevron/>
          </div>
        ))
      }
    </>);
  } else {
    content = [
      {k:"airplane", l:"Mode Avion", toggle:false},
      {k:"wifi", l:"Wi-Fi", v:currentWifi, onClick:()=>setSub("wifi")},
      {k:"bluetooth", l:"Bluetooth", v:"Activé", onClick:()=>setSub("bluetooth")},
      {k:"sounds", l:"Sons", toggle:true},
      {k:"brightness", l:"Luminosité", v:"—"},
      {k:"wallpaper", l:"Fond d'écran", v:"—"},
      {k:"privacy", l:"Confidentialité", v:"—"},
      {k:"general", l:"Général", v:"—"},
    ].map((r,i)=>(
      <div key={i} onClick={r.onClick} style={rowStyle(!!r.onClick)}>
        <RowBadge k={r.k}/>
        <span style={{flex:1,color:txt,fontSize:13}}>{r.l}</span>
        {typeof r.toggle==="boolean"
          ? <IOS6Toggle value={r.toggle} onChange={()=>{}} accent={ACC} isIos={isIos}/>
          : <><span style={{color:sub2,fontSize:12,maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.v}</span><Chevron/></>
        }
      </div>
    ));
  }

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0,background:pageBg}}>
      {header}
      <div style={{flex:1,overflowY:"auto",minHeight:0,WebkitOverflowScrolling:"touch"}}>{content}</div>
    </div>
  );
};

export { SettingsScreen, WIFI_DEFAULT };
