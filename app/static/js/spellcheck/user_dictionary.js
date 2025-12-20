// static/js/user_dictionary.js

import apiClient from "../apiClient.js";
import API_ENDPOINTS, { BASE_URL } from "../apiEndpoints.js";

// -----------------------------
// State & element cache
// -----------------------------
const state = {
    addWords: [],
    removeWords: [],
    busy: false,
    table: null,
    selectedWords: new Set(),
};

const els = {
    addWordsInput: document.getElementById("addWordsInput"),
    addWordBtn: document.getElementById("addWordBtn"),
    addWordsChips: document.getElementById("addWordsChips"),
    addSubmitBtn: document.getElementById("addSubmitBtn"),
    addClearBtn: document.getElementById("addClearBtn"),

    removeWordsInput: document.getElementById("removeWordsInput"),
    removeWordBtn: document.getElementById("removeWordBtn"),
    removeWordsChips: document.getElementById("removeWordsChips"),
    removeSubmitBtn: document.getElementById("removeSubmitBtn"),
    removeClearBtn: document.getElementById("removeClearBtn"),

    fileInput: document.getElementById("fileInput"),
    addedByInput: document.getElementById("addedByInput"),
    uploadBtn: document.getElementById("uploadBtn"),
    uploadResultCounts: document.getElementById("uploadResultCounts"),

    refreshTableBtn: document.getElementById("refreshTableBtn"),
    approveSelectedBtn: document.getElementById("approveSelectedBtn"),
    deleteSelectedBtn: document.getElementById("deleteSelectedBtn"),

    tableSearchInput: document.getElementById("tableSearchInput"),
    tableSearchBtn: document.getElementById("tableSearchBtn"),
    selectAllRows: document.getElementById("selectAllRows"),
};

// -----------------------------
// Helpers
// -----------------------------
function renderChips(container, items, onRemove) {
    container.innerHTML = "";
    items.forEach((word, idx) => {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = word;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.innerHTML = "&times;";
        btn.addEventListener("click", () => onRemove(idx));

        chip.appendChild(btn);
        container.appendChild(chip);
    });
}

function parseWordsInput(value) {
    if (!value) return [];
    return value
        .split(/[,\s]+/)
        .map((w) => w.trim())
        .filter(Boolean);
}

function toggleBusy(disabled) {
    state.busy = disabled;
    [
        els.addWordBtn,
        els.addSubmitBtn,
        els.addClearBtn,
        els.removeWordBtn,
        els.removeSubmitBtn,
        els.removeClearBtn,
        els.uploadBtn,
        els.refreshTableBtn,
        els.approveSelectedBtn,
        els.deleteSelectedBtn,
        els.tableSearchBtn,
    ].forEach((btn) => {
        if (btn) btn.disabled = disabled;
    });
}

// -----------------------------
// Modals (status + confirm)
// -----------------------------
let statusModalInstance = null;
let confirmModalInstance = null;

function setupModals() {
    const statusModalEl = document.getElementById("statusModal");
    const confirmModalEl = document.getElementById("confirmModal");

    if (statusModalEl) {
        statusModalInstance = new bootstrap.Modal(statusModalEl);
    }
    if (confirmModalEl) {
        confirmModalInstance = new bootstrap.Modal(confirmModalEl);
    }
}

function showStatusModal({ type = "info", title, message, details = [] }) {
    const iconEl = document.getElementById("statusModalIcon");
    const titleEl = document.getElementById("statusModalTitle");
    const msgEl = document.getElementById("statusModalMessage");
    const detailsEl = document.getElementById("statusModalDetails");

    let icon = "ℹ️";
    let defaultTitle = "Information";

    if (type === "success") {
        icon = "✅";
        defaultTitle = "Success";
    } else if (type === "error") {
        icon = "❌";
        defaultTitle = "Error";
    } else if (type === "warn") {
        icon = "⚠️";
        defaultTitle = "Warning";
    }

    iconEl.textContent = icon;
    titleEl.textContent = title || defaultTitle;
    msgEl.textContent = message || "";

    detailsEl.innerHTML = "";
    details.forEach((d) => {
        const li = document.createElement("li");
        li.textContent = d;
        detailsEl.appendChild(li);
    });

    statusModalInstance && statusModalInstance.show();
}

