/**
 * COLOR_MANIFEST.js
 * Maps every tile index (GID) to its raw hex color and collision status.
 * 
 * Structure:
 * - tileIndex: Global tile ID (GID) from Tiled map
 * - hexColor: Raw hex color value extracted from tileset image (e.g., "#RRGGBB")
 * - collides: Boolean indicating if tile blocks player movement
 * - tilesetName: Source tileset name for reference
 * 
 * Note: Hex colors should be extracted from tileset PNG images.
 * Collision status is determined by layer name and tile properties.
 */

/**
 * Tile Color and Collision Manifest
 * Maps tile GID to color and collision data
 */
export const COLOR_MANIFEST = {
  // Empty/Transparent tiles (GID 0 or -1)
  0: {
    hexColor: '#00000000', // Transparent
    collides: false,
    tilesetName: 'empty'
  },
  '-1': {
    hexColor: '#00000000', // Transparent
    collides: false,
    tilesetName: 'empty'
  },

  // Terrain tileset chunks (terrain-map-v8_0 through terrain-map-v8_7)
  // These are walkable ground tiles
  // Range: 1-2048 (terrain-map-v8_0), 2049-4096 (terrain-map-v8_1), etc.
  // Common terrain tile indices from actual map data
  6: {
    hexColor: '#8B7355', // Brown dirt/ground
    collides: false,
    tilesetName: 'terrain-map-v8_0'
  },
  15658: {
    hexColor: '#6B8E23', // Grass green
    collides: false,
    tilesetName: 'terrain-map-v8_7'
  },
  15659: {
    hexColor: '#8B7355', // Dirt path
    collides: false,
    tilesetName: 'terrain-map-v8_7'
  },
  15660: {
    hexColor: '#708090', // Stone/cobblestone
    collides: false,
    tilesetName: 'terrain-map-v8_7'
  },

  // Building tilesets - generally collidable unless doors/entrances
  // Victorian Tenement tiles (vten) - firstgid: 15745, range: 15745-18816
  15745: {
    hexColor: '#8B4513', // Brown brick wall
    collides: true,
    tilesetName: 'vten'
  },
  18816: {
    hexColor: '#654321', // End of vten range
    collides: true,
    tilesetName: 'vten'
  },

  // Windows/Doors tileset (windoors) - firstgid: 18817, range: 18817-19840
  // Doors are walkable, windows are collidable
  18817: {
    hexColor: '#4169E1', // Window glass blue
    collides: true,
    tilesetName: 'windoors'
  },
  19840: {
    hexColor: '#8B4513', // Door frame
    collides: false, // Doors are walkable
    tilesetName: 'windoors'
  },

  // Victorian Mansion (vhouse) - firstgid: 19841, range: 19841-21888
  19841: {
    hexColor: '#8B7355', // Mansion wall
    collides: true,
    tilesetName: 'vhouse'
  },
  21888: {
    hexColor: '#654321', // End of vhouse range
    collides: true,
    tilesetName: 'vhouse'
  },

  // Roofs tileset - firstgid: 21889, range: 21889-25984
  21889: {
    hexColor: '#8B4513', // Roof tile
    collides: true,
    tilesetName: 'roofs'
  },
  25984: {
    hexColor: '#654321', // End of roofs range
    collides: true,
    tilesetName: 'roofs'
  },

  // Victorian Accessories (vacc) - firstgid: 25985, range: 25985-28544
  25985: {
    hexColor: '#D2691E', // Decorative accessory
    collides: true, // Most accessories are collidable
    tilesetName: 'vacc'
  },
  28544: {
    hexColor: '#CD853F', // End of vacc range
    collides: true,
    tilesetName: 'vacc'
  },

  // Bricks tileset - firstgid: 28545, range: 28545-30592
  28545: {
    hexColor: '#8B4513', // Brick wall
    collides: true,
    tilesetName: 'bricks'
  },
  30592: {
    hexColor: '#654321', // End of bricks range
    collides: true,
    tilesetName: 'bricks'
  },

  // Victorian Windows/Doors (vwindoors) - firstgid: 30593, range: 30593-35712
  // Doors walkable, windows collidable
  30593: {
    hexColor: '#4169E1', // Victorian window
    collides: true,
    tilesetName: 'vwindoors'
  },
  35712: {
    hexColor: '#8B4513', // Victorian door
    collides: false, // Doors are walkable
    tilesetName: 'vwindoors'
  },

  // Container tileset - firstgid: 35713, range: 35713-40576
  35713: {
    hexColor: '#696969', // Container
    collides: true,
    tilesetName: 'container'
  },
  40576: {
    hexColor: '#808080', // End of container range
    collides: true,
    tilesetName: 'container'
  },

  // Food tileset - firstgid: 40577, range: 40577-41600
  // Decorative, generally walkable
  40577: {
    hexColor: '#FFD700', // Food item
    collides: false,
    tilesetName: 'food'
  },
  41600: {
    hexColor: '#FFA500', // End of food range
    collides: false,
    tilesetName: 'food'
  },

  // Trees tileset (trees-green) - firstgid: 41601+
  41601: {
    hexColor: '#228B22', // Tree trunk/foliage
    collides: true,
    tilesetName: 'trees-green'
  }
};

