export class DiceController {
  constructor(scene) {
    this.scene = scene;
    this.isRolling = false;
    this.breathingTween = null;
    this.createDiceDisplay();
  }
  createDiceDisplay() {
    const width = this.scene.sys.game.config.width;
    const height = this.scene.sys.game.config.height;
    
    this.resultContainer = this.scene.add.container(width / 2, height / 2 - 100);
    const size = 140; // Reduced from 180 to prevent overlapping with top UI
    this.diceGraphics = this.scene.add.graphics();
    this.diceGraphics.fillStyle(0xffffff, 1);
    this.diceGraphics.fillRoundedRect(-size/2, -size/2, size, size, 32);
    
    this.headsSprite = this.scene.add.sprite(0, 0, 'heads');
    // Only reduce coin size: (size / 658.8) for the smaller coin
    const coinScale = size / 775.06; // Reduced coin size only
    this.headsSprite.setScale(coinScale);
    this.headsSprite.setVisible(false);
    // Use LINEAR filtering for smooth anti-aliasing
    this.headsSprite.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    
    this.tailsSprite = this.scene.add.sprite(0, 0, 'tails');
    this.tailsSprite.setScale(coinScale);
    this.tailsSprite.setVisible(false);
    // Use LINEAR filtering for smooth anti-aliasing
    this.tailsSprite.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.catSprite = this.scene.add.text(0, -size, '😻', {
        fontSize: '120px',
        color: '#ffffff',
        align: 'center'
    }).setOrigin(0.5);
    if (this.catSprite) {
      this.catSprite.setVisible(false).setInteractive({ useHandCursor: true });
    }
    
    // Start continuous wiggle animation
    this.catWiggleTween = null;
    
    this.catSprite.on('pointerover', () => {
        if (this.scene.currentActiveLevel === 2 && this.scene.gameState === 'predicting') {
            // Add zoom effect while keeping wiggle animation
            this.scene.tweens.add({
                targets: this.catSprite,
                scale: 1.15,
                duration: 200,
                ease: 'Power2'
            });
        }
    });
    
    this.catSprite.on('pointerout', () => {
        // Return to normal scale but keep wiggle animation
        this.scene.tweens.add({
            targets: this.catSprite,
            scale: 1,
            duration: 200,
            ease: 'Power2'
        });
    });
    
    this.boxes = [];
    for (let i = 0; i < 3; i++) {
        const box = this.createBox(i, size);
        this.boxes.push(box);
    }
    this.glow = this.scene.add.graphics();
    this.glow.setBlendMode(Phaser.BlendModes.ADD);
    
    // Default glow is a rounded rect for dice
    this.setGlowShape();
    
    this.numberText = this.scene.add.text(0, 0, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '100px',
        color: '#000000',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    
    this.resultContainer.add([this.glow, this.diceGraphics, this.headsSprite, this.tailsSprite, this.numberText, this.catSprite, ...this.boxes]);
    this.resultContainer.setSize(size * 3, size).setInteractive({ useHandCursor: true });
    this.resultContainer.setDepth(100); // Set depth below modals (which use 2000-5000)
    
    // Removed omming sound functionality
    this.resultContainer.setVisible(false);
  }
  createBox(index, size) {
    const boxWidth = 100;
    const boxHeight = 80;
    const boxSpacing = 130;
    const box = this.scene.add.container(index * boxSpacing - boxSpacing, size / 2 - boxHeight / 2);
    box.boxId = index; // Add an ID for animations
    const boxBody = this.scene.add.graphics();
    boxBody.fillStyle(0x8B4513, 1);
    boxBody.fillRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
    
    const boxLid = this.scene.add.graphics();
    boxLid.fillStyle(0xA0522D, 1);
    boxLid.fillRect(-boxWidth / 2 - 5, -boxHeight / 2 - 10, boxWidth + 10, 20);
    
    // Add box number
    const boxNumber = this.scene.add.text(0, 0, (index + 1).toString(), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '32px',
        color: '#FFFFFF',
        fontStyle: 'bold',
        stroke: '#8B4513',
        strokeThickness: 3
    }).setOrigin(0.5);
    
    box.add([boxBody, boxLid, boxNumber]);
    box.setSize(boxWidth, boxHeight);
    box.setVisible(false);
    box.setInteractive({ useHandCursor: true });
    box.on('pointerover', () => {
      if (this.scene.currentActiveLevel === 2 && this.scene.gameState === 'predicting') {
        this.scene.tweens.killTweensOf(box); // Stop breathing to jiggle
        this.jiggleBox(box);
      }
    });
    box.on('pointerout', () => {
      if (this.scene.currentActiveLevel === 2 && this.scene.gameState === 'predicting') {
        this.scene.tweens.killTweensOf(box); // Stop jiggle
        box.setScale(1);
        this.startBoxBreathing(box); // Resume breathing
      }
    });
    return box;
  }
  rollDice(finalValue, onComplete) {
    if (this.isRolling) return;
    this.isRolling = true;
    if (this.breathingTween) {
        this.breathingTween.stop();
        this.glow.setScale(1); // Reset glow scale
        this.scene.tweens.add({ targets: this.resultContainer, scale: 1, duration: 200, ease: 'Sine.easeOut' });
    }
    this.scene.playMysticalRollSound();
    this.resultContainer.setVisible(true);
    
    // Choose random animation effect
    const effects = ['bounce', 'spin', 'spiral', 'ghostlyMerge'];
    const selectedEffect = Phaser.Utils.Array.GetRandom(effects);
    
    const rollDuration = 2500;
    const flipDuration = 75;
    let flipCount = 0;
    const numFlips = Math.floor(rollDuration / flipDuration);
    const activeLevel = this.scene.currentActiveLevel;
    const isCoinFlip = activeLevel === 1;
    const isCatInBox = activeLevel === 2;
    const isEmotional = activeLevel === 3;
    // Start the number flipping
    const flip = () => {
        if (flipCount >= numFlips) {
            this.isRolling = false;
            if (onComplete) {
                if (isCatInBox) {
                    // For the cat level, we need to wait for the reveal animation to finish
                    // before calling the main onComplete.
                    // The reveal is now handled in the catInBoxAnimation's onComplete.
                } else {
                    onComplete();
                }
            }
            return;
        }
        if (isCoinFlip) {
            // Swap between heads and tails sprite for the flip effect
            this.headsSprite.setVisible(flipCount % 2 === 0);
            this.tailsSprite.setVisible(flipCount % 2 !== 0);
        } else if (!isCatInBox && !isEmotional) {
            const randomFace = Phaser.Math.Between(1, 6);
            this.numberText.setText(randomFace.toString());
        }
        this.scene.time.delayedCall(flipDuration, flip);
        flipCount++;
    };
    flip();
    
    // Execute the selected animation effect
    if (isCoinFlip) {
        this.coinFlipAnimation(rollDuration);
    } else if (isCatInBox) {
        this.catInBoxAnimation(rollDuration, onComplete);
    } else if (isEmotional) {
        // For emotional level, no dice animation - just wait for the duration then complete
        this.scene.time.delayedCall(rollDuration, () => {
            this.isRolling = false;
            if (onComplete) {
                onComplete();
            }
        });
    } else {
        switch(selectedEffect) {
            case 'bounce':
                this.bounceAnimation(rollDuration);
                break;
            case 'spin':
                this.spinTopAnimation(rollDuration);
                break;
            case 'spiral':
                this.spiralAnimation(rollDuration);
                break;
            case 'ghostlyMerge':
                this.ghostlyMergeAnimation(rollDuration);
                break;
        }
    }
  }
  
