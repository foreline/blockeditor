'use strict';

/**
 * Interface/Contract that all block types must implement
 * This defines the required methods and properties for block behavior in the editor
 * 
 * Note: JavaScript doesn't have true interfaces, so this serves as documentation
 * and a reference for what methods block classes should implement.
 */

/**
 * Block Interface Contract
 * 
 * All block classes should implement these methods:
 * 
 * Instance Methods:
 * - handleKeyPress(event, text): boolean
 * - handleEnterKey(event): boolean
 * - applyTransformation(targetElement, editorInstance): void
 * - toMarkdown(): string
 * - toHtml(): string
 * - renderToElement(): HTMLElement
 * 
 * Static Methods:
 * - getMarkdownTriggers(): string[]
 * - matchesMarkdownTrigger(text): boolean
 * - getToolbarConfig(): Object|null
 * - getDisabledButtons(): string[]
 * - parseFromHtml(htmlString): Block|null
 * - parseFromMarkdown(markdownString): Block|null
 * - canParseHtml(htmlString): boolean
 * - canParseMarkdown(markdownString): boolean
 * 
 * Properties (getters/setters):
 * - type: string
 * - content: string
 * - html: string
 * - nested: boolean
 */

export const BlockInterfaceContract = {
    /**
     * Required instance methods
     */
    INSTANCE_METHODS: [
        'handleKeyPress',
        'handleEnterKey', 
        'applyTransformation',
        'toMarkdown',
        'toHtml',
        'renderToElement'
    ],
    
    /**
     * Required static methods
     */
    STATIC_METHODS: [
        'getMarkdownTriggers',
        'matchesMarkdownTrigger',
        'getToolbarConfig',
        'getDisabledButtons',
        'parseFromHtml',
        'parseFromMarkdown',
        'canParseHtml',
        'canParseMarkdown'
    ],
    STATIC_METHODS: [
        'getMarkdownTriggers',
        'matchesMarkdownTrigger',
        'getToolbarConfig',
        'getDisabledButtons'
    ],
    
    /**
     * Required properties (with getters/setters)
     */
    PROPERTIES: [
        'type',
        'content', 
        'html',
        'nested'
    ],

    /**
     * Validate that a block class implements the required interface
     * @param {Function} BlockClass - The block class to validate
     * @returns {boolean} - true if implements interface, false otherwise
     */
    validate(BlockClass) {
        // Check static methods
        for (const method of this.STATIC_METHODS) {
            if (typeof BlockClass[method] !== 'function') {
                console.warn(`Block class ${BlockClass.name} missing static method: ${method}`);
                return false;
            }
        }

        // Check instance methods by creating a temporary instance
        try {
            const instance = new BlockClass();
            
            for (const method of this.INSTANCE_METHODS) {
                if (typeof instance[method] !== 'function') {
                    console.warn(`Block class ${BlockClass.name} missing instance method: ${method}`);
                    return false;
                }
            }

            // Check properties (getters/setters)
            for (const prop of this.PROPERTIES) {
                const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(instance), prop) ||
                                 Object.getOwnPropertyDescriptor(instance, prop);
                if (!descriptor || (!descriptor.get && !descriptor.set && instance[prop] === undefined)) {
                    console.warn(`Block class ${BlockClass.name} missing property: ${prop}`);
                    return false;
                }
            }
            
            return true;
        } catch (error) {
            console.warn(`Error validating block class ${BlockClass.name}:`, error);
            return false;
        }
    }
};
