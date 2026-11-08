// Données communes aux réseaux sociaux : identité des 4 persos (nom, avatar, pseudos) et
// petits composants partagés.
import { useEffect, useState } from "react";
import { useData } from "../data/hooks";
import type { Json } from "../data/store";

export const PIDS = ["glinda", "eoghan", "drew", "elias"] as const;
export type CharInfo = { pid: string; name: string; first: string; avatar?: string; ig?: string; tw?: string; twName?: string; twAv?: string; tumblr?: string; accent?: string };

type Profile = { name?: string; avatar?: string | { src?: string }; accentColor?: string };

/** Infos d'affichage des 4 persos (abonnements ciblés : profil, insta, tumblr + tables partagées). */
export function useChars(): Record<string, CharInfo> {
  const { store } = useData();
  const [raw, setRaw] = useState<Record<string, Json | undefined>>({});
  useEffect(() => {
    const paths = [
      ...PIDS.flatMap((p) => [`phones/${p}/profile`, `phones/${p}/data/instagram/handle`, `phones/${p}/data/instagram/avatar`, `phones/${p}/data/tumblr/handle`]),
      "shared/avatars", "shared/twitterUsers",
    ];
    const offs = paths.map((path) => store.subscribe(path, (v) => setRaw((r) => (r[path] === v ? r : { ...r, [path]: v }))));
    return () => offs.forEach((o) => o());
  }, [store]);
  const avatars = (raw["shared/avatars"] ?? {}) as Record<string, string>;
  const tw = (raw["shared/twitterUsers"] ?? {}) as Record<string, { char?: string; h?: string; name?: string; av?: string }>;
  const out: Record<string, CharInfo> = {};
  for (const p of PIDS) {
    const prof = (raw[`phones/${p}/profile`] ?? {}) as Profile;
    const av = typeof prof.avatar === "string" ? prof.avatar : prof.avatar?.src;
    const twUser = Object.values(tw).find((u) => u?.char === p);
    const name = prof.name ?? p;
    out[p] = {
      pid: p, name, first: name.split(" ")[0], accent: prof.accentColor,
      // Avatar local en priorité (les URL du stockage externe peuvent être hors ligne).
      avatar: [avatars[p], av, raw[`phones/${p}/data/instagram/avatar`] as string | undefined]
        .filter((x): x is string => !!x).sort((a, b) => Number(a.startsWith("http")) - Number(b.startsWith("http")))[0],
      ig: raw[`phones/${p}/data/instagram/handle`] as string | undefined,
      tumblr: raw[`phones/${p}/data/tumblr/handle`] as string | undefined,
      tw: twUser?.h, twName: twUser?.name, twAv: twUser?.av,
    };
  }
  return out;
}

/** Première image locale disponible (les URL externes peuvent être injoignables). */
export const pickLocal = (...urls: (string | undefined | null)[]) =>
  urls.filter((x): x is string => !!x).sort((a, b) => Number(a.startsWith("http")) - Number(b.startsWith("http")))[0];

export const num = (n?: number) => (n ?? 0).toLocaleString("en-US");
export const compact = (n?: number) => { const v = n ?? 0; return v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e4 ? `${(v / 1e3).toFixed(1)}k` : num(v); };
