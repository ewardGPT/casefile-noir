import type { Clue, InventoryItem } from './GameState.js';

export interface ClueData {
  id: string;
  title: string;
  description: string;
  fullDescription?: string;
  suspectTags: string[];
  obtainedFromNpcId?: string;
  obtainedFromLocation?: string;
  imageUrl?: string;
  observationDetail?: string;
}

const CLUE_DATABASE: Record<string, ClueData> = {
  'clue_willy_witness': {
    id: 'clue_willy_witness',
    title: 'Old Willy\'s Testimony',
    description: 'Old Willy saw a tall man carrying someone toward the woods.',
    fullDescription: 'The old man\'s testimony suggests the victim was abducted, not killed at the scene. The tall figure could be any of several suspects.',
    suspectTags: ['aaron_kosminski', 'mr_finch', 'samuel_atwell', 'headmaster_whitcombe'],
    obtainedFromLocation: 'pennyworth_lane',
  },

  'clue_finch_letter': {
    id: 'clue_finch_letter',
    title: 'Hidden Letter',
    description: 'A romantic letter from Lillian to an unnamed recipient.',
    fullDescription: 'The letter expresses Lillian\'s secret feelings for someone at the school. The handwriting appears rushed and emotional.',
    suspectTags: ['mr_finch', 'samuel_atwell'],
    obtainedFromLocation: 'school',
    observationDetail: 'Higher Observation reveals the letter contains hidden references to late-night meetings.',
  },

  'clue_diary': {
    id: 'clue_diary',
    title: 'Lillian\'s Diary',
    description: 'A diary revealing Lillian\'s troubled thoughts and relationships.',
    fullDescription: 'Entries show Lillian was being blackmailed. She was meeting someone in exchange for protection from a secret.',
    suspectTags: ['headmaster_whitcombe', 'mr_finch', 'evie_moreland'],
    obtainedFromLocation: 'harrow_residence',
    observationDetail: 'Higher Observation reveals coded messages pointing to Whitcombe\'s office.',
  },

  'clue_bloody_cloth': {
    id: 'clue_bloody_cloth',
    title: 'Bloodied Cloth',
    description: 'A piece of cloth with dried blood, found in Risky Passage.',
    fullDescription: 'The cloth appears to be torn from a uniform. Blood type matches the victim. This places a suspect at a location they shouldn\'t have been.',
    suspectTags: ['samuel_atwell', 'aaron_kosminski'],
    obtainedFromLocation: 'risky_passage',
    observationDetail: 'Higher Observation reveals the cloth has a distinctive monogram: "KA".',
  },

  'clue_ledger': {
    id: 'clue_ledger',
    title: 'Blackmail Ledger',
    description: 'A list of students and faculty with payments recorded.',
    fullDescription: 'Whitcombe has been systematically blackmailing students and collecting protection money. Lillian Harrow was on his list - marked with a skull symbol.',
    suspectTags: ['headmaster_whitcombe'],
    obtainedFromLocation: 'lions_den',
    observationDetail: 'Higher Logic reveals payments increased significantly in the month before Lillian\'s death.',
  },

  'clue_whitcombe_meeting': {
    id: 'clue_whitcombe_meeting',
    title: 'Suspicious Meeting Note',
    description: 'A note mentioning a late-night meeting with "the city man".',
    fullDescription: 'The note, found in Whitcombe\'s desk, confirms regular meetings with Aaron Kosminski\'s representative.',
    suspectTags: ['headmaster_whitcombe', 'arthur_kosminski', 'aaron_kosminski'],
    obtainedFromNpcId: 'arthur_kosminski',
  },

  'clue_evie_jealousy': {
    id: 'clue_evie_jealousy',
    title: 'Evelyn\'s Jealousy',
    description: 'Evidence of Evelyn\'s intense jealousy toward Lillian.',
    fullDescription: 'Evelyn was devastated when Lillian began spending time with others. Witnesses report heated arguments between the two.',
    suspectTags: ['evie_moreland'],
    obtainedFromNpcId: 'evie_moreland',
    observationDetail: 'Higher Empathy reveals Evelyn\'s jealousy was born from fear of losing her only friend.',
  },

  'clue_samuel_obsession': {
    id: 'clue_samuel_obsession',
    title: 'Samuel\'s Obsession',
    description: 'Love poems and stalking diary entries.',
    fullDescription: 'Samuel kept a detailed record of Lillian\'s movements. His poems reveal escalating obsession and possessiveness.',
    suspectTags: ['samuel_atwell'],
    obtainedFromNpcId: 'samuel_atwell',
    observationDetail: 'Higher Intimidation forces Samuel to admit he threatened Lillian.',
  },

  'clue_finn_alibi_broken': {
    id: 'clue_finch_alibi_broken',
    title: 'Broken Alibi',
    description: 'Witness contradicts Finch\'s late-night tutoring claim.',
    fullDescription: 'Janitor reports Finch was not in his classroom on the night of the abduction. He was seen entering the woods with someone.',
    suspectTags: ['mr_finch'],
    obtainedFromNpcId: 'beatrice_holloway',
    observationDetail: 'Higher Charisma convinces Beatrice to reveal she\'s been covering for Finch.',
  },

  'clue_final_proof': {
    id: 'clue_final_proof',
    title: 'Final Evidence',
    description: 'Definitive proof of the killer\'s identity.',
    fullDescription: 'Combining all clues, the killer\'s identity becomes clear. The true perpetrator has been manipulating events from the shadows.',
    suspectTags: ['aaron_kosminski'],
  },
};

