// Régie du MDJ (pendant une séance) : envoyer une notif à un joueur au nom d'un PNJ. Le contenu est
// écrit pour de vrai dans le téléphone (Messages, Messenger, GroupMe, Kik, Grindr, Mail, Snapchat,
// appel manqué, activité Instagram) ; pour les apps de discussion, le joueur peut répondre et le MDJ
// suit et alimente la conversation en direct depuis cette fenêtre (un onglet par conversation).
import { mdiBullhorn, mdiCamera, mdiClose, mdiOpenInNew, mdiPlus, mdiWindowMaximize, mdiWindowMinimize, mdiWindowRestore } from "@mdi/js";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useData, useValue } from "../data/hooks";
import type { Patches } from "../data/store";
import { findNpcThread, groupMessagePatches, type GroupSender, notifBody, notifLines, notifPatch, npcContacts, npcMessagePatches, sharedGroups, type InboxEntry, type Msg, type Notif, type Thread } from "../data/notify";
import { Glyph } from "../kit/glyph";
import { img } from "../lib/img";
import { loreToMs } from "../lib/loreTime";
import { canUpload, uploadImage } from "../lib/upload";
import { LORE_DATE_DEFAULT } from "../phone/common";
import { useIncomingNotifs } from "../phone/Notifs";
import { PIDS } from "./Site";
import { callPath, duration, endCallPatches, RING_MS, startCallPatches, type LiveCall } from "../data/call";
import { CHANNELS, channelOf, INSTA_ACTIONS, type Channel, type Field, type LiveMsg } from "../data/channels";
import { AlsoPick, Cues, Journal, NpcBook, NpcHint, NpcOptions, Overview, useFirstNames, usePresence, useRegieWriter, useSendAlso } from "./RegieTools";
import "./regie.css";

type Profile = { name?: string; avatar?: string | { src?: string } };
type Tab = { pid: string; tid: string; app?: string }; // app absente = Messages
/** Identité d'un onglet : deux apps peuvent avoir le même id d'élément (« k1 » dans GroupMe et Grindr). */
const tkey = (t: Tab) => `${t.app ?? "messages"}:${t.pid}:${t.tid}`;

