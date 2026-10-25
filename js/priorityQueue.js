/**
 * StudyFlow - Binary Min-Heap Priority Queue
 * js/priorityQueue.js
 * 
 * A genuine 0-indexed Binary Min-Heap Priority Queue.
 * Array Mapping:
 * - Parent index of i: Math.floor((i - 1) / 2)
 * - Left child index of i: 2 * i + 1
 * - Right child index of i: 2 * i + 2
 * 
 * Priority Score Design:
 * - In a Min-Heap, the root is always the item with the MINIMUM priority score.
 * - Therefore: SMALLER SCORE = HIGHER URGENCY / MUST BE DONE FIRST.
 * 
 * Score Formula:
 * - H = (dueDateTimestamp - nowTimestamp) in hours.
 * - Importance I in [1, 5] (1=Low, 5=Urgent).
 * - Importance penalty = (5 - I) * 12 hours.
 * - Overdue penalty: If H < 0, penalty = H * 2.5 (negative value, driving score lower).
 * - Final Score = H + (5 - I) * 12 + (H < 0 ? H * 2.5 : 0).
 * - Completed tasks receive +1,000,000 (least priority).
 * 
 * Deterministic Tie-Breaking:
 * 1. Priority score (smaller wins)
 * 2. Due date timestamp (earlier wins)
 * 3. Importance (higher wins)
 * 4. Unique ID string (lexicographical)
 */

class BinaryMinHeap {
    constructor() {
        this.heap = []; // 0-indexed array storing task objects
        this.operationLogs = []; // Records operations for the DSA Lab visualizer
    }

    /**
     * Clear all elements and reset logs
     */
    clear() {
        this.heap = [];
        this.operationLogs = [];
    }

    /**
     * Number of elements in the heap
     * @returns {number}
     */
    size() {
        return this.heap.length;
    }

    /**
     * Checks if heap is empty
     * @returns {boolean}
     */
    isEmpty() {
        return this.heap.length === 0;
    }

    /**
     * Logs operation step for DSA Lab
     * @private
     */
    _log(action, message, details = {}) {
        this.operationLogs.unshift({
            timestamp: new Date().toLocaleTimeString(),
            action,
            message,
            heapState: this.heap.map(t => ({ id: t.id, title: t.title, score: t.priorityScore })),
            ...details
        });
        if (this.operationLogs.length > 50) {
            this.operationLogs.pop();
        }
    }

    /**
     * Computes the deterministic priority score for a task.
     * Smaller score = higher urgency.
     * 
     * @param {Object} task 
     * @param {number} [referenceTime] - Optional reference timestamp in ms (defaults to Date.now())
     * @returns {number}
     */
    static calculateScore(task, referenceTime = Date.now()) {
        if (!task) return Infinity;
        if (task.status === 'Completed') return 1000000;

        const dueMs = new Date(task.dueDate).getTime();
        if (isNaN(dueMs)) return 500000; // Fallback if invalid date

        const hoursRemaining = (dueMs - referenceTime) / (1000 * 60 * 60);
        const importance = Number(task.importance) || 3;
        
        // Higher importance reduces score (makes it more urgent)
        const importanceFactor = (5 - importance) * 12;

        // Overdue tasks (hoursRemaining < 0) get an aggressive negative boost
        const overduePenalty = hoursRemaining < 0 ? (hoursRemaining * 2.5) : 0;

        const rawScore = hoursRemaining + importanceFactor + overduePenalty;
        return Number(rawScore.toFixed(2));
    }

