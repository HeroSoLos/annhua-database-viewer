/*******************************************************
 * script.js
 * - Provides rule creation (old design)
 * - Drag-and-drop grouping with a custom modal prompt for AND/OR merge
 * - Sorting and filtering of the table based on nested logic
 ******************************************************/

// Assume data.js defines window.peopleData
let people = [];
let visibleColumns = []; // Track visible columns
let rootNodes = []; // Top-level rule or group nodes
let sortStates = {};
let currentSortColumn = null;

window.addEventListener('DOMContentLoaded', () => {
    people = window.peopleData || [];

    const colSelect = document.getElementById('searchColumn');
    const opSelect = document.getElementById('searchOperator');
    populateSearchColumns(colSelect);
    colSelect.addEventListener('change', () => updateOperatorOptions(colSelect.value, opSelect));
    updateOperatorOptions(colSelect.value, opSelect);

    document.getElementById('addRuleBtn').addEventListener('click', addRule);

    renderRules();
    renderTable();

    // Dataset selection button and modal
    document.getElementById('selectDatasetBtn').addEventListener('click', openDatasetModal);
    document.getElementById('datasetSearch').addEventListener('input', filterDatasets);
    document.getElementById('closeDatasetModal').addEventListener('click', closeDatasetModal);
    populateDatasetList();

    // Dataset settings button and modal
    document.getElementById('datasetSettingsBtn').addEventListener('click', openSettingsModal);
    document.getElementById('closeSettingsModal').addEventListener('click', closeSettingsModal);
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
    document.getElementById('selectAllBtn').addEventListener('click', selectAllColumns);
    document.getElementById('deselectAllBtn').addEventListener('click', deselectAllColumns);
    document.getElementById('flipAllBtn').addEventListener('click', flipAllColumns); // Add this line

    // Automatically select the first available dataset
    const firstDataset = Object.keys(window).find(key => Array.isArray(window[key]));
    if (firstDataset) {
        selectDataset(firstDataset);
    }
});

function flipAllColumns() {
    const checklist = document.getElementById('columnChecklist');
    checklist.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = !cb.checked);
}

function selectAllColumns() {
    const checklist = document.getElementById('columnChecklist');
    checklist.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
}

function deselectAllColumns() {
    const checklist = document.getElementById('columnChecklist');
    checklist.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
}

function openSettingsModal() {
    const modal = document.getElementById('datasetSettingsModal');
    const checklist = document.getElementById('columnChecklist');
    checklist.innerHTML = '';

    const columns = Object.keys(people[0]);
    columns.forEach(column => {
        const label = document.createElement('label');
        label.style.display = 'block';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = column;
        checkbox.checked = visibleColumns.includes(column);
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(' ' + capitalize(column)));
        checklist.appendChild(label);
    });

    modal.style.display = 'block';
}

function closeSettingsModal() {
    document.getElementById('datasetSettingsModal').style.display = 'none';
}

