// Météo iOS 6 : cartes arrondies par ville (bleu le jour, violet la nuit), prévisions heure par heure
// et sur 6 jours, pagination à points ; le « i » retourne la carte sur les réglages (villes, °C/°F).
// Android 4.1 : même contenu en carte holo sombre. Icônes : vraies icônes météo (les données gardent
// leurs émojis d'origine, traduits ici).
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  mdiInformationVariant, mdiPlus, mdiWeatherCloudy, mdiWeatherFog, mdiWeatherLightningRainy, mdiWeatherNight, mdiWeatherNightPartlyCloudy,
  mdiWeatherPartlyCloudy, mdiWeatherPartlyRainy, mdiWeatherRainy, mdiWeatherSnowy, mdiWeatherSunny, mdiWeatherWindy,
} from "@mdi/js";
import { useList, useValue } from "../data/hooks";
import { useDragPages } from "../phone/useDragPages";
import { AppFrame, BackButton, StatusBar } from "../phone/IOSChrome";
import { useNow, useOS } from "../phone/common";
import { Glyph } from "../kit/glyph";
import { useEditor } from "../kit/kit";
import "./weather.css";

type Day = { day?: string; hi?: number; lo?: number; icon?: string; order?: number };
type City = { name?: string; current?: number; condition?: string; condIcon?: string; forecast?: Record<string, Day>; updated?: string; order?: number; deleted?: boolean };

// [valeur stockée, libellé, icône, couleur]
const CONDS: [string, string, string, string][] = [
  ["☀️", "Sunny", mdiWeatherSunny, "#ffd34d"],
  ["🌤️", "Partly cloudy", mdiWeatherPartlyCloudy, "#fff"],
  ["🌥️", "Mostly cloudy", mdiWeatherPartlyCloudy, "#e8eef5"],
  ["☁️", "Nuageux", mdiWeatherCloudy, "#e8eef5"],
  ["🌦️", "Averses", mdiWeatherPartlyRainy, "#fff"],
  ["🌧️", "Pluie", mdiWeatherRainy, "#d9e9ff"],
  ["⛈️", "Orage", mdiWeatherLightningRainy, "#ffe9a8"],
  ["🌨️", "Neige", mdiWeatherSnowy, "#fff"],
  ["🌫️", "Brouillard", mdiWeatherFog, "#e3e6ea"],
  ["💨", "Vent", mdiWeatherWindy, "#fff"],
];
const CHOICES = CONDS.map(([v, label]) => [label, v] as [string, string]);
const condOf = (v?: string) => CONDS.find(([e]) => e === v || e.replace("️", "") === v?.replace("️", "")) ?? CONDS[3];

function WxIcon({ v, size, night = false }: { v?: string; size: number; night?: boolean }) {
  const [, label, icon, color] = condOf(v);
  const path = night && icon === mdiWeatherSunny ? mdiWeatherNight : night && icon === mdiWeatherPartlyCloudy ? mdiWeatherNightPartlyCloudy : icon;
  return <span className="wx-ico" role="img" aria-label={label} style={{ color: night && icon === mdiWeatherSunny ? "#f3f0d8" : color }}><Glyph i={path} size={size} /></span>;
}

// shortcut: heures dérivées de la température actuelle et du min/max du jour (pas de données horaires) ;
// ajouter un champ « hourly » par ville si le MDJ veut les écrire.
function hourly(c: City, now: Date, hi?: number, lo?: number) {
  const cur = c.current ?? 0, H = hi ?? cur, L = lo ?? cur;
  const curve = (h: number) => (H + L) / 2 + ((H - L) / 2) * Math.cos((2 * Math.PI * (h - 15)) / 24); // max vers 15 h, min vers 3 h
  const h0 = now.getHours(), base = curve(h0);
  return Array.from({ length: 6 }, (_, k) => {
    const h = (h0 + k) % 24;
    const label = k === 0 ? "Now" : `${String(h).padStart(2, "0")}:00`;
    return { label, t: k === 0 ? cur : Math.round(cur + curve(h) - base), night: h < 7 || h >= 19 };
  });
}

