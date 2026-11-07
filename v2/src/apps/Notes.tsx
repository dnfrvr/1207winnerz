// Notes — iOS 6 : barre cuir, papier jaune ligné, Marker Felt.
// Édition « fluide » : le propriétaire tape directement dans la note, enregistrement auto.
import { Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useCanEdit, useEditableField, useList, useValue, useWriter } from "../data/hooks";
import { useEffect, useRef } from "react";
import { AppFrame, BackButton, LORE_DATE_DEFAULT } from "../phone/IOSChrome";
import "./notes.css";

type Note = { title?: string; body?: string; date?: string; order?: number; deleted?: boolean };

const leather: React.CSSProperties = {
  background: "linear-gradient(#a57a4c, #6e4b28)", borderBottom: "1px solid #3a240f", boxShadow: "inset 0 1px 0 rgba(255,255,255,.3)",
};
const leatherBtn = { "--btn-top": "#9a7248", "--btn-bottom": "#5d3d1f" } as React.CSSProperties;

export default function NotesApp({ pid }: { pid: string }) {
  return (
    <Routes>
      <Route index element={<NoteList pid={pid} />} />
      <Route path=":noteId" element={<NoteView pid={pid} />} />
    </Routes>
  );
}

const firstLine = (n: Note) => n.title?.trim() || n.body?.split("\n")[0]?.trim() || "Nouvelle note";

function NoteList({ pid }: { pid: string }) {
  const notes = useList<Note>(`phones/${pid}/data/notes`);
  const canEdit = useCanEdit(pid);
  const { insert } = useWriter(pid);
  const nav = useNavigate();
  const lore = useValue<string>("meta/loreDate");

  const add = () => {
    const date = new Date(`${lore || LORE_DATE_DEFAULT}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }).replace(".", "");
    const id = insert(`phones/${pid}/data/notes`, { title: "", body: "", date }, { atStart: true });
    nav(id);
  };

  return (
    <AppFrame
      title={`Notes (${notes.length})`}
      navStyle={leather}
      left={<BackButton to={`/${pid}/home`} label="Accueil" style={leatherBtn} />}
      right={canEdit ? <button className="barbtn plus" style={leatherBtn} onClick={add} aria-label="Nouvelle note">+</button> : undefined}
      bodyClass="notes-paper"
    >
      <ul className="notes-list">
        {notes.map(([id, n]) => (
          <li key={id}>
            <button onClick={() => nav(id)}>
              <span className="t">{firstLine(n)}</span>
              <span className="d">{n.date}</span>
              <span className="chev">›</span>
            </button>
          </li>
        ))}
        {notes.length === 0 && <li className="empty">Aucune note</li>}
      </ul>
    </AppFrame>
  );
}

function NoteView({ pid }: { pid: string }) {
  const { noteId = "" } = useParams();
  const base = `phones/${pid}/data/notes/${noteId}`;
  const note = useValue<Note>(base);
  const canEdit = useCanEdit(pid);
  const title = useEditableField(pid, `${base}/title`);
  const body = useEditableField(pid, `${base}/body`);
  const date = useEditableField(pid, `${base}/date`);
  const { trash } = useWriter(pid);
  const nav = useNavigate();

  if (!note) return <AppFrame title="Notes" navStyle={leather} left={<BackButton to={`/${pid}/notes`} label="Notes" style={leatherBtn} />}><div className="notes-paper" /></AppFrame>;

  return (
    <AppFrame
      title={firstLine({ ...note, title: title.value, body: body.value })}
      navStyle={leather}
      left={<BackButton to={`/${pid}/notes`} label="Notes" style={leatherBtn} />}
      bodyClass="notes-paper"
    >
      <div className="note-sheet">
        {canEdit
          ? <input className="note-date" value={date.value} onChange={(e) => date.onChange(e.target.value)} onBlur={date.onBlur} aria-label="Date" />
          : <div className="note-date">{note.date}</div>}
        {canEdit ? (
          <>
            <input className="note-title" placeholder="Titre" value={title.value} onChange={(e) => title.onChange(e.target.value)} onBlur={title.onBlur} />
            <AutoGrow className="note-body" placeholder="Écris ici…" value={body.value} onChange={body.onChange} onBlur={body.onBlur} />
          </>
        ) : (
          <>
            {note.title && <div className="note-title">{note.title}</div>}
            <div className="note-body ro">{note.body}</div>
          </>
        )}
      </div>
      {canEdit && (
        <div className="notes-toolbar">
          <button
            aria-label="Mettre à la corbeille"
            onClick={() => { if (confirm("Mettre cette note à la corbeille ?")) { trash(base); nav(`/${pid}/notes`); } }}
          >🗑</button>
        </div>
      )}
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
    el.style.height = `${Math.max(el.scrollHeight, 30 * 14)}px`;
  }, [value]);
  return <textarea ref={ref} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />;
}
