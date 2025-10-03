export class StatsTracker {
  constructor(scene, uiCallbacks) {
    this.scene = scene;
    this.uiCallbacks = uiCallbacks || {};
    // Prefer Q-Score calculator if available; fallback to Zen Score for compatibility
    this.qScoreCalculator = (scene.calculateQScore || scene.calculateZenScore).bind(scene);
    this.stats = {
      totalRolls: 0,
      correctPredictions: 0,
      accuracy: 0,
      pValue: 1.0,
      currentStreak: 0,
      bestStreak: 0,
      wrongStreak: 0,
      zenScore: 0,
      qScore: 0,
      divinePower: 0, // 0 to 100 - We can keep this for the side meter
      psychicLevel: 1, // Renamed from divineLevel, starts at 1
      levelProgress: 0, // Progress to the next level (0-2)
      streakShields: 0, // New reward for breathing exercise
      shieldsEarned: 0, // Track total shields earned for difficulty scaling
      // Session tracking
      sessionRolls: 0,
      sessionCorrect: 0,
      sessionStartTime: Date.now(),
      // Recent predictions for graph (last 20)
      recentPredictions: [],
      // Achievement tracking
      achievements: {},
      // Historical data for trends
      dailyStats: {},
      // Quantum Score tracking for all-time graph
      quantumScoreHistory: [],
      // Stats per psychic level
      levelStats: {},
      // Daily Check-in
      lastCheckIn: null,
      dailyCheckInStreak: 0,
      unclaimedRewards: [],
      // Breathing exercise stats
      breathingSessionsCompleted: 0,
      dailyBreathingStreak: 0,
      lastBreathingSessionDate: null,
      dailyCoherenceTime: 0,
      lastCoherenceSessionDate: null,
      breathingAwards: {},
      totalCoherenceTime: 0,
      recentBreathingSessions: [],
      // Separate tracking for Sense vs Influence modes
      senseMode: {
        totalRolls: 0,
        correctPredictions: 0,
        accuracy: 0,
        pValue: 1.0,
        currentStreak: 0,
        bestStreak: 0,
        recentPredictions: []
      },
      influenceMode: {
        totalRolls: 0,
        correctPredictions: 0,
        accuracy: 0,
        pValue: 1.0,
        currentStreak: 0,
        bestStreak: 0,
        recentPredictions: []
      }
    };
    this.statElements = [];
    this.isPanelOpen = false;
    this.loadStats();
    // Ensure level is at least 1 on load
    if (this.stats.psychicLevel < 1) {
      this.stats.psychicLevel = 1;
    }
  }
  createStatCard(x, y, title, value, subtitle) {
    const cardWidth = 280;
    const cardHeight = 110;
    
    const card = this.scene.add.graphics();
    card.fillStyle(0x1a2c3d, 0.6);
    card.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 16);
    card.lineStyle(1.5, 0x00bfff, 0.7);
    card.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 16);
    
    const valueText = this.scene.add.text(0, -20, value, {
      fontFamily: '"Arial Black", Arial, sans-serif',
      fontSize: '32px',
      fill: '#00e5ff',
      align: 'center',
    }).setOrigin(0.5);
    const titleText = this.scene.add.text(0, 15, title, {
      fontSize: '16px',
      fill: '#d3d3d3',
      align: 'center',
    }).setOrigin(0.5);
    
    const subtitleText = this.scene.add.text(0, 35, subtitle, {
      fontSize: '18px',
      fill: '#a9a9a9',
      align: 'center',
    }).setOrigin(0.5);
    const container = this.scene.add.container(x, y, [card, valueText, titleText, subtitleText]);
    container.valueText = valueText;
    container.setDepth(201);
    
    return container;
  }
  addResult(prediction, actual, isCorrect) {
    const currentMode = this.scene.gameMode; // 'sense' or 'influence'
    const modeStats = currentMode === 'sense' ? this.stats.senseMode : this.stats.influenceMode;
    
    // Update overall stats
    this.stats.totalRolls++;
    this.stats.sessionRolls++;
    
    // Initialize per-level stats if not present
    const levelKey = `level_${this.scene.currentActiveLevel}`;
    if (!this.stats.levelStats[levelKey]) {
        this.stats.levelStats[levelKey] = { predictions: 0, correct: 0, bestStreak: 0, currentStreak: 0 };
    }
    this.stats.levelStats[levelKey].predictions++;
    
    // Update mode-specific stats
    modeStats.totalRolls++;
    
    // Store recent prediction for graph (overall)
    const predictionData = {
      prediction,
      actual,
      isCorrect,
      timestamp: Date.now(),
      mode: currentMode
    };
    
    this.stats.recentPredictions.push(predictionData);
    modeStats.recentPredictions.push(predictionData);
    
    // Keep only last 20 predictions for each
    if (this.stats.recentPredictions.length > 20) {
      this.stats.recentPredictions.shift();
    }
    if (modeStats.recentPredictions.length > 20) {
      modeStats.recentPredictions.shift();
    }
    
    if (isCorrect) {
      // Update overall stats
      this.stats.correctPredictions++;
      this.stats.sessionCorrect++;
      this.stats.currentStreak++;
      this.stats.bestStreak = Math.max(this.stats.bestStreak, this.stats.currentStreak);
      this.stats.wrongStreak = 0;
      
      // Update per-level stats on correct
      this.stats.levelStats[levelKey].correct++;
      this.stats.levelStats[levelKey].currentStreak++;
      this.stats.levelStats[levelKey].bestStreak = Math.max(
        this.stats.levelStats[levelKey].bestStreak,
        this.stats.levelStats[levelKey].currentStreak
      );
      
      // Update mode-specific stats
      modeStats.correctPredictions++;
      modeStats.currentStreak++;
      modeStats.bestStreak = Math.max(modeStats.bestStreak, modeStats.currentStreak);
      
      // Every correct answer increases level progress (feedback-centric)
      this.stats.levelProgress++;
      
      // Update divine power in thirds (33.33% per correct prediction)
      this.stats.divinePower = Math.min(100, (this.stats.levelProgress / 3) * 100);
      
      // Check for level up when reaching 3 correct predictions
      if (this.stats.levelProgress >= 3) {
        const currentPlayingLevel = this.scene.currentActiveLevel;
        const nextLevel = currentPlayingLevel + 1;
        
        // Check if we can unlock a new level
        if (nextLevel <= 5 && nextLevel > this.stats.psychicLevel) {
          // Unlock new level with full screen animation
          this.stats.psychicLevel = nextLevel;
          this.stats.levelProgress = 0;
          this.stats.divinePower = 0;
        } else {
          // Already unlocked this level or at max level - give coherence progress instead
          this.stats.levelProgress = 0;
          this.stats.divinePower = 0;
          
          // Add 1/3 to coherence meter (33.33%)
          this.scene.time.delayedCall(500, () => {
            this.scene.addCoherenceProgress(33.33);
          });
        }
      }
    } else {
      if (this.stats.streakShields > 0) {
        // Use a shield instead of losing streak
        this.useStreakShield();
        // The scene will show a special animation for shield breaking.
        if (this.uiCallbacks.showShieldBreakEffect) {
          this.uiCallbacks.showShieldBreakEffect();
        }
        // Even with a shield, divine power decreases, but maybe less
        this.stats.divinePower = Math.max(0, (this.stats.divinePower || 0) - 5);
      } else {
        this.stats.currentStreak = 0;
        this.stats.wrongStreak++;
        
        // Reset per-level streak on wrong
        this.stats.levelStats[levelKey].currentStreak = 0;
        this.stats.levelProgress = 0; // Reset progress on wrong answer
        this.stats.divinePower = 0; // Reset divine power completely on wrong answer
        
        // Reset mode-specific streak as well
        modeStats.currentStreak = 0;
      }
    }
    
    // Update overall accuracy
    this.stats.accuracy = this.stats.totalRolls > 0 ?
      (this.stats.correctPredictions / this.stats.totalRolls * 100) : 0;
    
    // Update mode-specific accuracy
    modeStats.accuracy = modeStats.totalRolls > 0 ?
      (modeStats.correctPredictions / modeStats.totalRolls * 100) : 0;
    
    // Calculate p-values
    this.calculatePValue();
    this.calculateModePValue(modeStats);
    
    // Check achievements
    this.checkAchievements();
    
    // Update daily stats
    this.updateDailyStats();
    // Recalculate Q-Score (formerly Zen Score)
    this.stats.qScore = this.qScoreCalculator(this.stats);
    this.stats.zenScore = this.stats.qScore; // mirror for backward compatibility
    
    // Track quantum score history for graphing
    this.updateQuantumScoreHistory();
    
    this.saveStats();
    this.updateLeaderboard();
  }
