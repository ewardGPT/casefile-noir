import Phaser from "phaser";

export default class StartMenu extends Phaser.Scene {
    constructor() {
        super("StartMenu");
    }

    create() {
        const { width, height } = this.scale;

        // --- Animated Map Background ---
        const map = this.make.tilemap({ key: 'city_map' });

        const tilesets = [
            map.addTilesetImage('terrain-map-v8_0', 'terrain-map-v8_0'),
            map.addTilesetImage('terrain-map-v8_1', 'terrain-map-v8_1'),
            map.addTilesetImage('terrain-map-v8_2', 'terrain-map-v8_2'),
            map.addTilesetImage('terrain-map-v8_3', 'terrain-map-v8_3'),
            map.addTilesetImage('terrain-map-v8_4', 'terrain-map-v8_4'),
            map.addTilesetImage('terrain-map-v8_5', 'terrain-map-v8_5'),
            map.addTilesetImage('terrain-map-v8_6', 'terrain-map-v8_6'),
            map.addTilesetImage('terrain-map-v8_7', 'terrain-map-v8_7'),
            map.addTilesetImage('vten', 'vten'),
            map.addTilesetImage('windoors', 'windoors'),
            map.addTilesetImage('vhouse', 'vhouse'),
            map.addTilesetImage('roofs', 'roofs'),
            map.addTilesetImage('vacc', 'vacc'),
            map.addTilesetImage('bricks', 'bricks'),
            map.addTilesetImage('vwindoors', 'vwindoors'),
            map.addTilesetImage('container', 'container'),
            map.addTilesetImage('vmkt', 'vmkt'),
            map.addTilesetImage('vgard', 'vgard'),
            map.addTilesetImage('vstreets', 'vstreets'),
            map.addTilesetImage('food', 'food'),
            map.addTilesetImage('trees', 'trees')
        ].filter(t => t !== null);

        const layerNames = ['Trn_1', 'Trn_2', 'Trn_3', 'Bldg_1', 'Bldg_2', 'Bldg_3', 'Bldg_4'];
        layerNames.forEach(name => {
            map.createLayer(name, tilesets, 0, 0);
        });

        // Zoom out a lot to show the whole map
        this.cameras.main.setZoom(0.04);
        // Remove bounds so camera can show entire zoomed-out map
        // this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

        // Store map dimensions for panning in update()
        this.mapWidth = map.widthInPixels;
        this.mapHeight = map.heightInPixels;
        this.panSpeedX = 50;
        this.panSpeedY = 25;

        // Center camera on the map
        this.cameras.main.scrollX = map.widthInPixels * 0.3;
        this.cameras.main.scrollY = map.heightInPixels * 0.3;

        // --- Vignette Overlay (fixed to screen) ---
        const uiCam = this.cameras.add(0, 0, width, height);
        uiCam.setScroll(0, 0);

        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5);
        overlay.setScrollFactor(0);
        overlay.setDepth(100);

        // --- Title (premium layered effect) ---
        // Shadow layer 1 (deep)
        this.add.text(width / 2 + 4, height * 0.18 + 4, "CASEFILE", {
            fontFamily: "'Georgia', serif",
            fontSize: "72px",
            color: "#000000",
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setAlpha(0.6);

        // Shadow layer 2 (mid)
        this.add.text(width / 2 + 2, height * 0.18 + 2, "CASEFILE", {
            fontFamily: "'Georgia', serif",
            fontSize: "72px",
            color: "#1a1a2e",
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setAlpha(0.8);

        // Main title
        const title = this.add.text(width / 2, height * 0.18, "CASEFILE", {
            fontFamily: "'Georgia', serif",
            fontSize: "72px",
            color: "#d4af37", // Gold
        }).setOrigin(0.5);
        title.setScrollFactor(0);
        title.setDepth(101);

        // Subtitle "NOIR" with different style
        this.add.text(width / 2 + 3, height * 0.18 + 75 + 3, "N O I R", {
            fontFamily: "'Georgia', serif",
            fontSize: "42px",
            color: "#000000",
            letterSpacing: 16,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setAlpha(0.5);

        const subtitle = this.add.text(width / 2, height * 0.18 + 75, "N O I R", {
            fontFamily: "'Georgia', serif",
            fontSize: "42px",
            color: "#c0c0c0", // Silver
            letterSpacing: 16,
        }).setOrigin(0.5);
        subtitle.setScrollFactor(0);
        subtitle.setDepth(101);

        // Tagline
        const tagline = this.add.text(width / 2, height * 0.18 + 130, "— A Detective Mystery —", {
            fontFamily: "'Georgia', serif",
            fontSize: "18px",
            fontStyle: "italic",
            color: "#8a8a8a",
        }).setOrigin(0.5);
        tagline.setScrollFactor(0);
        tagline.setDepth(101);

        // --- Buttons (fixed to screen) ---
        const makeButton = (y, label, onClick) => {
            const btn = this.add.text(width / 2, y, label, {
                fontFamily: "monospace",
                fontSize: "28px",
                color: "#ffffff",
                backgroundColor: "#0f1722",
                padding: { left: 18, right: 18, top: 10, bottom: 10 },
            }).setOrigin(0.5);

            btn.setScrollFactor(0);
            btn.setDepth(101);
            btn.setInteractive({ useHandCursor: true });

            btn.on("pointerover", () => btn.setStyle({ backgroundColor: "#1d2b42" }));
            btn.on("pointerout", () => btn.setStyle({ backgroundColor: "#0f1722" }));
            btn.on("pointerdown", onClick);

            return btn;
        };

        makeButton(height * 0.55, "START (ENTER)", () => this.startGame());
        makeButton(height * 0.65, "HOW TO PLAY", () => this.scene.start("HowToPlay"));
        makeButton(height * 0.75, "CREDITS", () => this.scene.start("Credits"));

        // --- Footer (fixed to screen) ---
        const footer = this.add.text(width / 2, height - 28, "Press ENTER to start • Hackathon Build", {
            fontFamily: "monospace",
            fontSize: "16px",
            color: "#9aa4b2",
        }).setOrigin(0.5);
        footer.setScrollFactor(0);
        footer.setDepth(101);

        // Enter key to start
        this.input.keyboard.once("keydown-ENTER", () => this.startGame());
    }

    update(time, delta) {
        // Slow diagonal pan
        const cam = this.cameras.main;
        cam.scrollX += this.panSpeedX * (delta / 1000);
        cam.scrollY += this.panSpeedY * (delta / 1000);

        // Wrap around when reaching edges
        if (cam.scrollX > this.mapWidth * 0.5) {
            cam.scrollX = 0;
        }
        if (cam.scrollY > this.mapHeight * 0.5) {
            cam.scrollY = 0;
        }
    }

    startGame() {
        this.scene.start("Game");
    }
}