function showConfirmModal({
    title,
    message,
    okLabel = "Yes, proceed",
    okClass = "btn-danger btn-sm",
    onConfirm,
}) {
    const titleEl = document.getElementById("confirmModalTitle");
    const msgEl = document.getElementById("confirmModalMessage");
    const okBtn = document.getElementById("confirmModalOkBtn");

    titleEl.textContent = title || "Confirm";
    msgEl.textContent = message || "Are you sure?";
    okBtn.textContent = okLabel;
    okBtn.className = "btn " + okClass;

    const handler = () => {
        okBtn.removeEventListener("click", handler);
        confirmModalInstance.hide();
        if (typeof onConfirm === "function") onConfirm();
    };

    okBtn.replaceWith(okBtn.cloneNode(true));
    const newOkBtn = document.getElementById("confirmModalOkBtn");
    newOkBtn.textContent = okLabel;
    newOkBtn.className = "btn " + okClass;
    newOkBtn.addEventListener("click", handler);

    confirmModalInstance && confirmModalInstance.show();
}

// -----------------------------
// Add section
// -----------------------------
function handleAddWords() {
    const words = parseWordsInput(els.addWordsInput.value);
    if (!words.length) return;

    words.forEach((w) => {
        if (!state.addWords.includes(w)) state.addWords.push(w);
    });

    els.addWordsInput.value = "";

    const onRemove = (idx) => {
        state.addWords.splice(idx, 1);
        renderChips(els.addWordsChips, state.addWords, onRemove);
    };
    renderChips(els.addWordsChips, state.addWords, onRemove);
}

function initAddSection() {
    els.addWordBtn.addEventListener("click", handleAddWords);
    els.addWordsInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleAddWords();
        }
    });

    els.addClearBtn.addEventListener("click", () => {
        state.addWords = [];
        renderChips(els.addWordsChips, state.addWords, () => { });
    });

    els.addSubmitBtn.addEventListener("click", async () => {
        if (!state.addWords.length) {
            showStatusModal({
                type: "warn",
                title: "No words",
                message: "There are no words in the add queue.",
            });
            return;
        }

        toggleBusy(true);
        try {
            const data = await apiClient.post(
                API_ENDPOINTS.USER_DICTIONARY.ADD,
                { words: state.addWords }
            );

            const added = Object.keys(data.added || {});
            const updated = Object.keys(data.updated || {});
            const skipped = data.skipped || [];

            let msg = `Added: ${added.length} word(s).`;
            if (updated.length) msg += ` Updated: ${updated.length}.`;
            if (skipped.length) msg += ` Skipped: ${skipped.length}.`;

            const details = [];
            if (updated.length) {
                const freqDetails = updated
                    .map((w) => `${w} (${data.updated[w]})`)
                    .slice(0, 5);
                details.push(`Updated frequencies: ${freqDetails.join(", ")}`);
            }

            showStatusModal({
                type: "success",
                title: "Words added",
                message: msg,
                details,
            });

            state.addWords = [];
            renderChips(els.addWordsChips, state.addWords, () => { });
            reloadTable();
        } catch (err) {
            showStatusModal({
                type: "error",
                title: "Add failed",
                message: err.message || String(err),
            });
        } finally {
            toggleBusy(false);
        }
    });
}

// -----------------------------
// Delete section (by input)
// -----------------------------
function handleRemoveWords() {
    const words = parseWordsInput(els.removeWordsInput.value);
    if (!words.length) return;

    words.forEach((w) => {
        if (!state.removeWords.includes(w)) state.removeWords.push(w);
    });

    els.removeWordsInput.value = "";

    const onRemove = (idx) => {
        state.removeWords.splice(idx, 1);
        renderChips(els.removeWordsChips, state.removeWords, onRemove);
    };
    renderChips(els.removeWordsChips, state.removeWords, onRemove);
}

function initDeleteSection() {
    els.removeWordBtn.addEventListener("click", handleRemoveWords);
    els.removeWordsInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleRemoveWords();
        }
    });

    els.removeClearBtn.addEventListener("click", () => {
        state.removeWords = [];
        renderChips(els.removeWordsChips, state.removeWords, () => { });
    });

    els.removeSubmitBtn.addEventListener("click", async () => {
        if (!state.removeWords.length) {
            showStatusModal({
                type: "warn",
                title: "Nothing to delete",
                message: "No words queued to delete.",
            });
            return;
        }

        toggleBusy(true);
        try {
            const data = await apiClient.delete(
                API_ENDPOINTS.USER_DICTIONARY.DELETE,
                { words: state.removeWords }
            );
            const deleted = data.deleted || [];
            const notFound = data.not_found || [];

            showStatusModal({
                type: "success",
                title: "Words removed",
                message: `Deleted: ${deleted.length}, not found: ${notFound.length}.`,
                details: notFound.length
                    ? ["Some words were not found in the user dictionary."]
                    : [],
            });

            state.removeWords = [];
            renderChips(els.removeWordsChips, state.removeWords, () => { });
            reloadTable();
        } catch (err) {
            showStatusModal({
                type: "error",
                title: "Delete failed",
                message: err.message || String(err),
            });
        } finally {
            toggleBusy(false);
        }
    });
}

