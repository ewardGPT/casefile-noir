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
                break;
        }
    }

    enterPause(duration) {
        this.state = NPCState.PAUSE;
        this.stateTimer = duration || Phaser.Math.Between(this.minPauseMs, this.maxPauseMs);
        this.sprite.setVelocity(0);
        this.updateAnimation(0, 0); // Idle anim
    }

    decideNextMove() {
        // 80% chance to wander, 20% wait more
        if (Math.random() < 0.2) {
            this.enterPause();
            return;
        }

        // Pick random point in radius
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * this.wanderRadius;
        const targetX = this.homeX + Math.cos(angle) * dist;
        const targetY = this.homeY + Math.sin(angle) * dist;

        this.calculatePath(targetX, targetY);
    }

    calculatePath(targetX, targetY) {
        // Convert to tiles
        const startTx = Math.floor(this.sprite.x / 32);
        const startTy = Math.floor(this.sprite.y / 32);
        const targetTx = Math.floor(targetX / 32);
        const targetTy = Math.floor(targetY / 32);

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
        const targetX = (node.x + 0.5) * 32; // Center of tile
        const targetY = (node.y + 0.5) * 32;

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

        if (this.sprite.anims && this.sprite.anims.exists(animKey)) {
            this.sprite.anims.play(animKey, true);
        }
    }
}