export default function WeatherApp({ pid }: { pid: string }) {
  const os = useOS();
  const path = `phones/${pid}/data/weather/cities`;
  const cities = useList<City>(path);
  const unit = useValue<string>(`phones/${pid}/data/weather/unit`) === "F" ? "F" : "C";
  const [page, setPage] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const drag = useDragPages();
  const ed = useEditor(pid);
  const nav = useNavigate();
  const now = useNow();
  const night = now.getHours() < 7 || now.getHours() >= 19;
  const deg = (c?: number) => (c === undefined ? "–" : `${unit === "F" ? Math.round((c * 9) / 5 + 32) : c}°`);
  const editCity = (id: string, c: City) => ed.edit({ path: `${path}/${id}`, fields: ["name", "current", "condition", "condIcon", "updated"], title: c.name, choices: { condIcon: CHOICES } });
  const addCity = () => ed.add(path, { name: "", current: 15, condition: "Sunny", condIcon: "☀️", updated: "6/10/12 15:00" }, { title: "Nouvelle ville", fields: ["name", "current", "condition", "condIcon"], choices: { condIcon: CHOICES } });

  const pages = (
    <div className="wx-pages" {...drag} onScroll={(e) => setPage(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
      {cities.map(([id, c]) => {
        const days = Object.entries(c.forecast ?? {}).sort((a, b) => (a[1].order ?? 0) - (b[1].order ?? 0));
        const hi = days[0]?.[1].hi, lo = days[0]?.[1].lo;
        return (
          <div className="wx-page" key={id}>
            <div className={`wx-card ${night ? "night" : ""}`} onContextMenu={(e) => e.preventDefault()}>
              <div className="wx-top" onClick={ed.canEdit ? () => editCity(id, c) : undefined}>
                <div className="wx-city"><b>{c.name}</b><span>{c.condition}</span><span>{hi !== undefined ? `H: ${deg(hi)}  L: ${deg(lo)}` : ""}</span></div>
                <div className="wx-now"><WxIcon v={c.condIcon} size={50} night={night} /><b>{deg(c.current)}</b></div>
              </div>
              <div className="wx-hours">
                {hourly(c, now, hi, lo).map((h) => (
                  <span key={h.label}><small>{h.label}</small><WxIcon v={c.condIcon} size={22} night={h.night} /><b>{deg(h.t)}</b></span>
                ))}
              </div>
              <div className="wx-days">
                {days.map(([did, d]) => (
                  <button key={did} className="wx-day" onClick={ed.canEdit ? () => ed.edit({ path: `${path}/${id}/forecast/${did}`, fields: ["day", "icon", "hi", "lo"], title: d.day, choices: { icon: CHOICES } }) : undefined}>
                    <b>{(d.day ?? "").toUpperCase()}</b><WxIcon v={d.icon} size={24} /><span className="hi">{deg(d.hi)}</span><span className="lo">{deg(d.lo)}</span>
                  </button>
                ))}
              </div>
              <div className="wx-foot"><span>{c.updated ? `Updated ${c.updated}` : ""}</span><i className="wx-yahoo">YAHOO!</i></div>
            </div>
          </div>
        );
      })}
    </div>
  );

  // Dos de la carte (réglages iOS 6) : liste des villes, ajout, °F / °C.
  const back = (
    <div className="wx-back">
      <div className="wx-back-head">
        {ed.canEdit ? <button className="wx-add" onClick={addCity} aria-label="Add city"><Glyph i={mdiPlus} size={20} /></button> : <span />}
        <b>Weather</b><span />
      </div>
      <ul className="wx-list">
        {cities.map(([id, c]) => (
          <li key={id}>
            <button onClick={ed.canEdit ? () => editCity(id, c) : undefined}
              onContextMenu={(e) => { e.preventDefault(); ed.itemLong(path, id, { label: c.name, fields: ["name", "current", "condition", "condIcon"] })?.(); }}>
              <span>{c.name}</span><WxIcon v={c.condIcon} size={20} /><b>{deg(c.current)}</b>
            </button>
          </li>
        ))}
      </ul>
      <div className="wx-unit" role="group" aria-label="Unit">
        {(["F", "C"] as const).map((u) => (
          <button key={u} className={unit === u ? "on" : ""} disabled={!ed.canEdit} onClick={() => ed.write({ [`phones/${pid}/data/weather/unit`]: u })}>°{u}</button>
        ))}
      </div>
      <div className="wx-back-foot"><i className="wx-yahoo">YAHOO!</i><button className="wx-done" onClick={() => setFlipped(false)}>Done</button></div>
    </div>
  );

  if (os === "android") return (
    <AppFrame title="Weather" left={<BackButton to={`/${pid}/home`} label="Home" />} bodyClass="wx android"
      right={ed.canEdit ? <button className="barbtn" onClick={addCity} aria-label="Add city"><Glyph i={mdiPlus} size={24} /></button> : undefined}>
      {pages}{ed.ui}
    </AppFrame>
  );
  return (
    <div className="app wx ios">
      <StatusBar variant="translucent" />
      <div className={`wx-flip ${flipped ? "flipped" : ""}`}>
        <div className="wx-face front">{pages}</div>
        <div className="wx-face rear">{back}</div>
      </div>
      {!flipped && <>
        <button className="wx-home" onClick={() => nav(`/${pid}/home`)} aria-label="Back">‹</button>
        <div className="wx-dots">{cities.map(([id], i) => <i key={id} className={i === page ? "on" : ""} />)}</div>
        <button className="wx-info" onClick={() => setFlipped(true)} aria-label="Weather settings"><Glyph i={mdiInformationVariant} size={14} /></button>
      </>}
      {ed.ui}
    </div>
  );
}
