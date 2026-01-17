import Phaser from 'phaser';
import Boot from './scenes/Boot.js';
import StartMenu from './scenes/StartMenu.js';
import runtimeQA from './utils/runtimeQA.js';

// --- RUNTIME QA ERROR TRAP ---
const isDevMode = import.meta.env?.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

function showQAError(msg, source, stack = null) {
    // Only show overlay in dev mode
    if (!isDevMode) {
        console.error(`[QA TRAP] ${source}: ${msg}`);
        if (stack) console.error(stack);
        return;
    }

    // Remove existing error overlay if present
    const existing = document.getElementById('qa-error-overlay');
    if (existing) {
        existing.remove();
    }

    const div = document.createElement('div');
    div.id = 'qa-error-overlay';
    div.style.position = 'fixed';
    div.style.top = '0';
    div.style.left = '0';
    div.style.width = '100%';
    div.style.height = '100%';
    div.style.backgroundColor = 'rgba(20, 0, 0, 0.95)';
    div.style.color = '#ffcccc';
    div.style.zIndex = '999999';
    div.style.padding = '30px';
    div.style.fontFamily = 'monospace';
    div.style.whiteSpace = 'pre-wrap';
    div.style.overflow = 'auto';
    div.style.boxSizing = 'border-box';

    const stackTrace = stack ? `\n\n--- Stack Trace ---\n${stack}` : '';
    const errorDetails = `${msg}${stackTrace}`;

    div.innerHTML = `
        <div style="max-width: 900px; margin: 0 auto;">
            <h1 style="color: #ff4444; margin-top: 0;">🛑 RUNTIME ERROR</h1>
            <h2 style="color: #ff8888;">${source || 'Unknown Source'}</h2>
            <pre style="background: rgba(0,0,0,0.5); padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 12px; line-height: 1.4;">${escapeHtml(errorDetails)}</pre>
            <div style="margin-top: 20px;">
                <button onclick="window.location.reload()" style="padding: 10px 20px; font-size: 14px; background: #ff4444; color: white; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">🔄 RELOAD</button>
                <button onclick="document.getElementById('qa-error-overlay').remove()" style="padding: 10px 20px; font-size: 14px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer;">✕ DISMISS</button>
            </div>
        </div>
    `;
    document.body.appendChild(div);
    console.error(`[QA TRAP] ${source}: ${msg}`);
    if (stack) console.error(stack);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.onerror = function (message, source, lineno, colno, error) {
    const stack = error?.stack || `No stack trace available`;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/784270b1-5902-46b7-bc77-6b9c54b5c293',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.js:64',message:'window.onerror caught',data:{message:String(message),source:String(source),lineno,colno,hasMinimapError:String(message).includes('Minimap')},timestamp:Date.now(),sessionId:'debug-session',runId:'minimap-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    showQAError(
        `Message: ${message}\nSource: ${source}\nLine: ${lineno}:${colno}`,
        'window.onerror',
        stack
    );
    return false; // Don't prevent default error handling
};

window.onunhandledrejection = function (event) {
    const reason = event.reason;
    let errorMsg = '';
    let stack = null;

    if (reason instanceof Error) {
        errorMsg = reason.message;
        stack = reason.stack;
    } else if (typeof reason === 'string') {
        errorMsg = reason;
    } else {
        errorMsg = String(reason);
    }

    showQAError(
        `Unhandled Promise Rejection: ${errorMsg}`,
        'Unhandled Promise Rejection',
        stack
    );
    event.preventDefault(); // Prevent default browser handling
};
import HowToPlay from './scenes/HowToPlay.js';
import Credits from './scenes/Credits.js';
import GameScene from './scenes/Game.js';

const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: '100%',
        height: '100%'
    },
    parent: 'game-container',
    backgroundColor: '#1a1a1a', // Dark Gray background
    pixelArt: true, // For crispy detective pixels
    physics: {
        default: 'arcade',
        arcade: {
            debug: true // Enable debug to see collisions
        }
    },
    scene: [Boot, StartMenu, HowToPlay, Credits, GameScene]
};

const game = new Phaser.Game(config);

// Expose game instance for QA mode
window.game = game;

// Hook QA into scene transitions
game.events.on('ready', () => {
    game.scene.scenes.forEach(scene => {
        const originalStart = scene.scene.start.bind(scene.scene);
        scene.scene.start = function(key, data) {
            if (window.__QA__) {
                window.__QA__.updateScene(key);
            }
            return originalStart(key, data);
        };
    });
});
