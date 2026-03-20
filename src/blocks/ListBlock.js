'use strict';

import {BaseBlock} from "@/blocks/BaseBlock";
import {BlockType} from "@/BlockType";
import {Editor} from "@/Editor";

/**
 * List block types
 */
export class ListBlock extends BaseBlock
{
    /**
     * Handle Enter key press for list blocks
     * @param {KeyboardEvent} event
     * @returns {boolean} - true if key was handled, false otherwise
     */
    handleEnterKey(event) {
        // List blocks should create new list items or end the list if empty
        let currentBlock = event.target && typeof event.target.closest === 'function'
            ? event.target.closest('.block')
            : null;

        // Resolve current list item in a robust way (target may be LI or a child like SPAN)
        let currentListItem = null;
        if (event.target && typeof event.target.closest === 'function') {
            currentListItem = event.target.closest('li');
        }

        // Fallback: derive from current selection
        if (!currentListItem && typeof window !== 'undefined' && window.getSelection) {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const element = range.startContainer && range.startContainer.nodeType === Node.TEXT_NODE ?
                    range.startContainer.parentElement : range.startContainer;
                if (element && typeof element.closest === 'function') {
                    currentListItem = element.closest('li');
                    if (!currentBlock) {
                        currentBlock = element.closest('.block');
                    }
                }
            }
        }

        // As a last resort, if we have an LI, resolve the block from it
        if (!currentBlock && currentListItem && typeof currentListItem.closest === 'function') {
            currentBlock = currentListItem.closest('.block');
        }

        if (!currentBlock || !currentListItem) {
            return false;
        }

        const text = currentListItem.textContent.trim();
        
        // Check if this is the last list item in the list
        const listContainer = currentListItem.parentElement; // ul or ol
        const allItems = listContainer ? listContainer.querySelectorAll('li') : [];
        const isLastItem = allItems.length > 0 && allItems[allItems.length - 1] === currentListItem;
        
        // If the current list item is empty AND it's the last item, end the list
        if (text === '' && isLastItem) {
            // Remove the empty list item and create a new paragraph block
            event.preventDefault();
            currentListItem.remove();
            const editorInstance = Editor.getInstanceFromElement(currentBlock);
            if (editorInstance) {
                editorInstance.addDefaultBlock();
            }
            return true;
        }
        
        // If the current list item is empty but NOT the last item, let browser handle (remove empty item behavior)
        if (text === '') {
            return false;
        }
        
        // Check if cursor is at the end of the list item
    const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const isAtEnd = this.isAtEnd(currentBlock, range);
            
            if (isAtEnd && isLastItem) {
                // Create a new list item in the same list when at the end of the last non-empty item
                event.preventDefault();
                this.createNewListItem(currentBlock, currentListItem);
                return true;
            }
        }
        
        // If cursor is not at the end, let browser handle default behavior (line break)
        return false;
    }

    /**
     * Check if cursor is at the end of the last list item
     * List-specific implementation that considers the structure of lists
     * @param {HTMLElement} blockElement - The block containing the list
     * @param {Range} range - The current selection range
     * @returns {boolean} - true if cursor is at the end of the last list item
     */
    isAtEnd(blockElement, range) {
        if (!range || !blockElement) {
            return false;
        }

        // Check if the range is collapsed (cursor position, not selection)
        if (!range.collapsed) {
            return false;
        }

        // Find the current list item based on cursor position
        const element = range.startContainer.nodeType === Node.TEXT_NODE ? 
            range.startContainer.parentElement : range.startContainer;
        const currentListItem = element.closest('li');
        
        if (!currentListItem) {
            return false;
        }

        // Check if this is the last list item
        const listContainer = currentListItem.parentElement; // ul or ol
        const allItems = listContainer ? listContainer.querySelectorAll('li') : [];
        const isLastItem = allItems.length > 0 && allItems[allItems.length - 1] === currentListItem;
        
        if (!isLastItem) {
            return false;
        }

        // Check if cursor is at the end of this last list item
        const textContent = currentListItem.textContent || '';
        const textLength = textContent.length;
        
        // Calculate the current cursor position within the list item
        const preRange = range.cloneRange();
        preRange.selectNodeContents(currentListItem);
        preRange.setEnd(range.endContainer, range.endOffset);
        const cursorPosition = preRange.toString().length;
        
        // Consider cursor at end if it's within 2 characters of the end
        // (accounts for trailing spaces or formatting)
        return cursorPosition >= textLength - 2;
    }

    /**
     * Create a new list item of the same type
     * @param {HTMLElement} currentBlock - The block containing the list
     * @param {HTMLElement} currentListItem - The current list item
     */
    createNewListItem(currentBlock, currentListItem) {
        // This will be implemented by subclasses
        return false;
    }

    /**
     * Get toolbar configuration for list blocks
     * @returns {Object|null} - toolbar button configuration
     */
    static getToolbarConfig() {
        return null; // Individual list classes will provide their own config
    }

    /**
     * Convert this list block to markdown
     * @returns {string} - markdown representation
     */
    toMarkdown() {
        // This will be implemented by subclasses
        return this._content;
    }

    /**
     * Convert this list block to HTML
     * @returns {string} - HTML representation
     */
    toHtml() {
        // This will be implemented by subclasses
        return this._html;
    }
}
