// Kit d'interface des apps : composants « natifs » iOS 6 / Android 4.1 (Jelly Bean) qui se
// dessinent selon le téléphone affiché, + l'édition universelle des contenus.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useCanEdit, useData, useList, useWriter } from "../data/hooks";
import { orderBetween, byOrder, type Ordered } from "../data/order";
import type { Json } from "../data/store";
import { img } from "../lib/img";
import { formatDateField, parseDateField } from "../lib/loreTime";
import { canUpload, uploadImage, uploadVideo } from "../lib/upload";
import { useOS } from "../phone/common";
import { StatusBar } from "../phone/IOSChrome";
import { ActionSheet, useLongPress, type SheetAction } from "../phone/Sheets";
import { mdiCamera, mdiCheck, mdiClose, mdiPlus, mdiVideo } from "@mdi/js";
import { Glyph } from "./glyph";
import { Icon, type IconName } from "./icons";
import "./kit.css";

// ─── Tables ────────────────────────────────────────────────────────────────
/** Liste groupée (iOS : fond rayé + groupes arrondis ; Android : sections holo). */
export function Grouped({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`k-grouped ${className}`}>{children}</div>;
}

export function Section({ title, footer, children }: { title?: ReactNode; footer?: ReactNode; children: ReactNode }) {
  return (
    <div className="k-section">
      {title && <div className="k-section-title">{title}</div>}
      <div className="k-group">{children}</div>
      {footer && <div className="k-section-footer">{footer}</div>}
    </div>
  );
}

/** Liste « plain » (rangées pleine largeur). */
export function Plain({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`k-plain ${className}`}>{children}</div>;
}

export function PlainHeader({ children }: { children: ReactNode }) {
  return <div className="k-plain-header">{children}</div>;
}

export type CellProps = {
  title: ReactNode; subtitle?: ReactNode; detail?: ReactNode; icon?: ReactNode; image?: string | null;
  chevron?: boolean; onClick?: () => void; onLong?: () => void; accessory?: ReactNode; className?: string;
  style?: CSSProperties; dim?: boolean; tall?: boolean; round?: boolean;
};

export function Cell({ title, subtitle, detail, icon, image, chevron, onClick, onLong, accessory, className = "", style, dim, tall, round }: CellProps) {
  const lp = useLongPress(() => onLong?.());
  const Tag = onClick || onLong ? "button" : "div";
  return (
    <Tag
      className={`k-cell ${onClick ? "tap" : ""} ${dim ? "dim" : ""} ${tall || subtitle ? "tall" : ""} ${className}`}
      style={style}
      {...(onLong ? lp.handlers : {})}
      onClick={onClick ? () => { if (!lp.fired.current) onClick(); } : undefined}
    >
      {image !== undefined && <span className={`k-thumb ${round ? "round" : ""}`}>{image ? <img src={img(image)} alt="" loading="lazy" /> : null}</span>}
      {icon && <span className="k-icon">{icon}</span>}
      <span className="k-text">
        <span className="k-title">{title}</span>
        {subtitle && <span className="k-sub">{subtitle}</span>}
      </span>
      {detail !== undefined && <span className="k-detail">{detail}</span>}
      {accessory}
      {chevron && <span className="k-chev" aria-hidden>›</span>}
    </Tag>
  );
}

// ─── Barres ────────────────────────────────────────────────────────────────
export type Tab = { id: string; label: string; icon: IconName };

