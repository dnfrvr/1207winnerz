import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { byOrder, orderBetween, type Ordered } from "./order";
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
export function useList<T extends object = Record<string, unknown>>(path: string, { withDeleted = false } = {}): [string, T][] {
  const map = useValue<Record<string, T & Ordered & { deleted?: boolean }>>(path);
  return useMemo(() => {
    const entries = Object.entries(map ?? {}).filter(([, it]) => it && typeof it === "object" && (withDeleted || !it.deleted));
    return entries.sort(byOrder) as [string, T][];
  }, [map, withDeleted]);
}

// ─── Écriture (toujours champ par champ, avec historique) ────────────────────
export function useWriter(pid: string) {
  const { store, session, track } = useData();

  const write = useCallback((patches: Patches) => {
    const at = Date.now();
    const all: Patches = { ...patches };
    for (const [path, after] of Object.entries(patches)) {
      all[join("history", pid, store.newId("h"))] = {
        path, before: store.peek(path) ?? null, after: after ?? null, at, uid: session.uid,
      };
    }
    return track(store.update(all));
  }, [store, session.uid, pid, track]);

  return useMemo(() => ({
    write,
    set: (path: string, value: Json | undefined) => write({ [path]: value }),
    /** Insère un élément dans une liste, après `afterId` (ou à la fin). Renvoie son id. */
    insert: (listPath: string, item: Record<string, Json>, opts: { afterId?: string; atStart?: boolean } = {}) => {
      const list = Object.entries((store.peek(listPath) as Record<string, Ordered> | undefined) ?? {}).sort(byOrder);
      let order: number;
      if (opts.atStart) order = orderBetween(undefined, list[0]?.[1].order);
      else {
        const idx = opts.afterId ? list.findIndex(([id]) => id === opts.afterId) : list.length - 1;
        order = orderBetween(list[idx]?.[1].order, list[idx + 1]?.[1].order);
      }
      const id = store.newId("i");
      write({ [join(listPath, id)]: { ...item, order } });
      return id;
    },
    /** Corbeille : on ne supprime jamais vraiment, on marque. */
    trash: (itemPath: string) => write({ [join(itemPath, "deleted")]: true }),
    restore: (itemPath: string) => write({ [join(itemPath, "deleted")]: null }),
    move: (listPath: string, id: string, beforeOrder?: number, afterOrder?: number) =>
      write({ [join(listPath, id, "order")]: orderBetween(beforeOrder, afterOrder) }),
  }), [write, store]);
}

// ─── Champ éditable « fluide » ───────────────────────────────────────────────
// Valeur locale pendant la frappe (aucun saut de curseur), envoi groupé après 500 ms de pause,
// envoi immédiat à la perte de focus / au démontage. Une valeur distante n'écrase la saisie
// que si l'utilisateur n'est pas en train de taper.
export function useEditableField(pid: string, path: string) {
  const remote = useValue<string>(path);
  const { set } = useWriter(pid);
  const [local, setLocal] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<string | null>(null);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (pending.current !== null) {
      const v = pending.current;
      pending.current = null;
      set(path, v).then(() => setLocal((cur) => (cur === v ? null : cur)));
    }
  }, [set, path]);

  useEffect(() => flush, [flush]);

  const onChange = (v: string) => {
    setLocal(v);
    pending.current = v;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 500);
  };

  return { value: local ?? remote ?? "", onChange, onBlur: flush, dirty: local !== null };
}
