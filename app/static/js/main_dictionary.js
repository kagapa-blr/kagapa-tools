// static/js/main_dictionary.js
import apiClient from "./apiClient.js";
import API_ENDPOINTS from "./apiEndpoints.js";

// ================================
// STATE MANAGEMENT
// ================================
const state = {
    addWords: [],
    removeWords: [],
    busy: false,
    table: null,
    selectedWords: new Set(),
};

// ================================
// DOM ELEMENTS
// ================================
const els = {
    // Add panel
    addWordsInput: document.getElementById("mainAddWordsInput"),
    mainAddWordBtn: document.getElementById("mainAddWordBtn"),
    mainAddWordsChips: document.getElementById("mainAddWordsChips"),
    mainAddSubmitBtn: document.getElementById("mainAddSubmitBtn"),
    mainAddClearBtn: document.getElementById("mainAddClearBtn"),

    // Remove panel
    removeWordsInput: document.getElementById("mainRemoveWordsInput"),
    mainRemoveWordBtn: document.getElementById("mainRemoveWordBtn"),
    mainRemoveWordsChips: document.getElementById("mainRemoveWordsChips"),
    mainRemoveSubmitBtn: document.getElementById("mainRemoveSubmitBtn"),
    mainRemoveClearBtn: document.getElementById("mainRemoveClearBtn"),

    // Stats
    totalWordsCount: document.getElementById("totalWordsCount"),
    topFrequency: document.getElementById("topFrequency"),

    // Table
    refreshMainTableBtn: document.getElementById("refreshMainTableBtn"),
    mainTableSearchInput: document.getElementById("mainTableSearchInput"),
    mainTableSearchBtn: document.getElementById("mainTableSearchBtn"),
    mainSelectAll: document.getElementById("mainSelectAll"),
    mainIncrementSelectedBtn: document.getElementById("mainIncrementSelectedBtn"),
    mainDeleteSelectedBtn: document.getElementById("mainDeleteSelectedBtn"),

    // Log
    logArea: document.getElementById("mainLogArea"),

    // Loading
    globalLoadingOverlay: document.getElementById("globalLoadingOverlay"),
};

// ================================
// UTILITY FUNCTIONS
// ================================

/**
 * Safe HTML escaping for XSS protection
 */
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
}

/**
 * Normalize table data - CRITICAL FIX for null/undefined errors
 * ✅ SHOWS RAW BACKEND DATA - NO FORMATTING
 */
function normalizeTableData(rawData) {
    if (!rawData || !Array.isArray(rawData)) {
        console.warn('Invalid table data received:', rawData);
        return [];
    }

    return rawData
        .map((row, index) => ({
            id: row.id || `row-${index}`,
            word: row.word || '',
            frequency: row.frequency || 0,  // ✅ RAW backend value
            added_by: row.added_by || 'Unknown',  // ✅ RAW backend value
            added: row.added || row.added_at || 'N/A'  // ✅ RAW backend date/timestamp
        }))
        .filter(row => row.word && row.word.trim().length > 0);
}

/**
 * Parse comma/space separated words
 */
function parseWordsInput(value) {
    if (!value) return [];
    return value
        .split(/[,\s]+/)
        .map(w => w.trim())
        .filter(Boolean);
}

/**
 * Render word chips with remove functionality
 */
function renderChips(container, items) {
    container.innerHTML = '';
    items.forEach((word, idx) => {
        const chip = document.createElement("span");
        chip.className = "badge bg-success me-1 mb-1 px-3 py-2";
        chip.innerHTML = `${escapeHtml(word)} 
            <i class="bi bi-x-circle ms-2 text-danger cursor-pointer" 
               style="cursor:pointer; font-size: 0.9em;" 
               onclick="mainDict.removeChip('${container.id}', ${idx})" 
               title="Remove"></i>`;
        container.appendChild(chip);
    });
}

/**
 * ✅ ENHANCED LOG - Shows RAW backend errors/messages
 */
