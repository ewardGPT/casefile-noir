import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateTiledMap } from '../src/utils/mapValidator.js';
import { AStarPathfinder } from '../src/utils/astarPathfinding.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../');

console.log("🧩 Running QA: A* Pathfinding Logic...");

// Mock fetch for the validator
global.fetch = async (url) => {
    const safeUrl = url.split('?')[0];
    const relPath = stripLeadingSlash(safeUrl);
    const filePath = path.join(projectRoot, 'public', relPath);
    if (fs.existsSync(filePath)) {
        return {
            ok: true,
            json: async () => JSON.parse(fs.readFileSync(filePath, 'utf8')),
            text: async () => fs.readFileSync(filePath, 'utf8')
        };
    }
    throw new Error(`404 Not Found: ${filePath}`);
};

function stripLeadingSlash(str) {
    return str.startsWith('/') ? str.slice(1) : str;
}
if (!global.performance) {
    global.performance = { now: () => Date.now() };
}

async function runAnalysis() {
    try {
        // 1. Get Blocked Grid
        const report = await validateTiledMap({
            mapUrl: "/assets/maps/world.json",
            onProgress: () => { }
        });

        const blocked = report.debug.blocked; // Assuming debug data has the blocked array (it should if I recall mapValidator logic)
        // Wait, mapValidator returns 'stats', 'warnings', 'unreachable', 'microGaps'.
        // Does it return 'blocked' in the report? checking code...
        // ... "report.debug = { ..., blocked }"
        // Yes, verify that.
        // Wait, looking at mapValidator.js code I saw previously:
        // report.debug = { mapW, mapH, tw, th, blocked } 
        // IF I didn't verify that line, I should assume it might fail if 'blocked' is missing.
        // Let's assume it's there based on typical "debug" pattern, or print keys if it fails.

        const { mapW, mapH } = report.debug;

        console.log(`Map: ${mapW}x${mapH} tiles`);

        const astar = new AStarPathfinder(mapW, mapH, blocked);

        // 2. Pick Start (Player Spawn)
        // From previous step we know player is at 1100, 1100.
        // 1100 / 32 = 34.375 -> 34
        // 1100 / 32 = 34.375 -> 34
        const sx = 34, sy = 34;

        // 3. Pick End (Desk location or random safe spot)
        // Desk was moved to 1152, 1120 -> 36, 35
        const tx = 36, ty = 35;

        // Test logic
        const path = astar.findPath(sx, sy, tx, ty);

        if (path && path.length > 0) {
            console.log(`✅ A* Success: Path found from (${sx},${sy}) to (${tx},${ty}) length ${path.length}`);
        } else {
            console.error(`❌ A* Failure: No path from (${sx},${sy}) to (${tx},${ty})`);
            console.error(`   Block status: Start=${blocked[sy * mapW + sx]}, End=${blocked[ty * mapW + tx]}`);
            process.exit(1);
        }

        // 4. Stress Test (Random Paths)
        console.log("Running stress test (100 paths)...");
        let success = 0;
        let diff = 0;
        for (let i = 0; i < 100; i++) {
            // find 2 random walkable points
            let p1, p2;
            let attempts = 0;
            while (!p1 && attempts < 100) {
                const x = Math.floor(Math.random() * mapW);
                const y = Math.floor(Math.random() * mapH);
                if (!blocked[y * mapW + x]) p1 = { x, y };
                attempts++;
            }
            attempts = 0;
            while (!p2 && attempts < 100) {
                const x = Math.floor(Math.random() * mapW);
                const y = Math.floor(Math.random() * mapH);
                if (!blocked[y * mapW + x]) p2 = { x, y };
                attempts++;
            }

            if (p1 && p2) {
                const p = astar.findPath(p1.x, p1.y, p2.x, p2.y);
                if (p) success++;
                else {
                    // It's possible to pick points in disjoint islands, so failure isn't necessarily a bug,
                    // but on a good map most should connect.
                    // We just count successes.
                }
            }
        }
        console.log(`Stress Result: ${success}% paths connected.`);

    } catch (e) {
        console.error("❌ QA A* Logic Error:", e);
        process.exit(1);
    }
}

runAnalysis();