    /**
     * Deterministic Comparator:
     * Returns < 0 if a should come before b (a has higher priority / smaller score).
     * Returns > 0 if b should come before a.
     * Returns 0 if identical.
     * 
     * @param {Object} a 
     * @param {Object} b 
     * @returns {number}
     */
    compare(a, b) {
        const scoreA = (a.priorityScore !== undefined) ? a.priorityScore : BinaryMinHeap.calculateScore(a);
        const scoreB = (b.priorityScore !== undefined) ? b.priorityScore : BinaryMinHeap.calculateScore(b);

        // 1. Primary: Priority Score (smaller score = more urgent)
        if (Math.abs(scoreA - scoreB) > 0.001) {
            return scoreA - scoreB;
        }

        // 2. Tie-break: Earlier Due Date
        const dueA = new Date(a.dueDate).getTime();
        const dueB = new Date(b.dueDate).getTime();
        if (dueA !== dueB) {
            return dueA - dueB;
        }

        // 3. Tie-break: Higher Importance (5 > 4 > 3...)
        const impA = Number(a.importance) || 3;
        const impB = Number(b.importance) || 3;
        if (impA !== impB) {
            return impB - impA;
        }

        // 4. Deterministic final tie-break: Task ID string
        return String(a.id || '').localeCompare(String(b.id || ''));
    }

    /**
     * Returns the root element without removing it.
     * Time Complexity: O(1)
     * 
     * @returns {Object|null}
     */
    peek() {
        if (this.isEmpty()) return null;
        return this.heap[0];
    }

    /**
     * Inserts a new task into the heap and restores min-heap order via heapifyUp.
     * Time Complexity: O(log n)
     * 
     * @param {Object} task 
     */
    insert(task) {
        if (!task || !task.id) {
            throw new Error('BinaryMinHeap: Invalid task object provided for insertion.');
        }

        // Ensure priority score is cached on task
        const item = { ...task };
        if (item.priorityScore === undefined) {
            item.priorityScore = BinaryMinHeap.calculateScore(item);
        }

        // Append to the end of the heap array
        this.heap.push(item);
        const insertIndex = this.heap.length - 1;

        this._log('INSERT', `Inserted task "${item.title}" at index ${insertIndex} with priority score ${item.priorityScore}.`, {
            task: item,
            index: insertIndex
        });

        // Bubble up to restore heap invariant
        this.heapifyUp(insertIndex);
    }

    /**
     * Extracts and returns the minimum element (root) from the heap.
     * Time Complexity: O(log n)
     * 
     * @returns {Object|null}
     */
    extractMin() {
        if (this.isEmpty()) return null;

        const minItem = this.heap[0];
        const lastItem = this.heap.pop();

        if (this.heap.length > 0) {
            // Move last element to root and sift down
            this.heap[0] = lastItem;
            this._log('EXTRACT_MIN', `Extracted root "${minItem.title}" (Score: ${minItem.priorityScore}). Moved "${lastItem.title}" to root for heapifyDown.`, {
                extracted: minItem
            });
            this.heapifyDown(0);
        } else {
            this._log('EXTRACT_MIN', `Extracted final remaining task "${minItem.title}". Heap is now empty.`, {
                extracted: minItem
            });
        }

        return minItem;
    }

    /**
     * Restores min-heap invariant upwards from given index.
     * Time Complexity: O(log n)
     * 
     * @param {number} index 
     */
    heapifyUp(index) {
        let currentIndex = index;

        while (currentIndex > 0) {
            const parentIndex = Math.floor((currentIndex - 1) / 2);
            const currentItem = this.heap[currentIndex];
            const parentItem = this.heap[parentIndex];

            // If current has higher priority (smaller score / tie-break) than parent, swap
            if (this.compare(currentItem, parentItem) < 0) {
                this._log('HEAPIFY_UP_SWAP', `Swapping child index ${currentIndex} ("${currentItem.title}", score: ${currentItem.priorityScore}) with parent index ${parentIndex} ("${parentItem.title}", score: ${parentItem.priorityScore}).`);
                
                // Swap in array
                this.heap[currentIndex] = parentItem;
                this.heap[parentIndex] = currentItem;
                currentIndex = parentIndex;
            } else {
                // Heap invariant satisfied
                break;
            }
        }
    }

