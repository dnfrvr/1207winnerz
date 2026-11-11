// Apps système et utilitaires : Appareil photo (obturateur à iris d'iOS 6), Boussole, FaceTime,
// Passbook, Rappels, Messenger.
import { Glyph } from "../kit/glyph";
import { mdiCamera, mdiCameraFlip, mdiCheck, mdiClose, mdiFlashAuto, mdiMicrophoneOff, mdiPlus, mdiSquareEditOutline, mdiVideo, mdiWallet, mdiDumbbell, mdiBookOpenPageVariant, mdiMicroscope, mdiChessKnight, mdiSilverwareForkKnife } from "@mdi/js";
import { useEffect, useState } from "react";
import { Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useList, useValue, useWriter } from "../data/hooks";
import type { Json } from "../data/store";
import { loreNowMs, parseDateField } from "../lib/loreTime";
import { img } from "../lib/img";
import { AppFrame, BackButton, BarBack, StatusBar } from "../phone/IOSChrome";
import { Press } from "./social";
import { LORE_DATE_DEFAULT, useOS } from "../phone/common";
import { balloons } from "../phone/balloons";
import { AddButton, Avatar, Empty, useEditor, useSeeded } from "../kit/kit";
import { Icon } from "../kit/icons";
import "./system.css";

// ── Appareil photo ───────────────────────────────────────────────────────────
export function CameraApp({ pid }: { pid: string }) {
  const os = useOS();
  const nav = useNavigate();
  const gallery = useList<{ src?: string }>(`phones/${pid}/data/gallery`);
  const last = gallery[gallery.length - 1]?.[1].src;
  const wallpaper = useValue<string>(`phones/${pid}/profile/wallpaper`);
  const video = useValue<string>(`phones/${pid}/profile/cameraVideo`); // réglée dans Réglages › Photos & Camera
  const [videoBroken, setVideoBroken] = useState<string | null>(null); // vidéo illisible → fond d'écran
  const playVideo = !!video && videoBroken !== video;
  const [shot, setShot] = useState(0);
  const [mode, setMode] = useState<"photo" | "video">("photo");
  const [rec, setRec] = useState(false);
  return (
    <div className={`app cam ${os}`}>
      <StatusBar variant="translucent" />
      <div className="cam-top">
        <button className="cam-pill" onClick={() => nav(`/${pid}/home`)} aria-label="Fermer"><Glyph i={mdiClose} size={16} /></button>
        <button className="cam-pill"><Glyph i={mdiFlashAuto} size={16} /> Auto</button>
        {os === "ios" && <button className="cam-pill">HDR Off</button>}
        <button className="cam-pill" aria-label="Changer de caméra"><Glyph i={mdiCameraFlip} size={16} /></button>
      </div>
      <div className="cam-view" style={{ backgroundImage: wallpaper && !playVideo ? `url(${img(wallpaper)})` : undefined }}>
        {playVideo && <video className="cam-video" src={img(video)} autoPlay muted loop playsInline onError={() => setVideoBroken(video!)} />}
        <div className="cam-grid" />
        <div className="cam-focus" />
        {shot > 0 && <div key={shot} className={`cam-iris ${os}`} />}
        {rec && <span className="cam-rec">● REC</span>}
      </div>
      <div className="cam-bottom">
        <button className="cam-thumb" onClick={() => nav(`/${pid}/${os === "ios" ? "photos" : "gallery"}/camera-roll`)}>{last && <img src={img(last)} alt="" />}</button>
        <button className={`cam-shutter ${mode}`} onClick={() => mode === "photo" ? setShot((n) => n + 1) : setRec((r) => !r)} aria-label="Déclencher">
          <span>{mode === "photo" ? <Icon name="camera" size={26} /> : <i className={rec ? "on" : ""} />}</span>
        </button>
        <button className="cam-switch" onClick={() => setMode((m) => (m === "photo" ? "video" : "photo"))}>
          <span className={mode === "photo" ? "on" : ""}><Glyph i={mdiCamera} size={16} /></span><i className={mode} /><span className={mode === "video" ? "on" : ""}><Glyph i={mdiVideo} size={16} /></span>
        </button>
      </div>
    </div>
  );
}

