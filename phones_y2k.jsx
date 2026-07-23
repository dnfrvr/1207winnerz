// IT: Welcome to UMA — Phone Simulator — build 20250520
import React, { useState, useRef, useEffect, memo, useContext } from "react";
import { ref, onValue, update, set } from "firebase/database";
import { firebaseDb } from "./src/lib/firebase.js";
import { supabaseClient, UploadReader, dataUriToBlob, uploadBlobToSupabase, findBase64Images } from "./src/lib/storage.js";
import { shallowDiffPatch, deepDiffPatch, setDeepPath } from "./src/lib/deep.js";
import { CHAR_NAMES, GROUP_THREAD_ID, GROUP_SEED, mkData } from "./src/data/characters.js";
import { FORCED_ACCENTS, FORCED_PLAYLISTS, SEED_VERSION, SEED_SHARED_TWEETS, SEED_HOME_BASE_TWEETS, TUMBLR_PERSO_USERNAMES, SEED_SHARED_TUMBLR_POSTS, SEED_FEED_TUMBLR, FB_PERSO_NAMES, FB_NAME_TO_AUTHOR, NOTIF_SEED, CHARACTERS, LORE_MONTHS, TUMBLR_FEED_POSTS_DEFAULT, TWITTER_HOME_BASE, TWITTER_PROFILE_TWEETS } from "./src/data/seeds.js";
import { DevCtx, FF_IOS, I4_SRC } from "./src/shared/constants.js";
import { APP_META } from "./src/shared/app-meta.js";
import { LORE_DATE_DEFAULT, getLoreDate, parseLoreTime, formatMsgTime, loreSortKey, sortGalleryPhotos, GALLERY_MONTHS_FR, groupGalleryByMonth, groupGalleryByYear, sortCallsByDate, FULL_MONTHS_EN, loreDayKey, loreDateLabel, loreRelativeLabel, loreDateOnly, LoreDateCtx, useLoreRelative } from "./src/shared/lore-date.js";
import { AndroidNotifIcon, BatteryIcon, BatteryIconVertical, SignalIcon, WifiIcon } from "./src/shared/icons.jsx";
import { SlideToUnlock, useClock, IOSStatusBar, AndroidStatusBar, IOSLockContent, IOSLockClock, AndroidLockClock } from "./src/shared/phone-chrome.jsx";
import { getCharKey, getSharedAvatars, makeSharedFollows } from "./src/shared/social-feed.js";
import { AppSkeleton, IOS6Toggle } from "./src/shared/ui-kit.jsx";
import { NikeplusScreen } from "./src/screens/NikeplusScreen.jsx";
import { ContactsScreen } from "./src/screens/ContactsScreen.jsx";
import { PinterestScreen, PIN_DEFAULTS } from "./src/screens/PinterestScreen.jsx";
import { GroupMeScreen, GROUPME_DEFAULTS } from "./src/screens/GroupMeScreen.jsx";
import { StarbucksScreen } from "./src/screens/StarbucksScreen.jsx";
import { SettingsScreen } from "./src/screens/SettingsScreen.jsx";
import { WeatherScreen, WeatherCityCard, WEATHER_DEFAULTS } from "./src/screens/WeatherScreen.jsx";
import { SoundCloudScreen } from "./src/screens/SoundCloudScreen.jsx";
import { WikipediaScreen, WIKI_FEEDS } from "./src/screens/WikipediaScreen.jsx";
import { KindleScreen, KINDLE_DEFAULT_BOOKS } from "./src/screens/KindleScreen.jsx";
import { INaturalistScreen } from "./src/screens/INaturalistScreen.jsx";
import { CalendarScreen, CALENDAR_SEED } from "./src/screens/CalendarScreen.jsx";
import { ClockScreen } from "./src/screens/ClockScreen.jsx";
import { MapsScreen } from "./src/screens/MapsScreen.jsx";
import { YouTubeScreen, YOUTUBE_FEEDS_DEFAULT } from "./src/screens/YouTubeScreen.jsx";
import { RedditScreen, REDDIT_ALL_POSTS } from "./src/screens/RedditScreen.jsx";
import { VPNScreen } from "./src/screens/VPNScreen.jsx";
import { SnapchatScreen, SNAPCHAT_DEFAULTS } from "./src/screens/SnapchatScreen.jsx";
import { GrindrScreen } from "./src/screens/GrindrScreen.jsx";
import { BrowserScreen } from "./src/screens/BrowserScreen.jsx";
import { TumblrScreen } from "./src/screens/TumblrScreen.jsx";
import { TwitterScreen } from "./src/screens/TwitterScreen.jsx";
import { FacebookScreen, FACEBOOK_PROFILES_DEFAULT, FACEBOOK_FRIENDS_FEED_DEFAULT, FACEBOOK_PAGES_DEFAULT } from "./src/screens/FacebookScreen.jsx";
import { GmailScreen, EMAILS_BY_CHAR, MAIL_DRAFTS_BY_CHAR, MAIL_DELETED_BY_CHAR } from "./src/screens/GmailScreen.jsx";
import { InstaScreen, IgCommentEditor } from "./src/screens/InstaScreen.jsx";
import { MusicScreen } from "./src/screens/MusicScreen.jsx";
import { NotesScreen } from "./src/screens/NotesScreen.jsx";
import { FilesScreen, fileTypeMeta } from "./src/screens/FilesScreen.jsx";
import { PhoneScreen } from "./src/screens/PhoneScreen.jsx";
import { AdminBackoffice } from "./src/admin/AdminBackoffice.jsx";


// Thread timestamp — uses current time once on mount, doesn't re-render




// ─── SHARED APP SCREENS ───────────────────────────────────────────────────────

