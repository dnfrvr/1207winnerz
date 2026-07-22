import React, { useState, useContext } from "react";
import { FF_IOS } from "../shared/constants.js";
import { LoreDateCtx, loreRelativeLabel, sortCallsByDate } from "../shared/lore-date.js";
import { getCharKey } from "../shared/social-feed.js";

const KEYS = [["1","",""],["2","ABC",""],["3","DEF",""],["4","GHI",""],["5","JKL",""],["6","MNO",""],["7","PQRS",""],["8","TUV",""],["9","WXYZ",""],["*","",""],["0","+",""],["#","",""]];

// ─── iOS 6 PHONE (white) ──────────────────────────────────────────────────────
const IOSPhoneApp = ({data,admin,update,panel,setPanel}) => {
  const [dialed,setDialed] = useState("");
  const [balloons,setBalloons] = useState([]);
  const loreDateStr = useContext(LoreDateCtx);
  const calls = sortCallsByDate(data.calls||[]);
  const charKey = getCharKey(data);
  const callColor = t => (t==="missed"||t==="outgoing_missed")?"#ff3b30":t==="incoming"?"#4cd964":"#8e8e93";
  const callArrow = t => t==="incoming"
    ? <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 11V5M11 11H5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
    : <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M3 11l8-8M11 3v6M11 3H5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  const uniqContacts = (data.contacts && data.contacts.length>0)
    ? data.contacts.map(c=>({contact:c.name, photo:c.photo}))
    : calls.filter((c,i,a)=>a.findIndex(x=>x.contact===c.contact)===i);

  const launchBalloons = () => {
    setBalloons([]);
    const newB = Array.from({length:30},(_,i)=>({
      id: Date.now()+i,
      x: 2 + Math.random()*90,         // spread on full width
      size: 18 + Math.random()*18,      // emoji size px
      dur: 3200 + Math.random()*2000,   // rise: 3.2–5.2s, linear = no pause
      delay: Math.random()*1800,        // stagger up to 1.8s
      wobbleDur: 900 + Math.random()*900, // wobble cycle 0.9–1.8s
      animKey: Math.floor(Math.random()*5), // which wobble variant
    }));
    setBalloons(newB);
    newB.forEach(b=>{
      setTimeout(()=>setBalloons(prev=>prev.filter(bb=>bb.id!==b.id)), b.delay+b.dur+300);
    });
  };

  const Key = ({k,sub}) => (
    <button onClick={()=>setDialed(d=>d+k)} style={{
      width:"100%",padding:"9px 0 8px",border:"1px solid #c2c1bb",borderRadius:0,
      background:"linear-gradient(180deg,#ffffff,#e3e2dc)",color:"#1a1a1a",cursor:"pointer",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",lineHeight:1,
      boxShadow:"inset 0 1px 0 rgba(255,255,255,0.9)"}}>
      <span style={{fontSize:22,fontWeight:400,letterSpacing:0}}>{k}</span>
      {sub&&<span style={{fontSize:8,color:"#6e6e73",letterSpacing:2,fontWeight:600,marginTop:1}}>{sub}</span>}
    </button>
  );

  const keypad = (
    <div style={{flex:1,display:"flex",flexDirection:"column",background:"#fff",minHeight:0,position:"relative",overflow:"hidden"}}>
      {/* Two-layer balloon animation:
           outer: rises linearly (no easing = no pause)
           inner: wobbles sinusoidally left-right continuously
           Result: perfectly smooth, organic float across full screen */}
      <style>{`
        @keyframes bRiseUp { from { transform: translateY(0); opacity:1; } to { transform: translateY(-720px); opacity:0; } }
        @keyframes bWobble0 { 0%{transform:translateX(0px)} 25%{transform:translateX(14px)} 75%{transform:translateX(-14px)} 100%{transform:translateX(0px)} }
        @keyframes bWobble1 { 0%{transform:translateX(0px)} 25%{transform:translateX(-18px)} 75%{transform:translateX(18px)} 100%{transform:translateX(0px)} }
        @keyframes bWobble2 { 0%{transform:translateX(0px)} 25%{transform:translateX(10px)} 75%{transform:translateX(-22px)} 100%{transform:translateX(0px)} }
        @keyframes bWobble3 { 0%{transform:translateX(0px)} 25%{transform:translateX(-12px)} 75%{transform:translateX(16px)} 100%{transform:translateX(0px)} }
        @keyframes bWobble4 { 0%{transform:translateX(0px)} 25%{transform:translateX(20px)} 75%{transform:translateX(-10px)} 100%{transform:translateX(0px)} }
      `}</style>
      {balloons.map(b=>(
        <div key={b.id} style={{
          position:"absolute",
          bottom: -(b.size*2),
          left:`${b.x}%`,
          fontSize: b.size,
          lineHeight:1,
          animation:`bRiseUp ${b.dur}ms linear ${b.delay}ms forwards`,
          pointerEvents:"none", userSelect:"none", zIndex:50, willChange:"transform,opacity",
        }}>
          <span style={{
            display:"inline-block",
            animation:`bWobble${b.animKey%5} ${b.wobbleDur}ms ease-in-out ${b.delay}ms infinite`,
          }}>🎈</span>
        </div>
      ))}
      
      <div style={{height:46,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",padding:"0 8px",flexShrink:0}}>
        <span style={{fontSize:30,color:"#1a1a1a",letterSpacing:2,fontWeight:400,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"100%",display:"block",textAlign:"center"}}>{dialed}</span>
      </div>
      
      <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"flex-end",padding:"0 0 8px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:0}}>
        {KEYS.map(([k,sub])=><Key key={k} k={k} sub={sub}/>)}
      </div>
      
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",alignItems:"center",marginTop:9,gap:8,padding:"0 14px"}}>
        <div style={{display:"flex",justifyContent:"center"}}>
          {dialed&&<svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{opacity:0.55}}><circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7"/><path d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="M18 8v6M15 11h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>}
        </div>
        <button onClick={launchBalloons} style={{border:"1px solid #3a9e3a",borderRadius:0,background:"linear-gradient(180deg,#5fd85f,#2faf2f)",color:"#fff",fontSize:17,fontWeight:600,padding:"11px 0",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,boxShadow:"inset 0 1px 0 rgba(255,255,255,0.5),0 1px 2px rgba(0,0,0,0.25)",textShadow:"0 -1px 0 rgba(0,0,0,0.2)"}}>
          <span style={{lineHeight:1,display:"flex",alignItems:"center",gap:4}}><svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M3.5 2h3l1.5 4-2 1.5A12 12 0 009.5 11l1.5-2 4 1.5v3A2 2 0 0113 16 12 12 0 012 5a2 2 0 011.5-3z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg> Call</span>
        </button>
        <div style={{display:"flex",justifyContent:"center"}}>
          {dialed&&<button onClick={()=>setDialed(d=>d.slice(0,-1))} style={{background:"none",border:"none",fontSize:22,color:"#444",cursor:"pointer"}}>⌫</button>}
        </div>
      </div>
      </div>
    </div>
  );

  const list = (rows) => (
    <div style={{flex:1,background:"#fff",overflowY:"auto",minHeight:0,WebkitOverflowScrolling:"touch"}}>{rows}</div>
  );

  const recents = list(calls.map((c,i)=>(
    <div key={c.id} style={{padding:"9px 12px",borderBottom:"1px solid #d9d8d2",display:"flex",alignItems:"center",gap:10,background:"linear-gradient(180deg,#ffffff,#f6f5f0)"}}>
      <div style={{width:30,height:30,borderRadius:"50%",background:`${callColor(c.type)}18`,border:`1px solid ${callColor(c.type)}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0,color:callColor(c.type)}}>{callArrow(c.type)}</div>
      <div style={{flex:1,minWidth:0}}>
        {admin
          ?<input value={c.contact} onChange={e=>{const cl=[...calls];cl[i]={...cl[i],contact:e.target.value};update("calls",cl);}} style={{background:"rgba(255,200,0,0.15)",border:"1px dashed #ffc107",color:"#000",fontSize:13,display:"block",width:"95%"}}/>
          :<div style={{color:c.type==="missed"?"#ff3b30":"#000",fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.contact}</div>}
        <div style={{color:"#8e8e93",fontSize:10,marginTop:1}}>{c.type==="missed"?"Manqué":c.type==="incoming"?"Entrant":c.type==="outgoing_missed"?"Sans réponse":"Sortant"} · {loreRelativeLabel(c.time,loreDateStr)}{c.duration?` · ${c.duration}`:""}</div>
      </div>
      <span style={{color:"#007aff",fontSize:16,flexShrink:0}}>ⓘ</span>
    </div>
  )));

  const contacts = list(uniqContacts.map((c,i)=>(
    <div key={i} style={{padding:"10px 12px",borderBottom:"1px solid #d9d8d2",display:"flex",alignItems:"center",gap:10,background:"linear-gradient(180deg,#ffffff,#f6f5f0)"}}>
      <div style={{width:32,height:32,borderRadius:"50%",background:"#c8c7c2",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:14,flexShrink:0,overflow:"hidden"}}>{c.photo?<img src={c.photo} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(c.contact||"?")[0]}</div>
      <div style={{color:"#000",fontSize:14}}>{c.contact}</div>
    </div>
  )));

  const favoriteNames = data.phoneFavorites && data.phoneFavorites.length > 0
    ? data.phoneFavorites
    : uniqContacts.slice(0, 4).map(c => c.contact);
  const favoriteContacts = favoriteNames.map(name => uniqContacts.find(c => c.contact === name) || {contact: name, photo: null});
  const favorites = list(favoriteContacts.length === 0
    ? [<div key="empty" style={{padding:"40px 24px",textAlign:"center",color:"#8e8e93",fontSize:13}}>Aucun favori</div>]
    : favoriteContacts.map((c,i)=>(
      <div key={i} style={{padding:"11px 12px",borderBottom:"1px solid #d9d8d2",display:"flex",alignItems:"center",gap:10,background:"linear-gradient(180deg,#ffffff,#f6f5f0)"}}>
        <span style={{color:"#ffcc00",lineHeight:1}}><svg width="22" height="20" viewBox="0 0 24 22" fill="none"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg></span>
        <div style={{width:32,height:32,borderRadius:"50%",background:"#c8c7c2",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:13,flexShrink:0,overflow:"hidden"}}>{c.photo?<img src={c.photo} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(c.contact||"?")[0]}</div>
        <div style={{flex:1,color:"#000",fontSize:14,fontWeight:600}}>{c.contact}</div>
        <span style={{color:"#007aff",lineHeight:1}}><svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M3.5 2h3l1.5 4-2 1.5A12 12 0 009.5 11l1.5-2 4 1.5v3A2 2 0 0113 16 12 12 0 012 5a2 2 0 011.5-3z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
      </div>
    ))
  );


  const voicemailList = (data.voicemails && data.voicemails.length>0)
    ? data.voicemails
    : (calls.filter(c=>c.type==="missed")).slice(0,3).map((c,i)=>({id:"mc"+i, contact:c.contact, time:c.time, duration:`0:0${i+3}`, transcript:""}));
  const voicemail = list(
    voicemailList.map((vm,i)=>(
      <div key={vm.id??i} style={{padding:"10px 12px",borderBottom:"1px solid #d9d8d2",background:"linear-gradient(180deg,#ffffff,#f6f5f0)"}}>
        <div style={{display:"flex",justifyContent:"space-between"}}>
          <div style={{color:"#000",fontSize:13,fontWeight:600}}>{vm.contact}</div>
          <div style={{color:"#8e8e93",fontSize:10}}>{loreRelativeLabel(vm.time,loreDateStr)}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginTop:6}}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="#007aff"><path d="M2 1.5v11l10-5.5z"/></svg>
          <div style={{flex:1,height:3,background:"#d0cfca",borderRadius:2}}/>
          <span style={{color:"#8e8e93",fontSize:10}}>{vm.duration||"0:08"}</span>
        </div>
        {vm.transcript && <div style={{color:"#3a3a3c",fontSize:11,marginTop:6,lineHeight:1.4,fontStyle:"italic"}}>"{vm.transcript}"</div>}
      </div>
    ))
  );
  const voicemailEmpty = voicemailList.length===0;

  const ALL_TABS = [["favorites",'<svg width="22" height="20" viewBox="0 0 24 22" fill="none"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>',"Favorites"],["recents",'<svg width="22" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>',"Recents"],["contacts",'<svg width="22" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6"/><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>',"Contacts"],["keypad",'<svg width="22" height="20" viewBox="0 0 24 24" fill="none"><circle cx="6" cy="6" r="2" fill="currentColor"/><circle cx="12" cy="6" r="2" fill="currentColor"/><circle cx="18" cy="6" r="2" fill="currentColor"/><circle cx="6" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="18" cy="12" r="2" fill="currentColor"/><circle cx="6" cy="18" r="2" fill="currentColor"/><circle cx="12" cy="18" r="2" fill="currentColor"/><circle cx="18" cy="18" r="2" fill="currentColor"/></svg>',"Keypad"],["voicemail",'<svg width="22" height="20" viewBox="0 0 24 18" fill="none"><circle cx="6" cy="9" r="5" stroke="currentColor" strokeWidth="1.6"/><circle cx="18" cy="9" r="5" stroke="currentColor" strokeWidth="1.6"/><path d="M6 14h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>',"Voicemail"]];
  const TABS = charKey==="glinda" ? ALL_TABS.filter(([p])=>p!=="contacts") : ALL_TABS;
  const body = panel==="recents"?recents:panel==="contacts"?contacts:panel==="favorites"?favorites:panel==="voicemail"?(voicemailEmpty?<div style={{flex:1,background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",color:"#999",fontSize:13}}>No Voicemail</div>:voicemail):keypad;

  const panelTitle = {recents:"Recents",contacts:"Contacts",favorites:"Favorites",voicemail:"Voicemail"};

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0,background:"#fff"}}>
      {panel!=="keypad"&&(
        <div style={{background:"linear-gradient(180deg,#aca9a3,#8d8a84)",borderBottom:"1px solid #5e5c58",height:44,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}>
          <span style={{color:"#fff",fontWeight:700,fontSize:17,textShadow:"0 -1px 0 rgba(0,0,0,0.4)",fontFamily:FF_IOS}}>{panelTitle[panel]}</span>
        </div>
      )}
      {body}
      
      <div style={{flexShrink:0,display:"flex",background:"linear-gradient(180deg,#5b5f66,#2c2e33)",borderTop:"1px solid #14151a"}}>
        {TABS.map(([p,ic,l])=>{
          const on = panel===p;
          return (
            <button key={p} onClick={()=>setPanel(p)} style={{flex:1,border:"none",background:on?"linear-gradient(180deg,#8b9099,#5a5e66)":"none",boxShadow:on?"inset 0 1px 3px rgba(0,0,0,0.4)":"none",padding:"6px 0 4px",display:"flex",flexDirection:"column",alignItems:"center",gap:2,cursor:"pointer"}}>
              <span style={{color:on?"#fff":"#c7c9cc",lineHeight:1,display:"flex"}} dangerouslySetInnerHTML={{__html:ic}}/>
              <span style={{fontSize:9,color:on?"#fff":"#aeb0b4",fontWeight:on?600:400}}>{l}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── ANDROID HOLO PHONE (dark blue, carbon texture) ───────────────────────────
const AndroidDialer = ({data,admin,update,panel,setPanel}) => {
  const [dialed,setDialed] = useState("");
  const [balloons,setBalloons] = useState([]);
  const loreDateStr = useContext(LoreDateCtx);
  const calls = sortCallsByDate(data.calls||[]);
  const HOLO = "#33b5e5";
  const NUMC = "#7fb2dd";
  const callColor = t => (t==="missed"||t==="outgoing_missed")?"#ff5252":t==="incoming"?"#8bc34a":"#9aa0a6";
  const callArrow = t => t==="incoming"
    ? <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 11V5M11 11H5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
    : <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M3 11l8-8M11 3v6M11 3H5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  const uniqContacts = (data.contacts && data.contacts.length>0)
    ? data.contacts.map(c=>({contact:c.name, photo:c.photo}))
    : calls.filter((c,i,a)=>a.findIndex(x=>x.contact===c.contact)===i);

  const launchBalloons = () => {
    setBalloons([]);
    const newB = Array.from({length:30},(_,i)=>({
      id: Date.now()+i,
      x: 2 + Math.random()*90,         // spread on full width
      size: 18 + Math.random()*18,      // emoji size px
      dur: 3200 + Math.random()*2000,   // rise: 3.2–5.2s, linear = no pause
      delay: Math.random()*1800,        // stagger up to 1.8s
      wobbleDur: 900 + Math.random()*900, // wobble cycle 0.9–1.8s
      animKey: Math.floor(Math.random()*5), // which wobble variant
    }));
    setBalloons(newB);
    newB.forEach(b=>{
      setTimeout(()=>setBalloons(prev=>prev.filter(bb=>bb.id!==b.id)), b.delay+b.dur+300);
    });
  };

  const carbon = {
    background:"linear-gradient(180deg,#101820 0%,#0b1118 55%,#070b10 100%)",
    backgroundImage:"repeating-linear-gradient(45deg,rgba(255,255,255,0.018) 0px,rgba(255,255,255,0.018) 1px,transparent 1px,transparent 4px),linear-gradient(180deg,#101820 0%,#0b1118 55%,#070b10 100%)",
  };

  const Key = ({k,sub}) => (
    <button onClick={()=>setDialed(d=>d+k)} style={{border:"none",background:"none",cursor:"pointer",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"6px 0 4px",position:"relative"}}>
      <div style={{display:"flex",alignItems:"baseline",gap:5,justifyContent:"center"}}>
        {k==="1"
          ? <span style={{fontSize:34,fontWeight:300,color:NUMC,lineHeight:1,display:"inline-flex",alignItems:"baseline",gap:3}}>1<svg width="16" height="9" viewBox="0 0 16 9" style={{alignSelf:"center"}}><circle cx="4" cy="4.5" r="3" stroke="#7c8893" strokeWidth="1.2" fill="none"/><circle cx="12" cy="4.5" r="3" stroke="#7c8893" strokeWidth="1.2" fill="none"/><line x1="4" y1="7.5" x2="12" y2="7.5" stroke="#7c8893" strokeWidth="1.2"/></svg></span>
          : <span style={{fontSize:34,fontWeight:300,color:k==="*"||k==="#"?"#9aa0a6":NUMC,lineHeight:1}}>{k}</span>}
        {sub&&<span style={{fontSize:9,color:"#7c8893",letterSpacing:1,fontWeight:600}}>{sub}</span>}
        {k==="0"&&<span style={{fontSize:12,color:"#7c8893"}}>+</span>}
      </div>
      {k!=="*"&&k!=="#"&&<div style={{width:34,height:1.5,background:"rgba(51,181,229,0.55)",marginTop:5,borderRadius:1}}/>}
    </button>
  );

  const keypad = (
    <div style={{flex:1,display:"flex",flexDirection:"column",...carbon,minHeight:0,position:"relative",overflow:"hidden"}}>
      
      <style>{`
        @keyframes bRiseUp { from { transform: translateY(0); opacity:1; } to { transform: translateY(-720px); opacity:0; } }
        @keyframes bWobble0 { 0%{transform:translateX(0px)} 25%{transform:translateX(14px)} 75%{transform:translateX(-14px)} 100%{transform:translateX(0px)} }
        @keyframes bWobble1 { 0%{transform:translateX(0px)} 25%{transform:translateX(-18px)} 75%{transform:translateX(18px)} 100%{transform:translateX(0px)} }
        @keyframes bWobble2 { 0%{transform:translateX(0px)} 25%{transform:translateX(10px)} 75%{transform:translateX(-22px)} 100%{transform:translateX(0px)} }
        @keyframes bWobble3 { 0%{transform:translateX(0px)} 25%{transform:translateX(-12px)} 75%{transform:translateX(16px)} 100%{transform:translateX(0px)} }
        @keyframes bWobble4 { 0%{transform:translateX(0px)} 25%{transform:translateX(20px)} 75%{transform:translateX(-10px)} 100%{transform:translateX(0px)} }
      `}</style>
      {balloons.map(b=>(
        <div key={b.id} style={{
          position:"absolute",
          bottom: -(b.size*2),
          left:`${b.x}%`,
          fontSize: b.size,
          lineHeight:1,
          animation:`bRiseUp ${b.dur}ms linear ${b.delay}ms forwards`,
          pointerEvents:"none", userSelect:"none", zIndex:50, willChange:"transform,opacity",
        }}>
          <span style={{
            display:"inline-block",
            animation:`bWobble${b.animKey%5} ${b.wobbleDur}ms ease-in-out ${b.delay}ms infinite`,
          }}>🎈</span>
        </div>
      ))}
      
      <div style={{display:"flex",justifyContent:"flex-end",padding:"8px 10px 0",minHeight:34}}>
        {dialed&&<button onClick={()=>setDialed(d=>d.slice(0,-1))} style={{background:"#1c2630",border:"1px solid #2a3540",borderRadius:4,color:"#cfd6db",fontSize:13,padding:"4px 10px",cursor:"pointer",boxShadow:"inset 0 1px 0 rgba(255,255,255,0.05)"}}>✕</button>}
      </div>
      
      <div style={{minHeight:30,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:26,color:NUMC,letterSpacing:3,fontWeight:300}}>{dialed}</span>
      </div>
      
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",alignContent:"center",padding:"0 14px",gap:2}}>
        {KEYS.map(([k,sub])=><Key key={k} k={k} sub={sub}/>)}
      </div>
    </div>
  );

  const list = (rows) => <div style={{flex:1,...carbon,overflowY:"auto",minHeight:0,WebkitOverflowScrolling:"touch"}}>{rows}</div>;

  const recents = list(calls.map((c,i)=>(
    <div key={c.id} style={{padding:"11px 14px",borderBottom:"1px solid rgba(255,255,255,0.05)",display:"flex",alignItems:"center",gap:12}}>
      <div style={{width:30,height:30,borderRadius:"50%",background:"rgba(255,255,255,0.05)",border:`1px solid ${callColor(c.type)}66`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0,color:callColor(c.type)}}>{callArrow(c.type)}</div>
      <div style={{flex:1,minWidth:0}}>
        {admin
          ?<input value={c.contact} onChange={e=>{const cl=[...calls];cl[i]={...cl[i],contact:e.target.value};update("calls",cl);}} style={{background:"rgba(255,200,0,0.12)",border:"1px dashed #ffc107",color:"#fff",fontSize:13,display:"block",width:"95%"}}/>
          :<div style={{color:(c.type==="missed"||c.type==="outgoing_missed")?"#ff5252":"#eceff1",fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.contact}</div>}
        <div style={{color:"#78848c",fontSize:10,marginTop:1}}>{c.type==="outgoing_missed"?"Sans réponse · ":""}{loreRelativeLabel(c.time,loreDateStr)}{c.duration?` · ${c.duration}`:""}</div>
      </div>
      <span style={{color:HOLO,lineHeight:1,flexShrink:0}}><svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M3.5 2h3l1.5 4-2 1.5A12 12 0 009.5 11l1.5-2 4 1.5v3A2 2 0 0113 16 12 12 0 012 5a2 2 0 011.5-3z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
    </div>
  )));

  const contacts = list(uniqContacts.map((c,i)=>(
    <div key={i} style={{padding:"11px 14px",borderBottom:"1px solid rgba(255,255,255,0.05)",display:"flex",alignItems:"center",gap:12}}>
      <div style={{width:34,height:34,borderRadius:2,background:"#2a3a47",borderLeft:`3px solid ${HOLO}`,display:"flex",alignItems:"center",justifyContent:"center",color:"#cfd6db",fontWeight:700,fontSize:15,flexShrink:0,overflow:"hidden"}}>{c.photo?<img src={c.photo} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(c.contact||"?")[0]}</div>
      <div style={{color:"#eceff1",fontSize:14}}>{c.contact}</div>
    </div>
  )));

  // Holo top tab strip (icons: keypad / recents / contacts)
  const TABS = [
    ["keypad", <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M6.6 10.8a12 12 0 005.6 5.6l1.9-1.9 3.9.9V20c0 .6-.5 1-1 1A16 16 0 013 5c0-.6.4-1 1-1h4.6l.9 3.9z" fill="currentColor"/></svg>],
    ["recents", <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2"/><path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>],
  ];

  const body = panel==="recents"?recents:panel==="contacts"?contacts:keypad;

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0,background:"#070b10"}}>
      
      <div style={{flexShrink:0,display:"flex",background:"#000"}}>
        {TABS.map(([p,icon])=>{
          const on = panel===p;
          return (
            <button key={p} onClick={()=>setPanel(p)} style={{flex:1,border:"none",background:"none",padding:"10px 0 8px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:on?HOLO:"#7c8893",borderBottom:on?`3px solid ${HOLO}`:"3px solid #1c1c1c"}}>
              {icon}
            </button>
          );
        })}
      </div>
      {body}
      
      <div style={{flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-around",background:"#05080c",borderTop:"1px solid #161c22",padding:"8px 0 10px"}}>
        <button style={{background:"none",border:"none",color:"#8a949c",cursor:"pointer",padding:"4px 18px"}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2"/><path d="M15.5 15.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
        <button onClick={launchBalloons} style={{
          width:56,height:56,borderRadius:"50%",
          background:"radial-gradient(circle at 38% 33%, #5de05d, #279a27)",
          border:"none",cursor:"pointer",flexShrink:0,
          display:"flex",alignItems:"center",justifyContent:"center",
          boxShadow:"0 0 0 3px #1a2a1a, 0 3px 12px rgba(0,180,0,0.4)",
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M6.6 10.8a12 12 0 005.6 5.6l1.9-1.9 3.9.9V20c0 .6-.5 1-1 1A16 16 0 013 5c0-.6.4-1 1-1h4.6l.9 3.9z" fill="white"/></svg>
        </button>
        <button style={{background:"none",border:"none",color:"#8a949c",cursor:"pointer",padding:"4px 18px"}}>
          <svg width="6" height="20" viewBox="0 0 6 20" fill="currentColor"><circle cx="3" cy="3" r="2.2"/><circle cx="3" cy="10" r="2.2"/><circle cx="3" cy="17" r="2.2"/></svg>
        </button>
      </div>
    </div>
  );
};

const PhoneScreen = ({data,admin,update,accent,isIos,panel,setPanel}) =>
  isIos
    ? <IOSPhoneApp data={data} admin={admin} update={update} panel={panel} setPanel={setPanel}/>
    : <AndroidDialer data={data} admin={admin} update={update} panel={panel} setPanel={setPanel}/>;

export { PhoneScreen };
