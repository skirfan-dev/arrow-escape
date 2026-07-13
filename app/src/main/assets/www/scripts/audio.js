/**
 * Arrow Escape - Audio Manager
 * Generates music and sound effects procedurally using Web Audio API.
 * No external file dependencies! Perfect offline support.
 */

class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterVolume = null;
        this.sfxVolume = null;
        this.bgmVolume = null;
        this.bgmTimer = null;
        this.bgmNodes = [];
        this.isPlayingBgm = false;
        
        // Music Progression: soft ambient chords
        this.chords = [
            [220.00, 261.63, 329.63, 392.00], // Am7 (A3, C4, E4, G4)
            [174.61, 261.63, 329.63, 349.23], // Fmaj7 (F3, C4, E4, F4)
            [261.63, 329.63, 392.00, 493.88], // Cmaj7 (C4, E4, G4, B4)
            [196.00, 246.94, 293.66, 392.00]  // G7 (G3, B3, D4, G4)
        ];
        this.currentChordIndex = 0;
    }

    /**
     * Lazy-init the Web Audio API Context
     */
    init() {
        if (this.ctx) return;
        
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();
            
            // Set up gain nodes
            this.masterVolume = this.ctx.createGain();
            this.masterVolume.gain.setValueAtTime(0.8, this.ctx.currentTime);
            this.masterVolume.connect(this.ctx.destination);
            
            this.sfxVolume = this.ctx.createGain();
            this.sfxVolume.gain.setValueAtTime(0.5, this.ctx.currentTime);
            this.sfxVolume.connect(this.masterVolume);
            
            this.bgmVolume = this.ctx.createGain();
            this.bgmVolume.gain.setValueAtTime(0.15, this.ctx.currentTime);
            this.bgmVolume.connect(this.masterVolume);
        } catch (e) {
            console.error("Web Audio API not supported:", e);
        }
    }

    /**
     * Play Button Click Sound
     */
    playClick() {
        this.init();
        if (!this.ctx || !storage.getSettings().sound) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.sfxVolume);

        osc.type = 'triangle';
        const now = this.ctx.currentTime;
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(1000, now + 0.08);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        osc.start(now);
        osc.stop(now + 0.08);
    }

    /**
     * Play Arrow Slide Sound
     */
    playSlide() {
        this.init();
        if (!this.ctx || !storage.getSettings().sound) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxVolume);

        osc.type = 'sine';
        osc2.type = 'triangle';
        
        const now = this.ctx.currentTime;
        const dur = 0.35;

        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + dur);

        osc2.frequency.setValueAtTime(300, now);
        osc2.frequency.exponentialRampToValueAtTime(1600, now + dur);

        filter.type = 'lowpass';
        filter.Q.setValueAtTime(5, now);
        filter.frequency.setValueAtTime(1200, now);
        filter.frequency.exponentialRampToValueAtTime(3000, now + dur);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + dur);

        osc.start(now);
        osc2.start(now);
        osc.stop(now + dur);
        osc2.stop(now + dur);
    }

    /**
     * Play Victory Chime
     */
    playVictory() {
        this.init();
        if (!this.ctx || !storage.getSettings().sound) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const now = this.ctx.currentTime;
        // Pentatonic scale arpeggio
        const notes = [261.63, 329.63, 392.00, 440.00, 523.25, 659.25, 783.99, 880.00]; // C4, E4, G4, A4, C5, E5, G5, A5
        const delay = 0.08;

        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const delayNode = this.ctx.createDelay();
            
            osc.connect(gain);
            gain.connect(this.sfxVolume);

            osc.type = 'sine';
            const noteStart = now + (idx * delay);
            const dur = 0.6;

            osc.frequency.setValueAtTime(freq, noteStart);
            gain.gain.setValueAtTime(0, now);
            gain.gain.setValueAtTime(0.12, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.001, noteStart + dur);

            osc.start(noteStart);
            osc.stop(noteStart + dur);
        });
    }

    /**
     * Play Hint Sound
     */
    playHint() {
        this.init();
        if (!this.ctx || !storage.getSettings().sound) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const now = this.ctx.currentTime;
        const notes = [587.33, 659.25, 783.99, 880.00, 987.77]; // D5, E5, G5, A5, B5
        
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.connect(gain);
            gain.connect(this.sfxVolume);

            osc.type = 'triangle';
            const noteStart = now + (idx * 0.05);
            const dur = 0.4;

            osc.frequency.setValueAtTime(freq, noteStart);
            gain.gain.setValueAtTime(0.08, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.001, noteStart + dur);

            osc.start(noteStart);
            osc.stop(noteStart + dur);
        });
    }

    /**
     * Play Undo Sound
     */
    playUndo() {
        this.init();
        if (!this.ctx || !storage.getSettings().sound) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.sfxVolume);

        osc.type = 'triangle';
        const now = this.ctx.currentTime;
        const dur = 0.25;

        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + dur);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + dur);

        osc.start(now);
        osc.stop(now + dur);
    }

    /**
     * Start Procedural Ambient Background Music
     */
    startBGM() {
        this.init();
        if (!this.ctx || !storage.getSettings().music || this.isPlayingBgm) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        this.isPlayingBgm = true;
        this.playChordSequence();
    }

    /**
     * Stop Background Music
     */
    stopBgm() {
        this.isPlayingBgm = false;
        if (this.bgmTimer) {
            clearTimeout(this.bgmTimer);
            this.bgmTimer = null;
        }
        // Fade out active nodes
        this.bgmNodes.forEach(node => {
            try {
                const now = this.ctx.currentTime;
                node.gain.gain.cancelScheduledValues(now);
                node.gain.gain.linearRampToValueAtTime(0, now + 1);
                node.osc.stop(now + 1.2);
            } catch (e) {
                // Ignore errors from stopping nodes
            }
        });
        this.bgmNodes = [];
    }

    /**
     * Loop Chord Sequence for Ambient Music
     */
    playChordSequence() {
        if (!this.isPlayingBgm) return;

        const chordFreqs = this.chords[this.currentChordIndex];
        const now = this.ctx.currentTime;
        const noteDuration = 4.0; // 4 seconds per chord transition
        const overlap = 0.5;

        const activeNodes = [];

        // Synthesize each note of the chord gently
        chordFreqs.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.bgmVolume);

            // Alternate wave types for soft harmonic synthesis
            osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
            
            // Apply slight detuning for chorus/ambient vibe
            osc.frequency.setValueAtTime(freq + (Math.sin(idx) * 0.5), now);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(350 + (idx * 50), now);

            // Slow attack and slow decay/release
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.05, now + 1.5);
            gain.gain.setValueAtTime(0.05, now + noteDuration - overlap);
            gain.gain.linearRampToValueAtTime(0, now + noteDuration);

            osc.start(now);
            osc.stop(now + noteDuration);

            activeNodes.push({ osc, gain });
            this.bgmNodes.push({ osc, gain });
        });

        // Advance chord index
        this.currentChordIndex = (this.currentChordIndex + 1) % this.chords.length;

        // Clean up completed nodes after they stop playing
        setTimeout(() => {
            this.bgmNodes = this.bgmNodes.filter(n => !activeNodes.includes(n));
        }, (noteDuration + 1) * 1000);

        // Schedule next chord
        this.bgmTimer = setTimeout(() => {
            this.playChordSequence();
        }, (noteDuration - overlap) * 1000);
    }

    /**
     * Handle Settings Change
     */
    updateMusicState() {
        const musicEnabled = storage.getSettings().music;
        if (musicEnabled) {
            this.startBGM();
        } else {
            this.stopBgm();
        }
    }
}

const audio = new AudioManager();
window.audio = audio;