const LS_TABS = "uma-v2-regie-tabs";
/** Onglets fixes de la régie, après « Nouvelle ». */
const TOOLS: [string, string][] = [["tool:cues", "Scénarios"], ["tool:players", "Joueurs"], ["tool:npcs", "PNJ"], ["tool:log", "Journal"]];
const LS_OPEN = "uma-v2-regie-open";
const LS_MIN = "uma-v2-regie-min";
const LS_BIG = "uma-v2-regie-big";
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
  // Réduite : seule la barre de titre reste (sur téléphone, on voit l'écran du perso derrière).
  const [min, setMin] = useState(() => readLS(LS_MIN, false));
  useEffect(() => writeLS(LS_MIN, min), [min]);
  const [big, setBig] = useState(() => readLS(LS_BIG, false));
  useEffect(() => writeLS(LS_BIG, big), [big]);
  useEffect(() => writeLS(LS_TABS, tabs), [tabs]);
  useEffect(() => writeLS(LS_OPEN, open), [open]);

  /** `focus` = false : l'onglet s'ajoute sans quitter la vue en cours (scénarios). */
  const openTab = (t: Tab, focus = true) => {
    setTabs((list) => (list.some((x) => tkey(x) === tkey(t)) ? list : [...list, t]));
    if (focus) setActive(tkey(t));
  };
  const closeTab = (k: string) => { setTabs((l) => l.filter((t) => tkey(t) !== k)); if (active === k) setActive(null); };
  // Les écouteurs gardent la fonction du moment où ils ont été montés : on lit l'état à jour dans une ref.
  const view = useRef({ open, active });
  view.current = { open, active };
  const onReply = (k: string) => {
    pop();
    if (!(view.current.open && view.current.active === k)) setUnread((u) => ({ ...u, [k]: true }));
  };
  useEffect(() => { if (open && active) setUnread((u) => (u[active] ? { ...u, [active]: false } : u)); }, [open, active]);
  const anyUnread = Object.values(unread).some(Boolean);

  return (
    <>
      {/* Les écouteurs restent montés même fenêtre fermée : on sait quand un joueur répond. */}
      {tabs.map((t) => (t.app === "call" ? <CallWatch key={tkey(t)} tab={t} onReply={() => onReply(tkey(t))} /> : t.app === "group" ? <GroupReplyWatch key={tkey(t)} tab={t} onReply={() => onReply(tkey(t))} />
        : channelOf(t.app) ? <ChannelReplyWatch key={tkey(t)} tab={t} ch={channelOf(t.app)!} onReply={() => onReply(tkey(t))} /> : <ReplyWatch key={tkey(t)} tab={t} onReply={() => onReply(tkey(t))} />))}
      <button className={`regie-fab ${anyUnread ? "ping" : ""}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Glyph i={mdiBullhorn} size={16} /> Régie{anyUnread && <i className="dot" aria-label="Nouvelle réponse" />}
      </button>
      {open && (
        <section className={`regie w7-win ${min ? "min" : big ? "big" : ""}`} aria-label="Régie du MDJ">
          <header className="w7-title"><span className="w7-ico" aria-hidden><Glyph i={mdiBullhorn} size={15} /></span>
            <h2 onClick={() => min && setMin(false)}>Régie MDJ{anyUnread && min ? " — nouvelle réponse" : ""}</h2>
            <button className="regie-min" onClick={() => setMin((m) => !m)} aria-label={min ? "Agrandir la régie" : "Réduire la régie"} aria-expanded={!min}>
              <Glyph i={min ? mdiWindowRestore : mdiWindowMinimize} size={13} /></button>
            {!min && <button className="regie-min regie-big" onClick={() => setBig((b) => !b)} aria-label={big ? "Rétablir la taille de la régie" : "Agrandir la régie"} aria-pressed={big} title={big ? "Rétablir" : "Agrandir"}>
              <Glyph i={big ? mdiWindowRestore : mdiWindowMaximize} size={13} /></button>}
            <button className="regie-x" onClick={() => setOpen(false)} aria-label="Fermer la régie"><Glyph i={mdiClose} size={14} /></button></header>
          {!min && <div className="w7-body">
            <nav className="regie-tabs" role="tablist">
              <button role="tab" aria-selected={active === null} className={active === null ? "on" : ""} onClick={() => setActive(null)}><Glyph i={mdiPlus} size={14} /> Nouvelle</button>
              {TOOLS.map(([k, label]) => <button key={k} role="tab" aria-selected={active === k} className={active === k ? "on" : ""} onClick={() => setActive(k)}>{label}</button>)}
              {tabs.map((t) => <TabButton key={tkey(t)} tab={t} on={active === tkey(t)} dot={!!unread[tkey(t)]} onClick={() => setActive(tkey(t))} onClose={() => closeTab(tkey(t))} />)}
            </nav>
            {active === null
              ? <NewNotif onSent={openTab} />
              : active === "tool:npcs" ? <NpcBook />
              : active === "tool:cues" ? <Cues onSent={(t) => openTab(t, false)} />
              : active === "tool:players" ? <Overview />
              : active === "tool:log" ? <Journal />
              : (() => { const t = tabs.find((x) => tkey(x) === active); if (!t) return null;
                  if (t.app === "group") return <GroupLive key={tkey(t)} tab={t} />;
                  if (t.app === "call") return <CallLive key={tkey(t)} tab={t} onSent={openTab} />;
                  const ch = channelOf(t.app);
                  return ch ? <ChannelLive key={tkey(t)} tab={t} ch={ch} onGone={() => closeTab(tkey(t))} /> : <LiveThread key={tkey(t)} tab={t} onGone={() => closeTab(tkey(t))} />; })()}
          </div>}
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
  const ch = channelOf(tab.app);
  const item = useValue<Record<string, never>>(ch ? `${ch.listPath(tab.pid)}/${tab.tid}` : null);
  const npc = useContact(tab);
  const callLog = useValue<{ contact?: string }>(tab.app === "call" ? `phones/${tab.pid}/data/calls/call_${tab.tid}` : null);
  const liveCall = useValue<LiveCall>(tab.app === "call" ? callPath(tab.pid) : null);
  const contact = ch ? `${ch.label.split(" ")[0]} · ${ch.titleOf(item).slice(0, 24)}` : tab.app === "group" ? `👥 ${npc}`
    : tab.app === "call" ? `📞 ${(liveCall?.id === tab.tid ? liveCall.contact : callLog?.contact) ?? "Appel"}` : npc;
  const p = useValue<Profile>(`phones/${tab.pid}/profile`);
  return (
    <span className={`regie-tab ${on ? "on" : ""}`} role="tab" aria-selected={on}>
      <button onClick={onClick}>{contact}{tab.app === "group" ? "" : ` → ${first(p, tab.pid)}`}{dot && <i className="dot" aria-label="Nouvelle réponse" />}</button>
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
  const [app, setApp] = useState("messages");
  const home = useValue<{ apps?: string[]; dock?: string[] }>(`phones/${pid}/home`);
  const installed = new Set([...(home?.apps ?? []), ...(home?.dock ?? [])]);
  const available = CHANNELS.filter((c) => installed.has(c.needs ?? c.app));
  const ch = channelOf(app);
  const groups = useSharedGroups();
  const group = app.startsWith("group:") ? groups.find((g) => `group:${g.tid}` === app) : undefined;
  useEffect(() => { if (ch && !installed.has(ch.needs ?? app)) setApp("messages"); }); // app absente de ce téléphone
  const [also, setAlso] = useState<string[]>([]);
  const sendAlso = useSendAlso();
  const [contact, setContact] = useState("");
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const threads = useValue<Record<string, Thread>>("threads");
  const inbox = useValue<Record<string, InboxEntry>>(`phones/${pid}/inbox`);
  const lore = useValue<string>("meta/loreDate") || LORE_DATE_DEFAULT;
  const contacts = useMemo(() => npcContacts(pid, threads, inbox), [pid, threads, inbox]);
  const tid = contact.trim() ? findNpcThread(pid, contact, threads, inbox) : null;
  const msgs = useValue<Record<string, Msg>>(tid ? `threadMessages/${tid}` : null);
  const { write } = useRegieWriter(pid);
  const p = useValue<Profile>(`phones/${pid}/profile`);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const c = contact.trim();
    if (!c || (!text.trim() && !photo)) return;
    const { patches, tid: t } = npcMessagePatches({ pid, contact: c, text: text.trim(), img: photo ?? undefined, lore, tid, msgs });
    write(patches);
    if (also.length) sendAlso(also, { app: "messages", contact: c, text: text.trim(), img: photo ?? undefined });
    setText(""); setPhoto(null);
    onSent({ pid, tid: t });
  };

  return (
    <div className="regie-form">
      {!app.startsWith("group:") && <><span className="lbl">Téléphone</span>
      <PlayerPick value={pid} onChange={setPid} /></>}
      <label className="lbl" htmlFor="regie-app">App</label>
      <select id="regie-app" value={app} onChange={(e) => setApp(e.target.value)}>
        <option value="messages">Messages (SMS)</option>
        {groups.map((g) => <option key={g.tid} value={`group:${g.tid}`}>Messages — groupe « {g.name} » (tous)</option>)}
        <option value="group:new">Messages — nouveau groupe…</option>
        {installed.has("phone") && <option value="call">Téléphone — appel entrant</option>}
        {available.map((c) => <option key={c.app} value={c.app}>{c.label}</option>)}
      </select>
      {(app === "messages" || ch) && <AlsoPick pid={pid} value={also} onChange={setAlso} />}
      {app === "call" ? <CallForm key={pid} pid={pid} onSent={onSent} /> : app === "group:new" ? <NewGroup onCreated={(tid) => setApp(`group:${tid}`)} /> : group ? <GroupForm key={group.tid} group={group} onSent={onSent} /> : ch ? <ChannelForm key={`${pid}-${app}`} pid={pid} ch={ch} also={also} onSent={onSent} /> : <form className="regie-sub" onSubmit={submit}>
      <label className="lbl" htmlFor="regie-contact">De la part de</label>
      <input id="regie-contact" list="regie-contacts" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="ex. Jeongguk" autoComplete="off" required />
      <datalist id="regie-contacts">{contacts.map((c) => <option key={c.tid} value={c.contact} />)}<NpcOptions known={contacts.map((c) => c.contact)} /></datalist>
      <NpcHint name={contact} />
      <small className="hint">{!contact.trim() ? `${contacts.length} contacts dans le téléphone de ${first(p, pid)}.` : tid ? "Conversation existante : le message s'ajoute à la suite." : "Nouveau contact : une conversation est créée."}</small>
      <label className="lbl" htmlFor="regie-text">Message</label>
      <div className="regie-compose">
        <textarea id="regie-text" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Texte du SMS"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} />
        <PhotoPick pid={pid} value={photo} onChange={setPhoto} />
      </div>
      <button className="y2k-btn" disabled={!contact.trim() || (!text.trim() && !photo)}>Envoyer la notif à {first(p, pid)}{also.length ? ` (+${also.length})` : ""}</button>
      </form>}
    </div>
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
  const { write } = useRegieWriter(pid);
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
  usePresence(pid, onMine ? loc.pathname : "");
  useEffect(() => {
    if (!current) return;
    if (onMine) { shift(); return; } // le téléphone affiche sa propre bannière
    const t = setTimeout(shift, 8000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.[0], onMine]);
  const call = useValue<LiveCall>(callPath(pid));
  const ringing = !!call && call.state === "ringing" && Date.now() - call.startedAt < RING_MS + 15_000;
  if (ringing && !onMine) return (
    <button className="tray-balloon ring" onClick={() => nav(`/${pid}`)}>
      <span className="txt"><b>📞 Appel entrant : {call.contact}</b><small>Ton téléphone sonne — clique pour répondre</small></span>
    </button>
  );
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

// ─── Autres apps (canaux) ────────────────────────────────────────────────────
const enterSends = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); }
};

/** Formulaire d'une app : champs propres à l'app (expéditeur, membre du groupe, objet, action…). */
function ChannelForm({ pid, ch, also, onSent }: { pid: string; ch: Channel; also: string[]; onSent: (t: Tab) => void }) {
  const sendAlso = useSendAlso();
  const list = useValue<Record<string, Record<string, never>>>(ch.listPath(pid));
  const lore = useValue<string>("meta/loreDate") || LORE_DATE_DEFAULT;
  const p = useValue<Profile>(`phones/${pid}/profile`);
  const { write } = useRegieWriter(pid);
  const [contact, setContact] = useState("");
  const [sender, setSender] = useState("");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [action, setAction] = useState(INSTA_ACTIONS[0]);
  const [photo, setPhoto] = useState<string | null>(null);
  const names = useMemo(() => ch.names(list), [ch, list]);
  const has = (f: Field) => ch.fields.includes(f);
  const exists = names.some((n) => n.trim().toLowerCase() === contact.trim().toLowerCase());
  const needsText = has("text") && ch.app !== "gmail";
  const ok = !!contact.trim() && (!needsText || !!text.trim() || !!photo) && (!has("sender") || !!sender.trim());

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ok) return;
    const { patches, key } = ch.send(pid, { contact: contact.trim(), text, img: photo ?? undefined, sender, subject, action }, list, lore);
    write(patches);
    if (also.length) sendAlso(also, { app: ch.app, contact: contact.trim(), text, img: photo ?? undefined, sender, subject, action });
    setText(""); setPhoto(null); setSubject("");
    onSent({ pid, tid: key, app: ch.app });
  };

  return (
    <form className="regie-sub" onSubmit={submit}>
      <label className="lbl" htmlFor="regie-ch-contact">{ch.contactLabel}</label>
      <input id="regie-ch-contact" list="regie-ch-names" value={contact} onChange={(e) => setContact(e.target.value)} placeholder={ch.contactHint} autoComplete="off" required />
      <datalist id="regie-ch-names">{names.map((n) => <option key={n} value={n} />)}<NpcOptions known={names} /></datalist>
      <NpcHint name={contact} />
      {ch.messages && <small className="hint">{!contact.trim() ? `${names.length} conversations dans ${ch.label.split(" ")[0]} chez ${first(p, pid)}.` : exists ? "Conversation existante : le message s'ajoute à la suite." : "Nouvelle conversation créée."}</small>}
      {has("sender") && <>
        <label className="lbl" htmlFor="regie-ch-sender">Membre qui écrit</label>
        <input id="regie-ch-sender" value={sender} onChange={(e) => setSender(e.target.value)} placeholder="ex. Prof" autoComplete="off" required />
      </>}
      {has("subject") && <>
        <label className="lbl" htmlFor="regie-ch-subject">Objet</label>
        <input id="regie-ch-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Objet du mail" autoComplete="off" />
      </>}
      {has("action") && <>
        <label className="lbl" htmlFor="regie-ch-action">Action</label>
        <input id="regie-ch-action" list="regie-ch-actions" value={action} onChange={(e) => setAction(e.target.value)} autoComplete="off" />
        <datalist id="regie-ch-actions">{INSTA_ACTIONS.map((a) => <option key={a} value={a} />)}</datalist>
        <small className="hint">Aperçu : « {contact.trim() || "compte"} {action} »</small>
      </>}
      {has("text") && <>
        <label className="lbl" htmlFor="regie-ch-text">{ch.app === "gmail" ? "Texte du mail" : "Message"}</label>
        <div className="regie-compose">
          <textarea id="regie-ch-text" rows={ch.app === "gmail" ? 5 : 3} value={text} onChange={(e) => setText(e.target.value)} placeholder={ch.app === "gmail" ? "Texte du mail" : "Texte du message"}
            onKeyDown={ch.app === "gmail" ? undefined : enterSends} />
          {has("img") && <PhotoPick pid={pid} value={photo} onChange={setPhoto} />}
        </div>
      </>}
      {ch.app === "snapchat" && <small className="hint">Un snap non ouvert apparaît dans Snapchat, avec la notif « vous a envoyé un Snap 👻 ».</small>}
      {ch.app === "phone" && <small className="hint">Un appel manqué s'ajoute aux récents, avec la notif « Missed Call ».</small>}
      {ch.app === "voicemail" && <small className="hint">Le texte devient la transcription du message vocal (onglet Voicemail), avec la notif « Voicemail ».</small>}
      {ch.listPath(pid).includes("/follows/") && <small className="hint">Le post s'ajoute à la page du compte et au fil d'actualité ; compte inconnu : il est créé et suivi.</small>}
      <button className="y2k-btn" disabled={!ok}>Envoyer la notif à {first(p, pid)}{also.length ? ` (+${also.length})` : ""}</button>
    </form>
  );
}

/** Repère les nouveaux messages du joueur dans une conversation suivie (apps de discussion). */
function ChannelReplyWatch({ tab, ch, onReply }: { tab: Tab; ch: Channel; onReply: (tid: string) => void }) {
  const { store } = useData();
  useEffect(() => {
    if (!ch.messages) return;
    let known: Set<string> | null = null;
    return store.subscribe(`${ch.listPath(tab.pid)}/${tab.tid}`, (v) => {
      const msgs = ch.messages!(v as never);
      if (!known) { known = new Set(msgs.map(([id]) => id)); return; }
      const fresh = msgs.some(([id, m]) => !known!.has(id) && !m.npc);
      msgs.forEach(([id]) => known!.add(id));
      if (fresh) onReply(tab.tid);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, tab.tid, tab.pid, ch]);
  return null;
}

/** Onglet d'une app : conversation en direct (réponse au nom du PNJ) ou élément envoyé (mail, snap, appel…). */
function ChannelLive({ tab, ch, onGone }: { tab: Tab; ch: Channel; onGone: () => void }) {
  const { pid, tid } = tab;
  const listPath = ch.listPath(pid);
  const list = useValue<Record<string, Record<string, never>>>(listPath);
  const item = useValue<Record<string, never>>(`${listPath}/${tid}`); // clé imbriquée possible (posts)
  const notifs = useValue<Record<string, Notif>>(`phones/${pid}/notifs`);
  const lore = useValue<string>("meta/loreDate") || LORE_DATE_DEFAULT;
  const p = useValue<Profile>(`phones/${pid}/profile`);
  const { write } = useRegieWriter(pid);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const msgs: [string, LiveMsg][] = ch.messages ? ch.messages(item).slice(-40) : [];
  const lastNpcWho = [...msgs].reverse().find(([, m]) => m.npc)?.[1].who ?? "";
  const [sender, setSender] = useState(lastNpcWho);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { box.current?.scrollTo({ top: 1e9 }); }, [msgs.length]);
  const name = ch.titleOf(item);

  // Notifs de cet onglet : celles qui annoncent un de ses messages (ou l'élément lui-même).
  const ids = new Set([tid, ...msgs.map(([id]) => id)]);
  const mine = Object.entries(notifs ?? {}).filter(([, n]) => n && n.app === (ch.notifApp ?? ch.app) && !!n.msg && ids.has(n.msg));
  const pending = mine.filter(([, n]) => !n.seen);
  const lastNotif = mine.map(([, n]) => n).sort((a, b) => b.at - a.at)[0];
  const lastNpc = [...msgs].reverse().find(([, m]) => m.npc);

  const send = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !photo) return;
    const { patches } = ch.send(pid, { contact: name, text, img: photo ?? undefined, sender: sender || lastNpcWho }, list, lore);
    write(patches);
    setText(""); setPhoto(null);
  };
  const clearNotifs = () => { const pt: Patches = {}; for (const [id] of pending) pt[`phones/${pid}/notifs/${id}`] = null; write(pt); };

  // Annuler : conversation → dernier message du PNJ (et la conversation si elle n'a plus rien) ; élément → l'élément.
  const undo = () => {
    const pt: Patches = {};
    let gone = false;
    if (ch.messages && ch.msgPath) {
      if (!lastNpc) return;
      const rest = msgs.filter(([id]) => id !== lastNpc[0]);
      if (!confirm(`Supprimer définitivement « ${(lastNpc[1].text || "photo").slice(0, 60)} » de ${ch.label.split(" ")[0]} chez ${first(p, pid)}, avec sa notif ?${rest.length ? "" : " C'est le seul message : la conversation disparaît."} Impossible d'annuler.`)) return;
      if (rest.length) pt[ch.msgPath(pid, tid, lastNpc[0])] = null; else { pt[`${listPath}/${tid}`] = null; gone = true; }
      for (const [id, n] of mine) if (gone || n.msg === lastNpc[0]) pt[`phones/${pid}/notifs/${id}`] = null;
    } else {
      if (!confirm(`Supprimer définitivement « ${name.slice(0, 60)} » du téléphone de ${first(p, pid)}, avec sa notif ? Impossible d'annuler.`)) return;
      pt[`${listPath}/${tid}`] = null;
      for (const [id] of mine) pt[`phones/${pid}/notifs/${id}`] = null;
      gone = true;
    }
    write(pt);
    if (gone) onGone();
  };

  return (
    <div className="regie-live">
      <div className="regie-live-head">
        <b>{ch.label.split(" ")[0]}</b> · {name.slice(0, 40)} ↔ {first(p, pid)}
        <Link to={`/${pid}/${ch.link(tid)}`} className="linkish" title="Ouvrir dans le téléphone"><Glyph i={mdiOpenInNew} size={13} /> Voir dans le téléphone</Link>
      </div>
      {!item && <p className="hint regie-item">Supprimé du téléphone.</p>}
      {ch.messages ? (
        <>
          <div className="regie-msgs" ref={box}>
            {msgs.length === 0 && <p className="hint">Aucun message.</p>}
            {msgs.map(([id, m]) => (
              <div key={id} className={`regie-msg ${m.npc ? "npc" : "player"}`}>
                {m.img && <img src={img(m.img)} alt="" />}
                {m.text && <span>{m.text}</span>}
                <small>{m.npc ? (m.who || name) : first(p, pid)}{m.time ? ` · ${m.time}` : ""}</small>
                {m.npc && id === msgs[msgs.length - 1][0] && lastNotif && <small className="seen">{lastNotif.seen ? "Vu" : "Notif envoyée, pas encore ouverte"}</small>}
              </div>
            ))}
          </div>
          <form className="regie-compose" onSubmit={send}>
            {ch.fields.includes("sender") && <input className="regie-sender" value={sender} onChange={(e) => setSender(e.target.value)} placeholder="Qui" aria-label="Membre qui écrit" />}
            <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder={`Répondre en tant que ${ch.fields.includes("sender") ? sender || "…" : name}…`} aria-label="Réponse du PNJ" onKeyDown={enterSends} />
            {ch.fields.includes("img") && <PhotoPick pid={pid} value={photo} onChange={setPhoto} />}
            <button className="y2k-btn" disabled={(!text.trim() && !photo) || (ch.fields.includes("sender") && !sender.trim())}>Envoyer</button>
          </form>
        </>
      ) : item && (
        <div className="regie-item"><p>{name}</p>{lastNotif && <small className="seen">{lastNotif.seen ? "Notif ouverte" : "Notif envoyée, pas encore ouverte"}</small>}</div>
      )}
      <div className="regie-actions">
        {pending.length > 0 && <button className="linkish" onClick={clearNotifs}>Effacer les notifs ({pending.length})</button>}
        {item && (!ch.messages || lastNpc) && <button className="linkish danger" onClick={undo}>{ch.messages ? "Annuler l'envoi du dernier message" : "Annuler l'envoi"}</button>}
      </div>
    </div>
  );
}

