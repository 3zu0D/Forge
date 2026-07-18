/* Garde-fous structurels pour la page "Analyse des risques" :
   - la matrice du risque est bien sa propre carte, avec son propre bouton de
     capture (📸) séparé de "Types de risques" (avant : les deux étaient
     capturées ensemble en une seule image, ce qui empêchait de les partager
     séparément).
   - le tableau des risques a les bonnes colonnes, dans le bon ordre.
   - la criticité (probabilité × gravité) se calcule toujours correctement
     après la suppression des colonnes Source/Réponse/Responsable.

   Le rendu pixel de la capture 📸 elle-même (mot coupé type "Techniq"/"ue",
   badge numéroté invisible car html2canvas ne dessine pas le contenu des
   <button>) a été vérifié manuellement en session — dépend de html2canvas
   chargé depuis un CDN et du presse-papiers, trop lent/fragile pour un test
   automatisé courant. On vérifie ici juste que le mécanisme de contournement
   (remplacement du badge par un <span> dans le clone de capture) ne casse
   pas le bouton réel de la page. */

const { gotoPage } = require("./helpers");

module.exports = async function ({ page, baseUrl, assert }) {
    await gotoPage(page, baseUrl, "risques.html", "#risks-table-body");
    await page.waitForTimeout(300); // laisse le temps au MutationObserver d'attacher les boutons de capture

    const cardTitles = await page.locator(".risks-sidebar-stack .card-header h2").allTextContents();
    assert.deepEqual(
        cardTitles,
        ["Types de risques", "Matrice du risque", "Échelles de probabilité et de gravité"],
        "les 3 cartes de la colonne de gauche doivent être distinctes"
    );

    const captureButtonCount = await page.locator(".risks-sidebar-stack .capture-card-btn").count();
    assert.equal(captureButtonCount, 3, "chaque carte doit avoir son propre bouton de capture 📸");

    const headers = (await page.locator(".risks-table thead th").allTextContents()).map((text) => text.trim());
    assert.deepEqual(
        headers,
        ["", "N°", "", "Type", "Risque", "Conséquence", "Prob.", "Grav.", "Crit.", "Mitigation"],
        "colonnes du tableau des risques dans le mauvais ordre"
    );

    await page.click("#add-risk-btn");
    await page.waitForTimeout(100);

    // Scopé à #risks-table-body : les <th> partagent désormais les mêmes classes
    // que les <td> (risk-name-cell, risk-consequence-cell, risk-criticality-cell),
    // nécessaire pour que les largeurs de colonnes restent correctes pendant la
    // capture 📸 (voir hideStructuralCaptureColumns dans script.js). Un simple
    // .first() sur la classe seule attraperait le <th> au lieu du <td>.
    await page.locator("#risks-table-body .risk-name-cell").first().click();
    await page.keyboard.type("Panne serveur");
    await page.keyboard.press("Tab");

    await page.locator("#risks-table-body .risk-consequence-cell").first().click();
    await page.keyboard.type("Indisponibilité du service");
    await page.keyboard.press("Tab");

    await page.locator(".risk-probability-select").first().selectOption("4");
    await page.locator(".risk-severity-select").first().selectOption("5");
    await page.waitForTimeout(100);

    const criticality = await page.locator("#risks-table-body .risk-criticality-cell").first().textContent();
    assert.equal(criticality, "20", "criticité = probabilité × gravité = 4 × 5 = 20");

    // Le badge numéroté doit rester un vrai <button> sur la page live (interactif,
    // ouvre le sélecteur de couleur) : seul le CLONE utilisé pour la capture doit
    // le remplacer par un <span>.
    const liveBadgeTag = await page.locator(".risk-type-number-btn").first().evaluate((el) => el.tagName);
    assert.equal(liveBadgeTag, "BUTTON", "le badge numéroté de la page live ne doit pas être remplacé");

    // Le mécanisme de contournement capture (défini dans script.js) doit exister
    // et ne pas exclure ce badge de la capture, contrairement aux vrais boutons
    // d'action (ex: le bouton "+ Ajouter un risque").
    const captureBehavior = await page.evaluate(() => {
        const badge = document.querySelector(".risk-type-number-btn");
        const addButton = document.getElementById("add-risk-btn");
        return {
            badgeIgnored: typeof shouldIgnoreExactCaptureElement === "function" ? shouldIgnoreExactCaptureElement(badge) : null,
            addButtonIgnored: typeof shouldIgnoreExactCaptureElement === "function" ? shouldIgnoreExactCaptureElement(addButton) : null
        };
    });
    assert.equal(captureBehavior.badgeIgnored, false, "le badge numéroté doit rester visible dans la capture");
    assert.equal(captureBehavior.addButtonIgnored, true, "le bouton d'action + ne doit pas apparaître dans la capture");
};
