const PROJECTS_STORAGE_KEY = "forge_projects_v1";
const ACTIVE_PROJECT_STORAGE_KEY = "forge_active_project_id_v1";

const LEGACY_PROJECT_INFO_STORAGE_KEY = "forge_project_info_v1";
const LEGACY_STAKEHOLDERS_STORAGE_KEY = "project_stakeholders_v7_compact_select";
const LEGACY_PHASES_STORAGE_KEY = "forge_wbs_phases_v1";
const LEGACY_WBS_STORAGE_KEY = "forge_wbs_rows_v1";
const LEGACY_SWOT_STORAGE_KEY = "forge_swot_v1";

const OLD_STAKEHOLDERS_STORAGE_KEYS = [
    "project_stakeholders_v6_nav_help",
    "project_stakeholders_v5_dark_clean",
    "project_stakeholders_v4_dark",
    "project_stakeholders_v3",
    "project_stakeholders_v2"
];

const defaultProjectInfo = {
    name: "",
    startDate: "",
    endDate: ""
};

const predefinedColors = [
    "#ff1744", "#ff6b4a", "#ff9100", "#ffc400", "#ffea00",
    "#b6ff00", "#00e676", "#00ffb3", "#00c2a8", "#00e5ff",
    "#38bdf8", "#2979ff", "#304ffe", "#651fff", "#8b5cf6",
    "#d500f9", "#ff00aa", "#ff4081", "#c08457", "#94a3b8"
];

const defaultStakeholders = [];

const defaultPhases = [];

const defaultWbsRows = [];

const defaultSwot = {
    strengths: [],
    weaknesses: [],
    opportunities: [],
    threats: []
};

const swotLabels = {
    strengths: "Forces",
    weaknesses: "Faiblesses",
    opportunities: "Opportunités",
    threats: "Menaces"
};

const helpTexts = {
    stakeholders: `
        <p>Cette page sert à gérer les parties prenantes du projet.</p>
        <ul>
            <li>Clique dans une cellule pour modifier le texte.</li>
            <li>Clique sur le numéro d’une ligne pour choisir une couleur parmi 20 couleurs prédéfinies.</li>
            <li>Coche une ou plusieurs lignes, puis clique sur “Supprimer la sélection” pour les retirer.</li>
            <li>Utilise “+ Ajouter une personne” pour créer une nouvelle ligne.</li>
            <li>Le sélecteur “Projet actif” permet de changer de projet.</li>
            <li>Les changements sont sauvegardés automatiquement pour le projet actif.</li>
            <li>Utilise “Exporter” et “Importer” pour transporter tes données sur un autre poste.</li>
        </ul>
    `,
    wbs: `
        <p>Cette page sert à construire un premier WBS du projet.</p>
        <ul>
            <li>Le tableau de gauche permet de créer les grandes phases du projet.</li>
            <li>Clique sur le numéro d’une phase pour changer sa couleur.</li>
            <li>Dans le tableau WBS, choisis une phase pour chaque tâche ou livrable.</li>
            <li>Les lignes WBS prennent automatiquement la couleur de leur phase, en version plus claire.</li>
            <li>Le sélecteur “Projet actif” permet de changer de projet.</li>
            <li>Les changements sont sauvegardés automatiquement pour le projet actif.</li>
            <li>Utilise “Exporter” et “Importer” pour transporter tes données sur un autre poste.</li>
        </ul>
    `,
    swot: `
        <p>Cette page sert à construire l’analyse SWOT du projet.</p>
        <ul>
            <li>Forces et Faiblesses correspondent aux éléments internes au projet.</li>
            <li>Opportunités et Menaces correspondent aux éléments externes.</li>
            <li>Clique dans un élément pour le modifier.</li>
            <li>Utilise le petit bouton “+” à côté du titre d’un bloc pour ajouter un élément.</li>
            <li>Coche des éléments puis clique sur le petit bouton “-” du bloc pour les retirer.</li>
            <li>Le sélecteur “Projet actif” permet de changer de projet.</li>
            <li>Les changements sont sauvegardés automatiquement pour le projet actif.</li>
            <li>Utilise “Exporter” et “Importer” pour transporter tes données sur un autre poste.</li>
        </ul>
    `,
    raci: `
        <p>Cette page génère automatiquement le RACI à partir du WBS et des parties prenantes.</p>
        <ul>
            <li>Les lignes viennent des tâches / livrables du WBS.</li>
            <li>Les colonnes viennent des parties prenantes.</li>
            <li>Les phases sont séparées clairement au-dessus de leurs tâches.</li>
            <li>Tu ne remplis que les lettres R, A, C ou I.</li>
            <li>Les changements sont sauvegardés automatiquement pour le projet actif.</li>
            <li>Utilise “Exporter” et “Importer” pour transporter tes données sur un autre poste.</li>
        </ul>
    `
};

let projects = [];
let activeProjectId = "";
let stakeholders = [];
let selectedRows = new Set();
let phases = [];
let selectedPhases = new Set();
let wbsRows = [];
let selectedWbsRows = new Set();
let activeColorTarget = null;
let swotData = {};
let raciData = {};
let ganttPeriods = [];
let decoupagePhases = [];
let decoupageSteps = [];
let selectedSwotItems = { strengths: new Set(), weaknesses: new Set(), opportunities: new Set(), threats: new Set() };

const currentPage = document.body.dataset.page;

const tableBody = document.getElementById("stakeholders-table");
const addPersonButton = document.getElementById("add-person-btn");
const resetButton = document.getElementById("reset-btn");
const deleteSelectedButton = document.getElementById("delete-selected-btn");
const selectAllCheckbox = document.getElementById("select-all-checkbox");

const phasesTableBody = document.getElementById("phases-table");
const addPhaseButton = document.getElementById("add-phase-btn");
const deleteSelectedPhasesButton = document.getElementById("delete-selected-phases-btn");
const resetPhasesButton = document.getElementById("reset-phases-btn");
const selectAllPhasesCheckbox = document.getElementById("select-all-phases-checkbox");

const wbsTableBody = document.getElementById("wbs-table");
const addWbsRowButton = document.getElementById("add-wbs-row-btn");
const deleteSelectedWbsButton = document.getElementById("delete-selected-wbs-btn");
const resetWbsButton = document.getElementById("reset-wbs-btn");
const selectAllWbsCheckbox = document.getElementById("select-all-wbs-checkbox");

const colorMenu = document.getElementById("color-menu");
const helpButton = document.getElementById("help-btn");
const helpModal = document.getElementById("help-modal");
const helpCloseButton = document.getElementById("help-close-btn");
const helpContent = document.getElementById("help-content");
const projectInfoInputs = document.querySelectorAll("[data-project-field]");
const projectSelector = document.getElementById("project-selector");
const newProjectButton = document.getElementById("new-project-btn");
const exportDataButton = document.getElementById("export-data-btn");
const importDataButton = document.getElementById("import-data-btn");
const importDataInput = document.getElementById("import-data-input");

const swotAddButtons = document.querySelectorAll(".swot-add-btn");
const swotDeleteButtons = document.querySelectorAll(".swot-delete-btn");
const swotResetButton = document.getElementById("reset-swot-btn");

const raciTableHead = document.getElementById("raci-table-head");
const raciTableBody = document.getElementById("raci-table-body");
const resetRaciButton = document.getElementById("reset-raci-btn");


function initProjects() {
    projects = loadProjects();

    if (projects.length === 0) {
        const legacyProjectInfo = loadLegacyProjectInfo();
        const firstProject = {
            id: createId(),
            name: legacyProjectInfo.name || "Projet 1",
            startDate: legacyProjectInfo.startDate || "",
            endDate: legacyProjectInfo.endDate || ""
        };

        projects.push(firstProject);
        activeProjectId = firstProject.id;
        saveProjects();
        saveActiveProjectId();
        migrateLegacyDataToProject(firstProject.id);
        return;
    }

    activeProjectId = localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY);

    if (!projects.some((project) => project.id === activeProjectId)) {
        activeProjectId = projects[0].id;
        saveActiveProjectId();
    }
}

function loadProjects() {
    const savedData = localStorage.getItem(PROJECTS_STORAGE_KEY);

    if (!savedData) {
        return [];
    }

    try {
        const parsedData = JSON.parse(savedData);

        if (!Array.isArray(parsedData)) {
            return [];
        }

        return parsedData.map((project, index) => ({
            id: project.id || createId(),
            name: project.name || `Projet ${index + 1}`,
            startDate: project.startDate || "",
            endDate: project.endDate || ""
        }));
    } catch (error) {
        console.error("Impossible de charger les projets :", error);
        return [];
    }
}

function saveProjects() {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
}

function saveActiveProjectId() {
    localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, activeProjectId);
}

function getActiveProject() {
    return projects.find((project) => project.id === activeProjectId) || projects[0];
}

function getProjectKey(type) {
    return `forge_project_${activeProjectId}_${type}_v1`;
}

function loadLegacyProjectInfo() {
    const savedData = localStorage.getItem(LEGACY_PROJECT_INFO_STORAGE_KEY);

    if (!savedData) {
        return structuredClone(defaultProjectInfo);
    }

    try {
        const parsedData = JSON.parse(savedData);

        return {
            name: parsedData.name || "",
            startDate: parsedData.startDate || "",
            endDate: parsedData.endDate || ""
        };
    } catch (error) {
        return structuredClone(defaultProjectInfo);
    }
}

function migrateLegacyDataToProject(projectId) {
    const migrationMap = [
        { newKey: `forge_project_${projectId}_stakeholders_v1`, legacyKey: LEGACY_STAKEHOLDERS_STORAGE_KEY },
        { newKey: `forge_project_${projectId}_phases_v1`, legacyKey: LEGACY_PHASES_STORAGE_KEY },
        { newKey: `forge_project_${projectId}_wbs_v1`, legacyKey: LEGACY_WBS_STORAGE_KEY },
        { newKey: `forge_project_${projectId}_swot_v1`, legacyKey: LEGACY_SWOT_STORAGE_KEY }
    ];

    migrationMap.forEach(({ newKey, legacyKey }) => {
        if (localStorage.getItem(newKey)) return;

        const legacyData = localStorage.getItem(legacyKey);
        if (legacyData) {
            localStorage.setItem(newKey, legacyData);
        }
    });

    if (!localStorage.getItem(`forge_project_${projectId}_stakeholders_v1`)) {
        for (const key of OLD_STAKEHOLDERS_STORAGE_KEYS) {
            const savedData = localStorage.getItem(key);
            if (savedData) {
                localStorage.setItem(`forge_project_${projectId}_stakeholders_v1`, savedData);
                break;
            }
        }
    }
}

function initProjectSwitcher() {
    if (!projectSelector || !newProjectButton) return;

    renderProjectSelector();

    projectSelector.addEventListener("change", () => {
        activeProjectId = projectSelector.value;
        saveActiveProjectId();
        location.reload();
    });

    newProjectButton.addEventListener("click", () => {
        const projectNumber = projects.length + 1;
        const newProject = {
            id: createId(),
            name: `Projet ${projectNumber}`,
            startDate: "",
            endDate: ""
        };

        projects.push(newProject);
        activeProjectId = newProject.id;
        saveProjects();
        saveActiveProjectId();
        seedProjectData(newProject.id);
        location.reload();
    });
}

function renderProjectSelector() {
    const activeProject = getActiveProject();

    projectSelector.innerHTML = projects.map((project, index) => {
        const label = project.name || `Projet ${index + 1}`;
        return `
            <option value="${escapeHtml(project.id)}" ${project.id === activeProject.id ? "selected" : ""}>
                ${escapeHtml(label)}
            </option>
        `;
    }).join("");
}


function initProjectInfo() {
    if (!projectInfoInputs.length) return;

    const projectInfo = loadProjectInfo();

    projectInfoInputs.forEach((input) => {
        const field = input.dataset.projectField;
        input.value = projectInfo[field] || "";

        input.addEventListener("input", () => {
            const updatedInfo = loadProjectInfo();
            updatedInfo[field] = input.value;
            saveProjectInfo(updatedInfo);
        });
    });
}

function loadProjectInfo() {
    const activeProject = getActiveProject();

    if (!activeProject) {
        return structuredClone(defaultProjectInfo);
    }

    return {
        name: activeProject.name || "",
        startDate: activeProject.startDate || "",
        endDate: activeProject.endDate || ""
    };
}

function saveProjectInfo(projectInfo) {
    const project = getActiveProject();

    if (!project) return;

    project.name = projectInfo.name || "";
    project.startDate = projectInfo.startDate || "";
    project.endDate = projectInfo.endDate || "";
    saveProjects();
    renderProjectSelector();
}


function initPortableDataControls() {
    if (!exportDataButton || !importDataButton || !importDataInput) return;

    exportDataButton.addEventListener("click", exportForgeData);

    importDataButton.addEventListener("click", () => {
        importDataInput.click();
    });

    importDataInput.addEventListener("change", importForgeData);
}






function buildRaciWidths(exportStakeholders) {
    return [
        140,
        45,
        280,
        ...exportStakeholders.map(() => 55)
    ];
}







function readJsonFromStorage(key, fallbackValue) {
    const savedData = localStorage.getItem(key);

    if (!savedData) {
        return fallbackValue;
    }

    try {
        return JSON.parse(savedData);
    } catch (error) {
        console.error(`Impossible de lire ${key} :`, error);
        return fallbackValue;
    }
}



function closeHelp() {
    if (helpModal) {
        helpModal.classList.add("hidden");
    }
}

function initStakeholdersPage() {
    stakeholders = loadStakeholders();
    renderStakeholdersTable();
    renderColorMenu();

    addPersonButton.addEventListener("click", () => {
        stakeholders.push({
            id: createId(),
            color: predefinedColors[stakeholders.length % predefinedColors.length],
            nom: "",
            prenom: "",
            fonction: "",
            role: "",
            description: ""
        });

        saveStakeholders();
        renderStakeholdersTable();

        const lastRow = tableBody.querySelector("tr:last-child .editable");
        if (lastRow) {
            lastRow.focus();
        }
    });

    deleteSelectedButton.addEventListener("click", () => {
        if (selectedRows.size === 0) return;

        const confirmation = confirm("Tu veux vraiment supprimer les lignes cochées ?");
        if (!confirmation) return;

        stakeholders = stakeholders.filter((_, index) => !selectedRows.has(index));
        selectedRows.clear();
        saveStakeholders();
        hideColorMenu();
        renderStakeholdersTable();
    });

    resetButton.addEventListener("click", () => {
        const confirmation = confirm("Tu veux vraiment réinitialiser le tableau ?");
        if (!confirmation) return;

        stakeholders = structuredClone(defaultStakeholders);
        selectedRows.clear();
        saveStakeholders();
        hideColorMenu();
        renderStakeholdersTable();
    });

    selectAllCheckbox.addEventListener("change", (event) => {
        selectedRows.clear();

        if (event.target.checked) {
            stakeholders.forEach((_, index) => selectedRows.add(index));
        }

        renderStakeholdersTable();
    });

    document.addEventListener("click", closeColorMenuOnOutsideClick);
}

function renderStakeholdersTable() {
    tableBody.innerHTML = "";

    if (stakeholders.length === 0) {
        const row = document.createElement("tr");
        row.innerHTML = `<td colspan="7" class="empty-state">Aucune partie prenante pour le moment.</td>`;
        tableBody.appendChild(row);
        updateStakeholdersSelectionControls();
        return;
    }

    stakeholders.forEach((person, index) => {
        const row = document.createElement("tr");
        const color = normalizeColor(person.color, index);
        const isSelected = selectedRows.has(index);

        row.style.backgroundColor = hexToRgba(color, 0.18);
        row.style.boxShadow = `inset 3px 0 0 ${color}`;

        if (isSelected) {
            row.classList.add("selected-row");
        }

        row.innerHTML = `
            <td class="select-col">
                <input
                    class="row-checkbox"
                    type="checkbox"
                    data-index="${index}"
                    aria-label="Sélectionner la ligne ${index + 1}"
                    ${isSelected ? "checked" : ""}
                />
            </td>
            <td>
                <button
                    class="row-number-btn"
                    type="button"
                    style="background-color: ${escapeHtml(color)}; --row-glow: ${hexToRgba(color, 0.44)};"
                    data-index="${index}"
                    aria-label="Choisir la couleur de la ligne ${index + 1}"
                    title="Choisir la couleur"
                >${index + 1}</button>
            </td>
            ${createEditableCell(person.nom, index, "nom")}
            ${createEditableCell(person.prenom, index, "prenom")}
            ${createEditableCell(person.fonction, index, "fonction")}
            ${createEditableCell(person.role, index, "role")}
            ${createEditableCell(person.description, index, "description", "description-cell")}
        `;

        tableBody.appendChild(row);
    });

    bindStakeholdersTableEvents();
    updateStakeholdersSelectionControls();
}

function bindStakeholdersTableEvents() {
    document.querySelectorAll(".editable").forEach((cell) => {
        cell.addEventListener("input", (event) => {
            const index = Number(event.target.dataset.index);
            const field = event.target.dataset.field;

            stakeholders[index][field] = event.target.textContent.trim();
            saveStakeholders();
        });
    });

    document.querySelectorAll(".row-number-btn").forEach((button) => {
        button.addEventListener("click", (event) => {
            event.stopPropagation();

            activeColorTarget = {
                type: "stakeholder",
                index: Number(event.target.dataset.index)
            };

            showColorMenu(event.target);
        });
    });

    document.querySelectorAll("tbody .row-checkbox").forEach((checkbox) => {
        checkbox.addEventListener("change", (event) => {
            const index = Number(event.target.dataset.index);

            if (event.target.checked) {
                selectedRows.add(index);
            } else {
                selectedRows.delete(index);
            }

            renderStakeholdersTable();
        });
    });
}

function updateStakeholdersSelectionControls() {
    if (!deleteSelectedButton || !selectAllCheckbox) return;

    deleteSelectedButton.disabled = selectedRows.size === 0;

    if (stakeholders.length === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.disabled = true;
        return;
    }

    selectAllCheckbox.disabled = false;
    selectAllCheckbox.checked = selectedRows.size === stakeholders.length;
    selectAllCheckbox.indeterminate = selectedRows.size > 0 && selectedRows.size < stakeholders.length;
}

function loadStakeholders() {
    const savedData = localStorage.getItem(getProjectKey("stakeholders"));

    if (!savedData) {
        return structuredClone(defaultStakeholders);
    }

    try {
        const parsedData = JSON.parse(savedData);

        if (!Array.isArray(parsedData)) {
            return structuredClone(defaultStakeholders);
        }

        const normalizedStakeholders = parsedData.map((person, index) => ({
            id: person.id || createId(),
            color: normalizeColor(person.color, index),
            nom: person.nom || "",
            prenom: person.prenom || "",
            fonction: person.fonction || "",
            role: person.role || "",
            description: person.description || ""
        }));

        localStorage.setItem(getProjectKey("stakeholders"), JSON.stringify(normalizedStakeholders));
        return normalizedStakeholders;
    } catch (error) {
        console.error("Impossible de charger les parties prenantes :", error);
        return structuredClone(defaultStakeholders);
    }
}

function saveStakeholders() {
    localStorage.setItem(getProjectKey("stakeholders"), JSON.stringify(stakeholders));
}


function renderPhasesTable() {
    phasesTableBody.innerHTML = "";

    if (phases.length === 0) {
        const row = document.createElement("tr");
        row.innerHTML = `<td colspan="3" class="empty-state">Aucune phase pour le moment.</td>`;
        phasesTableBody.appendChild(row);
        updatePhasesSelectionControls();
        return;
    }

    phases.forEach((phase, index) => {
        const color = normalizeColor(phase.color, index);
        const isSelected = selectedPhases.has(index);
        const row = document.createElement("tr");

        row.style.backgroundColor = hexToRgba(color, 0.20);
        row.style.boxShadow = `inset 3px 0 0 ${color}`;

        if (isSelected) {
            row.classList.add("selected-row");
        }

        row.innerHTML = `
            <td class="select-col">
                <input
                    class="row-checkbox phase-checkbox"
                    type="checkbox"
                    data-index="${index}"
                    aria-label="Sélectionner la phase ${index + 1}"
                    ${isSelected ? "checked" : ""}
                />
            </td>
            <td>
                <button
                    class="phase-number-btn"
                    type="button"
                    style="background-color: ${escapeHtml(color)}; --row-glow: ${hexToRgba(color, 0.44)};"
                    data-index="${index}"
                    aria-label="Choisir la couleur de la phase ${index + 1}"
                    title="Choisir la couleur"
                >${index + 1}</button>
            </td>
            ${createEditableCell(phase.name, index, "name", "phase-name-cell")}
        `;

        phasesTableBody.appendChild(row);
    });

    bindPhasesTableEvents();
    updatePhasesSelectionControls();
}

function bindPhasesTableEvents() {
    phasesTableBody.querySelectorAll(".editable").forEach((cell) => {
        cell.addEventListener("input", (event) => {
            const index = Number(event.target.dataset.index);
            const field = event.target.dataset.field;

            phases[index][field] = event.target.textContent.trim();
            savePhases();
            renderWbsTable();
        });
    });

    phasesTableBody.querySelectorAll(".phase-number-btn").forEach((button) => {
        button.addEventListener("click", (event) => {
            event.stopPropagation();

            activeColorTarget = {
                type: "phase",
                index: Number(event.target.dataset.index)
            };

            showColorMenu(event.target);
        });
    });

    phasesTableBody.querySelectorAll(".phase-checkbox").forEach((checkbox) => {
        checkbox.addEventListener("change", (event) => {
            const index = Number(event.target.dataset.index);

            if (event.target.checked) {
                selectedPhases.add(index);
            } else {
                selectedPhases.delete(index);
            }

            renderPhasesTable();
        });
    });
}

function updatePhasesSelectionControls() {
    if (!deleteSelectedPhasesButton || !selectAllPhasesCheckbox) return;

    deleteSelectedPhasesButton.disabled = selectedPhases.size === 0;

    if (phases.length === 0) {
        selectAllPhasesCheckbox.checked = false;
        selectAllPhasesCheckbox.indeterminate = false;
        selectAllPhasesCheckbox.disabled = true;
        return;
    }

    selectAllPhasesCheckbox.disabled = false;
    selectAllPhasesCheckbox.checked = selectedPhases.size === phases.length;
    selectAllPhasesCheckbox.indeterminate = selectedPhases.size > 0 && selectedPhases.size < phases.length;
}




function updateWbsSelectionControls() {
    if (!deleteSelectedWbsButton || !selectAllWbsCheckbox) return;

    deleteSelectedWbsButton.disabled = selectedWbsRows.size === 0;

    if (wbsRows.length === 0) {
        selectAllWbsCheckbox.checked = false;
        selectAllWbsCheckbox.indeterminate = false;
        selectAllWbsCheckbox.disabled = true;
        return;
    }

    selectAllWbsCheckbox.disabled = false;
    selectAllWbsCheckbox.checked = selectedWbsRows.size === wbsRows.length;
    selectAllWbsCheckbox.indeterminate = selectedWbsRows.size > 0 && selectedWbsRows.size < wbsRows.length;
}

function loadPhases() {
    const savedData = localStorage.getItem(getProjectKey("phases"));

    if (!savedData) {
        return structuredClone(defaultPhases);
    }

    try {
        const parsedData = JSON.parse(savedData);

        if (!Array.isArray(parsedData)) {
            return structuredClone(defaultPhases);
        }

        return parsedData.map((phase, index) => ({
            id: phase.id || createId(),
            color: normalizeColor(phase.color, index),
            name: phase.name || ""
        }));
    } catch (error) {
        console.error("Impossible de charger les phases :", error);
        return structuredClone(defaultPhases);
    }
}

function savePhases() {
    localStorage.setItem(getProjectKey("phases"), JSON.stringify(phases));
}



function initSwotPage() {
    swotData = loadSwot();
    renderSwot();

    swotAddButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const category = button.dataset.category;
            swotData[category].push({ text: "" });
            saveSwot();
            renderSwot();

            const list = document.getElementById(`swot-${category}-list`);
            const lastItem = list?.querySelector(".swot-item:last-child .swot-item-text");

            if (lastItem) {
                lastItem.focus();
            }
        });
    });

    swotDeleteButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const category = button.dataset.category;
            const selectedItems = selectedSwotItems[category];

            if (!selectedItems || selectedItems.size === 0) return;

            const confirmation = confirm(`Tu veux vraiment supprimer les éléments cochés dans ${swotLabels[category]} ?`);
            if (!confirmation) return;

            swotData[category] = swotData[category].filter((_, index) => !selectedItems.has(index));
            selectedItems.clear();
            saveSwot();
            renderSwot();
        });
    });

    if (swotResetButton) {
        swotResetButton.addEventListener("click", () => {
            const confirmation = confirm("Tu veux vraiment réinitialiser le SWOT ?");
            if (!confirmation) return;

            swotData = structuredClone(defaultSwot);
            selectedSwotItems = { strengths: new Set(), weaknesses: new Set(), opportunities: new Set(), threats: new Set() };
            saveSwot();
            renderSwot();
        });
    }
}

function renderSwot() {
    Object.keys(swotLabels).forEach((category) => {
        const list = document.getElementById(`swot-${category}-list`);
        if (!list) return;

        list.innerHTML = "";

        if (!swotData[category] || swotData[category].length === 0) {
            list.innerHTML = `<div class="swot-empty-state">Aucun élément pour le moment.</div>`;
            updateSwotDeleteButton(category);
            return;
        }

        swotData[category].forEach((item, index) => {
            const isSelected = selectedSwotItems[category].has(index);
            const row = document.createElement("div");
            row.className = `swot-item ${isSelected ? "selected-row" : ""}`;

            row.innerHTML = `
                <input
                    class="swot-item-checkbox"
                    type="checkbox"
                    data-category="${category}"
                    data-index="${index}"
                    aria-label="Sélectionner l’élément ${index + 1} de ${swotLabels[category]}"
                    ${isSelected ? "checked" : ""}
                />
                <div
                    class="swot-item-text"
                    contenteditable="true"
                    spellcheck="true"
                    data-category="${category}"
                    data-index="${index}"
                >${escapeHtml(item.text)}</div>
            `;

            list.appendChild(row);
        });

        bindSwotEvents(category);
        updateSwotDeleteButton(category);
    });
}

function bindSwotEvents(category) {
    const list = document.getElementById(`swot-${category}-list`);
    if (!list) return;

    list.querySelectorAll(".swot-item-text").forEach((item) => {
        item.addEventListener("input", (event) => {
            const category = event.target.dataset.category;
            const index = Number(event.target.dataset.index);

            swotData[category][index].text = event.target.textContent.trim();
            saveSwot();
        });
    });

    list.querySelectorAll(".swot-item-checkbox").forEach((checkbox) => {
        checkbox.addEventListener("change", (event) => {
            const category = event.target.dataset.category;
            const index = Number(event.target.dataset.index);

            if (event.target.checked) {
                selectedSwotItems[category].add(index);
            } else {
                selectedSwotItems[category].delete(index);
            }

            renderSwot();
        });
    });
}

function updateSwotDeleteButton(category) {
    const button = document.querySelector(`.swot-delete-btn[data-category="${category}"]`);
    if (!button) return;

    button.disabled = selectedSwotItems[category].size === 0;
}

function loadSwot() {
    const savedData = localStorage.getItem(getProjectKey("swot"));

    if (!savedData) {
        return structuredClone(defaultSwot);
    }

    try {
        const parsedData = JSON.parse(savedData);

        return {
            strengths: Array.isArray(parsedData.strengths) ? parsedData.strengths : [],
            weaknesses: Array.isArray(parsedData.weaknesses) ? parsedData.weaknesses : [],
            opportunities: Array.isArray(parsedData.opportunities) ? parsedData.opportunities : [],
            threats: Array.isArray(parsedData.threats) ? parsedData.threats : []
        };
    } catch (error) {
        console.error("Impossible de charger le SWOT :", error);
        return structuredClone(defaultSwot);
    }
}

function saveSwot() {
    localStorage.setItem(getProjectKey("swot"), JSON.stringify(swotData));
}





function bindRaciEvents() {
    raciTableBody.querySelectorAll(".raci-select").forEach((select) => {
        select.addEventListener("change", (event) => {
            const rowId = event.target.dataset.rowId;
            const stakeholderId = event.target.dataset.stakeholderId;
            const value = event.target.value;

            if (!raciData[rowId]) {
                raciData[rowId] = {};
            }

            if (value) {
                raciData[rowId][stakeholderId] = value;
            } else {
                delete raciData[rowId][stakeholderId];

                if (Object.keys(raciData[rowId]).length === 0) {
                    delete raciData[rowId];
                }
            }

            saveRaci();
            event.target.className = `raci-select ${value ? `raci-${value.toLowerCase()}` : ""}`;
        });
    });

    raciTableBody.querySelectorAll(".raci-phase-capture-btn").forEach((button) => {
        button.addEventListener("click", async (event) => {
            event.preventDefault();
            event.stopPropagation();
            await captureRaciPhase(event.currentTarget, event.currentTarget.dataset.capturePhaseId || "");
        });
    });
}

// Capture juste une phase du RACI : même principe que pour le WBS (masquer
// temporairement les lignes des autres phases, réutiliser le pipeline de
// capture existant sur la carte entière, puis restaurer l'affichage).
async function captureRaciPhase(button, phaseId) {
    const card = button.closest(".card");
    if (!card || !raciTableBody) return;

    const group = groupWbsRowsByPhase().find((item) => item.phaseId === phaseId);
    const phaseLabel = group ? (group.phase?.name || group.label || "Sans phase") : "Sans phase";

    const titleEl = card.querySelector(":scope > .card-header h2");
    const previousTitle = titleEl ? titleEl.textContent : null;
    if (titleEl) titleEl.textContent = `RACI - ${phaseLabel}`;

    const rowsToHide = Array.from(raciTableBody.children).filter((row) => row.dataset.phaseId !== phaseId);

    rowsToHide.forEach((row) => {
        row.dataset.captureHiddenDisplay = row.style.display;
        row.style.display = "none";
    });

    try {
        await captureCardToClipboard(card, button);
    } finally {
        rowsToHide.forEach((row) => {
            row.style.display = row.dataset.captureHiddenDisplay || "";
            delete row.dataset.captureHiddenDisplay;
        });

        if (titleEl && previousTitle !== null) titleEl.textContent = previousTitle;
    }
}

function getRaciValue(wbsRow, stakeholder) {
    const rowId = getWbsRowId(wbsRow);
    const stakeholderId = getStakeholderId(stakeholder);

    return raciData[rowId]?.[stakeholderId] || "";
}

function loadRaci() {
    const savedData = localStorage.getItem(getProjectKey("raci"));

    if (!savedData) {
        return {};
    }

    try {
        const parsedData = JSON.parse(savedData);
        return parsedData && typeof parsedData === "object" && !Array.isArray(parsedData) ? parsedData : {};
    } catch (error) {
        console.error("Impossible de charger le RACI :", error);
        return {};
    }
}

function saveRaci() {
    localStorage.setItem(getProjectKey("raci"), JSON.stringify(raciData));
}

function getStakeholderLabel(person) {
    const fullName = `${person.prenom || ""} ${person.nom || ""}`.trim();
    return fullName || person.fonction || "Partie prenante";
}

function getStakeholderId(person) {
    return person.id || `${person.prenom || ""}-${person.nom || ""}-${person.fonction || ""}`;
}

function getWbsRowId(row, fallbackIndex = 0) {
    return row.id || `${fallbackIndex}-${row.task || ""}-${row.phaseId || ""}`;
}




function hideColorMenu() {
    if (!colorMenu) return;

    activeColorTarget = null;
    colorMenu.classList.add("hidden");
}


function createEditableCell(value, index, field, extraClass = "") {
    return `
        <td
            class="editable ${extraClass}"
            contenteditable="true"
            data-index="${index}"
            data-field="${field}"
            spellcheck="true"
        >${escapeHtml(value)}</td>
    `;
}

function normalizeColor(color, index) {
    if (predefinedColors.includes(color)) {
        return color;
    }

    return predefinedColors[index % predefinedColors.length];
}

function hexToRgba(hex, alpha) {
    const cleanHex = hex.replace("#", "");
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function createId() {
    return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clampNumber(value, min, max) {
    if (value === "") return "";

    const number = Number(value);

    if (Number.isNaN(number)) {
        return min;
    }

    return Math.min(Math.max(number, min), max);
}




/* V22 — Export Excel XLSX natif propre
   Cette fonction redéfinit l'ancien export .xls compatible en vrai .xlsx Office Open XML.
*/




















function createForgeLocalFileHeader(nameBytes, size, crc) {
    const header = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(header.buffer);
    const { time, date } = getForgeDosDateTime();

    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0x0800, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, time, true);
    view.setUint16(12, date, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, size, true);
    view.setUint32(22, size, true);
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true);
    header.set(nameBytes, 30);

    return header;
}

function createForgeCentralDirectoryHeader(nameBytes, size, crc, offset) {
    const header = new Uint8Array(46 + nameBytes.length);
    const view = new DataView(header.buffer);
    const { time, date } = getForgeDosDateTime();

    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint16(8, 0x0800, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, time, true);
    view.setUint16(14, date, true);
    view.setUint32(16, crc, true);
    view.setUint32(20, size, true);
    view.setUint32(24, size, true);
    view.setUint16(28, nameBytes.length, true);
    view.setUint16(30, 0, true);
    view.setUint16(32, 0, true);
    view.setUint16(34, 0, true);
    view.setUint16(36, 0, true);
    view.setUint32(38, 0, true);
    view.setUint32(42, offset, true);
    header.set(nameBytes, 46);

    return header;
}

function createForgeEndOfCentralDirectoryRecord(fileCount, centralDirectorySize, centralDirectoryOffset) {
    const record = new Uint8Array(22);
    const view = new DataView(record.buffer);

    view.setUint32(0, 0x06054b50, true);
    view.setUint16(4, 0, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, fileCount, true);
    view.setUint16(10, fileCount, true);
    view.setUint32(12, centralDirectorySize, true);
    view.setUint32(16, centralDirectoryOffset, true);
    view.setUint16(20, 0, true);

    return record;
}

function getForgeDosDateTime() {
    const now = new Date();
    const time = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
    const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

    return { time, date };
}

function concatForgeUint8Arrays(arrays) {
    const totalLength = arrays.reduce((total, array) => total + array.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;

    arrays.forEach((array) => {
        result.set(array, offset);
        offset += array.length;
    });

    return result;
}

function crc32Forge(bytes) {
    const table = crc32Forge.table || (crc32Forge.table = buildForgeCrc32Table());
    let crc = -1;

    for (let index = 0; index < bytes.length; index++) {
        crc = (crc >>> 8) ^ table[(crc ^ bytes[index]) & 0xff];
    }

    return (crc ^ -1) >>> 0;
}

function buildForgeCrc32Table() {
    const table = new Uint32Array(256);

    for (let index = 0; index < 256; index++) {
        let crc = index;

        for (let bit = 0; bit < 8; bit++) {
            crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
        }

        table[index] = crc >>> 0;
    }

    return table;
}






/* V23 — GANTT automatique */
if (typeof helpTexts !== "undefined") {
    helpTexts.gantt = `
        <p>Cette page génère automatiquement un GANTT depuis le WBS.</p>
        <ul>
            <li>La frise utilise les dates de début et de fin du projet.</li>
            <li>Les tâches viennent automatiquement du WBS.</li>
            <li>Si une tâche a des dates WBS, elles sont utilisées.</li>
            <li>Sinon, Forge calcule les dates avec le jour début, la durée et le jour fin.</li>
            <li>Les phases sont séparées clairement et les tâches reprennent leur couleur.</li>
            <li>L’avancement du WBS colore une partie de la barre.</li>
        </ul>
    `;
}







function groupGanttTasksByPhase(tasks) {
    const groups = [];
    const groupMap = new Map();

    tasks.forEach((task) => {
        const phaseId = task.phaseId || "__no_phase__";

        if (!groupMap.has(phaseId)) {
            const phase = phases.find((item) => item.id === task.phaseId) || null;
            const group = {
                phaseId,
                phase,
                tasks: []
            };

            groupMap.set(phaseId, group);
            groups.push(group);
        }

        groupMap.get(phaseId).tasks.push(task);
    });

    return groups;
}

function isDateInGanttTask(day, task) {
    if (!task.start || !task.end) return false;

    const current = startOfForgeDay(day);
    return current >= task.start && current <= task.end;
}

function buildDateRange(start, end) {
    const dates = [];
    let current = startOfForgeDay(start);
    const finalDate = startOfForgeDay(end);

    while (current <= finalDate) {
        dates.push(current);
        current = addForgeDays(current, 1);
    }

    return dates;
}

function parseForgeDate(value) {
    if (!value) return null;

    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!match) return null;

    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);

    if (Number.isNaN(date.getTime())) return null;

    return startOfForgeDay(date);
}

function startOfForgeDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
}

function addForgeDays(date, days) {
    const copy = startOfForgeDay(date);
    copy.setDate(copy.getDate() + days);
    return startOfForgeDay(copy);
}

function getMinDate(dates) {
    const validDates = dates.filter(Boolean);
    if (validDates.length === 0) return null;

    return validDates.reduce((min, date) => date < min ? date : min, validDates[0]);
}

function getMaxDate(dates) {
    const validDates = dates.filter(Boolean);
    if (validDates.length === 0) return null;

    return validDates.reduce((max, date) => date > max ? date : max, validDates[0]);
}

function isSameForgeDay(firstDate, secondDate) {
    if (!firstDate || !secondDate) return false;

    return firstDate.getFullYear() === secondDate.getFullYear()
        && firstDate.getMonth() === secondDate.getMonth()
        && firstDate.getDate() === secondDate.getDate();
}

