/* Forge — Dimensionnement VM (intégration de la fonctionnalité Diamond) */

const VMSIZING_PROFILES_KEY = "forge_vmsizing_profiles_v1";
const VMSIZING_ACTIVE_PROFILE_KEY = "forge_vmsizing_active_profile_id_v1";

const VMSIZING_SPEC_FIELDS = [
    "name",
    "cpuSockets",
    "cpuCoresPerSocket",
    "cpuThreadsPerCore",
    "ramGB",
    "storageGB"
];

const VMSIZING_VM_TEXT_FIELDS = ["name", "role"];

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
        color: predefinedColors[colorIndex % predefinedColors.length],
        cpuSockets: 2,
        cpuCoresPerSocket: 16,
        cpuThreadsPerCore: 2,
        ramGB: 256,
        storageGB: 4000,
        vms: []
    };
}

function vmSizingDefaultVm() {
    return {
        id: vmSizingCreateId(),
        name: "VM",
        role: "",
        vcpu: 2,
        ramGB: 4,
        diskGB1: 50,
        diskGB2: 0,
        diskGB3: 0
    };
}

function vmSizingNormalizeVm(rawVm) {
    return {
        id: rawVm.id || vmSizingCreateId(),
        name: rawVm.name || "VM",
        role: rawVm.role || "",
        vcpu: vmSizingToNumber(rawVm.vcpu, 1),
        ramGB: vmSizingToNumber(rawVm.ramGB, 1),
        diskGB1: vmSizingToNumber(rawVm.diskGB1 ?? rawVm.diskGB, 0),
        diskGB2: vmSizingToNumber(rawVm.diskGB2, 0),
        diskGB3: vmSizingToNumber(rawVm.diskGB3, 0)
    };
}

let vmSizingProfiles = [];
let vmSizingActiveProfileId = "";