function log(responseData, type = "info") {
    const line = document.createElement("div");
    line.className = "mb-2 p-3 bg-light rounded-3 border-start border-3 shadow-sm";

    let msg = "", badgeClass = "bg-secondary", icon = "ℹ️";
    let detailsContent = "";

    // ✅ RAW BACKEND DATA DISPLAY
    if (typeof responseData === "object" && responseData !== null) {
        const created = (responseData.created || []).length;
        const skipped = (responseData.skipped || []).length;
        const deleted = (responseData.deleted || []).length;
        const notFound = (responseData.not_found || []).length;

        // ✅ Backend error messages first
        if (responseData.error || responseData.message || responseData.detail) {
            badgeClass = "bg-danger border-danger";
            icon = "❌";
            msg = responseData.error || responseData.message || responseData.detail || "ERROR";
            detailsContent = JSON.stringify(responseData, null, 2);
        }
        // ✅ Success responses
        else if (created > 0 || deleted > 0) {
            badgeClass = "bg-success border-success";
            icon = "✅";
            msg = created > 0 ? `ADDED: ${created}` : `DELETED: ${deleted}`;
            if (skipped > 0) msg += ` | SKIPPED: ${skipped}`;
            if (notFound > 0) msg += ` | NOT FOUND: ${notFound}`;
            detailsContent = JSON.stringify(responseData, null, 2);
        }
        // ✅ Warning responses
        else if (skipped > 0 || notFound > 0) {
            badgeClass = "bg-warning border-warning text-dark";
            icon = "⚠️";
            msg = `SKIPPED: ${skipped + notFound} words`;
            detailsContent = JSON.stringify(responseData, null, 2);
        }
        // ✅ Info responses
        else {
            badgeClass = "bg-info border-info";
            icon = "ℹ️";
            msg = responseData.status || "INFO";
            detailsContent = JSON.stringify(responseData, null, 2);
        }
    } else {
        // Manual string messages
        if (type === "success" || type === "ok") {
            badgeClass = "bg-success border-success";
            icon = "✅";
            msg = responseData || "SUCCESS";
        } else if (type === "error" || type === "err") {
            badgeClass = "bg-danger border-danger";
            icon = "❌";
            msg = responseData || "ERROR";
        } else {
            badgeClass = "bg-secondary border-secondary";
            icon = "ℹ️";
            msg = responseData || "INFO";
        }
        detailsContent = responseData;
    }

    const badge = document.createElement("span");
    badge.className = `badge ${badgeClass} fs-6 fw-bold me-3 px-3 py-2`;
    badge.innerHTML = `${icon} ${msg}`;

    const details = document.createElement("div");
    details.className = "small text-muted mt-2 p-2 bg-white rounded-2 border";
    details.style.fontFamily = "'JetBrains Mono', Consolas, monospace";
    details.style.fontSize = "0.8em";
    details.style.maxHeight = "100px";
    details.style.overflow = "auto";
    details.textContent = detailsContent;

    line.appendChild(badge);
    line.appendChild(details);
    els.logArea.prepend(line);
    els.logArea.scrollTop = 0;

    // Keep only last 50 entries
    const entries = els.logArea.querySelectorAll("div");
    if (entries.length > 50) {
        Array.from(entries).slice(50).forEach(entry => entry.remove());
    }
}

// ================================
// UI STATE MANAGEMENT
// ================================
function toggleBusy(disabled) {
    state.busy = disabled;
    const buttons = [
        els.mainAddWordBtn, els.mainAddSubmitBtn, els.mainAddClearBtn,
        els.mainRemoveWordBtn, els.mainRemoveSubmitBtn, els.mainRemoveClearBtn,
        els.refreshMainTableBtn, els.mainIncrementSelectedBtn, els.mainDeleteSelectedBtn,
        els.mainTableSearchBtn
    ];
    buttons.forEach(btn => btn && (btn.disabled = disabled));
}

function showLoading(show = true) {
    const overlay = els.globalLoadingOverlay;
    if (show) {
        overlay?.classList.remove("d-none");
    } else {
        overlay?.classList.add("d-none");
    }
}

