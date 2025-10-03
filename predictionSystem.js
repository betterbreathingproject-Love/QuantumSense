export class PredictionSystem {
  constructor(scene, uiManager, getJournalState = null) {
    this.scene = scene;
    this.uiManager = uiManager;
    this.getJournalState = getJournalState;
    this.buttons = [];
    this.container = this.scene.add.container().setDepth(200);
    
    this.title = this.scene.add.text(0, 0, 'Focus your intuition and predict:', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#c9c9c9'
    }).setOrigin(0.5);
    this.container.add(this.title);
    
    // Container for the prediction buttons
    this.buttonContainer = this.scene.add.container(0, 0);
    this.container.add(this.buttonContainer);
    
    // Create all 6 prediction buttons but keep them hidden initially
    for (let i = 0; i < 6; i++) {
        const buttonContainer = this.createButton(i + 1, 0, 0);
        buttonContainer.setVisible(false);
        this.buttons.push(buttonContainer);
        this.buttonContainer.add(buttonContainer);
    }
    
    this.container.setVisible(false);
  }
  createButton(number, x, y) {
    const size = 100;
    const container = this.scene.add.container(x, y);
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0x2d0b4b, 0.8);
    graphics.fillRoundedRect(-size/2, -size/2, size, size, 20);
    graphics.lineStyle(2, 0x8a2be2, 1);
    graphics.strokeRoundedRect(-size/2, -size/2, size, size, 20);
    const glow = this.scene.add.graphics();
    glow.lineStyle(4, 0x8a2be2, 1);
    glow.strokeRoundedRect(-size/2, -size/2, size, size, 20);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    glow.setVisible(false);
    const activeLevel = this.scene.currentActiveLevel;
    const isCoinFlip = activeLevel === 1;
    const isCatInBox = activeLevel === 2;
    const isEmotionalIntuition = activeLevel === 3;
    let buttonText;
    if (isCoinFlip) {
        buttonText = number === 1 ? 'Heads' : 'Tails';
    } else if (isCatInBox) {
        buttonText = `Box ${number}`;
    } else {
        buttonText = number.toString();
    }
    const fontSize = isCoinFlip || isCatInBox ? '32px' : isEmotionalIntuition ? '24px' : '48px';
    const text = this.scene.add.text(0, 0, buttonText, {
      fontFamily: 'Arial, sans-serif',
      fontSize: fontSize,
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add([graphics, glow, text]);
    container.setSize(size, size).setInteractive({ useHandCursor: true });
    
    container.on('pointerover', () => {
        const journalOpen = this.getJournalState ? this.getJournalState() : false;
        if(this.scene.gameState === 'predicting' && !journalOpen) {
            this.scene.playSound('button_hover_click');
            glow.setVisible(true);
            this.scene.tweens.add({ targets: container, scale: 1.05, duration: 200, ease: 'Sine.easeOut' });
        }
    });
    container.on('pointerout', () => {
        glow.setVisible(false);
        this.scene.tweens.add({ targets: container, scale: 1, duration: 200, ease: 'Sine.easeIn' });
    });
    container.on('pointerdown', () => {
        const journalOpen = this.getJournalState ? this.getJournalState() : false;
        if (this.scene.gameState === 'predicting' && !journalOpen) {
            // Enhanced sound effects
            this.scene.playSound('button_ambience');
            
            // Trigger yantra spinning burst on prediction click
            if (this.scene.triggerYantraSpinBurst) {
                this.scene.triggerYantraSpinBurst();
            }
            
            // Create extreme click animation sequence
            this.createExtremeClickEffect(container, number);
            
            // Slight delay before prediction to let animation start
            this.scene.time.delayedCall(50, () => {
                this.selectPrediction(number);
            });
        }
    });
    
    return container;
  }
  selectPrediction(number) {
    this.scene.onPredictionMade(number);
  }
  show() {
      console.log('PredictionSystem.show() called');
      console.log('Container visible before:', this.container.visible);
      console.log('Container alpha before:', this.container.alpha);
      console.log('Container position:', this.container.x, this.container.y);
      
      this.updateButtonLayout();
      // Only tween alpha if it's not already visible
      if (!this.container.visible) {
          console.log('Making container visible and tweening alpha');
          this.container.setVisible(true);
          this.container.setAlpha(0);
          this.scene.tweens.add({
              targets: this.container,
              alpha: 1,
              duration: 300,
              ease: 'Sine.easeOut',
              onComplete: () => {
                  console.log('Prediction system show tween completed');
                  console.log('Final container alpha:', this.container.alpha);
                  console.log('Final container visible:', this.container.visible);
              }
          });
      } else {
          console.log('Container already visible, just updating layout');
      }
  }
  hide() {
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 200,
      ease: 'Sine.easeIn',
      onComplete: () => {
        if (this.container && typeof this.container.setVisible === 'function') {
          this.container.setVisible(false);
        }
      }
    });
  }
  
  setInteractive(isInteractive) {
    this.buttons.forEach(button => {
        button.setInteractive(isInteractive);
    });
  }
  
  // Level selector methods removed - functionality moved to debug menu
  updateButtonLayout() {
    const maxLevelUnlocked = this.scene.statsTracker.getStats().psychicLevel;
    const activeLevel = this.scene.currentActiveLevel;
    let numOptions;
    if (activeLevel === 2) { // Cat in the box
        numOptions = 3;
        this.title.setText('Where is the cat hiding?');
    } else if (activeLevel === 1) { // Coin flip
        numOptions = 2;
        this.title.setText(this.scene.gameMode === 'sense' ? 'Focus your intuition and predict:' : 'Focus your will and influence:');
    } else if (activeLevel === 3) { // Emotional Intuition (moved to Level 3)
        numOptions = 2;
        this.title.setText('Sense the emotional energy:');
    } else {
        numOptions = Math.min(6, activeLevel + 1);
        this.title.setText(this.scene.gameMode === 'sense' ? 'Focus your intuition and predict:' : 'Focus your will and influence:');
    }
    const width = this.scene.sys.game.config.width;
    const height = this.scene.sys.game.config.height;
    const buttonSize = 100;
    const buttonMargin = 20;
    const totalWidth = (numOptions > 3 ? 3 : numOptions) * (buttonSize + buttonMargin) - buttonMargin;
    this.container.x = width / 2;
    this.container.y = height - 280; // Move up to make space for level selector
    this.title.y = -100;
    
    // Update prediction buttons
    this.buttons.forEach((button, i) => {
        if (i < numOptions) {
            button.setVisible(true);
            // Update text based on level
            const text = button.getAt(2); // Get the text object
            if (activeLevel === 1) {
                const coinLabels = ['Heads', 'Tails'];
                text.setText(coinLabels[i]);
                text.setFontSize('32px');
            } else if (activeLevel === 2) {
                const boxLabels = ['1📦', '2📦', '3📦'];
                text.setText(boxLabels[i]);
                text.setFontSize('32px');
            } else if (activeLevel === 3) {
                const emotionLabels = ['Calm', 'Emotional'];
                text.setText(emotionLabels[i]);
                // Update font size for emotional intuition buttons to ensure text fits
                text.setFontSize('24px');
            } else {
                text.setText((i + 1).toString());
                text.setFontSize('48px');
            }
            
            // Position buttons in a grid
            if (numOptions <= 3) {
                // Single row
                button.x = -totalWidth / 2 + i * (buttonSize + buttonMargin) + buttonSize / 2;
                button.y = 0;
            } else {
                // Two rows
                const row = Math.floor(i / 3);
                const col = i % 3;
                const rowWidth = Math.min(3, numOptions - row * 3) * (buttonSize + buttonMargin) - buttonMargin;
                button.x = -rowWidth / 2 + col * (buttonSize + buttonMargin) + buttonSize / 2;
                button.y = row * (buttonSize + buttonMargin);
            }
        } else {
            button.setVisible(false);
        }
    });
  }
  
  updateLevelSelector(maxLevelUnlocked, activeLevel) {
    // Level selector functionality removed
  }
  animateNewButton(level) {
    // Level selector animation functionality removed - now handled by debug menu
  }
  
  createExtremeClickEffect(container, number) {
    const x = container.x;
    const y = container.y;
    
    // MASSIVE screen shake for prediction
    this.scene.cameras.main.shake(400, 0.015);
    
    // Multi-stage compression and explosion
    this.scene.tweens.add({
        targets: container,
        scale: 0.5,
        duration: 60,
        ease: 'Power3.easeIn',
        onComplete: () => {
            // EXPLOSIVE bounce back
            this.scene.tweens.add({
                targets: container,
                scale: 1.6,
                duration: 150,
                ease: 'Back.easeOut.config(4)',
                onComplete: () => {
                    // Secondary bounce
                    this.scene.tweens.add({
                        targets: container,
                        scale: 0.9,
                        duration: 100,
                        ease: 'Power2',
                        onComplete: () => {
                            // Final settle with elastic
                            this.scene.tweens.add({
                                targets: container,
                                scale: 1,
                                duration: 400,
                                ease: 'Elastic.easeOut.config(2, 0.3)'
                            });
                        }
                    });
                }
            });
        }
    });
    
    // Create multiple expanding energy rings
    for (let i = 0; i < 4; i++) {
        this.scene.time.delayedCall(i * 80, () => {
            const energyRing = this.scene.add.graphics();
            energyRing.setDepth(999);
            energyRing.setPosition(this.container.x + x, this.container.y + y);
            energyRing.setBlendMode(Phaser.BlendModes.ADD);
            
            this.scene.tweens.add({
                targets: energyRing,
                scaleX: { from: 0.1, to: 4 + i },
                scaleY: { from: 0.1, to: 4 + i },
                alpha: { from: 0.8, to: 0 },
                duration: 800,
                ease: 'Cubic.easeOut',
                onStart: () => {
                    energyRing.lineStyle(6 - i, 0x00e5ff, 1);
                    energyRing.strokeCircle(0, 0, 40);
                },
                onComplete: () => energyRing.destroy()
            });
        });
    }
    
    // Color flash effect on the button
    const buttonGraphics = container.list.find(c => c.type === 'Graphics' && c.blendMode !== Phaser.BlendModes.ADD);
    if (buttonGraphics) {
        const originalFillColor = 0x2d0b4b;
        const flashColor = 0x00e5ff;
        
        // Flash to bright color
        buttonGraphics.fillStyle(flashColor, 1);
        buttonGraphics.fillRoundedRect(-50, -50, 100, 100, 20);
        
        // Fade back to original
        this.scene.tweens.add({
            targets: { tint: 1 },
            tint: 0,
            duration: 400,
            ease: 'Cubic.easeOut',
            onUpdate: (tween) => {
                const progress = tween.progress;
                const currentColor = Phaser.Display.Color.Interpolate.ColorWithColor(
                    Phaser.Display.Color.ValueToColor(flashColor),
                    Phaser.Display.Color.ValueToColor(originalFillColor),
                    1,
                    progress
                );
                buttonGraphics.clear();
                buttonGraphics.fillStyle(Phaser.Display.Color.GetColor(currentColor.r, currentColor.g, currentColor.b), 0.8);
                buttonGraphics.fillRoundedRect(-50, -50, 100, 100, 20);
                buttonGraphics.lineStyle(2, 0x8a2be2, 1);
                buttonGraphics.strokeRoundedRect(-50, -50, 100, 100, 20);
            }
        });
    }
    
    // MEGA explosion particle effect with multiple emitters
    const megaEmitter = this.scene.add.particles(this.container.x + x, this.container.y + y, 'particle', {
        speed: { min: 300, max: 700 },
        angle: { min: 0, max: 360 },
        scale: { start: 1.2, end: 0 },
        blendMode: 'ADD',
        lifespan: 1200,
        tint: [0x00e5ff, 0x8a2be2, 0xffffff, 0xffff00],
        gravityY: 50,
        quantity: 15,
        frequency: 30
    });
    megaEmitter.setDepth(1000);
    megaEmitter.explode(80);
    
    // Secondary spiral emitter with enhanced effects
    const spiralEmitter = this.scene.add.particles(this.container.x + x, this.container.y + y, 'star', {
        speed: { min: 200, max: 500 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.8, end: 0 },
        blendMode: 'ADD',
        lifespan: 1000,
        tint: [0x00e5ff, 0x8a2be2],
        gravityY: -100
    });
    spiralEmitter.setDepth(999);
    spiralEmitter.explode(40);
    
    // Add intuition-themed particle burst
    const intuitionEmitter = this.scene.add.particles(this.container.x + x, this.container.y + y, 'particle', {
        speed: { min: 100, max: 250 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.6, end: 0 },
        blendMode: 'ADD',
        lifespan: 1500,
        tint: [0x9400d3, 0x4b0082, 0x8a2be2], // Purple/violet theme for intuition
        alpha: { start: 0.8, end: 0 },
        quantity: 12,
        frequency: 40
    });
    intuitionEmitter.setDepth(1001);
    intuitionEmitter.explode(35);
    
    // Create ring wave effect
    const ringWave = this.scene.add.graphics();
    ringWave.setDepth(999);
    ringWave.setPosition(this.container.x + x, this.container.y + y);
    ringWave.setBlendMode(Phaser.BlendModes.ADD);
    
    this.scene.tweens.add({
        targets: ringWave,
        scaleX: { from: 0.1, to: 3 },
        scaleY: { from: 0.1, to: 3 },
        alpha: { from: 0.8, to: 0 },
        duration: 600,
        ease: 'Cubic.easeOut',
        onStart: () => {
            ringWave.lineStyle(8, 0x00e5ff, 1);
            ringWave.strokeCircle(0, 0, 30);
        },
        onComplete: () => {
            ringWave.destroy();
        }
    });
    
    // Create secondary smaller rings
    for (let i = 0; i < 3; i++) {
        this.scene.time.delayedCall(100 * i, () => {
            const miniRing = this.scene.add.graphics();
            miniRing.setDepth(998);
            miniRing.setPosition(this.container.x + x, this.container.y + y);
            miniRing.setBlendMode(Phaser.BlendModes.ADD);
            
            this.scene.tweens.add({
                targets: miniRing,
                scaleX: { from: 0.1, to: 2 },
                scaleY: { from: 0.1, to: 2 },
                alpha: { from: 0.6, to: 0 },
                duration: 400,
                ease: 'Cubic.easeOut',
                onStart: () => {
                    miniRing.lineStyle(4, 0x8a2be2, 1);
                    miniRing.strokeCircle(0, 0, 20);
                },
                onComplete: () => {
                    miniRing.destroy();
                }
            });
        });
    }
    
    // Clean up particles after animation
    this.scene.time.delayedCall(1200, () => {
        if (megaEmitter) megaEmitter.destroy();
        if (spiralEmitter) spiralEmitter.destroy();
        if (intuitionEmitter) intuitionEmitter.destroy();
    });
    
    // Create screen flash overlay
    const { width, height } = this.scene.sys.game.config;
    const screenFlash = this.scene.add.graphics();
    screenFlash.fillStyle(0x00e5ff, 0.15);
    screenFlash.fillRect(0, 0, width, height);
    screenFlash.setDepth(1001);
    screenFlash.setBlendMode(Phaser.BlendModes.ADD);
    
    this.scene.tweens.add({
        targets: screenFlash,
        alpha: 0,
        duration: 200,
        ease: 'Cubic.easeOut',
        onComplete: () => screenFlash.destroy()
    });
  }
}