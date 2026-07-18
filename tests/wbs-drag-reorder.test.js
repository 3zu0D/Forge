/* Garde-fous pour la réorganisation des tâches WBS par glisser-déposer, qui
   remplace les anciennes flèches monter/descendre (une poignée par ligne,
   maintenir puis glisser — voir bindRowDragReorder/beginRowDrag dans
   script.js) :
   - les anciennes flèches .wbs-move-up-btn/.wbs-move-down-btn ont disparu.
   - glisser une tâche à l'intérieur de sa phase la réordonne (comportement
     de base, doit continuer à marcher pour un simple drag court).
   - glisser une tâche vers une AUTRE phase (dépose sur l'en-tête de section)
     la fait changer de phase — même comportement que l'ancien
     moveWbsRow quand on franchissait une frontière de phase en cliquant
     flèche haut/bas, mais maintenant pour un déplacement arbitraire, pas
     seulement d'un cran.
   - la barre Échap annule le glisser en cours sans rien changer.
   - tout persiste après rechargement.
   - régression visuelle : .wbs-move-cell (la <td> qui contient la poignée)
     doit avoir EXACTEMENT la même hauteur que ses cellules voisines dans la
     même ligne — sinon son trait de séparation (border-bottom) apparaît
     décalé par rapport au reste de la ligne. C'était le cas avec l'ancien
     display:flex hérité du design à 2 flèches (une <td> en flex sort du
     calcul normal de hauteur de ligne d'un tableau). */

const { gotoPage } = require("./helpers");

async function dragTo(page, sourceLocator, targetX, targetY) {
    const box = await sourceLocator.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 8, { steps: 3 });
    await page.mouse.move(targetX, targetY, { steps: 15 });
    await page.waitForTimeout(100);
    await page.mouse.up();
    await page.waitForTimeout(200);
}

