const API_BASE = '/api/v1/dictionary/user';

const state = {
    addWords: [],
    removeWords: [],
    busy: false,
    table: null,
    selectedWords: new Set(),
};

const els = {
    addWordsInput: document.getElementById('addWordsInput'),
    addWordBtn: document.getElementById('addWordBtn'),
    addWordsChips: document.getElementById('addWordsChips'),
    addSubmitBtn: document.getElementById('addSubmitBtn'),
    addClearBtn: document.getElementById('addClearBtn'),

    removeWordsInput: document.getElementById('removeWordsInput'),
    removeWordBtn: document.getElementById('removeWordBtn'),
    removeWordsChips: document.getElementById('removeWordsChips'),
    removeSubmitBtn: document.getElementById('removeSubmitBtn'),
    removeClearBtn: document.getElementById('removeClearBtn'),

    fileInput: document.getElementById('fileInput'),
    addedByInput: document.getElementById('addedByInput'),
    uploadBtn: document.getElementById('uploadBtn'),
    uploadResultCounts: document.getElementById('uploadResultCounts'),

    logArea: document.getElementById('logArea'),
    refreshTableBtn: document.getElementById('refreshTableBtn'),
    approveSelectedBtn: document.getElementById('approveSelectedBtn'),
    tableSearchInput: document.getElementById('tableSearchInput'),
    selectAllRows: document.getElementById('selectAllRows'),
    tableSearchBtn: document.getElementById('tableSearchBtn'),
    deleteSelectedBtn: document.getElementById('deleteSelectedBtn'),
};

// ---------- Helpers ----------
function log(message, type = 'info') {
    const line = document.createElement('div');
    line.className = 'mb-1';
    const badge = document.createElement('span');
    badge.className = 'badge me-1 bg-secondary';
    if (type === 'ok') badge.className = 'badge me-1 bg-success';
    if (type === 'err') badge.className = 'badge me-1 bg-danger';
    if (type === 'warn') badge.className = 'badge me-1 bg-warning text-dark';
    badge.textContent = type.toUpperCase();
    const text = document.createElement('span');
    text.textContent = ' ' + message;
    line.appendChild(badge);
    line.appendChild(text);
    els.logArea.prepend(line);
}

function renderChips(container, items, onRemove) {
    container.innerHTML = '';
    items.forEach((word, idx) => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = word;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.innerHTML = '&times;';
        btn.addEventListener('click', () => onRemove(idx));
        chip.appendChild(btn);
        container.appendChild(chip);
    });
}

function parseWordsInput(value) {
    if (!value) return [];
    return value
        .split(/[,\s]+/)
        .map(w => w.trim())
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
    ].forEach(btn => {
        if (btn) btn.disabled = disabled;
    });
}

// ---------- Add section ----------
function handleAddWords() {
    const words = parseWordsInput(els.addWordsInput.value);
    if (!words.length) return;
    words.forEach(w => {
        if (!state.addWords.includes(w)) state.addWords.push(w);
    });
    els.addWordsInput.value = '';
    renderChips(els.addWordsChips, state.addWords, idx => {
        state.addWords.splice(idx, 1);
        renderChips(els.addWordsChips, state.addWords, arguments.callee);
    });
}

