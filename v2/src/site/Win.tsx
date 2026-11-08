// Fenêtre Aero (Windows 7) du site, réutilisée par la visite guidée des apps.
import { mdiMessageText, mdiWindowClose, mdiWindowMaximize, mdiWindowMinimize } from "@mdi/js";
import type { ReactNode } from "react";
import { Glyph } from "../kit/glyph";

/** Fenêtre au verre dépoli avec barre de titre et boutons ─ □ ✕ (décoratifs). */
export function Win({ title, icon = <Glyph i={mdiMessageText} size={15} />, children, className = "" }: { title: string; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`w7-win ${className}`}>
      <header className="w7-title"><span className="w7-ico" aria-hidden>{icon}</span><h2>{title}</h2>
        <span className="w7-caps" aria-hidden><i><Glyph i={mdiWindowMinimize} size={12} /></i><i><Glyph i={mdiWindowMaximize} size={12} /></i><i className="x"><Glyph i={mdiWindowClose} size={13} /></i></span></header>
      <div className="w7-body">{children}</div>
    </section>
  );
}

// Étoiles scintillantes du site v1 (mêmes positions, symboles et rythme), en blanc.
const SPARKS: [number, number][] = [[8, 12], [18, 55], [92, 8], [73, 22], [5, 78], [85, 68], [55, 90], [40, 5], [62, 47], [30, 85],
  [78, 40], [15, 40], [95, 85], [48, 72], [22, 18], [66, 15], [88, 30]];
export function Sparkles() {
  return (
    <div className="w7-sparks" aria-hidden>
      {SPARKS.map(([l, t], i) => (
        <span key={i} className={`spk spk${(i % 4) + 1}`} style={{ left: `${l}%`, top: `${t}%`, fontSize: [18, 12, 16][i % 3] }}>
          {["✦", "★", "✿", "❋", "✧", "⁕"][i % 6]}
        </span>
      ))}
    </div>
  );
}
