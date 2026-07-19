/* Forge — Dimensionnement VM (intégration de la fonctionnalité Diamond) */

const VMSIZING_PROFILES_KEY = "forge_existant_profiles_v1";
const VMSIZING_ACTIVE_PROFILE_KEY = "forge_existant_active_profile_id_v1";

const VMSIZING_SPEC_FIELDS = [
    "model",
    "cpuModel",
    "cpuSockets",
    "cpuCoresPerSocket",
    "cpuThreadsPerCore",
    "ramGB",
    "volume1GB",
    "volume1Type",
    "volume2GB",
    "volume2Type",
    "lieuId"
];

const VMSIZING_SERVER_TEXT_FIELDS = ["model", "cpuModel", "volume1Type", "volume2Type", "lieuId"];
const VMSIZING_VM_TEXT_FIELDS = ["name", "role"];
const VMSIZING_DISK_KEYS = ["disk1", "disk2", "disk3"];
const VMSIZING_VOLUME_KEYS = ["volume1", "volume2"];

const vmSizingStatusLabels = { ok: "OK", warning: "Attention", critical: "Critique" };

let vmSizingSelectedServers = new Set();

/* ===== Utilitaires ===== */

function vmSizingCreateId() {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function vmSizingToNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

/* ===== Modèle : profils serveur ===== */

function vmSizingDefaultProfile(name, colorIndex) {
    return {
        id: vmSizingCreateId(),
        name: name || "",
        model: "",
        cpuModel: "",
        lieuId: "",
        color: predefinedColors[colorIndex % predefinedColors.length],
        cpuSockets: 2,
        cpuCoresPerSocket: 16,
        cpuThreadsPerCore: 2,
        ramGB: 256,
        volume1GB: 4000,
        volume1Type: "SSD",
        volume2GB: 0,
        volume2Type: "SSD",
        vms: []
    };
}

function vmSizingDefaultDisk() {
    return { used: 0, available: 0, volume: "" };
}

function vmSizingDefaultVm() {
    return {
        id: vmSizingCreateId(),
        name: "VM",
        role: "",
        active: true,
        vcpu: 2,
        ramGB: 4,
        disk1: { used: 0, available: 50, volume: "" },
        disk2: vmSizingDefaultDisk(),
        disk3: vmSizingDefaultDisk()
    };
}

// `rawDisk` peut être un vieux nombre brut (avant l'introduction de
// utilisé/disponible/volume) : traité comme la taille "disponible" totale
// de l'époque, avec 0 utilisé et aucun volume assigné par défaut.
function vmSizingNormalizeDisk(rawDisk) {
    if (typeof rawDisk === "number" || typeof rawDisk === "string") {
        return { used: 0, available: vmSizingToNumber(rawDisk, 0), volume: "" };
    }

    const disk = rawDisk && typeof rawDisk === "object" ? rawDisk : {};
    const volume = VMSIZING_VOLUME_KEYS.includes(disk.volume) ? disk.volume : "";

    return {
        used: vmSizingToNumber(disk.used, 0),
        available: vmSizingToNumber(disk.available, 0),
        volume
    };
}

function vmSizingNormalizeVm(rawVm) {
    return {
        id: rawVm.id || vmSizingCreateId(),
        name: rawVm.name || "VM",
        role: rawVm.role || "",
        active: rawVm.active !== false,
        vcpu: vmSizingToNumber(rawVm.vcpu, 1),
        ramGB: vmSizingToNumber(rawVm.ramGB, 1),
        // rawVm.diskGB1/2/3 : ancien format à plat (avant utilisé/disponible/
        // volume), migré ici plutôt que par un script séparé.
        disk1: vmSizingNormalizeDisk(rawVm.disk1 ?? rawVm.diskGB1 ?? rawVm.diskGB),
        disk2: vmSizingNormalizeDisk(rawVm.disk2 ?? rawVm.diskGB2),
        disk3: vmSizingNormalizeDisk(rawVm.disk3 ?? rawVm.diskGB3)
    };
}

let vmSizingProfiles = [];
let vmSizingActiveProfileId = "";

function vmSizingSeedProfile(colorIndex) {
    const seed = vmSizingDefaultProfile("Serveur ESXi 01", colorIndex);
    // Le seed utilise les 2 volumes (voir plus bas) : Volume 2 a donc besoin
    // d'une vraie capacité, contrairement au 0 par défaut d'un profil vierge.
    seed.volume2GB = 2000;
    seed.vms = [
        {
            id: vmSizingCreateId(), name: "VM Web", role: "Frontal web", active: true, vcpu: 2, ramGB: 4,
            disk1: { used: 25, available: 35, volume: "volume1" }, disk2: vmSizingDefaultDisk(), disk3: vmSizingDefaultDisk()
        },
        {
            id: vmSizingCreateId(), name: "VM Base de données", role: "Base de données", active: true, vcpu: 4, ramGB: 16,
            disk1: { used: 60, available: 40, volume: "volume1" },
            disk2: { used: 70, available: 30, volume: "volume2" },
            disk3: vmSizingDefaultDisk()
        }
    ];
    return seed;
}

function vmSizingLoadProfiles() {
    let parsed = [];

    try {
        parsed = JSON.parse(localStorage.getItem(VMSIZING_PROFILES_KEY) || "[]");
    } catch (error) {
        parsed = [];
    }

    vmSizingProfiles = Array.isArray(parsed) ? parsed : [];

    if (vmSizingProfiles.length === 0) {
        vmSizingProfiles = [vmSizingSeedProfile(0)];
    }

    vmSizingProfiles.forEach((profile, index) => {
        profile.color = normalizeColor(profile.color, index);
        profile.vms = Array.isArray(profile.vms) ? profile.vms.map(vmSizingNormalizeVm) : [];

        // Ancien champ à plat "Stockage total" migré vers Volume 1 (Volume 2
        // démarre vide, l'utilisateur répartit ensuite ses disques comme il veut).
        if (profile.volume1GB === undefined && profile.volume2GB === undefined) {
            profile.volume1GB = vmSizingToNumber(profile.storageGB, 4000);
            profile.volume2GB = 0;
        } else {
            profile.volume1GB = vmSizingToNumber(profile.volume1GB, 0);
            profile.volume2GB = vmSizingToNumber(profile.volume2GB, 0);
        }

        profile.volume1Type = profile.volume1Type === "HDD" ? "HDD" : "SSD";
        profile.volume2Type = profile.volume2Type === "HDD" ? "HDD" : "SSD";
        profile.model = typeof profile.model === "string" ? profile.model : "";
        profile.cpuModel = typeof profile.cpuModel === "string" ? profile.cpuModel : "";
        profile.lieuId = typeof profile.lieuId === "string" ? profile.lieuId : "";
    });

    vmSizingActiveProfileId = localStorage.getItem(VMSIZING_ACTIVE_PROFILE_KEY) || "";

    if (!vmSizingProfiles.some((profile) => profile.id === vmSizingActiveProfileId)) {
        vmSizingActiveProfileId = vmSizingProfiles[0].id;
    }

    vmSizingSaveProfiles();
    vmSizingSaveActiveProfileId();
}

function vmSizingSaveProfiles() {
    localStorage.setItem(VMSIZING_PROFILES_KEY, JSON.stringify(vmSizingProfiles));
}

function vmSizingSaveActiveProfileId() {
    localStorage.setItem(VMSIZING_ACTIVE_PROFILE_KEY, vmSizingActiveProfileId);
}

function vmSizingGetActiveProfile() {
    return vmSizingProfiles.find((profile) => profile.id === vmSizingActiveProfileId) || vmSizingProfiles[0];
}

function vmSizingSelectProfile(profileId) {
    if (profileId === vmSizingActiveProfileId) return;

    vmSizingActiveProfileId = profileId;
    vmSizingSaveActiveProfileId();
    vmSizingRenderAll();
}

function vmSizingUpdateActiveProfile(patch) {
    const profile = vmSizingGetActiveProfile();
    Object.assign(profile, patch);
    vmSizingSaveProfiles();
}

function vmSizingAddVmToActiveProfile() {
    const profile = vmSizingGetActiveProfile();
    profile.vms.push(vmSizingDefaultVm());
    vmSizingSaveProfiles();
    vmSizingRenderVmTable();
    vmSizingRenderGauges();
}

// `field` accepte un chemin à point pour les sous-champs de disque
// (ex. "disk1.used", "disk2.volume") en plus des champs plats existants
// (ex. "vcpu", "active").
function vmSizingUpdateVm(vmId, field, value) {
    const profile = vmSizingGetActiveProfile();
    const vm = profile.vms.find((item) => item.id === vmId);
    if (!vm) return;

    if (field.includes(".")) {
        const [group, subField] = field.split(".");
        if (!vm[group]) vm[group] = vmSizingDefaultDisk();
        vm[group][subField] = value;
    } else {
        vm[field] = value;
    }

    vmSizingSaveProfiles();
    vmSizingRenderGauges();
}

function vmSizingRemoveVm(vmId) {
    const profile = vmSizingGetActiveProfile();
    profile.vms = profile.vms.filter((item) => item.id !== vmId);
    vmSizingSaveProfiles();
    vmSizingRenderVmTable();
    vmSizingRenderGauges();
}

/* ===== Calcul de dimensionnement ===== */

function vmSizingStatusForPercent(percent) {
    if (percent > 100) return "critical";
    if (percent >= 80) return "warning";
    return "ok";
}

function vmSizingWorstStatus(statuses) {
    if (statuses.includes("critical")) return "critical";
    if (statuses.includes("warning")) return "warning";
    return "ok";
}

// Seul l'espace utilisé compte pour le volume physique (ce qu'il occupe
// réellement sur le datastore) — l'espace disponible est l'espace libre
// restant à l'intérieur du disque virtuel, vu depuis la VM, pas depuis le
// volume qui l'héberge.
function vmSizingVolumeRequired(profile, volumeKey) {
    return profile.vms.reduce((sum, vm) => {
        const vmTotal = VMSIZING_DISK_KEYS.reduce((diskSum, diskKey) => {
            const disk = vm[diskKey];
            return disk && disk.volume === volumeKey ? diskSum + disk.used : diskSum;
        }, 0);

        return sum + vmTotal;
    }, 0);
}

function vmSizingBuildDimension(required, usable) {
    const percent = usable > 0 ? (required / usable) * 100 : 0;
    return { required, usable, percent, status: vmSizingStatusForPercent(percent) };
}

function vmSizingCalculate(profile) {
    const totalLogicalCores = profile.cpuSockets * profile.cpuCoresPerSocket * profile.cpuThreadsPerCore;

    // Une VM inactive ne consomme plus de CPU/RAM (elle est éteinte), mais son
    // disque existe toujours quelque part sur le volume — il continue donc de
    // compter dans le dimensionnement du stockage.
    const activeVms = profile.vms.filter((vm) => vm.active !== false);
    const requiredVcpu = activeVms.reduce((sum, vm) => sum + vm.vcpu, 0);
    const requiredRam = activeVms.reduce((sum, vm) => sum + vm.ramGB, 0);
    const vmCount = profile.vms.length;

    const cpu = vmSizingBuildDimension(requiredVcpu, totalLogicalCores);
    const ram = vmSizingBuildDimension(requiredRam, profile.ramGB);
    const volume1 = vmSizingBuildDimension(vmSizingVolumeRequired(profile, "volume1"), profile.volume1GB);
    const volume2 = vmSizingBuildDimension(vmSizingVolumeRequired(profile, "volume2"), profile.volume2GB);

    return {
        totalLogicalCores,
        cpu,
        ram,
        volume1,
        volume2,
        overallStatus: vmSizingWorstStatus([cpu.status, ram.status, volume1.status, volume2.status]),
        vmCount
    };
}

/* ===== Rendu : liste des serveurs ===== */

function vmSizingRenderServerTable() {
    const body = document.getElementById("vmsizing-server-table-body");
    const deleteButton = document.getElementById("vmsizing-delete-selected-servers-btn");
    const selectAll = document.getElementById("vmsizing-select-all-servers");

    if (!body) return;

    body.innerHTML = "";

    if (vmSizingProfiles.length === 0) {
        body.innerHTML = `<tr><td colspan="4" class="empty-state">Aucun serveur pour le moment.</td></tr>`;
        if (deleteButton) deleteButton.disabled = true;
        if (selectAll) selectAll.checked = false;
        return;
    }

    vmSizingProfiles.forEach((profile, index) => {
        const color = normalizeColor(profile.color, index);
        const isSelected = vmSizingSelectedServers.has(index);
        const isActive = profile.id === vmSizingActiveProfileId;

        const row = document.createElement("tr");
        row.dataset.serverId = profile.id;
        row.dataset.rowId = profile.id;
        row.style.backgroundColor = hexToRgba(color, isActive ? 0.30 : 0.16);
        row.style.boxShadow = `inset 3px 0 0 ${color}`;
        row.style.outline = isActive ? "1px solid rgba(255, 255, 255, 0.55)" : "";
        row.style.outlineOffset = "-1px";
        row.style.cursor = "pointer";

        if (isSelected) row.classList.add("selected-row");

        row.innerHTML = `
            <td class="select-col">
                <input class="row-checkbox vmsizing-server-checkbox" type="checkbox" data-index="${index}" aria-label="Sélectionner le serveur ${index + 1}" ${isSelected ? "checked" : ""} />
            </td>
            <td>
                <button
                    class="vmsizing-server-number-btn"
                    type="button"
                    data-index="${index}"
                    style="background-color: ${escapeHtml(color)}; --row-glow: ${hexToRgba(color, 0.55)}"
                    aria-label="Changer la couleur du serveur ${index + 1}"
                >${index + 1}</button>
            </td>
            <td class="select-col">
                <button class="row-drag-handle" type="button" title="Glisser pour réorganiser" aria-label="Glisser pour réorganiser le serveur ${index + 1}">${dragHandleIconSvg()}</button>
            </td>
            <td class="editable vmsizing-server-name-cell" contenteditable="true" data-index="${index}" spellcheck="true">${sanitizeRichText(profile.name)}</td>
        `;

        body.appendChild(row);
    });

    body.querySelectorAll(".vmsizing-server-checkbox").forEach((checkbox) => {
        checkbox.addEventListener("click", (event) => event.stopPropagation());
        checkbox.addEventListener("change", (event) => {
            const index = Number(event.target.dataset.index);

            if (event.target.checked) {
                vmSizingSelectedServers.add(index);
            } else {
                vmSizingSelectedServers.delete(index);
            }

            vmSizingRenderServerTable();
        });
    });

    body.querySelectorAll(".vmsizing-server-number-btn").forEach((button) => {
        button.addEventListener("click", (event) => {
            event.stopPropagation();
            const index = Number(event.currentTarget.dataset.index);
            activeColorTarget = { type: "vmServer", index };
            showColorMenu(event.currentTarget);
        });
    });

    body.querySelectorAll(".vmsizing-server-name-cell").forEach((cell) => {
        cell.addEventListener("click", (event) => event.stopPropagation());
        cell.addEventListener("input", (event) => {
            const index = Number(event.target.dataset.index);
            if (!vmSizingProfiles[index]) return;
            vmSizingProfiles[index].name = sanitizeRichText(event.target.innerHTML);
            vmSizingSaveProfiles();

            if (vmSizingProfiles[index].id === vmSizingActiveProfileId) {
                const title = document.getElementById("vmsizing-server-title");
                if (title) title.textContent = vmSizingProfiles[index].name || "Caractéristiques du serveur";
            }
        });
    });

    body.querySelectorAll("tr[data-server-id]").forEach((row) => {
        row.addEventListener("click", () => {
            vmSizingSelectProfile(row.dataset.serverId);
        });
    });

    body.querySelectorAll(".row-drag-handle").forEach((handle) => {
        handle.addEventListener("click", (event) => event.stopPropagation());
    });

    bindRowDragReorder(body, {
        handleSelector: ".row-drag-handle",
        rowSelector: "tr[data-row-id]",
        onDrop: createFlatRowDropHandler(() => vmSizingProfiles, () => {
            vmSizingSaveProfiles();
            vmSizingRenderServerTable();
        })
    });

    if (deleteButton) deleteButton.disabled = vmSizingSelectedServers.size === 0;
    if (selectAll) {
        selectAll.checked = vmSizingProfiles.length > 0 && vmSizingSelectedServers.size === vmSizingProfiles.length;
        selectAll.indeterminate = vmSizingSelectedServers.size > 0 && vmSizingSelectedServers.size < vmSizingProfiles.length;
    }
}

function vmSizingAddProfile() {
    const profile = vmSizingDefaultProfile("", vmSizingProfiles.length);
    vmSizingProfiles.push(profile);
    vmSizingActiveProfileId = profile.id;

    vmSizingSaveProfiles();
    vmSizingSaveActiveProfileId();
    vmSizingRenderAll();

    const lastNameCell = document.querySelector("#vmsizing-server-table-body tr:last-child .vmsizing-server-name-cell");
    if (lastNameCell) lastNameCell.focus();
}

function vmSizingDeleteSelectedProfiles() {
    if (vmSizingSelectedServers.size === 0) return;

    if (vmSizingSelectedServers.size >= vmSizingProfiles.length) {
        alert("Impossible de supprimer tous les serveurs : il en faut au moins un.");
        return;
    }

    if (!confirm("Tu veux vraiment supprimer les serveurs cochés et toutes leurs VM ?")) return;

    const remaining = vmSizingProfiles.filter((_, index) => !vmSizingSelectedServers.has(index));
    vmSizingProfiles = remaining;
    vmSizingSelectedServers.clear();

    if (!vmSizingProfiles.some((profile) => profile.id === vmSizingActiveProfileId)) {
        vmSizingActiveProfileId = vmSizingProfiles[0].id;
        vmSizingSaveActiveProfileId();
    }

    vmSizingSaveProfiles();
    if (typeof hideColorMenu === "function") hideColorMenu();
    vmSizingRenderAll();
}

function vmSizingResetServers() {
    if (!confirm("Tu veux vraiment réinitialiser la liste des serveurs ? Toutes les VM seront perdues.")) return;

    vmSizingProfiles = [vmSizingSeedProfile(0)];
    vmSizingActiveProfileId = vmSizingProfiles[0].id;
    vmSizingSelectedServers.clear();

    vmSizingSaveProfiles();
    vmSizingSaveActiveProfileId();
    if (typeof hideColorMenu === "function") hideColorMenu();
    vmSizingRenderAll();
}

/* ===== Rendu : détail du serveur actif ===== */

function vmSizingRenderServerForm() {
    const profile = vmSizingGetActiveProfile();
    const form = document.getElementById("vmsizing-server-form");
    if (!form) return;

    // N'existe que sur existant.html (pas sur vm-sizing.html — assigner un
    // lieu de migration à un serveur pas encore déployé n'aurait pas de
    // sens) : populate avant la boucle générique ci-dessous pour que la
    // valeur sauvegardée (profile.lieuId) puisse déjà matcher une <option>.
    vmSizingPopulateLieuOptions();

    VMSIZING_SPEC_FIELDS.forEach((field) => {
        const input = form.querySelector(`[data-field="${field}"]`);
        if (input) input.value = profile[field];
    });

    // Le titre de la carte reprend le nom du serveur (modifiable dans la
    // liste à gauche) : plus besoin d'un champ "Nom du serveur" dupliqué ici.
    const title = document.getElementById("vmsizing-server-title");
    if (title) title.textContent = profile.name || "Caractéristiques du serveur";
}

// Alimente le <select> "Lieu (migration)" avec les lieux déjà créés dans
// l'Inventaire de Migration (migration-inventaire.js, non chargé sur cette
// page — lecture directe de sa clé de stockage plutôt qu'un import). Simple
// affectation, pas de lien permanent : renommer/supprimer un lieu là-bas se
// répercute ici au prochain rendu, sans script de migration à écrire.
function vmSizingPopulateLieuOptions() {
    const select = document.getElementById("vmsizing-lieu-select");
    if (!select) return;

    let locations = [];
    try {
        const parsed = JSON.parse(localStorage.getItem(getProjectKey("migration_inventory_locations")) || "[]");
        locations = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        locations = [];
    }

    const previousValue = select.value;
    select.innerHTML = `<option value="">— Aucun —</option>` + locations
        .map((location) => `<option value="${escapeHtml(location.id)}">${escapeHtml(location.name || "Lieu sans nom")}</option>`)
        .join("");
    select.value = previousValue;
}

function vmSizingSetGauge(prefix, dimension) {
    const fill = document.getElementById(`vmsizing-${prefix}-fill`);
    const value = document.getElementById(`vmsizing-${prefix}-value`);
    const detail = document.getElementById(`vmsizing-${prefix}-detail`);

    if (fill) {
        fill.style.width = `${Math.min(100, Math.max(0, dimension.percent))}%`;
        fill.className = `vmsizing-gauge-fill vmsizing-status-${dimension.status}`;
    }

    if (value) value.textContent = `${dimension.percent.toFixed(1)}%`;
    if (detail) {
        const unit = prefix === "cpu" ? "vCPU" : "Go";
        detail.textContent = `${Math.round(dimension.required * 100) / 100} / ${dimension.usable.toFixed(0)} ${unit}`;
    }
}

function vmSizingRenderGauges() {
    const profile = vmSizingGetActiveProfile();
    const result = vmSizingCalculate(profile);

    vmSizingSetGauge("cpu", result.cpu);
    vmSizingSetGauge("ram", result.ram);
    vmSizingSetGauge("volume1", result.volume1);
    vmSizingSetGauge("volume2", result.volume2);

    const pill = document.getElementById("vmsizing-overall-status-pill");
    if (pill) {
        pill.textContent = vmSizingStatusLabels[result.overallStatus];
        pill.className = `vmsizing-status-pill vmsizing-status-${result.overallStatus}`;
    }

    const vmCount = document.getElementById("vmsizing-vm-count");
    if (vmCount) vmCount.textContent = `${result.vmCount} VM${result.vmCount > 1 ? "s" : ""}`;
}

function vmSizingRenderVmTable() {
    const profile = vmSizingGetActiveProfile();
    const tbody = document.getElementById("vmsizing-vm-table-body");
    if (!tbody) return;

    const colorIndex = Math.max(vmSizingProfiles.findIndex((item) => item.id === profile.id), 0);
    const color = normalizeColor(profile.color, colorIndex);
    // box-shadow (pas background-color) : certains thèmes peignent déjà une
    // teinte de lignes alternées via ce même procédé (inset ... 9999px), qui
    // masquerait un simple background-color posé en dessous. Un box-shadow
    // inline gagne toujours sur celui, plus faible, posé par le thème.
    const rowTint = `inset 0 0 0 9999px ${hexToRgba(color, 0.22)}`;

    if (profile.vms.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="empty-state">Aucune VM ajoutée pour le moment.</td></tr>`;
        vmSizingApplyActiveColor(color);
        return;
    }

    tbody.innerHTML = profile.vms
        .map(
            (vm) => `
        <tr data-vm-id="${escapeHtml(vm.id)}" data-row-id="${escapeHtml(vm.id)}" style="box-shadow: ${rowTint};" class="${vm.active === false ? "vmsizing-vm-row-inactive" : ""}">
            <td class="select-col">
                <button class="row-drag-handle" type="button" title="Glisser pour réorganiser" aria-label="Glisser pour réorganiser cette VM">${dragHandleIconSvg()}</button>
            </td>
            <td><input type="text" class="vmsizing-input" data-vm-field="name" value="${escapeHtml(vm.name)}" /></td>
            <td><input type="text" class="vmsizing-input" data-vm-field="role" value="${escapeHtml(vm.role)}" /></td>
            <td>
                <label class="vmsizing-active-toggle">
                    <input type="checkbox" data-vm-field="active" ${vm.active !== false ? "checked" : ""} aria-label="VM active" />
                    <strong>${vm.active !== false ? "Actif" : "Inactif"}</strong>
                </label>
            </td>
            <td><input type="number" class="vmsizing-input vmsizing-input-num" min="1" data-vm-field="vcpu" value="${vm.vcpu}" /></td>
            <td><input type="number" class="vmsizing-input vmsizing-input-num" min="0.5" step="0.5" data-vm-field="ramGB" value="${vm.ramGB}" /></td>
            ${vmSizingBuildDiskCell(vm, "disk1")}
            ${vmSizingBuildDiskCell(vm, "disk2")}
            ${vmSizingBuildDiskCell(vm, "disk3")}
            <td class="select-col"><button class="row-delete-btn" type="button" data-remove-vm title="Retirer">&times;</button></td>
        </tr>`
        )
        .join("");

    vmSizingApplyActiveColor(color);

    bindRowDragReorder(tbody, {
        handleSelector: ".row-drag-handle",
        rowSelector: "tr[data-row-id]",
        onDrop: createFlatRowDropHandler(() => profile.vms, () => {
            vmSizingSaveProfiles();
            vmSizingRenderVmTable();
        })
    });
}

// Chaque disque affiche l'espace utilisé et disponible (au lieu d'une seule
// taille globale) plus le volume physique sur lequel il se trouve — ce
// dernier alimente les jauges Volume 1 / Volume 2 (voir vmSizingCalculate).
function vmSizingBuildDiskCell(vm, diskKey) {
    const disk = vm[diskKey] || vmSizingDefaultDisk();

    return `
        <td class="vmsizing-disk-cell">
            <div class="vmsizing-disk-mini-row">
                <input type="number" class="vmsizing-input vmsizing-input-num vmsizing-disk-input" min="0" placeholder="Util." title="Espace utilisé (Go)" aria-label="Espace utilisé (Go)" data-vm-field="${diskKey}.used" value="${disk.used}" />
                <input type="number" class="vmsizing-input vmsizing-input-num vmsizing-disk-input" min="0" placeholder="Dispo" title="Espace disponible (Go)" aria-label="Espace disponible (Go)" data-vm-field="${diskKey}.available" value="${disk.available}" />
            </div>
            <select class="vmsizing-input vmsizing-disk-volume-select" title="Volume" aria-label="Volume" data-vm-field="${diskKey}.volume">
                <option value="" ${disk.volume === "" ? "selected" : ""}>—</option>
                <option value="volume1" ${disk.volume === "volume1" ? "selected" : ""}>Volume 1</option>
                <option value="volume2" ${disk.volume === "volume2" ? "selected" : ""}>Volume 2</option>
            </select>
        </td>
    `;
}

// Reprend la couleur choisie pour le serveur actif (déjà utilisée sur sa
// ligne dans la liste de gauche) sur la carte "Caractéristiques du serveur"
// et son tableau de VM, pour relier visuellement les deux sans avoir à
// vérifier le numéro de ligne sélectionné à gauche.
function vmSizingApplyActiveColor(color) {
    const card = document.querySelector(".vmsizing-server-card");
    if (card) card.style.borderLeft = `4px solid ${color}`;

    // L'en-tête (thead) suit la même couleur que les lignes du tableau, pour
    // que "tout le tableau" — pas seulement les lignes — reflète le serveur
    // actif. Même technique box-shadow que les lignes (voir vmSizingRenderVmTable).
    const headerRow = document.querySelector(".vmsizing-vm-table thead tr");
    if (headerRow) headerRow.style.boxShadow = `inset 0 0 0 9999px ${hexToRgba(color, 0.30)}`;
}

function vmSizingRenderAll() {
    vmSizingRenderServerTable();
    vmSizingRenderServerForm();
    vmSizingRenderVmTable();
    vmSizingRenderGauges();
}

/* ===== Événements ===== */

function vmSizingBindServerForm() {
    const form = document.getElementById("vmsizing-server-form");
    if (!form) return;

    form.addEventListener("input", (event) => {
        const field = event.target.dataset.field;
        if (!field) return;

        const isText = VMSIZING_SERVER_TEXT_FIELDS.includes(field);
        const value = isText ? event.target.value : vmSizingToNumber(event.target.value, 0);

        vmSizingUpdateActiveProfile({ [field]: value });
        vmSizingRenderGauges();
    });
}

function vmSizingBindVmTable() {
    const tbody = document.getElementById("vmsizing-vm-table-body");
    if (!tbody) return;

    tbody.addEventListener("input", (event) => {
        const field = event.target.dataset.vmField;
        if (!field) return;

        const vmId = event.target.closest("tr")?.dataset.vmId;
        if (!vmId) return;

        if (field === "active") {
            vmSizingUpdateVm(vmId, field, event.target.checked);
            vmSizingRenderVmTable();
            return;
        }

        // Sélecteur de volume (ex. "disk1.volume") : valeur texte brute, pas
        // de conversion numérique, comme les champs nom/rôle.
        const isText = VMSIZING_VM_TEXT_FIELDS.includes(field) || field.endsWith(".volume");
        const value = isText ? event.target.value : vmSizingToNumber(event.target.value, 0);

        vmSizingUpdateVm(vmId, field, value);
    });

    tbody.addEventListener("click", (event) => {
        if (!event.target.hasAttribute("data-remove-vm")) return;

        const vmId = event.target.closest("tr")?.dataset.vmId;
        if (vmId) vmSizingRemoveVm(vmId);
    });
}

function vmSizingBindServerListActions() {
    const newBtn = document.getElementById("vmsizing-new-server-btn");
    const deleteBtn = document.getElementById("vmsizing-delete-selected-servers-btn");
    const resetBtn = document.getElementById("vmsizing-reset-servers-btn");
    const selectAll = document.getElementById("vmsizing-select-all-servers");

    if (newBtn) newBtn.addEventListener("click", vmSizingAddProfile);
    if (deleteBtn) deleteBtn.addEventListener("click", vmSizingDeleteSelectedProfiles);
    if (resetBtn) resetBtn.addEventListener("click", vmSizingResetServers);

    if (selectAll) {
        selectAll.addEventListener("change", (event) => {
            vmSizingSelectedServers.clear();

            if (event.target.checked) {
                vmSizingProfiles.forEach((_, index) => vmSizingSelectedServers.add(index));
            }

            vmSizingRenderServerTable();
        });
    }

    if (typeof closeColorMenuOnOutsideClick === "function") {
        document.addEventListener("click", closeColorMenuOnOutsideClick);
    }
}

function vmSizingBindAddVmButton() {
    const btn = document.getElementById("vmsizing-add-vm-btn");
    if (btn) btn.addEventListener("click", vmSizingAddVmToActiveProfile);
}

/* ===== Point d'entrée (appelé depuis forgeBootstrap dans script.js) ===== */

function initExistantPage() {
    if (typeof helpTexts !== "undefined") {
        helpTexts.existant = `
            <p>Cette page sert à dimensionner les machines virtuelles d'un serveur physique.</p>
            <ul>
                <li>La colonne de gauche liste tes serveurs, comme les catégories de la page Compétences : coche puis "-" pour supprimer, "+" pour ajouter, clique sur le numéro pour changer la couleur.</li>
                <li>Clique sur un serveur pour l'afficher à droite.</li>
                <li>Renseigne les caractéristiques du serveur : sockets, cœurs, threads, RAM et les 2 volumes de stockage.</li>
                <li>Ajoute les VM prévues dans le tableau : rôle, actif/inactif, vCPU, RAM et jusqu'à 3 disques (espace utilisé, disponible, et le volume sur lequel chacun se trouve).</li>
                <li>Une VM marquée "Inactif" ne compte plus dans le total vCPU/RAM (elle est éteinte), mais son disque continue de compter dans le volume — il occupe toujours de la place.</li>
                <li>Les jauges CPU / RAM / Volume 1 / Volume 2 indiquent le taux d'utilisation (OK &lt; 80&nbsp;%, Attention 80–100&nbsp;%, Critique &gt; 100&nbsp;%).</li>
                <li>Les changements sont sauvegardés automatiquement (SQLite si Docker, sinon navigateur local).</li>
            </ul>
        `;
    }

    if (typeof renderColorMenu === "function") renderColorMenu();

    vmSizingLoadProfiles();
    vmSizingBindServerListActions();
    vmSizingBindServerForm();
    vmSizingBindVmTable();
    vmSizingBindAddVmButton();

    vmSizingRenderAll();
}
