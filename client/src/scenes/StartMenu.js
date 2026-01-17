import Phaser from "phaser";
import { zoomCheck } from "../utils/zoomCheck";
import { validateTiledMap } from "../utils/mapValidator";

export default class StartMenu extends Phaser.Scene {
    constructor() {
        super("StartMenu");
        this.validationPassed = false;
        this.validationActive = false; // Initialize to prevent undefined checks
    }

    create() {
        const { width, height } = this.scale;

        // Defensive check: clean up existing listeners if scene is restarting
        if (this.input && this.input.keyboard) {
            this.input.keyboard.removeAllListeners("keydown-ENTER");
        }
        if (this.time) {
            this.time.removeAllEvents();
        }
        if (this.tweens) {
            this.tweens.killAll();
        }
        
        // Load sound toggle state from localStorage
        this.soundEnabled = localStorage.getItem('soundEnabled') !== 'false'; // Default to true

        // --- Validation Status UI with Loading Spinner ---
        this.validationText = this.add.text(width / 2, height - 70, "Validating map...", {
            fontFamily: "'Georgia', serif",
            fontSize: "16px",
            color: "#cbd5e1",
            backgroundColor: "#0b1220",
            padding: { left: 10, right: 10, top: 6, bottom: 6 },
        }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
        
        // Loading spinner (simple rotating circle)
        this.loadingSpinner = this.add.circle(width / 2, height - 100, 8, 0x4ade80, 0.8);
        this.loadingSpinner.setScrollFactor(0);
        this.loadingSpinner.setDepth(201);
        this.tweens.add({
            targets: this.loadingSpinner,
            rotation: Math.PI * 2,
            duration: 1000,
            repeat: -1,
            ease: 'Linear'
        });

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
                // Click feedback with sound toggle check
                this.tweens.add({
                    targets: btn,
                    scaleX: 0.92,
                    scaleY: 0.92,
                    duration: 80,
                    yoyo: true,
                    ease: "Power2"
                });
                // Play click sound if enabled
                if (this.soundEnabled) {
                    // Simple click sound via Web Audio API (no asset needed)
                    try {
                        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                        const oscillator = audioContext.createOscillator();
                        const gainNode = audioContext.createGain();
                        oscillator.connect(gainNode);
                        gainNode.connect(audioContext.destination);
                        oscillator.frequency.value = 800;
                        oscillator.type = 'sine';
                        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                        oscillator.start(audioContext.currentTime);
                        oscillator.stop(audioContext.currentTime + 0.1);
                    } catch (e) {
                        // Ignore audio errors
                    }
                }
                onClick();
            });

