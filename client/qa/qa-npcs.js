import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateTiledMap } from '../src/utils/mapValidator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../');

console.log("🤖 Running QA: NPC Spawning Logic...");

// Mock fetch for the validator
global.fetch = async (url) => {
    // URL will be like "/assets/maps/world.json"
    // We map it to local file system
    const safeUrl = url.split('?')[0]; // remove query params
    const relPath = stripLeadingSlash(safeUrl);

    // Attempt to find in public
    const filePath = path.join(projectRoot, 'public', relPath);

    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        return {
            ok: true,
            json: async () => JSON.parse(content),
            text: async () => content
        };
    }

    throw new Error(`404 Not Found: ${filePath}`);
};

function stripLeadingSlash(str) {
    return str.startsWith('/') ? str.slice(1) : str;
}

// Emulate performance.now
if (!global.performance) {
    global.performance = { now: () => Date.now() };
}


async function runAnalysis() {
    try {
        const report = await validateTiledMap({
            mapUrl: "/assets/maps/world.json",
            onProgress: () => { } // silence progress
        });

        // Check 1: NPC Spawns Count
        const spawnCount = report.stats.npcSpawnsValidated || 0;
        const failedCount = report.stats.npcSpawnsFailed || 0;
        const totalTarget = spawnCount + failedCount;

        console.log(`\n--- NPC Analysis ---`);
        console.log(`Validated Spawns: ${spawnCount}`);
        console.log(`Failed Spawns:    ${failedCount}`);

        if (spawnCount < 35) {
            console.error(`❌ FAILURE: Expected 35 NPCs, only found valid spots for ${spawnCount}`);
            console.error(`   (Map might be too crowded or blocked)`);
            process.exit(1);
        } else {
            console.log(`✅ Success: All 35 NPCs have valid spawn points.`);
        }

        // Check 2: Player Spawn
        if (!report.stats.validPlayerSpawn) {
            console.error(`❌ FAILURE: Player spawn is blocked/invalid.`);
            process.exit(1);
        } else {
            console.log(`✅ Success: Player spawn is valid.`);
        }

    } catch (e) {
        console.error("❌ QA Logic Error:", e);
        process.exit(1);
    }
}

runAnalysis();
