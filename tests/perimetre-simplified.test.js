/* Garde-fous pour la page Périmètre simplifiée :
   - le type "À clarifier" a été retiré : seuls "Inclus" et "Hors périmètre"
     restent, donc 2 cartes (pas 3).
   - la colonne Description a été retirée : chaque tableau n'a plus que
     Sel. / N° / Élément (3 colonnes, pas 4).
   - chaque carte (Inclus, Hors périmètre) a son propre bouton de capture 📸,
     indépendant de l'autre (régression testée ici : .scope-column-header
     n'était pas reconnu par addCaptureButtonsToCards(), qui ne cherchait que
     .card-header — ces cartes n'avaient donc jamais eu de bouton de capture
     du tout avant le fix).
   - ajouter un élément dans un bloc ne doit pas apparaître dans l'autre. */

const { gotoPage } = require("./helpers");

module.exports = async function ({ page, baseUrl, assert }) {
    await gotoPage(page, baseUrl, "perimetre.html", "#scope-included-body");

    const cardTitles = (await page.locator(".scope-column-card h2").allTextContents()).map((text) => text.trim());
    assert.deepEqual(cardTitles, ["Inclus", "Hors périmètre"], "seuls Inclus et Hors périmètre doivent rester, 'À clarifier' est retiré");

    const captureButtonCount = await page.locator(".scope-column-card .capture-card-btn").count();
    assert.equal(captureButtonCount, 2, "Inclus et Hors périmètre doivent chacun avoir leur propre bouton de capture 📸");

    const inclusHeaders = (await page.locator(".scope-in-card thead th").allTextContents()).map((text) => text.trim());
    assert.deepEqual(inclusHeaders, ["Sel.", "N°", "Élément"], "la colonne Description doit avoir disparu du tableau Inclus");

    const horsHeaders = (await page.locator(".scope-out-card thead th").allTextContents()).map((text) => text.trim());
    assert.deepEqual(horsHeaders, ["Sel.", "N°", "Élément"], "la colonne Description doit avoir disparu du tableau Hors périmètre");

    await page.locator('.scope-add-btn[data-scope-type="Inclus"]').click();
    await page.waitForTimeout(150);
    await page.locator("#scope-included-body .scope-title-cell").first().click();
    await page.keyboard.type("Migration serveurs");
    await page.keyboard.press("Tab");

    await page.locator('.scope-add-btn[data-scope-type="Hors périmètre"]').click();
    await page.waitForTimeout(150);
    await page.locator("#scope-excluded-body .scope-title-cell").first().click();
    await page.keyboard.type("Formation utilisateurs");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(150);

    const inclusItems = (await page.locator("#scope-included-body .scope-title-cell").allTextContents()).map((t) => t.trim());
    assert.deepEqual(inclusItems, ["Migration serveurs"], "le bloc Inclus ne doit contenir que ce qui y a été ajouté");

    const horsItems = (await page.locator("#scope-excluded-body .scope-title-cell").allTextContents()).map((t) => t.trim());
    assert.deepEqual(horsItems, ["Formation utilisateurs"], "le bloc Hors périmètre ne doit contenir que ce qui y a été ajouté");
};
