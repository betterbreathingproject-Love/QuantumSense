export class AchievementManager {
  constructor(scene, statsTracker, tooltipManager) {
    this.scene = scene;
    this.statsTracker = statsTracker;
    this.tooltipManager = tooltipManager;
    this.createBadgeContainers();
  }

  createBadgeContainers() {
    const { width, height } = this.scene.sys.game.config;
    
    // Position badges to align with "Focus your intuition" text
    const badgeY = 730;
    
    // Achievement badges container
    this.badgeContainer = this.scene.add.container(35, badgeY);
    this.badgeContainer.setDepth(100);
    
    // Breathing awards container
    this.breathingAwardsContainer = this.scene.add.container(width - 35, badgeY);
    this.breathingAwardsContainer.setDepth(100);
  }

  updateBadges(shouldAnimate = false) {
    this.badgeContainer.removeAll(true);
    const unlockedAchievements = this.statsTracker.getAllAchievements().filter(a => a.unlocked);
    const recentAchievements = unlockedAchievements.slice(-5);
    
    recentAchievements.forEach((achievement, index) => {
      const badge = this.createBadgeVisual(achievement, index, shouldAnimate);
      this.badgeContainer.add(badge);
    });
    this.repositionBadges();
    
    this.breathingAwardsContainer.removeAll(true);
    const breathingAwards = this.statsTracker.getAllBreathingAwards().filter(a => a.unlocked);
    breathingAwards.forEach((award, index) => {
      const badge = this.createBadgeVisual(award, index, shouldAnimate);
      this.breathingAwardsContainer.add(badge);
    });
    this.repositionBreathingAwards();
  }

  addBadge(achievement, isBreathingAward = false) {
    const container = isBreathingAward ? this.breathingAwardsContainer : this.badgeContainer;
    const unlockedCount = container.length;
    const newBadge = this.createBadgeVisual(achievement, unlockedCount, true);
    container.add(newBadge);
    
    if (isBreathingAward) {
      this.repositionBreathingAwards();
    } else {
      this.repositionBadges();
    }
  }

  createBadgeVisual(achievement, index, shouldAnimate = false) {
    const badgeSize = 30;
    const badge = this.scene.add.container(0, 0);
    
    const glowBg = this.scene.add.graphics();
    glowBg.fillStyle(0x00e5ff, 0.2);
    glowBg.fillCircle(0, 0, badgeSize / 2 + 3);
    glowBg.setBlendMode(Phaser.BlendModes.ADD);
    
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1a2c3d, 0.95);
    bg.fillCircle(0, 0, badgeSize / 2);
    bg.lineStyle(3, 0x00e5ff, 1);
    bg.strokeCircle(0, 0, badgeSize / 2);
    
    const icon = this.scene.add.text(0, 0, achievement.icon, {
      fontSize: '18px',
      align: 'center'
    }).setOrigin(0.5);
    
    badge.add([glowBg, bg, icon]);
    badge.setInteractive(new Phaser.Geom.Circle(0, 0, badgeSize/2), Phaser.Geom.Circle.Contains);
    
    badge.on('pointerover', () => {
      this.tooltipManager.createBadgeTooltip(achievement, badge);
      this.scene.tweens.add({
        targets: badge,
        scale: 1.2,
        duration: 200,
        ease: 'Sine.easeOut'
      });
      if (badge.getData('isHovered')) return;
      badge.setData('isHovered', true);
      this.tooltipManager.createBadgeTooltip(achievement, badge);
      this.scene.tweens.add({
        targets: badge,
        scale: 1.2,
        duration: 200,
        ease: 'Sine.easeOut'
      });
      const badgeGlobalPos = badge.getWorldTransformMatrix().transformPoint(0, 0);
      const emitter = this.scene.add.particles(badgeGlobalPos.x, badgeGlobalPos.y, 'particle', {
          speed: { min: 20, max: 40 },
          angle: { min: 0, max: 360 },
          scale: { start: 0.2, end: 0 },
          blendMode: 'ADD',
          lifespan: 400,
          tint: [0x00e5ff, 0xffffff],
          frequency: -1,
      });
      emitter.setDepth(badge.depth - 1);
      emitter.explode(8);
      this.scene.time.delayedCall(500, () => emitter.destroy());
    });
    badge.on('pointerout', () => {
      badge.setData('isHovered', false);
      this.tooltipManager.hideTooltip(badge);
      this.scene.tweens.add({
        targets: badge,
        scale: 1,
        duration: 200,
        ease: 'Sine.easeIn'
      });
    });
    
    if (shouldAnimate) {
      const { width } = this.scene.sys.game.config;
      badge.setPosition(width / 2, this.badgeContainer.y);
      badge.setScale(0);
      
      const emitter = this.scene.add.particles(badge.x, badge.y, 'particle', {
        speed: { min: 50, max: 150 },
        scale: { start: 0.4, end: 0 },
        blendMode: 'ADD',
        lifespan: 600,
        tint: [0x4a7c59, 0x00ff00, 0xffffff],
      });
      emitter.setEmitZone({ source: new Phaser.Geom.Circle(0,0, 20), type: 'edge', quantity: 20 });
      emitter.explode(20, badge.x, badge.y);
      this.scene.time.delayedCall(1000, () => emitter.destroy());
      
      this.scene.tweens.add({
        targets: badge,
        scale: 1,
        duration: 500,
        ease: 'Back.easeOut',
        delay: 200,
      });
    }
    
    return badge;
  }

