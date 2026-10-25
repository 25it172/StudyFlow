/**
 * StudyFlow - Custom Merge Sort Algorithm
 * js/sorting.js
 * 
 * A pure divide-and-conquer Merge Sort algorithm with O(n log n) time complexity.
 * Implemented strictly without Array.prototype.sort().
 * 
 * Complexity & Theory:
 * 1. Divide: Split array of size n into two halves of size floor(n/2) and ceil(n/2) -> O(1).
 * 2. Conquer: Recursively sort each subarray -> 2 * T(n / 2).
 * 3. Combine: Merge the two sorted subarrays in linear time -> O(n).
 * 
 * Recurrence Relation:
 * T(n) = 2 * T(n / 2) + O(n), with T(1) = O(1).
 * By Master Theorem (Case 2: a = 2, b = 2, d = 1 where a = b^d):
 * T(n) = Theta(n log n) in all cases (best, average, worst).
 * 
 * Stability:
 * When two items have identical comparator keys, the item from the left subarray is chosen first (<=),
 * ensuring that Merge Sort is strictly STABLE (preserves user-defined tie ordering).
 */

class MergeSort {
    /**
     * Recursively sorts an array using Merge Sort.
     * 
     * @param {Array} array - Input array (does not mutate original)
     * @param {Function} comparator - Function(a, b) returning < 0, 0, or > 0
     * @param {Object} [tracer] - Optional trace collector for DSA educational lab
     * @returns {Array} Sorted array
     */
    static sort(array, comparator = MergeSort.comparators.byDeadlineAsc, tracer = null) {
        if (!Array.isArray(array)) return [];
        if (array.length <= 1) return [...array];

        return MergeSort._divideAndConquer([...array], comparator, tracer, 0, 'root');
    }

    /**
     * Internal recursive divide-and-conquer function
     * @private
     */
    static _divideAndConquer(arr, comparator, tracer, depth, branch) {
        if (arr.length <= 1) {
            return arr;
        }

        const mid = Math.floor(arr.length / 2);
        const leftHalf = arr.slice(0, mid);
        const rightHalf = arr.slice(mid);

        if (tracer && typeof tracer.recordSplit === 'function') {
            tracer.recordSplit(depth, branch, leftHalf, rightHalf);
        }

        const sortedLeft = MergeSort._divideAndConquer(leftHalf, comparator, tracer, depth + 1, 'left');
        const sortedRight = MergeSort._divideAndConquer(rightHalf, comparator, tracer, depth + 1, 'right');

        const merged = MergeSort._merge(sortedLeft, sortedRight, comparator);

        if (tracer && typeof tracer.recordMerge === 'function') {
            tracer.recordMerge(depth, branch, sortedLeft, sortedRight, merged);
        }

        return merged;
    }

    /**
     * Merges two sorted subarrays into a single sorted array.
     * Time Complexity: O(n) where n = left.length + right.length.
     * 
     * @private
     * @param {Array} left 
     * @param {Array} right 
     * @param {Function} comparator 
     * @returns {Array}
     */
    static _merge(left, right, comparator) {
        const result = [];
        let leftIdx = 0;
        let rightIdx = 0;

        while (leftIdx < left.length && rightIdx < right.length) {
            // Using <= 0 guarantees stability: if equal, left element takes precedence
            if (comparator(left[leftIdx], right[rightIdx]) <= 0) {
                result.push(left[leftIdx]);
                leftIdx++;
            } else {
                result.push(right[rightIdx]);
                rightIdx++;
            }
        }

        // Concatenate remaining elements
        while (leftIdx < left.length) {
            result.push(left[leftIdx]);
            leftIdx++;
        }

        while (rightIdx < right.length) {
            result.push(right[rightIdx]);
            rightIdx++;
        }

        return result;
    }

    /**
     * Pre-defined task comparators for StudyFlow
     */
    static comparators = {
        /**
         * Earliest deadline first (Ascending)
         */
        byDeadlineAsc: (a, b) => {
            const timeA = new Date(a.dueDate).getTime();
            const timeB = new Date(b.dueDate).getTime();
            if (timeA !== timeB) return timeA - timeB;
            return (Number(b.importance) || 0) - (Number(a.importance) || 0);
        },

        /**
         * Latest deadline first (Descending)
         */
        byDeadlineDesc: (a, b) => {
            const timeA = new Date(a.dueDate).getTime();
            const timeB = new Date(b.dueDate).getTime();
            return timeB - timeA;
        },

        /**
         * Priority score ascending (Most urgent first)
         */
        byPriorityScoreAsc: (a, b) => {
            const scoreA = a.priorityScore !== undefined ? a.priorityScore : 0;
            const scoreB = b.priorityScore !== undefined ? b.priorityScore : 0;
            return scoreA - scoreB;
        },

        /**
         * Highest importance first (5 down to 1)
         */
        byImportanceDesc: (a, b) => {
            const impA = Number(a.importance) || 3;
            const impB = Number(b.importance) || 3;
            if (impB !== impA) return impB - impA;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        },

        /**
         * Alphabetical by Title
         */
        byTitleAsc: (a, b) => {
            return String(a.title || '').localeCompare(String(b.title || ''));
        }
    };
}

// Make accessible to browser window
window.MergeSort = MergeSort;
