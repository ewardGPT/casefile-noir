import Phaser from "phaser";
import { HowToPlayUI } from "../ui/HowToPlayUI.js";

export default class HowToPlay extends Phaser.Scene {
    constructor() {
        super("HowToPlay");
    }

    create() {
        const { width, height } = this.scale;

        // --- Dark Background ---
        this.add.rectangle(0, 0, width, height, 0x0a0f18, 1).setOrigin(0, 0);

        // --- Vignette Overlay ---
        const vignette = this.add.graphics();
        vignette.fillStyle(0x000000, 0.3);
        vignette.fillRect(0, 0, width, height);
        vignette.setScrollFactor(0);
        vignette.setDepth(1);

        // --- Enhanced UI Component (Pokemon-themed scrollable) ---
        this.howToPlayUI = new HowToPlayUI(this);
        
        // --- Back Button (Fixed at bottom) ---
        const back = this.add.text(width / 2, height - 50, "←  BACK TO MENU", {
            fontFamily: "'Georgia', serif",
            fontSize: "24px",
            color: "#ffffff",
            backgroundColor: "#0a0f18",
            padding: { left: 25, right: 25, top: 12, bottom: 12 },
            stroke: "#3a4a5a",
            strokeThickness: 1,
        }).setOrigin(0.5);
        back.setScrollFactor(0);
        back.setDepth(100);

        back.setInteractive({ useHandCursor: true });

        // Clean up existing listeners
        if (this.input && this.input.keyboard) {
            this.input.keyboard.removeAllListeners("keydown-ESC");
        }
        if (this.tweens) {
            this.tweens.killAll();
        }

        // Back button hover effects
        back.on("pointerover", () => {
            this.tweens.add({
                targets: back,
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 100,
            });
            back.setStyle({ backgroundColor: "#1a2a3a", stroke: "#5a7a9a" });
        });

        back.on("pointerout", () => {
            this.tweens.add({
                targets: back,
                scaleX: 1.0,
                scaleY: 1.0,
                duration: 100,
            });
            back.setStyle({ backgroundColor: "#0a0f18", stroke: "#3a4a5a" });
        });

        back.on("pointerdown", () => {
            try {
                this.scene.start("StartMenu");
            } catch (error) {
                console.error("Failed to start StartMenu scene:", error);
                throw error;
            }
        });

        // ESC to go back
        this.escHandler = () => {
            try {
                this.scene.start("StartMenu");
            } catch (error) {
                console.error("Failed to start StartMenu scene:", error);
            }
        };
        this.input.keyboard.once("keydown-ESC", this.escHandler);

        // Store reference for cleanup
        this.backButton = back;
    }

    shutdown() {
        // Clean up keyboard listeners
        if (this.input && this.input.keyboard) {
            this.input.keyboard.removeAllListeners("keydown-ESC");
        }

        // Remove UI component
        if (this.howToPlayUI) {
            this.howToPlayUI.destroy();
            this.howToPlayUI = null;
        }

        // Remove button listeners
        if (this.backButton) {
            this.backButton.removeAllListeners();
            this.backButton = null;
        }

        // Clean up tweens
        if (this.tweens) {
            this.tweens.killAll();
        }
    }
}
