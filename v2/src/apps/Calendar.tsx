// Calendrier iOS 6 (vue mois en relief + liste du jour) / Agenda Android 4.1.
import { useMemo, useState } from "react";
import { useList, useValue } from "../data/hooks";
import { AppFrame, BackButton } from "../phone/IOSChrome";
import { LORE_DATE_DEFAULT, useOS } from "../phone/common";
import { AddButton, Cell, Empty, Plain, PlainHeader, Segmented, Toolbar, useEditor } from "../kit/kit";
import { Icon } from "../kit/icons";
import "./calendar.css";

type Ev = { day?: number; month?: number; year?: number; title?: string; time?: string; location?: string; order?: number; deleted?: boolean };
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
    <Cell key={id} title={e.title} subtitle={e.location || undefined} detail={e.time || "all-day"}
      onLong={ed.itemLong(path, id, { label: e.title, fields })} onClick={ed.canEdit ? () => ed.edit({ path: `${path}/${id}`, fields }) : undefined} />
  );

  return (
    <AppFrame title={os === "ios" ? "Calendars" : `${MONTHS_EN[cursor.m - 1]} ${cursor.y}`} left={<BackButton to={`/${pid}/home`} label="Accueil" />}
      right={<AddButton show={ed.canEdit} onClick={add} />} bodyClass={`cal-body ${os}`}>
      {view === "month" ? (
        <>
          <div className="cal-head">
            <button onClick={() => move(-1)} aria-label="Mois précédent">◀</button>
            <b>{MONTHS_EN[cursor.m - 1]} {cursor.y}</b>
            <button onClick={() => move(1)} aria-label="Mois suivant">▶</button>
          </div>
          <div className="cal-dow">{DAYS.map((d) => <span key={d}>{d}</span>)}</div>
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
          <div className="cal-list"><Plain>{selected.map(row)}{selected.length === 0 && <div className="cal-none">No Events</div>}</Plain></div>
        </>
      ) : (
        <div className="cal-list full"><Plain>
          {sortedAll.map((e, i) => {
            const prev = sortedAll[i - 1]?.[1];
            const head = !prev || prev.day !== e[1].day || prev.month !== e[1].month;
            const d = new Date(e[1].year ?? 2012, (e[1].month ?? 1) - 1, e[1].day ?? 1);
            return <div key={e[0]}>{head && <PlainHeader>{d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</PlainHeader>}{row(e)}</div>;
          })}
          {events.length === 0 && <Empty>No Events</Empty>}
        </Plain></div>
      )}
      <Toolbar>
        <button onClick={() => { setCursor({ y: ly, m: lm }); setSel({ y: ly, m: lm, d: ld }); }} className="cal-today">{os === "ios" ? "Today" : <Icon name="clock" />}</button>
        <Segmented items={[{ id: "list", label: os === "ios" ? "List" : "Agenda" }, { id: "month", label: os === "ios" ? "Month" : "Mois" }]} value={view} onChange={setView} />
        <span style={{ width: 50 }} />
      </Toolbar>
      {ed.ui}
    </AppFrame>
  );
}
