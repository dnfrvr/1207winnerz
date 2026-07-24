// ─── LOGIQUE MESSAGERIE PARTAGÉE (iOS + Android) ─────────────────────────────
// `resolveThread` était dupliqué à l'identique dans les 2 shells (getThread). Les helpers
// `saveThread`/`updateMsg` qui l'accompagnaient étaient du CODE MORT (la vue Messages du
// téléphone est en lecture seule — l'édition se fait dans l'admin) : supprimés plutôt
// qu'extraits.
import { CHAR_NAMES } from "../data/characters.js";
import { loreSortKey } from "./lore-date.js";

// Résout le fil d'une conversation avec la bonne perspective (me/them), en tenant compte des
// fils partagés — 1-à-1 (champ `perspective` a/b) ou groupes (`sharedThreadId` → sharedThreads) —
// puis trie chronologiquement par heure lore (cohérent avec l'admin).
export const resolveThread = (msg, data, charKey) => {
  if (!msg) return [];
  let thread;
  if (msg.isGroup) {
    if (!msg.sharedThreadId) thread = msg.thread || [];
    else {
      const raw = data.sharedThreads?.[msg.sharedThreadId] || [];
      thread = raw.map(m => ({ ...m, senderKey: m.from, senderName: CHAR_NAMES[m.from] || m.from, from: m.from === charKey ? 'me' : 'them' }));
    }
  } else if (msg.sharedThreadId) {
    const raw = data.sharedThreads?.[msg.sharedThreadId] || msg.thread || [];
    const myLetter = msg.perspective || 'a';
    thread = raw.map(m => ({ ...m, from: m.from === myLetter ? 'me' : 'them' }));
  } else {
    thread = msg.thread || [];
  }
  return [...thread].sort((a, b) => loreSortKey(a.time) - loreSortKey(b.time));
};
