/**
 * Pokémon-Style Dialogue Box UI - JavaScript Implementation
 */

import QuestAwareDialogueController from '../systems/QuestAwareDialogueController.js';

export class DialogueBoxUI {
  constructor(scene) {
    this.scene = scene;
    this.dialogueController = new QuestAwareDialogueController({ scene });

    // Calculate dimensions based on screen size
    this.boxWidth = this.scene.scale.width * 0.85;
    this.boxHeight = this.scene.scale.height * 0.22;
    this.boxX = this.scene.scale.width * 0.075;
    this.boxY = this.scene.scale.height * 0.75;

    this.createUI();
    this.setupInputs();
  }

  createUI() {
    this.container = this.scene.add.container(this.boxX, this.boxY);
    this.container.setDepth(2000);
    this.container.setScrollFactor(0);

    // Outer border (darker, larger)
    this.backgroundOuter = this.scene.add.rectangle(
      this.boxWidth / 2, this.boxHeight / 2,
      this.boxWidth + 8, this.boxHeight + 8,
      0x2a2a2a, 1
    );
    this.backgroundOuter.setStrokeStyle(4, 0x4a4a4a);
    this.container.add(this.backgroundOuter);

    // Inner background (semi-transparent)
    this.backgroundInner = this.scene.add.rectangle(
      this.boxWidth / 2, this.boxHeight / 2,
      this.boxWidth, this.boxHeight,
      0x1a1a1a, 0.95
    );
    this.backgroundInner.setStrokeStyle(2, 0x6b5b4b);
    this.container.add(this.backgroundInner);

    // Portrait frame
    const portraitSize = this.boxHeight - 20;
    this.portraitFrame = this.scene.add.rectangle(
      portraitSize / 2 + 10, this.boxHeight / 2,
      portraitSize, portraitSize,
      0x000000, 0.5
    );
    this.portraitFrame.setStrokeStyle(3, 0x8b7355);
    this.container.add(this.portraitFrame);

    this.portraitImage = this.scene.add.image(
      portraitSize / 2 + 10, this.boxHeight / 2,
      'detective'
    );
    this.portraitImage.setDisplaySize(portraitSize - 16, portraitSize - 16);
    this.portraitImage.setVisible(false);
    this.container.add(this.portraitImage);

    // Name box
    this.nameBox = this.scene.add.rectangle(120, 15, 160, 32, 0x3d3d3d, 0.9);
    this.nameBox.setStrokeStyle(2, 0x8b7355);
    this.container.add(this.nameBox);

    this.nameText = this.scene.add.text(120, 15, '', {
      fontFamily: 'Courier New', fontSize: '18px',
      color: '#e4cf9b', fontStyle: 'bold',
    });
    this.nameText.setOrigin(0.5);
    this.container.add(this.nameText);

    // Dialogue text
    const textX = portraitSize + 30;
    const textWidth = this.boxWidth - portraitSize - 60;

    this.dialogueText = this.scene.add.text(textX, 55, '', {
      fontFamily: 'Courier New', fontSize: '16px',
      color: '#f5f1e5',
      wordWrap: { width: textWidth, useAdvancedWrap: true },
      lineSpacing: 4,
    });
    this.container.add(this.dialogueText);

    // Continue arrow (flashing ▼)
    this.continueArrow = this.scene.add.triangle(
      this.boxWidth - 30, this.boxHeight - 20,
      0, 10, 5, 0, 10, 10,
      0xe4cf9b
    );
    this.continueArrow.setVisible(false);
    this.container.add(this.continueArrow);

    // Skip button
    this.createSkipButton();

    // Press [A] prompt (Pokemon-style)
    this.pressAPrompt = this.scene.add.text(
      this.boxWidth - 120,
      this.boxHeight - 25,
      'Press [A]',
      {
        fontFamily: 'Courier New',
        fontSize: '14px',
        color: '#e4cf9b',
        fontStyle: 'bold',
        stroke: '#8b7355',
        strokeThickness: 2,
      }
    );
    this.pressAPrompt.setOrigin(0.5);
    this.pressAPrompt.setVisible(false);
    this.container.add(this.pressAPrompt);

    this.container.setVisible(false);
  }

