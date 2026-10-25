/**
 * StudyFlow - DSA Lab Visualizer
 * js/visualizer.js
 * 
 * Provides interactive visual representations of:
 * 1. Binary Min-Heap as an interactive SVG Tree and 0-indexed Array
 * 2. Custom Hash Map with Buckets, Separate Chaining, and Load Factor meter
 * 3. Operation explanations and complexity analysis
 * 
 * Safe DOM rendering: uses createElement / textContent and SVG namespaces.
 */

class DsaVisualizer {
    constructor() {
        this.selectedNodeIndex = null;
    }

    /**
     * Clears all children of a DOM node safely
     * @param {HTMLElement} element 
     */
    _clearElement(element) {
        if (!element) return;
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }

    /**
     * Creates an SVG element with attributes
     * @private
     */
    _createSvgElement(type, attrs = {}) {
        const elem = document.createElementNS('http://www.w3.org/2000/svg', type);
        for (const [key, val] of Object.entries(attrs)) {
            elem.setAttribute(key, String(val));
        }
        return elem;
    }

    /**
     * Renders the 0-indexed Heap Array representation
     * 
     * @param {HTMLElement} container 
     * @param {Array<Object>} heapArray 
     * @param {Function} [onSelectNode] 
     */
    renderHeapArray(container, heapArray, onSelectNode = null) {
        this._clearElement(container);

        if (!heapArray || heapArray.length === 0) {
            const emptyNotice = document.createElement('div');
            emptyNotice.className = 'empty-lab-notice';
            emptyNotice.textContent = 'Min-Heap is currently empty. Add tasks or use the test inputs below.';
            container.appendChild(emptyNotice);
            return;
        }

        const arrayGrid = document.createElement('div');
        arrayGrid.className = 'heap-array-grid';

        heapArray.forEach((task, index) => {
            const parentIdx = index > 0 ? Math.floor((index - 1) / 2) : null;
            const leftChild = 2 * index + 1 < heapArray.length ? 2 * index + 1 : null;
            const rightChild = 2 * index + 2 < heapArray.length ? 2 * index + 2 : null;

            const card = document.createElement('div');
            card.className = `heap-array-card ${this.selectedNodeIndex === index ? 'selected' : ''}`;
            card.setAttribute('tabindex', '0');
            card.setAttribute('role', 'button');
            card.setAttribute('aria-label', `Heap node at index ${index}: ${task.title}`);

            // Index Pill
            const indexHeader = document.createElement('div');
            indexHeader.className = 'heap-array-header';
            
            const indexPill = document.createElement('span');
            indexPill.className = 'heap-index-badge';
            indexPill.textContent = `[${index}]`;
            
            const scorePill = document.createElement('span');
            scorePill.className = 'heap-score-badge';
            scorePill.textContent = `Score: ${task.priorityScore}`;

            indexHeader.appendChild(indexPill);
            indexHeader.appendChild(scorePill);
            card.appendChild(indexHeader);

            // Title
            const titleElem = document.createElement('div');
            titleElem.className = 'heap-task-title';
            titleElem.textContent = task.title || `Task #${task.id}`;
            card.appendChild(titleElem);

            // Subject / Meta
            const metaElem = document.createElement('div');
            metaElem.className = 'heap-task-meta';
            metaElem.textContent = `${task.subject || 'General'} • Imp: ${task.importance}/5`;
            card.appendChild(metaElem);

            // Pointer tags: Parent, Left, Right
            const pointers = document.createElement('div');
            pointers.className = 'heap-pointers';
            
            const parentSpan = document.createElement('span');
            parentSpan.className = 'pointer-tag parent';
            parentSpan.textContent = parentIdx !== null ? `P:[${parentIdx}]` : 'Root';
            
            const leftSpan = document.createElement('span');
            leftSpan.className = 'pointer-tag child';
            leftSpan.textContent = leftChild !== null ? `L:[${leftChild}]` : 'L:—';

            const rightSpan = document.createElement('span');
            rightSpan.className = 'pointer-tag child';
            rightSpan.textContent = rightChild !== null ? `R:[${rightChild}]` : 'R:—';

            pointers.appendChild(parentSpan);
            pointers.appendChild(leftSpan);
            pointers.appendChild(rightSpan);
            card.appendChild(pointers);

            // Click listener
            card.addEventListener('click', () => {
                this.selectedNodeIndex = (this.selectedNodeIndex === index) ? null : index;
                if (typeof onSelectNode === 'function') {
                    onSelectNode(this.selectedNodeIndex);
                }
            });

            arrayGrid.appendChild(card);
        });

        container.appendChild(arrayGrid);
    }

