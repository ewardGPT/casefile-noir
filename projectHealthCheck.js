const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = __dirname;
const clientDir = path.join(rootDir, 'client');
const publicDir = path.join(clientDir, 'public');
const assetsDir = path.join(publicDir, 'assets');
const mapsDir = path.join(assetsDir, 'maps');
const bootPath = path.join(clientDir, 'src', 'scenes', 'Boot.js');

let hasFailure = false;
const missingFiles = [];
const duplicateKeys = [];

const logPass = (message) => {
    console.log(`✅ PASS: ${message}`);
};

const logFail = (message) => {
    hasFailure = true;
    console.error(`❌ FAIL: ${message}`);
    missingFiles.push(message);
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

// 1. Validate map JSON exists (check both world.json and city_map_split.json)
const checkWorldJson = () => {
    console.log('\n📋 Checking map JSON...');
    // Check for city_map_split.json first (used by Boot.js)
    const cityMapPath = path.join(mapsDir, 'victorian', 'city_map_split.json');
    const worldPath = path.join(mapsDir, 'world.json');
    
    if (exists(cityMapPath)) {
        logPass(`city_map_split.json exists at ${path.relative(rootDir, cityMapPath)}`);
        return cityMapPath;
    } else if (exists(worldPath)) {
        logPass(`world.json exists at ${path.relative(rootDir, worldPath)}`);
        return worldPath;
    }
    
    logFail(`Map JSON missing: checked ${path.relative(rootDir, cityMapPath)} and ${path.relative(rootDir, worldPath)}`);
    return null;
};

// 2. Validate tileset images referenced by world.json
const checkMapTilesets = (worldPath) => {
    console.log('\n🗺️  Checking map tilesets...');
    if (!worldPath || !exists(worldPath)) {
        logFail('Cannot check tilesets: world.json not found');
        return;
    }

    const mapData = readJson(worldPath);
    if (!mapData) {
        return;
    }

    if (!Array.isArray(mapData.tilesets)) {
        logFail('world.json has no tilesets array');
        return;
    }

    if (mapData.tilesets.length === 0) {
        logPass('world.json has empty tilesets array (no tilesets to validate)');
        return;
    }

    const tilesetImages = new Set();
    mapData.tilesets.forEach((tileset, index) => {
        if (!tileset) {
            logFail(`Tileset at index ${index} is null or undefined`);
            return;
        }

        // Check direct image reference
        if (tileset.image) {
            const imagePath = path.resolve(path.dirname(worldPath), tileset.image);
            tilesetImages.add(imagePath);
            if (exists(imagePath)) {
                logPass(`Tileset image exists: ${path.relative(rootDir, imagePath)}`);
            } else {
                logFail(`Missing tileset image: ${path.relative(rootDir, imagePath)}`);
            }
        }

        // Check external tileset source
        if (tileset.source) {
            const sourcePath = path.resolve(path.dirname(worldPath), tileset.source);
            if (exists(sourcePath)) {
                logPass(`External tileset source exists: ${path.relative(rootDir, sourcePath)}`);
                // Also check the image referenced in the external tileset
                const sourceData = readJson(sourcePath);
                if (sourceData && sourceData.image) {
                    const sourceImagePath = path.resolve(path.dirname(sourcePath), sourceData.image);
                    if (exists(sourceImagePath)) {
                        logPass(`External tileset image exists: ${path.relative(rootDir, sourceImagePath)}`);
                    } else {
                        logFail(`Missing external tileset image: ${path.relative(rootDir, sourceImagePath)}`);
                    }
                }
            } else {
                logFail(`Missing external tileset source: ${path.relative(rootDir, sourcePath)}`);
            }
        }
    });

    if (tilesetImages.size === 0) {
        logFail('No tileset images found in world.json');
    }
};

// 3. Validate assets loaded in Boot.js
const checkBootAssets = () => {
    console.log('\n🎮 Checking Boot.js assets...');
    if (!exists(bootPath)) {
        logFail(`Boot.js missing: ${bootPath}`);
        return;
    }

    let bootSource = fs.readFileSync(bootPath, 'utf8');
    
    // Remove single-line comments to avoid matching commented-out loader calls
    bootSource = bootSource.replace(/\/\/.*$/gm, '');
    
    const pathMatch = bootSource.match(/const\s+path\s*=\s*['"]([^'"]+)['"]/);
    const basePath = pathMatch ? pathMatch[1] : '';

    const assetKeys = new Map(); // Track keys for duplicate detection
    const assetPaths = [];
    
    // Handle for loops with template literals first
    // Match: for (let i = 0; i < 8; i++) { this.load.image(`terrain-map-v8_${i}`, `${path}terrain-map-v8_${i}.png`); }
    // Also match: for (let i = 1; i <= 35; i++) { this.load.spritesheet(`npc_${i}`, `assets/sprites/characters/npc_${i}.png`, ...); }
    const forLoopBlockRegex = /for\s*\([^)]*let\s+i\s*=\s*(\d+)[^)]*i\s*([<>]=?)\s*(\d+)[^)]*\)\s*\{[^}]*this\.load\.(image|spritesheet)\([^)]*`([^`]*)\$\{i\}([^`]*)`[^)]*`([^`]*)\$\{([^}]+)\}([^`]*)`/g;
    let match;
    
    while ((match = forLoopBlockRegex.exec(bootSource)) !== null) {
        const start = parseInt(match[1], 10);
        const comparison = match[2];
        const endNum = parseInt(match[3], 10);
        const loaderType = match[4];
        const keyPrefix = match[5] || '';
        const keySuffix = match[6] || '';
        const pathPrefix = match[7] || '';
        const pathVar = match[8] || '';
        const pathSuffix = match[9] || '';
        
        // Determine end value based on comparison operator
        let end = endNum;
        if (comparison === '<=') {
            end = endNum; // inclusive: i <= endNum
        } else {
            end = endNum - 1; // exclusive: i < endNum means i goes from start to endNum-1
        }
        
        for (let i = start; i <= end; i++) {
            const key = `${keyPrefix}${i}${keySuffix}`;
            let assetPath = '';
            
            // Resolve path template
            if (pathPrefix.includes('path') || pathVar === 'path') {
                // Handle `${path}terrain-map-v8_${i}.png` pattern
                assetPath = basePath + `${pathPrefix.replace('${path}', '')}${i}${pathSuffix}`;
            } else {
                // Handle `assets/sprites/characters/npc_${i}.png` pattern
                assetPath = `${pathPrefix}${i}${pathSuffix}`;
            }
            
            // Check for duplicate keys
            if (assetKeys.has(key)) {
                duplicateKeys.push(`Duplicate loader key "${key}" (first at ${assetKeys.get(key)}, second at line ${getLineNumber(bootSource, match.index)})`);
            } else {
                assetKeys.set(key, `line ${getLineNumber(bootSource, match.index)}`);
            }
            
            assetPaths.push({ key, path: assetPath, type: loaderType });
        }
    }
    
    // Handle string literals (non-template)
    // Match: this.load.image('key', 'path') OR this.load.image('key', path + 'filename')
    // For spritesheet: this.load.spritesheet('key', 'path', {...}) - stop before options object
    const stringLoaderRegex = /this\.load\.(image|spritesheet|tilemapTiledJSON|audio|bitmapFont|atlas|multiatlas|text|json|xml|glsl|html|shader|htmlTexture|unityAtlas|unityYAML|spine|gltf|obj|fbx|pipeline)\(\s*['"]([^'"]+)['"]\s*,\s*([^,)]+)(?:,|\))/g;
    while ((match = stringLoaderRegex.exec(bootSource)) !== null) {
        const loaderType = match[1];
        const key = match[2];
        const pathExpr = match[3].trim();
        let assetPath = '';
        
        // Skip if already processed (from template literal)
        if (assetKeys.has(key)) {
            continue;
        }
        
        // Resolve path expression
        // Case 1: Simple string literal: 'assets/sprites/characters/detective.png'
        const simpleStringMatch = pathExpr.match(/^['"]([^'"]+)['"]$/);
        if (simpleStringMatch) {
            assetPath = simpleStringMatch[1];
        }
        // Case 2: Path concatenation: path + 'victorian-tenement.png'
        else if (pathExpr.includes('path +')) {
            const pathMatch = pathExpr.match(/path\s*\+\s*['"]([^'"]+)['"]/);
            if (pathMatch && basePath) {
                assetPath = basePath + pathMatch[1];
            } else {
                logFail(`Could not resolve path expression for ${key}: ${pathExpr}`);
                continue;
            }
        }
        // Case 3: Template literal (should have been caught above, but handle just in case)
        else if (pathExpr.includes('`')) {
            // Skip template literals - they're handled above
            continue;
        }
        else {
            logFail(`Unrecognized path expression for ${key}: ${pathExpr}`);
            continue;
        }
        
        // Check for duplicate keys
        if (assetKeys.has(key)) {
            duplicateKeys.push(`Duplicate loader key "${key}" (first at ${assetKeys.get(key)}, second at line ${getLineNumber(bootSource, match.index)})`);
        } else {
            assetKeys.set(key, `line ${getLineNumber(bootSource, match.index)}`);
        }
        
        assetPaths.push({ key, path: assetPath, type: loaderType });
    }

    // Resolve paths
    const resolvedPaths = new Set();
    assetPaths.forEach(({ key, path: assetPath, type }) => {
        let resolvedPath;
        
        // Handle absolute paths (starting with /)
        if (assetPath.startsWith('/')) {
            resolvedPath = path.join(publicDir, assetPath.substring(1));
        }
        // Handle relative paths
        else if (assetPath.startsWith('assets/')) {
            resolvedPath = path.join(publicDir, assetPath);
        }
        // Handle paths with basePath variable
        else if (basePath && assetPath.startsWith(basePath)) {
            resolvedPath = path.join(publicDir, assetPath);
        }
        // Handle concatenated paths
        else if (basePath) {
            resolvedPath = path.join(publicDir, basePath, assetPath);
        }
        else {
            resolvedPath = path.join(publicDir, assetPath);
        }

        resolvedPaths.add({ key, path: resolvedPath, type });
    });

    if (resolvedPaths.size === 0) {
        logFail('Boot asset scan found no asset paths');
        return;
    }

    // Check each asset
    resolvedPaths.forEach(({ key, path: assetPath, type }) => {
        if (exists(assetPath)) {
            logPass(`Boot asset exists: ${key} -> ${path.relative(rootDir, assetPath)}`);
        } else {
            logFail(`Boot asset missing: ${key} -> ${path.relative(rootDir, assetPath)}`);
        }
    });
};

