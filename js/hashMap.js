/**
 * StudyFlow - Custom Hash Map Implementation
 * js/hashMap.js
 * 
 * A genuine Hash Table data structure built from scratch without using JS Map or Set.
 * Features:
 * - Collision resolution via Separate Chaining (buckets holding key-value entry lists).
 * - Polynomial rolling hash function with prime multiplier (31).
 * - Automatic dynamic resizing when load factor exceeds threshold (alpha >= 0.75).
 * - Re-hashing of all elements upon capacity change.
 * - Comprehensive inspection methods for educational and visualization purposes.
 */

class HashEntry {
    /**
     * @param {string} key 
     * @param {*} value 
     */
    constructor(key, value) {
        this.key = String(key);
        this.value = value;
    }
}

class CustomHashMap {
    /**
     * @param {number} initialCapacity - Must be positive integer (default: 16)
     * @param {number} loadFactorThreshold - Threshold to trigger resize (default: 0.75)
     */
    constructor(initialCapacity = 16, loadFactorThreshold = 0.75) {
        this.capacity = Math.max(4, Math.floor(initialCapacity));
        this.loadFactorThreshold = loadFactorThreshold;
        this.size = 0;
        // Allocate bucket array. Each bucket is an array of HashEntry objects (separate chaining)
        this.buckets = new Array(this.capacity).fill(null).map(() => []);
        // Metrics for inspection
        this.totalCollisions = 0;
        this.resizeCount = 0;
    }

    /**
     * Polynomial rolling hash function for strings
     * Formula: hash = (sum_{i=0}^{L-1} s[i] * 31^(L-1-i)) % capacity
     * Evaluated using Horner's rule to avoid arithmetic overflow.
     * 
     * @param {string} key 
     * @param {number} [customCapacity] - Optional custom capacity for calculation
     * @returns {number} Non-negative bucket index in [0, capacity - 1]
     */
    hash(key, customCapacity = this.capacity) {
        const str = String(key);
        let hashValue = 0;
        const PRIME = 31;
        
        for (let i = 0; i < str.length; i++) {
            // Keep computation within safe 32-bit integer range
            hashValue = (hashValue * PRIME + str.charCodeAt(i)) >>> 0;
        }
        return hashValue % customCapacity;
    }

    /**
     * Inserts or updates a key-value pair in the hash map.
     * Time Complexity: O(1) average, O(n) worst-case (if many collisions).
     * 
     * @param {string} key 
     * @param {*} value 
     * @returns {boolean} True if a new key was inserted, false if existing key was updated
     */
    set(key, value) {
        if (key === undefined || key === null) {
            throw new Error('CustomHashMap: Key cannot be undefined or null');
        }

        const strKey = String(key);
        const index = this.hash(strKey);
        const bucket = this.buckets[index];

        // Search for existing key in the bucket (chain)
        for (let i = 0; i < bucket.length; i++) {
            if (bucket[i].key === strKey) {
                // Key exists: update value in place
                bucket[i].value = value;
                return false;
            }
        }

        // Key does not exist: insert new entry
        if (bucket.length > 0) {
            this.totalCollisions++;
        }
        bucket.push(new HashEntry(strKey, value));
        this.size++;

        // Check if load factor exceeds threshold -> trigger dynamic resize
        if (this.getLoadFactor() >= this.loadFactorThreshold) {
            this.resize(this.capacity * 2);
        }

        return true;
    }

    /**
     * Retrieves the value associated with the specified key.
     * Time Complexity: O(1) average.
     * 
     * @param {string} key 
     * @returns {*|undefined} The value, or undefined if not found
     */
    get(key) {
        if (key === undefined || key === null) return undefined;
        const strKey = String(key);
        const index = this.hash(strKey);
        const bucket = this.buckets[index];

        for (let i = 0; i < bucket.length; i++) {
            if (bucket[i].key === strKey) {
                return bucket[i].value;
            }
        }
        return undefined;
    }

    /**
     * Checks if a key exists in the hash map.
     * @param {string} key 
     * @returns {boolean}
     */
    has(key) {
        return this.get(key) !== undefined;
    }