  createTrailParticles(color = 0x8a2be2) {
    const emitter = this.scene.add.particles(0, 0, 'particle', {
        speed: { min: 50, max: 150 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.3, end: 0 },
        blendMode: 'ADD',
        lifespan: 800,
        tint: color,
        frequency: 50
    });
    
    emitter.startFollow(this.resultContainer);
    return emitter;
  }
  
  bounceAnimation(duration) {
    const width = this.scene.sys.game.config.width;
    const height = this.scene.sys.game.config.height;
    const startX = this.resultContainer.x;
    const startY = this.resultContainer.y;
    
    // Create bouncing path with multiple bounce points
    const bouncePoints = [
        { x: width - 100, y: 200 },
        { x: 100, y: height - 300 },
        { x: width - 150, y: height - 400 },
        { x: startX, y: startY }
    ];
    
    // Create bouncing particle trail
    const trailEmitter = this.createTrailParticles(0x8a2be2);
    
    let currentPoint = 0;
    const bounceToNext = () => {
        if (currentPoint >= bouncePoints.length) return;
        
        const target = bouncePoints[currentPoint];
        const bounceTime = duration / bouncePoints.length;
        
        this.scene.tweens.add({
            targets: this.resultContainer,
            x: target.x,
            y: target.y,
            duration: bounceTime,
            ease: currentPoint === bouncePoints.length - 1 ? 'Bounce.easeOut' : 'Cubic.easeInOut',
            onComplete: () => {
                currentPoint++;
                if (currentPoint < bouncePoints.length) {
                    bounceToNext();
                } else {
                    this.resultContainer.setAngle(0);
                    // Clean up trail after animation
                    this.scene.time.delayedCall(1000, () => {
                        trailEmitter.destroy();
                    });
                }
            }
        });
        
        // Add rotation during bounce
        this.scene.tweens.add({
            targets: this.resultContainer,
            angle: this.resultContainer.angle + Phaser.Math.RND.between(180, 540),
            duration: bounceTime,
            ease: 'Linear'
        });
    };
    
    bounceToNext();
  }
  
  spinTopAnimation(duration) {
    const startY = this.resultContainer.y;
    
    // Create spinning particle trail with color cycling
    const trailEmitter = this.createTrailParticles(0x8a2be2);
    
    // Change particle color during spin using particle config
    const colorValues = [0x8a2be2, 0x4b0082, 0x00e5ff, 0x9400d3];
    let colorIndex = 0;
    
    const colorCycleTimer = this.scene.time.addEvent({
        delay: (duration * 0.5) / colorValues.length,
        callback: () => {
            trailEmitter.setConfig({ tint: colorValues[colorIndex] });
            colorIndex = (colorIndex + 1) % colorValues.length;
        },
        repeat: -1
    });
    
    // Rapid spinning with wobble effect like a spinning top
    this.scene.tweens.add({
        targets: this.resultContainer,
        angle: 1800, // 5 full rotations
        duration: duration * 0.8,
        ease: 'Cubic.easeOut'
    });
    
    // Wobble effect that increases then decreases
    this.scene.tweens.add({
        targets: this.resultContainer,
        x: this.resultContainer.x + 30,
        duration: duration * 0.3,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: 3
    });
    
    // Slight vertical bounce
    this.scene.tweens.add({
        targets: this.resultContainer,
        y: startY - 20,
        duration: duration * 0.4,
        ease: 'Bounce.easeOut',
        yoyo: true,
        onComplete: () => {
            this.resultContainer.setAngle(0);
            // Clean up trail after animation
            colorCycleTimer.remove(); // Stop the timer
            this.scene.time.delayedCall(800, () => {
                if (trailEmitter.active) { // Check if emitter still exists
                    trailEmitter.destroy();
                }
            });
        }
    });
    
    // Scale pulsing during spin
    this.scene.tweens.add({
        targets: this.resultContainer,
        scale: 1.3,
        duration: duration * 0.6,
        ease: 'Sine.easeInOut',
        yoyo: true
    });
  }
  