  createSkipButton() {
    this.skipButton = this.scene.add.container(70, this.boxHeight - 25);

    this.skipButtonBg = this.scene.add.rectangle(0, 0, 60, 24, 0x4a3a2a, 0.8);
    this.skipButtonBg.setStrokeStyle(2, 0x8b7355);
    this.skipButtonBg.setInteractive({ useHandCursor: true });
    this.skipButton.add(this.skipButtonBg);

    this.skipButtonText = this.scene.add.text(0, 0, 'B/Shift', {
      fontFamily: 'Courier New', fontSize: '11px',
      color: '#b4945a', fontStyle: 'bold',
    });
    this.skipButtonText.setOrigin(0.5);
    this.skipButton.add(this.skipButtonText);

    this.skipButtonBg.on('pointerover', () => {
      this.skipButtonBg.setFillStyle(0x5a4a3a);
    });

    this.skipButtonBg.on('pointerout', () => {
      this.skipButtonBg.setFillStyle(0x4a3a2a);
    });

    this.skipButtonBg.on('pointerdown', () => this.handleSkip());

    this.skipButton.setVisible(false);
    this.container.add(this.skipButton);
  }

  setupInputs() {
    // B key or Shift to skip
    const skipHandler = (event) => {
      if (!this.visible) return;
      if (event.key === 'b' || event.key === 'B' || event.key === 'Backspace' || event.key === 'Shift') {
        event.preventDefault();
        this.handleSkip();
      }
    };
    window.addEventListener('keydown', skipHandler);
    this.container.skipHandler = skipHandler;

    // Advance handler (A key or Space)
    const advanceHandler = (event) => {
      if (!this.visible) return;
      if (event.key === 'a' || event.key === 'A' || event.key === 'Space' || event.key === ' ') {
        event.preventDefault();
        this.isTyping ? this.handleSkip() : this.advance();
      }
    };
    window.addEventListener('keydown', advanceHandler);
    this.container.advanceHandler = advanceHandler;

    // Click to advance
    this.scene.input.on('pointerdown', () => {
      if (!this.visible) return;
      this.isTyping ? this.handleSkip() : this.advance();
    });
  }

  /**
   * handleSkip() - Core Skip Logic
   * 
   * ReAct Chain-of-Thought:
   * - THOUGHT: Check if currently typing or at end of text
   * - ACTION: 
   *   IF isTyping == true: Set charIndex to max (finish animation)
   *   IF isTyping == false: Trigger closeDialogue() or nextPage()
   */
  handleSkip() {
    if (this.isTyping) {
      // GBA STYLE: Fast-forward through typing
      this.skipTypewriter();
    } else {
      // 3DS STYLE: Skip seen dialogue
      if (this.currentNode && this.hasSeenDialogue.has(this.currentNode.id)) {
        this.close();
      } else {
        this.advance();
      }
    }
  }

  skipTypewriter() {
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
      this.typewriterTimer = null;
    }

    this.charIndex = this.fullText.length;
    this.displayedText = this.fullText;
    this.dialogueText.setText(this.displayedText);
    this.isTyping = false;

    if (this.currentNode) {
      this.hasSeenDialogue.add(this.currentNode.id);
    }

