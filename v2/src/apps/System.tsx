// Apps système et utilitaires : Appareil photo (obturateur à iris d'iOS 6), Boussole, FaceTime,
// Passbook, Rappels, Messenger.
import { Glyph } from "../kit/glyph";
import { mdiCamera, mdiCameraFlip, mdiCheck, mdiClose, mdiFlashAuto, mdiMicrophoneOff, mdiSquareEditOutline, mdiVideo, mdiWallet } from "@mdi/js";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useList, useValue } from "../data/hooks";
import { img } from "../lib/img";
import { AppFrame, BackButton, BarBack, StatusBar } from "../phone/IOSChrome";
import { Press } from "./social";
import { useOS } from "../phone/common";
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
  const video = useValue<string>(`phones/${pid}/profile/cameraVideo`); // réglée dans Réglages › Fond d'écran
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
      <div className="cam-view" style={{ backgroundImage: wallpaper && !video ? `url(${img(wallpaper)})` : undefined }}>
        {video && <video className="cam-video" src={img(video)} autoPlay muted loop playsInline />}
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
          <div className="ft-bar"><button aria-label="Muet"><Glyph i={mdiMicrophoneOff} size={20} /></button><button className="end" onClick={() => setCalling(null)}>End</button><button aria-label="Changer de caméra"><Glyph i={mdiCameraFlip} size={20} /></button></div>
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
type Pass = { title?: string; subtitle?: string; detail?: string; color?: string; logo?: string; order?: number; deleted?: boolean };
const DEFAULT_PASSES: Pass[] = [
  { title: "Starbucks Card", subtitle: "Balance", detail: "$14.30", color: "#00704a", logo: "" },
  { title: "UMA Student ID", subtitle: "Fall 2012", detail: "#2012-4471", color: "#0f4499", logo: "" },
  { title: "AMC Theatres", subtitle: "Breaking Dawn – Part 2", detail: "Nov 16 · 10:00 PM", color: "#b71c1c", logo: "" },
];
export function PassbookApp({ pid }: { pid: string }) {
  const nav = useNavigate();
  const path = `phones/${pid}/data/passbook`;
  const ed = useEditor(pid);
  const { rows, long, seed } = useSeeded(path, DEFAULT_PASSES, ed);
  const [open, setOpen] = useState<string | null>(null);
  const fields = ["title", "subtitle", "detail", "color", "logo"];
  return (
    <div className="app pb">
      <StatusBar />
      <div className="pb-top"><BarBack onClick={() => nav(`/${pid}/home`)} label="Accueil" /><span>Passbook</span>
        {ed.canEdit ? <button onClick={() => { seed(); ed.add(path, { title: "", subtitle: "", detail: "", color: "#555", logo: "" }, { title: "Pass", fields }); }}>+</button> : <span />}</div>
      <div className="pb-stack">
        {rows.map(([id, p], i) => (
          // La carte qui suit une carte ouverte se décale sous elle, sinon elle cache son code-barres.
          <Press as="button" key={id} className={`pb-pass ${open === id ? "open" : ""}`} style={{ background: `linear-gradient(${p.color ?? "#555"}, color-mix(in srgb, ${p.color ?? "#555"} 70%, #000))`, zIndex: i, marginTop: i === 0 ? 0 : rows[i - 1][0] === open ? 10 : -86 }}
            onClick={() => setOpen(open === id ? null : id)}
            onLong={long(id, fields, p.title)}>
            <span className="pb-head"><span className="pb-logo">{p.logo ? (/^(data:|https?:|\/)/.test(p.logo) ? <img src={img(p.logo)} alt="" /> : p.logo) : <Glyph i={mdiWallet} size={22} />}</span><b>{p.title}</b></span>
            <span className="pb-body"><small>{p.subtitle}</small><b>{p.detail}</b></span>
            <span className="pb-code" aria-hidden>{Array.from({ length: 30 }, (_, k) => <i key={k} style={{ width: (k * 5) % 3 + 1 }} />)}</span>
          </Press>
        ))}
      </div>
      {ed.ui}
    </div>
  );
}

// ── Rappels ──────────────────────────────────────────────────────────────────
type Reminder = { title?: string; done?: boolean; due?: string; order?: number; deleted?: boolean };
export function RemindersApp({ pid }: { pid: string }) {
  const path = `phones/${pid}/data/reminders`;
  const list = useList<Reminder>(path);
  const ed = useEditor(pid);
  const fields = ["title", "due", "done"];
  return (
    <AppFrame title="Reminders" left={<BackButton to={`/${pid}/home`} label="Accueil" />}
      right={<AddButton show={ed.canEdit} onClick={() => ed.add(path, { title: "", due: "", done: false }, { title: "Rappel", fields })} />}
      navStyle={{ background: "linear-gradient(#8a8f96, #5d636b)", borderBottomColor: "#3a3e44" }} bodyClass="rm">
      <div className="rm-paper">
        {list.map(([id, r]) => (
          <div key={id} className={`rm-row ${r.done ? "done" : ""}`} onContextMenu={(e) => { e.preventDefault(); ed.itemLong(path, id, { fields, label: r.title })?.(); }}>
            <button className="rm-check" onClick={() => ed.canEdit && ed.write({ [`${path}/${id}/done`]: !r.done })}>{r.done ? <Glyph i={mdiCheck} size={14} /> : ""}</button>
            <span><b>{r.title}</b>{r.due && <small>{r.due}</small>}</span>
          </div>
        ))}
        {list.length === 0 && <div className="rm-empty">{ed.canEdit ? "Touchez + pour ajouter un rappel" : "No Reminders"}</div>}
      </div>
      {ed.ui}
    </AppFrame>
  );
}

// ── Messenger ────────────────────────────────────────────────────────────────
type Conv = { name?: string; last?: string; time?: string; unread?: boolean; order?: number; deleted?: boolean };
export function MessengerApp({ pid }: { pid: string }) {
  const nav = useNavigate();
  const path = `phones/${pid}/data/messenger`;
  const list = useList<Conv>(path);
  const ed = useEditor(pid);
  const fields = ["name", "last", "time", "unread"];
  return (
    <div className="app msn">
      <StatusBar />
      <div className="msn-bar"><BarBack onClick={() => nav(`/${pid}/home`)} label="Accueil" /><h1>Messenger</h1>
        <button disabled={!ed.canEdit} onClick={() => ed.add(path, { name: "", last: "", time: "", unread: true }, { atStart: true, title: "Conversation", fields })}><Glyph i={mdiSquareEditOutline} size={20} /></button></div>
      <div className="msn-list">
        {list.map(([id, c]) => (
          <button key={id} className={c.unread ? "unread" : ""} onContextMenu={(e) => { e.preventDefault(); ed.itemLong(path, id, { fields, label: c.name })?.(); }}>
            <Avatar name={c.name} size={44} round={false} color="#3b5998" />
            <span><span className="top"><b>{c.name}</b><i>{c.time}</i></span><span className="last">{c.last}</span></span>
          </button>
        ))}
        {list.length === 0 && <Empty>No messages</Empty>}
      </div>
      {ed.ui}
    </div>
  );
}
