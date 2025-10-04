import Phaser from 'phaser';
import { DiceController } from './diceController.js';
import { PredictionSystem } from './predictionSystem.js';
import { StatsTracker } from './statsTracker.js';
import { ParticleEffects } from './particleEffects.js';
import { UIManager } from './uiManager.js';
import { BreathingExercise } from './breathingExercise.js';
import { TutorialManager } from './tutorialManager.js';
import { BinauralBeatGenerator } from './binauralBeatGenerator.js';
import { PsychicTrainer } from './psychicTrainer.js';
import { InteractionManager } from './InteractionManager.js';
import { AudioManager } from './AudioManager.js';
import { BottomMenuManager } from './BottomMenuManager.js';
import { EmotionalAuraController } from './EmotionalAuraController.js';
export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.gameState = 'waiting'; // waiting, predicting, rolling, showing
    this.ommingVolume = 0; // Start omming in off position
    this.currentOmmingSound = null; // Track independent omming sound
    this.currentActiveLevel = 1; // The level selected for the current round
    this.gameMode = 'sense'; // 'sense' or 'influence'
    this.debugButtonsVisible = true; // Track debug button visibility
    this.debugButtons = []; // Store debug button references
    this.debugToggleButton = null; // Toggle button reference
    this.loadBreathingSettings();
    this.loadGameModeSettings();
  }
  // preload() is now handled in BootScene
  create() {
    console.log('GameScene create() method started');
    
    try {
      // Initialize audio manager first
      this.audioManager = new AudioManager(this);
      console.log('AudioManager initialized');
      
      // Only start background music if the asset is loaded
      if (this.cache.audio.exists('background_music')) {
        this.audioManager.startBackgroundMusic();
      }
      
      // Add compatibility property for UIManager to access audio settings
      this.audioSettings = this.audioManager.getAudioSettings();
      
      // Create gradient background with glow effects
      this.createStarryBackground();
      console.log('Starry background created');
      
      // Initialize game systems
      this.diceController = new DiceController(this);
      console.log('DiceController initialized');
      
      // Initialize StatsTracker with error handling
      try {
        this.statsTracker = new StatsTracker(this, {
          showShieldBreakEffect: () => {
            if (this.uiManager) {
              this.uiManager.showShieldBreakEffect();
            }
          },
          showRewardNotification: (title, message, icon) => {
            if (this.uiManager) {
              this.uiManager.showRewardNotification(title, message, icon);
            }
          },
          updateStats: (stats) => {
            if (this.uiManager) {
              this.uiManager.updateStats(stats);
            }
          },
          addBadge: (award, isBreathingAward, delay) => {
            if (this.uiManager) {
              this.uiManager.addBadge(award, isBreathingAward, delay);
            }
          },
          animateShieldAward: (onComplete) => {
            if (this.uiManager) {
              this.uiManager.animateShieldAward(onComplete);
            }
          }
        });
        this.statsTracker.performDailyCheckIn();
        console.log('StatsTracker initialized successfully');
      } catch (error) {
        console.error('Error initializing StatsTracker:', error);
        // Create a fallback statsTracker to prevent crashes
        this.statsTracker = {
          getStats: () => ({
            totalRolls: 0,
            correctPredictions: 0,
            accuracy: 0,
            dailyCheckInStreak: 0,
            unclaimedRewards: {}
          }),
          addResult: () => {},
          performDailyCheckIn: () => {},
          saveStats: () => {}
        };
      }
      
      this.binauralGenerator = new BinauralBeatGenerator(this);
      console.log('BinauralBeatGenerator initialized');
      
      this.psychicTrainer = new PsychicTrainer(this, {
        isMenuOpen: () => this.uiManager?.menuOpen,
        isBinauralOpen: () => this.uiManager?.binauralOpen,
        isJournalOpen: () => this.uiManager?.journalOpen
      });
      console.log('PsychicTrainer initialized');
      
      this.emotionalAuraController = new EmotionalAuraController(this);
      console.log('EmotionalAuraController initialized');
      
      // Create UIManager
      this.uiManager = new UIManager(this, this.statsTracker, this.binauralGenerator);
      console.log('UIManager initialized');

      // Removed old flag-based auto-open here; routing will occur after bottom menu is ready
      
      // Expose DailyCheckInManager for easy access
      this.dailyCheckInManager = this.uiManager.dailyCheckInManager;
      
      // Create breathing glow effect, initially hidden
      const { width, height } = this.sys.game.config;
      this.breathingGlow = this.add.graphics({ x: width / 2, y: height / 2 });
      this.breathingGlow.setDepth(-10); // Behind everything
      this.breathingGlow.setAlpha(0);
      
      // Create Bottom Menu Manager
      this.bottomMenuManager = new BottomMenuManager(this, this.statsTracker, this.psychicTrainer, null, {
        showDailyCheckIn: () => {
          // No-op - daily check-in is now handled by HomePanel streak card
        }
      });
      console.log('BottomMenuManager initialized');

      // Expose managers globally so JournalBridge can route tabs
      try {
        window.bottomMenuManager = this.bottomMenuManager;
        window.uiManager = this.uiManager;
      } catch (_) {}

      // On every app start for returning users, show the daily journal input with Skip option
      try {
        const resumeOnLoad = localStorage.getItem('resumeGameOnLoad') === '1';
        const user = JSON.parse(localStorage.getItem('quantumsense-user-data') || '{}');
        const isReturning = !!(user && (user.name || user.email));
        if (!resumeOnLoad && isReturning) {
          try { window.JournalBridge && window.JournalBridge.open(); } catch (_) {}
        }
        // Clear any legacy one-shot flag
        localStorage.removeItem('openJournalOnGameLoad');
      } catch (e) {
        console.warn('Failed to open journal on start:', e);
      }
      
      this.uiManager.menuManager.onProfileToggle = () => this.uiManager.toggleProfilePanel();
      this.uiManager.menuManager.onResetRequest = () => this.performReset();
      
      // Continue with the rest of the initialization
      this.finishSceneInitialization();
      console.log('Scene initialization completed successfully');
      
    } catch (error) {
      console.error('Critical error during scene creation:', error);
      console.error('Error stack:', error.stack);
      
      // Set an error flag so we can check it later
      this.initializationError = error;
      
      // Try to create minimal fallback systems to prevent complete failure
      if (!this.gameState) {
        this.gameState = 'error';
      }
    }
  }
  finishSceneInitialization() {
    // Create always-visible spinning portal
    this.createMainPortal();
    
    // Create mode toggle after UI manager is initialized
    this.createModeToggle();
    
    // Remove the separate avatar creation since menu button handles this now
    // this.uiManager.createPlayerAvatar(); // Removed - handled by MenuManager
    
    // Safety check for statsTracker before accessing its methods
    if (this.statsTracker && typeof this.statsTracker.getStats === 'function') {
      this.currentActiveLevel = this.statsTracker.getStats().psychicLevel;
      this.updateBackgroundEffects(this.statsTracker.getStats().psychicLevel);
    } else {
      console.warn('StatsTracker not available, using default level');
      this.currentActiveLevel = 1;
      this.updateBackgroundEffects(1);
    }
    this.updatePortalVisibility(); // Update portal visibility on initial load

    // If launched from the journal, optionally resume the last played level
    try {
      const resumeFlag = localStorage.getItem('resumeGameOnLoad');
      if (resumeFlag) {
        const stats = this.statsTracker?.getStats?.() || {};
        const lp = parseInt(localStorage.getItem('lastPlayedLevel') || String(stats.psychicLevel || 1), 10);
        const levelToSet = stats.psychicLevel ? Math.min(lp, stats.psychicLevel) : lp;
        this.setActiveLevel(levelToSet);
        // Clear the flag so it only applies once
        localStorage.removeItem('resumeGameOnLoad');
      }
    } catch (e) {
      console.warn('Auto-resume check failed:', e);
    }
    
    // Safety check before creating prediction system and interaction manager
    if (this.uiManager) {
      this.predictionSystem = new PredictionSystem(this, this.uiManager, () => {
        try { return !!(window.JournalBridge && window.JournalBridge.isOpen); } catch (_) { return false; }
      });
      this.interactionManager = new InteractionManager(this, (enabled) => {
        if (this.uiManager && this.uiManager.menuManager && typeof this.uiManager.menuManager.setInteractionsEnabled === 'function') {
          this.uiManager.menuManager.setInteractionsEnabled(enabled);
        }
      }, {
        hideForBreathing: () => {
          if (this.uiManager && this.uiManager.statsDisplay) {
            this.uiManager.statsDisplay.hideForBreathing();
          }
        }
      });
      console.log('PredictionSystem and InteractionManager created successfully');
    } else {
      console.error('UIManager not available for PredictionSystem initialization');
    }
    
    this.uiManager.updateBadges(false); // Initial badge load without animation
    this.particleEffects = new ParticleEffects(this);
    
    const tutorialSeen = localStorage.getItem('tutorialSeen') === 'true';
    if (!tutorialSeen) {
      // Ensure Level 1 is prepared in the background for a seamless start after the tutorial
      // This sets the active level and updates dice/portal visuals without starting gameplay
      this.setActiveLevel(1);
      // Ensure the gameplay (dice) scene is visible behind the tutorial
      try {
        // Hide any open bottom panels (e.g., Games page) so the dice scene remains the background
        this.uiManager?.menuManager?.hideAll?.();
        // Prevent any auto-open requests to switch to Games while the tutorial is showing
        localStorage.removeItem('openTabOnLoad');
      } catch (_) {}
      // Temporarily show all UI for the tutorial to highlight
      if (this.predictionSystem && this.predictionSystem.container) {
        this.predictionSystem.container.setVisible(true).setAlpha(1);
      }
      this.diceController.resetDice();
      if (this.diceController.resultContainer) {
        this.diceController.resultContainer.setAlpha(1);
      }
      
      this.showTutorial();
    } else {
      this.startNewRound();
    }
    
    // Ensure stars are visible and animated from the start
    if (this.statsTracker && typeof this.statsTracker.getStats === 'function') {
      this.updateBackgroundEffects(this.statsTracker.getStats().psychicLevel - 1);
    } else {
      this.updateBackgroundEffects(0); // Default to level 0 effects
    }
    
    // Safety check before calling updateInteractions
    if (this.interactionManager) {
      this.interactionManager.updateInteractions(); // Initial interaction state
    }
    
    this.createDebugButtons();
  }
  
  createMainPortal() {
    const { width, height } = this.sys.game.config;
    
    // Create container for portal and its background
    this.mainPortalContainer = this.add.container(width / 2, height / 2 - 150);
    this.mainPortalContainer.setDepth(4); // Behind yantra image but in front of stars
    // Create a solid background circle to block stars
    const backgroundRadius = 150; // Fixed radius for the background
    this.portalBackground = this.add.circle(0, 0, backgroundRadius, 0x0c0114);
    this.portalBackground.setAlpha(1); // Solid background
    this.mainPortalContainer.add(this.portalBackground);
    
    // Create the main portal that's always visible
    this.mainPortal = this.add.image(0, 0, 'portal');
    
    // Scale the yantra image based on its width to fit the background radius
    const portalImageWidth = this.mainPortal.width;
    const portalScale = (backgroundRadius * 2) / portalImageWidth;
    this.mainPortal.setScale(portalScale);
    this.mainPortal.setAlpha(1.0);
    this.mainPortal.setBlendMode(Phaser.BlendModes.SCREEN);
    this.mainPortalContainer.add(this.mainPortal);
    
    // Add continuous spinning animation to the portal image
    this.mainPortalBaseTween = this.tweens.add({
      targets: this.mainPortal,
      angle: 360,
      duration: 240000, // 240 seconds for one full rotation
      repeat: -1,
      ease: 'Linear'
    });
    
    // Pulsing effect removed for a steadier yantra
  }
  
  // Method to trigger rapid yantra spinning on prediction clicks
  triggerYantraSpinBurst() {
    // Pause the base spinning animation with additional safety checks
    if (this.mainPortalBaseTween && this.mainPortalBaseTween.isActive && this.mainPortalBaseTween.isActive()) {
      try {
        this.mainPortalBaseTween.pause();
      } catch (error) {
        console.warn('Error pausing main portal tween:', error);
        this.mainPortalBaseTween = null; // Clear invalid reference
      }
    }
    
    // Store reference to the spinning tween - extended to cover entire reveal sequence
    this.yantraSpinTween = this.tweens.add({
      targets: this.mainPortal,
      angle: this.mainPortal.angle + 720, // 2 full rotations from current position
      duration: 3000, // Extended to cover entire reveal sequence (image + particles + effects)
      ease: 'Power2.easeOut',
      onComplete: () => {
        // Resume base spinning from current angle with additional safety checks
        if (this.mainPortalBaseTween && this.mainPortalBaseTween.isActive && this.mainPortalBaseTween.isActive()) {
          try {
            this.mainPortalBaseTween.resume();
          } catch (error) {
            console.warn('Error resuming main portal tween:', error);
            this.mainPortalBaseTween = null; // Clear invalid reference
          }
        }
        this.yantraSpinTween = null; // Clear reference
      }
    });
    
    // Add particle explosion effect around yantra
    if (this.particleEffects) {
      const yantraX = this.mainPortalContainer.x;
      const yantraY = this.mainPortalContainer.y;
      
      // Create energy burst particles
      const burstEmitter = this.add.particles(yantraX, yantraY, 'particle', {
        speed: { min: 150, max: 300 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.8, end: 0 },
        blendMode: 'ADD',
        lifespan: 1000,
        tint: [0x8a2be2, 0x00e5ff, 0xffffff],
        quantity: 8,
        frequency: 50
      });
      burstEmitter.setDepth(5); // Above yantra
      burstEmitter.explode(25);
      
      // Clean up emitter after particles fade
      this.time.delayedCall(1200, () => burstEmitter.destroy());
    }
  }

  createDebugButtons() {
    const { width } = this.sys.game.config;
    const buttonY = 150;
    const buttonSpacing = 50;
    
    // Clear existing debug buttons
    this.debugButtons.forEach(button => button.destroy());
    this.debugButtons = [];
    
    // Create toggle button for showing/hiding debug buttons
    this.debugToggleButton = this.add.text(width - 50, 50, 'Debug', {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#fff',
        backgroundColor: '#333',
        padding: { x: 8, y: 4 }
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .setDepth(9999);
    
    this.debugToggleButton.on('pointerdown', () => {
        this.toggleDebugButtons();
    });
    
    // Create level selector buttons (for switching levels)
    for (let i = 1; i <= 6; i++) {
        const isActive = i === this.currentActiveLevel;
        const button = this.add.text(width - 50, buttonY + (i - 1) * buttonSpacing, `L${i}`, {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: isActive ? '#00e5ff' : '#8a2be2',
            backgroundColor: isActive ? '#2d0b4b' : '#1a0a2a',
            padding: { x: 8, y: 4 }
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setDepth(9999);
        
        button.on('pointerdown', () => {
            this.playSound('button_hover_click');
            this.setActiveLevel(i);
            this.updateDebugButtonStyles(); // Update button styles to reflect new active level
            this.startNewRound();
        });
        
        button.levelNumber = i; // Store level number for easy reference
        this.debugButtons.push(button);
    }
    
    // Add separator
    const separator = this.add.text(width - 50, buttonY + 6 * buttonSpacing + 10, '---', {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#666',
        padding: { x: 8, y: 2 }
    })
    .setOrigin(0.5)
    .setDepth(9999);
    this.debugButtons.push(separator);
    
    // Create level testing buttons (for testing celebrations)
    for (let i = 2; i <= 6; i++) {
        const button = this.add.text(width - 50, buttonY + (6 + i - 1) * buttonSpacing + 20, `Test ${i}`, {
            fontFamily: 'Arial',
            fontSize: '12px',
            color: '#000',
            backgroundColor: '#fff',
            padding: { x: 6, y: 3 }
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setDepth(9999);
        
        button.on('pointerdown', () => {
            this.showLevelUpCelebration(i, () => console.log(`Debug: Level ${i} celebration closed.`));
        });
        
        this.debugButtons.push(button);
    }
    
    // Set initial visibility
    this.updateDebugButtonVisibility();
  }
  
  toggleDebugButtons() {
    this.debugButtonsVisible = !this.debugButtonsVisible;
    this.updateDebugButtonVisibility();
    
    // Update toggle button text to reflect current state
    if (this.debugToggleButton) {
      this.debugToggleButton.setText(this.debugButtonsVisible ? 'Hide' : 'Debug');
      this.debugToggleButton.setStyle({
        backgroundColor: this.debugButtonsVisible ? '#666' : '#333'
      });
    }
  }
  
  updateDebugButtonVisibility() {
    this.debugButtons.forEach(button => {
      button.setVisible(this.debugButtonsVisible);
    });
  }
  
  updateDebugButtonStyles() {
    // Update level selector button styles to reflect current active level
    this.debugButtons.forEach(button => {
      if (button.levelNumber) { // Only update level selector buttons
        const isActive = button.levelNumber === this.currentActiveLevel;
        button.setStyle({
          color: isActive ? '#00e5ff' : '#8a2be2',
          backgroundColor: isActive ? '#2d0b4b' : '#1a0a2a'
        });
      }
    });
  }
  
  createStarryBackground() {
    this.cameras.main.setBackgroundColor('#0c0114');
    this.stars = [];
    const starCounts = [150, 200, 250, 300]; // Stars per psychic level
    const { width, height } = this.sys.game.config;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Create all possible stars and hide them initially
    for (let i = 0; i < starCounts[starCounts.length - 1]; i++) {
        const x = Phaser.Math.Between(0, width);
        const y = Phaser.Math.Between(0, height);
        const size = Phaser.Math.Between(1, 3);
        const alpha = Phaser.Math.FloatBetween(0.1, 0.6);
        
        const star = this.add.circle(x, y, size, 0xffffff, alpha);
        star.setBlendMode(Phaser.BlendModes.ADD);
        star.setVisible(false); // Hide initially
        
        // Store original position relative to center for swirling
        star.originalX = x;
        star.originalY = y;
        star.centerX = centerX;
        star.centerY = centerY;
        
        this.stars.push(star);
    }
    
    // Show initial stars immediately
    this.updateBackgroundEffects(0); // Start with novice level stars
  }
  onPredictionMade(prediction) {
    if (this.gameState !== 'predicting') return; // Prevent multiple predictions per round
    this.currentPrediction = prediction;
    this.gameState = 'rolling';
    this.interactionManager.updateInteractions();
    
    // Store the level being played before the roll, as it might change on level-up
    this.levelBeforeRoll = this.currentActiveLevel;
    
    let result;
    if (this.gameMode === 'sense') {
      // ESP Mode: Use the predetermined result that was generated at round start
      result = this.predeterminedResult;
    } else { // 'influence' mode
      // For level 3 (Emotional Intuition), the result is predetermined even in influence mode,
      // and we check if influence was successful. Other levels generate after prediction.
      if (this.currentActiveLevel === 3) {
        result = this.predeterminedResult;
      } else {
        // PK Mode: Generate result AFTER the prediction is made, potentially influenced by player stats
        result = this.generateInfluencedRandom();
      }
    }
    
    this.cryptoResult = result; // Store for cat animation
    this.diceController.rollDice(result, () => {
      this.onRollComplete(result);
    });
    
    // Add particles
    this.particleEffects.createRollParticles();
  }

  generateCryptoRandom() {
    let numOptions;
    if (this.currentActiveLevel === 2) { // Cat in box
      numOptions = 3;
    } else if (this.currentActiveLevel === 3) { // Emotional Intuition
      numOptions = 2;
    } else {
      numOptions = Math.min(6, this.currentActiveLevel + 1);
    }
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const result = (array[0] % numOptions) + 1;
    return result;
  }
  generateInfluencedRandom() {
    // Pure crypto random generation for scientific validity
    // No influence mechanism - maintains scientific integrity for PK research
    return this.generateCryptoRandom();
  }

  onRollComplete(result) {
    this.gameState = 'showing';
    this.interactionManager.updateInteractions();
    const isCorrect = result === this.currentPrediction;
    
    // Update stats
    const oldLevel = this.statsTracker.getStats().psychicLevel;
    const oldLevelProgress = this.statsTracker.getStats().levelProgress;
    const oldStreak = this.statsTracker.getStats().currentStreak;
    
    const wasShieldUsed = !isCorrect && this.statsTracker.getStats().streakShields > 0;
    this.statsTracker.addResult(this.currentPrediction, result, isCorrect, this.gameMode);
    const newStats = this.statsTracker.getStats();
    
    // Check if divine power increased (any correct answer triggers animation)
    // Animation triggers for any correct answer that increases progress
    const powerIncreased = isCorrect && 
                          (newStats.levelProgress > oldLevelProgress || 
                           (oldLevelProgress === 2 && newStats.levelProgress === 0 && newStats.psychicLevel > oldLevel));
    
    this.uiManager.updateStats(newStats, powerIncreased);
    
    // Automatically switch to newly unlocked level when leveling up
    if (newStats.psychicLevel > oldLevel) {
        // Automatically advance to the newly unlocked level
        this.currentActiveLevel = newStats.psychicLevel;
    }
    
    // Check for new achievements and show notifications
    const newAchievements = this.statsTracker.checkAchievements();
    if (newAchievements.length > 0) {
        this.time.delayedCall(1500, () => {
            newAchievements.forEach((achievement, index) => {
                this.time.delayedCall(index * 1200, () => { // Stagger notifications and badge awards
                    this.showAchievementNotification(achievement);
                    this.uiManager.addBadge(achievement, true);
                });
            });
        });
    }
    // Update trainer's appearance based on new stats
    this.psychicTrainer.updateTrainerLevel(newStats.psychicLevel - 1, newStats.currentStreak, newStats.accuracy); // -1 to map to 0-4 range
    // If leveled up, show encouragement
    if (newStats.psychicLevel > oldLevel) {
        this.handleLevelUp(newStats.psychicLevel);
    }
    
    // Show streak encouragement for every 3 correct guesses
    if (isCorrect && newStats.currentStreak > 0 && newStats.currentStreak % 3 === 0) {
        this.psychicTrainer.showStreakEncouragement(newStats.currentStreak);
    }
    
    // The dice/coin/box reveal needs to be shown for the level you just completed,
    // not the one you're advancing to. Check against the level BEFORE the potential level up.
    const levelJustPlayed = this.levelBeforeRoll;
    if (levelJustPlayed === 3) {
        // Yantra spinning is now handled by the extended initial spin duration
        
        // Use a callback to ensure the reveal animation finishes before the next round starts
        this.emotionalAuraController.revealAura(isCorrect, () => {
            const roundEndDelay = 3000; // Wait 3s after reveal before starting next round
            this.time.delayedCall(roundEndDelay, () => {
                this.startNewRound();
            });
        });
    } else if (levelJustPlayed !== 2) { // Cat level handles its own reveal
        this.diceController.showDiceNumber(result, isCorrect, levelJustPlayed);
    }
    
    if (isCorrect) {
      this.particleEffects.createSuccessParticles(1500); // Set depth to appear over yantra
      this.diceController.playWinAnimation();
      // this.playSound('Omming'); // Omming sound removed
    } else if (!wasShieldUsed) { // Only play lose sound if shield was not used
      this.cameras.main.shake(200, 0.005); // Subtle screen shake
      this.diceController.playLoseAnimation();
      this.playSound('game-over-arcade-6435');
    }
    
    // Show trainer encouragement
    this.time.delayedCall(800, () => {
        this.psychicTrainer.showResultEncouragement(isCorrect, newStats);
    });
    
    this.showResultText(isCorrect, wasShieldUsed);
    // Check for breathing exercise trigger
    // Check for breathing exercise trigger
    const stats = this.statsTracker.getStats();
    if (this.breathingSettings.enabled && stats.wrongStreak >= this.breathingSettings.threshold && !this.breathingGame) {
      this.time.delayedCall(2500, () => {
        this.psychicTrainer.showBreathingEncouragement();
        this.time.delayedCall(1000, () => {
            this.startBreathingExercise();
        });
      });
    } else if (this.gameState !== 'breathing') {
      // Reset for next round
      // Only start next round if it's not Level 3 (Emotional Intuition), which now handles it via callback
      if (this.levelBeforeRoll !== 3) {
          const roundEndDelay = 2000;
          this.time.delayedCall(roundEndDelay, () => {
            this.startNewRound();
          });
      }
    }
  }
  handleLevelUp(newLevel) {
    const levelIndex = newLevel - 1; // 0-indexed
    this.showLevelUpCelebration(newLevel, () => {
        // This will be the callback to run after the celebration
        this.psychicTrainer.showLevelUpEncouragement(levelIndex);
        this.updateBackgroundEffects(levelIndex);
        this.particleEffects.createLevelUpUnlockEffect(
          this.psychicTrainer.getOrbPosition(),
          () => {
            if (newLevel > 1) { // Only animate if a new button is actually added
              this.predictionSystem.animateNewButton(newLevel);
            }
            // Update bottom menu to reflect new level
            if (this.bottomMenuManager) {
              this.bottomMenuManager.updateNotifications();
            }
          }
        );
    });
  }
  showLevelUpCelebration(newLevel, onComplete) {
    const { width, height } = this.sys.game.config;
    const completedLevel = newLevel - 1;
    const levelStats = this.statsTracker.getStatsForLevel(completedLevel);
    const container = this.add.container(0, height).setDepth(3000);
    const blocker = this.add.graphics().fillStyle(0x0c0114, 0.95).fillRect(0, 0, width, height);
    container.add(blocker);
    this.playSound('success-fanfare-trumpets-6185', { volume: this.audioManager.getAudioSettings().sfxVolume * 1.2 });
    
    // Get feature to access emoji early
    const feature = this.getFeatureForLevel(newLevel);
    
    // Add large emoji behind the title
    const emojiText = this.add.text(width / 2, height / 2 - 50, feature.emoji, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '256px',
        color: '#ffffff',
        align: 'center'
    }).setOrigin(0.5).setAlpha(0);
    container.add(emojiText);
    // Animate the emoji
    this.tweens.add({
        targets: emojiText,
        alpha: { from: 0, to: 0.15 },
        scale: { from: 0.5, to: 1 },
        angle: { from: -15, to: 15 },
        duration: 1500,
        ease: 'Cubic.easeOut',
        delay: 200,
    });
    const title = this.add.text(width / 2, 100, `LEVEL ${completedLevel} COMPLETE`, {
        fontFamily: '"Arial Black", Arial, sans-serif', fontSize: '48px', color: '#00e5ff', fontStyle: 'bold',
        align: 'center', stroke: '#000000', strokeThickness: 6,
        shadow: { color: '#00e5ff', blur: 20, stroke: true, fill: true }
    }).setOrigin(0.5);
    const statsTitle = this.add.text(width / 2, 200, 'Performance Analysis', {
        fontFamily: 'Arial, sans-serif', fontSize: '24px', color: '#c9c9c9', fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add([title, statsTitle]);
    
    // Stats Display
    const statY = 280;
    const statItems = [
        { label: 'ACCURACY', value: `${levelStats.accuracy.toFixed(1)}%` },
        { label: 'PREDICTIONS', value: levelStats.predictions },
        { label: 'BEST STREAK', value: levelStats.bestStreak }
    ];
    statItems.forEach((item, index) => {
        const x = width / 2 + (index - 1) * 180;
        const valueText = this.add.text(x, statY, '0', {
            fontFamily: '"Arial Black", Arial, sans-serif', fontSize: '48px', color: '#ffff00', align: 'center',
            shadow: { color: '#ffff00', blur: 15, stroke: true, fill: true }
        }).setOrigin(0.5);
        const labelText = this.add.text(x, statY + 40, item.label, {
            fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#d3d3d3', align: 'center'
        }).setOrigin(0.5);
        container.add([valueText, labelText]);
        this.tweens.add({
            targets: { val: 0 },
            val: parseFloat(item.value) || 0,
            duration: 1500,
            ease: 'Cubic.easeOut',
            delay: 500 + index * 200,
            onStart: () => this.playSound('button_hover_click'),
            onUpdate: (tween) => {
                if (item.label === 'ACCURACY') {
                    valueText.setText(`${tween.targets[0].val.toFixed(1)}%`);
                } else {
                    valueText.setText(Math.round(tween.targets[0].val).toString());
                }
            }
        });
    });
    
    // Unlocked Feature Section
    const featureY = height / 2 + 80;
    const unlockedTitle = this.add.text(width / 2, featureY - 50, `LEVEL ${newLevel} UNLOCKED`, {
        fontFamily: '"Arial Black", Arial, sans-serif', fontSize: '36px', color: '#ffff00', align: 'center', fontStyle: 'bold',
        shadow: { color: '#ffff00', blur: 20, stroke: true, fill: true }
    }).setOrigin(0.5);
    
    const featureBox = this.add.graphics();
    featureBox.fillStyle(0x2d0b4b, 0.8).fillRoundedRect(width / 2 - 220, featureY, 440, 160, 15);
    featureBox.lineStyle(2, 0x8a2be2, 1).strokeRoundedRect(width / 2 - 220, featureY, 440, 160, 15);
    
    const featureTitle = this.add.text(width / 2, featureY + 40, `${feature.emoji} ${feature.title} ${feature.emoji}`, {
        fontFamily: 'Arial, sans-serif', fontSize: '28px', color: '#00e5ff', fontStyle: 'bold',
        shadow: { color: '#00e5ff', blur: 10, stroke: true, fill: true }
    }).setOrigin(0.5);
    const featureDesc = this.add.text(width / 2, featureY + 90, feature.description, {
        fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#c9c9c9', align: 'center', wordWrap: { width: 400 }
    }).setOrigin(0.5);
    
    container.add([unlockedTitle, featureBox, featureTitle, featureDesc]);
    // Button to continue
    const continueButton = this.add.text(width / 2, height - 100, 'CONTINUE', {
        fontFamily: '"Arial Black", Arial, sans-serif', fontSize: '24px', color: '#ffffff', fontStyle: 'bold',
        backgroundColor: '#8a2be2', padding: { x: 40, y: 20 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    
    container.add(continueButton);
    continueButton.on('pointerdown', () => {
        this.tweens.add({
            targets: container, alpha: 0, duration: 500, ease: 'Cubic.easeIn',
            onComplete: () => {
                container.destroy();
                if (onComplete) onComplete();
            }
        });
    });
    // Animation
    this.tweens.add({
        targets: container, y: 0, duration: 800, ease: 'Cubic.easeOut',
        onComplete: () => {
            this.cameras.main.shake(150, 0.01);
            const confettiEmitter = this.add.particles(width / 2, height, 'star', {
                angle: { min: 240, max: 300 }, speed: { min: 600, max: 1200 },
                gravityY: 300, lifespan: 4000, quantity: 8, scale: { start: 1, end: 0 },
                blendMode: 'ADD', tint: [0x00e5ff, 0x8a2be2, 0x00ff00, 0xffff00, 0xff00ff]
            });
            confettiEmitter.explode(150);
            this.time.delayedCall(4000, () => confettiEmitter.destroy());
        }
    });
  }
  
  getFeatureForLevel(level) {
    switch (level) {
      case 2:
        return { 
          title: 'Schrödinger\'s Cat',
          description: 'A new challenge! One of three boxes contains a hidden cat. Can you find it?',
          emoji: '🐈'
        };
      case 3:
        return { 
          title: 'Emotional Intuition',
          description: 'Sense the emotional energy and predict: Calm or Emotional',
          emoji: '🧘'
        };
      case 4:
        return { 
          title: 'Advanced Dice',
          description: 'The challenge increases to a 4-sided die.',
          emoji: '🎲'
        };
      case 5:
        return { 
          title: 'Expert Dice',
          description: 'The challenge increases to a 5-sided die.',
          emoji: '💎'
        };
      case 6:
        return { 
          title: 'Master Dice',
          description: 'The ultimate challenge: a 6-sided die!',
          emoji: '👑'
        };
      default:
        return { 
          title: 'Level Up!',
          description: 'Your psychic abilities have grown stronger.',
          emoji: '✨'
        };
    }
  }
  setActiveLevel(level) {
    const maxLevel = 6; // All levels are always accessible
    if (level > 0 && level <= maxLevel) {
        this.currentActiveLevel = level;
        try { localStorage.setItem('lastPlayedLevel', String(level)); } catch {}
        this.predictionSystem.updateButtonLayout();
        // Reset the dice/coin controller to apply the new level's animations and graphics
        this.diceController.resetDice();
        this.emotionalAuraController.hide();
        this.updatePortalVisibility();
    }
  }
  showTutorial() {
    if (!this.tutorialManager) {
        this.tutorialManager = new TutorialManager(this, () => {
            // Tutorial completed, allow tabs again and start gameplay
            this.isTutorialActive = false;
            this.startNewRound();
        }, () => {
          return {
            topBarContainer: this.uiManager ? this.uiManager.topBarContainer : null,
            coherenceContainer: this.uiManager ? this.uiManager.coherenceContainer : null,
            shieldContainer: this.uiManager ? this.uiManager.shieldContainer : null,
            menuButton: this.uiManager ? this.uiManager.menuButton : null
          };
        });
    }
    // Mark tutorial active so UI managers can respect it
    this.isTutorialActive = true;
    // Make sure the dice/prediction UI is the background while the tutorial overlays on top
    try {
      this.predictionSystem?.container?.setVisible(true);
      this.diceController?.resultContainer?.setVisible(true);
      // Hide any bottom menu panels to avoid covering gameplay during tutorial
      this.uiManager?.menuManager?.hideAll?.();
    } catch (_) {}
    this.tutorialManager.start();
    if (this.tutorialManager.container) {
      this.tutorialManager.container.setDepth(5700); // Ensure tutorial is on top
    }
  }
  
  startBreathingExercise() {
    this.gameState = 'breathing';
    this.interactionManager.updateInteractions();
    
    // Hide the yantra/portal during breathing exercise
    this.updatePortalVisibility();
    
    // Immediately hide all UI elements and ensure stats bars are completely hidden
    this.diceController.hide();
    this.predictionSystem.hide();
    this.psychicTrainer.hide();
    this.uiManager.hideForBreathing(true);
    
    // Hide the mode toggle during breathing
    if (this.modeToggleContainer) {
      this.modeToggleContainer.setVisible(false);
    }
    if(this.uiManager.achievementManager) {
      this.uiManager.achievementManager.hideForBreathing();
    }
    if (this.breathingGame) {
        this.breathingGame.destroy();
        this.breathingGame = null;
    }
    
    this.breathingGame = new BreathingExercise(this, this.breathingSettings, {
        onBegin: () => {
            this.playSound('button_ambience');
            // When the exercise actually begins, call hideForBreathing again
            // without the prompt flag to animate the breathing stats bar in.
            this.uiManager.hideForBreathing(false);
            if (this.mainPortalContainer) {
                this.tweens.killTweensOf(this.mainPortalContainer); // Stop breathing effect on portal
            }
            if (this.uiManager.achievementManager) {
                this.uiManager.achievementManager.hideForBreathing();
            }
             this.breathingGame.startExercise();
             this.startBackgroundGlow();
         },
        onSkip: () => {
            this.playSound('button_ambience');
            this.breathingGame.skip(); // This now calls onComplete(false)
            if (this.breathingGame) {
                this.breathingGame.destroy();
                this.breathingGame = null;
            }
            this.updatePortalVisibility(); // Restore yantra visibility when skipping
        },
        onThreeMinutesComplete: () => {
            // Reward is granted after 3 minutes, even if they continue.
            // We'll pass `true` to indicate the full session for the shield reward.
            // The time will be logged in onComplete to avoid double-counting.
            this.statsTracker.grantStreakShieldAndNotify();
        },
        onComplete: (sessionDurationMinutes, wasSkipped) => {
            // This is called when user clicks Finish or Skip.
            // `sessionDurationMinutes` has the total time for the session.
            
            // Log the final coherence time for the session.
            // The second parameter (completedFullSession) is now `false` because the shield
            // is already handled by `onThreeMinutesComplete`.
            if (sessionDurationMinutes > 0) {
              this.statsTracker.completeBreathingSession(sessionDurationMinutes, false);
            }
            this.uiManager.showFromBreathing();
            if (this.uiManager.achievementManager) {
              this.uiManager.achievementManager.showFromBreathing();
            }
            
            // Show the mode toggle again when breathing ends
            if (this.modeToggleContainer) {
              this.modeToggleContainer.setVisible(true);
            }
            
            this.startNewRound();
            // Always reset wrong streak when exiting breathing exercise
            this.statsTracker.getStats().wrongStreak = 0;
            this.statsTracker.saveStats();
            if (this.breathingGame) {
                this.breathingGame.destroy();
                 this.breathingGame = null;
             }
             this.stopBackgroundGlow();
            
            // Show bottom menu again after breathing
            if (this.bottomMenuManager) {
              this.bottomMenuManager.updateTabStates();
            }
        },
        onDontShowAgain: (enabled) => {
            this.breathingSettings.enabled = enabled;
            this.saveBreathingSettings();
        },
        onThresholdChange: (threshold) => {
            this.breathingSettings.threshold = threshold;
            this.saveBreathingSettings();
        },
        onSpeedChange: (speed) => {
            this.breathingSettings.speed = speed;
            this.saveBreathingSettings();
        }
      }, {
        hideForBreathing: () => {
          if (this.uiManager && this.uiManager.statsDisplay) {
            this.uiManager.statsDisplay.hideForBreathing();
          }
        }
      });
      
    if (this.breathingGame) {
        this.breathingGame.container.setDepth(4000); // Ensure it is on top of everything
        this.breathingGame.show();
    }
    
    // Hide bottom menu during breathing
    if (this.bottomMenuManager) {
      this.bottomMenuManager.hideAll();
    }
  }
  addCoherenceProgress(amount) {
    if (!this.uiManager || !this.uiManager.statsDisplay) return;
    const statsDisplay = this.uiManager.statsDisplay;
    statsDisplay.coherenceProgress = (statsDisplay.coherenceProgress || 0) + amount;
    if (statsDisplay.coherenceProgress >= 100) {
      statsDisplay.coherenceProgress %= 100; 
      this.statsTracker.grantStreakShieldAndNotify();
    }
    
    // Update the visual meter. The progress is a value between 0 and 1.
    statsDisplay.updateCoherenceMeter(statsDisplay.coherenceProgress / 100, false);
    
    // Also show a temporary notification for the progress gain
    this.uiManager.showRewardNotification(
      'Coherence Gained!', 
      `+${amount.toFixed(0)}% coherence towards your next Streak Shield.`, 
      '✨'
    );
  }
  
  startNewRound() {
    console.log('startNewRound() called');
    console.log('Current game state:', this.gameState);
    
    this.gameState = 'predicting';
    this.currentPrediction = null;
    
    // Safety check for InteractionManager
    if (this.interactionManager) {
      this.interactionManager.updateInteractions();
    } else {
      console.warn('InteractionManager not initialized yet');
    }
    
    console.log('Game state set to predicting, about to show prediction system');
    
    if (this.gameMode === 'sense' || this.currentActiveLevel === 3) {
      // ESP Mode: Generate the random result now - it exists in the field of potential
      // Level 3: Always needs predetermined result for emotional aura (both sense and influence)
      this.predeterminedResult = this.generateCryptoRandom();
    } else {
      // PK Mode (Influence) for levels 1-5: No predetermined result - will be generated after prediction
      this.predeterminedResult = null;
    }
    
    this.diceController.resetDice();
    
    // Update yantra visibility after changing game state
    this.updatePortalVisibility();
    
    if (this.currentActiveLevel === 3) {
        // Hide first, then setup aura without callback to prevent recursion
        this.emotionalAuraController.hide();
        // Use a small delay to ensure hide completes before setup
        this.time.delayedCall(250, () => {
            this.emotionalAuraController.setupAura();
        });
    } else {
        this.emotionalAuraController.hide();
    }
    
    console.log('About to call predictionSystem.show()');
    console.log('PredictionSystem exists:', !!this.predictionSystem);
    
    this.predictionSystem.show();
    this.psychicTrainer.show(); // Show trainer orb
    
    // Update mode indicator
    this.updateModeIndicator();
    
    // Trainer encouragement at round start
    this.psychicTrainer.onRoundStart();
  }
  showResultText(isCorrect, wasShieldUsed = false) {
    let text, color, glowColor;
    if (wasShieldUsed) {
        text = 'STREAK SAVED!';
        color = '#ffff00';
        glowColor = '#ffaa00';
    } else {
        text = isCorrect ? 'DIVINE!' : 'LET IT FLOW';
        color = isCorrect ? '#00ff00' : '#88ddff';
        glowColor = isCorrect ? '#00aa00' : '#4488bb';
    }
    
    const width = this.sys.game.config.width;
    
    // Create multiple text layers for dramatic effect
    const resultText = this.add.text(width / 2, 300, text, {
      fontFamily: '"Arial Black", Arial, sans-serif',
      fontSize: '42px',
      color: color,
      fontStyle: 'bold',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 8,
      shadow: { color: glowColor, blur: 20, stroke: true, fill: true }
    }).setOrigin(0.5).setAlpha(0).setDepth(1500);
    
    // Background glow text
    const glowText = this.add.text(width / 2, 300, text, {
      fontFamily: '"Arial Black", Arial, sans-serif',
      fontSize: '46px',
      color: glowColor,
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5).setAlpha(0);
    glowText.setBlendMode(Phaser.BlendModes.ADD);
    glowText.setDepth(resultText.depth - 1);
    
    // Dramatic entrance animation
    this.tweens.add({
      targets: resultText,
      alpha: 1,
      y: 250,
      scale: { from: 0.4, to: 1.1 },
      duration: 300,
      ease: 'Back.easeOut.config(3)',
      onComplete: () => {
          // Pulsing effect
          this.tweens.add({
              targets: resultText,
              scale: { from: 1.1, to: 1.2 },
              duration: 200,
              ease: 'Sine.easeInOut',
              yoyo: true,
              repeat: 2,
              onComplete: () => {
                  // Final fade out
                  this.tweens.add({
                      targets: [resultText, glowText],
                      alpha: 0,
                      scale: 0.8,
                      duration: 800,
                      ease: 'Cubic.easeIn',
                      onComplete: () => {
                          resultText.destroy();
                          glowText.destroy();
                      }
                  });
              }
          });
      }
    });
    
    // Glow text animation
    this.tweens.add({
      targets: glowText,
      alpha: { from: 0, to: 0.6 },
      y: 250,
      scale: { from: 0.4, to: 1.2 },
      duration: 300,
      ease: 'Back.easeOut.config(3)'
    });
    
    // Add some sparkle particles around the text
    const sparkleEmitter = this.add.particles(width / 2, 250, 'particle', {
        speed: { min: 100, max: 300 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.3, end: 0 },
        blendMode: 'ADD',
        lifespan: 1000,
        tint: [color.replace('#', '0x'), glowColor.replace('#', '0x'), 0xffffff],
        frequency: 100,
        quantity: 3
    });
    sparkleEmitter.setDepth(1500);
    sparkleEmitter.start();
    
    this.time.delayedCall(1500, () => {
        sparkleEmitter.stop();
        this.time.delayedCall(1000, () => sparkleEmitter.destroy());
    });
  }
  update() {
    // Game loop, if needed
  }
  updateBackgroundEffects(level) {
    // Ensure level is within bounds
    level = Math.max(0, Math.min(4, level));
    
    const starCounts = [150, 200, 250, 300, 350];
    const durationRange = [[200000, 400000], [160000, 320000], [120000, 240000], [80000, 160000], [40000, 120000]];
    const currentDuration = durationRange[level];
    
    this.stars.forEach((star, index) => {
      // Kill existing tweens
      this.tweens.killTweensOf(star);
      
      const isVisible = index < starCounts[level];
      star.setVisible(isVisible);
      
      if (isVisible) {
        // Reset star position to original
        star.x = star.originalX;
        star.y = star.originalY;
        star.setScale(1);
        star.setAngle(0);
        
        const alpha = Phaser.Math.FloatBetween(0.1, 0.4 + level * 0.05);
        star.setAlpha(alpha);
        
        // Twinkling effect (base for all levels)
        this.tweens.add({
          targets: star,
          alpha: { from: alpha, to: Phaser.Math.FloatBetween(0.6, 1.0) },
          duration: Phaser.Math.Between(6000, 16000), // Slower, more noticeable twinkle
          yoyo: true,
          repeat: -1
        });
        
        // Level-specific animations with proper delays
        this.time.delayedCall(Phaser.Math.Between(0, 2000), () => {
          switch (level) {
            case 0: // Novice: Slow Swirl
              this.addSwirlEffect(star, 480000);
              break;
            case 1: // Apprentice: Gentle Breathing
              this.addBreathingEffect(star, 32000);
              break;
            case 2: // Adept: Subtle Warping
              this.addWarpEffect(star, 40000);
              break;
            case 3: // Master: Deep Vortex
              this.addVortexEffect(star, 60000);
              break;
            case 4: // Transcendent: Cosmic Vortex
              this.addVortexEffect(star, 30000);
              break;
          }
        });
      }
    });
  }
  addSwirlEffect(star, duration) {
    if (!star.visible) return;
    
    const direction = Phaser.Math.Between(0, 1) ? 1 : -1;
    const radius = Math.sqrt(Math.pow(star.originalX - star.centerX, 2) + Math.pow(star.originalY - star.centerY, 2));
    const startAngle = Math.atan2(star.originalY - star.centerY, star.originalX - star.centerX);
    
    let currentAngle = startAngle;
    
    this.tweens.add({
      targets: star,
      angle: direction * 360,
      duration: duration + Phaser.Math.Between(-10000, 10000),
      ease: 'Linear',
      repeat: -1,
      onUpdate: (tween, target) => {
        currentAngle = startAngle + Phaser.Math.DegToRad(target.angle);
        target.x = target.centerX + Math.cos(currentAngle) * radius;
        target.y = target.centerY + Math.sin(currentAngle) * radius;
      }
    });
  }
  addBreathingEffect(star, duration) {
    if (!star.visible) return;
    
    const scaleFactor = 1.0 + Phaser.Math.FloatBetween(0.1, 0.3);
    this.tweens.add({
        targets: star,
        scale: { from: 1, to: scaleFactor },
        duration: duration + Phaser.Math.Between(-4000, 4000),
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
    });
  }
  addWarpEffect(star, duration) {
    if (!star.visible) return;
    
    const warpIntensity = 0.15;
    const dx = (star.originalX - star.centerX) * warpIntensity;
    const dy = (star.originalY - star.centerY) * warpIntensity;
    
    this.tweens.add({
        targets: star,
        x: star.originalX + dx,
        y: star.originalY + dy,
        duration: duration + Phaser.Math.Between(-6000, 6000),
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
    });
  }
  addVortexEffect(star, duration) {
    if (!star.visible) return;
    
    const direction = Phaser.Math.Between(0, 1) ? 1 : -1;
    const radius = Math.sqrt(Math.pow(star.originalX - star.centerX, 2) + Math.pow(star.originalY - star.centerY, 2));
    const startAngle = Math.atan2(star.originalY - star.centerY, star.originalX - star.centerX);
    const speedMultiplier = Math.max(0.3, 1 - (radius / 400)); // Faster closer to center
    
    let vortexAngle = 0;
    
    this.tweens.add({
        targets: star,
        angle: direction * 360,
        duration: duration / speedMultiplier,
        ease: 'Linear',
        repeat: -1,
        onUpdate: (tween, target) => {
            vortexAngle = startAngle + Phaser.Math.DegToRad(target.angle);
            
            // Create spiraling inward then outward motion
            const spiralProgress = (Math.sin(tween.progress * Math.PI * 4) + 1) / 2;
            const currentRadius = radius * (0.3 + spiralProgress * 0.7);
            
            target.x = target.centerX + Math.cos(vortexAngle) * currentRadius;
            target.y = target.centerY + Math.sin(vortexAngle) * currentRadius;
        }
    });
  }
  
  // Delegate sound playing to audio manager
  playSound(soundKey, config = {}) {
    return this.audioManager.playSound(soundKey, config);
  }
  
  playMysticalRollSound() {
    return this.audioManager.playMysticalRollSound();
  }
  
  showAchievementNotification(achievement) {
    const { width } = this.sys.game.config;
    
    // Create achievement notification
    const container = this.add.container(width / 2, -100);
    container.setDepth(1500);
    
    const bg = this.add.graphics();
    bg.fillStyle(0x2d4a22, 0.95);
    bg.fillRoundedRect(-200, -40, 400, 80, 15);
    bg.lineStyle(3, 0x4a7c59, 1);
    bg.strokeRoundedRect(-200, -40, 400, 80, 15);
    
    const iconText = this.add.text(-170, -10, achievement.icon, {
      fontFamily: 'Arial, sans-serif', fontSize: '32px'
    }).setOrigin(0.5);
    
    const achievementLabel = this.add.text(-120, -20, 'ACHIEVEMENT UNLOCKED!', {
      fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#4a7c59', fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    
    const titleText = this.add.text(-120, 0, achievement.title, {
      fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    
    const descText = this.add.text(-120, 15, achievement.description, {
      fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#aaaaaa'
    }).setOrigin(0, 0.5);
    
    container.add([bg, iconText, achievementLabel, titleText, descText]);
    
    // Animate in
    this.tweens.add({
      targets: container,
      y: 150,
      duration: 500,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Hold for a moment, then slide out
        this.time.delayedCall(3000, () => {
          this.tweens.add({
            targets: container,
            y: -100,
            duration: 400,
            ease: 'Back.easeIn',
            onComplete: () => container.destroy()
          });
        });
      }
    });
    
    this.playSound('button_ambience');
  }
  loadBreathingSettings() {
    const defaultSettings = {
        enabled: true,
        threshold: 3, // Default to 3 misses for the initial trigger
        speed: 'normal'
    };
    try {
        const savedSettings = localStorage.getItem('divineSenseBreathingSettings');
        if (savedSettings) {
            this.breathingSettings = { ...defaultSettings, ...JSON.parse(savedSettings) };
        } else {
            this.breathingSettings = defaultSettings;
        }
    } catch (e) {
        console.error('Could not load breathing settings, using defaults.', e);
        this.breathingSettings = defaultSettings;
    }
  }
  saveBreathingSettings() {
    try {
        localStorage.setItem('divineSenseBreathingSettings', JSON.stringify(this.breathingSettings));
    } catch(e) {
        console.error('Could not save breathing settings.', e);
    }
  }
  performReset() {
    this.statsTracker.resetAllStats();
    // Safest way to ensure a clean state is to reload the page.
    window.location.reload();
  }
  
  createModeToggle() {
    const { width, height } = this.sys.game.config;
    
    // Create mode toggle container - positioned above prediction text
    this.modeToggleContainer = this.add.container(width / 2, height / 2 + 70);
    this.modeToggleContainer.setDepth(1000);
    
    // Background for toggle - wider to accommodate proper spacing
    const toggleBg = this.add.graphics();
    toggleBg.fillStyle(0x1a0238, 0.9);
    toggleBg.fillRoundedRect(-100, -20, 200, 40, 10);
    toggleBg.lineStyle(1, 0x8a2be2, 1);
    toggleBg.strokeRoundedRect(-100, -20, 200, 40, 10);
    
    // Mode labels - positioned further from switch with proper spacing
    const senseText = this.add.text(-55, 0, 'SENSE', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      color: this.gameMode === 'sense' ? '#4db8ff' : '#888888',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5);
    
    const influenceText = this.add.text(55, 0, 'INFLUENCE', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      color: this.gameMode === 'influence' ? '#ff9966' : '#888888',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5);
    
    // Toggle switch - horizontal
    const switchTrack = this.add.graphics();
    switchTrack.fillStyle(0x333333, 1);
    switchTrack.fillRoundedRect(-18, -7, 36, 14, 7);
    
    this.switchKnob = this.add.graphics();
    this.switchKnob.fillStyle(this.gameMode === 'sense' ? 0x4db8ff : 0xff9966, 1);
    this.switchKnob.fillCircle(0, 0, 5);
    this.switchKnob.x = this.gameMode === 'sense' ? -10 : 10;
    
    // Store text references for updates
    this.senseText = senseText;
    this.influenceText = influenceText;
    
    this.modeToggleContainer.add([toggleBg, senseText, influenceText, switchTrack, this.switchKnob]);
    
    // Make interactive - updated size
    this.modeToggleContainer.setSize(200, 40).setInteractive({ useHandCursor: true });
    this.modeToggleContainer.on('pointerdown', () => {
      if (this.gameState === 'predicting') {
        this.toggleGameMode();
      }
    });
    
    // Hover effects
    this.modeToggleContainer.on('pointerover', () => {
      if (this.gameState === 'predicting') {
        this.tweens.add({
          targets: this.modeToggleContainer,
          scale: 1.05,
          duration: 200,
          ease: 'Power2'
        });
      }
    });
    
    this.modeToggleContainer.on('pointerout', () => {
      this.tweens.add({
        targets: this.modeToggleContainer,
        scale: 1,
        duration: 200,
        ease: 'Power2'
      });
    });
  }
  
  toggleGameMode() {
    this.gameMode = this.gameMode === 'sense' ? 'influence' : 'sense';
    this.saveGameModeSettings();
    this.playSound('button_hover_click');
    
    // Update visuals
    this.updateModeToggleVisuals();
    
    // Show brief explanation
    this.showModeExplanation();
    
    // Restart the current round with new mode
    this.startNewRound();
  }
  updateModeToggleVisuals() {
    if (!this.modeToggleContainer) return;
    
    const isSense = this.gameMode === 'sense';
    
    // Update text colors
    this.senseText.setColor(isSense ? '#4db8ff' : '#888888');
    this.influenceText.setColor(!isSense ? '#ff9966' : '#888888');
    
    // Animate switch knob position
    this.tweens.add({
      targets: this.switchKnob,
      x: isSense ? -10 : 10,
      duration: 300,
      ease: 'Back.easeOut'
    });
    
    // Create a glow effect that moves to the active side
    if (!this.switchGlow) {
        this.switchGlow = this.add.graphics();
        this.modeToggleContainer.addAt(this.switchGlow, 1); // Add behind text
    }
    this.switchGlow.clear();
    this.switchGlow.fillStyle(isSense ? 0x4db8ff : 0xff9966, 0.25);
    this.switchGlow.fillRoundedRect(isSense ? -90 : 10, -15, 80, 30, 15);
    this.switchGlow.setAlpha(0);
    this.tweens.add({
        targets: this.switchGlow,
        alpha: 1,
        duration: 300,
        ease: 'Cubic.easeOut',
    });
    // Set knob color directly
    const knobColor = isSense ? 0x4db8ff : 0xff9966;
    this.switchKnob.clear();
    this.switchKnob.fillStyle(knobColor, 1);
    this.switchKnob.fillCircle(0, 0, 5);
    // Create sparkles effect
    const emitter = this.add.particles(
        this.modeToggleContainer.x + this.switchKnob.x,
        this.modeToggleContainer.y,
        'star',
        {
            lifespan: 600,
            speed: { min: 150, max: 250 },
            scale: { start: 0.7, end: 0 },
            gravityY: 150,
            blendMode: 'ADD',
            emitting: false,
            tint: [knobColor, 0xffffff]
        }
    );
    emitter.setDepth(this.modeToggleContainer.depth + 1);
    emitter.explode(12);
    // Also update the main stats bar display
    this.uiManager.statsDisplay.updateForGameMode(this.gameMode);
  }
  
  updateModeIndicator() {
    if (this.modeToggleContainer) {
      this.modeToggleContainer.setVisible(this.gameState === 'predicting');
    }
  }
  
  showModeExplanation() {
    const { width } = this.sys.game.config;
    
    const explanationText = this.gameMode === 'sense' 
      ? 'SENSE MODE: Try to perceive the predetermined outcome'
      : 'INFLUENCE MODE: Try to influence the outcome with your intention';
    
    const explanation = this.add.text(width / 2, 120, explanationText, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: this.gameMode === 'sense' ? '#4db8ff' : '#ff9966',
      fontStyle: 'bold',
      align: 'center',
      backgroundColor: '#000000',
      padding: { x: 15, y: 8 }
    }).setOrigin(0.5).setAlpha(0);
    
    explanation.setDepth(2000);
    
    this.tweens.add({
      targets: explanation,
      alpha: 1,
      y: 140,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(2500, () => {
          this.tweens.add({
            targets: explanation,
            alpha: 0,
            y: 120,
            duration: 300,
            ease: 'Power2',
            onComplete: () => explanation.destroy()
          });
        });
      }
    });
  }
  
  loadGameModeSettings() {
    try {
      const saved = localStorage.getItem('divineSenseGameMode');
      this.gameMode = saved || 'sense';
    } catch (e) {
      console.error('Could not load game mode settings:', e);
      this.gameMode = 'sense';
    }
  }
  
  saveGameModeSettings() {
    try {
      localStorage.setItem('divineSenseGameMode', this.gameMode);
    } catch (e) {
      console.error('Could not save game mode settings:', e);
    }
  }
  calculateZenScore(stats) {
    if (!stats) return 0;
    
    // Normalize p-value: lower is better. We invert its effect.
    // A p-value of 1 is chance, a p-value of 0 is perfect anti-chance.
    // We want to reward scores lower than 0.5.
    const pValueScore = Math.max(0, (0.5 - stats.pValue) * 2) * 50;
    // Accuracy score (weighted)
    const accuracyScore = stats.accuracy * 1.5;
    // Streak bonus (exponential)
    const streakBonus = Math.pow(stats.currentStreak, 1.2) * 2;
    // Coherence bonus (rewards regular practice)
    const coherenceBonus = (stats.totalCoherenceTime / 60) * 0.5 + (stats.dailyBreathingStreak * 5);
    // Combine scores with weights
    const baseScore = pValueScore + accuracyScore + streakBonus + coherenceBonus;
    // Final score should be non-negative
    const zenScore = Math.max(0, baseScore);
    
    // Return a clean number
    return isNaN(zenScore) ? 0 : zenScore;
  }

  // Alias: Q-Score uses the same computation as legacy Zen Score
  calculateQScore(stats) {
    return this.calculateZenScore(stats);
  }
  
  createModeComparisonPanel() {
    const { width, height } = this.sys.game.config;
    
    // Create modal container
    const modalContainer = this.add.container(0, 0);
    modalContainer.setDepth(3000);
    
    // Background blocker
    const blocker = this.add.graphics();
    blocker.fillStyle(0x000000, 0.8);
    blocker.fillRect(0, 0, width, height);
    blocker.setInteractive();
    modalContainer.add(blocker);
    
    // Main panel
    const panelWidth = Math.min(500, width - 40);
    const panelHeight = Math.min(600, height - 40);
    
    const panel = this.add.graphics();
    panel.fillStyle(0x1a0238, 0.95);
    panel.fillRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, 20);
    panel.lineStyle(2, 0x8a2be2, 1);
    panel.strokeRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, 20);
    
    const panelContainer = this.add.container(width/2, height/2);
    panelContainer.add(panel);
    modalContainer.add(panelContainer);
    
    // Title
    const title = this.add.text(0, -panelHeight/2 + 30, 'MODE COMPARISON', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      color: '#00e5ff',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5);
    panelContainer.add(title);
    
    // Get comparison data
    const comparison = this.statsTracker.getModeComparison();
    const senseData = comparison.sense;
    const influenceData = comparison.influence;
    
    // Mode sections
    let yPos = -panelHeight/2 + 80;
    
    // Sense Mode Section
    const senseTitle = this.add.text(-panelWidth/2 + 20, yPos, 'SENSE MODE (ESP)', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#00ff00',
      fontStyle: 'bold'
    });
    panelContainer.add(senseTitle);
    yPos += 30;
    
    const senseStats = this.add.text(-panelWidth/2 + 20, yPos, 
      `Predictions: ${senseData.totalRolls}\n` +
      `Accuracy: ${senseData.accuracy.toFixed(1)}%\n` +
      `Best Streak: ${senseData.bestStreak}\n` +
      `P-Value: ${senseData.pValue.toFixed(3)}\n` +
      `Performance: ${senseData.performance}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#ffffff',
      lineSpacing: 5
    });
    panelContainer.add(senseStats);
    yPos += 110;
    
    // Influence Mode Section  
    const influenceTitle = this.add.text(-panelWidth/2 + 20, yPos, 'INFLUENCE MODE (PK)', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#ff6600',
      fontStyle: 'bold'
    });
    panelContainer.add(influenceTitle);
    yPos += 30;
    
    const influenceStats = this.add.text(-panelWidth/2 + 20, yPos,
      `Predictions: ${influenceData.totalRolls}\n` +
      `Accuracy: ${influenceData.accuracy.toFixed(1)}%\n` +
      `Best Streak: ${influenceData.bestStreak}\n` +
      `P-Value: ${influenceData.pValue.toFixed(3)}\n` +
      `Performance: ${influenceData.performance}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#ffffff',
      lineSpacing: 5
    });
    panelContainer.add(influenceStats);
    yPos += 130;
    
    // Insights Section
    const insightsTitle = this.add.text(-panelWidth/2 + 20, yPos, 'INSIGHTS', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#8a2be2',
      fontStyle: 'bold'
    });
    panelContainer.add(insightsTitle);
    yPos += 30;
    
    const recommendation = this.add.text(-panelWidth/2 + 20, yPos, comparison.recommendation, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#cccccc',
      wordWrap: { width: panelWidth - 40 },
      lineSpacing: 3
    });
    panelContainer.add(recommendation);
    
    // Performance comparison bars
    if (senseData.totalRolls > 0 && influenceData.totalRolls > 0) {
      const barY = yPos + 60;
      const barWidth = panelWidth - 80;
      const barHeight = 20;
      
      // Sense accuracy bar
      const senseBarBg = this.add.graphics();
      senseBarBg.fillStyle(0x333333, 1);
      senseBarBg.fillRoundedRect(-barWidth/2, 0, barWidth, barHeight, 10);
      senseBarBg.setPosition(0, barY);
      panelContainer.add(senseBarBg);
      
      const senseBarFill = this.add.graphics();
      senseBarFill.fillStyle(0x00ff00, 0.8);
      const senseBarFillWidth = (senseData.accuracy / 100) * barWidth;
      senseBarFill.fillRoundedRect(-barWidth/2, 0, senseBarFillWidth, barHeight, 10);
      senseBarFill.setPosition(0, barY);
      panelContainer.add(senseBarFill);
      
      const senseLabel = this.add.text(-barWidth/2 - 5, barY + barHeight/2, 'Sense', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#00ff00'
      }).setOrigin(1, 0.5);
      panelContainer.add(senseLabel);
      
      // Influence accuracy bar
      const influenceBarBg = this.add.graphics();
      influenceBarBg.fillStyle(0x333333, 1);
      influenceBarBg.fillRoundedRect(-barWidth/2, 0, barWidth, barHeight, 10);
      influenceBarBg.setPosition(0, barY + 30);
      panelContainer.add(influenceBarBg);
      
      const influenceBarFill = this.add.graphics();
      influenceBarFill.fillStyle(0xff6600, 0.8);
      const influenceBarFillWidth = (influenceData.accuracy / 100) * barWidth;
      influenceBarFill.fillRoundedRect(-barWidth/2, 0, influenceBarFillWidth, barHeight, 10);
      influenceBarFill.setPosition(0, barY + 30);
      panelContainer.add(influenceBarFill);
      
      const influenceLabel = this.add.text(-barWidth/2 - 5, barY + 30 + barHeight/2, 'Influence', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#ff6600'
      }).setOrigin(1, 0.5);
      panelContainer.add(influenceLabel);
    }
    
    // Close button
    const closeButton = this.add.text(0, panelHeight/2 - 40, 'CLOSE', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#8a2be2',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    
    closeButton.on('pointerdown', () => {
      this.playSound('button_hover_click');
      modalContainer.destroy();
    });
    
    closeButton.on('pointerover', () => {
      closeButton.setStyle({ backgroundColor: '#9932cc' });
    });
    
    closeButton.on('pointerout', () => {
      closeButton.setStyle({ backgroundColor: '#8a2be2' });
    });
    
    panelContainer.add(closeButton);
    
    // Close on background click
    blocker.on('pointerdown', () => {
      this.playSound('button_hover_click');
      modalContainer.destroy();
    });
    
    // Animate in
    panelContainer.setScale(0);
    this.tweens.add({
      targets: panelContainer,
      scale: 1,
      duration: 400,
      ease: 'Back.easeOut'
    });
    
    return modalContainer;
  }
  
  updatePortalVisibility() {
      if (this.mainPortalContainer) {
          const isVisible = this.currentActiveLevel === 3 && this.gameState !== 'breathing';
          this.mainPortalContainer.setVisible(isVisible);
      }
  }
  // Add method to show the panel (can be called from UI or key press)
  showModeComparisonPanel() {
    // Only show if player has used both modes
    const comparison = this.statsTracker.getModeComparison();
    if (comparison.sense.totalRolls === 0 && comparison.influence.totalRolls === 0) {
      return; // No data to show yet
    }
    
    this.createModeComparisonPanel();
  }
  startBackgroundGlow() {
    const { width, height } = this.sys.game.config;
    const maxRadius = Math.max(width, height) / 1.5;
    const speeds = { slow: 6000, normal: 4000, fast: 2500 };
    const duration = speeds[this.breathingSettings.speed] || 4000;
    const glowColor = 0x8a2be2;
    this.breathingGlow.clear();
    // Create a tween for the alpha of the glow
    this.glowTween = this.tweens.add({
        targets: this.breathingGlow,
        alpha: { from: 0.1, to: 0.35 },
        duration: duration,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
        onUpdate: (tween) => {
            const progress = tween.progress;
            const radius = maxRadius * (0.5 + progress * 0.5);
            const alpha = 0.4 * tween.targets[0].alpha;
            this.breathingGlow.clear();
            // This will create a radial gradient effect by drawing multiple circles
            for (let i = 0; i < 5; i++) {
                const t = i / 4;
                this.breathingGlow.fillStyle(glowColor, alpha * (1 - t) * (1-t));
                this.breathingGlow.fillCircle(0, 0, radius * t);
            }
        }
    });
  }
  stopBackgroundGlow() {
      if (this.glowTween) {
          this.tweens.add({
              targets: this.breathingGlow,
              alpha: 0,
              duration: 500,
              ease: 'Power2',
              onComplete: () => {
                  this.glowTween.stop();
                  this.glowTween = null;
                  this.breathingGlow.clear();
              }
          });
      }
  }

  destroy() {
    // Clean up all infinite tweens and timers
    if (this.tweens) {
      this.tweens.killAll();
    }
    
    // Clean up managers that might have their own tweens
    if (this.psychicTrainer) {
      this.psychicTrainer.destroy();
    }
    if (this.emotionalAuraController) {
      this.emotionalAuraController.destroy();
    }
    if (this.audioManager) {
      this.audioManager.destroy();
    }
    if (this.binauralGenerator) {
      this.binauralGenerator.destroy();
    }
    if (this.breathingExercise) {
      this.breathingExercise.destroy();
    }
    if (this.uiManager) {
      this.uiManager.destroy();
    }
    if (this.bottomMenuManager) {
      this.bottomMenuManager.destroy();
    }
    
    // Clean up any remaining timers
    if (this.time) {
      this.time.removeAllEvents();
    }
    
    super.destroy();
  }
}