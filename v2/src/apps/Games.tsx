// Jeux et apps tierces de 2012 : écran de lancement fidèle, puis un écran de jeu / de contenu.
// Shazam reconnaît un morceau de la musique du téléphone ; ESPN affiche les scores (dont le
// match de l'UMA) ; ask.fm et Kik ont un contenu éditable.
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useList } from "../data/hooks";
import { img } from "../lib/img";
import { StatusBar } from "../phone/IOSChrome";
import { Avatar, Empty, Splash, useEditor } from "../kit/kit";
import "./games.css";

type GameCfg = { title: string; sub?: string; bg: string; logo: string; color?: string; menu: { title: string; lines: string[]; bg: string; color?: string } };
const GAMES: Record<string, GameCfg> = {
  candycrush: { title: "Candy Crush Saga", sub: "king.com", bg: "radial-gradient(circle at 50% 40%, #ff9de2, #c2185b 60%, #6a0f3f)", logo: "🍬",
    menu: { title: "Level 34", lines: ["★ ★ ☆", "Lives: ❤❤❤❤❤", "Moves: 25", "Target score: 40 000"], bg: "linear-gradient(#7fd3ff, #2a7de0)" } },
  templerun: { title: "TEMPLE RUN", sub: "Imangi Studios", bg: "radial-gradient(circle at 50% 30%, #f4c46b, #8a5a1c 60%, #2d1a07)", logo: "🗿", color: "#ffe9b3",
    menu: { title: "Best: 1 248 302", lines: ["Coins: 8 421", "Objectives: 34 / 54", "Guy Dangerous"], bg: "linear-gradient(#5a3a12, #1e1206)", color: "#ffe9b3" } },
  angrybirds: { title: "Angry Birds", sub: "Rovio", bg: "radial-gradient(circle at 50% 40%, #8fd3ff, #3a9ad9 55%, #1f5f8f)", logo: "🐦",
    menu: { title: "Poached Eggs · 2-11", lines: ["★ ★ ★", "Score: 54 210", "Highscore: 61 980"], bg: "linear-gradient(#a6e36a, #4c9a2a)" } },
  subwaysurf: { title: "SUBWAY SURFERS", sub: "Kiloo · SYBO", bg: "radial-gradient(circle at 50% 40%, #ffe066, #ff9900 55%, #c24e00)", logo: "🛹",
    menu: { title: "High score: 312 455", lines: ["Coins: 12 880", "Keys: 6", "Mission set 14"], bg: "linear-gradient(#55c1ff, #1270c9)" } },
  pou: { title: "Pou", sub: "Zakeh", bg: "radial-gradient(circle at 50% 45%, #f5deb3, #c49a6c 60%, #7a5530)", logo: "🟤", color: "#4a2f17",
    menu: { title: "Pou · Level 18", lines: ["Hunger ▮▮▮▮▯", "Health ▮▮▮▮▮", "Fun ▮▮▯▯▯", "Energy ▮▮▮▯▯"], bg: "linear-gradient(#fff3d6, #e7c89a)", color: "#4a2f17" } },
  wordswfriends: { title: "Words With Friends", sub: "Zynga", bg: "radial-gradient(circle at 50% 40%, #5fd0ff, #0a6fbf 60%, #053c66)", logo: "🔤",
    menu: { title: "Your Move (3)", lines: ["vs Elias — 212 / 198", "vs Glinda — 140 / 167", "vs Maman — 98 / 77"], bg: "linear-gradient(#e9f6ff, #b9dcf4)", color: "#053c66" } },
  vine: { title: "Vine", sub: "Twitter, Inc.", bg: "#00bf8f", logo: "🌿",
    menu: { title: "Popular Now", lines: ["▶ 6 s · @nilsss", "▶ 6 s · @dreww_orms", "▶ 6 s · @umamoose"], bg: "linear-gradient(#f2f2f2, #ddd)", color: "#00a078" } },
  polyvore: { title: "polyvore", sub: "Fashion & style", bg: "#fff", logo: "👗", color: "#333",
    menu: { title: "My Sets", lines: ["Game day ♡ UMA", "Fall 2012 — cozy", "Date night ✨"], bg: "linear-gradient(#fff, #f2f2f2)", color: "#333" } },
  kik: { title: "kik", sub: "Messenger", bg: "#82bc23", logo: "💬", menu: { title: "", lines: [], bg: "#fff" } },
  askfm: { title: "ask.fm", sub: "Ask me anything", bg: "linear-gradient(#ee4f6f, #c2244b)", logo: "❓", menu: { title: "", lines: [], bg: "#fff" } },
  espn: { title: "ESPN", sub: "ScoreCenter", bg: "linear-gradient(#d00, #8b0000)", logo: "🏈", menu: { title: "", lines: [], bg: "#fff" } },
  shazam: { title: "Shazam", sub: "", bg: "radial-gradient(circle at 50% 40%, #3a9cff, #0a5bd6 60%, #052f73)", logo: "𝑺", menu: { title: "", lines: [], bg: "#fff" } },
};

export default function GameApp({ pid }: { pid: string }) {
  const { app = "" } = useParams();
  const cfg = GAMES[app];
  const [stage, setStage] = useState<"splash" | "in">("splash");
  const nav = useNavigate();
  if (!cfg) return null;
  return (
    <div className="app gm-app">
      <StatusBar variant="translucent" />
      <button className="gm-x" onClick={() => nav(`/${pid}/home`)} aria-label="Quitter">✕</button>
      {stage === "splash" && app !== "shazam" ? (
        <Splash title={cfg.title} subtitle={cfg.sub} background={cfg.bg} color={cfg.color} logo={cfg.logo} onTap={() => setStage("in")} />
      ) : app === "shazam" ? <Shazam pid={pid} /> : app === "espn" ? <Espn pid={pid} /> : app === "askfm" ? <AskFm pid={pid} /> : app === "kik" ? <Kik pid={pid} /> : (
        <div className="gm-menu" style={{ background: cfg.menu.bg, color: cfg.menu.color ?? "#fff" }}>
          <div className="gm-logo">{cfg.logo}</div>
          <h2>{cfg.menu.title}</h2>
          {cfg.menu.lines.map((l) => <p key={l}>{l}</p>)}
          <button className="gm-play" onClick={() => setStage("splash")}>▶ PLAY</button>
        </div>
      )}
    </div>
  );
}

