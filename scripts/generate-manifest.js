import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Script is in /scripts/. 
// We want to reach /client/public/assets/tilesets_json
const PROJECT_ROOT = path.resolve(__dirname, '..');
const TILESETS_JSON_DIR = path.join(PROJECT_ROOT, 'client/public/assets/tilesets_json');
const MANIFEST_PATH = path.join(PROJECT_ROOT, 'client/public/assets/tilesets_manifest.json');

// Ensure dir exists
if (!fs.existsSync(TILESETS_JSON_DIR)) {
    console.error(`Directory not found: ${TILESETS_JSON_DIR}`);
    // If it doesn't exist, maybe we are just missing assets. Make empty manifest.
    fs.writeFileSync(MANIFEST_PATH, '[]');
    process.exit(0);
}

const files = fs.readdirSync(TILESETS_JSON_DIR).filter(file => file.endsWith('.json'));
const manifest = files.map(file => {
    return {
        key: file.replace('.json', ''),
        path: `assets/tilesets_json/${file}`
    };
});

fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
console.log(`Generated manifest with ${manifest.length} entries at ${MANIFEST_PATH}`);
