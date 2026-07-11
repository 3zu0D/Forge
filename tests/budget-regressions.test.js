/* Garde-fous pour deux bugs réels livrés puis corrigés dans le module Budget :
   1) la cellule "nom d'élément" (contenteditable) agrandissait toute la table quand
      on tapait un texte long, faute de table-layout: fixed.
   2) le champ "Quantité" du TCO perdait le focus après chaque caractère tapé, parce
      que l'input recréait tout le tbody à chaque frappe (perte du focus + du curseur). */

const { addBudgetType, addBudgetElement, gotoPage } = require("./helpers");

module.exports = async function ({ page, baseUrl, assert }) {
    // ----- Régression n°1 : la table ne doit pas s'élargir quand on tape un nom long -----
    await gotoPage(page, baseUrl, "budget-couts.html", "#budget-elements-table-body");

    await addBudgetType(page, "Infrastructure");
    await addBudgetElement(page, { name: "X", nature: "capex", price: 100 });

    const tableBefore = await page.locator(".budget-elements-table").boundingBox();

    const nameCell = page.locator(".budget-element-name-cell").first();
    await nameCell.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type(
        "Un nom d'element vraiment tres long pour verifier que la cellule ne pousse plus le reste du tableau vers la droite"
    );

    const tableAfter = await page.locator(".budget-elements-table").boundingBox();

    assert.ok(
        tableAfter.width <= tableBefore.width + 2,
        `la table ne doit pas s'élargir en tapant un nom long (avant: ${tableBefore.width}px, après: ${tableAfter.width}px)`
    );

    // ----- Régression n°2 : le champ Quantité doit accepter plusieurs frappes de suite -----
    await gotoPage(page, baseUrl, "budget-tco.html", "#budget-tco-lines-table-body");

    const quantityInput = page.locator(".budget-quantity-input").first();
    await quantityInput.click();
    await quantityInput.press("Control+A");

    // On tape chiffre par chiffre avec un petit délai : si le champ perd le focus
    // après la 1ère frappe (comme le bug d'origine), seul le "1" (ou le "2") arrive.
    await page.keyboard.type("42", { delay: 120 });

    const value = await quantityInput.inputValue();
    assert.equal(value.replace(/^0+(?=\d)/, ""), "42", `le champ Quantité doit contenir "42" après avoir tapé "4" puis "2", a reçu "${value}"`);
};