// ── Boussole ─────────────────────────────────────────────────────────────────
export function CompassApp({ pid }: { pid: string }) {
  const nav = useNavigate();
  const ed = useEditor(pid);
  const placePath = `phones/${pid}/data/compass`;
  const place = useValue<{ coords?: string; place?: string }>(placePath) ?? {};
  const [heading, setHeading] = useState(212);
  useEffect(() => { const h = setInterval(() => setHeading((d) => (d + (Math.random() * 6 - 3) + 360) % 360), 700); return () => clearInterval(h); }, []);
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const label = dirs[Math.round(heading / 45) % 8];
  return (
    <div className="app cmp">
      <StatusBar />
      <div className="cmp-dial" style={{ transform: `rotate(${-heading}deg)` }}>
        {Array.from({ length: 72 }, (_, i) => <i key={i} className={i % 6 === 0 ? "big" : ""} style={{ transform: `rotate(${i * 5}deg)` }} />)}
        {["N", "E", "S", "W"].map((d, i) => <b key={d} style={{ transform: `rotate(${i * 90}deg) translateY(-104px) rotate(${-i * 90}deg)` }} className={d === "N" ? "n" : ""}>{d}</b>)}
        {[30, 60, 120, 150, 210, 240, 300, 330].map((a) => <small key={a} style={{ transform: `rotate(${a}deg) translateY(-82px)` }}>{a}</small>)}
      </div>
      <div className="cmp-needle" />
      <div className="cmp-read"><b>{Math.round(heading)}°</b> {label}</div>
      <Press className="cmp-coord" onLong={ed.canEdit ? () => ed.edit({ path: placePath, fields: ["coords", "place"], title: "Position" }) : undefined}>
        {place.coords ?? "44°18′38″ N · 69°46′46″ W"}<br />{place.place ?? "Augusta, ME"}
      </Press>
      <div className="cmp-bar"><button onClick={() => nav(`/${pid}/home`)}>Done</button><span>Magnetic North</span><span className="cmp-i">i</span></div>
      {ed.ui}
    </div>
  );
}

// ── FaceTime ─────────────────────────────────────────────────────────────────
export function FaceTimeApp({ pid }: { pid: string }) {
  const contacts = useList<{ name?: string; photo?: string }>(`phones/${pid}/data/contacts`);
  const [calling, setCalling] = useState<string | null>(null);
  const [t, setT] = useState(0);
  useEffect(() => { if (!calling) return; setT(0); const h = setInterval(() => setT((n) => n + 1), 1000); return () => clearInterval(h); }, [calling]);
  return (
    <AppFrame title="FaceTime" left={<BackButton to={`/${pid}/home`} label="Accueil" />} bodyClass="ft">
      {calling ? (
        <div className="ft-call">
          <div className="ft-remote"><Avatar name={calling} size={110} round={false} /><b>{calling}</b><span>{t < 4 ? "FaceTime…" : "Connecting…"}</span></div>
          <div className="ft-pip" />
          <div className="ft-bar"><button aria-label="Muet" onClick={(e) => balloons(e.currentTarget)}><Glyph i={mdiMicrophoneOff} size={20} /></button><button className="end" onClick={() => setCalling(null)}>End</button><button aria-label="Changer de caméra" onClick={(e) => balloons(e.currentTarget)}><Glyph i={mdiCameraFlip} size={20} /></button></div>
        </div>
      ) : (
        <div className="ft-list">
          {contacts.map(([id, c]) => <button key={id} onClick={() => setCalling(c.name ?? "")}><Avatar src={c.photo} name={c.name} size={36} /> <b>{c.name}</b><span><Glyph i={mdiVideo} size={20} /></span></button>)}
          {contacts.length === 0 && <Empty>No Contacts</Empty>}
        </div>
      )}
    </AppFrame>
  );
}

