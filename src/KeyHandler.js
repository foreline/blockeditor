'use strict';

import {BlockFactory} from "@/blocks/BlockFactory";
import {Utils} from "@/Utils";
import {log} from "@/utils/log.js";
import {eventEmitter, EVENTS} from "@/utils/eventEmitter.js";

/**
 * Centralized key handling system for the editor
 */
export class KeyHandler
{
    /**
     * Handle key press events
     * @param {KeyboardEvent} e
     * @param {Editor} editorInstance - The editor instance
     */
    static handleKeyPress(e, editorInstance) {
        log('handleKeyPress()', 'KeyHandler.'); 
        
        editorInstance.keybuffer.push(e.key);
        
        // Emit user key press event
        editorInstance.eventEmitter.emit(EVENTS.USER_KEY_PRESS, {
            key: e.key,
            code: e.code,
            ctrlKey: e.ctrlKey,
            altKey: e.altKey,
            shiftKey: e.shiftKey,
            timestamp: Date.now(),
            blockId: editorInstance.currentBlock ? (editorInstance.currentBlock.getAttribute('data-block-id') || editorInstance.currentBlock.id) : null
        }, { throttle: 50, source: 'user.keypress' });
        
        if (!editorInstance.currentBlock) {
            return;
        }

        const innerHtml = editorInstance.currentBlock.innerHTML;
        const text = Utils.stripTags(innerHtml);

        // Note: Block conversion is now primarily handled by the input event listener
        // to avoid performance issues with excessive checking on every keystroke.
        // This keypress handler focuses on special key behaviors.

        // Let the current block handle the key press immediately (for other behaviors)
        const currentBlock = editorInstance.currentBlock;
        if (currentBlock && currentBlock.dataset && currentBlock.dataset.blockType) {
            const blockType = currentBlock.dataset.blockType;
            const block = BlockFactory.createBlock(blockType);
            
            if (block.handleKeyPress(e, text)) {
                // Block handled the key press, update immediately
                editorInstance.update();
                return;
            }
        }

        // Block conversion (markdown shortcuts) is handled by the input event listener in Editor.js
        // No need to handle it here as the input event will fire after key events

        // Default behavior - update immediately for other keys
        editorInstance.update();
    }

    /**
     * Handle special key combinations
     * @param {KeyboardEvent} e
     * @param {Editor} editorInstance - The editor instance
     */
    static handleSpecialKeys(e, editorInstance) {
        log('handleSpecialKeys()', 'KeyHandler.');
        
        if ('Enter' === e.key && !e.shiftKey) {
            return this.handleEnterKey(e, editorInstance);
        }
        
        if ('Backspace' === e.key) {
            return this.handleBackspaceKey(e, editorInstance);
        }
        
        if ('Delete' === e.key) {
            return this.handleDeleteKey(e, editorInstance);
        }
        
        if ('Tab' === e.key) {
            // Let individual block types handle tab
            const currentBlock = editorInstance.currentBlock;
            if (currentBlock && currentBlock.dataset && currentBlock.dataset.blockType) {
                const blockType = currentBlock.dataset.blockType;
                const block = BlockFactory.createBlock(blockType);
                
                if (block.handleKeyPress(e, '')) {
                    return;
                }
            }
            
            // Default tab behavior
            e.preventDefault();
            // Could call Toolbar.tab() here if that functionality exists
        }
    }