// ================================
// ADD WORDS SECTION
// ================================
function handleAddWords() {
    const words = parseWordsInput(els.addWordsInput.value);
    if (!words.length) return;

    const newWords = words.filter(w => !state.addWords.includes(w));
    state.addWords.push(...newWords);

    els.addWordsInput.value = "";
    renderChips(els.mainAddWordsChips, state.addWords);
    log(`${newWords.length} word(s) queued for addition`, "info");
}

function initAddSection() {
    els.mainAddWordBtn?.addEventListener("click", handleAddWords);
    els.addWordsInput?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleAddWords();
        }
    });

    els.mainAddClearBtn?.addEventListener("click", () => {
        state.addWords = [];
        renderChips(els.mainAddWordsChips, state.addWords);
    });

    els.mainAddSubmitBtn?.addEventListener("click", async () => {
        if (!state.addWords.length) {
            log("No words queued to add.", "warn");
            return;
        }

        if (!confirm(`Add ${state.addWords.length} word(s) to CORE dictionary?\n\n⚡ Changes apply instantly to all clients.`)) {
            return;
        }

        toggleBusy(true);
        showLoading(true);
        try {
            const data = await apiClient.post(API_ENDPOINTS.MAIN_DICTIONARY.ADD, { words: state.addWords });
            log(data, "success");  // ✅ RAW backend response
            state.addWords = [];
            renderChips(els.mainAddWordsChips, state.addWords);
            reloadTable(true);
        } catch (err) {
            log(err.response?.data || err.message || err, "error");  // ✅ RAW backend error
        } finally {
            toggleBusy(false);
            showLoading(false);
        }
    });
}

// ================================
// REMOVE WORDS SECTION
// ================================
function handleRemoveWords() {
    const words = parseWordsInput(els.removeWordsInput.value);
    if (!words.length) return;

    const newWords = words.filter(w => !state.removeWords.includes(w));
    state.removeWords.push(...newWords);

    els.removeWordsInput.value = "";
    renderChips(els.mainRemoveWordsChips, state.removeWords);
    log(`${newWords.length} word(s) queued for removal`, "info");
}

function initRemoveSection() {
    els.mainRemoveWordBtn?.addEventListener("click", handleRemoveWords);
    els.removeWordsInput?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleRemoveWords();
        }
    });

    els.mainRemoveClearBtn?.addEventListener("click", () => {
        state.removeWords = [];
        renderChips(els.mainRemoveWordsChips, state.removeWords);
    });

    els.mainRemoveSubmitBtn?.addEventListener("click", async () => {
        if (!state.removeWords.length) {
            log("No words queued to remove.", "warn");
            return;
        }

        if (!confirm(`PERMANENTLY delete ${state.removeWords.length} word(s) from CORE dictionary?\n\n⚠️ This cannot be undone.`)) {
            return;
        }

        toggleBusy(true);
        showLoading(true);
        try {
            const data = await apiClient.delete(API_ENDPOINTS.MAIN_DICTIONARY.DELETE, { words: state.removeWords });
            log(data, "success");  // ✅ RAW backend response
            state.removeWords = [];
            renderChips(els.mainRemoveWordsChips, state.removeWords);
            reloadTable(true);
        } catch (err) {
            log(err.response?.data || err.message || err, "error");  // ✅ RAW backend error
        } finally {
            toggleBusy(false);
            showLoading(false);
        }
    });
}

