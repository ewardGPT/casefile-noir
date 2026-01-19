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
        target: { x: 3400, y: 1800, map: 'city' }, // Coordinates for the key office location
        targetId: null, // Location based
        next: 'scan_evidence'
    },
    'scan_evidence': {
        id: 'scan_evidence',
        title: 'Gathering Clues',
        objective: 'Find the suspicious letter near the desk.',
        target: { x: 3500, y: 1800, map: 'city' },
        targetId: 'mock_letter', // Requires specific evidence ID
        next: 'find_suspect'
    },
    'find_suspect': {
        id: 'find_suspect',
        title: 'The Interrogation',
        objective: 'Find and interrogate Tobias Finch.',
        target: { x: 2200, y: 1500, map: 'city' },
        targetId: 'npc_1', // Temporarily mapped to first NPC for demo
        next: null
    }
};

export class QuestSystem {
    constructor(scene) {
        this.scene = scene;
        this.activeQuest = null;
        this.events = new Phaser.Events.EventEmitter();

        // Store a reference to the current marker
        this.waypointMarker = null;
    }

    init() {
        const state = loadGameState();

        // If no active quest and no history, start intro
        if (!state.quests.active && state.quests.completed.length === 0) {
            this.startQuest('intro_01');
        } else if (state.quests.active) {
            this.activeQuest = state.quests.active;
            this.emitUpdate();
            if (this.activeQuest.target) {
                this.createWaypointMarker(this.activeQuest.target);
            }
        }
    }

    startQuest(questId) {
        const questDef = QUEST_DEFINITIONS[questId];
        if (!questDef) {
            console.warn(`Quest ${questId} not found.`);
            return;
        }

        this.activeQuest = questDef;
        // Create a waypoint marker for the active quest target
        if (questDef.target && questDef.target.x !== undefined && questDef.target.y !== undefined) {
            this.createWaypointMarker(questDef.target);
        }
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

        // Optionally remove waypoint marker when the quest is completed
        this.removeWaypointMarker();
        this.emitUpdate();

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
                if (this.activeQuest.targetId && id !== this.activeQuest.targetId) {
                    console.log(`[QuestSystem] Evidence scanned '${id}' does not match target '${this.activeQuest.targetId}'`);
                    return;
                }
                completed = true;
            }
        }
        else if (this.activeQuest.id === 'find_suspect') {
            if (type === 'interrogation_started') {
                if (this.activeQuest.targetId && id !== this.activeQuest.targetId) {
                    if (id !== 'suspect_1') { // Allow suspect_1 as fallback if npc_1 isn't consistent
                        console.log(`[QuestSystem] Suspect '${id}' does not match target '${this.activeQuest.targetId}'`);
                        // Temporarily allow any for demo if strict match fails (remove this for production)
                        // return; 
                        // STRICT MODE ENFORCED:
                        // Check if it's the right text key or id
                        const isMatch = (id === this.activeQuest.targetId) || (id === 'Tobias Finch') || (id === 'npc_1');
                        if (!isMatch) return;
                    }
                }
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

    createWaypointMarker(target) {
        if (this.waypointMarker) {
            this.waypointMarker.destroy();
        }
        this.waypointMarker = this.scene.add.circle(target.x, target.y, 10, 0xffcc00, 0.5);
        this.waypointMarker.setScrollFactor(0);
        this.waypointMarker.setDepth(3000);
        console.log(`Created waypoint marker at location (${target.x}, ${target.y})`);
    }

    removeWaypointMarker() {
        if (this.waypointMarker) {
            this.waypointMarker.destroy();
            this.waypointMarker = null;
            console.log('Removed waypoint marker');
            if (this.scene?.minimap) {
                this.scene.minimap.setQuestTarget(null);
                console.log('Minimap quest target cleared.');
            }
        }
    }
}