// ─── Conversations de groupe partagées (xX WiiNNERS Xx, Losers + Winners…) ─────
type Group = { tid: string; name: string; members: string[] };

/** Groupes partagés, avec leur nom tel qu'il apparaît dans les téléphones. */
function useSharedGroups(): Group[] {
  const threads = useValue<Record<string, Thread>>("threads");
  const i0 = useValue<Record<string, InboxEntry>>(`phones/${PIDS[0]}/inbox`);
  const i1 = useValue<Record<string, InboxEntry>>(`phones/${PIDS[1]}/inbox`);
  const i2 = useValue<Record<string, InboxEntry>>(`phones/${PIDS[2]}/inbox`);
  const i3 = useValue<Record<string, InboxEntry>>(`phones/${PIDS[3]}/inbox`);
  return useMemo(() => sharedGroups(threads, { [PIDS[0]]: i0, [PIDS[1]]: i1, [PIDS[2]]: i2, [PIDS[3]]: i3 }), [threads, i0, i1, i2, i3]);
}

/** Notifs des membres d'un groupe (pour « Vu par… », effacer, annuler). */
function useMembersNotifs() {
  const n0 = useValue<Record<string, Notif>>(`phones/${PIDS[0]}/notifs`), n1 = useValue<Record<string, Notif>>(`phones/${PIDS[1]}/notifs`);
  const n2 = useValue<Record<string, Notif>>(`phones/${PIDS[2]}/notifs`), n3 = useValue<Record<string, Notif>>(`phones/${PIDS[3]}/notifs`);
  return useMemo(() => ({ [PIDS[0]]: n0, [PIDS[1]]: n1, [PIDS[2]]: n2, [PIDS[3]]: n3 }) as Record<string, Record<string, Notif> | undefined>, [n0, n1, n2, n3]);
}

