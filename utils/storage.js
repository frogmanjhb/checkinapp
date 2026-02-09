/**
 * localStorage Helper Functions
 * Provides loadJson and saveJson utilities for managing JSON data in localStorage
 */

/**
 * Load JSON from localStorage
 * @param {string} key - localStorage key
 * @param {*} fallback - Default value if key doesn't exist
 * @returns {*} Parsed JSON value or fallback
 */
function loadJson(key, fallback = null) {
    try {
        const item = localStorage.getItem(key);
        if (item === null) {
            return fallback;
        }
        return JSON.parse(item);
    } catch (error) {
        console.error(`Error loading ${key} from localStorage:`, error);
        return fallback;
    }
}

/**
 * Save JSON to localStorage
 * @param {string} key - localStorage key
 * @param {*} value - Value to save (will be JSON stringified)
 */
function saveJson(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error saving ${key} to localStorage:`, error);
        // Handle quota exceeded error
        if (error.name === 'QuotaExceededError') {
            console.warn('localStorage quota exceeded. Consider cleaning up old data.');
        }
    }
}

/**
 * Remove item from localStorage
 * @param {string} key - localStorage key to remove
 */
function removeJson(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error(`Error removing ${key} from localStorage:`, error);
    }
}

/**
 * Clear all flagging-related data from localStorage
 */
function clearFlaggingData() {
    removeJson('journalFlags');
    removeJson('flagEvents');
}

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadJson,
        saveJson,
        removeJson,
        clearFlaggingData
    };
}
