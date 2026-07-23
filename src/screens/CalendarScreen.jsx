import React, { useState, useContext } from "react";
import { getCharKey } from "../shared/social-feed.js";
import { LoreDateCtx } from "../shared/lore-date.js";

const CALENDAR_SEED = {
  glinda:{
    1:["📚 Cours de macro 10h","♟️ Club d'échecs avec Drew 12h","📣 Entraînement pom-pom 17h","☕ Starbucks (x2 évidemment)"],
    2:["📖 Bibliothèque avec Eoghan 15h","💅 Soirée vernis vert & rose avec ma vie"],
    3:["♟️ Club d'échecs 12h","📣 Entraînement pom-pom 17h","🍕 Dîner avec Eoghan 20h"],
    4:["📋 Devoir d'éco à rendre","🎤 Répétition chant pour le match","👕 Habiller Drew (urgent)","🏳️‍🌈 Pride universitaire 14h"],
    5:["♟️ Club d'échecs 15h","🎀 Prépa pancartes match","🏳️‍🌈 Soirée bisexuelle 20h","🌙 Pyjama party chez Eoghan"],
    6:["📣 MATCH vs Beavers (UVM) 14h — pom-poms pour Eoghan 🏈","☕ Starbucks d'avant-match","🎉 After si on gagne"],
    7:["🌙 Ciné chez Eoghan"],
    8:["♟️ Club d'échecs 12h","📣 Entraînement pom-pom 17h"],
    9:["👩‍💼 Bureau des aides financières"],
    10:["📚 Partiel de stats","♟️ Club d'échecs 12h"],
    13:["📣 Match à Husson — Eoghan joue 14h"],
    31:["🎃 Halloween"],
  },
  eoghan:{
    1:["🏋️ Pecs/triceps 7h","🏈 Entraînement foot 16h","📖 Biblio avec ma vie"],
    2:["🏈 Entraînement foot 16h","💅 Glinda me fait les ongles (vert & rose)"],
    3:["🏋️ Dos/biceps 7h","🍕 Dîner avec Glinda 20h"],
    4:["🏈 Entraînement intensif avant-match 16h","🏳️‍🌈 Pride universitaire 14h","🎵 Compo nocturne (Rush v2)"],
    5:["🏈 Walkthrough équipe 17h","🏳️‍🌈 Soirée bisexuelle 20h","🌙 Glinda dort là (encore)","😰 Stress d'avant-match"],
    6:["🏈 MATCH vs Beavers (UVM) 14h 🏟️","🤝 Glinda fait les pom-poms pour moi","🎉 After si on gagne"],
    7:["🌙 Ciné avec Glinda"],
    8:["🏈 Entraînement foot 16h"],
    10:["🎵 Compo (maison)"],
    13:["🏈 Match à Husson 14h"],
  },
  drew:{
    1:["🔬 TP de bio 9h","♟️ Club d'échecs avec Glinda 12h","🪱 Nourrir les spécimens (discret)"],
    2:["📊 Rendu rapport de labo","🍃 Sortie iNaturalist Quad UMA 14h"],
    3:["♟️ Club d'échecs 12h","📞 Appel mamas 18h"],
    4:["🔬 Labo 9h","🪱 Brumiser le substrat","🏳️‍🌈 Pride universitaire 14h","👕 Glinda menace de brûler mon sweat marron"],
    5:["♟️ Tournoi interne échecs 15h","🏳️‍🌈 Soirée bisexuelle 20h","📚 Réviser génétique"],
    6:["📣 Match vs Beavers (UVM) 14h — y aller pour Eoghan","🍿 Regarder avec Elias"],
    7:["🐛 Observation lombrics après la pluie"],
    8:["🔬 TP de bio 9h"],
    10:["♟️ Club d'échecs 12h"],
  },
  elias:{
    1:["✍️ Atelier d'écriture 11h","📓 Avancer le NaNoWriMo","🦜 Nettoyer la cage de Toto"],
    2:["📚 Cours de littérature 14h","🔎 Recherches (dossier Derry)"],
    3:["✍️ Écriture nocturne","🦜 Toto fixe la fenêtre (encore)"],
    4:["📖 Rendu dissertation","🏳️‍🌈 Pride universitaire 14h","☕ Café avec Eoghan (coaching Grindr ?)"],
    5:["🏳️‍🌈 Soirée bisexuelle 20h","🌙 Insomnie / forums paranormal","📓 Relire le journal d'Anna"],
    6:["📣 Match vs Beavers (UVM) 14h — y aller en groupe","🍿 Regarder avec Drew"],
    7:["✍️ AO3 — nouveau chapitre"],
    8:["📚 Cours de littérature 14h"],
    10:["📝 Atelier d'écriture 11h"],
  },
};

