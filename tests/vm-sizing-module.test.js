/* Garde-fous pour la page "Dimensionnement VM" après la refonte qui fusionne
   "Caractéristiques du serveur", "Utilisation actuelle" et "Machines
   virtuelles" en une seule carte, et retire les champs Overcommit CPU/RAM et
   Réserve CPU/RAM/Stockage (%) :
   - une seule carte dans la zone principale (plus 3 cartes séparées).
   - les 5 champs overcommit/réserve ont disparu du formulaire.
   - le calcul de capacité n'en tient plus compte : capacité utilisable =
     valeurs brutes (sockets × cœurs × threads pour le CPU, RAM/stockage
     totaux tels quels) — pas de overcommit ni d'abattement de réserve. */

const { gotoPage } = require("./helpers");

module.exports = async function ({ page, baseUrl, assert }) {
    await gotoPage(page, baseUrl, "vm-sizing.html", "#vmsizing-server-form");
    await page.waitForTimeout(200);

    const cardCount = await page.locator(".vmsizing-main-zone > .card").count();
    assert.equal(cardCount, 1, "les 3 cartes doivent être fusionnées en une seule");

    const removedFields = await page
        .locator(
            '[data-field="cpuOvercommitRatio"], [data-field="ramOvercommitRatio"], [data-field="reservedCpuPercent"], [data-field="reservedRamPercent"], [data-field="reservedStoragePercent"]'
        )
        .count();
    assert.equal(removedFields, 0, "les champs overcommit et réserve doivent avoir disparu du formulaire");

    const remainingFields = await page.locator("#vmsizing-server-form [data-field]").evaluateAll((els) => els.map((el) => el.dataset.field));
    assert.deepEqual(
        remainingFields,
        ["name", "cpuSockets", "cpuCoresPerSocket", "cpuThreadsPerCore", "ramGB", "volume1GB", "volume2GB"],
        "seuls les 7 champs de specs de base doivent rester"
    );

    // Jauges et tableau des VM doivent vivre dans la même carte fusionnée.
    const gaugesInCard = await page.locator(".vmsizing-server-card .vmsizing-gauge-grid").count();
    const vmTableInCard = await page.locator(".vmsizing-server-card .vmsizing-vm-table").count();
    assert.ok(gaugesInCard === 1 && vmTableInCard === 1, "les jauges et le tableau des VM doivent être dans la carte fusionnée");

    // Profil de seed : 2 sockets × 16 cœurs × 2 threads = 64 vCPU utilisables
    // (aucun overcommit), 256 Go de RAM, Volume 1 = 4000 Go / Volume 2 = 2000 Go.
    const cpuDetail = (await page.locator("#vmsizing-cpu-detail").textContent()).trim();
    assert.ok(cpuDetail.endsWith("/ 64 vCPU"), `capacité CPU brute attendue (64 vCPU) : ${cpuDetail}`);

    const ramDetail = (await page.locator("#vmsizing-ram-detail").textContent()).trim();
    assert.ok(ramDetail.endsWith("/ 256 Go"), `capacité RAM brute attendue (256 Go) : ${ramDetail}`);

    const volume1Detail = (await page.locator("#vmsizing-volume1-detail").textContent()).trim();
    assert.ok(volume1Detail.endsWith("/ 4000 Go"), `capacité Volume 1 brute attendue (4000 Go) : ${volume1Detail}`);

    const volume2Detail = (await page.locator("#vmsizing-volume2-detail").textContent()).trim();
    assert.ok(volume2Detail.endsWith("/ 2000 Go"), `capacité Volume 2 brute attendue (2000 Go) : ${volume2Detail}`);

    // Changer le nombre de sockets doit immédiatement recalculer la capacité brute.
    const socketsInput = page.locator('#vmsizing-server-form [data-field="cpuSockets"]');
    await socketsInput.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("4");
    await page.waitForTimeout(150);

    const cpuDetailAfter = (await page.locator("#vmsizing-cpu-detail").textContent()).trim();
    assert.ok(cpuDetailAfter.endsWith("/ 128 vCPU"), `4 sockets × 16 cœurs × 2 threads = 128 vCPU : ${cpuDetailAfter}`);

    // Persistance après rechargement.
    await page.reload({ waitUntil: "load" });
    await page.waitForSelector("#vmsizing-server-form", { state: "attached" });
    await page.waitForTimeout(250);

    const cpuDetailAfterReload = (await page.locator("#vmsizing-cpu-detail").textContent()).trim();
    assert.ok(cpuDetailAfterReload.endsWith("/ 128 vCPU"), `la capacité recalculée doit persister après rechargement : ${cpuDetailAfterReload}`);
};
