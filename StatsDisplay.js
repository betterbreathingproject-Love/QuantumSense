import Phaser from 'phaser';

export class StatsDisplay {
  constructor(scene, statsTracker) {
    this.scene = scene;
    this.statsTracker = statsTracker;
    this.breathingStatsTracker = null; // Will be set later
    
    // Create UI elements first
    this.createGameStatsBar();
    this.createBreathingStatsBar();
    this.createPsychicMeter();
    this.createCoherenceMeter();
    
    // Then update them with loaded stats
    const initialStats = this.statsTracker.getStats();
    this.updateStats(initialStats);
    this.updateBreathingStats({
      totalCoherenceTime: initialStats.totalCoherenceTime || 0,
      dailyCoherenceTime: initialStats.dailyCoherenceTime || 0,
      predictionBoost: this.calculatePredictionBoost(),
      dailyStreak: initialStats.dailyBreathingStreak || 0,
      progress: 0,
      isActive: false
    });
    this.coherenceProgress = 0; // Track coherence progress for level completion rewards
    this.showGameStats();
  }
  createGameStatsBar() {
    const { width } = this.scene.sys.game.config;
    this.gameStatsContainer = this.scene.add.container(0, 0);
    this.gameStatsContainer.setDepth(100);
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x8a2be2, 0.1);
    bg.fillRoundedRect(20, 20, width - 40, 80, 20);
    bg.lineStyle(1, 0x8a2be2, 0.3);
    bg.strokeRoundedRect(20, 20, width - 40, 80, 20);
    this.gameStatsContainer.add(bg);
    // Evenly distribute stat items inside the top bar background
    // Align centers precisely to each column within the rounded rect (20px margin on both sides)
    const margin = 20;
    const columns = 6;
    const barWidth = width - margin * 2; // matches bg width
    const columnWidth = barWidth / columns;
    // Further improve spacing: use responsive spacing factors for various screen widths
    let spacingFactor = 0.82; // default
    if (width <= 768) spacingFactor = 0.76;  // tablets and small laptops
    if (width <= 480) spacingFactor = 0.72;  // narrow/mobile
    const statSpacing = Math.floor(columnWidth * spacingFactor);
    // Add targeted extra space after Q-SCORE and slightly between INFLUENCE% and ATTEMPTS
    const extraFirstGap = Math.floor(statSpacing * 0.20);
    const extraSecondGap = Math.floor(statSpacing * 0.10);
    // Compute total width with the added gaps and center the group
    const totalWidth = statSpacing * (columns - 1) + extraFirstGap + extraSecondGap;
    // Nudge the stats group slightly to the left so BOOST stays farther from the menu/debug button
    let shiftLeft = 12;        // default slight shift
    if (width <= 768) shiftLeft = 16;  // tablets and small laptops
    if (width <= 480) shiftLeft = 18;  // narrow/mobile
    const startX = (width / 2) - (totalWidth / 2) - shiftLeft;
    // Build positions with targeted gaps
    const xPositions = [
      startX,                                            // Q-SCORE
      startX + statSpacing + extraFirstGap,              // ACCURACY / INFLUENCE %
      startX + statSpacing * 2 + extraFirstGap + extraSecondGap, // ROLLS / ATTEMPTS
      startX + statSpacing * 3 + extraFirstGap + extraSecondGap, // P-VALUE
      startX + statSpacing * 4 + extraFirstGap + extraSecondGap, // STREAK
      startX + statSpacing * 5 + extraFirstGap + extraSecondGap  // BOOST
    ];

