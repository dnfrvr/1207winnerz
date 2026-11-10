// Notifications du téléphone : bannière iOS 6 / bandeau défilant Android 4.1 quand une notif arrive
// pendant qu'on regarde le téléphone, liste sur l'écran verrouillé, pastilles des icônes.
// Une notif est « vue » quand le ou la propriétaire du téléphone l'ouvre (ou ouvre la conversation).
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useData, useValue, useWriter } from "../data/hooks";
import type { Notif } from "../data/notify";
import type { Patches } from "../data/store";
import { img } from "../lib/img";
import { ANDROID_ICON_DEFAULTS, type OS } from "./common";
import "./notifs.css";

type Profile = { appIcons?: Record<string, string> };

/** Notifs non vues, de la plus récente à la plus ancienne. */
export function useUnseenNotifs(pid: string) {
  const map = useValue<Record<string, Notif>>(`phones/${pid}/notifs`);
  return useMemo(() => Object.entries(map ?? {}).filter(([, n]) => n && !n.seen).sort((a, b) => b[1].at - a[1].at), [map]);
}

/** Nombre de notifs non vues par app (s'ajoute aux pastilles du profil). */
export function useNotifBadges(pid: string) {
  const list = useUnseenNotifs(pid);
  return useMemo(() => {
    const out: Record<string, number> = {};
    for (const [, n] of list) out[n.app] = (out[n.app] ?? 0) + 1;
    return out;
  }, [list]);
}

/** Notifs apparues après l'ouverture du téléphone (celles déjà là au chargement ne refont pas de bannière). */
export function useIncomingNotifs(pid: string | null) {
  const { store } = useData();
  const [queue, setQueue] = useState<[string, Notif][]>([]);
  useEffect(() => {
    if (!pid) return;
    let known: Set<string> | null = null;
    setQueue([]);
    return store.subscribe(`phones/${pid}/notifs`, (v) => {
      const map = (v ?? {}) as Record<string, Notif>;
      if (!known) { known = new Set(Object.keys(map)); return; }
      const fresh = Object.entries(map).filter(([id, n]) => !known!.has(id) && n && !n.seen);
      Object.keys(map).forEach((id) => known!.add(id));
      if (fresh.length) setQueue((q) => [...q, ...fresh]);
    });
  }, [store, pid]);
  const shift = () => setQueue((q) => q.slice(1));
  return { current: queue[0] ?? null, shift };
}

function useAppIcon(pid: string, os: OS) {
  const profile = useValue<Profile>(`phones/${pid}/profile`);
  const droid = useValue<Record<string, string>>("shared/androidIcons");
  return (app: string) => (os === "android" ? droid?.[app] ?? ANDROID_ICON_DEFAULTS[app] : profile?.appIcons?.[app]);
}

/** Écrit « vu » (seulement le ou la propriétaire du téléphone : le MDJ qui regarde ne consomme pas la notif). */
function useMarkSeen(pid: string) {
  const { session } = useData();
  const { write } = useWriter(pid);
  const owner = session.phone === pid;
  return (ids: string[], thread?: string) => {
    if (!owner || !ids.length) return;
    const p: Patches = {};
    for (const id of ids) p[`phones/${pid}/notifs/${id}/seen`] = true;
    if (thread) p[`phones/${pid}/inbox/${thread}/unread`] = null;
    write(p);
  };
}

/** Son « tri-tone » d'iOS / petit « ding » d'Android, synthétisé (aucun fichier). */
function ding(os: OS) {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const notes = os === "android" ? [1318, 1760] : [1568, 1318, 1046];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = f;
      const t = ctx.currentTime + i * 0.13;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.18, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.3);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch { /* audio indisponible */ }
}

const BANNER_MS = 5000;

/** Bannière en haut de l'écran (iOS 6) ou bandeau dans la barre d'état (Android 4.1). */
export function NotifBanner({ pid, os }: { pid: string; os: OS }) {
  const { current, shift } = useIncomingNotifs(pid);
  const nav = useNavigate();
  const loc = useLocation();
  const icon = useAppIcon(pid, os);
  const markSeen = useMarkSeen(pid);
  const locked = !loc.pathname.split("/").filter(Boolean)[1];
  const here = !!current && loc.pathname === `/${pid}/${current[1].link}`;

  useEffect(() => {
    if (!current) return;
    if (here) { shift(); return; } // déjà dans la conversation : le message apparaît directement
    ding(os);
    if (locked) { shift(); return; } // verrouillé : la notif s'ajoute à la liste de l'écran verrouillé
    const t = setTimeout(shift, BANNER_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.[0]]);

  if (!current || here || locked) return null;
  const [id, n] = current;
  const open = () => { markSeen([id], n.thread); shift(); nav(`/${pid}/${n.link}`); };
  const src = icon(n.app);
  if (os === "android") return (
    <button key={id} className="and-ticker" onClick={open}>
      {src && <img src={img(src)} alt="" />}
      <span className="txt"><b>{n.title} :</b> {n.body}</span>
    </button>
  );
  return (
    <button key={id} className="ios-banner" onClick={open}>
      {src && <img src={img(src)} alt="" />}
      <span className="txt"><b>{n.title}</b><span>{n.body}</span></span>
    </button>
  );
}

const ago = (at: number, now: number) => {
  const m = Math.floor((now - at) / 60_000);
  return m < 1 ? "maintenant" : m < 60 ? `il y a ${m} min` : `il y a ${Math.floor(m / 60)} h`;
};

/** Liste des notifs en attente sur l'écran verrouillé. */
export function LockNotifs({ pid, os }: { pid: string; os: OS }) {
  const list = useUnseenNotifs(pid);
  const nav = useNavigate();
  const icon = useAppIcon(pid, os);
  const markSeen = useMarkSeen(pid);
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);
  if (!list.length) return null;
  return (
    <ul className={os === "android" ? "and-lock-notifs" : "lock-notifs"}>
      {list.slice(0, 4).map(([id, n]) => {
        const src = icon(n.app);
        return (
          <li key={id}>
            <button onClick={() => { markSeen([id], n.thread); nav(`/${pid}/${n.link}`); }}>
              {src ? <img src={img(src)} alt="" /> : <i />}
              <span className="txt"><b>{n.title}</b><span>{n.body}</span></span>
              <small>{ago(n.at, now)}</small>
            </button>
          </li>
        );
      })}
      {list.length > 4 && <li className="more">+ {list.length - 4} autres</li>}
    </ul>
  );
}

/** Ouvrir la conversation d'une notif (sans passer par la notif) la marque vue aussi. */
export function SeenOnOpen({ pid }: { pid: string }) {
  const loc = useLocation();
  const list = useUnseenNotifs(pid);
  const markSeen = useMarkSeen(pid);
  const last = useRef("");
  useEffect(() => {
    const rest = loc.pathname.split("/").slice(2).join("/");
    const hits = list.filter(([, n]) => n.link === rest);
    const key = rest + hits.map(([id]) => id).join();
    if (!hits.length || last.current === key) return;
    last.current = key;
    markSeen(hits.map(([id]) => id), hits[0][1].thread);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.pathname, list]);
  return null;
}
