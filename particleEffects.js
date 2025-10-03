export class ParticleEffects {
  constructor(scene) {
    this.scene = scene;
  }

  createRollParticles() {
    // Placeholder for new particle effects if needed
  }

  createSuccessParticles() {
    const width = this.scene.sys.game.config.width;
    const height = this.scene.sys.game.config.height;
    const dicePosition = { x: width / 2, y: height / 2 - 100 };
    
    // Subtle glow effect around the dice
    const glowCircle = this.scene.add.graphics();
    glowCircle.setPosition(dicePosition.x, dicePosition.y);
    glowCircle.setBlendMode(Phaser.BlendModes.ADD);
    glowCircle.setAlpha(0);
    
    // Draw a soft glow circle
    glowCircle.fillGradientStyle(0x00ff88, 0x00ff88, 0x00ff88, 0x00ff88, 0.6, 0.6, 0.2, 0.2);
    glowCircle.fillCircle(0, 0, 80);
    
    // Animate the glow - fade in and out
    this.scene.tweens.add({
        targets: glowCircle,
        alpha: { from: 0, to: 0.8 },
        scaleX: { from: 0.5, to: 1.2 },
        scaleY: { from: 0.5, to: 1.2 },
        duration: 400,
        ease: 'Sine.easeOut',
        yoyo: true,
        onComplete: () => {
            glowCircle.destroy();
        }
    });
    
    // Gentle sparkle particles - much fewer and smaller
    const sparkleEmitter = this.scene.add.particles(dicePosition.x, dicePosition.y, 'particle', {
        speed: { min: 50, max: 150 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.4, end: 0 },
        blendMode: 'ADD',
        lifespan: 800,
        tint: [0x00ff88, 0xffffff, 0x88ffaa],
        gravityY: -50, // Slight upward drift
        quantity: 3,
        frequency: 100
    });
    
    // Brief sparkle burst
    sparkleEmitter.explode(12);
    
    // Clean up sparkles
    this.scene.time.delayedCall(1000, () => sparkleEmitter.destroy());
  }
  createLevelUpUnlockEffect(fromPos, onComplete) {
      const emitter = this.scene.add.particles(fromPos.x, fromPos.y, 'particle', {
          speed: 800,
          scale: { start: 0.8, end: 0.2 },
          alpha: { start: 1, end: 0.5 },
          blendMode: 'ADD',
          lifespan: 800,
          tint: [0x00ffff, 0x88ffaa, 0xffff88],
      });
      // The effect just appears and then the button pulses
      emitter.explode(40);
      
      this.scene.time.delayedCall(500, () => {
          if (onComplete) onComplete();
          this.scene.time.delayedCall(1000, () => emitter.destroy());
    });
  }
  createCatRevealParticles(x, y) {
    // Emitter for heart-like particles
    const heartEmitter = this.scene.add.particles(x, y, 'particle', {
        speed: { min: 100, max: 300 },
        angle: { start: 220, end: 320 }, // Emit upwards in an arc
        scale: { start: 0.6, end: 0 },
        blendMode: 'ADD',
        lifespan: 1000,
        tint: [0xff00ff, 0xff69b4, 0xffc0cb], // Pinks and magentas
        gravityY: -500,
    });
    heartEmitter.explode(25);
    this.scene.time.delayedCall(2000, () => heartEmitter.destroy());
    // Another emitter for general sparkles
    const sparkleEmitter = this.scene.add.particles(x, y, 'particle', {
        speed: { min: 50, max: 200 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.5, end: 0 },
        blendMode: 'ADD',
        lifespan: 800,
        tint: [0xffff00, 0xffffff], // Gold and white
        frequency: -1, // only on explode
    });
    sparkleEmitter.explode(20);
    this.scene.time.delayedCall(2000, () => sparkleEmitter.destroy());
  }
}