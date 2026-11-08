// ask.fm (2012), ESPN ScoreCenter (2012) et Polyvore (2012) : vraies apps (plus des écrans de jeu),
// avec leur DA d'époque et l'édition universelle (appui long / clic droit ; bouton + pour créer).
//   ask.fm   → phones/{pid}/data/askfm/{id}       { q, a, from, time, likes }
//              phones/{pid}/data/askfmProfile      { name, user, bio, avatar }
//   ESPN     → phones/{pid}/data/espn/{id}        { league, away, as, home, hs, status }
//   Polyvore → phones/{pid}/data/polyvore/{id}    { title, src, author, likes, time }
import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { mdiHeart, mdiHeartOutline, mdiPlus } from "@mdi/js";
import { useList, useValue } from "../data/hooks";
import { img } from "../lib/img";
import { BarBack, StatusBar } from "../phone/IOSChrome";
import { useOS } from "../phone/common";
import { Avatar, Empty, useEditor, useSeeded } from "../kit/kit";
import { Glyph } from "../kit/glyph";
import { HoloBar, Press, compact, pickLocal, useChars } from "./social";
import "./social.css";
import "./web2012.css";

type Ed = ReturnType<typeof useEditor>;

/** Barre d'app : iOS 6 (dégradé + bouton retour) ou Holo (Android 4.1). */
function Bar({ pid, color, gradient, title, right, light = false }: { pid: string; color: string; gradient: string; title: ReactNode; right?: ReactNode; light?: boolean }) {
  const os = useOS();
  const nav = useNavigate();
  const home = () => nav(`/${pid}/home`);
  if (os === "android") return <HoloBar color={color} dark={!light} onUp={home} title={title} actions={right} />;
  return (
    <div className={`w12-bar ${light ? "light" : ""}`} style={{ background: gradient }}>
      <BarBack onClick={home} label="Accueil" tone={light ? "light" : "dark"} />
      <h1>{title}</h1>
      <span className="w12-side">{right}</span>
    </div>
  );
}

const AddBtn = ({ ed, onClick, label }: { ed: Ed; onClick: () => void; label: string }) =>
  ed.canEdit ? <button className="w12-add" aria-label={label} onClick={onClick}><Glyph i={mdiPlus} size={22} /></button> : null;

// ═══ ask.fm ══════════════════════════════════════════════════════════════════
type QA = { q?: string; a?: string; from?: string; time?: string; likes?: number; order?: number; deleted?: boolean };
type AskProfile = { name?: string; user?: string; bio?: string; avatar?: string };
const QA_FIELDS = ["q", "a", "from", "time", "likes"];

