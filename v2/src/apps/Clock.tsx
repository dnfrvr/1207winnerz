// Horloge iOS 6 (horloges mondiales à cadrans, alarmes, chronomètre, minuteur) / Horloge Android 4.1.
import { useEffect, useRef, useState } from "react";
import { useList } from "../data/hooks";
import type { Json } from "../data/store";
import { AppFrame, BackButton } from "../phone/IOSChrome";
import { useNow, useOS } from "../phone/common";
import { AddButton, Cell, Plain, Switch, TabBar, useEditor, type Tab } from "../kit/kit";
import "./clock.css";

const TABS: Tab[] = [
  { id: "world", label: "World Clock", icon: "globe" },
  { id: "alarm", label: "Alarm", icon: "alarm" },
  { id: "stopwatch", label: "Stopwatch", icon: "clock" },
  { id: "timer", label: "Timer", icon: "timer" },
];
// Fuseaux de la fiction (Augusta, Maine = heure de l'Est en octobre 2012 → UTC-4).
const CITIES: { name: string; off: number }[] = [
  { name: "Augusta", off: -4 }, { name: "Chicago", off: -5 }, { name: "Cupertino", off: -7 }, { name: "Paris", off: 2 }, { name: "Tokyo", off: 9 },
];
type Alarm = { time?: string; label?: string; on?: boolean; order?: number; deleted?: boolean };
const DEFAULT_ALARMS: Alarm[] = [{ time: "07:30", label: "Class", on: true }, { time: "09:00", label: "Biblio", on: false }, { time: "23:00", label: "Rappel", on: true }];

export default function ClockApp({ pid }: { pid: string }) {
  const os = useOS();
  const [tab, setTab] = useState(() => sessionStorage.getItem("clock-tab") ?? "world");
  useEffect(() => { try { sessionStorage.setItem("clock-tab", tab); } catch { /* rien */ } }, [tab]);
  const ed = useEditor(pid);
  return (
    <AppFrame title={TABS.find((t) => t.id === tab)?.label} left={<BackButton to={`/${pid}/home`} label="Accueil" />}
      right={tab === "alarm" ? <AddButton show={ed.canEdit} onClick={() => ed.add(`phones/${pid}/data/alarms`, { time: "08:00", label: "Alarm", on: true }, { title: "Nouvelle alarme", fields: ["time", "label", "on"] })} /> : undefined}
      bodyClass={`k-body-tabbed clk ${os}`}>
      <TabBar tabs={TABS} active={tab} onChange={setTab} />
      <div className="k-tab-scroll">
        {tab === "world" && <World />}
        {tab === "alarm" && <Alarms pid={pid} ed={ed} />}
        {tab === "stopwatch" && <Stopwatch />}
        {tab === "timer" && <Timer />}
      </div>
      {ed.ui}
    </AppFrame>
  );
}

function Face({ h, m, night }: { h: number; m: number; night: boolean }) {
  return (
    <svg className={`clk-face ${night ? "night" : ""}`} viewBox="0 0 100 100" width="54" height="54" aria-hidden>
      <circle cx="50" cy="50" r="47" className="rim" />
      {Array.from({ length: 12 }, (_, i) => <line key={i} x1="50" y1="9" x2="50" y2={i % 3 ? 14 : 18} transform={`rotate(${i * 30} 50 50)`} className="tick" />)}
      <line x1="50" y1="50" x2="50" y2="27" className="hand" transform={`rotate(${(h % 12) * 30 + m / 2} 50 50)`} strokeWidth="5" />
      <line x1="50" y1="50" x2="50" y2="15" className="hand" transform={`rotate(${m * 6} 50 50)`} strokeWidth="3.5" />
      <circle cx="50" cy="50" r="3.5" className="pin" />
    </svg>
  );
}

