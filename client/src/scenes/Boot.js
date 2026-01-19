import Phaser from 'phaser';
import { loadCollisionDataCache, mergeCollisionData } from '../data/CollisionDataManager.js';

export default class Boot extends Phaser.Scene {
    constructor() {
        super('Boot');
    }

    preload() {
        console.log("Boot.preload started");
        this.add.text(20, 20, 'Loading Evidence...', { font: '20px monospace', fill: '#ffffff' });

        // Error handlers for asset loading - store references for cleanup
        this.loadHandlers = {
            filecomplete: (key, type, data) => {
                console.log(`✓ Loaded: ${key} (${type})`);
            },
            loaderror: (file) => {
                console.error(`❌ Failed to load: ${file.key} from ${file.src}`);
            },
            filecompleteerror: (key, type, file) => {
                console.error(`❌ File complete error: ${key} (${type}) from ${file.src}`);
            }
        };

        this.load.on('filecomplete', this.loadHandlers.filecomplete);
        this.load.on('loaderror', (file) => {
            this.loadHandlers.loaderror(file);
            // Hook into QA harness
            if (window.__QA__) {
                window.__QA__.logAsset404(file.key || 'unknown', file.src || 'unknown');
            }
            // Show error overlay for map loading failures
            if (file.key === 'city_map') {
                this.showMapErrorOverlay(`Failed to load map: ${file.src}`);
            }
        });
        this.load.on('filecompleteerror', (key, type, file) => {
            this.loadHandlers.filecompleteerror(key, type, file);
            // Hook into QA harness
            if (window.__QA__) {
                window.__QA__.logAsset404(key, file?.src || 'unknown');
            }
        });

        // -- CORE ASSETS --
        // -- CORE ASSETS --
        // Load the split JSON map (optimized for webgl)
        // Path: public/assets/maps/victorian/city_map_split.json (server serves from client/ root)
        this.load.tilemapTiledJSON('city_map', 'public/assets/maps/victorian/city_map_split.json');

        // Tileset Images (Key must match 'name' in TMX/JSON for auto-matching, or we map manually)
        const path = 'public/assets/maps/victorian/';

        // Load split terrain chunks (0 to 7)
        for (let i = 0; i < 8; i++) {
            this.load.image(`terrain-map-v8_${i}`, `${path}terrain-map-v8_${i}.png`);
        }

        // Old single texture (REMOVED)
        // this.load.image('terrain-map-v8', path + 'terrain-map-v8.png');
        this.load.image('vten', path + 'victorian-tenement.png');
        this.load.image('windoors', path + 'windows-doors.png');
        this.load.image('vhouse', path + 'victorian-mansion.png');
        this.load.image('roofs', path + 'roofs.png');
        this.load.image('vacc', path + 'victorian-accessories.png');
        this.load.image('bricks', path + 'bricks.png');
        this.load.image('vwindoors', path + 'victorian-windows-doors.png');
        this.load.image('container', path + 'container.png');
        this.load.image('vmkt', path + 'victorian-market.png');
        this.load.image('vgard', path + 'victorian-garden.png');
        this.load.image('vstreets', path + 'victorian-streets.png');
        this.load.image('food', path + 'food.png');
        this.load.image('trees', path + 'trees-green.png');

        // Load the detective spritesheet (now 64x64 frames to match NPCs)
        this.load.spritesheet('detective', 'assets/sprites/characters/detective.png', { frameWidth: 64, frameHeight: 64 });

        // Load NPC spritesheets (4x4 grid, 64x64 frames based on 256x256 image)
        for (let i = 1; i <= 35; i++) {
            this.load.spritesheet(`npc_${i}`, `assets/sprites/characters/npc_${i}.png`, { frameWidth: 64, frameHeight: 64 });
        }

        // Load Spawn Configuration
        this.load.json('spawn_config', 'spawn_config.json');

        // Load Collision Map Data (8px sub-grid collision system)
        // This file contains coordinate-indexed collision masks synced with COLOR_MANIFEST.js
        // Path: public/data/collision_map.json (server serves from client/ root)
        this.load.json('collision_map', 'data/collision_map.json');

        // Load NPC portrait images (if they exist - fallback to detective sprite if missing)
        // Note: Phaser will log warnings for missing files but continue execution
        for (let i = 1; i <= 35; i++) {
            this.load.image(`portrait_npc_${i}`, `assets/portraits/npc_${i}.png`);
        }
        
        // Load dialogue UI assets (if custom graphics exist)
        this.load.image('dialogue_frame', 'assets/ui/dialogue_frame.png');
        this.load.image('dialogue_arrow', 'assets/ui/dialogue_arrow.png');

        // Load Quest Marker sprites (quest NPC icons for minimap/UI)
        // Quest markers are used to indicate quest targets on the minimap
        for (let i = 1; i <= 5; i++) {
            this.load.image(`quest_marker_${i}`, `assets/sprites/characters/quest/quest_npc_${i}.png`);
        }

        // Load Cafe logo asset (if it exists)
        // This is used for location markers or UI elements
        this.load.image('cafe_logo', 'assets/ui/cafe_logo.png');
        
        // Load audio effects for quest items and dialogue
        // Note: These will use fallback sounds if files don't exist
        this.load.audio('item_collect', 'assets/audio/sfx/item_collect.ogg');
        this.load.audio('typewriter_beep', 'assets/audio/sfx/typewriter_beep.ogg');
        this.load.audio('victory_fanfare', 'assets/audio/sfx/victory_fanfare.ogg');
        this.load.audio('failure_sound', 'assets/audio/sfx/failure_sound.ogg');
        
        // Note: NPC billboards are created dynamically using Phaser Graphics
        // (see NPC.js createBillboardNameplate method) - no external assets needed
    }

