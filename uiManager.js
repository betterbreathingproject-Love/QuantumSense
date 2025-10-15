import Phaser from 'phaser';
import { StatsDisplay } from './StatsDisplay.js';
import { MenuManager } from './MenuManager.js';
import { AchievementManager } from './AchievementManager.js';
import { ProfileManager } from './ProfileManager.js';
import { ShareManager } from './ShareManager.js';
import { BinauralPanelManager } from './BinauralPanelManager.js';
import { ModalManager } from './ModalManager.js';
import { SliderTooltipUtils } from './SliderTooltipUtils.js';
import { TooltipManager } from './TooltipManager.js';
import { WheelEventManager } from './WheelEventManager.js';
import { getScalingUtils } from './ScalingUtils.js';
// Removed DailyCheckInManager import - no longer needed
export class UIManager {
  constructor(scene, statsTracker, binauralGenerator) {
    this.scene = scene;
    this.statsTracker = statsTracker;
    this.binauralGenerator = binauralGenerator;
    
    // Initialize scaling utilities
    this.scalingUtils = scene.scalingUtils || getScalingUtils();
    
    // Initialize wheel event manager first
    this.wheelEventManager = new WheelEventManager(scene);
    
    // Initialize utility classes
    this.tooltipManager = new TooltipManager(scene);
    this.sliderTooltipUtils = new SliderTooltipUtils(scene, this.tooltipManager);
    
    // Initialize utility managers
    this.modalManager = new ModalManager(scene, statsTracker);
    // Removed dailyCheckInManager - functionality moved to HomePanel
    
    // Create new organized containers
    this.createOrganizedContainers();
    
    // Create profile panel containers
    this.createProfileContainers();
    
    // Initialize specialized managers
    this.statsDisplay = new StatsDisplay(scene, statsTracker);
    this.achievementManager = new AchievementManager(scene, statsTracker, this.tooltipManager);
    this.profileManager = new ProfileManager(scene, statsTracker, this.tooltipManager);
    this.shareManager = new ShareManager(scene, statsTracker);
    this.binauralPanelManager = new BinauralPanelManager(scene, binauralGenerator, this);
    
    this.menuManager = new MenuManager(
      scene,
      statsTracker,
      binauralGenerator,
      () => this.profileManager.toggleProfilePanel(),
      () => this.binauralPanelManager.togglePanel(),
      () => this.modalManager.showLeaderboardModal(),
      () => this.modalManager.showResetConfirmationModal(
        'Reset All Progress?',
        'This action is permanent and cannot be undone. All your stats, achievements, and unlocked levels will be lost.',
        () => this.scene.performReset()
      ),
      () => {
        // My Stats toggle callback
        console.log('Opening My Stats scene');
        this.scene.scene.start('MyStatsScene', { 
          statsTracker: this.statsTracker,
          returnScene: this.scene.scene.key 
        });
      }
      // Removed daily check-in callback - no longer needed
    );
    
    // Profile panel now handled by ProfileManager
    
    // Handle outside clicks
    this.scene.input.on('pointerdown', (pointer) => this.handleOutsideClick(pointer));
    
    // Initial sync of sliders
    this.updateAllMusicSliders(this.scene.audioSettings.musicVolume);
  }
  createOrganizedContainers() {
    const { width, height } = this.scene.sys.game.config;
    
    // Main UI container - everything UI related goes here
    this.mainUIContainer = this.scalingUtils.createResponsiveContainer(0, 0);
    this.mainUIContainer.setDepth(100);
    
    // Left side container - for psychic meter and related elements
    this.leftSideContainer = this.scalingUtils.createResponsiveContainer(0, 0);
    this.leftSideContainer.setDepth(110);
    
    // Right side container - for coherence meter and shields
    this.rightSideContainer = this.scalingUtils.createResponsiveContainer(0, 0);
    this.rightSideContainer.setDepth(110);
    
    // Top UI container - for stats bar and achievement badges
    this.topUIContainer = this.scalingUtils.createResponsiveContainer(0, 0);
    this.topUIContainer.setDepth(120);
    
    // Compact stats container - for condensed stat display (responsive positioning)
    this.compactStatsContainer = this.scalingUtils.createResponsiveContainer(width / 2, 30);
    this.compactStatsContainer.setDepth(125);
    
    // Mobile-friendly container - for touch controls and mobile layouts
    this.mobileContainer = this.scalingUtils.createResponsiveContainer(0, 0);
    this.mobileContainer.setDepth(130);
    
    // Achievement mini container - for smaller badge display (responsive positioning)
    this.achievementMiniContainer = this.scalingUtils.createResponsiveContainer(width - 60, 100);
    this.achievementMiniContainer.setDepth(140);
    
    // Status indicator container - for compact status displays (responsive positioning)
    this.statusIndicatorContainer = this.scalingUtils.createResponsiveContainer(30, height - 100);
    this.statusIndicatorContainer.setDepth(150);
    
    // Add all containers to main container for easy management
    this.mainUIContainer.add([
      this.leftSideContainer,
      this.rightSideContainer,
      this.topUIContainer,
      this.compactStatsContainer,
      this.mobileContainer,
      this.achievementMiniContainer,
      this.statusIndicatorContainer
    ]);
    
    // Store original dimensions for responsive scaling
    this.originalWidth = width;
    this.originalHeight = height;
    this.scaleFactor = 1;
    
    // Listen for scaling updates to reposition containers
    this.scene.events.on('scalingUpdated', () => {
      this.updateContainerPositions();
    });
    
    console.log('New organized containers created with responsive scaling');
  }
  
  updateContainerPositions() {
    const { width, height } = this.scene.sys.game.config;
    
    // Update responsive container positions
    this.compactStatsContainer.x = this.scalingUtils.scaleXCoordinate(width / 2);
    this.compactStatsContainer.y = this.scalingUtils.scaleYCoordinate(30);
    
    this.achievementMiniContainer.x = this.scalingUtils.scaleXCoordinate(width - 60);
    this.achievementMiniContainer.y = this.scalingUtils.scaleYCoordinate(100);
    
    this.statusIndicatorContainer.x = this.scalingUtils.scaleXCoordinate(30);
    this.statusIndicatorContainer.y = this.scalingUtils.scaleYCoordinate(height - 100);
  }
  
