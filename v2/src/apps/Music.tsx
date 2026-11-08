// Musique (iOS 6) / Play Musique (Android 4.1) : onglets, listes, écran « En cours » noir,
// lecture simulée (progression animée, morceau suivant automatique).
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useCanEdit, useList, useValue, useWriter } from "../data/hooks";
import type { Json } from "../data/store";
import { deezerMatch, deezerSearch, type DzTrack } from "../lib/deezer";
import { img } from "../lib/img";
import { AppFrame, BackButton, StatusBar, BarBack } from "../phone/IOSChrome";
import { useOS } from "../phone/common";
import { AddButton, Cell, Empty, Plain, PlainHeader, TabBar, useEditor, type Tab } from "../kit/kit";
import { Icon } from "../kit/icons";
import "./music.css";

type Track = { id?: number | string; title?: string; artist?: string; album?: string; duration?: string; cover?: string; preview?: string; order?: number; deleted?: boolean };
type Playlist = { name?: string; trackIds?: (number | string)[]; cover?: string | null; order?: number };
const TRACK_FIELDS = ["title", "artist", "album", "duration", "cover", "preview"];

// ── Deezer : extraits de 30 s et pochettes (voir lib/deezer) ─────────────────
const deezerPreview = (t: Track): Promise<string | null> =>
  t.preview ? Promise.resolve(t.preview) : deezerMatch(t.artist, t.title).then((m) => m?.preview || null);

/**
 * Pochettes manquantes : cherchées sur Deezer. Le propriétaire les enregistre en base (elles
 * apparaissent alors pour tout le monde) ; les autres joueurs les voient seulement en local.
 */
function useAutoCovers(pid: string, tracks: [string, Track][], canEdit: boolean, write: (p: Record<string, Json>) => void) {
  const [found, setFound] = useState<Record<string, string>>({});
  const tried = useRef(new Set<string>());
  useEffect(() => {
    for (const [id, t] of tracks) {
      if (t.cover || tried.current.has(id) || !t.title) continue;
      tried.current.add(id);
      deezerMatch(t.artist, t.title).then((m) => {
        if (!m?.cover) return;
        if (canEdit) write({ [`phones/${pid}/data/music/${id}/cover`]: m.cover, ...(t.album ? {} : { [`phones/${pid}/data/music/${id}/album`]: m.album }) });
        else setFound((f) => ({ ...f, [id]: m.cover }));
      });
    }
  }, [pid, tracks, canEdit, write]);
  return useMemo(() => tracks.map(([id, t]): [string, Track] => (t.cover || !found[id] ? [id, t] : [id, { ...t, cover: found[id] }])), [tracks, found]);
}

// ── lecteur (partagé par tous les écrans de l'app) : extrait réel, sinon lecture simulée ──
type Player = { key: string | null; playing: boolean; startedAt: number; offset: number; real: boolean };
let player: Player = { key: null, playing: false, startedAt: 0, offset: 0, real: false };
let queue: [string, Track][] = [];
const audio = typeof Audio !== "undefined" ? new Audio() : null;
const subs = new Set<() => void>();
const setPlayer = (p: Partial<Player>) => { player = { ...player, ...p }; subs.forEach((f) => f()); };
const usePlayer = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => player);
const elapsed = (p: Player) => p.real && audio ? audio.currentTime : p.offset + (p.playing ? (Date.now() - p.startedAt) / 1000 : 0);
const secs = (d?: string) => { const m = (d ?? "").match(/(\d+):(\d{2})/); return m ? Number(m[1]) * 60 + Number(m[2]) : 210; };
const totalOf = (p: Player, t?: Track) => (p.real && audio && audio.duration > 0 ? audio.duration : secs(t?.duration));
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
function play(key: string, list: [string, Track][]) {
  queue = list;
  audio?.pause();
  setPlayer({ key, playing: true, startedAt: Date.now(), offset: 0, real: false });
  const t = list.find(([k]) => k === key)?.[1];
  if (!t || !audio) return;
  deezerPreview(t).then((url) => {
    if (!url || player.key !== key || !player.playing) return;
    audio.src = url;
    audio.play().then(() => setPlayer({ real: true }), () => { /* lecture refusée : reste simulée */ });
  });
}
const step = (d: number) => {
  const i = queue.findIndex(([k]) => k === player.key);
  if (queue.length) play(queue[(i + d + queue.length) % queue.length][0], queue);
};
const toggle = () => {
  if (player.real && audio) { if (audio.paused) audio.play(); else audio.pause(); setPlayer({ playing: !audio.paused }); return; }
  setPlayer(player.playing ? { playing: false, offset: elapsed(player) } : { playing: true, startedAt: Date.now() });
};
if (audio) audio.onended = () => step(1);