    this.qScoreItem = this.createStatItem(xPositions[0], 60, '0', 'Q-SCORE', 'A measure of your overall psychic performance, combining accuracy, p-value, streak, and coherence.', '24px', '12px');
    this.accuracyItem = this.createStatItem(xPositions[1], 60, '0.0%', 'ACCURACY', 'Your overall prediction accuracy in Sense mode', '24px', '12px');
    this.rollsItem = this.createStatItem(xPositions[2], 60, '0', 'ROLLS', 'Total predictions made in Sense mode', '24px', '12px');
    this.pValueItem = this.createStatItem(xPositions[3], 60, '1.000', 'P-VALUE', 'The statistical likelihood of your results being random. Lower is better!', '24px', '12px');
    this.streakItem = this.createStatItem(xPositions[4], 60, '0', 'STREAK', 'Current correct predictions in a row', '24px', '12px');
    this.predictionBoostItem = this.createStatItem(xPositions[5], 60, '+0.0%', 'BOOST', 'Accuracy improvement after breathing sessions', '24px', '12px');
    this.gameStatsContainer.add([
      this.qScoreItem.container,
      this.accuracyItem.container,
      this.rollsItem.container,
      this.pValueItem.container,
      this.streakItem.container,
      this.predictionBoostItem.container
    ]);
    this.mainStats = {
      qScore: this.qScoreItem,
      accuracy: this.accuracyItem,
      rolls: this.rollsItem,
      pValue: this.pValueItem,
      streak: this.streakItem,
      predictionBoost: this.predictionBoostItem,
    };
    
