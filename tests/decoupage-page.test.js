/* Garde-fous pour la page "Découpage" :
   - le paragraphe d'intro ("Les phases et étapes définies ici...") a été retiré.
   - chaque phase a son propre bouton de capture 📸 (comme sur WBS/RACI). */

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

    const titleBefore = await page.locator(".wbs-card .card-header h2").textContent();
    await page.locator("#decoupage-steps-table .wbs-phase-capture-btn").first().click();
    await page.waitForTimeout(200);
    const titleDuring = await page.locator(".wbs-card .card-header h2").textContent();
    assert.equal(titleDuring, "Découpage - Cadrage", "le titre doit refléter la phase capturée pendant la capture");

    await page.waitForTimeout(3500);
    const titleAfter = await page.locator(".wbs-card .card-header h2").textContent();
    assert.equal(titleAfter, titleBefore, "le titre doit être restauré après la capture");
};
