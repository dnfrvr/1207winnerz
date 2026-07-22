import React, { useState, useContext } from "react";
import { FF_IOS } from "../shared/constants.js";
import { LoreDateCtx, loreRelativeLabel } from "../shared/lore-date.js";

const BrowserScreen = ({data,admin,update,accent,isIos,tab,setTab}) => {
  const bk = data.browser?.bookmarks||[];
  const hist = data.browser?.history||[];
  const loreDateStr = useContext(LoreDateCtx);
  const updBrowser = (key,val) => update("browser",{...data.browser,[key]:val});
  const rowStyle = {padding:"10px 12px",borderBottom:`1px solid ${isIos?"#e0e0e0":"#1e1e1e"}`,display:"flex",alignItems:"center",gap:10,background:isIos?"#fff":"transparent"};
  const tabBtn = t => ({padding:"6px 14px",border:"none",cursor:"pointer",fontSize:12,fontWeight:tab===t?600:400,background:tab===t?(isIos?"#fff":"#2a2a2a"):"transparent",color:tab===t?(isIos?accent:"#fff"):(isIos?"#888":"#666"),borderBottom:tab===t?`2px solid ${accent}`:"2px solid transparent"});
  if(isIos) {
    const ToolbarIOS = ({onBk, onHist}) => (
      <div style={{background:"linear-gradient(180deg,#6e7a8a,#4a5568)",borderTop:"1px solid #2d3748",height:44,display:"flex",alignItems:"center",justifyContent:"space-around",flexShrink:0,padding:"0 4px"}}>
        {[["back","back"],["fwd","fwd"],["share","share"]].map(([icon,key])=>(
          <button key={key} style={{background:"none",border:"none",color:"rgba(255,255,255,0.85)",cursor:"pointer",padding:"0 12px",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",opacity:key==="fwd"||key==="back"?0.35:1}} dangerouslySetInnerHTML={{__html:
            key==="back" ? '<svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M7 1L1 7l6 6" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>' :
            key==="fwd"  ? '<svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M1 1l6 6-6 6" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>' :
            '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 6l6-5 6 5" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>'
          }}/>
        ))}
        <button onClick={onBk} style={{background:"none",border:"none",color:"rgba(255,255,255,0.85)",cursor:"pointer",padding:"0 12px",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <svg width="18" height="14" viewBox="0 0 20 16" fill="none"><path d="M10 3.5C8.5 2.2 6 1.5 1 1.5v11.8c5 0 7.5.7 9 2 1.5-1.3 4-2 9-2V1.5c-5 0-7.5.7-9 2z" stroke="rgba(255,255,255,0.85)" strokeWidth="1.4" strokeLinejoin="round"/><path d="M10 3.5v9.8" stroke="rgba(255,255,255,0.85)" strokeWidth="1.4"/></svg>
        </button>
        <button style={{background:"none",border:"none",color:"rgba(255,255,255,0.85)",cursor:"pointer",padding:"0 8px",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
          <span style={{fontSize:13,border:"1.5px solid rgba(255,255,255,0.8)",borderRadius:3,padding:"1px 5px",fontWeight:700}}>5</span>
        </button>
      </div>
    );

    // "Bookmarks" overlay panel — shown when 📖 tapped
    if(tab==="bookmarks"||tab==="history") {
      return (
        <div style={{flex:1,background:"#c8c7cc",display:"flex",flexDirection:"column",minHeight:0}}>
          
          <div style={{background:"linear-gradient(180deg,#4a5568,#2d3748)",padding:"6px 8px",display:"flex",alignItems:"center",gap:6,flexShrink:0,boxShadow:"0 1px 3px rgba(0,0,0,0.5)"}}>
            <button onClick={()=>setTab("search")} style={{background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:5,padding:"4px 10px",color:"#fff",fontSize:12,cursor:"pointer"}}>Done</button>
            <div style={{flex:1,textAlign:"center",color:"rgba(255,255,255,0.85)",fontSize:13,fontWeight:600}}>{tab==="bookmarks"?"Bookmarks":"History"}</div>
            <div style={{width:52}}/>
          </div>
          
          <div style={{display:"flex",background:"linear-gradient(180deg,#e0e0e5,#d0d0d5)",borderBottom:"1px solid #b8b8c0",flexShrink:0}}>
            {[["bookmarks",<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/></svg>,"Bookmarks"],["history",<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" fill="none"/><path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,"History"]].map(([t,icon,label])=>(
              <button key={t} style={{flex:1,fontSize:11,padding:"7px 4px",border:"none",cursor:"pointer",background:tab===t?"rgba(255,255,255,0.7)":"transparent",color:tab===t?"#1a1a2e":"#666",borderRadius:0,borderBottom:tab===t?"2px solid #557aff":"2px solid transparent",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2}} onClick={()=>setTab(t)}>
                {icon}
                <span>{label}</span>
              </button>
            ))}
          </div>
          
          <div style={{flex:1,background:"#fff",overflowY:"auto"}}>
            {tab==="bookmarks" && bk.map((b,i)=>(
              <div key={b.id} style={rowStyle} onClick={()=>setTab("search")}>
                <div style={{width:32,height:32,background:"linear-gradient(135deg,#6c7a89,#4a5568)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#fff"/></svg></div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{color:"#1a1a1a",fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.title}</div>
                  <div style={{color:"#8e8e93",fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.url}</div>
                </div>
                <span style={{color:"#c8c7cc",lineHeight:1}}><svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
              </div>
            ))}
            {tab==="history" && hist.map((h,i)=>(
              <div key={h.id} style={rowStyle} onClick={()=>setTab("search")}>
                <div style={{width:32,height:32,background:"linear-gradient(135deg,#a0a0a8,#7a7a80)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0,color:"#fff"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="1.8" fill="none"/><path d="M12 7v5l3.5 2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{color:"#1a1a1a",fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.title}</div>
                  <div style={{color:"#8e8e93",fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.url} · {loreRelativeLabel(h.time,loreDateStr)}</div>
                </div>
                <span style={{color:"#c8c7cc",lineHeight:1}}><svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Default: empty Safari search page (new tab / no URL loaded)
    return (
      <div style={{flex:1,background:"#c8c7cc",display:"flex",flexDirection:"column",minHeight:0}}>
        
        <div style={{background:"linear-gradient(180deg,#4a5568,#2d3748)",padding:"6px 8px",display:"flex",alignItems:"center",gap:6,flexShrink:0,boxShadow:"0 1px 3px rgba(0,0,0,0.5)"}}>
          
          <div style={{flex:1,background:"rgba(255,255,255,0.92)",border:"1px solid rgba(255,255,255,0.7)",borderRadius:4,padding:"4px 8px",display:"flex",alignItems:"center",justifyContent:"space-between",minWidth:0,boxShadow:"0 0 0 2px rgba(85,122,255,0.5)"}}>
            <div style={{display:"flex",alignItems:"center",gap:4,minWidth:0,flex:1}}>
              <span style={{color:"#8e8e93",fontSize:11,flex:1,textAlign:"center",fontFamily:FF_IOS}}>Search or enter address</span>
            </div>
          </div>
          
          <button style={{background:"none",border:"none",color:"rgba(255,255,255,0.9)",fontSize:13,cursor:"pointer",padding:"0 2px",flexShrink:0,fontFamily:FF_IOS}}>Cancel</button>
        </div>
        
        <div style={{flex:1,background:"#fff",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",paddingTop:32}}>
          
          <div style={{color:"#b0b0b8",fontSize:11,fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:14,fontFamily:FF_IOS}}>Favorites</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,padding:"0 16px",width:"100%",maxWidth:320,boxSizing:"border-box"}}>
            {bk.slice(0,4).map((b,i)=>(
              <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,cursor:"default"}}>
                <div style={{width:48,height:48,borderRadius:12,background:"linear-gradient(135deg,#e0e4f0,#c8cce0)",border:"0.5px solid rgba(0,0,0,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,boxShadow:"0 1px 3px rgba(0,0,0,0.15)"}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#8088a0"/></svg></div>
                <span style={{color:"#555",fontSize:9,textAlign:"center",fontFamily:FF_IOS,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:52}}>{b.title.split("—")[0].trim()}</span>
              </div>
            ))}
          </div>
        </div>
        <ToolbarIOS onBk={()=>setTab("bookmarks")} onHist={()=>setTab("history")}/>
      </div>
    );
  }
  // ── ANDROID JELLY BEAN BROWSER ──────────────────────────────────────────────
  const [andBrowserView, setAndBrowserView] = React.useState("new_tab"); // "new_tab" | "bookmarks" | "history"

  // Reset to new_tab when browser opens (handled by key on parent)
  const andAccent = accent || "#33b5e5";

  // Jelly Bean flat bottom bar icons
  const JBIcon = ({children, onTap, disabled}) => (
    <button onClick={onTap} disabled={!!disabled} style={{
      background:"none",border:"none",padding:"8px 14px",cursor:disabled?"default":"pointer",
      color:disabled?"#2a2a2a":"rgba(255,255,255,0.75)",fontSize:16,
      display:"flex",alignItems:"center",justifyContent:"center",
      opacity:disabled?0.3:1,
    }}>{children}</button>
  );

  const JBBottomBar = ({onMenu}) => (
    <div style={{background:"#1a1a1a",borderTop:"1px solid #111",height:44,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 4px",flexShrink:0}}>
      <JBIcon disabled><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></JBIcon>
      <JBIcon disabled><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></JBIcon>
      <JBIcon onTap={()=>setAndBrowserView("new_tab")}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 12a9 9 0 1018 0A9 9 0 003 12z" stroke="currentColor" strokeWidth="1.8"/><path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
      </JBIcon>
      <JBIcon onTap={()=>setAndBrowserView("bookmarks")}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3-7 3V5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
      </JBIcon>
      <JBIcon onTap={onMenu}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/></svg>
      </JBIcon>
    </div>
  );

  // JB URL bar — flat, dark
  const JBUrlBar = ({placeholder}) => (
    <div style={{background:"#222",borderBottom:"1px solid #111",padding:"6px 10px",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{flexShrink:0,opacity:0.4}}><circle cx="11" cy="11" r="7" stroke="white" strokeWidth="2"/><path d="M21 21l-4-4" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
      <div style={{flex:1,background:"#1a1a1a",border:`1px solid ${andAccent}33`,borderRadius:2,padding:"5px 10px",fontSize:11,color:"#444",fontFamily:FF_IOS}}>
        {placeholder||"Search or type URL"}
      </div>
      {andBrowserView!=="new_tab"&&(
        <button onClick={()=>setAndBrowserView("new_tab")} style={{background:"none",border:"none",color:andAccent,fontSize:11,cursor:"pointer",padding:0,fontFamily:FF_IOS,flexShrink:0}}>✕</button>
      )}
    </div>
  );

  // NEW TAB page
  if(andBrowserView==="new_tab") return (
    <div style={{flex:1,display:"flex",flexDirection:"column",background:"#1a1a1a",minHeight:0}}>
      <JBUrlBar placeholder="Search or type URL"/>
      
      <div style={{flex:1,overflowY:"auto",padding:"20px 14px 0"}}>
        <div style={{color:"#444",fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:12,fontFamily:FF_IOS}}>Bookmarks</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          {bk.map((b,i)=>(
            <div key={b.id} onClick={()=>setAndBrowserView("bookmarks")} style={{background:"#222",borderRadius:2,padding:"12px 8px 10px",display:"flex",flexDirection:"column",alignItems:"center",gap:6,cursor:"pointer",border:"1px solid #2a2a2a"}}>
              <div style={{width:32,height:32,borderRadius:2,background:andAccent+"22",border:`1px solid ${andAccent}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill={andAccent} opacity="0.7"/></svg>
              </div>
              <span style={{color:"#888",fontSize:9,textAlign:"center",fontFamily:FF_IOS,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",width:"100%",display:"block"}}>{b.title.split("—")[0].split("—")[0].trim()}</span>
            </div>
          ))}
          {bk.length===0&&<div style={{gridColumn:"1/-1",padding:24,textAlign:"center",color:"#333",fontSize:12}}>No bookmarks yet.</div>}
        </div>
        {hist.length>0&&<>
          <div style={{color:"#444",fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",margin:"18px 0 10px",fontFamily:FF_IOS}}>Recent</div>
          {hist.slice(0,3).map((h,i)=>(
            <div key={h.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #222"}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{flexShrink:0,opacity:0.3}}><circle cx="11" cy="11" r="7" stroke="white" strokeWidth="2"/><path d="M21 21l-4-4" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
              <div style={{flex:1,minWidth:0}}>
                <div style={{color:"#666",fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:FF_IOS}}>{h.title}</div>
                <div style={{color:"#333",fontSize:9,marginTop:1,fontFamily:FF_IOS}}>{h.url}</div>
              </div>
            </div>
          ))}
        </>}
      </div>
      <JBBottomBar onMenu={()=>setAndBrowserView("history")}/>
    </div>
  );

  // BOOKMARKS panel
  if(andBrowserView==="bookmarks") return (
    <div style={{flex:1,display:"flex",flexDirection:"column",background:"#1a1a1a",minHeight:0}}>
      <JBUrlBar placeholder="Search or type URL"/>
      
      <div style={{display:"flex",background:"#111",borderBottom:"1px solid #0a0a0a",flexShrink:0}}>
        {[["bookmarks","Bookmarks"],["history","History"]].map(([t,l])=>(
          <button key={t} onClick={()=>setAndBrowserView(t)} style={{
            flex:1,padding:"10px 0",border:"none",cursor:"pointer",fontSize:11,fontWeight:700,
            letterSpacing:0.5,fontFamily:FF_IOS,
            background:"transparent",
            color:andBrowserView===t?andAccent:"#555",
            borderBottom:andBrowserView===t?`2px solid ${andAccent}`:"2px solid transparent",
          }}>{l.toUpperCase()}</button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",minHeight:0}}>
        {bk.length===0&&<div style={{padding:24,textAlign:"center",color:"#444",fontSize:12}}>No bookmarks.</div>}
        {bk.map((b,i)=>(
          <div key={b.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderBottom:"1px solid #111",background:"transparent"}}>
            <div style={{width:28,height:28,borderRadius:2,background:andAccent+"1a",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3-7 3V5z" stroke={andAccent} strokeWidth="1.8" strokeLinejoin="round"/></svg>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{color:"#ddd",fontSize:12,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:FF_IOS}}>{b.title}</div>
              <div style={{color:"#444",fontSize:10,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:FF_IOS}}>{b.url}</div>
            </div>
          </div>
        ))}
      </div>
      <JBBottomBar onMenu={()=>setAndBrowserView("history")}/>
    </div>
  );

  // HISTORY panel
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",background:"#1a1a1a",minHeight:0}}>
      <JBUrlBar placeholder="Search or type URL"/>
      <div style={{display:"flex",background:"#111",borderBottom:"1px solid #0a0a0a",flexShrink:0}}>
        {[["bookmarks","Bookmarks"],["history","History"]].map(([t,l])=>(
          <button key={t} onClick={()=>setAndBrowserView(t)} style={{
            flex:1,padding:"10px 0",border:"none",cursor:"pointer",fontSize:11,fontWeight:700,
            letterSpacing:0.5,fontFamily:FF_IOS,
            background:"transparent",
            color:andBrowserView===t?andAccent:"#555",
            borderBottom:andBrowserView===t?`2px solid ${andAccent}`:"2px solid transparent",
          }}>{l.toUpperCase()}</button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",minHeight:0}}>
        {hist.length===0&&<div style={{padding:24,textAlign:"center",color:"#444",fontSize:12}}>No history.</div>}
        {hist.map((h,i)=>(
          <div key={h.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderBottom:"1px solid #111"}}>
            <div style={{width:28,height:28,borderRadius:2,background:"#222",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="#555" strokeWidth="1.8"/><path d="M12 8v4l2.5 2.5" stroke="#555" strokeWidth="1.8" strokeLinecap="round"/></svg>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{color:"#ddd",fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:FF_IOS}}>{h.title}</div>
              <div style={{color:"#444",fontSize:10,marginTop:1,fontFamily:FF_IOS}}>{h.url} · <span style={{color:"#333"}}>{loreRelativeLabel(h.time,loreDateStr)}</span></div>
            </div>
          </div>
        ))}
      </div>
      <JBBottomBar onMenu={()=>setAndBrowserView("bookmarks")}/>
    </div>
  );
};

export { BrowserScreen };
