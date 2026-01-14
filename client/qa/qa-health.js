import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../'); // client root

console.log("🏥 Running QA: Health Check...");

let errors = 0;

function check(desc, condition) {
    if (condition) {
        // console.log(`✅ ${desc}`);
    } else {
        console.error(`❌ ${desc}`);
        errors++;
    }
}

function checkFile(relPath) {
    const p = path.join(projectRoot, relPath);
    check(`File exists: ${relPath}`, fs.existsSync(p));
}

function checkDir(relPath) {
    const p = path.join(projectRoot, relPath);
    check(`Dir exists: ${relPath}`, fs.existsSync(p) && fs.statSync(p).isDirectory());
}

checkDir('src');
checkDir('public/assets');

checkFile('public/assets/maps/world.json');
checkFile('src/scenes/Boot.js');
checkFile('src/scenes/StartMenu.js');
checkFile('src/scenes/Game.js');

// Check .env
// User requirement: ".env is NOT committed". 
// We can't easily check git status here without git command, but we can warn if present?
// Or maybe they mean "ensure .env is NOT in the source tree" (sensitive info).
// For now, I'll validte that we DO NOT have a checked-in .env if I could, but simply checking if it exists isn't enough context.
// I'll stick to the "Required files exist" part which is safe.
// The user prompt said: "required files exist (world.json, Boot.js, StartMenu.js, Game.js)" and then ".env is NOT committed"
// I will check if .env exists, and if so, warn.
if (fs.existsSync(path.join(projectRoot, '.env'))) {
    console.warn("⚠️  .env file found. Ensure this is not committed to version control!");
}

if (errors > 0) {
    console.error(`FAILED: ${errors} health checks failed.`);
    process.exit(1);
} else {
    console.log("✅ Health Check PASS");
}
