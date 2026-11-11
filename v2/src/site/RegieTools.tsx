// Outils de la régie du MDJ, à côté des envois : fiches PNJ, scénarios (envois préparés lancés étape
// par étape) et journal de séance. Tout ce que la régie écrit dans un téléphone
// passe par `useRegieWriter`, qui ajoute une ligne au journal. Données de la régie sous `meta/regie/` (écriture réservée au MDJ).
import { mdiChevronDown, mdiChevronUp, mdiDelete, mdiDownload, mdiPlay, mdiRestore } from "@mdi/js";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useData, useValue, withHistory } from "../data/hooks";
import type { Json, Patches, Store } from "../data/store";
import { findNpcThread, npcMessagePatches, type InboxEntry, type Msg, type Thread } from "../data/notify";
import { startCallPatches } from "../data/call";
import { CHANNELS, channelOf } from "../data/channels";
import { Glyph } from "../kit/glyph";
import { LORE_DATE_DEFAULT } from "../phone/common";
import { PIDS } from "./Site";

export const REGIE = "meta/regie";
type Profile = { name?: string; avatar?: string | { src?: string } };
export type Npc = { name: string; note?: string; order?: number };
/** Un envoi préparé (scénario) ou répété (envoi à plusieurs joueurs). */
export type Step = { pid: string; app: string; contact: string; text?: string; img?: string; sender?: string; subject?: string; action?: string; order?: number; done?: number };
type Cue = { title: string; order?: number; steps?: Record<string, Step> };
type LogEntry = { at: number; lore?: string; pids: string[]; app: string; title: string; body: string };
type Tab = { pid: string; tid: string; app?: string };

const first = (p?: Profile, pid = "") => (p?.name ?? pid).split(" ")[0];
const hhmm = (ms: number) => new Date(ms).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const loreFr = (lore?: string) => (lore ? lore.split("-").reverse().join("/") : "");
const byOrder = <T extends { order?: number }>(m: Record<string, T> | undefined) =>
  Object.entries(m ?? {}).filter(([, v]) => v && typeof v === "object").sort((a, b) => (a[1].order ?? 0) - (b[1].order ?? 0));

/** Valeur actuelle d'un chemin, lue une fois (la régie n'est pas forcément abonnée à ce chemin). */
const once = (store: Store, path: string) => new Promise<Json | undefined>((res) => {
  let got = false;
  const unsub = store.subscribe(path, (v) => { if (got) return; got = true; res(v); setTimeout(() => unsub(), 0); });
});

// ─── Journal ─────────────────────────────────────────────────────────────────
const NOTIF_RE = /^phones\/([^/]+)\/notifs\/[^/]+$/;
const CALL_RE = /^phones\/([^/]+)\/call$/;

/** Lignes du journal pour une écriture de la régie : une par notif (regroupées entre joueurs) et par appel. */
export function logPatches(store: Store, patches: Patches): Patches {
  const lore = store.peek("meta/loreDate") as string | undefined;
  const by = new Map<string, LogEntry>();
  for (const [path, v] of Object.entries(patches)) {
    const o = v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, Json>) : null;
    let m: RegExpMatchArray | null, e: Pick<LogEntry, "app" | "title" | "body"> | null = null;
    if ((m = path.match(NOTIF_RE)) && o) e = { app: String(o.app ?? ""), title: String(o.title ?? ""), body: String(o.body || (o.attach ? "📷 photo" : "")) };
    else if ((m = path.match(CALL_RE)) && o?.contact) e = { app: "call", title: String(o.contact), body: "Appel entrant" };
    if (!m || !e) continue;
    const k = `${e.app}|${e.title}|${e.body}`;
    const cur = by.get(k);
    if (cur) { if (!cur.pids.includes(m[1])) cur.pids.push(m[1]); } else by.set(k, { ...e, pids: [m[1]], at: Date.now(), ...(lore ? { lore } : {}) });
  }
  const out: Patches = {};
  for (const e of by.values()) out[`${REGIE}/log/${store.newId("l")}`] = e as unknown as Json;
  return out;
}

/** Comme `useWriter`, mais chaque envoi s'inscrit aussi au journal ; `as` = téléphone concerné (historique). */
export function useRegieWriter(pid: string) {
  const { store, session, track } = useData();
  return useMemo(() => ({
    write: (patches: Patches, as = pid) => track(store.update({ ...withHistory(store, session.uid, as, patches), ...logPatches(store, patches) })),
  }), [store, session.uid, track, pid]);
}