function initAddSection() {
    els.addWordBtn.addEventListener('click', handleAddWords);
    els.addWordsInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddWords();
        }
    });

    els.addClearBtn.addEventListener('click', () => {
        state.addWords = [];
        renderChips(els.addWordsChips, state.addWords, () => { });
    });

    els.addSubmitBtn.addEventListener('click', async () => {
        if (!state.addWords.length) {
            log('No words queued to add.', 'warn');
            return;
        }
        toggleBusy(true);
        try {
            const res = await fetch(`${API_BASE}/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ words: state.addWords }),
            });
            const data = await res.json();
            if (!res.ok) {
                log(`Add failed: ${data.error || res.status}`, 'err');
            } else {
                const added = data.added || [];
                const skipped = data.skipped || [];
                log(`Add: ${added.length} added, ${skipped.length} skipped.`, 'ok');
                state.addWords = [];
                renderChips(els.addWordsChips, state.addWords, () => { });
                reloadTable();
            }
        } catch (err) {
            log(`Add error: ${err}`, 'err');
        } finally {
            toggleBusy(false);
        }
    });
}

// ---------- Delete section ----------
function handleRemoveWords() {
    const words = parseWordsInput(els.removeWordsInput.value);
    if (!words.length) return;
    words.forEach(w => {
        if (!state.removeWords.includes(w)) state.removeWords.push(w);
    });
    els.removeWordsInput.value = '';
    renderChips(els.removeWordsChips, state.removeWords, idx => {
        state.removeWords.splice(idx, 1);
        renderChips(els.removeWordsChips, state.removeWords, arguments.callee);
    });
}

function initDeleteSection() {
    els.removeWordBtn.addEventListener('click', handleRemoveWords);
    els.removeWordsInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleRemoveWords();
        }
    });

    els.removeClearBtn.addEventListener('click', () => {
        state.removeWords = [];
        renderChips(els.removeWordsChips, state.removeWords, () => { });
    });

    els.removeSubmitBtn.addEventListener('click', async () => {
        if (!state.removeWords.length) {
            log('No words queued to delete.', 'warn');
            return;
        }
        toggleBusy(true);
        try {
            const res = await fetch(`${API_BASE}/delete`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ words: state.removeWords }),
            });
            const data = await res.json();
            if (!res.ok) {
                log(`Delete failed: ${data.error || res.status}`, 'err');
            } else {
                const deleted = data.deleted || [];
                const notFound = data.not_found || [];
                log(`Delete: ${deleted.length} deleted, ${notFound.length} not found.`, 'ok');
                state.removeWords = [];
                renderChips(els.removeWordsChips, state.removeWords, () => { });
                reloadTable();
            }
        } catch (err) {
            log(`Delete error: ${err}`, 'err');
        } finally {
            toggleBusy(false);
        }
    });
}

// ---------- Upload section ----------
function initUploadSection() {
    els.uploadBtn.addEventListener('click', async () => {
        const file = els.fileInput.files[0];
        if (!file) {
            log('Please select a .txt or .docx file.', 'warn');
            return;
        }
        const ext = file.name.toLowerCase().split('.').pop();
        if (!['txt', 'docx'].includes(ext)) {
            log('Invalid file type. Only .txt and .docx are allowed.', 'err');
            return;
        }

        toggleBusy(true);
        const formData = new FormData();
        formData.append('file', file);
        const addedBy = els.addedByInput.value.trim();
        if (addedBy) formData.append('added_by', addedBy);

        try {
            const res = await fetch(`${API_BASE}/upload-file`, {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) {
                log(`Upload failed: ${data.error || res.status}`, 'err');
                return;
            }

            const {
                file: fileName,
                total_tokens = 0,
                unique_words = 0,
                inserted = [],
                updated = [],
                skipped = [],
                errors = [],
            } = data;

            log(
                `Processed "${fileName || file.name}": ` +
                `${total_tokens} tokens, ${unique_words} unique, ` +
                `${inserted.length} inserted, ${updated.length} updated, ` +
                `${errors.length} errors.`,
                'ok'
            );

            const container = els.uploadResultCounts;
            container.classList.remove('d-none');
            container.innerHTML = '';

            const mkBadge = (label, value, klass) => {
                const span = document.createElement('span');
                span.className = `badge bg-${klass} me-1`;
                span.textContent = `${label}: ${value}`;
                return span;
            };

            container.appendChild(mkBadge('Tokens', total_tokens, 'secondary'));
            container.appendChild(mkBadge('Unique', unique_words, 'secondary'));
            container.appendChild(mkBadge('Inserted', inserted.length, 'success'));
            container.appendChild(mkBadge('Updated', updated.length, 'warning'));
            container.appendChild(mkBadge('Skipped', skipped.length, 'info'));
            container.appendChild(mkBadge('Errors', errors.length, 'danger'));

            reloadTable();
        } catch (err) {
            log(`Upload error: ${err}`, 'err');
        } finally {
            toggleBusy(false);
        }
    });
}

// ---------- DataTables server-side with search & selection ----------

function initTable() {
    state.table = $('#userWordsTable').DataTable({
        serverSide: true,
        processing: true,
        searching: false,
        ordering: false,
        ajax: function (data, callback, settings) {
            const offset = data.start || 0;
            const limit = data.length || 10;
            const search = els.tableSearchInput.value.trim();

            const params = new URLSearchParams({
                limit: String(limit),
                offset: String(offset),
            });
            if (search) params.append('search', search);

            fetch(`${API_BASE}/pending?${params.toString()}`)
                .then(res => res.json())
                .then(json => {
                    callback({
                        data: json.data || [],
                        recordsTotal: json.recordsTotal || 0,
                        recordsFiltered: json.recordsFiltered || json.recordsTotal || 0,
                    });
                })
                .catch(err => {
                    log(`Table load error: ${err}`, 'err');
                    callback({
                        data: [],
                        recordsTotal: 0,
                        recordsFiltered: 0,
                    });
                });
        },
        columns: [
            {
                data: 'word',
                orderable: false,
                searchable: false,
                render: function (data, type, row) {
                    const checked = state.selectedWords.has(data) ? 'checked' : '';
                    return `<input type="checkbox" class="form-check-input row-select" value="${data}" ${checked}>`;
                },
            },
            { data: 'word' },
            { data: 'added_by', defaultContent: '' },
            { data: 'frequency' },
            {
                data: 'created_at',
                render: function (data) {
                    if (!data) return '';
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
    $('#userWordsTable tbody').on('change', 'input.row-select', function () {
        const word = this.value;
        if (this.checked) {
            state.selectedWords.add(word);
        } else {
            state.selectedWords.delete(word);
        }
        syncSelectAllCheckbox();
    });

    // Select all (current page)
    els.selectAllRows.addEventListener('change', function () {
        const checked = this.checked;
        $('#userWordsTable tbody input.row-select').each(function () {
            this.checked = checked;
            const word = this.value;
            if (checked) {
                state.selectedWords.add(word);
            } else {
                state.selectedWords.delete(word);
            }
        });
    });

    // Search button click
    els.tableSearchBtn.addEventListener('click', () => {
        reloadTable(true);
    });

    // Enter key in search box triggers search
    els.tableSearchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            reloadTable(true);
        }
    });
}

function syncSelectAllCheckbox() {
    const checkboxes = $('#userWordsTable tbody input.row-select');
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

// ---------- Approve selected ----------
function initApproveSelected() {
    els.approveSelectedBtn.addEventListener('click', async () => {
        const words = Array.from(state.selectedWords);
        if (!words.length) {
            log('No rows selected for approval.', 'warn');
            return;
        }

        const admin_name = prompt('Enter admin name (optional):') || null;

        toggleBusy(true);
        try {
            const res = await fetch(`${API_BASE}/approve-selected`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ words, admin_name }),
            });
            const data = await res.json();
            if (!res.ok) {
                log(`Approve failed: ${data.error || res.status}`, 'err');
            } else {
                const moved = data.moved || [];
                const already = data.already_exists || [];
                const notFound = data.not_found || [];
                const failed = data.failed || [];
                log(
                    `Approve selected → moved: ${moved.length}, ` +
                    `already exists: ${already.length}, ` +
                    `not found: ${notFound.length}, ` +
                    `failed: ${failed.length}.`,
                    'ok'
                );
                moved.forEach(w => state.selectedWords.delete(w));
                reloadTable(false);
            }
        } catch (err) {
            log(`Approve error: ${err}`, 'err');
        } finally {
            toggleBusy(false);
        }
    });
}
function initDeleteSelected() {
    els.deleteSelectedBtn.addEventListener('click', async () => {
        const words = Array.from(state.selectedWords);
        if (!words.length) {
            log('No rows selected for deletion.', 'warn');
            return;
        }

        const confirmDelete = confirm(
            `Delete ${words.length} word(s) from user dictionary?`
        );
        if (!confirmDelete) return;

        toggleBusy(true);
        try {
            const res = await fetch(`${API_BASE}/delete`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ words }),
            });
            const data = await res.json();
            if (!res.ok) {
                log(`Delete selected failed: ${data.error || res.status}`, 'err');
            } else {
                const deleted = data.deleted || [];
                const notFound = data.not_found || [];
                log(
                    `Delete selected → deleted: ${deleted.length}, ` +
                    `not found: ${notFound.length}.`,
                    'ok'
                );
                deleted.forEach(w => state.selectedWords.delete(w));
                reloadTable(false);
            }
        } catch (err) {
            log(`Delete selected error: ${err}`, 'err');
        } finally {
            toggleBusy(false);
        }
    });
}

// ---------- Init ----------
$(document).ready(function () {
    initAddSection();
    initDeleteSection();
    initUploadSection();
    initTable();
    initApproveSelected();
    initDeleteSelected();
    els.refreshTableBtn.addEventListener('click', () => reloadTable(false));
    log('UI loaded. Using API base: ' + API_BASE, 'info');
});
