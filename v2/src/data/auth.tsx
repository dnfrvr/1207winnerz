// Connexion des joueurs (Firebase Auth, e-mail + mot de passe). Le lien compte → téléphone est
// dans la base : users/{uid} = { phone: "glinda", role: "player" | "mdj" } (créé dans la console).
import { useEffect, useState, type FormEvent } from "react";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, updatePassword, type User } from "firebase/auth";
import { getDatabase, onValue, ref } from "firebase/database";
import { firebaseApp } from "./firebaseStore";
import { Sparkles } from "../site/Win";

export type Session = { uid: string; phone: string | null; role: "player" | "mdj" };
type State = { status: "loading" } | { status: "out" } | { status: "in"; user: User; session: Session; linked: boolean };

export function useFirebaseSession(config: Record<string, string>) {
  const [state, setState] = useState<State>({ status: "loading" });
  useEffect(() => {
    const app = firebaseApp(config);
    const auth = getAuth(app);
    let offProfile: (() => void) | null = null;
    const off = onAuthStateChanged(auth, (user) => {
      offProfile?.(); offProfile = null;
      if (!user) { setState({ status: "out" }); return; }
      offProfile = onValue(ref(getDatabase(app), `users/${user.uid}`), (snap) => {
        const v = (snap.val() ?? {}) as { phone?: string; role?: string };
        setState({ status: "in", user, linked: snap.exists(),
          session: { uid: user.uid, phone: v.phone ?? null, role: v.role === "mdj" ? "mdj" : "player" } });
      }, () => setState({ status: "in", user, linked: false, session: { uid: user.uid, phone: null, role: "player" } }));
    });
    return () => { off(); offProfile?.(); };
  }, [config]);
  return state;
}

export const logout = (config: Record<string, string>) => signOut(getAuth(firebaseApp(config)));

/**
 * Connexion par identifiant : sans « @ », l'identifiant devient l'adresse de récupération du jeu
 * avec un « +identifiant » (VITE_RECOVERY_EMAIL = a@b → a+glinda@b : tout arrive dans une seule boîte,
 * qui reçoit les liens « mot de passe oublié »). Sans cette variable, ou pour les anciens comptes,
 * adresse fictive sur le domaine réservé .invalid. Même règle dans scripts/create-players.mjs.
 */
export const LOGIN_DOMAIN = "joueurs.invalid";
const RECOVERY = (import.meta.env.VITE_RECOVERY_EMAIL as string | undefined)?.trim().toLowerCase();
const [RUSER, RDOMAIN] = RECOVERY?.split("@") ?? [];
const legacyEmail = (login: string) => `${login.trim().toLowerCase()}@${LOGIN_DOMAIN}`;
export const loginToEmail = (login: string) => {
  const l = login.trim().toLowerCase();
  return l.includes("@") ? l : RDOMAIN ? `${RUSER}+${l}@${RDOMAIN}` : legacyEmail(l);
};
export const emailToLogin = (email?: string | null) => {
  const e = (email ?? "").toLowerCase();
  const pre = `${RUSER}+`, post = `@${RDOMAIN}`;
  return RDOMAIN && e.startsWith(pre) && e.endsWith(post) ? e.slice(pre.length, -post.length) : e.replace(`@${LOGIN_DOMAIN}`, "");
};

/** Changement du mot de passe une fois connecté (les comptes à identifiant n'ont pas d'e-mail de réinitialisation). */
export async function changePassword(config: Record<string, string>, next: string): Promise<string> {
  const user = getAuth(firebaseApp(config)).currentUser;
  if (!user) return "Pas connecté·e.";
  if (next.length < 6) return "6 caractères minimum.";
  try { await updatePassword(user, next); return "Mot de passe changé."; }
  catch (e) { return (e as { code?: string }).code === "auth/requires-recent-login" ? "Reconnecte-toi puis réessaie (sécurité)." : "Échec du changement."; }
}

export function LoginScreen({ config }: { config: Record<string, string> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const auth = getAuth(firebaseApp(config));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null); setInfo(null);
    try { await signInWithEmailAndPassword(auth, loginToEmail(email), password); }
    catch {
      // Compte pas encore passé sur l'adresse de récupération : ancienne adresse fictive.
      const old = !email.includes("@") && legacyEmail(email);
      try { if (!old || old === loginToEmail(email)) throw 0; await signInWithEmailAndPassword(auth, old, password); }
      catch { setError("Identifiant ou mot de passe incorrect."); }
    }
    finally { setBusy(false); }
  };
  const reset = async () => {
    if (!email.trim()) { setError("Entre ton identifiant d'abord."); return; }
    if (!email.includes("@") && !RDOMAIN) { setInfo("Compte à identifiant : demande un nouveau mot de passe à la personne qui gère le jeu."); return; }
    try {
      await sendPasswordResetEmail(auth, loginToEmail(email));
      setInfo(email.includes("@") ? "E-mail de réinitialisation envoyé." : "Lien de réinitialisation envoyé à la personne qui gère le jeu : demande-lui ton nouveau mot de passe.");
    }
    catch { setError("Impossible d'envoyer l'e-mail."); }
  };

  return (
    <div className="lobby">
      <Sparkles />
      <h1>#WhatsInOurPhones</h1>
      <p className="sub">University of Maine at Augusta · Fall 2012</p>
      <form className="login" onSubmit={submit}>
        <label>Identifiant<input type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ex. glinda" required /></label>
        <label>Mot de passe<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {error && <p className="err">{error}</p>}
        {info && <p className="ok">{info}</p>}
        <button className="y2k-btn" disabled={busy}>{busy ? "Connexion…" : "Se connecter"}</button>
        <button type="button" className="linkish" onClick={reset}>Mot de passe oublié ?</button>
      </form>
    </div>
  );
}
