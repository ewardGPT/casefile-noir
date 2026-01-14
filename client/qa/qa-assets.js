import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../');

console.log("📦 Running QA: Assets Check...");

let errors = 0;
const keys = new Set();
const bootPath = path.join(projectRoot, 'src/scenes/Boot.js');

if (!fs.existsSync(bootPath)) {
    console.error("❌ Boot.js missing, cannot scan assets.");
    process.exit(1);
}

const content = fs.readFileSync(bootPath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
    // Match this.load.image('key', 'path') or .spritesheet, .audio, etc.
    // Simple regex for 'key', 'path'
    const match = line.match(/this\.load\.(image|spritesheet|audio|tilemapTiledJSON|bitmapFont)\(\s*['"](.+?)['"]\s*,\s*['"](.+?)['"]/);
    if (match) {
        const type = match[1];
        const key = match[2];
        const relPath = match[3];

        // 1. Duplicate Keys
        if (keys.has(key)) {
            console.error(`❌ Duplicate loader key "${key}" at line ${idx + 1}`);
            errors++;
        }
        keys.add(key);

        // 2. File Existence
        // Paths are relative to public/ usually
        const assetPath = path.join(projectRoot, 'public', relPath);
        if (!fs.existsSync(assetPath)) {
            console.error(`❌ Missing asset file: ${relPath} (key: ${key})`);
            errors++;
        }
    }
});

if (errors > 0) {
    console.error(`FAILED: ${errors} asset checks failed.`);
    process.exit(1);
} else {
    console.log(`✅ Assets Check PASS (${keys.size} assets verified)`);
}
