// static/js/main_dictionary.js
import apiClient from "../apiClient.js";
import API_ENDPOINTS from "../apiEndpoints.js";

const state = {
    addWords: [],
    removeWords: [],
    selectedWords: new Set(),
    table: null,
    busy: false,
};

const els = {
    addInput: "#addInput",
    addQueueBtn: "#addQueueBtn",
    addChips: "#addChips",
    addCount: "#addCount",
    addSubmitBtn: "#addSubmitBtn",
    addClearBtn: "#addClearBtn",

    removeInput: "#removeInput",
    removeQueueBtn: "#removeQueueBtn",
    removeChips: "#removeChips",
    removeCount: "#removeCount",
    removeSubmitBtn: "#removeSubmitBtn",
    removeClearBtn: "#removeClearBtn",

    searchInput: "#searchInput",
    searchBtn: "#searchBtn",
    refreshBtn: "#refreshBtn",

    bulkDeleteBtn: "#bulkDeleteBtn",
    selectAll: "#selectAll",
    totalWords: "#totalWords",

    logArea: "#logArea",
    loading: "#loadingOverlay",
    selectedCountBadge: "#selectedCountBadge",

    confirmTitle: "#confirmTitle",
    confirmMessage: "#confirmMessage",
    confirmPreview: "#confirmPreview",
    confirmModal: "#confirmModal",
    confirmBtn: "#confirmBtn",
};

const getEl = (selector) => document.querySelector(selector);
const getVal = (selector) => getEl(selector)?.value ?? "";

// -----------------------------
// Logging
// -----------------------------
const log = (message, type = "info") => {
    const logEl = getEl(els.logArea);
    if (!logEl) return;

    const icons = {
        info: "ℹ️",
        success: "✅",
        warning: "⚠️",
        error: "❌",
    };

    const safeType = icons[type] ? type : "info";
    const icon = icons[safeType];

    const line = document.createElement("div");
    line.className = `mb-2 p-2 rounded border-start border-${safeType} ps-3 small`;
    line.innerHTML = `
    <span class="badge bg-${safeType} me-2">${icon}</span>
    ${message}
    <div class="text-muted mt-1" style="font-size: 0.75rem;">
      ${new Date().toLocaleTimeString()}
    </div>
  `;

    logEl.prepend(line);
    logEl.scrollTop = 0;
    if (logEl.children.length > 30) {
        logEl.removeChild(logEl.lastChild);
    }
};

// -----------------------------
// Helpers
// -----------------------------
const escapeHtml = (text) =>
    text?.replace(/[&<>"']/g, (m) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
    })[m]) || "";

const toggleBusy = (busy) => {
    state.busy = busy;
    document
        .querySelectorAll("button:not([data-bs-dismiss])")
        .forEach((btn) => (btn.disabled = busy));
    const overlay = getEl(els.loading);
    if (overlay) overlay.classList.toggle("d-none", !busy);
};

const showConfirmModal = (title, message, words, callback) => {
    const titleEl = getEl(els.confirmTitle);
    const messageEl = getEl(els.confirmMessage);
    const previewEl = getEl(els.confirmPreview);
    const modalEl = getEl(els.confirmModal);
    const confirmBtn = getEl(els.confirmBtn);

    if (!modalEl || !confirmBtn) return;

    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;

    if (previewEl) {
        if (words.length) {
            previewEl.innerHTML =
                words
                    .slice(0, 8)
                    .map(
                        (w) =>
                            `<span class="badge bg-warning me-1 mb-1">${escapeHtml(
                                w
                            )}</span>`
                    )
                    .join("") +
                (words.length > 8
                    ? `<div class="text-muted small mt-1">+${words.length - 8} more</div>`
                    : "");
            previewEl.classList.remove("d-none");
        } else {
            previewEl.classList.add("d-none");
        }
    }

    const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    bsModal.show();

    // Remove previous handler, add new one
    confirmBtn.onclick = async () => {
        bsModal.hide();
        toggleBusy(true);
        try {
            await callback();
        } catch (error) {
            log(
                error?.response?.data?.message ||
                error.message ||
                "Operation failed",
                "error"
            );
        } finally {
            toggleBusy(false);
        }
    };
};

