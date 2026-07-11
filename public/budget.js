/* Forge — Budget (Base de coûts, TCO, Comparatifs) */

const BUDGET_HORIZONS = [1, 5, 10];
const BUDGET_CYCLE_YEARS = { monthly: 1 / 12, annual: 1, five_year: 5 };
const budgetCycleLabels = { monthly: "Mensuel", annual: "Annuel", five_year: "Tous les 5 ans", perpetual: "Perpétuel" };

/* ===== Utilitaires ===== */

function budgetToNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function budgetFormatEuros(value) {
    return new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(budgetToNumber(value, 0));
}

function budgetFormatPercent(value) {
    if (!Number.isFinite(value)) return "—";
    return `${value.toFixed(1)}%`;
}

const budgetNatureLabels = { capex: "CAPEX", opex: "OPEX" };

function budgetNatureBadge(nature) {
    const value = nature === "opex" ? "opex" : "capex";
    return `<span class="budget-nature-pill budget-nature-${value}">${budgetNatureLabels[value]}</span>`;
}

function budgetNormalizeCycle(cycle) {
    return budgetCycleLabels[cycle] ? cycle : "perpetual";
}

// Un cycle "perpétuel" ne se répète jamais (1 occurrence quel que soit l'horizon).
// Les autres cycles se répètent tous les BUDGET_CYCLE_YEARS[cycle] années ; le nombre
// d'occurrences sur un horizon donné est arrondi au supérieur (l'achat initial compte
// pour la première occurrence, un renouvellement pile sur la borne de l'horizon compte).
function budgetOccurrencesForCycle(cycle, horizonYears) {
    const normalized = budgetNormalizeCycle(cycle);
    if (normalized === "perpetual") return 1;
    return Math.ceil(horizonYears / BUDGET_CYCLE_YEARS[normalized]);
}

function budgetCycleOptions(selectedCycle) {
    const normalized = budgetNormalizeCycle(selectedCycle);
    return Object.keys(budgetCycleLabels)
        .map((cycle) => `<option value="${cycle}" ${cycle === normalized ? "selected" : ""}>${budgetCycleLabels[cycle]}</option>`)
        .join("");
}

// Classification GHG Protocol / Bilan Carbone (ADEME) : Scope 1 = émissions directes
// (combustion sur site, véhicules de l'entreprise), Scope 2 = énergie achetée
// (électricité, chaleur), Scope 3 = tout le reste (achats, numérique, déplacements,
// déchets...). C'est la répartition standard de tout bilan carbone.
const budgetScopeLabels = { scope1: "Scope 1", scope2: "Scope 2", scope3: "Scope 3" };

function budgetNormalizeScope(scope) {
    return budgetScopeLabels[scope] ? scope : "scope3";
}

function budgetScopeOptions(selectedScope) {
    const normalized = budgetNormalizeScope(selectedScope);
    return Object.keys(budgetScopeLabels)
        .map((scope) => `<option value="${scope}" ${scope === normalized ? "selected" : ""}>${budgetScopeLabels[scope]}</option>`)
        .join("");
}

function budgetScopeBadge(scope) {
    const normalized = budgetNormalizeScope(scope);
    return `<span class="budget-scope-pill budget-scope-${normalized}">${budgetScopeLabels[normalized]}</span>`;
}

// Au-delà de 1000 kgCO2e on bascule en tonnes, comme dans tout rapport de bilan carbone.
function budgetFormatCarbon(kg) {
    const value = budgetToNumber(kg, 0);

    if (Math.abs(value) >= 1000) {
        return `${new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value / 1000)} t CO2e`;
    }

    return `${new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(value)} kg CO2e`;
}

/* ===== Modèle : types d'éléments (comme les phases du WBS) ===== */

let budgetElementTypes = [];
let selectedBudgetTypes = new Set();

function loadBudgetElementTypes() {
    let parsed = [];

    try {
        parsed = JSON.parse(localStorage.getItem(getProjectKey("budget_element_types")) || "[]");
    } catch (error) {
        parsed = [];
    }

    budgetElementTypes = Array.isArray(parsed) ? parsed : [];

    budgetElementTypes.forEach((type, index) => {
        type.id = type.id || createId();
        type.color = normalizeColor(type.color, index);
        type.name = type.name || "";
    });

    saveBudgetElementTypes();
}

function saveBudgetElementTypes() {
    localStorage.setItem(getProjectKey("budget_element_types"), JSON.stringify(budgetElementTypes));
}

/* ===== Modèle : éléments (base commune, sans quantité) ===== */

let budgetElements = [];

function loadBudgetElements() {
    let parsed = [];

    try {
        parsed = JSON.parse(localStorage.getItem(getProjectKey("budget_elements")) || "[]");
    } catch (error) {
        parsed = [];
    }

    budgetElements = Array.isArray(parsed)
        ? parsed.map((element) => {
              const nature = element.nature === "opex" ? "opex" : "capex";
              // Anciennes données sans cycle : on retombe sur le comportement d'avant
              // (CAPEX compté une fois, OPEX récurrent chaque année).
              const fallbackCycle = nature === "opex" ? "annual" : "perpetual";

              return {
                  id: element.id || createId(),
                  typeId: element.typeId || "",
                  name: element.name || "",
                  nature,
                  unitPrice: budgetToNumber(element.unitPrice, 0),
                  renewalCycle: budgetNormalizeCycle(element.renewalCycle || fallbackCycle),
                  carbonScope: budgetNormalizeScope(element.carbonScope),
                  carbonFactor: budgetToNumber(element.carbonFactor, 0)
              };
          })
        : [];

    saveBudgetElements();
}

function saveBudgetElements() {
    localStorage.setItem(getProjectKey("budget_elements"), JSON.stringify(budgetElements));
}

function groupBudgetElementsByType() {
    const groups = [];
    const validTypeIds = new Set(budgetElementTypes.map((type) => type.id));

    budgetElementTypes.forEach((type) => {
        const items = budgetElements
            .map((element, originalIndex) => ({ element, originalIndex }))
            .filter(({ element }) => element.typeId === type.id);

        groups.push({ typeId: type.id, type, label: type.name || "Type sans nom", isUnassigned: false, items });
    });

    const unassigned = budgetElements
        .map((element, originalIndex) => ({ element, originalIndex }))
        .filter(({ element }) => !element.typeId || !validTypeIds.has(element.typeId));

    if (unassigned.length > 0 || budgetElementTypes.length === 0) {
        groups.push({ typeId: "", type: null, label: "Sans type", isUnassigned: true, items: unassigned });
    }

    return groups;
}

/* ===== Modèle : informations libres (notes nom / valeur) ===== */

let budgetInfoRows = [];
let selectedBudgetInfoRows = new Set();

function loadBudgetInfoRows() {
    let parsed = [];

    try {
        parsed = JSON.parse(localStorage.getItem(getProjectKey("budget_info_rows")) || "[]");
    } catch (error) {
        parsed = [];
    }

    budgetInfoRows = Array.isArray(parsed)
        ? parsed.map((row) => ({ id: row.id || createId(), name: row.name || "", value: row.value || "" }))
        : [];

    saveBudgetInfoRows();
}

function saveBudgetInfoRows() {
    localStorage.setItem(getProjectKey("budget_info_rows"), JSON.stringify(budgetInfoRows));
}

/* ===== Modèle : profils TCO (plusieurs TCO sélectionnables) ===== */

let budgetTcoProfiles = [];
let budgetTcoActiveProfileId = "";
let selectedBudgetTcoProfiles = new Set();
let selectedBudgetComparatifIds = new Set();
let budgetTcoSelectedHorizon = 5;
let budgetComparatifsSelectedHorizon = 5;

function budgetCreateDefaultProfile(name) {
    return { id: createId(), name: name || "", quantities: {} };
}

function loadBudgetTcoProfiles() {
    let parsed = [];

    try {
        parsed = JSON.parse(localStorage.getItem(getProjectKey("budget_tco_profiles")) || "[]");
    } catch (error) {
        parsed = [];
    }

    budgetTcoProfiles = Array.isArray(parsed)
        ? parsed.map((profile) => ({
              id: profile.id || createId(),
              name: profile.name || "",
              quantities: profile.quantities && typeof profile.quantities === "object" ? profile.quantities : {}
          }))
        : [];

    if (budgetTcoProfiles.length === 0) {
        budgetTcoProfiles = [budgetCreateDefaultProfile("TCO 1")];
    }

    budgetTcoActiveProfileId = localStorage.getItem(getProjectKey("budget_tco_active_id")) || "";

    if (!budgetTcoProfiles.some((profile) => profile.id === budgetTcoActiveProfileId)) {
        budgetTcoActiveProfileId = budgetTcoProfiles[0].id;
    }

    saveBudgetTcoProfiles();
    saveBudgetTcoActiveProfileId();
}

function saveBudgetTcoProfiles() {
    localStorage.setItem(getProjectKey("budget_tco_profiles"), JSON.stringify(budgetTcoProfiles));
}

function saveBudgetTcoActiveProfileId() {
    localStorage.setItem(getProjectKey("budget_tco_active_id"), budgetTcoActiveProfileId);
}

