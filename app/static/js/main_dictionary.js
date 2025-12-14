// static/js/main_dictionary.js - ✅ ALL ISSUES FIXED
import apiClient from "./apiClient.js";
import API_ENDPOINTS from "./apiEndpoints.js";

const state = {
    addWords: [],
    removeWords: [],
    selectedWords: new Set(),
    table: null,
    busy: false
};

const els = {
    addInput: '#addInput', addQueueBtn: '#addQueueBtn', addChips: '#addChips', addCount: '#addCount',
    addSubmitBtn: '#addSubmitBtn', addClearBtn: '#addClearBtn',
    removeInput: '#removeInput', removeQueueBtn: '#removeQueueBtn', removeChips: '#removeChips', removeCount: '#removeCount',
    removeSubmitBtn: '#removeSubmitBtn', removeClearBtn: '#removeClearBtn',
    searchInput: '#searchInput', searchBtn: '#searchBtn', refreshBtn: '#refreshBtn',
    bulkDeleteBtn: '#bulkDeleteBtn', selectAll: '#selectAll', totalWords: '#totalWords',
    logArea: '#logArea', loading: '#loadingOverlay', selectedCountBadge: '#selectedCountBadge'
};

const log = (message, type = 'info') => {
    const logEl = document.querySelector(els.logArea);
    const line = document.createElement('div');
    line.className = `mb-2 p-2 rounded border-start border-${type} ps-3 small`;
    line.innerHTML = `
        <span class="badge bg-${type} me-2">${{ info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' }[type] || 'ℹ️'}</span>
        ${message}
        <div class="text-muted mt-1" style="font-size: 0.75rem;">${new Date().toLocaleTimeString()}</div>
    `;
    logEl.prepend(line);
    logEl.scrollTop = 0;
    if (logEl.children.length > 30) logEl.removeChild(logEl.lastChild);
};

const escapeHtml = text => text?.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]) || '';

const updateUI = () => {
    // Add queue
    document.getElementById('addCount').textContent = state.addWords.length;
    document.getElementById('addSubmitBtn').disabled = state.addWords.length === 0;
    document.getElementById('addClearBtn').disabled = state.addWords.length === 0;
    document.getElementById('addChips').innerHTML = state.addWords.map((word, i) => `
        <span class="badge bg-success">
            ${escapeHtml(word)}
            <i class="bi bi-x ms-1 text-white ms-1" style="cursor:pointer;font-size:0.75rem;" onclick="app.removeFromAdd(${i})" title="Remove"></i>
        </span>
    `).join('') || '<div class="text-muted small w-100 text-center">No words queued</div>';

    // Remove queue
    document.getElementById('removeCount').textContent = state.removeWords.length;
    document.getElementById('removeSubmitBtn').disabled = state.removeWords.length === 0;
    document.getElementById('removeClearBtn').disabled = state.removeWords.length === 0;
    document.getElementById('removeChips').innerHTML = state.removeWords.map((word, i) => `
        <span class="badge bg-danger">
            ${escapeHtml(word)}
            <i class="bi bi-x ms-1 text-white ms-1" style="cursor:pointer;font-size:0.75rem;" onclick="app.removeFromRemove(${i})" title="Remove"></i>
        </span>
    `).join('') || '<div class="text-muted small w-100 text-center">No words queued</div>';

    // Table selection
    const selectedBadge = document.querySelector(els.selectedCountBadge);
    const count = state.selectedWords.size;
    document.getElementById('bulkDeleteBtn').disabled = count === 0;
    if (count > 0) {
        selectedBadge.textContent = `${count} selected`;
        selectedBadge.className = `badge bg-primary fs-6`;
        selectedBadge.style.display = 'inline-block';
    } else {
        selectedBadge.style.display = 'none';
    }
};

const toggleBusy = (busy) => {
    state.busy = busy;
    document.querySelectorAll('button:not([data-bs-dismiss])').forEach(btn => btn.disabled = busy);
    document.querySelector(els.loading).classList.toggle('d-none', !busy);
};

