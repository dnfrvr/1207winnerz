import { createContext } from "react";

// Dev overrides context — consumed by isolated memo'd components
export const DevCtx = createContext({});

export const FF_IOS = "Helvetica,'Helvetica Neue','Roboto','Droid Sans',Arial,sans-serif";

// Châssis SVG de l'iPhone 4 (masque d'écran) — utilisé par les shells iOS.
export const I4_SRC = "/assets/seed/41fa2a07d66d3bef594769311d21c1a6.svg";
