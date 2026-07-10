# Forge 0.1 — Version stable

Version validée comme base stable.

## Points inclus

- Application Forge en mode Docker / NAS / SQLite.
- Stockage persistant via SQLite.
- Accès compatible Tailscale / HTTPS.
- Nettoyeur localStorage caché dans l’aide.
- GANTT basé sur une grille scrollable stable.
- GANTT automatiquement alimenté par le WBS.
- Option week-ends prise en compte dans le GANTT.
- Colonnes jour compactes.
- Capture PNG compatible avec le rendu GANTT.
- Thèmes disponibles : Cyber dark, Clair, Orange dusk, Executive report.

## Important

Cette archive ne contient pas :
- `data/`
- `start-forge.bat`
- `stop-forge.bat`

Sur le NAS, conserver le dossier `data` existant, surtout `data/forge.db`.
