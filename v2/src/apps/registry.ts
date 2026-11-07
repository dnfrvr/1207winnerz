// Apps portées dans la v2. Les autres ouvrent un écran « pas encore portée ».
import { lazy, type ComponentType } from "react";

const loaders = {
  notes: () => import("./Notes"),
  messages: () => import("./Messages"),
} satisfies Record<string, () => Promise<{ default: ComponentType<{ pid: string }> }>>;

export const APPS: Record<string, ComponentType<{ pid: string }>> = Object.fromEntries(
  Object.entries(loaders).map(([k, load]) => [k, lazy(load)]),
);

/** Précharge le code des apps quand le téléphone est au repos → ouverture sans attente ni saccade. */
let preloaded = false;
export const preloadApps = () => {
  if (preloaded) return;
  preloaded = true;
  const run = () => Object.values(loaders).forEach((l) => l().catch(() => { preloaded = false; }));
  const w = window as Window & { requestIdleCallback?: (cb: () => void) => void };
  if (w.requestIdleCallback) w.requestIdleCallback(run); else setTimeout(run, 300);
};
