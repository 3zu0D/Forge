# Forge — Mode Docker + SQLite

Cette version lance Forge comme une application locale via Docker.

## Lancement

Double-clique sur :

```bat
start-forge.bat
```

Ou lance manuellement :

```bat
docker compose up --build
```

Puis ouvre :

```text
http://localhost:8080
```

## Arrêt

Double-clique sur :

```bat
stop-forge.bat
```

Ou lance :

```bat
docker compose down
```

## Stockage

Les données Forge sont stockées dans :

```text
data/forge.db
```

Ce fichier reste sur ton PC grâce au volume Docker :

```yaml
./data:/app/data
```

Tu peux sauvegarder le dossier `data` pour conserver ta base.

## Nettoyage

Le nettoyeur caché reste disponible dans l’aide :

1. Ouvre le bouton `?`
2. Clique 5 fois sur le titre `Aide`
3. Clique sur le bouton de nettoyage

En mode Docker, ce nettoyage vide aussi la base SQLite.


## V71 - Correctif GANTT + revue sécurité

Correctif :
- réparation du rendu GANTT depuis le WBS,
- `initGanttPage()` retransmet correctement les éléments HTML au moteur GANTT,
- ajout d’une revue sécurité dans `SECURITY_REVIEW.md`,
- ajout d’en-têtes HTTP de sécurité côté serveur,
- ajout d’une authentification HTTP Basic optionnelle via variables d’environnement,
- dépendances Node fixées sans version flottante,
- léger durcissement Docker avec `no-new-privileges`.


## Forge 0.1.1 — Hardening & Cleanup

Cette version ne change pas les fonctionnalités visibles. Elle renforce le fond de l’application.

Points principaux :
- serveur Express durci,
- validation API plus stricte,
- healthcheck Docker,
- arrêt propre avec fermeture SQLite,
- checkpoint WAL,
- route interne de backup SQLite : `POST /api/maintenance/backup`,
- scripts de contrôle : `npm run check` et `npm run healthcheck`,
- Dockerfile et Compose renforcés,
- archive toujours livrée sans `data/`, sans `start-forge.bat`, sans `stop-forge.bat`.

Pour mettre à jour le NAS :
1. garder le dossier `data` existant,
2. remplacer les fichiers de l’application,
3. redémarrer le conteneur Forge.


## Forge 0.1.2 — Code Review & Refactor

Cette version ne change pas les fonctionnalités visibles. Elle refactorise le backend pour rendre Forge plus maintenable.

Points principaux :
- `server.js` allégé,
- backend découpé dans `server/`,
- validations techniques renforcées,
- script de review ajouté avec `npm run review`,
- script de contrôle complet avec `npm run check`,
- frontend conservé tel quel pour éviter les régressions sur les écrans validés.

Pour mettre à jour le NAS :
1. conserver le dossier `data` déjà présent,
2. remplacer les fichiers de l’application,
3. redémarrer le conteneur Forge.
