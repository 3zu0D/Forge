/* Garde-fou pour une famille de bugs de capture 📸 découverte en auditant tout
   l'app après un bug similaire trouvé dans Tableaux libres :

   hideStructuralCaptureColumns() (script.js) retire, juste avant une capture,
   TOUT élément qui matche ".select-col" (ou les variantes wbs-move- et
   phase-col-select) — que ce soit dans le thead ou le tbody. Si la
   cellule d'en-tête d'une colonne "structurelle" (case à cocher, bouton de
   suppression...) et sa cellule de corps ne portent pas exactement la même
   classe retirable, l'une des deux survit à la capture et l'autre non : le
   nombre de colonnes du thead et du tbody divergent, et toutes les colonnes
   de données affichées apparaissent décalées d'un cran par rapport à leurs
   en-têtes dans l'image capturée.

   4 tables avaient ce bug (sens inverse de celui de Tableaux libres : ici
   c'est l'en-tête qui utilisait une classe propre à la page pour son style
   de largeur — ex. "kpi-type-col-select" — au lieu de la classe partagée
   "select-col" que porte sa case à cocher en <tbody>) :
   - Types de KPIs (kpis.html)
   - Types de risques (risques.html)
   - Catégories de compétences (competences.html)
   - Serveurs (vm-sizing.html)

   Fix : ajouter "select-col" en 2e classe sur le <th> concerné (garde sa
   largeur CSS propre à la page, gagne le retrait symétrique en capture).
   Ce test ne fait pas de vraie capture PNG (lent, redondant avec les tests
   dédiés existants) : il reproduit exactement la même règle de retrait que
   hideStructuralCaptureColumns et vérifie que thead/tbody ont le même nombre
   de colonnes après coup — la garantie structurelle qui, si elle casse à
   nouveau, produit ce décalage visuel. */

const { gotoPage } = require("./helpers");

// Même sélecteur que hideStructuralCaptureColumns() dans public/script.js —
// dupliqué ici volontairement : le test doit continuer à détecter une
// régression même si quelqu'un modifie ce sélecteur sans le garder en tête.
const CAPTURE_REMOVAL_SELECTOR =
    "th.select-col, td.select-col, col.phase-col-select, col[class*='select'], .select-col, .wbs-move-header, .wbs-move-cell, col.wbs-col-move";

const CASES = [
    { page: "kpis.html", table: ".kpi-types-table", waitSel: "#kpi-types-table-body", addBtn: "#add-kpi-type-btn" },
    { page: "risques.html", table: ".risk-types-table", waitSel: "#risk-types-table-body", addBtn: "#add-risk-type-btn" },
    { page: "competences.html", table: ".competence-categories-table", waitSel: "#competence-categories-table-body", addBtn: "#add-competence-category-btn" },
    { page: "vm-sizing.html", table: ".vmsizing-servers-table", waitSel: "#vmsizing-server-table-body", addBtn: "#vmsizing-new-server-btn" }
];

module.exports = async function ({ page, baseUrl, assert }) {
    for (const testCase of CASES) {
        await gotoPage(page, baseUrl, testCase.page, testCase.waitSel);
        await page.click(testCase.addBtn);
        await page.waitForTimeout(150);

        const { headCount, bodyCount } = await page.evaluate(
            ({ tableSelector, removalSelector }) => {
                const table = document.querySelector(tableSelector);
                const card = table.closest(".card");
                card.querySelectorAll(removalSelector).forEach((el) => el.remove());

                const headCount = table.querySelectorAll(":scope > thead > tr > th").length;
                const bodyRow = table.querySelector(":scope > tbody > tr");
                const bodyCount = bodyRow ? bodyRow.querySelectorAll(":scope > td").length : null;

                return { headCount, bodyCount };
            },
            { tableSelector: testCase.table, removalSelector: CAPTURE_REMOVAL_SELECTOR }
        );

        assert.equal(
            headCount,
            bodyCount,
            `${testCase.page} : après le retrait des colonnes structurelles (comme en capture 📸), le thead (${headCount} colonnes) doit correspondre au tbody (${bodyCount} colonnes) — sinon les données affichées se décalent par rapport à leurs en-têtes dans l'image capturée`
        );
    }
};
