/* Forge — Inventaire de Migration : un tableau par lieu.
   Une VM d'un serveur Existant affecté à ce lieu (champ "Lieu (migration)"
   sur Existant) est copiée automatiquement ici comme une ligne normale dès
   qu'elle apparaît (item.sourceVmKey mémorise son origine pour éviter de la
   recopier en double) — mais à partir de là, TOUS ses champs sont
   entièrement libres, y compris ceux repris d'Existant (nom, CPU, RAM,
   stockage...) : modifier l'un ou l'autre plus tard ne resynchronise plus
   rien, exactement comme une ligne ajoutée à la main. Supprimer une ligne
   copiée automatiquement l'ajoute à location.dismissedVmKeys pour qu'elle ne
   revienne pas au prochain rendu. */

const MIG_INV_LOCATIONS_STORAGE_TYPE = "migration_inventory_locations";

const MIG_INV_CRITICALITY_OPTIONS = [
    { value: "vitale", label: "Vitale" },
    { value: "operationnelle", label: "Opérationnelle" },
    { value: "secondaire", label: "Secondaire" }
];

const MIG_INV_OFFLINE_OPTIONS = [
    { value: "inacceptable", label: "Inacceptable" },
    { value: "tolerable", label: "Tolérable" },
    { value: "acceptable", label: "Acceptable" }
];

const MIG_INV_NETWORK_OPTIONS = [
    { value: "admin", label: "Admin" },
    { value: "peda", label: "Péda" },
    { value: "recherche", label: "Recherche" },
    { value: "wifi", label: "WIFI" }
];

const MIG_INV_TREATMENT_OPTIONS = [
    { value: "migration", label: "Migration" },
    { value: "decommission", label: "Décommission" },
    { value: "reste-en-place", label: "Reste en place" }
];

const MIG_INV_STORAGE_KEYS = ["storage1", "storage2", "storage3"];

let migInvLocations = [];
let migInvSelectedLocations = new Set();
let migInvSelectedItems = {};

/* ===== Modèle ===== */

function migInvDefaultStorage() {
    return { used: 0, available: 0 };
}

function migInvNormalizeStorage(raw) {
    const storage = raw && typeof raw === "object" ? raw : {};
    return {
        used: parseNumber(storage.used),
        available: parseNumber(storage.available)
    };
}

function migInvDefaultItem() {
    return {
        id: createId(),
        sourceVmKey: null,
        name: "",
        role: "",
        os: "",
        physicalServer: "",
        network: "",
        ipv4: "",
        cpu: 0,
        ramGB: 0,
        storage1: migInvDefaultStorage(),
        storage2: migInvDefaultStorage(),
        storage3: migInvDefaultStorage(),
        criticality: "",
        treatment: "",
        offlineAcceptability: ""
    };
}

function migInvNormalizeItem(raw) {
    const item = raw && typeof raw === "object" ? raw : {};
    const normalized = {
        id: item.id || createId(),
        sourceVmKey: item.sourceVmKey || null,
        name: item.name || "",
        role: item.role || "",
        os: item.os || "",
        physicalServer: item.physicalServer || "",
        network: MIG_INV_NETWORK_OPTIONS.some((option) => option.value === item.network) ? item.network : "",
        ipv4: item.ipv4 || "",
        cpu: parseNumber(item.cpu),
        ramGB: parseNumber(item.ramGB),
        criticality: MIG_INV_CRITICALITY_OPTIONS.some((option) => option.value === item.criticality) ? item.criticality : "",
        treatment: MIG_INV_TREATMENT_OPTIONS.some((option) => option.value === item.treatment) ? item.treatment : "",
        offlineAcceptability: MIG_INV_OFFLINE_OPTIONS.some((option) => option.value === item.offlineAcceptability) ? item.offlineAcceptability : ""
    };

    MIG_INV_STORAGE_KEYS.forEach((key) => {
        normalized[key] = migInvNormalizeStorage(item[key]);
    });

    return normalized;
}

function migInvCreateLocation(colorIndex) {
    return {
        id: createId(),
        color: predefinedColors[colorIndex % predefinedColors.length],
        name: "",
        items: [],
        dismissedVmKeys: []
    };
}

/* ===== Stockage ===== */

function loadMigInvLocations() {
    const savedData = localStorage.getItem(getProjectKey(MIG_INV_LOCATIONS_STORAGE_TYPE));

    if (!savedData) return [];

    try {
        const parsed = JSON.parse(savedData);
        if (!Array.isArray(parsed)) return [];

        return parsed.map((location, index) => ({
            id: location.id || createId(),
            color: normalizeColor(location.color, index),
            name: location.name || "",
            items: Array.isArray(location.items) ? location.items.map(migInvNormalizeItem) : [],
            dismissedVmKeys: Array.isArray(location.dismissedVmKeys) ? location.dismissedVmKeys.filter((key) => typeof key === "string") : []
        }));
    } catch (error) {
        console.error("Impossible de charger l'inventaire de migration :", error);
        return [];
    }
}

