
import { AStarPathfinder } from '../src/utils/astarPathfinding.js';

describe('AStarPathfinder', () => {
    let pathfinder;
    let blocked;
    const mapW = 10;
    const mapH = 10;

    beforeEach(() => {
        blocked = new Uint8Array(mapW * mapH);
        pathfinder = new AStarPathfinder(mapW, mapH, blocked);
    });

    test('findPath finds simple path', () => {
        const path = pathfinder.findPath(0, 0, 0, 5);
        expect(path).toBeDefined();
        expect(path[path.length - 1]).toEqual({ x: 0, y: 5 });
    });

    test('findPath avoids obstacles', () => {
        // Block (1,0) to (1,8) wall
        for (let y = 0; y < 9; y++) {
            blocked[y * mapW + 1] = 1;
        }

        // Path from (0,0) to (2,0) needs to go around
        const path = pathfinder.findPath(0, 0, 2, 0);

        expect(path).toBeDefined();
        // Check filtering of blocked nodes
        path.forEach(p => {
            const idx = p.y * mapW + p.x;
            expect(blocked[idx]).toBe(0);
        });

        // It should go down to y=9 and back up or similar
        expect(path.length).toBeGreaterThan(2);
    });

    test('findPath returns null if target unreachable', () => {
        // Enclose (9,9)
        blocked[8 * mapW + 9] = 1;
        blocked[9 * mapW + 8] = 1;
        blocked[8 * mapW + 8] = 1; // Diagonal

        const path = pathfinder.findPath(0, 0, 9, 9);
        expect(path).toBeNull();
    });

    test('isWalkable check', () => {
        expect(pathfinder.isWalkable(0, 0)).toBe(true);
        expect(pathfinder.isWalkable(-1, 0)).toBe(false);

        blocked[0] = 1;
        expect(pathfinder.isWalkable(0, 0)).toBe(false);
    });
});
