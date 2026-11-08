// Apps propres à certains persos : Grindr, Nike+ Running, SoundCloud, iNaturalist, Kindle,
// Wikipédia, Reddit (Alien Blue), VPN — chacune dans son look de 2012.
import { useState } from "react";
import { Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useList, useValue } from "../data/hooks";
import { img } from "../lib/img";
import { StatusBar, BarBack } from "../phone/IOSChrome";
import { useOS } from "../phone/common";
import { Avatar, Empty, Switch, useEditor } from "../kit/kit";
import { Icon } from "../kit/icons";
import "./personal.css";

const Bar = ({ cls, title, onBack, right, backLabel = "Accueil" }: { cls: string; title: React.ReactNode; onBack: () => void; right?: React.ReactNode; backLabel?: string }) => (
  <div className={`pb-bar ${cls}`}>
    <BarBack onClick={onBack} label={backLabel} />
    <h1>{title}</h1>
    <span className="pb-r">{right}</span>
  </div>
);

// ── Grindr ───────────────────────────────────────────────────────────────────
type GUser = { name?: string; age?: string; distance?: string; online?: boolean; photo?: string; order?: number; deleted?: boolean };
type GDm = GUser & { thread?: Record<string, { from?: string; text?: string; time?: string; order?: number }> };
type GProfile = { name?: string; headline?: string; about?: string; age?: string; photo?: string; photos?: string[]; tags?: string };

export function GrindrApp({ pid }: { pid: string }) {
  return (
    <Routes>
      <Route index element={<GrindrHome pid={pid} />} />
      <Route path="chat/:id" element={<GrindrChat pid={pid} />} />
    </Routes>
  );
}

function GrindrHome({ pid }: { pid: string }) {
  const nav = useNavigate();
  const [tab, setTab] = useState("grid");
  const base = `phones/${pid}/data`;
  const users = useList<GUser>(`${base}/grindr`);
  const dms = useList<GDm>(`${base}/grindrDms`);
  const me = useValue<GProfile>(`${base}/grindrProfile`) ?? {};
  const ed = useEditor(pid);
  const ufields = ["name", "age", "distance", "online", "photo"];
  return (
    <div className="app gr">
      <StatusBar />
      <Bar cls="gr-bar" title={<span className="gr-logo">◉ grindr</span>} onBack={() => nav(`/${pid}/home`)}
        right={ed.canEdit && tab === "grid" ? <button onClick={() => ed.add(`${base}/grindr`, { name: "", age: "", distance: "0.5 mi", online: true, photo: "" }, { title: "Profil", fields: ufields })}>＋</button> : undefined} />
      <div className="gr-scroll">
        {tab === "grid" && (
          <div className="gr-grid">
            {users.map(([id, u]) => (
              <button key={id} className="gr-cell" onContextMenu={(e) => { e.preventDefault(); ed.itemLong(`${base}/grindr`, id, { fields: ufields, label: u.name })?.(); }}>
                {u.photo ? <img src={img(u.photo)} alt="" loading="lazy" /> : <span className="gr-mask">◉</span>}
                <span className="gr-name">{u.online && <i />}{u.name}</span>
              </button>
            ))}
          </div>
        )}
        {tab === "chats" && dms.map(([id, d]) => {
          const t = Object.values(d.thread ?? {}).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          return (
            <button key={id} className="gr-dm" onClick={() => nav(`chat/${id}`)} onContextMenu={(e) => { e.preventDefault(); ed.itemLong(`${base}/grindrDms`, id, { fields: ufields, label: d.name })?.(); }}>
              <Avatar src={d.photo} name={d.name} size={46} round={false} color="#333" />
              <span className="gr-dm-t"><b>{d.online && <i />}{d.name}</b><span>{t[t.length - 1]?.text}</span></span>
              <small>{d.distance}</small>
            </button>
          );
        })}
        {tab === "me" && (
          <div className="gr-me" onClick={ed.canEdit ? () => ed.edit({ path: `${base}/grindrProfile`, fields: ["name", "age", "headline", "about", "photo", "tags"], title: "Mon profil" }) : undefined}>
            <div className="gr-me-photo">{me.photo && <img src={img(me.photo)} alt="" />}</div>
            <b>{me.name}</b><i>{me.headline}</i><p>{me.about}</p>
            <div className="gr-photos">{(me.photos ?? []).map((p, i) => <img key={i} src={img(p)} alt="" />)}</div>
          </div>
        )}
        {tab === "grid" && users.length === 0 && <Empty>Personne à proximité</Empty>}
      </div>
      <div className="gr-tabs">
        {[["grid", "grid", "Grid"], ["chats", "chat", "Chats"], ["me", "person", "Profile"]].map(([id, ic, l]) => (
          <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}><Icon name={ic as "grid"} size={22} /><span>{l}</span></button>
        ))}
      </div>
      {ed.ui}
    </div>
  );
}