const TABS: Tab[] = [
  { id: "playlists", label: "Playlists", icon: "list" },
  { id: "artists", label: "Artists", icon: "person" },
  { id: "songs", label: "Songs", icon: "note" },
  { id: "albums", label: "Albums", icon: "album" },
];

function useTracks(pid: string) {
  const list = useList<Track>(`phones/${pid}/data/music`);
  const { write } = useWriter(pid);
  return useAutoCovers(pid, list, useCanEdit(pid), write);
}

export default function MusicApp({ pid }: { pid: string }) {
  return (
    <Routes>
      <Route index element={<Library pid={pid} />} />
      <Route path="add" element={<AddFromDeezer pid={pid} />} />
      <Route path="now" element={<NowPlaying pid={pid} />} />
      <Route path="playlist/:id" element={<PlaylistView pid={pid} />} />
    </Routes>
  );
}

function NowButton() {
  const p = usePlayer();
  const nav = useNavigate();
  if (!p.key) return null;
  return <button className="barbtn now-btn" onClick={() => nav("now")}>Now<br />Playing ›</button>;
}

function Library({ pid }: { pid: string }) {
  const os = useOS();
  const [tab, setTab] = useState(() => sessionStorage.getItem("music-tab") ?? "songs");
  useEffect(() => { try { sessionStorage.setItem("music-tab", tab); } catch { /* rien */ } }, [tab]);
  const tracks = useTracks(pid);
  const playlists = useList<Playlist>(`phones/${pid}/data/playlists`);
  const nav = useNavigate();
  const ed = useEditor(pid);
  const start = (key: string, list: [string, Track][] = sortedSongs) => { play(key, list); nav("now"); };
  const songRow = ([id, t]: [string, Track]) => (
    <Cell key={id} title={t.title ?? "Sans titre"} subtitle={`${t.artist ?? ""}${t.album ? ` — ${t.album}` : ""}`}
      image={os === "android" ? (t.cover ?? null) : undefined} detail={os === "ios" ? undefined : t.duration}
      onClick={() => start(id)}
      onLong={ed.itemLong(`phones/${pid}/data/music`, id, { label: t.title, fields: TRACK_FIELDS,
        template: { title: "Nouveau morceau", artist: "", album: "", duration: "3:00", cover: "" } })} />
  );
  const byKey = (k: "artist" | "album") => {
    const g = new Map<string, [string, Track][]>();
    for (const e of tracks) { const v = e[1][k] || "Inconnu"; g.set(v, [...(g.get(v) ?? []), e]); }
    return [...g.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  };
  const sortedSongs = [...tracks].sort((a, b) => (a[1].title ?? "").localeCompare(b[1].title ?? ""));
  const letters = new Map<string, [string, Track][]>();
  for (const e of sortedSongs) { const l = (e[1].title ?? "#")[0].toUpperCase().replace(/[^A-Z]/, "#"); letters.set(l, [...(letters.get(l) ?? []), e]); }

  return (
    <AppFrame title={TABS.find((t) => t.id === tab)?.label ?? "Music"} left={<BackButton to={`/${pid}/home`} label="Accueil" />}
      right={tab === "songs" && ed.canEdit ? <AddButton onClick={() => nav("add")} /> : <NowButton />}
      bodyClass="mu-body">
      <TabBar tabs={TABS} active={tab} onChange={setTab} />
      <div className="mu-scroll">
        <Plain>
          {tab === "songs" && [...letters.entries()].map(([l, rows]) => (
            <div key={l}>{os === "ios" && <PlainHeader>{l}</PlainHeader>}{rows.map(songRow)}</div>
          ))}
          {tab === "artists" && byKey("artist").map(([a, rows]) => (
            <Cell key={a} title={a} subtitle={`${rows.length} song${rows.length > 1 ? "s" : ""}`} image={rows[0][1].cover ?? null} chevron onClick={() => start(rows[0][0], rows)} />
          ))}
          {tab === "albums" && byKey("album").map(([a, rows]) => (
            <Cell key={a} title={a} subtitle={rows[0][1].artist} image={rows[0][1].cover ?? null} chevron onClick={() => start(rows[0][0], rows)} />
          ))}
          {tab === "playlists" && playlists.map(([id, p]) => (
            <Cell key={id} title={p.name ?? "Playlist"} subtitle={`${p.trackIds?.length ?? 0} songs`} image={p.cover ?? null} chevron
              onClick={() => nav(`playlist/${id}`)} onLong={ed.itemLong(`phones/${pid}/data/playlists`, id, { fields: ["name", "cover"] })} />
          ))}
          {tracks.length === 0 && <Empty>No Songs</Empty>}
        </Plain>
      </div>
      <MiniPlayer pid={pid} />
      {ed.ui}
    </AppFrame>
  );
}

/** Ajout d'un morceau : recherche dans le catalogue Deezer (titre, artiste, album, durée, pochette). */
function AddFromDeezer({ pid }: { pid: string }) {
  const ed = useEditor(pid);
  const [q, setQ] = useState("");
  const [res, setRes] = useState<DzTrack[] | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!q.trim()) { setRes(null); return; }
    const h = setTimeout(() => { setBusy(true); deezerSearch(q, 15).then((r) => { setRes(r); setBusy(false); }); }, 350);
    return () => clearTimeout(h);
  }, [q]);
  const path = `phones/${pid}/data/music`;
  // La preview n'est pas enregistrée (URL signée qui expire) : elle est recherchée à la lecture.
  const pick = (d: DzTrack) => ed.add(path, { title: d.title, artist: d.artist, album: d.album, duration: d.duration, cover: d.cover }, { title: "Nouveau morceau", fields: TRACK_FIELDS });
  return (
    <AppFrame title="Ajouter" left={<BackButton to={`/${pid}/music`} label="Songs" />} bodyClass="mu-body">
      <div className="mu-search"><Icon name="search" size={14} /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Titre, artiste… (catalogue Deezer)" /></div>
      <div className="mu-scroll"><Plain>
        {res?.map((d, i) => (
          <Cell key={i} title={d.title} subtitle={`${d.artist} — ${d.album}`} image={d.cover || null} detail={d.duration} onClick={() => pick(d)} />
        ))}
        {busy && !res?.length && <Empty>Recherche…</Empty>}
        {res && !res.length && !busy && <Empty>Aucun résultat</Empty>}
        {!q.trim() && <Empty>Cherche une chanson : elle sera ajoutée avec sa pochette.</Empty>}
        <Cell title="Saisie manuelle…" onClick={() => ed.add(path, { title: q || "Nouveau morceau", artist: "", album: "", duration: "3:00", cover: "" }, { fields: TRACK_FIELDS })} />
      </Plain></div>
      {ed.ui}
    </AppFrame>
  );
}

