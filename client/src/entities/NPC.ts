import type { NPCData, DialogueNode } from '../data/npcs.js';

export class NPC extends Phaser.GameObjects.Sprite {
  public id: string;
  public name: string;
  public locationTag: string;
  public dialogueLines: DialogueNode[];
  public questHooks?: string[];
  public suspect: boolean;
  private nameplate: Phaser.GameObjects.Container | null = null;
  private nameText: Phaser.GameObjects.Text | null = null;
  private interactionZone: Phaser.GameObjects.Zone | null = null;
  private nearby: boolean = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    data: NPCData
  ) {
    super(scene, x, y, data.spriteKey);
    this.id = data.id;
    this.name = data.name;
    this.locationTag = data.locationTag;
    this.dialogueLines = data.dialogueLines;
    this.questHooks = data.questHooks;
    this.suspect = data.suspect;

    this.setOrigin(0.5);
    this.setDepth(100);

    const scale = 1.5;
    this.setScale(scale);

    this.setupPhysics();
    this.createNameplate();
    this.createInteractionZone();
    this.setupAnimations();
  }

  private setupPhysics(): void {
    if (!this.scene.physics) return;

    this.scene.physics.world.enable(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(30, 20);
    body.setOffset(17, 44);
    body.setCollideWorldBounds(true);
    body.setImmovable(true);
  }

  private createNameplate(): void {
    this.nameplate = this.scene.add.container(0, -50);

    const nameBg = this.scene.add.rectangle(
      0,
      0,
      this.name.length * 10 + 20,
      24,
      0x000000,
      0.8
    );
    nameBg.setStrokeStyle(1, 0xffffff);
    this.nameplate.add(nameBg);

    this.nameText = this.scene.add.text(
      0,
      0,
      this.name,
      {
        fontFamily: 'Courier New',
        fontSize: '12px',
        color: '#ffffff',
      }
    );
    this.nameText.setOrigin(0.5);
    this.nameplate.add(this.nameText);

    this.nameplate.setVisible(false);
    this.scene.add.existing(this.nameplate);
  }

  private createInteractionZone(): void {
    this.interactionZone = this.scene.add.zone(
      this.x,
      this.y,
      60,
      60
    );
    this.scene.physics.world.enable(this.interactionZone);
    const zoneBody = this.interactionZone.body as Phaser.Physics.Arcade.Body;
    zoneBody.setImmovable(true);

    const sceneAsAny = this.scene as any;
    if (sceneAsAny.interactables) {
      sceneAsAny.interactables.add(this.interactionZone);
    }
  }

  private setupAnimations(): void {
    const spriteKey = this.texture.key;

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

  public update(player: Phaser.Physics.Arcade.Sprite): void {
    const distance = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      player.x,
      player.y
    );

    const wasNearby = this.nearby;
    this.nearby = distance < 80;

    if (this.nameplate) {
      this.nameplate.setVisible(this.nearby);

      const playerDirection = this.getPlayerDirection(player);
      this.updateNameplatePosition(playerDirection);
    }

    if (this.nearby && !wasNearby) {
      const HUD = (window as any).HUD;
      if (HUD) {
        HUD.showNotification(`Press E to talk to ${this.name}`);
      }
    }
  }

  private getPlayerDirection(player: Phaser.Physics.Arcade.Sprite): string {
    const vx = player.body.velocity.x;
    const vy = player.body.velocity.y;

    if (Math.abs(vx) > Math.abs(vy)) {
      return vx > 0 ? 'right' : 'left';
    }
    return vy > 0 ? 'down' : 'up';
  }

  private updateNameplatePosition(direction: string): void {
    if (!this.nameplate) return;

    const offsets: Record<string, { x: number; y: number }> = {
      'down': { x: 0, y: -50 },
      'up': { x: 0, y: 50 },
      'left': { x: 60, y: 0 },
      'right': { x: -60, y: 0 },
    };

    const offset = offsets[direction] || offsets['down'];
    this.nameplate.setPosition(offset.x, offset.y);
  }

  public startDialogue(): DialogueNode | null {
    if (this.dialogueLines.length === 0) {
      return null;
    }

    const firstNode = this.dialogueLines[0];
    return firstNode;
  }

  public canInteract(): boolean {
    return this.nearby && this.dialogueLines.length > 0;
  }

  public isNearby(): boolean {
    return this.nearby;
  }

  public destroy(): void {
    if (this.interactionZone) {
      this.interactionZone.destroy();
    }

    if (this.nameplate) {
      this.nameplate.destroy();
    }

    super.destroy();
  }
}
