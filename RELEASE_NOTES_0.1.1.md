# Forge 0.1.1 — Hardening & Cleanup

Version technique basée sur Forge 0.1 stable.

Objectif : renforcer le fond de l’application sans modifier les fonctionnalités visibles.

## Stabilité

- Démarrage serveur durci.
- Arrêt propre du serveur avec fermeture SQLite.
- Checkpoint WAL SQLite lors des suppressions globales et de l’arrêt.
- `busy_timeout` SQLite ajouté pour réduire les erreurs de verrouillage.
- `synchronous=NORMAL` en mode WAL pour garder un bon équilibre stabilité / rapidité.
- Healthcheck Docker ajouté.
- Script de validation interne ajouté.

## Sécurité

- `X-Powered-By` désactivé.
- En-têtes de sécurité renforcés.
- CSP conservée et durcie.
- Validation plus stricte des clés de stockage.
- Limite de taille par valeur stockée.
- Limite du nombre d’entrées dans une synchronisation bulk.
- Limiteur anti-spam accidentel sur les routes API.
- Erreurs API rendues plus propres, sans fuite de détails internes.
- `/api/health` ne renvoie plus le chemin physique de la base SQLite.

## Stockage / sauvegarde

- Route interne de maintenance `POST /api/maintenance/backup`.
- Sauvegarde SQLite propre via l’API de backup SQLite.
- Sauvegardes générées dans `data/backups/`.
- Aucun changement côté interface utilisateur.

## Docker / NAS

- `init: true` ajouté au compose.
- Healthcheck Docker ajouté.
- `stop_grace_period` ajouté.
- Variables d’environnement de hardening documentées.
- `.dockerignore` ajouté.
- Dockerfile durci pour le mode build : utilisateur non-root après installation.

## Nettoyage technique

- `package.json` passé en `0.1.1`.
- Script `npm run check` ajouté.
- Script `npm run healthcheck` ajouté.
- Documentation mise à jour.

## Important

Cette archive ne contient pas :

- `data/`
- `start-forge.bat`
- `stop-forge.bat`

Sur le NAS, conserver le dossier `data` existant, surtout `data/forge.db`.
