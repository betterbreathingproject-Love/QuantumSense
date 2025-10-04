export class MenuManager {
  constructor(scene, statsTracker, binauralGenerator, onProfileToggle, onBinauralToggle, onLeaderboardToggle, onResetToggle, onMyStatsToggle) {
    this.scene = scene;
    this.statsTracker = statsTracker;
    this.binauralGenerator = binauralGenerator;
    this.onProfileToggle = onProfileToggle;
    this.onBinauralToggle = onBinauralToggle;
    this.onLeaderboardToggle = onLeaderboardToggle;
    this.onResetToggle = onResetToggle;
    this.onMyStatsToggle = onMyStatsToggle;
    
    this.menuOpen = false;
    this.createMenu();
    this.setupOutsideClickHandler();
  }

  createMenu() {
    const { width, height } = this.scene.sys.game.config;
    this.menuWidth = 400;
    this.menuContainer = this.scene.add.container(width, 0);
    this.menuContainer.setDepth(500);
    
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0c0114, 1.0);
    bg.fillRect(0, 0, this.menuWidth, height);
    bg.lineStyle(2, 0x8a2be2, 1);
    bg.strokeRect(0, 0, this.menuWidth, height);
    
    this.menuTitle = this.scene.add.text(this.menuWidth / 2, 85, 'Menu', {
      fontFamily: 'Arial, sans-serif', fontSize: '36px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);
    // Menu Button (Hamburger Icon)
    this.menuButton = this.createHamburgerButton(width - 60, 60, () => this.toggleMenu());
    
    // Menu items positions
    const yPos = {
      // profile removed; shift remaining items up to close the gap
      mystats: 180,
      tutorial: 240,
      coherence: 300,
      binaural: 360,
      leaderboard: 420,
      audioTitle: 480,
      sfx: 540,
      music: 620,
      resetButton: 680
    };
    
    const myStatsButton = this.createMenuButton(yPos.mystats, 'My Stats', () => {
      this.toggleMenu(false);
      this.onMyStatsToggle();
    });
    
    const tutorialButton = this.scene.add.text(this.menuWidth / 2, yPos.tutorial, 'How to Play', {
      fontFamily: 'Arial, sans-serif', fontSize: '24px', color: '#00e5ff',
      backgroundColor: '#2d0b4b',
      padding: { x: 25, y: 15 },
      align: 'center',
      fixedWidth: this.menuWidth - 60
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    
    tutorialButton.on('pointerover', () => {
      this.scene.tweens.add({ targets: tutorialButton, scale: 1.05, duration: 200, ease: 'Sine.easeOut' });
    });
    tutorialButton.on('pointerout', () => {
      this.scene.tweens.add({ targets: tutorialButton, scale: 1, duration: 200, ease: 'Sine.easeIn' });
    });
    tutorialButton.on('pointerdown', () => {
      this.scene.playSound('page_turn');
      this.scene.tweens.add({ 
        targets: tutorialButton, 
        scale: 0.95, 
        duration: 100, 
        ease: 'Sine.easeIn', 
        yoyo: true, 
        onComplete: () => {
          this.toggleMenu(false);
          this.scene.showTutorial();
        }
      });
    });
    
    const coherenceButton = this.createMenuButton(yPos.coherence, 'Tune In', () => {
      this.toggleMenu(false);
      if(this.scene.gameState === 'predicting' || this.scene.gameState === 'waiting'){
        this.scene.startBreathingExercise();
      }
    });
    
    const binauralButton = this.createMenuButton(yPos.binaural, 'Binaural Tones', () => {
      this.toggleMenu(false);
      this.onBinauralToggle();
    });
    const leaderboardButton = this.createMenuButton(yPos.leaderboard, 'Leaderboard', () => {
        this.toggleMenu(false);
        this.onLeaderboardToggle();
    });
    
    const audioTitle = this.scene.add.text(this.menuWidth / 2, yPos.audioTitle, 'Audio Settings', {
      fontFamily: 'Arial, sans-serif', fontSize: '22px', color: '#c9c9c9', fontStyle: 'bold'
    }).setOrigin(0.5);
    
    const sfxSlider = this.createVolumeSlider(yPos.sfx, 'SFX Volume', this.scene.audioManager.getAudioSettings().sfxVolume, (volume) => {
      this.scene.audioManager.updateSFXVolume(volume);
      sfxSlider[4].setText(`${Math.round(volume * 100)}%`);
    });
    
    this.musicSlider = this.createVolumeSlider(yPos.music, 'Music Volume', this.scene.audioManager.getAudioSettings().musicVolume, (volume) => {
      this.updateAllMusicSliders(volume);
      this.musicSlider[4].setText(`${Math.round(volume * 100)}%`);
    });
    
    const resetButton = this.createMenuButton(yPos.resetButton, 'Reset Progress', () => {
        this.toggleMenu(false);
        this.onResetToggle();
    }, '#ff4444');
    this.menuContainer.add([bg, this.menuTitle, myStatsButton, tutorialButton, coherenceButton, binauralButton, leaderboardButton, audioTitle, ...sfxSlider, ...this.musicSlider, resetButton]);

    // Safety: if any legacy code still adds a 'Profile & Stats' button, remove it
    const strayProfile = this.menuContainer.list.find(
      (obj) => obj && obj.constructor && obj.constructor.name === 'Text' && obj.text === 'Profile & Stats'
    );
    if (strayProfile) {
      strayProfile.destroy();
    }
  }

  createMenuButton(y, text, callback, color = '#00e5ff') {
    const button = this.scene.add.text(this.menuWidth / 2, y, text, {
      fontFamily: 'Arial, sans-serif', fontSize: '24px', color: color,
      backgroundColor: '#2d0b4b',
      padding: { x: 25, y: 15 },
      align: 'center',
      fixedWidth: this.menuWidth - 60
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    
    button.on('pointerover', () => {
      this.scene.tweens.add({ targets: button, scale: 1.05, duration: 200, ease: 'Sine.easeOut' });
    });
    button.on('pointerout', () => {
      this.scene.tweens.add({ targets: button, scale: 1, duration: 200, ease: 'Sine.easeIn' });
    });
    button.on('pointerdown', () => {
      this.scene.playSound('button_ambience');
      this.scene.tweens.add({ targets: button, scale: 0.95, duration: 100, ease: 'Sine.easeIn', yoyo: true, onComplete: callback });
    });
    
    return button;
  }

  createVolumeSlider(y, label, initialVolume, callback) {
    const sliderWidth = this.menuWidth - 80;
    const sliderX = this.menuWidth / 2;
    const volumeLabel = this.scene.add.text(sliderX, y - 25, label, {
      fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#c9c9c9'
    }).setOrigin(0.5);
    
    const track = this.scene.add.graphics();
    track.fillStyle(0x2d0b4b, 1);
    track.fillRoundedRect(sliderX - sliderWidth / 2, y - 5, sliderWidth, 10, 5);
    
    const fill = this.scene.add.graphics();
    
    const handle = this.scene.add.circle(0, y, 10, 0x00e5ff);
    handle.setStrokeStyle(2, 0xffffff);
    handle.setInteractive({ useHandCursor: true, draggable: true });
    
    const valueDisplay = this.scene.add.text(sliderX, y + 25, `${Math.round(initialVolume * 100)}%`, {
      fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#00e5ff', fontStyle: 'bold'
    }).setOrigin(0.5);
    
    const updateSlider = (volume) => {
      const handleX = (sliderX - sliderWidth / 2) + (volume * sliderWidth);
      handle.x = handleX;
      
      fill.clear();
      fill.fillStyle(0x8a2be2, 1);
      const fillWidth = handleX - (sliderX - sliderWidth / 2);
      if (fillWidth > 0) {
        fill.fillRoundedRect(sliderX - sliderWidth / 2, y - 5, fillWidth, 10, 5);
      }
    };
    
    handle.on('drag', (pointer, dragX) => {
      const newX = Phaser.Math.Clamp(dragX, sliderX - sliderWidth / 2, sliderX + sliderWidth / 2);
      const volume = (newX - (sliderX - sliderWidth / 2)) / sliderWidth;
      
      updateSlider(volume);
      valueDisplay.setText(`${Math.round(volume * 100)}%`);
      callback(volume);
    });
    
    updateSlider(initialVolume);
    return [volumeLabel, track, fill, handle, valueDisplay];
  }
  createHamburgerButton(x, y, onClick) {
    const container = this.scene.add.container(x, y);
    container.setDepth(6001);
    container.setScrollFactor(0);
    
    const size = 35;
    
    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1a0033, 0.8);
    bg.fillRoundedRect(-size/2, -size/2, size, size, 8);
    bg.lineStyle(2, 0x00e5ff, 0.9);
    bg.strokeRoundedRect(-size/2, -size/2, size, size, 8);
    
    const glow = this.scene.add.graphics();
    glow.fillStyle(0x00e5ff, 0.15);
    glow.fillRoundedRect(-size/2 - 2, -size/2 - 2, size + 4, size + 4, 10);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    
    // Create hamburger lines (3 horizontal lines) as separate graphics objects
    const lineWidth = 20;
    const lineHeight = 2;
    const lineSpacing = 5;
    const createLine = (y) => {
        const line = this.scene.add.graphics();
        line.fillStyle(0x00e5ff, 1);
        line.fillRoundedRect(-lineWidth / 2, -lineHeight / 2, lineWidth, lineHeight, 1);
        line.y = y;
        return line;
    };
    container.line1 = createLine(-lineSpacing);
    container.line2 = createLine(0);
    container.line3 = createLine(lineSpacing);
    container.add([glow, bg, container.line1, container.line2, container.line3]);
    
    // Hit area
    const hitAreaSize = 70;
    const hitArea = new Phaser.Geom.Rectangle(-hitAreaSize/2, -hitAreaSize/2, hitAreaSize, hitAreaSize);
    container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains, { useHandCursor: true });
    
    // Subtle pulsing animation
    this.scene.tweens.add({
      targets: glow,
      alpha: { from: 0.15, to: 0.3 },
      duration: 2000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
    
    // Interaction handling
    let isPressed = false;
    
    container.on('pointerover', () => {
      if (!isPressed) {
        this.scene.tweens.killTweensOf(container);
        this.scene.tweens.add({
          targets: container,
          scale: 1.1,
          duration: 200,
          ease: 'Back.easeOut'
        });
      }
    });
    
    container.on('pointerout', () => {
      if (!isPressed) {
        this.scene.tweens.killTweensOf(container);
        this.scene.tweens.add({
          targets: container,
          scale: 1,
          duration: 200,
          ease: 'Back.easeIn'
        });
      }
    });
    
    container.on('pointerdown', (pointer) => {
      if (isPressed) return;
      isPressed = true;
      
      pointer.event.stopPropagation();
      this.scene.playSound('button_hover_click');
      
      this.scene.tweens.killTweensOf(container);
      this.scene.tweens.add({
        targets: container,
        scale: 0.9,
        duration: 100,
        ease: 'Power2',
        yoyo: true,
        onComplete: () => {
          isPressed = false;
          onClick();
        }
      });
    });
    
    return container;
  }
  toggleMenu(playSound = true) {
    if (this.scene.uiManager.profileOpen) {
        this.scene.uiManager.toggleProfilePanel();
        return;
    }
      
    if (this.scene.uiManager.binauralOpen) {
        this.scene.uiManager.toggleBinauralPanel();
        return;
    }
    if (playSound) this.scene.playSound('button_ambience');
    this.menuOpen = !this.menuOpen;
    this.scene.interactionManager.updateInteractions(); // Update global interaction state
    const { width } = this.scene.sys.game.config;
    const targetX = this.menuOpen ? width - this.menuWidth : width;
    this.animateIcon(this.menuOpen);
    if (this.menuOpen) {
        this.menuContainer.setDepth(6000);
    } else {
        this.menuContainer.setDepth(500);
        // Ensure no shadow artifacts remain by clearing any lingering graphics
        this.menuContainer.list.forEach(child => {
          if (child.type === 'Graphics') {
            child.setVisible(true);
          }
        });
    }
    this.scene.tweens.add({
        targets: this.menuContainer,
        x: targetX,
        duration: 300,
        ease: 'Cubic.easeInOut'
    });
    this.updateIconState();
  }
  animateIcon(isOpen) {
    const duration = 250;
    const ease = 'Cubic.easeInOut';
    const lineSpacing = 5;
    // Top Line
    this.scene.tweens.add({
      targets: this.menuButton.line1,
      y: isOpen ? 0 : -lineSpacing,
      rotation: isOpen ? Phaser.Math.DegToRad(45) : 0,
      duration,
      ease
    });
    // Middle Line
    this.scene.tweens.add({
      targets: this.menuButton.line2,
      alpha: isOpen ? 0 : 1,
      duration: duration / 2,
      ease
    });
    // Bottom Line
    this.scene.tweens.add({
      targets: this.menuButton.line3,
      y: isOpen ? 0 : lineSpacing,
      rotation: isOpen ? Phaser.Math.DegToRad(-45) : 0,
      duration,
      ease
    });
  }
  updateIconState() {
    // Check if any panel is open to determine the icon's state
    const isAnyPanelOpen = this.menuOpen || 
                           this.scene.uiManager.profileOpen || 
                           this.scene.uiManager.binauralOpen;
                           
    this.animateIcon(isAnyPanelOpen);
  }

  // Method to track profile panel state for menu icon updates
  setProfileOpen(isOpen) {
    this.profileOpen = isOpen;
    this.updateIconState();
  }
  updateAllMusicSliders(volume) {
    this.scene.audioManager.updateBackgroundMusicVolume(volume);
    if (this.musicSlider) this.updateSliderUI(this.musicSlider, volume);
  }
  updateSliderUI(sliderElements, value) {
    if (!sliderElements || sliderElements.length < 5 || !sliderElements[1] || !sliderElements[1].geom) {
      return;
    }
    
    const [label, track, fill, handle, valueDisplay] = sliderElements;
    const sliderWidth = track.geom.width;
    const sliderX = label.x;
    
    const handleX = (sliderX - sliderWidth / 2) + (value * sliderWidth);
    handle.x = Phaser.Math.Clamp(handleX, sliderX - sliderWidth / 2, sliderX + sliderWidth / 2);
    
    fill.clear();
    fill.fillStyle(0x8a2be2, 1);
    const fillWidth = handle.x - (sliderX - sliderWidth / 2);
    if (fillWidth > 0) {
      fill.fillRoundedRect(sliderX - sliderWidth / 2, handle.y - 5, fillWidth, 10, 5);
    }
    
    valueDisplay.setText(`${Math.round(value * 100)}%`);
  }

  handleOutsideClick(pointer) {
    const menuButtonBounds = this.menuButton.getBounds();
    
    if (this.menuOpen) {
      const menuBounds = this.menuContainer.getBounds();
      const clickedOutsideMenu = !Phaser.Geom.Rectangle.Contains(menuBounds, pointer.x, pointer.y) && 
                                 !Phaser.Geom.Rectangle.Contains(menuButtonBounds, pointer.x, pointer.y);
      
      if (clickedOutsideMenu) {
        this.toggleMenu();
        return true;
      }
    }
    
    return false;
  }
  setupOutsideClickHandler() {
    // Outside click handling is now managed by uiManager.js to prevent conflicts
    // This method is kept for compatibility but no longer adds duplicate event listeners
  }
}