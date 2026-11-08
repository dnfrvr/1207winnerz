// Icônes vectorielles réelles (fini les emojis) :
//  - Material Design Icons (@mdi/js, Apache 2.0) pour les pictogrammes d'interface ;
//  - Simple Icons (simple-icons, CC0) pour les logos de marques ;
//  - quelques logos absents des deux bibliothèques, dessinés ici (Vine).
// Usage : <Glyph i={mdiCog} />  ·  <Brand name="tumblr" />  ·  <Brand name="vine" color />
import { siDropbox, siFacebook, siGmail, siGroupme, siInstagram, siKik, siMessenger, siNike, siPinterest, siReddit, siSafari, siShazam, siSnapchat,
  siSoundcloud, siStarbucks, siTumblr, siWikipedia, siYoutube } from "simple-icons";
import { mdiTwitter } from "@mdi/js";
import type { CSSProperties } from "react";

export function Glyph({ i, size = 22, color, className, style, title }: { i: string; size?: number; color?: string; className?: string; style?: CSSProperties; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={{ color, flexShrink: 0, ...style }} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <path d={i} fill="currentColor" />
    </svg>
  );
}

// Logo Vine (2013) : « V » à volute — redessiné, absent des bibliothèques.
const VINE = "M3.5 5.2h3.3l2.6 8.4c.9-1.5 2-3.6 2.6-5.5.4-1.4.5-2.6.1-3.3-.3-.5-.9-.7-1.4-.6.3-1.2 1.5-1.9 2.8-1.9 1.9 0 2.9 1.4 2.9 3.4 0 .8-.1 1.6-.4 2.5-.3.9-.7 1.7-1.1 2.6l-.4.8c-1 1.9-2.3 3.9-3.6 5.4H8.4z";

type BrandDef = { path: string; hex: string };
const BRANDS: Record<string, BrandDef> = {
  twitter: { path: mdiTwitter, hex: "1DA1F2" },
  vine: { path: VINE, hex: "00BF8F" },
  tumblr: siTumblr, kik: siKik, instagram: siInstagram, facebook: siFacebook, pinterest: siPinterest, youtube: siYoutube,
  snapchat: siSnapchat, nike: siNike, soundcloud: siSoundcloud, wikipedia: siWikipedia, reddit: siReddit, starbucks: siStarbucks,
  shazam: siShazam, groupme: siGroupme, messenger: siMessenger, gmail: siGmail, dropbox: siDropbox, safari: siSafari,
};

export function Brand({ name, size = 22, color, className, style }: { name: keyof typeof BRANDS | string; size?: number; color?: boolean | string; className?: string; style?: CSSProperties }) {
  const b = BRANDS[name];
  if (!b) return null;
  const fill = color === true ? `#${b.hex}` : typeof color === "string" ? color : "currentColor";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={{ flexShrink: 0, ...style }} aria-label={name} role="img">
      <path d={b.path} fill={fill} />
    </svg>
  );
}

/** Couleur officielle d'une marque (#rrggbb). */
export const brandColor = (name: string) => (BRANDS[name] ? `#${BRANDS[name].hex}` : undefined);