/** Barre d'onglets : en bas sur iOS 6 (noire brillante), en haut sur Android (onglets holo). */
export function TabBar({ tabs, active, onChange }: { tabs: Tab[]; active: string; onChange: (id: string) => void }) {
  const os = useOS();
  return (
    <div className={`k-tabbar ${os}`}>
      {tabs.map((t) => (
        <button key={t.id} className={t.id === active ? "on" : ""} onClick={() => onChange(t.id)}>
          {os === "ios" && <Icon name={t.icon} size={26} />}
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Contrôle segmenté iOS 6 / onglets holo. */
export function Segmented({ items, value, onChange, dark = false }: { items: { id: string; label: string }[]; value: string; onChange: (id: string) => void; dark?: boolean }) {
  const os = useOS();
  return (
    <div className={`k-seg ${os} ${dark ? "dark" : ""}`}>
      {items.map((it) => <button key={it.id} className={it.id === value ? "on" : ""} onClick={() => onChange(it.id)}>{it.label}</button>)}
    </div>
  );
}

/** Barre d'outils du bas (iOS) / barre d'action scindée (Android). */
export function Toolbar({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return <div className={`k-toolbar ${dark ? "dark" : ""}`}>{children}</div>;
}

/** Interrupteur iOS 6 (ON/OFF bleu) / Jelly Bean (rectangle holo). */
export function Switch({ on, onChange, disabled }: { on: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
  const os = useOS();
  return (
    <button className={`k-switch ${os} ${on ? "on" : ""}`} disabled={disabled || !onChange} onClick={(e) => { e.stopPropagation(); onChange?.(!on); }} aria-pressed={on}>
      {os === "ios" ? <><span className="lbl on">ON</span><span className="knob" /><span className="lbl off">OFF</span></> : <span className="thumb">{on ? "ON" : "OFF"}</span>}
    </button>
  );
}

export function SearchBar({ value, onChange, placeholder = "Search" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="k-search">
      <Icon name="search" size={14} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export function Avatar({ src, name, size = 40, color, round = true }: { src?: string | null; name?: string; size?: number; color?: string; round?: boolean }) {
  const initials = (name ?? "?").replace(/[^\p{L}\p{N} ]/gu, "").trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const palette = ["#e53935", "#1e88e5", "#43a047", "#fb8c00", "#8e24aa", "#00897b"];
  const bg = color ?? palette[((name ?? "?").codePointAt(0) ?? 0) % palette.length];
  // Image injoignable (ex. stockage externe hors ligne) → initiales, comme un contact sans photo.
  const [broken, setBroken] = useState(false);
  const show = src && !broken;
  return (
    <span className={`k-avatar ${round ? "round" : ""}`} style={{ width: size, height: size, background: show ? "#ccc" : bg, fontSize: size * 0.38 }}>
      {show ? <img src={img(src)} alt="" loading="lazy" onError={() => setBroken(true)} /> : initials}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="k-empty">{children}</div>;
}

/** Écran de lancement (jeux, apps tierces sans contenu) : image/dégradé + chargement + « Touchez ». */
export function Splash({ title, subtitle, background, logo, color = "#fff", onTap, children }: {
  title: ReactNode; subtitle?: ReactNode; background: string; logo?: ReactNode; color?: string; onTap?: () => void; children?: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), 1600); return () => clearTimeout(t); }, []);
  return (
    <div className="k-splash" style={{ background, color }} onClick={ready ? onTap : undefined}>
      {logo && <div className="k-splash-logo">{logo}</div>}
      <div className="k-splash-title">{title}</div>
      {subtitle && <div className="k-splash-sub">{subtitle}</div>}
      {children}
      <div className="k-splash-foot">
        {ready ? <span className="blink">{onTap ? "Touchez pour jouer" : ""}</span> : <span className="bar"><i /></span>}
      </div>
    </div>
  );
}

// ─── Édition universelle ───────────────────────────────────────────────────
// Appui long (ou clic droit) sur un élément → Modifier | Ajouter après | Supprimer.
// « Modifier » ouvre un formulaire natif listant les champs simples de l'élément.

const LABELS: Record<string, string> = {
  title: "Titre", name: "Nom", off: "Décalage UTC (heures)", text: "Texte", body: "Contenu", time: "Heure", date: "Date", artist: "Artiste",
  album: "Album", duration: "Durée", dur: "Durée", caption: "Légende", location: "Lieu", likes: "J'aime", comments: "Commentaires",
  src: "Image", img: "Image", photo: "Photo", cover: "Pochette", thumbImg: "Miniature", avatar: "Avatar",
  url: "Adresse", contact: "Contact", phone: "Téléphone", type: "Type", from: "De", subj: "Objet", preview: "Aperçu", unread: "Non lu",
  author: "Auteur", desc: "Description", board: "Tableau", pinner: "Épinglé par", repins: "Repins", views: "Vues", ch: "Chaîne", age: "Âge",
  distance: "Distance", online: "En ligne", connected: "Connecté", current: "Actuel", secured: "Sécurisé", day: "Jour", month: "Mois",
  year: "Année", condition: "Conditions", hi: "Max", lo: "Min", pct: "Progression (%)", latin: "Nom latin", common: "Nom commun",
  secs: "Secondes", screenshot: "Capture d'écran", wallpaper: "Fond d'écran", lockWallpaper: "Fond de l'écran verrouillé", cameraVideo: "Vidéo de l'appareil photo", place: "Lieu", note: "Note", notes: "Notes", grade: "Qualité", members: "Membres", last: "Dernier message", handle: "Identifiant",
  displayName: "Nom affiché", bio: "Bio", followers: "Abonnés", following: "Abonnements", size: "Taille", ext: "Extension",
  opened: "Ouvert", sent: "Envoyé", rt: "Retweets", fav: "Favoris", rp: "Réponses", h: "Identifiant", av: "Avatar", route: "Parcours",
  pace: "Allure", cal: "Calories", plays: "Écoutes", reposts: "Reposts", tag: "Tags", posted: "Publié", headline: "Accroche", about: "À propos",
  current_temp: "Température", transcript: "Transcription", username: "Utilisateur", n: "Non lus", emoji: "Emoji", deleted: "Supprimé",
  lines: "Lignes (une par info)", coords: "Coordonnées", q: "Question", a: "Réponse", league: "Ligue", home: "Domicile", away: "Extérieur",
  hs: "Score domicile", as: "Score extérieur", status: "Statut", subtitle: "Sous-titre", detail: "Détail", color: "Couleur", logo: "Logo",
  depth: "Niveau (0 = réponse au post)", me: "Envoyé par moi", archived: "Archivé", pinned: "Épinglé", tall: "Grand format", label: "Libellé", subreddit: "Subreddit", score: "Score", points: "Points",
  bannerImg: "Bannière", tags: "Tags",
};
const IMAGE_KEYS = /^(src|img|photo|cover|thumbImg|avatar|av|image|bannerImg|chAvatarImg|wallpaper|lockWallpaper)$/;
const VIDEO_KEYS = /^(video|cameraVideo)$/;
const HIDDEN = new Set(["order", "id", "deleted", "authorKey", "senderKey"]);

type FieldSpec = { key: string; label: string; kind: "text" | "long" | "number" | "bool" | "image" | "video" | "date" | "dmy" };
// Champs de date : sélecteur avec un jour précis quand la valeur est une vraie date (pas « Hier », « 8:02 AM »…).
const DATE_KEYS = /^(date|time|due|posted|when)$/;
const isDate = (key: string, v: Json | undefined) => DATE_KEYS.test(key) && typeof v === "string" && (v === "" ? key !== "time" : !!parseDateField(v));

const fieldsOf = (item: Record<string, Json>, only?: string[]): FieldSpec[] => {
  let keys = only ?? Object.keys(item).filter((k) => !HIDDEN.has(k) && (item[k] === null || typeof item[k] !== "object"));
  // Jour / mois / année en nombres (Calendrier) : un seul sélecteur « Date » à la place des trois champs.
  const dmy = ["day", "month", "year"].every((k) => keys.includes(k) && typeof item[k] === "number");
  if (dmy) keys = keys.filter((k) => k !== "month" && k !== "year");
  return keys.map((key) => {
    if (dmy && key === "day") return { key, label: "Date", kind: "dmy" as const };
    const v = item[key];
    const kind: FieldSpec["kind"] = IMAGE_KEYS.test(key) ? "image" : VIDEO_KEYS.test(key) ? "video" : isDate(key, v) ? "date" : typeof v === "boolean" ? "bool" : typeof v === "number" ? "number"
      : typeof v === "string" && (v.length > 40 || v.includes("\n") || key === "bio") ? "long" : "text";
    return { key, label: LABELS[key] ?? key, kind };
  });
};

/** `choices` : champs à valeur imposée, affichés en liste déroulante ([libellé, valeur]). */
export type EditTarget = { path: string; title?: string; fields?: string[]; choices?: Record<string, [string, string][]> };

/** Formulaire plein écran « Modifier » au style du système. */
function ItemForm({ pid, target, onClose }: { pid: string; target: EditTarget; onClose: () => void }) {
  const { store } = useData();
  const { write } = useWriter(pid);
  const os = useOS();
  const original = useMemo(() => (store.peek(target.path) ?? {}) as Record<string, Json>, [store, target.path]);
  const [draft, setDraft] = useState<Record<string, Json>>(original);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const fields = fieldsOf(original, target.fields);
  const save = () => {
    const patches: Record<string, Json | undefined> = {};
    for (const f of fields) {
      let v = draft[f.key];
      if (f.kind === "number" && typeof v === "string") v = v.trim() === "" ? null : Number(v);
      if (v !== original[f.key]) patches[`${target.path}/${f.key}`] = v ?? null;
      if (f.kind === "dmy") for (const k of ["month", "year"]) if (draft[k] !== original[k]) patches[`${target.path}/${k}`] = draft[k] ?? null;
    }
    if (Object.keys(patches).length) write(patches);
    onClose();
  };
  return (
    <div className={`k-form ${os}`}>
      <StatusBar />
      <div className="k-form-bar">
        {os === "ios" ? (
          <>
            <button onClick={onClose}>Annuler</button>
            <h1>{target.title ?? "Modifier"}</h1>
            <button className="ok" onClick={save}>OK</button>
          </>
        ) : (
          // Barre « Terminé » de Jelly Bean : deux moitiés ✕ ANNULER | ✓ TERMINÉ.
          <>
            <button onClick={onClose}><Glyph i={mdiClose} size={20} />Annuler</button>
            <button className="ok" onClick={save}><Glyph i={mdiCheck} size={20} />Terminé</button>
          </>
        )}
      </div>
      <div className="k-form-body">
        <Grouped>
          <Section>
            {fields.map((f) => (
              f.kind === "image" || f.kind === "video" ? (
                // Images et vidéos : uniquement par envoi depuis l'appareil (pas d'URL à taper).
                <div key={f.key} className={`k-field ${f.kind}`}>
                  <span className="k-field-label">{f.label}</span>
                  {typeof draft[f.key] === "string" && draft[f.key]
                    ? (f.kind === "video"
                      ? <video className="k-field-img" src={img(draft[f.key] as string)} autoPlay muted loop playsInline />
                      : <img className="k-field-img" src={img(draft[f.key] as string)} alt="" />)
                    : <span className="k-field-none">{f.kind === "video" ? "Aucune vidéo" : "Aucune photo"}</span>}
                  <span className="k-upload-row">
                    {canUpload ? (
                      <span className="k-upload">
                        <input type="file" accept={f.kind === "video" ? "video/*" : "image/*"} aria-label={`Choisir un fichier pour ${f.label}`} disabled={uploading === f.key}
                          onChange={async (e) => {
                            const file = e.target.files?.[0]; e.target.value = "";
                            if (!file) return;
                            setUploading(f.key); setUploadErr(null);
                            try { const url = await (f.kind === "video" ? uploadVideo : uploadImage)(file, pid); setDraft((d) => ({ ...d, [f.key]: url })); }
                            catch (err) { setUploadErr((err as Error).message); }
                            finally { setUploading(null); }
                          }} />
                        {uploading === f.key ? (f.kind === "video" ? "Préparation et envoi…" : "Envoi…") : f.kind === "video" ? <><Glyph i={mdiVideo} size={15} /> Choisir une vidéo</> : <><Glyph i={mdiCamera} size={15} /> Choisir une photo</>}
                      </span>
                    ) : <span className="k-upload-err">Envoi de fichiers indisponible pour l'instant.</span>}
                    {typeof draft[f.key] === "string" && draft[f.key] && <button type="button" className="k-upload-del" onClick={() => setDraft((d) => ({ ...d, [f.key]: "" }))}>Retirer</button>}
                  </span>
                  {uploadErr && <span className="k-upload-err">{uploadErr}</span>}
                </div>
              ) : (
              <label key={f.key} className={`k-field ${f.kind}`}>
                <span className="k-field-label">{f.label}</span>
                {f.kind === "bool" ? (
                  <Switch on={!!draft[f.key]} onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))} />
                ) : target.choices?.[f.key] ? (
                  <select value={String(draft[f.key] ?? "")} onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}>
                    {target.choices[f.key].map(([label, value]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                ) : f.kind === "dmy" ? (
                  <input type="date" value={`${draft.year ?? 2012}-${String(draft.month ?? 1).padStart(2, "0")}-${String(draft.day ?? 1).padStart(2, "0")}`}
                    onChange={(e) => { const [y, m, d] = e.target.value.split("-").map(Number); if (y) setDraft((o) => ({ ...o, day: d, month: m, year: y })); }} />
                ) : f.kind === "date" ? (() => {
                  const df = parseDateField(String(draft[f.key] ?? "")) ?? parseDateField("")!;
                  // Sans année dans le format, l'année est implicite (2012) : on reste dans 2012.
                  const lock = !/\{Y/.test(df.tpl);
                  return <input type={df.type} value={df.value} min={lock ? (df.type === "date" ? "2012-01-01" : "2012-01-01T00:00") : undefined}
                    max={lock ? (df.type === "date" ? "2012-12-31" : "2012-12-31T23:59") : undefined}
                    onChange={(e) => { const v = e.target.value; if (v) setDraft((d) => ({ ...d, [f.key]: formatDateField(df, v) })); }} />;
                })() : f.kind === "long" ? (
                  <textarea value={String(draft[f.key] ?? "")} rows={4} onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))} />
                ) : (
                  <input type={f.kind === "number" ? "number" : "text"} value={draft[f.key] === null || draft[f.key] === undefined ? "" : String(draft[f.key])}
                    onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))} />
                )}
              </label>
              )
            ))}
            {fields.length === 0 && <div className="k-field"><span className="k-field-label">Rien à modifier ici.</span></div>}
          </Section>
        </Grouped>
      </div>
    </div>
  );
}

/**
 * Outils d'édition d'une app. Renvoie :
 * - canEdit : le joueur connecté est propriétaire de ce téléphone
 * - itemLong(listPath, id, opts) : handler d'appui long pour un élément de liste
 * - edit(target) : ouvre le formulaire
 * - add(listPath, template, opts) : ajoute un élément (puis ouvre son formulaire)
 * - ui : les feuilles/formulaires à rendre dans l'app
 */
export function useEditor(pid: string) {
  const canEdit = useCanEdit(pid);
  const { store } = useData();
  const { write } = useWriter(pid);
  const [form, setForm] = useState<EditTarget | null>(null);
  const [sheet, setSheet] = useState<{ title?: string; actions: SheetAction[] } | null>(null);
  const latest = useRef({ store, write });
  latest.current = { store, write };

  const add = (listPath: string, template: Record<string, Json>, opts: { afterId?: string; atStart?: boolean; title?: string; fields?: string[]; choices?: EditTarget["choices"] } = {}) => {
    const { store: s, write: w } = latest.current;
    const list = Object.entries((s.peek(listPath) as Record<string, Ordered> | undefined) ?? {}).filter(([, v]) => v).sort(byOrder);
    let order: number;
    if (opts.atStart) order = orderBetween(undefined, list[0]?.[1].order);
    else {
      const idx = opts.afterId ? list.findIndex(([k]) => k === opts.afterId) : list.length - 1;
      order = orderBetween(list[idx]?.[1].order, list[idx + 1]?.[1].order);
    }
    const id = s.newId("i");
    w({ [`${listPath}/${id}`]: { ...template, order } });
    setForm({ path: `${listPath}/${id}`, title: opts.title ?? "Nouvel élément", fields: opts.fields, choices: opts.choices });
    return id;
  };

  const itemLong = (listPath: string, id: string, opts: { label?: string; template?: Record<string, Json>; fields?: string[]; extra?: SheetAction[] } = {}) =>
    canEdit ? () => setSheet({
      title: opts.label,
      actions: [
        ...(opts.extra ?? []),
        { label: "Modifier", onPress: () => setForm({ path: `${listPath}/${id}`, fields: opts.fields }) },
        ...(opts.template ? [{ label: "Ajouter après", onPress: () => add(listPath, opts.template!, { afterId: id, fields: opts.fields }) }] : []),
        { label: "Supprimer", destructive: true, onPress: () => write({ [`${listPath}/${id}/deleted`]: true }) },
      ],
    }) : undefined;

  const ui = (
    <>
      {sheet && <ActionSheet title={sheet.title} actions={sheet.actions} onClose={() => setSheet(null)} />}
      {form && <ItemForm pid={pid} target={form} onClose={() => setForm(null)} />}
    </>
  );

  return { canEdit, itemLong, edit: (t: EditTarget) => canEdit && setForm(t), add, ui, write, sheet: (s: { title?: string; actions: SheetAction[] }) => setSheet(s) };
}

/** Bouton « + » de barre de navigation (affiché seulement pour le propriétaire). */
export function AddButton({ onClick, show = true }: { onClick: () => void; show?: boolean }) {
  const os = useOS();
  if (!show) return null;
  // Android : icône « nouveau » holo (pas de bouton en relief).
  if (os === "android") return <button className="barbtn" onClick={onClick} aria-label="Ajouter"><Glyph i={mdiPlus} size={26} /></button>;
  return <button className="barbtn plus" onClick={onClick} aria-label="Ajouter">+</button>;
}

/**
 * Liste avec valeurs par défaut codées en dur, quand même éditables : au premier appui long, les
 * valeurs par défaut sont écrites dans la base (ids `d0`, `d1`…) puis l'éditeur s'ouvre.
 */
export function useSeeded<T extends object>(path: string, defaults: T[], ed: ReturnType<typeof useEditor>) {
  const list = useList<T>(path);
  const rows: [string, T][] = list.length ? list : defaults.map((d, i) => [`d${i}`, d]);
  const seed = () => { if (!list.length) ed.write(Object.fromEntries(defaults.map((d, i) => [`${path}/d${i}`, { ...d, order: (i + 1) * 1000 } as Json]))); };
  const long = (id: string, fields: string[], label?: string) => ed.canEdit ? () => { seed(); ed.itemLong(path, id, { fields, label })?.(); } : undefined;
  return { rows, long, seed };
}
