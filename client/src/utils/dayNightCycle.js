/**
 * Day/Night Cycle System
 * Accelerated time: 1 real second = 1 game minute
 * Smooth lighting overlay transitions
 */

export class DayNightCycle {
    constructor(scene) {
        this.scene = scene;
        
        // Time state (in game minutes, 0-1439 for 24 hours)
        this.gameMinutes = 720; // Start at noon (12:00)
        
        // Lighting overlay
        this.lightingOverlay = null;
        this.targetAlpha = 0.0; // 0 = full daylight, 1 = full night
        this.currentAlpha = 0.0;
        
        // Time display UI
        this.timeText = null;
        
        // Streetlamp hooks (for future use)
        this.streetlamps = [];
    }
    
    /**
     * Initialize the day/night cycle
     */
    init() {
        const { width, height } = this.scene.scale;
        
        // Create lighting overlay (full-screen rectangle)
        this.lightingOverlay = this.scene.add.rectangle(
            width / 2,
            height / 2,
            width,
            height,
            0x000000, // Black overlay
            0
        );
        this.lightingOverlay.setScrollFactor(0); // Camera-locked
        this.lightingOverlay.setDepth(97); // Below noir overlay (98-99)
        this.lightingOverlay.setOrigin(0.5);
        
        // Create time display UI (top-right)
        this.timeText = this.scene.add.text(
            width - 20,
            20,
            '12:00',
            {
                fontFamily: "'Georgia', serif",
                fontSize: '18px',
                color: '#ffffff',
                backgroundColor: '#000000',
                padding: { x: 8, y: 4 }
            }
        );
        this.timeText.setOrigin(1, 0); // Right-aligned
        this.timeText.setScrollFactor(0);
        this.timeText.setDepth(1000);
        
        // Update initial lighting
        this.updateLighting();
        this.updateTimeDisplay();
    }
    
    /**
     * Update time and lighting (call in update loop)
     * @param {number} delta - Delta time in milliseconds
     */
    update(delta) {
        // Accelerated time: 1 real second = 1 game minute
        // delta is in ms, so delta/1000 = seconds, which equals game minutes
        this.gameMinutes += delta / 1000;
        
        // Wrap around 24 hours (1440 minutes)
        if (this.gameMinutes >= 1440) {
            this.gameMinutes -= 1440;
        }
        
        // Calculate target alpha based on time of day
        this.calculateTargetAlpha();
        
        // Smooth lerp to target alpha
        const lerpSpeed = 0.02; // Smooth transition
        this.currentAlpha = Phaser.Math.Linear(
            this.currentAlpha,
            this.targetAlpha,
            lerpSpeed
        );
        
        // Update lighting overlay
        if (this.lightingOverlay) {
            this.lightingOverlay.setAlpha(this.currentAlpha);
        }
        
        // Update time display
        this.updateTimeDisplay();
    }
    
    /**
     * Calculate target alpha based on time of day
     */
    calculateTargetAlpha() {
        const hour = Math.floor(this.gameMinutes / 60);
        const minute = this.gameMinutes % 60;
        
        // Day/night cycle:
        // 6:00 - 8:00: Dawn (alpha 1.0 -> 0.3)
        // 8:00 - 18:00: Day (alpha 0.3 -> 0.0 -> 0.3)
        // 18:00 - 20:00: Dusk (alpha 0.3 -> 1.0)
        // 20:00 - 6:00: Night (alpha 1.0)
        
        let alpha = 0.0;
        
        if (hour >= 6 && hour < 8) {
            // Dawn: 6:00-8:00 (alpha 1.0 -> 0.3)
            const progress = ((hour - 6) * 60 + minute) / 120; // 0 to 1
            alpha = 1.0 - (progress * 0.7); // 1.0 to 0.3
        } else if (hour >= 8 && hour < 18) {
            // Day: 8:00-18:00 (alpha 0.3 -> 0.0 -> 0.3)
            const dayProgress = ((hour - 8) * 60 + minute) / 600; // 0 to 1 over 10 hours
            if (dayProgress < 0.5) {
                // Morning: 0.3 -> 0.0
                alpha = 0.3 - (dayProgress * 2 * 0.3);
            } else {
                // Afternoon: 0.0 -> 0.3
                alpha = ((dayProgress - 0.5) * 2 * 0.3);
            }
        } else if (hour >= 18 && hour < 20) {
            // Dusk: 18:00-20:00 (alpha 0.3 -> 1.0)
            const progress = ((hour - 18) * 60 + minute) / 120; // 0 to 1
            alpha = 0.3 + (progress * 0.7); // 0.3 to 1.0
        } else {
            // Night: 20:00-6:00 (alpha 1.0)
            alpha = 1.0;
        }
        
        this.targetAlpha = Math.max(0, Math.min(1, alpha));
    }
    
    /**
     * Update time display text
     */
    updateTimeDisplay() {
        if (!this.timeText) return;
        
        const hours = Math.floor(this.gameMinutes / 60);
        const minutes = Math.floor(this.gameMinutes % 60);
        
        const hours12 = hours % 12 || 12;
        const ampm = hours < 12 ? 'AM' : 'PM';
        const timeStr = `${hours12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
        
        this.timeText.setText(timeStr);
        
        // Adjust text color based on lighting
        const brightness = 1.0 - this.currentAlpha;
        const r = Math.floor(255 * brightness);
        const g = Math.floor(255 * brightness);
        const b = Math.floor(255 * brightness);
        this.timeText.setStyle({ color: `rgb(${r}, ${g}, ${b})` });
    }
    
    /**
     * Update lighting overlay (initial setup)
     */
    updateLighting() {
        this.calculateTargetAlpha();
        this.currentAlpha = this.targetAlpha;
        if (this.lightingOverlay) {
            this.lightingOverlay.setAlpha(this.currentAlpha);
        }
    }
    
    /**
     * Add streetlamp (for future use)
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} radius - Glow radius
     */
    addStreetlamp(x, y, radius = 100) {
        // Future: Create circular light sprite
        // For now, just store reference
        this.streetlamps.push({ x, y, radius });
    }
    
    /**
     * Get current time
     * @returns {Object} {hours, minutes, gameMinutes}
     */
    getTime() {
        return {
            hours: Math.floor(this.gameMinutes / 60),
            minutes: Math.floor(this.gameMinutes % 60),
            gameMinutes: this.gameMinutes
        };
    }
    
    /**
     * Cleanup
     */
    destroy() {
        if (this.lightingOverlay) {
            this.lightingOverlay.destroy();
            this.lightingOverlay = null;
        }
        if (this.timeText) {
            this.timeText.destroy();
            this.timeText = null;
        }
        this.streetlamps = [];
    }
}
