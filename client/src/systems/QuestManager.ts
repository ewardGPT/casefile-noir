import type { Quest, Objective, ObjectiveType } from './GameState.js';
import { QUEST_DATA, getAvailableQuests, getActivePathQuest } from '../data/quests.js';

export class QuestManager {
  private quests: Record<string, Quest> = {};
  private currentQuestId: string | null = null;
  private objectiveListeners: Map<string, Set<(completed: boolean) => void>> = new Map();

  constructor() {
    this.loadQuests();
  }

  private loadQuests(): void {
    const day = window.gameState?.getDay() || 1;
    const availableQuests = getAvailableQuests(day);

    availableQuests.forEach(quest => {
      this.quests[quest.questId] = { ...quest };
    });

    if (availableQuests.length > 0) {
      this.currentQuestId = availableQuests[0].questId;
    }
  }

  public getCurrentQuest(): Quest | undefined {
    if (!this.currentQuestId) return undefined;
    return this.quests[this.currentQuestId];
  }

  public getAllQuests(): Quest[] {
    return Object.values(this.quests);
  }

  public getQuest(questId: string): Quest | undefined {
    return this.quests[questId];
  }

  public getCurrentObjective(): Objective | undefined {
    const quest = this.getCurrentQuest();
    if (!quest) return undefined;

    return quest.objectives.find(obj => !obj.completed);
  }

  public setObjectiveTarget(objectiveId: string, targetId: string): void {
    Object.values(this.quests).forEach(quest => {
      const objective = quest.objectives.find(obj => obj.id === objectiveId);
      if (objective) {
        objective.targetId = targetId;
      }
    });
  }

  public completeObjective(objectiveId: string): void {
    Object.values(this.quests).forEach(quest => {
      const objective = quest.objectives.find(obj => obj.id === objectiveId);
      if (objective && !objective.completed) {
        objective.completed = true;

        const listeners = this.objectiveListeners.get(objectiveId);
        if (listeners) {
          listeners.forEach(listener => listener(true));
        }

        const DopamineEffects = (window as any).DopamineEffects;
        if (DopamineEffects) {
          DopamineEffects.showObjectiveComplete(objective.description);
        }

        this.checkQuestComplete(quest);
      }
    });
  }

  private checkQuestComplete(quest: Quest): void {
    if (quest.objectives.every(obj => obj.completed)) {
      quest.completed = true;

      const DopamineEffects = (window as any).DopamineEffects;
      if (DopamineEffects) {
        DopamineEffects.showQuestComplete(quest.title);
      }

      if (quest.questId === 'day_1_investigation') {
        this.startDay2();
      }

      window.gameState?.addToTimeline(`Completed: ${quest.title}`);
    }
  }

  private startDay2(): void {
    window.gameState?.setDay(2);

    const day2Quests = getAvailableQuests(2);
    day2Quests.forEach(quest => {
      this.quests[quest.questId] = { ...quest };
    });

    this.currentQuestId = 'day_2_deep_dive';

    const HUD = (window as any).HUD;
    if (HUD) {
      HUD.showNotification('Day 2 - Select a suspect to investigate');
    }
  }

  public selectPath(pathId: string): void {
    const pathQuest = getActivePathQuest(pathId);
    if (pathQuest) {
      this.quests[pathQuest.questId] = { ...pathQuest, stage: 1 };
      this.currentQuestId = pathQuest.questId;

      const gameState = window.gameState;
      gameState?.addToTimeline(`Investigation path: ${pathQuest.title}`);
    }
  }

  public updateQuest(questId: string, stage?: number): void {
    if (this.quests[questId]) {
      if (stage !== undefined) {
        this.quests[questId].stage = stage;
      }
    }
  }

  public advanceCurrentQuest(): void {
    if (this.currentQuestId) {
      this.quests[this.currentQuestId].stage++;
    }
  }

  public getCurrentQuestTarget(): { type: ObjectiveType; targetId?: string } | null {
    const objective = this.getCurrentObjective();
    if (!objective) return null;

    return {
      type: objective.type,
      targetId: objective.targetId,
    };
  }

  public getObjectiveDescription(): string {
    const objective = this.getCurrentObjective();
    return objective ? objective.description : 'No active objective';
  }

  public onObjectiveComplete(objectiveId: string, callback: (completed: boolean) => void): () => void {
    if (!this.objectiveListeners.has(objectiveId)) {
      this.objectiveListeners.set(objectiveId, new Set());
    }

    this.objectiveListeners.get(objectiveId)!.add(callback);

    return () => {
      const listeners = this.objectiveListeners.get(objectiveId);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  public reset(): void {
    this.quests = {};
    this.currentQuestId = null;
    this.objectiveListeners.clear();
    this.loadQuests();
  }
}
