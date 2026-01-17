import Phaser from 'phaser';

export const NPCState = {
    IDLE: 'IDLE',
    MOVING: 'MOVING',
    PAUSE: 'PAUSE',
    INTERACT: 'INTERACT'
};

export class NPCController {
    /**
     * @param {Phaser.Scene} scene 
     * @param {Phaser.Physics.Arcade.Sprite} sprite 
     * @param {AStarPathfinder} astar 
     * @param {Object} config 
     */
    constructor(scene, sprite, astar, config = {}) {
        this.scene = scene;
        this.sprite = sprite;
        this.astar = astar;

        // Config defaults
        this.walkSpeed = config.speed || 40;
        this.wanderRadius = config.wanderRadius || 150; // pixels
        this.minPauseMs = config.minPauseMs || 1000;
        this.maxPauseMs = config.maxPauseMs || 3000;
        this.homeX = sprite.x;
        this.homeY = sprite.y;
        this.tileSize = config.tileSize || 32;

        // State
        this.state = NPCState.IDLE;
        this.stateTimer = 0;
        this.activePath = [];
        this.currentPathIndex = 0;
        this.isStuck = false;
        this.stuckTimer = 0;
        this.lastPos = { x: sprite.x, y: sprite.y };

        // Physics setup
        this.sprite.body.setCollideWorldBounds(true);
        this.sprite.body.setSize(this.sprite.width * 0.6, this.sprite.height * 0.4);
        this.sprite.body.setOffset(this.sprite.width * 0.2, this.sprite.height * 0.6);

        // Initial Random Pause
        this.enterPause(Phaser.Math.Between(0, 2000));
    }

    update(time, delta) {
        // Stuck Detection Check (every 500ms approx)
        if (this.state === NPCState.MOVING) {
            this.stuckTimer += delta;
            if (this.stuckTimer > 500) {
                const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.lastPos.x, this.lastPos.y);
                if (dist < 2) {
                    this.isStuck = true;
                    this.enterPause(1000); // Stop and think
                    // Push slightly to unstuck
                    this.sprite.setVelocity(
                        Phaser.Math.Between(-10, 10),
                        Phaser.Math.Between(-10, 10)
                    );
                }
                this.stuckTimer = 0;
                this.lastPos = { x: this.sprite.x, y: this.sprite.y };
            }
        }