function World() {
  const now = useNow(1000 * 20);
  const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
  return (
    <Plain className="clk-world">
      {CITIES.map((c) => {
        const t = new Date(utc + c.off * 3600_000);
        const h = t.getHours(), m = t.getMinutes();
        const night = h < 6 || h >= 19;
        const dayDiff = t.getDate() - new Date(utc - 4 * 3600_000).getDate();
        return (
          <div key={c.name} className="clk-row">
            <Face h={h} m={m} night={night} />
            <div className="clk-city"><b>{c.name}</b><span>{dayDiff === 0 ? "Today" : dayDiff > 0 ? "Tomorrow" : "Yesterday"}</span></div>
            <div className="clk-time">{t.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
          </div>
        );
      })}
    </Plain>
  );
}

function Alarms({ pid, ed }: { pid: string; ed: ReturnType<typeof useEditor> }) {
  const list = useList<Alarm>(`phones/${pid}/data/alarms`);
  const path = `phones/${pid}/data/alarms`;
  const rows: [string, Alarm][] = list.length ? list : DEFAULT_ALARMS.map((a, i) => [`default${i}`, a]);
  // Alarmes par défaut : écrites dans la base au premier changement.
  const toggle = (id: string, on: boolean) => {
    if (id.startsWith("default")) {
      const patches: Record<string, Json> = {};
      DEFAULT_ALARMS.forEach((a, i) => { patches[`${path}/a${i}`] = { ...a, on: `default${i}` === id ? on : !!a.on, order: (i + 1) * 1000 } as Json; });
      ed.write(patches);
    } else ed.write({ [`${path}/${id}/on`]: on });
  };
  return (
    <Plain className="clk-alarms">
      {rows.map(([id, a]) => (
        <Cell key={id} title={<span className="clk-al-time">{a.time}</span>} subtitle={a.label}
          accessory={<Switch on={!!a.on} onChange={ed.canEdit ? (v) => toggle(id, v) : undefined} />}
          onLong={id.startsWith("default") ? undefined : ed.itemLong(path, id, { fields: ["time", "label", "on"] })} />
      ))}
    </Plain>
  );
}

const fmtMs = (ms: number) => {
  const cs = Math.floor(ms / 10) % 100, s = Math.floor(ms / 1000) % 60, m = Math.floor(ms / 60000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
};

function Stopwatch() {
  const [run, setRun] = useState<{ start: number; acc: number; on: boolean }>({ start: 0, acc: 0, on: false });
  const [laps, setLaps] = useState<number[]>([]);
  const [, tick] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    if (!run.on) return;
    const loop = () => { tick((n) => n + 1); raf.current = requestAnimationFrame(loop); };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [run.on]);
  const t = run.acc + (run.on ? Date.now() - run.start : 0);
  return (
    <div className="clk-sw">
      <div className="clk-lcd"><small>{laps.length ? fmtMs(t - laps.reduce((a, b) => a + b, 0)) : ""}</small><b>{fmtMs(t)}</b></div>
      <div className="clk-btns">
        <button className={run.on ? "red" : "green"} onClick={() => setRun((r) => r.on ? { ...r, on: false, acc: r.acc + Date.now() - r.start } : { ...r, on: true, start: Date.now() })}>{run.on ? "Stop" : "Start"}</button>
        <button onClick={() => run.on ? setLaps((l) => [...l, t - l.reduce((a, b) => a + b, 0)]) : (setRun({ start: 0, acc: 0, on: false }), setLaps([]))}>{run.on ? "Lap" : "Reset"}</button>
      </div>
      <Plain>{laps.map((l, i) => <Cell key={i} title={`Lap ${i + 1}`} detail={fmtMs(l)} />).reverse()}</Plain>
    </div>
  );
}

function Timer() {
  const [mins, setMins] = useState(5);
  const [end, setEnd] = useState<number | null>(null);
  const [, tick] = useState(0);
  useEffect(() => { if (!end) return; const h = setInterval(() => tick((n) => n + 1), 250); return () => clearInterval(h); }, [end]);
  const left = end ? Math.max(0, end - Date.now()) : mins * 60_000;
  const done = end !== null && left === 0;
  return (
    <div className="clk-timer">
      {end === null ? (
        <div className="clk-picker">
          <div className="clk-wheel">
            {[mins - 2, mins - 1, mins, mins + 1, mins + 2].map((v, i) => <span key={i} className={i === 2 ? "sel" : ""}>{v >= 0 && v < 60 ? v : ""}</span>)}
          </div>
          <span className="clk-unit">min</span>
          <div className="clk-step"><button onClick={() => setMins((m) => Math.max(1, m - 1))}>−</button><button onClick={() => setMins((m) => Math.min(59, m + 1))}>+</button></div>
        </div>
      ) : (
        <div className={`clk-lcd big ${done ? "done" : ""}`}><b>{fmtMs(left).slice(0, 5)}</b></div>
      )}
      <div className="clk-btns one">
        <button className={end ? "red" : "green"} onClick={() => setEnd(end ? null : Date.now() + mins * 60_000)}>{end ? (done ? "OK" : "Cancel") : "Start"}</button>
      </div>
    </div>
  );
}
