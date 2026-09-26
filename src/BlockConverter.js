'use strict';

import {log, logWarning} from "./utils/log.js";
import {EVENTS} from "@/utils/eventEmitter.js";
import {BlockFactory} from "@/blocks/BlockFactory.js";
import {BlockType} from "@/BlockType.js";
import {Utils} from "./Utils.js";

/**
 * Handles block-type conversion logic for the editor.
 */
export class BlockConverter
{
    /**
     * @param {{ editor: import('./Editor.js').Editor }} options
     */
    constructor({ editor })
    {
        this.editor = editor;
    }

    /**
     * Check a block's text content and, if it matches a markdown trigger, convert it.
     * @param {HTMLElement} blockElement
     * @returns {boolean} true if a conversion was performed
     */
    checkAndConvert(blockElement)
    {
        log('checkAndConvert()', 'BlockConverter');

        if (!blockElement || !blockElement.hasAttribute('data-block-type')) {
            return false;
        }

        const currentBlockType = blockElement.getAttribute('data-block-type');
        const rawText = Utils.stripTags(blockElement.innerHTML);
        const normalizedText = rawText.replace(/&nbsp;/g, ' ').replace(/\u00A0|\xA0|\u00a0/g, ' ');
        const decodedText = normalizedText.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
        const textContent = decodedText.replace(/^\s+/, '');

        const matchingBlockClass = BlockFactory.findBlockClassForTrigger(textContent);

        if (!textContent && !matchingBlockClass) return false;
        if (!matchingBlockClass) return false;

        const targetBlockType = new matchingBlockClass().type;

        if (currentBlockType === targetBlockType) return false;

        if (currentBlockType !== 'p' && currentBlockType !== 'paragraph') return false;

        const converted = this.convertType(blockElement, targetBlockType, textContent);
        if (converted && targetBlockType === BlockType.DELIMITER && this.editor.currentBlock === blockElement) {
            // A horizontal rule cannot host a caret. Continue typing below it,
            // after the conversion has finished its state transition.
            this.editor.addDefaultBlock();
        }
        return converted;
    }

    /**
     * Convert a block element to a different type.
     * @param {HTMLElement} blockElement
     * @param {string} targetType
     * @param {string} triggerText
     * @returns {boolean} true if conversion succeeded
     */
    convertType(blockElement, targetType, triggerText)
    {
        log('convertType()', 'BlockConverter');

        const editor = this.editor;

        try {
            editor._stateMachine.startConverting();

            const newBlock = BlockFactory.createBlock(targetType);
            if (!newBlock) return false;

            const blockClass = newBlock.constructor;
            let remainingContent = triggerText;

            if (typeof blockClass.computeRemainingContent === 'function') {
                remainingContent = blockClass.computeRemainingContent(triggerText);
            } else {
                const triggers = blockClass.getMarkdownTriggers ? blockClass.getMarkdownTriggers() : [];
                for (const trigger of triggers) {
                    if (triggerText.startsWith(trigger)) {
                        remainingContent = triggerText.substring(trigger.length);
                        break;
                    }
                }
            }

            const wasFocused = blockElement === editor.currentBlock;

            blockElement.textContent = remainingContent.trim();

            newBlock.applyTransformation(blockElement, editor);

            newBlock.element = blockElement;
            editor._blockMap.set(blockElement, newBlock);
            editor.updateToolbarButtonStates?.();

            if (wasFocused) {
                const editableElement = editor.findEditableElementInBlock(blockElement);
                if (editableElement) {
                    editableElement.focus();
                    if (remainingContent.trim()) {
                        editor.placeCursorAtEnd(editableElement);
                    }
                }
            }

            editor.eventEmitter.emit(EVENTS.BLOCK_CONVERTED, {
                blockId: blockElement.getAttribute('data-block-id') || blockElement.id,
                fromType: blockElement.getAttribute('data-block-type'),
                toType: targetType,
                triggerText: triggerText,
                remainingContent: remainingContent,
                timestamp: Date.now()
            });

            return true;

        } catch (error) {
            logWarning('Error converting block type: ' + error.message, 'BlockConverter.convertType()');
            return false;
        } finally {
            editor._stateMachine.finishConverting();
        }
    }

    /**
     * Convert the current block to the target type, or create a new block if conversion
     * is not applicable.
     * @param {string} targetType
     * @param {Object} [options={}]
     * @param {HTMLElement|null} currentBlock - The editor's currently active block
     * @returns {boolean}
     */
    convertCurrentOrCreate(targetType, options = {}, currentBlock)
    {
        log('convertCurrentOrCreate()', 'BlockConverter');

        const editor = this.editor;

        if (!currentBlock) {
            return editor.createNewBlock(targetType, options);
        }

        const currentBlockType = currentBlock.getAttribute('data-block-type');

        // Toggle: if current block is already the target type, convert back to paragraph
        if (currentBlockType === targetType) {
            const editableEl = editor.findEditableElementInBlock(currentBlock);
            const content = editableEl ? (editableEl.textContent || '') : '';
            return this.convertType(currentBlock, BlockType.PARAGRAPH, content);
        }

        // If current block is a paragraph, convert it in-place
        if (currentBlockType === BlockType.PARAGRAPH) {
            const textContent = currentBlock.textContent || '';
            const triggerText = this.generateTrigger(targetType, textContent);
            return this.convertType(currentBlock, targetType, triggerText);
        }

        // For non-paragraph blocks of a different type, create a new block after current
        return editor.createNewBlock(targetType, options);
    }

    /**
     * Generate a trigger string for the given block type by prepending its markdown trigger
     * to existing content.
     * @param {string} blockType
     * @param {string} [existingContent='']
     * @returns {string}
     */
    generateTrigger(blockType, existingContent = '')
    {
        log('generateTrigger()', 'BlockConverter');

        const blockClass = BlockFactory.getBlockClass(blockType);
        if (!blockClass || typeof blockClass.getMarkdownTriggers !== 'function') {
            return existingContent;
        }

        const triggers = blockClass.getMarkdownTriggers();
        if (triggers.length === 0) return existingContent;

        return triggers[0] + existingContent;
    }
}
