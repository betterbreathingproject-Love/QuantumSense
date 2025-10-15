import Phaser from 'phaser';
export class EmotionalAuraController {
  constructor(scene) {
    this.scene = scene;
    this.auraImages = [];
    this.imageNames = ['calm 1', 'calm 2', 'calm 3', '1 emotional', '2 emotional', 'emotional 3'];
    this.currentImage = null;
    this.portal = null;
    this.imageContainer = this.scene.add.container(this.scene.sys.game.config.width / 2, this.scene.sys.game.config.height / 2 - 120);
    this.imageContainer.setDepth(50); // Above background stars but below UI elements
    this.imageContainer.setVisible(false);
    
    // Mode-specific properties
    this.cycleTimer = null;
    this.currentImageType = null; // 'calm' or 'emotional'
    
    // Debug flag
    this.debugMode = true;
  }
  
  createPortal() {
    if (this.debugMode) console.log('Creating space portal');
    
    // Create portal if it doesn't exist and texture is available  
    if (!this.portal && this.scene.textures.exists('space_portal')) {
      this.portal = this.scene.add.image(0, 0, 'space_portal');
      
      // Scale portal to appropriate size (slightly larger than the images)
      const portalScale = 0.4; // Larger scale to be more visible
      this.portal.setScale(portalScale);
      this.portal.setAlpha(0.8); // More visible
      this.portal.setBlendMode(Phaser.BlendModes.ADD);
      this.portal.setDepth(-1); // Behind other elements
      
      // Add subtle rotation animation to the portal
      this.scene.tweens.add({
        targets: this.portal,
        angle: 360,
        duration: 20000,
        repeat: -1,
        ease: 'Linear'
      });
      
      // Pulsing effect removed for a steadier yantra
      
      this.imageContainer.add(this.portal);
    } else if (!this.scene.textures.exists('space_portal')) {
      if (this.debugMode) console.warn('space_portal texture not found, trying main portal');
      // Fallback to main portal if space_portal doesn't exist
      if (this.scene.textures.exists('portal')) {
        this.portal = this.scene.add.image(0, 0, 'portal');
    const portalScale = 0.12; // Smaller for Level 3 reveals (Emotional Intuition)
        this.portal.setScale(portalScale);
        this.portal.setAlpha(0.8);
        this.portal.setBlendMode(Phaser.BlendModes.ADD);
        this.portal.setDepth(-1);
        
        // Add spinning animation
        this.scene.tweens.add({
          targets: this.portal,
          angle: 360,
          duration: 12000,
          repeat: -1,
          ease: 'Linear'
        });
        
        this.imageContainer.add(this.portal);
      }
    }
  }
  
  setupAura() {
    if (this.debugMode) console.log('EmotionalAuraController: setupAura() called');
    if (this.debugMode) console.log('Game mode:', this.scene.gameMode);
    
    // Clear any existing timer and image
    if (this.cycleTimer) {
      this.cycleTimer.destroy();
      this.cycleTimer = null;
    }
    
    if (this.currentImage) {
      this.currentImage.destroy();
      this.currentImage = null;
    }
    
    // Clear existing image but preserve portal
    if (this.currentImage) {
      this.currentImage.destroy();
      this.currentImage = null;
    }
    
    // Clear container but preserve portal reference
    const portalRef = this.portal;
    this.imageContainer.removeAll(false); // Don't destroy children, just remove
    this.portal = null; // Reset reference
    
    // Create portal (will be fresh)
    this.createPortal();
    
    if (this.scene.gameMode === 'sense') {
      // SENSE MODE: Start cycling through random images
      this.startImageCycling();
    } else {
      // INFLUENCE MODE: Load the correct image but keep it hidden
      this.loadInfluenceModeImage();
    }
  }
  
  startImageCycling() {
    if (this.debugMode) console.log('Starting image cycling for SENSE mode - loading predetermined result');
    
    // For Sense Mode: Pre-select the correct answer based on predetermined result and keep it hidden
    this.loadPredeterminedImageForSenseMode();
  }
  
