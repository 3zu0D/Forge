/* Garde-fous pour les couleurs d'objectifs et leur propagation :
   - chaque objectif créé sur la page Objectifs reçoit une couleur distincte
     par défaut (badge numéroté cliquable, même patron que les types de
     risques/KPI), et on peut la changer via le sélecteur de couleur partagé.
   - la couleur choisie se répercute sur la teinte de fond des lignes du
     tableau SMART liées à cet objectif (renderSmartTable() résout la couleur
     via l'objectif, pas via un index arbitraire — régression testée ici :
     getKpiGroups()/renderSmartTable() utilisaient un temps un index "de
     repli" incohérent d'une page à l'autre pour les objectifs sans couleur
     explicite). */

const { gotoPage } = require("./helpers");

module.exports = async function ({ page, baseUrl, assert }) {
    await gotoPage(page, baseUrl, "objectifs.html", "#redaction-table-body");

    await page.click("#add-redaction-row-btn");
    await page.waitForTimeout(150);
    await page.locator(".redaction-title-cell").first().click();
    await page.keyboard.type("Réduction des coûts");
    await page.keyboard.press("Tab");

    await page.click("#add-redaction-row-btn");
    await page.waitForTimeout(150);
    await page.locator(".redaction-title-cell").nth(1).click();
    await page.keyboard.type("Amélioration qualité");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(150);

    const badgeCount = await page.locator(".objective-number-btn").count();
    assert.equal(badgeCount, 2, "chaque objectif doit avoir son badge numéroté coloré");

    const badgeColors = await page.locator(".objective-number-btn").evaluateAll(
        (buttons) => buttons.map((button) => button.style.backgroundColor)
    );
    assert.notEqual(badgeColors[0], badgeColors[1], "deux objectifs fraîchement créés doivent avoir des couleurs distinctes par défaut");

    // Changer la couleur du 2e objectif via le sélecteur partagé.
    await page.locator(".objective-number-btn").nth(1).click();
    await page.waitForTimeout(150);
    await assert.doesNotReject(
        page.waitForSelector("#color-menu:not(.hidden)", { timeout: 2000 }),
        "le sélecteur de couleur doit s'ouvrir au clic sur le badge d'un objectif"
    );

    const chosenColor = await page.locator(".color-choice").nth(4).evaluate((el) => el.dataset.color);
    await page.locator(".color-choice").nth(4).click();
    await page.waitForTimeout(150);

    const menuHidden = await page.locator("#color-menu").evaluate((el) => el.classList.contains("hidden"));
    assert.equal(menuHidden, true, "le sélecteur de couleur doit se refermer après un choix");

    const newBadgeColor = await page.locator(".objective-number-btn").nth(1).evaluate((el) => el.style.backgroundColor);
    const expectedRgb = await page.evaluate((hex) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgb(${r}, ${g}, ${b})`;
    }, chosenColor);
    assert.equal(newBadgeColor, expectedRgb, "le badge doit refléter la couleur choisie dans le sélecteur");

    // Onglet SMART : la ligne liée au 2e objectif doit reprendre sa couleur.
    await gotoPage(page, baseUrl, "smart.html", "#smart-table-body");

    await page.click("#add-smart-btn");
    await page.waitForTimeout(150);
    await page.locator(".smart-objective-link-select").first().selectOption({ index: 2 });
    await page.waitForTimeout(200);

    const smartRowBg = await page.locator("#smart-table-body tr").first().evaluate((el) => el.style.backgroundColor);
    const expectedRgbaPrefix = expectedRgb.replace("rgb(", "rgba(").replace(")", "");
    assert.ok(
        smartRowBg.startsWith(expectedRgbaPrefix),
        `la ligne SMART liée à l'objectif recoloré doit reprendre sa couleur (attendu un fond commençant par ${expectedRgbaPrefix}, obtenu ${smartRowBg})`
    );
};
