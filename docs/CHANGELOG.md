# Forge — Journal des versions

Fusion des anciens fichiers `RELEASE_NOTES_0.1*.md` (devenus redondants, supprimés) en un seul
historique. Les versions ci-dessous correspondent au champ `version` de `package.json`.

## 0.1.3 — Dimensionnement VM

Base : Forge 0.1.2. Objectif : ajouter une fonctionnalité indépendante des projets PM existants.

- Nouvelle page **Dimensionnement VM** (`public/vm-sizing.html`), accessible depuis un nouveau
  groupe de navigation "Infrastructure" présent sur toutes les pages.
- Permet de définir un ou plusieurs profils de serveur physique (sockets, cœurs, threads, RAM,
  stockage, ratios d'overcommit, réserves hyperviseur) et d'y ajouter des VM (vCPU, RAM, disque,
  quantité).
- Jauges CPU / RAM / Stockage en temps réel (OK / Attention / Critique).
- Simulateur rapide : estime combien de VM d'un gabarit donné peuvent encore tenir sur le serveur
  actif.
- Logique entièrement dans un nouveau fichier dédié `public/vm-sizing.js`, séparé de
  `public/script.js` pour ne pas toucher au code existant déjà validé (GANTT, WBS, RACI, capture).
- Réutilise le pont de stockage SQLite déjà en place : les clés `forge_vmsizing_*` passent par le
  même mécanisme `localStorage` → `/api/storage` que le reste de Forge (aucun changement backend).
- Fonctionnalité indépendante des projets PM (parties prenantes, WBS, RACI...) : les profils de
  serveur ne sont pas liés au "Projet actif" du sélecteur en haut de page.

## 0.1.2 — Code Review & Refactor

Base : Forge 0.1.1. Objectif : refactoriser et nettoyer le code sans changer les fonctionnalités
visibles. Le détail technique complet (répartition fichier par fichier, dette technique restante)
vit dans `CODE_REVIEW_REFACTOR_0.1.2.md`, dans ce même dossier.

- Backend refactorisé en modules `server/` (`app.js`, `config.js`, `database.js`, `routes.js`,
  `runtime.js`, `security.js`, `storage-validation.js`) ; `server.js` devient un point d'entrée léger.
- `public/script.js` volontairement **non** modularisé dans cette version — trop sensible (GANTT,
  WBS, RACI, capture, pont SQLite) pour un découpage brutal sans régression.
- Scripts ajoutés : `npm run check`, `npm run review`, `npm run healthcheck`.
- Correction douce : `/` reste explicitement routé vers `dashboard.html` plutôt que de laisser le
  serveur statique choisir `index.html` par défaut.

## 0.1.1 — Hardening & Cleanup

Base : Forge 0.1 stable. Objectif : renforcer le fond de l'application sans modifier les
fonctionnalités visibles.

**Stabilité** — démarrage serveur durci, arrêt propre avec fermeture SQLite, checkpoint WAL lors
des suppressions globales et de l'arrêt, `busy_timeout` SQLite, `synchronous=NORMAL` en mode WAL,
healthcheck Docker, script de validation interne.

**Sécurité** — `X-Powered-By` désactivé, en-têtes de sécurité renforcés, CSP durcie, validation
plus stricte des clés de stockage, limite de taille par valeur stockée, limite du nombre d'entrées
en synchronisation bulk, limiteur anti-spam sur les routes API, erreurs API sans fuite de détails
internes, `/api/health` ne renvoie plus le chemin physique de la base SQLite.

**Stockage / sauvegarde** — route interne `POST /api/maintenance/backup`, sauvegardes générées
dans `data/backups/`, aucun changement côté interface utilisateur.

**Docker / NAS** — `init: true` ajouté au compose, healthcheck Docker, `stop_grace_period`,
variables d'environnement de hardening documentées, `.dockerignore` ajouté, utilisateur non-root
après installation dans le Dockerfile.

## 0.1 — Version stable

Version validée comme base stable.

- Application Forge en mode Docker / NAS / SQLite, stockage persistant via SQLite.
- Accès compatible Tailscale / HTTPS.
- Nettoyeur localStorage caché dans l'aide.
- GANTT basé sur une grille scrollable stable, automatiquement alimenté par le WBS.
- Option week-ends prise en compte dans le GANTT, colonnes jour compactes.
- Capture PNG compatible avec le rendu GANTT.
- Thèmes disponibles : Cyber dark, Clair, Orange dusk, Executive report.

---

## Historique détaillé des correctifs GANTT (tags internes V70–V78)

Ces entrées, retrouvées dans `README_NAS_UGREEN_NOBUILD.md` et `SECURITY_REVIEW.md`, documentent
des correctifs et ajustements plus fins que les versions publiées ci-dessus, réalisés quelque part
entre les versions 0.1 et 0.1.3 (l'ordre ci-dessous suit la numérotation croissante des tags,
utilisée en interne dans les commentaires de `public/script.js` — leur rattachement exact à telle
ou telle version 0.1.x n'est pas certain, donc listés à part plutôt que d'inventer un rattachement).

- **V70 — Synchro WBS → GANTT en mode NAS/SQLite** : le pont SQLite n'écrase plus brutalement un
  WBS local plus récent ; ajout d'une synchronisation globale `/api/storage/bulk` ; synchronisation
  forcée avant changement de page interne et lors de la sauvegarde WBS ; utilisation de `keepalive`
  et `sendBeacon` pour limiter les pertes de synchro lors des navigations ; le GANTT relit
  désormais le WBS sauvegardé sans revenir sur une ancienne version SQLite.
- **V71 — Correctif GANTT + revue sécurité** : réparation du rendu GANTT depuis le WBS
  (`initGanttPage()` ne retransmettait plus les éléments HTML nécessaires à `renderGantt()`) ;
  ajout d'en-têtes HTTP de sécurité côté serveur ; authentification HTTP Basic optionnelle via
  variables d'environnement ; dépendances Node fixées sans version flottante ; durcissement Docker
  avec `no-new-privileges`. Détail complet dans `SECURITY_REVIEW.md`.
- **V72 — Présentation GANTT ajustée** : suppression de la colonne "Responsable" dans le GANTT,
  largeur récupérée pour la colonne "Tâche / Livrable", titres de colonnes centrés, textes de
  tâches plus lisibles sur plusieurs lignes.
- **V76 — GANTT en grille scrollable** : abandon du rendu tableau HTML pour le GANTT au profit
  d'une grille avec zone tâches fixe à gauche et frise des jours scrollable horizontalement à
  droite ; jours à largeur fixe ; ligne séparée pour le mois, le jour de semaine et la date.
- **V77 — GANTT week-ends, capture et compacité** : respect de l'option "Week-ends travaillés"
  (colonnes samedi/dimanche masquées si non travaillés) ; colonne "Tâche / Livrable" réduite
  d'environ un tiers ; capture PNG adaptée à la nouvelle grille GANTT.
- **V78 — Colonnes jour GANTT plus compactes** : réduction légère de la largeur des colonnes jour,
  barres de temps affinées, grille scrollable et lisibilité conservées.

> Note : le code de `public/script.js` continue d'utiliser ce système de tags "V" en commentaire
> pour chaque fonctionnalité ajoutée (bien au-delà de V78 aujourd'hui). Ce journal ne reprend que
> les tags qui avaient été explicitement documentés dans les anciens fichiers `.md` du dépôt — ce
> n'est pas une liste exhaustive de tout l'historique du projet.