    create() {
        console.log("Boot.create started");

        // Define Detective Animations
        const animConfig = [
            { key: 'walk-down', start: 0, end: 3 },
            { key: 'walk-left', start: 4, end: 7 },
            { key: 'walk-right', start: 8, end: 11 },
            { key: 'walk-up', start: 12, end: 15 },
        ];

        animConfig.forEach(cfg => {
            try {
                if (!this.textures.exists('detective')) {
                    console.error("Detective texture not found! Cannot create animations.");
                    return;
                }
                this.anims.create({
                    key: cfg.key,
                    frames: this.anims.generateFrameNumbers('detective', { start: cfg.start, end: cfg.end }),
                    frameRate: 8,
                    repeat: -1
                });
            } catch (error) {
                console.error(`Failed to create animation ${cfg.key}:`, error);
                throw error;
            }
        });

        // Idle Animations (Use first frame of each walk direction since sprite only has 4 rows)
        this.anims.create({ key: 'idle-down', frames: [{ key: 'detective', frame: 0 }], frameRate: 1 });
        this.anims.create({ key: 'idle-left', frames: [{ key: 'detective', frame: 4 }], frameRate: 1 });
        this.anims.create({ key: 'idle-right', frames: [{ key: 'detective', frame: 8 }], frameRate: 1 });
        this.anims.create({ key: 'idle-up', frames: [{ key: 'detective', frame: 12 }], frameRate: 1 });

        // NPC Animations (same pattern for all 35 NPCs)
        for (let i = 1; i <= 35; i++) {
            const npcKey = `npc_${i}`;
            // Skip if texture doesn't exist
            if (!this.textures.exists(npcKey)) {
                console.warn(`NPC texture ${npcKey} not found, skipping animations`);
                continue;
            }
            ['down', 'left', 'right', 'up'].forEach((dir, idx) => {
                try {
                    this.anims.create({
                        key: `${npcKey}-walk-${dir}`,
                        frames: this.anims.generateFrameNumbers(npcKey, { start: idx * 4, end: idx * 4 + 3 }),
                        frameRate: 6,
                        repeat: -1
                    });
                    this.anims.create({
                        key: `${npcKey}-idle-${dir}`,
                        frames: [{ key: npcKey, frame: idx * 4 }],
                        frameRate: 1
                    });
                } catch (error) {
                    console.error(`Failed to create animations for ${npcKey}-${dir}:`, error);
                    // Don't throw, continue with other NPCs
                }
            });
        }

        // Sanity check: log all animation keys
        const animKeys = Object.keys(this.anims.anims.entries || {});
        console.log('✅ Anim keys created:', animKeys);

        // Initialize global CollisionData registry from collision_map.json
        // This provides persistent storage for the 8px sub-grid collision system
        // Supports both old format ({ "x,y": mask }) and new format ({ "x,y": { mask, alpha_threshold_passed } })
        // Merges with localStorage cache to preserve tight boundaries from Agent 3 updates
        try {
            const collisionMapData = this.cache.json.get('collision_map');
            let staticData = {};
            
            if (collisionMapData && collisionMapData.collisionData) {
                // Normalize static collision data: ensure all entries use new format
                for (const [key, value] of Object.entries(collisionMapData.collisionData)) {
                    if (typeof value === 'number') {
                        // Old format: convert to new format
                        staticData[key] = {
                            mask: value,
                            alpha_threshold_passed: false
                        };
                    } else if (value && typeof value === 'object' && 'mask' in value) {
                        // New format: use as-is
                        staticData[key] = value;
                    } else {
                        // Invalid format: skip or use default
                        console.warn(`⚠️ Invalid collision entry for ${key}, skipping`);
                    }
                }
            }
            
            // Load cached CollisionData from localStorage (tight boundaries from Agent 3)
            const cachedData = loadCollisionDataCache();
            
            // Merge: cached data (tight boundaries) takes precedence over static data
            const mergedData = mergeCollisionData(staticData, cachedData);
            
            // Store in global Registry variable as CollisionData
            if (typeof window !== 'undefined') {
                window.CollisionData = mergedData;
                // Also store metadata for reference
                window.CollisionDataMetadata = collisionMapData?._metadata || {};
                const cachedCount = cachedData ? Object.keys(cachedData.collisionData || {}).length : 0;
                console.log('✅ CollisionData loaded:', Object.keys(mergedData).length, 'tiles initialized', 
                           cachedCount > 0 ? `(${cachedCount} tight boundaries from cache)` : '');
            } else {
                // Fallback for non-browser environments
                global.CollisionData = mergedData;
                global.CollisionDataMetadata = collisionMapData?._metadata || {};
                console.log('✅ CollisionData loaded (global):', Object.keys(mergedData).length, 'tiles initialized');
            }
        } catch (error) {
            console.error('❌ Failed to load CollisionData:', error);
            // Initialize empty CollisionData to prevent errors
            const emptyCollisionData = {};
            if (typeof window !== 'undefined') {
                window.CollisionData = emptyCollisionData;
                window.CollisionDataMetadata = {};
            } else {
                global.CollisionData = emptyCollisionData;
                global.CollisionDataMetadata = {};
            }
        }

        console.log("Boot scene complete. Starting Menu...");
        try {
            this.scene.start('StartMenu');
        } catch (error) {
            console.error("Failed to start StartMenu scene:", error);
            throw error; // Re-throw to trigger error overlay
        }
    }

