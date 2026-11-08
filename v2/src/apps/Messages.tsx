// Messages — iOS 6. Bulles brillantes bleues (iMessage) / vertes (SMS), en-têtes horodatés.
// Édition « fluide » : on écrit dans la barre du bas comme sur un vrai téléphone ; appui long
// sur une bulle → Modifier | Heure | Insérer après | Supprimer. Appui long sur une conversation
// → feuille d'actions (supprimer, marquer non lue). Rien n'est jamais effacé : corbeille.
import { useEffect, useMemo, useRef, useState } from "react";
import { Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useCanEdit, useData, useValue, useWriter } from "../data/hooks";
import { orderBetween } from "../data/order";
import type { Json, Patches } from "../data/store";
import { clockLabel, dayLabel, inboxLabel, loreBetween, loreNowMs, loreToMs, msToLore, parseDateField, stampLabel } from "../lib/loreTime";
import { useOS } from "../phone/common";
import { img } from "../lib/img";
import { AppFrame, BackButton, LORE_DATE_DEFAULT } from "../phone/IOSChrome";
import { ActionSheet, Callout, PromptAlert, useLongPress, type SheetAction } from "../phone/Sheets";
import { Glyph } from "../kit/glyph";
import { mdiAccount, mdiCamera, mdiMessagePlus, mdiSend, mdiSquareEditOutline, mdiSwapHorizontal, mdiTrashCan } from "@mdi/js";
import "./messages.css";

const PIDS = ["glinda", "eoghan", "drew", "elias"];
// Contacts sur Android en 2012 → bulles vertes (SMS) plutôt que bleues (iMessage).
const ANDROID_CONTACTS = ["drew", "gwen", "nils", "abby", "hector", "matthew", "louis", "vicky", "james", "harry", "asra", "nayati", "sophie"];

type Msg = { from: string; npcName?: string | null; text?: string; img?: string; time?: string; ts?: number; order?: number; deleted?: boolean };
type Thread = { kind: "pair" | "group" | "local"; members?: Record<string, boolean>; name?: string; contact?: string | null };
type InboxEntry = { contact?: string; threadId: string; unread?: boolean; isGroup?: boolean; deleted?: boolean; order?: number };

// ── données ──────────────────────────────────────────────────────────────────
const sortMsgs = (map: Record<string, Msg> | undefined) =>
  Object.entries(map ?? {}).filter(([, m]) => m && !m.deleted)
    .map(([id, m]) => [id, { ...m, ts: loreToMs(m.time) ?? 0 }] as [string, Msg & { ts: number }])
    .sort((a, b) => a[1].ts - b[1].ts || (a[1].order ?? 0) - (b[1].order ?? 0));

function useNames() {
  const { store } = useData();
  const [names, setNames] = useState<Record<string, { name: string; os?: string }>>({});
  useEffect(() => {
    const offs = PIDS.map((p) => store.subscribe(`phones/${p}/profile`, (v) => {
      const pr = (v ?? {}) as { name?: string; os?: string };
      setNames((n) => ({ ...n, [p]: { name: (pr.name ?? p).split(" ")[0], os: pr.os } }));
    }));
    return () => offs.forEach((o) => o());
  }, [store]);
  return names;
}

/** Dernier message de chaque fil (abonnement ciblé par fil). */
function useLastMessages(tids: string[]) {
  const { store } = useData();
  const [last, setLast] = useState<Record<string, (Msg & { ts: number }) | null>>({});
  const key = tids.join("|");
  useEffect(() => {
    const offs = tids.map((t) => store.subscribe(`threadMessages/${t}`, (v) => {
      const s = sortMsgs(v as Record<string, Msg> | undefined);
      setLast((l) => ({ ...l, [t]: s.length ? s[s.length - 1][1] : null }));
    }));
    return () => offs.forEach((o) => o());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, key]);
  return last;
}

/** Boîte de réception = entrées du téléphone + fils partagés où le perso est membre (même sans entrée). */
function useInbox(pid: string) {
  const inbox = useValue<Record<string, InboxEntry>>(`phones/${pid}/inbox`);
  const threads = useValue<Record<string, Thread>>("threads");
  return useMemo(() => {
    const rows = new Map<string, InboxEntry>();
    for (const [tid, e] of Object.entries(inbox ?? {})) if (e) rows.set(tid, { ...e, threadId: e.threadId ?? tid });
    for (const [tid, t] of Object.entries(threads ?? {}))
      if (t && t.kind !== "local" && t.members?.[pid] && !rows.has(tid)) rows.set(tid, { threadId: tid, isGroup: t.kind === "group" });
    return { rows: [...rows.entries()], threads: threads ?? {} };
  }, [inbox, threads, pid]);
}

