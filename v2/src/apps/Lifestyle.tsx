// Snapchat (2012), GroupMe (2012), Starbucks (2012), Fichiers (style Dropbox 2012).
import { Glyph, Brand } from "../kit/glyph";
import { mdiAccountMultiple, mdiFolder, mdiHeart, mdiHeartOutline, mdiMapMarker, mdiPlus, mdiSend, mdiStar } from "@mdi/js";
import { useState } from "react";
import { Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useList, useValue } from "../data/hooks";
import { AppFrame, BackButton, StatusBar, BarBack } from "../phone/IOSChrome";
import { useOS } from "../phone/common";
import { AddButton, Avatar, Cell, Empty, Plain, PlainHeader, TabBar, useEditor, type Tab } from "../kit/kit";
import { Icon } from "../kit/icons";
import { img } from "../lib/img";
import "./lifestyle.css";

// ── Snapchat ─────────────────────────────────────────────────────────────────
type Snap = { contact?: string; opened?: boolean; sent?: boolean; video?: boolean; time?: string; order?: number; deleted?: boolean };

export function SnapchatApp({ pid }: { pid: string }) {
  const nav = useNavigate();
  const path = `phones/${pid}/data/snaps`;
  const snaps = useList<Snap>(path);
  const ed = useEditor(pid);
  const [viewing, setViewing] = useState<{ id: string; s: Snap } | null>(null);
  const [left, setLeft] = useState(0);
  const fields = ["contact", "time", "opened", "sent", "video"];
  const open = (id: string, s: Snap) => {
    if (s.opened || s.sent) return;
    setViewing({ id, s }); setLeft(5);
    const h = setInterval(() => setLeft((n) => { if (n <= 1) { clearInterval(h); setViewing(null); if (ed.canEdit) ed.write({ [`${path}/${id}/opened`]: true }); } return n - 1; }), 1000);
  };
  return (
    <div className="app sc">
      <StatusBar />
      <div className="sc-bar">
        <BarBack onClick={() => nav(`/${pid}/home`)} label="Accueil" />
        <h1>Snapchat</h1>
        <button onClick={() => nav(`/${pid}/camera`)} aria-label="Appareil photo"><Icon name="camera" size={20} /></button>
      </div>
      <div className="sc-scroll">
        {snaps.map(([id, s]) => (
          <button key={id} className="sc-row" onClick={() => open(id, s)}
            onContextMenu={(e) => { e.preventDefault(); ed.itemLong(path, id, { fields, label: s.contact, template: { contact: "", time: "", opened: false, sent: false } })?.(); }}>
            <span className={`sc-ic ${s.sent ? "sent" : s.opened ? "opened" : "new"} ${s.video ? "video" : ""}`}>{s.sent ? <Glyph i={mdiSend} size={11} /> : ""}</span>
            <span className="sc-txt"><b>{s.contact}</b><span>{s.time}{!s.opened && !s.sent ? " · Press and hold to view" : s.sent ? (s.opened ? " · Opened" : " · Delivered") : ""}</span></span>
          </button>
        ))}
        {snaps.length === 0 && <Empty>No snaps yet</Empty>}
      </div>
      <div className="sc-foot">{ed.canEdit ? <button onClick={() => ed.add(path, { contact: "", time: "", opened: false, sent: false }, { atStart: true, title: "Snap", fields })}>+ Snap</button> : "Double-tap to reply"}</div>
      {viewing && <div className="sc-view" onClick={() => setViewing(null)}><div className="sc-photo">{viewing.s.contact}</div><span className="sc-timer">{left}</span></div>}
      {ed.ui}
    </div>
  );
}

// ── GroupMe ──────────────────────────────────────────────────────────────────
type Group = { name?: string; last?: string; time?: string; n?: number; members?: number; avatar?: string; messages?: Record<string, GmMsg>; order?: number; deleted?: boolean };
type GmMsg = { from?: string; text?: string; time?: string; likes?: number; me?: boolean; img?: string; order?: number; deleted?: boolean };
const GM_BLUE = "#00aff0";
const GM_GROUP_FIELDS = ["name", "avatar", "last", "time", "n", "members"];
const GM_MSG_FIELDS = ["from", "text", "img", "time", "likes", "me"];
const clock12 = (d: Date) => `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")}${d.getHours() < 12 ? "am" : "pm"}`;

export function GroupMeApp({ pid }: { pid: string }) {
  return (
    <div className="app gm">
      <StatusBar />
      <Routes>
        <Route index element={<GroupMeList pid={pid} />} />
        <Route path="g/:gid" element={<GroupMeChat pid={pid} />} />
      </Routes>
    </div>
  );
}