/** Construit un envoi (Messages, appel ou autre app) à partir des données actuelles du téléphone. */
export async function stepPatches(store: Store, s: Step): Promise<{ patches: Patches; tab: Tab }> {
  const lore = ((await once(store, "meta/loreDate")) as string | undefined) || LORE_DATE_DEFAULT;
  if (s.app === "messages") {
    const threads = (await once(store, "threads")) as Record<string, Thread> | undefined;
    const inbox = (await once(store, `phones/${s.pid}/inbox`)) as Record<string, InboxEntry> | undefined;
    const tid = findNpcThread(s.pid, s.contact, threads, inbox);
    const msgs = tid ? ((await once(store, `threadMessages/${tid}`)) as Record<string, Msg> | undefined) : undefined;
    const r = npcMessagePatches({ pid: s.pid, contact: s.contact, text: (s.text ?? "").trim(), img: s.img, lore, tid, msgs });
    return { patches: r.patches, tab: { pid: s.pid, tid: r.tid } };
  }
  if (s.app === "call") {
    const { patches, id } = startCallPatches(s.pid, s.contact);
    return { patches, tab: { pid: s.pid, tid: id, app: "call" } };
  }
  const ch = channelOf(s.app);
  if (!ch) throw new Error(`App inconnue : ${s.app}`);
  const list = (await once(store, ch.listPath(s.pid))) as never;
  const { patches, key } = ch.send(s.pid, { contact: s.contact, text: s.text ?? "", img: s.img, sender: s.sender, subject: s.subject, action: s.action }, list, lore);
  return { patches, tab: { pid: s.pid, tid: key, app: ch.app } };
}

/** Écriture directe dans `meta/regie` (pas d'historique de téléphone). */
function useMeta() {
  const { store, track } = useData();
  return useMemo(() => ({ store, put: (p: Patches) => track(store.update(p)) }), [store, track]);
}

// ─── Fiches PNJ ──────────────────────────────────────────────────────────────
export function useNpcs() {
  const map = useValue<Record<string, Npc>>(`${REGIE}/npcs`);
  return useMemo(() => byOrder(map).filter(([, n]) => n.name), [map]);
}

/** Options de datalist : les fiches PNJ absentes de `known`. */
export function NpcOptions({ known = [] }: { known?: string[] }) {
  const npcs = useNpcs();
  const seen = new Set(known.map((k) => k.trim().toLowerCase()));
  return <>{npcs.filter(([, n]) => !seen.has(n.name.trim().toLowerCase())).map(([id, n]) => <option key={id} value={n.name}>{n.note ? `PNJ · ${n.note.slice(0, 40)}` : "PNJ"}</option>)}</>;
}

/** Rappel de la fiche quand le nom tapé correspond à un PNJ. */
export function NpcHint({ name }: { name: string }) {
  const npc = useNpcs().find(([, n]) => n.name.trim().toLowerCase() === name.trim().toLowerCase())?.[1];
  return npc?.note ? <small className="hint regie-npc-hint">Fiche : {npc.note}</small> : null;
}

export function NpcBook() {
  const npcs = useNpcs();
  const { store, put } = useMeta();
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (npcs.some(([, n]) => n.name.trim().toLowerCase() === name.trim().toLowerCase())) { alert(`« ${name.trim()} » a déjà une fiche.`); return; }
    put({ [`${REGIE}/npcs/${store.newId("n")}`]: { name: name.trim(), note: note.trim(), order: Date.now() } });
    setName(""); setNote("");
  };
  return (
    <div className="regie-form">
      <p className="hint">Les PNJ enregistrés ici sont proposés dans tous les champs « De la part de » (avec leur fiche en rappel) : plus de fautes de frappe qui créent une conversation en double.</p>
      <ul className="regie-list">
        {npcs.length === 0 && <li className="hint">Aucune fiche pour l'instant.</li>}
        {npcs.map(([id, n]) => (
          <li key={id}>
            <b>{n.name}</b>
            <input defaultValue={n.note ?? ""} placeholder="Note (rôle, ton, appli…)" aria-label={`Note sur ${n.name}`}
              onBlur={(e) => e.target.value !== (n.note ?? "") && put({ [`${REGIE}/npcs/${id}/note`]: e.target.value.trim() })} />
            <button className="icon-btn" onClick={() => confirm(`Supprimer la fiche de ${n.name} ? (Les messages déjà envoyés restent.)`) && put({ [`${REGIE}/npcs/${id}`]: null })} aria-label={`Supprimer la fiche de ${n.name}`}><Glyph i={mdiDelete} size={15} /></button>
          </li>
        ))}
      </ul>
      <form className="regie-sub" onSubmit={add}>
        <label className="lbl" htmlFor="regie-npc-name">Nouveau PNJ</label>
        <input id="regie-npc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom tel qu'il apparaît dans les téléphones" autoComplete="off" required />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (facultatif) : mère de Glinda, écrit en majuscules…" aria-label="Note" autoComplete="off" />
        <button className="y2k-btn" disabled={!name.trim()}>Ajouter la fiche</button>
      </form>
    </div>
  );
}