/** Expéditeur dans un groupe : "pid" (joueur), "npc:Nom" (PNJ déjà présent dans le fil) ou "npc" (autre PNJ, nom libre). */
const senderOf = (v: string, npc: string): GroupSender | null =>
  v.startsWith("npc:") ? { npc: v.slice(4) } : v === "npc" ? (npc.trim() ? { npc: npc.trim() } : null) : { pid: v };

/** PNJ qui ont déjà écrit dans le fil (dans l'ordre d'apparition). */
const npcsOf = (msgs: Record<string, Msg> | undefined) =>
  [...new Set(Object.values(msgs ?? {}).sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0)).filter((m) => m?.from === "npc" && m.npcName).map((m) => (m.npcName as string).trim()))];

function SenderPick({ group, names, msgs, value, onChange, npc, onNpc }: {
  group: Group; names: Record<string, string>; msgs: Record<string, Msg> | undefined;
  value: string; onChange: (v: string) => void; npc: string; onNpc: (v: string) => void;
}) {
  const npcs = useMemo(() => npcsOf(msgs), [msgs]);
  return (
    <div className="regie-senders">
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Qui écrit">
        {npcs.length > 0 && <optgroup label="PNJ du groupe">{npcs.map((n) => <option key={n} value={`npc:${n}`}>{n}</option>)}</optgroup>}
        <optgroup label="Membres">{group.members.map((m) => <option key={m} value={m}>{names[m] ?? m}</option>)}</optgroup>
        <option value="npc">Autre PNJ…</option>
      </select>
      {value === "npc" && <input value={npc} onChange={(e) => onNpc(e.target.value)} placeholder="Nom du PNJ" aria-label="Nom du PNJ" autoComplete="off" autoFocus />}
    </div>
  );
}

