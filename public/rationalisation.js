/* Forge — Rationalisation : un tableau miroir par lieu, à côté de son
   tableau Inventaire de Migration. À gauche l'état actuel (lecture seule,
   dérivé en direct des lieux d'Inventaire de Migration — pas de copie, pas
   de sidebar "Lieux" ici, tout se gère là-bas). À droite, une cible libre
   (CPU/RAM/stockage) à remplir pour chaque ligne, stockée séparément et
   jamais écrasée par un changement côté Inventaire de Migration. */

const RATIONALISATION_TARGETS_STORAGE_TYPE = "rationalisation_targets";

let rationTargets = {};

/* ===== État actuel : lecture directe d'Inventaire de Migration ===== */

// migration-inventaire.js n'est pas chargé sur cette page : même principe
// que migInvGetExistantProfiles() côté Inventaire de Migration, lecture
// directe de la clé de stockage plutôt qu'un import.
function rationGetMigInvLocations() {
    try {
        const parsed = JSON.parse(localStorage.getItem(getProjectKey("migration_inventory_locations")) || "[]");
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
}

/* ===== Cibles : modèle propre à cette page ===== */

function rationDefaultTarget() {
    return {
        cpu: 0,
        ramGB: 0,
        storage1: { used: 0, available: 0 },
        storage2: { used: 0, available: 0 },
        storage3: { used: 0, available: 0 },
        justification: ""
    };
}

function rationNormalizeTarget(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const normalized = {
        cpu: parseNumber(source.cpu),
        ramGB: parseNumber(source.ramGB),
        justification: typeof source.justification === "string" ? source.justification : ""
    };

    ["storage1", "storage2", "storage3"].forEach((key) => {
        const storage = source[key] && typeof source[key] === "object" ? source[key] : {};
        normalized[key] = { used: parseNumber(storage.used), available: parseNumber(storage.available) };
    });

    return normalized;
}

function rationLoadTargets() {
    let parsed = {};
    try {
        parsed = JSON.parse(localStorage.getItem(getProjectKey(RATIONALISATION_TARGETS_STORAGE_TYPE)) || "{}");
    } catch (error) {
        parsed = {};
    }

    const normalized = {};
    if (parsed && typeof parsed === "object") {
        Object.keys(parsed).forEach((itemId) => {
            normalized[itemId] = rationNormalizeTarget(parsed[itemId]);
        });
    }

    return normalized;
}

function rationSaveTargets() {
    localStorage.setItem(getProjectKey(RATIONALISATION_TARGETS_STORAGE_TYPE), JSON.stringify(rationTargets));
}

function rationGetTarget(itemId) {
    if (!rationTargets[itemId]) {
        rationTargets[itemId] = rationDefaultTarget();
    }

    return rationTargets[itemId];
}

/* ===== Couleurs : même mécanisme que Inventaire de Migration (teinte du
   lieu + variation par serveur physique), dupliqué ici puisque
   migration-inventaire.js n'est pas chargé sur cette page. ===== */

const RATION_SERVER_TINT_ALPHAS = [0.04, 0.13, 0.24, 0.08, 0.18, 0.28];

function rationGetServerVariantIndexes(items) {
    const indexByServer = new Map();

    items.forEach((item) => {
        const key = (item.physicalServer || "").trim().toLowerCase();
        if (!key || indexByServer.has(key)) return;
        indexByServer.set(key, indexByServer.size);
    });

    return indexByServer;
}

function rationRowBoxShadow(color, serverVariantIndex) {
    const alpha = serverVariantIndex === undefined
        ? 0.09
        : RATION_SERVER_TINT_ALPHAS[serverVariantIndex % RATION_SERVER_TINT_ALPHAS.length];
    return `inset 0 0 0 9999px ${hexToRgba(color, alpha)}`;
}

/* ===== Rendu ===== */

// Un 0 sur une cible non encore réfléchie a moins de sens qu'un champ vide
// avec un repère visuel (placeholder) : évite un mur de "0" partout tant que
// personne n'a rempli la cible.
function rationDisplayValue(value) {
    return value ? value : "";
}

// Une cible non encore remplie (0/vide, voir rationDisplayValue) n'est pas
// "différente" de l'état actuel — seule une valeur explicitement saisie qui
// ne correspond pas à l'état actuel doit ressortir en rouge (demande
// d'Olivier : rendre visibles les écarts entre les deux tableaux jumeaux).
function rationIsDifferent(targetValue, currentValue) {
    return Boolean(targetValue) && targetValue !== currentValue;
}

function rationDiffClass(targetValue, currentValue) {
    return rationIsDifferent(targetValue, currentValue) ? " rationalisation-diff" : "";
}

function rationBuildReadonlyStorageCell(storage) {
    const safe = storage && typeof storage === "object" ? storage : { used: 0, available: 0 };
    return `
        <td class="rationalisation-readonly-cell">
            <div class="vmsizing-disk-mini-row">
                <span class="rationalisation-readonly-chip">${parseNumber(safe.used)}</span>
                <span class="rationalisation-readonly-chip">${parseNumber(safe.available)}</span>
            </div>
        </td>
    `;
}

function rationBuildEditableStorageCell(itemId, target, storageKey, currentStorage) {
    const storage = target[storageKey];
    const current = currentStorage && typeof currentStorage === "object" ? currentStorage : { used: 0, available: 0 };
    const usedCurrent = parseNumber(current.used);
    const availableCurrent = parseNumber(current.available);

    return `
        <td>
            <div class="vmsizing-disk-mini-row">
                <input type="number" class="vmsizing-input vmsizing-input-num vmsizing-disk-input${rationDiffClass(storage.used, usedCurrent)}" min="0" placeholder="0" title="Utilisé (Go)" aria-label="${storageKey} cible utilisé (Go)" data-item-id="${escapeHtml(itemId)}" data-target-field="${storageKey}.used" data-current-value="${usedCurrent}" value="${rationDisplayValue(storage.used)}" />
                <input type="number" class="vmsizing-input vmsizing-input-num vmsizing-disk-input${rationDiffClass(storage.available, availableCurrent)}" min="0" placeholder="0" title="Disponible (Go)" aria-label="${storageKey} cible disponible (Go)" data-item-id="${escapeHtml(itemId)}" data-target-field="${storageKey}.available" data-current-value="${availableCurrent}" value="${rationDisplayValue(storage.available)}" />
            </div>
        </td>
    `;
}

function rationBuildRowHtml(item, index, color, serverVariantIndex) {
    const target = rationGetTarget(item.id);
    const cpuCurrent = parseNumber(item.cpu);
    const ramCurrent = parseNumber(item.ramGB);

    return `
        <tr data-row-id="${escapeHtml(item.id)}" style="box-shadow: ${rationRowBoxShadow(color, serverVariantIndex)};">
            <td class="rationalisation-col-num rationalisation-readonly-cell">${index + 1}</td>
            <td class="rationalisation-readonly-cell">${escapeHtml(item.name || "")}</td>
            <td class="rationalisation-readonly-cell">${escapeHtml(item.physicalServer || "")}</td>
            <td class="rationalisation-readonly-cell rationalisation-num-cell"><span class="rationalisation-readonly-chip">${parseNumber(item.cpu)}</span></td>
            <td class="rationalisation-readonly-cell rationalisation-num-cell"><span class="rationalisation-readonly-chip">${parseNumber(item.ramGB)}</span></td>
            ${rationBuildReadonlyStorageCell(item.storage1)}
            ${rationBuildReadonlyStorageCell(item.storage2)}
            ${rationBuildReadonlyStorageCell(item.storage3)}
            <td class="rationalisation-target-divider"><input type="number" class="vmsizing-input vmsizing-input-num${rationDiffClass(target.cpu, cpuCurrent)}" min="0" placeholder="0" aria-label="CPU cible" data-item-id="${escapeHtml(item.id)}" data-target-field="cpu" data-current-value="${cpuCurrent}" value="${rationDisplayValue(target.cpu)}" /></td>
            <td><input type="number" class="vmsizing-input vmsizing-input-num${rationDiffClass(target.ramGB, ramCurrent)}" min="0" placeholder="0" aria-label="RAM cible (Go)" data-item-id="${escapeHtml(item.id)}" data-target-field="ramGB" data-current-value="${ramCurrent}" value="${rationDisplayValue(target.ramGB)}" /></td>
            ${rationBuildEditableStorageCell(item.id, target, "storage1", item.storage1)}
            ${rationBuildEditableStorageCell(item.id, target, "storage2", item.storage2)}
            ${rationBuildEditableStorageCell(item.id, target, "storage3", item.storage3)}
            <td><input type="text" class="vmsizing-input rationalisation-justification-input" placeholder="—" aria-label="Justification" data-item-id="${escapeHtml(item.id)}" data-target-field="justification" value="${escapeHtml(target.justification || "")}" /></td>
        </tr>
    `;
}

function rationBuildTableHtml(location, color) {
    const items = Array.isArray(location.items) ? location.items : [];
    const serverVariants = rationGetServerVariantIndexes(items);

    const rowsHtml = items.length
        ? items.map((item, index) => {
            const serverKey = (item.physicalServer || "").trim().toLowerCase();
            const serverVariantIndex = serverKey ? serverVariants.get(serverKey) : undefined;
            return rationBuildRowHtml(item, index, color, serverVariantIndex);
        }).join("")
        : `<tr><td colspan="14" class="empty-state">Aucune ligne pour le moment — ajoute des VM à ce lieu dans Inventaire de Migration.</td></tr>`;

    return `
        <table class="rationalisation-table">
            <colgroup>
                <col class="rationalisation-col-num" />
                <col class="rationalisation-col-name" />
                <col class="rationalisation-col-server" />
                <col class="rationalisation-col-cpu" />
                <col class="rationalisation-col-ram" />
                <col class="rationalisation-col-storage" />
                <col class="rationalisation-col-storage" />
                <col class="rationalisation-col-storage" />
                <col class="rationalisation-col-cpu" />
                <col class="rationalisation-col-ram" />
                <col class="rationalisation-col-storage" />
                <col class="rationalisation-col-storage" />
                <col class="rationalisation-col-storage" />
                <col class="rationalisation-col-justification" />
            </colgroup>
            <thead>
                <tr>
                    <th class="rationalisation-col-num" rowspan="2">N°</th>
                    <th class="rationalisation-col-name" rowspan="2">Nom</th>
                    <th class="rationalisation-col-server" rowspan="2">Serveur physique</th>
                    <th colspan="5" class="rationalisation-group-header rationalisation-group-current">État actuel</th>
                    <th colspan="5" class="rationalisation-group-header rationalisation-group-target">Cible</th>
                    <th class="rationalisation-col-justification" rowspan="2">Justification</th>
                </tr>
                <tr>
                    <th class="rationalisation-col-cpu">CPU</th>
                    <th class="rationalisation-col-ram">RAM (Go)</th>
                    <th class="rationalisation-col-storage">
                        <span class="vmsizing-disk-header-title">Stockage 1 (Go)</span>
                        <span class="vmsizing-disk-header-sub"><span>Util.</span><span>Dispo.</span></span>
                    </th>
                    <th class="rationalisation-col-storage">
                        <span class="vmsizing-disk-header-title">Stockage 2 (Go)</span>
                        <span class="vmsizing-disk-header-sub"><span>Util.</span><span>Dispo.</span></span>
                    </th>
                    <th class="rationalisation-col-storage">
                        <span class="vmsizing-disk-header-title">Stockage 3 (Go)</span>
                        <span class="vmsizing-disk-header-sub"><span>Util.</span><span>Dispo.</span></span>
                    </th>
                    <th class="rationalisation-col-cpu rationalisation-target-divider">CPU</th>
                    <th class="rationalisation-col-ram">RAM (Go)</th>
                    <th class="rationalisation-col-storage">
                        <span class="vmsizing-disk-header-title">Stockage 1 (Go)</span>
                        <span class="vmsizing-disk-header-sub"><span>Util.</span><span>Dispo.</span></span>
                    </th>
                    <th class="rationalisation-col-storage">
                        <span class="vmsizing-disk-header-title">Stockage 2 (Go)</span>
                        <span class="vmsizing-disk-header-sub"><span>Util.</span><span>Dispo.</span></span>
                    </th>
                    <th class="rationalisation-col-storage">
                        <span class="vmsizing-disk-header-title">Stockage 3 (Go)</span>
                        <span class="vmsizing-disk-header-sub"><span>Util.</span><span>Dispo.</span></span>
                    </th>
                </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
        </table>
    `;
}

function renderRationalisationCards() {
    const list = document.getElementById("rationalisation-list");
    if (!list) return;

    const locations = rationGetMigInvLocations();

    if (locations.length === 0) {
        list.innerHTML = `
            <section class="card rationalisation-empty-card">
                <div class="mig-inv-empty-content">
                    <h2>Aucun lieu pour le moment</h2>
                    <p>Crée un lieu dans Inventaire de Migration pour voir apparaître son tableau ici.</p>
                </div>
            </section>
        `;
        return;
    }

    list.innerHTML = locations
        .map((location, index) => {
            const color = normalizeColor(location.color, index);
            return `
                <section class="card rationalisation-card" data-location-id="${escapeHtml(location.id)}" style="border-left: 4px solid ${color};">
                    <div class="card-header">
                        <h2 class="rationalisation-card-title">${escapeHtml(location.name || "Lieu sans nom")}</h2>
                    </div>
                    <div class="table-wrapper">
                        ${rationBuildTableHtml(location, color)}
                    </div>
                </section>
            `;
        })
        .join("");

    bindRationalisationEvents();
}

function bindRationalisationEvents() {
    document.querySelectorAll(".rationalisation-table [data-target-field]").forEach((input) => {
        input.addEventListener("input", (event) => {
            const itemId = event.target.dataset.itemId;
            const field = event.target.dataset.targetField;
            const target = rationGetTarget(itemId);

            if (field === "justification") {
                target.justification = event.target.value;
            } else if (field.includes(".")) {
                const [group, subField] = field.split(".");
                target[group][subField] = parseNumber(event.target.value);
            } else {
                target[field] = parseNumber(event.target.value);
            }

            rationSaveTargets();

            // Écart visible en direct pendant la saisie, pas seulement au
            // rendu initial (voir rationIsDifferent) — seuls les champs
            // numériques ont un jumeau "état actuel" à comparer (repéré par
            // data-current-value) ; la justification n'en a pas.
            if (event.target.dataset.currentValue !== undefined) {
                const currentValue = parseNumber(event.target.dataset.currentValue);
                const newValue = parseNumber(event.target.value);
                event.target.classList.toggle("rationalisation-diff", rationIsDifferent(newValue, currentValue));
            }
        });
    });
}

/* ===== Init ===== */

function initRationalisationPage() {
    if (typeof helpTexts !== "undefined") {
        helpTexts["rationalisation"] = `
            <p>Un tableau par lieu, dérivé automatiquement d'Inventaire de Migration — les lieux et leurs VM se gèrent là-bas, ils apparaissent ici tout seuls.</p>
            <p>À gauche, l'état actuel (nom, serveur physique, CPU, RAM, stockage) en lecture seule. À droite, une colonne "Cible" à remplir toi-même avec les valeurs visées après rationalisation.</p>
            <p>Chaque lieu a son propre bouton de capture 📸 qui prend les deux tableaux ensemble.</p>
        `;
    }

    rationTargets = rationLoadTargets();
    renderRationalisationCards();
}
