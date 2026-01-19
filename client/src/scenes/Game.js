import NotebookUI from '../ui/NotebookUI.js';
import { NPC } from '../entities/NPC.js';
import { getNPCById } from '../data/npcs.js';
import EvidenceModal from '../ui/EvidenceModal.js';
import InterrogationUI from '../ui/InterrogationUI.js';
import { DialogueBoxUI } from '../ui/DialogueBoxUI.js';
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
import { GuideSystem } from '../utils/GuideSystem.js';
import { StoryData } from '../story/storyData.js';
// Minimap - use dynamic import to handle old builds gracefully
// import { Minimap } from '../utils/minimap.js'; // Commented out - using dynamic import instead
import { QuestSystem } from '../utils/QuestSystem.js';
import { QuestUI } from '../ui/QuestUI.js';
import { QuestTrackerUI } from '../ui/QuestTrackerUI.js';
import { QUEST_ITEMS, getAllQuestItemLocations } from '../data/quest_items.js';
import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
    // Movement constants
    static PLAYER_SPEED = 160;
    static PLAYER_SPRINT_MULTIPLIER = 1.3;
    static AXIS_LOCKED = false; // If true, prevents diagonal movement (only one axis at a time)

    // Unified Actor Body Constants (Player + NPCs)
    // Based on 64x64 sprite frames (verified in Boot.js)
    // Feet-only collision for smooth corner sliding
    static ACTOR_FRAME_W = 64;
    static ACTOR_FRAME_H = 64;
    static ACTOR_SCALE = 1.0;
    static ACTOR_TARGET_DISPLAY_HEIGHT = 64; // Target on-screen height in pixels (normalized)

    // Rectangular body: small, feet-only (14x10px for tight feel)
    static ACTOR_BODY_W = 14;
    static ACTOR_BODY_H = 10;
    static ACTOR_BODY_OFFSET_X = 25; // (64 - 14) / 2 = 25 (centered horizontally)
    static ACTOR_BODY_OFFSET_Y = 54; // 64 - 10 = 54 (at bottom, feet-only)

    // Circular body: alternative for smoother corner sliding (radius = 7px)
    static ACTOR_BODY_USE_CIRCLE = true; // Set to false to use rectangle only
    static ACTOR_BODY_CIRCLE_RADIUS = 7;
    static ACTOR_BODY_CIRCLE_OFFSET_X = 32; // Center of 64px frame
    static ACTOR_BODY_CIRCLE_OFFSET_Y = 57; // Slightly above bottom for feet

    // 8px Sub-Grid Collision System
    static SUB_GRID_SIZE = 8; // 8px sub-grid cells (32px tile / 4 = 8px cells)

    // Legacy NPC constants (deprecated - use ACTOR_* constants instead)
    static NPC_SCALE = 1.0;
    static NPC_FRAME_W = 64; // Updated from 32 to match actual frame size
    static NPC_FRAME_H = 64; // Updated from 32 to match actual frame size
    static NPC_BODY_W = 14; // Updated to match ACTOR_BODY_W
    static NPC_BODY_H = 10; // Updated to match ACTOR_BODY_H
    static NPC_BODY_OFFSET_X = 25; // Updated to match ACTOR_BODY_OFFSET_X
    static NPC_BODY_OFFSET_Y = 54; // Updated to match ACTOR_BODY_OFFSET_Y

    constructor() {
        super('Game');
    }

    init(data) {
        console.log("Game.init started with data:", data);
        this.mapDebugData = data?.mapDebugData || this.registry.get("mapDebugData") || {};

        // Dual-Layer Pathfinding Validation Helper
        this.isCoordinateInPath = (x, y) => {
            // Initialize Pathfinding.validRoutes using data from PATHFINDING_ANALYSIS.md
            if (!this.pathfinding) this.pathfinding = {};
            this.pathfinding.validRoutes = [
            {
                id: 'speedrun',
                name: 'Route 1: The Speedrun',
                waypoints: [
                    {x1: 1100, y1: 1100, x2: 1100, y2: 1100, description: 'Police Station (Start)'},
                    {x1: 1400, y1: 1400, x2: 1800, y2: 1800, description: 'School'},
                    {x1: 2000, y1: 2000, x2: 2400, y2: 2400, description: 'Pennyworth Lane'},
                    {x1: 1100, y1: 1100, x2: 1100, y2: 1100, description: 'Police Station (Return)'}
                ]
            },
            {
                id: 'balanced',
                name: 'Route 2: The Balanced',
                waypoints: [
                    {x1: 1100, y1: 1100, x2: 1100, y2: 1100, description: 'Police Station (Start)'},
                    {x1: 1152, y1: 1120, x2: 1152, y2: 1120, description: 'Desk Evidence'},
                    {x1: 1400, y1: 1400, x2: 1800, y2: 1800, description: 'School'},
                    {x1: 2000, y1: 2000, x2: 2400, y2: 2400, description: 'Pennyworth Lane'},
                    {x1: 1800, y1: 2600, x2: 1800, y2: 2600, description: 'Woods Edge'},
                    {x1: 1100, y1: 1100, x2: 1100, y2: 1100, description: 'Police Station (Return)'}
                ]
            },
            {
                id: 'safe',
                name: 'Route 3: The Safe/Resource-Heavy',
                waypoints: [
                    {x1: 1100, y1: 1100, x2: 1100, y2: 1100, description: 'Police Station (Start)'},
                    {x1: 1152, y1: 1120, x2: 1152, y2: 1120, description: 'Desk Evidence'},
                    {x1: 1400, y1: 1400, x2: 1800, y2: 1800, description: 'School'},
                    {x1: 2000, y1: 2000, x2: 2400, y2: 2400, description: 'Pennyworth Lane'},
                    {x1: 2400, y1: 2400, x2: 2800, y2: 2800, description: 'Harrow Residence'},
                    {x1: 1800, y1: 2600, x2: 2400, y2: 2800, description: 'Risky Passage'},
                    {x1: 2800, y1: 2000, x2: 3200, y2: 2400, description: 'Lions Den'},
                    {x1: 1100, y1: 1100, x2: 1100, y2: 1100, description: 'Police Station (Return)'}
                ]
            }
        ];

            // Pathfinding.validRoutes has been initialized with predefined data
            if (!this.pathfinding?.validRoutes) {
                console.warn("Pathfinding routes are not initialized.");
                return false;
            }

            const isValid = this.pathfinding.validRoutes.some((route) => {
                return x >= route.x1 && x <= route.x2 && y >= route.y1 && y <= route.y2;
            });
            console.log(
                `Pathfinding validation at (${x},${y}): ${isValid ? "VALID" : "BLOCKED"}`
            );
            return isValid;
        };

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

        // --- 1. Map & Bounds ---\n        console.log(\"Game.create started\");\n\n        // Disable shadows near boundaries\n        const boundaries = this.findObjectLayer('Collisions')?.objects || [];\n        console.log(`Boundary layer loaded with ${boundaries.length} objects.`);\n\n        const disableShadowsNearBoundaries = (object) => {\n            boundaries.forEach(boundary => {\n                // Boundary object positions\n                const boundaryX = boundary.x;\n                const boundaryY = boundary.y;\n                const boundaryWidth = boundary.width;\n                const boundaryHeight = boundary.height;\n\n                // Check if object intersects boundary (with a threshold of 0.5 units)\n                if (\n                    object.x + object.width * 0.5 >= boundaryX &&\n                    object.x - object.width * 0.5 <= boundaryX + boundaryWidth &&\n                    object.y + object.height * 0.5 >= boundaryY &&\n                    object.y - object.height * 0.5 <= boundaryY + boundaryHeight\n                ) {\n                    console.log(`Disabling shadows for object ${object.name || '(unnamed)'} near boundary.`);\n                    object.castShadow = false;\n                    object.receiveShadow = false;\n                }\n            });\n        };\n\n        // Apply shadow rules to all objects in layers\n        ['NPCs', 'Interactables'].forEach(layerName => {\n            const layer = this.findObjectLayer(layerName)?.objects || [];\n            layer.forEach(disableShadowsNearBoundaries);\n        });\n\n        // Force shadow map update to clear visual artifacts\n        if (this.lights) {\n            console.log(\"Updating shadow map...\");\n            this.lights.disable(); // Disable and re-enable to refresh shadow rendering\n            this.lights.enable();\n        }
        if (!this.cache.tilemap.exists('city_map')) {
            console.error("Game Scene: 'city_map' key not found in cache. Map loading was disabled or failed.");
            this.add.text(100, 100, "DEBUG MODE: MAP DISABLED", { fontSize: '32px', color: '#ff0000' });
            return; // Stop here to prevent crash
        }

        console.log("Game.create: Making tilemap...");
        let map; // Hoist for use outside try-catch
        let tilesets; // Hoist for use outside try-catch
        try {
            map = this.make.tilemap({ key: 'city_map' });
            this.map = map;
            console.log("Game.create: Tilemap created successfully. Layers found:", map.layers.map(l => l.name));

            // Get all layers with their types
            const allLayers = map.layers || [];
            const tileLayerNames = allLayers.filter(l => l.type === 'tilelayer').map(l => l.name);
            const objectLayerNames = allLayers.filter(l => l.type === 'objectgroup').map(l => l.name);

            // Log layer information
            console.log(`📊 Map Layers Summary: ${allLayers.length} total layers`);
            console.log(`   Tile layers (${tileLayerNames.length}):`, tileLayerNames);
            console.log(`   Object layers (${objectLayerNames.length}):`, objectLayerNames.length > 0 ? objectLayerNames : '(none)');

            // Helper function to find object layer with case-insensitive and partial matching
            const findObjectLayer = (targetName) => {
                const loweredTarget = targetName.toLowerCase();

                // First try exact match (case-insensitive)
                for (const layer of allLayers) {
                    if (layer.type === 'objectgroup' && layer.name.toLowerCase() === loweredTarget) {
                        return layer;
                    }
                }

                // Then try partial match (contains)
                for (const layer of allLayers) {
                    if (layer.type === 'objectgroup' && layer.name.toLowerCase().includes(loweredTarget)) {
                        console.log(`   ✓ Found object layer "${layer.name}" (partial match for "${targetName}")`);
                        return layer;
                    }
                }

                // Find closest matches for logging
                const scored = objectLayerNames.map((name) => {
                    const lower = name.toLowerCase();
                    let score = 0;
                    if (lower.includes(loweredTarget)) score += 100;
                    if (loweredTarget.includes(lower)) score += 50;
                    for (let i = 0; i < Math.min(lower.length, loweredTarget.length); i++) {
                        if (lower[i] === loweredTarget[i]) score += 1;
                    }
                    score -= Math.abs(lower.length - loweredTarget.length);
                    return { name, score };
                });
                const closest = scored.sort((a, b) => b.score - a.score).slice(0, 3).map((item) => item.name);

                if (objectLayerNames.length > 0) {
                    console.warn(`   ⚠️ No object layer matching "${targetName}". Closest matches:`, closest);
                }

                return null;
            };

            // Store findObjectLayer helper for use throughout create()
            this.findObjectLayer = findObjectLayer;

            const npcLayer = findObjectLayer('NPCs');
            if (!npcLayer) {
                if (objectLayerNames.length === 0) {
                    console.log("   ℹ️ No object layers found in map. NPCs will use validated spawns or fallback.");
                }
            } else {
                console.log(`   ✓ 'NPCs' layer found with ${npcLayer.objects?.length || 0} objects.`);
                this.npcExpectedKeys = [];
                if (npcLayer.objects) {
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
            }

            // Add Tilesets: addTilesetImage(tilesetNameInTiled, phaserKey)
            console.log("Game.create: Adding tilesets...");
            tilesets = [
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

            // Note: Collision source detection is done after try/catch block
            // to ensure variables are in scope when collision setup runs

            // Shadow Culling: Track shadow layers to ensure they don't block movement
            this.shadowLayers = [];
            const shadowLayerKeywords = ['Shadow', 'shadow', 'Shadows', 'shadows', 'Dark', 'dark'];

            // Dynamically load all layers from the map (visual layers only)
            map.layers.forEach(layerData => {
                const name = layerData.name;

                // Skip collision layers - they're handled separately
                if (name === 'Blocked') {
                    return; // Skip - handled as collision source
                }

                // Skip object layers - they're handled separately
                if (layerData.type === 'objectgroup') {
                    return;
                }

                console.log(`Game.create: Processing visual layer ${name}...`);
                const layer = map.createLayer(name, tilesets, 0, 0);
                if (layer) {
                    this.layers[name] = layer;

                    // Visual layers have NO collision - collision comes from dedicated source only
                    console.log(`Game.create: Visual layer ${name} (no collision)`);

                    // Shadow Culling: Identify and mark shadow layers
                    const isShadowLayer = shadowLayerKeywords.some(keyword => name.includes(keyword));
                    if (isShadowLayer) {
                        this.shadowLayers.push(name);
                        console.log(`🔍 Shadow Culling: Marked layer "${name}" as shadow-only (no collision)`);
                    }

                    // Explicitly disable collision on all visual layers (including shadows)
                    layer.setCollisionByProperty({ collides: false });
                    layer.setCollisionByExclusion([]); // Clear any collision

                    // Set depth high for "overhead" layers like Roofs
                    if (name.includes('Roof') || name.includes('Top')) {
                        layer.setDepth(15);
                    }
                } else {
                    console.warn(`Game.create: Layer ${name} not created.`);
                }
            });
            console.log("Game.create: Visual layers done.");
            if (this.shadowLayers.length > 0) {
                console.log(`🔍 Shadow Culling: ${this.shadowLayers.length} shadow layer(s) identified and excluded from collision:`, this.shadowLayers);
            }

            // World Bounds - Always match map size exactly
            const mapWidth = map.widthInPixels;
            const mapHeight = map.heightInPixels;
            this.physics.world.setBounds(0, 0, mapWidth, mapHeight);
            this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
            // Store bounds for validation
            this.mapBounds = { width: mapWidth, height: mapHeight };
            console.log("Game.create: Bounds set to", mapWidth, mapHeight);
            this.mapLoaded = true;

            // Initialize navigation logic
            if (this.questSystem && this.questSystem.activeQuest) {
                this.updateQuestNavigation(this.questSystem.activeQuest);
            }

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

            // --- INITIALIZE 8px SUB-GRID COLLISION SYSTEM FROM collision_map.json ---
            // Load sub-grid collision data from Agent 1's collision_map.json
            try {
                const collisionMapData = this.cache.json.get('collision_map');
                if (collisionMapData && collisionMapData.collisionData) {
                    this.subGridCollisionData = collisionMapData.collisionData;
                    console.log(`✅ Sub-grid collision data loaded: ${Object.keys(this.subGridCollisionData).length} tiles`);
                    
                    // Also merge with global CollisionData if available
                    if (typeof window !== 'undefined' && window.CollisionData) {
                        this.subGridCollisionData = { ...window.CollisionData, ...this.subGridCollisionData };
                        console.log(`✅ Merged with global CollisionData: ${Object.keys(this.subGridCollisionData).length} total tiles`);
                    }
                } else {
                    // Try to use global CollisionData as fallback
                    if (typeof window !== 'undefined' && window.CollisionData) {
                        this.subGridCollisionData = window.CollisionData;
                        console.log(`✅ Using global CollisionData: ${Object.keys(this.subGridCollisionData).length} tiles`);
                    } else {
                        // Initialize empty sub-grid collision data
                        this.subGridCollisionData = {};
                        console.log('⚠️ No sub-grid collision data found, initializing empty');
                    }
                }
            } catch (e) {
                console.warn('⚠️ Failed to load collision_map.json:', e);
                // Try to use global CollisionData as fallback
                if (typeof window !== 'undefined' && window.CollisionData) {
                    this.subGridCollisionData = window.CollisionData;
                    console.log(`✅ Using global CollisionData as fallback: ${Object.keys(this.subGridCollisionData).length} tiles`);
                } else {
                    this.subGridCollisionData = {};
                }
            }


        } catch (error) {
            console.error("Game.create FATAL ERROR:", error);
            return; // Stop here on fatal error
        }

        // --- 2. Collisions (EXACTLY ONE SOURCE) ---
        this.collidableLayers = [];
        this.collisionObjects = [];
        this.collisionDebugGraphics = null;
        this.mergedCollisionRectangles = null; // Store merged rectangles for debug visualization
        this.showIndividualTilesDebug = false; // Toggle to show individual tiles (yellow) vs merged (magenta)

        // CRITICAL: Map and layers must NEVER be scaled (scale = 1.0 always)
        // - Tilemap objects don't have setScale() method
        // - Layer scaling breaks collision alignment (physics bodies don't scale with visual layers)
        // - Use camera zoom (this.cameras.main.setZoom()) for visual scaling only
        // - All layers are created with default scale 1.0 via map.createLayer(name, tilesets, 0, 0)

        // STEP 1: Print all layer names/types and choose best collision source
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('🔍 COLLISION SOURCE DETECTION');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('All layers in map:');
        map.layers.forEach((layer, idx) => {
            console.log(`  ${idx + 1}. "${layer.name}" (type: ${layer.type})`);
        });

        // Priority 1: Object layer named "Collisions" (or close match)
        const collisionObjectLayerAliases = ['Collisions', 'collisions', 'Collision', 'collision', 'Walls', 'walls', 'Obstacles', 'obstacles'];
        let collisionsObjectLayer = null;
        for (const alias of collisionObjectLayerAliases) {
            collisionsObjectLayer = this.findObjectLayer ? this.findObjectLayer(alias) : map.getObjectLayer(alias);
            if (collisionsObjectLayer) {
                console.log(`\n✅ Found object layer: "${collisionsObjectLayer.name}" (${collisionsObjectLayer.objects?.length || 0} objects)`);
                break;
            }
        }

        // Priority 2: Tile layer named "Collision/Collide/Blocked" (or close match)
        const collisionTileLayerAliases = ['Collision', 'collision', 'Collide', 'collide', 'Blocked', 'blocked', 'Collisions', 'collisions'];
        let collisionTileLayer = null;
        for (const alias of collisionTileLayerAliases) {
            collisionTileLayer = map.layers.find(l => l.name === alias && l.type === 'tilelayer');
            if (collisionTileLayer) {
                console.log(`\n✅ Found tile layer: "${alias}"`);
                break;
            }
        }

        // Choose collision source based on priority
        let collisionSource = null;
        let collisionSourceType = null;
        let collisionSourceName = null;

        if (collisionsObjectLayer) {
            collisionSource = collisionsObjectLayer;
            collisionSourceType = 'object';
            collisionSourceName = collisionsObjectLayer.name;
            console.log(`\n✅ SELECTED: Object layer "${collisionSourceName}" (Priority 1)`);
        } else if (collisionTileLayer) {
            collisionSource = collisionTileLayer;
            collisionSourceType = 'tile';
            collisionSourceName = collisionTileLayer.name;
            console.log(`\n✅ SELECTED: Tile layer "${collisionSourceName}" (Priority 2)`);
        } else {
            collisionSource = null;
            collisionSourceType = 'fallback';
            collisionSourceName = 'feet-area-fallback';
            console.log(`\n⚠️  No collision layer found. Using fallback: feet-area collisions from visual layers (Priority 3)`);
        }
        console.log('═══════════════════════════════════════════════════════════\n');

        // Handle collision source based on priority
        this.collisionSourceType = collisionSourceType;
        this.collisionSourceName = collisionSourceName;
        let colliderCount = 0;

        if (collisionSourceType === 'object') {
            // Priority 1: Object layer - create static bodies from rectangles/polygons
            this.walls = this.physics.add.staticGroup();
            const tileW = map.tileWidth || 32;
            const tileH = map.tileHeight || 32;

            if (collisionsObjectLayer && collisionsObjectLayer.objects) {
                let polygonCount = 0;
                let rectangleCount = 0;

                collisionsObjectLayer.objects.forEach((obj, idx) => {
                    let x, y, w, h;

                    // Handle polygons: approximate using bounding box
                    if (obj.polygon && obj.polygon.length > 0) {
                        polygonCount++;
                        // Calculate bounding box from polygon points
                        const points = obj.polygon;
                        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                        points.forEach(point => {
                            minX = Math.min(minX, obj.x + point.x);
                            minY = Math.min(minY, obj.y + point.y);
                            maxX = Math.max(maxX, obj.x + point.x);
                            maxY = Math.max(maxY, obj.y + point.y);
                        });
                        x = minX;
                        y = minY;
                        w = maxX - minX;
                        h = maxY - minY;
                    } else if (obj.width && obj.height) {
                        // Handle rectangles
                        rectangleCount++;
                        x = obj.x;
                        y = obj.y;
                        w = obj.width;
                        h = obj.height;
                    } else {
                        return; // Skip invalid objects
                    }

                    // Create static body
                    const wall = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0xff0000, 0); // Invisible
                    this.physics.add.existing(wall, true); // true = static
                    this.walls.add(wall);
                    this.collisionObjects.push({ x, y, w, h, obj, source: 'object' });
                    colliderCount++;
                });

                console.log(`✅ Collision (ObjectLayer): ${colliderCount} static bodies from "${collisionSourceName}"`);
                if (polygonCount > 0) {
                    console.log(`   ${polygonCount} polygons (approximated as bounding boxes), ${rectangleCount} rectangles`);
                }
            }
        } else if (collisionSourceType === 'tile') {
            // Priority 2: Tile layer - use setCollisionByProperty or setCollisionByExclusion
            this.walls = this.physics.add.staticGroup();
            const collisionLayer = map.createLayer(collisionSourceName, tilesets, 0, 0);

            if (collisionLayer) {
                // Try setCollisionByProperty first (tiles with collides=true property)
                let tilesWithCollision = 0;
                const mapW = map.width;
                const mapH = map.height;

                // Check if any tiles have collides property
                for (let ty = 0; ty < mapH; ty++) {
                    for (let tx = 0; tx < mapW; tx++) {
                        const tile = collisionLayer.getTileAt(tx, ty);
                        if (tile && tile.collides) {
                            tilesWithCollision++;
                        }
                    }
                }

                if (tilesWithCollision > 0) {
                    // Use setCollisionByProperty for tiles with collides=true
                    collisionLayer.setCollisionByProperty({ collides: true });
                    console.log(`✅ Collision (TileLayer): Using setCollisionByProperty({ collides: true })`);

                    // Make stairs walkable by removing collision from stair tiles
                    let stairsMadeWalkable = 0;
                    for (let ty = 0; ty < mapH; ty++) {
                        for (let tx = 0; tx < mapW; tx++) {
                            const tile = collisionLayer.getTileAt(tx, ty);
                            if (tile && tile.collides) {
                                // Check if tile is a stair (by property or name)
                                const props = tile.properties || [];
                                const isStair = props.some(p =>
                                    (p.name === 'stair' || p.name === 'stairs' || p.name === 'step' || p.name === 'steps') && p.value === true
                                ) || props.some(p =>
                                    (p.name && (p.name.toLowerCase().includes('stair') || p.name.toLowerCase().includes('step')))
                                );

                                // Also check if this is near known stair coordinates (61,37)
                                const nearStairs = (tx >= 59 && tx <= 63 && ty >= 35 && ty <= 39);

                                if (isStair || nearStairs) {
                                    tile.setCollision(false);
                                    stairsMadeWalkable++;
                                    if (nearStairs) {
                                        console.log(`   ✅ Made stair tile walkable at (${tx},${ty}) - index: ${tile.index}, props:`, props);
                                    }
                                }
                            }
                        }
                    }

                    if (stairsMadeWalkable > 0) {
                        console.log(`   ✅ Made ${stairsMadeWalkable} stair tiles walkable`);
                    }

                    console.log(`   ${tilesWithCollision - stairsMadeWalkable} tiles marked as collidable`);
                    this.collidableLayers.push(collisionLayer);
                    colliderCount = tilesWithCollision - stairsMadeWalkable;
                } else {
                    // Try setCollisionByExclusion (all tiles except empty/transparent)
                    collisionLayer.setCollisionByExclusion([-1, 0]);
                    console.log(`✅ Collision (TileLayer): Using setCollisionByExclusion([-1, 0])`);

                    // Make stairs walkable by removing collision from stair tiles
                    let stairsMadeWalkable = 0;
                    for (let ty = 0; ty < mapH; ty++) {
                        for (let tx = 0; tx < mapW; tx++) {
                            const tile = collisionLayer.getTileAt(tx, ty);
                            if (tile && tile.collides && tile.index !== -1 && tile.index !== 0) {
                                // Check if tile is a stair (by property or name)
                                const props = tile.properties || [];
                                const isStair = props.some(p =>
                                    (p.name === 'stair' || p.name === 'stairs' || p.name === 'step' || p.name === 'steps') && p.value === true
                                ) || props.some(p =>
                                    (p.name && (p.name.toLowerCase().includes('stair') || p.name.toLowerCase().includes('step')))
                                );

                                // Also check if this is near known stair coordinates (61,37)
                                const nearStairs = (tx >= 59 && tx <= 63 && ty >= 35 && ty <= 39);

                                if (isStair || nearStairs) {
                                    tile.setCollision(false);
                                    stairsMadeWalkable++;
                                    if (nearStairs) {
                                        console.log(`   ✅ Made stair tile walkable at (${tx},${ty}) - index: ${tile.index}, props:`, props);
                                    }
                                } else {
                                    colliderCount++;
                                }
                            }
                        }
                    }

                    if (stairsMadeWalkable > 0) {
                        console.log(`   ✅ Made ${stairsMadeWalkable} stair tiles walkable`);
                    }

                    console.log(`   ${colliderCount} tiles marked as collidable`);
                    this.collidableLayers.push(collisionLayer);
                }
            }
        } else {
            // Priority 3: Fallback - create "feet area" collisions from visual layers
            this.walls = this.physics.add.staticGroup();
            const tileW = map.tileWidth || 32;
            const tileH = map.tileHeight || 32;

            // Find building/decoration layers (Bldg_*, etc.) for feet-area collisions
            const visualLayers = map.layers.filter(l =>
                l.type === 'tilelayer' &&
                (l.name.startsWith('Bldg_') || l.name.includes('Building') || l.name.includes('Deco'))
            );

            if (visualLayers.length > 0) {
                console.log(`⚠️  Fallback: Creating feet-area collisions from ${visualLayers.length} visual layer(s)`);

                visualLayers.forEach(layerData => {
                    // Reuse existing layer instead of creating duplicate
                    const layer = this.layers[layerData.name];
                    if (!layer) {
                        console.warn(`⚠️  Fallback collision: Layer "${layerData.name}" not found in this.layers. Skipping.`);
                        return;
                    }
                    // Hide collision layer (it's for collision only, not visual)
                    layer.setVisible(false);
                    if (layer) {
                        const mapW = map.width;
                        const mapH = map.height;

                        // Create "feet area" collisions: shrink to bottom center of each tile
                        const feetAreaW = tileW * 0.5; // 50% of tile width
                        const feetAreaH = tileH * 0.35; // 35% of tile height (feet only)
                        const feetOffsetX = (tileW - feetAreaW) / 2; // Center horizontally
                        const feetOffsetY = tileH - feetAreaH; // At bottom

                        for (let ty = 0; ty < mapH; ty++) {
                            for (let tx = 0; tx < mapW; tx++) {
                                const tile = layer.getTileAt(tx, ty);
                                if (tile && tile.index !== -1 && tile.index !== 0) {
                                    // Create feet-area collision
                                    const x = tx * tileW + feetOffsetX;
                                    const y = ty * tileH + feetOffsetY;
                                    const wall = this.add.rectangle(x + feetAreaW / 2, y + feetAreaH / 2, feetAreaW, feetAreaH, 0xff0000, 0);
                                    this.physics.add.existing(wall, true);
                                    this.walls.add(wall);
                                    this.collisionObjects.push({
                                        x, y, w: feetAreaW, h: feetAreaH,
                                        tx, ty, source: 'fallback-feet', layer: layerData.name
                                    });
                                    colliderCount++;
                                }
                            }
                        }
                    }
                });

                console.log(`✅ Collision (Fallback): ${colliderCount} feet-area colliders from visual layers`);
            } else {
                console.warn('⚠️  No visual layers found for fallback collisions. Collisions disabled.');
            }
        }

        // Store collision stats for audit
        this.collisionStats = {
            sourceType: collisionSourceType,
            sourceName: collisionSourceName,
            colliderCount: colliderCount
        };

        console.log(`\n📊 Collision Summary: ${colliderCount} colliders from ${collisionSourceType} source "${collisionSourceName}"\n`);

        // --- 3. Entities (Spawn Points) ---
        // STEP 1: Player spawn MUST come from Tiled object layer "Entities" object named "Player" or "PlayerSpawn"
        let spawnX, spawnY;
        let spawnSource = 'UNKNOWN';

        // Get tile dimensions (use map directly since mapTileWidth/Height may not be set yet)
        const tileW = map.tileWidth || 32;
        const tileH = map.tileHeight || 32;

        // Use tolerant layer lookup (case-insensitive, partial match)
        const entitiesLayer = this.findObjectLayer ? this.findObjectLayer('Entities') : map.getObjectLayer('Entities');
        // #region agent log
        const hasEntitiesLayer = !!entitiesLayer;
        const hasEntitiesObjects = entitiesLayer && entitiesLayer.objects && entitiesLayer.objects.length > 0;
        fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Game.js:652', message: 'Entities layer check', data: { hasLayer: hasEntitiesLayer, hasObjects: hasEntitiesObjects, objectCount: entitiesLayer?.objects?.length || 0, layerName: entitiesLayer?.name || 'none' }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'D' }) }).catch(() => { });
        // #endregion

        if (hasEntitiesObjects) {
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
            // No Entities layer - use validation data if available, otherwise fallback
            const debugData = this.mapDebugData || {};
            if (debugData.spawn && debugData.spawn.x && debugData.spawn.y) {
                spawnX = debugData.spawn.x;
                spawnY = debugData.spawn.y;
                spawnSource = `Validation data (tile ${debugData.spawn.tx},${debugData.spawn.ty})`;
                console.log(`✅ Using validated spawn position from mapValidator: (${spawnX}, ${spawnY})`);
            } else {
                // Hardcoded fallback if no validation data
                spawnX = 200;
                spawnY = 300;
                spawnSource = 'FALLBACK (no Entities layer, no validation data)';
                // Only log warning if we actually expected object layers but didn't find them
                if (map.layers && map.layers.some(l => l.type === 'objectgroup')) {
                    console.warn(`⚠️ No "Entities" object layer found (but map has other object layers). Using fallback.`);
                } else {
                    console.log(`ℹ️ No object layers in map. Using fallback spawn position.`);
                }
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

        // --- SPAWN CONFIG OVERRIDE ---
        try {
            const spawnConfig = this.cache.json.get('spawn_config');
            // Try to get saved spawn from gameState (accessed via global or helper if needed)
            // For now, check localStorage directly as a fallback or use default
            const savedStateStr = localStorage.getItem('casefile_noir_save');
            let targetSpawnId = 'spawn_default';
            if (savedStateStr) {
                try {
                    const parsed = JSON.parse(savedStateStr);
                    if (parsed.spawnState && parsed.spawnState.activeSpawnId) {
                        targetSpawnId = parsed.spawnState.activeSpawnId;
                    }
                } catch (e) { }
            }

            if (spawnConfig && spawnConfig.spawnPoints) {
                const point = spawnConfig.spawnPoints.find(p => p.id === targetSpawnId);
                // Only override if point exists AND (targetSpawnId is not default OR map didn't provide good spawn)
                if (point) {
                    spawnX = point.coordinates.x;
                    spawnY = point.coordinates.y;
                    spawnSource = `Spawn Config: ${point.name} (${targetSpawnId})`;

                    // Re-validate against blocked tiles just in case config is stale
                    if (this.blockedTiles && this.mapW && this.mapH) {
                        const tx = Math.floor(spawnX / tileW);
                        const ty = Math.floor(spawnY / tileH);
                        if (this.isTileBlocked(tx, ty)) {
                            console.warn(`⚠️ Config spawn ${targetSpawnId} is blocked! Finding nearest.`);
                            const nearest = this.findNearestWalkableTile(tx, ty);
                            if (nearest) {
                                spawnX = nearest.tx * tileW + tileW / 2;
                                spawnY = nearest.ty * tileH + tileH / 2;
                            }
                        }
                    }
                }
            }
        } catch (e) { console.warn("Spawn Config Override Failed", e); }

        // Log spawn coordinates
        const spawnTileX = Math.floor(spawnX / tileW);
        const spawnTileY = Math.floor(spawnY / tileH);
        console.log(`✅ Player spawn: ${spawnSource}`);
        console.log(`   Pixel coords: (${spawnX.toFixed(2)}, ${spawnY.toFixed(2)})`);
        console.log(`   Tile coords: (${spawnTileX}, ${spawnTileY})`);

        // Store player spawn tile for collision audit
        this.playerSpawnTile = { tx: spawnTileX, ty: spawnTileY };

        // Safety: Check detective texture exists before creating player
        // #region agent log
        const hasDetectiveTexture = this.textures.exists('detective');
        fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Game.js:392', message: 'Player texture check', data: { hasTexture: hasDetectiveTexture, spawnX, spawnY }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
        // #endregion
        if (!hasDetectiveTexture) {
            console.error("❌ CRITICAL: 'detective' texture not found! Cannot create player.");
            // Try to use a fallback or show error
            this.add.text(100, 100, "ERROR: Player texture missing", { fontSize: '24px', color: '#ff0000' });
            return; // Stop scene creation
        }

        this.player = this.physics.add.sprite(spawnX, spawnY, 'detective');

        // Normalize player sprite to consistent size (uses tile size from map)
        // tileW and tileH are already declared above (line 451-452)
        const playerDebug = this.normalizeCharacterSprite(this.player, tileW, tileH);

        console.log(`[Player Normalized] key=${playerDebug.key}, frame=${playerDebug.frameW}x${playerDebug.frameH}, scale=${playerDebug.scale}, display=${playerDebug.displayW}x${playerDebug.displayH}, body=${playerDebug.bodyW}x${playerDebug.bodyH}, offset=(${playerDebug.bodyOffsetX},${playerDebug.bodyOffsetY}), origin=${playerDebug.origin}`);

        this.player.setCollideWorldBounds(true);
        // Depth will be set by normalizeCharacterSprite (Y-sorting)
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

        // --- AI & Story Integration ---
        this.registry.set('storyData', StoryData);
        this.guideSystem = new GuideSystem(this);

        // Guide Key (G)
        this.input.keyboard.on('keydown-G', async () => {
            // Visual feedback that we are thinking
            const feedback = this.add.text(10, 100, "Intuition: Thinking...", {
                font: "16px Courier", fill: "#00ff00", backgroundColor: "#000000"
            }).setScrollFactor(0).setDepth(2000);

            const hint = await this.guideSystem.askForHint();
            feedback.destroy();

            // Show hint
            const hintText = this.add.text(400, 500, `INTUITION: ${hint}`, {
                font: "18px Courier",
                fill: "#ffffff",
                backgroundColor: "#000000aa",
                wordWrap: { width: 600, useAdvancedWrap: true },
                padding: { x: 10, y: 10 }
            }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(2000);

            // Fade out
            this.time.delayedCall(5000, () => {
                hintText.destroy();
            });
        });


        // --- NPC Debug Markers + Spawn Probe ---
        const npcLayer = this.findObjectLayer ? this.findObjectLayer('NPCs') : map.getObjectLayer('NPCs');
        // #region agent log
        const hasNpcLayer = !!npcLayer;
        const hasNpcObjects = npcLayer && npcLayer.objects && npcLayer.objects.length > 0;
        fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Game.js:817', message: 'NPC layer check', data: { hasLayer: hasNpcLayer, hasObjects: hasNpcObjects, objectCount: npcLayer?.objects?.length || 0, layerName: npcLayer?.name || 'none' }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'D' }) }).catch(() => { });
        // #endregion
        if (hasNpcObjects) {
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
        const interactLayer = this.findObjectLayer ? this.findObjectLayer('Interactables') : map.getObjectLayer('Interactables');
        this.interactionTarget = null;
        this.interactionType = null;
        this.nearestNPC = null; // Store nearest NPC for interaction prompts
        this.evidenceCatalog = [];
        this.suspectCatalog = [];
        this.suspectLocations = {};
        
        // MANDATORY FIX: Persistent [E] interaction overlay storage
        this.npcInteractionPrompts = new Map(); // Map<npc, Phaser.GameObjects.Text>

        if (interactLayer && interactLayer.objects) {
            interactLayer.objects.forEach((obj) => {
                const { x, y } = getObjectCenter(obj);
                const kind = getProp(obj, 'kind');
                const id = getProp(obj, 'id') || getProp(obj, 'evidenceId') || obj.name || `obj_${obj.id}`;
                const title = getProp(obj, 'title') || obj.name || id;
                const image = getProp(obj, 'image');
                const portrait = getProp(obj, 'portrait');

                if (obj.name === 'desk') {
                    // Safety: Check texture exists before creating image
                    if (this.textures.exists('detective_props')) {
                        const prop = this.add.image(x, y, 'detective_props');
                        prop.setCrop(0, 0, 96, 64);
                        prop.setDepth(5);
                    } else {
                        console.warn(`⚠️ Texture 'detective_props' not found for desk object at (${x}, ${y})`);
                    }
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
                
                // CRITICAL: Enable physics body for overlap detection
                if (zone.body) {
                    zone.body.setSize(obj.width || 32, obj.height || 32);
                    zone.body.setOffset(0, 0);
                }

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
            // Mock Evidence 1: A suspicious letter at first quest location (Mr. Finch at School Zone)
            // First quest: day_1_investigation, first objective: obj_interview_finch
            // Location: { x: 1600, y: 1600 } from npcs.js
            const mockX = 1600; // First quest location X
            const mockY = 1600; // First quest location Y
            const zone = this.add.rectangle(mockX, mockY, 32, 32, 0x00ff00, 0.5);
            this.physics.add.existing(zone, true);

            zone.setData('kind', 'evidence');
            zone.setData('id', 'mock_letter');
            zone.setData('title', 'Suspicious Letter');
            zone.setData('image', 'evidence_paper'); // Placeholder key
            zone.setData('metadata', { description: "A crumpled letter with strange symbols found near the school." });

            // CRITICAL: Enable physics body for overlap detection
            if (zone.body) {
                zone.body.setSize(32, 32);
                zone.body.setOffset(0, 0);
            }

            this.interactables.add(zone);
            this.evidenceCatalog.push({ id: 'mock_letter', title: 'Suspicious Letter', image: 'evidence_paper' });

            // Visual indicator with pulsing animation
            const indicator = this.add.circle(mockX, mockY, 8, 0x00ff00, 0.8);
            indicator.setStrokeStyle(2, 0x00ff00, 1.0);
            indicator.setDepth(50);
            indicator.setVisible(true);
            indicator.setAlpha(1);
            
            // Pulsing animation for visibility
            this.tweens.add({
                targets: indicator,
                scaleX: 1.2,
                scaleY: 1.2,
                duration: 1000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            this.add.text(mockX - 40, mockY - 40, "EVIDENCE", { fontSize: '12px', color: '#00ff00' });
        }

        // --- 5. Transitions (Doors) ---
        this.transitions = this.physics.add.staticGroup();
        const transitionLayer = this.findObjectLayer ? this.findObjectLayer('Transition') : map.getObjectLayer('Transition');
        if (transitionLayer && transitionLayer.objects) {
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
        // CRITICAL FIX: Interaction prompt with high depth to ensure visibility
        // Positioned below Quest Tracker (100px from top) to avoid overlap
        this.promptText = this.add.text(16, 130, 'Press [E] to interact', {
            fontFamily: 'Courier New, Courier, monospace', // Captive Horror pixel font
            fontSize: '16px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 10, y: 6 },
            stroke: '#b4945a', // Gold stroke (Noir style)
            strokeThickness: 2
        });
        this.promptText.setScrollFactor(0); // Fixed to screen
        this.promptText.setDepth(10002); // Very high depth - above Quest Tracker
        this.promptText.setVisible(false);
        this.promptText.setAlpha(1.0); // Force full opacity
        
        // CRITICAL: Create fallback HTML overlay for interaction prompt if Phaser fails
        this.createFallbackInteractionPrompt();
        
        console.log('✅ Interaction prompt initialized');

        // --- 7. Camera ---
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        // Camera zoom (NOT layer scaling - layers must remain scale 1.0 for collision alignment)
        this.cameraZoom = 1.0;
        this.cameras.main.setZoom(this.cameraZoom);
        this.minZoom = 0.5;
        this.maxZoom = 2.0;

        // --- 8. Input ---
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,A,S,D');
        this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.keyPlus = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.PLUS);
        this.keyMinus = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.MINUS);
        this.keyEquals = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.EQUALS);
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
        
        // Force NPC Re-render (F7) - MANDATORY FIX
        this.input.keyboard.on('keydown-F7', () => {
            console.log('🔄 F7 pressed: Force re-rendering all NPCs...');
            this.forceRerenderNPCs();
        });
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

this.questSystem.events.on('quest-update', (activeQuest) => {
    if (this.minimap) {
        console.log('[DEBUG] Minimap received quest-update event:', activeQuest);
        this.minimap.setQuestTarget(activeQuest?.target || null);
    }
});
        // Safety: Use dynamic import to handle old builds that don't have Minimap
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Game.js:657', message: 'Attempting to load Minimap dynamically', data: { scene: 'Game' }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'minimap-fix', hypothesisId: 'A' }) }).catch(() => { });
        console.log('[DEBUG] Attempting to load Minimap dynamically');
        // #endregion
        this.minimap = null;
        // Use dynamic import - this will not crash if minimap.js is missing from bundle
        (async () => {
            try {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Game.js:664', message: 'Starting dynamic import', data: {}, timestamp: Date.now(), sessionId: 'debug-session', runId: 'minimap-fix', hypothesisId: 'A' }) }).catch(() => { });
                // #endregion
                const minimapModule = await import('../utils/minimap.js');
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Game.js:666', message: 'Minimap module loaded', data: { hasMinimap: !!minimapModule.Minimap, moduleKeys: Object.keys(minimapModule) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'minimap-fix', hypothesisId: 'A' }) }).catch(() => { });
                console.log('[DEBUG] Minimap module loaded', { hasMinimap: !!minimapModule.Minimap });
                // #endregion
                if (minimapModule && minimapModule.Minimap) {
                    try {
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Game.js:670', message: 'Creating Minimap instance', data: {}, timestamp: Date.now(), sessionId: 'debug-session', runId: 'minimap-fix', hypothesisId: 'A' }) }).catch(() => { });
                        // #endregion
                        this.minimap = new minimapModule.Minimap(this);
                        this.minimap.init();
                        // Ensure minimap is always visible
                        this.minimap.setEnabled(true);
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Game.js:673', message: 'Minimap initialized successfully', data: {}, timestamp: Date.now(), sessionId: 'debug-session', runId: 'minimap-fix', hypothesisId: 'A' }) }).catch(() => { });
                        console.log('[DEBUG] Minimap initialized successfully and enabled');
                        // #endregion
                    } catch (e) {
                        console.warn('Minimap initialization failed:', e);
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Game.js:678', message: 'Minimap init error', data: { error: e.message, stack: e.stack }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'minimap-fix', hypothesisId: 'A' }) }).catch(() => { });
                        console.log('[DEBUG] Minimap init error', { error: e.message });
                        // #endregion
                        this.minimap = null;
                    }
                } else {
                    console.warn('Minimap class not found in module');
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Game.js:685', message: 'Minimap class not in module', data: {}, timestamp: Date.now(), sessionId: 'debug-session', runId: 'minimap-fix', hypothesisId: 'A' }) }).catch(() => { });
                    console.log('[DEBUG] Minimap class not in module');
                    // #endregion
                }
            } catch (e) {
                console.warn('Minimap module not available in this build - minimap features disabled', e);
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Game.js:691', message: 'Minimap module import failed', data: { error: e.message, stack: e.stack }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'minimap-fix', hypothesisId: 'A' }) }).catch(() => { });
                console.log('[DEBUG] Minimap module import failed', { error: e.message });
                // #endregion
                this.minimap = null;
            }
        })();

        // M key toggle full map
        this.mHandler = () => {
            if (this.minimap) {
                const isFull = this.minimap.toggleFullMap();
                console.log(`Full Map ${isFull ? 'enabled' : 'disabled'}`);
            } else {
                console.warn('Minimap not available');
            }
        };
        this.input.keyboard.on('keydown-M', this.mHandler);

        // F7 toggle minimap visibility
        this.f7Handler = () => {
            if (this.minimap) {
                const enabled = this.minimap.toggle();
                console.log(`Minimap ${enabled ? 'visible' : 'hidden'}`);
            } else {
                console.warn('Minimap not available');
            }
        };
        this.input.keyboard.on('keydown-F7', this.f7Handler);

        // F9 toggle character body debug overlay (draws physics body rectangles)
        this.showBodyDebug = false;
        this.bodyDebugGraphics = null;
        this.f9Handler = () => {
            this.showBodyDebug = !this.showBodyDebug;
            if (this.showBodyDebug) {
                if (!this.bodyDebugGraphics) {
                    this.bodyDebugGraphics = this.add.graphics();
                    this.bodyDebugGraphics.setDepth(999999);
                    this.bodyDebugGraphics.setScrollFactor(1);
                }
                this.bodyDebugGraphics.setVisible(true);
                console.log('🔵 F9: Character body debug ON (cyan rectangles = physics bodies)');
            } else {
                if (this.bodyDebugGraphics) {
                    this.bodyDebugGraphics.setVisible(false);
                    this.bodyDebugGraphics.clear();
                }
                console.log('🔵 F9: Character body debug OFF');
            }
        };
        this.input.keyboard.on('keydown-F9', this.f9Handler);

        // --- 9. UI ---
        this.notebookUI = new NotebookUI();
        this.notebookUI.setAccuseHandler((suspectId) => this.handleAccuse(suspectId));
        this.evidenceModal = new EvidenceModal();
        this.interrogationUI = new InterrogationUI({ storyData: StoryData });
        this.dialogueUI = new DialogueBoxUI(this);
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
        this.spawnNPCs().then(() => {
            // MANDATORY: Force re-render all NPCs with correct scale
            this.forceRerenderNPCs();
            // Run collision audit after NPCs are spawned
            this.runCollisionAudit();
            // Spawn quest items after NPCs
            this.spawnQuestItems();
        }).catch(err => {
            console.error('Error spawning NPCs:', err);
        });
        if (import.meta && import.meta.env && import.meta.env.DEV) {
            this.debugHealthReport();
        }

        // --- 12. Quest System & Navigation ---
        this.questSystem = new QuestSystem(this);
        this.questUI = new QuestUI(this);
        
        // MANDATORY FIX: Create local quest data FIRST to bypass broken api.js
        // ZERO-FAILURE: Quest Board must be visible immediately, no API dependencies
        this.localQuestData = {
            activeQuest: {
                questId: 'day_1_investigation',
                title: 'Find the Suspicious Letter',
                objective: 'Search near the Cafe',
                state: 'active',
                objectives: {
                    'obj_interview_finch': {
                        id: 'obj_interview_finch',
                        description: 'Search near the Cafe',
                        completed: false
                    }
                }
            }
        };
        
        // MANDATORY FIX: Force-inject Quest Tracker WITHOUT waiting for API
        // Hard-link instantiation immediately, bypassing any API dependencies
        try {
            this.questTracker = new QuestTrackerUI(this);
            console.log('✅ Quest Tracker UI created');
        } catch (error) {
            console.error('❌ Failed to create Quest Tracker UI:', error);
            // Create DOM fallback
            this.createDOMQuestTracker();
        }
        
        // HARD-LINK: Set depth to 9999 (topmost layer) - MANDATORY
        if (this.questTracker && this.questTracker.container) {
            this.questTracker.container.setDepth(9999);
            this.questTracker.container.setVisible(true);
            this.questTracker.container.setAlpha(1.0);
            console.log('✅ Quest Tracker depth set to 9999 (topmost layer)');
        }
        
        // MOCK DATA: Provide hardcoded "Fallback Quest" object
        const fallbackQuest = {
            questId: 'day_1_investigation',
            title: 'Find the Suspicious Letter',
            objective: 'Search near the Cafe',
            state: 'active'
        };
        
        // Force-set fallback quest immediately using local data
        if (this.questTracker) {
            // Override quest tracker's data source to use local data
            if (this.localQuestData && this.localQuestData.activeQuest) {
                this.questTracker.currentQuestId = this.localQuestData.activeQuest.questId;
                this.questTracker.currentObjectiveId = 'obj_interview_finch';
            }
            this.questTracker.setQuest('day_1_investigation', 'obj_interview_finch');
            
            // ZERO-FAILURE: Force-set objective text to "Find the Suspicious Letter" - must be visible immediately
            if (this.questTracker.objectiveText) {
                this.questTracker.objectiveText.setText('Find the Suspicious Letter');
                this.questTracker.objectiveText.setVisible(true);
                this.questTracker.objectiveText.setAlpha(1.0);
                this.questTracker.objectiveText.setDepth(10000);
                console.log('✅ Quest Tracker objective text forced: "Find the Suspicious Letter"');
            } else {
                console.warn('⚠️ Quest Tracker objectiveText is null - recreating...');
                // Recreate if missing
                if (this.questTracker.container) {
                    this.questTracker.objectiveText = this.add.text(10, 32, 'Find the Suspicious Letter', {
                        fontFamily: 'Courier New, Courier, monospace',
                        fontSize: '14px',
                        color: '#f5f1e5',
                        wordWrap: { width: 300, useAdvancedWrap: true },
                        lineSpacing: 4
                    });
                    this.questTracker.objectiveText.setOrigin(0, 0);
                    this.questTracker.objectiveText.setVisible(true);
                    this.questTracker.objectiveText.setAlpha(1.0);
                    this.questTracker.objectiveText.setDepth(10000);
                    this.questTracker.container.add(this.questTracker.objectiveText);
                }
            }
            if (this.questTracker.headerText) {
                this.questTracker.headerText.setVisible(true);
                this.questTracker.headerText.setAlpha(1.0);
                this.questTracker.headerText.setDepth(10000);
            }
            if (this.questTracker.background) {
                this.questTracker.background.setVisible(true);
                this.questTracker.background.setAlpha(1.0);
                this.questTracker.background.setDepth(9999);
            }
            
            // Force show
            this.questTracker.show();
            
            // MANDATORY: Force visibility and depth on ALL elements
            if (this.questTracker.container) {
                this.questTracker.container.setVisible(true);
                this.questTracker.container.setAlpha(1.0);
                this.questTracker.container.setDepth(9999);
                // Force all children visible
                this.questTracker.container.list.forEach(child => {
                    if (child) {
                        child.setVisible(true);
                        child.setAlpha(1.0);
                        if (child.setDepth) child.setDepth(10000);
                    }
                });
            }
            
            console.log('✅ Quest Tracker force-injected with local data - "Find the Suspicious Letter"');
            console.log('✅ Quest Tracker depth: 9999, visible: true, alpha: 1.0');
        }
        
        // Store reference as questTrackerUI for compatibility
        this.questTrackerUI = this.questTracker;
        
        // DOM FALLBACK: Create HTML overlay as backup
        this.createDOMQuestTracker();
        
        // DEBUG: Verify Quest Tracker is visible
        setTimeout(() => {
            if (this.questTracker && this.questTracker.container) {
                const visible = this.questTracker.container.visible;
                const alpha = this.questTracker.container.alpha;
                const depth = this.questTracker.container.depth;
                console.log(`🔍 Quest Tracker Debug: visible=${visible}, alpha=${alpha}, depth=${depth}`);
                if (!visible || alpha < 0.1) {
                    console.warn('⚠️ Quest Tracker not visible! Forcing visibility...');
                    this.questTracker.container.setVisible(true);
                    this.questTracker.container.setAlpha(1.0);
                    this.questTracker.container.setDepth(9999);
                }
            }
            // Check DOM fallback
            const domTracker = document.getElementById('dom-quest-tracker');
            if (domTracker) {
                console.log('✅ DOM Quest Tracker found in DOM');
            } else {
                console.warn('⚠️ DOM Quest Tracker not found! Recreating...');
                this.createDOMQuestTracker();
            }
        }, 500);

        this.questSystem.events.on('quest-update', (quest) => {
            console.log('📋 Quest Update Event:', quest);
            this.questUI.updateQuest(quest);
            if (this.questTrackerUI) {
                this.questTrackerUI.refresh(); // Update persistent quest tracker
                this.questTrackerUI.show(); // Force-show after refresh
            }
            this.updateQuestNavigation(quest);
            // Update Dialogue Controller Context
            if (this.dialogueUI && this.dialogueUI.dialogueController) {
                this.dialogueUI.dialogueController.setQuestContext(quest ? quest.id : null);
            }
        });
        
        // Force initial quest display after a short delay to ensure everything is loaded
        this.time.delayedCall(500, () => {
            if (this.questTrackerUI) {
                this.questTrackerUI.refresh();
                this.questTrackerUI.show();
                console.log('🔄 Quest Tracker UI refreshed after delay');
            }
        });

        // --- 12.5. Route System Integration (from PATHFINDING_ANALYSIS.md) ---
        this.routeSystem = {
            currentRoute: null,
            currentWaypointIndex: 0,
            routes: {
                speedrun: {
                    id: 'speedrun',
                    name: 'Route 1: The Speedrun',
                    waypoints: [
                        { x: 1100, y: 1100, location: 'police_station', action: 'start' },
                        { x: 1600, y: 1600, location: 'school', npcs: ['mr_finch', 'headmaster_whitcombe', 'evie_moreland'] },
                        { x: 2200, y: 2200, location: 'pennyworth_lane', npcs: ['old_willy'] },
                        { x: 1100, y: 1100, location: 'police_station', action: 'return' }
                    ],
                    efficiencyScore: 92
                },
                balanced: {
                    id: 'balanced',
                    name: 'Route 2: The Balanced',
                    waypoints: [
                        { x: 1100, y: 1100, location: 'police_station', action: 'start' },
                        { x: 1152, y: 1120, location: 'police_station', action: 'collect_evidence', clueId: 'desk_receipt' },
                        { x: 1600, y: 1600, location: 'school', npcs: ['mr_finch', 'headmaster_whitcombe', 'evie_moreland'] },
                        { x: 2200, y: 2200, location: 'pennyworth_lane', npcs: ['old_willy', 'mary_henshaw'] },
                        { x: 1800, y: 2600, location: 'woods_edge', npcs: ['aaron_kosminski'], optional: true },
                        { x: 1100, y: 1100, location: 'police_station', action: 'return' }
                    ],
                    efficiencyScore: 78
                },
                resourceHeavy: {
                    id: 'resource_heavy',
                    name: 'Route 3: The Safe/Resource-Heavy',
                    waypoints: [
                        { x: 1100, y: 1100, location: 'police_station', npcs: ['edwin_clarke', 'arthur_kosminski', 'mr_ashcombe'] },
                        { x: 1152, y: 1120, location: 'police_station', action: 'collect_evidence' },
                        { x: 1600, y: 1600, location: 'school', npcs: ['mr_finch', 'headmaster_whitcombe', 'evie_moreland', 'samuel_atwell', 'beatrice_holloway', 'clara_redford', 'james_calder', 'mrs_loxley'] },
                        { x: 2200, y: 2400, location: 'pennyworth_lane', npcs: ['old_willy', 'mary_henshaw', 'mr_cobb'] },
                        { x: 2400, y: 2800, location: 'harrow_residence', npcs: ['mr_harrow', 'mrs_harrow', 'peter_harrow'] },
                        { x: 3000, y: 2200, location: 'risky_passage', npcs: ['ada_merriweather'] },
                        { x: 3200, y: 2400, location: 'lions_den', action: 'reconnaissance' },
                        { x: 1100, y: 1100, location: 'police_station', action: 'return' }
                    ],
                    efficiencyScore: 55
                }
            },

            selectRoute(routeId) {
                this.currentRoute = this.routes[routeId];
                this.currentWaypointIndex = 0;
                if (this.currentRoute) {
                    console.log(`✅ Route selected: ${this.currentRoute.name} (Efficiency: ${this.currentRoute.efficiencyScore}/100)`);
                }
            },

            getCurrentWaypoint() {
                if (!this.currentRoute || !this.currentRoute.waypoints) return null;
                return this.currentRoute.waypoints[this.currentWaypointIndex] || null;
            },

            advanceWaypoint() {
                if (!this.currentRoute) return false;
                if (this.currentWaypointIndex < this.currentRoute.waypoints.length - 1) {
                    this.currentWaypointIndex++;
                    return true;
                }
                return false;
            }
        };

        // Initialize route system (default to balanced route per PATHFINDING_ANALYSIS.md recommendation)
        this.routeSystem.selectRoute('balanced');



        // Visuals: White Circle at feet
        this.navCircle = this.add.graphics();
        this.navCircle.lineStyle(2, 0xffffff, 0.8);
        this.navCircle.strokeCircle(0, 0, 16);
        this.navCircle.setDepth(5); // Just above ground
        this.navCircle.setVisible(false);

        // Visuals: Directional Arrow
        this.navArrow = this.add.triangle(0, 0, 0, -10, 10, 10, -10, 10, 0xffd700);
        this.navArrow.setDepth(5);
        this.navArrow.setVisible(false);

        // Init Quest System AFTER visuals are ready
        this.questSystem.init();

        // --- 13. Debug Overlay (F2 toggle) ---
        const debugData = this.registry.get("mapDebugData");
        this.debugCollisionActive = false;
        this.f2Handler = () => {
            this.debugCollisionActive = !this.debugCollisionActive;

            if (this.debugCollisionActive) {
                // Show collision visualization
                this.showCollisionDebug();
                // Toggle physics bodies
                if (!this.physics.world.drawDebug) {
                    this.physics.world.createDebugGraphic();
                    this.physics.world.drawDebug = true;
                }
                console.log("🔴 F2: Collision debug ON (red=blocked tiles/rectangles, green=physics bodies)");
            } else {
                // Hide collision visualization
                this.hideCollisionDebug();
                // Hide physics bodies
                if (this.physics.world.drawDebug) {
                    this.physics.world.drawDebug = false;
                    if (this.physics.world.debugGraphic) {
                        this.physics.world.debugGraphic.clear();
                    }
                }
                console.log("🔴 F2: Collision debug OFF");
            }

            // Also toggle map debug overlay if available
            if (debugData && this.mapDebugOverlay) {
                this.mapDebugOverlay.toggle();
            }
        };
        this.input.keyboard.on("keydown-F2", this.f2Handler);

        // F8: Run collision audit manually
        this.f8Handler = () => {
            console.log('🔍 Running collision audit...');
            this.runCollisionAudit();
        };
        this.input.keyboard.on("keydown-F8", this.f8Handler);

        // F11: Boundary Painter Tool - Right-click to toggle collision state
        this.boundaryPainterActive = false;
        this.boundaryPainterGraphics = null;
        this.boundaryPainterUI = null;
        this.f11Handler = () => {
            this.boundaryPainterActive = !this.boundaryPainterActive;
            if (this.boundaryPainterActive) {
                this.showBoundaryPainter();
                console.log("🎨 F11: Boundary Painter ON - Right-click to toggle collision (Red=solid, Green=walkable)");
            } else {
                this.hideBoundaryPainter();
                console.log("🎨 F11: Boundary Painter OFF");
            }
        };
        this.input.keyboard.on("keydown-F11", this.f11Handler);
        
        // Right-click handler for boundary painting
        this.input.on('pointerdown', (pointer, gameObjects) => {
            if (this.boundaryPainterActive && pointer.button === 2) { // Right mouse button
                this.paintBoundaryCell(pointer.worldX, pointer.worldY);
            }
        });

        if (debugData) {
            this.mapDebugOverlay = new MapDebugOverlay(this, debugData);
        }
        console.log("🗺️ Debug overlay ready: press F2 to toggle collision visualization");
        console.log("🔍 Collision audit: press F8 to run manually (also runs automatically after NPC spawn)");
        console.log("🎨 Boundary Painter: press F11 to toggle - Right-click to paint collision cells (Red=solid, Green=walkable)");
        
        // --- AUTOMATIC GLOBAL BOUNDARY SHRINK ---
        // Automatically execute Global Boundary Shrink after map initialization completes
        // This runs asynchronously in the background to avoid blocking game startup
        setTimeout(() => {
            if (this.map && this.mapW && this.mapH && this.subGridCollisionData !== undefined) {
                console.log("🔧 Starting automatic Global Boundary Shrink...");
                this.executeGlobalShrink({
                    alphaThreshold: 128,
                    minConsecutivePixels: 4,
                    onProgress: (processed, total) => {
                        if (processed % 1000 === 0 || processed === total) {
                            const progress = (processed / total * 100).toFixed(1);
                            console.log(`🔧 Global Boundary Shrink: ${progress}% (${processed}/${total} tiles)`);
                        }
                    }
                }).then(stats => {
                    console.log('✅ Global Boundary Shrink complete!', stats);
                    console.log(`   ${stats.tilesShrunk} tiles shrunk (boundaries tightened)`);
                    console.log(`   ${stats.tilesUnchanged} tiles unchanged`);
                    console.log(`   Elapsed time: ${stats.elapsedTime}`);
                }).catch(err => {
                    console.error('❌ Global Boundary Shrink failed:', err);
                });
            }
        }, 1000); // Wait 1 second for map to fully initialize
    }

    /**
     * Build merged rectangle colliders from blocked tile layer
     * Uses scanline algorithm to merge adjacent blocked tiles into larger rectangles
     * @param {Phaser.Tilemaps.TilemapLayer} layer - The blocked tile layer
     * @param {Phaser.Tilemaps.Tilemap} map - The tilemap
     * @returns {Array<{x, y, w, h}>} Array of merged rectangles in pixel coordinates
     */
    buildMergedRectangleColliders(layer, map) {
        const tileW = map.tileWidth || 32;
        const tileH = map.tileHeight || 32;
        const mapW = map.width;
        const mapH = map.height;

        // Build boolean grid of blocked tiles
        const blocked = [];
        for (let ty = 0; ty < mapH; ty++) {
            blocked[ty] = [];
            for (let tx = 0; tx < mapW; tx++) {
                const tile = layer.getTileAt(tx, ty);
                blocked[ty][tx] = (tile && tile.collides) ? true : false;
            }
        }

        // Track which tiles have been merged
        const merged = [];
        for (let ty = 0; ty < mapH; ty++) {
            merged[ty] = new Array(mapW).fill(false);
        }

        const rectangles = [];

        // Scanline algorithm: find largest rectangles
        for (let ty = 0; ty < mapH; ty++) {
            for (let tx = 0; tx < mapW; tx++) {
                // Skip if already merged or not blocked
                if (merged[ty][tx] || !blocked[ty][tx]) continue;

                // Try to extend rectangle right and down
                let maxW = 1;
                let maxH = 1;

                // Find maximum width (extend right)
                while (tx + maxW < mapW && blocked[ty][tx + maxW] && !merged[ty][tx + maxW]) {
                    maxW++;
                }

                // Find maximum height (extend down) for this width
                let canExtendDown = true;
                while (canExtendDown && ty + maxH < mapH) {
                    // Check if entire row is blocked and not merged
                    for (let x = tx; x < tx + maxW; x++) {
                        if (!blocked[ty + maxH][x] || merged[ty + maxH][x]) {
                            canExtendDown = false;
                            break;
                        }
                    }
                    if (canExtendDown) {
                        maxH++;
                    }
                }

                // Mark tiles as merged
                for (let y = ty; y < ty + maxH; y++) {
                    for (let x = tx; x < tx + maxW; x++) {
                        merged[y][x] = true;
                    }
                }

                // Convert to pixel coordinates
                rectangles.push({
                    x: tx * tileW,
                    y: ty * tileH,
                    w: maxW * tileW,
                    h: maxH * tileH
                });
            }
        }

        return rectangles;
    }

    /**
     * Normalize character sprite (player or NPC) to consistent on-screen size and physics body
     * Reads frame dimensions at runtime and computes scale from tile size
     * @param {Phaser.Physics.Arcade.Sprite} sprite - The sprite to normalize
     * @param {number} tileW - Tile width from map (for computing target height and body size)
     * @param {number} tileH - Tile height from map (for computing target height and body size)
     * @returns {Object} Debug info: {key, frameW, frameH, scale, displayW, displayH, bodyW, bodyH, bodyOffsetX, bodyOffsetY}
     */
    normalizeCharacterSprite(sprite, tileW, tileH) {
        // MANDATORY FIX: NPC Scale Lock - Hard-code scale to 2.0 to match detective exactly
        if (sprite._scaleLocked) {
            // ZERO-FAILURE: Hard-code scale to 2.0 - NPCs MUST match detective visually
            const MANDATORY_NPC_SCALE = 2.0;
            sprite.setScale(MANDATORY_NPC_SCALE);
            
            // Read frame dimensions
            let frameW, frameH;
            if (sprite.frame && sprite.frame.realWidth && sprite.frame.realHeight) {
                frameW = sprite.frame.realWidth;
                frameH = sprite.frame.realHeight;
            } else if (sprite.width && sprite.height) {
                frameW = sprite.width;
                frameH = sprite.height;
            } else {
                const texture = sprite.texture;
                const frame = texture ? texture.get(0) : null;
                frameW = frame ? frame.width : 64;
                frameH = frame ? frame.height : 64;
            }
            
            // Calculate displayHeight - must match player (+/- 1px tolerance)
            const displayH = frameH * MANDATORY_NPC_SCALE;
            sprite.displayHeight = displayH;
            
            // Verify against player if available
            if (this.player) {
                const playerFrameH = this.player.frame ? this.player.frame.height : 64;
                const playerScale = this.player.scaleX || this.player.scale || 1.0;
                const playerDisplayH = playerFrameH * playerScale;
                const heightDiff = Math.abs(displayH - playerDisplayH);
                
                if (heightDiff > 1) {
                    // Adjust to match player exactly
                    const adjustedScale = playerDisplayH / frameH;
                    sprite.setScale(adjustedScale);
                    sprite.displayHeight = playerDisplayH;
                    console.log(`[NPC Scale Match] ${sprite.texture?.key || 'unknown'}: Adjusted scale to ${adjustedScale.toFixed(3)} to match player (NPC: ${playerDisplayH.toFixed(1)}px, Player: ${playerDisplayH.toFixed(1)}px)`);
                } else {
                    console.log(`[NPC Scale Match] ${sprite.texture?.key || 'unknown'}: Scale ${MANDATORY_NPC_SCALE} matches player (NPC: ${displayH.toFixed(1)}px, Player: ${playerDisplayH.toFixed(1)}px, diff: ${heightDiff.toFixed(1)}px)`);
                }
            } else {
                console.log(`[NPC Scale Lock HARD-CODED] ${sprite.texture?.key || 'unknown'}: scale=${MANDATORY_NPC_SCALE}, displayH=${displayH.toFixed(1)}px`);
            }
            
            // Continue with rest of normalization (origin, body, etc.)
            sprite.setOrigin(0.5, 1.0);
            
            // Compute display dimensions (use sprite.displayHeight if set, otherwise calculate)
            const displayW = frameW * sprite.scaleX;
            const displayH_final = sprite.displayHeight || (frameH * sprite.scaleY);
            
            // FEET COLLIDER (scale-safe)
            if (GameScene.ACTOR_BODY_USE_CIRCLE) {
                const r = GameScene.ACTOR_BODY_CIRCLE_RADIUS;
                sprite.body.setCircle(r);
                sprite.body.setOffset(
                    (sprite.displayWidth / 2) - r,
                    sprite.displayHeight - (2 * r)
                );
            } else {
                const w = GameScene.ACTOR_BODY_W;
                const h = GameScene.ACTOR_BODY_H;
                sprite.body.setSize(w, h);
                sprite.body.setOffset(
                    (sprite.displayWidth - w) / 2,
                    sprite.displayHeight - h
                );
            }
            
            sprite.setDepth(Math.floor(sprite.y));
            
            return {
                key: sprite.texture?.key || 'unknown',
                frameW,
                frameH,
                scale: sprite.scaleX.toFixed(3),
                displayW: sprite.displayWidth.toFixed(1),
                displayH: sprite.displayHeight.toFixed(1),
                bodyW: sprite.body ? sprite.body.width.toFixed(1) : 'N/A',
                bodyH: sprite.body ? sprite.body.height.toFixed(1) : 'N/A',
                bodyOffsetX: sprite.body ? sprite.body.offset.x.toFixed(1) : 'N/A',
                bodyOffsetY: sprite.body ? sprite.body.offset.y.toFixed(1) : 'N/A',
                origin: `(${sprite.originX.toFixed(2)}, ${sprite.originY.toFixed(2)})`
            };
        }
        
        // Standard normalization for player (not scale-locked)
        // Read frame dimensions at runtime
        let frameW, frameH;
        if (sprite.frame && sprite.frame.realWidth && sprite.frame.realHeight) {
            frameW = sprite.frame.realWidth;
            frameH = sprite.frame.realHeight;
        } else if (sprite.width && sprite.height) {
            frameW = sprite.width;
            frameH = sprite.height;
        } else {
            // Fallback: try to get from texture
            const texture = sprite.texture;
            const frame = texture ? texture.get(0) : null;
            frameW = frame ? frame.width : 64;
            frameH = frame ? frame.height : 64;
        }

        // Compute target visual height from tile size (tileHeight * 1.75 for good visibility)
        const TARGET_H = tileH * 1.75;

        // Compute scale to reach target height (maintain aspect ratio)
        const scale = TARGET_H / frameH;

        // Apply scale
        sprite.setScale(scale);

        // Set origin to bottom center (feet at bottom)
        sprite.setOrigin(0.5, 1.0);

        // Compute display dimensions
        const displayW = frameW * scale;
        const displayH = frameH * scale;

        // --- FEET COLLIDER (scale-safe) ---
        // Use displayWidth/displayHeight to compute offsets that work with any scale
        if (GameScene.ACTOR_BODY_USE_CIRCLE) {
            const r = GameScene.ACTOR_BODY_CIRCLE_RADIUS; // world pixels
            sprite.body.setCircle(r);
            // Place circle at bottom-center of the displayed sprite
            sprite.body.setOffset(
                (sprite.displayWidth / 2) - r,
                sprite.displayHeight - (2 * r)
            );
        } else {
            const w = GameScene.ACTOR_BODY_W;
            const h = GameScene.ACTOR_BODY_H;
            sprite.body.setSize(w, h);
            // Place rect at bottom-center of the displayed sprite
            sprite.body.setOffset(
                (sprite.displayWidth - w) / 2,
                sprite.displayHeight - h
            );
        }

        // Set depth for Y-sorting (feet position)
        sprite.setDepth(Math.floor(sprite.y));

        // Return debug info (including body dimensions for sprite audit)
        return {
            key: sprite.texture?.key || 'unknown',
            frameW,
            frameH,
            scale: scale.toFixed(3),
            displayW: sprite.displayWidth.toFixed(1),
            displayH: sprite.displayHeight.toFixed(1),
            bodyW: sprite.body ? sprite.body.width.toFixed(1) : 'N/A',
            bodyH: sprite.body ? sprite.body.height.toFixed(1) : 'N/A',
            bodyOffsetX: sprite.body ? sprite.body.offset.x.toFixed(1) : 'N/A',
            bodyOffsetY: sprite.body ? sprite.body.offset.y.toFixed(1) : 'N/A',
            origin: `(${sprite.originX.toFixed(2)}, ${sprite.originY.toFixed(2)})`
        };
    }

    validateTileCollisions(layer, map) {
        // Validate tile collisions for micro gaps
        const tileW = map.tileWidth || 32;
        const tileH = map.tileHeight || 32;
        const mapW = map.width;
        const mapH = map.height;

        let microGapCount = 0;
        const gaps = [];

        // Check each tile in the layer
        for (let ty = 0; ty < mapH; ty++) {
            for (let tx = 0; tx < mapW; tx++) {
                const tile = layer.getTileAt(tx, ty);
                if (tile && tile.collides) {
                    // Check if tile is properly aligned
                    const pixelX = tx * tileW;
                    const pixelY = ty * tileH;

                    // Check neighbors for gaps
                    const neighbors = [
                        { x: tx - 1, y: ty },
                        { x: tx + 1, y: ty },
                        { x: tx, y: ty - 1 },
                        { x: tx, y: ty + 1 }
                    ];

                    for (const n of neighbors) {
                        if (n.x >= 0 && n.x < mapW && n.y >= 0 && n.y < mapH) {
                            const neighborTile = layer.getTileAt(n.x, n.y);
                            if (!neighborTile || !neighborTile.collides) {
                                // Potential gap - log it
                                microGapCount++;
                                if (gaps.length < 10) { // Limit logging
                                    gaps.push({ tx, ty, neighbor: `${n.x},${n.y}` });
                                }
                            }
                        }
                    }
                }
            }
        }

        if (microGapCount > 0) {
            console.warn(`⚠️ Found ${microGapCount} potential micro gaps in collision layer`);
            if (gaps.length > 0) {
                console.warn('Sample gaps:', gaps);
            }
        } else {
            console.log('✅ No micro gaps detected in collision layer');
        }
    }

    showCollisionDebug() {
        // Create or show collision debug graphics
        if (!this.collisionDebugGraphics) {
            this.collisionDebugGraphics = this.add.graphics();
            this.collisionDebugGraphics.setDepth(999998);
            this.collisionDebugGraphics.setScrollFactor(1);
        }

        this.collisionDebugGraphics.clear();
        this.collisionDebugGraphics.visible = true;

        // Draw merged rectangles (magenta) - primary visualization for tile-based collisions
        if (this.mergedCollisionRectangles && this.mergedCollisionRectangles.length > 0) {
            this.collisionDebugGraphics.lineStyle(2, 0xff00ff, 0.9); // Magenta for merged rectangles
            this.mergedCollisionRectangles.forEach(rect => {
                this.collisionDebugGraphics.strokeRect(rect.x, rect.y, rect.w, rect.h);
            });
        }

        // Optional: Draw individual blocked tiles for comparison (yellow, toggle with flag)
        if (this.showIndividualTilesDebug && this.collidableLayers && this.collidableLayers.length > 0) {
            this.collidableLayers.forEach(layer => {
                const map = layer.tilemap;
                const tileW = map.tileWidth || 32;
                const tileH = map.tileHeight || 32;

                this.collisionDebugGraphics.lineStyle(1, 0xffff00, 0.5); // Yellow, semi-transparent
                for (let ty = 0; ty < layer.height; ty++) {
                    for (let tx = 0; tx < layer.width; tx++) {
                        const tile = layer.getTileAt(tx, ty);
                        if (tile && tile.collides) {
                            const x = tx * tileW;
                            const y = ty * tileH;
                            this.collisionDebugGraphics.strokeRect(x, y, tileW, tileH);
                        }
                    }
                }
            });
        }

        // Draw object layer collisions (red rectangles) - from "Collisions" object layer
        if (this.collisionObjects && this.collisionObjects.length > 0) {
            this.collisionObjects.forEach(obj => {
                if (obj.merged) {
                    // Merged rectangles already drawn above, skip
                    return;
                }
                // Original collision objects from object layer (red)
                this.collisionDebugGraphics.lineStyle(2, 0xff0000, 0.8);
                this.collisionDebugGraphics.strokeRect(obj.x, obj.y, obj.w, obj.h);
            });
        }
    }

    hideCollisionDebug() {
        if (this.collisionDebugGraphics) {
            this.collisionDebugGraphics.clear();
            this.collisionDebugGraphics.visible = false;
        }
    }

    /**
     * Helper: Get sub-grid cell index from world coordinates
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @param {number} tx - Tile X coordinate
     * @param {number} ty - Tile Y coordinate
     * @returns {number} Sub-grid cell index (0-15)
     */
    getSubGridCellIndex(worldX, worldY, tx, ty) {
        const tw = this.mapTileWidth || 32;
        const th = this.mapTileHeight || 32;
        const subGridSize = GameScene.SUB_GRID_SIZE;
        const subX = Math.floor((worldX - (tx * tw)) / subGridSize);
        const subY = Math.floor((worldY - (ty * th)) / subGridSize);
        return Math.max(0, Math.min(15, subY * 4 + subX)); // Clamp to 0-15
    }

    /**
     * Helper: Get or set sub-grid bitmask for a tile
     * @param {number} tx - Tile X coordinate
     * @param {number} ty - Tile Y coordinate
     * @param {number} cellIndex - Sub-grid cell index (0-15) to toggle, or null to get mask
     * @returns {number} Bitmask value (0x0000-0xFFFF)
     */
    getSubGridMask(tx, ty, cellIndex = null) {
        const tileKey = `${tx},${ty}`;
        const entry = this.subGridCollisionData?.[tileKey];
        
        // Handle both formats: number (legacy) or object { mask, alpha_threshold_passed }
        let mask = 0x0000;
        if (entry !== undefined) {
            if (typeof entry === 'number') {
                mask = entry;
            } else if (entry && typeof entry === 'object' && 'mask' in entry) {
                mask = entry.mask;
            }
        }
        
        if (cellIndex !== null) {
            // Toggle the bit for this cell
            mask ^= (1 << cellIndex);
            // Update collision data (always use new format with alpha_threshold_passed)
            if (!this.subGridCollisionData) this.subGridCollisionData = {};
            this.subGridCollisionData[tileKey] = {
                mask: mask,
                alpha_threshold_passed: true
            };
        }
        
        return mask;
    }

    /**
     * Helper: Check if a sub-grid cell is walkable
     * @param {number} mask - Bitmask value
     * @param {number} cellIndex - Sub-grid cell index (0-15)
     * @returns {boolean} True if walkable (bit = 0)
     */
    isSubCellWalkable(mask, cellIndex) {
        return !(mask & (1 << cellIndex));
    }

    /**
     * Helper: Get raw pixel color and alpha from texture at coordinates
     * @param {string} textureKey - Texture key
     * @param {number} x - X coordinate in texture
     * @param {number} y - Y coordinate in texture
     * @returns {Object} {hex: "#RRGGBB", alpha: 0-255, rgba: [r, g, b, a]}
     */
    getRawPixelColor(textureKey, x, y) {
        try {
            const texture = this.textures.get(textureKey);
            if (!texture) return { hex: '#000000', alpha: 255, rgba: [0, 0, 0, 255] };
            
            // Get texture source image
            const source = texture.source[0];
            if (!source || !source.image) return { hex: '#000000', alpha: 255, rgba: [0, 0, 0, 255] };
            
            // Create canvas to read pixel data
            const canvas = document.createElement('canvas');
            canvas.width = source.width;
            canvas.height = source.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(source.image, 0, 0);
            
            // Get pixel data
            const imageData = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1);
            const [r, g, b, a] = imageData.data;
            
            // Convert to hex
            const hex = `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
            
            return { hex, alpha: a, rgba: [r, g, b, a] };
        } catch (e) {
            console.warn('Failed to get raw pixel color:', e);
            return { hex: '#000000', alpha: 255, rgba: [0, 0, 0, 255] };
        }
    }

    /**
     * Check if an 8px sub-cell has at least 4 consecutive opaque pixels
     * Uses flood-fill to find connected components of opaque pixels
     * @param {Array<Array<number>>} pixelGrid - 8x8 grid of alpha values (0-255)
     * @param {number} alphaThreshold - Alpha threshold (default: 128)
     * @returns {boolean} True if largest cluster has >= 4 pixels
     */
    hasConsecutiveOpaquePixels(pixelGrid, alphaThreshold = 128) {
        const size = 8;
        const visited = Array(size).fill(null).map(() => Array(size).fill(false));
        let maxClusterSize = 0;
        
        // Flood-fill to find connected components
        const floodFill = (startX, startY) => {
            if (startX < 0 || startX >= size || startY < 0 || startY >= size) return 0;
            if (visited[startY][startX]) return 0;
            if (pixelGrid[startY][startX] < alphaThreshold) return 0; // Not opaque
            
            visited[startY][startX] = true;
            let clusterSize = 1;
            
            // Check 4-connected neighbors (up, down, left, right)
            const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]];
            for (const [dx, dy] of directions) {
                clusterSize += floodFill(startX + dx, startY + dy);
            }
            
            return clusterSize;
        };
        
        // Find all clusters
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (!visited[y][x] && pixelGrid[y][x] >= alphaThreshold) {
                    const clusterSize = floodFill(x, y);
                    maxClusterSize = Math.max(maxClusterSize, clusterSize);
                }
            }
        }
        
        // Cell is solid only if largest cluster has >= 4 pixels
        return maxClusterSize >= 4;
    }

    /**
     * Calculate bounding box of non-transparent pixels within an 8px sub-cell
     * @param {Array<Array<number>>} pixelGrid - 8x8 grid of alpha values (0-255)
     * @param {number} alphaThreshold - Alpha threshold (default: 128)
     * @returns {Object} {minX, minY, maxX, maxY, pixelCount} or null if no opaque pixels
     */
    calculateOpaqueBoundingBox(pixelGrid, alphaThreshold = 128) {
        const size = 8;
        let minX = size, minY = size, maxX = -1, maxY = -1;
        let pixelCount = 0;
        
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (pixelGrid[y][x] >= alphaThreshold) {
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                    pixelCount++;
                }
            }
        }
        
        if (pixelCount === 0) return null;
        
        return { minX, minY, maxX, maxY, pixelCount };
    }

    /**
     * Silhouette-Based Collision: Scan alpha channel for 8px sub-cell with consecutive pixel check
     * Uses alpha channel to determine if sub-cell is walkable
     * A cell is only solid if it contains at least 4 consecutive opaque pixels
     * @param {number} tx - Tile X coordinate
     * @param {number} ty - Tile Y coordinate
     * @param {number} subCellIndex - Sub-grid cell index (0-15)
     * @param {boolean} requireConsecutive - If true, requires 4+ consecutive pixels (default: true)
     * @returns {boolean} True if walkable
     */
    scanSubCellAlpha(tx, ty, subCellIndex, requireConsecutive = true) {
        const tw = this.mapTileWidth || 32;
        const th = this.mapTileHeight || 32;
        const subGridSize = GameScene.SUB_GRID_SIZE;
        const alphaThreshold = 128; // 50% transparent threshold
        
        // Calculate sub-cell position within tile
        const subX = subCellIndex % 4;
        const subY = Math.floor(subCellIndex / 4);
        const cellStartX = subX * subGridSize;
        const cellStartY = subY * subGridSize;
        
        // Build 8x8 pixel grid of alpha values
        const pixelGrid = Array(subGridSize).fill(null).map(() => Array(subGridSize).fill(0));
        
        // Check all visual layers for this tile (from bottom to top)
        const layerNames = Object.keys(this.layers).reverse();
        
        for (const layerName of layerNames) {
            const layer = this.layers[layerName];
            if (!layer || layer.type !== 'tilelayer') continue;
            
            // Skip shadow layers (they don't affect collision)
            if (this.shadowLayers && this.shadowLayers.includes(layerName)) continue;
            
            const tile = layer.getTileAt(tx, ty);
            if (!tile || tile.index === -1) continue;
            
            // Get tileset and texture info
            const tileset = this.map.tilesets.find(ts => {
                const firstGid = ts.firstgid || 0;
                return tile.index >= firstGid && tile.index < firstGid + (ts.tilecount || 0);
            });
            
            if (!tileset) continue;
            
            // Calculate local tile ID within tileset
            const localTileId = tile.index - (tileset.firstgid || 0);
            const tilesPerRow = Math.floor(tileset.imagewidth / tileset.tilewidth);
            const tileXInTileset = localTileId % tilesPerRow;
            const tileYInTileset = Math.floor(localTileId / tilesPerRow);
            
            // Get texture key
            const textureKey = tileset.name;
            const texture = this.textures.get(textureKey);
            if (!texture) continue;
            
            // Sample all pixels in the 8px sub-cell
            for (let py = 0; py < subGridSize; py++) {
                for (let px = 0; px < subGridSize; px++) {
                    // Calculate texture coordinates
                    const textureX = (tileXInTileset * tileset.tilewidth) + cellStartX + px;
                    const textureY = (tileYInTileset * tileset.tileheight) + cellStartY + py;
                    
                    // Bounds check
                    if (textureX < 0 || textureY < 0 || textureX >= tileset.imagewidth || textureY >= tileset.imageheight) {
                        continue;
                    }
                    
                    // Get pixel alpha (use maximum alpha from all layers)
                    const pixelData = this.getRawPixelColor(textureKey, textureX, textureY);
                    pixelGrid[py][px] = Math.max(pixelGrid[py][px], pixelData.alpha);
                }
            }
        }
        
        // If no pixels found in any layer, check blocked tiles as fallback
        const hasAnyPixels = pixelGrid.some(row => row.some(alpha => alpha > 0));
        if (!hasAnyPixels) {
            const idx = ty * (this.mapW || 128) + tx;
            return this.blockedTiles?.[idx] !== 1; // Walkable if not blocked
        }
        
        // Global Boundary Shrink: Check for consecutive opaque pixels
        if (requireConsecutive) {
            // Cell is solid only if it has at least 4 consecutive opaque pixels
            const hasConsecutive = this.hasConsecutiveOpaquePixels(pixelGrid, alphaThreshold);
            return !hasConsecutive; // Walkable if no consecutive cluster found
        } else {
            // Fallback: percentage-based check
            let opaqueCount = 0;
            let totalPixels = 0;
            for (let y = 0; y < subGridSize; y++) {
                for (let x = 0; x < subGridSize; x++) {
                    if (pixelGrid[y][x] >= alphaThreshold) {
                        opaqueCount++;
                    }
                    totalPixels++;
                }
            }
            const opaquePercentage = opaqueCount / totalPixels;
            return opaquePercentage < 0.5; // Walkable if <50% opaque
        }
    }

    /**
     * Generate collision bitmask for a tile using silhouette-based collision
     * Uses Global Boundary Shrink: only marks cells solid if they have 4+ consecutive opaque pixels
     * @param {number} tx - Tile X coordinate
     * @param {number} ty - Tile Y coordinate
     * @param {boolean} useShrink - Use Global Boundary Shrink logic (default: true)
     * @returns {number} Bitmask value (0x0000-0xFFFF)
     */
    generateSilhouetteCollisionMask(tx, ty, useShrink = true) {
        let mask = 0x0000;
        
        // Scan each sub-cell
        for (let cellIndex = 0; cellIndex < 16; cellIndex++) {
            const isWalkable = this.scanSubCellAlpha(tx, ty, cellIndex, useShrink);
            
            if (!isWalkable) {
                // Set bit to 1 (solid) if not walkable
                mask |= (1 << cellIndex);
            }
            // Bit remains 0 (walkable) if transparent or insufficient consecutive pixels
        }
        
        return mask;
    }

    /**
     * GLOBAL BOUNDARY SHRINK: Execute batch processing to tighten all collisions
     * Processes all tiles marked as "Red" (boundary) in collision_map.json
     * Applies alpha thresholding (<128 = non-collidable) and consecutive pixel requirement (4+)
     * 
     * REASONING (Chain-of-Thought):
     * STEP 1: Fetch raw sprite data using getRawPixelColor logic
     * STEP 2: Calculate bounding box of non-transparent pixels within each 8px cell
     * STEP 3: If visual edge only occupies 2px of an 8px cell, mark as walkable
     * STEP 4: Update collision_map.json with tighter bitmasks
     * 
     * EXECUTION (ReAct):
     * THOUGHT: By shrinking boundary to visible silhouette, eliminate 'invisible box' effect
     * ACTION: Agent 3 performs pixel-scan; Agent 1 commits updated bitmasks to JSON
     * VERIFICATION: Use F11 Inspector to verify Green navigable areas follow exact curve/angle
     * 
     * @param {Object} options - Configuration options
     * @param {number} options.alphaThreshold - Alpha threshold (default: 128)
     * @param {number} options.minConsecutivePixels - Minimum consecutive pixels required (default: 4)
     * @param {Function} options.onProgress - Progress callback (tilesProcessed, totalTiles)
     * @returns {Promise<Object>} Statistics about the shrink operation
     */
    async executeGlobalShrink(options = {}) {
        const {
            alphaThreshold = 128,
            minConsecutivePixels = 4,
            onProgress = null
        } = options;

        console.log('🔍 GLOBAL BOUNDARY SHRINK: Starting batch processing...');
        console.log(`   Alpha Threshold: ${alphaThreshold} (<${alphaThreshold} = non-collidable)`);
        console.log(`   Min Consecutive Pixels: ${minConsecutivePixels}`);

        if (!this.map || !this.mapW || !this.mapH) {
            console.error('❌ Map not initialized');
            return { success: false, error: 'Map not initialized' };
        }

        const mapW = this.mapW || 128;
        const mapH = this.mapH || 128;
        const totalTiles = mapW * mapH;
        
        if (!this.subGridCollisionData) {
            this.subGridCollisionData = {};
        }

        let tilesProcessed = 0;
        let tilesShrunk = 0;
        let tilesUnchanged = 0;
        let tilesExpanded = 0;
        const startTime = Date.now();

        // STEP 1: Iterate through all tiles
        for (let ty = 0; ty < mapH; ty++) {
            for (let tx = 0; tx < mapW; tx++) {
                const tileKey = `${tx},${ty}`;
                const oldMask = this.subGridCollisionData[tileKey] || 0x0000;
                
                // Check if tile is marked as "Red" (boundary) - has any solid cells
                const isBoundaryTile = oldMask !== 0x0000;
                
                // STEP 2: Generate new mask using Global Boundary Shrink logic
                const newMask = this.generateSilhouetteCollisionMask(tx, ty, true);
                
                // STEP 3: Compare masks to track changes
                if (newMask !== oldMask) {
                    if (isBoundaryTile) {
                        // Count solid cells before and after
                        const oldSolidCount = this.countSolidCells(oldMask);
                        const newSolidCount = this.countSolidCells(newMask);
                        
                        if (newSolidCount < oldSolidCount) {
                            tilesShrunk++;
                        } else if (newSolidCount > oldSolidCount) {
                            tilesExpanded++;
                        }
                    }
                    
                    // Update collision data
                    this.subGridCollisionData[tileKey] = newMask;
                } else {
                    tilesUnchanged++;
                }
                
                tilesProcessed++;
                
                // Progress reporting
                if (tilesProcessed % 100 === 0 || tilesProcessed === totalTiles) {
                    const progress = (tilesProcessed / totalTiles * 100).toFixed(1);
                    console.log(`   Progress: ${progress}% (${tilesProcessed}/${totalTiles} tiles)`);
                    if (onProgress) {
                        onProgress(tilesProcessed, totalTiles);
                    }
                }
            }
        }

        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
        
        const stats = {
            success: true,
            totalTiles,
            tilesProcessed,
            tilesShrunk,
            tilesUnchanged,
            tilesExpanded,
            elapsedTime: `${elapsedTime}s`,
            alphaThreshold,
            minConsecutivePixels
        };

        console.log('✅ GLOBAL BOUNDARY SHRINK: Complete!');
        console.log(`   Tiles Processed: ${tilesProcessed}`);
        console.log(`   Tiles Shrunk: ${tilesShrunk} (boundaries tightened)`);
        console.log(`   Tiles Unchanged: ${tilesUnchanged}`);
        console.log(`   Tiles Expanded: ${tilesExpanded}`);
        console.log(`   Elapsed Time: ${elapsedTime}s`);

        // STEP 4: Save updated collision_map.json
        await this.saveCollisionMap();

        // Update display if boundary painter is active
        if (this.boundaryPainterActive) {
            this.updateBoundaryPainterDisplay();
        }

        return stats;
    }

    /**
     * Helper: Count number of solid cells in a bitmask
     * @param {number} mask - Bitmask value (0x0000-0xFFFF)
     * @returns {number} Number of solid cells (0-16)
     */
    countSolidCells(mask) {
        let count = 0;
        for (let i = 0; i < 16; i++) {
            if (mask & (1 << i)) {
                count++;
            }
        }
        return count;
    }

    /**
     * Apply silhouette-based collision to a region of tiles
     * @param {number} startX - Start tile X
     * @param {number} startY - Start tile Y
     * @param {number} width - Width in tiles
     * @param {number} height - Height in tiles
     * @param {boolean} updateDisplay - Whether to update visual display
     */
    applySilhouetteCollision(startX, startY, width, height, updateDisplay = true) {
        if (!this.subGridCollisionData) this.subGridCollisionData = {};
        
        let processedCount = 0;
        for (let ty = startY; ty < startY + height; ty++) {
            for (let tx = startX; tx < startX + width; tx++) {
                const mask = this.generateSilhouetteCollisionMask(tx, ty);
                const tileKey = `${tx},${ty}`;
                this.subGridCollisionData[tileKey] = mask;
                processedCount++;
                
                if (processedCount % 100 === 0) {
                    console.log(`🔍 Silhouette scan: ${processedCount} tiles processed...`);
                }
            }
        }
        
        console.log(`✅ Silhouette collision applied to ${processedCount} tiles`);
        
        // Save changes
        this.saveCollisionMap();
        
        if (updateDisplay && this.boundaryPainterActive) {
            this.updateBoundaryPainterDisplay();
        }
    }

    /**
     * F11 Boundary Painter Tool - Right-click to toggle collision state
     * Now includes Silhouette-Based Collision scanning
     */
    showBoundaryPainter() {
        if (!this.boundaryPainterGraphics) {
            this.boundaryPainterGraphics = this.add.graphics();
            this.boundaryPainterGraphics.setDepth(999998);
            this.boundaryPainterGraphics.setScrollFactor(1);
        }
        
        if (!this.boundaryPainterUI) {
            this.boundaryPainterUI = this.add.container(0, 0);
            this.boundaryPainterUI.setScrollFactor(0);
            this.boundaryPainterUI.setDepth(999999);
            
            const bg = this.add.rectangle(0, 0, 400, 120, 0x000000, 0.8);
            bg.setStrokeStyle(2, 0x00ff00);
            bg.setScrollFactor(0);
            this.boundaryPainterUI.add(bg);
            
            const text = this.add.text(0, 0, 'BOUNDARY PAINTER (F11)\nRight-Click: Toggle collision\n[S] Scan current tile\n[A] Scan visible area\nRed = Solid, Green = Walkable', {
                fontFamily: 'Courier New',
                fontSize: '11px',
                color: '#00ff00',
                align: 'center'
            });
            text.setOrigin(0.5);
            text.setScrollFactor(0);
            this.boundaryPainterUI.add(text);
            
            const { width } = this.scale;
            this.boundaryPainterUI.setPosition(width / 2, 60);
        }
        
        // Add keyboard handlers for silhouette scanning
        if (!this.boundaryPainterKeyHandlers) {
            this.boundaryPainterKeyHandlers = {
                scanTile: this.input.keyboard.addKey('S'),
                scanArea: this.input.keyboard.addKey('A')
            };
        }
        
        this.boundaryPainterGraphics.visible = true;
        this.boundaryPainterUI.setVisible(true);
        this.updateBoundaryPainterDisplay();
    }

    hideBoundaryPainter() {
        if (this.boundaryPainterGraphics) {
            this.boundaryPainterGraphics.visible = false;
        }
        if (this.boundaryPainterUI) {
            this.boundaryPainterUI.setVisible(false);
        }
    }

    /**
     * Paint boundary cell - Toggle collision state for sub-grid cell
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     */
    paintBoundaryCell(worldX, worldY) {
        if (!this.mapTileWidth || !this.mapTileHeight) return;
        
        const tw = this.mapTileWidth;
        const th = this.mapTileHeight;
        const tx = Math.floor(worldX / tw);
        const ty = Math.floor(worldY / th);
        
        // Get sub-grid cell index
        const cellIndex = this.getSubGridCellIndex(worldX, worldY, tx, ty);
        
        // Toggle collision state
        const newMask = this.getSubGridMask(tx, ty, cellIndex);
        const isWalkable = this.isSubCellWalkable(newMask, cellIndex);
        
        console.log(`🎨 Painted cell at tile (${tx},${ty}), sub-cell ${cellIndex}: ${isWalkable ? 'WALKABLE' : 'SOLID'} (mask: 0x${newMask.toString(16).padStart(4, '0')})`);
        
        // Save changes to collision_map.json
        this.saveCollisionMap();
        
        // Update display
        this.updateBoundaryPainterDisplay();
    }

    /**
     * Update boundary painter display - Show sub-grid cells with colors
     * Enhanced to show silhouette-based collision results with stepped boundaries
     */
    updateBoundaryPainterDisplay() {
        if (!this.boundaryPainterActive || !this.boundaryPainterGraphics) return;
        
        this.boundaryPainterGraphics.clear();
        
        const pointer = this.input.activePointer;
        const worldX = pointer.worldX;
        const worldY = pointer.worldY;
        
        const tw = this.mapTileWidth || 32;
        const th = this.mapTileHeight || 32;
        const subGridSize = GameScene.SUB_GRID_SIZE;
        const tx = Math.floor(worldX / tw);
        const ty = Math.floor(worldY / th);
        
        // Check for silhouette scan key presses
        if (this.boundaryPainterKeyHandlers) {
            if (Phaser.Input.Keyboard.JustDown(this.boundaryPainterKeyHandlers.scanTile)) {
                // Scan current tile
                console.log(`🔍 Scanning silhouette for tile (${tx},${ty})...`);
                const mask = this.generateSilhouetteCollisionMask(tx, ty);
                const tileKey = `${tx},${ty}`;
                if (!this.subGridCollisionData) this.subGridCollisionData = {};
                this.subGridCollisionData[tileKey] = mask;
                this.saveCollisionMap();
                console.log(`✅ Tile (${tx},${ty}) mask: 0x${mask.toString(16).padStart(4, '0')}`);
            }
            
            if (Phaser.Input.Keyboard.JustDown(this.boundaryPainterKeyHandlers.scanArea)) {
                // Scan visible area (camera viewport)
                const camera = this.cameras.main;
                const startX = Math.max(0, Math.floor(camera.worldView.x / tw) - 2);
                const startY = Math.max(0, Math.floor(camera.worldView.y / th) - 2);
                const endX = Math.min(this.mapW || 128, Math.ceil((camera.worldView.x + camera.worldView.width) / tw) + 2);
                const endY = Math.min(this.mapH || 128, Math.ceil((camera.worldView.y + camera.worldView.height) / th) + 2);
                const width = endX - startX;
                const height = endY - startY;
                console.log(`🔍 Scanning silhouette for visible area (${startX},${startY}) to (${endX},${endY})...`);
                this.applySilhouetteCollision(startX, startY, width, height, true);
            }
        }
        
        // Draw sub-grid cells for current tile and surrounding tiles (for stepped boundary visualization)
        const drawRadius = 1; // Show 3x3 tiles for better context
        
        for (let offsetY = -drawRadius; offsetY <= drawRadius; offsetY++) {
            for (let offsetX = -drawRadius; offsetX <= drawRadius; offsetX++) {
                const drawTx = tx + offsetX;
                const drawTy = ty + offsetY;
                
                // Bounds check
                if (drawTx < 0 || drawTy < 0 || drawTx >= (this.mapW || 128) || drawTy >= (this.mapH || 128)) {
                    continue;
                }
                
                const tileKey = `${drawTx},${drawTy}`;
                let mask = this.subGridCollisionData?.[tileKey];
                
                // If no mask exists, generate one using silhouette scanning
                if (mask === undefined) {
                    mask = this.generateSilhouetteCollisionMask(drawTx, drawTy);
                    if (!this.subGridCollisionData) this.subGridCollisionData = {};
                    this.subGridCollisionData[tileKey] = mask;
                }
                
                // Draw sub-grid cells with stepped boundary visualization
                for (let subY = 0; subY < 4; subY++) {
                    for (let subX = 0; subX < 4; subX++) {
                        const cellIndex = subY * 4 + subX;
                        const isWalkable = this.isSubCellWalkable(mask, cellIndex);
                        const cellX = (drawTx * tw) + (subX * subGridSize);
                        const cellY = (drawTy * th) + (subY * subGridSize);
                        
                        // Draw cell: Green = walkable, Red = solid
                        // Use higher opacity for center tile, lower for surrounding
                        const alpha = (offsetX === 0 && offsetY === 0) ? 0.5 : 0.2;
                        this.boundaryPainterGraphics.fillStyle(isWalkable ? 0x00ff00 : 0xff0000, alpha);
                        this.boundaryPainterGraphics.fillRect(cellX, cellY, subGridSize, subGridSize);
                        
                        // Draw border only for center tile
                        if (offsetX === 0 && offsetY === 0) {
                            this.boundaryPainterGraphics.lineStyle(1, isWalkable ? 0x00ff00 : 0xff0000, 0.9);
                            this.boundaryPainterGraphics.strokeRect(cellX, cellY, subGridSize, subGridSize);
                        }
                    }
                }
            }
        }
        
        // Highlight current tile with a border
        this.boundaryPainterGraphics.lineStyle(2, 0x00ffff, 1.0);
        this.boundaryPainterGraphics.strokeRect(tx * tw, ty * th, tw, th);
    }

    /**
     * Save collision map changes to JSON file (via Agent 1's system)
     */
    async saveCollisionMap() {
        if (!this.subGridCollisionData) return;
        
        try {
            const collisionMapData = {
                _metadata: {
                    version: "1.0",
                    description: "8px sub-grid collision system for 32px tiles",
                    mapDimensions: {
                        width: this.mapW || 128,
                        height: this.mapH || 128,
                        tileSize: this.mapTileWidth || 32,
                        subGridSize: GameScene.SUB_GRID_SIZE
                    },
                    format: {
                        key: "tile coordinate as 'x,y' string (e.g., '0,0', '1,0')",
                        value: "16-bit mask (0x0000-0xFFFF) representing 4x4 sub-grid collision",
                        maskBits: "Each bit represents one 8px sub-cell: bit 0 = top-left, bit 15 = bottom-right",
                        maskValues: {
                            "0x0000": "Fully walkable (all 16 sub-cells walkable)",
                            "0xFFFF": "Fully solid (all 16 sub-cells collidable)"
                        }
                    },
                    sync: "This file is synced with COLOR_MANIFEST.js collision logic"
                },
                collisionData: this.subGridCollisionData
            };
            
            // Send to Agent 1's system to save
            const response = await fetch('/api/save-collision-map', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(collisionMapData)
            }).catch(() => {
                // Fallback: Log to console if API not available
                console.log('💾 Collision map changes (save via Agent 1):', JSON.stringify(collisionMapData, null, 2));
            });
            
            if (response && response.ok) {
                console.log('✅ Collision map saved successfully');
            }
        } catch (e) {
            console.warn('⚠️ Failed to save collision map:', e);
        }
    }

    /**
     * F11 Tile Inspector Tool - Shows raw tile data and source hex colors (DEPRECATED - Use Boundary Painter)
     * Queries COLOR_MANIFEST.js to display tile information
     */
    async showTileInspector() {
        // Import COLOR_MANIFEST dynamically
        let COLOR_MANIFEST;
        try {
            const manifestModule = await import('/public/assets/COLOR_MANIFEST.js');
            COLOR_MANIFEST = manifestModule.COLOR_MANIFEST;
        } catch (e) {
            console.warn('COLOR_MANIFEST.js not found, using fallback:', e);
            COLOR_MANIFEST = { tilesets: {}, tiles: {}, getTileColor: () => null, getTilesetColor: () => null };
        }

        // Create UI container
        if (!this.tileInspectorUI) {
            this.tileInspectorUI = {
                container: this.add.container(0, 0),
                bg: null,
                text: null,
                colorBox: null
            };
            this.tileInspectorUI.container.setScrollFactor(0);
            this.tileInspectorUI.container.setDepth(999999);
            this.tileInspectorUI.container.setVisible(false);

            // Background panel
            this.tileInspectorUI.bg = this.add.rectangle(0, 0, 400, 200, 0x000000, 0.9);
            this.tileInspectorUI.bg.setStrokeStyle(2, 0xffffff);
            this.tileInspectorUI.bg.setScrollFactor(0);
            this.tileInspectorUI.container.add(this.tileInspectorUI.bg);

            // Color preview box
            this.tileInspectorUI.colorBox = this.add.rectangle(-150, 0, 60, 60, 0x808080);
            this.tileInspectorUI.colorBox.setScrollFactor(0);
            this.tileInspectorUI.container.add(this.tileInspectorUI.colorBox);

            // Text display
            this.tileInspectorUI.text = this.add.text(-100, -80, '', {
                fontFamily: 'Courier New',
                fontSize: '12px',
                color: '#ffffff',
                wordWrap: { width: 350 }
            });
            this.tileInspectorUI.text.setScrollFactor(0);
            this.tileInspectorUI.container.add(this.tileInspectorUI.text);
        }

        this.tileInspectorUI.container.setVisible(true);
        this.tileInspectorUI.COLOR_MANIFEST = COLOR_MANIFEST;
    }

    hideTileInspector() {
        if (this.tileInspectorUI) {
            this.tileInspectorUI.container.setVisible(false);
        }
    }

    updateTileInspector() {
        if (!this.tileInspectorActive || !this.tileInspectorUI || !this.tileInspectorUI.container.visible) {
            return;
        }

        if (!this.map || !this.player) return;

        const COLOR_MANIFEST = this.tileInspectorUI.COLOR_MANIFEST;
        const pointer = this.input.activePointer;
        const worldX = pointer.worldX;
        const worldY = pointer.worldY;

        // Convert world coordinates to tile coordinates
        const tw = this.mapTileWidth || 32;
        const th = this.mapTileHeight || 32;
        const tx = Math.floor(worldX / tw);
        const ty = Math.floor(worldY / th);

        // Get tile data from all layers
        let tileData = null;
        let layerName = 'None';
        let gid = 0;

        // Check each layer for tile at this position
        for (const layerNameKey in this.layers) {
            const layer = this.layers[layerNameKey];
            if (layer && layer.type === 'tilelayer') {
                const tile = layer.getTileAt(tx, ty);
                if (tile && tile.index !== -1) {
                    tileData = tile;
                    layerName = layerNameKey;
                    gid = tile.index;
                    break; // Use first non-empty tile found
                }
            }
        }

        // If no tile found, check blocked tiles
        if (!tileData && this.blockedTiles && this.mapW) {
            const idx = ty * this.mapW + tx;
            if (idx >= 0 && idx < this.blockedTiles.length && this.blockedTiles[idx] === 1) {
                tileData = { index: -1, blocked: true };
                layerName = 'Blocked';
            }
        }

        // Update UI
        const screenX = pointer.x;
        const screenY = pointer.y;
        const { width, height } = this.scale;

        // Position panel near pointer but keep it on screen
        let panelX = screenX + 20;
        let panelY = screenY - 100;
        if (panelX + 200 > width) panelX = screenX - 420;
        if (panelY + 200 > height) panelY = height - 220;
        if (panelX < 0) panelX = 20;
        if (panelY < 0) panelY = 20;

        this.tileInspectorUI.container.setPosition(panelX, panelY);

        // Build info text
        let infoText = `TILE INSPECTOR (F11)\n`;
        infoText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        infoText += `World: (${Math.round(worldX)}, ${Math.round(worldY)})\n`;
        infoText += `Tile: (${tx}, ${ty})\n`;
        infoText += `Layer: ${layerName}\n`;

        if (tileData) {
            if (tileData.blocked) {
                infoText += `Status: BLOCKED\n`;
                infoText += `Color: #FF0000 (Red - Collision)\n`;
                this.tileInspectorUI.colorBox.setFillStyle(0xFF0000);
            } else {
                infoText += `GID: ${gid}\n`;
                
                // Get color from COLOR_MANIFEST
                const colorData = COLOR_MANIFEST.getTileColor(gid);
                if (colorData) {
                    infoText += `Hex: ${colorData.hex}\n`;
                    infoText += `Tileset: ${colorData.tileset || 'Unknown'}\n`;
                    if (colorData.properties) {
                        infoText += `Properties: ${JSON.stringify(colorData.properties)}\n`;
                    }
                    const hexInt = parseInt(colorData.hex.replace('#', ''), 16);
                    this.tileInspectorUI.colorBox.setFillStyle(hexInt);
                } else {
                    // Try to get tileset color
                    const tileset = this.map.tilesets.find(ts => {
                        const firstGid = ts.firstgid || 0;
                        return gid >= firstGid && gid < firstGid + (ts.tilecount || 0);
                    });
                    if (tileset) {
                        const tilesetColor = COLOR_MANIFEST.getTilesetColor(tileset.name);
                        if (tilesetColor) {
                            infoText += `Tileset: ${tilesetColor.name}\n`;
                            infoText += `Color: ${tilesetColor.primaryColor}\n`;
                            const hexInt = parseInt(tilesetColor.primaryColor.replace('#', ''), 16);
                            this.tileInspectorUI.colorBox.setFillStyle(hexInt);
                        } else {
                            infoText += `Tileset: ${tileset.name}\n`;
                            infoText += `Color: Unknown\n`;
                            this.tileInspectorUI.colorBox.setFillStyle(0x808080);
                        }
                    } else {
                        infoText += `Tileset: Unknown\n`;
                        infoText += `Color: Unknown\n`;
                        this.tileInspectorUI.colorBox.setFillStyle(0x808080);
                    }
                }

                // Show tile properties if available
                if (tileData.properties) {
                    const props = Object.keys(tileData.properties);
                    if (props.length > 0) {
                        infoText += `\nProperties:\n`;
                        props.forEach(prop => {
                            infoText += `  ${prop}: ${tileData.properties[prop]}\n`;
                        });
                    }
                }
            }
        } else {
            infoText += `Status: Empty\n`;
            infoText += `Color: N/A\n`;
            this.tileInspectorUI.colorBox.setFillStyle(0x404040);
        }

        this.tileInspectorUI.text.setText(infoText);
    }

    shutdown() {
        // Clean up collision debug graphics
        if (this.collisionDebugGraphics) {
            this.collisionDebugGraphics.destroy();
            this.collisionDebugGraphics = null;
        }

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Game.js:703', message: 'Game shutdown called', data: { hasInput: !!this.input, hasKeyboard: !!(this.input?.keyboard) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
        // #endregion
        // Clean up keyboard listeners
        if (this.input && this.input.keyboard) {
            if (this.f2Handler) {
                this.input.keyboard.off("keydown-F2", this.f2Handler);
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Game.js:707', message: 'F2 handler removed', data: {}, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
                // #endregion
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
                this.input.keyboard.off("keydown-K", this.muteHandler);
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Game.js:721', message: 'Mute handler removed', data: { key: 'K' }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
                // #endregion
            }
            if (this.mHandler) {
                this.input.keyboard.off("keydown-M", this.mHandler);
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Game.js:725', message: 'M handler removed', data: { key: 'M' }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
                // #endregion
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

            let npcKey = this.resolveNpcTextureKey(npcTypes[i % npcTypes.length]);

            // Validate spriteKey exists, fallback to npc_1 if missing
            if (!this.textures.exists(npcKey)) {
                console.warn(`[NPC Fallback ${i}] Texture '${npcKey}' missing. Falling back to npc_1.`);
                npcKey = 'npc_1';
                if (!this.textures.exists(npcKey)) {
                    console.error(`[NPC Fallback ${i}] Fallback npc_1 also missing. Skipping NPC.`);
                    continue;
                }
            }

            const npc = this.physics.add.sprite(sx, sy, npcKey);

            // Normalize NPC sprite to consistent size (same as player)
            const tileW = this.mapTileWidth || this.map?.tileWidth || 32;
            const tileH = this.mapTileHeight || this.map?.tileHeight || 32;
            const npcDebug = this.normalizeCharacterSprite(npc, tileW, tileH);
            
            // MANDATORY FIX: Force NPC scale to 2.0 AFTER normalization
            if (npc._scaleLocked) {
                npc.setScale(2.0);
                console.log(`[NPC Scale Lock Enforced] ${npc.texture?.key || 'unknown'}: Forced scale to 2.0`);
            }

            console.log(`[NPC ${i} Normalized] key=${npcDebug.key}, frame=${npcDebug.frameW}x${npcDebug.frameH}, scale=${npcDebug.scale}, display=${npcDebug.displayW}x${npcDebug.displayH}, body=${npcDebug.bodyW}x${npcDebug.bodyH}, offset=(${npcDebug.bodyOffsetX},${npcDebug.bodyOffsetY}), origin=${npcDebug.origin}`);

            npc.setPushable(true);
            npc.setCollideWorldBounds(true);

            const controller = new NPCController(this, npc, this.astar, {
                speed: 40,
                wanderRadius: 100,
                minPauseMs: 1000,
                maxPauseMs: 4000
            });
            npc.controller = controller;
            npc.npcKey = npcKey;

            // Enable Collisions with collision source (EXACTLY ONE)
            if (this.collidableLayers && this.collidableLayers.length > 0) {
                this.collidableLayers.forEach((layer) => {
                    this.physics.add.collider(npc, layer);
                });
            }
            if (this.walls && this.walls.children.size > 0) {
                this.physics.add.collider(npc, this.walls);
            }
            this.physics.add.collider(npc, this.player);
            this.npcs.push(npc);
            controller.updateAnimation(0, 0);
        }
    }

    async spawnNPCs() {
        // Track spawn corrections across all spawn paths (declared first to avoid TDZ)
        let spawnCorrections = 0;

        if (!this.mapLoaded) {
            console.warn("Game.spawnNPCs: Map not loaded yet.");
            return;
        }

        // AStar should already be initialized in create()
        if (!this.astar && this.blockedTiles) {
            this.astar = new AStarPathfinder(this.mapW, this.mapH, this.blockedTiles);
        }

        // Try to use validated NPC spawns from mapValidator first
        const debugData = this.mapDebugData || {};
        if (debugData.validatedNPCSpawns && debugData.validatedNPCSpawns.length > 0) {
            console.log(`Game.spawnNPCs: Using ${debugData.validatedNPCSpawns.length} validated NPC spawns from mapValidator.`);
            const tileW = this.mapTileWidth || this.map?.tileWidth || 32;
            const tileH = this.mapTileHeight || this.map?.tileHeight || 32;

            debugData.validatedNPCSpawns.forEach((spawnData, idx) => {
                let npcKey = this.resolveNpcTextureKey(spawnData.npcType || 'npc_1');

                // Validate spriteKey exists, fallback to npc_1 if missing
                if (!this.textures.exists(npcKey)) {
                    console.warn(`[NPC Spawn ${idx}] Texture '${npcKey}' missing. Falling back to npc_1.`);
                    npcKey = 'npc_1';
                    if (!this.textures.exists(npcKey)) {
                        console.error(`[NPC Spawn ${idx}] Fallback npc_1 also missing. Skipping NPC.`);
                        return;
                    }
                }

                const npcData = getNPCById(spawnData.npcType || 'npc_1');
                let npc;
                if (npcData) {
                    // Use NPC class for named characters (handles billboards)
                    // Ensure we pass the resolved npcKey as spriteKey override if needed, 
                    // but NPC class uses data.spriteKey. 
                    // effectiveSpriteKey overrides data.spriteKey?
                    // Let's assume NPC_DATA has correct spriteKey.
                    npc = new NPC(this, spawnData.x, spawnData.y, npcData);
                    this.add.existing(npc);
                } else {
                    npc = this.physics.add.sprite(spawnData.x, spawnData.y, npcKey);
                }

                // Normalize NPC sprite to consistent size (same as player)
                const tileW = this.mapTileWidth || this.map?.tileWidth || 32;
                const tileH = this.mapTileHeight || this.map?.tileHeight || 32;
                const npcDebug = this.normalizeCharacterSprite(npc, tileW, tileH);
                
                // MANDATORY FIX: Force NPC scale to 2.0 AFTER normalization
                if (npc._scaleLocked) {
                    npc.setScale(2.0);
                    console.log(`[NPC Scale Lock Enforced] ${npc.texture?.key || 'unknown'}: Forced scale to 2.0`);
                }

                console.log(`[NPC ${idx} Normalized] key=${npcDebug.key}, frame=${npcDebug.frameW}x${npcDebug.frameH}, scale=${npcDebug.scale}, display=${npcDebug.displayW}x${npcDebug.displayH}, body=${npcDebug.bodyW}x${npcDebug.bodyH}, offset=(${npcDebug.bodyOffsetX},${npcDebug.bodyOffsetY}), origin=${npcDebug.origin}`);

                npc.setPushable(true);
                npc.setCollideWorldBounds(true);

                // Create controller with validated spawn position as home
                const controller = new NPCController(this, npc, this.astar, {
                    speed: 40,
                    wanderRadius: 200,
                    tileSize: tileW,
                    minPauseMs: 1000,
                    maxPauseMs: 3500
                });
                npc.controller = controller;
                npc.npcKey = npcKey;

                (this.collidableLayers || []).forEach((layer) => {
                    this.physics.add.collider(npc, layer);
                });
                this.physics.add.collider(npc, this.player);

                this.npcs.push(npc);
                npc.setDepth(npc.y);
                npc.setVisible(true);
                npc.setAlpha(1);
                controller.updateAnimation(0, 0);
            });

            console.log(`Game.spawnNPCs: Successfully spawned ${this.npcs.length} NPCs from validated spawns.`);
            if (typeof spawnCorrections !== 'undefined' && spawnCorrections > 0) {
                console.log(`   Spawn corrections: ${spawnCorrections} NPCs moved to valid positions`);
            }
            return;
        }

        // Fallback: Try Tiled object layer "NPCs"
        const npcLayer = this.findObjectLayer ? this.findObjectLayer('NPCs') : this.map.getObjectLayer('NPCs');
        if (!npcLayer) {
            // Only warn if map actually has object layers (might be missing)
            const hasObjectLayers = this.map.layers && this.map.layers.some(l => l.type === 'objectgroup');
            if (hasObjectLayers) {
                console.warn("Game.spawnNPCs: 'NPCs' layer not found and no validated spawns. Using fallback spawning.");
            } else {
                console.log("Game.spawnNPCs: No object layers in map. Using fallback spawning.");
            }
            await this.spawnNPCsFallback();
            return;
        }

        if (!npcLayer.objects || npcLayer.objects.length === 0) {
            console.warn("Game.spawnNPCs: 'NPCs' layer exists but has no objects. Using fallback.");
            await this.spawnNPCsFallback();
            return;
        }

        console.log(`Game.spawnNPCs: Found ${npcLayer.objects.length} NPC objects in Tiled layer "${npcLayer.name}".`);

        const minTileDistance = 2; // Minimum 2 tiles between spawns
        const tileW = this.mapTileWidth || this.map?.tileWidth || 32;
        const tileH = this.mapTileHeight || this.map?.tileHeight || 32;

        // Track spawn positions and corrections
        const spawnedPositions = [];

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

            // Comprehensive spawn validation (bounds, blocked, overlap)
            const validation = this.validateNPCSpawn(sx, sy, spawnedPositions, minTileDistance);

            if (!validation.valid) {
                // Try spiral search to find valid position in current zone
                let corrected = this.findValidSpawnPositionSpiral(sx, sy, spawnedPositions, minTileDistance, 10);

                // If spiral search failed, try other NPC spawn zones
                if (!corrected && npcLayer.objects.length > 1) {
                    console.log(`[NPC Spawn ${idx}] No valid position in original zone. Trying other zones...`);

                    // Try other NPC object positions as alternative zones
                    const otherZones = npcLayer.objects.filter((otherObj, otherIdx) => otherIdx !== idx);
                    for (const otherObj of otherZones) {
                        const otherCenter = getObjectCenter(otherObj);
                        corrected = this.findValidSpawnPositionSpiral(
                            otherCenter.x,
                            otherCenter.y,
                            spawnedPositions,
                            minTileDistance,
                            15 // Larger radius for zone fallback
                        );
                        if (corrected) {
                            console.log(`[NPC Spawn ${idx}] Found valid position in alternative zone at (${corrected.tx},${corrected.ty})`);
                            break;
                        }
                    }
                }

                if (corrected) {
                    sx = corrected.x;
                    sy = corrected.y;
                    spawnCorrections++;
                    console.log(`[NPC Spawn ${idx}] Corrected: ${validation.reason} → moved to (${corrected.tx},${corrected.ty})`);
                } else {
                    // Last resort: try random walkable positions across the map
                    console.log(`[NPC Spawn ${idx}] No valid position in any zone. Trying random walkable positions...`);
                    const randomSpawn = this.findRandomWalkableSpawn(spawnedPositions, minTileDistance);
                    if (randomSpawn) {
                        sx = randomSpawn.x;
                        sy = randomSpawn.y;
                        spawnCorrections++;
                        console.log(`[NPC Spawn ${idx}] Found random walkable spawn at (${randomSpawn.tx},${randomSpawn.ty})`);
                    } else {
                        console.error(`[NPC Spawn ${idx}] Invalid spawn: ${validation.reason}. Could not find valid position in any zone or random location. Skipping NPC.`);
                        return; // Skip this NPC
                    }
                }
            }

            // Record spawn position
            const spawnTileX = Math.floor(sx / tileW);
            const spawnTileY = Math.floor(sy / tileH);
            spawnedPositions.push({ tx: spawnTileX, ty: spawnTileY });

            // Validate spriteKey exists before creating NPC
            if (!this.textures.exists(npcKey)) {
                console.error(`[NPC Spawn ${idx}] Texture '${npcKey}' does not exist. Skipping NPC.`);
                return; // Skip this NPC
            }

            // Create NPC sprite
            // Create NPC sprite
            const npcId = obj.name || obj.type;
            const npcData = getNPCById(npcId); // Check specific ID first

            let npc;
            if (npcData) {
                npc = new NPC(this, sx, sy, npcData);
                this.add.existing(npc);
            } else {
                npc = this.physics.add.sprite(sx, sy, npcKey);
                // MANDATORY FIX: Apply scale lock to physics sprites too
                npc._scaleLocked = true;
                npc._targetScale = 2.0;
            }

            // STEP 2: Normalize NPC sprite to consistent size (same as player)
            const tileW = this.mapTileWidth || this.map?.tileWidth || 32;
            const tileH = this.mapTileHeight || this.map?.tileHeight || 32;
            const npcDebug = this.normalizeCharacterSprite(npc, tileW, tileH);
            
            // MANDATORY FIX: Force NPC scale to 2.0 AFTER normalization (for ALL NPCs)
            if (npc._scaleLocked) {
                npc.setScale(2.0);
                console.log(`[NPC Scale Lock Enforced] ${npc.texture?.key || 'unknown'}: Forced scale to 2.0`);
            } else {
                // If no scale lock, apply it now
                npc._scaleLocked = true;
                npc.setScale(2.0);
                console.log(`[NPC Scale Lock Applied] ${npc.texture?.key || 'unknown'}: Applied scale lock 2.0`);
            }

            console.log(`[NPC ${idx} Normalized] key=${npcDebug.key}, frame=${npcDebug.frameW}x${npcDebug.frameH}, scale=${npcDebug.scale}, display=${npcDebug.displayW}x${npcDebug.displayH}, body=${npcDebug.bodyW}x${npcDebug.bodyH}, origin=${npcDebug.origin}`);

            npc.setPushable(true);
            npc.setCollideWorldBounds(true);

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

            // Enable Collisions with collision source (EXACTLY ONE)
            if (this.collidableLayers && this.collidableLayers.length > 0) {
                this.collidableLayers.forEach((layer) => {
                    this.physics.add.collider(npc, layer);
                });
            }
            if (this.walls && this.walls.children.size > 0) {
                this.physics.add.collider(npc, this.walls);
            }
            this.physics.add.collider(npc, this.player);

            // Optional: NPC vs NPC collision (can be disabled for performance)
            // this.npcs.forEach(other => {
            //     if (other !== npc) {
            //         this.physics.add.collider(npc, other);
            //     }
            // });

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
        if (typeof spawnCorrections !== 'undefined' && spawnCorrections > 0) {
            console.log(`   Spawn corrections: ${spawnCorrections} NPCs moved to valid positions`);
        }
    }

    /**
     * Force re-render all NPCs with correct scale and visibility
     * MANDATORY: Ensures all NPCs are 2x scale and visible
     */
    forceRerenderNPCs() {
        console.log(`🔄 Force re-rendering ${this.npcs.length} NPCs...`);
        
        this.npcs.forEach((npc, idx) => {
            if (!npc || !npc.active) {
                console.warn(`⚠️ NPC ${idx} is inactive, skipping`);
                return;
            }
            
            // Force scale to 2.0
            npc._scaleLocked = true;
            npc._targetScale = 2.0;
            npc.setScale(2.0);
            
            // Force visibility
            npc.setVisible(true);
            npc.setAlpha(1.0);
            
            // Force depth based on Y position
            npc.setDepth(npc.y);
            
            // Ensure physics body is active
            if (npc.body) {
                npc.body.enable = true;
                npc.body.setActive(true);
            }
            
            // Log verification
            const displayH = npc.height * npc.scaleY;
            console.log(`✅ NPC ${idx} re-rendered: scale=${npc.scaleX.toFixed(2)}, visible=${npc.visible}, alpha=${npc.alpha.toFixed(2)}, displayH=${displayH.toFixed(0)}px`);
        });
        
        console.log(`✅ Force re-render complete: ${this.npcs.length} NPCs updated`);
    }

    /**
     * Create DOM-based Quest Tracker overlay (fallback if Phaser fails)
     * MANDATORY: This ensures Quest Board is ALWAYS visible
     */
    createDOMQuestTracker() {
        // Remove existing if it exists
        const existing = document.getElementById('dom-quest-tracker');
        if (existing) {
            existing.remove();
        }

        // Create HTML overlay - FORCE VISIBILITY
        // Position: top-right, below minimap (minimap is 200px + 20px top margin, so quest tracker at 230px)
        const { width } = this.scale;
        const questTrackerDOM = document.createElement('div');
        questTrackerDOM.id = 'dom-quest-tracker';
        questTrackerDOM.style.cssText = `
            position: fixed !important;
            top: 230px !important;
            right: 20px !important;
            width: 320px !important;
            min-height: 100px !important;
            background-color: rgba(0, 0, 0, 0.9) !important;
            border: 3px solid #b4945a !important;
            padding: 12px !important;
            font-family: 'Courier New', Courier, monospace !important;
            color: #f5f1e5 !important;
            z-index: 999999 !important;
            pointer-events: none !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
        `;
        
        questTrackerDOM.innerHTML = `
            <div style="color: #b4945a; font-size: 14px; font-weight: bold; margin-bottom: 10px; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">CURRENT OBJECTIVE</div>
            <div id="dom-quest-objective" style="font-size: 16px; line-height: 1.5; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">Search near the Cafe</div>
        `;
        
        document.body.appendChild(questTrackerDOM);
        this.domQuestTracker = questTrackerDOM;
        
        // Force visibility check every 100ms
        const visibilityCheck = setInterval(() => {
            if (questTrackerDOM && questTrackerDOM.parentElement) {
                questTrackerDOM.style.display = 'block';
                questTrackerDOM.style.visibility = 'visible';
                questTrackerDOM.style.opacity = '1';
            } else {
                clearInterval(visibilityCheck);
            }
        }, 100);
        
        console.log('✅ DOM Quest Tracker created as fallback (z-index: 999999, FORCED VISIBLE)');
    }

    /**
     * Create fallback HTML overlay for interaction prompt
     * Used if Phaser text rendering fails or is covered by other layers
     */
    createFallbackInteractionPrompt() {
        // Remove existing fallback if it exists
        const existingFallback = document.getElementById('fallback-interaction-prompt');
        if (existingFallback) {
            existingFallback.remove();
        }

        // Create HTML overlay element
        const fallbackPrompt = document.createElement('div');
        fallbackPrompt.id = 'fallback-interaction-prompt';
        fallbackPrompt.style.cssText = `
            position: fixed;
            top: 130px;
            left: 16px;
            font-family: 'Courier New', Courier, monospace;
            font-size: 16px;
            color: #ffffff;
            background-color: #000000;
            padding: 6px 10px;
            border: 2px solid #b4945a;
            z-index: 10003;
            display: none;
            pointer-events: none;
        `;
        fallbackPrompt.textContent = 'Press [E] to interact';
        document.body.appendChild(fallbackPrompt);
        this.fallbackPrompt = fallbackPrompt;
    }

    /**
     * Update fallback HTML prompt (called from update loop)
     */
    updateFallbackPrompt(message, visible) {
        if (this.fallbackPrompt) {
            this.fallbackPrompt.textContent = message || 'Press [E] to interact';
            this.fallbackPrompt.style.display = visible ? 'block' : 'none';
        }
    }

    /**
     * Spawn quest items from quest_items.js registry
     * Creates interactable zones at coordinates defined in PATHFINDING_ANALYSIS.md
     */
    spawnQuestItems() {
        if (!this.interactables) {
            console.warn('Game.spawnQuestItems: interactables group not initialized');
            return;
        }

        const questItemLocations = getAllQuestItemLocations();
        console.log(`Game.spawnQuestItems: Spawning ${questItemLocations.length} quest items...`);

        questItemLocations.forEach(itemData => {
            const questItem = QUEST_ITEMS[itemData.id];
            if (!questItem) {
                console.warn(`Quest item ${itemData.id} not found in QUEST_ITEMS registry`);
                return;
            }

            // Create interactable zone (32x32px interaction area)
            // MANDATORY FIX: Use static body for zones to enable overlap detection
            const zone = this.physics.add.zone(itemData.x, itemData.y, 32, 32);
            zone.setData('kind', 'quest_item');
            zone.setData('id', questItem.id);
            zone.setData('title', questItem.name);
            zone.setData('description', questItem.description);
            zone.setData('metadata', {
                questPath: questItem.questPath,
                questObjective: questItem.questObjective,
                hexColor: questItem.hexColor
            });
            
            // CRITICAL: Enable physics body for overlap detection
            if (zone.body) {
                zone.body.setSize(32, 32);
                zone.body.setOffset(0, 0);
            }
            
            console.log(`  ✓ Created zone for ${questItem.name} at [${itemData.x}, ${itemData.y}] with body: ${!!zone.body}`);

            // Visual indicator (temporary - replace with sprite when available)
            // Use quest item's hex color for visual consistency
            const hexColor = questItem.hexColor || '#ff0000';
            const colorInt = parseInt(hexColor.replace('#', ''), 16);
            
            // Try to load sprite first, fallback to circle indicator
            let indicator;
            if (this.textures.exists(questItem.spriteKey)) {
                // Sprite exists - use it
                indicator = this.add.image(itemData.x, itemData.y, questItem.spriteKey);
                // Scale to match detective sprite (normalized to tileH * 1.75)
                const tileH = this.mapTileHeight || 32;
                const targetHeight = tileH * 1.75; // Match detective normalization
                const spriteHeight = indicator.height || 32;
                const scale = targetHeight / spriteHeight;
                indicator.setScale(scale);
                indicator.setVisible(true);
                indicator.setAlpha(1);
            } else {
                // Fallback: use colored circle indicator
                indicator = this.add.circle(itemData.x, itemData.y, 8, colorInt, 0.8);
                indicator.setStrokeStyle(2, colorInt, 1.0);
            }
            
            // CRITICAL: Force visibility and alpha (fixes missing/invisible items)
            indicator.setVisible(true);
            indicator.setAlpha(1);
            indicator.setDepth(50);
            
            // Store reference to indicator for cleanup on collection
            zone.setData('indicator', indicator);

            // Add pulsing animation for visibility
            this.tweens.add({
                targets: indicator,
                scaleX: indicator.scaleX * 1.2,
                scaleY: indicator.scaleY * 1.2,
                duration: 1000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            this.interactables.add(zone);
            console.log(`  ✓ Spawned quest item: ${questItem.name} at [${itemData.x}, ${itemData.y}]`);
        });

        console.log(`Game.spawnQuestItems: Successfully spawned ${questItemLocations.length} quest items.`);
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

    /**
     * Validate NPC spawn position
     * @param {number} x - Pixel X coordinate
     * @param {number} y - Pixel Y coordinate
     * @param {Array<{tx, ty}>} existingPositions - Array of existing spawn tile positions
     * @param {number} minTileDistance - Minimum tile distance from other NPCs (default: 3)
     * @returns {{valid: boolean, reason?: string, corrected?: {x, y, tx, ty}}}
     */
    validateNPCSpawn(x, y, existingPositions = [], minTileDistance = 3) {
        const tileW = this.mapTileWidth || this.map?.tileWidth || 32;
        const tileH = this.mapTileHeight || this.map?.tileHeight || 32;
        const tx = Math.floor(x / tileW);
        const ty = Math.floor(y / tileH);

        // Check 1: Inside world bounds
        if (!this.mapBounds) {
            return { valid: false, reason: 'Map bounds not initialized' };
        }
        const worldBounds = this.physics.world.bounds;
        if (x < 0 || y < 0 || x >= worldBounds.width || y >= worldBounds.height) {
            return { valid: false, reason: 'Outside world bounds' };
        }

        // Check 2: Not in blocked tile
        if (this.isTileBlocked(tx, ty)) {
            return { valid: false, reason: 'Blocked tile' };
        }

        // Check 3: Not overlapping another NPC (radius check)
        for (const pos of existingPositions) {
            const tileDist = Math.abs(pos.tx - tx) + Math.abs(pos.ty - ty); // Manhattan distance
            if (tileDist < minTileDistance) {
                return { valid: false, reason: `Too close to NPC at (${pos.tx},${pos.ty})` };
            }
        }

        return { valid: true };
    }

    /**
     * Find valid spawn position using spiral search
     * @param {number} startX - Starting pixel X
     * @param {number} startY - Starting pixel Y
     * @param {Array<{tx, ty}>} existingPositions - Existing spawn positions
     * @param {number} minTileDistance - Minimum tile distance (default: 3)
     * @param {number} maxRadius - Maximum search radius in tiles (default: 10)
     * @returns {{x, y, tx, ty} | null}
     */
    findValidSpawnPositionSpiral(startX, startY, existingPositions = [], minTileDistance = 3, maxRadius = 10) {
        const tileW = this.mapTileWidth || this.map?.tileWidth || 32;
        const tileH = this.mapTileHeight || this.map?.tileHeight || 32;
        const startTx = Math.floor(startX / tileW);
        const startTy = Math.floor(startY / tileH);

        // Spiral search: check tiles in expanding rings
        for (let radius = 0; radius <= maxRadius; radius++) {
            // Check all tiles at this radius
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    // Only check tiles on the perimeter of this radius
                    if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;

                    const tx = startTx + dx;
                    const ty = startTy + dy;

                    // Check bounds
                    if (tx < 0 || ty < 0 || tx >= this.mapW || ty >= this.mapH) continue;

                    // Check blocked
                    if (this.isTileBlocked(tx, ty)) continue;

                    // Check spacing
                    let hasProperSpacing = true;
                    for (const pos of existingPositions) {
                        const tileDist = Math.abs(pos.tx - tx) + Math.abs(pos.ty - ty);
                        if (tileDist < minTileDistance) {
                            hasProperSpacing = false;
                            break;
                        }
                    }

                    if (hasProperSpacing) {
                        // Found valid position
                        const x = (tx * tileW) + (tileW / 2);
                        const y = (ty * tileH) + (tileH / 2);
                        return { x, y, tx, ty };
                    }
                }
            }
        }

        return null;
    }

    /**
     * Find random walkable spawn position across the map
     * Used as last resort when zone-based spawning fails
     * @param {Array<{tx, ty}>} existingPositions - Existing spawn tile positions
     * @param {number} minTileDistance - Minimum tile distance from other NPCs
     * @param {number} maxAttempts - Maximum random attempts (default: 50)
     * @returns {{x, y, tx, ty} | null}
     */
    findRandomWalkableSpawn(existingPositions = [], minTileDistance = 3, maxAttempts = 50) {
        if (!this.blockedTiles || !this.mapW || !this.mapH || !this.mapBounds) {
            return null;
        }

        const tileW = this.mapTileWidth || this.map?.tileWidth || 32;
        const tileH = this.mapTileHeight || this.map?.tileHeight || 32;
        const mapW = this.mapW;
        const mapH = this.mapH;

        // Try random positions across the map
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const tx = Phaser.Math.Between(0, mapW - 1);
            const ty = Phaser.Math.Between(0, mapH - 1);

            // Check if tile is walkable
            if (this.isTileBlocked(tx, ty)) {
                continue;
            }

            // Check distance from other NPCs
            let tooClose = false;
            for (const pos of existingPositions) {
                const tileDist = Math.abs(pos.tx - tx) + Math.abs(pos.ty - ty);
                if (tileDist < minTileDistance) {
                    tooClose = true;
                    break;
                }
            }
            if (tooClose) {
                continue;
            }

            // Found valid position
            const x = tx * tileW + tileW / 2;
            const y = ty * tileH + tileH / 2;
            return { x, y, tx, ty };
        }

        return null;
    }

    updateQuestNavigation(quest) {
        this.currentQuestTarget = quest ? quest.target : null;
        if (!this.currentQuestTarget) {
            this.navCircle.setVisible(false);
            this.navArrow.setVisible(false);
        } else {
            this.navCircle.setVisible(true);
            this.navArrow.setVisible(true);
        }
    }

    updateQuestNavigationVisuals() {
        if (!this.player || !this.currentQuestTarget) return;

        // Circle follows feet
        this.navCircle.x = this.player.x;
        this.navCircle.y = this.player.y;

        const dist = Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            this.currentQuestTarget.x,
            this.currentQuestTarget.y
        );
        const CLOSE_RANGE = 200;

        if (dist <= CLOSE_RANGE) {
            // "Here it is" mode: Arrow at target, pointing down
            this.navArrow.x = this.currentQuestTarget.x;

            // Bouncing animation (using scene time)
            const time = this.time.now;
            const bounce = Math.sin(time * 0.005) * 10; // +/- 10px
            this.navArrow.y = this.currentQuestTarget.y - 50 + bounce; // Floating above target

            // Point DOWN (180 degrees)
            this.navArrow.setRotation(Math.PI);
            this.navArrow.setScale(1.5);

            // Pulse opacity for extra visibility
            this.navArrow.alpha = 0.8 + Math.sin(time * 0.01) * 0.2;
        } else {
            // "Guidance" mode: Orbiting player
            this.navArrow.setScale(1.0);
            this.navArrow.alpha = 1.0;

            // Arrow rotates towards target
            const angle = Phaser.Math.Angle.Between(
                this.player.x,
                this.player.y,
                this.currentQuestTarget.x,
                this.currentQuestTarget.y
            );

            // Position arrow slightly away from player
            const radius = 60; // Slightly further out to clear the feet circle
            this.navArrow.x = this.player.x + Math.cos(angle) * radius;
            this.navArrow.y = this.player.y + Math.sin(angle) * radius;
            this.navArrow.setRotation(angle + Math.PI / 2); // Adjust for triangle orientation
        }

        // Update Minimap Quest Target
        if (this.minimap) {
            this.minimap.setQuestTarget(this.currentQuestTarget);
        }
    }

    checkQuestTriggers() {
        if (!this.questSystem || !this.questSystem.getActiveQuest()) return;

        const active = this.questSystem.getActiveQuest();

        // Polling for location-based quests
        if (active.id === 'intro_01' && active.target) {
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, active.target.x, active.target.y);
            if (dist < 150) { // 150px radius
                this.questSystem.checkQuestCompletion({ type: 'location_reached', id: 'intro_01' });
            }
        }
    }

    isTileBlocked(tx, ty) {
        if (!this.blockedTiles || !this.mapW) return false;
        if (tx < 0 || ty < 0 || tx >= this.mapW || ty >= this.mapH) return true;

        // Check if tile is blocked in the blocked tiles array
        const isBlocked = this.blockedTiles[ty * this.mapW + tx] === 1;

        // Special case: stairs at known coordinates (61,37 and surrounding area)
        const nearStairs = (tx >= 59 && tx <= 63 && ty >= 35 && ty <= 39);
        if (nearStairs) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Game.js:2129', message: 'Stair tile check', data: { tx: tx, ty: ty, isBlocked: isBlocked, nearStairs: nearStairs }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run3', hypothesisId: 'E' }) }).catch(() => { });
            // #endregion
            return false; // Stairs are always walkable
        }

        // If blocked, check if it's a stair (stairs should be walkable)
        if (isBlocked && this.map) {
            // Check all layers for stairs at this position
            for (const layer of this.map.layers) {
                if (layer.type === 'tilelayer') {
                    const normalizedName = (layer.name || '').toLowerCase();
                    // If this layer contains stairs, check if this tile is a stair
                    if (normalizedName.includes('stair') || normalizedName.includes('step')) {
                        // Try to get the tile from the layer
                        const layerObj = this.layers[layer.name];
                        if (layerObj) {
                            const tile = layerObj.getTileAt(tx, ty);
                            if (tile && tile.index !== -1 && tile.index !== 0) {
                                // This is a stair tile, make it walkable
                                return false;
                            }
                        }
                    }
                }
            }
        }

        return isBlocked;
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

    updateNPCs(time, delta) {
        if (!this.npcs) return;

        this.npcs.forEach(npc => {
            // Update the new NPCController with real time (not 0)
            if (npc.controller) {
                npc.controller.update(time, delta);
            }
            // Update billboard and other NPC visuals
            if (npc.update && typeof npc.update === 'function') {
                npc.update(this.player);
            }

            // Update depth for Y-sorting (feet position)
            npc.setDepth(Math.floor(npc.y));

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
        // Guard: prevent crashes if create() returned early
        if (!this.player || !this.player.body) return;
        // Cap physics delta to prevent tunneling
        const dt = Math.min(delta, 50);

        // Update NPCs (with guard)
        if (this.npcs && this.npcs.length > 0) {
            this.updateNPCs(time, dt);
            // Update QA NPC count
            if (window.__QA__) {
                window.__QA__.updateNPCs(this.npcs.length);
            }
            
            // MANDATORY FIX: Persistent [E] interaction overlay above NPCs
            // Draw "PRESS [E] TO INTERROGATE" directly over NPC head when distance < 60
            this.npcs.forEach(npc => {
                if (!npc || !this.player) return;
                
                // MANDATORY FIX: Force debug text for NPC at [1536, 1619]
                const targetX = 1536;
                const targetY = 1619;
                const tolerance = 5; // 5px tolerance
                if (Math.abs(npc.x - targetX) < tolerance && Math.abs(npc.y - targetY) < tolerance) {
                    // Force-create debug text for this specific NPC
                    if (!this.npcInteractionPrompts.has(npc)) {
                        const debugText = this.add.text(npc.x, npc.y - 50, 'PRESS [E] TO INTERROGATE', {
                            fontFamily: 'Courier New, Courier, monospace',
                            fontSize: '18px',
                            color: '#ffff00', // Yellow for visibility
                            backgroundColor: '#000000',
                            padding: { x: 12, y: 8 },
                            stroke: '#ff0000',
                            strokeThickness: 4
                        });
                        debugText.setOrigin(0.5);
                        debugText.setDepth(10004); // Even higher depth
                        debugText.setScrollFactor(1);
                        debugText.setVisible(true);
                        debugText.setAlpha(1.0);
                        this.npcInteractionPrompts.set(npc, debugText);
                        console.log(`🔍 FORCED debug text for NPC at [${targetX}, ${targetY}]`);
                    }
                }
                
                const distance = Phaser.Math.Distance.Between(
                    this.player.x, this.player.y,
                    npc.x, npc.y
                );
                
                if (distance < 60) {
                    // Create or update interaction prompt above NPC head
                    if (!this.npcInteractionPrompts.has(npc)) {
                        // Create new prompt text
                        const promptText = this.add.text(npc.x, npc.y - 50, 'PRESS [E] TO INTERROGATE', {
                            fontFamily: 'Courier New, Courier, monospace',
                            fontSize: '16px',
                            color: '#ffffff',
                            backgroundColor: '#000000',
                            padding: { x: 10, y: 6 },
                            stroke: '#b4945a',
                            strokeThickness: 3
                        });
                        promptText.setOrigin(0.5);
                        promptText.setDepth(10003); // Above everything
                        promptText.setScrollFactor(1); // Follow NPC in world space
                        promptText.setVisible(true);
                        promptText.setAlpha(1.0);
                        this.npcInteractionPrompts.set(npc, promptText);
                        console.log(`✅ Created [E] prompt for NPC at (${npc.x.toFixed(1)}, ${npc.y.toFixed(1)})`);
                    } else {
                        // Update existing prompt position - FORCE VISIBILITY
                        const promptText = this.npcInteractionPrompts.get(npc);
                        if (promptText) {
                            // Convert world to screen coordinates for fixed positioning
                            const camera = this.cameras.main;
                            const screenX = (npc.x - camera.scrollX) * camera.zoom + camera.centerX;
                            const screenY = (npc.y - camera.scrollY - 50) * camera.zoom + camera.centerY;
                            
                            promptText.setPosition(npc.x, npc.y - 50);
                            promptText.setVisible(true);
                            promptText.setAlpha(1.0);
                            promptText.setDepth(10003);
                            promptText.setScrollFactor(1);
                        }
                    }
                } else {
                    // Hide prompt if too far (unless it's the forced debug NPC)
                    const isDebugNPC = Math.abs(npc.x - targetX) < tolerance && Math.abs(npc.y - targetY) < tolerance;
                    if (!isDebugNPC) {
                        const promptText = this.npcInteractionPrompts.get(npc);
                        if (promptText) {
                            promptText.setVisible(false);
                        }
                    }
                }
            });
        }
        
        // MANDATORY: Force Quest Tracker visibility every frame
        if (this.questTracker && this.questTracker.container) {
            this.questTracker.container.setVisible(true);
            this.questTracker.container.setAlpha(1.0);
            this.questTracker.container.setDepth(9999);
        }
        
        // MANDATORY: Force DOM Quest Tracker visibility every frame (fallback)
        if (this.domQuestTracker && this.domQuestTracker.parentElement) {
            this.domQuestTracker.style.display = 'block';
            this.domQuestTracker.style.visibility = 'visible';
            this.domQuestTracker.style.opacity = '1';
            this.domQuestTracker.style.zIndex = '999999';
        }
        
        // MANDATORY: Force NPC scale lock every frame (prevent override)
        this.npcs.forEach((npc, idx) => {
            if (!npc || !npc.active) return;
            
            // Force scale to 2.0 if locked
            if (npc._scaleLocked && (npc.scaleX !== 2.0 || npc.scaleY !== 2.0)) {
                npc.setScale(2.0);
            }
            
            // Force visibility
            if (!npc.visible || npc.alpha < 0.9) {
                npc.setVisible(true);
                npc.setAlpha(1.0);
            }
            
            // Update depth based on Y position
            const expectedDepth = npc.y;
            if (npc.depth !== expectedDepth) {
                npc.setDepth(expectedDepth);
            }
        });

        // Update player depth for Y-sorting (feet position)
        if (this.player) {
            this.player.setDepth(Math.floor(this.player.y));
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

        // STEP 6.25: Update boundary painter (F11) with silhouette-based collision
        if (this.boundaryPainterActive) {
            this.updateBoundaryPainterDisplay();
        }

        // STEP 6.5: Handle camera zoom controls (+, -, = keys)
        if (Phaser.Input.Keyboard.JustDown(this.keyPlus) || Phaser.Input.Keyboard.JustDown(this.keyEquals)) {
            this.cameraZoom = Math.min(this.maxZoom, this.cameraZoom + 0.1);
            this.cameras.main.setZoom(this.cameraZoom);
        }
        if (Phaser.Input.Keyboard.JustDown(this.keyMinus)) {
            this.cameraZoom = Math.max(this.minZoom, this.cameraZoom - 0.1);
            this.cameras.main.setZoom(this.cameraZoom);
        }

        // Note: actorBodyDebugGraphics removed - use F9 bodyDebugGraphics instead (already implemented below)

        // STEP 6.7: Draw character body debug overlay (F9 toggle)
        if (this.showBodyDebug && this.bodyDebugGraphics) {
            this.bodyDebugGraphics.clear();
            this.bodyDebugGraphics.lineStyle(2, 0x00ffff, 1.0); // Cyan for character bodies

            // Draw player body
            if (this.player && this.player.body) {
                const px = this.player.x;
                const py = this.player.y;
                const w = this.player.body.width;
                const h = this.player.body.height;
                const offsetX = this.player.body.offset.x;
                const offsetY = this.player.body.offset.y;
                this.bodyDebugGraphics.strokeRect(px + offsetX, py + offsetY, w, h);
            }

            // Draw NPC bodies
            if (this.npcs && this.npcs.length > 0) {
                this.npcs.forEach(npc => {
                    if (npc && npc.body) {
                        const nx = npc.x;
                        const ny = npc.y;
                        const w = npc.body.width;
                        const h = npc.body.height;
                        const offsetX = npc.body.offset.x;
                        const offsetY = npc.body.offset.y;
                        this.bodyDebugGraphics.strokeRect(nx + offsetX, ny + offsetY, w, h);
                    }
                });
            }
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

        // --- TILE GUARD: 8px Sub-Grid Collision System with Bitmask Validation (Every Frame) ---
        // Uses 8px sub-grid cells from collision_map.json instead of 32px Tilemap layer
        // Checks sub-grid bitmask: if cell is walkable in PATHFINDING_ANALYSIS.md, override rollback
        if (this.blockedTiles && this.mapTileWidth && this.mapTileHeight) {
            const tw = this.mapTileWidth;
            const th = this.mapTileHeight;
            const mapW = this.mapW || Math.floor(this.physics.world.bounds.width / tw);
            const subGridSize = GameScene.SUB_GRID_SIZE;

            // Check feet position (sprite origin is at 0.5, 1.0 = bottom center = feet)
            const feetX = this.player.x;
            const feetY = this.player.y;

            // Get player body dimensions for multi-point collision check
            const bodyRadius = GameScene.ACTOR_BODY_USE_CIRCLE 
                ? GameScene.ACTOR_BODY_CIRCLE_RADIUS 
                : Math.max(GameScene.ACTOR_BODY_W, GameScene.ACTOR_BODY_H) / 2;
            
            // Check multiple sub-grid points around player position
            // TIGHT WRAP VERIFICATION: Sub-grid cells are 8px, allowing player to stand within 4px of visual edge
            // The checkPoints are generated at 8px intervals, meaning the closest check to a boundary is 4px away
            // This enables tight-wrap boundaries: player can get closer to visual silhouettes
            const checkPoints = [];
            const subGridOffset = Math.ceil(bodyRadius / subGridSize) + 1;
            
            // Generate check points in a grid pattern around player
            // Each point is checked against sub-grid bitmask to allow 4px proximity to shrunk boundaries
            for (let sx = -subGridOffset; sx <= subGridOffset; sx++) {
                for (let sy = -subGridOffset; sy <= subGridOffset; sy++) {
                    const checkX = feetX + (sx * subGridSize);
                    const checkY = feetY + (sy * subGridSize);
                    const dist = Math.hypot(sx * subGridSize, sy * subGridSize);
                    if (dist <= bodyRadius + subGridSize) {
                        checkPoints.push({ x: checkX, y: checkY });
                    }
                }
            }

            // Check each sub-grid point using bitmask from collision_map.json
            let blockedPointFound = false;
            let blockedTileCoords = null;

            for (const point of checkPoints) {
                // Convert to tile coordinates
                const tx = Math.floor(point.x / tw);
                const ty = Math.floor(point.y / th);

                // Bounds check for tile coordinates
                if (tx >= 0 && ty >= 0 && tx < mapW && ty < (this.mapH || Math.floor(this.physics.world.bounds.height / th))) {
                    const idx = ty * mapW + tx;
                    
                    // ZERO-FAILURE: HARD-OVERRIDE LOGIC - collision_map.json takes ABSOLUTE precedence
                    // This check MUST happen FIRST, before ANY tilemap collision checks
                    const tileKey = `${tx},${ty}`;
                    
                    // Check both local subGridCollisionData and global CollisionData
                    let collisionMapEntry = this.subGridCollisionData?.[tileKey];
                    if (collisionMapEntry === undefined && typeof window !== 'undefined' && window.CollisionData) {
                        collisionMapEntry = window.CollisionData[tileKey];
                    }
                    
                    // CRITICAL: If tile exists in collision_map.json with mask 0x0000, RETURN FALSE (No Collision) immediately
                    if (collisionMapEntry !== undefined) {
                        let collisionMask;
                        if (typeof collisionMapEntry === 'number') {
                            collisionMask = collisionMapEntry;
                        } else if (collisionMapEntry && typeof collisionMapEntry === 'object' && 'mask' in collisionMapEntry) {
                            collisionMask = collisionMapEntry.mask;
                        } else {
                            collisionMask = 0x0000; // Default to walkable if format is invalid
                        }
                        
                        // ZERO-FAILURE: If mask is 0x0000 (fully walkable), RETURN FALSE immediately - do NOT check Phaser tilemap
                        if (collisionMask === 0x0000) {
                            console.log(`[JSON OVERRIDE SUCCESS] Tile (${tx},${ty}) at world (${point.x.toFixed(1)},${point.y.toFixed(1)}) - mask=0x0000 - NO COLLISION`);
                            continue; // Skip blocking, allow movement - DO NOT CHECK TILEMAP OR ANYTHING ELSE
                        }
                        // If mask exists but is not 0x0000, continue to sub-grid check below
                    }
                    
                    // ADDITIONAL SAFETY: Staircase Zone coordinate range check (GHOST PROTOCOL)
                    // World coordinates [1900-2050, 1000-1250] = Tiles (59-64, 31-39)
                    const worldX = point.x;
                    const worldY = point.y;
                    if (worldX >= 1900 && worldX <= 2050 && worldY >= 1000 && worldY <= 1250) {
                        // Staircase Zone - force walkable
                        console.log(`[STAIRCASE ZONE OVERRIDE] World (${worldX.toFixed(1)},${worldY.toFixed(1)}) in Staircase Zone - NO COLLISION`);
                        continue; // Skip blocking, allow movement
                    }

                    // Check 32px tile collision (only if tile NOT in collision_map.json or mask != 0x0000)
                    if (this.blockedTiles[idx] === 1) {
                        // Shadow Culling: Check if this tile is ONLY in shadow layers
                        let isShadowOnly = false;
                        if (this.shadowLayers && this.shadowLayers.length > 0) {
                            let hasNonShadowTile = false;
                            let hasShadowTile = false;
                            
                            for (const layerName in this.layers) {
                                const layer = this.layers[layerName];
                                if (layer && layer.type === 'tilelayer') {
                                    const tile = layer.getTileAt(tx, ty);
                                    if (tile && tile.index !== -1) {
                                        const isShadowLayer = this.shadowLayers.includes(layerName);
                                        if (isShadowLayer) {
                                            hasShadowTile = true;
                                        } else {
                                            hasNonShadowTile = true;
                                        }
                                    }
                                }
                            }
                            isShadowOnly = hasShadowTile && !hasNonShadowTile;
                        }

                        if (!isShadowOnly) {
                            // Check sub-grid bitmask from collision_map.json
                            const tileKey = `${tx},${ty}`;
                            // Check both local and global collision data
                            let subGridEntry = this.subGridCollisionData?.[tileKey];
                            if (subGridEntry === undefined && typeof window !== 'undefined' && window.CollisionData) {
                                subGridEntry = window.CollisionData[tileKey];
                            }
                            
                            if (subGridEntry !== undefined) {
                                // Handle both formats: number (legacy) or object { mask, alpha_threshold_passed }
                                let subGridMask;
                                if (typeof subGridEntry === 'number') {
                                    subGridMask = subGridEntry;
                                } else if (subGridEntry && typeof subGridEntry === 'object' && 'mask' in subGridEntry) {
                                    subGridMask = subGridEntry.mask;
                                } else {
                                    subGridMask = 0x0000; // Default to walkable if format is invalid
                                }
                                
                                // Calculate which sub-grid cell the point is in (0-15)
                                const subX = Math.floor((point.x % tw) / subGridSize);
                                const subY = Math.floor((point.y % th) / subGridSize);
                                const subCellIndex = subY * 4 + subX; // 4x4 grid: 0-15
                                
                                // Check if this sub-cell is walkable (bit = 0 means walkable)
                                const isWalkable = !(subGridMask & (1 << subCellIndex));
                                
                                if (isWalkable) {
                                    // Sub-grid cell is walkable - allow movement even if tile is blocked
                                    // TIGHT WRAP VERIFICATION: This enables 4px proximity to shrunk boundaries
                                    // Since sub-grid cells are 8px, player can stand within 4px of visual edge
                                    // This eliminates "invisible wall" effect from Global Boundary Shrink
                                    continue; // Skip this point, check next
                                }
                            }
                            
                            // MANDATORY FIX: Manual Override for coordinate (1534, 1846)
                            // PATHFINDING_ANALYSIS.md validates this path; engine must comply
                            const worldX = point.x;
                            const worldY = point.y;
                            const overrideX = 1534;
                            const overrideY = 1846;
                            const overrideTolerance = 10; // 10px tolerance
                            
                            if (Math.abs(worldX - overrideX) < overrideTolerance && 
                                Math.abs(worldY - overrideY) < overrideTolerance) {
                                // Manual override: This coordinate is walkable
                                console.log(`[TILE GUARD OVERRIDE] Coordinate (${worldX.toFixed(1)}, ${worldY.toFixed(1)}) manually overridden - PATHFINDING_ANALYSIS.md validates this path`);
                                continue; // Skip blocking, allow movement
                            }
                            
                            // MANDATORY FIX: Staircase Override for building entrance [1952-1984, 1056-1184]
                            // Main staircase coordinates - cleared for player passage to building entrance
                            const staircaseMinX = 1952;
                            const staircaseMaxX = 1984;
                            const staircaseMinY = 1056;
                            const staircaseMaxY = 1184;
                            
                            if (worldX >= staircaseMinX && worldX <= staircaseMaxX &&
                                worldY >= staircaseMinY && worldY <= staircaseMaxY) {
                                // Staircase override: This coordinate range is walkable
                                console.log(`[TILE GUARD OVERRIDE] Staircase coordinate (${worldX.toFixed(1)}, ${worldY.toFixed(1)}) manually overridden - Building entrance path validated`);
                                continue; // Skip blocking, allow movement
                            }
                            
                            // Also check PATHFINDING_ANALYSIS.md validation
                            const pathfindingAnalysisValid = this.isCoordinateInPath(tx, ty);
                            if (pathfindingAnalysisValid) {
                                // Pathfinding says it's valid - allow movement
                                continue;
                            }
                            
                            // No walkable sub-cell found, block movement
                            blockedPointFound = true;
                            blockedTileCoords = { tx, ty };
                            break;
                        } else {
                            // Shadow-only tile - allow movement
                            console.log(`🔍 Shadow Culling: Allowing movement through shadow-only tile at ${tx},${ty}`);
                        }
                    }
                }
            }

            if (blockedPointFound && blockedTileCoords) {
                // Collision detected - rollback
                if (this.lastSafePos) {
                    const { tx, ty } = blockedTileCoords;
                    
                    // FINAL CHECK: Verify tile is NOT in collision_map.json before rolling back
                    const tileKey = `${tx},${ty}`;
                    let finalCheckEntry = this.subGridCollisionData?.[tileKey];
                    if (finalCheckEntry === undefined && typeof window !== 'undefined' && window.CollisionData) {
                        finalCheckEntry = window.CollisionData[tileKey];
                    }
                    
                    if (finalCheckEntry !== undefined) {
                        let finalMask;
                        if (typeof finalCheckEntry === 'number') {
                            finalMask = finalCheckEntry;
                        } else if (finalCheckEntry && typeof finalCheckEntry === 'object' && 'mask' in finalCheckEntry) {
                            finalMask = finalCheckEntry.mask;
                        }
                        
                        // If mask is 0x0000, DO NOT rollback - allow movement
                        if (finalMask === 0x0000) {
                            console.log(`[TILE GUARD FINAL CHECK] Tile (${tx},${ty}) is walkable per collision_map.json - preventing rollback`);
                            blockedPointFound = false;
                            blockedTileCoords = null;
                            // Update last safe position to current position
                            if (!this.lastSafePos) this.lastSafePos = new Phaser.Math.Vector2();
                            this.lastSafePos.set(this.player.x, this.player.y);
                            return; // Exit early, no rollback needed
                        }
                    }
                    
                    console.warn(`[TILE GUARD] Blocked tile detected at ${tx},${ty} (sub-grid bitmask check). Rolling back to ${truncate(this.lastSafePos.x)},${truncate(this.lastSafePos.y)}.`);
                    
                    this.player.setPosition(this.lastSafePos.x, this.lastSafePos.y);
                    this.player.setVelocity(0);
                    this.tileGuardRollback = true;
                }
            } else {
                // All sub-grid points are safe, update last safe pos
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


        this.interactionTarget = null;
        this.interactionType = null;
        this.nearestNPC = null; // Reset nearest NPC each frame

        // Check for quest items and other interactables in interaction range
        // Quest items use 8px sub-grid zones
        if (this.interactables && this.interactables.children) {
            this.physics.world.overlap(this.player, this.interactables, (_, item) => {
                if (!this.interactionTarget) {
                    this.interactionTarget = item;
                    const kind = item.data ? item.data.get('kind') : null;
                    const id = item.data ? item.data.get('id') : null;
                    // Set interaction type based on kind
                    if (kind === 'quest_item') {
                        this.interactionType = 'quest_item';
                    } else if (kind === 'suspect') {
                        this.interactionType = 'npc';
                    } else {
                        this.interactionType = 'interactable';
                    }
                    console.log(`🔍 Interaction detected: ${kind} (id: ${id}), type: ${this.interactionType}`);
                }
            });
        } else {
            // Debug: Log if interactables group is missing
            if (this.interactables === null || this.interactables === undefined) {
                console.warn('⚠️ this.interactables is not initialized!');
            }
        }

        // Check NPCs directly (for Space key interaction and prompt display)
        // Store nearest NPC for prompt display and Space key interaction
        if (!this.interactionTarget && this.npcs) {
            let minNPCDistance = 60; // 60px interaction radius
            
            this.npcs.forEach(npc => {
                const distance = Phaser.Math.Distance.Between(
                    this.player.x, this.player.y,
                    npc.x, npc.y
                );
                if (distance < minNPCDistance) {
                    minNPCDistance = distance;
                    this.nearestNPC = npc;
                }
            });
        }

        if (!this.interactionTarget) {
            this.physics.world.overlap(this.player, this.transitions, (_, item) => {
                if (!this.interactionTarget) {
                    this.interactionTarget = item;
                    this.interactionType = 'transition';
                }
            });
        }

        // CRITICAL FIX: Show interaction prompt for quest items, NPCs, or other interactables
        // Force visibility and ensure prompt is always on top
        if (this.interactionTarget || this.nearestNPC) {
            // Force prompt visibility
            if (!this.promptText.visible) {
                this.promptText.setVisible(true);
            }
            this.promptText.setAlpha(1.0);
            this.promptText.setDepth(10002); // Ensure it's above everything
            
            // Diegetic interaction prompts - differentiate between quest items and NPCs
            let promptMessage = 'Press [E] to Interact';
            
            if (this.interactionTarget) {
                const kind = this.interactionTarget.data ? this.interactionTarget.data.get('kind') : null;
                if (kind === 'quest_item') {
                    promptMessage = 'Press [E] to Inspect';
                } else if (kind === 'suspect') {
                    promptMessage = 'Press [E] to Talk';
                } else if (this.interactionType === 'transition') {
                    promptMessage = 'Press [E] to Travel';
                } else {
                    promptMessage = 'Press [E] to Interact';
                }
            } else if (this.nearestNPC) {
                // NPC interaction prompt
                promptMessage = 'Press [E] to Talk';
            }
            
            this.promptText.setText(promptMessage);
            
            // Update fallback HTML prompt as backup
            this.updateFallbackPrompt(promptMessage, true);
            
            // DEBUG: Log interaction detection
            if (this.interactionTarget) {
                const kind = this.interactionTarget.data ? this.interactionTarget.data.get('kind') : 'unknown';
                console.log(`🔍 Interaction detected: ${kind} - Showing prompt: ${promptMessage}`);
            } else if (this.nearestNPC) {
                console.log(`🔍 NPC interaction detected - Showing prompt: ${promptMessage}`);
            }
        } else {
            this.promptText.setVisible(false);
            // Hide fallback prompt
            this.updateFallbackPrompt('', false);
        }

        // Movement Normalization (skip if Tile Guard rolled back)
        if (!this.tileGuardRollback) {
            // Compute input direction vector (dx, dy)
            let dx = 0;
            let dy = 0;

            // Horizontal input (WASD + Arrow Keys)
            if (this.cursors.left.isDown || this.wasd.A.isDown) {
                dx = -1;
            } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
                dx = 1;
            }

            // Vertical input (WASD + Arrow Keys)
            if (this.cursors.up.isDown || this.wasd.W.isDown) {
                dy = -1;
            } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
                dy = 1;
            }

            // Axis lock: if enabled, prioritize the axis with stronger input
            if (GameScene.AXIS_LOCKED && dx !== 0 && dy !== 0) {
                // Lock to the axis with the stronger input (or horizontal if equal)
                if (Math.abs(dx) >= Math.abs(dy)) {
                    dy = 0;
                } else {
                    dx = 0;
                }
            }

            // Check if moving
            const moving = dx !== 0 || dy !== 0;
            const isSprinting = this.cursors.shift.isDown;
            const speed = isSprinting
                ? GameScene.PLAYER_SPEED * GameScene.PLAYER_SPRINT_MULTIPLIER
                : GameScene.PLAYER_SPEED;

            if (moving) {
                // Normalize input vector first, then multiply by speed for consistent movement
                // This ensures diagonal movement has the same speed magnitude as straight movement
                // Without normalization, diagonal movement would be sqrt(2) times faster (Pythagorean theorem)
                const inputMagnitude = Math.hypot(dx, dy); // Use Math.hypot for better precision
                const normalizedDx = inputMagnitude > 0 ? dx / inputMagnitude : 0;
                const normalizedDy = inputMagnitude > 0 ? dy / inputMagnitude : 0;

                // Compute velocity from normalized direction vector
                const velocityX = normalizedDx * speed;
                const velocityY = normalizedDy * speed;

                // Apply velocity to Arcade body
                this.player.setVelocity(velocityX, velocityY);

                // Update animation based on direction (use normalized input direction)
                this.updatePlayerAnimation(normalizedDx, normalizedDy, velocityX, velocityY, true);

                // Debug: Log speed magnitude to verify consistency
                // #region agent log
                const speedMagnitude = Math.hypot(velocityX, velocityY);
                const isDiagonal = dx !== 0 && dy !== 0;
                const movementType = isDiagonal ? 'diagonal' : 'straight';
                fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Game.js:2665', message: 'Player movement speed', data: { speedMagnitude: Math.round(speedMagnitude), expectedSpeed: Math.round(speed), movementType: movementType, dx: dx, dy: dy, normalizedDx: normalizedDx.toFixed(3), normalizedDy: normalizedDy.toFixed(3), velocityX: Math.round(velocityX), velocityY: Math.round(velocityY) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'B' }) }).catch(() => { });
                // #endregion

                // Sprint trail effect (throttled to every 100ms)
                if (isSprinting && (this.time.now - this.lastTrailTime > 100)) {
                    this.createSprintTrail();
                    this.lastTrailTime = this.time.now;
                }

                // Play footstep sound when moving
                if (this.audio) {
                    this.audio.playFootstep();
                }
            } else {
                // Not moving: set velocity to zero and play idle animation
                this.player.setVelocity(0, 0);
                this.updatePlayerAnimation(0, 0, 0, 0, false);
            }
        } else {
            // Tile Guard rolled back, ensure velocity is zero
            this.player.setVelocity(0, 0);
            this.updatePlayerAnimation(0, 0, 0, 0, false);
        }

        // NPC Interaction (Space) - Only if no other interaction target
        // E key is handled by handleInteractable() for quest items and other interactables
        if (Phaser.Input.Keyboard.JustDown(this.input.keyboard.addKey('SPACE'))) {
            // Only interact with NPCs if no quest item or other interactable is targeted
            if (!this.interactionTarget && this.nearestNPC) {
                const nearest = this.nearestNPC;
                
                // Stop Player
                this.player.setVelocity(0);

                // Stop NPC
                if (nearest.controller) nearest.controller.enterPause(5000);

                // Trigger UI
                const key = nearest.npcKey || "Unknown";
                console.log("Interacting with NPC:", key);

                // Generic mapping or direct key
                this.interrogationUI.open({
                    id: key,
                    name: key,
                    portrait: `assets/portraits/${key}.png`
                });
            }
        }

        // MANDATORY FIX: E key interaction handler - handles ALL interaction types
        if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
            console.log(`🔍 E key pressed! interactionTarget=${!!this.interactionTarget}, nearestNPC=${!!this.nearestNPC}, interactionType=${this.interactionType}`);
            
            // STEP 4: Play interact sound
            if (this.audio) {
                this.audio.playInteract();
            }

            // PRIORITY 1: Handle quest items and other interactables (quest items take priority)
            if (this.interactionTarget) {
                const kind = this.interactionTarget.data ? this.interactionTarget.data.get('kind') : null;
                
                // Handle quest_item, interactable, or any other kind
                if (this.interactionType === 'quest_item' || this.interactionType === 'interactable' || kind) {
                    const id = this.interactionTarget.data ? this.interactionTarget.data.get('id') : null;
                    const title = this.interactionTarget.data ? this.interactionTarget.data.get('title') : null;
                    const image = this.interactionTarget.data ? this.interactionTarget.data.get('image') : null;
                    const portrait = this.interactionTarget.data ? this.interactionTarget.data.get('portrait') : null;
                    const metadata = this.interactionTarget.data ? this.interactionTarget.data.get('metadata') : null;
                    
                    console.log(`🔍 E key: Handling ${kind || this.interactionType} interaction`, { id, kind, interactionType: this.interactionType });
                    this.handleInteractable(kind || this.interactionType, { id, title, image, portrait, metadata });
                } else if (this.interactionType === 'transition') {
                    console.log(`🔍 E key: Handling transition`);
                    this.handleTransition(this.interactionTarget);
                } else {
                    console.warn(`⚠️ E key: Unknown interaction type: ${this.interactionType}, kind: ${kind}`);
                }
            } 
            // PRIORITY 2: Handle NPCs with E key (alternative to SPACE)
            else if (this.nearestNPC) {
                const nearest = this.nearestNPC;
                
                // Stop Player
                this.player.setVelocity(0);

                // Stop NPC
                if (nearest.controller) nearest.controller.enterPause(5000);

                // Trigger UI
                const key = nearest.npcKey || nearest.texture?.key || "Unknown";
                console.log(`🔍 E key: Interacting with NPC: ${key}`);

                // Get NPC data if available
                const npcData = nearest.id ? getNPCById(nearest.id) : null;
                
                // Generic mapping or direct key
                this.interrogationUI.open({
                    id: nearest.id || key,
                    name: npcData?.name || nearest.name || key,
                    portrait: npcData?.portrait || `assets/portraits/${key}.png`
                });
            } else {
                console.log(`⚠️ E key pressed but no interaction target or NPC found`);
            }
        }

        // STEP 7: Update Quest Navigation Visuals (Arrow rotation/position)
        this.updateQuestNavigationVisuals();
        this.checkQuestTriggers();
    }

    /**
     * Update player animation based on movement direction
     * @param {number} dx - Normalized direction X (-1 to 1)
     * @param {number} dy - Normalized direction Y (-1 to 1)
     * @param {number} velocityX - Current velocity X
     * @param {number} velocityY - Current velocity Y
     * @param {boolean} isMoving - Whether the player is currently moving
     */
    updatePlayerAnimation(dx, dy, velocityX, velocityY, isMoving) {
        let animKey;

        if (isMoving) {
            let direction = 'down';

            if (Math.abs(dx) > Math.abs(dy)) {
                direction = dx > 0 ? 'right' : 'left';
            } else if (Math.abs(dy) > Math.abs(dx)) {
                direction = dy > 0 ? 'down' : 'up';
            } else if (dx !== 0 || dy !== 0) {
                direction = Math.abs(velocityX) > Math.abs(velocityY)
                    ? (velocityX > 0 ? 'right' : 'left')
                    : (velocityY > 0 ? 'down' : 'up');
            }

            this.lastDirection = direction;
            animKey = `walk-${direction}`;
        } else {
            animKey = `idle-${this.lastDirection || 'down'}`;
        }

        // ✅ Check existence on Animation Manager, not sprite state
        if (this.anims.exists(animKey)) {
            if (this.player.anims.currentAnim?.key !== animKey) {
                this.player.anims.play(animKey, true);
            }
        } else {
            // One-time warning (optional)
            this._missingAnimWarn ??= new Set();
            if (!this._missingAnimWarn.has(animKey)) {
                this._missingAnimWarn.add(animKey);
                console.warn(`[ANIMS] Missing animation key: "${animKey}"`);
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
            // Play Zelda-style item collection sound
            if (this.audio) {
                this.audio.playSfx('item_collect', { volume: 0.8 });
            }
            // Trigger quest completion checks
            if (this.questSystem) {
                this.questSystem.checkQuestCompletion({ type: 'evidence_scanned', id: data.id });
            }
            return;
        }
        if (kind === 'quest_item') {
            // Quest item collection handler
            const questItem = QUEST_ITEMS[data.id];
            if (!questItem) {
                console.error(`Quest item ${data.id} not found in QUEST_ITEMS`);
                return;
            }
            
            // Add to evidence/inventory
            const entry = {
                id: questItem.id,
                title: questItem.name,
                description: questItem.description,
                image: questItem.spriteKey,
                metadata: {
                    questPath: questItem.questPath,
                    questObjective: questItem.questObjective,
                    hexColor: questItem.hexColor
                }
            };
            upsertEvidence(entry);
            addTimelineEvent({ text: `Quest item collected: ${questItem.name}` });
            
            // Play Zelda-style item collection sound
            if (this.audio) {
                this.audio.playSfx('item_collect', { volume: 0.8 });
            }
            
            // CRITICAL FIX: Open InterrogationUI with quest item context
            // This was identified in the audit as missing - now properly implemented
            this.interrogationUI.open({
                id: questItem.id,
                name: questItem.name,
                portrait: `assets/portraits/${questItem.id}.png`,
                questItem: true,
                questPath: questItem.questPath,
                questObjective: questItem.questObjective,
                description: questItem.description
            });
            
            // Complete quest objective
            if (this.questSystem && questItem.questObjective) {
                this.questSystem.checkQuestCompletion({
                    type: 'quest_item_collected',
                    id: questItem.id,
                    objectiveId: questItem.questObjective
                });
            }
            
            // Refresh quest tracker UI to show updated objective
            if (this.questTrackerUI) {
                this.questTrackerUI.refresh();
            }
            
            // Remove item from world (destroy interactable zone)
            if (this.interactionTarget) {
                // Remove visual indicator if it exists
                const indicator = this.interactionTarget.getData('indicator');
                if (indicator) {
                    indicator.destroy();
                }
                this.interactionTarget.destroy();
            }
            
            return;
        }
        if (kind === 'suspect') {
            setSuspectMeta(data.id, { id: data.id, name: data.title, portrait: data.portrait });
            addTimelineEvent({ text: `Approached suspect: ${data.title || data.id}` });
            // Use DialogueBoxUI for suspect interactions (Pokemon style)
            if (this.dialogueUI) {
                this.dialogueUI.startDialogue(data.id);
            } else {
                console.error('DialogueUI not initialized, falling back to InterrogationUI');
                this.interrogationUI.open({
                    id: data.id,
                    name: data.title,
                    portrait: data.portrait
                });
            }
            // Trigger quest completion checks
            if (this.questSystem) {
                this.questSystem.checkQuestCompletion({ type: 'interrogation_started', id: data.id });
            }
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

    /**
     * Collision Audit Mode: Validates walkability and reachability of the map
     * - Builds walkability grid from collision data
     * - BFS/flood-fill from player spawn to compute reachable % of map
     * - Validates player spawn and NPC spawns
     * - Samples random path tiles for reachability
     * - Generates comprehensive report
     */
    runCollisionAudit() {
        if (!this.blockedTiles || !this.mapW || !this.mapH) {
            console.warn('⚠️ Collision Audit: blockedTiles not initialized. Skipping audit.');
            return;
        }

        if (!this.playerSpawnTile) {
            console.warn('⚠️ Collision Audit: playerSpawnTile not set. Skipping audit.');
            return;
        }

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('🔍 COLLISION AUDIT MODE');
        console.log('═══════════════════════════════════════════════════════════\n');

        // Log collision source and stats
        if (this.collisionStats) {
            console.log('📊 Collision Source Information:');
            console.log(`   Type: ${this.collisionStats.sourceType}`);
            console.log(`   Name: "${this.collisionStats.sourceName}"`);
            console.log(`   Colliders Created: ${this.collisionStats.colliderCount.toLocaleString()}`);
            console.log('');
        } else {
            console.warn('⚠️  Collision stats not available');
        }

        const mapW = this.mapW;
        const mapH = this.mapH;
        const blocked = this.blockedTiles;
        const totalTiles = mapW * mapH;

        // Step 1: Build walkability grid (walkable = !blocked)
        let walkableTiles = 0;
        let blockedTilesCount = 0;
        const walkableGrid = new Array(totalTiles).fill(false);

        for (let ty = 0; ty < mapH; ty++) {
            for (let tx = 0; tx < mapW; tx++) {
                const idx = ty * mapW + tx;
                const isBlocked = blocked[idx] === 1;
                if (isBlocked) {
                    blockedTilesCount++;
                } else {
                    walkableTiles++;
                    walkableGrid[idx] = true;
                }
            }
        }

        // Step 2: BFS/flood-fill from player spawn to compute reachable tiles
        const startTx = this.playerSpawnTile.tx;
        const startTy = this.playerSpawnTile.ty;
        const startIdx = startTy * mapW + startTx;

        if (startTx < 0 || startTy < 0 || startTx >= mapW || startTy >= mapH) {
            console.error(`❌ Collision Audit: Player spawn tile (${startTx}, ${startTy}) is out of bounds!`);
            return;
        }

        if (!walkableGrid[startIdx]) {
            console.error(`❌ Collision Audit: Player spawn tile (${startTx}, ${startTy}) is BLOCKED!`);
        }

        const reachableGrid = new Array(totalTiles).fill(false);
        const queue = [{ tx: startTx, ty: startTy }];
        reachableGrid[startIdx] = true;
        let reachableTiles = 1;

        let head = 0;
        while (head < queue.length) {
            const curr = queue[head++];
            const neighbors = [
                { tx: curr.tx, ty: curr.ty - 1 },
                { tx: curr.tx, ty: curr.ty + 1 },
                { tx: curr.tx - 1, ty: curr.ty },
                { tx: curr.tx + 1, ty: curr.ty }
            ];

            for (const nb of neighbors) {
                if (nb.tx >= 0 && nb.ty >= 0 && nb.tx < mapW && nb.ty < mapH) {
                    const nbIdx = nb.ty * mapW + nb.tx;
                    if (walkableGrid[nbIdx] && !reachableGrid[nbIdx]) {
                        reachableGrid[nbIdx] = true;
                        reachableTiles++;
                        queue.push(nb);
                    }
                }
            }
        }

        const reachablePercent = (reachableTiles / walkableTiles) * 100;

        // Step 3: Validate player spawn
        const playerSpawnWalkable = walkableGrid[startIdx];
        const playerSpawnReachable = reachableGrid[startIdx];

        // Step 4: Validate NPC spawns
        const npcSpawns = [];
        if (this.npcs && this.npcs.length > 0) {
            const tileW = this.mapTileWidth || this.map?.tileWidth || 32;
            const tileH = this.mapTileHeight || this.map?.tileHeight || 32;
            this.npcs.forEach((npc, idx) => {
                const tx = Math.floor(npc.x / tileW);
                const ty = Math.floor(npc.y / tileH);
                const npcIdx = ty * mapW + tx;
                npcSpawns.push({
                    idx,
                    tx,
                    ty,
                    walkable: walkableGrid[npcIdx] || false,
                    reachable: reachableGrid[npcIdx] || false
                });
            });
        }

        const numNPCSpawns = npcSpawns.length;
        const reachableNPCSpawns = npcSpawns.filter(s => s.reachable).length;
        const walkableNPCSpawns = npcSpawns.filter(s => s.walkable).length;

        // Step 5: Sample random path tiles
        const sampleSize = 100;
        const randomSamples = [];
        let attempts = 0;
        const maxAttempts = sampleSize * 10;

        while (randomSamples.length < sampleSize && attempts < maxAttempts) {
            attempts++;
            const tx = Math.floor(Math.random() * mapW);
            const ty = Math.floor(Math.random() * mapH);
            const idx = ty * mapW + tx;
            if (walkableGrid[idx]) {
                randomSamples.push({
                    tx,
                    ty,
                    reachable: reachableGrid[idx]
                });
            }
        }

        const reachableSamples = randomSamples.filter(s => s.reachable).length;
        const sampleReachablePercent = (reachableSamples / randomSamples.length) * 100;

        // Step 6: Generate report
        console.log('📊 COLLISION AUDIT REPORT');
        console.log('───────────────────────────────────────────────────────────');
        console.log(`Total Tiles:           ${totalTiles.toLocaleString()}`);
        console.log(`Walkable Tiles:        ${walkableTiles.toLocaleString()} (${((walkableTiles / totalTiles) * 100).toFixed(2)}%)`);
        console.log(`Blocked Tiles:         ${blockedTilesCount.toLocaleString()} (${((blockedTilesCount / totalTiles) * 100).toFixed(2)}%)`);
        console.log(`Reachable Tiles:       ${reachableTiles.toLocaleString()} (${reachablePercent.toFixed(2)}% of walkable)`);
        console.log(`Unreachable Tiles:     ${(walkableTiles - reachableTiles).toLocaleString()} (${(100 - reachablePercent).toFixed(2)}% of walkable)`);
        console.log('───────────────────────────────────────────────────────────');
        console.log(`Player Spawn Tile:     (${startTx}, ${startTy})`);
        console.log(`  Walkable:            ${playerSpawnWalkable ? '✅ YES' : '❌ NO'}`);
        console.log(`  Reachable:           ${playerSpawnReachable ? '✅ YES' : '❌ NO'}`);
        console.log('───────────────────────────────────────────────────────────');
        console.log(`NPC Spawns:            ${numNPCSpawns}`);
        console.log(`  Walkable:            ${walkableNPCSpawns} (${numNPCSpawns > 0 ? ((walkableNPCSpawns / numNPCSpawns) * 100).toFixed(2) : 0}%)`);
        console.log(`  Reachable:           ${reachableNPCSpawns} (${numNPCSpawns > 0 ? ((reachableNPCSpawns / numNPCSpawns) * 100).toFixed(2) : 0}%)`);
        if (numNPCSpawns > 0 && walkableNPCSpawns < numNPCSpawns) {
            const invalid = npcSpawns.filter(s => !s.walkable);
            console.log(`  ❌ Invalid spawns:   ${invalid.map(s => `NPC${s.idx}@(${s.tx},${s.ty})`).join(', ')}`);
        }
        if (numNPCSpawns > 0 && reachableNPCSpawns < numNPCSpawns) {
            const unreachable = npcSpawns.filter(s => s.walkable && !s.reachable);
            console.log(`  ⚠️  Unreachable:     ${unreachable.map(s => `NPC${s.idx}@(${s.tx},${s.ty})`).join(', ')}`);
        }
        console.log('───────────────────────────────────────────────────────────');
        console.log(`Random Path Samples:   ${randomSamples.length} walkable tiles sampled`);
        console.log(`  Reachable:           ${reachableSamples} (${sampleReachablePercent.toFixed(2)}%)`);
        console.log('───────────────────────────────────────────────────────────');

        // Step 7: Analyze collision layers if reachablePercent is suspiciously low
        if (reachablePercent < 50) {
            console.log('⚠️  WARNING: Reachable percentage is suspiciously low!');
            console.log('   Analyzing collision layers...\n');

            // Count blocked tiles per layer (if we have layer data)
            if (this.map && this.map.layers) {
                const layerBlockedCounts = {};
                this.map.layers.forEach(layer => {
                    if (layer.type === 'tilelayer' && layer.name) {
                        let count = 0;
                        for (let ty = 0; ty < mapH; ty++) {
                            for (let tx = 0; tx < mapW; tx++) {
                                const tile = layer.data && layer.data[ty] && layer.data[ty][tx];
                                if (tile && tile.index !== -1) {
                                    // Check if this tile contributes to blockedTiles
                                    const idx = ty * mapW + tx;
                                    if (blocked[idx] === 1) {
                                        count++;
                                    }
                                }
                            }
                        }
                        if (count > 0) {
                            layerBlockedCounts[layer.name] = count;
                        }
                    }
                });

                if (Object.keys(layerBlockedCounts).length > 0) {
                    console.log('   Blocked tiles per layer:');
                    const sorted = Object.entries(layerBlockedCounts)
                        .sort((a, b) => b[1] - a[1]);
                    sorted.forEach(([name, count]) => {
                        const percent = (count / blockedTilesCount) * 100;
                        console.log(`     ${name}: ${count.toLocaleString()} tiles (${percent.toFixed(2)}% of all blocked)`);
                    });
                }
            }

            // Check if "Blocked" layer exists and count its tiles
            if (this.map) {
                const blockedLayer = this.map.layers.find(l => l.name === 'Blocked' && l.type === 'tilelayer');
                if (blockedLayer) {
                    let blockedLayerCount = 0;
                    for (let ty = 0; ty < mapH; ty++) {
                        for (let tx = 0; tx < mapW; tx++) {
                            const tile = blockedLayer.data && blockedLayer.data[ty] && blockedLayer.data[ty][tx];
                            if (tile && tile.index !== -1 && tile.collides) {
                                blockedLayerCount++;
                            }
                        }
                    }
                    console.log(`\n   "Blocked" tile layer: ${blockedLayerCount.toLocaleString()} tiles with collides=true`);
                }

                // Check "Collisions" object layer
                const collisionsLayer = this.findObjectLayer ? this.findObjectLayer('Collisions') : this.map.getObjectLayer('Collisions');
                if (collisionsLayer && collisionsLayer.objects) {
                    console.log(`   "Collisions" object layer: ${collisionsLayer.objects.length} objects`);
                }
            }
        }

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('✅ Collision Audit Complete\n');
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
