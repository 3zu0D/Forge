/* Garde-fous pour le nouveau module "Tests" (pages Scénario / Déroulé) :
   - un scénario créé dans Scénario obtient automatiquement sa propre carte,
     avec un champ "Contexte général" et un tableau d'éléments "Contexte détaillé".
   - ce même scénario obtient aussi automatiquement sa propre carte dans
     Déroulé (synchronisation entre les deux pages, sans sélecteur à choisir).
   - supprimer un scénario dans Scénario supprime bien sa carte (et ses
     étapes) dans Déroulé — régression testée ici : les étapes de déroulé
     vivent dans une clé de stockage séparée, chargée uniquement sur la page
     Déroulé, donc un cascade-delete fait depuis Scénario doit relire cette
     clé avant de la réécrire, sous peine de l'écraser par un tableau vide. */

const { gotoPage } = require("./helpers");

module.exports = async function ({ page, baseUrl, assert }) {
    await gotoPage(page, baseUrl, "tests-scenario.html", "#test-scenarios-table-body");
    await page.waitForTimeout(200);

    await page.click("#add-test-scenario-btn");
    await page.waitForTimeout(120);
    await page.locator(".test-scenario-name-cell").last().click();
    await page.keyboard.type("Connexion utilisateur");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(120);

    await page.click("#add-test-scenario-btn");
    await page.waitForTimeout(120);
    await page.locator(".test-scenario-name-cell").last().click();
    await page.keyboard.type("Paiement carte bancaire");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(150);

    const cardTitles = (await page.locator(".tests-scenario-card .card-header h2").allTextContents()).map((t) => t.trim());
    assert.deepEqual(cardTitles, ["Connexion utilisateur", "Paiement carte bancaire"], "un scénario doit obtenir sa propre carte, dans l'ordre de création");

    const generalField = page.locator(".tests-context-general-field").first();
    await generalField.click();
    await page.keyboard.type("L'utilisateur a un compte actif.");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(150);

    await page.locator(".tests-add-context-step-btn").first().click();
    await page.waitForTimeout(120);
    await page.locator(".tests-step-cell").last().click();
    await page.keyboard.type("Ouvrir la page de connexion");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(150);

    const contextSteps = await page.locator(".tests-scenario-card").first().locator(".tests-step-cell").allTextContents();
    assert.deepEqual(contextSteps.map((t) => t.trim()), ["Ouvrir la page de connexion"], "l'élément de contexte détaillé doit apparaître dans la carte du bon scénario");

    // La page Déroulé doit refléter automatiquement les scénarios créés ici.
    await gotoPage(page, baseUrl, "tests-deroule.html", "#test-deroule-container");
    await page.waitForTimeout(200);

    const derouleCardTitles = (await page.locator(".tests-scenario-card .card-header h2").allTextContents()).map((t) => t.trim());
    assert.deepEqual(derouleCardTitles, ["Connexion utilisateur", "Paiement carte bancaire"], "chaque scénario doit avoir sa propre carte dans Déroulé, sans action manuelle");

    await page.locator(".tests-add-deroule-step-btn").first().click();
    await page.waitForTimeout(120);
    await page.locator(".tests-step-cell").last().click();
    await page.keyboard.type("Saisir identifiant et mot de passe");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(150);

    const derouleSteps = await page.locator(".tests-scenario-card").first().locator(".tests-step-cell").allTextContents();
    assert.deepEqual(derouleSteps.map((t) => t.trim()), ["Saisir identifiant et mot de passe"], "l'étape de déroulé doit apparaître dans la carte du bon scénario");

    // Supprime le 1er scénario depuis Scénario : sa carte ET ses étapes de
    // déroulé doivent disparaître de Déroulé (cascade cross-page).
    await gotoPage(page, baseUrl, "tests-scenario.html", "#test-scenarios-table-body");
    await page.waitForTimeout(200);
    await page.locator(".test-scenario-checkbox").first().check();
    page.once("dialog", (dialog) => dialog.accept());
    await page.click("#delete-selected-test-scenarios-btn");
    await page.waitForTimeout(250);

    const remainingScenarios = (await page.locator(".test-scenario-name-cell").allTextContents()).map((t) => t.trim());
    assert.deepEqual(remainingScenarios, ["Paiement carte bancaire"], "seul le scénario coché doit être supprimé");

    await gotoPage(page, baseUrl, "tests-deroule.html", "#test-deroule-container");
    await page.waitForTimeout(200);
    const remainingDerouleCards = (await page.locator(".tests-scenario-card .card-header h2").allTextContents()).map((t) => t.trim());
    assert.deepEqual(remainingDerouleCards, ["Paiement carte bancaire"], "supprimer un scénario doit retirer sa carte (et ses étapes) de Déroulé aussi");
};
