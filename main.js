import Phaser from 'phaser';
import { LoginScene } from './loginScene.js';
import { BootScene } from './bootScene.js';
import { GameScene } from './gameScene.js';
import { MyStatsScene } from './MyStatsScene.js';
import { LevelSelectionScene } from './LevelSelectionScene.js';

// Startup routing with explicit Play override:
// - If user data missing: go to onboarding
// - If returning user and NOT explicitly launching game: go to dashboard
// - If launching game (resumeGameOnLoad flag set): boot Phaser here
let existingUser = {};
try {
  existingUser = JSON.parse(localStorage.getItem('quantumsense-user-data') || '{}');
} catch {}
const resumeFlag = (() => {
  try { return localStorage.getItem('resumeGameOnLoad'); } catch { return null; }
})();
const isKnownUser = !!(existingUser && (existingUser.name || existingUser.email));

// New users: force onboarding
if (!isKnownUser) {
  window.location.href = './onboarding.html';
} else if (!resumeFlag) {
  // Returning users landing at root index WITHOUT an explicit Play action
  window.location.href = './QuantumSense Ai Journal-Add on /index.html';
} else {
  // Explicit Play path: boot the game
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
    scene: [LoginScene, BootScene, GameScene, MyStatsScene, LevelSelectionScene],
    backgroundColor: '#1a0033'
  };
  const game = new Phaser.Game(config);
  window.game = game;
  game.events.once('ready', () => {
    console.log('Game initialized via explicit Play');
  });
}