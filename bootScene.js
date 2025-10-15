import Phaser from 'phaser';
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Remove the loading screen UI and go straight to asset preload
    const { width, height } = this.sys.game.config;
    this.cameras.main.setBackgroundColor('#0c0114');
    // No loader overlay or elements
    this.loadingUI = null;

    // Preload assets for the entire game here
    this.load.image('particle', 'https://play.rosebud.ai/assets/neonSwipeParticle.png?RuFN');
    // Alias a star texture used by celebrations and aura reveal
    // Using the same particle image ensures the emitter has a valid texture key
    this.load.image('star', 'https://play.rosebud.ai/assets/neonSwipeParticle.png?RuFN');
    this.load.image('buttonBG', 'https://play.rosebud.ai/assets/Screenshot 2025-09-13 at 12.16.05pm.png?XtBi');
    
    // Optional remote audio loading
    // Set localStorage.enableRemoteAudio = 'false' to skip preloading remote audio and avoid network errors
    const enableRemoteAudio = (typeof localStorage !== 'undefined')
      ? localStorage.getItem('enableRemoteAudio') !== 'false'
      : true;
    // Graceful loader error handling to avoid noisy console when remote assets fail/abort
    try {
      this.load.on('loaderror', (file) => {
        console.warn('[BootScene] Asset load error:', file && file.src || file);
      });
    } catch {}
    if (enableRemoteAudio) {
      // win and lose sounds are now synthesized, no need to load
      this.load.audio('background_music', 'https://play.rosebud.ai/assets/The background music.mp3?IkTs');
      // Load tom sounds for prediction buttons
      this.load.audio('tom1', 'https://play.rosebud.ai/assets/028_Tuned_Tom_A_-_ORGANICHOUSE_Zenhiser.wav?0qPU');
      this.load.audio('tom2', 'https://play.rosebud.ai/assets/027_Tuned_Tom_A_High_-_ORGANICHOUSE_Zenhiser.wav?Gqhx');
      this.load.audio('tom3', 'https://play.rosebud.ai/assets/030_Tuned_Tom_C_-_ORGANICHOUSE_Zenhiser.wav?GpQm');
      this.load.audio('tom4', 'https://play.rosebud.ai/assets/029_Tuned_Tom_C_High_-_ORGANICHOUSE_Zenhiser.wav?toWU');
      this.load.audio('tom5', 'https://play.rosebud.ai/assets/026_Pluck_C_-_ORGANICHOUSE_Zenhiser.wav?6PC0');
      this.load.audio('tom6', 'https://play.rosebud.ai/assets/030_Tuned_Tom_C_-_ORGANICHOUSE_Zenhiser.wav?GpQm');
      this.load.audio('success-fanfare-trumpets-6185', 'https://play.rosebud.ai/assets/success-fanfare-trumpets-6185.mp3?rVFo');
      this.load.audio('game-over-arcade-6435', 'https://play.rosebud.ai/assets/game-over-arcade-6435.mp3?kKij');
      this.load.audio('button_ambience', 'https://play.rosebud.ai/assets/Freeze AMBIENCE [2022-01-12 143844]-1.wav?Dilm');
      this.load.audio('button_hover_click', 'https://play.rosebud.ai/assets/ZEN_APM_percussion_one_shot_click.wav?m6fS');
    } else {
      console.info('[BootScene] Remote audio preloads disabled (enableRemoteAudio=false).');
    }
    this.load.image('heads', 'assets/Heads1.png');
    this.load.image('tails', 'assets/Tails1.png');
    this.load.image('gold_shield', 'https://play.rosebud.ai/assets/pngtree-gold-shield-png-clipart-free-png-image_11535486.png?5Iix');
    // this.load.image('cat', 'https://play.rosebud.ai/assets/catnew.png?ArKL'); // Cat is now an emoji
    
    // Load images for Level 6 (Emotional Intuition)
    this.load.image('calm 1', 'https://play.rosebud.ai/assets/calm 1.jpg?xXSf');
    this.load.image('calm 2', 'https://play.rosebud.ai/assets/calm 2.jpg?IY6B');
    this.load.image('calm 3', 'https://play.rosebud.ai/assets/calm 3.jpg?mCu1');
    this.load.image('1 emotional', 'https://play.rosebud.ai/assets/1 emotional.jpg?bX6J');
    this.load.image('2 emotional', 'https://play.rosebud.ai/assets/2 emotional.png?H0W6');
    this.load.image('emotional 3', 'https://play.rosebud.ai/assets/emotional 3.jpg?Kw1k');
    
    // Load portal for Emotional Aura
    this.load.image('space_portal', 'https://play.rosebud.ai/assets/portal.png?iBKR');
    
    // Load main portal that's always visible
    this.load.image('portal', 'https://play.rosebud.ai/assets/yantra2.gif?T3fn');
    
    // Load mandala for breathing exercise
    this.load.image('mandala', 'assets/mandala.png');
  }

  create() {
    // After assets are loaded, fade out the loading UI then play the intro sequence
    this.introTweens = [];

    const fadeTargets = (this.loadingUI && this.loadingUI.elements) ? this.loadingUI.elements : [];
    if (fadeTargets.length) {
      this.tweens.add({
        targets: fadeTargets,
        alpha: 0,
        duration: 500,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          fadeTargets.forEach(el => el.destroy());
          // Run any registered cleanup callbacks
          if (this.loadingUI && this.loadingUI.cleanup) {
            this.loadingUI.cleanup.forEach(fn => {
              try { fn(); } catch (e) { /* noop */ }
            });
          }
          this.playIntroSequence();
        }
      });
    } else {
      this.playIntroSequence();
    }
  }

  playIntroSequence() {
    // Remove logo reveal animation: go straight to the game scene
    // Optional quick fade for smoothness
    this.cameras.main.fadeOut(250);
    this.time.delayedCall(250, () => {
      this.scene.start('GameScene');
    });
  }
  
  skipIntro() {
    // Stop all intro tweens
    this.introTweens.forEach(tween => {
      if (tween && tween.isPlaying()) {
        tween.stop();
      }
    });
    
    // Clear any remaining tweens
    this.tweens.killAll();
    
    // Immediately start the game
    this.scene.start('GameScene');
  }
}