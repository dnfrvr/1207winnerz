import React, { useState, useRef, useEffect, useContext, memo } from "react";
import { LoreDateCtx, LORE_DATE_DEFAULT, loreRelativeLabel } from "./lore-date.js";
import { DevCtx, FF_IOS } from "./constants.js";
import { SignalIcon, WifiIcon, BatteryIcon, AndroidNotifIcon } from "./icons.jsx";

// ─── SLIDE TO UNLOCK ──────────────────────────────────────────────────────────
const SlideToUnlock = ({ onUnlock }) => {
  const [pos, setPos] = useState(0);
  const trackRef = useRef(null);
  const dragging = useRef(false);
  const startX = useRef(0);
  const ARROW_W = 50;
  const getMax = () => trackRef.current ? trackRef.current.offsetWidth - ARROW_W - 10 : 160;
  const onDown = e => { dragging.current=true; startX.current=(e.touches?.[0]||e).clientX-pos; e.preventDefault(); };
  const onMove = e => {
    if(!dragging.current) return;
    const x = Math.max(0, Math.min((e.touches?.[0]||e).clientX - startX.current, getMax()));
    setPos(x);
    if(x >= getMax()*0.85){ dragging.current=false; onUnlock(); }
  };
  const onUp = () => { if(dragging.current){ dragging.current=false; setPos(0); } };
  const textOpacity = Math.max(0, 1 - (pos / (getMax()*0.4)));
  return (
    <div style={{padding:"24px 8px 24px"}}>
      <div ref={trackRef}
        style={{height:52,borderRadius:14,position:"relative",overflow:"hidden",userSelect:"none",touchAction:"none",
          background:"linear-gradient(180deg,#000,#2a2a2a)",border:"1px solid rgba(255,255,255,0.18)",
          boxShadow:"inset 0 1px 3px rgba(0,0,0,0.6),0 1px 0 rgba(255,255,255,0.08)"}}
        onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp} onTouchMove={onMove} onTouchEnd={onUp}>
        
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",paddingLeft:ARROW_W+6,paddingRight:36}}>
          <span style={{color:`rgba(220,220,220,${textOpacity})`,fontSize:15,fontWeight:300,letterSpacing:1,fontFamily:FF_IOS,whiteSpace:"nowrap"}}>
            slide to unlock
          </span>
        </div>
        
        <div style={{position:"absolute",left:pos+3,top:3,width:ARROW_W-3,height:46,borderRadius:11,
            background:"linear-gradient(180deg,#f5f5f5,#d8d8d8)",
            boxShadow:"0 2px 6px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.9)",
            display:"flex",alignItems:"center",justifyContent:"center",cursor:"grab",touchAction:"none"}}
          onMouseDown={onDown} onTouchStart={onDown}>
          <svg width="16" height="14" viewBox="0 0 18 16" fill="none">
            <path d="M1 8 H14 M9 2 L15 8 L9 14" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        
        <div style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",opacity:0.55,pointerEvents:"none"}}>
          <svg width="20" height="16" viewBox="0 0 22 18" fill="none">
            <rect x="1" y="4" width="20" height="13" rx="2.5" stroke="white" strokeWidth="1.4"/>
            <circle cx="11" cy="10.5" r="4" stroke="white" strokeWidth="1.4"/>
            <circle cx="11" cy="10.5" r="2" fill="white" opacity="0.5"/>
            <rect x="7" y="1.5" width="4" height="2.5" rx="1" stroke="white" strokeWidth="1.2"/>
            <circle cx="18" cy="6.5" r="1" fill="white" opacity="0.8"/>
          </svg>
        </div>
      </div>
    </div>
  );
};


// Isolated in its own component so clock ticks don't re-render the whole phone
const useClock = () => {
  const loreDateStr = useContext(LoreDateCtx);
  const [t, setT] = useState(new Date());
  useEffect(()=>{
    let id;
    const schedule = () => {
      const now = new Date();
      const msToNextMinute = 60000 - (now.getSeconds()*1000 + now.getMilliseconds());
      id = setTimeout(()=>{ setT(new Date()); schedule(); }, msToNextMinute);
    };
    schedule();
    return ()=>clearTimeout(id);
  },[]);
  const h=t.getHours(), m=t.getMinutes();
  const hh=String(h%12||12).padStart(2,"0"), mm=String(m).padStart(2,"0");
  const h24=String(h).padStart(2,"0");
  const ord = (n) => { const s=["th","st","nd","rd"]; const v=n%100; return n+(s[(v-20)%10]||s[v]||s[0]); };
  const WDAYS=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const MTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
  const ld = new Date((loreDateStr||LORE_DATE_DEFAULT)+"T12:00:00");
  const day=WDAYS[ld.getDay()], date=ld.getDate(), month=MTHS[ld.getMonth()];
  return {full:`${hh}:${mm}`,full24:`${h24}:${mm}`,ampm:h>=12?"PM":"AM",day,date,dateOrd:ord(date),month};
};

