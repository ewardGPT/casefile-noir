/**
 * NPC Data Layer
 * Provides NPC data structure and retrieval functions for quest locations and interactions.
 * 
 * Schema:
 * - id: (String) Unique identifier
 * - name: (String) Display name (for overhead UI)
 * - questId: (String) Associated quest from quest registry
 * - coordinates: {x, y} corresponding to physical Quest Location Objects
 */

/**
 * Array of NPC objects for quest-givers and key interactions
 */
export const NPCs = [
  // Route 1: School Zone NPCs (Day 1 Investigation)
  {
    id: 'mr_finch',
    name: 'Mr. Tobias Finch',
    questId: 'day_1_investigation', // Primary quest association
    coordinates: { x: 1600, y: 1600 }, // School zone coordinates (from PATHFINDING_ANALYSIS.md)
  },
  {
    id: 'headmaster_whitcombe',
    name: 'Headmaster Reginald Whitcombe',
    questId: 'day_1_investigation',
    coordinates: { x: 1700, y: 1500 }, // School zone coordinates
  },
  {
    id: 'evie_moreland',
    name: 'Evelyn "Evie" Moreland',
    questId: 'day_1_investigation',
    coordinates: { x: 1500, y: 1700 }, // School zone coordinates
  },
  
  // Route 1: Pennyworth Lane NPC (Critical Witness)
  {
    id: 'old_willy',
    name: 'Will "Old Willy" McGann',
    questId: 'day_1_investigation',
    coordinates: { x: 2200, y: 2200 }, // Pennyworth Lane coordinates (from PATHFINDING_ANALYSIS.md)
  },
  
  // Route 2: Additional NPCs for Balanced Route
  {
    id: 'samuel_atwell',
    name: 'Samuel Atwell',
    questId: 'day_1_investigation',
    coordinates: { x: 1550, y: 1650 }, // School zone coordinates
  },
  
  // Route 3: Deep Investigation Path NPCs (Day 2)
  {
    id: 'mr_finch_path',
    name: 'Mr. Tobias Finch',
    questId: 'path_finch', // Day 2 path quest
    coordinates: { x: 1600, y: 1600 }, // School zone (for confrontation)
  },
  {
    id: 'headmaster_whitcombe_path',
    name: 'Headmaster Reginald Whitcombe',
    questId: 'path_whitcombe', // Day 2 path quest
    coordinates: { x: 1700, y: 1500 }, // School zone (for confrontation)
  },
];

/**
 * Retrieves an NPC by its unique identifier
 * @param {string} id - The NPC's unique identifier
 * @returns {Object|undefined} The NPC object if found, undefined otherwise
 */
export function getNPCById(id) {
  return NPCs.find(npc => npc.id === id);
}

/**
 * Retrieves all NPCs associated with a specific quest
 * @param {string} questId - The quest identifier
 * @returns {Array} Array of NPC objects associated with the quest
 */
export function getNPCsByQuestId(questId) {
  return NPCs.filter(npc => npc.questId === questId);
}

/**
 * Retrieves NPCs by location coordinates (within a radius)
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} radius - Search radius in pixels (default: 100)
 * @returns {Array} Array of NPCs within the radius
 */
export function getNPCsByLocation(x, y, radius = 100) {
  return NPCs.filter(npc => {
    const dx = npc.coordinates.x - x;
    const dy = npc.coordinates.y - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= radius;
  });
}

/**
 * Gets all NPCs as an array
 * @returns {Array} All NPC objects
 */
export function getAllNPCs() {
  return NPCs;
}
