/**
 * Arrow Escape - Levels Config
 * Defines preset levels and manages procedural seed mapping.
 */

class LevelsManager {
    constructor() {
        this.TOTAL_CLASSIC_LEVELS = 1000;
    }

    /**
     * Get the seed for a classic level
     */
    getClassicSeed(levelNum) {
        // We use a mathematical string seed that guarantees deterministic results
        return `classic_level_seed_v1_${levelNum}`;
    }

    /**
     * Get the seed for the Daily Challenge
     * @param {string} dateStr Format: "YYYY-MM-DD"
     */
    getDailySeed(dateStr) {
        return `daily_challenge_seed_v1_${dateStr}`;
    }

    /**
     * Get the current date in YYYY-MM-DD format
     */
    getCurrentDateString() {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Get a level based on date
     * Difficulty is determined by day of the month or day of the week
     */
    getDailyLevel() {
        const dateStr = this.getCurrentDateString();
        const d = new Date();
        const day = d.getDate(); // 1 - 31
        
        // Map day to a medium/hard level for interesting daily challenge
        // Say, level 40 + (day * 3) -> levels ranging from 43 to 133
        const levelNum = 40 + (day * 3);
        const seed = this.getDailySeed(dateStr);
        
        return generator.generateLevel(levelNum, seed);
    }
}

const levels = new LevelsManager();
window.levels = levels;
