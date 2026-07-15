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

Historique des versions (0.1, 0.1.1, 0.1.2, 0.1.3...) et des correctifs GANTT (tags V70–V78) :
voir `docs/CHANGELOG.md`.
