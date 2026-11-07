// Apps portées dans la v2. Les autres ouvrent un écran « pas encore portée ».
import { lazy, type ComponentType } from "react";

export const APPS: Record<string, ComponentType<{ pid: string }>> = {
  notes: lazy(() => import("./Notes")),
  messages: lazy(() => import("./Messages")),
};
