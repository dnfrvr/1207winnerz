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
  if (p) return new Date(p.year, p.month - 1, p.day, p.hour ?? 0, p.min).getTime();
  // Autres formats saisis à la main (« Jul 13, 8pm », « Sept 30 2012 »…).
  const f = str?.trim() ? parseDateField(str) : null;
  return f ? new Date(f.value.length > 10 ? f.value : `${f.value}T00:00`).getTime() : null;
};

// Champs de date d'un élément (pas « due » : un rappel dans le futur est normal).
const LORE_DATE_KEY = /(^|\/)(date|time|posted|when)$/;
export const LORE_BUMP = "uma-lore-bump";

/** Jour (YYYY-MM-DD) de la date la plus tardive écrite dans `patches`, si elle dépasse le jour de lore ; sinon null. */
export function dateAfterLore(patches: Record<string, unknown>, lore: string): string | null {
  const [y, mo, d] = lore.split("-").map(Number);
  const end = new Date(y, mo - 1, d + 1).getTime();
  let max = -Infinity;
  const look = (key: string, v: unknown) => { if (typeof v === "string" && LORE_DATE_KEY.test(key)) max = Math.max(max, loreToMs(v) ?? -Infinity); };
  for (const [path, v] of Object.entries(patches)) {
    look(path, v);
    if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) look(k, x);
  }
  if (max < end) return null;
  const t = new Date(max);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

/** Plus récent d'abord ; ce qui n'a pas de date lisible reste à la fin, dans son ordre. */
export const newestFirst = <T,>(list: T[], when: (x: T) => string | null | undefined): T[] =>
  list.map((x) => [x, loreToMs(when(x)) ?? -Infinity] as const)
    .sort((a, b) => (b[1] - a[1]) || 0)
    .map(([x]) => x);

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

/** Libellé de jour (pastille Android) : "October 6". */
export const dayLabel = (ms: number) => {
  if (!ms) return "";
  const d = new Date(ms);
  return `${FULL_EN[d.getMonth() + 1]} ${d.getDate()}`;
};

/** En-tête horodaté au-dessus des bulles, comme iOS 6 : "Oct 6, 2012 2:30 PM". */
export const stampLabel = (ms: number) => {
  const d = new Date(ms);
  return `${FULL_EN[d.getMonth() + 1].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()} ${clockLabel(ms)}`;
};

// ─── Sélecteur de date ─────────────────────────────────────────────────────
// Les dates sont stockées en texte dans des formats variés (« 18 sep, 5:10pm », « 13 Sep 2012 »,
// « Oct 1 at 12:14PM », « 08/04/2012 11:00am »…). On les lit en jour précis pour un <input> natif,
// puis on réécrit le choix dans le MÊME format (modèle à trous), pour ne rien changer à l'affichage.
const MON_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MON_FR = ["jan", "fév", "mar", "avr", "mai", "juin", "juil", "août", "sep", "oct", "nov", "déc"];
const MON_PREFIX: [string, number][] = [["jan", 1], ["feb", 2], ["fév", 2], ["mar", 3], ["apr", 4], ["avr", 4], ["may", 5], ["mai", 5], ["jun", 6], ["juin", 6], ["jul", 7], ["juil", 7], ["aug", 8], ["aoû", 8], ["sep", 9], ["oct", 10], ["nov", 11], ["dec", 12], ["déc", 12]];
const FR_ONLY = /^(fév|avr|mai|juin|juil|aoû|déc|janv|mars|sept)/;
const MON_RE = /(?<![a-zà-ÿ])(jan|feb|fév|mar|apr|avr|may|mai|jun|juin|jul|juil|aug|aoû|sep|oct|nov|dec|déc)[a-zà-ÿ]*\.?/i;

export type DateField = {
  type: "date" | "datetime-local"; value: string; tpl: string; orig: string; tok: string; mo: number;
  fr: boolean; cap: boolean; dPad: boolean; hPad: boolean; ampm: "" | "am" | "AM"; sp: boolean;
};
const p2 = (n: number) => String(n).padStart(2, "0");

