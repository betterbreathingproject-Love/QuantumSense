/**
 * Centralized Wheel Event Manager
 * Prevents conflicts between multiple wheel event handlers by managing them centrally
 */
export class WheelEventManager {
    constructor(scene) {
        this.scene = scene;
        this.handlers = new Map();
        this.isListening = false;
        this.masterHandler = null;
        this._handlingWheel = false;
        this._processingHandlers = false;
    }

    /**
     * Register a wheel event handler with a unique ID
     * @param {string} id - Unique identifier for the handler
     * @param {Function} handler - The wheel event handler function
     * @param {Object} context - The context (this) for the handler
     */
    registerHandler(id, handler, context = null) {
        // Remove existing handler with same ID if it exists
        this.unregisterHandler(id);
        
        // Store the handler with its context
        this.handlers.set(id, {
            handler: handler,
            context: context
        });

        // Set up master handler if not already listening
        if (!this.isListening) {
            this.setupMasterHandler();
        }
    }

    /**
     * Unregister a wheel event handler
     * @param {string} id - Unique identifier for the handler to remove
     */
    unregisterHandler(id) {
        this.handlers.delete(id);
        
        // If no handlers remain, remove master handler
        if (this.handlers.size === 0 && this.isListening) {
            this.removeMasterHandler();
        }
    }

    /**
     * Set up the master wheel event handler
     */
    setupMasterHandler() {
        if (this.isListening) {
            return;
        }

        this.masterHandler = (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            // Prevent recursive calls with more robust checking
            if (this._handlingWheel) {
                console.warn('WheelEventManager: Preventing recursive wheel event');
                return;
            }
            
            // Additional safety check - prevent multiple simultaneous calls
            if (this._processingHandlers) {
                console.warn('WheelEventManager: Already processing handlers, skipping');
                return;
            }
            
            this._handlingWheel = true;
            this._processingHandlers = true;
            
            try {
                // Call all registered handlers in registration order
                for (const [id, handlerData] of this.handlers) {
                    try {
                        if (handlerData.context) {
                            handlerData.handler.call(handlerData.context, pointer, gameObjects, deltaX, deltaY, deltaZ);
                        } else {
                            handlerData.handler(pointer, gameObjects, deltaX, deltaY, deltaZ);
                        }
                    } catch (error) {
                        console.error(`Error in wheel handler ${id}:`, error);
                        // Continue processing other handlers even if one fails
                    }
                }
            } finally {
                this._handlingWheel = false;
                this._processingHandlers = false;
            }
        };

        this.scene.input.on('wheel', this.masterHandler);
        this.isListening = true;
    }

    /**
     * Remove the master wheel event handler
     */
    removeMasterHandler() {
        if (this.masterHandler && this.isListening) {
            this.scene.input.off('wheel', this.masterHandler);
            this.masterHandler = null;
            this.isListening = false;
        }
    }

    /**
     * Clear all handlers and remove master handler
     */
    clearAll() {
        this.handlers.clear();
        this.removeMasterHandler();
    }

    /**
     * Get the number of registered handlers
     */
    getHandlerCount() {
        return this.handlers.size;
    }

    /**
     * Check if a handler is registered
     * @param {string} id - Handler ID to check
     */
    hasHandler(id) {
        return this.handlers.has(id);
    }
}