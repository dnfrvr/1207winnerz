import React from "react";
import { AppSkeleton, IOS6Toggle } from "../shared/ui-kit.jsx";

const SettingsScreen = ({data, isIos, accent}) => (
  <AppSkeleton icon="⚙️" name="Settings" color={isIos?"#8E8E93":"#555"} isIos={isIos}>
    {[
      ["✈️","Airplane Mode","toggle:false"],["📶","Wi-Fi","UMA_Student"],["🔵","Bluetooth","toggle:false"],
      ["🔔","Sounds","toggle:true"],["🔆","Brightness","—"],["🖼️","Wallpaper","—"],
      ["🔒","Privacy","—"],["📱","General","—"],
    ].map(([ic,l,v],i)=>(
      <div key={i} style={{background:isIos?"linear-gradient(180deg,#ffffff,#f5f4ef)":"#1e1e1e",padding:"10px 12px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${isIos?"#b2b2a8":"#222"}`}}>
        <span style={{fontSize:16}}>{ic}</span>
        <span style={{flex:1,color:isIos?"#000":"#fff",fontSize:13}}>{l}</span>
        { v.startsWith?.("toggle:")
          ? <IOS6Toggle value={v==="toggle:true"} onChange={()=>{}} accent={accent||"#275ba8"} isIos={isIos}/>
          : <><span style={{color:"#888",fontSize:12}}>{v}</span><span style={{color:"#c8c7cc",lineHeight:1}}><svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span></>
        }
      </div>
    ))}
  </AppSkeleton>
);

export { SettingsScreen };