getStats() {
  return this.stats;
}
calculatePValue() {
  if (this.stats.totalRolls === 0) {
    this.stats.pValue = 1.0;
    return;
  }
  const n = this.stats.totalRolls;
  const k = this.stats.correctPredictions;
  const numOptions = Math.min(6, this.scene.currentActiveLevel + 1);
  const p = 1 / numOptions;
  // We are testing if the user is performing better than chance (one-tailed test).
  // Calculate P(X >= k), which is the probability of getting k or more successes.
  let cumulativeProbability = 0;
  for (let i = k; i <= n; i++) {
    const prob = this.binomialProbability(n, i, p);
    cumulativeProbability += prob;
  }
  
  // Set the pValue, with a floor of 0.001 for display purposes
  this.stats.pValue = Math.max(0.001, cumulativeProbability);
}
calculateModePValue(modeStats) {
  if (modeStats.totalRolls === 0) {
    modeStats.pValue = 1.0;
    return;
  }
  const n = modeStats.totalRolls;
  const k = modeStats.correctPredictions;
  const numOptions = Math.min(6, this.scene.currentActiveLevel + 1);
  const p = 1 / numOptions;
  
  let cumulativeProbability = 0;
  for (let i = k; i <= n; i++) {
    const prob = this.binomialProbability(n, i, p);
    cumulativeProbability += prob;
  }
  
  modeStats.pValue = Math.max(0.001, cumulativeProbability);
}
// Binomial Probability Mass Function: P(X=k)
binomialProbability(n, k, p) {
    if (k < 0 || k > n) {
        return 0;
    }
    // Using log to prevent underflow/overflow with large numbers
    const logBinomialCoeff = this.logGamma(n + 1) - this.logGamma(k + 1) - this.logGamma(n - k + 1);
    const logProb = logBinomialCoeff + k * Math.log(p) + (n - k) * Math.log(1 - p);
    return Math.exp(logProb);
}
// Log-gamma function for stable binomial coefficient calculation
logGamma(n) {
    // Lanczos approximation for the gamma function
    const g = 7;
    const p = [
        0.99999999999980993, 
        676.5203681218851, 
        -1259.1392167224028, 
        771.32342877765313, 
        -176.61502916214059, 
        12.507343278686905, 
        -0.13857109526572012, 
        9.9843695780195716e-6, 
        1.5056327351493116e-7
    ];
    if (n < 0.5) {
        return Math.log(Math.PI / (Math.sin(Math.PI * n) * this.gamma(1 - n)));
    }
    n -= 1;
    let x = p[0];
    for (let i = 1; i < g + 2; i++) {
        x += p[i] / (n + i);
    }
    const t = n + g + 0.5;
    return (n + 0.5) * Math.log(t) - t + Math.log(Math.sqrt(2 * Math.PI) * x);
}
gamma(n) {
    return Math.exp(this.logGamma(n));
}
  loadStats() {
    try {
        const savedStats = localStorage.getItem('divineSenseGameStats');
        if (savedStats) {
            const parsedStats = JSON.parse(savedStats);
            // Merge saved stats with defaults to prevent issues if format changes
            this.stats = { ...this.stats, ...parsedStats };
            
            // Recalculate Q-Score on load to ensure it's up to date with any formula changes
            if (typeof this.stats.qScore !== 'number' && typeof this.stats.zenScore === 'number') {
              this.stats.qScore = this.stats.zenScore;
            }
            this.stats.qScore = this.qScoreCalculator(this.stats);
            this.stats.zenScore = this.stats.qScore;
            // Ensure psychicLevel is at least 1
            if (!this.stats.psychicLevel || this.stats.psychicLevel < 1) {
              this.stats.psychicLevel = 1;
            }
            if (!this.stats.breathingSessionsCompleted) this.stats.breathingSessionsCompleted = 0;
            if (!this.stats.dailyBreathingStreak) this.stats.dailyBreathingStreak = 0;
            if (!this.stats.lastBreathingSessionDate) this.stats.lastBreathingSessionDate = null;
            if (!this.stats.streakShields) this.stats.streakShields = 0;
            if (!this.stats.shieldsEarned) this.stats.shieldsEarned = 0;
            if (!this.stats.breathingAwards) this.stats.breathingAwards = {};
            if (!this.stats.dailyCoherenceTime) this.stats.dailyCoherenceTime = 0;
            if (!this.stats.lastCoherenceSessionDate) this.stats.lastCoherenceSessionDate = null;
            if (!this.stats.totalCoherenceTime) this.stats.totalCoherenceTime = 0;
            if (!this.stats.recentBreathingSessions) this.stats.recentBreathingSessions = [];
            if (!this.stats.quantumScoreHistory) this.stats.quantumScoreHistory = [];
            if (!this.stats.levelStats) this.stats.levelStats = {};
            
            // Initialize daily check-in stats if they don't exist
            if (!this.stats.lastCheckIn) this.stats.lastCheckIn = null;
            if (!this.stats.dailyCheckInStreak) this.stats.dailyCheckInStreak = 0;
            if (!this.stats.unclaimedRewards) this.stats.unclaimedRewards = [];
            
            // Initialize mode-specific stats if they don't exist
            if (!this.stats.senseMode) {
              this.stats.senseMode = {
                totalRolls: 0,
                correctPredictions: 0,
                accuracy: 0,
                pValue: 1.0,
                currentStreak: 0,
                bestStreak: 0,
                recentPredictions: []
              };
            }
            if (!this.stats.influenceMode) {
              this.stats.influenceMode = {
                totalRolls: 0,
                correctPredictions: 0,
                accuracy: 0,
                pValue: 1.0,
                currentStreak: 0,
                bestStreak: 0,
                recentPredictions: []
              };
            }
            
            // Reset daily coherence if it's a new day
            const today = new Date().toDateString();
            if (this.stats.lastCoherenceSessionDate && this.stats.lastCoherenceSessionDate !== today) {
              this.stats.dailyCoherenceTime = 0;
            }
        }
    } catch (e) {
        console.error('Could not load game stats, using defaults.', e);
    }
  }
  saveStats() {
    try {
        localStorage.setItem('divineSenseGameStats', JSON.stringify(this.stats));
    } catch(e) {
        console.error('Could not save game stats.', e);
    }
  }

  performDailyCheckIn() {
    const today = new Date().toDateString();
    const lastCheckIn = this.stats.lastCheckIn ? new Date(this.stats.lastCheckIn).toDateString() : null;

    if (today === lastCheckIn) {
      console.log("Already checked in today.");
      return; // Already checked in today
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toDateString();

    if (lastCheckIn === yesterdayString) {
      // Consecutive check-in
      this.stats.dailyCheckInStreak++;
    } else {
      // Streak is broken
      this.stats.dailyCheckInStreak = 1;
    }

    this.stats.lastCheckIn = new Date().toISOString();

    // Determine reward
    const streak = this.stats.dailyCheckInStreak;
    let reward = {};

    if (streak > 0 && streak % 7 === 0) {
      // Every 7th day, grant a streak shield
      reward = { type: 'shield', quantity: 1, day: streak % 7 || 7 };
    } else {
      // Other days, grant coherence points
      const coherenceAmount = 10 + (streak % 7) * 5; // e.g., Day 1 = 15, Day 2 = 20, ... Day 6 = 40
      reward = { type: 'coherence', quantity: coherenceAmount, day: streak % 7 };
    }

    // Add to unclaimed rewards
    if (!this.stats.unclaimedRewards) {
      this.stats.unclaimedRewards = [];
    }
    this.stats.unclaimedRewards.push(reward);

    this.saveStats();
  }

  claimNextReward() {
    if (!this.stats.unclaimedRewards || this.stats.unclaimedRewards.length === 0) {
      return null;
    }

    const reward = this.stats.unclaimedRewards.shift(); // Get the oldest reward

    if (reward.type === 'shield') {
      this.grantStreakShield();
      if (this.uiCallbacks.showRewardNotification) {
        this.uiCallbacks.showRewardNotification('Daily Reward!', `You earned a Streak Shield!`, '🛡️');
      }
    } else if (reward.type === 'coherence') {
      this.scene.addCoherenceProgress(reward.quantity);
      if (this.uiCallbacks.showRewardNotification) {
        this.uiCallbacks.showRewardNotification('Daily Reward!', `You earned ${reward.quantity} Coherence!`, '🌀');
      }
    }

    this.saveStats();
    return reward;
  }

  checkAchievements() {
    const newAchievements = [];
    
    // First prediction
    if (this.stats.totalRolls === 1 && !this.stats.achievements.firstPrediction) {
      this.stats.achievements.firstPrediction = true;
      newAchievements.push({
        id: 'firstPrediction',
        title: 'First Vision',
        description: 'Made your first psychic prediction',
        icon: '🔮'
      });
    }
    
    // Perfect streak achievements
    if (this.stats.currentStreak === 3 && !this.stats.achievements.streak3) {
      this.stats.achievements.streak3 = true;
      newAchievements.push({
        id: 'streak3',
        title: 'Triple Sight',
        description: 'Achieved a 3-prediction streak',
        icon: '🔥'
      });
    }
    
    if (this.stats.currentStreak === 5 && !this.stats.achievements.streak5) {
      this.stats.achievements.streak5 = true;
      newAchievements.push({
        id: 'streak5',
        title: 'Mystic Flow',
        description: 'Achieved a 5-prediction streak',
        icon: '⚡'
      });
    }
    
    if (this.stats.currentStreak === 10 && !this.stats.achievements.streak10) {
      this.stats.achievements.streak10 = true;
      newAchievements.push({
        id: 'streak10',
        title: 'Oracle\'s Vision',
        description: 'Achieved a 10-prediction streak',
        icon: '🌟'
      });
    }
    
    // Milestone achievements
    if (this.stats.totalRolls === 100 && !this.stats.achievements.hundred) {
      this.stats.achievements.hundred = true;
      newAchievements.push({
        id: 'hundred',
        title: 'Century Seer',
        description: 'Made 100 predictions',
        icon: '💯'
      });
    }
    
    if (this.stats.totalRolls === 500 && !this.stats.achievements.fiveHundred) {
      this.stats.achievements.fiveHundred = true;
      newAchievements.push({
        id: 'fiveHundred',
        title: 'Devoted Practitioner',
        description: 'Made 500 predictions',
        icon: '🏆'
      });
    }
    
    // Level achievements
    if (this.stats.psychicLevel === 5 && !this.stats.achievements.masterLevel) {
      this.stats.achievements.masterLevel = true;
      newAchievements.push({
        id: 'masterLevel',
        title: 'Psychic Master',
        description: 'Reached maximum psychic level',
        icon: '👑'
      });
    }
    
    // Accuracy achievements
    if (this.stats.accuracy >= 50 && this.stats.totalRolls >= 20 && !this.stats.achievements.accurate) {
      this.stats.achievements.accurate = true;
      newAchievements.push({
        id: 'accurate',
        title: 'Beyond Chance',
        description: 'Achieved 50%+ accuracy',
        icon: '🎯'
      });
    }
    
    // P-value achievement
    if (this.stats.pValue < 0.05 && !this.stats.achievements.significant) {
      this.stats.achievements.significant = true;
      newAchievements.push({
        id: 'significant',
        title: 'Statistically Significant',
        description: 'Achieved p-value < 0.05',
        icon: '📊'
      });
    }
    
    return newAchievements;
  }
  
  updateDailyStats() {
    const today = new Date().toDateString();
    if (!this.stats.dailyStats) {
      this.stats.dailyStats = {};
    }
    if (!this.stats.dailyStats[today]) {
      this.stats.dailyStats[today] = {
        rolls: 0,
        correct: 0,
        bestStreak: 0
      };
    }
    
    this.stats.dailyStats[today].rolls++;
    if (this.stats.recentPredictions[this.stats.recentPredictions.length - 1]?.isCorrect) {
      this.stats.dailyStats[today].correct++;
    }
    this.stats.dailyStats[today].bestStreak = Math.max(
      this.stats.dailyStats[today].bestStreak,
      this.stats.currentStreak
    );
  }
  
  updateQuantumScoreHistory() {
    const today = new Date().toDateString();
    const currentScore = Math.round((this.stats.qScore ?? this.stats.zenScore) || 0);
    
    // Initialize history if it doesn't exist
    if (!this.stats.quantumScoreHistory) {
      this.stats.quantumScoreHistory = [];
    }
    
    // Check if we already have an entry for today
    const existingEntryIndex = this.stats.quantumScoreHistory.findIndex(entry => entry.date === today);
    
    if (existingEntryIndex !== -1) {
      // Update existing entry with the latest score
      this.stats.quantumScoreHistory[existingEntryIndex].score = currentScore;
    } else {
      // Add new entry
      this.stats.quantumScoreHistory.push({
        date: today,
        score: currentScore,
        timestamp: Date.now()
      });
    }
    
    // Keep only the last 30 days of history
    if (this.stats.quantumScoreHistory.length > 30) {
      this.stats.quantumScoreHistory = this.stats.quantumScoreHistory.slice(-30);
    }
  }
  
  getQuantumScoreHistory() {
    return this.stats.quantumScoreHistory || [];
  }
  getTrendStats() {
    const dailyStats = this.stats.dailyStats || {};
    const trendData = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = date.toDateString();
        
        const dayData = dailyStats[dateString] || { rolls: 0, correct: 0 };
        const accuracy = dayData.rolls > 0 ? (dayData.correct / dayData.rolls) * 100 : 0;
        
        trendData.push({
            label: date.toLocaleDateString('en-US', { weekday: 'short' }),
            accuracy: accuracy,
        });
    }
    return trendData;
  }
  
  getSessionStats() {
    return {
      sessionRolls: this.stats.sessionRolls,
      sessionCorrect: this.stats.sessionCorrect,
      sessionAccuracy: this.stats.sessionRolls > 0 ? 
        (this.stats.sessionCorrect / this.stats.sessionRolls * 100) : 0,
      sessionDuration: Date.now() - this.stats.sessionStartTime
    };
  }
  
  resetSession() {
    this.stats.sessionRolls = 0;
    this.stats.sessionCorrect = 0;
    this.stats.sessionStartTime = Date.now();
    this.saveStats();
  }
  
  getAllAchievements() {
    const allAchievements = [
      { id: 'firstPrediction', title: 'First Vision', description: 'Made your first psychic prediction', icon: '🔮' },
      { id: 'streak3', title: 'Triple Sight', description: 'Achieved a 3-prediction streak', icon: '🔥' },
      { id: 'streak5', title: 'Mystic Flow', description: 'Achieved a 5-prediction streak', icon: '⚡' },
      { id: 'streak10', title: 'Oracle\'s Vision', description: 'Achieved a 10-prediction streak', icon: '🌟' },
      { id: 'hundred', title: 'Century Seer', description: 'Made 100 predictions', icon: '💯' },
      { id: 'fiveHundred', title: 'Devoted Practitioner', description: 'Made 500 predictions', icon: '🏆' },
      { id: 'masterLevel', title: 'Psychic Master', description: 'Reached maximum psychic level', icon: '👑' },
      { id: 'accurate', title: 'Beyond Chance', description: 'Achieved 50%+ accuracy', icon: '🎯' },
      { id: 'significant', title: 'Statistically Significant', description: 'Achieved p-value < 0.05', icon: '📊' }
    ];
    
    return allAchievements.map(achievement => ({
      ...achievement,
      unlocked: !!this.stats.achievements[achievement.id]
    }));
  }
  updateLeaderboard() {
    try {
      const playerData = JSON.parse(localStorage.getItem('divineSensePlayer') || '{}');
      if (!playerData.email) return;
      let leaderboard = JSON.parse(localStorage.getItem('divineSenseLeaderboard') || '[]');
      const playerIndex = leaderboard.findIndex(p => p.email === playerData.email);
      const playerStats = {
        name: playerData.name,
        email: playerData.email,
        accuracy: this.stats.accuracy,
        pValue: this.stats.pValue,
        totalRolls: this.stats.totalRolls,
        bestStreak: this.stats.bestStreak,
        joinDate: playerData.joinDate
      };
      if (playerIndex === -1) {
        leaderboard.push(playerStats);
      } else {
        leaderboard[playerIndex] = playerStats;
      }
      localStorage.setItem('divineSenseLeaderboard', JSON.stringify(leaderboard));
    } catch (e) {
      console.error('Could not update leaderboard:', e);
    }
  }
  grantStreakShield() {
    this.stats.streakShields = (this.stats.streakShields || 0) + 1;
    this.saveStats();
    // The UI update will be called after the animation finishes
  }
  useStreakShield() {
    if (this.stats.streakShields > 0) {
      this.stats.streakShields--;
      this.saveStats();
      if (this.uiCallbacks.updateStats) {
        this.uiCallbacks.updateStats(this.getStats());
      }
    }
  }
  completeBreathingSession(sessionDurationMinutes = 3, completedFullSession = false) {
    this.stats.breathingSessionsCompleted = (this.stats.breathingSessionsCompleted || 0) + 1;
    this.stats.totalCoherenceTime = (this.stats.totalCoherenceTime || 0) + sessionDurationMinutes;
    
    const today = new Date().toDateString();
    
    // Update daily coherence time
    if (this.stats.lastCoherenceSessionDate !== today) {
      this.stats.dailyCoherenceTime = sessionDurationMinutes;
      this.stats.lastCoherenceSessionDate = today;
    } else {
      this.stats.dailyCoherenceTime = (this.stats.dailyCoherenceTime || 0) + sessionDurationMinutes;
    }
    
    // Update daily breathing streak
    if (this.stats.lastBreathingSessionDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (this.stats.lastBreathingSessionDate === yesterday.toDateString()) {
        this.stats.dailyBreathingStreak = (this.stats.dailyBreathingStreak || 0) + 1;
      } else {
        this.stats.dailyBreathingStreak = 1;
      }
      this.stats.lastBreathingSessionDate = today;
    }
    
    // Grant shield reward if the full session was completed
    if (completedFullSession) {
        this.grantStreakShieldAndNotify();
    }
    
    // Check for new breathing awards and show notifications
    const newAwards = this.checkBreathingAwards();
    if (newAwards.length > 0) {
        this.scene.time.delayedCall(1500, () => {
            newAwards.forEach((award, index) => {
                this.scene.time.delayedCall(index * 1200, () => {
                    this.scene.showAchievementNotification(award);
                    if (this.uiCallbacks.addBadge) {
                      this.uiCallbacks.addBadge(award, true, 625); // True for isBreathingAward
                    }
                });
            });
        });
    }
    this.saveStats();
    this.saveStats();
  }
  grantStreakShieldAndNotify() {
      this.grantStreakShield();
      this.stats.shieldsEarned = (this.stats.shieldsEarned || 0) + 1;
      this.saveStats();
      if (this.uiCallbacks.animateShieldAward) {
        this.uiCallbacks.animateShieldAward(() => {
          // Update stats display after animation is complete
          if (this.uiCallbacks.updateStats) {
            this.uiCallbacks.updateStats(this.getStats());
          }
        });
      }
      const nextTime = this.getRequiredBreathingTime();
      if (this.uiCallbacks.showRewardNotification) {
        this.uiCallbacks.showRewardNotification(
            'Streak Shield Awarded!',
            `You've earned a shield! ${nextTime} minutes of coherence required for the next one.`,
            '🛡️'
        );
      }
  }
  
  checkBreathingAwards() {
      const newAwards = [];
      // Award for completing the first breathing session
      if (this.stats.breathingSessionsCompleted === 1 && !this.stats.breathingAwards.firstSession) {
          this.stats.breathingAwards.firstSession = true;
          newAwards.push({
              id: 'firstSession',
              title: 'First Breath',
              description: 'Completed your first breathing session.',
              icon: '🧘'
          });
      }
      
      // Award for a 3-day breathing streak
      if (this.stats.dailyBreathingStreak === 3 && !this.stats.breathingAwards.streak3) {
          this.stats.breathingAwards.streak3 = true;
          newAwards.push({
              id: 'streak3',
              title: 'Mindful Momentum',
              description: 'Maintained a 3-day breathing streak.',
              icon: '🌀'
          });
      }
      
      // Award for a 7-day breathing streak
      if (this.stats.dailyBreathingStreak === 7 && !this.stats.breathingAwards.streak7) {
          this.stats.breathingAwards.streak7 = true;
          newAwards.push({
              id: 'streak7',
              title: 'Coherence Champion',
              description: 'Maintained a 7-day breathing streak.',
              icon: '💖'
          });
      }
      
      return newAwards;
  }
  
  getAllBreathingAwards() {
      const allAwards = [
          { id: 'firstSession', title: 'First Breath', description: 'Completed your first breathing session.', icon: '🧘' },
          { id: 'streak3', title: 'Mindful Momentum', description: 'Maintained a 3-day breathing streak.', icon: '🌀' },
          { id: 'streak7', title: 'Coherence Champion', description: 'Maintained a 7-day breathing streak.', icon: '💖' }
      ];
      
      return allAwards.map(award => ({
          ...award,
          unlocked: !!this.stats.breathingAwards[award.id]
      }));
  }
  
  getRequiredBreathingTime() {
    const shieldsEarned = this.stats.shieldsEarned || 0;
    // Base time: 3 mins. Increase by 1 min for every shield earned, cap at 10 mins.
    return Math.min(10, 3 + shieldsEarned);
  }
  
  resetAllStats() {
    try {
        localStorage.removeItem('divineSenseGameStats');
        localStorage.removeItem('tutorialSeen');
        // Reset the in-memory stats to their default state
        this.stats = {
          totalRolls: 0,
          correctPredictions: 0,
          accuracy: 0,
          pValue: 1.0,
          currentStreak: 0,
          bestStreak: 0,
          wrongStreak: 0,
          zenScore: 0,
          divinePower: 0,
          psychicLevel: 1,
          levelProgress: 0,
          streakShields: 0,
          shieldsEarned: 0,
          sessionRolls: 0,
          sessionCorrect: 0,
          sessionStartTime: Date.now(),
          recentPredictions: [],
          achievements: {},
          dailyStats: {},
          breathingSessionsCompleted: 0,
          dailyBreathingStreak: 0,
          lastBreathingSessionDate: null,
          dailyCoherenceTime: 0,
          lastCoherenceSessionDate: null,
          breathingAwards: {},
          totalCoherenceTime: 0,
          recentBreathingSessions: [],
          quantumScoreHistory: [],
          shieldsThisSession: 0,
          levelStats: {},
          senseMode: {
            totalRolls: 0,
            correctPredictions: 0,
            accuracy: 0,
            pValue: 1.0,
            currentStreak: 0,
            bestStreak: 0,
            recentPredictions: []
          },
          influenceMode: {
            totalRolls: 0,
            correctPredictions: 0,
            accuracy: 0,
            pValue: 1.0,
            currentStreak: 0,
            bestStreak: 0,
            recentPredictions: []
          }
        };
        console.log('All player stats have been reset.');
    } catch (e) {
        console.error('Could not reset game stats.', e);
    }
  }
  
  // New method to get mode-specific statistics
  getModeStats(mode = null) {
    if (mode === 'sense') {
      return this.stats.senseMode;
    } else if (mode === 'influence') {
      return this.stats.influenceMode;
    } else {
      // Return comparison object with both modes
      return {
        sense: this.stats.senseMode,
        influence: this.stats.influenceMode,
        combined: {
          totalRolls: this.stats.totalRolls,
          correctPredictions: this.stats.correctPredictions,
          accuracy: this.stats.accuracy,
          pValue: this.stats.pValue,
          currentStreak: this.stats.currentStreak,
          bestStreak: this.stats.bestStreak
        }
      };
    }
  }
  
  // Get performance comparison between modes
  getModeComparison() {
    const senseStats = this.stats.senseMode;
    const influenceStats = this.stats.influenceMode;
    
    return {
      sense: {
        accuracy: senseStats.accuracy,
        pValue: senseStats.pValue,
        totalRolls: senseStats.totalRolls,
        bestStreak: senseStats.bestStreak,
        performance: this.getPerformanceLevel(senseStats.accuracy, senseStats.pValue)
      },
      influence: {
        accuracy: influenceStats.accuracy,
        pValue: influenceStats.pValue,
        totalRolls: influenceStats.totalRolls,
        bestStreak: influenceStats.bestStreak,
        performance: this.getPerformanceLevel(influenceStats.accuracy, influenceStats.pValue)
      },
      recommendation: this.getRecommendation(senseStats, influenceStats)
    };
  }
  
  getPerformanceLevel(accuracy, pValue) {
    if (pValue < 0.01) return 'Exceptional';
    if (pValue < 0.05) return 'Significant';
    if (accuracy > 25) return 'Above Average';
    if (accuracy > 16.67) return 'Average';
    return 'Below Average';
  }
  
  getRecommendation(senseStats, influenceStats) {
    if (senseStats.totalRolls < 10 && influenceStats.totalRolls < 10) {
      return 'Play more with both modes to see which works better for you';
    }
    
    if (senseStats.totalRolls < 10) {
      return 'Try more Sense mode sessions to compare';
    }
    
    if (influenceStats.totalRolls < 10) {
      return 'Try more Influence mode sessions to compare';
    }
    
    const senseBetter = senseStats.pValue < influenceStats.pValue || 
                      (Math.abs(senseStats.pValue - influenceStats.pValue) < 0.1 && 
                       senseStats.accuracy > influenceStats.accuracy);
    
    if (senseBetter) {
      return 'You seem to perform better with Sense mode (ESP-style perception)';
    } else {
      return 'You seem to perform better with Influence mode (PK-style intention)';
    }
  }
  
  getStatsForLevel(level) {
    const levelKey = `level_${level}`;
    const levelData = this.stats.levelStats[levelKey] || { predictions: 0, correct: 0, bestStreak: 0 };
    return {
      predictions: levelData.predictions,
      accuracy: levelData.predictions > 0 ? (levelData.correct / levelData.predictions) * 100 : 0,
      bestStreak: levelData.bestStreak
    };
  }

  // Method to get current accuracy - fixes the TypeError
  getAccuracy() {
    return this.stats.accuracy;
  }
}