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
import { AUGUSTA, AUGUSTA_LABELS, augustaXY } from "./augustaMap";
import "./maps.css";

type Pin = { title?: string; subtitle?: string; phone?: string; url?: string; photo?: string; rating?: number; note?: string; x?: number; y?: number; order?: number; deleted?: boolean };
// Lieux réels (lat, lon) placés sur la carte.
const at = (lat: number, lon: number) => { const { x, y } = augustaXY(lat, lon); return { x: Math.round(x), y: Math.round(y) }; };
const DEFAULT_PINS: Pin[] = [
  { title: "University of Maine at Augusta", subtitle: "46 University Dr, Augusta ME", ...at(44.3383, -69.7962) },
  { title: "Starbucks Augusta Downtown", subtitle: "284 Water St, Augusta ME", ...at(44.3168, -69.7737) },
  { title: "Maine State House", subtitle: "210 State St, Augusta ME", ...at(44.30723, -69.78163) },
];

// Couleurs de Plans iOS 6 (cartographie Apple) / Google Maps Android 2012.
const PAL = {
  ios: { land: "#f1eee4", water: "#9fc7ea", green: "#d7e8bf", campus: "#e6dccd", minor: "#fff", minorC: "#d9d3c5", mid: "#fff", midC: "#cfc6b4", major: "#f7d36a", majorC: "#d9a640", hwy: "#f5a944", hwyC: "#c47a1c", text: "#6e6253" },
  android: { land: "#e9e5dc", water: "#a5c8f0", green: "#cfe8b5", campus: "#dcd2c4", minor: "#fff", minorC: "#d6d0c4", mid: "#fff", midC: "#c9c2b4", major: "#fbdc6a", majorC: "#e0b52c", hwy: "#f9a03f", hwyC: "#d9822b", text: "#5f5f5f" },
};

