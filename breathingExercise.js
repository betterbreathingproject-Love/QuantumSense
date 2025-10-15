import Phaser from 'phaser';
export class BreathingExercise {
  constructor(scene, initialSettings, callbacks, statsDisplayCallbacks) {
    this.scene = scene;
    this.settings = initialSettings;
    this.callbacks = callbacks;
    this.statsDisplayCallbacks = statsDisplayCallbacks || {};
    this.requiredBreathingTime = this.scene.statsTracker.getRequiredBreathingTime() * 60; // in seconds
    this.initialDuration = this.requiredBreathingTime;
    this.duration = this.initialDuration;
    this.extendedTime = 0;
    this.isExtended = false;
    this.isVisible = false;
    this.isExercising = false;

    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(1000).setVisible(false);

    this.createInitialPopup();
    this.createExerciseUI();
  }

  createInitialPopup() {
    const { width, height } = this.scene.sys.game.config;
    const popupWidth = Math.min(500, width - 40); // Make responsive to screen width
    const popupHeight = 680; // Increased height to accommodate settings
    this.popupContainer = this.scene.add.container(width / 2, height / 2);
    this.popupContainer.setDepth(4500); // Ensure popup is on top
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0c0114, 0.95);
    bg.fillRoundedRect(-popupWidth / 2, -popupHeight / 2, popupWidth, popupHeight, 20);
    bg.lineStyle(2, 0x8a2be2, 1);
    bg.strokeRoundedRect(-popupWidth / 2, -popupHeight / 2, popupWidth, popupHeight, 20);
    const heartEmoji = this.scene.add.text(0, -popupHeight/2 + 60, '💖', { fontSize: '56px' }).setOrigin(0.5);
    const message = "HeartMath research shows that a few minutes of heart-focused breathing restores balance and sharpens intuition — let’s enhance your training now.";
    const text = this.scene.add.text(0, -popupHeight/2 + 140, message, {
      fontFamily: 'Arial, sans-serif', fontSize: '22px', color: '#c9c9c9', align: 'center', wordWrap: { width: 460 }
    }).setOrigin(0.5);
    const requiredTime = this.scene.statsTracker.getRequiredBreathingTime();
    const shieldTimeText = this.scene.add.text(0, -popupHeight/2 + 220, `Complete ${requiredTime} minutes to earn a Streak Shield.`, {
        fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#ffff00', fontStyle: 'italic', align: 'center'
    }).setOrigin(0.5);
    const beginButton = this.createButton(0, 50, 'Begin', () => {
        try {
            this.startExercise();
            if (this.callbacks && this.callbacks.onBegin) {
                this.callbacks.onBegin();
            }
        } catch (error) {
            console.warn('Error during breathing exercise begin:', error);
        }
    }, true, this.popupContainer); // Pass the container
    const skipButton = this.createButton(0, 120, 'Skip', () => {
        try {
            this.skip();
            if (this.callbacks && this.callbacks.onSkip) {
                this.callbacks.onSkip();
            }
        } catch (error) {
            console.warn('Error during breathing exercise skip:', error);
        }
    }, true, this.popupContainer); // Pass the container
    
    // Settings container - positioned under skip button with better alignment
    const settingsContainer = this.scene.add.container(0, 180);
    
    // Create centered "Remind me after" setting
    const remindLabel = this.scene.add.text(-75, 0, 'Remind me after:', {
        fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#c9c9c9'
    }).setOrigin(0, 0.5);
    
    this.thresholdOptions = [
        { text: '3 misses', value: 3 },
        { text: '5 misses', value: 5 },
        { text: '6 misses', value: 6 },
        { text: '9 misses', value: 9 },
    ];
    this.currentThresholdIndex = this.thresholdOptions.findIndex(o => o.value === this.settings.threshold);
    if (this.currentThresholdIndex === -1) this.currentThresholdIndex = 0; // Default to 3 misses
    
    this.thresholdSelector = this.createDropdown(75, 0, this.thresholdOptions, this.currentThresholdIndex, (selectedIndex) => {
        this.currentThresholdIndex = selectedIndex;
        const newThreshold = this.thresholdOptions[selectedIndex].value;
        this.callbacks.onThresholdChange(newThreshold);
    });
    
    // Checkbox positioned below and centered
    this.dontShowAgainCheckbox = this.createCheckbox(0, 40, "Don't show this again", !this.settings.enabled, (isChecked) => {
        this.callbacks.onDontShowAgain(!isChecked);
    });
    