  spiralAnimation(duration) {
    const centerX = this.resultContainer.x;
    const centerY = this.resultContainer.y;
    const spiralRadius = 150;
    
    // Create mystical spiral particle trail
    const trailEmitter = this.createTrailParticles(0x9400d3);
    
    // Add extra mystical particles that spiral outward
    const spiralParticles = this.scene.add.particles(centerX, centerY, 'particle', {
        speed: { min: 20, max: 80 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.2, end: 0 },
        blendMode: 'ADD',
        lifespan: 1500,
        tint: [0x9400d3, 0x4b0082, 0x8a2be2],
        frequency: 100,
        gravityY: -50
    });
    
    // Create spiral motion using sequential tweens
    let spiralDelay = 0;
    
    // Spiral outward first
    this.scene.tweens.add({
        targets: this.resultContainer,
        x: centerX + spiralRadius,
        y: centerY,
        duration: duration * 0.25,
        ease: 'Cubic.easeOut',
        onComplete: () => {
            // Start circular spiral motion
            this.createSpiralMotion(centerX, centerY, spiralRadius, duration * 0.6, () => {
                // Final settle to center
                this.scene.tweens.add({
                    targets: this.resultContainer,
                    x: centerX,
                    y: centerY,
                    scale: 1,
                    angle: 0,
                    duration: duration * 0.15,
                    ease: 'Back.easeOut',
                    onComplete: () => {
                        // Clean up particles after animation
                        this.scene.time.delayedCall(1000, () => {
                            trailEmitter.destroy();
                            spiralParticles.destroy();
                        });
                    }
                });
            });
        }
    });
    
    // Rotation during spiral
    this.scene.tweens.add({
        targets: this.resultContainer,
        angle: 1080, // 3 full rotations
        duration: duration * 0.85,
        ease: 'Cubic.easeOut'
    });
  }
  
  createSpiralMotion(centerX, centerY, startRadius, totalDuration, onComplete) {
    const numSpirals = 3;
    const angleIncrement = 120; // degrees per spiral
    let currentSpiral = 0;
    
    const doSpiral = () => {
      if (currentSpiral >= numSpirals) {
        if (onComplete) onComplete();
        return;
      }
      
      const radius = startRadius * (1 - currentSpiral / numSpirals);
      const angle = currentSpiral * angleIncrement;
      const segmentDuration = totalDuration / numSpirals;
      
      const targetX = centerX + Math.cos(Phaser.Math.DegToRad(angle)) * radius;
      const targetY = centerY + Math.sin(Phaser.Math.DegToRad(angle)) * radius;
      
      this.scene.tweens.add({
        targets: this.resultContainer,
        x: targetX,
        y: targetY,
        duration: segmentDuration,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          currentSpiral++;
          doSpiral();
        }
      });
    };
    