function getActiveBudgetTcoProfile() {
    return budgetTcoProfiles.find((profile) => profile.id === budgetTcoActiveProfileId) || budgetTcoProfiles[0];
}

/* ===== Calcul : totaux CAPEX / OPEX / Total pour chaque horizon (1, 5, 10 ans) ===== */

function computeBudgetProfileTotals(profile) {
    const perHorizon = {};

    BUDGET_HORIZONS.forEach((years) => {
        const lines = budgetElements.map((element) => {
            const quantity = budgetToNumber(profile.quantities[element.id], 0);
            const occurrences = budgetOccurrencesForCycle(element.renewalCycle, years);
            const cost = quantity * element.unitPrice * occurrences;
            return { element, quantity, occurrences, cost };
        });

        const capexTotal = lines.filter((line) => line.element.nature === "capex").reduce((sum, line) => sum + line.cost, 0);
        const opexTotal = lines.filter((line) => line.element.nature === "opex").reduce((sum, line) => sum + line.cost, 0);
        const total = capexTotal + opexTotal;

        const linesWithPercent = lines.map((line) => ({
            ...line,
            percent: total > 0 ? (line.cost / total) * 100 : 0
        }));

        perHorizon[years] = { lines: linesWithPercent, capexTotal, opexTotal, total };
    });

    return perHorizon;
}

// Même logique que computeBudgetProfileTotals (quantité × facteur × occurrences du
// cycle), mais pour l'empreinte carbone, groupée par scope au lieu de CAPEX/OPEX.
// Prend directement une map de quantités (celle du TCO lié) plutôt qu'un profil TCO,
// puisqu'un bilan carbone n'a pas ses propres quantités.
function computeBudgetCarbonTotals(quantities) {
    const perHorizon = {};
    const safeQuantities = quantities && typeof quantities === "object" ? quantities : {};

    BUDGET_HORIZONS.forEach((years) => {
        const lines = budgetElements.map((element) => {
            const quantity = budgetToNumber(safeQuantities[element.id], 0);
            const occurrences = budgetOccurrencesForCycle(element.renewalCycle, years);
            const footprint = quantity * element.carbonFactor * occurrences;
            return { element, quantity, occurrences, footprint };
        });

        const scope1Total = lines.filter((line) => line.element.carbonScope === "scope1").reduce((sum, line) => sum + line.footprint, 0);
        const scope2Total = lines.filter((line) => line.element.carbonScope === "scope2").reduce((sum, line) => sum + line.footprint, 0);
        const scope3Total = lines.filter((line) => line.element.carbonScope === "scope3").reduce((sum, line) => sum + line.footprint, 0);
        const total = scope1Total + scope2Total + scope3Total;

        const linesWithPercent = lines.map((line) => ({
            ...line,
            percent: total > 0 ? (line.footprint / total) * 100 : 0
        }));

        perHorizon[years] = { lines: linesWithPercent, scope1Total, scope2Total, scope3Total, total };
    });

    return perHorizon;
}

/* =========================================================================
   PAGE : Base de coûts (budget-couts.html)
   ========================================================================= */

function renderBudgetTypesTable() {
    const body = document.getElementById("budget-types-table-body");
    const deleteButton = document.getElementById("delete-selected-budget-types-btn");
    const selectAll = document.getElementById("select-all-budget-types");

    if (!body) return;

    body.innerHTML = "";

    if (budgetElementTypes.length === 0) {
        body.innerHTML = `<tr><td colspan="3" class="empty-state">Aucun type pour le moment.</td></tr>`;
        if (deleteButton) deleteButton.disabled = true;
        if (selectAll) selectAll.checked = false;
        return;
    }

    budgetElementTypes.forEach((type, index) => {
        const color = normalizeColor(type.color, index);
        const isSelected = selectedBudgetTypes.has(index);
        const row = document.createElement("tr");

        row.style.backgroundColor = hexToRgba(color, 0.20);
        row.style.boxShadow = `inset 3px 0 0 ${color}`;

        if (isSelected) row.classList.add("selected-row");

        row.innerHTML = `
            <td class="select-col">
                <input class="row-checkbox budget-type-checkbox" type="checkbox" data-index="${index}" aria-label="Sélectionner le type ${index + 1}" ${isSelected ? "checked" : ""} />
            </td>
            <td>
                <button
                    class="budget-type-number-btn"
                    type="button"
                    data-index="${index}"
                    style="background-color: ${escapeHtml(color)}; --row-glow: ${hexToRgba(color, 0.55)}"
                    aria-label="Changer la couleur du type ${index + 1}"
                >${index + 1}</button>
            </td>
            <td class="editable budget-type-name-cell" contenteditable="true" data-index="${index}" data-field="name" spellcheck="true">${escapeHtml(type.name)}</td>
        `;

        body.appendChild(row);
    });

    body.querySelectorAll(".budget-type-checkbox").forEach((checkbox) => {
        checkbox.addEventListener("change", (event) => {
            const index = Number(event.target.dataset.index);
            if (event.target.checked) selectedBudgetTypes.add(index);
            else selectedBudgetTypes.delete(index);
            renderBudgetTypesTable();
        });
    });

    body.querySelectorAll(".budget-type-number-btn").forEach((button) => {
        button.addEventListener("click", (event) => {
            const index = Number(event.currentTarget.dataset.index);
            activeColorTarget = { type: "budgetElementType", index };
            showColorMenu(event.currentTarget);
        });
    });

    body.querySelectorAll(".budget-type-name-cell").forEach((cell) => {
        cell.addEventListener("input", (event) => {
            const index = Number(event.target.dataset.index);
            if (!budgetElementTypes[index]) return;
            budgetElementTypes[index].name = event.target.textContent.trim();
            saveBudgetElementTypes();
            renderBudgetElementsTable();
        });
    });

    if (deleteButton) deleteButton.disabled = selectedBudgetTypes.size === 0;
    if (selectAll) {
        selectAll.checked = budgetElementTypes.length > 0 && selectedBudgetTypes.size === budgetElementTypes.length;
        selectAll.indeterminate = selectedBudgetTypes.size > 0 && selectedBudgetTypes.size < budgetElementTypes.length;
    }
}

function addBudgetElementType() {
    budgetElementTypes.push({ id: createId(), color: predefinedColors[budgetElementTypes.length % predefinedColors.length], name: "" });
    saveBudgetElementTypes();
    renderBudgetTypesTable();
    renderBudgetElementsTable();

    const lastCell = document.querySelector("#budget-types-table-body tr:last-child .budget-type-name-cell");
    if (lastCell) lastCell.focus();
}

function deleteSelectedBudgetElementTypes() {
    if (selectedBudgetTypes.size === 0) return;
    if (!confirm("Supprimer les types sélectionnés ? Les éléments associés passeront en « Sans type ».")) return;

    const deletedIds = budgetElementTypes.filter((_, index) => selectedBudgetTypes.has(index)).map((type) => type.id);

    budgetElementTypes = budgetElementTypes.filter((_, index) => !selectedBudgetTypes.has(index));
    budgetElements = budgetElements.map((element) => (deletedIds.includes(element.typeId) ? { ...element, typeId: "" } : element));

    selectedBudgetTypes.clear();

    saveBudgetElementTypes();
    saveBudgetElements();
    if (typeof hideColorMenu === "function") hideColorMenu();
    renderBudgetTypesTable();
    renderBudgetElementsTable();
}

function resetBudgetElementTypes() {
    if (!confirm("Réinitialiser la liste des types ? Les éléments existants passeront en « Sans type ».")) return;

    budgetElementTypes = [];
    budgetElements = budgetElements.map((element) => ({ ...element, typeId: "" }));
    selectedBudgetTypes.clear();

    saveBudgetElementTypes();
    saveBudgetElements();
    if (typeof hideColorMenu === "function") hideColorMenu();
    renderBudgetTypesTable();
    renderBudgetElementsTable();
}

function createBudgetNewElement(typeId) {
    return {
        id: createId(),
        typeId: typeId || "",
        name: "",
        nature: "capex",
        unitPrice: 0,
        renewalCycle: "perpetual",
        carbonScope: "scope3",
        carbonFactor: 0
    };
}

function addBudgetElementToType(typeId) {
    const element = createBudgetNewElement(typeId);
    budgetElements.push(element);
    saveBudgetElements();
    renderBudgetElementsTable();

    const lastCell = document.querySelector(`#budget-elements-table-body tr[data-element-id="${element.id}"] .budget-element-name-cell`);
    if (lastCell) lastCell.focus();
}

function removeBudgetElement(elementId) {
    budgetElements = budgetElements.filter((element) => element.id !== elementId);
    saveBudgetElements();
    renderBudgetElementsTable();
}

