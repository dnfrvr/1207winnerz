// Store Firebase Realtime Database. Chaque composant s'abonne seulement au chemin qu'il
// affiche (jamais à la racine) et n'écrit que des patches champ par champ.
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getDatabase, onValue, ref, update } from "firebase/database";
import { getIn, makeId, setIn, split, type Json, type Patches, type Store } from "./store";

let app: FirebaseApp | null = null;
export const firebaseApp = (config: Record<string, string>) => (app ??= initializeApp(config));

export function createFirebaseStore(config: Record<string, string>): Store {
  const db = getDatabase(firebaseApp(config));
  // Cache des dernières valeurs reçues, par chemin abonné → sert à peek() (historique).
  const cache = new Map<string, Json | undefined>();

  return {
    kind: "firebase",
    subscribe(path, cb) {
      return onValue(ref(db, path), (snap) => {
        const v = (snap.val() ?? undefined) as Json | undefined;
        cache.set(path, v);
        cb(v);
      }, (err) => console.warn(`[sync] lecture refusée : ${path}`, err.message));
    },
    async update(patches: Patches) {
      const clean: Record<string, Json | null> = {};
      for (const [k, v] of Object.entries(patches)) clean[k] = v === undefined ? null : v;
      try { await update(ref(db), clean); }
      catch (e) { console.error("[sync] écriture refusée", Object.keys(clean), e); alert("Modification refusée : tu n'as pas les droits sur ce téléphone."); throw e; }
      // Met le cache à jour tout de suite (l'écho Firebase arrivera de toute façon).
      for (const [k, v] of Object.entries(clean))
        for (const [p, val] of cache)
          if (k.startsWith(p + "/") || k === p) cache.set(p, setIn(val, split(k.slice(p.length)), v));
    },
    peek(path) {
      // Cherche l'ancêtre abonné le plus proche.
      let best = "";
      for (const p of cache.keys()) if ((path === p || path.startsWith(p + "/")) && p.length >= best.length) best = p;
      if (!cache.has(best)) return undefined;
      return getIn(cache.get(best), path.slice(best.length));
    },
    newId: makeId,
  };
}
