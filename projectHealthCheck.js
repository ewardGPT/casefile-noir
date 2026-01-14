const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const clientDir = path.join(rootDir, 'client');
const publicDir = path.join(clientDir, 'public');
const mapsDir = path.join(publicDir, 'assets', 'maps');
const bootPath = path.join(clientDir, 'src', 'scenes', 'Boot.js');

let hasFailure = false;

const logPass = (message) => {
    console.log(`PASS: ${message}`);
};

const logFail = (message) => {
    hasFailure = true;
    console.error(`FAIL: ${message}`);
};

const exists = (filePath) => fs.existsSync(filePath);

const readJson = (filePath) => {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        logFail(`Invalid JSON: ${filePath} (${error.message})`);
        return null;
    }
};

const walkFiles = (dir, predicate) => {
    const results = [];
    if (!exists(dir)) {
        return results;
    }
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...walkFiles(fullPath, predicate));
        } else if (!predicate || predicate(fullPath)) {
            results.push(fullPath);
        }
    });
    return results;
};

const checkWorldJson = () => {
    const worldPath = path.join(mapsDir, 'world.json');
    if (exists(worldPath)) {
        logPass('world.json exists');
        return;
    }
    logFail(`world.json missing at ${worldPath}`);
};

const checkMapTilesets = () => {
    const mapFiles = walkFiles(mapsDir, (file) => file.endsWith('.json'));
    if (!mapFiles.length) {
        logFail(`No map JSON files found under ${mapsDir}`);
        return;
    }
    mapFiles.forEach((mapPath) => {
        const mapData = readJson(mapPath);
        if (!mapData || !Array.isArray(mapData.tilesets)) {
            return;
        }
        mapData.tilesets.forEach((tileset) => {
            if (!tileset) {
                return;
            }
            if (tileset.image) {
                const imagePath = path.resolve(path.dirname(mapPath), tileset.image);
                if (exists(imagePath)) {
                    logPass(`Tileset image exists: ${imagePath}`);
                } else {
                    logFail(`Missing tileset image: ${imagePath}`);
                }
            }
            if (tileset.source) {
                const sourcePath = path.resolve(path.dirname(mapPath), tileset.source);
                if (!exists(sourcePath)) {
                    logFail(`Missing external tileset source: ${sourcePath}`);
                }
            }
        });
    });
};

const checkBootAssets = () => {
    if (!exists(bootPath)) {
        logFail(`Boot scene missing: ${bootPath}`);
        return;
    }
    const bootSource = fs.readFileSync(bootPath, 'utf8');
    const pathMatch = bootSource.match(/const\s+path\s*=\s*['"]([^'"]+)['"]/);
    const basePath = pathMatch ? pathMatch[1] : '';

    const loadRegex = /this\.load\.(image|spritesheet|tilemapTiledJSON)\([^,]+,\s*([^)]+)\)/g;
    const assetPaths = [];
    let match;
    while ((match = loadRegex.exec(bootSource)) !== null) {
        const expr = match[2].trim();
        assetPaths.push(expr);
    }

    const resolvedPaths = new Set();
    const addResolvedPath = (relativePath) => {
        if (!relativePath) return;
        const fullPath = path.join(publicDir, relativePath);
        resolvedPaths.add(fullPath);
    };

    assetPaths.forEach((expr) => {
        const literalMatch = expr.match(/^['"]([^'"]+)['"]$/);
        if (literalMatch) {
            addResolvedPath(literalMatch[1]);
            return;
        }
        const concatMatch = expr.match(/path\s*\+\s*['"]([^'"]+)['"]/);
        if (concatMatch && basePath) {
            addResolvedPath(`${basePath}${concatMatch[1]}`);
            return;
        }
        const templateMatch = expr.match(/^`([^`]+)`$/);
        if (templateMatch) {
            const template = templateMatch[1];
            if (template.includes('${path}') && basePath) {
                const resolved = template.replace('${path}', basePath);
                if (resolved.includes('${i}')) {
                    if (resolved.includes('terrain-map-v8_${i}.png')) {
                        for (let i = 0; i < 8; i++) {
                            addResolvedPath(resolved.replace('${i}', String(i)));
                        }
                        return;
                    }
                    if (resolved.includes('npc_${i}.png')) {
                        for (let i = 1; i <= 35; i++) {
                            addResolvedPath(resolved.replace('${i}', String(i)));
                        }
                        return;
                    }
                }
                addResolvedPath(resolved);
                return;
            }
            if (template.includes('${i}') && template.includes('npc_${i}.png')) {
                for (let i = 1; i <= 35; i++) {
                    addResolvedPath(template.replace('${i}', String(i)));
                }
                return;
            }
        }
    });

    if (!resolvedPaths.size) {
        logFail('Boot asset scan found no asset paths.');
        return;
    }

    resolvedPaths.forEach((fullPath) => {
        if (exists(fullPath)) {
            logPass(`Boot asset exists: ${fullPath}`);
        } else {
            logFail(`Boot asset missing: ${fullPath}`);
        }
    });
};

const checkSceneKeys = () => {
    const scenesDir = path.join(clientDir, 'src', 'scenes');
    const sceneFiles = walkFiles(scenesDir, (file) => file.endsWith('.js'));
    const declaredKeys = new Set();
    const referencedKeys = new Set();

    sceneFiles.forEach((filePath) => {
        const contents = fs.readFileSync(filePath, 'utf8');
        const superMatches = contents.matchAll(/super\(\s*['"]([^'"]+)['"]\s*\)/g);
        for (const match of superMatches) {
            declaredKeys.add(match[1]);
        }
        const startMatches = contents.matchAll(/scene\.start\(\s*['"]([^'"]+)['"]/g);
        for (const match of startMatches) {
            referencedKeys.add(match[1]);
        }
    });

    referencedKeys.forEach((key) => {
        if (declaredKeys.has(key)) {
            logPass(`Scene key resolved: ${key}`);
        } else {
            logFail(`Scene key mismatch: ${key} not declared by any scene`);
        }
    });
};

const checkImportPaths = () => {
    const srcDir = path.join(clientDir, 'src');
    const files = walkFiles(srcDir, (file) => file.endsWith('.js'));
    files.forEach((filePath) => {
        const contents = fs.readFileSync(filePath, 'utf8');
        const importMatches = contents.matchAll(/from\s+['"]([^'"]+)['"]/g);
        for (const match of importMatches) {
            const importPath = match[1];
            if (!importPath.startsWith('.')) {
                continue;
            }
            const resolvedBase = path.resolve(path.dirname(filePath), importPath);
            const candidates = [
                resolvedBase,
                `${resolvedBase}.js`,
                path.join(resolvedBase, 'index.js')
            ];
            if (!candidates.some((candidate) => exists(candidate))) {
                logFail(`Missing import target from ${filePath}: ${importPath}`);
            }
        }
    });
};

console.log('--- Project Health Check ---');
checkWorldJson();
checkMapTilesets();
checkBootAssets();
checkSceneKeys();
checkImportPaths();

if (hasFailure) {
    console.error('Health Check FAILED');
    process.exitCode = 1;
} else {
    console.log('Health Check PASSED');
}
