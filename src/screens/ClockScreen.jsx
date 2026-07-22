import React from "react";
import { useClock } from "../shared/phone-chrome.jsx";
import { FF_IOS } from "../shared/constants.js";
import { AppSkeleton, IOS6Toggle } from "../shared/ui-kit.jsx";

const ClockScreen = ({isIos, accent}) => {
  const clock = useClock();
  return (
    <AppSkeleton icon="⏰" name="Clock" color={isIos?"#1C1C1E":"#111"} isIos={isIos}>
      <div style={{background:isIos?"#1C1C1E":"#0a0a0a",borderRadius:0,padding:"20px 0",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
        <div style={{color:"#fff",fontSize:48,fontWeight:"200",letterSpacing:-2,fontFamily:FF_IOS}}>{clock.full24}</div>
        <div style={{color:"#888",fontSize:12}}>{clock.day}, {clock.month} {clock.dateOrd}</div>
      </div>
      {[{time:"07:30",label:"Class",on:true},{time:"09:00",label:"Biblio",on:false},{time:"23:00",label:"Rappel",on:true}].map((a,i)=>(
        <div key={i} style={{background:isIos?"#fff":"#1e1e1e",borderRadius:0,padding:"10px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",border:`1px solid ${isIos?"#eee":"#2a2a2a"}`}}>
          <div>
            <div style={{color:isIos?"#000":"#fff",fontSize:22,fontWeight:"200"}}>{a.time}</div>
            <div style={{color:"#888",fontSize:11}}>{a.label}</div>
          </div>
          <IOS6Toggle value={a.on} onChange={()=>{}} accent={accent} isIos={isIos}/>
        </div>
      ))}
    </AppSkeleton>
  );
};


export { ClockScreen };
