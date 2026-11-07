// Store en mémoire : sert au développement et à la démo hors ligne. Les modifications sont
// gardées dans le navigateur (localStorage) pour survivre à un rechargement.
import { getIn, makeId, related, setIn, split, type Json, type Patches, type Store } from "./store";

const LS_KEY = "uma-v2-dev-tree";

export function createMemoryStore(seed: Json): Store {
  let tree: Json | undefined = seed;
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) tree = JSON.parse(saved);
  } catch { /* stockage indisponible : on part du seed */ }

  const subs = new Set<{ path: string; cb: (v: Json | undefined) => void }>();

  const persist = () => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(tree ?? null)); } catch { /* quota / privé */ }
  };

  return {
    kind: "memory",
    subscribe(path, cb) {
      const sub = { path, cb };
      subs.add(sub);
      cb(getIn(tree, path));
      return () => { subs.delete(sub); };
    },
    async update(patches: Patches) {
      const paths = Object.keys(patches);
      for (const p of paths) tree = setIn(tree, split(p), patches[p]);
      persist();
      for (const s of subs) if (paths.some((p) => related(p, s.path))) s.cb(getIn(tree, s.path));
    },
    peek: (path) => getIn(tree, path),
    newId: makeId,
  };
}

/** Remet le jeu de données de dev à zéro (efface les modifs locales). */
export const resetMemoryStore = () => {
  try { localStorage.removeItem(LS_KEY); } catch { /* rien */ }
};
