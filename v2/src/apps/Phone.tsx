// Téléphone (iOS 6 / Android 4.1) + Contacts. Récents, clavier, messagerie vocale, fiche
// contact, écran d'appel simulé.
import { useEffect, useState } from "react";
import { Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useList, useValue } from "../data/hooks";
import { inboxLabel, loreNowMs, loreToMs } from "../lib/loreTime";
import { AppFrame, BackButton, StatusBar } from "../phone/IOSChrome";
import { LORE_DATE_DEFAULT, useLoreStamp, useOS } from "../phone/common";
import { AddButton, Avatar, Cell, Empty, Grouped, Plain, PlainHeader, Section, Segmented, TabBar, useEditor, type Tab } from "../kit/kit";
import { Glyph } from "../kit/glyph";
import {
  mdiAccountBox, mdiAccountPlus, mdiBackspace, mdiCallMade, mdiCallMissed, mdiCallReceived, mdiDialpad, mdiMicrophoneOff, mdiPencil, mdiPhone,
  mdiPhoneHangup, mdiPhoneOutgoing, mdiPlus, mdiVideo, mdiVolumeHigh,
} from "@mdi/js";
import { balloons } from "../phone/balloons";
import "./phone.css";

type Call = { contact?: string; type?: "missed" | "incoming" | "outgoing"; time?: string; duration?: string; order?: number; deleted?: boolean };
type Contact = { name?: string; phone?: string; photo?: string; order?: number; deleted?: boolean };
type Voicemail = { contact?: string; duration?: string; time?: string; transcript?: string; order?: number; deleted?: boolean };

// ── écran d'appel (partagé) ──────────────────────────────────────────────────
function CallScreen({ name, onEnd }: { name: string; onEnd: () => void }) {
  const os = useOS();
  const [t, setT] = useState(0);
  useEffect(() => { const h = setInterval(() => setT((n) => n + 1), 1000); return () => clearInterval(h); }, []);
  const status = t < 3 ? (os === "ios" ? "calling…" : "Appel en cours…") : `${Math.floor((t - 3) / 60)}:${String((t - 3) % 60).padStart(2, "0")}`;
  return (
    <div className={`ph-call ${os}`}>
      <StatusBar variant="translucent" />
      <div className="ph-call-top"><b>{name}</b><span>{status}</span></div>
      <div className="ph-call-mid">
        {os === "ios" ? (
          <div className="ph-call-grid">{([["mute", mdiMicrophoneOff], ["keypad", mdiDialpad], ["speaker", mdiVolumeHigh], ["add call", mdiPlus], ["FaceTime", mdiVideo], ["contacts", mdiAccountBox]] as const).map(([l, g]) => <button key={l} onClick={(e) => balloons(e.currentTarget)}><Glyph i={g} size={34} />{l}</button>)}</div>
        ) : <Avatar name={name} size={140} round={false} />}
      </div>
      <button className="ph-end" onClick={onEnd}><Glyph i={mdiPhoneHangup} size={os === "ios" ? 30 : 32} />{os === "ios" ? "End" : ""}</button>
    </div>
  );
}

function useCalling() {
  const [calling, setCalling] = useState<string | null>(null);
  return { calling, call: (n: string) => setCalling(n), ui: calling ? <CallScreen name={calling} onEnd={() => setCalling(null)} /> : null };
}

// ── Téléphone ────────────────────────────────────────────────────────────────
const TABS: Tab[] = [
  { id: "favorites", label: "Favorites", icon: "star" },
  { id: "recents", label: "Recents", icon: "clock" },
  { id: "contacts", label: "Contacts", icon: "person" },
  { id: "keypad", label: "Keypad", icon: "keypad" },
  { id: "voicemail", label: "Voicemail", icon: "voicemail" },
];
const ANDROID_TABS: Tab[] = [
  { id: "keypad", label: "Téléphone", icon: "keypad" },
  { id: "recents", label: "Journal", icon: "clock" },
  { id: "contacts", label: "Contacts", icon: "person" },
];