// ─── Envoi à plusieurs joueurs ───────────────────────────────────────────────
/** Cases « Aussi à » : les autres téléphones qui reçoivent le même envoi. */
export function AlsoPick({ pid, value, onChange }: { pid: string; value: string[]; onChange: (v: string[]) => void }) {
  const names = useFirstNames();
  useEffect(() => { if (value.includes(pid)) onChange(value.filter((p) => p !== pid)); });
  return (
    <div className="regie-also">
      <span className="lbl">Aussi à</span>
      {PIDS.filter((p) => p !== pid).map((p) => (
        <label key={p} className={`regie-check ${value.includes(p) ? "on" : ""}`}>
          <input type="checkbox" checked={value.includes(p)} onChange={(e) => onChange(e.target.checked ? [...value, p] : value.filter((x) => x !== p))} /> {names[p]}
        </label>
      ))}
    </div>
  );
}

/** Envoie la même chose aux autres téléphones (chacun dans sa propre conversation). */
export function useSendAlso() {
  const { store } = useData();
  const { write } = useRegieWriter(PIDS[0]);
  return (also: string[], s: Omit<Step, "pid">) => Promise.all(also.map(async (pid) => {
    const { patches } = await stepPatches(store, { ...s, pid });
    return write(patches, pid);
  })).catch(() => alert("Un des envois aux autres joueurs a échoué."));
}

export function useFirstNames() {
  const p0 = useValue<Profile>(`phones/${PIDS[0]}/profile`), p1 = useValue<Profile>(`phones/${PIDS[1]}/profile`);
  const p2 = useValue<Profile>(`phones/${PIDS[2]}/profile`), p3 = useValue<Profile>(`phones/${PIDS[3]}/profile`);
  return useMemo(() => Object.fromEntries([p0, p1, p2, p3].map((p, i) => [PIDS[i], first(p, PIDS[i])])) as Record<string, string>, [p0, p1, p2, p3]);
}

// ─── Scénarios ───────────────────────────────────────────────────────────────
const APP_OPTIONS: [string, string][] = [["messages", "Messages (SMS)"], ["call", "Téléphone — appel entrant"], ...CHANNELS.map((c) => [c.app, c.label] as [string, string])];
const appLabel = (app: string) => APP_OPTIONS.find(([a]) => a === app)?.[1].split(" (")[0] ?? app;