// Self-contained status bars — only these re-render every second
const IOSStatusBar = memo(({dark=false, mode="home", carrier=""}) => {
  const clock = useClock();
  const ov = useContext(DevCtx).statusBar || {};
  const bg           = ov.bg           ?? "rgba(0,0,0,0.45)";
  const height       = ov.height       ?? 24;
  const timeFontSize = ov.timeFontSize ?? 14;
  const timeWeight   = ov.timeWeight   ?? "600";
  const timeColor    = ov.timeColor    ?? "#ffffff";
  const timeLS       = ov.timeLetterSpacing ?? 0;
  const iconGap      = ov.iconGap      ?? 4;

  const leftIcons = (
    <div style={{display:"flex",alignItems:"center",gap:iconGap}}>
      <SignalIcon/><WifiIcon/>
    </div>
  );
  const rightIcons = <BatteryIcon/>;
  const timeEl = <span style={{fontSize:timeFontSize,fontWeight:timeWeight,color:timeColor,letterSpacing:timeLS}}>{clock.full24}</span>;

  const actualBg = bg;
  return (
    <div style={{background:actualBg,color:"#fff",padding:`0 8px`,display:"flex",alignItems:"center",flexShrink:0,height,gap:4,position:"relative"}}>
      
      <div style={{flex:1,display:"flex",alignItems:"center",gap:iconGap}}><SignalIcon/>{carrier&&<span style={{fontSize:11,fontWeight:500,color:"#fff",marginLeft:2,textShadow:"0 1px 1px rgba(0,0,0,0.4)"}}>{carrier}</span>}<WifiIcon/></div>
      
      {mode==="home" && <div style={{position:"absolute",left:"50%",transform:"translateX(-50%)"}}>{timeEl}</div>}
      
      <div style={{flex:1,display:"flex",justifyContent:"flex-end",alignItems:"center"}}><BatteryIcon/></div>
    </div>
  );
});


const AndroidStatusBar = memo(({notifApps=[],accent="#33b5e5",showTime=true}) => {
  const clock = useClock();
  const ov = useContext(DevCtx).andStatusBar || {};
  const bg           = ov.bg           ?? "#000";
  const height       = ov.height       ?? 24;
  const timeColor    = ov.timeColor    ?? "#fff";
  const timeFontSize = ov.timeFontSize ?? 12;
  const timeWeight   = ov.timeWeight   ?? "500";
  const paddingH     = ov.paddingH     ?? 6;

  /* ── Android flat WiFi: filled pie-slice arcs ── */
  const ICSWifi = () => (
    <svg width="15" height="12" viewBox="0 0 20 16">
      {/* large outer arc */}
      <path d="M0.5 6.5 Q10 -1.5 19.5 6.5 L17 9 Q10 3.5 3 9 Z" fill="#fff" opacity="1"/>
      {/* mid arc */}
      <path d="M4 10 Q10 5.5 16 10 L13.5 12.5 Q10 9 6.5 12.5 Z" fill="#fff"/>
      {/* inner arc */}
      <path d="M7 13 Q10 10.5 13 13 L11.2 14.8 Q10 13.5 8.8 14.8 Z" fill="#fff"/>
      {/* dot */}
      <circle cx="10" cy="16" r="1.8" fill="#fff"/>
    </svg>
  );

  /* ── Android flat signal: 4 staircase bars filled ── */
  const ICSSignal = () => (
    <svg width="14" height="12" viewBox="0 0 16 13">
      <rect x="0"  y="10" width="3.2" height="3"  fill="rgba(255,255,255,0.3)"/>
      <rect x="4.3" y="7"  width="3.2" height="6"  fill="#fff"/>
      <rect x="8.5" y="4"  width="3.2" height="9"  fill="#fff"/>
      <rect x="12.8" y="1" width="3.2" height="12" fill="#fff"/>
    </svg>
  );

  /* ── Android flat battery: outline + ~65% fill, no charging bolt ── */
  const ICSBattery = () => (
    <svg width="12" height="13" viewBox="0 0 13 15">
      <rect x="4.5" y="0" width="4" height="2" rx="0.8" fill="#fff"/>
      <rect x="0.7" y="2" width="11.6" height="13" rx="1.8" fill="none" stroke="#fff" strokeWidth="1.3"/>
      <rect x="2" y="3.3" width="9" height="10.4" rx="1" fill="#fff"/>
    </svg>
  );

  return (
    <div style={{background:bg,height,display:"flex",alignItems:"center",justifyContent:"space-between",padding:`0 ${paddingH}px`,flexShrink:0}}>
      {/* left: notification icons */}
      <div style={{display:"flex",alignItems:"center",gap:3}}>
        {notifApps.slice(0,5).map((k,ki)=>
          <AndroidNotifIcon key={ki} app={k}/>
        )}
      </div>
      {/* right: wifi · signal · battery · time — JB style */}
      <div style={{display:"flex",alignItems:"center",gap:5}}>
        <ICSWifi/>
        <ICSSignal/>
        <ICSBattery/>
        {showTime&&<span style={{color:timeColor,fontSize:timeFontSize,fontWeight:timeWeight,letterSpacing:0.3,marginLeft:1}}>{clock.full24}</span>}
      </div>
    </div>
  );
});

