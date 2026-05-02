'use strict';

import {BaseBlock} from "@/blocks/BaseBlock";
import {BlockType} from "@/BlockType";

/**
 * Quote block
 */
export class QuoteBlock extends BaseBlock
{
    constructor(content = '', html = '', nested = false) {
        super(BlockType.QUOTE, content, html, nested);
    }

    /**
     * Handle key press for quote blocks
     * @param {KeyboardEvent} event
     * @param {string} text - current text content of the block
     * @returns {boolean} - true if key was handled, false otherwise
     */
    handleKeyPress(event, text) {
        // Quote blocks don't have special key handling
        return false;
    }

    /**
     * Handle Enter key press for quote blocks
     * @param {KeyboardEvent} event
     * @returns {boolean} - true if key was handled, false otherwise
     */
    handleEnterKey(event) {
        // Continue quote on new line or end quote
        return false;
    }

    static getMarkdownTriggers() {
        return ['> '];
    }

    applyTransformation(targetElement, editorInstance) {
        if (!targetElement) return;

        // Update block attributes
        targetElement.setAttribute('data-block-type', 'quote');
        targetElement.className = 'bke-block bke-block--quote';

        // Get existing content
        const existingContent = targetElement.textContent || '';

        // Create blockquote element
        const blockquote = document.createElement('blockquote');
        blockquote.setAttribute('contenteditable', 'true');
        blockquote.textContent = existingContent;

        // Replace content with blockquote
        targetElement.setAttribute('contenteditable', 'false');
        targetElement.innerHTML = '';
        targetElement.appendChild(blockquote);

        // Focus the blockquote element
        if (document.activeElement === targetElement ||
            targetElement.contains(document.activeElement)) {
            requestAnimationFrame(() => {
                blockquote.focus();
                const range = document.createRange();
                const selection = window.getSelection();
                range.selectNodeContents(blockquote);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            });
        }
    }

    /**
     * Sync internal state from the associated DOM element
     */
    syncFromElement() {
        if (!this._element) return;
        const bq = this._element.querySelector('blockquote');
        this._content = bq ? bq.textContent || '' : this._element.textContent || '';
    }

    /**
     * Convert this quote block to markdown
     * @returns {string} - markdown representation
     */
    toMarkdown() {
        this.syncFromElement();
        return `> ${this._content}`;
    }

    /**
     * Convert this quote block to HTML
     * @returns {string} - HTML representation
     */
    toHtml() {
        this.syncFromElement();
        return `<blockquote>${this._content}</blockquote>`;
    }

    /**
     * Render this quote block as an HTML element
     * @returns {HTMLElement} - DOM element representation
     */
    renderToElement() {
        let element = document.createElement('div');
        element.classList.add('bke-block');
        element.classList.add('bke-block--quote');
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
        return /^<blockquote[^>]*>/i.test(htmlString);
    }

    /**
     * Parse HTML string to create a quote block instance
     * @param {string} htmlString - HTML to parse
     * @returns {QuoteBlock|null} - Block instance or null if can't parse
     */
    static parseFromHtml(htmlString) {
        const match = htmlString.match(/^<blockquote[^>]*>(.*?)<\/blockquote>/i);
        if (!match) return null;

        const content = match[1].trim();
        return new QuoteBlock(content, htmlString);
    }

    /**
     * Check if this block type can parse the given markdown
     * @param {string} markdownString - Markdown to check
     * @returns {boolean} - true if can parse, false otherwise
     */
    static canParseMarkdown(markdownString) {
        return /^>\s/.test(markdownString.trim());
    }

    /**
     * Parse markdown string to create a quote block instance
     * @param {string} markdownString - Markdown to parse
     * @returns {QuoteBlock|null} - Block instance or null if can't parse
     */
    static parseFromMarkdown(markdownString) {
        const match = markdownString.trim().match(/^>\s+(.*)$/);
        if (!match) return null;

        const content = match[1].trim();
        const html = `<blockquote>${content}</blockquote>`;
        return new QuoteBlock(content, html);
    }
}
