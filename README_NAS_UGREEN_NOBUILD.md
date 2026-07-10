# Forge — NAS UGREEN sans build Dockerfile

Cette variante est prévue pour les NAS dont l'application Docker ne sait pas construire une image locale avec `Dockerfile` / `buildx`.

Elle n'utilise pas :

```yaml
build: .
```

Elle utilise directement l'image officielle :

```yaml
image: node:20-bookworm
```

## Installation sur le NAS

Copie le contenu de ce dossier dans un dossier du NAS, par exemple :

```text
/volume4/docker/forge
```

Le fichier `docker-compose.yml` doit être directement ici :

```text
/volume4/docker/forge/docker-compose.yml
```

Et non pas dans un sous-dossier.

Tu dois avoir :

```text
/volume4/docker/forge/docker-compose.yml
/volume4/docker/forge/server.js
/volume4/docker/forge/package.json
/volume4/docker/forge/public/
/volume4/docker/forge/data/
```

## Lancement avec l'application Docker UGREEN

Dans l'application Docker :

1. Crée un projet / compose.
2. Sélectionne le dossier `/volume4/docker/forge`.
3. Utilise le fichier `docker-compose.yml`.
4. Lance le projet.

Forge sera disponible sur :

```text
http://IP_DU_NAS:8080
```

Exemple :

```text
http://192.168.1.50:8080
```

## Base de données

La base SQLite reste dans :

```text
data/forge.db
```

Ne supprime pas le dossier `data`.

## Si le port 8080 est déjà utilisé

Dans `docker-compose.yml`, remplace :

```yaml
ports:
  - "8080:3000"
```

par exemple par :

```yaml
ports:
  - "8090:3000"
```

Puis Forge sera sur :

```text
http://IP_DU_NAS:8090
```

## Note

Au premier lancement, le conteneur exécute :

```bash
npm install --omit=dev
npm start
```

Les dépendances Node sont conservées dans un volume Docker nommé `forge_node_modules`.


## V70 - Correction synchro WBS vers GANTT en mode NAS/SQLite

Correctif :
- le pont SQLite n’écrase plus brutalement un WBS local plus récent,
- ajout d’une synchronisation globale `/api/storage/bulk`,
- synchronisation forcée avant changement de page interne,
- synchronisation forcée lors de la sauvegarde WBS,
- utilisation de `keepalive` et `sendBeacon` pour limiter les pertes de synchro lors des navigations,
- le GANTT relit maintenant le WBS sauvegardé sans revenir sur une ancienne version SQLite.


## V71 - Correctif GANTT + revue sécurité

Correctif :
- réparation du rendu GANTT depuis le WBS,
- `initGanttPage()` retransmet correctement les éléments HTML au moteur GANTT,
- ajout d’une revue sécurité dans `SECURITY_REVIEW.md`,
- ajout d’en-têtes HTTP de sécurité côté serveur,
- ajout d’une authentification HTTP Basic optionnelle via variables d’environnement,
- dépendances Node fixées sans version flottante,
- léger durcissement Docker avec `no-new-privileges`.


## V72 - Présentation GANTT ajustée

Amélioration :
- suppression de la colonne `Responsable` dans le GANTT,
- largeur récupérée pour la colonne `Tâche / Livrable`,
- titres des colonnes GANTT centrés,
- textes de tâches plus lisibles sur plusieurs lignes,
- conservation du lien automatique WBS → GANTT.


## V76 - GANTT en grille scrollable

Refonte :
- abandon du rendu tableau HTML pour le GANTT,
- nouvelle grille avec zone tâches fixe à gauche,
- frise des jours scrollable horizontalement à droite,
- jours à largeur fixe pour éviter toute compression,
- ligne séparée pour le mois, le jour de semaine et la date,
- lignes compactes et plus lisibles,
- cases planning carrées et stables.


## V77 - GANTT week-ends, capture et compacité

Amélioration :
- le GANTT respecte l’option `Week-ends travaillés`,
- si les week-ends ne sont pas travaillés, les colonnes samedi/dimanche sont masquées dans la frise,
- colonne `Tâche / Livrable` réduite d’environ un tiers pour laisser plus de place aux cases,
- lignes et cases rendues plus compactes,
- capture PNG adaptée à la nouvelle grille GANTT pour inclure les cases et les lignes.


## V78 - Colonnes jour GANTT plus compactes

Amélioration :
- réduction légère de la largeur des colonnes jour du GANTT,
- conservation de la grille scrollable,
- barres de temps légèrement affinées,
- lisibilité conservée sur les jours et dates.


## Forge 0.1

Cette archive est la version stable 0.1.

Pour mettre à jour le NAS :
1. conserver le dossier `data` déjà présent sur le NAS,
2. remplacer `public/`, `server.js`, `package.json`, `docker-compose.yml` et les fichiers de documentation,
3. redémarrer le projet Docker.


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