const contactOf = (pid: string, e: InboxEntry, t: Thread | undefined, names: Record<string, { name: string }>) => {
  if (e.contact) return e.contact;
  if (t?.name) return t.name;
  const others = Object.keys(t?.members ?? {}).filter((m) => m !== pid);
  return others.map((o) => names[o]?.name ?? o).join(", ") || t?.contact || "Inconnu";
};

const isSms = (contact: string, t: Thread | undefined, pid: string, names: Record<string, { os?: string }>) => {
  if (t?.kind === "pair") return Object.keys(t.members ?? {}).some((m) => m !== pid && names[m]?.os === "android");
  if (t?.kind === "group") return false;
  const c = contact.toLowerCase();
  return ANDROID_CONTACTS.some((n) => c.includes(n));
};

// ── app ──────────────────────────────────────────────────────────────────────
export default function MessagesApp({ pid }: { pid: string }) {
  return (
    <Routes>
      <Route index element={<Inbox pid={pid} trash={false} />} />
      <Route path="trash" element={<Inbox pid={pid} trash />} />
      <Route path="new" element={<NewConversation pid={pid} />} />
      <Route path=":tid" element={<Conversation pid={pid} />} />
    </Routes>
  );
}

function Inbox({ pid, trash }: { pid: string; trash: boolean }) {
  const { rows, threads } = useInbox(pid);
  const names = useNames();
  const canEdit = useCanEdit(pid);
  const { write } = useWriter(pid);
  const nav = useNavigate();
  const lore = useValue<string>("meta/loreDate") || LORE_DATE_DEFAULT;
  const today = loreNowMs(lore);
  const last = useLastMessages(rows.map(([t]) => t));
  const [sheet, setSheet] = useState<{ tid: string; e: InboxEntry; contact: string } | null>(null);

  const visible = rows.filter(([, e]) => !!e.deleted === trash)
    .sort((a, b) => (last[b[0]]?.ts ?? 0) - (last[a[0]]?.ts ?? 0));
  const trashCount = rows.filter(([, e]) => e.deleted).length;

  const entryPatch = (tid: string, e: InboxEntry, field: string, value: Json | undefined): Patches => {
    const base = `phones/${pid}/inbox/${tid}`;
    // Fil partagé visible sans entrée : on crée l'entrée au premier changement.
    if (!e.order && !e.contact) return { [base]: { threadId: tid, order: Date.now(), [field]: value ?? null } as Json };
    return { [`${base}/${field}`]: value };
  };

  const actions = (s: NonNullable<typeof sheet>): SheetAction[] => trash
    ? [{ label: "Restaurer", onPress: () => write(entryPatch(s.tid, s.e, "deleted", null)) }]
    : [
        { label: s.e.unread ? "Marquer comme lue" : "Marquer comme non lue", onPress: () => write(entryPatch(s.tid, s.e, "unread", !s.e.unread)) },
        { label: "Supprimer la conversation", destructive: true, onPress: () => write(entryPatch(s.tid, s.e, "deleted", true)) },
      ];

  return (
    <AppFrame
      title={trash ? "Supprimées" : "Messages"}
      left={<BackButton to={trash ? `/${pid}/messages` : `/${pid}/home`} label={trash ? "Messages" : "Accueil"} />}
      right={canEdit && !trash ? <NewButton onClick={() => nav("new")} /> : undefined}
    >
      {!trash && trashCount > 0 && (
        <button className="msg-trash-row" onClick={() => nav("trash")}><Glyph i={mdiTrashCan} size={18} /> <span style={{ flex: 1 }}>Conversations supprimées</span>{trashCount} ›</button>
      )}
      <ul className="msg-list">
        {visible.map(([tid, e]) => {
          const t = threads[tid];
          const contact = contactOf(pid, e, t, names);
          const lm = last[tid];
          return (
            <InboxRow key={tid} contact={contact} unread={!!e.unread} dim={trash}
              when={inboxLabel(lm?.ts || null, today)} preview={lm ? (lm.text || (lm.img ? "Photo" : "")) : ""}
              onOpen={() => nav(`/${pid}/messages/${tid}`)}
              onLong={canEdit ? () => setSheet({ tid, e, contact }) : undefined} />
          );
        })}
        {visible.length === 0 && <li className="msg-empty">{trash ? "Aucune conversation supprimée." : "Aucun message."}</li>}
      </ul>
      {sheet && <ActionSheet title={sheet.contact} actions={actions(sheet)} onClose={() => setSheet(null)} />}
    </AppFrame>
  );
}

