/* Garde-fou pour un bug de capture RACI : capturer une seule phase masque
   temporairement les lignes des autres phases (captureRaciPhase), ce qui
   rétrécit la page — sur un gros RACI, le navigateur recadre alors tout seul
   le scroll pour rester dans les bornes valides, AVANT même que
   captureCardToClipboard ne démarre. Une 1ère version du fix sauvegardait la
   position de scroll trop tard (dans captureCardToClipboard), donc elle
   "restaurait" une position déjà perdue : l'utilisateur qui capturait une
   phase après avoir scrollé loin dans le tableau se retrouvait systématiquement
   renvoyé en haut de page. Le même bug touche captureWbsPhase et
   captureDecoupagePhase (même structure hide-rows puis capture). */

const { gotoPage } = require("./helpers");

module.exports = async function ({ page, baseUrl, assert }) {
    await gotoPage(page, baseUrl, "raci.html", ".raci-table");

    // Assez de phases/tâches/parties prenantes pour que la page soit nettement
    // plus haute que le viewport, et que masquer 3 phases sur 4 la rétrécisse
    // franchement (condition nécessaire pour déclencher le recadrage navigateur).
    await page.evaluate(() => {
        phases = Array.from({ length: 4 }, (_, i) => ({
            id: createId(),
            color: predefinedColors[i % predefinedColors.length],
            name: `Phase ${i + 1}`
        }));
        stakeholders = Array.from({ length: 6 }, (_, i) => ({
            id: createId(),
            color: predefinedColors[i % predefinedColors.length],
            name: `Partie prenante ${i + 1}`
        }));
        wbsRows = [];
        phases.forEach((phase) => {
            for (let i = 0; i < 15; i++) {
                wbsRows.push({ id: createId(), phaseId: phase.id, task: `Tâche ${phase.name} #${i + 1}`, start: "", end: "", progress: 0 });
            }
        });
        savePhases();
        saveStakeholders();
        saveWbsRows();
        renderRaciTable();
    });
    await page.waitForTimeout(200);

    // Scroll jusqu'à la ligne d'en-tête de Phase 3, façon utilisateur qui vient
    // de descendre dans le tableau pour la retrouver, sans passer par
    // scroll-behavior:smooth (asynchrone) pour garder un point de départ net.
    await page.evaluate(() => {
        document.documentElement.style.scrollBehavior = "auto";
        const row = Array.from(document.querySelectorAll(".raci-phase-row")).find((r) => r.textContent.includes("Phase 3"));
        row.scrollIntoView({ block: "center", behavior: "instant" });
        document.documentElement.style.scrollBehavior = "";
    });
    await page.waitForTimeout(150);

    const scrollBefore = await page.evaluate(() => window.scrollY);
    assert.ok(scrollBefore > 200, `le test doit démarrer scrollé loin dans la page (scrollY=${scrollBefore})`);

    // Clic direct par coordonnées souris (pas .click() de Playwright, qui a sa
    // propre heuristique d'auto-scroll-into-view et fausserait le test : le
    // bouton de Phase 3 est déjà visible à l'écran, comme pour un vrai clic).
    const box = await page.locator('.raci-phase-row:has-text("Phase 3") .raci-phase-capture-btn').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.up();

    await page.waitForTimeout(3000);

    const scrollAfter = await page.evaluate(() => window.scrollY);
    assert.equal(scrollAfter, scrollBefore, `la capture d'une phase ne doit pas faire perdre la position de scroll (avant: ${scrollBefore}, après: ${scrollAfter})`);
};
