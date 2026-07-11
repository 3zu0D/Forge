/* Test de bout en bout du module Budget : Base de coûts -> TCO -> Bilan carbone ->
   Comparatifs (mode Coûts et mode Carbone). Les valeurs attendues sont calculées à la
   main dans ce fichier et recoupées avec ce qui a été vérifié manuellement en session
   (voir le calcul détaillé en commentaire plus bas). */

const { addBudgetType, addBudgetElement, typeQuantity, gotoPage } = require("./helpers");

function parseEuros(text) {
    return Number(text.replace(/[^\d,.\-]/g, "").replace(",", "."));
}

// Les totaux carbone s'affichent en kg en dessous de 1000, en tonnes au-dessus
// (voir budgetFormatCarbon dans budget.js) : on reconvertit tout en kg pour comparer.
// Important : "CO2e" contient un chiffre ("2"), il faut le retirer AVANT d'extraire
// les chiffres du nombre, sinon il se concatène à la valeur parsée.
function parseCarbonKg(text) {
    const withoutUnit = text.replace(/CO2e/i, "").trim();
    const isTonnes = /\bt\b/.test(withoutUnit);
    const value = Number(withoutUnit.replace(/[^\d,.\-]/g, "").replace(",", "."));
    return isTonnes ? value * 1000 : value;
}

function assertApprox(actual, expected, message, tolerance = 1) {
    if (Math.abs(actual - expected) > tolerance) {
        throw new Error(`${message} (attendu ~${expected}, obtenu ${actual})`);
    }
}

module.exports = async function ({ page, baseUrl, assert }) {
    // ===== Base de coûts : 1 type, 3 éléments avec des cycles et scopes différents =====
    await gotoPage(page, baseUrl, "budget-couts.html", "#budget-elements-table-body");

    await addBudgetType(page, "Infrastructure");
    await addBudgetElement(page, { name: "Serveur", nature: "capex", cycle: "five_year", price: 10000, scope: "scope3", carbonFactor: 500 });
    await addBudgetElement(page, { name: "Electricite", nature: "opex", cycle: "annual", price: 1200, scope: "scope2", carbonFactor: 50 });
    await addBudgetElement(page, { name: "Carburant", nature: "opex", cycle: "monthly", price: 80, scope: "scope1", carbonFactor: 20 });

    assert.equal(await page.locator(".budget-element-name-cell").count(), 3, "les 3 éléments doivent être créés");

    // ===== TCO 1 (Serveur=4, Electricite=10, Carburant=5) et TCO 2 (2, 6, 3) =====
    await gotoPage(page, baseUrl, "budget-tco.html", "#budget-tco-lines-table-body");

    let qty = page.locator(".budget-quantity-input");
    await typeQuantity(qty.nth(0), 4);
    await typeQuantity(qty.nth(1), 10);
    await typeQuantity(qty.nth(2), 5);

    await page.click("#add-budget-tco-btn");
    qty = page.locator(".budget-quantity-input");
    await typeQuantity(qty.nth(0), 2);
    await typeQuantity(qty.nth(1), 6);
    await typeQuantity(qty.nth(2), 3);

    // Occurrences par horizon : five_year -> ceil(H/5), annual -> H, monthly -> ceil(H*12).
    // TCO2 : CAPEX = Serveur(qté2 x 10000 x occ), OPEX = Electricite(6x1200xH) + Carburant(3x80x12H).
    const expectedCapexTco2 = { 1: 20000, 5: 20000, 10: 40000 };
    const expectedOpexTco2 = { 1: 10080, 5: 50400, 10: 100800 };

    for (const years of [1, 5, 10]) {
        const capexText = await page.locator(`#budget-tco-summary-capex-${years}`).textContent();
        const opexText = await page.locator(`#budget-tco-summary-opex-${years}`).textContent();
        assertApprox(parseEuros(capexText), expectedCapexTco2[years], `TCO2 CAPEX ${years} an(s) incorrect`);
        assertApprox(parseEuros(opexText), expectedOpexTco2[years], `TCO2 OPEX ${years} an(s) incorrect`);
    }

    // ===== Bilan carbone A (lié à TCO 1) et B (lié à TCO 2) =====
    await gotoPage(page, baseUrl, "budget-carbone.html", "#budget-carbon-lines-table-body");
    await page.selectOption("#budget-carbon-tco-source", { label: "TCO 1" });
    await page.waitForTimeout(100);

    // Scope1 = Carburant(5 x 20 x occ_monthly), Scope2 = Electricite(10 x 50 x occ_annual),
    // Scope3 = Serveur(4 x 500 x occ_five_year).
    const expectedScope1Tco1 = { 1: 1200, 5: 6000, 10: 12000 };
    const expectedScope2Tco1 = { 1: 500, 5: 2500, 10: 5000 };
    const expectedScope3Tco1 = { 1: 2000, 5: 2000, 10: 4000 };

    for (const years of [1, 5, 10]) {
        const s1 = parseCarbonKg(await page.locator(`#budget-carbon-summary-scope1-${years}`).textContent());
        const s2 = parseCarbonKg(await page.locator(`#budget-carbon-summary-scope2-${years}`).textContent());
        const s3 = parseCarbonKg(await page.locator(`#budget-carbon-summary-scope3-${years}`).textContent());
        assertApprox(s1, expectedScope1Tco1[years], `Bilan TCO1 Scope1 ${years} an(s) incorrect`, 5);
        assertApprox(s2, expectedScope2Tco1[years], `Bilan TCO1 Scope2 ${years} an(s) incorrect`, 5);
        assertApprox(s3, expectedScope3Tco1[years], `Bilan TCO1 Scope3 ${years} an(s) incorrect`, 5);
    }

    await page.locator(".budget-carbon-profile-name-cell").first().click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("Bilan Solution A");
    await page.keyboard.press("Tab");

    await page.click("#add-budget-carbon-btn");
    await page.selectOption("#budget-carbon-tco-source", { label: "TCO 2" });
    await page.waitForTimeout(100);
    await page.locator(".budget-carbon-profile-name-cell").nth(1).click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("Bilan Solution B");
    await page.keyboard.press("Tab");

    const totalText10 = await page.locator("#budget-carbon-summary-total-10").textContent();
    assertApprox(parseCarbonKg(totalText10), 12200, "Bilan TCO2 (Solution B) total 10 ans incorrect", 10);

    // ===== Comparatifs : mode Coûts puis mode Carbone =====
    await gotoPage(page, baseUrl, "budget-comparatifs.html", "#budget-comparatifs-checklist");

    const costText = await page.locator("#budget-comparatifs-table-wrapper").textContent();
    assert.ok(costText.includes("TCO 1 an"), "le comparatif Coûts doit afficher la ligne TCO 1 an");

    await page.click('#budget-comparatifs-mode-toggle [data-mode="carbon"]');
    await page.waitForTimeout(150);

    const carbonText = await page.locator("#budget-comparatifs-table-wrapper").textContent();
    assert.ok(carbonText.includes("Bilan Solution A"), "le comparatif Carbone doit afficher Bilan Solution A en en-tête");
    assert.ok(carbonText.includes("Bilan Solution B"), "le comparatif Carbone doit afficher Bilan Solution B en en-tête");
    assert.ok(carbonText.includes("Scope 1"), "le comparatif Carbone doit afficher les lignes de synthèse par scope");
};