/** Bouton « nouveau message » : icône de composition (iOS 6) / bulle + (Jelly Bean). */
function NewButton({ onClick }: { onClick: () => void }) {
  const os = useOS();
  return (
    <button className="barbtn icon-btn" aria-label="Nouveau message" onClick={onClick}>
      <Glyph i={os === "ios" ? mdiSquareEditOutline : mdiMessagePlus} size={os === "ios" ? 20 : 24} />
    </button>
  );
}

function InboxRow({ contact, unread, dim, when, preview, onOpen, onLong }: {
  contact: string; unread: boolean; dim: boolean; when: string; preview: string; onOpen: () => void; onLong?: () => void;
}) {
  const lp = useLongPress(() => onLong?.());
  const os = useOS();
  return (
    <li>
      <button className={`msg-row ${dim ? "dim" : ""} ${unread ? "unread" : ""}`} {...(onLong ? lp.handlers : {})} onClick={() => { if (!lp.fired.current) onOpen(); }}>
        {os === "android"
          ? <span className="avatar"><Glyph i={mdiAccount} size={40} /></span>
          : <span className="dot">{unread && <i />}</span>}
        <span className="body">
          <span className="top"><span className="who">{contact}</span><span className="when">{when}</span></span>
          <span className="prev">{preview}</span>
        </span>
        <span className="chev">›</span>
      </button>
    </li>
  );
}

