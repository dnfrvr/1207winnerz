import React, { useContext } from "react";
import { LORE_MONTHS } from "../data/seeds.js";

// ─── Date lore ───────────────────────────────────────────────────────────────
// Date fictive de l'ARG — modifiable dans les réglages admin.
// Format stocké : "YYYY-MM-DD". Défaut = 2012-10-06 (date à laquelle les téléphones
// ont été présentés en séance de JDR) ; elle avance ensuite via le sélecteur de l'admin.

// Date lore par défaut. Modifiable dans l'admin (en session uniquement —
// les artifacts Claude n'ont pas de stockage persistant).
const LORE_DATE_DEFAULT = '2012-10-06';
const getLoreDate = () => LORE_DATE_DEFAULT;

// Parse une date lore du type "1 oct, 2:30pm" ou "30 sep" ou "15 sep, 11:44pm" (et l'ancien format "14h30" en fallback)
// Backne un objet {day, month, hour, min} avec des valeurs numériques
const parseLoreTime = (str) => {
  if(!str) return null;
  const s = str.toLowerCase().trim();

  // Format DD/MM/YY ou DD/MM/YYYY — ex: "17/02/12", "20/01/2012"
  // (ancien format de saisie manuel avant l'ajout de LoreDateTimeInput)
  const mSlash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(.+))?$/);
  if(mSlash) {
    const day = parseInt(mSlash[1]);
    const month = parseInt(mSlash[2]);
    if(month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      // Heure optionnelle après la date : "17/02/12 14h30"
      let hour = null, min = 0;
      if(mSlash[4]) {
        const mT12 = mSlash[4].match(/(\d{1,2}):(\d{2})\s*(am|pm)/);
        const mT24 = mSlash[4].match(/(\d+)h(\d*)/);
        if(mT12) {
          let h = parseInt(mT12[1]);
          if(mT12[3]==='pm' && h!==12) h+=12;
          if(mT12[3]==='am' && h===12) h=0;
          hour=h; min=parseInt(mT12[2]);
        } else if(mT24) {
          hour=parseInt(mT24[1]); min=mT24[2]?parseInt(mT24[2]):0;
        }
      }
      return {day, month, hour, min};
    }
  }

  const MONTHS = {jan:1,fév:2,feb:2,mar:3,avr:4,apr:4,mai:5,may:5,juin:6,jun:6,juil:7,jul:7,'aoû':8,aug:8,sep:9,oct:10,nov:11,'déc':12,dec:12};
  const mDay = s.match(/(\d+)\s+(jan|fév|feb|mar|avr|apr|mai|may|juin|jun|juil|jul|aoû|aug|sep|oct|nov|déc|dec)/);
  if(!mDay) return null;
  // Format 12h am/pm : "2:30pm", "11:44am"
  const mTime12 = s.match(/(\d{1,2}):(\d{2})\s*(am|pm)/);
  // Ancien format 24h : "14h30"
  const mTime24 = s.match(/(\d+)h(\d*)/);
  let hour = null, min = 0;
  if(mTime12) {
    let h = parseInt(mTime12[1]);
    const period = mTime12[3];
    if(period === 'pm' && h !== 12) h += 12;
    if(period === 'am' && h === 12) h = 0;
    hour = h;
    min = parseInt(mTime12[2]);
  } else if(mTime24) {
    hour = parseInt(mTime24[1]);
    min = mTime24[2] ? parseInt(mTime24[2]) : 0;
  }
  return {
    day:   parseInt(mDay[1]),
    month: MONTHS[mDay[2]] || 10,
    hour,
    min,
  };
};

