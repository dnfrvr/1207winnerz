import React from "react";
import { AppSkeleton } from "../shared/ui-kit.jsx";

const ShazamScreen = ({isIos, accent}) => (
  <AppSkeleton icon="🎵" name="Shazam" color="#0088FF" isIos={isIos}>
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16,padding:"12px 0"}}>
      <div style={{width:100,height:100,borderRadius:"50%",background:"radial-gradient(circle,#0088FF,#0044AA)",border:"3px solid rgba(0,136,255,0.4)",boxShadow:"0 0 30px rgba(0,136,255,0.5)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
        <span style={{color:"#fff",fontSize:36,fontWeight:700}}>S</span>
      </div>
      <div style={{color:isIos?"#000":"#fff",fontSize:13,opacity:0.7}}>Touche pour identifier</div>
    </div>
    <div style={{background:isIos?"linear-gradient(180deg,#ffffff,#f5f4ef)":"#1e1e1e",padding:"10px 12px",borderBottom:isIos?"1px solid #b2b2a8":"1px solid #2a2a2a"}}>
      <div style={{color:"#888",fontSize:10,marginBottom:6}}>Recents</div>
      {[{t:"We Are Young",a:"fun."},{t:"Somebody That I Used To Know",a:"Gotye"},{t:"Call Me Maybe",a:"Carly Rae Jepsen"}].map((s,i)=>(
        <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderTop:i>0?`1px solid ${isIos?"#eee":"#222"}`:"none"}}>
          <div style={{color:isIos?"#000":"#fff",fontSize:11}}>{s.t}</div>
          <div style={{color:"#888",fontSize:10}}>{s.a}</div>
        </div>
      ))}
    </div>
  </AppSkeleton>
);

export { ShazamScreen };
