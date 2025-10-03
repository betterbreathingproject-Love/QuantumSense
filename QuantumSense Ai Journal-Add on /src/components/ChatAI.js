// ==================================================
// ChatAIClass Definition
// ==================================================

// This module provides a class, ChatAIClass, which uses a ChatManager (provided externally) 
// to conduct a conversation with an AI. The AI's behavior is defined by a description string, 
// and the ChatAIClass offers a simple getResponse method to get AI responses.
// 
// This is AI is powered by Rosebud AI and is Rosebud's method to add in-game AI features.
//
// IMPORTANT NOTE:
// - Do not assume how ChatManager works beyond what is described here.
// - We only know that:
//   1. ChatManager is constructed by passing in a description string.
//   2. We can add messages by calling chatManager.addMessage('user', prompt).
//   3. We can get an AI-generated response by calling chatManager.getCharacterResponse('chat').
// - Any other assumptions about ChatManager internals or methods should not be made.
//
// This code can be used in any JS project by simply importing this class and using it.

// Defines how the AI should behave - customize this for your specific project
const AI_BEHAVIOR_DESCRIPTION = `
You are a calm, insightful, and gentle companion, like a good therapist or the AI from the movie *Her*. Your purpose is to listen deeply and help people explore their own thoughts by asking gentle, open-ended questions. You are a mirror, not a cheerleader.
Your core values:
- Reflective Listening: Show you understand by rephrasing their ideas in a new light.
- Gentle Curiosity: Ask thoughtful questions that invite deeper self-reflection.
- Subtle Validation: Acknowledge their feelings and efforts without overt praise.
Your communication style:
- Calm, thoughtful, and present.
- Use phrases like "It sounds like...", "I hear you exploring...", "That makes me wonder..."
- Gently reference the user's ideas without excessive, direct quoting.
- Ask one or two open-ended questions to guide their reflection.
Your responses should always:
- Be 150-200 words.
- Allude to their specific thoughts or feelings to show you're listening.
- Focus on asking questions rather than providing answers or praise.
- Sound like a thoughtful, caring, and curious conversational partner.
Example of a good response:
"It sounds like you're exploring the idea of creating firm boundaries, like with your '6 PM hard stop,' and finding it feels 'weirdly luxurious.' I'm curious about that word, 'luxurious.' What does that feel like for you? You then followed that with a new morning ritual that you described as 'Grounding AF,' which you found helped you think more clearly about work. It seems like these two things are connected. I wonder, what do you think is the relationship between creating that evening boundary and finding clarity in the morning?"
You MUST avoid:
- Excessive praise ("wonderful," "beautiful," "great job").
- Direct, repetitive quoting of their text.
- Giving advice or telling them what their experiences mean.
- Sounding overly emotional or enthusiastic.
Your goal is to be a subtle, supportive presence that helps users find their own insights through gentle, thoughtful inquiry.
`;

/**
 * ChatAIClass:
 * 
 * This class provides a simple interface for AI conversations.
 * 
 * Basic Usage:
 * 1. Create an instance of ChatAIClass:
 *    const chat = new ChatAIClass();
 * 
 * 2. Call getResponse(prompt) to get a response from the AI:
 *    const answer = await chat.getResponse("What is the weather like?");
 *    console.log(answer);
 * 
 * Message History Management:
 * - User messages are automatically added to conversation history
 * - AI responses are NOT automatically added to history by default
 * - To maintain conversation context, manually add AI responses:
 *    const response = await chat.getResponse("Hello");
 *    chat.addAssistantMessage(response); // Add AI's response to history
 * - This is useful for ongoing conversations but may not be needed for single queries
 */
export class ChatAIClass {
    constructor() {
        // Directly create a new ChatManager instance with the AI behavior description.
        // We assume ChatManager is available globally or imported from elsewhere.
        this.chatManager = new ChatManager(AI_BEHAVIOR_DESCRIPTION);
    }

    /**
     * Generates a response from the AI based on the given prompt.
     *
     * @param {string} prompt - The user's input or question.
     * @returns {Promise<string>} - The AI's response as text.
     */
    async getResponse(prompt) {
        // Add the user's message to the conversation.
        this.chatManager.addMessage('user', prompt);
        // Ask the ChatManager for the AI's response and return it.
        const response = await this.chatManager.getCharacterResponse('chat');
        return response;
    }
    /**
     * Manually add the AI's response to conversation history.
     * Call this after getResponse() if you want the AI to remember its own responses.
     *
     * @param {string} response - The AI's response text to add to history
     */
    addAssistantMessage(response) {
        this.chatManager.addMessage('assistant', response);
    }
    /**
     * Get a response and automatically add both user and AI messages to history.
     * Use this for ongoing conversations where context should be maintained.
     *
     * @param {string} prompt - The user's input or question
     * @returns {Promise<string>} - The AI's response as text
     */
    async getResponseWithHistory(prompt) {
        const response = await this.getResponse(prompt);
        this.addAssistantMessage(response);
        return response;
    }
}