// ================================
// TABLE MANAGEMENT - RAW DATA
// ================================
function initTable() {
    if (state.table) {
        state.table.destroy();
        state.table = null;
    }

    state.table = $("#mainWordsTable").DataTable({
        destroy: true,
        processing: true,
        serverSide: true,
        searching: false,
        pageLength: 25,
        lengthMenu: [10, 25, 50, 100],
        order: [[1, "asc"]],

        language: {
            processing: '<div class="spinner-border text-primary me-2" role="status"></div>🔄 Loading dictionary...',
            lengthMenu: "Show _MENU_ entries",
            info: "Showing _START_ to _END_ of _TOTAL_ words",
            infoEmpty: "No words found",
            infoFiltered: "(filtered from _MAX_ total words)",
            emptyTable: '<div class="text-center py-5"><i class="bi bi-book fs-1 text-muted mb-3"></i><div class="text-muted">No dictionary words found</div><small class="text-muted">Add your first verified words above</small></div>',
            zeroRecords: '<div class="text-center py-4"><i class="bi bi-search fs-1 text-muted mb-3"></i><div class="text-muted">No matching words found</div></div>',
            paginate: { first: "«", last: "»", next: "›", previous: "‹" }
        },

        ajax: function (data, callback) {
            const search = els.mainTableSearchInput?.value.trim() || '';
            const requestData = {
                draw: data.draw,
                start: data.start,
                length: data.length,
                search: search
            };

            apiClient.get(API_ENDPOINTS.MAIN_DICTIONARY.LIST, requestData)
                .then(json => {
                    const safeResponse = {
                        draw: json.draw || data.draw || 1,
                        recordsTotal: parseInt(json.recordsTotal) || 0,
                        recordsFiltered: parseInt(json.recordsFiltered) || 0,
                        data: normalizeTableData(json.data || [])
                    };
                    callback(safeResponse);
                })
                .catch(err => {
                    console.error('Table load error:', err);
                    log(`Table load failed: ${err.message}`, "error");
                    callback({ draw: data.draw, recordsTotal: 0, recordsFiltered: 0, data: [] });
                });
        },

        // ✅ RAW BACKEND DATA - NO FORMATTING
        columns: [
            {
                data: null, orderable: false, searchable: false, width: "50px", className: "text-center",
                render: (data, type, row) => {
                    const word = row?.word || '';
                    const checked = state.selectedWords.has(word) ? "checked" : "";
                    return `<input type="checkbox" class="form-check-input row-select" value="${escapeHtml(word)}" ${checked}>`;
                }
            },
            {
                data: "word",
                className: "fw-semibold",
                width: "35%",
                render: (data) => escapeHtml(data) || ''  // ✅ RAW word
            },
            {
                data: "frequency",
                className: "text-center text-nowrap",
                width: "15%",
                render: (data) => {
                    const freq = data || 0;  // ✅ RAW frequency
                    const badgeClass = freq > 100 ? 'bg-success' : freq > 10 ? 'bg-warning' : 'bg-secondary';
                    return `<span class="badge ${badgeClass} fs-6 px-3">${freq}</span>`;
                }
            },
            {
                data: "added_by",
                width: "20%",
                render: (data) => escapeHtml(data) || 'System'  // ✅ RAW added_by
            },
            {
                data: "added",
                width: "25%",
                render: (data) => escapeHtml(data) || 'N/A'  // ✅ RAW backend date/timestamp - NO FORMATTING
            },
            {
                data: null,
                orderable: false,
                width: "50px",
                className: "text-center",
                render: () => '<i class="bi bi-grip-vertical text-muted fs-5"></i>'
            }
        ],

        drawCallback: () => {
            updateStats();
            syncSelectAllCheckbox();
        }
    });

    // Row selection events
    $("#mainWordsTable tbody")
        .off("change.row-select click.row")
        .on("change.row-select", "input.row-select", function () {
            const word = this.value;
            if (this.checked) {
                state.selectedWords.add(word);
                $(this).closest("tr").addClass("table-active bg-success-subtle");
            } else {
                state.selectedWords.delete(word);
                $(this).closest("tr").removeClass("table-active bg-success-subtle");
            }
            syncSelectAllCheckbox();
        })
        .on("click.row", "tr", function (e) {
            if (e.target.type !== "checkbox" && !$(e.target).closest(".row-select").length) {
                $(this).find(".row-select").trigger("click");
            }
        });
}

function reloadTable(resetPaging = true) {
    state.table?.ajax.reload(null, resetPaging);
}

function syncSelectAllCheckbox() {
    const checkboxes = $("#mainWordsTable tbody input.row-select");
    if (!checkboxes.length) {
        els.mainSelectAll.checked = false;
        els.mainSelectAll.indeterminate = false;
        return;
    }

    const checkedCount = checkboxes.filter(':checked').length;
    els.mainSelectAll.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
    els.mainSelectAll.checked = checkedCount === checkboxes.length;
}

