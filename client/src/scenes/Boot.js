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

        // Load the new detective spritesheet (32x32 frames, 5 rows)
        this.load.spritesheet('detective', 'assets/sprites/characters/detective.png', { frameWidth: 96, frameHeight: 96 });
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

        // Idle Animations (Single frame from Row 5)
        this.anims.create({ key: 'idle-down', frames: [{ key: 'detective', frame: 16 }], frameRate: 1 });
        this.anims.create({ key: 'idle-left', frames: [{ key: 'detective', frame: 17 }], frameRate: 1 });
        this.anims.create({ key: 'idle-right', frames: [{ key: 'detective', frame: 18 }], frameRate: 1 });
        this.anims.create({ key: 'idle-up', frames: [{ key: 'detective', frame: 19 }], frameRate: 1 });

        console.log("Boot scene complete. Starting Menu...");
        this.scene.start('StartMenu');
    }
}
