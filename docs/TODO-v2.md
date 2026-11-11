# À faire — v2

## En attente (action de l'utilisateur·rice)

- [x] **Créer les comptes joueurs** — fait le 2026-11-08 (5 comptes, déjà fusionnés dans `v2-from-live.json`)
  `node v2/scripts/create-players.mjs glinda eoghan drew elias mdj` (connexion par identifiant ;
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
- [x] **Clés Supabase pour l'envoi de photos** (ajoutées à `v2/.env.local` le 2026-11-08 ; reste à les mettre dans le futur site Netlify v2) : ajouter `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
  (les mêmes que l'ancienne app, dans Netlify) à `v2/.env.local` et au futur site Netlify v2.

## ▶ Reprendre ici (session du 2026-11-08 arrêtée : limite atteinte)

- [x] **Convertir les vidéos à l'envoi** : le HEVC est réencodé en H.264 (MP4) dans le navigateur
  (`toH264` dans `v2/src/lib/upload.ts` : lecture muette dans un canvas + MediaRecorder, sans dépendance,
  en temps réel, sans le son). Testé sur la vidéo de Glinda : 13,5 Mo HEVC → 1,3 Mo avc1, lisible.
  Limites : l'onglet doit rester au premier plan pendant la conversion ; un navigateur qui ne décode
  pas le HEVC (Firefox sur PC…) refuse toujours — envoyer depuis l'iPhone (Safari).
- [x] **Vidéos de Glinda en double dans Supabase** : `s2dyy8` et `l7o0uj` supprimées le 2026-11-08 ;
  reste `1794159983692_vvfhws.mp4` (celle de `cameraVideo`, encore en HEVC — à renvoyer depuis l'iPhone
  pour qu'elle passe par la conversion, puis supprimer l'ancienne).
- [x] **Guide de prise en main dans chaque app** (`v2/src/phone/AppTips.tsx`) : visite guidée à la
  1re ouverture (par navigateur, seulement pour qui peut modifier), façon unlokmi.me/start : écran
  assombri sauf l'élément à toucher, doigt fantôme qui mime le geste (toucher / maintenir), carte
  fléchée avec progression, « Suivant » / « Passer ». Étapes propres à chaque app ; les étapes « @ »
  attendent leur sous-écran (ex. fil de Messages) ; sans cible visible, carte en bas d'écran ;
  aucune visite pour Appareil photo, FaceTime, Shazam.
  Cartes au style Windows 7 de la visite d'accueil (composant `Win`, sorti dans `v2/src/site/Win.tsx`).
- [x] **Dates avec un jour précis** : dans le formulaire « Modifier » (toutes les apps), les champs
  date/time/due/posted qui contiennent une vraie date ont un calendrier (+ l'heure si la date en a une) ;
  le choix est réécrit dans le format d'origine (`parseDateField` / `formatDateField`, `v2/src/lib/loreTime.ts`,
  vérifié par `node v2/scripts/check-dates.mjs` et sur les 1 480 dates des données). Calendrier : jour/mois/année
  → un seul sélecteur. Messages › Heure : sélecteur date + heure. Les textes relatifs (« Hier »,
  « 4 hours ago », « Today · 3:02pm ») et les heures seules restent en texte.
- [x] Pousser les commits locaux sur GitHub (`git push origin main`).

## Apps à étoffer (UI)

- [x] **Weather** (2026-11-08) : vraies icônes météo, bandeau heure par heure, dos de carte iOS 6 (« i ») avec
  les villes, l'ajout et °C/°F ; l'icône se choisit dans une liste.
- [x] **GroupMe** (2026-11-08) : groupes cliquables, fil de discussion (avatars, cœurs « like », envoi en son
  nom, « + » pour le message de quelqu'un d'autre), photo de groupe.
- [x] **Messenger** (2026-11-08) : conversations cliquables, fil façon Messenger 2012 (bulles, photos, envoi, « + » pour un message reçu).
- [x] **Reddit** (2026-11-08) : page de post (texte, image, votes) et commentaires en arbre, modifiables.
- [x] **Rappels** (2026-11-11) : listes multiples (« Lists », points de page), échéance sous le titre (rouge si dépassée),
  ligne vide pour écrire directement, « Show Completed » (`data/reminderLists` + champ `list`).
- [ ] **Passbook** : pas de dos de carte (code-barres, détails).
- [ ] **Nike+** : pas de détail de course (carte, allure par km).
- [ ] **Snapchat** : pas d'histoires ni de discussion.
- [ ] **Plans** : carte figée, pas d'itinéraire ni de fiche de lieu.
- [ ] **Boussole, FaceTime, VPN, Wikipédia, Kindle, Polyvore, ESPN** : écrans uniques, à enrichir si besoin.

## À vérifier dans les données

- [ ] Copie ancienne du fil Glinda ↔ Eoghan (rangée dans `legacy/charCopies/drew_sharedThreads`) :
  12 messages absents du fil principal.
- [ ] Fil Glinda ↔ Eoghan : 1er message « je sais plus ton prénoZZZm » → modification accidentelle ?
- [x] Message vide d'Elias dans « Losers + Winners » masqué (`deleted: true`) le 2026-11-08.
- [x] Message vide de Glinda dans « xX WiiNNERS Xx » (`threadMessages/group/k1784841509817`, 15 sep) masqué le 2026-11-08.
- [ ] Conv « xX WiiNNERS Xx » de Glinda : 26 messages locaux en double (gardés dans `legacyLocalThread`).

## Dev

- [x] Socle v2, Notes, Messages, animations, connexion
- [x] Coquille Android (Drew)
- [x] Portage des 51 apps (iOS 6 + Android 4.1), édition universelle (appui long / clic droit)
- [x] Optimisation des images
- [x] Envoi de vraies photos depuis l'appareil (bouton « Choisir une photo » sur les champs image ; actif dès que les clés Supabase sont là)
- [x] Déploiement Netlify de la v2 — en ligne le 2026-11-09 : https://alloleswinnerz.netlify.app
  (site Netlify « alloleswinnerz », base `v2`, 6 variables VITE_*, publication auto à chaque push sur main)
- [ ] Transmettre les mots de passe temporaires (`migration/_out/comptes-joueurs.txt`) puis supprimer ce fichier
- [ ] Tester la connexion d'un vrai compte sur le site en ligne
- [x] Comptes passés sur l'adresse de récupération le 2026-11-09 (glinda → bnl.dana+glinda@gmail.com…)
- [x] Règles v2 resserrées et publiées le 2026-11-09 : chacun ne modifie que ses messages / publications,
  date de lore et données partagées réservées au MDJ (testé dans le simulateur de la console)

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
(+ changement de mot de passe) ; site façon Aero/messagerie 2009 avec mini-téléphones, date de lore modifiable par le MDJ (clic sur la date de la barre des tâches ; plus de panneau d'admin, le MDJ édite dans les téléphones) et visite guidée animée.

Reste :
- [ ] Appareil photo : courte vidéo par perso (fichiers à fournir)
- [ ] Tester sur un vrai iPhone / Android (appui long tactile, audio Deezer, plein écran)

## Pistes d'amélioration (réalisme et personnalisation)

Réalisme :
- [x] **Régie MDJ** (2026-11-10, `v2/src/site/Regie.tsx`) : bouton « Régie » en bas à droite (MDJ seulement).
  Choix du téléphone, contact PNJ (existant ou nouveau), texte, photo → vrai SMS dans Messages
  (`npcMessagePatches`, `v2/src/data/notify.ts`) + notif `phones/{pid}/notifs/{id}`. Un onglet par conversation
  suivie en direct : le MDJ répond au nom du PNJ, signal quand le joueur répond, « Vu » quand la notif est ouverte.
  Côté téléphone (`v2/src/phone/Notifs.tsx`) : bannière iOS 6 / bandeau Android + son, liste sur l'écran verrouillé,
  pastille sur l'icône, bulle « nouveau message » si le joueur est ailleurs sur le site. Une réponse du MDJ écrite
  directement dans le téléphone (au nom du contact) envoie aussi une notif. Mode démo : synchro entre onglets.
  Reste : étendre à Messenger / GroupMe / Mail / Snapchat ; tester sur le site en ligne avec un vrai compte joueur.
- [ ] Notifications : bannières iOS 6 / barre de notif Android qui tombent quand un autre joueur écrit
- [x] Centre de notifications (iOS 6) et volet déroulant (Android) (2026-11-11, `v2/src/phone/NotifCenter.tsx`) : on tire la
  barre d'état ; « × » par app / « tout effacer » (champ `cleared`).
- [ ] Écran verrouillé : notifications en attente, photo de verrouillage distincte, code PIN par perso
  (photo distincte faite le 2026-11-11 ; reste le code PIN)
- [ ] Batterie / réseau qui varient (E, 3G, Wi-Fi) ; mode avion ; « Pas de service » scénarisable
- [ ] Appels : écran d'appel entrant/sortant, journal d'appels, messagerie vocale (fichiers audio)
  Fait le 2026-11-11 : journal iOS 6 (« Sophie (2) », fiche Info « i », Call Back) et appels passés depuis le téléphone
  ajoutés au journal. Reste : journaliser l'appel entrant simulé de la régie (répondu / manqué), audio de messagerie.
- [ ] Clavier iOS 6 / Android dessiné, avec autocorrection de l'époque (option)
- [ ] Recherche Spotlight (iOS) / Google Now (Android) sur le contenu du téléphone
- [ ] App Store / Play Store avec les apps installées et leurs mises à jour
- [x] Indicateurs « Read 2:02 PM », « Delivered », « en train d'écrire… » dans Messages (2026-11-11, iMessage seulement,
  comme en 2012 ; `inbox/{tid}/readAt` et `typing` ; PNJ : appui long « Lu » sur son dernier message)
- [ ] Sons système (clic clavier, verrouillage, SMS « Tri-tone ») activables

Personnalisation :
- [ ] Réorganiser les icônes à l'appui long (mode « tremblement » iOS / glisser Android), dossiers
- [ ] Choisir fond d'écran et sonnerie depuis Réglages (déjà en base : `profile.wallpaper`)
  Fait le 2026-11-11 : fond verrouillé distinct (`profile.lockWallpaper`), « Camera Roll » → Set Lock / Home / Both,
  luminosité (`profile.brightness`). Reste : sonnerie.
- [ ] Ajouter / retirer une app de l'écran d'accueil, renommer, changer l'icône
- [ ] Widgets Android (horloge, météo, musique) sur l'écran d'accueil de Drew
- [ ] Coques : couleur, étui, fissure d'écran, autocollants (comme les rayures d'Elias)
- [ ] Historique des modifications (déjà enregistré dans `history/`) consultable et annulable par le joueur