function GrindrChat({ pid }: { pid: string }) {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const path = `phones/${pid}/data/grindrDms/${id}`;
  const dm = useValue<GDm>(path) ?? {};
  const thread = useList<{ from?: string; text?: string; time?: string }>(`${path}/thread`);
  const ed = useEditor(pid);
  const [text, setText] = useState("");
  const [asThem, setAsThem] = useState(false);
  const send = () => { if (!text.trim()) return; ed.add(`${path}/thread`, { from: asThem ? "them" : "me", text: text.trim(), time: "" }, { title: "Message", fields: ["from", "text", "time"] }); setText(""); };
  return (
    <div className="app gr">
      <StatusBar />
      <Bar cls="gr-bar" title={dm.name} onBack={() => nav(`/${pid}/grindr`)} right={<small>{dm.distance}</small>} />
      <div className="gr-scroll gr-thread">
        {thread.map(([mid, m]) => (
          <div key={mid} className={`gr-msg ${m.from === "me" ? "me" : "them"}`} onContextMenu={(e) => { e.preventDefault(); ed.itemLong(`${path}/thread`, mid, { fields: ["from", "text", "time"], label: m.text })?.(); }}>
            <span>{m.text}</span><i>{m.time}</i>
          </div>
        ))}
      </div>
      {ed.canEdit && (
        <div className="gr-compose">
          <button onClick={() => setAsThem((v) => !v)}>{asThem ? dm.name : "Moi"} ⇄</button>
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Message" />
          <button className="send" onClick={send}>Send</button>
        </div>
      )}
      {ed.ui}
    </div>
  );
}

// ── Nike+ Running ────────────────────────────────────────────────────────────
type Run = { date?: string; distance?: string; time?: string; pace?: string; cal?: number; route?: string; note?: string; order?: number; deleted?: boolean };
type Nike = { totalKm?: number; goalKm?: number; streak?: number; level?: string };

export function NikeApp({ pid }: { pid: string }) {
  const nav = useNavigate();
  const base = `phones/${pid}/data/nikeplus`;
  const n = useValue<Nike>(base) ?? {};
  const runs = useList<Run>(`${base}/runs`);
  const weekly = useList<{ d?: string; km?: number }>(`${base}/weekly`);
  const ed = useEditor(pid);
  const [running, setRunning] = useState(false);
  const max = Math.max(1, ...weekly.map(([, w]) => w.km ?? 0));
  const rf = ["date", "distance", "time", "pace", "cal", "route", "note"];
  return (
    <div className="app nk">
      <StatusBar />
      <Bar cls="nk-bar" title={<span className="nk-logo">NIKE<b>+</b> RUNNING</span>} onBack={() => nav(`/${pid}/home`)}
        right={ed.canEdit ? <button onClick={() => ed.edit({ path: base, fields: ["totalKm", "goalKm", "streak", "level"], title: "Totaux" })}>✎</button> : undefined} />
      <div className="nk-scroll">
        <div className="nk-total" onClick={() => setRunning((r) => !r)}>
          <b>{n.totalKm ?? 0}</b><span>TOTAL KM</span>
          <div className="nk-goal"><i style={{ width: `${Math.min(100, ((n.totalKm ?? 0) / (n.goalKm || 1)) * 100)}%` }} /></div>
          <small>{n.level} LEVEL · {n.streak} DAY STREAK</small>
        </div>
        <button className={`nk-start ${running ? "on" : ""}`} onClick={() => setRunning((r) => !r)}>{running ? "■ END RUN" : "▶ START RUN"}</button>
        <div className="nk-week">{weekly.map(([id, w]) => <span key={id}><i style={{ height: `${((w.km ?? 0) / max) * 100}%` }} /><b>{w.d}</b></span>)}</div>
        <div className="nk-h">ACTIVITY</div>
        {runs.map(([id, r]) => (
          <button key={id} className="nk-run" onContextMenu={(e) => { e.preventDefault(); ed.itemLong(`${base}/runs`, id, { fields: rf, label: r.date, template: { date: "", distance: "5.00 km", time: "25:00", pace: "5:00 /km" } })?.(); }}>
            <span className="nk-km">{r.distance}</span>
            <span className="nk-meta"><b>{r.date} · {r.route}</b><span>{r.time} · {r.pace} · {r.cal} cal</span>{r.note && <i>{r.note}</i>}</span>
          </button>
        ))}
        {runs.length === 0 && <Empty>No runs yet</Empty>}
      </div>
      {ed.ui}
    </div>
  );
}

