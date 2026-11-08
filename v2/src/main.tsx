import { StrictMode, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Route, Routes, useParams } from "react-router-dom";
import { DataProvider } from "./data/hooks";
import { createMemoryStore, resetMemoryStore } from "./data/memoryStore";
import { createFirebaseStore } from "./data/firebaseStore";
import { changePassword, emailToLogin, LoginScreen, logout, useFirebaseSession, type Session } from "./data/auth";
import type { Json, Store } from "./data/store";
import { Phone } from "./phone/Phone";
import { Admin, Lobby, PIDS } from "./site/Site";
import { installTouchContextMenu } from "./phone/touchContextMenu";
import "./styles.css";

installTouchContextMenu();

const LS_ME = "uma-v2-me";

// Firebase si configuré (VITE_FIREBASE_DATABASE_URL), sinon mode démo : store mémoire seedé.
const FIREBASE_CONFIG: Record<string, string> | null = import.meta.env.VITE_FIREBASE_DATABASE_URL
  ? {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY, authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL, projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    }
  : null;

function Shell({ store, session, account, children }: { store: Store; session: Session; account: ReactNode; children?: ReactNode }) {
  return (
    <DataProvider store={store} session={session}>
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Lobby me={session.phone} account={account} admin={session.role === "mdj"} />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/:pid/*" element={<PhoneRoute />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      {children}
    </DataProvider>
  );
}

// ── Production : Firebase + comptes joueurs ─────────────────────────────────
function FirebaseRoot({ config }: { config: Record<string, string> }) {
  const state = useFirebaseSession(config);
  const store = useMemo(() => createFirebaseStore(config), [config]);
  if (state.status === "loading") return <div className="lobby"><p>Chargement…</p></div>;
  if (state.status === "out") return <LoginScreen config={config} />;
  if (!state.linked) return (
    <div className="lobby">
      <p>Ton compte n'est pas encore relié à un téléphone.</p>
      <p className="devnote">Identifiant à transmettre : <code>{state.user.uid}</code></p>
      <button className="linkish" onClick={() => logout(config)}>Se déconnecter</button>
    </div>
  );
  const account = (
    <p className="whoami">
      Connecté·e : {emailToLogin(state.user.email)} · {state.session.role === "mdj" ? "MDJ" : `téléphone de ${state.session.phone}`}{" "}
      <button className="linkish" onClick={async () => { const p = window.prompt("Nouveau mot de passe (6 caractères min.)"); if (p) alert(await changePassword(config, p)); }}>Changer le mot de passe</button>{" · "}
      <button className="linkish" onClick={() => logout(config)}>Se déconnecter</button>
    </p>
  );
  return <Shell store={store} session={state.session} account={account} />;
}

// ── Démo / dev : store mémoire, perso choisi localement ─────────────────────
const readMe = () => { try { return localStorage.getItem(LS_ME); } catch { return null; } };

function DemoRoot() {
  const [store, setStore] = useState<Store | null>(null);
  const [me, setMe] = useState<string | null>(readMe);
  useEffect(() => { import("./dev/seed-v2.json").then((m) => setStore(createMemoryStore(m.default as unknown as Json))); }, []);
  const session = useMemo<Session>(() => (me === "mdj" ? { uid: "mdj", phone: null, role: "mdj" } : { uid: me ?? "anon", phone: me, role: "player" }), [me]);
  if (!store) return <div className="lobby"><p>Chargement…</p></div>;
  const choose = (p: string | null) => {
    setMe(p);
    try { if (p) localStorage.setItem(LS_ME, p); else localStorage.removeItem(LS_ME); } catch { /* rien */ }
  };
  const account = (
    <>
      <div className="whoami">
        Je joue :{" "}
        <select value={me ?? ""} onChange={(e) => choose(e.target.value || null)}>
          <option value="">— personne (lecture seule) —</option>
          {PIDS.map((p) => <option key={p} value={p}>{p}</option>)}
          <option value="mdj">MDJ (tous les droits + panneau de configuration)</option>
        </select>
      </div>
      <p className="devnote">
        Mode démo : données locales à ce navigateur.{" "}
        <button onClick={() => { if (confirm("Effacer les modifications locales ?")) { resetMemoryStore(); location.reload(); } }}>Réinitialiser</button>
      </p>
    </>
  );
  return <Shell store={store} session={session} account={account} />;
}

function PhoneRoute() {
  const { pid = "" } = useParams();
  if (!PIDS.includes(pid as (typeof PIDS)[number])) return <div className="lobby"><p>Téléphone inconnu.</p><Link to="/">← Retour</Link></div>;
  return <Phone />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>{FIREBASE_CONFIG ? <FirebaseRoot config={FIREBASE_CONFIG} /> : <DemoRoot />}</StrictMode>,
);
