import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../../..');
const clientSrc = path.join(projectRoot, 'client/src');
const publicAssets = path.join(projectRoot, 'client/public/assets');

console.log("🏥 Starting Project Health Check...");

const report = {
    errors: [],
    warnings: [],
    info: []
};

function checkFileExists(relPath) {
    const fullPath = path.join(projectRoot, relPath);
    if (!fs.existsSync(fullPath)) {
        report.errors.push(`Missing file: ${relPath}`);
        return false;
    }
    return true;
}

// 1. Verify Structure
checkFileExists('client/index.html');
checkFileExists('client/src/main.js'); // Fixed path
checkFileExists('client/public/assets/maps/world.json');

// 2. Verify Scenes
const scenesDir = path.join(clientSrc, 'scenes');
if (fs.existsSync(scenesDir)) {
    const scenes = fs.readdirSync(scenesDir).filter(f => f.endsWith('.js'));
    report.info.push(`Found ${scenes.length} scenes: ${scenes.join(', ')}`);

    // Check for duplicated class names or keys
    const sceneKeys = {};
    scenes.forEach(file => {
        const content = fs.readFileSync(path.join(scenesDir, file), 'utf8');
        // Match super({ key: "..." }) OR super("...")
        const match = content.match(/super\(\s*(?:['"](.+?)['"]|\{\s*key:\s*['"](.+?)['"])/);
        if (match) {
            const key = match[1] || match[2];
            if (sceneKeys[key]) {
                report.errors.push(`Duplicate Scene Key "${key}" found in ${file} (also in ${sceneKeys[key]})`);
            } else {
                sceneKeys[key] = file;
            }
        }
    });
    report.info.push(`Registered Scene Keys: ${Object.keys(sceneKeys).join(', ')}`);
}

// 3. Verify Map Assets
const mapJsonPath = path.join(publicAssets, 'maps/world.json');
if (fs.existsSync(mapJsonPath)) {
    try {
        const mapData = JSON.parse(fs.readFileSync(mapJsonPath, 'utf8'));
        report.info.push(`Map loaded: ${mapData.width}x${mapData.height} tiles`);

        // Check tilesets
        mapData.tilesets.forEach(ts => {
            if (ts.image) {
                const imageName = path.basename(ts.image);
                // Heuristic check in common folders
                const possiblePaths = [
                    `client/public/assets/tilesets/${imageName}`,
                    `client/public/assets/images/${imageName}`,
                    `client/public/assets/maps/${ts.image}`
                ];

                const found = possiblePaths.some(p => fs.existsSync(path.join(projectRoot, p)));
                if (!found) {
                    report.warnings.push(`Tileset image "${imageName}" referenced in map might be missing (checked common paths).`);
                }
            }
        });
    } catch (e) {
        report.errors.push(`Failed to parse world.json: ${e.message}`);
    }
}

// 4. Verify NPC Assets logic (Boot.js)
const bootPath = path.join(scenesDir, 'Boot.js');
if (fs.existsSync(bootPath)) {
    const content = fs.readFileSync(bootPath, 'utf8');
    if (!content.includes('load.spritesheet')) {
        report.warnings.push("Boot.js does not seem to load spritesheets?");
    }
}

// Report
console.log("\n--- REPORT ---");
if (report.errors.length > 0) {
    console.error("❌ ERRORS:");
    report.errors.forEach(e => console.error(`  - ${e}`));
} else {
    console.log("✅ No critical errors found.");
}

if (report.warnings.length > 0) {
    console.warn("⚠️ WARNINGS:");
    report.warnings.forEach(w => console.warn(`  - ${w}`));
}

if (report.info.length > 0) {
    console.log("ℹ️ INFO:");
    report.info.forEach(i => console.log(`  - ${i}`));
}

console.log("----------------");
if (report.errors.length > 0) process.exit(1);
