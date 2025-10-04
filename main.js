import Phaser from 'phaser';
import { LoginScene } from './loginScene.js';
import { BootScene } from './bootScene.js';
import { GameScene } from './gameScene.js';
import { MyStatsScene } from './MyStatsScene.js';
import { LevelSelectionScene } from './LevelSelectionScene.js';

// Unified startup: boot the game and go straight to GameScene (via BootScene preload).
// For new users, we'll auto-open the Home tab with the embedded onboarding dash inside the GameScene.
let existingUser = {};
try {
  existingUser = JSON.parse(localStorage.getItem('quantumsense-user-data') || '{}');
} catch {}
const isKnownUser = !!(existingUser && (existingUser.name || existingUser.email));

// Hint to UI: if user is not known, open the Home tab (onboarding dash) after boot
try { localStorage.setItem('quantumsense-auto-open-home', (!isKnownUser).toString()); } catch {}

const config = {
  type: Phaser.AUTO,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'phaser-game-container',
    width: 576,
    height: 1024,
    max: { width: 576, height: 1024 }
  },
  // Start with BootScene so assets preload, then it immediately starts GameScene.
  scene: [BootScene, GameScene, MyStatsScene, LevelSelectionScene, LoginScene],
  backgroundColor: '#1a0033'
};

const game = new Phaser.Game(config);
window.game = game;
game.events.once('ready', () => {
  console.log('Game initialized');
});