export function Cues({ onSent }: { onSent: (t: Tab) => void }) {
  const cues = byOrder(useValue<Record<string, Cue>>(`${REGIE}/cues`));
  const { store, put } = useMeta();
  const { write } = useRegieWriter(PIDS[0]);
  const names = useFirstNames();
  const [cid, setCid] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const cur = cues.find(([id]) => id === cid) ?? cues[0];
  const curId = cur?.[0];
  const steps = byOrder(cur?.[1].steps);
  const next = steps.find(([, s]) => !s.done);

  const create = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const id = store.newId("q");
    put({ [`${REGIE}/cues/${id}`]: { title: title.trim(), order: Date.now() } });
    setCid(id); setTitle("");
  };
  const fire = async (sid: string, s: Step) => {
    if (busy) return;
    setBusy(true);
    try {
      const { patches, tab } = await stepPatches(store, s);
      await write({ ...patches }, s.pid);
      await put({ [`${REGIE}/cues/${curId}/steps/${sid}/done`]: Date.now() });
      onSent(tab);
    } catch { alert("Envoi impossible."); } finally { setBusy(false); }
  };
  /** Échange la place de deux étapes (leurs `order`). */
  const swap = (a: number, b: number) => {
    const [ia, sa] = steps[a], [ib, sb] = steps[b];
    put({ [`${REGIE}/cues/${curId}/steps/${ia}/order`]: sb.order ?? b, [`${REGIE}/cues/${curId}/steps/${ib}/order`]: sa.order ?? a });
  };
  const reset = () => { const p: Patches = {}; for (const [sid] of steps) p[`${REGIE}/cues/${curId}/steps/${sid}/done`] = null; put(p); };

  return (
    <div className="regie-form">
      <p className="hint">Prépare les envois d'une scène à l'avance, puis lance-les un par un pendant la séance.</p>
      {cues.length > 0 && <>
        <label className="lbl" htmlFor="regie-cue">Scénario</label>
        <select id="regie-cue" value={curId} onChange={(e) => setCid(e.target.value)}>{cues.map(([id, c]) => <option key={id} value={id}>{c.title}</option>)}</select>
      </>}
      {cur && <>
        <ol className="regie-steps">
          {steps.length === 0 && <li className="hint">Aucune étape : ajoute-en ci-dessous.</li>}
          {steps.map(([sid, s], i) => (
            <li key={sid} className={s.done ? "done" : sid === next?.[0] ? "next" : ""}>
              <span className="what">
                <span><b>{names[s.pid] ?? s.pid}</b> · {appLabel(s.app)} · {s.contact}{s.sender ? ` (${s.sender})` : ""}{s.text ? ` : « ${s.text.slice(0, 80)} »` : ""}</span>
                {s.done ? <small className="seen">Envoyé à {hhmm(s.done)}</small> : null}
              </span>
              <span className="btns">
                <button className="icon-btn" disabled={i === 0} onClick={() => swap(i, i - 1)} aria-label="Monter l'étape" title="Monter"><Glyph i={mdiChevronUp} size={16} /></button>
                <button className="icon-btn" disabled={i === steps.length - 1} onClick={() => swap(i, i + 1)} aria-label="Descendre l'étape" title="Descendre"><Glyph i={mdiChevronDown} size={16} /></button>
                <button className="icon-btn" disabled={busy} onClick={() => fire(sid, s)} aria-label={s.done ? "Renvoyer cette étape" : "Envoyer cette étape"} title={s.done ? "Renvoyer" : "Envoyer"}><Glyph i={mdiPlay} size={15} /></button>
                <button className="icon-btn" onClick={() => put({ [`${REGIE}/cues/${curId}/steps/${sid}`]: null })} aria-label="Supprimer l'étape"><Glyph i={mdiDelete} size={15} /></button>
              </span>
            </li>
          ))}
        </ol>
        {next && <button className="y2k-btn" disabled={busy} onClick={() => fire(next[0], next[1])}>Envoyer l'étape suivante ({steps.findIndex(([id]) => id === next[0]) + 1}/{steps.length})</button>}
        <div className="regie-actions">
          {steps.some(([, s]) => s.done) && <button className="linkish" onClick={reset}><Glyph i={mdiRestore} size={13} /> Tout remettre à « pas envoyé »</button>}
          <button className="linkish danger" onClick={() => confirm(`Supprimer le scénario « ${cur[1].title} » ?`) && (put({ [`${REGIE}/cues/${curId}`]: null }), setCid(null))}>Supprimer le scénario</button>
        </div>
        <StepForm key={curId} onAdd={(s) => put({ [`${REGIE}/cues/${curId}/steps/${store.newId("s")}`]: { ...s, order: Date.now() } as unknown as Json })} />
      </>}
      <form className="regie-sub" onSubmit={create}>
        <label className="lbl" htmlFor="regie-cue-new">Nouveau scénario</label>
        <div className="regie-compose">
          <input id="regie-cue-new" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex. Séance 12 — la fête chez Drew" autoComplete="off" />
          <button className="y2k-btn" disabled={!title.trim()}>Créer</button>
        </div>
      </form>
    </div>
  );
}

