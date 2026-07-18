/* Garde-fous pour la page "Tableaux libres" (tableaux entièrement dynamiques,
   colonnes ET lignes créées/nommées/supprimées à la volée) :
   - un tableau créé a bien 2 colonnes et 1 ligne par défaut, pas un tableau
     vraiment vide (rien à cliquer sinon).
   - ajouter/renommer une colonne, remplir des cellules, ajouter une ligne :
     tout persiste après rechargement.
   - supprimer une colonne retire bien SES valeurs dans toutes les lignes
     (pas seulement l'en-tête) — régression testée ici : les valeurs de
     cellule vivent dans row.cells[columnId], une colonne supprimée sans
     nettoyer ces clés laisserait des données orphelines invisibles.
   - le badge coloré d'une ligne ET le point coloré d'une colonne ouvrent
     bien le sélecteur de couleur partagé (COLOR_TARGET_REGISTRY) — ces deux
     cibles sont imbriquées dans un tableau précis (freeTableRow/
     freeTableColumn identifiés par tableId + index), pas un simple index à
     plat comme les autres listes colorées de l'app.
   - une ligne se nomme comme une colonne, et ça persiste.
   - une colonne se réorganise par glisser-déposer (poignée dédiée) : la
     valeur des cellules suit la colonne déplacée (elle vit dans
     row.cells[columnId], pas par position), et ça persiste.
   - régression capture 📸 : la cellule d'en-tête au-dessus du badge/nom de
     ligne NE DOIT PAS porter la classe .select-col — sinon elle serait
     retirée par hideStructuralCaptureColumns pendant qu'une capture, alors
     que la cellule de corps correspondante (le badge + nom de ligne) est,
     elle, toujours conservée, ce qui décalait toutes les colonnes de
     données d'un cran vers la droite par rapport à leurs en-têtes. */

const { gotoPage } = require("./helpers");

