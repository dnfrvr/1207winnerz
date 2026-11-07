// Heures « lore » (fiction en 2012) : format stocké "6 oct, 2:30pm" (année implicite 2012).
// Repris de src/shared/lore-date.js (sans dépendance React) pour la v2.

export type LoreParts = { day: number; month: number; hour: number | null; min: number; year: number };

const MONTHS: Record<string, number> = { jan: 1, "fév": 2, feb: 2, mar: 3, avr: 4, apr: 4, mai: 5, may: 5, juin: 6, jun: 6, juil: 7, jul: 7, "aoû": 8, aug: 8, sep: 9, oct: 10, nov: 11, "déc": 12, dec: 12 };
const SHORT = ["", "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const FULL_EN = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const parseClock = (s: string): { hour: number | null; min: number } => {
  const m12 = s.match(/(\d{1,2}):(\d{2})\s*(am|pm)/);
  if (m12) {
    let h = parseInt(m12[1]);
    if (m12[3] === "pm" && h !== 12) h += 12;
    if (m12[3] === "am" && h === 12) h = 0;
    return { hour: h, min: parseInt(m12[2]) };
  }
  const m24 = s.match(/(\d{1,2})[h:](\d{0,2})/);
  if (m24) return { hour: parseInt(m24[1]), min: m24[2] ? parseInt(m24[2]) : 0 };
  return { hour: null, min: 0 };
};

export function parseLore(str?: string | null): LoreParts | null {
  if (!str) return null;
  const s = str.toLowerCase().trim();
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(.+))?$/);
  if (slash) {
    let year = parseInt(slash[3]); if (year < 100) year += 2000;
    return { day: parseInt(slash[1]), month: parseInt(slash[2]), year, ...parseClock(slash[4] ?? "") };
  }
  const d = s.match(/(\d+)\s+(jan|fév|feb|mar|avr|apr|mai|may|juin|jun|juil|jul|aoû|aug|sep|oct|nov|déc|dec)/);
  if (!d) return null;
  return { day: parseInt(d[1]), month: MONTHS[d[2]] ?? 10, year: 2012, ...parseClock(s.slice((d.index ?? 0) + d[0].length)) };
}

export const loreToMs = (str?: string | null): number | null => {
  const p = parseLore(str);
  return p ? new Date(p.year, p.month - 1, p.day, p.hour ?? 0, p.min).getTime() : null;
};

export const msToLore = (ms: number): string => {
  const d = new Date(ms);
  const h = d.getHours(), m = d.getMinutes();
  return `${d.getDate()} ${SHORT[d.getMonth() + 1]}, ${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")}${h < 12 ? "am" : "pm"}`;
};

/** Heure médiane entre deux voisins (insertion d'un message entre deux autres). */
export const loreBetween = (prev?: string | null, next?: string | null): string | null => {
  const a = loreToMs(prev), b = loreToMs(next);
  if (a !== null && b !== null) return msToLore(a + Math.round((b - a) / 2));
  if (a !== null) return msToLore(a + 60_000);
  if (b !== null) return msToLore(b - 60_000);
  return null;
};

/** Date lore du jour (YYYY-MM-DD) + heure réelle actuelle → instant « maintenant » dans la fiction. */
export const loreNowMs = (loreDate: string) => {
  const now = new Date();
  const [y, mo, d] = loreDate.split("-").map(Number);
  return new Date(y, mo - 1, d, now.getHours(), now.getMinutes()).getTime();
};

export const clockLabel = (ms: number) => {
  const d = new Date(ms), h = d.getHours();
  return `${h % 12 === 0 ? 12 : h % 12}:${String(d.getMinutes()).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Libellé de la liste des conversations, comme iOS 6 : heure / Yesterday / jour / date courte. */
export const inboxLabel = (ms: number | null, todayMs: number) => {
  if (ms === null) return "";
  const d = new Date(ms), today = new Date(todayMs);
  if (sameDay(d, today)) return clockLabel(ms);
  const y = new Date(todayMs - 86_400_000);
  if (sameDay(d, y)) return "Yesterday";
  if (todayMs - ms < 6 * 86_400_000 && ms < todayMs) return DAYS_EN[d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;
};

/** En-tête horodaté au-dessus des bulles, comme iOS 6 : "Oct 6, 2012 2:30 PM". */
export const stampLabel = (ms: number) => {
  const d = new Date(ms);
  return `${FULL_EN[d.getMonth() + 1].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()} ${clockLabel(ms)}`;
};
