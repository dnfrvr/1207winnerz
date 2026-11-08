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
