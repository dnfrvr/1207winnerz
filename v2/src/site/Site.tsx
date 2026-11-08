// Interface du site (hors téléphones) : bureau Aero de 2009, fenêtre façon messagerie instantanée
// (les 4 persos en « contacts », avec leurs mini-téléphones), barre des tâches dont l'horloge
// donne la date de lore, et « Panneau de configuration » pour le MDJ (date de lore, téléphones).
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useData, useValue, useWriter } from "../data/hooks";
import { img } from "../lib/img";
import { LORE_DATE_DEFAULT } from "../phone/common";
import { LockPreview } from "../phone/Phone";
import "./site.css";

export const PIDS = ["glinda", "eoghan", "drew", "elias"] as const;

type Profile = { name?: string; os?: string; avatar?: string | { src?: string }; accentColor?: string; phoneColor?: string; wallpaper?: string;
  username?: string };
const avatarOf = (p?: Profile) => (typeof p?.avatar === "string" ? p.avatar : p?.avatar?.src);

/** Fenêtre au verre dépoli avec barre de titre et boutons ─ □ ✕ (décoratifs). */
export function Win({ title, icon = "💬", children, className = "" }: { title: string; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`w7-win ${className}`}>
      <header className="w7-title"><span className="w7-ico" aria-hidden>{icon}</span><h2>{title}</h2>
        <span className="w7-caps" aria-hidden><i>─</i><i>□</i><i className="x">✕</i></span></header>
      <div className="w7-body">{children}</div>
    </section>
  );
}

/** Bureau + barre des tâches (horloge = date de lore). */
export function Desktop({ children, taskbar }: { children: ReactNode; taskbar?: ReactNode }) {
  const lore = useValue<string>("meta/loreDate") || LORE_DATE_DEFAULT;
  const [y, m, d] = lore.split("-");
  const time = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="w7-desk">
      <div className="w7-bloom" aria-hidden />
      <main className="w7-main">{children}</main>
      <footer className="w7-bar">
        <span className="w7-orb" aria-hidden>UMA</span>
        <span className="w7-tasks">{taskbar}</span>
        <span className="w7-clock"><b>{time}</b><small>{d}/{m}/{y}</small></span>
      </footer>
    </div>
  );
}

/** Un téléphone de l'accueil : coque (couleur et système du perso) + son vrai écran de verrouillage. */
function PhoneCard({ pid, mine }: { pid: string; mine: boolean }) {
  const p = useValue<Profile>(`phones/${pid}/profile`);
  const av = avatarOf(p);
  const android = p?.os === "android";
  return (
    <Link to={`/${pid}`} className={`w7-phone ${mine ? "mine" : ""}`}>
      <span className={`mini ${android ? "and" : "ios"} ${p?.phoneColor === "white" ? "white" : ""}`}>
        <LockPreview pid={pid} width={android ? 112 : 104} />
      </span>
      <span className="w7-phone-name">
        <span className="dp sm" style={{ ["--st" as string]: mine ? "#4ad94a" : "#f2b324" }}>{av ? <img src={img(av)} alt="" /> : <span>{(p?.name ?? pid)[0]}</span>}</span>
        <b>{(p?.name ?? pid).split(" ")[0]}<span className="last">{(p?.name ?? "").split(" ").slice(1).map((w) => ` ${w}`).join("")}</span></b>
      </span>
    </Link>
  );
}

// ── Visite guidée (première visite) : démos animées de ce qu'on peut faire ─────
const TOUR_KEY = "uma-v2-tour-seen";
const STEPS: { title: string; text: string; demo: ReactNode }[] = [
  { title: "Bienvenue dans ton téléphone", text: "Chaque joueur·se a le téléphone de son perso. Clique sur le tien pour l'allumer, glisse pour déverrouiller.",
    demo: <span className="tour-phone"><span className="tour-slide"><i /></span></span> },
  { title: "Appui long pour modifier", text: "Sur ton téléphone, garde le doigt appuyé (ou clic droit) sur n'importe quoi : un message, une photo, une chanson… puis « Modifier ».",
    demo: <span className="tour-phone list"><b /><b className="hit" /><b /><span className="tour-finger" /><span className="tour-sheet"><i>Modifier</i><i className="red">Supprimer</i></span></span> },
  { title: "« + » pour ajouter du contenu", text: "Le bouton + en haut des apps crée un post, une note, une chanson (avec sa pochette, trouvée toute seule)…",
    demo: <span className="tour-phone list add"><span className="tour-plus">+</span><b className="new" /><b /><b /></span> },
  { title: "Fouille les téléphones des autres", text: "Tu peux ouvrir les téléphones des autres persos en lecture seule. Ce qu'ils changent apparaît en direct.",
    demo: <span className="tour-four"><i /><i /><i /><i /></span> },
];