function GroupMeList({ pid }: { pid: string }) {
  const nav = useNavigate();
  const path = `phones/${pid}/data/groupmeGroups`;
  const groups = useList<Group>(path);
  const ed = useEditor(pid);
  return (
    <>
      <div className="gm-bar">
        <BarBack onClick={() => nav(`/${pid}/home`)} label="Accueil" />
        <h1>GroupMe</h1>
        <button aria-label="Nouveau groupe" disabled={!ed.canEdit} onClick={() => ed.add(path, { name: "", last: "", time: "", n: 0, members: 2 }, { atStart: true, title: "Groupe", fields: GM_GROUP_FIELDS })}><Icon name="plus" size={20} /></button>
      </div>
      <div className="gm-scroll">
        {groups.map(([id, g]) => (
          <button key={id} className="gm-row" onClick={() => nav(`g/${id}`)}
            onContextMenu={(e) => { e.preventDefault(); ed.itemLong(path, id, { fields: GM_GROUP_FIELDS, label: g.name })?.(); }}>
            <Avatar src={g.avatar} name={g.name} size={46} round={false} color={GM_BLUE} />
            <span className="gm-txt">
              <span className="gm-top"><b>{g.name}</b><i>{g.time}</i></span>
              <span className="gm-last">{g.last}</span>
              <small><Glyph i={mdiAccountMultiple} size={12} /> {g.members} members</small>
            </span>
            {!!g.n && <span className="gm-n">{g.n}</span>}
            <span className="gm-chev" aria-hidden>›</span>
          </button>
        ))}
        {groups.length === 0 && <Empty>No groups</Empty>}
      </div>
      {ed.ui}
    </>
  );
}

function GroupMeChat({ pid }: { pid: string }) {
  const { gid = "" } = useParams();
  const nav = useNavigate();
  const gpath = `phones/${pid}/data/groupmeGroups/${gid}`;
  const g = useValue<Group>(gpath) ?? {};
  const mpath = `${gpath}/messages`;
  const msgs = useList<GmMsg>(mpath);
  const me = useValue<string>(`phones/${pid}/profile/name`) ?? pid;
  const av = useValue<string | { src?: string }>(`phones/${pid}/profile/avatar`);
  const myAvatar = typeof av === "string" ? av : av?.src;
  const ed = useEditor(pid);
  const [draft, setDraft] = useState("");
  // Groupe sans fil enregistré : on montre au moins son dernier message (« Nom: texte »), en lecture seule.
  const shown: [string, GmMsg][] = msgs.length ? msgs : g.last ? [["last", (() => { const m = g.last.match(/^([^:]{1,30}):\s*(.+)$/); return { from: m?.[1] ?? "", text: m?.[2] ?? g.last, time: g.time }; })()]] : [];
  const send = () => {
    const text = draft.trim(); if (!text || !ed.canEdit) return;
    const order = (msgs[msgs.length - 1]?.[1].order ?? 0) + 1000, time = clock12(new Date()), first = me.split(" ")[0];
    // 1er envoi dans un groupe sans fil : on enregistre d'abord le dernier message connu, pour ne pas le perdre.
    const keep = !msgs.length && shown[0] ? { [`${mpath}/m0`]: { ...shown[0][1], likes: 0, me: false, order: 1000 } } : {};
    ed.write({ ...keep, [`${mpath}/m${Date.now().toString(36)}`]: { from: me, me: true, text, time, likes: 0, order: keep[`${mpath}/m0`] ? 2000 : order }, [`${gpath}/last`]: `${first}: ${text}`, [`${gpath}/time`]: time });
    setDraft("");
  };
  return (
    <>
      <div className="gm-bar">
        <BarBack onClick={() => nav(`/${pid}/groupme`)} label="Groups" />
        <h1 className="gm-title"><span>{g.name}</span><small>{g.members} members</small></h1>
        <span className="gm-bar-av"><Avatar src={g.avatar} name={g.name} size={30} round={false} color="#0089bf" /></span>
      </div>
      <div className="gm-chat">
        {shown.map(([id, m]) => (
          <div key={id} className={`gm-msg ${m.me ? "me" : ""}`}
            onContextMenu={id === "last" ? undefined : (e) => { e.preventDefault(); ed.itemLong(mpath, id, { fields: GM_MSG_FIELDS, label: m.from, template: { from: "", text: "", time: "", likes: 0, me: false } })?.(); }}>
            <Avatar src={m.me ? myAvatar : m.from ? undefined : g.avatar} name={m.from || g.name} size={36} round={false} color={m.from ? undefined : GM_BLUE} />
            <div className="gm-body">
              <div className="gm-head"><b>{m.from || g.name}</b><i>{m.time}</i></div>
              {m.text && <p>{m.text}</p>}
              {m.img && <img className="gm-img" src={img(m.img)} alt="" loading="lazy" />}
            </div>
            <button className={`gm-like ${m.likes ? "on" : ""}`} aria-label="J'aime" disabled={!ed.canEdit || id === "last"}
              onClick={() => ed.write({ [`${mpath}/${id}/likes`]: (m.likes ?? 0) + 1 })}>
              <Glyph i={m.likes ? mdiHeart : mdiHeartOutline} size={16} />{m.likes ? <span>{m.likes}</span> : null}
            </button>
          </div>
        ))}
        {shown.length === 0 && <Empty>No messages yet</Empty>}
      </div>
      <form className="gm-compose" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <button type="button" className="gm-attach" aria-label="Ajouter un message" disabled={!ed.canEdit}
          onClick={() => ed.add(mpath, { from: "", text: "", time: clock12(new Date()), likes: 0, me: false }, { title: "Message", fields: GM_MSG_FIELDS })}><Glyph i={mdiPlus} size={18} /></button>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Send a message..." disabled={!ed.canEdit} />
        <button type="submit" className="gm-send" disabled={!ed.canEdit || !draft.trim()}>Send</button>
      </form>
      {ed.ui}
    </>
  );
}