  loadPredeterminedImageForSenseMode() {
    if (this.debugMode) console.log('Loading predetermined image for SENSE mode');
    
    // Clear existing image
    if (this.currentImage) {
      this.currentImage.destroy();
      this.currentImage = null;
    }

    // Only remove the image, keep portal
    if (this.portal) {
      this.imageContainer.removeAll(false);
      this.imageContainer.add(this.portal);
    } else {
      this.imageContainer.removeAll(true);
      this.createPortal();
    }

    // Get the predetermined result from the scene
    let result = this.scene.predeterminedResult;
    if (result === null || result === undefined) {
      if (this.debugMode) console.warn('No predetermined result found for Sense Mode, generating one...');
      result = this.scene.generateCryptoRandom();
      this.scene.predeterminedResult = result;
    }

    const isCalm = result === 1;
    this.currentImageType = isCalm ? 'calm' : 'emotional';
    
    // Pick random image from the correct category
    const calmImages = ['calm 1', 'calm 2', 'calm 3'];
    const emotionalImages = ['1 emotional', '2 emotional', 'emotional 3'];
    const imageName = isCalm ? Phaser.Utils.Array.GetRandom(calmImages) : Phaser.Utils.Array.GetRandom(emotionalImages);
    
    this.createImage(imageName, true); // true = hidden for sense mode (pre-selected but not revealed)
  }
  
  loadInfluenceModeImage() {
    if (this.debugMode) console.log('Loading image for INFLUENCE mode');
    
    // For Level 3, we need predetermined result for emotional aura
    // For other levels, we should NOT have predetermined result - it will be generated on button press
    if (this.scene.currentActiveLevel === 3) {
        // Level 3: Use predetermined result but display immediately (no hidden state)
      let result = this.scene.predeterminedResult;
      if (result === null || result === undefined) {
        if (this.debugMode) console.warn('No predetermined result found for Level 3, generating one...');
        result = this.scene.generateCryptoRandom();
        this.scene.predeterminedResult = result;
      }
      
      const isCalm = result === 1;
      this.currentImageType = isCalm ? 'calm' : 'emotional';
      
      // Pick a random image from the correct category
      const calmImages = ['calm 1', 'calm 2', 'calm 3'];
      const emotionalImages = ['1 emotional', '2 emotional', 'emotional 3'];
      const imageName = isCalm ? Phaser.Utils.Array.GetRandom(calmImages) : Phaser.Utils.Array.GetRandom(emotionalImages);
      
        this.createImage(imageName, false); // false = not hidden for influence mode level 3
    } else {
      // Levels 1-5: Don't pre-select image - it will be generated when button is pressed
      // Just show the portal for now
      if (this.debugMode) console.log('Influence mode levels 1-5: No image pre-selection, showing portal only');
      
      // Clear any existing image
      if (this.currentImage) {
        this.currentImage.destroy();
        this.currentImage = null;
      }
      
      // Only keep portal
      if (this.portal) {
        this.imageContainer.removeAll(false);
        this.imageContainer.add(this.portal);
      } else {
        this.imageContainer.removeAll(true);
        this.createPortal();
      }
    }
  }
  
  createImage(imageName, isHidden) {
    if (this.debugMode) console.log('Creating image:', imageName, 'Hidden:', isHidden);
    
    // Verify the texture exists
    if (!this.scene.textures.exists(imageName)) {
      if (this.debugMode) console.error(`Texture '${imageName}' does not exist!`);
      console.log('Available textures:', Object.keys(this.scene.textures.list));
      return;
    }
    
    this.currentImage = this.scene.add.image(0, 0, imageName);
    
    // Size like a coin/dice - much smaller than full screen
    const targetSize = 240; // Similar to coin/dice size
    const imgOriginalWidth = this.currentImage.width;
    const imgOriginalHeight = this.currentImage.height;
    const scale = targetSize / Math.max(imgOriginalWidth, imgOriginalHeight);
    
    this.currentImage.setScale(scale);
    // Store the target scale for later use
    this.currentImage.targetScale = scale;
    
    // Add elements in correct layering order: portal (back), image (front)
    // Borders will be added only during reveal
    if (this.portal) {
      this.imageContainer.add(this.portal); // Ensure portal is added first (back layer)
    }
    this.imageContainer.add(this.currentImage);
    
    // Set visibility based on mode
    if (isHidden) {
      // In SENSE mode, images are completely hidden until reveal
      if (this.imageContainer) {
        this.imageContainer.setVisible(false).setAlpha(0);
      }
    } else {
      // In INFLUENCE mode, keep invisible until prediction is made, but container is technically visible for reveal
      if (this.imageContainer) {
        this.imageContainer.setVisible(true).setAlpha(0);
      }
    }
    
    if (this.debugMode) console.log('Image created with scale:', scale);
  }

