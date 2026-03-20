'use strict';

import {BaseBlock} from "@/blocks/BaseBlock";
import {BlockType} from "@/BlockType";
import {Editor} from "@/Editor";

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

    applyTransformation() {
        const editorInstance = Editor.getInstanceFromElement(document.activeElement);
        const currentBlock = editorInstance?.currentBlock;
        if (!currentBlock) return;

        // Update block attributes
        currentBlock.setAttribute('data-block-type', 'quote');
        currentBlock.className = 'block block-quote';

        // Get existing content
        const existingContent = currentBlock.textContent || '';

        // Create blockquote element
        const blockquote = document.createElement('blockquote');
        blockquote.setAttribute('contenteditable', 'true');
        blockquote.textContent = existingContent;

        // Replace content with blockquote
        currentBlock.setAttribute('contenteditable', 'false');
        currentBlock.innerHTML = '';
        currentBlock.appendChild(blockquote);

        // Focus the blockquote element
        if (document.activeElement === currentBlock ||
            currentBlock.contains(document.activeElement)) {
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
     * Convert this quote block to markdown
     * @returns {string} - markdown representation
     */
    toMarkdown() {
        return `> ${this._content}`;
    }

    /**
     * Convert this quote block to HTML
     * @returns {string} - HTML representation
     */
    toHtml() {
        return `<blockquote>${this._content}</blockquote>`;
    }

    /**
     * Render this quote block as an HTML element
     * @returns {HTMLElement} - DOM element representation
     */
    renderToElement() {
        let element = document.createElement('div');
        element.classList.add('block');
        element.classList.add('block-quote');
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
