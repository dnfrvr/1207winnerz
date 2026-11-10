// Régie du MDJ (pendant une séance) : envoyer une notif à un joueur au nom d'un PNJ. Le message est
// écrit pour de vrai dans le téléphone (Messages), le joueur peut répondre, et le MDJ suit et
// alimente la conversation en direct depuis cette fenêtre (un onglet par conversation).
import { mdiBullhorn, mdiCamera, mdiClose, mdiOpenInNew, mdiPlus } from "@mdi/js";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useData, useValue, useWriter } from "../data/hooks";
import type { Patches } from "../data/store";
import { findNpcThread, notifBody, notifLines, notifPatch, npcContacts, npcMessagePatches, type InboxEntry, type Msg, type Notif, type Thread } from "../data/notify";
import { Glyph } from "../kit/glyph";
import { img } from "../lib/img";
import { loreToMs } from "../lib/loreTime";
import { canUpload, uploadImage } from "../lib/upload";
import { LORE_DATE_DEFAULT } from "../phone/common";
import { useIncomingNotifs } from "../phone/Notifs";
import { PIDS } from "./Site";
import "./regie.css";

type Profile = { name?: string; avatar?: string | { src?: string } };
type Tab = { pid: string; tid: string };

const LS_TABS = "uma-v2-regie-tabs";
const LS_OPEN = "uma-v2-regie-open";
const readLS = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } };
const writeLS = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* rien */ } };

const first = (p?: Profile, pid = "") => (p?.name ?? pid).split(" ")[0];
const avatarOf = (p?: Profile) => (typeof p?.avatar === "string" ? p.avatar : p?.avatar?.src);

const sorted = (map: Record<string, Msg> | undefined) =>
  Object.entries(map ?? {}).filter(([, m]) => m && !m.deleted)
    .sort((a, b) => (loreToMs(a[1].time) ?? 0) - (loreToMs(b[1].time) ?? 0) || (a[1].order ?? 0) - (b[1].order ?? 0));

/** Petit son quand le joueur répond (la régie peut être en arrière-plan). */
const pop = () => {
  try {
    const ctx = new AudioContext(), o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = 880; g.gain.setValueAtTime(0.12, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.3); setTimeout(() => ctx.close(), 600);
  } catch { /* rien */ }
};