    /**
     * Handle Enter key press
     * @param {KeyboardEvent} e
     * @param {Editor} editorInstance - The editor instance
     */
    static handleEnterKey(e, editorInstance) {
        log('handleEnterKey()', 'KeyHandler.');

        let currentBlock = editorInstance.currentBlock;
        
        // If currentBlock is null or detached, try to recover by finding the last block
        if (!currentBlock || !currentBlock.isConnected) {
            const container = editorInstance.instance;
            if (container) {
                const lastBlock = container.querySelector('.block:last-child');
                if (lastBlock) {
                    editorInstance.setCurrentBlock(lastBlock);
                    currentBlock = lastBlock;
                } else {
                    return;
                }
            } else {
                return;
            }
        }

        // Check for code block creation trigger (triple backticks)
        let ticksCounter = 0;
        for (let i = editorInstance.keybuffer.length; i >= 0; i--) {
            const j = i - 1;
            const sliceKey = editorInstance.keybuffer[j];
            
            // Stop at previous Enter
            if ('Enter' === sliceKey) {
                break;
            }
            
            if ('`' === sliceKey) {
                ticksCounter++;
            }
            
            if (3 === ticksCounter) {
                // Create code block
                const codeBlock = BlockFactory.createBlock('code');
                codeBlock.applyTransformation();
                editorInstance.update();
                return;
            }
        }

        // Let the current block type handle the Enter key first
        if (currentBlock.dataset && currentBlock.dataset.blockType) {
            const blockType = currentBlock.dataset.blockType;
            const block = BlockFactory.createBlock(blockType);
            
            if (block.handleEnterKey(e)) {
                editorInstance.update();
                return;
            }
        }
        
        // If block didn't handle the Enter key, check if cursor is at the end for default behavior
        const selection = window.getSelection();
        if (!selection.rangeCount) {
            return;
        }
        const range = selection.getRangeAt(0);
        
        // Use the block's isAtEnd method if available, otherwise use the generic method
        let isAtEnd = false;
        if (currentBlock.dataset && currentBlock.dataset.blockType) {
            const blockType = currentBlock.dataset.blockType;
            const block = BlockFactory.createBlock(blockType);
            
            if (block.isAtEnd && typeof block.isAtEnd === 'function') {
                isAtEnd = block.isAtEnd(currentBlock, range);
            } else {
                isAtEnd = this.isCursorAtEndOfBlock(currentBlock, range);
            }
        } else {
            isAtEnd = this.isCursorAtEndOfBlock(currentBlock, range);
        }
        
        if (isAtEnd) {
            // If we are inside a list item and at the end, but the block handler
            // didn't consume the event for some reason, create a new list item instead
            const li = (range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.parentElement : range.startContainer)?.closest?.('li');
            if (li) {
                const blockType = currentBlock.dataset && currentBlock.dataset.blockType;
                const block = BlockFactory.createBlock(blockType);
                if (block && typeof block.createNewListItem === 'function') {
                    e.preventDefault();
                    block.createNewListItem(currentBlock, li);
                    editorInstance.update();
                    return;
                }
            }

            // Default behavior - add new default block when cursor is at the end
            e.preventDefault();
            editorInstance.addDefaultBlock();
        }
        // If cursor is not at the end, let the browser handle default behavior (line break)
    }

    /**
     * Check if cursor is at the end of the current block
     * @param {HTMLElement} block
     * @param {Range} range
     * @returns {boolean}
     */
    static isCursorAtEndOfBlock(block, range) {
        if (!range || !block) {
            return false;
        }

        // Check if the range is collapsed (cursor position, not selection)
        if (!range.collapsed) {
            return false;
        }

        // Get the text content length of the block
        const textContent = block.textContent || '';
        const textLength = textContent.length;
        
        // Calculate the current cursor position within the block
        const preRange = range.cloneRange();
        preRange.selectNodeContents(block);
        preRange.setEnd(range.endContainer, range.endOffset);
        const cursorPosition = preRange.toString().length;
        
        // Consider cursor at end if it's within 2 characters of the end
        // (accounts for trailing spaces or formatting)
        return cursorPosition >= textLength - 2;
    }

