/* Garde-fous pour le tableau KPIs restructuré en un groupe par objectif SMART
   (avant : un seul tableau plat avec un sélecteur "Objectif lié" par ligne) :
   - un groupe (carte + tableau) par ligne SMART, plus un groupe "Sans objectif"
     si besoin, chacun avec son propre bouton de capture 📸.
   - plus de colonne "Objectif lié" : 10 colonnes au lieu de 11, et la ligne
     d'état vide doit avoir colspan="10" (régression testée ici : elle valait
     encore "9" juste après le retrait de cette colonne).
   - ajouter un KPI depuis le "+" d'un groupe le rattache automatiquement à
     la bonne ligne SMART, sans sélecteur à choisir.
   - supprimer la sélection cochée dans un groupe ne doit pas toucher aux
     cases cochées dans un AUTRE groupe (régression testée ici : le bouton de
     suppression vidait tout `selectedKpiRows` au lieu de ne retirer que les
     indices du groupe concerné).
   - la case "tout sélectionner" d'un groupe passe à l'état indéterminé
     quand seule une partie de ses lignes est cochée. */

const { gotoPage } = require("./helpers");

module.exports = async function ({ page, baseUrl, assert }) {
    await gotoPage(page, baseUrl, "objectifs.html", "#redaction-table-body");

    for (const title of ["Objectif A", "Objectif B", "Objectif C"]) {
        await page.click("#add-redaction-row-btn");
        await page.waitForTimeout(120);
        await page.locator(".redaction-title-cell").last().click();
        await page.keyboard.type(title);
        await page.keyboard.press("Tab");
    }

    await gotoPage(page, baseUrl, "smart.html", "#smart-table-body");

    for (let i = 1; i <= 3; i += 1) {
        await page.click("#add-smart-btn");
        await page.waitForTimeout(120);
        await page.locator(".smart-objective-link-select").nth(i - 1).selectOption({ index: i });
    }
    await page.waitForTimeout(150);

    await gotoPage(page, baseUrl, "kpis.html", "#kpi-groups-container");
    await page.waitForTimeout(200);

    const groupTitles = (await page.locator(".kpi-group-card .card-header h2").allTextContents()).map((text) => text.trim());
    assert.deepEqual(groupTitles, ["Objectif A", "Objectif B", "Objectif C"], "un groupe de KPIs par objectif SMART, dans l'ordre de création");

    const captureButtonCount = await page.locator(".kpi-group-card .capture-card-btn").count();
    assert.equal(captureButtonCount, 3, "chaque groupe de KPIs doit avoir son propre bouton de capture 📸");

    const headers = (await page.locator(".kpi-group-card").first().locator("thead th").allTextContents()).map((text) => text.trim());
    assert.deepEqual(
        headers,
        ["", "N°", "Type", "KPI", "Objectif", "Mesure", "Cible", "Résultats actuels", "Écart (%)", "Commentaires"],
        "plus de colonne 'Objectif lié' : le lien est implicite au groupe"
    );

    // Groupe C n'a aucun KPI : la ligne d'état vide doit couvrir les 10 colonnes
    // (case à cocher + les 9 ci-dessus), pas seulement 9.
    const emptyStateCell = page.locator(".kpi-group-card").nth(2).locator("tbody td.empty-state");
    assert.equal(await emptyStateCell.getAttribute("colspan"), "10", "la ligne 'Aucun KPI' doit couvrir les 10 colonnes du tableau");

    // 2 KPIs dans le groupe A.
    for (const name of ["KPI A1", "KPI A2"]) {
        await page.locator(".kpi-group-card").first().locator(".kpi-group-add-btn").click();
        await page.waitForTimeout(150);
        await page.locator(".kpi-group-card").first().locator("tbody .kpi-name-cell").last().click();
        await page.keyboard.type(name);
        await page.keyboard.press("Tab");
    }

    // 1 KPI dans le groupe B.
    await page.locator(".kpi-group-card").nth(1).locator(".kpi-group-add-btn").click();
    await page.waitForTimeout(150);
    await page.locator(".kpi-group-card").nth(1).locator("tbody .kpi-name-cell").last().click();
    await page.keyboard.type("KPI B1");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(150);

    const groupANames = await page.locator(".kpi-group-card").first().locator("tbody .kpi-name-cell").allTextContents();
    assert.deepEqual(groupANames.map((t) => t.trim()), ["KPI A1", "KPI A2"], "les KPIs ajoutés depuis le '+' du groupe A doivent y rester rattachés");

    // Coche 1 des 2 KPIs du groupe A : la case "tout sélectionner" du groupe A
    // doit passer à l'état indéterminé (pas juste décochée).
    await page.locator(".kpi-group-card").first().locator("tbody .kpi-checkbox").first().check();
    await page.waitForTimeout(150);
    const groupAIndeterminate = await page.locator(".kpi-group-card").first().locator(".kpi-group-select-all").evaluate((el) => el.indeterminate);
    assert.equal(groupAIndeterminate, true, "la case 'tout sélectionner' du groupe A doit être indéterminée avec 1 KPI coché sur 2");

    // Coche l'unique KPI du groupe B.
    await page.locator(".kpi-group-card").nth(1).locator("tbody .kpi-checkbox").first().check();
    await page.waitForTimeout(150);

    // Supprime la sélection du groupe A : ne doit affecter ni le contenu ni la
    // sélection du groupe B.
    page.once("dialog", (dialog) => dialog.accept());
    await page.locator(".kpi-group-card").first().locator(".kpi-group-delete-btn").click();
    await page.waitForTimeout(300);

    const groupANamesAfterDelete = await page.locator(".kpi-group-card").first().locator("tbody .kpi-name-cell").allTextContents();
    assert.deepEqual(groupANamesAfterDelete.map((t) => t.trim()), ["KPI A2"], "seul le KPI coché du groupe A doit être supprimé");

    const groupBStillChecked = await page.locator(".kpi-group-card").nth(1).locator("tbody .kpi-checkbox").first().isChecked();
    assert.equal(groupBStillChecked, true, "supprimer la sélection du groupe A ne doit pas décocher/toucher la sélection du groupe B");

    const groupBNames = await page.locator(".kpi-group-card").nth(1).locator("tbody .kpi-name-cell").allTextContents();
    assert.deepEqual(groupBNames.map((t) => t.trim()), ["KPI B1"], "le KPI du groupe B ne doit pas avoir été supprimé");
};
