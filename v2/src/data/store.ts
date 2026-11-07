// ─── Contrat de stockage ─────────────────────────────────────────────────────
// Deux implémentations : mémoire (dev / démo, sans compte) et Firebase (prod).
// Règle d'or : on n'écrit JAMAIS un objet reconstruit depuis l'écran. Uniquement des
// patches `chemin → valeur` au niveau du champ modifié (cf. docs/MODELE_V2.md).

export type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
export type Patches = Record<string, Json | undefined>;
export type Unsubscribe = () => void;

export interface Store {
  /** S'abonne à un chemin ; le callback reçoit la valeur courante puis chaque changement. */
  subscribe(path: string, cb: (value: Json | undefined) => void): Unsubscribe;
  /** Écriture multi-chemins atomique. `null`/`undefined` supprime le champ. */
  update(patches: Patches): Promise<void>;
  /** Dernière valeur connue localement (pour l'historique « avant »), sans requête réseau. */
  peek(path: string): Json | undefined;
  /** Identifiant unique, triable chronologiquement (équivalent de push() Firebase). */
  newId(prefix?: string): string;
  readonly kind: "memory" | "firebase";
}

export const split = (path: string) => path.split("/").filter(Boolean);
export const join = (...parts: (string | number)[]) => parts.map(String).filter(Boolean).join("/");

export const getIn = (root: Json | undefined, path: string): Json | undefined => {
  let cur: Json | undefined = root;
  for (const k of split(path)) {
    if (cur === null || typeof cur !== "object" || Array.isArray(cur)) return undefined;
    cur = (cur as Record<string, Json>)[k];
  }
  return cur;
};

/** Copie immuable de `root` avec `value` écrit à `path` (undefined/null = suppression). */
export const setIn = (root: Json | undefined, parts: string[], value: Json | undefined): Json | undefined => {
  if (parts.length === 0) return value === null ? undefined : value;
  const base: Record<string, Json> =
    root && typeof root === "object" && !Array.isArray(root) ? { ...(root as Record<string, Json>) } : {};
  const [head, ...rest] = parts;
  const next = setIn(base[head], rest, value);
  if (next === undefined) delete base[head];
  else base[head] = next;
  return Object.keys(base).length ? base : undefined;
};

/** Deux chemins sont liés si l'un est préfixe de l'autre (écrire l'un change l'autre). */
export const related = (a: string, b: string) => {
  const pa = split(a), pb = split(b);
  const n = Math.min(pa.length, pb.length);
  for (let i = 0; i < n; i++) if (pa[i] !== pb[i]) return false;
  return true;
};

// Ids : horodatage base36 + aléa → uniques sans coordination, triables, jamais numériques purs
// (une clé numérique ferait relire la map comme un tableau par Firebase).
let lastTs = 0, seq = 0;
export const makeId = (prefix = "x") => {
  const now = Date.now();
  seq = now === lastTs ? seq + 1 : 0;
  lastTs = now;
  const rnd = Math.random().toString(36).slice(2, 7);
  return `${prefix}_${now.toString(36)}${seq.toString(36)}${rnd}`;
};
