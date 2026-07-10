# Forge - Version portable

Cette version de Forge reste une application web locale.

## Où sont les données ?

Les données sont toujours stockées dans le navigateur via localStorage.

## Comment transporter les données ?

1. Ouvre Forge.
2. Clique sur `Exporter`.
3. Un fichier JSON est téléchargé, par exemple `forge-data-2026-07-07.json`.
4. Copie le dossier de l'application Forge + ce fichier JSON sur un autre poste ou une clé USB.
5. Sur l'autre poste, ouvre Forge puis clique sur `Importer`.
6. Sélectionne le fichier JSON exporté.

## Important

Une page HTML ouverte directement dans un navigateur ne peut pas écrire automatiquement dans son propre dossier.
C'est une restriction normale de sécurité des navigateurs.

Pour une sauvegarde automatique dans un fichier du dossier de l'application, il faudra passer à une version avec un petit serveur local, par exemple Python Flask ou Node.js, et une vraie base SQLite ou un fichier JSON côté serveur.


## Export Excel

Le bouton `Excel XLSX` exporte le projet actif dans un vrai fichier `.xlsx`.

Le fichier contient plusieurs feuilles :
- Infos projet
- SWOT
- Parties Prenantes
- WBS
- RACI

Cette version génère un fichier Office Open XML `.xlsx` directement depuis le navigateur.
Elle inclut :
- en-têtes colorés,
- largeurs de colonnes réglées,
- filtres automatiques,
- première ligne figée,
- feuilles séparées,
- couleurs R/A/C/I dans le RACI.

Aucune connexion internet, aucun serveur et aucune librairie externe ne sont nécessaires.


## GANTT automatique

La page `GANTT` est générée automatiquement à partir du WBS.

Sources utilisées :
- dates de début et de fin du projet,
- phases WBS,
- tâches / livrables WBS,
- responsable,
- date début / date fin,
- ou jour début / durée / jour fin si les dates WBS ne sont pas remplies,
- avancement en pourcentage.

La frise s'agrandit automatiquement en fonction de la date de début et de la date de fin du projet.


## WBS automatisé

La page WBS inclut maintenant :
- un menu déroulant Responsable alimenté par les parties prenantes,
- une option `Week-ends travaillés`,
- un calcul automatique des dates début/fin.

Si les week-ends ne sont pas travaillés, Forge saute automatiquement les samedis et dimanches.
Les colonnes `Jour début`, `Durée (j)` et `Jour fin` sont interprétées comme des jours travaillés à partir de la date de début du projet.


## WBS séquentiel

Les colonnes `Jour début` et `Jour fin` sont maintenant calculées automatiquement.

Principe :
- la première ligne commence au jour 1,
- `Jour fin = Jour début + Durée - 1`,
- la ligne suivante commence automatiquement au jour suivant,
- si une durée change, toutes les lignes suivantes sont recalculées,
- les dates suivent la règle des week-ends travaillés ou non travaillés.


## V27 - Ergonomie WBS et GANTT

Améliorations :
- suppression du libellé `auto` dans les cases calculées du WBS,
- la touche Entrée ne crée plus de retour à la ligne dans les champs éditables,
- ajout de sous-onglets dans le GANTT pour consulter toutes les phases ou une phase spécifique.


## V28 - Polish visuel

Améliorations graphiques globales :
- meilleur contraste général,
- cartes et panneaux plus lisibles,
- navigation et boutons plus visibles,
- tableaux plus confortables,
- sous-couches et ombres renforçant le thème sombre,
- scrollbar et focus plus propres.


## V29 - Cyber Dark

Thème graphique plus futuriste :
- fond dark plus profond,
- accents cyan / violet,
- glow léger sur la navigation, les boutons et les cartes,
- ambiance cockpit / centre de contrôle,
- lisibilité conservée pour les tableaux et les pages de travail.


## V30 - KPIs et thèmes

Nouvelles fonctionnalités :
- page KPIs avec types de KPIs configurables,
- tableau KPIs prêt à remplir,
- responsables KPIs alimentés par les parties prenantes,
- écart KPI calculé automatiquement quand cible et actuel sont numériques,
- KPIs inclus dans l'export JSON et l'export Excel,
- sélecteur de thème global avec `Cyber dark` et `Clair`.


