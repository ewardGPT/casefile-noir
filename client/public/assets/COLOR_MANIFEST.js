/**
 * COLOR_MANIFEST.js
 * Tile color data manifest for F11 Inspector Tool
 * Contains hex color mappings for tilesets and individual tiles
 * 
 * Structure:
 * - tilesets: Map of tileset keys to color data
 * - tiles: Map of GID (Global Tile ID) to color information
 */

export const COLOR_MANIFEST = {
    // Tileset color data
    tilesets: {
        'terrain-map-v8_0': { name: 'Terrain 0', primaryColor: '#8B7355', description: 'Terrain tileset chunk 0' },
        'terrain-map-v8_1': { name: 'Terrain 1', primaryColor: '#6B5B4F', description: 'Terrain tileset chunk 1' },
        'terrain-map-v8_2': { name: 'Terrain 2', primaryColor: '#7A6B5A', description: 'Terrain tileset chunk 2' },
        'terrain-map-v8_3': { name: 'Terrain 3', primaryColor: '#9B8B7A', description: 'Terrain tileset chunk 3' },
        'terrain-map-v8_4': { name: 'Terrain 4', primaryColor: '#5A4B3F', description: 'Terrain tileset chunk 4' },
        'terrain-map-v8_5': { name: 'Terrain 5', primaryColor: '#8A7B6A', description: 'Terrain tileset chunk 5' },
        'terrain-map-v8_6': { name: 'Terrain 6', primaryColor: '#7B6B5A', description: 'Terrain tileset chunk 6' },
        'terrain-map-v8_7': { name: 'Terrain 7', primaryColor: '#6A5B4A', description: 'Terrain tileset chunk 7' },
        'vten': { name: 'Victorian Tenement', primaryColor: '#8B6B5A', description: 'Victorian tenement buildings' },
        'windoors': { name: 'Windows & Doors', primaryColor: '#4A3B2A', description: 'Window and door tiles' },
        'vhouse': { name: 'Victorian House', primaryColor: '#9B7B6A', description: 'Victorian house tiles' },
        'roofs': { name: 'Roofs', primaryColor: '#5A4A3A', description: 'Roof tiles' },
        'vacc': { name: 'Victorian Accessories', primaryColor: '#7B6B5A', description: 'Victorian accessory tiles' },
        'bricks': { name: 'Bricks', primaryColor: '#8B5A4A', description: 'Brick texture tiles' },
        'vwindoors': { name: 'Victorian Windows & Doors', primaryColor: '#3A2B1A', description: 'Victorian window and door tiles' },
        'container': { name: 'Containers', primaryColor: '#6B5A4A', description: 'Container tiles' },
        'vmkt': { name: 'Victorian Market', primaryColor: '#9B8B7A', description: 'Victorian market tiles' },
        'vgard': { name: 'Victorian Garden', primaryColor: '#5A7B4A', description: 'Victorian garden tiles' },
        'vstreets': { name: 'Victorian Streets', primaryColor: '#6B6B6B', description: 'Street tiles' },
        'food': { name: 'Food', primaryColor: '#9B6B4A', description: 'Food item tiles' },
        'trees': { name: 'Trees', primaryColor: '#3A5A2A', description: 'Tree tiles' }
    },
    
    // Tile GID to color mapping (populated at runtime from actual tile data)
    // Format: { gid: { hex: '#RRGGBB', tileset: 'tileset_key', localId: 0, properties: {} } }
    tiles: {},
    
    /**
     * Get color data for a tile by GID
     * @param {number} gid - Global Tile ID
     * @returns {Object|null} Color data or null if not found
     */
    getTileColor(gid) {
        if (this.tiles[gid]) {
            return this.tiles[gid];
        }
        return null;
    },
    
    /**
     * Get tileset color data
     * @param {string} tilesetKey - Tileset key
     * @returns {Object|null} Tileset color data or null if not found
     */
    getTilesetColor(tilesetKey) {
        return this.tilesets[tilesetKey] || null;
    },
    
    /**
     * Register a tile's color data (called at runtime)
     * @param {number} gid - Global Tile ID
     * @param {Object} colorData - Color data object
     */
    registerTile(gid, colorData) {
        this.tiles[gid] = colorData;
    }
};
