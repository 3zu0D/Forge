/* Garde-fous pour la page "Atouts / Limites" (Matrices) :
   - on peut créer plusieurs matrices nommées sur la même page.
   - chaque matrice a sa propre table à 2 colonnes (Atouts / Limites) et son
     propre bouton de capture 📸 (mécanisme générique addCaptureButtonsToCards,
     pas de câblage spécifique nécessaire).
   - les lignes s'ajoutent/se suppriment par matrice, sans affecter les autres.
   - tout est bien persisté par projet (localStorage) après rechargement. */

const { gotoPage } = require("./helpers");

module.exports = async function ({ page, baseUrl, assert }) {
    await gotoPage(page, baseUrl, "atouts-limites.html", "#atouts-limites-list");

    await page.click("#add-atouts-limites-matrix-btn");
    await page.waitForTimeout(150);
    await page.keyboard.type("Fournisseur A");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(100);

    await page.click(".atouts-limites-add-row-btn");
    await page.waitForTimeout(100);
    await page.locator(".atouts-limites-atout-cell").first().click();
    await page.keyboard.type("Prix compétitif");
    await page.keyboard.press("Tab");
    await page.locator(".atouts-limites-limite-cell").first().click();
    await page.keyboard.type("Délai long");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(100);

    await page.click("#add-atouts-limites-matrix-btn");
    await page.waitForTimeout(150);
    await page.keyboard.type("Fournisseur B");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(100);

    const titles = await page.locator(".atouts-limites-card .card-header h2").allTextContents();
    assert.deepEqual(titles, ["Fournisseur A", "Fournisseur B"], "les 2 matrices doivent apparaître, dans l'ordre de création, avec leur nom");

    const captureButtonCount = await page.locator(".atouts-limites-card .capture-card-btn").count();
    assert.equal(captureButtonCount, 2, "chaque matrice doit avoir son propre bouton de capture 📸");

    const headers = (await page.locator(".atouts-limites-card").first().locator("thead th").allTextContents()).map((text) => text.trim());
    assert.deepEqual(headers, ["", "Atouts", "Limites", ""], "colonnes de la matrice dans le mauvais ordre");

    // Ajouter une ligne à la 2e matrice ne doit pas toucher aux lignes de la 1ère.
    await page.locator(".atouts-limites-card").nth(1).locator(".atouts-limites-add-row-btn").click();
    await page.waitForTimeout(100);
    const firstMatrixRowCount = await page.locator(".atouts-limites-card").first().locator("tbody tr").count();
    assert.equal(firstMatrixRowCount, 1, "ajouter une ligne à la 2e matrice ne doit pas affecter la 1ère");

    // Persistance après rechargement (localStorage par projet).
    await page.reload({ waitUntil: "load" });
    await page.waitForSelector("#atouts-limites-list");
    await page.waitForTimeout(200);
    const titlesAfterReload = await page.locator(".atouts-limites-card .card-header h2").allTextContents();
    assert.deepEqual(titlesAfterReload, ["Fournisseur A", "Fournisseur B"], "les matrices doivent survivre à un rechargement");
    const persistedCellText = await page.locator(".atouts-limites-atout-cell").first().textContent();
    assert.equal(persistedCellText, "Prix compétitif", "le contenu des cellules doit être persisté");

    // Supprimer une matrice ne doit laisser que l'autre.
    page.once("dialog", (dialog) => dialog.accept());
    await page.locator(".atouts-limites-card").nth(1).locator(".atouts-limites-delete-matrix-btn").click();
    await page.waitForTimeout(150);
    const titlesAfterDelete = await page.locator(".atouts-limites-card .card-header h2").allTextContents();
    assert.deepEqual(titlesAfterDelete, ["Fournisseur A"], "supprimer une matrice ne doit laisser que les autres");
};
