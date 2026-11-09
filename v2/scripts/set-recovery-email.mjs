// Passe les comptes existants (glinda@joueurs.invalid…) sur l'adresse de récupération du jeu :
// VITE_RECOVERY_EMAIL = a@b dans v2/.env.local → glinda devient a+glinda@b (Gmail livre tout dans a@b).
//
// Usage (depuis la racine du dépôt) : node v2/scripts/set-recovery-email.mjs
// - Mots de passe lus dans migration/_out/comptes-joueurs.txt (dernier en date par téléphone) ;
//   s'il ne marche plus (déjà changé), le script le demande dans le terminal.
// - Si Firebase exige une vérification, un lien arrive dans la boîte de récupération : cliquer
//   chaque lien termine le changement. En attendant, la connexion par l'ancienne adresse marche toujours.
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const env = Object.fromEntries(
  fs.readFileSync(path.join(HERE, "../.env.local"), "utf8").split(/\r?\n/)
    .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((m) => [m[1], m[2]]),
);
const KEY = env.VITE_FIREBASE_API_KEY;
const [RUSER, RDOMAIN] = (env.VITE_RECOVERY_EMAIL ?? "").trim().toLowerCase().split("@");
if (!KEY || !RDOMAIN) { console.error("VITE_FIREBASE_API_KEY et VITE_RECOVERY_EMAIL requis dans v2/.env.local"); process.exit(1); }

const api = async (method, body) => {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${method}?key=${KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const json = await res.json();
  return res.ok ? json : { error: json?.error?.message ?? String(res.status) };
};

// Dernier mot de passe connu par identifiant (le fichier s'allonge à chaque création).
const known = {};
const recap = path.join(ROOT, "migration/_out/comptes-joueurs.txt");
if (fs.existsSync(recap)) for (const l of fs.readFileSync(recap, "utf8").split(/\r?\n/)) {
  const m = l.match(/^(\w+)\s+(\S+@\S+)\s+(\S+)$/); if (m) known[m[1]] = { email: m[2], password: m[3] };
}
const logins = Object.keys(known).length ? Object.keys(known) : ["glinda", "eoghan", "drew", "elias", "mdj"];
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

for (const login of logins) {
  const target = `${RUSER}+${login}@${RDOMAIN}`;
  const old = known[login]?.email ?? `${login}@joueurs.invalid`;
  let s = await api("signInWithPassword", { email: target, password: known[login]?.password ?? "", returnSecureToken: true });
  if (!s.error) { console.log(`  = ${login.padEnd(7)} déjà sur ${target}`); continue; }
  s = known[login] ? await api("signInWithPassword", { email: old, password: known[login].password, returnSecureToken: true }) : { error: "absent" };
  if (s.error) {
    const pw = (await rl.question(`  ? ${login} : mot de passe actuel (Entrée pour passer) : `)).trim();
    if (!pw) { console.log(`  - ${login.padEnd(7)} passé`); continue; }
    s = await api("signInWithPassword", { email: old, password: pw, returnSecureToken: true });
    if (s.error) s = await api("signInWithPassword", { email: target, password: pw, returnSecureToken: true });
    if (s.error) { console.log(`  ✗ ${login.padEnd(7)} connexion impossible (${s.error})`); continue; }
    if (s.email === target) { console.log(`  = ${login.padEnd(7)} déjà sur ${target}`); continue; }
  }
  const u = await api("update", { idToken: s.idToken, email: target, returnSecureToken: false });
  if (!u.error) { console.log(`  ✓ ${login.padEnd(7)} → ${target}`); continue; }
  // Protection contre l'énumération d'e-mails : changement seulement après clic sur un lien envoyé à la nouvelle adresse.
  const v = await api("sendOobCode", { requestType: "VERIFY_AND_CHANGE_EMAIL", idToken: s.idToken, newEmail: target });
  console.log(v.error ? `  ✗ ${login.padEnd(7)} ${u.error} / ${v.error}` : `  ✉ ${login.padEnd(7)} lien de confirmation envoyé à ${target} — clique-le pour finir`);
}
rl.close();