function vmSizingSeedProfile(colorIndex) {
    const seed = vmSizingDefaultProfile("Serveur ESXi 01", colorIndex);
    seed.vms = [
        { id: vmSizingCreateId(), name: "VM Web", role: "Frontal web", vcpu: 2, ramGB: 4, diskGB1: 60, diskGB2: 0, diskGB3: 0 },
        { id: vmSizingCreateId(), name: "VM Base de données", role: "Base de données", vcpu: 4, ramGB: 16, diskGB1: 100, diskGB2: 100, diskGB3: 0 }
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

function vmSizingUpdateVm(vmId, patch) {
    const profile = vmSizingGetActiveProfile();
    const vm = profile.vms.find((item) => item.id === vmId);
    if (!vm) return;
    Object.assign(vm, patch);
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

function vmSizingVmDiskTotal(vm) {
    return vm.diskGB1 + vm.diskGB2 + vm.diskGB3;
}

function vmSizingCalculate(profile) {
    const totalLogicalCores = profile.cpuSockets * profile.cpuCoresPerSocket * profile.cpuThreadsPerCore;

    const usableCpu = totalLogicalCores;
    const usableRam = profile.ramGB;
    const usableStorage = profile.storageGB;

    const requiredVcpu = profile.vms.reduce((sum, vm) => sum + vm.vcpu, 0);
    const requiredRam = profile.vms.reduce((sum, vm) => sum + vm.ramGB, 0);
    const requiredStorage = profile.vms.reduce((sum, vm) => sum + vmSizingVmDiskTotal(vm), 0);
    const vmCount = profile.vms.length;

    const cpuPercent = usableCpu > 0 ? (requiredVcpu / usableCpu) * 100 : 0;
    const ramPercent = usableRam > 0 ? (requiredRam / usableRam) * 100 : 0;
    const storagePercent = usableStorage > 0 ? (requiredStorage / usableStorage) * 100 : 0;

    const cpu = { required: requiredVcpu, usable: usableCpu, percent: cpuPercent, status: vmSizingStatusForPercent(cpuPercent) };
    const ram = { required: requiredRam, usable: usableRam, percent: ramPercent, status: vmSizingStatusForPercent(ramPercent) };
    const storage = { required: requiredStorage, usable: usableStorage, percent: storagePercent, status: vmSizingStatusForPercent(storagePercent) };

    return {
        totalLogicalCores,
        cpu,
        ram,
        storage,
        overallStatus: vmSizingWorstStatus([cpu.status, ram.status, storage.status]),
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
        body.innerHTML = `<tr><td colspan="3" class="empty-state">Aucun serveur pour le moment.</td></tr>`;
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
                const nameField = document.querySelector('#vmsizing-server-form [data-field="name"]');
                if (nameField) nameField.value = vmSizingProfiles[index].name;
            }
        });
    });

    body.querySelectorAll("tr[data-server-id]").forEach((row) => {
        row.addEventListener("click", () => {
            vmSizingSelectProfile(row.dataset.serverId);
        });
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

    VMSIZING_SPEC_FIELDS.forEach((field) => {
        const input = form.querySelector(`[data-field="${field}"]`);
        if (input) input.value = profile[field];
    });
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
    vmSizingSetGauge("storage", result.storage);

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

    if (profile.vms.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="empty-state">Aucune VM ajoutée pour le moment.</td></tr>`;
        return;
    }

    tbody.innerHTML = profile.vms
        .map(
            (vm) => `
        <tr data-vm-id="${escapeHtml(vm.id)}">
            <td><input type="text" class="vmsizing-input" data-vm-field="name" value="${escapeHtml(vm.name)}" /></td>
            <td><input type="text" class="vmsizing-input" data-vm-field="role" value="${escapeHtml(vm.role)}" /></td>
            <td><input type="number" class="vmsizing-input vmsizing-input-num" min="1" data-vm-field="vcpu" value="${vm.vcpu}" /></td>
            <td><input type="number" class="vmsizing-input vmsizing-input-num" min="0.5" step="0.5" data-vm-field="ramGB" value="${vm.ramGB}" /></td>
            <td><input type="number" class="vmsizing-input vmsizing-input-num" min="0" data-vm-field="diskGB1" value="${vm.diskGB1}" /></td>
            <td><input type="number" class="vmsizing-input vmsizing-input-num" min="0" data-vm-field="diskGB2" value="${vm.diskGB2}" /></td>
            <td><input type="number" class="vmsizing-input vmsizing-input-num" min="0" data-vm-field="diskGB3" value="${vm.diskGB3}" /></td>
            <td class="select-col"><button class="row-delete-btn" type="button" data-remove-vm title="Retirer">&times;</button></td>
        </tr>`
        )
        .join("");
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

        const isText = field === "name";
        const value = isText ? event.target.value : vmSizingToNumber(event.target.value, 0);

        vmSizingUpdateActiveProfile({ [field]: value });
        vmSizingRenderGauges();

        if (field === "name") vmSizingRenderServerTable();
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

        const isText = VMSIZING_VM_TEXT_FIELDS.includes(field);
        const value = isText ? event.target.value : vmSizingToNumber(event.target.value, 0);

        vmSizingUpdateVm(vmId, { [field]: value });
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

function initVmSizingPage() {
    if (typeof helpTexts !== "undefined") {
        helpTexts.vmsizing = `
            <p>Cette page sert à dimensionner les machines virtuelles d'un serveur physique.</p>
            <ul>
                <li>La colonne de gauche liste tes serveurs, comme les catégories de la page Compétences : coche puis "-" pour supprimer, "+" pour ajouter, clique sur le numéro pour changer la couleur.</li>
                <li>Clique sur un serveur pour l'afficher à droite.</li>
                <li>Renseigne les caractéristiques du serveur : sockets, cœurs, threads, RAM et stockage.</li>
                <li>Ajoute les VM prévues dans le tableau : rôle, vCPU, RAM et jusqu'à 3 disques.</li>
                <li>Les jauges CPU / RAM / Stockage indiquent le taux d'utilisation (OK &lt; 80&nbsp;%, Attention 80–100&nbsp;%, Critique &gt; 100&nbsp;%).</li>
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
