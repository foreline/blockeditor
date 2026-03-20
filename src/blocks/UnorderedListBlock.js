'use strict';

import {ListBlock} from "@/blocks/ListBlock";
import {BlockType} from "@/BlockType";
import {Editor} from "@/Editor";

/**
 * Unordered list block
 */
export class UnorderedListBlock extends ListBlock
{
    constructor(content = '', html = '', nested = false) {
        super(BlockType.UL, content, html, nested);
    }

    /**
     * Handle key press for unordered list blocks
     * @param {KeyboardEvent} event
     * @param {string} text - current text content of the block
     * @returns {boolean} - true if key was handled, false otherwise
     */
    handleKeyPress(event, text) {
        // Handle indentation and list continuation
        return false;
    }

    static getMarkdownTriggers() {
        // Keep simple triggers for fallback/length comparison, but support '+' too
        return ['* ', '- ', '+ '];
    }

    /**
     * Support regex-based trigger matching for any unordered bullet
     */
    static matchesMarkdownTrigger(text) {
        return /^(\*|\-|\+)\s/.test(text);
    }

    /**
     * Compute remaining content after removing a bullet trigger
     * @param {string} text
     * @returns {string}
     */
    static computeRemainingContent(text) {
        return text.replace(/^(\*|\-|\+)\s/, '');
    }

    applyTransformation(targetElement, editorInstance) {
        // Transform current paragraph block into an unordered list block in-place
        if (!targetElement) return;

        // Update block attributes/classes
        targetElement.setAttribute('data-block-type', 'ul');
        targetElement.className = 'block block-ul';
        targetElement.setAttribute('contenteditable', 'false');

        // Capture existing text (Editor.convertBlockType already removed trigger)
        const existingContent = (targetElement.textContent || '').trim();

        // Build UL with a single editable LI
        const ul = document.createElement('ul');
        const li = document.createElement('li');
        li.contentEditable = true;
        li.textContent = existingContent;
        ul.appendChild(li);

        // Replace inner content
        targetElement.innerHTML = '';
        targetElement.appendChild(ul);

        // Focus the LI
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
     * Create a new unordered list item
     * @param {HTMLElement} currentBlock - The block containing the list
     * @param {HTMLElement} currentListItem - The current list item
     */
    createNewListItem(currentBlock, currentListItem) {
        // Find the ul element within the block
        const ulElement = currentBlock && typeof currentBlock.querySelector === 'function' 
            ? currentBlock.querySelector('ul') 
            : null;
        
        if (!ulElement) {
            return false;
        }
        
        // Create new list item
        const newListItem = document.createElement('li');
        newListItem.contentEditable = true;
        
        // Append to the ul element
        ulElement.appendChild(newListItem);
        
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
     * Get toolbar configuration for unordered lists
     * @returns {Object} - toolbar button configuration
     */
    static getToolbarConfig() {
        return {
            class: 'editor-toolbar-ul',
            icon: 'fa-list',
            title: 'Bullet List',
            group: 'lists'
        };
    }

    /**
     * Sync internal state from the associated DOM element
     */
    syncFromElement() {
        if (!this._element) return;
        const items = this._element.querySelectorAll('li');
        this._content = Array.from(items).map(li => li.textContent || '').join('\n');
    }

    /**
     * Convert this unordered list block to markdown
     * @returns {string} - markdown representation
     */
    toMarkdown() {
        this.syncFromElement();
        const items = this._content.split('\n');
        return items.map(item => `- ${item}`).join('\n');
    }

    /**
     * Convert this unordered list block to HTML
     * @returns {string} - HTML representation
     */
    toHtml() {
        this.syncFromElement();
        const items = this._content.split('\n');
        const listItems = items.map(item => `<li>${item}</li>`).join('\n');
        return `<ul>\n${listItems}\n</ul>`;
    }

    /**
     * Render this unordered list block as an HTML element
     * @returns {HTMLElement} - DOM element representation
     */
    renderToElement() {
        // Create div wrapper for the block
        let element = document.createElement('div');
        element.classList.add('block');
        element.classList.add('block-ul');
        element.setAttribute('data-block-type', 'ul');
        element.setAttribute('data-placeholder', 'List item');
        
        // Create the actual ul element
        let ulElement = document.createElement('ul');
        
        const items = this._content.split('\n').filter(item => item.trim());
        if (items.length === 0) {
            const li = document.createElement('li');
            li.contentEditable = true;
            ulElement.appendChild(li);
        } else {
            items.forEach(item => {
                const li = document.createElement('li');
                li.textContent = item;
                li.contentEditable = true;
                ulElement.appendChild(li);
            });
        }
        
        // Append ul to the div wrapper
        element.appendChild(ulElement);
        
        return element;
    }

    /**
     * Check if this block type can parse the given HTML
     * @param {string} htmlString - HTML to check
     * @returns {boolean} - true if can parse, false otherwise
     */
    static canParseHtml(htmlString) {
        return /^<ul[^>]*>/i.test(htmlString);
    }

    /**
     * Parse HTML string to create an unordered list block instance
     * @param {string} htmlString - HTML to parse
     * @returns {UnorderedListBlock|null} - Block instance or null if can't parse
     */
    static parseFromHtml(htmlString) {
        if (!this.canParseHtml(htmlString)) return null;

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        const ul = doc.querySelector('ul');
        
        if (!ul) return null;
        
        const items = Array.from(ul.querySelectorAll('li')).map(li => li.textContent.trim());
        const content = items.join('\n');
        
        return new UnorderedListBlock(content, htmlString);
    }

    /**
     * Check if this block type can parse the given markdown
     * @param {string} markdownString - Markdown to check
     * @returns {boolean} - true if can parse, false otherwise
     */
    static canParseMarkdown(markdownString) {
        const lines = markdownString.trim().split('\n');
        return lines.every(line => /^[-*+]\s/.test(line.trim()));
    }

    /**
     * Parse markdown string to create an unordered list block instance
     * @param {string} markdownString - Markdown to parse
     * @returns {UnorderedListBlock|null} - Block instance or null if can't parse
     */
    static parseFromMarkdown(markdownString) {
        if (!this.canParseMarkdown(markdownString)) return null;
        
        const lines = markdownString.trim().split('\n');
        const items = lines.map(line => line.replace(/^[-*+]\s/, ''));
        const content = items.join('\n');
        
        return new UnorderedListBlock(content);
    }
}
