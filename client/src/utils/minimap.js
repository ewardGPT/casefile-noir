/**
 * Minimap System
 * Camera-based minimap showing map overview with player marker
 */

export class Minimap {
    constructor(scene) {
        this.scene = scene;
        this.enabled = true; // Always visible by default
        this.fullMap = false;

        // Minimap camera
        this.minimapCamera = null;

        // UI elements
        this.minimapContainer = null;
        this.minimapBorder = null;
        this.playerDot = null;
        this.questDot = null;
        this.npcDots = [];

        // Settings
        this.size = 200; // Minimap size in pixels
        this.position = { x: 0, y: 0 }; // Top-right corner
        this.scale = 0.15; // Scale down factor

        this.questTarget = null;
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
        this.minimapCamera.setVisible(this.enabled); // Use enabled state

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
        this.playerDot.setVisible(this.enabled);

        // Create quest target marker (Yellow/Gold)
        this.questDot = this.scene.add.circle(0, 0, 6, 0xffd700, 1);
        this.questDot.setStrokeStyle(2, 0x000000);
        this.questDot.setScrollFactor(0);
        this.questDot.setDepth(1003);
        this.questDot.setVisible(false);

        // Create container for NPC dots
        this.npcDots = [];
    }

    setQuestTarget(target) {
        this.questTarget = target;
        if (!target) {
            if (this.questDot) this.questDot.setVisible(false);
        }
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
        if (!this.enabled && this.fullMap) {
            this.setFullMap(false); // Close full map if hiding entirely
        }
        return this.enabled;
    }

    /**
     * Toggle full map mode
     */
    toggleFullMap() {
        if (!this.enabled) {
            this.setEnabled(true);
        }
        this.setFullMap(!this.fullMap);
        return this.fullMap;
    }

    /**
     * Set full map mode
     * @param {boolean} full
     */
    setFullMap(full) {
        this.fullMap = full;
        const { width, height } = this.scene.scale;

        if (full) {
            // Expand camera to center of screen
            this.currentScale = 0.3;
            this.currentPosition = { x: width * 0.1, y: height * 0.1 };
            this.currentSize = { w: width * 0.8, h: height * 0.8 };
        } else {
            // Restore to top-right corner
            this.currentScale = this.scale;
            this.currentPosition = { x: width - this.size - 20, y: 20 };
            this.currentSize = { w: this.size, h: this.size };
        }

        this.minimapCamera.setPosition(this.currentPosition.x, this.currentPosition.y);
        this.minimapCamera.setSize(this.currentSize.w, this.currentSize.h);
        this.minimapCamera.setZoom(this.currentScale);

        this.minimapBorder.setPosition(this.currentPosition.x + this.currentSize.w / 2, this.currentPosition.y + this.currentSize.h / 2);
        this.minimapBorder.setSize(this.currentSize.w + 8, this.currentSize.h + 8);
    }

    /**
     * Update minimap (call in update loop)
     */
    update() {
        if (!this.enabled) return;

        // Ensure current properties are initialized
        if (!this.currentPosition) {
            this.currentPosition = { x: this.position.x, y: this.position.y };
            this.currentSize = { w: this.size, h: this.size };
            this.currentScale = this.scale;
        }

        // Update minimap camera to follow main camera's view
        const mainCamera = this.scene.cameras.main;
        if (this.minimapCamera && mainCamera) {
            // Center minimap camera on main camera's center
            this.minimapCamera.setScroll(
                mainCamera.scrollX + mainCamera.width / 2 - this.currentSize.w / (2 * this.currentScale),
                mainCamera.scrollY + mainCamera.height / 2 - this.currentSize.h / (2 * this.currentScale)
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
            const minimapX = this.currentPosition.x + (relativeX * this.currentScale);
            const minimapY = this.currentPosition.y + (relativeY * this.currentScale);

            // Clamp to minimap bounds
            const clampedX = Phaser.Math.Clamp(
                minimapX,
                this.currentPosition.x + 4,
                this.currentPosition.x + this.currentSize.w - 4
            );
            const clampedY = Phaser.Math.Clamp(
                minimapY,
                this.currentPosition.y + 4,
                this.currentPosition.y + this.currentSize.h - 4
            );

            this.playerDot.setPosition(clampedX, clampedY);

            // --- Update Quest Dot ---
            if (this.questDot && this.questTarget) {
                const qRelX = this.questTarget.x - mainCam.scrollX;
                const qRelY = this.questTarget.y - mainCam.scrollY;

                const qMinimapX = this.currentPosition.x + (qRelX * this.currentScale);
                const qMinimapY = this.currentPosition.y + (qRelY * this.currentScale);

                // Check if quest target is within minimap view
                const isWithinBounds = (
                    qMinimapX >= this.currentPosition.x &&
                    qMinimapX <= this.currentPosition.x + this.currentSize.w &&
                    qMinimapY >= this.currentPosition.y &&
                    qMinimapY <= this.currentPosition.y + this.currentSize.h
                );

                if (isWithinBounds || this.fullMap) {
                    this.questDot.setVisible(true && this.enabled);
                    this.questDot.setPosition(qMinimapX, qMinimapY);
                } else {
                    // Optionally clamp to edge to show direction? 
                    // For now, hide if off-map to avoid confusion, or clamp like player?
                    // Let's clamp to edge so they know direction
                    const qClampedX = Phaser.Math.Clamp(
                        qMinimapX,
                        this.currentPosition.x + 4,
                        this.currentPosition.x + this.currentSize.w - 4
                    );
                    const qClampedY = Phaser.Math.Clamp(
                        qMinimapY,
                        this.currentPosition.y + 4,
                        this.currentPosition.y + this.currentSize.h - 4
                    );
                    this.questDot.setVisible(true && this.enabled);
                    this.questDot.setPosition(qClampedX, qClampedY);
                }
            } else if (this.questDot) {
                this.questDot.setVisible(false);
            }
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

                    const minimapX = this.currentPosition.x + (relativeX * this.currentScale);
                    const minimapY = this.currentPosition.y + (relativeY * this.currentScale);

                    const clampedX = Phaser.Math.Clamp(
                        minimapX,
                        this.currentPosition.x + 4,
                        this.currentPosition.x + this.currentSize.w - 4
                    );
                    const clampedY = Phaser.Math.Clamp(
                        minimapY,
                        this.currentPosition.y + 4,
                        this.currentPosition.y + this.currentSize.h - 4
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
