'use strict';

import {BlockType} from "@/BlockType";
import {BlockInterfaceContract} from "@/interfaces/BlockInterface";

/**
 * Base class for all block types
 * Implements the BlockInterface contract to ensure consistent behavior
 */
export class BaseBlock
{
    _type = BlockType.PARAGRAPH;
    _content = '';
    _html = '';
    _nested = false;
    _element = null;
    
    /**
     * @param {string} type
     * @param {string} content
     * @param {string} html
     * @param {boolean} nested
     */
    constructor(type = '', content = '', html = '', nested = false) {
        if ( 0 === type.length ) {
            type = BlockType.PARAGRAPH;
        }
        
        // Only convert from HTML tag if it's not already a BlockType value
        const blockTypeValues = [
            BlockType.H1, BlockType.H2, BlockType.H3, BlockType.H4, BlockType.H5, BlockType.H6,
            BlockType.PARAGRAPH, BlockType.CODE, BlockType.DELIMITER, BlockType.QUOTE,
            BlockType.UL, BlockType.OL, BlockType.SQ, BlockType.TABLE, BlockType.IMAGE
        ];
        
        if (!blockTypeValues.includes(type)) {
            type = BlockType.getBlockTypeFromHtmlTag(type);
        }
        
        this._type = type;
        this._content = content;
        this._html = html;
        this._nested = nested;
    }

    get type() {
        return this._type;
    }
    
    set type(value) {
        this._type = value;
    }
    
    get content() {
        return this._content;
    }
    
    set content(value) {
        this._content = value;
    }
    
    get html() {
        return this._html;
    }
    
    set html(value) {
        this._html = value;
    }
    
    get nested() {
        return this._nested;
    }
    
    set nested(value) {
        this._nested = value;
    }

    /**
     * Get the DOM element associated with this block
     * @returns {HTMLElement|null}
     */
    get element() {
        return this._element;
    }

    /**
     * Set the DOM element associated with this block
     * @param {HTMLElement|null} el
     */
    set element(el) {
        this._element = el;
    }

    /**
     * Sync internal state from the associated DOM element.
     * Called automatically before serialization to ensure content is current.
     * Override in subclasses for block-specific DOM structures.
     */
    syncFromElement() {
        if (!this._element) return;
        this._content = this._element.textContent || '';
        this._html = this._element.innerHTML || '';
    }

    /**
     * Handle key press for this block type
     * @param {KeyboardEvent} event
     * @param {string} text - current text content of the block
     * @returns {boolean} - true if key was handled, false otherwise
     */
    handleKeyPress(event, text) {
        // Override in subclasses
        return false;
    }

    /**
     * Handle Enter key press for this block type
     * @param {KeyboardEvent} event
     * @returns {boolean} - true if key was handled, false otherwise
     */
    handleEnterKey(event) {
        // Override in subclasses
        return false;
    }

    /**
     * Check if cursor is at the end of this block
     * Default implementation for simple blocks
     * @param {HTMLElement} blockElement - the DOM element of the block
     * @param {Range} range - the current selection range
     * @returns {boolean} - true if cursor is at the end
     */
    isAtEnd(blockElement, range) {
        if (!range || !blockElement) {
            return false;
        }

        // Check if the range is collapsed (cursor position, not selection)
        if (!range.collapsed) {
            return false;
        }

        // Get the text content length of the block
        const textContent = blockElement.textContent || '';
        const textLength = textContent.length;
        
        // Calculate the current cursor position within the block
        const preRange = range.cloneRange();
        preRange.selectNodeContents(blockElement);
        preRange.setEnd(range.endContainer, range.endOffset);
        const cursorPosition = preRange.toString().length;
        
        // Consider cursor at end if it's within 2 characters of the end
        // (accounts for trailing spaces or formatting)
        return cursorPosition >= textLength - 2;
    }

    /**
     * Get the markdown triggers that convert to this block type
     * @returns {string[]} - array of trigger strings
     */
    static getMarkdownTriggers() {
        return [];
    }

    /**
     * Check if text matches any of this block's markdown triggers
     * @param {string} text
     * @returns {boolean}
     */
    static matchesMarkdownTrigger(text) {
        const triggers = this.getMarkdownTriggers();
        return triggers.some(trigger => text.startsWith(trigger));
    }

    /**
     * Apply this block type transformation via toolbar
     * Should be overridden by subclasses to call appropriate Toolbar method
     * @param {HTMLElement} targetElement - The block DOM element to transform
     * @param {Object} editorInstance - The editor instance owning this block
     */
    applyTransformation(targetElement, editorInstance) {
        // Override in subclasses
    }

    /**
     * Get toolbar configuration for this block type
     * @returns {Object|null} - toolbar button configuration or null if no toolbar integration
     */
    static getToolbarConfig() {
        return null; // Override in subclasses for toolbar integration
    }

    /**
     * Get buttons that should be disabled when this block is active
     * @returns {string[]} - array of button class names that should be disabled
     */
    static getDisabledButtons() {
        return []; // Override in subclasses
    }

    /**
     * Convert this block to markdown
     * @returns {string} - markdown representation
     */
    toMarkdown() {
        this.syncFromElement();
        return this._content;
    }

    /**
     * Convert this block to HTML
     * @returns {string} - HTML representation
     */
    toHtml() {
        this.syncFromElement();
        return this._html;
    }

    /**
     * Render this block as an HTML element
     * @returns {HTMLElement} - DOM element representation
     */
    renderToElement() {
        // Default implementation - override in subclasses for custom rendering
        let element = document.createElement('div');
        element.classList.add('bke-block');
        element.setAttribute('data-block-type', this._type);
        element.setAttribute('data-placeholder', '');
        element.innerHTML = this._html || this._content || '';
        return element;
    }

    /**
     * Parse HTML string to create a block instance
     * @param {string} htmlString - HTML to parse
     * @returns {BaseBlock|null} - Block instance or null if can't parse
     */
    static parseFromHtml(htmlString) {
        // Override in subclasses for specific parsing logic
        return null;
    }

    /**
     * Parse markdown string to create a block instance
     * @param {string} markdownString - Markdown to parse
     * @returns {BaseBlock|null} - Block instance or null if can't parse
     */
    static parseFromMarkdown(markdownString) {
        // Override in subclasses for specific parsing logic
        return null;
    }

    /**
     * Check if this block type can parse the given HTML
     * @param {string} htmlString - HTML to check
     * @returns {boolean} - true if can parse, false otherwise
     */
    static canParseHtml(htmlString) {
        // Override in subclasses for specific detection logic
        return false;
    }

    /**
     * Check if this block type can parse the given markdown
     * @param {string} markdownString - Markdown to check
     * @returns {boolean} - true if can parse, false otherwise
     */
    static canParseMarkdown(markdownString) {
        // Override in subclasses for specific detection logic
        return false;
    }
}