    /**
     * Restores min-heap invariant downwards from given index.
     * Time Complexity: O(log n)
     * 
     * @param {number} index 
     */
    heapifyDown(index) {
        let currentIndex = index;
        const length = this.heap.length;

        while (true) {
            let smallestIndex = currentIndex;
            const leftChildIndex = 2 * currentIndex + 1;
            const rightChildIndex = 2 * currentIndex + 2;

            // Compare with left child
            if (leftChildIndex < length && this.compare(this.heap[leftChildIndex], this.heap[smallestIndex]) < 0) {
                smallestIndex = leftChildIndex;
            }

            // Compare with right child
            if (rightChildIndex < length && this.compare(this.heap[rightChildIndex], this.heap[smallestIndex]) < 0) {
                smallestIndex = rightChildIndex;
            }

            // If smallest is not current, swap and continue sifting down
            if (smallestIndex !== currentIndex) {
                const currentItem = this.heap[currentIndex];
                const smallestChild = this.heap[smallestIndex];

                this._log('HEAPIFY_DOWN_SWAP', `Sifting down: swapping index ${currentIndex} ("${currentItem.title}") with smaller child index ${smallestIndex} ("${smallestChild.title}").`);

                this.heap[currentIndex] = smallestChild;
                this.heap[smallestIndex] = currentItem;
                currentIndex = smallestIndex;
            } else {
                // Invariant satisfied
                break;
            }
        }
    }

    /**
     * Removes an item by its unique ID.
     * Time Complexity: O(n) to find, O(log n) to restore heap invariant.
     * 
     * @param {string} id 
     * @returns {boolean} True if removed
     */
    removeById(id) {
        const targetIndex = this.heap.findIndex(task => String(task.id) === String(id));
        if (targetIndex === -1) return false;

        const removedItem = this.heap[targetIndex];
        const lastItem = this.heap.pop();

        if (targetIndex < this.heap.length) {
            // Target was not the last element
            this.heap[targetIndex] = lastItem;
            
            // Check whether we need to heapify up or down
            const parentIndex = Math.floor((targetIndex - 1) / 2);
            if (targetIndex > 0 && this.compare(this.heap[targetIndex], this.heap[parentIndex]) < 0) {
                this.heapifyUp(targetIndex);
            } else {
                this.heapifyDown(targetIndex);
            }
        }

        this._log('REMOVE_BY_ID', `Removed task "${removedItem.title}" (ID: ${id}) from heap.`, {
            removed: removedItem
        });
        return true;
    }

    /**
     * Rebuilds the entire heap from an array of tasks.
     * Uses Floyd's Bottom-Up Heap Construction algorithm running in O(n) time.
     * 
     * @param {Array<Object>} tasks 
     */
    rebuild(tasks) {
        this.heap = [];
        const referenceTime = Date.now();

        // Recalculate priority scores and populate raw array
        for (let i = 0; i < tasks.length; i++) {
            const item = { ...tasks[i] };
            item.priorityScore = BinaryMinHeap.calculateScore(item, referenceTime);
            this.heap.push(item);
        }

        // Bottom-up heapify: start from the last non-leaf node down to the root
        // Last non-leaf index is Math.floor(heap.length / 2) - 1
        const startIdx = Math.floor(this.heap.length / 2) - 1;
        for (let i = startIdx; i >= 0; i--) {
            this.heapifyDown(i);
        }

        this._log('REBUILD', `Rebuilt heap with ${this.heap.length} tasks using O(n) bottom-up heapify.`);
    }

    /**
     * Returns a shallow copy of the underlying heap array
     * @returns {Array<Object>}
     */
    toArray() {
        return [...this.heap];
    }

    /**
     * Generates a hierarchical tree structure representation for visualization
     * @returns {Object|null}
     */
    toTreeStructure() {
        if (this.isEmpty()) return null;

        const buildNode = (index) => {
            if (index >= this.heap.length) return null;
            const task = this.heap[index];
            return {
                index,
                id: task.id,
                title: task.title,
                subject: task.subject,
                priorityScore: task.priorityScore,
                importance: task.importance,
                dueDate: task.dueDate,
                status: task.status,
                left: buildNode(2 * index + 1),
                right: buildNode(2 * index + 2)
            };
        };

        return buildNode(0);
    }

    /**
     * Returns recent operation logs
     * @returns {Array<Object>}
     */
    getLogs() {
        return [...this.operationLogs];
    }
}

// Make accessible to browser window
window.BinaryMinHeap = BinaryMinHeap;
