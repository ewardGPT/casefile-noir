import type { PlayerStats, InventoryItem } from '../systems/GameState.js';

export class InventoryUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Rectangle;
  private portraitImage: Phaser.GameObjects.Image;
  private statBars: Map<keyof PlayerStats, Phaser.GameObjects.Graphics> = new Map();
  private inventoryList: Phaser.GameObjects.Container;
  private visible: boolean = false;
  private page: number = 0;
  private itemsPerPage: number = 6;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createUI();
    this.setupInputs();
  }

  private createUI(): void {
    const width = 600;
    const height = 500;
    const x = (this.scene.scale.width - width) / 2;
    const y = (this.scene.scale.height - height) / 2;

    this.container = this.scene.add.container(x, y);
    this.container.setDepth(2500);

    this.background = this.scene.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x1f1b14
    );
    this.background.setStrokeStyle(3, 0xb4945a);
    this.container.add(this.background);

    const title = this.scene.add.text(
      width / 2,
      30,
      'INVENTORY & STATS',
      {
        fontFamily: 'Courier New',
        fontSize: '24px',
        color: '#e4cf9b',
        fontStyle: 'bold',
      }
    );
    title.setOrigin(0.5);
    this.container.add(title);

    this.createPortrait();
    this.createStatBars();
    this.createInventoryList();
    this.createCloseButton();

    this.container.setVisible(false);
  }

  private createPortrait(): void {
    const portraitSize = 120;
    const portraitX = 50;
    const portraitY = 80;

    this.portraitImage = this.scene.add.image(
      portraitX + portraitSize / 2,
      portraitY + portraitSize / 2,
      'detective'
    );
    this.portraitImage.setDisplaySize(portraitSize, portraitSize);
    this.container.add(this.portraitImage);

    const portraitBorder = this.scene.add.rectangle(
      portraitX + portraitSize / 2,
      portraitY + portraitSize / 2,
      portraitSize + 4,
      portraitSize + 4,
      0x000000,
      0
    );
    portraitBorder.setStrokeStyle(2, 0xb4945a);
    this.container.add(portraitBorder);

    const nameLabel = this.scene.add.text(
      portraitX + portraitSize / 2,
      portraitY + portraitSize + 15,
      'Edwin Clarke',
      {
        fontFamily: 'Courier New',
        fontSize: '16px',
        color: '#f5f1e5',
      }
    );
    nameLabel.setOrigin(0.5);
    this.container.add(nameLabel);
  }

  private createStatBars(): void {
    const startX = 220;
    const startY = 80;
    const barWidth = 300;
    const barHeight = 20;
    const spacing = 45;

    const stats: Array<{ key: keyof PlayerStats; label: string; color: number }> = [
      { key: 'observation', label: 'OBSERVATION', color: 0x00bcd4 },
      { key: 'logic', label: 'LOGIC', color: 0x9c27b0 },
      { key: 'charisma', label: 'CHARISMA', color: 0xffc107 },
      { key: 'intimidation', label: 'INTIMIDATION', color: 0xf44336 },
      { key: 'empathy', label: 'EMPATHY', color: 0x4caf50 },
    ];

    stats.forEach((stat, index) => {
      const y = startY + index * spacing;

      const label = this.scene.add.text(
        startX,
        y,
        stat.label,
        {
          fontFamily: 'Courier New',
          fontSize: '12px',
          color: '#b4945a',
        }
      );
      this.container.add(label);

      const barGraphics = this.scene.add.graphics();
      this.container.add(barGraphics);
      this.statBars.set(stat.key, barGraphics);

      const valueText = this.scene.add.text(
        startX + barWidth,
        y + barHeight / 2,
        '0/10',
        {
          fontFamily: 'Courier New',
          fontSize: '14px',
          color: '#f5f1e5',
        }
      );
      valueText.setOrigin(1, 0.5);
      this.container.add(valueText);

      const levelText = this.scene.add.text(
        startX + barWidth + 10,
        y + barHeight / 2,
        '',
        {
          fontFamily: 'Courier New',
          fontSize: '12px',
          color: '#00ff00',
        }
      );
      levelText.setOrigin(0, 0.5);
      this.container.add(levelText);
    });

    this.updateStatBars();
  }

  private updateStatBars(): void {
    const gameState = window.gameState?.getState();
    if (!gameState) return;

    const stats = gameState.playerStats;
    const startX = 220;
    const startY = 80;
    const barWidth = 300;
    const barHeight = 20;
    const spacing = 45;

    const statKeys: Array<keyof PlayerStats> = [
      'observation', 'logic', 'charisma', 'intimidation', 'empathy'
    ];

    statKeys.forEach((key, index) => {
      const graphics = this.statBars.get(key);
      if (!graphics) return;

      graphics.clear();

      const y = startY + index * spacing;
      const value = stats[key];

      let color = 0x00ff00;
      if (value >= 8) color = 0xffd700;
      if (value <= 2) color = 0xff4444;

      graphics.fillStyle(0x2d2618, 1);
      graphics.fillRect(startX, y, barWidth, barHeight);

      const fillWidth = (value / 10) * barWidth;
      graphics.fillStyle(color, 1);
      graphics.fillRect(startX, y, fillWidth, barHeight);

      graphics.lineStyle(1, 0x6f5a34, 1);
      graphics.strokeRect(startX, y, barWidth, barHeight);
    });
  }

  private createInventoryList(): void {
    this.inventoryList = this.scene.add.container(0, 320);

    const listBackground = this.scene.add.rectangle(
      300,
      0,
      500,
      150,
      0x262014
    );
    listBackground.setStrokeStyle(1, 0x6f5a34);
    this.inventoryList.add(listBackground);

    this.renderInventoryPage();

    this.container.add(this.inventoryList);
  }

  private renderInventoryPage(): void {
    const gameState = window.gameState?.getState();
    if (!gameState) return;

    const items = gameState.inventory;
    const startIndex = this.page * this.itemsPerPage;
    const pageItems = items.slice(startIndex, startIndex + this.itemsPerPage);

    pageItems.forEach((item, index) => {
      const y = 25 + index * 22;

      const itemText = this.scene.add.text(
        20,
        y,
        `[${item.type.toUpperCase()}] ${item.title}`,
        {
          fontFamily: 'Courier New',
          fontSize: '12px',
          color: '#f5f1e5',
        }
      );
      this.inventoryList.add(itemText);

      if (item.type === 'clue') {
        const analyzeBtn = this.scene.add.text(
          400,
          y,
          '[A]NALYZE',
          {
            fontFamily: 'Courier New',
            fontSize: '10px',
            color: '#e4cf9b',
          }
        );
        analyzeBtn.setOrigin(0, 0.5);
        analyzeBtn.setInteractive({ useHandCursor: true });

        analyzeBtn.on('pointerdown', () => {
          const ClueManager = (window as any).ClueManager;
          ClueManager?.analyzeClue(item.id);
          this.renderInventoryPage();
          this.updateStatBars();
        });

        this.inventoryList.add(analyzeBtn);
      }
    });

    const pageInfo = this.scene.add.text(
      300,
      140,
      `${this.page + 1} / ${Math.ceil(items.length / this.itemsPerPage) || 1}`,
      {
        fontFamily: 'Courier New',
        fontSize: '12px',
        color: '#b4945a',
      }
    );
    pageInfo.setOrigin(0.5);
    this.inventoryList.add(pageInfo);
  }

  private createCloseButton(): void {
    const closeButton = this.scene.add.text(
      580,
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
      if (event.key.toLowerCase() === 'i') {
        event.preventDefault();
        this.toggle();
      }
    };

    window.addEventListener('keydown', toggleHandler);
    (this.container as any).toggleHandler = toggleHandler;
  }

  public show(): void {
    this.container.setVisible(true);
    this.visible = true;
    this.updateStatBars();
    this.renderInventoryPage();
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
