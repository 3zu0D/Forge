/* Garde-fou pour le bug de capture Gantt : quand une phase a beaucoup de tâches,
   la grille (.gantt-v76-board/.gantt-v77-board) a un scroll vertical borné
   (max-height + overflow-y:auto), et la frise des jours (.gantt-v76-timeline-scroll)
   un scroll horizontal. Avant le fix, prepareCardForExactCapture() ne réinitialisait
   pas ces conteneurs, et le palier de secours (renderElementToPngBlob) clonait la
   carte APRÈS que le palier principal ait déjà annulé son propre reset dans son
   `finally` — donc si html2canvas échouait, la capture de secours restait tronquée
   à la zone visible à l'écran.

   Un 2e bug, distinct, ne se voyait qu'à l'horizontale : même une fois le scroll
   de .gantt-v76-timeline-scroll débridé, la grille (.gantt-v77-board) grandit bien
   via la règle CSS .capture-exact-mode (grid-template-columns → max-content), mais
   ses ANCÊTRES (.gantt-wrapper, la carte) ne suivent pas — un élément bloc ne
   s'élargit pas juste parce qu'un enfant déborde. Comme html2canvas dimensionne le
   canvas de sortie sur la boîte de l'élément capturé (la carte) et non sur son
   contenu débordant, la capture restait coupée à l'ancienne largeur de la carte.
   Le fix élargit explicitement card.style.width à card.scrollWidth pendant la
   capture (mesure fiable une fois la grille déjà élargie par la règle CSS).

   Un test bout en bout avec une vraie capture (59 tâches + html2canvas + CDN +
   presse-papiers) a été vérifié manuellement en session, image inspectée
   visuellement (frise JANV/FÉVR/MARS 2026 entière visible, 59 lignes jusqu'au
   26/03/2026). Ici on vérifie juste, plus vite et de façon fiable, que le
   mécanisme de reset couvre bien les bons conteneurs, élargit/restaure la carte,
   et reste actif pendant toute la tentative de capture (pas seulement le 1er
   palier). */

const { gotoPage } = require("./helpers");

module.exports = async function ({ page, baseUrl, assert }) {
    await gotoPage(page, baseUrl, "gantt.html", "#gantt-wrapper");

    const result = await page.evaluate(() => {
        // Carte de test synthétique reproduisant la structure d'un board Gantt
        // borné en hauteur ET en largeur, comme quand une phase a beaucoup de
        // tâches et une frise de jours large (le contenu de largeur 3000px force
        // le débordement horizontal une fois que .gantt-v77-board grandit).
        const card = document.createElement("div");
        card.className = "card";
        card.style.width = "500px";
        card.innerHTML = `
            <div class="card-header"><h2>Test</h2></div>
            <div class="gantt-v76-board gantt-v77-board" style="max-height: 300px; overflow-y: auto;">
                <div class="gantt-v76-timeline-scroll" style="overflow-x: auto;">
                    <div style="width: 3000px; height: 10px;"></div>
                </div>
            </div>
        `;
        document.body.appendChild(card);

        const board = card.querySelector(".gantt-v76-board");
        const timelineScroll = card.querySelector(".gantt-v76-timeline-scroll");

        const before = {
            hasExactModeClass: card.classList.contains("capture-exact-mode"),
            boardMaxHeight: getComputedStyle(board).maxHeight,
            cardWidth: card.getBoundingClientRect().width
        };

        // Reproduit exactement ce que fait captureCardToClipboard : un seul
        // prepare/restore pour toute la tentative de capture, pas un par palier.
        const restore = prepareCardForExactCapture(card);

        const duringPrepare = {
            hasExactModeClass: card.classList.contains("capture-exact-mode"),
            boardInlineMaxHeight: board.style.maxHeight,
            boardInlineOverflowY: board.style.overflowY,
            timelineScrollInlineOverflowX: timelineScroll.style.overflowX,
            cardWidth: card.getBoundingClientRect().width
        };

        // Simule le clonage fait par le palier de secours (renderElementToPngBlob) :
        // doit hériter capture-exact-mode puisque restore() n'a pas encore tourné.
        const cloneDuringCapture = card.cloneNode(true);
        const cloneHasExactModeClass = cloneDuringCapture.classList.contains("capture-exact-mode");

        restore();

        const after = {
            hasExactModeClass: card.classList.contains("capture-exact-mode"),
            boardInlineMaxHeight: board.style.maxHeight,
            cardInlineWidth: card.style.width,
            cardWidth: card.getBoundingClientRect().width
        };

        card.remove();

        return { before, duringPrepare, cloneHasExactModeClass, after };
    });

    assert.equal(result.before.hasExactModeClass, false, "la carte ne doit pas avoir capture-exact-mode avant la capture");
    assert.equal(result.duringPrepare.hasExactModeClass, true, "prepareCardForExactCapture doit ajouter capture-exact-mode");
    assert.equal(result.duringPrepare.boardInlineMaxHeight, "none", ".gantt-v76-board doit être débridé pendant la capture");
    assert.equal(result.duringPrepare.boardInlineOverflowY, "visible", ".gantt-v76-board doit passer en overflow visible");
    assert.equal(result.duringPrepare.timelineScrollInlineOverflowX, "visible", ".gantt-v76-timeline-scroll doit passer en overflow visible");
    assert.equal(result.before.cardWidth, 500, "la carte de test doit démarrer à sa largeur contrainte (500px)");
    assert.ok(
        result.duringPrepare.cardWidth > result.before.cardWidth,
        `la carte doit s'élargir pendant la capture pour englober la frise qui déborde (avant: ${result.before.cardWidth}, pendant: ${result.duringPrepare.cardWidth})`
    );
    assert.equal(result.cloneHasExactModeClass, true, "un clone pris pendant la capture (palier de secours) doit hériter capture-exact-mode");
    assert.equal(result.after.hasExactModeClass, false, "capture-exact-mode doit être retiré après restore()");
    assert.equal(result.after.boardInlineMaxHeight, "300px", "le style inline d'origine doit être restauré après la capture");
    assert.equal(result.after.cardInlineWidth, "500px", "la largeur inline d'origine de la carte doit être restaurée après la capture");
    assert.equal(result.after.cardWidth, 500, "la carte doit reprendre sa largeur normale après restore()");
};
