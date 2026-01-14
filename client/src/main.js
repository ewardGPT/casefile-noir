import Boot from './scenes/Boot.js';
import StartMenu from './scenes/StartMenu.js';

// --- RUNTIME QA ERROR TRAP ---
function showQAError(msg, source) {
    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.top = '0';
    div.style.left = '0';
    div.style.width = '100%';
    div.style.height = '100%';
    div.style.backgroundColor = 'rgba(50, 0, 0, 0.9)';
    div.style.color = '#ffcccc';
    div.style.zIndex = '999999';
    div.style.padding = '20px';
    div.style.fontFamily = 'monospace';
    div.style.whiteSpace = 'pre-wrap';
    div.innerHTML = `<h1>🛑 QA RUNTIME ERROR</h1><h2>${source || 'Unknown Source'}</h2><p>${msg}</p><button onclick="window.location.reload()">RELOAD</button>`;
    document.body.appendChild(div);
    console.error(`[QA TRAP] ${msg}`);
}

window.onerror = function (message, source, lineno, colno, error) {
    showQAError(`${message}\nAt: ${source}:${lineno}:${colno}\nStack: ${error?.stack}`, 'window.onerror');
    return false;
};

window.onunhandledrejection = function (event) {
    showQAError(`${event.reason}`, 'Unhandled Promise Rejection');
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