// ── conversation ─────────────────────────────────────────────────────────────
function Conversation({ pid }: { pid: string }) {
  const { tid = "" } = useParams();
  const thread = useValue<Thread>(`threads/${tid}`);
  const entry = useValue<InboxEntry>(`phones/${pid}/inbox/${tid}`);
  const raw = useValue<Record<string, Msg>>(`threadMessages/${tid}`);
  const names = useNames();
  const canEditPhone = useCanEdit(pid);
  const { write } = useWriter(pid);
  const lore = useValue<string>("meta/loreDate") || LORE_DATE_DEFAULT;
  const msgs = useMemo(() => sortMsgs(raw), [raw]);
  const os = useOS();

  const contact = contactOf(pid, entry ?? { threadId: tid }, thread, names);
  const isLocal = thread?.kind === "local";
  const isGroup = thread?.kind === "group" || (!!entry?.isGroup && !isLocal);
  const sms = isSms(contact, thread, pid, names);
  // Le MDJ écrit et corrige au nom de n'importe quel membre, directement dans le téléphone.
  const mdj = useData().session.role === "mdj";
  const canSend = canEditPhone && (isLocal || !!thread?.members?.[pid]);
  const canEditMsg = (m: Msg) => canEditPhone && (isLocal || m.from === pid || mdj);

  // Expéditeurs possibles : fil local → le perso ou son contact ; fil partagé → le perso (MDJ : tous les membres).
  const senders = isLocal ? [pid, "npc"] : mdj ? [pid, ...Object.keys(thread?.members ?? {}).filter((m) => m !== pid)] : [pid];
  const [senderIdx, setSenderIdx] = useState(0);
  const sender = senders[senderIdx % senders.length];
  const senderLabel = sender === "npc" ? contact : sender === pid ? "Moi" : names[sender]?.name ?? sender;
  const [insertAfter, setInsertAfter] = useState<string | null>(null);
  const [callout, setCallout] = useState<{ id: string; x: number; y: number } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [timeFor, setTimeFor] = useState<string | null>(null);

  const scroller = useRef<HTMLDivElement>(null);
  const count = msgs.length;
  useEffect(() => { if (!insertAfter && !editing) scroller.current?.scrollTo({ top: 1e9 }); }, [count, tid, insertAfter, editing]);

  const base = `threadMessages/${tid}`;
  const senderOf = (m: Msg) => (m.from === "npc" ? (m.npcName || contact) : names[m.from]?.name ?? m.from);

  const send = (text: string) => {
    const idx = insertAfter ? msgs.findIndex(([id]) => id === insertAfter) : msgs.length - 1;
    const prev = msgs[idx]?.[1], next = insertAfter ? msgs[idx + 1]?.[1] : undefined;
    let time: string;
    if (insertAfter) time = loreBetween(prev?.time, next?.time) ?? msToLore(loreNowMs(lore));
    else {
      const lastMs = prev ? loreToMs(prev.time) : null;
      time = msToLore(Math.max(loreNowMs(lore), (lastMs ?? 0) + 60_000));
    }
    const from = sender === "npc" ? { from: "npc", npcName: contact } : { from: sender };
    const id = `m_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    write({ [`${base}/${id}`]: { ...from, text, time, order: orderBetween(prev?.order, next?.order) } as Json });
    if (insertAfter) setInsertAfter(id);
  };

  const menuFor = (id: string, m: Msg): SheetAction[] => [
    { label: "Modifier", onPress: () => setEditing(id) },
    { label: "Heure", onPress: () => setTimeFor(id) },
    { label: "Insérer après", onPress: () => setInsertAfter(id) },
    { label: "Supprimer", destructive: true, onPress: () => write({ [`${base}/${id}/deleted`]: true }) },
  ].filter((a) => canEditMsg(m) || a.label === "Insérer après");

  let prevTs = 0;
  const android = os === "android";
  return (
    <AppFrame title={contact} left={<BackButton to={`/${pid}/messages`} label="Messages" />} bodyClass="conv-wrap">
      <div className="conv" ref={scroller}>
        {msgs.map(([id, m], i) => {
          // iOS : en-tête horodaté après 1 h de silence. Android : pastille à chaque changement de jour.
          const showStamp = android ? (i === 0 || dayLabel(m.ts) !== dayLabel(prevTs)) : (i === 0 || m.ts - prevTs > 60 * 60_000);
          prevTs = m.ts;
          const mine = m.from === pid;
          const prevM = msgs[i - 1]?.[1];
          const showSender = isGroup && !mine && (!prevM || prevM.from !== m.from || prevM.npcName !== m.npcName);
          return (
            <div key={id}>
              {showStamp && m.ts > 0 && (android
                ? <div className="day-pill"><span>{dayLabel(m.ts)}</span></div>
                : <div className="stamp">{stampLabel(m.ts)}</div>)}
              <div className={`line ${mine ? "me" : "them"}`}>
                {showSender && <span className="sender">{senderOf(m)}</span>}
                {editing === id
                  ? <BubbleEditor initial={m.text ?? ""} onCancel={() => setEditing(null)}
                      onSave={(t) => { setEditing(null); if (t !== (m.text ?? "")) write({ [`${base}/${id}/text`]: t }); }} />
                  : <Bubble m={m} mine={mine} sms={sms} selected={callout?.id === id || insertAfter === id}
                      onLong={canSend ? (x, y) => setCallout({ id, x, y }) : undefined} />}
                {android && m.ts > 0 && editing !== id && <span className="clock">{clockLabel(m.ts)}</span>}
              </div>
            </div>
          );
        })}
        {msgs.length === 0 && <div className="msg-empty">Aucun message</div>}
      </div>
      {insertAfter && (
        <div className="insert-banner">
          <span>Insertion après « {(msgs.find(([id]) => id === insertAfter)?.[1].text ?? "").slice(0, 28)}… »</span>
          <button onClick={() => setInsertAfter(null)}>Terminer</button>
        </div>
      )}
      {canSend && (
        <Composer sms={sms} onSend={send}
          who={senders.length > 1 ? senderLabel : null} onToggleWho={() => setSenderIdx((i) => (i + 1) % senders.length)} />
      )}
      {callout && (() => {
        const m = msgs.find(([id]) => id === callout.id)?.[1];
        return m ? <Callout x={callout.x} y={callout.y} items={menuFor(callout.id, m)} onClose={() => setCallout(null)} /> : null;
      })()}
      {timeFor && (() => {
        const m = msgs.find(([id]) => id === timeFor)?.[1];
        return (
          // Sélecteur date + heure (2012) ; enregistré au format lore « 6 oct, 2:30pm » que les Messages savent trier.
          <PromptAlert title="Heure du message" type="datetime-local" min="2012-01-01T00:00" max="2012-12-31T23:59"
            initial={parseDateField(m?.time ?? "")?.value || "2012-10-06T12:00"}
            validate={(v) => !!v} onClose={() => setTimeFor(null)}
            onOk={(v) => write({ [`${base}/${timeFor}/time`]: msToLore(new Date(v).getTime()) })} />
        );
      })()}
    </AppFrame>
  );
}

function Bubble({ m, mine, sms, selected, onLong }: { m: Msg; mine: boolean; sms: boolean; selected: boolean; onLong?: (x: number, y: number) => void }) {
  const lp = useLongPress((x, y) => onLong?.(x, y));
  return (
    <div className={`bubble ${mine ? `me ${sms ? "sms" : "imsg"}` : "them"} ${selected ? "selected" : ""}`} {...(onLong ? lp.handlers : {})}>
      {m.img && <img src={img(m.img)} alt="" loading="lazy" />}
      {m.text}
    </div>
  );
}

function BubbleEditor({ initial, onSave, onCancel }: { initial: string; onSave: (t: string) => void; onCancel: () => void }) {
  const [v, setV] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { const el = ref.current; if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, []);
  return (
    <>
      <div className="bubble editing"><textarea ref={ref} value={v} onChange={(e) => setV(e.target.value)} /></div>
      <div className="edit-actions"><button onClick={onCancel}>Annuler</button><button className="ok" onClick={() => onSave(v)}>OK</button></div>
    </>
  );
}

function Composer({ sms, onSend, who, onToggleWho }: { sms: boolean; onSend: (t: string) => void; who: string | null; onToggleWho: () => void }) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const submit = () => { const t = text.trim(); if (!t) return; onSend(t); setText(""); ref.current?.focus(); };
  useEffect(() => { const el = ref.current; if (el) { el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 96)}px`; } }, [text]);
  const os = useOS();
  if (os === "android") return (
    <div className="composer">
      {who !== null && <button className="who-btn" onClick={onToggleWho} title="Changer l'expéditeur">{who} <Glyph i={mdiSwapHorizontal} size={13} /></button>}
      <textarea ref={ref} rows={1} value={text} placeholder="Text message"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }} />
      <button className="send-holo" disabled={!text.trim()} onClick={submit} aria-label="Envoyer"><Glyph i={mdiSend} size={26} /></button>
    </div>
  );
  return (
    <div className="composer">
      {who !== null && <button className="who-btn" onClick={onToggleWho} title="Changer l'expéditeur">{who} <Glyph i={mdiSwapHorizontal} size={13} /></button>}
      {who === null && <button className="cam-btn" aria-label="Photo"><Glyph i={mdiCamera} size={18} /></button>}
      <textarea ref={ref} rows={1} value={text} placeholder={sms ? "Text Message" : "iMessage"}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }} />
      <button className={`send ${sms ? "sms" : ""}`} disabled={!text.trim()} onClick={submit}>Send</button>
    </div>
  );
}