// ── SoundCloud ───────────────────────────────────────────────────────────────
type Track = { title?: string; desc?: string; dur?: string; likes?: number; plays?: number; reposts?: number; posted?: string; tag?: string; wave?: number[];
  comments?: Record<string, { at?: string; t?: string; u?: string; order?: number }>; order?: number; deleted?: boolean };
type SC = { displayName?: string; handle?: string; followers?: number; following?: number };

export function SoundCloudApp({ pid }: { pid: string }) {
  const nav = useNavigate();
  const base = `phones/${pid}/data/soundcloud`;
  const me = useValue<SC>(base) ?? {};
  const tracks = useList<Track>(`${base}/tracks`);
  const ed = useEditor(pid);
  const [open, setOpen] = useState<string | null>(null);
  const tf = ["title", "desc", "dur", "posted", "tag", "plays", "likes", "reposts"];
  return (
    <div className="app sd">
      <StatusBar />
      <Bar cls="sd-bar" title={<span className="sd-logo">☁ SoundCloud</span>} onBack={() => nav(`/${pid}/home`)}
        right={ed.canEdit ? <button onClick={() => ed.add(`${base}/tracks`, { title: "Nouveau son", desc: "", dur: "3:00", posted: "6 oct", tag: "", plays: 0, likes: 0, reposts: 0 }, { atStart: true, title: "Son", fields: tf })}>＋</button> : undefined} />
      <div className="sd-scroll">
        <div className="sd-me" onClick={ed.canEdit ? () => ed.edit({ path: base, fields: ["displayName", "handle", "followers", "following"], title: "Profil" }) : undefined}>
          <b>{me.displayName}</b><span>{me.followers} followers · {me.following} following</span>
        </div>
        {tracks.map(([id, t]) => {
          const wave = t.wave?.length ? t.wave : Array.from({ length: 48 }, (_, i) => 6 + ((i * 37 + id.length * 13) % 22));
          const comments = Object.entries(t.comments ?? {}).sort((a, b) => (a[1].order ?? 0) - (b[1].order ?? 0));
          return (
            <div key={id} className="sd-track" onContextMenu={(e) => { e.preventDefault(); ed.itemLong(`${base}/tracks`, id, { fields: tf, label: t.title })?.(); }}>
              <div className="sd-head"><button className="sd-play" onClick={() => setOpen(open === id ? null : id)}>{open === id ? "❚❚" : "▶"}</button>
                <div><span>{me.displayName}</span><b>{t.title}</b></div><small>{t.posted}</small></div>
              <div className={`sd-wave ${open === id ? "playing" : ""}`}>{wave.map((h, i) => <i key={i} style={{ height: `${Math.min(100, h * 3)}%` }} />)}</div>
              <div className="sd-stats">▶ {t.plays} · ♥ {t.likes} · ⟲ {t.reposts} · {t.dur}{t.tag && <em> {t.tag}</em>}</div>
              {open === id && (
                <div className="sd-comments">
                  {t.desc && <p className="sd-desc">{t.desc}</p>}
                  {comments.map(([cid, c]) => <p key={cid}><b>{c.u}</b> at {c.at}: {c.t}</p>)}
                  {ed.canEdit && <button onClick={() => ed.add(`${base}/tracks/${id}/comments`, { u: "", at: "0:00", t: "" }, { title: "Commentaire", fields: ["u", "at", "t"] })}>+ commentaire</button>}
                </div>
              )}
            </div>
          );
        })}
        {tracks.length === 0 && <Empty>No sounds yet</Empty>}
      </div>
      {ed.ui}
    </div>
  );
}