const MONTH_NAMES = ["","January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const CalendarScreen = ({data, isIos, accent}) => {
  const charKey = getCharKey(data);
  const DAYS = ["M","T","W","T","F","S","S"];
  const SEED = CALENDAR_SEED;
  const calendarArr = data?.calendar || [];

  // Le calendrier suit le temps du JDR : il s'ouvre sur le mois/jour de la date de lore courante
  // (data.loreDate, avancée par le MJ), et reste navigable (‹ ›). La grille affiche le mois/année
  // réellement sélectionnés (nombre de jours + alignement des jours de semaine calculés).
  const loreDate = useContext(LoreDateCtx) || "2012-10-06";
  const [loreY, loreM, loreD] = loreDate.split("-").map(Number);
  const [viewYear, setViewYear] = useState(loreY || 2012);
  const [viewMonth, setViewMonth] = useState(loreM || 10); // 1-based
  const [selectedDay, setSelectedDay] = useState(loreD || 6);

  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  // Décalage du 1er du mois, semaine commençant le lundi (0 = lundi … 6 = dimanche)
  const firstWeekday = (new Date(viewYear, viewMonth - 1, 1).getDay() + 6) % 7;
  const isLoreOct = viewMonth === 10 && viewYear === 2012;
  const selDay = Math.min(selectedDay, daysInMonth);

  // Vrais événements (admin) du mois/année affichés. Un événement d'un autre mois n'apparaît que
  // quand on navigue jusqu'à ce mois — plus de perte silencieuse.
  const realEventsByDay = (() => {
    const map = {};
    calendarArr.filter(e => (e.month || 10) === viewMonth && (e.year || 2012) === viewYear).forEach(e => {
      const d = e.day || 1;
      if(!map[d]) map[d] = [];
      map[d].push(e);
    });
    return map;
  })();
  const hasRealEvents = Object.keys(realEventsByDay).length > 0;
  const seedMap = SEED[charKey] || {};
  const eventsForDay = (d) => {
    if(hasRealEvents) return realEventsByDay[d] || [];
    // Les défauts (SEED) ne concernent qu'octobre 2012 ; pas de fallback pour les autres mois.
    if(!isLoreOct) return [];
    return (seedMap[d] || []).map((line, idx) => ({id:`seed-${d}-${idx}`, title:line, _seed:true}));
  };

  const goMonth = (delta) => {
    let m = viewMonth + delta, y = viewYear;
    if(m < 1){ m = 12; y--; } else if(m > 12){ m = 1; y++; }
    setViewMonth(m); setViewYear(y);
  };

  const todayEvents = eventsForDay(selDay);
  const RED = isIos ? "#FF3B30" : "#c0392b";
  const BG = isIos ? "#fff" : "#1a1a1a";
  const TEXT = isIos ? "#000" : "#fff";
  const SUB = isIos ? "#8e8e93" : "#888";
  const BORDER = isIos ? "#e5e5e5" : "#2a2a2a";
  const ACC = accent || RED;

  const eventLabel = (ev) => [ev.title, ev.time, ev.location].filter(Boolean).join(ev.time ? " — " : " ");
  const selWeekday = WEEKDAYS[new Date(viewYear, viewMonth - 1, selDay).getDay()];
  const isMatchSel = selDay === 6 && isLoreOct;

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",background:BG,overflow:"hidden"}}>
      <div style={{background:isIos?"linear-gradient(180deg,#f2f2f2,#e0e0e0)":"#111",borderBottom:`1px solid ${BORDER}`,padding:"8px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <span onClick={()=>goMonth(-1)} style={{color:SUB,fontSize:18,cursor:"pointer",padding:"0 8px",userSelect:"none"}}>‹</span>
        <span style={{color:TEXT,fontSize:14,fontWeight:600}}>{MONTH_NAMES[viewMonth]} {viewYear}</span>
        <span onClick={()=>goMonth(1)} style={{color:SUB,fontSize:18,cursor:"pointer",padding:"0 8px",userSelect:"none"}}>›</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",background:isIos?"#f9f9f9":"#111",borderBottom:`1px solid ${BORDER}`,flexShrink:0}}>
        {DAYS.map((d,i)=>(
          <div key={i} style={{textAlign:"center",padding:"4px 0",color:i>=5?"#ff3b30":SUB,fontSize:10,fontWeight:600}}>{d}</div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1,background:BORDER,flexShrink:0}}>
        {Array.from({length:firstWeekday},(_,i)=>(
          <div key={`blank-${i}`} style={{background:BG,padding:"6px 0"}}/>
        ))}
        {Array.from({length:daysInMonth},(_,i)=>i+1).map(d=>{
          const isMatchDay = d===6 && isLoreOct;
          const isToday = d===loreD && viewMonth===loreM && viewYear===loreY;
          const hasEv = eventsForDay(d).length>0;
          const isSel = d===selDay;
          return (
            <div key={d} onClick={()=>setSelectedDay(d)} style={{background:isSel?ACC:BG,padding:"6px 0",textAlign:"center",cursor:"pointer",position:"relative"}}>
              <div style={{margin:"0 auto",width:20,height:20,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
                border:isToday&&!isSel?`1.5px solid ${ACC}`:"1.5px solid transparent",
                color:isSel?"#fff":isMatchDay?RED:TEXT,fontSize:12,fontWeight:isMatchDay||isSel||isToday?700:400}}>{d}</div>
              {hasEv&&<div style={{width:4,height:4,borderRadius:"50%",background:isSel?"#fff":ACC,margin:"2px auto 0"}}/>}
            </div>
          );
        })}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"10px 14px",display:"flex",flexDirection:"column",gap:8}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:2}}>
          <div style={{color:SUB,fontSize:11,fontWeight:600}}>
            {`${selWeekday}, ${MONTH_NAMES[viewMonth]} ${selDay}, ${viewYear}`}{isMatchSel ? " 🏈" : ""}
          </div>
        </div>
        {todayEvents.length===0
          ? <div style={{color:SUB,fontSize:12,textAlign:"center",marginTop:20}}>Aucun événement</div>
          : todayEvents.map((ev)=>(
              <div key={ev.id} style={{background:isIos?"#f9f9f9":"#222",borderRadius:8,padding:"8px 12px",borderLeft:`3px solid ${ACC}`,display:"flex",alignItems:"center",gap:8}}>
                <div style={{flex:1,color:TEXT,fontSize:12}}>{eventLabel(ev)}</div>
              </div>
          ))
        }
      </div>
    </div>
  );
};

export { CalendarScreen, CALENDAR_SEED };