/** Valeur par défaut : le premier PNJ du fil, sinon « Autre PNJ ». */
const defaultSender = (msgs: Record<string, Msg> | undefined) => { const n = npcsOf(msgs)[0]; return n ? `npc:${n}` : "npc"; };

function GroupForm({ group, onSent }: { group: Group; onSent: (t: Tab) => void }) {
  const names = useFirstNames();
  const msgs = useValue<Record<string, Msg>>(`threadMessages/${group.tid}`);
  const lore = useValue<string>("meta/loreDate") || LORE_DATE_DEFAULT;
  const { write } = useRegieWriter(group.members[0]);
  const [sender, setSender] = useState<string | null>(null);
  const value = sender ?? defaultSender(msgs);
  const [npc, setNpc] = useState("");
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const who = senderOf(value, npc);
  const label = !who ? "" : "npc" in who ? who.npc : names[who.pid] ?? who.pid;
  const ok = !!who && (!!text.trim() || !!photo);
  const told = group.members.filter((m) => !(who && "pid" in who && who.pid === m)).map((m) => names[m] ?? m);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ok || !who) return;
    write(groupMessagePatches({ ...group, sender: who, senderLabel: label, text, img: photo ?? undefined, lore, msgs }));
    setText(""); setPhoto(null);
    onSent({ pid: group.members[0], tid: group.tid, app: "group" });
  };
  return (
    <form className="regie-sub" onSubmit={submit}>
      <span className="lbl">Qui écrit</span>
      <SenderPick group={group} names={names} msgs={msgs} value={value} onChange={setSender} npc={npc} onNpc={setNpc} />
      <label className="lbl" htmlFor="regie-gr-text">Message</label>
      <div className="regie-compose">
        <textarea id="regie-gr-text" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message dans « ${group.name} »`} onKeyDown={enterSends} />
        <PhotoPick pid={group.members[0]} value={photo} onChange={setPhoto} />
      </div>
      <small className="hint">Notif chez {told.join(", ")}.</small>
      <button className="y2k-btn" disabled={!ok}>Envoyer dans le groupe</button>
    </form>
  );
}

/** Messages écrits par les joueurs (hors régie) dans un groupe suivi → signal dans la régie. */
function GroupReplyWatch({ tab, onReply }: { tab: Tab; onReply: (tid: string) => void }) {
  const { store } = useData();
  useEffect(() => {
    let known: Set<string> | null = null;
    return store.subscribe(`threadMessages/${tab.tid}`, (v) => {
      const map = (v ?? {}) as Record<string, Msg>;
      if (!known) { known = new Set(Object.keys(map)); return; }
      const fresh = Object.entries(map).some(([id, m]) => !known!.has(id) && m && m.from !== "npc" && !m.byMdj);
      Object.keys(map).forEach((id) => known!.add(id));
      if (fresh) onReply(tab.tid);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, tab.tid]);
  return null;
}

function GroupLive({ tab }: { tab: Tab }) {
  const groups = useSharedGroups();
  const group = groups.find((g) => g.tid === tab.tid);
  const names = useFirstNames();
  const raw = useValue<Record<string, Msg>>(`threadMessages/${tab.tid}`);
  const all = useMemo(() => sorted(raw), [raw]);
  const msgs = all.slice(-40);
  const notifs = useMembersNotifs();
  const lore = useValue<string>("meta/loreDate") || LORE_DATE_DEFAULT;
  const { write } = useRegieWriter(tab.pid);
  const lastMdj = [...all].reverse().find(([, m]) => m.byMdj);
  // Par défaut : le dernier expéditeur utilisé depuis la régie, sinon le premier PNJ du fil.
  const [sender, setSender] = useState<string | null>(null);
  const value = sender ?? (lastMdj ? (lastMdj[1].from === "npc" ? `npc:${lastMdj[1].npcName ?? ""}` : lastMdj[1].from) : defaultSender(raw));
  const [npc, setNpc] = useState("");
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { box.current?.scrollTo({ top: 1e9 }); }, [msgs.length]);
  if (!group) return <p className="hint regie-item">Groupe introuvable.</p>;

  const whoOf = (m: Msg) => (m.from === "npc" ? m.npcName || "?" : names[m.from] ?? m.from);
  // Notifs de ce groupe, par membre.
  const mine = group.members.flatMap((m) => Object.entries(notifs[m] ?? {}).filter(([, n]) => n?.thread === tab.tid).map(([id, n]) => ({ m, id, n })));
  const pending = mine.filter((x) => !x.n.seen);
  const lastSentId = lastMdj ? (lastMdj[1].pair && raw?.[lastMdj[1].pair] && (lastMdj[1].text ? lastMdj[0] : lastMdj[1].pair)) || lastMdj[0] : null;
  const forLast = mine.filter((x) => x.n.msg === lastSentId);
  const seenBy = forLast.filter((x) => x.n.seen).map((x) => names[x.m] ?? x.m);
  const notYet = forLast.filter((x) => !x.n.seen).map((x) => names[x.m] ?? x.m);

  const who = senderOf(value, npc);
  const label = !who ? "" : "npc" in who ? who.npc : names[who.pid] ?? who.pid;
  const send = (e: FormEvent) => {
    e.preventDefault();
    if (!who || (!text.trim() && !photo)) return;
    write(groupMessagePatches({ ...group, sender: who, senderLabel: label, text, img: photo ?? undefined, lore, msgs: raw }));
    setText(""); setPhoto(null);
  };
  const clearNotifs = () => { const pt: Patches = {}; for (const x of pending) pt[`phones/${x.m}/notifs/${x.id}`] = null; write(pt); };
  const undo = () => {
    if (!lastMdj) return;
    const ids = [lastMdj[0], ...(lastMdj[1].pair && raw?.[lastMdj[1].pair] ? [lastMdj[1].pair] : [])];
    if (!confirm(`Supprimer définitivement « ${(lastMdj[1].text || "photo").slice(0, 60)} »${ids.length > 1 ? " et sa photo" : ""} du groupe « ${group.name} », avec les notifs des membres ? Impossible d'annuler.`)) return;
    const pt: Patches = {};
    for (const id of ids) pt[`threadMessages/${tab.tid}/${id}`] = null;
    for (const x of mine) if (x.n.msg && ids.includes(x.n.msg)) pt[`phones/${x.m}/notifs/${x.id}`] = null;
    write(pt);
  };

  return (
    <div className="regie-live">
      <div className="regie-live-head">
        <b>{group.name}</b> · {group.members.map((m) => names[m] ?? m).join(", ")}
        <Link to={`/${tab.pid}/messages/${tab.tid}`} className="linkish" title="Ouvrir le groupe dans un téléphone"><Glyph i={mdiOpenInNew} size={13} /> Voir</Link>
      </div>
      <div className="regie-msgs" ref={box}>
        {msgs.length === 0 && <p className="hint">Aucun message.</p>}
        {msgs.map(([id, m]) => (
          <div key={id} className={`regie-msg ${m.byMdj ? "npc" : "player"}`}>
            {m.img && <img src={img(m.img)} alt="" />}
            {m.text && <span>{m.text}</span>}
            <small>{whoOf(m)} · {m.time}</small>
            {id === lastSentId && forLast.length > 0 && <small className="seen">{seenBy.length ? `Vu par ${seenBy.join(", ")}` : ""}{seenBy.length && notYet.length ? " · " : ""}{notYet.length ? `pas encore : ${notYet.join(", ")}` : ""}</small>}
          </div>
        ))}
      </div>
      <form className="regie-compose regie-compose-group" onSubmit={send}>
        <SenderPick group={group} names={names} msgs={raw} value={value} onChange={setSender} npc={npc} onNpc={setNpc} />
        <div className="regie-compose">
          <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder={`Écrire en tant que ${label || "…"}…`} aria-label="Message dans le groupe" onKeyDown={enterSends} />
          <PhotoPick pid={tab.pid} value={photo} onChange={setPhoto} />
          <button className="y2k-btn" disabled={!label || (!text.trim() && !photo)}>Envoyer</button>
        </div>
      </form>
      <div className="regie-actions">
        {pending.length > 0 && <button className="linkish" onClick={clearNotifs}>Effacer les notifs ({pending.length})</button>}
        {lastMdj && <button className="linkish danger" onClick={undo}>Annuler l'envoi du dernier message</button>}
      </div>
    </div>
  );
}

