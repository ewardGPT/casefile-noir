/**
 * GameState Singleton
 * Manages all game state in a centralized, type-safe manner
 */

export interface PlayerStats {
  observation: number;
  logic: number;
  charisma: number;
  intimidation: number;
  empathy: number;
}

export interface InventoryItem {
  id: string;
  title: string;
  description: string;
  type: 'clue' | 'wearable' | 'story' | 'weapon';
  imageUrl?: string;
  obtainedFromNpcId?: string;
  timestamp: number;
}

export interface Clue {
  id: string;
  title: string;
  description: string;
  suspectTags: string[];
  obtainedFromNpcId?: string;
  obtainedFromLocation?: string;
  timestamp: number;
  isAnalyzed: boolean;
}

export interface Suspect {
  id: string;
  name: string;
  portraitKey: string;
  isAccused: boolean;
  arrestedByPlayer: boolean;
  cluesAttached: string[];
  statements: Array<{
    text: string;
    from: string;
    timestamp: number;
  }>;
}

export interface DialogueNode {
  id: string;
  speaker: string;
  text: string;
  nextNodeId?: string;
  choices?: Array<{
    text: string;
    nextNodeId: string;
    requirements?: Partial<PlayerStats>;
    unlocks?: {
      clueIds?: string[];
      questUpdates?: string[];
    };
  }>;
  unlocks?: {
    clueIds?: string[];
    questUpdates?: string[];
  };
}

export type ObjectiveType = 'TALK_TO_NPC' | 'GO_TO_LOCATION' | 'COLLECT_CLUE' | 'ACCUSE_SUSPECT' | 'ARREST_SUSPECT';

export interface Objective {
  id: string;
  type: ObjectiveType;
  description: string;
  targetId?: string;
  completed: boolean;
}

export interface Quest {
  questId: string;
  title: string;
  description: string;
  stage: number;
  objectives: Objective[];
  completed: boolean;
}

export interface GameStateData {
  playerStats: PlayerStats;
  inventory: InventoryItem[];
  clues: Clue[];
  suspects: Record<string, Suspect>;
  quests: Quest[];
  currentQuestId: string | null;
  timeline: Array<{
    text: string;
    timestamp: number;
  }>;
  day: number;
  location: string;
  detectiveSenseActive: boolean;
  dialogueHistory: Array<{
    npcId: string;
    nodeId: string;
    timestamp: number;
  }>;
}

class GameState {
  private static instance: GameState;
  private state: GameStateData;
  private listeners: Set<() => void> = new Set();
  private readonly STORAGE_KEY = 'detectiveGameState';

  private constructor() {
    this.state = this.loadState() || this.getInitialState();
  }

  public static getInstance(): GameState {
    if (!GameState.instance) {
      GameState.instance = new GameState();
    }
    return GameState.instance;
  }

  private getInitialState(): GameStateData {
    return {
      playerStats: {
        observation: 3,
        logic: 2,
        charisma: 2,
        intimidation: 1,
        empathy: 2
      },
      inventory: [],
      clues: [],
      suspects: {},
      quests: [],
      currentQuestId: null,
      timeline: [],
      day: 1,
      location: 'police_station',
      detectiveSenseActive: false,
      dialogueHistory: []
    };
  }