function Tour({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const s = STEPS[i];
  const last = i === STEPS.length - 1;
  return (
    <div className="tour-backdrop" role="dialog" aria-modal="true" aria-label="Visite guidée">
      <Win title="Visite guidée" icon="❔" className="tour">
        <div className="tour-in" key={i}>
          <div className="tour-demo" aria-hidden>{s.demo}</div>
          <div className="tour-txt"><h3>{s.title}</h3><p>{s.text}</p>
            <span className="tour-dots">{STEPS.map((_, k) => <i key={k} className={k === i ? "on" : ""} />)}</span></div>
        </div>
        <div className="tour-btns">
          <button className="linkish" onClick={onClose}>Passer</button>
          {i > 0 && <button className="y2k-btn" onClick={() => setI(i - 1)}>‹ Précédent</button>}
          <button className="y2k-btn" autoFocus onClick={() => (last ? onClose() : setI(i + 1))}>{last ? "C'est parti !" : "Suivant ›"}</button>
        </div>
      </Win>
    </div>
  );
}

const seenTour = () => { try { return localStorage.getItem(TOUR_KEY) === "1"; } catch { return true; } };

export function Lobby({ me, account, admin }: { me: string | null; account: ReactNode; admin: boolean }) {
  const [open, setOpen] = useState(true);
  const [tour, setTour] = useState(() => !seenTour());
  const closeTour = () => { setTour(false); try { localStorage.setItem(TOUR_KEY, "1"); } catch { /* rien */ } };
  const mine = useValue<Profile>(me ? `phones/${me}/profile` : null);
  return (
    <Desktop taskbar={<><span className="w7-task on">💬 #WhatsInOurPhones</span>{admin && <Link className="w7-task" to="/admin">⚙ Panneau de configuration</Link>}
      <button className="w7-task" onClick={() => setTour(true)}>❔ Visite guidée</button></>}>
      {tour && <Tour onClose={closeTour} />}
      <Win title="#WhatsInOurPhones — University of Maine at Augusta" className="w7-msn">
        <div className="w7-me">
          <span className="dp big" style={{ ["--st" as string]: "#4ad94a" }}>{avatarOf(mine) ? <img src={img(avatarOf(mine)!)} alt="" /> : <span>{admin ? "MDJ" : "?"}</span>}</span>
          <span className="who">
            <b>{mine?.name ?? (admin ? "Maître·sse du jeu" : "Invité·e")} <i className="st">(En ligne)</i></b>
          </span>
        </div>
        <div className="w7-account">{account}</div>
        <button className="w7-group" onClick={() => setOpen((o) => !o)} aria-expanded={open}>{open ? "▾" : "▸"} Téléphones ({PIDS.length})</button>
        {open && <div className="w7-grid">{PIDS.map((p, i) => <div key={p} style={{ animationDelay: `${i * 70}ms` }} className="w7-in"><PhoneCard pid={p} mine={me === p} /></div>)}</div>}
        <p className="w7-hint">Clique sur un téléphone pour l'ouvrir. Sur le tien, appui long (ou clic droit) sur n'importe quoi pour le modifier.</p>
      </Win>
    </Desktop>
  );
}

// ── Panneau de configuration (MDJ) ────────────────────────────────────────────
const PHONE_FIELDS: { key: keyof Profile; label: string; type?: string; options?: string[] }[] = [
  { key: "name", label: "Nom" }, { key: "username", label: "Pseudo" }, { key: "os", label: "Système", options: ["ios", "android"] },
  { key: "phoneColor", label: "Coque", options: ["white", "black"] }, { key: "accentColor", label: "Couleur d'accent", type: "color" },
  { key: "wallpaper", label: "Fond d'écran (URL)" },
];

function PhoneSettings({ pid }: { pid: string }) {
  const p = useValue<Profile>(`phones/${pid}/profile`) ?? {};
  const { set } = useWriter(pid);
  return (
    <fieldset className="w7-fs">
      <legend>{p.name ?? pid}</legend>
      {PHONE_FIELDS.map((f) => (
        <label key={f.key}><span>{f.label}</span>
          {f.options ? (
            <select value={String(p[f.key] ?? "")} onChange={(e) => set(`phones/${pid}/profile/${f.key}`, e.target.value)}>
              {f.options.map((o) => <option key={o}>{o}</option>)}
            </select>
          ) : (
            <input type={f.type ?? "text"} defaultValue={String(p[f.key] ?? (f.type === "color" ? "#33b5e5" : ""))} key={String(p[f.key] ?? "")}
              onBlur={(e) => e.target.value !== String(p[f.key] ?? "") && set(`phones/${pid}/profile/${f.key}`, e.target.value)} />
          )}
        </label>
      ))}
    </fieldset>
  );
}

export function Admin() {
  const { session } = useData();
  const lore = useValue<string>("meta/loreDate") || LORE_DATE_DEFAULT;
  const { set } = useWriter("meta");
  if (session.role !== "mdj") return (
    <Desktop><Win title="Accès refusé" icon="🔒"><p className="w7-p">Le panneau de configuration est réservé au MDJ. <Link to="/">Retour</Link></p></Win></Desktop>
  );
  return (
    <Desktop taskbar={<><Link className="w7-task" to="/">💬 #WhatsInOurPhones</Link><span className="w7-task on">⚙ Panneau de configuration</span></>}>
      <Win title="Panneau de configuration" icon="⚙" className="w7-cp">
        <nav className="w7-crumbs"><Link to="/">Accueil</Link> › Panneau de configuration</nav>
        <fieldset className="w7-fs">
          <legend>Date et heure de la fiction</legend>
          <label><span>Date de lore (« Aujourd'hui » dans les téléphones)</span>
            <input type="date" value={lore} min="2012-01-01" max="2013-12-31" onChange={(e) => e.target.value && set("meta/loreDate", e.target.value)} /></label>
        </fieldset>
        <div className="w7-cols">{PIDS.map((p) => <PhoneSettings key={p} pid={p} />)}</div>
      </Win>
    </Desktop>
  );
}