// ── iNaturalist ──────────────────────────────────────────────────────────────
type Obs = { common?: string; latin?: string; date?: string; emoji?: string; grade?: string; ids?: number; note?: string; place?: string; photo?: string; order?: number; deleted?: boolean };
type INat = { observer?: string; observations?: number; species?: number; identifications?: number; rank?: string };

export function INaturalistApp({ pid }: { pid: string }) {
  const nav = useNavigate();
  const base = `phones/${pid}/data/inaturalist`;
  const me = useValue<INat>(base) ?? {};
  const list = useList<Obs>(`${base}/list`);
  const ed = useEditor(pid);
  const [open, setOpen] = useState<string | null>(null);
  const of = ["common", "latin", "date", "place", "emoji", "grade", "ids", "note", "photo"];
  return (
    <div className="app inat">
      <StatusBar />
      <Bar cls="inat-bar" title="iNaturalist" onBack={() => nav(`/${pid}/home`)}
        right={ed.canEdit ? <button onClick={() => ed.add(`${base}/list`, { common: "", latin: "", date: "6 oct 2012", place: "", emoji: "🪱", grade: "Needs ID", ids: 0, note: "" }, { atStart: true, title: "Observation", fields: of })}>＋</button> : undefined} />
      <div className="inat-scroll">
        <div className="inat-me" onClick={ed.canEdit ? () => ed.edit({ path: base, fields: ["observer", "observations", "species", "identifications", "rank"], title: "Profil" }) : undefined}>
          <b>{me.observer}</b><span>{me.rank}</span>
          <div className="inat-stats"><span><b>{me.observations}</b>observations</span><span><b>{me.species}</b>species</span><span><b>{me.identifications}</b>identifications</span></div>
        </div>
        {list.map(([id, o]) => (
          <button key={id} className="inat-row" onClick={() => setOpen(open === id ? null : id)} onContextMenu={(e) => { e.preventDefault(); ed.itemLong(`${base}/list`, id, { fields: of, label: o.common })?.(); }}>
            <span className="inat-thumb">{o.photo ? <img src={img(o.photo)} alt="" /> : o.emoji}</span>
            <span className="inat-t"><b>{o.common}</b><i>{o.latin}</i><span>{o.place} · {o.date}</span>
              {open === id && o.note && <p>{o.note}</p>}</span>
            <span className={`inat-grade ${(o.grade ?? "").toLowerCase().includes("research") ? "rg" : ""}`}>{o.grade}</span>
          </button>
        ))}
        {list.length === 0 && <Empty>No observations</Empty>}
      </div>
      {ed.ui}
    </div>
  );
}

// ── Kindle ───────────────────────────────────────────────────────────────────
type Book = { title?: string; author?: string; pct?: number; cover?: string; genre?: string; hue?: number; order?: number; deleted?: boolean };