    // Store original tooltips
    this.accuracyItem.tooltipText = 'Your overall prediction accuracy in Sense mode';
    this.rollsItem.tooltipText = 'Total predictions made in Sense mode';
  }
  createBreathingStatsBar() {
    const { width } = this.scene.sys.game.config;
    this.breathingStatsContainer = this.scene.add.container(0, 0);
    this.breathingStatsContainer.setDepth(100).setVisible(false);
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x8a2be2, 0.1);
    bg.fillRoundedRect(20, 20, width - 40, 80, 20);
    bg.lineStyle(1, 0x8a2be2, 0.3);
    bg.strokeRoundedRect(20, 20, width - 40, 80, 20);
    this.breathingStatsContainer.add(bg);
    // Better spacing calculation with margins
    const statSpacing = (width - 120) / 4;
    const startX = 80;
    this.coherenceTimeItem = this.createStatItem(startX, 60, '0m', 'ALL TIME', 'Total time spent in coherent breathing state', '24px', '12px');
    this.dailyCoherenceItem = this.createStatItem(startX + statSpacing, 60, '0m', 'TODAY', 'Coherence time accumulated today', '24px', '12px');
    this.breathingPredictionBoostItem = this.createStatItem(startX + statSpacing * 2, 60, '+0.0%', 'BOOST', 'Accuracy improvement after breathing sessions', '24px', '12px');
    this.dayStreakItem = this.createStatItem(startX + statSpacing * 3, 60, '0', 'STREAK', 'Consecutive days with breathing practice', '24px', '12px');
    this.breathingStatsContainer.add([
      this.coherenceTimeItem.container,
      this.dailyCoherenceItem.container,
      this.breathingPredictionBoostItem.container,
      this.dayStreakItem.container
    ]);
    this.breathingStats = {
      coherenceTime: this.coherenceTimeItem,
      dailyCoherence: this.dailyCoherenceItem,
      predictionBoost: this.breathingPredictionBoostItem,
      dayStreak: this.dayStreakItem,
    };
  }

  createStatItem(x, y, value, label, tooltipText, valueSize = '28px', labelSize = '14px') {
    const valueStyle = {
      fontFamily: 'Arial, sans-serif',
      fontSize: valueSize,
      color: '#00e5ff',
      fontStyle: 'bold'
    };
    const labelStyle = {
      fontFamily: 'Arial, sans-serif',
      fontSize: labelSize,
      color: '#c9c9c9'
    };
    
    const valueText = this.scene.add.text(0, -8, value, valueStyle).setOrigin(0.5);
    const labelText = this.scene.add.text(0, 12, label, labelStyle).setOrigin(0.5);
    
    const container = this.scene.add.container(x, y, [valueText, labelText]);
    
    // Make interactive area smaller for better spacing
    const interactiveWidth = Math.min(80, (this.scene.sys.game.config.width - 120) / 5);
    container.setInteractive(new Phaser.Geom.Rectangle(-interactiveWidth/2, -25, interactiveWidth, 50), Phaser.Geom.Rectangle.Contains, { useHandCursor: true });
    
    container.on('pointerover', () => {
      this.createStatTooltip(tooltipText, container);
    });
    container.on('pointerout', () => {
      if (container.tooltip) {
        document.body.removeChild(container.tooltip);
        container.tooltip = null;
      }
    });
    
    return { valueText, labelText, container };
  }

  createStatTooltip(text, parent) {
    if (parent.tooltip) {
      document.body.removeChild(parent.tooltip);
      parent.tooltip = null;
    }
    
    const canvas = this.scene.sys.game.canvas;
    const bounds = canvas.getBoundingClientRect();
    const scale = Math.min(bounds.width / canvas.width, bounds.height / canvas.height);
    
    const parentGlobalPos = parent.getWorldTransformMatrix().transformPoint(0, 0);
    const canvasX = bounds.left + (parentGlobalPos.x * scale);
    const canvasY = bounds.top + (parentGlobalPos.y * scale);
    
    const tooltip = document.createElement('div');
    tooltip.textContent = text;
    
    const tooltipWidth = 200;
    
    let tooltipX = canvasX;
    let tooltipY = canvasY + 40; // Position below the stat item
    
    tooltip.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      width: ${tooltipWidth}px;
      background: rgba(12, 1, 20, 0.95);
      color: #c9c9c9;
      font-family: Arial, sans-serif;
      font-size: 14px;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid #8a2be2;
      z-index: 10000;
      pointer-events: none;
      box-shadow: 0 0 15px rgba(138, 43, 226, 0.3);
      transform: translate(-50%, 0);
    `;
    
    document.body.appendChild(tooltip);
    
    // Now that it's in the DOM, we can get its height
    const tooltipHeight = tooltip.offsetHeight;
    
    // Check viewport boundaries
    if (tooltipX - tooltipWidth / 2 < 0) {
        tooltipX = tooltipWidth / 2;
    } else if (tooltipX + tooltipWidth / 2 > window.innerWidth) {
        tooltipX = window.innerWidth - tooltipWidth / 2;
    }
    
    if (tooltipY + tooltipHeight > window.innerHeight) {
        tooltipY = canvasY - tooltipHeight - 10; // Flip above if not enough space below
    }
    tooltip.style.left = `${tooltipX}px`;
    tooltip.style.top = `${tooltipY}px`;
    
    parent.tooltip = tooltip;
  }

  updateStats(stats, shouldAnimatePowerIncrease = false) {
    if (!this.mainStats) return;
    
    // This now updates based on the current mode's stats
    const modeStats = this.statsTracker.getModeComparison()[this.scene.gameMode || 'sense'];
    
    this.mainStats.accuracy.valueText.setText(`${modeStats.accuracy.toFixed(1)}%`);
    this.mainStats.rolls.valueText.setText(`${modeStats.totalRolls}`);
    this.mainStats.pValue.valueText.setText(`${modeStats.pValue.toFixed(3)}`);
    
    // Global stats that are not mode-specific
    this.mainStats.qScore.valueText.setText(Math.round((stats.qScore ?? stats.zenScore) || 0).toString());
    this.mainStats.streak.valueText.setText(`${stats.currentStreak}`);
    
    this.updatePsychicMeter(stats.divinePower, stats.psychicLevel - 1, shouldAnimatePowerIncrease);
    
    if (this.shieldContainer && this.shieldContainer.shieldCountText) {
      this.shieldContainer.shieldCountText.setText((stats.streakShields || 0).toString());
    }
  }
  updateBreathingStats(stats) {
    if (!this.breathingStats || !this.mainStats) return;
    
    // Use the live calculated values passed in the stats parameter instead of stored values
    const totalCoherenceTime = typeof stats.totalCoherenceTime === 'number' ? stats.totalCoherenceTime : 0;
    const dailyCoherenceTime = typeof stats.dailyCoherenceTime === 'number' ? stats.dailyCoherenceTime : 0;
    const predictionBoost = typeof stats.predictionBoost === 'number' ? stats.predictionBoost : 0;
    const dailyStreak = typeof stats.dailyStreak === 'number' ? stats.dailyStreak : 0;
    // Format total coherence time
    const totalTimeDisplay = totalCoherenceTime < 60 ? 
      `${Math.floor(totalCoherenceTime)}m` : 
      `${Math.floor(totalCoherenceTime/60)}h ${Math.floor(totalCoherenceTime%60)}m`;
    this.breathingStats.coherenceTime.valueText.setText(totalTimeDisplay);
    
    // Format daily coherence time
    const dailyTimeDisplay = dailyCoherenceTime < 60 ?
      `${Math.floor(dailyCoherenceTime)}m` :
      `${Math.floor(dailyCoherenceTime/60)}h ${Math.floor(dailyCoherenceTime%60)}m`;
    this.breathingStats.dailyCoherence.valueText.setText(dailyTimeDisplay);
    
    const boostSign = predictionBoost >= 0 ? '+' : '';
    const boostColor = predictionBoost >= 0 ? '#00ff88' : '#ff4444';
    // Update boost on both stat bars
    this.mainStats.predictionBoost.valueText.setText(`${boostSign}${predictionBoost.toFixed(1)}%`);
    this.mainStats.predictionBoost.valueText.setColor(boostColor);
    this.breathingStats.predictionBoost.valueText.setText(`${boostSign}${predictionBoost.toFixed(1)}%`);
    this.breathingStats.predictionBoost.valueText.setColor(boostColor);
    
    this.breathingStats.dayStreak.valueText.setText(dailyStreak.toString());
  }
  showGameStats() {
    // Only show game stats if we're not in breathing state
    if (this.scene.gameState === 'breathing') return;
    
    // Ensure game stats container is properly reset before showing
    this.gameStatsContainer.setX(0);
    this.gameStatsContainer.setAlpha(1);
    this.gameStatsContainer.setDepth(100);
    this.animateStatBarTransition(this.breathingStatsContainer, this.gameStatsContainer);
  }
  showBreathingStats() {
    // The gameStatsContainer is not visible, so animate the breathingStats in from off-screen
    this.animateStatBarTransition(null, this.breathingStatsContainer);
  }
  show() {
    this.showGameStats();
  }
  hideForBreathing(isPrompt = false) {
    // Kill any existing tweens on stat containers to prevent conflicts
    this.scene.tweens.killTweensOf(this.gameStatsContainer);
    this.scene.tweens.killTweensOf(this.breathingStatsContainer);
    
    // Force hide game stats container immediately and aggressively
    this.gameStatsContainer.setVisible(false);
    this.gameStatsContainer.setAlpha(0);
    this.gameStatsContainer.setX(-1000); // Move completely off screen
    this.gameStatsContainer.setDepth(-1); // Put behind everything
    
    // Hide breathing stats container
    this.breathingStatsContainer.setVisible(false);
    this.breathingStatsContainer.setX(0);
    this.breathingStatsContainer.setAlpha(1);
    
    // Hide the psychic meter (left bar) and badges, but show the coherence meter (right bar)
    this.psychicMeterContainer.setVisible(false);
    this.coherenceContainer.setVisible(true);
    if (!isPrompt) {
        // When starting the exercise, show the breathing stats bar
        // Small delay to ensure clean transition
        this.scene.time.delayedCall(50, () => {
          this.showBreathingStats();
        });
    }
  }
  showFromBreathing() {
    // Reset game stats container properties before showing
    this.gameStatsContainer.setX(0);
    this.gameStatsContainer.setAlpha(1);
    this.gameStatsContainer.setDepth(100);
    this.showGameStats();
    
    // Also restore the side meters
    this.psychicMeterContainer.setVisible(true);
    this.coherenceContainer.setVisible(true);
  }

  updateCoherenceMeter(progress, isExercising) {
    if (!this.coherenceMeterFill) return;
    
    const { width, height } = this.scene.sys.game.config;
    const meterHeight = 250;
    const meterWidth = 30;
    const fillHeight = Math.max(0, progress * meterHeight);
    
    this.coherenceMeterFill.clear();
    if (progress > 0 && fillHeight > 0) {
      const color = isExercising ? 0x00ff88 : 0x8a2be2;
      this.coherenceMeterFill.fillStyle(color, 0.8);
      
      // Ensure the fill starts exactly at the bottom of the meter background
      // and fills upward with proper alignment
      const fillY = meterHeight - fillHeight;
      const cornerRadius = fillHeight < 15 ? Math.min(15, fillHeight / 2) : 15;
      
      this.coherenceMeterFill.fillRoundedRect(
        -meterWidth / 2, 
        fillY, 
        meterWidth, 
        fillHeight, 
        cornerRadius
      );
    }
  }

  createPsychicMeter() {
    const height = this.scene.sys.game.config.height;
    const meterHeight = 250;
    const meterWidth = 30;
    const x = 60;
    const y = height / 2 - meterHeight / 2 - 100;
    
    this.psychicMeterContainer = this.scene.add.container(0, 0);
    
    this.meterBG = this.scene.add.graphics();
    this.meterBG.fillStyle(0x000000, 0.3);
    this.meterBG.fillRoundedRect(x - meterWidth / 2, y, meterWidth, meterHeight, 15);
    this.meterBG.lineStyle(2, 0x8a2be2, 0.5);
    this.meterBG.strokeRoundedRect(x - meterWidth / 2, y, meterWidth, meterHeight, 15);
    
    this.meterFill = this.scene.add.graphics();
    
    this.meterLevelText = this.scene.add.text(x, y + meterHeight + 20, '🌱 NOVICE', {
      fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#c9c9c9', fontStyle: 'bold'
    }).setOrigin(0.5);
    
    this.streakFireText = this.scene.add.text(x, y + meterHeight + 45, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#ff6600', fontStyle: 'bold'
    }).setOrigin(0.5);
    
    const powerLabel = this.scene.add.text(x, y - 20, 'DIVINE\nPOWER', {
      fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#c9c9c9', align: 'center'
    }).setOrigin(0.5);
    
    this.psychicMeterContainer.add([this.meterBG, this.meterFill, this.meterLevelText, this.streakFireText, powerLabel]);
    
    // Add tooltip to the psychic meter
    const meterInteractiveArea = this.scene.add.zone(x, y + meterHeight / 2, meterWidth, meterHeight).setInteractive({ useHandCursor: true });
    meterInteractiveArea.on('pointerover', () => {
      this.createStatTooltip("Divine Power builds with each correct prediction. Fill the meter to level up or earn rewards.", meterInteractiveArea);
    });
    meterInteractiveArea.on('pointerout', () => {
      if (meterInteractiveArea.tooltip) {
        document.body.removeChild(meterInteractiveArea.tooltip);
        meterInteractiveArea.tooltip = null;
      }
    });
    this.psychicMeterContainer.add(meterInteractiveArea);
  }

  createCoherenceMeter() {
    const { width, height } = this.scene.sys.game.config;
    const meterHeight = 250;
    const meterWidth = 30;
    const x = width - 60;
    const y = height / 2 - meterHeight / 2 - 100;
    
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
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 5,
      shadow: { color: '#ffff00', blur: 10, stroke: true, fill: true }
    }).setOrigin(0.5);
    
    this.shieldContainer.add([shieldIcon, shieldCount]);
    this.shieldContainer.shieldCountText = shieldCount;
    
    const meterLabel = this.scene.add.text(0, meterHeight + 20, 'COHERENCE', {
      fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#c9c9c9', fontStyle: 'bold'
    }).setOrigin(0.5);
    
    this.coherenceContainer.add([bg, this.coherenceMeterFill, this.shieldContainer, meterLabel]);
    this.coherenceContainer.setVisible(true);
    // Add tooltip to the coherence meter
    const coherenceMeterInteractiveArea = this.scene.add.zone(0, meterHeight / 2, meterWidth, meterHeight).setInteractive({ useHandCursor: true });
    coherenceMeterInteractiveArea.on('pointerover', () => {
        this.createStatTooltip("Coherence is built by completing breathing exercises. Fill the meter to earn rewards like Streak Shields.", coherenceMeterInteractiveArea);
    });
    coherenceMeterInteractiveArea.on('pointerout', () => {
        if (coherenceMeterInteractiveArea.tooltip) {
            document.body.removeChild(coherenceMeterInteractiveArea.tooltip);
            coherenceMeterInteractiveArea.tooltip = null;
        }
    });
    this.coherenceContainer.add(coherenceMeterInteractiveArea);
    // Add tooltip to the shield
    this.shieldContainer.setSize(shieldIcon.width * shieldIcon.scaleX, shieldIcon.height * shieldIcon.scaleY).setInteractive({ useHandCursor: true });
    this.shieldContainer.on('pointerover', () => {
        this.createStatTooltip("Streak Shields protect your current prediction streak from being broken by one incorrect answer.", this.shieldContainer);
    });
    this.shieldContainer.on('pointerout', () => {
        if (this.shieldContainer.tooltip) {
            document.body.removeChild(this.shieldContainer.tooltip);
            this.shieldContainer.tooltip = null;
        }
    });
  }

  updatePsychicMeter(power, level, shouldAnimate = false) {
    const height = this.scene.sys.game.config.height;
    const meterHeight = 250;
    const meterWidth = 30;
    const x = 60;
    const y = height / 2 - meterHeight / 2 - 100;
    const fillHeight = (power / 100) * meterHeight;
    const levelMap = ['🌱 NOVICE', '🌸 APPRENTICE', '⚡ ADEPT', '👑 MASTER', '✨ TRANSCENDENT'];
    const colorMap = [0x8a2be2, 0x00e5ff, 0x00ff00, 0xffff00, 0xff00ff];
    
    this.meterLevelText.setText(levelMap[level]);
    
    // Clear and redraw the meter
    this.meterFill.clear();
    
    // Draw the thirds markers
    this.drawThirdsMarkers(x, y, meterWidth, meterHeight);
    
    if (shouldAnimate && power > 0) {
      const currentFillHeight = this.lastFillHeight || 0;
      this.animateMeterFill(x, y, meterWidth, meterHeight, currentFillHeight, fillHeight, colorMap[level]);
    } else {
      // Draw the fill with thirds effect
      this.drawMeterFillWithThirds(x, y, meterWidth, meterHeight, fillHeight, colorMap[level], power);
    }
    
    this.lastFillHeight = fillHeight;
    
    const currentStreak = this.statsTracker.getStats().currentStreak;
    this.updateStreakFire(currentStreak);
  }
  
  drawThirdsMarkers(x, y, width, height) {
    // Draw subtle division lines at 1/3 and 2/3 marks
    this.meterFill.lineStyle(1, 0x666666, 0.5);
    const thirdHeight = height / 3;
    
    // First third line
    this.meterFill.moveTo(x - width / 2, y + height - thirdHeight);
    this.meterFill.lineTo(x + width / 2, y + height - thirdHeight);
    
    // Second third line  
    this.meterFill.moveTo(x - width / 2, y + height - (thirdHeight * 2));
    this.meterFill.lineTo(x + width / 2, y + height - (thirdHeight * 2));
    
    this.meterFill.strokePath();
  }
  
  drawMeterFillWithThirds(x, y, width, height, fillHeight, color, power) {
    if (fillHeight <= 0) return;
    
    // Determine which third we're in
    const thirdHeight = height / 3;
    const currentThird = Math.ceil((power / 100) * 3);
    
    // Draw completed thirds with full opacity
    for (let i = 1; i <= 3; i++) {
      if (power >= (i * 33.33)) {
        this.meterFill.fillStyle(color, 0.8);
        this.meterFill.fillRoundedRect(
          x - width / 2, 
          y + height - (thirdHeight * i), 
          width, 
          thirdHeight, 
          i === 1 ? 15 : 0 // Only round bottom corners
        );
      }
    }
    
    // Draw partial third if in progress
    if (power % 33.33 !== 0 && currentThird <= 3) {
      const partialHeight = (power % 33.33) / 33.33 * thirdHeight;
      this.meterFill.fillStyle(color, 0.6);
      this.meterFill.fillRoundedRect(
        x - width / 2, 
        y + height - ((currentThird - 1) * thirdHeight) - partialHeight, 
        width, 
        partialHeight, 
        currentThird === 1 ? 15 : 0
      );
    }
  }

  animateMeterFill(x, y, width, height, fromHeight, toHeight, color) {
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
        this.meterFill.clear();
        this.meterFill.fillStyle(color, 0.8);
        if (toHeight > 0) {
          this.meterFill.fillRoundedRect(x - width / 2, y + height - toHeight, width, toHeight, 15);
        }
        animatedFill.destroy();
      }
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
  calculatePredictionBoost() {
    const stats = this.statsTracker.getStats();
    const recentSessions = stats.recentBreathingSessions || [];
    
    if (recentSessions.length === 0) return 0.0;
    
    // Calculate average accuracy before and after breathing sessions
    let preBreathingAccuracy = 0;
    let postBreathingAccuracy = 0;
    let validSessions = 0;
    
    recentSessions.forEach(session => {
      if (session.preAccuracy !== undefined && session.postAccuracy !== undefined) {
        preBreathingAccuracy += session.preAccuracy;
        postBreathingAccuracy += session.postAccuracy;
        validSessions++;
      }
    });
    
    if (validSessions === 0) return 0.0;
    
    const avgPreAccuracy = preBreathingAccuracy / validSessions;
    const avgPostAccuracy = postBreathingAccuracy / validSessions;
    
    return Math.max(0, avgPostAccuracy - avgPreAccuracy);
  }
  animateStatBarTransition(fromContainer, toContainer) {
    if (!toContainer) return;
    const { width } = this.scene.sys.game.config;
    
    // Kill any existing tweens on both containers to prevent conflicts
    this.scene.tweens.killTweensOf(toContainer);
    if (fromContainer) {
      this.scene.tweens.killTweensOf(fromContainer);
    }
    
    // Reset and prepare the target container
    if (toContainer) {
      toContainer.setVisible(true).setAlpha(0).setX(width);
    }
    
    // Animate the 'from' container out, only if it exists and is visible
    if (fromContainer && fromContainer.visible) {
      this.scene.tweens.add({
        targets: fromContainer,
        x: -width,
        alpha: 0,
        duration: 400,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          fromContainer.setVisible(false);
          fromContainer.setX(0).setAlpha(1); // Reset position and alpha
        }
      });
    }
    
    // Animate the new container in
    this.scene.tweens.add({
      targets: toContainer,
      x: 0,
      alpha: 1,
      duration: 400,
      ease: 'Cubic.easeOut',
      delay: (fromContainer && fromContainer.visible) ? 100 : 0
    });
  }
  
  updateForGameMode(gameMode) {
    if (!this.mainStats) return;
    const isSense = gameMode === 'sense';
    const accuracyContainer = this.mainStats.accuracy.container;
    const rollsContainer = this.mainStats.rolls.container;
    const statsToAnimate = [accuracyContainer, rollsContainer];
    const originalY = accuracyContainer.y; // Both have the same original Y
    // Animate the stats flying out (upwards)
    this.scene.tweens.add({
      targets: statsToAnimate,
      alpha: 0,
      y: originalY - 30, // Fly up
      duration: 300,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        // Update labels and tooltips
        this.mainStats.accuracy.labelText.setText(isSense ? 'ACCURACY' : 'INFLUENCE %');
        this.mainStats.rolls.labelText.setText(isSense ? 'ROLLS' : 'ATTEMPTS');
        this.accuracyItem.tooltipText = isSense
          ? 'Your overall prediction accuracy in Sense mode'
          : 'Your success rate at influencing the outcome in Influence mode';
        this.rollsItem.tooltipText = isSense
          ? 'Total predictions made in Sense mode'
          : 'Total influence attempts made in Influence mode';
        // Refresh stats display with the correct data
        this.updateStats(this.statsTracker.getStats());
        // Prepare for drop-in animation by moving them above the original position
        statsToAnimate.forEach(stat => {
          stat.y = originalY - 30;
        });
        // Animate the stats dropping back in
        this.scene.tweens.add({
          targets: statsToAnimate,
          alpha: 1,
          y: originalY, // Drop down to original position
          duration: 400,
          ease: 'Back.easeOut', // Adds a nice bounce effect
          delay: 100 // A slight pause for effect
        });
      }
    });
  }

  // Getter for tutorial highlighting - returns the currently visible stats container
  get topBarContainer() {
    // Return the currently visible stats container
    if (this.gameStatsContainer && this.gameStatsContainer.visible) {
      return this.gameStatsContainer;
    } else if (this.breathingStatsContainer && this.breathingStatsContainer.visible) {
      return this.breathingStatsContainer;
    }
    // Default to game stats container if neither is explicitly visible
    return this.gameStatsContainer;
  }
}