/**
 * Get color manifest entry for a tile index
 * @param {number} tileIndex - Global tile ID (GID)
 * @returns {Object|null} Manifest entry with hexColor, collides, tilesetName
 */
export function getTileManifest(tileIndex) {
  // Handle empty/transparent tiles
  if (tileIndex === 0 || tileIndex === -1 || tileIndex === null || tileIndex === undefined) {
    return COLOR_MANIFEST[0] || COLOR_MANIFEST['-1'];
  }
  
  // Return exact match if exists
  if (COLOR_MANIFEST[tileIndex]) {
    return COLOR_MANIFEST[tileIndex];
  }
  
  // Determine collision status based on tileset range
  const collisionStatus = determineCollisionByRange(tileIndex);
  const tilesetName = determineTilesetByRange(tileIndex);
  
  // Return default entry with inferred collision status
  return {
    hexColor: '#808080', // Default gray (should be extracted from tileset)
    collides: collisionStatus,
    tilesetName: tilesetName
  };
}

/**
 * Determine collision status based on tile index range
 * @param {number} tileIndex - Global tile ID
 * @returns {boolean} True if tile should collide
 */
function determineCollisionByRange(tileIndex) {
  // Terrain tilesets (1-15744) - generally walkable
  if (tileIndex >= 1 && tileIndex < 15745) {
    return false; // Walkable terrain
  }
  
  // Victorian Tenement (vten) - walls/buildings collidable
  if (tileIndex >= 15745 && tileIndex < 18817) {
    return true; // Buildings/walls
  }
  
  // Windows/Doors (windoors) - doors walkable, windows collidable
  // Heuristic: assume collidable unless proven otherwise
  if (tileIndex >= 18817 && tileIndex < 19841) {
    return true; // Default to collidable (windows)
  }
  
  // Victorian Mansion (vhouse) - walls collidable
  if (tileIndex >= 19841 && tileIndex < 21889) {
    return true; // Buildings/walls
  }
  
  // Roofs - collidable
  if (tileIndex >= 21889 && tileIndex < 25985) {
    return true; // Roofs block movement
  }
  
  // Victorian Accessories (vacc) - decorative, generally collidable
  if (tileIndex >= 25985 && tileIndex < 28545) {
    return true; // Most accessories block movement
  }
  
  // Bricks - collidable walls
  if (tileIndex >= 28545 && tileIndex < 30593) {
    return true; // Brick walls
  }
  
  // Victorian Windows/Doors (vwindoors) - doors walkable, windows collidable
  if (tileIndex >= 30593 && tileIndex < 35713) {
    return true; // Default to collidable (windows)
  }
  
  // Container - collidable
  if (tileIndex >= 35713 && tileIndex < 40577) {
    return true; // Containers block movement
  }
  
  // Food - decorative, walkable
  if (tileIndex >= 40577 && tileIndex < 41601) {
    return false; // Food items don't block movement
  }
  
  // Trees - collidable
  if (tileIndex >= 41601) {
    return true; // Trees block movement
  }
  
  return false; // Default to walkable
}

/**
 * Determine tileset name based on tile index range
 * @param {number} tileIndex - Global tile ID
 * @returns {string} Tileset name
 */