// ── Passbook ─────────────────────────────────────────────────────────────────
type Pass = { glyph?: string; title?: string; subtitle?: string; detail?: string; color?: string; logo?: string; number?: string; back?: string; order?: number; deleted?: boolean };
const DEFAULT_PASSES: Pass[] = [
  { title: "Starbucks Card", subtitle: "Balance", detail: "$14.30", color: "#00704a", logo: "" },
  { title: "AMC Theatres", subtitle: "Breaking Dawn – Part 2", detail: "Nov 16 · 10:00 PM", color: "#b71c1c", logo: "" },
];
// Carte étudiante UMA de chaque personnage : toujours en tête de pile, non modifiable.
const ID_CARDS: Record<string, string> = {
  drew: "/assets/passbook/drew.png", elias: "/assets/passbook/elias.png",
  eoghan: "/assets/passbook/eoghan.png", glinda: "/assets/passbook/glinda.png",
};
// Cartes de fidélité propres à chaque personnage, sous la carte étudiante (non modifiables).
const LOYALTY_CARDS: Record<string, Pass[]> = {
  eoghan: [{ title: "Kennebec Fitness", subtitle: "Member · Unlimited", detail: "Check-ins: 37", color: "#e65100", glyph: mdiDumbbell }],
  elias: [{ title: "Lithgow Public Library", subtitle: "Augusta, ME · Library Card", detail: "3 books out", color: "#4e342e", glyph: mdiBookOpenPageVariant }],
  drew: [
    { title: "UMA Biology Club", subtitle: "Member · Fall 2012", detail: "Field trips: 4", color: "#2e7d32", glyph: mdiMicroscope },
    { title: "Augusta Chess Club", subtitle: "Rating", detail: "1812", color: "#263238", glyph: mdiChessKnight },
  ],
  glinda: [
    { title: "Augusta Chess Club", subtitle: "Member since", detail: "Sep 2012", color: "#263238", glyph: mdiChessKnight },
    { title: "Buckbury's Diner", subtitle: "Chicago, IL · Rewards", detail: "Punches: 7/10", color: "#00838f", glyph: mdiSilverwareForkKnife },
  ],
};
/** Dos de carte iOS 6 : lignes « Libellé: valeur » du champ back (sinon les infos de la carte), « Done ». */
function PassBack({ p, onDone }: { p: Pass; onDone: () => void }) {
  const lines = (p.back?.trim() ? p.back.split("\n") : [`${p.subtitle ?? ""}: ${p.detail ?? ""}`, ...(p.number ? [`Card Number: ${p.number}`] : []), "Terms and Conditions: Not transferable. Valid for the 2012–2013 school year."])
    .filter((l) => l.trim()).map((l) => { const i = l.indexOf(":"); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : ["", l.trim()]; });
  return (
    <span className="pb-back" onClick={(e) => e.stopPropagation()}>
      <span className="pb-back-top"><b>{p.title}</b><button onClick={onDone}>Done</button></span>
      <span className="pb-back-sw"><span>Automatic Updates</span><i className="on" /></span>
      {lines.map(([k, v], i) => <span key={i} className="pb-back-row">{k && <small>{k}</small>}<span>{v}</span></span>)}
    </span>
  );
}

