// Musique (iOS 6) / Play Musique (Android 4.1) : onglets, listes, écran « En cours » noir,
// lecture simulée (progression animée, morceau suivant automatique).
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useList, useValue } from "../data/hooks";
import { img } from "../lib/img";
import { AppFrame, BackButton, StatusBar, BarBack } from "../phone/IOSChrome";
import { useOS } from "../phone/common";
import { AddButton, Cell, Empty, Plain, PlainHeader, TabBar, useEditor, type Tab } from "../kit/kit";
import { Icon } from "../kit/icons";
import "./music.css";

type Track = { id?: number | string; title?: string; artist?: string; album?: string; duration?: string; cover?: string; order?: number; deleted?: boolean };
type Playlist = { name?: string; trackIds?: (number | string)[]; cover?: string | null; order?: number };

// ── lecture simulée (partagée par tous les écrans de l'app) ──────────────────
type Player = { key: string | null; playing: boolean; startedAt: number; offset: number };
let player: Player = { key: null, playing: false, startedAt: 0, offset: 0 };
const subs = new Set<() => void>();
const setPlayer = (p: Partial<Player>) => { player = { ...player, ...p }; subs.forEach((f) => f()); };
const usePlayer = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => player);
const elapsed = (p: Player) => p.offset + (p.playing ? (Date.now() - p.startedAt) / 1000 : 0);
const secs = (d?: string) => { const m = (d ?? "").match(/(\d+):(\d{2})/); return m ? Number(m[1]) * 60 + Number(m[2]) : 210; };
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const play = (key: string) => setPlayer({ key, playing: true, startedAt: Date.now(), offset: 0 });
const toggle = () => player.playing ? setPlayer({ playing: false, offset: elapsed(player) }) : setPlayer({ playing: true, startedAt: Date.now() });

const TABS: Tab[] = [
  { id: "playlists", label: "Playlists", icon: "list" },
  { id: "artists", label: "Artists", icon: "person" },
  { id: "songs", label: "Songs", icon: "note" },
  { id: "albums", label: "Albums", icon: "album" },
];

function useTracks(pid: string) {
  const list = useList<Track>(`phones/${pid}/data/music`);
  return list;
}

export default function MusicApp({ pid }: { pid: string }) {
  return (
    <Routes>
      <Route index element={<Library pid={pid} />} />
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
  const start = (key: string) => { play(key); nav("now"); };
  const songRow = ([id, t]: [string, Track]) => (
    <Cell key={id} title={t.title ?? "Sans titre"} subtitle={`${t.artist ?? ""}${t.album ? ` — ${t.album}` : ""}`}
      image={os === "android" ? (t.cover ?? null) : undefined} detail={os === "ios" ? undefined : t.duration}
      onClick={() => start(id)}
      onLong={ed.itemLong(`phones/${pid}/data/music`, id, { label: t.title, fields: ["title", "artist", "album", "duration", "cover"],
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
      right={tab === "songs" && ed.canEdit ? <AddButton onClick={() => ed.add(`phones/${pid}/data/music`, { title: "Nouveau morceau", artist: "", album: "", duration: "3:00", cover: "" }, { fields: ["title", "artist", "album", "duration", "cover"] })} /> : <NowButton />}
      bodyClass="mu-body">
      <TabBar tabs={TABS} active={tab} onChange={setTab} />
      <div className="mu-scroll">
        <Plain>
          {tab === "songs" && [...letters.entries()].map(([l, rows]) => (
            <div key={l}>{os === "ios" && <PlainHeader>{l}</PlainHeader>}{rows.map(songRow)}</div>
          ))}
          {tab === "artists" && byKey("artist").map(([a, rows]) => (
            <Cell key={a} title={a} subtitle={`${rows.length} song${rows.length > 1 ? "s" : ""}`} image={rows[0][1].cover ?? null} chevron onClick={() => start(rows[0][0])} />
          ))}
          {tab === "albums" && byKey("album").map(([a, rows]) => (
            <Cell key={a} title={a} subtitle={rows[0][1].artist} image={rows[0][1].cover ?? null} chevron onClick={() => start(rows[0][0])} />
          ))}
          {tab === "playlists" && playlists.map(([id, p]) => (
            <Cell key={id} title={p.name ?? "Playlist"} subtitle={`${p.trackIds?.length ?? 0} songs`} image={p.cover ?? null} chevron
              onClick={() => nav(`playlist/${id}`)} onLong={ed.itemLong(`phones/${pid}/data/playlists`, id, { fields: ["name", "cover"] })} />
          ))}
          {tracks.length === 0 && <Empty>No Songs</Empty>}
        </Plain>
      </div>
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
          <Cell key={k} icon={<span className="mu-num">{i + 1}</span>} title={t.title} subtitle={t.artist} detail={t.duration} onClick={() => { play(k); nav(`/${pid}/music/now`); }} />
        ))}
        {rows.length === 0 && <Empty>Playlist vide</Empty>}
      </Plain></div>
    </AppFrame>
  );
}

function NowPlaying({ pid }: { pid: string }) {
  const p = usePlayer();
  const os = useOS();
  const tracks = useTracks(pid);
  const nav = useNavigate();
  const idx = tracks.findIndex(([k]) => k === p.key);
  const t = tracks[idx]?.[1];
  const total = secs(t?.duration);
  const [, tick] = useState(0);
  useEffect(() => { const h = setInterval(() => tick((n) => n + 1), 500); return () => clearInterval(h); }, []);
  const pos = Math.min(elapsed(p), total);
  useEffect(() => { if (p.playing && pos >= total && tracks.length) play(tracks[(idx + 1) % tracks.length][0]); }, [pos, total, p.playing, idx, tracks]);
  const step = (d: number) => tracks.length && play(tracks[(idx + d + tracks.length) % tracks.length][0]);
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
