import type { Suspect, Clue } from '../systems/GameState.js';

export class SuspectBoardUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private visible: boolean = false;
  private currentPage: number = 0;
  private suspectsPerPage: number = 4;
  private selectedSuspect: Suspect | null = null;
  private mostSuspiciousId: string | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createUI();
    this.setupInputs();
  }

  private createUI(): void {
    const width = 700;
    const height = 550;
    const x = (this.scene.scale.width - width) / 2;
    const y = (this.scene.scale.height - height) / 2;

    this.container = this.scene.add.container(x, y);
    this.container.setDepth(2600);

    const background = this.scene.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x2d2618
    );
    background.setStrokeStyle(3, 0xb4945a);
    this.container.add(background);

    const title = this.scene.add.text(
      width / 2,
      35,
      'SUSPECT BOARD',
      {
        fontFamily: 'Courier New',
        fontSize: '28px',
        color: '#e4cf9b',
        fontStyle: 'bold',
      }
    );
    title.setOrigin(0.5);
    this.container.add(title);

    const subtitle = this.scene.add.text(
      width / 2,
      65,
      'Collect 3+ clues to enable accusation',
      {
        fontFamily: 'Courier New',
        fontSize: '12px',
        color: '#f44336',
      }
    );
    subtitle.setOrigin(0.5);
    this.container.add(subtitle);

    this.mostSuspiciousId = this.calculateMostSuspiciousSuspect();
    this.createSuspectCards();
    this.createNavigationButtons();
    this.createCloseButton();

    this.container.setVisible(false);
  }

  private createSuspectCards(): void {
    const ClueManager = (window as any).ClueManager;

    const suspects = window.gameState?.getAllSuspects() || [];
    const startIndex = this.currentPage * this.suspectsPerPage;
    const pageSuspects = suspects.slice(startIndex, startIndex + this.suspectsPerPage);

    const cardWidth = 300;
    const cardHeight = 150;
    const startX = 40;
    const startY = 100;
    const spacingX = 340;
    const spacingY = 170;

    pageSuspects.forEach((suspect, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = startX + col * spacingX;
      const y = startY + row * spacingY;

      const isMostSuspicious = suspect.id === this.mostSuspiciousId;
      const borderColor = isMostSuspicious ? 0xff0000 : 0x6f5a34;
      const borderWidth = isMostSuspicious ? 4 : 2;

      const cardBg = this.scene.add.rectangle(
        x + cardWidth / 2,
        y + cardHeight / 2,
        cardWidth,
        cardHeight,
        0x1f1b14
      );
      cardBg.setStrokeStyle(borderWidth, borderColor);
      cardBg.setInteractive({ useHandCursor: true });

      const portraitX = x + 20;
      const portraitY = y + 20;
      const portraitSize = 60;

      let portraitKey = suspect.portraitKey;
      if (!this.scene.textures.exists(portraitKey)) {
        portraitKey = 'detective';
      }

      const portrait = this.scene.add.image(
        portraitX + portraitSize / 2,
        portraitY + portraitSize / 2,
        portraitKey
      );
      portrait.setDisplaySize(portraitSize, portraitSize);
      this.container.add(portrait);

      const nameText = this.scene.add.text(
        x + 90,
        y + 20,
        suspect.name,
        {
          fontFamily: 'Courier New',
          fontSize: '16px',
          color: '#e4cf9b',
          fontStyle: 'bold',
        }
      );
      this.container.add(nameText);

      const clueCount = ClueManager?.getClueCountForSuspect(suspect.id) || 0;
      const clueText = this.scene.add.text(
        x + 90,
        y + 45,
        `Clues: ${clueCount}/3`,
        {
          fontFamily: 'Courier New',
          fontSize: '12px',
          color: clueCount >= 3 ? '#00ff00' : '#ff4444',
        }
      );
      this.container.add(clueText);

      const canAccuse = clueCount >= 3;
      const accuseBtn = this.scene.add.text(
        x + 90,
        y + 100,
        canAccuse ? '[ACCUSE]' : 'LOCKED',
        {
          fontFamily: 'Courier New',
          fontSize: '14px',
          color: canAccuse ? '#f44336' : '#666666',
          backgroundColor: canAccuse ? '#330000' : '#222222',
          padding: { x: 10, y: 5 },
        }
      );
      accuseBtn.setOrigin(0, 0.5);

      if (canAccuse) {
        accuseBtn.setInteractive({ useHandCursor: true });

        accuseBtn.on('pointerdown', () => {
          this.showAccusationDialog(suspect);
        });

        cardBg.on('pointerdown', () => {
          this.showAccusationDialog(suspect);
        });
      }

      this.container.add(accuseBtn);

      if (isMostSuspicious) {
        const badge = this.scene.add.text(
          x + 10,
          y + 10,
          '⚠️ MOST SUSPICIOUS',
          {
            fontFamily: 'Courier New',
            fontSize: '10px',
            color: '#ff0000',
            fontStyle: 'bold',
            backgroundColor: '#330000',
            padding: { x: 4, y: 2 },
          }
        );
        badge.setOrigin(0, 0);
        this.container.add(badge);
      }

      this.container.add(cardBg);
    });
  }

  private showAccusationDialog(suspect: Suspect): void {
    const width = 400;
    const height = 200;
    const x = (this.scene.scale.width - width) / 2;
    const y = (this.scene.scale.height - height) / 2;

    const dialogBg = this.scene.add.rectangle(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      this.scene.scale.width,
      this.scene.scale.height,
      0x000000,
      0.8
    );
    dialogBg.setDepth(2700);

    const dialogBox = this.scene.add.container(x, y);
    dialogBox.setDepth(2701);

    const boxBg = this.scene.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x1a1a1a
    );
    boxBg.setStrokeStyle(2, 0xf44336);
    dialogBox.add(boxBg);

    const warningText = this.scene.add.text(
      width / 2,
      30,
      'FINAL ACCUSATION',
      {
        fontFamily: 'Courier New',
        fontSize: '18px',
        color: '#f44336',
        fontStyle: 'bold',
      }
    );
    warningText.setOrigin(0.5);
    dialogBox.add(warningText);

    const confirmText = this.scene.add.text(
      width / 2,
      80,
      `Accuse ${suspect.name}?`,
      {
        fontFamily: 'Courier New',
        fontSize: '16px',
        color: '#f5f1e5',
      }
    );
    confirmText.setOrigin(0.5);
    dialogBox.add(confirmText);

    const confirmBtn = this.scene.add.text(
      100,
      140,
      '[Y]ES',
      {
        fontFamily: 'Courier New',
        fontSize: '14px',
        color: '#00ff00',
        backgroundColor: '#002200',
        padding: { x: 15, y: 5 },
      }
    );
    confirmBtn.setOrigin(0.5);
    confirmBtn.setInteractive({ useHandCursor: true });
    dialogBox.add(confirmBtn);

    const cancelBtn = this.scene.add.text(
      300,
      140,
      '[N]O',
      {
        fontFamily: 'Courier New',
        fontSize: '14px',
        color: '#ff4444',
        backgroundColor: '#220000',
        padding: { x: 15, y: 5 },
      }
    );
    cancelBtn.setOrigin(0.5);
    cancelBtn.setInteractive({ useHandCursor: true });
    dialogBox.add(cancelBtn);

    const cleanup = () => {
      dialogBg.destroy();
      dialogBox.destroy();
      this.scene.input.keyboard.off('keydown-Y');
      this.scene.input.keyboard.off('keydown-N');
    };

    const onConfirm = () => {
      cleanup();
      this.accuseSuspect(suspect);
    };

    confirmBtn.on('pointerdown', onConfirm);
    cancelBtn.on('pointerdown', cleanup);

    this.scene.input.keyboard.once('keydown-Y', onConfirm);
    this.scene.input.keyboard.once('keydown-N', cleanup);

    this.container.add(dialogBg);
  }

  private accuseSuspect(suspect: Suspect): void {
    window.gameState?.addSuspectStatement(
      suspect.id,
      `ACCUSED by Detective Clarke`,
      'Detective'
    );

    window.gameState?.addToTimeline(`ACCUSED: ${suspect.name}`);

    const AccusationSystem = (window as any).AccusationSystem;
    if (AccusationSystem) {
      AccusationSystem.triggerAccusation(suspect.id);
    }

    this.hide();
  }

  private createNavigationButtons(): void {
    const prevBtn = this.scene.add.text(
      50,
      500,
      '← PREV',
      {
        fontFamily: 'Courier New',
        fontSize: '14px',
        color: '#b4945a',
      }
    );
    prevBtn.setInteractive({ useHandCursor: true });
    prevBtn.on('pointerdown', () => this.previousPage());
    this.container.add(prevBtn);

    const nextBtn = this.scene.add.text(
      600,
      500,
      'NEXT →',
      {
        fontFamily: 'Courier New',
        fontSize: '14px',
        color: '#b4945a',
      }
    );
    nextBtn.setInteractive({ useHandCursor: true });
    nextBtn.on('pointerdown', () => this.nextPage());
    this.container.add(nextBtn);
  }

  private previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.refreshCards();
    }
  }

  private nextPage(): void {
    const suspects = window.gameState?.getAllSuspects() || [];
    const maxPage = Math.ceil(suspects.length / this.suspectsPerPage) - 1;

    if (this.currentPage < maxPage) {
      this.currentPage++;
      this.refreshCards();
    }
  }

  private refreshCards(): void {
    const suspectCards = this.container.list.filter(
      obj => obj instanceof Phaser.GameObjects.Rectangle &&
        obj.x >= 40 && obj.x <= 640 &&
        obj.y >= 100 && obj.y <= 400
    );

    suspectCards.forEach(card => card.destroy());

    this.mostSuspiciousId = this.calculateMostSuspiciousSuspect();
    this.createSuspectCards();
  }

  private calculateMostSuspiciousSuspect(): string | null {
    const ClueManager = (window as any).ClueManager;
    if (!ClueManager) return null;

    const suspects = window.gameState?.getAllSuspects() || [];
    if (suspects.length === 0) return null;

    let maxClues = 0;
    let mostSuspicious = '';

    suspects.forEach(suspect => {
      const clueCount = ClueManager.getClueCountForSuspect(suspect.id);
      if (clueCount > maxClues) {
        maxClues = clueCount;
        mostSuspicious = suspect.id;
      }
    });

    return maxClues > 0 ? mostSuspicious : null;
  }

  private createCloseButton(): void {
    const closeButton = this.scene.add.text(
      680,
      10,
      'X',
      {
        fontFamily: 'Courier New',
        fontSize: '18px',
        color: '#f44336',
        fontStyle: 'bold',
      }
    );
    closeButton.setOrigin(1, 0);
    closeButton.setInteractive({ useHandCursor: true });

    closeButton.on('pointerdown', () => this.hide());

    this.container.add(closeButton);
  }

  private setupInputs(): void {
    const toggleHandler = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        event.preventDefault();
        this.toggle();
      }
    };

    window.addEventListener('keydown', toggleHandler);
    (this.container as any).toggleHandler = toggleHandler;
  }

  public show(): void {
    this.currentPage = 0;
    this.container.setVisible(true);
    this.visible = true;
    this.createSuspectCards();
  }

  public hide(): void {
    this.container.setVisible(false);
    this.visible = false;
  }

  public toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  public isVisible(): boolean {
    return this.visible;
  }

  public destroy(): void {
    if ((this.container as any)?.toggleHandler) {
      window.removeEventListener('keydown', (this.container as any).toggleHandler);
    }
    this.container.destroy();
  }
}
