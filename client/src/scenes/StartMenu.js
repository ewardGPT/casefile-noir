import Phaser from "phaser";

export default class StartMenu extends Phaser.Scene {
    constructor() {
        super("StartMenu");
    }

    create() {
        const { width, height } = this.scale;

        // --- Background ---
        this.add.rectangle(0, 0, width, height, 0x05070c, 1).setOrigin(0, 0);

        // Optional background image if you have one:
        // this.add.image(width / 2, height / 2, "menu_bg").setAlpha(0.25);

        // Vignette overlay
        const vignette = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.35);
        vignette.setBlendMode(Phaser.BlendModes.MULTIPLY);

        // --- Title ---
        this.add.text(width / 2, height * 0.22, "CASEFILE: NOIR", {
            fontFamily: "monospace",
            fontSize: "56px",
            color: "#eaeaea",
            stroke: "#000000",
            strokeThickness: 8,
        }).setOrigin(0.5);

        this.add.text(width / 2, height * 0.22 + 60, "AI Detective RPG", {
            fontFamily: "monospace",
            fontSize: "22px",
            color: "#b8b8b8",
        }).setOrigin(0.5);

        // --- Buttons ---
        const makeButton = (y, label, onClick) => {
            const btn = this.add.text(width / 2, y, label, {
                fontFamily: "monospace",
                fontSize: "28px",
                color: "#ffffff",
                backgroundColor: "#0f1722",
                padding: { left: 18, right: 18, top: 10, bottom: 10 },
            }).setOrigin(0.5);

            btn.setInteractive({ useHandCursor: true });

            btn.on("pointerover", () => btn.setStyle({ backgroundColor: "#1d2b42" }));
            btn.on("pointerout", () => btn.setStyle({ backgroundColor: "#0f1722" }));
            btn.on("pointerdown", onClick);

            return btn;
        };

        makeButton(height * 0.55, "START (ENTER)", () => this.startGame());
        makeButton(height * 0.65, "HOW TO PLAY", () => this.scene.start("HowToPlay"));
        makeButton(height * 0.75, "CREDITS", () => this.scene.start("Credits"));

        // --- Footer ---
        this.add.text(width / 2, height - 28, "Press ENTER to start • Hackathon Build", {
            fontFamily: "monospace",
            fontSize: "16px",
            color: "#9aa4b2",
        }).setOrigin(0.5);

        // Enter key to start
        this.input.keyboard.once("keydown-ENTER", () => this.startGame());
    }

    startGame() {
        this.scene.start("Game");
    }
}
