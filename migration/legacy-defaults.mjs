// Extrait les contenus « en dur » de l'ancienne app (mails par perso, historique Starbucks,
// Reddit, VPN, Wikipédia…) depuis son code source, pour que la migration les transforme en
// données éditables. Seuls des littéraux de données sont évalués (objets / tableaux / chaînes).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Renvoie le texte du littéral qui suit `marker` (accolades/crochets équilibrés, chaînes respectées). */
function literalAfter(src, marker) {
  const at = src.indexOf(marker);
  if (at < 0) return null;
  let i = src.indexOf("=", at + marker.length) + 1;
  while (/\s/.test(src[i])) i++;
  const open = src[i];
  if (open !== "{" && open !== "[") return null;
  let depth = 0, quote = null;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (quote) { if (c === "\\") { j++; continue; } if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === "`") { quote = c; continue; }
    if (c === "{" || c === "[") depth++;
    if (c === "}" || c === "]") { depth--; if (depth === 0) return src.slice(i, j + 1); }
  }
  return null;
}

// Petites constantes référencées par les littéraux (ex. GLINDA_SIG dans Starbucks).
function evalLiteral(text, scope = {}) {
  // eslint-disable-next-line no-new-func
  return new Function(...Object.keys(scope), `return (${text});`)(...Object.values(scope));
}

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

export function loadLegacyDefaults() {
  const out = {};
  const grab = (file, name, key = name, scope) => {
    try { const t = literalAfter(read(file), `const ${name}`); if (t) out[key] = evalLiteral(t, scope); } catch (e) { out[`_error_${key}`] = String(e.message); }
  };
  grab("src/screens/GmailScreen.jsx", "EMAILS_BY_CHAR");
  grab("src/screens/GmailScreen.jsx", "MAIL_DRAFTS_BY_CHAR");
  grab("src/screens/GmailScreen.jsx", "MAIL_DELETED_BY_CHAR");
  grab("src/screens/GroupMeScreen.jsx", "GROUPME_DEFAULTS");
  grab("src/screens/RedditScreen.jsx", "REDDIT_ALL_POSTS");
  grab("src/screens/SnapchatScreen.jsx", "SNAPCHAT_DEFAULTS");
  grab("src/screens/VPNScreen.jsx", "VPN_DEFAULTS");
  grab("src/screens/WikipediaScreen.jsx", "WIKI_FEEDS");
  grab("src/screens/KindleScreen.jsx", "KINDLE_DEFAULT_BOOKS");
  grab("src/screens/GrindrScreen.jsx", "GRINDR_DMS_DEFAULT");
  grab("phones_y2k.jsx", "SNAP_BADGE_COUNTS");
  grab("phones_y2k.jsx", "GMAIL_BADGE_COUNTS");
  // Starbucks : littéraux à l'intérieur du composant, avec deux constantes à fournir.
  const sb = read("src/screens/StarbucksScreen.jsx");
  const sig = (sb.match(/const GLINDA_SIG = "([^"]*)"/) ?? [])[1] ?? "";
  const sigDetail = (sb.match(/const GLINDA_SIG_DETAIL = "([^"]*)"/) ?? [])[1] ?? "";
  try { out.STARBUCKS_RECENTS = evalLiteral(literalAfter(sb, "const recentsByChar"), { GLINDA_SIG: sig, GLINDA_SIG_DETAIL: sigDetail }); } catch (e) { out._error_sbr = String(e.message); }
  try {
    const STARBUCKS_AUGUSTA = evalLiteral(literalAfter(sb, "const STARBUCKS_AUGUSTA"));
    out.STARBUCKS_FAVORITES = evalLiteral(literalAfter(sb, "const favoritesByChar"), { STARBUCKS_AUGUSTA });
    out.STARBUCKS_DEFAULT_FAVORITE = STARBUCKS_AUGUSTA;
  } catch (e) { out._error_sbf = String(e.message); }
  out.STARBUCKS_STARS = { glinda: 687, eoghan: 118, drew: 55, elias: 210 };
  out.STARBUCKS_BALANCE = { glinda: "$14.30", eoghan: "$8.50", drew: "$21.00", elias: "$6.75" };
  return out;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}` || process.argv[1]?.endsWith("legacy-defaults.mjs")) {
  const d = loadLegacyDefaults();
  for (const [k, v] of Object.entries(d)) {
    const s = JSON.stringify(v);
    console.log(`## ${k} (${s.length} car.)`);
    console.log(Array.isArray(v) ? `[${v.length}] ${JSON.stringify(v[0]).slice(0, 220)}` : `{${Object.keys(v ?? {}).join(", ")}} ${s.slice(0, 220)}`);
  }
}