module.exports = async function ({ page, baseUrl, assert }) {
    await gotoPage(page, baseUrl, "tableaux-libres.html", "#free-tables-list");
    await page.waitForTimeout(200);

    await page.click("#add-free-table-btn");
    await page.waitForTimeout(150);

    const defaultColumns = (await page.locator(".free-table-column-name").allTextContents()).map((t) => t.trim());
    assert.deepEqual(defaultColumns, ["Colonne 1", "Colonne 2"], "un nouveau tableau doit avoir 2 colonnes par défaut");

    const defaultRowCount = await page.locator(".free-table tbody tr").count();
    assert.equal(defaultRowCount, 1, "un nouveau tableau doit avoir 1 ligne par défaut");

    // Le badge de ligne et le point de colonne doivent tous les deux ouvrir
    // le sélecteur de couleur partagé et appliquer la couleur choisie.
    await page.click(".free-table-row-number-btn");
    await page.waitForTimeout(120);
    let menuVisible = await page.locator("#color-menu").evaluate((el) => !el.classList.contains("hidden"));
    assert.ok(menuVisible, "cliquer sur le badge d'une ligne doit ouvrir le sélecteur de couleur");
    await page.locator(".color-choice").nth(3).click();
    await page.waitForTimeout(120);
    const rowColor = await page.locator(".free-table-row-number-btn").first().evaluate((el) => el.style.backgroundColor);

    await page.click(".free-table-column-color-btn");
    await page.waitForTimeout(120);
    menuVisible = await page.locator("#color-menu").evaluate((el) => !el.classList.contains("hidden"));
    assert.ok(menuVisible, "cliquer sur le point d'une colonne doit ouvrir le sélecteur de couleur");
    await page.locator(".color-choice").nth(8).click();
    await page.waitForTimeout(120);
    const columnColor = await page.locator(".free-table-column-color-btn").first().evaluate((el) => el.style.backgroundColor);

    assert.notEqual(rowColor, columnColor, "la couleur de ligne et la couleur de colonne doivent pouvoir être réglées indépendamment");

    // La cellule d'en-tête au-dessus du badge/nom de ligne ne doit jamais
    // porter .select-col (voir commentaire en tête de fichier).
    const cornerHeaderIsSelectCol = await page.locator(".free-table thead th").first().evaluate((el) => el.classList.contains("select-col"));
    assert.ok(!cornerHeaderIsSelectCol, "l'en-tête au-dessus du nom de ligne ne doit pas être une colonne structurelle retirée en capture");

    // Nomme la ligne, comme une colonne.
    await page.locator(".free-table-row-name").first().click();
    await page.keyboard.type("Fournisseur principal");
    await page.waitForTimeout(120);
    const rowNameSaved = (await page.locator(".free-table-row-name").first().textContent()).trim();
    assert.equal(rowNameSaved, "Fournisseur principal", "une ligne doit pouvoir être nommée comme une colonne");

    // Renomme le tableau et ses colonnes.
    await page.locator(".free-table-name-input").first().click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("Suivi fournisseurs");
    await page.locator("body").click({ position: { x: 5, y: 5 } });
    await page.waitForTimeout(120);

    const columnNames = page.locator(".free-table-column-name");
    await columnNames.nth(0).click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("Fournisseur");
    await columnNames.nth(1).click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("Statut");
    await page.waitForTimeout(120);

    // Ajoute une 3e colonne.
    await page.click(".free-table-add-column-btn");
    await page.waitForTimeout(120);
    const columnsAfterAdd = (await page.locator(".free-table-column-name").allTextContents()).map((t) => t.trim());
    assert.deepEqual(columnsAfterAdd, ["Fournisseur", "Statut", "Colonne 3"], "le \"+\" d'en-tête doit ajouter une 3e colonne nommée par défaut");

    // Remplit la ligne existante.
    const cells = page.locator(".free-table-cell");
    await cells.nth(0).click();
    await page.keyboard.type("ACME");
    await cells.nth(1).click();
    await page.keyboard.type("Actif");
    await cells.nth(2).click();
    await page.keyboard.type("À surveiller");
    await page.waitForTimeout(150);

    // Glisse la 1ère colonne (Fournisseur) après la 3e (Colonne 3) : la
    // valeur des cellules doit suivre la colonne, pas rester sur place.
    const dragColumn = async (fromIndex, toIndex) => {
        const handle = page.locator(".free-table-column-header").nth(fromIndex).locator(".column-drag-handle");
        const targetBox = await page.locator(".free-table-column-header").nth(toIndex).boundingBox();
        const handleBox = await handle.boundingBox();
        const targetX = toIndex > fromIndex ? targetBox.x + targetBox.width - 5 : targetBox.x + 5;

        await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(handleBox.x + 10, handleBox.y, { steps: 3 });
        await page.mouse.move(targetX, targetBox.y + targetBox.height / 2, { steps: 15 });
        await page.waitForTimeout(100);
        await page.mouse.up();
        await page.waitForTimeout(150);
    };

    await dragColumn(0, 2);
    const columnsAfterDrag = (await page.locator(".free-table-column-name").allTextContents()).map((t) => t.trim());
    assert.deepEqual(columnsAfterDrag, ["Statut", "Colonne 3", "Fournisseur"], "glisser une colonne après une autre doit la déplacer");
    const cellsAfterDrag = (await page.locator(".free-table-cell").allTextContents()).map((t) => t.trim());
    assert.deepEqual(cellsAfterDrag, ["Actif", "À surveiller", "ACME"], "les valeurs de cellule doivent suivre leur colonne déplacée, pas leur position");

    // Remet "Fournisseur" en premier pour ne pas perturber les assertions suivantes.
    await dragColumn(2, 0);
    const columnsRestored = (await page.locator(".free-table-column-name").allTextContents()).map((t) => t.trim());
    assert.deepEqual(columnsRestored, ["Fournisseur", "Statut", "Colonne 3"], "glisser une colonne avant une autre doit aussi fonctionner (ordre restauré)");

    // Persistance après rechargement.
    await page.reload({ waitUntil: "load" });
    await page.waitForSelector("#free-tables-list", { state: "attached" });
    await page.waitForTimeout(250);

    const nameAfterReload = (await page.locator(".free-table-name-input").first().textContent()).trim();
    assert.equal(nameAfterReload, "Suivi fournisseurs", "le nom du tableau doit persister après rechargement");

    const rowNameAfterReload = (await page.locator(".free-table-row-name").first().textContent()).trim();
    assert.equal(rowNameAfterReload, "Fournisseur principal", "le nom de la ligne doit persister après rechargement");

    const cellsAfterReload = (await page.locator(".free-table-cell").allTextContents()).map((t) => t.trim());
    assert.deepEqual(cellsAfterReload, ["ACME", "Actif", "À surveiller"], "les valeurs de cellule doivent persister après rechargement");

    const rowColorAfterReload = await page.locator(".free-table-row-number-btn").first().evaluate((el) => el.style.backgroundColor);
    assert.equal(rowColorAfterReload, rowColor, "la couleur de ligne choisie doit persister après rechargement");

    const columnColorAfterReload = await page.locator(".free-table-column-color-btn").first().evaluate((el) => el.style.backgroundColor);
    assert.equal(columnColorAfterReload, columnColor, "la couleur de colonne choisie doit persister après rechargement");

    // Supprime la 3e colonne ("Colonne 3", ajoutée en dernier) : sa valeur
    // doit disparaître avec elle, pas seulement son en-tête.
    await page.locator(".free-table-delete-column-btn").last().click();
    await page.waitForTimeout(120);

    const columnsAfterDelete = (await page.locator(".free-table-column-name").allTextContents()).map((t) => t.trim());
    assert.deepEqual(columnsAfterDelete, ["Fournisseur", "Statut"], "supprimer une colonne doit retirer son en-tête");

    const cellsAfterColumnDelete = (await page.locator(".free-table-cell").allTextContents()).map((t) => t.trim());
    assert.deepEqual(cellsAfterColumnDelete, ["ACME", "Actif"], "supprimer une colonne doit aussi retirer sa valeur dans la ligne, pas laisser une cellule orpheline");

    // Ajoute une ligne, puis supprime le tableau entier.
    await page.click(".free-table-add-row-btn");
    await page.waitForTimeout(120);
    const rowCountAfterAdd = await page.locator(".free-table tbody tr").count();
    assert.equal(rowCountAfterAdd, 2, "le \"+\" de bas de tableau doit ajouter une ligne");

    page.once("dialog", (dialog) => dialog.accept());
    await page.click(".free-table-delete-btn");
    await page.waitForTimeout(150);

    const cardCountAfterDelete = await page.locator(".free-table-card").count();
    assert.equal(cardCountAfterDelete, 0, "supprimer le tableau doit retirer sa carte");

    const emptyStateVisible = await page.locator(".free-tables-empty-state").isVisible();
    assert.ok(emptyStateVisible, "un état vide doit s'afficher une fois le dernier tableau supprimé");
};
