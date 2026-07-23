import React from "react";
import { parseLoreTime, LORE_DATE_DEFAULT } from "./lore-date.js";
import { LORE_MONTHS } from "../data/seeds.js";

// Champs de formulaire génériques de l'admin, extraits de AdminBackoffice pour
// être partagés : certains éditeurs vivent dans les fichiers d'écran
// (WeatherCityCard, IgCommentEditor) mais sont montés par l'admin, donc ils ont
// besoin de ces helpers sans créer de dépendance circulaire avec AdminBackoffice.

// Sélecteur date (calendrier natif) + heure optionnelle, unifié pour tout l'admin.
// - Le calendrier s'ouvre toujours par défaut en octobre 2012 (date de lore) même si le
//   champ est vide, via LORE_DATE_DEFAULT (voir note ci-dessous).
// - showTime=false → champ date seul (pour les colonnes qui ne stockent qu'une date).
// - label : intitulé affiché (défaut « Date / heure ») ; showLabel=false le masque.
const LoreDateTimeInput = ({value, onChange, width="100%", showLabel=true, showTime=true, label="Date / heure"}) => {
  const parsed = parseLoreTime(value);
  // Si aucune date n'est encore posée, on pré-remplit avec la date de lore par défaut (oct. 2012)
  // plutôt que de laisser le champ vide : un <input type="date"> vide ouvre son calendrier sur la
  // date du jour RÉELLE (ex: 2026), hors de la plage min/max (2012) — certains navigateurs gèrent
  // mal ce cas et referment le calendrier avant qu'on ait pu choisir un jour.
  const dateVal = parsed?.day ? `2012-${String(parsed.month).padStart(2,'0')}-${String(parsed.day).padStart(2,'0')}` : LORE_DATE_DEFAULT;
  const timeVal = (parsed && parsed.hour!=null) ? `${String(parsed.hour).padStart(2,'0')}:${String(parsed.min).padStart(2,'0')}` : '';
  const build = (d, t) => {
    if(!d) return value||'';
    const [, m, day] = d.split('-').map(Number);
    let str = `${day} ${LORE_MONTHS[m]}`;
    if(showTime && t) {
      const [hh, mm] = t.split(':').map(Number);
      const period = hh < 12 ? 'am' : 'pm';
      const h12 = hh % 12 === 0 ? 12 : hh % 12;
      str += `, ${h12}:${String(mm).padStart(2,'0')}${period}`;
    }
    return str;
  };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:5,width}}>
      {showLabel && <label style={{color:"#9ca3af",fontSize:10,letterSpacing:0.8,textTransform:"uppercase",fontWeight:600}}>{label}</label>}
      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
        <input type="date" value={dateVal}
          onChange={e=>onChange(build(e.target.value, timeVal))}
          className="adm-input" style={{flex:"1 1 120px",minWidth:0,background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a1a2e",padding:"7px 8px",fontSize:11,borderRadius:7}}/>
        {showTime && <input type="time" value={timeVal}
          onChange={e=>onChange(build(dateVal, e.target.value))}
          className="adm-input" style={{flex:"1 1 90px",minWidth:0,background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a1a2e",padding:"7px 8px",fontSize:11,borderRadius:7}}/>}
      </div>
    </div>
  );
};

// Sélecteur d'HEURE seule (input type=time natif) ↔ format lore "2:14pm".
// Pour les champs qui ne portent qu'une heure (horodatage de bulle de chat, dernier message)
// où LoreDateTimeInput injecterait une date absolue indésirable. NB : parseLoreTime exige une
// date, donc on parse/format l'horloge nous-mêmes ici.
const parseClock = (str) => {
  const m = String(str||"").toLowerCase().match(/(\d{1,2}):(\d{2})\s*(am|pm)?/);
  if(!m) return null;
  let h = parseInt(m[1]); const min = parseInt(m[2]); const period = m[3];
  if(period==='pm' && h!==12) h+=12;
  if(period==='am' && h===12) h=0;
  return {h: h%24, min};
};
const buildClock = (hhmm) => {
  if(!hhmm) return "";
  const [h, mm] = hhmm.split(':').map(Number);
  const period = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(mm).padStart(2,'0')}${period}`;
};
const LoreTimeInput = ({value, onChange, width="100%", showLabel=true, label="Heure"}) => {
  const p = parseClock(value);
  const timeVal = p ? `${String(p.h).padStart(2,'0')}:${String(p.min).padStart(2,'0')}` : '';
  return (
    <div style={{display:"flex",flexDirection:"column",gap:5,width}}>
      {showLabel && <label style={{color:"#9ca3af",fontSize:10,letterSpacing:0.8,textTransform:"uppercase",fontWeight:600}}>{label}</label>}
      <input type="time" value={timeVal} onChange={e=>onChange(buildClock(e.target.value))}
        className="adm-input" style={{width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a1a2e",padding:"7px 8px",fontSize:11,borderRadius:7}}/>
    </div>
  );
};

// `style` fusionne sur le conteneur (les appelants passent surtout `flex:1` pour
// la mise en page en ligne) ; `placeholder` est transmis au champ. Les deux
// étaient auparavant ignorés silencieusement sur des dizaines d'appels.
const Field = ({label, value, onChange, textarea=false, width="100%", style={}, placeholder}) => (
  <div style={{display:"flex",flexDirection:"column",gap:5,width,...style}}>
    <label style={{color:"#9ca3af",fontSize:10,letterSpacing:0.8,textTransform:"uppercase",fontWeight:600}}>{label}</label>
    {textarea
      ?<textarea value={value||""} onChange={e=>onChange(e.target.value)} rows={4} placeholder={placeholder} className="adm-input"
          style={{background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a1a2e",padding:"8px 12px",fontSize:12,borderRadius:8,resize:"vertical",fontFamily:"inherit",boxShadow:"0 1px 2px rgba(0,0,0,0.04)"}}/>
      :<input value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="adm-input"
          style={{background:"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a1a2e",padding:"8px 12px",fontSize:12,borderRadius:8,width:"100%",boxSizing:"border-box",boxShadow:"0 1px 2px rgba(0,0,0,0.04)"}}/>
    }
  </div>
);

export { Field, LoreDateTimeInput, LoreTimeInput };
