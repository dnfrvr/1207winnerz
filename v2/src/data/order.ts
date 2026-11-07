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

export const byOrder = <T extends Ordered>(a: [string, T], b: [string, T]) =>
  (a[1].order ?? 0) - (b[1].order ?? 0) || (a[0] < b[0] ? -1 : 1);