const showConfirmModal = (title, message, words, callback) => {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;

    const preview = document.getElementById('confirmPreview');
    if (words.length) {
        preview.innerHTML = words.slice(0, 8).map(w => `<span class="badge bg-warning me-1 mb-1">${escapeHtml(w)}</span>`).join('') +
            (words.length > 8 ? `<div class="text-muted small mt-1">+${words.length - 8} more</div>` : '');
        preview.classList.remove('d-none');
    } else {
        preview.classList.add('d-none');
    }

    const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
    modal.show();

    document.getElementById('confirmBtn').onclick = async () => {
        modal.hide();
        toggleBusy(true);
        try {
            await callback();
        } catch (error) {
            log(error.response?.data?.message || error.message || 'Operation failed', 'error');
        } finally {
            toggleBusy(false);
        }
    };
};

const initPanels = () => {
    // Add single word workflow
    document.getElementById('addQueueBtn').onclick = () => {
        const input = document.getElementById('addInput');
        const word = input.value.trim();
        if (!word) {
            log('Please enter a word', 'warning');
            return;
        }
        if (state.addWords.includes(word)) {
            log(`"${word}" already in queue`, 'warning');
            return;
        }
        state.addWords.push(word);
        input.value = '';
        updateUI();
        log(`✅ Added "${word}" to queue (${state.addWords.length} total)`, 'success');
    };

    document.getElementById('addInput').addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('addQueueBtn').click();
        }
    });

    document.getElementById('addSubmitBtn').onclick = () => {
        if (!state.addWords.length) return;
        showConfirmModal(
            'Add Words to Dictionary',
            `Add ${state.addWords.length} word${state.addWords.length > 1 ? 's' : ''} to dictionary?`,
            state.addWords,
            async () => {
                const res = await apiClient.post(API_ENDPOINTS.MAIN_DICTIONARY.ADD, { words: state.addWords });
                log(`✅ Added ${res.created?.length || 0} words successfully`, 'success');
                state.addWords = [];
                updateUI();
                reloadTable();
            }
        );
    };

    document.getElementById('addClearBtn').onclick = () => {
        state.addWords = [];
        updateUI();
        log('Add queue cleared', 'info');
    };

    // Remove single word workflow
    document.getElementById('removeQueueBtn').onclick = () => {
        const input = document.getElementById('removeInput');
        const word = input.value.trim();
        if (!word) {
            log('Please enter a word', 'warning');
            return;
        }
        if (state.removeWords.includes(word)) {
            log(`"${word}" already in queue`, 'warning');
            return;
        }
        state.removeWords.push(word);
        input.value = '';
        updateUI();
        log(`✅ Added "${word}" to remove queue (${state.removeWords.length} total)`, 'warning');
    };

    document.getElementById('removeInput').addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('removeQueueBtn').click();
        }
    });

    document.getElementById('removeSubmitBtn').onclick = () => {
        if (!state.removeWords.length) return;
        showConfirmModal(
            'Delete Words from Dictionary',
            `Delete ${state.removeWords.length} word${state.removeWords.length > 1 ? 's' : ''} permanently?`,
            state.removeWords,
            async () => {
                const res = await apiClient.delete(API_ENDPOINTS.MAIN_DICTIONARY.DELETE, { words: state.removeWords });
                log(`✅ Deleted ${res.deleted?.length || 0} words successfully`, 'success');
                state.removeWords = [];
                updateUI();
                reloadTable();
            }
        );
    };

    document.getElementById('removeClearBtn').onclick = () => {
        state.removeWords = [];
        updateUI();
        log('Remove queue cleared', 'info');
    };
};