// Tooltip creation is now handled by TooltipManager

  repositionBadges() {
    const badgeSize = 30;
    const badgeMargin = 8;
    this.badgeContainer.list.forEach((badge, index) => {
      const targetY = index * (badgeSize + badgeMargin);
      
      this.scene.tweens.add({
        targets: badge,
        x: 0,
        y: targetY,
        duration: 300,
        ease: 'Sine.easeInOut'
      });
    });
  }

  repositionBreathingAwards() {
    const badgeSize = 30;
    const badgeMargin = 8;
    this.breathingAwardsContainer.list.forEach((badge, index) => {
      const targetY = index * (badgeSize + badgeMargin);
      this.scene.tweens.add({
        targets: badge,
        x: 0,
        y: targetY,
        duration: 300,
        ease: 'Sine.easeInOut'
      });
    });
  }

  showAchievementNotification(achievement) {
    const { width } = this.scene.sys.game.config;
    
    const container = this.scene.add.container(width / 2, -100);
    container.setDepth(1500);
    
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x2d4a22, 0.95);
    bg.fillRoundedRect(-200, -40, 400, 80, 15);
    bg.lineStyle(3, 0x4a7c59, 1);
    bg.strokeRoundedRect(-200, -40, 400, 80, 15);
    
    const iconText = this.scene.add.text(-170, -10, achievement.icon, {
      fontFamily: 'Arial, sans-serif', fontSize: '32px'
    }).setOrigin(0.5);
    
    const achievementLabel = this.scene.add.text(-120, -20, 'ACHIEVEMENT UNLOCKED!', {
      fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#4a7c59', fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    
    const titleText = this.scene.add.text(-120, 0, achievement.title, {
      fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    
    const descText = this.scene.add.text(-120, 15, achievement.description, {
      fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#aaaaaa'
    }).setOrigin(0, 0.5);
    
    container.add([bg, iconText, achievementLabel, titleText, descText]);
    
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

  hideForBreathing() {
    if (this.badgeContainer && this.badgeContainer.scene) this.badgeContainer.setVisible(false);
    if (this.breathingAwardsContainer && this.breathingAwardsContainer.scene) this.breathingAwardsContainer.setVisible(false);
  }

  showFromBreathing() {
    if (this.badgeContainer && this.badgeContainer.scene) this.badgeContainer.setVisible(true);
    if (this.breathingAwardsContainer && this.breathingAwardsContainer.scene) this.breathingAwardsContainer.setVisible(true);
  }
  show() {
    if (this.badgeContainer && this.badgeContainer.scene) this.badgeContainer.setVisible(true);
    if (this.breathingAwardsContainer && this.breathingAwardsContainer.scene) this.breathingAwardsContainer.setVisible(true);
  }
}