// Drew et Elias n'ont pas de carte Starbucks.
const NO_STARBUCKS = new Set(["drew", "elias"]);
export function PassbookApp({ pid }: { pid: string }) {
  const nav = useNavigate();
  const path = `phones/${pid}/data/passbook`;
  const ed = useEditor(pid);
  const defaults = NO_STARBUCKS.has(pid) ? DEFAULT_PASSES.filter((d) => d.title !== "Starbucks Card") : DEFAULT_PASSES;
  const seeded = useSeeded(path, defaults, ed);
  const { long, seed } = seeded;
  const rows = NO_STARBUCKS.has(pid) ? seeded.rows.filter(([, r]) => r.title !== "Starbucks Card") : seeded.rows;
  const [open, setOpen] = useState<string | null>(null);
  const [back, setBack] = useState<string | null>(null);
  const os = useOS();
  const fields = ["title", "subtitle", "detail", "color", "logo", "number", "back"];
  const card = ID_CARDS[pid];
  const fixed: [string, Pass][] = [...(card ? [["uma-id", {}] as [string, Pass]] : []), ...(LOYALTY_CARDS[pid] ?? []).map((c, i): [string, Pass] => [`loyalty-${i}`, c])];
  const all: [string, Pass][] = [...fixed, ...rows];
  const add = () => { seed(); ed.add(path, { title: "", subtitle: "", detail: "", color: "#555", logo: "" }, { title: "Pass", fields }); };
  const stack = (
    <div className="pb-stack">
      {all.map(([id, p], i) => {
        // La carte qui suit une carte ouverte se décale sous elle, sinon elle cache son code-barres.
        const style = { zIndex: i, marginTop: i === 0 ? 0 : all[i - 1][0] === open ? 10 : -86 };
        const toggle = () => { setBack(null); setOpen(open === id ? null : id); };
        if (id === "uma-id") return (
          <Press as="button" key={id} className="pb-pass pb-card" style={style} onClick={toggle}><img src={img(card)} alt="UMA Student ID" draggable={false} /></Press>
        );
        return (
          <Press as="button" key={id} className={`pb-pass ${open === id ? "open" : ""}`} style={{ ...style, background: `linear-gradient(${p.color ?? "#555"}, color-mix(in srgb, ${p.color ?? "#555"} 70%, #000))` }}
            onClick={back === id ? undefined : toggle}
            onLong={id.startsWith("loyalty-") ? undefined : long(id, fields, p.title)}>
            {back === id ? <PassBack p={p} onDone={() => setBack(null)} /> : <>
            <span className="pb-head"><span className="pb-logo">{p.glyph ? <Glyph i={p.glyph} size={22} /> : p.logo ? (/^(data:|https?:|\/)/.test(p.logo) ? <img src={img(p.logo)} alt="" /> : p.logo) : <Glyph i={mdiWallet} size={22} />}</span><b>{p.title}</b></span>
            <span className="pb-body"><small>{p.subtitle}</small><b>{p.detail}</b></span>
            <span className="pb-code" aria-hidden>{Array.from({ length: 30 }, (_, k) => <i key={k} style={{ width: (k * 5) % 3 + 1 }} />)}</span>
            {p.number && <span className="pb-num">{p.number}</span>}
            {open === id && os === "ios" && <span role="button" className="pb-i" aria-label="Retourner la carte" onClick={(e) => { e.stopPropagation(); setBack(id); }}>i</span>}
            </>}
          </Press>
        );
      })}
    </div>
  );
  // Android : l'équivalent de 2012 est Google Wallet (cartes en liste sous une barre d'action Holo).
  if (os === "android") return (
    <AppFrame title="Wallet" left={<BackButton to={`/${pid}/home`} label="Accueil" />}
      right={<AddButton show={ed.canEdit} onClick={add} />} bodyClass="pb pb-wallet">
      {stack}
      {ed.ui}
    </AppFrame>
  );
  return (
    <div className="app pb">
      <StatusBar />
      <div className="pb-top"><BarBack onClick={() => nav(`/${pid}/home`)} label="Accueil" /><span>Passbook</span>
        {ed.canEdit ? <button onClick={add}>+</button> : <span />}</div>
      {stack}
      {ed.ui}
    </div>
  );
}

// ── Rappels ──────────────────────────────────────────────────────────────────
// iOS 6 : plusieurs listes (bouton « Lists », points de page), échéance sous le titre (rouge si dépassée),
// ligne vide en bas pour écrire un rappel directement, rappels faits rangés sous « Completed ».
type Reminder = { title?: string; done?: boolean; due?: string; list?: string; order?: number; deleted?: boolean };
type RList = { name?: string; order?: number; deleted?: boolean };
const RM_FIELDS = ["title", "due", "done"];

