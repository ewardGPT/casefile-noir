import Phaser from "phaser";

export default class Credits extends Phaser.Scene {
    constructor() {
        super("Credits");
    }

    create() {
        const { width, height } = this.scale;

        this.add.rectangle(0, 0, width, height, 0x05070c, 1).setOrigin(0, 0);

        this.add.text(width / 2, 80, "CREDITS", {
            fontFamily: "monospace",
            fontSize: "44px",
            color: "#ffffff",
        }).setOrigin(0.5);

        this.add.text(width / 2, 220,
            `Built by: Ervin Ward
Engine: Phaser 3 + Tiled
AI: Gemini API

Special thanks:
(assets + map credits here)`,
            {
                fontFamily: "monospace",
                fontSize: "22px",
                color: "#cbd5e1",
                align: "center",
                lineSpacing: 10,
            }).setOrigin(0.5);

        const back = this.add.text(width / 2, height - 90, "← BACK", {
            fontFamily: "monospace",
            fontSize: "26px",
            color: "#ffffff",
            backgroundColor: "#0f1722",
            padding: { left: 18, right: 18, top: 10, bottom: 10 },
        }).setOrigin(0.5);

        back.setInteractive({ useHandCursor: true });
        back.on("pointerdown", () => this.scene.start("StartMenu"));

        this.input.keyboard.once("keydown-ESC", () => this.scene.start("StartMenu"));
    }
}
