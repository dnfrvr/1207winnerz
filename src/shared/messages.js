// ─── LOGIQUE MESSAGERIE PARTAGÉE (iOS + Android) ─────────────────────────────
// `resolveThread` était dupliqué à l'identique dans les 2 shells (getThread). Les helpers
// `saveThread`/`updateMsg` qui l'accompagnaient étaient du CODE MORT (la vue Messages du
// téléphone est en lecture seule — l'édition se fait dans l'admin) : supprimés plutôt
// qu'extraits.
import { CHAR_NAMES } from "../data/characters.js";
import { loreSortKey } from "./lore-date.js";

// Perspective d'un perso dans un fil partagé 1-à-1, DÉRIVÉE de l'identité plutôt que lue depuis
// l'entrée (`msg.perspective`). Un sharedThreadId 1-à-1 est toujours "charA_charB" par ordre alpha
// (ex: "drew_elias") : le 1er participant est le côté 'a', le 2nd le côté 'b'. Ainsi, même si la
// synchro Firebase a laissé un pointeur en double avec une perspective incohérente, le tel affiche
// TOUJOURS le bon côté — plus de « je vois la conversation du point de vue de l'autre joueur ».
// Repli sur la valeur stockée si le format est inattendu (jamais destructif).
export const perspectiveOf = (charKey, sharedThreadId, stored) => {
  const parts = (sharedThreadId || "").split("_");
  if (parts.length === 2) {
    if (parts[0] === charKey) return "a";
    if (parts[1] === charKey) return "b";
  }
  return stored || "a";
};

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
    const myLetter = perspectiveOf(charKey, msg.sharedThreadId, msg.perspective);
    thread = raw.map(m => ({ ...m, from: m.from === myLetter ? 'me' : 'them' }));
  } else {
    thread = msg.thread || [];
  }
  return [...thread].sort((a, b) => loreSortKey(a.time) - loreSortKey(b.time));
};