## V31 - Correctif démarrage

Correction :
- suppression des démarrages JavaScript trop tôt dans le fichier,
- démarrage unique de Forge à la toute fin du script,
- correction du bug qui empêchait les modifications après ajout des KPIs et du sélecteur de thème.


## V32 - Risques, KPIs compact, dropdowns lisibles

Améliorations :
- menus déroulants plus lisibles en thème sombre et clair,
- page KPIs déplacée après GANTT dans la navigation,
- tableau KPIs compact pour éviter le scroll horizontal,
- nouvelle page Analyse des risques juste après SWOT,
- types de risques configurables avec couleurs,
- criticité automatique : probabilité x gravité,
- risques inclus dans l'export/import JSON et Excel,
- légende RACI colorée pour mieux identifier R / A / C / I.


## V33 - Analyse des risques étoffée

Améliorations :
- colonne `Cause` renommée `Source`,
- colonne `Commentaire` renommée `Mitigation`,
- colonne `Statut` supprimée pour gagner de la place,
- ajout d'une matrice du risque sous les types de risques,
- export Excel mis à jour avec Source et Mitigation.


## V34 - Matrice du risque plus lisible

Améliorations :
- matrice du risque agrandie,
- scores plus visibles,
- affichage P × G dans chaque case,
- légende renforcée,
- explication de lecture sous la matrice.


## V35 - Matrice du risque avec axes

Améliorations :
- ajout d'axes probabilité et gravité avec repères 1 à 5,
- suppression du texte `P×G` dans les cases,
- affichage centré du score final uniquement,
- aide de lecture mise à jour.


## V36 - Correction axe Gravité

Améliorations :
- séparation du libellé `Gravité` et des repères chiffrés,
- chiffres 1 à 5 désormais visibles sur l'axe vertical,
- matrice réorganisée pour éviter les chevauchements.


## V37 - Gravité repositionnée proprement

Améliorations :
- `Gravité` placé comme en-tête de la colonne de gauche,
- chiffres 5 à 1 juste en dessous,
- suppression du chevauchement avec la matrice.


## V38 - Gravité verticale en colonne dédiée

Améliorations :
- `Gravité` écrit à la verticale,
- colonne dédiée pour le libellé,
- colonne séparée pour les repères 5 à 1,
- matrice décalée à droite pour éviter tout chevauchement.


## V39 - Matrice reconstruite

Améliorations :
- structure de matrice simplifiée,
- `Gravité` en colonne verticale dédiée,
- repères 5 à 1 dans une colonne séparée,
- zone matrice indépendante à droite.


## V40 - Fix final matrice du risque

Améliorations :
- neutralisation des anciens placements CSS qui poussaient la matrice vers le bas,
- réalignement propre de la colonne Gravité, des repères 5→1 et de la grille,
- conservation du libellé Gravité en vertical.


## V41 - SMART et KPIs liés

Nouvelles fonctionnalités :
- nouvelle page `SMART` avec tableau d'objectifs SMART,
- responsables SMART alimentés par les parties prenantes,
- statut et échéance pour chaque objectif,
- menu `Objectif lié` dans les KPIs, alimenté automatiquement par les objectifs SMART,
- colonne `Commentaire` retirée des KPIs,
- SMART inclus dans l'export/import JSON et dans l'export Excel.


## V42 - Matrice de compétences

Nouvelles fonctionnalités :
- nouvel onglet `Compétences` placé avant SWOT, donc premier menu de l'application,
- catégories de compétences personnalisables avec couleurs,
- une matrice générée automatiquement par catégorie,
- ajout / suppression de compétences dans chaque matrice,
- colonnes alimentées automatiquement par les parties prenantes,
- niveaux de compétence de 0 à 5,
- légende des niveaux,
- intégration dans l'export/import JSON,
- intégration dans l'export Excel XLSX.


## V43 - Contexte du projet et navigation séparée

Nouvelles fonctionnalités :
- nouvel onglet `Contexte`,
- sections rédactionnelles pour cadrer le projet avant les matrices,
- bouton pour copier le contexte en texte,
- navigation séparée en groupes : Rédactionnel, Matrices, Pilotage,
- intégration du contexte dans l'export/import JSON,
- intégration du contexte dans l'export Excel XLSX.


