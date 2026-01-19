import type { DialogueNode, PlayerStats } from '../systems/GameState.js';
import { NPC_DATA, getNPCById } from '../data/npcs.js';

export class DialogueUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Rectangle;
  private nameText: Phaser.GameObjects.Text;
  private dialogueText: Phaser.GameObjects.Text;
  private portraitImage: Phaser.GameObjects.Image;
  private choiceButtons: Phaser.GameObjects.Container[] = [];
  private currentNode: DialogueNode | null = null;
  private currentNpcId: string | null = null;
  private visible: boolean = false;
  private typewriterTimer: Phaser.Time.TimerEvent | null = null;
  private displayedText: string = '';
  private isTyping: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createUI();
    this.setupInputs();
  }

  private createUI(): void {
    const width = this.scene.scale.width * 0.8;
    const height = this.scene.scale.height * 0.25;
    const x = this.scene.scale.width * 0.1;
    const y = this.scene.scale.height * 0.7;

    this.container = this.scene.add.container(x, y);
    this.container.setDepth(2000);

    this.background = this.scene.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x1a1a1a,
      0.95
    );
    this.background.setStrokeStyle(2, 0x8b7355);
    this.container.add(this.background);

    this.portraitImage = this.scene.add.image(60, height / 2, 'detective');
    this.portraitImage.setDisplaySize(100, 100);
    this.portraitImage.setVisible(false);
    this.container.add(this.portraitImage);

    this.nameText = this.scene.add.text(
      120,
      20,
      '',
      {
        fontFamily: 'Courier New',
        fontSize: '20px',
        color: '#e4cf9b',
        fontStyle: 'bold',
      }
    );
    this.container.add(this.nameText);

    this.dialogueText = this.scene.add.text(
      120,
      60,
      '',
      {
        fontFamily: 'Courier New',
        fontSize: '16px',
        color: '#f5f1e5',
        wordWrap: { width: width - 140, useAdvancedWrap: true },
        lineSpacing: 4,
      }
    );
    this.container.add(this.dialogueText);

    this.container.setVisible(false);
  }

  private setupInputs(): void {
    const advanceHandler = (event: KeyboardEvent) => {
      if (!this.visible || this.isTyping) return;

      if (event.key === 'Space' || event.key === 'e' || event.key === 'E') {
        event.preventDefault();
        this.advance();
      }
    };

    window.addEventListener('keydown', advanceHandler);
    (this.container as any).advanceHandler = advanceHandler;

    const numberHandler = (event: KeyboardEvent) => {
      if (!this.visible || this.isTyping) return;

      const keyMap: Record<string, number> = {
        '1': 0, '2': 1, '3': 2, '4': 3,
        '5': 4, '6': 5, '7': 6, '8': 7,
      };

      const index = keyMap[event.key];
      if (index !== undefined && this.currentNode?.choices && index < this.currentNode.choices.length) {
        event.preventDefault();
        this.selectChoice(index);
      }
    };

    window.addEventListener('keydown', numberHandler);
    (this.container as any).numberHandler = numberHandler;
  }

  public startDialogue(npcId: string, startNodeId?: string): void {
    const npcData = getNPCById(npcId);
    if (!npcData) return;

    this.currentNpcId = npcId;
    const startNode = startNodeId
      ? npcData.dialogueLines.find(n => n.id === startNodeId)
      : npcData.dialogueLines[0];

    if (!startNode) return;

    this.visible = true;
    this.container.setVisible(true);

    const portraitKey = npcData.portraitKey;
    if (this.scene.textures.exists(portraitKey)) {
      this.portraitImage.setTexture(portraitKey);
      this.portraitImage.setVisible(true);
    } else {
      this.portraitImage.setVisible(false);
    }

    this.displayedText = '';
    this.displayNode(startNode);

    window.gameState?.recordDialogue(npcId, startNode.id);
  }

  private displayNode(node: DialogueNode): void {
    this.currentNode = node;
    this.nameText.setText(node.speaker);
    this.clearChoices();
    this.playTypewriterEffect(node.text);
  }

  private playTypewriterEffect(text: string): void {
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
    }

    this.isTyping = true;
    this.displayedText = '';

    const textObj = this.dialogueText;
    textObj.setText('');

    this.typewriterTimer = this.scene.time.addEvent({
      delay: 30,
      repeat: text.length - 1,
      callback: () => {
        this.displayedText = text.substring(0, this.displayedText.length + 1);
        textObj.setText(this.displayedText);
      },
      onComplete: () => {
        this.isTyping = false;
        this.onTextComplete();
      },
    });
  }

  private onTextComplete(): void {
    if (this.currentNode?.choices && this.currentNode.choices.length > 0) {
      this.showChoices(this.currentNode.choices);
    } else if (this.currentNode?.nextNodeId) {
      const npcData = getNPCById(this.currentNpcId || '');
      if (npcData) {
        const nextNode = npcData.dialogueLines.find(
          n => n.id === this.currentNode!.nextNodeId
        );
        if (nextNode) {
          this.showContinuePrompt();
        }
      }
    } else {
      this.showClosePrompt();
    }

    this.checkQuestCompletion();
  }

  private showChoices(choices: Array<any>): void {
    const gameState = window.gameState?.getState();
    const playerStats = gameState?.playerStats;

    const y = 130;
    choices.forEach((choice, index) => {
      const buttonWidth = this.container.width - 140;
      const buttonHeight = 40;
      const buttonX = 120;

      const buttonBg = this.scene.add.rectangle(
        buttonX + buttonWidth / 2,
        y + index * 45,
        buttonWidth,
        buttonHeight,
        0x3d3d3d
      );
      buttonBg.setStrokeStyle(1, 0x8b7355);
      buttonBg.setInteractive({ useHandCursor: true });

      const choiceNum = this.scene.add.text(
        buttonX,
        y + index * 45 - 10,
        `${index + 1}.`,
        {
          fontFamily: 'Courier New',
          fontSize: '12px',
          color: '#b4945a',
        }
      );
      choiceNum.setOrigin(0, 0.5);

      const buttonText = this.scene.add.text(
        buttonX + 30,
        y + index * 45 - 10,
        choice.text,
        {
          fontFamily: 'Courier New',
          fontSize: '14px',
          color: '#f5f1e5',
        }
      );
      buttonText.setOrigin(0, 0.5);

      let meetsRequirements = true;
      if (choice.requirements && playerStats) {
        for (const [stat, requiredValue] of Object.entries(choice.requirements)) {
          if (playerStats[stat as keyof PlayerStats] < (requiredValue as number)) {
            meetsRequirements = false;
            buttonText.setColor('#666666');
            buttonText.setText(`${choice.text} (Requires ${stat} ${requiredValue})`);
            buttonBg.disableInteractive();
            break;
          }
        }
      }

      if (meetsRequirements) {
        buttonBg.on('pointerdown', () => {
          this.selectChoice(index);
        });

        buttonBg.on('pointerover', () => {
          buttonBg.setFillStyle(0x4d4d4d);
        });

        buttonBg.on('pointerout', () => {
          buttonBg.setFillStyle(0x3d3d3d);
        });
      }

      const choiceContainer = this.scene.add.container(0, 0, [buttonBg, buttonText, choiceNum]);
      this.container.add(choiceContainer);
      this.choiceButtons.push(choiceContainer);
    });
  }

  private selectChoice(index: number): void {
    if (!this.currentNode?.choices) return;

    const choice = this.currentNode.choices[index];
    if (choice.unlocks?.clueIds) {
      const ClueManager = (window as any).ClueManager;
      if (ClueManager) {
        choice.unlocks.clueIds.forEach((clueId: string) => {
          ClueManager.addClueById(clueId);
        });
      }
    }

    if (choice.unlocks?.questUpdates) {
      const QuestManager = (window as any).QuestManager;
      if (QuestManager) {
        choice.unlocks.questUpdates.forEach((questUpdate: string) => {
          QuestManager.updateQuest(questUpdate);
        });
      }
    }

    this.loadNextNode(choice.nextNodeId);
  }

  private showContinuePrompt(): void {
    const promptText = this.scene.add.text(
      this.container.width - 50,
      this.container.height - 30,
      '[SPACE or E to continue]',
      {
        fontFamily: 'Courier New',
        fontSize: '12px',
        color: '#e4cf9b',
      }
    );
    promptText.setOrigin(1, 1);
    this.container.add(promptText);
  }

  private showClosePrompt(): void {
    const promptText = this.scene.add.text(
      this.container.width - 50,
      this.container.height - 30,
      '[E to close]',
      {
        fontFamily: 'Courier New',
        fontSize: '12px',
        color: '#e4cf9b',
      }
    );
    promptText.setOrigin(1, 1);
    this.container.add(promptText);
  }

  private clearChoices(): void {
    this.choiceButtons.forEach(btn => btn.destroy());
    this.choiceButtons = [];

    const promptObjects = this.container.list.filter(obj =>
      obj instanceof Phaser.GameObjects.Text &&
      obj.text.includes('[') && !obj.text.includes('N') && !obj.text.includes('Y')
    );
    promptObjects.forEach((obj: any) => obj.destroy());
  }

  private advance(): void {
    if (this.currentNode?.choices && this.currentNode.choices.length > 0) {
      return;
    }

    if (this.currentNode?.nextNodeId) {
      this.advanceToNode(this.currentNode.nextNodeId);
    } else {
      this.close();
    }
  }

  private advanceToNode(nodeId: string): void {
    this.clearChoices();

    const promptObjects = this.container.list.filter(obj =>
      obj instanceof Phaser.GameObjects.Text &&
      obj.text.includes('[')
    );
    promptObjects.forEach((obj: any) => obj.destroy());

    if (nodeId) {
      this.loadNextNode(nodeId);
    } else {
      this.close();
    }
  }

  private loadNextNode(nodeId: string): void {
    this.clearChoices();

    const promptObjects = this.container.list.filter(obj =>
      obj instanceof Phaser.GameObjects.Text &&
      obj.text.includes('[')
    );
    promptObjects.forEach((obj: any) => obj.destroy());

    if (nodeId) {
      this.displayNextNode(nodeId);
    } else {
      this.close();
    }
  }

  private displayNextNode(nodeId: string): void {
    if (!this.currentNpcId) return;

    const npcData = getNPCById(this.currentNpcId);
    if (!npcData) return;

    const nextNode = npcData.dialogueLines.find(n => n.id === nodeId);
    if (nextNode) {
      this.displayedText = '';
      this.displayNode(nextNode);
      window.gameState?.recordDialogue(this.currentNpcId, nodeId);
    } else {
      this.close();
    }
  }

  private checkQuestCompletion(): void {
    if (!this.currentNpcId) return;

    const QuestManager = (window as any).QuestManager;
    if (!QuestManager) return;

    const currentObjective = QuestManager.getCurrentObjective();
    if (currentObjective?.type === 'TALK_TO_NPC' && currentObjective.targetId === this.currentNpcId) {
      QuestManager.completeObjective(currentObjective.id);
    }
  }

  public close(): void {
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
      this.typewriterTimer = null;
    }

    this.clearChoices();
    this.container.setVisible(false);
    this.visible = false;
    this.currentNode = null;
    this.currentNpcId = null;
    this.isTyping = false;
  }

  public loadNextNode(nodeId: string): void {
    this.clearChoices();

    const promptObjects = this.container.list.filter(obj =>
      obj instanceof Phaser.GameObjects.Text &&
      obj.text.includes('[')
    );
    promptObjects.forEach((obj: any) => obj.destroy());

    if (nodeId) {
      this.advanceToNode(nodeId);
    } else {
      this.close();
    }
  }

  private advance(): void {
    if (this.currentNode?.choices && this.currentNode.choices.length > 0) {
      return;
    }

    if (this.currentNode?.nextNodeId) {
      this.loadNextNode(this.currentNode.nextNodeId);
    } else {
      this.close();
    }
  }

  private loadNextNode(nodeId: string): void {
    if (!this.currentNpcId) return;

    const npcData = getNPCById(this.currentNpcId);
    if (!npcData) return;

    const nextNode = npcData.dialogueLines.find(n => n.id === nodeId);
    if (nextNode) {
      this.displayedText = '';
      this.displayNode(nextNode);
      window.gameState?.recordDialogue(this.currentNpcId, nodeId);
    } else {
      this.close();
    }
  }

  private checkQuestCompletion(): void {
    if (!this.currentNpcId) return;

    const QuestManager = (window as any).QuestManager;
    if (!QuestManager) return;

    const currentObjective = QuestManager.getCurrentObjective();
    if (currentObjective?.type === 'TALK_TO_NPC' && currentObjective.targetId === this.currentNpcId) {
      QuestManager.completeObjective(currentObjective.id);
    }
  }

  public close(): void {
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
      this.typewriterTimer = null;
    }

    this.clearChoices();
    this.container.setVisible(false);
    this.visible = false;
    this.currentNode = null;
    this.currentNpcId = null;
    this.isTyping = false;
  }

  public loadNextNode(nodeId: string): void {
    this.clearChoices();

    const promptObjects = this.container.list.filter(obj =>
      obj instanceof Phaser.GameObjects.Text &&
      obj.text.includes('[')
    );
    promptObjects.forEach((obj: any) => obj.destroy());

    if (nodeId) {
      this.loadNextNode(nodeId);
    } else {
      this.close();
    }
  }

  public isVisible(): boolean {
    return this.visible;
  }

  public destroy(): void {
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
    }

    if ((this.container as any)?.advanceHandler) {
      window.removeEventListener('keydown', (this.container as any).advanceHandler);
    }

    if ((this.container as any)?.numberHandler) {
      window.removeEventListener('keydown', (this.container as any).numberHandler);
    }

    this.container.destroy();
  }
}
