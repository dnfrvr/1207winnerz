# CONTEXTE — FindAnna Phone Simulator (1207winnerz)

> Document de contexte technique du projet. Pour l'histoire/l'univers, voir `LORE.md`.

## 1. En une phrase

Un **simulateur de smartphones** (iOS + Android d'époque, ~2012) qui met en scène 4 téléphones de personnages fictifs, entièrement remplis de contenu (messages, réseaux sociaux, galeries, musique…). C'est le support d'une **fiction interactive / murder-mystery collaborative** : plusieurs joueurs peuvent consulter et éditer les téléphones en temps réel, la scène de crime numérique évoluant au fil de l'histoire.

## 2. Nature du projet

- **Type** : application web React mono-page (SPA), sans backend propre.
- **But** : reconstituer 4 téléphones crédibles d'octobre 2012 comme pièces à conviction / support de jeu de rôle. Le nom « FindAnna » renvoie à l'intrigue (voir `LORE.md`).
- **Public** : un petit groupe de joueurs/MJ qui partagent le même état synchronisé, plus un mode admin pour éditer tout le contenu.
- **Langue** : interface et contenu en **français** ; époque volontairement rétro (« y2k », iOS 6 / Android 2.x façon skeuomorphe).

## 3. Stack technique

| Élément | Choix |
|--------|-------|
| Framework UI | **React 18** (hooks, `memo`, Context) |
| Build | **Vite 5** (`@vitejs/plugin-react`) |
| Sync temps réel | **Firebase Realtime Database** |
| Stockage images | **Supabase Storage** (bucket public `uploads`) |
| Serverless | **Netlify Functions** (1 fonction : import de playlist Spotify) |
| Hébergement | **Netlify** (`netlify.toml`, redirect SPA) |
| CI | **GitHub Actions** (1 workflow : keep-alive Supabase) |

Aucune dépendance UI tierce (pas de router, pas de librairie de composants, pas de CSS framework) : **tout est écrit à la main**, styles inline.

## 4. Structure du dépôt

```
1207winnerz/
├── index.html                  # point d'entrée, monte #root
├── src/
│   ├── main.jsx                # bootstrap React → importe le fichier applicatif
│   ├── lib/
│   │   ├── firebase.js         # init Firebase Realtime DB → export firebaseDb
│   │   ├── storage.js          # Supabase + UploadReader + migration base64
│   │   └── deep.js             # deepDiffPatch / setDeepPath / shallowDiffPatch
│   └── data/
│       ├── characters.js       # données seed pures : CHAR_NAMES, GROUP_SEED, mkData (~9 200 lignes)
│       └── seeds.js            # seeds/défauts : FORCED_PLAYLISTS, SEED_*, NOTIF_SEED, TWITTER/TUMBLR defaults (~850 lignes)
├── phones_y2k.jsx              # cœur de l'app : ~14 800 lignes (composants + admin + App)
├── public/assets/seed/         # 227 images (56 Mo) — avatars, wallpapers, icônes, galeries
├── netlify/functions/
│   └── spotify-playlist.js      # récupère une playlist Spotify publique (Client Credentials)
├── .github/workflows/
│   └── keep-supabase-alive.yml # ping Supabase tous les 3 jours (évite la mise en pause du free tier)
├── vite.config.js
├── netlify.toml
├── .env.example                # 6 variables VITE_* (Firebase + Supabase)
└── SYNC_SETUP.md               # doc de config Firebase/Supabase/Netlify
```

**Il n'y a pas de `.gitignore`.**

## 5. Le fichier central : `phones_y2k.jsx`

> **Refactor en cours** : la couche d'accès (Firebase/Supabase/utils) a été sortie dans `src/lib/`, et les données seed dans `src/data/` (`characters.js` ~9 200 lignes + `seeds.js` ~850 lignes). Le fichier est passé de ~25 000 à ~14 800 lignes (−41 %). Les composants d'écrans, l'admin et `App()` y restent (prochaine étape).
>
> **Prochaine étape (plus délicate)** : sortir les composants d'écrans et `AdminBackoffice`. Analyse faite : `AdminBackoffice` référence ~26 symboles externes, dont des composants d'écrans (GrindrScreen, WeatherCityCard, IgCommentEditor) et des données définies *après* lui. L'extraire directement créerait des dépendances circulaires — il faut d'abord bâtir une couche `src/shared/` (contextes `DevCtx`/`LoreDateCtx`, `APP_META`, `FF_IOS`, helpers de date) puis extraire les écrans un par un, chacun validé par `npm run build`.

Le fichier contient encore : la logique de sync/composition, ~60 composants « écrans d'app », l'interface admin, et `App()`. Découpage logique (numéros de ligne d'avant refactor) :

| Lignes (approx.) | Contenu |
|---|---|
| 1–210 | Init Firebase + Supabase, `UploadReader` (upload d'image drop-in avec fallback base64), migration base64→Supabase, utils `deepDiffPatch` / `setDeepPath` |
| 210–830 | Contexts, barres d'état/lock iOS & Android, `APP_META`, icônes SVG |
| 830–5350 | **~50 écrans d'applications simulées** : Music, Snapchat, Grindr, Browser, Phone/Dialer, Notes, Tumblr, Nike+, Contacts, Settings, Weather, Pinterest, GroupMe, Starbucks, SoundCloud, Spotify, Wikipedia, Pandora, Kindle, iNaturalist, YouTube, Reddit, Twitter, Files, VPN, etc. |
| 5350–7780 | `DraggableHomescreen`, `IOSPhone`, `AndroidPhone` (les deux coquilles OS complètes avec springboard, dock, notifications) |
| 7780–9150 | `PhoneCard` (vue « carte » d'un téléphone), accents/playlists forcés |
| 9150–18377 | **`GROUP_SEED` + `mkData()`** : toute la donnée initiale (conversations, profils des 4 persos, apps, galeries, musique, réseaux sociaux…) |
| 18377–18990 | Seeds sociaux (tweets, tumblr, facebook), éditeurs partagés, définitions d'import |
| 19008–23290 | **`AdminBackoffice`** (~4 300 lignes) : l'éditeur complet de tout le contenu |
| 23316–25063 | **`App()`** (racine : state, sync Firebase, snapshots) + écrans restants (Calendar, Clock, Calculator, Facebook, Gmail, Instagram, Maps, MFP, Shazam) |

## 6. Modèle de données & persistance

- État global unique `data` dans `App()`, initialisé par `loadData()` → `mkData()` (données par défaut « fraîches à chaque chargement », pas de localStorage).
- Clés par personnage : `glinda`, `eoghan`, `drew`, `elias`. Chaque perso = `{ name, username, os, apps[], dock[], avatar, wallpaper, accentColor, messages[], instagram, tumblr, music, playlists, gallery, facebookPages, homeBaseTweets… }`.
- Données **partagées** sous `sharedThreads` (`_sharedTweets`, `_sharedTumblrPosts`, `_sharedFacebookPosts`, `_twitterFollows`…) et `groupMeta` (le fil de groupe commun).
- **Sync Firebase** : `onValue` écoute la racine ; les écritures locales sont regroupées (debounce ~600 ms) et n'envoient que le **diff feuille-à-feuille** (`deepDiffPatch`) pour ne pas re-pousser toutes les images à chaque frappe.
- **Migration versionnée** : `SEED_VERSION = 8`. Au premier snapshot reçu, si `_seedVersion` distant < `SEED_VERSION`, des patches réinjectent/corrigent les seeds (tweets, follows, playlists, instagram, pages FB…).
- **Snapshots** : avant chaque écriture, copie complète de l'état dans `_snapshots/{ts}` (throttle 30 s, max 10 conservés) → rollback en 2 clics depuis l'admin.
- **Images** : `UploadReader` remplace `FileReader` — upload vers Supabase Storage et ne stocke que l'URL publique ; fallback base64 dans Firebase si Supabase absent. Un utilitaire migre les anciennes chaînes base64 vers Supabase.

## 7. Fonctionnalités notables

- Deux coquilles OS fidèles (iOS 6 skeuomorphe / Android 2.x « holo »), slide-to-unlock, springboard réorganisable (drag & drop), dock, notifications de lock screen.
- ~50 applications simulées avec contenu éditable.
- **Date de lore** globale (`loreDate`, défaut `2012-10-06` = date de présentation des téléphones en séance ; **avancée manuellement de séance en séance** via le sélecteur de l'admin) : synchronisée et propagée à tous — pilote l'affichage temporel (météo, calendrier, tri des messages via `parseLoreTime`).
- **Mode admin** activé par l'URL `?admin=1` (aucune authentification) : `AdminBackoffice` permet d'éditer chaque perso, importer/exporter du JSON, restaurer un snapshot, importer une playlist Spotify.
- Import de playlist Spotify via la Netlify Function (le client secret reste côté serveur).

## 8. Configuration & déploiement

- 6 variables `VITE_*` (Firebase ×4, Supabase ×2) + 2 côté Netlify (`SPOTIFY_CLIENT_ID/SECRET`). Voir `SYNC_SETUP.md`.
- **Dégradation gracieuse** : sans Firebase → mode local (pas de sync) ; sans Supabase → images en base64.
- Déploiement : Netlify build `npm run build` → `dist`, avec redirect SPA `/* → /index.html`.
- Règles Firebase recommandées dans la doc : `.read: true / .write: true` (**ouvert à tous**).

## 9. Points d'attention (résumé — détails dans les recommandations)

- **Un seul fichier de 25 000 lignes** : difficile à maintenir, à relire, à charger dans un éditeur/IA.
- **Aucune sécurité** : Firebase et Supabase ouverts en lecture/écriture à tous ; mode admin sans mot de passe ; anon key Supabase committée en clair dans le workflow GitHub.
- **Pas de `.gitignore`** (risque de committer `.env.local`).
- **Poids** : 56 Mo d'images seed + bundle applicatif monolithique.
- **Pas de tests, pas de lint, pas de TypeScript.**
