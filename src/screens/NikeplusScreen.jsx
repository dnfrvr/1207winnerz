import React from "react";
import { FF_IOS } from "../shared/constants.js";

const NikeplusScreen = ({data,accent}) => {
  const np = data.nikeplus || {};
  const runs = np.runs||[];
  const total = np.totalKm||0;
  const goal = np.goalKm||0;
  const pct = goal ? Math.min(100, Math.round(total/goal*100)) : 0;
  const weekly = np.weekly||[];
  const maxW = Math.max(1, ...weekly.map(w=>w.km));
  // ring geometry
  const R=34, C=2*Math.PI*R, off=C*(1-pct/100);
  const VOLT = "#d8ff00";
  return (
    <div style={{flex:1,background:"#0a0a0a",overflowY:"auto",minHeight:0,fontFamily:FF_IOS}}>
      
      <div style={{background:"linear-gradient(180deg,#1a1a1a,#0a0a0a)",padding:"16px 14px 18px",display:"flex",alignItems:"center",gap:16,borderBottom:"1px solid #1a1a1a"}}>
        <div style={{position:"relative",width:84,height:84,flexShrink:0}}>
          <svg width="84" height="84" style={{transform:"rotate(-90deg)"}}>
            <circle cx="42" cy="42" r={R} stroke="#222" strokeWidth="7" fill="none"/>
            <circle cx="42" cy="42" r={R} stroke={VOLT} strokeWidth="7" fill="none" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={off}/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
            <div style={{color:"#fff",fontSize:22,fontWeight:800,letterSpacing:-1,lineHeight:1}}>{total}</div>
            <div style={{color:"#888",fontSize:8,letterSpacing:1}}>KM</div>
          </div>
        </div>
        <div style={{flex:1}}>
          <div style={{color:VOLT,fontSize:10,letterSpacing:2,textTransform:"uppercase",fontWeight:700}}>Niveau {np.level||"—"}</div>
          <div style={{color:"#fff",fontSize:15,fontWeight:700,marginTop:2}}>Objectif {goal} km</div>
          <div style={{color:"#888",fontSize:11,marginTop:2}}>{pct}% · plus que {Math.max(0,goal-total)} km</div>
          <div style={{display:"flex",gap:14,marginTop:8}}>
            <div><div style={{color:"#fff",fontSize:16,fontWeight:800}}>{np.streak||0}</div><div style={{color:"#666",fontSize:8,letterSpacing:1}}>JOURS</div></div>
            <div><div style={{color:"#fff",fontSize:16,fontWeight:800}}>{runs.length}</div><div style={{color:"#666",fontSize:8,letterSpacing:1}}>SORTIES</div></div>
          </div>
        </div>
      </div>

      
      <div style={{padding:"12px 14px 6px"}}>
        <div style={{color:"#666",fontSize:9,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>Cette semaine</div>
        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:6,height:70}}>
          {weekly.map((w,i)=>(
            <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,height:"100%",justifyContent:"flex-end"}}>
              <div style={{color:w.km?"#bbb":"#444",fontSize:8}}>{w.km?w.km:"–"}</div>
              <div style={{width:"100%",height:`${(w.km/maxW)*100}%`,minHeight:w.km?3:0,background:w.km?`linear-gradient(180deg,${VOLT},#9bcc00)`:"transparent",borderRadius:2}}/>
              <div style={{color:"#666",fontSize:8}}>{w.d}</div>
            </div>
          ))}
        </div>
      </div>

      
      <div style={{padding:"8px 0"}}>
        <div style={{padding:"6px 14px 8px",color:"#666",fontSize:9,letterSpacing:1.5,textTransform:"uppercase"}}>Dernières sorties</div>
        {runs.map(run=>(
          <div key={run.id} style={{padding:"11px 14px",borderBottom:"1px solid #161616",display:"flex",alignItems:"flex-start",gap:12}}>
            <div style={{width:38,height:38,borderRadius:"50%",background:run.glitch?"#1a1a1a":"#161616",border:`2px solid ${run.glitch?"#444":VOLT}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>🏃</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                <div style={{color:"#fff",fontSize:15,fontWeight:700}}>{run.distance}</div>
                <div style={{color:VOLT,fontSize:11,fontWeight:600}}>{run.pace}</div>
              </div>
              <div style={{color:"#777",fontSize:10,marginTop:2}}>{run.date} · {run.time} · {run.cal} kcal</div>
              {run.route&&<div style={{color:run.glitch?"#a05a5a":"#5a8a5a",fontSize:10,marginTop:3}}>📍 {run.route}</div>}
              {run.note&&<div style={{color:run.glitch?"#9a7a7a":"#888",fontSize:10.5,marginTop:4,lineHeight:1.45,fontStyle:run.glitch?"italic":"normal"}}>{run.note}</div>}
            </div>
          </div>
        ))}
      </div>
      <div style={{padding:"10px 14px 18px",color:"#444",fontSize:9,textAlign:"center",letterSpacing:0.5}}>Nike+ Running · synchronisé via nikeplus.com</div>
    </div>
  );
};

export { NikeplusScreen };