  createProfileContainers() {
    const { width, height } = this.scene.sys.game.config;
    
    // Create main profile container
    this.profileContainer = this.scene.add.container(width / 2, height + height / 2);
    this.profileContainer.setDepth(2000);
    // Ensure the profile container is not visible when initialized so it cannot peek
    // at the bottom of the screen due to scaling or layout changes.
    this.profileContainer.setVisible(false);
    this._profileOpen = false; // Use private property to avoid getter conflict
     
     const panelHeight = height * 0.9;
     const panelWidth = Math.min(600, width * 0.95);
     
     // Background
     const bg = this.scene.add.graphics();
     bg.fillStyle(0x1a052b, 0.98);
     bg.fillRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 20);
     bg.lineStyle(2, 0x00e5ff, 1);
     bg.strokeRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 20);
     bg.setInteractive(new Phaser.Geom.Rectangle(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight), Phaser.Geom.Rectangle.Contains);
     
     // Close button
     const closeButton = this.scene.add.text(panelWidth / 2 - 25, -panelHeight / 2 + 25, '×', {
       fontFamily: 'Arial, sans-serif', fontSize: '36px', color: '#ffffff'
     }).setOrigin(0.5).setInteractive({ useHandCursor: true });
     closeButton.on('pointerdown', () => this.toggleProfilePanel());
     
     // Stats container for content
     this.profileStatsContainer = this.scene.add.container(0, 0);
     
     this.profileContainer.add([bg, this.profileStatsContainer, closeButton]);
   }

  createProfileButton(x, y, text, callback, color = '#00e5ff') {
    // Use the new responsive button creation method from ScalingUtils
    const button = this.scalingUtils.createResponsiveButton(x, y, text, {
      fontFamily: 'Arial, sans-serif', 
      fontSize: 20, 
      color: color,
      backgroundColor: '#2d0b4b',
      padding: { x: 20, y: 12 },
      align: 'center'
    }, () => {
      this.scene.playSound('button_ambience');
      callback();
    });
    
    return button;
  }

  // Delegate methods to specialized managers
  get topBarContainer() { return this.statsDisplay.topBarContainer; }
  get psychicMeterContainer() { return this.statsDisplay.psychicMeterContainer; }
  get coherenceContainer() { return this.statsDisplay.coherenceContainer; }
  get shieldContainer() { return this.statsDisplay.shieldContainer; }
  get menuButton() { return this.menuManager.menuButton; }
  get badgeContainer() { return this.achievementManager.badgeContainer; }
  get breathingAwardsContainer() { return this.achievementManager.breathingAwardsContainer; }
  updateStats(stats, shouldAnimatePowerIncrease = false) {
    this.statsDisplay.updateStats(stats, shouldAnimatePowerIncrease);
  }
  updateBadges(shouldAnimate = false) {
    this.achievementManager.updateBadges(shouldAnimate);
  }
  addBadge(achievement, isBreathingAward = false) {
    this.achievementManager.addBadge(achievement, isBreathingAward);
  }
  showAchievementNotification(achievement) {
    this.achievementManager.showAchievementNotification(achievement);
  }
  updateCoherenceMeter(progress, isExercising) {
    this.statsDisplay.updateCoherenceMeter(progress, isExercising);
  }
  hideForBreathing() {
    if (this.topBarContainer && this.topBarContainer.scene) this.topBarContainer.setVisible(false);
    if (this.psychicMeterContainer && this.psychicMeterContainer.scene) this.psychicMeterContainer.setVisible(false);
    // The coherence meter should remain visible during breathing exercises.
    // if (this.coherenceContainer) this.coherenceContainer.setVisible(false);
    if (this.badgeContainer && this.badgeContainer.scene) this.badgeContainer.setVisible(false);
    if (this.breathingAwardsContainer && this.breathingAwardsContainer.scene) this.breathingAwardsContainer.setVisible(false);
  }
  showFromBreathing() {
    if (this.topBarContainer && this.topBarContainer.scene) this.topBarContainer.setVisible(true);
    if (this.psychicMeterContainer && this.psychicMeterContainer.scene) this.psychicMeterContainer.setVisible(true);
    // The coherence meter is always visible.
    // if (this.coherenceContainer) this.coherenceContainer.setVisible(true);
    if (this.badgeContainer && this.badgeContainer.scene) this.badgeContainer.setVisible(true);
    if (this.breathingAwardsContainer && this.breathingAwardsContainer.scene) this.breathingAwardsContainer.setVisible(true);
  }
  toggleMenu(playSound = true) {
    this.menuManager.toggleMenu(playSound);
  }
  updateAllMusicSliders(volume) {
    this.menuManager.updateAllMusicSliders(volume);
    if (this.binauralPanelManager.binauralMusicSlider) this.updateSliderUI(this.binauralPanelManager.binauralMusicSlider, volume);
  }
  createPsychicMeter() {
    const height = this.scene.sys.game.config.height;
    const meterHeight = 250;
    const meterWidth = 30;
    const x = 45;
    const y = height / 2 - meterHeight / 2 - 30;
    this.psychicMeterContainer = this.scene.add.container(0, 0);
    this.meterBG = this.scene.add.graphics();
    this.meterBG.fillStyle(0x000000, 0.3);
    this.meterBG.fillRoundedRect(x - meterWidth / 2, y, meterWidth, meterHeight, 15);
    this.meterBG.lineStyle(2, 0x8a2be2, 0.5);
    this.meterBG.strokeRoundedRect(x - meterWidth / 2, y, meterWidth, meterHeight, 15);
    this.meterFill = this.scene.add.graphics();
    
    // Shield display above the meter
    this.meterLevelText = this.scene.add.text(x, y + meterHeight + 20, '🌱 NOVICE', {
      fontFamily: 'Arial, sans-serif', fontSize: this.scalingUtils.scaleFontSize(14), color: '#c9c9c9', fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Streak fire display
    this.streakFireText = this.scene.add.text(x, y + meterHeight + 45, '', {
      fontFamily: 'Arial, sans-serif', fontSize: this.scalingUtils.scaleFontSize(16), color: '#ff6600', fontStyle: 'bold'
    }).setOrigin(0.5);
    
    const powerLabel = this.scene.add.text(x, y - 20, 'DIVINE\nPOWER', {
      fontFamily: 'Arial, sans-serif', fontSize: this.scalingUtils.scaleFontSize(14), color: '#c9c9c9', align: 'center'
    }).setOrigin(0.5);
    this.psychicMeterContainer.add([this.meterBG, this.meterFill, this.meterLevelText, this.streakFireText, powerLabel]);
    
    // Make the meter interactive for tooltips
    const meterInteractionZone = this.scene.add.zone(x, y + meterHeight/2, meterWidth + 20, meterHeight + 100);
    meterInteractionZone.setInteractive();
    meterInteractionZone.on('pointerover', () => {
      this.tooltipManager.createDivineBarTooltip(meterInteractionZone, this.statsTracker.getStats());
    });
    meterInteractionZone.on('pointerout', () => {
      this.tooltipManager.hideTooltip(meterInteractionZone);
    });
    this.psychicMeterContainer.add(meterInteractionZone);
  }
  createCoherenceMeter() {
      const { width, height } = this.scene.sys.game.config;
      const meterHeight = 250;
      const meterWidth = 30;
      const x = width - 45;
      const y = height / 2 - meterHeight / 2 - 30;
      this.coherenceContainer = this.scene.add.container(x, y).setDepth(100);
      const bg = this.scene.add.graphics();
      bg.fillStyle(0x000000, 0.3);
      bg.fillRoundedRect(-meterWidth / 2, 0, meterWidth, meterHeight, 15);
      bg.lineStyle(2, 0x8a2be2, 0.5);
      bg.strokeRoundedRect(-meterWidth / 2, 0, meterWidth, meterHeight, 15);
      this.coherenceMeterFill = this.scene.add.graphics();
      this.shieldContainer = this.scene.add.container(0, -55);
      const shieldIcon = this.scene.add.image(0, 0, 'gold_shield').setScale(0.12).setOrigin(0.5);
      const shieldCount = this.scene.add.text(0, 35, '0', {
          fontFamily: 'Arial, sans-serif',
          fontSize: this.scalingUtils.scaleFontSize(24),
          color: '#ffffff',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 5,
          shadow: { color: '#ffff00', blur: 5, stroke: true, fill: true }
      }).setOrigin(0.5);
      
      this.shieldContainer.add([shieldIcon, shieldCount]);
      this.shieldContainer.shieldCountText = shieldCount;
      const meterLabel = this.scene.add.text(-1, meterHeight + 20, 'COHERENCE', {
          fontFamily: 'Arial, sans-serif', fontSize: this.scalingUtils.scaleFontSize(12), color: '#c9c9c9', fontStyle: 'bold'
      }).setOrigin(0.5);
    this.coherenceContainer.add([bg, this.coherenceMeterFill, this.shieldContainer, meterLabel]);
    this.coherenceContainer.setVisible(true); // Always visible
    
    // Make the coherence meter interactive for tooltips
    const coherenceInteractionZone = this.scene.add.zone(0, meterHeight/2, meterWidth + 20, meterHeight + 60);
    coherenceInteractionZone.setInteractive();
    coherenceInteractionZone.on('pointerover', () => {
      this.tooltipManager.createCoherenceTooltip(coherenceInteractionZone);
    });
    coherenceInteractionZone.on('pointerout', () => {
      this.tooltipManager.hideTooltip(coherenceInteractionZone);
    });
    this.coherenceContainer.add(coherenceInteractionZone);
    
    // Make the shield interactive for tooltips
    this.shieldContainer.setSize(60, 80).setInteractive();
    this.shieldContainer.on('pointerover', () => {
      this.tooltipManager.createShieldTooltip(this.shieldContainer, this.statsTracker.getStats());
    });
    this.shieldContainer.on('pointerout', () => {
      this.tooltipManager.hideTooltip(this.shieldContainer);
    });
  }
  createBreathingStatItem(x, y, value, label, tooltipText) {
      const valueStyle = {
          fontFamily: 'Arial, sans-serif',
          fontSize: '24px',
          color: '#00e5ff',
          fontStyle: 'bold'
      };
      const labelStyle = {
          fontFamily: 'Arial, sans-serif',
          fontSize: '12px',
          color: '#c9c9c9'
      };
      
      const valueText = this.scene.add.text(0, -8, value, valueStyle).setOrigin(0.5);
      const labelText = this.scene.add.text(0, 12, label, labelStyle).setOrigin(0.5);
      
      const container = this.scene.add.container(x, y, [valueText, labelText]);
      container.setInteractive(new Phaser.Geom.Rectangle(-60, -25, 120, 50), Phaser.Geom.Rectangle.Contains, { useHandCursor: true });
      
      container.on('pointerover', (pointer) => {
          this.tooltipManager.createStatTooltip(tooltipText, container);
      });
      container.on('pointerout', () => {
          this.tooltipManager.hideTooltip(container);
      });
      
      return { valueText, labelText, container };
  }
  createStatItem(x, y, value, label, tooltipText) {
    const valueStyle = {
      fontFamily: 'Arial, sans-serif',
      fontSize: 28,
      color: '#00e5ff',
      fontStyle: 'bold'
    };
    const labelStyle = {
      fontFamily: 'Arial, sans-serif',
      fontSize: 14,
      color: '#c9c9c9'
    };
    
    // Use responsive text creation from ScalingUtils
    const valueText = this.scalingUtils.createResponsiveText(0, 0, value, valueStyle);
    valueText.setOrigin(0.5);
    
    const labelText = this.scalingUtils.createResponsiveText(0, 25, label, labelStyle);
    labelText.setOrigin(0.5);
    
    // Use responsive container creation
    const container = this.scalingUtils.createResponsiveContainer(x, y);
    container.add([valueText, labelText]);
    
    // Scale interactive area based on screen size
    const interactiveSize = this.scalingUtils.scaleSpacing(100);
    const interactiveHeight = this.scalingUtils.scaleSpacing(80);
    
    container.setInteractive(
      new Phaser.Geom.Rectangle(-interactiveSize/2, -40, interactiveSize, interactiveHeight), 
      Phaser.Geom.Rectangle.Contains, 
      { useHandCursor: true }
    );
    
    container.on('pointerover', (pointer) => {
        this.tooltipManager.createStatTooltip(tooltipText, container);
    });
    container.on('pointerout', () => {
        this.tooltipManager.hideTooltip(container);
    });
    
    return { valueText, labelText, container };
  }
  updatePsychicMeter(power, level, shouldAnimate = false) {
      const height = this.scene.sys.game.config.height;
      const meterHeight = 250;
      const meterWidth = 30;
      const x = 45;
      const y = height / 2 - meterHeight / 2;
      const fillHeight = (power / 100) * meterHeight;
      const levelMap = ['🌱 NOVICE', '🌸 APPRENTICE', '⚡ ADEPT', '👑 MASTER', '✨ TRANSCENDENT'];
      const colorMap = [0x8a2be2, 0x00e5ff, 0x00ff00, 0xffff00, 0xff00ff];
      
      this.meterLevelText.setText(levelMap[level]);
      
      if (shouldAnimate && power > 0) {
          // Store current fill height for animation
          const currentFillHeight = this.meterFill.geom ? this.meterFill.geom.height || 0 : 0;
          
          // Exciting power-up animation
          this.createPowerUpAnimation(x, y + meterHeight - fillHeight, meterWidth, colorMap[level]);
          
          // Animate the fill from current to new height
          this.animateMeterFill(x, y, meterWidth, meterHeight, currentFillHeight, fillHeight, colorMap[level]);
          
          // Pulsing effect on the entire meter area
          this.createMeterPulseEffect(x, y, meterWidth, meterHeight);
      } else {
          // Static update without animation
          this.meterFill.clear();
          this.meterFill.fillStyle(colorMap[level], 0.8);
          this.meterFill.fillRoundedRect(x - meterWidth / 2, y + meterHeight - fillHeight, meterWidth, fillHeight, 15);
      }
      
      // Update streak fire display
      const currentStreak = this.statsTracker.getStats().currentStreak;
      this.updateStreakFire(currentStreak);
  }
  
  createPowerUpAnimation(x, y, width, color) {
      // Create sparkle particles
      const sparkleEmitter = this.scene.add.particles(x, y, 'particle', {
          speed: { min: 80, max: 160 },
          angle: { min: 0, max: 360 },
          scale: { start: 0.4, end: 0 },
          blendMode: 'ADD',
          lifespan: 800,
          tint: [color, 0xffffff, 0xffff00],
          frequency: -1
      });
      sparkleEmitter.explode(15);
      
      // Create upward energy burst
      const energyEmitter = this.scene.add.particles(x, y + 20, 'particle', {
          speed: { min: 100, max: 200 },
          angle: { min: 260, max: 280 },
          scale: { start: 0.3, end: 0 },
          blendMode: 'ADD',
          lifespan: 1000,
          tint: color,
          frequency: -1
      });
      energyEmitter.explode(8);
      
      // Clean up particles
      this.scene.time.delayedCall(1200, () => {
          sparkleEmitter.destroy();
          energyEmitter.destroy();
      });
      
      // Screen flash effect
      this.createScreenFlash(color);
  }
  
  animateMeterFill(x, y, width, height, fromHeight, toHeight, color) {
      // Create a temporary graphics object for smooth animation
      const animatedFill = this.scene.add.graphics();
      
      this.scene.tweens.add({
          targets: { height: fromHeight },
          height: toHeight,
          duration: 600,
          ease: 'Back.easeOut',
          onUpdate: (tween, target) => {
              const currentHeight = target.height;
              animatedFill.clear();
              animatedFill.fillStyle(color, 0.8);
              if (currentHeight > 0) {
                  animatedFill.fillRoundedRect(x - width / 2, y + height - currentHeight, width, currentHeight, 15);
              }
          },
          onComplete: () => {
              // Update the actual meter fill and destroy the animated one
              this.meterFill.clear();
              this.meterFill.fillStyle(color, 0.8);
              if (toHeight > 0) {
                  this.meterFill.fillRoundedRect(x - width / 2, y + height - toHeight, width, toHeight, 15);
              }
              animatedFill.destroy();
          }
      });
  }
  
  createMeterPulseEffect(x, y, width, height) {
      // Create a glow effect around the meter
      const glowGraphics = this.scene.add.graphics();
      glowGraphics.setBlendMode(Phaser.BlendModes.ADD);
      
      // Pulse animation
      this.scene.tweens.add({
          targets: glowGraphics,
          alpha: { from: 0, to: 0.8 },
          scaleX: { from: 1, to: 1.5 },
          scaleY: { from: 1, to: 1.2 },
          duration: 400,
          ease: 'Sine.easeOut',
          yoyo: true,
          onStart: () => {
              glowGraphics.fillStyle(0x00e5ff, 0.6);
              glowGraphics.fillRoundedRect(x - width / 2 - 5, y - 5, width + 10, height + 10, 20);
          },
          onComplete: () => {
              glowGraphics.destroy();
          }
      });
  }
  
  createScreenFlash(color) {
      const { width, height } = this.scene.sys.game.config;
      const flash = this.scene.add.graphics();
      flash.fillStyle(color, 0.15);
      flash.fillRect(0, 0, width, height);
      flash.setBlendMode(Phaser.BlendModes.ADD);
      flash.setDepth(1000);
      
      this.scene.tweens.add({
          targets: flash,
          alpha: 0,
          duration: 300,
          ease: 'Cubic.easeOut',
          onComplete: () => flash.destroy()
      });
  }
  
  updateStreakFire(streak) {
      if (streak === 0) {
          this.streakFireText.setText('').setVisible(false);
          return;
      }
      
      let fireText = '';
      let fireColor = '#ff6600';
      
      if (streak >= 10) {
          fireText = `🔥🔥🔥 ${streak} 🔥🔥🔥`;
          fireColor = '#ff0000';
      } else if (streak >= 5) {
          fireText = `🔥🔥 ${streak} 🔥🔥`;
          fireColor = '#ff3300';
      } else if (streak >= 3) {
          fireText = `🔥 ${streak} 🔥`;
          fireColor = '#ff6600';
      } else {
          fireText = `⭐ ${streak}`;
          fireColor = '#ffaa00';
      }
      
      this.streakFireText.setText(fireText).setColor(fireColor).setVisible(true);
      
      // Add pulsing animation for high streaks
      if (streak >= 5) {
          this.scene.tweens.killTweensOf(this.streakFireText);
          this.scene.tweens.add({
              targets: this.streakFireText,
              scale: { from: 1, to: 1.2 },
              duration: 600,
              ease: 'Sine.easeInOut',
              yoyo: true,
              repeat: -1
          });
      } else {
          this.scene.tweens.killTweensOf(this.streakFireText);
          this.streakFireText.setScale(1);
      }
  }
  
// Avatar functionality moved to MenuManager for consolidated menu access
  
  
  handleOutsideClick(pointer) {
    // Prevent recursive calls by checking if we're already handling a click
    if (this._handlingClick) {
      return;
    }
    this._handlingClick = true;
    
    try {
      const menuButtonBounds = this.menuButton ? this.menuButton.getBounds() : null;
      
      // If any panel is open, stop propagation and do nothing else
      if (this.menuManager.menuOpen || this.binauralPanelManager.isOpen || this.profileManager.isOpen()) {
        const menuBounds = this.menuManager.menuContainer ? this.menuManager.menuContainer.getBounds() : null;
        const binauralBounds = this.binauralPanelManager.container ? this.binauralPanelManager.container.getBounds() : null;
        const profileBounds = this.profileManager.isOpen() && this.profileManager.profileContainer ? this.profileManager.profileContainer.getBounds() : null;
        
        // Check for click *outside* of the open panels
        const clickedOutsideMenu = this.menuManager.menuOpen && menuBounds && menuButtonBounds && 
          !Phaser.Geom.Rectangle.Contains(menuBounds, pointer.x, pointer.y) && 
          !Phaser.Geom.Rectangle.Contains(menuButtonBounds, pointer.x, pointer.y);
        const clickedOutsideBinaural = this.binauralPanelManager.isOpen && binauralBounds && 
          !Phaser.Geom.Rectangle.Contains(binauralBounds, pointer.x, pointer.y);
        const clickedOutsideProfile = this.profileManager.isOpen() && profileBounds && 
          !Phaser.Geom.Rectangle.Contains(profileBounds, pointer.x, pointer.y);
        
        if (clickedOutsideMenu) {
          this.menuManager.toggleMenu();
          return;
        }
        
        if (clickedOutsideBinaural) {
          this.binauralPanelManager.togglePanel();
          return;
        }
        
        if (clickedOutsideProfile) {
          this.profileManager.toggleProfilePanel();
          return;
        }

        // For any click inside an open panel, we just stop to prevent game interactions.
        // This prevents clicks from passing through to game elements.
        return;
      }
    } finally {
      // Always reset the flag, even if an error occurs
      this._handlingClick = false;
    }
  }
  
  updateAllMusicSliders(volume) {
    // Update scene state
    this.scene.audioSettings.musicVolume = volume;
    if (this.scene.backgroundMusic) {
        this.scene.backgroundMusic.volume = volume;
    }
    this.scene.audioManager.saveAudioSettings();
    // Update menu slider
    // Update menu slider
    if (this.musicSlider) this.updateSliderUI(this.musicSlider, volume);
    // Update binaural panel slider
    if (this.binauralPanelManager.binauralMusicSlider) this.updateSliderUI(this.binauralPanelManager.binauralMusicSlider, volume);
  }
  
  // This method is now redundant because the primary updateAllOmmingSliders handles everything.
  // We can remove it to avoid confusion and potential recursive loops.
  
  updateSliderUI(sliderElements, value) {
    this.tooltipManager.updateSliderUI(sliderElements, value);
  }
  // Profile panel creation moved to ProfileManager
  
  toggleProfilePanel() {
    const { width, height } = this.scene.sys.game.config;
    this._profileOpen = !this._profileOpen;
    const targetY = this._profileOpen ? height / 2 : height + height / 2;
    
    // Unregister wheel handler when closing profile
    if (!this._profileOpen) {
      this.wheelEventManager.unregisterHandler('profileScroll');
    }
    
    // Make sure the container is visible before animating it into view
    if (this._profileOpen) {
      this.profileContainer.setVisible(true);
    }
    
    this.scene.tweens.add({
      targets: this.profileContainer,
      y: targetY,
      duration: 500,
      ease: 'Cubic.easeInOut',
      onComplete: () => {
        // After closing animation finishes, hide the container so nothing peeks
        if (!this._profileOpen) {
          this.profileContainer.setVisible(false);
        }
      }
    });
    
    this.menuManager.setProfileOpen(this._profileOpen);
    this.scene.interactionManager.updateInteractions();
    
    if (this._profileOpen) {
      this.updateProfilePanel();
    }
  }
  get profileOpen() {
    return this._profileOpen;
  }
  
  updateProfileAvatarPosition() {
    if (!this.profileAvatarElement || !this._profileOpen) return;
    const canvas = this.scene.sys.game.canvas;
    const bounds = canvas.getBoundingClientRect();
    const scale = Math.min(bounds.width / canvas.width, bounds.height / canvas.height);
    // Position avatar at the top-center of the profile panel
    const panelCenterX = bounds.left + bounds.width / 2;
    const panelTop = bounds.top + (canvas.height * 0.05) * scale; // 5% from top of game view
    const avatarSize = 120 * scale;
    const avatarX = panelCenterX - avatarSize / 2;
    const avatarY = panelTop + 50 * scale; // Adjust Y position
    this.profileAvatarElement.style.left = `${avatarX}px`;
    this.profileAvatarElement.style.top = `${avatarY}px`;
    this.profileAvatarElement.style.width = `${avatarSize}px`;
    this.profileAvatarElement.style.height = `${avatarSize}px`;
    this.profileAvatarElement.style.display = 'block';
  }
  
  updateProfilePanel() {
    if (!this._profileOpen) return;
    if (this.profileScrollHandler) {
        this.scene.input.off('wheel', this.profileScrollHandler);
        this.profileScrollHandler = null;
    }
    this.profileStatsContainer.removeAll(true);
    const stats = this.statsTracker.getStats();
    const sessionStats = this.statsTracker.getSessionStats();
    const contentContainer = this.scene.add.container(0, 0);
    this.profileStatsContainer.add(contentContainer);
    let yPos = -220; // Start content even lower to ensure header elements fit
    const createDivider = (y) => {
        const divider = this.scene.add.graphics();
        divider.fillStyle(0x00e5ff, 0.2);
        divider.fillRect(-200, y, 400, 2);
        return divider;
    };
    
    // --- All-Time P-Value Card ---
    const pValueCard = this.statsTracker.createStatCard(0, yPos, 'All-Time P-Value', stats.pValue.toFixed(3), 'Lower is better!');
    yPos += 80; // Space after card
    const pValueExplainerText = 'The lower your all-time p-value, the less likely your results are random. You’re proving your intuition is real! \n\nScientists often use 0.05 (5%) as a cutoff: if the p-value is below 0.05, they call the result “statistically significant.”';
    
    const panelWidth = this.scene.sys.game.config.width * 0.95;
    const textWidth = panelWidth * 0.8;
    const explainerText = this.scene.add.text(0, yPos, pValueExplainerText, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#c9c9c9',
      align: 'center',
      wordWrap: { width: textWidth, useAdvancedWrap: true },
      lineSpacing: 6
    }).setOrigin(0.5, 0);
    yPos += explainerText.height + 40; // Space after text
    
    // --- Achievements Section ---
    const achievementsTitle = this.scene.add.text(0, yPos, 'Achievements', {
      fontFamily: 'Arial, sans-serif', fontSize: '28px', color: '#00e5ff', fontStyle: 'bold'
    }).setOrigin(0.5);
    yPos += 50;
    this.profileAchievementsContainer = this.scene.add.container(0, yPos);
    this.updateAchievements();
    const achievementsHeight = this.profileAchievementsContainer.getBounds().height;
    yPos += achievementsHeight + 50;
    const achievementsDivider = createDivider(yPos);
    yPos += 50;
    
    // --- Coherence Practice Section ---
    const breathingTitle = this.scene.add.text(0, yPos, 'Coherence Practice', {
      fontFamily: 'Arial, sans-serif', fontSize: '28px', color: '#00e5ff', fontStyle: 'bold'
    }).setOrigin(0.5);
    yPos += 50;
    const breathingText = `Sessions Completed: ${stats.breathingSessionsCompleted || 0}\nDaily Streak: ${stats.dailyBreathingStreak || 0} days`;
    const breathingStatsText = this.scene.add.text(0, yPos, breathingText, {
      fontFamily: 'Arial, sans-serif', fontSize: '22px', color: '#c9c9c9', align: 'center', lineHeight: '32px'
    }).setOrigin(0.5, 0);
    yPos += breathingStatsText.height + 50;
    const breathingDivider = createDivider(yPos);
    yPos += 50;
    // --- Session vs All-Time Section ---
    const sessionDurationMins = Math.floor(sessionStats.sessionDuration / 60000);
    const sessionTitle = this.scene.add.text(0, yPos, 'Session vs All-Time', {
      fontFamily: 'Arial, sans-serif', fontSize: '28px', color: '#00e5ff', fontStyle: 'bold'
    }).setOrigin(0.5);
    yPos += 50;
    const sessionText = `Session: ${sessionStats.sessionRolls} rolls, ${sessionStats.sessionAccuracy.toFixed(1)}% accuracy
All-Time: ${stats.totalRolls} rolls, ${stats.accuracy.toFixed(1)}% accuracy
Session Duration: ${sessionDurationMins}m`;
    const sessionStatsText = this.scene.add.text(0, yPos, sessionText, {
      fontFamily: 'Arial, sans-serif', fontSize: '22px', color: '#c9c9c9', align: 'center', lineHeight: '32px'
    }).setOrigin(0.5, 0);
    yPos += sessionStatsText.height + 50;
    const sessionDivider = createDivider(yPos);
    yPos += 50;
    // --- Recent Predictions Section ---
    const graphTitle = this.scene.add.text(0, yPos, 'Recent Predictions', {
      fontFamily: 'Arial, sans-serif', fontSize: '28px', color: '#00e5ff', fontStyle: 'bold'
    }).setOrigin(0.5);
    yPos += 80;
    this.profileGraphContainer = this.scene.add.container(0, yPos);
    this.updatePredictionGraph(stats.recentPredictions);
    yPos += 180;
    const graphDivider = createDivider(yPos);
    yPos += 50;
    
    // --- Quantum Score Section ---
    const quantumScoreTitle = this.scene.add.text(0, yPos, 'Quantum Score Evolution', {
      fontFamily: 'Arial, sans-serif', fontSize: '28px', color: '#00e5ff', fontStyle: 'bold'
    }).setOrigin(0.5);
    yPos += 80;
    this.quantumScoreContainer = this.scene.add.container(0, yPos);
    this.updateQuantumScoreGraph(this.statsTracker.getQuantumScoreHistory());
    yPos += 200;
    
    // Quantum Score Explainer
    const quantumExplainerText = 'Your Quantum Score combines accuracy, statistical significance (p-value), streak performance, and coherence practice into a single metric that represents your overall psychic development. It evolves as you practice and improve your abilities.';
    const quantumExplainer = this.scene.add.text(0, yPos, quantumExplainerText, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#c9c9c9',
      align: 'center',
      wordWrap: { width: textWidth, useAdvancedWrap: true },
      lineSpacing: 6
    }).setOrigin(0.5, 0);
    yPos += quantumExplainer.height + 40;
    
    const quantumDivider = createDivider(yPos);
    yPos += 50;
    // --- Breathing Boost Chart ---
    const boostTitle = this.scene.add.text(0, yPos, 'Breathing Boost Analysis', {
        fontFamily: 'Arial, sans-serif', fontSize: '28px', color: '#00e5ff', fontStyle: 'bold'
    }).setOrigin(0.5);
    yPos += 90;
    this.breathingBoostContainer = this.scene.add.container(0, yPos);
    this.createBreathingBoostChart(this.statsTracker.getStats().recentBreathingSessions);
    yPos += 200; // Space for the chart
    const boostDivider = createDivider(yPos);
    yPos += 50;
    // --- Reset Session Button ---
    const resetSessionButton = this.createProfileButton(0, yPos, 'Reset Session', () => {
      this.statsTracker.resetSession();
      this.updateProfilePanel();
      this.scene.playSound('button_ambience');
    });
    yPos += 80;
    contentContainer.add([
      pValueCard, explainerText, achievementsTitle, this.profileAchievementsContainer, achievementsDivider,
      breathingTitle, breathingStatsText, breathingDivider,
      sessionTitle, sessionStatsText, sessionDivider,
      graphTitle, this.profileGraphContainer, graphDivider,
      quantumScoreTitle, this.quantumScoreContainer, quantumExplainer, quantumDivider,
      boostTitle, this.breathingBoostContainer, boostDivider,
      resetSessionButton
    ]);
    const { width, height } = this.scene.sys.game.config;
    const panelHeight = height * 0.9;
    const maskYOffset = 180;
    const maskHeight = panelHeight - maskYOffset;
    const totalContentHeight = yPos + 80; // Adjusted padding for better fit
    const mask = this.scene.make.graphics();
    mask.fillStyle(0xffffff);
    mask.fillRect(
        this.profileContainer.x - width / 2, 
        this.profileContainer.y - (panelHeight / 2) + maskYOffset, 
        width, 
        maskHeight
    );
    contentContainer.mask = new Phaser.Display.Masks.GeometryMask(this.scene, mask);
    
    if (totalContentHeight > maskHeight) {
        // Scrolling for both wheel and touch
        const panelWidth = this.scene.sys.game.config.width * 0.95;
        const scrollZoneY = -panelHeight / 2 + maskYOffset + maskHeight / 2;
        // The scroll zone is added to the main profile container, not the content, so it doesn't overlap buttons.
        const scrollZone = this.scene.add.zone(0, scrollZoneY, panelWidth, maskHeight).setInteractive({ draggable: true });
        
        let startY = 0;
        let startContentY = 0;
        scrollZone.on('dragstart', (pointer) => {
            startY = pointer.y;
            startContentY = contentContainer.y;
        });
        
        this.profileContainer.add(scrollZone); // Add scroll zone to the main profile container.
        // --- Add Scrollbar ---
        const scrollbarWidth = 8;
        const scrollbarX = (panelWidth / 2) - 20;
        const scrollbarY = -panelHeight / 2 + maskYOffset;
        const scrollbarTrack = this.scene.add.graphics();
        scrollbarTrack.fillStyle(0x2d0b4b, 0.5);
        scrollbarTrack.fillRoundedRect(scrollbarX - scrollbarWidth / 2, scrollbarY, scrollbarWidth, maskHeight, 4);
        
        const thumbHeight = Math.max(30, maskHeight * (maskHeight / totalContentHeight));
        const scrollbarThumb = this.scene.add.graphics();
        scrollbarThumb.fillStyle(0x00e5ff, 0.8);
        scrollbarThumb.fillRoundedRect(scrollbarX - scrollbarWidth / 2, scrollbarY, scrollbarWidth, thumbHeight, 4);
        this.profileContainer.add([scrollbarTrack, scrollbarThumb]);
        const updateScrollbar = () => {
            const scrollableDist = totalContentHeight - maskHeight;
            if (scrollableDist <= 0) return;
            const scrollPercent = contentContainer.y / -scrollableDist;
            const thumbMaxY = maskHeight - thumbHeight;
            scrollbarThumb.y = scrollPercent * thumbMaxY;
        };
        this.profileScrollHandler = (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            let newY = contentContainer.y - deltaY * 0.8;
            newY = Phaser.Math.Clamp(newY, -(totalContentHeight - maskHeight), 0);
            contentContainer.y = newY;
            updateScrollbar();
        };
        // Update drag handler to also update scrollbar
        scrollZone.on('drag', (pointer) => {
            const deltaY = pointer.y - startY;
            let newY = startContentY + deltaY;
            newY = Phaser.Math.Clamp(newY, -(totalContentHeight - maskHeight), 0);
            contentContainer.y = newY;
            updateScrollbar();
        });
        scrollZone.on('pointerdown', (pointer) => {
            // This prevents clicks on the scroll area from passing through to elements behind the panel.
            pointer.event.stopPropagation();
        });
        // Remove existing wheel listener before adding new one to prevent conflicts
        this.wheelEventManager.unregisterHandler('profileScroll');
        
        this.profileScrollHandler = (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            let newY = contentContainer.y - deltaY * 0.8;
            newY = Phaser.Math.Clamp(newY, -(totalContentHeight - maskHeight), 0);
            contentContainer.y = newY;
            updateScrollbar();
        };
        
        this.wheelEventManager.registerHandler('profileScroll', this.profileScrollHandler, this);
    }
  }
  
  createTrendChart(trendData) {
    const container = this.profileTrendContainer;
    container.removeAll(true);
    const chartWidth = 400; // Make chart slightly narrower to give labels more space
    const chartHeight = 150; // Make chart taller for better readability
    // Draw background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.7);
    bg.fillRoundedRect(-chartWidth / 2, -chartHeight / 2, chartWidth, chartHeight, 8);
    container.add(bg);
    // Draw grid lines (horizontal)
    const gridLines = this.scene.add.graphics();
    gridLines.lineStyle(1, 0x444444, 0.5);
    for (let i = 0; i <= 4; i++) {
        const y = -chartHeight / 2 + (i * chartHeight / 4);
        gridLines.moveTo(-chartWidth / 2, y);
        gridLines.lineTo(chartWidth / 2, y);
    }
    gridLines.strokePath();
    container.add(gridLines);
    
    // Add Y-axis labels (percentage markers)
    const yAxisLabels = ['100%', '75%', '50%', '25%', '0%'];
    yAxisLabels.forEach((label, index) => {
        const y = -chartHeight / 2 + (index * chartHeight / 4);
        const yLabel = this.scene.add.text(-chartWidth / 2 - 35, y, label, {
            fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#c9c9c9'
        }).setOrigin(0.5);
        container.add(yLabel);
    });
    
    // Prepare data points
    const points = trendData.map((data, index) => {
        const x = -chartWidth / 2 + (chartWidth / 6) * index;
        const y = (chartHeight / 2) - (data.accuracy / 100 * chartHeight);
        return new Phaser.Math.Vector2(x, y);
    });
    // Draw line
    const line = this.scene.add.graphics();
    line.lineStyle(3, 0x00e5ff, 1);
    line.beginPath();
    line.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        line.lineTo(points[i].x, points[i].y);
    }
    line.strokePath();
    container.add(line);
    // Draw data points and labels
    trendData.forEach((data, index) => {
        const point = points[index];
        
        // Data point circle
        const circle = this.scene.add.graphics();
        circle.fillStyle(0x00e5ff, 1);
        circle.fillCircle(point.x, point.y, 5);
        
        // Day label
        const dayLabel = this.scene.add.text(point.x, chartHeight / 2 + 30, data.label, {
            fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#c9c9c9'
        }).setOrigin(0.5);
        
        container.add([circle, dayLabel]);
    });
  }
  
  updateAchievements() {
    if (this.scrollHandler) {
        this.scene.input.off('wheel', this.scrollHandler);
        this.scrollHandler = null;
    }
    if (this._profileOpen && this.profileAchievementsContainer) {
      this.profileAchievementsContainer.removeAll(true);
    } else if (this.achievementsContainer) {
      this.achievementsContainer.removeAll(true);
    }
    
    const achievements = this.statsTracker.getAllAchievements();
    const unlockedAchievements = achievements.filter(a => a.unlocked);
    
    const container = this._profileOpen ? this.profileAchievementsContainer : this.achievementsContainer;
    if (!container) return;
    const listContainer = this.scene.add.container(0, 0);
    container.add(listContainer);
    let yOffset = 0;
    const badgeHeight = 85;
    const badgeMargin = 12;
    const gameWidth = this.scene.sys.game.config.width;
    const profilePanelWidth = gameWidth * 0.95;
    const badgeWidth = Math.min(480, profilePanelWidth - 60);
    unlockedAchievements.forEach((achievement) => {
      const achievementBg = this.scene.add.graphics();
      achievementBg.fillStyle(0x1a2c3d, 0.9);
      achievementBg.fillRoundedRect(-badgeWidth / 2, yOffset, badgeWidth, badgeHeight, 12);
      achievementBg.lineStyle(2, 0x00e5ff, 0.8);
      achievementBg.strokeRoundedRect(-badgeWidth / 2, yOffset, badgeWidth, badgeHeight, 12);
      const glowBg = this.scene.add.graphics();
      glowBg.fillStyle(0x00e5ff, 0.1);
      glowBg.fillRoundedRect(-badgeWidth / 2 - 2, yOffset - 2, badgeWidth + 4, badgeHeight + 4, 14);
      glowBg.setBlendMode(Phaser.BlendModes.ADD);
      const iconText = this.scene.add.text(-badgeWidth / 2 + 45, yOffset + badgeHeight / 2, achievement.icon, {
        fontFamily: 'Arial, sans-serif', fontSize: '36px'
      }).setOrigin(0.5);
      const textStartX = -badgeWidth / 2 + 95;
      const availableTextWidth = badgeWidth - 115;
      const titleText = this.scene.add.text(textStartX, yOffset + 28, achievement.title, {
        fontFamily: 'Arial, sans-serif', fontSize: '22px', color: '#00e5ff', fontStyle: 'bold',
        wordWrap: { width: availableTextWidth, useAdvancedWrap: true }
      }).setOrigin(0, 0.5);
      const descText = this.scene.add.text(textStartX, yOffset + 55, achievement.description, {
        fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#c9c9c9',
        wordWrap: { width: availableTextWidth, useAdvancedWrap: true }
      }).setOrigin(0, 0.5);
      listContainer.add([glowBg, achievementBg, iconText, titleText, descText]);
      yOffset += badgeHeight + badgeMargin;
    });
    if (unlockedAchievements.length === 0) {
      const noAchievements = this.scene.add.text(0, 20, 'No achievements unlocked yet', {
        fontFamily: 'Arial, sans-serif', fontSize: '20px', color: '#666666'
      }).setOrigin(0.5);
      listContainer.add(noAchievements);
    }
    
    // The profile panel has its own scroll handler. We don't need a separate one for achievements inside it.
    if (!this._profileOpen) {
        const scrollHeight = 100;
        const totalHeight = yOffset;
        const maskGraphics = this.scene.make.graphics();
        maskGraphics.fillStyle(0xffffff);
        maskGraphics.fillRect(container.x - badgeWidth / 2, container.y - scrollHeight / 2, badgeWidth, scrollHeight);
        listContainer.mask = new Phaser.Display.Masks.GeometryMask(this.scene, maskGraphics);
        if (totalHeight > scrollHeight) {
          this.scrollHandler = (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
              const bounds = new Phaser.Geom.Rectangle(container.x - badgeWidth / 2, container.y - scrollHeight / 2, badgeWidth, scrollHeight);
              if (Phaser.Geom.Rectangle.Contains(bounds, pointer.x, pointer.y)) {
                  let newY = listContainer.y - deltaY * 0.5;
                  newY = Phaser.Math.Clamp(newY, -(totalHeight - scrollHeight), 0);
                  listContainer.y = newY;
              }
          };
          // Remove existing wheel listener before adding new one to prevent conflicts
          this.wheelEventManager.unregisterHandler('achievementScroll');
          
          this.scrollHandler = (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
              let newY = listContainer.y - deltaY * 0.5;
              newY = Phaser.Math.Clamp(newY, -(totalHeight - scrollHeight), 0);
              listContainer.y = newY;
          };
          
          this.wheelEventManager.registerHandler('achievementScroll', this.scrollHandler, this);
        }
    }
  }
  
  updatePredictionGraph(recentPredictions) {
    const container = this._profileOpen ? this.profileGraphContainer : this.graphContainer;
    if (!container) return;
    
    container.removeAll(true);
    
    if (!recentPredictions || recentPredictions.length === 0) {
      const noDataText = this.scene.add.text(0, 0, 'No recent predictions yet', {
        fontFamily: 'Arial, sans-serif', fontSize: '20px', color: '#666666'
      }).setOrigin(0.5);
      container.add(noDataText);
      return;
    }
    
    const graphWidth = 420;
    const graphHeight = 120;
    const barWidth = Math.max(3, graphWidth / Math.max(recentPredictions.length, 20));
    
    // Draw background
    const graphBg = this.scene.add.graphics();
    graphBg.fillStyle(0x1a1a2e, 0.7);
    graphBg.fillRoundedRect(-graphWidth/2, -graphHeight/2, graphWidth, graphHeight, 8);
    graphBg.lineStyle(1, 0x444444, 0.8);
    
    // Draw grid lines
    for (let i = 0; i <= 4; i++) {
      const y = -graphHeight/2 + (i * graphHeight / 4);
      graphBg.moveTo(-graphWidth/2, y);
      graphBg.lineTo(graphWidth/2, y);
    }
    graphBg.strokePath();
    
    container.add(graphBg);
    
    // Draw bars
    recentPredictions.forEach((prediction, index) => {
      const x = -graphWidth/2 + (index * barWidth) + (barWidth / 2);
      const barHeight = prediction.isCorrect ? graphHeight * 0.8 : graphHeight * 0.3;
      const y = 0;
      
      const bar = this.scene.add.graphics();
      bar.fillStyle(prediction.isCorrect ? 0x00ff88 : 0xff4444, 0.9);
      bar.fillRoundedRect(x - barWidth/2 + 1, y - barHeight/2, barWidth - 2, barHeight, 3);
      
      container.add(bar);
    });
    
    // Add labels
    const correctCount = recentPredictions.filter(p => p.isCorrect).length;
    const graphLabel = this.scene.add.text(0, graphHeight/2 + 30, 
      `Last ${recentPredictions.length}: ${correctCount} correct (${((correctCount/recentPredictions.length)*100).toFixed(1)}%)`, {
      fontFamily: 'Arial, sans-serif', fontSize: '20px', color: '#c9c9c9'
    }).setOrigin(0.5);
    
    container.add(graphLabel);
  }
  
  showStatsPanel() {
    // Redirect to profile panel instead
    this.toggleProfilePanel();
  }
  updateBadges(shouldAnimate = false) {
    this.achievementManager.updateBadges(shouldAnimate);
  }
  addBadge(achievement, isBreathingAward = false) {
    this.achievementManager.addBadge(achievement, isBreathingAward);
  }
  createBadgeVisual(achievement, index, shouldAnimate) {
    this.achievementManager.createBadgeVisual(achievement, index, shouldAnimate);
  }
  repositionBadges() {
    this.achievementManager.repositionBadges();
  }
  
  repositionBreathingAwards() {
    this.achievementManager.repositionBreathingAwards();
  }
  
  showShieldBreakEffect() {
      const { width, height } = this.scene.sys.game.config;
      // Full screen blocker & flash
      const blocker = this.scene.add.graphics({ fillStyle: { color: 0x0c0114, alpha: 0.8 } });
      blocker.fillRect(0, 0, width, height).setDepth(2400);
      const flash = this.scene.add.graphics({ fillStyle: { color: 0xffff00, alpha: 0.4 } });
      flash.fillRect(0, 0, width, height).setDepth(2401).setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({ targets: flash, alpha: 0, duration: 800, ease: 'Cubic.easeOut' });
      // Main Shield Icon
      const shieldIcon = this.scene.add.text(width / 2, height / 2, '🛡️', {
          fontSize: '200px',
          align: 'center',
          shadow: { color: '#ffff00', blur: 40, stroke: true, fill: true }
      }).setOrigin(0.5).setDepth(2500);
      this.scene.playSound('shield_break');
      this.scene.cameras.main.shake(500, 0.015);
      // Particle explosion for shattering effect
      const emitter = this.scene.add.particles(width / 2, height / 2, 'particle', {
          speed: { min: 400, max: 800 },
          angle: { min: 0, max: 360 },
          scale: { start: 0.8, end: 0 },
          blendMode: 'ADD',
          lifespan: 1000,
          tint: [0xffff00, 0xffaa00, 0xffffff],
          gravityY: 400
      });
      emitter.setDepth(2501).explode(80);
      // Animate the shield breaking
      this.scene.tweens.add({
          targets: shieldIcon,
          scale: 0.1,
          alpha: 0,
          angle: 180,
          duration: 800,
          ease: 'Cubic.easeIn',
          onComplete: () => {
              shieldIcon.destroy();
              blocker.destroy();
              flash.destroy();
              emitter.destroy();
          }
      });
  }
  
  showRewardNotification(title, description, icon) {
      const { width } = this.scene.sys.game.config;
      const container = this.scene.add.container(width / 2, -100);
      container.setDepth(1500);
      const bg = this.scene.add.graphics();
      bg.fillStyle(0x223a4a, 0.95);
      bg.fillRoundedRect(-200, -40, 400, 80, 15);
      bg.lineStyle(3, 0x33aaff, 1);
      bg.strokeRoundedRect(-200, -40, 400, 80, 15);
      const iconText = this.scene.add.text(-170, 0, icon, {
          fontSize: '32px'
      }).setOrigin(0.5);
      const titleText = this.scene.add.text(-140, -10, title, {
          fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#ffffff', fontStyle: 'bold'
      }).setOrigin(0, 0.5);
      const descText = this.scene.add.text(-140, 15, description, {
          fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#c9c9c9', wordWrap: { width: 260 }
      }).setOrigin(0, 0.5);
      container.add([bg, iconText, titleText, descText]);
      this.scene.tweens.add({
          targets: container,
          y: 150,
          duration: 500,
          ease: 'Back.easeOut',
          onComplete: () => {
              this.scene.time.delayedCall(3000, () => {
                  this.scene.tweens.add({
                      targets: container,
                      y: -100,
                      duration: 400,
                      ease: 'Back.easeIn',
                      onComplete: () => container.destroy()
                  });
              });
          }
      });
      this.scene.playSound('button_ambience');
  }
  animateShieldAward(onComplete) {
      const { width, height } = this.scene.sys.game.config;
      // Create a temporary shield icon at the center
      const flyingShield = this.scene.add.image(width / 2, height / 2, 'gold_shield')
          .setScale(0.2) // Start a bit larger
          .setDepth(3000) // Ensure it's on top of everything
          .setAlpha(0);
      // Get destination coordinates from the UI shield container
      const destMatrix = this.shieldContainer.getWorldTransformMatrix();
      const destX = destMatrix.tx;
      const destY = destMatrix.ty;
      // Particle emitter to follow the shield
      const trailEmitter = this.scene.add.particles(0, 0, 'particle', {
          speed: 100,
          scale: { start: 0.2, end: 0 },
          blendMode: 'ADD',
          lifespan: 300,
          tint: [0xffff00, 0xffd700]
      });
      trailEmitter.startFollow(flyingShield);
      trailEmitter.setDepth(2999);
      
      this.scene.tweens.add({
          targets: flyingShield,
          alpha: 1,
          scale: 0.3,
          duration: 300,
          ease: 'Back.easeOut',
          onComplete: () => {
              this.scene.tweens.add({
                  targets: flyingShield,
                  x: destX,
                  y: destY,
                  scale: 0.12, // End at the same scale as the UI icon
                  duration: 1000,
                  ease: 'Cubic.easeIn',
                  onComplete: () => {
                      flyingShield.destroy();
                      trailEmitter.destroy();
                      
                      const popEmitter = this.scene.add.particles(destX, destY, 'particle', {
                          speed: { min: 50, max: 150 },
                          scale: { start: 0.3, end: 0 },
                          blendMode: 'ADD',
                          lifespan: 500,
                          tint: [0xffff00, 0xffffff],
                      });
                      popEmitter.explode(15);
                      this.scene.time.delayedCall(1000, () => popEmitter.destroy());
                      
                      this.scene.tweens.add({
                          targets: this.shieldContainer,
                          scale: { from: 1.2, to: 1 },
                          duration: 400,
                          ease: 'Bounce.easeOut'
                      });
                      
                      if (onComplete) {
                          onComplete();
                      }
                  }
              });
          }
      });
}
  generateShareableImage(onComplete = null) {
    let rt = null;
    try {
      const { width, height } = this.scene.sys.game.config;
      const stats = this.statsTracker.getStats();
      const playerData = JSON.parse(localStorage.getItem('divineSensePlayer') || '{}');
      const levelMap = ['🌱 NOVICE', '🌸 APPRENTICE', '⚡ ADEPT', '👑 MASTER', '✨ TRANSCENDENT'];
      const imgWidth = 900;  // 9:16 aspect ratio
      const imgHeight = 1600;
      rt = this.scene.add.renderTexture(0, 0, imgWidth, imgHeight).setVisible(false);
      rt.clear();
      
      // --- Background and Border ---
      const bg = this.scene.add.graphics();
      // Gradient background - manual gradient using an off-screen canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = imgWidth;
      tempCanvas.height = imgHeight;
      const tempCtx = tempCanvas.getContext('2d');
      const gradient = tempCtx.createLinearGradient(0, 0, 0, imgHeight);
      gradient.addColorStop(0, '#1a0033');
      gradient.addColorStop(1, '#330066');
      tempCtx.fillStyle = gradient;
      tempCtx.fillRect(0, 0, imgWidth, imgHeight);
      const tempTextureKey = `temp_gradient_${Date.now()}`;
      this.scene.textures.addCanvas(tempTextureKey, tempCanvas);
      const gradientImage = this.scene.add.image(0, 0, tempTextureKey).setOrigin(0,0);
      rt.draw(gradientImage);
      gradientImage.destroy();
      this.scene.textures.remove(tempTextureKey);
      // No need to remove from pool as it wasn't created from there
      // Starfield
      const stars = this.scene.add.graphics();
      for (let i = 0; i < 100; i++) {
          const x = Math.random() * imgWidth;
          const y = Math.random() * imgHeight;
          const radius = Math.random() * 1.5;
          const alpha = Math.random() * 0.7;
          stars.fillStyle(0xffffff, alpha);
          stars.fillCircle(x, y, radius);
      }
      rt.draw(stars);
      stars.destroy();
      // Outer border glow
      const borderGlow = this.scene.add.graphics();
      borderGlow.lineStyle(10, 0x8a2be2, 0.3);
      borderGlow.strokeRoundedRect(5, 5, imgWidth - 10, imgHeight - 10, 15);
      borderGlow.setBlendMode(Phaser.BlendModes.ADD);
      rt.draw(borderGlow);
      borderGlow.destroy();
      
      // Inner border
      const border = this.scene.add.graphics();
      border.lineStyle(2, 0x00e5ff, 1);
      border.strokeRoundedRect(10, 10, imgWidth - 20, imgHeight - 20, 10);
      rt.draw(border);
      bg.destroy();
      border.destroy();
      // --- Header ---
      const title = this.scene.add.text(imgWidth / 2, 80, 'Divine Sense Training', {
          fontFamily: '"Cormorant Garamond", serif', fontSize: '48px', color: '#00e5ff', fontStyle: 'bold',
          shadow: { color: '#00e5ff', blur: 20, stroke: true, fill: true }
      }).setOrigin(0.5);
      rt.draw(title);
      title.destroy();
      
      // --- Player Avatar Section ---
      let avatarY = 180;
      
      // Add player avatar if available
      if (playerData.avatar) {
        try {
          // Create a temporary image element to load the avatar
          const avatarImg = new Image();
          avatarImg.crossOrigin = 'anonymous';
          
          // Create avatar synchronously using a canvas approach
          const avatarCanvas = document.createElement('canvas');
          const avatarSize = 120;
          avatarCanvas.width = avatarSize;
          avatarCanvas.height = avatarSize;
          const avatarCtx = avatarCanvas.getContext('2d');
          
          // Create circular clipping path
          avatarCtx.beginPath();
          avatarCtx.arc(avatarSize / 2, avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
          avatarCtx.clip();
          
          // Try to load and draw the avatar
          const tempAvatarKey = `temp_avatar_${Date.now()}`;
          
          // For now, create a placeholder avatar circle with player initials
          const initials = (playerData.name || 'A').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
          
          // Draw background circle
          avatarCtx.fillStyle = '#1a2c3d';
          avatarCtx.fillRect(0, 0, avatarSize, avatarSize);
          
          // Add border effect
          avatarCtx.strokeStyle = '#00e5ff';
          avatarCtx.lineWidth = 4;
          avatarCtx.beginPath();
          avatarCtx.arc(avatarSize / 2, avatarSize / 2, avatarSize / 2 - 2, 0, Math.PI * 2);
          avatarCtx.stroke();
          
          // Draw initials as fallback
          avatarCtx.fillStyle = '#00e5ff';
          avatarCtx.font = 'bold 40px Arial';
          avatarCtx.textAlign = 'center';
          avatarCtx.textBaseline = 'middle';
          avatarCtx.fillText(initials, avatarSize / 2, avatarSize / 2);
          
          // Add the avatar canvas as a texture
          this.scene.textures.addCanvas(tempAvatarKey, avatarCanvas);
          const avatarImage = this.scene.add.image(imgWidth / 2, avatarY, tempAvatarKey).setOrigin(0.5);
          
          // Add glow effect around avatar
          const avatarGlow = this.scene.add.graphics();
          avatarGlow.fillStyle(0x00e5ff, 0.3);
          avatarGlow.fillCircle(imgWidth / 2, avatarY, avatarSize / 2 + 8);
          avatarGlow.setBlendMode(Phaser.BlendModes.ADD);
          rt.draw(avatarGlow);
          rt.draw(avatarImage);
          
          avatarGlow.destroy();
          avatarImage.destroy();
          this.scene.textures.remove(tempAvatarKey);
          
          avatarY += 100; // Increased spacing below avatar
        } catch (avatarError) {
          console.warn('Could not load avatar for stats image:', avatarError);
          // Continue without avatar
        }
      }
      
      // --- Player Info (adjusted position) ---
      const playerName = this.scene.add.text(imgWidth / 2, avatarY, playerData.name || 'Anonymous Mystic', {
          fontFamily: '"Nunito", sans-serif', fontSize: '32px', color: '#ffffff', fontStyle: 'bold'
      }).setOrigin(0.5);
      const playerLevel = this.scene.add.text(imgWidth / 2, avatarY + 50, levelMap[stats.psychicLevel - 1], {
          fontFamily: '"Nunito", sans-serif', fontSize: '22px', color: '#c9c9c9', fontStyle: 'bold'
      }).setOrigin(0.5);
      rt.draw(playerName);
      rt.draw(playerLevel);
      playerName.destroy();
      playerLevel.destroy();
      
      // --- Key Stat Cards (adjusted for higher resolution) ---
      const createStatCard = (x, y, value, label, cardWidth = 300, cardHeight = 140) => {
        const card = this.scene.add.container(x, y);
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x1a2c3d, 0.6);
        bg.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 20);
        bg.lineStyle(2, 0x00bfff, 0.7);
        bg.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 20);
        const valText = this.scene.add.text(0, -20, value, { fontFamily: '"Nunito", sans-serif', fontSize: '42px', color: '#00e5ff', fontStyle: 'bold' }).setOrigin(0.5);
        const labText = this.scene.add.text(0, 30, label, { fontFamily: '"Nunito", sans-serif', fontSize: '18px', color: '#d3d3d3' }).setOrigin(0.5);
        card.add([bg, valText, labText]);
        rt.draw(card);
        card.destroy();
      };
      
      const statCardsY = avatarY + 140;
      createStatCard(225, statCardsY, `${stats.accuracy.toFixed(1)}%`, 'Accuracy');
      createStatCard(675, statCardsY, stats.bestStreak.toString(), 'Best Streak');
      createStatCard(225, statCardsY + 200, stats.totalRolls.toString(), 'Total Rolls');
      createStatCard(675, statCardsY + 200, stats.pValue.toFixed(3), 'P-Value');
      // --- Mindfulness Practice Section (adjusted positioning) ---
      const mindfulnessY = statCardsY + 320;
      const mindfulnessTitle = this.scene.add.text(imgWidth / 2, mindfulnessY, 'Mindfulness Practice', {
          fontFamily: '"Cormorant Garamond", serif', fontSize: '32px', color: '#00e5ff', fontStyle: 'bold'
      }).setOrigin(0.5);
      rt.draw(mindfulnessTitle);
      mindfulnessTitle.destroy();
      
      const mindfulnessText = `Sessions: ${stats.breathingSessionsCompleted || 0} • Daily Streak: ${stats.dailyBreathingStreak || 0} days`;
      const mindfulnessStats = this.scene.add.text(imgWidth / 2, mindfulnessY + 40, mindfulnessText, {
          fontFamily: '"Nunito", sans-serif', fontSize: '20px', color: '#c9c9c9'
      }).setOrigin(0.5);
      rt.draw(mindfulnessStats);
      mindfulnessStats.destroy();
      
      // --- Achievements ---
      
      // --- Achievements ---
      const achievementY = mindfulnessY + 130;
      const achievementTitle = this.scene.add.text(imgWidth / 2, achievementY, 'Achievements', {
          fontFamily: '"Cormorant Garamond", serif', fontSize: '32px', color: '#00e5ff', fontStyle: 'bold'
      }).setOrigin(0.5);
      rt.draw(achievementTitle);
      achievementTitle.destroy();
      const achievements = this.statsTracker.getAllAchievements().filter(a => a.unlocked);
      const maxBadges = 6; // Show more badges with higher resolution
      const badgeSize = 60; // Larger badges
      const badgePadding = 30; // Increased padding between badges
      const totalBadgeWidth = Math.min(maxBadges * (badgeSize + badgePadding) - badgePadding, imgWidth - 120);
      const actualBadges = Math.min(maxBadges, achievements.length);
      const badgeStartX = (imgWidth - (actualBadges * (badgeSize + badgePadding) - badgePadding)) / 2 + badgeSize / 2;
      
      achievements.slice(0, maxBadges).forEach((ach, i) => {
          const x = badgeStartX + i * (badgeSize + badgePadding);
          const y = achievementY + 80;
          
          // Add glow effect
          const badgeGlow = this.scene.add.graphics().fillStyle(0x00e5ff, 0.2).fillCircle(0, 0, badgeSize / 2 + 5);
          badgeGlow.setBlendMode(Phaser.BlendModes.ADD);
          
          const badgeBG = this.scene.add.graphics().fillStyle(0x1a2c3d, 0.9).fillCircle(0, 0, badgeSize / 2);
          const badgeBorder = this.scene.add.graphics().lineStyle(3, 0x00e5ff, 0.8).strokeCircle(0, 0, badgeSize / 2);
          const badgeIcon = this.scene.add.text(0, 0, ach.icon, { fontSize: '32px' }).setOrigin(0.5);
          const badgeContainer = this.scene.add.container(x, y, [badgeGlow, badgeBG, badgeBorder, badgeIcon]);
          rt.draw(badgeContainer);
          badgeContainer.destroy();
      });
      // --- 7-Day Trend Chart (adjusted positioning) ---
      const trendY = achievementY + 200;
      const trendTitle = this.scene.add.text(imgWidth / 2, trendY, '7-Day Accuracy Trend', {
          fontFamily: '"Cormorant Garamond", serif', fontSize: '32px', color: '#00e5ff', fontStyle: 'bold'
      }).setOrigin(0.5);
      rt.draw(trendTitle);
      trendTitle.destroy();
      
      const trendData = this.statsTracker.getTrendStats();
      const chartContainer = this.scene.add.container(imgWidth / 2, trendY + 120);
      this.createShareableTrendChart(chartContainer, trendData, 720, 200); // Larger chart with more space
      rt.draw(chartContainer);
      chartContainer.destroy();
      
      // --- Footer ---
      const footerText = this.scene.add.text(imgWidth / 2, imgHeight - 60, 'Made with Rosebud AI', {
          fontFamily: '"Nunito", sans-serif', fontSize: '16px', color: '#8a2be2', fontStyle: 'italic'
      }).setOrigin(0.5);
      rt.draw(footerText);
      footerText.destroy();
      
      rt.saveTexture('shareableStats');
      
      // Add a longer delay and better checks to ensure rendering is complete
      this.scene.time.delayedCall(200, () => {
        try {
          // Multiple checks to ensure render texture is ready
          if (!rt || rt.destroyed) {
            console.error('Render texture destroyed or invalid');
            this.showRewardNotification('Error!', 'Failed to generate stats image. Please try again.', '❌');
            if (onComplete) onComplete();
            return;
          }
          // Try to access canvas with fallback
          let canvas = null;
          if (rt.canvas) {
            canvas = rt.canvas;
          } else if (rt.texture && rt.texture.source && rt.texture.source[0]) {
            canvas = rt.texture.source[0].source;
          } else if (rt.renderer && rt.renderer.gl) {
            // For WebGL, we might need to use a different approach
            console.warn('WebGL render texture detected, using alternative method');
            this.downloadStatsViaDataURL(rt, onComplete);
            return;
          }
          if (!canvas) {
            console.error('Render texture canvas not available after checks');
            this.showRewardNotification('Error!', 'Failed to generate stats image. Please try again.', '❌');
            if (rt) rt.destroy();
            if (onComplete) onComplete();
            return;
          }
          
          // Check if canvas has toBlob method, if not use dataURL fallback
          if (typeof canvas.toBlob === 'function') {
            canvas.toBlob((blob) => {
              if (!blob) {
                this.showRewardNotification('Error!', 'Failed to generate stats image. Please try again.', '❌');
                if (rt) rt.destroy();
                if (onComplete) onComplete(); // Ensure button is re-enabled
                return;
              }
              
              // Define a cleanup function to be called after success or failure
              const finalCleanup = () => {
                if (rt) rt.destroy();
                if (onComplete) onComplete();
              };
              // Try clipboard first (modern browsers with HTTPS)
              if (navigator.clipboard && navigator.clipboard.write) {
                try {
                  const item = new ClipboardItem({ 'image/png': blob });
                  navigator.clipboard.write([item]).then(() => {
                    this.showRewardNotification('Stats Copied!', 'Your stats graphic has been copied to your clipboard.', '📋');
                    finalCleanup();
                  }).catch(err => {
                    console.log('Clipboard failed, trying download fallback:', err);
                    this.downloadStatsImage(blob, finalCleanup);
                  });
                } catch (clipboardErr) {
                  console.log('ClipboardItem not supported, trying download fallback:', clipboardErr);
                  this.downloadStatsImage(blob, finalCleanup);
                }
              } else {
                // Clipboard API not available, go straight to download
                console.log('Clipboard API not available, using download fallback');
                this.downloadStatsImage(blob, finalCleanup);
              }
            }, 'image/png');
          } else {
            // toBlob not available, use dataURL method
            console.log('canvas.toBlob not available, using dataURL fallback');
            this.downloadStatsViaDataURL(rt, onComplete);
          }
        } catch (blobErr) {
          console.error('Failed to create blob:', blobErr);
          this.showRewardNotification('Error!', 'Failed to create stats image. Please try again.', '❌');
          if (rt) rt.destroy();
          if (onComplete) onComplete();
        }
      });
      
    } catch (error) {
      console.error('Error in generateShareableImage:', error);
      this.showRewardNotification('Error!', 'Something went wrong generating your stats. Please try again.', '❌');
      // Clean up render texture if it exists
      if (rt) {
        rt.destroy();
      }
      if (onComplete) onComplete();
    }
  }
  
  downloadStatsViaDataURL(rt, onComplete) {
    try {
      // Check if render texture and canvas are available
      if (!rt || rt.destroyed) {
        console.error('Render texture is null or destroyed');
        this.showRewardNotification('Error!', 'Failed to generate stats image. Please try again.', '❌');
        if (onComplete) onComplete();
        return;
      }
      // Try multiple ways to access the canvas and ensure it has toDataURL method
      let canvas = null;
      let dataURL = null;
      // Method 1: Direct canvas access
      if (rt.canvas && typeof rt.canvas.toDataURL === 'function') {
        canvas = rt.canvas;
        try {
          dataURL = canvas.toDataURL('image/png');
        } catch (e) {
          console.warn('Failed to get dataURL from direct canvas:', e);
          canvas = null;
        }
      }
      // Method 2: Through texture source
      else if (rt.texture && rt.texture.source && rt.texture.source[0]) {
        const source = rt.texture.source[0];
        if (source.source && typeof source.source.toDataURL === 'function') {
          canvas = source.source;
          try {
            dataURL = canvas.toDataURL('image/png');
          } catch (e) {
            console.warn('Failed to get dataURL from texture source:', e);
            canvas = null;
          }
        }
        // Method 3: Try to get canvas from WebGL texture
        else if (source.glTexture && this.scene.sys.game.renderer.gl) {
          console.log('Attempting WebGL texture data extraction');
          try {
            // Create a temporary canvas to extract the WebGL texture data
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = rt.width;
            tempCanvas.height = rt.height;
            const tempCtx = tempCanvas.getContext('2d');
            
            // Verify we have a valid context and canvas
            if (tempCtx && typeof tempCanvas.toDataURL === 'function') {
              // Try to get pixel data from the render texture
              const gl = this.scene.sys.game.renderer.gl;
              const fb = gl.createFramebuffer();
              gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
              gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, source.glTexture, 0);
              
              if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) {
                const pixels = new Uint8Array(rt.width * rt.height * 4);
                gl.readPixels(0, 0, rt.width, rt.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                
                // Create ImageData and put it on canvas
                const imageData = tempCtx.createImageData(rt.width, rt.height);
                imageData.data.set(pixels);
                tempCtx.putImageData(imageData, 0, 0);
                
                dataURL = tempCanvas.toDataURL('image/png');
                canvas = tempCanvas; // Set canvas for cleanup
              }
              
              gl.bindFramebuffer(gl.FRAMEBUFFER, null);
              gl.deleteFramebuffer(fb);
            }
          } catch (webglError) {
            console.error('WebGL texture extraction failed:', webglError);
          }
        }
      }
      // Final validation before proceeding
      if (!dataURL || typeof dataURL !== 'string' || !dataURL.startsWith('data:image/')) {
        console.error('No valid dataURL generated from render texture');
        this.showRewardNotification('Error!', 'Failed to generate stats image. Your browser may not support this feature.', '❌');
        if (rt) rt.destroy();
        if (onComplete) onComplete();
        return;
      }
      
      const blob = this.dataURLToBlob(dataURL);
      
      if (!blob) {
        this.showRewardNotification('Error!', 'Failed to generate stats image. Please try again.', '❌');
        if (rt) rt.destroy();
        if (onComplete) onComplete();
        return;
      }
      
      this.downloadStatsImage(blob, () => {
        if (rt) rt.destroy();
        if (onComplete) onComplete();
      });
      
    } catch (error) {
      console.error('Failed to generate image via dataURL:', error);
      this.showRewardNotification('Error!', 'Failed to generate stats image. Please try again.', '❌');
      if (rt) rt.destroy();
      if (onComplete) onComplete();
    }
  }
  
  dataURLToBlob(dataURL) {
    try {
      const arr = dataURL.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    } catch (error) {
      console.error('Failed to convert dataURL to blob:', error);
      return null;
    }
  }
  
  downloadStatsImage(blob, onComplete) {
    try {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `divine_sense_stats_${Date.now()}.png`;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      
      this.showRewardNotification('Stats Downloaded!', 'Your stats graphic has been downloaded to your device.', '📥');
      
    } catch (downloadErr) {
      console.error('Failed to download image:', downloadErr);
      this.showRewardNotification('Download Failed!', 'Unable to download stats image. Please try again or check your browser settings.', '❌');
    } finally {
        if (onComplete) {
            onComplete();
        }
    }
  }
  createShareableTrendChart(container, trendData, chartWidth, chartHeight) {
    const bg = this.scene.add.graphics().fillStyle(0x1a2c3d, 0.6).fillRoundedRect(-chartWidth / 2, -chartHeight / 2, chartWidth, chartHeight, 20);
    bg.lineStyle(2, 0x00bfff, 0.7);
    bg.strokeRoundedRect(-chartWidth / 2, -chartHeight / 2, chartWidth, chartHeight, 20);
    container.add(bg);
    
    // Add Y-axis labels for shareable chart (larger text for higher resolution)
    const yAxisLabels = ['100%', '50%', '0%'];
    yAxisLabels.forEach((label, index) => {
        const y = -chartHeight / 2 + (index * chartHeight / 2);
        const yLabel = this.scene.add.text(-chartWidth / 2 - 35, y, label, {
            fontFamily: '"Nunito", sans-serif', fontSize: '14px', color: '#c9c9c9', fontStyle: 'bold'
        }).setOrigin(0.5);
        container.add(yLabel);
    });
    
    if (!trendData || trendData.length === 0) return;
    const points = trendData.map((data, index) => {
        const x = -chartWidth / 2 + (chartWidth / (trendData.length - 1)) * index;
        const y = (chartHeight / 2) - Phaser.Math.Clamp(data.accuracy / 100, 0, 1) * chartHeight;
        return new Phaser.Math.Vector2(x, y);
    });
    const line = this.scene.add.graphics();
    line.lineStyle(3, 0x00e5ff, 1);
    line.beginPath();
    line.moveTo(points[0].x, points[0].y);
    const fillPath = [new Phaser.Math.Vector2(points[0].x, chartHeight / 2)];
    for (let i = 0; i < points.length; i++) {
        if(i > 0) line.lineTo(points[i].x, points[i].y);
        fillPath.push(points[i]);
    }
    fillPath.push(new Phaser.Math.Vector2(points[points.length - 1].x, chartHeight / 2));
    line.strokePath();
    const fill = this.scene.add.graphics();
    fill.fillStyle(0x00e5ff, 0.2);
    fill.fillPoints(fillPath, true);
    container.add(line);
    container.add(fill);
    points.forEach((point, index) => {
        const circle = this.scene.add.graphics().fillStyle(0x00e5ff, 1).fillCircle(point.x, point.y, 6); // Larger points
        const circleGlow = this.scene.add.graphics().fillStyle(0x00e5ff, 0.5).fillCircle(point.x, point.y, 12);
        circleGlow.setBlendMode(Phaser.BlendModes.ADD);
        container.add(circleGlow);
        container.add(circle);
        const dayLabel = this.scene.add.text(point.x, chartHeight / 2 + 25, trendData[index].label, { 
            fontFamily: '"Nunito", sans-serif', fontSize: '16px', color: '#c9c9c9', fontStyle: 'bold' 
        }).setOrigin(0.5);
        container.add(dayLabel);
    });
  }
  copyStatToClipboard(statName, statValue) {
    navigator.clipboard.writeText(statValue).then(() => {
        this.showRewardNotification(
            `${statName} Copied!`,
            `Value: ${statValue}`,
            '📋'
        );
        this.scene.playSound('button_ambience');
    }).catch(err => {
        console.error('Failed to copy stat: ', err);
        this.showRewardNotification(
            'Copy Failed',
            `Could not copy to clipboard.`,
            '❌'
        );
    });
  }
  updateCoherenceMeter(progress, isExercising) {
    this.statsDisplay.updateCoherenceMeter(progress, isExercising);
  }
  createBreathingBoostChart(sessionData) {
    const container = this.breathingBoostContainer;
    container.removeAll(true);
    const chartWidth = 400;
    const chartHeight = 150;
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.7);
    bg.fillRoundedRect(-chartWidth / 2, -chartHeight / 2, chartWidth, chartHeight, 8);
    container.add(bg);
    const gridLines = this.scene.add.graphics();
    gridLines.lineStyle(1, 0x444444, 0.5);
    for (let i = 0; i <= 4; i++) {
        const y = -chartHeight / 2 + (i * chartHeight / 4);
        gridLines.moveTo(-chartWidth / 2, y);
        gridLines.lineTo(chartWidth / 2, y);
    }
    gridLines.strokePath();
    container.add(gridLines);
    if (!sessionData || sessionData.length === 0) {
      const noDataText = this.scene.add.text(0, 0, 'Complete breathing sessions to see your boost!', {
        fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#666', align: 'center', wordWrap: { width: chartWidth - 20 }
      }).setOrigin(0.5);
      container.add(noDataText);
      return;
    }
    const recentSessions = sessionData.slice(-5); // Show last 5 sessions
    const barWidth = 40;
    const spacing = (chartWidth - (recentSessions.length * barWidth)) / (recentSessions.length + 1);
    recentSessions.forEach((session, index) => {
      if (session.preAccuracy === undefined || session.postAccuracy === undefined) return;
      const x = -chartWidth / 2 + spacing + (index * (barWidth + spacing)) + barWidth / 2;
      // Pre-breathing bar
      const preHeight = (session.preAccuracy / 100) * chartHeight;
      const preBar = this.scene.add.graphics();
      preBar.fillStyle(0x8a2be2, 0.7);
      preBar.fillRect(x - barWidth / 2, chartHeight / 2 - preHeight, barWidth / 2, preHeight);
      container.add(preBar);
      // Post-breathing bar
      const postHeight = (session.postAccuracy / 100) * chartHeight;
      const postBar = this.scene.add.graphics();
      postBar.fillStyle(0x00e5ff, 0.9);
      postBar.fillRect(x, chartHeight / 2 - postHeight, barWidth / 2, postHeight);
      container.add(postBar);
      // Boost indicator
      const boost = session.postAccuracy - session.preAccuracy;
      if (boost > 0) {
        const boostText = this.scene.add.text(x, chartHeight / 2 - postHeight - 10, `+${boost.toFixed(1)}%`, {
          fontSize: '12px', color: '#00ff88', fontStyle: 'bold'
        }).setOrigin(0.5);
        container.add(boostText);
      }
    });
    const legendY = chartHeight / 2 + 30;
    const preLegend = this.scene.add.graphics().fillStyle(0x8a2be2, 0.7).fillRect(-70, legendY - 5, 10, 10);
    const preText = this.scene.add.text(-55, legendY, 'Pre-Coherence', { fontSize: '14px', color: '#c9c9c9' }).setOrigin(0, 0.5);
    const postLegend = this.scene.add.graphics().fillStyle(0x00e5ff, 0.9).fillRect(60, legendY - 5, 10, 10);
    const postText = this.scene.add.text(75, legendY, 'Post-Coherence', { fontSize: '14px', color: '#c9c9c9' }).setOrigin(0, 0.5);
    container.add([preLegend, preText, postLegend, postText]);
  }
  
  updateQuantumScoreGraph(scoreHistory) {
    if (!this.quantumScoreContainer) return;
    
    const container = this.quantumScoreContainer;
    container.removeAll(true);
    
    const chartWidth = 420;
    const chartHeight = 150;
    
    // Draw background with enhanced styling
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.8);
    bg.fillRoundedRect(-chartWidth / 2, -chartHeight / 2, chartWidth, chartHeight, 12);
    bg.lineStyle(2, 0x8a2be2, 0.6);
    bg.strokeRoundedRect(-chartWidth / 2, -chartHeight / 2, chartWidth, chartHeight, 12);
    container.add(bg);
    
    if (!scoreHistory || scoreHistory.length === 0) {
      const noDataText = this.scene.add.text(0, 0, 'Complete predictions to unlock your\nQuantum Score evolution chart!', {
        fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#8a2be2', align: 'center', 
        wordWrap: { width: chartWidth - 40 }, lineSpacing: 8
      }).setOrigin(0.5);
      container.add(noDataText);
      return;
    }
    
    // Draw grid lines
    const gridLines = this.scene.add.graphics();
    gridLines.lineStyle(1, 0x444444, 0.3);
    for (let i = 0; i <= 4; i++) {
      const y = -chartHeight / 2 + (i * chartHeight / 4);
      gridLines.moveTo(-chartWidth / 2 + 10, y);
      gridLines.lineTo(chartWidth / 2 - 10, y);
    }
    gridLines.strokePath();
    container.add(gridLines);
    
    // Get max score for scaling with better range handling
    const maxScore = Math.max(...scoreHistory.map(entry => entry.score), 100);
    const minScore = Math.min(...scoreHistory.map(entry => entry.score), 0);
    const scoreRange = Math.max(maxScore - minScore, 20); // Minimum range of 20 for better visualization
    
    // Create points for the line
    const points = scoreHistory.map((entry, index) => {
      const x = -chartWidth / 2 + 20 + ((chartWidth - 40) / Math.max(scoreHistory.length - 1, 1)) * index;
      const normalizedScore = Math.max(0, Math.min(1, (entry.score - minScore) / scoreRange));
      const y = (chartHeight / 2 - 10) - (normalizedScore * (chartHeight - 20));
      return new Phaser.Math.Vector2(x, y);
    });
    
    // Draw area fill with gradient effect
    if (points.length > 1) {
      const fill = this.scene.add.graphics();
      if (fill) {
        fill.fillStyle(0x8a2be2, 0.15);
        fill.beginPath();
        fill.moveTo(points[0].x, chartHeight / 2 - 10);
        points.forEach(point => fill.lineTo(point.x, point.y));
        fill.lineTo(points[points.length - 1].x, chartHeight / 2 - 10);
        fill.closePath();
        fill.fill();
        container.add(fill);
      }
    }
    
    // Draw line with improved styling
    if (points.length > 1) {
      const line = this.scene.add.graphics();
      line.lineStyle(3, 0x8a2be2, 0.9);
      line.beginPath();
      line.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        line.lineTo(points[i].x, points[i].y);
      }
      line.strokePath();
      container.add(line);
    }
    
    // Draw data points with glow effects
    points.forEach((point, index) => {
      // Glow effect
      const glow = this.scene.add.graphics();
      glow.fillStyle(0x8a2be2, 0.4);
      glow.fillCircle(point.x, point.y, 8);
      glow.setBlendMode(Phaser.BlendModes.ADD);
      container.add(glow);
      
      // Main point
      const circle = this.scene.add.graphics();
      circle.fillStyle(0x8a2be2, 1);
      circle.fillCircle(point.x, point.y, 4);
      circle.lineStyle(2, 0xffffff, 0.8);
      circle.strokeCircle(point.x, point.y, 4);
      container.add(circle);
      
      // Show score labels for key points
      const score = scoreHistory[index].score;
      const shouldShowLabel = index === 0 || index === points.length - 1 || 
                             (points.length > 5 && index % Math.ceil(points.length / 4) === 0);
      
      if (shouldShowLabel) {
        const scoreText = this.scene.add.text(point.x, point.y - 25, Math.round(score).toString(), {
          fontSize: this.scene.scalingUtils ? this.scene.scalingUtils.scaleFontSize(12) : '12px',
          color: '#8a2be2', fontStyle: 'bold',
          stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);
        container.add(scoreText);
      }
    });
    
    // Add Y-axis labels
    const yLabels = [maxScore, Math.round((maxScore + minScore) / 2), minScore];
    yLabels.forEach((label, index) => {
      const y = -chartHeight / 2 + 10 + (index * (chartHeight - 20) / 2);
      const yLabel = this.scene.add.text(-chartWidth / 2 - 15, y, Math.round(label).toString(), {
        fontSize: this.scene.scalingUtils ? this.scene.scalingUtils.scaleFontSize(11) : '11px',
        color: '#c9c9c9', fontStyle: 'bold'
      }).setOrigin(1, 0.5);
      container.add(yLabel);
    });
    
    // Current score highlight with better styling
    if (scoreHistory.length > 0) {
      const currentScore = Math.round(scoreHistory[scoreHistory.length - 1].score);
      const currentLabel = this.scene.add.text(0, chartHeight / 2 + 25, `Current Score: ${currentScore}`, {
        fontSize: this.scene.scalingUtils ? this.scene.scalingUtils.scaleFontSize(16) : '16px',
        color: '#00e5ff', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 2
      }).setOrigin(0.5);
      container.add(currentLabel);
      
      // Add trend indicator
      if (scoreHistory.length > 1) {
        const prevScore = scoreHistory[scoreHistory.length - 2].score;
        const change = currentScore - prevScore;
        const trendIcon = change > 0 ? '↗️' : change < 0 ? '↘️' : '➡️';
        const trendColor = change > 0 ? '#00ff88' : change < 0 ? '#ff6666' : '#c9c9c9';
        
        const trendText = this.scene.add.text(120, chartHeight / 2 + 25, 
          `${trendIcon} ${change > 0 ? '+' : ''}${Math.round(change)}`, {
          fontSize: this.scene.scalingUtils ? this.scene.scalingUtils.scaleFontSize(14) : '14px',
          color: trendColor, fontStyle: 'bold'
        }).setOrigin(0, 0.5);
        container.add(trendText);
      }
    }
  }
  
  // New method to help transition existing UI elements to new containers
  prepareForDownsizing() {
    // This will be called to start moving elements to the new containers
    console.log('Preparing UI elements for downsizing...');
    
    // Calculate responsive scale factor
    const currentWidth = this.scene.sys.game.config.width;
    const currentHeight = this.scene.sys.game.config.height;
    this.scaleFactor = Math.min(currentWidth / this.originalWidth, currentHeight / this.originalHeight);
    
    // Apply scaling to main container if needed
    if (this.scaleFactor < 1) {
      this.mainUIContainer.setScale(this.scaleFactor);
    }
  }
  // Method to check if we're on mobile/small screen
  isMobileLayout() {
    const { width, height } = this.scene.sys.game.config;
    return width < 768 || height < 600;
  }
  // Method to get appropriate container size based on screen
  getResponsiveSize(baseSize) {
    return Math.floor(baseSize * this.scaleFactor);
  }
  // Method to create compact versions of UI elements
  createCompactElement(type, config = {}) {
    const compactConfig = {
      ...config,
      fontSize: this.getResponsiveSize(config.fontSize || 16),
      padding: {
        x: this.getResponsiveSize(config.padding?.x || 10),
        y: this.getResponsiveSize(config.padding?.y || 5)
      }
    };
    
    return compactConfig;
  }
  
}