/** Augusta (Maine) d'après OpenStreetMap : rivière Kennebec, parcs, rues, routes. */
function MapArt({ android }: { android: boolean }) {
  const c = PAL[android ? "android" : "ios"];
  const road = (d: string, w: number, fill: string, casing: string) => <>
    <path d={d} stroke={casing} strokeWidth={w + 1.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <path d={d} stroke={fill} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </>;
  const river = augustaXY(44.3262, -69.7712);
  const town = augustaXY(44.3195, -69.7905);
  return (
    <svg className="mp-svg" viewBox="0 0 320 520" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="320" height="520" fill={c.land} />
      <path d={AUGUSTA.green} fill={c.green} />
      <path d={AUGUSTA.campus} fill={c.campus} />
      <path d={AUGUSTA.water} fill={c.water} fillRule="evenodd" />
      <path d={AUGUSTA.river} stroke={c.water} strokeWidth="3" fill="none" />
      {/* Le Kennebec fait ~150 m de large (~15 px ici) */}
      <path d={AUGUSTA.kennebec} stroke={c.water} strokeWidth="15" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {road(AUGUSTA.minor, 1.6, c.minor, c.minorC)}
      {road(AUGUSTA.mid, 2.4, c.mid, c.midC)}
      {road(AUGUSTA.major, 3, c.major, c.majorC)}
      {road(AUGUSTA.hwy, 3.6, c.hwy, c.hwyC)}
      <g className="mp-labels" fill={c.text}>
        {AUGUSTA_LABELS.map((l) => (
          <text key={l.t} x={l.x} y={l.y} transform={`rotate(${l.a} ${l.x} ${l.y})`} textAnchor="middle" dy="2.5" fontSize="7">{l.t}</text>
        ))}
        <text x={river.x} y={river.y} transform={`rotate(78 ${river.x} ${river.y})`} textAnchor="middle" fontSize="8" fill="#4f7aa8" fontStyle="italic">Kennebec River</text>
        <text x={town.x} y={town.y} textAnchor="middle" fontSize="12" fontWeight="bold" letterSpacing="2" fill="#5d5d5d">AUGUSTA</text>
      </g>
    </svg>
  );
}

// Position de l'utilisateur·rice sur la carte (même repère 320×520 que les épingles).
const ME = at(44.3374, -69.7950); // sur le campus de l'UMA, à côté de son épingle
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
        <div className="mp-bar mp-cardbar"><BarBack onClick={() => setCard(null)} label="Map" /><b>{ios ? "Location" : "Place"}</b><span /></div>
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
            <button onClick={() => { setCard(null); setDir({ id: card, step: -1 }); }}>{ios ? "Directions To Here" : "Directions"}</button>
            <button onClick={() => nav(`/${pid}/contacts`)}>{ios ? "Add to Contacts" : "Add to contacts"}</button>
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
          <button className="mp-btn" onClick={() => setDir(null)}>{ios ? "Clear" : "Close"}</button>
          <div className="mp-dirsum"><b>{r.mins} min</b><span>{r.miles} mi · {dirPin.title}</span></div>
          {dir.step < 0 ? <button className="mp-btn go" onClick={() => setDir({ ...dir, step: 0 })}>Start</button> : <span />}
        </div>
      ) : (
        <div className="mp-bar">
          <BarBack onClick={() => nav(`/${pid}/home`)} label="Home" />
          <div className="mp-search"><Icon name="search" size={13} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={ios ? "Search or Address" : "Search Maps"} /></div>
          <button className="mp-btn" aria-label="Directions" onClick={() => sel && setDir({ id: sel, step: -1 })}><Icon name="map" size={18} /></button>
        </div>
      )}
      {r && dir && dir.step >= 0 && (
        <div className="mp-step">
          <button onClick={() => setDir({ ...dir, step: Math.max(0, dir.step - 1) })} disabled={dir.step === 0} aria-label="Previous step">‹</button>
          <span><small>{dir.step + 1} of {r.steps.length}</small>{r.steps[dir.step]}</span>
          <button onClick={() => setDir({ ...dir, step: Math.min(r.steps.length - 1, dir.step + 1) })} disabled={dir.step === r.steps.length - 1} aria-label="Next step">›</button>
        </div>
      )}
      <div className="mp-map" onClick={() => setSel(null)}>
        <MapArt android={!ios} />
        {r && <svg className="mp-route" viewBox="0 0 320 520" preserveAspectRatio="none" aria-hidden><polyline points={r.pts} /></svg>}
        {rows.filter(([id, p]) => (!dir || id === dir.id) && (!q || (p.title ?? "").toLowerCase().includes(q.toLowerCase()))).map(([id, p]) => (
          <div key={id} className="mp-pin" style={{ left: `${((p.x ?? 160) / 320) * 100}%`, top: `${((p.y ?? 260) / 520) * 100}%` }}
            onClick={(e) => { e.stopPropagation(); setSel(id); }}>
            {sel === id && !dir && <div className="mp-callout"><b>{p.title}</b><span>{p.subtitle}</span><i role="button" aria-label="Location details" onClick={(e) => { e.stopPropagation(); setCard(id); }}>›</i></div>}
            <Press onLong={long(id, PIN_FIELDS, p.title)}><span className="mp-head" /><span className="mp-needle" /></Press>
          </div>
        ))}
        <span className="mp-legal">© OpenStreetMap</span>
        <div className="mp-me" style={{ left: `${(ME.x / 320) * 100}%`, top: `${(ME.y / 520) * 100}%` }} />
      </div>
      <div className="mp-foot">
        <button className="mp-btn" aria-label="My location"><Icon name="compass" size={16} /></button>
        {ed.canEdit && !dir && <button className="mp-btn add" onClick={() => ed.add(path, { title: "New place", subtitle: "", x: 160, y: 260 }, { title: "Lieu", fields: PIN_FIELDS })}>+ Lieu</button>}
        <span className="mp-curl" />
      </div>
      {ed.ui}
    </div>
  );
}
