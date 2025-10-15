import { getAIProvider, setProvider, setChatGPTApiKey, setChatGPTConfig } from 'utils/aiProvider.js';
/**
 * AIHelper - A utility module for managing AI interactions with scalable data handling
 * 
 * This module provides convenient methods for integrating AI features
 * into any part of the application. It handles ChatAI instance management,
 * data bridging for large datasets, and provides common interaction patterns.
 */
class AIHelper {
    constructor() {
        this.provider = null;
        this.dataBridge = null;
        this.isInitialized = false;
        this.isBridgeReady = false;
    }

    /**
     * Initialize the AI helper with data bridge support (lazy loading)
     */
    init() {
        if (!this.isInitialized) {
            try {
                // Default to ChatGPT provider
                try { setProvider('chatgpt'); } catch (_) {}
                this.provider = getAIProvider();
                this.initDataBridge();
                this.isInitialized = true;
                console.log('AI Helper initialized successfully');
            } catch (error) {
                console.warn('AI Helper initialization failed:', (error && error.message) || error);
                this.isInitialized = false;
            }
        }
        return this.isInitialized;
    }
    /**
     * Initialize the data bridge for handling large datasets
     */
    initDataBridge() {
        try {
            // Prefer the ES module data collector attached as a global helper
            if (typeof window !== 'undefined' && typeof window.getQuantumSenseAiIntroData === 'function') {
                this.dataBridge = { collect: () => window.getQuantumSenseAiIntroData() };
                this.isBridgeReady = true;
                console.log('AI Data Bridge connected to getQuantumSenseAiIntroData');
            } else {
                console.warn('AiIntroDataBridge (collector) not available, using fallback mode');
                this.isBridgeReady = false;
            }
        } catch (error) {
            console.warn('Data Bridge initialization failed:', (error && error.message) || error);
            this.isBridgeReady = false;
        }
    }

    /**
     * Check if AI is available and ready to use
     */
    isReady() {
        return this.isInitialized && this.provider !== null;
    }
    /**
     * Check if data bridge is ready for large dataset handling
     */
    isBridgeAvailable() {
        return this.isBridgeReady && this.dataBridge !== null;
    }

