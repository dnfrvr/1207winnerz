import { StrictMode, Suspense, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Route, Routes, useParams } from "react-router-dom";
import { DataProvider, useValue } from "./data/hooks";
import { createMemoryStore, resetMemoryStore } from "./data/memoryStore";
import { createFirebaseStore } from "./data/firebaseStore";
import type { Json, Store } from "./data/store";
import { IOSPhone } from "./phone/IOSPhone";
import seed from "./dev/seed-v2.json";
import "./styles.css";

const PIDS = ["glinda", "eoghan", "drew", "elias"] as const;
const LS_ME = "uma-v2-me";

// Firebase si configuré (VITE_FIREBASE_DATABASE_URL), sinon store mémoire seedé (dev / démo).
function makeStore(): Store {
  const url = import.meta.env.VITE_FIREBASE_DATABASE_URL as string | undefined;
  if (url) return createFirebaseStore({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY, authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: url, projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  });
  return createMemoryStore(seed as unknown as Json);
}

const readMe = () => { try { return localStorage.getItem(LS_ME); } catch { return null; } };

function Root() {
  const store = useMemo(makeStore, []);
  // TODO phase 2b : Firebase Auth. En attendant, le joueur choisit son perso (stocké localement).
  const [me, setMe] = useState<string | null>(readMe);
  const session = useMemo(() => ({ uid: me ?? "anon", phone: me, role: "player" as const }), [me]);
  const choose = (p: string | null) => {
    setMe(p);
    try { if (p) localStorage.setItem(LS_ME, p); else localStorage.removeItem(LS_ME); } catch { /* rien */ }
  };
  return (
    <DataProvider store={store} session={session}>
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Lobby me={me} onChoose={choose} memory={store.kind === "memory"} />} />
            <Route path="/:pid/*" element={<PhoneRoute />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </DataProvider>
  );
}

function PhoneRoute() {
  const { pid = "" } = useParams();
  const os = useValue<string>(`phones/${pid}/profile/os`);
  if (os === "android") return <div className="lobby"><p>Le téléphone Android arrive bientôt dans la v2.</p><Link to="/">← Retour</Link></div>;
  return <IOSPhone />;
}

function Lobby({ me, onChoose, memory }: { me: string | null; onChoose: (p: string | null) => void; memory: boolean }) {
  return (
    <div className="lobby">
      <h1>#WhatsInOurPhones</h1>
      <p className="sub">University of Maine at Augusta · Fall 2012</p>
      <div className="phones">{PIDS.map((p) => <LobbyPhone key={p} pid={p} mine={me === p} />)}</div>
      <div className="whoami">
        Je joue :{" "}
        <select value={me ?? ""} onChange={(e) => onChoose(e.target.value || null)}>
          <option value="">— personne (lecture seule) —</option>
          {PIDS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      {memory && (
        <p className="devnote">
          Mode démo : données locales à ce navigateur.{" "}
          <button onClick={() => { if (confirm("Effacer les modifications locales ?")) { resetMemoryStore(); location.reload(); } }}>Réinitialiser</button>
        </p>
      )}
    </div>
  );
}

function LobbyPhone({ pid, mine }: { pid: string; mine: boolean }) {
  const p = useValue<{ name?: string; avatar?: string; accentColor?: string }>(`phones/${pid}/profile`);
  const avatar = typeof p?.avatar === "string" ? p.avatar : undefined;
  return (
    <Link to={`/${pid}`} className={`lobby-phone ${mine ? "mine" : ""}`} style={{ borderColor: p?.accentColor }}>
      {avatar ? <img src={avatar} alt="" /> : <span className="ph">📱</span>}
      <span>{p?.name ?? pid}</span>
      {mine && <small>mon téléphone</small>}
    </Link>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><Root /></StrictMode>);
