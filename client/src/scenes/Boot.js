export default class Boot extends Phaser.Scene {
    constructor() {
        super('Boot');
    }

    preload() {
        console.log("Boot.preload started");
        this.add.text(20, 20, 'Loading Evidence...', { font: '20px monospace', fill: '#ffffff' });

        // -- CORE ASSETS --
        // -- CORE ASSETS --
        // Load the split JSON map (optimized for webgl)
        this.load.tilemapTiledJSON('city_map', 'assets/maps/victorian/city_map_split.json');

        // Tileset Images (Key must match 'name' in TMX/JSON for auto-matching, or we map manually)
        const path = 'assets/maps/victorian/';

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
        for (let i = 1; i <= 5; i++) {
            this.load.spritesheet(`npc_${i}`, `assets/sprites/characters/npc_${i}.png`, { frameWidth: 64, frameHeight: 64 });
        }
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
            this.anims.create({
                key: cfg.key,
                frames: this.anims.generateFrameNumbers('detective', { start: cfg.start, end: cfg.end }),
                frameRate: 8,
                repeat: -1
            });
        });

        // Idle Animations (Use first frame of each walk direction since sprite only has 4 rows)
        this.anims.create({ key: 'idle-down', frames: [{ key: 'detective', frame: 0 }], frameRate: 1 });
        this.anims.create({ key: 'idle-left', frames: [{ key: 'detective', frame: 4 }], frameRate: 1 });
        this.anims.create({ key: 'idle-right', frames: [{ key: 'detective', frame: 8 }], frameRate: 1 });
        this.anims.create({ key: 'idle-up', frames: [{ key: 'detective', frame: 12 }], frameRate: 1 });

        // NPC Animations (same pattern for all 5 NPCs)
        for (let i = 1; i <= 5; i++) {
            const npcKey = `npc_${i}`;
            ['down', 'left', 'right', 'up'].forEach((dir, idx) => {
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
            });
        }

        console.log("Boot scene complete. Starting Menu...");
        this.scene.start('StartMenu');
    }
}
