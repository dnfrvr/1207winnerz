// Ordre des éléments d'une liste : un nombre par élément. Pour insérer entre deux éléments on
// prend le milieu → aucune autre ligne n'est réécrite (pas de décalage, pas de conflit).
export const ORDER_STEP = 1000;

export const orderBetween = (before?: number, after?: number): number => {
  if (before === undefined && after === undefined) return ORDER_STEP;
  if (before === undefined) return (after as number) - ORDER_STEP;
  if (after === undefined) return before + ORDER_STEP;
  return (before + after) / 2;
};

export type Ordered = { order?: number };

/** Position d'un élément inséré à l'index `i` d'une liste triée (byOrder). Après une cinquantaine
 *  d'insertions au même endroit, le milieu ne se distingue plus des voisins (précision des nombres) :
 *  on renvoie alors aussi la renumérotation de toute la liste (`renumber` : id → nouvel ordre). */
export function orderAt(sorted: [string, Ordered][], i: number): { order: number; renumber: Record<string, number> } {
  const prev = i > 0 ? sorted[i - 1][1].order ?? 0 : undefined;
  const next = i < sorted.length ? sorted[i][1].order ?? 0 : undefined;
  const order = orderBetween(prev, next);
  if (prev === undefined || next === undefined || (order > prev && order < next)) return { order, renumber: {} };
  const renumber: Record<string, number> = {};
  sorted.forEach(([id, it], k) => {
    const o = (k < i ? k + 1 : k + 2) * ORDER_STEP; // la place i + 1 revient au nouvel élément
    if (it.order !== o) renumber[id] = o;
  });
  return { order: (i + 1) * ORDER_STEP, renumber };
}

export const byOrder = <T extends Ordered>(a: [string, T], b: [string, T]) =>
  (a[1].order ?? 0) - (b[1].order ?? 0) || (a[0] < b[0] ? -1 : 1);
