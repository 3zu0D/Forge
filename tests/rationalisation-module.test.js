/* Garde-fous pour la page "Rationalisation" (Infrastructure) :
   - un tableau par lieu, en miroir des lieux d'Inventaire de Migration
     (pas de sidebar "Lieux" ici : la liste vient directement de là-bas).
   - la partie gauche (État actuel) reprend nom/serveur physique/CPU/RAM/
     stockage d'une VM d'Inventaire de Migration, en lecture seule.
   - la partie droite (Cible) est vide par défaut et librement éditable ;
     modifier une cible ne touche jamais Inventaire de Migration.
   - tout est persisté par projet (localStorage) après rechargement. */

const { gotoPage } = require("./helpers");

module.exports = async function ({ page, baseUrl, assert }) {
    // 1) Crée le lieu "Lyon" dans Inventaire de Migration.
    await gotoPage(page, baseUrl, "migration-inventaire.html", "#mig-inv-locations-zone");
    await page.click("#add-mig-inv-location-btn");
    await page.waitForTimeout(150);
    await page.keyboard.type("Lyon");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(100);

    // 2) Affecte le serveur seed d'Existant (2 VM) à "Lyon" : elles doivent
    // se copier automatiquement dans Inventaire de Migration.
    await gotoPage(page, baseUrl, "existant.html", "#vmsizing-server-form");
    await page.waitForTimeout(200);
    const seedServerName = await page.locator(".vmsizing-server-name-cell").first().innerText();
    await page.locator("#vmsizing-lieu-select").selectOption({ label: "Lyon" });
    await page.waitForTimeout(150);

    // 3) Sur Inventaire de Migration, personnalise la 1ère ligne copiée
    // (tous les champs restent modifiables) pour avoir des valeurs
    // déterministes à retrouver dans Rationalisation.
    await gotoPage(page, baseUrl, "migration-inventaire.html", "#mig-inv-locations-zone");
    await page.waitForTimeout(300);

    let rowCount = await page.locator(".mig-inv-table tbody tr").count();
    assert.equal(rowCount, 2, "les 2 VM du serveur affecté à Lyon doivent être copiées automatiquement");

    const migRow = page.locator(".mig-inv-table tbody tr").first();
    await migRow.locator('input[data-item-field="name"]').fill("VM Rationalisation");
    await migRow.locator('input[data-item-field="cpu"]').fill("8");
    await migRow.locator('input[data-item-field="ramGB"]').fill("32");
    await migRow.locator('input[data-item-field="storage1.used"]').fill("100");
    await migRow.locator('input[data-item-field="storage1.available"]').fill("400");
    await page.waitForTimeout(150);

    // 4) Sur Rationalisation, le lieu "Lyon" doit apparaître avec ces 2
    // lignes, l'état actuel repris en lecture seule (y compris le serveur
    // physique).
    await gotoPage(page, baseUrl, "rationalisation.html", "#rationalisation-list");
    await page.waitForTimeout(300);

    const lyonCard = page.locator(".rationalisation-card[data-location-id]").filter({ has: page.locator('.rationalisation-card-title:text-is("Lyon")') });
    assert.equal(await lyonCard.count(), 1, "le lieu Lyon doit avoir son propre tableau dans Rationalisation");

    const captureButtonCount = await lyonCard.locator(".capture-card-btn").count();
    assert.equal(captureButtonCount, 1, "chaque lieu doit avoir son propre bouton de capture 📸 couvrant les deux tableaux");

    rowCount = await lyonCard.locator(".rationalisation-table tbody tr").count();
    assert.equal(rowCount, 2, "les 2 VM du lieu Lyon doivent apparaître dans Rationalisation");

    const rationRow = lyonCard.locator(".rationalisation-table tbody tr").first();
    const currentName = (await rationRow.locator("td").nth(1).innerText()).trim();
    const currentServer = (await rationRow.locator("td").nth(2).innerText()).trim();
    const currentCpu = (await rationRow.locator("td").nth(3).innerText()).trim();
    const currentRam = (await rationRow.locator("td").nth(4).innerText()).trim();
    assert.equal(currentName, "VM Rationalisation", "le nom de la VM doit être repris tel quel");
    assert.equal(currentServer, seedServerName, "le serveur physique actuel doit être repris d'Inventaire de Migration");
    assert.equal(currentCpu, "8", "le CPU actuel doit être repris d'Inventaire de Migration");
    assert.equal(currentRam, "32", "la RAM actuelle doit être reprise d'Inventaire de Migration");

    // 5) Remplit la cible (CPU/RAM/stockage) : vide par défaut, puis
    // persistée après rechargement, sans jamais toucher Inventaire de
    // Migration.
    const targetCpuInput = rationRow.locator('input[data-target-field="cpu"]');
    const targetRamInput = rationRow.locator('input[data-target-field="ramGB"]');
    assert.equal(await targetCpuInput.inputValue(), "", "la cible CPU doit être vide (placeholder 0) par défaut");
    assert.equal(await targetRamInput.inputValue(), "", "la cible RAM doit être vide (placeholder 0) par défaut");

    await targetCpuInput.fill("4");
    await targetRamInput.fill("16");
    await rationRow.locator('input[data-target-field="storage1.used"]').fill("50");
    await rationRow.locator('input[data-target-field="storage1.available"]').fill("200");
    await page.waitForTimeout(150);

    // 6) Un écart entre Cible et État actuel (4 ≠ 8, 16 ≠ 32, 50 ≠ 100)
    // doit ressortir en rouge, en direct pendant la saisie.
    assert.ok(await targetCpuInput.evaluate((el) => el.classList.contains("rationalisation-diff")), "un CPU cible différent de l'actuel doit être surligné en rouge");
    assert.ok(await targetRamInput.evaluate((el) => el.classList.contains("rationalisation-diff")), "une RAM cible différente de l'actuelle doit être surlignée en rouge");
    const storageUsedInput = rationRow.locator('input[data-target-field="storage1.used"]');
    assert.ok(await storageUsedInput.evaluate((el) => el.classList.contains("rationalisation-diff")), "un stockage cible différent de l'actuel doit être surligné en rouge");

    // Remettre la même valeur que l'actuel doit retirer le surlignage.
    await targetCpuInput.fill("8");
    await page.waitForTimeout(100);
    assert.ok(!(await targetCpuInput.evaluate((el) => el.classList.contains("rationalisation-diff"))), "un CPU cible identique à l'actuel ne doit plus être surligné");
    await targetCpuInput.fill("4");
    await page.waitForTimeout(100);

    // 7) Colonne Justification : champ libre par ligne, jamais surligné
    // (pas de jumeau côté État actuel).
    const justificationInput = rationRow.locator('input[data-target-field="justification"]');
    await justificationInput.fill("Test de justification");
    await page.waitForTimeout(150);
    assert.ok(!(await justificationInput.evaluate((el) => el.classList.contains("rationalisation-diff"))), "la justification ne doit jamais être surlignée (pas de jumeau à comparer)");

    // 8) Les intitulés de colonnes doivent être centrés.
    const headerAlign = await lyonCard.locator(".rationalisation-table thead th").first().evaluate((el) => getComputedStyle(el).textAlign);
    assert.equal(headerAlign, "center", "les intitulés de colonnes doivent être centrés");

    await page.reload({ waitUntil: "load" });
    await page.waitForSelector("#rationalisation-list");
    await page.waitForTimeout(300);

    const lyonCardAfterReload = page.locator(".rationalisation-card[data-location-id]").filter({ has: page.locator('.rationalisation-card-title:text-is("Lyon")') });
    const rationRowAfterReload = lyonCardAfterReload.locator(".rationalisation-table tbody tr").first();
    assert.equal(await rationRowAfterReload.locator('input[data-target-field="cpu"]').inputValue(), "4", "la cible CPU doit être persistée après rechargement");
    assert.equal(await rationRowAfterReload.locator('input[data-target-field="ramGB"]').inputValue(), "16", "la cible RAM doit être persistée après rechargement");
    assert.equal(await rationRowAfterReload.locator('input[data-target-field="storage1.used"]').inputValue(), "50", "la cible stockage utilisé doit être persistée après rechargement");
    assert.equal(await rationRowAfterReload.locator('input[data-target-field="justification"]').inputValue(), "Test de justification", "la justification doit être persistée après rechargement");
    assert.ok(
        await rationRowAfterReload.locator('input[data-target-field="cpu"]').evaluate((el) => el.classList.contains("rationalisation-diff")),
        "le surlignage rouge doit être recalculé au rendu après rechargement, pas seulement en direct"
    );

    await gotoPage(page, baseUrl, "migration-inventaire.html", "#mig-inv-locations-zone");
    await page.waitForTimeout(300);
    const migInvCpuAfter = await page.locator(".mig-inv-table tbody tr").first().locator('input[data-item-field="cpu"]').inputValue();
    assert.equal(migInvCpuAfter, "8", "remplir la cible dans Rationalisation ne doit pas modifier Inventaire de Migration");
};
