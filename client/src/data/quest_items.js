/**
 * Quest Items Registry
 * Noir-style pixel art quest items for "Captive Horror"
 * 
 * Structure:
 * - id: Unique item identifier
 * - name: Display name
 * - description: Item description for inventory/UI
 * - hexColor: Primary color for UI rendering (noir palette)
 * - spriteKey: Texture key for sprite asset (to be loaded in Boot.js)
 * - subGridCollision: 8px sub-grid collision mask (16-bit, 4x4 grid)
 * - location: World coordinates from PATHFINDING_ANALYSIS.md
 * - questPath: Which Day 2 path this item belongs to
 */

export const QUEST_ITEMS = {
  /**
   * Bloody Magnifying Glass
   * Found during path_samuel investigation at Risky Passage
   * Evidence of struggle, possible murder weapon
   */
  bloody_magnifying_glass: {
    id: 'bloody_magnifying_glass',
    name: 'Bloody Magnifying Glass',
    description: 'A detective\'s magnifying glass, stained with dried blood. The handle shows signs of struggle.',
    hexColor: '#8B0000', // Dark red (blood)
    spriteKey: 'quest_item_magnifying_glass',
    subGridCollision: {
      // 8px sub-grid bitmask: 16-bit value representing 4x4 grid
      // Bit 0 = top-left, bit 15 = bottom-right
      // 0x0000 = fully walkable, 0xFFFF = fully solid
      // For a small item (16x16px), use partial collision (center 2x2 cells solid)
      mask: 0x0660, // Center 2x2 cells solid (bits 5,6,9,10)
      alpha_threshold_passed: true
    },
    location: {
      // From PATHFINDING_ANALYSIS.md: Risky Passage coordinates
      // Route 3 milestone: [2800-3200, 2000-2400] - Risky Passage + Lions Den
      x: 3000, // Center of Risky Passage range
      y: 2200,
      locationTag: 'risky_passage'
    },
    questPath: 'path_samuel',
    questObjective: 'samuel_find_weapon',
    interactable: true,
    collectible: true
  },

  /**
   * Shattered Pocket Watch
   * Found during path_evie investigation at Harrow Residence
   * Belonged to Lillian, stopped at time of death
   */
  shattered_pocket_watch: {
    id: 'shattered_pocket_watch',
    name: 'Shattered Pocket Watch',
    description: 'A delicate pocket watch, shattered and stopped at 11:47 PM. Engraved initials: "L.H."',
    hexColor: '#4A4A4A', // Dark gray (metal)
    spriteKey: 'quest_item_pocket_watch',
    subGridCollision: {
      // Small circular item: center 2x2 cells solid
      mask: 0x0660,
      alpha_threshold_passed: true
    },
    location: {
      // From PATHFINDING_ANALYSIS.md: Harrow Residence coordinates
      // Route 3 milestone: [2000-2400, 2400-2800] - Pennyworth Lane + Harrow Residence
      x: 2200, // Center of Harrow Residence range
      y: 2600,
      locationTag: 'harrow_residence'
    },
    questPath: 'path_evie',
    questObjective: 'evie_find_diary',
    interactable: true,
    collectible: true
  },

  /**
   * Encrypted Ledger
   * Found during path_whitcombe investigation at Lions Den
   * Contains blackmail records and financial transactions
   */
  encrypted_ledger: {
    id: 'encrypted_ledger',
    name: 'Encrypted Ledger',
    description: 'A leather-bound ledger filled with coded entries. The handwriting matches Headmaster Whitcombe\'s.',
    hexColor: '#2C1810', // Dark brown (leather)
    spriteKey: 'quest_item_ledger',
    subGridCollision: {
      // Book/ledger item: slightly larger, center 3x2 cells solid
      mask: 0x0EE0, // Center 3x2 cells (bits 4,5,6,8,9,10)
      alpha_threshold_passed: true
    },
    location: {
      // From PATHFINDING_ANALYSIS.md: Lions Den coordinates
      // Route 3 milestone: [2800-3200, 2000-2400] - Risky Passage + Lions Den
      x: 3000, // Center of Lions Den range (adjacent to Risky Passage)
      y: 2100,
      locationTag: 'lions_den'
    },
    questPath: 'path_whitcombe',
    questObjective: 'whitcombe_find_ledger',
    interactable: true,
    collectible: true
  }
};

/**
 * Get quest item by ID
 * @param {string} itemId - Quest item identifier
 * @returns {Object|null} Quest item data
 */
export function getQuestItem(itemId) {
  return QUEST_ITEMS[itemId] || null;
}

/**
 * Get all quest items for a specific quest path
 * @param {string} questPath - Quest path identifier (e.g., 'path_samuel')
 * @returns {Array} Array of quest items for that path
 */
export function getQuestItemsByPath(questPath) {
  return Object.values(QUEST_ITEMS).filter(item => item.questPath === questPath);
}

/**
 * Get quest item at specific world coordinates
 * @param {number} x - World X coordinate
 * @param {number} y - World Y coordinate
 * @param {number} tolerance - Distance tolerance in pixels (default: 32)
 * @returns {Object|null} Quest item at location, or null
 */
export function getQuestItemAtLocation(x, y, tolerance = 32) {
  for (const item of Object.values(QUEST_ITEMS)) {
    const distance = Math.sqrt(
      Math.pow(x - item.location.x, 2) + Math.pow(y - item.location.y, 2)
    );
    if (distance <= tolerance) {
      return item;
    }
  }
  return null;
}

/**
 * Get all quest item locations for collision/spawn system
 * @returns {Array} Array of {id, x, y, locationTag} objects
 */
export function getAllQuestItemLocations() {
  return Object.values(QUEST_ITEMS).map(item => ({
    id: item.id,
    x: item.location.x,
    y: item.location.y,
    locationTag: item.location.locationTag
  }));
}

export default QUEST_ITEMS;