function saveSettings() {
    const checklist = document.getElementById('columnChecklist');
    visibleColumns = Array.from(checklist.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
    renderTable();
    closeSettingsModal();
}

function openDatasetModal() {
    document.getElementById('datasetModal').style.display = 'block';
}

function closeDatasetModal() {
    document.getElementById('datasetModal').style.display = 'none';
}

function populateDatasetList() {
    const datasetList = document.getElementById('datasetList');
    datasetList.innerHTML = '';
    Object.keys(window).forEach(key => {
        if (Array.isArray(window[key])) {
            const div = document.createElement('div');
            div.textContent = key;
            div.addEventListener('dblclick', () => selectDataset(key));
            datasetList.appendChild(div);
        }
    });
}

function filterDatasets() {
    const searchValue = document.getElementById('datasetSearch').value.toLowerCase();
    const datasetList = document.getElementById('datasetList');
    Array.from(datasetList.children).forEach(div => {
        if (div.textContent.toLowerCase().includes(searchValue)) {
            div.style.display = 'block';
        } else {
            div.style.display = 'none';
        }
    });
}

function selectDataset(datasetName) {
    people = window[datasetName] || [];
    rootNodes = [];
    sortStates = {};
    currentSortColumn = null;
    populateSearchColumns(document.getElementById('searchColumn'));
    updateOperatorOptions(document.getElementById('searchColumn').value, document.getElementById('searchOperator'));
    renderRules();
    renderTable();
    closeDatasetModal();

    // Initialize visible columns with all columns of the dataset
    visibleColumns = Object.keys(people[0]);
    renderTable(); // Update the table with the new dataset
}

// Populate search column dropdown with dynamic keys
function populateSearchColumns(columnSelect) {
    columnSelect.innerHTML = '';
    if (people.length === 0) return;
    const columns = Object.keys(people[0]);
    columns.forEach(column => {
        const opt = document.createElement('option');
        opt.value = column;
        opt.textContent = capitalize(column);
        columnSelect.appendChild(opt);
    });
}

// Update operator dropdown based on column type
function updateOperatorOptions(column, operatorSelect) {
    operatorSelect.innerHTML = '';
    addOp('contains', 'contains');
    addOp('notcontains', 'not contains');
    addOp('eq', '=');
    addOp('neq', '!=');
    addOp('gt', '>');
    addOp('lt', '<');
    function addOp(val, label) {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = label;
        operatorSelect.appendChild(opt);
    }
}

// Add a basic rule node
function addRule() {
    const colSelect = document.getElementById('searchColumn');
    const opSelect = document.getElementById('searchOperator');
    const valInput = document.getElementById('searchValue');
    const column = colSelect.value;
    const operator = opSelect.value;
    const value = valInput.value.trim();
    if (!value) return;
    const ruleNode = { type: 'rule', column, operator, value };
    rootNodes.push(ruleNode);
    valInput.value = '';
    renderRules();
    renderTable();
}

// Render the rules/groups in #rulesContainer
function renderRules() {
    const container = document.getElementById('rulesContainer');
    container.innerHTML = '';
    rootNodes.forEach(node => {
        container.appendChild(renderNode(node));
    });
}

// Render a node (rule or group) as a pill
function renderNode(node) {
    if (node.type === 'rule') {
        const pill = document.createElement('div');
        pill.className = 'rule-pill';
        pill.draggable = true;

        const text = document.createElement('span');
        text.className = 'rule-text';
        text.textContent = `${capitalize(node.column)} ${opLabel(node.operator)} "${node.value}"`;
        pill.appendChild(text);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'rule-remove';
        removeBtn.textContent = 'X';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeNode(node);
        });

        pill.appendChild(removeBtn);
        addDragEvents(pill, node);
        return pill;
    } else {
        const group = document.createElement('div');
        group.className = 'group-pill';
        group.draggable = true;

        const childContainer = document.createElement('div');
        childContainer.className = 'group-children';
        node.children.forEach((child, index) => {
            const childEl = renderNode(child);
            childContainer.appendChild(childEl);
            if (index < node.children.length - 1) {
                const opSpan = document.createElement('span');
                opSpan.className = 'rule-text';
                opSpan.textContent = ` ${node.logic} `;
                childContainer.appendChild(opSpan);
            }
        });

        group.appendChild(childContainer);

        // Remove existing remove buttons before adding a single one
        const existingRemove = group.querySelector('.rule-remove');
        if (!existingRemove) {
            const removeBtn = document.createElement('button');
            removeBtn.className = 'rule-remove';
            removeBtn.textContent = 'X';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeNode(node);
            });
            group.appendChild(removeBtn);
        }

        addDragEvents(group, node);
        return group;
    }
}

// Remove a node from rootNodes or recursively from groups
function removeNode(targetNode) {
    const idx = rootNodes.indexOf(targetNode);
    if (idx >= 0) {
        rootNodes.splice(idx, 1);
    } else {
        removeNodeRecursive(rootNodes, targetNode);
    }
    renderRules();
    renderTable();
}

function removeNodeRecursive(nodes, target) {
    for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (n === target) {
            nodes.splice(i, 1);
            return;
        }
        if (n.type === 'group') {
            removeNodeRecursive(n.children, target);
        }
    }
}