// -----------------------------
// UI updates
// -----------------------------
const updateQueuesUI = () => {
    // Add queue
    const addCountEl = getEl(els.addCount);
    const addSubmitBtn = getEl(els.addSubmitBtn);
    const addClearBtn = getEl(els.addClearBtn);
    const addChipsEl = getEl(els.addChips);

    if (addCountEl) addCountEl.textContent = state.addWords.length;
    if (addSubmitBtn) addSubmitBtn.disabled = state.addWords.length === 0;
    if (addClearBtn) addClearBtn.disabled = state.addWords.length === 0;

    if (addChipsEl) {
        if (state.addWords.length) {
            addChipsEl.innerHTML = state.addWords
                .map(
                    (word, i) => `
          <span class="badge bg-success me-1 mb-1">
            ${escapeHtml(word)}
            <i class="bi bi-x ms-1 text-white" 
               data-add-remove-index="${i}"
               style="cursor:pointer;font-size:0.75rem;" 
               title="Remove"></i>
          </span>
        `
                )
                .join("");
        } else {
            addChipsEl.innerHTML =
                '<div class="text-muted small w-100 text-center">No words queued</div>';
        }
    }

    // Remove queue
    const removeCountEl = getEl(els.removeCount);
    const removeSubmitBtn = getEl(els.removeSubmitBtn);
    const removeClearBtn = getEl(els.removeClearBtn);
    const removeChipsEl = getEl(els.removeChips);

    if (removeCountEl) removeCountEl.textContent = state.removeWords.length;
    if (removeSubmitBtn) removeSubmitBtn.disabled = state.removeWords.length === 0;
    if (removeClearBtn) removeClearBtn.disabled = state.removeWords.length === 0;

    if (removeChipsEl) {
        if (state.removeWords.length) {
            removeChipsEl.innerHTML = state.removeWords
                .map(
                    (word, i) => `
          <span class="badge bg-danger me-1 mb-1">
            ${escapeHtml(word)}
            <i class="bi bi-x ms-1 text-white" 
               data-remove-remove-index="${i}"
               style="cursor:pointer;font-size:0.75rem;" 
               title="Remove"></i>
          </span>
        `
                )
                .join("");
        } else {
            removeChipsEl.innerHTML =
                '<div class="text-muted small w-100 text-center">No words queued</div>';
        }
    }
};

const updateSelectionUI = () => {
    const selectedBadge = getEl(els.selectedCountBadge);
    const bulkDeleteBtn = getEl(els.bulkDeleteBtn);

    const count = state.selectedWords.size;
    if (bulkDeleteBtn) bulkDeleteBtn.disabled = count === 0;

    if (selectedBadge) {
        if (count > 0) {
            selectedBadge.textContent = `${count} selected`;
            selectedBadge.className = "badge bg-primary fs-6";
            selectedBadge.style.display = "inline-block";
        } else {
            selectedBadge.style.display = "none";
        }
    }
};

const updateStats = () => {
    const info = state.table?.page?.info?.();
    if (info) {
        const totalEl = getEl(els.totalWords);
        if (totalEl) totalEl.textContent = info.recordsTotal.toLocaleString();
    }
    updateQueuesUI();
    updateSelectionUI();
};

// -----------------------------
// Queue helpers
// -----------------------------
const queueWord = (queue, word) => {
    const trimmed = word.trim();
    if (!trimmed) return { ok: false, reason: "empty" };
    if (queue.includes(trimmed)) return { ok: false, reason: "duplicate" };
    queue.push(trimmed);
    return { ok: true, word: trimmed };
};

