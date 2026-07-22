// ─── FIREBASE (sync multi-appareils) ─────────────────────────────────────────
// Toutes les variables VITE_FIREBASE_* sont à définir dans Netlify (Site settings → Environment variables)
// et dans un fichier .env.local en local. Voir SYNC_SETUP.md pour la procédure complète.
// Si aucune config n'est fournie, l'app fonctionne quand même en local uniquement (db = null).
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey:       import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:   import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL:  import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId:    import.meta.env.VITE_FIREBASE_PROJECT_ID,
  // storageBucket n'est plus utilisé (remplacé par Supabase Storage)
};

let firebaseDb = null;
try {
  if (firebaseConfig.databaseURL) {
    const fbApp = initializeApp(firebaseConfig);
    firebaseDb = getDatabase(fbApp);
  } else {
    console.warn("[sync] Pas de config Firebase détectée — l'app tourne en local uniquement (pas de synchro entre téléphones).");
  }
} catch (e) {
  console.error("[sync] Échec d'initialisation Firebase :", e);
}

export { firebaseDb };
