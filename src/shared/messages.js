// ─── LOGIQUE MESSAGERIE PARTAGÉE (iOS + Android) ─────────────────────────────
// `resolveThread` était dupliqué à l'identique dans les 2 shells (getThread). Les helpers
// `saveThread`/`updateMsg` qui l'accompagnaient étaient du CODE MORT (la vue Messages du
// téléphone est en lecture seule — l'édition se fait dans l'admin) : supprimés plutôt
// qu'extraits.
import { CHAR_NAMES } from "../data/characters.js";
import { loreSortKey } from "./lore-date.js";

// ─── INVARIANT : convs entre les 4 persos principaux ─────────────────────────
// Toute conversation 1-à-1 entre deux persos principaux DOIT être un fil partagé (jamais un
// groupe, jamais un fil local divergent). On le garantit à l'affichage (et côté admin) via
// l'id du fil : un id 1-à-1 est "charA_charB" (positionnel) où les deux côtés sont des persos
// principaux — ex: "drew_elias", "eoghan_elias", "glinda_elias". Si un `isGroup` parasite a été
// posé sur une telle conv (bug de synchro / manip admin), on l'IGNORE au rendu → plus de conv
// 1-à-1 qui s'affiche en mode groupe. C'est un garde-fou robuste : il ne dépend pas de la donnée
// étant propre, il corrige l'affichage quoi qu'il arrive.
export const MAIN_CHARS = ["glinda", "eoghan", "drew", "elias"];
export const isMainPairThread = (sharedThreadId) => {
  const parts = (sharedThreadId || "").split("_");
  return parts.length === 2 && MAIN_CHARS.includes(parts[0]) && MAIN_CHARS.includes(parts[1]);
};

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
  // Invariant : une conv entre 2 persos principaux est TOUJOURS traitée comme un fil partagé
  // 1-à-1, même si `isGroup` a été posé par erreur (sinon la branche groupe compare `from` — qui
  // vaut "a"/"b" — à charKey, jamais égal → tout passe en « them » et l'affichage casse).
  const treatAsGroup = msg.isGroup && !isMainPairThread(msg.sharedThreadId);
  if (treatAsGroup) {
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