function renderBudgetElementsTable() {
    const body = document.getElementById("budget-elements-table-body");
    if (!body) return;

    body.innerHTML = "";

    if (budgetElements.length === 0 && budgetElementTypes.length === 0) {
        body.innerHTML = `<tr><td colspan="7" class="empty-state">Aucun élément pour le moment. Commence par ajouter un type, puis des éléments.</td></tr>`;
        return;
    }

    const groups = groupBudgetElementsByType();

    groups.forEach((group) => {
        const color = group.type ? normalizeColor(group.type.color, 0) : "#94a3b8";

        const typeRow = document.createElement("tr");
        typeRow.className = `budget-type-row${group.isUnassigned ? " budget-type-unassigned" : ""}`;
        typeRow.dataset.typeId = group.typeId;
        typeRow.style.backgroundColor = hexToRgba(color, group.isUnassigned ? 0.14 : 0.26);
        typeRow.style.boxShadow = `inset 4px 0 0 ${color}`;

        typeRow.innerHTML = `
            <td colspan="7">
                <div class="budget-type-row-inner">
                    <span class="budget-type-label">
                        <span class="budget-type-dot" style="background-color: ${escapeHtml(color)};"></span>
                        <span class="budget-type-title">${escapeHtml(group.label)}</span>
                        <span class="budget-type-count">${group.items.length} élément${group.items.length > 1 ? "s" : ""}</span>
                    </span>
                    ${group.isUnassigned ? "" : `<button class="budget-type-add-btn" type="button" data-add-type-id="${escapeHtml(group.typeId)}" title="Ajouter un élément à ce type" aria-label="Ajouter un élément à ce type">+ Élément</button>`}
                </div>
            </td>
        `;

        body.appendChild(typeRow);

        if (group.items.length === 0) {
            const emptyRow = document.createElement("tr");
            emptyRow.innerHTML = `<td colspan="7" class="empty-state">Aucun élément dans ce type pour le moment.</td>`;
            body.appendChild(emptyRow);
            return;
        }

        group.items.forEach(({ element }) => {
            const row = document.createElement("tr");
            row.dataset.elementId = element.id;
            row.style.backgroundColor = hexToRgba(color, 0.10);

            row.innerHTML = `
                <td class="editable budget-element-name-cell" contenteditable="true" data-field="name" spellcheck="true">${escapeHtml(element.name)}</td>
                <td>
                    <select class="budget-nature-select" data-field="nature">
                        <option value="capex" ${element.nature === "capex" ? "selected" : ""}>CAPEX</option>
                        <option value="opex" ${element.nature === "opex" ? "selected" : ""}>OPEX</option>
                    </select>
                </td>
                <td>
                    <select class="budget-cycle-select" data-field="renewalCycle">
                        ${budgetCycleOptions(element.renewalCycle)}
                    </select>
                </td>
                <td>
                    <input class="budget-price-input" type="number" min="0" step="0.01" value="${element.unitPrice}" data-field="unitPrice" aria-label="Prix unitaire en euros" />
                </td>
                <td>
                    <select class="budget-scope-select" data-field="carbonScope">
                        ${budgetScopeOptions(element.carbonScope)}
                    </select>
                </td>
                <td>
                    <input class="budget-carbon-input" type="number" min="0" step="0.01" value="${element.carbonFactor}" data-field="carbonFactor" aria-label="Facteur d'émission en kg CO2e par unité" />
                </td>
                <td class="select-col"><button class="row-delete-btn" type="button" data-remove-element title="Supprimer">&times;</button></td>
            `;

            body.appendChild(row);
        });
    });

    bindBudgetElementsTableEvents();
}

function bindBudgetElementsTableEvents() {
    const body = document.getElementById("budget-elements-table-body");
    if (!body) return;

    body.querySelectorAll(".budget-type-add-btn").forEach((button) => {
        button.addEventListener("click", (event) => {
            addBudgetElementToType(event.currentTarget.dataset.addTypeId);
        });
    });

    body.querySelectorAll(".budget-element-name-cell").forEach((cell) => {
        cell.addEventListener("input", (event) => {
            const elementId = event.target.closest("tr")?.dataset.elementId;
            const element = budgetElements.find((item) => item.id === elementId);
            if (!element) return;
            element.name = event.target.textContent.trim();
            saveBudgetElements();
        });
    });

    body.querySelectorAll(".budget-nature-select").forEach((select) => {
        select.addEventListener("change", (event) => {
            const elementId = event.target.closest("tr")?.dataset.elementId;
            const element = budgetElements.find((item) => item.id === elementId);
            if (!element) return;
            element.nature = event.target.value === "opex" ? "opex" : "capex";
            saveBudgetElements();
        });
    });

    body.querySelectorAll(".budget-cycle-select").forEach((select) => {
        select.addEventListener("change", (event) => {
            const elementId = event.target.closest("tr")?.dataset.elementId;
            const element = budgetElements.find((item) => item.id === elementId);
            if (!element) return;
            element.renewalCycle = budgetNormalizeCycle(event.target.value);
            saveBudgetElements();
        });
    });

    body.querySelectorAll(".budget-price-input").forEach((input) => {
        input.addEventListener("focus", (event) => event.target.select());
        input.addEventListener("input", (event) => {
            const elementId = event.target.closest("tr")?.dataset.elementId;
            const element = budgetElements.find((item) => item.id === elementId);
            if (!element) return;
            element.unitPrice = budgetToNumber(event.target.value, 0);
            saveBudgetElements();
        });
    });

    body.querySelectorAll(".budget-scope-select").forEach((select) => {
        select.addEventListener("change", (event) => {
            const elementId = event.target.closest("tr")?.dataset.elementId;
            const element = budgetElements.find((item) => item.id === elementId);
            if (!element) return;
            element.carbonScope = budgetNormalizeScope(event.target.value);
            saveBudgetElements();
        });
    });

    body.querySelectorAll(".budget-carbon-input").forEach((input) => {
        input.addEventListener("focus", (event) => event.target.select());
        input.addEventListener("input", (event) => {
            const elementId = event.target.closest("tr")?.dataset.elementId;
            const element = budgetElements.find((item) => item.id === elementId);
            if (!element) return;
            element.carbonFactor = budgetToNumber(event.target.value, 0);
            saveBudgetElements();
        });
    });

    body.querySelectorAll("[data-remove-element]").forEach((button) => {
        button.addEventListener("click", (event) => {
            const elementId = event.target.closest("tr")?.dataset.elementId;
            if (elementId) removeBudgetElement(elementId);
        });
    });
}

function bindBudgetTypesListActions() {
    const addButton = document.getElementById("add-budget-type-btn");
    const deleteButton = document.getElementById("delete-selected-budget-types-btn");
    const resetButton = document.getElementById("reset-budget-types-btn");
    const selectAll = document.getElementById("select-all-budget-types");

    if (addButton) addButton.addEventListener("click", addBudgetElementType);
    if (deleteButton) deleteButton.addEventListener("click", deleteSelectedBudgetElementTypes);
    if (resetButton) resetButton.addEventListener("click", resetBudgetElementTypes);

    if (selectAll) {
        selectAll.addEventListener("change", (event) => {
            selectedBudgetTypes.clear();
            if (event.target.checked) budgetElementTypes.forEach((_, index) => selectedBudgetTypes.add(index));
            renderBudgetTypesTable();
        });
    }

    if (typeof closeColorMenuOnOutsideClick === "function") {
        document.addEventListener("click", closeColorMenuOnOutsideClick);
    }
}

/* ----- Informations libres ----- */

function renderBudgetInfoTable() {
    const body = document.getElementById("budget-info-table-body");
    const deleteButton = document.getElementById("delete-selected-budget-info-btn");
    const selectAll = document.getElementById("select-all-budget-info");

    if (!body) return;

    body.innerHTML = "";

    if (budgetInfoRows.length === 0) {
        body.innerHTML = `<tr><td colspan="3" class="empty-state">Aucune information pour le moment.</td></tr>`;
        if (deleteButton) deleteButton.disabled = true;
        if (selectAll) selectAll.checked = false;
        return;
    }

    budgetInfoRows.forEach((row, index) => {
        const isSelected = selectedBudgetInfoRows.has(index);
        const tr = document.createElement("tr");
        if (isSelected) tr.classList.add("selected-row");

        tr.innerHTML = `
            <td class="select-col">
                <input class="row-checkbox budget-info-checkbox" type="checkbox" data-index="${index}" aria-label="Sélectionner l'information ${index + 1}" ${isSelected ? "checked" : ""} />
            </td>
            <td class="editable budget-info-name-cell" contenteditable="true" data-index="${index}" data-field="name" spellcheck="true">${escapeHtml(row.name)}</td>
            <td class="editable budget-info-value-cell" contenteditable="true" data-index="${index}" data-field="value" spellcheck="true">${escapeHtml(row.value)}</td>
        `;

        body.appendChild(tr);
    });

    body.querySelectorAll(".budget-info-checkbox").forEach((checkbox) => {
        checkbox.addEventListener("change", (event) => {
            const index = Number(event.target.dataset.index);
            if (event.target.checked) selectedBudgetInfoRows.add(index);
            else selectedBudgetInfoRows.delete(index);
            renderBudgetInfoTable();
        });
    });

    body.querySelectorAll(".editable[data-field]").forEach((cell) => {
        cell.addEventListener("input", (event) => {
            const index = Number(event.target.dataset.index);
            const field = event.target.dataset.field;
            if (!budgetInfoRows[index] || !field) return;
            budgetInfoRows[index][field] = event.target.textContent.trim();
            saveBudgetInfoRows();
        });
    });

    if (deleteButton) deleteButton.disabled = selectedBudgetInfoRows.size === 0;
    if (selectAll) {
        selectAll.checked = budgetInfoRows.length > 0 && selectedBudgetInfoRows.size === budgetInfoRows.length;
        selectAll.indeterminate = selectedBudgetInfoRows.size > 0 && selectedBudgetInfoRows.size < budgetInfoRows.length;
    }
}

