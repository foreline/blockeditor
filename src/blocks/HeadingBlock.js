'use strict';

import {BaseBlock} from "@/blocks/BaseBlock";
import {BlockType} from "@/BlockType";
import {Toolbar} from "@/Toolbar";
import {Editor} from "@/Editor";

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
     */
    applyTransformation() {
        // Get the current block and convert it to a heading
        const editorInstance = Editor.getInstanceFromElement(document.activeElement);
        const currentBlock = editorInstance?.currentBlock;
        if (!currentBlock) return;
        
        // Update block attributes
        currentBlock.setAttribute('data-block-type', `h${this.level}`);
        currentBlock.className = `block block-h${this.level}`;
    // Prevent typing directly into the block container; edits should happen inside the heading element
    currentBlock.setAttribute('contenteditable', 'false');
        
        // Get existing content
        const existingContent = currentBlock.textContent || '';
        
        // Create heading element
        const headingElement = document.createElement(`h${this.level}`);
        headingElement.textContent = existingContent;
        
        // Replace content with heading
        currentBlock.innerHTML = '';
        currentBlock.appendChild(headingElement);
        
        // Make the heading element editable
        headingElement.setAttribute('contenteditable', 'true');
        
        // Focus the heading element if the block was focused
        if (document.activeElement === currentBlock || 
            currentBlock.contains(document.activeElement)) {
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
            'editor-toolbar-bold',
            'editor-toolbar-italic', 
            'editor-toolbar-underline',
            'editor-toolbar-strikethrough',
            'editor-toolbar-quote',
            'editor-toolbar-ul',
            'editor-toolbar-ol',
            'editor-toolbar-sq',
            'editor-toolbar-code',
            'editor-toolbar-delimiter',
            'editor-toolbar-table',
            'editor-toolbar-image'
        ];
    }

    /**
     * Convert this heading block to markdown
     * @returns {string} - markdown representation
     */
    toMarkdown() {
        const hashes = '#'.repeat(this.level);
        return `${hashes} ${this._content}`;
    }

    /**
     * Convert this heading block to HTML
     * @returns {string} - HTML representation
     */
    toHtml() {
        return `<h${this.level}>${this._content}</h${this.level}>`;
    }

    /**
     * Render this heading block as an HTML element
     * @returns {HTMLElement} - DOM element representation
     */
    renderToElement() {
        let element = document.createElement('div');
        element.classList.add('block');
        element.classList.add(`block-h${this.level}`);
        element.setAttribute('data-block-type', this._type);
        element.setAttribute('data-placeholder', 'Type "/" to insert block');
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