export function AskFmApp({ pid }: { pid: string }) {
  const os = useOS();
  const chars = useChars();
  const ed = useEditor(pid);
  const path = `phones/${pid}/data/askfm`;
  const profPath = `phones/${pid}/data/askfmProfile`;
  const list = useList<QA>(path);
  const prof = useValue<AskProfile>(profPath) ?? {};
  const me = chars[pid];
  const name = prof.name ?? me?.name ?? pid;
  const user = prof.user ?? me?.ig ?? pid;
  const [draft, setDraft] = useState("");
  const [anon, setAnon] = useState(true);
  const ask = () => {
    if (!draft.trim()) return;
    ed.add(path, { q: draft.trim(), a: "", from: anon ? "Anonymous" : "", time: "just now", likes: 0 }, { atStart: true, title: "Question", fields: QA_FIELDS });
    setDraft("");
  };
  return (
    <div className={`app af2 ${os}`}>
      <StatusBar />
      <Bar pid={pid} color="#e1325b" gradient="linear-gradient(#f05a7e, #c8234a)" title={<span className="af2-logo">ask<i>.fm</i></span>}
        right={<AddBtn ed={ed} label="Nouvelle réponse" onClick={() => ed.add(path, { q: "", a: "", from: "Anonymous", time: "just now", likes: 0 }, { atStart: true, title: "Question", fields: QA_FIELDS })} />} />
      <div className="w12-scroll af2-bg">
        <Press className="af2-prof" onLong={ed.canEdit ? () => ed.edit({ path: profPath, fields: ["name", "user", "bio", "avatar"], title: "Profil ask.fm" }) : undefined}>
          <Avatar src={pickLocal(prof.avatar, me?.avatar)} name={name} size={64} round={false} />
          <span><b>{name}</b><small>@{user}</small>{prof.bio && <em>{prof.bio}</em>}</span>
        </Press>
        <div className="af2-ask">
          <b>Ask @{user}</b>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="What, when, why… ask" maxLength={300} disabled={!ed.canEdit} />
          <div><label><input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} /> Ask anonymously</label><button onClick={ask} disabled={!ed.canEdit || !draft.trim()}>Ask</button></div>
        </div>
        <div className="af2-count">{list.length} answers</div>
        {list.map(([id, x]) => (
          <Press key={id} className="af2-qa" onLong={ed.itemLong(path, id, { fields: QA_FIELDS, label: x.q })}>
            <b>{x.q}</b>
            {x.a ? <p>{x.a}</p> : <p className="af2-unans">Pas encore de réponse</p>}
            <small>{x.time}{x.from && x.from !== "Anonymous" ? ` · ${x.from}` : ""}<span><Glyph i={mdiHeart} size={12} /> {x.likes ?? 0}</span></small>
          </Press>
        ))}
        {list.length === 0 && <Empty>No answers yet</Empty>}
      </div>
      {ed.ui}
    </div>
  );
}

// ═══ ESPN ScoreCenter ════════════════════════════════════════════════════════
type Score = { league?: string; away?: string; as?: string; home?: string; hs?: string; status?: string; order?: number; deleted?: boolean };
const SCORE_FIELDS = ["league", "away", "as", "home", "hs", "status"];
const DEFAULT_SCORES: Score[] = [
  { league: "NCAA Football", home: "UMA Moose", away: "Vermont Beavers", hs: "—", as: "—", status: "Today · GAME DAY" },
  { league: "NFL", home: "New England", away: "Seattle", hs: "23", as: "24", status: "Final" },
  { league: "MLB", home: "San Francisco", away: "Detroit", hs: "8", as: "3", status: "Final · World Series G1" },
  { league: "NBA", home: "Boston", away: "Miami", hs: "107", as: "120", status: "Final" },
];
const winner = (a?: string, b?: string) => Number(a) > Number(b);

export function EspnApp({ pid }: { pid: string }) {
  const os = useOS();
  const ed = useEditor(pid);
  const path = `phones/${pid}/data/espn`;
  const { rows, long } = useSeeded(path, DEFAULT_SCORES, ed);
  const leagues = [...new Set(rows.map(([, s]) => s.league ?? ""))];
  const [league, setLeague] = useState("");
  const shown = rows.filter(([, s]) => !league || s.league === league);
  return (
    <div className={`app es2 ${os}`}>
      <StatusBar />
      <Bar pid={pid} color="#cc0000" gradient="linear-gradient(#e11, #900)" title={<span className="es2-logo">ESPN <small>ScoreCenter</small></span>}
        right={<AddBtn ed={ed} label="Nouveau score" onClick={() => ed.add(path, { league: league || "NCAA Football", away: "", as: "", home: "", hs: "", status: "Final" }, { title: "Score", fields: SCORE_FIELDS })} />} />
      <div className="es2-tabs">
        <button className={!league ? "on" : ""} onClick={() => setLeague("")}>My Scores</button>
        {leagues.map((l) => <button key={l} className={league === l ? "on" : ""} onClick={() => setLeague(l)}>{l}</button>)}
      </div>
      <div className="w12-scroll es2-bg">
        {leagues.filter((l) => !league || l === league).map((l) => (
          <section key={l}>
            <h2>{l}</h2>
            {shown.filter(([, s]) => (s.league ?? "") === l).map(([id, s]) => (
              <Press key={id} className="es2-row" onLong={long(id, SCORE_FIELDS, `${s.away} @ ${s.home}`)}>
                <span className="es2-teams">
                  <span className={winner(s.as, s.hs) ? "w" : ""}>{s.away}<b>{s.as}</b></span>
                  <span className={winner(s.hs, s.as) ? "w" : ""}>{s.home}<b>{s.hs}</b></span>
                </span>
                <i>{s.status}</i>
              </Press>
            ))}
          </section>
        ))}
        {rows.length === 0 && <Empty>No scores</Empty>}
      </div>
      {ed.ui}
    </div>
  );
}