    /**
     * Deletes a key and its associated value.
     * Time Complexity: O(1) average.
     * 
     * @param {string} key 
     * @returns {boolean} True if key existed and was deleted, false otherwise
     */
    delete(key) {
        if (key === undefined || key === null) return false;
        const strKey = String(key);
        const index = this.hash(strKey);
        const bucket = this.buckets[index];

        for (let i = 0; i < bucket.length; i++) {
            if (bucket[i].key === strKey) {
                // Remove from bucket
                bucket.splice(i, 1);
                this.size--;
                return true;
            }
        }
        return false;
    }

    /**
     * Resizes the hash map to a new capacity and rehashes all existing entries.
     * Time Complexity: O(n + newCapacity)
     * 
     * @param {number} newCapacity 
     */
    resize(newCapacity) {
        const targetCapacity = Math.max(4, Math.floor(newCapacity));
        if (targetCapacity === this.capacity) return;

        const oldBuckets = this.buckets;
        this.capacity = targetCapacity;
        this.buckets = new Array(this.capacity).fill(null).map(() => []);
        this.size = 0;
        this.resizeCount++;

        // Rehash all entries into new buckets
        for (let b = 0; b < oldBuckets.length; b++) {
            const bucket = oldBuckets[b];
            for (let i = 0; i < bucket.length; i++) {
                const entry = bucket[i];
                this.set(entry.key, entry.value);
            }
        }
    }

    /**
     * Current load factor: alpha = size / capacity
     * @returns {number}
     */
    getLoadFactor() {
        return this.capacity > 0 ? (this.size / this.capacity) : 0;
    }

    /**
     * Returns an array of all keys
     * @returns {Array<string>}
     */
    keys() {
        const result = [];
        for (let b = 0; b < this.capacity; b++) {
            const bucket = this.buckets[b];
            for (let i = 0; i < bucket.length; i++) {
                result.push(bucket[i].key);
            }
        }
        return result;
    }

    /**
     * Returns an array of all values
     * @returns {Array<*>}
     */
    values() {
        const result = [];
        for (let b = 0; b < this.capacity; b++) {
            const bucket = this.buckets[b];
            for (let i = 0; i < bucket.length; i++) {
                result.push(bucket[i].value);
            }
        }
        return result;
    }

    /**
     * Returns an array of [key, value] pairs
     * @returns {Array<[string, *]>}
     */
    entries() {
        const result = [];
        for (let b = 0; b < this.capacity; b++) {
            const bucket = this.buckets[b];
            for (let i = 0; i < bucket.length; i++) {
                result.push([bucket[i].key, bucket[i].value]);
            }
        }
        return result;
    }

    /**
     * Clears all entries from the map
     */
    clear() {
        this.capacity = 16;
        this.size = 0;
        this.buckets = new Array(this.capacity).fill(null).map(() => []);
        this.totalCollisions = 0;
    }

    /**
     * Returns structural inspection data for DSA visualization
     * @returns {Object}
     */
    getInspectionData() {
        let occupiedBuckets = 0;
        let maxChainLength = 0;
        let activeCollisions = 0;
        const bucketDetails = this.buckets.map((bucket, index) => {
            if (bucket.length > 0) occupiedBuckets++;
            if (bucket.length > 1) activeCollisions += (bucket.length - 1);
            if (bucket.length > maxChainLength) maxChainLength = bucket.length;
            return {
                index,
                chainLength: bucket.length,
                entries: bucket.map(e => ({ key: e.key, summary: typeof e.value === 'object' && e.value ? (e.value.title || e.value.id) : String(e.value) }))
            };
        });

        return {
            capacity: this.capacity,
            size: this.size,
            loadFactor: Number(this.getLoadFactor().toFixed(3)),
            loadFactorThreshold: this.loadFactorThreshold,
            occupiedBuckets,
            emptyBuckets: this.capacity - occupiedBuckets,
            maxChainLength,
            resizeCount: this.resizeCount,
            totalCollisions: this.totalCollisions,
            activeCollisions,
            buckets: bucketDetails
        };
    }
}

// Make accessible to browser window
window.CustomHashMap = CustomHashMap;
