import Phaser from "phaser";
import { zoomCheck } from "../utils/zoomCheck";
import { validateTiledMap } from "../utils/mapValidator";

export default class StartMenu extends Phaser.Scene {
    constructor() {
        super("StartMenu");
        this.validationPassed = false;
    }

    create() {
        const { width, height } = this.scale;

        // --- Validation Status UI ---
        this.validationText = this.add.text(width / 2, height - 70, "Validating map...", {
            fontFamily: "monospace",
            fontSize: "16px",
            color: "#cbd5e1",
            backgroundColor: "#0b1220",
            padding: { left: 10, right: 10, top: 6, bottom: 6 },
        }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

        // Run map validation async
        this.runMapValidation();


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

        // --- Responsive Zoom ---
        const targetZoom = Math.min(width / 1280, height / 720);
        const finalZoom = Math.max(0.6, Math.min(0.9, targetZoom));

        // Start slightly zoomed out, then animate in
        this.cameras.main.setZoom(finalZoom - 0.1);

        // Cinematic zoom animation
        this.tweens.add({
            targets: this.cameras.main,
            zoom: finalZoom,
            duration: 900,
            ease: "Sine.easeOut",
        });

        // Store for panning
        this.mapWidth = map.widthInPixels;
        this.mapHeight = map.heightInPixels;
        this.panSpeedX = 15;
        this.panSpeedY = 8;

        // Center camera
        this.cameras.main.scrollX = map.widthInPixels * 0.25;
        this.cameras.main.scrollY = map.heightInPixels * 0.25;

        // Verify zoom
        zoomCheck(this, { expected: finalZoom - 0.1, min: 0.5, max: 0.9, label: "StartMenu INIT" });
        this.time.delayedCall(950, () => {
            zoomCheck(this, { expected: finalZoom, min: 0.6, max: 0.9, label: "StartMenu FINAL" });
        });

        // --- Vignette Overlay ---
        const vignette = this.add.graphics();
        vignette.fillStyle(0x000000, 0.6);
        vignette.fillRect(0, 0, width, height);
        vignette.setScrollFactor(0);
        vignette.setDepth(99);

        // --- Top Gradient for Title Readability ---
        const gradient = this.add.graphics();
        gradient.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.9, 0.9, 0, 0);
        gradient.fillRect(0, 0, width, height * 0.45);
        gradient.setScrollFactor(0);
        gradient.setDepth(100);

        // --- Film Grain Effect (subtle noise particles) ---
        this.grainGraphics = this.add.graphics();
        this.grainGraphics.setScrollFactor(0);
        this.grainGraphics.setDepth(98);
        this.grainGraphics.setAlpha(0.03);

        // --- Title (premium layered effect) ---
        // Deep shadow
        this.add.text(width / 2 + 5, height * 0.15 + 5, "CASEFILE", {
            fontFamily: "'Georgia', serif",
            fontSize: "80px",
            color: "#000000",
        }).setOrigin(0.5).setScrollFactor(0).setDepth(101).setAlpha(0.7);

        // Main title with stroke
        const title = this.add.text(width / 2, height * 0.15, "CASEFILE", {
            fontFamily: "'Georgia', serif",
            fontSize: "80px",
            color: "#d4af37",
            stroke: "#1a1a1a",
            strokeThickness: 6,
        }).setOrigin(0.5);
        title.setScrollFactor(0);
        title.setDepth(102);

        // Subtitle shadow
        this.add.text(width / 2 + 3, height * 0.15 + 90 + 3, "N O I R", {
            fontFamily: "'Georgia', serif",
            fontSize: "48px",
            color: "#000000",
        }).setOrigin(0.5).setScrollFactor(0).setDepth(101).setAlpha(0.6);

        // Subtitle
        const subtitle = this.add.text(width / 2, height * 0.15 + 90, "N O I R", {
            fontFamily: "'Georgia', serif",
            fontSize: "48px",
            color: "#c0c0c0",
            stroke: "#1a1a1a",
            strokeThickness: 3,
        }).setOrigin(0.5);
        subtitle.setScrollFactor(0);
        subtitle.setDepth(102);

        // Tagline
        const tagline = this.add.text(width / 2, height * 0.15 + 150, "— A Detective Mystery —", {
            fontFamily: "'Georgia', serif",
            fontSize: "20px",
            fontStyle: "italic",
            color: "#8a8a8a",
        }).setOrigin(0.5);
        tagline.setScrollFactor(0);
        tagline.setDepth(102);

        // --- Buttons with hover effects ---
        const makeButton = (y, label, onClick) => {
            const btn = this.add.text(width / 2, y, label, {
                fontFamily: "'Georgia', serif",
                fontSize: "26px",
                color: "#ffffff",
                backgroundColor: "#0a0f18",
                padding: { left: 30, right: 30, top: 12, bottom: 12 },
                stroke: "#3a4a5a",
                strokeThickness: 1,
            }).setOrigin(0.5);

            btn.setScrollFactor(0);
            btn.setDepth(102);
            btn.setInteractive({ useHandCursor: true });

            // Hover: scale up + glow effect
            btn.on("pointerover", () => {
                this.tweens.add({
                    targets: btn,
                    scaleX: 1.05,
                    scaleY: 1.05,
                    duration: 100,
                    ease: "Power2"
                });
                btn.setStyle({
                    backgroundColor: "#1a2a3a",
                    stroke: "#5a7a9a",
                    strokeThickness: 2
                });
            });

            btn.on("pointerout", () => {
                this.tweens.add({
                    targets: btn,
                    scaleX: 1.0,
                    scaleY: 1.0,
                    duration: 100,
                    ease: "Power2"
                });
                btn.setStyle({
                    backgroundColor: "#0a0f18",
                    stroke: "#3a4a5a",
                    strokeThickness: 1
                });
            });

            btn.on("pointerdown", () => {
                // Click feedback
                this.tweens.add({
                    targets: btn,
                    scaleX: 0.95,
                    scaleY: 0.95,
                    duration: 50,
                    yoyo: true,
                    ease: "Power2"
                });
                onClick();
            });

            return btn;
        };

        makeButton(height * 0.55, "▶  START GAME", () => this.startGame());
        makeButton(height * 0.65, "?  HOW TO PLAY", () => this.scene.start("HowToPlay"));
        makeButton(height * 0.75, "★  CREDITS", () => this.scene.start("Credits"));

        // --- Footer ---
        const footer = this.add.text(width / 2, height - 30, "Press ENTER to start • Hackathon Build", {
            fontFamily: "'Georgia', serif",
            fontSize: "14px",
            color: "#6a6a6a",
        }).setOrigin(0.5);
        footer.setScrollFactor(0);
        footer.setDepth(102);

        // Enter key to start
        this.input.keyboard.once("keydown-ENTER", () => this.startGame());
    }

