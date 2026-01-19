/**
 * Quest-Aware Dialogue Controller
 * 
 * Inspired by Pokémon GBA/3DS dialogue mechanics:
 * - Injects quest-specific button prompts into NPC dialogue
 * - Uses dynamic button mapping from game's input-map
 * - Only shows prompts for active quests with untshown tutorials
 * - Implements typewriter effect for text display
 * 
 * Chain-of-Thought Execution:
 * 1. Intercept NPC dialogue string
 * 2. Check quest_registry.json for current quest ID
 * 3. Concatenate base dialogue with button prompt dialect
 * 4. Pass final string to UI Renderer
 */

import {
  QUEST_REGISTRY,
  getQuestState,
  isQuestActive,
  hasTutorialShown,
  setTutorialShown,
  getQuestButtonPrompt,
  shouldInjectPrompt,
  getInjectedDialogue,
  getActionButtonPrompt
} from '../data/quest_registry.js';
import type { DialogueNode, Objective } from '../systems/GameState.js';

export interface QuestDialogueConfig {
  scene: Phaser.Scene;
  onDialogueReady: (text: string) => void;
  onPromptComplete?: () => void;
}

export interface ButtonMapping {
  primary: string;
  fallback: string;
  pc: string;
  action: string;
}

export class QuestAwareDialogueController {
  private scene: Phaser.Scene;
  private onDialogueReady: (text: string) => void;
  private onPromptComplete?: () => void;
  private currentQuestId: string | null = null;
  private currentObjectiveId: string | null = null;
  private typewriterEnabled: boolean = true;
  private typewriterSpeed: number = 30; // ms per character

  constructor(config: QuestDialogueConfig) {
    this.scene = config.scene;
    this.onDialogueReady = config.onDialogueReady;
    this.onPromptComplete = config.onPromptComplete;
  }

  /**
   * Main entry point: Process NPC dialogue with quest awareness
   * STEP 1: Intercept the NPC dialogue string
   */
  public processDialogue(
    baseDialogue: string,
    npcId: string,
    questId?: string | null,
    objectiveId?: string | null
  ): string {
    // STEP 2: Check quest_registry.json for current quest ID
    const activeQuestId = questId || this.currentQuestId;
    const activeObjectiveId = objectiveId || this.currentObjectiveId;

    // STEP 3: Concatenate base dialogue with button prompt dialect
    const enhancedDialogue = this.enhanceDialogueWithQuest(
      baseDialogue,
      activeQuestId,
      activeObjectiveId
    );

    return enhancedDialogue;
  }

  /**
   * STEP 3: Concatenate base dialogue with "Button Prompt" dialect
   * Only injects prompt if:
   * - Quest State is "Active"
   * - "Tutorial_Shown" flag is false
   */
  private enhanceDialogueWithQuest(
    baseDialogue: string,
    questId: string | null,
    objectiveId: string | null
  ): string {
    // If no quest context, return original dialogue
    if (!questId || !isQuestActive(questId)) {
      return baseDialogue;
    }

    // Check if tutorial has already been shown
    if (hasTutorialShown(questId)) {
      return baseDialogue;
    }

    // Check if this objective should inject a prompt
    if (objectiveId && shouldInjectPrompt(questId, objectiveId)) {
      const buttonPrompt = getQuestButtonPrompt(questId);
      
      if (buttonPrompt) {
        // Mark tutorial as shown for this quest
        setTutorialShown(questId, true);

        // Construct Pokémon-style dialogue with button prompt
        // Format: "Please deliver this parcel! (Press [A] to accept)."
        const actionText = buttonPrompt.action;
        const buttonText = buttonPrompt.primary;

        return `${baseDialogue} (Press ${buttonText} ${actionText}).`;
      }
    }

    return baseDialogue;
  }

