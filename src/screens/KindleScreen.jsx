import React, { useState } from "react";

const KINDLE_DEFAULT_BOOKS=[
  {t:"Twilight",a:"Stephenie Meyer",p:78,hue:250,genre:"Romance"},
  {t:"New Moon",a:"Stephenie Meyer",p:12,hue:220,genre:"Romance"},
  {t:"The Origin of Species",a:"Charles Darwin",p:45,hue:140,genre:"Science"},
  {t:"Worms: Ecology & Bio.",a:"Edwards & Bohlen",p:31,hue:80,genre:"Science"},
];


const KindleScreen = ({isIos, data}) => {
  const [tab, setTab] = useState("library");
  const AMZ="#FF9900",bg=isIos?"#f5f4ef":"#111",card=isIos?"#fff":"#1a1a1a",sep=isIos?"#ddd":"#252525",txt=isIos?"#1a1a1a":"#e8e8e8";
  const books = (data?.kindle||[]).length > 0
    ? data.kindle
    : KINDLE_DEFAULT_BOOKS.map((b,i)=>({id:i,title:b.t,author:b.a,pct:b.p,cover:null}));
  const TABS=[
    {id:"library",label:"Bibliothèque",icon:(a)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="18" rx="1" stroke={a?AMZ:"#777"} strokeWidth="1.8"/><rect x="13" y="3" width="7" height="18" rx="1" stroke={a?AMZ:"#777"} strokeWidth="1.8"/></svg>},
    {id:"store",label:"Boutique",icon:(a)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="21" r="1" fill={a?AMZ:"#777"}/><circle cx="20" cy="21" r="1" fill={a?AMZ:"#777"}/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 001.98-1.67L23 6H6" stroke={a?AMZ:"#777"} strokeWidth="1.8" strokeLinecap="round"/></svg>},
    {id:"settings",label:"Réglages",icon:(a)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke={a?AMZ:"#777"} strokeWidth="1.8"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke={a?AMZ:"#777"} strokeWidth="1.8" strokeLinecap="round"/></svg>},
  ];
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",background:bg,minHeight:0}}>
      {isIos && <div style={{background:"#232f3e",padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <span style={{color:AMZ,fontWeight:700,fontSize:18,letterSpacing:-0.5}}>kindle</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="#fff" strokeWidth="1.8"/><path d="M21 21l-3-3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>
      </div>}
      <div style={{flex:1,overflowY:"auto",minHeight:0}}>
        {tab==="library"&&books.map((b,i)=>{
          const hue = (b.hue!==undefined) ? b.hue : (i*60)%360;
          return (
          <div key={b.id??i} style={{background:card,padding:"10px 14px",display:"flex",gap:12,alignItems:"center",borderBottom:`1px solid ${sep}`}}>
            <div style={{width:42,height:58,background:b.cover?"transparent":`hsl(${hue},45%,${isIos?72:38}%)`,borderRadius:3,flexShrink:0,display:"flex",alignItems:"flex-end",justifyContent:"center",paddingBottom:4,overflow:"hidden"}}>
              {b.cover
                ?<img src={b.cover} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                :<div style={{width:32,height:2,background:"rgba(0,0,0,0.15)",borderRadius:1}}/>}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{color:txt,fontSize:12,fontWeight:600,lineHeight:1.3}}>{b.title}</div>
              <div style={{color:"#888",fontSize:10,marginTop:2}}>{b.author}</div>
              <div style={{height:3,background:isIos?"#eee":"#2a2a2a",borderRadius:2,marginTop:7,overflow:"hidden"}}><div style={{height:"100%",width:`${b.pct||0}%`,background:AMZ,borderRadius:2}}/></div>
              <div style={{color:"#888",fontSize:9,marginTop:2}}>{b.pct||0}% lu</div>
            </div>
          </div>
        );})}
        {tab==="store"&&<div style={{padding:24,textAlign:"center",color:"#888",fontSize:12}}><div style={{color:AMZ,fontWeight:700,fontSize:16,marginBottom:8}}>Kindle Store</div><div>Plus d'1 million de titres</div></div>}
        {tab==="settings"&&[{label:"Taille du texte",val:"Moyenne"},{label:"Police",val:"Bookerly"},{label:"Luminosité",val:"Auto"},{label:"Mode nuit",val:isIos?"Off":"On"}].map((s,i)=>(
          <div key={i} style={{background:card,padding:"12px 16px",display:"flex",justifyContent:"space-between",borderBottom:`1px solid ${sep}`}}><span style={{color:txt,fontSize:13}}>{s.label}</span><span style={{color:"#888",fontSize:13}}>{s.val}</span></div>
        ))}
      </div>
      <div style={{background:isIos?"#f7f7f7":"#111",borderTop:`1px solid ${sep}`,display:"flex",flexShrink:0}}>
        {TABS.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,border:"none",background:"transparent",display:"flex",flexDirection:"column",alignItems:"center",padding:"7px 0",gap:2,cursor:"pointer"}}>{t.icon(tab===t.id)}<span style={{fontSize:9,color:tab===t.id?AMZ:"#777",fontWeight:tab===t.id?600:400}}>{t.label}</span></button>))}
      </div>
    </div>
  );
};

export { KindleScreen, KINDLE_DEFAULT_BOOKS };