function formatForgeDate(date) {
    if (!date) return "";

    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function formatForgeMonth(date) {
    return date.toLocaleDateString("fr-FR", {
        month: "short",
        year: "numeric"
    }).replace(".", "");
}

function formatForgeWeekday(date) {
    return date.toLocaleDateString("fr-FR", {
        weekday: "short"
    }).slice(0, 2);
}

function parsePositiveInteger(value) {
    const number = Number(String(value || "").trim());

    if (!Number.isFinite(number) || number <= 0) return null;

    return Math.floor(number);
}

function clampPercent(value) {
    const number = Number(String(value || "0").trim());

    if (!Number.isFinite(number)) return 0;

    return Math.min(Math.max(Math.round(number), 0), 100);
}




/* V25 — Correctif bootstrap + WBS responsable + week-ends travaillés */
const WBS_SETTINGS_DEFAULT = {
    weekendsWorked: false
};



function initWbsPlanningToolbar() {
    const weekendsCheckbox = document.getElementById("wbs-weekends-worked");
    const weekendsStatus = document.getElementById("wbs-weekend-status");

    if (!weekendsCheckbox) return;

    const settings = loadWbsSettings();
    weekendsCheckbox.checked = settings.weekendsWorked;
    updateWbsWeekendStatusLabel(weekendsCheckbox, weekendsStatus);

    weekendsCheckbox.addEventListener("change", () => {
        saveWbsSettings({
            weekendsWorked: weekendsCheckbox.checked
        });

        updateWbsWeekendStatusLabel(weekendsCheckbox, weekendsStatus);
        recalculateWbsSchedule(true);
        renderWbsTable();
    });
}

function updateWbsWeekendStatusLabel(checkbox, label) {
    if (!checkbox || !label) return;

    label.textContent = checkbox.checked ? "Oui" : "Non";
}



function createWbsResponsableOptions(row) {
    const selectedId = row.responsableId || "";
    const currentText = row.responsable || "";
    const options = ['<option value="">Aucun responsable</option>'];

    stakeholders.forEach((person) => {
        const stakeholderId = getStakeholderId(person);
        const label = getStakeholderLabel(person);
        options.push(`
            <option value="${escapeHtml(stakeholderId)}" ${stakeholderId === selectedId ? "selected" : ""}>
                ${escapeHtml(label)}
            </option>
        `);
    });

    if (currentText && selectedId && !stakeholders.some((person) => getStakeholderId(person) === selectedId)) {
        options.push(`
            <option value="${escapeHtml(selectedId)}" selected>
                ${escapeHtml(currentText)}
            </option>
        `);
    }

    return options.join("");
}

function syncWbsResponsablesWithStakeholders() {
    let changed = false;

    wbsRows = wbsRows.map((row) => {
        if (!row.responsableId) return row;

        const stakeholder = stakeholders.find((person) => getStakeholderId(person) === row.responsableId);

        if (!stakeholder) return row;

        const label = getStakeholderLabel(stakeholder);

        if (row.responsable !== label) {
            changed = true;
            return { ...row, responsable: label };
        }

        return row;
    });

    if (changed) {
        saveWbsRows();
    }
}




function loadWbsSettings() {
    const savedData = localStorage.getItem(getProjectKey("wbs_settings"));

    if (!savedData) {
        return structuredClone(WBS_SETTINGS_DEFAULT);
    }

    try {
        const parsedData = JSON.parse(savedData);

        return {
            weekendsWorked: Boolean(parsedData.weekendsWorked)
        };
    } catch (error) {
        console.error("Impossible de charger les paramètres WBS :", error);
        return structuredClone(WBS_SETTINGS_DEFAULT);
    }
}

function saveWbsSettings(settings) {
    localStorage.setItem(getProjectKey("wbs_settings"), JSON.stringify({
        weekendsWorked: Boolean(settings.weekendsWorked)
    }));
}

function addForgeWorkingDays(startDate, offset, weekendsWorked, periods = []) {
    const isBlockedForgeDay = (day) => {
        if (!weekendsWorked && isForgeWeekend(day)) return true;
        if (getGanttPeriodForDay(day, periods)) return true;
        return false;
    };

    let date = startOfForgeDay(startDate);

    while (isBlockedForgeDay(date)) {
        date = addForgeDays(date, 1);
    }

    let remaining = Math.max(Number(offset) || 0, 0);

    while (remaining > 0) {
        date = addForgeDays(date, 1);

        if (!isBlockedForgeDay(date)) {
            remaining -= 1;
        }
    }

    return startOfForgeDay(date);
}

function isForgeWeekend(date) {
    return date.getDay() === 0 || date.getDay() === 6;
}

function formatForgeInputDate(date) {
    if (!date) return "";

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function buildGanttTask(row, originalIndex, projectStart) {
    let start = parseForgeDate(row.dateDebut);
    let end = parseForgeDate(row.dateFin);
    const settings = loadWbsSettings();
    const periods = loadGanttPeriods();

    const jourDebut = parsePositiveInteger(row.jourDebut);
    const duree = parsePositiveInteger(row.duree);
    const jourFin = parsePositiveInteger(row.jourFin);

    if (!start && projectStart && jourDebut) {
        start = addForgeWorkingDays(projectStart, jourDebut - 1, settings.weekendsWorked, periods);
    }

    if (!end && projectStart && jourFin) {
        end = addForgeWorkingDays(projectStart, jourFin - 1, settings.weekendsWorked, periods);
    }

    if (!end && start && duree) {
        end = addForgeWorkingDays(start, Math.max(duree - 1, 0), settings.weekendsWorked, periods);
    }

    if (start && end && end < start) {
        const temporaryStart = start;
        start = end;
        end = temporaryStart;
    }

    return {
        row,
        originalIndex,
        phaseId: row.phaseId || "__no_phase__",
        start,
        end
    };
}



if (typeof helpTexts !== "undefined") {
    helpTexts.wbs = `
        <p>Cette page sert à construire le WBS et le planning de base du projet.</p>
        <ul>
            <li>Le responsable d’une tâche se choisit depuis les parties prenantes.</li>
            <li>Les dates début/fin sont calculées automatiquement depuis la date de début du projet.</li>
            <li>Si “Week-ends travaillés” est sur Non, Forge saute les samedis et dimanches.</li>
            <li>Jour début, Durée et Jour fin sont comptés en jours travaillés.</li>
            <li>Le GANTT reprend automatiquement ces dates.</li>
        </ul>
    `;
}
/* V26 — Jours début/fin séquentiels */


function addWbsRowSequential() {
    const previousRow = wbsRows[wbsRows.length - 1];
    const nextStartDay = parsePositiveInteger(previousRow?.jourFin) ? parsePositiveInteger(previousRow.jourFin) + 1 : 1;

    wbsRows.push({
        id: createId(),
        phaseId: phases[0]?.id || "",
        task: "",
        responsable: "",
        responsableId: "",
        jourDebut: String(nextStartDay),
        duree: "1",
        jourFin: String(nextStartDay),
        dateDebut: "",
        dateFin: "",
        avancement: "0",
        commentaire: ""
    });

    recalculateWbsSchedule(true);
    renderWbsTable();

    const lastRow = wbsTableBody.querySelector("tr:last-child .wbs-task-cell");
    if (lastRow) {
        lastRow.focus();
    }
}



if (typeof helpTexts !== "undefined") {
    helpTexts.wbs = `
        <p>Cette page sert à construire le WBS et le planning de base du projet.</p>
        <ul>
            <li>Le responsable d’une tâche se choisit depuis les parties prenantes.</li>
            <li>Les jours début et fin se calculent automatiquement en chaîne.</li>
            <li>Chaque étape commence juste après la fin de l’étape précédente.</li>
            <li>Tu modifies surtout la durée, et Forge recalcule la suite.</li>
            <li>Si “Week-ends travaillés” est sur Non, Forge saute les samedis et dimanches.</li>
            <li>Le GANTT reprend automatiquement ces dates.</li>
        </ul>
    `;
}




/* V27 — Entrée sans saut de ligne + sous-onglets GANTT */

function initNoEnterInEditableFields() {
    if (document.body.dataset.noEnterInitialized === "true") return;

    document.body.dataset.noEnterInitialized = "true";

    document.addEventListener("keydown", (event) => {
        const editable = event.target.closest?.(".editable");

        if (!editable) return;

        if (event.key === "Enter") {
            event.preventDefault();
            editable.blur();
        }
    });
}


function renderGanttPhaseTabs(plannedTasks, ganttHead, ganttBody, ganttSummary) {
    const tabsContainer = document.getElementById("gantt-phase-tabs");

    if (!tabsContainer) return;

    const activeFilter = getActiveGanttPhaseFilter();
    const phaseIdsInTasks = new Set(plannedTasks.map((task) => task.phaseId || "__no_phase__"));
    const tabs = [
        {
            id: "__all__",
            label: "Toutes les phases",
            color: "#22d3ee"
        }
    ];

    phases.forEach((phase, index) => {
        if (!phaseIdsInTasks.has(phase.id)) return;

        tabs.push({
            id: phase.id,
            label: phase.name || "Phase sans nom",
            color: normalizeColor(phase.color, index)
        });
    });

    if (phaseIdsInTasks.has("__no_phase__")) {
        tabs.push({
            id: "__no_phase__",
            label: "Sans phase",
            color: "#94a3b8"
        });
    }

    tabsContainer.innerHTML = tabs.map((tab) => `
        <button
            class="gantt-phase-tab ${tab.id === activeFilter ? "active" : ""}"
            type="button"
            data-phase-filter="${escapeHtml(tab.id)}"
            style="--tab-color: ${escapeHtml(tab.color)}"
        >
            <span class="gantt-phase-tab-dot"></span>${escapeHtml(tab.label)}
        </button>
    `).join("");

    tabsContainer.querySelectorAll(".gantt-phase-tab").forEach((button) => {
        button.addEventListener("click", () => {
            saveActiveGanttPhaseFilter(button.dataset.phaseFilter || "__all__");
            renderGantt(ganttHead, ganttBody, ganttSummary);
        });
    });
}

function getActiveGanttPhaseFilter() {
    return localStorage.getItem(getProjectKey("gantt_phase_filter")) || "__all__";
}

function saveActiveGanttPhaseFilter(value) {
    localStorage.setItem(getProjectKey("gantt_phase_filter"), value || "__all__");
}

function getGanttPhaseNameFromId(phaseId) {
    if (phaseId === "__no_phase__") return "Sans phase";

    const phase = phases.find((item) => item.id === phaseId);

    return phase ? phase.name || "Phase sans nom" : "Phase";
}

if (typeof helpTexts !== "undefined") {
    helpTexts.gantt = `
        <p>Cette page génère automatiquement un GANTT depuis le WBS.</p>
        <ul>
            <li>Utilise les sous-onglets pour voir toutes les phases ou une phase précise.</li>
            <li>La frise garde l’échelle complète du projet pour mieux situer chaque phase.</li>
            <li>Les tâches viennent automatiquement du WBS.</li>
            <li>Les phases sont séparées clairement et les tâches reprennent leur couleur.</li>
            <li>L’avancement du WBS colore une partie de la barre.</li>
        </ul>
    `;
}




/* V30 — KPIs + sélecteur de thème */
const FORGE_THEME_STORAGE_KEY = "forge_theme_v1";

const defaultKpiTypes = [
    { id: "kpi-type-technique", color: "#00e5ff", name: "Technique" },
    { id: "kpi-type-financier", color: "#00e676", name: "Financier" },
    { id: "kpi-type-planning", color: "#ffc400", name: "Planning" },
    { id: "kpi-type-qualite", color: "#8b5cf6", name: "Qualité" },
    { id: "kpi-type-satisfaction", color: "#ff4081", name: "Satisfaction" }
];

let kpiTypes = [];
let kpiRows = [];
let selectedKpiTypes = new Set();
let selectedKpiRows = new Set();









function loadKpiTypes() {
    const savedData = localStorage.getItem(getProjectKey("kpi_types"));

    if (!savedData) {
        const defaults = structuredClone(defaultKpiTypes);
        localStorage.setItem(getProjectKey("kpi_types"), JSON.stringify(defaults));
        return defaults;
    }

    try {
        const parsed = JSON.parse(savedData);

        if (!Array.isArray(parsed)) {
            return structuredClone(defaultKpiTypes);
        }

        const normalized = parsed.map((type, index) => ({
            id: type.id || createId(),
            color: normalizeColor(type.color, index),
            name: type.name || ""
        }));

        localStorage.setItem(getProjectKey("kpi_types"), JSON.stringify(normalized));
        return normalized;
    } catch (error) {
        console.error("Impossible de charger les types de KPIs :", error);
        return structuredClone(defaultKpiTypes);
    }
}

function saveKpiTypes() {
    localStorage.setItem(getProjectKey("kpi_types"), JSON.stringify(kpiTypes));
}


function saveKpis() {
    localStorage.setItem(getProjectKey("kpis"), JSON.stringify(kpiRows));
}

function renderKpiTypesTable() {
    const body = document.getElementById("kpi-types-table-body");
    const deleteButton = document.getElementById("delete-selected-kpi-types-btn");
    const selectAll = document.getElementById("select-all-kpi-types");

    if (!body) return;

    body.innerHTML = "";

    if (kpiTypes.length === 0) {
        body.innerHTML = `<tr><td colspan="3" class="empty-state">Aucun type de KPI pour le moment.</td></tr>`;
        if (deleteButton) deleteButton.disabled = true;
        if (selectAll) selectAll.checked = false;
        return;
    }

    kpiTypes.forEach((type, index) => {
        const color = normalizeColor(type.color, index);
        const row = document.createElement("tr");
        const isSelected = selectedKpiTypes.has(index);

        row.style.backgroundColor = hexToRgba(color, 0.20);
        row.style.boxShadow = `inset 3px 0 0 ${color}`;

        if (isSelected) row.classList.add("selected-row");

        row.innerHTML = `
            <td class="select-col">
                <input
                    class="row-checkbox kpi-type-checkbox"
                    type="checkbox"
                    data-index="${index}"
                    aria-label="Sélectionner le type KPI ${index + 1}"
                    ${isSelected ? "checked" : ""}
                />
            </td>
            <td>
                <button
                    class="kpi-type-number-btn"
                    type="button"
                    data-index="${index}"
                    style="background-color: ${escapeHtml(color)}; --row-glow: ${hexToRgba(color, 0.55)}"
                    aria-label="Changer la couleur du type KPI ${index + 1}"
                >${index + 1}</button>
            </td>
            <td
                class="editable kpi-type-name-cell"
                contenteditable="true"
                data-index="${index}"
                data-field="name"
                spellcheck="true"
            >${escapeHtml(type.name)}</td>
        `;

        body.appendChild(row);
    });

    body.querySelectorAll(".kpi-type-checkbox").forEach((checkbox) => {
        checkbox.addEventListener("change", (event) => {
            const index = Number(event.target.dataset.index);

            if (event.target.checked) {
                selectedKpiTypes.add(index);
            } else {
                selectedKpiTypes.delete(index);
            }

            renderKpiTypesTable();
        });
    });

    body.querySelectorAll(".kpi-type-number-btn").forEach((button) => {
        button.addEventListener("click", (event) => {
            const index = Number(event.currentTarget.dataset.index);
            activeColorTarget = {
                type: "kpiType",
                index
            };

            showColorMenu(event.currentTarget);
        });
    });

    body.querySelectorAll(".editable").forEach((cell) => {
        cell.addEventListener("input", (event) => {
            const index = Number(event.target.dataset.index);
            const field = event.target.dataset.field;
            kpiTypes[index][field] = event.target.textContent.trim();
            saveKpiTypes();
            renderKpiTable();
        });
    });

    if (deleteButton) deleteButton.disabled = selectedKpiTypes.size === 0;
    if (selectAll) {
        selectAll.checked = kpiTypes.length > 0 && selectedKpiTypes.size === kpiTypes.length;
        selectAll.indeterminate = selectedKpiTypes.size > 0 && selectedKpiTypes.size < kpiTypes.length;
    }
}


function createKpiEditableCell(value, index, field, extraClass = "") {
    return `
        <td
            class="editable ${extraClass}"
            contenteditable="true"
            data-index="${index}"
            data-field="${field}"
            spellcheck="true"
        >${escapeHtml(value)}</td>
    `;
}


function createKpiTypeOptions(selectedTypeId) {
    return kpiTypes.map((type) => `
        <option value="${escapeHtml(type.id)}" ${type.id === selectedTypeId ? "selected" : ""}>
            ${escapeHtml(type.name || "Type sans nom")}
        </option>
    `).join("");
}

function createKpiStatusOptions(selectedStatus) {
    const options = [
        ["", "À définir"],
        ["OK", "OK"],
        ["À surveiller", "À surveiller"],
        ["Alerte", "Alerte"]
    ];

    return options.map(([value, label]) => `
        <option value="${escapeHtml(value)}" ${value === selectedStatus ? "selected" : ""}>
            ${escapeHtml(label)}
        </option>
    `).join("");
}

function createKpiFrequencyOptions(selectedFrequency) {
    const options = [
        ["", "À définir"],
        ["Hebdomadaire", "Hebdomadaire"],
        ["Mensuel", "Mensuel"],
        ["Trimestriel", "Trimestriel"],
        ["Semestriel", "Semestriel"],
        ["Annuel", "Annuel"],
        ["Ponctuel", "Ponctuel"]
    ];

    return options.map(([value, label]) => `
        <option value="${escapeHtml(value)}" ${value === selectedFrequency ? "selected" : ""}>
            ${escapeHtml(label)}
        </option>
    `).join("");
}

function createKpiResponsableOptions(row) {
    const selectedId = row.responsableId || "";
    const currentText = row.responsable || "";
    const options = ['<option value="">Aucun responsable</option>'];

    stakeholders.forEach((person) => {
        const stakeholderId = getStakeholderId(person);
        const label = getStakeholderLabel(person);
        options.push(`
            <option value="${escapeHtml(stakeholderId)}" ${stakeholderId === selectedId ? "selected" : ""}>
                ${escapeHtml(label)}
            </option>
        `);
    });

    if (currentText && selectedId && !stakeholders.some((person) => getStakeholderId(person) === selectedId)) {
        options.push(`
            <option value="${escapeHtml(selectedId)}" selected>
                ${escapeHtml(currentText)}
            </option>
        `);
    }

    return options.join("");
}

function syncKpiResponsablesWithStakeholders() {
    let changed = false;

    kpiRows = kpiRows.map((row) => {
        if (!row.responsableId) return row;

        const stakeholder = stakeholders.find((person) => getStakeholderId(person) === row.responsableId);

        if (!stakeholder) return row;

        const label = getStakeholderLabel(stakeholder);

        if (row.responsable !== label) {
            changed = true;
            return { ...row, responsable: label };
        }

        return row;
    });

    if (changed) {
        saveKpis();
    }
}

function calculateKpiGap(kpi) {
    const target = parseKpiNumber(kpi.target);
    const current = parseKpiNumber(kpi.current);

    if (target === null || current === null) {
        return "";
    }

    const gap = current - target;
    return Number.isInteger(gap) ? String(gap) : gap.toFixed(2).replace(".", ",");
}

function parseKpiNumber(value) {
    if (value === "" || value === null || value === undefined) return null;

    const normalized = String(value).replace(",", ".").trim();
    const number = Number(normalized);

    return Number.isFinite(number) ? number : null;
}

function getKpiStatusClass(status) {
    if (status === "OK") return "kpi-status-ok";
    if (status === "À surveiller") return "kpi-status-watch";
    if (status === "Alerte") return "kpi-status-alert";
    return "";
}







if (typeof helpTexts !== "undefined") {
    helpTexts.kpis = `
        <p>Cette page sert à piloter les indicateurs clés du projet.</p>
        <ul>
            <li>Le petit tableau à gauche permet de gérer les types de KPIs : technique, financier, qualité, planning, etc.</li>
            <li>Le grand tableau contient les KPIs à suivre.</li>
            <li>Tu peux choisir un responsable depuis les parties prenantes.</li>
            <li>L’écart se calcule automatiquement si la cible et la valeur actuelle sont numériques.</li>
            <li>Les KPIs sont inclus dans l’export/import portable et dans l’export Excel.</li>
        </ul>
    `;
}

/* V31 — Démarrage unique corrigé */



/* V32 — Analyse des risques + correctifs visuels */
const defaultRiskTypes = [
    { id: "risk-type-technique", color: "#00e5ff", name: "Technique" },
    { id: "risk-type-financier", color: "#00e676", name: "Financier" },
    { id: "risk-type-planning", color: "#ffc400", name: "Planning" },
    { id: "risk-type-humain", color: "#ff4081", name: "Humain" },
    { id: "risk-type-securite", color: "#8b5cf6", name: "Sécurité" }
];

let riskTypes = [];
let riskRows = [];
let selectedRiskTypes = new Set();
let selectedRiskRows = new Set();





function loadRiskTypes() {
    const savedData = localStorage.getItem(getProjectKey("risk_types"));

    if (!savedData) {
        const defaults = structuredClone(defaultRiskTypes);
        localStorage.setItem(getProjectKey("risk_types"), JSON.stringify(defaults));
        return defaults;
    }

    try {
        const parsed = JSON.parse(savedData);

        if (!Array.isArray(parsed)) {
            return structuredClone(defaultRiskTypes);
        }

        const normalized = parsed.map((type, index) => ({
            id: type.id || createId(),
            color: normalizeColor(type.color, index),
            name: type.name || ""
        }));

        localStorage.setItem(getProjectKey("risk_types"), JSON.stringify(normalized));
        return normalized;
    } catch (error) {
        console.error("Impossible de charger les types de risques :", error);
        return structuredClone(defaultRiskTypes);
    }
}

function saveRiskTypes() {
    localStorage.setItem(getProjectKey("risk_types"), JSON.stringify(riskTypes));
}


function saveRisks() {
    localStorage.setItem(getProjectKey("risks"), JSON.stringify(riskRows));
}

function renderRiskTypesTable() {
    const body = document.getElementById("risk-types-table-body");
    const deleteButton = document.getElementById("delete-selected-risk-types-btn");
    const selectAll = document.getElementById("select-all-risk-types");

    if (!body) return;

    body.innerHTML = "";

    if (riskTypes.length === 0) {
        body.innerHTML = `<tr><td colspan="3" class="empty-state">Aucun type de risque pour le moment.</td></tr>`;
        if (deleteButton) deleteButton.disabled = true;
        if (selectAll) selectAll.checked = false;
        return;
    }

    riskTypes.forEach((type, index) => {
        const color = normalizeColor(type.color, index);
        const row = document.createElement("tr");
        const isSelected = selectedRiskTypes.has(index);

        row.style.backgroundColor = hexToRgba(color, 0.20);
        row.style.boxShadow = `inset 3px 0 0 ${color}`;

        if (isSelected) row.classList.add("selected-row");

        row.innerHTML = `
            <td class="select-col">
                <input
                    class="row-checkbox risk-type-checkbox"
                    type="checkbox"
                    data-index="${index}"
                    aria-label="Sélectionner le type de risque ${index + 1}"
                    ${isSelected ? "checked" : ""}
                />
            </td>
            <td>
                <button
                    class="risk-type-number-btn"
                    type="button"
                    data-index="${index}"
                    style="background-color: ${escapeHtml(color)}; --row-glow: ${hexToRgba(color, 0.55)}"
                    aria-label="Changer la couleur du type de risque ${index + 1}"
                >${index + 1}</button>
            </td>
            <td
                class="editable risk-type-name-cell"
                contenteditable="true"
                data-index="${index}"
                data-field="name"
                spellcheck="true"
            >${escapeHtml(type.name)}</td>
        `;

        body.appendChild(row);
    });

    body.querySelectorAll(".risk-type-checkbox").forEach((checkbox) => {
        checkbox.addEventListener("change", (event) => {
            const index = Number(event.target.dataset.index);

            if (event.target.checked) {
                selectedRiskTypes.add(index);
            } else {
                selectedRiskTypes.delete(index);
            }

            renderRiskTypesTable();
        });
    });

    body.querySelectorAll(".risk-type-number-btn").forEach((button) => {
        button.addEventListener("click", (event) => {
            const index = Number(event.currentTarget.dataset.index);
            activeColorTarget = {
                type: "riskType",
                index
            };

            showColorMenu(event.currentTarget);
        });
    });

    body.querySelectorAll(".editable").forEach((cell) => {
        cell.addEventListener("input", (event) => {
            const index = Number(event.target.dataset.index);
            const field = event.target.dataset.field;
            riskTypes[index][field] = event.target.textContent.trim();
            saveRiskTypes();
            renderRisksTable();
        });
    });

    if (deleteButton) deleteButton.disabled = selectedRiskTypes.size === 0;
    if (selectAll) {
        selectAll.checked = riskTypes.length > 0 && selectedRiskTypes.size === riskTypes.length;
        selectAll.indeterminate = selectedRiskTypes.size > 0 && selectedRiskTypes.size < riskTypes.length;
    }
}


function createRiskEditableCell(value, index, field, extraClass = "") {
    return `
        <td
            class="editable ${extraClass}"
            contenteditable="true"
            data-index="${index}"
            data-field="${field}"
            spellcheck="true"
        >${escapeHtml(value)}</td>
    `;
}


function createRiskTypeOptions(selectedTypeId) {
    return riskTypes.map((type) => `
        <option value="${escapeHtml(type.id)}" ${type.id === selectedTypeId ? "selected" : ""}>
            ${escapeHtml(type.name || "Type sans nom")}
        </option>
    `).join("");
}

function createRiskScoreOptions(selectedScore) {
    const options = [
        ["1", "1"],
        ["2", "2"],
        ["3", "3"],
        ["4", "4"],
        ["5", "5"]
    ];

    return options.map(([value, label]) => `
        <option value="${escapeHtml(value)}" ${String(value) === String(selectedScore) ? "selected" : ""}>
            ${escapeHtml(label)}
        </option>
    `).join("");
}

function createRiskResponseOptions(selectedResponse) {
    const options = [
        ["", "À définir"],
        ["Éviter", "Éviter"],
        ["Réduire", "Réduire"],
        ["Transférer", "Transférer"],
        ["Accepter", "Accepter"]
    ];

    return options.map(([value, label]) => `
        <option value="${escapeHtml(value)}" ${value === selectedResponse ? "selected" : ""}>
            ${escapeHtml(label)}
        </option>
    `).join("");
}

function createRiskStatusOptions(selectedStatus) {
    const options = [
        ["", "À définir"],
        ["Ouvert", "Ouvert"],
        ["En cours", "En cours"],
        ["Maîtrisé", "Maîtrisé"],
        ["Clos", "Clos"]
    ];

    return options.map(([value, label]) => `
        <option value="${escapeHtml(value)}" ${value === selectedStatus ? "selected" : ""}>
            ${escapeHtml(label)}
        </option>
    `).join("");
}

function createRiskResponsableOptions(row) {
    const selectedId = row.responsableId || "";
    const currentText = row.responsable || "";
    const options = ['<option value="">Aucun</option>'];

    stakeholders.forEach((person) => {
        const stakeholderId = getStakeholderId(person);
        const label = getStakeholderLabel(person);
        options.push(`
            <option value="${escapeHtml(stakeholderId)}" ${stakeholderId === selectedId ? "selected" : ""}>
                ${escapeHtml(label)}
            </option>
        `);
    });

    if (currentText && selectedId && !stakeholders.some((person) => getStakeholderId(person) === selectedId)) {
        options.push(`
            <option value="${escapeHtml(selectedId)}" selected>
                ${escapeHtml(currentText)}
            </option>
        `);
    }

    return options.join("");
}

function syncRiskResponsablesWithStakeholders() {
    let changed = false;

    riskRows = riskRows.map((row) => {
        if (!row.responsableId) return row;

        const stakeholder = stakeholders.find((person) => getStakeholderId(person) === row.responsableId);

        if (!stakeholder) return row;

        const label = getStakeholderLabel(stakeholder);

        if (row.responsable !== label) {
            changed = true;
            return { ...row, responsable: label };
        }

        return row;
    });

    if (changed) {
        saveRisks();
    }
}

function calculateRiskCriticality(risk) {
    const probability = Number(risk.probability);
    const severity = Number(risk.severity);

    if (!Number.isFinite(probability) || !Number.isFinite(severity)) {
        return "";
    }

    return String(probability * severity);
}

function getRiskCriticalityClass(criticality) {
    const value = Number(criticality);

    if (!Number.isFinite(value)) return "";
    if (value <= 4) return "risk-criticality-low";
    if (value <= 9) return "risk-criticality-medium";
    if (value <= 15) return "risk-criticality-high";
    return "risk-criticality-critical";
}

/* KPIs : éviter le re-render pendant la saisie */







if (typeof helpTexts !== "undefined") {
    helpTexts.risks = `
        <p>Cette page sert à suivre les risques du projet.</p>
        <ul>
            <li>Le petit tableau à gauche permet de créer des types de risques : technique, financier, planning, humain, sécurité...</li>
            <li>Chaque risque possède une probabilité et une gravité de 1 à 5.</li>
            <li>La criticité est calculée automatiquement : probabilité × gravité.</li>
            <li>Tu peux choisir une stratégie de réponse : éviter, réduire, transférer ou accepter.</li>
            <li>Les risques sont inclus dans l’export/import portable et dans l’export Excel.</li>
        </ul>
    `;

    helpTexts.raci = `
        <p>Cette page génère automatiquement une matrice RACI depuis le WBS et les parties prenantes.</p>
        <ul>
            <li><strong>R</strong> : Réalise</li>
            <li><strong>A</strong> : Approuve / Responsable final</li>
            <li><strong>C</strong> : Consulté</li>
            <li><strong>I</strong> : Informé</li>
        </ul>
    `;
}

/* V32 — Démarrage unique */



/* V33 — Analyse des risques étoffée */
function initRisksPage() {
    riskTypes = loadRiskTypes();
    riskRows = loadRisks();
    stakeholders = loadStakeholders();

    renderColorMenu();
    renderRiskTypesTable();
    renderRiskMatrix();
    renderRisksTable();

    const addTypeButton = document.getElementById("add-risk-type-btn");
    const deleteTypesButton = document.getElementById("delete-selected-risk-types-btn");
    const resetTypesButton = document.getElementById("reset-risk-types-btn");
    const selectAllTypes = document.getElementById("select-all-risk-types");

    const addRiskButton = document.getElementById("add-risk-btn");
    const deleteRisksButton = document.getElementById("delete-selected-risks-btn");
    const resetRisksButton = document.getElementById("reset-risks-btn");
    const selectAllRisks = document.getElementById("select-all-risks");

    addTypeButton?.addEventListener("click", () => {
        riskTypes.push({
            id: createId(),
            color: predefinedColors[riskTypes.length % predefinedColors.length],
            name: ""
        });

        saveRiskTypes();
        renderRiskTypesTable();
        renderRisksTable();

        const lastType = document.querySelector("#risk-types-table-body tr:last-child .editable");
        if (lastType) lastType.focus();
    });

    deleteTypesButton?.addEventListener("click", () => {
        if (selectedRiskTypes.size === 0) return;

        const confirmation = confirm("Tu veux vraiment supprimer les types de risques cochés ? Les risques liés passeront sans type.");
        if (!confirmation) return;

        const deletedIds = riskTypes
            .filter((_, index) => selectedRiskTypes.has(index))
            .map((type) => type.id);

        riskTypes = riskTypes.filter((_, index) => !selectedRiskTypes.has(index));
        riskRows = riskRows.map((row) => deletedIds.includes(row.typeId) ? { ...row, typeId: "" } : row);

        selectedRiskTypes.clear();
        saveRiskTypes();
        saveRisks();
        hideColorMenu();
        renderRiskTypesTable();
        renderRisksTable();
    });

    resetTypesButton?.addEventListener("click", () => {
        const confirmation = confirm("Tu veux vraiment réinitialiser les types de risques ?");
        if (!confirmation) return;

        riskTypes = structuredClone(defaultRiskTypes);
        selectedRiskTypes.clear();

        saveRiskTypes();
        hideColorMenu();
        renderRiskTypesTable();
        renderRisksTable();
    });

    selectAllTypes?.addEventListener("change", (event) => {
        selectedRiskTypes.clear();

        if (event.target.checked) {
            riskTypes.forEach((_, index) => selectedRiskTypes.add(index));
        }

        renderRiskTypesTable();
    });

    addRiskButton?.addEventListener("click", () => {
        riskRows.push(createEmptyRiskRow());
        saveRisks();
        renderRisksTable();

        const lastRisk = document.querySelector("#risks-table-body tr:last-child .risk-name-cell");
        if (lastRisk) lastRisk.focus();
    });

    deleteRisksButton?.addEventListener("click", () => {
        if (selectedRiskRows.size === 0) return;

        const confirmation = confirm("Tu veux vraiment supprimer les risques cochés ?");
        if (!confirmation) return;

        riskRows = riskRows.filter((_, index) => !selectedRiskRows.has(index));
        selectedRiskRows.clear();
        saveRisks();
        renderRisksTable();
    });

    resetRisksButton?.addEventListener("click", () => {
        const confirmation = confirm("Tu veux vraiment réinitialiser l’analyse des risques ?");
        if (!confirmation) return;

        riskRows = [];
        selectedRiskRows.clear();
        saveRisks();
        renderRisksTable();
    });

    selectAllRisks?.addEventListener("change", (event) => {
        selectedRiskRows.clear();

        if (event.target.checked) {
            riskRows.forEach((_, index) => selectedRiskRows.add(index));
        }

        renderRisksTable();
    });

    document.addEventListener("click", closeColorMenuOnOutsideClick);
}


function getRiskMatrixLevel(score) {
    const value = Number(score);

    if (value <= 4) return "low";
    if (value <= 9) return "medium";
    if (value <= 15) return "high";
    return "critical";
}

function createEmptyRiskRow() {
    return {
        id: createId(),
        typeId: riskTypes[0]?.id || "",
        risk: "",
        source: "",
        probability: "1",
        severity: "1",
        response: "",
        responsable: "",
        responsableId: "",
        mitigation: ""
    };
}

function loadRisks() {
    const savedData = localStorage.getItem(getProjectKey("risks"));

    if (!savedData) {
        localStorage.setItem(getProjectKey("risks"), JSON.stringify([]));
        return [];
    }

    try {
        const parsed = JSON.parse(savedData);

        if (!Array.isArray(parsed)) {
            return [];
        }

        const normalized = parsed.map((row) => ({
            id: row.id || createId(),
            typeId: row.typeId || "",
            risk: row.risk || "",
            source: row.source || row.cause || "",
            probability: row.probability || "1",
            severity: row.severity || "1",
            response: row.response || "",
            responsable: row.responsable || "",
            responsableId: row.responsableId || "",
            mitigation: row.mitigation || row.comment || ""
        }));

        localStorage.setItem(getProjectKey("risks"), JSON.stringify(normalized));
        return normalized;
    } catch (error) {
        console.error("Impossible de charger les risques :", error);
        return [];
    }
}

function renderRisksTable() {
    const body = document.getElementById("risks-table-body");
    const deleteButton = document.getElementById("delete-selected-risks-btn");
    const selectAll = document.getElementById("select-all-risks");

    if (!body) return;

    syncRiskResponsablesWithStakeholders();
    body.innerHTML = "";

    if (riskRows.length === 0) {
        body.innerHTML = `<tr><td colspan="11" class="empty-state">Aucun risque pour le moment. Clique sur “Ajouter un risque” pour commencer.</td></tr>`;
        if (deleteButton) deleteButton.disabled = true;
        if (selectAll) selectAll.checked = false;
        return;
    }

    riskRows.forEach((risk, index) => {
        const type = riskTypes.find((item) => item.id === risk.typeId);
        const color = type ? normalizeColor(type.color, index) : "#94a3b8";
        const row = document.createElement("tr");
        const isSelected = selectedRiskRows.has(index);
        const criticality = calculateRiskCriticality(risk);
        const criticalityClass = getRiskCriticalityClass(criticality);

        row.style.backgroundColor = hexToRgba(color, 0.18);
        row.style.boxShadow = `inset 3px 0 0 ${color}`;

        if (isSelected) row.classList.add("selected-row");

        row.innerHTML = `
            <td class="select-col">
                <input
                    class="row-checkbox risk-checkbox"
                    type="checkbox"
                    data-index="${index}"
                    aria-label="Sélectionner le risque ${index + 1}"
                    ${isSelected ? "checked" : ""}
                />
            </td>
            <td>${index + 1}</td>
            <td>
                <select class="risk-type-select" data-index="${index}" data-field="typeId">
                    <option value="">Sans type</option>
                    ${createRiskTypeOptions(risk.typeId)}
                </select>
            </td>
            ${createRiskEditableCell(risk.risk, index, "risk", "risk-name-cell")}
            ${createRiskEditableCell(risk.source, index, "source", "risk-source-cell")}
            <td>
                <select class="risk-probability-select" data-index="${index}" data-field="probability">
                    ${createRiskScoreOptions(risk.probability)}
                </select>
            </td>
            <td>
                <select class="risk-severity-select" data-index="${index}" data-field="severity">
                    ${createRiskScoreOptions(risk.severity)}
                </select>
            </td>
            <td class="risk-criticality-cell ${criticalityClass}">${escapeHtml(criticality || "")}</td>
            <td>
                <select class="risk-response-select" data-index="${index}" data-field="response">
                    ${createRiskResponseOptions(risk.response)}
                </select>
            </td>
            <td>
                <select class="risk-responsable-select" data-index="${index}" data-field="responsableId">
                    ${createRiskResponsableOptions(risk)}
                </select>
            </td>
            ${createRiskEditableCell(risk.mitigation, index, "mitigation", "risk-mitigation-cell")}
        `;

        body.appendChild(row);
    });

    bindRisksTableEvents();

    if (deleteButton) deleteButton.disabled = selectedRiskRows.size === 0;
    if (selectAll) {
        selectAll.checked = riskRows.length > 0 && selectedRiskRows.size === riskRows.length;
        selectAll.indeterminate = selectedRiskRows.size > 0 && selectedRiskRows.size < riskRows.length;
    }
}

function bindRisksTableEvents() {
    const body = document.getElementById("risks-table-body");

    if (!body) return;

    body.querySelectorAll(".editable").forEach((cell) => {
        cell.addEventListener("input", (event) => {
            const index = Number(event.target.dataset.index);
            const field = event.target.dataset.field;
            riskRows[index][field] = event.target.textContent.trim();
            saveRisks();
        });
    });

    body.querySelectorAll(".risk-type-select, .risk-probability-select, .risk-severity-select, .risk-response-select").forEach((select) => {
        select.addEventListener("change", (event) => {
            const index = Number(event.target.dataset.index);
            const field = event.target.dataset.field;
            riskRows[index][field] = event.target.value;
            saveRisks();
            renderRisksTable();
        });
    });

    body.querySelectorAll(".risk-responsable-select").forEach((select) => {
        select.addEventListener("change", (event) => {
            const index = Number(event.target.dataset.index);
            const stakeholderId = event.target.value;
            const stakeholder = stakeholders.find((person) => getStakeholderId(person) === stakeholderId);

            riskRows[index].responsableId = stakeholderId;
            riskRows[index].responsable = stakeholder ? getStakeholderLabel(stakeholder) : "";
            saveRisks();
        });
    });

    body.querySelectorAll(".risk-checkbox").forEach((checkbox) => {
        checkbox.addEventListener("change", (event) => {
            const index = Number(event.target.dataset.index);

            if (event.target.checked) {
                selectedRiskRows.add(index);
            } else {
                selectedRiskRows.delete(index);
            }

            renderRisksTable();
        });
    });
}


if (typeof helpTexts !== "undefined") {
    helpTexts.risks = `
        <p>Cette page sert à suivre les risques du projet.</p>
        <ul>
            <li>Le petit tableau à gauche permet de créer des types de risques.</li>
            <li>La matrice du risque indique la criticité selon la probabilité et la gravité.</li>
            <li>Chaque risque possède une source, une probabilité, une gravité et une mitigation.</li>
            <li>La criticité est calculée automatiquement : probabilité × gravité.</li>
            <li>Les risques sont inclus dans l’export/import portable et dans l’export Excel.</li>
        </ul>
    `;
}

/* V33 — Démarrage unique */



/* V34 — Matrice du risque plus lisible */

function getRiskLevelLabel(level) {
    if (level === "low") return "Faible";
    if (level === "medium") return "Moyen";
    if (level === "high") return "Élevé";
    if (level === "critical") return "Critique";
    return "";
}

/* V34 — Démarrage unique */



/* V35 — Matrice avec axes probabilité / gravité */
function renderRiskMatrix() {
    const grid = document.getElementById("risk-matrix-grid");
    const probabilityDots = document.getElementById("risk-probability-dots");
    const severityDots = document.getElementById("risk-severity-dots");

    if (!grid) return;

    if (probabilityDots) {
        probabilityDots.innerHTML = Array.from({ length: 5 }, (_, index) => {
            const value = index + 1;
            return `<div class="risk-axis-dot horizontal"><span>${value}</span></div>`;
        }).join("");
    }

    if (severityDots) {
        severityDots.innerHTML = Array.from({ length: 5 }, (_, index) => {
            const value = 5 - index;
            return `<div class="risk-axis-dot vertical"><span>${value}</span></div>`;
        }).join("");
    }

    const cells = [];

    for (let severity = 5; severity >= 1; severity -= 1) {
        for (let probability = 1; probability <= 5; probability += 1) {
            const score = probability * severity;
            const level = getRiskMatrixLevel(score);
            const label = getRiskLevelLabel(level);

            cells.push(`
                <div class="risk-matrix-cell ${level}" title="Probabilité ${probability} × Gravité ${severity} = ${score} · ${label}">
                    <strong>${score}</strong>
                </div>
            `);
        }
    }

    grid.innerHTML = cells.join("");

    const panel = grid.closest(".risk-matrix-panel");

    if (panel) {
        let help = panel.querySelector(".risk-matrix-help");
        if (!help) {
            help = document.createElement("p");
            help.className = "risk-matrix-help";
            panel.appendChild(help);
        }
        help.textContent = "Lecture : axe horizontal = probabilité, axe vertical = gravité. Le nombre dans chaque case correspond au score final.";
    }
}

/* V35 — Démarrage unique */


/* V41 — Objectifs SMART + lien KPIs */
let smartRows = [];
let selectedSmartRows = new Set();






function saveSmartObjectives() {
    localStorage.setItem(getProjectKey("smart"), JSON.stringify(smartRows));
}


function createSmartEditableCell(value, index, field, extraClass = "") {
    return `
        <td class="editable ${extraClass}" contenteditable="true" data-index="${index}" data-field="${field}" spellcheck="true">${escapeHtml(value)}</td>
    `;
}


function createSmartResponsableOptions(row) {
    const selectedId = row.responsableId || "";
    const currentText = row.responsable || "";
    const options = ['<option value="">Aucun</option>'];

    stakeholders.forEach((person) => {
        const stakeholderId = getStakeholderId(person);
        const label = getStakeholderLabel(person);
        options.push(`
            <option value="${escapeHtml(stakeholderId)}" ${stakeholderId === selectedId ? "selected" : ""}>
                ${escapeHtml(label)}
            </option>
        `);
    });

    if (currentText && selectedId && !stakeholders.some((person) => getStakeholderId(person) === selectedId)) {
        options.push(`<option value="${escapeHtml(selectedId)}" selected>${escapeHtml(currentText)}</option>`);
    }

    return options.join("");
}

function createSmartStatusOptions(selectedStatus) {
    const options = [
        ["", "Brouillon"],
        ["Actif", "Actif"],
        ["À surveiller", "À surveiller"],
        ["Atteint", "Atteint"]
    ];

    return options.map(([value, label]) => `
        <option value="${escapeHtml(value)}" ${value === selectedStatus ? "selected" : ""}>${escapeHtml(label)}</option>
    `).join("");
}

function getSmartStatusClass(status) {
    if (status === "Actif") return "smart-status-active";
    if (status === "À surveiller") return "smart-status-watch";
    if (status === "Atteint") return "smart-status-done";
    return "smart-status-draft";
}

function syncSmartResponsablesWithStakeholders() {
    let changed = false;

    smartRows = smartRows.map((row) => {
        if (!row.responsableId) return row;

        const stakeholder = stakeholders.find((person) => getStakeholderId(person) === row.responsableId);
        if (!stakeholder) return row;

        const label = getStakeholderLabel(stakeholder);

        if (row.responsable !== label) {
            changed = true;
            return { ...row, responsable: label };
        }

        return row;
    });

    if (changed) saveSmartObjectives();
}



/* V41 — KPIs liés aux SMART */
function createEmptyKpiRow() {
    return {
        id: createId(),
        smartId: "",
        typeId: kpiTypes[0]?.id || "",
        name: "",
        objective: "",
        unit: "",
        target: "",
        current: "",
        status: "",
        frequency: "",
        responsable: "",
        responsableId: "",
        comment: ""
    };
}

function loadKpis() {
    const savedData = localStorage.getItem(getProjectKey("kpis"));

    if (!savedData) {
        localStorage.setItem(getProjectKey("kpis"), JSON.stringify([]));
        return [];
    }

    try {
        const parsed = JSON.parse(savedData);

        if (!Array.isArray(parsed)) return [];

        const normalized = parsed.map((row) => ({
            id: row.id || createId(),
            smartId: row.smartId || "",
            typeId: row.typeId || "",
            name: row.name || "",
            objective: row.objective || "",
            unit: row.unit || "",
            target: row.target || "",
            current: row.current || "",
            status: row.status || "",
            frequency: row.frequency || "",
            responsable: row.responsable || "",
            responsableId: row.responsableId || "",
            comment: row.comment || ""
        }));

        localStorage.setItem(getProjectKey("kpis"), JSON.stringify(normalized));
        return normalized;
    } catch (error) {
        console.error("Impossible de charger les KPIs :", error);
        return [];
    }
}

function initKpisPage() {
    kpiTypes = loadKpiTypes();
    kpiRows = loadKpis();
    smartRows = loadSmartObjectives();
    stakeholders = loadStakeholders();

    renderColorMenu();
    renderKpiTypesTable();
    renderKpiTable();

    const addTypeButton = document.getElementById("add-kpi-type-btn");
    const deleteTypesButton = document.getElementById("delete-selected-kpi-types-btn");
    const resetTypesButton = document.getElementById("reset-kpi-types-btn");
    const selectAllTypes = document.getElementById("select-all-kpi-types");

    const addKpiButton = document.getElementById("add-kpi-btn");
    const deleteKpisButton = document.getElementById("delete-selected-kpis-btn");
    const resetKpisButton = document.getElementById("reset-kpis-btn");
    const selectAllKpis = document.getElementById("select-all-kpis");

    addTypeButton?.addEventListener("click", () => {
        kpiTypes.push({
            id: createId(),
            color: predefinedColors[kpiTypes.length % predefinedColors.length],
            name: ""
        });

        saveKpiTypes();
        renderKpiTypesTable();
        renderKpiTable();

        const lastType = document.querySelector("#kpi-types-table-body tr:last-child .editable");
        if (lastType) lastType.focus();
    });

    deleteTypesButton?.addEventListener("click", () => {
        if (selectedKpiTypes.size === 0) return;

        const confirmation = confirm("Tu veux vraiment supprimer les types de KPIs cochés ? Les KPIs liés passeront sans type.");
        if (!confirmation) return;

        const deletedIds = kpiTypes
            .filter((_, index) => selectedKpiTypes.has(index))
            .map((type) => type.id);

        kpiTypes = kpiTypes.filter((_, index) => !selectedKpiTypes.has(index));
        kpiRows = kpiRows.map((row) => deletedIds.includes(row.typeId) ? { ...row, typeId: "" } : row);

        selectedKpiTypes.clear();
        saveKpiTypes();
        saveKpis();
        hideColorMenu();
        renderKpiTypesTable();
        renderKpiTable();
    });

    resetTypesButton?.addEventListener("click", () => {
        const confirmation = confirm("Tu veux vraiment réinitialiser les types de KPIs ?");
        if (!confirmation) return;

        kpiTypes = structuredClone(defaultKpiTypes);
        selectedKpiTypes.clear();

        saveKpiTypes();
        hideColorMenu();
        renderKpiTypesTable();
        renderKpiTable();
    });

    selectAllTypes?.addEventListener("change", (event) => {
        selectedKpiTypes.clear();

        if (event.target.checked) kpiTypes.forEach((_, index) => selectedKpiTypes.add(index));

        renderKpiTypesTable();
    });

    addKpiButton?.addEventListener("click", () => {
        kpiRows.push(createEmptyKpiRow());
        saveKpis();
        renderKpiTable();

        const lastKpi = document.querySelector("#kpi-table-body tr:last-child .kpi-name-cell");
        if (lastKpi) lastKpi.focus();
    });

    deleteKpisButton?.addEventListener("click", () => {
        if (selectedKpiRows.size === 0) return;

        const confirmation = confirm("Tu veux vraiment supprimer les KPIs cochés ?");
        if (!confirmation) return;

        kpiRows = kpiRows.filter((_, index) => !selectedKpiRows.has(index));
        selectedKpiRows.clear();
        saveKpis();
        renderKpiTable();
    });

    resetKpisButton?.addEventListener("click", () => {
        const confirmation = confirm("Tu veux vraiment réinitialiser le tableau KPIs ?");
        if (!confirmation) return;

        kpiRows = [];
        selectedKpiRows.clear();
        saveKpis();
        renderKpiTable();
    });

    selectAllKpis?.addEventListener("change", (event) => {
        selectedKpiRows.clear();

        if (event.target.checked) kpiRows.forEach((_, index) => selectedKpiRows.add(index));

        renderKpiTable();
    });

    document.addEventListener("click", closeColorMenuOnOutsideClick);
}

function renderKpiTable() {
    const body = document.getElementById("kpi-table-body");
    const deleteButton = document.getElementById("delete-selected-kpis-btn");
    const selectAll = document.getElementById("select-all-kpis");

    if (!body) return;

    syncKpiResponsablesWithStakeholders();
    body.innerHTML = "";

    if (kpiRows.length === 0) {
        body.innerHTML = `<tr><td colspan="13" class="empty-state">Aucun KPI pour le moment. Clique sur “Ajouter un KPI” pour commencer.</td></tr>`;
        if (deleteButton) deleteButton.disabled = true;
        if (selectAll) selectAll.checked = false;
        return;
    }

    kpiRows.forEach((kpi, index) => {
        const type = kpiTypes.find((item) => item.id === kpi.typeId);
        const color = type ? normalizeColor(type.color, index) : "#94a3b8";
        const row = document.createElement("tr");
        const isSelected = selectedKpiRows.has(index);
        const gap = calculateKpiGap(kpi);
        const statusClass = getKpiStatusClass(kpi.status);

        row.style.backgroundColor = hexToRgba(color, 0.18);
        row.style.boxShadow = `inset 3px 0 0 ${color}`;

        if (isSelected) row.classList.add("selected-row");

        row.innerHTML = `
            <td class="select-col">
                <input class="row-checkbox kpi-checkbox" type="checkbox" data-index="${index}" aria-label="Sélectionner le KPI ${index + 1}" ${isSelected ? "checked" : ""} />
            </td>
            <td>${index + 1}</td>
            <td>
                <select class="kpi-smart-select" data-index="${index}" data-field="smartId">
                    <option value="">Sans objectif</option>
                    ${createKpiSmartOptions(kpi.smartId)}
                </select>
            </td>
            <td>
                <select class="kpi-type-select" data-index="${index}" data-field="typeId">
                    <option value="">Sans type</option>
                    ${createKpiTypeOptions(kpi.typeId)}
                </select>
            </td>
            ${createKpiEditableCell(kpi.name, index, "name", "kpi-name-cell")}
            ${createKpiEditableCell(kpi.objective, index, "objective", "kpi-objective-cell")}
            ${createKpiEditableCell(kpi.unit, index, "unit", "kpi-unit-cell")}
            ${createKpiEditableCell(kpi.target, index, "target", "kpi-number-cell")}
            ${createKpiEditableCell(kpi.current, index, "current", "kpi-number-cell")}
            <td class="kpi-gap-cell">${escapeHtml(gap)}</td>
            <td>
                <select class="kpi-status-select ${statusClass}" data-index="${index}" data-field="status">
                    ${createKpiStatusOptions(kpi.status)}
                </select>
            </td>
            <td>
                <select class="kpi-frequency-select" data-index="${index}" data-field="frequency">
                    ${createKpiFrequencyOptions(kpi.frequency)}
                </select>
            </td>
            <td>
                <select class="kpi-responsable-select" data-index="${index}" data-field="responsableId">
                    ${createKpiResponsableOptions(kpi)}
                </select>
            </td>
        `;

        body.appendChild(row);
    });

    bindKpiTableEvents();

    if (deleteButton) deleteButton.disabled = selectedKpiRows.size === 0;
    if (selectAll) {
        selectAll.checked = kpiRows.length > 0 && selectedKpiRows.size === kpiRows.length;
        selectAll.indeterminate = selectedKpiRows.size > 0 && selectedKpiRows.size < kpiRows.length;
    }
}

function createKpiSmartOptions(selectedSmartId) {
    return smartRows.map((objective) => `
        <option value="${escapeHtml(objective.id)}" ${objective.id === selectedSmartId ? "selected" : ""}>
            ${escapeHtml(getSmartObjectiveLabel(objective))}
        </option>
    `).join("");
}

function bindKpiTableEvents() {
    const body = document.getElementById("kpi-table-body");
    if (!body) return;

    body.querySelectorAll(".editable").forEach((cell) => {
        cell.addEventListener("input", (event) => {
            const index = Number(event.target.dataset.index);
            const field = event.target.dataset.field;
            kpiRows[index][field] = event.target.textContent.trim();
            saveKpis();
        });

        cell.addEventListener("blur", (event) => {
            const field = event.target.dataset.field;
            if (field === "target" || field === "current") renderKpiTable();
        });
    });

    body.querySelectorAll(".kpi-smart-select, .kpi-type-select, .kpi-status-select, .kpi-frequency-select").forEach((select) => {
        select.addEventListener("change", (event) => {
            const index = Number(event.target.dataset.index);
            const field = event.target.dataset.field;
            kpiRows[index][field] = event.target.value;
            saveKpis();
            renderKpiTable();
        });
    });

    body.querySelectorAll(".kpi-responsable-select").forEach((select) => {
        select.addEventListener("change", (event) => {
            const index = Number(event.target.dataset.index);
            const stakeholderId = event.target.value;
            const stakeholder = stakeholders.find((person) => getStakeholderId(person) === stakeholderId);

            kpiRows[index].responsableId = stakeholderId;
            kpiRows[index].responsable = stakeholder ? getStakeholderLabel(stakeholder) : "";
            saveKpis();
        });
    });

    body.querySelectorAll(".kpi-checkbox").forEach((checkbox) => {
        checkbox.addEventListener("change", (event) => {
            const index = Number(event.target.dataset.index);

            if (event.target.checked) {
                selectedKpiRows.add(index);
            } else {
                selectedKpiRows.delete(index);
            }

            renderKpiTable();
        });
    });
}


/* V41 — Export / import avec SMART */


/* V41 — Export Excel avec SMART */



if (typeof helpTexts !== "undefined") {
    helpTexts.smart = `
        <p>Cette page sert à définir les objectifs SMART du projet.</p>
        <ul>
            <li><strong>S</strong> : spécifique, clair et précis.</li>
            <li><strong>M</strong> : mesurable avec des indicateurs.</li>
            <li><strong>A</strong> : atteignable avec les moyens disponibles.</li>
            <li><strong>R</strong> : réaliste et pertinent pour le projet.</li>
            <li><strong>T</strong> : temporel, avec une échéance.</li>
            <li>Les KPIs peuvent ensuite être rattachés à ces objectifs.</li>
        </ul>
    `;

    helpTexts.kpis = `
        <p>Cette page sert à piloter les indicateurs clés du projet.</p>
        <ul>
            <li>Chaque KPI peut être rattaché à un objectif SMART.</li>
            <li>Le petit tableau à gauche permet de gérer les types de KPIs : technique, financier, qualité, planning, etc.</li>
            <li>Tu peux choisir un responsable depuis les parties prenantes.</li>
            <li>L’écart se calcule automatiquement si la cible et la valeur actuelle sont numériques.</li>
            <li>Les KPIs sont inclus dans l’export/import portable et dans l’export Excel.</li>
        </ul>
    `;
}

/* V41 — Démarrage unique */


/* V42 — Matrice de compétences */
const defaultCompetenceCategories = [];

const competenceLevelLabels = {
    "": "—",
    "0": "0 · Non maîtrisé",
    "1": "1 · Notions",
    "2": "2 · Débutant",
    "3": "3 · Autonome",
    "4": "4 · Avancé",
    "5": "5 · Référent"
};

let competenceCategories = [];
let competenceMatrices = {};
let selectedCompetenceCategories = new Set();
let selectedCompetenceSkills = {};



function initCompetencesPage() {
    stakeholders = loadStakeholders();
    competenceCategories = loadCompetenceCategories();
    competenceMatrices = loadCompetenceMatrices();

    renderColorMenu();
    renderCompetenceCategoriesTable();
    renderCompetenceMatrices();

    const addCategoryButton = document.getElementById("add-competence-category-btn");
    const deleteCategoriesButton = document.getElementById("delete-selected-competence-categories-btn");
    const resetCategoriesButton = document.getElementById("reset-competence-categories-btn");
    const selectAllCategories = document.getElementById("select-all-competence-categories");

    addCategoryButton?.addEventListener("click", () => {
        const category = {
            id: createId(),
            color: predefinedColors[competenceCategories.length % predefinedColors.length],
            name: ""
        };

        competenceCategories.push(category);
        competenceMatrices[category.id] = [];

        saveCompetenceCategories();
        saveCompetenceMatrices();
        renderCompetenceCategoriesTable();
        renderCompetenceMatrices();

        const lastCategory = document.querySelector("#competence-categories-table-body tr:last-child .editable");
        if (lastCategory) lastCategory.focus();
    });

    deleteCategoriesButton?.addEventListener("click", () => {
        if (selectedCompetenceCategories.size === 0) return;

        const confirmation = confirm("Tu veux vraiment supprimer les catégories cochées ? Les matrices liées seront supprimées aussi.");
        if (!confirmation) return;

        const deletedIds = competenceCategories
            .filter((_, index) => selectedCompetenceCategories.has(index))
            .map((category) => category.id);

        competenceCategories = competenceCategories.filter((_, index) => !selectedCompetenceCategories.has(index));

        deletedIds.forEach((id) => {
            delete competenceMatrices[id];
            delete selectedCompetenceSkills[id];
        });

        selectedCompetenceCategories.clear();
        saveCompetenceCategories();
        saveCompetenceMatrices();
        hideColorMenu();
        renderCompetenceCategoriesTable();
        renderCompetenceMatrices();
    });

    resetCategoriesButton?.addEventListener("click", () => {
        const confirmation = confirm("Tu veux vraiment réinitialiser les catégories et matrices de compétences ?");
        if (!confirmation) return;

        competenceCategories = structuredClone(defaultCompetenceCategories);
        competenceMatrices = {};
        selectedCompetenceCategories.clear();
        selectedCompetenceSkills = {};

        competenceCategories.forEach((category) => {
            competenceMatrices[category.id] = [];
        });

        saveCompetenceCategories();
        saveCompetenceMatrices();
        hideColorMenu();
        renderCompetenceCategoriesTable();
        renderCompetenceMatrices();
    });

    selectAllCategories?.addEventListener("change", (event) => {
        selectedCompetenceCategories.clear();

        if (event.target.checked) {
            competenceCategories.forEach((_, index) => selectedCompetenceCategories.add(index));
        }

        renderCompetenceCategoriesTable();
    });

    document.addEventListener("click", closeColorMenuOnOutsideClick);
}

function loadCompetenceCategories() {
    const savedData = localStorage.getItem(getProjectKey("competence_categories"));

    if (!savedData) {
        const defaults = structuredClone(defaultCompetenceCategories);
        localStorage.setItem(getProjectKey("competence_categories"), JSON.stringify(defaults));
        return defaults;
    }

    try {
        const parsed = JSON.parse(savedData);

        if (!Array.isArray(parsed)) return structuredClone(defaultCompetenceCategories);

        const normalized = parsed.map((category, index) => ({
            id: category.id || createId(),
            color: normalizeColor(category.color, index),
            name: category.name || ""
        }));

        localStorage.setItem(getProjectKey("competence_categories"), JSON.stringify(normalized));
        return normalized;
    } catch (error) {
        console.error("Impossible de charger les catégories de compétences :", error);
        return structuredClone(defaultCompetenceCategories);
    }
}

function saveCompetenceCategories() {
    localStorage.setItem(getProjectKey("competence_categories"), JSON.stringify(competenceCategories));
}

function loadCompetenceMatrices() {
    const savedData = localStorage.getItem(getProjectKey("competence_matrices"));

    if (!savedData) {
        localStorage.setItem(getProjectKey("competence_matrices"), JSON.stringify({}));
        return {};
    }

    try {
        const parsed = JSON.parse(savedData);

        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

        const normalized = {};

        Object.entries(parsed).forEach(([categoryId, skills]) => {
            normalized[categoryId] = Array.isArray(skills)
                ? skills.map((skill) => ({
                    id: skill.id || createId(),
                    name: skill.name || "",
                    levels: skill.levels && typeof skill.levels === "object" ? skill.levels : {}
                }))
                : [];
        });

        competenceCategories.forEach((category) => {
            if (!Array.isArray(normalized[category.id])) normalized[category.id] = [];
        });

        localStorage.setItem(getProjectKey("competence_matrices"), JSON.stringify(normalized));
        return normalized;
    } catch (error) {
        console.error("Impossible de charger les matrices de compétences :", error);
        return {};
    }
}

function saveCompetenceMatrices() {
    localStorage.setItem(getProjectKey("competence_matrices"), JSON.stringify(competenceMatrices));
}

function renderCompetenceCategoriesTable() {
    const body = document.getElementById("competence-categories-table-body");
    const deleteButton = document.getElementById("delete-selected-competence-categories-btn");
    const selectAll = document.getElementById("select-all-competence-categories");

    if (!body) return;

    body.innerHTML = "";

    if (competenceCategories.length === 0) {
        body.innerHTML = `<tr><td colspan="3" class="empty-state">Aucune catégorie pour le moment.</td></tr>`;
        if (deleteButton) deleteButton.disabled = true;
        if (selectAll) selectAll.checked = false;
        return;
    }

    competenceCategories.forEach((category, index) => {
        const color = normalizeColor(category.color, index);
        const row = document.createElement("tr");
        const isSelected = selectedCompetenceCategories.has(index);

        row.style.backgroundColor = hexToRgba(color, 0.20);
        row.style.boxShadow = `inset 3px 0 0 ${color}`;

        if (isSelected) row.classList.add("selected-row");

        row.innerHTML = `
            <td class="select-col">
                <input class="row-checkbox competence-category-checkbox" type="checkbox" data-index="${index}" aria-label="Sélectionner la catégorie ${index + 1}" ${isSelected ? "checked" : ""} />
            </td>
            <td>
                <button
                    class="competence-category-number-btn"
                    type="button"
                    data-index="${index}"
                    style="background-color: ${escapeHtml(color)}; --row-glow: ${hexToRgba(color, 0.55)}"
                    aria-label="Changer la couleur de la catégorie ${index + 1}"
                >${index + 1}</button>
            </td>
            <td class="editable competence-category-name-cell" contenteditable="true" data-index="${index}" data-field="name" spellcheck="true">${escapeHtml(category.name)}</td>
        `;

        body.appendChild(row);
    });

    body.querySelectorAll(".competence-category-checkbox").forEach((checkbox) => {
        checkbox.addEventListener("change", (event) => {
            const index = Number(event.target.dataset.index);

            if (event.target.checked) {
                selectedCompetenceCategories.add(index);
            } else {
                selectedCompetenceCategories.delete(index);
            }

            renderCompetenceCategoriesTable();
        });
    });

    body.querySelectorAll(".competence-category-number-btn").forEach((button) => {
        button.addEventListener("click", (event) => {
            const index = Number(event.currentTarget.dataset.index);
            activeColorTarget = {
                type: "competenceCategory",
                index
            };

            showColorMenu(event.currentTarget);
        });
    });

    body.querySelectorAll(".editable").forEach((cell) => {
        cell.addEventListener("input", (event) => {
            const index = Number(event.target.dataset.index);
            const field = event.target.dataset.field;
            competenceCategories[index][field] = event.target.textContent.trim();
            saveCompetenceCategories();
            renderCompetenceMatrices();
        });
    });

    if (deleteButton) deleteButton.disabled = selectedCompetenceCategories.size === 0;
    if (selectAll) {
        selectAll.checked = competenceCategories.length > 0 && selectedCompetenceCategories.size === competenceCategories.length;
        selectAll.indeterminate = selectedCompetenceCategories.size > 0 && selectedCompetenceCategories.size < competenceCategories.length;
    }
}


function renderCompetenceMatrices() {
    const zone = document.getElementById("competence-matrices-zone");

    if (!zone) return;

    competenceCategories.forEach((category) => {
        if (!Array.isArray(competenceMatrices[category.id])) {
            competenceMatrices[category.id] = [];
        }
    });

    zone.innerHTML = "";

    if (competenceCategories.length === 0) {
        zone.innerHTML = `
            <section class="card competence-empty-card">
                <div class="competence-empty-content">
                    <h2>Aucune matrice pour le moment</h2>
                    <p>Ajoute une catégorie à gauche pour générer automatiquement sa matrice.</p>
                </div>
            </section>
        `;
        return;
    }

    competenceCategories.forEach((category, categoryIndex) => {
        const color = normalizeColor(category.color, categoryIndex);
        const skills = competenceMatrices[category.id] || [];
        const card = document.createElement("section");

        card.className = "card competence-matrix-card";
        card.style.setProperty("--matrix-color", color);
        card.style.setProperty("--matrix-glow", hexToRgba(color, 0.42));

        card.innerHTML = `
            <div class="card-header">
                <h2 class="competence-matrix-title">
                    <span class="competence-matrix-dot"></span>
                    ${escapeHtml(category.name || "Catégorie sans nom")}
                </h2>
                <div class="competence-matrix-actions">
                    <button class="btn icon-action-btn icon-add-btn competence-add-skill-btn" type="button" data-category-id="${escapeHtml(category.id)}" title="Ajouter une compétence" aria-label="Ajouter une compétence">+</button>
                    <button class="btn btn-danger icon-action-btn icon-delete-btn competence-delete-skills-btn" type="button" data-category-id="${escapeHtml(category.id)}" title="Supprimer sélection" aria-label="Supprimer sélection" ${getSelectedCompetenceSkillSet(category.id).size === 0 ? "disabled" : ""}>-</button>
                </div>
            </div>
            <div class="table-wrapper competence-matrix-wrapper">
                ${buildCompetenceMatrixTable(category, skills, color)}
            </div>
        `;

        zone.appendChild(card);
    });

    bindCompetenceMatrixEvents();
}

function buildCompetenceMatrixTable(category, skills, color) {
    if (stakeholders.length === 0) {
        return `
            <div class="empty-state">
                Ajoute des parties prenantes pour alimenter automatiquement cette matrice.
            </div>
        `;
    }

    if (skills.length === 0) {
        return `
            <table class="competence-matrix-table">
                <thead>
                    <tr>
                        <th class="select-col">Sel.</th>
                        <th>Compétence</th>
                        ${stakeholders.map((person) => `<th class="competence-person-header">${escapeHtml(getStakeholderLabel(person))}</th>`).join("")}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td colspan="${2 + stakeholders.length}" class="empty-state">Aucune compétence dans cette catégorie pour le moment.</td>
                    </tr>
                </tbody>
            </table>
        `;
    }

    const selectedSet = getSelectedCompetenceSkillSet(category.id);

    return `
        <table class="competence-matrix-table">
            <thead>
                <tr>
                    <th class="select-col">Sel.</th>
                    <th>Compétence</th>
                    ${stakeholders.map((person) => `<th class="competence-person-header">${escapeHtml(getStakeholderLabel(person))}</th>`).join("")}
                </tr>
            </thead>
            <tbody>
                ${skills.map((skill, skillIndex) => buildCompetenceSkillRow(category, skill, skillIndex, selectedSet)).join("")}
            </tbody>
        </table>
    `;
}

function buildCompetenceSkillRow(category, skill, skillIndex, selectedSet) {
    const isSelected = selectedSet.has(skillIndex);

    return `
        <tr class="${isSelected ? "selected-row" : ""}">
            <td class="select-col">
                <input
                    class="row-checkbox competence-skill-checkbox"
                    type="checkbox"
                    data-category-id="${escapeHtml(category.id)}"
                    data-skill-index="${skillIndex}"
                    aria-label="Sélectionner la compétence ${skillIndex + 1}"
                    ${isSelected ? "checked" : ""}
                />
            </td>
            <td class="editable competence-skill-cell" contenteditable="true" data-category-id="${escapeHtml(category.id)}" data-skill-index="${skillIndex}" spellcheck="true">${escapeHtml(skill.name)}</td>
            ${stakeholders.map((person) => buildCompetenceLevelCell(category.id, skill, skillIndex, person)).join("")}
        </tr>
    `;
}

function buildCompetenceLevelCell(categoryId, skill, skillIndex, person) {
    const stakeholderId = getStakeholderId(person);
    const level = skill.levels?.[stakeholderId] || "";

    return `
        <td class="competence-level-cell" data-level="${escapeHtml(level)}">
            <select
                class="competence-level-select"
                data-category-id="${escapeHtml(categoryId)}"
                data-skill-index="${skillIndex}"
                data-stakeholder-id="${escapeHtml(stakeholderId)}"
                aria-label="Niveau de compétence"
            >
                ${createCompetenceLevelOptions(level)}
            </select>
        </td>
    `;
}

function createCompetenceLevelOptions(selectedLevel) {
    return Object.entries(competenceLevelLabels).map(([value, label]) => `
        <option value="${escapeHtml(value)}" ${String(value) === String(selectedLevel) ? "selected" : ""}>
            ${escapeHtml(label)}
        </option>
    `).join("");
}

function bindCompetenceMatrixEvents() {
    document.querySelectorAll(".competence-add-skill-btn").forEach((button) => {
        button.addEventListener("click", () => {
            const categoryId = button.dataset.categoryId;

            if (!Array.isArray(competenceMatrices[categoryId])) {
                competenceMatrices[categoryId] = [];
            }

            competenceMatrices[categoryId].push({
                id: createId(),
                name: "",
                levels: {}
            });

            saveCompetenceMatrices();
            renderCompetenceMatrices();

            const lastSkill = document.querySelector(`.competence-skill-cell[data-category-id="${cssEscape(categoryId)}"][data-skill-index="${competenceMatrices[categoryId].length - 1}"]`);
            if (lastSkill) lastSkill.focus();
        });
    });

    document.querySelectorAll(".competence-delete-skills-btn").forEach((button) => {
        button.addEventListener("click", () => {
            const categoryId = button.dataset.categoryId;
            const selectedSet = getSelectedCompetenceSkillSet(categoryId);

            if (selectedSet.size === 0) return;

            const confirmation = confirm("Tu veux vraiment supprimer les compétences cochées ?");
            if (!confirmation) return;

            competenceMatrices[categoryId] = (competenceMatrices[categoryId] || []).filter((_, index) => !selectedSet.has(index));
            selectedSet.clear();

            saveCompetenceMatrices();
            renderCompetenceMatrices();
        });
    });

    document.querySelectorAll(".competence-skill-checkbox").forEach((checkbox) => {
        checkbox.addEventListener("change", (event) => {
            const categoryId = event.target.dataset.categoryId;
            const skillIndex = Number(event.target.dataset.skillIndex);
            const selectedSet = getSelectedCompetenceSkillSet(categoryId);

            if (event.target.checked) {
                selectedSet.add(skillIndex);
            } else {
                selectedSet.delete(skillIndex);
            }

            renderCompetenceMatrices();
        });
    });

    document.querySelectorAll(".competence-skill-cell").forEach((cell) => {
        cell.addEventListener("input", (event) => {
            const categoryId = event.target.dataset.categoryId;
            const skillIndex = Number(event.target.dataset.skillIndex);

            if (!competenceMatrices[categoryId]?.[skillIndex]) return;

            competenceMatrices[categoryId][skillIndex].name = event.target.textContent.trim();
            saveCompetenceMatrices();
        });
    });

    document.querySelectorAll(".competence-level-select").forEach((select) => {
        select.addEventListener("change", (event) => {
            const categoryId = event.target.dataset.categoryId;
            const skillIndex = Number(event.target.dataset.skillIndex);
            const stakeholderId = event.target.dataset.stakeholderId;
            const level = event.target.value;

            if (!competenceMatrices[categoryId]?.[skillIndex]) return;

            if (!competenceMatrices[categoryId][skillIndex].levels) {
                competenceMatrices[categoryId][skillIndex].levels = {};
            }

            if (level === "") {
                delete competenceMatrices[categoryId][skillIndex].levels[stakeholderId];
            } else {
                competenceMatrices[categoryId][skillIndex].levels[stakeholderId] = level;
            }

            saveCompetenceMatrices();
            renderCompetenceMatrices();
        });
    });
}

function getSelectedCompetenceSkillSet(categoryId) {
    if (!selectedCompetenceSkills[categoryId]) {
        selectedCompetenceSkills[categoryId] = new Set();
    }

    return selectedCompetenceSkills[categoryId];
}

function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") {
        return window.CSS.escape(value);
    }

    return String(value).replaceAll('"', '\\"');
}