        switch (this.state) {
            case NPCState.IDLE:
                // Decide what to do
                if (Math.random() < 0.05) { // 5% chance per frame in IDLE? No, use timer.
                    // This case is usually instant transition from IDLE to Decision
                }
                break;

            case NPCState.PAUSE:
                this.stateTimer -= delta;
                if (this.stateTimer <= 0) {
                    this.decideNextMove();
                }
                // Ensure stopped
                if (this.sprite.body.speed > 0) {
                    this.sprite.setVelocity(0);
                    this.updateAnimation(0, 0);
                }
                break;

            case NPCState.MOVING:
                this.followPath();
                // STEP 3: Draw path debug if enabled (F5 toggle)
                if (this.scene.pathDebugActive) {
                    this.drawDebugPath();
                } else if (this.scene.pathDebugGraphics) {
                    this.scene.pathDebugGraphics.clear();
                }
                break;
        }
    }

    drawDebugPath() {
        // STEP 3: Enhanced path debug with markers
        if (!this.activePath || this.activePath.length === 0) return;
        
        // Use scene's path debug graphics if available, otherwise create one
        if (!this.scene.pathDebugGraphics) {
            this.scene.pathDebugGraphics = this.scene.add.graphics();
            this.scene.pathDebugGraphics.setDepth(10000);
            this.scene.pathDebugGraphics.setScrollFactor(1);
        }
        
        const graphics = this.scene.pathDebugGraphics;
        graphics.clear();
        
        // Draw path lines
        graphics.lineStyle(2, 0x00ff00, 0.8);
        for (let i = this.currentPathIndex; i < this.activePath.length - 1; i++) {
            const nodeA = this.activePath[i];
            const nodeB = this.activePath[i + 1];
            graphics.lineBetween(
                (nodeA.x + 0.5) * this.tileSize, (nodeA.y + 0.5) * this.tileSize,
                (nodeB.x + 0.5) * this.tileSize, (nodeB.y + 0.5) * this.tileSize
            );
        }
        
        // Draw path markers (circles at each waypoint)
        graphics.fillStyle(0x00ff00, 0.6);
        for (let i = this.currentPathIndex; i < this.activePath.length; i++) {
            const node = this.activePath[i];
            graphics.fillCircle(
                (node.x + 0.5) * this.tileSize,
                (node.y + 0.5) * this.tileSize,
                4
            );
        }
        
        // Highlight current target
        if (this.currentPathIndex < this.activePath.length) {
            const currentNode = this.activePath[this.currentPathIndex];
            graphics.fillStyle(0xffff00, 0.8);
            graphics.fillCircle(
                (currentNode.x + 0.5) * this.tileSize,
                (currentNode.y + 0.5) * this.tileSize,
                6
            );
        }
    }

    enterPause(duration) {
        this.state = NPCState.PAUSE;
        this.stateTimer = duration || Phaser.Math.Between(this.minPauseMs, this.maxPauseMs);
        this.sprite.setVelocity(0);
        this.updateAnimation(0, 0); // Idle anim
    }

    decideNextMove() {
        // 5% chance to stay paused longer, 95% chance to wander
        if (Math.random() < 0.05) {
            this.enterPause(Phaser.Math.Between(500, 1500));
            return;
        }

        // Pick random REACHABLE destination within radius
        // Try up to 10 random points to find a reachable one
        let targetX, targetY;
        let foundReachable = false;
        
        for (let attempt = 0; attempt < 10; attempt++) {
            // Pick random point in radius
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * this.wanderRadius;
            targetX = this.homeX + Math.cos(angle) * dist;
            targetY = this.homeY + Math.sin(angle) * dist;
            
            // Check if destination is reachable (has valid path)
            if (this.astar) {
                const startTx = Math.floor(this.sprite.x / this.tileSize);
                const startTy = Math.floor(this.sprite.y / this.tileSize);
                const targetTx = Math.floor(targetX / this.tileSize);
                const targetTy = Math.floor(targetY / this.tileSize);
                
                // Quick validation: check if target tile is blocked
                if (targetTx >= 0 && targetTy >= 0 && targetTx < this.astar.mapW && targetTy < this.astar.mapH) {
                    const targetIdx = targetTy * this.astar.mapW + targetTx;
                    if (this.astar.blocked && targetIdx >= 0 && targetIdx < this.astar.blocked.length && this.astar.blocked[targetIdx] === 0) {
                        // Try to find path (quick check - limit iterations)
                        const path = this.astar.findPath(startTx, startTy, targetTx, targetTy, 1000);
                        if (path && path.length > 0) {
                            foundReachable = true;
                            break;
                        }
                    }
                }
            } else {
                // No A* - just use the random point
                foundReachable = true;
                break;
            }
        }
        
        if (foundReachable) {
            this.calculatePath(targetX, targetY);
        } else {
            // Fallback: stay paused if no reachable destination found
            this.enterPause(Phaser.Math.Between(1000, 2000));
        }
    }

    calculatePath(targetX, targetY) {
        // Convert to tiles
        const startTx = Math.floor(this.sprite.x / this.tileSize);
        const startTy = Math.floor(this.sprite.y / this.tileSize);
        const targetTx = Math.floor(targetX / this.tileSize);
        const targetTy = Math.floor(targetY / this.tileSize);

        if (!this.astar) {
            // Fallback if no A*
            this.state = NPCState.IDLE;
            return;
        }

        const path = this.astar.findPath(startTx, startTy, targetTx, targetTy);

        if (path && path.length > 0) {
            this.activePath = path;
            this.currentPathIndex = 0;
            // Skip start node if we are already there
            if (path.length > 1) {
                const nextNode = path[1];
                const d = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, (nextNode.x + 0.5) * 32, (nextNode.y + 0.5) * 32);
                if (d < 16) this.currentPathIndex = 1;
            }
            this.state = NPCState.MOVING;
            this.isStuck = false;
        } else {
            // Path failed
            this.enterPause(500);
        }
    }

    followPath() {
        if (this.currentPathIndex >= this.activePath.length) {
            this.enterPause();
            return;
        }

        const node = this.activePath[this.currentPathIndex];
        const targetX = (node.x + 0.5) * this.tileSize; // Center of tile
        const targetY = (node.y + 0.5) * this.tileSize;

        const dx = targetX - this.sprite.x;
        const dy = targetY - this.sprite.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 4) { // Reached node
            this.currentPathIndex++;
            return;
        }

        // Move
        const angle = Math.atan2(dy, dx);
        this.sprite.setVelocity(
            Math.cos(angle) * this.walkSpeed,
            Math.sin(angle) * this.walkSpeed
        );

        this.updateAnimation(this.sprite.body.velocity.x, this.sprite.body.velocity.y);
    }

    updateAnimation(vx, vy) {
        const key = this.sprite.texture.key;
        if (!key) return;

        // Determine direction
        let dir = this.lastDirection || 'down';

        if (Math.abs(vx) > Math.abs(vy)) {
            if (Math.abs(vx) > 0.1) dir = vx > 0 ? 'right' : 'left';
        } else {
            if (Math.abs(vy) > 0.1) dir = vy > 0 ? 'down' : 'up';
        }

        this.lastDirection = dir;
        const isMoving = Math.abs(vx) > 0.1 || Math.abs(vy) > 0.1;
        const animType = isMoving ? 'walk' : 'idle';
        const animKey = `${key}-${animType}-${dir}`;

        // ✅ Check existence on Scene Animation Manager, not sprite state
        if (this.scene.anims.exists(animKey)) {
            if (this.sprite.anims.currentAnim?.key !== animKey) {
                this.sprite.anims.play(animKey, true);
            }
        } else {
            // One-time warning (optional)
            this._missingAnimWarn ??= new Set();
            if (!this._missingAnimWarn.has(animKey)) {
                this._missingAnimWarn.add(animKey);
                console.warn(`[NPC ANIMS] Missing animation key: "${animKey}"`);
            }
        }
    }
}
