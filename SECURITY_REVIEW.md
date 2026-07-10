# Forge — Revue globale sécurité V71

## Synthèse

Forge tourne maintenant comme une application locale auto-hébergée sur NAS : frontend statique, backend Node.js/Express, stockage SQLite dans `data/forge.db`, accès distant recommandé via Tailscale Serve en HTTPS.

La revue V71 a ciblé deux points :

1. Corriger le lien WBS → GANTT.
2. Durcir l'exposition NAS/Docker sans compliquer l'usage actuel.

## Correctif fonctionnel critique

### GANTT qui ne se mettait plus à jour

Cause trouvée : une surcharge récente de `initGanttPage()` appelait `renderGantt()` sans lui transmettre les éléments HTML nécessaires (`ganttHead`, `ganttBody`, `ganttSummary`).

Correction V71 :

```js
function initGanttPage() {
    const ganttHead = document.getElementById("gantt-table-head");
    const ganttBody = document.getElementById("gantt-table-body");
    const ganttSummary = document.getElementById("gantt-summary");

    if (!ganttHead || !ganttBody) return;

    phases = loadPhases();
    wbsRows = loadWbsRows();

    renderGantt(ganttHead, ganttBody, ganttSummary);
}
```

Résultat attendu : le GANTT relit à nouveau les données WBS et affiche les changements.

## Durcissements appliqués

### 1. En-têtes HTTP de sécurité

Ajout côté `server.js` :

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy` restrictive
- `Content-Security-Policy` adaptée à Forge

Objectif : limiter les risques d'injection, d'intégration dans une iframe, de fuite de referrer, et de permissions navigateur inutiles.

### 2. Authentification optionnelle

Ajout d'une authentification HTTP Basic optionnelle.

Par défaut elle est désactivée pour ne pas casser ton accès actuel via Tailscale.

Pour l'activer dans `docker-compose.yml`, ajoute ou décommente :

```yaml
environment:
  FORGE_AUTH_USER: forge
  FORGE_AUTH_PASSWORD: change-moi
```

Puis redémarre le conteneur.

### 3. Dépendances Node plus prévisibles

Les dépendances dans `package.json` sont maintenant fixées sans `^` :

```json
"express": "4.21.2",
"better-sqlite3": "11.9.1"
```

Objectif : éviter qu'une mise à jour automatique change le comportement de Forge sans que tu le voies.

### 4. Docker Compose légèrement durci

Ajout :

```yaml
security_opt:
  - no-new-privileges:true
```

Objectif : empêcher une élévation de privilèges dans le conteneur.

## Points de vigilance restants

### 1. Pas d'accès public direct

Forge ne doit pas être exposé directement sur Internet par redirection de port box/NAS.

Recommandé :

- Tailscale Serve en HTTPS
- ou VPN privé
- ou reverse proxy HTTPS avec vraie authentification

### 2. Base SQLite

Le fichier important est :

```text
data/forge.db
```

Sauvegarde ce dossier régulièrement.

### 3. CDN html2canvas

Forge charge encore `html2canvas` depuis `cdn.jsdelivr.net`. C'est pratique, mais c'est une dépendance externe.

Amélioration future possible : embarquer `html2canvas.min.js` localement dans `public/vendor/` pour un fonctionnement plus autonome et plus maîtrisé.

### 4. Authentification

Tailscale protège déjà l'accès réseau, mais si plusieurs personnes ont accès à ton tailnet, l'authentification Basic optionnelle peut être utile.

## Recommandation d'exploitation

Pour ton NAS :

1. Utilise Tailscale Serve en HTTPS.
2. N'ouvre pas Forge directement sur Internet.
3. Sauvegarde régulièrement `data/forge.db`.
4. Active `FORGE_AUTH_USER` / `FORGE_AUTH_PASSWORD` seulement si tu veux une couche de mot de passe en plus.



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