/** Échéance → [ms, libellé « 06/10/12 14:00 »] ; une date sans heure compte jusqu'au soir. */
const dueOf = (due?: string): [number, string] | null => {
  const v = due ? parseDateField(due)?.value : "";
  if (!v) return null;
  const d = new Date(v.length === 10 ? `${v}T23:59` : v);
  const p2 = (n: number) => String(n).padStart(2, "0");
  return [d.getTime(), `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}${v.length > 10 ? ` ${p2(d.getHours())}:${p2(d.getMinutes())}` : ""}`];
};

export function RemindersApp({ pid }: { pid: string }) {
  const path = `phones/${pid}/data/reminders`, lpath = `phones/${pid}/data/reminderLists`;
  const all = useList<Reminder>(path);
  const lists = useList<RList>(lpath);
  const ed = useEditor(pid);
  const { insert } = useWriter(pid);
  const lore = useValue<string>("meta/loreDate") || LORE_DATE_DEFAULT;
  const now = loreNowMs(lore);
  const [cur, setCur] = useState(() => sessionStorage.getItem(`rm-${pid}`) ?? "");
  const [showLists, setShowLists] = useState(false);
  const [showDone, setShowDone] = useState(false);
  // Sans liste créée : une liste implicite « Reminders » ; un rappel sans liste va dans la première.
  const names: [string, RList][] = lists.length ? lists : [["", { name: "Reminders" }]];
  const idx = Math.max(0, names.findIndex(([id]) => id === cur));
  const [lid, l] = names[idx];
  const listOf = (r: Reminder) => (r.list && names.some(([id]) => id === r.list) ? r.list : names[0][0]);
  const select = (id: string) => { setCur(id); setShowLists(false); try { sessionStorage.setItem(`rm-${pid}`, id); } catch { /* rien */ } };

  const addList = (name: string) => {
    const p: Record<string, Json> = {};
    let order = (lists[lists.length - 1]?.[1].order ?? 0) + 1;
    if (!lists.length) p[`${lpath}/default`] = { name: "Reminders", order: order++ }; // l'implicite devient réelle
    const id = `l_${Date.now().toString(36)}`;
    p[`${lpath}/${id}`] = { name, order };
    ed.write(p);
    select(id);
  };

  const mine = all.filter(([, r]) => listOf(r) === lid);
  const todo = mine.filter(([, r]) => !r.done), done = mine.filter(([, r]) => r.done);
  const row = ([id, r]: [string, Reminder]) => {
    const due = dueOf(r.due);
    return (
      <div key={id} className={`rm-row ${r.done ? "done" : ""}`} onContextMenu={(e) => { e.preventDefault(); ed.itemLong(path, id, { fields: RM_FIELDS, label: r.title })?.(); }}>
        <button className="rm-check" onClick={() => ed.canEdit && ed.write({ [`${path}/${id}/done`]: !r.done })}>{r.done ? <Glyph i={mdiCheck} size={14} /> : ""}</button>
        <span><b>{r.title}</b>{r.due && <small className={due && !r.done && due[0] < now ? "late" : ""}>{due?.[1] ?? r.due}</small>}</span>
      </div>
    );
  };

  if (showLists) return (
    <AppFrame title="Lists" left={<button className="barbtn" onClick={() => setShowLists(false)}>Done</button>}
      navStyle={RM_NAV} bodyClass="rm">
      <div className="rm-paper">
        {names.map(([id, x]) => {
          const n = all.filter(([, r]) => !r.done && listOf(r) === id).length;
          return (
            <div key={id || "implicit"} className={`rm-row rm-list ${id === lid ? "cur" : ""}`}
              onContextMenu={(e) => { e.preventDefault(); if (id) ed.itemLong(lpath, id, { fields: ["name"], label: x.name })?.(); }}>
              <button onClick={() => select(id)}><b>{x.name || "Sans titre"}</b><small>{n || ""}</small></button>
            </div>
          );
        })}
        {ed.canEdit && <InlineAdd placeholder="Create New List…" onAdd={addList} />}
      </div>
      {ed.ui}
    </AppFrame>
  );

  return (
    <AppFrame title={l.name || "Reminders"} left={<button className="barbtn" onClick={() => setShowLists(true)}>Lists</button>}
      right={<AddButton show={ed.canEdit} onClick={() => ed.add(path, { title: "", due: "", done: false, ...(lid ? { list: lid } : {}) }, { title: "Rappel", fields: RM_FIELDS })} />}
      navStyle={RM_NAV} bodyClass="rm">
      {names.length > 1 && (
        <div className="rm-dots">{names.map(([id]) => <button key={id} className={id === lid ? "on" : ""} onClick={() => select(id)} aria-label="Liste" />)}</div>
      )}
      <div className="rm-paper">
        {todo.map(row)}
        {ed.canEdit && <InlineAdd onAdd={(title) => insert(path, { title, done: false, ...(lid ? { list: lid } : {}) })} />}
        {!ed.canEdit && todo.length === 0 && <div className="rm-empty">No Reminders</div>}
        {done.length > 0 && <button className="rm-done-toggle" onClick={() => setShowDone((v) => !v)}>{showDone ? "Hide Completed" : `Show Completed (${done.length})`}</button>}
        {showDone && done.map(row)}
      </div>
      {ed.ui}
    </AppFrame>
  );
}
const RM_NAV = { background: "linear-gradient(#8a8f96, #5d636b)", borderBottomColor: "#3a3e44" };

