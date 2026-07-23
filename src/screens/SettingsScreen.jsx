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
      <div style={rowStyle(false)}><span style={{fontSize:16}}>📶</span><span style={{flex:1,color:txt,fontSize:13}}>Wi-Fi</span><IOS6Toggle value={true} onChange={()=>{}} accent={ACC} isIos={isIos}/></div>
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
      <div style={rowStyle(false)}><span style={{fontSize:16}}>🔵</span><span style={{flex:1,color:txt,fontSize:13}}>Bluetooth</span><IOS6Toggle value={true} onChange={()=>{}} accent={ACC} isIos={isIos}/></div>
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
      {ic:"✈️", l:"Mode Avion", toggle:false},
      {ic:"📶", l:"Wi-Fi", v:currentWifi, onClick:()=>setSub("wifi")},
      {ic:"🔵", l:"Bluetooth", v:"Activé", onClick:()=>setSub("bluetooth")},
      {ic:"🔔", l:"Sons", toggle:true},
      {ic:"🔆", l:"Luminosité", v:"—"},
      {ic:"🖼️", l:"Fond d'écran", v:"—"},
      {ic:"🔒", l:"Confidentialité", v:"—"},
      {ic:"📱", l:"Général", v:"—"},
    ].map((r,i)=>(
      <div key={i} onClick={r.onClick} style={rowStyle(!!r.onClick)}>
        <span style={{fontSize:16}}>{r.ic}</span>
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

export { SettingsScreen };
