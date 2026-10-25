/**
 * StudyFlow - Safe LocalStorage Utility
 * js/storage.js
 * 
 * Provides safe abstraction over browser localStorage with JSON serialization,
 * error handling (e.g. quota limits or private browsing mode), and fallback memory store.
 */

class StorageManager {
    constructor() {
        this.TASKS_KEY = 'studyflow_tasks_v1';
        this.SETTINGS_KEY = 'studyflow_settings_v1';
        this.isLocalStorageAvailable = this._checkStorageAvailability();
        this._memoryFallback = {};
    }

    /**
     * Tests if localStorage is available and functional in current environment
     * @private
     * @returns {boolean}
     */
    _checkStorageAvailability() {
        try {
            const testKey = '__sf_test__';
            window.localStorage.setItem(testKey, testKey);
            window.localStorage.removeItem(testKey);
            return true;
        } catch (e) {
            console.warn('LocalStorage unavailable or disabled. Using memory fallback.', e);
            return false;
        }
    }

    /**
     * Safely reads an item by key
     * @param {string} key 
     * @param {*} defaultValue 
     * @returns {*}
     */
    getItem(key, defaultValue = null) {
        if (!this.isLocalStorageAvailable) {
            return this._memoryFallback.hasOwnProperty(key) ? this._memoryFallback[key] : defaultValue;
        }
        try {
            const raw = window.localStorage.getItem(key);
            if (raw === null || raw === undefined) return defaultValue;
            return JSON.parse(raw);
        } catch (err) {
            console.error(`Error parsing item '${key}' from storage:`, err);
            return defaultValue;
        }
    }

    /**
     * Safely sets an item by key
     * @param {string} key 
     * @param {*} value 
     * @returns {boolean} True if successfully stored
     */
    setItem(key, value) {
        if (!this.isLocalStorageAvailable) {
            this._memoryFallback[key] = value;
            return true;
        }
        try {
            const serialized = JSON.stringify(value);
            window.localStorage.setItem(key, serialized);
            return true;
        } catch (err) {
            console.error(`Error saving item '${key}' to storage:`, err);
            this._memoryFallback[key] = value;
            return false;
        }
    }

    /**
     * Removes an item by key
     * @param {string} key 
     */
    removeItem(key) {
        if (!this.isLocalStorageAvailable) {
            delete this._memoryFallback[key];
            return;
        }
        try {
            window.localStorage.removeItem(key);
        } catch (err) {
            console.error(`Error removing item '${key}' from storage:`, err);
        }
    }

    /**
     * Load persisted tasks array
     * @returns {Array<Object>}
     */
    loadTasks() {
        return this.getItem(this.TASKS_KEY, []);
    }

    /**
     * Save tasks array
     * @param {Array<Object>} tasks 
     * @returns {boolean}
     */
    saveTasks(tasks) {
        return this.setItem(this.TASKS_KEY, tasks);
    }

    /**
     * Load application settings (theme, default sort, etc.)
     * @returns {Object}
     */
    loadSettings() {
        return this.getItem(this.SETTINGS_KEY, {
            theme: 'light',
            defaultSort: 'deadline_asc',
            sidebarCollapsed: false
        });
    }

    /**
     * Save application settings
     * @param {Object} settings 
     * @returns {boolean}
     */
    saveSettings(settings) {
        return this.setItem(this.SETTINGS_KEY, settings);
    }

    /**
     * Clears all StudyFlow task data
     */
    clearAllTasks() {
        this.removeItem(this.TASKS_KEY);
    }
}

// Global singleton instance for StudyFlow
window.StudyFlowStorage = new StorageManager();
