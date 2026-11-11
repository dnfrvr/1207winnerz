// Centre de notifications (iOS 6) / volet de notifications (Android 4.1) : on tire la barre d'état
// vers le bas pour voir l'historique des notifs du téléphone ; « × » (iOS) ou « tout effacer »
// (Android) les retire de la liste (champ `cleared`, rien n'est supprimé).
import { useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { useCanEdit, useValue, useWriter } from "../data/hooks";
import { notifLines, type Notif } from "../data/notify";
import type { Patches } from "../data/store";
import { img } from "../lib/img";
import { Glyph } from "../kit/glyph";
import { mdiClose, mdiNotificationClearAll } from "@mdi/js";
import { APP_META } from "../../../src/shared/app-meta.js";
import { useAppIcon, useOpenNotif } from "./Notifs";
import { useClock, useLoreDate, useNow, type OS } from "./common";
import "./notifcenter.css";

type Item = [string, Notif & { cleared?: boolean }];
const META = APP_META as Record<string, { label?: string; droidLabel?: string }>;
const HEIGHT: Record<OS, number> = { ios: 568, android: 533 };

const ago = (at: number, now: number) => {
  const m = Math.floor((now - at) / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  return new Date(at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
};

export function NotifCenter({ pid, os }: { pid: string; os: OS }) {
  const H = HEIGHT[os];
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<number | null>(null); // bas du volet pendant qu'on le tire (px écran)
  const drag = useRef<{ y: number; from: number; scale: number; moved: boolean; at: number } | null>(null);

  const down = (e: RPointerEvent<HTMLElement>) => {
    const scr = e.currentTarget.closest(".screen") as HTMLElement | null;
    const scale = scr ? scr.getBoundingClientRect().height / scr.offsetHeight || 1 : 1;
    e.preventDefault(); // pas de sélection de texte en tirant à la souris
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointeur déjà relâché */ }
    drag.current = { y: e.clientY, from: open ? H : 0, scale, moved: false, at: open ? H : 0 };
  };
  const move = (e: RPointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;
    const dy = (e.clientY - d.y) / d.scale;
    if (Math.abs(dy) > 4) d.moved = true;
    if (d.moved) { d.at = Math.min(H, Math.max(0, d.from + dy)); setPos(d.at); }
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.moved) { if (open) setOpen(false); } // simple tape sur la poignée : on referme
    else setOpen(d.at > H * (open ? 0.7 : 0.3));
    setPos(null);
  };
  const handle = { onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: up };
  const y = (pos ?? (open ? H : 0)) - H;

  return (
    <>
      <div className="nc-pull" aria-label="Tirer pour voir les notifications" {...handle} />
      <div className={`nc ${os} ${pos === null ? "anim" : ""}`} style={{ transform: `translateY(${y}px)`, visibility: open || pos !== null ? "visible" : "hidden" }}>
        {(open || pos !== null) && <NotifList pid={pid} os={os} onOpen={() => setOpen(false)} />}
        <div className="nc-grab" {...handle}><i /></div>
      </div>
    </>
  );
}

function NotifList({ pid, os, onOpen }: { pid: string; os: OS; onOpen: () => void }) {
  const map = useValue<Record<string, Item[1]>>(`phones/${pid}/notifs`);
  const list = useMemo(() => Object.entries(map ?? {}).filter(([, n]) => n && !n.cleared).sort((a, b) => b[1].at - a[1].at).slice(0, 40) as Item[], [map]);
  const icon = useAppIcon(pid, os);
  const openNotif = useOpenNotif(pid);
  const canEdit = useCanEdit(pid);
  const { write } = useWriter(pid);
  const now = useNow(30_000).getTime();
  const clock = useClock();
  const lore = useLoreDate();
  const clear = (items: Item[]) => {
    const p: Patches = {};
    for (const [id] of items) { p[`phones/${pid}/notifs/${id}/cleared`] = true; p[`phones/${pid}/notifs/${id}/seen`] = true; }
    if (items.length) write(p);
  };
  const go = ([id, n]: Item) => { onOpen(); openNotif(id, n); };

  if (os === "android") return (
    <div className="nc-body">
      <div className="nc-and-head">
        <b>{clock}</b>
        <span>{lore.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).toUpperCase()}</span>
        {canEdit && list.length > 0 && <button aria-label="Tout effacer" onClick={() => clear(list)}><Glyph i={mdiNotificationClearAll} size={26} /></button>}
      </div>
      <ul className="nc-and-list">
        {list.map((it) => {
          const [id, n] = it;
          const src = icon(n.app);
          const { text, attach } = notifLines(n, os);
          return (
            <li key={id} className={n.seen ? "" : "new"}>
              <button onClick={() => go(it)}>
                <span className="ico">{src ? <img src={img(src)} alt="" /> : <i />}</span>
                <span className="txt"><b>{n.title}</b><span>{text || attach}</span></span>
                <small>{ago(n.at, now)}</small>
              </button>
            </li>
          );
        })}
        {list.length === 0 && <li className="nc-empty">Aucune notification</li>}
      </ul>
    </div>
  );

  // iOS 6 : une section par app, la plus récente en haut, avec son « × ».
  const groups = new Map<string, Item[]>();
  for (const it of list) groups.set(it[1].app, [...(groups.get(it[1].app) ?? []), it]);
  return (
    <div className="nc-body">
      {[...groups.entries()].map(([app, items]) => {
        const src = icon(app);
        return (
          <section key={app} className="nc-sec">
            <header>
              {src ? <img src={img(src)} alt="" /> : <i />}
              <b>{META[app]?.label ?? app}</b>
              {canEdit && <button aria-label="Effacer" onClick={() => clear(items)}><Glyph i={mdiClose} size={13} /></button>}
            </header>
            {items.map((it) => {
              const [id, n] = it;
              const { text, attach } = notifLines(n, os);
              return (
                <button key={id} className="nc-item" onClick={() => go(it)}>
                  <span className="top"><b>{n.title}</b><small>{ago(n.at, now)}</small></span>
                  {text && <span className="body">{text}</span>}
                  {attach && <span className="body att">{attach}</span>}
                </button>
              );
            })}
          </section>
        );
      })}
      {list.length === 0 && <p className="nc-empty">Aucune notification</p>}
    </div>
  );
}
