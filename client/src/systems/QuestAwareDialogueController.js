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

export class QuestAwareDialogueController {
  constructor(config) {
    this.scene = config.scene;
    this.onDialogueReady = config.onDialogueReady;
    this.onPromptComplete = config.onPromptComplete;
    this.currentQuestId = null;
    this.currentObjectiveId = null;
    this.typewriterEnabled = true;
    this.typewriterSpeed = 30;
  }

  processDialogue(baseDialogue, npcId, questId = null, objectiveId = null) {
    const activeQuestId = questId || this.currentQuestId;
    const activeObjectiveId = objectiveId || this.currentObjectiveId;
    return this.enhanceDialogueWithQuest(baseDialogue, activeQuestId, activeObjectiveId);
  }

  enhanceDialogueWithQuest(baseDialogue, questId, objectiveId) {
    if (!questId || !isQuestActive(questId)) return baseDialogue;
    if (hasTutorialShown(questId)) return baseDialogue;
    
    if (objectiveId && shouldInjectPrompt(questId, objectiveId)) {
      const buttonPrompt = getQuestButtonPrompt(questId);
      if (buttonPrompt) {
        setTutorialShown(questId, true);
        return `${baseDialogue} (Press ${buttonPrompt.primary} ${buttonPrompt.action}).`;
      }
    }
    return baseDialogue;
  }

  processDialogueWithTypewriter(baseDialogue, npcId, questId = null, objectiveId = null, onComplete) {
    const enhancedDialogue = this.processDialogue(baseDialogue, npcId, questId, objectiveId);
    
    if (this.typewriterEnabled) {
      this.playTypewriterEffect(enhancedDialogue, onComplete);
    } else {
      this.onDialogueReady(enhancedDialogue);
      onComplete?.();
    }
  }

  playTypewriterEffect(text, onComplete) {
    let index = 0;
    if (this.scene.typewriterTimer) {
      this.scene.typewriterTimer.destroy();
    }

    this.scene.typewriterTimer = this.scene.time.addEvent({
      delay: this.typewriterSpeed,
      repeat: text.length - 1,
      callback: () => {
        index++;
        this.onDialogueReady(text.substring(0, index));
        if (index >= text.length) {
          this.onPromptComplete?.();
          onComplete?.();
        }
      }
    });

    this.onDialogueReady(text.substring(0, 1));
  }

  skipTypewriter(text) {
    if (this.scene.typewriterTimer) {
      this.scene.typewriterTimer.destroy();
    }
    this.onDialogueReady(text);
  }

  setQuestContext(questId, objectiveId) {
    this.currentQuestId = questId;
    this.currentObjectiveId = objectiveId || null;
  }

  clearQuestContext() {
    this.currentQuestId = null;
    this.currentObjectiveId = null;
  }

  shouldShowTutorialPrompt() {
    if (!this.currentQuestId) return false;
    return isQuestActive(this.currentQuestId) && !hasTutorialShown(this.currentQuestId);
  }

  markTutorialShown() {
    if (this.currentQuestId) {
      setTutorialShown(this.currentQuestId, true);
    }
  }

  setTypewriterEnabled(enabled) {
    this.typewriterEnabled = enabled;
  }

  setTypewriterSpeed(speed) {
    this.typewriterSpeed = Math.max(10, speed);
  }

  getButtonPrompt() {
    return getActionButtonPrompt();
  }

  getDebugInfo() {
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
