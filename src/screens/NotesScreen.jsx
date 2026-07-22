import React from "react";
import { FF_IOS } from "../shared/constants.js";
import { loreDateOnly, parseLoreTime } from "../shared/lore-date.js";

const NotesScreen = ({data,admin,update,accent,isIos,noteOpen,setNoteOpen,goHome}) => {
  const notes = [...(data.notes||[])].sort((a,b)=>{
    const pa = parseLoreTime(a.date), pb = parseLoreTime(b.date);
    if(!pa && !pb) return 0;
    if(!pa) return 1;   // notes sans date reconnaissable : à la fin
    if(!pb) return -1;
    // Mois 1-12 mais l'ARG va de sept (9) à oct (10) en traversant l'année (jan,fév compris dans les souvenirs) :
    // on compare via une clé année-mois-jour-heure-minute, en supposant un cycle sept→déc puis jan→août
    const cycleMonth = m => m>=9 ? m : m+12; // sept=9..déc=12, puis jan=13..août=20
    const ka = cycleMonth(pa.month)*100 + pa.day;
    const kb = cycleMonth(pb.month)*100 + pb.day;
    if(ka!==kb) return kb-ka; // plus récent (clé plus grande) en premier
    const ha = (pa.hour??0)*60+(pa.min??0), hb = (pb.hour??0)*60+(pb.min??0);
    return hb-ha;
  });
  const BROWN_DARK  = "#3e2208";
  const BROWN_MID   = "#5a3418";
  const BROWN_LIGHT = "#6b4226";
  const PAPER_BG = "repeating-linear-gradient(#fef9c3 0px,#fef9c3 24px,#dddca0 25px)";
  const MARGIN_RED = "#c84040";
  const NOTE_FONT = "'Marker Felt','Chalkboard SE','Comic Sans MS',cursive";
  const NOTE_BROWN = "#6b2d0a";
  const NOTE_GREY  = "#8e6030";

  // ── iOS 6 Notes NavBar ───────────────────────────────────────────────────
  const NotesNavBar = ({leftLabel, leftAction, centerTitle, showPlus=false}) => (
    <div style={{background:`linear-gradient(180deg,${BROWN_LIGHT},${BROWN_DARK})`,borderBottom:`1px solid ${BROWN_DARK}`,height:44,display:"flex",alignItems:"center",padding:"0 8px",flexShrink:0,fontFamily:FF_IOS,boxShadow:"0 1px 3px rgba(0,0,0,0.4)"}}>
      {leftAction
        ? <button onClick={leftAction} style={{background:`linear-gradient(180deg,${BROWN_MID},${BROWN_DARK})`,border:"1px solid rgba(0,0,0,0.5)",borderRadius:6,padding:"3px 10px 3px 7px",color:"#fff",fontSize:11,fontWeight:"600",cursor:"pointer",display:"flex",alignItems:"center",gap:2,textShadow:"0 -1px 0 rgba(0,0,0,0.5)",boxShadow:"inset 0 1px 0 rgba(255,255,255,0.15)",flexShrink:0}}>
            <span style={{lineHeight:1,display:"flex",alignItems:"center"}}><svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M7 1L1 7l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
            {leftLabel&&<span style={{fontSize:12}}>{leftLabel}</span>}
          </button>
        : <div style={{width:60}}/>}
      <span style={{flex:1,textAlign:"center",color:"#fff",fontWeight:"700",fontSize:centerTitle&&centerTitle.length>22?11:centerTitle&&centerTitle.length>16?13:centerTitle&&centerTitle.length>12?15:18,textShadow:"0 -1px 0 rgba(0,0,0,0.5)",pointerEvents:"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",padding:"0 4px"}}>{centerTitle}</span>
      {showPlus
        ? <button style={{background:`linear-gradient(180deg,${BROWN_MID},${BROWN_DARK})`,border:"1px solid rgba(0,0,0,0.5)",borderRadius:6,padding:"3px 10px",color:"#fff",fontSize:18,fontWeight:"300",cursor:"pointer",boxShadow:"inset 0 1px 0 rgba(255,255,255,0.15)",lineHeight:1,textShadow:"0 -1px 0 rgba(0,0,0,0.5)"}}>+</button>
        : <div style={{width:60}}/>}
    </div>
  );

  // ── Note detail view ─────────────────────────────────────────────────────
  if(noteOpen!==null && noteOpen!==undefined){
    const note = notes[noteOpen];
    if(!note){ setNoteOpen(null); return null; }
    if(!isIos) return (
      <div style={{flex:1,background:"#1a1a1a",display:"flex",flexDirection:"column",minHeight:0}}>

        <div style={{padding:"0 4px",background:accent||"#33b5e5",borderBottom:"1px solid rgba(0,0,0,0.3)",display:"flex",alignItems:"center",height:48,flexShrink:0}}>
          <button onClick={()=>setNoteOpen(null)} style={{background:"none",border:"none",color:"#fff",cursor:"pointer",padding:"0 10px",height:"100%",display:"flex",alignItems:"center"}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>

        <div style={{padding:"6px 16px",borderBottom:"1px solid #2a2a2a",background:"#212121",flexShrink:0}}>
          <span style={{color:"#999",fontSize:11,fontFamily:FF_IOS}}>{loreDateOnly(note.date)}</span>
        </div>
        
        <div style={{flex:1,padding:"16px",overflowY:"auto",background:"#1a1a1a"}}>
          {admin
            ? <><input value={note.title} onChange={e=>{const n=[...notes];n[noteOpen]={...n[noteOpen],title:e.target.value};update("notes",n);}} style={{width:"100%",background:"rgba(255,200,0,0.08)",border:"none",borderBottom:`2px solid ${accent||"#33b5e5"}`,color:"#e8e8e8",fontSize:16,fontWeight:500,marginBottom:14,padding:"4px 0",fontFamily:FF_IOS,outline:"none"}}/>
               <textarea value={note.body} onChange={e=>{const n=[...notes];n[noteOpen]={...n[noteOpen],body:e.target.value};update("notes",n);}} style={{width:"100%",minHeight:200,background:"rgba(255,200,0,0.05)",border:"none",borderLeft:`2px solid ${accent||"#33b5e5"}22`,color:"#bbb",fontSize:14,lineHeight:1.7,padding:"0 0 0 10px",resize:"vertical",fontFamily:FF_IOS,outline:"none"}}/>
            </>
            : <><div style={{color:"#e8e8e8",fontSize:16,fontWeight:500,marginBottom:14,fontFamily:FF_IOS}}>{note.title}</div>
               <div style={{color:"#bbb",fontSize:14,lineHeight:1.7,whiteSpace:"pre-wrap",fontFamily:FF_IOS,borderLeft:`3px solid ${accent||"#33b5e5"}33`,paddingLeft:10}}>{note.body}</div>
            </>
          }
        </div>
      </div>
    );
    // iOS 6 note detail
    const prevNote = noteOpen > 0 ? noteOpen-1 : null;
    const nextNote = noteOpen < notes.length-1 ? noteOpen+1 : null;
    return (
      <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0}}>
        <NotesNavBar leftLabel="Notes" leftAction={()=>setNoteOpen(null)} centerTitle={note.title||"Note"} showPlus/>
        
        <div style={{background:"#fef9c3",borderBottom:"1px solid #dddca0",padding:"5px 14px",display:"flex",justifyContent:"space-between",alignItems:"baseline",flexShrink:0}}>
          <span style={{color:"#8b2020",fontSize:12,fontWeight:"600",fontFamily:FF_IOS}}>Today</span>
          <span style={{color:NOTE_GREY,fontSize:10,fontFamily:FF_IOS}}>{loreDateOnly(note.date)}</span>
        </div>
        
        <div style={{flex:1,background:PAPER_BG,position:"relative",overflowY:"auto"}}>
          <div style={{position:"absolute",left:38,top:0,bottom:0,width:1.5,background:MARGIN_RED,pointerEvents:"none",zIndex:1}}/>
          <div style={{padding:"6px 12px 12px 48px",minHeight:"100%"}}>
            {admin
              ? <><input value={note.title} onChange={e=>{const n=[...notes];n[noteOpen]={...n[noteOpen],title:e.target.value};update("notes",n);}} style={{width:"100%",background:"transparent",border:"none",borderBottom:"1px dashed #ffc107",color:NOTE_BROWN,fontSize:15,fontWeight:600,marginBottom:4,padding:"0 0 2px",fontFamily:NOTE_FONT}}/><textarea value={note.body} onChange={e=>{const n=[...notes];n[noteOpen]={...n[noteOpen],body:e.target.value};update("notes",n);}} style={{width:"100%",minHeight:200,background:"transparent",border:"1px dashed #ffc107",color:"#333",fontSize:14,lineHeight:"25px",padding:"0",resize:"vertical",fontFamily:NOTE_FONT}}/></>
              : <div style={{color:"#1a1a1a",fontSize:14,lineHeight:"25px",fontFamily:NOTE_FONT,whiteSpace:"pre-wrap"}}>{note.title?<><strong>{note.title}</strong>{"\n\n"}</>:null}{note.body}</div>}
          </div>
        </div>
        
        <div style={{background:`linear-gradient(180deg,${BROWN_LIGHT},${BROWN_DARK})`,borderTop:`1px solid ${BROWN_DARK}`,height:44,display:"flex",alignItems:"center",justifyContent:"space-around",flexShrink:0}}>
          {[["◁", prevNote!==null?()=>setNoteOpen(prevNote):null], ["⤴",null], ["🗑",null], ["▷", nextNote!==null?()=>setNoteOpen(nextNote):null]].map(([icon,action],k)=>(
            <button key={k} onClick={action||undefined} style={{background:"none",border:"none",color:action?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.3)",fontSize:k===1?18:20,cursor:action?"pointer":"default",padding:8,lineHeight:1}}>{icon}</button>
          ))}
        </div>
      </div>
    );
  }

  // ── Notes list view ──────────────────────────────────────────────────────
  if(!isIos) return (
    <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0}}>
      <div style={{padding:"0 4px",background:accent||"#33b5e5",borderBottom:"1px solid rgba(0,0,0,0.3)",display:"flex",alignItems:"center",height:48,flexShrink:0}}>
        <button onClick={goHome} style={{background:"none",border:"none",color:"#fff",cursor:"pointer",padding:"0 10px",height:"100%",display:"flex",alignItems:"center"}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span style={{color:"#fff",fontSize:16,fontWeight:500,fontFamily:FF_IOS}}>Notes</span>
      </div>
      <div style={{flex:1,background:"#1a1a1a",overflowY:"auto",minHeight:0,position:"relative"}}>
        {notes.length===0&&<div style={{padding:40,textAlign:"center",color:"#666",fontSize:13,fontFamily:FF_IOS}}>No notes yet.</div>}
        {notes.map((note,i)=>(
          <div key={note.id} onClick={()=>setNoteOpen(i)} style={{
            background:"#212121", margin:"0 0 1px",
            padding:"14px 16px 12px",
            borderBottom:"1px solid #2a2a2a",
            cursor:"pointer", display:"flex", flexDirection:"column", gap:3,
            borderLeft:`3px solid ${accent||"#33b5e5"}`,
          }}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8}}>
              <div style={{color:"#e8e8e8",fontSize:14,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,fontFamily:FF_IOS}}>{note.title||"Untitled"}</div>
              <span style={{color:"#777",fontSize:10,flexShrink:0,fontFamily:FF_IOS}}>{loreDateOnly(note.date)}</span>
            </div>
            <div style={{color:"#999",fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:FF_IOS}}>{note.body?.split("\n")[0]||"No content"}</div>
          </div>
        ))}
      </div>
    </div>
  );
  // iOS 6 list
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0}}>
      <NotesNavBar leftLabel="Accounts" leftAction={goHome} centerTitle={`Notes (${notes.length})`} showPlus/>
      <div style={{flex:1,background:"#fef9c3",position:"relative",overflowY:"auto"}}>
        {notes.map((note,i)=>(
          <div key={note.id} onClick={()=>setNoteOpen(i)} style={{padding:"10px 14px",borderBottom:"0.5px solid #e1dca6",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",minHeight:44,position:"relative",zIndex:2}}>
            <span style={{color:NOTE_BROWN,fontSize:14,fontFamily:NOTE_FONT,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{note.title||"Untitled"}</span>
            <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0,marginLeft:8}}>
              <span style={{color:NOTE_GREY,fontSize:10,fontFamily:FF_IOS}}>{loreDateOnly(note.date)}</span>
              <span style={{color:"#c8c7cc",lineHeight:1}}><svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export { NotesScreen };
