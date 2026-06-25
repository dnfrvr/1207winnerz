# Configuration Sync — Firebase + Supabase

## Architecture

| Service | Rôle |
|---------|------|
| **Firebase Realtime Database** | Synchronisation temps réel des données entre tous les appareils |
| **Supabase Storage** | Stockage persistant des images uploadées (remplace Firebase Storage payant) |

---

## 1. Firebase Realtime Database

### Prérequis
1. Créer un projet sur [console.firebase.google.com](https://console.firebase.google.com)
2. Activer **Realtime Database** (Europe West si possible)
3. Configurer les règles (mode test pour démarrer) :
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```
4. Récupérer les clés dans **Paramètres du projet > Vos applications > SDK Firebase**

### Variables nécessaires
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_DATABASE_URL
VITE_FIREBASE_PROJECT_ID
```

---

## 2. Supabase Storage

### Prérequis
1. Créer un projet sur [supabase.com](https://supabase.com)
2. Aller dans **Storage** et créer un bucket nommé **`uploads`** (type : **Public**)
3. Dans **Storage > Policies**, ajouter une politique pour les uploads anonymes :
   - Opération : `INSERT`
   - Target roles : `anon`
   - Policy : `bucket_id = 'uploads'`
4. Récupérer les clés dans **Project Settings > API**

### Variables nécessaires
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

---

## 3. Configuration locale

Copier `.env.example` en `.env.local` et remplir avec vos vraies clés :

```bash
cp .env.example .env.local
# Éditer .env.local avec vos clés
```

---

## 4. Déploiement Netlify

Dans **Site settings > Environment variables**, ajouter les 6 variables :

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Clé API Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | Domaine auth Firebase |
| `VITE_FIREBASE_DATABASE_URL` | URL de la Realtime Database |
| `VITE_FIREBASE_PROJECT_ID` | ID du projet Firebase |
| `VITE_SUPABASE_URL` | URL de votre projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clé publique anon Supabase |

---

## 5. Build et déploiement

```bash
# En local
npm install
npm run dev

# Build production
npm run build
```

Netlify détectera automatiquement `netlify.toml` et lancera `npm run build`.

---

## Comportement si les clés sont absentes

- **Sans Firebase** : l'app fonctionne en mode local uniquement (pas de sync entre appareils)
- **Sans Supabase** : les images sont encodées en base64 dans Firebase (plus lourd mais fonctionnel)
