/**
 * Runtime QA Harness for Phaser 3 Game
 * 
 * Provides error trapping, state inspection, and automated QA mode
 * Usage: Add ?qa=1 to URL for automated QA run
 */

let qaState = {
    errors: [],
    warnings: [],
    asset404s: [],
    missingTextures: [],
    sceneKeys: [],
    currentScene: null,
    playerState: null,
    npcCount: 0,
    startTime: null
};

// Check if QA mode is enabled
const urlParams = new URLSearchParams(window.location.search);
const qaMode = urlParams.get('qa') === '1';

// Error trapping
const originalOnError = window.onerror;
window.onerror = function(message, source, lineno, colno, error) {
    const errorInfo = {
        type: 'error',
        message: String(message),
        source: String(source),
        line: lineno,
        col: colno,
        stack: error?.stack || null,
        timestamp: Date.now()
    };
    qaState.errors.push(errorInfo);
    
    if (originalOnError) {
        originalOnError.call(this, message, source, lineno, colno, error);
    }
    return false;
};

const originalOnUnhandledRejection = window.onunhandledrejection;
window.onunhandledrejection = function(event) {
    const reason = event.reason;
    const errorInfo = {
        type: 'unhandledRejection',
        message: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : null,
        timestamp: Date.now()
    };
    qaState.errors.push(errorInfo);
    
    if (originalOnUnhandledRejection) {
        originalOnUnhandledRejection.call(this, event);
    }
};

// Expose QA state globally
window.__QA__ = {
    getState: () => ({ ...qaState }),
    getErrors: () => [...qaState.errors],
    getWarnings: () => [...qaState.warnings],
    getAsset404s: () => [...qaState.asset404s],
    getMissingTextures: () => [...qaState.missingTextures],
    clear: () => {
        qaState = {
            errors: [],
            warnings: [],
            asset404s: [],
            missingTextures: [],
            sceneKeys: [],
            currentScene: null,
            playerState: null,
            npcCount: 0,
            startTime: Date.now()
        };
    },
    logWarning: (msg) => {
        qaState.warnings.push({ message: msg, timestamp: Date.now() });
        console.warn('[QA]', msg);
    },
    logAsset404: (key, src) => {
        qaState.asset404s.push({ key, src, timestamp: Date.now() });
        console.error('[QA] Asset 404:', key, 'from', src);
    },
    logMissingTexture: (key) => {
        if (!qaState.missingTextures.includes(key)) {
            qaState.missingTextures.push(key);
            console.warn('[QA] Missing texture:', key);
        }
    },
    updateScene: (sceneKey) => {
        qaState.currentScene = sceneKey;
        if (!qaState.sceneKeys.includes(sceneKey)) {
            qaState.sceneKeys.push(sceneKey);
        }
    },
    updatePlayer: (x, y, vx, vy) => {
        qaState.playerState = { x, y, vx, vy, timestamp: Date.now() };
    },
    updateNPCs: (count) => {
        qaState.npcCount = count;
    }
};

