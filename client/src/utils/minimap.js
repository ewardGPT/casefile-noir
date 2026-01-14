/**
 * Minimap System
 * Camera-based minimap showing map overview with player marker
 */

export class Minimap {
    constructor(scene) {
        this.scene = scene;
        this.enabled = false;
        
        // Minimap camera
        this.minimapCamera = null;
        
        // UI elements
        this.minimapContainer = null;
        this.minimapBorder = null;
        this.playerDot = null;
        this.npcDots = [];
        
        // Settings
        this.size = 200; // Minimap size in pixels
        this.position = { x: 0, y: 0 }; // Top-right corner
        this.scale = 0.15; // Scale down factor
    }
    
    /**
     * Initialize minimap
     */
    init() {
        const { width, height } = this.scene.scale;
        
        // Position in top-right corner
        this.position.x = width - this.size - 20;
        this.position.y = 20;
        
        // Create minimap camera
        this.minimapCamera = this.scene.cameras.add(
            this.position.x,
            this.position.y,
            this.size,
            this.size
        );
        this.minimapCamera.setZoom(this.scale);
        this.minimapCamera.setScroll(0, 0);
        this.minimapCamera.setBackgroundColor(0x1a1a1a);
        this.minimapCamera.setVisible(false); // Hidden by default
        
        // Create border panel UI
        this.minimapBorder = this.scene.add.rectangle(
            this.position.x + this.size / 2,
            this.position.y + this.size / 2,
            this.size + 4,
            this.size + 4,
            0x000000,
            0.8
        );
        this.minimapBorder.setStrokeStyle(2, 0x4ade80);
        this.minimapBorder.setScrollFactor(0);
        this.minimapBorder.setDepth(1001);
        this.minimapBorder.setVisible(false);
        
        // Create player dot marker
        this.playerDot = this.scene.add.circle(0, 0, 4, 0xff0000, 1);
        this.playerDot.setScrollFactor(0);
        this.playerDot.setDepth(1002);
        this.playerDot.setVisible(false);
        
        // Create container for NPC dots
        this.npcDots = [];
    }
    
    /**
     * Enable/disable minimap
     * @param {boolean} enabled
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        
        if (this.minimapCamera) {
            this.minimapCamera.setVisible(enabled);
        }
        if (this.minimapBorder) {
            this.minimapBorder.setVisible(enabled);
        }
        if (this.playerDot) {
            this.playerDot.setVisible(enabled);
        }
        
        // Update NPC dots visibility
        this.npcDots.forEach(dot => {
            if (dot) dot.setVisible(enabled);
        });
    }
    
    /**
     * Toggle minimap
     */
    toggle() {
        this.setEnabled(!this.enabled);
        return this.enabled;
    }
    
    /**
     * Update minimap (call in update loop)
     */
    update() {
        if (!this.enabled) return;
        
        // Update minimap camera to follow main camera's view
        const mainCamera = this.scene.cameras.main;
        if (this.minimapCamera && mainCamera) {
            // Center minimap camera on main camera's center
            this.minimapCamera.setScroll(
                mainCamera.scrollX + mainCamera.width / 2 - this.size / (2 * this.scale),
                mainCamera.scrollY + mainCamera.height / 2 - this.size / (2 * this.scale)
            );
        }
        
        // Update player dot position
        if (this.playerDot && this.scene.player) {
            const player = this.scene.player;
            const mainCam = this.scene.cameras.main;
            
            // Convert world position to minimap screen position
            const relativeX = player.x - mainCam.scrollX;
            const relativeY = player.y - mainCam.scrollY;
            
            // Scale to minimap size
            const minimapX = this.position.x + (relativeX * this.scale);
            const minimapY = this.position.y + (relativeY * this.scale);
            
            // Clamp to minimap bounds
            const clampedX = Phaser.Math.Clamp(
                minimapX,
                this.position.x + 4,
                this.position.x + this.size - 4
            );
            const clampedY = Phaser.Math.Clamp(
                minimapY,
                this.position.y + 4,
                this.position.y + this.size - 4
            );
            
            this.playerDot.setPosition(clampedX, clampedY);
        }
        
        // Update NPC dots
        if (this.scene.npcs && this.scene.npcs.length > 0) {
            // Ensure we have enough dots
            while (this.npcDots.length < this.scene.npcs.length) {
                const dot = this.scene.add.circle(0, 0, 2, 0x00ff00, 0.7);
                dot.setScrollFactor(0);
                dot.setDepth(1002);
                dot.setVisible(this.enabled);
                this.npcDots.push(dot);
            }
            
            // Remove excess dots
            while (this.npcDots.length > this.scene.npcs.length) {
                const dot = this.npcDots.pop();
                if (dot) dot.destroy();
            }
            
            // Update NPC dot positions
            const mainCam = this.scene.cameras.main;
            this.scene.npcs.forEach((npc, idx) => {
                if (idx < this.npcDots.length && this.npcDots[idx]) {
                    const relativeX = npc.x - mainCam.scrollX;
                    const relativeY = npc.y - mainCam.scrollY;
                    
                    const minimapX = this.position.x + (relativeX * this.scale);
                    const minimapY = this.position.y + (relativeY * this.scale);
                    
                    const clampedX = Phaser.Math.Clamp(
                        minimapX,
                        this.position.x + 4,
                        this.position.x + this.size - 4
                    );
                    const clampedY = Phaser.Math.Clamp(
                        minimapY,
                        this.position.y + 4,
                        this.position.y + this.size - 4
                    );
                    
                    this.npcDots[idx].setPosition(clampedX, clampedY);
                }
            });
        }
    }
    
    /**
     * Cleanup
     */
    destroy() {
        if (this.minimapCamera) {
            this.scene.cameras.remove(this.minimapCamera);
            this.minimapCamera = null;
        }
        
        if (this.minimapBorder) {
            this.minimapBorder.destroy();
            this.minimapBorder = null;
        }
        
        if (this.playerDot) {
            this.playerDot.destroy();
            this.playerDot = null;
        }
        
        this.npcDots.forEach(dot => {
            if (dot) dot.destroy();
        });
        this.npcDots = [];
    }
}