// -----------------------------
// Upload section
// -----------------------------
function initUploadSection() {
    els.uploadBtn.addEventListener("click", async () => {
        const file = els.fileInput.files[0];
        if (!file) {
            showStatusModal({
                type: "warn",
                title: "File required",
                message: "Please select a .txt or .docx file.",
            });
            return;
        }

        const ext = file.name.toLowerCase().split(".").pop();
        if (!["txt", "docx"].includes(ext)) {
            showStatusModal({
                type: "error",
                title: "Invalid file type",
                message: "Only .txt and .docx files are allowed.",
            });
            return;
        }

        toggleBusy(true);

        const formData = new FormData();
        formData.append("file", file);
        const addedBy = els.addedByInput.value.trim();
        if (addedBy) formData.append("added_by", addedBy);

        try {
            const data = await apiClient.post(
                `${BASE_URL}/api/v1/dictionary/user/upload-file`,
                formData
            );

            const {
                file: fileName,
                total_tokens = 0,
                unique_words = 0,
                inserted = [],
                updated = [],
                skipped = [],
                errors = [],
            } = data;

            showStatusModal({
                type: "success",
                title: "Upload complete",
                message: `Processed "${fileName || file.name}".`,
                details: [
                    `${total_tokens} tokens`,
                    `${unique_words} unique words`,
                    `${inserted.length} inserted`,
                    `${updated.length} updated`,
                    `${skipped.length} skipped`,
                    `${errors.length} errors`,
                ],
            });

            const container = els.uploadResultCounts;
            container.classList.remove("d-none");
            container.innerHTML = "";

            const mkBadge = (label, value, klass) => {
                const span = document.createElement("span");
                span.className = `badge bg-${klass} me-1`;
                span.textContent = `${label}: ${value}`;
                return span;
            };

            container.appendChild(mkBadge("Tokens", total_tokens, "secondary"));
            container.appendChild(mkBadge("Unique", unique_words, "secondary"));
            container.appendChild(mkBadge("Inserted", inserted.length, "success"));
            container.appendChild(mkBadge("Updated", updated.length, "warning"));
            container.appendChild(mkBadge("Skipped", skipped.length, "info"));
            container.appendChild(mkBadge("Errors", errors.length, "danger"));

            reloadTable();
        } catch (err) {
            showStatusModal({
                type: "error",
                title: "Upload failed",
                message: err.message || String(err),
            });
        } finally {
            toggleBusy(false);
        }
    });
}

// -----------------------------
// DataTables + selection
// -----------------------------
function initTable() {
    state.table = $("#userWordsTable").DataTable({
        serverSide: true,
        processing: true,
        searching: false,
        ordering: false,
        ajax: function (data, callback) {
            const offset = data.start || 0;
            const limit = data.length || 10;
            const search = els.tableSearchInput.value.trim();

            const params = { limit, offset };
            if (search) params.search = search;

            apiClient
                .get(API_ENDPOINTS.USER_DICTIONARY.LIST_PENDING, params)
                .then((json) => {
                    callback({
                        data: json.data || [],
                        recordsTotal: json.recordsTotal || 0,
                        recordsFiltered: json.recordsFiltered || json.recordsTotal || 0,
                    });
                })
                .catch((err) => {
                    showStatusModal({
                        type: "error",
                        title: "Table load failed",
                        message: err.message || String(err),
                    });
                    callback({
                        data: [],
                        recordsTotal: 0,
                        recordsFiltered: 0,
                    });
                });
        },
        columns: [
            {
                data: "word",
                orderable: false,
                searchable: false,
                render: function (data) {
                    const checked = state.selectedWords.has(data) ? "checked" : "";
                    return `<input type="checkbox" class="form-check-input row-select" value="${data}" ${checked}>`;
                },
            },
            { data: "word" },
            { data: "added_by", defaultContent: "" },
            { data: "frequency" },
            {
                data: "created_at",
                render: function (data) {
                    if (!data) return "";
                    const d = new Date(data);
                    if (isNaN(d)) return data;
                    return d.toLocaleString();
                },
            },
        ],
        pageLength: 10,
        lengthMenu: [10, 20, 50],
    });

    // Row checkbox click
    $("#userWordsTable tbody").on("change", "input.row-select", function () {
        const word = this.value;
        if (this.checked) {
            state.selectedWords.add(word);
        } else {
            state.selectedWords.delete(word);
        }
        syncSelectAllCheckbox();
    });

    // Select all (current page)
    els.selectAllRows.addEventListener("change", function () {
        const checked = this.checked;
        $("#userWordsTable tbody input.row-select").each(function () {
            this.checked = checked;
            const word = this.value;
            if (checked) {
                state.selectedWords.add(word);
            } else {
                state.selectedWords.delete(word);
            }
        });
        syncSelectAllCheckbox();
    });

    // Search controls
    els.tableSearchBtn.addEventListener("click", () => {
        reloadTable(true);
    });

    els.tableSearchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            reloadTable(true);
        }
    });
}

