// Données communes aux réseaux sociaux : identité des 4 persos (nom, avatar, pseudos) et
// petits composants partagés.
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useData } from "../data/hooks";
import { img } from "../lib/img";
import { useLongPress } from "../phone/Sheets";
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

// ─── Composants partagés des réseaux sociaux ────────────────────────────────

/**
 * Bannière / couverture de profil. L'image est un vrai <img> (cadrage `object-fit: cover`
 * centré) posé sur un dégradé de repli : si l'URL est injoignable (stockage externe hors
 * ligne), l'image est retirée et il reste un fond propre. Un voile sombre garantit la
 * lisibilité du texte blanc posé dessus.
 */
export function Cover({ src, color = "#2b4a66", className = "", scrim = true, children }: {
  src?: string | null; color?: string; className?: string; scrim?: boolean; children?: ReactNode;
}) {
  const [broken, setBroken] = useState<string | null>(null);
  const url = img(src ?? undefined);
  const show = !!url && broken !== url;
  return (
    <div className={`so-cover ${className}`} style={{ backgroundColor: color, backgroundImage: `linear-gradient(160deg, rgba(255,255,255,.18), rgba(0,0,0,.28))` }}>
      {show && <img className="so-cover-img" src={url} alt="" onError={() => setBroken(url!)} />}
      {scrim && <span className="so-cover-scrim" aria-hidden />}
      <div className="so-cover-in">{children}</div>
    </div>
  );
}

/** Élément pressable : clic simple + appui long / clic droit (menu d'édition). */
export function Press({ as = "div", className, style, onClick, onLong, children }: {
  as?: "div" | "button" | "article"; className?: string; style?: CSSProperties; onClick?: () => void; onLong?: () => void; children: ReactNode;
}) {
  const lp = useLongPress(() => onLong?.());
  const Tag = as;
  return (
    <Tag className={className} style={style} {...(onLong ? lp.handlers : {})} onClick={onClick ? () => { if (!lp.fired.current) onClick(); } : undefined}>
      {children}
    </Tag>
  );
}

/**
 * Barre d'action Holo (Android 4.1) pour les apps qui dessinent leur propre barre :
 * flèche « haut » + icône de l'app, titre, actions à droite (icônes 32 dp), fond plat.
 */
export function HoloBar({ color, icon, title, onUp, actions, dark = true, className = "" }: {
  color: string; icon?: ReactNode; title?: ReactNode; onUp?: () => void; actions?: ReactNode; dark?: boolean; className?: string;
}) {
  return (
    <div className={`so-holo ${dark ? "dark" : "light"} ${className}`} style={{ background: color }}>
      <button className="so-holo-up" onClick={onUp} aria-label="Retour" disabled={!onUp}>
        {onUp && <svg width="10" height="16" viewBox="0 0 10 16" aria-hidden><path d="M8 2L2 8l6 6" fill="none" stroke="currentColor" strokeWidth="2" /></svg>}
        {icon && <span className="so-holo-icon">{icon}</span>}
      </button>
      {title !== undefined && <h1>{title}</h1>}
      <div className="so-holo-actions">{actions}</div>
    </div>
  );
}

/** Onglets Holo (sous la barre d'action) : libellés en capitales, indicateur bleu de 3 dp. */
export function HoloTabs({ tabs, active, onChange, color = "#33b5e5", dark = false }: {
  tabs: { id: string; label?: string; icon?: ReactNode }[]; active: string; onChange: (id: string) => void; color?: string; dark?: boolean;
}) {
  return (
    <div className={`so-htabs ${dark ? "dark" : ""}`}>
      {tabs.map((t) => (
        <button key={t.id} className={t.id === active ? "on" : ""} onClick={() => onChange(t.id)} style={t.id === active ? { boxShadow: `inset 0 -3px 0 ${color}` } : undefined}>
          {t.icon}{t.label && <span>{t.label}</span>}
        </button>
      ))}
    </div>
  );
}
