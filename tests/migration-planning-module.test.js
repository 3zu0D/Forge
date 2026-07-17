/* Garde-fous pour la page "Planning" (groupe Infrastructure, sous Migration) :
   - un état vide tant qu'aucun plan Migration n'existe.
   - chaque plan Migration obtient automatiquement sa propre carte ici, avec
     ses étapes en lignes (même pattern que Scénario -> Déroulé).
   - la "Durée (j.)" d'une étape pilote directement le nombre de colonnes
     "Jour N" affichées pour TOUT le plan (les autres lignes, plus courtes,
     affichent des cases inactives au-delà de leur propre durée).
   - chaque jour se choisit indépendamment (Matin / Après-midi / Soirée /
     Journée entière / Week-end), ce qui colore la case correspondante, et
     ça persiste.
   - "Jour début" / "Durée (j.)" / "Jour fin" sont interdépendants comme
     dans WBS : changer le début déplace l'étape (durée conservée), changer
     la fin la redimensionne (début conservé) — et les colonnes "Jour N"
     s'étendent jusqu'au jour le plus tardif de TOUT le plan.
   - supprimer une étape dans Migration la fait disparaître du planning
     (nettoyage silencieux des entrées orphelines au chargement). */

const { gotoPage } = require("./helpers");

module.exports = async function ({ page, baseUrl, assert }) {
    // État vide : aucun plan Migration créé.
    await gotoPage(page, baseUrl, "planning.html", "#migration-planning-list");
    await page.waitForTimeout(150);
    const emptyText = (await page.locator(".migration-planning-empty-state").first().textContent()).trim();
    assert.ok(emptyText.includes("Crée d’abord un plan"), "état vide correct sans plan Migration");

    // Crée un plan Migration avec 2 étapes.
    await gotoPage(page, baseUrl, "migration.html", "#migration-plans-list");
    await page.click("#add-migration-plan-btn");
    await page.waitForTimeout(150);

    await page.locator(".migration-plan-name-input").first().click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("Migration NAS");
    await page.locator("body").click({ position: { x: 5, y: 5 } });
    await page.waitForTimeout(100);

    await page.click(".migration-add-row-btn");
    await page.waitForTimeout(100);
    await page.locator('.migration-cell[data-field="step"]').first().click();
    await page.keyboard.type("Commande disques");
    await page.waitForTimeout(80);

    await page.click(".migration-add-row-btn");
    await page.waitForTimeout(100);
    await page.locator('.migration-cell[data-field="step"]').nth(1).click();
    await page.keyboard.type("Bascule DNS");
    await page.waitForTimeout(80);

    // Le plan et ses étapes apparaissent automatiquement dans Planning.
    await gotoPage(page, baseUrl, "planning.html", "#migration-planning-list");
    await page.waitForTimeout(200);

    const cardTitle = (await page.locator(".migration-planning-card h2").first().textContent()).trim();
    assert.equal(cardTitle, "Migration NAS", "le titre du plan doit être synchronisé depuis Migration");

    const taskTexts = (await page.locator(".migration-planning-task-cell").allTextContents()).map((t) => t.trim());
    assert.deepEqual(taskTexts, ["Commande disques", "Bascule DNS"], "les étapes doivent être synchronisées depuis Migration");

    // Par défaut : 1 jour, journée entière.
    const durations = page.locator(".migration-planning-duration-input");
    assert.equal(await durations.first().inputValue(), "1", "durée par défaut = 1 jour");
    assert.equal(
        await page.locator(".migration-planning-day-cell").first().getAttribute("data-part"),
        "full",
        "jour par défaut = journée entière"
    );

    // Augmenter la durée d'une étape à 3 jours doit ajouter des colonnes "Jour N" pour tout le plan.
    await durations.first().click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("3");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    const dayHeaders = (await page.locator(".migration-planning-day-header").allTextContents()).map((t) => t.trim());
    assert.deepEqual(dayHeaders, ["Jour 1", "Jour 2", "Jour 3"], "3 colonnes de jour après avoir mis la durée à 3");

    // La 2e ligne (durée 1) doit avoir des cases inactives au-delà de sa propre durée.
    const row2Day2 = page.locator("tr[data-row-id]").nth(1).locator(".migration-planning-day-cell").nth(1);
    assert.ok(
        await row2Day2.evaluate((el) => el.classList.contains("migration-planning-day-inactive")),
        "une ligne plus courte doit avoir des cases inactives au-delà de sa durée"
    );

    // Choisir "Matin" sur le jour 2 de la 1ère ligne doit colorer la case.
    const row1Selects = page.locator("tr[data-row-id]").nth(0).locator(".migration-planning-day-select");
    await row1Selects.nth(1).selectOption("morning");
    await page.waitForTimeout(150);
    assert.equal(
        await page.locator("tr[data-row-id]").nth(0).locator(".migration-planning-day-cell").nth(1).getAttribute("data-part"),
        "morning",
        "le choix Matin doit colorer la case correspondante"
    );

    // Jour début / Durée / Jour fin façon WBS : interdépendants, et les
    // colonnes "Jour N" s'étendent jusqu'au jour le plus tardif du plan.
    const headerLabels = (await page.locator(".migration-planning-short-header").allTextContents()).map((t) => t.trim());
    assert.deepEqual(headerLabels, ["Jour début", "Durée (j.)", "Jour fin"], "en-têtes façon WBS présents");

    const row2Start = page.locator("tr[data-row-id]").nth(1).locator(".migration-planning-startday-input");
    assert.equal(await row2Start.inputValue(), "1", "jour début par défaut = 1");

    await row2Start.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("5");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    const row2End = page.locator("tr[data-row-id]").nth(1).locator(".migration-planning-endday-input");
    assert.equal(await row2End.inputValue(), "5", "changer jour début déplace jour fin (durée conservée à 1 jour)");

    const dayHeadersAfterShift = (await page.locator(".migration-planning-day-header").allTextContents()).map((t) => t.trim());
    assert.equal(dayHeadersAfterShift.length, 5, "les colonnes de jour s'étendent jusqu'au jour le plus tardif du plan");

    // L'option "Week-end" doit être disponible et colorer la case en conséquence.
    const row2Select = page.locator("tr[data-row-id]").nth(1).locator(".migration-planning-day-select");
    const optionLabels = (await row2Select.first().locator("option").allTextContents()).map((t) => t.trim());
    assert.ok(optionLabels.includes("Week-end"), "l'option Week-end doit être proposée dans la liste des jours");

    await row2Select.first().selectOption("weekend");
    await page.waitForTimeout(150);
    const row2ActiveCell = page.locator("tr[data-row-id]").nth(1).locator(".migration-planning-day-cell[data-part]");
    assert.equal(await row2ActiveCell.first().getAttribute("data-part"), "weekend", "choisir Week-end doit colorer la case en conséquence");

    // Persistance après rechargement.
    await page.reload({ waitUntil: "load" });
    await page.waitForSelector("#migration-planning-list", { state: "attached" });
    await page.waitForTimeout(250);

    assert.equal(await page.locator(".migration-planning-duration-input").first().inputValue(), "3", "la durée doit persister après rechargement");
    assert.equal(
        await page.locator("tr[data-row-id]").nth(0).locator(".migration-planning-day-cell").nth(1).getAttribute("data-part"),
        "morning",
        "le choix du jour doit persister après rechargement"
    );
    assert.equal(
        await page.locator("tr[data-row-id]").nth(1).locator(".migration-planning-startday-input").inputValue(),
        "5",
        "le jour de début doit persister après rechargement"
    );

    // Supprimer une étape dans Migration doit la faire disparaître du planning.
    await gotoPage(page, baseUrl, "migration.html", "#migration-plans-list");
    await page.waitForTimeout(150);
    await page.locator(".row-delete-btn").nth(1).click();
    await page.waitForTimeout(150);

    await gotoPage(page, baseUrl, "planning.html", "#migration-planning-list");
    await page.waitForTimeout(200);
    const taskTextsAfterDelete = (await page.locator(".migration-planning-task-cell").allTextContents()).map((t) => t.trim());
    assert.deepEqual(taskTextsAfterDelete, ["Commande disques"], "une étape supprimée dans Migration doit disparaître du planning");
};
