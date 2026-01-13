// client/src/utils/astarPathfinding.js
// Fast A* pathfinding implementation for tile-based maps using typed arrays

export class AStarPathfinder {
    constructor(mapW, mapH, blocked) {
        this.mapW = mapW;
        this.mapH = mapH;
        this.blocked = blocked; // Uint8Array where 1 = blocked
        this.total = mapW * mapH;
    }

    // Manhattan distance heuristic
    heuristic(ax, ay, bx, by) {
        return Math.abs(ax - bx) + Math.abs(ay - by);
    }

    tileIndex(x, y) {
        return y * this.mapW + x;
    }

    // Find path from (sx, sy) to (tx, ty)
    // Returns array of {x, y} waypoints or null if no path
    findPath(sx, sy, tx, ty, maxIterations = 5000) {
        const { mapW, mapH, blocked } = this;

        // Clamp to grid
        sx = Math.max(0, Math.min(mapW - 1, Math.floor(sx)));
        sy = Math.max(0, Math.min(mapH - 1, Math.floor(sy)));
        tx = Math.max(0, Math.min(mapW - 1, Math.floor(tx)));
        ty = Math.max(0, Math.min(mapH - 1, Math.floor(ty)));

        // If start or target blocked, fail fast
        if (blocked[this.tileIndex(sx, sy)] || blocked[this.tileIndex(tx, ty)]) {
            return null;
        }

        // A* data structures
        const openSet = new Map(); // key -> {x, y, g, f, parent}
        const closedSet = new Set();

        const startKey = `${sx},${sy}`;
        const targetKey = `${tx},${ty}`;

        openSet.set(startKey, {
            x: sx, y: sy,
            g: 0,
            f: this.heuristic(sx, sy, tx, ty),
            parent: null
        });

        const dirs = [
            [0, -1], [0, 1], [-1, 0], [1, 0], // Cardinal
            [-1, -1], [1, -1], [-1, 1], [1, 1] // Diagonal
        ];
        const cardinalCost = 1;
        const diagonalCost = 1.414;

        let iterations = 0;

        while (openSet.size > 0 && iterations < maxIterations) {
            iterations++;

            // Find node with lowest f
            let currentKey = null;
            let currentNode = null;
            let lowestF = Infinity;

            for (const [key, node] of openSet) {
                if (node.f < lowestF) {
                    lowestF = node.f;
                    currentKey = key;
                    currentNode = node;
                }
            }

            if (!currentNode) break;

            // Reached target?
            if (currentKey === targetKey) {
                return this.reconstructPath(currentNode);
            }

            openSet.delete(currentKey);
            closedSet.add(currentKey);

            // Explore neighbors
            for (let d = 0; d < dirs.length; d++) {
                const nx = currentNode.x + dirs[d][0];
                const ny = currentNode.y + dirs[d][1];

                if (nx < 0 || ny < 0 || nx >= mapW || ny >= mapH) continue;

                const nIdx = this.tileIndex(nx, ny);
                if (blocked[nIdx]) continue;

                const nKey = `${nx},${ny}`;
                if (closedSet.has(nKey)) continue;

                // Diagonal movement cost
                const moveCost = d < 4 ? cardinalCost : diagonalCost;

                // Check diagonal corner blocking (no squeezing through corners)
                if (d >= 4) {
                    const cornerX1 = currentNode.x + dirs[d][0];
                    const cornerY1 = currentNode.y;
                    const cornerX2 = currentNode.x;
                    const cornerY2 = currentNode.y + dirs[d][1];
                    if (blocked[this.tileIndex(cornerX1, cornerY1)] ||
                        blocked[this.tileIndex(cornerX2, cornerY2)]) {
                        continue; // Can't squeeze through corners
                    }
                }

                const tentativeG = currentNode.g + moveCost;

                const existing = openSet.get(nKey);
                if (existing && tentativeG >= existing.g) continue;

                const h = this.heuristic(nx, ny, tx, ty);
                openSet.set(nKey, {
                    x: nx, y: ny,
                    g: tentativeG,
                    f: tentativeG + h,
                    parent: currentNode
                });
            }
        }

        return null; // No path found
    }

    reconstructPath(node) {
        const path = [];
        let current = node;
        while (current) {
            path.unshift({ x: current.x, y: current.y });
            current = current.parent;
        }
        return path;
    }

    // Check if a tile is walkable
    isWalkable(x, y) {
        if (x < 0 || y < 0 || x >= this.mapW || y >= this.mapH) return false;
        return !this.blocked[this.tileIndex(x, y)];
    }

    // Find nearest walkable tile to (x, y)
    findNearestWalkable(x, y, maxRadius = 20) {
        x = Math.floor(x);
        y = Math.floor(y);

        if (this.isWalkable(x, y)) return { x, y };

        // Spiral search
        for (let r = 1; r <= maxRadius; r++) {
            for (let dx = -r; dx <= r; dx++) {
                for (let dy = -r; dy <= r; dy++) {
                    if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue; // Only edge of square
                    const nx = x + dx;
                    const ny = y + dy;
                    if (this.isWalkable(nx, ny)) return { x: nx, y: ny };
                }
            }
        }

        return null;
    }
}

// Validate NPC spawn positions against blocked grid
export function validateNPCSpawns(spawnZones, blocked, mapW, mapH, tw, th, npcCount) {
    const validSpawns = [];
    const invalidSpawns = [];

    for (let i = 0; i < npcCount; i++) {
        const zone = spawnZones[i % spawnZones.length];

        // Try multiple random positions within zone
        let found = false;
        for (let attempt = 0; attempt < 20; attempt++) {
            const spawnX = zone.x + Math.floor(Math.random() * zone.width);
            const spawnY = zone.y + Math.floor(Math.random() * zone.height);

            const tx = Math.floor(spawnX / tw);
            const ty = Math.floor(spawnY / th);

            if (tx >= 0 && ty >= 0 && tx < mapW && ty < mapH) {
                const idx = ty * mapW + tx;
                if (!blocked[idx]) {
                    validSpawns.push({ x: spawnX, y: spawnY, tileX: tx, tileY: ty });
                    found = true;
                    break;
                }
            }
        }

        if (!found) {
            invalidSpawns.push({ zone: i % spawnZones.length, reason: "No walkable tile found in zone" });
        }
    }

    return { validSpawns, invalidSpawns };
}