/** Lit une date texte (null si ce n'est pas une date avec un jour ou un mois). "" = date vide au format lore. */
export function parseDateField(s: string): DateField | null {
  const f: DateField = { type: "date", value: "", tpl: "", orig: s, tok: "", mo: 0, fr: false, cap: false, dPad: false, hPad: false, ampm: "", sp: false };
  if (!s.trim()) return { ...f, tpl: "{D} {M}" };
  let t = s, y = 2012, mo = 0, d = 0, h: number | null = null, mi = 0;
  const cut = (i: number, len: number, tok: string) => { t = t.slice(0, i) + tok + t.slice(i + len); };
  const slash = t.match(/(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})/);
  const clock = t.match(/(\d{1,2}):(\d{2})(\s*)(am|pm)?/i);
  if (clock && clock.index !== undefined && (!slash || clock.index > (slash.index ?? 0) + slash[0].length)) {
    h = +clock[1] % 24; mi = +clock[2]; f.hPad = clock[1].startsWith("0") || (!clock[4] && clock[1].length === 2);
    if (clock[4]) { f.ampm = clock[4] === clock[4].toUpperCase() ? "AM" : "am"; f.sp = !!clock[3]; if (/pm/i.test(clock[4]) && h !== 12) h += 12; if (/am/i.test(clock[4]) && h === 12) h = 0; }
    cut(clock.index, clock[0].length, "{T}");
  }
  if (slash && slash.index !== undefined) {
    d = +slash[1]; mo = +slash[2]; y = +slash[3] < 100 ? 2000 + +slash[3] : +slash[3]; f.dPad = slash[1].length === 2;
    cut(slash.index, slash[0].length, `{D}/{MO}/${slash[3].length === 2 ? "{YY}" : "{Y}"}`);
  } else {
    const m = t.match(MON_RE);
    if (!m || m.index === undefined) return null;
    const tok = m[1].toLowerCase();
    mo = MON_PREFIX.find(([p]) => tok.startsWith(p))![1];
    f.fr = FR_ONLY.test(tok); f.tok = m[0]; f.mo = mo; f.cap = m[0][0] !== m[0][0].toLowerCase();
    cut(m.index, m[0].length, "{M}");
    const yr = t.match(/(?<!\d)(19|20)\d{2}(?!\d)/);
    if (yr && yr.index !== undefined) { y = +yr[0]; cut(yr.index, 4, "{Y}"); }
    const at = t.indexOf("{M}");
    const before = t.slice(0, at).match(/(\d{1,2})(\s*)$/), after = t.slice(at + 3).match(/^(\s*)(\d{1,2})(?![\d:])/);
    if (before && before.index !== undefined) { d = +before[1]; f.dPad = before[1].startsWith("0"); cut(before.index, before[1].length, "{D}"); }
    else if (after) { d = +after[2]; f.dPad = after[2].startsWith("0"); cut(at + 3 + after[1].length, after[2].length, "{D}"); }
    else if (t.includes("{Y}")) { d = 1; t = "{D} {M} {Y}"; } // « Oct 2012 » : on passe à un jour précis
    else return null;
  }
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return null;
  f.tpl = t;
  const date = `${y}-${p2(mo)}-${p2(d)}`;
  return h === null ? { ...f, value: date } : { ...f, type: "datetime-local", value: `${date}T${p2(h)}:${p2(mi)}` };
}

/** Réécrit la valeur d'un <input type="date|datetime-local"> dans le format de `f`. */
export function formatDateField(f: DateField, input: string): string {
  const m = input.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!m) return "";
  if (input === f.value) return f.orig; // rien changé : on garde le texte exact
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  const h = m[4] === undefined ? 0 : +m[4], mi = m[5] ?? "00";
  const name = mo === f.mo ? f.tok : f.fr ? MON_FR[mo - 1] : MON_EN[mo - 1]; // même mois : même orthographe
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const clock = f.ampm
    ? `${f.hPad ? p2(h12) : h12}:${mi}${f.sp ? " " : ""}${h < 12 ? "am" : "pm"}`
    : `${f.hPad ? p2(h) : h}:${mi}`;
  return f.tpl
    .replace("{D}", f.dPad ? p2(d) : String(d))
    .replace("{MO}", p2(mo))
    .replace("{M}", mo === f.mo ? name : f.cap ? name[0].toUpperCase() + name.slice(1) : name.toLowerCase())
    .replace("{YY}", p2(y % 100))
    .replace("{Y}", String(y))
    .replace("{T}", f.ampm === "AM" ? clock.toUpperCase() : clock);
}