function addBudgetInfoRow() {
    budgetInfoRows.push({ id: createId(), name: "", value: "" });
    saveBudgetInfoRows();
    renderBudgetInfoTable();

    const lastCell = document.querySelector("#budget-info-table-body tr:last-child .budget-info-name-cell");
    if (lastCell) lastCell.focus();
}

function deleteSelectedBudgetInfoRows() {
    if (selectedBudgetInfoRows.size === 0) return;
    if (!confirm("Supprimer les informations sélectionnées ?")) return;

    budgetInfoRows = budgetInfoRows.filter((_, index) => !selectedBudgetInfoRows.has(index));
    selectedBudgetInfoRows.clear();

    saveBudgetInfoRows();
    renderBudgetInfoTable();
}

function bindBudgetInfoListActions() {
    const addButton = document.getElementById("add-budget-info-btn");
    const deleteButton = document.getElementById("delete-selected-budget-info-btn");
    const selectAll = document.getElementById("select-all-budget-info");

    if (addButton) addButton.addEventListener("click", addBudgetInfoRow);
    if (deleteButton) deleteButton.addEventListener("click", deleteSelectedBudgetInfoRows);

    if (selectAll) {
        selectAll.addEventListener("change", (event) => {
            selectedBudgetInfoRows.clear();
            if (event.target.checked) budgetInfoRows.forEach((_, index) => selectedBudgetInfoRows.add(index));
            renderBudgetInfoTable();
        });
    }
}

function initBudgetCoutsPage() {
    if (typeof helpTexts !== "undefined") {
        helpTexts["budget-couts"] = `
            <p>Cette page sert de base commune de coûts pour tous les budgets (TCO) du projet.</p>
            <ul>
                <li>Crée des types d'éléments à gauche, comme les phases du WBS : infrastructure, licences, personnel, etc.</li>
                <li>Ajoute des éléments dans chaque type avec le bouton "+ Élément". Renseigne son nom, sa nature (CAPEX ou OPEX), son cycle de renouvellement et son prix unitaire en euros.</li>
                <li>Le cycle de renouvellement (mensuel, annuel, tous les 5 ans, perpétuel) détermine combien de fois ce coût se répète dans les TCO sur 1, 5 et 10 ans. Un élément perpétuel n'est compté qu'une seule fois, quel que soit l'horizon.</li>
                <li>Les colonnes "Scope carbone" et "Facteur d'émission" servent au bilan carbone : le scope suit la classification standard (Scope 1 = émissions directes, Scope 2 = énergie achetée, Scope 3 = tout le reste — achats, numérique, déplacements...), le facteur est l'empreinte en kg CO2e par unité (même unité que la quantité saisie dans les TCO).</li>
                <li>CAPEX et OPEX apparaissent ensemble dans le même tableau, pas besoin de changer de page.</li>
                <li>La carte "Informations" juste en dessous permet de noter librement des informations complémentaires (nom / valeur, texte libre).</li>
                <li>Il n'y a pas de total ici : cette page ne fait que définir les éléments. Les quantités et les totaux se définissent dans chaque TCO.</li>
                <li>Les changements sont sauvegardés automatiquement et repris automatiquement dans tous les TCO existants.</li>
            </ul>
        `;
    }

    if (typeof renderColorMenu === "function") renderColorMenu();

    loadBudgetElementTypes();
    loadBudgetElements();
    loadBudgetInfoRows();

    bindBudgetTypesListActions();
    bindBudgetInfoListActions();

    renderBudgetTypesTable();
    renderBudgetElementsTable();
    renderBudgetInfoTable();
}

/* =========================================================================
   PAGE : TCO (budget-tco.html)
   ========================================================================= */

function budgetTcoSelectProfile(profileId) {
    if (profileId === budgetTcoActiveProfileId) return;
    budgetTcoActiveProfileId = profileId;
    saveBudgetTcoActiveProfileId();
    renderBudgetTcoAll();
}

function addBudgetTcoProfile() {
    const profile = budgetCreateDefaultProfile(`TCO ${budgetTcoProfiles.length + 1}`);
    budgetTcoProfiles.push(profile);
    budgetTcoActiveProfileId = profile.id;

    saveBudgetTcoProfiles();
    saveBudgetTcoActiveProfileId();
    renderBudgetTcoAll();

    const lastNameCell = document.querySelector("#budget-tco-profiles-table-body tr:last-child .budget-tco-profile-name-cell");
    if (lastNameCell) lastNameCell.focus();
}

function deleteSelectedBudgetTcoProfiles() {
    if (selectedBudgetTcoProfiles.size === 0) return;

    if (selectedBudgetTcoProfiles.size >= budgetTcoProfiles.length) {
        alert("Impossible de supprimer tous les TCO : il en faut au moins un.");
        return;
    }

    if (!confirm("Supprimer les TCO sélectionnés ?")) return;

    budgetTcoProfiles = budgetTcoProfiles.filter((_, index) => !selectedBudgetTcoProfiles.has(index));
    selectedBudgetTcoProfiles.clear();

    if (!budgetTcoProfiles.some((profile) => profile.id === budgetTcoActiveProfileId)) {
        budgetTcoActiveProfileId = budgetTcoProfiles[0].id;
        saveBudgetTcoActiveProfileId();
    }

    saveBudgetTcoProfiles();
    renderBudgetTcoAll();
}

function renderBudgetTcoProfilesTable() {
    const body = document.getElementById("budget-tco-profiles-table-body");
    const deleteButton = document.getElementById("delete-selected-budget-tco-btn");
    const selectAll = document.getElementById("select-all-budget-tco-profiles");

    if (!body) return;

    body.innerHTML = "";

    budgetTcoProfiles.forEach((profile, index) => {
        const isSelected = selectedBudgetTcoProfiles.has(index);
        const isActive = profile.id === budgetTcoActiveProfileId;

        const row = document.createElement("tr");
        row.dataset.profileId = profile.id;
        row.classList.toggle("selected-row", isSelected);
        row.classList.toggle("budget-tco-profile-active", isActive);

        row.innerHTML = `
            <td class="select-col">
                <input class="row-checkbox budget-tco-profile-checkbox" type="checkbox" data-index="${index}" aria-label="Sélectionner le TCO ${index + 1}" ${isSelected ? "checked" : ""} />
            </td>
            <td>${index + 1}</td>
            <td class="editable budget-tco-profile-name-cell" contenteditable="true" data-index="${index}" spellcheck="true">${escapeHtml(profile.name)}</td>
        `;

        body.appendChild(row);
    });

    body.querySelectorAll(".budget-tco-profile-checkbox").forEach((checkbox) => {
        checkbox.addEventListener("click", (event) => event.stopPropagation());
        checkbox.addEventListener("change", (event) => {
            const index = Number(event.target.dataset.index);
            if (event.target.checked) selectedBudgetTcoProfiles.add(index);
            else selectedBudgetTcoProfiles.delete(index);
            renderBudgetTcoProfilesTable();
        });
    });

    body.querySelectorAll(".budget-tco-profile-name-cell").forEach((cell) => {
        cell.addEventListener("click", (event) => event.stopPropagation());
        cell.addEventListener("input", (event) => {
            const index = Number(event.target.dataset.index);
            if (!budgetTcoProfiles[index]) return;
            budgetTcoProfiles[index].name = event.target.textContent.trim();
            saveBudgetTcoProfiles();

            if (budgetTcoProfiles[index].id === budgetTcoActiveProfileId) {
                const heading = document.getElementById("budget-tco-active-name");
                if (heading) heading.textContent = budgetTcoProfiles[index].name || "TCO";
            }
        });
    });

    body.querySelectorAll("tr[data-profile-id]").forEach((row) => {
        row.addEventListener("click", () => budgetTcoSelectProfile(row.dataset.profileId));
    });

    if (deleteButton) deleteButton.disabled = selectedBudgetTcoProfiles.size === 0;
    if (selectAll) {
        selectAll.checked = budgetTcoProfiles.length > 0 && selectedBudgetTcoProfiles.size === budgetTcoProfiles.length;
        selectAll.indeterminate = selectedBudgetTcoProfiles.size > 0 && selectedBudgetTcoProfiles.size < budgetTcoProfiles.length;
    }
}

