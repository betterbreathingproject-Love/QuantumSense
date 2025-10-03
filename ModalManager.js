export class ModalManager {
  constructor(scene, statsTracker) {
    this.scene = scene;
    this.statsTracker = statsTracker;
    this.activeModal = null;
    this.wheelEventManager = scene.uiManager?.wheelEventManager;
  }

  showModal(config) {
    if (this.activeModal) {
      this.activeModal.destroy();
    }

    const { width, height } = this.scene.sys.game.config;
    const modalContainer = this.scene.add.container(width / 2, height / 2);
    modalContainer.setDepth(config.depth || 5000);

    // --- Blocker ---
    const blocker = this.scene.add.graphics();
    blocker.fillStyle(0x000000, 0.8);
    blocker.fillRect(-width / 2, -height / 2, width, height);
    blocker.setInteractive(new Phaser.Geom.Rectangle(-width/2, -height/2, width, height), Phaser.Geom.Rectangle.Contains);
    blocker.on('pointerdown', (pointer) => {
        if(config.closeOnOutsideClick) {
            this.closeModal(modalContainer);
        }
        pointer.event.stopPropagation();
    });

    // --- Panel ---
    const modalWidth = config.modalWidth || Math.min(500, width * 0.9);
    const modalHeight = config.modalHeight || Math.min(400, height * 0.7);
    
    const panel = this.scene.add.graphics();
    panel.fillStyle(config.panelColor || 0x0c0114, 1.0);
    panel.fillRoundedRect(-modalWidth / 2, -modalHeight / 2, modalWidth, modalHeight, 20);
    panel.lineStyle(config.borderColor ? 3 : 0, config.borderColor || 0xffffff, 1);
    panel.strokeRoundedRect(-modalWidth / 2, -modalHeight / 2, modalWidth, modalHeight, 20);

    // --- Glow ---
    const glow = this.scene.add.graphics();
    glow.fillStyle(config.borderColor || 0x8a2be2, 0.1);
    glow.fillRoundedRect(-modalWidth / 2 - 4, -modalHeight / 2 - 4, modalWidth + 8, modalHeight + 8, 24);
    glow.setBlendMode(Phaser.BlendModes.ADD);

    modalContainer.add([blocker, glow, panel]);
    
    // --- Title ---
    if (config.title) {
      const title = this.scene.add.text(0, -modalHeight / 2 - 40, config.title, {
        fontFamily: 'Arial, sans-serif',
        fontSize: config.titleSize || '28px',
        color: config.titleColor || '#00e5ff',
        fontStyle: 'bold',
        ...config.titleStyle,
      }).setOrigin(0.5);
      modalContainer.add(title);
    }
    
    // --- Content ---
    if (config.content) {
      if (typeof config.content === 'string') {
        const contentText = this.scene.add.text(0, config.contentY || 0, config.content, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
          color: '#c9c9c9',
          align: 'center',
          lineSpacing: 10,
          wordWrap: { width: modalWidth * 0.8, useAdvancedWrap: true },
          ...config.contentStyle
        }).setOrigin(0.5);
        modalContainer.add(contentText);
      } else {
        // Assume content is a Phaser GameObject (e.g., Container)
        config.content.setPosition(0, config.contentY || 0);
        modalContainer.add(config.content);
      }
    }

    // --- Buttons ---
    if (config.buttons && config.buttons.length > 0) {
        const buttonsY = modalHeight / 2 - 60;
        const buttonSpacing = 160;
        const totalWidth = (config.buttons.length - 1) * buttonSpacing;
        let startX = -totalWidth / 2;

        config.buttons.forEach((btnConfig, index) => {
            const btnX = startX + index * buttonSpacing;
            const button = this.createButton(btnX, buttonsY, btnConfig.text, btnConfig.style);
            button.on('pointerdown', () => {
                if(btnConfig.callback) btnConfig.callback();
                if(btnConfig.closesModal !== false) {
                    this.closeModal(modalContainer);
                }
            });
            modalContainer.add(button);
        });
    }

    // --- Animation ---
    modalContainer.setAlpha(0).setScale(0.8);
    this.scene.tweens.add({
      targets: modalContainer,
      alpha: 1,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });

    this.activeModal = modalContainer;
    return modalContainer;
  }
  
  createButton(x, y, text, style = {}) {
    const button = this.scene.add.text(x, y, text, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: style.color || '#ffffff',
        backgroundColor: style.backgroundColor || '#2d0b4b',
        padding: { x: 20, y: 12 },
        align: 'center',
        ...style
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    button.on('pointerover', () => {
      this.scene.playSound('button_hover_click');
      this.scene.tweens.add({ targets: button, scale: 1.05, duration: 200, ease: 'Sine.easeOut' });
    });
    button.on('pointerout', () => {
      this.scene.tweens.add({ targets: button, scale: 1, duration: 200, ease: 'Sine.easeIn' });
    });

    return button;
  }

  closeModal(modal) {
    // Show UI elements that were hidden for leaderboard
    this.showUIElementsAfterLeaderboard();
    
    // Unregister wheel handler when closing modal
    if (this.wheelEventManager) {
      this.wheelEventManager.unregisterHandler('modalScroll');
    }
    
    this.scene.tweens.add({
      targets: modal || this.activeModal,
      alpha: 0,
      scale: 0.8,
      duration: 200,
      ease: 'Back.easeIn',
      onComplete: () => {
        if (this.activeModal) {
            this.activeModal.destroy();
            this.activeModal = null;
        }
      }
    });
  }

  showLeaderboardModal() {
    // Hide UI elements that overlap with leaderboard
    this.hideUIElementsForLeaderboard();
    
    const leaderboardData = this.getLeaderboardData();
    const contentContainer = this.scene.add.container(0, 0);
    const topThree = leaderboardData.slice(0, 3);
    const otherPlayers = leaderboardData.slice(3);
    let podiumContainer;
    if (leaderboardData.length === 0) {
        const emptyText = this.scene.add.text(0, 50, 'No players yet - be the first!', {
            fontFamily: '"Nunito", sans-serif', fontSize: '20px', color: '#c9c9c9', fontStyle: 'italic'
        }).setOrigin(0.5);
        contentContainer.add(emptyText);
    } else {
        // --- Create Podium ---
        podiumContainer = this.scene.add.container(0,0); // placeholder
        contentContainer.add(podiumContainer);
        // --- Create Scrollable List for Other Players ---
        const listHeader = this.createPlayerListHeader(580);
        listHeader.setPosition(0, 155);
        contentContainer.add(listHeader);
        if (otherPlayers.length > 0) {
            const listContainer = this.createPlayerList(otherPlayers, 3);
            listContainer.setPosition(0, 180); // Position below podium
            contentContainer.add(listContainer);
        } else if (leaderboardData.length > 0) { // Only show this if there's at least one player
             const emptyListText = this.scene.add.text(0, 220, 'More players will appear here once the top spots are taken!', {
                fontFamily: '"Nunito", sans-serif', fontSize: '16px', color: '#8899a9', fontStyle: 'italic',
                align: 'center', wordWrap: { width: 400 }
            }).setOrigin(0.5);
            contentContainer.add(emptyListText);
        }
    }
    this.showModal({
        title: 'Leaderboard',
        titleStyle: {
            fontFamily: '"Cormorant Garamond", serif',
            fontSize: '42px',
            shadow: { color: '#00e5ff', blur: 15, stroke: true, fill: true }
        },
        content: contentContainer,
        contentY: -40,
        modalWidth: 650,
        modalHeight: 680,
        panelColor: 0x0c0114,
        closeOnOutsideClick: true,
        buttons: [
            { text: 'Close', callback: () => this.scene.playSound('button_ambience') }
        ]
    });
    // We must create the podium after the modal is created so we can attach destroy listeners
    if (podiumContainer) {
        const podium = this.createPodium(topThree);
        podiumContainer.add(podium);
    }
  }

  showResetConfirmationModal() {
    this.showModal({
        title: 'Reset All Progress?',
        titleColor: '#ff4444',
        content: 'This will permanently delete all your stats,\nachievements, and training progress.\n\nThis action cannot be undone!',
        contentY: 20,
        borderColor: 0xff4444,
        modalHeight: 350,
        buttons: [
            { text: 'Cancel', callback: () => this.scene.playSound('button_ambience'), style: { backgroundColor: '#2d0b4b', color: '#00e5ff'} },
            { text: 'RESET', callback: () => {
                this.scene.playSound('button_ambience');
                this.scene.performReset();
              }, style: { backgroundColor: '#ff4444', color: '#ffffff'} }
        ]
    });
  }

  getLeaderboardData() {
    try {
      const leaderboard = localStorage.getItem('divineSenseLeaderboard');
      let players = [];
      if (leaderboard) {
          players = JSON.parse(leaderboard);
      }
      
      const currentPlayer = this.getCurrentPlayerData();
      let isCurrentPlayerInLeaderboard = false;
      if (currentPlayer) {
          if (players.some(p => p.email === currentPlayer.email)) {
              // Update current player's data if they are already in the leaderboard
              players = players.map(p => p.email === currentPlayer.email ? { ...p, ...currentPlayer } : p);
              isCurrentPlayerInLeaderboard = true;
          } else {
              // Add current player if they have made at least one roll
              if(currentPlayer.totalRolls > 0) {
                  players.push(currentPlayer);
              }
          }
      }
      
      localStorage.setItem('divineSenseLeaderboard', JSON.stringify(players));
      return this.processLeaderboardData(players);
      
    } catch (e) {
      console.error('Could not load or update leaderboard:', e);
      // Fallback to processing whatever players array was populated
      return this.processLeaderboardData([]);
    }
  }
  processLeaderboardData(players) {
    if (!Array.isArray(players)) return [];
    
    // Calculate Q-Score for each player (formerly Zen Score)
    const scoredPlayers = players.map(p => {
      // Ensure required fields exist with defaults
      const accuracy = p.accuracy || 50;
      const pValue = p.pValue || 1;
      const totalRolls = p.totalRolls || 0;
      const name = p.name || 'Anonymous';
      
      // Q-Score: (1 - pValue) * accuracy^2. Higher is better.
      // This score heavily rewards high accuracy that is also statistically significant.
      // It's normalized to a 0-1000 scale.
      const pValueFactor = 1 - Math.min(pValue, 1); // Closer to 1 is better
      const accuracyFactor = (accuracy / 100); // 0 to 1
      const qScore = pValueFactor * Math.pow(accuracyFactor, 2) * 1000;
      
      return { 
        ...p, 
        accuracy,
        pValue,
        totalRolls,
        name,
        qScore: totalRolls > 5 ? qScore : 0, // Min 5 rolls to qualify
        // Backward compatibility field
        zenScore: totalRolls > 5 ? qScore : 0
      };
    });
    
    return scoredPlayers
      .filter(p => p.totalRolls > 0)
      .sort((a, b) => b.qScore - a.qScore); // Sort by Q-Score (higher is better)
  }
  getCurrentPlayerData() {
    try {
      const playerData = JSON.parse(localStorage.getItem('divineSensePlayer') || '{}');
      const statsData = JSON.parse(localStorage.getItem('divineSenseStats') || '{}');
      
      if (statsData.totalRolls > 0) {
        return {
          name: playerData.name || 'You',
          email: playerData.email || 'current_player',
          accuracy: statsData.accuracy || 50,
          pValue: statsData.pValue || 1,
          totalRolls: statsData.totalRolls || 0
        };
      }
      
      return null;
    } catch (e) {
      console.error('Could not get current player data:', e);
      return null;
    }
  }
  getCurrentPlayerEmail() {
    try {
      const playerData = JSON.parse(localStorage.getItem('divineSensePlayer') || '{}');
      return playerData.email || 'current_player';
    } catch (e) {
      return 'current_player';
    }
  }
  createPodium(topThree) {
    const podiumContainer = this.scene.add.container(0, -50);
    const podiumPositions = [
        { x: 0, y: -40, scale: 1.1, rank: 1, icon: '👑' },  // 1st place
        { x: -180, y: -10, scale: 1, rank: 2, icon: '🥈' }, // 2nd place
        { x: 180, y: -10, scale: 1, rank: 3, icon: '🥉' }   // 3rd place
    ];
    podiumPositions.forEach((pos, index) => {
        if (index < topThree.length) {
            const player = topThree[index];
            const isCurrentPlayer = this.getCurrentPlayerEmail() === player.email;
            
            const card = this.scene.add.container(pos.x, pos.y);
            const cardWidth = 150 * pos.scale;
            const cardHeight = 220 * pos.scale;
            
            const bg = this.scene.add.graphics();
            bg.fillStyle(isCurrentPlayer ? 0x00ff88 : 0x1a2c3d, isCurrentPlayer ? 0.2 : 0.6);
            bg.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 15);
            bg.lineStyle(3, isCurrentPlayer ? 0x00ff88 : 0x00e5ff, 0.8);
            bg.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 15);
            
            const rankIcon = this.scene.add.text(0, -cardHeight/2 + 25, pos.icon, { fontSize: `${30 * pos.scale}px` }).setOrigin(0.5);
            
            const avatarY = -cardHeight/2 + 70;
            const avatar = this.createAvatar(0, avatarY, player.name, pos.scale, isCurrentPlayer);
            const nameY = avatarY + 30 * pos.scale;
            const nameText = this.scene.add.text(0, nameY, player.name, {
                fontFamily: '"Nunito", sans-serif',
                fontSize: `${15 * pos.scale}px`,
                color: isCurrentPlayer ? '#ffffff' : '#c9c9c9',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            const scoreY = nameY + 28 * pos.scale;
            const scoreText = this.scene.add.text(0, scoreY, `${Math.round(player.zenScore)}`, {
                fontFamily: '"Nunito", sans-serif',
                fontSize: `${20 * pos.scale}px`,
                color: '#00e5ff',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            const scoreLabel = this.scene.add.text(0, scoreY + 16 * pos.scale, 'Quantum Score', {
                fontFamily: '"Nunito", sans-serif',
                fontSize: `${11 * pos.scale}px`,
                color: '#888'
            }).setOrigin(0.5);
            const subStatsY = scoreY + 45 * pos.scale;
            const pValueText = this.createPodiumStat(-cardWidth / 4, subStatsY, player.pValue.toFixed(3), 'P-Value', pos.scale);
            const accuracyText = this.createPodiumStat(cardWidth / 4, subStatsY, `${player.accuracy.toFixed(1)}%`, 'Accuracy', pos.scale);
            card.add([bg, rankIcon, avatar, nameText, scoreText, scoreLabel, ...pValueText, ...accuracyText]);
            podiumContainer.add(card);
            // Special animation for #1
            if (index === 0) {
                 this.scene.tweens.add({
                    targets: card,
                    y: pos.y - 10,
                    duration: 1200,
                    ease: 'Sine.easeInOut',
                    yoyo: true,
                    repeat: -1,
                });
                this.createSparkleEffect(card, cardWidth, cardHeight, 10);
            } else {
                 this.scene.tweens.add({
                    targets: card,
                    scaleY: 1.03,
                    duration: 1800 + index * 200,
                    ease: 'Sine.easeInOut',
                    yoyo: true,
                    repeat: -1,
                    delay: index * 150
                });
            }
        }
    });
    return podiumContainer;
  }
  createPodiumStat(x, y, value, label, scale) {
      const valueText = this.scene.add.text(x, y, value, {
          fontFamily: '"Nunito", sans-serif',
          fontSize: `${14 * scale}px`,
          color: '#c9c9c9',
          fontStyle: 'bold'
      }).setOrigin(0.5);
      const labelText = this.scene.add.text(x, y + 14 * scale, label, {
          fontFamily: '"Nunito", sans-serif',
          fontSize: `${10 * scale}px`,
          color: '#888'
      }).setOrigin(0.5);
      return [valueText, labelText];
  }
  createPlayerList(players, startingRank) {
    const listContainer = this.scene.add.container(0, 0);
    const tableWidth = 580;
    const listHeight = 220; // Height of the visible scroll area
    const rowHeight = 55;
    
    const scrollContainer = this.scene.add.container(0, 0);
    players.forEach((player, index) => {
        const yPos = (index * rowHeight) + rowHeight / 2;
        const rank = startingRank + index + 1;
        const isCurrentPlayer = this.getCurrentPlayerEmail() === player.email;
        const row = this.createPlayerRow(yPos, tableWidth, rowHeight, player, rank, isCurrentPlayer);
        scrollContainer.add(row);
    });
    const scrollMask = this.scene.make.graphics();
    scrollMask.fillStyle(0xffffff);
    scrollMask.fillRect(-tableWidth / 2, 0, tableWidth, listHeight);
    scrollContainer.mask = new Phaser.Display.Masks.GeometryMask(this.scene, scrollMask);
    listContainer.add(scrollContainer);
    
    const totalContentHeight = players.length * rowHeight;
    if (totalContentHeight > listHeight) {
        this.createScrollbar(listContainer, scrollContainer, tableWidth, listHeight, totalContentHeight, 0);
    }
    
    return listContainer;
  }
  
  createPlayerRow(y, width, height, player, rank, isCurrentPlayer) {
    const rowContainer = this.scene.add.container(0, y);
    
    const rowBg = this.scene.add.graphics();
    const rowColor = isCurrentPlayer ? 0x00ff88 : 0x1a1a2e;
    const rowAlpha = isCurrentPlayer ? 0.2 : 0.4;
    rowBg.fillStyle(rowColor, rowAlpha);
    rowBg.fillRoundedRect(-width / 2 + 10, -height / 2 + 5, width - 20, height - 10, 8);
    rowContainer.add(rowBg);
    
    const playerStyle = {
        fontFamily: '"Nunito", sans-serif',
        fontSize: '14px',
        color: isCurrentPlayer ? '#ffffff' : '#c9c9c9',
    };
    
    const rankText = this.scene.add.text(-width/2 + 40, 0, `${rank}`, playerStyle).setOrigin(0.5);
    const avatar = this.createAvatar(-width/2 + 85, 0, player.name, 0.9, isCurrentPlayer);
    const nameText = this.scene.add.text(-width/2 + 120, 0, player.name, {...playerStyle, fontSize: '15px'}).setOrigin(0, 0.5);
    const scoreText = this.scene.add.text(width/2 - 190, 0, `${Math.round(player.zenScore)}`, playerStyle).setOrigin(0.5);
    const pValueText = this.scene.add.text(width/2 - 115, 0, `${player.pValue.toFixed(3)}`, playerStyle).setOrigin(0.5);
    const accuracyText = this.scene.add.text(width/2 - 40, 0, `${player.accuracy.toFixed(1)}%`, playerStyle).setOrigin(0.5);
    rowContainer.add([rankText, avatar, nameText, scoreText, pValueText, accuracyText]);
    return rowContainer;
  }
  createAvatar(x, y, name, scale = 1, isCurrentPlayer = false) {
    const avatarContainer = this.scene.add.container(x, y);
    const avatarSize = 36 * scale;
    const avatarBg = this.scene.add.graphics();
    avatarBg.fillStyle(0x1a2c3d, 0.8);
    avatarBg.fillCircle(0, 0, avatarSize / 2);
    avatarBg.lineStyle(2 * scale, isCurrentPlayer ? 0x00ff88 : 0x00e5ff, 0.8);
    avatarBg.strokeCircle(0, 0, avatarSize / 2);
    
    const initials = (name || 'A').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const avatarText = this.scene.add.text(0, 0, initials, {
        fontFamily: '"Nunito", sans-serif',
        fontSize: `${12 * scale}px`,
        color: '#00e5ff',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    avatarContainer.add([avatarBg, avatarText]);
    return avatarContainer;
  }
  createScrollbar(container, scrollContainer, width, scrollAreaHeight, totalContentHeight, scrollAreaY) {
    const scrollbarWidth = 8;
    const scrollbarX = width / 2 - 15;
    
    const scrollTrack = this.scene.add.graphics();
    scrollTrack.fillStyle(0x2d0b4b, 0.5);
    scrollTrack.fillRoundedRect(scrollbarX - scrollbarWidth / 2, scrollAreaY, scrollbarWidth, scrollAreaHeight, 4);
    container.add(scrollTrack);
    
    const thumbHeight = Math.max(30, scrollAreaHeight * (scrollAreaHeight / totalContentHeight));
    const scrollThumb = this.scene.add.graphics();
    scrollThumb.fillStyle(0x00e5ff, 0.8);
    scrollThumb.fillRoundedRect(scrollbarX - scrollbarWidth / 2, scrollAreaY, scrollbarWidth, thumbHeight, 4);
    container.add(scrollThumb);
    
    const scrollZone = this.scene.add.zone(0, scrollAreaY + scrollAreaHeight / 2, width - 40, scrollAreaHeight);
    scrollZone.setInteractive({ draggable: true });
    container.add(scrollZone);
    
    let startY = 0;
    let startContentY = 0;
    
    const updateScroll = (newY) => {
        const maxScroll = -(totalContentHeight - scrollAreaHeight);
        scrollContainer.y = Phaser.Math.Clamp(newY, maxScroll, 0);
        
        const scrollPercent = scrollContainer.y / maxScroll;
        const thumbMaxY = scrollAreaHeight - thumbHeight;
        scrollThumb.y = scrollAreaY + (scrollPercent * thumbMaxY);
    };
    scrollZone.on('dragstart', (pointer) => {
        startY = pointer.y;
        startContentY = scrollContainer.y;
    });
    
    scrollZone.on('drag', (pointer) => {
        const deltaY = pointer.y - startY;
        updateScroll(startContentY + deltaY);
    });
    
    // Remove any existing wheel event listener to prevent conflicts
    // Remove any existing wheel handler first
    if (this.wheelEventManager) {
        this.wheelEventManager.unregisterHandler('modalScroll');
    }
    
    this.modalScrollHandler = (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
        const modalBounds = this.activeModal.getBounds();
        if (Phaser.Geom.Rectangle.Contains(modalBounds, pointer.x, pointer.y)) {
             const scrollZoneBounds = container.getBounds();
             scrollZoneBounds.y += this.activeModal.y + container.y;
             scrollZoneBounds.x += this.activeModal.x;
            if (Phaser.Geom.Rectangle.Contains(scrollZoneBounds, pointer.x, pointer.y)) {
                updateScroll(scrollContainer.y - deltaY * 0.8);
            }
        }
    };
    
    // Register with WheelEventManager instead of direct scene input
    if (this.wheelEventManager) {
        this.wheelEventManager.registerHandler('modalScroll', this.modalScrollHandler);
    }
  }
  createSparkleEffect(container, width, height, count) {
      const emitter = this.scene.add.particles(container.x, container.y, 'particle', {
          speed: { min: -10, max: 10 },
          angle: { min: 0, max: 360 },
          scale: { start: 0.3, end: 0 },
          alpha: { start: 1, end: 0 },
          blendMode: 'ADD',
          lifespan: { min: 400, max: 800 },
          tint: [0x00e5ff, 0xffffff, 0x8a2be2],
          frequency: -1 // Manual emit
      });
      emitter.setDepth(container.depth + 1);
      // Emit particles periodically at random positions on the card
      const sparkleEvent = this.scene.time.addEvent({
          delay: 400,
          loop: true,
          callback: () => {
              if (container && container.scene) { // Check if the container is still active
                  const x = Phaser.Math.Between(-width / 2, width / 2);
                  const y = Phaser.Math.Between(-height / 2, height / 2);
                  emitter.explode(1, container.x + x, container.y + y);
              } else {
                  sparkleEvent.remove();
                  emitter.destroy();
              }
          }
      });
      // Make sure emitter is destroyed when modal closes
      this.activeModal.on('destroy', () => {
          sparkleEvent.remove();
          emitter.destroy();
      });
  }
  createPlayerListHeader(width) {
    const headerContainer = this.scene.add.container(0, 0);
    const headerBg = this.scene.add.graphics();
    headerBg.fillStyle(0x1a0d2e, 0.8);
    headerBg.fillRoundedRect(-width / 2, -15, width, 30, 5);
    headerContainer.add(headerBg);
    const rankText = this.scene.add.text(-width / 2 + 30, 0, 'RANK', {
      fontFamily: '"Nunito", sans-serif', fontSize: '14px', color: '#8899a9', fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    const playerText = this.scene.add.text(-width / 2 + 120, 0, 'PLAYER', {
      fontFamily: '"Nunito", sans-serif', fontSize: '14px', color: '#8899a9', fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    const scoreText = this.scene.add.text(width / 2 - 30, 0, 'SCORE', {
      fontFamily: '"Nunito", sans-serif', fontSize: '14px', color: '#8899a9', fontStyle: 'bold'
    }).setOrigin(1, 0.5);
    headerContainer.add([rankText, playerText, scoreText]);
    return headerContainer;
  }

  hideUIElementsForLeaderboard() {
    // Hide prediction system
    if (this.scene.predictionSystem && this.scene.predictionSystem.container) {
      this.scene.predictionSystem.container.setVisible(false);
    }
    
    // Hide dice controller
    if (this.scene.diceController && this.scene.diceController.resultContainer) {
      this.scene.diceController.resultContainer.setVisible(false);
    }
    
    // Hide UI elements through uiManager
    if (this.scene.uiManager) {
      // Hide top bar (stats)
      if (this.scene.uiManager.topBarContainer) {
        this.scene.uiManager.topBarContainer.setVisible(false);
      }
      
      // Hide psychic meter
      if (this.scene.uiManager.psychicMeterContainer) {
        this.scene.uiManager.psychicMeterContainer.setVisible(false);
      }
      
      // Hide coherence container (coherence bar and shields)
      if (this.scene.uiManager.coherenceContainer) {
        this.scene.uiManager.coherenceContainer.setVisible(false);
      }
      
      // Hide badge container
      if (this.scene.uiManager.badgeContainer) {
        this.scene.uiManager.badgeContainer.setVisible(false);
      }
    }
    
    // Hide achievement manager badges
    if (this.scene.achievementManager) {
      if (this.scene.achievementManager.badgeContainer) {
        this.scene.achievementManager.badgeContainer.setVisible(false);
      }
      if (this.scene.achievementManager.breathingAwardsContainer) {
        this.scene.achievementManager.breathingAwardsContainer.setVisible(false);
      }
    }
  }

  showUIElementsAfterLeaderboard() {
    // Show prediction system
    if (this.scene.predictionSystem && this.scene.predictionSystem.container) {
      this.scene.predictionSystem.container.setVisible(true);
    }
    
    // Show dice controller
    if (this.scene.diceController && this.scene.diceController.resultContainer) {
      this.scene.diceController.resultContainer.setVisible(true);
    }
    
    // Show UI elements through uiManager
    if (this.scene.uiManager) {
      // Show top bar (stats)
      if (this.scene.uiManager.topBarContainer) {
        this.scene.uiManager.topBarContainer.setVisible(true);
      }
      
      // Show psychic meter
      if (this.scene.uiManager.psychicMeterContainer) {
        this.scene.uiManager.psychicMeterContainer.setVisible(true);
      }
      
      // Show coherence container (coherence bar and shields)
      if (this.scene.uiManager.coherenceContainer) {
        this.scene.uiManager.coherenceContainer.setVisible(true);
      }
      
      // Show badge container
      if (this.scene.uiManager.badgeContainer) {
        this.scene.uiManager.badgeContainer.setVisible(true);
      }
    }
    
    // Show achievement manager badges
    if (this.scene.achievementManager) {
      if (this.scene.achievementManager.badgeContainer) {
        this.scene.achievementManager.badgeContainer.setVisible(true);
      }
      if (this.scene.achievementManager.breathingAwardsContainer) {
        this.scene.achievementManager.breathingAwardsContainer.setVisible(true);
      }
    }
  }
}