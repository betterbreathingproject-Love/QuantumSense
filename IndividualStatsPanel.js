import Phaser from 'phaser';
export class IndividualStatsPanel {
  constructor(scene, statsTracker) {
    this.scene = scene;
    this.statsTracker = statsTracker;
    this.container = null;
    this.scrollContainer = null;
    this.visible = false;
    this.wheelEventManager = scene.uiManager?.wheelEventManager;
  }

  createPanel() {
    const { width, height } = this.scene.sys.game.config;
    
    // Main container
    this.container = this.scene.add.container(0, 0);
    
    // Background
    const background = this.scene.add.graphics();
    background.fillStyle(0x1a1a2e, 0.95);
    background.fillRect(0, 0, width, height);
    this.container.add(background);
    
    // Header
    const headerBg = this.scene.add.graphics();
    headerBg.fillStyle(0x16213e, 1);
    headerBg.fillRect(0, 0, width, 80);
    
    const title = this.scene.add.text(width / 2, 40, 'Individual Statistics', {
      fontSize: '28px',
      color: '#00bfff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Close button
    const closeButton = this.scene.add.text(width - 40, 40, '✕', {
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', () => this.hide());
    
    this.container.add([headerBg, title, closeButton]);
    
    // Scrollable content container
    this.scrollContainer = this.scene.add.container(0, 80);
    this.container.add(this.scrollContainer);
    
    // Create statistics sections
    let yPos = 20;
    yPos += this.createProfileSection(yPos);
    yPos += this.createPValueSection(yPos);
    yPos += this.createAchievementsSection(yPos);
    yPos += this.createRecentPredictionsChart(yPos);
    yPos += this.create7DayTrendChart(yPos);
    
    this.setupScrolling();
    this.hide(); // Initially hidden
    
    return this.container;
  }

  createProfileSection(startY) {
    const { width } = this.scene.sys.game.config;
    const sectionHeight = 180;
    
    // Section title
    const sectionTitle = this.scene.add.text(width / 2, startY + 10, 'Profile Overview', {
      fontSize: '22px',
      color: '#00bfff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Avatar circle background
    const avatarBg = this.scene.add.graphics();
    avatarBg.fillStyle(0x00bfff, 1);
    avatarBg.fillCircle(width / 2, startY + 70, 45);
    
    // Avatar image placeholder (mystic figure)
    const avatar = this.scene.add.text(width / 2, startY + 70, '🧙‍♂️', {
      fontSize: '60px'
    }).setOrigin(0.5);
    
    // Get current session and all-time stats
    const stats = this.statsTracker || {};
    const sessionRolls = stats.sessionRolls || 137;
    const sessionAccuracy = stats.sessionAccuracy || 37.2;
    const totalRolls = stats.totalRolls || 379;
    const totalAccuracy = stats.totalAccuracy || 35.1;
    const sessionDuration = stats.sessionDuration || 4411; // in seconds
    
    // Session and All-Time stats
    const statsText = this.scene.add.text(width / 2, startY + 140, 
      `Session: ${sessionRolls} rolls, ${sessionAccuracy.toFixed(1)}% accuracy\n` +
      `All-Time: ${totalRolls} rolls, ${totalAccuracy.toFixed(1)}% accuracy\n` +
      `Session Duration: ${Math.floor(sessionDuration / 60)}m`, {
      fontSize: '16px',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 5
    }).setOrigin(0.5);
    
    this.scrollContainer.add([sectionTitle, avatarBg, avatar, statsText]);
    
    return sectionHeight;
  }

  createPValueSection(startY) {
    const { width } = this.scene.sys.game.config;
    const sectionHeight = 160;
    
    // Section title
    const sectionTitle = this.scene.add.text(width / 2, startY + 10, 'Statistical Significance', {
      fontSize: '22px',
      color: '#00bfff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // P-Value display box
    const pValueBg = this.scene.add.graphics();
    pValueBg.fillStyle(0x2a2a3e, 0.9);
    pValueBg.lineStyle(2, 0x00bfff, 0.8);
    pValueBg.fillRoundedRect(width / 2 - 120, startY + 40, 240, 80, 15);
    pValueBg.strokeRoundedRect(width / 2 - 120, startY + 40, 240, 80, 15);
    
    // P-Value
    const pValue = this.scene.add.text(width / 2, startY + 65, '0.001', {
      fontSize: '32px',
      color: '#00ff88',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    const pValueLabel = this.scene.add.text(width / 2, startY + 90, 'All-Time P-Value\nLower is better!', {
      fontSize: '14px',
      color: '#cccccc',
      align: 'center'
    }).setOrigin(0.5);
    
    // Explanation text
    const explanation = this.scene.add.text(width / 2, startY + 135, 
      `The lower your all-time p-value, the less likely your\nresults are random. You're proving your intuition is real!`, {
      fontSize: '14px',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 3
    }).setOrigin(0.5);
    
    this.scrollContainer.add([sectionTitle, pValueBg, pValue, pValueLabel, explanation]);
    
    return sectionHeight;
  }

  createAchievementsSection(startY) {
    const { width } = this.scene.sys.game.config;
    const sectionHeight = 280;
    
    // Section title
    const title = this.scene.add.text(width / 2, startY + 20, 'Achievements', {
      fontSize: '22px',
      color: '#00bfff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Achievement items
    const achievements = [
      { icon: '🔥', title: 'Triple Sight', desc: 'Achieved a 3-prediction streak' },
      { icon: '⚡', title: 'Mystic Flow', desc: 'Achieved a 5-prediction streak' },
      { icon: '💯', title: 'Century Seer', desc: 'Made 100 predictions' },
      { icon: '👑', title: 'Psychic Master', desc: 'Reached master level' }
    ];
    
    achievements.forEach((achievement, index) => {
      const y = startY + 60 + (index * 50);
      
      // Achievement background
      const achievementBg = this.scene.add.graphics();
      achievementBg.fillStyle(0x2a2a3e, 0.8);
      achievementBg.lineStyle(1, 0x00bfff, 0.5);
      achievementBg.fillRoundedRect(40, y - 20, width - 80, 40, 10);
      achievementBg.strokeRoundedRect(40, y - 20, width - 80, 40, 10);
      
      // Icon
      const icon = this.scene.add.text(70, y, achievement.icon, {
        fontSize: '24px'
      }).setOrigin(0.5);
      
      // Title
      const titleText = this.scene.add.text(110, y - 8, achievement.title, {
        fontSize: '16px',
        color: '#00bfff',
        fontStyle: 'bold'
      });
      
      // Description
      const descText = this.scene.add.text(110, y + 8, achievement.desc, {
        fontSize: '12px',
        color: '#cccccc'
      });
      
      this.scrollContainer.add([achievementBg, icon, titleText, descText]);
    });
    
    return sectionHeight;
  }

  createRecentPredictionsChart(startY) {
    const { width } = this.scene.sys.game.config;
    const sectionHeight = 180;
    
    // Section title
    const title = this.scene.add.text(width / 2, startY + 20, 'Recent Predictions', {
      fontSize: '22px',
      color: '#00bfff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Chart background
    const chartBg = this.scene.add.graphics();
    chartBg.fillStyle(0x2a2a3e, 0.8);
    chartBg.fillRoundedRect(40, startY + 50, width - 80, 80, 10);
    
    // Generate demo prediction data (last 20 predictions)
    const predictions = [];
    for (let i = 0; i < 20; i++) {
      predictions.push(Math.random() > 0.45); // 55% correct rate
    }
    
    // Draw bars
    const barWidth = (width - 120) / 20;
    predictions.forEach((correct, index) => {
      const x = 50 + (index * barWidth);
      const barHeight = 60;
      const color = correct ? 0x00ff88 : 0xff4444;
      
      const bar = this.scene.add.graphics();
      bar.fillStyle(color, 0.8);
      bar.fillRect(x, startY + 70, barWidth - 2, barHeight);
      
      this.scrollContainer.add(bar);
    });
    
    // Stats
    const correctCount = predictions.filter(p => p).length;
    const accuracy = ((correctCount / predictions.length) * 100).toFixed(1);
    const statsText = this.scene.add.text(width / 2, startY + 150, 
      `Last 20: ${correctCount} correct (${accuracy}%)`, {
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    this.scrollContainer.add([title, chartBg, statsText]);
    
    return sectionHeight;
  }

  create7DayTrendChart(startY) {
    const { width } = this.scene.sys.game.config;
    const sectionHeight = 200;
    
    // Section title
    const title = this.scene.add.text(width / 2, startY + 20, '7-Day Accuracy Trend', {
      fontSize: '22px',
      color: '#00bfff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Chart background
    const chartBg = this.scene.add.graphics();
    chartBg.fillStyle(0x2a2a3e, 0.8);
    chartBg.fillRoundedRect(40, startY + 50, width - 80, 120, 10);
    
    // Y-axis labels
    const yLabels = ['100%', '75%', '50%', '25%', '0%'];
    yLabels.forEach((label, index) => {
      const y = startY + 60 + (index * 20);
      const labelText = this.scene.add.text(30, y, label, {
        fontSize: '12px',
        color: '#cccccc'
      }).setOrigin(1, 0.5);
      this.scrollContainer.add(labelText);
    });
    
    // X-axis labels (days of week)
    const days = ['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'];
    const chartWidth = width - 120;
    const stepX = chartWidth / (days.length - 1);
    
    days.forEach((day, index) => {
      const x = 50 + (index * stepX);
      const dayText = this.scene.add.text(x, startY + 180, day, {
        fontSize: '12px',
        color: '#cccccc'
      }).setOrigin(0.5);
      this.scrollContainer.add(dayText);
    });
    
    // Generate trend data (accuracy percentages)
    const trendData = [0, 5, 15, 35, 60, 35, 45]; // Sample trend
    
    // Draw trend line
    const line = this.scene.add.graphics();
    line.lineStyle(3, 0x00bfff, 1);
    
    trendData.forEach((accuracy, index) => {
      const x = 50 + (index * stepX);
      const y = startY + 160 - (accuracy * 1.0); // Scale to chart height
      
      if (index === 0) {
        line.moveTo(x, y);
      } else {
        line.lineTo(x, y);
      }
      
      // Add data points
      const point = this.scene.add.graphics();
      point.fillStyle(0x00bfff, 1);
      point.fillCircle(x, y, 4);
      this.scrollContainer.add(point);
    });
    
    line.strokePath();
    this.scrollContainer.add([title, chartBg, line]);
    
    return sectionHeight;
  }

  setupScrolling() {
    if (this.scrollContainer) {
      // Remove any existing wheel handler first
      if (this.wheelEventManager) {
        this.wheelEventManager.unregisterHandler('individualScroll');
      }
      
      this.individualScrollHandler = (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
        if (this.visible && this.scrollContainer) {
          const scrollSpeed = 3;
          const currentY = this.scrollContainer.y;
          const contentHeight = this.scrollContainer.getBounds().height;
          const visibleHeight = this.scene.sys.game.config.height - 100;
          
          const minY = -(contentHeight - visibleHeight);
          const maxY = 0;
          
          const newY = Phaser.Math.Clamp(currentY - (deltaY * scrollSpeed / 100), minY, maxY);
          this.scrollContainer.setY(newY);
        }
      };
      
      // Register with WheelEventManager instead of direct scene input
      if (this.wheelEventManager) {
        this.wheelEventManager.registerHandler('individualScroll', this.individualScrollHandler);
      }
    }
  }

  show() {
    if (this.container) {
      this.container.setVisible(true);
      this.visible = true;
    }
  }

  hide() {
    if (this.container) {
      this.container.setVisible(false);
      this.visible = false;
    }
  }

  isVisible() {
    return this.visible && this.container && this.container.visible;
  }

  destroy() {
    // Unregister wheel handler when destroying
    if (this.wheelEventManager) {
      this.wheelEventManager.unregisterHandler('individualScroll');
    }
    
    if (this.container) {
      this.container.destroy();
      this.container = null;
      this.scrollContainer = null;
    }
  }
}