const initTable = () => {
    if (state.table) {
        state.table.destroy();
    }

    state.table = $('#wordsTable').DataTable({
        destroy: true,
        processing: true,
        serverSide: true,
        pageLength: 25,
        searching: false,
        order: [[2, 'asc']],
        language: {
            processing: '<i class="bi bi-hourglass-split"></i> Loading...',
            emptyTable: '<div class="text-center p-4"><i class="bi bi-inbox fs-1 text-muted mb-3"></i><p class="text-muted">No words found</p></div>'
        },
        ajax: (data, callback, settings) => {
            apiClient.get(API_ENDPOINTS.MAIN_DICTIONARY.LIST, {
                draw: data.draw,
                start: data.start,
                length: data.length,
                search: document.getElementById('searchInput').value || ''
            }).then(res => {
                const tableData = (res.data || []).map((row, index) => ({
                    word: row.word || '',
                    frequency: row.frequency || 0,
                    added_by: row.added_by || 'System',
                    added: row.added || row.added_at || 'N/A',
                    serial: data.start + index + 1
                })).filter(row => row.word);

                callback({
                    draw: res.draw || data.draw,
                    recordsTotal: res.recordsTotal || 0,
                    recordsFiltered: res.recordsFiltered || 0,
                    data: tableData
                });
            }).catch(err => {
                log('Table load failed: ' + (err.message || 'Unknown error'), 'error');
                callback({ draw: data.draw, recordsTotal: 0, recordsFiltered: 0, data: [] });
            });
        },
        columns: [
            {
                orderable: false,
                width: '40px',
                render: (data, type, row) => `<input type="checkbox" class="form-check-input row-select" value="${escapeHtml(row.word)}">`
            },
            {
                orderable: false,
                width: '60px',
                className: 'text-center',
                render: (data, type, row) => type === 'display' ? row.serial : ''
            },
            { data: 'word', className: 'fw-medium' },
            {
                data: 'frequency',
                className: 'text-center',
                render: freq => `<span class="badge ${freq > 50 ? 'bg-success' : freq > 10 ? 'bg-warning' : 'bg-secondary'}">${freq}</span>`
            },
            { data: 'added_by' },
            { data: 'added' }
        ],
        drawCallback: function () {
            updateStats();
            bindRowEvents();
        }
    });
};

const reloadTable = () => {
    if (state.table) {
        state.table.ajax.reload(null, false);
    }
};

const updateStats = () => {
    const info = state.table?.page.info();
    if (info) {
        document.getElementById('totalWords').textContent = info.recordsTotal.toLocaleString();
    }
    updateUI();
};

const bindRowEvents = () => {
    $('#wordsTable tbody').off('change.row-select click.row')
        .on('change.row-select', '.row-select', function () {
            const word = this.value;
            if (this.checked) {
                state.selectedWords.add(word);
                $(this).closest('tr').addClass('table-active');
            } else {
                state.selectedWords.delete(word);
                $(this).closest('tr').removeClass('table-active');
            }
            updateUI();
        })
        .on('click.row', 'tr', function (e) {
            if (!$(e.target).is('input[type="checkbox"]')) {
                $(this).find('.row-select').trigger('click');
            }
        });
};

const initActions = () => {
    document.getElementById('refreshBtn').onclick = () => {
        reloadTable();
        log('Table refreshed', 'info');
    };

    document.getElementById('searchInput').addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            reloadTable();
        }
    });

    document.getElementById('searchBtn').onclick = reloadTable;

    document.getElementById('bulkDeleteBtn').onclick = () => {
        const words = Array.from(state.selectedWords);
        if (!words.length) return log('No words selected', 'warning');

        showConfirmModal(
            'Delete Selected Words',
            `Delete ${words.length} selected word${words.length > 1 ? 's' : ''} permanently?`,
            words,
            async () => {
                await apiClient.delete(API_ENDPOINTS.MAIN_DICTIONARY.DELETE, { words });
                log(`✅ Deleted ${words.length} selected words`, 'success');
                state.selectedWords.clear();
                reloadTable();
            }
        );
    };

    document.getElementById('selectAll').onchange = function () {
        const isChecked = this.checked;
        state.selectedWords.clear();
        $('#wordsTable tbody .row-select').prop('checked', isChecked).trigger('change');
        log(isChecked ? 'All visible rows selected' : 'Selection cleared', 'info');
    };
};

window.app = {
    removeFromAdd(index) {
        const word = state.addWords.splice(index, 1)[0];
        updateUI();
        log(`Removed "${word}" from add queue`, 'info');
    },
    removeFromRemove(index) {
        const word = state.removeWords.splice(index, 1)[0];
        updateUI();
        log(`Removed "${word}" from remove queue`, 'info');
    }
};

$(document).ready(() => {
    updateUI();
    initPanels();
    initTable();
    initActions();
    log('✅ Main Dictionary Dashboard Ready', 'success');
});