export default function PhoneApp({ pid }: { pid: string }) {
  return (
    <Routes>
      <Route index element={<PhoneHome pid={pid} />} />
      <Route path="contact/:id" element={<ContactCard pid={pid} back="phone" />} />
    </Routes>
  );
}

function PhoneHome({ pid }: { pid: string }) {
  const os = useOS();
  const [tab, setTab] = useState(() => sessionStorage.getItem("phone-tab") ?? "recents");
  useEffect(() => { try { sessionStorage.setItem("phone-tab", tab); } catch { /* rien */ } }, [tab]);
  const c = useCalling();
  const ed = useEditor(pid);
  const stamp = useLoreStamp();
  const titles: Record<string, string> = { favorites: "Favorites", recents: "Recents", contacts: "All Contacts", keypad: os === "ios" ? "Keypad" : "Téléphone", voicemail: "Voicemail" };
  const addCall = () => ed.add(`phones/${pid}/data/calls`, { contact: "", type: "missed", time: stamp, duration: "" }, { atStart: true, title: "Nouvel appel", fields: ["contact", "type", "time", "duration"] });
  return (
    <AppFrame title={titles[tab]} left={<BackButton to={`/${pid}/home`} label="Accueil" />}
      right={tab === "recents" ? <AddButton show={ed.canEdit} onClick={addCall} /> : tab === "contacts" ? <AddButton show={ed.canEdit} onClick={() => ed.add(`phones/${pid}/data/contacts`, { name: "", phone: "", photo: "" }, { title: "Nouveau contact", fields: ["name", "phone", "photo"] })} /> : undefined}
      bodyClass="k-body-tabbed">
      <TabBar tabs={os === "ios" ? TABS : ANDROID_TABS} active={tab} onChange={setTab} />
      <div className="k-tab-scroll">
        {tab === "recents" && <Recents pid={pid} onCall={c.call} ed={ed} />}
        {tab === "contacts" && <ContactList pid={pid} base="phone" onCall={c.call} />}
        {tab === "keypad" && <Keypad onCall={c.call} />}
        {tab === "voicemail" && <Voicemails pid={pid} ed={ed} />}
        {tab === "favorites" && <Favorites pid={pid} onCall={c.call} />}
      </div>
      {c.ui}
      {ed.ui}
    </AppFrame>
  );
}

function Recents({ pid, onCall, ed }: { pid: string; onCall: (n: string) => void; ed: ReturnType<typeof useEditor> }) {
  const os = useOS();
  const calls = useList<Call>(`phones/${pid}/data/calls`, { newest: "time" });
  const lore = useValue<string>("meta/loreDate") || LORE_DATE_DEFAULT;
  const [filter, setFilter] = useState("all");
  const rows = calls.filter(([, c]) => filter === "all" || c.type === "missed");
  return (
    <>
      <Segmented items={[{ id: "all", label: os === "ios" ? "All" : "Tous" }, { id: "missed", label: os === "ios" ? "Missed" : "Manqués" }]} value={filter} onChange={setFilter} />
      <Plain>
        {rows.map(([id, c]) => (
          <Cell key={id} className={c.type === "missed" ? "missed" : ""}
            icon={os === "android"
              ? <span className={`ph-dir ${c.type}`}><Glyph i={c.type === "missed" ? mdiCallMissed : c.type === "incoming" ? mdiCallReceived : mdiCallMade} size={20} /></span>
              : c.type === "outgoing" ? <span className="ph-out"><Glyph i={mdiPhoneOutgoing} size={14} /></span> : <span className="ph-out" />}
            title={c.contact || "Unknown"} subtitle={c.duration ? (os === "ios" ? "mobile" : c.duration) : (os === "ios" ? "mobile" : "")}
            detail={inboxLabel(loreToMs(c.time), loreNowMs(lore))}
            onClick={() => c.contact && onCall(c.contact)}
            onLong={ed.itemLong(`phones/${pid}/data/calls`, id, { label: c.contact, fields: ["contact", "type", "time", "duration"] })} />
        ))}
        {rows.length === 0 && <Empty>No Recents</Empty>}
      </Plain>
    </>
  );
}