    showMapErrorOverlay(message) {
        // Create error overlay
        const { width, height } = this.scale;
        const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.9);
        bg.setScrollFactor(0);
        bg.setDepth(10000);

        const errorText = this.add.text(width / 2, height / 2 - 50, 'MAP LOADING ERROR', {
            fontSize: '32px',
            fontFamily: 'monospace',
            color: '#ff0000',
            align: 'center'
        });
        errorText.setOrigin(0.5);
        errorText.setScrollFactor(0);
        errorText.setDepth(10001);

        const msgText = this.add.text(width / 2, height / 2 + 20, message, {
            fontSize: '18px',
            fontFamily: 'monospace',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: width - 100 }
        });
        msgText.setOrigin(0.5);
        msgText.setScrollFactor(0);
        msgText.setDepth(10001);

        const hintText = this.add.text(width / 2, height / 2 + 100, 'Check console for details', {
            fontSize: '14px',
            fontFamily: 'monospace',
            color: '#aaaaaa',
            align: 'center'
        });
        hintText.setOrigin(0.5);
        hintText.setScrollFactor(0);
        hintText.setDepth(10001);
    }

    shutdown() {
        // Clean up loader event listeners
        if (this.loadHandlers) {
            this.load.off('filecomplete', this.loadHandlers.filecomplete);
            this.load.off('loaderror', this.loadHandlers.loaderror);
            this.load.off('filecompleteerror', this.loadHandlers.filecompleteerror);
            this.loadHandlers = null;
        }
    }
}