    /**
     * Handle Backspace key press
     * @param {KeyboardEvent} e
     * @param {Editor} editorInstance - The editor instance
     */
    static handleBackspaceKey(e, editorInstance) 
    {
        log('handleBackspaceKey()', 'KeyHandler.');

        const currentBlock = editorInstance.currentBlock;
        if (!currentBlock) {
            return;
        }

        // Check if current block is empty (only whitespace or no content)
        const text = Utils.stripTags(currentBlock.innerHTML).trim();
        
        // Only handle backspace for empty blocks
        if (text === '') {
            // Find the previous block
            const previousBlock = currentBlock.previousElementSibling;
            
            // Don't remove the last remaining block
            const allBlocks = editorInstance.instance.querySelectorAll('.block');
            if (allBlocks.length <= 1) {
                return;
            }
            
            // Remove the empty block and focus on previous block
            if (previousBlock && previousBlock.classList.contains('block')) {
                editorInstance.setCurrentBlock(previousBlock);
                currentBlock.remove();
                editorInstance.focus(previousBlock);
                editorInstance.update();
                e.preventDefault();
                return;
            } else {
                // If no previous block, focus on next block (if exists)
                const nextBlock = currentBlock.nextElementSibling;
                if (nextBlock && nextBlock.classList.contains('block')) {
                    editorInstance.setCurrentBlock(nextBlock);
                    currentBlock.remove();
                    editorInstance.focus(nextBlock);
                    editorInstance.update();
                    e.preventDefault();
                    return;
                }
            }
        }

        // Let the current block type handle the backspace key if not handled above
        if (currentBlock.dataset && currentBlock.dataset.blockType) {
            const blockType = currentBlock.dataset.blockType;
            const block = BlockFactory.createBlock(blockType);
            
            if (block.handleBackspaceKey && block.handleBackspaceKey(e)) {
                editorInstance.update();
                return;
            }
        }
    }

    /**
     * Handle Delete key press
     * @param {KeyboardEvent} e
     * @param {Editor} editorInstance - The editor instance
     */
    static handleDeleteKey(e, editorInstance) 
    {
        log('handleDeleteKey()', 'KeyHandler.');

        const currentBlock = editorInstance.currentBlock;
        if (!currentBlock) {
            return;
        }

        // Check if current block is empty (only whitespace or no content)
        const text = Utils.stripTags(currentBlock.innerHTML).trim();
        
        // Only handle delete for empty blocks
        if (text === '') {
            // Find the next block
            const nextBlock = currentBlock.nextElementSibling;
            
            // Don't remove the last remaining block
            const allBlocks = editorInstance.instance.querySelectorAll('.block');
            if (allBlocks.length <= 1) {
                return;
            }
            
            // Remove the empty block and focus on next block
            if (nextBlock && nextBlock.classList.contains('block')) {
                editorInstance.setCurrentBlock(nextBlock);
                currentBlock.remove();
                editorInstance.focus(nextBlock);
                editorInstance.update();
                e.preventDefault();
                return;
            } else {
                // If no next block, focus on previous block (if exists)
                const previousBlock = currentBlock.previousElementSibling;
                if (previousBlock && previousBlock.classList.contains('block')) {
                    editorInstance.setCurrentBlock(previousBlock);
                    currentBlock.remove();
                    editorInstance.focus(previousBlock);
                    editorInstance.update();
                    e.preventDefault();
                    return;
                }
            }
        }

        // Let the current block type handle the delete key if not handled above
        if (currentBlock.dataset && currentBlock.dataset.blockType) {
            const blockType = currentBlock.dataset.blockType;
            const block = BlockFactory.createBlock(blockType);
            
            if (block.handleDeleteKey && block.handleDeleteKey(e)) {
                editorInstance.update();
                return;
            }
        }
    }

    /**
     * Clear the key buffer
     * @param {Editor} editorInstance - The editor instance
     */
    static clearKeyBuffer(editorInstance) {
        editorInstance.keybuffer = [];
    }

    /**
     * Get the current key buffer
     * @param {Editor} editorInstance - The editor instance
     * @returns {string[]}
     */
    static getKeyBuffer(editorInstance) {
        return [...editorInstance.keybuffer];
    }
}