    doSpiral();
  }
  ghostlyMergeAnimation(duration) {
    // Simple spinning animation for the dice
    this.scene.tweens.add({
      targets: this.resultContainer,
      angle: { from: 0, to: 360 * 3 }, // Spin 3 full rotations
      scaleX: { from: 1, to: 1.2, yoyo: true },
      scaleY: { from: 1, to: 1.2, yoyo: true },
      duration: duration,
      ease: 'Power2.easeInOut'
    });
  }
  showDiceNumber(number, isCorrect, completedLevel) {
    this.resultContainer.setVisible(true);
    // Use the level that was just completed to determine what to show
    const activeLevel = completedLevel || this.scene.currentActiveLevel;
    const isCoinFlip = activeLevel === 1;
    const isCatInBox = activeLevel === 2;
    const isEmotional = activeLevel === 3;
    if (isCoinFlip) {
        // Coin flip: Show "Heads" or "Tails" text on white background
        this.numberText.setText(''); // No text, just show the coin face
        
        // Show the correct coin face instead of text on a white box
        if (this.diceGraphics && this.diceGraphics.scene) this.diceGraphics.setVisible(false);
        if (this.headsSprite && this.headsSprite.scene) this.headsSprite.setVisible(number === 1);
        if (this.tailsSprite && this.tailsSprite.scene) this.tailsSprite.setVisible(number !== 1);
        this.setAllBoxesVisible(false);
        if (this.catSprite && this.catSprite.scene) this.catSprite.setVisible(false);
    } else if (isCatInBox) {
        // Cat in box: Hide text, show boxes only
        this.numberText.setText('');
        this.numberText.setFontSize('100px');
        this.numberText.setColor('#000000');
        this.numberText.setFontFamily('Arial, sans-serif');
        this.numberText.setFontStyle('bold');
        this.numberText.setStroke('', 0);
        this.numberText.setShadow(0, 0, '', 0);
        
        if (this.diceGraphics && this.diceGraphics.scene) this.diceGraphics.setVisible(false);
        if (this.headsSprite && this.headsSprite.scene) this.headsSprite.setVisible(false);
        if (this.tailsSprite && this.tailsSprite.scene) this.tailsSprite.setVisible(false);
        this.setAllBoxesVisible(true);
        if (this.catSprite && this.catSprite.scene) this.catSprite.setVisible(false);
    } else if (isEmotional) {
        // Emotional level: hide dice UI; EmotionalAuraController handles reveal/images
        this.numberText.setText('');
        if (this.diceGraphics && this.diceGraphics.scene) this.diceGraphics.setVisible(false);
        if (this.headsSprite && this.headsSprite.scene) this.headsSprite.setVisible(false);
        if (this.tailsSprite && this.tailsSprite.scene) this.tailsSprite.setVisible(false);
        this.setAllBoxesVisible(false);
        if (this.catSprite && this.catSprite.scene) this.catSprite.setVisible(false);
    } else {
        // Dice rolls: Show number on white background
        this.numberText.setText(number.toString());
        this.numberText.setFontSize('100px');
        this.numberText.setColor('#000000');
        this.numberText.setFontFamily('Arial, sans-serif');
        this.numberText.setFontStyle('bold');
        this.numberText.setStroke('', 0);
        this.numberText.setShadow(0, 0, '', 0);
        
        if (this.diceGraphics && this.diceGraphics.scene) this.diceGraphics.setVisible(true);
        if (this.headsSprite && this.headsSprite.scene) this.headsSprite.setVisible(false);
        if (this.tailsSprite && this.tailsSprite.scene) this.tailsSprite.setVisible(false);
        this.setAllBoxesVisible(false);
        if (this.catSprite && this.catSprite.scene) this.catSprite.setVisible(false);
    }
    
    this.scene.tweens.killTweensOf(this.resultContainer);
    if (this.resultContainer && this.resultContainer.scene) this.resultContainer.setScale(1); // End spin scale
    this.resultContainer.setAlpha(1);
    this.scene.tweens.add({
      targets: this.resultContainer,
      scale: 1.1,
      duration: 200,
      ease: 'Sine.easeInOut',
      yoyo: true,
      onComplete: () => {}
    });
    
    // Glow effect for correct
    this.glow.clear();
    const size = 140; // Match the reduced size from createDiceDisplay
    if (isCorrect) {
        this.glow.fillGradientStyle(0x00ff00, 0x00ff00, 0x008000, 0x008000, 0.7);
    } else {
        this.glow.fillGradientStyle(0x8a2be2, 0x8a2be2, 0x4b0082, 0x4b0082, 0.7);
    }
    this.setGlowShape();
  }
  
  coinFlipAnimation(duration) {
    const startY = this.resultContainer.y;
    const flipHeight = 80;
    const flipDuration = 120;
    const numFlips = Math.floor(duration / flipDuration);
    
    // Create spinning particle trail
    const trailEmitter = this.createTrailParticles(0x00e5ff);
    
    // Main flip animation with realistic arc
    this.scene.tweens.add({
        targets: this.resultContainer,
        y: startY - flipHeight,
        duration: duration / 2,
        ease: 'Cubic.easeOut',
        yoyo: true,
        onComplete: () => {
            // Clean up trail after animation
            this.scene.time.delayedCall(800, () => {
                if (trailEmitter.active) {
                    trailEmitter.destroy();
                }
            });
        }
    });
    
    // Realistic coin flip rotation with perspective scaling
    let flipCount = 0;
    const flipInterval = this.scene.time.addEvent({
        delay: flipDuration,
        callback: () => {
            if (flipCount >= numFlips) {
                flipInterval.remove();
                return;
            }
            
            // Create perspective flip effect
            this.scene.tweens.add({
                targets: this.resultContainer,
                scaleX: 0.1,
                duration: flipDuration / 2,
                ease: 'Sine.easeIn',
                onComplete: () => {
                    // Swap sprite visibility at thinnest point
                    const showHeads = flipCount % 2 === 0;
                    this.headsSprite.setVisible(showHeads);
                    this.tailsSprite.setVisible(!showHeads);
                    
                    // Scale back to normal
                    this.scene.tweens.add({
                        targets: this.resultContainer,
                        scaleX: 1,
                        duration: flipDuration / 2,
                        ease: 'Sine.easeOut'
                    });
                }
            });
            
            flipCount++;
        },
        repeat: numFlips - 1
    });
    
    // Add slight rotation for more realistic motion
    this.scene.tweens.add({
        targets: this.resultContainer,
        angle: 360 * 2, // Two full rotations
        duration: duration,
        ease: 'Cubic.easeOut',
        onComplete: () => {
            this.resultContainer.setAngle(0);
        }
    });
  }
  catInBoxAnimation(duration, onComplete) {
      // Ensure cryptoResult is within valid range for cat-in-box level (1-3)
      const clampedResult = Phaser.Math.Clamp(this.scene.cryptoResult, 1, 3);
      const finalBoxIndex = clampedResult - 1;
      
      // Hide cat with sound
      const targetBox = this.boxes[finalBoxIndex];
      
      // Safety check to prevent crash if targetBox is undefined
      if (!targetBox) {
          console.error(`Invalid finalBoxIndex: ${finalBoxIndex} for cryptoResult: ${this.scene.cryptoResult} (clamped to ${clampedResult})`);
          if (onComplete) onComplete();
          return;
      }
      
      // Removed hover click sound to avoid non-click audio
      
      this.scene.tweens.add({
          targets: this.catSprite,
          x: targetBox.x,
          y: targetBox.y,
          scale: 0.1,
          alpha: 0,
          duration: 500,
          ease: 'Cubic.easeIn',
          onComplete: () => {
              this.catSprite.setVisible(false);
              
              // Shuffle boxes with sounds
              const boxPositions = this.boxes.map(b => ({ x: b.x, y: b.y }));
              this.scene.playSound('button_ambience');
              
              this.scene.tweens.add({
                  targets: this.boxes,
                  x: (box) => {
                      const newIndex = (this.boxes.indexOf(box) + 1) % 3;
                      return boxPositions[newIndex].x;
                  },
                  y: (box) => {
                      const newIndex = (this.boxes.indexOf(box) + 1) % 3;
                      return boxPositions[newIndex].y;
                  },
                  duration: 400,
                  ease: 'Sine.easeInOut',
                  yoyo: true,
                  repeat: 2,
                  onYoyo: () => {
                      // Removed hover click sound during shuffle to enforce click-only sounds
                  },
                  onRepeat: () => {
                      // Removed hover click sound during shuffle to enforce click-only sounds
                  }
              });
              
              // After shuffling, reveal the cat, then notify the player.
              this.scene.time.delayedCall(3000, () => {
                  const result = Phaser.Math.Clamp(this.scene.cryptoResult, 1, 3);
                  const isCorrect = result === this.scene.currentPrediction;
                  
                  const winningBox = this.boxes[result - 1];
                  this.catSprite.setPosition(winningBox.x, winningBox.y - 120).setScale(1);
                  this.catSprite.setVisible(true);
        
                  // Play cat reveal sound and particles
                  this.scene.playSound('button_ambience');
                  this.scene.particleEffects.createCatRevealParticles(this.catSprite.x, this.catSprite.y);
                  
                  this.scene.tweens.add({
                      targets: this.catSprite,
                      y: this.catSprite.y + 30,
                      alpha: { from: 0, to: 1 },
                      duration: 500,
                      ease: 'Cubic.easeOut',
                      onStart: () => {
                          this.scene.tweens.add({
                              targets: winningBox,
                              scale: { from: 1, to: 1.1 },
                              duration: 300,
                              ease: 'Sine.easeInOut',
                              yoyo: true
                          });
                      },
                      onComplete: () => {
                          // NOW we can call the gameScene's onRollComplete to show results
                          if(onComplete) onComplete();
                      }
                  });
              });
          }
      });
  }
  playWinAnimation() {
      // Play the success fanfare sound - now properly loaded
      this.scene.playSound('success-fanfare-trumpets-6185', { volume: 0.8 });
      
      // MASSIVE screen shake for dramatic effect
      this.scene.cameras.main.shake(800, 0.02);
      
      // Create multiple expanding light rings
      for (let i = 0; i < 5; i++) {
          this.scene.time.delayedCall(i * 100, () => {
              const light = this.scene.add.graphics();
              light.fillStyle(0xffff00, 0.6 - i * 0.1);
              light.fillCircle(0, 0, 100 + i * 50);
              light.setBlendMode(Phaser.BlendModes.ADD);
              this.resultContainer.addAt(light, 0);
              
              this.scene.tweens.add({
                  targets: light,
                  scale: { from: 0.5, to: 3 + i },
                  alpha: 0,
                  duration: 1200,
                  ease: 'Cubic.easeOut',
                  onComplete: () => light.destroy()
              });
          });
      }
      
      // Screen flash effect
      const { width, height } = this.scene.sys.game.config;
      const screenFlash = this.scene.add.graphics();
      screenFlash.fillStyle(0xffff00, 0.3);
      screenFlash.fillRect(0, 0, width, height);
      screenFlash.setDepth(2000);
      screenFlash.setBlendMode(Phaser.BlendModes.ADD);
      
      this.scene.tweens.add({
          targets: screenFlash,
          alpha: 0,
          duration: 400,
          ease: 'Cubic.easeOut',
          onComplete: () => screenFlash.destroy()
      });
      
      // Create rainbow particle explosion
      const rainbowEmitter = this.scene.add.particles(this.resultContainer.x, this.resultContainer.y, 'particle', {
          speed: { min: 400, max: 800 },
          angle: { min: 0, max: 360 },
          scale: { start: 1.2, end: 0 },
          blendMode: 'ADD',
          lifespan: 1500,
          tint: [0xff0000, 0xff8800, 0xffff00, 0x00ff00, 0x0088ff, 0x8800ff, 0xff00ff],
          gravityY: 200,
          quantity: 15,
          frequency: 50
      });
      rainbowEmitter.setDepth(1999);
      rainbowEmitter.explode(100);
      
      // Star burst pattern
      for (let angle = 0; angle < 360; angle += 45) {
          const starEmitter = this.scene.add.particles(this.resultContainer.x, this.resultContainer.y, 'star', {
              speed: 600,
              angle: { min: angle - 5, max: angle + 5 },
              scale: { start: 0.8, end: 0 },
              blendMode: 'ADD',
              lifespan: 1000,
              tint: [0xffff00, 0xffffff, 0x00ff00],
              quantity: 3
          });
          starEmitter.setDepth(1998);
          starEmitter.explode(8);
          this.scene.time.delayedCall(1200, () => starEmitter.destroy());
      }
      
      this.scene.time.delayedCall(2000, () => rainbowEmitter.destroy());
      
      // Special cat celebration animation on win
      if (this.scene.currentActiveLevel === 2 && this.catSprite.visible) {
          // Stop the regular wiggle and start victory wiggle
          if (this.catWiggleTween) {
              this.catWiggleTween.stop();
          }
          
          // Intense celebration wiggle with bouncing
          this.scene.tweens.add({
              targets: this.catSprite,
              angle: { from: -15, to: 15 },
              duration: 100,
              ease: 'Sine.easeInOut',
              yoyo: true,
              repeat: 15, // Much more wiggling!
              onComplete: () => {
                  // Resume normal wiggle after celebration
                  this.startCatWiggle();
              }
          });
          
          // Add bouncing motion
          this.scene.tweens.add({
              targets: this.catSprite,
              y: this.catSprite.y - 30,
              duration: 200,
              ease: 'Bounce.easeOut',
              yoyo: true,
              repeat: 3,
              onYoyo: () => {
                  this.scene.playSound('cat_win');
              },
              onRepeat: () => {
                  this.scene.playSound('cat_win');
              }
          });
          
          // Scale pulsing for extra excitement
          this.scene.tweens.add({
              targets: this.catSprite,
              scale: { from: 1, to: 1.3 },
              duration: 150,
              ease: 'Sine.easeInOut',
              yoyo: true,
              repeat: 5
          });
      } else {
        // Coin win animation
        this.scene.tweens.add({
            targets: this.resultContainer,
            scale: 1.2,
            duration: 150,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: 3,
        });
      }
  }
  
  playLoseAnimation() {
      // Play the game over sound with dramatic volume
      this.scene.playSound('game-over-arcade-6435', { volume: 0.8 });
      
      // Intense screen shake - more dramatic than win
      this.scene.cameras.main.shake(600, 0.015);
      
      // Multiple glitch effects
      const originalX = this.resultContainer.x;
      const originalY = this.resultContainer.y;
      
      // Rapid glitch sequence
      for (let i = 0; i < 8; i++) {
          this.scene.time.delayedCall(i * 50, () => {
              const intensity = 15 - i * 1.5;
              this.resultContainer.x = originalX + Phaser.Math.Between(-intensity, intensity);
              this.resultContainer.y = originalY + Phaser.Math.Between(-intensity/2, intensity/2);
          });
      }
      
      // Reset position after glitch
      this.scene.time.delayedCall(400, () => {
          this.resultContainer.setPosition(originalX, originalY);
      });
      
      // Create multiple red warning flashes
      const { width, height } = this.scene.sys.game.config;
      for (let i = 0; i < 3; i++) {
          this.scene.time.delayedCall(i * 200, () => {
              const screenFlash = this.scene.add.graphics();
              screenFlash.fillStyle(0xff0000, 0.2 - i * 0.05);
              screenFlash.fillRect(0, 0, width, height);
              screenFlash.setDepth(2000);
              screenFlash.setBlendMode(Phaser.BlendModes.ADD);
              
              this.scene.tweens.add({
                  targets: screenFlash,
                  alpha: 0,
                  duration: 150,
                  ease: 'Power2',
                  onComplete: () => screenFlash.destroy()
              });
          });
      }
      
      // Dramatic red explosion with sparks
      const failureEmitter = this.scene.add.particles(this.resultContainer.x, this.resultContainer.y, 'particle', {
          speed: { min: 300, max: 600 },
          angle: { min: 0, max: 360 },
          scale: { start: 0.8, end: 0 },
          blendMode: 'ADD',
          lifespan: 1000,
          tint: [0xff0000, 0xff4444, 0xff8888, 0x880000],
          gravityY: 400,
          quantity: 8,
          frequency: 80
      });
      failureEmitter.setDepth(1999);
      failureEmitter.explode(50);
      
      // Create crackling lightning-like effects
      for (let i = 0; i < 6; i++) {
          this.scene.time.delayedCall(i * 100, () => {
              const lightning = this.scene.add.graphics();
              lightning.lineStyle(3, 0xff0000, 0.8);
              lightning.setDepth(1997);
              
              const startX = this.resultContainer.x + Phaser.Math.Between(-100, 100);
              const startY = this.resultContainer.y + Phaser.Math.Between(-100, 100);
              const endX = startX + Phaser.Math.Between(-200, 200);
              const endY = startY + Phaser.Math.Between(-200, 200);
              
              lightning.beginPath();
              lightning.moveTo(startX, startY);
              lightning.lineTo(endX, endY);
              lightning.strokePath();
              
              this.scene.tweens.add({
                  targets: lightning,
                  alpha: 0,
                  duration: 200,
                  ease: 'Power2',
                  onComplete: () => lightning.destroy()
              });
          });
      }
      
      this.scene.time.delayedCall(1500, () => failureEmitter.destroy());
  }
  
  resetDice() {
      const width = this.scene.sys.game.config.width;
      const height = this.scene.sys.game.config.height;
      if (this.resultContainer && this.resultContainer.scene) {
          this.resultContainer.setPosition(width / 2, height / 2 - 100).setAngle(0).setScale(1);
          this.resultContainer.setVisible(true);
          this.resultContainer.setAlpha(1);
      }
      
      const activeLevel = this.scene.currentActiveLevel;
      const isEmotional = activeLevel === 3;
      if (this.headsSprite && this.headsSprite.scene) this.headsSprite.setVisible(activeLevel === 1);
      if (this.tailsSprite && this.tailsSprite.scene) this.tailsSprite.setVisible(false);
      if (this.diceGraphics && this.diceGraphics.scene) this.diceGraphics.setVisible(activeLevel > 2 && !isEmotional);
      this.numberText.setText(activeLevel > 2 && !isEmotional ? '?' : '');
      this.setAllBoxesVisible(activeLevel === 2);
      if (this.catSprite && this.catSprite.scene) this.catSprite.setVisible(activeLevel === 2);
      if (activeLevel === 2) {
          if (this.catSprite && this.catSprite.scene) {
              this.catSprite.setPosition(0, -90).setAlpha(1).setScale(1);
          }
          this.startCatWiggle();
          this.startBoxShake();
          this.boxes.forEach(box => this.startBoxBreathing(box));
      } else {
          this.stopCatWiggle();
          this.stopBoxShake();
          this.stopBoxBreathing();
      }
      this.setGlowShape(); // Changed to false to apply purple color
      if (this.breathingTween || this.breathingCoinTween) {
        if (this.breathingTween) this.breathingTween.stop();
        if (this.breathingCoinTween) this.breathingCoinTween.stop();
      }
      this.startBreathing();
  }
  hide() {
    if (this.breathingTween) {
        this.breathingTween.stop();
        if (this.glow && this.glow.scene) this.glow.setScale(1);
    }
    if (this.breathingCoinTween) {
        this.breathingCoinTween.stop();
        if (this.headsSprite && this.headsSprite.scene) {
            this.headsSprite.setScale(this.headsSprite.scale / 1.15); // Reset scale
        }
    }
    if (this.resultContainer && this.resultContainer.scene) {
        this.resultContainer.setScale(1);
        this.resultContainer.setVisible(false);
    }
    this.stopCatWiggle();
    this.stopBoxShake();
    this.stopBoxBreathing();
  }
  
  startBreathing() {
    if (this.breathingTween) this.breathingTween.stop();
    if (this.breathingCoinTween) this.breathingCoinTween.stop();
    
    const activeLevel = this.scene.currentActiveLevel;
    const isCoinFlip = activeLevel === 1;
    const isCatInBox = activeLevel === 2;
    const isEmotional = activeLevel === 3;
    this.glow.setVisible(!isCoinFlip && !isCatInBox && !isEmotional);
    if (isCoinFlip) {
        const originalScale = this.headsSprite.scale;
        this.breathingCoinTween = this.scene.tweens.add({
            targets: [this.headsSprite, this.tailsSprite],
            scale: originalScale * 1.08,
            duration: 4000,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });
    } else if (isCatInBox) {
        // No breathing animation for cat level, it has its own animation
    } else {
        this.glow.setScale(1);
        this.breathingTween = this.scene.tweens.add({
            targets: this.glow,
            scale: 1.15,
            duration: 4000,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });
    }
  }
  setGlowShape(forceColor = false) {
      const size = 180;
      this.glow.clear();
      if (!forceColor) {
        this.glow.fillGradientStyle(0x8a2be2, 0x8a2be2, 0x4b0082, 0x4b0082, 0.7);
      }
      const activeLevel = this.scene.currentActiveLevel;
      if (activeLevel === 1) { // Coin
          this.glow.fillCircle(0, 0, size/2 + 10);
      } else if (activeLevel !== 2 && activeLevel !== 3) { // Not coin, not cat, not emotional
          this.glow.fillRoundedRect(-size/2-10, -size/2-10, size+20, size+20, 42);
      }
  }
  setAllBoxesVisible(visible) {
    if (this.boxes && Array.isArray(this.boxes)) {
      this.boxes.forEach(b => {
        if (b && b.scene && typeof b.setVisible === 'function') {
          b.setVisible(visible);
        }
      });
    }
  }
  
  startCatWiggle() {
    if (this.catWiggleTween) {
        this.catWiggleTween.stop();
    }
    
    // Continuous gentle wiggle animation
    this.catWiggleTween = this.scene.tweens.add({
        targets: this.catSprite,
        angle: { from: -5, to: 5 },
        duration: 800,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
    });
  }
  
  stopCatWiggle() {
    if (this.catWiggleTween) {
        this.catWiggleTween.stop();
        this.catWiggleTween = null;
        // Reset angle
        this.scene.tweens.add({
            targets: this.catSprite,
            angle: 0,
            duration: 200,
            ease: 'Power2'
        });
    }
  }
  startBoxShake() {
    this.stopBoxShake(); // Stop any existing timer first
    this.boxShakeTimer = this.scene.time.addEvent({
      delay: Phaser.Math.Between(2000, 4000), // Shake every 2-4 seconds
      callback: () => {
        if (this.scene.gameState !== 'predicting' || this.scene.currentActiveLevel !== 2) {
          this.stopBoxShake();
          return;
        }
        const boxToShake = Phaser.Utils.Array.GetRandom(this.boxes);
        this.shakeBox(boxToShake);
        this.boxShakeTimer.delay = Phaser.Math.Between(2000, 4000); // New random delay
      },
      loop: true,
    });
  }
  shakeBox(box) {
    if (!box || !box.visible) return;
    this.scene.playSound('button_hover_click', { volume: 0.3 });
    const originalX = box.x;
    const intensity = 5;
    this.scene.tweens.add({
      targets: box,
      x: `+=${Phaser.Math.FloatBetween(-intensity, intensity)}`,
      angle: Phaser.Math.FloatBetween(-5, 5),
      duration: 50,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: 4,
      onComplete: () => {
        box.setPosition(originalX, box.y);
        box.setAngle(0);
      },
    });
  }
  stopBoxShake() {
    if (this.boxShakeTimer) {
      this.boxShakeTimer.remove(false);
      this.boxShakeTimer = null;
    }
  }
  startBoxBreathing(box) {
    if (!box || !box.visible) return;
    this.scene.tweens.add({
      targets: box,
      scaleY: 1.05,
      scaleX: 1.03,
      duration: 1500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
      delay: box.boxId * 300 // Stagger the animations
    });
  }
  stopBoxBreathing() {
    this.boxes.forEach(box => {
      this.scene.tweens.killTweensOf(box);
      box.setScale(1);
    });
  }
  jiggleBox(box) {
    if (!box || !box.visible) return;
    this.scene.tweens.add({
      targets: box,
      scaleY: 1.1,
      scaleX: 1.05,
      duration: 150,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        // After jiggling, return to a steady breathing
        this.startBoxBreathing(box);
      }
    });
  }
  
  playChaChingSound() {
      // Create synthesized "cha ching" sound using Web Audio API
      const audioContext = this.scene.sound.context;
      if (!audioContext) return;
      
      const now = audioContext.currentTime;
      
      // First "cha" - sharp metallic hit
      const oscillator1 = audioContext.createOscillator();
      const gainNode1 = audioContext.createGain();
      
      oscillator1.connect(gainNode1);
      gainNode1.connect(audioContext.destination);
      
      oscillator1.frequency.setValueAtTime(800, now);
      oscillator1.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
      oscillator1.type = 'square';
      
      gainNode1.gain.setValueAtTime(0.3, now);
      gainNode1.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      
      oscillator1.start(now);
      oscillator1.stop(now + 0.1);
      
      // Second "ching" - bright ringing
      const oscillator2 = audioContext.createOscillator();
      const gainNode2 = audioContext.createGain();
      
      oscillator2.connect(gainNode2);
      gainNode2.connect(audioContext.destination);
      
      oscillator2.frequency.setValueAtTime(1500, now + 0.1);
      oscillator2.frequency.exponentialRampToValueAtTime(2000, now + 0.15);
      oscillator2.type = 'sine';
      
      gainNode2.gain.setValueAtTime(0.4, now + 0.1);
      gainNode2.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      
      oscillator2.start(now + 0.1);
      oscillator2.stop(now + 0.4);
  }
  
  playWinChimeSound() {
      // Additional celebratory chime
      const audioContext = this.scene.sound.context;
      if (!audioContext) return;
      
      const now = audioContext.currentTime;
      const frequencies = [659.25, 783.99, 987.77]; // E5, G5, B5 chord
      
      frequencies.forEach((freq, index) => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(freq, now);
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.15, now + index * 0.05);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
          
          oscillator.start(now + index * 0.05);
          oscillator.stop(now + 0.8);
      });
  }
  
  playOhOhhhSound() {
      // Create synthesized "oh ohhhh" disappointed sound
      const audioContext = this.scene.sound.context;
      if (!audioContext) return;
      
      const now = audioContext.currentTime;
      
      // First "oh" - short disappointed sound
      const oscillator1 = audioContext.createOscillator();
      const gainNode1 = audioContext.createGain();
      
      oscillator1.connect(gainNode1);
      gainNode1.connect(audioContext.destination);
      
      oscillator1.frequency.setValueAtTime(220, now);
      oscillator1.frequency.exponentialRampToValueAtTime(180, now + 0.2);
      oscillator1.type = 'sawtooth';
      
      gainNode1.gain.setValueAtTime(0.2, now);
      gainNode1.gain.linearRampToValueAtTime(0.3, now + 0.05);
      gainNode1.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      
      oscillator1.start(now);
      oscillator1.stop(now + 0.2);
      
      // Second "ohhhh" - longer falling disappointment
      const oscillator2 = audioContext.createOscillator();
      const gainNode2 = audioContext.createGain();
      
      oscillator2.connect(gainNode2);
      gainNode2.connect(audioContext.destination);
      
      oscillator2.frequency.setValueAtTime(200, now + 0.3);
      oscillator2.frequency.exponentialRampToValueAtTime(120, now + 1.0);
      oscillator2.type = 'sawtooth';
      
      gainNode2.gain.setValueAtTime(0.25, now + 0.3);
      gainNode2.gain.linearRampToValueAtTime(0.35, now + 0.4);
      gainNode2.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
      
      oscillator2.start(now + 0.3);
      oscillator2.stop(now + 1.0);
      
      // Add some vibrato to the "ohhhh"
      const lfo = audioContext.createOscillator();
      const lfoGain = audioContext.createGain();
      
      lfo.connect(lfoGain);
      lfoGain.connect(oscillator2.frequency);
      
      lfo.frequency.setValueAtTime(4, now + 0.3); // 4Hz vibrato
      lfoGain.gain.setValueAtTime(8, now + 0.3); // Subtle frequency modulation
      
      lfo.start(now + 0.3);
      lfo.stop(now + 1.0);
  }
}