    /**
     * Renders an interactive SVG Binary Tree representation of the Min-Heap
     * Calculates node positions based on binary tree levels and horizontal slots.
     * 
     * @param {HTMLElement} container 
     * @param {Array<Object>} heapArray 
     * @param {Function} [onSelectNode] 
     */
    renderHeapTree(container, heapArray, onSelectNode = null) {
        this._clearElement(container);

        if (!heapArray || heapArray.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-lab-notice';
            empty.textContent = 'No nodes to render. Min-Heap is empty.';
            container.appendChild(empty);
            return;
        }

        const n = heapArray.length;
        const maxLevel = Math.floor(Math.log2(n));
        const maxLeaves = Math.pow(2, maxLevel);

        // Calculate dynamic dimensions
        const nodeRadius = 26;
        const verticalSpacing = 75;
        const horizontalPadding = 40;
        const minWidth = Math.max(650, maxLeaves * 80 + horizontalPadding * 2);
        const svgHeight = (maxLevel + 1) * verticalSpacing + 60;
        const svgWidth = minWidth;

        const svg = this._createSvgElement('svg', {
            viewBox: `0 0 ${svgWidth} ${svgHeight}`,
            class: 'heap-tree-svg',
            width: '100%',
            height: svgHeight
        });

        // 1. Calculate positions (x, y) for each node index 0..n-1
        const nodePositions = [];
        for (let i = 0; i < n; i++) {
            const level = Math.floor(Math.log2(i + 1));
            const levelStartIndex = Math.pow(2, level) - 1;
            const slotIndex = i - levelStartIndex;
            const slotsAtLevel = Math.pow(2, level);

            // Compute proportional X spacing
            const slotWidth = svgWidth / slotsAtLevel;
            const x = slotWidth * (slotIndex + 0.5);
            const y = 45 + level * verticalSpacing;

            nodePositions.push({ x, y, index: i, task: heapArray[i] });
        }

        // 2. Draw connecting edges (parent to children)
        const edgesGroup = this._createSvgElement('g', { class: 'tree-edges' });
        for (let i = 0; i < n; i++) {
            const leftChild = 2 * i + 1;
            const rightChild = 2 * i + 2;
            const parentPos = nodePositions[i];

            if (leftChild < n) {
                const leftPos = nodePositions[leftChild];
                const line = this._createSvgElement('line', {
                    x1: parentPos.x,
                    y1: parentPos.y,
                    x2: leftPos.x,
                    y2: leftPos.y,
                    stroke: 'var(--border-color, #cbd5e1)',
                    'stroke-width': '2.5',
                    'stroke-linecap': 'round'
                });
                edgesGroup.appendChild(line);
            }

            if (rightChild < n) {
                const rightPos = nodePositions[rightChild];
                const line = this._createSvgElement('line', {
                    x1: parentPos.x,
                    y1: parentPos.y,
                    x2: rightPos.x,
                    y2: rightPos.y,
                    stroke: 'var(--border-color, #cbd5e1)',
                    'stroke-width': '2.5',
                    'stroke-linecap': 'round'
                });
                edgesGroup.appendChild(line);
            }
        }
        svg.appendChild(edgesGroup);

        // 3. Draw Nodes (circles, labels, score)
        const nodesGroup = this._createSvgElement('g', { class: 'tree-nodes' });

        nodePositions.forEach((pos) => {
            const isSelected = this.selectedNodeIndex === pos.index;
            const isRoot = pos.index === 0;

            const nodeG = this._createSvgElement('g', {
                class: `tree-node-group ${isSelected ? 'selected' : ''} ${isRoot ? 'root-node' : ''}`,
                transform: `translate(${pos.x}, ${pos.y})`,
                style: 'cursor: pointer;'
            });

            // Circle background
            const circle = this._createSvgElement('circle', {
                r: nodeRadius,
                fill: isRoot ? '#6366f1' : (isSelected ? '#8b5cf6' : '#ffffff'),
                stroke: isRoot ? '#4f46e5' : (isSelected ? '#7c3aed' : '#94a3b8'),
                'stroke-width': isSelected || isRoot ? '3' : '2',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
            });

            // Score Text (Primary)
            const scoreText = this._createSvgElement('text', {
                'text-anchor': 'middle',
                y: '-2',
                'font-size': '11',
                'font-weight': 'bold',
                fill: isRoot || isSelected ? '#ffffff' : '#1e293b'
            });
            scoreText.textContent = `${pos.task.priorityScore}`;

            // Index Text (Sub)
            const indexText = this._createSvgElement('text', {
                'text-anchor': 'middle',
                y: '12',
                'font-size': '9',
                'font-weight': '500',
                fill: isRoot || isSelected ? '#e0e7ff' : '#64748b'
            });
            indexText.textContent = `[${pos.index}]`;

            // Title snippet label below circle
            const titleLabel = this._createSvgElement('text', {
                'text-anchor': 'middle',
                y: nodeRadius + 14,
                'font-size': '10',
                'font-weight': '600',
                fill: 'var(--text-primary, #334155)',
                class: 'node-label-title'
            });
            const rawTitle = pos.task.title || `Node ${pos.index}`;
            titleLabel.textContent = rawTitle.length > 14 ? rawTitle.substring(0, 12) + '…' : rawTitle;

            // Tooltip title element for accessibility
            const svgTitle = this._createSvgElement('title');
            svgTitle.textContent = `Index [${pos.index}]\nTask: ${pos.task.title}\nSubject: ${pos.task.subject}\nScore: ${pos.task.priorityScore}\nImportance: ${pos.task.importance}/5\nDue: ${pos.task.dueDate}`;

            nodeG.appendChild(circle);
            nodeG.appendChild(scoreText);
            nodeG.appendChild(indexText);
            nodeG.appendChild(titleLabel);
            nodeG.appendChild(svgTitle);

            // Interaction
            nodeG.addEventListener('click', () => {
                this.selectedNodeIndex = (this.selectedNodeIndex === pos.index) ? null : pos.index;
                if (typeof onSelectNode === 'function') {
                    onSelectNode(this.selectedNodeIndex);
                }
            });

            nodesGroup.appendChild(nodeG);
        });

        svg.appendChild(nodesGroup);
        container.appendChild(svg);
    }

