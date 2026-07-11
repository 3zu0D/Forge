/* Vérifie que la nav rendue par renderPageNav() (script.js) est cohérente sur
   plusieurs pages représentatives : bon lien actif, même nombre total de liens
   partout, dropdown affichable au survol. Garde-fou direct pour la dédup de la nav
   (autrefois dupliquée en dur dans les ~24 fichiers HTML). */

const { gotoPage } = require("./helpers");

const EXPECTED_TOTAL_LINKS = 25; // 1 + 7 + 4 + 8 + 1 + 4, voir FORGE_NAV_GROUPS dans script.js

const PAGES = [
    { path: "dashboard.html", expectedActive: "Tableau de bord" },
    { path: "wbs.html", expectedActive: "WBS" },
    { path: "budget-couts.html", expectedActive: "Base de coûts" },
    { path: "budget-carbone.html", expectedActive: "Bilan carbone" }
];

module.exports = async function ({ page, baseUrl, assert }) {
    for (const { path, expectedActive } of PAGES) {
        await gotoPage(page, baseUrl, path, "#page-nav .nav-link");

        const linkCount = await page.locator("#page-nav .nav-link").count();
        assert.equal(linkCount, EXPECTED_TOTAL_LINKS, `${path}: nombre de liens de nav inattendu`);

        const activeLinks = page.locator("#page-nav .nav-link.active");
        assert.equal(await activeLinks.count(), 1, `${path}: doit avoir exactement un lien actif`);

        const activeText = await activeLinks.textContent();
        assert.equal(activeText, expectedActive, `${path}: mauvais lien actif`);
    }

    // Le dropdown au survol doit exposer les liens masqués par défaut (CSS hover).
    await gotoPage(page, baseUrl, "dashboard.html", "#page-nav .nav-link");
    await page.hover('#page-nav .nav-group:has-text("Pilotage")');
    await page.waitForSelector('#page-nav a[href="wbs.html"]', { state: "visible" });

    // La navigation par clic doit fonctionner (liens réels, pas de JS de routing custom).
    await Promise.all([page.waitForNavigation({ waitUntil: "load" }), page.click('#page-nav a[href="wbs.html"]')]);
    assert.ok(page.url().endsWith("wbs.html"), "le clic sur le lien de nav doit naviguer vers wbs.html");
};
