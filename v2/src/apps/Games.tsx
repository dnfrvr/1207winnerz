// Jeux et apps tierces de 2012 : écran de lancement fidèle, puis un écran de jeu / de contenu.
// Shazam reconnaît un morceau de la musique du téléphone. (ask.fm, ESPN, Polyvore : Web2012.tsx.)
import { Glyph, Brand } from "../kit/glyph";
import { mdiClose, mdiGamepadVariant, mdiMusicNote, mdiPlay } from "@mdi/js";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useList, useValue } from "../data/hooks";
import { img } from "../lib/img";
import { StatusBar } from "../phone/IOSChrome";
import { Splash, useEditor } from "../kit/kit";
import { Press } from "./social";
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
  shazam: { title: "Shazam", sub: "", bg: "radial-gradient(circle at 50% 40%, #3a9cff, #0a5bd6 60%, #052f73)", logo: "𝑺", menu: { title: "", lines: [], bg: "#fff" } },
};

export default function GameApp({ pid }: { pid: string }) {
  const { app = "" } = useParams();
  const [stage, setStage] = useState<"splash" | "in">("splash");
  const nav = useNavigate();
  const ed = useEditor(pid);
  const savePath = `phones/${pid}/data/games/${app}`;
  const save = useValue<{ title?: string; lines?: string }>(savePath);
  const icon = useValue<string>(`phones/${pid}/profile/appIcons/${app}`);
  const base = GAMES[app];
  if (!base) return null;
  const logo = icon ? <img className="gm-logo-img" src={img(icon)} alt="" /> : <Glyph i={mdiGamepadVariant} size={72} />;
  // Partie du joueur (niveau, scores…) : modifiable par appui long, une ligne par info.
  const cfg = { ...base, menu: { ...base.menu, title: save?.title ?? base.menu.title, lines: save?.lines != null ? save.lines.split("\n").filter(Boolean) : base.menu.lines } };
  const editSave = ed.canEdit ? () => {
    if (!save) ed.write({ [savePath]: { title: cfg.menu.title, lines: cfg.menu.lines.join("\n") } });
    ed.edit({ path: savePath, fields: ["title", "lines"], title: "Partie" });
  } : undefined;
  return (
    <div className="app gm-app">
      <StatusBar variant="translucent" />
      <button className="gm-x" onClick={() => nav(`/${pid}/home`)} aria-label="Quitter"><Glyph i={mdiClose} size={18} /></button>
      {stage === "splash" && app !== "shazam" ? (
        <Splash title={cfg.title} subtitle={cfg.sub} background={cfg.bg} color={cfg.color} logo={logo} onTap={() => setStage("in")} />
      ) : app === "shazam" ? <Shazam pid={pid} /> : (
        <Press className="gm-menu" style={{ background: cfg.menu.bg, color: cfg.menu.color ?? "#fff" }} onLong={editSave}>
          <div className="gm-logo">{logo}</div>
          <h2>{cfg.menu.title}</h2>
          {cfg.menu.lines.map((l, i) => <p key={i}>{l}</p>)}
          <button className="gm-play" onClick={() => setStage("splash")}><Glyph i={mdiPlay} size={18} /> PLAY</button>
        </Press>
      )}
      {ed.ui}
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
      {pick.cover ? <img src={img(pick.cover)} alt="" /> : <div className="sz-noart"><Glyph i={mdiMusicNote} size={64} /></div>}
      <b>{pick.title}</b><span>{pick.artist}</span><small>{pick.album}</small>
      <button onClick={() => setState("idle")}>Tag Again</button>
    </div>
  );
  return (
    <div className="sz" onClick={() => setState("listening")}>
      <div className={`sz-btn ${state}`}><span><Brand name="shazam" size={64} color="#fff" /></span></div>
      <p>{state === "listening" ? "Listening…" : "Touch to Shazam"}</p>
    </div>
  );
}

