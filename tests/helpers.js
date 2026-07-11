/* Petits helpers partagés entre les fichiers de tests. Pas de framework de test :
   chaque fichier tests/*.test.js exporte une fonction async (context) => { ... }
   qui lève une AssertionError en cas d'échec. Voir scripts/run-tests.js. */

async function addBudgetType(page, name) {
    await page.click("#add-budget-type-btn");
    const cell = page.locator(".budget-type-name-cell").last();
    await cell.click();
    await page.keyboard.type(name);
    await page.keyboard.press("Tab");
}

// Ajoute un élément au premier type disponible (celui dont le bouton "+ Élément"
// apparaît en premier) et renseigne tous ses champs. Retourne son index dans la
// liste .budget-element-name-cell, utile pour cibler les autres colonnes de la ligne.
async function addBudgetElement(page, { name, nature = "capex", cycle = "perpetual", price = 0, scope = "scope3", carbonFactor = 0 }) {
    await page.locator(".budget-type-add-btn").first().click();
    const index = (await page.locator(".budget-element-name-cell").count()) - 1;

    const nameCell = page.locator(".budget-element-name-cell").nth(index);
    await nameCell.click();
    await page.keyboard.type(name);
    await page.keyboard.press("Tab");

    await page.locator(".budget-nature-select").nth(index).selectOption(nature);
    await page.locator(".budget-cycle-select").nth(index).selectOption(cycle);
    await page.locator(".budget-price-input").nth(index).fill(String(price));
    await page.locator(".budget-scope-select").nth(index).selectOption(scope);
    await page.locator(".budget-carbon-input").nth(index).fill(String(carbonFactor));

    return index;
}

// Tape un nombre touche par touche (au lieu de .fill()) pour reproduire exactement
// la façon dont un humain tape dans le champ, condition nécessaire pour repérer une
// régression du type "le champ perd le focus après la 1ère touche".
async function typeQuantity(locator, value) {
    await locator.click();
    await locator.press("Control+A");
    await locator.type(String(value), { delay: 30 });
}

async function gotoPage(page, baseUrl, path, bodySelector) {
    await page.goto(`${baseUrl}/${path}`, { waitUntil: "load" });
    await page.waitForSelector(bodySelector, { state: "attached" });
}

module.exports = { addBudgetType, addBudgetElement, typeQuantity, gotoPage };
