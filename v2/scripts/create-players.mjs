// Crée les comptes joueurs (identifiant + mot de passe temporaire) dans Firebase Auth du projet v2.
//
// Usage (depuis la racine du dépôt) :
//   node v2/scripts/create-players.mjs glinda eoghan drew elias mdj
//     → identifiants « glinda », « eoghan »… (connexion sans e-mail)
//   node v2/scripts/create-players.mjs glinda=pseudo eoghan=moi@exemple.com
//     → identifiant au choix, ou une vraie adresse e-mail (réinitialisation par e-mail possible)
//   « mdj » = compte avec tous les droits.
//
// - Un identifiant sans « @ » devient l'adresse fictive <identifiant>@joueurs.invalid (même règle
//   que loginToEmail dans src/data/auth.tsx).
// - Les mots de passe temporaires sont générés ici et affichés UNIQUEMENT dans ce terminal.
//   Transmets-les à chaque joueur ; il pourra le changer une fois connecté (« Changer le mot de passe »).
// - Le script écrit migration/_out/users.json (uid → téléphone, SANS mot de passe), à fusionner
//   dans l'import de la base pour relier chaque compte à son téléphone.
// - Un e-mail déjà inscrit est signalé et ignoré (pas d'écrasement).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const PHONES = ["glinda", "eoghan", "drew", "elias", "mdj"];

const env = Object.fromEntries(
  fs.readFileSync(path.join(HERE, "../.env.local"), "utf8").split(/\r?\n/)
    .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((m) => [m[1], m[2]]),
);
const API_KEY = env.VITE_FIREBASE_API_KEY;
if (!API_KEY) { console.error("VITE_FIREBASE_API_KEY introuvable dans v2/.env.local"); process.exit(1); }

const LOGIN_DOMAIN = "joueurs.invalid";
const toEmail = (login) => { const l = login.trim().toLowerCase(); return l.includes("@") ? l : `${l}@${LOGIN_DOMAIN}`; };
const args = process.argv.slice(2).map((a) => { const [p, login = p] = a.split("="); return [p, toEmail(login)]; });
const bad = args.find(([p, e]) => !PHONES.includes(p) || !/^[a-z0-9._-]+@[^@\s]+\.[^@\s]+$/.test(e));
if (!args.length || bad) {
  if (bad) console.error(!PHONES.includes(bad[0])
    ? `« ${bad[0]} » n'est pas un téléphone (choix : ${PHONES.join(", ")}). Pour l'utiliser comme identifiant : <téléphone>=${bad[0]} (ex. mdj=${bad[0]})`
    : `Identifiant invalide pour « ${bad[0]} » (lettres, chiffres, . _ - uniquement).`);
  console.error("Usage : node v2/scripts/create-players.mjs glinda eoghan drew elias [mdj]   (ou glinda=identifiant / glinda=e-mail)");
  process.exit(1);
}

// Mot de passe lisible : 3 mots-ish aléatoires + chiffres (ex. « Kaso-Mire-Tulo-47 »).
const syll = () => "bcdfgklmnprstvz"[crypto.randomInt(15)] + "aeiou"[crypto.randomInt(5)];
const word = () => { const w = syll() + syll(); return w[0].toUpperCase() + w.slice(1); };
const tempPassword = () => `${word()}-${word()}-${word()}-${crypto.randomInt(10, 100)}`;

const users = {};
const created = [];
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
  users[body.localId] = phone === "mdj" ? { role: "mdj" } : { phone, role: "player" };
  created.push({ phone, email, password });
  console.log(`  ✓ ${phone.padEnd(7)} ${email.padEnd(32)} ${password}`);
}

// Récapitulatif lisible (avec les mots de passe) pour les retrouver plus tard. Dossier ignoré par git.
const recap = path.join(ROOT, "migration/_out/comptes-joueurs.txt");
fs.mkdirSync(path.dirname(recap), { recursive: true });
fs.appendFileSync(recap, `\n── ${new Date().toLocaleString("fr-FR")} ──\n` + created.map((c) => `${c.phone.padEnd(7)} ${c.email.padEnd(32)} ${c.password}`).join("\n") + "\n");
console.log(`\nMots de passe aussi enregistrés dans ${path.relative(ROOT, recap)} (fichier local, jamais envoyé sur GitHub).`);
console.log("Pense à le supprimer une fois les mots de passe transmis.");

const out = path.join(ROOT, "migration/_out/users.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
const previous = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, "utf8")) : {};
fs.writeFileSync(out, JSON.stringify({ ...previous, ...users }, null, 2));
console.log(`\nLiens compte → téléphone écrits dans ${path.relative(ROOT, out)} (aucun mot de passe dedans).`);