function renderBudgetTcoLines() {
    const body = document.getElementById("budget-tco-lines-table-body");
    const heading = document.getElementById("budget-tco-active-name");
    if (!body) return;

    const profile = getActiveBudgetTcoProfile();
    if (heading) heading.textContent = profile?.name || "TCO";

    if (!profile) {
        body.innerHTML = `<tr><td colspan="7" class="empty-state">Aucun TCO sélectionné.</td></tr>`;
        budgetTcoSetSummary(null);
        return;
    }

    if (budgetElements.length === 0) {
        body.innerHTML = `<tr><td colspan="7" class="empty-state">Aucun élément défini. Ajoute des éléments dans la page "Base de coûts".</td></tr>`;
        budgetTcoSetSummary(null);
        return;
    }

    const totalsByHorizon = computeBudgetProfileTotals(profile);
    budgetTcoSetSummary(totalsByHorizon);

    const activeTotals = totalsByHorizon[budgetTcoSelectedHorizon];
    const groups = groupBudgetElementsByType();
    body.innerHTML = "";

    groups.forEach((group) => {
        const color = group.type ? normalizeColor(group.type.color, 0) : "#94a3b8";

        const typeRow = document.createElement("tr");
        typeRow.className = `budget-type-row${group.isUnassigned ? " budget-type-unassigned" : ""}`;
        typeRow.style.backgroundColor = hexToRgba(color, group.isUnassigned ? 0.14 : 0.26);
        typeRow.style.boxShadow = `inset 4px 0 0 ${color}`;
        typeRow.innerHTML = `
            <td colspan="7">
                <div class="budget-type-row-inner">
                    <span class="budget-type-label">
                        <span class="budget-type-dot" style="background-color: ${escapeHtml(color)};"></span>
                        <span class="budget-type-title">${escapeHtml(group.label)}</span>
                    </span>
                </div>
            </td>
        `;
        body.appendChild(typeRow);

        if (group.items.length === 0) {
            const emptyRow = document.createElement("tr");
            emptyRow.innerHTML = `<td colspan="7" class="empty-state">Aucun élément dans ce type.</td>`;
            body.appendChild(emptyRow);
            return;
        }

        group.items.forEach(({ element }) => {
            const line = activeTotals.lines.find((item) => item.element.id === element.id);
            const row = document.createElement("tr");
            row.dataset.elementId = element.id;
            row.style.backgroundColor = hexToRgba(color, 0.10);

            row.innerHTML = `
                <td>${escapeHtml(element.name || "Élément sans nom")}</td>
                <td>${budgetNatureBadge(element.nature)}</td>
                <td>${escapeHtml(budgetCycleLabels[budgetNormalizeCycle(element.renewalCycle)])}</td>
                <td>${budgetFormatEuros(element.unitPrice)}</td>
                <td><input class="budget-quantity-input" type="number" min="0" step="any" value="${line.quantity}" data-element-id="${escapeHtml(element.id)}" aria-label="Quantité" /></td>
                <td class="budget-tco-cost-cell" data-element-id="${escapeHtml(element.id)}">${budgetFormatEuros(line.cost)}</td>
                <td class="budget-tco-percent-cell" data-element-id="${escapeHtml(element.id)}">${budgetFormatPercent(line.percent)}</td>
            `;

            body.appendChild(row);
        });
    });

    body.querySelectorAll(".budget-quantity-input").forEach((input) => {
        input.addEventListener("focus", (event) => event.target.select());
        input.addEventListener("input", (event) => {
            const elementId = event.target.dataset.elementId;
            const activeProfile = getActiveBudgetTcoProfile();
            if (!activeProfile) return;

            activeProfile.quantities[elementId] = budgetToNumber(event.target.value, 0);
            saveBudgetTcoProfiles();
            // Ne PAS ré-appeler renderBudgetTcoLines() ici : ça reconstruit tout le
            // tbody (donc l'input en cours de frappe) et fait perdre le focus après
            // chaque caractère. On met juste à jour les cellules calculées.
            updateBudgetTcoComputedCells();
        });
    });
}

// Met à jour le résumé + les cellules "Coût total"/"Poids" sans reconstruire le
// tableau, pour ne pas faire perdre le focus de l'input quantité en cours d'édition.
function updateBudgetTcoComputedCells() {
    const profile = getActiveBudgetTcoProfile();
    if (!profile) return;

    const totalsByHorizon = computeBudgetProfileTotals(profile);
    budgetTcoSetSummary(totalsByHorizon);

    const activeTotals = totalsByHorizon[budgetTcoSelectedHorizon];

    activeTotals.lines.forEach((line) => {
        const id = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(line.element.id) : line.element.id;
        const costCell = document.querySelector(`.budget-tco-cost-cell[data-element-id="${id}"]`);
        const percentCell = document.querySelector(`.budget-tco-percent-cell[data-element-id="${id}"]`);
        if (costCell) costCell.textContent = budgetFormatEuros(line.cost);
        if (percentCell) percentCell.textContent = budgetFormatPercent(line.percent);
    });
}

function budgetTcoSetSummary(totalsByHorizon) {
    BUDGET_HORIZONS.forEach((years) => {
        const capexEl = document.getElementById(`budget-tco-summary-capex-${years}`);
        const opexEl = document.getElementById(`budget-tco-summary-opex-${years}`);
        const totalEl = document.getElementById(`budget-tco-summary-total-${years}`);

        const capex = totalsByHorizon ? totalsByHorizon[years].capexTotal : 0;
        const opex = totalsByHorizon ? totalsByHorizon[years].opexTotal : 0;
        const total = totalsByHorizon ? totalsByHorizon[years].total : 0;

        if (capexEl) capexEl.textContent = budgetFormatEuros(capex);
        if (opexEl) opexEl.textContent = budgetFormatEuros(opex);
        if (totalEl) totalEl.textContent = budgetFormatEuros(total);
    });
}

function renderBudgetTcoAll() {
    renderBudgetTcoProfilesTable();
    renderBudgetTcoLines();
}

function bindBudgetTcoProfileListActions() {
    const addButton = document.getElementById("add-budget-tco-btn");
    const deleteButton = document.getElementById("delete-selected-budget-tco-btn");
    const selectAll = document.getElementById("select-all-budget-tco-profiles");

    if (addButton) addButton.addEventListener("click", addBudgetTcoProfile);
    if (deleteButton) deleteButton.addEventListener("click", deleteSelectedBudgetTcoProfiles);

    if (selectAll) {
        selectAll.addEventListener("change", (event) => {
            selectedBudgetTcoProfiles.clear();
            if (event.target.checked) budgetTcoProfiles.forEach((_, index) => selectedBudgetTcoProfiles.add(index));
            renderBudgetTcoProfilesTable();
        });
    }
}

function bindBudgetHorizonToggle(containerId, onChange) {
    const buttons = document.querySelectorAll(`#${containerId} [data-horizon]`);

    buttons.forEach((button) => {
        button.addEventListener("click", (event) => {
            const years = Number(event.currentTarget.dataset.horizon);
            if (!BUDGET_HORIZONS.includes(years)) return;

            buttons.forEach((btn) => btn.classList.toggle("active", Number(btn.dataset.horizon) === years));
            onChange(years);
        });
    });
}

function initBudgetTcoPage() {
    if (typeof helpTexts !== "undefined") {
        helpTexts["budget-tco"] = `
            <p>Cette page sert à construire un ou plusieurs TCO (Total Cost of Ownership) à partir de la base de coûts.</p>
            <ul>
                <li>La colonne de gauche liste tes TCO : coche puis "-" pour supprimer, "+" pour en créer un nouveau, clique sur un TCO pour l'afficher.</li>
                <li>Un seul TCO est affiché à la fois pour rester lisible.</li>
                <li>Les éléments, leur nature, leur cycle de renouvellement et leur prix unitaire viennent automatiquement de la page "Base de coûts". Renseigne juste une quantité pour chaque élément.</li>
                <li>Chaque élément se répète selon son cycle (perpétuel, annuel, mensuel, tous les 5 ans), ce qui se répercute automatiquement sur les totaux à 1, 5 et 10 ans.</li>
                <li>Le tableau récapitulatif en haut montre CAPEX, OPEX et Total pour ces trois horizons.</li>
                <li>Le sélecteur "1 an / 5 ans / 10 ans" au-dessus du tableau change l'horizon utilisé pour les colonnes "Coût total" et "Poids" de chaque élément.</li>
                <li>Les changements sont sauvegardés automatiquement.</li>
            </ul>
        `;
    }

    loadBudgetElementTypes();
    loadBudgetElements();
    loadBudgetTcoProfiles();

    bindBudgetTcoProfileListActions();
    bindBudgetHorizonToggle("budget-tco-horizon-toggle", (years) => {
        budgetTcoSelectedHorizon = years;
        renderBudgetTcoLines();
    });

    renderBudgetTcoAll();
}

/* =========================================================================
   PAGE : Bilan carbone (budget-carbone.html)
   ========================================================================= */

let budgetCarbonProfiles = [];
let budgetCarbonActiveProfileId = "";
let selectedBudgetCarbonProfiles = new Set();
let budgetCarbonSelectedHorizon = 5;

function budgetCreateDefaultCarbonProfile(name) {
    return { id: createId(), name: name || "", linkedTcoId: "" };
}