// Helper to get line number from index
const getLineNumber = (text, index) => {
    return text.substring(0, index).split('\n').length;
};

// 4. Check for duplicate Phaser loader keys
const checkDuplicateKeys = () => {
    console.log('\n🔑 Checking for duplicate loader keys...');
    if (duplicateKeys.length === 0) {
        logPass('No duplicate loader keys found');
    } else {
        duplicateKeys.forEach(dup => {
            logFail(dup);
        });
    }
};

// 5. Check for .env files tracked by git
const checkGitTrackedEnvFiles = () => {
    console.log('\n🔒 Checking for .env files tracked by git...');
    try {
        // Check if git is available
        try {
            execSync('git --version', { stdio: 'ignore' });
        } catch (e) {
            logFail('Git not available - cannot check tracked .env files');
            return;
        }

        // Check if we're in a git repo
        try {
            execSync('git rev-parse --git-dir', { stdio: 'ignore', cwd: rootDir });
        } catch (e) {
            logPass('Not a git repository - skipping .env check');
            return;
        }

        // Find all .env files tracked by git (cross-platform)
        let trackedEnvFiles = [];
        try {
            const gitLsFiles = execSync('git ls-files', { 
                cwd: rootDir,
                encoding: 'utf8'
            });
            const allFiles = gitLsFiles.trim().split('\n').filter(f => f);
            // Filter for .env files (exclude .env.example which is typically safe to track)
            trackedEnvFiles = allFiles.filter(file => {
                const fileName = path.basename(file);
                return (fileName === '.env' || fileName.startsWith('.env.')) && !fileName.includes('.example');
            });
        } catch (e) {
            logFail(`Error checking git tracked files: ${e.message}`);
            return;
        }

        if (trackedEnvFiles.length === 0) {
            logPass('No .env files tracked by git');
        } else {
            trackedEnvFiles.forEach(file => {
                logFail(`.env file tracked by git: ${file}`);
            });
        }
    } catch (error) {
        logFail(`Error checking git tracked .env files: ${error.message}`);
    }
};

// Main execution
console.log('═══════════════════════════════════════════════════════════');
console.log('           PROJECT HEALTH CHECK');
console.log('═══════════════════════════════════════════════════════════');

const worldPath = checkWorldJson();
checkMapTilesets(worldPath);
checkBootAssets();
checkDuplicateKeys();
checkGitTrackedEnvFiles();

console.log('\n═══════════════════════════════════════════════════════════');
if (hasFailure) {
    console.error('\n❌ HEALTH CHECK FAILED');
    console.error('\nMissing Files Summary:');
    missingFiles.forEach((file, index) => {
        console.error(`  ${index + 1}. ${file}`);
    });
    if (duplicateKeys.length > 0) {
        console.error('\nDuplicate Keys:');
        duplicateKeys.forEach((dup, index) => {
            console.error(`  ${index + 1}. ${dup}`);
        });
    }
    process.exit(1);
} else {
    console.log('\n✅ HEALTH CHECK PASSED - All assets validated');
    process.exit(0);
}
