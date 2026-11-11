// Notes — iOS 6 : barre de navigation en cuir brun, bloc jaune ligné à bord déchiré, police
// Noteworthy / Marker Felt, date en tête de note, barre d'outils cuir (◀ action corbeille ▶).
// Android 4.1 : mémo façon S Memo (mosaïque de fiches jaunes, barre d'action holo).
// Édition « fluide » : le propriétaire tape directement dans la note, enregistrement auto.
import { Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useCanEdit, useEditableField, useList, useValue, useWriter } from "../data/hooks";
import { useEffect, useRef, useState } from "react";
import { mdiDelete, mdiMagnify, mdiMenuLeft, mdiMenuRight, mdiPlus, mdiShareVariant, mdiTrashCan } from "@mdi/js";
import { AppFrame, BackButton, LORE_DATE_DEFAULT } from "../phone/IOSChrome";
import { useOS } from "../phone/common";
import { ActionSheet } from "../phone/Sheets";
import { Glyph, IOS_ACTION } from "../kit/glyph";
import "./notes.css";

type Note = { title?: string; body?: string; date?: string; order?: number; deleted?: boolean };

// Boutons de barre teintés cuir (iOS 6 : la teinte de la barre s'applique aux boutons).
const leather: React.CSSProperties = { background: "var(--nt-leather)", borderBottom: "1px solid #24140a", boxShadow: "inset 0 1px 0 rgba(255,236,200,.28)" };
const leatherBtn = { "--btn-top": "#8a6440", "--btn-bottom": "#4f321a" } as React.CSSProperties;

export default function NotesApp({ pid }: { pid: string }) {
  return (
    <Routes>
      <Route index element={<NoteList pid={pid} />} />
      <Route path=":noteId" element={<NoteView pid={pid} />} />
    </Routes>
  );
}

const firstLine = (n: Note) => n.title?.trim() || n.body?.split("\n")[0]?.trim() || "New note";