// ── Starbucks ────────────────────────────────────────────────────────────────
type Recent = { item?: string; detail?: string; date?: string; price?: string; pts?: number; order?: number; deleted?: boolean };
type Store = { name?: string; addr?: string; hours?: string; order?: number; deleted?: boolean };
type SB = { stars?: number; balance?: string };
const SB_TABS: Tab[] = [
  { id: "pay", label: "Pay", icon: "bag" }, { id: "rewards", label: "Rewards", icon: "star" },
  { id: "history", label: "History", icon: "clock" }, { id: "stores", label: "Stores", icon: "pin" },
];

export function StarbucksApp({ pid }: { pid: string }) {
  const base = `phones/${pid}/data/starbucks`;
  const sb = useValue<SB>(base) ?? {};
  const recents = useList<Recent>(`${base}/recents`);
  const stores = useList<Store>(`${base}/favorites`);
  const name = useValue<string>(`phones/${pid}/profile/name`) ?? pid;
  const ed = useEditor(pid);
  const [tab, setTab] = useState("pay");
  const stars = sb.stars ?? 0;
  const level = stars >= 30 ? "Gold" : stars >= 5 ? "Green" : "Welcome";
  return (
    <AppFrame title={<span className="sb-logo"><Brand name="starbucks" size={22} color="#fff" /> STARBUCKS</span>} left={<BackButton to={`/${pid}/home`} label="Accueil" />}
      right={ed.canEdit ? <button className="barbtn" onClick={() => ed.edit({ path: base, fields: ["stars", "balance"], title: "Carte" })}>Edit</button> : undefined}
      navStyle={{ background: "linear-gradient(#2a8a61, #00704a 50%, #006241 51%, #05683f)", borderBottomColor: "#00341f" }} bodyClass="k-body-tabbed sb">
      <TabBar tabs={SB_TABS} active={tab} onChange={setTab} />
      <div className="k-tab-scroll">
        {tab === "pay" && (
          <div className="sb-pay">
            <div className="sb-card"><span className="sb-siren"><Brand name="starbucks" size={34} color="#fff" /></span><b>STARBUCKS CARD</b><span className="sb-num">•••• •••• •••• 4821</span></div>
            <div className="sb-bal"><span>Balance</span><b>{sb.balance ?? "$0.00"}</b><small>as of today</small></div>
            <div className="sb-barcode" aria-hidden>{Array.from({ length: 42 }, (_, i) => <i key={i} style={{ width: (i * 7) % 3 + 1 }} />)}</div>
            <div className="sb-hint">Touch to pay · {name}</div>
          </div>
        )}
        {tab === "rewards" && (
          <div className="sb-rewards">
            <div className={`sb-level ${level.toLowerCase()}`}>{level} Level</div>
            <div className="sb-stars">{Array.from({ length: 12 }, (_, i) => <span key={i} className={i < stars % 12 ? "on" : ""}><Glyph i={mdiStar} size={16} /></span>)}</div>
            <p><b>{stars}</b> stars earned · {12 - (stars % 12)} until your next free drink</p>
          </div>
        )}
        {tab === "history" && (
          <Plain>
            {recents.map(([id, r]) => (
              <Cell key={id} title={r.item} subtitle={[r.detail, r.date].filter(Boolean).join(" · ")} detail={r.price}
                onLong={ed.itemLong(`${base}/recents`, id, { fields: ["item", "detail", "date", "price", "pts"], label: r.item, template: { item: "", date: "", price: "$0.00", pts: 0 } })} />
            ))}
            {recents.length === 0 && <Empty>No recent activity</Empty>}
          </Plain>
        )}
        {tab === "stores" && (
          <Plain>
            <PlainHeader>Favorite Stores</PlainHeader>
            {stores.map(([id, s]) => (
              <Cell key={id} icon={<span className="sb-pin"><Glyph i={mdiMapMarker} size={22} /></span>} title={s.name} subtitle={`${s.addr ?? ""}\n${s.hours ?? ""}`}
                onLong={ed.itemLong(`${base}/favorites`, id, { fields: ["name", "addr", "hours"], label: s.name, template: { name: "", addr: "", hours: "" } })} />
            ))}
          </Plain>
        )}
      </div>
      {ed.ui}
    </AppFrame>
  );
}

