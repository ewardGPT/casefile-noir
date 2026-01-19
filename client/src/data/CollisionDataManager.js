/**
 * CollisionDataManager
 * Manages dynamic updates to CollisionData for partial-tile transparency support
 * Used by Agent 3 to update collision bitmasks based on alpha threshold detection
 */

/**
 * Update collision entry for a tile coordinate
 * Used by Agent 3 when transparent-but-solid pixels are identified
 * 
 * @param {number} tileX - Tile X coordinate (0-127)
 * @param {number} tileY - Tile Y coordinate (0-127)
 * @param {number} mask - 16-bit collision mask (0x0000-0xFFFF)
 * @param {boolean} alphaThresholdPassed - Whether alpha threshold detection was applied
 * @returns {boolean} True if update was successful
 */
export function updateCollisionEntry(tileX, tileY, mask, alphaThresholdPassed = true) {
  if (typeof window === 'undefined' || !window.CollisionData) {
    console.error('CollisionData not initialized. Ensure Boot.js has loaded collision_map.json');
    return false;
  }
  
  const key = `${tileX},${tileY}`;
  window.CollisionData[key] = {
    mask: mask,
    alpha_threshold_passed: alphaThresholdPassed
  };
  
  // Persist to localStorage for tight boundaries across reloads
  persistCollisionData();
  
  return true;
}

/**
 * Get collision entry for a tile coordinate
 * 
 * @param {number} tileX - Tile X coordinate (0-127)
 * @param {number} tileY - Tile Y coordinate (0-127)
 * @returns {Object|null} Collision entry { mask, alpha_threshold_passed } or null if not found
 */
export function getCollisionEntry(tileX, tileY) {
  if (typeof window === 'undefined' || !window.CollisionData) {
    return null;
  }
  
  const key = `${tileX},${tileY}`;
  return window.CollisionData[key] || null;
}

/**
 * Get collision mask for a tile coordinate
 * Returns 0x0000 (walkable) if entry doesn't exist
 * 
 * @param {number} tileX - Tile X coordinate (0-127)
 * @param {number} tileY - Tile Y coordinate (0-127)
 * @returns {number} 16-bit collision mask
 */
export function getCollisionMask(tileX, tileY) {
  const entry = getCollisionEntry(tileX, tileY);
  if (!entry) {
    return 0x0000; // Default to walkable
  }
  
  // Support both old format (direct number) and new format (object with mask property)
  if (typeof entry === 'number') {
    return entry;
  }
  if (entry && typeof entry === 'object' && 'mask' in entry) {
    return entry.mask;
  }
  
  return 0x0000;
}

/**
 * Check if a tile has been processed with alpha threshold detection
 * 
 * @param {number} tileX - Tile X coordinate (0-127)
 * @param {number} tileY - Tile Y coordinate (0-127)
 * @returns {boolean} True if alpha_threshold_passed is true
 */
export function hasAlphaThresholdPassed(tileX, tileY) {
  const entry = getCollisionEntry(tileX, tileY);
  return entry && entry.alpha_threshold_passed === true;
}

/**
 * Persist CollisionData to localStorage
 * Ensures tight boundaries are saved so detective doesn't bounce off invisible transparent pixels after reload
 */
export function persistCollisionData() {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  
  try {
    const dataToSave = {
      collisionData: window.CollisionData || {},
      metadata: window.CollisionDataMetadata || {},
      timestamp: Date.now(),
      version: '1.1'
    };
    
    localStorage.setItem('collision_data_cache', JSON.stringify(dataToSave));
  } catch (error) {
    console.error('Failed to persist CollisionData:', error);
  }
}

/**
 * Load CollisionData from localStorage cache
 * Called during Boot.js initialization to restore tight boundaries
 * 
 * @returns {Object|null} Cached collision data or null if not found
 */
export function loadCollisionDataCache() {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return null;
  }
  
  try {
    const cached = localStorage.getItem('collision_data_cache');
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.error('Failed to load CollisionData cache:', error);
  }
  
  return null;
}

/**
 * Merge cached CollisionData with loaded collision_map.json
 * Prioritizes cached data (tight boundaries) over static file data
 * 
 * @param {Object} staticData - Collision data from collision_map.json
 * @param {Object} cachedData - Collision data from localStorage cache
 * @returns {Object} Merged collision data
 */
export function mergeCollisionData(staticData, cachedData) {
  if (!cachedData || !cachedData.collisionData) {
    return staticData || {};
  }
  
  // Start with static data
  const merged = { ...staticData };
  
  // Override with cached data (tight boundaries take precedence)
  for (const [key, value] of Object.entries(cachedData.collisionData)) {
    // Only merge entries that have alpha_threshold_passed = true (processed by Agent 3)
    if (value && typeof value === 'object' && value.alpha_threshold_passed === true) {
      merged[key] = value;
    }
  }
  
  return merged;
}

/**
 * Batch update multiple collision entries
 * Used by Agent 3 to update multiple tiles at once
 * 
 * @param {Array<Object>} updates - Array of { tileX, tileY, mask, alphaThresholdPassed }
 * @returns {number} Number of successful updates
 */
export function batchUpdateCollisionEntries(updates) {
  if (typeof window === 'undefined' || !window.CollisionData) {
    console.error('CollisionData not initialized');
    return 0;
  }
  
  let successCount = 0;
  for (const update of updates) {
    const { tileX, tileY, mask, alphaThresholdPassed = true } = update;
    if (updateCollisionEntry(tileX, tileY, mask, alphaThresholdPassed)) {
      successCount++;
    }
  }
  
  // Persist once after batch update
  persistCollisionData();
  
  return successCount;
}

export default {
  updateCollisionEntry,
  getCollisionEntry,
  getCollisionMask,
  hasAlphaThresholdPassed,
  persistCollisionData,
  loadCollisionDataCache,
  mergeCollisionData,
  batchUpdateCollisionEntries
};
