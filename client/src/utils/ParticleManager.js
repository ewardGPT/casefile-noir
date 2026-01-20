/**
 * ParticleManager - Visual FX system for Captive Horror
 * Handles evidence pickup bursts, weather particles, and atmospheric effects
 */

export class ParticleManager {
    constructor(scene) {
        this.scene = scene;
        this.activeEmitters = new Map();
    }

    /**
     * Create evidence pickup burst effect (Zelda-style visual feedback)
     * @param {string} itemType - Type of evidence/quest item
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     * @param {number} color - Hex color for particle tint
     * @returns {Phaser.GameObjects.Particles.Emitter} - Particle emitter
     */
    createEvidenceBurst(itemType, x, y, color) {
        const emitterKey = `${itemType}_burst_${Date.now()}`;

        // Create particle texture if not exists
        if (!this.scene.textures.exists('particle_sparkle')) {
            const graphics = this.scene.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(8, 8, 4);
            graphics.generateTexture('particle_sparkle', 16, 16);
        }

        // Particle burst configuration
        const particleConfig = {
            x: x,
            y: y - 30,
            speed: { min: 50, max: 150 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.5, end: 0 },
            blendMode: 'ADD',
            lifespan: 800,
            gravityY: 200,
            quantity: 30,
            tint: color,
            emitting: false
        };

        const emitter = this.scene.add.particles(0, 0, 'particle_sparkle', particleConfig);
        this.activeEmitters.set(emitterKey, emitter);

        // Explode burst pattern
        emitter.explode(30, 0, 20);

        // Rotate emitter for dynamic burst effect
        this.scene.tweens.add({
            targets: emitter,
            angle: 360,
            duration: 1000,
            ease: 'Linear',
            repeat: -1,
            onComplete: () => {
                // Auto-destroy after animation
                if (this.activeEmitters.has(emitterKey)) {
                    this.activeEmitters.delete(emitterKey);
                    emitter.destroy();
                }
            }
        });

        return emitter;
    }

    /**
     * Create rain particles for weather system
     * @param {number} x - Start X coordinate
     * @param {number} y - Start Y coordinate
     * @returns {Phaser.GameObjects.Particles.Emitter} - Rain emitter
     */
    createRainDrops(x, y) {
        if (!this.scene.textures.exists('particle_rain')) {
            const graphics = this.scene.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0x6688cc, 1);
            graphics.fillRect(0, 0, 2, 8);
            graphics.generateTexture('particle_rain', 2, 8);
        }

        const particleConfig = {
            x: x,
            y: y,
            speedY: 400,
            scale: { start: 0.3, end: 0.5 },
            alpha: { start: 0.6, end: 0 },
            lifespan: 2000,
            quantity: 50,
            frequency: 50,
            tint: 0x6688cc
        };

        const emitter = this.scene.add.particles(0, 0, 'particle_rain', particleConfig);
        this.activeEmitters.set('rain', emitter);

        return emitter;
    }

    /**
     * Create fog particles for atmospheric effects
     * @param {number} x - Start X coordinate
     * @param {number} y - Start Y coordinate
     * @returns {Phaser.GameObjects.Particles.Emitter} - Fog emitter
     */
    createFogParticles(x, y) {
        if (!this.scene.textures.exists('particle_fog')) {
            const graphics = this.scene.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0xcccccc, 1);
            graphics.fillCircle(16, 16, 8);
            graphics.generateTexture('particle_fog', 32, 32);
        }

        const particleConfig = {
            x: { min: 0, max: this.scene.scale.width },
            y: { min: 0, max: this.scene.scale.height },
            speedX: { min: 20, max: 40 },
            speedY: { min: -10, max: 10 },
            scale: { start: 0.5, end: 2 },
            alpha: { start: 0.1, end: 0.3 },
            lifespan: 8000,
            quantity: 100,
            tint: 0xcccccc
        };

        const emitter = this.scene.add.particles(0, 0, 'particle_fog', particleConfig);
        this.activeEmitters.set('fog', emitter);

        return emitter;
    }

    /**
     * Create confetti burst for victory celebration
     * @param {number} x - Center X coordinate
     * @param {number} y - Center Y coordinate
     * @returns {Phaser.GameObjects.Particles.Emitter} - Confetti emitter
     */
    createConfetti(x, y) {
        if (!this.scene.textures.exists('particle_confetti')) {
            const graphics = this.scene.make.graphics({ x: 0, y: 0, add: false });
            const colors = [0x00ff00, 0xffff00, 0xff0000, 0x00ffff, 0xff00ff];
            colors.forEach((color, i) => {
                graphics.fillStyle(color, 1);
                graphics.fillRect(i * 8, 0, 6, 6);
            });
            graphics.generateTexture('particle_confetti', 32, 6);
        }

        const particleConfig = {
            x: x,
            y: y,
            speedX: { min: -200, max: 200 },
            speedY: { min: -300, max: -100 },
            gravityY: 300,
            scale: { start: 0.3, end: 0 },
            lifespan: 4000,
            quantity: 150,
            tint: [0x00ff00, 0xffff00, 0xff0000, 0x00ffff, 0xff00ff],
            rotate: { start: 0, end: 360 },
            emitting: false
        };

        const emitter = this.scene.add.particles(0, 0, 'particle_confetti', particleConfig);
        this.activeEmitters.set('confetti', emitter);

        emitter.explode(150, 0, 30);

        return emitter;
    }

    /**
     * Destroy all active particle emitters
     */
    destroy() {
        this.activeEmitters.forEach((emitter, key) => {
            emitter.destroy();
        });
        this.activeEmitters.clear();
    }
}

export default ParticleManager;
