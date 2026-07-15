/* Garde-fous pour la page "Découpage" :
   - le paragraphe d'intro ("Les phases et étapes définies ici...") a été retiré.
   - chaque phase a son propre bouton de capture 📸 (comme sur WBS/RACI).
   - le texte d'une étape reste aligné à gauche pendant la capture 📸, pas
     centré (régression testée ici : hideStructuralCaptureColumns() retire la
     colonne flèches monter/descendre avant la capture, ce qui décale la
     colonne "Étape" vers la position visée par la règle CSS de centrage du
     N°, initialement écrite en :nth-child(2) — même bug que sur Objectifs/
     SMART/Analyse des risques/KPIs, corrigé ici avec des classes dédiées
     .phase-number-cell/.wbs-number-cell). */

const { gotoPage } = require("./helpers");

module.exports = async function ({ page, baseUrl, assert }) {
    await gotoPage(page, baseUrl, "decoupage.html", "#decoupage-steps-table");
    await page.waitForTimeout(300);

    const bodyText = await page.locator("main").innerText();
    assert.ok(!bodyText.includes("automatiquement envoyées dans le WBS"), "le paragraphe d'intro doit avoir été retiré");

    await page.click("#add-decoupage-phase-btn");
    await page.locator("#decoupage-phases-table .editable").first().click();
    await page.keyboard.type("Cadrage");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(150);

    const captureButtonCount = await page.locator("#decoupage-steps-table .wbs-phase-capture-btn").count();
    assert.equal(captureButtonCount, 1, "chaque phase du découpage doit avoir son propre bouton de capture");

    await page.locator("#decoupage-steps-table .wbs-phase-add-btn").first().click();
    await page.waitForTimeout(150);
    await page.locator("#decoupage-steps-table .decoupage-step-cell").first().click();
    await page.keyboard.type("Recueillir les besoins");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(150);

    const numberCellClass = await page.locator("#decoupage-steps-table .wbs-number-cell").first().getAttribute("class");
    assert.ok(numberCellClass.includes("wbs-number-cell"), "la cellule N° doit porter une classe dédiée, pas dépendre de sa position");

    // Simule exactement ce que fait une capture 📸 : hideStructuralCaptureColumns()
    // retire la case à cocher / les flèches monter-descendre du DOM, ce qui décale
    // les positions :nth-child() des colonnes suivantes.
    const alignment = await page.evaluate(() => {
        const card = document.querySelector(".wbs-card");
        const restore = hideStructuralCaptureColumns(card);

        const numberCell = card.querySelector(".wbs-number-cell:not(th)");
        const stepCell = card.querySelector(".decoupage-step-cell");

        const result = {
            numberTextAlign: getComputedStyle(numberCell).textAlign,
            stepTextAlign: getComputedStyle(stepCell).textAlign
        };

        restore();
        return result;
    });
    assert.equal(alignment.numberTextAlign, "center", "le N° doit rester centré pendant la capture");
    assert.equal(alignment.stepTextAlign, "left", "le texte de l'étape ne doit pas se retrouver centré pendant la capture");

    const titleBefore = await page.locator(".wbs-card .card-header h2").textContent();
    await page.locator("#decoupage-steps-table .wbs-phase-capture-btn").first().click();
    await page.waitForTimeout(200);
    const titleDuring = await page.locator(".wbs-card .card-header h2").textContent();
    assert.equal(titleDuring, "Découpage - Cadrage", "le titre doit refléter la phase capturée pendant la capture");

    await page.waitForTimeout(3500);
    const titleAfter = await page.locator(".wbs-card .card-header h2").textContent();
    assert.equal(titleAfter, titleBefore, "le titre doit être restauré après la capture");
};
