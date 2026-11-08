// Calendrier iOS 6 (vue mois en relief + liste du jour) / Agenda Android 4.1.
import { useMemo, useState } from "react";
import { useList, useValue } from "../data/hooks";
import { AppFrame, BackButton } from "../phone/IOSChrome";
import { LORE_DATE_DEFAULT, useOS } from "../phone/common";
import { AddButton, Cell, Empty, Plain, PlainHeader, Segmented, Toolbar, useEditor } from "../kit/kit";
import { Glyph } from "../kit/glyph";
import { mdiCalendarToday, mdiChevronLeft, mdiChevronRight, mdiInboxArrowDown, mdiMenuLeft, mdiMenuRight } from "@mdi/js";
import "./calendar.css";

type Ev = { day?: number; month?: number; year?: number; title?: string; time?: string; location?: string; order?: number; deleted?: boolean };
const MONTHS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarApp({ pid }: { pid: string }) {
  const os = useOS();
  const lore = useValue<string>("meta/loreDate") || LORE_DATE_DEFAULT;
  const [ly, lm, ld] = lore.split("-").map(Number);
  const [cursor, setCursor] = useState({ y: ly, m: lm });
  const [sel, setSel] = useState({ y: ly, m: lm, d: ld });
  const [view, setView] = useState("month");
  const events = useList<Ev>(`phones/${pid}/data/calendar`);
  const ed = useEditor(pid);
  const path = `phones/${pid}/data/calendar`;
  const fields = ["title", "day", "month", "year", "time", "location"];

  const byDay = useMemo(() => {
    const m = new Map<string, [string, Ev][]>();
    for (const e of events) { const k = `${e[1].year ?? 2012}-${e[1].month}-${e[1].day}`; m.set(k, [...(m.get(k) ?? []), e]); }
    return m;
  }, [events]);
  const key = (y: number, m: number, d: number) => `${y}-${m}-${d}`;
  const first = new Date(cursor.y, cursor.m - 1, 1).getDay();
  const days = new Date(cursor.y, cursor.m, 0).getDate();
  const prevDays = new Date(cursor.y, cursor.m - 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((first + days) / 7) * 7 }, (_, i) => {
    const d = i - first + 1;
    if (d < 1) return { d: prevDays + d, out: true, y: cursor.m === 1 ? cursor.y - 1 : cursor.y, m: cursor.m === 1 ? 12 : cursor.m - 1 };
    if (d > days) return { d: d - days, out: true, y: cursor.m === 12 ? cursor.y + 1 : cursor.y, m: cursor.m === 12 ? 1 : cursor.m + 1 };
    return { d, out: false, y: cursor.y, m: cursor.m };
  });
  const move = (delta: number) => setCursor((c) => { const m = c.m + delta; return m < 1 ? { y: c.y - 1, m: 12 } : m > 12 ? { y: c.y + 1, m: 1 } : { y: c.y, m }; });
  const selected = byDay.get(key(sel.y, sel.m, sel.d)) ?? [];
  const sortedAll = [...events].sort((a, b) => ((a[1].year ?? 2012) - (b[1].year ?? 2012)) || ((a[1].month ?? 0) - (b[1].month ?? 0)) || ((a[1].day ?? 0) - (b[1].day ?? 0)));
  const add = () => ed.add(path, { title: "Nouvel évènement", day: sel.d, month: sel.m, year: sel.y, time: "", location: "" }, { title: "Nouvel évènement", fields });
  const row = ([id, e]: [string, Ev]) => (
    <Cell key={id} title={e.title} subtitle={e.location || undefined} detail={e.time || (os === "ios" ? "all-day" : "Toute la journée")}
      onLong={ed.itemLong(path, id, { label: e.title, fields })} onClick={ed.canEdit ? () => ed.edit({ path: `${path}/${id}`, fields }) : undefined} />
  );

  const goToday = () => { setCursor({ y: ly, m: lm }); setSel({ y: ly, m: lm, d: ld }); };
  const android = os === "android";
  const views = android
    ? [{ id: "day", label: "Jour" }, { id: "month", label: "Mois" }, { id: "list", label: "Planning" }]
    : [{ id: "list", label: "List" }, { id: "day", label: "Day" }, { id: "month", label: "Month" }];
  const selDate = new Date(sel.y, sel.m - 1, sel.d);

  return (
    // iOS 6 : pas de titre (le mois est dans l'en-tête gris) ; Android : mois + année dans la barre d'action.
    <AppFrame title={android ? `${MONTHS_FR[cursor.m - 1]} ${cursor.y}` : ""} left={<BackButton to={`/${pid}/home`} label="Accueil" />}
      right={<>
        {android && <button className="barbtn" aria-label="Aujourd'hui" onClick={goToday}><span className="cal-and-today"><Glyph i={mdiCalendarToday} size={26} /><b>{ld}</b></span></button>}
        <AddButton show={ed.canEdit} onClick={add} />
      </>} bodyClass={`cal-body ${os}`}>
      {android && <Segmented items={views} value={view} onChange={setView} />}
      {view === "month" ? (
        <>
          <div className="cal-head">
            <button onClick={() => move(-1)} aria-label="Mois précédent"><Glyph i={android ? mdiChevronLeft : mdiMenuLeft} size={android ? 24 : 34} /></button>
            <b>{android ? `${MONTHS_FR[cursor.m - 1]} ${cursor.y}` : `${MONTHS_EN[cursor.m - 1]} ${cursor.y}`}</b>
            <button onClick={() => move(1)} aria-label="Mois suivant"><Glyph i={android ? mdiChevronRight : mdiMenuRight} size={android ? 24 : 34} /></button>
          </div>
          <div className="cal-dow">{(android ? ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."] : DAYS).map((d) => <span key={d}>{d}</span>)}</div>
          <div className="cal-grid">
            {cells.map((c, i) => {
              const isToday = c.y === ly && c.m === lm && c.d === ld;
              const isSel = c.y === sel.y && c.m === sel.m && c.d === sel.d;
              const has = byDay.has(key(c.y, c.m, c.d));
              return (
                <button key={i} className={`${c.out ? "out" : ""} ${isToday ? "today" : ""} ${isSel ? "sel" : ""}`}
                  onClick={() => { setSel({ y: c.y, m: c.m, d: c.d }); if (c.out) setCursor({ y: c.y, m: c.m }); }}>
                  <span>{c.d}</span>{has && <i />}
                </button>
              );
            })}
          </div>
          <div className="cal-list"><Plain>{selected.map(row)}{selected.length === 0 && <div className="cal-none">{android ? "Aucun évènement" : "No Events"}</div>}</Plain></div>
        </>
      ) : view === "day" ? (
        <div className="cal-list full">
          <div className="cal-dayhead">
            <button onClick={() => { const d = new Date(sel.y, sel.m - 1, sel.d - 1); setSel({ y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() }); }} aria-label="Jour précédent"><Glyph i={android ? mdiChevronLeft : mdiMenuLeft} size={android ? 24 : 34} /></button>
            <b>{selDate.toLocaleDateString(android ? "fr-FR" : "en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</b>
            <button onClick={() => { const d = new Date(sel.y, sel.m - 1, sel.d + 1); setSel({ y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() }); }} aria-label="Jour suivant"><Glyph i={android ? mdiChevronRight : mdiMenuRight} size={android ? 24 : 34} /></button>
          </div>
          <Plain>{selected.map(row)}{selected.length === 0 && <div className="cal-none">{android ? "Aucun évènement" : "No Events"}</div>}</Plain>
        </div>
      ) : (
        <div className="cal-list full"><Plain>
          {sortedAll.map((e, i) => {
            const prev = sortedAll[i - 1]?.[1];
            const head = !prev || prev.day !== e[1].day || prev.month !== e[1].month;
            const d = new Date(e[1].year ?? 2012, (e[1].month ?? 1) - 1, e[1].day ?? 1);
            return <div key={e[0]}>{head && <PlainHeader>{d.toLocaleDateString(android ? "fr-FR" : "en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</PlainHeader>}{row(e)}</div>;
          })}
          {events.length === 0 && <Empty>No Events</Empty>}
        </Plain></div>
      )}
      {!android && (
        // Barre d'outils iOS 6 : Today | List Day Month | boîte d'invitations
        <Toolbar>
          <button onClick={goToday} className="cal-today">Today</button>
          <Segmented items={views} value={view} onChange={setView} />
          <button className="cal-inbox" aria-label="Invitations"><Glyph i={mdiInboxArrowDown} size={22} /></button>
        </Toolbar>
      )}
      {ed.ui}
    </AppFrame>
  );
}