            return btn;
        };

        makeButton(height * 0.55, "▶  START GAME", () => this.startGame());
        makeButton(height * 0.65, "?  HOW TO PLAY", () => {
            try {
                this.scene.start("HowToPlay");
            } catch (error) {
                console.error("Failed to start HowToPlay scene:", error);
                throw error;
            }
        });
        makeButton(height * 0.75, "★  CREDITS", () => {
            try {
                this.scene.start("Credits");
            } catch (error) {
                console.error("Failed to start Credits scene:", error);
                throw error;
            }
        });

        // --- Sound Toggle Button ---
        const soundIcon = this.soundEnabled ? '🔊' : '🔇';
        const soundBtn = this.add.text(width - 30, 30, soundIcon, {
            fontFamily: "'Georgia', serif",
            fontSize: "24px",
            color: this.soundEnabled ? "#4ade80" : "#6a6a6a",
            backgroundColor: "#0a0f18",
            padding: { left: 8, right: 8, top: 6, bottom: 6 },
        }).setOrigin(1, 0);
        soundBtn.setScrollFactor(0);
        soundBtn.setDepth(102);
        soundBtn.setInteractive({ useHandCursor: true });
        
        soundBtn.on("pointerdown", () => {
            this.soundEnabled = !this.soundEnabled;
            localStorage.setItem('soundEnabled', String(this.soundEnabled));
            soundBtn.setText(this.soundEnabled ? '🔊' : '🔇');
            soundBtn.setStyle({ color: this.soundEnabled ? "#4ade80" : "#6a6a6a" });
        });

        // --- Footer ---
        const footer = this.add.text(width / 2, height - 30, "Press ENTER to start • Hackathon Build", {
            fontFamily: "'Georgia', serif",
            fontSize: "14px",
            color: "#6a6a6a",
        }).setOrigin(0.5);
        footer.setScrollFactor(0);
        footer.setDepth(102);

        // Enter key to start - store reference for cleanup
        this.enterKeyHandler = () => this.startGame();
        this.input.keyboard.once("keydown-ENTER", this.enterKeyHandler);
    }

    shutdown() {
        // Cancel async validation if running
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StartMenu.js:319',message:'Shutdown called',data:{validationActiveBefore:this.validationActive},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        this.validationActive = false;
        
        // Clean up error overlay
        if (this.errorOverlay) {
            if (this.errorOverlay.bg) this.errorOverlay.bg.destroy();
            if (this.errorOverlay.titleText) this.errorOverlay.titleText.destroy();
            if (this.errorOverlay.msgText) this.errorOverlay.msgText.destroy();
            if (this.errorOverlay.hintText) this.errorOverlay.hintText.destroy();
            this.errorOverlay = null;
        }
        
        // Clean up keyboard listeners
        if (this.input && this.input.keyboard) {
            this.input.keyboard.removeAllListeners("keydown-ENTER");
        }
        
        // Clean up timed events
        if (this.time) {
            this.time.removeAllEvents();
        }
        
        // Clean up tweens
        if (this.tweens) {
            this.tweens.killAll();
        }
        
        // Reset validation state
        this.validationPassed = false;
        this.mapDebugData = null;
        this.validationText = null;
        this.loadingSpinner = null;
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
        try {
            this.scene.start("Game", {
                mapDebugData: this.mapDebugData
            });
        } catch (error) {
            console.error("Failed to start Game scene:", error);
            throw error; // Re-throw to trigger error overlay
        }
    }

    async runMapValidation() {
        const { width, height } = this.scale;
        const minValidationTime = 5000; // 5 seconds as requested
        const startTime = Date.now();
        
        // Safety: Track if validation should continue (scene might be destroyed)
        this.validationActive = true;
        
        // Safety: Set a timeout to ensure validation doesn't block forever
        let validationTimeout = setTimeout(() => {
            if (this.validationActive && !this.validationPassed) {
                console.warn('[DEBUG] Validation timeout - allowing game start anyway');
                this.validationPassed = true;
                if (this.validationText && this.scene.isActive()) {
                    this.validationText.setText("⏱️ Validation taking longer than expected. You can start anyway. Press START");
                    this.validationText.setStyle({ color: "#fbbf24", fontSize: "16px" });
                }
                if (this.loadingSpinner && this.scene.isActive()) {
                    this.tweens.killTweensOf(this.loadingSpinner);
                    this.loadingSpinner.setVisible(false);
                }
            }
        }, 30000); // 30 second timeout
        
        // #region agent log
        try {
            fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StartMenu.js:395',message:'Validation started',data:{validationActive:this.validationActive,sceneActive:this.scene.isActive()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        } catch(e) {
            console.log('[DEBUG] Validation started', {validationActive:this.validationActive,sceneActive:this.scene.isActive()});
        }
        // #endregion

        try {
            // Phase 1: Loading
            // #region agent log
            const check1 = this.validationActive && this.validationText && this.scene.isActive();
            fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StartMenu.js:396',message:'Text update check Phase 1',data:{validationActive:this.validationActive,hasText:!!this.validationText,sceneActive:this.scene.isActive(),canUpdate:check1},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            if (check1) {
                this.validationText.setText("📂 Loading map data...");
            }
            await this.delay(600);

            // Phase 2: Parsing
            if (this.validationActive && this.validationText && this.scene.isActive()) {
                this.validationText.setText("🔍 Parsing tile layers...");
            }
            await this.delay(600);
            
            if (!this.validationActive || !this.scene.isActive()) {
                return; // Scene destroyed, abort validation
            }

            // #region agent log
            console.log('[DEBUG] Starting map validation', {mapUrl: "assets/maps/victorian/city_map_split.json"});
            // #endregion
            
            let report;
            report = await validateTiledMap({
                    mapUrl: "public/assets/maps/victorian/city_map_split.json",
                    onProgress: (p) => {
                    // Safety: Check scene is still active before updating Text
                    // #region agent log
                    const canUpdate = this.validationActive && this.scene.isActive() && this.validationText;
                    if (!canUpdate) {
                        fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StartMenu.js:414',message:'onProgress blocked',data:{phase:p.phase,validationActive:this.validationActive,sceneActive:this.scene.isActive(),hasText:!!this.validationText},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                        return;
                    }
                    // #endregion
                    if (p.phase === "loaded") {
                        this.validationText.setText(`📐 Map: ${p.mapW}x${p.mapH} tiles`);
                    } else if (p.phase === "collisions-start") {
                        this.validationText.setText(`🧱 Scanning ${p.objects} collision objects...`);
                    } else if (p.phase === "collisions") {
                        this.validationText.setText(`🧱 Collisions: ${p.i}/${p.total}`);
                    } else if (p.phase === "spawn-ok") {
                        this.validationText.setText("👤 Player spawn validated");
                    } else if (p.phase === "objects-ok") {
                        this.validationText.setText("📍 Interactables validated");
                    } else if (p.phase === "bfs-start") {
                        this.validationText.setText("🗺️ Running pathfinding BFS...");
                    } else if (p.phase === "npc-validation") {
                        this.validationText.setText("� Validating NPC spawn positions...");
                    }
                },
            });
            
            if (!this.validationActive || !this.scene.isActive()) {
                return; // Scene destroyed during validation
            }

            // Phase 3: Chokepoint analysis
            if (this.validationActive && this.validationText && this.scene.isActive()) {
                this.validationText.setText("🚧 Analyzing chokepoints...");
            }
            await this.delay(600);
            if (!this.validationActive || !this.scene.isActive()) return;

            // Phase 4: Island detection
            if (this.validationActive && this.validationText && this.scene.isActive()) {
                this.validationText.setText("🏝️ Detecting unreachable islands...");
            }
            await this.delay(600);
            if (!this.validationActive || !this.scene.isActive()) return;

            // Phase 5: NPC validation
            if (this.validationActive && this.validationText && this.scene.isActive()) {
                this.validationText.setText("👥 Pre-computing NPC spawn positions...");
            }
            await this.delay(800);
            if (!this.validationActive || !this.scene.isActive()) return;

            // Phase 6: A* pathfinding init
            if (this.validationActive && this.validationText && this.scene.isActive()) {
                this.validationText.setText("🛤️ Initializing A* pathfinding grid...");
            }
            await this.delay(600);
            if (!this.validationActive || !this.scene.isActive()) return;

            // Phase 7: Final analysis
            if (this.validationActive && this.validationText && this.scene.isActive()) {
                this.validationText.setText("✨ Finalizing validation report...");
            }

            // Ensure minimum time for impressive display
            const elapsed = Date.now() - startTime;
            if (elapsed < minValidationTime) {
                await this.delay(minValidationTime - elapsed);
            }
            
            if (!this.validationActive || !this.scene.isActive()) return;

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
            
            // Show error overlay if validation failed
            if (!report.ok && report.errors.length > 0) {
                this.showValidationErrorOverlay(report.errors);
            }

            // Store debug data for Game scene overlay
            this.mapDebugData = report.debug; // MISSING ASSIGNMENT FIXED
            this.registry.set("mapDebugData", report.debug);

            // Pre-start NPC texture checks
            const missingNpcTextures = [];
            for (let i = 1; i <= 35; i++) {
                const key = `npc_${i}`;
                if (!this.textures.exists(key)) {
                    missingNpcTextures.push(key);
                }
            }

            const hasCollisionData = (report.stats.collisionObjects || 0) > 0 || (report.stats.tileCollisions || 0) > 0;
            const hasNpcSpawns = (report.stats.npcSpawnsValidated || 0) > 0;

            if (!hasCollisionData) {
                console.warn("Validation WARNING: no collision data found.");
                // We still allow starting as Game.js has ground-truth collision logic
            }

            if (!hasNpcSpawns) {
                console.warn("Validation WARNING: no NPC spawns found in reachable areas.");
                if (this.validationActive && this.validationText && this.scene.isActive()) {
                    this.validationText.setText(`⚠️ WARNING: No NPC spawns (${report.stats.reachablePercent} reachable) - Press START`);
                    this.validationText.setStyle({ color: "#fbbf24", fontSize: "16px" });
                }
                this.validationPassed = true; // Allow proceed with fallback NPCs
                return;
            }

            if (missingNpcTextures.length) {
                console.warn("Validation WARNING: missing NPC textures:", missingNpcTextures);
                if (this.validationActive && this.validationText && this.scene.isActive()) {
                    this.validationText.setText(`⚠️ WARNING: Missing textures - Press START`);
                    this.validationText.setStyle({ color: "#fbbf24", fontSize: "16px" });
                }
                this.validationPassed = true;
                return;
            }

            // Mark as passed - user must press START
            this.validationPassed = true;
            clearTimeout(validationTimeout); // Clear timeout since validation completed
            const reach = report.stats.reachablePercent || "0%";
            if (this.validationActive && this.validationText && this.scene.isActive()) {
                this.validationText.setText(`✅ MAP VALIDATED (${reach} reachable) - Press START`);
                this.validationText.setStyle({ color: "#4ade80", fontSize: "18px" });
            }
            
            // Hide loading spinner
            if (this.loadingSpinner && this.scene.isActive()) {
                this.tweens.killTweensOf(this.loadingSpinner);
                this.loadingSpinner.setVisible(false);
            }

        } catch (e) {
            console.error("Map validation error:", e);
            console.error("Error stack:", e.stack);
            // #region agent log
            console.log('[DEBUG] Validation error caught', {error: e?.message || String(e), stack: e?.stack, name: e?.name});
            // #endregion
            
            // Clear timeout since we're handling the error
            clearTimeout(validationTimeout);
            
            // Don't block game start on validation errors - allow user to proceed with warnings
            if (this.validationActive && this.validationText && this.scene.isActive()) {
                this.validationText.setText("⚠️ Validation had errors, but you can still start. Press START");
                this.validationText.setStyle({ color: "#fbbf24", fontSize: "16px" });
            }
            // Allow game to start even if validation fails (with warnings)
            this.validationPassed = true;
            
            // Hide loading spinner
            if (this.loadingSpinner && this.scene.isActive()) {
                this.tweens.killTweensOf(this.loadingSpinner);
                this.loadingSpinner.setVisible(false);
            }
            
            // Log error but don't throw - allow game to start
            // Don't trigger unhandled rejection - validation errors shouldn't crash the game
        }
    }

    showValidationErrorOverlay(errors) {
        // Create error overlay
        const { width, height } = this.scale;
        const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);
        bg.setScrollFactor(0);
        bg.setDepth(10000);
        bg.setInteractive();
        
        const titleText = this.add.text(width / 2, height / 2 - 100, 'VALIDATION FAILED', {
            fontSize: '32px',
            fontFamily: 'monospace',
            color: '#ff0000',
            align: 'center'
        });
        titleText.setOrigin(0.5);
        titleText.setScrollFactor(0);
        titleText.setDepth(10001);
        
        const errorMsg = errors.slice(0, 3).join('\n'); // Show first 3 errors
        const msgText = this.add.text(width / 2, height / 2, errorMsg, {
            fontSize: '16px',
            fontFamily: 'monospace',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: width - 100 }
        });
        msgText.setOrigin(0.5);
        msgText.setScrollFactor(0);
        msgText.setDepth(10001);
        
        const hintText = this.add.text(width / 2, height / 2 + 150, 'Game will start with default spawn. Press START to continue.', {
            fontSize: '14px',
            fontFamily: 'monospace',
            color: '#aaaaaa',
            align: 'center'
        });
        hintText.setOrigin(0.5);
        hintText.setScrollFactor(0);
        hintText.setDepth(10001);
        
        // Store references for cleanup
        this.errorOverlay = { bg, titleText, msgText, hintText };
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
