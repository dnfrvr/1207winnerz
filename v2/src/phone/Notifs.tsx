// Notifications du téléphone : bannière iOS 6 / bandeau défilant Android 4.1 quand une notif arrive
// pendant qu'on regarde le téléphone, liste sur l'écran verrouillé, pastilles des icônes.
// Une notif est « vue » quand le ou la propriétaire du téléphone l'ouvre (ou ouvre la conversation).
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useData, useValue, useWriter } from "../data/hooks";
import { notifLines, type Notif } from "../data/notify";
import type { Patches } from "../data/store";
import { img } from "../lib/img";
import { ANDROID_ICON_DEFAULTS, iosIcon, type OS } from "./common";
import { soundOn, type SoundPrefs } from "./sounds";
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

export function useAppIcon(pid: string, os: OS) {
  const profile = useValue<Profile>(`phones/${pid}/profile`);
  const droid = useValue<Record<string, string>>("shared/androidIcons");
  return (app: string) => (os === "android" ? droid?.[app] ?? ANDROID_ICON_DEFAULTS[app] : iosIcon(app, profile?.appIcons));
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

/** Ouvrir une notif : marquée vue, puis l'app à la bonne page. */
export function useOpenNotif(pid: string) {
  const nav = useNavigate();
  const markSeen = useMarkSeen(pid);
  return (id: string, n: Notif) => { markSeen([id], n.thread); nav(`/${pid}/${n.link}`); };
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
  const sounds = useValue<SoundPrefs>(`phones/${pid}/profile/sounds`);
  const locked = !loc.pathname.split("/").filter(Boolean)[1];
  const here = !!current && loc.pathname === `/${pid}/${current[1].link}`;

  useEffect(() => {
    if (!current) return;
    if (here) { shift(); return; } // déjà dans la conversation : le message apparaît directement
    if (soundOn(sounds, "sms")) ding(os); // Réglages › Sounds › Text Tone
    if (locked) { shift(); return; } // verrouillé : la notif s'ajoute à la liste de l'écran verrouillé
    const t = setTimeout(shift, BANNER_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.[0]]);

  if (!current || here || locked) return null;
  const [id, n] = current;
  const open = () => { markSeen([id], n.thread); shift(); nav(`/${pid}/${n.link}`); };
  const src = icon(n.app);
  const { oneLine } = notifLines(n, os);
  if (os === "android") return (
    <button key={id} className="and-ticker" onClick={open}>
      {src && <img src={img(src)} alt="" />}
      <span className="txt"><b>{n.title}:</b> {oneLine}</span>
    </button>
  );
  return (
    <button key={id} className="ios-banner" onClick={open}>
      {src && <img src={img(src)} alt="" />}
      <span className="txt"><b>{n.title}</b><span>{oneLine}</span></span>
    </button>
  );
}

const ago = (at: number, now: number) => {
  const m = Math.floor((now - at) / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  return new Date(at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
};

/** Écran verrouillé. iOS 6 : carte sombre au centre (bande grise en haut, icône à gauche, texte sur plusieurs lignes).
 *  Android 4.1 : lignes façon volet de notifications. */
export function LockNotifs({ pid, os }: { pid: string; os: OS }) {
  const list = useUnseenNotifs(pid);
  const icon = useAppIcon(pid, os);
  const open = useOpenNotif(pid);
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);
  if (!list.length) return os === "ios" ? <div className="lock-alert-wrap" /> : null;
  if (os === "android") return (
    <ul className="and-lock-notifs">
      {list.slice(0, 4).map(([id, n]) => {
        const src = icon(n.app);
        const { text, attach } = notifLines(n, os);
        return (
          <li key={id}>
            <button onClick={() => open(id, n)}>
              <span className="ico">{src ? <img src={img(src)} alt="" /> : <i />}</span>
              <span className="txt"><b>{n.title}</b><span>{text || attach}</span>{text && attach && <span className="att">{attach}</span>}</span>
              <small>{ago(n.at, now)}</small>
            </button>
          </li>
        );
      })}
      {list.length > 4 && <li className="more">+{list.length - 4}</li>}
    </ul>
  );
  return (
    <div className="lock-alert-wrap">
      <div className="lock-alert">
        <ul>
          {list.map(([id, n]) => {
            const src = icon(n.app);
            const { text, attach } = notifLines(n, os);
            return (
              <li key={id}>
                <button onClick={() => open(id, n)}>
                  <span className="ico">{src ? <img src={img(src)} alt="" /> : <i />}</span>
                  <span className="txt"><b>{n.title}</b>{text && <span>{text}</span>}{attach && <span className="att">{attach}</span>}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
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