function renderColorMenu() {
    if (!colorMenu) return;

    colorMenu.innerHTML = "";

    predefinedColors.forEach((color) => {
        const button = document.createElement("button");
        button.className = "color-choice";
        button.type = "button";
        button.style.backgroundColor = color;
        button.style.setProperty("--choice-glow", hexToRgba(color, 0.55));
        button.dataset.color = color;
        button.title = color;
        button.setAttribute("aria-label", `Choisir la couleur ${color}`);

        button.addEventListener("click", () => {
            if (!activeColorTarget) return;

            if (activeColorTarget.type === "stakeholder") {
                stakeholders[activeColorTarget.index].color = color;
                saveStakeholders();
                hideColorMenu();
                renderStakeholdersTable();
                return;
            }

            if (activeColorTarget.type === "competenceCategory") {
                competenceCategories[activeColorTarget.index].color = color;
                saveCompetenceCategories();
                hideColorMenu();
                renderCompetenceCategoriesTable();
                renderCompetenceMatrices();
                return;
            }

            if (activeColorTarget.type === "phase") {
                phases[activeColorTarget.index].color = color;
                savePhases();
                hideColorMenu();
                renderPhasesTable();
                renderWbsTable();
                return;
            }

            if (activeColorTarget.type === "kpiType") {
                kpiTypes[activeColorTarget.index].color = color;
                saveKpiTypes();
                hideColorMenu();
                renderKpiTypesTable();
                renderKpiTable();
                return;
            }

            if (activeColorTarget.type === "riskType") {
                riskTypes[activeColorTarget.index].color = color;
                saveRiskTypes();
                hideColorMenu();
                renderRiskTypesTable();
                renderRisksTable();
                return;
            }

            if (activeColorTarget.type === "vmServer" && typeof vmSizingProfiles !== "undefined") {
                vmSizingProfiles[activeColorTarget.index].color = color;
                vmSizingSaveProfiles();
                hideColorMenu();
                vmSizingRenderServerTable();
            }
        });

        colorMenu.appendChild(button);
    });
}

function showColorMenu(anchor) {
    const rect = anchor.getBoundingClientRect();

    colorMenu.classList.remove("hidden");
    colorMenu.style.top = `${rect.bottom + 8}px`;
    colorMenu.style.left = `${Math.min(rect.left, window.innerWidth - 235)}px`;

    document.querySelectorAll(".color-choice").forEach((choice) => {
        let activeColor = "";

        if (activeColorTarget?.type === "stakeholder") {
            activeColor = stakeholders[activeColorTarget.index]?.color;
        }

        if (activeColorTarget?.type === "competenceCategory") {
            activeColor = competenceCategories[activeColorTarget.index]?.color;
        }

        if (activeColorTarget?.type === "phase") {
            activeColor = phases[activeColorTarget.index]?.color;
        }

        if (activeColorTarget?.type === "kpiType") {
            activeColor = kpiTypes[activeColorTarget.index]?.color;
        }

        if (activeColorTarget?.type === "riskType") {
            activeColor = riskTypes[activeColorTarget.index]?.color;
        }

        choice.classList.toggle("active", choice.dataset.color === activeColor);
    });
}

function closeColorMenuOnOutsideClick(event) {
    const clickedNumber = event.target.closest(".row-number-btn, .competence-category-number-btn, .phase-number-btn, .kpi-type-number-btn, .risk-type-number-btn");
    const clickedMenu = event.target.closest("#color-menu");

    if (!clickedNumber && !clickedMenu) {
        hideColorMenu();
    }
}


/* V42 — Export / import avec matrice de compétences */





if (typeof helpTexts !== "undefined") {
    helpTexts.competences = `
        <p>Cette page sert à suivre les compétences disponibles dans l’équipe projet.</p>
        <ul>
            <li>Crée des catégories à gauche : technique, sécurité, gestion projet, etc.</li>
            <li>Chaque catégorie génère automatiquement une matrice dédiée.</li>
            <li>Dans chaque matrice, ajoute les compétences que tu veux suivre.</li>
            <li>Les colonnes sont alimentées automatiquement par les parties prenantes.</li>
            <li>Les niveaux vont de 0 à 5, avec une légende visible à gauche.</li>
        </ul>
    `;
}

