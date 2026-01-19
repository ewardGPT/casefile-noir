import { Minimap } from '../src/utils/minimap';
import { QuestManager } from '../src/systems/QuestManager';
import { describe, it, expect, beforeEach } from 'jest'; // Import Jest functions

// Mock for Phaser.Math.Clamp
const Phaser = {
  Math: {
    Clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
  },
};

describe('Minimap and QuestMarker Tests', () => {
  let minimap;
  let questManager;
  
  beforeEach(() => {
    // Mock scene and player objects, as they are dependencies for the minimap.
    const mockPlayer = { x: 100, y: 100 }; // Starting at (100, 100).
    
    const mockScene = {
      scale: { width: 800, height: 600 },
      cameras: {
        add: jest.fn(() => ({ setZoom: jest.fn(), setScroll: jest.fn(), setBackgroundColor: jest.fn(), setVisible: jest.fn(), setSize:jest.fn()})),
        main: { scrollX: 0, scrollY: 0 },
      },
      add: {
        circle: jest.fn((x, y, radius, fillColor, alpha) => ({
          setScrollFactor: jest.fn(),
          setDepth: jest.fn(),
          setVisible: jest.fn(),
          setPosition: jest.fn(),
          destroy: jest.fn(),
        })),
        rectangle: jest.fn((x, y, width, height, fillColor, alpha) => ({
          setStrokeStyle: jest.fn(),
          setScrollFactor: jest.fn(),
          setDepth: jest.fn(),
          setVisible: jest.fn(),
          destroy: jest.fn(),
          setSize:jest.fn(), // Compliance
          setPosition:jest.fn() ,
        })),
      },
      player: mockPlayer,
    };

    // Initialize minimap
    minimap = new Minimap(mockScene);
    minimap.init();

    // Initialize QuestManager
    questManager = new QuestManager();
  });

  it('Should clamp quest marker within minimap bounds', () => {
// find espict noreferrer bug 
 verify balancing belo0cenario stage 