function loadBudgetCarbonProfiles() {
    let parsed = [];

    try {
        parsed = JSON.parse(localStorage.getItem(getProjectKey("budget_carbon_profiles")) || "[]");
    } catch (error) {
        parsed = [];
    }

    budgetCarbonProfiles = Array.isArray(parsed)
        ? parsed.map((profile) => ({ id: profile.id || createId(), name: profile.name || "", linkedTcoId: profile.linkedTcoId || "" }))
        : [];

    if (budgetCarbonProfiles.length === 0) {
        budgetCarbonProfiles = [budgetCreateDefaultCarbonProfile("Bilan carbone 1")];
    }

    // Si le TCO lié a disparu (ou n'a jamais été choisi), on retombe sur le premier
    // TCO disponible pour que le bilan affiche tout de suite quelque chose.
    budgetCarbonProfiles.forEach((profile) => {
        if (!profile.linkedTcoId || !budgetTcoProfiles.some((tco) => tco.id === profile.linkedTcoId)) {
            profile.linkedTcoId = budgetTcoProfiles[0]?.id || "";
        }
    });

    budgetCarbonActiveProfileId = localStorage.getItem(getProjectKey("budget_carbon_active_id")) || "";

    if (!budgetCarbonProfiles.some((profile) => profile.id === budgetCarbonActiveProfileId)) {
        budgetCarbonActiveProfileId = budgetCarbonProfiles[0].id;
    }

    saveBudgetCarbonProfiles();
    saveBudgetCarbonActiveProfileId();
}

function saveBudgetCarbonProfiles() {
    localStorage.setItem(getProjectKey("budget_carbon_profiles"), JSON.stringify(budgetCarbonProfiles));
}

function saveBudgetCarbonActiveProfileId() {
    localStorage.setItem(getProjectKey("budget_carbon_active_id"), budgetCarbonActiveProfileId);
}

function getActiveBudgetCarbonProfile() {
    return budgetCarbonProfiles.find((profile) => profile.id === budgetCarbonActiveProfileId) || budgetCarbonProfiles[0];
}

function getLinkedTcoForCarbonProfile(carbonProfile) {
    return budgetTcoProfiles.find((tco) => tco.id === carbonProfile?.linkedTcoId);
}

function budgetCarbonSelectProfile(profileId) {
    if (profileId === budgetCarbonActiveProfileId) return;
    budgetCarbonActiveProfileId = profileId;
    saveBudgetCarbonActiveProfileId();
    renderBudgetCarbonAll();
}

function addBudgetCarbonProfile() {
    const profile = budgetCreateDefaultCarbonProfile(`Bilan carbone ${budgetCarbonProfiles.length + 1}`);
    profile.linkedTcoId = budgetTcoProfiles[0]?.id || "";
    budgetCarbonProfiles.push(profile);
    budgetCarbonActiveProfileId = profile.id;

    saveBudgetCarbonProfiles();
    saveBudgetCarbonActiveProfileId();
    renderBudgetCarbonAll();

    const lastNameCell = document.querySelector("#budget-carbon-profiles-table-body tr:last-child .budget-carbon-profile-name-cell");
    if (lastNameCell) lastNameCell.focus();
}

function deleteSelectedBudgetCarbonProfiles() {
    if (selectedBudgetCarbonProfiles.size === 0) return;

    if (selectedBudgetCarbonProfiles.size >= budgetCarbonProfiles.length) {
        alert("Impossible de supprimer tous les bilans carbone : il en faut au moins un.");
        return;
    }

    if (!confirm("Supprimer les bilans carbone sélectionnés ?")) return;

    budgetCarbonProfiles = budgetCarbonProfiles.filter((_, index) => !selectedBudgetCarbonProfiles.has(index));
    selectedBudgetCarbonProfiles.clear();

    if (!budgetCarbonProfiles.some((profile) => profile.id === budgetCarbonActiveProfileId)) {
        budgetCarbonActiveProfileId = budgetCarbonProfiles[0].id;
        saveBudgetCarbonActiveProfileId();
    }

    saveBudgetCarbonProfiles();
    renderBudgetCarbonAll();
}

function renderBudgetCarbonProfilesTable() {
    const body = document.getElementById("budget-carbon-profiles-table-body");
    const deleteButton = document.getElementById("delete-selected-budget-carbon-btn");
    const selectAll = document.getElementById("select-all-budget-carbon-profiles");

    if (!body) return;

    body.innerHTML = "";

    budgetCarbonProfiles.forEach((profile, index) => {
        const isSelected = selectedBudgetCarbonProfiles.has(index);
        const isActive = profile.id === budgetCarbonActiveProfileId;

        const row = document.createElement("tr");
        row.dataset.profileId = profile.id;
        row.classList.toggle("selected-row", isSelected);
        row.classList.toggle("budget-tco-profile-active", isActive);

        row.innerHTML = `
            <td class="select-col">
                <input class="row-checkbox budget-carbon-profile-checkbox" type="checkbox" data-index="${index}" aria-label="Sélectionner le bilan carbone ${index + 1}" ${isSelected ? "checked" : ""} />
            </td>
            <td>${index + 1}</td>
            <td class="editable budget-carbon-profile-name-cell" contenteditable="true" data-index="${index}" spellcheck="true">${escapeHtml(profile.name)}</td>
        `;

        body.appendChild(row);
    });

    body.querySelectorAll(".budget-carbon-profile-checkbox").forEach((checkbox) => {
        checkbox.addEventListener("click", (event) => event.stopPropagation());
        checkbox.addEventListener("change", (event) => {
            const index = Number(event.target.dataset.index);
            if (event.target.checked) selectedBudgetCarbonProfiles.add(index);
            else selectedBudgetCarbonProfiles.delete(index);
            renderBudgetCarbonProfilesTable();
        });
    });

    body.querySelectorAll(".budget-carbon-profile-name-cell").forEach((cell) => {
        cell.addEventListener("click", (event) => event.stopPropagation());
        cell.addEventListener("input", (event) => {
            const index = Number(event.target.dataset.index);
            if (!budgetCarbonProfiles[index]) return;
            budgetCarbonProfiles[index].name = event.target.textContent.trim();
            saveBudgetCarbonProfiles();

            if (budgetCarbonProfiles[index].id === budgetCarbonActiveProfileId) {
                const heading = document.getElementById("budget-carbon-active-name");
                if (heading) heading.textContent = budgetCarbonProfiles[index].name || "Bilan carbone";
            }
        });
    });

    body.querySelectorAll("tr[data-profile-id]").forEach((row) => {
        row.addEventListener("click", () => budgetCarbonSelectProfile(row.dataset.profileId));
    });

    if (deleteButton) deleteButton.disabled = selectedBudgetCarbonProfiles.size === 0;
    if (selectAll) {
        selectAll.checked = budgetCarbonProfiles.length > 0 && selectedBudgetCarbonProfiles.size === budgetCarbonProfiles.length;
        selectAll.indeterminate = selectedBudgetCarbonProfiles.size > 0 && selectedBudgetCarbonProfiles.size < budgetCarbonProfiles.length;
    }
}

function renderBudgetCarbonTcoSourceSelect() {
    const select = document.getElementById("budget-carbon-tco-source");
    if (!select) return;

    const profile = getActiveBudgetCarbonProfile();

    if (budgetTcoProfiles.length === 0) {
        select.innerHTML = `<option value="">Aucun TCO disponible</option>`;
        select.disabled = true;
        return;
    }

    select.disabled = false;
    select.innerHTML = budgetTcoProfiles
        .map((tco) => `<option value="${escapeHtml(tco.id)}" ${tco.id === profile?.linkedTcoId ? "selected" : ""}>${escapeHtml(tco.name || "TCO sans nom")}</option>`)
        .join("");
}