function Favorites({ pid, onCall }: { pid: string; onCall: (n: string) => void }) {
  const calls = useList<Call>(`phones/${pid}/data/calls`);
  // Favoris = contacts les plus appelés.
  const counts = new Map<string, number>();
  for (const [, c] of calls) if (c.contact) counts.set(c.contact, (counts.get(c.contact) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  return <Plain>{top.map(([n]) => <Cell key={n} title={n} detail="mobile" onClick={() => onCall(n)} />)}{top.length === 0 && <Empty>No Favorites</Empty>}</Plain>;
}

function Voicemails({ pid, ed }: { pid: string; ed: ReturnType<typeof useEditor> }) {
  const vms = useList<Voicemail>(`phones/${pid}/data/voicemails`, { newest: "time" });
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Plain>
      {vms.map(([id, v]) => (
        <div key={id}>
          <Cell title={v.contact ?? "Unknown"} subtitle={v.time} detail={v.duration} icon={<span className="ph-vm-dot" />} onClick={() => setOpen(open === id ? null : id)}
            onLong={ed.itemLong(`phones/${pid}/data/voicemails`, id, { fields: ["contact", "time", "duration", "transcript"] })} />
          {open === id && (
            <div className="ph-vm-player">
              <div className="ph-vm-track"><i /></div>
              {v.transcript ? <p>« {v.transcript} »</p> : <p className="muted">Transcription non disponible</p>}
            </div>
          )}
        </div>
      ))}
      {vms.length === 0 && <Empty>No Voicemail</Empty>}
    </Plain>
  );
}

function Keypad({ onCall }: { onCall: (n: string) => void }) {
  const os = useOS();
  const [num, setNum] = useState("");
  const keys: [string, string][] = [["1", ""], ["2", "ABC"], ["3", "DEF"], ["4", "GHI"], ["5", "JKL"], ["6", "MNO"], ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"], ["*", ""], ["0", "+"], ["#", ""]];
  return (
    <div className={`ph-keypad ${os}`}>
      <div className="ph-display">{num || " "}</div>
      <div className="ph-keys">
        {keys.map(([k, l]) => <button key={k} onClick={() => setNum((n) => (n + k).slice(0, 16))}><b>{k}</b><small>{l}</small></button>)}
      </div>
      <div className="ph-keyrow">
        <button className="ph-addc" aria-label="Ajouter un contact"><Glyph i={mdiAccountPlus} size={26} /></button>
        <button className="ph-callbtn" onClick={(e) => { balloons(e.currentTarget); if (num) onCall(num); }}><Glyph i={mdiPhone} size={26} />{os === "ios" && <span>Call</span>}</button>
        <button className="ph-del" onClick={() => setNum((n) => n.slice(0, -1))} aria-label="Effacer"><Glyph i={mdiBackspace} size={26} /></button>
      </div>
    </div>
  );
}

// ── Contacts (partagé : onglet de Téléphone et app Contacts) ─────────────────
export function ContactList({ pid, base, onCall }: { pid: string; base: string; onCall?: (n: string) => void }) {
  const os = useOS();
  const nav = useNavigate();
  const contacts = useList<Contact>(`phones/${pid}/data/contacts`);
  const calls = useList<Call>(`phones/${pid}/data/calls`);
  const ed = useEditor(pid);
  // Pas de carnet ? On déduit les contacts du journal d'appels (comme l'app d'origine).
  const rows: [string, Contact][] = contacts.length ? contacts
    : [...new Set(calls.map(([, c]) => c.contact).filter(Boolean))].map((n) => [`call:${n}`, { name: n }] as [string, Contact]);
  const sorted = [...rows].sort((a, b) => (a[1].name ?? "").localeCompare(b[1].name ?? "", "fr"));
  const groups = new Map<string, [string, Contact][]>();
  for (const r of sorted) { const l = (r[1].name ?? "#").normalize("NFD")[0]?.toUpperCase().replace(/[^A-Z]/, "#") ?? "#"; groups.set(l, [...(groups.get(l) ?? []), r]); }
  return (
    <Plain>
      {[...groups.entries()].map(([l, list]) => (
        <div key={l}>
          <PlainHeader>{l}</PlainHeader>
          {list.map(([id, c]) => (
            <Cell key={id} title={c.name ?? ""} image={os === "android" ? (c.photo ?? null) : undefined} round
              onClick={() => id.startsWith("call:") ? onCall?.(c.name ?? "") : nav(`/${pid}/${base}/contact/${id}`)}
              onLong={id.startsWith("call:") ? undefined : ed.itemLong(`phones/${pid}/data/contacts`, id, { label: c.name, fields: ["name", "phone", "photo"] })} />
          ))}
        </div>
      ))}
      {rows.length === 0 && <Empty>No Contacts</Empty>}
      {ed.ui}
    </Plain>
  );
}

function ContactCard({ pid, back }: { pid: string; back: string }) {
  const { id = "" } = useParams();
  const c = useValue<Contact>(`phones/${pid}/data/contacts/${id}`) ?? {};
  const os = useOS();
  const nav = useNavigate();
  const ed = useEditor(pid);
  const call = useCalling();
  return (
    <AppFrame title={os === "ios" ? "Info" : (c.name ?? "")} left={<BackButton to={`/${pid}/${back}`} label={back === "phone" ? "Contacts" : "All Contacts"} />}
      right={ed.canEdit ? <button className="barbtn" onClick={() => ed.edit({ path: `phones/${pid}/data/contacts/${id}`, fields: ["name", "phone", "photo"], title: "Modifier" })}>{os === "ios" ? "Edit" : <Glyph i={mdiPencil} size={22} />}</button> : undefined}>
      <Grouped className="ct-card">
        <div className="ct-head"><span className="ct-photo"><Avatar src={c.photo} name={c.name} size={64} round={false} /></span><b>{c.name}</b></div>
        <Section><Cell title={<span className="ct-lbl">mobile</span>} detail={c.phone || "—"} onClick={() => c.phone && call.call(c.name ?? c.phone)} /></Section>
        <div className="ct-actions">
          <button onClick={() => nav(`/${pid}/messages/new`)}>Send Message</button>
          <button onClick={() => call.call(c.name ?? "")}>{os === "ios" ? "FaceTime" : "Appeler"}</button>
        </div>
      </Grouped>
      {call.ui}
      {ed.ui}
    </AppFrame>
  );
}

// ── App Contacts ─────────────────────────────────────────────────────────────
export function ContactsApp({ pid }: { pid: string }) {
  return (
    <Routes>
      <Route index element={<ContactsHome pid={pid} />} />
      <Route path="contact/:id" element={<ContactCard pid={pid} back="contacts" />} />
    </Routes>
  );
}

function ContactsHome({ pid }: { pid: string }) {
  const os = useOS();
  const ed = useEditor(pid);
  return (
    <AppFrame title={os === "ios" ? "All Contacts" : "Contacts"} left={<BackButton to={`/${pid}/home`} label="Accueil" />}
      right={<AddButton show={ed.canEdit} onClick={() => ed.add(`phones/${pid}/data/contacts`, { name: "", phone: "", photo: "" }, { title: "Nouveau contact", fields: ["name", "phone", "photo"] })} />}>
      <ContactList pid={pid} base="contacts" />
      {ed.ui}
    </AppFrame>
  );
}
