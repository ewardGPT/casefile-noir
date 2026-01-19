/**
 * Pokémon-Style Dialogue Box UI
 * Features:
 * - Semi-transparent rounded rectangle with double-line border
 * - Animated flashing arrow indicator
 * - Skip/Fast-Forward mechanic (B key + UI button)
 * - Portrait frame on left
 */

export class DialogueBoxUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  
  // UI Elements
  private backgroundOuter: Phaser.GameObjects.Rectangle;
  private backgroundInner: Phaser.GameObjects.Rectangle;
  private nameBox: Phaser.GameObjects.Rectangle;
  private nameText: Phaser.GameObjects.Text;
  private dialogueText: Phaser.GameObjects.Text;
  private portraitFrame: Phaser.GameObjects.Rectangle;
  private portraitImage: Phaser.GameObjects.Image;
  private continueArrow: Phaser.GameObjects.Triangle;
  private skipButton: Phaser.GameObjects.Container;
  private skipButtonBg: Phaser.GameObjects.Rectangle;
  private skipButtonText: Phaser.GameObjects.Text;
  private pressAPrompt: Phaser.GameObjects.Text;
  
  // State
  private visible: boolean = false;
  private typewriterTimer: Phaser.Time.TimerEvent | null = null;
  private displayedText: string = '';
  private fullText: string = '';
  private currentNode: any = null;
  private currentNpcId: string | null = null;
  private isTyping: boolean = false;
  private charIndex: number = 0;
  private typewriterSpeed: number = 30;
  private arrowBlinkTimer: Phaser.Time.TimerEvent | null = null;
  private hasSeenDialogue: Set<string> = new Set();
  
  // Dimensions
  private boxWidth: number;
  private boxHeight: number;
  private boxX: number;
  private boxY: number;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    
    // Calculate dimensions based on screen size
    this.boxWidth = this.scene.scale.width * 0.85;
    this.boxHeight = this.scene.scale.height * 0.22;
    this.boxX = this.scene.scale.width * 0.075;
    this.boxY = this.scene.scale.height * 0.75;
    
    this.createUI();
    this.setupInputs();
  }
  
  private createUI(): void {
    // Main container
    this.container = this.scene.add.container(this.boxX, this.boxY);
    this.container.setDepth(2000);
    this.container.setScrollFactor(0);
    
    // === OUTER BORDER (Darker, larger) ===
    this.backgroundOuter = this.scene.add.rectangle(
      this.boxWidth / 2,
      this.boxHeight / 2,
      this.boxWidth + 8,
      this.boxHeight + 8,
      0x2a2a2a,
      1
    );
    this.backgroundOuter.setStrokeStyle(4, 0x4a4a4a);
    this.container.add(this.backgroundOuter);
    
    // === INNER BACKGROUND (Semi-transparent) ===
    this.backgroundInner = this.scene.add.rectangle(
      this.boxWidth / 2,
      this.boxHeight / 2,
      this.boxWidth,
      this.boxHeight,
      0x1a1a1a,
      0.95
    );
    this.backgroundInner.setStrokeStyle(2, 0x6b5b4b);
    this.container.add(this.backgroundInner);
    
    // === PORTRAIT FRAME (Left side) ===
    const portraitSize = this.boxHeight - 20;
    this.portraitFrame = this.scene.add.rectangle(
      portraitSize / 2 + 10,
      this.boxHeight / 2,
      portraitSize,
      portraitSize,
      0x000000,
      0.5
    );
    this.portraitFrame.setStrokeStyle(3, 0x8b7355);
    this.container.add(this.portraitFrame);
    
    this.portraitImage = this.scene.add.image(
      portraitSize / 2 + 10,
      this.boxHeight / 2,
      'detective'
    );
    this.portraitImage.setDisplaySize(portraitSize - 16, portraitSize - 16);
    this.portraitImage.setVisible(false);
    this.container.add(this.portraitImage);
    
    // === NAME BOX (Above dialogue) ===
    this.nameBox = this.scene.add.rectangle(
      120,
      15,
      160,
      32,
      0x3d3d3d,
      0.9
    );
    this.nameBox.setStrokeStyle(2, 0x8b7355);
    this.container.add(this.nameBox);
    
    this.nameText = this.scene.add.text(
      120,
      15,
      '',
      {
        fontFamily: 'Courier New',
        fontSize: '18px',
        color: '#e4cf9b',
        fontStyle: 'bold',
      }
    );
    this.nameText.setOrigin(0.5);
    this.container.add(this.nameText);
    
    // === DIALOGUE TEXT ===
    const textX = portraitSize + 30;
    const textWidth = this.boxWidth - portraitSize - 60;
    
    this.dialogueText = this.scene.add.text(
      textX,
      55,
      '',
      {
        fontFamily: 'Courier New',
        fontSize: '16px',
        color: '#f5f1e5',
        wordWrap: { width: textWidth, useAdvancedWrap: true },
        lineSpacing: 4,
      }
    );
    this.container.add(this.dialogueText);
    
    // === CONTINUE ARROW (Flashing ▼) ===
    this.continueArrow = this.scene.add.triangle(
      this.boxWidth - 30,
      this.boxHeight - 20,
      0, 10,
      5, 0,
      10, 10,
      0xe4cf9b
    );
    this.continueArrow.setVisible(false);
    this.container.add(this.continueArrow);
    
    // === SKIP BUTTON (3DS Style) ===
    this.createSkipButton();
    
    // === PRESS [A] PROMPT (Pokemon-style) ===
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
    
    // Initially hidden
    this.container.setVisible(false);
  }
  
  private createSkipButton(): void {
    this.skipButton = this.scene.add.container(70, this.boxHeight - 25);
    
    // Skip button background
    this.skipButtonBg = this.scene.add.rectangle(
      0,
      0,
      60,
      24,
      0x4a3a2a,
      0.8
    );
    this.skipButtonBg.setStrokeStyle(2, 0x8b7355);
    this.skipButtonBg.setInteractive({ useHandCursor: true });
    this.skipButton.add(this.skipButtonBg);
    
    // Skip button text (Pokemon-style: B/Shift)
    this.skipButtonText = this.scene.add.text(
      0,
      0,
      'B/Shift',
      {
        fontFamily: 'Courier New',
        fontSize: '11px',
        color: '#b4945a',
        fontStyle: 'bold',
      }
    );
    this.skipButtonText.setOrigin(0.5);
    this.skipButton.add(this.skipButtonText);
    
    // Hover effects
    this.skipButtonBg.on('pointerover', () => {
      this.skipButtonBg.setFillStyle(0x5a4a3a);
    });
    
    this.skipButtonBg.on('pointerout', () => {
      this.skipButtonBg.setFillStyle(0x4a3a2a);
    });
    
    this.skipButtonBg.on('pointerdown', () => {
      this.handleSkip();
    });
    
    this.skipButton.setVisible(false);
    this.container.add(this.skipButton);
  }
  
  private setupInputs(): void {
    // GBA Style: B key or Shift to skip
    const skipHandler = (event: KeyboardEvent) => {
      if (!this.visible) return;
      
      if (event.key === 'b' || event.key === 'B' || event.key === 'Backspace' || event.key === 'Shift') {
        event.preventDefault();
        this.handleSkip();
        return;
      }
    };
    
    window.addEventListener('keydown', skipHandler);
    (this.container as any).skipHandler = skipHandler;
    
    // Advance dialogue (A key or Space)
    const advanceHandler = (event: KeyboardEvent) => {
      if (!this.visible) return;
      
      // A key or Space to advance
      if (event.key === 'a' || event.key === 'A' || event.key === 'Space' || event.key === ' ') {
        event.preventDefault();
        
        if (this.isTyping) {
          this.handleSkip();
        } else {
          this.advance();
        }
      }
    };
    
    window.addEventListener('keydown', advanceHandler);
    (this.container as any).advanceHandler = advanceHandler;
    
    // Click to advance
    this.scene.input.on('pointerdown', () => {
      if (!this.visible) return;
      
      if (this.isTyping) {
        this.handleSkip();
      } else {
        this.advance();
      }
    });
  }
  
  /**
   * handleSkip() - GBA/3DS Style Skip Logic
   * 
   * ReAct Chain-of-Thought:
   * - THOUGHT: Check if currently typing or at end of text
   * - ACTION: 
   *   IF isTyping == true: Set charIndex to max (finish animation)
   *   IF isTyping == false: Trigger closeDialogue() or nextPage()
   */
  private handleSkip(): void {
    if (this.isTyping) {
      // === GBA STYLE: FAST-FORWARD ===
      // If typing, finish the animation immediately
      this.skipTypewriter();
    } else {
      // === 3DS STYLE: SKIP DIALOGUE ===
      // If not typing, check if we've seen this dialogue before
      if (this.currentNode && this.hasSeenDialogue.has(this.currentNode.id)) {
        // Seen before - close dialogue
        this.close();
      } else {
        // First time - advance to next
        this.advance();
      }
    }
  }
  
  /**
   * Skip the typewriter effect and show full text immediately
   */
  private skipTypewriter(): void {
    // Destroy the timer
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
      this.typewriterTimer = null;
    }
    
    // Show full text immediately
    this.charIndex = this.fullText.length;
    this.displayedText = this.fullText;
    this.dialogueText.setText(this.displayedText);
    
    // Update state
    this.isTyping = false;
    
    // Mark as seen if we have a node
    if (this.currentNode) {
      this.hasSeenDialogue.add(this.currentNode.id);
    }
    
    // Show continue arrow
    this.showContinueArrow();
    
    // Call completion callback
    this.onTextComplete();
  }
  
  private showContinueArrow(): void {
    this.continueArrow.setVisible(true);
    
    // Start blinking animation
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
  
  private hideContinueArrow(): void {
    this.continueArrow.setVisible(false);
    this.hidePressAPrompt();
    if (this.arrowBlinkTimer) {
      this.arrowBlinkTimer.destroy();
      this.arrowBlinkTimer = null;
    }
  }
  
  private playTypewriterEffect(text: string): void {
    // Clean up existing timer
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
    
    // Start typewriter
    this.typewriterTimer = this.scene.time.addEvent({
      delay: this.typewriterSpeed,
      repeat: text.length - 1,
      callback: () => {
        this.charIndex++;
        this.displayedText = text.substring(0, this.charIndex);
        this.dialogueText.setText(this.displayedText);
        
        // Play typewriter sound (every 2nd character for performance) - Pokemon-style GBA feel
        if (this.charIndex % 2 === 0 && this.scene.sound) {
          const pitch = 1.0 + (Math.random() * 0.2 - 0.1); // Slight pitch variation (1.0 +/- 0.1)
          try {
            this.scene.sound.play('typewriter_beep', { 
              volume: 0.3,
              rate: pitch 
            });
          } catch (e) {
            // Fallback: sound file may not exist, continue silently
          }
        }
        
        if (this.charIndex >= text.length) {
          this.isTyping = false;
          this.hasSeenDialogue.add(this.currentNode?.id);
          this.onTextComplete();
        }
      }
    });
  }
  
  private onTextComplete(): void {
    this.showContinueArrow();
    this.showPressAPrompt();
    
    if (this.currentNode?.choices && this.currentNode.choices.length > 0) {
      this.showChoices(this.currentNode.choices);
    } else if (!this.currentNode?.nextNodeId) {
      this.showCloseIndicator();
    }
  }
  
  private showPressAPrompt(): void {
    this.pressAPrompt.setVisible(true);
  }
  
  private hidePressAPrompt(): void {
    this.pressAPrompt.setVisible(false);
  }
  
  private showCloseIndicator(): void {
    // Change arrow to indicate close
    this.continueArrow.setFillStyle(0xb4945a);
    
    // Hide skip button when at end
    this.skipButton.setVisible(false);
  }
  
  private advance(): void {
    // Hide arrow, prompt, and skip button
    this.hideContinueArrow();
    this.hidePressAPrompt();
    
    if (this.currentNode?.choices && this.currentNode.choices.length > 0) {
      return; // Don't advance when choices are shown
    }
    
    if (this.currentNode?.nextNodeId) {
      this.loadNextNode(this.currentNode.nextNodeId);
    } else {
      this.close();
    }
  }
  
  private loadNextNode(nodeId: string): void {
    if (!this.currentNpcId) {
      this.close();
      return;
    }
    
    // Import dynamically to avoid circular dependencies
    import('../data/npcs.js').then(({ getNPCById }) => {
      const npcData = getNPCById(this.currentNpcId!);
      if (!npcData) {
        this.close();
        return;
      }
      
      const nextNode = npcData.dialogueLines.find((n: any) => n.id === nodeId);
      if (nextNode) {
        this.displayNode(nextNode);
        window.gameState?.recordDialogue(this.currentNpcId!, nodeId);
      } else {
        this.close();
      }
    });
  }
  
  private displayNode(node: any): void {
    this.currentNode = node;
    this.nameText.setText(node.speaker);
    this.clearChoices();
    this.skipButton.setVisible(true);
    this.hidePressAPrompt(); // Hide during typing
    this.playTypewriterEffect(node.text);
  }
  
  private showChoices(choices: Array<any>): void {
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
        buttonX + buttonWidth / 2,
        y + index * 42,
        buttonWidth,
        buttonHeight,
        0x3d3d3d
      );
      buttonBg.setStrokeStyle(2, 0x6b5b4b);
      buttonBg.setInteractive({ useHandCursor: true });
      
      const buttonText = this.scene.add.text(
        buttonX + 20,
        y + index * 42,
        choice.text,
        {
          fontFamily: 'Courier New',
          fontSize: '14px',
          color: '#f5f1e5',
        }
      );
      buttonText.setOrigin(0, 0.5);
      
      // Check requirements
      let meetsRequirements = true;
      if (choice.requirements && playerStats) {
        for (const [stat, requiredValue] of Object.entries(choice.requirements)) {
          if (playerStats[stat as keyof typeof playerStats] < (requiredValue as number)) {
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
        buttonBg.on('pointerdown', () => {
          this.selectChoice(choice, index);
        });
        
        buttonBg.on('pointerover', () => {
          buttonBg.setFillStyle(0x4d4d4d);
        });
        
        buttonBg.on('pointerout', () => {
          buttonBg.setFillStyle(0x3d3d3d);
        });
      }
      
      const choiceContainer = this.scene.add.container(0, 0, [buttonBg, buttonText]);
      this.container.add(choiceContainer);
      this.choiceButtons.push(choiceContainer);
    });
  }
  
  private selectChoice(choice: any, index: number): void {
    if (choice.unlocks?.clueIds) {
      const ClueManager = (window as any).ClueManager;
      if (ClueManager) {
        choice.unlocks.clueIds.forEach((clueId: string) => {
          ClueManager.addClueById(clueId);
        });
      }
    }
    
    this.loadNextNode(choice.nextNodeId);
  }
  
  private clearChoices(): void {
    this.choiceButtons.forEach(btn => btn.destroy());
    this.choiceButtons = [];
    
    // Clear prompts
    const promptObjects = this.container.list.filter((obj: any) =>
      obj instanceof Phaser.GameObjects.Text &&
      obj.text &&
      (obj.text.includes('[') || obj.text.includes('▼'))
    );
    promptObjects.forEach((obj: any) => obj.destroy());
  }
  
  public startDialogue(npcId: string, startNodeId?: string): void {
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
      
      // Set portrait
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
  
  public close(): void {
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
  
  public isVisible(): boolean {
    return this.visible;
  }
  
  public destroy(): void {
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
    }
    
    if (this.arrowBlinkTimer) {
      this.arrowBlinkTimer.destroy();
    }
    
    if ((this.container as any)?.skipHandler) {
      window.removeEventListener('keydown', (this.container as any).skipHandler);
    }
    
    if ((this.container as any)?.advanceHandler) {
      window.removeEventListener('keydown', (this.container as any).advanceHandler);
    }
    
    this.container.destroy();
  }
  
  // Getters for external access
  public getIsTyping(): boolean {
    return this.isTyping;
  }
  
  public getCurrentNodeId(): string | null {
    return this.currentNode?.id || null;
  }
  
  public hasSeenCurrentNode(): boolean {
    return this.currentNode ? this.hasSeenDialogue.has(this.currentNode.id) : true;
  }
}

export default DialogueBoxUI;