function syncSelectAllCheckbox() {
    const checkboxes = $("#userWordsTable tbody input.row-select");
    if (!checkboxes.length) {
        els.selectAllRows.checked = false;
        els.selectAllRows.indeterminate = false;
        return;
    }

    let checkedCount = 0;
    checkboxes.each(function () {
        if (this.checked) checkedCount++;
    });

    if (checkedCount === 0) {
        els.selectAllRows.checked = false;
        els.selectAllRows.indeterminate = false;
    } else if (checkedCount === checkboxes.length) {
        els.selectAllRows.checked = true;
        els.selectAllRows.indeterminate = false;
    } else {
        els.selectAllRows.checked = false;
        els.selectAllRows.indeterminate = true;
    }
}

function reloadTable(resetPaging = false) {
    if (state.table) {
        state.table.ajax.reload(() => {
            syncSelectAllCheckbox();
        }, resetPaging);
    }
}

// -----------------------------
// Approve selected
// -----------------------------
function initApproveSelected() {
    els.approveSelectedBtn.addEventListener("click", async () => {
        const words = Array.from(state.selectedWords);
        if (!words.length) {
            showStatusModal({
                type: "warn",
                title: "No selection",
                message: "Select at least one row to approve.",
            });
            return;
        }

        toggleBusy(true);
        try {
            const res = await apiClient.post(
                API_ENDPOINTS.USER_DICTIONARY.APPROVE,
                { words }
            );
            const moved = res.moved || [];
            const already = res.already_exists || [];
            const notFound = res.not_found || [];
            const failed = res.failed || [];

            showStatusModal({
                type: "success",
                title: "Approval complete",
                message: `Moved: ${moved.length}, already exists: ${already.length}, not found: ${notFound.length}, failed: ${failed.length}.`,
            });

            moved.forEach((w) => state.selectedWords.delete(w));
            reloadTable(false);
        } catch (err) {
            showStatusModal({
                type: "error",
                title: "Approve failed",
                message: err.message || String(err),
            });
        } finally {
            toggleBusy(false);
        }
    });
}

// -----------------------------
// Delete selected (from table)
// -----------------------------
function initDeleteSelected() {
    els.deleteSelectedBtn.addEventListener("click", () => {
        const words = Array.from(state.selectedWords);
        if (!words.length) {
            showStatusModal({
                type: "warn",
                title: "No selection",
                message: "Select at least one row to delete.",
            });
            return;
        }

        showConfirmModal({
            title: "Delete selected words",
            message: `Delete ${words.length} word(s) from user dictionary?`,
            okLabel: "Yes, delete",
            okClass: "btn-danger btn-sm",
            onConfirm: async () => {
                toggleBusy(true);
                try {
                    const data = await apiClient.delete(
                        API_ENDPOINTS.USER_DICTIONARY.DELETE,
                        { words }
                    );
                    const deleted = data.deleted || [];
                    const notFound = data.not_found || [];

                    showStatusModal({
                        type: "success",
                        title: "Delete complete",
                        message: `Deleted: ${deleted.length}, not found: ${notFound.length}.`,
                    });

                    deleted.forEach((w) => state.selectedWords.delete(w));
                    reloadTable(false);
                } catch (err) {
                    showStatusModal({
                        type: "error",
                        title: "Delete failed",
                        message: err.message || String(err),
                    });
                } finally {
                    toggleBusy(false);
                }
            },
        });
    });
}

// -----------------------------
// Init
// -----------------------------
$(document).ready(function () {
    setupModals();

    initAddSection();
    initDeleteSection();
    initUploadSection();
    initTable();
    initApproveSelected();
    initDeleteSelected();

    els.refreshTableBtn.addEventListener("click", () => reloadTable(false));

    showStatusModal({
        type: "info",
        title: "Dashboard ready",
        message: `User dictionary admin dashboard loaded. API base: ${BASE_URL}`,
    });
});