## V44 - Rédactionnel détaillé et objectifs liés au SMART

Nouvelles fonctionnalités :
- séparation du rédactionnel en onglets dédiés : Contexte, Objectifs, Enjeux, Périmètre, Contraintes, Hypothèses, Critères succès,
- chaque onglet rédactionnel fonctionne en lignes personnalisables `point + description`,
- Périmètre ajoute un type : Inclus, Hors périmètre, À clarifier,
- le Contexte est recentré sur résumé, origine et livrables attendus,
- les objectifs créés dans l’onglet Objectifs sont automatiquement disponibles dans SMART,
- SMART contient maintenant une colonne `Objectif lié`,
- export/import JSON mis à jour,
- export Excel XLSX mis à jour avec les nouveaux onglets.


## V45 - Périmètre séparé et menu amélioré

Améliorations :
- page `Périmètre` séparée en trois blocs visuels : Inclus, Hors périmètre, À clarifier,
- ajout et suppression directement dans chaque bloc,
- bouton pour copier le périmètre complet,
- menu principal amélioré visuellement,
- groupes de navigation plus lisibles tout en gardant tous les onglets visibles.


## V46 - Périmètre vertical rédactionnel

Amélioration :
- les blocs `Inclus`, `Hors périmètre` et `À clarifier` sont maintenant empilés verticalement,
- chaque partie prend toute la largeur,
- les cellules de rédaction ont plus d’espace pour écrire confortablement.


## V47 - Tableau de bord et contrôles de cohérence

Nouvelles fonctionnalités :
- nouvel onglet `Tableau de bord` dans un groupe `Vue globale`,
- indicateurs globaux : santé projet, contrôles, objectifs, avancement WBS, risques critiques, KPIs incomplets,
- panneau de contrôles de cohérence,
- détection des objectifs non liés au SMART,
- détection des SMART incomplets,
- détection des KPIs sans objectif SMART ou incomplets,
- détection des risques critiques sans mitigation,
- détection des tâches WBS incomplètes,
- statistiques de couverture du dossier projet.


## V48 - Correction thème clair GANTT et thème Orange dusk

Améliorations :
- correction du thème clair sur le GANTT : colonnes fixes, en-têtes, jours et textes redevenus lisibles,
- ajout d’un troisième thème `Orange dusk`,
- prise en charge du thème orange dans le sélecteur, la sauvegarde locale et l’export/import JSON.


## V49 - Dashboard visuel et dates projet dans WBS

Améliorations :
- tableau de bord rendu plus visuel,
- ajout de jauges circulaires : santé projet, couverture dossier, avancement WBS, complétude KPIs,
- meilleure organisation des statistiques rapides,
- contrôles de cohérence plus lisibles,
- retrait des dates de début et de fin de la barre supérieure,
- dates de début et de fin déplacées dans l’onglet WBS.


## V50 - Polish global UI

Passe de vérification et de correction visuelle :
- audit global HTML/CSS/JS,
- correction générale des centrages et alignements,
- harmonisation de la barre supérieure après le déplacement des dates projet,
- amélioration du menu principal,
- meilleure lisibilité des tableaux, champs, textes éditables et états vides,
- amélioration du tableau de bord visuel,
- renforcement des contrastes sur les thèmes Clair et Orange dusk,
- stabilisation visuelle du GANTT et des tableaux larges.


## V51 - Boutons + / -

Améliorations :
- remplacement des boutons `Ajouter` par des boutons `+`,
- remplacement des boutons `Supprimer` par des boutons `-`,
- conservation des libellés en infobulle et aria-label,
- harmonisation visuelle des boutons d’action sur les thèmes Cyber, Clair et Orange dusk.


## V52 - Capture propre des blocs

Fonctionnalité de test :
- ajout d’un bouton `📸` sur les cartes principales,
- capture du bloc concerné en image PNG,
- retrait automatique des boutons, actions et cases de sélection dans la capture,
- conversion des champs et menus déroulants en texte propre,
- copie directe dans le presse-papiers quand le navigateur l’autorise,
- téléchargement PNG automatique si la copie presse-papiers est bloquée.


