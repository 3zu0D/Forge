/* Garde-fous pour la nouvelle page "Migration" (groupe Infrastructure) :
   - plusieurs plans nommés, chacun avec son propre tableau Migration/Rollback
     groupé par un bandeau à colspan (9 colonnes réelles, "Test" retiré).
   - la colonne "Crit." colore la ligne selon l'échelle affichée à gauche, et
     ça persiste après rechargement.
   - chaque plan a un badge de couleur (registre COLOR_TARGET_REGISTRY,
     comme les autres "listes colorées" de l'app) qui teinte le bord gauche
     de sa carte, indépendamment des autres plans, et ça persiste.
   - le bandeau groupé (colspan) + un tableau à en-tête sur 2 lignes utilise
     width:100% (comme la matrice de décision) : la capture 📸 verrouille les
     largeurs de colonnes via CAPTURE_COLUMN_LOCK_SELECTOR en mesurant la
     dernière ligne du thead (voir prepareCardForExactCapture dans
     script.js), donc pas de test de capture dédié ici. */

const { gotoPage } = require("./helpers");

module.exports = async function ({ page, baseUrl, assert }) {
    await gotoPage(page, baseUrl, "migration.html", "#migration-plans-list");
    await page.waitForTimeout(200);

    const legendRows = (await page.locator(".migration-criticality-row").allTextContents()).map((t) => t.trim());
    assert.deepEqual(
        legendRows,
        ["1 — Négligeable", "2 — Attention modérée", "3 — Vigilance requise", "4 — Impact significatif", "5 — Critique"],
        "l'échelle de criticité doit afficher ses 5 niveaux dans l'ordre"
    );

    await page.click("#add-migration-plan-btn");
    await page.waitForTimeout(150);

    const groupHeaders = (await page.locator(".migration-group-header").allTextContents()).map((t) => t.trim());
    assert.deepEqual(groupHeaders, ["Migration", "Rollback"], "le tableau doit avoir un bandeau Migration et un bandeau Rollback");

    const columnHeaders = (await page.locator(".migration-table thead tr").nth(1).locator("th").allTextContents()).map((t) => t.trim());
    assert.deepEqual(
        columnHeaders,
        ["Étape / Opération", "Temporalité", "Temps estimé", "Quand", "Crit.", "Risque", "Possibilité", "Prévention", "Correction", ""],
        "les 9 colonnes réelles doivent être présentes, sans la colonne Test"
    );

    await page.locator(".migration-plan-name-input").first().click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("Migration NAS Nancy");
    await page.locator("body").click({ position: { x: 5, y: 5 } });
    await page.waitForTimeout(120);

    await page.click(".migration-add-row-btn");
    await page.waitForTimeout(120);
    await page.locator(".migration-cell").first().click();
    await page.keyboard.type("Commande disques");
    await page.waitForTimeout(100);

    await page.locator(".migration-crit-select").first().selectOption("4");
    await page.waitForTimeout(120);

    const critClass = await page.locator(".migration-crit-cell").first().getAttribute("class");
    assert.ok(critClass.includes("migration-criticality-4"), "choisir une criticité doit colorer la cellule selon l'échelle");

    // Persistance après rechargement.
    await page.reload({ waitUntil: "load" });
    await page.waitForSelector("#migration-plans-list", { state: "attached" });
    await page.waitForTimeout(250);

    const nameAfterReload = (await page.locator(".migration-plan-name-input").first().textContent()).trim();
    assert.equal(nameAfterReload, "Migration NAS Nancy", "le nom du plan doit persister après rechargement");

    const stepAfterReload = (await page.locator(".migration-cell").first().textContent()).trim();
    assert.equal(stepAfterReload, "Commande disques", "le contenu d'une cellule doit persister après rechargement");

    const critClassAfterReload = await page.locator(".migration-crit-cell").first().getAttribute("class");
    assert.ok(critClassAfterReload.includes("migration-criticality-4"), "la couleur de criticité doit persister après rechargement");

    // Un 2e plan, indépendant du premier.
    await page.click("#add-migration-plan-btn");
    await page.waitForTimeout(150);
    const planCount = await page.locator(".migration-plan-card").count();
    assert.equal(planCount, 2, "on doit pouvoir créer plusieurs plans nommés indépendants");

    // Chaque plan a sa propre couleur, modifiable indépendamment.
    const colorBtns = page.locator(".migration-plan-color-btn");
    const colorPlan1Before = await colorBtns.nth(0).evaluate((el) => el.style.backgroundColor);
    const colorPlan2 = await colorBtns.nth(1).evaluate((el) => el.style.backgroundColor);
    assert.notEqual(colorPlan1Before, colorPlan2, "deux plans doivent avoir une couleur différente par défaut");

    await colorBtns.nth(0).click();
    await page.waitForSelector("#color-menu:not(.hidden)", { state: "visible" });
    await page.locator(".color-choice").nth(3).click();
    await page.waitForTimeout(150);

    const colorPlan1After = await page.locator(".migration-plan-color-btn").nth(0).evaluate((el) => el.style.backgroundColor);
    assert.notEqual(colorPlan1After, colorPlan1Before, "choisir une couleur doit changer le badge du plan");

    const colorPlan2Unchanged = await page.locator(".migration-plan-color-btn").nth(1).evaluate((el) => el.style.backgroundColor);
    assert.equal(colorPlan2Unchanged, colorPlan2, "changer la couleur d'un plan ne doit pas affecter les autres");

    const borderColor = await page.locator(".migration-plan-card").nth(0).evaluate((el) => getComputedStyle(el).borderLeftColor);
    assert.ok(borderColor && borderColor !== "rgba(0, 0, 0, 0)", "le bord gauche de la carte doit être teinté par la couleur du plan");

    const cardWash = await page.locator(".migration-plan-card").nth(0).evaluate((el) => getComputedStyle(el).backgroundImage);
    assert.ok(cardWash && cardWash !== "none", "la couleur doit se répercuter en fond sur toute la carte, pas juste sur le bord");

    // La couleur du plan se répercute à l'identique sur sa carte Planning.
    await gotoPage(page, baseUrl, "planning.html", "#migration-planning-list");
    await page.waitForTimeout(200);
    const planningWash = await page.locator(".migration-planning-card").first().evaluate((el) => getComputedStyle(el).backgroundImage);
    assert.equal(planningWash, cardWash, "la couleur du plan Migration doit se répercuter sur sa carte Planning");

    await gotoPage(page, baseUrl, "migration.html", "#migration-plans-list");
    await page.waitForTimeout(150);

    await page.reload({ waitUntil: "load" });
    await page.waitForSelector("#migration-plans-list", { state: "attached" });
    await page.waitForTimeout(200);
    const colorPlan1AfterReload = await page.locator(".migration-plan-color-btn").nth(0).evaluate((el) => el.style.backgroundColor);
    assert.equal(colorPlan1AfterReload, colorPlan1After, "la couleur du plan doit persister après rechargement");

    // Supprime le 1er plan : le 2e doit rester intact.
    page.once("dialog", (dialog) => dialog.accept());
    await page.locator(".migration-delete-plan-btn").first().click();
    await page.waitForTimeout(150);
    const remainingPlans = await page.locator(".migration-plan-card").count();
    assert.equal(remainingPlans, 1, "supprimer un plan ne doit retirer que celui-là");
};