// ── Fichiers ─────────────────────────────────────────────────────────────────
type FileItem = { name?: string; ext?: string; size?: string; date?: string; order?: number; deleted?: boolean };
type Folder = { name?: string; files?: Record<string, FileItem>; order?: number; deleted?: boolean };
const EXT_COLORS: Record<string, string> = { pdf: "#d93025", doc: "#2a5699", docx: "#2a5699", xls: "#1e7145", xlsx: "#1e7145", ppt: "#d24726", pptx: "#d24726", jpg: "#8e44ad", png: "#8e44ad", mp3: "#e67e22", txt: "#7f8c8d", zip: "#795548" };
const FILE_FIELDS = ["name", "ext", "size", "date"];

export function FilesApp({ pid }: { pid: string }) {
  return (
    <Routes>
      <Route index element={<FilesList pid={pid} />} />
      <Route path=":folder" element={<FilesList pid={pid} />} />
    </Routes>
  );
}

function FileIcon({ ext }: { ext?: string }) {
  const e = (ext ?? "").toLowerCase();
  return <span className="fl-ic" style={{ background: EXT_COLORS[e] ?? "#95a5a6" }}>{e.slice(0, 4).toUpperCase() || "?"}</span>;
}

function FilesList({ pid }: { pid: string }) {
  const { folder } = useParams();
  const os = useOS();
  const nav = useNavigate();
  const ed = useEditor(pid);
  const root = `phones/${pid}/data/files`;
  const folders = useList<Folder>(`${root}/folders`);
  const filesPath = folder ? `${root}/folders/${folder}/files` : `${root}/rootFiles`;
  const files = useList<FileItem>(filesPath);
  const title = folder ? (folders.find(([id]) => id === folder)?.[1].name ?? "Dossier") : (os === "ios" ? "Fichiers" : "Mes fichiers");
  return (
    <AppFrame title={title} left={<BackButton to={folder ? `/${pid}/files` : `/${pid}/home`} label={folder ? "Fichiers" : "Accueil"} />}
      right={<AddButton show={ed.canEdit} onClick={() => ed.add(filesPath, { name: "Nouveau.pdf", ext: "pdf", size: "1 MB", date: "6 oct" }, { title: "Fichier", fields: FILE_FIELDS })} />}>
      <Plain>
        {!folder && folders.map(([id, f]) => (
          <Cell key={id} icon={<span className="fl-folder"><Glyph i={mdiFolder} size={28} /></span>} title={f.name} subtitle={`${Object.keys(f.files ?? {}).length} éléments`} chevron onClick={() => nav(id)}
            onLong={ed.itemLong(`${root}/folders`, id, { fields: ["name"], label: f.name })} />
        ))}
        {files.map(([id, f]) => (
          <Cell key={id} icon={<FileIcon ext={f.ext} />} title={f.name} subtitle={[f.size, f.date].filter(Boolean).join(" · ")}
            onLong={ed.itemLong(filesPath, id, { fields: FILE_FIELDS, label: f.name })} />
        ))}
        {!folder && ed.canEdit && <Cell title={<span className="fl-add">+ Nouveau dossier</span>} onClick={() => ed.add(`${root}/folders`, { name: "Nouveau dossier" }, { title: "Dossier", fields: ["name"] })} />}
        {files.length === 0 && (folder || folders.length === 0) && <Empty>Dossier vide</Empty>}
      </Plain>
      {ed.ui}
    </AppFrame>
  );
}