  private loadState(): GameStateData | null {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load game state:', e);
    }
    return null;
  }

  private saveState(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
      this.notifyListeners();
    } catch (e) {
      console.error('Failed to save game state:', e);
    }
  }

  public getState(): Readonly<GameStateData> {
    return this.state;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  // Player Stats
  public updateStat(stat: keyof PlayerStats, delta: number): void {
    this.state.playerStats[stat] = Math.max(1, Math.min(10, this.state.playerStats[stat] + delta));
    this.saveState();
  }

  public getStat(stat: keyof PlayerStats): number {
    return this.state.playerStats[stat];
  }

  public getPlayerStats(): PlayerStats {
    return { ...this.state.playerStats };
  }

  // Inventory
  public addToInventory(item: InventoryItem): void {
    const existingIndex = this.state.inventory.findIndex(i => i.id === item.id);
    if (existingIndex >= 0) {
      this.state.inventory[existingIndex] = item;
    } else {
      this.state.inventory.push(item);
    }
    this.saveState();
  }

  public removeFromInventory(itemId: string): void {
    this.state.inventory = this.state.inventory.filter(i => i.id !== itemId);
    this.saveState();
  }

  public getInventory(): InventoryItem[] {
    return [...this.state.inventory];
  }

  public hasInventoryItem(itemId: string): boolean {
    return this.state.inventory.some(i => i.id === itemId);
  }

  // Clues
  public addClue(clue: Clue): void {
    if (!this.state.clues.some(c => c.id === clue.id)) {
      this.state.clues.push(clue);

      // Tag suspects with this clue
      clue.suspectTags.forEach(suspectId => {
        if (!this.state.suspects[suspectId]) {
          this.state.suspects[suspectId] = {
            id: suspectId,
            name: suspectId,
            portraitKey: `portrait_${suspectId}`,
            isAccused: false,
            arrestedByPlayer: false,
            cluesAttached: [],
            statements: []
          };
        }
        if (!this.state.suspects[suspectId].cluesAttached.includes(clue.id)) {
          this.state.suspects[suspectId].cluesAttached.push(clue.id);
        }
      });

      this.saveState();
    }
  }

  public getClues(): Clue[] {
    return [...this.state.clues];
  }

  public getCluesForSuspect(suspectId: string): Clue[] {
    const suspect = this.state.suspects[suspectId];
    if (!suspect) return [];
    return this.state.clues.filter(clue => suspect.cluesAttached.includes(clue.id));
  }

  public getClueCountForSuspect(suspectId: string): number {
    const suspect = this.state.suspects[suspectId];
    return suspect ? suspect.cluesAttached.length : 0;
  }

  // Suspects
  public addSuspectStatement(suspectId: string, text: string, from: string): void {
    if (!this.state.suspects[suspectId]) {
      this.state.suspects[suspectId] = {
        id: suspectId,
        name: suspectId,
        portraitKey: `portrait_${suspectId}`,
        isAccused: false,
        arrestedByPlayer: false,
        cluesAttached: [],
        statements: []
      };
    }
    this.state.suspects[suspectId].statements.push({
      text,
      from,
      timestamp: Date.now()
    });
    this.saveState();
  }

  public getSuspect(suspectId: string): Suspect | undefined {
    return this.state.suspects[suspectId];
  }

  public getAllSuspects(): Suspect[] {
    return Object.values(this.state.suspects);
  }

  public arrestSuspect(suspectId: string): void {
    if (this.state.suspects[suspectId]) {
      this.state.suspects[suspectId].arrestedByPlayer = true;
      this.addToTimeline(`Arrested ${suspectId}`);
      this.saveState();
    }
  }

  // Quests
  public addQuest(quest: Quest): void {
    this.state.quests.push(quest);
    if (!this.state.currentQuestId) {
      this.state.currentQuestId = quest.questId;
    }
    this.saveState();
  }

  public completeObjective(questId: string, objectiveId: string): void {
    const quest = this.state.quests.find(q => q.questId === questId);
    if (quest) {
      const objective = quest.objectives.find(o => o.id === objectiveId);
      if (objective) {
        objective.completed = true;

        // Check if quest is complete
        if (quest.objectives.every(o => o.completed)) {
          quest.completed = true;
        }

        this.saveState();
      }
    }
  }

  public getCurrentQuest(): Quest | undefined {
    if (!this.state.currentQuestId) return undefined;
    return this.state.quests.find(q => q.questId === this.state.currentQuestId);
  }

  public getAllQuests(): Quest[] {
    return [...this.state.quests];
  }

  public advanceQuestStage(questId: string): void {
    const quest = this.state.quests.find(q => q.questId === questId);
    if (quest) {
      quest.stage++;
      this.saveState();
    }
  }

  // Timeline
  public addToTimeline(text: string): void {
    this.state.timeline.push({
      text,
      timestamp: Date.now()
    });
    this.saveState();
  }

  public getTimeline(): Array<{ text: string; timestamp: number }> {
    return [...this.state.timeline];
  }

  // Location & Day
  public setLocation(location: string): void {
    this.state.location = location;
    this.saveState();
  }

  public getLocation(): string {
    return this.state.location;
  }

  public setDay(day: number): void {
    this.state.day = day;
    this.saveState();
  }

  public getDay(): number {
    return this.state.day;
  }

  // Detective Sense
  public setDetectiveSense(active: boolean): void {
    this.state.detectiveSenseActive = active;
    this.saveState();
  }

  public isDetectiveSenseActive(): boolean {
    return this.state.detectiveSenseActive;
  }

  // Dialogue History
  public recordDialogue(npcId: string, nodeId: string): void {
    this.state.dialogueHistory.push({
      npcId,
      nodeId,
      timestamp: Date.now()
    });
    this.saveState();
  }

  public hasVisitedDialogue(npcId: string, nodeId: string): boolean {
    return this.state.dialogueHistory.some(
      d => d.npcId === npcId && d.nodeId === nodeId
    );
  }

  // Reset
  public reset(): void {
    this.state = this.getInitialState();
    localStorage.removeItem(this.STORAGE_KEY);
    this.saveState();
  }
}

export default GameState.getInstance();
