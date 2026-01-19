import type { PlayerStats } from '../systems/GameState.js';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: any;
  private keySprint: Phaser.Input.Keyboard.Key;
  private speed: number = 160;
  private sprintMultiplier: number = 1.3;
  private lastDirection: string = 'down';
  private isMoving: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'detective');
    this.setOrigin(0.5);
    this.setDepth(99);
    this.setScale(1.5);
    this.setupPhysics();
    this.setupAnimations();
    this.setupInputs();
  }

  private setupPhysics(): void {
    this.scene.physics.world.enable(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(30, 20);
    body.setOffset(17, 44);
    body.setCollideWorldBounds(true);
    body.setMaxVelocity(this.speed * this.sprintMultiplier, this.speed * this.sprintMultiplier);
  }

  private setupAnimations(): void {
    const spriteKey = 'detective';
    const directions = ['down', 'left', 'right', 'up'];

    directions.forEach(dir => {
      const animKeyIdle = `${spriteKey}-idle-${dir}`;
      const animKeyWalk = `${spriteKey}-walk-${dir}`;

      if (!this.scene.anims.exists(animKeyIdle)) {
        this.scene.anims.create({
          key: animKeyIdle,
          frames: this.scene.anims.generateFrameNumbers(spriteKey, {
            start: 0,
            end: 0,
          }),
          frameRate: 1,
          repeat: -1,
        });
      }

      if (!this.scene.anims.exists(animKeyWalk)) {
        this.scene.anims.create({
          key: animKeyWalk,
          frames: this.scene.anims.generateFrameNumbers(spriteKey, {
            start: 1,
            end: 3,
          }),
          frameRate: 8,
          repeat: -1,
        });
      }
    });

    this.play(`${spriteKey}-idle-down`, true);
  }

  private setupInputs(): void {
    this.cursors = this.scene.input.keyboard.createCursorKeys();
    this.wasd = this.scene.input.keyboard.addKeys('W,A,S,D');
    this.keySprint = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
  }

  public update(): void {
    this.handleMovement();
    this.updateAnimations();
  }

  private handleMovement(): void {
    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;

    let vx = 0;
    let vy = 0;

    const currentSpeed = this.keySprint.isDown
      ? this.speed * this.sprintMultiplier
      : this.speed;

    if (left) vx = -currentSpeed;
    else if (right) vx = currentSpeed;

    if (up) vy = -currentSpeed;
    else if (down) vy = currentSpeed;

    this.setVelocity(vx, vy);

    this.isMoving = vx !== 0 || vy !== 0;
  }

  private updateAnimations(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const vx = body.velocity.x;
    const vy = body.velocity.y;

    let direction = this.lastDirection;

    if (Math.abs(vx) > Math.abs(vy)) {
      if (Math.abs(vx) > 10) {
        direction = vx > 0 ? 'right' : 'left';
      }
    } else {
      if (Math.abs(vy) > 10) {
        direction = vy > 0 ? 'down' : 'up';
      }
    }

    this.lastDirection = direction;

    const spriteKey = 'detective';
    const animType = this.isMoving ? 'walk' : 'idle';
    const animKey = `${spriteKey}-${animType}-${direction}`;

    if (this.scene.anims.exists(animKey)) {
      if (this.anims.currentAnim?.key !== animKey) {
        this.play(animKey, true);
      }
    } else {
      const fallbackKey = `${spriteKey}-idle-down`;
      if (this.scene.anims.exists(fallbackKey)) {
        this.play(fallbackKey, true);
      }
    }
  }

  public getDirection(): string {
    return this.lastDirection;
  }

  public isPlayerMoving(): boolean {
    return this.isMoving;
  }

  public getSpeed(): number {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const velocity = new Phaser.Math.Vector2(
      body.velocity.x,
      body.velocity.y
    );
    return velocity.length();
  }

  public destroy(): void {
    super.destroy();
  }
}