function renderBudgetCarbonLines() {
    const body = document.getElementById("budget-carbon-lines-table-body");
    const heading = document.getElementById("budget-carbon-active-name");
    if (!body) return;

    const profile = getActiveBudgetCarbonProfile();
    if (heading) heading.textContent = profile?.name || "Bilan carbone";

    renderBudgetCarbonTcoSourceSelect();

    if (!profile) {
        body.innerHTML = `<tr><td colspan="7" class="empty-state">Aucun bilan carbone sélectionné.</td></tr>`;
        budgetCarbonSetSummary(null);
        return;
    }

    const linkedTco = getLinkedTcoForCarbonProfile(profile);

    if (!linkedTco) {
        body.innerHTML = `<tr><td colspan="7" class="empty-state">Aucun TCO source. Crée d'abord un TCO dans la page "TCO", puis choisis-le ci-dessus.</td></tr>`;
        budgetCarbonSetSummary(null);
        return;
    }

    if (budgetElements.length === 0) {
        body.innerHTML = `<tr><td colspan="7" class="empty-state">Aucun élément défini. Ajoute des éléments dans la page "Base de coûts".</td></tr>`;
        budgetCarbonSetSummary(null);
        return;
    }

    const totalsByHorizon = computeBudgetCarbonTotals(linkedTco.quantities);
    budgetCarbonSetSummary(totalsByHorizon);

    const activeTotals = totalsByHorizon[budgetCarbonSelectedHorizon];
    const groups = groupBudgetElementsByType();
    body.innerHTML = "";

    groups.forEach((group) => {
        const color = group.type ? normalizeColor(group.type.color, 0) : "#94a3b8";

        const typeRow = document.createElement("tr");
        typeRow.className = `budget-type-row${group.isUnassigned ? " budget-type-unassigned" : ""}`;
        typeRow.style.backgroundColor = hexToRgba(color, group.isUnassigned ? 0.14 : 0.26);
        typeRow.style.boxShadow = `inset 4px 0 0 ${color}`;
        typeRow.innerHTML = `
            <td colspan="7">
                <div class="budget-type-row-inner">
                    <span class="budget-type-label">
                        <span class="budget-type-dot" style="background-color: ${escapeHtml(color)};"></span>
                        <span class="budget-type-title">${escapeHtml(group.label)}</span>
                    </span>
                </div>
            </td>
        `;
        body.appendChild(typeRow);

        if (group.items.length === 0) {
            const emptyRow = document.createElement("tr");
            emptyRow.innerHTML = `<td colspan="7" class="empty-state">Aucun élément dans ce type.</td>`;
            body.appendChild(emptyRow);
            return;
        }

        group.items.forEach(({ element }) => {
            const line = activeTotals.lines.find((item) => item.element.id === element.id);
            const row = document.createElement("tr");
            row.style.backgroundColor = hexToRgba(color, 0.10);

            row.innerHTML = `
                <td>${escapeHtml(element.name || "Élément sans nom")}</td>
                <td>${budgetScopeBadge(element.carbonScope)}</td>
                <td>${escapeHtml(budgetCycleLabels[budgetNormalizeCycle(element.renewalCycle)])}</td>
                <td>${line.quantity}</td>
                <td>${budgetToNumber(element.carbonFactor, 0)} kg CO2e</td>
                <td>${budgetFormatCarbon(line.footprint)}</td>
                <td>${budgetFormatPercent(line.percent)}</td>
            `;

            body.appendChild(row);
        });
    });
}

function budgetCarbonSetSummary(totalsByHorizon) {
    BUDGET_HORIZONS.forEach((years) => {
        const scope1El = document.getElementById(`budget-carbon-summary-scope1-${years}`);
        const scope2El = document.getElementById(`budget-carbon-summary-scope2-${years}`);
        const scope3El = document.getElementById(`budget-carbon-summary-scope3-${years}`);
        const totalEl = document.getElementById(`budget-carbon-summary-total-${years}`);

        const scope1 = totalsByHorizon ? totalsByHorizon[years].scope1Total : 0;
        const scope2 = totalsByHorizon ? totalsByHorizon[years].scope2Total : 0;
        const scope3 = totalsByHorizon ? totalsByHorizon[years].scope3Total : 0;
        const total = totalsByHorizon ? totalsByHorizon[years].total : 0;

        if (scope1El) scope1El.textContent = budgetFormatCarbon(scope1);
        if (scope2El) scope2El.textContent = budgetFormatCarbon(scope2);
        if (scope3El) scope3El.textContent = budgetFormatCarbon(scope3);
        if (totalEl) totalEl.textContent = budgetFormatCarbon(total);
    });
}

function renderBudgetCarbonAll() {
    renderBudgetCarbonProfilesTable();
    renderBudgetCarbonLines();
}

function bindBudgetCarbonProfileListActions() {
    const addButton = document.getElementById("add-budget-carbon-btn");
    const deleteButton = document.getElementById("delete-selected-budget-carbon-btn");
    const selectAll = document.getElementById("select-all-budget-carbon-profiles");
    const tcoSourceSelect = document.getElementById("budget-carbon-tco-source");

    if (addButton) addButton.addEventListener("click", addBudgetCarbonProfile);
    if (deleteButton) deleteButton.addEventListener("click", deleteSelectedBudgetCarbonProfiles);

    if (selectAll) {
        selectAll.addEventListener("change", (event) => {
            selectedBudgetCarbonProfiles.clear();
            if (event.target.checked) budgetCarbonProfiles.forEach((_, index) => selectedBudgetCarbonProfiles.add(index));
            renderBudgetCarbonProfilesTable();
        });
    }

    if (tcoSourceSelect) {
        tcoSourceSelect.addEventListener("change", (event) => {
            const profile = getActiveBudgetCarbonProfile();
            if (!profile) return;
            profile.linkedTcoId = event.target.value;
            saveBudgetCarbonProfiles();
            renderBudgetCarbonLines();
        });
    }
}

function initBudgetCarbonPage() {
    if (typeof helpTexts !== "undefined") {
        helpTexts["budget-carbone"] = `
            <p>Cette page calcule le bilan carbone d'un TCO, sur le modèle du GHG Protocol / Bilan Carbone® (ADEME).</p>
            <ul>
                <li>La colonne de gauche liste tes bilans carbone : coche puis "-" pour supprimer, "+" pour en créer un nouveau, clique sur un bilan pour l'afficher.</li>
                <li>Chaque bilan est lié à un TCO via le sélecteur "TCO source" : il reprend automatiquement les quantités de ce TCO, tu n'as rien à ressaisir.</li>
                <li>Le facteur d'émission (kg CO2e par unité) et le scope (1, 2 ou 3) de chaque élément se règlent dans la page "Base de coûts".</li>
                <li>Comme pour le TCO financier, le cycle de renouvellement de chaque élément se répercute sur les totaux à 1, 5 et 10 ans (un serveur renouvelé tous les 5 ans "pollue" deux fois sur un horizon de 10 ans).</li>
                <li>Le tableau récapitulatif montre les Scope 1, 2, 3 et le total, pour ces trois horizons, en kg ou tonnes de CO2e.</li>
                <li>Pour comparer plusieurs bilans carbone entre eux, va dans la page "Comparatifs" et bascule sur le mode "Carbone".</li>
            </ul>
        `;
    }

    loadBudgetElementTypes();
    loadBudgetElements();
    loadBudgetTcoProfiles();
    loadBudgetCarbonProfiles();

    bindBudgetCarbonProfileListActions();
    bindBudgetHorizonToggle("budget-carbon-horizon-toggle", (years) => {
        budgetCarbonSelectedHorizon = years;
        renderBudgetCarbonLines();
    });

    renderBudgetCarbonAll();
}

/* =========================================================================
   PAGE : Comparatifs (budget-comparatifs.html)
   ========================================================================= */

let budgetComparatifsMode = "cost";

function getBudgetComparatifsProfiles() {
    return budgetComparatifsMode === "carbon" ? budgetCarbonProfiles : budgetTcoProfiles;
}

function renderBudgetComparatifsChecklist() {
    const container = document.getElementById("budget-comparatifs-checklist");
    if (!container) return;

    const profiles = getBudgetComparatifsProfiles();
    const emptyMessage =
        budgetComparatifsMode === "carbon"
            ? `Aucun bilan carbone pour le moment. Crée-en un dans la page "Bilan carbone".`
            : `Aucun TCO pour le moment. Crée-en un dans la page "TCO".`;

    if (profiles.length === 0) {
        container.innerHTML = `<p class="empty-state">${emptyMessage}</p>`;
        return;
    }

    container.innerHTML = profiles
        .map(
            (profile) => `
        <label class="budget-comparatif-check-row">
            <input type="checkbox" data-profile-id="${escapeHtml(profile.id)}" ${selectedBudgetComparatifIds.has(profile.id) ? "checked" : ""} />
            <span>${escapeHtml(profile.name || "Sans nom")}</span>
        </label>
    `
        )
        .join("");

    container.querySelectorAll("input[type=checkbox]").forEach((checkbox) => {
        checkbox.addEventListener("change", (event) => {
            const profileId = event.target.dataset.profileId;
            if (event.target.checked) selectedBudgetComparatifIds.add(profileId);
            else selectedBudgetComparatifIds.delete(profileId);
            renderBudgetComparatifsTable();
        });
    });
}

function renderBudgetComparatifsTable() {
    if (budgetComparatifsMode === "carbon") {
        renderBudgetComparatifsCarbonTable();
    } else {
        renderBudgetComparatifsCostTable();
    }
}