// Formate une date lore comme iOS Mail :
// — Même jour    → "2:30pm"
// — Cette semaine → "Mon." / "Tue." etc.
// — Plus ancien   → "28 Sep"
const formatMsgTime = (timeStr, loreDateStr) => {
  const lore = loreDateStr || '2012-10-01';
  const [ly, lm, ld] = lore.split('-').map(Number);  // 2012, 10, 1
  const parsed = parseLoreTime(timeStr);
  if(!parsed) return timeStr; // fallback brut

  const {day, month, hour, min} = parsed;
  const year = 2012;

  // Même jour ?
  if(day === ld && month === lm) {
    if(hour !== null) {
      const period = hour < 12 ? 'am' : 'pm';
      const h12 = hour % 12 === 0 ? 12 : hour % 12;
      return `${h12}:${String(min).padStart(2,'0')}${period}`;
    }
    return 'Today';
  }

  // Calcule la différence en jours
  const loreMs  = new Date(ly, lm-1, ld).getTime();
  const msgMs   = new Date(year, month-1, day).getTime();
  const diffDays = Math.round((loreMs - msgMs) / 86400000);

  // Cette semaine (< 7 jours avant) → jour de la semaine
  if(diffDays > 0 && diffDays < 7) {
    const DOW = ['Sun.','Mon.','Tue.','Wed.','Thu.','Fri.','Sat.'];
    const dow  = new Date(year, month-1, day).getDay();
    return DOW[dow];
  }

  // Plus ancien → "28 sep"
  const MONTH_SHORT = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${day} ${MONTH_SHORT[month]}`;
};

// Clé numérique triable depuis une heure lore ("1 oct, 10h05") — pour l'ordre anti-chronologique.
const loreSortKey = (timeStr) => {
  const p = parseLoreTime(timeStr);
  if(!p) return 0;
  return (p.month||0)*1e6 + (p.day||0)*1e4 + (p.hour||0)*100 + (p.min||0);
};

// Tri/regroupement de la galerie photo — partagé entre iOS et Android pour que la grille et la vue
// "photo en grand" utilisent TOUJOURS le même ordre (sinon l'index cliqué ne correspond plus à la
// bonne photo). Tant qu'aucune photo n'a de dateISO, on garde l'ordre d'origine (manuel) tel quel.
const sortGalleryPhotos = (list) => {
  if(!list.some(p=>p.dateISO)) return list;
  return [...list].sort((a,b)=>(b.dateISO||"0000-00-00").localeCompare(a.dateISO||"0000-00-00"));
};
const GALLERY_MONTHS_FR = ["","Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const groupGalleryByMonth = (sortedList) => {
  const groups = [];
  sortedList.forEach(photo=>{
    let label = "Sans date";
    if(photo.dateISO) {
      const [year, month] = photo.dateISO.split("-");
      label = `${GALLERY_MONTHS_FR[parseInt(month)]||month} ${year}`;
    }
    if(!groups.length || groups[groups.length-1].label!==label) groups.push({label, photos:[]});
    groups[groups.length-1].photos.push(photo);
  });
  return groups;
};
// Alias pour ne pas casser d'éventuelles références externes
const groupGalleryByYear = groupGalleryByMonth;

// Tri des appels du plus récent au plus ancien — partagé entre iOS et Android.
const sortCallsByDate = (calls) => [...calls].sort((a,b)=>loreSortKey(b.time)-loreSortKey(a.time));

// Séparateurs de date dans les fils de discussion.
const FULL_MONTHS_EN = {1:"January",2:"February",3:"March",4:"April",5:"May",6:"June",7:"July",8:"August",9:"September",10:"October",11:"November",12:"December"};
const loreDayKey = (timeStr) => { const p = parseLoreTime(timeStr); return p ? p.month*100+p.day : null; };
const loreDateLabel = (timeStr) => { const p = parseLoreTime(timeStr); return p ? `${FULL_MONTHS_EN[p.month]||""} ${p.day}`.trim() : null; };

// Affichage relatif d'une date lore par rapport à la date de lore courante : "2j" si c'est dans le
// passé, "dans 2j" si futur, l'heure ("9:58am") si c'est le même jour. Si la string n'est pas dans le
// format lore (ex: anciennes valeurs codées en dur comme "2m"/"1j"), on l'affiche telle quelle —
// donc rien ne casse pour les données déjà existantes qui n'ont pas encore été repassées par le sélecteur.
const loreRelativeLabel = (timeStr, loreDateStr) => {
  const lore = loreDateStr || LORE_DATE_DEFAULT;
  const [ly, lm, ld] = lore.split('-').map(Number);
  const parsed = parseLoreTime(timeStr);
  if(!parsed || !parsed.day) return timeStr;
  const {day, month, hour, min} = parsed;
  // Même jour → heure
  if(day === ld && month === lm) {
    if(hour !== null) {
      const period = hour < 12 ? 'am' : 'pm';
      const h12 = hour % 12 === 0 ? 12 : hour % 12;
      return `${h12}:${String(min).padStart(2,'0')}${period}`;
    }
    return "Today";
  }
  const loreMs = new Date(ly, lm-1, ld).getTime();
  const itemMs = new Date(2012, month-1, day).getTime();
  const diffDays = Math.round((loreMs - itemMs) / 86400000);
  // < 7 jours → jour de la semaine abrégé
  if(diffDays > 0 && diffDays < 7) {
    const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    return DOW[new Date(2012, month-1, day).getDay()];
  }
  // ≥ 7 jours → DD/MM/YY
  if(diffDays >= 7) {
    return `${String(day).padStart(2,'0')}/${String(month).padStart(2,'0')}/12`;
  }
  // Futur
  if(diffDays < 0) return `in ${-diffDays}d`;
  return timeStr;
};

// Normalise l'affichage d'une date brute (ex: ancien stockage "6 oct" en français) en "6 Oct"
// anglais, sans toucher à la donnée stockée — juste l'affichage, pour un format uniforme partout.
const loreDateOnly = (dateStr) => {
  const p = parseLoreTime(dateStr);
  if(!p || !p.day) return dateStr;
  return `${p.day} ${LORE_MONTHS[p.month]}`;
};

const LoreDateCtx = React.createContext(LORE_DATE_DEFAULT);
// Hook pratique : formate directement une string de temps lore par rapport à la date de lore en cours.
const useLoreRelative = (timeStr) => loreRelativeLabel(timeStr, useContext(LoreDateCtx));

export {
  LORE_DATE_DEFAULT, getLoreDate, parseLoreTime, formatMsgTime, loreSortKey,
  sortGalleryPhotos, GALLERY_MONTHS_FR, groupGalleryByMonth, groupGalleryByYear,
  sortCallsByDate, FULL_MONTHS_EN, loreDayKey, loreDateLabel, loreRelativeLabel,
  loreDateOnly, LoreDateCtx, useLoreRelative,
};
