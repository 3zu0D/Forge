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

Historique des versions (0.1, 0.1.1, 0.1.2, 0.1.3...) : voir `docs/CHANGELOG.md`.
