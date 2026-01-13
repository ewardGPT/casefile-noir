// client/src/utils/mapDebugOverlay.js
// Fast overlay renderer for blocked/visited/unreachable/chokepoints/micro-gaps using Phaser Graphics

export class MapDebugOverlay {
    constructor(scene, debugData) {
        this.scene = scene;
        this.data = debugData;
        this.enabled = false;

        this.g = scene.add.graphics();
        this.g.setDepth(999999);
        this.g.setScrollFactor(1);
        this.g.visible = false;
    }

    setData(debugData) {
        this.data = debugData;
        if (this.enabled) this.redraw();
    }

    toggle() {
        this.enabled = !this.enabled;
        this.g.visible = this.enabled;
        if (this.enabled) {
            this.redraw();
            console.log("Debug overlay: ON (Red=blocked, Purple=islands, Yellow=chokepoints, Cyan=micro-gaps)");
        } else {
            console.log("Debug overlay: OFF");
        }
    }

    redraw() {
        if (!this.data) return;

        const { mapW, mapH, tw, th, blocked, visited, islandMark, microGapTiles, chokepoints } = this.data;

        this.g.clear();

        // Blocked tiles (red)
        this.g.fillStyle(0xff0000, 0.25);
        for (let y = 0; y < mapH; y++) {
            for (let x = 0; x < mapW; x++) {
                const idx = y * mapW + x;
                if (blocked[idx]) this.g.fillRect(x * tw, y * th, tw, th);
            }
        }

        // Unreachable walkable islands (purple)
        this.g.fillStyle(0xa855f7, 0.22);
        for (let y = 0; y < mapH; y++) {
            for (let x = 0; x < mapW; x++) {
                const idx = y * mapW + x;
                if (!blocked[idx] && !visited[idx] && islandMark[idx]) {
                    this.g.fillRect(x * tw, y * th, tw, th);
                }
            }
        }

        // Micro-gap tiles (cyan outline)
        if (microGapTiles) {
            this.g.lineStyle(2, 0x00ffff, 0.9);
            for (let y = 0; y < mapH; y++) {
                for (let x = 0; x < mapW; x++) {
                    const idx = y * mapW + x;
                    if (microGapTiles[idx]) {
                        this.g.strokeRect(x * tw + 2, y * th + 2, tw - 4, th - 4);
                    }
                }
            }
        }

        // Chokepoints (yellow outline)
        this.g.lineStyle(2, 0xffd000, 0.9);
        for (const p of chokepoints || []) {
            this.g.strokeRect(p.x * tw, p.y * th, tw, th);
        }
    }
}
