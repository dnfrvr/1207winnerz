import React, { useState, useRef } from "react";
import { Field } from "../shared/admin-fields.jsx";

const WEATHER_DEFAULTS = {
  cities:[
    {
      name:"Washington",
      current:19, condition:"Mostly Cloudy", condIcon:"🌥️",
      forecast:[
        {day:"FRIDAY",    icon:"⛈️", hi:19, lo:12},
        {day:"SATURDAY",  icon:"☀️", hi:21, lo:11},
        {day:"SUNDAY",    icon:"🌤️", hi:21, lo:15},
        {day:"MONDAY",    icon:"🌨️", hi:20, lo:14},
        {day:"TUESDAY",   icon:"⛈️", hi:24, lo:14},
        {day:"WEDNESDAY", icon:"🌧️", hi:16, lo:10},
      ],
      updated:"10/14/11 2:15 PM",
    }
  ]
};

const WeatherScreen = ({isIos, accent, data, admin}) => {
  const wd = data?.weather || WEATHER_DEFAULTS;
  const cities = wd.cities && wd.cities.length ? wd.cities : WEATHER_DEFAULTS.cities;
  const [cityIdx, setCityIdx] = useState(0);
  const sliderRef = useRef(null);
  const touchStartX = useRef(null);
  const city = cities[Math.min(cityIdx, cities.length-1)];

  // Horizontal swipe between cities
  const onTouchStart = e => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd   = e => {
    if(touchStartX.current===null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if(dx < -40 && cityIdx < cities.length-1) setCityIdx(i=>i+1);
    if(dx >  40 && cityIdx > 0)               setCityIdx(i=>i-1);
    touchStartX.current = null;
  };

  // ── Android ──────────────────────────────────────────────────────────────
  if(!isIos) return (
    <div style={{flex:1,display:"flex",flexDirection:"column",position:"relative",minHeight:0}}>
      
      {cities.length > 1 && (
        <div style={{position:"absolute",top:0,left:0,right:0,zIndex:10,
          display:"flex",gap:4,padding:"8px 12px 0",pointerEvents:"auto"}}>
          {cities.map((_,i)=>(
            <div key={i} onClick={()=>setCityIdx(i)} style={{
              flex:1, height:2, borderRadius:1, cursor:"pointer",
              background: i===cityIdx ? "#fff" : "rgba(255,255,255,0.25)",
              transition:"background .3s",
            }}/>
          ))}
        </div>
      )}
      
      <div ref={sliderRef} style={{flex:1,overflow:"hidden",minHeight:0,position:"relative"}}
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div style={{display:"flex",height:"100%",
          transform:`translateX(${-cityIdx*100}%)`,transition:"transform .3s ease"}}>
          {cities.map((c,ci)=>(
            <div key={ci} style={{width:"100%",flexShrink:0,boxSizing:"border-box",
              background:"linear-gradient(180deg,#1565C0 0%,#0D47A1 60%,#0A3880 100%)",
              display:"flex",flexDirection:"column",overflowY:"auto"}}>
              <div style={{padding:"12px 16px 8px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{color:"var(--raise, rgba(255,255,255,0.85))",fontSize:14,fontWeight:400}}>{c.name}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"4px 0 14px"}}>
                <div style={{fontSize:52}}>{c.condIcon||"🌤️"}</div>
                <div style={{fontSize:64,color:"#fff",fontWeight:100,lineHeight:1}}>{c.current}°</div>
                <div style={{color:"rgba(255,255,255,0.75)",fontSize:13,marginTop:4}}>{c.condition}</div>
              </div>
              <div style={{height:1,background:"rgba(255,255,255,0.15)",margin:"0 16px 4px"}}/>
              {c.forecast.map((f,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",padding:"7px 18px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                  <div style={{color:"var(--raise, rgba(255,255,255,0.85))",fontSize:12,fontWeight:500,width:110}}>{f.day}</div>
                  <div style={{fontSize:18,flex:1,textAlign:"center"}}>{f.icon}</div>
                  <div style={{color:"#fff",fontSize:13,fontWeight:600,width:36,textAlign:"right"}}>{f.hi}°</div>
                  <div style={{color:"rgba(255,255,255,0.5)",fontSize:13,width:36,textAlign:"right"}}>{f.lo}°</div>
                </div>
              ))}
              <div style={{color:"rgba(255,255,255,0.35)",fontSize:9,textAlign:"center",padding:"8px 0"}}>Updated {c.updated}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── iOS 6 — carte arrondie sur fond noir, tout tient sans scroll ──────────
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0,background:"#000",position:"relative"}}>
      
      <div style={{flex:1,overflow:"hidden",minHeight:0,position:"relative"}}
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        
        <div style={{
          display:"flex",
          height:"100%",
          transform:`translateX(${-cityIdx*100}%)`,
          transition:"transform .3s ease",
        }}>
          {cities.map((c,ci)=>(
            <div key={ci} style={{
              width:"100%", flexShrink:0,
              display:"flex",flexDirection:"column",justifyContent:"center",
              padding:"6px 8px 2px",
              boxSizing:"border-box",
            }}>
              
              <div style={{
                borderRadius:16,overflow:"hidden",
                background:"linear-gradient(180deg,#2c6eb6 0%,#3a7cca 20%,#4a8fd4 40%,#3a75c0 65%,#2a60ad 100%)",
                boxShadow:"0 4px 24px rgba(0,0,0,0.7),inset 0 1px 0 rgba(255,255,255,0.15)",
                display:"flex",flexDirection:"column",
              }}>
                
                <div style={{display:"flex",justifyContent:"center",padding:"clamp(4px,2%,12px) 0 0"}}>
                  <div style={{fontSize:"clamp(28px,8vw,44px)",lineHeight:1,filter:"drop-shadow(0 2px 6px rgba(0,0,0,0.3))"}}>{c.condIcon||"🌥️"}</div>
                </div>
                
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",padding:"2px 14px 0"}}>
                  <div>
                    <div style={{color:"#fff",fontSize:"clamp(14px,4.5vw,20px)",fontWeight:400,letterSpacing:-0.3,textShadow:"0 1px 4px rgba(0,0,0,0.4)"}}>{c.name}</div>
                    <div style={{color:"rgba(255,255,255,0.7)",fontSize:"clamp(9px,2.5vw,11px)",fontWeight:300,marginTop:1}}>Hourly</div>
                  </div>
                  <div style={{color:"#fff",fontSize:"clamp(40px,13vw,62px)",fontWeight:200,lineHeight:1,textShadow:"0 2px 10px rgba(0,0,0,0.25)",marginTop:-2}}>{c.current}°</div>
                </div>
                
                <div style={{height:1,background:"rgba(255,255,255,0.18)",margin:"clamp(4px,1.5%,10px) 0 0"}}/>
                
                {c.forecast.map((f,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",padding:"0 14px",
                    height:"clamp(30px,6vh,42px)",
                    borderBottom:`1px solid rgba(255,255,255,${i===c.forecast.length-1?0:0.1})`}}>
                    <div style={{color:"rgba(255,255,255,0.92)",fontSize:"clamp(10px,3vw,13px)",fontWeight:600,letterSpacing:0.3,flex:1,textTransform:"uppercase"}}>{f.day}</div>
                    <div style={{fontSize:"clamp(14px,4vw,19px)",width:30,textAlign:"center"}}>{f.icon}</div>
                    <div style={{color:"#fff",fontSize:"clamp(11px,3.2vw,15px)",fontWeight:400,width:36,textAlign:"right"}}>{f.hi}°</div>
                    <div style={{color:"rgba(160,205,255,0.85)",fontSize:"clamp(11px,3.2vw,15px)",fontWeight:400,width:36,textAlign:"right"}}>{f.lo}°</div>
                  </div>
                ))}
                
                <div style={{display:"flex",alignItems:"center",padding:"clamp(4px,1.5%,7px) 12px",borderTop:"1px solid rgba(255,255,255,0.12)"}}>
                  <div style={{background:"#6001D3",borderRadius:3,padding:"1px 4px",color:"#fff",fontSize:9,fontWeight:700,letterSpacing:-0.5,marginRight:6,flexShrink:0}}>Y!</div>
                  <div style={{flex:1}}/>
                  <div style={{color:"rgba(255,255,255,0.5)",fontSize:8,flexShrink:0}}>Updated {c.updated}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div style={{display:"flex",justifyContent:"center",gap:6,padding:"3px 0 6px"}}>
        {cities.map((_,i)=>(
          <div key={i} onClick={()=>setCityIdx(i)} style={{width:6,height:6,borderRadius:"50%",background:i===cityIdx?"#fff":"rgba(255,255,255,0.25)",cursor:"pointer"}}/>
        ))}
      </div>
    </div>
  );
};

// Carte ville collapsible pour l'admin météo principal
const WeatherCityCard = ({city, ci, COND_ICONS, DAY_OPTS, ensureCustom, updForecast, updCities, cities}) => {
  const [open, setOpen] = useState(true);
  return (
    <div style={{background:"var(--raise, rgba(255,255,255,0.9))",borderRadius:10,border:"1px solid var(--line, rgba(0,0,0,0.07))",overflow:"hidden"}}>
      <div onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",cursor:"pointer",userSelect:"none",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <span style={{fontSize:16}}>{city.condIcon||"🌤️"}</span>
          <span style={{fontSize:13,fontWeight:600,color:"var(--ink, #1a1a2e)"}}>{city.name||"Ville"}</span>
          <span style={{fontSize:11,color:"var(--ink-faint, #9ca3af)"}}>{city.current||"—"}°</span>
        </div>
        <span style={{fontSize:12,color:"var(--ink-faint, #9ca3af)",transform:open?"rotate(180deg)":"rotate(0deg)",transition:"transform .2s",display:"inline-block"}}>▾</span>
      </div>
      {open && (
        <div style={{padding:"0 14px 12px",display:"flex",flexDirection:"column",gap:8,borderTop:"1px solid var(--line-soft, rgba(0,0,0,0.05))"}}>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",paddingTop:10}}>
            <Field label="Ville" value={city.name||""} onChange={v=>ensureCustom(ci,{name:v})} style={{flex:1}}/>
            <Field label="Temp °C" value={String(city.current||"")} onChange={v=>ensureCustom(ci,{current:parseInt(v)||0})} width="70px"/>
            <div style={{display:"flex",flexDirection:"column",gap:2}}>
              <label style={{color:"var(--ink-faint, #9ca3af)",fontSize:10,letterSpacing:0.6,fontWeight:600,textTransform:"uppercase"}}>Icône</label>
              <select value={city.condIcon||"☀️"} onChange={e=>ensureCustom(ci,{condIcon:e.target.value})}
                style={{background:"var(--raise, rgba(255,255,255,0.9))",border:"1px solid var(--line, rgba(0,0,0,0.1))",color:"var(--ink, #1a1a2e)",padding:"5px 7px",fontSize:16,borderRadius:7,width:64}}>
                {COND_ICONS.map(ic=><option key={ic} value={ic}>{ic}</option>)}
              </select>
            </div>
            <Field label="Condition" value={city.condition||""} onChange={v=>ensureCustom(ci,{condition:v})} width="140px"/>
            <button onClick={()=>updCities(cities.filter((_,j)=>j!==ci))} style={{background:"none",border:"none",color:"var(--ink-faint, #d1d5db)",cursor:"pointer",fontSize:16,padding:"0 2px",marginTop:18}}>×</button>
          </div>
          <div style={{fontSize:10,fontWeight:600,color:"var(--ink-soft, #6b7280)",marginTop:2,marginBottom:-4}}>Prévisions</div>
          {(city.forecast||[]).map((f,fi)=>(
            <div key={fi} style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
              <select value={f.day||"MONDAY"} onChange={e=>updForecast(ci,fi,{day:e.target.value})}
                style={{background:"var(--raise, rgba(255,255,255,0.9))",border:"1px solid var(--line, rgba(0,0,0,0.1))",color:"var(--ink, #1a1a2e)",padding:"4px 5px",fontSize:10,borderRadius:6,width:90}}>
                {DAY_OPTS.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
              <select value={f.icon||"☀️"} onChange={e=>updForecast(ci,fi,{icon:e.target.value})}
                style={{background:"var(--raise, rgba(255,255,255,0.9))",border:"1px solid var(--line, rgba(0,0,0,0.1))",color:"var(--ink, #1a1a2e)",padding:"4px 5px",fontSize:14,borderRadius:6,width:52}}>
                {COND_ICONS.map(ic=><option key={ic} value={ic}>{ic}</option>)}
              </select>
              <Field label="Max" value={String(f.hi||"")} onChange={v=>updForecast(ci,fi,{hi:parseInt(v)||0})} width="54px"/>
              <Field label="Min" value={String(f.lo||"")} onChange={v=>updForecast(ci,fi,{lo:parseInt(v)||0})} width="54px"/>
              <button onClick={()=>ensureCustom(ci,{forecast:(city.forecast||[]).filter((_,k)=>k!==fi)})} style={{background:"none",border:"none",color:"var(--ink-faint, #d1d5db)",cursor:"pointer",fontSize:14,padding:"0 2px",marginTop:18}}>×</button>
            </div>
          ))}
          <button onClick={()=>ensureCustom(ci,{forecast:[...(city.forecast||[]),{day:"MONDAY",icon:"☀️",hi:70,lo:55}]})}
            style={{background:"rgba(74,144,217,0.07)",border:"1px dashed rgba(74,144,217,0.3)",color:"#1a6bb5",borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:10,alignSelf:"flex-start"}}>+ Jour</button>
        </div>
      )}
    </div>
  );
};

export { WeatherScreen, WeatherCityCard, WEATHER_DEFAULTS };
