import { ChatAIClass } from 'components/ChatAI.js';
/**
 * AIHelper - A utility module for managing AI interactions with scalable data handling
 * 
 * This module provides convenient methods for integrating AI features
 * into any part of the application. It handles ChatAI instance management,
 * data bridging for large datasets, and provides common interaction patterns.
 */
class AIHelper {
    constructor() {
        this.chatAI = null;
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
                this.chatAI = new ChatAIClass();
                this.initDataBridge();
                this.isInitialized = true;
                console.log('AI Helper initialized successfully');
            } catch (error) {
                console.warn('AI Helper initialization failed:', error.message);
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
            // Check if AiIntroDataBridge is available globally
            if (typeof window !== 'undefined' && window.AiIntroDataBridge) {
                this.dataBridge = new window.AiIntroDataBridge({
                    maxDataPoints: 1000, // Configurable limit for journal entries
                    compressionEnabled: true, // Enable data compression for large datasets
                    cacheStrategy: 'intelligent', // Use intelligent caching
                    batchProcessing: true // Enable batch processing for multiple entries
                });
                this.isBridgeReady = true;
                console.log('AI Data Bridge initialized for scalable data handling');
            } else {
                console.warn('AiIntroDataBridge not available, using fallback mode');
                this.isBridgeReady = false;
            }
        } catch (error) {
            console.warn('Data Bridge initialization failed:', error.message);
            this.isBridgeReady = false;
        }
    }

    /**
     * Check if AI is available and ready to use
     */
    isReady() {
        return this.isInitialized && this.chatAI !== null;
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
        if (!this.isReady() && !this.init()) {
            console.warn('AI is not available');
            return null;
        }
        try {
            // Use data bridge for large prompts if available
            if (this.isBridgeAvailable() && prompt.length > 2000) {
                const optimizedPrompt = await this.dataBridge.optimizePrompt(prompt, options);
                const response = await this.chatAI.getResponse(optimizedPrompt);
                return response;
            } else {
                const response = await this.chatAI.getResponse(prompt);
                return response;
            }
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
        if (!this.isReady() && !this.init()) {
            console.warn('AI is not available');
            return null;
        }
        try {
            const response = await this.chatAI.getResponseWithHistory(prompt);
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
        if (!this.isReady() && !this.init()) {
            console.warn('AI is not available');
            return null;
        }
        try {
            if (this.isBridgeAvailable() && journalEntries.length > 10) {
                // Use data bridge for large datasets
                const processedData = await this.dataBridge.processJournalData(journalEntries, {
                    analysisType,
                    includeMetadata: true,
                    compressionLevel: 'medium'
                });
                
                const prompt = this.createOptimizedPrompt(processedData, analysisType);
                return await this.chatAI.getResponse(prompt);
            } else {
                // Fallback to standard processing for smaller datasets
                const prompt = this.createStandardPrompt(journalEntries, analysisType);
                return await this.chatAI.getResponse(prompt);
            }
        } catch (error) {
            console.error('Large dataset processing failed:', error);
            return null;
        }
    }
    /**
     * Create optimized prompts for large datasets
     * @private
     */
    createOptimizedPrompt(processedData, analysisType) {
        return `Analyze this processed journal data for ${analysisType}:\n${JSON.stringify(processedData, null, 2)}`;
    }
    /**
     * Create standard prompts for smaller datasets
     * @private
     */
    createStandardPrompt(entries, analysisType) {
        const entriesText = entries.map(entry => 
            `${entry.date}: ${entry.text.substring(0, 200)}${entry.text.length > 200 ? '...' : ''}`
        ).join('\n');
        
        return `Analyze these journal entries for ${analysisType}:\n${entriesText}`;
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