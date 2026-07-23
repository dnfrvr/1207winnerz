import React, { useState, useEffect } from "react";
import { UploadReader } from "../lib/storage.js";
import { loreSortKey } from "../shared/lore-date.js";

// Génère une forme d'onde déterministe (marche aléatoire douce + accents) à partir d'une graine
// (id/titre du track) : les tracks créés en admin n'ont pas de champ `wave`, on leur en fabrique
// un stable pour qu'ils affichent les mêmes barres que les tracks par défaut. Purement visuel.
const makeWave = (seed) => {
  const str = String(seed || "track");
  let s = 0;
  for (let i = 0; i < str.length; i++) s = (Math.imul(s, 31) + str.charCodeAt(i)) >>> 0;
  const rand = () => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return s / 0xffffffff; };
  const N = 34;
  const bars = [];
  let prev = 8 + rand() * 6;
  for (let i = 0; i < N; i++) {
    prev = Math.max(3, Math.min(20, prev + (rand() - 0.5) * 8));
    const spike = rand() > 0.82 ? rand() * 6 : 0;
    bars.push(Math.round(prev + spike));
  }
  return bars;
};

const SoundCloudScreen = ({data, isIos, accent, admin=false, update=null}) => {
  const sc = data.soundcloud || {};
  const tracks = sc.tracks || [];
  // Affichage du plus récent au plus ancien (par date de publication). Les valeurs non datables
  // (loreSortKey → 0) retombent en fin de liste. Le tri est purement à l'affichage : l'ordre
  // stocké/édité en admin n'est pas modifié.
  const sortedTracks = [...tracks].sort((a, b) => loreSortKey(b.posted) - loreSortKey(a.posted));
  const [playing, setPlaying] = useState(null); // track id
  const [progress, setProgress] = useState(0);   // 0..1 of bars revealed
  const ORANGE = "#FF5500";

  useEffect(()=>{
    if(playing===null) return;
    setProgress(0);
    const id = setInterval(()=>setProgress(p=> p>=1 ? 0 : p + 0.012), 90);
    return ()=>clearInterval(id);
  },[playing]);

  const Wave = ({bars, active}) => {
    const cut = active ? Math.floor(bars.length*progress) : -1;
    const max = Math.max(...bars,1);
    return (
      <div style={{display:"flex",alignItems:"flex-end",gap:1.5,height:34,flex:1,minWidth:0}}>
        {bars.map((b,i)=>(
          <div key={i} style={{flex:1,height:`${(b/max)*100}%`,minHeight:2,borderRadius:0.5,
            background: i<=cut ? ORANGE : (active?"#ffb38a":"#d7d2cc"),
            transition:"background 0.08s"}}/>
        ))}
      </div>
    );
  };

  const now = playing!==null ? tracks.find(t=>t.id===playing) : null;

  return (
    <div style={{flex:1,background:isIos?"#f2f1ec":"#141414",display:"flex",flexDirection:"column",minHeight:0}}>
      <div style={{flex:1,overflowY:"auto",minHeight:0,WebkitOverflowScrolling:"touch"}}>
        
        <div style={{background:"linear-gradient(135deg,#ff7700,#FF5500)",padding:"14px 14px 16px",display:"flex",alignItems:"center",gap:12}}>
          {admin
              ? <label style={{width:52,height:52,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.5)",overflow:"hidden",cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:sc.avatar?"transparent":"rgba(0,0,0,0.18)"}}>
                  {sc.avatar
                    ? <img src={sc.avatar} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    : <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 18v-6a9 9 0 0118 0v6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3v5zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3v5z" stroke="#fff" strokeWidth="2"/></svg>
                  }
                  <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new UploadReader();r.onload=ev=>update&&update("soundcloud",{...sc,avatar:ev.target.result});r.readAsDataURL(f);e.target.value="";}}/>
                </label>
              : <div style={{width:52,height:52,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.5)",overflow:"hidden",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:sc.avatar?"transparent":"rgba(0,0,0,0.18)"}}>
                  {sc.avatar
                    ? <img src={sc.avatar} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    : <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 18v-6a9 9 0 0118 0v6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 00-2-2H3v5z" stroke="#fff" strokeWidth="2"/></svg>
                  }
                </div>
            }
          <div style={{flex:1,minWidth:0}}>
            <div style={{color:"#fff",fontWeight:800,fontSize:16}}>{sc.displayName||"eoghan_masuda"}</div>
            <div style={{color:"rgba(255,255,255,0.85)",fontSize:11,marginTop:1}}>@{sc.handle||"eoghan_masuda"}</div>
            <div style={{display:"flex",gap:14,marginTop:6}}>
              <div style={{color:"#fff",fontSize:11}}><b>{tracks.length}</b> <span style={{opacity:0.8}}>tracks</span></div>
              <div style={{color:"#fff",fontSize:11}}><b>{sc.followers??0}</b> <span style={{opacity:0.8}}>followers</span></div>
              <div style={{color:"#fff",fontSize:11}}><b>{sc.following??0}</b> <span style={{opacity:0.8}}>follows</span></div>
            </div>
          </div>
        </div>

        
        {sortedTracks.map(tr=>{
          const isOn = playing===tr.id;
          const bars = (tr.wave && tr.wave.length) ? tr.wave : makeWave(tr.id ?? tr.title);
          return (
            <div key={tr.id} style={{background:isIos?"#fff":"#1c1c1c",borderBottom:`1px solid ${isIos?"#e3ddd4":"#2a2a2a"}`,padding:"11px 12px"}}>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <button onClick={()=>setPlaying(isOn?null:tr.id)} style={{width:40,height:40,borderRadius:"50%",background:ORANGE,border:"none",color:"#fff",fontSize:16,flexShrink:0,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 4px rgba(255,85,0,0.5)"}}>{isOn
                  ? <svg width="13" height="13" viewBox="0 0 12 12" fill="currentColor"><rect x="0" y="0" width="4" height="12"/><rect x="8" y="0" width="4" height="12"/></svg>
                  : <svg width="13" height="13" viewBox="0 0 12 12" fill="currentColor"><path d="M2 1l9 5-9 5V1z"/></svg>
                }</button>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8}}>
                    <div style={{color:isIos?"#333":"#fff",fontSize:13,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tr.title}</div>
                    <div style={{color:"#999",fontSize:10,flexShrink:0}}>{tr.dur}</div>
                  </div>
                  <div style={{color:ORANGE,fontSize:9.5,marginTop:1}}>{tr.tag}</div>
                </div>
              </div>
              
              <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}>
                <Wave bars={bars} active={isOn}/>
              </div>
              
              {tr.desc&&<div style={{color:isIos?"#666":"#aaa",fontSize:10.5,lineHeight:1.45,marginTop:7,fontStyle:"italic"}}>{tr.desc}</div>}
              
              <div style={{display:"flex",gap:14,marginTop:7,color:"#999",fontSize:10}}>
                <span style={{display:"flex",alignItems:"center",gap:3}}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 1l7 4-7 4V1z"/></svg>
                  {tr.plays}
                </span><span style={{display:"flex",alignItems:"center",gap:2}}><svg width="16" height="14" viewBox="0 0 16 14" fill="none"><path d="M8 13S1 8.5 1 4.5A3.5 3.5 0 018 2a3.5 3.5 0 017 2.5C15 8.5 8 13 8 13z" stroke="currentColor" strokeWidth="1.6" fill="none"/></svg><span>{tr.likes}</span></span><span>⟲ {tr.reposts}</span>
                <span style={{marginLeft:"auto",color:"#bbb"}}>{tr.posted}</span>
              </div>
              
              {(tr.comments||[]).length>0&&(
                <div style={{marginTop:9,borderTop:`1px solid ${isIos?"#eee":"#262626"}`,paddingTop:7,display:"flex",flexDirection:"column",gap:6}}>
                  {tr.comments.map((c,ci)=>(
                    <div key={ci} style={{display:"flex",gap:7,alignItems:"flex-start"}}>
                      <div style={{width:16,height:16,borderRadius:"50%",background:c.eerie?"#222":ORANGE,flexShrink:0,marginTop:1,opacity:c.eerie?0.8:1}}/>
                      <div style={{fontSize:10.5,lineHeight:1.4}}>
                        <span style={{color:c.eerie?(isIos?"#999":"#777"):(isIos?"#FF5500":"#ff8a4d"),fontWeight:600}}>{c.u}</span>
                        <span style={{color:"#aaa"}}> @ {c.at}</span>
                        <span style={{color:c.eerie?(isIos?"#888":"#888"):(isIos?"#555":"#ccc"),fontStyle:c.eerie?"italic":"normal"}}> — {c.t}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div style={{padding:"12px",textAlign:"center",color:"#aaa",fontSize:9}}>SoundCloud · soundcloud.com/{sc.handle||"eoghan_masuda"}</div>
      </div>

      
      {now&&(
        <div style={{flexShrink:0,background:isIos?"#2b2b2b":"#000",borderTop:`2px solid ${ORANGE}`,padding:"7px 12px",display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:30,height:30,background:ORANGE,borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1,flexShrink:0}}>
          <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
            <path d="M9 17V5l11-2v12" stroke={ORANGE} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="6" cy="17" r="3" stroke={ORANGE} strokeWidth="1.6"/>
            <circle cx="17" cy="15" r="3" stroke={ORANGE} strokeWidth="1.6"/>
          </svg>
        </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{color:"#fff",fontSize:11,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{now.title}</div>
            <div style={{height:3,background:"#444",borderRadius:2,marginTop:4,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${Math.round(progress*100)}%`,background:ORANGE}}/>
            </div>
          </div>
          <button onClick={()=>setPlaying(null)} style={{background:"none",border:"none",color:"#fff",cursor:"pointer",flexShrink:0,padding:4,display:"flex",alignItems:"center"}}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="1" y="1" width="5" height="14" rx="1"/>
              <rect x="10" y="1" width="5" height="14" rx="1"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export { SoundCloudScreen };