/** Créer un groupe partagé : un fil « group » et son entrée dans la boîte de chaque membre. */
function NewGroup({ onCreated }: { onCreated: (tid: string) => void }) {
  const names = useFirstNames();
  const { store } = useData();
  const { write } = useRegieWriter(PIDS[0]);
  const [name, setName] = useState("");
  const [members, setMembers] = useState<string[]>([...PIDS]);
  const ok = !!name.trim() && members.length >= 2;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ok) return;
    const tid = store.newId("group");
    const patches: Patches = { [`threads/${tid}`]: { kind: "group", name: name.trim(), members: Object.fromEntries(members.map((m) => [m, true])) } };
    for (const m of members) patches[`phones/${m}/inbox/${tid}`] = { threadId: tid, contact: name.trim(), isGroup: true, order: Date.now() };
    write(patches).then(() => onCreated(tid));
  };
  return (
    <form className="regie-sub" onSubmit={submit}>
      <label className="lbl" htmlFor="regie-ng-name">Nom du groupe</label>
      <input id="regie-ng-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Les Ratés 🎈" autoComplete="off" required />
      <span className="lbl">Membres</span>
      <div className="regie-players">
        {PIDS.map((m) => (
          <label key={m} className={`regie-check ${members.includes(m) ? "on" : ""}`}>
            <input type="checkbox" checked={members.includes(m)} onChange={(e) => setMembers((l) => (e.target.checked ? [...l, m] : l.filter((x) => x !== m)))} /> {names[m] ?? m}
          </label>
        ))}
      </div>
      <small className="hint">Le groupe apparaît dans Messages chez chaque membre. Les PNJ n'ont pas besoin d'être membres : choisis « Autre PNJ… » pour écrire à leur nom.</small>
      <button className="y2k-btn" disabled={!ok}>Créer le groupe</button>
    </form>
  );
}