  revealAura(isCorrect, onComplete) {
    if (this.debugMode) console.log('revealAura called with isCorrect:', isCorrect);
    
    // Clear any existing timers
    if (this.cycleTimer) {
      this.cycleTimer.destroy();
      this.cycleTimer = null;
    }
    
    if (this.scene.gameMode === 'sense') {
      // SENSE MODE: Image is already pre-selected and hidden, just reveal it
      if (this.debugMode) console.log('SENSE mode: Revealing pre-selected image');
      this.performReveal(isCorrect, onComplete);
    } else {
      // INFLUENCE MODE: Generate result NOW and display image immediately
    if (this.scene.currentActiveLevel === 3) {
        // Level 3: Image is already loaded based on predetermined result, just reveal it
        if (this.debugMode) console.log('INFLUENCE mode Level 3: Revealing predetermined image');
        this.performReveal(isCorrect, onComplete);
      } else {
        // Levels 1-5: Generate result NOW and load the correct image
        if (this.debugMode) console.log('INFLUENCE mode Levels 1-5: Generating result and loading image now');
        this.loadInfluenceModeImageOnDemand(() => {
          this.performReveal(isCorrect, onComplete);
        });
      }
    }
  }
  
  loadCorrectAnswerForSenseMode(callback) {
    if (this.debugMode) console.log('Loading correct answer for SENSE mode');
    
    // Clear current image but keep portal
    if (this.currentImage) {
      this.currentImage.destroy();
      this.currentImage = null;
    }
    
    // Only remove non-portal elements
    if (this.portal) {
      this.imageContainer.removeAll(false);
      this.imageContainer.add(this.portal);
    } else {
      this.imageContainer.removeAll(true);
      this.createPortal();
    }
    
    // Load the correct answer image
    let result = this.scene.predeterminedResult;
    if (result === null || result === undefined) {
      result = this.scene.generateCryptoRandom();
      this.scene.predeterminedResult = result;
    }
    
    const isCalm = result === 1;
    this.currentImageType = isCalm ? 'calm' : 'emotional';
    
    const calmImages = ['calm 1', 'calm 2', 'calm 3'];
    const emotionalImages = ['1 emotional', '2 emotional', 'emotional 3'];
    const imageName = isCalm ? Phaser.Utils.Array.GetRandom(calmImages) : Phaser.Utils.Array.GetRandom(emotionalImages);
    
    this.createImage(imageName, false);
    
    if (callback) callback();
  }

  loadInfluenceModeImageOnDemand(callback) {
    if (this.debugMode) console.log('Loading image on-demand for INFLUENCE mode levels 1-5');
    
    // Clear current image but keep portal
    if (this.currentImage) {
      this.currentImage.destroy();
      this.currentImage = null;
    }
    
    // Only remove non-portal elements
    if (this.portal) {
      this.imageContainer.removeAll(false);
      this.imageContainer.add(this.portal);
    } else {
      this.imageContainer.removeAll(true);
      this.createPortal();
    }
    
    // Generate result NOW for influence mode levels 1-5
    const result = this.scene.generateInfluencedRandom();
    this.scene.predeterminedResult = result; // Store for display purposes
    
    const isCalm = result === 1;
    this.currentImageType = isCalm ? 'calm' : 'emotional';
    
    const calmImages = ['calm 1', 'calm 2', 'calm 3'];
    const emotionalImages = ['1 emotional', '2 emotional', 'emotional 3'];
    const imageName = isCalm ? Phaser.Utils.Array.GetRandom(calmImages) : Phaser.Utils.Array.GetRandom(emotionalImages);
    
    this.createImage(imageName, false);
    
    if (callback) callback();
  }
  
