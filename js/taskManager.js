/**
 * StudyFlow - Task Manager Business Logic Orchestrator
 * js/taskManager.js
 * 
 * Central controller linking:
 * - CustomHashMap (O(1) ID-based lookups and updates)
 * - BinaryMinHeap (O(log n) priority queue for smart next-task recommendation)
 * - MergeSort (O(n log n) stable sorting by deadline, priority, or importance)
 * - StorageManager (safe localStorage persistence)
 */

class TaskManager {
    constructor() {
        this.storage = window.StudyFlowStorage;
        this.hashMap = new window.CustomHashMap(16, 0.75);
        this.priorityQueue = new window.BinaryMinHeap();
        this.init();
    }

    /**
     * Initializes TaskManager, loads persisted tasks, populates Hash Map and Min-Heap
     */
    init() {
        const rawTasks = this.storage.loadTasks();
        this.hashMap.clear();

        if (Array.isArray(rawTasks) && rawTasks.length > 0) {
            for (let i = 0; i < rawTasks.length; i++) {
                const task = this._sanitizeTask(rawTasks[i]);
                this.hashMap.set(task.id, task);
            }
            this._syncPriorityQueue();
        }
    }

    /**
     * Normalizes and sanitizes task fields
     * @private
     */
    _sanitizeTask(task) {
        return {
            id: String(task.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`),
            title: String(task.title || '').trim(),
            description: String(task.description || '').trim(),
            subject: String(task.subject || 'General').trim(),
            dueDate: task.dueDate || new Date(Date.now() + 86400000).toISOString().slice(0, 16),
            importance: Math.min(5, Math.max(1, parseInt(task.importance, 10) || 3)),
            status: ['Pending', 'In Progress', 'Completed'].includes(task.status) ? task.status : 'Pending',
            createdAt: task.createdAt || new Date().toISOString(),
            updatedAt: task.updatedAt || new Date().toISOString(),
            priorityScore: window.BinaryMinHeap.calculateScore(task)
        };
    }

    /**
     * Synchronizes the Binary Min-Heap with all active (uncompleted) tasks
     * @private
     */
    _syncPriorityQueue() {
        const allTasks = this.hashMap.values();
        // Min-Heap prioritizes pending and in-progress tasks
        const activeTasks = allTasks.filter(t => t.status !== 'Completed');
        this.priorityQueue.rebuild(activeTasks);
    }

    /**
     * Persists all tasks currently in Hash Map to localStorage
     * @private
     */
    _persist() {
        const tasks = this.hashMap.values();
        this.storage.saveTasks(tasks);
    }

    /**
     * Generates a unique task ID
     * @returns {string}
     */
    generateId() {
        return `sf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }

    /**
     * Validates task creation/update input
     * @param {Object} input 
     * @returns {{isValid: boolean, errors: Array<string>}}
     */
    validateTaskInput(input) {
        const errors = [];
        if (!input.title || input.title.trim().length < 2) {
            errors.push('Task title must be at least 2 characters long.');
        }
        if (!input.subject || input.subject.trim().length === 0) {
            errors.push('Please select or specify an academic subject.');
        }
        if (!input.dueDate) {
            errors.push('A valid due date is required.');
        } else {
            const parsed = new Date(input.dueDate).getTime();
            if (isNaN(parsed)) {
                errors.push('The due date format is invalid.');
            }
        }
        const importance = parseInt(input.importance, 10);
        if (isNaN(importance) || importance < 1 || importance > 5) {
            errors.push('Importance level must be between 1 (Low) and 5 (Urgent).');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Creates a new academic task
     * @param {Object} taskData 
     * @returns {{success: boolean, task?: Object, error?: string}}
     */
    createTask(taskData) {
        const validation = this.validateTaskInput(taskData);
        if (!validation.isValid) {
            return { success: false, error: validation.errors.join(' ') };
        }

        const task = this._sanitizeTask({
            ...taskData,
            id: this.generateId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: taskData.status || 'Pending'
        });

        // 1. Store in Hash Map O(1)
        this.hashMap.set(task.id, task);

        // 2. Insert into Priority Queue O(log n) if active
        if (task.status !== 'Completed') {
            this.priorityQueue.insert(task);
        }

        // 3. Persist to storage
        this._persist();

        return { success: true, task };
    }

    /**
     * Updates an existing task
     * @param {string} id 
     * @param {Object} updates 
     * @returns {{success: boolean, task?: Object, error?: string}}
     */
    updateTask(id, updates) {
        const existing = this.hashMap.get(id);
        if (!existing) {
            return { success: false, error: `Task with ID "${id}" not found.` };
        }

        const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
        const validation = this.validateTaskInput(merged);
        if (!validation.isValid) {
            return { success: false, error: validation.errors.join(' ') };
        }

        const updatedTask = this._sanitizeTask(merged);

        // Update in Hash Map O(1)
        this.hashMap.set(id, updatedTask);

        // Rebuild priority queue to maintain strict invariants with new scores
        this._syncPriorityQueue();

        // Persist
        this._persist();

        return { success: true, task: updatedTask };
    }

    /**
     * Deletes a task by ID
     * @param {string} id 
     * @returns {boolean}
     */
    deleteTask(id) {
        if (!this.hashMap.has(id)) return false;

        this.hashMap.delete(id);
        this.priorityQueue.removeById(id);
        this._syncPriorityQueue();
        this._persist();
        return true;
    }

    /**
     * Toggles task status between Completed and Pending/In Progress
     * @param {string} id 
     * @returns {Object|null} The updated task
     */
    toggleTaskStatus(id) {
        const task = this.hashMap.get(id);
        if (!task) return null;

        if (task.status === 'Completed') {
            task.status = 'In Progress';
        } else {
            task.status = 'Completed';
        }
        task.updatedAt = new Date().toISOString();
        task.priorityScore = window.BinaryMinHeap.calculateScore(task);

        this.hashMap.set(id, task);
        this._syncPriorityQueue();
        this._persist();

        return task;
    }

    /**
     * Retrieves single task by ID in O(1) time using Custom Hash Map
     * @param {string} id 
     * @returns {Object|undefined}
     */
    getTask(id) {
        return this.hashMap.get(id);
    }

    /**
     * Retrieves all tasks
     * @returns {Array<Object>}
     */
    getAllTasks() {
        return this.hashMap.values();
    }

    /**
     * Returns the next recommended task to work on using the Min-Heap peek()
     * Time Complexity: O(1) peek
     * 
     * @returns {Object|null}
     */
    getNextRecommendedTask() {
        const top = this.priorityQueue.peek();
        if (!top) return null;

        // Fresh score calculation against current time
        const now = Date.now();
        const dueTime = new Date(top.dueDate).getTime();
        const hoursLeft = (dueTime - now) / (1000 * 60 * 60);

        let urgencyReason = '';
        if (hoursLeft < 0) {
            const overdueHours = Math.abs(Math.round(hoursLeft));
            urgencyReason = `Overdue by ${overdueHours} hour${overdueHours !== 1 ? 's' : ''}! Immediate action needed.`;
        } else if (hoursLeft <= 12) {
            urgencyReason = `Due very soon (${Math.max(1, Math.round(hoursLeft))}h remaining) with Level ${top.importance} Importance.`;
        } else if (hoursLeft <= 24) {
            urgencyReason = `Due within 24 hours (today/tomorrow). Highest priority score in queue.`;
        } else {
            urgencyReason = `Top prioritized academic task based on impending deadline and priority weight.`;
        }

        return {
            task: top,
            urgencyReason,
            hoursLeft: Number(hoursLeft.toFixed(1))
        };
    }

    /**
     * Filters and sorts tasks based on user search, category filters, and sorting criteria
     * Uses Custom Merge Sort for guaranteed O(n log n) sorting!
     * 
     * @param {Object} options 
     * @returns {Array<Object>}
     */
    getFilteredTasks(options = {}) {
        const {
            search = '',
            subject = 'all',
            status = 'all',
            importance = 'all',
            sortBy = 'deadline_asc'
        } = options;

        let list = this.hashMap.values();

        // 1. Text Search Filter (Title, Subject, Description)
        if (search.trim()) {
            const query = search.toLowerCase().trim();
            list = list.filter(t => 
                t.title.toLowerCase().includes(query) ||
                t.subject.toLowerCase().includes(query) ||
                t.description.toLowerCase().includes(query)
            );
        }

        // 2. Subject Filter
        if (subject && subject !== 'all') {
            list = list.filter(t => t.subject.toLowerCase() === subject.toLowerCase());
        }

        // 3. Status Filter
        if (status && status !== 'all') {
            list = list.filter(t => t.status === status);
        }

        // 4. Importance Filter
        if (importance && importance !== 'all') {
            const targetImp = parseInt(importance, 10);
            list = list.filter(t => t.importance === targetImp);
        }

        // 5. Select Comparator for Custom Merge Sort
        let comparator;
        switch (sortBy) {
            case 'deadline_desc':
                comparator = window.MergeSort.comparators.byDeadlineDesc;
                break;
            case 'priority_asc':
                comparator = window.MergeSort.comparators.byPriorityScoreAsc;
                break;
            case 'importance_desc':
                comparator = window.MergeSort.comparators.byImportanceDesc;
                break;
            case 'title_asc':
                comparator = window.MergeSort.comparators.byTitleAsc;
                break;
            case 'deadline_asc':
            default:
                comparator = window.MergeSort.comparators.byDeadlineAsc;
                break;
        }

        // Execute Custom Merge Sort strictly O(n log n)
        return window.MergeSort.sort(list, comparator);
    }

    /**
     * Calculates comprehensive dashboard statistics
     * @returns {Object}
     */
    getStats() {
        const allTasks = this.hashMap.values();
        const total = allTasks.length;
        const now = Date.now();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        let completed = 0;
        let pending = 0;
        let inProgress = 0;
        let overdue = 0;
        let dueToday = 0;

        for (let i = 0; i < allTasks.length; i++) {
            const t = allTasks[i];
            const dueTime = new Date(t.dueDate).getTime();

            if (t.status === 'Completed') {
                completed++;
            } else {
                if (t.status === 'In Progress') inProgress++;
                else pending++;

                if (dueTime < now) {
                    overdue++;
                } else if (dueTime >= todayStart.getTime() && dueTime <= todayEnd.getTime()) {
                    dueToday++;
                }
            }
        }

        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
            total,
            completed,
            pending,
            inProgress,
            activeCount: pending + inProgress,
            overdue,
            dueToday,
            completionRate
        };
    }

    /**
     * Gets tasks due today or urgent
     * @returns {Array<Object>}
     */
    getTodayTasks() {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime();
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime();

        const active = this.hashMap.values().filter(t => {
            const d = new Date(t.dueDate).getTime();
            // Include overdue or due today
            return t.status !== 'Completed' && (d <= end);
        });

        return window.MergeSort.sort(active, window.MergeSort.comparators.byPriorityScoreAsc);
    }

    /**
     * Returns list of unique subjects across all tasks
     * @returns {Array<string>}
     */
    getSubjects() {
        const set = {};
        const tasks = this.hashMap.values();
        for (let i = 0; i < tasks.length; i++) {
            if (tasks[i].subject) {
                set[tasks[i].subject] = true;
            }
        }
        return Object.keys(set).sort();
    }

    /**
     * Clears all tasks from memory and storage
     */
    clearAll() {
        this.hashMap.clear();
        this.priorityQueue.clear();
        this.storage.clearAllTasks();
    }

    /**
     * Preloads realistic college demo tasks
     */
    loadDemoData() {
        const now = Date.now();
        const hour = 3600 * 1000;
        const day = 24 * hour;

        const demoTasks = [
            {
                title: 'Operating Systems Lab 4 Submission',
                subject: 'Operating Systems',
                description: 'Implement Banker\'s Algorithm for Deadlock Avoidance and write analysis report.',
                dueDate: new Date(now - 3 * hour).toISOString().slice(0, 16), // Overdue by 3 hours
                importance: 5,
                status: 'Pending'
            },
            {
                title: 'Data Structures Problem Set 6: Heaps & HashMaps',
                subject: 'Data Structures',
                description: 'Solve LeetCode Top 20 Binary Heap problems and complete written proof of Master Theorem.',
                dueDate: new Date(now + 6 * hour).toISOString().slice(0, 16), // Due in 6 hours
                importance: 5,
                status: 'In Progress'
            },
            {
                title: 'Database Management Systems Mini-Project Proposal',
                subject: 'DBMS',
                description: 'Draft ER diagram and relational schemas for Hospital Management System.',
                dueDate: new Date(now + 18 * hour).toISOString().slice(0, 16), // Due tomorrow morning
                importance: 4,
                status: 'Pending'
            },
            {
                title: 'Computer Networks Mid-Term Quiz Preparation',
                subject: 'Computer Networks',
                description: 'Review OSI 7 layers, TCP 3-way handshake, subnetting, and sliding window protocols.',
                dueDate: new Date(now + 2 * day).toISOString().slice(0, 16), // Due in 2 days
                importance: 4,
                status: 'Pending'
            },
            {
                title: 'Discrete Mathematics Assignment 3: Graph Theory',
                subject: 'Mathematics',
                description: 'Prove Dijkstra\'s optimality and solve Eulerian and Hamiltonian path problems.',
                dueDate: new Date(now + 4 * day).toISOString().slice(0, 16),
                importance: 3,
                status: 'Pending'
            },
            {
                title: 'Web Technologies Frontend Responsive Redesign',
                subject: 'Web Technologies',
                description: 'Refactor student portal stylesheet using CSS Grid, Flexbox, and accessible contrast tokens.',
                dueDate: new Date(now + 6 * day).toISOString().slice(0, 16),
                importance: 2,
                status: 'Completed'
            },
            {
                title: 'Software Engineering Agile Sprint Review',
                subject: 'Software Engineering',
                description: 'Prepare sprint retrospective slides and burn-down chart for team project.',
                dueDate: new Date(now + 7 * day).toISOString().slice(0, 16),
                importance: 3,
                status: 'Completed'
            }
        ];

        this.clearAll();

        for (let i = 0; i < demoTasks.length; i++) {
            this.createTask(demoTasks[i]);
        }
    }
}

// Make accessible to browser window
window.TaskManager = TaskManager;
