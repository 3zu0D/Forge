# Forge 0.1.2 — Code Review & Refactor

Version basée sur Forge 0.1.1.

Objectif : améliorer la maintenabilité du code sans modifier les fonctionnalités visibles de l’application.

## Synthèse

La 0.1.2 fait une refactorisation prudente :
- le backend Node/Express est séparé en modules spécialisés,
- le point d’entrée `server.js` devient léger,
- les scripts de contrôle sont renforcés,
- un script de review statique est ajouté,
- la grosse partie frontend `public/script.js` est volontairement conservée telle quelle pour éviter une régression visuelle ou fonctionnelle.

## Backend refactorisé

Nouveaux fichiers :

- `server/app.js`
- `server/config.js`
- `server/database.js`
- `server/routes.js`
- `server/runtime.js`
- `server/security.js`
- `server/storage-validation.js`

Répartition :
- `server/config.js` : configuration, chemins, variables d’environnement.
- `server/database.js` : SQLite, WAL, backup, stockage.
- `server/security.js` : headers, Basic Auth, rate limiter.
- `server/storage-validation.js` : validation des clés et valeurs de stockage.
- `server/routes.js` : routes API.
- `server/app.js` : assemblage Express + statique.
- `server/runtime.js` : démarrage, timeouts, arrêt propre.

## Frontend

`public/script.js` contient encore :
- 564,521 caractères,
- 476 déclarations de fonctions,
- 66 noms de fonctions dupliqués liés à l’historique des overrides,
- 1 appel final `forgeBootstrap();`.

Décision de review :
le frontend n’a pas été découpé brutalement en modules dans cette version, car c’est le morceau le plus sensible de Forge. Les dernières corrections GANTT, WBS, SQLite bridge et capture reposent sur l’ordre d’exécution historique. Le découpage frontend doit être fait progressivement dans une version dédiée, avec tests plus fins.

## Contrôles ajoutés

- `npm run check`
- `npm run review`
- `npm run healthcheck`
- `scripts/check-server-modules.js`
- `scripts/code-review.js`
- `scripts/validate-forge.js` renforcé

## Non-régression visée

La 0.1.2 ne change pas volontairement :
- le GANTT,
- le WBS,
- le RACI,
- les captures,
- les thèmes,
- l’import/export,
- la synchronisation SQLite/localStorage,
- l’interface utilisateur.

## Dette technique restante

Priorité future recommandée :
1. découper progressivement `public/script.js`,
2. créer une vraie couche frontend de stockage unique,
3. supprimer les anciens overrides seulement après tests automatisés,
4. extraire les modules WBS/GANTT/RACI un par un,
5. créer un jeu de données de test Forge pour valider les écrans critiques.

## Résultat

Forge 0.1.2 est une version de nettoyage/refactor prudente. Elle rend surtout le backend plus clair, plus testable et plus maintenable, sans prendre le risque de casser le frontend validé en 0.1.


## Correction douce

- Correction douce : `/` est explicitement laissé au routeur Forge afin de continuer à ouvrir `dashboard.html` au lieu de laisser le serveur statique choisir automatiquement `index.html`.