// Drag & Drop events with custom modal for merge operator
function addDragEvents(el, node) {
    el.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', nodeId(node));
        window.__dragMap = window.__dragMap || {};
        window.__dragMap[nodeId(node)] = node;
        el.classList.add('dragging');
    });
    el.addEventListener('dragenter', (e) => {
        e.preventDefault();
        el.classList.add('drop-target');
    });
    el.addEventListener('dragover', (e) => { e.preventDefault(); });
    el.addEventListener('dragleave', (e) => {
        el.classList.remove('drop-target');
    });
    el.addEventListener('drop', async (e) => {
        e.preventDefault();
        
        // Check if this is a child element within a group-pill
        // If so, stop processing - let the parent group handle the drop
        if (isChildOfGroupPill(e.target) && e.target !== el) {
            return;
        }
        
        el.classList.remove('drop-target');
        const draggedId = e.dataTransfer.getData('text/plain');
        if (!window.__dragMap || !window.__dragMap[draggedId]) return;
        const draggedNode = window.__dragMap[draggedId];
        if (draggedNode === node || isDescendant(draggedNode, node)) return;
        // Add blue highlight to both source and target elements
        el.classList.add('drop-target');
        const sourceEl = document.querySelector(`[draggable][data-node-id="${draggedId}"]`);
        if (sourceEl) { sourceEl.classList.add('drop-target'); }
        // Use custom modal prompt (centered in dark theme) instead of alert
        const mergeLogic = await showMergePrompt();
        if (mergeLogic !== 'AND' && mergeLogic !== 'OR') {
            el.classList.remove('drop-target');
            if (sourceEl) sourceEl.classList.remove('drop-target');
            return;
        }
        // Remove highlights
        el.classList.remove('drop-target');
        if (sourceEl) sourceEl.classList.remove('drop-target');
        // Remove both nodes from their current positions
        removeNode(draggedNode);
        removeNode(node);
        // Create new group node with children in order: target then dragged node
        const newGroup = { type: 'group', logic: mergeLogic, children: [node, draggedNode] };
        rootNodes.push(newGroup);
        renderRules();
        renderTable();
    });
    el.setAttribute('data-node-id', nodeId(node));
    el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
        el.classList.remove('drop-target');
    });
}

function isDescendant(draggedNode, potentialParent) {
    if (potentialParent.type !== 'group') return false;
    for (const child of potentialParent.children) {
        if (child === draggedNode) return true;
        if (child.type === 'group' && isDescendant(draggedNode, child)) return true;
    }
    return false;
}

function nodeId(node) {
    if (!node.__id) { node.__id = Math.random().toString(36).slice(2); }
    return node.__id;
}

// Custom modal prompt for merge operator
function showMergePrompt() {
    return new Promise((resolve) => {
        const modal = document.getElementById('modalPrompt');
        modal.style.display = 'block';
        const andBtn = document.getElementById('mergeAndBtn');
        const orBtn = document.getElementById('mergeOrBtn');
        const cancelBtn = document.getElementById('mergeCancelBtn');
        function cleanup() {
            modal.style.display = 'none';
            andBtn.removeEventListener('click', onAnd);
            orBtn.removeEventListener('click', onOr);
            cancelBtn.removeEventListener('click', onCancel);
        }
        function onAnd() { cleanup(); resolve('AND'); }
        function onOr() { cleanup(); resolve('OR'); }
        function onCancel() { cleanup(); resolve(null); }
        andBtn.addEventListener('click', onAnd);
        orBtn.addEventListener('click', onOr);
        cancelBtn.addEventListener('click', onCancel);
    });
}

/*******************************************************
 * TABLE RENDERING & FILTERING
 *******************************************************/
function renderTable() {
    const filtered = filterByNodes(people, rootNodes);
    const sorted = applySort(filtered);
    displayPeople(sorted);
    updateArrowIcons(); // Call this function to update the arrow icons
}

function filterByNodes(dataArray, nodes) {
    if (!nodes.length) return dataArray;
    let result = [];
    for (let i = 0; i < nodes.length; i++) {
        const subset = filterOneNode(dataArray, nodes[i]);
        result = union(result, subset);
    }
    return result;
}

function filterOneNode(dataArray, node) {
    if (node.type === 'rule') {
        return filterByRule(dataArray, node);
    } else {
        let groupResult = null;
        for (let child of node.children) {
            const subset = filterOneNode(dataArray, child);
            if (groupResult === null) {
                groupResult = subset;
            } else {
                if (node.logic === 'AND') {
                    groupResult = intersection(groupResult, subset);
                } else {
                    groupResult = union(groupResult, subset);
                }
            }
        }
        return groupResult || [];
    }
}