// -----------------------------
// Panels init
// -----------------------------
const initPanels = () => {
    const addInputEl = getEl(els.addInput);
    const addQueueBtn = getEl(els.addQueueBtn);
    const addSubmitBtn = getEl(els.addSubmitBtn);
    const addClearBtn = getEl(els.addClearBtn);

    const removeInputEl = getEl(els.removeInput);
    const removeQueueBtn = getEl(els.removeQueueBtn);
    const removeSubmitBtn = getEl(els.removeSubmitBtn);
    const removeClearBtn = getEl(els.removeClearBtn);

    // Add queue workflow
    if (addQueueBtn && addInputEl) {
        addQueueBtn.onclick = () => {
            const result = queueWord(state.addWords, addInputEl.value);
            if (!result.ok) {
                if (result.reason === "empty") {
                    log("Please enter a word", "warning");
                } else if (result.reason === "duplicate") {
                    log(`"${addInputEl.value.trim()}" already in queue`, "warning");
                }
                return;
            }
            addInputEl.value = "";
            updateQueuesUI();
            log(
                `✅ Added "${result.word}" to queue (${state.addWords.length} total)`,
                "success"
            );
        };

        addInputEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                addQueueBtn.click();
            }
        });
    }

    if (addSubmitBtn) {
        addSubmitBtn.onclick = () => {
            if (!state.addWords.length) return;

            showConfirmModal(
                "Add Words to Dictionary",
                `Add ${state.addWords.length} word${state.addWords.length > 1 ? "s" : ""
                } to dictionary?`,
                state.addWords,
                async () => {
                    const res = await apiClient.post(
                        API_ENDPOINTS.MAIN_DICTIONARY.ADD,
                        { words: state.addWords }
                    );
                    const createdCount = res?.created?.length || 0;
                    log(`✅ Added ${createdCount} words successfully`, "success");
                    state.addWords = [];
                    updateQueuesUI();
                    reloadTable();
                }
            );
        };
    }

    if (addClearBtn) {
        addClearBtn.onclick = () => {
            state.addWords = [];
            updateQueuesUI();
            log("Add queue cleared", "info");
        };
    }

    // Remove queue workflow
    if (removeQueueBtn && removeInputEl) {
        removeQueueBtn.onclick = () => {
            const result = queueWord(state.removeWords, removeInputEl.value);
            if (!result.ok) {
                if (result.reason === "empty") {
                    log("Please enter a word", "warning");
                } else if (result.reason === "duplicate") {
                    log(`"${removeInputEl.value.trim()}" already in queue`, "warning");
                }
                return;
            }
            removeInputEl.value = "";
            updateQueuesUI();
            log(
                `✅ Added "${result.word}" to remove queue (${state.removeWords.length} total)`,
                "warning"
            );
        };

        removeInputEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                removeQueueBtn.click();
            }
        });
    }

    if (removeSubmitBtn) {
        removeSubmitBtn.onclick = () => {
            if (!state.removeWords.length) return;

            showConfirmModal(
                "Delete Words from Dictionary",
                `Delete ${state.removeWords.length} word${state.removeWords.length > 1 ? "s" : ""
                } permanently?`,
                state.removeWords,
                async () => {
                    const res = await apiClient.delete(
                        API_ENDPOINTS.MAIN_DICTIONARY.DELETE,
                        { words: state.removeWords }
                    );
                    const deletedCount = res?.deleted?.length || 0;
                    log(`✅ Deleted ${deletedCount} words successfully`, "success");
                    state.removeWords = [];
                    updateQueuesUI();
                    reloadTable();
                }
            );
        };
    }

    if (removeClearBtn) {
        removeClearBtn.onclick = () => {
            state.removeWords = [];
            updateQueuesUI();
            log("Remove queue cleared", "info");
        };
    }

    // Chip remove events (delegated)
    const addChipsEl = getEl(els.addChips);
    if (addChipsEl) {
        addChipsEl.addEventListener("click", (e) => {
            const icon = e.target.closest("[data-add-remove-index]");
            if (!icon) return;
            const index = Number(icon.getAttribute("data-add-remove-index"));
            if (!Number.isInteger(index)) return;
            const word = state.addWords.splice(index, 1)[0];
            updateQueuesUI();
            log(`Removed "${word}" from add queue`, "info");
        });
    }

    const removeChipsEl = getEl(els.removeChips);
    if (removeChipsEl) {
        removeChipsEl.addEventListener("click", (e) => {
            const icon = e.target.closest("[data-remove-remove-index]");
            if (!icon) return;
            const index = Number(icon.getAttribute("data-remove-remove-index"));
            if (!Number.isInteger(index)) return;
            const word = state.removeWords.splice(index, 1)[0];
            updateQueuesUI();
            log(`Removed "${word}" from remove queue`, "info");
        });
    }
};

