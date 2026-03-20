'use strict';

import {BlockFactory} from "@/blocks/BlockFactory";
import {Utils} from "@/Utils";
import {log} from "@/utils/log.js";
import {eventEmitter, EVENTS} from "@/utils/eventEmitter.js";

/**
 * Centralized key handling system for the editor.
 * Each Editor instance creates its own KeyHandler instance.
 */
export class KeyHandler
{
    /**
     * @param {Editor} editorInstance - The editor instance this handler belongs to
     */
    constructor(editorInstance)
    {
        log('constructor()', 'KeyHandler.');
        this.editorInstance = editorInstance;

        /** @type {number|null} Sticky column offset preserved across consecutive ArrowUp/ArrowDown presses */
        this._desiredOffset = null;
    }

    /**
     * Handle key press events
     * @param {KeyboardEvent} e
     */
    handleKeyPress(e) {
        log('handleKeyPress()', 'KeyHandler.'); 

        // Any non-arrow key resets the sticky column
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') {
            this._desiredOffset = null;
        }
        
        this.editorInstance.keybuffer.push(e.key);
        
        // Emit user key press event
        this.editorInstance.eventEmitter.emit(EVENTS.USER_KEY_PRESS, {
            key: e.key,
            code: e.code,
            ctrlKey: e.ctrlKey,
            altKey: e.altKey,
            shiftKey: e.shiftKey,
            timestamp: Date.now(),
            blockId: this.editorInstance.currentBlock ? (this.editorInstance.currentBlock.getAttribute('data-block-id') || this.editorInstance.currentBlock.id) : null
        }, { throttle: 50, source: 'user.keypress' });
        
        if (!this.editorInstance.currentBlock) {
            return;
        }

        const innerHtml = this.editorInstance.currentBlock.innerHTML;
        const text = Utils.stripTags(innerHtml);

        // Note: Block conversion is now primarily handled by the input event listener
        // to avoid performance issues with excessive checking on every keystroke.
        // This keypress handler focuses on special key behaviors.

        // Let the current block handle the key press immediately (for other behaviors)
        const currentBlock = this.editorInstance.currentBlock;
        if (currentBlock && currentBlock.dataset && currentBlock.dataset.blockType) {
            const blockType = currentBlock.dataset.blockType;
            const block = BlockFactory.createBlock(blockType);
            
            if (block.handleKeyPress(e, text)) {
                // Block handled the key press, update immediately
                this.editorInstance.update();
                return;
            }
        }

        // Block conversion (markdown shortcuts) is handled by the input event listener in Editor.js
        // No need to handle it here as the input event will fire after key events