export class ClueManager {
  private clues: Map<string, Clue> = new Map();

  public addClue(clueData: ClueData): void {
    if (this.clues.has(clueData.id)) return;

    const DopamineEffects = (window as any).DopamineEffects;
    if (DopamineEffects) {
      DopamineEffects.showClueFound(clueData.title);
    }

    const gameState = window.gameState;
    const playerStats = gameState?.getPlayerStats();

    const clue: Clue = {
      id: clueData.id,
      title: clueData.title,
      description: this.getClueDescription(clueData, playerStats?.observation || 2),
      suspectTags: clueData.suspectTags,
      obtainedFromNpcId: clueData.obtainedFromNpcId,
      obtainedFromLocation: clueData.obtainedFromLocation,
      timestamp: Date.now(),
      isAnalyzed: playerStats?.logic >= 4,
    };

    this.clues.set(clueData.id, clue);

    const inventoryItem: InventoryItem = {
      id: clueData.id,
      title: clueData.title,
      description: clue.description,
      type: 'clue',
      imageUrl: clueData.imageUrl,
      obtainedFromNpcId: clueData.obtainedFromNpcId,
      timestamp: Date.now(),
    };

    gameState?.addToInventory(inventoryItem);
    gameState?.addClue(clue);

    window.gameState?.addToTimeline(`Found clue: ${clueData.title}`);

    const HUD = (window as any).HUD;
    if (HUD) {
      HUD.showNotification(`+ Clue: ${clueData.title}`);
      this.showStatPopup(gameState!, 'Observation', 1);
    }

    const NotebookSystem = (window as any).NotebookSystem;
    if (NotebookSystem) {
      NotebookSystem.addClueEntry(clue);
    }

    const kosminskiNote = `New clue acquired: ${clueData.title}. ${clueData.fullDescription || clueData.description}`;
    if (NotebookSystem) {
      NotebookSystem.addKosminskiNote(kosminskiNote, 'Kosminski');
    }
  }

  private getClueDescription(clueData: ClueData, observationLevel: number): string {
    if (observationLevel >= 5 && clueData.fullDescription) {
      return clueData.fullDescription;
    }
    return clueData.description;
  }

  public addClueById(clueId: string): void {
    const clueData = CLUE_DATABASE[clueId];
    if (clueData) {
      this.addClue(clueData);
    }
  }

  public getClue(clueId: string): Clue | undefined {
    return this.clues.get(clueId);
  }

  public getAllClues(): Clue[] {
    return Array.from(this.clues.values());
  }

  public getCluesForSuspect(suspectId: string): Clue[] {
    return Array.from(this.clues.values()).filter(clue =>
      clue.suspectTags.includes(suspectId)
    );
  }

  public getClueCountForSuspect(suspectId: string): number {
    return this.getCluesForSuspect(suspectId).length;
  }

  public canAccuse(suspectId: string): boolean {
    return this.getClueCountForSuspect(suspectId) >= 3;
  }

  public analyzeClue(clueId: string): void {
    const clue = this.clues.get(clueId);
    if (clue && !clue.isAnalyzed) {
      const clueData = CLUE_DATABASE[clueId];
      if (clueData?.fullDescription) {
        clue.isAnalyzed = true;
        clue.description = clueData.fullDescription;

        const HUD = (window as any).HUD;
        if (HUD) {
          HUD.showNotification(`Clue analyzed: ${clue.title}`);
          this.showStatPopup(window.gameState!, 'Logic', 1);
        }

        window.gameState?.addToTimeline(`Analyzed clue: ${clue.title}`);
      }
    }
  }

  private showStatPopup(gameState: any, stat: string, amount: number): void {
    const scene = (window as any).game?.scene?.getScene('Game');
    if (!scene) return;

    const camera = scene.cameras.main;
    const popup = scene.add.text(
      camera.worldView.x + camera.width / 2,
      camera.worldView.y + 100,
      `+${amount} ${stat}`,
      {
        fontFamily: 'Courier New',
        fontSize: '24px',
        color: '#00ff00',
        fontStyle: 'bold',
        backgroundColor: '#000000',
        padding: { x: 10, y: 5 },
      }
    );
    popup.setOrigin(0.5);
    popup.setDepth(3000);

    scene.tweens.add({
      targets: popup,
      y: popup.y - 50,
      alpha: 0,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => popup.destroy(),
    });

    const statLower = stat.toLowerCase() as any;
    gameState.updateStat(statLower, amount);
  }

  public reset(): void {
    this.clues.clear();
  }
}
