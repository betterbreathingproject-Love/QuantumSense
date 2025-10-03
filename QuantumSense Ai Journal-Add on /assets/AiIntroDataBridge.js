// AiIntroDataBridge.js
// Drop-in module to aggregate all user/session data points needed for an AI introduction.
// Safe to use in any app context; reads from localStorage with fallbacks and guards.

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

function getItem(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return defaultValue;
    const parsed = safeParse(raw);
    return parsed === null ? raw : parsed; // if not JSON, return raw string
  } catch (e) {
    return defaultValue;
  }
}

function normalizeJournalEntries(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const parsed = safeParse(value);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.entries)) return parsed.entries;
    return [];
  }
  if (typeof value === 'object') {
    if (Array.isArray(value.entries)) return value.entries;
    if (Array.isArray(value.data)) return value.data;
    // Convert map-like objects to an array of { id, ... }
    return Object.keys(value).map((k) => ({ id: k, ...value[k] }));
  }
  return [];
}

function normalizeLeaderboard(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  const parsed = typeof value === 'string' ? safeParse(value) : value;
  return Array.isArray(parsed) ? parsed : [];
}

function numericOrNull(n) {
  const num = Number(n);
  return Number.isFinite(num) ? num : null;
}

function getQScoreFromStats(stats) {
  if (!stats || typeof stats !== 'object') return null;
  const q = stats.qScore ?? stats.zenScore;
  return numericOrNull(q);
}

function getTrendHistory(stats) {
  if (!stats || typeof stats !== 'object') return [];
  const history = stats.quantumScoreHistory;
  return Array.isArray(history) ? history : [];
}

function getModeStats(stats) {
  if (!stats || typeof stats !== 'object') return { sense: null, influence: null, combined: null };
  return {
    sense: stats.senseMode || null,
    influence: stats.influenceMode || null,
    combined: {
      totalRolls: stats.totalRolls ?? 0,
      correctPredictions: stats.correctPredictions ?? 0,
      accuracy: stats.accuracy ?? 0,
      pValue: stats.pValue ?? 1,
      currentStreak: stats.currentStreak ?? 0,
      bestStreak: stats.bestStreak ?? 0,
    },
  };
}

export function collectAiIntroData() {
  const now = Date.now();
  // Core persisted domains
  const player = getItem('divineSensePlayer', {});
  const stats = getItem('divineSenseGameStats', {});
  const leaderboard = normalizeLeaderboard(getItem('divineSenseLeaderboard', []));

  // Journals and mood
  const journalPrimary = getItem('divineSenseJournalEntries', null);
  const journalFallback = getItem('journalEntries', null);
  const journalRosebud = getItem('rosebud-ai-journal-entries', null);
  const journalEntries = normalizeJournalEntries(
    journalPrimary ?? journalFallback ?? journalRosebud
  );
  const journalBackup = normalizeJournalEntries(getItem('journalEntries_backup', null));
  const moodData = getItem('journalMoodData', {});
  const chartAnnotations = getItem('chartAnnotations', []);

  // Audio and breathing
  const audioSettings = getItem('divineSenseAudioSettings', {
    musicVolume: 0.5,
    sfxVolume: 0.6,
  });
  const breathingSettings = getItem('divineSenseBreathingSettings', {});
  const gameMode = getItem('divineSenseGameMode', 'sense');

  // Misc UI / views
  const connectionsView = getItem('rosebud-ai-connections-view', null);

  // Derived values and structured packaging
  const qScore = getQScoreFromStats(stats);
  const quantumScoreHistory = getTrendHistory(stats);
  const modeStats = getModeStats(stats);

  return {
    meta: {
      provider: 'AiIntroDataBridge',
      version: '1.0.0',
      collectedAt: now,
    },
    player: {
      name: player?.name ?? null,
      email: player?.email ?? null,
      avatar: player?.avatar ?? null,
      joinDate: player?.joinDate ?? null,
    },
    stats: {
      qScore,
      zenScore: numericOrNull(stats?.zenScore),
      accuracy: numericOrNull(stats?.accuracy),
      pValue: numericOrNull(stats?.pValue),
      totalRolls: numericOrNull(stats?.totalRolls),
      bestStreak: numericOrNull(stats?.bestStreak),
      currentStreak: numericOrNull(stats?.currentStreak),
      session: {
        rolls: numericOrNull(stats?.sessionRolls),
        correct: numericOrNull(stats?.sessionCorrect),
        durationMs: numericOrNull(stats?.sessionStartTime) ? (now - stats.sessionStartTime) : null,
      },
      breathing: {
        sessionsCompleted: numericOrNull(stats?.breathingSessionsCompleted),
        dailyStreak: numericOrNull(stats?.dailyBreathingStreak),
        lastSessionDate: stats?.lastBreathingSessionDate ?? null,
        dailyCoherenceTime: numericOrNull(stats?.dailyCoherenceTime),
        totalCoherenceTime: numericOrNull(stats?.totalCoherenceTime),
      },
      rewards: {
        streakShields: numericOrNull(stats?.streakShields),
        shieldsEarned: numericOrNull(stats?.shieldsEarned),
        unclaimedRewards: Array.isArray(stats?.unclaimedRewards) ? stats.unclaimedRewards : [],
      },
      dailyStats: stats?.dailyStats || {},
      quantumScoreHistory,
      modeStats,
    },
    journals: {
      entries: journalEntries,
      backup: journalBackup,
      moodData,
      chartAnnotations,
    },
    leaderboard,
    settings: {
      audio: audioSettings,
      breathing: breathingSettings,
      gameMode,
    },
    views: {
      connectionsView,
    },
    sources: {
      // Expose the storage keys for reference in external apps
      playerKey: 'divineSensePlayer',
      statsKey: 'divineSenseGameStats',
      leaderboardKey: 'divineSenseLeaderboard',
      journalPrimaryKey: 'divineSenseJournalEntries',
      journalFallbackKey: 'journalEntries',
      journalBackupKey: 'journalEntries_backup',
      journalRosebudKey: 'rosebud-ai-journal-entries',
      moodKey: 'journalMoodData',
      chartAnnotationsKey: 'chartAnnotations',
      audioSettingsKey: 'divineSenseAudioSettings',
      breathingSettingsKey: 'divineSenseBreathingSettings',
      gameModeKey: 'divineSenseGameMode',
      connectionsViewKey: 'rosebud-ai-connections-view',
    },
  };
}

// Optional: attach to window for quick drop-in usage without imports
try {
  if (typeof window !== 'undefined') {
    window.getQuantumSenseAiIntroData = () => collectAiIntroData();
  }
} catch (_) {}

export default { collectAiIntroData };