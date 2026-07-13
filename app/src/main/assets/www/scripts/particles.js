/**
 * Arrow Escape - Particle System
 * Handles canvas-based particle effects for sliding arrow bursts and victory confetti.
 */

class Particle {
    constructor(x, y, color, speedX, speedY, size, life, type = 'circle') {
        this.x = x;
        this.y = y;
        this.color = color;
        this.speedX = speedX;
        this.speedY = speedY;
        this.size = size;
        this.maxLife = life;
        this.life = life; // Current remaining life
        this.type = type; // 'circle', 'square', 'star'
        this.angle = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;
        this.gravity = 0;
        this.drag = 0.98;
    }

    update() {
        this.speedX *= this.drag;
        this.speedY *= this.drag;
        this.speedY += this.gravity;
        this.x += this.speedX;
        this.y += this.speedY;
        this.angle += this.rotationSpeed;
        this.life--;
    }

    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        if (this.type === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'square') {
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        } else if (this.type === 'star') {
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * this.size,
                           Math.sin((18 + i * 72) * Math.PI / 180) * this.size);
                ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * (this.size / 2),
                           Math.sin((54 + i * 72) * Math.PI / 180) * (this.size / 2));
            }
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }
}

class ParticleSystem {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.active = false;
        this.colors = [
            '#FF2E93', '#FF8A00', '#FF007A', '#00F0FF', 
            '#00FF66', '#9E00FF', '#FFDF00', '#FFFFFF'
        ];
    }

    /**
     * Link canvas element to the particle system
     */
    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.active = true;
    }

    /**
     * Resize particle canvas
     */
    resize(width, height) {
        if (!this.canvas) return;
        this.canvas.width = width;
        this.canvas.height = height;
    }

    /**
     * Create a burst of particles when an arrow exits the board
     * @param {number} x Screen coordinates
     * @param {number} y Screen coordinates
     * @param {string} dir Direction: 'UP', 'DOWN', 'LEFT', 'RIGHT'
     * @param {string} color Custom color hex
     */
    createArrowBurst(x, y, dir, color = '#00F0FF') {
        if (!this.active) return;
        
        let baseAngle = 0;
        switch (dir) {
            case 'UP': baseAngle = -Math.PI / 2; break;
            case 'DOWN': baseAngle = Math.PI / 2; break;
            case 'LEFT': baseAngle = Math.PI; break;
            case 'RIGHT': baseAngle = 0; break;
        }

        const count = storage.getSettings().reducedMotion ? 5 : 25;
        for (let i = 0; i < count; i++) {
            const angle = baseAngle + (Math.random() - 0.5) * 0.8;
            const speed = 4 + Math.random() * 8;
            const speedX = Math.cos(angle) * speed;
            const speedY = Math.sin(angle) * speed;
            const size = 3 + Math.random() * 5;
            const life = 30 + Math.random() * 20;

            const p = new Particle(x, y, color, speedX, speedY, size, life, 'circle');
            p.drag = 0.95;
            this.particles.push(p);
        }
    }

    /**
     * Create victory confetti filling the screen
     */
    createVictoryConfetti() {
        if (!this.active || !this.canvas) return;
        
        const count = storage.getSettings().reducedMotion ? 20 : 150;
        for (let i = 0; i < count; i++) {
            const x = Math.random() * this.canvas.width;
            const y = -20 - Math.random() * 100;
            const color = utils.randomChoice(this.colors);
            const speedX = (Math.random() - 0.5) * 6;
            const speedY = 2 + Math.random() * 5;
            const size = 6 + Math.random() * 10;
            const life = 120 + Math.random() * 80;
            const type = utils.randomChoice(['circle', 'square', 'star']);

            const p = new Particle(x, y, color, speedX, speedY, size, life, type);
            p.gravity = 0.15;
            p.drag = 0.99;
            this.particles.push(p);
        }
    }

    /**
     * Create drifting background starfield/bubbles
     */
    createAmbientStar() {
        if (!this.active || !this.canvas) return;
        if (this.particles.length > 50) return; // Cap ambient count
        if (Math.random() > 0.08) return; // Limit spawn rate

        const x = Math.random() * this.canvas.width;
        const y = this.canvas.height + 10;
        const color = 'rgba(255, 255, 255, 0.1)';
        const speedX = (Math.random() - 0.5) * 0.5;
        const speedY = -0.5 - Math.random() * 1.5;
        const size = 1 + Math.random() * 3;
        const life = 200 + Math.random() * 200;

        const p = new Particle(x, y, color, speedX, speedY, size, life, 'circle');
        p.drag = 1.0;
        this.particles.push(p);
    }

    /**
     * Update and draw all particles
     */
    updateAndDraw() {
        if (!this.active || !this.ctx || !this.canvas) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Update & Filter out dead particles
        this.particles = this.particles.filter(p => {
            p.update();
            p.draw(this.ctx);
            return p.life > 0;
        });
    }

    /**
     * Clear all active particles
     */
    clear() {
        this.particles = [];
    }
}

const particles = new ParticleSystem();
window.particles = particles;
