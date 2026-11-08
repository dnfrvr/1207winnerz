# À faire — v2

## En attente (action de l'utilisateur·rice)

- [ ] **Créer les comptes joueurs** (mis de côté le 2026-11-07)
  `node v2/scripts/create-players.mjs glinda=… eoghan=… drew=… elias=… [mj=…]`
  → mots de passe temporaires dans `migration/_out/comptes-joueurs.txt` (local, à supprimer après).
- [ ] Ensuite : fusionner `migration/_out/users.json` dans `migration/_out/v2-from-live.json`
  puis l'**importer** dans la Realtime Database v2 (console → Données → ⋮ → Importer JSON).
  Refaire un export frais de l'ancienne app juste avant, et relancer la migration :
  `node migration/migrate-v1-to-v2.mjs <export.json> migration/_out/v2-from-live.json --images public/assets/live`
- [ ] Phase 0 (ancien projet) : coller `database.rules.json` dans les règles Firebase de l'ancienne base.
- [ ] Phase 0 : secrets GitHub `FIREBASE_DATABASE_URL` + `BACKUP_PASSPHRASE`, lancer « Backup Firebase » une fois.
- [ ] Plugins Claude Code (context-mode, i-have-adhd) à installer en portée utilisateur ; trouver le lien de « savemytokens ».

- [ ] **Supabase injoignable** (le domaine ne se résout plus : projet en pause ou supprimé) → 49 images
  de la base (surtout des avatars) ne s'affichent plus, y compris dans l'app actuelle. Réactiver le projet
  dans le tableau de bord Supabase, puis relancer la migration avec `--fetch-remote` pour les copier en local.

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
- [ ] Envoi de vraies photos depuis l'appareil (nécessite le stockage Supabase réactivé)
- [ ] Déploiement Netlify de la v2 (2e site)

## Liste du 2026-11-08 (en cours — reprendre ici)

Fait : Mail au lieu de Gmail sur iPhone (migration) ; bouton retour unique `BarBack` (iOS en flèche
teintée / Android « Up ») branché sur Instagram, Snapchat, GroupMe, Plans, Musique, Personal (Grindr…VPN),
Pinterest, Tumblr, Twitter.

Reste :
- [ ] Bouton retour : vérifier visuellement + restes (Kik/Vine, YouTube, Messenger, Passbook, Boussole)
- [ ] Icônes Android toutes carrées (`.os-android .icon .tile img` a encore un border-radius)
- [ ] ask.fm, ESPN, Polyvore ne sont pas des jeux → vraies apps (comme Kik/Vine)
- [ ] Passbook : clic sur les cartes buggé
- [ ] Tout doit être éditable par le joueur (ex. horloges mondiales : modifier / ajouter)
- [ ] Rayures « d'occasion » sur le téléphone d'Elias (perdues dans la v2 : chassisPng `__iphone4__`)
- [ ] Musique : mini-lecteur sur la liste des chansons ; lecture réelle via Deezer (extraits)
- [ ] SoundCloud et iNaturalist beaucoup plus réalistes
- [ ] Connexion par identifiant au lieu d'e-mail
- [ ] Accueil : garder l'aperçu des 4 téléphones ; espace admin (date de lore, etc.)
- [ ] Interface du site : toujours Y2K mais plus quali, inspiration MSN / Windows 7
- [ ] Onboarding animé façon unlokmi (ajouter du contenu, le consulter…)
- [ ] Appareil photo : courte vidéo par perso (fichiers à fournir)
- [ ] Ensuite : liste d'améliorations pour un téléphone aussi réaliste et personnalisable que possible
