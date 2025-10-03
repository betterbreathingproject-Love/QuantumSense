

import Phaser from 'phaser';
import { BootScene } from './bootScene.js';
import { GameScene } from './gameScene.js';

// Simple scene for login without complex DOM manipulation
class SimpleLoginScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SimpleLoginScene' });
  }
  
  preload() {
    this.load.image('divineSenseLogo', 'https://play.rosebud.ai/assets/065e2161-a443-411d-8174-7563072c54b3.png?pNNq');
  }
  
  create() {
    const { width, height } = this.sys.game.config;
    this.cameras.main.setBackgroundColor('#0c0114');
    
    // Add logo
    const logo = this.add.image(width / 2, height / 4, 'divineSenseLogo');
    logo.setScale(0.5);
    
    // Add simple text
    this.add.text(width / 2, height / 2, 'Divine Sense Game', {
      fontSize: '32px',
      fill: '#ffffff'
    }).setOrigin(0.5);
    
    // Add start button
    const startButton = this.add.text(width / 2, height * 0.7, 'Start Game', {
      fontSize: '24px',
      fill: '#00ff00',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();
    
    startButton.on('pointerdown', () => {
      this.scene.start('BootScene');
    });
  }
}

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
    max: {
      width: 576,
      height: 1024
    }
  },
  scene: [SimpleLoginScene, BootScene, GameScene],
  backgroundColor: '#1a0033'
};

const game = new Phaser.Game(config);

// Make game globally available
window.game = game;

// Ensure SimpleLoginScene starts when game is ready
game.events.once('ready', () => {
  console.log('Game initialized successfully');
});

