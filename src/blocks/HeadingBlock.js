'use strict';

import {BaseBlock} from "@/blocks/BaseBlock";
import {BlockType} from "@/BlockType";

/**
 * Heading block types (H1-H6)
 */
export class HeadingBlock extends BaseBlock
{
    constructor(level, content = '', html = '', nested = false) {
        const type = `h${level}`;
        super(type, content, html, nested);
        this.level = level;
    }

    /**
     * Handle key press for heading blocks
     * @param {KeyboardEvent} event
     * @param {string} text - current text content of the block
     * @returns {boolean} - true if key was handled, false otherwise
     */
    handleKeyPress(event, text) {
        // Headings don't have special key handling beyond markdown triggers
        return false;
    }

    /**
     * Handle Enter key press for heading blocks
     * @param {KeyboardEvent} event
     * @returns {boolean} - true if key was handled, false otherwise
     */
    handleEnterKey(event) {
        // After heading, create new paragraph
        return false;
    }

    /**
     * Apply heading transformation via toolbar
     * @param {HTMLElement} targetElement - The block DOM element to transform
     * @param {Object} editorInstance - The editor instance owning this block
     */
    applyTransformation(targetElement, editorInstance) {
        if (!targetElement) return;
        
        // Update block attributes
        targetElement.setAttribute('data-block-type', `h${this.level}`);
        targetElement.className = `bke-block bke-block--h${this.level}`;
        // Prevent typing directly into the block container; edits should happen inside the heading element
        targetElement.setAttribute('contenteditable', 'false');
        
        // Get existing content
        const existingContent = targetElement.textContent || '';
        
        // Create heading element
        const headingElement = document.createElement(`h${this.level}`);
        headingElement.textContent = existingContent;
        
        // Replace content with heading
        targetElement.innerHTML = '';
        targetElement.appendChild(headingElement);
        
        // Make the heading element editable
        headingElement.setAttribute('contenteditable', 'true');
        
        // Focus the heading element if the block was focused
        if (document.activeElement === targetElement || 
            targetElement.contains(document.activeElement)) {
            requestAnimationFrame(() => {
                headingElement.focus();
                // Place cursor at end
                const range = document.createRange();
                const selection = window.getSelection();
                range.selectNodeContents(headingElement);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            });
        }
    }

    /**
     * Get toolbar configuration for heading blocks
     * @returns {Object|null} - toolbar button configuration
     */
    static getToolbarConfig() {
        return null; // Individual heading classes will provide their own config
    }

    /**
     * Get buttons that should be disabled when heading is active
     * Headers can't be bold, italic, or contain lists
     * @returns {string[]} - array of button class names that should be disabled
     */
    static getDisabledButtons() {
        return [
            'bke-toolbar-bold',
            'bke-toolbar-italic', 
            'bke-toolbar-underline',
            'bke-toolbar-strikethrough',
            'bke-toolbar-quote',
            'bke-toolbar-ul',
            'bke-toolbar-ol',
            'bke-toolbar-sq',
            'bke-toolbar-code',
            'bke-toolbar-delimiter',
            'bke-toolbar-table',
            'bke-toolbar-image'
        ];
    }

    /**
     * Sync internal state from the associated DOM element
     */
    syncFromElement() {
        if (!this._element) return;
        const heading = this._element.querySelector(`h${this.level}`);
        this._content = heading ? heading.textContent || '' : this._element.textContent || '';
    }

    /**
     * Convert this heading block to markdown
     * @returns {string} - markdown representation
     */
    toMarkdown() {
        this.syncFromElement();
        const hashes = '#'.repeat(this.level);
        return `${hashes} ${this._content}`;
    }

    /**
     * Convert this heading block to HTML
     * @returns {string} - HTML representation
     */
    toHtml() {
        this.syncFromElement();
        return `<h${this.level}>${this._content}</h${this.level}>`;
    }

    /**
     * Render this heading block as an HTML element
     * @returns {HTMLElement} - DOM element representation
     */
    renderToElement() {
        let element = document.createElement('div');
        element.classList.add('bke-block');
        element.classList.add(`bke-block--h${this.level}`);
        element.setAttribute('data-block-type', this._type);
        element.setAttribute('data-placeholder', '');
        element.innerHTML = this._html || this._content || '';
        return element;
    }

    /**
     * Check if this block type can parse the given HTML
     * @param {string} htmlString - HTML to check
     * @returns {boolean} - true if can parse, false otherwise
     */
    static canParseHtml(htmlString) {
        return /^<h[1-6][^>]*>/i.test(htmlString);
    }

    /**
     * Parse HTML string to create a heading block instance
     * @param {string} htmlString - HTML to parse
     * @returns {HeadingBlock|null} - Block instance or null if can't parse
     */
    static parseFromHtml(htmlString) {
        const match = htmlString.match(/^<h([1-6])[^>]*>(.*?)<\/h\1>/i);
        if (!match) return null;

        const level = parseInt(match[1]);
        const content = match[2].trim();
        
        // Create the appropriate heading block dynamically
        return new HeadingBlock(level, content, htmlString);
    }

    /**
     * Check if this block type can parse the given markdown
     * @param {string} markdownString - Markdown to check
     * @returns {boolean} - true if can parse, false otherwise
     */
    static canParseMarkdown(markdownString) {
        return /^#{1,6}\s+/.test(markdownString.trim());
    }

    /**
     * Parse markdown string to create a heading block instance
     * @param {string} markdownString - Markdown to parse
     * @returns {HeadingBlock|null} - Block instance or null if can't parse
     */
    static parseFromMarkdown(markdownString) {
        const match = markdownString.trim().match(/^(#{1,6})\s+(.*)$/);
        if (!match) return null;

        const level = match[1].length;
        const content = match[2].trim();
        const html = `<h${level}>${content}</h${level}>`;
        
        // Create the appropriate heading block dynamically
        return new HeadingBlock(level, content, html);
    }
}
