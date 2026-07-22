import React from "react";

const PIN_DEFAULTS = [
  {id:1,img:null,emoji:"🪡",repins:10366,board:"Craft Ideas",  pinner:"Michelle Jaspers...",desc:"Newest DIY & I'm OBSESSED",tall:true},
  {id:2,img:null,emoji:"🚗",repins:4872, board:"Skull artwork",pinner:"Muhammed boss",      desc:"",tall:false},
  {id:3,img:null,emoji:"💅",repins:2341, board:"Nail inspo",   pinner:"Caroline M.",        desc:"French tips ✨",tall:false},
  {id:4,img:null,emoji:"🏠",repins:8820, board:"Home decor",   pinner:"Anna T.",            desc:"Perfect living room aesthetic",tall:true},
  {id:5,img:null,emoji:"👗",repins:3120, board:"OOTD",         pinner:"Style_glam",         desc:"Fall look 🍂",tall:false},
  {id:6,img:null,emoji:"🍰",repins:6500, board:"Recipes",      pinner:"BakingLover",        desc:"Raspberry layer cake 😍",tall:false},
];

const PinterestScreen = ({isIos, data}) => {
  const pins = data?.pinterest || PIN_DEFAULTS;

  const BG   = isIos ? "#f0f0f0" : "#1a1a1a";
  const CARD = isIos ? "#fff"    : "#2a2a2a";
  const TXT  = isIos ? "#222"    : "#eee";
  const SUB  = isIos ? "#888"    : "#999";
  const RED  = "#E60023";

  const left  = pins.filter((_,i)=>i%2===0);
  const right = pins.filter((_,i)=>i%2===1);

  const PinCard = ({p}) => (
    <div style={{background:CARD,borderRadius:isIos?6:2,overflow:"hidden",marginBottom:6,
      boxShadow:isIos?"0 1px 3px rgba(0,0,0,0.12)":"none",position:"relative"}}>
      {p.img
        ? <img src={p.img} style={{width:"100%",display:"block",objectFit:"cover"}}/>
        : <div style={{height:p.tall?140:100,background:isIos?"#e8e8e8":"#333",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,position:"relative",overflow:"hidden"}}>
            {p.emoji}
          </div>
      }
      <div style={{padding:"5px 7px 7px"}}>
        {p.desc&&<div style={{fontSize:10,color:TXT,marginBottom:3,lineHeight:1.3}}>{p.desc}</div>}
        <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:2}}>
          <span style={{color:SUB,lineHeight:1}}><svg width="16" height="14" viewBox="0 0 16 14" fill="none"><path d="M3.5 2.5L6 0v1.5h6A1.5 1.5 0 0113.5 3v4M12.5 11.5L10 14v-1.5H4A1.5 1.5 0 012.5 11V7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
          <span style={{color:SUB,fontSize:9}}>{Number(p.repins).toLocaleString()}</span>
        </div>
        <div style={{display:"flex",gap:4,marginBottom:4}}>
          <span style={{color:SUB,fontSize:9}}>Repin</span>
          <span style={{color:SUB,fontSize:9}}>·</span>
          <span style={{color:SUB,fontSize:9}}>Like</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <div style={{width:18,height:18,borderRadius:"50%",background:"#ccc",flexShrink:0,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:9}}>👤</div>
          <div>
            <div style={{color:TXT,fontSize:9,fontWeight:600,lineHeight:1.2}}>{p.pinner}</div>
            <div style={{color:SUB,fontSize:8}}>{p.board}</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",background:BG,minHeight:0,position:"relative"}}>
      
      <div style={{background:isIos?"#fff":"#111",borderBottom:`1px solid ${isIos?"#ddd":"#333"}`,
        padding:"8px 12px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,position:"relative"}}>
        <div style={{fontFamily:"Georgia,serif",fontSize:24,color:RED,fontStyle:"italic",letterSpacing:-0.5}}>Pinterest</div>
      </div>

      
      <div style={{flex:1,overflowY:"auto",minHeight:0,WebkitOverflowScrolling:"touch",padding:6}}>
        <div style={{display:"flex",gap:6,alignItems:"flex-start"}}>
          <div style={{flex:1}}>{left.map(p=><PinCard key={p.id} p={p}/>)}</div>
          <div style={{flex:1}}>{right.map(p=><PinCard key={p.id} p={p}/>)}</div>
        </div>
      </div>

      
      <div style={{background:isIos?"#fff":"#111",borderTop:`1px solid ${isIos?"#ddd":"#333"}`,display:"flex",flexShrink:0}}>
        {[
          {id:0,label:"Accueil",  icon:(a)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 11L12 3l9 8M5 9.5V20a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1V9.5" stroke={a?RED:SUB} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>},
          {id:1,label:"Explorer", icon:(a)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke={a?RED:SUB} strokeWidth="1.7"/><path d="M21 21l-3-3" stroke={a?RED:SUB} strokeWidth="1.7" strokeLinecap="round"/></svg>},
          {id:2,label:"Caméra",         icon:(a)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke={a?RED:SUB} strokeWidth="1.7"/><circle cx="12" cy="12" r="3.5" stroke={a?RED:SUB} strokeWidth="1.7"/><path d="M6.5 5V3M17.5 5V3" stroke={a?RED:SUB} strokeWidth="1.7" strokeLinecap="round"/></svg>},
          {id:3,label:"Notifications",         icon:(a)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" stroke={a?RED:SUB} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>},
          {id:4,label:"Profil",   icon:(a)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke={a?RED:SUB} strokeWidth="1.7"/><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke={a?RED:SUB} strokeWidth="1.7" strokeLinecap="round"/></svg>},
        ].map((t,i)=>(
          <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",padding:"7px 0",gap:2}}>
            {t.icon(i===0)}
            {t.label&&<div style={{fontSize:8,color:i===0?RED:SUB,fontWeight:i===0?600:400}}>{t.label}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

export { PinterestScreen };