/** Ligne vide du bloc-notes : on tape, Entrée ajoute. */
function InlineAdd({ onAdd, placeholder = "" }: { onAdd: (t: string) => void; placeholder?: string }) {
  const [v, setV] = useState("");
  const add = () => { const t = v.trim(); if (t) onAdd(t); setV(""); };
  return (
    <form className="rm-row rm-new" onSubmit={(e) => { e.preventDefault(); add(); }}>
      <span className="rm-check ghost" />
      <input value={v} onChange={(e) => setV(e.target.value)} onBlur={add} placeholder={placeholder} aria-label={placeholder || "Nouveau rappel"} />
    </form>
  );
}

// ── Messenger ────────────────────────────────────────────────────────────────
type Conv = { name?: string; avatar?: string; last?: string; time?: string; unread?: boolean; order?: number; deleted?: boolean };
type MsnMsg = { from?: string; text?: string; time?: string; me?: boolean; img?: string; order?: number; deleted?: boolean };
const MSN_FIELDS = ["name", "avatar", "last", "time", "unread"];
const MSN_MSG_FIELDS = ["text", "img", "time", "me"];

export function MessengerApp({ pid }: { pid: string }) {
  return (
    <div className="app msn">
      <StatusBar />
      <Routes>
        <Route index element={<MessengerList pid={pid} />} />
        <Route path="c/:cid" element={<MessengerChat pid={pid} />} />
      </Routes>
    </div>
  );
}

function MessengerList({ pid }: { pid: string }) {
  const nav = useNavigate();
  const path = `phones/${pid}/data/messenger`;
  const list = useList<Conv>(path, { newest: "time" });
  const ed = useEditor(pid);
  return (
    <>
      <div className="msn-bar"><BarBack onClick={() => nav(`/${pid}/home`)} label="Accueil" /><h1>Messenger</h1>
        <button aria-label="Nouvelle conversation" disabled={!ed.canEdit} onClick={() => ed.add(path, { name: "", last: "", time: "", unread: true }, { atStart: true, title: "Conversation", fields: MSN_FIELDS })}><Glyph i={mdiSquareEditOutline} size={20} /></button></div>
      <div className="msn-list">
        {list.map(([id, c]) => (
          <button key={id} className={c.unread ? "unread" : ""} onClick={() => nav(`c/${id}`)}
            onContextMenu={(e) => { e.preventDefault(); ed.itemLong(path, id, { fields: MSN_FIELDS, label: c.name })?.(); }}>
            <Avatar src={c.avatar} name={c.name} size={44} round={false} color="#3b5998" />
            <span><span className="top"><b>{c.name}</b><i>{c.time}</i></span><span className="last">{c.last}</span></span>
            <span className="chev" aria-hidden>›</span>
          </button>
        ))}
        {list.length === 0 && <Empty>No messages</Empty>}
      </div>
      {ed.ui}
    </>
  );
}

