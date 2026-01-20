import type { Suspect } from '../systems/GameState.js';

export interface AccusationResult {
  success: boolean;
  message: string;
  endingType: 'GOOD' | 'BAD' | 'NEUTRAL';
}

export class AccusationSystem {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public triggerAccusation(suspectId: string): void {
    const gameState = window.gameState?.getState();
    const clues = window.gameState?.getCluesForSuspect(suspectId) || [];

    const suspect = window.gameState?.getSuspect(suspectId);

    if (!suspect) return;

    const result = this.evaluateAccusation(suspectId, clues.length);
    this.playCutscene(suspect, result);
  }

  private evaluateAccusation(suspectId: string, clueCount: number): AccusationResult {
    const trueKiller = 'aaron_kosminski';

    if (suspectId === trueKiller) {
      const requiredClues = 5;
      if (clueCount < requiredClues) {
        return {
          success: false,
          message: 'You accused the right person, but without sufficient evidence.',
          endingType: 'BAD',
        };
      }

      return {
        success: true,
        message: 'Justice is served. Aaron Kosminski is apprehended.',
        endingType: 'GOOD',
      };
    }

    if (suspectId === 'headmaster_whitcombe') {
      const hasLedger = window.gameState?.hasInventoryItem('clue_ledger');
      const hasWhitcombeEvidence = window.gameState?.getClueCountForSuspect(suspectId) >= 3;

      if (hasLedger && hasWhitcombeEvidence) {
        return {
          success: false,
          message: 'Whitcombe is guilty of blackmail, but not of murder.',
          endingType: 'NEUTRAL',
        };
      }

      return {
        success: false,
        message: 'You accused Whitcombe without sufficient evidence. A costly mistake.',
        endingType: 'BAD',
      };
    }

    return {
      success: false,
      message: `You accused an innocent person. The real killer escapes.`,
      endingType: 'BAD',
    };
  }

  private playCutscene(suspect: Suspect, result: AccusationResult): void {
    this.scene.time.delayedCall(500, () => {
      this.screenShake();
    });

    this.scene.time.delayedCall(2000, () => {
      this.showVignette();
    });

    this.scene.time.delayedCall(3000, () => {
      this.showAccusationDialog(suspect, result);
    });
  }

  private screenShake(): void {
    const duration = 1000;
    const intensity = 20;

    this.scene.cameras.main.shake(intensity, duration);

    const flashOverlay = this.scene.add.rectangle(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      this.scene.scale.width,
      this.scene.scale.height,
      0xff0000,
      0.3
    );
    flashOverlay.setDepth(4000);

    this.scene.tweens.add({
      targets: flashOverlay,
      alpha: 0,
      duration: 500,
      delay: 500,
      ease: 'Power2',
      onComplete: () => flashOverlay.destroy(),
    });
  }

  private showVignette(): void {
    const vignette = this.scene.add.graphics();
    vignette.setDepth(3900);

    const radius = Math.max(this.scene.scale.width, this.scene.scale.height) / 2;
    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height / 2;

    vignette.fillStyle(0, 0, 0, 0.85, 0.85, 0.85, 0);
    vignette.fillRect(0, 0, this.scene.scale.width, this.scene.scale.height);

    vignette.fillStyle(0x000000, 0);
    vignette.fillCircle(centerX, centerY, radius, 0);
    vignette.fillCircle(centerX, centerY, radius * 0.5);

    this.scene.add.existing(vignette);

    this.scene.time.delayedCall(1000, () => vignette.destroy());
  }

  private showAccusationDialog(suspect: Suspect, result: AccusationResult): void {
    const width = 600;
    const height = 400;
    const x = (this.scene.scale.width - width) / 2;
    const y = (this.scene.scale.height - height) / 2;

    this.container = this.scene.add.container(x, y);
    this.container.setDepth(4100);

    // Initial state for animations (fade-in + scale)
    this.container.setAlpha(0);
    this.container.setScale(0.8);

    // Add ease-out scale and fade-in transitions (500ms duration)
    this.scene.tweens.add({
      targets: this.container,
      alpha: { from: 0, to: 1 },
      scaleX: { from: 0.8, to: 1 },
      scaleY: { from: 0.8, to: 1 },
      duration: 500,
      ease: 'Power2'
    });

    const bg = this.scene.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      result.endingType === 'GOOD' ? 0x1a2e1a : 0x1a1a1a
    );
    bg.setStrokeStyle(4, result.endingType === 'GOOD' ? 0x00ff00 : 0xff0000);
    this.container.add(bg);

    let title = '';
    let color = '';

    switch (result.endingType) {
      case 'GOOD':
        title = 'CASE SOLVED';
        color = '#00ff00';
        break;
      case 'BAD':
        title = 'FAILURE';
        color = '#ff0000';
        break;
      case 'NEUTRAL':
        title = 'PARTIAL JUSTICE';
        color = '#ffaa00';
        break;
    }

    const titleText = this.scene.add.text(
      width / 2,
      50,
      title,
      {
        fontFamily: 'Courier New',
        fontSize: '32px',
        color: color,
        fontStyle: 'bold',
      }
    );
    titleText.setOrigin(0.5);
    this.container.add(titleText);

    const accuseText = this.scene.add.text(
      width / 2,
      120,
      `You accused ${suspect.name}`,
      {
        fontFamily: 'Courier New',
        fontSize: '20px',
        color: '#ffffff',
      }
    );
    accuseText.setOrigin(0.5);
    this.container.add(accuseText);

    const resultText = this.scene.add.text(
      width / 2,
      180,
      result.message,
      {
        fontFamily: 'Courier New',
        fontSize: '16px',
        color: '#f5f1e5',
        wordWrap: { width: width - 60, useAdvancedWrap: true },
        lineSpacing: 8,
      }
    );
    resultText.setOrigin(0.5);
    this.container.add(resultText);

    const restartBtn = this.scene.add.text(
      width / 2,
      340,
      '[Press R to restart investigation]',
      {
        fontFamily: 'Courier New',
        fontSize: '16px',
        color: '#e4cf9b',
        backgroundColor: '#000000',
        padding: { x: 15, y: 8 },
      }
    );
    restartBtn.setOrigin(0.5);
    restartBtn.setInteractive({ useHandCursor: true });

    const onRestart = () => {
      this.restartGame();
    };

    restartBtn.on('pointerdown', onRestart);
    this.scene.input.keyboard.once('keydown-R', onRestart);

    this.container.add(restartBtn);

    // Add fade-in animation (500ms duration for professional "snappy" feel)
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 500,
      ease: 'Power2'
    });

    // Add scale animation (Ease-Out for smooth entrance)
    this.scene.tweens.add({
      targets: this.container,
      scale: 1,
      duration: 600,
      ease: 'Back.easeOut'
    });

    // Play victory/failure sound based on ending type
    if (this.scene.sound) {
      try {
        if (result.endingType === 'GOOD') {
          this.scene.sound.play('victory_fanfare', { volume: 0.7 });
        } else if (result.endingType === 'BAD') {
          this.scene.sound.play('failure_sound', { volume: 0.7 });
        }
      } catch (e) {
        // Fallback: sound files may not exist, continue silently
      }
    }
  }

  private restartGame(): void {
    window.gameState?.reset();
    this.scene.scene.restart();
  }

  public destroy(): void {
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
  }
}