/* V42 — Démarrage unique */


/* V43 — Contexte du projet */
const CONTEXT_DEFAULT = {
    summary: "",
    origin: "",
    stakes: "",
    scopeIn: "",
    scopeOut: "",
    constraints: "",
    assumptions: "",
    deliverables: "",
    successCriteria: ""
};

const contextFieldLabels = {
    summary: "Résumé exécutif",
    origin: "Origine / déclencheur",
    stakes: "Enjeux",
    scopeIn: "Périmètre inclus",
    scopeOut: "Hors périmètre",
    constraints: "Contraintes",
    assumptions: "Hypothèses",
    deliverables: "Livrables attendus",
    successCriteria: "Critères de succès"
};

let projectContext = structuredClone(CONTEXT_DEFAULT);



function initContextPage() {
    projectContext = loadProjectContext();
    renderProjectContext();

    document.querySelectorAll("[data-context-field]").forEach((field) => {
        field.addEventListener("input", (event) => {
            const key = event.target.dataset.contextField;
            projectContext[key] = event.target.value;
            saveProjectContext();
        });
    });

    document.getElementById("reset-context-btn")?.addEventListener("click", () => {
        const confirmation = confirm("Tu veux vraiment réinitialiser le contexte du projet ?");
        if (!confirmation) return;

        projectContext = structuredClone(CONTEXT_DEFAULT);
        saveProjectContext();
        renderProjectContext();
    });

    document.getElementById("context-copy-summary-btn")?.addEventListener("click", async () => {
        const text = buildContextPlainText();

        try {
            await navigator.clipboard.writeText(text);
            alert("Contexte copié dans le presse-papiers.");
        } catch (error) {
            console.error("Copie impossible :", error);
            alert("Impossible de copier automatiquement. Tu peux sélectionner le texte depuis les champs.");
        }
    });
}


function saveProjectContext() {
    localStorage.setItem(getProjectKey("context"), JSON.stringify(projectContext));
}




/* V43 — Export / import avec Contexte */





if (typeof helpTexts !== "undefined") {
    helpTexts.context = `
        <p>Cette page sert à rédiger le cadrage initial du projet avant les matrices et les outils de pilotage.</p>
        <ul>
            <li>Utilise le résumé exécutif pour expliquer rapidement le projet.</li>
            <li>Précise l’origine, les enjeux, le périmètre, le hors périmètre, les contraintes et les hypothèses.</li>
            <li>Ajoute les livrables attendus et les critères de succès.</li>
            <li>Le bouton “Copier le contexte” permet de récupérer une version texte exploitable dans un dossier projet.</li>
            <li>Le contexte est inclus dans l’export/import portable et dans l’export Excel.</li>
        </ul>
    `;
}

/* V43 — Démarrage unique */


/* V44 — Rédactionnel par onglets + objectifs liés au SMART */
const REDACTION_SECTIONS_V44 = {
    objectives: {
        storageKey: "objectives",
        label: "Objectifs",
        singular: "objectif",
        hasType: false
    },
    stakes: {
        storageKey: "stakes",
        label: "Enjeux",
        singular: "enjeu",
        hasType: false
    },
    scope: {
        storageKey: "scope",
        label: "Périmètre",
        singular: "élément de périmètre",
        hasType: true
    },
    constraints: {
        storageKey: "constraints",
        label: "Contraintes",
        singular: "contrainte",
        hasType: false
    },
    assumptions: {
        storageKey: "assumptions",
        label: "Hypothèses",
        singular: "hypothèse",
        hasType: false
    },
    success: {
        storageKey: "success_criteria",
        label: "Critères de succès",
        singular: "critère",
        hasType: false
    }
};

const V44_REDACTION_PAGES = ["objectives", "stakes", "scope", "constraints", "assumptions", "success"];
const V44_CONTEXT_FIELDS = ["summary", "origin", "deliverables"];

let redactionRows = [];
let selectedRedactionRows = new Set();
let projectObjectives = [];


function seedProjectData(projectId) {
    if (!localStorage.getItem(`forge_project_${projectId}_context_v1`)) {
        localStorage.setItem(`forge_project_${projectId}_context_v1`, JSON.stringify({
            summary: "",
            origin: "",
            deliverables: ""
        }));
    }
    if (!localStorage.getItem(`forge_project_${projectId}_objectives_v1`)) {
        localStorage.setItem(`forge_project_${projectId}_objectives_v1`, JSON.stringify([]));
    }
    if (!localStorage.getItem(`forge_project_${projectId}_stakes_v1`)) {
        localStorage.setItem(`forge_project_${projectId}_stakes_v1`, JSON.stringify([]));
    }
    if (!localStorage.getItem(`forge_project_${projectId}_scope_v1`)) {
        localStorage.setItem(`forge_project_${projectId}_scope_v1`, JSON.stringify([]));
    }
    if (!localStorage.getItem(`forge_project_${projectId}_constraints_v1`)) {
        localStorage.setItem(`forge_project_${projectId}_constraints_v1`, JSON.stringify([]));
    }
    if (!localStorage.getItem(`forge_project_${projectId}_assumptions_v1`)) {
        localStorage.setItem(`forge_project_${projectId}_assumptions_v1`, JSON.stringify([]));
    }
    if (!localStorage.getItem(`forge_project_${projectId}_success_criteria_v1`)) {
        localStorage.setItem(`forge_project_${projectId}_success_criteria_v1`, JSON.stringify([]));
    }
    if (!localStorage.getItem(`forge_project_${projectId}_stakeholders_v1`)) {
        localStorage.setItem(`forge_project_${projectId}_stakeholders_v1`, JSON.stringify([]));
    }
    if (!localStorage.getItem(`forge_project_${projectId}_competence_categories_v1`)) {
        localStorage.setItem(`forge_project_${projectId}_competence_categories_v1`, JSON.stringify(structuredClone(defaultCompetenceCategories)));
    }
    if (!localStorage.getItem(`forge_project_${projectId}_competence_matrices_v1`)) {
        localStorage.setItem(`forge_project_${projectId}_competence_matrices_v1`, JSON.stringify({}));
    }
    if (!localStorage.getItem(`forge_project_${projectId}_phases_v1`)) {
        localStorage.setItem(`forge_project_${projectId}_phases_v1`, JSON.stringify([]));
    }
    if (!localStorage.getItem(`forge_project_${projectId}_wbs_v1`)) {
        localStorage.setItem(`forge_project_${projectId}_wbs_v1`, JSON.stringify([]));
    }
    if (!localStorage.getItem(`forge_project_${projectId}_swot_v1`)) {
        localStorage.setItem(`forge_project_${projectId}_swot_v1`, JSON.stringify({
            strengths: [],
            weaknesses: [],
            opportunities: [],
            threats: []
        }));
    }
    if (!localStorage.getItem(`forge_project_${projectId}_risk_types_v1`)) {
        localStorage.setItem(`forge_project_${projectId}_risk_types_v1`, JSON.stringify(structuredClone(defaultRiskTypes)));
    }
    if (!localStorage.getItem(`forge_project_${projectId}_risks_v1`)) {
        localStorage.setItem(`forge_project_${projectId}_risks_v1`, JSON.stringify([]));
    }
    if (!localStorage.getItem(`forge_project_${projectId}_raci_v1`)) {
        localStorage.setItem(`forge_project_${projectId}_raci_v1`, JSON.stringify({}));
    }
    if (!localStorage.getItem(`forge_project_${projectId}_smart_v1`)) {
        localStorage.setItem(`forge_project_${projectId}_smart_v1`, JSON.stringify([]));
    }
    if (!localStorage.getItem(`forge_project_${projectId}_kpi_types_v1`)) {
        localStorage.setItem(`forge_project_${projectId}_kpi_types_v1`, JSON.stringify(structuredClone(defaultKpiTypes)));
    }
    if (!localStorage.getItem(`forge_project_${projectId}_kpis_v1`)) {
        localStorage.setItem(`forge_project_${projectId}_kpis_v1`, JSON.stringify([]));
    }
}

/* Contexte V44 : page courte uniquement */
function loadProjectContext() {
    const savedData = localStorage.getItem(getProjectKey("context"));

    if (!savedData) {
        const defaults = {
            summary: "",
            origin: "",
            deliverables: ""
        };
        localStorage.setItem(getProjectKey("context"), JSON.stringify(defaults));
        return defaults;
    }

    try {
        const parsed = JSON.parse(savedData);
        return {
            summary: parsed?.summary || "",
            origin: parsed?.origin || "",
            deliverables: parsed?.deliverables || ""
        };
    } catch (error) {
        console.error("Impossible de charger le contexte du projet :", error);
        return {
            summary: "",
            origin: "",
            deliverables: ""
        };
    }
}

function renderProjectContext() {
    document.querySelectorAll("[data-context-field]").forEach((field) => {
        const key = field.dataset.contextField;
        field.value = projectContext[key] || "";
    });
}

function buildContextPlainText() {
    const project = getActiveProject();
    const labels = {
        summary: "Résumé exécutif",
        origin: "Origine / déclencheur",
        deliverables: "Livrables attendus"
    };
    const lines = [
        `Contexte du projet — ${project?.name || "Projet sans nom"}`,
        ""
    ];

    Object.entries(labels).forEach(([key, label]) => {
        lines.push(label);
        lines.push((projectContext[key] || "").trim() || "—");
        lines.push("");
    });

    return lines.join("\n").trim();
}

/* Pages rédactionnelles point par point */
function initRedactionPage(sectionKey) {
    const section = REDACTION_SECTIONS_V44[sectionKey];

    if (!section) return;

    redactionRows = loadRedactionRows(section.storageKey);
    selectedRedactionRows.clear();

    renderRedactionTable(sectionKey);

    document.getElementById("add-redaction-row-btn")?.addEventListener("click", () => {
        redactionRows.push(createEmptyRedactionRow(sectionKey));
        saveRedactionRows(section.storageKey, redactionRows);
        renderRedactionTable(sectionKey);

        const lastTitle = document.querySelector("#redaction-table-body tr:last-child .redaction-title-cell");
        if (lastTitle) lastTitle.focus();
    });

    document.getElementById("delete-selected-redaction-btn")?.addEventListener("click", () => {
        if (selectedRedactionRows.size === 0) return;

        const confirmation = confirm(`Tu veux vraiment supprimer les ${section.singular}s cochés ?`);
        if (!confirmation) return;

        const deletedIds = redactionRows
            .filter((_, index) => selectedRedactionRows.has(index))
            .map((row) => row.id);

        redactionRows = redactionRows.filter((_, index) => !selectedRedactionRows.has(index));

        if (sectionKey === "objectives") {
            unlinkDeletedObjectivesFromSmart(deletedIds);
        }

        selectedRedactionRows.clear();
        saveRedactionRows(section.storageKey, redactionRows);
        renderRedactionTable(sectionKey);
    });

    document.getElementById("reset-redaction-btn")?.addEventListener("click", () => {
        const confirmation = confirm(`Tu veux vraiment réinitialiser ${section.label.toLowerCase()} ?`);
        if (!confirmation) return;

        if (sectionKey === "objectives") {
            unlinkDeletedObjectivesFromSmart(redactionRows.map((row) => row.id));
        }

        redactionRows = [];
        selectedRedactionRows.clear();
        saveRedactionRows(section.storageKey, redactionRows);
        renderRedactionTable(sectionKey);
    });

    document.getElementById("select-all-redaction")?.addEventListener("change", (event) => {
        selectedRedactionRows.clear();

        if (event.target.checked) {
            redactionRows.forEach((_, index) => selectedRedactionRows.add(index));
        }

        renderRedactionTable(sectionKey);
    });
}

function createEmptyRedactionRow(sectionKey) {
    return {
        id: createId(),
        title: "",
        description: "",
        type: sectionKey === "scope" ? "Inclus" : ""
    };
}

function loadRedactionRows(storageKey) {
    const savedData = localStorage.getItem(getProjectKey(storageKey));

    if (!savedData) {
        localStorage.setItem(getProjectKey(storageKey), JSON.stringify([]));
        return [];
    }

    try {
        const parsed = JSON.parse(savedData);

        if (!Array.isArray(parsed)) return [];

        const normalized = parsed.map((row) => ({
            id: row.id || createId(),
            title: row.title || row.name || row.objective || "",
            description: row.description || row.note || "",
            type: row.type || ""
        }));

        localStorage.setItem(getProjectKey(storageKey), JSON.stringify(normalized));
        return normalized;
    } catch (error) {
        console.error(`Impossible de charger ${storageKey} :`, error);
        return [];
    }
}

function saveRedactionRows(storageKey, rows) {
    localStorage.setItem(getProjectKey(storageKey), JSON.stringify(rows));
}

function renderRedactionTable(sectionKey) {
    const section = REDACTION_SECTIONS_V44[sectionKey];
    const body = document.getElementById("redaction-table-body");
    const deleteButton = document.getElementById("delete-selected-redaction-btn");
    const selectAll = document.getElementById("select-all-redaction");

    if (!body || !section) return;

    body.innerHTML = "";

    const colspan = section.hasType ? 5 : 4;

    if (redactionRows.length === 0) {
        body.innerHTML = `<tr><td colspan="${colspan}" class="empty-state">Aucun ${section.singular} pour le moment.</td></tr>`;
        if (deleteButton) deleteButton.disabled = true;
        if (selectAll) selectAll.checked = false;
        return;
    }

    redactionRows.forEach((rowData, index) => {
        const row = document.createElement("tr");
        const isSelected = selectedRedactionRows.has(index);

        if (isSelected) row.classList.add("selected-row");

        row.innerHTML = `
            <td class="select-col">
                <input class="row-checkbox redaction-checkbox" type="checkbox" data-index="${index}" aria-label="Sélectionner la ligne ${index + 1}" ${isSelected ? "checked" : ""} />
            </td>
            <td>${index + 1}</td>
            ${section.hasType ? createRedactionTypeCell(rowData, index) : ""}
            <td class="editable redaction-title-cell" contenteditable="true" data-index="${index}" data-field="title" spellcheck="true">${escapeHtml(rowData.title)}</td>
            <td class="editable redaction-description-cell" contenteditable="true" data-index="${index}" data-field="description" spellcheck="true">${escapeHtml(rowData.description)}</td>
        `;

        body.appendChild(row);
    });

    bindRedactionTableEvents(sectionKey);

    if (deleteButton) deleteButton.disabled = selectedRedactionRows.size === 0;
    if (selectAll) {
        selectAll.checked = redactionRows.length > 0 && selectedRedactionRows.size === redactionRows.length;
        selectAll.indeterminate = selectedRedactionRows.size > 0 && selectedRedactionRows.size < redactionRows.length;
    }
}

function createRedactionTypeCell(rowData, index) {
    const currentType = rowData.type || "Inclus";

    return `
        <td class="redaction-type-cell">
            <select class="redaction-type-select" data-index="${index}" data-field="type">
                <option value="Inclus" ${currentType === "Inclus" ? "selected" : ""}>Inclus</option>
                <option value="Hors périmètre" ${currentType === "Hors périmètre" ? "selected" : ""}>Hors périmètre</option>
                <option value="À clarifier" ${currentType === "À clarifier" ? "selected" : ""}>À clarifier</option>
            </select>
        </td>
    `;
}

function bindRedactionTableEvents(sectionKey) {
    const section = REDACTION_SECTIONS_V44[sectionKey];
    const body = document.getElementById("redaction-table-body");

    if (!body || !section) return;

    body.querySelectorAll(".editable").forEach((cell) => {
        cell.addEventListener("input", (event) => {
            const index = Number(event.target.dataset.index);
            const field = event.target.dataset.field;

            redactionRows[index][field] = event.target.textContent.trim();
            saveRedactionRows(section.storageKey, redactionRows);
        });
    });

    body.querySelectorAll(".redaction-type-select").forEach((select) => {
        select.addEventListener("change", (event) => {
            const index = Number(event.target.dataset.index);
            redactionRows[index].type = event.target.value;
            saveRedactionRows(section.storageKey, redactionRows);
        });
    });

    body.querySelectorAll(".redaction-checkbox").forEach((checkbox) => {
        checkbox.addEventListener("change", (event) => {
            const index = Number(event.target.dataset.index);

            if (event.target.checked) {
                selectedRedactionRows.add(index);
            } else {
                selectedRedactionRows.delete(index);
            }

            renderRedactionTable(sectionKey);
        });
    });
}

function loadProjectObjectives() {
    return loadRedactionRows("objectives");
}

function getProjectObjectiveLabel(objective) {
    return objective.title || "Objectif sans nom";
}

function unlinkDeletedObjectivesFromSmart(deletedIds) {
    if (!Array.isArray(deletedIds) || deletedIds.length === 0) return;

    const normalizedSmart = loadSmartObjectives().map((row) => (
        deletedIds.includes(row.objectiveId)
            ? { ...row, objectiveId: "" }
            : row
    ));

    localStorage.setItem(getProjectKey("smart"), JSON.stringify(normalizedSmart));
}


/* V44 — SMART alimenté par l’onglet Objectifs */
function initSmartPage() {
    smartRows = loadSmartObjectives();
    projectObjectives = loadProjectObjectives();
    stakeholders = loadStakeholders();

    renderSmartTable();

    const addButton = document.getElementById("add-smart-btn");
    const deleteButton = document.getElementById("delete-selected-smart-btn");
    const resetButton = document.getElementById("reset-smart-btn");
    const selectAll = document.getElementById("select-all-smart");

    addButton?.addEventListener("click", () => {
        smartRows.push(createEmptySmartObjective());
        saveSmartObjectives();
        renderSmartTable();
    });

    deleteButton?.addEventListener("click", () => {
        if (selectedSmartRows.size === 0) return;

        const confirmation = confirm("Tu veux vraiment supprimer les lignes SMART cochées ?");
        if (!confirmation) return;

        smartRows = smartRows.filter((_, index) => !selectedSmartRows.has(index));
        selectedSmartRows.clear();
        saveSmartObjectives();
        renderSmartTable();
    });

    resetButton?.addEventListener("click", () => {
        const confirmation = confirm("Tu veux vraiment réinitialiser les lignes SMART ?");
        if (!confirmation) return;

        smartRows = [];
        selectedSmartRows.clear();

        const kpis = loadKpis().map((kpi) => ({ ...kpi, smartId: "" }));
        localStorage.setItem(getProjectKey("kpis"), JSON.stringify(kpis));

        saveSmartObjectives();
        renderSmartTable();
    });

    selectAll?.addEventListener("change", (event) => {
        selectedSmartRows.clear();

        if (event.target.checked) {
            smartRows.forEach((_, index) => selectedSmartRows.add(index));
        }

        renderSmartTable();
    });
}

function createEmptySmartObjective() {
    return {
        id: createId(),
        objectiveId: projectObjectives[0]?.id || "",
        objective: "",
        specific: "",
        measurable: "",
        achievable: "",
        realistic: "",
        timebound: "",
        dueDate: "",
        responsable: "",
        responsableId: "",
        status: "",
        note: ""
    };
}

function loadSmartObjectives() {
    const savedData = localStorage.getItem(getProjectKey("smart"));

    if (!savedData) {
        localStorage.setItem(getProjectKey("smart"), JSON.stringify([]));
        return [];
    }

    try {
        const parsed = JSON.parse(savedData);

        if (!Array.isArray(parsed)) return [];

        const normalized = parsed.map((row) => ({
            id: row.id || createId(),
            objectiveId: row.objectiveId || "",
            objective: row.objective || "",
            specific: row.specific || "",
            measurable: row.measurable || "",
            achievable: row.achievable || "",
            realistic: row.realistic || "",
            timebound: row.timebound || "",
            dueDate: row.dueDate || "",
            responsable: row.responsable || "",
            responsableId: row.responsableId || "",
            status: row.status || "",
            note: row.note || ""
        }));

        localStorage.setItem(getProjectKey("smart"), JSON.stringify(normalized));
        return normalized;
    } catch (error) {
        console.error("Impossible de charger les lignes SMART :", error);
        return [];
    }
}

function renderSmartTable() {
    const body = document.getElementById("smart-table-body");
    const deleteButton = document.getElementById("delete-selected-smart-btn");
    const selectAll = document.getElementById("select-all-smart");

    if (!body) return;

    projectObjectives = loadProjectObjectives();
    syncSmartResponsablesWithStakeholders();
    body.innerHTML = "";

    if (smartRows.length === 0) {
        body.innerHTML = `<tr><td colspan="12" class="empty-state">Aucune ligne SMART pour le moment. Crée d’abord un objectif dans l’onglet Objectifs, puis ajoute une ligne SMART ici.</td></tr>`;
        if (deleteButton) deleteButton.disabled = true;
        if (selectAll) selectAll.checked = false;
        return;
    }

    smartRows.forEach((smart, index) => {
        const row = document.createElement("tr");
        const isSelected = selectedSmartRows.has(index);

        if (isSelected) row.classList.add("selected-row");

        row.innerHTML = `
            <td class="select-col">
                <input class="row-checkbox smart-checkbox" type="checkbox" data-index="${index}" aria-label="Sélectionner la ligne SMART ${index + 1}" ${isSelected ? "checked" : ""} />
            </td>
            <td>${index + 1}</td>
            <td>
                <select class="smart-objective-link-select" data-index="${index}" data-field="objectiveId">
                    <option value="">Sans objectif</option>
                    ${createSmartObjectiveLinkOptions(smart.objectiveId)}
                    ${createLegacySmartObjectiveOption(smart)}
                </select>
            </td>
            ${createSmartEditableCell(smart.specific, index, "specific", "smart-specific-cell")}
            ${createSmartEditableCell(smart.measurable, index, "measurable", "smart-measurable-cell")}
            ${createSmartEditableCell(smart.achievable, index, "achievable", "smart-achievable-cell")}
            ${createSmartEditableCell(smart.realistic, index, "realistic", "smart-realistic-cell")}
            ${createSmartEditableCell(smart.timebound, index, "timebound", "smart-timebound-cell")}
            <td>
                <input class="smart-date-input" type="date" value="${escapeHtml(smart.dueDate)}" data-index="${index}" data-field="dueDate" />
            </td>
            <td>
                <select class="smart-responsable-select" data-index="${index}" data-field="responsableId">
                    ${createSmartResponsableOptions(smart)}
                </select>
            </td>
            <td>
                <select class="smart-status-select ${getSmartStatusClass(smart.status)}" data-index="${index}" data-field="status">
                    ${createSmartStatusOptions(smart.status)}
                </select>
            </td>
            ${createSmartEditableCell(smart.note, index, "note", "smart-note-cell")}
        `;

        body.appendChild(row);
    });

    bindSmartTableEvents();

    if (deleteButton) deleteButton.disabled = selectedSmartRows.size === 0;
    if (selectAll) {
        selectAll.checked = smartRows.length > 0 && selectedSmartRows.size === smartRows.length;
        selectAll.indeterminate = selectedSmartRows.size > 0 && selectedSmartRows.size < smartRows.length;
    }
}

function createSmartObjectiveLinkOptions(selectedObjectiveId) {
    return projectObjectives.map((objective) => `
        <option value="${escapeHtml(objective.id)}" ${objective.id === selectedObjectiveId ? "selected" : ""}>
            ${escapeHtml(getProjectObjectiveLabel(objective))}
        </option>
    `).join("");
}

function createLegacySmartObjectiveOption(row) {
    if (!row.objective || row.objectiveId) return "";
    return `<option value="" selected>${escapeHtml(row.objective)} · ancien libellé</option>`;
}

function bindSmartTableEvents() {
    const body = document.getElementById("smart-table-body");
    if (!body) return;

    body.querySelectorAll(".editable").forEach((cell) => {
        cell.addEventListener("input", (event) => {
            const index = Number(event.target.dataset.index);
            const field = event.target.dataset.field;

            smartRows[index][field] = event.target.textContent.trim();
            saveSmartObjectives();
        });
    });

    body.querySelectorAll(".smart-date-input").forEach((input) => {
        input.addEventListener("change", (event) => {
            const index = Number(event.target.dataset.index);
            smartRows[index].dueDate = event.target.value;
            saveSmartObjectives();
        });
    });

    body.querySelectorAll(".smart-objective-link-select").forEach((select) => {
        select.addEventListener("change", (event) => {
            const index = Number(event.target.dataset.index);
            smartRows[index].objectiveId = event.target.value;
            smartRows[index].objective = "";
            saveSmartObjectives();
            renderSmartTable();
        });
    });

    body.querySelectorAll(".smart-status-select").forEach((select) => {
        select.addEventListener("change", (event) => {
            const index = Number(event.target.dataset.index);
            smartRows[index].status = event.target.value;
            saveSmartObjectives();
            renderSmartTable();
        });
    });

    body.querySelectorAll(".smart-responsable-select").forEach((select) => {
        select.addEventListener("change", (event) => {
            const index = Number(event.target.dataset.index);
            const stakeholderId = event.target.value;
            const stakeholder = stakeholders.find((person) => getStakeholderId(person) === stakeholderId);

            smartRows[index].responsableId = stakeholderId;
            smartRows[index].responsable = stakeholder ? getStakeholderLabel(stakeholder) : "";
            saveSmartObjectives();
        });
    });

    body.querySelectorAll(".smart-checkbox").forEach((checkbox) => {
        checkbox.addEventListener("change", (event) => {
            const index = Number(event.target.dataset.index);

            if (event.target.checked) {
                selectedSmartRows.add(index);
            } else {
                selectedSmartRows.delete(index);
            }

            renderSmartTable();
        });
    });
}

function getSmartObjectiveLabel(smart) {
    if (!smart) return "Objectif SMART sans nom";

    const linkedObjective = projectObjectives.find((objective) => objective.id === smart.objectiveId)
        || loadProjectObjectives().find((objective) => objective.id === smart.objectiveId);

    const title = linkedObjective?.title || smart.objective || "Objectif sans nom";
    const dueDate = smart.dueDate ? ` · ${smart.dueDate}` : "";

    return `${title}${dueDate}`;
}


/* V44 — Export / import avec rédactionnel détaillé */


// Sauvegarde réelle et complète : on exporte telles quelles toutes les clés
// forge_* présentes dans le localStorage (découvertes dynamiquement via
// getForgeLocalStorageKeys), plutôt qu'une liste de champs maintenue à la
// main qui finit toujours par oublier les nouvelles fonctionnalités
// (Découpage, périodes GANTT, dimensionnement VM, etc.). C'est le même
// contenu que ce que Forge synchronise vers SQLite, donc une vraie copie
// de travail utilisable hors de l'écosystème NAS/Docker.
function exportForgeData() {
    const data = {};

    getForgeLocalStorageKeys().forEach((key) => {
        data[key] = localStorage.getItem(key) ?? "";
    });

    const exportPayload = {
        app: "Forge",
        version: 9,
        exportedAt: new Date().toISOString(),
        data
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: "application/json"
    });

    const date = new Date().toISOString().slice(0, 10);
    const fileName = `forge-sauvegarde-${date}.json`;
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(downloadUrl);
}

function importForgeData(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = async () => {
        try {
            const payload = JSON.parse(reader.result);

            if (!payload || payload.app !== "Forge" || !payload.data || typeof payload.data !== "object") {
                alert("Le fichier sélectionné ne semble pas être une sauvegarde Forge valide.");
                return;
            }

            const confirmation = confirm("Importer cette sauvegarde va remplacer TOUTES les données Forge actuellement stockées (tous les projets, thème compris). Continuer ?");
            if (!confirmation) return;

            forgeDbBridgeHydrating = true;

            try {
                getForgeLocalStorageKeys().forEach((key) => localStorage.removeItem(key));

                Object.entries(payload.data).forEach(([key, value]) => {
                    if (isForgeStorageKey(key) && typeof value === "string") {
                        localStorage.setItem(key, value);
                    }
                });
            } finally {
                forgeDbBridgeHydrating = false;
            }

            if (forgeDbBridgeActive) {
                try {
                    await fetch("/api/storage", { method: "DELETE" });
                } catch (error) {
                    console.warn("Forge DB : purge backend impossible avant import.", error);
                }

                await syncAllForgeStorageToDb();
            }

            alert("Sauvegarde Forge importée avec succès.");
            location.reload();
        } catch (error) {
            console.error("Import impossible :", error);
            alert("Impossible d’importer ce fichier. Vérifie que c’est bien un fichier JSON Forge.");
        } finally {
            event.target.value = "";
        }
    };

    reader.readAsText(file);
}




if (typeof helpTexts !== "undefined") {
    helpTexts.context = `
        <p>Cette page conserve le cadrage général du projet.</p>
        <ul>
            <li>Le contexte reste volontairement court : résumé, origine et livrables attendus.</li>
            <li>Les sections détaillées sont séparées dans leurs propres onglets rédactionnels.</li>
            <li>Le bouton “Copier le contexte” permet de récupérer une version texte exploitable dans un dossier projet.</li>
        </ul>
    `;

    helpTexts.objectives = `
        <p>Cette page sert à lister les objectifs généraux du projet.</p>
        <ul>
            <li>Ajoute chaque objectif un par un avec sa description.</li>
            <li>Les objectifs créés ici sont automatiquement disponibles dans l’onglet SMART.</li>
            <li>Le SMART permet ensuite de détailler chaque objectif selon les critères Spécifique, Mesurable, Atteignable, Réaliste et Temporel.</li>
        </ul>
    `;

    helpTexts.stakes = `
        <p>Cette page sert à détailler les enjeux du projet.</p>
        <ul>
            <li>Ajoute un enjeu par ligne.</li>
            <li>Utilise la description pour expliquer pourquoi cet enjeu est important.</li>
        </ul>
    `;

    helpTexts.scope = `
        <p>Cette page sert à clarifier le périmètre du projet.</p>
        <ul>
            <li>Ajoute chaque élément de périmètre un par un.</li>
            <li>Le champ Type permet de distinguer Inclus, Hors périmètre et À clarifier.</li>
        </ul>
    `;

    helpTexts.constraints = `
        <p>Cette page sert à lister les contraintes du projet.</p>
        <ul>
            <li>Ajoute une contrainte par ligne : délai, budget, technique, sécurité, ressources, organisation, etc.</li>
            <li>La description permet d’expliquer l’impact de chaque contrainte.</li>
        </ul>
    `;

    helpTexts.assumptions = `
        <p>Cette page sert à formaliser les hypothèses de départ.</p>
        <ul>
            <li>Ajoute une hypothèse par ligne.</li>
            <li>Ces hypothèses pourront être vérifiées ou transformées en risques si elles deviennent incertaines.</li>
        </ul>
    `;

    helpTexts.success = `
        <p>Cette page sert à définir les critères de succès du projet.</p>
        <ul>
            <li>Ajoute chaque critère un par un.</li>
            <li>La description permet d’expliquer comment le critère sera observé ou validé.</li>
        </ul>
    `;

    helpTexts.smart = `
        <p>Cette page sert à transformer les objectifs généraux en objectifs SMART.</p>
        <ul>
            <li>Crée d’abord les objectifs dans l’onglet Objectifs.</li>
            <li>Chaque ligne SMART peut ensuite être liée à un objectif existant.</li>
            <li>Renseigne les colonnes Spécifique, Mesurable, Atteignable, Réaliste et Temporel.</li>
            <li>Les KPIs peuvent ensuite être rattachés aux lignes SMART.</li>
        </ul>
    `;
}

/* V44 — Démarrage unique */



/* V45 — Périmètre visuellement séparé */
const V45_SCOPE_TYPES = ["Inclus", "Hors périmètre", "À clarifier"];
const V45_SCOPE_BODY_IDS = {
    "Inclus": "scope-included-body",
    "Hors périmètre": "scope-excluded-body",
    "À clarifier": "scope-clarify-body"
};

let selectedScopeRows = {
    "Inclus": new Set(),
    "Hors périmètre": new Set(),
    "À clarifier": new Set()
};


function initScopePage() {
    redactionRows = loadRedactionRows("scope");
    normalizeScopeRows();
    resetScopeSelections();

    renderScopeBoard();

    document.querySelectorAll(".scope-add-btn").forEach((button) => {
        button.addEventListener("click", () => {
            const type = button.dataset.scopeType || "Inclus";

            redactionRows.push({
                id: createId(),
                title: "",
                description: "",
                type
            });

            saveRedactionRows("scope", redactionRows);
            renderScopeBoard();

            const lastCell = document.querySelector(`.scope-title-cell[data-type="${type}"]:last-of-type`);
            if (lastCell) lastCell.focus();
        });
    });

    document.querySelectorAll(".scope-delete-btn").forEach((button) => {
        button.addEventListener("click", () => {
            const type = button.dataset.scopeType;
            const selectedSet = selectedScopeRows[type];

            if (!selectedSet || selectedSet.size === 0) return;

            const confirmation = confirm(`Tu veux vraiment supprimer les éléments "${type}" cochés ?`);
            if (!confirmation) return;

            redactionRows = redactionRows.filter((_, index) => !selectedSet.has(index));
            selectedSet.clear();

            saveRedactionRows("scope", redactionRows);
            renderScopeBoard();
        });
    });

    document.getElementById("reset-scope-btn")?.addEventListener("click", () => {
        const confirmation = confirm("Tu veux vraiment réinitialiser tout le périmètre ?");
        if (!confirmation) return;

        redactionRows = [];
        resetScopeSelections();
        saveRedactionRows("scope", redactionRows);
        renderScopeBoard();
    });

    document.getElementById("scope-copy-btn")?.addEventListener("click", async () => {
        const text = buildScopePlainText();

        try {
            await navigator.clipboard.writeText(text);
            alert("Périmètre copié dans le presse-papiers.");
        } catch (error) {
            console.error("Copie impossible :", error);
            alert("Impossible de copier automatiquement. Tu peux sélectionner les lignes à la main.");
        }
    });
}

function normalizeScopeRows() {
    let changed = false;

    redactionRows = redactionRows.map((row) => {
        const type = V45_SCOPE_TYPES.includes(row.type) ? row.type : "Inclus";

        if (type !== row.type) changed = true;

        return {
            id: row.id || createId(),
            title: row.title || "",
            description: row.description || "",
            type
        };
    });

    if (changed) {
        saveRedactionRows("scope", redactionRows);
    }
}

function resetScopeSelections() {
    selectedScopeRows = {
        "Inclus": new Set(),
        "Hors périmètre": new Set(),
        "À clarifier": new Set()
    };
}

function renderScopeBoard() {
    V45_SCOPE_TYPES.forEach((type) => {
        renderScopeTypeTable(type);
        updateScopeDeleteButton(type);
    });
}

function renderScopeTypeTable(type) {
    const body = document.getElementById(V45_SCOPE_BODY_IDS[type]);

    if (!body) return;

    const rowsForType = redactionRows
        .map((row, globalIndex) => ({ row, globalIndex }))
        .filter((item) => item.row.type === type);

    body.innerHTML = "";

    if (rowsForType.length === 0) {
        body.innerHTML = `<tr><td colspan="4" class="empty-state">Aucun élément pour le moment.</td></tr>`;
        return;
    }

    rowsForType.forEach((item, localIndex) => {
        const tableRow = document.createElement("tr");
        const isSelected = selectedScopeRows[type]?.has(item.globalIndex);

        if (isSelected) tableRow.classList.add("selected-row");

        tableRow.innerHTML = `
            <td class="select-col">
                <input class="row-checkbox scope-checkbox" type="checkbox" data-index="${item.globalIndex}" data-type="${escapeHtml(type)}" aria-label="Sélectionner l'élément ${localIndex + 1}" ${isSelected ? "checked" : ""} />
            </td>
            <td>${localIndex + 1}</td>
            <td class="editable scope-title-cell" contenteditable="true" data-index="${item.globalIndex}" data-type="${escapeHtml(type)}" data-field="title" spellcheck="true">${escapeHtml(item.row.title)}</td>
            <td class="editable scope-description-cell" contenteditable="true" data-index="${item.globalIndex}" data-type="${escapeHtml(type)}" data-field="description" spellcheck="true">${escapeHtml(item.row.description)}</td>
        `;

        body.appendChild(tableRow);
    });

    bindScopeTableEvents(body);
}

function bindScopeTableEvents(body) {
    body.querySelectorAll(".editable").forEach((cell) => {
        cell.addEventListener("input", (event) => {
            const index = Number(event.target.dataset.index);
            const field = event.target.dataset.field;

            if (!redactionRows[index]) return;

            redactionRows[index][field] = event.target.textContent.trim();
            saveRedactionRows("scope", redactionRows);
        });
    });

    body.querySelectorAll(".scope-checkbox").forEach((checkbox) => {
        checkbox.addEventListener("change", (event) => {
            const type = event.target.dataset.type;
            const index = Number(event.target.dataset.index);

            if (!selectedScopeRows[type]) selectedScopeRows[type] = new Set();

            if (event.target.checked) {
                selectedScopeRows[type].add(index);
            } else {
                selectedScopeRows[type].delete(index);
            }

            renderScopeBoard();
        });
    });
}

function updateScopeDeleteButton(type) {
    const button = document.querySelector(`.scope-delete-btn[data-scope-type="${type}"]`);

    if (!button) return;

    button.disabled = !selectedScopeRows[type] || selectedScopeRows[type].size === 0;
}

function buildScopePlainText() {
    const project = getActiveProject();
    const lines = [
        `Périmètre du projet — ${project?.name || "Projet sans nom"}`,
        ""
    ];

    V45_SCOPE_TYPES.forEach((type) => {
        const rows = redactionRows.filter((row) => row.type === type);

        lines.push(type);
        if (rows.length === 0) {
            lines.push("—");
        } else {
            rows.forEach((row, index) => {
                lines.push(`${index + 1}. ${row.title || "Sans titre"}`);
                if (row.description) {
                    lines.push(`   ${row.description}`);
                }
            });
        }
        lines.push("");
    });

    return lines.join("\n").trim();
}

if (typeof helpTexts !== "undefined") {
    helpTexts.scope = `
        <p>Cette page sert à clarifier le périmètre du projet.</p>
        <ul>
            <li><strong>Inclus</strong> : ce qui fait explicitement partie du projet.</li>
            <li><strong>Hors périmètre</strong> : ce qui est explicitement exclu.</li>
            <li><strong>À clarifier</strong> : ce qui doit encore être arbitré.</li>
            <li>Chaque bloc possède son propre bouton d’ajout et sa propre suppression.</li>
        </ul>
    `;
}

/* V45 — Démarrage unique */



/* V47 — Tableau de bord global + contrôles de cohérence */

function initDashboardPage() {
    renderDashboard();
}

