import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { byOrder, orderAt, type Ordered } from "./order";
import { dateAfterLore, LORE_BUMP, LORE_DATE_DEFAULT, newestFirst } from "../lib/loreTime";
import { join, type Json, type Patches, type Store } from "./store";

// ─── Contexte : store + identité du joueur ───────────────────────────────────
type Session = { uid: string; phone: string | null; role: "player" | "mdj" };
type Ctx = { store: Store; session: Session; saving: number; track: <T>(p: Promise<T>) => Promise<T> };
const DataCtx = createContext<Ctx | null>(null);

export function DataProvider({ store, session, children }: { store: Store; session: Session; children: ReactNode }) {
  const [saving, setSaving] = useState(0);
  const track = useCallback(<T,>(p: Promise<T>) => {
    setSaving((n) => n + 1);
    return p.finally(() => setSaving((n) => n - 1));
  }, []);
  const value = useMemo(() => ({ store, session, saving, track }), [store, session, saving, track]);
  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

export const useData = () => {
  const c = useContext(DataCtx);
  if (!c) throw new Error("DataProvider manquant");
  return c;
};

/** Le joueur connecté peut-il modifier ce téléphone ? */
export const useCanEdit = (pid: string) => {
  const { session } = useData();
  return session.role === "mdj" || session.phone === pid;
};

// ─── Lecture ─────────────────────────────────────────────────────────────────
export function useValue<T = Json>(path: string | null): T | undefined {
  const { store } = useData();
  const [v, setV] = useState<T | undefined>(() => (path ? (store.peek(path) as T | undefined) : undefined));
  useEffect(() => {
    if (!path) return;
    return store.subscribe(path, (x) => setV(x as T | undefined));
  }, [store, path]);
  return v;
}

/** Liste triée (map { id: item } → [[id, item]…]), éléments supprimés (corbeille) exclus. */
export function useList<T extends object = Record<string, unknown>>(path: string | null, { withDeleted = false, newest }: { withDeleted?: boolean; newest?: keyof T & string } = {}): [string, T][] {
  const map = useValue<Record<string, T & Ordered & { deleted?: boolean }>>(path);
  return useMemo(() => {
    const entries = Object.entries(map ?? {}).filter(([, it]) => it && typeof it === "object" && (withDeleted || !it.deleted)).sort(byOrder) as [string, T][];
    // Listes datées (appels, mails, posts…) : du plus récent au plus ancien, un ajout se place selon sa date.
    return newest ? newestFirst(entries, ([, it]) => it[newest] as string | undefined) : entries;
  }, [map, withDeleted, newest]);
}

// ─── Écriture (toujours champ par champ, avec historique) ────────────────────
/** Ajoute aux écritures leur trace dans `history/{pid}` (valeur avant / après). */
/** `burst` (champ texte en cours de saisie) : une seule entrée, réécrite à chaque envoi, avec la valeur d'avant la frappe. */
export type Burst = { id: string; before: Json | undefined };
export function withHistory(store: Store, uid: string, pid: string, patches: Patches, burst?: Burst): Patches {
  const at = Date.now();
  const all: Patches = { ...patches };
  for (const [path, after] of Object.entries(patches)) {
    const before = burst ? burst.before : store.peek(path);
    all[join("history", pid, burst?.id ?? store.newId("h"))] = { path, before: before ?? null, after: after ?? null, at, uid };
  }
  return all;
}

export function useWriter(pid: string) {
  const { store, session, track } = useData();

  const write = useCallback((patches: Patches, burst?: Burst) => {
    const all = withHistory(store, session.uid, pid, patches, burst);
    // Date saisie après « aujourd'hui » dans la fiction → proposer d'avancer la date de lore (popup dans le téléphone).
    const later = dateAfterLore(patches, (store.peek("meta/loreDate") as string | undefined) || LORE_DATE_DEFAULT);
    if (later) window.dispatchEvent(new CustomEvent(LORE_BUMP, { detail: later }));
    return track(store.update(all));
  }, [store, session.uid, pid, track]);

  return useMemo(() => ({
    write,
    set: (path: string, value: Json | undefined, burst?: Burst) => write({ [path]: value }, burst),
    /** Insère un élément dans une liste, après `afterId` (ou à la fin). Renvoie son id. */
    insert: (listPath: string, item: Record<string, Json>, opts: { afterId?: string; atStart?: boolean } = {}) => {
      const list = Object.entries((store.peek(listPath) as Record<string, Ordered> | undefined) ?? {}).filter(([, v]) => v).sort(byOrder);
      // afterId introuvable → findIndex = -1 → en tête, comme avant.
      const i = opts.atStart ? 0 : (opts.afterId ? list.findIndex(([id]) => id === opts.afterId) : list.length - 1) + 1;
      const { order, renumber } = orderAt(list, i);
      const id = store.newId("i");
      const patches: Patches = { [join(listPath, id)]: { ...item, order } };
      for (const [k, o] of Object.entries(renumber)) patches[join(listPath, k, "order")] = o;
      write(patches);
      return id;
    },
    /** Corbeille : on ne supprime jamais vraiment, on marque. */
    trash: (itemPath: string) => write({ [join(itemPath, "deleted")]: true }),
    restore: (itemPath: string) => write({ [join(itemPath, "deleted")]: null }),
  }), [write, store]);
}

// ─── Champ éditable « fluide » ───────────────────────────────────────────────
// Valeur locale pendant la frappe (aucun saut de curseur), envoi groupé après 500 ms de pause,
// envoi immédiat à la perte de focus / au démontage. Une valeur distante n'écrase la saisie
// que si l'utilisateur n'est pas en train de taper.
export function useEditableField(pid: string, path: string) {
  const remote = useValue<string>(path);
  const { store } = useData();
  const { set } = useWriter(pid);
  const [local, setLocal] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<string | null>(null);
  // Une saisie (du premier caractère à la perte de focus) = une seule entrée d'historique.
  const burst = useRef<Burst | null>(null);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (pending.current !== null) {
      const v = pending.current;
      pending.current = null;
      set(path, v, burst.current ?? undefined).then(
        () => setLocal((cur) => (cur === v ? null : cur)),
        () => setLocal((cur) => (cur === v ? null : cur)), // refusé (alerte déjà affichée) : on réaffiche la valeur enregistrée
      );
    }
  }, [set, path]);

  const end = useCallback(() => { flush(); burst.current = null; }, [flush]);
  useEffect(() => end, [end]);

  const onChange = (v: string) => {
    burst.current ??= { id: store.newId("h"), before: store.peek(path) };
    setLocal(v);
    pending.current = v;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 500);
  };

  return { value: local ?? remote ?? "", onChange, onBlur: end, dirty: local !== null };
}