    /**
     * Renders recent operation logs with color-coded tags and explanations
     * 
     * @param {HTMLElement} container 
     * @param {Array<Object>} logs 
     */
    renderOperationLogs(container, logs) {
        this._clearElement(container);

        if (!logs || logs.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-lab-notice';
            empty.textContent = 'No heap operations recorded yet. Perform an Insert or ExtractMin to see step-by-step logs.';
            container.appendChild(empty);
            return;
        }

        const list = document.createElement('div');
        list.className = 'operation-log-list';

        logs.forEach(log => {
            const item = document.createElement('div');
            item.className = `operation-log-item log-${(log.action || '').toLowerCase().replace(/_/g, '-')}`;

            const header = document.createElement('div');
            header.className = 'log-item-header';

            const badge = document.createElement('span');
            badge.className = 'log-action-badge';
            badge.textContent = log.action;

            const time = document.createElement('span');
            time.className = 'log-timestamp';
            time.textContent = log.timestamp || '';

            header.appendChild(badge);
            header.appendChild(time);
            item.appendChild(header);

            const msg = document.createElement('p');
            msg.className = 'log-message';
            msg.textContent = log.message;
            item.appendChild(msg);

            list.appendChild(item);
        });

        container.appendChild(list);
    }

    /**
     * Renders Custom Hash Map structural inspector (buckets, load factor, collisions)
     * 
     * @param {HTMLElement} container 
     * @param {Object} data - From CustomHashMap.getInspectionData()
     */
    renderHashMapInspector(container, data) {
        this._clearElement(container);
        if (!data) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'hashmap-inspector';

        // 1. Stats Bar
        const statsBar = document.createElement('div');
        statsBar.className = 'hashmap-stats-bar';

        const createStat = (label, value, subtext = '') => {
            const box = document.createElement('div');
            box.className = 'hashmap-stat-box';

            const valElem = document.createElement('div');
            valElem.className = 'hashmap-stat-value';
            valElem.textContent = String(value);

            const lblElem = document.createElement('div');
            lblElem.className = 'hashmap-stat-label';
            lblElem.textContent = label;

            box.appendChild(valElem);
            box.appendChild(lblElem);
            if (subtext) {
                const sub = document.createElement('div');
                sub.className = 'hashmap-stat-sub';
                sub.textContent = subtext;
                box.appendChild(sub);
            }
            return box;
        };

        statsBar.appendChild(createStat('Entries (n)', data.size));
        statsBar.appendChild(createStat('Capacity (m)', data.capacity));
        statsBar.appendChild(createStat('Load Factor (α)', `${data.loadFactor}`, `Threshold: ${data.loadFactorThreshold}`));
        statsBar.appendChild(createStat('Collisions', data.totalCollisions));
        statsBar.appendChild(createStat('Resizes', data.resizeCount));
        statsBar.appendChild(createStat('Max Chain', data.maxChainLength));
        wrapper.appendChild(statsBar);

        // 2. Visual Load Factor Gauge
        const gaugeContainer = document.createElement('div');
        gaugeContainer.className = 'load-factor-gauge';

        const gaugeLabel = document.createElement('div');
        gaugeLabel.className = 'gauge-labels';
        gaugeLabel.innerHTML = `<span>Current Load: <strong>${Math.round(data.loadFactor * 100)}%</strong></span><span>Resize Trigger: <strong>${Math.round(data.loadFactorThreshold * 100)}%</strong></span>`;

        const progressBar = document.createElement('div');
        progressBar.className = 'gauge-track';

        const fill = document.createElement('div');
        fill.className = 'gauge-fill';
        const pct = Math.min(100, Math.round((data.loadFactor / data.loadFactorThreshold) * 100));
        fill.style.width = `${pct}%`;
        fill.style.backgroundColor = data.loadFactor >= data.loadFactorThreshold ? '#ef4444' : '#6366f1';

        progressBar.appendChild(fill);
        gaugeContainer.appendChild(gaugeLabel);
        gaugeContainer.appendChild(progressBar);
        wrapper.appendChild(gaugeContainer);

        // 3. Bucket Array with Separate Chaining
        const bucketsHeader = document.createElement('h4');
        bucketsHeader.className = 'hashmap-buckets-title';
        bucketsHeader.textContent = `Bucket Array Representation (${data.capacity} slots)`;
        wrapper.appendChild(bucketsHeader);

        const bucketGrid = document.createElement('div');
        bucketGrid.className = 'hashmap-buckets-grid';

        data.buckets.forEach(bucket => {
            const bucketCell = document.createElement('div');
            bucketCell.className = `bucket-slot ${bucket.chainLength > 1 ? 'has-collision' : (bucket.chainLength === 1 ? 'has-item' : 'is-empty')}`;

            const slotIndex = document.createElement('div');
            slotIndex.className = 'bucket-index';
            slotIndex.textContent = `[${bucket.index}]`;

            const chainInfo = document.createElement('div');
            chainInfo.className = 'bucket-chain';

            if (bucket.chainLength === 0) {
                const emptyBadge = document.createElement('span');
                emptyBadge.className = 'chain-empty';
                emptyBadge.textContent = 'null';
                chainInfo.appendChild(emptyBadge);
            } else {
                bucket.entries.forEach(entry => {
                    const nodeBadge = document.createElement('div');
                    nodeBadge.className = 'chain-node';

                    const keySpan = document.createElement('span');
                    keySpan.className = 'node-key';
                    keySpan.textContent = entry.key.length > 10 ? entry.key.substring(0, 8) + '…' : entry.key;

                    const arrowSpan = document.createElement('span');
                    arrowSpan.className = 'node-arrow';
                    arrowSpan.textContent = '→';

                    const valSpan = document.createElement('span');
                    valSpan.className = 'node-val';
                    valSpan.textContent = entry.summary.length > 12 ? entry.summary.substring(0, 10) + '…' : entry.summary;

                    nodeBadge.appendChild(keySpan);
                    nodeBadge.appendChild(arrowSpan);
                    nodeBadge.appendChild(valSpan);
                    chainInfo.appendChild(nodeBadge);
                });
            }

            bucketCell.appendChild(slotIndex);
            bucketCell.appendChild(chainInfo);
            bucketGrid.appendChild(bucketCell);
        });

        wrapper.appendChild(bucketGrid);
        container.appendChild(wrapper);
    }
}

// Make accessible to browser window
window.DsaVisualizer = DsaVisualizer;
