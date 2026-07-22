import React, { useState } from "react";

const VPNScreen = ({isIos}) => {
  const [connected, setConnected] = useState(false);
  const [server, setServer] = useState("FR Paris");
  const [tab, setTab] = useState("servers");
  const BLU="#007AFF", GRN="#4CD964", RED="#FF3B30", ACC=connected?GRN:BLU;
  const servers=[
    {loc:"FR Paris",     flag:"🇫🇷", ping:12, load:34},
    {loc:"DE Frankfurt", flag:"🇩🇪", ping:18, load:51},
    {loc:"NL Amsterdam", flag:"🇳🇱", ping:22, load:28},
    {loc:"US New York",  flag:"🇺🇸", ping:89, load:62},
    {loc:"JP Tokyo",     flag:"🇯🇵", ping:178,load:19},
  ];

  if(isIos) return (
    <div style={{flex:1,display:"flex",flexDirection:"column",background:"#efede8",overflow:"hidden",fontFamily:"Helvetica,'Helvetica Neue',Arial,sans-serif"}}>

      {/* ── Header gradient banner ── */}
      <div style={{background:connected
        ?"linear-gradient(180deg,#6de86d 0%,#3ab83a 50%,#2d9e2d 100%)"
        :"linear-gradient(180deg,#7ab8ff 0%,#2e6fd4 50%,#1a4fa8 100%)",
        padding:"20px 16px 18px",display:"flex",alignItems:"center",gap:14,
        flexShrink:0,boxShadow:"0 2px 8px rgba(0,0,0,0.25)"}}>
        <div style={{width:52,height:52,borderRadius:"50%",
          background:"rgba(255,255,255,0.18)",
          border:"2px solid rgba(255,255,255,0.55)",
          display:"flex",alignItems:"center",justifyContent:"center",
          boxShadow:"0 2px 8px rgba(0,0,0,0.2)"}}>
          <svg width="24" height="28" viewBox="0 0 34 38" fill="none">
            <path d="M17 2L3 8v10c0 9.4 6.1 18.2 14 21 7.9-2.8 14-11.6 14-21V8L17 2z"
              fill="rgba(255,255,255,0.22)" stroke="rgba(255,255,255,0.95)" strokeWidth="2"/>
            {connected&&<path d="M11 19l4 4 8-8" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>}
            {!connected&&<path d="M13 17h8M17 13v8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>}
          </svg>
        </div>
        <div>
          <div style={{color:"#fff",fontWeight:700,fontSize:17,textShadow:"0 1px 3px rgba(0,0,0,0.3)"}}>{connected?"Connected":"Disconnected"}</div>
          <div style={{color:"rgba(255,255,255,0.82)",fontSize:12,marginTop:2}}>{connected?server:"No server"}</div>
        </div>
      </div>

      {/* ── Toggle + stats card ── */}
      <div style={{margin:"12px 14px 0",background:"#fff",borderRadius:10,border:"1px solid #c8c7cc",overflow:"hidden",boxShadow:"0 2px 5px rgba(0,0,0,0.08)"}}>
        {/* Toggle row */}
        <div style={{display:"flex",alignItems:"center",padding:"13px 16px",background:"linear-gradient(180deg,#fff,#f7f6f1)"}}>
          <span style={{flex:1,fontSize:15,fontWeight:500,color:"#000"}}>VPN</span>
          <div onClick={()=>setConnected(c=>!c)} style={{width:51,height:31,borderRadius:16,position:"relative",cursor:"pointer",flexShrink:0,
            background:connected?"#4CD964":"#e5e5ea",
            border:connected?"1px solid #3ab850":"1px solid #bbb",
            transition:"background 0.2s,border 0.2s"}}>
            <div style={{position:"absolute",top:2,left:connected?22:2,width:27,height:27,borderRadius:"50%",
              background:"linear-gradient(180deg,#fff,#e8e8e8)",
              boxShadow:"0 2px 6px rgba(0,0,0,0.35)",
              transition:"left 0.2s ease"}}/>
          </div>
        </div>
        {/* Stats — shown when connected */}
        {connected&&(
          <div style={{display:"flex",borderTop:"1px solid #c8c7cc"}}>
            {[{l:"↓ Download",v:"12.4 Mb/s"},{l:"↑ Upload",v:"4.1 Mb/s"},{l:"Ping",v:"12 ms"}].map((s,i)=>(
              <div key={i} style={{flex:1,padding:"8px 4px",textAlign:"center",borderRight:i<2?"1px solid #c8c7cc":"none",background:"linear-gradient(180deg,#f7f6f1,#ede9e2)"}}>
                <div style={{fontSize:11,fontWeight:700,color:"#4CD964"}}>{s.v}</div>
                <div style={{fontSize:9,color:"#8e8e93",marginTop:1}}>{s.l}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Section label ── */}
      <div style={{padding:"10px 16px 5px",color:"#6d6d72",fontSize:12,fontWeight:600,letterSpacing:0.4,textTransform:"uppercase"}}>Servers</div>

      {/* ── Server list — iOS 6 grouped table ── */}
      <div style={{flex:1,overflowY:"auto",minHeight:0}}>
      <div style={{background:"#fff",borderTop:"1px solid #c8c7cc",borderBottom:"1px solid #c8c7cc",margin:"0 0 14px"}}>
        {servers.map((s,i)=>(
          <div key={i} onClick={()=>setServer(s.loc)}
            style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",
              background:server===s.loc?"linear-gradient(180deg,#f0f0f0,#e8e8e8)":"#fff",
              borderBottom:i<servers.length-1?"1px solid #c8c7cc":"none",cursor:"pointer"}}>
            <span style={{fontSize:22,lineHeight:1}}>{s.flag}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:server===s.loc?600:400,color:"#000"}}>{s.loc}</div>
              <div style={{fontSize:11,color:"#8e8e93",marginTop:1}}>
                {s.ping} ms · {s.load}% load
              </div>
            </div>
            {/* iOS checkmark */}
            {server===s.loc&&(
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M5 12l5 5L20 7" stroke={BLU} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            {/* Disclosure arrow */}
            {server!==s.loc&&(
              <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
                <path d="M1 1l6 6-6 6" stroke="#c7c7cc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        ))}
      </div>
      </div>
    </div>
  );

  // ── Android dark ──
  const bg="#0a0a0f", card="#12121a", sep="#1e1e2e", txt="#e2e8f0";
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",background:bg,minHeight:0,overflowY:"auto"}}>
      <div style={{background:card,margin:14,borderRadius:16,padding:"20px 16px",display:"flex",flexDirection:"column",alignItems:"center",gap:12,boxShadow:"0 4px 20px rgba(0,0,0,0.5)"}}>
        <div style={{width:80,height:80,borderRadius:"50%",background:connected?"rgba(34,197,94,0.12)":"rgba(59,130,246,0.12)",border:`2.5px solid ${connected?"#22c55e":"#3b82f6"}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <svg width="34" height="38" viewBox="0 0 34 38" fill="none">
            <path d="M17 2L3 8v10c0 9.4 6.1 18.2 14 21 7.9-2.8 14-11.6 14-21V8L17 2z" fill={connected?"rgba(34,197,94,0.2)":"rgba(59,130,246,0.15)"} stroke={connected?"#22c55e":"#3b82f6"} strokeWidth="2"/>
            {connected&&<path d="M11 19l4 4 8-8" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>}
            {!connected&&<path d="M13 17h8M17 13v8" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"/>}
          </svg>
        </div>
        <div style={{textAlign:"center"}}><div style={{color:connected?"#22c55e":"#3b82f6",fontWeight:700,fontSize:15}}>{connected?"Connecté":"Déconnecté"}</div><div style={{color:"#6b7280",fontSize:12,marginTop:2}}>{connected?server:"Aucun serveur"}</div></div>
        <div onClick={()=>setConnected(c=>!c)} style={{width:52,height:30,borderRadius:15,background:connected?"#22c55e":"#d1d5db",cursor:"pointer",position:"relative"}}>
          <div style={{position:"absolute",top:3,left:connected?24:3,width:24,height:24,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,0.25)"}}/>
        </div>
      </div>
      {connected&&<div style={{display:"flex",margin:"0 14px 14px",gap:8}}>
        {[{label:"↓ Download",val:"12.4 Mb/s"},{label:"↑ Upload",val:"4.1 Mb/s"},{label:"Ping",val:"12 ms"}].map((s,i)=>(
          <div key={i} style={{flex:1,background:card,borderRadius:10,padding:"8px 6px",textAlign:"center",border:`1px solid ${sep}`}}><div style={{color:"#22c55e",fontWeight:700,fontSize:12}}>{s.val}</div><div style={{color:"#6b7280",fontSize:9,marginTop:2}}>{s.label}</div></div>
        ))}
      </div>}
      <div style={{padding:"0 14px 6px",color:"#6b7280",fontSize:11,fontWeight:600,letterSpacing:0.5,textTransform:"uppercase"}}>Serveurs</div>
      {servers.map((s,i)=>(
        <div key={i} onClick={()=>setServer(s.loc)} style={{background:card,margin:"0 14px",marginBottom:1,borderRadius:i===0?"10px 10px 0 0":i===servers.length-1?"0 0 10px 10px":"0",padding:"12px 14px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",border:`1px solid ${sep}`}}>
          <span style={{fontSize:20}}>{s.flag}</span>
          <div style={{flex:1}}><div style={{color:txt,fontSize:13,fontWeight:server===s.loc?600:400}}>{s.loc}</div><div style={{color:"#6b7280",fontSize:10,marginTop:2}}>{s.ping} ms · {s.load}% charge</div></div>
          {server===s.loc&&<div style={{width:8,height:8,borderRadius:"50%",background:"#22c55e"}}/>}
        </div>
      ))}
      <div style={{height:14}}/>
    </div>
  );
};

export { VPNScreen };
