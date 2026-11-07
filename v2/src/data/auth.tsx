// Connexion des joueurs (Firebase Auth, e-mail + mot de passe). Le lien compte → téléphone est
// dans la base : users/{uid} = { phone: "glinda", role: "player" | "mj" } (créé dans la console).
import { useEffect, useState, type FormEvent } from "react";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, type User } from "firebase/auth";
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
    try { await signInWithEmailAndPassword(auth, email.trim(), password); }
    catch { setError("E-mail ou mot de passe incorrect."); }
    finally { setBusy(false); }
  };
  const reset = async () => {
    if (!email.trim()) { setError("Entre ton e-mail d'abord."); return; }
    try { await sendPasswordResetEmail(auth, email.trim()); setInfo("E-mail de réinitialisation envoyé."); }
    catch { setError("Impossible d'envoyer l'e-mail."); }
  };

  return (
    <div className="lobby">
      <h1>#WhatsInOurPhones</h1>
      <p className="sub">University of Maine at Augusta · Fall 2012</p>
      <form className="login" onSubmit={submit}>
        <label>E-mail<input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>Mot de passe<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {error && <p className="err">{error}</p>}
        {info && <p className="ok">{info}</p>}
        <button className="y2k-btn" disabled={busy}>{busy ? "Connexion…" : "Se connecter"}</button>
        <button type="button" className="linkish" onClick={reset}>Mot de passe oublié ?</button>
      </form>
    </div>
  );
}
