// Crée les comptes joueurs (e-mail + mot de passe temporaire) dans Firebase Auth du projet v2.
//
// Usage (depuis la racine du dépôt) :
//   node v2/scripts/create-players.mjs glinda=moi@exemple.com eoghan=ami@exemple.com drew=... elias=...
//   Ajoute « mj » pour un compte avec tous les droits :  mj=mj@exemple.com
//
// - Les mots de passe temporaires sont générés ici et affichés UNIQUEMENT dans ce terminal.
//   Transmets-les à chaque joueur ; il pourra le changer via « Mot de passe oublié ? ».
// - Le script écrit migration/_out/users.json (uid → téléphone, SANS mot de passe), à fusionner
//   dans l'import de la base pour relier chaque compte à son téléphone.
// - Un e-mail déjà inscrit est signalé et ignoré (pas d'écrasement).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const PHONES = ["glinda", "eoghan", "drew", "elias", "mj"];

const env = Object.fromEntries(
  fs.readFileSync(path.join(HERE, "../.env.local"), "utf8").split(/\r?\n/)
    .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((m) => [m[1], m[2]]),
);
const API_KEY = env.VITE_FIREBASE_API_KEY;
if (!API_KEY) { console.error("VITE_FIREBASE_API_KEY introuvable dans v2/.env.local"); process.exit(1); }

const args = process.argv.slice(2).map((a) => a.split("="));
if (!args.length || args.some(([p, e]) => !PHONES.includes(p) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e ?? ""))) {
  console.error("Usage : node v2/scripts/create-players.mjs glinda=e-mail eoghan=e-mail drew=e-mail elias=e-mail [mj=e-mail]");
  process.exit(1);
}

// Mot de passe lisible : 3 mots-ish aléatoires + chiffres (ex. « Kaso-Mire-Tulo-47 »).
const syll = () => "bcdfgklmnprstvz"[crypto.randomInt(15)] + "aeiou"[crypto.randomInt(5)];
const word = () => { const w = syll() + syll(); return w[0].toUpperCase() + w.slice(1); };
const tempPassword = () => `${word()}-${word()}-${word()}-${crypto.randomInt(10, 100)}`;

const users = {};
console.log("\nComptes créés (mots de passe temporaires — à transmettre puis à oublier) :\n");
for (const [phone, email] of args) {
  const password = tempPassword();
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: false }),
  });
  const body = await res.json();
  if (!res.ok) {
    const code = body?.error?.message ?? res.status;
    console.log(`  ✗ ${phone.padEnd(7)} ${email} — ${code === "EMAIL_EXISTS" ? "déjà inscrit (ignoré)" : code}`);
    continue;
  }
  users[body.localId] = phone === "mj" ? { role: "mj" } : { phone, role: "player" };
  console.log(`  ✓ ${phone.padEnd(7)} ${email.padEnd(32)} ${password}`);
}

const out = path.join(ROOT, "migration/_out/users.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
const previous = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, "utf8")) : {};
fs.writeFileSync(out, JSON.stringify({ ...previous, ...users }, null, 2));
console.log(`\nLiens compte → téléphone écrits dans ${path.relative(ROOT, out)} (aucun mot de passe dedans).`);