function Shazam({ pid }: { pid: string }) {
  const music = useList<{ title?: string; artist?: string; album?: string; cover?: string }>(`phones/${pid}/data/music`);
  const [state, setState] = useState<"idle" | "listening" | "found">("idle");
  const pick = useMemo(() => music[Math.floor(Math.random() * Math.max(1, music.length))]?.[1], [music, state === "found"]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (state !== "listening") return; const t = setTimeout(() => setState("found"), 3200); return () => clearTimeout(t); }, [state]);
  if (state === "found" && pick) return (
    <div className="sz-found">
      {pick.cover ? <img src={img(pick.cover)} alt="" /> : <div className="sz-noart">♫</div>}
      <b>{pick.title}</b><span>{pick.artist}</span><small>{pick.album}</small>
      <button onClick={() => setState("idle")}>Tag Again</button>
    </div>
  );
  return (
    <div className="sz" onClick={() => setState("listening")}>
      <div className={`sz-btn ${state}`}><span>𝑺</span></div>
      <p>{state === "listening" ? "Listening…" : "Touch to Shazam"}</p>
    </div>
  );
}

type Score = { home?: string; away?: string; hs?: string; as?: string; status?: string; league?: string; order?: number; deleted?: boolean };
const DEFAULT_SCORES: Score[] = [
  { league: "NCAA Football", home: "UMA Moose", away: "Vermont Beavers", hs: "—", as: "—", status: "Today · GAME DAY" },
  { league: "NFL", home: "New England", away: "Seattle", hs: "23", as: "24", status: "Final" },
  { league: "MLB · World Series", home: "San Francisco", away: "Detroit", hs: "8", as: "3", status: "Final · Game 1" },
  { league: "NBA", home: "Boston", away: "Miami", hs: "107", as: "120", status: "Final" },
];
function Espn({ pid }: { pid: string }) {
  const path = `phones/${pid}/data/espn`;
  const list = useList<Score>(path);
  const ed = useEditor(pid);
  const rows: [string, Score][] = list.length ? list : DEFAULT_SCORES.map((s, i) => [`d${i}`, s]);
  const fields = ["league", "home", "hs", "away", "as", "status"];
  return (
    <div className="es">
      <div className="es-bar"><b>ESPN</b> ScoreCenter{ed.canEdit && <button onClick={() => ed.add(path, { league: "", home: "", hs: "", away: "", as: "", status: "" }, { title: "Score", fields })}>＋</button>}</div>
      <div className="es-list">
        {rows.map(([id, s]) => (
          <div key={id} className="es-row" onContextMenu={(e) => { e.preventDefault(); if (!id.startsWith("d")) ed.itemLong(path, id, { fields, label: s.home })?.(); }}>
            <small>{s.league}</small>
            <div><span>{s.away}</span><b>{s.as}</b></div>
            <div><span>{s.home}</span><b>{s.hs}</b></div>
            <i>{s.status}</i>
          </div>
        ))}
      </div>
      {ed.ui}
    </div>
  );
}

type QA = { q?: string; a?: string; from?: string; likes?: number; order?: number; deleted?: boolean };
function AskFm({ pid }: { pid: string }) {
  const path = `phones/${pid}/data/askfm`;
  const list = useList<QA>(path);
  const ed = useEditor(pid);
  const fields = ["q", "a", "from", "likes"];
  return (
    <div className="af">
      <div className="af-bar">ask.fm{ed.canEdit && <button onClick={() => ed.add(path, { q: "", a: "", from: "Anonymous", likes: 0 }, { atStart: true, title: "Question", fields })}>＋</button>}</div>
      <div className="af-list">
        {list.map(([id, x]) => (
          <div key={id} className="af-qa" onContextMenu={(e) => { e.preventDefault(); ed.itemLong(path, id, { fields, label: x.q })?.(); }}>
            <b>{x.q}</b><p>{x.a}</p><small>{x.from} · ♥ {x.likes ?? 0}</small>
          </div>
        ))}
        {list.length === 0 && <Empty>No answers yet</Empty>}
      </div>
      {ed.ui}
    </div>
  );
}

type KikChat = { name?: string; last?: string; time?: string; order?: number; deleted?: boolean };
function Kik({ pid }: { pid: string }) {
  const path = `phones/${pid}/data/kik`;
  const list = useList<KikChat>(path);
  const ed = useEditor(pid);
  const fields = ["name", "last", "time"];
  return (
    <div className="kk">
      <div className="kk-bar">kik.{ed.canEdit && <button onClick={() => ed.add(path, { name: "", last: "", time: "" }, { atStart: true, title: "Discussion", fields })}>＋</button>}</div>
      <div className="kk-list">
        {list.map(([id, c]) => (
          <div key={id} className="kk-row" onContextMenu={(e) => { e.preventDefault(); ed.itemLong(path, id, { fields, label: c.name })?.(); }}>
            <Avatar name={c.name} size={40} color="#82bc23" /><span><b>{c.name}</b><small>{c.last}</small></span><i>{c.time}</i>
          </div>
        ))}
        {list.length === 0 && <Empty>No chats yet</Empty>}
      </div>
      {ed.ui}
    </div>
  );
}
