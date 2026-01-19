export class LockpickPuzzle {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private visible: boolean = false;
  private userInput: string = '';
  private correctCode: string = 'DIAMOND';
  private onPuzzleComplete: () => void;
  private onPuzzleFailed: () => void;

  constructor(scene: Phaser.Scene, onComplete: () => void, onFailed: () => void) {
    this.scene = scene;
    this.onPuzzleComplete = onComplete;
    this.onPuzzleFailed = onFailed;
  }

  public show(): void {
    this.createUI();
    this.setupInputs();
    this.visible = true;
  }

  private createUI(): void {
    const width = 500;
    const height = 400;
    const x = (this.scene.scale.width - width) / 2;
    const y = (this.scene.scale.height - height) / 2;

    this.container = this.scene.add.container(x, y);
    this.container.setDepth(3000);

    const background = this.scene.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x1a1a1a
    );
    background.setStrokeStyle(3, 0xb4945a);
    this.container.add(background);

    const title = this.scene.add.text(
      width / 2,
      50,
      'LOCKED DOOR',
      {
        fontFamily: 'Courier New',
        fontSize: '24px',
        color: '#e4cf9b',
        fontStyle: 'bold',
      }
    );
    title.setOrigin(0.5);
    this.container.add(title);

    const subtitle = this.scene.add.text(
      width / 2,
      90,
      'Enter the passcode:',
      {
        fontFamily: 'Courier New',
        fontSize: '14px',
        color: '#f5f1e5',
      }
    );
    subtitle.setOrigin(0.5);
    this.container.add(subtitle);

    const hint = this.scene.add.text(
      width / 2,
      120,
      'The word on the scrap of paper you found...',
      {
        fontFamily: 'Courier New',
        fontSize: '12px',
        color: '#b4945a',
        fontStyle: 'italic',
      }
    );
    hint.setOrigin(0.5);
    this.container.add(hint);

    const inputBg = this.scene.add.rectangle(
      width / 2,
      170,
      300,
      40,
      0x2d2618
    );
    inputBg.setStrokeStyle(2, 0x6f5a34);
    this.container.add(inputBg);

    const inputText = this.scene.add.text(
      width / 2,
      170,
      this.userInput + '_',
      {
        fontFamily: 'Courier New',
        fontSize: '24px',
        color: '#00ff00',
      }
    );
    inputText.setOrigin(0.5);
    this.container.add(inputText);
    (this.container as any).inputText = inputText;

    const instructions = this.scene.add.text(
      width / 2,
      240,
      'Type to enter code\n[ENTER] to submit\n[ESC] to cancel',
      {
        fontFamily: 'Courier New',
        fontSize: '14px',
        color: '#666666',
        align: 'center',
        lineSpacing: 8,
      }
    );
    instructions.setOrigin(0.5);
    this.container.add(instructions);

    const lockedIcon = this.scene.add.text(
      width / 2,
      300,
      '🔒',
      {
        fontFamily: 'Courier New',
        fontSize: '48px',
      }
    );
    lockedIcon.setOrigin(0.5);
    (this.container as any).lockedIcon = lockedIcon;
    this.container.add(lockedIcon);

    this.container.setVisible(true);
  }

  private setupInputs(): void {
    const keyHandler = (event: KeyboardEvent) => {
      if (!this.visible) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        this.hide();
        this.onPuzzleFailed();
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        this.checkCode();
        return;
      }

      if (event.key === 'Backspace') {
        event.preventDefault();
        this.userInput = this.userInput.slice(0, -1);
        this.updateInputDisplay();
        return;
      }

      if (event.key.length === 1 && this.userInput.length < 10) {
        event.preventDefault();
        this.userInput += event.key.toUpperCase();
        this.updateInputDisplay();
      }
    };

    window.addEventListener('keydown', keyHandler);
    (this.container as any).keyHandler = keyHandler;
  }

  private updateInputDisplay(): void {
    const inputText = (this.container as any).inputText;
    if (inputText) {
      inputText.setText(this.userInput + '_');
    }
  }

  private checkCode(): void {
    if (this.userInput === this.correctCode) {
      this.onSuccess();
    } else {
      this.onFailure();
    }
  }

  private onSuccess(): void {
    this.playSuccessEffect();

    const HUD = (window as any).HUD;
    if (HUD) {
      HUD.showNotification('Door Unlocked! +1 Perception');
    }

    const gameState = window.gameState;
    if (gameState) {
      gameState.updateStat('observation', 1);
    }

    const ClueManager = (window as any).ClueManager;
    if (ClueManager) {
      ClueManager.addClueById('clue_bloody_cloth');
    }

    window.gameState?.addToTimeline('Unlocked Risky Passage door');

    setTimeout(() => {
      this.hide();
      this.onPuzzleComplete();
    }, 1500);
  }

  private onFailure(): void {
    this.playFailureEffect();
    this.userInput = '';
    this.updateInputDisplay();

    const HUD = (window as any).HUD;
    if (HUD) {
      HUD.showNotification('Incorrect code! Try again.');
    }
  }

  private playSuccessEffect(): void {
    const lockedIcon = (this.container as any).lockedIcon;
    if (lockedIcon) {
      lockedIcon.setText('🔓');
      lockedIcon.setColor('#00ff00');
    }

    this.scene.cameras.main.flash(500, 0, 255, 0);

    this.scene.tweens.add({
      targets: this.container,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 200,
      ease: 'Back.easeOut',
      yoyo: true,
    });
  }

  private playFailureEffect(): void {
    this.scene.cameras.main.shake(500, 20);

    const flashOverlay = this.scene.add.rectangle(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      this.scene.scale.width,
      this.scene.scale.height,
      0xff0000,
      0.3
    );
    flashOverlay.setDepth(3100);

    this.scene.tweens.add({
      targets: flashOverlay,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => flashOverlay.destroy(),
    });
  }

  public hide(): void {
    if ((this.container as any)?.keyHandler) {
      window.removeEventListener('keydown', (this.container as any).keyHandler);
    }
    this.container.destroy();
    this.visible = false;
    this.userInput = '';
  }

  public isVisible(): boolean {
    return this.visible;
  }

  public destroy(): void {
    this.hide();
  }
}