function renderDashboard() {
    const data = collectDashboardData();
    const checks = buildCoherenceChecks(data);
    const stats = buildDashboardStats(data, checks);

    renderDashboardHero(data, stats);
    renderDashboardKpis(stats);
    renderCoherencePanel(checks, stats);
    renderDashboardProgress(data, stats);
    renderDashboardRisksKpis(data, stats);
    renderDashboardCoverage(data, stats);
}

function collectDashboardData() {
    const context = safeDashboardCall(() => loadProjectContext(), {});
    const objectives = safeDashboardCall(() => loadRedactionRows("objectives"), []);
    const stakes = safeDashboardCall(() => loadRedactionRows("stakes"), []);
    const scope = safeDashboardCall(() => loadRedactionRows("scope"), []);
    const constraints = safeDashboardCall(() => loadRedactionRows("constraints"), []);
    const assumptions = safeDashboardCall(() => loadRedactionRows("assumptions"), []);
    const successCriteria = safeDashboardCall(() => loadRedactionRows("success_criteria"), []);
    const stakeholdersData = safeDashboardCall(() => loadStakeholders(), []);
    const competenceCategoriesData = safeDashboardCall(() => loadCompetenceCategories(), []);
    const competenceMatricesData = safeDashboardCall(() => loadCompetenceMatrices(), {});
    const swotData = safeDashboardCall(() => loadSwot(), { strengths: [], weaknesses: [], opportunities: [], threats: [] });
    const riskTypesData = safeDashboardCall(() => loadRiskTypes(), []);
    const risksData = safeDashboardCall(() => loadRisks(), []);
    const wbsRowsData = safeDashboardCall(() => loadWbsRows(), []);
    const phasesData = safeDashboardCall(() => loadPhases(), []);
    const smartData = safeDashboardCall(() => loadSmartObjectives(), []);
    const kpisData = safeDashboardCall(() => loadKpis(), []);
    const kpiTypesData = safeDashboardCall(() => loadKpiTypes(), []);
    const project = safeDashboardCall(() => getActiveProject(), null);

    return {
        project,
        context,
        objectives,
        stakes,
        scope,
        constraints,
        assumptions,
        successCriteria,
        stakeholders: stakeholdersData,
        competenceCategories: competenceCategoriesData,
        competenceMatrices: competenceMatricesData,
        swot: swotData,
        riskTypes: riskTypesData,
        risks: risksData,
        wbsRows: wbsRowsData,
        phases: phasesData,
        smart: smartData,
        kpis: kpisData,
        kpiTypes: kpiTypesData
    };
}

function safeDashboardCall(callback, fallbackValue) {
    try {
        const value = callback();
        return value ?? fallbackValue;
    } catch (error) {
        console.warn("Dashboard : donnée indisponible", error);
        return fallbackValue;
    }
}

function buildDashboardStats(data, checks) {
    const criticalRisks = data.risks.filter((risk) => getDashboardRiskScore(risk) > 15);
    const highRisks = data.risks.filter((risk) => {
        const score = getDashboardRiskScore(risk);
        return score > 9 && score <= 15;
    });

    const wbsProgressValues = data.wbsRows
        .map((row) => parseNumber(row.avancement))
        .filter((value) => Number.isFinite(value));

    const averageWbsProgress = wbsProgressValues.length
        ? Math.round(wbsProgressValues.reduce((sum, value) => sum + value, 0) / wbsProgressValues.length)
        : 0;

    const kpisWithStatus = data.kpis.filter((kpi) => (kpi.status || "").trim());
    const kpisIncomplete = data.kpis.filter((kpi) => isDashboardKpiIncomplete(kpi));

    const redactionSections = [
        data.context.summary,
        data.context.origin,
        data.context.deliverables,
        data.objectives.length,
        data.stakes.length,
        data.scope.length,
        data.constraints.length,
        data.assumptions.length,
        data.successCriteria.length
    ];

    const filledRedactionSections = redactionSections.filter((item) => {
        if (typeof item === "number") return item > 0;
        return String(item || "").trim().length > 0;
    }).length;

    const dossierCoverage = Math.round((filledRedactionSections / redactionSections.length) * 100);

    const errors = checks.filter((item) => item.severity === "error").length;
    const warnings = checks.filter((item) => item.severity === "warning").length;
    const infos = checks.filter((item) => item.severity === "info").length;

    const healthScore = Math.max(0, 100 - errors * 12 - warnings * 5 - infos * 2);

    return {
        objectives: data.objectives.length,
        stakeholders: data.stakeholders.length,
        wbsTasks: data.wbsRows.length,
        averageWbsProgress,
        risks: data.risks.length,
        criticalRisks: criticalRisks.length,
        highRisks: highRisks.length,
        kpis: data.kpis.length,
        kpisWithStatus: kpisWithStatus.length,
        kpisIncomplete: kpisIncomplete.length,
        smartRows: data.smart.length,
        checks: checks.length,
        errors,
        warnings,
        infos,
        healthScore,
        dossierCoverage
    };
}

function buildCoherenceChecks(data) {
    const checks = [];

    addContextChecks(checks, data);
    addRedactionChecks(checks, data);
    addObjectiveSmartChecks(checks, data);
    addStakeholderChecks(checks, data);
    addWbsChecks(checks, data);
    addRiskChecks(checks, data);
    addKpiChecks(checks, data);
    addCompetenceChecks(checks, data);

    if (checks.length === 0) {
        checks.push({
            severity: "info",
            title: "Aucune incohérence détectée",
            text: "Le projet ne présente pas de point bloquant évident. Beau boulot frère."
        });
    }

    return checks;
}

function addContextChecks(checks, data) {
    if (!String(data.context.summary || "").trim()) {
        checks.push({
            severity: "warning",
            title: "Contexte incomplet",
            text: "Le résumé exécutif du projet n’est pas renseigné."
        });
    }

    if (!String(data.context.origin || "").trim()) {
        checks.push({
            severity: "info",
            title: "Origine non précisée",
            text: "L’origine ou le déclencheur du projet n’est pas renseigné."
        });
    }

    if (!String(data.context.deliverables || "").trim()) {
        checks.push({
            severity: "warning",
            title: "Livrables non précisés",
            text: "Les livrables attendus ne sont pas renseignés dans le contexte."
        });
    }
}

function addRedactionChecks(checks, data) {
    if (data.objectives.length === 0) {
        checks.push({
            severity: "error",
            title: "Aucun objectif projet",
            text: "Ajoute au moins un objectif dans l’onglet Objectifs pour cadrer le projet."
        });
    }

    const objectivesWithoutDescription = data.objectives.filter((row) => !String(row.description || "").trim()).length;
    if (objectivesWithoutDescription > 0) {
        checks.push({
            severity: "warning",
            title: "Objectifs peu détaillés",
            text: `${objectivesWithoutDescription} objectif(s) n’ont pas encore de description.`
        });
    }

    if (data.stakes.length === 0) {
        checks.push({
            severity: "info",
            title: "Enjeux absents",
            text: "Aucun enjeu n’est renseigné pour le moment."
        });
    }

    const scopeIncluded = data.scope.filter((row) => row.type === "Inclus").length;
    const scopeExcluded = data.scope.filter((row) => row.type === "Hors périmètre").length;
    if (scopeIncluded === 0) {
        checks.push({
            severity: "warning",
            title: "Périmètre inclus vide",
            text: "Aucun élément inclus n’est défini dans le périmètre."
        });
    }
    if (scopeExcluded === 0) {
        checks.push({
            severity: "info",
            title: "Hors périmètre non défini",
            text: "Aucun élément hors périmètre n’a été explicitement listé."
        });
    }

    if (data.successCriteria.length === 0) {
        checks.push({
            severity: "warning",
            title: "Critères de succès absents",
            text: "Ajoute des critères de succès pour savoir comment valider la réussite du projet."
        });
    }
}

function addObjectiveSmartChecks(checks, data) {
    const linkedSmartObjectiveIds = new Set(data.smart.map((row) => row.objectiveId).filter(Boolean));
    const objectivesWithoutSmart = data.objectives.filter((objective) => !linkedSmartObjectiveIds.has(objective.id)).length;

    if (data.objectives.length > 0 && objectivesWithoutSmart > 0) {
        checks.push({
            severity: "warning",
            title: "Objectifs non transformés en SMART",
            text: `${objectivesWithoutSmart} objectif(s) projet n’ont pas encore de ligne SMART liée.`
        });
    }

    const smartWithoutObjective = data.smart.filter((row) => !row.objectiveId && !String(row.objective || "").trim()).length;
    if (smartWithoutObjective > 0) {
        checks.push({
            severity: "error",
            title: "SMART sans objectif lié",
            text: `${smartWithoutObjective} ligne(s) SMART ne sont reliées à aucun objectif.`
        });
    }

    const smartIncomplete = data.smart.filter((row) => {
        return !String(row.specific || "").trim()
            || !String(row.measurable || "").trim()
            || !String(row.achievable || "").trim()
            || !String(row.realistic || "").trim()
            || !String(row.timebound || "").trim();
    }).length;

    if (smartIncomplete > 0) {
        checks.push({
            severity: "warning",
            title: "SMART incomplets",
            text: `${smartIncomplete} ligne(s) SMART n’ont pas toutes les dimensions renseignées.`
        });
    }
}

function addStakeholderChecks(checks, data) {
    if (data.stakeholders.length === 0) {
        checks.push({
            severity: "error",
            title: "Aucune partie prenante",
            text: "Ajoute les parties prenantes pour alimenter les responsables, RACI et matrices de compétences."
        });
        return;
    }

    const incompleteStakeholders = data.stakeholders.filter((person) => {
        return !String(person.nom || "").trim()
            || !String(person.role || "").trim()
            || !String(person.description || "").trim();
    }).length;

    if (incompleteStakeholders > 0) {
        checks.push({
            severity: "warning",
            title: "Parties prenantes incomplètes",
            text: `${incompleteStakeholders} partie(s) prenante(s) ont des informations clés manquantes.`
        });
    }
}

function addWbsChecks(checks, data) {
    if (data.wbsRows.length === 0) {
        checks.push({
            severity: "warning",
            title: "WBS vide",
            text: "Aucune tâche ou livrable WBS n’est renseigné."
        });
        return;
    }

    const withoutResponsible = data.wbsRows.filter((row) => !String(row.responsable || "").trim()).length;
    const withoutDuration = data.wbsRows.filter((row) => !parseNumber(row.duree)).length;
    const withoutTask = data.wbsRows.filter((row) => !String(row.task || "").trim()).length;

    if (withoutTask > 0) {
        checks.push({
            severity: "error",
            title: "Tâches WBS sans libellé",
            text: `${withoutTask} ligne(s) WBS n’ont pas de tâche ou livrable renseigné.`
        });
    }

    if (withoutResponsible > 0) {
        checks.push({
            severity: "warning",
            title: "Tâches WBS sans responsable",
            text: `${withoutResponsible} tâche(s) WBS n’ont pas de responsable.`
        });
    }

    if (withoutDuration > 0) {
        checks.push({
            severity: "warning",
            title: "Durées WBS manquantes",
            text: `${withoutDuration} tâche(s) WBS n’ont pas de durée valide.`
        });
    }
}

function addRiskChecks(checks, data) {
    if (data.risks.length === 0) {
        checks.push({
            severity: "info",
            title: "Aucun risque identifié",
            text: "Aucun risque n’est renseigné dans l’analyse des risques."
        });
        return;
    }

    const criticalWithoutMitigation = data.risks.filter((risk) => {
        return getDashboardRiskScore(risk) > 15 && !String(risk.mitigation || "").trim();
    }).length;

    const risksWithoutResponsible = data.risks.filter((risk) => !String(risk.responsable || "").trim()).length;
    const risksWithoutResponse = data.risks.filter((risk) => !String(risk.response || "").trim() || risk.response === "À définir").length;

    if (criticalWithoutMitigation > 0) {
        checks.push({
            severity: "error",
            title: "Risques critiques sans mitigation",
            text: `${criticalWithoutMitigation} risque(s) critique(s) n’ont pas de plan de mitigation.`
        });
    }

    if (risksWithoutResponsible > 0) {
        checks.push({
            severity: "warning",
            title: "Risques sans responsable",
            text: `${risksWithoutResponsible} risque(s) n’ont pas de responsable.`
        });
    }

    if (risksWithoutResponse > 0) {
        checks.push({
            severity: "warning",
            title: "Réponses aux risques à définir",
            text: `${risksWithoutResponse} risque(s) ont encore une réponse non définie.`
        });
    }
}

function addKpiChecks(checks, data) {
    if (data.kpis.length === 0) {
        checks.push({
            severity: "warning",
            title: "Aucun KPI",
            text: "Aucun indicateur KPI n’est renseigné pour suivre le projet."
        });
        return;
    }

    const withoutSmart = data.kpis.filter((kpi) => !kpi.smartId).length;
    const incomplete = data.kpis.filter((kpi) => isDashboardKpiIncomplete(kpi)).length;

    if (withoutSmart > 0) {
        checks.push({
            severity: "error",
            title: "KPIs sans objectif SMART",
            text: `${withoutSmart} KPI(s) ne sont rattachés à aucun objectif SMART.`
        });
    }

    if (incomplete > 0) {
        checks.push({
            severity: "warning",
            title: "KPIs incomplets",
            text: `${incomplete} KPI(s) ont des champs de suivi manquants.`
        });
    }
}

function addCompetenceChecks(checks, data) {
    if (data.stakeholders.length === 0) return;

    const allSkills = Object.values(data.competenceMatrices || {}).flatMap((items) => Array.isArray(items) ? items : []);

    if (allSkills.length === 0) {
        checks.push({
            severity: "info",
            title: "Matrice de compétences vide",
            text: "Aucune compétence n’est encore renseignée dans les matrices de compétences."
        });
        return;
    }

    const skillsWithoutLevels = allSkills.filter((skill) => {
        const levels = skill.levels || {};
        return !Object.values(levels).some((value) => String(value || "").trim() !== "");
    }).length;

    if (skillsWithoutLevels > 0) {
        checks.push({
            severity: "info",
            title: "Compétences sans niveau",
            text: `${skillsWithoutLevels} compétence(s) n’ont aucun niveau renseigné pour les parties prenantes.`
        });
    }
}




function renderDashboardProgress(data, stats) {
    const zone = document.getElementById("dashboard-progress-zone");
    if (!zone) return;

    zone.innerHTML = `
        <div class="dashboard-mini-list">
            ${createDashboardMiniRow("Tâches WBS", data.wbsRows.length)}
            ${createDashboardMiniRow("Phases", data.phases.length)}
            ${createDashboardMiniRow("Avancement moyen", `${stats.averageWbsProgress}%`)}
            <div class="dashboard-progress-bar" aria-label="Avancement WBS">
                <div class="dashboard-progress-fill" style="width: ${Math.min(100, Math.max(0, stats.averageWbsProgress))}%"></div>
            </div>
            ${createDashboardMiniRow("Parties prenantes", data.stakeholders.length)}
            ${createDashboardMiniRow("Objectifs SMART", data.smart.length)}
        </div>
    `;
}

function renderDashboardRisksKpis(data, stats) {
    const zone = document.getElementById("dashboard-risk-kpi-zone");
    if (!zone) return;

    zone.innerHTML = `
        <div class="dashboard-mini-list">
            ${createDashboardMiniRow("Risques total", data.risks.length)}
            ${createDashboardMiniRow("Risques élevés", stats.highRisks)}
            ${createDashboardMiniRow("Risques critiques", stats.criticalRisks)}
            ${createDashboardMiniRow("KPIs total", data.kpis.length)}
            ${createDashboardMiniRow("KPIs avec statut", stats.kpisWithStatus)}
            ${createDashboardMiniRow("KPIs incomplets", stats.kpisIncomplete)}
        </div>
    `;
}

function renderDashboardCoverage(data, stats) {
    const zone = document.getElementById("dashboard-coverage-zone");
    if (!zone) return;

    zone.innerHTML = `
        <div class="dashboard-mini-list">
            ${createDashboardMiniRow("Couverture dossier", `${stats.dossierCoverage}%`)}
            <div class="dashboard-progress-bar" aria-label="Couverture du dossier projet">
                <div class="dashboard-progress-fill" style="width: ${Math.min(100, Math.max(0, stats.dossierCoverage))}%"></div>
            </div>
            ${createDashboardMiniRow("Objectifs", data.objectives.length)}
            ${createDashboardMiniRow("Enjeux", data.stakes.length)}
            ${createDashboardMiniRow("Périmètre", data.scope.length)}
            ${createDashboardMiniRow("Contraintes", data.constraints.length)}
            ${createDashboardMiniRow("Hypothèses", data.assumptions.length)}
            ${createDashboardMiniRow("Critères succès", data.successCriteria.length)}
        </div>
    `;
}

function createDashboardMiniRow(label, value) {
    return `
        <div class="dashboard-mini-row">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(String(value))}</strong>
        </div>
    `;
}

function getDashboardRiskScore(risk) {
    const probability = Number(risk.probability || 0);
    const severity = Number(risk.severity || 0);
    return probability * severity;
}

function isDashboardKpiIncomplete(kpi) {
    return !String(kpi.name || "").trim()
        || !String(kpi.target || "").trim()
        || !String(kpi.current || "").trim()
        || !String(kpi.status || "").trim()
        || (!String(kpi.responsable || "").trim() && !String(kpi.responsableId || "").trim());
}

function parseNumber(value) {
    if (value === null || value === undefined || value === "") return 0;
    const parsed = Number(String(value).replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
}

if (typeof helpTexts !== "undefined") {
    helpTexts.dashboard = `
        <p>Cette page donne une vue globale du projet.</p>
        <ul>
            <li>Elle résume les données principales du projet.</li>
            <li>Elle affiche les contrôles de cohérence : éléments manquants, liens non faits, risques et KPIs à compléter.</li>
            <li>Elle aide à repérer rapidement ce qui bloque ou ce qui reste à renseigner.</li>
        </ul>
    `;
}

/* V47 — Démarrage unique */



/* V48 — Thèmes : Cyber / Clair / Orange dusk */

function loadForgeTheme() {
    return normalizeForgeTheme(localStorage.getItem(FORGE_THEME_STORAGE_KEY) || "cyber");
}

function saveForgeTheme(theme) {
    localStorage.setItem(FORGE_THEME_STORAGE_KEY, normalizeForgeTheme(theme));
}

function applyForgeTheme(theme) {
    document.body.dataset.theme = normalizeForgeTheme(theme);
}


if (typeof helpTexts !== "undefined") {
    helpTexts.dashboard = `
        <p>Cette page donne une vue globale du projet.</p>
        <ul>
            <li>Elle résume les données principales du projet.</li>
            <li>Elle affiche les contrôles de cohérence : éléments manquants, liens non faits, risques et KPIs à compléter.</li>
            <li>Le thème Orange dusk est disponible dans le sélecteur de thème.</li>
        </ul>
    `;
}

/* V48 — Démarrage unique */



/* V49 — Dashboard visuel + dates projet dans WBS */
function renderDashboardHero(data, stats) {
    const title = document.getElementById("dashboard-project-title");
    const dates = document.getElementById("dashboard-project-dates");
    const badge = document.getElementById("dashboard-health-badge");

    if (title) {
        title.textContent = data.project?.name || "Projet sans nom";
    }

    if (dates) {
        const start = data.project?.startDate || "à renseigner dans le WBS";
        const end = data.project?.endDate || "à renseigner dans le WBS";
        dates.textContent = `Planning projet : ${start} → ${end}`;
    }

    if (badge) {
        badge.classList.remove("dashboard-health-ok", "dashboard-health-watch", "dashboard-health-alert");

        if (stats.errors > 0) {
            badge.textContent = "À corriger";
            badge.classList.add("dashboard-health-alert");
        } else if (stats.warnings > 0) {
            badge.textContent = "À surveiller";
            badge.classList.add("dashboard-health-watch");
        } else {
            badge.textContent = "Cohérent";
            badge.classList.add("dashboard-health-ok");
        }
    }
}

function renderDashboardKpis(stats) {
    const grid = document.getElementById("dashboard-kpi-grid");
    if (!grid) return;

    const kpiCompletion = stats.kpis > 0
        ? Math.round(((stats.kpis - stats.kpisIncomplete) / stats.kpis) * 100)
        : 0;

    const rings = [
        {
            className: "dashboard-ring-health",
            value: stats.healthScore,
            display: `${stats.healthScore}%`,
            title: "Santé projet",
            text: `${stats.errors} bloquant(s), ${stats.warnings} alerte(s), ${stats.infos} info(s).`
        },
        {
            className: "dashboard-ring-coverage",
            value: stats.dossierCoverage,
            display: `${stats.dossierCoverage}%`,
            title: "Dossier projet",
            text: "Couverture du rédactionnel et des sections de cadrage."
        },
        {
            className: "dashboard-ring-progress",
            value: stats.averageWbsProgress,
            display: `${stats.averageWbsProgress}%`,
            title: "Avancement WBS",
            text: `${stats.wbsTasks} tâche(s) suivie(s) dans le planning.`
        },
        {
            className: "dashboard-ring-kpi",
            value: kpiCompletion,
            display: `${kpiCompletion}%`,
            title: "KPIs complets",
            text: `${stats.kpisIncomplete} KPI(s) encore incomplet(s) sur ${stats.kpis}.`
        }
    ];

    const cards = [
        ["Contrôles", stats.checks, "points détectés"],
        ["Objectifs", stats.objectives, `${stats.smartRows} ligne(s) SMART`],
        ["Parties prenantes", stats.stakeholders, "acteurs projet"],
        ["Risques critiques", stats.criticalRisks, `${stats.risks} risque(s) au total`],
        ["Risques élevés", stats.highRisks, "à surveiller"],
        ["KPIs", stats.kpis, `${stats.kpisWithStatus} avec statut`]
    ];

    grid.innerHTML = `
        <section class="dashboard-rings-grid" aria-label="Jauges du projet">
            ${rings.map((ring) => createDashboardRingCard(ring)).join("")}
        </section>

        <section class="dashboard-stat-strip" aria-label="Statistiques rapides">
            ${cards.map(([label, value, note]) => `
                <article class="dashboard-stat-card">
                    <p class="dashboard-stat-label">${escapeHtml(label)}</p>
                    <p class="dashboard-stat-value">${escapeHtml(String(value))}</p>
                    <p class="dashboard-stat-note">${escapeHtml(note)}</p>
                </article>
            `).join("")}
        </section>
    `;
}

function createDashboardRingCard(ring) {
    const value = Math.min(100, Math.max(0, Number(ring.value) || 0));

    return `
        <article class="dashboard-ring-card">
            <div class="dashboard-ring ${escapeHtml(ring.className)}" style="--ring-value: ${value}%">
                <span class="dashboard-ring-value">${escapeHtml(ring.display)}</span>
            </div>
            <div class="dashboard-ring-content">
                <h3>${escapeHtml(ring.title)}</h3>
                <p>${escapeHtml(ring.text)}</p>
            </div>
        </article>
    `;
}

function renderCoherencePanel(checks, stats) {
    const summary = document.getElementById("coherence-summary");
    const list = document.getElementById("coherence-list");

    if (summary) {
        summary.innerHTML = `
            <div class="coherence-pill"><span>Santé</span><strong>${stats.healthScore}%</strong></div>
            <div class="coherence-pill"><span>Bloquants</span><strong>${stats.errors}</strong></div>
            <div class="coherence-pill"><span>Alertes</span><strong>${stats.warnings}</strong></div>
            <div class="coherence-pill"><span>Infos</span><strong>${stats.infos}</strong></div>
        `;
    }

    if (list) {
        list.innerHTML = checks.map((check) => `
            <article class="coherence-item coherence-severity-${escapeHtml(check.severity)}">
                <p class="coherence-item-title">${getCoherenceIcon(check.severity)} ${escapeHtml(check.title)}</p>
                <p class="coherence-item-text">${escapeHtml(check.text)}</p>
            </article>
        `).join("");
    }
}

function getCoherenceIcon(severity) {
    if (severity === "error") return "●";
    if (severity === "warning") return "▲";
    return "◆";
}

if (typeof helpTexts !== "undefined") {
    helpTexts.dashboard = `
        <p>Cette page donne une vue globale et visuelle du projet.</p>
        <ul>
            <li>Les jauges circulaires résument la santé projet, la couverture du dossier, l’avancement WBS et la complétude des KPIs.</li>
            <li>Le panneau de cohérence liste les éléments à corriger ou compléter.</li>
            <li>Les dates projet sont désormais à renseigner depuis l’onglet WBS.</li>
        </ul>
    `;

    helpTexts.wbs = `
        <p>Cette page permet de structurer le planning du projet.</p>
        <ul>
            <li>Les dates de début et de fin du projet sont maintenant centralisées ici.</li>
            <li>Crée les phases, puis ajoute les tâches ou livrables WBS.</li>
            <li>Les dates calculées alimentent ensuite la vue GANTT.</li>
        </ul>
    `;
}

/* V49 — Démarrage unique */



/* V52 — Capture propre des blocs/cartes */

function initCaptureButtons() {
    addCaptureButtonsToCards();

    if (window.forgeCaptureObserver) {
        window.forgeCaptureObserver.disconnect();
    }

    window.forgeCaptureObserver = new MutationObserver(() => {
        window.clearTimeout(window.forgeCaptureObserverTimer);
        window.forgeCaptureObserverTimer = window.setTimeout(addCaptureButtonsToCards, 80);
    });

    const main = document.querySelector("main");
    if (main) {
        window.forgeCaptureObserver.observe(main, {
            childList: true,
            subtree: true
        });
    }
}



async function renderElementToPngBlob(sourceElement) {
    const stage = document.createElement("div");
    stage.className = "capture-stage no-capture";
    document.body.appendChild(stage);

    const clone = sourceElement.cloneNode(true);
    clone.classList.add("capture-render-root");
    clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");

    syncCaptureFormValues(sourceElement, clone);
    cleanCaptureClone(clone);

    const sourceRect = sourceElement.getBoundingClientRect();
    const targetWidth = Math.ceil(Math.max(sourceElement.scrollWidth, sourceRect.width, 320));
    const targetHeight = Math.ceil(Math.max(sourceElement.scrollHeight, sourceRect.height, 160));

    clone.style.width = `${targetWidth}px`;
    clone.style.maxWidth = `${targetWidth}px`;
    clone.style.minHeight = `${targetHeight}px`;

    stage.appendChild(clone);

    await waitForCaptureLayout();

    const width = Math.ceil(Math.max(clone.scrollWidth, clone.getBoundingClientRect().width, targetWidth));
    const height = Math.ceil(Math.max(clone.scrollHeight, clone.getBoundingClientRect().height, targetHeight));
    const scale = width * height > 3500000 ? 1 : 2;

    inlineComputedStylesForCapture(clone);

    const serialized = new XMLSerializer().serializeToString(clone);
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width * scale}" height="${height * scale}" viewBox="0 0 ${width} ${height}">
            <foreignObject width="100%" height="100%">
                ${serialized}
            </foreignObject>
        </svg>
    `;

    const svgBlob = new Blob([svg], {
        type: "image/svg+xml;charset=utf-8"
    });

    const url = URL.createObjectURL(svgBlob);

    try {
        const image = await loadCaptureImage(url);
        const canvas = document.createElement("canvas");
        canvas.width = width * scale;
        canvas.height = height * scale;

        const ctx = canvas.getContext("2d");
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--card") || "#0f172a";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(image, 0, 0, width, height);

        return await canvasToPngBlob(canvas);
    } finally {
        URL.revokeObjectURL(url);
        stage.remove();
    }
}

function syncCaptureFormValues(sourceElement, cloneElement) {
    const sourceControls = Array.from(sourceElement.querySelectorAll("input, select, textarea"));
    const cloneControls = Array.from(cloneElement.querySelectorAll("input, select, textarea"));

    cloneControls.forEach((control, index) => {
        const original = sourceControls[index];
        if (!original) return;

        const tag = control.tagName.toLowerCase();

        if (tag === "select") {
            const selectedText = original.selectedOptions?.[0]?.textContent || original.value || "";
            const span = document.createElement("span");
            span.className = "capture-form-value";
            span.textContent = selectedText.trim();
            control.replaceWith(span);
            return;
        }

        if (tag === "textarea") {
            const div = document.createElement("div");
            div.className = "capture-textarea-value";
            div.textContent = original.value || "";
            control.replaceWith(div);
            return;
        }

        if (tag === "input") {
            const type = (original.type || "").toLowerCase();

            if (type === "checkbox" || type === "radio") {
                control.remove();
                return;
            }

            const span = document.createElement("span");
            span.className = "capture-form-value";
            span.textContent = original.value || "";
            control.replaceWith(span);
        }
    });
}

function cleanCaptureClone(clone) {
    clone.querySelectorAll(".no-capture, .capture-card-btn, button, .table-actions, .swot-actions, .color-menu, .modal-overlay").forEach((element) => {
        element.remove();
    });

    clone.querySelectorAll("input[type='checkbox'], input[type='radio'], .row-checkbox").forEach((element) => {
        element.remove();
    });

    clone.querySelectorAll("th.select-col, td.select-col, col.phase-col-select, col[class*='select'], .select-col").forEach((element) => {
        element.remove();
    });

    clone.querySelectorAll(".wbs-move-header, .wbs-move-cell, col.wbs-col-move").forEach((element) => {
        element.remove();
    });

    clone.querySelectorAll(".selected-row").forEach((element) => {
        element.classList.remove("selected-row");
    });

    clone.querySelectorAll("[contenteditable]").forEach((element) => {
        element.removeAttribute("contenteditable");
    });

    clone.querySelectorAll(".left-actions, .right-actions, .scope-column-actions, .competence-matrix-actions").forEach((element) => {
        if (!element.textContent.trim() && element.children.length === 0) {
            element.remove();
        }
    });

    // Une colonne entière (col + cellules) vient peut-être d'être retirée
    // au-dessus (checkbox, flèches WBS...). Les cellules qui couvrent toute
    // la largeur du tableau (ligne de séparation de phase, état vide...)
    // doivent recalculer leur colspan pour matcher le nombre de colonnes
    // restantes, sinon le tableau se décale.
    clone.querySelectorAll("table").forEach((table) => {
        const columnCount = table.querySelectorAll(":scope > colgroup > col").length
            || table.querySelector("thead tr")?.children.length
            || 0;

        if (!columnCount) return;

        table.querySelectorAll("tr").forEach((row) => {
            if (row.children.length === 1 && row.children[0].hasAttribute("colspan")) {
                row.children[0].setAttribute("colspan", String(columnCount));
            }
        });
    });

    clone.querySelectorAll("*").forEach((element) => {
        element.removeAttribute("id");
        element.removeAttribute("aria-label");
        element.removeAttribute("tabindex");
        element.removeAttribute("data-capture-ready");
    });
}

function inlineComputedStylesForCapture(root) {
    const properties = [
        "box-sizing", "display", "position", "grid-template-columns", "grid-template-rows", "grid-column", "grid-row",
        "flex-direction", "align-items", "justify-content", "gap", "row-gap", "column-gap",
        "width", "min-width", "max-width", "height", "min-height", "max-height",
        "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
        "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
        "border", "border-top", "border-right", "border-bottom", "border-left", "border-radius",
        "background", "background-color", "background-image", "background-size", "background-position",
        "color", "font", "font-family", "font-size", "font-weight", "font-style", "line-height",
        "letter-spacing", "text-align", "text-transform", "text-decoration",
        "white-space", "overflow-wrap", "word-break", "vertical-align",
        "box-shadow", "text-shadow", "opacity", "overflow", "table-layout", "border-collapse", "border-spacing"
    ];

    [root, ...Array.from(root.querySelectorAll("*"))].forEach((element) => {
        const computed = getComputedStyle(element);

        properties.forEach((property) => {
            const value = computed.getPropertyValue(property);
            if (value) {
                element.style.setProperty(property, value);
            }
        });

        element.style.transform = "none";
        element.style.animation = "none";
        element.style.transition = "none";
    });
}

function waitForCaptureLayout() {
    return new Promise((resolve) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(async () => {
                if (document.fonts?.ready) {
                    try {
                        await document.fonts.ready;
                    } catch (error) {
                        console.warn("Fonts ready indisponible :", error);
                    }
                }

                resolve();
            });
        });
    });
}

function loadCaptureImage(url) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Image SVG non chargeable"));
        image.src = url;
    });
}

function canvasToPngBlob(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error("Création PNG impossible"));
            }
        }, "image/png", 0.96);
    });
}


function getCaptureFileName(card) {
    const project = getActiveProject();
    const cardTitle = card.querySelector(".card-header h2")?.textContent || "capture";
    const projectName = project?.name || "forge";
    const clean = `${projectName}-${cardTitle}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9-_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase();

    return `${clean || "forge-capture"}.png`;
}