// Shared iOS lock screen content — used by both real phone and mini preview
const IOSLockContent = memo(({bgStyle={}, devOverrides={}, scale=1, onUnlock=null, notifications=[], carrier=""}) => {
  const lsOv = devOverrides?.lockScreen || {};
  const showLinen = (lsOv.showLinen ?? "yes") === "yes";
  const mini = scale < 1;
  const loreDateStr = useContext(LoreDateCtx);
  return (
    <div style={{width:"100%",height:"100%",position:"relative",overflow:"hidden",display:"flex",flexDirection:"column",...bgStyle}}>
      {showLinen && !mini && <div style={{position:"absolute",inset:0,
        backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.015) 2px,rgba(255,255,255,0.015) 4px)",
        pointerEvents:"none",zIndex:1}}/>}
      
      {mini ? (
        <div style={{height:9,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 4px",flexShrink:0,position:"relative",zIndex:2}}>
          <div style={{display:"flex",alignItems:"center",gap:1,transform:"scale(0.42)",transformOrigin:"left center"}}><SignalIcon/><WifiIcon/></div>
          <div style={{transform:"scale(0.42)",transformOrigin:"right center"}}><BatteryIcon/></div>
        </div>
      ) : (
        <IOSStatusBar dark mode="lock" carrier={carrier}/>
      )}
      
      <div style={{...(mini?{position:"absolute",top:9,left:0,right:0}:{flexShrink:0}),zIndex:1,
        background:"linear-gradient(180deg,rgba(0,0,0,0.5) 0%,rgba(0,0,0,0.5) 49.9%,rgba(0,0,0,0.6) 50%,rgba(0,0,0,0.6) 100%)",
        padding:mini?"4px 0 4px":"8px 0 10px",
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",gap:mini?2:4}}>
        <IOSLockClock timeOnly clockScale={mini?0.28:1}/>
        <IOSLockClock dateOnly clockScale={mini?0.28:1}/>
      </div>
      
      {!mini && (
        <div style={{flex:1,minHeight:0,zIndex:1,display:"flex",flexDirection:"column",overflowY:"auto",WebkitOverflowScrolling:"touch",touchAction:"pan-y"}}>
          {notifications.map((n,ni)=>(
            <div key={ni} style={{background:"rgba(28,28,34,0.5)",borderBottom:"1px solid rgba(255,255,255,0.12)",borderTop:ni===0?"1px solid rgba(255,255,255,0.12)":"none",padding:"10px 9px",flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
                <div style={{width:20,height:20,borderRadius:4,flexShrink:0,overflow:"hidden",background:n.iconSrc?"transparent":`linear-gradient(180deg,rgba(255,255,255,0.25),${n.color||"#8e8e93"})`,boxShadow:"inset 0 1px 0 rgba(255,255,255,0.4),0 1px 1px rgba(0,0,0,0.3)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {n.iconSrc
                    ? <img src={n.iconSrc} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    : <span style={{fontSize:12,lineHeight:1}}>{n.emoji||"💬"}</span>}
                </div>
                <span style={{color:"#fff",fontSize:12,fontWeight:700,fontFamily:FF_IOS,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textShadow:"0 1px 1px rgba(0,0,0,0.4)"}}>{n.title}</span>
                {n.time&&<span style={{color:"rgba(255,255,255,0.65)",fontSize:10,flexShrink:0,fontFamily:FF_IOS}}>{loreRelativeLabel(n.time,loreDateStr)}</span>}
              </div>
              <div style={{color:"rgba(255,255,255,0.9)",fontSize:12,lineHeight:1.35,fontFamily:FF_IOS,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{n.text}</div>
            </div>
          ))}
        </div>
      )}
      
      <div style={{...(mini?{position:"absolute",bottom:0,left:0,right:0}:{flexShrink:0}),zIndex:2}}>
        {mini ? (
          <div style={{background:"linear-gradient(180deg,rgba(0,0,0,0.6) 0%,rgba(0,0,0,1) 100%)",padding:"12px 4px 6px"}}>
            <div style={{height:18,borderRadius:7,background:"linear-gradient(180deg,#111,#2a2a2a)",border:"1px solid rgba(255,255,255,0.18)",display:"flex",alignItems:"center",overflow:"hidden"}}>
              <div style={{width:16,height:13,borderRadius:5,background:"linear-gradient(180deg,#f5f5f5,#d8d8d8)",margin:"0 2px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <svg width="6" height="5" viewBox="0 0 18 16" fill="none"><path d="M1 8H14M9 2L15 8L9 14" stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div style={{flex:1,color:"rgba(200,200,200,0.9)",fontSize:6,textAlign:"center",whiteSpace:"nowrap",letterSpacing:0.5,fontFamily:FF_IOS,fontWeight:300}}>slide to unlock</div>
              <svg width="9" height="7" viewBox="0 0 22 18" fill="none" style={{marginRight:3,opacity:0.5}}>
                <rect x="1" y="4" width="20" height="13" rx="2.5" stroke="white" strokeWidth="1.5"/>
                <circle cx="11" cy="10.5" r="4" stroke="white" strokeWidth="1.5"/>
              </svg>
            </div>
          </div>
        ) : (
          <div style={{background:"linear-gradient(180deg,rgba(0,0,0,0.6) 0%,rgba(0,0,0,1) 100%)"}}>
            <SlideToUnlock onUnlock={onUnlock||(() => {})}/>
          </div>
        )}
      </div>
    </div>
  );
});

// Lock screen clocks — also isolated
const IOSLockClock = memo(({timeOnly=false, dateOnly=false, clockScale=1}) => {
  const clock = useClock();
  const ov = useContext(DevCtx).lockScreen || {};
  const size   = (ov.clockSize         ?? 76) * clockScale;
  const weight = ov.clockWeight       ?? "200";
  const color  = ov.clockColor        ?? "#ffffff";
  const ls     = (ov.clockLetterSpacing?? -4) * clockScale;
  const shadow = ov.clockShadow       ?? "0 1px 4px rgba(0,0,0,0.4)";
  const dSize  = (ov.dateSize          ?? 14) * clockScale;
  const dWeight= ov.dateWeight        ?? "400";
  const dColor = ov.dateColor         ?? "rgba(255,255,255,0.95)";
  const dLS    = ov.dateLetterSpacing ?? 0;
  if(timeOnly) return (
    <div style={{color,fontSize:size,fontWeight:weight,letterSpacing:ls,textShadow:shadow,fontFamily:FF_IOS,lineHeight:1,width:"100%",textAlign:"center"}}>{clock.full24}</div>
  );
  if(dateOnly) return (
    <div style={{color:dColor,fontSize:dSize,fontWeight:dWeight,letterSpacing:dLS,textShadow:"0 1px 2px rgba(0,0,0,0.4)",fontFamily:FF_IOS,width:"100%",textAlign:"center"}}>{clock.day}, {clock.month} {clock.dateOrd}</div>
  );
  return <>
    <div style={{color,fontSize:size,fontWeight:weight,letterSpacing:ls,textShadow:shadow,fontFamily:FF_IOS,lineHeight:1,width:"100%",textAlign:"center"}}>{clock.full24}</div>
    <div style={{color:dColor,fontSize:dSize,fontWeight:dWeight,letterSpacing:dLS,textShadow:"0 1px 2px rgba(0,0,0,0.4)",fontFamily:FF_IOS,marginTop:6,width:"100%",textAlign:"center"}}>{clock.day}, {clock.month} {clock.dateOrd}</div>
  </>;
});

const AndroidLockClock = memo(() => {
  const clock = useClock();
  const ov = useContext(DevCtx).andLockScreen || {};
  const clockColor  = ov.clockColor  ?? "#fff";
  const clockSize   = ov.clockSize   ?? 72;
  const clockWeight = ov.clockWeight ?? "300";
  const clockLS     = ov.clockLetterSpacing ?? -3;
  const clockShadow = ov.clockShadow ?? "0 1px 8px rgba(0,0,0,0.6)";
  const dateColor   = ov.dateColor   ?? "rgba(255,255,255,0.85)";
  const dateSize    = ov.dateSize    ?? 14;
  return (
    <div style={{paddingLeft:16}}>
      <div style={{color:clockColor,fontSize:clockSize,fontWeight:clockWeight,letterSpacing:clockLS,textShadow:clockShadow,lineHeight:1,fontFamily:FF_IOS}}>{clock.full24}</div>
      <div style={{color:dateColor,fontSize:dateSize,fontWeight:"400",marginTop:4,fontFamily:FF_IOS,textShadow:"0 1px 4px rgba(0,0,0,0.5)"}}>{clock.day}, {clock.month} {clock.dateOrd}</div>
    </div>
  );
});

export {
  SlideToUnlock, useClock, IOSStatusBar, AndroidStatusBar,
  IOSLockContent, IOSLockClock, AndroidLockClock,
};