function PlaylistView({ pid }: { pid: string }) {
  const { id = "" } = useParams();
  const pl = useValue<Playlist>(`phones/${pid}/data/playlists/${id}`);
  const tracks = useTracks(pid);
  const nav = useNavigate();
  const byId = useMemo(() => new Map(tracks.map(([k, t]) => [String(t.id ?? k), k] as const)), [tracks]);
  const rows = (pl?.trackIds ?? []).map((tid) => byId.get(String(tid))).filter((k): k is string => !!k).map((k) => tracks.find(([key]) => key === k)!);
  return (
    <AppFrame title={pl?.name ?? "Playlist"} left={<BackButton to={`/${pid}/music`} label="Playlists" />} bodyClass="mu-body">
      <div className="mu-scroll"><Plain>
        {rows.map(([k, t], i) => (
          <Cell key={k} icon={<span className="mu-num">{i + 1}</span>} title={t.title} subtitle={t.artist} detail={t.duration} onClick={() => { play(k, rows); nav(`/${pid}/music/now`); }} />
        ))}
        {rows.length === 0 && <Empty>Playlist vide</Empty>}
      </Plain></div>
    </AppFrame>
  );
}

/** Position de lecture rafraîchie (et morceau suivant automatique en lecture simulée). */
function useProgress(pid: string) {
  const p = usePlayer();
  const tracks = useTracks(pid);
  const t = tracks.find(([k]) => k === p.key)?.[1];
  const [, tick] = useState(0);
  useEffect(() => { const h = setInterval(() => tick((n) => n + 1), 500); return () => clearInterval(h); }, []);
  const total = totalOf(p, t);
  const pos = Math.min(elapsed(p), total);
  useEffect(() => { if (!p.real && p.playing && pos >= total) step(1); }, [pos, total, p.playing, p.real]);
  return { p, t, pos, total };
}

