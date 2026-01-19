import { QuestSystem } from './QuestSystem';
import Phaser from 'phaser';

describe('QuestSystem.removeWaypointMarker', () => {
    let questSystem;
    let mockScene;

    beforeEach(() => {
        // Mock scene with a fake add.circle method
        mockScene = {
            add: {
                circle: jest.fn(() => ({
                    destroy: jest.fn()
                }))
            },
        };
         mockScene.minimap = {
             setQuestTarget: jest.fn()
         };

         questSystem = new QuestSystem(mockScene);
        console.log = jest.fn();  // Mock console log
    });

    afterEach(() => {
        jest.clearAllMocks();

        // Mock Phaser framework
        global.Phaser = {
            Events: {
                EventEmitter: jest.fn(() => ({
                    emit: jest.fn()
                }))
            },
            GameObjects: {
                Circle: jest.fn(() => ({
                    setScrollFactor: jest.fn(),
                    setDepth: jest.fn(),
                    destroy: jest.fn()
                }))
            }
        };

        // Mock scene methods completely
        mockScene.add.circle = jest.fn(() => ({
            setScrollFactor: jest.fn(),
            setDepth: jest.fn(),
            destroy: jest.fn()
        }));
    });

    test('should destroy the existing marker and set waypointMarker to null', () => {
        // Arrange: Create a fake marker
        const fakeMarker = { destroy: jest.fn() };
        questSystem.waypointMarker = fakeMarker;

        // Act: Call removeWaypointMarker
        questSystem.removeWaypointMarker();

        // Assert
        expect(fakeMarker.destroy).toHaveBeenCalled(); // Ensure destroy was called
        expect(questSystem.waypointMarker).toBeNull(); // Verify waypointMarker is null
        expect(console.log).toHaveBeenCalledWith('Removed waypoint marker'); // Check console log
        expect(mockScene.minimap.setQuestTarget).toHaveBeenCalledWith(null);
    });

    test('should not throw an error when no marker exists', () => {
        // Arrange: Ensure no marker exists
        questSystem.waypointMarker = null;

        // Act: Call removeWaypointMarker
        expect(() => questSystem.removeWaypointMarker()).not.toThrow();

        // Assert
        expect(console.log).not.toHaveBeenCalledWith('Removed waypoint marker'); // Ensure log does not mention removal
    });
});