// Briques communes aux deux systèmes (iOS 6 / Android 4) : OS courant, horloge, date lore,
// sens de navigation.
import { createContext, useContext, useEffect, useState } from "react";
import { useValue } from "../data/hooks";
import { loreNowMs, msToLore } from "../lib/loreTime";

export type OS = "ios" | "android";
export const OSCtx = createContext<OS>("ios");
export const useOS = () => useContext(OSCtx);

export type NavDir = "push" | "pop" | "none";
/** Sens de la dernière navigation dans l'app (pour l'animation de glissement). */
export const NavDirCtx = createContext<NavDir>("none");

export const LORE_DATE_DEFAULT = "2012-10-06";

export function useNow(intervalMs = 15_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function useClock() {
  return useNow().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function useLoreDate() {
  const d = useValue<string>("meta/loreDate") || LORE_DATE_DEFAULT;
  return new Date(`${d}T12:00:00`);
}

/** « Maintenant » dans la fiction, au format lore (« 17 oct, 11:12pm ») : date par défaut d'un nouvel élément. */
export function useLoreStamp() {
  return msToLore(loreNowMs(useValue<string>("meta/loreDate") || LORE_DATE_DEFAULT));
}

// Couleurs de la barre d'action Android par app. Apps système de Jelly Bean : barre holo
// sombre (#222) ; apps tierces : couleur de la marque (reprise de l'app d'origine).
export const ANDROID_APP_COLORS: Record<string, string> = {
  messages: "#222", gmail: "#ececec", twitter: "#15202B", facebook: "#3b5998", tumblr: "#35465c",
  youtube: "#CC0000", reddit: "#CC3D00", browser: "#222", safari: "#222", notes: "#5a3418",
  calendar: "#222", snapchat: "#212121", insta: "#833ab4", soundcloud: "#E55B13", maps: "#ececec",
  settings: "#222", phone: "#222", contacts: "#222", camera: "#212121", gallery: "#222",
  weather: "#222", music: "#222", clock: "#222", vpn: "#455a64", wikipedia: "#000000",
  kindle: "#232f3e", inaturalist: "#74ac00", grindr: "#f7931e", files: "#455a64",
  passbook: "#f2f2f2",
};

/** Icônes Android fournies par le code, quand la base n'en définit pas (shared/androidIcons). */
export const ANDROID_ICON_DEFAULTS: Record<string, string> = { passbook: "/assets/icons/wallet-android.png" };

/** Apps dont la barre d'action est claire (Holo Light : Gmail, Google Maps) → texte et icônes sombres. */
export const ANDROID_LIGHT_BARS = new Set(["gmail", "maps", "passbook"]);