// ─── Appel entrant ───────────────────────────────────────────────────────────
function CallForm({ pid, onSent }: { pid: string; onSent: (t: Tab) => void }) {
  const calls = useValue<Record<string, { contact?: string; deleted?: boolean }>>(`phones/${pid}/data/calls`);
  const call = useValue<LiveCall>(callPath(pid));
  const p = useValue<Profile>(`phones/${pid}/profile`);
  const { write } = useRegieWriter(pid);
  const [contact, setContact] = useState("");
  const names = useMemo(() => [...new Set(Object.values(calls ?? {}).filter((c) => c && !c.deleted && c.contact).map((c) => c.contact as string))], [calls]);
  const busy = !!call && call.state !== "ended" && Date.now() - call.startedAt < RING_MS + 15_000;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!contact.trim() || busy) return;
    const { patches, id } = startCallPatches(pid, contact.trim());
    write(patches);
    onSent({ pid, tid: id, app: "call" });
  };
  return (
    <form className="regie-sub" onSubmit={submit}>
      <label className="lbl" htmlFor="regie-call-contact">Qui appelle</label>
      <input id="regie-call-contact" list="regie-call-names" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="ex. Maman" autoComplete="off" required />
      <datalist id="regie-call-names">{names.map((n) => <option key={n} value={n} />)}<NpcOptions known={names} /></datalist>
      <small className="hint">{busy ? `Un appel est déjà en cours chez ${first(p, pid)}.` : `Le téléphone de ${first(p, pid)} sonne 30 s ; sans réponse, c'est un appel manqué.`}</small>
      <button className="y2k-btn" disabled={!contact.trim() || busy}>Appeler {first(p, pid)}</button>
    </form>
  );
}