function renderBudgetComparatifsCostTable() {
    const wrapper = document.getElementById("budget-comparatifs-table-wrapper");
    if (!wrapper) return;

    const selectedProfiles = budgetTcoProfiles.filter((profile) => selectedBudgetComparatifIds.has(profile.id));

    if (selectedProfiles.length === 0) {
        wrapper.innerHTML = `<p class="empty-state">Coche au moins un TCO à gauche pour lancer le comparatif.</p>`;
        return;
    }

    const groups = groupBudgetElementsByType();
    const totalsByProfile = new Map(selectedProfiles.map((profile) => [profile.id, computeBudgetProfileTotals(profile)]));

    let rows = "";

    groups.forEach((group) => {
        const color = group.type ? normalizeColor(group.type.color, 0) : "#94a3b8";

        if (group.items.length === 0) return;

        rows += `
            <tr class="budget-type-row${group.isUnassigned ? " budget-type-unassigned" : ""}" style="background-color: ${hexToRgba(color, group.isUnassigned ? 0.14 : 0.26)}; box-shadow: inset 4px 0 0 ${color};">
                <td colspan="${selectedProfiles.length + 2}">
                    <div class="budget-type-row-inner">
                        <span class="budget-type-label">
                            <span class="budget-type-dot" style="background-color: ${escapeHtml(color)};"></span>
                            <span class="budget-type-title">${escapeHtml(group.label)}</span>
                        </span>
                    </div>
                </td>
            </tr>
        `;

        group.items.forEach(({ element }) => {
            const cells = selectedProfiles
                .map((profile) => {
                    const totals = totalsByProfile.get(profile.id)[budgetComparatifsSelectedHorizon];
                    const line = totals.lines.find((item) => item.element.id === element.id);
                    return `<td>${budgetFormatEuros(line ? line.cost : 0)}</td>`;
                })
                .join("");

            rows += `
                <tr>
                    <td>${escapeHtml(element.name || "Élément sans nom")}</td>
                    <td>${budgetNatureBadge(element.nature)}</td>
                    ${cells}
                </tr>
            `;
        });
    });

    const summaryRow = (label, valueGetter) => `
        <tr class="budget-comparatifs-summary-row">
            <td colspan="2">${label}</td>
            ${selectedProfiles.map((profile) => `<td>${budgetFormatEuros(valueGetter(totalsByProfile.get(profile.id)))}</td>`).join("")}
        </tr>
    `;

    const header = `
        <thead>
            <tr>
                <th>Élément</th>
                <th>Nature</th>
                ${selectedProfiles.map((profile) => `<th>${escapeHtml(profile.name || "TCO sans nom")}</th>`).join("")}
            </tr>
        </thead>
    `;

    const footer = `
        <tfoot>
            ${summaryRow("CAPEX 1 an", (t) => t[1].capexTotal)}
            ${summaryRow("CAPEX 5 ans", (t) => t[5].capexTotal)}
            ${summaryRow("CAPEX 10 ans", (t) => t[10].capexTotal)}
            ${summaryRow("OPEX 1 an", (t) => t[1].opexTotal)}
            ${summaryRow("OPEX 5 ans", (t) => t[5].opexTotal)}
            ${summaryRow("OPEX 10 ans", (t) => t[10].opexTotal)}
            ${summaryRow("TCO 1 an", (t) => t[1].total)}
            ${summaryRow("TCO 5 ans", (t) => t[5].total)}
            ${summaryRow("TCO 10 ans", (t) => t[10].total)}
        </tfoot>
    `;

    wrapper.innerHTML = `<table class="budget-comparatifs-table">${header}<tbody>${rows}</tbody>${footer}</table>`;
}

function renderBudgetComparatifsCarbonTable() {
    const wrapper = document.getElementById("budget-comparatifs-table-wrapper");
    if (!wrapper) return;

    const selectedProfiles = budgetCarbonProfiles.filter((profile) => selectedBudgetComparatifIds.has(profile.id));

    if (selectedProfiles.length === 0) {
        wrapper.innerHTML = `<p class="empty-state">Coche au moins un bilan carbone à gauche pour lancer le comparatif.</p>`;
        return;
    }

    const groups = groupBudgetElementsByType();
    const totalsByProfile = new Map(
        selectedProfiles.map((profile) => [profile.id, computeBudgetCarbonTotals(getLinkedTcoForCarbonProfile(profile)?.quantities)])
    );

    let rows = "";

    groups.forEach((group) => {
        const color = group.type ? normalizeColor(group.type.color, 0) : "#94a3b8";

        if (group.items.length === 0) return;

        rows += `
            <tr class="budget-type-row${group.isUnassigned ? " budget-type-unassigned" : ""}" style="background-color: ${hexToRgba(color, group.isUnassigned ? 0.14 : 0.26)}; box-shadow: inset 4px 0 0 ${color};">
                <td colspan="${selectedProfiles.length + 2}">
                    <div class="budget-type-row-inner">
                        <span class="budget-type-label">
                            <span class="budget-type-dot" style="background-color: ${escapeHtml(color)};"></span>
                            <span class="budget-type-title">${escapeHtml(group.label)}</span>
                        </span>
                    </div>
                </td>
            </tr>
        `;

        group.items.forEach(({ element }) => {
            const cells = selectedProfiles
                .map((profile) => {
                    const totals = totalsByProfile.get(profile.id)[budgetComparatifsSelectedHorizon];
                    const line = totals.lines.find((item) => item.element.id === element.id);
                    return `<td>${budgetFormatCarbon(line ? line.footprint : 0)}</td>`;
                })
                .join("");

            rows += `
                <tr>
                    <td>${escapeHtml(element.name || "Élément sans nom")}</td>
                    <td>${budgetScopeBadge(element.carbonScope)}</td>
                    ${cells}
                </tr>
            `;
        });
    });

    const summaryRow = (label, valueGetter) => `
        <tr class="budget-comparatifs-summary-row">
            <td colspan="2">${label}</td>
            ${selectedProfiles.map((profile) => `<td>${budgetFormatCarbon(valueGetter(totalsByProfile.get(profile.id)))}</td>`).join("")}
        </tr>
    `;

    const header = `
        <thead>
            <tr>
                <th>Élément</th>
                <th>Scope</th>
                ${selectedProfiles.map((profile) => `<th>${escapeHtml(profile.name || "Bilan sans nom")}</th>`).join("")}
            </tr>
        </thead>
    `;

    const footer = `
        <tfoot>
            ${summaryRow("Scope 1 · 1 an", (t) => t[1].scope1Total)}
            ${summaryRow("Scope 1 · 5 ans", (t) => t[5].scope1Total)}
            ${summaryRow("Scope 1 · 10 ans", (t) => t[10].scope1Total)}
            ${summaryRow("Scope 2 · 1 an", (t) => t[1].scope2Total)}
            ${summaryRow("Scope 2 · 5 ans", (t) => t[5].scope2Total)}
            ${summaryRow("Scope 2 · 10 ans", (t) => t[10].scope2Total)}
            ${summaryRow("Scope 3 · 1 an", (t) => t[1].scope3Total)}
            ${summaryRow("Scope 3 · 5 ans", (t) => t[5].scope3Total)}
            ${summaryRow("Scope 3 · 10 ans", (t) => t[10].scope3Total)}
            ${summaryRow("Total · 1 an", (t) => t[1].total)}
            ${summaryRow("Total · 5 ans", (t) => t[5].total)}
            ${summaryRow("Total · 10 ans", (t) => t[10].total)}
        </tfoot>
    `;

    wrapper.innerHTML = `<table class="budget-comparatifs-table">${header}<tbody>${rows}</tbody>${footer}</table>`;
}

function bindBudgetComparatifsModeToggle() {
    const buttons = document.querySelectorAll("#budget-comparatifs-mode-toggle [data-mode]");

    buttons.forEach((button) => {
        button.addEventListener("click", (event) => {
            const mode = event.currentTarget.dataset.mode === "carbon" ? "carbon" : "cost";
            if (mode === budgetComparatifsMode) return;

            budgetComparatifsMode = mode;
            buttons.forEach((btn) => btn.classList.toggle("active", btn.dataset.mode === mode));

            const title = document.getElementById("budget-comparatifs-checklist-title");
            if (title) title.textContent = mode === "carbon" ? "Bilans carbone à comparer" : "TCO à comparer";

            selectedBudgetComparatifIds = new Set(getBudgetComparatifsProfiles().map((profile) => profile.id));

            renderBudgetComparatifsChecklist();
            renderBudgetComparatifsTable();
        });
    });
}

function initBudgetComparatifsPage() {
    if (typeof helpTexts !== "undefined") {
        helpTexts["budget-comparatifs"] = `
            <p>Cette page compare plusieurs TCO (mode "Coûts") ou plusieurs bilans carbone (mode "Carbone") entre eux.</p>
            <ul>
                <li>Le sélecteur "Coûts / Carbone" en haut à gauche change ce qui est comparé.</li>
                <li>Coche à gauche les TCO (ou bilans carbone) que tu veux comparer : un seul, plusieurs, ou tous.</li>
                <li>Le sélecteur "1 an / 5 ans / 10 ans" change l'horizon utilisé pour la colonne de chaque élément.</li>
                <li>En mode Coûts, le tableau affiche le coût de chaque élément et les totaux CAPEX, OPEX, TCO sur 1, 5 et 10 ans.</li>
                <li>En mode Carbone, le tableau affiche l'empreinte carbone de chaque élément et les totaux Scope 1, 2, 3 sur 1, 5 et 10 ans.</li>
                <li>La sélection est mémorisée pour cette page, séparément pour chaque mode.</li>
            </ul>
        `;
    }

    loadBudgetElementTypes();
    loadBudgetElements();
    loadBudgetTcoProfiles();
    loadBudgetCarbonProfiles();

    selectedBudgetComparatifIds = new Set(getBudgetComparatifsProfiles().map((profile) => profile.id));

    bindBudgetHorizonToggle("budget-comparatifs-horizon-toggle", (years) => {
        budgetComparatifsSelectedHorizon = years;
        renderBudgetComparatifsTable();
    });
    bindBudgetComparatifsModeToggle();

    renderBudgetComparatifsChecklist();
    renderBudgetComparatifsTable();
}
