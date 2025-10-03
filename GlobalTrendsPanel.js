import { GlobalStatsManager } from './GlobalStatsManager.js';

export class GlobalTrendsPanel {
  constructor(scene, statsTracker) {
    this.scene = scene;
    this.statsTracker = statsTracker;
    this.globalStatsManager = new GlobalStatsManager();
    this.container = null;
    this.scrollContainer = null;
    this.visible = false;
    this.destroyed = false; // Track destruction state
    this.wheelEventManager = scene?.uiManager?.wheelEventManager;
    
    // Create the panel immediately upon construction
    this.createPanel();
  }

  createPanel() {
    // Guard against missing scene during lifecycle transitions
    if (!this.scene || !this.scene.sys || !this.scene.sys.game) {
      console.warn('GlobalTrendsPanel: Scene is not ready for panel creation');
      return;
    }
    const { width, height } = this.scene.sys.game.config;
    // Shared horizontal margins for consistent alignment across sections
    // Using a single constant helps avoid small misalignments between panels.
    const MARGIN_X = 60; // left/right padding in pixels
    // Safe overlap padding and section spacing
    this.safeBottomPadding = 140; // keep content away from bottom menu
    this.sectionSpacing = 12;     // vertical spacing between sections
    
    // Main container
    // Set depth BELOW bottom menu (which uses depth 5000) so the menu stays on top
    this.container = this.scene.add.container(0, 0).setDepth(4000);

    // Full-screen input blocker to prevent interactions with gameplay UI beneath
    const inputBlocker = this.scene.add.graphics();
    inputBlocker.fillStyle(0x000000, 0); // transparent blocker
    inputBlocker.fillRect(0, 0, width, height);
    inputBlocker.setInteractive();
    this.container.add(inputBlocker);
    
    // Background
    const background = this.scene.add.graphics();
    background.fillStyle(0x1a1a2e, 0.95);
    // Leave space for bottom menu using safe padding
    background.fillRect(0, 0, width, height - this.safeBottomPadding);
    this.container.add(background);
    
    // Scrollable content container
    this.scrollContainer = this.scene.add.container(0, 0);
    this.container.add(this.scrollContainer);
    
    // Create global trends sections
    let yPos = 20;
    yPos += this.createExplainerSection(yPos) + this.sectionSpacing;
    yPos += this.createGlobalStatsSection(yPos) + this.sectionSpacing;
    yPos += this.createPlayerDistributionSection(yPos) + this.sectionSpacing;
    yPos += this.createLeaderboardSection(yPos) + this.sectionSpacing;
    yPos += this.createGlobalTrendsChart(yPos) + this.sectionSpacing;
    yPos += this.createCommunityInsightsSection(yPos) + this.sectionSpacing;

    // Add transparent spacer so the last content sits above the bottom menu
    const bottomSpacer = this.scene.add.rectangle(
      width / 2,
      yPos + (this.safeBottomPadding / 2),
      width,
      this.safeBottomPadding,
      0x000000,
      0
    );
    this.scrollContainer.add(bottomSpacer);
    yPos += this.safeBottomPadding;

    // Track total content height for accurate scrolling
    this.totalContentHeight = yPos;
    
    this.setupScrolling();
    this.hide(); // Initially hidden
    
    return this.container;
  }

  // Inspiring explainer section at the top
  createExplainerSection(startY) {
    const { width } = this.scene.sys.game.config;
    // Minimum section height to ensure comfortable spacing
    const minSectionHeight = 220;

    // Title
    const title = this.scene.add.text(width / 2, startY + 22, 'Global Patterns of Intuition', {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      color: '#00bfff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Explainer copy (positioned clearly below the title)
    const copy = this.scene.add.text(width / 2, startY + 72,
      'You are part of a living experiment with reality itself.\n' +
      'Every choice is tested against a Quantum Random Number Generator,\n' +
      'the same technology used by researchers at ANU, HeartMath, and the Princeton PEAR Lab.\n' +
      'This dashboard reveals how intuition emerges from pure randomness—\n' +
      'where focus sharpens, where momentum builds, and where coherence guides clarity.', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#c9c9c9',
      align: 'center',
      lineSpacing: 6,
      wordWrap: { width: width - 140 }
    }).setOrigin(0.5, 0);

    // Dynamically size the background to avoid overlap with the next section
    const copyBounds = (typeof copy.getBounds === 'function') ? copy.getBounds() : { height: copy.height || 140 };
    const contentHeight = Math.max(minSectionHeight, (copy.y - startY) + copyBounds.height + 24);

    // Background block to anchor text visually (no border)
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x121a2f, 0.9);
    bg.fillRoundedRect(40, startY, width - 80, contentHeight, 12);

    this.scrollContainer.add([bg, title, copy]);
    return contentHeight + 24; // extra breathing room below explainer
  }

