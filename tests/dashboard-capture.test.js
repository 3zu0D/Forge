/* Garde-fou pour un bug de capture du dashboard : la liste "Contrôles de
   cohérence" (.coherence-list) est bornée en hauteur (max-height: 620px,
   overflow-y: auto) dès qu'il y a beaucoup de points détectés — même
   mécanique que le Gantt/WBS (scroll interne sur beaucoup de contenu).
   Contrairement à .gantt-v76-board/.wbs-table-wrapper, .coherence-list
   n'était PAS dans la liste des conteneurs réinitialisés par
   prepareCardForExactCapture(), donc toute capture de cette carte au-delà
   de ~620px de contenu tronquait silencieusement les derniers points
   détectés (aucune erreur, juste des données manquantes dans le rapport).

   Vérifié manuellement en session avec une vraie capture : un dashboard à
   13 points de contrôle donnait une image de 1754px de haut (coupée avant
   la fin de la liste) avant le fix, et 2118px (liste complète, 13/13
   points visibles) après. Ici on vérifie plus vite, via une carte de test
   synthétique, que le mécanisme de reset couvre bien .coherence-list. */

const { gotoPage } = require("./helpers");

module.exports = async function ({ page, baseUrl, assert }) {
    await gotoPage(page, baseUrl, "dashboard.html", "#coherence-list");

    const result = await page.evaluate(() => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <div class="card-header"><h2>Test</h2></div>
            <div class="coherence-list" style="max-height: 620px; overflow-y: auto;">
                ${Array.from({ length: 20 }, (_, i) => `<div class="coherence-item" style="height: 60px;">Item ${i}</div>`).join("")}
            </div>
        `;
        document.body.appendChild(card);

        const list = card.querySelector(".coherence-list");

        const before = {
            listMaxHeight: getComputedStyle(list).maxHeight,
            listScrollHeight: list.scrollHeight
        };

        const restore = prepareCardForExactCapture(card);

        const duringPrepare = {
            listInlineMaxHeight: list.style.maxHeight,
            listInlineOverflow: list.style.overflow
        };

        restore();

        const after = {
            listInlineMaxHeight: list.style.maxHeight
        };

        card.remove();

        return { before, duringPrepare, after };
    });

    assert.equal(result.before.listMaxHeight, "620px", "la liste de contrôles doit démarrer bornée à 620px (comportement écran normal)");
    assert.ok(result.before.listScrollHeight > 620, "le contenu de test doit dépasser 620px, sinon le test ne prouve rien");
    assert.equal(result.duringPrepare.listInlineMaxHeight, "none", ".coherence-list doit être débridée pendant la capture, sinon les derniers points détectés sont tronqués");
    assert.equal(result.duringPrepare.listInlineOverflow, "visible", ".coherence-list doit passer en overflow visible pendant la capture");
    assert.equal(result.after.listInlineMaxHeight, "620px", "le style inline d'origine (max-height: 620px) doit être restauré après la capture, pour retrouver le scroll normal à l'écran");
};