function filterByRule(dataArray, rule) {
    const { column, operator, value } = rule;
    const isNum = (column === 'year');
    const valNum = parseFloat(value);
    return dataArray.filter(item => {
        const fieldVal = item[column];
        if (isNum || !isNaN(fieldVal)) {
            const fieldNum = parseFloat(fieldVal);
            switch (operator) {
                case 'eq': return fieldNum === valNum;
                case 'neq': return fieldNum !== valNum;
                case 'gt': return fieldNum > valNum;
                case 'lt': return fieldNum < valNum;
                default: return false;
            }
        } else {
            const fstr = String(fieldVal).toLowerCase();
            const vstr = value.toLowerCase();
            switch (operator) {
                case 'contains': return fstr.includes(vstr);
                case 'notcontains': return !fstr.includes(vstr);
                case 'eq': return fstr === vstr;
                case 'neq': return fstr !== vstr;
                case 'gt': return fstr > vstr;
                case 'lt': return fstr < vstr;
                default: return false;
            }
        }
    });
}

function handleSort(column) {
    if (currentSortColumn !== column) {
        if (currentSortColumn) sortStates[currentSortColumn] = 'none';
        currentSortColumn = column;
        sortStates[column] = 'asc';
    } else {
        const dir = sortStates[column];
        if (dir === 'asc') { sortStates[column] = 'desc'; }
        else if (dir === 'desc') { sortStates[column] = 'none'; currentSortColumn = null; }
        else { sortStates[column] = 'asc'; }
    }
    updateArrowIcons();
    renderTable();
}

function applySort(dataArray) {
    if (!currentSortColumn) return dataArray.slice();
    const dir = sortStates[currentSortColumn];
    if (dir === 'none') return dataArray.slice();
    return dataArray.slice().sort((a, b) => {
        const valA = a[currentSortColumn];
        const valB = b[currentSortColumn];
        if (currentSortColumn === 'year' || !isNaN(valA)) {
            return dir === 'asc' ? (valA - valB) : (valB - valA);
        } else {
            const sA = String(valA).toLowerCase();
            const sB = String(valB).toLowerCase();
            if (sA < sB) return dir === 'asc' ? -1 : 1;
            if (sA > sB) return dir === 'asc' ? 1 : -1;
            return 0;
        }
    });
}

function displayPeople(dataArray) {
    const tbody = document.getElementById('peopleTableBody');
    const thead = document.querySelector('.table-container thead tr');
    tbody.innerHTML = '';
    thead.innerHTML = '';

    if (dataArray.length === 0) return;

    // Generate table headers dynamically
    visibleColumns.forEach(column => {
        const th = document.createElement('th');
        th.textContent = capitalize(column);
        const span = document.createElement('span');
        span.className = 'arrow';
        span.id = `arrow-${column}`;
        span.onclick = () => handleSort(column);
        span.textContent = '—';
        th.appendChild(span);
        thead.appendChild(th);
    });

    // Generate table rows dynamically
    dataArray.forEach(person => {
        const tr = document.createElement('tr');
        visibleColumns.forEach(column => {
            const td = document.createElement('td');
            td.textContent = person[column];
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}

function updateArrowIcons() {
    Object.keys(sortStates).forEach(col => {
        setArrow(col, sortStates[col]);
    });
}

function setArrow(col, dir) {
    const span = document.getElementById(`arrow-${col}`);
    if (!span) return;
    if (dir === 'asc') span.textContent = '↑';
    else if (dir === 'desc') span.textContent = '↓';
    else span.textContent = '—';
}

function union(a, b) {
    const set = new Set([...a, ...b]);
    return Array.from(set);
}
function intersection(a, b) {
    const setB = new Set(b);
    return a.filter(x => setB.has(x));
}
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
function opLabel(op) {
    switch (op) {
        case 'eq': return '=';
        case 'neq': return '!=';
        case 'gt': return '>';
        case 'lt': return '<';
        case 'contains': return 'contains';
        case 'notcontains': return 'not contains';
        default: return op;
    }
}

function isChildOfGroupPill(element) {
    while (element) {
        if (element.classList && element.classList.contains('group-pill')) {
            return true;
        }
        element = element.parentElement;
    }
    return false;
}