## V53 - Capture robuste avec fallback canvas

Correctif :
- la capture tente toujours la méthode visuelle DOM quand elle est autorisée,
- si le navigateur bloque cette méthode, Forge bascule automatiquement sur un rendu canvas interne,
- le fallback canvas génère une image propre avec titre, projet, page, date, tableaux et textes,
- les boutons, cases de sélection et actions ne sont pas inclus,
- la copie presse-papiers est tentée, puis un PNG est téléchargé si le navigateur bloque la copie.


## V54 - Capture visuelle améliorée

Amélioration :
- ajout d’un moteur de capture visuelle réelle via html2canvas,
- conservation beaucoup plus fidèle des couleurs, fonds, tableaux, jauges et espacements,
- suppression des boutons, actions et cases de sélection uniquement au moment de la capture,
- fallback DOM/SVG puis canvas manuel si le navigateur bloque la capture visuelle,
- si la copie presse-papiers est bloquée, téléchargement PNG automatique.
Note : la capture fidèle utilise html2canvas depuis CDN ; si l’application est utilisée totalement hors ligne, Forge garde les anciens fallbacks.


## V55 - Capture HD

Amélioration :
- capture visuelle plus nette avec une résolution interne plus élevée,
- échelle de capture intelligente selon la taille du bloc,
- meilleur rendu du texte dans les captures,
- amélioration de la netteté des jauges, barres et éléments visuels,
- les fichiers PNG téléchargés portent le suffixe `-hd`.


## V56 - Captures arrondies, thème clair vivifié et alignement des colonnes

Améliorations :
- conservation des coins arrondis dans les PNG de capture,
- fond transparent autour des captures pour éviter les coins carrés,
- couleurs des tableaux plus vives en thème Clair,
- en-têtes de colonnes alignés avec le contenu au lieu d’être centrés partout,
- conservation du centrage sur les colonnes de sélection et numéros.


## V57 - Menu structuré, tableaux plus lisibles et dates WBS corrigées

Améliorations :
- menu principal restructuré en blocs par section au lieu d’une longue ligne,
- titres de colonnes agrandis sur tous les tableaux,
- alignement conservé entre les titres de colonnes et leur contenu,
- dates de début et de fin du projet uniformisées dans le WBS,
- captures conservant aussi les titres de tableaux plus visibles.


## V58 - Correctif capture SWOT

Amélioration :
- correction du rendu des éléments SWOT dans les captures,
- évite l’écrasement du texte lettre par lettre,
- conserve une largeur correcte pour chaque carte SWOT au moment de la capture.


## V59 - Thème Executive report

Nouveau thème :
- ajout du thème `Executive report`,
- style très professionnel pour rapports, captures et comités projet,
- palette sobre : bleu marine, gris clair, blanc, bordures fines,
- tableaux plus sérieux et lisibles,
- dashboard et SWOT adaptés à un rendu rapport,
- thème pris en charge dans le sélecteur, la sauvegarde locale et l’export/import JSON.


## V60 - Correctif affichage RACI

Correctif :
- les colonnes des parties prenantes dans le RACI ne sont plus compressées dans l’application,
- les noms restent lisibles au lieu de se couper lettre par lettre,
- le tableau utilise un scroll horizontal quand il manque de place,
- la capture conserve son comportement propre.


## V61 - RACI structuré par phases

Amélioration :
- le RACI est maintenant séparé par phases,
- chaque phase apparaît comme une vraie ligne de séparation,
- les tâches/livrables sont listés sous leur phase,
- les tâches sans phase sont regroupées dans `Sans phase / à classer`,
- les phases sans tâche ne sont pas affichées pour garder le tableau lisible.


## V62 - Correction persistance menus déroulants

Correctif :
- sécurisation du menu déroulant `Phase` dans le WBS,
- sauvegarde plus robuste des changements de phase par identifiant de ligne WBS,
- le RACI recharge les phases et lignes WBS les plus récentes au moment de l’affichage,
- ajout d’un filet de sécurité pour éviter qu’une phase affichée comme changée ne soit pas écrite en stockage local,
- vérification syntaxique JavaScript OK.


