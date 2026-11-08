// Connexion des joueurs (Firebase Auth, e-mail + mot de passe). Le lien compte → téléphone est
// dans la base : users/{uid} = { phone: "glinda", role: "player" | "mj" } (créé dans la console).
import { useEffect, useState, type FormEvent } from "react";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, updatePassword, type User } from "firebase/auth";
import { getDatabase, onValue, ref } from "firebase/database";
import { firebaseApp } from "./firebaseStore";

export type Session = { uid: string; phone: string | null; role: "player" | "mj" };
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
          session: { uid: user.uid, phone: v.phone ?? null, role: v.role === "mj" ? "mj" : "player" } });
      }, () => setState({ status: "in", user, linked: false, session: { uid: user.uid, phone: null, role: "player" } }));
    });
    return () => { off(); offProfile?.(); };
  }, [config]);
  return state;
}

export const logout = (config: Record<string, string>) => signOut(getAuth(firebaseApp(config)));

/**
 * Connexion par identifiant : sans « @ », l'identifiant devient une adresse fictive sur le
 * domaine réservé .invalid (jamais livrable). Même règle dans scripts/create-players.mjs.
 */
export const LOGIN_DOMAIN = "joueurs.invalid";
export const loginToEmail = (login: string) => { const l = login.trim().toLowerCase(); return l.includes("@") ? l : `${l}@${LOGIN_DOMAIN}`; };
export const emailToLogin = (email?: string | null) => (email ?? "").replace(`@${LOGIN_DOMAIN}`, "");

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
    catch { setError("Identifiant ou mot de passe incorrect."); }
    finally { setBusy(false); }
  };
  const reset = async () => {
    if (!email.trim()) { setError("Entre ton identifiant d'abord."); return; }
    if (!email.includes("@")) { setInfo("Compte à identifiant : demande un nouveau mot de passe à la personne qui gère le jeu."); return; }
    try { await sendPasswordResetEmail(auth, email.trim()); setInfo("E-mail de réinitialisation envoyé."); }
    catch { setError("Impossible d'envoyer l'e-mail."); }
  };

  return (
    <div className="lobby">
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
