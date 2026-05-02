'use strict';

import {BaseBlock} from "@/blocks/BaseBlock";
import {BlockType} from "@/BlockType";

/**
 * Delimiter block (horizontal rule)
 */
export class DelimiterBlock extends BaseBlock
{
    constructor(content = '', html = '', nested = false) {
        super(BlockType.DELIMITER, content, html, nested);
    }

    /**
     * Handle key press for delimiter blocks
     * @param {KeyboardEvent} event
     * @param {string} text - current text content of the block
     * @returns {boolean} - true if key was handled, false otherwise
     */
    handleKeyPress(event, text) {
        // Delimiters are typically not editable
        return false;
    }

    /**
     * Handle Enter key press for delimiter blocks
     * @param {KeyboardEvent} event
     * @returns {boolean} - true if key was handled, false otherwise
     */
    handleEnterKey(event) {
        // Create new paragraph after delimiter
        return false;
    }

    static getMarkdownTriggers() {
        return ['---', '***', '___'];
    }

    applyTransformation(targetElement, editorInstance) {
        if (!targetElement) return;

        // Update block attributes
        targetElement.setAttribute('data-block-type', 'delimiter');
        targetElement.className = 'bke-block bke-block--delimiter';
        targetElement.setAttribute('contenteditable', 'false');

        // Replace content with <hr>
        const hr = document.createElement('hr');
        targetElement.innerHTML = '';
        targetElement.appendChild(hr);

        // Update the editor
        if (editorInstance) {
            editorInstance.update();
        }
    }

    /**
     * Render this delimiter block as an HTML element
     * @returns {HTMLElement} - DOM element representation
     */
    renderToElement() {
        let element = document.createElement('hr');
        element.classList.add('bke-block');
        element.classList.add('bke-block--delimiter');
        element.setAttribute('data-block-type', 'delimiter');
        element.contentEditable = false; // Delimiters are not editable
        
        return element;
    }

    /**
     * Check if this block type can parse the given HTML
     * @param {string} htmlString - HTML to check
     * @returns {boolean} - true if can parse, false otherwise
     */
    static canParseHtml(htmlString) {
        return /^<hr[^>]*\/?>/i.test(htmlString);
    }

    /**
     * Parse HTML string to create a delimiter block instance
     * @param {string} htmlString - HTML to parse
     * @returns {DelimiterBlock|null} - Block instance or null if can't parse
     */
    static parseFromHtml(htmlString) {
        if (!this.canParseHtml(htmlString)) return null;
        
        return new DelimiterBlock('', htmlString);
    }

    /**
     * Check if this block type can parse the given markdown
     * @param {string} markdownString - Markdown to check
     * @returns {boolean} - true if can parse, false otherwise
     */
    static canParseMarkdown(markdownString) {
        const trimmed = markdownString.trim();
        return /^---+$/.test(trimmed) || 
               /^\*\*\*+$/.test(trimmed) || 
               /^___+$/.test(trimmed);
    }

    /**
     * Parse markdown string to create a delimiter block instance
     * @param {string} markdownString - Markdown to parse
     * @returns {DelimiterBlock|null} - Block instance or null if can't parse
     */
    static parseFromMarkdown(markdownString) {
        if (!this.canParseMarkdown(markdownString)) return null;
        
        return new DelimiterBlock(markdownString.trim());
    }

    /**
     * Convert this delimiter block to markdown
     * @returns {string} - markdown representation
     */
    toMarkdown() {
        // Delimiters have no dynamic content to sync
        return '---';
    }

    /**
     * Convert this delimiter block to HTML
     * @returns {string} - HTML representation
     */
    toHtml() {
        return '<hr>';
    }
}