export function Regie() {
  const [open, setOpen] = useState(() => readLS(LS_OPEN, false));
  const [tabs, setTabs] = useState<Tab[]>(() => readLS(LS_TABS, []));
  const [active, setActive] = useState<string | null>(null); // tid, null = « Nouvelle notif »
  const [unread, setUnread] = useState<Record<string, boolean>>({});
  useEffect(() => writeLS(LS_TABS, tabs), [tabs]);
  useEffect(() => writeLS(LS_OPEN, open), [open]);

  const openTab = (t: Tab) => {
    setTabs((list) => (list.some((x) => x.tid === t.tid) ? list : [...list, t]));
    setActive(t.tid);
  };
  const closeTab = (tid: string) => { setTabs((l) => l.filter((t) => t.tid !== tid)); if (active === tid) setActive(null); };
  const onReply = (tid: string) => {
    pop();
    if (!(open && active === tid)) setUnread((u) => ({ ...u, [tid]: true }));
  };
  useEffect(() => { if (open && active) setUnread((u) => (u[active] ? { ...u, [active]: false } : u)); }, [open, active]);
  const anyUnread = Object.values(unread).some(Boolean);

  return (
    <>
      {/* Les écouteurs restent montés même fenêtre fermée : on sait quand un joueur répond. */}
      {tabs.map((t) => <ReplyWatch key={t.tid} tab={t} onReply={onReply} />)}
      <button className={`regie-fab ${anyUnread ? "ping" : ""}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Glyph i={mdiBullhorn} size={16} /> Régie{anyUnread && <i className="dot" aria-label="Nouvelle réponse" />}
      </button>
      {open && (
        <section className="regie w7-win" aria-label="Régie du MDJ">
          <header className="w7-title"><span className="w7-ico" aria-hidden><Glyph i={mdiBullhorn} size={15} /></span><h2>Régie MDJ — notifs en direct</h2>
            <button className="regie-x" onClick={() => setOpen(false)} aria-label="Fermer la régie"><Glyph i={mdiClose} size={14} /></button></header>
          <div className="w7-body">
            <nav className="regie-tabs" role="tablist">
              <button role="tab" aria-selected={active === null} className={active === null ? "on" : ""} onClick={() => setActive(null)}><Glyph i={mdiPlus} size={14} /> Nouvelle</button>
              {tabs.map((t) => <TabButton key={t.tid} tab={t} on={active === t.tid} dot={!!unread[t.tid]} onClick={() => setActive(t.tid)} onClose={() => closeTab(t.tid)} />)}
            </nav>
            {active === null
              ? <NewNotif onSent={openTab} />
              : (() => { const t = tabs.find((x) => x.tid === active); return t ? <LiveThread key={t.tid} tab={t} onGone={() => closeTab(t.tid)} /> : null; })()}
          </div>
        </section>
      )}
    </>
  );
}

/** Repère les nouveaux messages du joueur dans un fil suivi. */
function ReplyWatch({ tab, onReply }: { tab: Tab; onReply: (tid: string) => void }) {
  const { store } = useData();
  useEffect(() => {
    let known: Set<string> | null = null;
    return store.subscribe(`threadMessages/${tab.tid}`, (v) => {
      const map = (v ?? {}) as Record<string, Msg>;
      if (!known) { known = new Set(Object.keys(map)); return; }
      const fresh = Object.entries(map).some(([id, m]) => !known!.has(id) && m?.from === tab.pid);
      Object.keys(map).forEach((id) => known!.add(id));
      if (fresh) onReply(tab.tid);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, tab.tid, tab.pid]);
  return null;
}

function useContact(tab: Tab) {
  const thread = useValue<Thread>(`threads/${tab.tid}`);
  const entry = useValue<InboxEntry>(`phones/${tab.pid}/inbox/${tab.tid}`);
  return entry?.contact || thread?.contact || "?";
}

function TabButton({ tab, on, dot, onClick, onClose }: { tab: Tab; on: boolean; dot: boolean; onClick: () => void; onClose: () => void }) {
  const contact = useContact(tab);
  const p = useValue<Profile>(`phones/${tab.pid}/profile`);
  return (
    <span className={`regie-tab ${on ? "on" : ""}`} role="tab" aria-selected={on}>
      <button onClick={onClick}>{contact} → {first(p, tab.pid)}{dot && <i className="dot" aria-label="Nouvelle réponse" />}</button>
      <button className="close" onClick={onClose} aria-label={`Fermer l'onglet ${contact}`}><Glyph i={mdiClose} size={11} /></button>
    </span>
  );
}

function PlayerPick({ value, onChange }: { value: string; onChange: (p: string) => void }) {
  return (
    <div className="regie-players" role="radiogroup" aria-label="Téléphone">
      {PIDS.map((p) => <PlayerChip key={p} pid={p} on={value === p} onClick={() => onChange(p)} />)}
    </div>
  );
}
function PlayerChip({ pid, on, onClick }: { pid: string; on: boolean; onClick: () => void }) {
  const p = useValue<Profile>(`phones/${pid}/profile`);
  const av = avatarOf(p);
  return (
    <button role="radio" aria-checked={on} className={on ? "on" : ""} onClick={onClick}>
      <span className="dp sm">{av ? <img src={img(av)} alt="" /> : <span>{first(p, pid)[0]}</span>}</span>{first(p, pid)}
    </button>
  );
}

function PhotoPick({ pid, value, onChange }: { pid: string; value: string | null; onChange: (u: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  if (!canUpload) return null;
  return (
    <label className={`regie-photo ${value ? "has" : ""}`} title="Joindre une photo">
      {value ? <img src={img(value)} alt="Photo jointe" /> : <Glyph i={mdiCamera} size={18} />}
      {busy && <span className="spin" />}
      <input type="file" accept="image/*" hidden onChange={async (e) => {
        const f = e.target.files?.[0]; e.target.value = "";
        if (!f) return;
        setBusy(true);
        try { onChange(await uploadImage(f, pid)); } catch { alert("Envoi de la photo impossible."); } finally { setBusy(false); }
      }} />
      {value && <button type="button" className="rm" onClick={(e) => { e.preventDefault(); onChange(null); }} aria-label="Retirer la photo"><Glyph i={mdiClose} size={10} /></button>}
    </label>
  );
}

/** Formulaire : téléphone, app, contact PNJ, texte. */
function NewNotif({ onSent }: { onSent: (t: Tab) => void }) {
  const [pid, setPid] = useState<string>(PIDS[1]);
  const [contact, setContact] = useState("");
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const threads = useValue<Record<string, Thread>>("threads");
  const inbox = useValue<Record<string, InboxEntry>>(`phones/${pid}/inbox`);
  const lore = useValue<string>("meta/loreDate") || LORE_DATE_DEFAULT;
  const contacts = useMemo(() => npcContacts(pid, threads, inbox), [pid, threads, inbox]);
  const tid = contact.trim() ? findNpcThread(pid, contact, threads, inbox) : null;
  const msgs = useValue<Record<string, Msg>>(tid ? `threadMessages/${tid}` : null);
  const { write } = useWriter(pid);
  const p = useValue<Profile>(`phones/${pid}/profile`);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const c = contact.trim();
    if (!c || (!text.trim() && !photo)) return;
    const { patches, tid: t } = npcMessagePatches({ pid, contact: c, text: text.trim(), img: photo ?? undefined, lore, tid, msgs });
    write(patches);
    setText(""); setPhoto(null);
    onSent({ pid, tid: t });
  };

  return (
    <form className="regie-form" onSubmit={submit}>
      <span className="lbl">Téléphone</span>
      <PlayerPick value={pid} onChange={setPid} />
      <label className="lbl" htmlFor="regie-app">App</label>
      <select id="regie-app" value="messages" onChange={() => {}}>
        <option value="messages">Messages (SMS)</option>
      </select>
      <label className="lbl" htmlFor="regie-contact">De la part de</label>
      <input id="regie-contact" list="regie-contacts" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="ex. Jeongguk" autoComplete="off" required />
      <datalist id="regie-contacts">{contacts.map((c) => <option key={c.tid} value={c.contact} />)}</datalist>
      <small className="hint">{!contact.trim() ? `${contacts.length} contacts dans le téléphone de ${first(p, pid)}.` : tid ? "Conversation existante : le message s'ajoute à la suite." : "Nouveau contact : une conversation est créée."}</small>
      <label className="lbl" htmlFor="regie-text">Message</label>
      <div className="regie-compose">
        <textarea id="regie-text" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Texte du SMS"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} />
        <PhotoPick pid={pid} value={photo} onChange={setPhoto} />
      </div>
      <button className="y2k-btn" disabled={!contact.trim() || (!text.trim() && !photo)}>Envoyer la notif à {first(p, pid)}</button>
    </form>
  );
}

/** Conversation suivie en direct : le MDJ répond au nom du PNJ. */
function LiveThread({ tab, onGone }: { tab: Tab; onGone: () => void }) {
  const { pid, tid } = tab;
  const contact = useContact(tab);
  const raw = useValue<Record<string, Msg>>(`threadMessages/${tid}`);
  const thread = useValue<Thread>(`threads/${tid}`);
  const notifs = useValue<Record<string, Notif>>(`phones/${pid}/notifs`);
  const lore = useValue<string>("meta/loreDate") || LORE_DATE_DEFAULT;
  const p = useValue<Profile>(`phones/${pid}/profile`);
  const { write } = useWriter(pid);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const msgs = useMemo(() => sorted(raw).slice(-40), [raw]);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { box.current?.scrollTo({ top: 1e9 }); }, [msgs.length]);

  // « Vu » : la dernière notif de ce fil a été ouverte par le joueur.
  const lastNotif = Object.values(notifs ?? {}).filter((n) => n?.thread === tid).sort((a, b) => b.at - a.at)[0];
  const lastId = msgs[msgs.length - 1]?.[0];

  const send = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !photo) return;
    const { patches } = npcMessagePatches({ pid, contact, text: text.trim(), img: photo ?? undefined, lore, tid, msgs: raw });
    write(patches);
    setText(""); setPhoto(null);
  };
  const nudge = () => write(notifPatch(pid, { app: "messages", title: contact, body: notifBody(msgs[msgs.length - 1]?.[1].text), ...(msgs[msgs.length - 1]?.[1].img ? { attach: 1 } : {}), link: `messages/${tid}`, thread: tid, ...(lastId ? { msg: lastId } : {}) }));

  // Annuler l'envoi : supprime définitivement le dernier message du PNJ et sa notif. Fil vidé → la conversation
  // disparaît du téléphone (fil, entrée de la boîte, notifs). Uniquement pour les fils PNJ.
  const lastNpc = [...msgs].reverse().find(([, m]) => m.from === "npc");
  const undo = () => {
    if (!lastNpc || thread?.kind !== "local") return;
    const all = sorted(raw);
    // Photo + texte envoyés ensemble : on annule les deux bulles.
    const ids = [lastNpc[0], ...(lastNpc[1].pair && raw?.[lastNpc[1].pair] ? [lastNpc[1].pair] : [])];
    const empty = all.length <= ids.length;
    const what = `« ${(lastNpc[1].text || "photo").slice(0, 60)} »${ids.length > 1 ? " et sa photo" : ""}`;
    if (!confirm(empty
      ? `Supprimer définitivement ${what} ? C'est le seul message : la conversation avec ${contact} disparaît du téléphone de ${first(p, pid)}, notifs comprises. Impossible d'annuler.`
      : `Supprimer définitivement ${what} du téléphone de ${first(p, pid)}, avec sa notif ? Impossible d'annuler.`)) return;
    const mine = Object.entries(notifs ?? {}).filter(([, n]) => n?.thread === tid).sort((a, b) => b[1].at - a[1].at);
    const patch: Patches = {};
    if (empty) {
      for (const id of Object.keys(raw ?? {})) patch[`threadMessages/${tid}/${id}`] = null;
      patch[`threads/${tid}`] = null;
      patch[`phones/${pid}/inbox/${tid}`] = null;
      for (const [id] of mine) patch[`phones/${pid}/notifs/${id}`] = null;
    } else {
      for (const id of ids) patch[`threadMessages/${tid}/${id}`] = null;
      // La notif de ce message ; anciennes notifs (sans lien vers le message) : la plus récente non liée.
      const linked = mine.filter(([, n]) => !!n.msg && ids.includes(n.msg));
      for (const [id] of linked.length ? linked : mine.filter(([, n]) => !n.msg).slice(0, 1)) patch[`phones/${pid}/notifs/${id}`] = null;
    }
    write(patch);
    if (empty) onGone();
  };

  // Ménage : retire les notifs en attente de ce fil (les messages restent).
  const pendingNotifs = Object.entries(notifs ?? {}).filter(([, n]) => n?.thread === tid && !n.seen);
  const clearNotifs = () => {
    const patch: Patches = {};
    for (const [id] of pendingNotifs) patch[`phones/${pid}/notifs/${id}`] = null;
    write(patch);
  };

  return (
    <div className="regie-live">
      <div className="regie-live-head">
        <b>{contact}</b> ↔ {first(p, pid)}
        <Link to={`/${pid}/messages/${tid}`} className="linkish" title="Ouvrir la conversation dans le téléphone"><Glyph i={mdiOpenInNew} size={13} /> Voir dans le téléphone</Link>
      </div>
      <div className="regie-msgs" ref={box}>
        {msgs.length === 0 && <p className="hint">Aucun message.</p>}
        {msgs.map(([id, m]) => {
          const npc = m.from === "npc";
          return (
            <div key={id} className={`regie-msg ${npc ? "npc" : "player"}`}>
              {m.img && <img src={img(m.img)} alt="" />}
              {m.text && <span>{m.text}</span>}
              <small>{npc ? contact : m.from === pid ? first(p, pid) : m.from} · {m.time}</small>
              {npc && id === lastId && lastNotif && <small className="seen">{lastNotif.seen ? "Vu" : "Notif envoyée, pas encore ouverte"}</small>}
            </div>
          );
        })}
      </div>
      <form className="regie-compose" onSubmit={send}>
        <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder={`Répondre en tant que ${contact}…`} aria-label={`Répondre en tant que ${contact}`}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} />
        <PhotoPick pid={pid} value={photo} onChange={setPhoto} />
        <button className="y2k-btn" disabled={!text.trim() && !photo}>Envoyer</button>
      </form>
      <div className="regie-actions">
        <button className="linkish" onClick={nudge}>Renvoyer une notif</button>
        {pendingNotifs.length > 0 && <button className="linkish" onClick={clearNotifs}>Effacer les notifs ({pendingNotifs.length})</button>}
        {thread?.kind === "local" && lastNpc && <button className="linkish danger" onClick={undo}>Annuler l'envoi du dernier message</button>}
      </div>
    </div>
  );
}

/** Joueur sur l'accueil ou sur un autre téléphone : une bulle signale la notif reçue sur le sien. */
export function PlayerTray({ pid }: { pid: string }) {
  const { current, shift } = useIncomingNotifs(pid);
  const loc = useLocation();
  const nav = useNavigate();
  const p = useValue<Profile>(`phones/${pid}/profile`);
  const onMine = loc.pathname === `/${pid}` || loc.pathname.startsWith(`/${pid}/`);
  useEffect(() => {
    if (!current) return;
    if (onMine) { shift(); return; } // le téléphone affiche sa propre bannière
    const t = setTimeout(shift, 8000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.[0], onMine]);
  if (!current || onMine) return null;
  const [, n] = current;
  const av = avatarOf(p);
  return (
    <button className="tray-balloon" onClick={() => { shift(); nav(`/${pid}`); }}>
      {av && <img src={img(av)} alt="" />}
      <span className="txt"><b>{n.title}</b><span>{notifLines(n, "ios").oneLine}</span><small>Nouveau message sur ton téléphone — clique pour l'ouvrir</small></span>
    </button>
  );
}
