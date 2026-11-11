// « Chrome » des apps (barre d'état, barre de navigation, bouton retour). Les apps l'importent
// d'ici sans se soucier du système : chaque composant se dessine en iOS 6 ou en Android 4
// selon le téléphone affiché (useOS).
import { useContext, useRef, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useData, useValue } from "../data/hooks";
import { img } from "../lib/img";
import { ANDROID_APP_COLORS, ANDROID_ICON_DEFAULTS, ANDROID_LIGHT_BARS, NavDirCtx, useClock, useOS } from "./common";

export { LORE_DATE_DEFAULT, NavDirCtx, useClock, useLoreDate, type NavDir } from "./common";

/** `locked` : écran verrouillé d'iOS 6 — un cadenas remplace l'heure (déjà affichée en grand). */
export function StatusBar({ variant = "opaque", locked = false }: { variant?: "opaque" | "translucent" | "clear"; locked?: boolean }) {
  const os = useOS();
  const time = useClock();
  const { saving } = useData();
  if (os === "android") return <AndroidStatusBar variant={variant} saving={saving > 0} time={time} />;
  return (
    <div className={`ios-status ${variant}`}>
      <div className="left">
        <span className="bars">{[4, 6, 8, 10].map((h) => <i key={h} style={{ height: h }} />)}</span>
        <span>AT&amp;T</span>
        {saving > 0 && <span className="spinner" title="Enregistrement…" />}
      </div>
      <div className="time">{locked
        ? <svg width="9" height="12" viewBox="0 0 9 12" aria-label="Verrouillé"><path d="M2 5V3.5a2.5 2.5 0 0 1 5 0V5" fill="none" stroke="#fff" strokeWidth="1.4" /><rect x=".5" y="5" width="8" height="6.5" rx="1" fill="#fff" /></svg>
        : time}</div>
      <div className="right"><span className="battery"><b style={{ width: "80%" }} /></span></div>
    </div>
  );
}

function AndroidStatusBar({ variant, saving, time }: { variant: string; saving: boolean; time: string }) {
  return (
    <div className={`and-status ${variant}`}>
      <div className="left">{saving && <span className="and-sync" title="Synchronisation…" />}</div>
      <div className="right">
        <svg width="15" height="12" viewBox="0 0 20 16" aria-hidden><path d="M0.5 6.5 Q10 -1.5 19.5 6.5 L17 9 Q10 3.5 3 9 Z M4 10 Q10 5.5 16 10 L13.5 12.5 Q10 9 6.5 12.5 Z M7 13 Q10 10.5 13 13 L11.2 14.8 Q10 13.5 8.8 14.8 Z" fill="#33b5e5" /><circle cx="10" cy="16" r="1.8" fill="#33b5e5" /></svg>
        <svg width="14" height="12" viewBox="0 0 16 13" aria-hidden><rect x="0" y="10" width="3.2" height="3" fill="#33b5e5" /><rect x="4.3" y="7" width="3.2" height="6" fill="#33b5e5" /><rect x="8.5" y="4" width="3.2" height="9" fill="#33b5e5" /><rect x="12.8" y="1" width="3.2" height="12" fill="rgba(255,255,255,.3)" /></svg>
        <svg width="8" height="13" viewBox="0 0 8 13" aria-hidden><rect x="2.5" y="0" width="3" height="1.5" fill="#fff" /><rect x="0.5" y="1.5" width="7" height="11" rx="1" fill="none" stroke="#fff" /><rect x="1.5" y="4" width="5" height="7.5" fill="#33b5e5" /></svg>
        <span className="t">{time}</span>
      </div>
    </div>
  );
}

/** Coquille d'une app : barre d'état + barre de navigation (iOS) / barre d'action (Android) + contenu. */
export function AppFrame({ title, left, right, children, navStyle, bodyClass = "" }: {
  title: ReactNode; left?: ReactNode; right?: ReactNode; children: ReactNode; navStyle?: React.CSSProperties; bodyClass?: string;
}) {
  const os = useOS();
  const { app = "" } = useParams();
  const dir = useContext(NavDirCtx);
  // Le sens est figé au montage : un re-rendu ultérieur ne relance pas l'animation.
  const [mountDir] = useState(dir);
  if (os === "android") return (
    <div className={`app and ${mountDir}`}>
      <StatusBar />
      {/* navStyle (teinte iOS) volontairement ignoré : la barre d'action holo a sa couleur propre. */}
      <div className={`actionbar ${ANDROID_LIGHT_BARS.has(app) ? "light" : ""}`} style={{ background: ANDROID_APP_COLORS[app] ?? "#222" }}>
        {left ?? <AppGlyph app={app} />}
        <h1>{title}</h1>
        {right && <div className="ab-actions">{right}</div>}
      </div>
      <div className={`app-body ${bodyClass}`}>{children}</div>
    </div>
  );
  return (
    <div className={`app ${mountDir}`}>
      <StatusBar />
      <div className={`navbar ${navStyle ? "tinted" : ""}`} style={navStyle}>
        {left && <div className="side l">{left}</div>}
        <h1>{title}</h1>
        {right && <div className="side r">{right}</div>}
      </div>
      <div className={`app-body ${bodyClass}`}>{children}</div>
    </div>
  );
}