function StepForm({ onAdd }: { onAdd: (s: Step) => void }) {
  const names = useFirstNames();
  const [pid, setPid] = useState<string>(PIDS[0]);
  const [app, setApp] = useState("messages");
  const [contact, setContact] = useState("");
  const [sender, setSender] = useState("");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const ch = channelOf(app);
  const has = (f: string) => !!ch?.fields.includes(f as never);
  const needsText = app === "messages" || (has("text") && app !== "gmail");
  const ok = !!contact.trim() && (!needsText || !!text.trim()) && (!has("sender") || !!sender.trim());
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ok) return;
    onAdd({ pid, app, contact: contact.trim(), ...(text.trim() ? { text: text.trim() } : {}), ...(sender.trim() ? { sender: sender.trim() } : {}), ...(subject.trim() ? { subject: subject.trim() } : {}) });
    setText(""); setSubject("");
  };
  return (
    <form className="regie-sub regie-stepform" onSubmit={submit}>
      <span className="lbl">Ajouter une étape</span>
      <div className="regie-compose">
        <select value={pid} onChange={(e) => setPid(e.target.value)} aria-label="Téléphone">{PIDS.map((p) => <option key={p} value={p}>{names[p]}</option>)}</select>
        <select value={app} onChange={(e) => setApp(e.target.value)} aria-label="App">{APP_OPTIONS.map(([a, l]) => <option key={a} value={a}>{l}</option>)}</select>
      </div>
      <label className="lbl" htmlFor="regie-step-contact">{ch?.contactLabel ?? (app === "call" ? "Qui appelle" : "De la part de")}</label>
      <input id="regie-step-contact" list="regie-step-npcs" value={contact} onChange={(e) => setContact(e.target.value)} placeholder={ch?.contactHint ?? (app === "call" ? "ex. Maman" : "ex. Jeongguk")} aria-label="De la part de" autoComplete="off" required />
      <datalist id="regie-step-npcs"><NpcOptions /></datalist>
      {has("sender") && <input value={sender} onChange={(e) => setSender(e.target.value)} placeholder="Membre qui écrit" aria-label="Membre qui écrit" autoComplete="off" />}
      {has("subject") && <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Objet du mail" aria-label="Objet" autoComplete="off" />}
      {(app === "messages" || has("text"))
        ? <><label className="lbl" htmlFor="regie-step-text">{app === "gmail" ? "Texte du mail" : app === "voicemail" ? "Ce que dit le message vocal" : "Contenu du message"}</label>
          <textarea id="regie-step-text" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ce que le joueur recevra" /></>
        : <small className="hint">{app === "call" ? "Appel entrant : le téléphone sonne 30 s, pas de texte." : "Cette app n'envoie pas de texte : seulement l'expéditeur."}</small>}
      <button className="y2k-btn" disabled={!ok}>Ajouter l'étape</button>
    </form>
  );
}

// ─── Journal de séance ───────────────────────────────────────────────────────
export function Journal() {
  const log = useValue<Record<string, LogEntry>>(`${REGIE}/log`);
  const { put } = useMeta();
  const names = useFirstNames();
  const [who, setWho] = useState("");
  const rows = useMemo(() => Object.values(log ?? {}).filter((e) => e && (!who || e.pids?.includes(who))).sort((a, b) => b.at - a.at), [log, who]);
  const line = (e: LogEntry) => `${new Date(e.at).toLocaleString("fr-FR")}${e.lore ? ` (lore ${loreFr(e.lore)})` : ""} — ${appLabel(e.app)} → ${e.pids.map((p) => names[p] ?? p).join(", ")} — ${e.title}${e.body ? ` : ${e.body}` : ""}`;
  const exportTxt = () => {
    const blob = new Blob([[...rows].reverse().map(line).join("\n") + "\n"], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `journal-regie-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  return (
    <div className="regie-form">
      <div className="regie-compose">
        <select value={who} onChange={(e) => setWho(e.target.value)} aria-label="Filtrer par joueur">
          <option value="">Tous les joueurs</option>
          {PIDS.map((p) => <option key={p} value={p}>{names[p]}</option>)}
        </select>
        <button className="y2k-btn" onClick={exportTxt} disabled={!rows.length}><Glyph i={mdiDownload} size={14} /> Exporter</button>
      </div>
      <ul className="regie-log">
        {rows.length === 0 && <li className="hint">Rien d'envoyé depuis la régie pour l'instant.</li>}
        {rows.slice(0, 300).map((e, i) => (
          <li key={`${e.at}-${i}`}>
            <small>{hhmm(e.at)}{e.lore ? ` · ${loreFr(e.lore)}` : ""} · {appLabel(e.app)} → {e.pids.map((p) => names[p] ?? p).join(", ")}</small>
            <span><b>{e.title}</b>{e.body ? ` : ${e.body}` : ""}</span>
          </li>
        ))}
      </ul>
      {rows.length > 0 && !who && <button className="linkish danger" onClick={() => confirm("Vider tout le journal de la régie ? Pense à l'exporter avant. Impossible d'annuler.") && put({ [`${REGIE}/log`]: null })}>Vider le journal</button>}
    </div>
  );
}
