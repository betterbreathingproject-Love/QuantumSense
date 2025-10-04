import { WheelEventManager } from './WheelEventManager.js';

export class MyStatsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MyStatsScene' });
    this.contentHeight = 0;
  }

  init(data) {
    this.statsTracker = data.statsTracker;
    this.returnScene = data.returnScene || 'GameScene';
  }

  create() {
    const { width, height } = this.sys.game.config;
    
    // Define standardized 4-point grid spacing system (professional UI standards)
    this.SPACING = {
      // Core 4-point grid values (all divisible by 4)
      XS: 8,                    // Extra small - internal element spacing
      SM: 12,                   // Small - related element spacing  
      MD: 16,                   // Medium - card padding, component spacing
      LG: 24,                   // Large - section title to content spacing
      XL: 32,                   // Extra large - between different sections
      XXL: 48,                  // Extra extra large - major section separation
      
      // Specific use cases
      SECTION_SPACING: 48,      // Space between major sections
      TITLE_SPACING: 24,        // Space from section title to content
      ELEMENT_SPACING: 16,      // Space between elements within a section
      CARD_SPACING: 12,         // Space between cards
      CARD_PADDING: 16,         // Internal card padding
      CHART_SPACING: 32,        // Space between charts
      HEADER_MARGIN: 24,        // Space around headers
      CONTENT_PADDING: 16,      // General content padding
      BOTTOM_PADDING: 64,       // Bottom scrolling padding
      
      // Layout positions (calculated to prevent overlapping with explainer section)
      HEADER_Y: 0,
      EXPLAINER_Y: 160,         // After header + spacing
      PROFILE_Y: 280,           // After explainer + spacing
      STATS_Y: 460,             // After profile + spacing  
      PERFORMANCE_Y: 660,       // After stats + major spacing
      BOOST_Y: 1060,            // After performance + major spacing
      SENSE_INFLUENCE_Y: 1460,  // After boost + major spacing
      ACHIEVEMENTS_Y: 1860,     // After sense/influence + major spacing
      COHERENCE_Y: 2260,        // After achievements + major spacing
      
      // Achievement specific
      ACHIEVEMENT_SIZE: 80,
      ACHIEVEMENT_SPACING: 12,
      SIDE_MARGIN: 32,
      TITLE_FONT_SIZE: '28px',
      SUBTITLE_FONT_SIZE: '20px'
    };
    
    // Get UI manager reference from GameScene
    const gameScene = this.scene.get('GameScene');
    if (gameScene && gameScene.uiManager) {
      this.uiManager = gameScene.uiManager;
    }
    
    // Initialize StatsTracker to get real data if not already set
    if (!this.statsTracker) {
      this.statsTracker = gameScene?.statsTracker || 
                         this.scene.get('LoginScene')?.statsTracker;
    }
    
    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x0c0114);
    
    // Create main container for all content
    this.mainContainer = this.add.container(0, 0);
    this.mainContainer.setDepth(100);

    // Fixed header container (sticky, not scrolled)
    this.headerContainer = this.add.container(0, 0);
    this.headerContainer.setDepth(150);
    this.mainContainer.add(this.headerContainer);

    // Create scrollable container
    this.scrollContainer = this.add.container(0, 0);
    // Ensure a dedicated wheel event manager exists for this scene
    if (!this.wheelEventManager) {
      this.wheelEventManager = new WheelEventManager(this);
    }
    
    // Track content elements for height calculation
    this.contentElements = [];
    
    // New hero profile header (sticky, combines title + profile + explainer)
    this.createHeroProfile();
    
    // Performance overview (stats overview)
    this.createStatsOverview();
    
    // Performance trends (performance graphs)
    this.createPerformanceGraphs();
    
    // Coherence boost effects
    this.createBoostStats();
    
    // Sense vs Influence stats
    this.createSenseVsInfluenceStats();
    
    // Achievements & badges
    this.createBadgeAchievements();
    
    // Coherence scores
    this.createCoherenceScores();
    
    // Back button
    this.createBackButton();
    
    // Calculate actual content height based on elements
    this.calculateContentHeight();
    
    // Setup scrolling
    this.setupScrolling();
    
    this.mainContainer.add(this.scrollContainer);
  }


  // Helper: get current bottom of scroll content
  getScrollBottom() {
    try {
      const bounds = this.scrollContainer?.getBounds();
      return bounds ? bounds.bottom : 0;
    } catch (e) {
      return 0;
    }
  }

  // Helper: compute the next section's Y ensuring non-overlap
  nextSectionY(minY = 0) {
    const currentBottom = this.getScrollBottom();
    return Math.max(minY, currentBottom + this.SPACING.SECTION_SPACING);
  }

  // Compute content height from child bounds for accurate scrolling (fallback if container bounds fail)
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
    return maxBottom + this.SPACING.BOTTOM_PADDING;
  }

  calculateContentHeight() {
    // Calculate total content height from actual child bounds (more reliable across Phaser objects)
    const computedHeight = this.getScrollContentHeight();
    this.contentHeight = Math.max(computedHeight, 1200);

    console.log('=== Content Height Calculation ===');
    console.log('Computed height from children:', computedHeight);
    console.log('Final content height (min 1200):', this.contentHeight);
    console.log('ScrollContainer children count:', this.scrollContainer?.list?.length || 0);
    
    // Force re-setup scrolling after content height calculation
    this._scrollSetup = false;
  }


  createHeader() {
    const { width } = this.sys.game.config;
    
    // Title
    const title = this.add.text(width / 2, 60, 'My Stats Dashboard', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '36px',
      color: '#00e5ff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Subtitle with current date
    const currentDate = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const subtitle = this.add.text(width / 2, 100, `Updated: ${currentDate}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#c9c9c9',
      fontStyle: 'italic'
    }).setOrigin(0.5);
    
    // Deprecated: header now part of createHeroProfile()
    this.headerContainer.add([title, subtitle]);
  }

  // New hero profile header combining title, profile chips, shields and explainer
  createHeroProfile() {
    const { width } = this.sys.game.config;
    // Sticky avatar only
    // Make sticky avatar 2x larger
    const avatarRadius = 88;
    const avatarX = width / 2;
    const avatarY = 120;

    // Placeholder while loading real avatar
    const avatarPlaceholder = this.add.graphics();
    avatarPlaceholder.fillStyle(0x1a89ff, 1);
    avatarPlaceholder.fillCircle(avatarX, avatarY, avatarRadius);
    avatarPlaceholder.lineStyle(3, 0xffffff, 0.95);
    avatarPlaceholder.strokeCircle(avatarX, avatarY, avatarRadius);
    this.headerContainer.add(avatarPlaceholder);

    // Try to use existing saved profile image
    try {
      const playerData = JSON.parse(localStorage.getItem('divineSensePlayer') || '{}');
      if (playerData && playerData.avatar) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const size = avatarRadius * 2;
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          ctx.save();
          // Clip to circle
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();

          // Draw image with object-fit: cover
          const scale = Math.max(size / img.width, size / img.height);
          const dw = img.width * scale;
          const dh = img.height * scale;
          const dx = (size - dw) / 2;
          const dy = (size - dh) / 2;
          ctx.drawImage(img, dx, dy, dw, dh);
          ctx.restore();

          // Stroke ring
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.stroke();

          const key = `mystats_avatar_${Date.now()}`;
          this.textures.addCanvas(key, canvas);
          const avatarImage = this.add.image(avatarX, avatarY, key).setOrigin(0.5);
          avatarImage.displayWidth = size;
          avatarImage.displayHeight = size;
          this.headerContainer.add(avatarImage);
          // Remove placeholder
          avatarPlaceholder.destroy();
          // Track key for cleanup
          this._avatarTextureKey = key;
        };
        img.onerror = () => {
          console.warn('Failed to load stored avatar image. Keeping placeholder.');
        };
        img.src = playerData.avatar;
      }
    } catch (e) {
      console.warn('Error loading profile avatar:', e);
    }

    // Sticky area height (avatar only)
    this._headerHeight = avatarY + avatarRadius + this.SPACING.HEADER_MARGIN;

    // Title and subtitle should scroll under the sticky avatar
    // Push title lower so layout isn't squashed under larger avatar
    const titleY = this._headerHeight + this.SPACING.TITLE_SPACING;
    const title = this.add.text(width / 2, titleY, 'My Stats Dashboard', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '32px',
      color: '#00e5ff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const currentDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const subtitle = this.add.text(width / 2, titleY + 32, `Updated: ${currentDate}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#c9c9c9',
      fontStyle: 'italic'
    }).setOrigin(0.5);

    // Stats for chips
    const stats = this.statsTracker?.getStats?.() || {};
    const level = stats.psychicLevel ?? 1;
    const bestStreak = stats.bestStreak ?? 0;
    const shields = stats.coherenceShields ?? stats.shields ?? stats.totalShields ?? 0;

    // Centered chips row under subtitle
    const chipConfigs = [
      { label: `Level ${level}`, color: 0x00bfff },
      { label: `Best Streak ${bestStreak}`, color: 0x7cff6b },
      { label: `Shields ${shields}`, color: 0xffd166 }
    ];
    const chipWidth = 160;
    const chipSpacing = 28; // wider spacing between tiles
    const chipsTotalWidth = chipWidth * chipConfigs.length + chipSpacing * (chipConfigs.length - 1);
    const startX = (width / 2) - (chipsTotalWidth / 2);
    // More space below the subtitle before the tiles
    const chipY = subtitle.y + this.SPACING.XXL + 12; // push chips further down
    const chipsContainer = this.add.container(0, 0);
    chipConfigs.forEach((cfg, i) => {
      const x = startX + i * (chipWidth + chipSpacing);
      const g = this.add.graphics();
      g.fillStyle(0x1a1a2e, 0.9);
      g.lineStyle(2, cfg.color, 0.9);
      g.fillRoundedRect(x, chipY, chipWidth, 34, 14);
      g.strokeRoundedRect(x, chipY, chipWidth, 34, 14);
      const t = this.add.text(x + chipWidth / 2, chipY + 17, cfg.label, {
        fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#ffffff'
      }).setOrigin(0.5);
      chipsContainer.add([g, t]);
    });
    // Set an explicit size for the chips container so getBounds works reliably
    chipsContainer.setSize(chipsTotalWidth, 34);
    this.scrollContainer.add([title, subtitle, chipsContainer]);

    // Measure bottom of chips to place explainer below without overlap
    const chipsBounds = chipsContainer.getBounds();
    const chipsRowBottomFallback = chipY + 34; // graphics height
    const chipsRowBottom = Math.max(chipsBounds.bottom, chipsRowBottomFallback);
    const explainerTitleY = chipsRowBottom + this.SPACING.XXL + 12; // extra space below tiles

    // Inspiring explainer under chips (scrolls)
    const explainerTitle = this.add.text(width / 2, explainerTitleY, 'Why These Metrics Matter', {
      fontFamily: 'Arial, sans-serif', fontSize: '22px', color: '#00e5ff', fontStyle: 'bold'
    }).setOrigin(0.5);

    // Add more space under explainer title for the paragraph copy
    const explainerCopy = this.add.text(width / 2, explainerTitleY + this.SPACING.XXL,
      `What you’re holding in your hands is more than a game—it’s a mirror of the quantum field itself. Every result comes from a QRNG (Quantum Random Number Generator), drawing its outcomes from the true unpredictability of subatomic particles. Unlike computer-made randomness, this is reality’s own roll of the dice.

This same technology has been trusted by the ANU Quantum Optics Lab, the Princeton PEAR Lab, and the HeartMath Institute in studies exploring randomness, coherence, and even the influence of consciousness.

Your stats reveal the subtle weave of your signal: where attention aligns, where effort strains, and where ease returns. Notice how coherence often opens the door to clarity.`, {
      fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#c9c9c9', align: 'center',
      lineSpacing: 10, wordWrap: { width: width - 80 }
    }).setOrigin(0.5, 0);
    
    this.scrollContainer.add([explainerTitle, explainerCopy]);
  }

  createProfileSection() {
    const { width } = this.sys.game.config;
    const startY = this.nextSectionY(this.SPACING.PROFILE_Y); // Dynamic to avoid overlap
    
    // Section background
    const sectionBg = this.add.graphics();
    sectionBg.fillStyle(0x1a1a2e, 0.8);
    sectionBg.fillRoundedRect(40, startY, width - 80, 120, 15);
    sectionBg.lineStyle(2, 0x00e5ff, 0.5);
    sectionBg.strokeRoundedRect(40, startY, width - 80, 120, 15);
    
    // Profile title with standardized font size
    const profileTitle = this.add.text(width / 2, startY + 20, 'Player Profile', {
      fontFamily: 'Arial, sans-serif',
      fontSize: this.SPACING.TITLE_FONT_SIZE,
      color: '#00e5ff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Get current stats (support plain object or StatsTracker instance)
    const rawProfileStats = this.statsTracker;
    const stats = (rawProfileStats && typeof rawProfileStats.getStats === 'function')
      ? rawProfileStats.getStats()
      : (rawProfileStats || {});
    const level = stats.psychicLevel || 1;
    const power = stats.divinePower || 0;
    
    // Profile info
    const profileInfo = [
      `Level: ${level}`,
      `Psychic Power: ${power}`,
      `Total Sessions: ${stats.totalSessions || 0}`,
      `Best Streak: ${stats.bestStreak || 0}`
    ];
    
    profileInfo.forEach((info, index) => {
      const x = 80 + (index % 2) * (width - 160) / 2;
      const y = startY + 50 + Math.floor(index / 2) * 30;
      
      const infoText = this.add.text(x, y, info, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: '#ffffff'
      });
      
      this.scrollContainer.add(infoText);
    });
    
    this.scrollContainer.add([sectionBg, profileTitle]);
  }

  createStatsOverview() {
    const { width } = this.sys.game.config;
    const startY = this.nextSectionY(this.SPACING.STATS_Y); // Dynamic to avoid overlap
    
    // Section title
    const sectionTitle = this.add.text(width / 2, startY, 'Performance Overview', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '30px',
      color: '#00e5ff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Section explainer under title
    const overviewExplainer = this.add.text(
      width / 2,
      startY + 30,
      'These cards reflect how your signal is showing up—accuracy, momentum, and statistical significance. Read them as landmarks: when attention steadies and coherence deepens, results often follow.',
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: '#c9c9c9',
        align: 'center',
        lineSpacing: 10,
        wordWrap: { width: width - 80 }
      }
    ).setOrigin(0.5, 0);
    this.scrollContainer.add(overviewExplainer);
    const overviewBounds = overviewExplainer.getBounds();
    const cardsStartY = Math.max(startY + 50, overviewBounds.bottom + 20);
    
    // Get stats (support plain object or StatsTracker instance)
    const rawStats = this.statsTracker;
    const stats = (rawStats && typeof rawStats.getStats === 'function')
      ? rawStats.getStats()
      : (rawStats || {});
    
    // Create stat cards
    const statCards = [
      { 
        title: 'Q-SCORE', 
        value: stats.zenScore?.toFixed(2) || '0.00', 
        color: '#00e5ff',
        description: 'Quantum Score Rating'
      },
      { 
        title: 'ACCURACY', 
        value: `${(stats.accuracy || 0).toFixed(1)}%`, 
        color: '#00ff88',
        description: 'Prediction Accuracy'
      },
      { 
        title: 'TOTAL ROLLS', 
        value: stats.totalRolls || 0, 
        color: '#ff6b6b',
        description: 'Predictions Made'
      },
      { 
        title: 'P-VALUE', 
        value: stats.pValue?.toFixed(4) || '0.0000', 
        color: '#ffd93d',
        description: 'Statistical Significance'
      }
    ];
    
    const cardWidth = (width - 120) / 2;
    const cardHeight = 100;
    
    statCards.forEach((card, index) => {
      const x = 60 + (index % 2) * (cardWidth + 20);
      const y = cardsStartY + Math.floor(index / 2) * (cardHeight + 20);
      
      // Card background
      const cardBg = this.add.graphics();
      cardBg.fillStyle(0x2a2a3e, 0.9);
      cardBg.fillRoundedRect(x, y, cardWidth, cardHeight, 10);
      cardBg.lineStyle(2, Phaser.Display.Color.HexStringToColor(card.color).color, 0.8);
      cardBg.strokeRoundedRect(x, y, cardWidth, cardHeight, 10);
      
      // Card title
      const cardTitle = this.add.text(x + cardWidth / 2, y + 20, card.title, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: card.color,
        fontStyle: 'bold'
      }).setOrigin(0.5);
      
      // Card value
      const cardValue = this.add.text(x + cardWidth / 2, y + 45, card.value, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      
      // Card description
      const cardDesc = this.add.text(x + cardWidth / 2, y + 75, card.description, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#c9c9c9'
      }).setOrigin(0.5);
      
      this.scrollContainer.add([cardBg, cardTitle, cardValue, cardDesc]);
    });
    
    this.scrollContainer.add(sectionTitle);
  }

  createPerformanceGraphs() {
    const { width } = this.sys.game.config;
    // Compute start Y dynamically to avoid overlapping with previous section
    const startY = this.nextSectionY(this.SPACING.PERFORMANCE_Y);
    
    // Section title
    const graphTitle = this.add.text(width / 2, startY, 'Performance Trends', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      color: '#00e5ff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Section explainer for trends
    const trendsExplainer = this.add.text(
      width / 2,
      startY + 30,
      'A zoomed-out look at rhythm over time. Accuracy rises and dips as focus and ease shift—use the trend as feedback for practice, not a verdict.',
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        color: '#c9c9c9',
        align: 'center',
        lineSpacing: 8,
        wordWrap: { width: width - 80 }
      }
    ).setOrigin(0.5, 0);
    this.scrollContainer.add(trendsExplainer);
    const trendsBounds = trendsExplainer.getBounds();
    const firstChartY = Math.max(startY + 40, trendsBounds.bottom + 20);
    
    // 7-Day Accuracy Trend
    this.create7DayTrendChart(firstChartY);
    
    // Recent Predictions Chart
    this.createRecentPredictionsChart(firstChartY + 220); // spacing between charts
    
    this.scrollContainer.add(graphTitle);
  }

  create7DayTrendChart(startY) {
    const { width } = this.sys.game.config;
    const chartHeight = 180;
    
    // Chart background
    const chartBg = this.add.graphics();
    chartBg.fillStyle(0x1a1a2e, 0.8);
    chartBg.fillRoundedRect(40, startY, width - 80, chartHeight, 10);
    chartBg.lineStyle(1, 0x444444, 0.5);
    chartBg.strokeRoundedRect(40, startY, width - 80, chartHeight, 10);
    // Add background first so all other elements render above it
    this.scrollContainer.add(chartBg);
    
    // Chart title
    const chartTitle = this.add.text(width / 2, startY + 20, '7-Day Accuracy Trend', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#00bfff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Get trend data
    const trendData = (this.statsTracker && this.statsTracker.getTrendStats) ? 
                      this.statsTracker.getTrendStats() : 
                      this.generateSampleTrendData();
    
    // Draw grid lines
    const gridLines = this.add.graphics();
    gridLines.lineStyle(1, 0x444444, 0.3);
    for (let i = 0; i <= 4; i++) {
      const y = startY + 50 + (i * (chartHeight - 80) / 4);
      gridLines.moveTo(60, y);
      gridLines.lineTo(width - 60, y);
    }
    gridLines.strokePath();
    // Grid lines above background
    this.scrollContainer.add(gridLines);
    
    // Y-axis labels
    const yLabels = ['100%', '75%', '50%', '25%', '0%'];
    yLabels.forEach((label, index) => {
      const y = startY + 50 + (index * (chartHeight - 80) / 4);
      const yLabel = this.add.text(50, y, label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#c9c9c9'
      }).setOrigin(1, 0.5);
      this.scrollContainer.add(yLabel);
    });
    
    // Draw trend line and points
    if (trendData && trendData.length > 0) {
      const chartWidth = width - 140;
      const stepX = chartWidth / (trendData.length - 1);
      
      const line = this.add.graphics();
      line.lineStyle(3, 0x00e5ff, 1);
      
      trendData.forEach((data, index) => {
        const x = 80 + (index * stepX);
        const y = startY + 50 + (chartHeight - 80) - ((data.accuracy / 100) * (chartHeight - 80));
        
        if (index === 0) {
          line.moveTo(x, y);
        } else {
          line.lineTo(x, y);
        }
        
        // Data point
        const point = this.add.graphics();
        point.fillStyle(0x00e5ff, 1);
        point.fillCircle(x, y, 4);
        this.scrollContainer.add(point);
        
        // Day label
        const dayLabel = this.add.text(x, startY + chartHeight - 20, data.label, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '14px',
          color: '#c9c9c9'
        }).setOrigin(0.5);
        this.scrollContainer.add(dayLabel);
      });
      
      line.strokePath();
      // Trend line above grid/background
      this.scrollContainer.add(line);
    }
    // Add title last so it sits above everything
    this.scrollContainer.add(chartTitle);
  }

  createRecentPredictionsChart(startY) {
    const { width } = this.sys.game.config;
    const chartHeight = 120;
    
    // Chart background
    const chartBg = this.add.graphics();
    chartBg.fillStyle(0x1a1a2e, 0.8);
    chartBg.fillRoundedRect(40, startY, width - 80, chartHeight, 10);
    
    // Chart title
    const chartTitle = this.add.text(width / 2, startY + 20, 'Recent Predictions (Last 20)', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#00bfff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Generate sample prediction data
    const predictions = this.generateSamplePredictions();
    const barWidth = (width - 120) / predictions.length;
    
    predictions.forEach((correct, index) => {
      const x = 60 + (index * barWidth);
      const barHeight = 60;
      const color = correct ? 0x00ff88 : 0xff4444;
      
      const bar = this.add.graphics();
      bar.fillStyle(color, 0.8);
      bar.fillRect(x, startY + 40, barWidth - 2, barHeight);
      this.scrollContainer.add(bar);
    });
    
    // Stats
    const correctCount = predictions.filter(p => p).length;
    const accuracy = ((correctCount / predictions.length) * 100).toFixed(1);
    const statsText = this.add.text(width / 2, startY + 110, 
      `${correctCount}/${predictions.length} correct (${accuracy}%)`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    this.scrollContainer.add([chartBg, chartTitle, statsText]);
  }

  createCoherenceScores() {
    const { width } = this.sys.game.config;
    // Compute start Y dynamically to avoid overlapping with previous content
    const startY = this.nextSectionY(this.SPACING.COHERENCE_Y);
    
    // Section title
    const coherenceTitle = this.add.text(width / 2, startY, 'Coherence Scores', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      color: '#00e5ff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Section explainer under coherence title
    const coherenceExplainer = this.add.text(
      width / 2,
      startY + 30,
      'Coherence points to those moments when breath, physiology, and attention fall into sync. Many notice that clarity—and better outcomes—arrive as coherence deepens.',
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        color: '#c9c9c9',
        align: 'center',
        lineSpacing: 8,
        wordWrap: { width: width - 80 }
      }
    ).setOrigin(0.5, 0);
    this.scrollContainer.add(coherenceExplainer);
    const coherenceBounds = coherenceExplainer.getBounds();
    const cardsBaseY = Math.max(startY + this.SPACING.TITLE_OFFSET, coherenceBounds.bottom + 20);
    
    // Get real coherence data from statsTracker (support plain object or StatsTracker instance)
    const rawCoherenceStats = this.statsTracker;
    const stats = (rawCoherenceStats && typeof rawCoherenceStats.getStats === 'function')
      ? rawCoherenceStats.getStats()
      : (rawCoherenceStats || {});
    const totalCoherenceTime = stats.totalCoherenceTime || 0;
    const dailyCoherenceTime = stats.dailyCoherenceTime || 0;
    const breathingSessionsCompleted = stats.breathingSessionsCompleted || 0;
    const dailyBreathingStreak = stats.dailyBreathingStreak || 0;
    
    // Coherence metrics cards
    const coherenceCards = [
      {
        title: 'TOTAL COHERENCE TIME',
        value: `${Math.floor(totalCoherenceTime / 60)}m ${totalCoherenceTime % 60}s`,
        description: 'All time coherence practice',
        color: '#00e5ff'
      },
      {
        title: 'TODAY\'S COHERENCE',
        value: `${Math.floor(dailyCoherenceTime / 60)}m ${dailyCoherenceTime % 60}s`,
        description: 'Daily progress',
        color: '#4caf50'
      },
      {
        title: 'SESSIONS COMPLETED',
        value: breathingSessionsCompleted.toString(),
        description: 'Total training sessions',
        color: '#ffd93d'
      },
      {
        title: 'DAILY STREAK',
        value: dailyBreathingStreak.toString() + ' days',
        description: 'Current streak',
        color: '#ff6b6b'
      }
    ];
    
    const cardWidth = (width - (this.SPACING.CONTENT_PADDING * 2) - this.SPACING.CARD_MARGIN) / 2;
    
    coherenceCards.forEach((card, index) => {
      const x = this.SPACING.CONTENT_PADDING + (index % 2) * (cardWidth + this.SPACING.CARD_MARGIN);
      const y = cardsBaseY + Math.floor(index / 2) * (this.SPACING.CARD_HEIGHT + this.SPACING.CARD_MARGIN);
      
      // Card background
      const cardBg = this.add.graphics();
      cardBg.fillStyle(0x2a2a3e, 0.9);
      cardBg.fillRoundedRect(x, y, cardWidth, this.SPACING.CARD_HEIGHT, 10);
      cardBg.lineStyle(2, Phaser.Display.Color.HexStringToColor(card.color).color, 0.8);
      cardBg.strokeRoundedRect(x, y, cardWidth, this.SPACING.CARD_HEIGHT, 10);
      
      // Card title
      const cardTitle = this.add.text(x + cardWidth / 2, y + 20, card.title, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: card.color,
        fontStyle: 'bold'
      }).setOrigin(0.5);
      
      // Card value
      const cardValue = this.add.text(x + cardWidth / 2, y + 45, card.value, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      
      // Card description
      const cardDesc = this.add.text(x + cardWidth / 2, y + 75, card.description, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#c9c9c9'
      }).setOrigin(0.5);
      
      this.scrollContainer.add([cardBg, cardTitle, cardValue, cardDesc]);
    });
    
    // Coherence trend mini-chart
    this.createCoherenceTrendChart(cardsBaseY + (this.SPACING.CARD_HEIGHT * 2) + (this.SPACING.CARD_MARGIN * 2) + this.SPACING.SUBSECTION_MARGIN);
    
    this.scrollContainer.add(coherenceTitle);
  }

  createCoherenceTrendChart(startY) {
    const { width } = this.sys.game.config;
    const chartHeight = 120;
    
    // Chart background
    const chartBg = this.add.graphics();
    chartBg.fillStyle(0x1a1a2e, 0.8);
    chartBg.fillRoundedRect(40, startY, width - 80, chartHeight, 10);
    chartBg.lineStyle(1, 0x444444, 0.5);
    chartBg.strokeRoundedRect(40, startY, width - 80, chartHeight, 10);
    
    // Chart title
    const chartTitle = this.add.text(width / 2, startY + 15, 'Coherence Trend (Last 7 Days)', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#00bfff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Generate coherence trend data
    const trendData = this.generateCoherenceTrendData();
    
    // Draw trend line
    if (trendData && trendData.length > 0) {
      const chartWidth = width - 140;
      const stepX = chartWidth / (trendData.length - 1);
      
      const line = this.add.graphics();
      line.lineStyle(2, 0x4caf50, 1);
      
      trendData.forEach((data, index) => {
        const x = 70 + (index * stepX);
        const y = startY + 35 + (chartHeight - 60) - (data.coherence * (chartHeight - 60));
        
        if (index === 0) {
          line.moveTo(x, y);
        } else {
          line.lineTo(x, y);
        }
        
        // Data point
        const point = this.add.graphics();
        point.fillStyle(0x4caf50, 1);
        point.fillCircle(x, y, 3);
        this.scrollContainer.add(point);
      });
      
      line.strokePath();
      this.scrollContainer.add(line);
    }
    
    this.scrollContainer.add([chartBg, chartTitle]);
  }

  createBoostStats() {
    const { width } = this.sys.game.config;
    // Compute start Y dynamically to avoid overlapping with previous content
    const startY = this.nextSectionY(this.SPACING.BOOST_Y);
    
    // Section title
    const boostTitle = this.add.text(width / 2, startY, 'Coherence Boost Effects', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      color: '#00e5ff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Explainer text for coherence boost effects (updated tone)
    const explainerText = this.add.text(width / 2, startY + 35, 
      'Coherence training invites your system to settle. As physiology synchronizes, attention steadies—often translating into clearer perception and smoother decision-making.', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#c9c9c9',
      align: 'center',
      lineSpacing: 2,
      wordWrap: { width: width - 80 }
    }).setOrigin(0.5);
    
    // Subtitle
    const subtitle = this.add.text(width / 2, startY + 75, 'How coherence practice affects your intuition', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#c9c9c9',
      fontStyle: 'italic'
    }).setOrigin(0.5);
    
    // Get real stats from statsTracker (support plain object or StatsTracker instance)
    const rawBoostStats = this.statsTracker;
    const stats = (rawBoostStats && typeof rawBoostStats.getStats === 'function')
      ? rawBoostStats.getStats()
      : (rawBoostStats || {});
    const totalCoherenceTime = stats.totalCoherenceTime || 0;
    const breathingSessionsCompleted = stats.breathingSessionsCompleted || 0;
    
    // Calculate boost effects based on coherence practice
    const coherenceHours = totalCoherenceTime / 3600;
    const intuitionBoost = Math.min(25, Math.floor(coherenceHours * 2)); // Max 25% boost
    const focusBoost = Math.min(30, Math.floor(breathingSessionsCompleted * 0.5)); // Max 30% boost
    const stressReduction = Math.min(20, Math.floor(coherenceHours * 1.5)); // Max 20% reduction
    const flowSessions = Math.min(15, Math.floor(breathingSessionsCompleted * 0.3)); // Max 15 flow sessions
    
    // Boost effect cards
    const boostCards = [
      {
        title: 'INTUITION BOOST',
        value: '+' + intuitionBoost + '%',
        description: 'Accuracy improvement',
        color: '#4caf50',
        icon: '🧠'
      },
      {
        title: 'FOCUS ENHANCEMENT',
        value: '+' + focusBoost + '%',
        description: 'Concentration increase',
        color: '#2196f3',
        icon: '🎯'
      },
      {
        title: 'STRESS REDUCTION',
        value: '-' + stressReduction + '%',
        description: 'Anxiety decrease',
        color: '#ff9800',
        icon: '😌'
      },
      {
        title: 'FLOW STATE',
        value: flowSessions.toString(),
        description: 'Sessions in flow',
        color: '#9c27b0',
        icon: '🌊'
      }
    ];
    
     const cardWidth = (width - 120) / 2;
     const cardHeight = 120;
     
     boostCards.forEach((card, index) => {
       const x = 60 + (index % 2) * (cardWidth + 20);
       const y = startY + 120 + Math.floor(index / 2) * (cardHeight + 20); // Adjusted for explainer text
      
      // Card background with gradient effect
      const cardBg = this.add.graphics();
      cardBg.fillGradientStyle(0x2a2a3e, 0x2a2a3e, 0x1a1a2e, 0x1a1a2e, 0.9);
      cardBg.fillRoundedRect(x, y, cardWidth, cardHeight, 10);
      cardBg.lineStyle(2, Phaser.Display.Color.HexStringToColor(card.color).color, 0.8);
      cardBg.strokeRoundedRect(x, y, cardWidth, cardHeight, 10);
      
      // Icon
      const cardIcon = this.add.text(x + cardWidth / 2, y + 25, card.icon, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px'
      }).setOrigin(0.5);
      
      // Card title
      const cardTitle = this.add.text(x + cardWidth / 2, y + 50, card.title, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: card.color,
        fontStyle: 'bold'
      }).setOrigin(0.5);
      
      // Card value
      const cardValue = this.add.text(x + cardWidth / 2, y + 75, card.value, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      
      // Card description
      const cardDesc = this.add.text(x + cardWidth / 2, y + 95, card.description, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#c9c9c9'
      }).setOrigin(0.5);
      
      this.scrollContainer.add([cardBg, cardIcon, cardTitle, cardValue, cardDesc]);
    });
    
    this.scrollContainer.add([boostTitle, explainerText, subtitle]);
  }

  createSenseVsInfluenceStats() {
    const { width } = this.sys.game.config;
    // Compute start Y dynamically to avoid overlapping with previous content
    const startY = this.nextSectionY(this.SPACING.SENSE_INFLUENCE_Y);
    
    // Section title
    const senseTitle = this.add.text(width / 2, startY, 'Sense vs Influence Stats', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '30px',
      color: '#00e5ff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Explainer under Sense vs Influence title
    const svsExplainer = this.add.text(
      width / 2,
      startY + 30,
      'Two ways to play: Sense asks you to notice without pushing. Influence invites a gentle nudge on outcomes. Comparing them reveals how your signal behaves in each mode.',
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: '#c9c9c9',
        align: 'center',
        lineSpacing: 10,
        wordWrap: { width: width - 80 }
      }
    ).setOrigin(0.5, 0);
    this.scrollContainer.add(svsExplainer);
    const svsBounds = svsExplainer.getBounds();
    
    // Get mode comparison data (support plain object or StatsTracker instance)
    let modeComparison;
    const raw = this.statsTracker;
    if (raw && typeof raw.getModeComparison === 'function') {
      modeComparison = raw.getModeComparison();
    } else {
      const s = (raw && typeof raw.getStats === 'function') ? raw.getStats() : (raw || {});
      modeComparison = {
        sense: {
          accuracy: Number(s.senseAccuracy ?? s.accuracy ?? 0),
          pValue: Number(s.sensePValue ?? s.pValue ?? 1.0),
          totalRolls: Number(s.senseRolls ?? s.totalRolls ?? 0),
          bestStreak: Number(s.senseStreak ?? s.bestStreak ?? 0),
          performance: s.sensePerformance || 'Beginner'
        },
        influence: {
          accuracy: Number(s.influenceAccuracy ?? s.accuracy ?? 0),
          pValue: Number(s.influencePValue ?? s.pValue ?? 1.0),
          totalRolls: Number(s.influenceRolls ?? s.totalRolls ?? 0),
          bestStreak: Number(s.influenceStreak ?? s.bestStreak ?? 0),
          performance: s.influencePerformance || 'Beginner'
        },
        recommendation: s.modeRecommendation || 'Practice both modes to discover your strengths'
      };
    }
    
    // Create comparison chart background anchored below explainer
    const chartTopY = Math.max(startY + 50, svsBounds.bottom + 20);
    const chartBg = this.add.graphics();
    chartBg.fillStyle(0x1a1a2e, 0.8);
    chartBg.fillRoundedRect(40, chartTopY, width - 80, 200, 10);
    chartBg.lineStyle(1, 0x444444, 0.5);
    chartBg.strokeRoundedRect(40, chartTopY, width - 80, 200, 10);
    
    // Compute symmetrical centers inside chart background
    const innerLeft = 40;
    const innerRight = width - 40;
    const innerWidth = innerRight - innerLeft; // width - 80
    const leftCenterX = innerLeft + innerWidth * 0.25;
    const rightCenterX = innerLeft + innerWidth * 0.75;
    const baseY = chartTopY + 30;
    
    const senseLabel = this.add.text(leftCenterX, baseY, 'SENSE', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#4caf50',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    const senseAccuracy = this.add.text(leftCenterX, baseY + 30, `${modeComparison.sense.accuracy.toFixed(1)}%`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    const senseAttempts = this.add.text(leftCenterX, baseY + 65, `${modeComparison.sense.totalRolls} attempts`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#c9c9c9'
    }).setOrigin(0.5);
    
    const senseStreak = this.add.text(leftCenterX, baseY + 85, `Best streak: ${modeComparison.sense.bestStreak}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#4caf50'
    }).setOrigin(0.5);
    
    // Influence stats (right side)
    
    const influenceLabel = this.add.text(rightCenterX, baseY, 'INFLUENCE', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#ff6b6b',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    const influenceAccuracy = this.add.text(rightCenterX, baseY + 30, `${modeComparison.influence.accuracy.toFixed(1)}%`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    const influenceAttempts = this.add.text(rightCenterX, baseY + 65, `${modeComparison.influence.totalRolls} attempts`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#c9c9c9'
    }).setOrigin(0.5);
    
    const influenceStreak = this.add.text(rightCenterX, baseY + 85, `Best streak: ${modeComparison.influence.bestStreak}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#ff6b6b'
    }).setOrigin(0.5);
    
    // VS divider
    const vsText = this.add.text(width / 2, chartTopY + 130, 'VS', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      color: '#ffd93d',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Progress bars for comparison
    const barWidth = 120;
    const barHeight = 8;
    
    // Sense progress bar
    const senseProgressBg = this.add.graphics();
    senseProgressBg.fillStyle(0x2a2a3e, 0.8);
    senseProgressBg.fillRoundedRect(leftCenterX - barWidth / 2, baseY + 110, barWidth, barHeight, 4);
    
    const senseProgressFill = this.add.graphics();
    const senseProgressWidth = (modeComparison.sense.accuracy / 100) * barWidth;
    senseProgressFill.fillStyle(0x4caf50, 0.8);
    senseProgressFill.fillRoundedRect(leftCenterX - barWidth / 2, baseY + 110, senseProgressWidth, barHeight, 4);
    
    // Influence progress bar
    const influenceProgressBg = this.add.graphics();
    influenceProgressBg.fillStyle(0x2a2a3e, 0.8);
    influenceProgressBg.fillRoundedRect(rightCenterX - barWidth / 2, baseY + 110, barWidth, barHeight, 4);
    
    const influenceProgressFill = this.add.graphics();
    const influenceProgressWidth = (modeComparison.influence.accuracy / 100) * barWidth;
    influenceProgressFill.fillStyle(0xff6b6b, 0.8);
    influenceProgressFill.fillRoundedRect(rightCenterX - barWidth / 2, baseY + 110, influenceProgressWidth, barHeight, 4);
    
    // Recommendation text
    const recommendationText = this.add.text(width / 2, chartTopY + 230, modeComparison.recommendation, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#ffd93d',
      align: 'center',
      wordWrap: { width: width - 100 }
    }).setOrigin(0.5);
    
    this.scrollContainer.add([
      chartBg, senseTitle, senseLabel, senseAccuracy, senseAttempts, senseStreak,
      influenceLabel, influenceAccuracy, influenceAttempts, influenceStreak, vsText,
      senseProgressBg, senseProgressFill, influenceProgressBg, influenceProgressFill,
      recommendationText
    ]);
  }

  createBadgeAchievements() {
    const { width } = this.sys.game.config;
    // Compute start Y dynamically to avoid overlapping with previous content
    const startY = this.nextSectionY(this.SPACING.ACHIEVEMENTS_Y);
    
    // Section title with proper spacing
    const badgeTitle = this.add.text(width / 2, startY, 'Achievements & Badges', {
      fontFamily: 'Arial, sans-serif',
      fontSize: this.SPACING.TITLE_FONT_SIZE,
      color: '#00e5ff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    this.scrollContainer.add(badgeTitle);

    // Section explainer under achievements title
    const badgesExplainer = this.add.text(
      width / 2,
      startY + 30,
      'Badges mark milestones—evidence of practice, streaks, and breakthroughs. Earning them maps the path your signal is taking through play.',
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: '#c9c9c9',
        align: 'center',
        lineSpacing: 10,
        wordWrap: { width: width - 80 }
      }
    ).setOrigin(0.5, 0);
    this.scrollContainer.add(badgesExplainer);
    const badgesBounds = badgesExplainer.getBounds();
    
    // Sample achievements data
    const gameAchievements = [
      { title: 'First Steps', icon: '👶', unlocked: true, description: 'Complete your first prediction' },
      { title: 'Streak Master', icon: '🔥', unlocked: true, description: 'Maintain a 7-day prediction streak' },
      { title: 'Accuracy Expert', icon: '🎯', unlocked: false, description: 'Achieve 80% accuracy over 30 predictions' },
      { title: 'Quantum Explorer', icon: '🌌', unlocked: true, description: 'Make 100 predictions' },
      { title: 'Coherence Champion', icon: '💎', unlocked: false, description: 'Achieve perfect coherence score' }
    ];
    
    const breathingAwards = [
      { title: 'Zen Beginner', icon: '🧘', unlocked: true, description: 'Complete 10 breathing sessions' },
      { title: 'Mindful Master', icon: '🌸', unlocked: true, description: 'Achieve 90% coherence in breathing' },
      { title: 'Breath Warrior', icon: '⚡', unlocked: false, description: 'Complete 100 breathing sessions' },
      { title: 'Flow State', icon: '🌊', unlocked: false, description: 'Maintain coherence for 10 minutes' }
    ];
    
    // Achievement grid layout
    const achievementSize = this.SPACING.ACHIEVEMENT_SIZE;
    const achievementSpacing = this.SPACING.ACHIEVEMENT_SPACING;
    const achievementsPerRow = Math.floor((width - this.SPACING.SIDE_MARGIN * 2) / (achievementSize + achievementSpacing));
    const gridStartX = (width - (achievementsPerRow * (achievementSize + achievementSpacing) - achievementSpacing)) / 2;
    
    // Game Achievements Section
    const gameAchievementsHeaderY = Math.max(startY + this.SPACING.SECTION_SPACING, badgesBounds.bottom + this.SPACING.SECTION_SPACING);
    const gameAchievementsHeader = this.add.text(width / 2, gameAchievementsHeaderY, 'Game Achievements', {
      fontSize: this.SPACING.SUBTITLE_FONT_SIZE,
      fontFamily: 'Arial, sans-serif',
      color: '#ffd93d',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.scrollContainer.add(gameAchievementsHeader);

    // Base Y below header to anchor the grid and avoid overlap with the title
    const gameHeaderBottom = gameAchievementsHeader.getBounds().bottom;
    const gameBaseY = gameHeaderBottom + this.SPACING.SECTION_SPACING + (achievementSize / 2);
    
    // Display game achievements
    gameAchievements.forEach((achievement, index) => {
      const row = Math.floor(index / achievementsPerRow);
      const col = index % achievementsPerRow;
      const x = gridStartX + (col * (achievementSize + achievementSpacing)) + (achievementSize / 2);
      const y = gameBaseY + (row * (achievementSize + achievementSpacing + 30));
      
      const achievementContainer = this.add.container(x, y);
      
      // Achievement background
      const bg = this.add.graphics();
      if (achievement.unlocked) {
        bg.fillStyle(0x1a2c3d, 0.9);
        bg.lineStyle(3, 0x00e5ff, 1);
      } else {
        bg.fillStyle(0x333333, 0.5);
        bg.lineStyle(2, 0x666666, 0.5);
      }
      bg.fillCircle(0, 0, achievementSize / 2);
      bg.strokeCircle(0, 0, achievementSize / 2);
      
      // Badge icon
      const icon = this.add.text(0, 0, achievement.icon, {
        fontSize: achievement.unlocked ? '24px' : '18px',
        fontFamily: 'Arial, sans-serif',
        color: achievement.unlocked ? '#ffffff' : '#666666'
      }).setOrigin(0.5);
      
      // Achievement title
      const title = this.add.text(0, achievementSize / 2 + 15, achievement.title, {
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        color: achievement.unlocked ? '#ffffff' : '#666666',
        align: 'center',
        wordWrap: { width: achievementSize + 20 }
      }).setOrigin(0.5);
      
      achievementContainer.add([bg, icon, title]);
      
      // Add hover effect for unlocked achievements
      if (achievement.unlocked) {
        achievementContainer.setInteractive(new Phaser.Geom.Circle(0, 0, achievementSize / 2), Phaser.Geom.Circle.Contains);
        achievementContainer.on('pointerover', () => {
          this.showAchievementTooltip(achievement, achievementContainer);
        });
        achievementContainer.on('pointerout', () => {
          this.hideAchievementTooltip();
        });
      }
      
      this.scrollContainer.add(achievementContainer);
    });
    
    // Breathing Awards Section
    // Determine breathing awards header Y based on the measured bottom of last game-achievement row
    const gameRows = Math.ceil(gameAchievements.length / achievementsPerRow);
    const lastGameRowCenterY = gameBaseY + (gameRows - 1) * (achievementSize + achievementSpacing + 30);
    const gameGridBottom = lastGameRowCenterY + (achievementSize / 2) + 24; // padding below the grid
    const breathingAwardsY = gameGridBottom + this.SPACING.SECTION_SPACING;
    
    const breathingAwardsHeader = this.add.text(width / 2, breathingAwardsY, 'Coherence Training Awards', {
      fontSize: this.SPACING.SUBTITLE_FONT_SIZE,
      fontFamily: 'Arial, sans-serif',
      color: '#4a7c59',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    this.scrollContainer.add(breathingAwardsHeader);

    // Base Y below breathing header for the awards grid
    const breathingHeaderBottom = breathingAwardsHeader.getBounds().bottom;
    const breathingBaseY = breathingHeaderBottom + this.SPACING.SECTION_SPACING + (achievementSize / 2);
    
    // Display breathing awards
    breathingAwards.forEach((award, index) => {
      const row = Math.floor(index / achievementsPerRow);
      const col = index % achievementsPerRow;
      const x = gridStartX + (col * (achievementSize + achievementSpacing)) + (achievementSize / 2);
      const y = breathingBaseY + (row * (achievementSize + achievementSpacing + 30));
      
      const awardContainer = this.add.container(x, y);
      
      // Award background
      const bg = this.add.graphics();
      if (award.unlocked) {
        bg.fillStyle(0x1a2c3d, 0.9);
        bg.lineStyle(3, 0x4a7c59, 1);
      } else {
        bg.fillStyle(0x333333, 0.5);
        bg.lineStyle(2, 0x666666, 0.5);
      }
      bg.fillCircle(0, 0, achievementSize / 2);
      bg.strokeCircle(0, 0, achievementSize / 2);
      
      // Award icon
      const icon = this.add.text(0, 0, award.icon, {
        fontSize: award.unlocked ? '24px' : '18px',
        fontFamily: 'Arial, sans-serif',
        color: award.unlocked ? '#ffffff' : '#666666'
      }).setOrigin(0.5);
      
      // Award title
      const title = this.add.text(0, achievementSize / 2 + 15, award.title, {
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        color: award.unlocked ? '#ffffff' : '#666666',
        align: 'center',
        wordWrap: { width: achievementSize + 20 }
      }).setOrigin(0.5);
      
      awardContainer.add([bg, icon, title]);
      
      // Add hover effect for unlocked awards
      if (award.unlocked) {
        awardContainer.setInteractive(new Phaser.Geom.Circle(0, 0, achievementSize / 2), Phaser.Geom.Circle.Contains);
        awardContainer.on('pointerover', () => {
          this.showAchievementTooltip(award, awardContainer);
        });
        awardContainer.on('pointerout', () => {
          this.hideAchievementTooltip();
        });
      }
      
      this.scrollContainer.add(awardContainer);
    });
    
    // Summary stats
    const unlockedGameAchievements = gameAchievements.filter(a => a.unlocked).length;
    const unlockedBreathingAwards = breathingAwards.filter(a => a.unlocked).length;
    const totalUnlocked = unlockedGameAchievements + unlockedBreathingAwards;
    const totalAchievements = gameAchievements.length + breathingAwards.length;
    
    const breathingRows = Math.ceil(breathingAwards.length / achievementsPerRow);
    const lastBreathingRowCenterY = breathingBaseY + (breathingRows - 1) * (achievementSize + achievementSpacing + 30);
    const breathingGridBottom = lastBreathingRowCenterY + (achievementSize / 2) + 24; // padding
    const summaryY = breathingGridBottom + this.SPACING.SECTION_SPACING;
    
    const summaryText = this.add.text(width / 2, summaryY, 
      `Achievements Unlocked: ${totalUnlocked}/${totalAchievements} (${Math.round((totalUnlocked / totalAchievements) * 100)}%)`, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffd93d',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    this.scrollContainer.add(summaryText);

    // Record bottom Y of achievements section for downstream layout
    this.achievementsBottomY = summaryY + this.SPACING.SECTION_SPACING;
  }
  
  showAchievementTooltip(achievement, container) {
    // Simple tooltip implementation
    if (this.achievementTooltip) {
      this.achievementTooltip.destroy();
    }
    
    const tooltipBg = this.add.graphics();
    tooltipBg.fillStyle(0x000000, 0.9);
    tooltipBg.fillRoundedRect(-100, -40, 200, 60, 8);
    tooltipBg.lineStyle(2, 0x00e5ff, 1);
    tooltipBg.strokeRoundedRect(-100, -40, 200, 60, 8);
    
    const tooltipText = this.add.text(0, -10, achievement.description, {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 180 }
    }).setOrigin(0.5);
    
    this.achievementTooltip = this.add.container(container.x, container.y - 80);
    this.achievementTooltip.add([tooltipBg, tooltipText]);
    this.achievementTooltip.setDepth(1000);
  }
  
  hideAchievementTooltip() {
    if (this.achievementTooltip) {
      this.achievementTooltip.destroy();
      this.achievementTooltip = null;
    }
  }

  // Data generation methods
  createAchievementSummary() {
    const { width } = this.sys.game.config;
    const startY = 1080; // Increased spacing from performance graphs
    
    // Section title
    const achievementTitle = this.add.text(width / 2, startY, 'Achievement Progress', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      color: '#00e5ff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Get real achievement data
    const gameAchievements = this.statsTracker?.getAllAchievements() || [];
    const breathingAwards = this.statsTracker?.getAllBreathingAwards() || [];
    const totalAchievements = gameAchievements.length + breathingAwards.length;
    const unlockedCount = gameAchievements.filter(a => a.unlocked).length + breathingAwards.filter(a => a.unlocked).length;
    
    // Progress bar background
    const progressBg = this.add.graphics();
    progressBg.fillStyle(0x2a2a3e, 0.8);
    progressBg.fillRoundedRect(60, startY + 40, width - 120, 30, 15);
    
    // Progress bar fill
    const progressFill = this.add.graphics();
    const progressWidth = totalAchievements > 0 ? ((unlockedCount / totalAchievements) * (width - 120)) : 0;
    progressFill.fillStyle(0x00e5ff, 0.8);
    progressFill.fillRoundedRect(60, startY + 40, progressWidth, 30, 15);
    
    // Progress text
    const progressText = this.add.text(width / 2, startY + 55, 
      `${unlockedCount}/${totalAchievements} Achievements Unlocked`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Recent achievements (show unlocked ones)
    const unlockedAchievements = [...gameAchievements.filter(a => a.unlocked), ...breathingAwards.filter(a => a.unlocked)];
    if (unlockedAchievements.length > 0) {
      const recentTitle = this.add.text(width / 2, startY + 90, 'Recent Achievements:', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#ffd93d',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      
      // Show last 3 achievements
      const recentAchievements = unlockedAchievements.slice(-3);
      recentAchievements.forEach((achievement, index) => {
        const achievementText = this.add.text(width / 2, startY + 120 + (index * 25), 
          `${achievement.icon} ${achievement.title}`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '14px',
          color: '#c9c9c9'
        }).setOrigin(0.5);
        this.scrollContainer.add(achievementText);
      });
      
      this.scrollContainer.add(recentTitle);
    }
    
    this.scrollContainer.add([achievementTitle, progressBg, progressFill, progressText]);
    
    // Update max scroll - calculate total content height properly
    this.maxScrollY = startY + 250; // Increased to account for all content
  }

  createBackButton() {
    const { width, height } = this.sys.game.config;
    
    // Back button
    const backButton = this.add.text(60, height - 60, '← Back to Game', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#00e5ff',
      backgroundColor: '#2d0b4b',
      padding: { x: 20, y: 10 }
    }).setInteractive({ useHandCursor: true });
    
    backButton.on('pointerover', () => {
      this.tweens.add({ 
        targets: backButton, 
        scale: 1.05, 
        duration: 200, 
        ease: 'Sine.easeOut' 
      });
    });
    
    backButton.on('pointerout', () => {
      this.tweens.add({ 
        targets: backButton, 
        scale: 1, 
        duration: 200, 
        ease: 'Sine.easeIn' 
      });
    });
    
    backButton.on('pointerdown', () => {
      this.tweens.add({ 
        targets: backButton, 
        scale: 0.95, 
        duration: 100, 
        ease: 'Sine.easeIn', 
        yoyo: true, 
        onComplete: () => {
          this.scene.start(this.returnScene);
        }
      });
    });
    
    // Keep back button fixed (not in scroll container)
    this.mainContainer.add(backButton);
  }

  setupScrolling() {
    const { width, height } = this.sys.game.config;
    // Dynamically account for sticky header area
    const headerHeight = typeof this._headerHeight === 'number' && this._headerHeight > 0
      ? this._headerHeight
      : 160; // fallback
    const backButtonHeight = 80; // Account for back button space
    const visibleHeight = height - (headerHeight + backButtonHeight);
    // Prefer dynamically measured height; fallback to previously computed
    const contentHeight = this.contentHeight || this.getScrollContentHeight();

    console.log('=== Scroll Setup Debug ===');
    console.log('Game height:', height);
    console.log('Header height:', headerHeight);
    console.log('Back button height:', backButtonHeight);
    console.log('Visible height:', visibleHeight);
    console.log('Content height:', contentHeight);
    console.log('Should scroll:', contentHeight > visibleHeight);
    console.log('ScrollContainer exists:', !!this.scrollContainer);
    console.log('ScrollContainer children:', this.scrollContainer?.list?.length || 0);

    // Reset scroll setup flag to allow re-setup if needed
    if (this._scrollSetup) {
      console.log('Scroll already setup, cleaning up first...');
      // Clean up existing handlers
      if (this._inputWheelRegistered && this.statsScrollHandler) {
        this.input.off('wheel', this.statsScrollHandler);
        this._inputWheelRegistered = false;
      }
      const canvas = this.sys?.game?.canvas;
      if (canvas && this._canvasWheelRegistered && this._canvasWheelHandler) {
        canvas.removeEventListener('wheel', this._canvasWheelHandler);
        this._canvasWheelRegistered = false;
        this._canvasWheelHandler = null;
      }
    }
    this._scrollSetup = true;

    if (contentHeight > visibleHeight) {
      console.log('Setting up scrolling...');
      
      // Mask the scrollable content to the visible area
      const maskGraphics = this.make.graphics();
      maskGraphics.fillStyle(0xffffff, 1);
      maskGraphics.fillRect(0, headerHeight, width, visibleHeight);
      this.scrollContainer.mask = new Phaser.Display.Masks.GeometryMask(this, maskGraphics);

      // Create bounded scroll zone for touch/drag scrolling
      const scrollZone = this.add.zone(
        width / 2,
        headerHeight + visibleHeight / 2,
        width,
        visibleHeight
      ).setInteractive({ draggable: true });
      scrollZone.setDepth(50);

      let isDragging = false;
      let startY = 0;
      let startContainerY = 0;

      scrollZone.on('pointerdown', (pointer) => {
        console.log('Scroll zone pointer down');
        // prevent clicks from leaking to elements behind the scroll zone
        pointer.event?.stopPropagation?.();
      });

      scrollZone.on('dragstart', (pointer) => {
        console.log('Drag start');
        isDragging = true;
        startY = pointer.y;
        startContainerY = this.scrollContainer.y;
      });

      scrollZone.on('drag', (pointer) => {
        if (isDragging) {
          const deltaY = pointer.y - startY;
          const newY = startContainerY + deltaY;
          // Use the calculated content height for consistent bounds
          const totalHeight = this.contentHeight || this.getScrollContentHeight();
          const minY = -(totalHeight - visibleHeight);
          const maxY = 0;

          const clampedY = Phaser.Math.Clamp(newY, minY, maxY);
          this.scrollContainer.setY(clampedY);
          console.log('Dragging - newY:', clampedY, 'bounds:', minY, 'to', maxY);
        }
      });

      scrollZone.on('dragend', () => {
        console.log('Drag end');
        isDragging = false;
      });

      // Mouse wheel support — route through WheelEventManager for consistency
      this.statsScrollHandler = (pointer, gameObjects, deltaX, deltaY) => {
        console.log('Wheel scroll - deltaY:', deltaY);
        // Prevent the browser/page from scrolling instead of our canvas
        try {
          pointer?.event?.preventDefault?.();
          pointer?.event?.stopPropagation?.();
        } catch (_) {}
        const scrollSpeed = 50; // significantly faster wheel scrolling for better feel
        const currentY = this.scrollContainer.y;
        // Use the calculated content height
        const totalHeight = this.contentHeight || this.getScrollContentHeight();
        const minY = -(totalHeight - visibleHeight);
        const maxY = 0;
        // Always respond to wheel events (consistent with Game/Leaderboard pages)

        const newY = Phaser.Math.Clamp(currentY - (deltaY * scrollSpeed / 100), minY, maxY);
        this.scrollContainer.setY(newY);
        console.log('Wheel scroll - newY:', newY, 'bounds:', minY, 'to', maxY);
      };
      
      // Register with the scene's WheelEventManager to avoid conflicts
      if (this.wheelEventManager) {
        this.wheelEventManager.unregisterHandler('statsScroll');
        this.wheelEventManager.registerHandler('statsScroll', this.statsScrollHandler, this);
      }
      
      console.log('Scrolling setup complete');
    } else {
      console.log('Content fits in visible area, no scrolling needed');
    }
  }
  
  destroy() {
    // Unregister wheel handler via WheelEventManager
    if (this.wheelEventManager) {
      this.wheelEventManager.unregisterHandler('statsScroll');
      this.wheelEventManager.removeMasterHandler();
    }
    super.destroy();
  }

  generateSampleTrendData() {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(day => ({
      label: day,
      accuracy: Math.random() * 40 + 30 // 30-70% range
    }));
  }

  generateSamplePredictions() {
    const predictions = [];
    for (let i = 0; i < 20; i++) {
      predictions.push(Math.random() > 0.45); // 55% success rate
    }
    return predictions;
  }

  generateCoherenceTrendData() {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(day => ({
      label: day,
      coherence: Math.random() * 0.8 + 0.2 // 0.2-1.0 range for coherence scores
    }));
  }
}