    this.showContinueArrow();
    this.showPressAPrompt();
    this.onTextComplete();
  }

  showContinueArrow() {
    this.continueArrow.setVisible(true);

    if (this.arrowBlinkTimer) {
      this.arrowBlinkTimer.destroy();
    }

    this.arrowBlinkTimer = this.scene.time.addEvent({
      delay: 400,
      repeat: -1,
      callback: () => {
        this.continueArrow.setVisible(!this.continueArrow.visible);
      }
    });
  }

  hideContinueArrow() {
    this.continueArrow.setVisible(false);
    this.hidePressAPrompt();
    if (this.arrowBlinkTimer) {
      this.arrowBlinkTimer.destroy();
      this.arrowBlinkTimer = null;
    }
  }

  showPressAPrompt() {
    if (this.pressAPrompt) {
      this.pressAPrompt.setVisible(true);
    }
  }

  hidePressAPrompt() {
    if (this.pressAPrompt) {
      this.pressAPrompt.setVisible(false);
    }
  }

  playTypewriterEffect(text) {
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
      this.typewriterTimer = null;
    }

    this.fullText = text;
    this.displayedText = '';
    this.charIndex = 0;
    this.isTyping = true;

    this.dialogueText.setText('');
    this.hideContinueArrow();

    this.typewriterTimer = this.scene.time.addEvent({
      delay: this.typewriterSpeed || 30,
      repeat: text.length - 1,
      callback: () => {
        this.charIndex++;
        this.displayedText = text.substring(0, this.charIndex);
        this.dialogueText.setText(this.displayedText);

        if (this.charIndex >= text.length) {
          this.isTyping = false;
          this.hasSeenDialogue.add(this.currentNode?.id);
          this.onTextComplete();
        }
      }
    });
  }

  onTextComplete() {
    this.showContinueArrow();

    if (this.currentNode?.choices?.length > 0) {
      this.showChoices(this.currentNode.choices);
    } else if (!this.currentNode?.nextNodeId) {
      this.showCloseIndicator();
    }
  }

  showCloseIndicator() {
    this.continueArrow.setFillStyle(0xb4945a);
    this.skipButton.setVisible(false);
    if (this.pressAPrompt) {
      this.pressAPrompt.setText('Press [A] to close');
    }
  }

  advance() {
    this.hideContinueArrow();
    this.hidePressAPrompt();

    if (this.currentNode?.choices?.length > 0) return;

    if (this.currentNode?.nextNodeId) {
      this.loadNextNode(this.currentNode.nextNodeId);
    } else {
      this.close();
    }
  }

  loadNextNode(nodeId) {
    if (!this.currentNpcId) {
      this.close();
      return;
    }

    import('../data/npcs.js').then(({ getNPCById }) => {
      const npcData = getNPCById(this.currentNpcId);
      if (!npcData) {
        this.close();
        return;
      }

      const nextNode = npcData.dialogueLines.find(n => n.id === nodeId);
      if (nextNode) {
        this.displayNode(nextNode);
        window.gameState?.recordDialogue(this.currentNpcId, nodeId);
      } else {
        this.close();
      }
    });
  }

  displayNode(node) {
    this.currentNode = node;
    this.nameText.setText(node.speaker);
    this.clearChoices();
    this.skipButton.setVisible(true);
    this.hidePressAPrompt(); // Hide during typing

    // Enhance dialogue with quest prompts (FIX: Include questId and objectiveId)
    const questId = this.dialogueController.currentQuestId;
    const objectiveId = this.dialogueController.currentObjectiveId;
    const enhancedText = this.dialogueController.processDialogue(
      node.text,
      this.currentNpcId,
      questId,
      objectiveId
    );

    this.playTypewriterEffect(enhancedText);
  }

  showChoices(choices) {
    this.hideContinueArrow();
    this.hidePressAPrompt();
    this.skipButton.setVisible(false);

    const gameState = window.gameState?.getState();
    const playerStats = gameState?.playerStats;

    const y = 100;
    const buttonWidth = this.boxWidth - 180;
    const buttonHeight = 36;

    choices.forEach((choice, index) => {
      const buttonX = 90;

      const buttonBg = this.scene.add.rectangle(
        buttonX + buttonWidth / 2, y + index * 42,
        buttonWidth, buttonHeight,
        0x3d3d3d
      );
      buttonBg.setStrokeStyle(2, 0x6b5b4b);
      buttonBg.setInteractive({ useHandCursor: true });

      const buttonText = this.scene.add.text(
        buttonX + 20, y + index * 42,
        choice.text,
        { fontFamily: 'Courier New', fontSize: '14px', color: '#f5f1e5' }
      );
      buttonText.setOrigin(0, 0.5);

      let meetsRequirements = true;
      if (choice.requirements && playerStats) {
        for (const [stat, requiredValue] of Object.entries(choice.requirements)) {
          if (playerStats[stat] < requiredValue) {
            meetsRequirements = false;
            buttonText.setColor('#666666');
            buttonText.setText(`${choice.text} (${stat} ${requiredValue}+)`);
            buttonBg.setFillStyle(0x2a2a2a);
            buttonBg.disableInteractive();
            break;
          }
        }
      }

      if (meetsRequirements) {
        buttonBg.on('pointerdown', () => this.selectChoice(choice, index));
        buttonBg.on('pointerover', () => buttonBg.setFillStyle(0x4d4d4d));
        buttonBg.on('pointerout', () => buttonBg.setFillStyle(0x3d3d3d));
      }

      const choiceContainer = this.scene.add.container(0, 0, [buttonBg, buttonText]);
      this.container.add(choiceContainer);
      this.choiceButtons.push(choiceContainer);
    });
  }

  selectChoice(choice) {
    if (choice.unlocks?.clueIds) {
      const ClueManager = window.ClueManager;
      if (ClueManager) {
        choice.unlocks.clueIds.forEach(clueId => ClueManager.addClueById(clueId));
      }
    }
    this.loadNextNode(choice.nextNodeId);
  }

  clearChoices() {
    this.choiceButtons.forEach(btn => btn.destroy());
    this.choiceButtons = [];

    const promptObjects = this.container.list.filter(obj =>
      obj instanceof Phaser.GameObjects.Text &&
      obj.text && (obj.text.includes('[') || obj.text.includes('▼'))
    );
    promptObjects.forEach(obj => obj.destroy());
  }

  startDialogue(npcId, startNodeId) {
    import('../data/npcs.js').then(({ getNPCById }) => {
      const npcData = getNPCById(npcId);
      if (!npcData) return;

      this.currentNpcId = npcId;
      const startNode = startNodeId
        ? npcData.dialogueLines.find(n => n.id === startNodeId)
        : npcData.dialogueLines[0];

      if (!startNode) return;

      this.visible = true;
      this.container.setVisible(true);

      if (this.scene.textures.exists(npcData.portraitKey)) {
        this.portraitImage.setTexture(npcData.portraitKey);
        this.portraitImage.setVisible(true);
      } else {
        this.portraitImage.setVisible(false);
      }

      this.displayNode(startNode);
      window.gameState?.recordDialogue(npcId, startNode.id);
      
      // Show initial prompt
      this.showPressAPrompt();
    });
  }

  close() {
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
      this.typewriterTimer = null;
    }
    if (this.arrowBlinkTimer) {
      this.arrowBlinkTimer.destroy();
      this.arrowBlinkTimer = null;
    }

    this.hidePressAPrompt();
    this.clearChoices();
    this.container.setVisible(false);
    this.visible = false;
    this.currentNode = null;
    this.currentNpcId = null;
    this.isTyping = false;
    this.displayedText = '';
    this.fullText = '';
    
    // Reset prompt text
    if (this.pressAPrompt) {
      this.pressAPrompt.setText('Press [A]');
    }
  }

  isVisible() {
    return this.visible;
  }

  destroy() {
    if (this.typewriterTimer) this.typewriterTimer.destroy();
    if (this.arrowBlinkTimer) this.arrowBlinkTimer.destroy();
    if (this.container.skipHandler) {
      window.removeEventListener('keydown', this.container.skipHandler);
    }
    if (this.container.advanceHandler) {
      window.removeEventListener('keydown', this.container.advanceHandler);
    }
    this.container.destroy();
  }
}

export default DialogueBoxUI;
