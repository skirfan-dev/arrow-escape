/**
 * Arrow Escape - Storage Manager
 * Controls saving and loading to LocalStorage
 */

class StorageManager {
    constructor() {
        this.PREFIX = "arrow_escape_";
        this.initDefaultData();
    }

    /**
     * Set up default data structures if they don't exist yet
     */
    initDefaultData() {
        if (!localStorage.getItem(this.PREFIX + "settings")) {
            this.saveSettings({
                music: true,
                sound: true,
                vibration: true,
                theme: "dark", // 'dark', 'light', 'high_contrast'
                language: "en",
                reducedMotion: false
            });
        }

        if (!localStorage.getItem(this.PREFIX + "progress")) {
            this.saveProgress({
                classicLevel: 1, // Current level in classic mode
                completedLevels: {}, // { levelNum: true }
                dailyCompleted: {}, // { "YYYY-MM-DD": true }
                infiniteHighscore: 0,
                timedHighscore: 0
            });
        }

        if (!localStorage.getItem(this.PREFIX + "stats")) {
            this.saveStats({
                gamesPlayed: 0,
                gamesWon: 0,
                totalSolveTime: 0, // In seconds
                fastestSolve: {}, // { "level_size": seconds }
                currentStreak: 0,
                longestStreak: 0,
                hintsUsed: 0,
                undoCount: 0,
                dailyStreak: 0,
                lastDailyDate: ""
            });
        }

        if (!localStorage.getItem(this.PREFIX + "achievements")) {
            this.saveAchievements({
                first_win: { unlocked: false, progress: 0, max: 1 },
                wins_10: { unlocked: false, progress: 0, max: 10 },
                wins_100: { unlocked: false, progress: 0, max: 100 },
                wins_1000: { unlocked: false, progress: 0, max: 1000 },
                no_hint: { unlocked: false, progress: 0, max: 1 }, // Won a level without hints
                no_undo: { unlocked: false, progress: 0, max: 1 }, // Won a level without undo
                speed_runner: { unlocked: false, progress: 0, max: 1 }, // Solve level in under 15 seconds
                puzzle_master: { unlocked: false, progress: 0, max: 1 } // Solve level > 100
            });
        }
    }

    /**
     * Settings
     */
    getSettings() {
        return JSON.parse(localStorage.getItem(this.PREFIX + "settings"));
    }

    saveSettings(settings) {
        localStorage.setItem(this.PREFIX + "settings", JSON.stringify(settings));
    }

    /**
     * Progress
     */
    getProgress() {
        return JSON.parse(localStorage.getItem(this.PREFIX + "progress"));
    }

    saveProgress(progress) {
        localStorage.setItem(this.PREFIX + "progress", JSON.stringify(progress));
    }

    /**
     * Player Stats
     */
    getStats() {
        return JSON.parse(localStorage.getItem(this.PREFIX + "stats"));
    }

    saveStats(stats) {
        localStorage.setItem(this.PREFIX + "stats", JSON.stringify(stats));
    }

    /**
     * Achievements
     */
    getAchievements() {
        return JSON.parse(localStorage.getItem(this.PREFIX + "achievements"));
    }

    saveAchievements(achievements) {
        localStorage.setItem(this.PREFIX + "achievements", JSON.stringify(achievements));
    }

    /**
     * Save Current Game State (Auto-Save)
     */
    saveActiveGame(gameState) {
        if (gameState) {
            localStorage.setItem(this.PREFIX + "active_game", JSON.stringify(gameState));
        } else {
            localStorage.removeItem(this.PREFIX + "active_game");
        }
    }

    getActiveGame() {
        const state = localStorage.getItem(this.PREFIX + "active_game");
        return state ? JSON.parse(state) : null;
    }

    /**
     * Snapshots for 5-moves recovery
     */
    saveSnapshot(gameState) {
        if (gameState) {
            localStorage.setItem(this.PREFIX + "snapshot_game", JSON.stringify(gameState));
        } else {
            localStorage.removeItem(this.PREFIX + "snapshot_game");
        }
    }

    getSnapshot() {
        const state = localStorage.getItem(this.PREFIX + "snapshot_game");
        return state ? JSON.parse(state) : null;
    }

    clearSnapshot() {
        localStorage.removeItem(this.PREFIX + "snapshot_game");
    }

    /**
     * Reset all data to factory defaults
     */
    resetProgress() {
        localStorage.removeItem(this.PREFIX + "settings");
        localStorage.removeItem(this.PREFIX + "progress");
        localStorage.removeItem(this.PREFIX + "stats");
        localStorage.removeItem(this.PREFIX + "achievements");
        localStorage.removeItem(this.PREFIX + "active_game");
        localStorage.removeItem(this.PREFIX + "snapshot_game");
        this.initDefaultData();
    }
}

const storage = new StorageManager();
window.storage = storage;