/** Mini-lecteur sous la liste des chansons (comme la barre « en cours » de Play Musique). */
function MiniPlayer({ pid }: { pid: string }) {
  const { p, t, pos, total } = useProgress(pid);
  const nav = useNavigate();
  if (!p.key || !t) return null;
  return (
    <div className="mu-mini" onClick={() => nav("now")}>
      <i className="mu-mini-bar" style={{ width: `${(pos / total) * 100}%` }} />
      {t.cover ? <img src={img(t.cover)} alt="" /> : <span className="mu-mini-noart"><Icon name="note" size={18} /></span>}
      <span className="mu-mini-txt"><b>{t.title}</b><small>{t.artist}{p.real ? "" : " · aperçu indisponible"}</small></span>
      <button onClick={(e) => { e.stopPropagation(); toggle(); }} aria-label={p.playing ? "Pause" : "Lecture"}><Icon name={p.playing ? "pause" : "play"} size={20} /></button>
      <button onClick={(e) => { e.stopPropagation(); step(1); }} aria-label="Suivant"><Icon name="next" size={20} /></button>
    </div>
  );
}

function NowPlaying({ pid }: { pid: string }) {
  const os = useOS();
  const nav = useNavigate();
  const { p, t, pos, total } = useProgress(pid);
  return (
    <div className={`app mu-now ${os}`}>
      <StatusBar variant={os === "ios" ? "opaque" : "opaque"} />
      <div className="mu-now-bar">
        <BarBack onClick={() => nav(`/${pid}/music`)} label="Music" />
        <div className="mu-meta"><span>{t?.artist}</span><b>{t?.title ?? "—"}</b><span>{t?.album}</span></div>
        <span className="mu-list"><Icon name="list" size={20} /></span>
      </div>
      <div className="mu-art">
        {t?.cover ? <img src={img(t.cover)} alt="" /> : <div className="mu-noart"><Icon name="note" size={90} /></div>}
        <div className="mu-scrub"><span>{fmt(pos)}</span><div className="mu-track"><i style={{ width: `${(pos / total) * 100}%` }} /></div><span>-{fmt(total - pos)}</span></div>
        {os === "ios" && <div className="mu-reflect" />}
      </div>
      <div className="mu-controls">
        <button onClick={() => step(-1)} aria-label="Précédent"><Icon name="prev" size={30} /></button>
        <button onClick={toggle} aria-label={p.playing ? "Pause" : "Lecture"}><Icon name={p.playing ? "pause" : "play"} size={36} /></button>
        <button onClick={() => step(1)} aria-label="Suivant"><Icon name="next" size={30} /></button>
      </div>
      {os === "ios" && <div className="mu-volume"><div className="mu-vtrack"><i /></div></div>}
    </div>
  );
}
