import React, { useState } from "react";
import { FF_IOS } from "../shared/constants.js";

const INaturalistScreen = ({data, isIos, accent}) => {
  const inat = data.inaturalist || {};
  const obs = inat.list || (data.bugsnap?.scans||[]).map((s,i)=>({id:i,emoji:"🪲",common:s.common,latin:s.name,date:s.date,note:s.note,grade:"Needs ID"}));
  const GREEN = "#74AC00";
  const [tab, setTab] = useState("capture");
  const [capturing, setCapturing] = useState(false);
  const [captured, setCaptured] = useState(null);
  const [wikiQuery, setWikiQuery] = useState("");
  const bg = isIos?"#f4f6ef":"#0e0e0e", card = isIos?"#fff":"#1a1a1a", sep = isIos?"#e0e6d4":"#262626", txt = isIos?"#2d3a1a":"#dfe7d0", sub = isIos?"#8a9a6a":"#7e8a6e";
  const gradeColor = g => g==="Research Grade"?"#74AC00":g==="Needs ID"?"#e8a33d":"#9aa0a6";

  // Wiki species database (offline mini-corpus)
  const SPECIES_WIKI = [
    {emoji:"🐦",common:"Mésange à tête noire",latin:"Poecile atricapillus",cat:"Oiseau",desc:"Petit passereau commun du Maine. Calotte et bavette noires, joues blanches. Chant caractéristique fee-bee."},
    {emoji:"🪱",common:"Ver de terre commun",latin:"Lumbricus terrestris",cat:"Annélide",desc:"Lombric nocturne pouvant atteindre 30 cm. Essentiel à l'aération des sols. Actif après la pluie."},
    {emoji:"🦌",common:"Cerf de Virginie",latin:"Odocoileus virginianus",cat:"Mammifère",desc:"Cervidé le plus répandu d'Amérique du Nord. Queue blanche dressée en signal d'alarme."},
    {emoji:"🍄",common:"Amanite tue-mouches",latin:"Amanita muscaria",cat:"Champignon",desc:"Chapeau rouge à points blancs. Toxique. Symbiose mycorhizienne avec bouleaux et conifères."},
    {emoji:"🦋",common:"Monarque",latin:"Danaus plexippus",cat:"Lépidoptère",desc:"Papillon migrateur orange et noir. Migration de plusieurs milliers de km vers le Mexique."},
    {emoji:"🐸",common:"Grenouille léopard",latin:"Lithobates pipiens",cat:"Amphibien",desc:"Taches sombres cerclées de clair. Habite mares et prairies humides du nord-est."},
    {emoji:"🦅",common:"Pygargue à tête blanche",latin:"Haliaeetus leucocephalus",cat:"Oiseau",desc:"Rapace emblématique des États-Unis. Tête et queue blanches chez l'adulte."},
    {emoji:"🌲",common:"Pin blanc",latin:"Pinus strobus",cat:"Arbre",desc:"Conifère emblème du Maine. Aiguilles souples par faisceaux de cinq. Peut dépasser 40 m."},
  ];
  const wikiResults = wikiQuery.trim()
    ? SPECIES_WIKI.filter(s => (s.common+" "+s.latin+" "+s.cat).toLowerCase().includes(wikiQuery.toLowerCase()))
    : SPECIES_WIKI;

  const TABS = [
    {id:"capture", label:"Identifier",
     icon:(a)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="14" rx="2" stroke={a?GREEN:"#888"} strokeWidth="1.8"/><circle cx="12" cy="13" r="4" stroke={a?GREEN:"#888"} strokeWidth="1.8"/><path d="M8 6l1.5-2.5h5L16 6" stroke={a?GREEN:"#888"} strokeWidth="1.8" strokeLinejoin="round"/></svg>},
    {id:"wiki", label:"Wiki",
     icon:(a)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 19V5a2 2 0 012-2h11a1 1 0 011 1v15a1 1 0 01-1 1H6a2 2 0 01-2-2zm0 0a2 2 0 012-2h13" stroke={a?GREEN:"#888"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>},
    {id:"profil", label:"Profil",
     icon:(a)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke={a?GREEN:"#888"} strokeWidth="1.8"/><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke={a?GREEN:"#888"} strokeWidth="1.8" strokeLinecap="round"/></svg>},
    {id:"histo", label:"Historique",
     icon:(a)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke={a?GREEN:"#888"} strokeWidth="1.8"/><path d="M12 7v5l3 2" stroke={a?GREEN:"#888"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>},
  ];

  const ObsCard = (o,i) => (
    <div key={o.id??i} style={{background:card,margin:"0 10px 8px",borderRadius:6,border:`1px solid ${sep}`,overflow:"hidden"}}>
      <div style={{display:"flex",gap:10,padding:"10px 12px",alignItems:"flex-start"}}>
        <div style={{width:46,height:46,borderRadius:5,background:o.glitch?(isIos?"#e8e4e4":"#222"):(isIos?"#eef5e1":"#23301a"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0,filter:o.glitch?"grayscale(1) contrast(0.8)":"none"}}>
          {o.emoji || <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="10" cy="10" r="6" stroke={sub} strokeWidth="2"/><path d="M15 15l5 5" stroke={sub} strokeWidth="2" strokeLinecap="round"/></svg>}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{color:txt,fontSize:13,fontWeight:700}}>{o.common}</div>
          <div style={{fontStyle:"italic",color:sub,fontSize:10.5}}>{o.latin}</div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4,flexWrap:"wrap"}}>
            <span style={{fontSize:8,fontWeight:700,color:"#fff",background:gradeColor(o.grade),borderRadius:3,padding:"1px 6px",letterSpacing:0.3}}>{(o.grade||"").toUpperCase()}</span>
            {o.ids!=null&&<span style={{fontSize:9,color:isIos?"#999":"#777"}}>· {o.ids} IDs</span>}
            <span style={{fontSize:9,color:isIos?"#aaa":"#666",marginLeft:"auto"}}>{o.date}</span>
          </div>
        </div>
      </div>
      {o.place&&<div style={{padding:"0 12px",color:o.glitch?"#b06b6b":sub,fontSize:10,display:"flex",alignItems:"center",gap:3}}><svg width="9" height="11" viewBox="0 0 12 16" fill="currentColor"><path d="M6 0C2.7 0 0 2.7 0 6c0 4.5 6 10 6 10s6-5.5 6-10c0-3.3-2.7-6-6-6zm0 8.5A2.5 2.5 0 116 3.5a2.5 2.5 0 010 5z"/></svg>{o.place}</div>}
      {o.note&&<div style={{padding:"6px 12px 11px",color:o.glitch?(isIos?"#9a6a6a":"#a98787"):(isIos?"#555":"#9aa08e"),fontSize:10.5,lineHeight:1.5,fontStyle:o.glitch?"italic":"normal"}}>{o.note}</div>}
    </div>
  );

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",background:bg,minHeight:0,fontFamily:FF_IOS}}>
      <div style={{flex:1,overflowY:"auto",minHeight:0,WebkitOverflowScrolling:"touch"}}>

        {tab==="profil"&&<>
          <div style={{background:"linear-gradient(135deg,#8bc34a,#5e8c00)",padding:"14px 14px 16px"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:46,height:46,borderRadius:"50%",background:"rgba(255,255,255,0.18)",border:"2px solid rgba(255,255,255,0.5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>🌿</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{color:"#fff",fontWeight:800,fontSize:15}}>@{inat.observer||"dreww_orms"}</div>
                <div style={{color:"rgba(255,255,255,0.85)",fontSize:10,marginTop:1}}>{inat.rank||"Naturaliste"}</div>
              </div>
            </div>
            <div style={{display:"flex",gap:6,marginTop:12}}>
              {[["Observations",inat.observations??obs.length],["Espèces",inat.species??obs.length],["Identifications",inat.identifications??0]].map(([l,v])=>(
                <div key={l} style={{flex:1,background:"rgba(255,255,255,0.15)",borderRadius:4,padding:"6px 4px",textAlign:"center"}}>
                  <div style={{color:"#fff",fontSize:17,fontWeight:800}}>{v??0}</div>
                  <div style={{color:"rgba(255,255,255,0.85)",fontSize:8,letterSpacing:0.3,textTransform:"uppercase"}}>{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{padding:"12px 14px"}}>
            <div style={{color:sub,fontSize:9,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Badges</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {[
                {icon:<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L9.5 8.5 3 9l5 4.5L6.5 20 12 16.5 17.5 20 16 13.5l5-4.5-6.5-.5z"/></svg>, label:"100 observations"},
                {icon:<svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="2"/><path d="M15 15l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>, label:"Premier ID"},
                {icon:"🪱", label:"Spécialiste annélides"},
                {icon:"🍂", label:"Explorateur d'automne"},
              ].map((b,i)=>(
                <div key={i} style={{background:card,border:`1px solid ${sep}`,borderRadius:14,padding:"5px 11px",fontSize:10,color:txt,display:"flex",alignItems:"center",gap:5}}>
                  <span style={{display:"flex",alignItems:"center"}}>{b.icon}</span>{b.label}
                </div>
              ))}
            </div>
            <div style={{color:sub,fontSize:9,letterSpacing:1,textTransform:"uppercase",margin:"16px 0 8px"}}>Lieux favoris</div>
            {["Quad UMA","Sentier de la rivière Kennebec","Bois derrière Maple Hall"].map((p,i)=>(
              <div key={i} style={{background:card,border:`1px solid ${sep}`,borderRadius:6,padding:"9px 12px",marginBottom:6,color:txt,fontSize:12,display:"flex",alignItems:"center",gap:8}}><svg width="10" height="13" viewBox="0 0 12 16" fill={sub}><path d="M6 0C2.7 0 0 2.7 0 6c0 4.5 6 10 6 10s6-5.5 6-10c0-3.3-2.7-6-6-6zm0 8.5A2.5 2.5 0 116 3.5a2.5 2.5 0 010 5z"/></svg>{p}</div>
            ))}
          </div>
        </>}

        {tab==="capture"&&<div style={{padding:14}}>
          <div style={{color:txt,fontWeight:700,fontSize:15,marginBottom:4}}>Identifier une espèce</div>
          <div style={{color:sub,fontSize:11,marginBottom:14}}>Prenez une photo et notre IA suggère une identification.</div>
          {!captured?<>
            <div style={{background:"#000",borderRadius:12,aspectRatio:"3/4",position:"relative",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:14}}>
              <div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,#1a2e1a,#0a1505)"}}/>
              <div style={{position:"absolute",top:14,left:14,right:14,bottom:14,border:"2px dashed rgba(116,172,0,0.5)",borderRadius:8}}/>
              <div style={{position:"relative",textAlign:"center",color:"rgba(255,255,255,0.5)",fontSize:11}}>
                <div style={{marginBottom:8,display:"flex",justifyContent:"center"}}>
                  {capturing
                    ? <svg width="36" height="36" viewBox="0 0 24 24" fill="none"><circle cx="10" cy="10" r="6" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6"/><path d="M15 15l5 5" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round"/></svg>
                    : <svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M4 8h2l1.5-2h9L18 8h2a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinejoin="round"/><circle cx="12" cy="13" r="3.3" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6"/></svg>}
                </div>
                {capturing?"Analyse en cours…":"Visez le sujet"}
              </div>
            </div>
            <button onClick={()=>{setCapturing(true);setTimeout(()=>{setCapturing(false);setCaptured(SPECIES_WIKI[Math.floor(Math.random()*SPECIES_WIKI.length)]);},1400);}}
              style={{width:"100%",background:GREEN,border:"none",color:"#fff",borderRadius:10,padding:"13px 0",fontSize:14,fontWeight:700,cursor:"pointer",opacity:capturing?0.6:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              {capturing
                ? "Identification…"
                : <><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 8h2l1.5-2h9L18 8h2a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="12" cy="13" r="3.3" stroke="#fff" strokeWidth="1.8"/></svg>Prendre une photo</>}
            </button>
          </>:<>
            <div style={{background:card,border:`1px solid ${sep}`,borderRadius:12,padding:16,textAlign:"center",marginBottom:14}}>
              <div style={{fontSize:54,marginBottom:8}}>{captured.emoji}</div>
              <div style={{color:GREEN,fontSize:10,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase",marginBottom:4}}>Identification suggérée</div>
              <div style={{color:txt,fontSize:16,fontWeight:700}}>{captured.common}</div>
              <div style={{fontStyle:"italic",color:sub,fontSize:12,marginTop:2}}>{captured.latin}</div>
              <div style={{display:"inline-block",marginTop:8,background:"rgba(116,172,0,0.15)",color:GREEN,fontSize:10,fontWeight:700,borderRadius:10,padding:"3px 10px"}}>Confiance 94%</div>
              <div style={{color:isIos?"#555":"#9aa08e",fontSize:11,lineHeight:1.5,marginTop:10,textAlign:"left"}}>{captured.desc}</div>
            </div>
            <button onClick={()=>setCaptured(null)} style={{width:"100%",background:GREEN,border:"none",color:"#fff",borderRadius:10,padding:"11px 0",fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:8}}>Confirmer & publier l'observation</button>
            <button onClick={()=>setCaptured(null)} style={{width:"100%",background:"transparent",border:`1px solid ${sep}`,color:sub,borderRadius:10,padding:"10px 0",fontSize:12,cursor:"pointer"}}>Reprendre une photo</button>
          </>}
        </div>}

        {tab==="histo"&&<>
          <div style={{padding:"12px 12px 4px",color:sub,fontSize:9,letterSpacing:1,textTransform:"uppercase"}}>Mes observations ({obs.length})</div>
          {obs.map(ObsCard)}
          <div style={{padding:"4px 12px 18px",color:isIos?"#aab":"#555",fontSize:9,textAlign:"center"}}>iNaturalist · inaturalist.org/people/{inat.observer||"dreww_orms"}</div>
        </>}

        {tab==="wiki"&&<div style={{padding:"12px 12px 0"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,background:card,border:`1px solid ${sep}`,borderRadius:20,padding:"8px 14px",marginBottom:12}}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke={sub} strokeWidth="1.6"/><path d="M13 13l-2.5-2.5" stroke={sub} strokeWidth="1.6" strokeLinecap="round"/></svg>
            <input value={wikiQuery} onChange={e=>setWikiQuery(e.target.value)} placeholder="Chercher une espèce…" style={{flex:1,border:"none",background:"transparent",outline:"none",color:txt,fontSize:13}}/>
            {wikiQuery&&<span onClick={()=>setWikiQuery("")} style={{color:sub,cursor:"pointer",fontSize:14}}>✕</span>}
          </div>
          {wikiResults.length===0&&<div style={{textAlign:"center",color:sub,fontSize:12,padding:20}}>Aucun résultat</div>}
          {wikiResults.map((s,i)=>(
            <div key={i} style={{background:card,border:`1px solid ${sep}`,borderRadius:8,padding:"11px 12px",marginBottom:8,display:"flex",gap:11}}>
              <div style={{width:42,height:42,borderRadius:6,background:isIos?"#eef5e1":"#23301a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{s.emoji}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{color:txt,fontSize:13,fontWeight:700}}>{s.common}</div>
                <div style={{fontStyle:"italic",color:sub,fontSize:10.5}}>{s.latin} · {s.cat}</div>
                <div style={{color:isIos?"#555":"#9aa08e",fontSize:10.5,lineHeight:1.45,marginTop:4}}>{s.desc}</div>
              </div>
            </div>
          ))}
          <div style={{height:14}}/>
        </div>}

      </div>

      <div style={{background:isIos?"#f7f9f2":"#111",borderTop:`1px solid ${sep}`,display:"flex",flexShrink:0}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>{setTab(t.id);if(t.id!=="capture"){setCaptured(null);setCapturing(false);}}} style={{flex:1,border:"none",background:"transparent",display:"flex",flexDirection:"column",alignItems:"center",padding:"7px 0",gap:2,cursor:"pointer"}}>
            {t.icon(tab===t.id)}
            <span style={{fontSize:8.5,color:tab===t.id?GREEN:"#888",fontWeight:tab===t.id?700:400}}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export { INaturalistScreen };
