// Appel entrant simulé (lancé par le MDJ depuis la régie). Un seul appel à la fois par téléphone :
// phones/{pid}/call = { id, contact, state, startedAt, answeredAt?, endedAt?, result? }.
// À la fin, l'appel s'ajoute aux récents (data/calls/call_{id}) ; refusé ou sans réponse → appel
// manqué + notif. Les ids sont fixes (call_{id}, n_call_{id}) : si le téléphone et la régie terminent
// l'appel en même temps, ils écrivent la même chose au même endroit.
import { loreNowMs, msToLore } from "../lib/loreTime";
import { makeId, type Json, type Patches } from "./store";

export type CallState = "ringing" | "active" | "ended";
export type CallResult = "declined" | "missed" | "ended";
export type LiveCall = { id: string; contact: string; state: CallState; startedAt: number; answeredAt?: number; endedAt?: number; result?: CallResult };

/** Sans réponse au bout de ce délai : appel manqué. */
export const RING_MS = 30_000;

export const callPath = (pid: string) => `phones/${pid}/call`;

export const startCallPatches = (pid: string, contact: string): { patches: Patches; id: string } => {
  const id = makeId("in");
  return { id, patches: { [callPath(pid)]: { id, contact, state: "ringing", startedAt: Date.now() } } };
};

export const answerPatches = (pid: string): Patches => ({ [`${callPath(pid)}/state`]: "active", [`${callPath(pid)}/answeredAt`]: Date.now() });

/** « 1:05 » */
export const duration = (ms: number) => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

/** « 8 min 44 s », comme les autres lignes des récents. */
const logDuration = (ms: number) => { const s = Math.max(1, Math.round(ms / 1000)); const m = Math.floor(s / 60); return m ? `${m} min ${s % 60} s` : `${s} s`; };

/** Fin d'appel : état « ended », ligne dans les récents, et notif si l'appel a été manqué. */
export function endCallPatches(pid: string, call: LiveCall, result: CallResult, lore: string): Patches {
  const now = Date.now();
  const answered = call.state === "active" && !!call.answeredAt;
  const final: CallResult = answered ? "ended" : result === "ended" ? "missed" : result;
  // Heure de la fiction au moment où le téléphone a sonné.
  const time = msToLore(loreNowMs(lore) - (now - call.startedAt));
  const log = `call_${call.id}`;
  const patches: Patches = {
    [`${callPath(pid)}/state`]: "ended",
    [`${callPath(pid)}/endedAt`]: now,
    [`${callPath(pid)}/result`]: final,
    [`phones/${pid}/data/calls/${log}`]: {
      contact: call.contact, type: answered ? "incoming" : "missed", time,
      duration: answered ? logDuration(now - call.answeredAt!) : "", order: -now,
    } as Json,
  };
  if (!answered) {
    patches[`phones/${pid}/notifs/n_${call.id}`] = { app: "phone", title: "Missed Call", body: call.contact, link: "phone", msg: log, at: now };
  }
  return patches;
}
