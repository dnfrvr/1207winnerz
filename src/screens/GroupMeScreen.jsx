import React, { useState } from "react";

const GROUPME_DEFAULTS = [
  {id:1,name:"UMA Éco 2012 🎓",last:"Prof: exam repoussé à jeudi",time:"2:32pm",n:3,members:24},
  {id:2,name:"Projet macro-éco",last:"Glinda: j'envoie les notes ce soir",time:"11:00am",n:0,members:5},
  {id:3,name:"Résidence Maple 🍁",last:"Quelqu'un a vu les clés du hall ?",time:"30 sep",n:7,members:18},
  {id:4,name:"Projet stats — groupe 3",last:"Richard: j'ai fini la régression, je vous envoie",time:"4:50pm",n:1,members:4},
  {id:5,name:"UMA Chess Club ♟️",last:"Drew: tournoi vendredi 15h, confirmez",time:"Sep 30",n:0,members:14},
  {id:6,name:"Expo finale éco du dév",last:"Cynthia: on se voit demain pour les slides ?",time:"9:14am",n:2,members:5},
];

const GroupMeScreen = ({data, isIos}) => {
  const [tab, setTab] = useState("groups");
  const GM="#00AFF0", bg=isIos?"#f5f5f5":"#0e0e0e", card=isIos?"#fff":"#1a1a1a", sep=isIos?"#e5e5e5":"#252525", txt=isIos?"#000":"#fff";
  const groups = data.groupmeGroups || GROUPME_DEFAULTS;
  const TABS=[
    {id:"groups",label:"Groupes",icon:(a)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3" stroke={a?GM:"#777"} strokeWidth="1.8"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={a?GM:"#777"} strokeWidth="1.8" strokeLinecap="round"/><circle cx="17" cy="8" r="2.5" stroke={a?GM:"#777"} strokeWidth="1.6"/><path d="M20 20c0-2.8-1.8-5-4-5.5" stroke={a?GM:"#777"} strokeWidth="1.6" strokeLinecap="round"/></svg>},
    {id:"me",label:"Profil",icon:(a)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke={a?GM:"#777"} strokeWidth="1.8"/><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke={a?GM:"#777"} strokeWidth="1.8" strokeLinecap="round"/></svg>},
  ];
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",background:bg,minHeight:0}}>
      <div style={{flex:1,overflowY:"auto",minHeight:0}}>
        {tab==="groups"&&groups.map(g=>(
          <div key={g.id} style={{background:card,padding:"11px 14px",display:"flex",gap:11,alignItems:"center",borderBottom:`1px solid ${sep}`}}>
            <div style={{width:44,height:44,borderRadius:isIos?0:8,background:GM,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:17,flexShrink:0}}>{g.name[0]}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:txt,fontSize:13,fontWeight:600}}>{g.name}</span><span style={{color:"#888",fontSize:10}}>{g.time}</span></div>
              <div style={{color:"#888",fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:2}}>{g.last}</div>
              <div style={{color:"#888",fontSize:9,marginTop:2}}>{g.members} membres</div>
            </div>
            {g.n>0&&<div style={{width:20,height:20,borderRadius:"50%",background:GM,color:"#fff",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontWeight:700}}>{g.n}</div>}
          </div>
        ))}
        {tab==="me"&&<div style={{padding:"20px 16px",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
          <div style={{width:72,height:72,borderRadius:"50%",background:GM,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:28,fontWeight:700,marginBottom:8}}>{data.name?.[0]||"?"}</div>
          <div style={{color:txt,fontWeight:700,fontSize:16}}>{data.name||"—"}</div>
          <div style={{color:"#888",fontSize:12,marginBottom:12}}>@{data.username||"—"}</div>

          <div style={{width:"100%",background:card,borderRadius:10,border:`1px solid ${sep}`,padding:"4px 0"}}>
            {[
              {label:"University", value:"University of Maine at Augusta"},
              {label:"Major", value:"Economics, Class of 2014"},
              {label:"Student ID", value:"#UMA-22817403"},
              {label:"Residence", value:"Maple Hall, Room 214"},
              {label:"Member since", value:"Aug 2012"},
            ].map((row,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"9px 14px",borderBottom:i<4?`1px solid ${sep}`:"none"}}>
                <span style={{color:"#888",fontSize:11}}>{row.label}</span>
                <span style={{color:txt,fontSize:11,fontWeight:600,textAlign:"right"}}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>}
      </div>
      <div style={{background:isIos?"#f7f7f7":"#111",borderTop:`1px solid ${sep}`,display:"flex",flexShrink:0}}>
        {TABS.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,border:"none",background:"transparent",display:"flex",flexDirection:"column",alignItems:"center",padding:"7px 0",gap:2,cursor:"pointer"}}>{t.icon(tab===t.id)}<span style={{fontSize:9,color:tab===t.id?GM:"#777",fontWeight:tab===t.id?600:400}}>{t.label}</span></button>))}
      </div>
    </div>
  );
};

export { GroupMeScreen };
