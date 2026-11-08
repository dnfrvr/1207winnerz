# À faire — v2

## En attente (action de l'utilisateur·rice)

- [ ] **Créer les comptes joueurs** (mis de côté le 2026-11-07)
  `node v2/scripts/create-players.mjs glinda eoghan drew elias mj` (connexion par identifiant ;
  `glinda=pseudo` ou `glinda=e-mail` possible)
  → mots de passe temporaires dans `migration/_out/comptes-joueurs.txt` (local, à supprimer après).
- [ ] Ensuite : fusionner `migration/_out/users.json` dans `migration/_out/v2-from-live.json`
  puis l'**importer** dans la Realtime Database v2 (console → Données → ⋮ → Importer JSON).
  Refaire un export frais de l'ancienne app juste avant, et relancer la migration :
  `node migration/migrate-v1-to-v2.mjs <export.json> migration/_out/v2-from-live.json --images public/assets/live`
- [ ] Phase 0 (ancien projet) : coller `database.rules.json` dans les règles Firebase de l'ancienne base.
- [ ] Phase 0 : secrets GitHub `FIREBASE_DATABASE_URL` + `BACKUP_PASSPHRASE`, lancer « Backup Firebase » une fois.
- [ ] Plugins Claude Code (context-mode, i-have-adhd) à installer en portée utilisateur ; trouver le lien de « savemytokens ».

- [x] ~~Supabase injoignable~~ : de nouveau joignable le 2026-11-08 ; les 49 URL Supabase des données
  migrées pointent maintenant vers les copies locales (`public/assets/live`).
- [ ] **Clés Supabase pour l'envoi de photos** : ajouter `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
  (les mêmes que l'ancienne app, dans Netlify) à `v2/.env.local` et au futur site Netlify v2.

## À vérifier dans les données

- [ ] Copie ancienne du fil Glinda ↔ Eoghan (rangée dans `legacy/charCopies/drew_sharedThreads`) :
  12 messages absents du fil principal.
- [ ] Fil Glinda ↔ Eoghan : 1er message « je sais plus ton prénoZZZm » → modification accidentelle ?
- [ ] Conv « xX WiiNNERS Xx » de Glinda : 26 messages locaux en double (gardés dans `legacyLocalThread`).

## Dev

- [x] Socle v2, Notes, Messages, animations, connexion
- [x] Coquille Android (Drew)
- [x] Portage des 51 apps (iOS 6 + Android 4.1), édition universelle (appui long / clic droit)
- [x] Optimisation des images
- [x] Envoi de vraies photos depuis l'appareil (bouton « Choisir une photo » sur les champs image ; actif dès que les clés Supabase sont là)
- [ ] Déploiement Netlify de la v2 : créer un 2e site, « Base directory » = `v2` (config prête dans `v2/netlify.toml`), y mettre les variables VITE_FIREBASE_* et VITE_SUPABASE_*

## Liste du 2026-11-08 (en cours — reprendre ici)

Fait : Mail au lieu de Gmail sur iPhone (migration) ; bouton retour unique `BarBack` (iOS en flèche
teintée / Android « Up ») branché sur Instagram, Snapchat, GroupMe, Plans, Musique, Personal (Grindr…VPN),
Pinterest, Tumblr, Twitter.

Fait le 2026-11-08 (2e passe) : `BarBack` sur Kik, Vine, YouTube, Messenger, Passbook (Boussole garde
son « Done » d'époque) ; icônes Android carrées ; Passbook (la carte suivant une carte ouverte cachait
son code-barres, appui long au doigt) ; horloges mondiales modifiables / ajoutables (`data/worldClocks`)
et alarmes par défaut modifiables ; rayures de l'iPhone d'Elias ; l'écran ne défile plus quand un
champ d'édition prend le focus (`overflow: clip`).

Fait le 2026-11-08 (3e passe) : ask.fm / ESPN / Polyvore en vraies apps ; tout éditable (appui long
tactile partout via `touchContextMenu`, `useSeeded` pour les listes par défaut, Boussole, parties des
jeux) ; Musique avec extraits Deezer, mini-lecteur, pochettes automatiques et ajout par recherche Deezer ;
SoundCloud et iNaturalist refaits ; historique du navigateur trié par date ; connexion par identifiant
(+ changement de mot de passe) ; site façon Aero/messagerie 2009 avec mini-téléphones, panneau MJ
(`/admin` : date de lore, réglages des téléphones) et visite guidée animée.

Reste :
- [ ] Appareil photo : courte vidéo par perso (fichiers à fournir)
- [ ] Tester sur un vrai iPhone / Android (appui long tactile, audio Deezer, plein écran)

## Pistes d'amélioration (réalisme et personnalisation)

Réalisme :
- [ ] Notifications : bannières iOS 6 / barre de notif Android qui tombent quand un autre joueur écrit
- [ ] Centre de notifications (iOS 6) et volet déroulant (Android) avec l'historique des notifs
- [ ] Écran verrouillé : notifications en attente, photo de verrouillage distincte, code PIN par perso
- [ ] Batterie / réseau qui varient (E, 3G, Wi-Fi) ; mode avion ; « Pas de service » scénarisable
- [ ] Appels : écran d'appel entrant/sortant, journal d'appels, messagerie vocale (fichiers audio)
- [ ] Clavier iOS 6 / Android dessiné, avec autocorrection de l'époque (option)
- [ ] Recherche Spotlight (iOS) / Google Now (Android) sur le contenu du téléphone
- [ ] App Store / Play Store avec les apps installées et leurs mises à jour
- [ ] Indicateurs « Lu à 14:02 », « Distribué », « en train d'écrire… » dans Messages
- [ ] Sons système (clic clavier, verrouillage, SMS « Tri-tone ») activables

Personnalisation :
- [ ] Réorganiser les icônes à l'appui long (mode « tremblement » iOS / glisser Android), dossiers
- [ ] Choisir fond d'écran et sonnerie depuis Réglages (déjà en base : `profile.wallpaper`)
- [ ] Ajouter / retirer une app de l'écran d'accueil, renommer, changer l'icône
- [ ] Widgets Android (horloge, météo, musique) sur l'écran d'accueil de Drew
- [ ] Coques : couleur, étui, fissure d'écran, autocollants (comme les rayures d'Elias)
- [ ] Historique des modifications (déjà enregistré dans `history/`) consultable et annulable par le joueur
