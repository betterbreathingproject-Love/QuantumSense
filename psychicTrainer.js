export class PsychicTrainer {
  constructor(scene, uiStateCallbacks) {
    this.scene = scene;
    this.uiStateCallbacks = uiStateCallbacks || {};
    this.trainerLevel = 0; // Evolves with player progress
    this.encouragementTimer = null;
    this.lastEncouragementTime = 0;
    this.inspirationalMessages = [
      "Intuition blooms in stillness.",
      "All possibilities are already here.",
      "The field of potential is you.",
      "Vision awakens as thought dissolves.",
      "Guidance flows from pure presence.",
      "To sense beyond is to return.",
      "Every answer rests in spaciousness.",
      "Intuition whispers in open clarity.",
      "Psychic sight is natural radiance.",
      "Perception expands into the infinite."
    ];
    this.currentMessageIndex = 0;
    this.inspirationalTimer = null;
    this.createTrainerPresence();
    this.startInspirationalLoop();
  }

  createTrainerPresence() {
    const { width, height } = this.scene.sys.game.config;
    
    // Create trainer visual presence (subtle energy orb)
    this.trainerOrb = this.scene.add.circle(width - 60, 45, 15, 0x8a2be2, 0.6);
    this.trainerOrb.setBlendMode(Phaser.BlendModes.ADD);
    this.trainerOrb.setDepth(100);
    
    // Gentle pulsing animation
    this.scene.tweens.add({
      targets: this.trainerOrb,
      alpha: { from: 0.6, to: 0.9 },
      scale: { from: 1, to: 1.2 },
      duration: 2000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
      ignoreGlobalPause: true
    });
    this.trainerOrb.setVisible(false); // Hide the orb
    
    // Create text container for trainer messages (result encouragement)
    this.messageContainer = this.scene.add.container(width / 2, 110); // Positioned just under the top stats bar
    this.messageContainer.setDepth(150);
    this.messageContainer.setVisible(false);
    
    // Create separate container for inspirational messages above dice
    this.inspirationalContainer = this.scene.add.container(width / 2, 160); // Positioned below feedback messages
    this.inspirationalContainer.setDepth(120);
    this.inspirationalContainer.setVisible(false);
  }

  updateTrainerLevel(psychicLevel, streak, accuracy) {
    const oldLevel = this.trainerLevel;
    
    // Trainer evolves based on player progress
    // psychicLevel is now 1-5, but our messages are 0-3. Let's map it.
    // We'll keep the 4 trainer levels for now. Level 5 can share Master Guide.
    const mappedLevel = Math.min(psychicLevel, 3);
    if (mappedLevel > this.trainerLevel) {
        this.trainerLevel = mappedLevel;
    }

    // Update trainer orb appearance based on level
    // if (oldLevel !== this.trainerLevel) {
    //   this.updateTrainerAppearance();
    // }
  }

  updateTrainerAppearance() {
    // const colors = [0x8a2be2, 0x00e5ff, 0x00ff00, 0xffff00];
    // const sizes = [15, 18, 22, 25];
    
    // this.scene.tweens.add({
    //   targets: this.trainerOrb,
    //   scale: 1.5,
    //   duration: 500,
    //   ease: 'Back.easeOut',
    //   yoyo: true,
    //   onStart: () => {
    //     this.trainerOrb.fillColor = colors[this.trainerLevel];
    //     this.trainerOrb.radius = sizes[this.trainerLevel];
    //   },
    //   ignoreGlobalPause: true
    // });
  }
  getOrbPosition() {
    return { x: this.scene.sys.game.config.width / 2, y: this.scene.sys.game.config.height / 2 };
  }
  getEncouragementMessage(isCorrect, stats) {
    const messages = {
      0: { // Supportive Guide
        correct: [
          "Beautiful! Your intuition is awakening ✨",
          "Yes! Trust that inner knowing 🌟",
          "Wonderful! You're connecting to the flow ⭐",
          "Perfect! Your divine sense is growing 🔮"
        ],
        incorrect: [
          "Let it flow... trust the process 🌊",
          "Breathe deep... your gift is unfolding 💫",
          "Stay open... the universe is teaching you ✨",
          "Release attachment... divine timing is perfect 🙏",
          "Don't be discouraged. Every choice is a lesson.",
          "The ego expects; the spirit accepts. Just be.",
          "A minor course correction. You are still on the path.",
          "Observe without judgment. Clarity will follow.",
          "This is part of tuning your inner instrument."
        ],
        periodic: [
          "Remember, every attempt strengthens your gift",
          "Your sensitivity is a precious ability",
          "Trust your first instinct, dear one",
          "The universe whispers to those who listen"
        ]
      },
      1: { // Gentle Mentor
        correct: [
          "Excellent! Your third eye is opening 👁️",
          "Magnificent! The veil is thinning for you ⚡",
          "Brilliant! You're reading the quantum field 🌌",
          "Superb! Your psychic abilities are blooming 🌸"
        ],
        incorrect: [
          "Let it flow... each miss teaches deeper wisdom 🌊",
          "Surrender to the mystery... you're learning 🔍",
          "Trust the journey... your power grows with practice 🚀",
          "Stay fluid... rigid thinking blocks intuition 💧",
          "Consider this feedback, not failure. What did you feel?",
          "The path to sight is not linear. Embrace the curve.",
          "A cloud passed. The inner sun is still there.",
          "You are calibrating your sense. This is necessary work.",
          "The desire for correctness can cloud perception. Relax into it."
        ],
        periodic: [
          "Your accuracy is improving beautifully",
          "I sense your growing confidence",
          "The energy field responds to your calm presence",
          "Your psychic muscles are strengthening"
        ]
      },
      2: { // Wisdom Keeper
        correct: [
          "Masterful! You're channeling pure knowing 🧙‍♀️",
          "Incredible! The cosmos speaks through you 🌟",
          "Outstanding! Your soul sight is crystal clear 💎",
          "Divine! You've touched the infinite 🕉️"
        ],
        incorrect: [
          "Let it flow... even masters embrace the mystery 🌊",
          "Flow with uncertainty... it sharpens perception 🌀",
          "Allow the current... resistance dims the light 💫",
          "Stay in flow... the universe has perfect timing ⏰",
          "You are distinguishing signal from noise. A crucial skill.",
          "The field of potential is vast. A different stream was chosen.",
          "This outcome is also part of the whole. See its perfection.",
          "The seer and the seen are one. Where was the separation?",
          "A ripple in the pond. The water remains."
        ],
        periodic: [
          "Your psychic field is stabilizing beautifully",
          "I witness your transformation into mastery",
          "The dimensional barriers thin around you",
          "Your streak shows remarkable consistency"
        ]
      },
      3: { // Master Guide
        correct: [
          "TRANSCENDENT! You are becoming the oracle 🏛️",
          "COSMIC! Pure consciousness flows through you 🌌",
          "DIVINE! You've merged with infinite knowing 🔥",
          "LEGENDARY! The universe bows to your sight 👑"
        ],
        incorrect: [
          "Let it flow... even gods dance with uncertainty 🌊",
          "Flow beyond form... you transcend right and wrong 🌊✨",
          "Pure flow... you're playing in higher dimensions 🚀",
          "Eternal flow... you understand the cosmic game 🎭",
          "This was simply one probability wave collapsing. Observe the next.",
          "The illusion of 'wrong' dissolves in pure awareness.",
          "Did you predict, or did the universe invite you to watch?",
          "Perfection is in the observation, not the outcome.",
          "You are witnessing the cosmic play. Beautiful, isn't it?"
        ],
        periodic: [
          "You have become a beacon of psychic mastery",
          "Your presence elevates the quantum field itself",
          "Few reach your level of divine perception",
          "You are teaching the universe new possibilities"
        ]
      }
    };

    return messages[this.trainerLevel] || messages[0];
  }

  showResultEncouragement(isCorrect, stats) {
    const messages = this.getEncouragementMessage(isCorrect, stats);
    const messageType = isCorrect ? 'correct' : 'incorrect';
    const message = Phaser.Utils.Array.GetRandom(messages[messageType]);
    
    this.displayMessage(message, isCorrect ? '#00ff88' : '#88ddff', 2500);
  }

  startInspirationalLoop() {
    // Start the loop after a short delay
    this.inspirationalTimer = this.scene.time.delayedCall(2000, () => {
      this.showNextInspirationalMessage();
    });
  }
  
  showNextInspirationalMessage() {
    // Only show if game is in a calm state (not during breathing, rolling, etc.)
    const isMenuOpen = this.uiStateCallbacks.isMenuOpen ? this.uiStateCallbacks.isMenuOpen() : false;
    const isBinauralOpen = this.uiStateCallbacks.isBinauralOpen ? this.uiStateCallbacks.isBinauralOpen() : false;
    const isJournalOpen = this.uiStateCallbacks.isJournalOpen ? this.uiStateCallbacks.isJournalOpen() : false;
    
    if (this.scene.gameState === 'breathing' || 
        isMenuOpen || 
        isBinauralOpen || 
        isJournalOpen) {
      // Skip this cycle and try again later
      this.inspirationalTimer = this.scene.time.delayedCall(8000, () => {
        this.showNextInspirationalMessage();
      });
      return;
    }
    
    const message = this.inspirationalMessages[this.currentMessageIndex];
    this.displayInspirationalMessage(message);
    
    // Move to next message
    this.currentMessageIndex = (this.currentMessageIndex + 1) % this.inspirationalMessages.length;
    
    // Schedule next message
    this.inspirationalTimer = this.scene.time.delayedCall(16000, () => {
      this.showNextInspirationalMessage();
    });
  }
  
  displayInspirationalMessage(text) {
    // Clear existing inspirational message
    this.inspirationalContainer.removeAll(true);
    
    // Create elegant, minimal text
    const messageText = this.scene.add.text(0, 0, text, {
      fontFamily: '"Cormorant Garamond", serif',
      fontSize: '36px',
      color: '#c9c9c9',
      fontStyle: 'italic',
      align: 'center',
      alpha: 0.8,
      wordWrap: { width: this.scene.sys.game.config.width * 0.9, useAdvancedWrap: true }
    }).setOrigin(0.5);
    
    this.inspirationalContainer.add(messageText);
    if (this.inspirationalContainer && this.inspirationalContainer.scene) {
      this.inspirationalContainer.setVisible(true).setAlpha(0);
    }
    
    // Gentle fade in
    this.scene.tweens.add({
      targets: this.inspirationalContainer,
      alpha: 1,
      duration: 3000,
      ease: 'Sine.easeOut',
      onComplete: () => {
        // Hold for a moment
        this.scene.time.delayedCall(6000, () => {
          // Gentle fade out
          this.scene.tweens.add({
            targets: this.inspirationalContainer,
            alpha: 0,
            duration: 3000,
            ease: 'Sine.easeIn',
            onComplete: () => {
              if (this.inspirationalContainer && this.inspirationalContainer.scene) {
                this.inspirationalContainer.setVisible(false);
              }
            }
          });
        });
      }
    });
  }
  showPeriodicEncouragement(stats) {
    // Disabled - replaced with inspirational message loop
    return;
  }

  showStreakEncouragement(streak) {
    if (streak === 3) {
      this.displayMessage("🔥 Your psychic fire is igniting! 🔥", '#ff6600', 2000);
    } else if (streak === 5) {
      this.displayMessage("⚡ INCREDIBLE STREAK! The flow is with you! ⚡", '#ffff00', 2500);
    } else if (streak >= 8) {
      this.displayMessage("🌟 LEGENDARY MASTERY! You've become the oracle! 🌟", '#ff00ff', 3000);
    }
  }

  showLevelUpEncouragement(newLevel) {
    const levelMessages = [
      "🌱 Welcome to your awakening journey, Novice",
      "🌸 Rising beautifully, Apprentice of the mystic arts",
      "⚡ Your power crystallizes, Adept of divine sight",
      "👑 Bow to the Master! You've achieved psychic mastery!",
      "✨ TRANSCENDENCE! You are one with the cosmos! ✨"
    ];
    
    if (levelMessages[newLevel]) {
      this.displayMessage(levelMessages[newLevel], '#00ffff', 3500);
      
      // Special effects for level up
      this.createLevelUpEffects();
    }
  }

  showBreathingEncouragement() {
    const breathingMessages = [
      "The heart knows what the mind cannot... let's center together 💙",
      "Your trainer feels your energy scattered... time to realign 🧘‍♀️",
      "Even masters pause to reconnect... shall we breathe as one? 🌬️",
      "I sense turbulence in your field... let's restore your flow 🌊"
    ];
    
    const message = Phaser.Utils.Array.GetRandom(breathingMessages);
    this.displayMessage(message, '#88ffaa', 4000);
  }

  displayMessage(text, color, duration = 2500) {
    // Clear existing message
    this.messageContainer.removeAll(true);
    
    // Create background
    const textWidth = Math.min(400, text.length * 12);
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0c0114, 0.9);
    bg.fillRoundedRect(-textWidth/2 - 20, -25, textWidth + 40, 50, 15);
    bg.lineStyle(2, Phaser.Display.Color.HexStringToColor(color).color, 0.8);
    bg.strokeRoundedRect(-textWidth/2 - 20, -25, textWidth + 40, 50, 15);
    
    // Create text
    const messageText = this.scene.add.text(0, 0, text, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: color,
      fontStyle: 'italic',
      align: 'center',
      wordWrap: { width: textWidth }
    }).setOrigin(0.5);
    
    this.messageContainer.add([bg, messageText]);
    if (this.messageContainer && this.messageContainer.scene) {
      this.messageContainer.setVisible(true).setAlpha(0);
    }
    
    // Animate in
    this.scene.tweens.add({
      targets: this.messageContainer,
      alpha: 1,
      y: 110,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Hold message
        this.scene.time.delayedCall(duration, () => {
          // Animate out
          this.scene.tweens.add({
            targets: this.messageContainer,
            alpha: 0,
            y: 100,
            duration: 500,
            ease: 'Cubic.easeIn',
            onComplete: () => {
              if (this.messageContainer && this.messageContainer.scene) {
                this.messageContainer.setVisible(false);
                this.messageContainer.removeAll(true);
              }
            }
          });
        });
      }
    });
  }

  createLevelUpEffects() {
    const { width, height } = this.scene.sys.game.config;
    
    // Create burst of light from trainer orb
    // const lightBurst = this.scene.add.particles(this.trainerOrb.x, this.trainerOrb.y, 'particle', {
    //   speed: { min: 100, max: 300 },
    //   angle: { min: 0, max: 360 },
    //   scale: { start: 0.8, end: 0 },
    //   blendMode: 'ADD',
    //   lifespan: 1500,
    //   tint: [0x00ffff, 0x88ffaa, 0xffff88],
    //   frequency: -1
    // });
    
    // lightBurst.explode(50);
    
    // this.scene.time.delayedCall(2000, () => {
    //   if(lightBurst) lightBurst.destroy();
    // });
  }

  onRoundStart() {
    // Inspirational messages now run continuously, no need for periodic encouragement
    return;
  }

  destroy() {
    if (this.encouragementTimer) {
      this.encouragementTimer.remove();
    }
    if (this.inspirationalTimer) {
      this.inspirationalTimer.remove();
    }
    // Stop all tweens targeting this trainer's objects
    if (this.scene && this.scene.tweens) {
      this.scene.tweens.killTweensOf([this.trainerOrb, this.messageContainer, this.inspirationalContainer]);
    }
    if (this.trainerOrb) {
      this.trainerOrb.destroy();
    }
    if (this.messageContainer) {
      this.messageContainer.destroy();
    }
    if (this.inspirationalContainer) {
      this.inspirationalContainer.destroy();
    }
  }
  hide() {
    if (this.trainerOrb && this.trainerOrb.scene) this.trainerOrb.setVisible(false);
    if (this.inspirationalContainer && this.inspirationalContainer.scene) this.inspirationalContainer.setVisible(false);
  }
  
  show() {
    if (this.trainerOrb && this.trainerOrb.scene) this.trainerOrb.setVisible(false);
    // Inspirational messages continue running automatically
  }
}