module.exports = async function ({ page, baseUrl, assert }) {
    // 2 phases via Découpage (synchronisées automatiquement vers WBS).
    await gotoPage(page, baseUrl, "decoupage.html", "#decoupage-phases-table");

    for (const name of ["Phase A", "Phase B"]) {
        await page.click("#add-decoupage-phase-btn");
        await page.waitForTimeout(120);
        await page.locator(".phase-name-cell").last().click();
        await page.keyboard.type(name);
        await page.keyboard.press("Tab");
        await page.waitForTimeout(100);
    }

    await gotoPage(page, baseUrl, "wbs.html", "#wbs-table");
    await page.waitForTimeout(200);

    const oldArrowCount = await page.locator(".wbs-move-up-btn, .wbs-move-down-btn").count();
    assert.equal(oldArrowCount, 0, "les anciennes flèches monter/descendre doivent avoir disparu, remplacées par une poignée");

    // 3 tâches dans Phase A.
    const phaseAAddBtn = page.locator(".wbs-phase-add-btn[data-add-phase-id]").first();
    for (const name of ["Tache A1", "Tache A2", "Tache A3"]) {
        await phaseAAddBtn.click();
        await page.waitForTimeout(150);
        await page.locator(".wbs-task-cell").last().click();
        await page.keyboard.type(name);
        await page.keyboard.press("Tab");
        await page.waitForTimeout(100);
    }

    const namesBefore = (await page.locator(".wbs-task-cell").allTextContents()).map((t) => t.trim());
    assert.deepEqual(namesBefore, ["Tache A1", "Tache A2", "Tache A3"], "3 tâches créées dans l'ordre d'ajout");

    // La cellule de la poignée ne doit pas être plus courte que ses voisines
    // (sinon son trait de séparation "remonte" par rapport au reste de la ligne).
    const cellHeights = await page.evaluate(() => {
        const row = document.querySelector("#wbs-table tr[data-row-id]");
        return {
            moveCell: row.querySelector(".wbs-move-cell").getBoundingClientRect().height,
            taskCell: row.querySelector(".wbs-task-cell").getBoundingClientRect().height
        };
    });
    assert.equal(cellHeights.moveCell, cellHeights.taskCell, `la cellule de la poignée doit avoir la même hauteur que ses voisines (${cellHeights.moveCell} vs ${cellHeights.taskCell})`);

    // Glisse la 1ère tâche (poignée) juste après la 3e -> réorganisation dans la même phase.
    // Scopé à #wbs-table : le sidebar des phases utilise aussi data-row-id
    // depuis que son propre glisser-déposer a été branché.
    const handle1 = page.locator("#wbs-table tr[data-row-id]").nth(0).locator(".row-drag-handle");
    const row3Box = await page.locator("#wbs-table tr[data-row-id]").nth(2).boundingBox();
    await dragTo(page, handle1, row3Box.x + row3Box.width / 2, row3Box.y + row3Box.height - 3);

    const namesAfterReorder = (await page.locator(".wbs-task-cell").allTextContents()).map((t) => t.trim());
    assert.deepEqual(namesAfterReorder, ["Tache A2", "Tache A3", "Tache A1"], "glisser une tâche la réordonne à l'intérieur de sa phase");

    // Glisse la 1ère tâche (maintenant "Tache A2") vers la section Phase B, encore vide.
    const phaseBRow = page.locator("#wbs-table tr.wbs-phase-row").nth(1);
    const phaseBBox = await phaseBRow.boundingBox();
    const handleToMove = page.locator("#wbs-table tr[data-row-id]").nth(0).locator(".row-drag-handle");
    await dragTo(page, handleToMove, phaseBBox.x + phaseBBox.width / 2, phaseBBox.y + phaseBBox.height / 2);

    const { phaseATaskCount, phaseBTaskCount } = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll("#wbs-table tr[data-row-id]"));
        const phaseRows = Array.from(document.querySelectorAll("#wbs-table tr.wbs-phase-row"));
        const phaseAId = phaseRows[0].dataset.phaseId;
        const phaseBId = phaseRows[1].dataset.phaseId;
        return {
            phaseATaskCount: rows.filter((r) => r.dataset.phaseId === phaseAId).length,
            phaseBTaskCount: rows.filter((r) => r.dataset.phaseId === phaseBId).length
        };
    });
    assert.equal(phaseATaskCount, 2, "phase A doit avoir 2 tâches restantes après en avoir déplacé 1 sur 3 vers phase B");
    assert.equal(phaseBTaskCount, 1, "déposer une tâche sur l'en-tête d'une autre phase doit la faire changer de phase");

    // Persistance après rechargement.
    await page.reload({ waitUntil: "load" });
    await page.waitForSelector("#wbs-table", { state: "attached" });
    await page.waitForTimeout(250);

    const phaseATaskCountAfterReload = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll("#wbs-table tr[data-row-id]"));
        const phaseRows = Array.from(document.querySelectorAll("#wbs-table tr.wbs-phase-row"));
        const phaseAId = phaseRows[0].dataset.phaseId;
        return rows.filter((r) => r.dataset.phaseId === phaseAId).length;
    });
    assert.equal(phaseATaskCountAfterReload, 2, "le changement de phase par glisser-déposer doit persister après rechargement");

    // Échap annule un glisser en cours.
    const namesBeforeEscape = (await page.locator(".wbs-task-cell").allTextContents()).map((t) => t.trim());
    const handleForEscape = page.locator("#wbs-table tr[data-row-id]").first().locator(".row-drag-handle");
    const escBox = await handleForEscape.boundingBox();
    await page.mouse.move(escBox.x + escBox.width / 2, escBox.y + escBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(escBox.x, escBox.y + 200, { steps: 10 });
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await page.waitForTimeout(150);
    const namesAfterEscape = (await page.locator(".wbs-task-cell").allTextContents()).map((t) => t.trim());
    assert.deepEqual(namesAfterEscape, namesBeforeEscape, "Échap doit annuler le glisser en cours sans changer l'ordre");
};