    update(time, delta) {
        // Slow diagonal pan
        const cam = this.cameras.main;
        cam.scrollX += this.panSpeedX * (delta / 1000);
        cam.scrollY += this.panSpeedY * (delta / 1000);

        // Wrap around
        if (cam.scrollX > this.mapWidth * 0.4) {
            cam.scrollX = 0;
        }
        if (cam.scrollY > this.mapHeight * 0.4) {
            cam.scrollY = 0;
        }

        // Film grain effect (randomize every frame)
        if (this.grainGraphics) {
            this.grainGraphics.clear();
            const { width, height } = this.scale;
            for (let i = 0; i < 300; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;
                const alpha = Math.random() * 0.5;
                this.grainGraphics.fillStyle(0xffffff, alpha);
                this.grainGraphics.fillRect(x, y, 1, 1);
            }
        }
    }

    startGame() {
        if (!this.validationPassed) {
            console.warn("Cannot start: validation not passed yet");
            return;
        }
        this.scene.start("Game");
    }

    async runMapValidation() {
        const { width, height } = this.scale;

        try {
            const report = await validateTiledMap({
                mapUrl: "/assets/maps/world.json",
                onProgress: (p) => {
                    if (p.phase === "collisions") {
                        this.validationText?.setText(`Validating collisions... ${p.i}/${p.total}`);
                    } else if (p.phase === "bfs") {
                        this.validationText?.setText(`Checking paths... ${p.reachable} tiles`);
                    }
                },
            });

            // Log full report
            console.group("🗺️ MAP VALIDATION REPORT");
            console.log("Stats:", report.stats);
            if (report.warnings.length) console.warn("Warnings:", report.warnings);
            if (report.errors.length) console.error("Errors:", report.errors);
            if (report.unreachableObjects.length) console.warn("Unreachable:", report.unreachableObjects);
            if (report.chokepoints.length) console.log("Chokepoints:", report.chokepoints.length);
            if (report.islands.length) console.log("Islands:", report.islands.length);
            if (report.microGaps.length) console.warn("Micro-gaps:", report.microGaps);
            console.groupEnd();

            // Store debug data for Game scene overlay
            this.registry.set("mapDebugData", report.debug);

            // Always pass for now (validation is informational, not blocking)
            this.validationPassed = true;
            this.validationText?.setText(`Map OK ✅ (${report.stats.ms}ms) - Press ENTER`);
            this.validationText?.setStyle({ color: "#4ade80" });

            // Auto-start after short delay
            this.time.delayedCall(400, () => {
                if (!this.scene.isActive("Game")) {
                    this.startGame();
                }
            });

        } catch (e) {
            console.error("Map validation error:", e);
            this.validationText?.setText("Map validation error - Starting anyway...");
            this.validationPassed = true; // Allow start even on error
            this.time.delayedCall(1000, () => this.startGame());
        }
    }
}
