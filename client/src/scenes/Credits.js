import Phaser from "phaser";

export default class Credits extends Phaser.Scene {
    constructor() {
        super("Credits");
    }

    create() {
        const { width, height } = this.scale;

        // --- Dark Background ---
        this.add.rectangle(0, 0, width, height, 0x0a0f18, 1).setOrigin(0, 0);

        // --- Vignette Overlay ---
        const vignette = this.add.graphics();
        vignette.fillStyle(0x000000, 0.3);
        vignette.fillRect(0, 0, width, height);

        // --- Title ---
        this.add.text(width / 2 + 3, 80 + 3, "CREDITS", {
            fontFamily: "'Georgia', serif",
            fontSize: "48px",
            color: "#000000",
        }).setOrigin(0.5).setAlpha(0.5);

        this.add.text(width / 2, 80, "CREDITS", {
            fontFamily: "'Georgia', serif",
            fontSize: "48px",
            color: "#d4af37",
            stroke: "#1a1a1a",
            strokeThickness: 4,
        }).setOrigin(0.5);

        // --- Credits Content ---
        const credits = [
            ["Developer", "Ervin Ward"],
            ["Engine", "Phaser 3 + Tiled"],
            ["AI Integration", "Gemini API"],
            ["Map Assets", "Victorian Tileset Pack"],
            ["Character Art", "LPC Sprite Collection"],
        ];

        const startY = 180;
        credits.forEach((credit, i) => {
            const y = startY + i * 55;

            // Role
            this.add.text(width / 2, y, credit[0], {
                fontFamily: "'Georgia', serif",
                fontSize: "16px",
                fontStyle: "italic",
                color: "#6a6a6a",
            }).setOrigin(0.5);

            // Name
            this.add.text(width / 2, y + 22, credit[1], {
                fontFamily: "'Georgia', serif",
                fontSize: "22px",
                color: "#c0c0c0",
            }).setOrigin(0.5);
        });

        // --- Special Thanks ---
        const thanksY = startY + credits.length * 55 + 40;

        this.add.text(width / 2, thanksY, "— Special Thanks —", {
            fontFamily: "'Georgia', serif",
            fontSize: "20px",
            fontStyle: "italic",
            color: "#d4af37",
        }).setOrigin(0.5);

        this.add.text(width / 2, thanksY + 35, "Hackathon Organizers & Judges", {
            fontFamily: "'Georgia', serif",
            fontSize: "18px",
            color: "#8a8a8a",
        }).setOrigin(0.5);

        // --- Back Button ---
        const back = this.add.text(width / 2, height - 80, "←  BACK TO MENU", {
            fontFamily: "'Georgia', serif",
            fontSize: "24px",
            color: "#ffffff",
            backgroundColor: "#0a0f18",
            padding: { left: 25, right: 25, top: 12, bottom: 12 },
            stroke: "#3a4a5a",
            strokeThickness: 1,
        }).setOrigin(0.5);

        back.setInteractive({ useHandCursor: true });

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

        back.on("pointerdown", () => this.scene.start("StartMenu"));

        this.input.keyboard.once("keydown-ESC", () => this.scene.start("StartMenu"));
    }
}
