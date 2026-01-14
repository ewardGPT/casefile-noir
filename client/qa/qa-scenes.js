import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../');

console.log("🎬 Running QA: Scenes Check...");

let errors = 0;
const scenesDir = path.join(projectRoot, 'src/scenes');
const files = fs.readdirSync(scenesDir).filter(f => f.endsWith('.js'));

const definedKeys = new Set();
const referencedKeys = new Set();

// 1. Collect Keys
files.forEach(f => {
    const content = fs.readFileSync(path.join(scenesDir, f), 'utf8');
    const keyMatch = content.match(/super\(\s*(?:['"](.+?)['"]|\{\s*key:\s*['"](.+?)['"])/);
    if (keyMatch) {
        const key = keyMatch[1] || keyMatch[2];
        definedKeys.add(key);
    }
});

// 2. Scan References
files.forEach(f => {
    const content = fs.readFileSync(path.join(scenesDir, f), 'utf8');
    // this.scene.start('Key') or launch or switch
    const matches = content.matchAll(/scene\.(start|launch|switch|run|sleep|wake)\(['"](.+?)['"]/g);
    for (const match of matches) {
        referencedKeys.add(match[2]);
    }
});

// 3. Verify
referencedKeys.forEach(key => {
    if (!definedKeys.has(key)) {
        console.error(`❌ Scene reference to unknown key "${key}"`);
        errors++;
    }
});

// 4. Boot Logic
// Verify Boot starts StartMenu?
// This is harder to regex reliably without AST, but we can do a simple check.
// Skip for now to keep it deterministic and simple.

if (errors > 0) {
    console.error(`FAILED: ${errors} scene checks failed.`);
    process.exit(1);
} else {
    console.log(`✅ Scenes Check PASS (${definedKeys.size} scenes)`);
}
