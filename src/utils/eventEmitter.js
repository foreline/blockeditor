'use strict';

/**
 * Event categories for better organization
 */
export const EVENT_CATEGORIES = {
    CONTENT: 'content',
    BLOCK: 'block',
    EDITOR: 'editor',
    TOOLBAR: 'toolbar',
    USER: 'user'
};

/**
 * Structured event types
 */
export const EVENTS = {
    // Content Events (debounced)
    CONTENT_CHANGED: 'content.changed',
    CONTENT_SAVED: 'content.saved',
    
    // Block Events
    BLOCK_CREATED: 'block.created',
    BLOCK_DELETED: 'block.deleted',
    BLOCK_DESTROYED: 'block.destroyed',
    BLOCK_FOCUSED: 'block.focused',
    BLOCK_ACTIVATED: 'block.activated',
    BLOCK_CONTENT_CHANGED: 'block.content.changed',
    BLOCK_TYPE_CHANGED: 'block.type.changed',
    BLOCK_CONVERTED: 'block.converted',
    
    // Editor Events
    EDITOR_INITIALIZED: 'editor.initialized',
    EDITOR_FOCUSED: 'editor.focused',
    EDITOR_BLURRED: 'editor.blurred',
    EDITOR_UPDATED: 'editor.updated', // Legacy compatibility
    EDITOR_DESTROYED: 'editor.destroyed',
    DEBUG_MODE_CHANGED: 'editor.debug.mode.changed',
    
    // Toolbar Events
    TOOLBAR_ACTION: 'toolbar.action',
    
    // User Events
    USER_PASTE: 'user.paste',
    USER_KEY_PRESS: 'user.keypress'
};

/**
 * Enhanced Event Emitter with debouncing and throttling support
 * 
 * @example Subscribe to an event
 * eventEmitter.subscribe('content.changed', function(eventData) { 
 *   console.log('Content changed:', eventData); 
 * });
 *
 * @example Emit an event with debouncing
 * eventEmitter.emit('content.changed', { content: 'new content' }, { debounce: 300 });
 *
 * @example Emit an event with throttling
 * eventEmitter.emit('user.keypress', { key: 'a' }, { throttle: 100 });
 */
export class EditorEventEmitter {
    constructor(options = {}) {
        this.events = new Map();
        this.debouncedEvents = new Map();
        this.throttledEvents = new Map();
        this.debug = options.debug !== undefined ? options.debug : true;
        this._suppressionDepth = 0;
    }

    /**
     * Suppress all event emission. Calls nest — only after a matching
     * number of resume() calls will events start firing again.
     */
    suppress() {
        this._suppressionDepth++;
    }

    /**
     * Resume event emission after a previous suppress() call.
     */
    resume() {
        if (this._suppressionDepth > 0) {
            this._suppressionDepth--;
        }
    }

    /**
     * Whether event emission is currently suppressed
     * @returns {boolean}
     */
    get isSuppressed() {
        return this._suppressionDepth > 0;
    }
    
    /**
     * Subscribe to an event
     * @param {string} eventType - The event type to subscribe to
     * @param {Function} callback - The callback function
     * @param {Object} options - Subscription options
     * @param {boolean} options.once - Fire only once
     * @param {number} options.priority - Priority (higher = earlier execution)
     * @returns {Object} Subscription object with unsubscribe method
     */
    subscribe(eventType, callback, options = {}) {
        if (!this.events.has(eventType)) {
            this.events.set(eventType, new Set());
        }
        
        const wrappedCallback = {
            callback,
            once: options.once || false,
            priority: options.priority || 0,
            id: Date.now() + Math.random() // Unique identifier
        };
        
        this.events.get(eventType).add(wrappedCallback);
        
        return {
            unsubscribe: () => {
                const listeners = this.events.get(eventType);
                if (listeners) {
                    listeners.delete(wrappedCallback);
                    if (listeners.size === 0) {
                        this.events.delete(eventType);
                    }
                }
            }
        };
    }