function MessengerChat({ pid }: { pid: string }) {
  const { cid = "" } = useParams();
  const nav = useNavigate();
  const cpath = `phones/${pid}/data/messenger/${cid}`;
  const c = useValue<Conv>(cpath) ?? {};
  const mpath = `${cpath}/messages`;
  const msgs = useList<MsnMsg>(mpath);
  const me = useValue<string>(`phones/${pid}/profile/name`) ?? pid;
  const av = useValue<string | { src?: string }>(`phones/${pid}/profile/avatar`);
  const myAvatar = typeof av === "string" ? av : av?.src;
  const ed = useEditor(pid);
  const [draft, setDraft] = useState("");
  // Conversation sans fil enregistré : on montre son dernier message, en lecture seule.
  const shown: [string, MsnMsg][] = msgs.length ? msgs : c.last ? [["last", { text: c.last, time: c.time }]] : [];
  const send = () => {
    const text = draft.trim(); if (!text || !ed.canEdit) return;
    const d = new Date(), time = `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")}${d.getHours() < 12 ? "am" : "pm"}`;
    const keep = !msgs.length && shown[0] ? { [`${mpath}/m0`]: { ...shown[0][1], me: false, order: 1000 } } : {};
    const order = keep[`${mpath}/m0`] ? 2000 : (msgs[msgs.length - 1]?.[1].order ?? 0) + 1000;
    ed.write({ ...keep, [`${mpath}/m${Date.now().toString(36)}`]: { from: me, me: true, text, time, order }, [`${cpath}/last`]: text, [`${cpath}/time`]: time });
    setDraft("");
  };
  return (
    <>
      <div className="msn-bar"><BarBack onClick={() => nav(`/${pid}/messenger`)} label="Messages" /><h1 className="msn-title">{c.name}</h1>
        <span className="msn-bar-av"><Avatar src={c.avatar} name={c.name} size={30} round={false} color="#2d4373" /></span></div>
      <div className="msn-chat">
        {shown.map(([id, m], i) => {
          const next = shown[i + 1]?.[1];
          const tail = !next || !!next.me !== !!m.me; // avatar seulement en bas d'une série
          return (
            <div key={id} className={`msn-row ${m.me ? "me" : ""}`}
              onContextMenu={id === "last" ? undefined : (e) => { e.preventDefault(); ed.itemLong(mpath, id, { fields: MSN_MSG_FIELDS, label: m.text?.slice(0, 20), template: { text: "", time: "", me: false } })?.(); }}>
              {!m.me && (tail ? <Avatar src={c.avatar} name={c.name} size={28} round={false} color="#3b5998" /> : <span className="msn-gap" />)}
              <div className="msn-bubble">
                {m.text && <p>{m.text}</p>}
                {m.img && <img src={img(m.img)} alt="" loading="lazy" />}
                {tail && <small>{m.time}</small>}
              </div>
              {m.me && (tail ? <Avatar src={myAvatar} name={me} size={28} round={false} /> : <span className="msn-gap" />)}
            </div>
          );
        })}
        {shown.length === 0 && <Empty>No messages yet</Empty>}
      </div>
      <form className="msn-compose" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <button type="button" className="msn-attach" aria-label="Ajouter un message reçu" disabled={!ed.canEdit}
          onClick={() => ed.add(mpath, { text: "", time: "", me: false }, { title: `Message de ${c.name ?? ""}`, fields: MSN_MSG_FIELDS })}><Glyph i={mdiPlus} size={18} /></button>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a message..." disabled={!ed.canEdit} />
        <button type="submit" className="msn-send" disabled={!ed.canEdit || !draft.trim()}>Send</button>
      </form>
      {ed.ui}
    </>
  );
}