// QA Summary printer
function printQASummary(game) {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('                    QA SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const hasErrors = qaState.errors.length > 0;
    const hasWarnings = qaState.warnings.length > 0;
    const hasAsset404s = qaState.asset404s.length > 0;
    const hasMissingTextures = qaState.missingTextures.length > 0;
    
    // Overall status
    if (hasErrors || hasAsset404s) {
        console.error('❌ QA CHECK FAILED\n');
    } else {
        console.log('✅ QA CHECK PASSED\n');
    }
    
    // Scene info
    console.log('📋 Scene Information:');
    console.log(`   Current Scene: ${qaState.currentScene || 'N/A'}`);
    console.log(`   Scenes Visited: ${qaState.sceneKeys.join(', ') || 'None'}`);
    console.log('');
    
    // Player info
    if (qaState.playerState) {
        console.log('👤 Player State:');
        console.log(`   Position: (${qaState.playerState.x?.toFixed(2) || 'N/A'}, ${qaState.playerState.y?.toFixed(2) || 'N/A'})`);
        console.log(`   Velocity: (${qaState.playerState.vx?.toFixed(2) || 'N/A'}, ${qaState.playerState.vy?.toFixed(2) || 'N/A'})`);
        console.log('');
    }
    
    // NPC info
    console.log('👥 NPCs:');
    console.log(`   Count: ${qaState.npcCount}`);
    console.log('');
    
    // Errors
    if (hasErrors) {
        console.error(`❌ Errors (${qaState.errors.length}):`);
        qaState.errors.forEach((err, i) => {
            console.error(`   ${i + 1}. [${err.type}] ${err.message}`);
            if (err.source) console.error(`      Source: ${err.source}:${err.line}:${err.col}`);
            if (err.stack) console.error(`      Stack: ${err.stack.split('\n')[0]}`);
        });
        console.log('');
    }
    
    // Asset 404s
    if (hasAsset404s) {
        console.error(`❌ Asset 404s (${qaState.asset404s.length}):`);
        qaState.asset404s.forEach((asset, i) => {
            console.error(`   ${i + 1}. ${asset.key} -> ${asset.src}`);
        });
        console.log('');
    }
    
    // Missing textures
    if (hasMissingTextures) {
        console.warn(`⚠️  Missing Textures (${qaState.missingTextures.length}):`);
        qaState.missingTextures.forEach((tex, i) => {
            console.warn(`   ${i + 1}. ${tex}`);
        });
        console.log('');
    }
    
    // Warnings
    if (hasWarnings) {
        console.warn(`⚠️  Warnings (${qaState.warnings.length}):`);
        qaState.warnings.forEach((warn, i) => {
            console.warn(`   ${i + 1}. ${warn.message}`);
        });
        console.log('');
    }
    
    // Final verdict
    console.log('═══════════════════════════════════════════════════════════');
    if (hasErrors || hasAsset404s) {
        console.error('RESULT: ❌ FAILED - Fix errors before proceeding');
        if (typeof process !== 'undefined' && process.exit) {
            process.exit(1);
        }
    } else {
        console.log('RESULT: ✅ PASSED - Game is stable');
        if (typeof process !== 'undefined' && process.exit) {
            process.exit(0);
        }
    }
    console.log('═══════════════════════════════════════════════════════════\n');
}

// QA Mode: Auto-start and test
if (qaMode) {
    console.log('[QA MODE] Enabled - Will auto-start game and run QA checks');
    qaState.startTime = Date.now();
    
    // Wait for Phaser to be available
    const checkPhaser = setInterval(() => {
        if (window.Phaser && window.game) {
            clearInterval(checkPhaser);
            
            // Hook into scene manager
            const originalStart = window.game.scene.start.bind(window.game.scene);
            window.game.scene.start = function(key, data) {
                window.__QA__.updateScene(key);
                return originalStart(key, data);
            };
            
            // Wait for Game scene to be active, then monitor
            const checkGameScene = setInterval(() => {
                const gameScene = window.game.scene.getScene('Game');
                if (gameScene && gameScene.scene.isActive()) {
                    clearInterval(checkGameScene);
                    
                    // Monitor player
                    if (gameScene.player) {
                        const monitorPlayer = setInterval(() => {
                            if (gameScene.player && gameScene.player.body) {
                                window.__QA__.updatePlayer(
                                    gameScene.player.x,
                                    gameScene.player.y,
                                    gameScene.player.body.velocity.x,
                                    gameScene.player.body.velocity.y
                                );
                            }
                        }, 100);
                        
                        // Monitor NPCs
                        if (gameScene.npcs) {
                            window.__QA__.updateNPCs(gameScene.npcs.length || 0);
                        }
                        
                        // Print summary after 3 seconds
                        setTimeout(() => {
                            printQASummary(window.game);
                        }, 3000);
                    }
                }
            }, 100);
        }
    }, 100);
}

export default {
    qaMode,
    qaState,
    printQASummary
};