        // Default behavior - update immediately for other keys
        this.editorInstance.update();
    }

    /**
     * Handle special key combinations
     * @param {KeyboardEvent} e
     */
    handleSpecialKeys(e) {
        log('handleSpecialKeys()', 'KeyHandler.');

        // Any non-arrow key resets the sticky column
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') {
            this._desiredOffset = null;
        }
        
        if ('Enter' === e.key && !e.shiftKey) {
            // Ctrl/Cmd + Enter inside a code block: create a new paragraph below
            if (e.ctrlKey || e.metaKey) {
                const currentBlock = this.editorInstance.currentBlock;
                if (currentBlock?.dataset?.blockType === 'code') {
                    e.preventDefault();
                    this.editorInstance.addDefaultBlock();
                    return;
                }
            }
            return this.handleEnterKey(e);
        }
        
        if ('Backspace' === e.key) {
            return this.handleBackspaceKey(e);
        }
        
        if ('Delete' === e.key) {
            return this.handleDeleteKey(e);
        }

        if ('ArrowUp' === e.key || 'ArrowDown' === e.key) {
            return this.handleArrowKey(e);
        }
        
        if ('Tab' === e.key) {
            // Let individual block types handle tab
            const currentBlock = this.editorInstance.currentBlock;
            if (currentBlock && currentBlock.dataset && currentBlock.dataset.blockType) {
                const blockType = currentBlock.dataset.blockType;
                const block = BlockFactory.createBlock(blockType);
                
                if (block.handleKeyPress(e, '')) {
                    return;
                }
            }
            
            // Default tab behavior
            e.preventDefault();
        }
    }

    /**
     * Handle Enter key press
     * @param {KeyboardEvent} e
     */
    handleEnterKey(e) {
        log('handleEnterKey()', 'KeyHandler.');

        let currentBlock = this.editorInstance.currentBlock;
        
        // If currentBlock is null or detached, try to recover by finding the last block
        if (!currentBlock || !currentBlock.isConnected) {
            const container = this.editorInstance.instance;
            if (container) {
                const lastBlock = container.querySelector('.block:last-child');
                if (lastBlock) {
                    this.editorInstance.setCurrentBlock(lastBlock);
                    currentBlock = lastBlock;
                } else {
                    return;
                }
            } else {
                return;
            }
        }

        // Check for code block creation trigger (triple backticks).
        // Only attempt conversion if the block is still a paragraph — the input
        // event listener may have already converted it via checkAndConvertBlock.
        const currentBlockType = currentBlock.dataset?.blockType;
        if (currentBlockType === 'p' || currentBlockType === 'paragraph') {
            let ticksCounter = 0;
            for (let i = this.editorInstance.keybuffer.length; i >= 0; i--) {
                const j = i - 1;
                const sliceKey = this.editorInstance.keybuffer[j];
                
                // Stop at previous Enter
                if ('Enter' === sliceKey) {
                    break;
                }
                
                if ('`' === sliceKey) {
                    ticksCounter++;
                }
                
                if (3 === ticksCounter) {
                    // Delegate to Editor.convertBlockType so trigger text is stripped
                    // and the block is properly linked in the block map.
                    e.preventDefault();
                    const triggerText = currentBlock.textContent || '';
                    this.editorInstance.convertBlockType(currentBlock, 'code', triggerText);
                    this.editorInstance.update();
                    return;
                }
            }
        }

        // Let the current block type handle the Enter key first
        if (currentBlock.dataset && currentBlock.dataset.blockType) {
            const blockType = currentBlock.dataset.blockType;
            const block = BlockFactory.createBlock(blockType);
            
            if (block.handleEnterKey(e)) {
                this.editorInstance.update();
                return;
            }
        }
        
        // If block didn't handle the Enter key, check cursor position for default behavior
        const selection = window.getSelection();
        if (!selection.rangeCount) {
            return;
        }
        const range = selection.getRangeAt(0);

        // Check if cursor is at the start of a non-empty block — insert preceding block
        const isAtStart = KeyHandler.isCursorAtStartOfBlock(currentBlock, range);
        if (isAtStart && currentBlock.textContent.trim().length > 0) {
            e.preventDefault();
            this.editorInstance.addDefaultBlockBefore();
            return;
        }
        
        // Use the block's isAtEnd method if available, otherwise use the generic method
        let isAtEnd = false;
        if (currentBlock.dataset && currentBlock.dataset.blockType) {
            const blockType = currentBlock.dataset.blockType;
            const block = BlockFactory.createBlock(blockType);
            
            if (block.isAtEnd && typeof block.isAtEnd === 'function') {
                isAtEnd = block.isAtEnd(currentBlock, range);
            } else {
                isAtEnd = KeyHandler.isCursorAtEndOfBlock(currentBlock, range);
            }
        } else {
            isAtEnd = KeyHandler.isCursorAtEndOfBlock(currentBlock, range);
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
                    this.editorInstance.update();
                    return;
                }
            }

            // Default behavior - add new default block when cursor is at the end
            e.preventDefault();
            this.editorInstance.addDefaultBlock();
        }
        // If cursor is not at the end, let the browser handle default behavior (line break)
    }

    /**
     * Handle ArrowUp / ArrowDown — move to adjacent block when cursor is at boundary,
     * preserving the cursor's horizontal offset (sticky column).
     * @param {KeyboardEvent} e
     */
    handleArrowKey(e) {
        log('handleArrowKey()', 'KeyHandler.');

        const currentBlock = this.editorInstance.currentBlock;
        if (!currentBlock || !currentBlock.isConnected) return;

        const isUp = e.key === 'ArrowUp';
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        const range = selection.getRangeAt(0);

        // Only intervene when the cursor is at the boundary of the block
        const atBoundary = isUp
            ? KeyHandler.isCursorAtStartOfBlock(currentBlock, range)
            : KeyHandler.isCursorAtEndOfBlock(currentBlock, range);

        if (!atBoundary) return; // Let browser handle intra-block movement

        const sibling = isUp
            ? currentBlock.previousElementSibling
            : currentBlock.nextElementSibling;

        if (!sibling || !sibling.classList.contains('block')) return;

        e.preventDefault();

        // Compute current cursor offset within the block
        const currentOffset = KeyHandler.getCursorOffsetInBlock(currentBlock, range);

        // On the first arrow press in a sequence, record the desired offset
        if (this._desiredOffset === null) {
            this._desiredOffset = currentOffset;
        }

        this.editorInstance.setCurrentBlock(sibling);
        const editable = this.editorInstance.findEditableElementInBlock(sibling);
        const target = editable || sibling;
        const siblingLength = (target.textContent || '').length;

        if (siblingLength === 0) {
            // Empty block — place cursor at 0, but keep _desiredOffset for next move
            this.editorInstance.placeCursorAtStart(target);
        } else {
            // Place cursor at the desired offset, clamped to block length
            this.editorInstance.placeCursorAtOffset(target, Math.min(this._desiredOffset, siblingLength));
        }
    }

    /**
     * Calculate the cursor's character offset from the start of a block.
     * @param {HTMLElement} block
     * @param {Range} range - A collapsed range (cursor position)
     * @returns {number}
     */
    static getCursorOffsetInBlock(block, range) {
        if (!range || !block) return 0;
        const preRange = range.cloneRange();
        preRange.selectNodeContents(block);
        preRange.setEnd(range.startContainer, range.startOffset);
        return preRange.toString().length;
    }

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
     * Check if cursor is at the very start of the current block (position 0)
     * @param {HTMLElement} block
     * @param {Range} range
     * @returns {boolean}
     */
    static isCursorAtStartOfBlock(block, range) {
        if (!range || !block) {
            return false;
        }

        // Must be a collapsed cursor, not a selection
        if (!range.collapsed) {
            return false;
        }

        // Calculate the cursor position from the start of the block
        const preRange = range.cloneRange();
        preRange.selectNodeContents(block);
        preRange.setEnd(range.startContainer, range.startOffset);
        return preRange.toString().length === 0;
    }

    /**
     * Handle Backspace key press
     * @param {KeyboardEvent} e
     */
    handleBackspaceKey(e) 
    {
        log('handleBackspaceKey()', 'KeyHandler.');

        const currentBlock = this.editorInstance.currentBlock;
        if (!currentBlock) {
            return;
        }

        // Check if current block is empty (only whitespace or no content)
        // For code blocks, check the inner <code> element to avoid counting
        // language selector option text as content.
        let text;
        const blockType = currentBlock.dataset?.blockType;
        if (blockType === 'code') {
            const code = currentBlock.querySelector('code');
            text = (code ? code.textContent : '').trim();
        } else {
            text = Utils.stripTags(currentBlock.innerHTML).trim();
        }
        
        // Only handle backspace for empty blocks
        if (text === '') {
            // Find the previous block
            const previousBlock = currentBlock.previousElementSibling;
            
            // Don't remove the last remaining block
            const allBlocks = this.editorInstance.instance.querySelectorAll('.block');
            if (allBlocks.length <= 1) {
                return;
            }
            
            // Remove the empty block and focus on previous block
            if (previousBlock && previousBlock.classList.contains('block')) {
                this.editorInstance.setCurrentBlock(previousBlock);
                currentBlock.remove();
                this.editorInstance.focus(previousBlock);
                this.editorInstance.update();
                e.preventDefault();
                return;
            } else {
                // If no previous block, focus on next block (if exists)
                const nextBlock = currentBlock.nextElementSibling;
                if (nextBlock && nextBlock.classList.contains('block')) {
                    this.editorInstance.setCurrentBlock(nextBlock);
                    currentBlock.remove();
                    this.editorInstance.focus(nextBlock);
                    this.editorInstance.update();
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
                this.editorInstance.update();
                return;
            }
        }
    }

    /**
     * Handle Delete key press
     * @param {KeyboardEvent} e
     */
    handleDeleteKey(e) 
    {
        log('handleDeleteKey()', 'KeyHandler.');

        const currentBlock = this.editorInstance.currentBlock;
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
            const allBlocks = this.editorInstance.instance.querySelectorAll('.block');
            if (allBlocks.length <= 1) {
                return;
            }
            
            // Remove the empty block and focus on next block
            if (nextBlock && nextBlock.classList.contains('block')) {
                this.editorInstance.setCurrentBlock(nextBlock);
                currentBlock.remove();
                this.editorInstance.focus(nextBlock);
                this.editorInstance.update();
                e.preventDefault();
                return;
            } else {
                // If no next block, focus on previous block (if exists)
                const previousBlock = currentBlock.previousElementSibling;
                if (previousBlock && previousBlock.classList.contains('block')) {
                    this.editorInstance.setCurrentBlock(previousBlock);
                    currentBlock.remove();
                    this.editorInstance.focus(previousBlock);
                    this.editorInstance.update();
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
                this.editorInstance.update();
                return;
            }
        }
    }

    /**
     * Clear the key buffer
     */
    clearKeyBuffer() {
        this.editorInstance.keybuffer = [];
    }

    /**
     * Get the current key buffer
     * @returns {string[]}
     */
    getKeyBuffer() {
        return [...this.editorInstance.keybuffer];
    }
}