// -----------------------------
// DataTables
// -----------------------------
const initTable = () => {
    if (state.table) {
        state.table.destroy();
    }

    state.table = $("#wordsTable").DataTable({
        destroy: true,
        processing: true,
        serverSide: true,
        pageLength: 25,
        searching: false,
        order: [[2, "asc"]],
        language: {
            processing: '<i class="bi bi-hourglass-split"></i> Loading...',
            emptyTable:
                '<div class="text-center p-4"><i class="bi bi-inbox fs-1 text-muted mb-3"></i><p class="text-muted">No words found</p></div>',
        },
        ajax: (data, callback) => {
            apiClient
                .get(API_ENDPOINTS.MAIN_DICTIONARY.LIST, {
                    draw: data.draw,
                    start: data.start,
                    length: data.length,
                    search: getVal(els.searchInput),
                })
                .then((res) => {
                    const tableData = (res.data || [])
                        .map((row, index) => ({
                            word: row.word || "",
                            frequency: row.frequency || 0,
                            added_by: row.added_by || "System",
                            added: row.added || row.added_at || "N/A",
                            serial: data.start + index + 1,
                        }))
                        .filter((row) => row.word);

                    callback({
                        draw: res.draw || data.draw,
                        recordsTotal: res.recordsTotal || 0,
                        recordsFiltered: res.recordsFiltered || 0,
                        data: tableData,
                    });
                })
                .catch((err) => {
                    log(
                        "Table load failed: " + (err.message || "Unknown error"),
                        "error"
                    );
                    callback({
                        draw: data.draw,
                        recordsTotal: 0,
                        recordsFiltered: 0,
                        data: [],
                    });
                });
        },
        columns: [
            {
                orderable: false,
                width: "40px",
                render: (data, type, row) =>
                    `<input type="checkbox" class="form-check-input row-select" value="${escapeHtml(
                        row.word
                    )}">`,
            },
            {
                orderable: false,
                width: "60px",
                className: "text-center",
                render: (data, type, row) => (type === "display" ? row.serial : ""),
            },
            { data: "word", className: "fw-medium" },
            {
                data: "frequency",
                className: "text-center",
                render: (freq) => {
                    const f = Number(freq) || 0;
                    const cls =
                        f > 50 ? "bg-success" : f > 10 ? "bg-warning" : "bg-secondary";
                    return `<span class="badge ${cls}">${f}</span>`;
                },
            },
            { data: "added_by" },
            { data: "added" },
        ],
        drawCallback: () => {
            bindRowEvents();
            updateStats();
        },
    });
};

const reloadTable = () => {
    if (state.table) {
        state.table.ajax.reload(null, false);
    }
};

const bindRowEvents = () => {
    const $tbody = $("#wordsTable tbody");

    $tbody.off("change.row-select click.row");

    $tbody
        .on("change.row-select", ".row-select", function () {
            const word = this.value;
            if (this.checked) {
                state.selectedWords.add(word);
                $(this).closest("tr").addClass("table-active");
            } else {
                state.selectedWords.delete(word);
                $(this).closest("tr").removeClass("table-active");
            }
            updateSelectionUI();
        })
        .on("click.row", "tr", function (e) {
            if (!$(e.target).is('input[type="checkbox"]')) {
                $(this).find(".row-select").trigger("click");
            }
        });
};

// -----------------------------
// Actions (search / bulk)
// -----------------------------
const initActions = () => {
    const refreshBtn = getEl(els.refreshBtn);
    if (refreshBtn) {
        refreshBtn.onclick = () => {
            reloadTable();
            log("Table refreshed", "info");
        };
    }

    const searchInputEl = getEl(els.searchInput);
    const searchBtn = getEl(els.searchBtn);

    if (searchInputEl) {
        searchInputEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                reloadTable();
            }
        });
    }

    if (searchBtn) {
        searchBtn.onclick = reloadTable;
    }

    const bulkDeleteBtn = getEl(els.bulkDeleteBtn);
    if (bulkDeleteBtn) {
        bulkDeleteBtn.onclick = () => {
            const words = Array.from(state.selectedWords);
            if (!words.length) return log("No words selected", "warning");

            showConfirmModal(
                "Delete Selected Words",
                `Delete ${words.length} selected word${words.length > 1 ? "s" : ""
                } permanently?`,
                words,
                async () => {
                    await apiClient.delete(API_ENDPOINTS.MAIN_DICTIONARY.DELETE, {
                        words,
                    });
                    log(`✅ Deleted ${words.length} selected words`, "success");
                    state.selectedWords.clear();
                    reloadTable();
                }
            );
        };
    }

    const selectAllEl = getEl(els.selectAll);
    if (selectAllEl) {
        selectAllEl.onchange = function () {
            const isChecked = this.checked;
            state.selectedWords.clear();
            $("#wordsTable tbody .row-select")
                .prop("checked", isChecked)
                .trigger("change");
            log(
                isChecked ? "All visible rows selected" : "Selection cleared",
                "info"
            );
        };
    }
};

// -----------------------------
// Init
// -----------------------------
$(document).ready(() => {
    updateQueuesUI();
    updateSelectionUI();
    initPanels();
    initTable();
    initActions();
    log("✅ Main Dictionary Dashboard Ready", "success");
});
