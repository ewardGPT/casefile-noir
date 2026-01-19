import type { Clue, InventoryItem } from '../systems/GameState.js';

export interface NotebookEntry {
  id: string;
  type: 'clue' | 'dialogue' | 'kosminski_note';
  title: string;
  content: string;
  timestamp: number;
  npcName?: string;
}

export class NotebookSystem {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Rectangle;
  private visible: boolean = false;
  private activeTab: 'evidence' | 'dialogue' | 'kosminski' = 'evidence';
  private contentContainer: Phaser.GameObjects.Container;
  private entries: NotebookEntry[] = [];
  private kosminskiNotes: string[] = [];
  private scrollPosition: number = 0;
  private itemsPerPage: number = 5;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createUI();
    this.setupInputs();
    this.loadSavedEntries();
  }

  private createUI(): void {
    const width = 700;
    const height = 550;
    const x = (this.scene.scale.width - width) / 2;
    const y = (this.scene.scale.height - height) / 2;

    this.container = this.scene.add.container(x, y);
    this.container.setDepth(2550);

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
      35,
      'CASE NOTEBOOK',
      {
        fontFamily: 'Courier New',
        fontSize: '28px',
        color: '#e4cf9b',
        fontStyle: 'bold',
      }
    );
    title.setOrigin(0.5);
    this.container.add(title);

    this.createTabs(width);
    this.createContentArea(width, height);
    this.createCloseButton(width);

    this.container.setVisible(false);
  }

  private createTabs(width: number): void {
    const tabs = ['Evidence', 'Dialogue History', 'Kosminski Notes'] as const;
    const tabWidth = 180;
    const startX = (width - (tabs.length * tabWidth + (tabs.length - 1) * 10)) / 2;
    const tabY = 75;

    tabs.forEach((tab, index) => {
      const tabX = startX + index * (tabWidth + 10);

      const tabBg = this.scene.add.rectangle(
        tabX + tabWidth / 2,
        tabY + 15,
        tabWidth,
        30,
        0x2d2618
      );
      tabBg.setStrokeStyle(2, 0x6f5a34);
      tabBg.setInteractive({ useHandCursor: true });
      tabBg.setData('tab', tab.toLowerCase() as 'evidence' | 'dialogue' | 'kosminski');

      tabBg.on('pointerdown', () => {
        this.setTab(tab.toLowerCase() as 'evidence' | 'dialogue' | 'kosminski');
      });

      tabBg.on('pointerover', () => {
        tabBg.setFillStyle(0x3d3d3d);
      });

      tabBg.on('pointerout', () => {
        const isActive = this.activeTab === tab.toLowerCase() as 'evidence' | 'dialogue' | 'kosminski';
        tabBg.setFillStyle(isActive ? 0x3d3d3d : 0x2d2618);
      });

      const tabText = this.scene.add.text(
        tabX + tabWidth / 2,
        tabY + 15,
        tab,
        {
          fontFamily: 'Courier New',
          fontSize: '14px',
          color: '#f5f1e5',
        }
      );
      tabText.setOrigin(0.5);
      this.container.add(tabText);

      this.container.add(tabBg);
    });
  }

  private createContentArea(width: number, height: number): void {
    this.contentContainer = this.scene.add.container(0, 0);
    this.contentContainer.setDepth(2551);

    const contentBg = this.scene.add.rectangle(
      width / 2,
      height / 2 + 30,
      width - 40,
      height - 180,
      0x262014
    );
    contentBg.setStrokeStyle(1, 0x6f5a34);
    this.contentContainer.add(contentBg);

    this.container.add(this.contentContainer);
    this.renderContent();
  }

  private renderContent(): void {
    const items = this.contentContainer.list;
    items.forEach((item: any) => {
      if (item.destroy) item.destroy();
    });
    this.contentContainer.removeAll();

    let entries: NotebookEntry[] = [];

    switch (this.activeTab) {
      case 'evidence':
        entries = this.entries.filter(e => e.type === 'clue');
        break;
      case 'dialogue':
        entries = this.entries.filter(e => e.type === 'dialogue');
        break;
      case 'kosminski':
        entries = this.entries.filter(e => e.type === 'kosminski_note');
        break;
    }

    if (entries.length === 0) {
      const emptyText = this.scene.add.text(
        350,
        280,
        'No entries yet.',
        {
          fontFamily: 'Courier New',
          fontSize: '16px',
          color: '#666666',
        }
      );
      emptyText.setOrigin(0.5);
      this.contentContainer.add(emptyText);
      return;
    }

    entries.forEach((entry, index) => {
      this.renderEntry(entry, index);
    });
  }

  private renderEntry(entry: NotebookEntry, index: number): void {
    const width = 620;
    const cardHeight = 100;
    const startY = 130;
    const spacing = 110;

    const y = startY + index * spacing;

    const cardBg = this.scene.add.rectangle(
      width / 2,
      y,
      width,
      cardHeight,
      0x1f1b14
    );
    cardBg.setStrokeStyle(1, 0x6f5a34);
    this.contentContainer.add(cardBg);

    const titleText = this.scene.add.text(
      30,
      y - cardHeight / 2 + 10,
      entry.title,
      {
        fontFamily: 'Courier New',
        fontSize: '14px',
        color: '#e4cf9b',
        fontStyle: 'bold',
      }
    );
    titleText.setOrigin(0, 0.5);
    this.contentContainer.add(titleText);

    const contentText = this.scene.add.text(
      30,
      y - cardHeight / 2 + 40,
      entry.content,
      {
        fontFamily: 'Courier New',
        fontSize: '12px',
        color: '#f5f1e5',
        wordWrap: { width: width - 60, useAdvancedWrap: true },
        lineSpacing: 4,
      }
    );
    contentText.setOrigin(0, 0.5);
    this.contentContainer.add(contentText);

    const timestampText = this.scene.add.text(
      width - 30,
      y - cardHeight / 2 + 10,
      new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      {
        fontFamily: 'Courier New',
        fontSize: '10px',
        color: '#666666',
      }
    );
    timestampText.setOrigin(1, 0.5);
    this.contentContainer.add(timestampText);
  }

  private createCloseButton(width: number): void {
    const closeButton = this.scene.add.text(
      width - 20,
      20,
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
      if (event.key.toLowerCase() === 'n') {
        event.preventDefault();
        this.toggle();
      }
    };

    window.addEventListener('keydown', toggleHandler);
    (this.container as any).toggleHandler = toggleHandler;
  }

  private loadSavedEntries(): void {
    const gameState = window.gameState?.getState();
    if (gameState) {
      gameState.inventory.forEach((item: InventoryItem) => {
        if (item.type === 'clue') {
          this.entries.push({
            id: item.id,
            type: 'clue',
            title: item.title,
            content: item.description,
            timestamp: item.timestamp,
          });
        }
      });

      gameState.timeline.forEach((event: any) => {
        this.entries.push({
          id: `timeline_${event.timestamp}`,
          type: 'dialogue',
          title: 'Timeline Event',
          content: event.text,
          timestamp: event.timestamp,
        });
      });
    }

    this.entries.sort((a, b) => b.timestamp - a.timestamp);
  }

  public addKosminskiNote(note: string, npcName?: string): void {
    const entry: NotebookEntry = {
      id: `kosminski_${Date.now()}`,
      type: 'kosminski_note',
      title: npcName ? `Note on ${npcName}` : 'Investigator Note',
      content: note,
      timestamp: Date.now(),
      npcName,
    };

    this.entries.push(entry);
    this.entries.sort((a, b) => b.timestamp - a.timestamp);
    this.saveEntries();

    if (this.visible) {
      this.renderContent();
    }
  }

  public addClueEntry(clue: Clue): void {
    const entry: NotebookEntry = {
      id: clue.id,
      type: 'clue',
      title: clue.title,
      content: clue.description,
      timestamp: clue.timestamp,
    };

    this.entries.push(entry);
    this.entries.sort((a, b) => b.timestamp - a.timestamp);
    this.saveEntries();
  }

  public addDialogueEntry(npcName: string, dialogue: string): void {
    const entry: NotebookEntry = {
      id: `dialogue_${Date.now()}`,
      type: 'dialogue',
      title: `Conversation with ${npcName}`,
      content: dialogue,
      timestamp: Date.now(),
      npcName,
    };

    this.entries.push(entry);
    this.entries.sort((a, b) => b.timestamp - a.timestamp);
    this.saveEntries();
  }

  private saveEntries(): void {
    const gameState = window.gameState?.getState();
    if (gameState) {
      gameState.timeline.forEach((event: any) => {
        const existingEntry = this.entries.find(
          e => e.id === `timeline_${event.timestamp}`
        );
        if (!existingEntry) {
          this.entries.push({
            id: `timeline_${event.timestamp}`,
            type: 'dialogue',
            title: 'Timeline Event',
            content: event.text,
            timestamp: event.timestamp,
          });
        }
      });
    }
  }

  private setTab(tab: 'evidence' | 'dialogue' | 'kosminski'): void {
    this.activeTab = tab;
    this.renderContent();
  }

  public show(): void {
    this.container.setVisible(true);
    this.visible = true;
    this.renderContent();
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
