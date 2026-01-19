import {
    setActiveQuest,
    completeActiveQuest,
    loadGameState
} from '../ui/gameState.js';

export const QUEST_DEFINITIONS = {
    'intro_01': {
        id: 'intro_01',
        title: 'The First Step',
        objective: 'Go to your Office to review the case files.',
        target: { x: 3400, y: 1800, map: 'city' }, // Example coordinates, need verification
        next: 'scan_evidence'
    },
    'scan_evidence': {
        id: 'scan_evidence',
        title: 'Gathering Clues',
        objective: 'Find the suspicious letter near the desk.',
        target: { x: 3500, y: 1800, map: 'city' },
        next: 'find_suspect'
    },
    'find_suspect': {
        id: 'find_suspect',
        title: 'The Interrogation',
        objective: 'Find and interrogate Tobias Finch.',
        target: { x: 2200, y: 1500, map: 'city' }, // Needs to match NPC spawn
        next: null
    }
};

export class QuestSystem {
    constructor(scene) {
        this.scene = scene;
        this.activeQuest = null;
        this.events = new Phaser.Events.EventEmitter();

        // Listen for global state updates if needed, 
        // but for now we'll drive it from here.
    }

    init() {
        const state = loadGameState();

        // If no active quest and no history, start intro
        if (!state.quests.active && state.quests.completed.length === 0) {
            this.startQuest('intro_01');
        } else if (state.quests.active) {
            this.activeQuest = state.quests.active;
            this.emitUpdate();
        }
    }

    startQuest(questId) {
        const questDef = QUEST_DEFINITIONS[questId];
        if (!questDef) {
            console.warn(`Quest ${questId} not found.`);
            return;
        }

        this.activeQuest = questDef;
        setActiveQuest(questDef);
        this.emitUpdate();

        this.scene.add.text(400, 100, `NEW QUEST: ${questDef.title}`, {
            font: '24px Courier',
            fill: '#gold',
            backgroundColor: '#000000aa'
        }).setScrollFactor(0).setOrigin(0.5).setDepth(2000).setAlpha(1);
    }

    completeCurrentQuest() {
        if (!this.activeQuest) return;

        const nextId = this.activeQuest.next;
        completeActiveQuest();

        // Show completion effect?

        if (nextId) {
            this.startQuest(nextId);
        } else {
            this.activeQuest = null;
            this.emitUpdate();
        }
    }

    // Call this when player reaches a target zone or action
    checkQuestCompletion(triggerData) {
        if (!this.activeQuest) return;

        let completed = false;

        // Handle string triggerData for backward compatibility or simple triggers
        const type = typeof triggerData === 'string' ? triggerData : triggerData.type;
        const id = typeof triggerData === 'object' ? triggerData.id : null;

        console.log(`[QuestSystem] Checking completion: Active=${this.activeQuest.id}, Trigger=${type}, ID=${id}`);

        if (this.activeQuest.id === 'intro_01') {
            // Distance check handled by Game.js calling with 'location_reached'
            if (type === 'location_reached' || type === 'zone_enter') {
                completed = true;
            }
        }
        else if (this.activeQuest.id === 'scan_evidence') {
            if (type === 'evidence_scanned') {
                completed = true;
            }
        }
        else if (this.activeQuest.id === 'find_suspect') {
            if (type === 'interrogation_started') {
                completed = true;
            }
        }

        if (completed) {
            console.log(`[QuestSystem] Quest ${this.activeQuest.id} COMPLETED!`);
            this.completeCurrentQuest();
        }
    }

    emitUpdate() {
        this.events.emit('quest-update', this.activeQuest);
    }

    getActiveQuest() {
        return this.activeQuest;
    }
}