## V63 - Correctif dur phases WBS vers RACI/GANTT

Correctif :
- ajout d’un stockage indépendant des affectations de phase par ligne WBS,
- le changement de phase est maintenant sauvegardé immédiatement sur input/change/blur,
- les lignes WBS sont normalisées par identifiant stable,
- le RACI lit explicitement les affectations de phase les plus récentes,
- le GANTT recharge aussi les lignes WBS corrigées,
- correction prévue pour les cas où un recalcul ou un re-rendu écrasait indirectement la phase affichée.


## V64 - Correctif boutons Réinitialiser WBS

Correctif :
- réparation du bouton `Réinitialiser` des phases WBS,
- réparation du bouton `Réinitialiser` des lignes WBS,
- suppression correcte du stockage interne des affectations de phases lors d’une réinitialisation,
- resynchronisation des phases WBS pour que le RACI et le GANTT repartent sur un état propre,
- sécurisation de la suppression des phases et des lignes WBS avec le nouveau stockage interne.


## V65 - Réécriture propre du WBS

Correctif propre :
- retrait des couches de correction V62/V63/V64 dans le JavaScript,
- réécriture propre de la logique WBS,
- les phases sont sauvegardées directement dans les lignes WBS,
- suppression du stockage séparé des affectations de phases,
- migration automatique de l’ancien stockage séparé si présent,
- réparation propre des boutons `Réinitialiser les phases` et `Réinitialiser le WBS`,
- RACI et GANTT relisent le WBS sauvegardé proprement.


## V66 - Nettoyeur localStorage caché dans l’aide

Ajout :
- ajout d’un nettoyeur du stockage local Forge,
- le bouton est caché dans la fenêtre d’aide,
- accès : ouvrir l’aide `?`, puis cliquer 5 fois sur le titre `Aide`,
- raccourci possible depuis l’aide ouverte : `Ctrl + Shift + K`,
- le nettoyage supprime les clés Forge du localStorage, avec double confirmation,
- l’application se recharge automatiquement après nettoyage.


## V67 - Données de départ vides

Nettoyage :
- suppression des parties prenantes d’exemple,
- suppression des phases d’exemple,
- suppression des lignes WBS d’exemple,
- suppression des éléments SWOT d’exemple,
- suppression des catégories de compétences d’exemple,
- les boutons de réinitialisation repartent maintenant sur une base vide plutôt que sur des exemples préremplis.


## V68 - Mode Docker + SQLite

Ajout :
- structure Docker complète,
- backend local Node.js/Express,
- base SQLite persistante dans `data/forge.db`,
- pont de synchronisation entre l’interface Forge et SQLite,
- lancement via `docker compose up --build` ou `start-forge.bat`,
- accès à l’application via `http://localhost:8080`,
- le nettoyeur caché vide aussi SQLite quand l’application tourne en mode Docker.


## V69 - NAS UGREEN sans build Dockerfile

Ajout :
- variante `docker-compose.yml` sans `build: .`,
- utilisation directe de l’image `node:20-bookworm`,
- contournement de l’erreur NAS `Docker Compose requires buildx plugin`,
- contournement de l’erreur `Dockerfile: no such file or directory`,
- conservation des données dans `data/forge.db`,
- ajout du guide `README_NAS_UGREEN_NOBUILD.md`.


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


## Forge 0.1 - Version stable

Cette version est figée comme base stable :
- Docker / NAS / SQLite opérationnel,
- GANTT grille scrollable compact validé,
- WBS vers GANTT automatique,
- week-ends pris en compte,
- captures PNG fonctionnelles,
- archive livrée sans `data/`, sans `start-forge.bat`, sans `stop-forge.bat`.


## Forge 0.1.1 - Hardening & Cleanup

Version technique sans changement fonctionnel visible :
- serveur durci,
- stockage SQLite plus robuste,
- healthcheck Docker,
- validations API renforcées,
- capture/GANTT et fonctionnalités de Forge 0.1 conservées.


## Forge 0.1.2 - Code Review & Refactor

Version technique sans changement fonctionnel visible :
- backend refactorisé en modules,
- scripts de contrôle renforcés,
- frontend validé conservé pour éviter les régressions.