function showCaptureToast(message) {
    let toast = document.getElementById("capture-toast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "capture-toast";
        toast.className = "capture-toast no-capture";
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("visible");

    window.clearTimeout(window.captureToastTimer);
    window.captureToastTimer = window.setTimeout(() => {
        toast.classList.remove("visible");
    }, 2800);
}

/* V52 — Démarrage unique */



/* V53 — Capture robuste via canvas manuel */


async function renderCardToCanvasPngBlob(card) {
    const palette = getCapturePalette();
    const data = extractCaptureCardData(card);
    const layout = buildCaptureCanvasLayout(data, palette);

    const pixelRatio = Math.min(2, window.devicePixelRatio || 1.5);
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(layout.width * pixelRatio);
    canvas.height = Math.ceil(layout.height * pixelRatio);

    const ctx = canvas.getContext("2d");
    ctx.scale(pixelRatio, pixelRatio);

    drawRoundedRect(ctx, 0, 0, layout.width, layout.height, 18, palette.background);
    drawRoundedRect(ctx, 1, 1, layout.width - 2, layout.height - 2, 17, palette.card);
    drawCaptureHeader(ctx, data, layout, palette);

    let y = layout.headerHeight + layout.padding;

    if (data.tables.length) {
        data.tables.forEach((table, index) => {
            y = drawCaptureTable(ctx, table, layout.padding, y, layout.contentWidth, palette);
            if (index < data.tables.length - 1) y += layout.sectionGap;
        });
    } else if (data.sections.length) {
        data.sections.forEach((section) => {
            y = drawCaptureTextSection(ctx, section, layout.padding, y, layout.contentWidth, palette);
            y += layout.sectionGap;
        });
    } else {
        drawCaptureEmpty(ctx, layout.padding, y, layout.contentWidth, palette);
    }

    return await canvasToPngBlob(canvas);
}

function getCapturePalette() {
    const theme = document.body.dataset.theme || "cyber";

    if (theme === "light") {
        return {
            background: "#e8f3ff",
            card: "#ffffff",
            header: "#dcecff",
            headerText: "#102033",
            text: "#102033",
            muted: "#526477",
            border: "#cbd5e1",
            rowAlt: "#f1f7ff",
            accent: "#0ea5e9"
        };
    }

    if (theme === "orange") {
        return {
            background: "#1b130b",
            card: "#26180d",
            header: "#432712",
            headerText: "#fff7ed",
            text: "#ffedd5",
            muted: "#fed7aa",
            border: "#7c3f16",
            rowAlt: "#321f10",
            accent: "#fb923c"
        };
    }

    return {
        background: "#020617",
        card: "#081225",
        header: "#0f2742",
        headerText: "#f8fafc",
        text: "#e5edf7",
        muted: "#9fb4cc",
        border: "#1f3b57",
        rowAlt: "#0c1a2f",
        accent: "#22d3ee"
    };
}

function extractCaptureCardData(card) {
    const project = getActiveProject();
    const title = cleanCaptureText(card.querySelector(":scope > .card-header h2")?.textContent || "Capture Forge");
    const projectName = cleanCaptureText(project?.name || "Projet Forge");
    const pageLabel = getCapturePageLabel();

    const tables = Array.from(card.querySelectorAll("table"))
        .map((table) => extractCaptureTableData(table))
        .filter((table) => table.headers.length || table.rows.length);

    const sections = tables.length ? [] : extractCaptureTextSections(card);

    return {
        title,
        projectName,
        pageLabel,
        generatedAt: new Date().toLocaleString("fr-FR"),
        tables,
        sections
    };
}

function getCapturePageLabel() {
    const active = document.querySelector(".nav-link.active");
    return cleanCaptureText(active?.textContent || document.title.replace(/^Forge\s*-\s*/i, ""));
}

function extractCaptureTableData(table) {
    const headerRows = Array.from(table.querySelectorAll("thead tr"));
    let headers = [];

    if (headerRows.length) {
        headers = Array.from(headerRows[headerRows.length - 1].children)
            .filter((cell) => isCaptureCellKept(cell))
            .map((cell) => cleanCaptureText(cell.textContent));
    }

    const rows = Array.from(table.querySelectorAll("tbody tr"))
        .map((row) => {
            return Array.from(row.children)
                .filter((cell) => isCaptureCellKept(cell))
                .map((cell) => getCaptureCellText(cell));
        })
        .filter((row) => row.some((value) => value.trim()));

    if (!headers.length && rows.length) {
        headers = rows[0].map((_, index) => `Col. ${index + 1}`);
    }

    return {
        headers,
        rows
    };
}

function isCaptureCellKept(cell) {
    if (!cell) return false;
    if (cell.classList.contains("select-col")) return false;
    if (cell.querySelector("button, input[type='checkbox'], input[type='radio'], .row-checkbox")) return false;

    const text = cleanCaptureText(cell.textContent);
    if (!text && cell.querySelector("input, select, textarea")) {
        return true;
    }

    return text !== "Sel.";
}

function getCaptureCellText(cell) {
    const select = cell.querySelector("select");
    if (select) {
        return cleanCaptureText(select.selectedOptions?.[0]?.textContent || select.value || "");
    }

    const textarea = cell.querySelector("textarea");
    if (textarea) {
        return cleanCaptureText(textarea.value || "");
    }

    const input = cell.querySelector("input");
    if (input) {
        return cleanCaptureText(input.value || "");
    }

    return cleanCaptureText(cell.textContent);
}

function extractCaptureTextSections(card) {
    const clone = card.cloneNode(true);

    clone.querySelectorAll(".no-capture, .capture-card-btn, button, input[type='checkbox'], input[type='radio'], .table-actions, .swot-actions, .color-menu").forEach((element) => {
        element.remove();
    });

    clone.querySelectorAll("select").forEach((select) => {
        const span = document.createElement("span");
        span.textContent = select.selectedOptions?.[0]?.textContent || select.value || "";
        select.replaceWith(span);
    });

    clone.querySelectorAll("textarea").forEach((textarea) => {
        const div = document.createElement("div");
        div.textContent = textarea.value || "";
        textarea.replaceWith(div);
    });

    clone.querySelectorAll("input").forEach((input) => {
        const span = document.createElement("span");
        span.textContent = input.value || "";
        input.replaceWith(span);
    });

    const header = clone.querySelector(":scope > .card-header");
    if (header) header.remove();

    const chunks = [];
    const preferred = clone.querySelectorAll(".dashboard-mini-row, .coherence-item, .dashboard-stat-card, .dashboard-ring-card, .swot-item, p, li, label, .context-field");

    preferred.forEach((element) => {
        const text = cleanCaptureText(element.textContent);
        if (text && !chunks.includes(text)) chunks.push(text);
    });

    if (!chunks.length) {
        const text = cleanCaptureText(clone.textContent);
        if (text) chunks.push(text);
    }

    return chunks.slice(0, 80).map((text) => ({
        title: "",
        text
    }));
}

function buildCaptureCanvasLayout(data, palette) {
    const padding = 28;
    const contentWidth = getCaptureCanvasWidth(data);
    const width = contentWidth + padding * 2;
    const headerHeight = 96;
    const sectionGap = 18;

    const measurer = document.createElement("canvas").getContext("2d");
    let height = headerHeight + padding;

    if (data.tables.length) {
        data.tables.forEach((table, index) => {
            height += measureCaptureTableHeight(measurer, table, contentWidth);
            if (index < data.tables.length - 1) height += sectionGap;
        });
    } else if (data.sections.length) {
        data.sections.forEach((section) => {
            height += measureWrappedTextHeight(measurer, section.text, "15px Arial", contentWidth, 22) + 24;
        });
    } else {
        height += 70;
    }

    height += padding;

    return {
        width,
        height: Math.min(Math.max(height, 220), 9000),
        padding,
        contentWidth,
        headerHeight,
        sectionGap
    };
}

function getCaptureCanvasWidth(data) {
    const maxColumns = data.tables.reduce((max, table) => Math.max(max, table.headers.length), 0);
    if (maxColumns >= 10) return 1700;
    if (maxColumns >= 7) return 1400;
    if (maxColumns >= 4) return 1100;
    return 900;
}

function measureCaptureTableHeight(ctx, table, width) {
    const columns = getCaptureColumnWidths(table.headers.length, width);
    let height = 44;

    table.rows.slice(0, 120).forEach((row) => {
        const rowHeight = Math.max(34, ...row.map((cell, index) => {
            const cellWidth = columns[index] || columns[columns.length - 1] || width;
            return measureWrappedTextHeight(ctx, cell, "14px Arial", cellWidth - 18, 19) + 16;
        }));
        height += Math.min(rowHeight, 120);
    });

    if (table.rows.length > 120) height += 36;

    return height + 10;
}

function drawCaptureHeader(ctx, data, layout, palette) {
    drawRoundedRect(ctx, 0, 0, layout.width, layout.headerHeight, 18, palette.header);
    ctx.fillStyle = palette.headerText;
    ctx.font = "bold 25px Arial, sans-serif";
    ctx.textBaseline = "top";
    drawWrappedText(ctx, data.title, layout.padding, 20, layout.contentWidth, 30, 1);

    ctx.fillStyle = palette.muted;
    ctx.font = "14px Arial, sans-serif";
    const subtitle = `${data.projectName} • ${data.pageLabel} • ${data.generatedAt}`;
    drawWrappedText(ctx, subtitle, layout.padding, 56, layout.contentWidth, 20, 1);

    ctx.fillStyle = palette.accent;
    ctx.fillRect(layout.padding, layout.headerHeight - 4, Math.min(layout.contentWidth, 220), 3);
}

function drawCaptureTable(ctx, table, x, y, width, palette) {
    const columns = getCaptureColumnWidths(table.headers.length, width);
    let currentY = y;

    ctx.font = "bold 13px Arial, sans-serif";
    ctx.textBaseline = "top";

    const headerHeight = 42;
    drawRoundedRect(ctx, x, currentY, width, headerHeight, 10, palette.header);

    let currentX = x;
    table.headers.forEach((header, index) => {
        const cellWidth = columns[index] || columns[columns.length - 1] || width;
        ctx.fillStyle = palette.headerText;
        drawWrappedText(ctx, header || `Col. ${index + 1}`, currentX + 9, currentY + 11, cellWidth - 18, 16, 1);
        if (index < table.headers.length - 1) {
            drawCaptureLine(ctx, currentX + cellWidth, currentY, currentX + cellWidth, currentY + headerHeight, palette.border);
        }
        currentX += cellWidth;
    });

    currentY += headerHeight;

    ctx.font = "14px Arial, sans-serif";

    table.rows.slice(0, 120).forEach((row, rowIndex) => {
        const rowHeight = Math.max(34, ...row.map((cell, index) => {
            const cellWidth = columns[index] || columns[columns.length - 1] || width;
            return measureWrappedTextHeight(ctx, cell, "14px Arial", cellWidth - 18, 19) + 16;
        }));

        const cappedHeight = Math.min(rowHeight, 120);
        ctx.fillStyle = rowIndex % 2 === 0 ? palette.card : palette.rowAlt;
        ctx.fillRect(x, currentY, width, cappedHeight);

        currentX = x;
        row.forEach((cell, index) => {
            const cellWidth = columns[index] || columns[columns.length - 1] || width;
            ctx.fillStyle = palette.text;
            drawWrappedText(ctx, cell || "—", currentX + 9, currentY + 8, cellWidth - 18, 19, 5);
            if (index < row.length - 1) {
                drawCaptureLine(ctx, currentX + cellWidth, currentY, currentX + cellWidth, currentY + cappedHeight, palette.border);
            }
            currentX += cellWidth;
        });

        drawCaptureLine(ctx, x, currentY + cappedHeight, x + width, currentY + cappedHeight, palette.border);
        currentY += cappedHeight;
    });

    if (table.rows.length > 120) {
        ctx.fillStyle = palette.muted;
        ctx.font = "italic 13px Arial, sans-serif";
        drawWrappedText(ctx, `… ${table.rows.length - 120} ligne(s) supplémentaires non affichées dans cette capture.`, x + 10, currentY + 10, width - 20, 18, 1);
        currentY += 36;
    }

    drawCaptureStrokeRounded(ctx, x, y, width, currentY - y, 10, palette.border);

    return currentY + 10;
}

function drawCaptureTextSection(ctx, section, x, y, width, palette) {
    ctx.fillStyle = palette.rowAlt;
    drawRoundedRect(ctx, x, y, width, 0, 10, palette.rowAlt);

    ctx.fillStyle = palette.text;
    ctx.font = "15px Arial, sans-serif";
    const height = drawWrappedText(ctx, section.text, x + 12, y + 10, width - 24, 22, 12);
    drawCaptureStrokeRounded(ctx, x, y, width, height + 20, 10, palette.border);

    return y + height + 20;
}

function drawCaptureEmpty(ctx, x, y, width, palette) {
    drawRoundedRect(ctx, x, y, width, 58, 10, palette.rowAlt);
    ctx.fillStyle = palette.muted;
    ctx.font = "bold 15px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Aucune donnée visible à capturer dans ce bloc.", x + width / 2, y + 20);
    ctx.textAlign = "left";
}

function getCaptureColumnWidths(columnCount, totalWidth) {
    const count = Math.max(1, columnCount);
    const minWidth = 90;
    const widths = [];

    if (count <= 2) {
        for (let i = 0; i < count; i += 1) widths.push(totalWidth / count);
        return widths;
    }

    if (count <= 5) {
        const first = totalWidth * 0.16;
        const remaining = totalWidth - first;
        widths.push(first);
        for (let i = 1; i < count; i += 1) widths.push(remaining / (count - 1));
        return widths.map((value) => Math.max(minWidth, value));
    }

    const base = totalWidth / count;
    for (let i = 0; i < count; i += 1) widths.push(Math.max(minWidth, base));

    const sum = widths.reduce((total, value) => total + value, 0);
    if (sum !== totalWidth) {
        const factor = totalWidth / sum;
        return widths.map((value) => value * factor);
    }

    return widths;
}

function cleanCaptureText(value) {
    return String(value || "")
        .replace(/\s+/g, " ")
        .replace(/^\s+|\s+$/g, "");
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 99) {
    const words = String(text || "—").split(/\s+/).filter(Boolean);
    let line = "";
    let currentY = y;
    let linesDrawn = 0;

    if (!words.length) {
        ctx.fillText("—", x, currentY);
        return lineHeight;
    }

    for (let i = 0; i < words.length; i += 1) {
        const testLine = line ? `${line} ${words[i]}` : words[i];
        const width = ctx.measureText(testLine).width;

        if (width > maxWidth && line) {
            linesDrawn += 1;

            if (linesDrawn >= maxLines) {
                ctx.fillText(`${line.slice(0, Math.max(0, line.length - 1))}…`, x, currentY);
                return (currentY - y) + lineHeight;
            }

            ctx.fillText(line, x, currentY);
            line = words[i];
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }

    if (line && linesDrawn < maxLines) {
        ctx.fillText(line, x, currentY);
        currentY += lineHeight;
    }

    return currentY - y;
}

function measureWrappedTextHeight(ctx, text, font, maxWidth, lineHeight) {
    ctx.save();
    ctx.font = font;
    const words = String(text || "—").split(/\s+/).filter(Boolean);
    let line = "";
    let lines = 1;

    words.forEach((word) => {
        const testLine = line ? `${line} ${word}` : word;
        if (ctx.measureText(testLine).width > maxWidth && line) {
            lines += 1;
            line = word;
        } else {
            line = testLine;
        }
    });

    ctx.restore();
    return lines * lineHeight;
}

function drawRoundedRect(ctx, x, y, width, height, radius, fillStyle) {
    const safeHeight = Math.max(1, height);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + safeHeight - radius);
    ctx.quadraticCurveTo(x + width, y + safeHeight, x + width - radius, y + safeHeight);
    ctx.lineTo(x + radius, y + safeHeight);
    ctx.quadraticCurveTo(x, y + safeHeight, x, y + safeHeight - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();
}

function drawCaptureStrokeRounded(ctx, x, y, width, height, radius, strokeStyle) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 1;
    ctx.stroke();
}

function drawCaptureLine(ctx, x1, y1, x2, y2, strokeStyle) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 1;
    ctx.stroke();
}

/* V53 — Démarrage unique */



/* V54 — Capture visuelle réelle avec html2canvas en priorité */
async function captureCardToClipboard(card, triggerButton) {
    if (!card || triggerButton?.disabled) return;

    triggerButton.disabled = true;
    triggerButton.classList.add("capture-loading");

    try {
        showCaptureToast("Préparation de la capture…");

        let blob;

        try {
            blob = await renderCardToExactVisualBlob(card);
        } catch (exactError) {
            console.warn("Capture visuelle réelle indisponible, tentative DOM/SVG :", exactError);

            try {
                blob = await renderElementToPngBlob(card);
            } catch (domCaptureError) {
                console.warn("Capture DOM bloquée, bascule vers canvas manuel :", domCaptureError);
                blob = await renderCardToCanvasPngBlob(card);
            }
        }

        await copyOrDownloadCapture(blob, getCaptureFileName(card));
    } catch (error) {
        console.error("Capture impossible :", error);
        showCaptureToast("Capture impossible sur ce bloc.");
    } finally {
        triggerButton.disabled = false;
        triggerButton.classList.remove("capture-loading");
    }
}


// html2canvas (ignoreElements) retire complètement les éléments visés de son
// rendu interne, comme un remove() — pas juste un "ne pas peindre". Pour les
// colonnes structurelles (checkbox, flèches WBS), il faut donc les retirer
// nous-mêmes AVANT la capture (temporairement, sur la vraie carte) et
// recalculer les colspan des lignes de séparation de phase en conséquence,
// sinon le tableau se décale. On restaure tout juste après.
function hideStructuralCaptureColumns(card) {
    const selector = "th.select-col, td.select-col, col.phase-col-select, col[class*='select'], .select-col, .wbs-move-header, .wbs-move-cell, col.wbs-col-move";
    const removedElements = Array.from(card.querySelectorAll(selector)).map((element) => ({
        element,
        parent: element.parentNode,
        nextSibling: element.nextSibling
    }));

    removedElements.forEach(({ element }) => element.remove());

    const colspanFixes = [];

    card.querySelectorAll("table").forEach((table) => {
        const columnCount = table.querySelectorAll(":scope > colgroup > col").length
            || table.querySelector("thead tr")?.children.length
            || 0;

        if (!columnCount) return;

        table.querySelectorAll("tr").forEach((row) => {
            if (row.children.length === 1 && row.children[0].hasAttribute("colspan")) {
                const cell = row.children[0];
                colspanFixes.push({ cell, previousColspan: cell.getAttribute("colspan") });
                cell.setAttribute("colspan", String(columnCount));
            }
        });
    });

    return () => {
        colspanFixes.forEach(({ cell, previousColspan }) => {
            cell.setAttribute("colspan", previousColspan);
        });

        removedElements.slice().reverse().forEach(({ element, parent, nextSibling }) => {
            parent.insertBefore(element, nextSibling);
        });
    };
}

function prepareCardForExactCapture(card) {
    const previousClasses = card.className;
    const previousDataset = card.dataset.captureExact || "";

    card.classList.add("capture-exact-mode");
    card.dataset.captureExact = "true";

    const tableWrappers = Array.from(card.querySelectorAll(".table-wrapper, .gantt-wrapper, .redaction-table-wrapper, .scope-table-wrapper"));
    const previousWrapperStyles = tableWrappers.map((element) => ({
        element,
        overflow: element.style.overflow,
        overflowX: element.style.overflowX,
        overflowY: element.style.overflowY,
        maxHeight: element.style.maxHeight
    }));

    tableWrappers.forEach((element) => {
        element.style.overflow = "visible";
        element.style.overflowX = "visible";
        element.style.overflowY = "visible";
        element.style.maxHeight = "none";
    });

    const selectedRows = Array.from(card.querySelectorAll(".selected-row"));
    selectedRows.forEach((row) => row.classList.add("capture-row-was-selected"));
    selectedRows.forEach((row) => row.classList.remove("selected-row"));

    const restoreStructuralColumns = hideStructuralCaptureColumns(card);

    return () => {
        restoreStructuralColumns();

        card.className = previousClasses;
        if (previousDataset) {
            card.dataset.captureExact = previousDataset;
        } else {
            delete card.dataset.captureExact;
        }

        previousWrapperStyles.forEach((item) => {
            item.element.style.overflow = item.overflow;
            item.element.style.overflowX = item.overflowX;
            item.element.style.overflowY = item.overflowY;
            item.element.style.maxHeight = item.maxHeight;
        });

        selectedRows.forEach((row) => row.classList.add("selected-row"));
        selectedRows.forEach((row) => row.classList.remove("capture-row-was-selected"));
    };
}

function shouldIgnoreExactCaptureElement(element) {
    if (!element) return false;

    const selectors = [
        ".no-capture",
        ".capture-card-btn",
        ".table-actions",
        ".swot-actions",
        ".color-menu",
        ".modal-overlay",
        ".scope-column-actions",
        ".competence-matrix-actions",
        ".row-checkbox",
        ".select-col",
        ".wbs-move-cell",
        ".wbs-move-header"
    ];

    if (selectors.some((selector) => element.matches?.(selector))) return true;
    if (element.tagName === "BUTTON") return true;

    const type = String(element.getAttribute?.("type") || "").toLowerCase();
    if (element.tagName === "INPUT" && (type === "checkbox" || type === "radio")) return true;

    return false;
}



async function copyOrDownloadCapture(blob, filename) {
    // Le presse-papiers image (Clipboard API) exige un contexte sécurisé
    // (HTTPS ou localhost). Sur un accès NAS en http:// simple, il est
    // toujours indisponible : inutile de tenter puis de retomber sur un
    // téléchargement différé (peu fiable, certains navigateurs l'ouvrent
    // comme une navigation au lieu d'un vrai fichier). On affiche plutôt
    // un résultat explicite tout de suite.
    if (!window.isSecureContext || !navigator.clipboard || typeof ClipboardItem === "undefined") {
        showCaptureResultModal(blob, filename);
        return;
    }

    try {
        await navigator.clipboard.write([
            new ClipboardItem({
                "image/png": blob
            })
        ]);

        showCaptureToast("Image copiée dans le presse-papiers ✅");
    } catch (clipboardError) {
        console.warn("Copie presse-papiers impossible :", clipboardError);
        showCaptureResultModal(blob, filename);
    }
}

