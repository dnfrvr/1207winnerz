// Météo iOS 6 : cartes arrondies par ville (bleu le jour, violet la nuit), prévisions 6 jours,
// pagination à points. Android 4.1 : même contenu en carte holo sombre.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useList } from "../data/hooks";
import { AppFrame, BackButton, StatusBar } from "../phone/IOSChrome";
import { useNow, useOS } from "../phone/common";
import { useEditor } from "../kit/kit";
import "./weather.css";

type Day = { day?: string; hi?: number; lo?: number; icon?: string; order?: number };
type City = { name?: string; current?: number; condition?: string; condIcon?: string; forecast?: Record<string, Day>; updated?: string; order?: number; deleted?: boolean };

export default function WeatherApp({ pid }: { pid: string }) {
  const os = useOS();
  const cities = useList<City>(`phones/${pid}/data/weather/cities`);
  const [page, setPage] = useState(0);
  const ed = useEditor(pid);
  const nav = useNavigate();
  const now = useNow();
  const night = now.getHours() < 7 || now.getHours() >= 19;
  const path = `phones/${pid}/data/weather/cities`;
  const content = (
    <div className="wx-pages" onScroll={(e) => setPage(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
      {cities.map(([id, c]) => {
        const days = Object.entries(c.forecast ?? {}).sort((a, b) => (a[1].order ?? 0) - (b[1].order ?? 0));
        const hi = days[0]?.[1].hi, lo = days[0]?.[1].lo;
        return (
          <div className="wx-page" key={id}>
            <div className={`wx-card ${night ? "night" : ""}`} onContextMenu={(e) => e.preventDefault()}>
              <div className="wx-top" onClick={ed.canEdit ? () => ed.edit({ path: `${path}/${id}`, fields: ["name", "current", "condition", "condIcon"], title: c.name }) : undefined}>
                <div className="wx-city"><b>{c.name}</b><span>{hi !== undefined ? `H: ${hi}°  L: ${lo}°` : c.condition}</span></div>
                <div className="wx-now"><span className="wx-icon">{c.condIcon}</span><b>{c.current}°</b></div>
              </div>
              <div className="wx-days">
                {days.map(([did, d]) => (
                  <button key={did} className="wx-day" onClick={ed.canEdit ? () => ed.edit({ path: `${path}/${id}/forecast/${did}`, fields: ["day", "icon", "hi", "lo"], title: d.day }) : undefined}>
                    <b>{(d.day ?? "").toUpperCase()}</b><span className="wx-icon sm">{d.icon}</span><span className="hi">{d.hi}°</span><span className="lo">{d.lo}°</span>
                  </button>
                ))}
              </div>
              <div className="wx-foot">{c.updated ? `Updated ${c.updated}` : c.condition}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
  if (os === "android") return (
    <AppFrame title="Weather" left={<BackButton to={`/${pid}/home`} label="Accueil" />} bodyClass="wx android">{content}{ed.ui}</AppFrame>
  );
  return (
    <div className="app wx ios">
      <StatusBar variant="translucent" />
      <button className="wx-home" onClick={() => nav(`/${pid}/home`)} aria-label="Retour">‹</button>
      {content}
      <div className="wx-dots">{cities.map(([id], i) => <i key={id} className={i === page ? "on" : ""} />)}</div>
      <span className="wx-info" aria-hidden>i</span>
      {ed.ui}
    </div>
  );
}
