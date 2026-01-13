import NotebookUI from '../ui/NotebookUI.js';
import EvidenceModal from '../ui/EvidenceModal.js';
import InterrogationUI from '../ui/InterrogationUI.js';
import DemoPanel from '../ui/DemoPanel.js';
import {
    loadGameState,
    upsertEvidence,
    setContradictions,
    setSuspectMeta,
    addTimelineEvent,
    adjustScore,
    setBestScore
} from '../ui/gameState.js';
import { checkContradictions } from '../api.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('Game');
    }

    create() {
        loadGameState();
        this.caseSolution = {
            culpritId: 'suspect_1',
            explanation: 'The suspect had access, motive, and left a paper trail.'
        };

        // --- 1. Map & Bounds ---
        console.log("Game.create started");
        if (!this.cache.tilemap.exists('city_map')) {
            console.error("Game Scene: 'city_map' key not found in cache. Map loading was disabled or failed.");
            this.add.text(100, 100, "DEBUG MODE: MAP DISABLED", { fontSize: '32px', color: '#ff0000' });
            return; // Stop here to prevent crash
        }

        console.log("Game.create: Making tilemap...");
        let map; // Hoist for use outside try-catch
        try {
            map = this.make.tilemap({ key: 'city_map' });
            console.log("Game.create: Tilemap created successfully. Layers found:", map.layers.map(l => l.name));

            // Add Tilesets: addTilesetImage(tilesetNameInTiled, phaserKey)
            console.log("Game.create: Adding tilesets...");
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
            ].filter(t => {
                if (!t) console.warn("Game.create: Failed to add a tileset image.");
                return t !== null;
            });
            console.log(`Game.create: ${tilesets.length} tilesets loaded.`);

            // Create Layers
            const layerNames = ['Trn_1', 'Trn_2', 'Trn_3', 'Bldg_1', 'Bldg_2', 'Bldg_3', 'Bldg_4'];
            console.log("Game.create: Creating layers...");

            this.layers = {};
            layerNames.forEach(name => {
                console.log(`Game.create: Processing layer ${name}...`);
                const layer = map.createLayer(name, tilesets, 0, 0);
                if (layer) {
                    this.layers[name] = layer;
                    if (name.startsWith('Bldg')) {
                        layer.setCollisionByExclusion([-1]);
                        console.log(`Game.create: Enabled collision for ${name}`);
                    }
                    console.log(`Game.create: Layer ${name} created.`);
                } else {
                    console.warn(`Game.create: Layer ${name} not created (not found in map?).`);
                }
            });
            console.log("Game.create: Layers done.");

            // World Bounds
            this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
            this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
            console.log("Game.create: Bounds set to", map.widthInPixels, map.heightInPixels);

        } catch (error) {
            console.error("Game.create FATAL ERROR:", error);
            return; // Stop here on fatal error
        }

        // --- 2. Collisions ---
        // For this new map, we'll auto-collide with the "Buildings" layer if it exists,
        // or just create some bounds since we valid TMX data now but maybe no explicit "Collision" object layer.
        this.walls = this.physics.add.staticGroup();
        // Setup collision for tiles?
        // map.setCollisionByProperty({ collides: true }); 

        // --- 3. Entities (Spawn Points) ---
        // Just spawn in middle for now if no "Entities" layer found
        // Use a safer street coordinate (approximate based on map)
        const spawnX = 200;
        const spawnY = 300; // Street level, top-left ish

        this.player = this.physics.add.sprite(spawnX, spawnY, 'detective');
        this.player.setScale(1.0);
        this.player.body.setSize(48, 36);
        this.player.body.setOffset(24, 60);
        this.player.setCollideWorldBounds(true);
        this.player.setDepth(10);
        this.lastDirection = 'down'; // Track direction for idle

        // Collide with all building layers
        Object.keys(this.layers).forEach(key => {
            if (key.startsWith('Bldg')) {
                this.physics.add.collider(this.player, this.layers[key]);
            }
        });
        this.physics.add.collider(this.player, this.walls);

        // --- 4. Interactables (Evidence / Suspects) ---
        this.interactables = this.physics.add.staticGroup();
        const interactLayer = map.getObjectLayer('Interactables');
        this.interactionTarget = null;
        this.interactionType = null;
        this.evidenceCatalog = [];
        this.suspectCatalog = [];
        this.suspectLocations = {};

        if (interactLayer) {
            interactLayer.objects.forEach((obj) => {
                const { x, y } = getObjectCenter(obj);
                const kind = getProp(obj, 'kind');
                const id = getProp(obj, 'id') || getProp(obj, 'evidenceId') || obj.name || `obj_${obj.id}`;
                const title = getProp(obj, 'title') || obj.name || id;
                const image = getProp(obj, 'image');
                const portrait = getProp(obj, 'portrait');

                if (obj.name === 'desk') {
                    const prop = this.add.image(x, y, 'detective_props');
                    prop.setCrop(0, 0, 96, 64);
                    prop.setDepth(5);
                }

                const zone = this.add.rectangle(x, y, obj.width, obj.height, 0x00ff00, 0);
                this.physics.add.existing(zone, true);
                zone.setData('kind', kind);
                zone.setData('id', id);
                zone.setData('title', title);
                zone.setData('image', image);
                zone.setData('portrait', portrait);
                zone.setData('metadata', {
                    width: obj.width,
                    height: obj.height,
                    sourceLayer: 'Interactables'
                });

                this.interactables.add(zone);

                if (kind === 'evidence') {
                    this.evidenceCatalog.push({ id, title, image });
                }
                if (kind === 'suspect') {
                    this.suspectCatalog.push({ id, name: title, portrait });
                    this.suspectLocations[id] = { x, y };
                    setSuspectMeta(id, { id, name: title, portrait });
                }
            });
        } else {
            console.log("Game.create: No 'Interactables' layer found. Spawning mock evidence.");
            // Mock Evidence 1: A suspicious letter near spawn
            const mockX = spawnX + 100;
            const mockY = spawnY;
            const zone = this.add.rectangle(mockX, mockY, 32, 32, 0x00ff00, 0.5);
            this.physics.add.existing(zone, true);

            zone.setData('kind', 'evidence');
            zone.setData('id', 'mock_letter');
            zone.setData('title', 'Suspicious Letter');
            zone.setData('image', 'evidence_paper'); // Placeholder key
            zone.setData('metadata', { description: "A crumpled letter with strange symbols." });

            this.interactables.add(zone);
            this.evidenceCatalog.push({ id: 'mock_letter', title: 'Suspicious Letter', image: 'evidence_paper' });

            this.add.text(mockX - 40, mockY - 40, "EVIDENCE", { fontSize: '12px', color: '#00ff00' });
        }

        // --- 5. Transitions (Doors) ---
        this.transitions = this.physics.add.staticGroup();
        const transitionLayer = map.getObjectLayer('Transition');
        if (transitionLayer) {
            transitionLayer.objects.forEach((obj) => {
                const { x, y } = getObjectCenter(obj);
                const zone = this.add.rectangle(x, y, obj.width, obj.height, 0x00ffff, 0);
                this.physics.add.existing(zone, true);
                zone.setData('target', getProp(obj, 'target'));
                zone.setData('spawn', getProp(obj, 'spawn'));
                this.transitions.add(zone);
            });
        }

        // --- 6. Prompt ---
        this.promptText = this.add.text(16, 16, 'Press E to interact', {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#ffffff',
            backgroundColor: '#000000aa',
            padding: { x: 6, y: 4 }
        });
        this.promptText.setScrollFactor(0);
        this.promptText.setDepth(1000);
        this.promptText.setVisible(false);

        // --- 7. Camera ---
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setZoom(1.0); // Reduce zoom to see more context

        // --- 8. Input ---
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,A,S,D');
        this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

        // --- 9. UI ---
        this.notebookUI = new NotebookUI();
        this.notebookUI.setAccuseHandler((suspectId) => this.handleAccuse(suspectId));
        this.evidenceModal = new EvidenceModal();
        this.interrogationUI = new InterrogationUI();
        this.demoPanel = new DemoPanel({
            onJump: (id) => this.jumpToSuspect(id),
            onAddEvidence: () => this.addAllEvidenceToNotebook(),
            onCheckContradictions: () => this.runContradictionCheck(),
            onAutoWin: () => this.handleAccuse(this.caseSolution.culpritId)
        });
        this.demoPanel.setSuspects(this.suspectCatalog);
        this.createEndingOverlay();

        // --- 10. Rain FX ---
        this.createRain();
    }

    update() {
        if (this.endingVisible || this.evidenceModal.isOpen || this.interrogationUI.isOpen) {
            this.player.setVelocity(0);
            return;
        }

        this.interactionTarget = null;
        this.interactionType = null;

        this.physics.world.overlap(this.player, this.interactables, (_, item) => {
            if (!this.interactionTarget) {
                this.interactionTarget = item;
                this.interactionType = 'interactable';
            }
        });

        if (!this.interactionTarget) {
            this.physics.world.overlap(this.player, this.transitions, (_, item) => {
                if (!this.interactionTarget) {
                    this.interactionTarget = item;
                    this.interactionType = 'transition';
                }
            });
        }

        if (this.interactionTarget) {
            this.promptText.setVisible(true);
            this.promptText.setText(this.interactionType === 'transition' ? 'Press E to travel' : 'Press E to interact');
        } else {
            this.promptText.setVisible(false);
        }

        // Movement
        this.player.setVelocity(0);
        const speed = 180;
        let moving = false;

        if (this.cursors.left.isDown || this.wasd.A.isDown) {
            this.player.setVelocityX(-speed);
            this.player.anims.play('walk-left', true);
            this.lastDirection = 'left';
            moving = true;
        } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
            this.player.setVelocityX(speed);
            this.player.anims.play('walk-right', true);
            this.lastDirection = 'right';
            moving = true;
        } else if (this.cursors.up.isDown || this.wasd.W.isDown) {
            this.player.setVelocityY(-speed);
            this.player.anims.play('walk-up', true);
            this.lastDirection = 'up';
            moving = true;
        } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
            this.player.setVelocityY(speed);
            this.player.anims.play('walk-down', true);
            this.lastDirection = 'down';
            moving = true;
        }

        if (!moving) {
            // Play idle animation matching last direction
            this.player.anims.play(`idle-${this.lastDirection}`, true);
            this.player.setVelocity(0);
        }

        // Interaction
        if (this.interactionTarget && Phaser.Input.Keyboard.JustDown(this.keyE)) {
            if (this.interactionType === 'interactable') {
                const kind = this.interactionTarget.data.get('kind');
                const id = this.interactionTarget.data.get('id');
                const title = this.interactionTarget.data.get('title');
                const image = this.interactionTarget.data.get('image');
                const portrait = this.interactionTarget.data.get('portrait');
                const metadata = this.interactionTarget.data.get('metadata');
                this.handleInteractable(kind, { id, title, image, portrait, metadata });
            } else if (this.interactionType === 'transition') {
                this.handleTransition(this.interactionTarget);
            }
        }
    }

    handleInteractable(kind, data) {
        if (kind === 'evidence') {
            const entry = {
                id: data.id,
                title: data.title,
                image: data.image,
                metadata: data.metadata
            };
            upsertEvidence(entry);
            addTimelineEvent({ text: `Evidence collected: ${data.title || data.id}` });
            this.evidenceModal.open(entry);
            return;
        }
        if (kind === 'suspect') {
            setSuspectMeta(data.id, { id: data.id, name: data.title, portrait: data.portrait });
            addTimelineEvent({ text: `Approached suspect: ${data.title || data.id}` });
            this.interrogationUI.open({
                id: data.id,
                name: data.title,
                portrait: data.portrait
            });
            return;
        }
        this.showDialog('Nothing interesting here.');
    }

    handleTransition(zone) {
        const target = zone.data.get('target');
        const spawn = zone.data.get('spawn');
        const spawnPoint = this.spawnPoints[spawn];
        if (!spawnPoint) {
            this.showDialog('Destination not found.');
            return;
        }
        this.player.setPosition(spawnPoint.x, spawnPoint.y);
        this.player.body.stop();
        addTimelineEvent({ text: `Traveled to ${target || 'a new area'}.` });
    }

    jumpToSuspect(suspectId) {
        const location = this.suspectLocations[suspectId];
        if (!location) {
            this.showDialog('Suspect location unavailable.');
            return;
        }
        this.player.setPosition(location.x, location.y);
        this.player.body.stop();
    }

    addAllEvidenceToNotebook() {
        this.evidenceCatalog.forEach((entry) => {
            upsertEvidence({
                ...entry,
                summary: 'Logged by Demo Panel.'
            });
        });
        addTimelineEvent({ text: 'Demo: Added all evidence.' });
    }

    async runContradictionCheck() {
        try {
            const state = loadGameState();
            const statements = [];
            Object.values(state.suspects || {}).forEach((suspect) => {
                (suspect.statements || []).forEach((statement) => {
                    statements.push({
                        suspectId: suspect.id,
                        speaker: statement.from,
                        text: statement.text,
                        timestamp: statement.timestamp
                    });
                });
            });
            const response = await checkContradictions({ statements });
            setContradictions(response.contradictions || []);
        } catch (error) {
            this.showDialog(`Contradiction check failed: ${error.message}`);
        }
    }

    handleAccuse(suspectId) {
        const correct = suspectId === this.caseSolution.culpritId;
        if (!correct) {
            adjustScore(-20);
        }
        const state = loadGameState();
        setBestScore(state.score);
        const updatedState = loadGameState();
        this.showEndingOverlay({
            verdict: correct ? 'Case Closed' : 'Wrong Accusation',
            explanation: correct ? this.caseSolution.explanation : 'The trail does not support this suspect.',
            contradictions: updatedState.contradictions || [],
            score: updatedState.score,
            bestScore: updatedState.bestScore
        });
    }

    createEndingOverlay() {
        if (document.getElementById('ending-overlay')) {
            this.endingOverlay = document.getElementById('ending-overlay');
            this.endingPanel = this.endingOverlay.querySelector('.ending-panel');
            return;
        }
        const style = document.createElement('style');
        style.textContent = `
            .ending-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.75);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2400;
                font-family: "Courier New", Courier, monospace;
                color: #f5f1e5;
            }
            .ending-overlay.hidden { display: none; }
            .ending-panel {
                width: min(640px, 90vw);
                border: 2px solid #b4945a;
                background: #1c1913;
                padding: 18px;
            }
            .ending-panel h2 {
                margin: 0 0 10px 0;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .ending-panel button {
                margin-top: 12px;
                background: #b4945a;
                border: none;
                padding: 8px 12px;
                cursor: pointer;
            }
            .ending-list {
                padding-left: 18px;
                margin: 8px 0;
            }
        `;
        document.head.appendChild(style);

        const overlay = document.createElement('div');
        overlay.id = 'ending-overlay';
        overlay.className = 'ending-overlay hidden';
        const panel = document.createElement('div');
        panel.className = 'ending-panel';
        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        this.endingOverlay = overlay;
        this.endingPanel = panel;
    }

    showEndingOverlay({ verdict, explanation, contradictions, score, bestScore }) {
        this.endingVisible = true;
        this.endingPanel.innerHTML = '';
        const title = document.createElement('h2');
        title.textContent = verdict;
        this.endingPanel.appendChild(title);

        const summary = document.createElement('div');
        summary.textContent = explanation;
        this.endingPanel.appendChild(summary);

        const scoreEl = document.createElement('div');
        scoreEl.textContent = `Score: ${score} (Best: ${bestScore})`;
        this.endingPanel.appendChild(scoreEl);

        const listTitle = document.createElement('div');
        listTitle.textContent = 'Contradictions Summary';
        this.endingPanel.appendChild(listTitle);

        const list = document.createElement('ul');
        list.className = 'ending-list';
        if (contradictions.length) {
            contradictions.forEach((item) => {
                const li = document.createElement('li');
                li.textContent = item.text || 'Contradiction';
                list.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.textContent = 'No contradictions recorded.';
            list.appendChild(li);
        }
        this.endingPanel.appendChild(list);

        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.addEventListener('click', () => {
            this.endingOverlay.classList.add('hidden');
            this.endingVisible = false;
        });
        this.endingPanel.appendChild(closeButton);

        this.endingOverlay.classList.remove('hidden');
    }

    showDialog(text) {
        const box = document.getElementById('dialog-box');
        const content = document.getElementById('dialog-text');
        box.style.display = 'block';
        content.innerText = text;
        setTimeout(() => box.style.display = 'none', 3000);
    }

    createRain() {
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(0xaaaaaa, 0.5);
        graphics.fillRect(0, 0, 2, 10);
        graphics.generateTexture('rain_drop', 2, 10);

        // Fixed rain emitter for modern Phaser 3 (camera-locked)
        const rain = this.add.particles(0, 0, 'rain_drop', {
            x: { min: -100, max: 1200 }, // Cover the screen horizontally
            y: -50,                      // Start slightly above screen
            lifespan: 1500,
            speedY: { min: 400, max: 600 },
            speedX: { min: -10, max: 10 },
            scale: { start: 1, end: 1 },
            quantity: 2,
            blendMode: 'ADD'
        });
        rain.setScrollFactor(0);
        rain.setDepth(100); // Ensure it's on top
    }
}

function getObjectCenter(obj) {
    // Tiled objects (non-point) have origin at top-left, but Phaser often wants center for physics bodies if we used sprites.
    // But for Zones, we usually position them where Tiled says. 
    // Wait, Tiled objects with (x,y) are top-left? 
    // Actually, let's just stick to Tiled coordinates.
    // But verify if the existing code expects center.
    // The previous code used getObjectCenter, so I should provide it.
    return { x: obj.x + obj.width / 2, y: obj.y + obj.height / 2 };
}

function getProp(obj, key) {
    if (!obj.properties) return null;
    const p = obj.properties.find(p => p.name === key);
    return p ? p.value : null;
}
