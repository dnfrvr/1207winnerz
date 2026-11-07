import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useData, useValue } from "../data/hooks";

export const LORE_DATE_DEFAULT = "2012-10-06";

export function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  return now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function useLoreDate() {
  const d = useValue<string>("meta/loreDate") || LORE_DATE_DEFAULT;
  return new Date(`${d}T12:00:00`);
}

export function StatusBar({ variant = "opaque" }: { variant?: "opaque" | "translucent" | "clear" }) {
  const time = useClock();
  const { saving } = useData();
  return (
    <div className={`ios-status ${variant}`}>
      <div className="left">
        <span className="bars">{[4, 6, 8, 10].map((h) => <i key={h} style={{ height: h }} />)}</span>
        <span>AT&amp;T</span>
        {saving > 0 && <span className="spinner" title="Enregistrement…" />}
      </div>
      <div className="time">{time}</div>
      <div className="right"><span className="battery"><b style={{ width: "80%" }} /></span></div>
    </div>
  );
}

export type NavDir = "push" | "pop" | "none";
/** Sens de la dernière navigation dans l'app (pour l'animation de glissement). */
export const NavDirCtx = createContext<NavDir>("none");

/** Coquille d'une app iOS 6 : barre d'état + barre de navigation + contenu défilant. */
export function AppFrame({ title, left, right, children, navStyle, bodyClass = "" }: {
  title: ReactNode; left?: ReactNode; right?: ReactNode; children: ReactNode; navStyle?: React.CSSProperties; bodyClass?: string;
}) {
  const dir = useContext(NavDirCtx);
  // Le sens est figé au montage : un re-rendu ultérieur ne relance pas l'animation.
  const [mountDir] = useState(dir);
  return (
    <div className={`app ${mountDir}`}>
      <StatusBar />
      <div className="navbar" style={navStyle}>
        {left && <div className="side l">{left}</div>}
        <h1>{title}</h1>
        {right && <div className="side r">{right}</div>}
      </div>
      <div className={`app-body ${bodyClass}`}>{children}</div>
    </div>
  );
}

export function BackButton({ to, label, style }: { to: string; label: string; style?: React.CSSProperties }) {
  const nav = useNavigate();
  return <button className="barbtn back" style={style} onClick={() => nav(to)}>{label}</button>;
}

/** Curseur « slide to unlock » (glisser au doigt ou à la souris). */
export function SlideToUnlock({ onUnlock }: { onUnlock: () => void }) {
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
      <div className="label" style={{ opacity: 1 - x / max() }}>slide to unlock</div>
      <div className="knob" style={{ transform: `translateX(${x}px)`, transition: start.current === null ? "transform .25s" : "none" }}>➜</div>
    </div>
  );
}
