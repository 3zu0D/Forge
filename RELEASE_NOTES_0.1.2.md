# Forge 0.1.2 — Code Review & Refactor

Version basée sur Forge 0.1.1.

Objectif : refactoriser et nettoyer le code sans changer les fonctionnalités visibles.

## Changements principaux

- Refactorisation du backend en modules `server/`.
- `server.js` devient un point d’entrée léger.
- Configuration isolée dans `server/config.js`.
- Accès SQLite isolé dans `server/database.js`.
- Sécurité isolée dans `server/security.js`.
- Routes API isolées dans `server/routes.js`.
- Validation stockage isolée dans `server/storage-validation.js`.
- Démarrage et arrêt propre isolés dans `server/runtime.js`.
- Validation technique renforcée.
- Script de review statique ajouté.

## Frontend

Le fichier `public/script.js` est volontairement conservé dans son état fonctionnel validé.

Raison :
le frontend concentre les comportements sensibles déjà validés : GANTT, WBS, RACI, capture, SQLite bridge. Une modularisation frontale brutale pourrait introduire des régressions. Elle devra être faite par étapes dans une version dédiée.

## Scripts

- `npm run check`
- `npm run review`
- `npm run healthcheck`

## Important

Cette archive ne contient pas :

- `data/`
- `start-forge.bat`
- `stop-forge.bat`


## Correction douce

- Correction douce : `/` est explicitement laissé au routeur Forge afin de continuer à ouvrir `dashboard.html` au lieu de laisser le serveur statique choisir automatiquement `index.html`.