function showCaptureResultModal(blob, filename) {
    const existing = document.getElementById("capture-result-overlay");
    if (existing) {
        existing.dispatchEvent(new Event("forge-capture-result-cleanup"));
        existing.remove();
    }

    const imageUrl = URL.createObjectURL(blob);

    const overlay = document.createElement("div");
    overlay.id = "capture-result-overlay";
    overlay.className = "modal-overlay no-capture";

    overlay.innerHTML = `
        <div class="modal capture-result-modal">
            <div class="modal-header">
                <h2>Image générée</h2>
                <button class="modal-close" type="button" aria-label="Fermer">×</button>
            </div>
            <div class="modal-body">
                <p>
                    Le presse-papiers image n'est pas disponible sur cette connexion
                    (il faut du HTTPS pour que le navigateur l'autorise). Fais un clic
                    droit sur l'image ci-dessous puis « Copier l'image », ou télécharge le PNG.
                </p>
                <img src="${imageUrl}" alt="Capture du bloc" class="capture-result-image" />
                <div class="capture-result-actions">
                    <button class="btn" type="button" id="capture-result-download-btn">Télécharger le PNG</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    function close() {
        overlay.remove();
        URL.revokeObjectURL(imageUrl);
    }

    overlay.addEventListener("forge-capture-result-cleanup", () => URL.revokeObjectURL(imageUrl));
    overlay.querySelector(".modal-close").addEventListener("click", close);
    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) close();
    });
    overlay.querySelector("#capture-result-download-btn").addEventListener("click", () => {
        downloadCaptureBlob(blob, filename);
    });
}

function addCaptureButtonsToCards() {
    document.querySelectorAll("main .card").forEach((card) => {
        const header = card.querySelector(":scope > .card-header");
        if (!header || header.dataset.captureReady === "true") return;

        const button = document.createElement("button");
        button.className = "capture-card-btn no-capture";
        button.type = "button";
        button.title = "Copier ce bloc en image";
        button.setAttribute("aria-label", "Copier ce bloc en image");
        button.textContent = "📸";

        button.addEventListener("click", async (event) => {
            event.preventDefault();
            event.stopPropagation();
            await captureCardToClipboard(card, button);
        });

        header.appendChild(button);
        header.dataset.captureReady = "true";
    });
}

/* V54 — Démarrage unique */



/* V55 — Capture HD plus nette */

function getExactCaptureScale(rect) {
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    const area = width * height;
    const deviceScale = Math.max(1, window.devicePixelRatio || 1);

    if (area > 4500000) return Math.min(1.5, deviceScale);
    if (area > 2500000) return Math.min(2, Math.max(1.5, deviceScale));
    if (area > 1200000) return Math.min(2.4, Math.max(2, deviceScale));
    if (area > 650000) return Math.min(2.8, Math.max(2.3, deviceScale));

    return Math.min(3.25, Math.max(2.6, deviceScale * 1.5));
}

function improveCaptureCloneRendering(clonedDocument) {
    const style = clonedDocument.createElement("style");
    style.textContent = `
        * {
            -webkit-font-smoothing: antialiased !important;
            text-rendering: geometricPrecision !important;
            transform: none !important;
            transition: none !important;
            animation: none !important;
            filter: none !important;
        }

        .capture-exact-mode {
            image-rendering: auto !important;
        }

        .capture-exact-mode .card-header h2,
        .capture-exact-mode th,
        .capture-exact-mode td,
        .capture-exact-mode .editable,
        .capture-exact-mode .dashboard-ring-value,
        .capture-exact-mode .dashboard-stat-value {
            text-shadow: none !important;
        }

        .capture-exact-mode .dashboard-ring,
        .capture-exact-mode .dashboard-progress-fill,
        .capture-exact-mode .risk-severity-dot,
        .capture-exact-mode .risk-matrix-dot,
        .capture-exact-mode .gantt-bar {
            transform: translateZ(0) !important;
        }
    `;
    clonedDocument.head.appendChild(style);
}

function sharpenCaptureCanvas(canvas) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
}

function downloadCaptureBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename.replace(/\.png$/i, "-hd.png");
    document.body.appendChild(link);
    link.click();

    window.setTimeout(() => {
        URL.revokeObjectURL(url);
        link.remove();
    }, 500);
}

function showCaptureQualityHint(scale) {
    const rounded = Math.round(scale * 10) / 10;
    showCaptureToast(`Capture HD x${rounded} générée ✅`);
}

/* V55 — Démarrage unique */



let html2canvasLoadPromise = null;

function ensureHtml2CanvasLoaded() {
    if (typeof window.html2canvas === "function") {
        return Promise.resolve();
    }

    if (!html2canvasLoadPromise) {
        html2canvasLoadPromise = new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
            script.onload = () => resolve();
            script.onerror = () => {
                html2canvasLoadPromise = null;
                reject(new Error("html2canvas : chargement CDN impossible"));
            };
            document.head.appendChild(script);
        });
    }

    return html2canvasLoadPromise;
}

/* V56 — Captures PNG avec vrais coins arrondis */
async function renderCardToExactVisualBlob(card) {
    await ensureHtml2CanvasLoaded();

    const restore = prepareCardForExactCapture(card);

    try {
        showCaptureToast("Capture HD arrondie en préparation…");
        await waitForCaptureLayout();

        const rect = card.getBoundingClientRect();
        const scale = getExactCaptureScale(rect);

        const canvas = await window.html2canvas(card, {
            backgroundColor: null,
            scale,
            useCORS: true,
            allowTaint: true,
            logging: false,
            removeContainer: true,
            foreignObjectRendering: false,
            imageTimeout: 0,
            windowWidth: Math.max(document.documentElement.scrollWidth, window.innerWidth, Math.ceil(card.scrollWidth + 80)),
            windowHeight: Math.max(document.documentElement.scrollHeight, window.innerHeight, Math.ceil(card.scrollHeight + 80)),
            scrollX: window.scrollX,
            scrollY: window.scrollY,
            ignoreElements: (element) => shouldIgnoreExactCaptureElement(element),
            onclone: (clonedDocument) => {
                improveCaptureCloneRendering(clonedDocument);
            }
        });

        sharpenCaptureCanvas(canvas);

        const radius = getCaptureCardRadius(card, scale);
        const roundedCanvas = applyRoundedCaptureMask(canvas, radius);

        return await canvasToPngBlob(roundedCanvas);
    } finally {
        restore();
    }
}

function getCaptureCardRadius(card, scale) {
    const computed = getComputedStyle(card);
    const raw = parseFloat(computed.borderTopLeftRadius || computed.borderRadius || "18");

    return Math.max(18, Math.round((Number.isFinite(raw) ? raw : 18) * scale));
}

function applyRoundedCaptureMask(sourceCanvas, radius) {
    const output = document.createElement("canvas");
    output.width = sourceCanvas.width;
    output.height = sourceCanvas.height;

    const ctx = output.getContext("2d");
    ctx.clearRect(0, 0, output.width, output.height);
    createRoundedPath(ctx, 0, 0, output.width, output.height, radius);
    ctx.clip();
    ctx.drawImage(sourceCanvas, 0, 0);

    return output;
}

function createRoundedPath(ctx, x, y, width, height, radius) {
    const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));

    ctx.beginPath();
    ctx.moveTo(x + safeRadius, y);
    ctx.lineTo(x + width - safeRadius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
    ctx.lineTo(x + width, y + height - safeRadius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
    ctx.lineTo(x + safeRadius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
    ctx.lineTo(x, y + safeRadius);
    ctx.quadraticCurveTo(x, y, x + safeRadius, y);
    ctx.closePath();
}


/* V56 — Démarrage unique */



/* V59 — Thème Executive report */
function normalizeForgeTheme(theme) {
    return ["cyber", "light", "orange", "executive"].includes(theme) ? theme : "cyber";
}

function initThemeSwitcher() {
    const selector = document.getElementById("theme-selector");
    const theme = loadForgeTheme();

    applyForgeTheme(theme);

    if (!selector) return;

    if (!selector.querySelector('option[value="orange"]')) {
        const option = document.createElement("option");
        option.value = "orange";
        option.textContent = "Orange dusk";
        selector.appendChild(option);
    }

    if (!selector.querySelector('option[value="executive"]')) {
        const option = document.createElement("option");
        option.value = "executive";
        option.textContent = "Executive report";
        selector.appendChild(option);
    }

    selector.value = theme;

    selector.addEventListener("change", () => {
        const nextTheme = normalizeForgeTheme(selector.value);
        saveForgeTheme(nextTheme);
        applyForgeTheme(nextTheme);
    });
}

function getExactCaptureBackground() {
    const theme = document.body.dataset.theme || "cyber";

    if (theme === "light") return null;
    if (theme === "orange") return null;
    if (theme === "executive") return null;

    return null;
}

if (typeof helpTexts !== "undefined") {
    helpTexts.dashboard = `
        <p>Cette page donne une vue globale et visuelle du projet.</p>
        <ul>
            <li>Le thème Executive report est pensé pour les captures et rapports professionnels.</li>
            <li>Les jauges circulaires résument la santé projet, la couverture du dossier, l’avancement WBS et la complétude des KPIs.</li>
            <li>Le panneau de cohérence liste les éléments à corriger ou compléter.</li>
        </ul>
    `;
}

/* V59 — Démarrage unique */



/* V61 — RACI structuré par phases */
function renderRaciTable() {
    if (!raciTableHead || !raciTableBody) return;

    raciTableHead.innerHTML = "";
    raciTableBody.innerHTML = "";

    if (stakeholders.length === 0 || wbsRows.length === 0) {
        raciTableBody.innerHTML = `
            <tr>
                <td colspan="3" class="raci-empty-state">
                    Ajoute d’abord des parties prenantes et des lignes WBS pour générer le RACI.
                </td>
            </tr>
        `;
        return;
    }

    const stakeholderHeaders = stakeholders.map((person) => {
        const label = getStakeholderLabel(person);
        return `<th class="raci-stakeholder-header">${escapeHtml(label)}</th>`;
    }).join("");

    raciTableHead.innerHTML = `
        <tr>
            <th class="raci-col-number">N°</th>
            <th class="raci-col-task">Tâche / Livrable</th>
            ${stakeholderHeaders}
        </tr>
    `;

    const groupedRows = groupWbsRowsByPhase();

    groupedRows.forEach((group, groupIndex) => {
        const phaseColor = normalizeColor(group.phase?.color || "#94a3b8", groupIndex);
        const phaseName = group.phase?.name || group.label || "Sans phase";
        const taskCount = group.rows.length;

        const phaseRow = document.createElement("tr");
        phaseRow.className = `raci-phase-row raci-phase-section-row ${group.isUnassigned ? "raci-phase-unassigned" : ""}`;
        phaseRow.dataset.phaseId = group.phaseId;
        phaseRow.style.setProperty("--raci-phase-color", phaseColor);
        phaseRow.style.backgroundColor = hexToRgba(phaseColor, group.isUnassigned ? 0.18 : 0.30);
        phaseRow.style.boxShadow = `inset 6px 0 0 ${phaseColor}`;

        phaseRow.innerHTML = `
            <td colspan="${2 + stakeholders.length}">
                <span class="raci-phase-label">
                    <span class="raci-phase-dot" style="background-color: ${escapeHtml(phaseColor)}; --phase-glow: ${hexToRgba(phaseColor, 0.50)};"></span>
                    <span class="raci-phase-title">${escapeHtml(phaseName)}</span>
                    <span class="raci-phase-count">${taskCount} tâche${taskCount > 1 ? "s" : ""}</span>
                    <button class="raci-phase-capture-btn no-capture" type="button" data-capture-phase-id="${escapeHtml(group.phaseId)}" title="Capturer cette phase en image" aria-label="Capturer cette phase en image">📸</button>
                </span>
            </td>
        `;

        raciTableBody.appendChild(phaseRow);

        group.rows.forEach(({ row, originalIndex, phaseTaskIndex }) => {
            const taskRow = document.createElement("tr");
            taskRow.className = "raci-task-row";
            taskRow.dataset.phaseId = group.phaseId;
            taskRow.style.backgroundColor = hexToRgba(phaseColor, group.isUnassigned ? 0.08 : 0.14);
            taskRow.style.boxShadow = `inset 3px 0 0 ${phaseColor}`;

            const cells = stakeholders.map((person) => {
                const value = getRaciValue(row, person);
                const raciClass = value ? `raci-${value.toLowerCase()}` : "";

                return `
                    <td>
                        <select
                            class="raci-select ${raciClass}"
                            data-row-id="${escapeHtml(getWbsRowId(row, originalIndex))}"
                            data-stakeholder-id="${escapeHtml(getStakeholderId(person))}"
                            aria-label="RACI ${escapeHtml(row.task || `ligne ${originalIndex + 1}`)} - ${escapeHtml(getStakeholderLabel(person))}"
                        >
                            <option value=""></option>
                            <option value="R" ${value === "R" ? "selected" : ""}>R</option>
                            <option value="A" ${value === "A" ? "selected" : ""}>A</option>
                            <option value="C" ${value === "C" ? "selected" : ""}>C</option>
                            <option value="I" ${value === "I" ? "selected" : ""}>I</option>
                        </select>
                    </td>
                `;
            }).join("");

            taskRow.innerHTML = `
                <td>
                    <span class="raci-task-number">${phaseTaskIndex}</span>
                </td>
                <td class="raci-task-cell">${escapeHtml(row.task || "Tâche / livrable sans nom")}</td>
                ${cells}
            `;

            raciTableBody.appendChild(taskRow);
        });
    });

    bindRaciEvents();
}

function groupWbsRowsByPhase() {
    const groups = [];
    const groupMap = new Map();
    const validPhaseIds = new Set(phases.map((phase) => phase.id));

    phases.forEach((phase) => {
        const rows = wbsRows
            .map((row, originalIndex) => ({ row, originalIndex }))
            .filter(({ row }) => row.phaseId && row.phaseId === phase.id);

        if (rows.length === 0) return;

        const group = {
            phaseId: phase.id,
            phase,
            label: phase.name || "Phase sans nom",
            isUnassigned: false,
            rows: rows.map((item, index) => ({
                ...item,
                phaseTaskIndex: index + 1
            }))
        };

        groupMap.set(phase.id, group);
        groups.push(group);
    });

    const unassignedRows = wbsRows
        .map((row, originalIndex) => ({ row, originalIndex }))
        .filter(({ row }) => !row.phaseId || !validPhaseIds.has(row.phaseId));

    if (unassignedRows.length > 0) {
        groups.push({
            phaseId: "__no_phase__",
            phase: null,
            label: "Sans phase / à classer",
            isUnassigned: true,
            rows: unassignedRows.map((item, index) => ({
                ...item,
                phaseTaskIndex: index + 1
            }))
        });
    }

    return groups;
}

if (typeof helpTexts !== "undefined") {
    helpTexts.raci = `
        <p>Cette page génère automatiquement la matrice RACI à partir du WBS et des parties prenantes.</p>
        <ul>
            <li>Les tâches sont maintenant séparées par phase pour mieux lire les étapes du projet.</li>
            <li>Chaque phase sert de ligne de séparation visuelle.</li>
            <li>Les lignes sans phase sont regroupées dans “Sans phase / à classer”.</li>
        </ul>
    `;
}

/* V61 — Démarrage unique */



/* V65 — Réécriture propre du WBS */

function getLegacyWbsPhaseAssignmentsKey() {
    return getProjectKey("wbs_phase_assignments");
}

function readLegacyWbsPhaseAssignments() {
    const savedData = localStorage.getItem(getLegacyWbsPhaseAssignmentsKey());

    if (!savedData) return {};

    try {
        const parsed = JSON.parse(savedData);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
        console.warn("Anciennes affectations de phases WBS illisibles :", error);
        return {};
    }
}

function clearLegacyWbsPhaseAssignments() {
    localStorage.removeItem(getLegacyWbsPhaseAssignmentsKey());
}

function normalizeWbsRow(row, index = 0, legacyAssignments = null) {
    const output = {
        id: row.id || createId(),
        phaseId: row.phaseId || "",
        task: row.task || "",
        responsable: row.responsable || "",
        responsableId: row.responsableId || "",
        jourDebut: row.jourDebut || "",
        duree: row.duree || "",
        jourFin: row.jourFin || "",
        dateDebut: row.dateDebut || "",
        dateFin: row.dateFin || "",
        avancement: row.avancement || "0",
        commentaire: row.commentaire || ""
    };

    if (legacyAssignments) {
        const rowId = getWbsRowId(output, index);
        if (Object.prototype.hasOwnProperty.call(legacyAssignments, rowId)) {
            output.phaseId = legacyAssignments[rowId] || "";
        }
    }

    return output;
}

function normalizeWbsRows(rows, legacyAssignments = null) {
    const sourceRows = Array.isArray(rows) && rows.length > 0
        ? rows
        : structuredClone(defaultWbsRows);

    return sourceRows.map((row, index) => normalizeWbsRow(row, index, legacyAssignments));
}

function loadWbsRows() {
    const legacyAssignments = readLegacyWbsPhaseAssignments();
    const savedData = localStorage.getItem(getProjectKey("wbs"));

    let rows;

    if (!savedData) {
        rows = normalizeWbsRows(structuredClone(defaultWbsRows), legacyAssignments);
    } else {
        try {
            const parsedData = JSON.parse(savedData);
            rows = normalizeWbsRows(Array.isArray(parsedData) ? parsedData : structuredClone(defaultWbsRows), legacyAssignments);
        } catch (error) {
            console.error("Impossible de charger le WBS :", error);
            rows = normalizeWbsRows(structuredClone(defaultWbsRows), legacyAssignments);
        }
    }

    rows = applyWbsAutoSchedule(rows);
    localStorage.setItem(getProjectKey("wbs"), JSON.stringify(rows));
    clearLegacyWbsPhaseAssignments();

    return rows;
}




function applyWbsAutoSchedule(rows) {
    const settings = loadWbsSettings();
    const projectInfo = loadProjectInfo();
    const projectStart = parseForgeDate(projectInfo.startDate);
    const periods = loadGanttPeriods();
    let nextStartDay = 1;

    return normalizeWbsRows(rows).map((row) => {
        // Jour début / Jour fin sont désormais éditables à la main : on les
        // respecte s'ils existent déjà, et on ne comble automatiquement que
        // les lignes qui n'en ont pas encore (nouvelles lignes), en
        // continuant juste après la dernière tâche placée.
        let startDay = parsePositiveInteger(row.jourDebut);
        let endDay = parsePositiveInteger(row.jourFin);

        if (!startDay) {
            startDay = nextStartDay;
        }

        if (!endDay || endDay < startDay) {
            const duration = parsePositiveInteger(row.duree) || 1;
            endDay = startDay + duration - 1;
        }

        const duration = endDay - startDay + 1;

        const output = {
            ...row,
            duree: String(duration),
            jourDebut: String(startDay),
            jourFin: String(endDay)
        };

        if (projectStart) {
            output.dateDebut = formatForgeInputDate(addForgeWorkingDays(projectStart, startDay - 1, settings.weekendsWorked, periods));
            output.dateFin = formatForgeInputDate(addForgeWorkingDays(projectStart, endDay - 1, settings.weekendsWorked, periods));
        } else {
            output.dateDebut = "";
            output.dateFin = "";
        }

        nextStartDay = Math.max(nextStartDay, endDay + 1);

        return output;
    });
}

function createDefaultWbsRowsForReset() {
    return structuredClone(defaultWbsRows).map((row, index) => ({
        ...row,
        id: row.id || createId(),
        phaseId: row.phaseId || phases[index % Math.max(phases.length, 1)]?.id || "",
        responsable: row.responsable || "",
        responsableId: row.responsableId || "",
        avancement: row.avancement || "0"
    }));
}

/* V79 — WBS sans liste déroulante de phase : séparateurs visuels + réordonnancement */

// Comme groupWbsRowsByPhase (utilisée par RACI), mais inclut TOUTES les phases
// même vides (pour pouvoir y ajouter une première tâche) et garde toujours un
// groupe "Sans phase" accessible.
function groupWbsRowsForEditor() {
    const groups = [];
    const validPhaseIds = new Set(phases.map((phase) => phase.id));

    phases.forEach((phase) => {
        const rows = wbsRows
            .map((row, originalIndex) => ({ row, originalIndex }))
            .filter(({ row }) => row.phaseId === phase.id);

        groups.push({
            phaseId: phase.id,
            phase,
            label: phase.name || "Phase sans nom",
            isUnassigned: false,
            rows
        });
    });

    const unassignedRows = wbsRows
        .map((row, originalIndex) => ({ row, originalIndex }))
        .filter(({ row }) => !row.phaseId || !validPhaseIds.has(row.phaseId));

    if (unassignedRows.length > 0 || phases.length === 0) {
        groups.push({
            phaseId: "",
            phase: null,
            label: "Sans phase",
            isUnassigned: true,
            rows: unassignedRows
        });
    }

    return groups;
}

// Range wbsRows pour que les tâches soient physiquement contiguës par phase,
// dans l'ordre des phases. C'est ce qui permet au planning automatique
// (applyWbsAutoSchedule, qui suit l'ordre du tableau) de rester cohérent avec
// les séparateurs affichés à l'écran.
function regroupWbsRowsByPhase() {
    wbsRows = groupWbsRowsForEditor().flatMap((group) => group.rows.map((item) => item.row));
}

function createNewWbsRow(phaseId) {
    const previousRow = wbsRows[wbsRows.length - 1];
    const nextStartDay = parsePositiveInteger(previousRow?.jourFin) ? parsePositiveInteger(previousRow.jourFin) + 1 : 1;

    return {
        id: createId(),
        phaseId: phaseId || "",
        task: "",
        responsable: "",
        responsableId: "",
        jourDebut: String(nextStartDay),
        duree: "1",
        jourFin: String(nextStartDay),
        dateDebut: "",
        dateFin: "",
        avancement: "0",
        commentaire: ""
    };
}

function addWbsRowToPhase(phaseId) {
    const newRow = createNewWbsRow(phaseId);
    wbsRows.push(newRow);
    regroupWbsRowsByPhase();
    saveWbsRowsWithSchedule();
    renderWbsTable();

    wbsTableBody?.querySelector(`tr[data-row-id="${newRow.id}"] .wbs-task-cell`)?.focus();
}

// Jour début / Jour fin / Durée sont maintenant trois façons d'éditer la
// même tâche : changer le jour de début déplace la tâche (durée conservée),
// changer le jour de fin ou la durée la redimensionne (jour de début fixe).
function applyWbsDayEdit(index, field, rawValue) {
    const row = wbsRows[index];
    if (!row) return;

    const currentStart = parsePositiveInteger(row.jourDebut) || 1;
    const currentEnd = parsePositiveInteger(row.jourFin) || currentStart;
    const currentDuration = Math.max(currentEnd - currentStart + 1, 1);
    const value = parsePositiveInteger(rawValue);

    if (field === "jourDebut") {
        const newStart = value || 1;
        row.jourDebut = String(newStart);
        row.jourFin = String(newStart + currentDuration - 1);
    } else if (field === "jourFin") {
        const newEnd = Math.max(value || currentStart, currentStart);
        row.jourDebut = String(currentStart);
        row.jourFin = String(newEnd);
    }

    saveWbsRowsWithSchedule();
    renderWbsTable();
}

function applyWbsDurationEdit(index, rawValue) {
    const row = wbsRows[index];
    if (!row) return;

    const currentStart = parsePositiveInteger(row.jourDebut) || 1;
    const newDuration = Math.max(parsePositiveInteger(rawValue) || 1, 1);

    row.jourDebut = String(currentStart);
    row.jourFin = String(currentStart + newDuration - 1);

    saveWbsRowsWithSchedule();
    renderWbsTable();
}

// Déplace la tâche à currentIndex d'un cran (direction -1 = monter, +1 =
// descendre). Si ce cran fait passer la tâche au-delà du bloc de sa phase,
// elle rejoint la phase voisine : c'est ce qui remplace la liste déroulante.
function moveWbsRow(currentIndex, direction) {
    const targetIndex = currentIndex + direction;

    if (!wbsRows[currentIndex] || targetIndex < 0 || targetIndex >= wbsRows.length) return;

    const current = wbsRows[currentIndex];
    const neighbor = wbsRows[targetIndex];

    if (current.phaseId !== neighbor.phaseId) {
        current.phaseId = neighbor.phaseId;
    }

    wbsRows[currentIndex] = neighbor;
    wbsRows[targetIndex] = current;

    saveWbsRowsWithSchedule();
    renderWbsTable();
}

// Capture juste une phase du WBS : masque temporairement les lignes des
// autres phases (sans toucher aux colonnes, donc aucun risque de décalage),
// réutilise le pipeline de capture existant sur la carte WBS entière, puis
// restaure l'affichage normal.
async function captureWbsPhase(button, phaseId) {
    const card = button.closest(".card");
    if (!card || !wbsTableBody) return;

    const titleEl = card.querySelector(":scope > .card-header h2");
    const previousTitle = titleEl ? titleEl.textContent : null;
    const phaseLabel = phaseId
        ? (phases.find((phase) => phase.id === phaseId)?.name || "Phase sans nom")
        : "Sans phase";

    if (titleEl) titleEl.textContent = `WBS - ${phaseLabel}`;

    const rowsToHide = Array.from(wbsTableBody.children).filter((row) => row.dataset.phaseId !== phaseId);

    rowsToHide.forEach((row) => {
        row.dataset.captureHiddenDisplay = row.style.display;
        row.style.display = "none";
    });

    try {
        await captureCardToClipboard(card, button);
    } finally {
        rowsToHide.forEach((row) => {
            row.style.display = row.dataset.captureHiddenDisplay || "";
            delete row.dataset.captureHiddenDisplay;
        });

        if (titleEl && previousTitle !== null) titleEl.textContent = previousTitle;
    }
}

function initWbsPage() {
    stakeholders = loadStakeholders();
    phases = loadPhases();
    wbsRows = loadWbsRows();

    renderColorMenu();
    renderPhasesTable();
    renderWbsTable();
    initWbsPlanningToolbar();

    document.getElementById("add-phase-btn")?.addEventListener("click", () => {
        phases.push({
            id: createId(),
            color: predefinedColors[phases.length % predefinedColors.length],
            name: ""
        });

        savePhases();
        renderPhasesTable();
        renderWbsTable();

        phasesTableBody?.querySelector("tr:last-child .editable")?.focus();
    });

    document.getElementById("delete-selected-phases-btn")?.addEventListener("click", () => {
        if (selectedPhases.size === 0) return;

        const confirmation = confirm("Tu veux vraiment supprimer les phases cochées ? Les lignes WBS liées à ces phases passeront sans phase.");
        if (!confirmation) return;

        const deletedPhaseIds = phases
            .filter((_, index) => selectedPhases.has(index))
            .map((phase) => phase.id);

        phases = phases.filter((_, index) => !selectedPhases.has(index));
        wbsRows = wbsRows.map((row) => (
            deletedPhaseIds.includes(row.phaseId)
                ? { ...row, phaseId: "" }
                : row
        ));

        selectedPhases.clear();
        savePhases();
        saveWbsRowsWithSchedule();
        hideColorMenu();
        renderPhasesTable();
        renderWbsTable();
    });

    document.getElementById("reset-phases-btn")?.addEventListener("click", () => {
        const confirmation = confirm("Tu veux vraiment réinitialiser les phases ?");
        if (!confirmation) return;

        phases = structuredClone(defaultPhases).map((phase, index) => ({
            id: phase.id || createId(),
            color: normalizeColor(phase.color, index),
            name: phase.name || ""
        }));

        selectedPhases.clear();

        wbsRows = wbsRows.map((row, index) => ({
            ...row,
            phaseId: phases[index % Math.max(phases.length, 1)]?.id || ""
        }));

        savePhases();
        saveWbsRowsWithSchedule();
        hideColorMenu();
        renderPhasesTable();
        renderWbsTable();
    });

    document.getElementById("select-all-phases-checkbox")?.addEventListener("change", (event) => {
        selectedPhases.clear();

        if (event.target.checked) {
            phases.forEach((_, index) => selectedPhases.add(index));
        }

        renderPhasesTable();
    });

    document.getElementById("add-wbs-row-btn")?.addEventListener("click", () => {
        addWbsRowToPhase("");
    });

    document.getElementById("delete-selected-wbs-btn")?.addEventListener("click", () => {
        if (selectedWbsRows.size === 0) return;

        const confirmation = confirm("Tu veux vraiment supprimer les lignes WBS cochées ?");
        if (!confirmation) return;

        wbsRows = wbsRows.filter((_, index) => !selectedWbsRows.has(index));
        selectedWbsRows.clear();
        saveWbsRowsWithSchedule();
        renderWbsTable();
    });

    document.getElementById("reset-wbs-btn")?.addEventListener("click", () => {
        const confirmation = confirm("Tu veux vraiment réinitialiser le WBS ?");
        if (!confirmation) return;

        wbsRows = createDefaultWbsRowsForReset();
        selectedWbsRows.clear();
        saveWbsRowsWithSchedule();
        renderWbsTable();
    });

    document.getElementById("select-all-wbs-checkbox")?.addEventListener("change", (event) => {
        selectedWbsRows.clear();

        if (event.target.checked) {
            wbsRows.forEach((_, index) => selectedWbsRows.add(index));
        }

        renderWbsTable();
    });

    projectInfoInputs.forEach((input) => {
        if (input.dataset.projectField === "startDate") {
            input.addEventListener("change", () => {
                saveWbsRowsWithSchedule();
                renderWbsTable();
            });
        }
    });

    document.addEventListener("click", closeColorMenuOnOutsideClick);
}

function renderWbsTable() {
    if (!wbsTableBody) return;

    regroupWbsRowsByPhase();
    wbsRows = applyWbsAutoSchedule(normalizeWbsRows(wbsRows));
    localStorage.setItem(getProjectKey("wbs"), JSON.stringify(wbsRows));

    wbsTableBody.innerHTML = "";

    if (wbsRows.length === 0 && phases.length === 0) {
        const row = document.createElement("tr");
        row.innerHTML = `<td colspan="11" class="empty-state">Aucune ligne WBS pour le moment.</td>`;
        wbsTableBody.appendChild(row);
        updateWbsSelectionControls();
        return;
    }

    syncWbsResponsablesWithStakeholders();

    const groups = groupWbsRowsForEditor();
    const lastIndex = wbsRows.length - 1;

    groups.forEach((group) => {
        const phaseColor = group.phase ? normalizeColor(group.phase.color, 0) : "#94a3b8";
        const phaseName = group.isUnassigned ? "Sans phase" : (group.label || "Phase sans nom");

        const phaseRow = document.createElement("tr");
        phaseRow.className = `wbs-phase-row${group.isUnassigned ? " wbs-phase-unassigned" : ""}`;
        phaseRow.dataset.phaseId = group.phaseId;
        phaseRow.style.backgroundColor = hexToRgba(phaseColor, group.isUnassigned ? 0.14 : 0.26);
        phaseRow.style.boxShadow = `inset 4px 0 0 ${phaseColor}`;

        phaseRow.innerHTML = `
            <td colspan="11">
                <div class="wbs-phase-row-inner">
                <span class="wbs-phase-label">
                    <span class="wbs-phase-dot" style="background-color: ${escapeHtml(phaseColor)};"></span>
                    <span class="wbs-phase-title">${escapeHtml(phaseName)}</span>
                    <span class="wbs-phase-count">${group.rows.length} tâche${group.rows.length > 1 ? "s" : ""}</span>
                </span>
                <span class="wbs-phase-actions no-capture">
                    <button class="wbs-phase-capture-btn" type="button" data-capture-phase-id="${escapeHtml(group.phaseId)}" title="Capturer cette phase en image" aria-label="Capturer cette phase en image">📸</button>
                    ${group.isUnassigned
                        ? ""
                        : `<button class="wbs-phase-add-btn" type="button" data-add-phase-id="${escapeHtml(group.phaseId)}" title="Ajouter une tâche à cette phase" aria-label="Ajouter une tâche à cette phase">+ Tâche</button>`
                    }
                </span>
                </div>
            </td>
        `;

        wbsTableBody.appendChild(phaseRow);

        if (group.rows.length === 0) {
            const emptyRow = document.createElement("tr");
            emptyRow.className = "wbs-phase-empty-row";
            emptyRow.dataset.phaseId = group.phaseId;
            emptyRow.innerHTML = `<td colspan="11" class="empty-state">Aucune tâche dans cette phase pour le moment.</td>`;
            wbsTableBody.appendChild(emptyRow);
            return;
        }

        group.rows.forEach(({ row: wbsRow, originalIndex }) => {
            const isSelected = selectedWbsRows.has(originalIndex);
            const rowId = getWbsRowId(wbsRow, originalIndex);
            const row = document.createElement("tr");

            row.dataset.rowId = rowId;
            row.dataset.phaseId = group.phaseId;
            row.style.backgroundColor = hexToRgba(phaseColor, 0.12);

            if (isSelected) {
                row.classList.add("selected-row");
            }

            const isFirst = originalIndex === 0;
            const isLast = originalIndex === lastIndex;

            row.innerHTML = `
                <td class="select-col">
                    <input
                        class="row-checkbox wbs-checkbox"
                        type="checkbox"
                        data-index="${originalIndex}"
                        aria-label="Sélectionner la ligne WBS ${originalIndex + 1}"
                        ${isSelected ? "checked" : ""}
                    />
                </td>
                <td>${originalIndex + 1}</td>
                <td class="wbs-move-cell">
                    <button class="wbs-move-btn wbs-move-up-btn" type="button" data-index="${originalIndex}" ${isFirst ? "disabled" : ""} title="Monter" aria-label="Monter la tâche">&uarr;</button>
                    <button class="wbs-move-btn wbs-move-down-btn" type="button" data-index="${originalIndex}" ${isLast ? "disabled" : ""} title="Descendre" aria-label="Descendre la tâche">&darr;</button>
                </td>
                ${createWbsEditableCell(wbsRow.task, originalIndex, "task", "wbs-task-cell")}
                <td>
                    <select class="wbs-responsable-select" data-index="${originalIndex}" data-field="responsableId">
                        ${createWbsResponsableOptions(wbsRow)}
                    </select>
                </td>
                <td class="wbs-short-cell">
                    <input class="wbs-progress-input wbs-day-input" type="number" min="1" step="1" value="${escapeHtml(wbsRow.jourDebut || "")}" data-index="${originalIndex}" data-field="jourDebut" title="Jour de début (modifiable)" />
                </td>
                ${createWbsEditableCell(wbsRow.duree, originalIndex, "duree", "wbs-short-cell wbs-duration-cell")}
                <td class="wbs-short-cell">
                    <input class="wbs-progress-input wbs-day-input" type="number" min="1" step="1" value="${escapeHtml(wbsRow.jourFin || "")}" data-index="${originalIndex}" data-field="jourFin" title="Jour de fin (modifiable)" />
                </td>
                <td class="wbs-date-cell">
                    <input class="wbs-date-input" type="date" value="${escapeHtml(wbsRow.dateDebut)}" data-index="${originalIndex}" data-field="dateDebut" readonly />
                </td>
                <td class="wbs-date-cell">
                    <input class="wbs-date-input" type="date" value="${escapeHtml(wbsRow.dateFin)}" data-index="${originalIndex}" data-field="dateFin" readonly />
                </td>
                <td class="wbs-short-cell">
                    <input class="wbs-progress-input" type="number" min="0" max="100" value="${escapeHtml(wbsRow.avancement)}" data-index="${originalIndex}" data-field="avancement" />
                </td>
            `;

            wbsTableBody.appendChild(row);
        });
    });

    bindWbsTableEvents();
    updateWbsSelectionControls();
}

function createWbsEditableCell(value, index, field, extraClass = "") {
    return `
        <td
            class="editable ${extraClass}"
            contenteditable="true"
            data-index="${index}"
            data-field="${field}"
            spellcheck="true"
        >${escapeHtml(value)}</td>
    `;
}

function bindWbsTableEvents() {
    if (!wbsTableBody) return;

    wbsTableBody.querySelectorAll(".editable").forEach((cell) => {
        cell.addEventListener("input", (event) => {
            const index = Number(event.target.dataset.index);
            const field = event.target.dataset.field;

            if (!Number.isInteger(index) || !wbsRows[index] || !field) return;

            wbsRows[index][field] = event.target.textContent.trim();

            if (field !== "duree") {
                saveWbsRows();
            }
        });

        cell.addEventListener("blur", (event) => {
            const index = Number(event.target.dataset.index);
            const field = event.target.dataset.field;

            if (!Number.isInteger(index) || !wbsRows[index]) return;

            if (field === "duree") {
                applyWbsDurationEdit(index, event.target.textContent.trim());
            }
        });
    });

    wbsTableBody.querySelectorAll(".wbs-day-input").forEach((input) => {
        input.addEventListener("change", (event) => {
            const index = Number(event.target.dataset.index);
            const field = event.target.dataset.field;

            if (!Number.isInteger(index) || !wbsRows[index] || !field) return;

            applyWbsDayEdit(index, field, event.target.value);
        });
    });

    wbsTableBody.querySelectorAll(".wbs-move-up-btn").forEach((button) => {
        button.addEventListener("click", (event) => {
            const index = Number(event.currentTarget.dataset.index);
            if (!Number.isInteger(index)) return;
            moveWbsRow(index, -1);
        });
    });

    wbsTableBody.querySelectorAll(".wbs-move-down-btn").forEach((button) => {
        button.addEventListener("click", (event) => {
            const index = Number(event.currentTarget.dataset.index);
            if (!Number.isInteger(index)) return;
            moveWbsRow(index, 1);
        });
    });

    wbsTableBody.querySelectorAll(".wbs-phase-add-btn").forEach((button) => {
        button.addEventListener("click", (event) => {
            addWbsRowToPhase(event.currentTarget.dataset.addPhaseId || "");
        });
    });

    wbsTableBody.querySelectorAll(".wbs-phase-capture-btn").forEach((button) => {
        button.addEventListener("click", async (event) => {
            event.preventDefault();
            event.stopPropagation();
            await captureWbsPhase(event.currentTarget, event.currentTarget.dataset.capturePhaseId || "");
        });
    });

    wbsTableBody.querySelectorAll(".wbs-responsable-select").forEach((select) => {
        select.addEventListener("change", (event) => {
            const index = Number(event.target.dataset.index);
            const stakeholderId = event.target.value;

            if (!Number.isInteger(index) || !wbsRows[index]) return;

            const stakeholder = stakeholders.find((person) => getStakeholderId(person) === stakeholderId);

            wbsRows[index].responsableId = stakeholderId;
            wbsRows[index].responsable = stakeholder ? getStakeholderLabel(stakeholder) : "";
            saveWbsRows();
        });
    });

    wbsTableBody.querySelectorAll(".wbs-progress-input").forEach((input) => {
        input.addEventListener("input", (event) => {
            const index = Number(event.target.dataset.index);

            if (!Number.isInteger(index) || !wbsRows[index]) return;

            event.target.value = clampNumber(event.target.value, 0, 100);
            wbsRows[index].avancement = event.target.value;
            saveWbsRows();
        });
    });

    wbsTableBody.querySelectorAll(".wbs-checkbox").forEach((checkbox) => {
        checkbox.addEventListener("change", (event) => {
            const index = Number(event.target.dataset.index);

            if (!Number.isInteger(index)) return;

            if (event.target.checked) {
                selectedWbsRows.add(index);
            } else {
                selectedWbsRows.delete(index);
            }

            updateWbsSelectionControls();
        });
    });
}

function initRaciPage() {
    stakeholders = loadStakeholders();
    phases = loadPhases();
    wbsRows = loadWbsRows();
    raciData = loadRaci();

    renderRaciTable();

    if (resetRaciButton) {
        resetRaciButton.addEventListener("click", () => {
            const confirmation = confirm("Tu veux vraiment réinitialiser toutes les lettres du RACI ?");
            if (!confirmation) return;

            raciData = {};
            saveRaci();
            renderRaciTable();
        });
    }
}


if (typeof helpTexts !== "undefined") {
    helpTexts.wbs = `
        <p>Cette page sert à construire le WBS et le planning de base du projet.</p>
        <ul>
            <li>Le bloc WBS a été réécrit proprement pour éviter les conflits de sauvegarde.</li>
            <li>Les phases sont sauvegardées directement dans les lignes WBS.</li>
            <li>Les boutons de réinitialisation remettent vraiment les phases ou le WBS à zéro.</li>
            <li>Le RACI et le GANTT relisent le WBS sauvegardé.</li>
        </ul>
    `;
}

/* V65 — Démarrage unique */



/* V66 — Nettoyeur localStorage caché dans l’aide */

function initHelp() {
    if (!helpButton || !helpModal || !helpCloseButton || !helpContent) return;

    helpButton.addEventListener("click", () => {
        helpContent.innerHTML = helpTexts[currentPage] || "<p>Aucune aide disponible pour cette page.</p>";
        injectHiddenStorageCleaner();
        helpModal.classList.remove("hidden");
    });

    helpCloseButton.addEventListener("click", closeHelp);

    helpModal.addEventListener("click", (event) => {
        if (event.target === helpModal) {
            closeHelp();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeHelp();
            hideColorMenu();
        }

        if (helpModal && !helpModal.classList.contains("hidden") && event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "k") {
            event.preventDefault();
            revealHiddenStorageCleaner();
        }
    });
}

function injectHiddenStorageCleaner() {
    if (!helpContent || document.getElementById("forge-storage-cleaner-zone")) return;

    const zone = document.createElement("div");
    zone.id = "forge-storage-cleaner-zone";
    zone.className = "storage-cleaner-zone storage-cleaner-hidden";
    zone.innerHTML = `
        <button class="btn btn-danger storage-cleaner-btn" id="forge-storage-cleaner-btn" type="button">
            Nettoyer le stockage local Forge
        </button>
        <p class="storage-cleaner-note">
            Cette action supprime les données Forge enregistrées dans ce navigateur. Exporte tes données avant si tu veux les conserver.
        </p>
    `;

    helpContent.appendChild(zone);

    const button = document.getElementById("forge-storage-cleaner-btn");
    if (button) {
        button.addEventListener("click", cleanForgeLocalStorage);
    }

    initHiddenStorageCleanerTrigger();
}

function initHiddenStorageCleanerTrigger() {
    const title = document.getElementById("help-title");
    if (!title || title.dataset.cleanerTriggerReady === "true") return;

    title.dataset.cleanerTriggerReady = "true";
    title.dataset.cleanerClicks = "0";
    title.style.cursor = "default";

    title.addEventListener("click", () => {
        if (!helpModal || helpModal.classList.contains("hidden")) return;

        const nextCount = Number(title.dataset.cleanerClicks || "0") + 1;
        title.dataset.cleanerClicks = String(nextCount);

        if (nextCount >= 5) {
            title.dataset.cleanerClicks = "0";
            revealHiddenStorageCleaner();
        }
    });
}

function revealHiddenStorageCleaner() {
    const zone = document.getElementById("forge-storage-cleaner-zone");
    if (!zone) return;

    zone.classList.remove("storage-cleaner-hidden");
    zone.classList.add("storage-cleaner-visible");

    const button = document.getElementById("forge-storage-cleaner-btn");
    if (button) {
        button.focus();
    }
}



/* V66 — Démarrage unique */



/* V68 — Pont Docker SQLite */
let forgeDbBridgeActive = false;
let forgeDbBridgeHydrating = false;



function isForgeStorageKey(key) {
    return Boolean(
        key &&
        (
            key.startsWith("forge_") ||
            key === "project_stakeholders_v7_compact_select" ||
            key.startsWith("project_stakeholders_")
        )
    );
}








async function cleanForgeLocalStorage() {
    const keys = getForgeLocalStorageKeys();

    if (keys.length === 0 && !forgeDbBridgeActive) {
        alert("Aucune donnée Forge à nettoyer dans ce navigateur.");
        return;
    }

    const firstConfirmation = confirm(
        `Cette action va supprimer les données Forge du stockage ${forgeDbBridgeActive ? "SQLite + navigateur" : "local du navigateur"}.\n\n` +
        "Pense à exporter tes données avant si tu veux les garder.\n\n" +
        "Continuer ?"
    );

    if (!firstConfirmation) return;

    const secondConfirmation = confirm(
        "Dernière confirmation : nettoyer Forge va remettre l’application à zéro.\n\n" +
        "Tu confirmes ?"
    );

    if (!secondConfirmation) return;

    forgeDbBridgeHydrating = true;

    try {
        keys.forEach((key) => localStorage.removeItem(key));
    } finally {
        forgeDbBridgeHydrating = false;
    }

    if (forgeDbBridgeActive) {
        try {
            await fetch("/api/storage", { method: "DELETE" });
        } catch (error) {
            console.warn("Forge DB : purge backend impossible.", error);
        }
    }

    alert("Stockage Forge nettoyé. L’application va se recharger.");
    window.location.reload();
}

if (typeof helpTexts !== "undefined") {
    const previousDashboardHelpV68 = helpTexts.dashboard || "";
    helpTexts.dashboard = `
        ${previousDashboardHelpV68}
        <p><strong>Mode Docker SQLite :</strong> si Forge est lancé avec Docker, les données sont synchronisées dans <code>data/forge.db</code>.</p>
    `;
}

/* V68 — Démarrage unique */



/* V70 — Correction synchro WBS vers GANTT en mode SQLite */
const FORGE_DB_PENDING_SYNC_KEY = "__forge_pending_sync_v1";



function getForgeLocalStorageKeys() {
    const keys = [];

    for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);

        if (isForgeStorageKey(key)) {
            keys.push(key);
        }
    }

    return keys;
}

function getForgePendingSyncKeys() {
    try {
        const parsed = JSON.parse(localStorage.getItem(FORGE_DB_PENDING_SYNC_KEY) || "[]");
        return Array.isArray(parsed) ? parsed.filter((key) => typeof key === "string") : [];
    } catch (error) {
        return [];
    }
}

function saveForgePendingSyncKeys(keys) {
    const uniqueKeys = Array.from(new Set(keys.filter((key) => isForgeStorageKey(key))));
    localStorage.setItem(FORGE_DB_PENDING_SYNC_KEY, JSON.stringify(uniqueKeys));
}

function markForgeKeyPendingSync(key) {
    if (!isForgeStorageKey(key)) return;

    const keys = getForgePendingSyncKeys();

    if (!keys.includes(key)) {
        keys.push(key);
        saveForgePendingSyncKeys(keys);
    }
}

function clearForgeKeyPendingSync(key) {
    const keys = getForgePendingSyncKeys().filter((item) => item !== key);

    if (keys.length === 0) {
        localStorage.removeItem(FORGE_DB_PENDING_SYNC_KEY);
    } else {
        saveForgePendingSyncKeys(keys);
    }
}

function clearForgePendingSyncKeys() {
    localStorage.removeItem(FORGE_DB_PENDING_SYNC_KEY);
}

function getForgeLocalStorageSnapshot() {
    const snapshot = {};

    getForgeLocalStorageKeys().forEach((key) => {
        snapshot[key] = localStorage.getItem(key) ?? "";
    });

    return snapshot;
}

async function initForgeDbBridge() {
    if (window.forgeDbBridgeReady) return;
    window.forgeDbBridgeReady = true;

    if (window.location.protocol === "file:") {
        forgeDbBridgeActive = false;
        return;
    }

    try {
        const localSnapshot = getForgeLocalStorageSnapshot();
        const pendingKeys = getForgePendingSyncKeys();

        const healthResponse = await fetch("/api/health", {
            method: "GET",
            cache: "no-store"
        });

        if (!healthResponse.ok) {
            forgeDbBridgeActive = false;
            return;
        }

        const storageResponse = await fetch("/api/storage", {
            method: "GET",
            cache: "no-store"
        });

        if (!storageResponse.ok) {
            forgeDbBridgeActive = false;
            return;
        }

        const payload = await storageResponse.json();
        const entries = payload.entries && typeof payload.entries === "object" ? payload.entries : {};

        hydrateForgeStorageFromDb(entries, localSnapshot, pendingKeys);
        patchForgeLocalStorageSync();

        forgeDbBridgeActive = true;

        await syncAllForgeStorageToDb();

        console.info("Forge DB : stockage SQLite actif, synchro renforcée.");
    } catch (error) {
        forgeDbBridgeActive = false;
        console.warn("Forge DB : backend SQLite indisponible, fallback localStorage.", error);
    }
}

function shouldPreferLocalForgeValue(key, localSnapshot, pendingKeys) {
    if (!Object.prototype.hasOwnProperty.call(localSnapshot, key)) return false;

    if (pendingKeys.includes(key)) return true;

    if (/_wbs_v1$/.test(key) || /_phases_v1$/.test(key) || /_wbs_settings_v1$/.test(key)) {
        return true;
    }

    return false;
}

function hydrateForgeStorageFromDb(entries, localSnapshot = {}, pendingKeys = []) {
    forgeDbBridgeHydrating = true;

    try {
        const allKeys = new Set([
            ...getForgeLocalStorageKeys(),
            ...Object.keys(entries || {})
        ]);

        allKeys.forEach((key) => {
            if (!isForgeStorageKey(key)) return;

            if (shouldPreferLocalForgeValue(key, localSnapshot, pendingKeys)) {
                localStorage.setItem(key, String(localSnapshot[key] ?? ""));
                markForgeKeyPendingSync(key);
                return;
            }

            if (Object.prototype.hasOwnProperty.call(entries, key)) {
                localStorage.setItem(key, String(entries[key] ?? ""));
            } else {
                localStorage.removeItem(key);
            }
        });
    } finally {
        forgeDbBridgeHydrating = false;
    }
}

function patchForgeLocalStorageSync() {
    if (window.forgeLocalStoragePatched) return;
    window.forgeLocalStoragePatched = true;

    const originalSetItem = Storage.prototype.setItem;
    const originalRemoveItem = Storage.prototype.removeItem;
    const originalClear = Storage.prototype.clear;

    Storage.prototype.setItem = function patchedSetItem(key, value) {
        originalSetItem.call(this, key, value);

        if (this === window.localStorage && forgeDbBridgeActive && !forgeDbBridgeHydrating && isForgeStorageKey(key)) {
            markForgeKeyPendingSync(key);
            syncForgeStorageKeyToDb(key, String(value ?? ""));
        }
    };

    Storage.prototype.removeItem = function patchedRemoveItem(key) {
        originalRemoveItem.call(this, key);

        if (this === window.localStorage && forgeDbBridgeActive && !forgeDbBridgeHydrating && isForgeStorageKey(key)) {
            clearForgeKeyPendingSync(key);
            deleteForgeStorageKeyFromDb(key);
        }
    };

    Storage.prototype.clear = function patchedClear() {
        const forgeKeys = this === window.localStorage ? getForgeLocalStorageKeys() : [];
        originalClear.call(this);

        if (this === window.localStorage && forgeDbBridgeActive && !forgeDbBridgeHydrating && forgeKeys.length > 0) {
            clearForgePendingSyncKeys();
            clearForgeStorageDb();
        }
    };
}

function syncForgeStorageKeyToDb(key, value) {
    if (!forgeDbBridgeActive || !isForgeStorageKey(key)) return Promise.resolve();

    return fetch(`/api/storage/${encodeURIComponent(key)}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ value }),
        keepalive: true
    })
        .then((response) => {
            if (response.ok) {
                clearForgeKeyPendingSync(key);
            }
        })
        .catch((error) => {
            console.warn(`Forge DB : synchronisation impossible pour ${key}`, error);
        });
}

function deleteForgeStorageKeyFromDb(key) {
    if (!forgeDbBridgeActive || !isForgeStorageKey(key)) return Promise.resolve();

    return fetch(`/api/storage/${encodeURIComponent(key)}`, {
        method: "DELETE",
        keepalive: true
    }).catch((error) => {
        console.warn(`Forge DB : suppression impossible pour ${key}`, error);
    });
}

function clearForgeStorageDb() {
    if (!forgeDbBridgeActive) return Promise.resolve();

    return fetch("/api/storage", {
        method: "DELETE",
        keepalive: true
    }).catch((error) => {
        console.warn("Forge DB : purge SQLite impossible.", error);
    });
}

function getForgeStorageEntriesForSync() {
    const entries = {};

    getForgeLocalStorageKeys().forEach((key) => {
        entries[key] = localStorage.getItem(key) ?? "";
    });

    return entries;
}

function syncAllForgeStorageToDb() {
    if (!forgeDbBridgeActive) return Promise.resolve();

    const entries = getForgeStorageEntriesForSync();

    return fetch("/api/storage/bulk", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ entries }),
        keepalive: true
    })
        .then((response) => {
            if (response.ok) {
                clearForgePendingSyncKeys();
            }
        })
        .catch((error) => {
            console.warn("Forge DB : synchronisation globale impossible.", error);
        });
}

function sendForgeStorageBeacon() {
    if (!forgeDbBridgeActive) return;

    const entries = getForgeStorageEntriesForSync();
    const payload = JSON.stringify({ entries });

    try {
        if (navigator.sendBeacon) {
            const blob = new Blob([payload], { type: "application/json" });
            navigator.sendBeacon("/api/storage/bulk", blob);
            return;
        }
    } catch (error) {
        console.warn("Forge DB : beacon indisponible.", error);
    }

    syncAllForgeStorageToDb();
}

function initForgeDbNavigationSync() {
    if (window.forgeDbNavigationSyncReady) return;
    window.forgeDbNavigationSyncReady = true;

    document.addEventListener("click", async (event) => {
        const link = event.target.closest?.("a[href]");

        if (!link || !forgeDbBridgeActive) return;

        const href = link.getAttribute("href") || "";

        if (!href || href.startsWith("#") || href.startsWith("http") || link.target === "_blank") return;
        if (link.hasAttribute("download")) return;

        event.preventDefault();

        await syncAllForgeStorageToDb();

        window.location.href = link.href;
    }, true);

    window.addEventListener("pagehide", sendForgeStorageBeacon);
    window.addEventListener("beforeunload", sendForgeStorageBeacon);
}

function saveWbsRows() {
    const rows = normalizeWbsRows(wbsRows);
    wbsRows = rows;
    localStorage.setItem(getProjectKey("wbs"), JSON.stringify(rows));
    clearLegacyWbsPhaseAssignments();
    syncAllForgeStorageToDb();
}

function saveWbsRowsWithSchedule() {
    wbsRows = applyWbsAutoSchedule(normalizeWbsRows(wbsRows));
    localStorage.setItem(getProjectKey("wbs"), JSON.stringify(wbsRows));
    clearLegacyWbsPhaseAssignments();
    syncAllForgeStorageToDb();
}

function recalculateWbsSchedule(shouldSave = false) {
    wbsRows = applyWbsAutoSchedule(normalizeWbsRows(wbsRows));

    if (shouldSave) {
        localStorage.setItem(getProjectKey("wbs"), JSON.stringify(wbsRows));
        clearLegacyWbsPhaseAssignments();
        syncAllForgeStorageToDb();
    }
}


if (typeof helpTexts !== "undefined") {
    const previousGanttHelpV70 = helpTexts.gantt || "";
    helpTexts.gantt = `
        ${previousGanttHelpV70}
        <p><strong>Synchro NAS :</strong> le GANTT force maintenant la relecture du WBS synchronisé depuis SQLite/localStorage.</p>
    `;
}

/* V70 — Démarrage unique */


/* V71 — Fix GANTT + revue sécurité */
/* V78 — Périodes spéciales (vacances / formations) affichées dans le GANTT */

function getGanttPeriodTypeLabel(type) {
    return type === "formation" ? "Formation" : "Vacances";
}

function loadGanttPeriods() {
    const savedData = localStorage.getItem(getProjectKey("gantt_periods"));

    if (!savedData) return [];

    try {
        const parsed = JSON.parse(savedData);
        if (!Array.isArray(parsed)) return [];

        return parsed.map((period) => ({
            id: period.id || createId(),
            type: period.type === "formation" ? "formation" : "vacances",
            label: period.label || "",
            startDate: period.startDate || "",
            endDate: period.endDate || ""
        }));
    } catch (error) {
        console.error("Impossible de charger les périodes GANTT :", error);
        return [];
    }
}

function saveGanttPeriods() {
    localStorage.setItem(getProjectKey("gantt_periods"), JSON.stringify(ganttPeriods));
}

function getGanttPeriodForDay(day, periods) {
    if (!Array.isArray(periods) || periods.length === 0) return null;

    const current = startOfForgeDay(day);

    return periods.find((period) => {
        const start = parseForgeDate(period.startDate);
        const end = parseForgeDate(period.endDate);
        if (!start || !end) return false;

        const rangeStart = startOfForgeDay(start);
        const rangeEnd = startOfForgeDay(end);
        const [lower, upper] = rangeStart <= rangeEnd ? [rangeStart, rangeEnd] : [rangeEnd, rangeStart];

        return current >= lower && current <= upper;
    }) || null;
}

function refreshGanttView() {
    renderGantt(
        document.getElementById("gantt-table-head"),
        document.getElementById("gantt-table-body"),
        document.getElementById("gantt-summary")
    );
}

function renderGanttPeriodsTable() {
    const body = document.getElementById("gantt-periods-table-body");
    if (!body) return;

    if (ganttPeriods.length === 0) {
        body.innerHTML = `<tr><td colspan="5" class="empty-state">Aucune période particulière définie.</td></tr>`;
        return;
    }

    body.innerHTML = ganttPeriods.map((period, index) => `
        <tr data-index="${index}">
            <td>
                <select class="gantt-period-type-select" data-index="${index}">
                    <option value="vacances" ${period.type === "vacances" ? "selected" : ""}>Vacances</option>
                    <option value="formation" ${period.type === "formation" ? "selected" : ""}>Formation</option>
                </select>
            </td>
            <td class="editable" contenteditable="true" data-index="${index}" spellcheck="true">${escapeHtml(period.label)}</td>
            <td class="wbs-date-cell">
                <input class="wbs-date-input" type="date" value="${escapeHtml(period.startDate)}" data-index="${index}" data-field="startDate" />
            </td>
            <td class="wbs-date-cell">
                <input class="wbs-date-input" type="date" value="${escapeHtml(period.endDate)}" data-index="${index}" data-field="endDate" />
            </td>
            <td class="select-col">
                <button class="row-delete-btn" type="button" data-remove-period="${index}" title="Retirer" aria-label="Retirer cette période">&times;</button>
            </td>
        </tr>
    `).join("");

    bindGanttPeriodsEvents();
}

function bindGanttPeriodsEvents() {
    const body = document.getElementById("gantt-periods-table-body");
    if (!body) return;

    body.querySelectorAll(".gantt-period-type-select").forEach((select) => {
        select.addEventListener("change", (event) => {
            const index = Number(event.target.dataset.index);
            if (!ganttPeriods[index]) return;

            ganttPeriods[index].type = event.target.value === "formation" ? "formation" : "vacances";
            saveGanttPeriods();
            refreshGanttView();
        });
    });

    body.querySelectorAll(".editable").forEach((cell) => {
        cell.addEventListener("input", (event) => {
            const index = Number(event.target.dataset.index);
            if (!ganttPeriods[index]) return;

            ganttPeriods[index].label = event.target.textContent.trim();
            saveGanttPeriods();
        });

        cell.addEventListener("blur", () => {
            refreshGanttView();
        });
    });

    body.querySelectorAll(".wbs-date-input").forEach((input) => {
        input.addEventListener("change", (event) => {
            const index = Number(event.target.dataset.index);
            const field = event.target.dataset.field;
            if (!ganttPeriods[index] || !field) return;

            ganttPeriods[index][field] = event.target.value;
            saveGanttPeriods();
            refreshGanttView();
        });
    });

    body.querySelectorAll("[data-remove-period]").forEach((button) => {
        button.addEventListener("click", (event) => {
            const index = Number(event.currentTarget.dataset.removePeriod);

            ganttPeriods = ganttPeriods.filter((_, itemIndex) => itemIndex !== index);
            saveGanttPeriods();
            renderGanttPeriodsTable();
            refreshGanttView();
        });
    });
}

