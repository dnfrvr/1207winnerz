import React from "react";

// Squelette générique d'écran d'app (fond + contenu scrollable) + toggles iOS/Android.
const AppSkeleton = ({icon, name, color="#333", accent="#555", isIos=true, lines=[], children}) => (
  <div style={{flex:1,background:isIos?"#fff":"#111",display:"flex",flexDirection:"column",overflowY:"auto",minHeight:0,WebkitOverflowScrolling:"touch"}}>

    <div style={{width:"100%",display:"flex",flexDirection:"column"}}>
      {children || lines.map((l,i)=>(
        <div key={i} style={{background:isIos?"#e5e5ea":"#222",borderRadius:0,height:l,opacity:0.6}}/>
      ))}
    </div>
  </div>
);

const IOSToggle = ({value, onChange, accent="#275ba8"}) => (
  <div onClick={onChange} style={{width:51,height:31,borderRadius:16,cursor:"pointer",position:"relative",flexShrink:0,
    background:value?`linear-gradient(180deg,${accent},${accent}dd)`:"linear-gradient(180deg,#e0e0e0,#c8c8c8)",
    boxShadow:value?`0 1px 3px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.3)`:"0 1px 3px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.6)",
    border:value?`1px solid ${accent}cc`:"1px solid #aaa",
    transition:"background 0.2s,border 0.2s",
  }}>
    {/* Track gloss */}
    <div style={{position:"absolute",top:0,left:0,right:0,height:"50%",borderRadius:"16px 16px 0 0",background:"rgba(255,255,255,0.15)",pointerEvents:"none"}}/>
    {/* Thumb */}
    <div style={{
      position:"absolute",top:2,left:value?22:2,width:25,height:25,borderRadius:14,
      background:"linear-gradient(180deg,#fdfdfd,#e8e8e8)",
      boxShadow:"0 2px 5px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.9)",
      border:"1px solid rgba(0,0,0,0.15)",
      transition:"left 0.2s",
    }}/>
  </div>
);

// Android JellyBean toggle — flat, rectangulaire, labels ON/OFF

const AndroidToggle = ({value, onChange, accent="#33b5e5"}) => (
  <div onClick={onChange} style={{width:52,height:24,cursor:"pointer",position:"relative",flexShrink:0,display:"flex",alignItems:"center"}}>
    {/* Track */}
    <div style={{position:"absolute",left:0,right:0,height:14,borderRadius:7,
      background:value?accent:"#555",
      boxShadow:"inset 0 1px 2px rgba(0,0,0,0.5)",
      transition:"background 0.15s",
    }}/>
    {/* Thumb */}
    <div style={{
      position:"absolute",top:0,left:value?28:0,width:24,height:24,borderRadius:12,
      background:value?accent:"#aaa",
      boxShadow:"0 2px 4px rgba(0,0,0,0.5),0 1px 1px rgba(0,0,0,0.3)",
      border:`1px solid ${value?accent+"aa":"#888"}`,
      transition:"left 0.15s,background 0.15s",
      display:"flex",alignItems:"center",justifyContent:"center",
    }}>
      <div style={{width:8,height:8,borderRadius:4,background:"rgba(255,255,255,0.4)"}}/>
    </div>
  </div>
);

// Alias pour compatibilité avec le code existant

const IOS6Toggle = ({value, onChange, accent="#275ba8", isIos=true}) =>
  isIos
    ? <IOSToggle value={value} onChange={onChange} accent={accent}/>
    : <AndroidToggle value={value} onChange={onChange} accent={accent}/>;

export { AppSkeleton, IOSToggle, AndroidToggle, IOS6Toggle };
