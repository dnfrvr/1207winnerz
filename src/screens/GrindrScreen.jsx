import React, { useState, useEffect, useRef } from "react";
import { FF_IOS } from "../shared/constants.js";
import { UploadReader } from "../lib/storage.js";

const GrindrScreen = ({data,admin,update}) => {
  const [tab, setTab]           = useState("nearby");
  const [activeDm, setActiveDm] = useState(null);
  const [localProfiles, setLocalProfiles] = useState(null);
  const dmScrollRef = React.useRef(null);

  React.useEffect(() => {
    if(dmScrollRef.current && activeDm !== null) {
      setTimeout(() => {
        dmScrollRef.current.scrollTop = dmScrollRef.current.scrollHeight;
      }, 0);
    }
  }, [activeDm]);

  const profiles  = localProfiles ?? (data.grindr || []);
  const myProfile = data.grindrProfile || {name:"",age:"",headline:"",about:"",photo:null};
  const setMy     = (k,v) => update("grindrProfile",{...myProfile,[k]:v});

  React.useEffect(() => { setLocalProfiles(null); }, [data.grindr]);
  const commitProfiles = (g) => { setLocalProfiles(null); update("grindr", g); };

  const OR  = "#f5a623";   // grindr orange
  const BG  = "#0d0d0d";
  const SEP = "#1e1e1e";

  const grindrDms = data.grindrDms || [
    {id:1, name:"Jackson",  distance:"180 m",   photo:null, online:true,  thread:[
      {from:"them", text:"salut toi 👀",                            time:"10:12 AM"},
      {from:"me",   text:"salut, ça va ?",                          time:"10:14 AM"},
      {from:"them", text:"bien merci 😊 t'es en cours là ?",        time:"10:15 AM"},
      {from:"me",   text:"non j'ai un creux, toi ?",                time:"10:16 AM"},
      {from:"them", text:"pareil, on pourrait se croiser ?",         time:"10:17 AM"},
    ]},
    {id:2, name:"Jungkook", distance:"340 m",   photo:null, online:true,  thread:[
      {from:"them", text:"heyy",                                    time:"Hier"},
      {from:"me",   text:"hey, t'es d'où ?",                        time:"Hier"},
      {from:"them", text:"séoul à la base mais j'étudie ici depuis 2 ans", time:"Hier"},
      {from:"me",   text:"sympa ! tu fais quoi comme études ?",     time:"Hier"},
      {from:"them", text:"musique. toi ?",                          time:"Hier"},
      {from:"me",   text:"éco. on a l'air très différents lol",     time:"Hier"},
      {from:"them", text:"c'est pas plus mal 😏",                   time:"Hier"},
    ]},
    {id:3, name:"James",    distance:"1.2 km",  photo:null, online:false, thread:[
      {from:"them", text:"beau profil",                             time:"Hier"},
      {from:"me",   text:"merci :)",                                time:"Hier"},
      {from:"them", text:"tu cherches quoi sur ici ?",              time:"Hier"},
      {from:"me",   text:"je sais pas encore vraiment",             time:"Hier"},
      {from:"them", text:"honnête au moins 😄",                     time:"Hier"},
    ]},
    {id:4, name:"Mateo",    distance:"600 m",   photo:null, online:true,  thread:[
      {from:"them", text:"coucou 🌻",                               time:"09:03 AM"},
      {from:"me",   text:"coucou ! t'as un prénom sympa",           time:"09:05 AM"},
      {from:"them", text:"espagnol de base haha. t'es étudiant ?",  time:"09:06 AM"},
      {from:"me",   text:"oui à l'UMA. et toi ?",                   time:"09:07 AM"},
      {from:"them", text:"idem ! on est peut-être voisins 😲",      time:"09:08 AM"},
    ]},
    {id:5, name:"Johnny",   distance:"2.1 km",  photo:null, online:false, thread:[
      {from:"them", text:"yo",                                      time:"2d"},
      {from:"me",   text:"yo, ça va ?",                             time:"2d"},
      {from:"them", text:"ouais tranquille. t'aimes la musique ?",  time:"2d"},
      {from:"me",   text:"un peu oui, pourquoi ?",                  time:"2d"},
      {from:"them", text:"je fais des sets le week-end si tu veux passer", time:"2d"},
    ]},
    {id:6, name:"Gary",     distance:"850 m",   photo:null, online:true,  thread:[
      {from:"them", text:"salut 😌",                                time:"11:30 AM"},
      {from:"me",   text:"salut !",                                 time:"11:32 AM"},
      {from:"them", text:"j'aime ton profil, t'es étudiant ?",     time:"11:33 AM"},
      {from:"me",   text:"oui, économie. toi ?",                   time:"11:33 AM"},
      {from:"them", text:"je travaille dans une galerie d'art ici", time:"11:34 AM"},
      {from:"me",   text:"oh c'est cool ! tu fais quoi exactement ?", time:"11:35 AM"},
      {from:"them", text:"commissaire d'expo principalement 🎨",   time:"11:36 AM"},
    ]},
    {id:7, name:"Léo",      distance:"450 m",   photo:null, online:true,  thread:[
      {from:"them", text:"hey 👋",                                  time:"08:50 AM"},
      {from:"me",   text:"hey ! t'es levé tôt",                    time:"09:00 AM"},
      {from:"them", text:"cours à 8h le lundi… la vraie torture",  time:"09:01 AM"},
      {from:"me",   text:"courage haha, t'as quoi comme cours ?",  time:"09:02 AM"},
      {from:"them", text:"architecture. 5 ans de souffrance 😭",   time:"09:03 AM"},
    ]},
    {id:8, name:"Rayan",    distance:"1.8 km",  photo:null, online:false, thread:[
      {from:"them", text:"bonsoir",                                 time:"3d"},
      {from:"me",   text:"bonsoir :)",                              time:"3d"},
      {from:"them", text:"tu fais quoi ce soir ?",                  time:"3d"},
      {from:"me",   text:"rien de spécial, toi ?",                  time:"3d"},
      {from:"them", text:"idem. on pourrait se voir ?",             time:"3d"},
      {from:"me",   text:"pourquoi pas, t'es dans quel coin ?",     time:"3d"},
    ]},
  ];

  /* ─── Tab contents ─────────────────────────────────────── */

  const NearbyTab = () => (
    <div style={{flex:1,overflowY:"auto"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:2,padding:2}}>
        {profiles.map((p,i)=>(
          <div key={p.id} style={{aspectRatio:"1",background:"#1a0f00",position:"relative",overflow:"hidden",cursor:"pointer"}}>
            {p.photo
              ? <img src={p.photo} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              : <div style={{width:"100%",height:"100%",background:"#2a1a00",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>👤</div>}
            <div style={{position:"absolute",bottom:0,left:0,right:0,background:"linear-gradient(transparent,rgba(0,0,0,0.8))",padding:"12px 6px 4px"}}>
              {admin
                ? <input value={p.name} onChange={e=>{const g=[...profiles];g[i]={...g[i],name:e.target.value};setLocalProfiles(g);}} onBlur={()=>commitProfiles(profiles)}
                    style={{background:"rgba(0,0,0,0.5)",border:"1px solid #f5a623",color:"#fff",fontSize:9,width:"90%",textAlign:"center",borderRadius:2}}/>
                : <div style={{color:"#fff",fontSize:9,fontWeight:700,textShadow:"0 1px 3px rgba(0,0,0,0.8)"}}>{p.name}</div>}
              {admin
                ? <input value={p.distance||""} onChange={e=>{const g=[...profiles];g[i]={...g[i],distance:e.target.value};setLocalProfiles(g);}} onBlur={()=>commitProfiles(profiles)}
                    style={{background:"rgba(0,0,0,0.5)",border:"1px solid #f5a623",color:OR,fontSize:8,width:"90%",marginTop:2,borderRadius:2}}/>
                : <div style={{color:OR,fontSize:8}}>{p.distance}</div>}
            </div>
            {admin && <>
              <div onClick={()=>document.getElementById(`grindr-photo-${i}`).click()}
                style={{position:"absolute",top:4,left:4,background:"rgba(0,0,0,0.6)",borderRadius:4,padding:"2px 5px",cursor:"pointer",fontSize:9,color:"#fff"}}>📷</div>
              <input id={`grindr-photo-${i}`} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                const f=e.target.files?.[0];if(!f)return;
                const r=new UploadReader();r.onload=ev=>{const g=[...profiles];g[i]={...g[i],photo:ev.target.result};commitProfiles(g);};r.readAsDataURL(f);e.target.value="";
              }}/>
              <div onClick={()=>commitProfiles(profiles.filter((_,j)=>j!==i))}
                style={{position:"absolute",top:4,right:4,background:"rgba(220,50,50,0.85)",borderRadius:"50%",width:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:9,color:"#fff",fontWeight:700}}>✕</div>
            </>}
          </div>
        ))}
        {admin && (
          <div onClick={()=>commitProfiles([...profiles,{id:Date.now(),name:"Nouveau",distance:"0.1 km",photo:null}])}
            style={{aspectRatio:"1",background:"#0f0800",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",gap:4,border:"1px dashed #f5a62350"}}>
            <span style={{color:OR,fontSize:22}}>+</span>
            <span style={{color:"#666",fontSize:8}}>Ajouter</span>
          </div>
        )}
      </div>
    </div>
  );

  const DmListTab = () => (
    <div style={{flex:1,overflowY:"auto",background:BG}}>
      {grindrDms.map((conv,ci)=>{
        const last = conv.thread[conv.thread.length-1];
        return (
          <div key={conv.id} onClick={()=>setActiveDm(ci)}
            style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderBottom:`1px solid ${SEP}`,cursor:"pointer"}}>
            <div style={{position:"relative",flexShrink:0}}>
              <div style={{width:48,height:48,borderRadius:6,background:"#2a2a2a",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>
                {conv.photo?<img src={conv.photo} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:"👤"}
              </div>
              {conv.online&&<div style={{position:"absolute",bottom:1,right:1,width:10,height:10,borderRadius:"50%",background:"#5cd85c",border:`2px solid ${BG}`}}/>}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                <span style={{color:"#fff",fontWeight:700,fontSize:14}}>{conv.name}</span>
                <span style={{color:"#555",fontSize:11,flexShrink:0}}>{last?.time}</span>
              </div>
              <div style={{color:"#666",fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:1}}>
                {last?.from==="me"?"You: ":""}{last?.text}
              </div>
              <div style={{color:OR,fontSize:10,marginTop:2}}>{conv.distance}</div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const DmConvView = () => {
    const conv = grindrDms[activeDm];
    if(!conv) return null;
    return (
      <div style={{flex:1,display:"flex",flexDirection:"column",background:BG,overflow:"hidden"}}>
        
        <div style={{background:"#111",borderBottom:`1px solid ${SEP}`,padding:"10px 12px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <button onClick={()=>setActiveDm(null)} style={{background:"none",border:"none",color:"#fff",fontSize:22,cursor:"pointer",padding:"0 6px 0 0",lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M7 1L1 7l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
          <div style={{width:36,height:36,borderRadius:4,background:"#2a2a2a",overflow:"hidden",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>
            {conv.photo?<img src={conv.photo} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:"👤"}
          </div>
          <div style={{flex:1}}>
            <div style={{color:"#fff",fontWeight:700,fontSize:14,display:"flex",alignItems:"center",gap:6}}>
              {conv.online&&<span style={{width:7,height:7,borderRadius:"50%",background:"#5cd85c",display:"inline-block"}}/>}
              {conv.name}
            </div>
            <div style={{color:"#888",fontSize:11}}>{conv.distance}</div>
          </div>
          <span style={{color:"#888",lineHeight:1}}><svg width="18" height="4" viewBox="0 0 18 4" fill="none"><circle cx="2" cy="2" r="2" fill="currentColor"/><circle cx="9" cy="2" r="2" fill="currentColor"/><circle cx="16" cy="2" r="2" fill="currentColor"/></svg></span>
        </div>

        
        <div ref={dmScrollRef} style={{flex:1,overflowY:"auto",padding:"12px 10px",display:"flex",flexDirection:"column",gap:2,WebkitOverflowScrolling:"touch"}}>
          <div style={{textAlign:"center",color:"#555",fontSize:12,fontWeight:600,marginBottom:8}}>Today</div>
          {conv.thread.map((msg,mi)=>{
            const isMe = msg.from==="me";
            const prevSame = mi>0 && conv.thread[mi-1].from===msg.from;
            const isLast = mi===conv.thread.length-1;
            return (
              <React.Fragment key={mi}>
                <div style={{display:"flex",justifyContent:isMe?"flex-end":"flex-start",marginTop:prevSame?1:8}}>
                  <div style={{
                    maxWidth:"72%",
                    background:isMe?"#f5b800":"#00bcd4",
                    color:"#000",
                    borderRadius:isMe?"18px 18px 4px 18px":"18px 18px 18px 4px",
                    padding:"9px 14px",fontSize:14,fontWeight:500,lineHeight:1.35,wordBreak:"break-word",
                  }}>{msg.text}</div>
                </div>
                <div style={{textAlign:isMe?"right":"left",fontSize:10,color:"#555",padding:"1px 4px"}}>
                  {isMe&&isLast?"Delivered ":""}{msg.time}
                </div>
              </React.Fragment>
            );
          })}
        </div>

        
        <div style={{background:"#111",borderTop:`1px solid ${SEP}`,padding:"8px 10px",flexShrink:0}}>
          <div style={{background:"#1e1e1e",borderRadius:24,padding:"9px 14px",color:"#555",fontSize:14,marginBottom:8}}>Say something...</div>
          <div style={{display:"flex",justifyContent:"space-around"}}>
            {[
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="15" rx="2" stroke="#666" strokeWidth="1.8"/><circle cx="12" cy="13" r="3.5" stroke="#666" strokeWidth="1.8"/></svg>,
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#666" strokeWidth="1.8"/><path d="M8 13s1.5 2 4 2 4-2 4-2" stroke="#666" strokeWidth="1.8" strokeLinecap="round"/><circle cx="9" cy="10" r="1" fill="#666"/><circle cx="15" cy="10" r="1" fill="#666"/></svg>,
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" stroke="#666" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="#666" strokeWidth="1.8"/><path d="M7 9h4M7 13h4M15 9v6" stroke="#666" strokeWidth="1.6" strokeLinecap="round"/></svg>,
            ].map((ic,ii)=><div key={ii} style={{padding:"4px 10px"}}>{ic}</div>)}
          </div>
        </div>
      </div>
    );
  };

  const MeTab = () => (
    <div style={{flex:1,overflowY:"auto",background:"#0f0f0f",display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",gap:2,background:"#000",height:280}}>
        <div onClick={()=>document.getElementById("grindr-my-photo-0").click()}
          style={{flex:1,background:"#1a1a1a",overflow:"hidden",cursor:"pointer",position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
          {(myProfile.photos||[])[0]
            ?<img src={(myProfile.photos||[])[0]} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            :<span style={{fontSize:36,opacity:0.2}}>📷</span>}
          <div style={{position:"absolute",bottom:6,right:6,background:"rgba(0,0,0,0.55)",borderRadius:6,padding:4,fontSize:13}}>🖼</div>
        </div>
        <input id="grindr-my-photo-0" type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
          const f=e.target.files?.[0];if(!f)return;
          const r=new UploadReader();r.onload=ev=>{const ph=[...(myProfile.photos||[null,null,null,null,null])];ph[0]=ev.target.result;setMy("photos",ph);};r.readAsDataURL(f);e.target.value="";
        }}/>
        <div style={{flex:1,display:"grid",gridTemplateColumns:"1fr 1fr",gridTemplateRows:"1fr 1fr",gap:2}}>
          {[1,2,3,4].map(idx=>(
            <div key={idx} onClick={()=>document.getElementById(`grindr-my-photo-${idx}`).click()}
              style={{background:"#1a1a1a",overflow:"hidden",cursor:"pointer",position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
              {(myProfile.photos||[])[idx]
                ?<img src={(myProfile.photos||[])[idx]} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                :<span style={{fontSize:16,opacity:0.15}}>📷</span>}
              <input id={`grindr-my-photo-${idx}`} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                const f=e.target.files?.[0];if(!f)return;
                const r=new UploadReader();r.onload=ev=>{const ph=[...(myProfile.photos||[null,null,null,null,null])];ph[idx]=ev.target.result;setMy("photos",ph);};r.readAsDataURL(f);e.target.value="";
              }}/>
            </div>
          ))}
        </div>
      </div>
      <div style={{padding:"20px 16px",display:"flex",flexDirection:"column",gap:20}}>
        <div>
          <div style={{color:"#fff",fontSize:15,fontWeight:700,marginBottom:10}}>Display Name</div>
          <input value={myProfile.name||""} onChange={e=>setMy("name",e.target.value)} maxLength={15}
            style={{background:"transparent",border:"none",borderBottom:"1px solid #333",color:"#fff",fontSize:16,width:"100%",padding:"4px 0",outline:"none"}}/>
          <div style={{color:"#555",fontSize:11,textAlign:"right",marginTop:4}}>{(myProfile.name||"").length}/15</div>
        </div>
        <div>
          <div style={{color:"#fff",fontSize:15,fontWeight:700,marginBottom:10}}>About Me</div>
          <textarea value={myProfile.about||""} onChange={e=>setMy("about",e.target.value)} maxLength={255} rows={5}
            style={{background:"transparent",border:"none",borderBottom:"1px solid #333",color:"#ccc",fontSize:14,width:"100%",resize:"none",outline:"none",fontFamily:"inherit",lineHeight:1.6,padding:"4px 0"}}/>
          <div style={{color:"#555",fontSize:11,textAlign:"right",marginTop:4}}>{(myProfile.about||"").length}/255</div>
        </div>
        <div>
          <div style={{color:"#fff",fontSize:15,fontWeight:700,marginBottom:10}}>My Tags</div>
          <textarea value={myProfile.tags||""} onChange={e=>setMy("tags",e.target.value)} placeholder="group, underwear, kissing…" rows={3}
            style={{background:"transparent",border:"none",borderBottom:"1px solid #333",color:"#ccc",fontSize:14,width:"100%",resize:"none",outline:"none",fontFamily:"inherit",lineHeight:1.6,padding:"4px 0"}}/>
        </div>
      </div>
    </div>
  );

  /* ─── iOS 6 style bottom nav bar ──────────────────────── */
  const TABS = [
    {id:"nearby", label:"Cascade",
     icon:(a)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none">
       <rect x="2" y="2" width="8" height="8" rx="1" fill={a?OR:"#555"}/>
       <rect x="12" y="2" width="8" height="8" rx="1" fill={a?OR:"#555"}/>
       <rect x="2" y="12" width="8" height="8" rx="1" fill={a?OR:"#555"}/>
       <rect x="12" y="12" width="8" height="8" rx="1" fill={a?OR:"#555"}/>
     </svg>},
    {id:"dm", label:"Messages",
     icon:(a)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none">
       <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke={a?OR:"#555"} strokeWidth="2" fill={a?"rgba(245,166,35,0.15)":"none"}/>
     </svg>},
    {id:"me", label:"Profil",
     icon:(a)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none">
       <circle cx="12" cy="8" r="3.5" stroke={a?OR:"#555"} strokeWidth="2"/>
       <path d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7" stroke={a?OR:"#555"} strokeWidth="2" strokeLinecap="round"/>
     </svg>},
  ];

  const activeContent = () => {
    if(tab==="dm") return activeDm!==null ? <DmConvView/> : <DmListTab/>;
    if(tab==="me") return <MeTab/>;
    return <NearbyTab/>;
  };

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",background:BG,overflow:"hidden"}}>
      {activeContent()}

      
      {activeDm===null&&(
        <div style={{
          background:"linear-gradient(180deg,#1c1c1e 0%,#111 100%)",
          borderTop:"1px solid #3a3a3c",
          display:"flex",flexShrink:0,height:50,
          boxShadow:"inset 0 1px 0 rgba(255,255,255,0.06)",
        }}>
          {TABS.map(t=>(
            <div key={t.id} onClick={()=>setTab(t.id)}
              style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,cursor:"pointer",paddingBottom:2}}>
              {t.icon(tab===t.id)}
              <span style={{fontSize:10,color:tab===t.id?OR:"#555",fontFamily:FF_IOS,fontWeight:tab===t.id?600:400}}>{t.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export { GrindrScreen };
