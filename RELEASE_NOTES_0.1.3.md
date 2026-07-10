# Forge 0.1.3 — Dimensionnement VM

Version basée sur Forge 0.1.2.

Objectif : ajouter une nouvelle fonctionnalité, indépendante des projets PM existants.

## Nouveauté

- Nouvelle page **Dimensionnement VM** (`public/vm-sizing.html`), accessible depuis un nouveau
  groupe de navigation "Infrastructure" présent sur toutes les pages.
- Permet de définir un ou plusieurs profils de serveur physique (sockets, cœurs, threads, RAM,
  stockage, ratios d'overcommit, réserves hyperviseur) et d'y ajouter des VM (vCPU, RAM, disque,
  quantité).
- Jauges CPU / RAM / Stockage en temps réel (OK / Attention / Critique).
- Simulateur rapide : estime combien de VM d'un gabarit donné peuvent encore tenir sur le serveur
  actif.

## Implémentation

- Logique entièrement dans un nouveau fichier dédié `public/vm-sizing.js`, séparé de
  `public/script.js` pour ne pas toucher au code existant déjà validé (GANTT, WBS, RACI, capture).
- Réutilise le pont de stockage SQLite déjà en place : les clés `forge_vmsizing_*` passent par le
  même mécanisme `localStorage` → `/api/storage` que le reste de Forge (aucun changement backend).
- `public/script.js` : une seule ligne ajoutée dans `bootstrapForgeAsync()` pour appeler
  `initVmSizingPage()` quand `currentPage === "vmsizing"`.
- `public/style.css` : nouveau bloc de classes `.vmsizing-*` ajouté en fin de fichier, sans
  modification des styles existants.
- Les 17 pages HTML existantes ont reçu le nouveau lien de navigation "Dimensionnement VM"
  (groupe "Infrastructure"), sans autre changement.

## Important

Cette fonctionnalité est indépendante des projets PM (parties prenantes, WBS, RACI...) : les
profils de serveur ne sont pas liés au "Projet actif" du sélecteur en haut de page.