function determineTilesetByRange(tileIndex) {
  // Terrain chunks (2048 tiles each)
  if (tileIndex >= 1 && tileIndex < 2049) return 'terrain-map-v8_0';
  if (tileIndex >= 2049 && tileIndex < 4097) return 'terrain-map-v8_1';
  if (tileIndex >= 4097 && tileIndex < 6145) return 'terrain-map-v8_2';
  if (tileIndex >= 6145 && tileIndex < 8193) return 'terrain-map-v8_3';
  if (tileIndex >= 8193 && tileIndex < 10241) return 'terrain-map-v8_4';
  if (tileIndex >= 10241 && tileIndex < 12289) return 'terrain-map-v8_5';
  if (tileIndex >= 12289 && tileIndex < 14337) return 'terrain-map-v8_6';
  if (tileIndex >= 14337 && tileIndex < 15745) return 'terrain-map-v8_7';
  
  // Building tilesets
  if (tileIndex >= 15745 && tileIndex < 18817) return 'vten';
  if (tileIndex >= 18817 && tileIndex < 19841) return 'windoors';
  if (tileIndex >= 19841 && tileIndex < 21889) return 'vhouse';
  if (tileIndex >= 21889 && tileIndex < 25985) return 'roofs';
  if (tileIndex >= 25985 && tileIndex < 28545) return 'vacc';
  if (tileIndex >= 28545 && tileIndex < 30593) return 'bricks';
  if (tileIndex >= 30593 && tileIndex < 35713) return 'vwindoors';
  if (tileIndex >= 35713 && tileIndex < 40577) return 'container';
  if (tileIndex >= 40577 && tileIndex < 41601) return 'food';
  if (tileIndex >= 41601) return 'trees-green';
  
  return 'unknown';
}

/**
 * Get hex color for a tile index
 * @param {number} tileIndex - Global tile ID
 * @returns {string} Hex color string (e.g., "#RRGGBB")
 */
export function getTileColor(tileIndex) {
  const manifest = getTileManifest(tileIndex);
  return manifest.hexColor;
}

/**
 * Get collision status for a tile index
 * @param {number} tileIndex - Global tile ID
 * @returns {boolean} True if tile blocks movement
 */
export function getTileCollision(tileIndex) {
  const manifest = getTileManifest(tileIndex);
  return manifest.collides;
}

/**
 * Generate 16-bit collision mask for a tile coordinate
 * Synced with collision_map.json format for 8px sub-grid collision system
 * Supports partial-tile transparency via alpha threshold detection
 * 
 * @param {number} tileIndex - Global tile ID (GID) from map
 * @param {Object} options - Optional configuration
 * @param {boolean} options.fullTile - If true, returns 0xFFFF for solid, 0x0000 for walkable (default: true)
 * @param {number} options.alphaThreshold - Alpha threshold (0-255) for transparency detection (default: 128)
 * @param {Array<Array<number>>} options.pixelAlphaData - 4x4 array of alpha values (0-255) for each 8px sub-cell
 * @returns {number} 16-bit mask (0x0000-0xFFFF) representing 4x4 sub-grid collision
 * 
 * @example
 * // Fully solid tile
 * generateCollisionMask(15745) // Returns 0xFFFF
 * 
 * // Fully walkable tile
 * generateCollisionMask(6) // Returns 0x0000
 * 
 * // Partial collision based on alpha threshold (Agent 3 can provide pixelAlphaData)
 * const alphaData = [
 *   [255, 255, 0, 0],    // Top row: first 2 sub-cells opaque, last 2 transparent
 *   [255, 255, 0, 0],
 *   [0, 0, 0, 0],        // Bottom rows: all transparent
 *   [0, 0, 0, 0]
 * ];
 * generateCollisionMask(15745, { 
 *   fullTile: false, 
 *   pixelAlphaData: alphaData,
 *   alphaThreshold: 128 
 * }) // Returns 0xCC00 (only top-left 2x2 sub-cells are solid)
 */
export function generateCollisionMask(tileIndex, options = {}) {
  const { 
    fullTile = true, 
    alphaThreshold = 128,
    pixelAlphaData = null 
  } = options;
  
  const collides = getTileCollision(tileIndex);
  
  // If fullTile mode or no pixel data, use simple full-tile collision
  if (fullTile || !pixelAlphaData) {
    return collides ? 0xFFFF : 0x0000;
  }
  
  // Generate partial mask based on alpha threshold detection
  // Only mark sub-cells as solid if they pass the alpha threshold
  let mask = 0x0000;
  let bitIndex = 0;
  
  // pixelAlphaData should be a 4x4 array (row-major order)
  // Bit mapping: bit 0 = top-left, bit 15 = bottom-right
  for (let row = 0; row < 4; row++) {
    if (!pixelAlphaData[row] || pixelAlphaData[row].length !== 4) {
      // Invalid data, fall back to full-tile collision
      return collides ? 0xFFFF : 0x0000;
    }
    
    for (let col = 0; col < 4; col++) {
      const alpha = pixelAlphaData[row][col];
      // If pixel passes alpha threshold AND base tile collides, mark as solid
      if (alpha >= alphaThreshold && collides) {
        mask |= (1 << bitIndex);
      }
      bitIndex++;
    }
  }
  
  return mask;
}