/** Suit un appel lancé depuis la régie : signal quand le joueur décroche, appel manqué au bout de 30 s. */
function CallWatch({ tab, onReply }: { tab: Tab; onReply: () => void }) {
  const call = useValue<LiveCall>(callPath(tab.pid));
  const lore = useValue<string>("meta/loreDate") || LORE_DATE_DEFAULT;
  const { write } = useRegieWriter(tab.pid);
  const mine = call?.id === tab.tid ? call : undefined;
  const prev = useRef(mine?.state);
  useEffect(() => {
    if (prev.current && prev.current !== mine?.state && mine?.state === "active") onReply();
    prev.current = mine?.state;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine?.state]);
  useEffect(() => {
    if (mine?.state !== "ringing") return;
    // Un peu après le téléphone (qui s'en charge s'il est ouvert) : la régie termine l'appel elle-même.
    const t = setTimeout(() => write(endCallPatches(tab.pid, mine, "missed", lore)), Math.max(0, RING_MS + 3000 - (Date.now() - mine.startedAt)));
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine?.state, mine?.id]);
  return null;
}

function CallLive({ tab, onSent }: { tab: Tab; onSent: (t: Tab) => void }) {
  const { pid, tid } = tab;
  const call = useValue<LiveCall>(callPath(pid));
  const log = useValue<{ contact?: string; type?: string; duration?: string; time?: string }>(`phones/${pid}/data/calls/call_${tid}`);
  const notif = useValue<Notif>(`phones/${pid}/notifs/n_${tid}`);
  const lore = useValue<string>("meta/loreDate") || LORE_DATE_DEFAULT;
  const p = useValue<Profile>(`phones/${pid}/profile`);
  const { write } = useRegieWriter(pid);
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const h = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(h); }, []);
  const mine = call?.id === tid ? call : undefined;
  const contact = mine?.contact ?? log?.contact ?? "?";
  const state = mine?.state ?? (log ? "ended" : "ringing");
  const status = state === "ringing" ? `Ça sonne… ${duration(now - (mine?.startedAt ?? now))}`
    : state === "active" ? `En ligne · ${duration(now - (mine?.answeredAt ?? now))}`
    : log?.type === "missed" ? (mine?.result === "declined" ? "Refusé par le joueur" : "Pas de réponse : appel manqué") : `Terminé · ${log?.duration ?? ""}`;
  const hangUp = () => mine && mine.state !== "ended" && write(endCallPatches(pid, mine, "ended", lore));
  const again = () => { const { patches, id } = startCallPatches(pid, contact); write(patches); onSent({ pid, tid: id, app: "call" }); };
  const busy = !!call && call.id !== tid && call.state !== "ended";
  return (
    <div className="regie-live">
      <div className="regie-live-head"><b>Appel</b> · {contact} → {first(p, pid)}
        <Link to={`/${pid}`} className="linkish" title="Ouvrir le téléphone"><Glyph i={mdiOpenInNew} size={13} /> Voir le téléphone</Link></div>
      <div className={`regie-call ${state}`}>
        <span className="dot-state" aria-hidden />
        <b>{status}</b>
        {state === "ended" && notif && <small className="seen">{notif.seen ? "Notif « Missed Call » ouverte" : "Notif « Missed Call » envoyée"}</small>}
      </div>
      <div className="regie-actions">
        {state !== "ended" ? <button className="y2k-btn regie-hang" onClick={hangUp}>Raccrocher</button>
          : <button className="y2k-btn" onClick={again} disabled={busy}>Rappeler</button>}
      </div>
    </div>
  );
}
