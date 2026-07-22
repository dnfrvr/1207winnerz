import React from "react";
import { AppSkeleton } from "../shared/ui-kit.jsx";

const MapsScreen = ({isIos, accent}) => (
  <AppSkeleton icon="🗺️" name="Maps" color="#4CAF50" isIos={isIos}>
    <div style={{background:isIos?"#fff":"#1e1e1e",borderRadius:0,padding:"8px 12px",border:`1px solid ${isIos?"#ddd":"#333"}`,color:"#888",fontSize:12}}>📍 University of Maine at Augusta</div>
    <div style={{height:140,background:"linear-gradient(135deg,#c8e6c9,#a5d6a7,#81c784)",borderRadius:0,position:"relative",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{position:"absolute",inset:0,backgroundImage:"repeating-linear-gradient(0deg,rgba(255,255,255,0.15) 0px,rgba(255,255,255,0.15) 1px,transparent 1px,transparent 24px),repeating-linear-gradient(90deg,rgba(255,255,255,0.15) 0px,rgba(255,255,255,0.15) 1px,transparent 1px,transparent 24px)"}}/>
      <div style={{fontSize:24,textShadow:"0 2px 4px rgba(0,0,0,0.3)"}}>📍</div>
    </div>
    <div style={{display:"flex",gap:8}}>
      {["Directions","Search","Satellite"].map((l,i)=>(
        <div key={i} style={{flex:1,background:isIos?"#fff":"#1e1e1e",borderRadius:0,padding:"8px 0",textAlign:"center",fontSize:10,color:isIos?"#007aff":accent,border:`1px solid ${isIos?"#ddd":"#333"}`}}>{l}</div>
      ))}
    </div>
  </AppSkeleton>
);

// Calendar / Agenda

export { MapsScreen };
