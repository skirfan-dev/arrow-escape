/**
 * Arrow Escape - Utils
 * Seeded Random, Shuffling, and math utilities.
 */

class Utils {
    constructor() {
        // Default seed
        this.seed = 123456789;
    }

    /**
     * Set the current seed for the random number generator
     * @param {number|string} s 
     */
    setSeed(s) {
        if (typeof s === 'string') {
            let hash = 0;
            for (let i = 0; i < s.length; i++) {
                hash = (hash << 5) - hash + s.charCodeAt(i);
                hash |= 0; // Convert to 32bit integer
            }
            this.seed = Math.abs(hash);
        } else {
            this.seed = Math.abs(s) || 123456789;
        }
    }

    /**
     * Mulberry32 generator for seeded pseudo-random numbers
     * Returns a float between 0 (inclusive) and 1 (exclusive)
     */
    random() {
        let t = this.seed += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    /**
     * Returns a random integer between min (inclusive) and max (inclusive) using seeded random
     */
    randomInt(min, max) {
        return Math.floor(this.random() * (max - min + 1)) + min;
    }

    /**
     * Choose a random item from an array using seeded random
     */
    randomChoice(array) {
        if (!array || array.length === 0) return null;
        const index = Math.floor(this.random() * array.length);
        return array[index];
    }

    /**
     * Shuffle an array in-place using seeded Fisher-Yates shuffle
     */
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(this.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    /**
     * Linear interpolation
     */
    lerp(start, end, amt) {
        return (1 - amt) * start + amt * end;
    }

    /**
     * Clamp a value between min and max
     */
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    /**
     * Generate a unique ID
     */
    generateId() {
        return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    /**
     * Format time in seconds to mm:ss
     */
    formatTime(seconds) {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    /**
     * Simple vibration wrapper
     * @param {number|number[]} pattern 
     */
    vibrate(pattern = 50) {
        if (navigator.vibrate) {
            try {
                navigator.vibrate(pattern);
            } catch (e) {
                // Ignore vibration errors if blocked by browser policies
            }
        }
    }
}

// Global utilities instance
const utils = new Utils();
window.utils = utils;
