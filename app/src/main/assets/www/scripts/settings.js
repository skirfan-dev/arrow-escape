/**
 * Arrow Escape - Settings Manager
 * Handles player preferences, theme switching, high contrast, and localization ready structure.
 */

class SettingsManager {
    constructor() {
        this.currentSettings = storage.getSettings();
        
        // Simple localization dictionary ready for expansion
        this.translations = {
            en: {
                title: "Arrow Escape",
                play: "Play",
                continue: "Continue",
                level_select: "Level Select",
                daily_challenge: "Daily Challenge",
                achievements: "Achievements",
                statistics: "Statistics",
                settings: "Settings",
                credits: "Credits",
                music: "Music",
                sound: "Sound FX",
                vibration: "Vibration",
                theme: "Color Theme",
                language: "Language",
                reduced_motion: "Reduced Motion",
                reset_progress: "Reset Progress",
                reset_warning: "Are you sure you want to reset all game progress? This cannot be undone.",
                win_title: "Victory!",
                next_level: "Next Level",
                menu: "Menu",
                hint: "Hint",
                undo: "Undo",
                redo: "Redo",
                moves: "Moves",
                level: "Level",
                score: "Score",
                time: "Time",
                zen_mode: "Zen Mode",
                infinite_mode: "Infinite Mode",
                timed_mode: "Timed Mode",
                hardcore_mode: "Hardcore",
                daily_win: "Daily Challenge Completed!",
                back: "Back",
                theme_dark: "Dark",
                theme_light: "Light",
                theme_high_contrast: "High Contrast"
            }
        };
    }

    /**
     * Get a translated string for the current language
     */
    get(key) {
        const lang = this.currentSettings.language || 'en';
        const dict = this.translations[lang] || this.translations['en'];
        return dict[key] || key;
    }

    /**
     * Toggle individual setting
     */
    toggle(key) {
        this.currentSettings[key] = !this.currentSettings[key];
        storage.saveSettings(this.currentSettings);
        
        if (key === 'music') {
            audio.updateMusicState();
        }
        this.applyTheme();
    }

    /**
     * Set setting value
     */
    set(key, value) {
        this.currentSettings[key] = value;
        storage.saveSettings(this.currentSettings);
        
        if (key === 'theme') {
            this.applyTheme();
        }
        if (key === 'music') {
            audio.updateMusicState();
        }
    }

    /**
     * Applies the selected visual theme to the document body
     */
    applyTheme() {
        const theme = this.currentSettings.theme || 'dark';
        document.body.className = ''; // Reset
        document.body.classList.add(`theme-${theme}`);
        if (this.currentSettings.reducedMotion) {
            document.body.classList.add('reduced-motion');
        } else {
            document.body.classList.remove('reduced-motion');
        }
    }
}

const settings = new SettingsManager();
window.settings = settings;
