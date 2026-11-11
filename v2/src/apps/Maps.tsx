// Plans iOS 6 (cartographie Apple : fond beige, routes blanches/jaunes, épingle rouge à bulle)
// / Google Maps Android. Carte d'Augusta (Maine) dessinée, épingles éditables.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { StatusBar, BarBack } from "../phone/IOSChrome";
import { useOS } from "../phone/common";
import { useEditor, useSeeded } from "../kit/kit";
import { Press } from "./social";
import { Icon } from "../kit/icons";
import { img } from "../lib/img";
import "./maps.css";

type Pin = { title?: string; subtitle?: string; phone?: string; url?: string; photo?: string; rating?: number; note?: string; x?: number; y?: number; order?: number; deleted?: boolean };
const DEFAULT_PINS: Pin[] = [
  { title: "University of Maine at Augusta", subtitle: "46 University Dr, Augusta ME", x: 170, y: 190 },
  { title: "Starbucks Augusta Downtown", subtitle: "284 Water St, Augusta ME", x: 238, y: 318 },
];

function MapArt({ android }: { android: boolean }) {
  return (
    <svg className="mp-svg" viewBox="0 0 320 520" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="320" height="520" fill={android ? "#e9e5dc" : "#f1eee4"} />
      <path d="M40 0 L70 120 L60 260 L110 380 L90 520 L0 520 L0 0Z" fill={android ? "#cfe8b5" : "#d7e8bf"} opacity=".8" />
      <path d="M260 0 C250 80 285 140 270 220 C255 300 300 360 285 440 C278 480 290 500 286 520" stroke={android ? "#a5c8f0" : "#9fc7ea"} strokeWidth="34" fill="none" />
      <text x="292" y="300" fontSize="9" fill="#5e85b0" transform="rotate(80 292 300)" fontStyle="italic">Kennebec River</text>
      {[60, 140, 220, 300, 380, 460].map((y) => <path key={y} d={`M0 ${y} L320 ${y + 18}`} stroke="#fff" strokeWidth="5" />)}
      {[30, 110, 190].map((x) => <path key={x} d={`M${x} 0 L${x + 25} 520`} stroke="#fff" strokeWidth="5" />)}
      <path d="M0 250 C80 240 150 270 230 250 S320 230 320 230" stroke={android ? "#f9d34a" : "#f7c752"} strokeWidth="8" fill="none" />
      <path d="M0 250 C80 240 150 270 230 250 S320 230 320 230" stroke={android ? "#e8b923" : "#e4a83a"} strokeWidth="1" fill="none" />
      <path d="M130 0 C140 120 120 300 150 520" stroke={android ? "#f9d34a" : "#f7c752"} strokeWidth="7" fill="none" />
      <rect x="140" y="160" width="70" height="55" rx="4" fill={android ? "#dcd2c4" : "#e6dccd"} />
      <text x="147" y="226" fontSize="8" fill="#7a6a55">UMA Campus</text>
      <text x="14" y="244" fontSize="8" fill="#8a7a65">Western Ave</text>
      <text x="138" y="40" fontSize="8" fill="#8a7a65" transform="rotate(84 138 40)">Civic Center Dr</text>
      <text x="200" y="330" fontSize="8" fill="#8a7a65">Water St</text>
      <text x="20" y="420" fontSize="9" fill="#6b8f4e" fontStyle="italic">Capitol Park</text>
      <text x="96" y="500" fontSize="12" fill="#666" fontWeight="bold" letterSpacing="2">AUGUSTA</text>
    </svg>
  );
}

// Position de l'utilisateur·rice sur la carte (même repère 320×520 que les épingles).
const ME = { x: 166, y: 229 };
const PIN_FIELDS = ["title", "subtitle", "phone", "url", "photo", "rating", "note", "x", "y"];

/** Itinéraire « à la Plans 2012 » : on suit les rues (horizontal puis vertical), ~9 m par point. */
function route(to: Pin) {
  const tx = to.x ?? 160, ty = to.y ?? 260;
  const dx = tx - ME.x, dy = ty - ME.y;
  const meters = (Math.abs(dx) + Math.abs(dy)) * 9;
  const miles = meters / 1609;
  const steps = [
    `Head ${dx >= 0 ? "east" : "west"} — ${Math.round(Math.abs(dx) * 9)} m`,
    `Turn ${(dx >= 0) === (dy >= 0) ? "right" : "left"} — ${Math.round(Math.abs(dy) * 9)} m`,
    `Arrive at ${to.title ?? "destination"}`,
  ];
  return { pts: `${ME.x},${ME.y} ${tx},${ME.y} ${tx},${ty}`, mins: Math.max(1, Math.round(meters / 400)), miles: miles < 0.1 ? "0.1" : miles.toFixed(1), steps };
}