    // Add all elements to the popup container in the correct render order
    this.popupContainer.add([
        bg, 
        heartEmoji, 
        text, 
        shieldTimeText, 
        beginButton, 
        skipButton,
        settingsContainer // Add settings container last to render on top of buttons
    ]);
    
    // Add elements to the settings container
    settingsContainer.add([remindLabel, this.thresholdSelector, this.dontShowAgainCheckbox]);
    this.container.add(this.popupContainer);
    // The dropdown items need to be on the top-level scene to overlay everything
    this.scene.add.existing(this.thresholdSelector.dropdownItems);
  }

  createExerciseUI() {
    const { width, height } = this.scene.sys.game.config;
    this.exerciseContainer = this.scene.add.container(width / 2, height / 2);
    this.progressRing = this.scene.add.graphics();
    this.exerciseContainer.add(this.progressRing);
    // Create the new mystical mandala visual
    this.createMysticalCircle();
    // Practice Picker (Carousel) - Now at the top
    this.guidanceText = this.scene.add.text(0, -320, 'Breathe In...', {
      fontFamily: 'Arial, sans-serif', fontSize: '42px', color: '#ffffff', fontStyle: 'italic',
      shadow: { color: '#000000', blur: 10, stroke: true, fill: true }
    }).setOrigin(0.5);
    const initialMinutes = Math.floor(this.initialDuration / 60);
    const initialSeconds = this.initialDuration % 60;
    this.timerText = this.scene.add.text(0, -280, `${initialMinutes}:${initialSeconds.toString().padStart(2, '0')}`, {
      fontFamily: 'Arial, sans-serif', fontSize: '20px', color: '#c9c9c9',
    }).setOrigin(0.5);
    this.breathTimerText = this.scene.add.text(0, 0, '5', {
      fontFamily: 'Arial, sans-serif', fontSize: '42px', color: '#ffffff',
      shadow: { color: '#000000', blur: 10, stroke: true, fill: true }
    }).setOrigin(0.5);
    // Breathing speed selector
    const speedLabel = this.scene.add.text(0, 250, 'Breathing Speed:', {
      fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#c9c9c9', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.speedSelector = this.createSpeedSelector(0, 290);
    this.exerciseSkipButton = this.createButton(0, 360, 'Skip', () => this.skip(), true, this.exerciseContainer);
    this.exerciseContainer.add([
        this.mandalaContainer, 
        this.guidanceText, 
        this.timerText, 
        this.breathTimerText, 
        speedLabel, 
        this.speedSelector, 
        this.exerciseSkipButton
    ]);
    this.exerciseContainer.setVisible(false);
    this.container.add(this.exerciseContainer);
  }

  startExercise() {
    this.popupContainer.setVisible(false);
    // Hide the HTML settings when the exercise starts
    this.exerciseContainer.setVisible(true);
    // Make sure the controls are visible when the exercise starts
    if (this.speedSelector) {
      this.speedSelector.setVisible(true);
      this.exerciseSkipButton.setVisible(true);
    }
    this.isExercising = true;
    // Switch to breathing stats display
    if (this.statsDisplayCallbacks.hideForBreathing) {
      this.statsDisplayCallbacks.hideForBreathing();
    }
    this.timer = this.scene.time.addEvent({
      delay: 1000,
      callback: () => {
        // Check if exercise is still active before updating
        if (!this.isExercising || !this.timerText) return;
        
        this.duration--;
        const minutes = Math.floor(this.duration / 60);
        const seconds = this.duration % 60;
        
        // Safety check before updating text
        if (this.timerText && !this.timerText.scene) {
          // Text object has been destroyed, stop the timer
          if (this.timer) this.timer.remove();
          return;
        }
        
        if (this.timerText) {
          this.timerText.setText(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        }
        
        this.updateProgressRing();
        this.updateCoherenceBar();
        if (this.duration <= 0 && !this.isExtended) {
          this.enterExtendedMode();
        }
      },
      loop: true,
    });
    
    // Add a high-frequency timer for live stats updates (every 200ms for smooth feeling)
    this.statsUpdateTimer = this.scene.time.addEvent({
      delay: 200,
      callback: () => {
        if (!this.isExercising) return;
        this.updateLiveBreathingStats();
      },
      loop: true,
    });
    this.animateBreathing();
    this.showGuidanceMessages();
  }
  animateBreathing() {
    // Get duration based on speed
    const breathDurations = {
      slow: 6000,    // 6 seconds each way (12 second full cycle)
      normal: 5000,  // 5 seconds each way (10 second full cycle)
      fast: 4000     // 4 seconds each way (8 second full cycle)
    };
    
    const duration = breathDurations[this.settings.speed] || 5000;
    
    // Animate the mandala image
    this.breathingTween = this.scene.tweens.add({
        targets: this.mandalaImage,
        scale: { from: 0.35, to: 0.55 },
        angle: { from: 0, to: 15 },
        duration: duration,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
        onYoyo: () => {
            // Safety check before updating text
            if (this.isExercising && this.guidanceText && this.guidanceText.scene) {
                this.guidanceText.setText('Breathe Out...');
                this.startBreathTimer(duration);
            }
        },
        onRepeat: () => {
            // Safety check before updating text
            if (this.isExercising && this.guidanceText && this.guidanceText.scene) {
                this.guidanceText.setText('Breathe In...');
                this.startBreathTimer(duration);
            }
        },
    });
    // Animate the central core's glow
    this.glowTween = this.scene.tweens.add({
        targets: this.mandalaCore,
        scale: { from: 1, to: 1.2 },
        alpha: { from: 0.6, to: 1 },
        duration: duration,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
    });
    
    this.startBreathTimer(duration);
  }
  
  startBreathTimer(duration = 5000) {
    if (this.breathCountdown) {
      this.breathCountdown.remove();
    }
    
    // Calculate breath seconds based on duration
    let breathSeconds = Math.round(duration / 1000);
    this.breathTimerText.setText(breathSeconds);
    
    this.breathCountdown = this.scene.time.addEvent({
      delay: 1000,
      callback: () => {
        breathSeconds--;
        if (breathSeconds > 0 && this.breathTimerText && this.breathTimerText.scene) {
          this.breathTimerText.setText(breathSeconds);
        }
      },
      repeat: Math.round(duration / 1000) - 1
    });
  }
  
  showGuidanceMessages() {
      const messages = [
        "Focus on your heart.",
        "Imagine warmth spreading.",
        "Feel a sense of calm.",
        "Cultivate a positive feeling.",
        "Breathe in peace."
      ];
      let messageIndex = 0;
      
      const changeMessage = () => {
        const guidance = this.scene.add.text(0, -240, messages[messageIndex], {
          fontFamily: 'Arial, sans-serif', fontSize: '24px', color: '#c9c9c9', fontStyle: 'italic'
        }).setOrigin(0.5).setAlpha(0);
        this.exerciseContainer.add(guidance);
        
        this.scene.tweens.add({
          targets: guidance,
          alpha: 1,
          duration: 2000,
          yoyo: true,
          hold: 6000,
          ease: 'Sine.easeInOut',
          onComplete: () => guidance.destroy()
        });

        messageIndex = (messageIndex + 1) % messages.length;
      };

      changeMessage();
      this.guidanceTimer = this.scene.time.addEvent({ delay: 10000, callback: changeMessage, loop: true });
  }

  updateProgressRing() {
    const progress = this.isExtended ? 1 : (this.initialDuration - this.duration) / this.initialDuration;
    const angle = progress * 360 - 90;
    this.progressRing.clear();
  }
  finish() {
    const sessionDurationMinutes = (this.isExtended ? this.initialDuration + this.extendedTime : this.duration > 0 ? this.initialDuration - this.duration : this.initialDuration) / 60;
    // Only award shields if the full 3-minute session was completed (i.e., we're in extended mode or completed the full initial duration)
    const completedFullSession = this.isExtended || this.duration <= 0;
    this.scene.statsTracker.completeBreathingSession(sessionDurationMinutes, completedFullSession);
    this.cleanup();
    if (this.callbacks && this.callbacks.onComplete) {
        this.callbacks.onComplete(sessionDurationMinutes, false);
    }
  }
  
  skip() {
    // Calculate and save accumulated coherence time before skipping
    const timeSpent = this.isExtended ? 
      this.initialDuration + this.extendedTime : 
      this.initialDuration - this.duration;
    
    if (timeSpent > 0) {
      const sessionDurationMinutes = timeSpent / 60;
      // When skipping, never award shields (completedFullSession = false)
      this.scene.statsTracker.completeBreathingSession(sessionDurationMinutes, false);
    }
    
    this.cleanup();
    if (this.callbacks && this.callbacks.onComplete) {
        const sessionDurationMinutes = timeSpent / 60;
        this.callbacks.onComplete(sessionDurationMinutes, true); // wasSkipped = true
    }
  }

  cleanup() {
    // Set flag first to prevent timer callbacks
    this.isExercising = false;
    
    
    // Remove all timers and tweens
    if (this.timer) {
      this.timer.remove();
      this.timer = null;
    }
    if (this.statsUpdateTimer) {
      this.statsUpdateTimer.remove();
      this.statsUpdateTimer = null;
    }
    if (this.guidanceTimer) {
      this.guidanceTimer.remove();
      this.guidanceTimer = null;
    }
    if (this.breathCountdown) {
      this.breathCountdown.remove();
      this.breathCountdown = null;
    }
    if (this.breathingTween) {
      this.breathingTween.stop();
      this.breathingTween.destroy();
      this.breathingTween = null;
    }
    if (this.glowTween) {
      this.glowTween.stop();
      this.glowTween.destroy();
      this.glowTween = null;
    }
    if (this.particleEmitter) {
      this.particleEmitter.stop();
    }
    
    this.container.setVisible(false);
    
    // Switch back to game stats display
    if (this.scene.uiManager && this.scene.uiManager.statsDisplay) {
      this.scene.uiManager.statsDisplay.showFromBreathing();
      
      // Update final breathing stats when exercise ends
      const stats = this.scene.statsTracker.getStats();
      const finalStats = {
        totalCoherenceTime: stats.totalCoherenceTime,
        predictionBoost: this.scene.uiManager.statsDisplay.calculatePredictionBoost(),
        dailyCoherenceTime: stats.dailyCoherenceTime || 0,
        dailyStreak: stats.dailyBreathingStreak || 0,
        progress: 0,
        isActive: false
      };
      this.scene.uiManager.statsDisplay.updateBreathingStats(finalStats);
    }
    
    if (this.extendedModeContainer) this.extendedModeContainer.destroy();
  }
  createMysticalCircle() {
    this.mandalaContainer = this.scene.add.container(0, 0);
    
    // Static background geometry
    const staticGeometry = this.scene.add.graphics();
    staticGeometry.lineStyle(1, 0x8a2be2, 0.1);
    for(let i=0; i<12; i++) {
      staticGeometry.strokeCircle(0, 0, 30 + i * 15);
    }
    staticGeometry.setAlpha(0.5);
    this.mandalaContainer.add(staticGeometry);
    // Swirling background particles
    this.particleEmitter = this.scene.add.particles(0, 0, 'particle', {
        x: 0,
        y: 0,
        speed: { min: 20, max: 40 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.5, end: 0 },
        alpha: { start: 0.4, end: 0 },
        lifespan: 4000,
        blendMode: 'ADD',
        tint: [0x8a2be2, 0x00e5ff],
        emitZone: { source: new Phaser.Geom.Circle(0, 0, 120), type: 'edge', quantity: 60 },
        frequency: 200,
    });
    this.mandalaContainer.add(this.particleEmitter);
    // Central glowing core
    this.mandalaCore = this.scene.add.graphics();
    this.mandalaCore.fillStyle(0x00e5ff, 0.2);
    this.mandalaCore.fillCircle(0, 0, 50);
    this.mandalaCore.setBlendMode(Phaser.BlendModes.ADD);
    this.mandalaContainer.add(this.mandalaCore);
    // Create the breathing mandala image - check if texture exists first
    if (this.scene.textures.exists('mandala')) {
        this.mandalaImage = this.scene.add.image(0, 0, 'mandala');
        this.mandalaImage.setScale(0.35);
        this.mandalaImage.setBlendMode(Phaser.BlendModes.SCREEN);
        this.mandalaImage.setAlpha(0.7); // Slightly adjusted for a softer glow
        this.mandalaContainer.add(this.mandalaImage);
    } else {
        console.warn('Mandala texture not found - breathing exercise will use geometric patterns only');
    }
  }
  createButton(x, y, text, callback, isPrimary = false, container) {
    const buttonWidth = 200;
    const buttonHeight = 60;
    
    const button = this.scene.add.text(x, y, text, {
      fontFamily: 'Arial, sans-serif', fontSize: '24px', color: '#00e5ff', backgroundColor: '#2d0b4b', padding: { x: 30, y: 18 }
    }).setOrigin(0.5);
    
    const hitArea = new Phaser.Geom.Rectangle(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight);
    button.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains, { useHandCursor: true });
    
    // If it's a primary button, add a larger, invisible hit area behind it
    // This prevents other interactive objects from stealing focus
    if (isPrimary && container) {
        const blocker = this.scene.add.zone(x, y, buttonWidth, buttonHeight).setInteractive();
        blocker.on('pointerup', (pointer, localX, localY, event) => {
            event.stopPropagation();
            // Manually trigger the button's callback logic
            this.scene.playSound('button_ambience');
            this.scene.tweens.add({ 
                targets: button, 
                scale: 0.95, 
                duration: 100, 
                ease: 'Sine.easeIn', 
                yoyo: true, 
                onComplete: callback 
            });
        });
        container.add(blocker);
        container.sendToBack(blocker); // Ensure blocker is behind the visible button
    }
    
    // Handle both mouse and touch events
    button.on('pointerover', () => {
      this.scene.playSound('button_hover_click');
      this.scene.tweens.add({ targets: button, scale: 1.05, duration: 200, ease: 'Sine.easeOut' });
    });
    button.on('pointerout', () => {
      this.scene.tweens.add({ targets: button, scale: 1, duration: 200, ease: 'Sine.easeIn' });
    });
    
    // Use pointerup instead of pointerdown for better mobile experience
    button.on('pointerup', (pointer, localX, localY, event) => {
      // Prevent event bubbling
      event.stopPropagation();
      this.scene.playSound('button_ambience');
      this.scene.tweens.add({ 
        targets: button, 
        scale: 0.95, 
        duration: 100, 
        ease: 'Sine.easeIn', 
        yoyo: true, 
        onComplete: callback 
      });
    });
    
    // Add visual feedback for touch
    button.on('pointerdown', () => {
      this.scene.tweens.add({ targets: button, scale: 0.95, duration: 100, ease: 'Sine.easeIn' });
    });
    
    return button;
  }
  createSpeedSelector(x, y) {
    const container = this.scene.add.container(x, y);
    this.speedOptions = ['slow', 'normal', 'fast'];
    this.speedLabels = ['Slow & Deep', 'Normal', 'Quick & Light'];
    this.currentSpeedIndex = this.speedOptions.indexOf(this.settings.speed);
    // Create background
    const selectorBg = this.scene.add.graphics();
    selectorBg.fillStyle(0x2d0b4b, 0.8);
    selectorBg.fillRoundedRect(-120, -20, 240, 40, 20);
    selectorBg.lineStyle(1, 0x8a2be2, 0.8);
    selectorBg.strokeRoundedRect(-120, -20, 240, 40, 20);
    // Left arrow
    this.leftArrow = this.scene.add.text(-100, 0, '◀', {
      fontFamily: 'Arial, sans-serif', fontSize: '20px', color: '#00e5ff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    // Speed text
    this.speedText = this.scene.add.text(0, 0, this.speedLabels[this.currentSpeedIndex], {
      fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);
    // Right arrow
    this.rightArrow = this.scene.add.text(100, 0, '▶', {
      fontFamily: 'Arial, sans-serif', fontSize: '20px', color: '#00e5ff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    // Arrow interactions
    this.leftArrow.on('pointerup', (pointer, localX, localY, event) => {
      event.stopPropagation();
      this.scene.playSound('button_hover_click');
      this.currentSpeedIndex = (this.currentSpeedIndex - 1 + this.speedOptions.length) % this.speedOptions.length;
      this.updateSpeedSetting();
    });
    this.rightArrow.on('pointerup', (pointer, localX, localY, event) => {
      event.stopPropagation();
      this.scene.playSound('button_hover_click');
      this.currentSpeedIndex = (this.currentSpeedIndex + 1) % this.speedOptions.length;
      this.updateSpeedSetting();
    });
    container.add([selectorBg, this.leftArrow, this.speedText, this.rightArrow]);
    return container;
  }
  
  updateSpeedSelector() {
    if (this.speedText) {
      this.speedText.setText(this.speedLabels[this.currentSpeedIndex]);
    }
  }
  
  updateSpeedSetting() {
    this.updateSpeedSelector();
    this.settings.speed = this.speedOptions[this.currentSpeedIndex];
    this.callbacks.onSpeedChange(this.settings.speed);
    
    
    // If exercise is active, restart breathing animation with new speed
    if (this.isExercising && this.breathingTween) {
      this.breathingTween.stop();
      this.breathingTween.destroy();
      this.breathingTween = null;
      if (this.glowTween) {
        this.glowTween.stop();
        this.glowTween.destroy();
        this.glowTween = null;
      }
      if (this.breathCountdown) this.breathCountdown.remove();
      this.animateBreathing();
    }
  }
  createDropdown(x, y, options, initialIndex, callback) {
    const container = this.scene.add.container(x, y);
    const width = 120;
    const height = 35;
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x2d0b4b, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
    bg.lineStyle(2, 0x8a2be2, 1);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
    const label = this.scene.add.text(0, 0, options[initialIndex].text, {
      fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#00e5ff'
    }).setOrigin(0.5);
    const arrow = this.scene.add.text(width / 2 - 15, 0, '▼', {
      fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#00e5ff'
    }).setOrigin(0.5);
    
    container.add([bg, label, arrow]);
    container.setInteractive(new Phaser.Geom.Rectangle(-width/2, -height/2, width, height), Phaser.Geom.Rectangle.Contains, { useHandCursor: true });
    let isOpen = false;
    
    // Create dropdown items container with absolute positioning relative to the popup center
    const dropdownItems = this.scene.add.container(0, 0);
    if (dropdownItems) {
      dropdownItems.setVisible(false).setDepth(6100); // Ensure it's on top of popups and menu
    }
    options.forEach((option, index) => {
      const itemY = index * height;
      const itemBg = this.scene.add.graphics()
        .fillStyle(0x2d0b4b, 1)
        .fillRect(-width/2, itemY, width, height)
        .lineStyle(1, 0x8a2be2, 0.5)
        .strokeRect(-width/2, itemY, width, height);
      
      const itemText = this.scene.add.text(0, itemY + height/2, option.text, { 
        fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#c9c9c9' 
      }).setOrigin(0.5);
      
      const itemZone = this.scene.add.zone(-width/2, itemY, width, height).setOrigin(0,0).setInteractive({useHandCursor: true});
      itemZone.on('pointerup', (pointer, localX, localY, event) => {
        event.stopPropagation();
        label.setText(option.text);
        callback(index);
        isOpen = false;
        dropdownItems.setVisible(false);
        arrow.setText('▼');
      });
      
      dropdownItems.add([itemBg, itemText, itemZone]);
    });
    container.dropdownItems = dropdownItems;
    // Improve dropdown touch handling
    container.on('pointerup', (pointer, localX, localY, event) => {
      event.stopPropagation();
      isOpen = !isOpen;
      dropdownItems.setVisible(isOpen);
      arrow.setText(isOpen ? '▲' : '▼');
      
      // Update dropdown position when opened
      if (isOpen) {
        // Get the world position of the dropdown container to position the items correctly
        const worldPos = container.getWorldTransformMatrix();
        dropdownItems.x = worldPos.tx;
        dropdownItems.y = worldPos.ty + height / 2;
      }
    });
    return container;
  }
  createCheckbox(x, y, label, isChecked, callback) {
    const container = this.scene.add.container(x, y);
    const boxSize = 20;
    const box = this.scene.add.graphics();
    box.lineStyle(2, 0x8a2be2, 1);
    box.strokeRect(-boxSize / 2, -boxSize / 2, boxSize, boxSize);
    const checkmark = this.scene.add.text(0, 0, '✔', {
        fontSize: '16px', color: '#00e5ff'
    }).setOrigin(0.5).setVisible(isChecked);
    
    const labelText = this.scene.add.text(boxSize / 2 + 10, 0, label, {
        fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#c9c9c9'
    }).setOrigin(0, 0.5);
    container.add([box, checkmark, labelText]);
    
    // Calculate total width and center the entire checkbox
    const totalWidth = boxSize + 10 + labelText.width;
    const hitArea = new Phaser.Geom.Rectangle(-totalWidth/2, -boxSize/2, totalWidth, boxSize);
    container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains, { useHandCursor: true });
    
    // Adjust positions to center everything
    box.x = -totalWidth/2 + boxSize/2;
    checkmark.x = -totalWidth/2 + boxSize/2;
    labelText.x = -totalWidth/2 + boxSize + 10;
    let checked = isChecked;
    // Improve checkbox touch handling
    container.on('pointerup', (pointer, localX, localY, event) => {
        event.stopPropagation();
        checked = !checked;
        checkmark.setVisible(checked);
        callback(checked);
        this.scene.playSound('button_hover_click');
    });
    return container;
  }
  show() {
    // Don't show the initial popup if the exercise is already running
    if (this.isExercising) {
      return;
    }
    
    if (!this.isVisible) {
      this.isVisible = true;
      if (this.container) {
        this.container.setVisible(true).setAlpha(0);
        this.scene.tweens.add({ targets: this.container, alpha: 1, duration: 300 });
      }
    }
  }
  updateCoherenceBar() {
      const progress = Math.min(1, (this.initialDuration - this.duration) / this.initialDuration);
      this.scene.uiManager.updateCoherenceMeter(progress, this.isExercising);
  }
  updateLiveBreathingStats() {
    if (this.scene.uiManager && this.scene.uiManager.statsDisplay) {
      // Calculate coherence time based on how long the exercise has been running
      const currentSessionTimeInSeconds = this.isExtended ? 
        this.initialDuration + this.extendedTime : 
        this.initialDuration - this.duration;
      
      // Provide safe default values to prevent runtime errors
      const stats = this.scene.statsTracker.getStats();
      
      // Convert session time to minutes and ensure it's positive
      const sessionTimeInMinutes = Math.max(0, currentSessionTimeInSeconds / 60);
      
      // Combine stored coherence times with current live session time
      // Ensure we're using consistent data types and handling nulls properly
      const storedDailyTime = parseFloat(stats.dailyCoherenceTime) || 0;
      const storedTotalTime = parseFloat(stats.totalCoherenceTime) || 0;
      
      const liveDailyCoherenceTime = storedDailyTime + sessionTimeInMinutes;
      const liveTotalCoherenceTime = storedTotalTime + sessionTimeInMinutes;
      const breathingStats = {
        totalCoherenceTime: liveTotalCoherenceTime, // Live-updating total
        dailyCoherenceTime: liveDailyCoherenceTime, // Live-updating daily
        predictionBoost: 0.0,
        dailyStreak: stats.dailyBreathingStreak || 0,
        progress: this.isExtended ? 1.0 : (this.initialDuration - this.duration) / this.initialDuration,
        isActive: this.isExercising
      };
      
      this.scene.uiManager.statsDisplay.updateBreathingStats(breathingStats);
    }
  }
  enterExtendedMode() {
    this.isExtended = true;
    if (this.timer) this.timer.remove();
    if (this.callbacks && this.callbacks.onThreeMinutesComplete) {
        this.callbacks.onThreeMinutesComplete();
    }
    this.guidanceText.setText("Continue as long as you wish...");
    
    // Convert skip button to finish button
    if (this.exerciseSkipButton) {
      this.exerciseSkipButton.setText('Finish');
      this.exerciseSkipButton.removeAllListeners('pointerup'); // Clear previous 'skip' listener
      this.exerciseSkipButton.on('pointerup', () => {
        this.scene.playSound('button_ambience');
        this.scene.tweens.add({
          targets: this.exerciseSkipButton,
          scale: 0.95,
          duration: 100,
          ease: 'Sine.easeIn',
          yoyo: true,
          onComplete: () => this.finish()
        });
      });
    }
    
    // Timer counts up now
    this.timer = this.scene.time.addEvent({
      delay: 1000,
      callback: () => {
        // Check if exercise is still active before updating
        if (!this.isExercising || !this.timerText) return;
        
        this.extendedTime++;
        const totalSeconds = this.initialDuration + this.extendedTime;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        
        // Safety check before updating text
        if (this.timerText && !this.timerText.scene) {
          // Text object has been destroyed, stop the timer
          if (this.timer) this.timer.remove();
          return;
        }
        
        if (this.timerText) {
          this.timerText.setText(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        }
      },
      loop: true,
    });
    
    // Continue the high-frequency stats updates in extended mode
    if (!this.statsUpdateTimer) {
      this.statsUpdateTimer = this.scene.time.addEvent({
        delay: 200,
        callback: () => {
          if (!this.isExercising) return;
          this.updateLiveBreathingStats();
        },
        loop: true,
      });
    }
  }
  destroy() {
    this.cleanup();
    // Clean up dropdown items that were added directly to scene
    if (this.thresholdSelector && this.thresholdSelector.dropdownItems) {
      this.thresholdSelector.dropdownItems.destroy();
    }
    this.container.destroy();
  }
}