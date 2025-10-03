export class ShareManager {
  constructor(scene, statsTracker) {
    this.scene = scene;
    this.statsTracker = statsTracker;
    this.leaderboardModal = null;
  }
  generateShareableImage(onComplete = null) {
    let rt = null;
    try {
      const { width, height } = this.scene.sys.game.config;
      const stats = this.statsTracker.getStats();
      const playerData = JSON.parse(localStorage.getItem('divineSensePlayer') || '{}');
      const levelMap = ['🌱 NOVICE', '🌸 APPRENTICE', '⚡ ADEPT', '👑 MASTER', '✨ TRANSCENDENT'];
      const imgWidth = 900;  // 9:16 aspect ratio
      const imgHeight = 1600;
      rt = this.scene.add.renderTexture(0, 0, imgWidth, imgHeight).setVisible(false);
      rt.clear();
      
      // --- Background and Border ---
      const bg = this.scene.add.graphics();
      // Gradient background - manual gradient using an off-screen canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = imgWidth;
      tempCanvas.height = imgHeight;
      const tempCtx = tempCanvas.getContext('2d');
      const gradient = tempCtx.createLinearGradient(0, 0, 0, imgHeight);
      gradient.addColorStop(0, '#1a0033');
      gradient.addColorStop(1, '#330066');
      tempCtx.fillStyle = gradient;
      tempCtx.fillRect(0, 0, imgWidth, imgHeight);
      const tempTextureKey = `temp_gradient_${Date.now()}`;
      this.scene.textures.addCanvas(tempTextureKey, tempCanvas);
      const gradientImage = this.scene.add.image(0, 0, tempTextureKey).setOrigin(0,0);
      rt.draw(gradientImage);
      gradientImage.destroy();
      this.scene.textures.remove(tempTextureKey);
      
      // Starfield
      const stars = this.scene.add.graphics();
      for (let i = 0; i < 100; i++) {
          const x = Math.random() * imgWidth;
          const y = Math.random() * imgHeight;
          const radius = Math.random() * 1.5;
          const alpha = Math.random() * 0.7;
          stars.fillStyle(0xffffff, alpha);
          stars.fillCircle(x, y, radius);
      }
      rt.draw(stars);
      stars.destroy();
      
      // Outer border glow
      const borderGlow = this.scene.add.graphics();
      borderGlow.lineStyle(10, 0x8a2be2, 0.3);
      borderGlow.strokeRoundedRect(5, 5, imgWidth - 10, imgHeight - 10, 15);
      borderGlow.setBlendMode(Phaser.BlendModes.ADD);
      rt.draw(borderGlow);
      borderGlow.destroy();
      
      // Inner border
      const border = this.scene.add.graphics();
      border.lineStyle(2, 0x00e5ff, 1);
      border.strokeRoundedRect(10, 10, imgWidth - 20, imgHeight - 20, 10);
      rt.draw(border);
      bg.destroy();
      border.destroy();
      
      // --- Header ---
      const title = this.scene.add.text(imgWidth / 2, 80, 'Divine Sense Training', {
          fontFamily: '"Cormorant Garamond", serif', fontSize: '48px', color: '#00e5ff', fontStyle: 'bold',
          shadow: { color: '#00e5ff', blur: 20, stroke: true, fill: true }
      }).setOrigin(0.5);
      rt.draw(title);
      title.destroy();
      
      // --- Player Avatar Section ---
      let avatarY = 180;
      
      // Add player avatar if available
      if (playerData.avatar) {
        try {
          const avatarCanvas = document.createElement('canvas');
          const avatarSize = 120;
          avatarCanvas.width = avatarSize;
          avatarCanvas.height = avatarSize;
          const avatarCtx = avatarCanvas.getContext('2d');
          
          // Create circular clipping path
          avatarCtx.beginPath();
          avatarCtx.arc(avatarSize / 2, avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
          avatarCtx.clip();
          
          const initials = (playerData.name || 'A').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
          
          // Draw background circle
          avatarCtx.fillStyle = '#1a2c3d';
          avatarCtx.fillRect(0, 0, avatarSize, avatarSize);
          
          // Add border effect
          avatarCtx.strokeStyle = '#00e5ff';
          avatarCtx.lineWidth = 4;
          avatarCtx.beginPath();
          avatarCtx.arc(avatarSize / 2, avatarSize / 2, avatarSize / 2 - 2, 0, Math.PI * 2);
          avatarCtx.stroke();
          
          // Draw initials as fallback
          avatarCtx.fillStyle = '#00e5ff';
          avatarCtx.font = 'bold 40px Arial';
          avatarCtx.textAlign = 'center';
          avatarCtx.textBaseline = 'middle';
          avatarCtx.fillText(initials, avatarSize / 2, avatarSize / 2);
          
          // Add the avatar canvas as a texture
          const tempAvatarKey = `temp_avatar_${Date.now()}`;
          this.scene.textures.addCanvas(tempAvatarKey, avatarCanvas);
          const avatarImage = this.scene.add.image(imgWidth / 2, avatarY, tempAvatarKey).setOrigin(0.5);
          
          // Add glow effect around avatar
          const avatarGlow = this.scene.add.graphics();
          avatarGlow.fillStyle(0x00e5ff, 0.3);
          avatarGlow.fillCircle(imgWidth / 2, avatarY, avatarSize / 2 + 8);
          avatarGlow.setBlendMode(Phaser.BlendModes.ADD);
          rt.draw(avatarGlow);
          rt.draw(avatarImage);
          
          avatarGlow.destroy();
          avatarImage.destroy();
          this.scene.textures.remove(tempAvatarKey);
          
          avatarY += 100;
        } catch (avatarError) {
          console.warn('Could not load avatar for stats image:', avatarError);
        }
      }
      
      // --- Player Info ---
      const playerName = this.scene.add.text(imgWidth / 2, avatarY, playerData.name || 'Anonymous Mystic', {
          fontFamily: '"Nunito", sans-serif', fontSize: '32px', color: '#ffffff', fontStyle: 'bold'
      }).setOrigin(0.5);
      const playerLevel = this.scene.add.text(imgWidth / 2, avatarY + 50, levelMap[stats.psychicLevel - 1], {
          fontFamily: '"Nunito", sans-serif', fontSize: '22px', color: '#c9c9c9', fontStyle: 'bold'
      }).setOrigin(0.5);
      rt.draw(playerName);
      rt.draw(playerLevel);
      playerName.destroy();
      playerLevel.destroy();
      
      // --- Key Stat Cards ---
      const createStatCard = (x, y, value, label, cardWidth = 300, cardHeight = 140) => {
        const card = this.scene.add.container(x, y);
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x1a2c3d, 0.6);
        bg.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 20);
        bg.lineStyle(2, 0x00bfff, 0.7);
        bg.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 20);
        const valText = this.scene.add.text(0, -20, value, { fontFamily: '"Nunito", sans-serif', fontSize: '42px', color: '#00e5ff', fontStyle: 'bold' }).setOrigin(0.5);
        const labText = this.scene.add.text(0, 30, label, { fontFamily: '"Nunito", sans-serif', fontSize: '18px', color: '#d3d3d3' }).setOrigin(0.5);
        card.add([bg, valText, labText]);
        rt.draw(card);
        card.destroy();
      };
      
      const statCardsY = avatarY + 140;
      createStatCard(225, statCardsY, `${stats.accuracy.toFixed(1)}%`, 'Accuracy');
      createStatCard(675, statCardsY, stats.bestStreak.toString(), 'Best Streak');
      createStatCard(225, statCardsY + 200, stats.totalRolls.toString(), 'Total Rolls');
      createStatCard(675, statCardsY + 200, stats.pValue.toFixed(3), 'P-Value');
      
      // --- Mindfulness Practice Section ---
      const mindfulnessY = statCardsY + 320;
      const mindfulnessTitle = this.scene.add.text(imgWidth / 2, mindfulnessY, 'Mindfulness Practice', {
          fontFamily: '"Cormorant Garamond", serif', fontSize: '32px', color: '#00e5ff', fontStyle: 'bold'
      }).setOrigin(0.5);
      rt.draw(mindfulnessTitle);
      mindfulnessTitle.destroy();
      
      const mindfulnessText = `Sessions: ${stats.breathingSessionsCompleted || 0} • Daily Streak: ${stats.dailyBreathingStreak || 0} days`;
      const mindfulnessStats = this.scene.add.text(imgWidth / 2, mindfulnessY + 40, mindfulnessText, {
          fontFamily: '"Nunito", sans-serif', fontSize: '20px', color: '#c9c9c9'
      }).setOrigin(0.5);
      rt.draw(mindfulnessStats);
      mindfulnessStats.destroy();
      
      // --- Achievements ---
      const achievementY = mindfulnessY + 130;
      const achievementTitle = this.scene.add.text(imgWidth / 2, achievementY, 'Achievements', {
          fontFamily: '"Cormorant Garamond", serif', fontSize: '32px', color: '#00e5ff', fontStyle: 'bold'
      }).setOrigin(0.5);
      rt.draw(achievementTitle);
      achievementTitle.destroy();
      
      const achievements = this.statsTracker.getAllAchievements().filter(a => a.unlocked);
      const maxBadges = 6;
      const badgeSize = 60;
      const badgePadding = 30;
      const actualBadges = Math.min(maxBadges, achievements.length);
      const badgeStartX = (imgWidth - (actualBadges * (badgeSize + badgePadding) - badgePadding)) / 2 + badgeSize / 2;
      
      achievements.slice(0, maxBadges).forEach((ach, i) => {
          const x = badgeStartX + i * (badgeSize + badgePadding);
          const y = achievementY + 80;
          
          const badgeGlow = this.scene.add.graphics().fillStyle(0x00e5ff, 0.2).fillCircle(0, 0, badgeSize / 2 + 5);
          badgeGlow.setBlendMode(Phaser.BlendModes.ADD);
          
          const badgeBG = this.scene.add.graphics().fillStyle(0x1a2c3d, 0.9).fillCircle(0, 0, badgeSize / 2);
          const badgeBorder = this.scene.add.graphics().lineStyle(3, 0x00e5ff, 0.8).strokeCircle(0, 0, badgeSize / 2);
          const badgeIcon = this.scene.add.text(0, 0, ach.icon, { fontSize: '32px' }).setOrigin(0.5);
          const badgeContainer = this.scene.add.container(x, y, [badgeGlow, badgeBG, badgeBorder, badgeIcon]);
          rt.draw(badgeContainer);
          badgeContainer.destroy();
      });
      
      // --- 7-Day Trend Chart ---
      const trendY = achievementY + 200;
      const trendTitle = this.scene.add.text(imgWidth / 2, trendY, '7-Day Accuracy Trend', {
          fontFamily: '"Cormorant Garamond", serif', fontSize: '32px', color: '#00e5ff', fontStyle: 'bold'
      }).setOrigin(0.5);
      rt.draw(trendTitle);
      trendTitle.destroy();
      
      const trendData = this.statsTracker.getTrendStats();
      const chartContainer = this.scene.add.container(imgWidth / 2, trendY + 120);
      this.createShareableTrendChart(chartContainer, trendData, 720, 200);
      rt.draw(chartContainer);
      chartContainer.destroy();
      
      // --- Footer ---
      const footerText = this.scene.add.text(imgWidth / 2, imgHeight - 60, 'Made with Rosebud AI', {
          fontFamily: '"Nunito", sans-serif', fontSize: '16px', color: '#8a2be2', fontStyle: 'italic'
      }).setOrigin(0.5);
      rt.draw(footerText);
      footerText.destroy();
      
      rt.saveTexture('shareableStats');
      
      // Process the render texture
      this.scene.time.delayedCall(200, () => {
        try {
          if (!rt || rt.destroyed) {
            console.error('Render texture destroyed or invalid');
            this.showRewardNotification('Error!', 'Failed to generate stats image. Please try again.', '❌');
            if (onComplete) onComplete();
            return;
          }
          
          let canvas = null;
          if (rt.canvas) {
            canvas = rt.canvas;
          } else if (rt.texture && rt.texture.source && rt.texture.source[0]) {
            canvas = rt.texture.source[0].source;
          } else if (rt.renderer && rt.renderer.gl) {
            console.warn('WebGL render texture detected, using alternative method');
            this.downloadStatsViaDataURL(rt, onComplete);
            return;
          }
          
          if (!canvas) {
            console.error('Render texture canvas not available after checks');
            this.showRewardNotification('Error!', 'Failed to generate stats image. Please try again.', '❌');
            if (rt) rt.destroy();
            if (onComplete) onComplete();
            return;
          }
          
          if (typeof canvas.toBlob === 'function') {
            canvas.toBlob((blob) => {
              if (!blob) {
                this.showRewardNotification('Error!', 'Failed to generate stats image. Please try again.', '❌');
                if (rt) rt.destroy();
                if (onComplete) onComplete();
                return;
              }
              
              const finalCleanup = () => {
                if (rt) rt.destroy();
                if (onComplete) onComplete();
              };
              
              if (navigator.clipboard && navigator.clipboard.write) {
                try {
                  const item = new ClipboardItem({ 'image/png': blob });
                  navigator.clipboard.write([item]).then(() => {
                    this.showRewardNotification('Stats Copied!', 'Your stats graphic has been copied to your clipboard.', '📋');
                    finalCleanup();
                  }).catch(err => {
                    console.log('Clipboard failed, trying download fallback:', err);
                    this.downloadStatsImage(blob, finalCleanup);
                  });
                } catch (clipboardErr) {
                  console.log('ClipboardItem not supported, trying download fallback:', clipboardErr);
                  this.downloadStatsImage(blob, finalCleanup);
                }
              } else {
                console.log('Clipboard API not available, using download fallback');
                this.downloadStatsImage(blob, finalCleanup);
              }
            }, 'image/png');
          } else {
            console.log('canvas.toBlob not available, using dataURL fallback');
            this.downloadStatsViaDataURL(rt, onComplete);
          }
        } catch (blobErr) {
          console.error('Failed to create blob:', blobErr);
          this.showRewardNotification('Error!', 'Failed to create stats image. Please try again.', '❌');
          if (rt) rt.destroy();
          if (onComplete) onComplete();
        }
      });
      
    } catch (error) {
      console.error('Error in generateShareableImage:', error);
      this.showRewardNotification('Error!', 'Something went wrong generating your stats. Please try again.', '❌');
      if (rt) {
        rt.destroy();
      }
      if (onComplete) onComplete();
    }
  }
  showLeaderboardModal() {
    // Hide UI elements that might overlap with the leaderboard
    this.hideUIElementsForLeaderboard();
    
    const { width, height } = this.scene.sys.game.config;
    
    // Create modal container
    this.leaderboardModal = this.scene.add.container(width / 2, height / 2);
    this.leaderboardModal.setDepth(2000);
    
    // Background blocker
    const blocker = this.scene.add.graphics();
    blocker.fillStyle(0x000000, 0.8);
    blocker.fillRect(-width/2, -height/2, width, height);
    blocker.setInteractive();
    
    // Modal background
    const modalBg = this.scene.add.graphics();
    modalBg.fillStyle(0x0c0114, 0.98);
    modalBg.fillRoundedRect(-280, -400, 560, 800, 20);
    modalBg.lineStyle(2, 0x00e5ff, 1);
    modalBg.strokeRoundedRect(-280, -400, 560, 800, 20);
    
    // Title
    const title = this.scene.add.text(0, -360, 'Leaderboard', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      color: '#00e5ff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Close button
    const closeButton = this.scene.add.text(250, -370, 'X', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      color: '#c9c9c9',
      backgroundColor: '#2d0b4b',
      padding: { x: 10, y: 5 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    
    closeButton.on('pointerdown', () => {
      this.scene.playSound('button_ambience');
      this.showUIElementsAfterLeaderboard();
      this.leaderboardModal.destroy();
    });
    
    // Leaderboard content
    this.populateLeaderboardModal();
    this.leaderboardModal.add([blocker, modalBg, title, closeButton, this.leaderboardContent]);
  }
  populateLeaderboardModal() {
    if (this.leaderboardContent) {
      this.leaderboardContent.destroy();
    }
    this.leaderboardContent = this.scene.add.container(0, -200);
    
    const leaderboardData = this.getLeaderboardData();
    
    if (leaderboardData.length === 0) {
      const emptyText = this.scene.add.text(0, 50, 'No players yet - be the first psychic master!', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#c9c9c9',
        fontStyle: 'italic'
      }).setOrigin(0.5);
      this.leaderboardContent.add(emptyText);
      return;
    }
    
    // Header
    const headerText = this.scene.add.text(0, 0, 'Rank  Name                 Accuracy  Rolls  P-Value', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#00e5ff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.leaderboardContent.add(headerText);
    
    // Player entries
    leaderboardData.slice(0, 15).forEach((player, index) => {
      const isCurrentPlayer = this.getCurrentPlayerEmail() === player.email;
      const rankEmoji = index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      const displayName = player.name.length > 15 ? player.name.substring(0, 12) + '...' : player.name;
      
      const entryBg = this.scene.add.graphics();
      if (isCurrentPlayer) {
        entryBg.fillStyle(0x2d4a22, 0.5);
        entryBg.fillRoundedRect(-250, -10, 500, 25, 5);
      }
      
      const playerText = this.scene.add.text(0, 25 + (index * 30), 
        `${rankEmoji}   ${displayName.padEnd(18)} ${player.accuracy.toFixed(1)}%   ${player.totalRolls.toString().padStart(4)}   ${player.pValue.toFixed(3)}`, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: isCurrentPlayer ? '#00ff88' : (index < 3 ? '#ffff00' : '#c9c9c9')
      }).setOrigin(0.5);
      
      this.leaderboardContent.add([entryBg, playerText]);
    });
    
    // Show current player position if not in top 15
    const currentPlayerEmail = this.getCurrentPlayerEmail();
    const currentPlayerRank = leaderboardData.findIndex(p => p.email === currentPlayerEmail);
    
    if (currentPlayerRank >= 15) {
      const divider = this.scene.add.text(0, 25 + (15 * 30), '...', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: '#666666'
      }).setOrigin(0.5);
      
      const currentPlayer = leaderboardData[currentPlayerRank];
      const currentPlayerText = this.scene.add.text(0, 55 + (15 * 30), 
        `${currentPlayerRank + 1}. ${currentPlayer.name} - ${currentPlayer.accuracy.toFixed(1)}% - ${currentPlayer.totalRolls} rolls`, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#00ff88'
      }).setOrigin(0.5);
      
      this.leaderboardContent.add([divider, currentPlayerText]);
    }
  }
  getLeaderboardData() {
    try {
      const leaderboard = localStorage.getItem('divineSenseLeaderboard');
      if (leaderboard) {
        const data = JSON.parse(leaderboard);
        return data
          .filter(p => p.totalRolls > 0)
          .sort((a, b) => {
            if (Math.abs(a.accuracy - b.accuracy) < 0.1) {
              if (Math.abs(a.pValue - b.pValue) < 0.001) {
                return b.totalRolls - a.totalRolls;
              }
              return a.pValue - b.pValue;
            }
            return b.accuracy - a.accuracy;
          });
      }
      return [];
    } catch (e) {
      console.error('Could not load leaderboard:', e);
      return [];
    }
  }
  getCurrentPlayerEmail() {
    try {
      const playerData = JSON.parse(localStorage.getItem('divineSensePlayer') || '{}');
      return playerData.email || '';
    } catch (e) {
      return '';
    }
  }
  downloadStatsViaDataURL(rt, onComplete) {
    try {
      if (!rt || rt.destroyed) {
        console.error('Render texture is null or destroyed');
        this.showRewardNotification('Error!', 'Failed to generate stats image. Please try again.', '❌');
        if (onComplete) onComplete();
        return;
      }
      
      let canvas = null;
      let dataURL = null;
      
      if (rt.canvas && typeof rt.canvas.toDataURL === 'function') {
        canvas = rt.canvas;
        try {
          dataURL = canvas.toDataURL('image/png');
        } catch (e) {
          console.warn('Failed to get dataURL from direct canvas:', e);
          canvas = null;
        }
      }
      else if (rt.texture && rt.texture.source && rt.texture.source[0]) {
        const source = rt.texture.source[0];
        if (source.source && typeof source.source.toDataURL === 'function') {
          canvas = source.source;
          try {
            dataURL = canvas.toDataURL('image/png');
          } catch (e) {
            console.warn('Failed to get dataURL from texture source:', e);
            canvas = null;
          }
        }
      }
      
      if (!dataURL || typeof dataURL !== 'string' || !dataURL.startsWith('data:image/')) {
        console.error('No valid dataURL generated from render texture');
        this.showRewardNotification('Error!', 'Failed to generate stats image. Your browser may not support this feature.', '❌');
        if (rt) rt.destroy();
        if (onComplete) onComplete();
        return;
      }
      
      const blob = this.dataURLToBlob(dataURL);
      
      if (!blob) {
        this.showRewardNotification('Error!', 'Failed to generate stats image. Please try again.', '❌');
        if (rt) rt.destroy();
        if (onComplete) onComplete();
        return;
      }
      
      this.downloadStatsImage(blob, () => {
        if (rt) rt.destroy();
        if (onComplete) onComplete();
      });
      
    } catch (error) {
      console.error('Failed to generate image via dataURL:', error);
      this.showRewardNotification('Error!', 'Failed to generate stats image. Please try again.', '❌');
      if (rt) rt.destroy();
      if (onComplete) onComplete();
    }
  }
  downloadStatsImage(blob, onComplete) {
    try {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `divine_sense_stats_${Date.now()}.png`;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      
      this.showRewardNotification('Stats Downloaded!', 'Your stats graphic has been downloaded to your device.', '📥');
      
    } catch (downloadErr) {
      console.error('Failed to download image:', downloadErr);
      this.showRewardNotification('Download Failed!', 'Unable to download stats image. Please try again or check your browser settings.', '❌');
    } finally {
        if (onComplete) {
            onComplete();
        }
    }
  }
  dataURLToBlob(dataURL) {
    try {
      const arr = dataURL.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    } catch (error) {
      console.error('Failed to convert dataURL to blob:', error);
      return null;
    }
  }
  createShareableTrendChart(container, trendData, chartWidth, chartHeight) {
    const bg = this.scene.add.graphics().fillStyle(0x1a2c3d, 0.6).fillRoundedRect(-chartWidth / 2, -chartHeight / 2, chartWidth, chartHeight, 20);
    bg.lineStyle(2, 0x00bfff, 0.7);
    bg.strokeRoundedRect(-chartWidth / 2, -chartHeight / 2, chartWidth, chartHeight, 20);
    container.add(bg);
    
    // Add Y-axis labels for shareable chart
    const yAxisLabels = ['100%', '50%', '0%'];
    yAxisLabels.forEach((label, index) => {
        const y = -chartHeight / 2 + (index * chartHeight / 2);
        const yLabel = this.scene.add.text(-chartWidth / 2 - 35, y, label, {
            fontFamily: '"Nunito", sans-serif', fontSize: '14px', color: '#c9c9c9', fontStyle: 'bold'
        }).setOrigin(0.5);
        container.add(yLabel);
    });
    
    if (!trendData || trendData.length === 0) return;
    
    const points = trendData.map((data, index) => {
        const x = -chartWidth / 2 + (chartWidth / (trendData.length - 1)) * index;
        const y = (chartHeight / 2) - Phaser.Math.Clamp(data.accuracy / 100, 0, 1) * chartHeight;
        return new Phaser.Math.Vector2(x, y);
    });
    
    const line = this.scene.add.graphics();
    line.lineStyle(3, 0x00e5ff, 1);
    line.beginPath();
    line.moveTo(points[0].x, points[0].y);
    const fillPath = [new Phaser.Math.Vector2(points[0].x, chartHeight / 2)];
    for (let i = 0; i < points.length; i++) {
        if(i > 0) line.lineTo(points[i].x, points[i].y);
        fillPath.push(points[i]);
    }
    fillPath.push(new Phaser.Math.Vector2(points[points.length - 1].x, chartHeight / 2));
    line.strokePath();
    
    const fill = this.scene.add.graphics();
    fill.fillStyle(0x00e5ff, 0.2);
    fill.fillPoints(fillPath, true);
    container.add(line);
    container.add(fill);
    
    points.forEach((point, index) => {
        const circle = this.scene.add.graphics().fillStyle(0x00e5ff, 1).fillCircle(point.x, point.y, 6);
        const circleGlow = this.scene.add.graphics().fillStyle(0x00e5ff, 0.5).fillCircle(point.x, point.y, 12);
        circleGlow.setBlendMode(Phaser.BlendModes.ADD);
        container.add(circleGlow);
        container.add(circle);
        const dayLabel = this.scene.add.text(point.x, chartHeight / 2 + 25, trendData[index].label, { 
            fontFamily: '"Nunito", sans-serif', fontSize: '16px', color: '#c9c9c9', fontStyle: 'bold' 
        }).setOrigin(0.5);
        container.add(dayLabel);
    });
  }

  hideUIElementsForLeaderboard() {
    // Hide prediction system
    if (this.scene.predictionSystem && this.scene.predictionSystem.container) {
      this.scene.predictionSystem.container.setVisible(false);
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

  showRewardNotification(title, description, icon) {
    const { width } = this.scene.sys.game.config;
    const container = this.scene.add.container(width / 2, -100);
    container.setDepth(1500);
    
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x223a4a, 0.95);
    bg.fillRoundedRect(-200, -40, 400, 80, 15);
    bg.lineStyle(3, 0x33aaff, 1);
    bg.strokeRoundedRect(-200, -40, 400, 80, 15);
    
    const iconText = this.scene.add.text(-170, 0, icon, {
        fontSize: '32px'
    }).setOrigin(0.5);
    
    const titleText = this.scene.add.text(-140, -10, title, {
        fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    
    const descText = this.scene.add.text(-140, 15, description, {
        fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#c9c9c9', wordWrap: { width: 260 }
    }).setOrigin(0, 0.5);
    
    container.add([bg, iconText, titleText, descText]);
    
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
}