# Modèle de données v2

> Phase 1 de la refonte. Objectif : **plus aucune perte ni écrasement de données**, chaque joueur
> édite **son** téléphone, coût **zéro**.

## Choix du backend : Firebase (offre gratuite Spark), projet séparé

| | Firebase Spark | Supabase Free |
|---|---|---|
| Coût | 0 € | 0 € |
| Mise en pause si inactif | non | oui (7 jours) |
| Comptes joueurs | Firebase Auth, gratuit | oui |
| Droits « un joueur = son téléphone » | règles RTDB par chemin | RLS SQL |
| Migration depuis l'existant | même techno | changement complet |

→ **On reste sur Firebase Realtime Database**, mais **dans un nouveau projet Firebase** (gratuit),
pour que l'ancienne app — qui écoute toute la racine — ne télécharge pas la v2 pendant la
transition. Les images restent sur Supabase Storage (gratuit, 1 Go) et `/assets/seed`.

## Les 3 règles qui suppriment les écrasements

1. **Jamais de tableau pour une liste éditable.** Toute liste (messages, notes, photos, posts…)
   devient une **map indexée par identifiant stable** : `notes/n_8f3a…/body`. Insérer, supprimer
   ou réordonner ne décale plus rien. L'ordre vient d'un champ `order` (nombre, on insère *entre*
   deux valeurs) ou de l'heure lore (`ts`).
   Exception : les petites listes de chaînes à un seul auteur (`apps`, `dock`, tags) restent des
   tableaux, réécrits d'un bloc.
2. **Une écriture = un champ.** Le client n'envoie que `chemin → valeur` du champ modifié, jamais
   un objet reconstruit depuis l'écran.
3. **L'abonnement est ciblé.** Le client écoute seulement le téléphone ouvert et les fils où il
   est membre, pas toute la base.

## Arborescence

```
meta/                         schemaVersion, loreDate, migratedAt, sourceSeedVersion
users/{uid}                   { phone: "glinda", role: "player" | "mj" }
phones/{pid}/
  profile                     name, username, os, avatar, wallpaper, accentColor, bio…
  home                        { apps: [..], dock: [..] }
  inbox/{threadId}            { contact, unread, isGroup, order, … }   (vue « Messages » du tel)
  data/{section}              toutes les autres apps (notes, gallery, music, calls, grindr…),
                              listes converties en maps { id: { …, order } }
threads/{threadId}            { kind: "pair" | "group" | "local", members: {pid:true}, name?, contact? }
threadMessages/{threadId}/{msgId}
                              { from: pid | "npc", npcName?, text, time, ts, order }
feeds/{feed}/{id}             posts partagés (tweets, tumblr, facebook, insta…), champ author
shared/{name}                 données partagées non-listes (follows, avatars, icônes Android)
legacy/{key}                  toute clé racine inconnue (jamais supprimée en silence)
```

- `pid` ∈ `glinda`, `eoghan`, `drew`, `elias`.
- Fil 1-à-1 entre persos : `kind: "pair"`, `members` = les deux. Les lettres `a`/`b` de la v1
  sont converties en `pid`.
- Conversation avec un PNJ : `kind: "local"`, un seul membre, `from: "npc"`.
- Les copies parasites des fils partagés dans un perso (`{pid}/sharedThreads`) sont **ignorées**. Si une
  copie contient des messages absents de la version principale, la migration les **signale**.

## Droits (voir `database.rules.v2.json`)

- Lecture : tout utilisateur connecté.
- `phones/{pid}` : écriture par le joueur de ce téléphone (ou le MJ).
- `threads` / `threadMessages` : écriture par les membres du fil.
- `feeds/{feed}/{id}` : création par n'importe quel joueur, modification par l'auteur.
- Suppressions : on marque `deleted: true` (corbeille). La suppression définitive reste réservée au MJ.

## Historique

Chaque écriture client ajoute aussi une entrée `history/{pid}/{autoId}` = `{path, before, after,
at, uid}`. On peut donc annuler élément par élément et revenir en arrière sans limite de temps.
C'est complété par la sauvegarde quotidienne GitHub Actions.

## Migration

`node migration/migrate-v1-to-v2.mjs <export-v1.json> <sortie-v2.json>`

- Fonction pure : aucune écriture en base, l'import se fait à part, une fois validé.
- Un rapport donne les comptes par section, les avertissements, et une **vérification de
  conservation** : chaque texte de la v1 doit se retrouver dans la v2.
- Sans argument, le script tourne sur les données seed (`mkData`) en guise d'autotest.