/** Icône de l'app dans la barre d'action Android (comme dans les apps Jelly Bean). */
function AppGlyph({ app }: { app: string }) {
  const icons = useValue<Record<string, string>>("shared/androidIcons");
  const src = icons?.[app] ?? ANDROID_ICON_DEFAULTS[app];
  return src ? <span className="ab-icon"><img src={img(src)} alt="" draggable={false} /></span> : <span className="ab-icon-pad" />;
}

export function BackButton({ to, label, style }: { to: string; label: string; style?: React.CSSProperties }) {
  const nav = useNavigate();
  const os = useOS();
  const { app = "" } = useParams();
  // Android 4.1 : « affordance Up » = petit chevron + icône de l'app, à gauche du titre.
  if (os === "android") return (
    <button className="ab-up" aria-label={label} onClick={() => nav(to)}>
      <svg className="ab-caret" width="8" height="14" viewBox="0 0 8 14" aria-hidden><path d="M7 1L1.5 7 7 13" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
      <AppGlyph app={app} />
    </button>
  );
  return <button className="barbtn back" style={style} onClick={() => nav(to)}>{label}</button>;
}

/**
 * Bouton retour unique pour les barres personnalisées des apps (Instagram, Grindr, VPN…).
 * iOS 6 : bouton en flèche bordé avec libellé, teinté pour s'accorder à la couleur de la barre
 * (`tone="light"` sur barre claire : texte sombre). Android 4.1 : affordance « Up » Holo.
 */
export function BarBack({ onClick, label = "Retour", tone = "dark" }: { onClick: () => void; label?: string; tone?: "dark" | "light" }) {
  const os = useOS();
  const { app = "" } = useParams();
  if (os === "android") return (
    <button className="ab-up bar-up" aria-label={label} onClick={onClick}>
      <svg className="ab-caret" width="8" height="14" viewBox="0 0 8 14" aria-hidden><path d="M7 1L1.5 7 7 13" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
      <AppGlyph app={app} />
    </button>
  );
  return <button className={`barbtn back tint ${tone}`} onClick={onClick}>{label}</button>;
}

/** Curseur « slide to unlock » (glisser au doigt ou à la souris). */
export function SlideToUnlock({ onUnlock, label = "slide to unlock" }: { onUnlock: () => void; label?: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(0);
  const start = useRef<number | null>(null);
  const max = () => (track.current?.clientWidth ?? 280) - 68;

  return (
    <div
      ref={track}
      className="slider"
      onPointerDown={(e) => { start.current = e.clientX - x; (e.target as HTMLElement).setPointerCapture(e.pointerId); }}
      onPointerMove={(e) => { if (start.current !== null) setX(Math.max(0, Math.min(max(), e.clientX - start.current))); }}
      onPointerUp={() => {
        start.current = null;
        if (x > max() * 0.85) onUnlock();
        else setX(0);
      }}
    >
      <div className="label" style={{ opacity: 1 - x / max() }}>{label}</div>
      <div className="knob" style={{ transform: `translateX(${x}px)`, transition: start.current === null ? "transform .25s" : "none" }}>
        <svg width="28" height="22" viewBox="0 0 28 22" aria-hidden><path d="M2 8h14V2l10 9-10 9v-6H2z" fill="url(#stu)" stroke="#7d7d7d" strokeWidth=".8" /><defs><linearGradient id="stu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9a9a9a" /><stop offset="1" stopColor="#c8c8c8" /></linearGradient></defs></svg>
      </div>
    </div>
  );
}

/** Anneau de déverrouillage Android 4 (glisser le cadenas hors du cercle, ou toucher). */
export function RingUnlock({ onUnlock }: { onUnlock: () => void }) {
  const [d, setD] = useState({ x: 0, y: 0 });
  const start = useRef<{ x: number; y: number; k: number } | null>(null);
  const dist = Math.hypot(d.x, d.y);
  return (
    <div className="ring-wrap">
      <div className="ring outer" style={{ opacity: start.current ? 1 : 0.6, transform: `scale(${start.current ? 1.08 : 1})` }} />
      <div className="ring inner" />
      <div
        className="ring-handle"
        style={{ transform: `translate(${d.x}px, ${d.y}px)`, transition: start.current ? "none" : "transform .25s" }}
        onPointerDown={(e) => {
          const host = (e.currentTarget as HTMLElement).closest(".screen") as HTMLElement | null;
          const r = host?.getBoundingClientRect();
          start.current = { x: e.clientX, y: e.clientY, k: r && host ? r.width / host.offsetWidth : 1 };
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          setD({ x: 0, y: 0 });
        }}
        onPointerMove={(e) => {
          const s = start.current; if (!s) return;
          const x = (e.clientX - s.x) / s.k, y = (e.clientY - s.y) / s.k;
          const m = Math.hypot(x, y), cap = 70;
          setD(m > cap ? { x: (x / m) * cap, y: (y / m) * cap } : { x, y });
        }}
        onPointerUp={() => {
          const wasTap = dist < 4;
          start.current = null;
          if (dist > 55 || wasTap) onUnlock(); else setD({ x: 0, y: 0 });
        }}
      >
        <svg width="26" height="28" viewBox="0 0 26 28" fill="none" aria-hidden><rect x="4" y="13" width="18" height="13" rx="2.5" stroke="white" strokeWidth="1.8" /><path d="M8 13V9a5 5 0 0 1 10 0v4" stroke="white" strokeWidth="1.8" strokeLinecap="round" /><circle cx="13" cy="20" r="2" fill="white" opacity=".9" /></svg>
      </div>
    </div>
  );
}