    /**
     * Get AI response with automatic initialization and data bridge optimization
     * @param {string} prompt - The user's question or input
     * @param {Object} options - Optional configuration for data handling
     * @returns {Promise<string|null>} - AI response or null if unavailable
     */
    async ask(prompt, options = {}) {
        if (!this.isReady()) {
            if (!this.init()) {
                console.warn('AI is not available');
                return null;
            }
        }
        try {
            const response = await this.provider.getResponse(prompt);
            return response;
        } catch (error) {
            console.error('AI request failed:', error);
            return null;
        }
    }
    /**
     * Get AI response with conversation history maintained
     * @param {string} prompt - The user's question or input
     * @returns {Promise<string|null>} - AI response or null if unavailable
     */
    async askWithHistory(prompt) {
        if (!this.isReady()) {
            if (!this.init()) {
                console.warn('AI is not available');
                return null;
            }
        }
        try {
            const response = await this.provider.getResponseWithHistory(prompt);
            return response;
        } catch (error) {
            console.error('AI request failed:', error);
            return null;
        }
    }
    /**
     * Process large journal datasets efficiently for AI analysis
     * @param {Array} journalEntries - Array of journal entries
     * @param {string} analysisType - Type of analysis to perform
     * @returns {Promise<string|null>} - AI analysis or null if unavailable
     */
    async processLargeDataset(journalEntries, analysisType = 'patterns') {
        if (!this.isReady()) {
            if (!this.init()) {
                console.warn('AI is not available');
                return null;
            }
        }
        try {
            const payload = await this.getUnifiedPayload(journalEntries, analysisType);
            const prompt = this.createUnifiedPrompt(payload, analysisType);
            return await this.provider.getResponse(prompt);
        } catch (error) {
            console.error('Large dataset processing failed:', error);
            return null;
        }
    }
    /**
     * Create optimized prompts for large datasets
     * @private
     */
    createUnifiedPrompt(payload, analysisType) {
        const scope = analysisType || 'psychic_intuition_development';
        return [
            `Task: Generate personalized Quantum Insights (on-demand) focused on ${scope}.`,
            'Use ALL provided data to deliver concise, actionable feedback with empathy. Prioritize:',
            '- Psychic performance patterns (accuracy, streaks, p-value, Q-score)',
            '- Sense vs Influence mode differences',
            '- Coherence practice (total/daily time, sessions, streak) and its impact',
            '- Journal moods (multi-select) and themes relevant to intuition and wellness',
            '',
            'Output sections:',
            '1) Key Patterns',
            '2) Personalized Recommendations (numbered, practical drills)',
            '3) Coherence Tips (breathing/binaural beats suggestions)',
            '4) Next Steps (1–3 actions for the next session)',
            '',
            'Data JSON:',
            JSON.stringify(payload)
        ].join('\n');
    }
    /**
     * Get insights with intelligent data handling for scalability
     * @param {Array} journalEntries - Journal entries to analyze
     * @param {string} focusArea - Specific area to focus analysis on
     * @returns {Promise<string|null>} - AI insights or null
     */
    async getScalableInsights(journalEntries, focusArea = 'emotional_patterns') {
        const analysisType = this.determineAnalysisType(journalEntries.length, focusArea);
        return await this.processLargeDataset(journalEntries, analysisType);
    }
    /**
     * Determine optimal analysis type based on data size
     * @private
     */
    determineAnalysisType(entryCount, focusArea) {
        if (entryCount > 50) {
            return `comprehensive_${focusArea}`;
        } else if (entryCount > 20) {
            return `detailed_${focusArea}`;
        } else {
            return `focused_${focusArea}`;
        }
    }
    /**
     * Get creative suggestions for scene enhancements (uses conversation history)
     * @param {string} sceneDescription - Description of current scene
     * @returns {Promise<string|null>} - Creative suggestions or null
     */
    async getSuggestions(sceneDescription) {
        const prompt = `Based on this scene: "${sceneDescription}", suggest 3 creative visual enhancements or effects that would make it more interesting.`;
        return await this.askWithHistory(prompt);
    }
    /**
     * Get help with concepts (no history needed for explanations)
     * @param {string} concept - The concept to explain
     * @returns {Promise<string|null>} - Explanation or null
     */
    async explainConcept(concept) {
        const prompt = `Explain this concept in simple terms with a practical example: ${concept}`;
        return await this.ask(prompt);
    }
    /**
     * Get troubleshooting help (uses conversation history for follow-up questions)
     * @param {string} issue - Description of the problem
     * @returns {Promise<string|null>} - Troubleshooting advice or null
     */
    async troubleshoot(issue) {
        const prompt = `I'm having this issue with my application: "${issue}". What might be causing this and how can I fix it?`;
        return await this.askWithHistory(prompt);
    }
    /**
     * Start or continue a conversation with context
     * @param {string} message - The conversation message
     * @returns {Promise<string|null>} - AI response or null
     */
    async chat(message) {
        return await this.askWithHistory(message);
    }
}

// Export a singleton instance
export const aiHelper = new AIHelper();

// Also export the class for custom instances if needed
export { AIHelper };

// Helper methods: unified payload collection
AIHelper.prototype.getUnifiedPayload = async function(journalEntries, analysisType) {
    const safeParse = (str, fallback) => { try { return JSON.parse(str || 'null') || fallback; } catch (_) { return fallback; } };
    const getItem = (key, fallback) => { try { return safeParse(localStorage.getItem(key), fallback); } catch (_) { return fallback; } };

    let bridgeData = null;
    try {
        if (this.isBridgeAvailable()) {
            bridgeData = this.dataBridge.collect();
        } else if (typeof window !== 'undefined' && typeof window.getQuantumSenseAiIntroData === 'function') {
            bridgeData = window.getQuantumSenseAiIntroData();
        }
    } catch (_) { bridgeData = null; }

    const stats = getItem('divineSenseGameStats', {});
    const player = getItem('divineSensePlayer', {});
    const leaderboard = getItem('divineSenseLeaderboard', []);
    const moodData = getItem('journalMoodData', {});
    const audioSettings = getItem('divineSenseAudioSettings', {});
    const breathingSettings = getItem('divineSenseBreathingSettings', {});
    const gameMode = getItem('divineSenseGameMode', 'sense');

    const payload = {
        meta: { provider: 'AIHelper', version: '2.0.0', collectedAt: Date.now(), analysisType },
        player, stats, leaderboard,
        journal: { entries: journalEntries, moodData },
        settings: { audio: audioSettings, breathing: breathingSettings, gameMode },
        bridge: bridgeData || undefined
    };
    return payload;
};

// Convenience configuration for ChatGPT
AIHelper.prototype.configureChatGPT = function({ apiKey, baseUrl, model } = {}) {
    try {
        if (apiKey) setChatGPTApiKey(apiKey);
        setChatGPTConfig({ baseUrl, model });
    } catch (_) {}
};