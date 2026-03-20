'use strict';

import {ListBlock} from "@/blocks/ListBlock";
import {BlockType} from "@/BlockType";
import {Toolbar} from "@/Toolbar";
import {Editor} from "@/Editor";

/**
 * Ordered list block
 */
export class OrderedListBlock extends ListBlock
{
    constructor(content = '', html = '', nested = false) {
        super(BlockType.OL, content, html, nested);
    }

    /**
     * Handle key press for ordered list blocks
     * @param {KeyboardEvent} event
     * @param {string} text - current text content of the block
     * @returns {boolean} - true if key was handled, false otherwise
     */
    handleKeyPress(event, text) {
        // Handle numbering and list continuation
        return false;
    }

    static getMarkdownTriggers() {
        // Include both space and dot variants for basic trigger list
        return ['1 ', '1.', '1) '];
    }

    /**
     * Support regex-based trigger matching for ordered list prefixes
     */
    static matchesMarkdownTrigger(text) {
        return /^\d+(?:[\.)])?\s/.test(text);
    }

    /**
     * Compute remaining content after removing an ordered trigger
     * @param {string} text
     * @returns {string}
     */
    static computeRemainingContent(text) {
        return text.replace(/^\d+(?:[\.)])?\s/, '');
    }

    applyTransformation() {
        // Transform current paragraph block into an ordered list block in-place
        const editorInstance = Editor.getInstanceFromElement(document.activeElement);
        const currentBlock = editorInstance?.currentBlock;
        if (!currentBlock) return;

        // Update attributes/classes
        currentBlock.setAttribute('data-block-type', 'ol');
        currentBlock.className = 'block block-ol';
        currentBlock.setAttribute('contenteditable', 'false');

        // Existing text after trigger removal
        const existingContent = (currentBlock.textContent || '').trim();

        // Build OL with a single editable LI
        const ol = document.createElement('ol');
        const li = document.createElement('li');
        li.contentEditable = true;
        li.textContent = existingContent;
        ol.appendChild(li);

        currentBlock.innerHTML = '';
        currentBlock.appendChild(ol);

        requestAnimationFrame(() => {
            try {
                li.focus();
                if (li.textContent.length) {
                    const range = document.createRange();
                    const sel = window.getSelection();
                    range.selectNodeContents(li);
                    range.collapse(false);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            } catch (_) { /* noop in tests */ }
        });
    }

    /**
     * Create a new ordered list item
     * @param {HTMLElement} currentBlock - The block containing the list
     * @param {HTMLElement} currentListItem - The current list item
     */
    createNewListItem(currentBlock, currentListItem) {
        // Find the ol element within the block
        const olElement = currentBlock && typeof currentBlock.querySelector === 'function' 
            ? currentBlock.querySelector('ol') 
            : null;
        
        if (!olElement) {
            return false;
        }
        
        // Create new list item
        const newListItem = document.createElement('li');
        newListItem.contentEditable = true;
        
        // Append to the ol element
        olElement.appendChild(newListItem);
        
        // Focus on the new list item
        const editorInstance = Editor.getInstanceFromElement(currentBlock);
        if (editorInstance) {
            editorInstance.setCurrentBlock(currentBlock); // Keep the same block
        }
        
        // Use requestAnimationFrame to ensure DOM is updated before focusing
        requestAnimationFrame(() => {
            newListItem.focus();
            
            // Place cursor at the beginning of the new list item
            if (window.getSelection && newListItem.nodeType === Node.ELEMENT_NODE) {
                try {
                    const selection = window.getSelection();
                    const range = document.createRange();
                    range.setStart(newListItem, 0);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                } catch (e) {
                    // Silently fail for cursor positioning if it fails (e.g., in tests)
                }
            }
        });
        
        return true;
    }

    /**
     * Get toolbar configuration for ordered lists
     * @returns {Object} - toolbar button configuration
     */
    static getToolbarConfig() {
        return {
            class: 'editor-toolbar-ol',
            icon: 'fa-list-ol',
            title: 'Numbered List',
            group: 'lists'
        };
    }

    /**
     * Convert this ordered list block to markdown
     * @returns {string} - markdown representation
     */
    toMarkdown() {
        const items = this._content.split('\n');
        return items.map((item, index) => `${index + 1}. ${item}`).join('\n');
    }

    /**
     * Convert this ordered list block to HTML
     * @returns {string} - HTML representation
     */
    toHtml() {
        const items = this._content.split('\n');
        const listItems = items.map(item => `<li>${item}</li>`).join('\n');
        return `<ol>\n${listItems}\n</ol>`;
    }

    /**
     * Render this ordered list block as an HTML element
     * @returns {HTMLElement} - DOM element representation
     */
    renderToElement() {
        // Create div wrapper for the block
        let element = document.createElement('div');
        element.classList.add('block');
        element.classList.add('block-ol');
        element.setAttribute('data-block-type', 'ol');
        element.setAttribute('data-placeholder', 'List item');
        
        // Create the actual ol element
        let olElement = document.createElement('ol');
        
        const items = this._content.split('\n').filter(item => item.trim());
        if (items.length === 0) {
            const li = document.createElement('li');
            li.contentEditable = true;
            olElement.appendChild(li);
        } else {
            items.forEach(item => {
                const li = document.createElement('li');
                li.textContent = item;
                li.contentEditable = true;
                olElement.appendChild(li);
            });
        }
        
        // Append ol to the div wrapper
        element.appendChild(olElement);
        
        return element;
    }

    /**
     * Check if this block type can parse the given HTML
     * @param {string} htmlString - HTML to check
     * @returns {boolean} - true if can parse, false otherwise
     */
    static canParseHtml(htmlString) {
        return /^<ol[^>]*>/i.test(htmlString);
    }

    /**
     * Parse HTML string to create an ordered list block instance
     * @param {string} htmlString - HTML to parse
     * @returns {OrderedListBlock|null} - Block instance or null if can't parse
     */
    static parseFromHtml(htmlString) {
        if (!this.canParseHtml(htmlString)) return null;

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        const ol = doc.querySelector('ol');
        
        if (!ol) return null;
        
        const items = Array.from(ol.querySelectorAll('li')).map(li => li.textContent.trim());
        const content = items.join('\n');
        
        return new OrderedListBlock(content, htmlString);
    }

    /**
     * Check if this block type can parse the given markdown
     * @param {string} markdownString - Markdown to check
     * @returns {boolean} - true if can parse, false otherwise
     */
    static canParseMarkdown(markdownString) {
        const lines = markdownString.trim().split('\n');
        return lines.every(line => /^\d+\.\s/.test(line.trim()));
    }

    /**
     * Parse markdown string to create an ordered list block instance
     * @param {string} markdownString - Markdown to parse
     * @returns {OrderedListBlock|null} - Block instance or null if can't parse
     */
    static parseFromMarkdown(markdownString) {
        if (!this.canParseMarkdown(markdownString)) return null;
        
        const lines = markdownString.trim().split('\n');
        const items = lines.map(line => line.replace(/^\d+\.\s/, ''));
        const content = items.join('\n');
        
        return new OrderedListBlock(content);
    }
}
