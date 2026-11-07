// Briques communes aux deux systèmes (iOS 6 / Android 4) : OS courant, horloge, date lore,
// sens de navigation.
import { createContext, useContext, useEffect, useState } from "react";
import { useValue } from "../data/hooks";

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

// Couleurs de la barre d'action Android par app (reprises de l'app d'origine).
export const ANDROID_APP_COLORS: Record<string, string> = {
  messages: "#1a1a1a", gmail: "#C62828", twitter: "#15202B", facebook: "#3b5998", tumblr: "#35465c",
  youtube: "#CC0000", reddit: "#CC3D00", browser: "#1565C0", safari: "#1565C0", notes: "#5a3418",
  calendar: "#B71C1C", snapchat: "#212121", insta: "#833ab4", soundcloud: "#E55B13", maps: "#1565C0",
  settings: "#455a64", phone: "#2E7D32", contacts: "#1565C0", camera: "#212121", gallery: "#37474f",
  weather: "#0277BD", music: "#880e4f", clock: "#212121", vpn: "#455a64", wikipedia: "#000000",
  kindle: "#232f3e", inaturalist: "#74ac00", grindr: "#f7931e", files: "#455a64",
};