    /**
     * Emit an event
     * @param {string} eventType - The event type
     * @param {*} data - Event data
     * @param {Object} options - Emission options
     * @param {number} options.debounce - Debounce delay in ms
     * @param {number} options.throttle - Throttle delay in ms
     * @param {string} options.source - Event source identifier
     */
    emit(eventType, data = {}, options = {}) {
        // Skip emission entirely while suppressed
        if (this._suppressionDepth > 0) {
            return;
        }

        const eventData = {
            type: eventType,
            timestamp: Date.now(),
            source: options.source || 'editor',
            data: data
        };

        if (options.debounce) {
            this.emitDebounced(eventType, eventData, options.debounce);
        } else if (options.throttle) {
            this.emitThrottled(eventType, eventData, options.throttle);
        } else {
            this.emitImmediate(eventType, eventData);
        }
    }

    /**
     * Emit with debouncing - delays execution until after delay has passed since last call
     * @param {string} eventType - The event type
     * @param {Object} eventData - Event data
     * @param {number} delay - Debounce delay in ms
     */
    emitDebounced(eventType, eventData, delay = 300) {
        if (this.debouncedEvents.has(eventType)) {
            clearTimeout(this.debouncedEvents.get(eventType));
        }
        
        const timeoutId = setTimeout(() => {
            this.emitImmediate(eventType, eventData);
            this.debouncedEvents.delete(eventType);
        }, delay);
        
        this.debouncedEvents.set(eventType, timeoutId);
    }

    /**
     * Emit with throttling - ensures function is called at most once per delay period
     * @param {string} eventType - The event type
     * @param {Object} eventData - Event data
     * @param {number} delay - Throttle delay in ms
     */
    emitThrottled(eventType, eventData, delay = 100) {
        const now = Date.now();
        const lastCall = this.throttledEvents.get(eventType);
        
        if (!lastCall || now - lastCall >= delay) {
            this.throttledEvents.set(eventType, now);
            this.emitImmediate(eventType, eventData);
        }
    }

    /**
     * Emit immediately without any delay
     * @param {string} eventType - The event type
     * @param {Object} eventData - Event data
     */
    emitImmediate(eventType, eventData) {
        const listeners = this.events.get(eventType);
        if (!listeners || listeners.size === 0) return;

        // Sort by priority (higher first)
        const sortedListeners = Array.from(listeners)
            .sort((a, b) => b.priority - a.priority);

        sortedListeners.forEach(listener => {
            try {
                listener.callback(eventData);
                
                if (listener.once) {
                    listeners.delete(listener);
                }
            } catch (error) {
                console.error(`Error in event ${eventType}:`, error);
            }
        });

        if (this.debug) {
            console.log(`%c Event: ${eventType}`, 'background: #4CAF50; color: white; padding: 2px 5px;', eventData);
        }
    }

    /**
     * Get event listeners count for a specific event type
     * @param {string} eventType - The event type
     * @returns {number} Number of listeners
     */
    getListenerCount(eventType) {
        return this.events.get(eventType)?.size || 0;
    }

    /**
     * Check if there are any listeners for a specific event type
     * @param {string} eventType - The event type
     * @returns {boolean} True if there are listeners
     */
    hasListeners(eventType) {
        return this.getListenerCount(eventType) > 0;
    }

    /**
     * Get all registered event types
     * @returns {Array<string>} Array of event types
     */
    getEventTypes() {
        return Array.from(this.events.keys());
    }

    /**
     * Clear all debounced and throttled timers
     */
    cleanup() {
        // Clear debounced timers
        this.debouncedEvents.forEach(timeoutId => clearTimeout(timeoutId));
        this.debouncedEvents.clear();
        
        // Clear throttled timestamps
        this.throttledEvents.clear();
        
        // Remove invalid callbacks
        this.events.forEach((listeners, eventType) => {
            const validListeners = Array.from(listeners).filter(listener => {
                try {
                    return typeof listener.callback === 'function';
                } catch (error) {
                    return false;
                }
            });
            
            if (validListeners.length === 0) {
                this.events.delete(eventType);
            } else if (validListeners.length !== listeners.size) {
                this.events.set(eventType, new Set(validListeners));
            }
        });
    }

    /**
     * Remove all event listeners
     */
    removeAllListeners() {
        this.cleanup();
        this.events.clear();
    }
}

// Create a global instance for backward compatibility
export const eventEmitter = new EditorEventEmitter();