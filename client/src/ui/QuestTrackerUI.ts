/**
 * Quest Tracker UI Component
 * Persistent overlay in top-left corner showing current active objective
 * Pulls data from quest_registry.js and displays using 2D pixel font (Noir style)
 */

import { QUEST_REGISTRY, getQuestState, isQuestActive } from '../data/quest_registry.js';

export class QuestTrackerUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Rectangle;
  private headerText: Phaser.GameObjects.Text;
  private objectiveText: Phaser.GameObjects.Text;
  private currentQuestId: string | null = null;
  private currentObjectiveId: string | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createUI();
    this.updateQuestDisplay();
  }

  private createUI(): void {
    // Container positioned in top-left corner
    this.container = this.scene.add.container(20, 20);
    this.container.setScrollFactor(0); // Fixed to screen
    this.container.setDepth(1001); // Above game elements, below UI overlays

    // Semi-transparent dark backing (Noir style) for readability against rainy background
    this.background = this.scene.add.rectangle(
      0,
      0,
      320,
      100,
      0x000000,
      0.85 // High opacity for readability
    );
    this.background.setOrigin(0, 0);
    this.background.setStrokeStyle(2, 0xb4945a, 1.0); // Gold border (Noir aesthetic)

    // Header "CURRENT OBJECTIVE" (2D pixel font style)
    this.headerText = this.scene.add.text(10, 10, 'CURRENT OBJECTIVE', {
      fontFamily: 'Courier New, Courier, monospace',
      fontSize: '12px',
      color: '#b4945a', // Gold color (Noir style)
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 1
    });
    this.headerText.setOrigin(0, 0);

    // Objective text (2D pixel font)
    this.objectiveText = this.scene.add.text(10, 32, 'No active quest.', {
      fontFamily: 'Courier New, Courier, monospace',
      fontSize: '14px',
      color: '#f5f1e5', // Off-white (Noir style)
      wordWrap: { width: 300, useAdvancedWrap: true },
      lineSpacing: 4
    });
    this.objectiveText.setOrigin(0, 0);

    // Add all elements to container
    this.container.add([this.background, this.headerText, this.objectiveText]);

    // Initially visible
    this.container.setVisible(true);
  }

  /**
   * Update quest display from quest_registry.js
   * Syncs with active quest and current objective
   */
  public updateQuestDisplay(): void {
    // Find active quest in QUEST_REGISTRY
    let activeQuest = null;
    let activeObjective = null;

    for (const [questId, questData] of Object.entries(QUEST_REGISTRY)) {
      if (isQuestActive(questId)) {
        activeQuest = questData;
        this.currentQuestId = questId;

        // Find first incomplete objective
        if (questData.objectives) {
          for (const [objectiveId, objectiveData] of Object.entries(questData.objectives)) {
            // For now, show the first objective (can be enhanced with completion tracking)
            activeObjective = objectiveData;
            this.currentObjectiveId = objectiveId;
            break;
          }
        }
        break;
      }
    }

    // DEBUG: Log quest display update
    console.log('📋 Quest Tracker Update:', {
      activeQuest: activeQuest ? activeQuest.questId : 'none',
      activeObjective: activeObjective ? this.currentObjectiveId : 'none',
      containerVisible: this.container ? this.container.visible : false
    });

    if (!activeQuest || !activeObjective) {
      // No active quest - show default Day 1 investigation objective
      const defaultQuest = QUEST_REGISTRY['day_1_investigation'];
      if (defaultQuest && defaultQuest.objectives) {
        const firstObjective = Object.entries(defaultQuest.objectives)[0];
        if (firstObjective) {
          activeQuest = defaultQuest;
          activeObjective = firstObjective[1];
          this.currentQuestId = 'day_1_investigation';
          this.currentObjectiveId = firstObjective[0];
          console.log('📋 Using default quest: day_1_investigation');
        }
      }
      
      if (!activeQuest || !activeObjective) {
        // Still no quest - show placeholder
        this.objectiveText.setText('No active quest.');
        this.container.setAlpha(0.6); // Dimmed when inactive
        return;
      }
    }

    // Update display with active objective
    this.container.setAlpha(1.0); // Full opacity when active

    // Format objective text (Pokemon-style prompt if available)
    let displayText = '';
    if (activeObjective.promptText) {
      displayText = activeObjective.promptText;
      if (activeQuest.buttonPrompt) {
        const buttonText = activeQuest.buttonPrompt.primary || '[E]';
        const actionText = activeQuest.buttonPrompt.action || 'to interact';
        displayText += ` (Press ${buttonText} ${actionText})`;
      }
    } else {
      // Fallback: use objective ID as display text
      displayText = objectiveId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    this.objectiveText.setText(displayText);

    // Flash effect to notify update
    this.scene.tweens.add({
      targets: this.container,
      alpha: { from: 0.3, to: 1.0 },
      duration: 300,
      yoyo: true,
      repeat: 1
    });
  }

  /**
   * Update quest display when quest state changes
   * Call this after quest completion or objective updates
   */
  public refresh(): void {
    this.updateQuestDisplay();
  }

  /**
   * Set specific quest and objective to display
   * @param questId - Quest ID from QUEST_REGISTRY
   * @param objectiveId - Objective ID from quest objectives
   */
  public setQuest(questId: string, objectiveId?: string): void {
    const quest = QUEST_REGISTRY[questId];
    if (!quest) {
      console.warn(`QuestTrackerUI: Quest ${questId} not found in QUEST_REGISTRY`);
      return;
    }

    this.currentQuestId = questId;
    this.currentObjectiveId = objectiveId || null;
    this.updateQuestDisplay();
  }

  /**
   * Hide the quest tracker
   */
  public hide(): void {
    if (this.container) {
      this.container.setVisible(false);
    }
  }

  /**
   * Show the quest tracker
   * CRITICAL: Force visibility and ensure it's not covered by other layers
   */
  public show(): void {
    if (!this.container) {
      console.warn('QuestTrackerUI: Container not initialized, recreating...');
      this.createUI();
    }
    
    // Force visibility and high depth to ensure it's above game layers
    this.container.setVisible(true);
    this.container.setAlpha(1.0);
    this.container.setDepth(10001); // Very high depth to ensure it's on top
    
    // Ensure all child elements are visible
    if (this.background) {
      this.background.setVisible(true);
      this.background.setAlpha(1.0);
    }
    if (this.headerText) {
      this.headerText.setVisible(true);
      this.headerText.setAlpha(1.0);
    }
    if (this.objectiveText) {
      this.objectiveText.setVisible(true);
      this.objectiveText.setAlpha(1.0);
    }
    
    this.updateQuestDisplay();
    console.log('✅ Quest Tracker UI shown and forced visible');
  }

  /**
   * Destroy the UI component
   */
  public destroy(): void {
    if (this.container) {
      this.container.destroy();
    }
  }
}

export default QuestTrackerUI;
