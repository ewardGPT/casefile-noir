/**
 * NPC Entity with Billboard Nameplate System
 * Renders dynamic nameplates that always face the camera
 */

export class NPC extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, data) {
    super(scene, x, y, data.spriteKey);

    this.id = data.id;
    this.name = data.name;
    this.locationTag = data.locationTag;
    this.dialogueLines = data.dialogueLines;
    this.questHooks = data.questHooks;
    this.suspect = data.suspect;

    this.setOrigin(0.5);
    this.setDepth(100);

    // MANDATORY FIX: NPC Scale Lock - Hard-code scale to 2.0 to match detective
    // Detective: frameH=64, normalized via normalizeCharacterSprite to tileH * 1.75
    // For tileH=32: TARGET_H = 32 * 1.75 = 56px, scale = 56/64 = 0.875, displayH = 64 * 0.875 = 56px
    // BUT: normalizeCharacterSprite may apply different scale, so we need to match the RESULT
    // NPC Scale Lock: Hard-code 2.0 scale (64px frame * 2.0 = 128px display height)
    // This will be overridden by normalizeCharacterSprite, but we'll force-match after
    const MANDATORY_NPC_SCALE = 2.0;
    this.setScale(MANDATORY_NPC_SCALE);
    
    // Store flag to prevent normalizeCharacterSprite from overriding
    this._scaleLocked = true;
    this._targetScale = MANDATORY_NPC_SCALE;
    
    // VERIFICATION: Calculate displayHeight
    const npcFrameH = 64; // NPC frames are 64x64 (matching detective)
    const npcDisplayH = npcFrameH * MANDATORY_NPC_SCALE; // 128px
    console.log(`[NPC Scale Lock] ${data.name || data.id}: scale=${MANDATORY_NPC_SCALE}, frameH=${npcFrameH}, displayH=${npcDisplayH}px`);

    this.setupPhysics();
    this.createBillboardNameplate();
    this.createInteractionZone();
    this.setupAnimations();
  }

  /**
   * Setup physics body for NPC
   */
  setupPhysics() {
    if (!this.scene.physics) return;

    this.scene.physics.world.enable(this);
    const body = this.body;
    body.setSize(30, 20);
    body.setOffset(17, 44);
    body.setCollideWorldBounds(true);
    body.setImmovable(true);
  }

  /**
   * Create billboard-style nameplate that always faces camera
   * High-contrast font with drop shadow for visibility
   */
  createBillboardNameplate() {
    // Nameplate container for grouping elements
    // Position 10px above normalized sprite head (normalized height + 10px offset)
    // Since sprite origin is at bottom (0.5, 1.0), we offset by displayHeight + 10px
    const nameplateYOffset = -(this.displayHeight || 70) - 10;
    this.nameplate = this.scene.add.container(0, nameplateYOffset);

    // Background: Semi-transparent black with white border for high contrast
    const nameBg = this.scene.add.rectangle(
      0,
      0,
      this.name.length * 9 + 24,
      28,
      0x000000,
      0.85
    );
    nameBg.setStrokeStyle(2, 0xffffff);
    this.nameplate.add(nameBg);

    // Text: High-contrast white with drop shadow
    // Drop shadow effect using shadow offset and blur
    const shadowText = this.scene.add.text(
      0,
      0,
      this.name,
      {
        fontFamily: 'Courier New',
        fontSize: '14px',
        color: '#000000',
        fontStyle: 'bold',
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#000000',
          blur: 4,
          stroke: true,
          fill: true
        }
      }
    );
    shadowText.setOrigin(0.5);
    this.nameplate.add(shadowText);

    // Main text: White with shadow
    const nameText = this.scene.add.text(
      0,
      0,
      this.name,
      {
        fontFamily: 'Courier New',
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
        shadow: {
          offsetX: 1,
          offsetY: 1,
          color: '#000000',
          blur: 2,
          stroke: false,
          fill: false
        }
      }
    );
    nameText.setOrigin(0.5);
    this.nameplate.add(nameText);
    this.nameText = nameText;

    // Store background and text for styling updates
    this.nameBg = nameBg;

    // Initially hidden
    this.nameplate.setVisible(false);
    this.nameplate.setAlpha(0);
    this.nameplate.setScrollFactor(1); // Follow camera scroll (world-space)
    this.scene.add.existing(this.nameplate);
  }

  /**
   * Create interaction zone for player proximity detection
   */
  createInteractionZone() {
    this.interactionZone = this.scene.add.zone(
      this.x,
      this.y,
      60,
      60
    );
    this.scene.physics.world.enable(this.interactionZone);
    const zoneBody = this.interactionZone.body;
    zoneBody.setImmovable(true);

    const sceneAsAny = this.scene;
    if (sceneAsAny.interactables) {
      sceneAsAny.interactables.add(this.interactionZone);
    }
  }

  /**
   * Setup idle and walk animations for all directions
   */
  setupAnimations() {
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

  /**
   * Update NPC logic each frame
   * Handles billboard rotation, visibility, and proximity checks
   */
  update(player) {
    const distance = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      player.x,
      player.y
    );

    const wasNearby = this.nearby;
    this.nearby = distance < 80;

    // Update nameplate visibility with fade effect
    if (this.nameplate) {
      if (this.nearby) {
        // Fade in
        this.nameplate.setAlpha(Phaser.Math.Clamp(this.nameplate.alpha + 0.1, 0, 1));
        this.nameplate.setVisible(true);
      } else {
        // Fade out
        this.nameplate.setAlpha(Phaser.Math.Clamp(this.nameplate.alpha - 0.1, 0, 1));
        if (this.nameplate.alpha <= 0.05) {
          this.nameplate.setVisible(false);
        }
      }

      // Billboard rotation: Face the camera
      this.updateBillboardRotation();

      // Update nameplate position to follow NPC
      this.nameplate.setPosition(this.x, this.y);
    }

    // Show notification when player enters interaction range
    if (this.nearby && !wasNearby) {
      const HUD = window.HUD;
      if (HUD) {
        HUD.showNotification(`Press E to talk to ${this.name}`);
      }
    }
  }

  /**
   * Billboard Logic: Rotate nameplate to always face the camera
   * This ensures text remains readable from any camera angle
   */
  updateBillboardRotation() {
    if (!this.nameplate) return;

    const camera = this.scene.cameras.main;

    // Get camera rotation
    const cameraRotation = camera.rotation;

    // Apply inverse camera rotation to nameplate (billboard effect)
    // This makes the nameplate always face the camera
    this.nameplate.setRotation(-cameraRotation);
  }

  /**
   * Get the first dialogue node for this NPC
   */
  startDialogue() {
    if (this.dialogueLines.length === 0) {
      return null;
    }

    const firstNode = this.dialogueLines[0];
    return firstNode;
  }

  /**
   * Check if player can interact with this NPC
   */
  canInteract() {
    return this.nearby && this.dialogueLines.length > 0;
  }

  /**
   * Check if player is nearby
   */
  isNearby() {
    return this.nearby;
  }

  /**
   * Update nameplate text (for dynamic name changes)
   */
  updateName(newName) {
    this.name = newName;

    if (this.nameText) {
      this.nameText.setText(newName);

      // Update background width to match new text
      if (this.nameBg) {
        this.nameBg.width = newName.length * 9 + 24;
      }
    }
  }

  /**
   * Clean up resources when NPC is destroyed
   */
  destroy() {
    if (this.interactionZone) {
      this.interactionZone.destroy();
    }

    if (this.nameplate) {
      this.nameplate.destroy();
    }

    super.destroy();
  }
}

export default NPC;
