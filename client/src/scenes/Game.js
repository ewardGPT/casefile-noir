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
import { MapDebugOverlay } from '../utils/mapDebugOverlay.js';
import { AStarPathfinder } from '../utils/astarPathfinding.js';
import { NPCController } from '../utils/npcController.js';
import { AudioManager } from '../utils/audioManager.js';
import { DayNightCycle } from '../utils/dayNightCycle.js';
import { Minimap } from '../utils/minimap.js';
import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
    // STEP 2: NPC size + hitbox constants
    static NPC_SCALE = 1.0;
    static NPC_BODY_W = 16;
    static NPC_BODY_H = 16;
    static NPC_BODY_OFFSET_X = 8;
    static NPC_BODY_OFFSET_Y = 16;

    constructor() {
        super('Game');
    }

    init(data) {
        console.log("Game.init started with data:", data);
        this.mapDebugData = data?.mapDebugData || this.registry.get("mapDebugData") || {};

        // --- NPC DIAGNOSTICS (User Step 1-8) ---
        // Step 1: will happen in create (layer logging)
        // Step 4: Texture check
        console.log("---- DIAGNOSTIC STEP 4: TEXTURES ----");
        this.textures.each((t) => {
            if (t.key.startsWith('npc_') || t.key === 'detective') {
                console.log(`Texture found: ${t.key}`);
            }
        });
    }

    create() {
        // Update QA scene tracking
        if (window.__QA__) {
            window.__QA__.updateScene('Game');
        }

        // Defensive check: clean up existing state if scene is restarting
        if (this.input && this.input.keyboard) {
            this.input.keyboard.removeAllListeners();
        }
        if (this.time) {
            this.time.removeAllEvents();
        }
        if (this.tweens) {
            this.tweens.killAll();
        }
        if (this.cameras && this.cameras.main) {
            this.cameras.main.stopFollow();
        }

        // Clean up NPCs from previous run
        if (this.npcs) {
            this.npcs.forEach(npc => {
                if (npc.controller) npc.controller = null;
                if (npc.debugText) npc.debugText.destroy();
            });
            this.npcs = [];
        }

        // Load sound toggle state
        this.soundEnabled = localStorage.getItem('soundEnabled') !== 'false'; // Default to true

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
            this.map = map;
            console.log("Game.create: Tilemap created successfully. Layers found:", map.layers.map(l => l.name));
            const tileLayerNames = map.layers.map(l => l.name);
            const objectLayerNames = map.objects ? map.objects.map(o => o.name) : [];
            const allLayerNames = [...tileLayerNames, ...objectLayerNames];
            console.log("NPC DEBUG: All Tiled layer names:", allLayerNames);

            const findClosestLayerNames = (target, names) => {
                const loweredTarget = target.toLowerCase();
                const scored = names.map((name) => {
                    const lower = name.toLowerCase();
                    let score = 0;
                    if (lower.includes(loweredTarget)) score += 100;
                    for (let i = 0; i < Math.min(lower.length, loweredTarget.length); i++) {
                        if (lower[i] === loweredTarget[i]) score += 1;
                    }
                    score -= Math.abs(lower.length - loweredTarget.length);
                    return { name, score };
                });
                return scored.sort((a, b) => b.score - a.score).slice(0, 3).map((item) => item.name);
            };

            const npcLayer = map.getObjectLayer('NPCs');
            if (!npcLayer) {
                const closest = findClosestLayerNames('NPCs', objectLayerNames);
                console.warn("NPC DEBUG: No object layer named 'NPCs'. Closest object layers:", closest);
            } else {
                console.log(`NPC DEBUG: 'NPCs' layer found with ${npcLayer.objects.length} objects.`);
                this.npcExpectedKeys = [];
                npcLayer.objects.forEach((obj, idx) => {
                    const props = {};
                    (obj.properties || []).forEach((prop) => {
                        props[prop.name] = prop.value;
                    });
                    console.log(
                        `NPC DEBUG [${idx}]: name=${obj.name || '(none)'} type=${obj.type || '(none)'} x=${obj.x} y=${obj.y}`,
                        props
                    );
                    const spriteKey = props.spriteKey || props.npcKey || props.npcType || obj.type || obj.name;
                    const resolvedKey = spriteKey ? this.resolveNpcTextureKey(spriteKey) : null;
                    if (resolvedKey) {
                        this.npcExpectedKeys.push(resolvedKey);
                    }
                    if (resolvedKey) {
                        const hasTexture = this.textures.exists(resolvedKey);
                        console.log(`NPC DEBUG: texture check for '${resolvedKey}':`, hasTexture ? 'OK' : 'MISSING');
                        if (!hasTexture) {
                            console.warn("NPC DEBUG: Loaded texture keys:", Object.keys(this.textures.list));
                        }
                    } else {
                        console.warn("NPC DEBUG: No spriteKey found for NPC object. Loaded texture keys:", Object.keys(this.textures.list));
                    }
                });
            }

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
            // Create Layers
            console.log("Game.create: Creating layers...");
            this.layers = {};
            this.collidableLayers = [];

            // Dynamically load all layers from the map
            map.layers.forEach(layerData => {
                const name = layerData.name;

                // Skip if it is an object layer (Phaser map.layers usually only contains tile layers, but good to check)
                // Actually map.layers might contain all.

                console.log(`Game.create: Processing layer ${name}...`);
                const layer = map.createLayer(name, tilesets, 0, 0);
                if (layer) {
                    this.layers[name] = layer;

                    const normalizedName = name.toLowerCase();
                    const isSafe = normalizedName.includes('ground') || normalizedName.includes('floor') ||
                        normalizedName.includes('street') || normalizedName.includes('path') ||
                        normalizedName.includes('grass') || normalizedName.includes('sand') ||
                        normalizedName.includes('water') || normalizedName.includes('dirt') ||
                        normalizedName.includes('stair') || normalizedName.includes('step') ||
                        normalizedName.includes('walk') || normalizedName.includes('road') ||
                        normalizedName.includes('porch') || normalizedName.includes('entrance') ||
                        name.startsWith('Terrain') || name.startsWith('Trn_') || name.startsWith('Bkg');

                    const forceBlocked = false; // Disabled force block

                    if ((!isSafe || forceBlocked) && name !== 'Trn_1' && name !== 'Trn_2') {
                        // It's a wall, building, roof, prop, deco, etc.
                        // Use setCollisionByExclusion to ensure no micro gaps - all non-empty tiles collide
                        layer.setCollisionByExclusion([-1]);
                        // Ensure collision is enabled
                        layer.setCollisionByProperty({ collides: true }, true);
                        console.log(`Game.create: BLOCKED layer ${name}`);
                        this.collidableLayers.push(layer);

                        // Set depth high for "overhead" layers like Roofs, but watch out for Trees hiding player.
                        if (name.includes('Roof') || name.includes('Top')) {
                            layer.setDepth(15);
                        }
                    } else {
                        console.log(`Game.create: SAFE layer ${name}`);
                    }
                } else {
                    console.warn(`Game.create: Layer ${name} not created.`);
                }
            });
            console.log("Game.create: Layers done.");

            // World Bounds - Always match map size exactly
            const mapWidth = map.widthInPixels;
            const mapHeight = map.heightInPixels;
            this.physics.world.setBounds(0, 0, mapWidth, mapHeight);
            this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
            // Store bounds for validation
            this.mapBounds = { width: mapWidth, height: mapHeight };
            console.log("Game.create: Bounds set to", mapWidth, mapHeight);
            this.mapLoaded = true;

            // --- INITIALIZE MAP DATA FOR TILE GUARD EARLY ---
            const debugData = this.mapDebugData || {};
            if (debugData.blocked && debugData.mapW && debugData.mapH) {
                if (!this.astar) {
                    this.astar = new AStarPathfinder(debugData.mapW, debugData.mapH, debugData.blocked);
                }
                // STORE FOR TILE GUARD
                this.blockedTiles = debugData.blocked;
                this.mapTileWidth = debugData.tw || this.map?.tileWidth || 32;
                this.mapTileHeight = debugData.th || this.map?.tileHeight || 32;
                this.mapW = debugData.mapW;
                this.mapH = debugData.mapH;
                console.log(`Game.create: Blocked tiles initialized (${this.mapW}x${this.mapH})`);
            }

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
        // STEP 1: Player spawn MUST come from Tiled object layer "Entities" object named "Player" or "PlayerSpawn"
        let spawnX, spawnY;
        let spawnSource = 'UNKNOWN';

        // Get tile dimensions (use map directly since mapTileWidth/Height may not be set yet)
        const tileW = map.tileWidth || 32;
        const tileH = map.tileHeight || 32;

        const entitiesLayer = map.getObjectLayer('Entities');
        if (entitiesLayer && entitiesLayer.objects) {
            // Find Player or PlayerSpawn object
            const playerSpawnObj = entitiesLayer.objects.find(obj =>
                obj.name === 'Player' || obj.name === 'PlayerSpawn'
            );

            if (playerSpawnObj) {
                // Use object center coordinates
                const center = getObjectCenter(playerSpawnObj);
                spawnX = center.x;
                spawnY = center.y;
                spawnSource = `Tiled Entities layer: ${playerSpawnObj.name}`;

                // Validate spawn is not in blocked tile (only if blockedTiles is initialized)
                if (this.blockedTiles && this.mapW && this.mapH) {
                    const tileX = Math.floor(spawnX / tileW);
                    const tileY = Math.floor(spawnY / tileH);
                    if (this.isTileBlocked(tileX, tileY)) {
                        console.error(`❌ VALIDATION FAIL: Player spawn at tile (${tileX}, ${tileY}) is BLOCKED!`);
                        // Try to find nearest walkable tile
                        const nearest = this.findNearestWalkableTile(tileX, tileY);
                        if (nearest) {
                            spawnX = nearest.tx * tileW + tileW / 2;
                            spawnY = nearest.ty * tileH + tileH / 2;
                            spawnSource += ` (moved to walkable tile ${nearest.tx},${nearest.ty})`;
                            console.warn(`⚠️ Player spawn moved to walkable tile: (${nearest.tx}, ${nearest.ty})`);
                        } else {
                            console.error(`❌ CRITICAL: No walkable tile near spawn! Using fallback.`);
                            spawnX = 200;
                            spawnY = 300;
                            spawnSource = 'FALLBACK (no walkable tile near spawn)';
                        }
                    }
                }
            } else {
                // Check if there's any object in Entities layer as fallback
                if (entitiesLayer.objects.length > 0) {
                    const firstObj = entitiesLayer.objects[0];
                    const center = getObjectCenter(firstObj);
                    spawnX = center.x;
                    spawnY = center.y;
                    spawnSource = `FALLBACK: First object in Entities layer (${firstObj.name || 'unnamed'})`;
                    console.warn(`⚠️ WARNING: No "Player" or "PlayerSpawn" object found in Entities layer. Using first object: ${firstObj.name || 'unnamed'}`);

                    if (this.blockedTiles && this.mapW && this.mapH) {
                        const tileX = Math.floor(spawnX / tileW);
                        const tileY = Math.floor(spawnY / tileH);
                        if (this.isTileBlocked(tileX, tileY)) {
                            const nearest = this.findNearestWalkableTile(tileX, tileY);
                            if (nearest) {
                                spawnX = nearest.tx * tileW + tileW / 2;
                                spawnY = nearest.ty * tileH + tileH / 2;
                                spawnSource += ` (moved to walkable tile ${nearest.tx},${nearest.ty})`;
                            }
                        }
                    }
                } else {
                    spawnX = 200;
                    spawnY = 300;
                    spawnSource = 'FALLBACK (Entities layer empty)';
                    console.error(`❌ VALIDATION FAIL: Entities layer exists but has no objects! Using fallback.`);
                    if (this.blockedTiles && this.mapW && this.mapH) {
                        const nearest = this.findNearestWalkableTile(Math.floor(spawnX / tileW), Math.floor(spawnY / tileH));
                        if (nearest) {
                            spawnX = nearest.tx * tileW + tileW / 2;
                            spawnY = nearest.ty * tileH + tileH / 2;
                            spawnSource += ` (moved to walkable tile ${nearest.tx},${nearest.ty})`;
                        }
                    }
                }
            }
        } else {
            // No Entities layer - use hardcoded fallback
            spawnX = 200;
            spawnY = 300;
            spawnSource = 'FALLBACK (no Entities layer)';
            console.error(`❌ VALIDATION FAIL: No "Entities" object layer found! Using fallback.`);
            if (this.blockedTiles && this.mapW && this.mapH) {
                const nearest = this.findNearestWalkableTile(Math.floor(spawnX / tileW), Math.floor(spawnY / tileH));
                if (nearest) {
                    spawnX = nearest.tx * tileW + tileW / 2;
                    spawnY = nearest.ty * tileH + tileH / 2;
                    spawnSource += ` (moved to walkable tile ${nearest.tx},${nearest.ty})`;
                }
            }
        }

        // --- 3.5. Spawn Points Tracking ---
        this.spawnPoints = {};
        if (entitiesLayer && entitiesLayer.objects) {
            entitiesLayer.objects.forEach(obj => {
                if (obj.name) {
                    const center = getObjectCenter(obj);
                    this.spawnPoints[obj.name] = center;
                }
            });
        }

        // Log spawn coordinates
        const spawnTileX = Math.floor(spawnX / tileW);
        const spawnTileY = Math.floor(spawnY / tileH);
        console.log(`✅ Player spawn: ${spawnSource}`);
        console.log(`   Pixel coords: (${spawnX.toFixed(2)}, ${spawnY.toFixed(2)})`);
        console.log(`   Tile coords: (${spawnTileX}, ${spawnTileY})`);

        this.player = this.physics.add.sprite(spawnX, spawnY, 'detective');
        this.player.setScale(1.0);  // Same scale as NPCs (both 64x64 frames now)
        this.player.body.setSize(32, 24);  // Original size
        this.player.body.setOffset(16, 40);  // Original offset
        this.player.setCollideWorldBounds(true);
        this.player.setDepth(10);
        this.lastSafePos = new Phaser.Math.Vector2(spawnX, spawnY); // INITIALIZE FIX
        this.lastDirection = 'down'; // Track direction for idle

        // Validate bounds are set correctly
        if (this.mapBounds) {
            const worldBounds = this.physics.world.bounds;
            if (worldBounds.width !== this.mapBounds.width || worldBounds.height !== this.mapBounds.height) {
                console.warn(`Bounds mismatch! Resetting to map size.`);
                this.physics.world.setBounds(0, 0, this.mapBounds.width, this.mapBounds.height);
                this.cameras.main.setBounds(0, 0, this.mapBounds.width, this.mapBounds.height);
            }
        }

        // Collide with all layers that have collisions enabled
        (this.collidableLayers || []).forEach((layer) => {
            this.physics.add.collider(this.player, layer);
        });
        this.physics.add.collider(this.player, this.walls);

        // --- NPC Debug Markers + Spawn Probe ---
        const npcLayer = map.getObjectLayer('NPCs');
        if (npcLayer) {
            npcLayer.objects.forEach((obj) => {
                const center = getObjectCenter(obj);
                const marker = this.add.circle(center.x, center.y, 6, 0x00ff00, 0.9);
                marker.setDepth(1000);
            });
            const firstNpc = npcLayer.objects[0];
            if (firstNpc) {
                const spriteKey = getProp(firstNpc, 'spriteKey') || getProp(firstNpc, 'npcKey') || getProp(firstNpc, 'npcType') || firstNpc.type || firstNpc.name || 'npc_1';
                const resolvedKey = this.resolveNpcTextureKey(spriteKey);
                if (resolvedKey) {
                    console.log(`NPC DEBUG: Spawning probe NPC '${resolvedKey}' at player position.`);
                    if (!this.textures.exists(resolvedKey)) {
                        console.warn("NPC DEBUG: Probe NPC texture missing. Loaded keys:", Object.keys(this.textures.list));
                    } else {
                        const probe = this.add.sprite(this.player.x, this.player.y, resolvedKey);
                        probe.setDepth(999);
                        this.time.delayedCall(1500, () => probe.destroy());
                    }
                }
            }
        } else {
            const fallbackKey = 'npc_1';
            console.log(`NPC DEBUG: Spawning fallback probe NPC '${fallbackKey}' at player position.`);
            if (!this.textures.exists(fallbackKey)) {
                console.warn("NPC DEBUG: Fallback probe texture missing. Loaded keys:", Object.keys(this.textures.list));
            } else {
                const probe = this.add.sprite(this.player.x, this.player.y, fallbackKey);
                probe.setDepth(999);
                this.time.delayedCall(1500, () => probe.destroy());
            }
        }

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
            fontFamily: "'Georgia', serif",
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
        this.lastTrailTime = 0;

        // Debug Physics Toggle - store references for cleanup
        this.f3Handler = () => {
            if (this.physics.world.drawDebug) {
                this.physics.world.drawDebug = false;
                if (this.physics.world.debugGraphic) {
                    this.physics.world.debugGraphic.clear();
                }
            } else {
                this.physics.world.createDebugGraphic();
                this.physics.world.drawDebug = true;
            }
        };
        this.input.keyboard.on('keydown-F3', this.f3Handler);

        // NPC Debug Toggle (F4)
        this.f4Handler = () => {
            if (this.npcDebugActive) {
                this.npcDebugActive = false;
                this.hideNPCDebug();
            } else {
                this.npcDebugActive = true;
                this.showNPCDebug();
            }
        };
        this.input.keyboard.on('keydown-F4', this.f4Handler);

        // Path Debug Toggle (F5) - STEP 3
        this.pathDebugActive = false;
        this.f5Handler = () => {
            this.pathDebugActive = !this.pathDebugActive;
            if (this.pathDebugActive) {
                console.log('Path debug enabled - showing NPC paths');
            } else {
                console.log('Path debug disabled');
            }
        };
        this.input.keyboard.on('keydown-F5', this.f5Handler);

        // Dev Health Check (F6)
        this.f6Handler = () => {
            this.debugHealthReport();
        };
        this.input.keyboard.on('keydown-F6', this.f6Handler);

        // --- 8.5. Audio System (STEP 4) ---
        this.audio = new AudioManager(this);

        // Start ambient music (if available)
        // Note: Audio files need to be loaded in Boot.js
        // For now, we'll start them if they exist
        if (this.sound.get('noir_ambient_music')) {
            this.audio.playMusic('noir_ambient_music');
        }
        if (this.sound.get('rain_ambient')) {
            // Rain ambient can play alongside music
            const rainSound = this.sound.get('rain_ambient');
            if (rainSound) {
                rainSound.setLoop(true);
                rainSound.setVolume(this.audio.muted ? 0 : this.audio.volumes.master * this.audio.volumes.music * 0.3);
                rainSound.play();
            }
        }

        // K key to mute/unmute (Moved from M)
        this.muteHandler = () => {
            const muted = this.audio.toggleMute();
            console.log(`Audio ${muted ? 'muted' : 'unmuted'}`);
        };
        this.input.keyboard.on('keydown-K', this.muteHandler);

        // --- 8.6. Day/Night Cycle System (STEP 5) ---
        this.dayNightCycle = new DayNightCycle(this);
        this.dayNightCycle.init();

        // --- 8.7. Minimap System (STEP 6) ---
        this.minimap = new Minimap(this);
        this.minimap.init();

        // M key toggle full map
        this.mHandler = () => {
            if (this.minimap) {
                const isFull = this.minimap.toggleFullMap();
                console.log(`Full Map ${isFull ? 'enabled' : 'disabled'}`);
            }
        };
        this.input.keyboard.on('keydown-M', this.mHandler);

        // F7 toggle minimap visibility
        this.f7Handler = () => {
            const enabled = this.minimap.toggle();
            console.log(`Minimap ${enabled ? 'visible' : 'hidden'}`);
        };
        this.input.keyboard.on('keydown-F7', this.f7Handler);

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

        // --- 10.5. Noir Overlay (Grain + Vignette) ---
        this.createNoirOverlay();

        // --- 11. NPCs ---
        this.npcs = [];
        this.spawnNPCs();
        if (import.meta && import.meta.env && import.meta.env.DEV) {
            this.debugHealthReport();
        }

        // --- 12. Debug Overlay (F2 toggle) ---
        const debugData = this.registry.get("mapDebugData");
        if (debugData) {
            this.mapDebugOverlay = new MapDebugOverlay(this, debugData);
            this.f2Handler = () => {
                if (this.mapDebugOverlay) {
                    this.mapDebugOverlay.toggle();
                }
            };
            this.input.keyboard.on("keydown-F2", this.f2Handler);
            console.log("🗺️ Debug overlay ready: press F2 to toggle");
        }
    }

    shutdown() {
        // Clean up keyboard listeners
        if (this.input && this.input.keyboard) {
            if (this.f2Handler) {
                this.input.keyboard.off("keydown-F2", this.f2Handler);
            }
            if (this.f3Handler) {
                this.input.keyboard.off("keydown-F3", this.f3Handler);
            }
            if (this.f4Handler) {
                this.input.keyboard.off("keydown-F4", this.f4Handler);
            }
            if (this.f5Handler) {
                this.input.keyboard.off("keydown-F5", this.f5Handler);
            }
            if (this.f6Handler) {
                this.input.keyboard.off("keydown-F6", this.f6Handler);
            }
            if (this.muteHandler) {
                this.input.keyboard.off("keydown-M", this.muteHandler);
            }
            if (this.f7Handler) {
                this.input.keyboard.off("keydown-F7", this.f7Handler);
            }
        }

        // Stop camera follow
        if (this.cameras && this.cameras.main) {
            this.cameras.main.stopFollow();
        }

        // Clean up timed events
        if (this.time) {
            this.time.removeAllEvents();
        }

        // Clean up tweens
        if (this.tweens) {
            this.tweens.killAll();
        }

        // Clean up NPCs
        if (this.npcs) {
            this.npcs.forEach(npc => {
                if (npc.controller) {
                    npc.controller = null;
                }
                if (npc.debugText) {
                    npc.debugText.destroy();
                }
            });
            this.npcs = [];
        }

        // Clean up debug groups
        if (this.npcDebugGroup) {
            this.npcDebugGroup.clear(true, true);
            this.npcDebugGroup = null;
        }
        if (this.npcSpawnMarkers) {
            this.npcSpawnMarkers.clear(true, true);
            this.npcSpawnMarkers = null;
        }

        // Clean up debug overlay
        if (this.mapDebugOverlay) {
            this.mapDebugOverlay = null;
        }

        // Clean up noir overlay
        if (this.noirVignette) {
            this.noirVignette.destroy();
            this.noirVignette = null;
        }
        if (this.noirGrain) {
            this.noirGrain.destroy();
            this.noirGrain = null;
        }

        // Clean up path debug graphics
        if (this.pathDebugGraphics) {
            this.pathDebugGraphics.destroy();
            this.pathDebugGraphics = null;
        }

        // Clean up audio
        if (this.audio) {
            this.audio.destroy();
            this.audio = null;
        }

        // Clean up day/night cycle
        if (this.dayNightCycle) {
            this.dayNightCycle.destroy();
            this.dayNightCycle = null;
        }

        // Clean up minimap
        if (this.minimap) {
            this.minimap.destroy();
            this.minimap = null;
        }

        // Reset state
        this.npcDebugActive = false;
        this.pathDebugActive = false;
        this.mapLoaded = false;
    }


    spawnNPCsFallback() {
        console.log("Game: Spawning fallback NPCs...");
        const npcTypes = Array.from({ length: 35 }, (_, i) => `npc_${i + 1}`);
        const npcCount = 10;

        // Try to find safe spots around the player if no zones defined
        for (let i = 0; i < npcCount; i++) {
            let sx = this.player.x + Phaser.Math.Between(-400, 400);
            let sy = this.player.y + Phaser.Math.Between(-400, 400);

            const tx = this.map.worldToTileX(sx);
            const ty = this.map.worldToTileY(sy);

            if (this.isTileBlocked(tx, ty)) {
                const free = this.findNearestWalkableTile(tx, ty);
                if (free) {
                    const tileW = this.mapTileWidth || this.map?.tileWidth || 32;
                    const tileH = this.mapTileHeight || this.map?.tileHeight || 32;
                    sx = (free.tx * tileW) + (tileW / 2);
                    sy = (free.ty * tileH) + (tileH / 2);
                }
            }

            const npcKey = this.resolveNpcTextureKey(npcTypes[i % npcTypes.length]);
            const npc = this.physics.add.sprite(sx, sy, npcKey);
            // STEP 2: Apply normalized size + hitbox
            npc.setScale(GameScene.NPC_SCALE);
            npc.body.setSize(GameScene.NPC_BODY_W, GameScene.NPC_BODY_H);
            npc.body.setOffset(GameScene.NPC_BODY_OFFSET_X, GameScene.NPC_BODY_OFFSET_Y);
            npc.setPushable(true);
            npc.setCollideWorldBounds(true); // Ensure NPCs respect world bounds
            // Depth based on Y position for proper sorting
            npc.setDepth(npc.y);

            const controller = new NPCController(this, npc, this.astar, {
                speed: 40,
                wanderRadius: 100,
                minPauseMs: 1000,
                maxPauseMs: 4000
            });
            npc.controller = controller;
            npc.npcKey = npcKey;

            (this.collidableLayers || []).forEach(l => this.physics.add.collider(npc, l));
            this.physics.add.collider(npc, this.player);
            this.npcs.push(npc);
            controller.updateAnimation(0, 0);
        }
    }

    async spawnNPCs() {
        if (!this.mapLoaded) {
            console.warn("Game.spawnNPCs: Map not loaded yet.");
            return;
        }

        // AStar should already be initialized in create()
        if (!this.astar && this.blockedTiles) {
            this.astar = new AStarPathfinder(this.mapW, this.mapH, this.blockedTiles);
        }

        // Always load from Tiled object layer "NPCs"
        const npcLayer = this.map.getObjectLayer('NPCs');
        if (!npcLayer) {
            console.warn("Game.spawnNPCs: 'NPCs' layer not found. Using fallback spawning.");
            await this.spawnNPCsFallback();
            return;
        }

        if (!npcLayer.objects || npcLayer.objects.length === 0) {
            console.warn("Game.spawnNPCs: 'NPCs' layer exists but has no objects.");
            return; // Fail gracefully
        }

        console.log(`Game.spawnNPCs: Found ${npcLayer.objects.length} NPC objects in Tiled layer.`);

        // Track spawned positions for min distance spacing
        const spawnedPositions = [];
        const minTileDistance = 2; // Minimum 2 tiles between spawns
        const tileW = this.mapTileWidth || this.map?.tileWidth || 32;
        const tileH = this.mapTileHeight || this.map?.tileHeight || 32;

        npcLayer.objects.forEach((obj, idx) => {
            const center = getObjectCenter(obj);
            let sx = center.x;
            let sy = center.y;

            // Extract spriteKey from object properties
            const spriteKey = getProp(obj, 'spriteKey') || getProp(obj, 'npcKey') || getProp(obj, 'npcType') || obj.type || obj.name || 'npc_1';

            // Validate spriteKey exists, fallback to npc_1 if missing
            let npcKey = this.resolveNpcTextureKey(spriteKey);
            if (!this.textures.exists(npcKey)) {
                console.warn(`[NPC Spawn ${idx}] spriteKey '${spriteKey}' resolved to '${npcKey}' but texture missing. Falling back to npc_1.`);
                npcKey = 'npc_1';
                if (!this.textures.exists(npcKey)) {
                    console.error(`[NPC Spawn ${idx}] Fallback npc_1 texture also missing! Skipping NPC.`);
                    return; // Skip this NPC
                }
            }

            // TILE GUARD: Check if spawn position is in blocked tile
            const tx = Math.floor(sx / tileW);
            const ty = Math.floor(sy / tileH);

            if (this.isTileBlocked(tx, ty)) {
                console.warn(`[NPC Spawn ${idx}] Blocked tile at (${tx},${ty}). Finding nearest free tile...`);
                const free = this.findNearestWalkableTile(tx, ty);
                if (free) {
                    sx = (free.tx * tileW) + (tileW / 2);
                    sy = (free.ty * tileH) + (tileH / 2);
                } else {
                    console.error(`[NPC Spawn ${idx}] Could not find free tile near (${tx},${ty}). Skipping NPC.`);
                    return; // Skip this NPC
                }
            }

            // MIN DISTANCE SPACING: Check distance to other spawned NPCs
            const spawnTileX = Math.floor(sx / tileW);
            const spawnTileY = Math.floor(sy / tileH);
            let tooClose = false;

            for (const pos of spawnedPositions) {
                const tileDist = Math.abs(pos.tx - spawnTileX) + Math.abs(pos.ty - spawnTileY); // Manhattan distance
                if (tileDist < minTileDistance) {
                    console.warn(`[NPC Spawn ${idx}] Too close to existing spawn (${tileDist} tiles < ${minTileDistance}). Finding alternative position...`);
                    // Try to find a nearby free position with proper spacing
                    const alternative = this.findSpawnPositionWithSpacing(spawnTileX, spawnTileY, spawnedPositions, minTileDistance);
                    if (alternative) {
                        sx = (alternative.tx * tileW) + (tileW / 2);
                        sy = (alternative.ty * tileH) + (tileH / 2);
                        spawnedPositions.push({ tx: alternative.tx, ty: alternative.ty });
                    } else {
                        console.warn(`[NPC Spawn ${idx}] Could not find position with proper spacing. Skipping NPC.`);
                        tooClose = true;
                    }
                    break;
                }
            }

            if (tooClose) {
                return; // Skip this NPC
            }

            // Record spawn position
            spawnedPositions.push({ tx: spawnTileX, ty: spawnTileY });

            // Create NPC sprite
            const npc = this.physics.add.sprite(sx, sy, npcKey);

            // STEP 2: Apply normalized size + hitbox
            npc.setScale(GameScene.NPC_SCALE);
            npc.body.setSize(GameScene.NPC_BODY_W, GameScene.NPC_BODY_H);
            npc.body.setOffset(GameScene.NPC_BODY_OFFSET_X, GameScene.NPC_BODY_OFFSET_Y);
            npc.setPushable(true);
            npc.setCollideWorldBounds(true);
            // Depth based on Y position for proper sorting
            npc.setDepth(npc.y);

            // Create Controller
            const controller = new NPCController(this, npc, this.astar, {
                speed: 40,
                wanderRadius: 200,
                tileSize: tileW,
                minPauseMs: 1000,
                maxPauseMs: 3500
            });
            npc.controller = controller;
            npc.npcKey = npcKey;
            npc.spawnIndex = idx; // Store for debug overlay

            // Enable Collisions with map layers
            (this.collidableLayers || []).forEach((layer) => {
                this.physics.add.collider(npc, layer);
            });

            // Collide with player
            this.physics.add.collider(npc, this.player);

            this.npcs.push(npc);

            // VERIFICATION: Ensure visibility
            // Depth based on Y position for proper sorting
            npc.setDepth(npc.y);
            npc.setVisible(true);
            npc.setAlpha(1);

            // Play initial idle animation
            controller.updateAnimation(0, 0);
        });

        console.log(`Game.spawnNPCs: Successfully spawned ${this.npcs.length} NPCs from Tiled layer.`);
    }

    findSpawnPositionWithSpacing(startTx, startTy, existingPositions, minDistance) {
        if (!this.blockedTiles || !this.mapW || !this.mapH) return null;

        const mapW = this.mapW;
        const mapH = this.mapH;
        const blocked = this.blockedTiles;

        // BFS to find nearest free position with proper spacing
        const queue = [{ tx: startTx, ty: startTy, d: 0 }];
        const visited = new Set();
        visited.add(`${startTx},${startTy}`);

        let head = 0;
        while (head < queue.length && queue.length < 400) {
            const curr = queue[head++];

            // Check if position is valid and not blocked
            if (curr.tx >= 0 && curr.ty >= 0 && curr.tx < mapW && curr.ty < mapH) {
                const idx = curr.ty * mapW + curr.tx;
                if (blocked[idx] === 0) {
                    // Check spacing to existing positions
                    let hasProperSpacing = true;
                    for (const pos of existingPositions) {
                        const tileDist = Math.abs(pos.tx - curr.tx) + Math.abs(pos.ty - curr.ty);
                        if (tileDist < minDistance) {
                            hasProperSpacing = false;
                            break;
                        }
                    }
                    if (hasProperSpacing) {
                        return { tx: curr.tx, ty: curr.ty };
                    }
                }
            }

            // Add neighbors
            const neighbors = [
                { tx: curr.tx, ty: curr.ty - 1 },
                { tx: curr.tx, ty: curr.ty + 1 },
                { tx: curr.tx - 1, ty: curr.ty },
                { tx: curr.tx + 1, ty: curr.ty }
            ];

            for (const nb of neighbors) {
                const key = `${nb.tx},${nb.ty}`;
                if (!visited.has(key) && nb.tx >= 0 && nb.ty >= 0 && nb.tx < mapW && nb.ty < mapH) {
                    visited.add(key);
                    queue.push({ ...nb, d: curr.d + 1 });
                }
            }
        }
        return null;
    }

    isTileBlocked(tx, ty) {
        if (!this.blockedTiles || !this.mapW) return false;
        if (tx < 0 || ty < 0 || tx >= this.mapW || ty >= this.mapH) return true;
        return this.blockedTiles[ty * this.mapW + tx] === 1;
    }

    findNearestWalkableTile(tx, ty) {
        if (!this.blockedTiles || !this.mapW) return null;

        const mapW = this.mapW;
        const mapH = this.mapH;
        const blocked = this.blockedTiles;

        // BFS to find nearest free tile
        const queue = [{ tx, ty, d: 0 }];
        const visited = new Set();
        visited.add(`${tx},${ty}`);

        let head = 0;
        while (head < queue.length && queue.length < 400) {
            const curr = queue[head++];

            if (curr.tx >= 0 && curr.ty >= 0 && curr.tx < mapW && curr.ty < mapH) {
                if (blocked[curr.ty * mapW + curr.tx] === 0) {
                    return { tx: curr.tx, ty: curr.ty };
                }
            }

            const neighbors = [
                { tx: curr.tx, ty: curr.ty - 1 },
                { tx: curr.tx, ty: curr.ty + 1 },
                { tx: curr.tx - 1, ty: curr.ty },
                { tx: curr.tx + 1, ty: curr.ty }
            ];

            for (const nb of neighbors) {
                const key = `${nb.tx},${nb.ty}`;
                if (!visited.has(key) && nb.tx >= 0 && nb.ty >= 0 && nb.tx < mapW && nb.ty < mapH) {
                    visited.add(key);
                    queue.push({ ...nb, d: curr.d + 1 });
                }
            }
        }
        return null;
    }

    resolveNpcTextureKey(rawKey) {
        if (!rawKey) {
            return this.getFallbackNpcKey();
        }
        if (this.textures.exists(rawKey)) {
            return rawKey;
        }
        const normalizedMatch = /^npc_0*(\d+)$/i.exec(String(rawKey));
        if (normalizedMatch) {
            const normalized = `npc_${parseInt(normalizedMatch[1], 10)}`;
            if (this.textures.exists(normalized)) {
                console.warn(`NPC DEBUG: Normalized texture key '${rawKey}' -> '${normalized}'.`);
                return normalized;
            }
        }
        const numeric = parseInt(rawKey, 10);
        if (!Number.isNaN(numeric)) {
            const candidate = `npc_${numeric}`;
            if (this.textures.exists(candidate)) {
                console.warn(`NPC DEBUG: Mapped texture key '${rawKey}' -> '${candidate}'.`);
                return candidate;
            }
        }
        const fallback = this.getFallbackNpcKey();
        if (fallback && fallback !== rawKey) {
            console.warn(`NPC DEBUG: Falling back from '${rawKey}' to '${fallback}'.`);
            return fallback;
        }
        return rawKey;
    }

    getFallbackNpcKey() {
        const keys = Object.keys(this.textures.list || {});
        const npcKey = keys.find((key) => key.startsWith('npc_'));
        return npcKey || null;
    }

    updateNPCs(delta) {
        if (!this.npcs) return;

        this.npcs.forEach(npc => {
            // Update the new NPCController
            if (npc.controller) {
                npc.controller.update(0, delta);
            }

            if (npc.debugText) {
                npc.debugText.setPosition(npc.x, npc.y - 25);
            }
        });
    }

    showNPCDebug() {
        if (!this.npcDebugGroup) {
            this.npcDebugGroup = this.add.group();
            this.npcSpawnMarkers = this.add.group();
            this.npcBodyRects = this.add.group();
        }

        // Clear existing debug elements
        this.npcDebugGroup.clear(true, true);
        this.npcSpawnMarkers.clear(true, true);
        this.npcBodyRects.clear(true, true);

        // Add spawn markers, labels, and physics body rects for all NPCs
        this.npcs.forEach((npc, idx) => {
            // Spawn marker (circle at spawn position)
            const marker = this.add.circle(npc.x, npc.y, 8, 0x00ff00, 0.7);
            marker.setDepth(10001);
            marker.setStrokeStyle(2, 0x00ff00);
            marker.setScrollFactor(1);
            this.npcSpawnMarkers.add(marker);

            // Label above NPC head (show NPC key and spawn index)
            const npcKey = npc.npcKey || npc.texture?.key || 'unknown';
            const spawnIdx = npc.spawnIndex !== undefined ? npc.spawnIndex : idx;
            const label = `${npcKey} (#${spawnIdx})`;
            const text = this.add.text(npc.x, npc.y - 25, label, {
                fontFamily: 'monospace',
                fontSize: '10px',
                color: '#00ff00',
                backgroundColor: '#000000',
                padding: { x: 4, y: 2 }
            });
            text.setOrigin(0.5);
            text.setDepth(10001);
            text.setScrollFactor(1);
            this.npcDebugGroup.add(text);
            npc.debugText = text;

            // Physics body rect (STEP 2 enhancement)
            if (npc.body) {
                const rect = this.add.rectangle(
                    npc.body.x + npc.body.width / 2,
                    npc.body.y + npc.body.height / 2,
                    npc.body.width,
                    npc.body.height,
                    0x00ff00,
                    0.2
                );
                rect.setStrokeStyle(1, 0x00ff00);
                rect.setDepth(10000);
                rect.setScrollFactor(1);
                this.npcBodyRects.add(rect);
                npc.debugBodyRect = rect;
            }
        });

        this.npcDebugGroup.setVisible(true);
        this.npcSpawnMarkers.setVisible(true);
        this.npcBodyRects.setVisible(true);
        this.physics.world.createDebugGraphic();
        this.physics.world.drawDebug = true;
    }

    hideNPCDebug() {
        if (this.npcDebugGroup) {
            this.npcDebugGroup.setVisible(false);
        }
        if (this.npcSpawnMarkers) {
            this.npcSpawnMarkers.setVisible(false);
        }
        if (this.npcBodyRects) {
            this.npcBodyRects.setVisible(false);
        }
        this.physics.world.drawDebug = false;
        if (this.physics.world.debugGraphic) {
            this.physics.world.debugGraphic.clear();
        }
    }

    debugHealthReport() {
        const sceneKeys = Object.keys(this.scene?.manager?.keys || {});
        const bounds = this.physics?.world?.bounds;
        const mapWidth = this.map?.widthInPixels || bounds?.width || 0;
        const mapHeight = this.map?.heightInPixels || bounds?.height || 0;
        const tileWidth = this.map?.tileWidth || this.mapTileWidth || 32;
        const tileHeight = this.map?.tileHeight || this.mapTileHeight || 32;
        const playerTile = this.player
            ? { x: Math.floor(this.player.x / tileWidth), y: Math.floor(this.player.y / tileHeight) }
            : null;
        const npcCount = this.npcs ? this.npcs.length : 0;

        const expectedKeys = this.npcExpectedKeys || [];
        const missingExpected = expectedKeys.filter((key) => key && !this.textures.exists(key));
        const npcKeys = (this.npcs || []).map((npc) => npc.texture?.key).filter(Boolean);
        const missingNpcKeys = npcKeys.filter((key) => !this.textures.exists(key));
        const missingKeys = Array.from(new Set([...missingExpected, ...missingNpcKeys]));

        console.log("=== DEV HEALTH REPORT ===");
        console.log("Scene keys:", sceneKeys);
        console.log("Map bounds (px):", { width: mapWidth, height: mapHeight });
        console.log("Player spawn tile:", playerTile);
        console.log("NPC count:", npcCount);
        if (missingKeys.length) {
            console.warn("Missing NPC texture keys:", missingKeys);
            console.log("Loaded texture keys:", Object.keys(this.textures.list || {}));
        } else {
            console.log("Missing NPC texture keys: none");
        }
        console.log("==========================");
    }

    createSprintTrail() {
        // Create a fading dust particle behind the player
        const trail = this.add.circle(
            this.player.x,
            this.player.y + 20,  // At feet level
            4,
            0x8b7355,  // Dust brown color
            0.6
        );
        trail.setDepth(5);

        // Fade out and destroy
        this.tweens.add({
            targets: trail,
            alpha: 0,
            scaleX: 0.2,
            scaleY: 0.2,
            duration: 200,
            ease: 'Power2',
            onComplete: () => trail.destroy()
        });
    }

    update(time, delta) {
        // Cap physics delta to prevent tunneling
        const dt = Math.min(delta, 50);

        // Update NPCs (with guard)
        if (this.npcs && this.npcs.length > 0) {
            this.updateNPCs(dt);
            // Update QA NPC count
            if (window.__QA__) {
                window.__QA__.updateNPCs(this.npcs.length);
            }
        }

        // Update QA player state
        if (window.__QA__ && this.player && this.player.body) {
            window.__QA__.updatePlayer(
                this.player.x,
                this.player.y,
                this.player.body.velocity.x,
                this.player.body.velocity.y
            );
        }

        // STEP 5: Update day/night cycle
        if (this.dayNightCycle) {
            this.dayNightCycle.update(delta);
        }

        // STEP 6: Update minimap
        if (this.minimap) {
            this.minimap.update();
        }

        // Update noir grain effect (subtle animation every 100ms)
        if (this.noirGrain && time % 100 < 50) {
            this.noirGrain.clear();
            const { width, height } = this.scale;
            for (let i = 0; i < 200; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;
                const alpha = Math.random() * 0.3;
                this.noirGrain.fillStyle(0xffffff, alpha);
                this.noirGrain.fillRect(x, y, 1, 1);
            }
        }

        if (this.endingVisible || this.evidenceModal.isOpen || this.interrogationUI.isOpen) {
            this.player.setVelocity(0);
            return;
        }

        // Skip movement if Tile Guard rolled back this frame
        if (this.tileGuardRollback) {
            // Still process interactions and UI, just skip movement
            this.tileGuardRollback = false;
        }

        // --- EXTREME BOUNDARY CONTROL (Every Frame) ---
        // Always verify player is within map bounds and clamp if needed
        const px = this.player.x;
        const py = this.player.y;
        const mw = this.physics.world.bounds.width;
        const mh = this.physics.world.bounds.height;
        const bodyHalfWidth = this.player.body.width / 2;
        const bodyHalfHeight = this.player.body.height / 2;

        if (px < bodyHalfWidth || px > mw - bodyHalfWidth || py < bodyHalfHeight || py > mh - bodyHalfHeight) {
            const clampedX = Phaser.Math.Clamp(px, bodyHalfWidth, mw - bodyHalfWidth);
            const clampedY = Phaser.Math.Clamp(py, bodyHalfHeight, mh - bodyHalfHeight);
            if (clampedX !== px || clampedY !== py) {
                console.warn(`[BOUNDARY VIOLATION] Player at ${truncate(px)},${truncate(py)}. Clamping to ${truncate(clampedX)},${truncate(clampedY)}.`);
                this.player.setPosition(clampedX, clampedY);
                this.player.setVelocity(0);
            }
        }

        // Validate bounds match map size every second
        if (time > (this.nextBoundsCheck || 0)) {
            if (this.mapBounds) {
                const worldBounds = this.physics.world.bounds;
                if (worldBounds.width !== this.mapBounds.width || worldBounds.height !== this.mapBounds.height) {
                    console.warn(`Bounds mismatch detected! Resetting.`);
                    this.physics.world.setBounds(0, 0, this.mapBounds.width, this.mapBounds.height);
                    this.cameras.main.setBounds(0, 0, this.mapBounds.width, this.mapBounds.height);
                }
            }
            this.nextBoundsCheck = time + 1000;
        }

        // --- TILE GUARD: Failsafe blocked tile check (Every Frame) ---
        if (this.blockedTiles && this.mapTileWidth && this.mapTileHeight) {
            const tw = this.mapTileWidth;
            const th = this.mapTileHeight;
            const mapW = this.mapW || Math.floor(this.physics.world.bounds.width / tw);

            // Check feet position (bottom center of bounding box)
            const feetX = this.player.body.x + this.player.body.width / 2;
            const feetY = this.player.body.y + this.player.body.height - 2;

            const tx = Math.floor(feetX / tw);
            const ty = Math.floor(feetY / th);

            // Bounds check for tile coordinates
            if (tx >= 0 && ty >= 0 && tx < mapW && ty < (this.mapH || Math.floor(this.physics.world.bounds.height / th))) {
                const idx = ty * mapW + tx;

                if (this.blockedTiles[idx] === 1) {
                    // We are ON a blocked tile! Rollback immediate.
                    if (this.lastSafePos) {
                        console.warn(`[TILE GUARD] Blocked tile detected at ${tx},${ty}. Rolling back to ${truncate(this.lastSafePos.x)},${truncate(this.lastSafePos.y)}.`);
                        this.player.setPosition(this.lastSafePos.x, this.lastSafePos.y);
                        this.player.setVelocity(0);
                        // Mark as rolled back to prevent movement processing
                        this.tileGuardRollback = true;
                    }
                } else {
                    // Safe tile, update last safe pos
                    if (!this.lastSafePos) this.lastSafePos = new Phaser.Math.Vector2();
                    this.lastSafePos.set(this.player.x, this.player.y);
                    this.tileGuardRollback = false;
                }
            }

            // Anti-Clip Failsafe: If moving but position unchanged
            const speed = this.player.body.speed;
            if (speed > 10 && this.lastSafePos) {
                const moved = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.lastSafePos.x, this.lastSafePos.y);
                if (moved < 1) { // Not moving despite velocity
                    if (!this.stuckTimer) this.stuckTimer = 0;
                    this.stuckTimer += dt;
                    if (this.stuckTimer > 400) {
                        // Nudge slightly
                        this.player.body.x += (Math.random() - 0.5) * 4;
                        this.player.body.y += (Math.random() - 0.5) * 4;
                        this.stuckTimer = 0;
                    }
                } else {
                    this.stuckTimer = 0;
                }
            }
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

        // Movement Normalization (skip if Tile Guard rolled back)
        let moving = false;
        let isSprinting = false;
        let velocityX = 0;
        let velocityY = 0;

        if (!this.tileGuardRollback) {
            this.player.setVelocity(0);
            const baseSpeed = 160; // Slightly reduced for precision
            const sprintMultiplier = 1.3;
            isSprinting = this.cursors.shift.isDown;
            const speed = isSprinting ? baseSpeed * sprintMultiplier : baseSpeed;

            if (this.cursors.left.isDown || this.wasd.A.isDown) {
                velocityX = -speed;
                moving = true;
            } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
                velocityX = speed;
                moving = true;
            }

            if (this.cursors.up.isDown || this.wasd.W.isDown) {
                velocityY = -speed;
                moving = true;
            } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
                velocityY = speed;
                moving = true;
            }

            // Sprint trail effect
            if (moving && isSprinting) {
                this.createSprintTrail();
            }

            // Normalize diagonal speed
            if (velocityX !== 0 && velocityY !== 0) {
                velocityX *= 0.7071; // 1 / sqrt(2)
                velocityY *= 0.7071;
            }

            this.player.setVelocity(velocityX, velocityY);

            // STEP 4: Play footstep sound when moving
            if (moving && this.audio) {
                this.audio.playFootstep();
            }
        } else {
            // Tile Guard rolled back, ensure velocity is zero
            this.player.setVelocity(0);
        }

        if (moving) {
            // Update animation
            let anim = 'walk-down';
            if (velocityX > 0) anim = 'walk-right';
            else if (velocityX < 0) anim = 'walk-left';
            else if (velocityY > 0) anim = 'walk-down';
            else if (velocityY < 0) anim = 'walk-up';

            // Store last direction for idle
            if (Math.abs(velocityX) > 0.1) this.lastDirection = velocityX > 0 ? 'right' : 'left';
            else if (Math.abs(velocityY) > 0.1) this.lastDirection = velocityY > 0 ? 'down' : 'up';

            this.player.anims.play(anim, true);

            // Sprint Trail
            if (isSprinting && (this.time.now - this.lastTrailTime > 100)) {
                this.createSprintTrail();
                this.lastTrailTime = this.time.now;
            }
        } else {
            this.player.anims.play(`idle-${this.lastDirection}`, true);
        }

        // Interaction
        if (this.interactionTarget && Phaser.Input.Keyboard.JustDown(this.keyE)) {
            // STEP 4: Play interact sound
            if (this.audio) {
                this.audio.playInteract();
            }

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
            if (response && response.contradictions) {
                setContradictions(response.contradictions);
            } else {
                setContradictions([]);
            }
        } catch (error) {
            console.error("Contradiction check error:", error);
            this.showDialog(`Contradiction check failed: ${error.message}`);
            // Don't throw, just show dialog
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

    createNoirOverlay() {
        const { width, height } = this.scale;

        // Vignette overlay (radial gradient darkening edges)
        this.noirVignette = this.add.graphics();
        this.noirVignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.3, 0.6);
        this.noirVignette.fillRect(0, 0, width, height);
        this.noirVignette.setScrollFactor(0);
        this.noirVignette.setDepth(98);
        this.noirVignette.setAlpha(0.4);

        // Film grain effect (subtle)
        this.noirGrain = this.add.graphics();
        this.noirGrain.setScrollFactor(0);
        this.noirGrain.setDepth(99);
        this.noirGrain.setAlpha(0.03);
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

function truncate(value) {
    return Math.round(value * 100) / 100;
}