  performReveal(isCorrect, onComplete) {
    if (this.debugMode) console.log('Performing reveal animation');
    this.scene.tweens.killTweensOf(this.imageContainer);
    if (this.currentImage) {
        this.scene.tweens.killTweensOf(this.currentImage);
    }
    this.scene.cameras.main.shake(300, 0.008);
    
    // Clean up any existing borders and result text to prevent duplicates
    if (this.imageContainer) {
      // Find and remove existing borders and result text
      const childrenToRemove = [];
      this.imageContainer.list.forEach(child => {
        // Remove graphics objects (borders/glows) and text objects (result labels)
        if (child.type === 'Graphics' || child.type === 'Text') {
          childrenToRemove.push(child);
          if (this.debugMode) console.log('Found duplicate element to remove:', child.type, child);
        }
      });
      
      // Remove and destroy the identified elements
      childrenToRemove.forEach(child => {
        this.imageContainer.remove(child);
        if (child.destroy) {
          child.destroy();
          if (this.debugMode) console.log('Destroyed duplicate element:', child.type);
        }
      });
      
      if (this.debugMode) console.log('Cleaned up', childrenToRemove.length, 'existing elements before reveal');
    }
    
    // Enhanced portal effect during reveal, then remove it
    if (this.portal) {
      // Intensify portal during reveal
      const currentPortalScale = this.portal.scaleX;
      this.scene.tweens.add({
        targets: this.portal,
        alpha: 1.3,
        scale: currentPortalScale * 1.4,
        duration: 400,
        ease: 'Power2.easeOut',
        yoyo: true,
        onComplete: () => {
          // Remove the old portal after the effect
          if (this.portal) {
            this.portal.destroy();
            this.portal = null;
          }
        }
      });
      
      // Add energy burst effect
      const energyRing = this.scene.add.graphics();
      energyRing.setBlendMode(Phaser.BlendModes.ADD);
      energyRing.setPosition(0, 0);
      this.imageContainer.add(energyRing);
      
      // Scale energy ring properties responsively
      const ringRadius = this.scene.scalingUtils ? this.scene.scalingUtils.scaleDimension(100) : 100;
      const strokeWidth = this.scene.scalingUtils ? this.scene.scalingUtils.scaleDimension(8) : 8;
      
      this.scene.tweens.add({
        targets: { scale: 0.1, alpha: 0.8 },
        scale: 2,
        alpha: 0,
        duration: 800,
        ease: 'Cubic.easeOut',
        onUpdate: (tween) => {
          energyRing.clear();
          energyRing.lineStyle(strokeWidth * (1 - tween.progress), 0x00e5ff, tween.targets[0].alpha);
          energyRing.strokeCircle(0, 0, ringRadius * tween.targets[0].scale);
        },
        onComplete: () => energyRing.destroy()
      });
    }
    
    // Create borders during reveal
    if (this.currentImage) {
      const scale = this.currentImage.targetScale || this.currentImage.scaleX;
      const scaledWidth = this.currentImage.width * scale;
      const scaledHeight = this.currentImage.height * scale;
      
      // Scale border properties responsively
      const borderRadius = this.scene.scalingUtils ? this.scene.scalingUtils.scaleDimension(20) : 20;
      const borderWidth = this.scene.scalingUtils ? this.scene.scalingUtils.scaleDimension(12) : 12;
      const borderColor = 0x8a2be2; // A nice purple to match the theme
      const borderPadding = borderWidth / 2;
      
      const border = this.scene.add.graphics();
      border.setPosition(0, 0); // Ensure border is positioned at container center
      border.lineStyle(borderWidth, borderColor, 0.8);
      border.strokeRoundedRect(
          -scaledWidth / 2 - borderPadding, 
          -scaledHeight / 2 - borderPadding, 
          scaledWidth + (borderPadding * 2), 
          scaledHeight + (borderPadding * 2), 
          borderRadius
      );
      
      // Add a subtle outer glow to the border
      const glow = this.scene.add.graphics();
      glow.setPosition(0, 0); // Ensure glow is positioned at container center
      glow.lineStyle(borderWidth * 1.5, borderColor, 0.4);
      glow.strokeRoundedRect(
          -scaledWidth / 2 - borderPadding, 
          -scaledHeight / 2 - borderPadding, 
          scaledWidth + (borderPadding * 2), 
          scaledHeight + (borderPadding * 2), 
          borderRadius
      );
      glow.setBlendMode(Phaser.BlendModes.ADD);
      
      // Start borders hidden and animate them in
      border.setAlpha(0);
      glow.setAlpha(0);
      
      // Add borders to container before image for proper layering
      this.imageContainer.addAt(glow, this.imageContainer.length - 1);
      this.imageContainer.addAt(border, this.imageContainer.length - 1);
      
      // Animate borders to become visible with different target alphas
        this.scene.tweens.add({
          targets: border,
          alpha: 0.8,
          duration: 800,
          delay: 400,
          ease: 'Power2.easeOut'
        });
        
        this.scene.tweens.add({
          targets: glow,
          alpha: 0.4,
          duration: 800,
          delay: 400,
          ease: 'Power2.easeOut'
        });
    }
    
    // Initial state for animation - images emerge from portal
    this.imageContainer.setVisible(true); // Ensure container is visible for reveal
    this.imageContainer.setAlpha(1);
    this.imageContainer.setScale(0.3); // Start smaller to simulate emerging from portal
    // Show result text - start hidden and animate in
    const resultText = this.scene.predeterminedResult === 1 ? 'CALM' : 'EMOTIONAL';
    const resultColorHex = this.scene.predeterminedResult === 1 ? '#00ccff' : '#ff6600';
    const resultColor = Phaser.Display.Color.HexStringToColor(resultColorHex).color;
    const resultLabel = this.scene.add.text(0, 150, resultText, {
        fontFamily: '"Arial Black", Arial, sans-serif',
        fontSize: '32px',
        color: resultColorHex,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 5,
        shadow: { color: resultColorHex, blur: 15, stroke: true, fill: true }
    }).setOrigin(0.5).setAlpha(0);
    if(this.currentImage) {
      this.currentImage.setAlpha(0);
    }
    this.imageContainer.add(resultLabel);
    
    // Animate result text to become visible
    this.scene.tweens.add({
      targets: resultLabel,
      alpha: 1,
      duration: 800,
      delay: 800, // Delay after borders appear
      ease: 'Power2.easeOut'
    });
    
    // Portal emergence animation - images grow from the portal center with 2 spins then stop
    this.scene.tweens.add({
        targets: this.imageContainer,
        scale: 1,
        angle: 720, // Two full rotations to match image (50% reduction)
        duration: 1500, // 1.5 seconds to match image spinning
        ease: 'Power2.easeOut', // Ease out for smooth stop
        delay: 200, // Match image delay for synchronization
        onComplete: () => {
             // Container stops spinning and remains clearly visible
             console.log('Image container reveal completed - 2 spins finished, container now stationary');
              if (this.debugMode) console.log('Aura reveal complete');
              if (onComplete) onComplete();
         }
    });
    // Fade-in image with emergence effect
    if (this.currentImage) {
        // Start image invisible and slightly scaled down from target size
        this.currentImage.setAlpha(0);
        const targetScale = this.currentImage.targetScale || 0.24; // Fallback scale
        this.currentImage.setScale(targetScale * 0.8); // Start smaller than target
        
        this.scene.tweens.add({
            targets: this.currentImage,
            alpha: 1,
            scale: targetScale, // Scale to the target size, not 1
            duration: 700,
            ease: 'Cubic.easeOut',
            delay: 200, // Slight delay to let portal effect start first
        });
        
        // Add synchronized spinning animation to the revealed image - 2 full spins then stop (50% reduction)
        this.imageSpinTween = this.scene.tweens.add({
            targets: this.currentImage,
            angle: 720, // Two full rotations (360 * 2)
            duration: 1500, // 1.5 seconds for 2 spins
            ease: 'Power2.easeOut', // Ease out for smooth stop
            delay: 200, // Start with image fade-in
            repeat: 0, // Single animation sequence
            onComplete: () => {
                // Image stops spinning and remains clearly visible
                console.log('Image reveal completed - 2 spins finished, image now stationary and clearly visible');
            }
        });
    }
    // Fade-in label with a delay
    this.scene.tweens.add({
        targets: resultLabel,
        alpha: 1,
        y: resultLabel.y - 10, // slight upward motion
        duration: 500,
        ease: 'Cubic.easeOut',
        delay: 300,
    });
    
    // Add expanding glow ring
    const glowRing = this.scene.add.graphics({ x: this.imageContainer.x, y: this.imageContainer.y });
    glowRing.setBlendMode(Phaser.BlendModes.ADD);
    
    // Scale glow ring properties responsively
    const glowStrokeWidth = this.scene.scalingUtils ? this.scene.scalingUtils.scaleDimension(15) : 15;
    const glowRadius = this.scene.scalingUtils ? this.scene.scalingUtils.scaleDimension(120) : 120;
    
    this.scene.tweens.add({
        targets: { scale: 0.2, alpha: 0.8 },
        scale: 1.5,
        alpha: 0,
        duration: 1000,
        ease: 'Cubic.easeOut',
        onUpdate: (tween) => {
            glowRing.clear();
            glowRing.lineStyle(glowStrokeWidth * (1 - tween.progress), resultColor, tween.targets[0].alpha);
            glowRing.strokeCircle(0, 0, glowRadius * tween.targets[0].scale);
        },
        onComplete: () => glowRing.destroy()
    });
    
    // Add more dramatic particles
    const scaledParticleSpeed = this.scene.scalingUtils ? {
        min: this.scene.scalingUtils.scaleDimension(100),
        max: this.scene.scalingUtils.scaleDimension(400)
    } : { min: 100, max: 400 };
    
    const emitter = this.scene.add.particles(this.imageContainer.x, this.imageContainer.y, 'star', {
        speed: scaledParticleSpeed,
        angle: { min: 0, max: 360 },
        scale: { start: 0.8, end: 0 },
        blendMode: 'ADD',
        lifespan: 1200,
        tint: [resultColor, 0xffffff],
        quantity: 5,
        frequency: 50,
    });
    emitter.setDepth(this.imageContainer.depth - 1);
    emitter.explode(40);
    this.scene.time.delayedCall(1500, () => emitter.destroy());
  }
  hide(onComplete) {
    // Stop cycling timer
    if (this.cycleTimer) {
      this.cycleTimer.destroy();
      this.cycleTimer = null;
    }
    
    this.scene.tweens.killTweensOf(this.imageContainer);
    if(this.currentImage) {
        this.scene.tweens.killTweensOf(this.currentImage);
    }
    this.scene.tweens.add({
        targets: this.imageContainer,
        alpha: 0,
        duration: 200,
        ease: 'Power2',
        onComplete: () => {
            if (this.imageContainer) {
              this.imageContainer.removeAll(true);
              this.imageContainer.setVisible(false);
            }
            this.currentImage = null;
            this.currentImageType = null;
            this.portal = null; // Reset portal reference
            if (onComplete) onComplete();
        }
    });
  }

  destroy() {
    // Stop the cycling timer
    if (this.cycleTimer) {
      this.cycleTimer.remove();
      this.cycleTimer = null;
    }
    
    // Stop image spinning tweens
    if (this.imageSpinTween) {
      this.imageSpinTween.stop();
      this.imageSpinTween = null;
    }
    // Note: Removed continuous spin tween cleanup since images now stop after 4 spins
    
    // Kill all tweens targeting this controller's objects
    if (this.scene && this.scene.tweens) {
      this.scene.tweens.killTweensOf([this.portal, this.imageContainer, this.currentImage]);
    }
    
    // Clean up the image container and all its children
    if (this.imageContainer) {
      this.imageContainer.removeAll(true);
      this.imageContainer.destroy();
      this.imageContainer = null;
    }
    
    // Reset references
    this.currentImage = null;
    this.portal = null;
    this.auraImages = [];
  }
}