// ── nouvelle conversation ────────────────────────────────────────────────────
function NewConversation({ pid }: { pid: string }) {
  const names = useNames();
  const threads = useValue<Record<string, Thread>>("threads") ?? {};
  const { write } = useWriter(pid);
  const { store } = useData();
  const nav = useNavigate();
  const [to, setTo] = useState("");

  const openPair = (other: string) => {
    const existing = Object.entries(threads).find(([, t]) => t?.kind === "pair" && t.members?.[pid] && t.members?.[other]);
    if (existing) { write({ [`phones/${pid}/inbox/${existing[0]}/deleted`]: null }); nav(`/${pid}/messages/${existing[0]}`, { replace: true }); return; }
    const tid = `${pid}_${other}`;
    write({
      [`threads/${tid}`]: { kind: "pair", members: { [pid]: true, [other]: true } },
      [`phones/${pid}/inbox/${tid}`]: { threadId: tid, order: Date.now() },
    });
    nav(`/${pid}/messages/${tid}`, { replace: true });
  };
  const openLocal = (contact: string) => {
    const tid = store.newId("t");
    write({
      [`threads/${tid}`]: { kind: "local", members: { [pid]: true }, contact },
      [`phones/${pid}/inbox/${tid}`]: { threadId: tid, contact, order: Date.now() },
    });
    nav(`/${pid}/messages/${tid}`, { replace: true });
  };

  const q = to.trim().toLowerCase();
  const mains = PIDS.filter((p) => p !== pid && (!q || (names[p]?.name ?? p).toLowerCase().includes(q)));
  return (
    <AppFrame title="Nouveau message" left={<BackButton to={`/${pid}/messages`} label="Annuler" />}>
      <form className="to-field" onSubmit={(e) => { e.preventDefault(); if (to.trim()) openLocal(to.trim()); }}>
        À : <input autoFocus value={to} onChange={(e) => setTo(e.target.value)} placeholder="Nom du contact" />
      </form>
      <ul className="suggest">
        {mains.map((p) => (
          <li key={p}><button onClick={() => openPair(p)}>{names[p]?.name ?? p}<small>Conversation partagée avec son téléphone</small></button></li>
        ))}
        {to.trim() && !mains.some((p) => (names[p]?.name ?? "").toLowerCase() === q) && (
          <li><button onClick={() => openLocal(to.trim())}>{to.trim()}<small>Nouveau contact (PNJ)</small></button></li>
        )}
      </ul>
    </AppFrame>
  );
}