function useAdd(pid: string) {
  const { insert } = useWriter(pid);
  const nav = useNavigate();
  const lore = useValue<string>("meta/loreDate");
  return () => {
    const date = new Date(`${lore || LORE_DATE_DEFAULT}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" }).replace(".", "");
    const id = insert(`phones/${pid}/data/notes`, { title: "", body: "", date }, { atStart: true });
    nav(`/${pid}/notes/${id}`);
  };
}

/** Bord de papier déchiré (restes des feuilles arrachées), sous la barre de navigation. */
const Torn = () => <div className="nt-torn" aria-hidden><i /></div>;

// ── Liste ────────────────────────────────────────────────────────────────────
function NoteList({ pid }: { pid: string }) {
  const os = useOS();
  const notes = useList<Note>(`phones/${pid}/data/notes`, { newest: "date" });
  const canEdit = useCanEdit(pid);
  const nav = useNavigate();
  const add = useAdd(pid);
  const [q, setQ] = useState("");
  const shown = q ? notes.filter(([, n]) => `${n.title ?? ""}\n${n.body ?? ""}`.toLowerCase().includes(q.toLowerCase())) : notes;

  if (os === "android") return (
    <AppFrame title="Notes" left={<BackButton to={`/${pid}/home`} label="Home" />}
      right={<>
        <button className="barbtn" aria-label="Search"><Glyph i={mdiMagnify} size={24} /></button>
        {canEdit && <button className="barbtn" onClick={add} aria-label="New memo"><Glyph i={mdiPlus} size={26} /></button>}
      </>}
      bodyClass="nt-and">
      <div className="nt-memos">
        {notes.map(([id, n]) => (
          <button key={id} className="nt-memo" onClick={() => nav(id)}>
            <b>{firstLine(n)}</b>
            <span className="nt-memo-body">{n.title ? n.body : n.body?.split("\n").slice(1).join("\n")}</span>
            <small>{n.date}</small>
          </button>
        ))}
      </div>
      {notes.length === 0 && <div className="nt-and-empty">No memos</div>}
    </AppFrame>
  );

  return (
    <AppFrame
      title={`Notes (${notes.length})`}
      navStyle={leather}
      left={<BackButton to={`/${pid}/home`} label="Home" style={leatherBtn} />}
      right={canEdit ? <button className="barbtn plus" style={leatherBtn} onClick={add} aria-label="New note">+</button> : undefined}
      bodyClass="nt nt-ios"
    >
      <div className="nt-search">
        <label><Glyph i={mdiMagnify} size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" /></label>
      </div>
      <Torn />
      <ul className="nt-list">
        {shown.map(([id, n]) => (
          <li key={id}>
            <button onClick={() => nav(id)}>
              <span className="t">{firstLine(n)}</span>
              <span className="d">{n.date}</span>
              <span className="chev" aria-hidden>›</span>
            </button>
          </li>
        ))}
        {notes.length === 0 && <li className="empty">No notes</li>}
      </ul>
    </AppFrame>
  );
}

// ── Note ─────────────────────────────────────────────────────────────────────
function NoteView({ pid }: { pid: string }) {
  const os = useOS();
  const { noteId = "" } = useParams();
  const base = `phones/${pid}/data/notes/${noteId}`;
  const note = useValue<Note>(base);
  const notes = useList<Note>(`phones/${pid}/data/notes`);
  const canEdit = useCanEdit(pid);
  const title = useEditableField(pid, `${base}/title`);
  const body = useEditableField(pid, `${base}/body`);
  const date = useEditableField(pid, `${base}/date`);
  const lore = useValue<string>("meta/loreDate") || LORE_DATE_DEFAULT;
  const { trash } = useWriter(pid);
  const nav = useNavigate();
  const [confirmDel, setConfirmDel] = useState(false);
  const idx = notes.findIndex(([id]) => id === noteId);
  const go = (d: number) => { const n = notes[idx + d]; if (n) nav(`/${pid}/notes/${n[0]}`, { replace: true }); };
  const remove = () => { trash(base); nav(`/${pid}/notes`); };
  const back = <BackButton to={`/${pid}/notes`} label="Notes" style={leatherBtn} />;

  if (!note) return <AppFrame title="Notes" navStyle={leather} left={back} bodyClass="nt nt-ios"><Torn /></AppFrame>;

  // « Today » si la note date du jour de la fiction (comme l'en-tête d'iOS 6).
  const loreDay = new Date(`${lore}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" }).replace(".", "").toLowerCase();
  const isToday = (note.date ?? "").toLowerCase().replace(".", "") === loreDay;
  const label = firstLine({ ...note, title: title.value, body: body.value });

  const paper = (
    <div className="nt-sheet">
      <div className="nt-date">
        <span>{isToday ? (os === "ios" ? "Today" : "Today") : ""}</span>
        {canEdit
          ? <input value={date.value} onChange={(e) => date.onChange(e.target.value)} onBlur={date.onBlur} aria-label="Date" />
          : <span>{note.date}</span>}
      </div>
      {canEdit ? (
        <>
          <input className="nt-line nt-title" placeholder="Title" value={title.value} onChange={(e) => title.onChange(e.target.value)} onBlur={title.onBlur} />
          <AutoGrow className="nt-line nt-body" placeholder="Écris ici…" value={body.value} onChange={body.onChange} onBlur={body.onBlur} />
        </>
      ) : (
        <>
          {note.title && <div className="nt-line nt-title">{note.title}</div>}
          <div className="nt-line nt-body ro">{note.body}</div>
        </>
      )}
    </div>
  );

  const sheet = confirmDel && (
    <ActionSheet actions={[{ label: os === "ios" ? "Delete Note" : "Delete", destructive: true, onPress: remove }]} onClose={() => setConfirmDel(false)} />
  );

  if (os === "android") return (
    <AppFrame title={label} left={<BackButton to={`/${pid}/notes`} label="Notes" />}
      right={<>
        <button className="barbtn" aria-label="Share"><Glyph i={mdiShareVariant} size={22} /></button>
        {canEdit && <button className="barbtn" aria-label="Delete" onClick={() => setConfirmDel(true)}><Glyph i={mdiDelete} size={24} /></button>}
      </>}
      bodyClass="nt nt-and-note">
      {paper}
      {sheet}
    </AppFrame>
  );

  return (
    <AppFrame title={label} navStyle={leather} left={back} bodyClass="nt nt-ios nt-note">
      <div className="nt-scroll">
        <Torn />
        {paper}
      </div>
      <div className="nt-toolbar">
        <button aria-label="Previous note" disabled={idx <= 0} onClick={() => go(-1)}><Glyph i={mdiMenuLeft} size={40} /></button>
        <button aria-label="Share"><Glyph i={IOS_ACTION} size={24} /></button>
        <button aria-label="Move to trash" disabled={!canEdit} onClick={() => setConfirmDel(true)}><Glyph i={mdiTrashCan} size={24} /></button>
        <button aria-label="Next note" disabled={idx < 0 || idx >= notes.length - 1} onClick={() => go(1)}><Glyph i={mdiMenuRight} size={40} /></button>
      </div>
      {sheet}
    </AppFrame>
  );
}

/** Textarea qui grandit avec son contenu : c'est la page entière qui défile, comme sur iOS. */
function AutoGrow({ value, onChange, ...rest }: { value: string; onChange: (v: string) => void; onBlur: () => void; className: string; placeholder: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 29 * 12)}px`;
  }, [value]);
  return <textarea ref={ref} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />;
}