// ─── PHOTO MODAL ──────────────────────────────────────────────────────────────
// ─── DRAG-AND-DROP HOMESCREEN ─────────────────────────────────────────────────
// Hold-to-jiggle, then drag between grid slots and dock
// Dock iOS — reads devOverrides from context
const DockIOS = ({dockApps, AppItem, appNames={}, data={}}) => {
  const ov      = useContext(DevCtx).dock || {};
  const hiOv    = useContext(DevCtx).homeIcon || {};
  const iconW   = hiOv.size ?? 54;
  return (
    <div style={{flexShrink:0,position:"relative",zIndex:2,paddingBottom:8}}>
      
      <svg width="100%" height="40" viewBox="0 0 320 40" preserveAspectRatio="none"
        style={{position:"absolute",bottom:0,left:0,right:0,zIndex:0,pointerEvents:"none"}}
        xmlns="http://www.w3.org/2000/svg">
        <path d="M20,0 L300,0 L320,40 L0,40 Z" fill="rgba(255,255,255,0.4)"/>
      </svg>
      
      <div style={{position:"absolute",top:"calc(100% + 30px)",left:0,right:0,display:"grid",gridTemplateColumns:`repeat(4,${iconW}px)`,justifyContent:"space-evenly",transform:"scaleY(-1)",transformOrigin:"top center",opacity:0.35,pointerEvents:"none",zIndex:0}}>
        {dockApps.slice(0,4).map(id=>{
          const custom = data?.appIcons?.[id];
          const meta   = APP_META[id]||{};
          return (
            <div key={id} style={{display:"flex",justifyContent:"center",alignItems:"center"}}>
              <div style={{width:iconW,height:iconW,borderRadius:iconW*0.225,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>
                {custom ? <img src={custom} style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <span>{meta.iosIcon||"📱"}</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{position:"relative",zIndex:1,padding:"10px 0 4px",display:"grid",gridTemplateColumns:`repeat(4,${iconW}px)`,justifyContent:"space-evenly"}}>
        {dockApps.slice(0,4).map(id=>{
          const meta    = APP_META[id]||{label:id};
          const appName = appNames?.[id] ?? meta.label;
          return (
            <div key={id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <AppItem id={id} source="dock"/>
              <span style={{color:"#fff",fontSize:10,textShadow:"0 1px 3px rgba(0,0,0,0.8)",textAlign:"center",lineHeight:1,whiteSpace:"nowrap"}}>{appName}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const DraggableHomescreen = ({data, update, appIcon, badge, goApp, os, accent, admin=false, charKey="", noWallpaper=false}) => {
  const [jiggle, setJiggle] = useState(false);
  const [dragging, setDragging] = useState(null); // {id, source:'grid'|'dock'}
  const [dragOver, setDragOver] = useState(null); // {id, source}
  const holdTimer = useRef(null);

  const mainApps = data.apps.filter(id => !(data.dock||[]).includes(id));
  const dockApps = data.dock || data.apps.slice(0,4);

  const startHold = () => { holdTimer.current = setTimeout(()=>setJiggle(true), 600); };
  const cancelHold = () => { clearTimeout(holdTimer.current); };

  const handleDrop = (targetId, targetSource) => {
    if(!dragging) return;
    const {id: srcId, source: srcSource} = dragging;
    if(srcId===targetId && srcSource===targetSource) { setDragging(null); setDragOver(null); return; }

    let newApps=[...mainApps], newDock=[...dockApps];

    if(srcSource==="grid" && targetSource==="grid"){
      const si=newApps.indexOf(srcId), ti=newApps.indexOf(targetId);
      if(si!==-1&&ti!==-1)[newApps[si],newApps[ti]]=[newApps[ti],newApps[si]];
    } else if(srcSource==="dock" && targetSource==="dock"){
      const si=newDock.indexOf(srcId), ti=newDock.indexOf(targetId);
      if(si!==-1&&ti!==-1)[newDock[si],newDock[ti]]=[newDock[ti],newDock[si]];
    } else if(srcSource==="grid" && targetSource==="dock"){
      // swap: grid->dock, dock->grid
      const gi=newApps.indexOf(srcId), di=newDock.indexOf(targetId);
      if(gi!==-1&&di!==-1){newApps[gi]=targetId; newDock[di]=srcId;}
    } else if(srcSource==="dock" && targetSource==="grid"){
      const di=newDock.indexOf(srcId), gi=newApps.indexOf(targetId);
      if(di!==-1&&gi!==-1){newDock[di]=targetId; newApps[gi]=srcId;}
    }
    update("apps",newApps);
    update("dock",newDock);
    setDragging(null); setDragOver(null);
  };

  const iconStyle = (id,source) => {
    const isDragging = dragging?.id===id && dragging?.source===source;
    const isOver = dragOver?.id===id && dragOver?.source===source;
    return {
      opacity: isDragging?0.4:1,
      outline: isOver?`2px solid ${os==="ios"?"#fff":accent}`:undefined,
      outlineOffset:2, borderRadius: os==="ios"?12:4,
      animation: jiggle&&!isDragging?"jiggle 0.4s infinite":"none",
    };
  };

  const gridCols = os==="ios" ? "repeat(4,1fr)" : "repeat(4,1fr)";
  const hiOv = useContext(DevCtx).homeIcons || {};
  const iconW       = os==="ios" ? (hiOv.size??54)         : 40;
  const iconRadius  = os==="ios" ? (hiOv.borderRadius??12) : 4;
  const iconLblSize = os==="ios" ? (hiOv.labelSize??10)    : 10;
  const iconColGap  = os==="ios" ? (hiOv.colGap??8)        : 8;
  const iconRowGap  = os==="ios" ? (hiOv.rowGap??16)       : 18;
  const iconShine   = os==="ios" ? (hiOv.shine??"yes")==="yes" : false;
  const wallpaper = data.wallpaper;
  const isBgImg = wallpaper?.startsWith("data:") || wallpaper?.startsWith("http") || wallpaper?.startsWith("/");
  const bgStyle = isBgImg?{backgroundImage:`url(${wallpaper})`,backgroundSize:"cover",backgroundPosition:"center"}:{background:wallpaper};

  const AppItem = ({id, source}) => {
    const meta = APP_META[id]||{label:id};
    return (
      <div
        style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,cursor:jiggle?"grab":"pointer",position:"relative",userSelect:"none",...iconStyle(id,source)}}
        onMouseDown={e=>{if(jiggle){setDragging({id,source});e.preventDefault();}else startHold();}}
        onMouseUp={cancelHold}
        onMouseEnter={()=>jiggle&&dragging&&setDragOver({id,source})}
        onMouseLeave={()=>setDragOver(null)}
        onMouseUpCapture={()=>jiggle&&dragging&&handleDrop(id,source)}
        onClick={()=>{if(!jiggle)goApp(id);}}>
        
        <div style={{position:"relative",display:"inline-flex"}}>
          {os==="ios"
            ?<div style={{width:iconW,height:iconW,borderRadius:iconRadius,overflow:"hidden",position:"relative",boxShadow:"0 2px 6px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.25)"}}>
              {iconShine&&<div style={{position:"absolute",top:0,left:0,right:0,height:"50%",background:"linear-gradient(180deg,rgba(255,255,255,0.35),rgba(255,255,255,0.05))",zIndex:3,borderRadius:`${iconRadius}px ${iconRadius}px 0 0`,pointerEvents:"none"}}/>}
              <div style={{width:"100%",height:"100%",background:"linear-gradient(145deg,rgba(255,255,255,0.15),rgba(0,0,0,0.1))",display:"flex",alignItems:"center",justifyContent:"center"}}>{appIcon(id)}</div>
            </div>
            :<div style={{width:iconW,height:iconW,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}>
              {appIcon(id)}
            </div>}
          {badge(id)}
        </div>
        {jiggle&&<div style={{position:"absolute",top:-4,left:-2,width:16,height:16,background:"rgba(0,0,0,0.6)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,cursor:"pointer",zIndex:4}} onClick={e=>{e.stopPropagation();update("apps",mainApps.filter(a=>a!==id));if(dockApps.includes(id))update("dock",dockApps.filter(a=>a!==id));}}>✕</div>}
        {source!=="dock"&&<span style={{color:"#fff",fontSize:iconLblSize,textShadow:"0 1px 3px rgba(0,0,0,0.8)",textAlign:"center",lineHeight:1.1}}>{data.appNames?.[id] || (os==="ios" ? meta.label : (meta.droidLabel||meta.label))}</span>}
      </div>
    );
  };

  const ROWS_PER_PAGE = os === "ios" ? 3 : 3; // android also 3 rows to avoid clipping
  const COLS = 4;
  const perPage = ROWS_PER_PAGE * COLS;
  const [page, setPage] = useState(0);

  const ELIAS_P1 = 12; // 3 lignes × 4 cols — égal à perPage pour Elias
  const getPageApps = (pi) => {
    if(charKey==="elias" && os==="android") {
      if(pi===0) return mainApps.slice(0, ELIAS_P1);
      if(pi===1) return []; // widget only
      return mainApps.slice(ELIAS_P1 + (pi-2)*perPage, ELIAS_P1 + (pi-1)*perPage);
    }
    if(charKey==="drew" && os==="android") {
      const drewP1 = 12; // 3 lignes × 4 cols (page 1)
      const drewP2 = 8;  // 2 lignes × 4 cols (page 2, bloc-notes prend de la place)
      if(pi===0) return mainApps.slice(0, drewP1);
      if(pi===1) return mainApps.slice(drewP1, drewP1 + drewP2);
      return mainApps.slice(drewP1 + drewP2 + (pi-2)*perPage, drewP1 + drewP2 + (pi-1)*perPage);
    }
    return mainApps.slice(pi * perPage, (pi+1) * perPage);
  };
  const totalPages = charKey==="elias" && os==="android"
    ? 2 + Math.ceil(Math.max(0, mainApps.length - ELIAS_P1) / perPage)
    : charKey==="drew" && os==="android"
      ? 2 + Math.ceil(Math.max(0, mainApps.length - 12 - 8) / perPage)
      : Math.ceil(mainApps.length / perPage);
  const pageApps = getPageApps(page);

  const swipeStart = useRef(null);
  const swipeRef = useRef(null);

  const onPointerDown = e => {
    if(jiggle) return;
    swipeStart.current = {x: e.clientX, page};
  };
  const onPointerMove = e => {
    if(!swipeStart.current || jiggle) return;
  };
  const onPointerUp = e => {
    if(!swipeStart.current || jiggle) { swipeStart.current = null; return; }
    const dx = e.clientX - swipeStart.current.x;
    const threshold = 40;
    if(dx < -threshold && page < totalPages - 1) setPage(p => p + 1);
    else if(dx > threshold && page > 0) setPage(p => p - 1);
    swipeStart.current = null;
  };

  return (
    <>
      <style>{`@keyframes jiggle{0%,100%{transform:rotate(-1.5deg)}50%{transform:rotate(1.5deg)}}`}</style>
      <div style={{flex:1,...(noWallpaper?{}:bgStyle),display:"flex",flexDirection:"column",position:"relative",minHeight:0,overflow:"hidden"}}
        onClick={()=>{if(jiggle){setJiggle(false);setDragging(null);}}}
        onMouseUp={()=>{setDragging(null);setDragOver(null);}}>
        {os==="ios"&&<div style={{position:"absolute",inset:0,backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 1px,rgba(255,255,255,0.025) 1px,rgba(255,255,255,0.025) 2px),repeating-linear-gradient(90deg,transparent,transparent 2px,rgba(255,255,255,0.015) 2px,rgba(255,255,255,0.015) 4px)",pointerEvents:"none",zIndex:1}}/>}
        {jiggle&&<div style={{position:"absolute",top:8,left:0,right:0,textAlign:"center",color:"rgba(255,255,255,0.7)",fontSize:11,zIndex:10,pointerEvents:"none"}}>✕ pour supprimer · clic pour terminer</div>}

        
        <div
          ref={swipeRef}
          style={{flex:1,overflow:"hidden",position:"relative",zIndex:2,touchAction:"pan-y"}}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          
          <div style={{
            display:"flex",
            width:`${totalPages * 100}%`,
            height:"100%",
            transform:`translateX(${-page * (100 / totalPages)}%)`,
            transition: swipeStart.current ? "none" : "transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94)",
          }}>
            {Array.from({length:totalPages}).map((_,pi)=>{
              const pg = getPageApps(pi);
              return (
                <div key={pi} style={{width:`${100/totalPages}%`,height:"100%",flexShrink:0,display:"flex",flexDirection:"column",justifyContent:"flex-start",padding:`${hiOv.gridPaddingTop??10}px 0 4px`}}>
                  
                  {os==="android"&&pi===1&&charKey==="drew"&&(()=>{
                    const noteText = data.notepadWidget ?? "je viens de derry";
                    return (
                      <div style={{margin:"0 6px 12px",background:"rgba(255,255,240,0.92)",borderRadius:2,overflow:"hidden",flexShrink:0,boxShadow:"0 2px 6px rgba(0,0,0,0.4)"}}>
                        
                        <div style={{height:14,background:"#e8e0c8",display:"flex",alignItems:"center",padding:"0 10px",gap:8,borderBottom:"1px solid rgba(0,0,0,0.1)"}}>
                          {[0,1,2,3,4,5].map(i=>(
                            <div key={i} style={{width:10,height:10,borderRadius:"50%",border:"2px solid #888",background:"#c8b89a"}}/>
                          ))}
                        </div>
                        
                        <div style={{position:"relative",padding:"6px 10px 8px 36px",minHeight:60}}>
                          
                          <div style={{position:"absolute",left:28,top:0,bottom:0,width:1,background:"rgba(200,0,0,0.3)"}}/>
                          
                          {[0,1,2,3].map(i=>(
                            <div key={i} style={{position:"absolute",left:0,right:0,top:22+i*18,height:1,background:"rgba(0,100,200,0.15)"}}/>
                          ))}
                          {admin
                            ? <textarea value={noteText} onChange={e=>update("notepadWidget",e.target.value)}
                                style={{width:"100%",background:"transparent",border:"none",outline:"none",resize:"none",
                                  fontFamily:FF_IOS,fontSize:13,color:"#222",lineHeight:"18px",
                                  minHeight:72,padding:0}}/>
                            : <div style={{fontFamily:FF_IOS,fontSize:13,color:"#222",lineHeight:"18px",whiteSpace:"pre-wrap"}}>{noteText}</div>
                          }
                        </div>
                      </div>
                    );
                  })()}

                  
                  {os==="android"&&pi===0&&<div style={{margin:"0 8px 12px",background:"rgba(255,255,255,0.4)",borderRadius:4,padding:"7px 12px",display:"flex",alignItems:"center",flexShrink:0}}>
                    <span style={{color:"#fff",fontFamily:"serif",fontSize:15,fontWeight:700,flex:1,letterSpacing:0.5}}>Google</span>
                    <svg width="16" height="26" viewBox="0 0 100.54 164.4" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fill="white" d="M74.86,81.2c.02,13.96-11.44,24.18-24.24,24.38-13.09.2-24.92-10.24-24.91-24.06l.03-57.74C25.74,10.3,37.28.17,49.91,0c12.97-.17,24.87,10.04,24.89,23.77l.06,57.43Z"/>
                      <path fill="white" d="M58.69,130.71l-.16,17.17,24.9.04v16.48s-66.32,0-66.32,0v-16.47s24.85-.05,24.85-.05l-.07-17.14C18.97,129.1.23,110.69.11,87.54l-.11-22.62,16.68.02.02,21.07c.02,15.8,12.55,28.13,28.3,28.13h10.59c15.02,0,28.04-11.52,28.14-26.8l.15-22.4,16.63-.03.03,22.64c-1.01,22.81-18.34,41.41-41.84,43.16Z"/>
                    </svg>
                  </div>}
                  
                  {os==="android"&&pi===1&&charKey==="elias"&&(()=>{
                    const defaultItems = [
                      {icon:"👽", title:"ZONE 51 : des témoins parlent", src:"TruthSeekers.net", time:"il y a 2:00am"},
                      {icon:"🔺", title:"Les Illuminati et le Nouvel Ordre Mondial : preuves 2012", src:"WakeUpAmerica.org", time:"il y a 5:00am"},
                      {icon:"🛸", title:"NASA cache des signaux extraterrestres — documents déclassifiés", src:"AlienTruth.com", time:"il y a 8:00am"},
                      {icon:"💉", title:"Chemtrails : analyse chimique indépendante", src:"FreeMinds.net", time:"il y a 1j"},
                      {icon:"📡", title:"HAARP et le contrôle météorologique — ce qu'ils ne veulent pas que vous sachiez", src:"DeepState.info", time:"il y a 1j"},
                    ];
                    const items = data.conspiracyFeed || defaultItems;
                    const headerTitle = data.conspiracyFeedTitle || "TRUTH FEED";
                    return (
                      <div style={{margin:"0 6px 10px",background:"rgba(0,0,0,0.55)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:2,overflow:"hidden",flexShrink:0}}>
                        
                        <div style={{background:"rgba(180,0,0,0.8)",padding:"5px 10px",display:"flex",alignItems:"center",gap:6}}>
                          <span style={{fontSize:10}}>📡</span>
                          <span style={{color:"#fff",fontSize:10,fontWeight:700,letterSpacing:0.5,flex:1}}>{headerTitle}</span>
                          <span style={{color:"rgba(255,255,255,0.5)",fontSize:8}}>Live</span>
                          <div style={{width:6,height:6,borderRadius:"50%",background:"#f00"}}/>
                        </div>
                        
                        {items.map((item,i)=>(
                          <div key={i} style={{padding:"6px 10px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",gap:8,alignItems:"flex-start"}}>
                            <span style={{fontSize:14,flexShrink:0,marginTop:1}}>{item.icon}</span>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{color:"#e8e8e8",fontSize:10,fontWeight:500,lineHeight:1.3,fontFamily:FF_IOS}}>{item.title}</div>
                              <div style={{color:"rgba(255,255,255,0.35)",fontSize:8,marginTop:2,fontFamily:FF_IOS}}>{item.src} · {item.time}</div>
                            </div>
                          </div>
                        ))}
                        <div style={{padding:"4px 10px",background:"rgba(255,255,255,0.04)",display:"flex",justifyContent:"flex-end"}}>
                          <span style={{color:"rgba(255,255,255,0.3)",fontSize:8}}>Voir plus →</span>
                        </div>
                      </div>
                    );
                  })()}
                  <div style={{
                    display:"grid",
                    gridTemplateColumns:`repeat(4,${iconW}px)`,
                    rowGap: os==="ios" ? iconRowGap : 22,
                    columnGap: os==="android" ? 0 : undefined,
                    justifyContent:"space-evenly",
                    alignItems: os==="android" ? "start" : undefined,
                  }}>
                    {pg.map(id=><AppItem key={id} id={id} source="grid"/>)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        
        {totalPages > 1 && (
          <div style={{display:"flex",justifyContent:"center",gap:6,paddingBottom:6,zIndex:2}}>
            {Array.from({length:totalPages}).map((_,i)=>(
              <div key={i} onClick={()=>setPage(i)} style={{width:6,height:6,borderRadius:"50%",background:i===page?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.35)",cursor:"pointer",transition:"background 0.2s"}}/>
            ))}
          </div>
        )}

        
        {os==="ios"
          ?<DockIOS dockApps={dockApps} AppItem={AppItem} appNames={data.appNames||{}} data={data}/>
          :<div style={{borderTop:"1px solid rgba(255,255,255,0.25)",padding:"8px 0 6px",display:"flex",flexDirection:"column",alignItems:"stretch",flexShrink:0}}>
            
            <div style={{display:"flex",justifyContent:"space-around",alignItems:"center"}}>
              {[dockApps[0],dockApps[1],"__home__",dockApps[2],dockApps[3]].map((id,i)=>
                id==="__home__"
                  ? <div key="home" style={{width:46,height:46,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.7)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(3,6px)",gridTemplateRows:"repeat(2,6px)",gap:3}}>
                        {Array.from({length:6}).map((_,j)=>(
                          <div key={j} style={{width:6,height:6,borderRadius:1,background:"rgba(255,255,255,0.85)"}}/>
                        ))}
                      </div>
                    </div>
                  : id ? <AppItem key={id+i} id={id} source="dock"/> : <div key={i} style={{width:46,height:46}}/>
              )}
            </div>
          </div>}
      </div>
    </>
  );
};

// ─── iOS 6 PHONE v3 ──────────────────────────────────────────────────────────────
// ── Badge counts from screen data ──────────────────────────────────────────
const SNAP_BADGE_COUNTS = {
  glindatheverygood: 7,
  eoghan_masuda:     5,
  dreww_orms:        2,
  noteliasgreen:     2,
};
const GMAIL_BADGE_COUNTS = {
  glindatheverygood: 3,
  eoghan_masuda:     3,
  dreww_orms:        3,
  noteliasgreen:     2,
};

const IOSPhone = ({data,admin,onUpdate,onUpdateShared=()=>{},loreDate:loreDateProp}) => {
  const devOv = data.devOverrides || {};
  const [screen,setScreen] = useState("lock");
  const [app,setApp] = useState(null);
  const [thread,setThread] = useState(null);
  const [msgView,setMsgView] = useState("inbox");
  const [browserTab,setBrowserTab] = useState("search");
  const [noteOpen,setNoteOpen] = useState(null);
  const [photoDetail,setPhotoDetail] = useState(null);
  const [galleryView,setGalleryView] = useState("albums");
  const [phonePanel,setPhonePanel] = useState("keypad");
  const [instaView, setInstaView] = useState("list");
  const [asleep, setAsleep] = useState(false);

  const wake = () => { setAsleep(false); };
  const sleep = () => { setAsleep(true); };

  const update = (key,val) => { onUpdate({...data,[key]:val}); };
  const updateMsg = msgs => onUpdate({...data,messages:msgs});
  // Resolve shared thread with correct perspective
  const getThread = (msg) => {
    if(!msg) return [];
    let thread;
    if(msg.isGroup) {
      if(!msg.sharedThreadId) thread = msg.thread||[];
      else {
        const raw = data.sharedThreads?.[msg.sharedThreadId] || [];
        thread = raw.map(m=>({...m, senderKey:m.from, senderName:CHAR_NAMES[m.from]||m.from, from: m.from===charKey ? 'me' : 'them'}));
      }
    } else if(msg.sharedThreadId) {
      const raw = data.sharedThreads?.[msg.sharedThreadId] || msg.thread || [];
      const myLetter = msg.perspective || 'a';
      thread = raw.map(m=>({...m, from: m.from===myLetter ? 'me' : 'them'}));
    } else {
      thread = msg.thread||[];
    }
    // Tri chronologique côté affichage téléphone — cohérent avec l'admin.
    return [...thread].sort((a,b)=>loreSortKey(a.time)-loreSortKey(b.time));
  };
  const saveThread = (msg, newThread) => {
    if(!msg) return;
    if(msg.isGroup) {
      if(!msg.sharedThreadId) { updateMsg(data.messages.map(m=>m.id===msg.id?{...m,thread:newThread}:m)); return; }
      const raw = newThread.map(m=>({from: m.from==='me' ? charKey : (m.senderKey||'glinda'), text:m.text, time:m.time}));
      onUpdateShared(msg.sharedThreadId, raw);
      return;
    }
    if(msg.sharedThreadId) {
      const myLetter = msg.perspective || 'a';
      const raw = newThread.map(m=>({...m, from: m.from==='me' ? myLetter : (myLetter==='a'?'b':'a')}));
      onUpdateShared(msg.sharedThreadId, raw);
    } else {
      updateMsg(data.messages.map(m=>m.id===msg.id?{...m,thread:newThread}:m));
    }
  };

  const accent = data.accentColor||"#337ab7";
  const charKey  = getCharKey(data);
  const loreDate = loreDateProp || getLoreDate();
  const fmtTime  = (t) => formatMsgTime(t, loreDate);

  const appIcon = id => {
    const custom=data.appIcons?.[id];
    const meta=APP_META[id]||{};
    if(custom) return <img src={custom} style={{width:"100%",height:"100%",objectFit:"cover"}}/>;
    return <span style={{fontSize:26}}>{meta.iosIcon||"📱"}</span>;
  };
  const [editingBadge, setEditingBadge] = useState(null);

  const autoBadges = (() => {
    const b = {}, notifs=data.notifications||[], msgs=data.messages||[], snaps=data.snaps||[], calls=data.calls||[], shared=data.sharedThreads?._sharedTweets||[];
    const um=msgs.filter(c=>c.unread).length; if(um) b.messages=um;
    const mc=calls.filter(c=>c.type==="missed").length; if(mc) b.phone=mc;
    const un=SNAP_BADGE_COUNTS[data.username]??snaps.filter(s=>!s.opened).length; if(un) b.snapchat=un;
    const ck=getCharKey(data);
    const nt=shared.filter(t=>t.author!==ck).length; if(nt) b.twitter=nt;
    const gmc=GMAIL_BADGE_COUNTS[data.username]; if(gmc) b.gmail=gmc;
    ["insta","reddit","soundcloud","facebook","groupme"].forEach(a=>{const c=notifs.filter(n=>n.app===a).length;if(c)b[a]=c;});
    return b;
  })();
  const badge = id => {
    const n = autoBadges[id] ?? data.badges?.[id];
    if(admin) return (
      <div
        onClick={e=>{e.stopPropagation();setEditingBadge(editingBadge===id?null:id);}}
        style={{position:"absolute",top:-4,right:-4,zIndex:3,cursor:"pointer"}}
      >
        {editingBadge===id
          ? <input
              autoFocus
              type="number" min={0} max={99}
              defaultValue={n||0}
              onBlur={e=>{
                const v=parseInt(e.target.value)||0;
                const b={...data.badges};
                if(v===0) delete b[id]; else b[id]=v;
                update("badges",b);
                setEditingBadge(null);
              }}
              onKeyDown={e=>{if(e.key==="Enter")e.target.blur();}}
              onClick={e=>e.stopPropagation()}
              style={{width:36,height:20,fontSize:11,textAlign:"center",background:"#ffc107",border:"none",borderRadius:4,fontWeight:700,padding:0}}
            />
          : n
            ? <div style={{background:"#ff3b30",borderRadius:10,minWidth:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:"700",color:"#fff",padding:"0 5px",fontFamily:FF_IOS,lineHeight:1,border:"1.5px solid rgba(255,255,255,0.6)"}}>{n}</div>
            : <div title="Badge auto" style={{width:14,height:14,borderRadius:"50%",border:"1.5px dashed #ffc107",background:"rgba(255,193,7,0.1)"}}/>
        }
      </div>
    );
    if(!n) return null;
    return <div style={{position:"absolute",top:-5,right:-5,background:"linear-gradient(180deg,#ff5c5c 0%,#e00000 100%)",borderRadius:"50%",minWidth:20,height:20,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",padding:"0 4px",outline:"2.5px solid #fff",zIndex:2}}>{n}</div>;
  };

  // ── Standard iOS 6 NavBar ──
  // ─── App header colors ────────────────────────────────────────────────────
  // Chaque app a son propre dégradé iOS 6 — couleur principale + foncée
  const APP_COLORS = {
    messages:   ["#5b91ce","#4076b8","#35649a"],
    photos:     ["#5b91ce","#4076b8","#35649a"],
    insta:      ["#4e85c5","#3a6ea8","#2d5a8c"],
    music:      ["#c0392b","#a93226","#922b21"],
    snapchat:   ["#e8c400","#c9a800","#a88e00"],
    safari:     ["#5b91ce","#4076b8","#35649a"],
    phone:      ["#4aab4a","#3d9140","#2e7a2e"],
    notes:      ["#6b4226","#5a3418","#3e2208"],
    tumblr:     ["#35465c","#2b3a4e","#1f2c3f"],
    pinterest:  ["#c8232c","#b01e25","#94191f"],
    youtube:    ["#1a1a1a","#0d0d0d","#000000"],
    maps:       ["#5b91ce","#4076b8","#35649a"],
    calendar:   ["#e04444","#cc3333","#b52929"],
    clock:      ["#1a1a1a","#111","#000"],
    gmail:      ["#c0392b","#a93226","#922b21"],
    facebook:   ["#3b5998","#2d4373","#1e2f54"],
    starbucks:  ["#00704a","#005c3b","#00472e"],
    groupme:    ["#00aff0","#0095cc","#007bab"],
    weather:    ["#4a90d9","#3478c0","#2460a7"],
    settings:   ["#8e8e93","#6d6d72","#555"],
    grindr:     ["#f5811f","#e06800","#c45800"],
    nikeplus:   ["#c0392b","#a93226","#922b21"],
    bugsnap:    ["#4aab4a","#3d9140","#2e7a2e"],
    wordpad:    ["#5b91ce","#4076b8","#35649a"],
    soundcloud: ["#f26f21","#d95c10","#bc4e08"],
    espn:       ["#c0392b","#a93226","#922b21"],
    shazam:     ["#0088ff","#006fd4","#0057aa"],
    wikipedia:  ["#5b91ce","#4076b8","#35649a"],
    kindle:     ["#1a1a1a","#111","#000"],
    inaturalist:["#74ac00","#5e8c00","#487000"],
    reddit:     ["#ff4500","#dd3c00","#bb3200"],
    twitter:    ["#1da1f2","#0d8dd4","#0077b6"],
    vpn:        ["#5b91ce","#4076b8","#35649a"],
    contacts:   ["#5b91ce","#4076b8","#35649a"],
    browser:    ["#5b91ce","#4076b8","#35649a"],
    gallery:    ["#1a1a1a","#111","#000"],
  };
  const appNavColors = APP_COLORS[app] || ["#5b91ce","#4076b8","#35649a"];

  const NavBar = ({title,back,backLabel="",rightLabel,onRight}) => {
    const nbOv = devOv.navBar || {};
    const nbBg      = nbOv.bg     ?? `linear-gradient(180deg,${appNavColors[0]},${appNavColors[1]})`;
    const nbH       = nbOv.height ?? 44;
    const nbBorder  = nbOv.borderB?? `1px solid ${appNavColors[2]}`;
    const nbTSize   = nbOv.titleSize   ?? 17;
    const nbTWeight = nbOv.titleWeight ?? 700;
    // Nom personnalisé de l'app (éditable dans l'admin via data.appNames)
    const displayTitle = (data.appNames?.[app] ?? title);
    const dynTSize = displayTitle.length > 22 ? 11 : displayTitle.length > 18 ? 12 : displayTitle.length > 14 ? 14 : nbTSize;
    return (
    <div style={{background:nbBg,padding:"0 8px",display:"flex",alignItems:"center",height:nbH,flexShrink:0,borderBottom:nbBorder,boxShadow:"0 1px 3px rgba(0,0,0,0.3)",position:"relative"}}>
      {back&&<button onClick={back} style={{background:`linear-gradient(180deg,${appNavColors[1]},${appNavColors[2]})`,border:"1px solid rgba(0,0,0,0.45)",borderRadius:6,color:"#fff",fontSize:11,fontWeight:"600",cursor:"pointer",padding:"3px 10px 3px 7px",display:"flex",alignItems:"center",gap:2,textShadow:"0 -1px 0 rgba(0,0,0,0.5)",boxShadow:"inset 0 1px 0 rgba(255,255,255,0.2)",zIndex:1,flexShrink:0,fontFamily:FF_IOS}}>
        <span style={{lineHeight:1,display:"flex",alignItems:"center"}}><svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M7 1L1 7l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
        {backLabel&&<span style={{fontSize:12}}>{backLabel}</span>}
      </button>}
      
      <span style={{position:"absolute",left:0,right:0,textAlign:"center",
          color:"#fff",fontWeight:nbTWeight,fontSize:dynTSize,
          textShadow:"0 1px 2px rgba(0,0,0,0.5)",letterSpacing:-0.3,
          fontFamily:FF_IOS,pointerEvents:"none",
          whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
          padding:"0 70px"}}>{displayTitle}</span>
      <div style={{flex:1}}/>
      {rightLabel&&<button onClick={onRight} style={{background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.4)",borderRadius:6,color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",padding:"3px 10px",textShadow:"0 1px 1px rgba(0,0,0,0.4)",zIndex:1}}>{rightLabel}</button>}
      {!rightLabel&&back&&<div style={{width:56}}/>}
    </div>
    );
  };

  const wallpaper = data.wallpaper;
  const isBgImg = wallpaper?.startsWith("data:")||wallpaper?.startsWith("http")||wallpaper?.startsWith("/");
  const bgStyle = isBgImg?{backgroundImage:`url(${wallpaper})`,backgroundSize:"cover",backgroundPosition:"center"}:{background:wallpaper};

  const goHome = () => { setApp(null); setThread(null); setMsgView("inbox"); setScreen("home"); };

  const isWhite = data.phoneColor === "white";
  const chassisGrad = isWhite ? "linear-gradient(145deg,#f8f8f6,#dcdcd8)" : "linear-gradient(145deg,#3a3a3a,#1c1c1c)";
  const ring1 = isWhite ? "#d0d0cc" : "#555";
  const ring2 = isWhite ? "#a8a8a4" : "#333";
  const bezelTop = isWhite ? "linear-gradient(180deg,#f0f0ec,#e0e0dc)" : "linear-gradient(180deg,#1a1a1a,#111)";
  const bezelBot = isWhite ? "linear-gradient(180deg,#e0e0dc,#f0f0ec)" : "linear-gradient(180deg,#111,#1a1a1a)";
  const bezelText = isWhite ? "#888" : "#444";
  const sideBorder = isWhite ? "14px solid #e8e8e4" : "14px solid #111";
  const homeBtn = isWhite ? "linear-gradient(145deg,#d8d8d4,#c0c0bc)" : "linear-gradient(145deg,#2a2a2a,#1c1c1c)";
  const homeBtnBorder = isWhite ? "1.5px solid #b8b8b4" : "1.5px solid #444";
  const homeBtnRing = isWhite ? "#a8a8a4" : "#555";

  // Chassis dimensions (devOverrides can override)
  const chassisPng  = data.chassisPng || null;
  const chOv        = devOv.iosChassis || {};
  const screenInset = data.screenInset || {top:87, left:11, right:11, bottom:94};
  // Phone dimensions
  const phoneW    = chOv.width  ?? 320;
  const phoneH    = chOv.height ?? 620;
  const scrTop    = chOv.topBezelH    ?? screenInset.top;
  const scrLeft   = chOv.sideBezelW   ?? screenInset.left;
  const scrRight  = chOv.sideBezelW   ?? screenInset.right;
  const scrBot    = chOv.bottomBezelH ?? screenInset.bottom;
  // Override chassis appearance vars
  const chassisGradOv = (chOv.chassisLight && chOv.chassisDark) ? `linear-gradient(145deg,${chOv.chassisLight},${chOv.chassisDark})` : chassisGrad;
  const bezelTopOv    = chOv.bezelTopBg  ?? bezelTop;
  const bezelBotOv    = chOv.bezelBotBg  ?? bezelBot;
  const sideBezelBgOv = chOv.sideBezelBg ?? (isWhite?"#e0e0dc":"#111");
  const boxShadowOv   = chOv.boxShadow   ?? `0 0 0 1.5px ${ring1},0 0 0 3px ${ring2},0 20px 60px rgba(0,0,0,0.5)`;
  const homeBtnBgOv   = chOv.homeButtonBg ?? homeBtn;
  const homeBtnSizeOv = chOv.homeButtonSize ?? 48;
  const earpieceWOv   = chOv.earpieceW   ?? 52;
  const earpieceColOv = chOv.earpieceColor ?? bezelText;
  const chassisBROv   = chOv.borderRadius ?? 36;

  const Chassis = ({children, onHome=goHome}) => {
    // Use inline SVG with foreignObject for pixel-perfect screen alignment
    // Determine SVG variant: white (Glinda) or black (Eoghan)
    const isBlackSvg = chassisPng === "__svgblack__";
    const isWhiteSvg = chassisPng === "__svgwhite__";
    const isIphone4  = chassisPng === "__iphone4__";
    if(isIphone4) {
      const VBW=223.591, VBH=412.584, SX=29, SY=80.5, SW=168, SH=252;
      const W = chOv.width ?? 390;
      const H = Math.round(W * VBH / VBW);
      return (
        <DevCtx.Provider value={devOv}>
          <>
          <div style={{position:"relative",width:W,height:H,flexShrink:0}}>
            {/* Screen content sits behind the SVG frame */}
            <div style={{
              position:"absolute",
              top:`${SY/VBH*100}%`,
              left:`${SX/VBW*100}%`,
              width:`${SW/VBW*100}%`,
              height:`${SH/VBH*100}%`,
              overflow:"hidden",display:"flex",flexDirection:"column",zIndex:1,
            }}>
              {children}
            </div>
            {/* iPhone 4 frame overlay — SVG with mask punching out the screen */}
            <svg viewBox="0 0 223.591 412.584" width={W} height={H}
              style={{position:"absolute",inset:0,zIndex:2,pointerEvents:"none"}}
              xmlns="http://www.w3.org/2000/svg"
              xmlnsXlink="http://www.w3.org/1999/xlink">
              <defs>
                <mask id="i4_screen_mask">
                  <rect width="223.591" height="412.584" fill="white"/>
                  <rect x="29" y="80.5" width="168" height="252" fill="black"/>
                </mask>
                <mask id="i4_scratch_mask">
                  <rect width="223.591" height="412.584" fill="white"/>
                  <rect x="29" y="80.5" width="168" height="252" fill="black"/>
                </mask>
              </defs>
              <image href={I4_SRC} width="223.591" height="412.584" mask="url(#i4_screen_mask)"/>
              {/* Scratches on chassis only */}
              <g mask="url(#i4_scratch_mask)" opacity="0.6">
                <line x1="18" y1="42" x2="27" y2="68" stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" strokeLinecap="round"/>
                <line x1="96" y1="38" x2="103" y2="43" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" strokeLinecap="round"/>
                <line x1="200" y1="155" x2="206" y2="178" stroke="rgba(255,255,255,0.35)" strokeWidth="0.35" strokeLinecap="round"/>
                <line x1="202" y1="160" x2="207" y2="168" stroke="rgba(255,255,255,0.25)" strokeWidth="0.25" strokeLinecap="round"/>
                <line x1="88" y1="360" x2="102" y2="368" stroke="rgba(255,255,255,0.45)" strokeWidth="0.4" strokeLinecap="round"/>
                <line x1="140" y1="372" x2="148" y2="378" stroke="rgba(255,255,255,0.3)" strokeWidth="0.3" strokeLinecap="round"/>
                <line x1="16" y1="210" x2="20" y2="218" stroke="rgba(255,255,255,0.3)" strokeWidth="0.25" strokeLinecap="round"/>
                <line x1="14" y1="213" x2="17" y2="220" stroke="rgba(255,255,255,0.2)" strokeWidth="0.2" strokeLinecap="round"/>
                <line x1="192" y1="385" x2="204" y2="396" stroke="rgba(255,255,255,0.5)" strokeWidth="0.45" strokeLinecap="round"/>
                <line x1="195" y1="388" x2="201" y2="393" stroke="rgba(255,255,255,0.3)" strokeWidth="0.25" strokeLinecap="round"/>
                {/* Extra chassis scratches */}
                <line x1="155" y1="34" x2="162" y2="40" stroke="rgba(255,255,255,0.35)" strokeWidth="0.3" strokeLinecap="round"/>
                <line x1="22" y1="310" x2="26" y2="325" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" strokeLinecap="round"/>
                <line x1="19" y1="140" x2="24" y2="152" stroke="rgba(255,255,255,0.3)" strokeWidth="0.25" strokeLinecap="round"/>
                <line x1="198" y1="280" x2="208" y2="290" stroke="rgba(255,255,255,0.4)" strokeWidth="0.35" strokeLinecap="round"/>
                <line x1="60" y1="375" x2="72" y2="380" stroke="rgba(255,255,255,0.35)" strokeWidth="0.3" strokeLinecap="round"/>
                <line x1="170" y1="390" x2="176" y2="398" stroke="rgba(255,255,255,0.3)" strokeWidth="0.25" strokeLinecap="round"/>
              </g>
              {/* Micro-scratches on screen glass */}
              <g opacity="0.18">
                <line x1="55" y1="110" x2="72" y2="118" stroke="rgba(255,255,255,0.9)" strokeWidth="0.35" strokeLinecap="round"/>
                <line x1="130" y1="155" x2="141" y2="160" stroke="rgba(255,255,255,0.8)" strokeWidth="0.3" strokeLinecap="round"/>
                <line x1="80" y1="220" x2="88" y2="230" stroke="rgba(255,255,255,0.85)" strokeWidth="0.25" strokeLinecap="round"/>
                <line x1="160" y1="240" x2="170" y2="248" stroke="rgba(255,255,255,0.7)" strokeWidth="0.3" strokeLinecap="round"/>
                <line x1="45" y1="290" x2="58" y2="296" stroke="rgba(255,255,255,0.8)" strokeWidth="0.25" strokeLinecap="round"/>
                <line x1="110" y1="305" x2="116" y2="312" stroke="rgba(255,255,255,0.6)" strokeWidth="0.2" strokeLinecap="round"/>
              </g>
            </svg>

            {/* Home button — calibré sur le vrai cercle SVG (cx=115.71, cy=366.62, r=18.562) */}
            <div onClick={()=>{ if(asleep){wake();}else{onHome();} }}
              style={{position:"absolute",
                top:`${(366.62-18.562)/412.584*100}%`,
                left:`${(115.71-18.562)/223.591*100}%`,
                width:`${(2*18.562)/223.591*100}%`,
                height:`${(2*18.562)/412.584*100}%`,
                borderRadius:"50%",cursor:"pointer",zIndex:3}}/>

            {/* Sleep button — calibré sur le même % relatif que le modèle iPhone 5 (top=1.5%, left=64.5%, w=14.6%, h=3.2%) */}
            <div onClick={()=>{ if(asleep){wake();}else{setApp(null);setThread(null);setScreen("lock");sleep();} }}
              style={{position:"absolute",top:"1.5%",left:"64.5%",width:"14.6%",height:"3.2%",cursor:"pointer",zIndex:5}}/>

            {/* Wake overlay */}
            <div onClick={()=>{wake();}} style={{
              position:"absolute",
              top:`${SY/VBH*100}%`, left:`${SX/VBW*100}%`,
              width:`${SW/VBW*100}%`, height:`${SH/VBH*100}%`,
              background:"#000", zIndex:4, cursor:"pointer",
              pointerEvents: asleep ? "auto" : "none",
              opacity: asleep ? 1 : 0,
              transition:"opacity 0.5s ease",
            }}/>
          </div>
          </>
        </DevCtx.Provider>
      );
    }

    if(chassisPng) {
      // SVG viewBox: 0 0 174.097 349.592
      // Screen rect in SVG: x=20 y=56.167 w=133 h=236.71
      const W = chOv.width ?? 390; // phone display width in px — augmenter ici pour agrandir
      const H = Math.round(W * 349.592 / 174.097);
      return (
        <DevCtx.Provider value={devOv}>
          <>
          <div style={{position:"relative",width:W,height:H,flexShrink:0}}>
            
            <div style={{
              position:"absolute",
              top:`${56.167/349.592*100}%`,
              left:`${20/174.097*100}%`,
              width:`${133/174.097*100}%`,
              height:`${236.71/349.592*100}%`,
              overflow:"hidden",display:"flex",flexDirection:"column",zIndex:1,
            }}>
              {children}
            </div>
            
            <svg viewBox="0 0 174.097 349.592" width={W} height={H}
              style={{position:"absolute",inset:0,zIndex:2,pointerEvents:"none"}}
              xmlns="http://www.w3.org/2000/svg">
              <defs>
<mask id="sc2">
  <rect width="174.097" height="349.592" fill="white"/>
  <rect x="20" y="56.167" width="133" height="236.71" fill="black"/>
</mask>

<linearGradient id="gw1" x1="113.27" y1="9.4688" x2="138.58" y2="9.4688" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#6B6969"/>
  <stop offset=".0125" stopColor="#8C8C8E"/>
  <stop offset=".0362" stopColor="#ADADAF"/>
  <stop offset=".0484" stopColor="#C0C2C4"/>
  <stop offset=".0783" stopColor="#999BA0"/>
  <stop offset=".086" stopColor="#D4D6D7"/>
  <stop offset=".9409" stopColor="#9A9C9E"/>
  <stop offset=".9416" stopColor="#ADADAF"/>
  <stop offset=".9471" stopColor="#C5C7C9"/>
  <stop offset=".9525" stopColor="#D4D6D7"/>
  <stop offset=".9578" stopColor="#D8DADB"/>
  <stop offset=".9629" stopColor="#E6E7E8"/>
  <stop offset=".9677" stopColor="#EAEBEC"/>
  <stop offset=".9782" stopColor="#C8CACB"/>
  <stop offset=".9881" stopColor="#ADADAF"/>
  <stop offset=".9957" stopColor="#8A8C8E"/>
  <stop offset="1" stopColor="#6B6969"/>
</linearGradient>
<linearGradient id="gw3" x1="9.4585" y1="54.25" x2="9.4585" y2="69.127" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#6B6969"/>
  <stop offset=".0101" stopColor="#8A8C8E"/>
  <stop offset=".0278" stopColor="#ADADAF"/>
  <stop offset=".0509" stopColor="#C8CACB"/>
  <stop offset=".0753" stopColor="#EAEBEC"/>
  <stop offset=".1159" stopColor="#E6E7E8"/>
  <stop offset=".1592" stopColor="#D8DADB"/>
  <stop offset=".2037" stopColor="#D4D6D7"/>
  <stop offset=".249" stopColor="#C5C7C9"/>
  <stop offset=".2945" stopColor="#ADADAF"/>
  <stop offset=".3011" stopColor="#9A9C9E"/>
  <stop offset=".9086" stopColor="#D4D6D7"/>
  <stop offset=".9175" stopColor="#999BA0"/>
  <stop offset=".9516" stopColor="#C0C2C4"/>
  <stop offset=".9638" stopColor="#ADADAF"/>
  <stop offset=".9875" stopColor="#8C8C8E"/>
  <stop offset="1" stopColor="#6B6969"/>
</linearGradient>
<linearGradient id="gw5" x1="9.1406" y1="85.5" x2="9.1406" y2="96.837" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#6B6969"/>
  <stop offset=".0743" stopColor="#737578"/>
  <stop offset=".101" stopColor="#858789"/>
  <stop offset=".1201" stopColor="#979899"/>
  <stop offset=".1355" stopColor="#A4A6A8"/>
  <stop offset=".1487" stopColor="#B0B2B4"/>
  <stop offset=".1604" stopColor="#C0C2C4"/>
  <stop offset=".1708" stopColor="#D0D2D3"/>
  <stop offset=".1774" stopColor="#EAEBEC"/>
  <stop offset=".1881" stopColor="#E6E7E8"/>
  <stop offset=".1994" stopColor="#D8DADB"/>
  <stop offset=".211" stopColor="#D4D6D7"/>
  <stop offset=".2229" stopColor="#C5C7C9"/>
  <stop offset=".2348" stopColor="#ADADAF"/>
  <stop offset=".2366" stopColor="#9A9C9E"/>
  <stop offset=".9086" stopColor="#D4D6D7"/>
  <stop offset=".9175" stopColor="#999BA0"/>
  <stop offset=".9516" stopColor="#C0C2C4"/>
  <stop offset=".9638" stopColor="#ADADAF"/>
  <stop offset=".9875" stopColor="#8C8C8E"/>
  <stop offset="1" stopColor="#6B6969"/>
</linearGradient>
<linearGradient id="gw7" x1="9.1406" y1="112.96" x2="9.1406" y2="124.29" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#6B6969"/>
  <stop offset=".0743" stopColor="#737578"/>
  <stop offset=".101" stopColor="#858789"/>
  <stop offset=".1201" stopColor="#979899"/>
  <stop offset=".1355" stopColor="#A4A6A8"/>
  <stop offset=".1487" stopColor="#B0B2B4"/>
  <stop offset=".1604" stopColor="#C0C2C4"/>
  <stop offset=".1708" stopColor="#D0D2D3"/>
  <stop offset=".1774" stopColor="#EAEBEC"/>
  <stop offset=".1881" stopColor="#E6E7E8"/>
  <stop offset=".1994" stopColor="#D8DADB"/>
  <stop offset=".211" stopColor="#D4D6D7"/>
  <stop offset=".2229" stopColor="#C5C7C9"/>
  <stop offset=".2348" stopColor="#ADADAF"/>
  <stop offset=".2366" stopColor="#9A9C9E"/>
  <stop offset=".9086" stopColor="#D4D6D7"/>
  <stop offset=".9175" stopColor="#999BA0"/>
  <stop offset=".9516" stopColor="#C0C2C4"/>
  <stop offset=".9638" stopColor="#ADADAF"/>
  <stop offset=".9875" stopColor="#8C8C8E"/>
  <stop offset="1" stopColor="#6B6969"/>
</linearGradient>
<linearGradient id="gw9" x1="86.621" y1="8.5" x2="86.621" y2="339.33" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#6D6E71"/>
  <stop offset=".0246" stopColor="#6D6E71"/>
  <stop offset=".0493" stopColor="#E6E7E8"/>
  <stop offset=".0726" stopColor="#939598"/>
  <stop offset=".8916" stopColor="#6B6969"/>
  <stop offset=".901" stopColor="#D4D6D7"/>
  <stop offset=".9127" stopColor="#A0A2A4"/>
  <stop offset=".9257" stopColor="#B8BABB"/>
  <stop offset=".9395" stopColor="#C9CBCC"/>
  <stop offset=".954" stopColor="#D8DADB"/>
  <stop offset=".9589" stopColor="#EAEBEC"/>
  <stop offset=".9605" stopColor="#D0D2D3"/>
  <stop offset=".9629" stopColor="#C8CACB"/>
  <stop offset=".9656" stopColor="#ADADAF"/>
  <stop offset=".9686" stopColor="#ADADAF"/>
  <stop offset=".9722" stopColor="#7E8082"/>
  <stop offset=".9766" stopColor="#6B6D6F"/>
  <stop offset=".9828" stopColor="#5A5C5E"/>
  <stop offset="1" stopColor="#4A4C4E"/>
</linearGradient>
<linearGradient id="gw11" x1="73.614" y1="37.208" x2="99.445" y2="37.208" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#9A9C9E"/>
  <stop offset=".2693" stopColor="#515153"/>
  <stop offset=".3663" stopColor="#57575A"/>
  <stop offset=".4355" stopColor="#616264"/>
  <stop offset=".4914" stopColor="#6E7072"/>
  <stop offset=".5393" stopColor="#7F8183"/>
  <stop offset=".5809" stopColor="#939597"/>
  <stop offset=".6129" stopColor="#EAEBEC"/>
  <stop offset=".6871" stopColor="#8E9092"/>
  <stop offset=".8343" stopColor="#ADADAF"/>
  <stop offset=".9428" stopColor="#8C8C8E"/>
  <stop offset="1" stopColor="#6B6969"/>
</linearGradient>
<linearGradient id="gw12" x1="98.948" y1="36.062" x2="99.011" y2="36.062" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#9A9C9E"/>
  <stop offset=".2693" stopColor="#515153"/>
  <stop offset=".3663" stopColor="#57575A"/>
  <stop offset=".4355" stopColor="#616264"/>
  <stop offset=".4914" stopColor="#6E7072"/>
  <stop offset=".5393" stopColor="#7F8183"/>
  <stop offset=".5809" stopColor="#939597"/>
  <stop offset=".6129" stopColor="#EAEBEC"/>
  <stop offset=".6871" stopColor="#8E9092"/>
  <stop offset=".8343" stopColor="#ADADAF"/>
  <stop offset=".9428" stopColor="#8C8C8E"/>
  <stop offset="1" stopColor="#6B6969"/>
</linearGradient>
<linearGradient id="gw13" x1="83.393" y1="22.072" x2="90.081" y2="27.947" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#6B6969"/>
  <stop offset=".4812" stopColor="#737578"/>
  <stop offset=".6546" stopColor="#858789"/>
  <stop offset=".7781" stopColor="#979899"/>
  <stop offset=".878" stopColor="#A4A6A8"/>
  <stop offset=".9626" stopColor="#67696B"/>
  <stop offset="1" stopColor="#C0C2C4"/>
</linearGradient>
<linearGradient id="gw18" x1="117.86" y1="12.5" x2="117.86" y2="260.83" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#FFFFFF" stopOpacity=".5"/>
  <stop offset=".1235" stopColor="#FFFFFF" stopOpacity=".4382"/>
  <stop offset="1" stopColor="#FFFFFF" stopOpacity="0"/>
</linearGradient>
<linearGradient id="gw21" x1="85.708" y1="333.67" x2="85.708" y2="298.32" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#FFFFFF" stopOpacity=".5"/>
  <stop offset=".1235" stopColor="#FFFFFF" stopOpacity=".4382"/>
  <stop offset="1" stopColor="#FFFFFF" stopOpacity="0"/>
</linearGradient>
<radialGradient id="gw2" cx="125.12" cy="7.375" r="13.412" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#EAEBEC"/>
  <stop offset=".1162" stopColor="#E6E7E8"/>
  <stop offset=".2397" stopColor="#D8DADB"/>
  <stop offset=".3668" stopColor="#D4D6D7"/>
  <stop offset=".4963" stopColor="#C5C7C9"/>
  <stop offset=".6264" stopColor="#ADADAF"/>
  <stop offset=".6452" stopColor="#9A9C9E"/>
  <stop offset=".774" stopColor="#4D4E50"/>
  <stop offset=".8204" stopColor="#474749"/>
  <stop offset=".8533" stopColor="#383839"/>
  <stop offset=".871" stopColor="#6B6969"/>
  <stop offset=".926" stopColor="#8A8C8E"/>
  <stop offset=".9516" stopColor="#D4D6D7"/>
  <stop offset=".9616" stopColor="#999BA0"/>
  <stop offset="1" stopColor="#C0C2C4"/>
</radialGradient>
<radialGradient id="gw4" cx="6.9375" cy="61.812" r="7.5065" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#EAEBEC"/>
  <stop offset=".1142" stopColor="#E6E7E8"/>
  <stop offset=".2357" stopColor="#D8DADB"/>
  <stop offset=".3607" stopColor="#D4D6D7"/>
  <stop offset=".488" stopColor="#C5C7C9"/>
  <stop offset=".616" stopColor="#ADADAF"/>
  <stop offset=".6344" stopColor="#9A9C9E"/>
  <stop offset=".828" stopColor="#6B6969"/>
  <stop offset=".883" stopColor="#8A8C8E"/>
  <stop offset=".9086" stopColor="#D4D6D7"/>
  <stop offset=".9274" stopColor="#999BA0"/>
  <stop offset="1" stopColor="#C0C2C4"/>
</radialGradient>
<radialGradient id="gw6" cx="7.2085" cy="91.292" r="5.6679" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#EAEBEC"/>
  <stop offset=".1162" stopColor="#E6E7E8"/>
  <stop offset=".2397" stopColor="#D8DADB"/>
  <stop offset=".3668" stopColor="#D4D6D7"/>
  <stop offset=".4963" stopColor="#C5C7C9"/>
  <stop offset=".6264" stopColor="#ADADAF"/>
  <stop offset=".6452" stopColor="#9A9C9E"/>
  <stop offset=".8139" stopColor="#4D4E50"/>
  <stop offset=".8746" stopColor="#474749"/>
  <stop offset=".9178" stopColor="#383839"/>
  <stop offset=".9409" stopColor="#6B6969"/>
  <stop offset=".9812" stopColor="#8A8C8E"/>
  <stop offset="1" stopColor="#D4D6D7"/>
</radialGradient>
<radialGradient id="gw8" cx="7.2085" cy="118.75" r="5.6679" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#EAEBEC"/>
  <stop offset=".1162" stopColor="#E6E7E8"/>
  <stop offset=".2397" stopColor="#D8DADB"/>
  <stop offset=".3668" stopColor="#D4D6D7"/>
  <stop offset=".4963" stopColor="#C5C7C9"/>
  <stop offset=".6264" stopColor="#ADADAF"/>
  <stop offset=".6452" stopColor="#9A9C9E"/>
  <stop offset=".8139" stopColor="#4D4E50"/>
  <stop offset=".8746" stopColor="#474749"/>
  <stop offset=".9178" stopColor="#383839"/>
  <stop offset=".9409" stopColor="#6B6969"/>
  <stop offset=".9812" stopColor="#8A8C8E"/>
  <stop offset="1" stopColor="#D4D6D7"/>
</radialGradient>
<radialGradient id="gw10" cx="86.583" cy="45.5" r="14.045" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#9A9C9E"/>
  <stop offset=".2693" stopColor="#515153"/>
  <stop offset=".3663" stopColor="#57575A"/>
  <stop offset=".4355" stopColor="#616264"/>
  <stop offset=".4914" stopColor="#6E7072"/>
  <stop offset=".5393" stopColor="#7F8183"/>
  <stop offset=".5809" stopColor="#939597"/>
  <stop offset=".6129" stopColor="#EAEBEC"/>
  <stop offset=".6871" stopColor="#8E9092"/>
  <stop offset=".8343" stopColor="#ADADAF"/>
  <stop offset=".9428" stopColor="#8C8C8E"/>
  <stop offset="1" stopColor="#6B6969"/>
</radialGradient>
<radialGradient id="gw14" cx="87.146" cy="24.98" r="2.0836" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#00062F"/>
  <stop offset=".2232" stopColor="#000830"/>
  <stop offset=".4278" stopColor="#000F34"/>
  <stop offset=".6249" stopColor="#00173B"/>
  <stop offset=".8164" stopColor="#012143"/>
  <stop offset="1" stopColor="#212D4E"/>
</radialGradient>
<radialGradient id="gw15" cx="86.082" cy="25.369" r=".4952" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#39BCED"/>
  <stop offset=".3637" stopColor="#0076A4"/>
  <stop offset="1" stopColor="#00062F"/>
</radialGradient>
<radialGradient id="gw16" cx="87.688" cy="24.312" r=".8706" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#39BCED"/>
  <stop offset=".3637" stopColor="#0076A4"/>
  <stop offset="1" stopColor="#00062F"/>
</radialGradient>
<radialGradient id="gw17" cx="86.364" cy="24.351" r=".7308" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#24132E"/>
  <stop offset=".3463" stopColor="#261732"/>
  <stop offset=".6634" stopColor="#2E213B"/>
  <stop offset=".9683" stopColor="#3A2F4A"/>
  <stop offset="1" stopColor="#3B304C"/>
</radialGradient>
<radialGradient id="gw19" cx="85.626" cy="300.44" r="18.875" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#FFFFFF" stopOpacity=".5"/>
  <stop offset=".1235" stopColor="#FFFFFF" stopOpacity=".4382"/>
  <stop offset="1" stopColor="#FFFFFF" stopOpacity="0"/>
</radialGradient>
<radialGradient id="gw20" cx="81.792" cy="309.83" r="13.316" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#ABADB0"/>
  <stop offset=".1017" stopColor="#9FA1A3"/>
  <stop offset=".2907" stopColor="#8D8F91"/>
  <stop offset=".493" stopColor="#808285"/>
  <stop offset=".7161" stopColor="#797B7D"/>
  <stop offset="1" stopColor="#77787B"/>
</radialGradient>
<linearGradient id="gw_homeW" x1="85.708" y1="300.41" x2="85.708" y2="329.83" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#FFFFFF"/>
  <stop offset="1" stopColor="#DBDBDB"/>
</linearGradient>

<linearGradient id="g1" x1="113.27" y1="9.4688" x2="138.58" y2="9.4688" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#1E1E1F"/>
  <stop offset=".0125" stopColor="#3D3C3E"/>
  <stop offset=".0362" stopColor="#606163"/>
  <stop offset=".0484" stopColor="#717375"/>
  <stop offset=".0783" stopColor="#4E4E50"/>
  <stop offset=".086" stopColor="#434344"/>
  <stop offset=".9409" stopColor="#4F4F51"/>
  <stop offset=".9416" stopColor="#555557"/>
  <stop offset=".9471" stopColor="#737578"/>
  <stop offset=".9525" stopColor="#8A8C8E"/>
  <stop offset=".9578" stopColor="#9A9C9E"/>
  <stop offset=".9629" stopColor="#A4A6A8"/>
  <stop offset=".9677" stopColor="#A7A9AC"/>
  <stop offset=".9782" stopColor="#7C7E80"/>
  <stop offset=".9881" stopColor="#57585A"/>
  <stop offset=".9957" stopColor="#39393A"/>
  <stop offset="1" stopColor="#222223"/>
</linearGradient>
<linearGradient id="g3" x1="9.4585" y1="54.25" x2="9.4585" y2="69.127" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#222223"/>
  <stop offset=".0101" stopColor="#39393A"/>
  <stop offset=".0278" stopColor="#57585A"/>
  <stop offset=".0509" stopColor="#7C7E80"/>
  <stop offset=".0753" stopColor="#A7A9AC"/>
  <stop offset=".1159" stopColor="#A4A6A8"/>
  <stop offset=".1592" stopColor="#9A9C9E"/>
  <stop offset=".2037" stopColor="#8A8C8E"/>
  <stop offset=".249" stopColor="#737578"/>
  <stop offset=".2945" stopColor="#555557"/>
  <stop offset=".3011" stopColor="#4F4F51"/>
  <stop offset=".9086" stopColor="#434344"/>
  <stop offset=".9175" stopColor="#4E4E50"/>
  <stop offset=".9516" stopColor="#717375"/>
  <stop offset=".9638" stopColor="#606163"/>
  <stop offset=".9875" stopColor="#3D3C3E"/>
  <stop offset="1" stopColor="#1E1E1F"/>
</linearGradient>
<linearGradient id="g5" x1="9.1406" y1="85.5" x2="9.1406" y2="96.837" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#222223"/>
  <stop offset=".0743" stopColor="#272728"/>
  <stop offset=".101" stopColor="#353536"/>
  <stop offset=".1201" stopColor="#464647"/>
  <stop offset=".1355" stopColor="#555658"/>
  <stop offset=".1487" stopColor="#68696B"/>
  <stop offset=".1604" stopColor="#7C7E81"/>
  <stop offset=".1708" stopColor="#949699"/>
  <stop offset=".1774" stopColor="#A7A9AC"/>
  <stop offset=".1881" stopColor="#A4A6A8"/>
  <stop offset=".1994" stopColor="#9A9C9E"/>
  <stop offset=".211" stopColor="#8A8C8E"/>
  <stop offset=".2229" stopColor="#737578"/>
  <stop offset=".2348" stopColor="#555557"/>
  <stop offset=".2366" stopColor="#4F4F51"/>
  <stop offset=".9086" stopColor="#434344"/>
  <stop offset=".9175" stopColor="#4E4E50"/>
  <stop offset=".9516" stopColor="#717375"/>
  <stop offset=".9638" stopColor="#606163"/>
  <stop offset=".9875" stopColor="#3D3C3E"/>
  <stop offset="1" stopColor="#1E1E1F"/>
</linearGradient>
<linearGradient id="g7" x1="9.1406" y1="112.96" x2="9.1406" y2="124.29" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#222223"/>
  <stop offset=".0743" stopColor="#272728"/>
  <stop offset=".101" stopColor="#353536"/>
  <stop offset=".1201" stopColor="#464647"/>
  <stop offset=".1355" stopColor="#555658"/>
  <stop offset=".1487" stopColor="#68696B"/>
  <stop offset=".1604" stopColor="#7C7E81"/>
  <stop offset=".1708" stopColor="#949699"/>
  <stop offset=".1774" stopColor="#A7A9AC"/>
  <stop offset=".1881" stopColor="#A4A6A8"/>
  <stop offset=".1994" stopColor="#9A9C9E"/>
  <stop offset=".211" stopColor="#8A8C8E"/>
  <stop offset=".2229" stopColor="#737578"/>
  <stop offset=".2348" stopColor="#555557"/>
  <stop offset=".2366" stopColor="#4F4F51"/>
  <stop offset=".9086" stopColor="#434344"/>
  <stop offset=".9175" stopColor="#4E4E50"/>
  <stop offset=".9516" stopColor="#717375"/>
  <stop offset=".9638" stopColor="#606163"/>
  <stop offset=".9875" stopColor="#3D3C3E"/>
  <stop offset="1" stopColor="#1E1E1F"/>
</linearGradient>
<linearGradient id="g9" x1="86.621" y1="8.5" x2="86.621" y2="339.33" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#000000"/>
  <stop offset=".0246" stopColor="#414042"/>
  <stop offset=".0493" stopColor="#BDBFC1"/>
  <stop offset=".0726" stopColor="#2E2D2F"/>
  <stop offset=".8916" stopColor="#1E1E1F"/>
  <stop offset=".901" stopColor="#2B2B2C"/>
  <stop offset=".9127" stopColor="#454446"/>
  <stop offset=".9257" stopColor="#5C5C5F"/>
  <stop offset=".9395" stopColor="#787A7C"/>
  <stop offset=".954" stopColor="#9A9C9E"/>
  <stop offset=".9589" stopColor="#A7A9AC"/>
  <stop offset=".9605" stopColor="#939698"/>
  <stop offset=".9629" stopColor="#7C7E80"/>
  <stop offset=".9656" stopColor="#67686B"/>
  <stop offset=".9686" stopColor="#555557"/>
  <stop offset=".9722" stopColor="#454547"/>
  <stop offset=".9766" stopColor="#343435"/>
  <stop offset=".9828" stopColor="#262526"/>
  <stop offset="1" stopColor="#212122"/>
</linearGradient>
<linearGradient id="g11" x1="73.614" y1="37.208" x2="99.445" y2="37.208" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#4F4F51"/>
  <stop offset=".2693" stopColor="#515153"/>
  <stop offset=".3663" stopColor="#57575A"/>
  <stop offset=".4355" stopColor="#616264"/>
  <stop offset=".4914" stopColor="#6E7072"/>
  <stop offset=".5393" stopColor="#7F8183"/>
  <stop offset=".5809" stopColor="#939597"/>
  <stop offset=".6129" stopColor="#A7A9AC"/>
  <stop offset=".6871" stopColor="#8E9092"/>
  <stop offset=".8343" stopColor="#606163"/>
  <stop offset=".9428" stopColor="#3D3C3E"/>
  <stop offset="1" stopColor="#1E1E1F"/>
</linearGradient>
<linearGradient id="g12" x1="98.948" y1="36.062" x2="99.011" y2="36.062" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#4F4F51"/>
  <stop offset=".2693" stopColor="#515153"/>
  <stop offset=".3663" stopColor="#57575A"/>
  <stop offset=".4355" stopColor="#616264"/>
  <stop offset=".4914" stopColor="#6E7072"/>
  <stop offset=".5393" stopColor="#7F8183"/>
  <stop offset=".5809" stopColor="#939597"/>
  <stop offset=".6129" stopColor="#A7A9AC"/>
  <stop offset=".6871" stopColor="#8E9092"/>
  <stop offset=".8343" stopColor="#606163"/>
  <stop offset=".9428" stopColor="#3D3C3E"/>
  <stop offset="1" stopColor="#1E1E1F"/>
</linearGradient>
<linearGradient id="g13" x1="83.393" y1="22.072" x2="90.081" y2="27.947" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#222223"/>
  <stop offset=".4812" stopColor="#272728"/>
  <stop offset=".6546" stopColor="#353536"/>
  <stop offset=".7781" stopColor="#464647"/>
  <stop offset=".878" stopColor="#555658"/>
  <stop offset=".9626" stopColor="#67696B"/>
  <stop offset="1" stopColor="#717375"/>
</linearGradient>
<linearGradient id="g18" x1="117.86" y1="12.5" x2="117.86" y2="260.83" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#FFFFFF" stopOpacity=".5"/>
  <stop offset=".1235" stopColor="#FFFFFF" stopOpacity=".4382"/>
  <stop offset="1" stopColor="#FFFFFF" stopOpacity="0"/>
</linearGradient>
<linearGradient id="g21" x1="85.708" y1="333.67" x2="85.708" y2="298.32" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#FFFFFF" stopOpacity=".5"/>
  <stop offset=".1235" stopColor="#FFFFFF" stopOpacity=".4382"/>
  <stop offset="1" stopColor="#FFFFFF" stopOpacity="0"/>
</linearGradient>
<radialGradient id="g2" cx="125.12" cy="7.375" r="13.412" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#A7A9AC"/>
  <stop offset=".1162" stopColor="#A4A6A8"/>
  <stop offset=".2397" stopColor="#9A9C9E"/>
  <stop offset=".3668" stopColor="#8A8C8E"/>
  <stop offset=".4963" stopColor="#737578"/>
  <stop offset=".6264" stopColor="#555557"/>
  <stop offset=".6452" stopColor="#4F4F51"/>
  <stop offset=".774" stopColor="#4D4E50"/>
  <stop offset=".8204" stopColor="#474749"/>
  <stop offset=".8533" stopColor="#383839"/>
  <stop offset=".871" stopColor="#222223"/>
  <stop offset=".926" stopColor="#39393A"/>
  <stop offset=".9516" stopColor="#434344"/>
  <stop offset=".9616" stopColor="#4E4E50"/>
  <stop offset="1" stopColor="#717375"/>
</radialGradient>
<radialGradient id="g4" cx="6.9375" cy="61.812" r="7.5065" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#A7A9AC"/>
  <stop offset=".1142" stopColor="#A4A6A8"/>
  <stop offset=".2357" stopColor="#9A9C9E"/>
  <stop offset=".3607" stopColor="#8A8C8E"/>
  <stop offset=".488" stopColor="#737578"/>
  <stop offset=".616" stopColor="#555557"/>
  <stop offset=".6344" stopColor="#4F4F51"/>
  <stop offset=".828" stopColor="#222223"/>
  <stop offset=".883" stopColor="#39393A"/>
  <stop offset=".9086" stopColor="#434344"/>
  <stop offset=".9274" stopColor="#4E4E50"/>
  <stop offset="1" stopColor="#717375"/>
</radialGradient>
<radialGradient id="g6" cx="7.2085" cy="91.292" r="5.6679" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#A7A9AC"/>
  <stop offset=".1162" stopColor="#A4A6A8"/>
  <stop offset=".2397" stopColor="#9A9C9E"/>
  <stop offset=".3668" stopColor="#8A8C8E"/>
  <stop offset=".4963" stopColor="#737578"/>
  <stop offset=".6264" stopColor="#555557"/>
  <stop offset=".6452" stopColor="#4F4F51"/>
  <stop offset=".8139" stopColor="#4D4E50"/>
  <stop offset=".8746" stopColor="#474749"/>
  <stop offset=".9178" stopColor="#383839"/>
  <stop offset=".9409" stopColor="#222223"/>
  <stop offset=".9812" stopColor="#39393A"/>
  <stop offset="1" stopColor="#434344"/>
</radialGradient>
<radialGradient id="g8" cx="7.2085" cy="118.75" r="5.6679" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#A7A9AC"/>
  <stop offset=".1162" stopColor="#A4A6A8"/>
  <stop offset=".2397" stopColor="#9A9C9E"/>
  <stop offset=".3668" stopColor="#8A8C8E"/>
  <stop offset=".4963" stopColor="#737578"/>
  <stop offset=".6264" stopColor="#555557"/>
  <stop offset=".6452" stopColor="#4F4F51"/>
  <stop offset=".8139" stopColor="#4D4E50"/>
  <stop offset=".8746" stopColor="#474749"/>
  <stop offset=".9178" stopColor="#383839"/>
  <stop offset=".9409" stopColor="#222223"/>
  <stop offset=".9812" stopColor="#39393A"/>
  <stop offset="1" stopColor="#434344"/>
</radialGradient>
<radialGradient id="g10" cx="86.583" cy="45.5" r="14.045" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#4F4F51"/>
  <stop offset=".2693" stopColor="#515153"/>
  <stop offset=".3663" stopColor="#57575A"/>
  <stop offset=".4355" stopColor="#616264"/>
  <stop offset=".4914" stopColor="#6E7072"/>
  <stop offset=".5393" stopColor="#7F8183"/>
  <stop offset=".5809" stopColor="#939597"/>
  <stop offset=".6129" stopColor="#A7A9AC"/>
  <stop offset=".6871" stopColor="#8E9092"/>
  <stop offset=".8343" stopColor="#606163"/>
  <stop offset=".9428" stopColor="#3D3C3E"/>
  <stop offset="1" stopColor="#1E1E1F"/>
</radialGradient>
<radialGradient id="g14" cx="87.146" cy="24.98" r="2.0836" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#00062F"/>
  <stop offset=".2232" stopColor="#000830"/>
  <stop offset=".4278" stopColor="#000F34"/>
  <stop offset=".6249" stopColor="#00173B"/>
  <stop offset=".8164" stopColor="#012143"/>
  <stop offset="1" stopColor="#212D4E"/>
</radialGradient>
<radialGradient id="g15" cx="86.082" cy="25.369" r=".4952" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#39BCED"/>
  <stop offset=".3637" stopColor="#0076A4"/>
  <stop offset="1" stopColor="#00062F"/>
</radialGradient>
<radialGradient id="g16" cx="87.688" cy="24.312" r=".8706" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#39BCED"/>
  <stop offset=".3637" stopColor="#0076A4"/>
  <stop offset="1" stopColor="#00062F"/>
</radialGradient>
<radialGradient id="g17" cx="86.364" cy="24.351" r=".7308" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#24132E"/>
  <stop offset=".3463" stopColor="#261732"/>
  <stop offset=".6634" stopColor="#2E213B"/>
  <stop offset=".9683" stopColor="#3A2F4A"/>
  <stop offset="1" stopColor="#3B304C"/>
</radialGradient>
<radialGradient id="g19" cx="85.626" cy="300.44" r="18.875" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#FFFFFF" stopOpacity=".5"/>
  <stop offset=".1235" stopColor="#FFFFFF" stopOpacity=".4382"/>
  <stop offset="1" stopColor="#FFFFFF" stopOpacity="0"/>
</radialGradient>
<radialGradient id="g20" cx="81.792" cy="309.83" r="13.316" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#ABADB0"/>
  <stop offset=".1017" stopColor="#9FA1A3"/>
  <stop offset=".2907" stopColor="#8D8F91"/>
  <stop offset=".493" stopColor="#808285"/>
  <stop offset=".7161" stopColor="#797B7D"/>
  <stop offset="1" stopColor="#77787B"/>
</radialGradient>
</defs>
<g mask="url(#sc2)">
  <path d="m164.87 315.33c0 13.2-10.8 24-24 24h-108.5c-13.2 0-24-10.8-24-24v-282.83c0-13.2 10.8-24 24-24h108.49c13.2 0 24 10.8 24 24v282.83z" fill={isBlackSvg ? "url(#g9)" : "url(#gw9)"}/>
  <path d="m32.375 337.33c-12.131 0-22-9.869-22-22v-282.83c0-12.131 9.869-22 22-22h108.49c12.131 0 22 9.869 22 22v282.83c0 12.131-9.869 22-22 22h-108.48z" fill={isBlackSvg ? "#4F5560" : "#C9CBCC"}/>
  <path d="m32.375 336.83c-11.855 0-21.5-9.645-21.5-21.5v-282.83c0-11.855 9.645-21.5 21.5-21.5h108.49c11.855 0 21.5 9.645 21.5 21.5v282.83c0 11.855-9.645 21.5-21.5 21.5h-108.48z" fill={isBlackSvg ? "#292B2D" : "#D8DADB"}/>
  <path d="m32.375 335.33c-11.028 0-20-8.972-20-20v-282.83c0-11.028 8.972-20 20-20h108.49c11.028 0 20 8.972 20 20v282.83c0 11.028-8.972 20-20 20h-108.48z" fill={isBlackSvg ? "black" : "#E0E0DC"}/>
  <path d="m154.67 292.33c0 1.1-0.9 2-2 2h-132.5c-1.1 0-2-0.9-2-2v-236.33c0-1.1 0.9-2 2-2h132.5c1.1 0 2 0.9 2 2v236.33z" fill={isBlackSvg ? "#0B0B0C" : "#E8E8E8"}/>
  <path d="m160.87 32.5c0-11.028-8.972-20-20-20h-66.01l7.462 21.625h15.678c1.818 0 3.292 1.474 3.292 3.292s-1.474 3.292-3.292 3.292h-13.406l76.275 221.03v-229.24zm-74.287-4.667c-1.634 0-2.958-1.325-2.958-2.958s1.325-2.958 2.958-2.958 2.958 1.325 2.958 2.958-1.324 2.958-2.958 2.958z" fill={isBlackSvg ? "url(#g18)" : "url(#gw18)"}/>
</g>

<path d="m138.58 7.831c0 0.55-0.45 1-1 1h-23.313c-0.55 0-1-0.45-1-1v-1.531c0-0.55 0.45-1 1-1h23.313c0.55 0 1 0.45 1 1v1.531z" fill={isBlackSvg ? "url(#g1)" : "url(#gw1)"}/>
<path d="m113.38 6.3h25.088c-0.164-0.329-0.497-0.563-0.888-0.563h-23.313c-0.39 0.001-0.72 0.234-0.89 0.563z" fill={isBlackSvg ? "url(#g2)" : "url(#gw2)"}/>
<path d="m8.5 67.958c0 0.55-0.45 1-1 1h-1.875c-0.55 0-1-0.45-1-1v-12.708c0-0.55 0.45-1 1-1h1.875c0.55 0 1 0.45 1 1v12.708z" fill={isBlackSvg ? "url(#g3)" : "url(#gw3)"}/>
<path d="m6.042 54.318c-0.385 0.139-0.667 0.5-0.667 0.932v12.708c0 0.432 0.281 0.793 0.667 0.932v-14.572z" fill={isBlackSvg ? "url(#g4)" : "url(#gw4)"}/>
<path d="m8.5 95.844c0 0.55-0.45 1-1 1h-1.39c-0.55 0-1-0.45-1-1v-9.406c0-0.55 0.45-1 1-1h1.39c0.55 0 1 0.45 1 1v9.406z" fill={isBlackSvg ? "url(#g5)" : "url(#gw5)"}/>
<path d="m6.610 85.592c-0.293 0.175-0.5 0.481-0.5 0.846v9.406c0 0.364 0.207 0.67 0.5 0.846v-11.098z" fill={isBlackSvg ? "url(#g6)" : "url(#gw6)"}/>
<path d="m8.5 123.3c0 0.55-0.45 1-1 1h-1.39c-0.55 0-1-0.45-1-1v-9.406c0-0.55 0.45-1 1-1h1.39c0.55 0 1 0.45 1 1v9.41z" fill={isBlackSvg ? "url(#g7)" : "url(#gw7)"}/>
<path d="m6.610 113.05c-0.293 0.175-0.5 0.481-0.5 0.846v9.406c0 0.364 0.207 0.67 0.5 0.846v-11.11z" fill={isBlackSvg ? "url(#g8)" : "url(#gw8)"}/>

<path d="m101.29 37.417c0 1.818-1.474 3.292-3.292 3.292h-22.831c-1.818 0-3.292-1.474-3.292-3.292s1.474-3.292 3.292-3.292h22.833c1.818 0 3.29 1.474 3.29 3.292z" fill={isBlackSvg ? "url(#g10)" : "url(#gw10)"}/>
<path d="m99.458 37.208c0 0.897-0.728 1.625-1.625 1.625h-22.625c-0.897 0-1.625-0.728-1.625-1.625s0.728-1.625 1.625-1.625h22.625c0.898 0 1.625 0.728 1.625 1.625z" fill={isBlackSvg ? "#0F0F10" : "#D8D8D6"}/>
<path d="m98.787 37.729l0.43-0.43 0.211 0.211c0.008-0.041 0.008-0.085 0.013-0.127l-0.154-0.154 0.158-0.158c-0.004-0.042-0.006-0.086-0.013-0.127l-0.215 0.215-0.43-0.43 0.407-0.407c-0.019-0.028-0.04-0.053-0.06-0.081l-0.417 0.417-0.43-0.43 0.399-0.399c-0.029-0.018-0.061-0.033-0.091-0.049l-0.378 0.378-0.43-0.43 0.136-0.136c-0.03-0.002-0.059-0.009-0.089-0.009h-0.042l-0.075 0.075-0.075-0.075h-0.142l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.115-0.115c-0.099 0.019-0.194 0.048-0.286 0.084l0.03 0.03-0.43 0.43-0.125-0.125c-0.024 0.023-0.046 0.047-0.069 0.072l0.124 0.124-0.43 0.43-0.023-0.023c-0.033 0.086-0.061 0.174-0.079 0.266l0.102-0.102 0.43 0.43-0.43 0.43-0.089-0.089c0.019 0.084 0.044 0.166 0.076 0.244l0.014-0.014 0.43 0.43-0.105 0.105c0.023 0.024 0.048 0.045 0.073 0.068l0.103-0.103 0.428 0.428c0.066 0.024 0.134 0.047 0.204 0.063l-0.061-0.061 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.083c0.018 0 0.035-0.005 0.052-0.005l-0.099-0.099 0.43-0.43 0.351 0.351c0.031-0.016 0.062-0.032 0.091-0.049l-0.372-0.372 0.43-0.43 0.398 0.398c0.02-0.027 0.044-0.05 0.063-0.077l-0.437-0.393zm-0.141-1l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.929 0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0 1l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.5-0.5l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43z" fill={isBlackSvg ? "url(#g11)" : "url(#gw11)"}/>
<path d="m98.948 36.031l0.063 0.063c-0.02-0.022-0.041-0.043-0.063-0.063z" fill={isBlackSvg ? "url(#g12)" : "url(#gw12)"}/>

<circle cx="86.583" cy="24.875" r="2.958" fill={isBlackSvg ? "url(#g13)" : "url(#gw13)"}/>
<circle cx="86.583" cy="24.875" r="1.302" fill={isBlackSvg ? "url(#g14)" : "url(#gw14)"}/>
<circle cx="85.948" cy="25.344" r=".31" fill={isBlackSvg ? "url(#g15)" : "url(#gw15)"}/>
<circle cx="87.333" cy="24.417" r=".31" fill={isBlackSvg ? "url(#g16)" : "url(#gw16)"}/>
<circle cx="86.167" cy="24.314" r=".457" fill={isBlackSvg ? "url(#g17)" : "url(#gw17)"}/>

<circle cx="85.708" cy="315.12" r="14.708" fill={isBlackSvg ? "black" : "url(#gw_homeW)"}/>
<path d="m85.708 300.73c8.071 0 14.616 6.501 14.701 14.552 0-0.053 0.008-0.104 0.008-0.156 0-8.124-6.585-14.708-14.708-14.708s-14.712 6.59-14.712 14.71c0 0.053 0.007 0.104 0.008 0.156 0.085-8.05 6.63-14.55 14.7-14.55z" fill={isBlackSvg ? "url(#g19)" : "url(#gw19)"}/>
<path d="m88.329 320.58h-5.281c-1.654 0-3-1.346-3-3v-5.208c0-1.654 1.346-3 3-3h5.281c1.654 0 3 1.346 3 3v5.208c0 1.66-1.346 3-3 3zm-5.281-10.2c-1.103 0-2 0.897-2 2v5.208c0 1.103 0.897 2 2 2h5.281c1.103 0 2-0.897 2-2v-5.208c0-1.103-0.897-2-2-2h-5.281z" fill={isBlackSvg ? "url(#g20)" : "url(#gw20)"}/>
<path d="m85.708 316.38c-5.415 0-10.456-0.358-14.694-0.972 0.149 7.994 6.665 14.43 14.694 14.43s14.545-6.437 14.694-14.43c-4.235 0.61-9.276 0.97-14.692 0.97z" fill={isBlackSvg ? "url(#g21)" : "url(#gw21)"}/>
            </svg>
            
            <div onClick={()=>{ if(asleep){wake();}else{setApp(null);setThread(null);setScreen("lock");sleep();} }}
              style={{position:"absolute",top:"1.5%",left:"64.5%",width:"14.6%",height:"3.2%",cursor:"pointer",zIndex:5}}/>
            
            <div onClick={()=>{ if(asleep){wake();}else{onHome();} }}
              style={{position:"absolute",
              top:`${(315.12-14.708)/349.592*100}%`,
              left:`${(85.708-14.708)/174.097*100}%`,
              width:`${29.416/174.097*100}%`,
              height:`${29.416/349.592*100}%`,
              borderRadius:"50%",cursor:"pointer",zIndex:3}}/>
            
            <div onClick={()=>{wake();}} style={{
              position:"absolute",
              top:`${56.167/349.592*100}%`, left:`${20/174.097*100}%`,
              width:`${133/174.097*100}%`, height:`${236.71/349.592*100}%`,
              background:"#000", zIndex:4, cursor:"pointer",
              pointerEvents: asleep ? "auto" : "none",
              opacity: asleep ? 1 : 0,
              transition:"opacity 0.5s ease",
            }}/>
          </div>
          </>
        </DevCtx.Provider>
      );
    }
    // CSS chassis fallback
    return (
    <DevCtx.Provider value={devOv}>
      <>
      <div style={{width:phoneW,height:phoneH,position:"relative",flexShrink:0,fontFamily:FF_IOS}}>
        <div style={{position:"absolute",inset:0,borderRadius:chassisBROv,background:chassisGradOv,boxShadow:`${boxShadowOv},inset 0 1px 0 rgba(255,255,255,0.9)`}}>
          <div style={{position:"absolute",top:14,left:"50%",transform:"translateX(-50%)",width:8,height:8,borderRadius:"50%",background:bezelText}}/>
          <div style={{position:"absolute",bottom:scrBot+16,left:"50%",transform:`translateX(-${earpieceWOv/2}px)`,width:earpieceWOv,height:6,borderRadius:3,background:earpieceColOv}}/>
          <div onClick={onHome} style={{position:"absolute",bottom:17,left:"50%",transform:"translateX(-50%)",width:homeBtnSizeOv,height:homeBtnSizeOv,borderRadius:"50%",background:homeBtnBgOv,border:homeBtnBorder,boxShadow:`0 0 0 2px ${homeBtnRing}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{width:18,height:18,borderRadius:4,border:homeBtnBorder}}/>
          </div>
        </div>
        <div style={{position:"absolute",top:scrTop,left:scrLeft,right:scrRight,bottom:scrBot,overflow:"hidden",display:"flex",flexDirection:"column",background:isWhite?"#e0e0dc":"#111"}}>
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0}}>{children}</div>
        </div>
      </div>
      </>
    </DevCtx.Provider>
    );
  };
  // LOCK
  if(screen==="lock") {
    const lsOv = (data.devOverrides?.lockScreen)||{};
    const clockTopPct = lsOv.clockTop ?? 12;
    const showLinen = (lsOv.showLinen ?? "yes") === "yes";
    const notifIcon = (appId) => ({
      iconSrc: data.appIcons?.[appId] || null,
      emoji: APP_META[appId]?.iosIcon || "💬",
      color: (APP_COLORS[appId] || ["#8e8e93"])[0],
    });
    const lockNotifs = (() => {
      const seed = (data.notifications && data.notifications.length)
        ? [...data.notifications].sort((a,b)=>loreSortKey(b.time)-loreSortKey(a.time))
        : [];
      // Enrich notifs dynamically from live data
      const result = [];

      // Helpers
      const resolveGmail = (n) => {
        const rawMailList = data.mail_override?.[data.username] ?? (EMAILS_BY_CHAR[data.username] || []);
        const mailList = Array.isArray(rawMailList) ? rawMailList : [];
        const mail = mailList.find(m => m.from && (m.from === n.title || m.from.startsWith(n.title)));
        if(mail) {
          const preview = mail.preview || "";
          const cropped = preview.length > 60 ? preview.slice(0,60).trimEnd()+"…" : preview;
          return {title:mail.from, text:cropped, time:fmtTime(n.time), raw:n.time, ...notifIcon("gmail")};
        }
        return {title:n.title, text:n.text, time:fmtTime(n.time), raw:n.time, ...notifIcon("gmail")};
      };

      const resolveTwitter = (n) => {
        const allTweets = [
          ...(TWITTER_HOME_BASE[charKey]||[]),
          ...(data.homeBaseTweets||[]),
          ...(data.sharedThreads?._sharedTweets||[]),
        ];
        const tweet = allTweets.find(t => t.name === n.title || t.h?.replace("@","") === n.title.replace("@","").split(" ")[0]);
        if(tweet) return {title:tweet.name||n.title, text:tweet.text||n.text, time:fmtTime(n.time), raw:n.time, ...notifIcon("twitter")};
        return {title:n.title, text:n.text, time:fmtTime(n.time), raw:n.time, ...notifIcon("twitter")};
      };

      const resolveReddit = (n) => {
        const posts = (data.reddit && data.reddit.length > 0) ? data.reddit : REDDIT_ALL_POSTS;
        const userPosts = data.redditUserPosts || [];
        const allPosts = [...userPosts, ...posts];
        // For reddit, just use the seed text — sub names are in the text itself
        return {title:n.title, text:n.text, time:fmtTime(n.time), raw:n.time, ...notifIcon("reddit")};
      };

      const resolveSnapchat = (n) => {
        const snapList = (data.snaps && data.snaps.length > 0) ? data.snaps : (SNAPCHAT_DEFAULTS[charKey] || []);
        const snap = snapList.find(s => s.contact === n.title || s.contact.replace(/ [^\s]+$/,"") === n.title.replace(/ [^\s]+$/,""));
        if(snap) return {title:snap.contact, text:"vous a envoyé un Snap 👻", time:fmtTime(n.time), raw:n.time, ...notifIcon("snapchat")};
        return {title:n.title, text:n.text, time:fmtTime(n.time), raw:n.time, ...notifIcon("snapchat")};
      };

      const resolveSoundCloud = (n) => {
        const sc = data.soundcloud || {};
        const trackName = sc.trackName || "Rush";
        return {title:"SoundCloud", text:`Votre track ${trackName} a reçu de nouveaux j'aime 🎧`, time:fmtTime(n.time), raw:n.time, ...notifIcon("soundcloud")};
      };

      seed.forEach(n => {
        if(n.app === "gmail") { result.push(resolveGmail(n)); return; }
        if(n.app === "twitter") { result.push(resolveTwitter(n)); return; }
        if(n.app === "reddit") { result.push(resolveReddit(n)); return; }
        if(n.app === "snapchat") { result.push(resolveSnapchat(n)); return; }
        if(n.app === "soundcloud") { result.push(resolveSoundCloud(n)); return; }
        if(n.app !== "messages") {
          result.push({title:n.title, text:n.text, time:fmtTime(n.time), raw:n.time, ...notifIcon(n.app)});
          return;
        }
        // messages: find matching conversation
        const conv = (data.messages||[]).find(m => m.contact === n.title || m.contact.replace(/ [^\s]+$/,"") === n.title.replace(/ [^\s]+$/,""));
        if(!conv) {
          result.push({title:n.title, text:n.text, time:fmtTime(n.time), raw:n.time, ...notifIcon("messages")});
          return;
        }
        const t = getThread(conv);
        if(conv.isGroup) {
          const groupMsgs = t.slice(-5).filter(msg => msg.from !== "me").slice(-3);
          groupMsgs.forEach(msg => {
            const sender = msg.senderName || CHAR_NAMES[msg.senderKey] || msg.from;
            result.push({
              title: conv.contact,
              text: sender ? `${sender} : ${msg.text||""}` : (msg.text||""),
              time: fmtTime(msg.time), raw: msg.time,
              ...notifIcon("messages"),
            });
          });
        } else {
          const incoming = t.filter(msg => msg.from === "them");
          const last = incoming[incoming.length-1];
          if(last) {
            result.push({title:conv.contact, text:last.text||"", time:fmtTime(last.time), raw:last.time, ...notifIcon("messages")});
          } else {
            result.push({title:n.title, text:n.text, time:fmtTime(n.time), raw:n.time, ...notifIcon("messages")});
          }
        }
      });
      // Also add unread convs not covered by seed
      (data.messages||[]).filter(m=>m.unread && !seed.some(n=>n.app==="messages"&&(n.title===m.contact||n.title.startsWith(m.contact.split(" ")[0])))).forEach(m=>{
        const t = getThread(m);
        if(!t.length) return;
        if(m.isGroup) {
          t.slice(-3).filter(msg=>msg.from!=="me").forEach(msg=>{
            const sender = msg.senderName || CHAR_NAMES[msg.senderKey] || msg.from;
            result.push({title:m.contact, text:sender?`${sender} : ${msg.text||""}`:(msg.text||""), time:fmtTime(msg.time), raw:msg.time, ...notifIcon("messages")});
          });
        } else {
          const incoming = t.filter(msg=>msg.from==="them");
          const last = incoming[incoming.length-1];
          if(last) result.push({title:m.contact, text:last.text||"", time:fmtTime(last.time), raw:last.time, ...notifIcon("messages")});
        }
      });
      // Keep only notifs from today (loreDate day+month)
      const [ly,lm,ld] = loreDate.split('-').map(Number);
      const todayOnly = result.filter(n => {
        const p = parseLoreTime(n.raw||n.time);
        if(!p) return true; // keep if unparseable
        return p.day===ld && p.month===lm;
      });
      return todayOnly.sort((a,b)=>loreSortKey(b.raw||b.time)-loreSortKey(a.raw||a.time));
    })();
    const carrier = data.carrier || (charKey==="eoghan" ? "Verizon" : "AT&T");
    return (
    <LoreDateCtx.Provider value={loreDate}>
    <Chassis onHome={()=>setScreen("home")}>
      <div style={{flex:1,overflow:"hidden",position:"relative"}}>
        <IOSLockContent bgStyle={bgStyle} devOverrides={data.devOverrides} scale={1} onUnlock={()=>setScreen("home")} notifications={lockNotifs} carrier={carrier}/>
      </div>
    </Chassis>
    </LoreDateCtx.Provider>
    );
  }

  // HOME
  if(screen==="home"&&!app) {
    const isBgImg2 = data.wallpaper?.startsWith("data:") || data.wallpaper?.startsWith("http") || data.wallpaper?.startsWith("/");
    const homeBg = isBgImg2 ? {backgroundImage:`url(${data.wallpaper})`,backgroundSize:"cover",backgroundPosition:"center"} : {background:data.wallpaper};
    return (
    <Chassis onHome={()=>setScreen("lock")}>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",position:"relative",...homeBg,fontFamily:FF_IOS}}>
        <IOSStatusBar mode="home"/>
        <DraggableHomescreen data={data} update={update} appIcon={appIcon} badge={badge} goApp={id=>{
          const IOS_APPS=['calendar','facebook','gmail','groupme','insta','messages','music','nikeplus','notes','phone','photos','gallery','pinterest','safari','settings','snapchat','soundcloud','starbucks','tumblr','twitter','weather','wikipedia','grindr','reddit','vpn','youtube','contacts','files'];
          if(IOS_APPS.includes(id)){setThread(null);if(id==="contacts")setPhonePanel("contacts");setApp(id==="gallery"?"photos":id==="contacts"?"phone":id);if(id==="safari"||id==="browser"){setBrowserTab("search");}}
        }} os="ios" accent={accent} admin={admin} charKey={charKey} noWallpaper/>
      </div>
    </Chassis>
    );
  }

  // APP SHELL
  const Shell = ({children}) => (
    <LoreDateCtx.Provider value={loreDate}>
      <Chassis>
        <div style={{flex:1,display:"flex",flexDirection:"column",background:"#fff",overflow:"hidden",fontFamily:FF_IOS}}>{children}</div>
      </Chassis>
    </LoreDateCtx.Provider>
  );

  if(app==="photos") {
    // iOS 6 Photos app
    const allPhotos   = data.gallery || [];
    const activePhotos  = allPhotos.filter(p=>!p.deleted);
    const deletedPhotos = allPhotos.filter(p=>p.deleted);

    // ── Photo detail view ─────────────────────────────────────────────────
    if(photoDetail!==null) {
      let list = galleryView==="recently_deleted" ? deletedPhotos : (galleryView==="camera_roll"||galleryView==="albums") ? activePhotos : allPhotos.filter(p=>!p.deleted && String(p.album)===String(galleryView));
      // Camera Roll trie par date dès qu'au moins une photo en a une (cf. grille plus bas) — il faut
      // appliquer EXACTEMENT le même tri ici (fonction partagée), sinon l'index cliqué dans la grille
      // ne correspond plus à la bonne photo dans cette liste.
      if(galleryView==="camera_roll"||galleryView==="albums") list = sortGalleryPhotos(list);
      const photo = list[photoDetail];
      const prev = photoDetail > 0 ? photoDetail-1 : null;
      const next = photoDetail < list.length-1 ? photoDetail+1 : null;
      return (
        <Shell>
          <IOSStatusBar mode="home"/>
          <NavBar title={loreDateOnly(photo?.date)||""} back={()=>setPhotoDetail(null)}/>
          <div style={{flex:1,background:"#000",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
            {photo?.src
              ? <img src={photo.src} style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}}/>
              : <div style={{color:"#555",fontSize:13,textAlign:"center",padding:16}}>{photo?.desc||"No Photo"}</div>}
            {prev!==null&&<button onClick={()=>setPhotoDetail(prev)} style={{position:"absolute",left:6,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.4)",border:"none",color:"#fff",fontSize:22,borderRadius:4,padding:"4px 8px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M7 1L1 7l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></button>}
            {next!==null&&<button onClick={()=>setPhotoDetail(next)} style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.4)",border:"none",color:"#fff",borderRadius:4,padding:"6px 10px",cursor:"pointer",display:"flex",alignItems:"center"}}><svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M1 1l6 6-6 6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></button>}
            <span style={{position:"absolute",bottom:8,left:"50%",transform:"translateX(-50%)",color:"rgba(255,255,255,0.6)",fontSize:11}}>{photoDetail+1} / {list.length}</span>
          </div>
        </Shell>
      );
    }

    // iOS 6 Photos NavBar — gray gradient + "Albums" pill on left
    const PhotosNavBar = ({title, onBack, backLabel="Albums"}) => {
      const tSize = title.length > 16 ? 13 : title.length > 12 ? 15 : 18;
      return (
      <div style={{background:"linear-gradient(180deg,#b8b8b8 0%,#909090 45%,#7c7c7c 100%)",borderBottom:"1px solid #555",height:44,display:"flex",alignItems:"center",padding:"0 8px",flexShrink:0,fontFamily:FF_IOS}}>
        {onBack
          ? <button onClick={onBack} style={{background:"linear-gradient(180deg,#444,#222)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:5,padding:"4px 8px",color:"#fff",fontSize:12,fontWeight:"600",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:backLabel?3:0,flexShrink:0,width:backLabel?70:28,boxSizing:"border-box",textShadow:"0 -1px 0 rgba(0,0,0,0.5)"}}>
              <svg width="6" height="10" viewBox="0 0 7 12" fill="none"><path d="M6 1L1 6L6 11" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {backLabel&&<span>{backLabel}</span>}
            </button>
          : <div style={{width:70}}/>}
        <div style={{flex:1,textAlign:"center",color:"#fff",fontWeight:"700",fontSize:tSize,textShadow:"0 -1px 0 rgba(0,0,0,0.5)",pointerEvents:"none",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{title}</div>
        <div style={{width:backLabel?70:28}}/>
      </div>
      );
    };
    // Bottom toolbar — share + slideshow
    const PhotosToolbar = () => (
      <div style={{background:"linear-gradient(180deg,#b8b8b8 0%,#909090 45%,#7c7c7c 100%)",borderTop:"1px solid #555",height:44,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",flexShrink:0}}>
        <button style={{background:"none",border:"none",cursor:"pointer",padding:4,opacity:0.75}}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="2" y="8" width="12" height="12" rx="2" stroke="#fff" strokeWidth="1.5"/><path d="M8 7V2M8 2L5 5M8 2L11 5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <button style={{background:"none",border:"none",cursor:"pointer",padding:4,opacity:0.75}}>
          <svg width="20" height="22" viewBox="0 0 20 22" fill="none"><path d="M3 2l16 9L3 20V2z" fill="#fff"/></svg>
        </button>
      </div>
    );

    // ── Grid view (Camera Roll or Recently Deleted) ───────────────────────
    if(galleryView!=="albums") {
      const isDeleted = galleryView==="recently_deleted";
      const rawList = isDeleted ? deletedPhotos : activePhotos;
      // Si au moins une photo a une date réelle (dateISO, posée via le sélecteur de date en admin),
      // on trie tout par date (plus récent en premier) et on insère des séparateurs par année.
      // Sinon, on garde l'ordre manuel (drag & drop) exactement comme avant, pour ne rien casser
      // pour les parties déjà en cours qui n'ont pas encore daté leurs photos.
      const hasDates = !isDeleted && rawList.some(p=>p.dateISO);
      const list = isDeleted ? rawList : sortGalleryPhotos(rawList);
      return (
        <Shell>
          <IOSStatusBar mode="home"/>
          <PhotosNavBar title={isDeleted?"Recently Deleted":"Camera Roll"} onBack={()=>{setPhotoDetail(null);setGalleryView("albums");}}/>
          {isDeleted&&<div style={{background:"#e5e5ea",borderBottom:"0.5px solid #c8c7cc",padding:"6px 12px"}}>
            <span style={{color:"#6b6b70",fontSize:10}}>Items will be permanently deleted after 30 days.</span>
          </div>}
          <div style={{flex:1,background:"#f2f2f7",overflowY:"auto"}}>
            {hasDates ? (
              // Vue groupée par année (lecture seule pour l'ordre — il suit les dates)
              (()=>{
                const groups = groupGalleryByMonth(list);
                return groups.map(g=>(
                  <div key={g.label}>
                    <div style={{padding:"8px 12px 4px",fontSize:13,fontWeight:700,color:"#3a3a3c"}}>{g.label}</div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,padding:"0 8px 8px"}}>
                      {g.photos.map(photo=>{
                        const i = list.indexOf(photo);
                        return (
                        <div key={photo.id}
                          style={{aspectRatio:"1",background:photo.color||"#e5e5ea",position:"relative",cursor:"pointer",overflow:"hidden"}}
                          onClick={()=>setPhotoDetail(i)}>
                          {photo.src?<img src={photo.src} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:null}
                        </div>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()
            ) : (
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,padding:8}}>
              {list.map((photo,i)=>(
                <div key={photo.id}
                  style={{
                    aspectRatio:"1",background:photo.color||"#e5e5ea",position:"relative",cursor:"pointer",overflow:"hidden",
                  }}
                  onClick={()=>setPhotoDetail(i)}>
                  {photo.src?<img src={photo.src} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:null}
                </div>
              ))}
            </div>
            )}
          </div>
          <PhotosToolbar/>
        </Shell>
      );
    }

    // ── Albums view (top level) ────────────────────────────────────────────
    const customAlbums = data.galleryAlbums || [];
    const AlbumRow = ({label,count,photos,onTap,cover=null,dim=false}) => (
      <div onClick={onTap} style={{background:"#fff",borderBottom:"0.5px solid #c8c7cc",display:"flex",alignItems:"center",padding:"8px 12px",gap:12,cursor:"pointer",opacity:dim?0.55:1}}>
        <div style={{width:56,height:56,position:"relative",flexShrink:0}}>
          {cover
            ? <div style={{position:"absolute",inset:0,borderRadius:2,overflow:"hidden"}}><img src={cover} style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>
            : [2,1,0].map((offset,k)=>(
                <div key={k} style={{position:"absolute",inset:offset*2,background:photos[k]?.color||"#c8c7cc",borderRadius:2,boxShadow:"0 1px 2px rgba(0,0,0,0.25)",overflow:"hidden"}}>
                  {photos[k]?.src&&<img src={photos[k].src} style={{width:"100%",height:"100%",objectFit:"cover"}}/>}
                </div>
              ))}
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:15,color:"#000",fontWeight:400,marginBottom:2}}>{label}</div>
          <div style={{fontSize:12,color:"#8e8e93"}}>{count}</div>
        </div>
        <span style={{color:"#c8c7cc",lineHeight:1}}><svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
      </div>
    );

    // Grid view pour album custom
    if(galleryView!=="albums" && galleryView!=="camera_roll" && galleryView!=="recently_deleted") {
      const albumId = galleryView;
      const album = customAlbums.find(a=>String(a.id)===String(albumId));
      const albumPhotos = allPhotos.filter(p=>!p.deleted && String(p.album)===String(albumId));
      if(photoDetail!==null) {
        const photo = albumPhotos[photoDetail];
        const prev = photoDetail > 0 ? photoDetail-1 : null;
        const next = photoDetail < albumPhotos.length-1 ? photoDetail+1 : null;
        return (
          <Shell>
            <IOSStatusBar mode="home"/>
            <NavBar title={loreDateOnly(photo?.date)||""} back={()=>setPhotoDetail(null)}/>
            <div style={{flex:1,background:"#000",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
              {photo?.src?<img src={photo.src} style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}}/>:<div style={{color:"#555",fontSize:13,padding:16}}>{photo?.desc||"No Photo"}</div>}
              {prev!==null&&<button onClick={()=>setPhotoDetail(prev)} style={{position:"absolute",left:6,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.4)",border:"none",color:"#fff",borderRadius:4,padding:"4px 8px",cursor:"pointer"}}><svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M7 1L1 7l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></button>}
              {next!==null&&<button onClick={()=>setPhotoDetail(next)} style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.4)",border:"none",color:"#fff",borderRadius:4,padding:"6px 10px",cursor:"pointer",display:"flex",alignItems:"center"}}><svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M1 1l6 6-6 6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></button>}
              <span style={{position:"absolute",bottom:8,left:"50%",transform:"translateX(-50%)",color:"rgba(255,255,255,0.6)",fontSize:11}}>{photoDetail+1} / {albumPhotos.length}</span>
            </div>
          </Shell>
        );
      }
      return (
        <Shell>
          <IOSStatusBar mode="home"/>
          <PhotosNavBar title={album?.name||"Album"} onBack={()=>{setPhotoDetail(null);setGalleryView("albums");}}/>
          <div style={{flex:1,background:"#f2f2f7",overflowY:"auto"}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,padding:8}}>
              {albumPhotos.map((photo,i)=>(
                <div key={photo.id} style={{aspectRatio:"1",background:photo.color||"#e5e5ea",cursor:"pointer",overflow:"hidden"}} onClick={()=>setPhotoDetail(i)}>
                  {photo.src?<img src={photo.src} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:null}
                </div>
              ))}
            </div>
          </div>
          <PhotosToolbar/>
        </Shell>
      );
    }

    return (
      <Shell>
        <IOSStatusBar mode="home"/>
        <PhotosNavBar title="Albums" onBack={goHome} backLabel=""/>
        <div style={{flex:1,background:"#f2f2f7",overflowY:"auto"}}>
          <AlbumRow label="Camera Roll" count={`${activePhotos.length} Photo${activePhotos.length!==1?"s":""}`} photos={[...activePhotos].reverse().slice(0,3)} onTap={()=>setGalleryView("camera_roll")}/>
          {customAlbums.map(album=>{
            const albumPhotos = allPhotos.filter(p=>!p.deleted && String(p.album)===String(album.id));
            return (
              <AlbumRow key={album.id} label={album.name||"Album"} count={`${albumPhotos.length} Photo${albumPhotos.length!==1?"s":""}`} photos={[...albumPhotos].reverse().slice(0,3)} cover={album.cover} onTap={()=>{setPhotoDetail(null);setGalleryView(String(album.id));}}/>
            );
          })}
          <AlbumRow label="Recently Deleted" count={`${deletedPhotos.length} Photo${deletedPhotos.length!==1?"s":""}`} photos={[...deletedPhotos].reverse().slice(0,3)} onTap={()=>setGalleryView("recently_deleted")}/>
        </div>
        <PhotosToolbar/>
      </Shell>
    );
  }

  if(app==="messages"&&thread===null) {
    const renderConvRow = (msg, i, dim=false) => (
        <div key={msg.id} onClick={()=>setThread(i)} style={{background:"#fff",borderBottom:"0.5px solid #c8c7cc",display:"flex",cursor:"pointer",alignItems:"stretch",opacity:dim?0.55:1}}>
            
            <div style={{width:18,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",paddingLeft:6}}>
              {msg.unread&&<div style={{width:10,height:10,borderRadius:"50%",background:"#007aff"}}/>}
            </div>
            <div style={{width:52,display:"flex",alignItems:"center",justifyContent:"center",padding:"10px 0 10px 4px",flexShrink:0}}>
              <div style={{width:38,height:38,borderRadius:"50%",background:`linear-gradient(135deg,${accent}88,${accent}44)`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:15,border:`1.5px solid ${accent}66`}}>{msg.contact[0]}</div>
            </div>
            <div style={{flex:1,padding:"10px 0 10px 10px",minWidth:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:2}}>
                <div style={{fontWeight:msg.unread?700:600,fontSize:14,color:"#000"}}>{msg.contact}</div>
                {(()=>{const _t=getThread(msg);const _l=_t[_t.length-1];return <span style={{fontSize:12,color:msg.unread?"#007aff":"#8e8e93",fontWeight:msg.unread?600:400,flexShrink:0,marginRight:12}}>{fmtTime(_l?.time)}</span>;})()}
              </div>
              <div style={{fontSize:13,color:msg.unread?"#000":"#8e8e93",fontWeight:msg.unread?500:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginRight:12}}>{(()=>{const _t=getThread(msg);return _t[_t.length-1]?.text;})()}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",paddingRight:8,gap:6}}>
              <span style={{color:"#c8c7cc",lineHeight:1}}><svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
            </div>
        </div>
    );
    const deletedConvs = data.messages.map((m,i)=>[m,i]).filter(([m])=>m.deleted);
    if(msgView==="deleted") return (
    <Shell><IOSStatusBar/><NavBar title="Deleted Conversations" back={()=>setMsgView("inbox")}/>
      <div style={{flex:1,background:"#f2f2f7",overflowY:"auto",minHeight:0}}>
        <div style={{padding:"10px 14px",fontSize:11,color:"#8e8e93",background:"#e9e9ee",borderBottom:"0.5px solid #c8c7cc"}}>These conversations have been removed from your inbox.</div>
        {deletedConvs.length===0
          ? <div style={{padding:24,textAlign:"center",color:"#8e8e93",fontSize:13}}>No deleted conversations.</div>
          : deletedConvs.map(([m,i])=>renderConvRow(m,i,true))}
      </div>
    </Shell>
    );
    return (
    <Shell><IOSStatusBar/><NavBar title="Messages" back={goHome}/>
      <div style={{flex:1,background:"#f2f2f7",overflowY:"auto",minHeight:0}}>
        {deletedConvs.length>0 && (
          <div onClick={()=>setMsgView("deleted")} style={{background:"#e9e9ee",borderBottom:"0.5px solid #c8c7cc",padding:"11px 14px",display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
            <span style={{fontSize:15}}>🗑️</span>
            <span style={{flex:1,fontSize:13,fontWeight:600,color:"#8e8e93"}}>Deleted Conversations</span>
            <span style={{fontSize:12,color:"#8e8e93"}}>{deletedConvs.length}</span>
            <span style={{color:"#c8c7cc",lineHeight:1}}><svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
          </div>
        )}
        {(()=>{const sp=data.messages.map((m,i)=>[m,i]).filter(([m])=>!m.deleted).sort(([a],[b])=>{const ta=getThread(a),tb=getThread(b);return loreSortKey(tb[tb.length-1]?.time)-loreSortKey(ta[ta.length-1]?.time);});return sp.map(([msg,i])=>renderConvRow(msg,i,false));})()}
      </div>
    </Shell>
    );
  }

  if(app==="messages"&&thread!==null){
    const conv=data.messages[thread]; if(!conv) return null;
    const resolvedThread=getThread(conv);
    const AND_CONTACTS = ['drew','elias','gwen','nils','abby','hector','matthew','louis','vicky','james','harry','asra','nayati','sophie'];
    const contactLower = (conv.contact||'').toLowerCase();
    const isAndroidContact = AND_CONTACTS.some(n=>contactLower.includes(n));
    const meBg    = isAndroidContact ? "linear-gradient(180deg,#5AD265,#3DBF56)" : "linear-gradient(180deg,#1D85FB,#0A6EE8)";
    const sendBtnBg = isAndroidContact ? "#4CD964" : "#147EFB";
    return (
      <Shell>
        <IOSStatusBar/>
        <NavBar title={conv.contact} back={()=>setThread(null)}/>
        <div ref={el=>{if(el)setTimeout(()=>{el.scrollTop=el.scrollHeight;},0)}}
          style={{flex:1,background:"#b2bbc6",overflowY:"auto",padding:"8px 0",display:"flex",flexDirection:"column",minHeight:0,WebkitOverflowScrolling:"touch"}}>
          {resolvedThread.map((msg,mi)=>{
            const isMe=msg.from==="me";
            const nextMsg = resolvedThread[mi+1];
            // Afficher l'heure seulement sous le DERNIER message d'une série consécutive du même
            // expéditeur — comme iMessage. Avant, nextMsg.time!==msg.time déclenchait l'affichage
            // dès que deux messages reçus avaient des heures différentes, donc chaque message "them"
            // avait sa propre heure même au milieu d'une série. Maintenant uniquement au changement
            // d'expéditeur ou en fin de fil.
            const showTime = !nextMsg || nextMsg.from!==msg.from || (conv.isGroup && nextMsg.senderKey!==msg.senderKey);
            const dayChanged = loreDayKey(msg.time)!==null && (mi===0 || loreDayKey(resolvedThread[mi-1]?.time)!==loreDayKey(msg.time));
            const dateLabel = loreDateLabel(msg.time);
            return (
              <React.Fragment key={mi}>
              {dayChanged && dateLabel &&
                <div style={{textAlign:"center",fontSize:10.5,color:"#8e8e93",fontWeight:400,padding:"12px 0 6px",letterSpacing:0.2}}>{dateLabel}</div>}
              <div style={{display:"flex",flexDirection:"column",alignItems:isMe?"flex-end":"flex-start",padding:"1px 10px",gap:0}}>
                {conv.isGroup && !isMe && (mi===0 || resolvedThread[mi-1]?.senderKey!==msg.senderKey) &&
                  <span style={{fontSize:10,color:"#5b6b7a",fontWeight:600,padding:"3px 6px 1px"}}>{msg.senderName}</span>}
                <div style={{
                  maxWidth:"75%",
                  background:msg.img?"transparent":(isMe ? meBg : "linear-gradient(180deg,#f2f2f2,#e0e0e0)"),
                  color:isMe?"#fff":"#000",
                  borderRadius:isMe?"18px 18px 3px 18px":"18px 18px 18px 3px",
                  padding:msg.img?0:"7px 12px",
                  fontSize:14,
                  lineHeight:1.35,
                  fontFamily:FF_IOS,
                  boxShadow:msg.img?"none":(isMe
                    ?"0 1px 2px rgba(0,0,80,0.3),inset 0 1px 0 rgba(255,255,255,0.2)"
                    :"0 1px 2px rgba(0,0,0,0.15),inset 0 1px 0 rgba(255,255,255,0.85)"),
                  border:msg.img?"none":(isMe?"none":"1px solid rgba(0,0,0,0.1)"),
                  wordBreak:"break-word",
                  overflow:msg.img?"hidden":"visible",
                }}>
                  {msg.img && <img src={msg.img} style={{maxWidth:"100%",display:"block",borderRadius:msg.text?"18px 18px 0 0":(isMe?"18px 18px 3px 18px":"18px 18px 18px 3px")}}/>}
                  {msg.text && <div style={{padding:msg.img?"6px 12px":0}}>{msg.text}</div>}
                </div>
                {showTime&&<span style={{fontSize:10,color:"#555e6b",padding:"2px 4px",fontFamily:FF_IOS}}>{loreRelativeLabel(msg.time,loreDate)}</span>}
              </div>
              </React.Fragment>
            );
          })}
        </div>
        <div style={{background:"linear-gradient(180deg,#c6ccd4,#b8bec6)",borderTop:"1px solid #8a9099",padding:"5px 8px",display:"flex",alignItems:"center",gap:6,flexShrink:0,boxShadow:"inset 0 1px 0 rgba(255,255,255,0.35)"}}>
          <div style={{flex:1,background:"linear-gradient(180deg,#fff,#f4f4f4)",border:"1px solid #9a9a9a",borderRadius:14,padding:"5px 12px",fontSize:13,color:"#aaa",fontFamily:FF_IOS,boxShadow:"inset 0 1px 3px rgba(0,0,0,0.12)"}}>iMessage</div>
          <div style={{width:30,height:30,borderRadius:"50%",background:sendBtnBg,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:15,fontWeight:700,boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}>↑</div>
        </div>
      </Shell>
    );
  }

  if(app==="insta") return <Shell><IOSStatusBar/><InstaScreen data={data} isIos={true} accent={accent} onBack={goHome}/></Shell>;

  if(app==="music") return <Shell><IOSStatusBar/><MusicScreen data={data} admin={admin} update={update} accent={accent} isIos={true} goHome={goHome}/></Shell>;
  if(app==="snapchat") return <Shell><IOSStatusBar/><NavBar title="Snapchat" back={goHome}/><SnapchatScreen data={data} admin={admin} update={update}/></Shell>;
  if(app==="grindr") return (
    <Shell><IOSStatusBar/><NavBar title="Grindr" back={goHome}/><GrindrScreen data={data} admin={admin} update={update}/></Shell>
  );
  if(app==="files")     return <Shell><IOSStatusBar/><FilesScreen data={data} isIos={true} accent={accent} onBack={goHome}/></Shell>;
  if(app==="safari"||app==="browser") return <Shell><IOSStatusBar/><NavBar title="Safari" back={goHome}/><BrowserScreen data={data} admin={admin} update={update} accent={accent} isIos={true} tab={browserTab} setTab={setBrowserTab}/></Shell>;
  if(app==="phone") return <Shell><IOSStatusBar/><PhoneScreen data={data} admin={admin} update={update} accent={accent} isIos={true} panel={phonePanel} setPanel={setPhonePanel}/></Shell>;
  if(app==="notes") return <Shell><IOSStatusBar/><NotesScreen data={data} admin={admin} update={update} accent={accent} isIos={true} noteOpen={noteOpen} setNoteOpen={setNoteOpen} goHome={goHome}/></Shell>;
  if(app==="tumblr")    return <Shell><IOSStatusBar/><TumblrScreen data={data} admin={admin} update={update} onUpdateShared={onUpdateShared} accent={accent} onBack={goHome}/></Shell>;
  if(app==="twitter")   return <Shell><IOSStatusBar/><TwitterScreen data={data} isIos={true} accent={accent} onBack={goHome} sharedTweets={data.sharedThreads?._sharedTweets||[]} twitterUsers={{...(data.sharedThreads?._sharedTwitterUsers||{}),...(data.twitterUsers||{})}} homeBaseTweets={data.homeBaseTweets||[]} onUpdateShared={onUpdateShared}/></Shell>;
  if(app==="nikeplus")  return <Shell><IOSStatusBar/><NavBar title="Nike+" back={goHome}/><NikeplusScreen data={data} accent={accent}/></Shell>;
  if(app==="youtube")   return <Shell><IOSStatusBar/><YouTubeScreen isIos={true} charKey={charKey} data={data} onBack={goHome}/></Shell>;
  if(app==="reddit")     return <Shell><IOSStatusBar/><NavBar title="Reddit" back={goHome}/><RedditScreen data={data} isIos={true} accent={accent}/></Shell>;
  if(app==="vpn")        return <Shell><IOSStatusBar/><NavBar title="VPN" back={goHome}/><VPNScreen isIos={true} data={data} accent={accent}/></Shell>;
  if(app==="wikipedia")  return <Shell><IOSStatusBar/><NavBar title="Wikipedia" back={goHome}/><WikipediaScreen isIos={true} accent={accent} charKey={charKey} data={data}/></Shell>;
  if(app==="calendar")  return <Shell><IOSStatusBar/><NavBar title="Calendar" back={goHome}/><CalendarScreen data={data} isIos={true} accent={accent} admin={admin} update={update}/></Shell>;
  if(app==="settings")  return <Shell><IOSStatusBar/><NavBar title="Settings" back={goHome}/><SettingsScreen data={data} isIos={true} accent={accent}/></Shell>;
  if(app==="weather")   return <Shell><IOSStatusBar/><NavBar title="Weather" back={goHome}/><WeatherScreen isIos={true} accent={accent} data={data} update={update} admin={admin}/></Shell>;
  if(app==="facebook")  return <Shell><IOSStatusBar/><NavBar title="Facebook" back={goHome}/><FacebookScreen data={data} isIos={true} accent={accent}/></Shell>;
  if(app==="gmail")     return <Shell><IOSStatusBar/><GmailScreen data={data} isIos={true} accent={accent} onBack={goHome}/></Shell>;
  if(app==="pinterest") return <Shell><IOSStatusBar/><PinterestScreen isIos={true} data={data} admin={admin} update={update}/></Shell>;
  if(app==="groupme")   return <Shell><IOSStatusBar/><NavBar title="GroupMe" back={goHome}/><GroupMeScreen data={data} isIos={true} accent={accent}/></Shell>;
  if(app==="starbucks") return <Shell><IOSStatusBar/><NavBar title="Starbucks" back={goHome}/><StarbucksScreen isIos={true} charKey={charKey}/></Shell>;
  if(app==="soundcloud")return <Shell><IOSStatusBar/><NavBar title="SoundCloud" back={goHome}/><SoundCloudScreen data={data} isIos={true} accent={accent} admin={admin} update={(k,v)=>onUpdate(k,v)}/></Shell>;
  if(app==="espn")      return <Shell><IOSStatusBar/><NavBar title="ESPN" back={goHome}/><div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#f2f2f7",gap:12}}><span style={{fontSize:48}}>🏈</span><span style={{fontSize:15,fontWeight:600,color:"#1a1a1a"}}>ESPN</span><span style={{fontSize:12,color:"#8e8e93",textAlign:"center",padding:"0 32px"}}>This app is temporarily unavailable.</span></div></Shell>;
  if(app==="contacts")  return <Shell><IOSStatusBar/><NavBar title="Contacts" back={goHome}/><ContactsScreen data={data} isIos={true} accent={accent}/></Shell>;
  if(app==="clock")     return <Shell><IOSStatusBar/><NavBar title="Clock" back={goHome}/><ClockScreen isIos={true} accent={accent}/></Shell>;
  if(app==="maps")      return <Shell><IOSStatusBar/><NavBar title="Maps" back={goHome}/><MapsScreen isIos={true} accent={accent}/></Shell>;
  // Shazam est purement décoratif : l'icône s'affiche mais n'est pas ouvrable (exclue de IOS_APPS/AND_APPS).

  return null;
};

// ─── ANDROID ICS PHONE ────────────────────────────────────────────────────────
const AndroidPhone = ({data,admin,onUpdate,sharedAndroidIcons={},onUpdateShared=()=>{},onUpdateSharedThread=()=>{},loreDate:loreDateProp}) => {
  const devOv = data.devOverrides || {};
  const [screen,setScreen] = useState("lock");
  const [app,setApp] = useState(null);
  const [thread,setThread] = useState(null);
  const [browserTab,setBrowserTab] = useState("bookmarks");
  const [noteOpen,setNoteOpen] = useState(null);
  const [photoDetail,setPhotoDetail] = useState(null);
  const [phonePanel,setPhonePanel] = useState("keypad");
  const [galleryView,setGalleryView] = useState("albums");
  const update = (key,val) => onUpdate({...data,[key]:val});
  const updateMsg = msgs => onUpdate({...data,messages:msgs});
  // Resolve shared thread with correct perspective
  const getThread = (msg) => {
    if(!msg) return [];
    let thread;
    if(msg.isGroup) {
      if(!msg.sharedThreadId) thread = msg.thread||[];
      else {
        const raw = data.sharedThreads?.[msg.sharedThreadId] || [];
        thread = raw.map(m=>({...m, senderKey:m.from, senderName:CHAR_NAMES[m.from]||m.from, from: m.from===charKey ? 'me' : 'them'}));
      }
    } else if(msg.sharedThreadId) {
      const raw = data.sharedThreads?.[msg.sharedThreadId] || msg.thread || [];
      const myLetter = msg.perspective || 'a';
      thread = raw.map(m=>({...m, from: m.from===myLetter ? 'me' : 'them'}));
    } else {
      thread = msg.thread||[];
    }
    // Tri chronologique côté affichage téléphone — cohérent avec l'admin.
    return [...thread].sort((a,b)=>loreSortKey(a.time)-loreSortKey(b.time));
  };
  const saveThread = (msg, newThread) => {
    if(!msg) return;
    if(msg.isGroup) {
      if(!msg.sharedThreadId) { updateMsg(data.messages.map(m=>m.id===msg.id?{...m,thread:newThread}:m)); return; }
      const raw = newThread.map(m=>({from: m.from==='me' ? charKey : (m.senderKey||'glinda'), text:m.text, time:m.time}));
      onUpdateSharedThread(msg.sharedThreadId, raw);
      return;
    }
    if(msg.sharedThreadId) {
      const myLetter = msg.perspective || 'a';
      const raw = newThread.map(m=>({...m, from: m.from==='me' ? myLetter : (myLetter==='a'?'b':'a')}));
      onUpdateSharedThread(msg.sharedThreadId, raw);
    } else {
      updateMsg(data.messages.map(m=>m.id===msg.id?{...m,thread:newThread}:m));
    }
  };

  const accent = data.accentColor||"#33b5e5";
  const notifApps = (data.notifications && data.notifications.length)
    ? [...new Set(data.notifications.map(n=>n.app))]
    : ((data.messages||[]).some(m=>m.unread) ? ["messages"] : []);
  const charKey  = getCharKey(data);
  const loreDate = loreDateProp || getLoreDate();
  const fmtTime  = (t) => formatMsgTime(t, loreDate);

  const appIcon = id => {
    // Sur Android, seule l'icône partagée Android compte — data.appIcons est un champ iOS, jamais utilisé ici
    const custom = sharedAndroidIcons[id];
    const meta   = APP_META[id]||{};
    if(custom) return <img src={custom} style={{width:"100%",height:"100%",objectFit:"cover"}}/>;
    return <span style={{fontSize:24}}>{meta.iosIcon||"📱"}</span>;
  };
  // Mettre à jour une icône Android partagée (visible sur Drew ET Elias)
  const updateSharedIcon = (appId, src) => onUpdateShared({...sharedAndroidIcons, [appId]:src});

  const autoBadges = (() => {
    const b = {}, notifs=data.notifications||[], msgs=data.messages||[], snaps=data.snaps||[], calls=data.calls||[], shared=data.sharedThreads?._sharedTweets||[];
    const um=msgs.filter(c=>c.unread).length; if(um) b.messages=um;
    const mc=calls.filter(c=>c.type==="missed").length; if(mc) b.phone=mc;
    const un=SNAP_BADGE_COUNTS[data.username]??snaps.filter(s=>!s.opened).length; if(un) b.snapchat=un;
    const ck=getCharKey(data);
    const nt=shared.filter(t=>t.author!==ck).length; if(nt) b.twitter=nt;
    const gmc=GMAIL_BADGE_COUNTS[data.username]; if(gmc) b.gmail=gmc;
    ["insta","reddit","soundcloud","facebook","groupme"].forEach(a=>{const c=notifs.filter(n=>n.app===a).length;if(c)b[a]=c;});
    return b;
  })();
  const badge = id => {
    const n = autoBadges[id] ?? data.badges?.[id]; if(!n) return null;
    return <div style={{position:"absolute",top:-5,right:-5,background:"#f44336",borderRadius:"50%",minWidth:20,height:20,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",padding:"0 4px",zIndex:2}}>{n}</div>;
  };

  const wallpaper=data.wallpaper;
  const isBgImg=wallpaper?.startsWith("data:")||wallpaper?.startsWith("http")||wallpaper?.startsWith("/");
  const bgStyle=isBgImg?{backgroundImage:`url(${wallpaper})`,backgroundSize:"cover",backgroundPosition:"center"}:{background:wallpaper};

  const AND_APP_COLORS = {
    messages:   ["#1a1a1a","#111"],
    gmail:      ["#C62828","#921e1e"],
    twitter:    ["#15202B","#0d1420"],
    facebook:   ["#3b5998","#2d4373"],
    tumblr:     ["#35465c","#2c3a4d"],
    youtube:    ["#CC0000","#990000"],
    reddit:     ["#CC3D00","#99300a"],
    browser:    ["#1565C0","#0d47a1"],
    safari:     ["#1565C0","#0d47a1"],
    notes:      ["#5a3418","#3e2208"],
    calendar:   ["#B71C1C","#8b1313"],
    snapchat:   ["#212121","#111"],
    insta:      ["#833ab4","#5f2580"],
    soundcloud: ["#E55B13","#b84710"],
    maps:       ["#1565C0","#0d47a1"],
    settings:   ["#455a64","#37474f"],
    phone:      ["#2E7D32","#1b5e20"],
    contacts:   ["#1565C0","#0d47a1"],
    camera:     ["#212121","#111"],
    gallery:    ["#37474f","#263238"],
    weather:    ["#0277BD","#01579b"],
    music:      ["#880e4f","#6a0138"],
    clock:      ["#212121","#111"],
    vpn:        ["#455a64","#37474f"],
    wikipedia:  ["#000000","#222"],
    kindle:     ["#232f3e","#131921"],
    inaturalist:["#74ac00","#578500"],
    scannerradio:["#212121","#111"],
    grindr:     ["#f7931e","#d4770d"],
  };

  const ActionBar = ({title,back,overflow=false}) => {
    const abOv  = devOv.andActionBar || {};
    const [abLight, abDark] = AND_APP_COLORS[app] || ["#212121","#111"];
    const abBg  = abOv.bg    ?? abLight;
    const abH   = abOv.height ?? 48;
    const abTc  = abOv.titleColor  ?? "rgba(255,255,255,0.87)";
    const abTs  = abOv.titleSize   ?? 16;
    const abTw  = abOv.titleWeight ?? "400";
    const abPh  = abOv.paddingH    ?? 4;
    const dynAbTs = title && title.length > 20 ? 12 : title && title.length > 15 ? 14 : abTs;
    return (
      <div style={{background:abBg,height:abH,display:"flex",alignItems:"center",padding:`0 ${abPh}px`,flexShrink:0,boxShadow:`0 2px 6px rgba(0,0,0,0.5)`,zIndex:2}}>
        {back&&<button onClick={back} style={{background:"none",border:"none",color:"rgba(255,255,255,0.87)",cursor:"pointer",padding:"0 8px 0 4px",height:"100%",display:"flex",alignItems:"center"}}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="rgba(255,255,255,0.87)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>}
        <span style={{color:abTc,fontWeight:abTw,fontSize:dynAbTs,flex:1,padding:back?"0 4px":"0 16px",fontFamily:FF_IOS,letterSpacing:0}}>{title}</span>
        {overflow&&<button style={{background:"none",border:"none",color:"rgba(255,255,255,0.6)",fontSize:22,cursor:"pointer",padding:"0 10px",height:"100%",display:"flex",alignItems:"center",lineHeight:1}}>⋮</button>}
      </div>
    );
  };

  const SoftKeys = ({onBack}) => {
    // Hide when using custom chassis SVG (buttons are part of the chassis image)
    if(data.chassisPng && data.chassisPng !== "__svgblack__") return null;
    const skOv   = devOv.andSoftKeys || {};
    const skBg   = skOv.bg          ?? "#000";
    const skH    = skOv.height      ?? 44;
    const skBt   = skOv.borderTop   ?? "1px solid #111";
    const skCol  = skOv.iconColor   ?? "#888";
    const skSize = skOv.iconSize    ?? 18;
    const skOp   = skOv.iconOpacity ?? 1;
    const iconSt = {stroke:skCol, opacity:skOp};
    return (
      <div style={{background:skBg,height:skH,display:"flex",alignItems:"center",justifyContent:"space-around",borderTop:skBt,flexShrink:0}}>
        <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",padding:"0 20px",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <svg width={skSize} height={Math.round(skSize*0.88)} viewBox="0 0 18 16" fill="none"><path d="M6 1 L1 8 L6 15 M1 8 L17 8" {...iconSt} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <button onClick={()=>{setApp(null);setThread(null);setScreen("home");}} style={{background:"none",border:"none",cursor:"pointer",padding:"0 20px",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <svg width={skSize} height={skSize} viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" {...iconSt} strokeWidth="1.5"/></svg>
        </button>
        <button style={{background:"none",border:"none",cursor:"pointer",padding:"0 20px",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <svg width={skSize} height={Math.round(skSize*0.75)} viewBox="0 0 16 12" fill="none"><rect x="1" y="1" width="6" height="4" rx="1" {...iconSt} strokeWidth="1.2"/><rect x="9" y="1" width="6" height="4" rx="1" {...iconSt} strokeWidth="1.2"/><rect x="1" y="7" width="6" height="4" rx="1" {...iconSt} strokeWidth="1.2"/><rect x="9" y="7" width="6" height="4" rx="1" {...iconSt} strokeWidth="1.2"/></svg>
        </button>
      </div>
    );
  };

  const goHome = () => { setApp(null); setThread(null); setScreen("home"); };

  const Chassis = ({children}) => {
    const chOv = devOv.andChassis || {};
    // — Custom chassis PNG/SVG — generic, supports Samsung & Wiko
    const cpng = data.chassisPng;
    if(cpng && cpng !== "__svgblack__") {
      const inset = data.screenInset || {top:141,left:43,right:43,bottom:135};
      // Samsung: VW=500  VH=966   (screenInset.top ~141)
      // Wiko:    VW=501.48 VH=994.05 (screenInset.top ~146)
      const isWiko = inset.top >= 145;
      const VW = isWiko ? 501.48 : 500;
      const VH = isWiko ? 994.05 : 966;
      // Use exact SVG screen rect coords (not inset)
      const scrX  = isWiko ? 38.61  : inset.left;
      const scrY  = isWiko ? 146    : inset.top;
      const scrW_ = isWiko ? 428.87 : (VW - inset.left - inset.right);
      const scrH_ = isWiko ? 696.53 : (VH - inset.top  - inset.bottom);
      const maskX = scrX, maskY = scrY;
      const maskW = scrW_, maskH = scrH_;
      const W = chOv.width ?? 300;
      // H = exactly proportional to VH/VW, no extra pixels
      const H = Math.round(W * VH / VW);
      // Screen position in pixels on the rendered element
      const scrTopPx   = Math.round(scrY  / VH * H);
      const scrLeftPx  = Math.round(scrX  / VW * W);
      const scrWidthPx = Math.round(scrW_ / VW * W);
      const scrHeightPx= Math.round(scrH_ / VH * H);
      // Button zones (% of total SVG)
      // capacitive Back key sits to its right. (Wiko keeps its own layout.)
      const homeStyle = isWiko
        ? {left:"43.87%",top:"89.53%",width:"11.96%",height:"6.04%",borderRadius:"50%"}
        : {left:"39.7%", top:"88.2%", width:"20.6%", height:"6.9%", borderRadius:"50%"};
      const backStyle = isWiko
        ? {left:"73.78%",top:"89.33%",width:"11.96%",height:"4.02%"}
        : {left:"70%",   top:"89.3%", width:"14%",   height:"4.6%"};
      return (
        <DevCtx.Provider value={devOv}>
          <>
              <div style={{position:"relative",width:W,height:H,flexShrink:0,fontFamily:FF_IOS,background:"transparent"}}>
              <div style={{position:"absolute",top:scrTopPx,left:scrLeftPx,width:scrWidthPx,height:scrHeightPx,overflow:"hidden",display:"flex",flexDirection:"column",zIndex:1}}>
                <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0,overflow:"hidden"}}>
                  {children}
                </div>
              </div>
              <svg viewBox={`0 0 ${VW} ${VH}`} width={W} height={H}
                style={{position:"absolute",inset:0,zIndex:2,pointerEvents:"none"}}
                xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
                <defs>
                  <mask id="and_mask">
                    <rect width={VW} height={VH} fill="white"/>
                    <rect x={maskX} y={maskY} width={maskW} height={maskH} rx="6" fill="black"/>
                  </mask>
                </defs>
                <image href={cpng} width={VW} height={VH} mask="url(#and_mask)"/>
              </svg>
              <div onClick={goHome} style={{position:"absolute",...homeStyle,cursor:"pointer",zIndex:3}}/>
              <div onClick={()=>{ if(app){setApp(null);setThread(null);} else if(screen!=="lock") setScreen("lock"); }}
                style={{position:"absolute",...backStyle,cursor:"pointer",zIndex:3}}/>
            </div>
          </>
        </DevCtx.Provider>
      );
    }
    const chW  = chOv.width        ?? 320;
    const chH  = chOv.height       ?? 615;
    const chR  = chOv.borderRadius ?? 12;
    const chBg = chOv.bg           ?? "linear-gradient(145deg,#2a2a2a,#1a1a1a)";
    const chSh = chOv.boxShadow    ?? "0 0 0 1px #444,0 20px 60px rgba(0,0,0,0.7)";
    const chP  = chOv.padding      ?? "8px 6px 0 6px";
    const scR  = chOv.screenRadius ?? 4;
    const scBg = chOv.screenBg     ?? "#1a1a1a";
    return (
      <DevCtx.Provider value={devOv}>
        <>
          <div style={{width:chW,height:chH,borderRadius:chR,background:chBg,boxShadow:chSh,display:"flex",flexDirection:"column",padding:chP,fontFamily:FF_IOS,overflow:"hidden",flexShrink:0}}>
            <div style={{flex:1,borderRadius:scR,overflow:"hidden",background:scBg,display:"flex",flexDirection:"column",minHeight:0}}>{children}</div>
          </div>
        </>
      </DevCtx.Provider>
    );
  };

  const AppShell = ({children,onBack}) => (
    <LoreDateCtx.Provider value={loreDate}>
      <Chassis>
        <div style={{flex:1,display:"flex",flexDirection:"column",background:"#1a1a1a",minHeight:0,overflow:"hidden",fontFamily:FF_IOS}}>{children}</div>
        <SoftKeys onBack={onBack||goHome}/>
      </Chassis>
    </LoreDateCtx.Provider>
  );

  // LOCK — Android Jelly Bean style
  if(screen==="lock") {
    const carrierText = data.username==="dreww_orms" ? "AT&T" : data.username==="noteliasgreen" ? "I Believe 👽" : "UMA";
    return (
    <LoreDateCtx.Provider value={loreDate}>
    <Chassis>
      <div style={{flex:1,display:"flex",flexDirection:"column",...bgStyle,position:"relative",overflow:"hidden"}}>
        
        <AndroidStatusBar notifApps={notifApps} accent={accent} showTime={false}/>

        
        <div style={{padding:"16px 0 0",zIndex:2}}>
          <AndroidLockClock/>
        </div>

        
        <div style={{position:"absolute",top:"68%",left:"50%",transform:"translate(-50%,-50%)",zIndex:2,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"absolute",width:140,height:140,borderRadius:"50%",border:"1.5px dashed rgba(255,255,255,0.25)"}}/>
          <div style={{position:"absolute",width:110,height:110,borderRadius:"50%",border:"1px solid rgba(255,255,255,0.12)",background:"radial-gradient(circle,rgba(255,255,255,0.06) 0%,transparent 70%)"}}/>
          <div
            onClick={()=>setScreen("home")}
            style={{width:64,height:64,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.7)",background:"rgba(0,0,0,0.3)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 0 20px rgba(255,255,255,0.15),inset 0 1px 0 rgba(255,255,255,0.2)",zIndex:3}}>
            <svg width="26" height="28" viewBox="0 0 26 28" fill="none">
              <rect x="4" y="13" width="18" height="13" rx="2.5" stroke="white" strokeWidth="1.8"/>
              <path d="M8 13V9a5 5 0 0 1 10 0v4" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
              <circle cx="13" cy="20" r="2" fill="white" opacity="0.9"/>
            </svg>
          </div>
        </div>

        
        <div style={{position:"absolute",bottom:2,left:0,right:0,textAlign:"center",color:"rgba(255,255,255,0.45)",fontSize:10,letterSpacing:1,fontFamily:FF_IOS}}>
          {carrierText}
        </div>
      </div>
      <SoftKeys onBack={()=>setScreen("home")}/>
    </Chassis>
    </LoreDateCtx.Provider>
    );
  }

  // HOME
  if(screen==="home"&&!app) return (
    <Chassis>
      <AndroidStatusBar notifApps={notifApps} accent={accent}/>
      <DraggableHomescreen data={data} update={update} appIcon={appIcon} badge={badge} goApp={id=>{
        const AND_APPS=['browser','calendar','facebook','files','gallery','gmail','inaturalist','insta','kindle','messages','music','notes','phone','reddit','settings','twitter','vpn','weather','wikipedia','youtube'];
        if(AND_APPS.includes(id)){setThread(null);setApp(id);if(id==="gallery"){setGalleryView("albums");setPhotoDetail(null);}}
      }} os="android" accent={accent} admin={admin} charKey={charKey}/>
      <SoftKeys onBack={()=>setScreen("lock")}/>
    </Chassis>
  );

  // Gallery
  if(app==="gallery") {
    const allGallery = data.gallery || [];
    const activeGallery = allGallery.filter(p=>!p.deleted);
    const deletedGallery = allGallery.filter(p=>p.deleted);

    // Photo detail view
    if(photoDetail!==null) {
      const isDelView = galleryView==="recently_deleted";
      const list = isDelView ? deletedGallery
        : galleryView==="camera_roll" ? sortGalleryPhotos(activeGallery)
        : sortGalleryPhotos(allGallery.filter(p=>!p.deleted && String(p.album)===String(galleryView)));
      const photo = list[photoDetail];
      const prev = photoDetail > 0 ? photoDetail-1 : null;
      const next = photoDetail < list.length-1 ? photoDetail+1 : null;
      return (
        <AppShell onBack={()=>setPhotoDetail(null)}>
          <AndroidStatusBar notifApps={notifApps} accent={accent}/>
          <div style={{background:"#000",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 10px",borderBottom:`1px solid ${accent}22`,flexShrink:0}}>
            <button onClick={()=>setPhotoDetail(null)} style={{background:"none",border:"none",color:accent,fontSize:13,cursor:"pointer"}}>←</button>
            <span style={{color:"#666",fontSize:11}}>{photoDetail+1} / {list.length}</span>
            <div style={{width:52}}/>
          </div>
          <div style={{flex:1,background:"#fff",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
            <div style={{width:"100%",aspectRatio:"1",background:"#0d0d0d",display:"flex",alignItems:"center",justifyContent:"center"}}>
              {photo?.src?<img src={photo.src} style={{width:"100%",height:"100%",objectFit:"contain"}}/>:<span style={{fontSize:40,opacity:0.2}}>🏔️</span>}
            </div>
            <div style={{width:"100%",padding:"10px 14px",background:"#000"}}>
              <div style={{color:"#555",fontSize:11,marginBottom:3}}>{loreDateOnly(photo?.date)}</div>
              {isDelView&&<div style={{color:"#ff6b6b",fontSize:10,marginTop:4}}>⚠ This photo will be permanently deleted after 30 days.</div>}
            </div>
          </div>
          <div style={{background:"#000",display:"flex",justifyContent:"space-between",padding:"8px 14px",borderTop:"1px solid #111",flexShrink:0}}>
            <button onClick={()=>prev!==null&&setPhotoDetail(prev)} style={{background:"none",border:"none",color:prev!==null?accent:"#333",fontSize:22,cursor:prev!==null?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M7 1L1 7l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
            <button onClick={()=>next!==null&&setPhotoDetail(next)} style={{background:"none",border:"none",color:next!==null?accent:"#333",cursor:next!==null?"pointer":"default",display:"flex",alignItems:"center",padding:"0 4px"}}><svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
          </div>
        </AppShell>
      );
    }

    // Recently Deleted album
    if(galleryView==="recently_deleted") {
      return (
        <AppShell>
          <AndroidStatusBar notifApps={notifApps} accent={accent}/>
          <ActionBar title="Recently Deleted" back={()=>setGalleryView("albums")} overflow/>
          <div style={{background:"#1a1a1a",borderBottom:"1px solid #2a2a2a",padding:"6px 12px"}}>
            <span style={{color:"#666",fontSize:10}}>Items will be permanently deleted after 30 days.</span>
          </div>
          <div style={{flex:1,background:"#111",overflowY:"auto"}}>
            {deletedGallery.length===0
              ? <div style={{padding:32,textAlign:"center",color:"#444",fontSize:13}}>No deleted photos.</div>
              : <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:1}}>
                  {deletedGallery.map((photo,i)=>(
                    <div key={photo.id} style={{aspectRatio:"1",background:"#222",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",cursor:"pointer"}}
                      onClick={()=>setPhotoDetail(i)}>
                      {photo.src?<img src={photo.src} style={{width:"100%",height:"100%",objectFit:"cover",opacity:0.7}}/>:<span style={{color:"#444",fontSize:20}}>🏔️</span>}
                    </div>
                  ))}
                </div>
            }
          </div>
        </AppShell>
      );
    }

    // Main gallery view — albums list
    if(galleryView==="albums") {
      const customAlbums = data.galleryAlbums || [];
      const AndroidAlbumRow = ({label,thumb,count,color,onTap,accent="#888"}) => (
        <div onClick={onTap} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderBottom:"1px solid #1a1a1a",cursor:"pointer",background:"#141414"}}>
          <div style={{width:52,height:52,borderRadius:4,background:color||"#222",overflow:"hidden",flexShrink:0,position:"relative",border:"1px solid #222",display:"flex",alignItems:"center",justifyContent:"center"}}>
            {thumb?<img src={thumb} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{color:"#333",fontSize:22}}>📁</span>}
          </div>
          <div style={{flex:1}}>
            <div style={{color:accent||"#fff",fontSize:14,fontWeight:500}}>{label}</div>
            <div style={{color:"#555",fontSize:11,marginTop:2}}>{count}</div>
          </div>
          <span style={{color:"#444",lineHeight:1}}><svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
        </div>
      );
      return (
        <AppShell>
          <AndroidStatusBar notifApps={notifApps} accent={accent}/><ActionBar title="Gallery" back={goHome} overflow/>
          <div style={{flex:1,background:"#111",overflowY:"auto"}}>
            <AndroidAlbumRow label="Camera Roll" thumb={activeGallery[0]?.src||null} color="#222" count={`${activeGallery.length} photo${activeGallery.length!==1?"s":""}`} onTap={()=>setGalleryView("camera_roll")}/>
            {customAlbums.map(album=>{
              const albumPhotos = (data.gallery||[]).filter(p=>!p.deleted && String(p.album)===String(album.id));
              return (
                <AndroidAlbumRow key={album.id} label={album.name||"Album"} thumb={album.cover||albumPhotos[0]?.src||null} color="#1a1a22" count={`${albumPhotos.length} photo${albumPhotos.length!==1?"s":""}`} onTap={()=>setGalleryView(String(album.id))}/>
              );
            })}
            <AndroidAlbumRow label="Recently Deleted" thumb={null} color="#1a1010" count={`${deletedGallery.length} item${deletedGallery.length!==1?"s":""}`} accent="#ff6b6b" onTap={()=>setGalleryView("recently_deleted")}/>
          </div>
        </AppShell>
      );
    }

    // Custom album grid
    if(galleryView!=="camera_roll" && galleryView!=="recently_deleted" && galleryView!=="albums") {
      const customAlbums2 = data.galleryAlbums || [];
      const albumId = galleryView;
      const album = customAlbums2.find(a=>String(a.id)===String(albumId));
      const albumPhotos = sortGalleryPhotos((data.gallery||[]).filter(p=>!p.deleted && String(p.album)===String(albumId)));
      return (
        <AppShell>
          <AndroidStatusBar notifApps={notifApps} accent={accent}/><ActionBar title={album?.name||"Album"} back={()=>setGalleryView("albums")} overflow/>
          <div style={{flex:1,background:"#111",overflowY:"auto"}}>
            <div style={{padding:"6px 10px 3px",color:"#555",fontSize:11}}>{albumPhotos.length} photo{albumPhotos.length!==1?"s":""}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:1}}>
              {albumPhotos.map((photo,i)=>(
                <div key={photo.id} style={{aspectRatio:"1",background:photo.color||"#1a1a1a",cursor:"pointer",overflow:"hidden"}} onClick={()=>setPhotoDetail(i)}>
                  {photo.src?<img src={photo.src} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:null}
                </div>
              ))}
            </div>
          </div>
        </AppShell>
      );
    }

    // Camera Roll grid
    const hasDatesAndroid = activeGallery.some(p=>p.dateISO);
    const sortedActive = sortGalleryPhotos(activeGallery);
    return (
      <AppShell>
        <AndroidStatusBar notifApps={notifApps} accent={accent}/><ActionBar title="Camera Roll" back={()=>setGalleryView("albums")} overflow/>
        <div style={{flex:1,background:"#111",overflowY:"auto"}}>
          <div style={{padding:"6px 10px 3px",color:"#555",fontSize:11}}>{activeGallery.length} photo{activeGallery.length!==1?"s":""}</div>
          {hasDatesAndroid ? (
            groupGalleryByMonth(sortedActive).map(g=>(
              <div key={g.label}>
                <div style={{padding:"6px 10px 2px",color:"#888",fontSize:12,fontWeight:700}}>{g.label}</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:1}}>
                  {g.photos.map(photo=>{
                    const i = sortedActive.indexOf(photo);
                    return (
                      <div key={photo.id}
                        style={{aspectRatio:"1",background:"#222",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",cursor:"pointer"}}
                        onClick={()=>setPhotoDetail(i)}>
                        {photo.src?<img src={photo.src} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{color:"#444",fontSize:20}}>🏔️</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:1}}>
            {sortedActive.map((photo,i)=>(
              <div key={photo.id}
                style={{aspectRatio:"1",background:"#222",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",cursor:"pointer"}}
                onClick={()=>setPhotoDetail(i)}>
                {photo.src?<img src={photo.src} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{color:"#444",fontSize:20}}>🏔️</span>}
              </div>
            ))}
          </div>
          )}
        </div>
      </AppShell>
    );
  }

  if(app==="messages"&&thread===null) return (
    <AppShell>
      <AndroidStatusBar notifApps={notifApps} accent={accent}/><ActionBar title="Messages" back={goHome} overflow/>
      <div style={{flex:1,background:"#f5f5f5",overflowY:"auto"}}>
        {[...data.messages]
          .map((m,i)=>[m,i])
          .sort(([a],[b])=>{const ta=getThread(a),tb=getThread(b);return loreSortKey(tb[tb.length-1]?.time)-loreSortKey(ta[ta.length-1]?.time);})
          .map(([msg,i])=>{
            const lastMsg=(()=>{const _t=getThread(msg);return _t[_t.length-1];})();
            const lastTime=fmtTime(lastMsg?.time);
            const initials=(msg.contact||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
            const avatarColor=["#e53935","#1e88e5","#43a047","#fb8c00","#8e24aa","#00897b"][msg.contact.charCodeAt(0)%6];
            return (
            <div key={msg.id} onClick={()=>setThread(i)} style={{
              padding:"12px 16px",
              borderBottom:"1px solid #e0e0e0",
              display:"flex",gap:14,cursor:"pointer",alignItems:"center",
              background:msg.unread?"#fff":"#fafafa",
            }}>
              <div style={{width:38,height:38,background:avatarColor,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:14,flexShrink:0,fontFamily:FF_IOS}}>{initials}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:3}}>
                  <div style={{color:msg.unread?"#212121":"#424242",fontWeight:msg.unread?700:400,fontSize:14,fontFamily:FF_IOS}}>{msg.contact}</div>
                  <span style={{color:msg.unread?accent:"#bdbdbd",fontSize:11,fontFamily:FF_IOS,flexShrink:0}}>{lastTime}</span>
                </div>
                <div style={{color:msg.unread?"#616161":"#9e9e9e",fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:FF_IOS,fontWeight:msg.unread?500:400}}>{lastMsg?.text}</div>
              </div>
              {msg.unread&&<div style={{width:9,height:9,borderRadius:"50%",background:accent,flexShrink:0}}/>}
            </div>
          );})}
      </div>
    </AppShell>
  );

  if(app==="messages"&&thread!==null){
    const conv=data.messages[thread]; if(!conv) return null;
    const resolvedThread=getThread(conv);
    const avatarColor=["#e53935","#1e88e5","#43a047","#fb8c00","#8e24aa","#00897b"][conv.contact.charCodeAt(0)%6];
    return (
      <AppShell onBack={()=>setThread(null)}>
        <AndroidStatusBar notifApps={notifApps} accent={accent}/><ActionBar title={conv.contact} back={()=>setThread(null)}/>
        <div ref={el=>{if(el)setTimeout(()=>{el.scrollTop=el.scrollHeight;},0)}} style={{flex:1,background:"#ece5dd",overflowY:"auto",padding:"8px 10px",display:"flex",flexDirection:"column",gap:3,minHeight:0,WebkitOverflowScrolling:"touch"}}>
          {resolvedThread.map((msg,mi)=>{
            const isMe=msg.from==="me";
            const nextMsg = resolvedThread[mi+1];
            const showTime = !nextMsg || nextMsg.from!==msg.from || (conv.isGroup && nextMsg.senderKey!==msg.senderKey);
            const dayChanged = loreDayKey(msg.time)!==null && (mi===0 || loreDayKey(resolvedThread[mi-1]?.time)!==loreDayKey(msg.time));
            const dateLabel = loreDateLabel(msg.time);
            return <React.Fragment key={mi}>
              {dayChanged && dateLabel &&
                <div style={{textAlign:"center",fontSize:10,color:"#888",fontWeight:500,padding:"10px 0 6px",fontFamily:FF_IOS}}>
                  <span style={{background:"#d1c7bd",color:"#777",padding:"3px 10px",borderRadius:10,fontSize:10}}>{dateLabel}</span>
                </div>}
              <div style={{display:"flex",justifyContent:isMe?"flex-end":"flex-start",alignItems:"flex-end",gap:6}}>
              {!isMe&&<div style={{width:28,height:28,background:conv.isGroup?avatarColor:avatarColor,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:11,flexShrink:0,alignSelf:"flex-end",fontFamily:FF_IOS}}>{conv.isGroup?(msg.senderName?.[0]||"?"):conv.contact[0]}</div>}
              <div style={{maxWidth:"72%"}}>
                {conv.isGroup && !isMe && (mi===0 || resolvedThread[mi-1]?.senderKey!==msg.senderKey) &&
                  <div style={{fontSize:10,color:avatarColor,fontWeight:600,padding:"0 10px 2px",fontFamily:FF_IOS}}>{msg.senderName}</div>}
                <div style={{
                  background:msg.img?"transparent":(isMe?accent:"#fff"),
                  color:isMe?"#fff":"#212121",
                  borderRadius:isMe?"18px 4px 18px 18px":"4px 18px 18px 18px",
                  padding:msg.img?0:"8px 12px",fontSize:13,lineHeight:1.45,
                  boxShadow:msg.img?"none":"0 1px 1px rgba(0,0,0,0.13)",
                  fontFamily:FF_IOS,
                  overflow:msg.img?"hidden":"visible",
                }}>
                  {msg.img && <img src={msg.img} style={{maxWidth:"100%",display:"block",borderRadius:msg.text?"18px 18px 0 0":(isMe?"18px 4px 18px 18px":"4px 18px 18px 18px")}}/>}
                  {msg.text && <div style={{padding:msg.img?"6px 12px":0}}>{msg.text}</div>}
                </div>
                <div style={{fontSize:10,color:"#aaa",marginTop:2,textAlign:isMe?"right":"left",padding:"0 4px",fontFamily:FF_IOS}}>{showTime&&loreRelativeLabel(msg.time,loreDate)}</div>
              </div>
            </div>
            </React.Fragment>;
          })}
        </div>
        
        <div style={{background:"#f0f0f0",borderTop:"1px solid #ddd",padding:"6px 10px",display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
          <div style={{flex:1,background:"#fff",borderRadius:24,padding:"8px 16px",fontSize:13,color:"#bdbdbd",lineHeight:1,border:"1px solid #e0e0e0",fontFamily:FF_IOS}}>Text message</div>
          <div style={{width:38,height:38,background:accent,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,boxShadow:"0 2px 4px rgba(0,0,0,0.2)"}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>
      </AppShell>
    );
  }

    if(app==="insta") return <AppShell><AndroidStatusBar notifApps={notifApps} accent={accent}/><InstaScreen data={data} isIos={false} accent={accent} onBack={goHome}/></AppShell>;

  if(app==="music") return <AppShell><AndroidStatusBar notifApps={notifApps} accent={accent}/><ActionBar title="Music" back={goHome}/><MusicScreen data={data} admin={admin} update={update} accent={accent} isIos={false}/></ AppShell>;
  if(app==="browser") return <AppShell><AndroidStatusBar notifApps={notifApps} accent={accent}/><ActionBar title="Browser" back={goHome} overflow/><BrowserScreen data={data} admin={admin} update={update} accent={accent} isIos={false} tab={browserTab} setTab={setBrowserTab}/></AppShell>;
  if(app==="phone") return <AppShell><AndroidStatusBar notifApps={notifApps} accent={accent}/><PhoneScreen data={data} admin={admin} update={update} accent={accent} isIos={false} panel={phonePanel} setPanel={setPhonePanel}/></AppShell>;
  if(app==="notes") return <AppShell><AndroidStatusBar notifApps={notifApps} accent={accent}/><NotesScreen data={data} admin={admin} update={update} accent={accent} isIos={false} noteOpen={noteOpen} setNoteOpen={setNoteOpen} goHome={goHome}/></AppShell>;
  if(app==="youtube")   return <AppShell><AndroidStatusBar notifApps={notifApps} accent={accent}/><YouTubeScreen isIos={false} charKey={charKey} data={data} onBack={goHome}/></AppShell>;
  if(app==="calendar")  return <AppShell><AndroidStatusBar notifApps={notifApps} accent={accent}/><ActionBar title="Calendar" back={goHome}/><CalendarScreen data={data} isIos={false} accent={accent} admin={admin} update={update}/></AppShell>;
  if(app==="settings")  return <AppShell><AndroidStatusBar notifApps={notifApps} accent={accent}/><ActionBar title="Settings" back={goHome}/><SettingsScreen data={data} isIos={false} accent={accent}/></AppShell>;
  if(app==="weather")   return <AppShell><AndroidStatusBar notifApps={notifApps} accent={accent}/><ActionBar title="Weather" back={goHome}/><WeatherScreen isIos={false} accent={accent} data={data} update={update} admin={admin}/></AppShell>;
  if(app==="facebook")  return <AppShell><AndroidStatusBar notifApps={notifApps} accent={accent}/><ActionBar title="Facebook" back={goHome}/><FacebookScreen data={data} isIos={false} accent={accent}/></AppShell>;
  if(app==="gmail")     return <AppShell><AndroidStatusBar notifApps={notifApps} accent={accent}/><GmailScreen data={data} isIos={false} accent={accent} onBack={goHome}/></AppShell>;
  if(app==="wikipedia") return <AppShell><AndroidStatusBar notifApps={notifApps} accent={accent}/><ActionBar title="Wikipedia" back={goHome}/><WikipediaScreen isIos={false} accent={accent} charKey={charKey} data={data}/></AppShell>;
  if(app==="kindle")    return <AppShell><AndroidStatusBar notifApps={notifApps} accent={accent}/><ActionBar title="Kindle" back={goHome}/><KindleScreen isIos={false} accent={accent} data={data}/></AppShell>;
  if(app==="inaturalist")return <AppShell><AndroidStatusBar notifApps={notifApps} accent={accent}/><ActionBar title="iNaturalist" back={goHome}/><INaturalistScreen data={data} isIos={false} accent={accent}/></AppShell>;
  if(app==="reddit")    return <AppShell><AndroidStatusBar notifApps={notifApps} accent={accent}/><ActionBar title="Reddit" back={goHome}/><RedditScreen data={data} isIos={false} accent={accent}/></AppShell>;  if(app==="twitter")   return <AppShell><AndroidStatusBar notifApps={notifApps} accent={accent}/><TwitterScreen data={data} isIos={false} accent={accent} onBack={goHome} sharedTweets={data.sharedThreads?._sharedTweets||[]} twitterUsers={{...(data.sharedThreads?._sharedTwitterUsers||{}),...(data.twitterUsers||{})}} homeBaseTweets={data.homeBaseTweets||[]} onUpdateShared={onUpdateSharedThread}/></AppShell>;
  if(app==="vpn")       return <AppShell><AndroidStatusBar notifApps={notifApps} accent={accent}/><ActionBar title="VPN" back={goHome}/><VPNScreen isIos={false} data={data} accent={accent}/></AppShell>;
  if(app==="contacts")  return <AppShell><AndroidStatusBar notifApps={notifApps} accent={accent}/><ActionBar title="Contacts" back={goHome}/><ContactsScreen data={data} isIos={false} accent={accent}/></AppShell>;
  if(app==="files")      return <AppShell><AndroidStatusBar notifApps={notifApps} accent={accent}/><FilesScreen data={data} isIos={false} accent={accent} onBack={goHome}/></AppShell>;
  if(app==="clock")     return <AppShell><AndroidStatusBar notifApps={notifApps} accent={accent}/><ActionBar title="Clock" back={goHome}/><ClockScreen isIos={false} accent={accent}/></AppShell>;
  if(app==="maps")      return <AppShell><AndroidStatusBar notifApps={notifApps} accent={accent}/><ActionBar title="Maps" back={goHome}/><MapsScreen isIos={false} accent={accent}/></AppShell>;

  return null;
};
const PhoneCard = ({ c, d, bgStyle, isIos, onSelect }) => {
  const [lit, setLit] = useState(false);
  const white = d.phoneColor === "white";

  const accentColors = {
    "#e91e8c": { border:"#e91e8c", shadow:"#c0006a", bg:"#fff0f7", label:"#c0006a" },
    "#00d435": { border:"#00d435", shadow:"#009922", bg:"#f0fff4", label:"#009922" },
    "#4a90c0": { border:"#4a90c0", shadow:"#1a5a8a", bg:"#eef5fc", label:"#1a5a8a" },
    "#c0392b": { border:"#c0392b", shadow:"#7a0000", bg:"#fff0ee", label:"#7a0000" },
  };
  const acc = accentColors[c.color] || { border:c.color, shadow:c.color, bg:"#fff", label:c.color };
  // Style de secours pour la mini-preview quand aucun chassis SVG n'est défini pour ce perso.
  const miniGrad  = `linear-gradient(160deg, #ffffff 0%, ${acc.bg} 100%)`;
  const miniRing1 = "#ffffff";
  const miniRing2 = acc.border;

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setLit(true)}
      onMouseLeave={() => setLit(false)}
      style={{
        display:"flex", flexDirection:"column", alignItems:"center", gap:0,
        cursor:"pointer",
        transition:"transform 0.15s",
        transform: lit ? "translateY(-6px)" : "none",
      }}>

      
      {(()=>{
        const _hasSam = !isIos && d.chassisPng && d.chassisPng !== "__svgblack__";
        const _drop = isIos || _hasSam;
        const _filter = _drop ? (lit ? `drop-shadow(5px 7px 0px ${acc.shadow}cc)` : `drop-shadow(3px 4px 0px ${acc.shadow}88)`) : undefined;
        const _shadow = _drop ? undefined : (lit ? `6px 8px 0px ${acc.shadow}cc` : `4px 5px 0px ${acc.shadow}88`);
        return (<div style={{filter:_filter,boxShadow:_shadow,transition:"filter 0.15s, box-shadow 0.15s",position:"relative",overflow:_drop?"visible":"hidden",borderRadius:_drop?0:8}}>

      
      {isIos ? (() => {
        const hasSvg = !!d.chassisPng;
        const isBlackMini  = d.chassisPng === '__svgblack__';
        const isWhiteMini  = d.chassisPng === '__svgwhite__';
        const isIphone4Mini= d.chassisPng === '__iphone4__';
        // iPhone 4 SVG dimensions and screen rect
        const I4_VBW=223.591, I4_VBH=412.584, I4_SX=29, I4_SY=80.5, I4_SW=168, I4_SH=252;
        // iPhone 5 SVG dimensions and screen rect
        const I5_VBW=174.097, I5_VBH=349.592, I5_SX=20, I5_SY=56.167, I5_SW=133, I5_SH=236.71;
        const vbW = isIphone4Mini ? I4_VBW : I5_VBW;
        const vbH = isIphone4Mini ? I4_VBH : I5_VBH;
        const sX  = isIphone4Mini ? I4_SX  : I5_SX;
        const sY  = isIphone4Mini ? I4_SY  : I5_SY;
        const sW  = isIphone4Mini ? I4_SW  : I5_SW;
        const sH  = isIphone4Mini ? I4_SH  : I5_SH;
        const miniW = 130;
        const miniH = hasSvg ? Math.round(miniW * vbH / vbW) : 240;
        const scale = miniW / vbW;
        const scrTop  = hasSvg ? Math.round(sY * scale) : 28;
        const scrLeft = hasSvg ? Math.round(sX * scale) : 0;
        const scrRight= hasSvg ? Math.round((vbW - sX - sW) * scale) : 0;
        const scrBot  = hasSvg ? Math.round((vbH - sY - sH) * scale) : 30;
        return (
        <div style={{
          width:miniW, height:miniH,
          borderRadius: hasSvg ? 0 : 18,
          background: hasSvg ? "transparent" : miniGrad,
          boxShadow: hasSvg ? "none" : (lit
            ? `0 0 0 1px ${miniRing1}, 0 0 0 2px ${miniRing2}, 0 12px 40px rgba(0,0,0,0.25), 0 0 30px ${c.color}55`
            : `0 0 0 1px ${miniRing1}, 0 0 0 2px ${miniRing2}, 0 8px 24px rgba(0,0,0,0.2)`),
          display:"flex", flexDirection:"column",
          overflow: hasSvg ? "visible" : "hidden",
          position:"relative",
          transition:"box-shadow 0.3s",
        }}>
          {hasSvg && <>
            <div style={{
              position:"absolute",
              top:`${sY/vbH*100}%`,
              left:`${sX/vbW*100}%`,
              width:`${sW/vbW*100}%`,
              height:`${sH/vbH*100}%`,
              overflow:"hidden", zIndex:1,
              filter: lit ? "brightness(1.1)" : "brightness(0.9)",
              transition:"filter 0.2s",
            }}>
              <PhoneCardClock isIos={true} bgStyle={bgStyle}/>
            </div>
            {isIphone4Mini ? (
              <svg viewBox="0 0 223.591 412.584" width={miniW} height={miniH}
                style={{position:"absolute",inset:0,zIndex:2,pointerEvents:"none"}}
                xmlns="http://www.w3.org/2000/svg"
                xmlnsXlink="http://www.w3.org/1999/xlink">
                <defs>
                  <mask id="i4mini_mask">
                    <rect width="223.591" height="412.584" fill="white"/>
                    <rect x="29" y="80.5" width="168" height="252" fill="black"/>
                  </mask>
                </defs>
                <image href={I4_SRC} width="223.591" height="412.584" mask="url(#i4mini_mask)"/>
              </svg>
            ) : (
              <svg viewBox="0 0 174.097 349.592" width={miniW} height={miniH}
              style={{position:"absolute",inset:0,zIndex:2,pointerEvents:"none"}}
              xmlns="http://www.w3.org/2000/svg">
              <defs>
<mask id="scm">
  <rect width="174.097" height="349.592" fill="white"/>
  <rect x="20" y="56.167" width="133" height="236.71" fill="black"/>
</mask>

<linearGradient id="gmw1" x1="113.27" y1="9.4688" x2="138.58" y2="9.4688" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#6B6969"/>
  <stop offset=".0125" stopColor="#8C8C8E"/>
  <stop offset=".0362" stopColor="#ADADAF"/>
  <stop offset=".0484" stopColor="#C0C2C4"/>
  <stop offset=".0783" stopColor="#999BA0"/>
  <stop offset=".086" stopColor="#D4D6D7"/>
  <stop offset=".9409" stopColor="#9A9C9E"/>
  <stop offset=".9416" stopColor="#ADADAF"/>
  <stop offset=".9471" stopColor="#C5C7C9"/>
  <stop offset=".9525" stopColor="#D4D6D7"/>
  <stop offset=".9578" stopColor="#D8DADB"/>
  <stop offset=".9629" stopColor="#E6E7E8"/>
  <stop offset=".9677" stopColor="#EAEBEC"/>
  <stop offset=".9782" stopColor="#C8CACB"/>
  <stop offset=".9881" stopColor="#ADADAF"/>
  <stop offset=".9957" stopColor="#8A8C8E"/>
  <stop offset="1" stopColor="#6B6969"/>
</linearGradient>
<linearGradient id="gmw3" x1="9.4585" y1="54.25" x2="9.4585" y2="69.127" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#6B6969"/>
  <stop offset=".0101" stopColor="#8A8C8E"/>
  <stop offset=".0278" stopColor="#ADADAF"/>
  <stop offset=".0509" stopColor="#C8CACB"/>
  <stop offset=".0753" stopColor="#EAEBEC"/>
  <stop offset=".1159" stopColor="#E6E7E8"/>
  <stop offset=".1592" stopColor="#D8DADB"/>
  <stop offset=".2037" stopColor="#D4D6D7"/>
  <stop offset=".249" stopColor="#C5C7C9"/>
  <stop offset=".2945" stopColor="#ADADAF"/>
  <stop offset=".3011" stopColor="#9A9C9E"/>
  <stop offset=".9086" stopColor="#D4D6D7"/>
  <stop offset=".9175" stopColor="#999BA0"/>
  <stop offset=".9516" stopColor="#C0C2C4"/>
  <stop offset=".9638" stopColor="#ADADAF"/>
  <stop offset=".9875" stopColor="#8C8C8E"/>
  <stop offset="1" stopColor="#6B6969"/>
</linearGradient>
<linearGradient id="gmw5" x1="9.1406" y1="85.5" x2="9.1406" y2="96.837" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#6B6969"/>
  <stop offset=".0743" stopColor="#737578"/>
  <stop offset=".101" stopColor="#858789"/>
  <stop offset=".1201" stopColor="#979899"/>
  <stop offset=".1355" stopColor="#A4A6A8"/>
  <stop offset=".1487" stopColor="#B0B2B4"/>
  <stop offset=".1604" stopColor="#C0C2C4"/>
  <stop offset=".1708" stopColor="#D0D2D3"/>
  <stop offset=".1774" stopColor="#EAEBEC"/>
  <stop offset=".1881" stopColor="#E6E7E8"/>
  <stop offset=".1994" stopColor="#D8DADB"/>
  <stop offset=".211" stopColor="#D4D6D7"/>
  <stop offset=".2229" stopColor="#C5C7C9"/>
  <stop offset=".2348" stopColor="#ADADAF"/>
  <stop offset=".2366" stopColor="#9A9C9E"/>
  <stop offset=".9086" stopColor="#D4D6D7"/>
  <stop offset=".9175" stopColor="#999BA0"/>
  <stop offset=".9516" stopColor="#C0C2C4"/>
  <stop offset=".9638" stopColor="#ADADAF"/>
  <stop offset=".9875" stopColor="#8C8C8E"/>
  <stop offset="1" stopColor="#6B6969"/>
</linearGradient>
<linearGradient id="gmw7" x1="9.1406" y1="112.96" x2="9.1406" y2="124.29" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#6B6969"/>
  <stop offset=".0743" stopColor="#737578"/>
  <stop offset=".101" stopColor="#858789"/>
  <stop offset=".1201" stopColor="#979899"/>
  <stop offset=".1355" stopColor="#A4A6A8"/>
  <stop offset=".1487" stopColor="#B0B2B4"/>
  <stop offset=".1604" stopColor="#C0C2C4"/>
  <stop offset=".1708" stopColor="#D0D2D3"/>
  <stop offset=".1774" stopColor="#EAEBEC"/>
  <stop offset=".1881" stopColor="#E6E7E8"/>
  <stop offset=".1994" stopColor="#D8DADB"/>
  <stop offset=".211" stopColor="#D4D6D7"/>
  <stop offset=".2229" stopColor="#C5C7C9"/>
  <stop offset=".2348" stopColor="#ADADAF"/>
  <stop offset=".2366" stopColor="#9A9C9E"/>
  <stop offset=".9086" stopColor="#D4D6D7"/>
  <stop offset=".9175" stopColor="#999BA0"/>
  <stop offset=".9516" stopColor="#C0C2C4"/>
  <stop offset=".9638" stopColor="#ADADAF"/>
  <stop offset=".9875" stopColor="#8C8C8E"/>
  <stop offset="1" stopColor="#6B6969"/>
</linearGradient>
<linearGradient id="gmw9" x1="86.621" y1="8.5" x2="86.621" y2="339.33" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#6D6E71"/>
  <stop offset=".0246" stopColor="#6D6E71"/>
  <stop offset=".0493" stopColor="#E6E7E8"/>
  <stop offset=".0726" stopColor="#939598"/>
  <stop offset=".8916" stopColor="#6B6969"/>
  <stop offset=".901" stopColor="#D4D6D7"/>
  <stop offset=".9127" stopColor="#A0A2A4"/>
  <stop offset=".9257" stopColor="#B8BABB"/>
  <stop offset=".9395" stopColor="#C9CBCC"/>
  <stop offset=".954" stopColor="#D8DADB"/>
  <stop offset=".9589" stopColor="#EAEBEC"/>
  <stop offset=".9605" stopColor="#D0D2D3"/>
  <stop offset=".9629" stopColor="#C8CACB"/>
  <stop offset=".9656" stopColor="#ADADAF"/>
  <stop offset=".9686" stopColor="#ADADAF"/>
  <stop offset=".9722" stopColor="#7E8082"/>
  <stop offset=".9766" stopColor="#6B6D6F"/>
  <stop offset=".9828" stopColor="#5A5C5E"/>
  <stop offset="1" stopColor="#4A4C4E"/>
</linearGradient>
<linearGradient id="gmw11" x1="73.614" y1="37.208" x2="99.445" y2="37.208" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#9A9C9E"/>
  <stop offset=".2693" stopColor="#515153"/>
  <stop offset=".3663" stopColor="#57575A"/>
  <stop offset=".4355" stopColor="#616264"/>
  <stop offset=".4914" stopColor="#6E7072"/>
  <stop offset=".5393" stopColor="#7F8183"/>
  <stop offset=".5809" stopColor="#939597"/>
  <stop offset=".6129" stopColor="#EAEBEC"/>
  <stop offset=".6871" stopColor="#8E9092"/>
  <stop offset=".8343" stopColor="#ADADAF"/>
  <stop offset=".9428" stopColor="#8C8C8E"/>
  <stop offset="1" stopColor="#6B6969"/>
</linearGradient>
<linearGradient id="gmw12" x1="98.948" y1="36.062" x2="99.011" y2="36.062" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#9A9C9E"/>
  <stop offset=".2693" stopColor="#515153"/>
  <stop offset=".3663" stopColor="#57575A"/>
  <stop offset=".4355" stopColor="#616264"/>
  <stop offset=".4914" stopColor="#6E7072"/>
  <stop offset=".5393" stopColor="#7F8183"/>
  <stop offset=".5809" stopColor="#939597"/>
  <stop offset=".6129" stopColor="#EAEBEC"/>
  <stop offset=".6871" stopColor="#8E9092"/>
  <stop offset=".8343" stopColor="#ADADAF"/>
  <stop offset=".9428" stopColor="#8C8C8E"/>
  <stop offset="1" stopColor="#6B6969"/>
</linearGradient>
<linearGradient id="gmw13" x1="83.393" y1="22.072" x2="90.081" y2="27.947" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#6B6969"/>
  <stop offset=".4812" stopColor="#737578"/>
  <stop offset=".6546" stopColor="#858789"/>
  <stop offset=".7781" stopColor="#979899"/>
  <stop offset=".878" stopColor="#A4A6A8"/>
  <stop offset=".9626" stopColor="#67696B"/>
  <stop offset="1" stopColor="#C0C2C4"/>
</linearGradient>
<linearGradient id="gmw18" x1="117.86" y1="12.5" x2="117.86" y2="260.83" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#FFFFFF" stopOpacity=".5"/>
  <stop offset=".1235" stopColor="#FFFFFF" stopOpacity=".4382"/>
  <stop offset="1" stopColor="#FFFFFF" stopOpacity="0"/>
</linearGradient>
<linearGradient id="gmw21" x1="85.708" y1="333.67" x2="85.708" y2="298.32" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#FFFFFF" stopOpacity=".5"/>
  <stop offset=".1235" stopColor="#FFFFFF" stopOpacity=".4382"/>
  <stop offset="1" stopColor="#FFFFFF" stopOpacity="0"/>
</linearGradient>
<radialGradient id="gmw2" cx="125.12" cy="7.375" r="13.412" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#EAEBEC"/>
  <stop offset=".1162" stopColor="#E6E7E8"/>
  <stop offset=".2397" stopColor="#D8DADB"/>
  <stop offset=".3668" stopColor="#D4D6D7"/>
  <stop offset=".4963" stopColor="#C5C7C9"/>
  <stop offset=".6264" stopColor="#ADADAF"/>
  <stop offset=".6452" stopColor="#9A9C9E"/>
  <stop offset=".774" stopColor="#4D4E50"/>
  <stop offset=".8204" stopColor="#474749"/>
  <stop offset=".8533" stopColor="#383839"/>
  <stop offset=".871" stopColor="#6B6969"/>
  <stop offset=".926" stopColor="#8A8C8E"/>
  <stop offset=".9516" stopColor="#D4D6D7"/>
  <stop offset=".9616" stopColor="#999BA0"/>
  <stop offset="1" stopColor="#C0C2C4"/>
</radialGradient>
<radialGradient id="gmw4" cx="6.9375" cy="61.812" r="7.5065" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#EAEBEC"/>
  <stop offset=".1142" stopColor="#E6E7E8"/>
  <stop offset=".2357" stopColor="#D8DADB"/>
  <stop offset=".3607" stopColor="#D4D6D7"/>
  <stop offset=".488" stopColor="#C5C7C9"/>
  <stop offset=".616" stopColor="#ADADAF"/>
  <stop offset=".6344" stopColor="#9A9C9E"/>
  <stop offset=".828" stopColor="#6B6969"/>
  <stop offset=".883" stopColor="#8A8C8E"/>
  <stop offset=".9086" stopColor="#D4D6D7"/>
  <stop offset=".9274" stopColor="#999BA0"/>
  <stop offset="1" stopColor="#C0C2C4"/>
</radialGradient>
<radialGradient id="gmw6" cx="7.2085" cy="91.292" r="5.6679" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#EAEBEC"/>
  <stop offset=".1162" stopColor="#E6E7E8"/>
  <stop offset=".2397" stopColor="#D8DADB"/>
  <stop offset=".3668" stopColor="#D4D6D7"/>
  <stop offset=".4963" stopColor="#C5C7C9"/>
  <stop offset=".6264" stopColor="#ADADAF"/>
  <stop offset=".6452" stopColor="#9A9C9E"/>
  <stop offset=".8139" stopColor="#4D4E50"/>
  <stop offset=".8746" stopColor="#474749"/>
  <stop offset=".9178" stopColor="#383839"/>
  <stop offset=".9409" stopColor="#6B6969"/>
  <stop offset=".9812" stopColor="#8A8C8E"/>
  <stop offset="1" stopColor="#D4D6D7"/>
</radialGradient>
<radialGradient id="gmw8" cx="7.2085" cy="118.75" r="5.6679" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#EAEBEC"/>
  <stop offset=".1162" stopColor="#E6E7E8"/>
  <stop offset=".2397" stopColor="#D8DADB"/>
  <stop offset=".3668" stopColor="#D4D6D7"/>
  <stop offset=".4963" stopColor="#C5C7C9"/>
  <stop offset=".6264" stopColor="#ADADAF"/>
  <stop offset=".6452" stopColor="#9A9C9E"/>
  <stop offset=".8139" stopColor="#4D4E50"/>
  <stop offset=".8746" stopColor="#474749"/>
  <stop offset=".9178" stopColor="#383839"/>
  <stop offset=".9409" stopColor="#6B6969"/>
  <stop offset=".9812" stopColor="#8A8C8E"/>
  <stop offset="1" stopColor="#D4D6D7"/>
</radialGradient>
<radialGradient id="gmw10" cx="86.583" cy="45.5" r="14.045" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#9A9C9E"/>
  <stop offset=".2693" stopColor="#515153"/>
  <stop offset=".3663" stopColor="#57575A"/>
  <stop offset=".4355" stopColor="#616264"/>
  <stop offset=".4914" stopColor="#6E7072"/>
  <stop offset=".5393" stopColor="#7F8183"/>
  <stop offset=".5809" stopColor="#939597"/>
  <stop offset=".6129" stopColor="#EAEBEC"/>
  <stop offset=".6871" stopColor="#8E9092"/>
  <stop offset=".8343" stopColor="#ADADAF"/>
  <stop offset=".9428" stopColor="#8C8C8E"/>
  <stop offset="1" stopColor="#6B6969"/>
</radialGradient>
<radialGradient id="gmw14" cx="87.146" cy="24.98" r="2.0836" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#00062F"/>
  <stop offset=".2232" stopColor="#000830"/>
  <stop offset=".4278" stopColor="#000F34"/>
  <stop offset=".6249" stopColor="#00173B"/>
  <stop offset=".8164" stopColor="#012143"/>
  <stop offset="1" stopColor="#212D4E"/>
</radialGradient>
<radialGradient id="gmw15" cx="86.082" cy="25.369" r=".4952" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#39BCED"/>
  <stop offset=".3637" stopColor="#0076A4"/>
  <stop offset="1" stopColor="#00062F"/>
</radialGradient>
<radialGradient id="gmw16" cx="87.688" cy="24.312" r=".8706" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#39BCED"/>
  <stop offset=".3637" stopColor="#0076A4"/>
  <stop offset="1" stopColor="#00062F"/>
</radialGradient>
<radialGradient id="gmw17" cx="86.364" cy="24.351" r=".7308" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#24132E"/>
  <stop offset=".3463" stopColor="#261732"/>
  <stop offset=".6634" stopColor="#2E213B"/>
  <stop offset=".9683" stopColor="#3A2F4A"/>
  <stop offset="1" stopColor="#3B304C"/>
</radialGradient>
<radialGradient id="gmw19" cx="85.626" cy="300.44" r="18.875" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#FFFFFF" stopOpacity=".5"/>
  <stop offset=".1235" stopColor="#FFFFFF" stopOpacity=".4382"/>
  <stop offset="1" stopColor="#FFFFFF" stopOpacity="0"/>
</radialGradient>
<radialGradient id="gmw20" cx="81.792" cy="309.83" r="13.316" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#ABADB0"/>
  <stop offset=".1017" stopColor="#9FA1A3"/>
  <stop offset=".2907" stopColor="#8D8F91"/>
  <stop offset=".493" stopColor="#808285"/>
  <stop offset=".7161" stopColor="#797B7D"/>
  <stop offset="1" stopColor="#77787B"/>
</radialGradient>
<linearGradient id="gmw_homeW" x1="85.708" y1="300.41" x2="85.708" y2="329.83" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#FFFFFF"/>
  <stop offset="1" stopColor="#DBDBDB"/>
</linearGradient>

<linearGradient id="gm1" x1="113.27" y1="9.4688" x2="138.58" y2="9.4688" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#1E1E1F"/>
  <stop offset=".0125" stopColor="#3D3C3E"/>
  <stop offset=".0362" stopColor="#606163"/>
  <stop offset=".0484" stopColor="#717375"/>
  <stop offset=".0783" stopColor="#4E4E50"/>
  <stop offset=".086" stopColor="#434344"/>
  <stop offset=".9409" stopColor="#4F4F51"/>
  <stop offset=".9416" stopColor="#555557"/>
  <stop offset=".9471" stopColor="#737578"/>
  <stop offset=".9525" stopColor="#8A8C8E"/>
  <stop offset=".9578" stopColor="#9A9C9E"/>
  <stop offset=".9629" stopColor="#A4A6A8"/>
  <stop offset=".9677" stopColor="#A7A9AC"/>
  <stop offset=".9782" stopColor="#7C7E80"/>
  <stop offset=".9881" stopColor="#57585A"/>
  <stop offset=".9957" stopColor="#39393A"/>
  <stop offset="1" stopColor="#222223"/>
</linearGradient>
<linearGradient id="gm3" x1="9.4585" y1="54.25" x2="9.4585" y2="69.127" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#222223"/>
  <stop offset=".0101" stopColor="#39393A"/>
  <stop offset=".0278" stopColor="#57585A"/>
  <stop offset=".0509" stopColor="#7C7E80"/>
  <stop offset=".0753" stopColor="#A7A9AC"/>
  <stop offset=".1159" stopColor="#A4A6A8"/>
  <stop offset=".1592" stopColor="#9A9C9E"/>
  <stop offset=".2037" stopColor="#8A8C8E"/>
  <stop offset=".249" stopColor="#737578"/>
  <stop offset=".2945" stopColor="#555557"/>
  <stop offset=".3011" stopColor="#4F4F51"/>
  <stop offset=".9086" stopColor="#434344"/>
  <stop offset=".9175" stopColor="#4E4E50"/>
  <stop offset=".9516" stopColor="#717375"/>
  <stop offset=".9638" stopColor="#606163"/>
  <stop offset=".9875" stopColor="#3D3C3E"/>
  <stop offset="1" stopColor="#1E1E1F"/>
</linearGradient>
<linearGradient id="gm5" x1="9.1406" y1="85.5" x2="9.1406" y2="96.837" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#222223"/>
  <stop offset=".0743" stopColor="#272728"/>
  <stop offset=".101" stopColor="#353536"/>
  <stop offset=".1201" stopColor="#464647"/>
  <stop offset=".1355" stopColor="#555658"/>
  <stop offset=".1487" stopColor="#68696B"/>
  <stop offset=".1604" stopColor="#7C7E81"/>
  <stop offset=".1708" stopColor="#949699"/>
  <stop offset=".1774" stopColor="#A7A9AC"/>
  <stop offset=".1881" stopColor="#A4A6A8"/>
  <stop offset=".1994" stopColor="#9A9C9E"/>
  <stop offset=".211" stopColor="#8A8C8E"/>
  <stop offset=".2229" stopColor="#737578"/>
  <stop offset=".2348" stopColor="#555557"/>
  <stop offset=".2366" stopColor="#4F4F51"/>
  <stop offset=".9086" stopColor="#434344"/>
  <stop offset=".9175" stopColor="#4E4E50"/>
  <stop offset=".9516" stopColor="#717375"/>
  <stop offset=".9638" stopColor="#606163"/>
  <stop offset=".9875" stopColor="#3D3C3E"/>
  <stop offset="1" stopColor="#1E1E1F"/>
</linearGradient>
<linearGradient id="gm7" x1="9.1406" y1="112.96" x2="9.1406" y2="124.29" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#222223"/>
  <stop offset=".0743" stopColor="#272728"/>
  <stop offset=".101" stopColor="#353536"/>
  <stop offset=".1201" stopColor="#464647"/>
  <stop offset=".1355" stopColor="#555658"/>
  <stop offset=".1487" stopColor="#68696B"/>
  <stop offset=".1604" stopColor="#7C7E81"/>
  <stop offset=".1708" stopColor="#949699"/>
  <stop offset=".1774" stopColor="#A7A9AC"/>
  <stop offset=".1881" stopColor="#A4A6A8"/>
  <stop offset=".1994" stopColor="#9A9C9E"/>
  <stop offset=".211" stopColor="#8A8C8E"/>
  <stop offset=".2229" stopColor="#737578"/>
  <stop offset=".2348" stopColor="#555557"/>
  <stop offset=".2366" stopColor="#4F4F51"/>
  <stop offset=".9086" stopColor="#434344"/>
  <stop offset=".9175" stopColor="#4E4E50"/>
  <stop offset=".9516" stopColor="#717375"/>
  <stop offset=".9638" stopColor="#606163"/>
  <stop offset=".9875" stopColor="#3D3C3E"/>
  <stop offset="1" stopColor="#1E1E1F"/>
</linearGradient>
<linearGradient id="gm9" x1="86.621" y1="8.5" x2="86.621" y2="339.33" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#000000"/>
  <stop offset=".0246" stopColor="#414042"/>
  <stop offset=".0493" stopColor="#BDBFC1"/>
  <stop offset=".0726" stopColor="#2E2D2F"/>
  <stop offset=".8916" stopColor="#1E1E1F"/>
  <stop offset=".901" stopColor="#2B2B2C"/>
  <stop offset=".9127" stopColor="#454446"/>
  <stop offset=".9257" stopColor="#5C5C5F"/>
  <stop offset=".9395" stopColor="#787A7C"/>
  <stop offset=".954" stopColor="#9A9C9E"/>
  <stop offset=".9589" stopColor="#A7A9AC"/>
  <stop offset=".9605" stopColor="#939698"/>
  <stop offset=".9629" stopColor="#7C7E80"/>
  <stop offset=".9656" stopColor="#67686B"/>
  <stop offset=".9686" stopColor="#555557"/>
  <stop offset=".9722" stopColor="#454547"/>
  <stop offset=".9766" stopColor="#343435"/>
  <stop offset=".9828" stopColor="#262526"/>
  <stop offset="1" stopColor="#212122"/>
</linearGradient>
<linearGradient id="gm11" x1="73.614" y1="37.208" x2="99.445" y2="37.208" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#4F4F51"/>
  <stop offset=".2693" stopColor="#515153"/>
  <stop offset=".3663" stopColor="#57575A"/>
  <stop offset=".4355" stopColor="#616264"/>
  <stop offset=".4914" stopColor="#6E7072"/>
  <stop offset=".5393" stopColor="#7F8183"/>
  <stop offset=".5809" stopColor="#939597"/>
  <stop offset=".6129" stopColor="#A7A9AC"/>
  <stop offset=".6871" stopColor="#8E9092"/>
  <stop offset=".8343" stopColor="#606163"/>
  <stop offset=".9428" stopColor="#3D3C3E"/>
  <stop offset="1" stopColor="#1E1E1F"/>
</linearGradient>
<linearGradient id="gm12" x1="98.948" y1="36.062" x2="99.011" y2="36.062" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#4F4F51"/>
  <stop offset=".2693" stopColor="#515153"/>
  <stop offset=".3663" stopColor="#57575A"/>
  <stop offset=".4355" stopColor="#616264"/>
  <stop offset=".4914" stopColor="#6E7072"/>
  <stop offset=".5393" stopColor="#7F8183"/>
  <stop offset=".5809" stopColor="#939597"/>
  <stop offset=".6129" stopColor="#A7A9AC"/>
  <stop offset=".6871" stopColor="#8E9092"/>
  <stop offset=".8343" stopColor="#606163"/>
  <stop offset=".9428" stopColor="#3D3C3E"/>
  <stop offset="1" stopColor="#1E1E1F"/>
</linearGradient>
<linearGradient id="gm13" x1="83.393" y1="22.072" x2="90.081" y2="27.947" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#222223"/>
  <stop offset=".4812" stopColor="#272728"/>
  <stop offset=".6546" stopColor="#353536"/>
  <stop offset=".7781" stopColor="#464647"/>
  <stop offset=".878" stopColor="#555658"/>
  <stop offset=".9626" stopColor="#67696B"/>
  <stop offset="1" stopColor="#717375"/>
</linearGradient>
<linearGradient id="gm18" x1="117.86" y1="12.5" x2="117.86" y2="260.83" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#FFFFFF" stopOpacity=".5"/>
  <stop offset=".1235" stopColor="#FFFFFF" stopOpacity=".4382"/>
  <stop offset="1" stopColor="#FFFFFF" stopOpacity="0"/>
</linearGradient>
<linearGradient id="gm21" x1="85.708" y1="333.67" x2="85.708" y2="298.32" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#FFFFFF" stopOpacity=".5"/>
  <stop offset=".1235" stopColor="#FFFFFF" stopOpacity=".4382"/>
  <stop offset="1" stopColor="#FFFFFF" stopOpacity="0"/>
</linearGradient>
<radialGradient id="gm2" cx="125.12" cy="7.375" r="13.412" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#A7A9AC"/>
  <stop offset=".1162" stopColor="#A4A6A8"/>
  <stop offset=".2397" stopColor="#9A9C9E"/>
  <stop offset=".3668" stopColor="#8A8C8E"/>
  <stop offset=".4963" stopColor="#737578"/>
  <stop offset=".6264" stopColor="#555557"/>
  <stop offset=".6452" stopColor="#4F4F51"/>
  <stop offset=".774" stopColor="#4D4E50"/>
  <stop offset=".8204" stopColor="#474749"/>
  <stop offset=".8533" stopColor="#383839"/>
  <stop offset=".871" stopColor="#222223"/>
  <stop offset=".926" stopColor="#39393A"/>
  <stop offset=".9516" stopColor="#434344"/>
  <stop offset=".9616" stopColor="#4E4E50"/>
  <stop offset="1" stopColor="#717375"/>
</radialGradient>
<radialGradient id="gm4" cx="6.9375" cy="61.812" r="7.5065" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#A7A9AC"/>
  <stop offset=".1142" stopColor="#A4A6A8"/>
  <stop offset=".2357" stopColor="#9A9C9E"/>
  <stop offset=".3607" stopColor="#8A8C8E"/>
  <stop offset=".488" stopColor="#737578"/>
  <stop offset=".616" stopColor="#555557"/>
  <stop offset=".6344" stopColor="#4F4F51"/>
  <stop offset=".828" stopColor="#222223"/>
  <stop offset=".883" stopColor="#39393A"/>
  <stop offset=".9086" stopColor="#434344"/>
  <stop offset=".9274" stopColor="#4E4E50"/>
  <stop offset="1" stopColor="#717375"/>
</radialGradient>
<radialGradient id="gm6" cx="7.2085" cy="91.292" r="5.6679" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#A7A9AC"/>
  <stop offset=".1162" stopColor="#A4A6A8"/>
  <stop offset=".2397" stopColor="#9A9C9E"/>
  <stop offset=".3668" stopColor="#8A8C8E"/>
  <stop offset=".4963" stopColor="#737578"/>
  <stop offset=".6264" stopColor="#555557"/>
  <stop offset=".6452" stopColor="#4F4F51"/>
  <stop offset=".8139" stopColor="#4D4E50"/>
  <stop offset=".8746" stopColor="#474749"/>
  <stop offset=".9178" stopColor="#383839"/>
  <stop offset=".9409" stopColor="#222223"/>
  <stop offset=".9812" stopColor="#39393A"/>
  <stop offset="1" stopColor="#434344"/>
</radialGradient>
<radialGradient id="gm8" cx="7.2085" cy="118.75" r="5.6679" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#A7A9AC"/>
  <stop offset=".1162" stopColor="#A4A6A8"/>
  <stop offset=".2397" stopColor="#9A9C9E"/>
  <stop offset=".3668" stopColor="#8A8C8E"/>
  <stop offset=".4963" stopColor="#737578"/>
  <stop offset=".6264" stopColor="#555557"/>
  <stop offset=".6452" stopColor="#4F4F51"/>
  <stop offset=".8139" stopColor="#4D4E50"/>
  <stop offset=".8746" stopColor="#474749"/>
  <stop offset=".9178" stopColor="#383839"/>
  <stop offset=".9409" stopColor="#222223"/>
  <stop offset=".9812" stopColor="#39393A"/>
  <stop offset="1" stopColor="#434344"/>
</radialGradient>
<radialGradient id="gm10" cx="86.583" cy="45.5" r="14.045" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#4F4F51"/>
  <stop offset=".2693" stopColor="#515153"/>
  <stop offset=".3663" stopColor="#57575A"/>
  <stop offset=".4355" stopColor="#616264"/>
  <stop offset=".4914" stopColor="#6E7072"/>
  <stop offset=".5393" stopColor="#7F8183"/>
  <stop offset=".5809" stopColor="#939597"/>
  <stop offset=".6129" stopColor="#A7A9AC"/>
  <stop offset=".6871" stopColor="#8E9092"/>
  <stop offset=".8343" stopColor="#606163"/>
  <stop offset=".9428" stopColor="#3D3C3E"/>
  <stop offset="1" stopColor="#1E1E1F"/>
</radialGradient>
<radialGradient id="gm14" cx="87.146" cy="24.98" r="2.0836" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#00062F"/>
  <stop offset=".2232" stopColor="#000830"/>
  <stop offset=".4278" stopColor="#000F34"/>
  <stop offset=".6249" stopColor="#00173B"/>
  <stop offset=".8164" stopColor="#012143"/>
  <stop offset="1" stopColor="#212D4E"/>
</radialGradient>
<radialGradient id="gm15" cx="86.082" cy="25.369" r=".4952" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#39BCED"/>
  <stop offset=".3637" stopColor="#0076A4"/>
  <stop offset="1" stopColor="#00062F"/>
</radialGradient>
<radialGradient id="gm16" cx="87.688" cy="24.312" r=".8706" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#39BCED"/>
  <stop offset=".3637" stopColor="#0076A4"/>
  <stop offset="1" stopColor="#00062F"/>
</radialGradient>
<radialGradient id="gm17" cx="86.364" cy="24.351" r=".7308" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#24132E"/>
  <stop offset=".3463" stopColor="#261732"/>
  <stop offset=".6634" stopColor="#2E213B"/>
  <stop offset=".9683" stopColor="#3A2F4A"/>
  <stop offset="1" stopColor="#3B304C"/>
</radialGradient>
<radialGradient id="gm19" cx="85.626" cy="300.44" r="18.875" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#FFFFFF" stopOpacity=".5"/>
  <stop offset=".1235" stopColor="#FFFFFF" stopOpacity=".4382"/>
  <stop offset="1" stopColor="#FFFFFF" stopOpacity="0"/>
</radialGradient>
<radialGradient id="gm20" cx="81.792" cy="309.83" r="13.316" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#ABADB0"/>
  <stop offset=".1017" stopColor="#9FA1A3"/>
  <stop offset=".2907" stopColor="#8D8F91"/>
  <stop offset=".493" stopColor="#808285"/>
  <stop offset=".7161" stopColor="#797B7D"/>
  <stop offset="1" stopColor="#77787B"/>
</radialGradient>
</defs>
<g mask="url(#scm)">
  <path d="m164.87 315.33c0 13.2-10.8 24-24 24h-108.5c-13.2 0-24-10.8-24-24v-282.83c0-13.2 10.8-24 24-24h108.49c13.2 0 24 10.8 24 24v282.83z" fill={isBlackMini ? "url(#gm9)" : "url(#gmw9)"}/>
  <path d="m32.375 337.33c-12.131 0-22-9.869-22-22v-282.83c0-12.131 9.869-22 22-22h108.49c12.131 0 22 9.869 22 22v282.83c0 12.131-9.869 22-22 22h-108.48z" fill={isBlackMini?"#4F5560":"#C9CBCC"}/>
  <path d="m32.375 336.83c-11.855 0-21.5-9.645-21.5-21.5v-282.83c0-11.855 9.645-21.5 21.5-21.5h108.49c11.855 0 21.5 9.645 21.5 21.5v282.83c0 11.855-9.645 21.5-21.5 21.5h-108.48z" fill={isBlackMini?"#292B2D":"#D8DADB"}/>
  <path d="m32.375 335.33c-11.028 0-20-8.972-20-20v-282.83c0-11.028 8.972-20 20-20h108.49c11.028 0 20 8.972 20 20v282.83c0 11.028-8.972 20-20 20h-108.48z" fill={isBlackMini?"black":"#E0E0DC"}/>
  <path d="m154.67 292.33c0 1.1-0.9 2-2 2h-132.5c-1.1 0-2-0.9-2-2v-236.33c0-1.1 0.9-2 2-2h132.5c1.1 0 2 0.9 2 2v236.33z" fill={isBlackMini?"#0B0B0C":"#E8E8E8"}/>
  <path d="m160.87 32.5c0-11.028-8.972-20-20-20h-66.01l7.462 21.625h15.678c1.818 0 3.292 1.474 3.292 3.292s-1.474 3.292-3.292 3.292h-13.406l76.275 221.03v-229.24zm-74.287-4.667c-1.634 0-2.958-1.325-2.958-2.958s1.325-2.958 2.958-2.958 2.958 1.325 2.958 2.958-1.324 2.958-2.958 2.958z" fill={isBlackMini ? "url(#gm18)" : "url(#gmw18)"}/>
</g>

<path d="m138.58 7.831c0 0.55-0.45 1-1 1h-23.313c-0.55 0-1-0.45-1-1v-1.531c0-0.55 0.45-1 1-1h23.313c0.55 0 1 0.45 1 1v1.531z" fill={isBlackMini ? "url(#gm1)" : "url(#gmw1)"}/>
<path d="m113.38 6.3h25.088c-0.164-0.329-0.497-0.563-0.888-0.563h-23.313c-0.39 0.001-0.72 0.234-0.89 0.563z" fill={isBlackMini ? "url(#gm2)" : "url(#gmw2)"}/>
<path d="m8.5 67.958c0 0.55-0.45 1-1 1h-1.875c-0.55 0-1-0.45-1-1v-12.708c0-0.55 0.45-1 1-1h1.875c0.55 0 1 0.45 1 1v12.708z" fill={isBlackMini ? "url(#gm3)" : "url(#gmw3)"}/>
<path d="m6.042 54.318c-0.385 0.139-0.667 0.5-0.667 0.932v12.708c0 0.432 0.281 0.793 0.667 0.932v-14.572z" fill={isBlackMini ? "url(#gm4)" : "url(#gmw4)"}/>
<path d="m8.5 95.844c0 0.55-0.45 1-1 1h-1.39c-0.55 0-1-0.45-1-1v-9.406c0-0.55 0.45-1 1-1h1.39c0.55 0 1 0.45 1 1v9.406z" fill={isBlackMini ? "url(#gm5)" : "url(#gmw5)"}/>
<path d="m6.610 85.592c-0.293 0.175-0.5 0.481-0.5 0.846v9.406c0 0.364 0.207 0.67 0.5 0.846v-11.098z" fill={isBlackMini ? "url(#gm6)" : "url(#gmw6)"}/>
<path d="m8.5 123.3c0 0.55-0.45 1-1 1h-1.39c-0.55 0-1-0.45-1-1v-9.406c0-0.55 0.45-1 1-1h1.39c0.55 0 1 0.45 1 1v9.41z" fill={isBlackMini ? "url(#gm7)" : "url(#gmw7)"}/>
<path d="m6.610 113.05c-0.293 0.175-0.5 0.481-0.5 0.846v9.406c0 0.364 0.207 0.67 0.5 0.846v-11.11z" fill={isBlackMini ? "url(#gm8)" : "url(#gmw8)"}/>

<path d="m101.29 37.417c0 1.818-1.474 3.292-3.292 3.292h-22.831c-1.818 0-3.292-1.474-3.292-3.292s1.474-3.292 3.292-3.292h22.833c1.818 0 3.29 1.474 3.29 3.292z" fill={isBlackMini ? "url(#gm10)" : "url(#gmw10)"}/>
<path d="m99.458 37.208c0 0.897-0.728 1.625-1.625 1.625h-22.625c-0.897 0-1.625-0.728-1.625-1.625s0.728-1.625 1.625-1.625h22.625c0.898 0 1.625 0.728 1.625 1.625z" fill={isBlackMini?"#0F0F10":"#D8D8D6"}/>
<path d="m98.787 37.729l0.43-0.43 0.211 0.211c0.008-0.041 0.008-0.085 0.013-0.127l-0.154-0.154 0.158-0.158c-0.004-0.042-0.006-0.086-0.013-0.127l-0.215 0.215-0.43-0.43 0.407-0.407c-0.019-0.028-0.04-0.053-0.06-0.081l-0.417 0.417-0.43-0.43 0.399-0.399c-0.029-0.018-0.061-0.033-0.091-0.049l-0.378 0.378-0.43-0.43 0.136-0.136c-0.03-0.002-0.059-0.009-0.089-0.009h-0.042l-0.075 0.075-0.075-0.075h-0.142l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.146-0.146h-0.141l-0.075 0.075-0.075-0.075h-0.141l0.146 0.146-0.43 0.43-0.43-0.43 0.115-0.115c-0.099 0.019-0.194 0.048-0.286 0.084l0.03 0.03-0.43 0.43-0.125-0.125c-0.024 0.023-0.046 0.047-0.069 0.072l0.124 0.124-0.43 0.43-0.023-0.023c-0.033 0.086-0.061 0.174-0.079 0.266l0.102-0.102 0.43 0.43-0.43 0.43-0.089-0.089c0.019 0.084 0.044 0.166 0.076 0.244l0.014-0.014 0.43 0.43-0.105 0.105c0.023 0.024 0.048 0.045 0.073 0.068l0.103-0.103 0.428 0.428c0.066 0.024 0.134 0.047 0.204 0.063l-0.061-0.061 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.141l-0.104-0.104 0.43-0.43 0.43 0.43-0.104 0.104h0.141l0.034-0.034 0.034 0.034h0.083c0.018 0 0.035-0.005 0.052-0.005l-0.099-0.099 0.43-0.43 0.351 0.351c0.031-0.016 0.062-0.032 0.091-0.049l-0.372-0.372 0.43-0.43 0.398 0.398c0.02-0.027 0.044-0.05 0.063-0.077l-0.437-0.393zm-0.141-1l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.07 0.93l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.5 0.5l-0.43 0.43-0.43-0.43 0.43-0.43 0.43 0.43zm-0.43-1.43l0.43 0.43-0.43 0.43-0.43-0.43 0.43-0.43zm-0.929 0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0 1l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43zm0.929 0.93l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.5-0.5l-0.43-0.43 0.43-0.43 0.43 0.43-0.43 0.43zm0.071-0.93l0.43-0.43 0.43 0.43-0.43 0.43-0.43-0.43z" fill={isBlackMini ? "url(#gm11)" : "url(#gmw11)"}/>
<path d="m98.948 36.031l0.063 0.063c-0.02-0.022-0.041-0.043-0.063-0.063z" fill={isBlackMini ? "url(#gm12)" : "url(#gmw12)"}/>

<circle cx="86.583" cy="24.875" r="2.958" fill={isBlackMini ? "url(#gm13)" : "url(#gmw13)"}/>
<circle cx="86.583" cy="24.875" r="1.302" fill={isBlackMini ? "url(#gm14)" : "url(#gmw14)"}/>
<circle cx="85.948" cy="25.344" r=".31" fill={isBlackMini ? "url(#gm15)" : "url(#gmw15)"}/>
<circle cx="87.333" cy="24.417" r=".31" fill={isBlackMini ? "url(#gm16)" : "url(#gmw16)"}/>
<circle cx="86.167" cy="24.314" r=".457" fill={isBlackMini ? "url(#gm17)" : "url(#gmw17)"}/>

<circle cx="85.708" cy="315.12" r="14.708" fill={isBlackMini?"black":"#E0E0DC"}/>
<path d="m85.708 300.73c8.071 0 14.616 6.501 14.701 14.552 0-0.053 0.008-0.104 0.008-0.156 0-8.124-6.585-14.708-14.708-14.708s-14.712 6.59-14.712 14.71c0 0.053 0.007 0.104 0.008 0.156 0.085-8.05 6.63-14.55 14.7-14.55z" fill={isBlackMini ? "url(#gm19)" : "url(#gmw19)"}/>
<path d="m88.329 320.58h-5.281c-1.654 0-3-1.346-3-3v-5.208c0-1.654 1.346-3 3-3h5.281c1.654 0 3 1.346 3 3v5.208c0 1.66-1.346 3-3 3zm-5.281-10.2c-1.103 0-2 0.897-2 2v5.208c0 1.103 0.897 2 2 2h5.281c1.103 0 2-0.897 2-2v-5.208c0-1.103-0.897-2-2-2h-5.281z" fill={isBlackMini ? "url(#gm20)" : "url(#gmw20)"}/>
<path d="m85.708 316.38c-5.415 0-10.456-0.358-14.694-0.972 0.149 7.994 6.665 14.43 14.694 14.43s14.545-6.437 14.694-14.43c-4.235 0.61-9.276 0.97-14.692 0.97z" fill={isBlackMini ? "url(#gm21)" : "url(#gmw21)"}/>
              </svg>
            )}
          </>}
        </div>
        );
      })() : (
        d.chassisPng && d.chassisPng !== "__svgblack__"
        ? (()=>{
            const _inset = d.screenInset||{top:141};
            const _isWiko = _inset.top >= 145;
            const _VH = _isWiko ? 994.05 : 966, _VW = _isWiko ? 501.48 : 500;
            const mW=130, mH=Math.round(130*_VH/_VW);
            const _scrTop = (_inset.top/_VH*100).toFixed(2)+"%";
            const _scrLeft = (_inset.left/_VW*100).toFixed(2)+"%";
            const _scrW = ((_VW-_inset.left-_inset.right)/_VW*100).toFixed(2)+"%";
            const _scrH = ((_VH-_inset.top-_inset.bottom)/_VH*100).toFixed(2)+"%";
            const _totalH = mH;
            return <div style={{width:mW,height:_totalH,position:"relative",flexShrink:0}}>
              <div style={{position:"absolute",top:_scrTop,left:_scrLeft,width:_scrW,height:_scrH,overflow:"hidden",filter:lit?"brightness(1.1)":"brightness(0.85)",transition:"filter 0.3s"}}>
                <PhoneCardClock isIos={false} bgStyle={bgStyle}/>
              </div>
              <svg viewBox={`0 0 ${_VW} ${_VH+(_totalH-mH)*_VH/_VW}`} width={mW} height={_totalH} style={{position:"absolute",inset:0,zIndex:2,pointerEvents:"none"}} xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
                <defs><mask id="and_mini_mask"><rect width={_VW} height={_VH*2} fill="white"/><rect x={_inset.left} y={_inset.top} width={_VW-_inset.left-_inset.right} height={_VH-_inset.top-_inset.bottom} rx="6" fill="black"/></mask></defs>
                <image href={d.chassisPng} width={_VW} height={_VH} mask="url(#and_mini_mask)"/>
              </svg>
            </div>;
          })()
        : <div style={{
            width:130, height:240, borderRadius:8,
            background:"linear-gradient(145deg,#2a2a2a,#1a1a1a)",
            boxShadow: lit
              ? `0 0 0 1px #444, 0 12px 40px rgba(0,0,0,0.3), 0 0 30px ${c.color}55`
              : "0 0 0 1px #444, 0 8px 24px rgba(0,0,0,0.3)",
            display:"flex", flexDirection:"column",
            padding:"4px 3px 0", transition:"box-shadow 0.3s",
          }}>
            <div style={{flex:1,borderRadius:3,overflow:"hidden",position:"relative",transition:"filter 0.3s",filter:lit?"brightness(1.1)":"brightness(0.8)"}}>
              <PhoneCardClock isIos={false} bgStyle={bgStyle}/>
            </div>
            <div style={{height:16,display:"flex",alignItems:"center",justifyContent:"space-around",padding:"0 8px"}}>
              {[0,1,2].map(i=><div key={i} style={{width:6,height:6,background:"#444",borderRadius:1}}/>)}
            </div>
          </div>
      )}

      </div>);})()}
    </div>
  );
};

// ── removed duplicate block ──

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
// ─── DONNÉES DE BASE (seed) ──────────────────────────────────────────────────
// Pas de persistance : les données initiales sont régénérées à chaque chargement.
const forceAccents = (d) => {
  const out = {...d};
  Object.entries(FORCED_ACCENTS).forEach(([k,v]) => { if(out[k]) out[k] = {...out[k], accentColor:v}; });
  return out;
};

// Hard-coded playlists — never overwritten by JSON import
const forcePlaylists = (d) => {
  const out = {...d};
  Object.entries(FORCED_PLAYLISTS).forEach(([k,v]) => {
    if(out[k]) out[k] = {...out[k], ...v};
  });
  return out;
};

// Seed "playlist n°1" : regroupe tous les morceaux déjà présents dans data[k].music au moment du
// seed, dans une playlist nommée "playlist n°1" (nom + cover personnalisables ensuite dans l'admin).
// Idempotent comme withNotifs/withGroupThread : ne touche à rien si `playlists` existe déjà et
// n'est jamais rappelée sur write (voir bug FORCED_PLAYLISTS v45) — seed une seule fois.
const withDefaultPlaylists = (d) => {
  const out = {...d};
  ['glinda','eoghan','drew','elias'].forEach(k=>{
    const c = out[k];
    if(!c) return;
    if(c.playlists && c.playlists.length>0) return;
    const trackIds = (c.music||[]).map(t=>t.id).filter(id=>id!==undefined && id!==null);
    out[k] = {...c, playlists: [{id:"playlist1", name:"playlist n°1", cover:null, trackIds}]};
  });
  return out;
};

// ── Groupe à 4 (SMS) ─────────────────────────────────────────────────────────
const withGroupThread = (d) => {
  const out = {...d};
  out.sharedThreads = {...(out.sharedThreads||{})};
  if(!out.sharedThreads[GROUP_THREAD_ID]) out.sharedThreads[GROUP_THREAD_ID] = GROUP_SEED;
  // Init groupMeta for the default group
  if(!out.groupMeta) out.groupMeta = {};
  if(!out.groupMeta[GROUP_THREAD_ID]) {
    out.groupMeta[GROUP_THREAD_ID] = {name:"xX WiiNNERS Xx", members:["glinda","eoghan","drew","elias"]};
  }
  ['glinda','eoghan','drew','elias'].forEach(k=>{
    const c = out[k];
    if(c && !(c.messages||[]).some(m=>m.sharedThreadId===GROUP_THREAD_ID)) {
      out[k] = {...c, messages:[{id:990,contact:"xX WiiNNERS Xx",sharedThreadId:GROUP_THREAD_ID,isGroup:true,unread:true,thread:[]}, ...(c.messages||[])]};
    }
  });
  return out;
};

// ── Notifications (écran verrouillé / status bar) ────────────────────────────
// Chaque notif : {app, title, text, time}. L'icône est celle de l'app.

const withNotifs = (d) => {
  const out = {...d};
  Object.entries(NOTIF_SEED).forEach(([k, notifs])=>{
    if(out[k] && !out[k].notifications) out[k] = {...out[k], notifications: notifs};
  });
  return out;
};

const loadData = () => {
  // Données fraîches à chaque chargement (pas de stockage persistant en artifact).
  const d = withDefaultPlaylists(withNotifs(withGroupThread(forcePlaylists(mkData()))));
  return withSocialSeeds(d);
};

// Version des seeds — incrémenter à chaque correction des données initiales pour forcer une re-migration.
const withSocialSeeds = (d) => {
  const st = d.sharedThreads || {};
  const patched = {...d, sharedThreads: {...st}};

  // _sharedTweets + _sharedTumblrPosts : toujours injecter les seeds corrects
  patched.sharedThreads._sharedTweets = SEED_SHARED_TWEETS;
  patched.sharedThreads._sharedTumblrPosts = SEED_SHARED_TUMBLR_POSTS;

  // Tous les persos se suivent mutuellement par défaut sur Twitter et Tumblr
  const ALL_CHARS = ["glinda","eoghan","drew","elias"];
  const mutualFollows = Object.fromEntries(ALL_CHARS.map(k=>[k, ALL_CHARS.filter(c=>c!==k)]));
  if(!st._twitterFollows) patched.sharedThreads._twitterFollows = mutualFollows;
  if(!st._tumblrFollows)  patched.sharedThreads._tumblrFollows  = mutualFollows;

  // _sharedFacebookPosts : ajouter author si manquant
  if(st._sharedFacebookPosts) {
    patched.sharedThreads._sharedFacebookPosts = st._sharedFacebookPosts.map(p=>
      p.author ? p : {...p, author: FB_NAME_TO_AUTHOR[p.name] || null}
    );
  }

  // homeBaseTweets par perso : toujours injecter les seeds déco corrects (sans tweets de joueurs)
  ["glinda","eoghan","drew","elias"].forEach(k=>{
    if(patched[k]) {
      patched[k] = {...patched[k], homeBaseTweets: SEED_HOME_BASE_TWEETS[k] || []};
    }
  });

  // feedPosts Tumblr par perso : toujours injecter les seeds déco corrects (sans posts de joueurs)
  const USERNAME_MAP = {glinda:"glindatheverygood",eoghan:"eoghan_masuda",drew:"dreww_orms",elias:"noteliasgreen"};
  ["glinda","eoghan","drew","elias"].forEach(k=>{
    const username = USERNAME_MAP[k];
    if(patched[k]) {
      patched[k] = {...patched[k], tumblr:{...(patched[k].tumblr||{}), feedPosts: SEED_FEED_TUMBLR[username]||[]}};
      // Ajouter "files" dans les apps si absent
      if(!(patched[k].apps||[]).includes("files")) {
        patched[k] = {...patched[k], apps: [...(patched[k].apps||[]), "files"]};
      }
    }
  });

  return patched;
};

// ─── MAIN APPPP ─────────────────────────────────────────────────────────────────
// ─── SYNC BADGE ───────────────────────────────────────────────────────────────
// Petit indicateur discret de l'état de la synchro multi-appareils (coin haut-droit).
const SyncBadge = ({status}) => {
  const [dismissed, setDismissed] = useState(false);
  if(dismissed) return null;
  const cfg = {
    synced:     {color:"#1fa855", label:"Synchronisé",      dot:"#2ecc71"},
    connecting: {color:"#b8860b", label:"Connexion…",       dot:"#f1c40f"},
    error:      {color:"#c0392b", label:"Erreur de synchro",dot:"#e74c3c"},
    offline:    {color:"#6b7280", label:"Mode local",       dot:"#9ca3af"},
  }[status] || {color:"#6b7280", label:status, dot:"#9ca3af"};
  return (
    <div title={`${cfg.label} (clic pour masquer)`} onClick={()=>setDismissed(true)} style={{
      position:"fixed", top:8, right:8, zIndex:9999,
      display:"flex", alignItems:"center", gap:5,
      background:"rgba(255,255,255,0.92)", borderRadius:20,
      padding:"4px 10px 4px 8px", fontSize:10, fontWeight:600,
      color:cfg.color, boxShadow:"0 1px 4px rgba(0,0,0,0.25)",
      fontFamily:"Verdana, Tahoma, Arial, sans-serif",
      cursor:"pointer",
    }}>
      <span style={{width:7,height:7,borderRadius:"50%",background:cfg.dot,flexShrink:0,
        animation:status==="connecting"?"sparkle 1s infinite":"none"}}/>
      {cfg.label}
    </div>
  );
};

export default function App() {
  const [data, setData]         = useState(()=>loadData());
  const dataRef = useRef(data);
  useEffect(()=>{ dataRef.current = data; }, [data]);
  const [selected, setSelected] = useState(null);
  const [adminMode, setAdminMode] = useState(false);
  const [loreDate, setLoreDate]   = useState(getLoreDate());
  const [sharedAndroidIcons, setSharedAndroidIcons] = useState(()=>loadData()?._sharedAndroidIcons||{});
  const [syncStatus, setSyncStatus] = useState(firebaseDb ? "connecting" : "offline"); // "connecting" | "synced" | "offline" | "error"
  const pendingFirebaseUpdate = useRef({});
  const firebaseTimer = useRef(null);
  const lastSnapshotTime = useRef(0); // pour ne pas spammer les snapshots (1 max toutes les 30s)
  const MAX_SNAPSHOTS = 10;

  // ── Snapshots automatiques ────────────────────────────────────────────────────
  // Avant chaque envoi vers Firebase, on sauvegarde une copie de l'état complet dans
  // _snapshots/{timestamp}. On garde les MAX_SNAPSHOTS derniers et on purge les plus anciens.
  // Ça donne un rollback en 2 clics depuis l'admin, sans migrer de base de données.
  // Limite : les snapshots contenant des images base64 volumineuses peuvent être lourds —
  // on n'en prend donc qu'un au maximum toutes les 30 secondes pour éviter de saturer le
  // quota gratuit Firebase (1 GB de stockage / 10 GB de bande passante par mois).
  const takeSnapshot = async (currentData) => {
    if (!firebaseDb) return;
    const now = Date.now();
    if (now - lastSnapshotTime.current < 30_000) return; // throttle 30s
    lastSnapshotTime.current = now;
    try {
      // Lire la liste des snapshots existants pour en supprimer les plus anciens
      const snapRef = ref(firebaseDb, "_snapshots");
      const snap = await new Promise(resolve => {
        // Simple one-time read via onValue with immediate unsubscribe.
        // 'let' (not const) declared before the call: onValue() can invoke its
        // callback synchronously if a cached value is already available, which
        // would otherwise try to call unsub() before the assignment completes.
        let unsub;
        unsub = onValue(snapRef, s => { resolve(s.val()); if (unsub) unsub(); });
      });
      const existing = snap ? Object.keys(snap).sort() : [];
      const toDelete = existing.length >= MAX_SNAPSHOTS ? existing.slice(0, existing.length - MAX_SNAPSHOTS + 1) : [];
      const updates = {};
      toDelete.forEach(ts => { updates[`_snapshots/${ts}`] = null; });
      // Créer le nouveau snapshot — on exclut les snapshots eux-mêmes pour éviter la récursion
      const { _snapshots, ...dataWithoutSnapshots } = currentData || {};
      updates[`_snapshots/${now}`] = {
        ts: now,
        label: new Date(now).toLocaleString("fr-FR"),
        data: dataWithoutSnapshots,
      };
      await update(ref(firebaseDb), updates);
    } catch(e) {
      console.warn("[snapshot] Échec :", e.message);
    }
  };
  const hasReceivedFirstSnapshot = useRef(false);

  // Synchro temps réel : écoute la base Firebase et reflète tout changement (fait par n'importe qui,
  // sur n'importe quel appareil) dans l'état local. Si la base est vide (premier lancement jamais fait),
  // on la "sème" avec les données par défaut pour que tout le monde démarre avec la même histoire.
  useEffect(() => {
    if (!firebaseDb) return;
    const rootRef = ref(firebaseDb);
    const unsubscribe = onValue(rootRef, (snapshot) => {
      const remote = snapshot.val();
      if (remote && Object.keys(remote).length > 0) {
        // Migration versionnée : si seedVersion < SEED_VERSION on réinjecte les seeds corrigés,
        // même si les clés existent déjà (correction des données mal attribuées).
        if (!hasReceivedFirstSnapshot.current) {
          const remoteSeedVersion = remote._seedVersion || 0;
          const needsMigration = remoteSeedVersion < SEED_VERSION;

          if (needsMigration) {
            const st = remote.sharedThreads || {};
            const patches = { _seedVersion: SEED_VERSION };
            const ALL_CHARS = ["glinda","eoghan","drew","elias"];
            const mutualFollows = Object.fromEntries(ALL_CHARS.map(k=>[k, ALL_CHARS.filter(c=>c!==k)]));

            // Toujours remplacer _sharedTweets et _sharedTumblrPosts (séparation joueurs/déco)
            patches['sharedThreads/_sharedTweets'] = SEED_SHARED_TWEETS;
            patches['sharedThreads/_sharedTumblrPosts'] = SEED_SHARED_TUMBLR_POSTS;

            // Follows mutuels par défaut si absents
            if(!st._twitterFollows) patches['sharedThreads/_twitterFollows'] = mutualFollows;
            if(!st._tumblrFollows)  patches['sharedThreads/_tumblrFollows']  = mutualFollows;

            // _sharedFacebookPosts : merge additif avec le lore par défaut (jamais un remplacement).
            // v6 ne le faisait QUE si le champ était totalement vide — donc dès qu'un perso avait déjà
            // un vrai post (ex: Elias après l'incident), le lore par défaut des 3 autres n'était jamais
            // ajouté. v7 corrige ça : on garde tout ce qui existe déjà, on ajoute juste les posts du
            // lore par défaut qui ne sont pas déjà présents (dédupliqués par contenu), et on complète
            // le champ "author" manquant — sans jamais rien supprimer ni écraser.
            {
              const currentFeed = (st._sharedFacebookPosts || []).map(p =>
                p.author ? p : {...p, author: FB_NAME_TO_AUTHOR[p.name] || null}
              );
              const feedKey = (p) => p.id ?? `${p.author||p.name}|${p.time}|${p.text}`;
              const existingKeys = new Set(currentFeed.map(feedKey));
              const defaultsWithAuthor = FACEBOOK_FRIENDS_FEED_DEFAULT.map(p =>
                ({...p, author: FB_NAME_TO_AUTHOR[p.name] || null})
              );
              const missingDefaults = defaultsWithAuthor.filter(p => !existingKeys.has(feedKey(p)));
              const rawFeed = st._sharedFacebookPosts || [];
              const authorWasMissing = rawFeed.some(p => !p.author);
              if (missingDefaults.length > 0 || authorWasMissing) {
                patches['sharedThreads/_sharedFacebookPosts'] = [...currentFeed, ...missingDefaults];
              }
            }

            // homeBaseTweets + feedPosts Tumblr par perso : toujours remplacer (séparation corrigée)
            const USERNAME_MAP = {glinda:"glindatheverygood",eoghan:"eoghan_masuda",drew:"dreww_orms",elias:"noteliasgreen"};
            ["glinda","eoghan","drew","elias"].forEach(k => {
              patches[`${k}/homeBaseTweets`] = SEED_HOME_BASE_TWEETS[k] || [];
              const username = USERNAME_MAP[k];
              // Toujours remplacer feedPosts pour éliminer les posts de joueurs mal placés
              patches[`${k}/tumblr`] = {...(remote[k]?.tumblr||{}), feedPosts: SEED_FEED_TUMBLR[username]||[]};
              // Ajouter "files" dans les apps si absent
              const existingApps = remote[k]?.apps || [];
              if(!existingApps.includes("files")) {
                patches[`${k}/apps`] = [...existingApps, "files"];
              }
              // Seed "playlist n°1" (nouvelle fonctionnalité v8) : regroupe tous les morceaux déjà
              // présents dans music au moment de la migration. Nom/cover personnalisables ensuite
              // dans l'admin (onglet Musique → Playlists). Ne s'applique qu'une fois : si le perso a
              // déjà des playlists (créées depuis dans l'admin), on ne touche à rien.
              const existingPlaylists = remote[k]?.playlists || [];
              if(existingPlaylists.length===0) {
                const trackIds = (remote[k]?.music||[]).map(t=>t.id).filter(id=>id!==undefined && id!==null);
                patches[`${k}/playlists`] = [{id:"playlist1", name:"playlist n°1", cover:null, trackIds}];
              }
              // Initialiser instagram si absent (nouvelle fonctionnalité v5)
              if(!remote[k]?.instagram) {
                const igDefaults = {
                  glinda: {handle:"glindarvf",displayName:"Glinda Ravingfool",bio:"éco @ uma · she/her · nouveau départ 🌸",followers:1204,following:312,posts:[],avatar:null},
                  eoghan: {handle:"eoghan_masuda",displayName:"Eoghan Masuda",bio:"maths & STAPS @ uma · him/bo · si je poste c'est que glinda m'a dit de le faire",followers:614,following:88,posts:[],avatar:null},
                  drew:   {handle:"dreww_orms",displayName:"Drew Bates",bio:"",followers:234,following:102,posts:[],avatar:null},
                  elias:  {handle:"noteliasgreen",displayName:"Elias Green",bio:"",followers:445,following:48,posts:[],avatar:null},
                };
                if(igDefaults[k]) patches[`${k}/instagram`] = igDefaults[k];
              }
              // Seed v6 : pages Facebook suivies par défaut — même logique que le fil d'amis ci-dessus,
              // seedé une seule fois et seulement si ce perso n'a encore aucune page enregistrée.
              if(!remote[k]?.facebookPages) {
                patches[`${k}/facebookPages`] = { [k]: FACEBOOK_PAGES_DEFAULT[k] || [] };
              }
            });

            update(ref(firebaseDb), patches).catch(e => console.error("[seed] Erreur migration seeds :", e));
          }
        }
        setData(() => {
          // Ré-applique par-dessus le snapshot reçu toute écriture locale pas encore envoyée à
          // Firebase (encore dans le buffer de debounce ~600ms). Sans ça, un changement fait par un
          // AUTRE joueur pendant ce court délai écraserait silencieusement ce qu'on vient de faire
          // nous-même (ex: un tweet qui disparaît localement avant même d'avoir été synchronisé).
          let merged = remote;
          for (const [path, val] of Object.entries(pendingFirebaseUpdate.current)) {
            merged = setDeepPath(merged, path.split('/'), val);
          }
          return merged;
        });
        setSyncStatus("synced");
      } else if (!hasReceivedFirstSnapshot.current) {
        // Base vide : on initialise avec les données par défaut.
        set(rootRef, data).then(() => setSyncStatus("synced")).catch(() => setSyncStatus("error"));
      }
      hasReceivedFirstSnapshot.current = true;
    }, (err) => {
      console.error("[sync] Erreur de connexion Firebase :", err);
      setSyncStatus("error");
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Regroupe les écritures vers Firebase (debounce ~600ms) pour éviter d'envoyer la photo de chaque
  // perso à chaque frappe de clavier, et pour fusionner plusieurs changements rapprochés en un seul envoi.
  const queueFirebaseUpdate = (patch) => {
    if (!firebaseDb) return;
    Object.assign(pendingFirebaseUpdate.current, patch);
    clearTimeout(firebaseTimer.current);
    firebaseTimer.current = setTimeout(() => {
      const updates = pendingFirebaseUpdate.current;
      pendingFirebaseUpdate.current = {};
      // Snapshot avant l'écriture (throttlé à 1 toutes les 30s)
      takeSnapshot(dataRef.current).catch(()=>{});
      update(ref(firebaseDb), updates).catch((e) => {
        console.error("[sync] Échec d'envoi vers Firebase :", e);
        setSyncStatus("error");
      });
    }, 600);
  };

  // Garde sharedAndroidIcons synchronisé avec data._sharedAndroidIcons, quel que soit le chemin de mise à jour (admin normal ou import JSON)
  useEffect(()=>{
    setSharedAndroidIcons(data._sharedAndroidIcons||{});
  },[data._sharedAndroidIcons]);

  // Garde loreDate synchronisé avec data.loreDate (reçu de Firebase ou d'un import JSON),
  // pour que le changement de date fait par un joueur se propage à tout le monde et survive au reload.
  useEffect(()=>{
    if(data.loreDate) setLoreDate(data.loreDate);
  },[data.loreDate]);

  // Met à jour la date de lore : état local (réactif immédiatement) + data.loreDate (persisté + synchronisé via Firebase)
  const updateLoreDate = (val) => {
    setLoreDate(val);
    setData(prev => ({...prev, loreDate: val}));
    queueFirebaseUpdate({ loreDate: val });
  };

  // Detect ?admin=1 in URL
  useEffect(()=>{
    const params = new URLSearchParams(window.location.search);
    if(params.get("admin")==="1") setAdminMode(true);
  },[]);

  const characters = [
    {key:"glinda",emoji:"🌸",color:"#e91e8c"},
    {key:"eoghan",emoji:"🌈", color:"#00d435"},
    {key:"drew",  emoji:"🪱",color:"#aa6caa"},
    {key:"elias", emoji:"👽",color:"#6672d0"},
  ];

  const updateChar = (key, d, skipSync=false) => {
    setData(prev => {
      // Shared thread update: key exists in sharedThreads, starts with "_shared" (sauf _sharedAndroidIcons, qui vit à la racine de data), ou est un pair/group key connu
      const isSharedKey = key!=='_sharedAndroidIcons' && ((key in (prev.sharedThreads||{})) || key.startsWith('_shared') || key==='groupMeta');
      if(isSharedKey) {
        if(key==='groupMeta') {
          const mergedMeta = {...(prev.groupMeta||{}), ...d};
          const diff = deepDiffPatch(prev.groupMeta || {}, mergedMeta);
          if(Object.keys(diff).length) {
            const fbPatch = {}; Object.keys(diff).forEach(p => { fbPatch[`groupMeta/${p}`] = diff[p]; });
            queueFirebaseUpdate(fbPatch);
          }
          return {...prev, groupMeta: mergedMeta};
        }
        const next = {...prev, sharedThreads:{...(prev.sharedThreads||{}), [key]:d}};
        const diff = deepDiffPatch(prev.sharedThreads?.[key] || {}, d);
        if(Object.keys(diff).length) {
          const fbPatch = {}; Object.keys(diff).forEach(p => { fbPatch[`sharedThreads/${key}/${p}`] = diff[p]; });
          queueFirebaseUpdate(fbPatch);
        }
        return next;
      }
      if(key==='_sharedAndroidIcons') {
        const diff = deepDiffPatch(prev._sharedAndroidIcons || {}, d);
        if(Object.keys(diff).length) {
          const fbPatch = {}; Object.keys(diff).forEach(p => { fbPatch[`_sharedAndroidIcons/${p}`] = diff[p]; });
          queueFirebaseUpdate(fbPatch);
        }
        return {...prev, _sharedAndroidIcons: d};
      }
      // RETIRÉ : "Force playlists to stay hardcoded" réécrasait `music`/`playlistName` avec la
      // version figée du lore (FORCED_PLAYLISTS, sans aucune pochette) à CHAQUE appel updateChar
      // pour ce perso — pas seulement pour les changements de musique, n'importe quelle modif
      // (avatar, wallpaper, autre app...) suffisait à effacer silencieusement les pochettes et
      // tout autre edit musical qui venaient d'être enregistrés. FORCED_PLAYLISTS reste utilisée
      // une seule fois, à l'initialisation des données par défaut (forcePlaylists() dans mkData()),
      // ce qui suffit à fournir la playlist de lore de base sans plus jamais l'imposer ensuite.
      const merged = d;
      let next = {...prev, [key]:merged};
      // Ne renvoyer à Firebase que les champs qui ont réellement changé (jusqu'au niveau feuille,
      // y compris dans les tableaux comme la galerie) — au lieu de tout l'objet du perso à chaque
      // edit. Sans ça, éditer n'importe quel petit champ réenvoyait aussi chaque photo/pochette
      // déjà stockée en base64, ce qui pouvait dépasser la limite d'écriture Firebase et faire
      // échouer silencieusement la sauvegarde.
      const diff = deepDiffPatch(prev[key] || {}, merged);
      const fbPatch = {};
      Object.keys(diff).forEach(p => { fbPatch[`${key}/${p}`] = diff[p]; });
      if(skipSync) { if(Object.keys(fbPatch).length) queueFirebaseUpdate(fbPatch); return next; }
      // Sync icônes entre tous les persos du même OS — état React local uniquement.
      // On n'envoie PAS les persos voisins à Firebase : écraser leur objet entier avec
      // une version issue de prev[] écraserait leurs données (instagram, messages…).
      const thisOs = merged.os || d.os;
      const ALL_CHAR_KEYS = ["glinda","eoghan","drew","elias"];
      ALL_CHAR_KEYS.filter(k => k !== key && prev[k]?.os === thisOs).forEach(other => {
        next[other] = {...next[other], appIcons:{...(d.appIcons||{})}, appNames:{...(d.appNames||{})}};
      });
      if(Object.keys(fbPatch).length) queueFirebaseUpdate(fbPatch);
      return next;
    });

  };

  const updateSharedAndroid = (icons) => {
    setSharedAndroidIcons(icons);
    const diff = deepDiffPatch(dataRef.current._sharedAndroidIcons || {}, icons);
    setData(prev => {
      const next = {...prev, _sharedAndroidIcons: icons};
      return next;
    });
    if(Object.keys(diff).length) {
      const fbPatch = {}; Object.keys(diff).forEach(p => { fbPatch[`_sharedAndroidIcons/${p}`] = diff[p]; });
      queueFirebaseUpdate(fbPatch);
    }
  };

  const charData = selected && data[selected.key];

  if(adminMode) return (
    <LoreDateCtx.Provider value={loreDate}>
    <div style={{position:"relative"}}>
      <SyncBadge status={syncStatus}/>
      <AdminBackoffice
        data={data}
        onUpdate={(key,d,skipSync)=>updateChar(key,d,skipSync)}
        onUpdateShared={updateSharedAndroid}
        onExit={()=>setAdminMode(false)}
        loreDate={loreDate}
        onLoreDateChange={updateLoreDate}
        />
    </div>
    </LoreDateCtx.Provider>
  );

  return (
    <LoreDateCtx.Provider value={loreDate}>
    <div style={{
      minHeight:"100vh", width:"100%", overflowX:"hidden",
      fontFamily:"Verdana, Tahoma, 'Arial', sans-serif",
      display:"flex", flexDirection:"column", alignItems:"center",
      /* Y2K tiled/gradient bg — sky blue fading to periwinkle */
      background:"linear-gradient(160deg, #c6d9f0 0%, #b0ccee 30%, #d8e8f8 60%, #c0d5ec 100%)",
      position:"relative",
    }}>
      <SyncBadge status={syncStatus}/>

      <style>{`
        @keyframes sparkle {
          0%,100%{opacity:1;transform:scale(1);}
          50%{opacity:0.4;transform:scale(0.7);}
        }
        @keyframes ticker {
          0%{transform:translateX(100%);}
          100%{transform:translateX(-100%);}
        }
        @keyframes blink {
          0%,49%{opacity:1;} 50%,100%{opacity:0;}
        }
        .spk1{animation:sparkle 1.4s infinite;}
        .spk2{animation:sparkle 1.4s 0.35s infinite;}
        .spk3{animation:sparkle 1.4s 0.7s infinite;}
        .spk4{animation:sparkle 1.4s 1.05s infinite;}
        .y2k-pill {
          font-family:Verdana,sans-serif;
          font-size:11px; font-weight:bold;
          padding:5px 16px; border-radius:20px;
          cursor:pointer;
          border:2px solid;
          position:relative; overflow:hidden;
          transition:transform 0.1s, box-shadow 0.1s;
        }
        .y2k-pill::after {
          content:'';position:absolute;top:0;left:0;right:0;height:50%;
          background:rgba(255,255,255,0.4);border-radius:20px 20px 0 0;
          pointer-events:none;
        }
        .y2k-pill:hover{transform:translateY(-2px);}
        .y2k-pill:active{transform:translateY(1px);}
        .admin-pill {
          background:linear-gradient(180deg,#7fb3e8,#2a72c0);
          border-color:#0a4a90; color:#fff;
          box-shadow:0 3px 0 #0a3a70;
        }
        .back-pill {
          background:linear-gradient(180deg,#7fb3e8,#2a72c0);
          border-color:#0a4a90; color:#fff;
          box-shadow:0 3px 0 #0a3a70;
          font-size:12px; padding:7px 22px;
        }
      `}</style>

      
      {[
        [8,12],[18,55],[92,8],[73,22],[5,78],[85,68],[55,90],[40,5],[62,47],[30,85],
        [78,40],[15,40],[95,85],[48,72],[22,18],[66,15],[88,30]
      ].map(([l,t],i)=>(
        <div key={i} className={`spk${(i%4)+1}`} style={{
          position:"fixed",left:`${l}%`,top:`${t}%`,
          fontSize:i%3===0?18:i%3===1?12:16,
          color:["#ff99cc","#ffcc00","#66aaff","#99ff99"][i%4],
          pointerEvents:"none",zIndex:0,userSelect:"none",
          textShadow:`0 0 6px ${["#ff99cc","#ffcc00","#66aaff","#99ff99"][i%4]}`,
        }}>
          {["✦","★","✿","❋","✧","⁕"][i%6]}
        </div>
      ))}


      {!selected ? (
        /* ── CHARACTER SELECTOR ── */
        <div style={{
          flex:1, zIndex:1,
          display:"flex",flexDirection:"column",alignItems:"center",
          justifyContent:"center",
          minHeight:"100vh",
          padding:"36px 24px 48px",
          gap:28,
        }}>
          
          <div style={{
            background:"linear-gradient(180deg,#fff,#f0f5ff)",
            border:"none",
            borderRadius:12,
            boxShadow:"5px 5px 0 #0a2f77",
            padding:"16px 32px",
            textAlign:"center",
            position:"relative",
          }}>
            
            <span className="spk1" style={{position:"absolute",top:-10,left:-8,fontSize:22,color:"#ff99cc"}}>✦</span>
            <span className="spk2" style={{position:"absolute",top:-10,right:-8,fontSize:22,color:"#ffcc00"}}>✦</span>
            <span className="spk3" style={{position:"absolute",bottom:-10,left:-8,fontSize:22,color:"#66aaff"}}>✦</span>
            <span className="spk4" style={{position:"absolute",bottom:-10,right:-8,fontSize:22,color:"#99ee99"}}>✦</span>

            <div style={{
              fontFamily:"'Georgia',serif",fontSize:11,fontWeight:400,
              color:"#888",letterSpacing:3,marginBottom:6,textTransform:"uppercase",
            }}>University of Maine at Augusta</div>
            <div style={{
              fontFamily:"Impact,'Arial Black',sans-serif",
              fontSize:"clamp(32px,8vw,30px)",
              color:"#0f4499",
              letterSpacing:2,
              textTransform:"none",

              textShadow:"2px 2px 0 #b0c8f0",
            }}>#WhatsInOurPhones</div>
            <div style={{
              marginTop:8,height:3,
              background:"linear-gradient(90deg,transparent,#ffcc00 20%,#ff6699 50%,#66aaff 80%,transparent)",
              borderRadius:2,
            }}/>
            <div style={{
              fontFamily:"Verdana,sans-serif",fontSize:10,color:"#666",
              marginTop:6,letterSpacing:1,
            }}>Fall 2012 · Student Profile Database</div>
          </div>

          
          <div style={{display:"flex",gap:24,flexWrap:"wrap",justifyContent:"center",alignItems:"flex-end",overflow:"visible",paddingBottom:8}}>
            {characters.map((c,ci)=>{
              const d = data[c.key];
              const wallpaper = d.wallpaper;
              const isBgImg = wallpaper?.startsWith("data:")||wallpaper?.startsWith("http")||wallpaper?.startsWith("/");
              const bgStyle = isBgImg?{backgroundImage:`url(${wallpaper})`,backgroundSize:"cover",backgroundPosition:"center"}:{background:wallpaper};
              const isIos = d.os==="ios";
              const tilts = [-4,-1.5,1.5,3.5];
              const tilt = tilts[ci] || 0;
              return <div key={c.key} style={{transform:`rotate(${tilt}deg)`,transformOrigin:"bottom center",transition:"transform 0.2s"}}>
                <PhoneCard c={c} d={d} bgStyle={bgStyle} isIos={isIos} onSelect={()=>setSelected(c)}/>
              </div>;
            })}
          </div>

          
          <div style={{marginTop:16,display:"flex",alignItems:"center",gap:8}}>
            <button className="y2k-pill admin-pill" onClick={()=>setAdminMode(true)}>
              ⚙ ADMIN
            </button>
          </div>
        </div>

      ) : (
        /* ── FULL PHONE VIEW ── */
        <div style={{
          flex:1, zIndex:1,
          width:"100%",
          display:"flex",flexDirection:"column",alignItems:"center",
          justifyContent:"center",
          minHeight:"100vh",
          gap:12, padding:"16px 0",
          boxSizing:"border-box",overflowX:"hidden",
        }}>
          
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <button
              className="y2k-pill back-pill"
              onClick={()=>setSelected(null)}
            >← Back</button>
            <div style={{
              background:"linear-gradient(180deg,#fff,#f0f5ff)",
              border:"2px solid #0f4499",
              borderRadius:20,
              boxShadow:"3px 3px 0 #0a2f77",
              padding:"5px 18px",
              fontFamily:"Verdana,sans-serif",
              fontSize:11,fontWeight:700,
              color:"#0f4499",
              display:"flex",alignItems:"center",gap:8,
            }}>
              <span style={{fontSize:16}}>{selected.emoji}</span>
              <span style={{textTransform:"uppercase",letterSpacing:1}}>{charData.name}</span>
            </div>
          </div>

          {(()=>{
            // Enrichit _sharedAvatars à la volée : data[ck].avatar est toujours l'avatar "vrai"
            // d'un perso (uploadé depuis n'importe quel onglet admin), mais il n'est dupliqué dans
            // _sharedAvatars QUE quand l'upload se fait depuis l'onglet Facebook/Tumblr/Twitter.
            // Si Eoghan/Drew ont uploadé leur avatar depuis un autre onglet, FB/Twitter ne le voient
            // pas → pas de photo dans le fil. Fix : on fusionne ici tous les data[ck].avatar dans
            // _sharedAvatars, _sharedAvatars ayant la priorité (upload explicite reste prioritaire).
            const ALL_CK = ["glinda","eoghan","drew","elias"];
            const enriched = Object.fromEntries(ALL_CK.filter(ck=>data[ck]?.avatar).map(ck=>[ck,data[ck].avatar]));
            const mergedAvatars = {...enriched, ...(data.sharedThreads?._sharedAvatars||{})};
            // Handles Instagram de chaque perso — utilisés dans IgCommentThread pour afficher
            // le vrai @handle du joueur sur ses commentaires, plutôt que son prénom ou un fallback.
            const mergedHandles = Object.fromEntries(ALL_CK.filter(ck=>data[ck]?.instagram?.handle).map(ck=>[ck,data[ck].instagram.handle]));
            const sharedThreadsEnriched = {...data.sharedThreads, _sharedAvatars: mergedAvatars, _sharedIgHandles: mergedHandles};
            // Posts Instagram "en commun" (taggedWith) : un post posté par perso A avec
            // taggedWith="B" doit aussi apparaître dans la grille de B. Comme InstaScreen ne reçoit
            // que les données du perso actif, on rassemble ici — au même endroit que l'avatar
            // ci-dessus — les posts des 3 AUTRES persos qui taguent le perso actif, et on les passe
            // sous une clé dédiée que InstaScreen viendra fusionner dans sa grille.
            const coTagged = ALL_CK.filter(ck=>ck!==selected.key)
              .flatMap(ck => (data[ck]?.instagram?.posts||[])
                .filter(p=>p.taggedWith===selected.key)
                .map(p=>({...p, author:ck})));
            const charDataEnriched = {...charData, _coTaggedInstaPosts: coTagged};
            return charData.os==="ios"
              ?<IOSPhone data={{...charDataEnriched, sharedThreads:sharedThreadsEnriched}} admin={false} loreDate={loreDate} onUpdate={d=>updateChar(selected.key,d)} onUpdateShared={(tid,raw)=>updateChar(tid,raw)}/>
              :<AndroidPhone data={{...charDataEnriched, sharedThreads:sharedThreadsEnriched}} admin={false} loreDate={loreDate} onUpdate={d=>updateChar(selected.key,d)} sharedAndroidIcons={sharedAndroidIcons} onUpdateShared={updateSharedAndroid} onUpdateSharedThread={(tid,raw)=>updateChar(tid,raw)}/>;
          })()}

          
          <div style={{display:"flex",gap:8,marginTop:8}}>
            <button className="y2k-pill admin-pill" onClick={()=>setAdminMode(true)}>
              ⚙ ADMIN
            </button>
          </div>
        </div>
      )}
    </div>
    </LoreDateCtx.Provider>
  );
}

const PhoneCardClock = memo(({isIos, bgStyle={}}) => {
  const clock = useClock();
  if(isIos) return <IOSLockContent bgStyle={bgStyle} scale={0.55}/>;
  // Android
  return (
    <div style={{width:"100%",height:"100%",position:"relative",overflow:"hidden",...bgStyle,display:"flex",flexDirection:"column"}}>
      {/* Status bar — ICS/JB flat icons, no time (matches real status bar; lock shows big clock below) */}
      <div style={{height:10,background:"#000",display:"flex",alignItems:"center",justifyContent:"flex-end",padding:"0 2px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:1.5,transform:"scale(0.5)",transformOrigin:"right center"}}>
          <svg width="15" height="12" viewBox="0 0 20 16"><path d="M0.5 6.5 Q10 -1.5 19.5 6.5 L17 9 Q10 3.5 3 9 Z" fill="#fff"/><path d="M4 10 Q10 5.5 16 10 L13.5 12.5 Q10 9 6.5 12.5 Z" fill="#fff"/><path d="M7 13 Q10 10.5 13 13 L11.2 14.8 Q10 13.5 8.8 14.8 Z" fill="#fff"/><circle cx="10" cy="16" r="1.8" fill="#fff"/></svg>
          <svg width="14" height="12" viewBox="0 0 16 13"><rect x="0" y="10" width="3.2" height="3" fill="rgba(255,255,255,0.3)"/><rect x="4.3" y="7" width="3.2" height="6" fill="#fff"/><rect x="8.5" y="4" width="3.2" height="9" fill="#fff"/><rect x="12.8" y="1" width="3.2" height="12" fill="#fff"/></svg>
          <svg width="12" height="13" viewBox="0 0 13 15"><rect x="4.5" y="0" width="4" height="2" rx="0.8" fill="#fff"/><rect x="0.7" y="2" width="11.6" height="13" rx="1.8" fill="none" stroke="#fff" strokeWidth="1.3"/><rect x="2" y="3.3" width="9" height="10.4" rx="1" fill="#fff"/></svg>
        </div>
      </div>
      {/* Heure + date — même style que le vrai, paddingLeft 16 scalé */}
      <div style={{paddingLeft:8,paddingTop:8}}>
        <div style={{color:"#fff",fontSize:28,fontWeight:300,letterSpacing:-1.5,lineHeight:1,fontFamily:FF_IOS,textShadow:"0 1px 8px rgba(0,0,0,0.6)"}}>{clock.full24}</div>
        <div style={{color:"rgba(255,255,255,0.85)",fontSize:7,fontWeight:400,marginTop:2,fontFamily:FF_IOS}}>{clock.day}, {clock.month} {clock.dateOrd}</div>
      </div>
      {/* Cadenas centré — cercles concentriques comme le vrai */}
      <div style={{position:"absolute",top:"68%",left:"50%",transform:"translate(-50%,-50%)",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{position:"absolute",width:44,height:44,borderRadius:"50%",border:"1px dashed rgba(255,255,255,0.25)"}}/>
        <div style={{position:"absolute",width:34,height:34,borderRadius:"50%",border:"0.5px solid rgba(255,255,255,0.12)"}}/>
        <div style={{width:20,height:20,borderRadius:"50%",border:"1.5px solid rgba(255,255,255,0.7)",background:"rgba(0,0,0,0.3)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <svg width="8" height="9" viewBox="0 0 26 28" fill="none">
            <rect x="4" y="13" width="18" height="13" rx="2.5" stroke="white" strokeWidth="1.8"/>
            <path d="M8 13V9a5 5 0 0 1 10 0v4" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
    </div>
  );
});