export function KindleApp({ pid }: { pid: string }) {
  const nav = useNavigate();
  const path = `phones/${pid}/data/kindle`;
  const books = useList<Book>(path);
  const ed = useEditor(pid);
  const [reading, setReading] = useState<Book | null>(null);
  const bf = ["title", "author", "pct", "cover", "genre"];
  if (reading) return (
    <div className="app kd-read">
      <StatusBar />
      <div className="kd-rbar"><button onClick={() => setReading(null)}>Library</button><b>{reading.title}</b><span /></div>
      <div className="kd-page"><h2>Chapter {Math.max(1, Math.round((reading.pct ?? 0) / 8))}</h2>
        <p>{reading.title} — {reading.author}</p>
        <p className="kd-lorem">The pages turned softly under the lamp. Somewhere outside, rain kept tapping at the window, patient as a clock…</p></div>
      <div className="kd-prog"><div><i style={{ width: `${reading.pct ?? 0}%` }} /></div><span>{reading.pct ?? 0}%</span></div>
    </div>
  );
  return (
    <div className="app kd">
      <StatusBar />
      <Bar cls="kd-bar" title={<span className="kd-logo">kindle</span>} onBack={() => nav(`/${pid}/home`)}
        right={ed.canEdit ? <button onClick={() => ed.add(path, { title: "", author: "", pct: 0, cover: "" }, { title: "Livre", fields: bf })}>＋</button> : undefined} />
      <div className="kd-tabs"><span className="on">Cloud</span><span>Device</span></div>
      <div className="kd-scroll"><div className="kd-grid">
        {books.map(([id, b]) => (
          <button key={id} className="kd-book" onClick={() => setReading(b)} onContextMenu={(e) => { e.preventDefault(); ed.itemLong(path, id, { fields: bf, label: b.title })?.(); }}>
            {b.cover ? <img src={img(b.cover)} alt="" loading="lazy" /> : <span className="kd-plain" style={{ background: `hsl(${b.hue ?? 210} 40% 35%)` }}><b>{b.title}</b><i>{b.author}</i></span>}
            <span className="kd-pct"><i style={{ width: `${b.pct ?? 0}%` }} /></span>
          </button>
        ))}
      </div>{books.length === 0 && <Empty>Your library is empty</Empty>}</div>
      {ed.ui}
    </div>
  );
}

// ── Wikipédia ────────────────────────────────────────────────────────────────
type Article = { title?: string; extract?: string; date?: string; order?: number; deleted?: boolean };

export function WikipediaApp({ pid }: { pid: string }) {
  const nav = useNavigate();
  const path = `phones/${pid}/data/wikipedia`;
  const list = useList<Article>(path);
  const ed = useEditor(pid);
  const [q, setQ] = useState("");
  const [art, setArt] = useState<Article | null>(null);
  const af = ["title", "extract", "date"];
  return (
    <div className="app wk">
      <StatusBar />
      <Bar cls="wk-bar" title={<span className="wk-logo">W<small>IKIPEDIA</small></span>} onBack={() => art ? setArt(null) : nav(`/${pid}/home`)}
        right={ed.canEdit ? <button onClick={() => ed.add(path, { title: "", extract: "", date: "6 oct 2012" }, { atStart: true, title: "Article", fields: af })}>＋</button> : undefined} />
      {art ? (
        <div className="wk-scroll wk-article"><h1>{art.title}</h1><div className="wk-from">From Wikipedia, the free encyclopedia</div><p>{art.extract}</p></div>
      ) : (
        <>
          <div className="wk-search"><Icon name="search" size={14} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Wikipedia" /></div>
          <div className="wk-scroll">
            <div className="wk-h">History</div>
            {list.filter(([, a]) => !q || (a.title ?? "").toLowerCase().includes(q.toLowerCase())).map(([id, a]) => (
              <button key={id} className="wk-row" onClick={() => setArt(a)} onContextMenu={(e) => { e.preventDefault(); ed.itemLong(path, id, { fields: af, label: a.title })?.(); }}>
                <b>{a.title}</b><span>{a.extract}</span><small>{a.date}</small>
              </button>
            ))}
            {list.length === 0 && <Empty>No history</Empty>}
          </div>
        </>
      )}
      {ed.ui}
    </div>
  );
}

// ── Reddit (Alien Blue) ──────────────────────────────────────────────────────
type RPost = { sub?: string; age?: string; pts?: string; comm?: number; saved?: boolean; title?: string; domain?: string; order?: number; deleted?: boolean };