export default function MapsApp({ pid }: { pid: string }) {
  const os = useOS();
  const nav = useNavigate();
  const ed = useEditor(pid);
  const path = `phones/${pid}/data/maps/pins`;
  const { rows, long } = useSeeded(path, DEFAULT_PINS, ed);
  const [sel, setSel] = useState<string | null>(rows[0]?.[0] ?? null);
  const [q, setQ] = useState("");
  const [card, setCard] = useState<string | null>(null);
  const [dir, setDir] = useState<{ id: string; step: number } | null>(null);
  const ios = os === "ios";
  const pinOf = (id: string | null) => rows.find(([k]) => k === id)?.[1];
  const cardPin = pinOf(card);
  const dirPin = dir ? pinOf(dir.id) : undefined;
  const r = dirPin ? route(dirPin) : null;
  const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

  // Fiche du lieu (iOS 6 « Location ») : flèche de la bulle.
  if (cardPin && card) {
    const rating = Math.min(5, Math.max(0, Number(cardPin.rating) || 0));
    return (
      <div className={`app mp ${os}`}>
        <StatusBar />
        <div className="mp-bar mp-cardbar"><BarBack onClick={() => setCard(null)} label="Map" /><b>{ios ? "Location" : "Lieu"}</b><span /></div>
        <div className="mp-card" onContextMenu={(e) => { e.preventDefault(); long(card, PIN_FIELDS, cardPin.title)?.(); }}>
          <div className="mp-card-head">
            <span className="mp-card-photo" style={cardPin.photo ? { backgroundImage: `url(${img(cardPin.photo)})` } : undefined} />
            <div><b>{cardPin.title}</b>{rating > 0 && <span className="mp-stars">{stars(rating)}</span>}</div>
          </div>
          <div className="mp-card-group">
            {cardPin.phone && <div><small>phone</small><span>{cardPin.phone}</span></div>}
            {cardPin.subtitle && <div><small>address</small><span>{cardPin.subtitle}</span></div>}
            {cardPin.url && <div><small>home page</small><span className="lnk">{cardPin.url}</span></div>}
            {cardPin.note && <div><small>notes</small><span>{cardPin.note}</span></div>}
          </div>
          <div className="mp-card-btns">
            <button onClick={() => { setCard(null); setDir({ id: card, step: -1 }); }}>{ios ? "Directions To Here" : "Itinéraire"}</button>
            <button onClick={() => nav(`/${pid}/contacts`)}>{ios ? "Add to Contacts" : "Ajouter aux contacts"}</button>
          </div>
          {ed.canEdit && <button className="mp-card-edit" onClick={() => long(card, PIN_FIELDS, cardPin.title)?.()}>Modifier le lieu</button>}
        </div>
        {ed.ui}
      </div>
    );
  }

  return (
    <div className={`app mp ${os}`}>
      <StatusBar />
      {r && dirPin && dir ? (
        <div className="mp-bar mp-dirbar">
          <button className="mp-btn" onClick={() => setDir(null)}>{ios ? "Clear" : "Fermer"}</button>
          <div className="mp-dirsum"><b>{r.mins} min</b><span>{r.miles} mi · {dirPin.title}</span></div>
          {dir.step < 0 ? <button className="mp-btn go" onClick={() => setDir({ ...dir, step: 0 })}>Start</button> : <span />}
        </div>
      ) : (
        <div className="mp-bar">
          <BarBack onClick={() => nav(`/${pid}/home`)} label="Accueil" />
          <div className="mp-search"><Icon name="search" size={13} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={ios ? "Search or Address" : "Rechercher dans Maps"} /></div>
          <button className="mp-btn" aria-label="Itinéraire" onClick={() => sel && setDir({ id: sel, step: -1 })}><Icon name="map" size={18} /></button>
        </div>
      )}
      {r && dir && dir.step >= 0 && (
        <div className="mp-step">
          <button onClick={() => setDir({ ...dir, step: Math.max(0, dir.step - 1) })} disabled={dir.step === 0} aria-label="Étape précédente">‹</button>
          <span><small>{dir.step + 1} of {r.steps.length}</small>{r.steps[dir.step]}</span>
          <button onClick={() => setDir({ ...dir, step: Math.min(r.steps.length - 1, dir.step + 1) })} disabled={dir.step === r.steps.length - 1} aria-label="Étape suivante">›</button>
        </div>
      )}
      <div className="mp-map" onClick={() => setSel(null)}>
        <MapArt android={!ios} />
        {r && <svg className="mp-route" viewBox="0 0 320 520" preserveAspectRatio="none" aria-hidden><polyline points={r.pts} /></svg>}
        {rows.filter(([id, p]) => (!dir || id === dir.id) && (!q || (p.title ?? "").toLowerCase().includes(q.toLowerCase()))).map(([id, p]) => (
          <div key={id} className="mp-pin" style={{ left: `${((p.x ?? 160) / 320) * 100}%`, top: `${((p.y ?? 260) / 520) * 100}%` }}
            onClick={(e) => { e.stopPropagation(); setSel(id); }}>
            {sel === id && !dir && <div className="mp-callout"><b>{p.title}</b><span>{p.subtitle}</span><i role="button" aria-label="Fiche du lieu" onClick={(e) => { e.stopPropagation(); setCard(id); }}>›</i></div>}
            <Press onLong={long(id, PIN_FIELDS, p.title)}><span className="mp-head" /><span className="mp-needle" /></Press>
          </div>
        ))}
        <div className="mp-me" style={{ left: `${(ME.x / 320) * 100}%`, top: `${(ME.y / 520) * 100}%` }} />
      </div>
      <div className="mp-foot">
        <button className="mp-btn" aria-label="Ma position"><Icon name="compass" size={16} /></button>
        {ed.canEdit && !dir && <button className="mp-btn add" onClick={() => ed.add(path, { title: "Nouveau lieu", subtitle: "", x: 160, y: 260 }, { title: "Lieu", fields: PIN_FIELDS })}>+ Lieu</button>}
        <span className="mp-curl" />
      </div>
      {ed.ui}
    </div>
  );
}