function initGanttPage() {
    const ganttHead = document.getElementById("gantt-table-head");
    const ganttBody = document.getElementById("gantt-table-body");
    const ganttSummary = document.getElementById("gantt-summary");

    if (!ganttHead || !ganttBody) return;

    phases = loadPhases();
    wbsRows = loadWbsRows();
    ganttPeriods = loadGanttPeriods();

    renderGanttPeriodsTable();
    renderGantt(ganttHead, ganttBody, ganttSummary);

    document.getElementById("add-gantt-period-btn")?.addEventListener("click", () => {
        ganttPeriods.push({ id: createId(), type: "vacances", label: "", startDate: "", endDate: "" });
        saveGanttPeriods();
        renderGanttPeriodsTable();

        document.querySelector("#gantt-periods-table-body tr:last-child .editable")?.focus();
    });

    document.getElementById("reset-gantt-periods-btn")?.addEventListener("click", () => {
        if (ganttPeriods.length === 0) return;
        if (!confirm("Tu veux vraiment supprimer toutes les périodes spéciales ?")) return;

        ganttPeriods = [];
        saveGanttPeriods();
        renderGanttPeriodsTable();
        refreshGanttView();
    });
}

if (typeof helpTexts !== "undefined") {
    const previousGanttHelpV71 = helpTexts.gantt || "";
    helpTexts.gantt = `
        ${previousGanttHelpV71}
        <p><strong>Correction V71 :</strong> le GANTT reçoit à nouveau les bons éléments HTML avant le rendu. Les changements du WBS sont donc relus et affichés correctement.</p>
    `;
}

/* V71 — Démarrage unique */



/* V72 — GANTT : suppression colonne Responsable + tâche élargie */



function buildGanttHeader(days) {
    const monthCells = [];
    let currentMonthKey = "";
    let currentMonthStartIndex = 0;

    days.forEach((day, index) => {
        const key = `${day.getFullYear()}-${day.getMonth()}`;

        if (!currentMonthKey) {
            currentMonthKey = key;
            currentMonthStartIndex = index;
        }

        if (key !== currentMonthKey) {
            const previousDay = days[index - 1];
            monthCells.push({
                label: formatForgeMonth(previousDay),
                span: index - currentMonthStartIndex
            });

            currentMonthKey = key;
            currentMonthStartIndex = index;
        }

        if (index === days.length - 1) {
            monthCells.push({
                label: formatForgeMonth(day),
                span: index - currentMonthStartIndex + 1
            });
        }
    });

    const today = startOfForgeDay(new Date());

    const monthHeader = `
        <tr>
            <th class="gantt-sticky gantt-left-number" rowspan="2">N°</th>
            <th class="gantt-sticky gantt-left-task" rowspan="2">Tâche / Livrable</th>
            <th class="gantt-sticky gantt-left-start" rowspan="2">Début</th>
            <th class="gantt-sticky gantt-left-end" rowspan="2">Fin</th>
            <th class="gantt-sticky gantt-left-progress" rowspan="2">Av.</th>
            ${monthCells.map((month) => `<th class="gantt-month-header" colspan="${month.span}">${escapeHtml(month.label)}</th>`).join("")}
        </tr>
    `;

    const dayHeader = `
        <tr>
            ${days.map((day) => `
                <th class="gantt-day-header ${isSameForgeDay(day, today) ? "today" : ""}">
                    <span class="gantt-day-number">${String(day.getDate()).padStart(2, "0")}</span>
                    <span class="gantt-day-name">${formatForgeWeekday(day)}</span>
                </th>
            `).join("")}
        </tr>
    `;

    return monthHeader + dayHeader;
}

function buildGanttTaskRow(task, days) {
    const progress = clampPercent(task.row.avancement);
    const activeDayIndexes = days
        .map((day, index) => isDateInGanttTask(day, task) ? index : null)
        .filter((index) => index !== null);
    const progressCellCount = Math.round(activeDayIndexes.length * (progress / 100));

    return `
        <td class="gantt-sticky gantt-left-number gantt-small-info">${task.originalIndex + 1}</td>
        <td class="gantt-sticky gantt-left-task gantt-task-info">${escapeHtml(task.row.task || "Tâche / livrable sans nom")}</td>
        <td class="gantt-sticky gantt-left-start gantt-small-info">${task.start ? formatForgeDate(task.start) : "—"}</td>
        <td class="gantt-sticky gantt-left-end gantt-small-info">${task.end ? formatForgeDate(task.end) : "—"}</td>
        <td class="gantt-sticky gantt-left-progress gantt-small-info">${progress}%</td>
        ${days.map((day, index) => {
            const isActive = activeDayIndexes.includes(index);
            const activePosition = activeDayIndexes.indexOf(index);
            const isProgress = isActive && activePosition >= 0 && activePosition < progressCellCount;
            const isStart = task.start && isSameForgeDay(day, task.start);
            const isEnd = task.end && isSameForgeDay(day, task.end);
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const isToday = isSameForgeDay(day, startOfForgeDay(new Date()));
            const classes = [
                "gantt-day-cell",
                isWeekend ? "weekend" : "",
                isToday ? "today" : "",
                isActive ? "gantt-bar-cell" : "",
                isProgress ? "gantt-progress-cell" : "",
                isStart ? "gantt-start-cell" : "",
                isEnd ? "gantt-end-cell" : ""
            ].filter(Boolean).join(" ");

            return `<td class="${classes}" title="${escapeHtml(task.row.task || "")} · ${formatForgeDate(day)}"></td>`;
        }).join("")}
    `;
}

if (typeof helpTexts !== "undefined") {
    const previousGanttHelpV72 = helpTexts.gantt || "";
    helpTexts.gantt = `
        ${previousGanttHelpV72}
        <p><strong>Présentation :</strong> la colonne Responsable a été retirée du GANTT pour donner plus de largeur aux tâches.</p>
    `;
}

/* V72 — Démarrage unique */



/* V76 — GANTT : rendu grille scrollable, fin du tableau compressé */




function buildGanttGridLeftPhase(row) {
    return `
        <div class="gantt-v76-left-phase" style="--gantt-color: ${escapeHtml(row.color)}; --gantt-color-soft: ${escapeHtml(hexToRgba(row.color, 0.26))};">
            <span class="gantt-v76-phase-dot"></span>
            <span>${escapeHtml(row.label)}</span>
        </div>
    `;
}

function buildGanttGridLeftTask(row) {
    const task = row.task;
    const progress = clampPercent(task.row.avancement);

    return `
        <div class="gantt-v76-left-task-row" style="--gantt-color: ${escapeHtml(row.color)};">
            <div class="gantt-v76-number">${task.originalIndex + 1}</div>
            <div class="gantt-v76-task-name" title="${escapeHtml(task.row.task || "Tâche / livrable sans nom")}">${escapeHtml(task.row.task || "Tâche / livrable sans nom")}</div>
            <div class="gantt-v76-date-info">${task.start ? formatForgeDate(task.start) : "—"}</div>
            <div class="gantt-v76-date-info">${task.end ? formatForgeDate(task.end) : "—"}</div>
            <div class="gantt-v76-progress-info">${progress}%</div>
        </div>
    `;
}

function buildGanttGridTimelinePhase(row, days) {
    return `
        <div class="gantt-v76-timeline-phase" style="--gantt-color: ${escapeHtml(row.color)}; --gantt-color-soft: ${escapeHtml(hexToRgba(row.color, 0.26))};">
            ${days.map(() => `<div></div>`).join("")}
        </div>
    `;
}


function buildGanttMonthCells(days) {
    const monthCells = [];
    let currentMonthKey = "";
    let currentMonthStartIndex = 0;

    days.forEach((day, index) => {
        const key = `${day.getFullYear()}-${day.getMonth()}`;

        if (!currentMonthKey) {
            currentMonthKey = key;
            currentMonthStartIndex = index;
        }

        if (key !== currentMonthKey) {
            const previousDay = days[index - 1];
            monthCells.push({
                label: formatForgeMonth(previousDay),
                span: index - currentMonthStartIndex
            });

            currentMonthKey = key;
            currentMonthStartIndex = index;
        }

        if (index === days.length - 1) {
            monthCells.push({
                label: formatForgeMonth(day),
                span: index - currentMonthStartIndex + 1
            });
        }
    });

    return monthCells;
}

function formatForgeFullDateLabel(date) {
    return date.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
}

function formatForgeShortWeekday(date) {
    return date.toLocaleDateString("fr-FR", {
        weekday: "short"
    }).replace(".", "").slice(0, 3).toLowerCase();
}

if (typeof helpTexts !== "undefined") {
    const previousGanttHelpV76 = helpTexts.gantt || "";
    helpTexts.gantt = `
        ${previousGanttHelpV76}
        <p><strong>Correction V76 :</strong> le GANTT n’est plus un tableau compressé. La frise est maintenant une grille horizontale scrollable avec des jours à largeur fixe.</p>
    `;
}

/* V76 — Démarrage unique */



/* V77 — GANTT compact + week-ends + capture grille */
function forgeBootstrap() {
    bootstrapForgeAsync();
}

async function bootstrapForgeAsync() {
    await initForgeDbBridge();

    initProjects();
    initThemeSwitcher();
    initProjectInfo();
    initProjectSwitcher();
    initPortableDataControls();
    initHelp();
    initNoEnterInEditableFields();

    if (currentPage === "dashboard") initDashboardPage();
    if (currentPage === "context") initContextPage();
    if (currentPage === "scope") initScopePage();
    if (V44_REDACTION_PAGES.includes(currentPage) && currentPage !== "scope") initRedactionPage(currentPage);
    if (currentPage === "competences") initCompetencesPage();
    if (currentPage === "stakeholders") initStakeholdersPage();
    if (currentPage === "swot") initSwotPage();
    if (currentPage === "risks") initRisksPage();
    if (currentPage === "wbs") initWbsPage();
    if (currentPage === "raci") initRaciPage();
    if (currentPage === "gantt") initGanttPage();
    if (currentPage === "smart") initSmartPage();
    if (currentPage === "kpis") initKpisPage();
    if (currentPage === "vmsizing" && typeof initVmSizingPage === "function") initVmSizingPage();
    if (currentPage === "decoupage") initDecoupagePage();

    initCaptureButtons();
    initForgeDbNavigationSync();
}

function renderGantt(ganttHead, ganttBody, ganttSummary) {
    const wrapper = document.getElementById("gantt-wrapper");
    if (!wrapper) return;

    const projectInfo = loadProjectInfo();
    const projectStart = parseForgeDate(projectInfo.startDate);
    const projectEnd = parseForgeDate(projectInfo.endDate);
    const wbsSettings = loadWbsSettings();

    const plannedTasks = wbsRows
        .map((row, index) => buildGanttTask(row, index, projectStart))
        .filter((task) => task.row.task || task.start || task.end);

    const validTasks = plannedTasks.filter((task) => task.start && task.end);
    const timelineStart = projectStart || getMinDate(validTasks.map((task) => task.start));
    const timelineEnd = projectEnd || getMaxDate(validTasks.map((task) => task.end));

    renderGanttPhaseTabs(plannedTasks, ganttHead, ganttBody, ganttSummary);

    if (!timelineStart || !timelineEnd || timelineEnd < timelineStart) {
        wrapper.innerHTML = `
            <div class="gantt-v76-empty">
                Ajoute une date de début et une date de fin au projet, puis complète le WBS pour générer le GANTT.
            </div>
        `;

        if (ganttSummary) {
            ganttSummary.textContent = "Gantt en attente de dates projet / WBS.";
        }

        return;
    }

    const activeFilter = getActiveGanttPhaseFilter();
    const availablePhaseIds = new Set(plannedTasks.map((task) => task.phaseId || "__no_phase__"));
    const normalizedFilter = activeFilter === "__all__" || availablePhaseIds.has(activeFilter)
        ? activeFilter
        : "__all__";

    if (normalizedFilter !== activeFilter) {
        saveActiveGanttPhaseFilter(normalizedFilter);
        renderGanttPhaseTabs(plannedTasks, ganttHead, ganttBody, ganttSummary);
    }

    const visibleTasks = normalizedFilter === "__all__"
        ? plannedTasks
        : plannedTasks.filter((task) => (task.phaseId || "__no_phase__") === normalizedFilter);

    if (visibleTasks.length === 0) {
        wrapper.innerHTML = `
            <div class="gantt-v76-empty">
                Aucune tâche WBS dans cette phase pour le moment.
            </div>
        `;

        if (ganttSummary) {
            ganttSummary.textContent = "Aucune tâche à afficher pour cette phase.";
        }

        return;
    }

    const visibleValidTasks = visibleTasks.filter((task) => task.start && task.end);

    // Quand une seule phase est sélectionnée, la frise ne doit couvrir que
    // les dates réelles de ses tâches, pas tout le calendrier du projet.
    const rangeStart = normalizedFilter === "__all__"
        ? timelineStart
        : (getMinDate(visibleValidTasks.map((task) => task.start)) || timelineStart);
    const rangeEnd = normalizedFilter === "__all__"
        ? timelineEnd
        : (getMaxDate(visibleValidTasks.map((task) => task.end)) || timelineEnd);

    const days = buildGanttDisplayDateRange(rangeStart, rangeEnd);
    const groupedTasks = groupGanttTasksByPhase(visibleTasks);
    ganttPeriods = loadGanttPeriods();
    const board = buildGanttGridBoard(groupedTasks, days, wbsSettings, ganttPeriods);

    wrapper.innerHTML = board;

    if (ganttSummary) {
        const phaseLabel = normalizedFilter === "__all__"
            ? "Toutes les phases"
            : getGanttPhaseNameFromId(normalizedFilter);
        const weekendLabel = wbsSettings.weekendsWorked ? "week-ends inclus" : "week-ends masqués";

        ganttSummary.textContent = `${phaseLabel} · ${formatForgeDate(rangeStart)} → ${formatForgeDate(rangeEnd)} · ${days.length} jour${days.length > 1 ? "s" : ""} affiché${days.length > 1 ? "s" : ""} · ${visibleValidTasks.length} tâche${visibleValidTasks.length > 1 ? "s" : ""} planifiée${visibleValidTasks.length > 1 ? "s" : ""} · ${weekendLabel}`;
    }
}

function buildGanttDisplayDateRange(start, end) {
    // Les week-ends restent toujours visibles dans la frise (grisés s'ils ne
    // sont pas travaillés) : seule la planification des tâches (WBS) saute
    // les week-ends non travaillés, pas l'affichage de la grille.
    const dates = [];
    let current = startOfForgeDay(start);
    const finalDate = startOfForgeDay(end);

    while (current <= finalDate) {
        dates.push(current);
        current = addForgeDays(current, 1);
    }

    return dates;
}

function buildGanttGridBoard(groupedTasks, days, wbsSettings = loadWbsSettings(), periods = []) {
    const monthCells = buildGanttMonthCells(days);
    const rows = [];

    groupedTasks.forEach((group) => {
        const phaseColor = group.phase ? normalizeColor(group.phase.color, 0) : "#94a3b8";
        const phaseName = group.phase ? group.phase.name || "Phase sans nom" : "Sans phase";

        rows.push({
            type: "phase",
            label: phaseName,
            color: phaseColor,
            group
        });

        group.tasks.forEach((task) => {
            rows.push({
                type: "task",
                task,
                color: phaseColor
            });
        });
    });

    return `
        <div class="gantt-v76-board gantt-v77-board" style="--gantt-days: ${days.length};" data-weekends-worked="${wbsSettings.weekendsWorked ? "true" : "false"}">
            <div class="gantt-v76-left">
                <div class="gantt-v76-left-header">
                    <div>N°</div>
                    <div>Tâche / Livrable</div>
                    <div>Début</div>
                    <div>Fin</div>
                    <div>Av.</div>
                </div>
                ${rows.map((row) => row.type === "phase" ? buildGanttGridLeftPhase(row) : buildGanttGridLeftTask(row)).join("")}
            </div>
            <div class="gantt-v76-timeline-scroll">
                <div class="gantt-v76-timeline" style="--gantt-days: ${days.length};">
                    <div class="gantt-v76-month-row">
                        ${monthCells.map((month) => `
                            <div class="gantt-v76-month-cell" style="grid-column: span ${month.span};">
                                ${escapeHtml(month.label)}
                            </div>
                        `).join("")}
                    </div>
                    <div class="gantt-v76-weekday-row">
                        ${days.map((day) => {
                            const period = getGanttPeriodForDay(day, periods);
                            return `
                            <div class="gantt-v76-weekday-cell ${isForgeWeekend(day) ? "weekend" : ""} ${period ? `period-${period.type}` : ""}" title="${escapeHtml(formatForgeFullDateLabel(day))}${period ? " · " + escapeHtml(getGanttPeriodTypeLabel(period.type)) : ""}">
                                ${escapeHtml(formatForgeShortWeekday(day))}
                            </div>
                        `;
                        }).join("")}
                    </div>
                    <div class="gantt-v76-date-row">
                        ${days.map((day) => {
                            const period = getGanttPeriodForDay(day, periods);
                            return `
                            <div class="gantt-v76-date-cell ${isForgeWeekend(day) ? "weekend" : ""} ${period ? `period-${period.type}` : ""} ${isSameForgeDay(day, startOfForgeDay(new Date())) ? "today" : ""}" title="${escapeHtml(formatForgeFullDateLabel(day))}${period ? " · " + escapeHtml(getGanttPeriodTypeLabel(period.type)) + (period.label ? " (" + escapeHtml(period.label) + ")" : "") : ""}">
                                ${String(day.getDate()).padStart(2, "0")}
                            </div>
                        `;
                        }).join("")}
                    </div>
                    ${rows.map((row) => row.type === "phase" ? buildGanttGridTimelinePhase(row, days) : buildGanttGridTimelineTask(row, days, wbsSettings, periods)).join("")}
                </div>
            </div>
        </div>
    `;
}

function buildGanttGridTimelineTask(row, days, wbsSettings = loadWbsSettings(), periods = []) {
    const task = row.task;
    const progress = clampPercent(task.row.avancement);
    const activeDayIndexes = days
        .map((day, index) => isDateInGanttTaskWithSettings(day, task, wbsSettings, periods) ? index : null)
        .filter((index) => index !== null);
    const progressCellCount = Math.round(activeDayIndexes.length * (progress / 100));

    return `
        <div class="gantt-v76-day-row" style="--gantt-color: ${escapeHtml(row.color)}; --gantt-color-soft: ${escapeHtml(hexToRgba(row.color, 0.22))}; --gantt-color-strong: ${escapeHtml(hexToRgba(row.color, 0.72))};">
            ${days.map((day, index) => {
                const isActive = activeDayIndexes.includes(index);
                const activePosition = activeDayIndexes.indexOf(index);
                const isProgress = isActive && activePosition >= 0 && activePosition < progressCellCount;
                const isStart = task.start && isSameForgeDay(day, task.start);
                const isEnd = task.end && isSameForgeDay(day, task.end);
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                const isToday = isSameForgeDay(day, startOfForgeDay(new Date()));
                const period = getGanttPeriodForDay(day, periods);
                const classes = [
                    "gantt-v76-day-cell",
                    isWeekend ? "weekend" : "",
                    period ? `period-${period.type}` : "",
                    isToday ? "today" : "",
                    isActive ? "active" : "",
                    isProgress ? "progress" : "",
                    isStart ? "start" : "",
                    isEnd ? "end" : ""
                ].filter(Boolean).join(" ");

                const periodTitle = period ? ` · ${escapeHtml(getGanttPeriodTypeLabel(period.type))}${period.label ? " (" + escapeHtml(period.label) + ")" : ""}` : "";

                return `<div class="${classes}" title="${escapeHtml(task.row.task || "")} · ${formatForgeDate(day)}${periodTitle}"></div>`;
            }).join("")}
        </div>
    `;
}

function isDateInGanttTaskWithSettings(day, task, wbsSettings = loadWbsSettings(), periods = []) {
    if (!task.start || !task.end) return false;

    const current = startOfForgeDay(day);
    const isWeekend = current.getDay() === 0 || current.getDay() === 6;

    if (!wbsSettings.weekendsWorked && isWeekend) return false;
    if (getGanttPeriodForDay(current, periods)) return false;

    return current >= task.start && current <= task.end;
}

/* V80 — Découpage : phases/étapes simplifiées, synchronisées automatiquement vers le WBS */

// Le Découpage ne stocke jamais rien directement dans "phases" / "wbsRows" :
// il a ses propres tableaux (decoupagePhases / decoupageSteps), et
// syncDecoupageToWbs() se contente d'y faire correspondre des entrées dans
// le WBS réel via un id partagé. Comme decoupagePhases/decoupageSteps sont
// vides tant qu'on n'a rien créé sur la page Découpage, la synchro ne touche
// jamais un WBS existant qui n'a pas été construit depuis cette page.
function loadDecoupagePhases() {
    const savedData = localStorage.getItem(getProjectKey("decoupage_phases"));
    if (!savedData) return [];

    try {
        const parsed = JSON.parse(savedData);
        if (!Array.isArray(parsed)) return [];

        return parsed.map((phase) => ({
            id: phase.id || createId(),
            name: phase.name || ""
        }));
    } catch (error) {
        console.error("Impossible de charger les phases du découpage :", error);
        return [];
    }
}

function saveDecoupagePhases() {
    localStorage.setItem(getProjectKey("decoupage_phases"), JSON.stringify(decoupagePhases));
}

function loadDecoupageSteps() {
    const savedData = localStorage.getItem(getProjectKey("decoupage_steps"));
    if (!savedData) return [];

    try {
        const parsed = JSON.parse(savedData);
        if (!Array.isArray(parsed)) return [];

        return parsed.map((step) => ({
            id: step.id || createId(),
            phaseId: step.phaseId || "",
            label: step.label || ""
        }));
    } catch (error) {
        console.error("Impossible de charger les étapes du découpage :", error);
        return [];
    }
}

function saveDecoupageSteps() {
    localStorage.setItem(getProjectKey("decoupage_steps"), JSON.stringify(decoupageSteps));
}

function loadDecoupageSynced() {
    const savedData = localStorage.getItem(getProjectKey("decoupage_synced"));
    if (!savedData) return { phaseIds: [], stepIds: [] };

    try {
        const parsed = JSON.parse(savedData);
        return {
            phaseIds: Array.isArray(parsed.phaseIds) ? parsed.phaseIds : [],
            stepIds: Array.isArray(parsed.stepIds) ? parsed.stepIds : []
        };
    } catch (error) {
        console.error("Impossible de charger l'état de synchro du découpage :", error);
        return { phaseIds: [], stepIds: [] };
    }
}

function saveDecoupageSynced(synced) {
    localStorage.setItem(getProjectKey("decoupage_synced"), JSON.stringify(synced));
}

function createNewWbsRowFromDecoupage(step) {
    return {
        id: step.id,
        phaseId: step.phaseId || "",
        task: step.label || "",
        responsable: "",
        responsableId: "",
        jourDebut: "",
        duree: "1",
        jourFin: "",
        dateDebut: "",
        dateFin: "",
        avancement: "0",
        commentaire: ""
    };
}

// Synchro à sens unique Découpage -> WBS. On ne touche jamais une phase ou
// une ligne WBS qui n'a pas été créée depuis le Découpage : on ne supprime
// que ce que la synchro précédente avait elle-même créé (via decoupage_synced).
function syncDecoupageToWbs() {
    const previousSynced = loadDecoupageSynced();
    const currentPhaseIds = decoupagePhases.map((phase) => phase.id);
    const currentStepIds = decoupageSteps.map((step) => step.id);
    const currentPhaseIdSet = new Set(currentPhaseIds);
    const currentStepIdSet = new Set(currentStepIds);

    phases = phases.filter((phase) => !(previousSynced.phaseIds.includes(phase.id) && !currentPhaseIdSet.has(phase.id)));

    decoupagePhases.forEach((dPhase) => {
        const existing = phases.find((phase) => phase.id === dPhase.id);
        if (existing) {
            existing.name = dPhase.name;
        } else {
            phases.push({
                id: dPhase.id,
                name: dPhase.name,
                color: predefinedColors[phases.length % predefinedColors.length]
            });
        }
    });

    wbsRows = wbsRows.filter((row) => !(previousSynced.stepIds.includes(row.id) && !currentStepIdSet.has(row.id)));

    decoupageSteps.forEach((step) => {
        const existing = wbsRows.find((row) => row.id === step.id);
        if (existing) {
            existing.task = step.label;
            existing.phaseId = step.phaseId;
        } else {
            wbsRows.push(createNewWbsRowFromDecoupage(step));
        }
    });

    savePhases();
    saveWbsRowsWithSchedule();
    saveDecoupageSynced({ phaseIds: currentPhaseIds, stepIds: currentStepIds });
}

function groupDecoupageStepsForEditor() {
    const groups = [];
    const validPhaseIds = new Set(decoupagePhases.map((phase) => phase.id));

    decoupagePhases.forEach((phase) => {
        const steps = decoupageSteps
            .map((step, originalIndex) => ({ step, originalIndex }))
            .filter(({ step }) => step.phaseId === phase.id);

        groups.push({
            phaseId: phase.id,
            phase,
            label: phase.name || "Phase sans nom",
            isUnassigned: false,
            steps
        });
    });

    const unassignedSteps = decoupageSteps
        .map((step, originalIndex) => ({ step, originalIndex }))
        .filter(({ step }) => !step.phaseId || !validPhaseIds.has(step.phaseId));

    if (unassignedSteps.length > 0 || decoupagePhases.length === 0) {
        groups.push({
            phaseId: "",
            phase: null,
            label: "Sans phase",
            isUnassigned: true,
            steps: unassignedSteps
        });
    }

    return groups;
}

function regroupDecoupageStepsByPhase() {
    decoupageSteps = groupDecoupageStepsForEditor().flatMap((group) => group.steps.map((item) => item.step));
}

function renderDecoupagePhasesTable() {
    const tbody = document.getElementById("decoupage-phases-table");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (decoupagePhases.length === 0) {
        const row = document.createElement("tr");
        row.innerHTML = `<td colspan="3" class="empty-state">Aucune phase pour le moment.</td>`;
        tbody.appendChild(row);
        return;
    }

    decoupagePhases.forEach((phase, index) => {
        const color = predefinedColors[index % predefinedColors.length];
        const row = document.createElement("tr");
        row.style.backgroundColor = hexToRgba(color, 0.20);
        row.style.boxShadow = `inset 3px 0 0 ${color}`;

        row.innerHTML = `
            <td>${index + 1}</td>
            <td class="editable phase-name-cell" contenteditable="true" data-index="${index}" spellcheck="true">${escapeHtml(phase.name)}</td>
            <td class="select-col">
                <button class="row-delete-btn" type="button" data-remove-decoupage-phase="${index}" title="Supprimer la phase" aria-label="Supprimer la phase">&times;</button>
            </td>
        `;

        tbody.appendChild(row);
    });

    bindDecoupagePhasesEvents();
}

function bindDecoupagePhasesEvents() {
    const tbody = document.getElementById("decoupage-phases-table");
    if (!tbody) return;

    tbody.querySelectorAll(".editable").forEach((cell) => {
        cell.addEventListener("input", (event) => {
            const index = Number(event.target.dataset.index);
            if (!decoupagePhases[index]) return;

            decoupagePhases[index].name = event.target.textContent.trim();
            saveDecoupagePhases();
        });

        cell.addEventListener("blur", (event) => {
            const index = Number(event.target.dataset.index);
            const phase = decoupagePhases[index];

            syncDecoupageToWbs();

            // Mise à jour ciblée du titre dans le tableau des étapes plutôt
            // qu'un re-rendu complet : reconstruire le tbody ici pourrait
            // remplacer un bouton juste au moment où l'utilisateur clique
            // dessus (ex: cliquer sur "+ Étape" juste après avoir renommé
            // la phase), ce qui ferait perdre ce clic.
            if (phase) {
                const titleEl = document.querySelector(`#decoupage-steps-table tr[data-phase-id="${phase.id}"] .wbs-phase-title`);
                if (titleEl) titleEl.textContent = phase.name || "Phase sans nom";
            }
        });
    });

    tbody.querySelectorAll("[data-remove-decoupage-phase]").forEach((button) => {
        button.addEventListener("click", (event) => {
            const index = Number(event.currentTarget.dataset.removeDecoupagePhase);
            const deletedPhase = decoupagePhases[index];
            if (!deletedPhase) return;

            decoupageSteps = decoupageSteps.map((step) => (
                step.phaseId === deletedPhase.id ? { ...step, phaseId: "" } : step
            ));
            decoupagePhases = decoupagePhases.filter((_, itemIndex) => itemIndex !== index);

            saveDecoupagePhases();
            saveDecoupageSteps();
            renderDecoupagePhasesTable();
            renderDecoupageStepsTable();
            syncDecoupageToWbs();
        });
    });
}

function addDecoupageStepToPhase(phaseId) {
    const newStep = { id: createId(), phaseId: phaseId || "", label: "" };
    decoupageSteps.push(newStep);
    regroupDecoupageStepsByPhase();
    saveDecoupageSteps();
    renderDecoupageStepsTable();
    syncDecoupageToWbs();

    document.querySelector(`#decoupage-steps-table tr[data-step-id="${newStep.id}"] .decoupage-step-cell`)?.focus();
}

// Même logique que moveWbsRow : un cran qui franchit la frontière de la
// phase courante fait changer la phase de l'étape déplacée.
function moveDecoupageStep(currentIndex, direction) {
    const targetIndex = currentIndex + direction;
    if (!decoupageSteps[currentIndex] || targetIndex < 0 || targetIndex >= decoupageSteps.length) return;

    const current = decoupageSteps[currentIndex];
    const neighbor = decoupageSteps[targetIndex];

    if (current.phaseId !== neighbor.phaseId) {
        current.phaseId = neighbor.phaseId;
    }

    decoupageSteps[currentIndex] = neighbor;
    decoupageSteps[targetIndex] = current;

    saveDecoupageSteps();
    renderDecoupageStepsTable();
    syncDecoupageToWbs();
}

function renderDecoupageStepsTable() {
    const tbody = document.getElementById("decoupage-steps-table");
    if (!tbody) return;

    regroupDecoupageStepsByPhase();
    tbody.innerHTML = "";

    if (decoupageSteps.length === 0 && decoupagePhases.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty-state">Aucune phase ni étape pour le moment.</td></tr>`;
        return;
    }

    const groups = groupDecoupageStepsForEditor();
    const lastIndex = decoupageSteps.length - 1;

    groups.forEach((group) => {
        const phaseIndex = group.phase ? decoupagePhases.findIndex((phase) => phase.id === group.phaseId) : -1;
        const phaseColor = phaseIndex >= 0 ? predefinedColors[phaseIndex % predefinedColors.length] : "#94a3b8";
        const phaseName = group.isUnassigned ? "Sans phase" : (group.label || "Phase sans nom");

        const phaseRow = document.createElement("tr");
        phaseRow.className = `wbs-phase-row${group.isUnassigned ? " wbs-phase-unassigned" : ""}`;
        phaseRow.dataset.phaseId = group.phaseId;
        phaseRow.style.backgroundColor = hexToRgba(phaseColor, group.isUnassigned ? 0.14 : 0.26);
        phaseRow.style.boxShadow = `inset 4px 0 0 ${phaseColor}`;

        phaseRow.innerHTML = `
            <td colspan="4">
                <div class="wbs-phase-row-inner">
                <span class="wbs-phase-label">
                    <span class="wbs-phase-dot" style="background-color: ${escapeHtml(phaseColor)};"></span>
                    <span class="wbs-phase-title">${escapeHtml(phaseName)}</span>
                    <span class="wbs-phase-count">${group.steps.length} étape${group.steps.length > 1 ? "s" : ""}</span>
                </span>
                <span class="wbs-phase-actions no-capture">
                    ${group.isUnassigned
                        ? ""
                        : `<button class="wbs-phase-add-btn" type="button" data-add-decoupage-phase-id="${escapeHtml(group.phaseId)}" title="Ajouter une étape à cette phase" aria-label="Ajouter une étape à cette phase">+ Étape</button>`
                    }
                </span>
                </div>
            </td>
        `;

        tbody.appendChild(phaseRow);

        if (group.steps.length === 0) {
            const emptyRow = document.createElement("tr");
            emptyRow.className = "wbs-phase-empty-row";
            emptyRow.dataset.phaseId = group.phaseId;
            emptyRow.innerHTML = `<td colspan="4" class="empty-state">Aucune étape dans cette phase pour le moment.</td>`;
            tbody.appendChild(emptyRow);
            return;
        }

        group.steps.forEach(({ step, originalIndex }) => {
            const row = document.createElement("tr");
            row.dataset.stepId = step.id;
            row.dataset.phaseId = group.phaseId;
            row.style.backgroundColor = hexToRgba(phaseColor, 0.12);

            const isFirst = originalIndex === 0;
            const isLast = originalIndex === lastIndex;

            row.innerHTML = `
                <td>${originalIndex + 1}</td>
                <td class="wbs-move-cell">
                    <button class="wbs-move-btn decoupage-move-up-btn" type="button" data-index="${originalIndex}" ${isFirst ? "disabled" : ""} title="Monter" aria-label="Monter l'étape">&uarr;</button>
                    <button class="wbs-move-btn decoupage-move-down-btn" type="button" data-index="${originalIndex}" ${isLast ? "disabled" : ""} title="Descendre" aria-label="Descendre l'étape">&darr;</button>
                </td>
                <td class="editable decoupage-step-cell" contenteditable="true" data-index="${originalIndex}" spellcheck="true">${escapeHtml(step.label)}</td>
                <td class="select-col">
                    <button class="row-delete-btn" type="button" data-remove-decoupage-step="${originalIndex}" title="Supprimer l'étape" aria-label="Supprimer l'étape">&times;</button>
                </td>
            `;

            tbody.appendChild(row);
        });
    });

    bindDecoupageStepsEvents();
}

function bindDecoupageStepsEvents() {
    const tbody = document.getElementById("decoupage-steps-table");
    if (!tbody) return;

    tbody.querySelectorAll(".editable").forEach((cell) => {
        cell.addEventListener("input", (event) => {
            const index = Number(event.target.dataset.index);
            if (!decoupageSteps[index]) return;

            decoupageSteps[index].label = event.target.textContent.trim();
            saveDecoupageSteps();
        });

        cell.addEventListener("blur", () => {
            syncDecoupageToWbs();
        });
    });

    tbody.querySelectorAll(".decoupage-move-up-btn").forEach((button) => {
        button.addEventListener("click", (event) => {
            const index = Number(event.currentTarget.dataset.index);
            if (!Number.isInteger(index)) return;
            moveDecoupageStep(index, -1);
        });
    });

    tbody.querySelectorAll(".decoupage-move-down-btn").forEach((button) => {
        button.addEventListener("click", (event) => {
            const index = Number(event.currentTarget.dataset.index);
            if (!Number.isInteger(index)) return;
            moveDecoupageStep(index, 1);
        });
    });

    tbody.querySelectorAll("[data-add-decoupage-phase-id]").forEach((button) => {
        button.addEventListener("click", (event) => {
            addDecoupageStepToPhase(event.currentTarget.dataset.addDecoupagePhaseId || "");
        });
    });

    tbody.querySelectorAll("[data-remove-decoupage-step]").forEach((button) => {
        button.addEventListener("click", (event) => {
            const index = Number(event.currentTarget.dataset.removeDecoupageStep);
            decoupageSteps = decoupageSteps.filter((_, itemIndex) => itemIndex !== index);

            saveDecoupageSteps();
            renderDecoupageStepsTable();
            syncDecoupageToWbs();
        });
    });
}

function initDecoupagePage() {
    const stepsBody = document.getElementById("decoupage-steps-table");
    if (!stepsBody) return;

    phases = loadPhases();
    wbsRows = loadWbsRows();
    decoupagePhases = loadDecoupagePhases();
    decoupageSteps = loadDecoupageSteps();

    renderDecoupagePhasesTable();
    renderDecoupageStepsTable();
    syncDecoupageToWbs();

    document.getElementById("add-decoupage-phase-btn")?.addEventListener("click", () => {
        const newPhase = { id: createId(), name: "" };
        decoupagePhases.push(newPhase);
        saveDecoupagePhases();
        renderDecoupagePhasesTable();
        syncDecoupageToWbs();
        renderDecoupageStepsTable();

        document.querySelector("#decoupage-phases-table tr:last-child .editable")?.focus();
    });

    document.getElementById("reset-decoupage-btn")?.addEventListener("click", () => {
        if (decoupagePhases.length === 0 && decoupageSteps.length === 0) return;

        const confirmation = confirm("Tu veux vraiment réinitialiser le Découpage ? Les phases et étapes déjà envoyées dans le WBS seront retirées du WBS.");
        if (!confirmation) return;

        decoupagePhases = [];
        decoupageSteps = [];
        saveDecoupagePhases();
        saveDecoupageSteps();
        renderDecoupagePhasesTable();
        renderDecoupageStepsTable();
        syncDecoupageToWbs();
    });
}

if (typeof helpTexts !== "undefined") {
    helpTexts.decoupage = `
        <p>Cette page sert à poser rapidement les grandes phases et étapes du projet, sans se soucier des responsables, dates ou avancement.</p>
        <ul>
            <li>Le tableau de gauche gère les phases (juste un nom).</li>
            <li>Le tableau de droite gère les étapes, regroupées par phase.</li>
            <li>Utilise les flèches ▲▼ pour réordonner une étape, y compris en la faisant changer de phase.</li>
            <li>Chaque phase et étape créée ici est automatiquement envoyée dans le WBS, où tu pourras ensuite ajouter responsable, dates et avancement.</li>
            <li>Renommer ou supprimer une phase/étape ici met à jour ou retire la ligne correspondante dans le WBS. Les lignes WBS que tu as créées directement dans le WBS ne sont jamais touchées par cette synchro.</li>
            <li>Le sélecteur “Projet actif” permet de changer de projet.</li>
        </ul>
    `;
}

if (typeof helpTexts !== "undefined") {
    const previousGanttHelpV77 = helpTexts.gantt || "";
    helpTexts.gantt = `
        ${previousGanttHelpV77}
        <p><strong>V77 :</strong> le GANTT respecte maintenant l’option week-end, les colonnes sont plus compactes, et la capture est adaptée à la grille.</p>
    `;
}

if (typeof helpTexts !== "undefined") {
    const previousGanttHelpV78 = helpTexts.gantt || "";
    helpTexts.gantt = `
        ${previousGanttHelpV78}
        <p><strong>V78 :</strong> les week-ends restent visibles dans la frise même s'ils ne sont pas travaillés (grisés). La carte "Périodes spéciales" permet de définir des vacances ou des formations : elles apparaissent en couleur dans le GANTT.</p>
    `;
}

if (typeof helpTexts !== "undefined") {
    helpTexts.wbs = `
        ${helpTexts.wbs || ""}
        <p><strong>V78 :</strong> les colonnes "Jour début" et "Jour fin" sont désormais modifiables directement : les changer déplace ou redimensionne la tâche sans toucher aux autres.</p>
    `;
}

/* V78 — Démarrage unique */
forgeBootstrap();