/**
 * Generate collision_map.json entry for a tile coordinate
 * Synced with COLOR_MANIFEST.js collision logic
 * Supports partial-tile transparency with alpha_threshold_passed flag
 * 
 * @param {number} tileX - Tile X coordinate (0-127)
 * @param {number} tileY - Tile Y coordinate (0-127)
 * @param {number} tileIndex - Global tile ID (GID) from map
 * @param {Object} options - Optional configuration
 * @param {boolean} options.fullTile - If true, uses full-tile collision (default: true)
 * @param {number} options.alphaThreshold - Alpha threshold for transparency detection (default: 128)
 * @param {Array<Array<number>>} options.pixelAlphaData - 4x4 array of alpha values for each sub-cell
 * @returns {Object} Entry for collision_map.json: { "x,y": { mask, alpha_threshold_passed } }
 * 
 * @example
 * // Full-tile collision
 * generateCollisionEntry(0, 0, 15745) 
 * // Returns { "0,0": { mask: 65535, alpha_threshold_passed: false } }
 * 
 * // Partial collision with alpha threshold detection (Agent 3)
 * const alphaData = [[255, 255, 0, 0], [255, 255, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
 * generateCollisionEntry(10, 20, 15745, { 
 *   fullTile: false, 
 *   pixelAlphaData: alphaData,
 *   alphaThreshold: 128 
 * })
 * // Returns { "10,20": { mask: 52224, alpha_threshold_passed: true } }
 */
export function generateCollisionEntry(tileX, tileY, tileIndex, options = {}) {
  const { pixelAlphaData = null, alphaThreshold = 128 } = options;
  const mask = generateCollisionMask(tileIndex, options);
  const key = `${tileX},${tileY}`;
  
  // alpha_threshold_passed is true if pixelAlphaData was provided (Agent 3 processed it)
  const alphaThresholdPassed = pixelAlphaData !== null;
  
  return { 
    [key]: {
      mask: mask,
      alpha_threshold_passed: alphaThresholdPassed
    }
  };
}

/**
 * Update collision bitmask dynamically based on pixel alpha data
 * Used by Agent 3 to update collision_map.json when transparent-but-solid pixels are identified
 * 
 * @param {number} tileX - Tile X coordinate (0-127)
 * @param {number} tileY - Tile Y coordinate (0-127)
 * @param {number} tileIndex - Global tile ID (GID) from map
 * @param {Array<Array<number>>} pixelAlphaData - 4x4 array of alpha values (0-255) for each 8px sub-cell
 * @param {number} alphaThreshold - Alpha threshold (0-255), default 128
 * @returns {Object} Updated entry for collision_map.json
 * 
 * @example
 * // Agent 3 identifies transparent pixels in a tile
 * const alphaData = [
 *   [255, 255, 50, 50],  // Top row: first 2 opaque, last 2 transparent (below threshold)
 *   [255, 255, 50, 50],
 *   [0, 0, 0, 0],        // Bottom rows: all transparent
 *   [0, 0, 0, 0]
 * ];
 * updateCollisionMask(5, 10, 15745, alphaData, 128)
 * // Returns { "5,10": { mask: 52224, alpha_threshold_passed: true } }
 * // Only top-left 2x2 sub-cells are marked as solid (tight boundaries)
 */
export function updateCollisionMask(tileX, tileY, tileIndex, pixelAlphaData, alphaThreshold = 128) {
  return generateCollisionEntry(tileX, tileY, tileIndex, {
    fullTile: false,
    pixelAlphaData: pixelAlphaData,
    alphaThreshold: alphaThreshold
  });
}

/**
 * Check if a collision entry has been processed with alpha threshold detection
 * 
 * @param {Object} collisionEntry - Entry from collision_map.json
 * @returns {boolean} True if alpha_threshold_passed is true
 */
export function hasAlphaThresholdPassed(collisionEntry) {
  return collisionEntry && collisionEntry.alpha_threshold_passed === true;
}

/**
 * Get collision mask from entry (supports both old format { "x,y": mask } and new format { "x,y": { mask, alpha_threshold_passed } })
 * 
 * @param {Object} collisionEntry - Entry from collision_map.json
 * @returns {number} 16-bit collision mask
 */
export function getCollisionMaskFromEntry(collisionEntry) {
  if (typeof collisionEntry === 'number') {
    // Old format: direct mask value
    return collisionEntry;
  }
  if (collisionEntry && typeof collisionEntry === 'object' && 'mask' in collisionEntry) {
    // New format: { mask, alpha_threshold_passed }
    return collisionEntry.mask;
  }
  return 0x0000; // Default to walkable
}

export default COLOR_MANIFEST;