  /**
   * Process dialogue and trigger typewriter effect
   * STEP 4: Pass the final string to the UI Renderer
   */
  public processDialogueWithTypewriter(
    baseDialogue: string,
    npcId: string,
    questId?: string | null,
    objectiveId?: string | null,
    onComplete?: () => void
  ): void {
    // STEP 1-3: Process dialogue
    const enhancedDialogue = this.processDialogue(baseDialogue, npcId, questId, objectiveId);

    // STEP 4: Pass to UI Renderer
    if (this.typewriterEnabled) {
      this.playTypewriterEffect(enhancedDialogue, onComplete);
    } else {
      this.onDialogueReady(enhancedDialogue);
      onComplete?.();
    }
  }

  /**
   * Pokémon-style typewriter effect
   * Text scrolls character-by-character
   */
  private playTypewriterEffect(text: string, onComplete?: () => void): void {
    let index = 0;
    let displayedText = '';
    
    // Clear any existing typewriter timer
    if ((this.scene as any).typewriterTimer) {
      (this.scene as any).typewriterTimer.destroy();
    }

    // Create timer event for typewriter effect
    (this.scene as any).typewriterTimer = this.scene.time.addEvent({
      delay: this.typewriterSpeed,
      repeat: text.length - 1,
      callback: () => {
        index++;
        displayedText = text.substring(0, index);
        this.onDialogueReady(displayedText);

        if (index >= text.length) {
          if (this.onPromptComplete) {
            this.onPromptComplete();
          }
          onComplete?.();
        }
      }
    });

    // Initial call to show first character
    this.onDialogueReady(text.substring(0, 1));
  }

  /**
   * Skip typewriter effect and show full text immediately
   */
  public skipTypewriter(text: string): void {
    if ((this.scene as any).typewriterTimer) {
      (this.scene as any).typewriterTimer.destroy();
    }
    this.onDialogueReady(text);
  }

  /**
   * Set current quest context for dialogue processing
   */
  public setQuestContext(questId: string, objectiveId?: string): void {
    this.currentQuestId = questId;
    this.currentObjectiveId = objectiveId || null;
  }

  /**
   * Clear quest context
   */
  public clearQuestContext(): void {
    this.currentQuestId = null;
    this.currentObjectiveId = null;
  }

  /**
   * Check if current quest should show tutorial prompt
   */
  public shouldShowTutorialPrompt(): boolean {
    if (!this.currentQuestId) return false;
    
    return isQuestActive(this.currentQuestId) && 
           !hasTutorialShown(this.currentQuestId);
  }

  /**
   * Manually trigger tutorial shown for current quest
   */
  public markTutorialShown(): void {
    if (this.currentQuestId) {
      setTutorialShown(this.currentQuestId, true);
    }
  }

  /**
   * Enable/disable typewriter effect
   */
  public setTypewriterEnabled(enabled: boolean): void {
    this.typewriterEnabled = enabled;
  }

  /**
   * Set typewriter speed (ms per character)
   */
  public setTypewriterSpeed(speed: number): void {
    this.typewriterSpeed = Math.max(10, speed); // Minimum 10ms
  }

  /**
   * Get current button prompt for display
   */
  public getButtonPrompt(): string {
    return getActionButtonPrompt();
  }

  /**
   * Process dialogue for multiple objectives (chain dialogue)
   */
  public processChainDialogue(
    dialogues: Array<{ text: string; questId?: string; objectiveId?: string }>,
    onComplete?: () => void
  ): void {
    if (dialogues.length === 0) {
      onComplete?.();
      return;
    }

    const current = dialogues[0];
    const remaining = dialogues.slice(1);

    this.processDialogueWithTypewriter(
      current.text,
      '',
      current.questId || this.currentQuestId,
      current.objectiveId || this.currentObjectiveId,
      () => {
        this.processChainDialogue(remaining, onComplete);
      }
    );
  }

  /**
   * Get debug info for current dialogue state
   */
  public getDebugInfo(): object {
    return {
      currentQuestId: this.currentQuestId,
      currentObjectiveId: this.currentObjectiveId,
      typewriterEnabled: this.typewriterEnabled,
      typewriterSpeed: this.typewriterSpeed,
      shouldShowTutorial: this.shouldShowTutorialPrompt(),
      buttonPrompt: this.getButtonPrompt()
    };
  }
}

export default QuestAwareDialogueController;
