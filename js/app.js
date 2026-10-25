/**
 * StudyFlow — Main Application Controller & UI View Manager
 * js/app.js
 * 
 * Orchestrates views, user interactions, modals, filtering, sorting,
 * DSA Lab visualizations, and theme management.
 * 
 * Safe DOM rendering: ZERO innerHTML used for unsanitized user content.
 */

(function () {
    'use strict';

    // Application State & Controller Singletons
    const taskManager = new window.TaskManager();
    const visualizer = new window.DsaVisualizer();
    const storage = window.StudyFlowStorage;

    // Active View & Filter State
    let currentView = 'dashboard';
    let activeFilterOptions = {
        search: '',
        subject: 'all',
        status: 'all',
        importance: 'all',
        sortBy: 'deadline_asc'
    };
    let pendingConfirmAction = null;

    // DOM Elements Cache
    const dom = {
        // Navigation
        sidebar: document.getElementById('sidebar'),
        mobileMenuToggle: document.getElementById('mobile-menu-toggle'),
        navLinks: document.querySelectorAll('.nav-link'),
        views: document.querySelectorAll('.view-section'),
        sidebarTaskCount: document.getElementById('sidebar-task-count'),
        themeToggleBtn: document.getElementById('theme-toggle-btn'),
        themeIcon: document.getElementById('theme-icon'),
        globalSearchInput: document.getElementById('global-search-input'),
        btnQuickAdd: document.getElementById('btn-quick-add'),
        btnLoadDemo: document.getElementById('btn-load-demo'),

        // Dashboard View
        statTotal: document.getElementById('stat-total'),
        statPending: document.getElementById('stat-pending'),
        statOverdue: document.getElementById('stat-overdue'),
        statCompleted: document.getElementById('stat-completed'),
        statProgress: document.getElementById('stat-progress'),
        statProgressBar: document.getElementById('stat-progress-bar'),
        heroCard: document.getElementById('recommendation-hero-card'),
        heroTitle: document.getElementById('hero-task-title'),
        heroReason: document.getElementById('hero-task-reason'),
        heroSubject: document.getElementById('hero-task-subject'),
        heroDue: document.getElementById('hero-task-due'),
        heroPriority: document.getElementById('hero-task-priority'),
        heroBtnComplete: document.getElementById('hero-btn-complete'),
        dashboardTodayList: document.getElementById('dashboard-today-list'),
        dashboardUpcomingList: document.getElementById('dashboard-upcoming-list'),
        todayTasksCount: document.getElementById('today-tasks-count'),
        upcomingTasksCount: document.getElementById('upcoming-tasks-count'),

        // All Tasks View
        btnTasksAdd: document.getElementById('btn-tasks-add'),
        btnClearAll: document.getElementById('btn-clear-all'),
        filterSubject: document.getElementById('filter-subject'),
        filterStatus: document.getElementById('filter-status'),
        filterImportance: document.getElementById('filter-importance'),
        sortBy: document.getElementById('sort-by'),
        tasksListContainer: document.getElementById('tasks-list-container'),

        // DSA Lab View
        labExtractMin: document.getElementById('lab-extract-min'),
        labPeek: document.getElementById('lab-peek'),
        labRebuild: document.getElementById('lab-rebuild'),
        labBtnInsert: document.getElementById('lab-btn-insert'),
        labInsertTitle: document.getElementById('lab-insert-title'),
        labInsertImportance: document.getElementById('lab-insert-importance'),
        heapTreeView: document.getElementById('heap-tree-view'),
        heapArrayView: document.getElementById('heap-array-view'),
        heapLogsView: document.getElementById('heap-logs-view'),
        hashmapInspectionView: document.getElementById('hashmap-inspection-view'),
        hashCalcInput: document.getElementById('hash-calc-input'),
        hashCalcBtn: document.getElementById('hash-calc-btn'),
        hashCalcResult: document.getElementById('hash-calc-result'),

        // Viva Guide View
        vivaQaContainer: document.getElementById('viva-qa-container'),

        // Modals
        taskModal: document.getElementById('task-modal'),
        taskModalTitle: document.getElementById('task-modal-title'),
        taskModalClose: document.getElementById('task-modal-close'),
        taskModalCancel: document.getElementById('task-modal-cancel'),
        taskForm: document.getElementById('task-form'),
        formTaskId: document.getElementById('form-task-id'),
        formTitle: document.getElementById('form-title'),
        formSubject: document.getElementById('form-subject'),
        formDueDate: document.getElementById('form-due-date'),
        formImportanceRadios: document.querySelectorAll('input[name="form-importance"]'),
        formStatus: document.getElementById('form-status'),
        formDescription: document.getElementById('form-description'),
        formScorePreview: document.getElementById('form-score-preview'),

        confirmModal: document.getElementById('confirm-modal'),
        confirmModalTitle: document.getElementById('confirm-modal-title'),
        confirmModalMessage: document.getElementById('confirm-modal-message'),
        confirmModalClose: document.getElementById('confirm-modal-close'),
        confirmModalCancel: document.getElementById('confirm-modal-cancel'),
        confirmModalProceed: document.getElementById('confirm-modal-proceed'),

        toastContainer: document.getElementById('toast-container')
    };

    /**
     * Helpers for local date-time handling
     */
    function formatLocalDateTimeForInput(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const mins = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${mins}`;
    }

    function formatDisplayDate(dateString) {
        if (!dateString) return 'No deadline';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return 'Invalid date';

        const now = new Date();
        const diffMs = d.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        const formatted = d.toLocaleDateString(undefined, options);

        if (diffHours < 0) {
            const overdueHrs = Math.abs(Math.round(diffHours));
            return {
                text: `${formatted} (Overdue by ${overdueHrs}h)`,
                class: 'deadline-overdue',
                isOverdue: true
            };
        } else if (diffHours <= 24) {
            const hrs = Math.max(1, Math.round(diffHours));
            return {
                text: `${formatted} (In ${hrs}h)`,
                class: 'deadline-urgent',
                isOverdue: false
            };
        }
        return {
            text: formatted,
            class: 'deadline-normal',
            isOverdue: false
        };
    }

    /**
     * Toast notification system
     */
    function showToast(message, type = 'info', duration = 3500) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const content = document.createElement('div');
        content.style.display = 'flex';
        content.style.alignItems = 'center';
        content.style.gap = '0.5rem';

        const iconSpan = document.createElement('span');
        iconSpan.textContent = icons[type] || 'ℹ️';
        const msgSpan = document.createElement('span');
        msgSpan.textContent = message;

        content.appendChild(iconSpan);
        content.appendChild(msgSpan);
        toast.appendChild(content);

        dom.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }

    /**
     * Theme Management
     */
    function initTheme() {
        const settings = storage.loadSettings();
        const preferredTheme = settings.theme || 'light';
        applyTheme(preferredTheme);
    }

    function applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            dom.themeIcon.textContent = '☀️';
        } else {
            document.documentElement.removeAttribute('data-theme');
            dom.themeIcon.textContent = '🌙';
        }
        const settings = storage.loadSettings();
        settings.theme = theme;
        storage.saveSettings(settings);
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const nextTheme = current === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
    }

    /**
     * Navigation Switcher
     */
    function switchView(viewName) {
        currentView = viewName;
        if (window.location.hash.replace('#', '') !== viewName) {
            window.location.hash = viewName;
        }

        dom.navLinks.forEach(link => {
            const target = link.getAttribute('data-view');
            if (target === viewName) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        dom.views.forEach(section => {
            if (section.id === `view-${viewName}`) {
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }
        });

        // Close mobile drawer if open
        dom.sidebar.classList.remove('open');

        // Render target view content
        renderCurrentView();
    }

    function renderCurrentView() {
        updateSidebarBadges();
        if (currentView === 'dashboard') {
            renderDashboard();
        } else if (currentView === 'tasks') {
            renderTasksList();
        } else if (currentView === 'dsa-lab') {
            renderDsaLab();
        } else if (currentView === 'viva-guide') {
            renderVivaGuide();
        }
    }

    function updateSidebarBadges() {
        const stats = taskManager.getStats();
        dom.sidebarTaskCount.textContent = String(stats.total);
    }

    /**
     * Dashboard View Rendering
     */
    function renderDashboard() {
        const stats = taskManager.getStats();

        // 1. Stat Cards
        dom.statTotal.textContent = String(stats.total);
        dom.statPending.textContent = String(stats.activeCount);
        dom.statOverdue.textContent = String(stats.overdue);
        dom.statCompleted.textContent = String(stats.completed);
        dom.statProgress.textContent = `${stats.completionRate}%`;
        dom.statProgressBar.style.width = `${stats.completionRate}%`;

        // 2. Next Recommended Task Hero
        const nextRecommendation = taskManager.getNextRecommendedTask();
        if (nextRecommendation && nextRecommendation.task) {
            const task = nextRecommendation.task;
            const deadlineInfo = formatDisplayDate(task.dueDate);

            dom.heroTitle.textContent = task.title;
            dom.heroReason.textContent = nextRecommendation.urgencyReason;
            dom.heroSubject.textContent = `Subject: ${task.subject}`;
            dom.heroDue.textContent = `Due: ${deadlineInfo.text}`;
            dom.heroPriority.textContent = `Min-Heap Score: ${task.priorityScore}`;
            dom.heroBtnComplete.style.display = 'inline-flex';
            dom.heroBtnComplete.onclick = () => {
                taskManager.toggleTaskStatus(task.id);
                showToast(`Marked "${task.title}" as completed!`, 'success');
                renderDashboard();
            };
        } else {
            dom.heroTitle.textContent = 'All caught up! 🎉';
            dom.heroReason.textContent = 'No active tasks in your queue. Click "+ New Task" or explore the DSA Lab.';
            dom.heroSubject.textContent = 'Queue Status: Empty';
            dom.heroDue.textContent = 'Relax or review ahead';
            dom.heroPriority.textContent = 'Score: N/A';
            dom.heroBtnComplete.style.display = 'none';
        }

        // 3. Today's Tasks List
        const todayTasks = taskManager.getTodayTasks();
        dom.todayTasksCount.textContent = String(todayTasks.length);
        renderSimpleTaskList(dom.dashboardTodayList, todayTasks, 'No urgent or pending tasks scheduled for today.');

        // 4. Upcoming Deadlines (Merge Sorted)
        const upcomingTasks = taskManager.getFilteredTasks({
            status: 'all',
            sortBy: 'deadline_asc'
        }).filter(t => t.status !== 'Completed').slice(0, 5);

        dom.upcomingTasksCount.textContent = String(upcomingTasks.length);
        renderSimpleTaskList(dom.dashboardUpcomingList, upcomingTasks, 'No upcoming deadlines found.');
    }

    /**
     * Helper to render compact task rows in dashboard panels
     */
    function renderSimpleTaskList(container, tasks, emptyMsg) {
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        if (tasks.length === 0) {
            const emptyP = document.createElement('p');
            emptyP.style.color = 'var(--text-muted)';
            emptyP.style.fontSize = '0.88rem';
            emptyP.style.padding = '1rem 0';
            emptyP.textContent = emptyMsg;
            container.appendChild(emptyP);
            return;
        }

        const listWrap = document.createElement('div');
        listWrap.style.display = 'flex';
        listWrap.style.flexDirection = 'column';
        listWrap.style.gap = '0.65rem';

        tasks.forEach(task => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.justifyContent = 'space-between';
            row.style.padding = '0.65rem 0.85rem';
            row.style.borderRadius = 'var(--radius-md)';
            row.style.backgroundColor = 'var(--bg-surface)';
            row.style.border = '1px solid var(--border-color)';
            row.style.fontSize = '0.85rem';

            const left = document.createElement('div');
            left.style.display = 'flex';
            left.style.alignItems = 'center';
            left.style.gap = '0.6rem';
            left.style.flex = '1';
            left.style.minWidth = '0';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = task.status === 'Completed';
            checkbox.style.cursor = 'pointer';
            checkbox.addEventListener('change', () => {
                taskManager.toggleTaskStatus(task.id);
                showToast(`Task status updated!`, 'info');
                renderDashboard();
            });

            const textWrap = document.createElement('div');
            textWrap.style.overflow = 'hidden';
            textWrap.style.textOverflow = 'ellipsis';
            textWrap.style.whiteSpace = 'nowrap';

            const title = document.createElement('div');
            title.style.fontWeight = '600';
            title.style.color = 'var(--text-primary)';
            title.textContent = task.title;

            const sub = document.createElement('div');
            sub.style.fontSize = '0.75rem';
            sub.style.color = 'var(--text-muted)';
            const dl = formatDisplayDate(task.dueDate);
            sub.textContent = `${task.subject} • ${dl.text}`;

            textWrap.appendChild(title);
            textWrap.appendChild(sub);
            left.appendChild(checkbox);
            left.appendChild(textWrap);

            const score = document.createElement('span');
            score.className = 'priority-score-badge';
            score.textContent = `Score: ${task.priorityScore}`;

            row.appendChild(left);
            row.appendChild(score);
            listWrap.appendChild(row);
        });

        container.appendChild(listWrap);
    }

    /**
     * All Tasks View Rendering
     */
    function renderTasksList() {
        populateSubjectDropdown();

        const filtered = taskManager.getFilteredTasks(activeFilterOptions);
        const container = dom.tasksListContainer;

        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        if (filtered.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.style.gridColumn = '1 / -1';

            const icon = document.createElement('div');
            icon.className = 'empty-icon';
            icon.textContent = '🔍';

            const title = document.createElement('h3');
            title.className = 'empty-title';
            title.textContent = 'No tasks match your criteria';

            const sub = document.createElement('p');
            sub.className = 'empty-subtitle';
            sub.textContent = 'Try adjusting your search query, subject filter, or status selection.';

            const addBtn = document.createElement('button');
            addBtn.className = 'btn btn-primary';
            addBtn.textContent = '＋ Create Task';
            addBtn.addEventListener('click', () => openTaskModal());

            emptyState.appendChild(icon);
            emptyState.appendChild(title);
            emptyState.appendChild(sub);
            emptyState.appendChild(addBtn);
            container.appendChild(emptyState);
            return;
        }

        filtered.forEach(task => {
            const card = document.createElement('div');
            card.className = `task-card status-${(task.status || 'pending').toLowerCase().replace(' ', '-')}`;
            
            const deadlineInfo = formatDisplayDate(task.dueDate);
            if (deadlineInfo.isOverdue && task.status !== 'Completed') {
                card.classList.add('is-overdue');
            }

            // Header: Subject, Importance, Score
            const header = document.createElement('div');
            header.className = 'task-card-header';

            const badges = document.createElement('div');
            badges.className = 'task-badges';

            const subjectBadge = document.createElement('span');
            subjectBadge.className = 'subject-badge';
            subjectBadge.textContent = task.subject || 'General';

            const impBadge = document.createElement('span');
            impBadge.className = `importance-badge importance-${task.importance}`;
            impBadge.textContent = `Imp ${task.importance}/5`;

            const scoreBadge = document.createElement('span');
            scoreBadge.className = 'priority-score-badge';
            scoreBadge.textContent = `Score: ${task.priorityScore}`;

            badges.appendChild(subjectBadge);
            badges.appendChild(impBadge);
            badges.appendChild(scoreBadge);
            header.appendChild(badges);
            card.appendChild(header);

            // Title
            const titleElem = document.createElement('h3');
            titleElem.className = 'task-card-title';
            titleElem.textContent = task.title;
            card.appendChild(titleElem);

            // Description
            if (task.description) {
                const descElem = document.createElement('p');
                descElem.className = 'task-card-desc';
                descElem.textContent = task.description;
                card.appendChild(descElem);
            }

            // Footer
            const footer = document.createElement('div');
            footer.className = 'task-card-footer';

            const deadlineElem = document.createElement('div');
            deadlineElem.className = `task-deadline ${deadlineInfo.class}`;
            deadlineElem.textContent = `📅 ${deadlineInfo.text}`;

            const actions = document.createElement('div');
            actions.className = 'task-actions';

            // Complete button
            const toggleBtn = document.createElement('button');
            toggleBtn.className = `task-action-btn btn-toggle ${task.status === 'Completed' ? 'completed' : ''}`;
            toggleBtn.textContent = task.status === 'Completed' ? 'Completed ✓' : 'Mark Done';
            toggleBtn.addEventListener('click', () => {
                taskManager.toggleTaskStatus(task.id);
                showToast(`Task status toggled.`, 'info');
                renderTasksList();
            });

            // Edit button
            const editBtn = document.createElement('button');
            editBtn.className = 'task-action-btn';
            editBtn.textContent = '✏️ Edit';
            editBtn.addEventListener('click', () => openTaskModal(task.id));

            // Delete button
            const delBtn = document.createElement('button');
            delBtn.className = 'task-action-btn btn-del';
            delBtn.textContent = '🗑️';
            delBtn.title = 'Delete Task';
            delBtn.addEventListener('click', () => {
                openConfirmModal(
                    'Delete Task',
                    `Are you sure you want to permanently delete "${task.title}"?`,
                    () => {
                        taskManager.deleteTask(task.id);
                        showToast(`Deleted task "${task.title}".`, 'info');
                        renderTasksList();
                    }
                );
            });

            actions.appendChild(toggleBtn);
            actions.appendChild(editBtn);
            actions.appendChild(delBtn);

            footer.appendChild(deadlineElem);
            footer.appendChild(actions);
            card.appendChild(footer);

            container.appendChild(card);
        });
    }

    function populateSubjectDropdown() {
        const subjects = taskManager.getSubjects();
        const select = dom.filterSubject;
        const currentVal = select.value;

        // Clear existing options except 'all'
        while (select.options.length > 1) {
            select.remove(1);
        }

        subjects.forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub;
            opt.textContent = sub;
            select.appendChild(opt);
        });

        if (subjects.includes(currentVal)) {
            select.value = currentVal;
        } else {
            select.value = 'all';
        }
    }

    /**
     * DSA Lab View Rendering
     */
    function renderDsaLab() {
        const heapArray = taskManager.priorityQueue.toArray();

        // 1. Render Interactive Tree
        visualizer.renderHeapTree(dom.heapTreeView, heapArray, (selectedIndex) => {
            // Callback when node is clicked
            visualizer.renderHeapArray(dom.heapArrayView, heapArray);
        });

        // 2. Render 0-Indexed Array
        visualizer.renderHeapArray(dom.heapArrayView, heapArray, (selectedIndex) => {
            visualizer.renderHeapTree(dom.heapTreeView, heapArray);
        });

        // 3. Render Operation Logs
        const logs = taskManager.priorityQueue.getLogs();
        visualizer.renderOperationLogs(dom.heapLogsView, logs);

        // 4. Render Hash Map Inspector
        const hashmapStats = taskManager.hashMap.getInspectionData();
        visualizer.renderHashMapInspector(dom.hashmapInspectionView, hashmapStats);
    }

    /**
     * Viva Guide View Rendering
     */
    function renderVivaGuide() {
        const container = dom.vivaQaContainer;
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        const vivaQuestions = [
            {
                q: "1. Why use a Binary Min-Heap instead of a sorted array for the task priority queue?",
                a: "A sorted array requires O(n) time for insertion because existing elements must be shifted. A Binary Min-Heap provides O(log n) insertion and O(log n) extraction, while maintaining O(1) peek at the root. Furthermore, Floyd's bottom-up heap construction allows rebuilding the entire heap in O(n) time rather than O(n log n) for sorting."
            },
            {
                q: "2. How does StudyFlow calculate the deterministic priority score?",
                a: "Score = Hours Remaining + (5 - Importance) * 12 + Overdue Penalty. Smaller score means higher urgency. Overdue tasks have negative hours remaining and an extra penalty multiplier. If two tasks have identical scores, deterministic tie-breaking evaluates: (1) earlier due date, (2) higher importance, and (3) unique task ID."
            },
            {
                q: "3. How does the custom Hash Map handle collisions and why is separate chaining used?",
                a: "Separate chaining stores collisions in linked bucket lists. It guarantees graceful degradation even when multiple keys hash to the same bucket. Unlike open addressing (linear/quadratic probing), separate chaining does not suffer from primary clustering and handles deletions cleanly without needing dummy tombstone markers."
            },
            {
                q: "4. Why is the prime number 31 chosen for the polynomial rolling hash function?",
                a: "In the polynomial hash formula sum(s[i] * 31^(L-1-i)), 31 is an odd prime. Multiplication by 31 can be optimized by compilers/JIT as (x << 5) - x. Its primality distributes string prefixes and suffixes uniformly across hash buckets, drastically minimizing hash clustering."
            },
            {
                q: "5. When does the custom Hash Map dynamically resize, and what is its time complexity?",
                a: "When the load factor alpha = (size / capacity) reaches or exceeds 0.75. The capacity is doubled, and all entries are rehashed into the new bucket array. Resizing takes O(n + m) time, but because it happens infrequently, the amortized cost per insertion remains O(1)."
            },
            {
                q: "6. Why is Merge Sort preferred over QuickSort for sorting academic tasks by deadline?",
                a: "Merge Sort is strictly STABLE, meaning tasks with identical deadlines preserve their relative secondary order. Furthermore, Merge Sort guarantees Theta(n log n) worst-case time complexity, whereas standard QuickSort can degrade to O(n^2) when dealing with pre-sorted or repeated deadlines."
            },
            {
                q: "7. Prove the time complexity of Merge Sort using the Master Theorem.",
                a: "The divide-and-conquer recurrence is T(n) = 2*T(n/2) + O(n). Here a = 2, b = 2, and f(n) = O(n^1). log_b(a) = log_2(2) = 1. Since f(n) = Theta(n^(log_b(a))), Case 2 of the Master Theorem applies, yielding T(n) = Theta(n log n)."
            },
            {
                q: "8. How does Floyd's bottom-up heapify achieve O(n) construction instead of O(n log n)?",
                a: "Bottom-up heapify starts at the last non-leaf node (index floor(n/2) - 1) and calls heapifyDown downwards. Most nodes in a binary tree reside near the bottom (leaves have height 0 and do 0 swaps). Summing nodes at height h times h yields a convergent arithmetic-geometric series whose sum is strictly bounded by 2n, making the total work O(n)."
            },
            {
                q: "9. How does StudyFlow prevent timezone bugs when handling task deadlines?",
                a: "Instead of naive UTC ISO string slices which shift dates across timezones, StudyFlow extracts the local year, month, date, hours, and minutes from the browser's Date object. Input pickers and deadline comparisons consistently operate on local epoch milliseconds."
            },
            {
                q: "10. How is XSS (Cross-Site Scripting) prevented throughout the UI?",
                a: "StudyFlow never uses innerHTML with user-supplied content. All task titles, descriptions, and subjects are inserted into the DOM strictly via textContent or by creating text nodes and setting verified attributes, completely eliminating injection vulnerabilities."
            }
        ];

        const card = document.createElement('div');
        card.className = 'dsa-section-card';

        const header = document.createElement('div');
        header.className = 'dsa-section-header';
        const title = document.createElement('div');
        title.className = 'dsa-title';
        title.textContent = '🎓 Viva Voce Oral Examination Questions & Model Answers';
        header.appendChild(title);
        card.appendChild(header);

        const list = document.createElement('div');
        list.style.display = 'flex';
        list.style.flexDirection = 'column';
        list.style.gap = '1rem';

        vivaQuestions.forEach((item, idx) => {
            const qWrap = document.createElement('div');
            qWrap.style.padding = '1rem';
            qWrap.style.borderRadius = 'var(--radius-md)';
            qWrap.style.backgroundColor = 'var(--bg-surface)';
            qWrap.style.border = '1px solid var(--border-color)';

            const qTitle = document.createElement('h4');
            qTitle.style.fontSize = '0.98rem';
            qTitle.style.fontWeight = '700';
            qTitle.style.color = 'var(--primary)';
            qTitle.style.marginBottom = '0.4rem';
            qTitle.textContent = item.q;

            const aText = document.createElement('p');
            aText.style.fontSize = '0.88rem';
            aText.style.color = 'var(--text-secondary)';
            aText.style.lineHeight = '1.5';
            aText.textContent = item.a;

            qWrap.appendChild(qTitle);
            qWrap.appendChild(aText);
            list.appendChild(qWrap);
        });

        card.appendChild(list);
        container.appendChild(card);
    }

    /**
     * Modals Management
     */
    function openTaskModal(taskId = null) {
        dom.taskForm.reset();

        if (taskId) {
            const task = taskManager.getTask(taskId);
            if (!task) {
                showToast('Task not found.', 'error');
                return;
            }
            dom.taskModalTitle.textContent = 'Edit Academic Task';
            dom.formTaskId.value = task.id;
            dom.formTitle.value = task.title;
            dom.formSubject.value = task.subject;
            dom.formDueDate.value = task.dueDate;
            dom.formStatus.value = task.status;
            dom.formDescription.value = task.description || '';

            dom.formImportanceRadios.forEach(radio => {
                radio.checked = parseInt(radio.value, 10) === parseInt(task.importance, 10);
            });
        } else {
            dom.taskModalTitle.textContent = 'Add Academic Task';
            dom.formTaskId.value = '';
            // Default due date: tomorrow same time
            const tomorrow = new Date(Date.now() + 86400000);
            dom.formDueDate.value = formatLocalDateTimeForInput(tomorrow);
            dom.formStatus.value = 'Pending';
            dom.formImportanceRadios.forEach(radio => {
                radio.checked = radio.value === '3';
            });
        }

        updateLiveScorePreview();
        dom.taskModal.classList.add('active');
        dom.formTitle.focus();
    }

    function closeTaskModal() {
        dom.taskModal.classList.remove('active');
    }

    function updateLiveScorePreview() {
        const dueDate = dom.formDueDate.value;
        let selectedImp = 3;
        dom.formImportanceRadios.forEach(r => {
            if (r.checked) selectedImp = parseInt(r.value, 10);
        });
        const status = dom.formStatus.value;

        const simulatedTask = {
            dueDate,
            importance: selectedImp,
            status
        };

        const score = window.BinaryMinHeap.calculateScore(simulatedTask);
        dom.formScorePreview.textContent = isFinite(score) ? String(score) : 'N/A';
    }

    function handleTaskFormSubmit(e) {
        e.preventDefault();

        const id = dom.formTaskId.value;
        let importance = 3;
        dom.formImportanceRadios.forEach(r => {
            if (r.checked) importance = parseInt(r.value, 10);
        });

        const taskData = {
            title: dom.formTitle.value,
            subject: dom.formSubject.value,
            dueDate: dom.formDueDate.value,
            importance,
            status: dom.formStatus.value,
            description: dom.formDescription.value
        };

        if (id) {
            // Update
            const res = taskManager.updateTask(id, taskData);
            if (res.success) {
                showToast(`Updated "${res.task.title}" successfully!`, 'success');
                closeTaskModal();
                renderCurrentView();
            } else {
                showToast(res.error || 'Failed to update task.', 'error');
            }
        } else {
            // Create
            const res = taskManager.createTask(taskData);
            if (res.success) {
                showToast(`Created task "${res.task.title}"!`, 'success');
                closeTaskModal();
                renderCurrentView();
            } else {
                showToast(res.error || 'Failed to create task.', 'error');
            }
        }
    }

    function openConfirmModal(title, message, onProceed) {
        dom.confirmModalTitle.textContent = title;
        dom.confirmModalMessage.textContent = message;
        pendingConfirmAction = onProceed;
        dom.confirmModal.classList.add('active');
    }

    function closeConfirmModal() {
        dom.confirmModal.classList.remove('active');
        pendingConfirmAction = null;
    }

    /**
     * Event Listeners Setup
     */
    function setupEventListeners() {
        // Navigation links
        dom.navLinks.forEach(link => {
            link.addEventListener('click', () => {
                const view = link.getAttribute('data-view');
                if (view) switchView(view);
            });
        });

        // Mobile drawer toggle
        dom.mobileMenuToggle.addEventListener('click', () => {
            dom.sidebar.classList.toggle('open');
        });

        // Theme toggle
        dom.themeToggleBtn.addEventListener('click', toggleTheme);

        // Global search
        let debounceTimer;
        dom.globalSearchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                activeFilterOptions.search = e.target.value;
                if (currentView !== 'tasks') {
                    switchView('tasks');
                } else {
                    renderTasksList();
                }
            }, 250);
        });

        // Quick add & Demo data buttons
        dom.btnQuickAdd.addEventListener('click', () => openTaskModal());
        dom.btnTasksAdd.addEventListener('click', () => openTaskModal());
        dom.btnLoadDemo.addEventListener('click', () => {
            taskManager.loadDemoData();
            showToast('Loaded demo college tasks with priority scores.', 'success');
            renderCurrentView();
        });

        // Filters in All Tasks View
        dom.filterSubject.addEventListener('change', (e) => {
            activeFilterOptions.subject = e.target.value;
            renderTasksList();
        });

        dom.filterStatus.addEventListener('change', (e) => {
            activeFilterOptions.status = e.target.value;
            renderTasksList();
        });

        dom.filterImportance.addEventListener('change', (e) => {
            activeFilterOptions.importance = e.target.value;
            renderTasksList();
        });

        dom.sortBy.addEventListener('change', (e) => {
            activeFilterOptions.sortBy = e.target.value;
            renderTasksList();
        });

        dom.btnClearAll.addEventListener('click', () => {
            openConfirmModal(
                'Clear All Tasks',
                'Are you sure you want to delete all tasks? This will empty the Hash Map, Min-Heap, and local storage.',
                () => {
                    taskManager.clearAll();
                    showToast('All tasks cleared.', 'warning');
                    renderCurrentView();
                }
            );
        });

        // Modals events
        dom.taskModalClose.addEventListener('click', closeTaskModal);
        dom.taskModalCancel.addEventListener('click', closeTaskModal);
        dom.taskForm.addEventListener('submit', handleTaskFormSubmit);

        dom.formDueDate.addEventListener('input', updateLiveScorePreview);
        dom.formImportanceRadios.forEach(r => r.addEventListener('change', updateLiveScorePreview));
        dom.formStatus.addEventListener('change', updateLiveScorePreview);

        dom.confirmModalClose.addEventListener('click', closeConfirmModal);
        dom.confirmModalCancel.addEventListener('click', closeConfirmModal);
        dom.confirmModalProceed.addEventListener('click', () => {
            if (typeof pendingConfirmAction === 'function') {
                pendingConfirmAction();
            }
            closeConfirmModal();
        });

        // Keyboard navigation (Escape key closes modals)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeTaskModal();
                closeConfirmModal();
            }
        });

        // DSA Lab Controls
        dom.labExtractMin.addEventListener('click', () => {
            const extracted = taskManager.priorityQueue.extractMin();
            if (extracted) {
                showToast(`Extracted Root: "${extracted.title}" (Score: ${extracted.priorityScore})`, 'warning');
            } else {
                showToast('Min-Heap is currently empty.', 'info');
            }
            renderDsaLab();
        });

        dom.labPeek.addEventListener('click', () => {
            const root = taskManager.priorityQueue.peek();
            if (root) {
                showToast(`Root Node: "${root.title}" | Score: ${root.priorityScore} | Imp: ${root.importance}/5`, 'info', 4500);
            } else {
                showToast('Min-Heap is empty.', 'info');
            }
        });

        dom.labRebuild.addEventListener('click', () => {
            const allActive = taskManager.hashMap.values().filter(t => t.status !== 'Completed');
            taskManager.priorityQueue.rebuild(allActive);
            showToast('Rebuilt Min-Heap via O(n) Floyd bottom-up algorithm.', 'success');
            renderDsaLab();
        });

        dom.labBtnInsert.addEventListener('click', () => {
            const title = dom.labInsertTitle.value.trim() || `Test Task #${Math.floor(Math.random() * 900 + 100)}`;
            const importance = parseInt(dom.labInsertImportance.value, 10) || 3;
            const due = new Date(Date.now() + (Math.floor(Math.random() * 48) - 12) * 3600000).toISOString().slice(0, 16);

            const testTask = {
                id: `test_${Date.now()}`,
                title,
                subject: 'Lab Simulation',
                dueDate: due,
                importance,
                status: 'Pending'
            };

            taskManager.priorityQueue.insert(testTask);
            dom.labInsertTitle.value = '';
            showToast(`Inserted test node "${title}" into Min-Heap.`, 'success');
            renderDsaLab();
        });

        // Polynomial Hash Calculator
        dom.hashCalcBtn.addEventListener('click', () => {
            const key = dom.hashCalcInput.value.trim() || 'studyflow';
            const cap = taskManager.hashMap.capacity;
            const bucketIdx = taskManager.hashMap.hash(key, cap);
            dom.hashCalcResult.textContent = `Key: "${key}" ➔ Hash: ${bucketIdx} (in [0..${cap - 1}])`;
        });
    }

    /**
     * Application Bootstrap
     */
    function init() {
        initTheme();
        setupEventListeners();

        // Check if fresh install: pre-populate demo data if completely empty
        if (taskManager.getAllTasks().length === 0) {
            taskManager.loadDemoData();
        }

        // Hash change listener for browser navigation
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.replace('#', '');
            if (['dashboard', 'tasks', 'dsa-lab', 'viva-guide'].includes(hash) && hash !== currentView) {
                switchView(hash);
            }
        });

        const initialHash = window.location.hash.replace('#', '');
        if (['dashboard', 'tasks', 'dsa-lab', 'viva-guide'].includes(initialHash)) {
            switchView(initialHash);
        } else {
            switchView('dashboard');
        }
    }

    // Launch application once DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