  createGlobalStatsSection(startY) {
    const { width } = this.scene.sys.game.config;
    const MARGIN_X = 60; // keep margins consistent with createPanel
    const sectionHeight = 220; // Section block height
    const topSpacing = 80;     // Move cards further down from title
    
    // Section title
    const title = this.scene.add.text(width / 2, startY + 20, 'Global Statistics', {
      fontSize: '22px',
      color: '#00bfff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Get global stats
    const globalStats = this.globalStatsManager.getGlobalStats();
    
    // Stats grid
    const statsData = [
      { label: 'Total Players', value: globalStats.totalPlayers.toLocaleString(), icon: '👥' },
      { label: 'Average Score', value: Math.round(globalStats.averageScore).toString(), icon: '📊' },
      { label: 'Top Score', value: globalStats.topScore.toLocaleString(), icon: '🏆' },
      { label: 'Total Sessions', value: globalStats.totalSessions.toLocaleString(), icon: '🎯' }
    ];
    
    // Compute card width based on shared margins for consistent alignment
    const contentWidth = width - MARGIN_X * 2;
    const cardWidth = contentWidth / 2;
    const cardHeight = 60;
    
    statsData.forEach((stat, index) => {
      const row = Math.floor(index / 2);
      const col = index % 2;
      const x = MARGIN_X + (col * cardWidth) + (cardWidth / 2);
      const y = startY + topSpacing + (row * 80);
      
      // Card background
      const cardBg = this.scene.add.graphics();
      cardBg.fillStyle(0x2a2a3e, 0.9);
      cardBg.lineStyle(1, 0x00bfff, 0.5);
      // Inset padding for card contents
      cardBg.fillRoundedRect(x - cardWidth/2 + 10, y - cardHeight/2, cardWidth - 20, cardHeight, 10);
      cardBg.strokeRoundedRect(x - cardWidth/2 + 10, y - cardHeight/2, cardWidth - 20, cardHeight, 10);
      
      // Icon
      const icon = this.scene.add.text(x - 40, y - 10, stat.icon, {
        fontSize: '24px'
      }).setOrigin(0.5);
      
      // Value
      const value = this.scene.add.text(x, y - 10, stat.value, {
        fontSize: '20px',
        color: '#00ff88',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      
      // Label
      const label = this.scene.add.text(x, y + 10, stat.label, {
        fontSize: '12px',
        color: '#cccccc'
      }).setOrigin(0.5);
      
      this.scrollContainer.add([cardBg, icon, value, label]);
    });
    
    // Add title to scroll container
    this.scrollContainer.add(title);
    
    return sectionHeight;
  }

  createPlayerDistributionSection(startY) {
    const { width } = this.scene.sys.game.config;
    const MARGIN_X = 60;
    const sectionHeight = 200; // Increased height to accommodate spacing
    
    // Section title
    const title = this.scene.add.text(width / 2, startY + 20, 'Player Distribution', {
      fontSize: '22px',
      color: '#00bfff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // World map background
    const mapBg = this.scene.add.graphics();
    mapBg.fillStyle(0x2a2a3e, 0.8);
    // Use shared margins for the map background width to align with cards above
    mapBg.fillRoundedRect(MARGIN_X, startY + 50, width - MARGIN_X * 2, 100, 10);
    
    // Get player locations
    const locations = this.globalStatsManager.getPlayerLocations();
    
    // Draw location dots
    locations.forEach((location, index) => {
      const x = MARGIN_X + 10 + (index * 40) % (width - (MARGIN_X * 2 + 20));
      const y = startY + 80 + Math.floor(index * 40 / (width - 140)) * 20;
      
      // Location dot
      const dot = this.scene.add.graphics();
      dot.fillStyle(0x00bfff, 0.8);
      dot.fillCircle(x, y, 3);
      
      // Player count
      const count = this.scene.add.text(x, y - 15, location.players.toString(), {
        fontSize: '10px',
        color: '#ffffff'
      }).setOrigin(0.5);
      
      this.scrollContainer.add([dot, count]);
    });
    
    this.scrollContainer.add([title, mapBg]);
    
    return sectionHeight;
  }

  createLeaderboardSection(startY) {
    const { width } = this.scene.sys.game.config;
    const MARGIN_X = 60;
    const sectionHeight = 300; // Increased height to accommodate spacing
    
    // Section title
    const title = this.scene.add.text(width / 2, startY + 20, 'Global Leaderboard', {
      fontSize: '22px',
      color: '#00bfff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Get leaderboard data (use qScore terminology)
    const leaderboard = this.globalStatsManager.getLeaderboard('qScore', 5);
    
    // Guard against unexpected undefined/null returns
    if (!Array.isArray(leaderboard)) {
      console.warn('GlobalTrendsPanel: leaderboard data unavailable');
      this.scrollContainer.add(title);
      return sectionHeight;
    }

    leaderboard.forEach((player, index) => {
      const y = startY + 60 + (index * 40);
      
      // Rank background
      const rankBg = this.scene.add.graphics();
      const bgColor = index === 0 ? 0xffd700 : index === 1 ? 0xc0c0c0 : index === 2 ? 0xcd7f32 : 0x2a2a3e;
      rankBg.fillStyle(bgColor, index < 3 ? 0.9 : 0.8);
      rankBg.lineStyle(1, 0x00bfff, 0.5);
      // Align leaderboard rows with same margins as other sections
      rankBg.fillRoundedRect(MARGIN_X, y - 15, width - MARGIN_X * 2, 30, 8);
      rankBg.strokeRoundedRect(MARGIN_X, y - 15, width - MARGIN_X * 2, 30, 8);
      
      // Rank number
      const rank = this.scene.add.text(MARGIN_X + 20, y, `#${player.rank}`, {
        fontSize: '16px',
        color: index < 3 ? '#000000' : '#00bfff',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      
      // Player name
      const name = this.scene.add.text(MARGIN_X + 70, y, player.name, {
        fontSize: '16px',
        color: index < 3 ? '#000000' : '#ffffff',
        fontStyle: 'bold'
      });
      
      // Score
      const scoreValue = (player && typeof player.score === 'number') ? player.score : 0;
      const score = this.scene.add.text(width - MARGIN_X - 20, y, scoreValue.toLocaleString(), {
        fontSize: '16px',
        color: index < 3 ? '#000000' : '#00ff88',
        fontStyle: 'bold'
      }).setOrigin(1, 0.5);
      
      this.scrollContainer.add([rankBg, rank, name, score]);
    });
    
    this.scrollContainer.add(title);
    
    return sectionHeight;
  }

  createGlobalTrendsChart(startY) {
    const { width } = this.scene.sys.game.config;
    const MARGIN_X = 60; // standard left/right margin to align with other sections
    const sectionHeight = 240; // Increased height to accommodate spacing
    
    // Section title
    const title = this.scene.add.text(width / 2, startY + 20, 'Global Accuracy Trends', {
      fontSize: '22px',
      color: '#00bfff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Chart background
    const chartBg = this.scene.add.graphics();
    chartBg.fillStyle(0x2a2a3e, 0.8);
    chartBg.fillRoundedRect(MARGIN_X, startY + 50, width - MARGIN_X * 2, 140, 10); // Align to shared margins
    
    // Y-axis labels
    const yLabels = ['60%', '50%', '40%', '30%', '20%'];
    yLabels.forEach((label, index) => {
      const y = startY + 60 + (index * 25);
      const labelText = this.scene.add.text(MARGIN_X - 20, y, label, { // Align with chart left edge
        fontSize: '12px',
        color: '#cccccc'
      }).setOrigin(1, 0.5);
      this.scrollContainer.add(labelText);
    });
    
    // X-axis labels (months)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const chartWidth = width - (MARGIN_X * 2 + 20); // width minus margins and y-axis label space
    const stepX = chartWidth / (months.length - 1);

    months.forEach((month, index) => {
      const x = MARGIN_X + 20 + (index * stepX);
      // Slightly raise month labels to avoid the bottom menu overlap
      const monthText = this.scene.add.text(x, startY + 195, month, {
        fontSize: '12px',
        color: '#cccccc'
      }).setOrigin(0.5);
      this.scrollContainer.add(monthText);
    });
    
    // Generate global trend data
    const globalTrendData = [35, 38, 42, 45, 48, 52]; // Sample global accuracy trend
    
    // Draw trend line
    const line = this.scene.add.graphics();
    line.lineStyle(3, 0x00ff88, 1);
    
    globalTrendData.forEach((accuracy, index) => {
      const x = MARGIN_X + 20 + (index * stepX);
      const y = startY + 185 - ((accuracy - 20) * 3); // Scale to chart height
      
      if (index === 0) {
        line.moveTo(x, y);
      } else {
        line.lineTo(x, y);
      }
      
      // Add data points
      const point = this.scene.add.graphics();
      point.fillStyle(0x00ff88, 1);
      point.fillCircle(x, y, 4);
      this.scrollContainer.add(point);
    });
    
    line.strokePath();
    this.scrollContainer.add([title, chartBg, line]);
    
    return sectionHeight;
  }

  createCommunityInsightsSection(startY) {
    const { width } = this.scene.sys.game.config;
    const sectionHeight = 200;
    
    // Section title
    const title = this.scene.add.text(width / 2, startY + 20, 'Community Insights', {
      fontSize: '22px',
      color: '#00bfff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Insights cards
    const insights = [
      { 
        title: 'Peak Activity', 
        value: '8-10 PM UTC', 
        desc: 'Most players are active during evening hours',
        icon: '🌙'
      },
      { 
        title: 'Best Day', 
        value: 'Sunday', 
        desc: 'Highest average accuracy scores recorded',
        icon: '📅'
      },
      { 
        title: 'Growth Rate', 
        value: '+15%', 
        desc: 'Monthly increase in active players',
        icon: '📈'
      }
    ];
    
    insights.forEach((insight, index) => {
      const y = startY + 60 + (index * 45);
      
      // Card background
      const cardBg = this.scene.add.graphics();
      cardBg.fillStyle(0x2a2a3e, 0.8);
      cardBg.lineStyle(1, 0x00bfff, 0.5);
      cardBg.fillRoundedRect(40, y - 15, width - 80, 35, 8);
      cardBg.strokeRoundedRect(40, y - 15, width - 80, 35, 8);
      
      // Icon
      const icon = this.scene.add.text(70, y, insight.icon, {
        fontSize: '20px'
      }).setOrigin(0.5);
      
      // Title and value
      const titleText = this.scene.add.text(100, y - 8, insight.title, {
        fontSize: '14px',
        color: '#00bfff',
        fontStyle: 'bold'
      });
      
      const valueText = this.scene.add.text(200, y - 8, insight.value, {
        fontSize: '14px',
        color: '#00ff88',
        fontStyle: 'bold'
      });
      
      // Description
      const descText = this.scene.add.text(100, y + 8, insight.desc, {
        fontSize: '11px',
        color: '#cccccc'
      });
      
      this.scrollContainer.add([cardBg, icon, titleText, valueText, descText]);
    });
    
    this.scrollContainer.add(title);
    
    return sectionHeight;
  }

  setupScrolling() {
    const { height } = this.scene.sys.game.config;
    const visibleHeight = height - (this.safeBottomPadding || 100);
    const contentHeight = this.totalContentHeight || this.getScrollContentHeight();
    
    if (contentHeight > visibleHeight) {
      // Remove any existing wheel handler first
      if (this.wheelEventManager) {
        this.wheelEventManager.unregisterHandler('globalScroll');
      }
      
      this.globalScrollHandler = (pointer, gameObjects, deltaX, deltaY) => {
        if (this.isVisible) {
          const scrollSpeed = 30;
          const currentY = this.scrollContainer.y;
          const minY = -(contentHeight - visibleHeight);
          const maxY = 0;
          
          const newY = Phaser.Math.Clamp(currentY - (deltaY * scrollSpeed / 100), minY, maxY);
          this.scrollContainer.setY(newY);
        }
      };
      
      // Register with WheelEventManager instead of direct scene input
      if (this.wheelEventManager) {
        this.wheelEventManager.registerHandler('globalScroll', this.globalScrollHandler);
      }
    }
  }

  // Compute content height from child bounds for accurate scrolling
  getScrollContentHeight() {
    if (!this.scrollContainer || !Array.isArray(this.scrollContainer.list)) return 0;
    let maxBottom = 0;
    this.scrollContainer.list.forEach(child => {
      if (!child) return;
      try {
        const b = child.getBounds ? child.getBounds() : null;
        const bottom = b ? (b.y + b.height) : (child.y || 0);
        if (bottom > maxBottom) maxBottom = bottom;
      } catch (_) { /* ignore */ }
    });
    // Add small padding at end
    return maxBottom + 20;
  }

  show() {
    // Check if the panel has been destroyed
    if (this.destroyed) {
      console.warn('GlobalTrendsPanel: Cannot show - panel has been destroyed');
      return;
    }
    
    if (!this.container) {
      console.warn('GlobalTrendsPanel: Container not initialized, creating panel...');
      try {
        this.createPanel();
      } catch (error) {
        console.error('GlobalTrendsPanel: Failed to create panel:', error);
        return;
      }
    }
    
    // Double-check container exists, is attached to a scene, and has setVisible
    if (this.container && this.container.scene && typeof this.container.setVisible === 'function') {
      try {
        this.container.setVisible(true);
        this.visible = true;

        // Register the scroll handler
        if (this.wheelEventManager && this.globalScrollHandler) {
          this.wheelEventManager.registerHandler('globalScroll', this.globalScrollHandler);
        }

        // Hide gameplay UI that overlaps with leaderboard/stats panel
        if (this.scene?.predictionSystem && this.scene.predictionSystem.container && this.scene.predictionSystem.container.scene) {
          this.scene.predictionSystem.container.setVisible(false);
          if (typeof this.scene.predictionSystem.setInteractive === 'function') {
            this.scene.predictionSystem.setInteractive(false);
          }
        }
        if (this.scene?.diceController && this.scene.diceController.resultContainer && this.scene.diceController.resultContainer.scene) {
          this.scene.diceController.resultContainer.setVisible(false);
          if (this.scene.diceController.resultContainer.scene && typeof this.scene.diceController.resultContainer.setInteractive === 'function') {
            this.scene.diceController.resultContainer.setInteractive(false);
          }
        }

        // Hide top HUD elements managed by uiManager to prevent visual overlap
        if (this.scene?.uiManager) {
          if (this.scene.uiManager.topBarContainer && this.scene.uiManager.topBarContainer.scene) {
            this.scene.uiManager.topBarContainer.setVisible(false);
          }
          if (this.scene.uiManager.psychicMeterContainer && this.scene.uiManager.psychicMeterContainer.scene) {
            this.scene.uiManager.psychicMeterContainer.setVisible(false);
          }
          if (this.scene.uiManager.coherenceContainer && this.scene.uiManager.coherenceContainer.scene) {
            this.scene.uiManager.coherenceContainer.setVisible(false);
          }
          if (this.scene.uiManager.badgeContainer && this.scene.uiManager.badgeContainer.scene) {
            this.scene.uiManager.badgeContainer.setVisible(false);
          }
        }

        // Hide achievement manager badges if present
        if (this.scene?.achievementManager) {
          if (this.scene.achievementManager.badgeContainer && this.scene.achievementManager.badgeContainer.scene) {
            this.scene.achievementManager.badgeContainer.setVisible(false);
          }
          if (this.scene.achievementManager.breathingAwardsContainer && this.scene.achievementManager.breathingAwardsContainer.scene) {
            this.scene.achievementManager.breathingAwardsContainer.setVisible(false);
          }
        }
      } catch (error) {
        console.error('GlobalTrendsPanel: Error setting visibility to true:', error);
      }
    } else {
      console.warn('GlobalTrendsPanel: Container is null or missing setVisible method');
    }
  }

  hide() {
    // Check if the panel has been destroyed
    if (this.destroyed) {
      console.warn('GlobalTrendsPanel: Cannot hide - panel has been destroyed');
      return;
    }
    
    if (!this.container) {
      console.warn('GlobalTrendsPanel: Container not initialized for hide operation');
      return;
    }
    
    // Double-check container exists, is attached to a scene, and has setVisible method
    if (this.container && this.container.scene && typeof this.container.setVisible === 'function') {
      try {
        this.container.setVisible(false);
        this.visible = false;

        // Unregister the scroll handler
        if (this.wheelEventManager) {
          this.wheelEventManager.unregisterHandler('globalScroll');
        }

        // Restore gameplay UI visibility and interactivity when leaving the panel
        if (this.scene?.predictionSystem && this.scene.predictionSystem.container && this.scene.predictionSystem.container.scene) {
          this.scene.predictionSystem.container.setVisible(true);
          if (typeof this.scene.predictionSystem.setInteractive === 'function') {
            // Only re-enable interactions if returning to predicting state
            this.scene.predictionSystem.setInteractive(this.scene.gameState === 'predicting');
          }
        }
        if (this.scene?.diceController && this.scene.diceController.resultContainer && this.scene.diceController.resultContainer.scene) {
          this.scene.diceController.resultContainer.setVisible(true);
          if (this.scene.diceController.resultContainer.scene && typeof this.scene.diceController.resultContainer.setInteractive === 'function') {
            this.scene.diceController.resultContainer.setInteractive(true);
          }
        }

        // Restore top HUD elements managed by uiManager
        if (this.scene?.uiManager) {
          if (this.scene.uiManager.topBarContainer && this.scene.uiManager.topBarContainer.scene) {
            this.scene.uiManager.topBarContainer.setVisible(true);
          }
          if (this.scene.uiManager.psychicMeterContainer && this.scene.uiManager.psychicMeterContainer.scene) {
            this.scene.uiManager.psychicMeterContainer.setVisible(true);
          }
          if (this.scene.uiManager.coherenceContainer && this.scene.uiManager.coherenceContainer.scene) {
            this.scene.uiManager.coherenceContainer.setVisible(true);
          }
          if (this.scene.uiManager.badgeContainer && this.scene.uiManager.badgeContainer.scene) {
            this.scene.uiManager.badgeContainer.setVisible(true);
          }
        }

        // Restore achievement manager badges
        if (this.scene?.achievementManager) {
          if (this.scene.achievementManager.badgeContainer && this.scene.achievementManager.badgeContainer.scene) {
            this.scene.achievementManager.badgeContainer.setVisible(true);
          }
          if (this.scene.achievementManager.breathingAwardsContainer && this.scene.achievementManager.breathingAwardsContainer.scene) {
            this.scene.achievementManager.breathingAwardsContainer.setVisible(true);
          }
        }
      } catch (error) {
        console.error('GlobalTrendsPanel: Error setting visibility to false:', error);
      }
    } else {
      console.warn('GlobalTrendsPanel: Container is null or missing setVisible method');
    }
  }

  isVisible() {
    return this.visible && this.container && this.container.visible;
  }

  destroy() {
    // Mark as destroyed first to prevent further operations
    this.destroyed = true;
    
    // Unregister wheel handler when destroying
    if (this.wheelEventManager) {
      this.wheelEventManager.unregisterHandler('globalScroll');
    }
    
    if (this.container) {
      this.container.destroy();
      this.container = null;
      this.scrollContainer = null;
    }
  }
}