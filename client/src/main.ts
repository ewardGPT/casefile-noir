import Phaser from 'phaser';
import Boot from './scenes/Boot.js';
import StartMenu from './scenes/StartMenu.js';
import HowToPlay from './scenes/HowToPlay.js';
import Credits from './scenes/Credits.js';
import GameScene from './scenes/Game.js';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: '100%',
    height: '100%',
  },
  parent: 'game-container',
  backgroundColor: '#1a1a1a',
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { x: 0, y: 0 },
    },
  },
  scene: [Boot, StartMenu, HowToPlay, Credits, GameScene],
};

const game = new Phaser.Game(config);

window.game = game;

export default game;
