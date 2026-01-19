import type { DialogueNode, PlayerStats } from './GameState.js';

export type DialogueCallback = (node: DialogueNode, choiceIndex?: number) => void;

export interface DialogueManagerConfig {
  scene: Phaser.Scene;
  onClose: () => void;
  onComplete?: DialogueCallback;
}

export class DialogueManager {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Rectangle;
  private nameText: Phaser.GameObjects.Text;
  private dialogueText: Phaser.GameObjects.Text;
  private choiceButtons: Phaser.GameObjects.Container[] = [];
  private portraitImage: Phaser.GameObjects.Image;
  private activeNode: DialogueNode | null = null;
  private visible: boolean = false;
  private onClose: () => void;
  private onComplete?: DialogueCallback;
  private typewriterTimer: Phaser.Time.TimerEvent | null = null;
  private displayedText: string = '';

  constructor(config: DialogueManagerConfig) {
    this.scene = config.scene;
    this.onClose = config.onClose;
    this.onComplete = config.onComplete;
    this.createUI();
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

  public showDialogue(node: DialogueNode, portraitKey?: string): void {
    this.activeNode = node;
    this.displayedText = '';
    this.visible = true;
    this.container.setVisible(true);
    this.clearChoices();

    if (portraitKey && this.scene.textures.exists(portraitKey)) {
      this.portraitImage.setTexture(portraitKey);
      this.portraitImage.setVisible(true);
    } else {
      this.portraitImage.setVisible(false);
    }

    this.nameText.setText(node.speaker);
    this.playTypewriterEffect(node.text);
  }

  private playTypewriterEffect(text: string): void {
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
    }

    let index = 0;
    const textObj = this.dialogueText;

    textObj.setText('');

    this.typewriterTimer = this.scene.time.addEvent({
      delay: 30,
      repeat: text.length - 1,
      callback: () => {
        index++;
        this.displayedText = text.substring(0, index);
        textObj.setText(this.displayedText);

        if (index >= text.length) {
          this.onTextComplete();
        }
      },
    });
  }

  private onTextComplete(): void {
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
      this.typewriterTimer = null;
    }

    if (this.activeNode?.choices && this.activeNode.choices.length > 0) {
      this.showChoices(this.activeNode.choices);
    } else if (this.activeNode?.nextNodeId) {
      this.showContinuePrompt();
    } else {
      this.showCloseButton();
    }
  }

  private showChoices(choices: Array<{ text: string; nextNodeId: string; requirements?: Partial<PlayerStats>; unlocks?: any }>): void {
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

      const buttonText = this.scene.add.text(
        buttonX,
        y + index * 45 - 10,
        choice.text,
        {
          fontFamily: 'Courier New',
          fontSize: '14px',
          color: '#f5f1e5',
        }
      );
      buttonText.setOrigin(0, 0.5);

      const choiceContainer = this.scene.add.container(0, 0, [buttonBg, buttonText]);

      if (choice.requirements) {
        let meetsRequirements = true;
        for (const [stat, requiredValue] of Object.entries(choice.requirements)) {
          if (playerStats && playerStats[stat as keyof PlayerStats] < (requiredValue as number)) {
            meetsRequirements = false;
            buttonText.setColor('#666666');
            buttonText.setText(`${choice.text} (Requires ${stat} ${requiredValue})`);
            buttonBg.disableInteractive();
            break;
          }
        }

        if (meetsRequirements) {
          buttonBg.on('pointerdown', () => {
            this.handleChoice(choice, index);
          });

          buttonBg.on('pointerover', () => {
            buttonBg.setFillStyle(0x4d4d4d);
          });

          buttonBg.on('pointerout', () => {
            buttonBg.setFillStyle(0x3d3d3d);
          });
        }
      } else {
        buttonBg.on('pointerdown', () => {
          this.handleChoice(choice, index);
        });

        buttonBg.on('pointerover', () => {
          buttonBg.setFillStyle(0x4d4d4d);
        });

        buttonBg.on('pointerout', () => {
          buttonBg.setFillStyle(0x3d3d3d);
        });
      }

      this.container.add(choiceContainer);
      this.choiceButtons.push(choiceContainer);
    });

    this.scene.input.keyboard.once('keydown-ONE', () => this.handleChoiceIndex(0));
    this.scene.input.keyboard.once('keydown-TWO', () => this.handleChoiceIndex(1));
    this.scene.input.keyboard.once('keydown-THREE', () => this.handleChoiceIndex(2));
    this.scene.input.keyboard.once('keydown-FOUR', () => this.handleChoiceIndex(3));
  }

  private handleChoice(choice: any, index: number): void {
    this.clearKeyboardListeners();

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

    if (this.onComplete) {
      this.onComplete(this.activeNode!, index);
    }

    const DialogueUI = (window as any).DialogueUI;
    if (DialogueUI) {
      DialogueUI.loadNextNode(choice.nextNodeId);
    }
  }

  private handleChoiceIndex(index: number): void {
    if (this.activeNode?.choices && index < this.activeNode.choices.length) {
      this.handleChoice(this.activeNode.choices[index], index);
    }
  }

  private showContinuePrompt(): void {
    const promptText = this.scene.add.text(
      this.container.width - 50,
      this.container.height - 30,
      '[Press SPACE or Click to continue]',
      {
        fontFamily: 'Courier New',
        fontSize: '12px',
        color: '#e4cf9b',
      }
    );
    promptText.setOrigin(1, 1);

    const clickZone = this.scene.add.rectangle(
      this.container.width / 2,
      this.container.height / 2,
      this.container.width,
      this.container.height,
      0x000000,
      0
    );
    clickZone.setInteractive({ useHandCursor: true });

    const onContinue = () => {
      clickZone.off('pointerdown');
      this.scene.input.keyboard.off('keydown-SPACE');
      promptText.destroy();
      clickZone.destroy();

      if (this.onComplete) {
        this.onComplete(this.activeNode!);
      }

      const DialogueUI = (window as any).DialogueUI;
      if (DialogueUI) {
        DialogueUI.loadNextNode(this.activeNode?.nextNodeId || '');
      }
    };

    clickZone.on('pointerdown', onContinue);
    this.scene.input.keyboard.once('keydown-SPACE', onContinue);

    this.container.add([clickZone, promptText]);
  }

  private showCloseButton(): void {
    const promptText = this.scene.add.text(
      this.container.width - 50,
      this.container.height - 30,
      '[Press E to close]',
      {
        fontFamily: 'Courier New',
        fontSize: '12px',
        color: '#e4cf9b',
      }
    );
    promptText.setOrigin(1, 1);

    const onClose = () => {
      this.scene.input.keyboard.off('keydown-E');
      promptText.destroy();
      this.close();
    };

    this.scene.input.keyboard.once('keydown-E', onClose);
    this.container.add(promptText);
  }

  private clearKeyboardListeners(): void {
    this.scene.input.keyboard.off('keydown-ONE');
    this.scene.input.keyboard.off('keydown-TWO');
    this.scene.input.keyboard.off('keydown-THREE');
    this.scene.input.keyboard.off('keydown-FOUR');
  }

  private clearChoices(): void {
    this.choiceButtons.forEach(btn => btn.destroy());
    this.choiceButtons = [];
    this.clearKeyboardListeners();
  }

  public close(): void {
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
      this.typewriterTimer = null;
    }

    this.clearChoices();
    this.container.setVisible(false);
    this.visible = false;
    this.activeNode = null;
    this.onClose();
  }

  public isVisible(): boolean {
    return this.visible;
  }

  public destroy(): void {
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
    }
    this.container.destroy();
  }
}
