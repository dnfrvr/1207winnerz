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

## À vérifier dans les données

- [ ] Copie ancienne du fil Glinda ↔ Eoghan (rangée dans `legacy/charCopies/drew_sharedThreads`) :
  12 messages absents du fil principal.
- [ ] Fil Glinda ↔ Eoghan : 1er message « je sais plus ton prénoZZZm » → modification accidentelle ?
- [ ] Conv « xX WiiNNERS Xx » de Glinda : 26 messages locaux en double (gardés dans `legacyLocalThread`).

## Dev

- [x] Socle v2, Notes, Messages, animations, connexion
- [ ] Coquille Android (Drew)
- [ ] Portage des autres apps
- [ ] Optimisation des images (fonds d'écran de plusieurs Mo)
- [ ] Déploiement Netlify de la v2 (2e site)
