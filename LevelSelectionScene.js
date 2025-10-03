

import Phaser from 'phaser';

export class LevelSelectionScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LevelSelectionScene' });
    this.scrollContainer = null;
    this.contentHeight = 0;
  }

  create() {
    const { width, height } = this.sys.game.config;
    
    // Get UI manager reference - wait for GameScene to be fully initialized
    const gameScene = this.scene.get('GameScene');
    if (gameScene && gameScene.uiManager) {
      this.uiManager = gameScene.uiManager;
    } else {
      // If GameScene isn't ready, wait a bit and try again
      this.time.delayedCall(100, () => {
        const gameScene = this.scene.get('GameScene');
        if (gameScene && gameScene.uiManager) {
          this.uiManager = gameScene.uiManager;
          // Re-setup scrolling once UIManager is available
          this.setupMobileScrolling();
        }
      });
    }
    
    // Create starry background
    this.createStarryBackground();
    
    // Create scrollable content
    this.createScrollableContent();
  }

  createStarryBackground() {
    const { width, height } = this.sys.game.config;
    
    // Create gradient background
    this.cameras.main.setBackgroundColor('#0c0114');
    
    // Add stars
    for (let i = 0; i < 100; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const size = Phaser.Math.FloatBetween(0.5, 2);
      const alpha = Phaser.Math.FloatBetween(0.3, 1);
      
      const star = this.add.circle(x, y, size, 0xffffff, alpha);
      star.setDepth(1);
      
      // Add twinkling animation
      this.tweens.add({
        targets: star,
        alpha: alpha * 0.3,
        duration: Phaser.Math.Between(1000, 3000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  createScrollableContent() {
    const { width, height } = this.sys.game.config;
    
    // Create main scroll container
    this.scrollContainer = this.add.container(0, 0);
    this.scrollContainer.setDepth(10);
    
    // Initialize content
    this.createHeader();
    this.createLevelCategories();
    this.createNavigation();
    
    // Setup scrolling after content is created
    this.setupMobileScrolling();
  }

  createHeader() {
    const { width } = this.sys.game.config;
    
    // Header background with gradient
    const headerBg = this.add.graphics();
    headerBg.fillGradientStyle(0x1a0033, 0x1a0033, 0x0c0114, 0x0c0114, 1, 1, 0.8, 0.8);
    headerBg.fillRect(0, 0, width, 80);
    headerBg.setDepth(120);
    this.scrollContainer.add(headerBg);
    
    // Title
    const title = this.add.text(width / 2, 40, 'DIVINE TRAINING', {
      fontFamily: '"Arial Black", Arial, sans-serif',
      fontSize: '28px',
      color: '#00e5ff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      shadow: { color: '#00e5ff', blur: 15, stroke: true, fill: true }
    }).setOrigin(0.5).setDepth(121);
    this.scrollContainer.add(title);
    
    // Back button
    this.createBackButton();
  }

  createBackButton() {
    const backButton = this.add.container(40, 40);
    backButton.setDepth(122);
    
    const backBg = this.add.graphics();
    backBg.fillStyle(0x2d0b4b, 0.8);
    backBg.fillRoundedRect(-25, -15, 50, 30, 8);
    backBg.lineStyle(2, 0x8a2be2, 1);
    backBg.strokeRoundedRect(-25, -15, 50, 30, 8);
    
    const backIcon = this.add.text(-8, 0, '←', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    const backText = this.add.text(8, 0, 'BACK', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#c9c9c9',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    backButton.add([backBg, backIcon, backText]);
    backButton.setSize(50, 30).setInteractive({ useHandCursor: true });
    this.scrollContainer.add(backButton);
    
    backButton.on('pointerdown', () => {
      this.scene.start('GameScene');
    });
    
    // Hover effect
    backButton.on('pointerover', () => {
      this.tweens.add({
        targets: backButton,
        scale: 1.1,
        duration: 200,
        ease: 'Power2'
      });
    });
    
    backButton.on('pointerout', () => {
      this.tweens.add({
        targets: backButton,
        scale: 1,
        duration: 200,
        ease: 'Power2'
      });
    });
  }

  createLevelCategories() {
    const { width } = this.sys.game.config;
    let yPos = 120;
    
    // Get stats to determine unlocked levels
    const statsTracker = this.scene.get('GameScene')?.statsTracker;
    const stats = statsTracker ? statsTracker.getStats() : { psychicLevel: 1 };
    
    // Basic Training Category
    yPos = this.createCategory('BASIC TRAINING', '🌱', yPos, [
      {
        level: 1,
        title: 'Coin Flip Oracle',
        subtitle: 'Master the ancient art of coin divination',
        description: 'Begin your journey with the fundamental practice of binary prediction.',
        icon: '🪙',
        difficulty: 'Beginner',
        unlocked: true,
        plays: 0,
        streak: 0
      },
      {
        level: 2,
        title: 'Schrödinger\'s Mystery',
        subtitle: 'Solve the quantum cat puzzle',
        description: 'Explore quantum uncertainty by finding the hidden cat.',
        icon: '🐱',
        difficulty: 'Novice',
        unlocked: stats.psychicLevel >= 2,
        plays: 0,
        streak: 0
      }
    ]);
    
    // Advanced Mastery Category
    yPos = this.createCategory('ADVANCED MASTERY', '⚡', yPos + 40, [
      {
        level: 4,
        title: 'Mystic Tetrahedron',
        subtitle: 'Command the 4-sided sacred geometry',
        description: 'Harness the power of four-dimensional probability.',
        icon: '🔮',
        difficulty: 'Adept',
        unlocked: stats.psychicLevel >= 4,
        plays: 0,
        streak: 0
      },
      {
        level: 5,
        title: 'Pentagon Portal',
        subtitle: 'Navigate the 5-sided energy field',
        description: 'Master the complex patterns of five-fold prediction.',
        icon: '⭐',
        difficulty: 'Expert',
        unlocked: stats.psychicLevel >= 5,
        plays: 0,
        streak: 0
      },
      {
        level: 6,
        title: 'Sacred Hexagon',
        subtitle: 'Unlock the 6-sided cosmic matrix',
        description: 'Achieve mastery over the complete spectrum of possibilities.',
        icon: '💎',
        difficulty: 'Master',
        unlocked: stats.psychicLevel >= 6,
        plays: 0,
        streak: 0
      }
    ]);
    
    // Intuitive Arts Category
    yPos = this.createCategory('INTUITIVE ARTS', '🧘', yPos + 40, [
      {
        level: 3,
        title: 'Emotional Intuition',
        subtitle: 'Sense the emotional energy of an unseen image',
        description: 'Develop your empathic abilities by reading emotional signatures.',
        icon: '🌸',
        difficulty: 'Transcendent',
        unlocked: stats.psychicLevel >= 3,
        plays: 0,
        streak: 0
      }
    ]);
    
    // Set content height with extra padding for smooth scrolling
    this.contentHeight = yPos + 150;
  }

  createCategory(title, emoji, startY, levels) {
    const { width } = this.sys.game.config;
    let yPos = startY;
    
    // Category header
    const categoryHeader = this.add.container(width / 2, yPos);
    categoryHeader.setDepth(111);
    
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x1a0238, 0.9);
    headerBg.fillRoundedRect(-200, -20, 400, 40, 20);
    headerBg.lineStyle(2, 0x8a2be2, 0.8);
    headerBg.strokeRoundedRect(-200, -20, 400, 40, 20);
    
    const headerGlow = this.add.graphics();
    headerGlow.fillStyle(0x8a2be2, 0.2);
    headerGlow.fillRoundedRect(-202, -22, 404, 44, 22);
    headerGlow.setBlendMode(Phaser.BlendModes.ADD);
    
    const categoryTitle = this.add.text(0, 0, `${emoji} ${title}`, {
      fontFamily: '"Arial Black", Arial, sans-serif',
      fontSize: '20px',
      color: '#00e5ff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);
    
    categoryHeader.add([headerGlow, headerBg, categoryTitle]);
    this.scrollContainer.add(categoryHeader);
    
    yPos += 60;
    
    // Level cards
    levels.forEach((levelData, index) => {
      const card = this.createLevelCard(levelData, width / 2, yPos);
      this.scrollContainer.add(card);
      yPos += 140;
    });
    
    return yPos;
  }

  createLevelCard(levelData, x, y) {
    const card = this.add.container(x, y);
    card.setDepth(111);
    
    const cardWidth = Math.min(500, this.sys.game.config.width - 40);
    const cardHeight = 120;
    
    // Card background with gradient and glow
    const cardBg = this.add.graphics();
    if (levelData.unlocked) {
      cardBg.fillGradientStyle(0x2d4a85, 0x1e3a5f, 0x1a2c3d, 0x2d4a85, 1, 1, 0.9, 0.9);
    } else {
      cardBg.fillStyle(0x1a1a1a, 0.6);
    }
    cardBg.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 15);
    
    // Card border
    const borderColor = levelData.unlocked ? 0x00bfff : 0x666666;
    cardBg.lineStyle(2, borderColor, 0.8);
    cardBg.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 15);
    
    // Glow effect for unlocked levels
    if (levelData.unlocked) {
      const glow = this.add.graphics();
      glow.fillStyle(borderColor, 0.15);
      glow.fillRoundedRect(-cardWidth / 2 - 3, -cardHeight / 2 - 3, cardWidth + 6, cardHeight + 6, 18);
      glow.setBlendMode(Phaser.BlendModes.ADD);
      card.add(glow);
    }
    
    card.add(cardBg);
    
    // Level number badge
    const badgeBg = this.add.graphics();
    badgeBg.fillStyle(levelData.unlocked ? 0x00e5ff : 0x666666, 1);
    badgeBg.fillCircle(-cardWidth / 2 + 30, -cardHeight / 2 + 25, 18);
    badgeBg.lineStyle(3, 0xffffff, 1);
    badgeBg.strokeCircle(-cardWidth / 2 + 30, -cardHeight / 2 + 25, 18);
    
    const levelNumber = this.add.text(-cardWidth / 2 + 30, -cardHeight / 2 + 25, levelData.level.toString(), {
      fontFamily: '"Arial Black", Arial, sans-serif',
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    card.add([badgeBg, levelNumber]);
    
    // Level icon
    const icon = this.add.text(-cardWidth / 2 + 80, -cardHeight / 2 + 25, levelData.icon, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '32px'
    }).setOrigin(0.5);
    
    card.add(icon);
    
    // Level info
    const titleColor = levelData.unlocked ? '#ffffff' : '#888888';
    const subtitleColor = levelData.unlocked ? '#c9c9c9' : '#666666';
    
    const title = this.add.text(-cardWidth / 2 + 120, -cardHeight / 2 + 15, levelData.title, {
      fontFamily: '"Arial Black", Arial, sans-serif',
      fontSize: '18px',
      color: titleColor,
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    
    const subtitle = this.add.text(-cardWidth / 2 + 120, -cardHeight / 2 + 35, levelData.subtitle, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: subtitleColor,
      fontStyle: 'italic'
    }).setOrigin(0, 0.5);
    
    const description = this.add.text(-cardWidth / 2 + 120, -cardHeight / 2 + 55, levelData.description, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: subtitleColor,
      wordWrap: { width: cardWidth - 200 }
    }).setOrigin(0, 0.5);
    
    card.add([title, subtitle, description]);
    
    // Difficulty badge
    const difficultyBg = this.add.graphics();
    const difficultyColors = {
      'Beginner': 0x00ff88,
      'Novice': 0x00e5ff,
      'Adept': 0xffaa00,
      'Expert': 0xff6600,
      'Master': 0xff00ff,
      'Transcendent': 0xffd700
    };
    const difficultyColor = difficultyColors[levelData.difficulty] || 0x666666;
    
    difficultyBg.fillStyle(levelData.unlocked ? difficultyColor : 0x666666, 0.8);
    difficultyBg.fillRoundedRect(cardWidth / 2 - 80, -cardHeight / 2 + 10, 70, 20, 10);
    
    const difficultyText = this.add.text(cardWidth / 2 - 45, -cardHeight / 2 + 20, levelData.difficulty, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    card.add([difficultyBg, difficultyText]);
    
    // Play button or lock
    if (levelData.unlocked) {
      const playButton = this.add.graphics();
      playButton.fillStyle(0x00aa00, 1);
      playButton.fillRoundedRect(cardWidth / 2 - 70, cardHeight / 2 - 35, 60, 25, 12);
      playButton.lineStyle(2, 0x00ff00, 1);
      playButton.strokeRoundedRect(cardWidth / 2 - 70, cardHeight / 2 - 35, 60, 25, 12);
      
      const playText = this.add.text(cardWidth / 2 - 40, cardHeight / 2 - 22.5, 'PLAY', {
        fontFamily: '"Arial Black", Arial, sans-serif',
        fontSize: '12px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      
      card.add([playButton, playText]);
    } else {
      const lockIcon = this.add.text(cardWidth / 2 - 40, cardHeight / 2 - 22.5, '🔒', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px'
      }).setOrigin(0.5);
      
      card.add(lockIcon);
    }
    
    // Make card interactive if unlocked
    if (levelData.unlocked) {
      card.setSize(cardWidth, cardHeight).setInteractive({ useHandCursor: true });
      
      card.on('pointerdown', () => {
        // Start the game at this level
        const gameScene = this.scene.get('GameScene');
        if (gameScene) {
          gameScene.setActiveLevel(levelData.level);
          this.scene.start('GameScene');
        }
      });
      
      // Hover effects
      card.on('pointerover', () => {
        this.tweens.add({
          targets: card,
          scale: 1.05,
          duration: 200,
          ease: 'Power2'
        });
      });
      
      card.on('pointerout', () => {
        this.tweens.add({
          targets: card,
          scale: 1,
          duration: 200,
          ease: 'Power2'
        });
      });
    }
    
    return card;
  }

  createNavigation() {
    const { width, height } = this.sys.game.config;
    
    // Bottom navigation background
    const navBg = this.add.graphics();
    navBg.fillGradientStyle(0x0c0114, 0x0c0114, 0x1a0033, 0x1a0033, 0.8, 0.8, 1, 1);
    navBg.fillRect(0, height - 80, width, 80);
    navBg.setDepth(120);
    
    // Home button
    this.createNavButton(width / 4, height - 40, '🏠', 'Home', () => {
      this.scene.start('GameScene');
    });
    
    // Games button (current)
    this.createNavButton(width / 2, height - 40, '🎮', 'Games', null, true);
    
    // Stats button
    this.createNavButton(3 * width / 4, height - 40, '📊', 'Leaderboard', () => {
      const gameScene = this.scene.get('GameScene');
      if (gameScene && gameScene.uiManager) {
        this.scene.start('GameScene');
        gameScene.uiManager.toggleProfilePanel();
      }
    });
  }

  createNavButton(x, y, icon, label, onClick, active = false) {
    const button = this.add.container(x, y);
    button.setDepth(121);
    
    const bg = this.add.graphics();
    if (active) {
      bg.fillStyle(0x8a2be2, 0.3);
      bg.fillRoundedRect(-30, -25, 60, 50, 15);
    }
    
    const iconText = this.add.text(0, -5, icon, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px'
    }).setOrigin(0.5);
    
    const labelText = this.add.text(0, 15, label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      color: active ? '#00e5ff' : '#c9c9c9',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    button.add([bg, iconText, labelText]);
    
    if (onClick) {
      button.setSize(60, 50).setInteractive({ useHandCursor: true });
      button.on('pointerdown', onClick);
      
      button.on('pointerover', () => {
        this.tweens.add({
          targets: button,
          scale: 1.1,
          duration: 200,
          ease: 'Power2'
        });
      });
      
      button.on('pointerout', () => {
        this.tweens.add({
          targets: button,
          scale: 1,
          duration: 200,
          ease: 'Power2'
        });
      });
    }
  }

  setupMobileScrolling() {
    const { width, height } = this.sys.game.config;
    const headerHeight = 80;
    const navHeight = 80;
    const visibleHeight = height - (headerHeight + navHeight); // area between header and bottom nav
    const contentHeight = this.contentHeight || 0;

    // Prevent duplicate setup
    if (this._scrollSetup) return;
    this._scrollSetup = true;

    if (contentHeight > visibleHeight) {
      // Mask the scrollable content to the visible area (between header and nav)
      const maskGraphics = this.make.graphics();
      maskGraphics.fillStyle(0xffffff, 1);
      maskGraphics.fillRect(0, headerHeight, width, visibleHeight);
      this.scrollContainer.mask = new Phaser.Display.Masks.GeometryMask(this, maskGraphics);

      // Create bounded scroll zone for touch/drag scrolling (only over the content area)
      const scrollZone = this.add.zone(
        width / 2,
        headerHeight + visibleHeight / 2,
        width,
        visibleHeight
      ).setInteractive({ draggable: true });
      // Place the scroll zone beneath interactive elements inside the content, but above background
      scrollZone.setDepth(119);

      let isDragging = false;
      let startY = 0;
      let startContainerY = 0;

      scrollZone.on('pointerdown', (pointer) => {
        // prevent clicks from leaking to elements behind the scroll zone
        pointer.event?.stopPropagation?.();
      });

      scrollZone.on('dragstart', (pointer) => {
        isDragging = true;
        startY = pointer.y;
        startContainerY = this.scrollContainer.y;
      });

      scrollZone.on('drag', (pointer) => {
        if (isDragging) {
          const deltaY = pointer.y - startY;
          const newY = startContainerY + deltaY;
          const minY = -(contentHeight - visibleHeight);
          const maxY = 0;

          const clampedY = Phaser.Math.Clamp(newY, minY, maxY);
          this.scrollContainer.setY(clampedY);
        }
      });

      scrollZone.on('dragend', () => {
        isDragging = false;
      });

      // Remove any existing wheel handler first
      if (this.uiManager?.wheelEventManager) {
        this.uiManager.wheelEventManager.unregisterHandler('levelScroll');
      }

      // Mouse wheel support using WheelEventManager - only when pointer is within content area
      this.levelScrollHandler = (pointer, gameObjects, deltaX, deltaY) => {
        const scrollSpeed = 30;
        const currentY = this.scrollContainer.y;
        const minY = -(contentHeight - visibleHeight);
        const maxY = 0;

        const newY = Phaser.Math.Clamp(currentY - (deltaY * scrollSpeed / 100), minY, maxY);
        this.scrollContainer.setY(newY);
      };

      // Register with WheelEventManager
      if (this.uiManager?.wheelEventManager) {
        this.uiManager.wheelEventManager.registerHandler('levelScroll', this.levelScrollHandler, this);
      }
    }
  }
  
  destroy() {
    // Unregister wheel handler when scene is destroyed
    if (this.uiManager?.wheelEventManager) {
      this.uiManager.wheelEventManager.unregisterHandler('levelScroll');
    }
    super.destroy();
  }
}