export function RedditApp({ pid }: { pid: string }) {
  const nav = useNavigate();
  const path = `phones/${pid}/data/reddit`;
  const posts = useList<RPost>(path);
  const ed = useEditor(pid);
  const [sub, setSub] = useState("front");
  const subs = [...new Set(posts.map(([, p]) => p.sub).filter(Boolean))] as string[];
  const rf = ["title", "sub", "domain", "pts", "comm", "age", "saved"];
  const shown = posts.filter(([, p]) => sub === "front" || (sub === "saved" ? p.saved : p.sub === sub));
  return (
    <div className="app rd">
      <StatusBar />
      <Bar cls="rd-bar" title={sub === "front" ? "Front Page" : sub === "saved" ? "Saved" : sub} onBack={() => nav(`/${pid}/home`)}
        right={ed.canEdit ? <button onClick={() => ed.add(path, { title: "", sub: "r/AskReddit", domain: "self.AskReddit", pts: "1", comm: 0, age: "1h", saved: false }, { atStart: true, title: "Post", fields: rf })}>＋</button> : undefined} />
      <div className="rd-subs">{["front", "saved", ...subs].map((s) => <button key={s} className={sub === s ? "on" : ""} onClick={() => setSub(s)}>{s === "front" ? "Front" : s === "saved" ? "★ Saved" : s}</button>)}</div>
      <div className="rd-scroll">
        {shown.map(([id, p], i) => (
          <div key={id} className="rd-post" onContextMenu={(e) => { e.preventDefault(); ed.itemLong(path, id, { fields: rf, label: p.title })?.(); }}>
            <span className="rd-rank">{i + 1}</span>
            <span className="rd-vote">▲<b>{p.pts}</b>▼</span>
            <span className="rd-body"><b>{p.title}</b><small>({p.domain})</small><span>{p.age} · {p.sub} · {p.comm} comments{p.saved ? " · ★" : ""}</span></span>
          </div>
        ))}
        {shown.length === 0 && <Empty>Nothing here</Empty>}
      </div>
      {ed.ui}
    </div>
  );
}

// ── VPN ──────────────────────────────────────────────────────────────────────
type Server = { loc?: string; flag?: string; ping?: number; load?: number; order?: number; deleted?: boolean };

export function VpnApp({ pid }: { pid: string }) {
  const os = useOS();
  const nav = useNavigate();
  const path = `phones/${pid}/data/vpn`;
  const servers = useList<Server>(path);
  const state = useValue<{ on?: boolean; server?: string }>(`phones/${pid}/data/vpnState`) ?? {};
  const ed = useEditor(pid);
  const cur = servers.find(([id]) => id === state.server) ?? servers[0];
  const set = (patch: Record<string, unknown>) => ed.canEdit && ed.write(Object.fromEntries(Object.entries(patch).map(([k, v]) => [`phones/${pid}/data/vpnState/${k}`, v as string | boolean])));
  return (
    <div className={`app vp ${os}`}>
      <StatusBar />
      <Bar cls="vp-bar" title="VPN" onBack={() => nav(`/${pid}/home`)} />
      <div className="vp-scroll">
        <div className={`vp-status ${state.on ? "on" : ""}`}>
          <span className="vp-shield">{state.on ? "🛡" : "⚠"}</span>
          <b>{state.on ? "Connected" : "Not Connected"}</b>
          <span>{cur ? `${cur[1].flag} ${cur[1].loc}` : "—"}</span>
          <Switch on={!!state.on} onChange={ed.canEdit ? (v) => set({ on: v }) : undefined} />
        </div>
        <div className="vp-h">Servers</div>
        {servers.map(([id, s]) => (
          <button key={id} className={`vp-row ${cur?.[0] === id ? "cur" : ""}`} onClick={() => set({ server: id })}
            onContextMenu={(e) => { e.preventDefault(); ed.itemLong(path, id, { fields: ["loc", "flag", "ping", "load"], label: s.loc })?.(); }}>
            <span className="vp-flag">{s.flag}</span><b>{s.loc}</b><span>{s.ping} ms</span><span className="vp-load"><i style={{ width: `${s.load ?? 0}%` }} /></span>
          </button>
        ))}
      </div>
      {ed.ui}
    </div>
  );
}
