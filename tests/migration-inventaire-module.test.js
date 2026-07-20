/* Garde-fous pour la page "Inventaire de Migration" (Infrastructure) et son
   lien avec Existant :
   - on peut créer plusieurs lieux, chacun avec son propre tableau, et
     changer la couleur d'un lieu depuis la sidebar.
   - un serveur Existant affecté à un lieu (champ "Lieu (migration)") copie
     automatiquement ses VM ici, avec le nom/rôle/serveur physique/CPU/
     RAM/stockage (même unité, Go) pré-remplis.
   - à partir de là, TOUS les champs de cette ligne sont modifiables, y
     compris ceux copiés d'Existant — les modifier ne touche jamais Existant,
     et une fois copiée, la ligne ne se resynchronise plus (ce n'est plus un
     lien permanent, juste une copie de départ).
   - supprimer une ligne copiée ne doit pas la faire réapparaître au rendu
     suivant.
   - une ligne ajoutée à la main coexiste avec les lignes copiées.
   - tout est persisté par projet (localStorage) après rechargement. */

const { gotoPage } = require("./helpers");

module.exports = async function ({ page, baseUrl, assert }) {
    // 1) Crée le lieu d'abord (le <select> "Lieu" sur Existant se peuple
    // depuis la liste des lieux déjà créés ici).
    await gotoPage(page, baseUrl, "migration-inventaire.html", "#mig-inv-locations-zone");
    await page.click("#add-mig-inv-location-btn");
    await page.waitForTimeout(150);
    await page.keyboard.type("Dijon");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(100);

    // Couleur du lieu modifiable depuis la sidebar.
    const badge = page.locator(".mig-inv-location-number-btn").first();
    await badge.click();
    await page.waitForTimeout(150);
    const colorMenuVisible = await page.locator("#color-menu").evaluate((el) => !el.classList.contains("hidden"));
    assert.ok(colorMenuVisible, "cliquer sur le badge N° d'un lieu doit ouvrir le sélecteur de couleur");
    await page.locator(".color-choice").nth(2).click();
    await page.waitForTimeout(150);
    const pickedColor = await page.locator(".color-choice").nth(2).evaluate((el) => el.dataset.color);
    const locationColor = await page.evaluate(() => migInvLocations[0].color);
    assert.equal(locationColor, pickedColor, "la couleur choisie doit être appliquée au lieu");

    // 2) Affecte le serveur seed d'Existant à "Dijon" et renomme-le pour un
    // test robuste (pas dépendant du nom seed par défaut).
    await gotoPage(page, baseUrl, "existant.html", "#vmsizing-server-form");
    await page.waitForTimeout(200);

    const serverNameCell = page.locator(".vmsizing-server-name-cell").first();
    await serverNameCell.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("Serveur Dijon 01");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(150);

    const lieuSelect = page.locator("#vmsizing-lieu-select");
    await lieuSelect.selectOption({ label: "Dijon" });
    await page.waitForTimeout(150);

    const seedVcpu = await page.locator('#vmsizing-vm-table-body input[data-vm-field="vcpu"]').first().inputValue();
    const seedName = await page.locator('#vmsizing-vm-table-body input[data-vm-field="name"]').first().inputValue();
    const seedDisk1Used = await page.locator('#vmsizing-vm-table-body input[data-vm-field="disk1.used"]').first().inputValue();

    // 3) Retour sur Inventaire de Migration : les 2 VM du serveur seed
    // doivent avoir été copiées automatiquement.
    await gotoPage(page, baseUrl, "migration-inventaire.html", "#mig-inv-locations-zone");
    await page.waitForTimeout(300);

    const captureButtonCount = await page.locator(".mig-inv-card .capture-card-btn").count();
    assert.equal(captureButtonCount, 1, "chaque lieu doit avoir son propre bouton de capture 📸");

    let rowCount = await page.locator(".mig-inv-table tbody tr").count();
    assert.equal(rowCount, 2, "les 2 VM du serveur affecté à Dijon doivent être copiées automatiquement");

    const firstRow = page.locator(".mig-inv-table tbody tr").first();
    const copiedName = await firstRow.locator('input[data-item-field="name"]').inputValue();
    const copiedServer = await firstRow.locator('select[data-item-field="physicalServer"]').inputValue();
    const copiedCpu = await firstRow.locator('input[data-item-field="cpu"]').inputValue();
    const copiedStorage1Used = await firstRow.locator('input[data-item-field="storage1.used"]').inputValue();
    assert.equal(copiedName, seedName, "le nom copié doit correspondre à la VM Existant");
    assert.equal(copiedServer, "Serveur Dijon 01", "le serveur physique copié doit correspondre au profil Existant");
    assert.equal(copiedStorage1Used, seedDisk1Used, "le stockage copié doit rester en Go, même unité que dans Existant (pas de conversion en To)");
    assert.equal(copiedCpu, seedVcpu, "le CPU copié doit correspondre à la VM Existant");

    // Tous les champs, y compris ceux copiés, doivent être modifiables. Les
    // champs de stockage réutilisent un balisage différent (.vmsizing-input)
    // du reste de la ligne (.mig-inv-input) : ils ont eu leur propre bug de
    // sauvegarde (aucun écouteur dédié), d'où un test explicite ici plutôt
    // que de supposer qu'ils suivent le même chemin que les autres champs.
    await firstRow.locator('input[data-item-field="name"]').fill("Renommé après copie");
    await firstRow.locator('input[data-item-field="cpu"]').fill("99");
    await firstRow.locator('input[data-item-field="storage1.used"]').fill("123");
    await firstRow.locator('select[data-item-field="criticality"]').selectOption("vitale");
    await firstRow.locator('select[data-item-field="treatment"]').selectOption("migration");
    await firstRow.locator('select[data-item-field="network"]').selectOption("admin");
    await page.waitForTimeout(150);

    // 4) Modifier la ligne copiée ne doit RIEN changer côté Existant.
    await gotoPage(page, baseUrl, "existant.html", "#vmsizing-server-form");
    await page.waitForTimeout(200);
    const existantNameAfter = await page.locator('#vmsizing-vm-table-body input[data-vm-field="name"]').first().inputValue();
    const existantVcpuAfter = await page.locator('#vmsizing-vm-table-body input[data-vm-field="vcpu"]').first().inputValue();
    assert.equal(existantNameAfter, seedName, "renommer la ligne copiée ne doit pas modifier la VM dans Existant");
    assert.equal(existantVcpuAfter, seedVcpu, "éditer le CPU de la ligne copiée ne doit pas modifier Existant");

    // 4bis) Un 2e lieu + un 2e serveur affecté à CE lieu : le <select>
    // "Serveur physique" du tableau Dijon ne doit jamais proposer un
    // serveur affecté à Nancy.
    await gotoPage(page, baseUrl, "migration-inventaire.html", "#mig-inv-locations-zone");
    await page.click("#add-mig-inv-location-btn");
    await page.waitForTimeout(150);
    await page.keyboard.type("Nancy");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(150);

    await gotoPage(page, baseUrl, "existant.html", "#vmsizing-server-form");
    await page.waitForTimeout(200);
    await page.click("#vmsizing-new-server-btn");
    await page.waitForTimeout(150);
    await page.locator(".vmsizing-server-name-cell").last().click();
    await page.keyboard.type("Serveur Nancy 01");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(150);
    await page.locator("#vmsizing-lieu-select").selectOption({ label: "Nancy" });
    await page.waitForTimeout(150);

    await gotoPage(page, baseUrl, "migration-inventaire.html", "#mig-inv-locations-zone");
    await page.waitForTimeout(300);
    const dijonCard = page.locator('.mig-inv-card[data-location-id]').filter({ has: page.locator('.mig-inv-card-title:text-is("Dijon")') });
    const dijonServerOptions = await dijonCard.locator('select[data-item-field="physicalServer"]').first().locator("option").allTextContents();
    assert.ok(dijonServerOptions.some((label) => label.includes("Serveur Dijon 01")), "le serveur affecté à Dijon doit être proposé dans le tableau de Dijon");
    assert.ok(!dijonServerOptions.some((label) => label.includes("Serveur Nancy 01")), "un serveur affecté à Nancy ne doit jamais apparaître dans le menu déroulant du tableau de Dijon");

    // 5) Ajoute aussi une ligne manuelle sur Dijon : doit coexister avec les
    // lignes copiées (un 2e lieu Nancy existe désormais, donc tout ce qui
    // suit cible explicitement la carte Dijon plutôt que "le" tableau).
    await dijonCard.locator(".mig-inv-add-item-btn").click();
    await page.waitForTimeout(150);
    const manualRow = dijonCard.locator(".mig-inv-table tbody tr").last();
    await manualRow.locator('input[data-item-field="name"]').fill("Switch réseau");
    await page.waitForTimeout(150);

    rowCount = await dijonCard.locator(".mig-inv-table tbody tr").count();
    assert.equal(rowCount, 3, "la ligne manuelle doit coexister avec les 2 lignes copiées");

    // 6) Persistance après rechargement : nom renommé, CPU modifié, criticité
    // et le reste doivent tenir, la 3e VM ne doit pas se recopier au rendu.
    await page.reload({ waitUntil: "load" });
    await page.waitForSelector("#mig-inv-locations-zone");
    await page.waitForTimeout(300);

    const rowCountAfterReload = await dijonCard.locator(".mig-inv-table tbody tr").count();
    assert.equal(rowCountAfterReload, 3, "aucune ligne supplémentaire ne doit être recopiée au rendu suivant");

    const firstRowAfterReload = dijonCard.locator(".mig-inv-table tbody tr").first();
    const nameAfterReload = await firstRowAfterReload.locator('input[data-item-field="name"]').inputValue();
    const cpuAfterReload = await firstRowAfterReload.locator('input[data-item-field="cpu"]').inputValue();
    const storageAfterReload = await firstRowAfterReload.locator('input[data-item-field="storage1.used"]').inputValue();
    assert.equal(nameAfterReload, "Renommé après copie", "le nom modifié sur la ligne copiée doit être persisté");
    assert.equal(cpuAfterReload, "99", "le CPU modifié sur la ligne copiée doit être persisté");
    assert.equal(storageAfterReload, "123", "le stockage modifié sur la ligne copiée doit être persisté");

    // 7) Supprimer une ligne copiée ne doit pas la faire réapparaître.
    await firstRowAfterReload.locator(".row-delete-btn").click();
    await page.waitForTimeout(150);
    const rowCountAfterDelete = await dijonCard.locator(".mig-inv-table tbody tr").count();
    assert.equal(rowCountAfterDelete, 2, "la ligne supprimée doit disparaître");

    await page.reload({ waitUntil: "load" });
    await page.waitForSelector("#mig-inv-locations-zone");
    await page.waitForTimeout(300);
    const rowCountAfterDeleteAndReload = await dijonCard.locator(".mig-inv-table tbody tr").count();
    assert.equal(rowCountAfterDeleteAndReload, 2, "une ligne copiée supprimée ne doit pas revenir au rendu suivant");
};