function updateStats() {
    if (state.table) {
        const info = state.table.page.info();
        els.totalWordsCount.textContent = info.recordsTotal?.toLocaleString() || "--";
    }
}

// ================================
// BULK ACTIONS
// ================================
function initBulkActions() {
    els.mainIncrementSelectedBtn?.addEventListener("click", async () => {
        const words = Array.from(state.selectedWords);
        if (!words.length) return log("No rows selected.", "warn");

        toggleBusy(true);
        showLoading(true);
        try {
            const promises = words.map(word => apiClient.post(API_ENDPOINTS.MAIN_DICTIONARY.INCREMENT(word)));
            await Promise.allSettled(promises);
            log(`Incremented ${words.length} words`, "success");
            reloadTable(false);
        } catch (err) {
            log(err.response?.data || err.message || err, "error");  // ✅ RAW backend error
        } finally {
            toggleBusy(false);
            showLoading(false);
        }
    });

    els.mainDeleteSelectedBtn?.addEventListener("click", async () => {
        const words = Array.from(state.selectedWords);
        if (!words.length) return log("No rows selected.", "warn");
        if (!confirm(`Delete ${words.length} selected words?`)) return;

        toggleBusy(true);
        showLoading(true);
        try {
            const data = await apiClient.delete(API_ENDPOINTS.MAIN_DICTIONARY.DELETE, { words });
            log(data, "success");  // ✅ RAW backend response
            state.selectedWords.clear();
            reloadTable(false);
        } catch (err) {
            log(err.response?.data || err.message || err, "error");  // ✅ RAW backend error
        } finally {
            toggleBusy(false);
            showLoading(false);
        }
    });

    els.mainSelectAll?.addEventListener("change", function () {
        const checked = this.checked;
        $("#mainWordsTable tbody input.row-select").each(function () {
            this.checked = checked;
            const word = this.value;
            if (checked) {
                state.selectedWords.add(word);
                $(this).closest("tr").addClass("table-active bg-success-subtle");
            } else {
                state.selectedWords.delete(word);
                $(this).closest("tr").removeClass("table-active bg-success-subtle");
            }
        });
        syncSelectAllCheckbox();
    });
}

// ================================
// SEARCH & REFRESH
// ================================
function initSearchRefresh() {
    els.refreshMainTableBtn?.addEventListener("click", () => {
        reloadTable(true);
        log("Table refreshed", "info");
    });

    els.mainTableSearchBtn?.addEventListener("click", () => reloadTable(true));
    els.mainTableSearchInput?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            reloadTable(true);
        }
    });
}

// ================================
// KEYBOARD SHORTCUTS
// ================================
function initKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
        if (state.busy || (e.target.tagName === 'INPUT' && e.target !== els.mainTableSearchInput)) return;

        if (e.ctrlKey && e.key === "F5") {
            e.preventDefault();
            reloadTable(true);
        } else if (e.key === "F2" && state.selectedWords.size > 0) {
            e.preventDefault();
            els.mainIncrementSelectedBtn?.click();
        } else if (e.key === "Delete" && state.selectedWords.size > 0) {
            e.preventDefault();
            els.mainDeleteSelectedBtn?.click();
        }
    });
}

// ================================
// GLOBAL CHIP REMOVAL
// ================================
window.mainDict = {
    removeChip(containerId, idx) {
        if (containerId === "mainAddWordsChips") {
            state.addWords.splice(idx, 1);
            renderChips(els.mainAddWordsChips, state.addWords);
        } else if (containerId === "mainRemoveWordsChips") {
            state.removeWords.splice(idx, 1);
            renderChips(els.mainRemoveWordsChips, state.removeWords);
        }
    }
};

// ================================
// INITIALIZATION
// ================================
$(document).ready(() => {
    initAddSection();
    initRemoveSection();
    initTable();
    initBulkActions();
    initSearchRefresh();
    initKeyboardShortcuts();

    updateStats();
    log("🚀 Main Dictionary Dashboard loaded successfully", "success");
});
