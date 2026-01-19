
import { QuestSystem, QUEST_DEFINITIONS } from '../src/utils/QuestSystem.js';
import { setActiveQuest, completeActiveQuest, loadGameState } from '../src/ui/gameState.js';

// Mock Phaser
const Phaser = {
    Events: {
        EventEmitter: class EventEmitter {
            emit() { }
            on() { }
        }
    }
};
global.Phaser = Phaser;

// Mock gameState interactions
jest.mock('../src/ui/gameState.js', () => ({
    loadGameState: jest.fn(),
    setActiveQuest: jest.fn(),
    completeActiveQuest: jest.fn()
}));

describe('QuestSystem', () => {
    let mockScene;
    let questSystem;

    beforeEach(() => {
        jest.clearAllMocks();
        mockScene = {
            add: {
                text: jest.fn().mockReturnValue({
                    setScrollFactor: jest.fn().mockReturnThis(),
                    setOrigin: jest.fn().mockReturnThis(),
                    setDepth: jest.fn().mockReturnThis(),
                    setAlpha: jest.fn().mockReturnThis()
                })
            }
        };
        questSystem = new QuestSystem(mockScene);
        loadGameState.mockReturnValue({ quests: { active: null, completed: [] } });
    });

    test('init starts intro quest if no active quest', () => {
        questSystem.init();
        expect(setActiveQuest).toHaveBeenCalledWith(QUEST_DEFINITIONS['intro_01']);
        expect(questSystem.getActiveQuest().id).toBe('intro_01');
    });

    test('checkQuestCompletion completes intro quest on location reached', () => {
        questSystem.startQuest('intro_01');
        questSystem.checkQuestCompletion({ type: 'location_reached' });
        expect(completeActiveQuest).toHaveBeenCalled();
        // Should auto-start next quest
        expect(setActiveQuest).toHaveBeenCalledWith(QUEST_DEFINITIONS['scan_evidence']);
    });

    test('checkQuestCompletion checks targetId for evidence', () => {
        questSystem.startQuest('scan_evidence');

        // Wrong evidence ID
        questSystem.checkQuestCompletion({ type: 'evidence_scanned', id: 'wrong_id' });
        expect(completeActiveQuest).not.toHaveBeenCalled();

        // Correct evidence ID
        questSystem.checkQuestCompletion({ type: 'evidence_scanned', id: 'mock_letter' });
        expect(completeActiveQuest).toHaveBeenCalled();
    });
});