// ═══ Polyvore ════════════════════════════════════════════════════════════════
type PvSet = { title?: string; src?: string; author?: string; likes?: number; time?: string; order?: number; deleted?: boolean };
const SET_FIELDS = ["title", "src", "author", "likes", "time"];
const DEFAULT_SETS: PvSet[] = [
  { title: "Game day ♡ UMA", likes: 48, time: "2d" },
  { title: "Fall 2012 — cozy", likes: 112, time: "1w" },
  { title: "Date night ✨", likes: 31, time: "3w" },
];
// Collage factice (sans image) : pastilles de couleur façon « set » Polyvore.
const SWATCH = [["#c9a27e", "#2d2d2d", "#e7d8c9", "#7b1e2b"], ["#8a9a5b", "#f2e6d0", "#5c4033", "#d9a441"], ["#111", "#c0c0c0", "#b3122e", "#f5f5f5"]];

export function PolyvoreApp({ pid }: { pid: string }) {
  const os = useOS();
  const ed = useEditor(pid);
  const chars = useChars();
  const path = `phones/${pid}/data/polyvore`;
  const { rows, long } = useSeeded(path, DEFAULT_SETS, ed);
  const [tab, setTab] = useState<"mine" | "liked">("mine");
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const shown = tab === "liked" ? rows.filter(([id]) => liked[id]) : rows;
  return (
    <div className={`app pv ${os}`}>
      <StatusBar />
      <Bar pid={pid} color="#ffffff" gradient="linear-gradient(#fff, #e9e9e9)" light title={<span className="pv-logo">polyvore</span>}
        right={<AddBtn ed={ed} label="Nouveau set" onClick={() => ed.add(path, { title: "", src: "", author: "", likes: 0, time: "now" }, { atStart: true, title: "Set", fields: SET_FIELDS })} />} />
      <div className="pv-tabs">
        <button className={tab === "mine" ? "on" : ""} onClick={() => setTab("mine")}>My Sets</button>
        <button className={tab === "liked" ? "on" : ""} onClick={() => setTab("liked")}>Likes</button>
      </div>
      <div className="w12-scroll pv-grid">
        {shown.map(([id, s], i) => (
          <Press key={id} as="article" className="pv-set" onLong={long(id, SET_FIELDS, s.title)}>
            <div className="pv-img">
              {s.src ? <img src={img(s.src)} alt="" loading="lazy" /> : SWATCH[i % SWATCH.length].map((c, k) => <i key={k} style={{ background: c }} />)}
            </div>
            <b>{s.title || "Untitled set"}</b>
            <small>by {s.author || chars[pid]?.first || pid} · {s.time}</small>
            <button className={liked[id] ? "on" : ""} onClick={(e) => { e.stopPropagation(); setLiked((l) => ({ ...l, [id]: !l[id] })); }}>
              <Glyph i={liked[id] ? mdiHeart : mdiHeartOutline} size={14} /> {compact((s.likes ?? 0) + (liked[id] ? 1 : 0))}
            </button>
          </Press>
        ))}
        {shown.length === 0 && <Empty>{tab === "liked" ? "No likes yet" : "No sets yet"}</Empty>}
      </div>
      {ed.ui}
    </div>
  );
}