function saveMigInvLocations() {
    localStorage.setItem(getProjectKey(MIG_INV_LOCATIONS_STORAGE_TYPE), JSON.stringify(migInvLocations));
}

function getMigInvSelectedItemSet(locationId) {
    if (!migInvSelectedItems[locationId]) {
        migInvSelectedItems[locationId] = new Set();
    }

    return migInvSelectedItems[locationId];
}

/* ===== Lien avec Existant : copie automatique, ponctuelle ===== */

// Existant n'est pas chargé sur cette page : lecture directe de sa clé de
// stockage plutôt qu'un import — même principe que vmSizingPopulateLieuOptions
// dans vm-sizing.js qui lit la clé de CE fichier en sens inverse.
function migInvGetExistantProfiles() {
    try {
        const parsed = JSON.parse(localStorage.getItem("forge_existant_profiles_v1") || "[]");
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
}

// Noms des serveurs Existant affectés à CE lieu uniquement (impossible de
// sélectionner un serveur de Nancy dans le tableau de Dijon, comme demandé).
function migInvGetServersForLocation(locationId) {
    return migInvGetExistantProfiles()
        .filter((profile) => profile.lieuId === locationId)
        .map((profile) => profile.name || "Serveur sans nom");
}

// Même unité que dans Existant (Go) — pas de conversion, juste une copie.
function migInvStorageFromExistantDisk(disk) {
    const source = disk && typeof disk === "object" ? disk : {};
    return {
        used: parseNumber(source.used),
        available: parseNumber(source.available)
    };
}

// Copie dans location.items chaque VM d'un serveur Existant affecté à ce
// lieu qui n'y est pas déjà (ni copiée, ni supprimée depuis) — mutation
// directe, à sauvegarder par l'appelant si le retour est true. Ne retouche
// jamais un item déjà copié : la copie est ponctuelle, pas un lien permanent.
function migInvSyncFromExistant(location) {
    const profiles = migInvGetExistantProfiles().filter((profile) => profile.lieuId === location.id);
    const dismissed = new Set(location.dismissedVmKeys);
    const existingKeys = new Set(location.items.map((item) => item.sourceVmKey).filter(Boolean));
    let changed = false;

    profiles.forEach((profile) => {
        const vms = Array.isArray(profile.vms) ? profile.vms : [];

        vms.forEach((vm) => {
            const vmKey = `${profile.id}::${vm.id}`;
            if (existingKeys.has(vmKey) || dismissed.has(vmKey)) return;

            const item = migInvDefaultItem();
            item.sourceVmKey = vmKey;
            item.name = vm.name || "VM sans nom";
            item.role = vm.role || "";
            item.physicalServer = profile.name || "Serveur sans nom";
            item.cpu = parseNumber(vm.vcpu);
            item.ramGB = parseNumber(vm.ramGB);
            item.storage1 = migInvStorageFromExistantDisk(vm.disk1);
            item.storage2 = migInvStorageFromExistantDisk(vm.disk2);
            item.storage3 = migInvStorageFromExistantDisk(vm.disk3);

            location.items.push(item);
            existingKeys.add(vmKey);
            changed = true;
        });
    });

    return changed;
}

/* ===== Rendu : sidebar des lieux ===== */

function renderMigInvLocationsTable() {
    const body = document.getElementById("mig-inv-locations-table-body");
    const deleteButton = document.getElementById("delete-selected-mig-inv-locations-btn");
    const selectAll = document.getElementById("select-all-mig-inv-locations");

    if (!body) return;

    body.innerHTML = "";

    if (migInvLocations.length === 0) {
        body.innerHTML = `<tr><td colspan="4" class="empty-state">Aucun lieu pour le moment.</td></tr>`;
        if (deleteButton) deleteButton.disabled = true;
        if (selectAll) selectAll.checked = false;
        return;
    }

    migInvLocations.forEach((location, index) => {
        const color = normalizeColor(location.color, index);
        const row = document.createElement("tr");
        const isSelected = migInvSelectedLocations.has(index);

        row.style.backgroundColor = hexToRgba(color, 0.20);
        row.style.boxShadow = `inset 3px 0 0 ${color}`;

        if (isSelected) row.classList.add("selected-row");

        row.dataset.rowId = location.id;

        row.innerHTML = `
            <td class="select-col">
                <input class="row-checkbox mig-inv-location-checkbox" type="checkbox" data-index="${index}" aria-label="Sélectionner le lieu ${index + 1}" ${isSelected ? "checked" : ""} />
            </td>
            <td>
                <button
                    class="mig-inv-location-number-btn"
                    type="button"
                    data-index="${index}"
                    style="background-color: ${escapeHtml(color)}; --row-glow: ${hexToRgba(color, 0.55)}"
                    aria-label="Changer la couleur du lieu ${index + 1}"
                >${index + 1}</button>
            </td>
            <td class="select-col">
                <button class="row-drag-handle" type="button" title="Glisser pour réorganiser" aria-label="Glisser pour réorganiser le lieu ${index + 1}">${dragHandleIconSvg()}</button>
            </td>
            <td class="editable mig-inv-location-name-cell" contenteditable="true" data-index="${index}" data-field="name" spellcheck="true">${sanitizeRichText(location.name)}</td>
        `;

        body.appendChild(row);
    });

    body.querySelectorAll(".mig-inv-location-number-btn").forEach((button) => {
        button.addEventListener("click", (event) => {
            const index = Number(event.currentTarget.dataset.index);
            activeColorTarget = {
                type: "migInvLocation",
                index
            };

            showColorMenu(event.currentTarget);
        });
    });

    body.querySelectorAll(".mig-inv-location-checkbox").forEach((checkbox) => {
        checkbox.addEventListener("change", (event) => {
            const index = Number(event.target.dataset.index);

            if (event.target.checked) {
                migInvSelectedLocations.add(index);
            } else {
                migInvSelectedLocations.delete(index);
            }

            renderMigInvLocationsTable();
        });
    });

    body.querySelectorAll(".editable").forEach((cell) => {
        cell.addEventListener("input", (event) => {
            const index = Number(event.target.dataset.index);
            const field = event.target.dataset.field;
            migInvLocations[index][field] = sanitizeRichText(event.target.innerHTML);
            saveMigInvLocations();
            renderMigInvCards();
        });
    });

    bindRowDragReorder(body, {
        handleSelector: ".row-drag-handle",
        rowSelector: "tr[data-row-id]",
        onDrop: createFlatRowDropHandler(() => migInvLocations, () => {
            saveMigInvLocations();
            renderMigInvLocationsTable();
            renderMigInvCards();
        })
    });

    if (deleteButton) deleteButton.disabled = migInvSelectedLocations.size === 0;
    if (selectAll) {
        selectAll.checked = migInvLocations.length > 0 && migInvSelectedLocations.size === migInvLocations.length;
        selectAll.indeterminate = migInvSelectedLocations.size > 0 && migInvSelectedLocations.size < migInvLocations.length;
    }
}

/* ===== Rendu : un tableau par lieu ===== */

function renderMigInvCards() {
    const zone = document.getElementById("mig-inv-locations-zone");
    if (!zone) return;

    let anyChange = false;
    migInvLocations.forEach((location) => {
        if (migInvSyncFromExistant(location)) anyChange = true;
    });
    if (anyChange) saveMigInvLocations();

    // Un ré-rendu complet remplace tout le DOM (position de défilement
    // horizontal de chaque tableau, défilement vertical de la page) : sans
    // ça, cocher une case ou changer un statut faisait "sauter" la vue tout
    // en haut/à gauche à chaque clic, y compris en ayant défilé pour voir
    // les colonnes de droite (Criticité, Traitement...).
    const scrollLeftByLocation = new Map();
    zone.querySelectorAll(".mig-inv-card").forEach((card) => {
        const wrapper = card.querySelector(".table-wrapper");
        if (wrapper && card.dataset.locationId) scrollLeftByLocation.set(card.dataset.locationId, wrapper.scrollLeft);
    });
    const pageScrollY = window.scrollY;

    zone.innerHTML = "";

    if (migInvLocations.length === 0) {
        zone.innerHTML = `
            <section class="card mig-inv-empty-card">
                <div class="mig-inv-empty-content">
                    <h2>Aucun tableau pour le moment</h2>
                    <p>Ajoute un lieu à gauche pour générer automatiquement son tableau d'inventaire.</p>
                </div>
            </section>
        `;
        return;
    }

    migInvLocations.forEach((location, locationIndex) => {
        const color = normalizeColor(location.color, locationIndex);
        const card = document.createElement("section");

        card.className = "card mig-inv-card";
        card.dataset.locationId = location.id;
        card.style.borderLeft = `4px solid ${color}`;

        card.innerHTML = `
            <div class="card-header">
                <h2 class="mig-inv-card-title">${escapeHtml(location.name || "Lieu sans nom")}</h2>
            </div>

            <div class="table-actions table-actions-top mig-inv-table-actions">
                <div class="left-actions">
                    <button class="btn icon-action-btn icon-add-btn mig-inv-add-item-btn" type="button" data-location-id="${escapeHtml(location.id)}" title="Ajouter une ligne" aria-label="Ajouter une ligne">+</button>
                    <button class="btn btn-danger icon-action-btn icon-delete-btn mig-inv-delete-items-btn" type="button" data-location-id="${escapeHtml(location.id)}" ${getMigInvSelectedItemSet(location.id).size === 0 ? "disabled" : ""} title="Supprimer la sélection" aria-label="Supprimer la sélection">-</button>
                </div>
            </div>

            <div class="table-wrapper">
                ${buildMigInvTable(location, color)}
            </div>
        `;

        zone.appendChild(card);
    });

    window.scrollTo(0, pageScrollY);

    // Restaurer scrollLeft juste après l'insertion ne marchait pas : le
    // navigateur n'a pas encore mis en page le tableau tout juste inséré
    // (scrollWidth pas encore calculé), donc l'affectation se faisait
    // silencieusement écraser à 0. Un tour de requestAnimationFrame plus
    // tard, la mise en page a eu lieu.
    requestAnimationFrame(() => {
        zone.querySelectorAll(".mig-inv-card").forEach((card) => {
            const wrapper = card.querySelector(".table-wrapper");
            const savedScrollLeft = scrollLeftByLocation.get(card.dataset.locationId);
            if (wrapper && savedScrollLeft) wrapper.scrollLeft = savedScrollLeft;
        });
    });

    bindMigInvCardEvents();
}

function buildMigInvTable(location, color) {
    const selectedSet = getMigInvSelectedItemSet(location.id);
    const serverVariants = migInvGetServerVariantIndexes(location.items);
    const availableServers = migInvGetServersForLocation(location.id);

    const rowsHtml = location.items
        .map((item, index) => buildMigInvRowHtml(location, color, item, index, selectedSet.has(index), serverVariants, availableServers))
        .join("");

    return `
        <table class="mig-inv-table">
            <thead>
                <tr>
                    <th class="select-col"></th>
                    <th class="mig-inv-col-num">N°</th>
                    <th class="select-col"></th>
                    <th class="mig-inv-col-name">Nom</th>
                    <th class="mig-inv-col-role">Rôle</th>
                    <th class="mig-inv-col-os">OS</th>
                    <th class="mig-inv-col-server">Serveur physique</th>
                    <th class="mig-inv-col-network">Réseau</th>
                    <th class="mig-inv-col-ipv4">Adresse IPv4</th>
                    <th class="mig-inv-col-cpu">CPU</th>
                    <th class="mig-inv-col-ram">RAM (Go)</th>
                    <th class="mig-inv-col-storage">
                        <span class="vmsizing-disk-header-title">Stockage 1 (Go)</span>
                        <span class="vmsizing-disk-header-sub"><span>Utilisé</span><span>Disponible</span></span>
                    </th>
                    <th class="mig-inv-col-storage">
                        <span class="vmsizing-disk-header-title">Stockage 2 (Go)</span>
                        <span class="vmsizing-disk-header-sub"><span>Utilisé</span><span>Disponible</span></span>
                    </th>
                    <th class="mig-inv-col-storage">
                        <span class="vmsizing-disk-header-title">Stockage 3 (Go)</span>
                        <span class="vmsizing-disk-header-sub"><span>Utilisé</span><span>Disponible</span></span>
                    </th>
                    <th class="mig-inv-col-criticality">Criticité</th>
                    <th class="mig-inv-col-treatment">Traitement</th>
                    <th class="mig-inv-col-offline">Acceptabilité Hors-Ligne</th>
                    <th class="select-col"></th>
                </tr>
            </thead>
            <tbody>${rowsHtml || `<tr><td colspan="18" class="empty-state">Aucune ligne pour le moment.</td></tr>`}</tbody>
        </table>
    `;
}

function migInvBuildStorageCell(locationId, item, storageKey) {
    const storage = item[storageKey];
    return `
        <td class="mig-inv-storage-cell">
            <div class="vmsizing-disk-mini-row">
                <input type="number" class="vmsizing-input vmsizing-input-num vmsizing-disk-input" min="0" placeholder="Util." title="Utilisé (Go)" aria-label="Stockage ${storageKey} utilisé (Go)" data-location-id="${escapeHtml(locationId)}" data-row-id="${escapeHtml(item.id)}" data-item-field="${storageKey}.used" value="${storage.used}" />
                <input type="number" class="vmsizing-input vmsizing-input-num vmsizing-disk-input" min="0" placeholder="Dispo" title="Disponible (Go)" aria-label="Stockage ${storageKey} disponible (Go)" data-location-id="${escapeHtml(locationId)}" data-row-id="${escapeHtml(item.id)}" data-item-field="${storageKey}.available" value="${storage.available}" />
            </div>
        </td>
    `;
}

function migInvBuildSelectCell(locationId, item, field, options, colorClassPrefix) {
    const currentValue = item[field];
    const colorClass = currentValue ? ` ${colorClassPrefix}-${currentValue}` : "";

    return `
        <td>
            <select class="mig-inv-input mig-inv-status-select${colorClass}" data-location-id="${escapeHtml(locationId)}" data-row-id="${escapeHtml(item.id)}" data-item-field="${field}" aria-label="${field}">
                <option value="" ${currentValue === "" ? "selected" : ""}>—</option>
                ${options.map((option) => `<option value="${option.value}" ${currentValue === option.value ? "selected" : ""}>${option.label}</option>`).join("")}
            </select>
        </td>
    `;
}

// Paliers d'opacité pour la teinte du lieu selon le serveur physique : reste
// dans la même famille de couleur (même hexToRgba(color, ...)), juste une
// opacité différente par serveur — écart accentué à la demande d'Olivier,
// toujours borné pour ne jamais sembler transparent ni virer trop sombre.
// Boucle au-delà de 6 serveurs plutôt que de continuer à s'assombrir/
// s'éclaircir sans limite.
const MIG_INV_SERVER_TINT_ALPHAS = [0.04, 0.13, 0.24, 0.08, 0.18, 0.28];

// Un indice stable par valeur de "Serveur physique" (ordre d'apparition dans
// le tableau), pour que toutes les VM d'un même serveur reçoivent la même
// variation de teinte. Comparaison insensible à la casse/aux espaces pour
// éviter que "DIVM" et "divm " ne comptent comme deux serveurs différents.
function migInvGetServerVariantIndexes(items) {
    const indexByServer = new Map();

    items.forEach((item) => {
        const key = (item.physicalServer || "").trim().toLowerCase();
        if (!key || indexByServer.has(key)) return;
        indexByServer.set(key, indexByServer.size);
    });

    return indexByServer;
}

// Combine la teinte du lieu (posée sur toutes les lignes du tableau, pas
// seulement la bordure de la carte), légèrement variée selon le serveur
// physique — inline pour battre de façon fiable le box-shadow de rayures de
// lignes posé par certains thèmes (même technique que .vmsizing-vm-table).
// La criticité/le réseau restent confinés à leur propre champ (couleur du
// <select> lui-même, voir .mig-inv-status-select.mig-inv-*), pas de
// débordement sur toute la ligne.
function migInvRowBoxShadow(color, serverVariantIndex) {
    const alpha = serverVariantIndex === undefined
        ? 0.09
        : MIG_INV_SERVER_TINT_ALPHAS[serverVariantIndex % MIG_INV_SERVER_TINT_ALPHAS.length];
    return `inset 0 0 0 9999px ${hexToRgba(color, alpha)}`;
}

// <select> plutôt qu'un champ libre : les options viennent uniquement des
// serveurs Existant affectés à CE lieu (migInvGetServersForLocation), donc
// impossible de sélectionner un serveur d'un autre lieu. La valeur actuelle
// est toujours incluse même si elle ne correspond plus à un serveur affecté
// (renommage/réaffectation côté Existant depuis la copie) pour ne jamais
// effacer silencieusement une donnée existante.
function migInvBuildServerSelectCell(location, item, availableServers) {
    const options = item.physicalServer && !availableServers.includes(item.physicalServer)
        ? [...availableServers, item.physicalServer]
        : availableServers;

    return `
        <td>
            <select class="mig-inv-input" data-location-id="${escapeHtml(location.id)}" data-row-id="${escapeHtml(item.id)}" data-item-field="physicalServer" aria-label="Serveur physique">
                <option value="" ${item.physicalServer === "" ? "selected" : ""}>—</option>
                ${options.map((name) => `<option value="${escapeHtml(name)}" ${item.physicalServer === name ? "selected" : ""}>${escapeHtml(name)}</option>`).join("")}
            </select>
        </td>
    `;
}

function buildMigInvRowHtml(location, color, item, index, isSelected, serverVariants, availableServers) {
    const addressing = `data-location-id="${escapeHtml(location.id)}" data-row-id="${escapeHtml(item.id)}"`;
    const serverKey = (item.physicalServer || "").trim().toLowerCase();
    const serverVariantIndex = serverKey ? serverVariants.get(serverKey) : undefined;

    return `
        <tr data-row-id="${escapeHtml(item.id)}" class="${isSelected ? "selected-row" : ""}" style="box-shadow: ${migInvRowBoxShadow(color, serverVariantIndex)};">
            <td class="select-col">
                <input class="row-checkbox mig-inv-item-checkbox" type="checkbox" data-location-id="${escapeHtml(location.id)}" data-index="${index}" aria-label="Sélectionner la ligne ${index + 1}" ${isSelected ? "checked" : ""} />
            </td>
            <td class="mig-inv-col-num">${index + 1}</td>
            <td class="select-col">
                <button class="row-drag-handle" type="button" title="Glisser pour réorganiser" aria-label="Glisser pour réorganiser la ligne ${index + 1}">${dragHandleIconSvg()}</button>
            </td>
            <td><input type="text" class="mig-inv-input" ${addressing} data-item-field="name" value="${escapeHtml(item.name)}" /></td>
            <td><input type="text" class="mig-inv-input" ${addressing} data-item-field="role" value="${escapeHtml(item.role)}" /></td>
            <td><input type="text" class="mig-inv-input" ${addressing} data-item-field="os" value="${escapeHtml(item.os)}" /></td>
            ${migInvBuildServerSelectCell(location, item, availableServers)}
            ${migInvBuildSelectCell(location.id, item, "network", MIG_INV_NETWORK_OPTIONS, "mig-inv-network")}
            <td><input type="text" class="mig-inv-input" ${addressing} data-item-field="ipv4" value="${escapeHtml(item.ipv4)}" /></td>
            <td><input type="number" class="mig-inv-input mig-inv-input-num" min="0" ${addressing} data-item-field="cpu" value="${item.cpu}" /></td>
            <td><input type="number" class="mig-inv-input mig-inv-input-num" min="0" ${addressing} data-item-field="ramGB" value="${item.ramGB}" /></td>
            ${migInvBuildStorageCell(location.id, item, "storage1")}
            ${migInvBuildStorageCell(location.id, item, "storage2")}
            ${migInvBuildStorageCell(location.id, item, "storage3")}
            ${migInvBuildSelectCell(location.id, item, "criticality", MIG_INV_CRITICALITY_OPTIONS, "mig-inv-crit")}
            ${migInvBuildSelectCell(location.id, item, "treatment", MIG_INV_TREATMENT_OPTIONS, "mig-inv-treatment")}
            ${migInvBuildSelectCell(location.id, item, "offlineAcceptability", MIG_INV_OFFLINE_OPTIONS, "mig-inv-offline")}
            <td class="select-col">
                <button class="row-delete-btn" type="button" data-location-id="${escapeHtml(location.id)}" data-row-id="${escapeHtml(item.id)}" title="Supprimer la ligne" aria-label="Supprimer la ligne">&times;</button>
            </td>
        </tr>
    `;
}

/* ===== Événements ===== */

function migInvGetLocation(locationId) {
    return migInvLocations.find((location) => location.id === locationId);
}

function migInvSetItemField(item, field, rawValue, isNumber) {
    if (field.includes(".")) {
        const [group, subField] = field.split(".");
        item[group][subField] = parseNumber(rawValue);
        return;
    }

    item[field] = isNumber ? parseNumber(rawValue) : rawValue;
}

// Retire un item et, s'il avait été copié depuis Existant, mémorise sa clé
// pour que la prochaine synchro ne le recopie pas aussitôt.
function migInvRemoveItem(location, itemId) {
    const item = location.items.find((row) => row.id === itemId);
    if (item?.sourceVmKey) location.dismissedVmKeys.push(item.sourceVmKey);
    location.items = location.items.filter((row) => row.id !== itemId);
}

// Recalcule le box-shadow (teinte lieu + variation serveur) de chaque ligne
// du tableau d'un lieu, sans reconstruire le DOM — juste une mise à jour de
// style sur les <tr> existants.
function migInvRecolorRows(location) {
    const locationIndex = migInvLocations.indexOf(location);
    const color = normalizeColor(location.color, locationIndex);
    const serverVariants = migInvGetServerVariantIndexes(location.items);
    const tableBody = document.querySelector(`.mig-inv-card[data-location-id="${cssEscape(location.id)}"] tbody`);
    if (!tableBody) return;

    location.items.forEach((item) => {
        const row = tableBody.querySelector(`tr[data-row-id="${cssEscape(item.id)}"]`);
        if (!row) return;

        const serverKey = (item.physicalServer || "").trim().toLowerCase();
        const serverVariantIndex = serverKey ? serverVariants.get(serverKey) : undefined;
        row.style.boxShadow = migInvRowBoxShadow(color, serverVariantIndex);
    });
}

// Après suppression d'une ligne : renumérote les N° restants et réaligne
// data-index sur les cases à cocher (les index se décalent dès qu'une ligne
// disparaît). La sélection est réinitialisée par sécurité plutôt que remappée
// — supprimer une ligne pendant qu'on en a d'autres cochées pour une
// suppression groupée reste un cas rare, mieux vaut vider proprement que
// risquer un index qui pointe sur la mauvaise ligne.
function migInvRenumberRows(location) {
    const tableBody = document.querySelector(`.mig-inv-card[data-location-id="${cssEscape(location.id)}"] tbody`);
    if (!tableBody) return;

    getMigInvSelectedItemSet(location.id).clear();

    if (location.items.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="18" class="empty-state">Aucune ligne pour le moment.</td></tr>`;
        return;
    }

    location.items.forEach((item, index) => {
        const row = tableBody.querySelector(`tr[data-row-id="${cssEscape(item.id)}"]`);
        if (!row) return;

        const numCell = row.querySelector(".mig-inv-col-num");
        if (numCell) numCell.textContent = String(index + 1);

        row.classList.remove("selected-row");

        const checkbox = row.querySelector(".mig-inv-item-checkbox");
        if (checkbox) {
            checkbox.dataset.index = String(index);
            checkbox.checked = false;
            checkbox.setAttribute("aria-label", `Sélectionner la ligne ${index + 1}`);
        }

        const dragHandle = row.querySelector(".row-drag-handle");
        if (dragHandle) dragHandle.setAttribute("aria-label", `Glisser pour réorganiser la ligne ${index + 1}`);
    });
}

function bindMigInvCardEvents() {
    document.querySelectorAll(".mig-inv-add-item-btn").forEach((button) => {
        button.addEventListener("click", () => {
            const location = migInvGetLocation(button.dataset.locationId);
            if (!location) return;

            location.items.push(migInvDefaultItem());
            saveMigInvLocations();
            renderMigInvCards();

            // preventScroll : le focus natif ramène sinon la page (et le
            // défilement horizontal du tableau) vers cet élément, annulant
            // la position qu'on vient de restaurer plus haut — sensible dès
            // qu'on a scrollé pour voir un lieu plus bas dans la liste.
            const lastNameInput = document.querySelector(`.mig-inv-card[data-location-id="${cssEscape(location.id)}"] tbody tr:last-child input[data-item-field="name"]`);
            if (lastNameInput) lastNameInput.focus({ preventScroll: true });
        });
    });

    document.querySelectorAll(".mig-inv-delete-items-btn").forEach((button) => {
        button.addEventListener("click", () => {
            const locationId = button.dataset.locationId;
            const location = migInvGetLocation(locationId);
            const selectedSet = getMigInvSelectedItemSet(locationId);
            if (!location || selectedSet.size === 0) return;

            const confirmation = confirm("Tu veux vraiment supprimer les lignes cochées ?");
            if (!confirmation) return;

            const idsToRemove = location.items.filter((_, index) => selectedSet.has(index)).map((item) => item.id);
            const tableBody = document.querySelector(`.mig-inv-card[data-location-id="${cssEscape(locationId)}"] tbody`);
            idsToRemove.forEach((itemId) => {
                migInvRemoveItem(location, itemId);
                tableBody?.querySelector(`tr[data-row-id="${cssEscape(itemId)}"]`)?.remove();
            });
            selectedSet.clear();

            saveMigInvLocations();

            // Mise à jour ciblée, même principe que la suppression d'une
            // seule ligne : pas de renderMigInvCards() pour ne pas faire
            // sauter la page.
            migInvRenumberRows(location);
            migInvRecolorRows(location);
            button.disabled = true;
        });
    });

    document.querySelectorAll(".mig-inv-item-checkbox").forEach((checkbox) => {
        checkbox.addEventListener("change", (event) => {
            const locationId = event.target.dataset.locationId;
            const index = Number(event.target.dataset.index);
            const selectedSet = getMigInvSelectedItemSet(locationId);

            if (event.target.checked) {
                selectedSet.add(index);
            } else {
                selectedSet.delete(index);
            }

            // Mise à jour ciblée (pas de renderMigInvCards()) : cocher une
            // case ne doit toucher que cette ligne et le bouton "-", pas
            // reconstruire tout le DOM — un rendu complet ici faisait sauter
            // la page/le défilement horizontal du tableau à chaque clic.
            event.target.closest("tr")?.classList.toggle("selected-row", event.target.checked);

            const deleteButton = document.querySelector(`.mig-inv-delete-items-btn[data-location-id="${cssEscape(locationId)}"]`);
            if (deleteButton) deleteButton.disabled = selectedSet.size === 0;
        });
    });

    document.querySelectorAll(".row-delete-btn[data-location-id]").forEach((button) => {
        button.addEventListener("click", () => {
            const location = migInvGetLocation(button.dataset.locationId);
            if (!location) return;

            migInvRemoveItem(location, button.dataset.rowId);
            saveMigInvLocations();

            // Mise à jour ciblée (pas de renderMigInvCards()) : même principe
            // que pour les cases à cocher/menus déroulants — reconstruire
            // tout le tableau à chaque suppression faisait sauter la page.
            button.closest("tr")?.remove();
            migInvRenumberRows(location);
            migInvRecolorRows(location);

            const deleteButton = document.querySelector(`.mig-inv-delete-items-btn[data-location-id="${cssEscape(location.id)}"]`);
            if (deleteButton) deleteButton.disabled = true;
        });
    });

    const MIG_INV_SELECT_COLOR_PREFIXES = {
        criticality: "mig-inv-crit",
        treatment: "mig-inv-treatment",
        offlineAcceptability: "mig-inv-offline",
        network: "mig-inv-network"
    };

    document.querySelectorAll(".mig-inv-input").forEach((input) => {
        const eventName = input.tagName === "SELECT" ? "change" : "input";

        input.addEventListener(eventName, (event) => {
            const location = migInvGetLocation(event.target.dataset.locationId);
            const item = location?.items.find((row) => row.id === event.target.dataset.rowId);
            if (!item) return;

            const field = event.target.dataset.itemField;
            const isNumber = event.target.type === "number";

            migInvSetItemField(item, field, event.target.value, isNumber);
            saveMigInvLocations();

            // Un select de statut (criticité/réseau/traitement/acceptabilité)
            // recolore aussitôt sa ligne, mais en mise à jour ciblée (pas de
            // renderMigInvCards()) : reconstruire tout le DOM à chaque
            // sélection faisait sauter la page/le défilement horizontal du
            // tableau. Les champs texte/nombre, eux, continuent de ne faire
            // que sauvegarder (perdraient le focus à chaque frappe sinon).
            if (event.target.tagName === "SELECT") {
                const colorPrefix = MIG_INV_SELECT_COLOR_PREFIXES[field];
                if (colorPrefix) {
                    event.target.className = `mig-inv-input mig-inv-status-select${item[field] ? ` ${colorPrefix}-${item[field]}` : ""}`;
                }

                // Seul le serveur physique influence la teinte des lignes
                // (variation par serveur) ; la criticité/le réseau restent
                // confinés à leur propre <select>, rien à recolorer pour eux.
                // Changer le serveur peut décaler l'ordre d'apparition des
                // AUTRES lignes (migInvGetServerVariantIndexes), donc on
                // recolore tout le tableau, pas seulement cette ligne.
                if (field === "physicalServer") {
                    migInvRecolorRows(location);
                }
            }
        });
    });

    // Les champs de stockage réutilisent le balisage/style de VM Sizing
    // (.vmsizing-disk-input) plutôt que .mig-inv-input, donc ils ont besoin
    // de leur propre écouteur : sinon rien ne les sauvegarde jamais (bug
    // rapporté par Olivier — les colonnes stockage ne gardaient aucune
    // saisie, y compris sur les lignes ajoutées à la main).
    document.querySelectorAll(".mig-inv-card .vmsizing-disk-input").forEach((input) => {
        input.addEventListener("input", (event) => {
            const location = migInvGetLocation(event.target.dataset.locationId);
            const item = location?.items.find((row) => row.id === event.target.dataset.rowId);
            if (!item) return;

            migInvSetItemField(item, event.target.dataset.itemField, event.target.value, true);
            saveMigInvLocations();
        });
    });

    document.querySelectorAll(".mig-inv-card .table-wrapper table").forEach((table) => {
        const locationId = table.closest(".mig-inv-card")?.dataset.locationId;
        if (!locationId) return;

        bindRowDragReorder(table.querySelector("tbody"), {
            handleSelector: ".row-drag-handle",
            rowSelector: "tr[data-row-id]",
            onDrop: createFlatRowDropHandler(() => migInvGetLocation(locationId)?.items || [], () => {
                saveMigInvLocations();
                renderMigInvCards();
            })
        });
    });
}

/* ===== Init ===== */

function initMigInventoryPage() {
    if (typeof helpTexts !== "undefined") {
        helpTexts["migration-inventaire"] = `
            <p>Un tableau d'inventaire par lieu, pensé pour préparer une migration.</p>
            <p>Crée tes lieux à gauche. Sur la page <strong>Existant</strong>, affecte chaque serveur à un lieu (champ "Lieu (migration)") : ses VM sont alors copiées automatiquement ici. Tous les champs restent ensuite librement modifiables, y compris ceux repris d'Existant (nom, CPU, RAM, stockage...) — les modifier ici ne touche jamais à Existant, et inversement.</p>
            <p>Tu peux aussi ajouter une ligne à la main avec "+" pour ce qui n'est pas dans Existant (matériel réseau...).</p>
            <p>Beaucoup de colonnes : le tableau défile horizontalement, fais glisser la barre en bas si besoin.</p>
        `;
    }

    migInvLocations = loadMigInvLocations();

    renderColorMenu();
    renderMigInvLocationsTable();
    renderMigInvCards();

    const addLocationButton = document.getElementById("add-mig-inv-location-btn");
    const deleteLocationsButton = document.getElementById("delete-selected-mig-inv-locations-btn");
    const resetButton = document.getElementById("reset-mig-inv-btn");
    const selectAllLocations = document.getElementById("select-all-mig-inv-locations");

    addLocationButton?.addEventListener("click", () => {
        const location = migInvCreateLocation(migInvLocations.length);
        migInvLocations.push(location);

        saveMigInvLocations();
        renderMigInvLocationsTable();
        renderMigInvCards();

        // preventScroll : sinon le focus natif sur la sidebar (souvent en
        // haut de page, position:sticky) ramène toute la page vers le haut
        // dès qu'on avait scrollé pour voir un lieu plus bas dans la liste.
        const lastLocation = document.querySelector("#mig-inv-locations-table-body tr:last-child .editable");
        if (lastLocation) lastLocation.focus({ preventScroll: true });
    });

    deleteLocationsButton?.addEventListener("click", () => {
        if (migInvSelectedLocations.size === 0) return;

        const confirmation = confirm("Tu veux vraiment supprimer les lieux cochés ? Leurs tableaux seront supprimés aussi.");
        if (!confirmation) return;

        migInvLocations = migInvLocations.filter((_, index) => !migInvSelectedLocations.has(index));
        migInvSelectedLocations.clear();

        saveMigInvLocations();
        hideColorMenu();
        renderMigInvLocationsTable();
        renderMigInvCards();
    });

    resetButton?.addEventListener("click", () => {
        const confirmation = confirm("Tu veux vraiment réinitialiser l'inventaire de migration ?");
        if (!confirmation) return;

        migInvLocations = [];
        migInvSelectedLocations.clear();
        migInvSelectedItems = {};

        saveMigInvLocations();
        hideColorMenu();
        renderMigInvLocationsTable();
        renderMigInvCards();
    });

    selectAllLocations?.addEventListener("change", (event) => {
        migInvSelectedLocations.clear();

        if (event.target.checked) {
            migInvLocations.forEach((_, index) => migInvSelectedLocations.add(index));
        }

        renderMigInvLocationsTable();
    });

    document.addEventListener("click", closeColorMenuOnOutsideClick);
}
