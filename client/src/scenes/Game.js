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
// Minimap - use dynamic import to handle old builds gracefully
// import { Minimap } from '../utils/minimap.js'; // Commented out - using dynamic import instead
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
                    
                    // Set depth high for "overhead" layers like Roofs
                    if (name.includes('Roof') || name.includes('Top')) {
                        layer.setDepth(15);
                    }
                } else {
                    console.warn(`Game.create: Layer ${name} not created.`);
                }
            });
            console.log("Game.create: Visual layers done.");

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
                    const wall = this.add.rectangle(x + w/2, y + h/2, w, h, 0xff0000, 0); // Invisible
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
                    console.log(`   ${tilesWithCollision} tiles marked as collidable`);
                    this.collidableLayers.push(collisionLayer);
                    colliderCount = tilesWithCollision;
                } else {
                    // Try setCollisionByExclusion (all tiles except empty/transparent)
                    collisionLayer.setCollisionByExclusion([-1, 0]);
                    console.log(`✅ Collision (TileLayer): Using setCollisionByExclusion([-1, 0])`);
                    // Count non-empty tiles
                    for (let ty = 0; ty < mapH; ty++) {
                        for (let tx = 0; tx < mapW; tx++) {
                            const tile = collisionLayer.getTileAt(tx, ty);
                            if (tile && tile.index !== -1 && tile.index !== 0) {
                                colliderCount++;
                            }
                        }
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
                                    const wall = this.add.rectangle(x + feetAreaW/2, y + feetAreaH/2, feetAreaW, feetAreaH, 0xff0000, 0);
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
        fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Game.js:652',message:'Entities layer check',data:{hasLayer:hasEntitiesLayer,hasObjects:hasEntitiesObjects,objectCount:entitiesLayer?.objects?.length||0,layerName:entitiesLayer?.name||'none'},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
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
        fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Game.js:392',message:'Player texture check',data:{hasTexture:hasDetectiveTexture,spawnX,spawnY},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
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

        // --- NPC Debug Markers + Spawn Probe ---
        const npcLayer = this.findObjectLayer ? this.findObjectLayer('NPCs') : map.getObjectLayer('NPCs');
        // #region agent log
        const hasNpcLayer = !!npcLayer;
        const hasNpcObjects = npcLayer && npcLayer.objects && npcLayer.objects.length > 0;
        fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Game.js:817',message:'NPC layer check',data:{hasLayer:hasNpcLayer,hasObjects:hasNpcObjects,objectCount:npcLayer?.objects?.length||0,layerName:npcLayer?.name||'none'},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
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
        this.evidenceCatalog = [];
        this.suspectCatalog = [];
        this.suspectLocations = {};

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
        // Safety: Use dynamic import to handle old builds that don't have Minimap
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Game.js:657',message:'Attempting to load Minimap dynamically',data:{scene:'Game'},timestamp:Date.now(),sessionId:'debug-session',runId:'minimap-fix',hypothesisId:'A'})}).catch(()=>{});
        console.log('[DEBUG] Attempting to load Minimap dynamically');
        // #endregion
        this.minimap = null;
        // Use dynamic import - this will not crash if minimap.js is missing from bundle
        (async () => {
            try {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Game.js:664',message:'Starting dynamic import',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'minimap-fix',hypothesisId:'A'})}).catch(()=>{});
                // #endregion
                const minimapModule = await import('../utils/minimap.js');
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Game.js:666',message:'Minimap module loaded',data:{hasMinimap:!!minimapModule.Minimap,moduleKeys:Object.keys(minimapModule)},timestamp:Date.now(),sessionId:'debug-session',runId:'minimap-fix',hypothesisId:'A'})}).catch(()=>{});
                console.log('[DEBUG] Minimap module loaded', {hasMinimap: !!minimapModule.Minimap});
                // #endregion
                if (minimapModule && minimapModule.Minimap) {
                    try {
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Game.js:670',message:'Creating Minimap instance',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'minimap-fix',hypothesisId:'A'})}).catch(()=>{});
                        // #endregion
                        this.minimap = new minimapModule.Minimap(this);
                        this.minimap.init();
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Game.js:673',message:'Minimap initialized successfully',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'minimap-fix',hypothesisId:'A'})}).catch(()=>{});
                        console.log('[DEBUG] Minimap initialized successfully');
                        // #endregion
                    } catch (e) {
                        console.warn('Minimap initialization failed:', e);
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Game.js:678',message:'Minimap init error',data:{error:e.message,stack:e.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'minimap-fix',hypothesisId:'A'})}).catch(()=>{});
                        console.log('[DEBUG] Minimap init error', {error: e.message});
                        // #endregion
                        this.minimap = null;
                    }
                } else {
                    console.warn('Minimap class not found in module');
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Game.js:685',message:'Minimap class not in module',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'minimap-fix',hypothesisId:'A'})}).catch(()=>{});
                    console.log('[DEBUG] Minimap class not in module');
                    // #endregion
                }
            } catch (e) {
                console.warn('Minimap module not available in this build - minimap features disabled', e);
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Game.js:691',message:'Minimap module import failed',data:{error:e.message,stack:e.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'minimap-fix',hypothesisId:'A'})}).catch(()=>{});
                console.log('[DEBUG] Minimap module import failed', {error: e.message});
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
        this.spawnNPCs().then(() => {
            // Run collision audit after NPCs are spawned
            this.runCollisionAudit();
        }).catch(err => {
            console.error('Error spawning NPCs:', err);
        });
        if (import.meta && import.meta.env && import.meta.env.DEV) {
            this.debugHealthReport();
        }

        // --- 12. Debug Overlay (F2 toggle) ---
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
        
        if (debugData) {
            this.mapDebugOverlay = new MapDebugOverlay(this, debugData);
        }
        console.log("🗺️ Debug overlay ready: press F2 to toggle collision visualization");
        console.log("🔍 Collision audit: press F8 to run manually (also runs automatically after NPC spawn)");
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
        
        // Return debug info
        return {
            key: sprite.texture?.key || 'unknown',
            frameW,
            frameH,
            scale: scale.toFixed(3),
            displayW: sprite.displayWidth.toFixed(1),
            displayH: sprite.displayHeight.toFixed(1)
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
    
    shutdown() {
        // Clean up collision debug graphics
        if (this.collisionDebugGraphics) {
            this.collisionDebugGraphics.destroy();
            this.collisionDebugGraphics = null;
        }
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Game.js:703',message:'Game shutdown called',data:{hasInput:!!this.input,hasKeyboard:!!(this.input?.keyboard)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        // Clean up keyboard listeners
        if (this.input && this.input.keyboard) {
            if (this.f2Handler) {
                this.input.keyboard.off("keydown-F2", this.f2Handler);
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Game.js:707',message:'F2 handler removed',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
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
                fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Game.js:721',message:'Mute handler removed',data:{key:'K'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
                // #endregion
            }
            if (this.mHandler) {
                this.input.keyboard.off("keydown-M", this.mHandler);
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Game.js:725',message:'M handler removed',data:{key:'M'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
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
                
                const npc = this.physics.add.sprite(spawnData.x, spawnData.y, npcKey);
                
                // Normalize NPC sprite to consistent size (same as player)
                const tileW = this.mapTileWidth || this.map?.tileWidth || 32;
                const tileH = this.mapTileHeight || this.map?.tileHeight || 32;
                const npcDebug = this.normalizeCharacterSprite(npc, tileW, tileH);
                
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
            const npc = this.physics.add.sprite(sx, sy, npcKey);

            // STEP 2: Normalize NPC sprite to consistent size (same as player)
            const tileW = this.mapTileWidth || this.map?.tileWidth || 32;
            const tileH = this.mapTileHeight || this.map?.tileHeight || 32;
            const npcDebug = this.normalizeCharacterSprite(npc, tileW, tileH);
            
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

    updateNPCs(time, delta) {
        if (!this.npcs) return;

        this.npcs.forEach(npc => {
            // Update the new NPCController with real time (not 0)
            if (npc.controller) {
                npc.controller.update(time, delta);
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
        }

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

        // --- TILE GUARD: Failsafe blocked tile check (Every Frame) ---
        if (this.blockedTiles && this.mapTileWidth && this.mapTileHeight) {
            const tw = this.mapTileWidth;
            const th = this.mapTileHeight;
            const mapW = this.mapW || Math.floor(this.physics.world.bounds.width / tw);

            // Check feet position (sprite origin is at 0.5, 1.0 = bottom center = feet)
            // For both circular and rectangular bodies, sprite.x and sprite.y represent the feet position
            // since the origin is set to (0.5, 1.0) in normalizeCharacterSprite
            const feetX = this.player.x;
            const feetY = this.player.y;

            const tx = Math.floor(feetX / tw);
            const ty = Math.floor(feetY / th);

            // Bounds check for tile coordinates
            if (tx >= 0 && ty >= 0 && tx < mapW && ty < (this.mapH || Math.floor(this.physics.world.bounds.height / th))) {
                const idx = ty * mapW + tx;

                if (this.blockedTiles[idx] === 1) {
                    // We are ON a blocked tile! Rollback immediate.
                    if (this.lastSafePos) {
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Game.js:2551',message:'Tile Guard blocked tile',data:{tx:tx,ty:ty,feetX:Math.round(feetX),feetY:Math.round(feetY),playerX:Math.round(this.player.x),playerY:Math.round(this.player.y),lastSafeX:Math.round(this.lastSafePos.x),lastSafeY:Math.round(this.lastSafePos.y),bodyType:GameScene.ACTOR_BODY_USE_CIRCLE?'circle':'rect'},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'})}).catch(()=>{});
                        // #endregion
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
                fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Game.js:2665',message:'Player movement speed',data:{speedMagnitude:Math.round(speedMagnitude),expectedSpeed:Math.round(speed),movementType:movementType,dx:dx,dy:dy,normalizedDx:normalizedDx.toFixed(3),normalizedDy:normalizedDy.toFixed(3),velocityX:Math.round(velocityX),velocityY:Math.round(velocityY)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
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
