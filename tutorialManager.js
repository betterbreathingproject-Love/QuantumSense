export class TutorialManager {
  constructor(scene, onComplete, getUIContainers = null) {
    this.scene = scene;
    this.onComplete = onComplete;
    this.getUIContainers = getUIContainers;
    this.currentStep = 0;

    this.steps = [
      {
        title: "Welcome to Your Inner Laboratory ✨",
        text: "You are about to use a powerful tool designed to awaken your natural intuitive abilities. This isn't just a game; it's a training ground for your consciousness, built on scientific principles.",
        target: null,
      },
      {
        title: "The Science of Intuition",
        text: "This trainer uses a cryptographically secure Quantum Random Number Generator (qRNG)—the gold standard for consciousness research. Your results provide scientifically-grounded feedback on your developing abilities.",
        target: null,
      },
      {
        text: "Your journey unfolds through levels of increasing complexity. Your prediction options will expand as you advance.",
        target: () => this.scene.predictionSystem.levelSelectorContainer,
        highlightPadding: { x: 20, y: 20 }
      },
      {
        text: "Make your prediction here.",
        target: () => this.scene.predictionSystem.container,
        highlightRect: { 
          x: this.scene.sys.game.config.width / 2 - 200, 
          y: this.scene.sys.game.config.height - 350, 
          width: 400, 
          height: 200 
        },
        popupPos: 'top'
      },
      {
        title: "Sense vs. Influence",
        text: "Use this switch to train two unique skills. In 'SENSE' mode (ESP), you perceive a pre-existing outcome. In 'INFLUENCE' mode (PK), you attempt to shape the outcome with your will. Discover your dominant gift!",
        target: () => this.scene.modeToggleContainer,
        highlightRect: { x: this.scene.sys.game.config.width / 2 - 200, y: this.scene.sys.game.config.height - 500, width: 400, height: 100 },
        popupPos: 'top'
      },
      {
        title: "Your Psychic Stats",
        text: "Track your growth here. Your P-Value reveals how statistically significant your results are—the lower it gets, the stronger the evidence for your psychic ability! Your data is your proof.",
        target: () => this.getUIContainers ? this.getUIContainers().topBarContainer : null,
        highlightRect: { x: 0, y: 0, width: this.scene.sys.game.config.width, height: 150 },
        popupPos: 'bottom'
      },
      {
        title: "The Power of\nHeart Coherence",
        text: "A calm heart is a clear channel. Practice Heart Coherence breathing exercises to align your heart and brain, a scientifically validated state for enhancing intuition. This practice earns you Streak Shields!",
        target: () => this.scene.uiManager ? this.scene.uiManager.coherenceContainer : null,
        highlightRect: { 
          x: this.scene.sys.game.config.width - 90, 
          y: 140, 
          width: 90, 
          height: 440 
        },
        narrowPopup: true,
        centerTitle: true
      },
      {
        text: "Streak Shields protect your progress from an incorrect prediction, allowing you to maintain momentum. You earn them through dedicated coherence practice—linking inner peace with outer success.",
        target: () => this.getUIContainers ? this.getUIContainers().shieldContainer : null,
        highlightPadding: { x: 30, y: 30 },
      },
      {
        title: "Your Profile & Deeper Stats",
        text: "The menu holds your Profile, where you can see your Quantum Score—a holistic measure of your psychic development—along with detailed charts, achievements, and more.",
        target: () => this.scene.menuManager ? this.scene.menuManager.menuButton : null,
        highlightPadding: { x: 15, y: 15 },
        narrowPopup: true,
        centerTitle: true
      },
      {
        title: "Pure Binaural Beats &\nCoherence Coach",
        text: "Access scientifically-tuned binaural beats and guided coherence breathing exercises through the menu. These tools synchronize your brainwaves and heart rhythm to enhance your psychic abilities naturally.",
        target: () => this.scene.menuManager ? this.scene.menuManager.menuButton : null,
        highlightPadding: { x: 15, y: 15 },
        narrowPopup: true,
        centerTitle: true
      },
      {
        title: "Your Journey Begins Now",
        text: "🔮 You are ready. 🔮\n\nTrust yourself completely. This tool will help you prove to yourself what your soul already knows.\n\nLet the experiment begin!",
        target: null,
      }
    ];

    this.container = this.scene.add.container(0, 0).setDepth(2000).setVisible(false);
    this.createOverlay();
    this.createStepUI();
  }

  createOverlay() {
    const { width, height } = this.scene.sys.game.config;
    this.overlay = this.scene.add.graphics()
      .fillStyle(0x000000, 0.8)
      .fillRect(0, 0, width, height);
    this.container.add(this.overlay);
  }

  createStepUI() {
    const { width, height } = this.scene.sys.game.config;
    this.popup = this.scene.add.container(width / 2, height / 2);

    // Store original popup dimensions for default popup layout
    this.originalPopupWidth = width * 0.9;
    this.originalPopupHeight = 400;

    // Store narrow popup dimensions for coherence step
    this.narrowPopupWidth = width * 0.6;
    this.narrowPopupHeight = 500;

    this.bg = this.scene.add.graphics();
    this.bg.fillStyle(0x0c0114, 0.95);
    this.bg.fillRoundedRect(-this.originalPopupWidth / 2, -this.originalPopupHeight / 2, this.originalPopupWidth, this.originalPopupHeight, 20);
    this.bg.lineStyle(2, 0x8a2be2, 1);
    this.bg.strokeRoundedRect(-this.originalPopupWidth / 2, -this.originalPopupHeight / 2, this.originalPopupWidth, this.originalPopupHeight, 20);
    
    this.stepTitle = this.scene.add.text(0, -this.originalPopupHeight/2 + 40, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '28px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.stepText = this.scene.add.text(0, 0, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '20px', color: '#c9c9c9',
      align: 'center', wordWrap: { width: this.originalPopupWidth - 40 }
    }).setOrigin(0.5);
    this.nextButton = this.createButton(0, this.originalPopupHeight/2 - 50, 'Next', () => this.nextStep());
    this.prevButton = this.createButton(0, this.originalPopupHeight/2 - 50, 'Prev', () => this.prevStep());
    this.finishButton = this.createButton(0, this.originalPopupHeight/2 - 50, 'Start Game!', () => this.endTutorial());
    this.popup.add([this.bg, this.stepTitle, this.stepText, this.nextButton, this.prevButton, this.finishButton]);
    this.container.add(this.popup);

    this.highlight = this.scene.add.graphics();
    // Do not add to container, so it can be placed anywhere on screen
    // this.container.add(this.highlight);
  }

  start() {
    if (this.container && this.container.scene) this.container.setVisible(true);
    this.showStep(0);
  }

  showStep(index) {
    const step = this.steps[index];
    this.stepText.setText(step.text);
    if (step.title) {
        if (this.stepTitle && this.stepTitle.scene) this.stepTitle.setText(step.title).setVisible(true);
        this.stepText.y = 0;
    } else {
        if (this.stepTitle && this.stepTitle.scene) this.stepTitle.setVisible(false);
        this.stepText.y = -40; // Adjust for no title
    }
    const { width, height } = this.scene.sys.game.config;
    
    // Apply narrow popup styling if specified
    if (step.narrowPopup) {
        this.bg.clear();
        this.bg.fillStyle(0x0c0114, 0.95);
        this.bg.fillRoundedRect(-this.narrowPopupWidth / 2, -this.narrowPopupHeight / 2, this.narrowPopupWidth, this.narrowPopupHeight, 20);
        this.bg.lineStyle(2, 0x8a2be2, 1);
        this.bg.strokeRoundedRect(-this.narrowPopupWidth / 2, -this.narrowPopupHeight / 2, this.narrowPopupWidth, this.narrowPopupHeight, 20);
        
        // Adjust text wrapping for narrow popup
        this.stepText.setStyle({ wordWrap: { width: this.narrowPopupWidth - 40 } });
        
        // Reposition title and buttons for narrow popup
        this.stepTitle.y = -this.narrowPopupHeight/2 + 40;
        
        // Center title if specified
        if (step.centerTitle) {
            this.stepTitle.setOrigin(0.5, 0.5);
            this.stepTitle.x = 0;
        } else {
            this.stepTitle.setOrigin(0, 0.5);
            this.stepTitle.x = -this.narrowPopupWidth/2 + 20;
        }
        
        this.nextButton.y = this.narrowPopupHeight/2 - 50;
        this.prevButton.y = this.narrowPopupHeight/2 - 50;
        this.finishButton.y = this.narrowPopupHeight/2 - 50;
    } else {
        // Reset to original popup styling
        this.bg.clear();
        this.bg.fillStyle(0x0c0114, 0.95);
        this.bg.fillRoundedRect(-this.originalPopupWidth / 2, -this.originalPopupHeight / 2, this.originalPopupWidth, this.originalPopupHeight, 20);
        this.bg.lineStyle(2, 0x8a2be2, 1);
        this.bg.strokeRoundedRect(-this.originalPopupWidth / 2, -this.originalPopupHeight / 2, this.originalPopupWidth, this.originalPopupHeight, 20);
        
        // Adjust text wrapping for original popup
        this.stepText.setStyle({ wordWrap: { width: this.originalPopupWidth - 40 } });
        
        // Reset title and button positions
        this.stepTitle.y = -this.originalPopupHeight/2 + 40;
        this.stepTitle.setOrigin(0, 0.5);
        this.stepTitle.x = -this.originalPopupWidth/2 + 20;
        this.nextButton.y = this.originalPopupHeight/2 - 50;
        this.prevButton.y = this.originalPopupHeight/2 - 50;
        this.finishButton.y = this.originalPopupHeight/2 - 50;
    }
    
    // Adjust popup position and size based on step requirements
    if (step.popupPos === 'bottom') {
        this.popup.y = height - 250; // Position near bottom to avoid dice
    } else if (step.popupPos === 'top') {
        this.popup.y = 250; // Restore original top position
    } else {
        this.popup.y = height / 2; // Default center position
    }
    
    const isFirstStep = index === 0;
    const isLastStep = index === this.steps.length - 1;
    // Adjust button positions and visibility based on step
    if (isLastStep) {
        if (this.nextButton && this.nextButton.scene) this.nextButton.setVisible(false);
        if (this.prevButton && this.prevButton.scene) this.prevButton.setVisible(true);
        if (this.finishButton && this.finishButton.scene) this.finishButton.setVisible(true);
        this.prevButton.x = -110;
        this.finishButton.x = 110;
    } else if (isFirstStep) {
        if (this.nextButton && this.nextButton.scene) this.nextButton.setVisible(true);
        if (this.prevButton && this.prevButton.scene) this.prevButton.setVisible(false);
        if (this.finishButton && this.finishButton.scene) this.finishButton.setVisible(false);
        this.nextButton.x = 0;
    } else {
        if (this.nextButton && this.nextButton.scene) this.nextButton.setVisible(true);
        if (this.prevButton && this.prevButton.scene) this.prevButton.setVisible(true);
        if (this.finishButton && this.finishButton.scene) this.finishButton.setVisible(false);
        this.prevButton.x = -110;
        this.nextButton.x = 110;
    }

    this.highlight.clear();
    this.container.remove(this.highlight); // Ensure it's not in the container
    this.scene.children.remove(this.highlight); // Clean from scene list
    
    // Clear and recreate overlay to create cutout effect
    this.overlay.clear();
    const gameConfig = this.scene.sys.game.config;
    
    if (step.target) {
        let target;
        let highlightArea = null;
        
        try {
            target = step.target();
        } catch(e) {
            console.warn("Tutorial target not ready yet.");
            return;
        }
        
        if(target){
            // Determine highlight area
            if(step.highlightRect) {
                highlightArea = step.highlightRect;
            } else {
                const bounds = target.getBounds();
                const padding = step.highlightPadding || { x: 10, y: 10 };
                highlightArea = {
                    x: bounds.x - padding.x,
                    y: bounds.y - padding.y,
                    width: bounds.width + 2 * padding.x,
                    height: bounds.height + 2 * padding.y
                };
            }
            
            // Create overlay with cutout
            this.overlay.fillStyle(0x000000, 0.8);
            // Top rectangle
            if (highlightArea.y > 0) {
                this.overlay.fillRect(0, 0, gameConfig.width, highlightArea.y);
            }
            // Bottom rectangle
            if (highlightArea.y + highlightArea.height < gameConfig.height) {
                this.overlay.fillRect(0, highlightArea.y + highlightArea.height, gameConfig.width, gameConfig.height - (highlightArea.y + highlightArea.height));
            }
            // Left rectangle
            if (highlightArea.x > 0) {
                this.overlay.fillRect(0, highlightArea.y, highlightArea.x, highlightArea.height);
            }
            // Right rectangle
            if (highlightArea.x + highlightArea.width < gameConfig.width) {
                this.overlay.fillRect(highlightArea.x + highlightArea.width, highlightArea.y, gameConfig.width - (highlightArea.x + highlightArea.width), highlightArea.height);
            }
            
            // Add highlight border
            this.highlight.lineStyle(4, 0x00e5ff, 1);
            this.highlight.setDepth(2500); // Above all UI elements for clear visibility
            this.scene.add.existing(this.highlight); // Add to scene directly
            this.highlight.strokeRoundedRect(highlightArea.x, highlightArea.y, highlightArea.width, highlightArea.height, 10);
        }
    } else {
        // No target, create full overlay
        this.overlay.fillStyle(0x000000, 0.8);
        this.overlay.fillRect(0, 0, gameConfig.width, gameConfig.height);
    }
  }

  nextStep() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.showStep(this.currentStep);
    }
  }

  prevStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.showStep(this.currentStep);
    }
  }

  endTutorial() {
    if (this.container && this.container.scene) this.container.setVisible(false);
    this.highlight.destroy(); // Clean up the highlight graphic
    localStorage.setItem('tutorialSeen', 'true');
    // Restore initial game state after tutorial
    this.scene.predictionSystem.setInteractive(true);
    
    if (this.onComplete) {
      this.onComplete();
    }
  }

  createButton(x, y, text, callback) {
    const buttonText = this.scene.add.text(0, 0, text, {
      fontFamily: 'Arial, sans-serif', fontSize: '24px', color: '#00e5ff',
    }).setOrigin(0.5);
    const textWidth = buttonText.width + 40;
    const textHeight = buttonText.height + 20;
    const buttonBG = this.scene.add.graphics();
    buttonBG.fillStyle(0x2d0b4b, 1);
    buttonBG.fillRoundedRect(-textWidth / 2, -textHeight / 2, textWidth, textHeight, 15);
    buttonBG.lineStyle(2, 0x8a2be2, 1);
    buttonBG.strokeRoundedRect(-textWidth / 2, -textHeight / 2, textWidth, textHeight, 15);
    const container = this.scene.add.container(x, y, [buttonBG, buttonText]);
    container.setSize(textWidth, textHeight).setInteractive({ useHandCursor: true });
    container.on('pointerover', () => {
        this.scene.tweens.add({ targets: container, scale: 1.05, duration: 200, ease: 'Sine.easeOut' });
    });
    
    container.on('pointerout', () => {
        this.scene.tweens.add({ targets: container, scale: 1, duration: 200, ease: 'Sine.easeIn' });
    });
    
    container.on('pointerdown', () => {
        this.scene.playSound('button_ambience');
        callback();
    });
    return container;
  }
}