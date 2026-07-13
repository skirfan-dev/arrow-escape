/**
 * Arrow Escape - Animation Engine
 * Handles screen shakes, spring physical simulations, interpolation, and smooth rendering updates.
 */

class AnimationEngine {
    constructor() {
        this.activeAnimations = [];
        this.shakeIntensity = 0;
        this.shakeDecay = 0.9;
        this.shakeX = 0;
        this.shakeY = 0;
        
        // Easing helpers
        this.easings = {
            linear: t => t,
            easeInQuad: t => t * t,
            easeOutQuad: t => t * (2 - t),
            easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
            easeInCubic: t => t * t * t,
            easeOutCubic: t => (--t) * t * t + 1,
            easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
            easeOutBack: t => {
                const c1 = 1.70158;
                const c3 = c1 + 1;
                return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
            },
            easeOutElastic: t => {
                const c4 = (2 * Math.PI) / 3;
                return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
            }
        };
    }

    /**
     * Start a generic value animation
     * @param {object} config { from, to, duration, easing, onUpdate, onComplete }
     */
    animate(config) {
        const anim = {
            id: utils.generateId(),
            from: config.from,
            to: config.to,
            duration: config.duration || 300,
            easing: this.easings[config.easing || 'easeOutQuad'],
            onUpdate: config.onUpdate,
            onComplete: config.onComplete,
            startTime: performance.now(),
            progress: 0
        };
        this.activeAnimations.push(anim);
        return anim.id;
    }

    /**
     * Cancel an ongoing animation by ID
     */
    cancel(id) {
        this.activeAnimations = this.activeAnimations.filter(anim => anim.id !== id);
    }

    /**
     * Trigger a camera/screen shake
     * @param {number} intensity Max offset in pixels
     */
    shake(intensity = 8) {
        if (storage.getSettings().reducedMotion) return;
        this.shakeIntensity = intensity;
    }

    /**
     * Update animations and effects
     */
    update() {
        const now = performance.now();
        
        // Update cameras hake
        if (this.shakeIntensity > 0.1) {
            this.shakeX = (Math.random() - 0.5) * this.shakeIntensity;
            this.shakeY = (Math.random() - 0.5) * this.shakeIntensity;
            this.shakeIntensity *= this.shakeDecay;
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
            this.shakeIntensity = 0;
        }

        // Update active variable animations
        this.activeAnimations = this.activeAnimations.filter(anim => {
            const elapsed = now - anim.startTime;
            const progress = Math.min(elapsed / anim.duration, 1);
            
            const easedProgress = anim.easing(progress);
            const currentValue = utils.lerp(anim.from, anim.to, easedProgress);
            
            if (anim.onUpdate) {
                anim.onUpdate(currentValue, progress);
            }

            if (progress >= 1) {
                if (anim.onComplete) {
                    anim.onComplete();
                }
                return false;
            }
            return true;
        });
    }

    /**
     * Clear all active animations and visual fx
     */
    clear() {
        this.activeAnimations = [];
        this.shakeIntensity = 0;
        this.shakeX = 0;
        this.shakeY = 0;
    }
}

const animation = new AnimationEngine();
window.animation = animation;
