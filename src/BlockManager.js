'use strict';

import {log, logWarning} from "./utils/log.js";
import {EVENTS} from "@/utils/eventEmitter.js";
import {Block} from "@/Block.js";
import {Parser} from "@/Parser.js";
import {BlockType} from "@/BlockType.js";
import {Utils} from "@/Utils.js";
import {BlockFactory} from "@/blocks/BlockFactory.js";

/**
 * BlockManager handles block lifecycle operations:
 * creation, insertion, emptiness checks, and cleanup.
 */
export class BlockManager {

    /**
     * @param {{ editor: object }} options
     */
    constructor({ editor }) {
        this.editor = editor;
    }

    /**
     * Create a block element from a parsed block object.
     * @param {Object} block
     * @returns {HTMLElement|null}
     */
    createBlockElement(block) {
        try {
            const blockInstance = block._blockInstance || (typeof block.renderToElement === 'function' ? block : null) || BlockFactory.createBlock(
                block.type,
                block.content,
                block.html,
                block.nested
            );

            if (!blockInstance) {
                return null;
            }

            const blockElement = blockInstance.renderToElement();

            if (blockElement) {
                const blockId = 'block-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                blockElement.setAttribute('data-block-id', blockId);
                blockElement.setAttribute('data-timestamp', Date.now().toString());

                this.editor.eventEmitter.emit(EVENTS.BLOCK_CREATED, {
                    blockId: blockId,
                    blockType: block.type,
                    timestamp: Date.now()
                }, { source: 'paste.create' });
            }

            return blockElement;
        } catch (error) {
            logWarning('Error creating block element', 'BlockManager.createBlockElement()');
            return null;
        }
    }

    /**
     * Create a paragraph block element with given HTML content.
     * @param {string} html
     * @returns {HTMLElement|null}
     */
    createParagraphBlock(html) {
        try {
            const paragraphBlock = BlockFactory.createBlock(BlockType.PARAGRAPH, '', html);
            const blockElement = paragraphBlock.renderToElement();

            if (blockElement) {
                const blockId = 'block-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                blockElement.setAttribute('data-block-id', blockId);
                blockElement.setAttribute('data-timestamp', Date.now().toString());

                this.editor.eventEmitter.emit(EVENTS.BLOCK_CREATED, {
                    blockId: blockId,
                    blockType: BlockType.PARAGRAPH,
                    timestamp: Date.now()
                }, { source: 'paste.create' });
            }

            return blockElement;
        } catch (error) {
            logWarning('Error creating paragraph block', 'BlockManager.createParagraphBlock()');
            return null;
        }
    }

    /**
     * Check if a block element is effectively empty.
     * @param {HTMLElement} block
     * @returns {boolean}
     */
    isBlockEmpty(block) {
        if (!block) return true;

        const textContent = block.textContent || '';
        const cleanText = textContent.trim();
        const innerHTML = block.innerHTML || '';

        return cleanText === '' || cleanText === '\n' || innerHTML === '<br>' || innerHTML === '<br/>' || innerHTML === '<br />';
    }

    /**
     * Check if a block element is a paragraph block.
     * @param {HTMLElement} block
     * @returns {boolean}
     */
    isParagraphBlock(block) {
        if (!block) return false;
        const type = block.getAttribute('data-block-type');
        return !type || type === 'p' || type === 'paragraph';
    }

    /**
     * Check if the editor is effectively empty (all blocks are empty).
     * @param {NodeList|Array} blocks
     * @returns {boolean}
     */
    isEditorEmpty(blocks) {
        log('isEditorEmpty()', 'BlockManager.');

        if (blocks.length === 0) {
            return true;
        }

        for (let block of blocks) {
            const textContent = Utils.stripTags(block.innerHTML).trim();
            if (textContent.length > 0) {
                return false;
            }
        }

        return true;
    }

    /**
     * Ensures the editor has at least one default block.
     * @returns {HTMLElement|null}
     */
    ensureDefaultBlock() {
        log('ensureDefaultBlock()', 'BlockManager.');

        const allBlocks = this.editor.instance.querySelectorAll('.bke-block');

        let needsDefault = false;

        if (allBlocks.length === 0) {
            needsDefault = true;
        } else if (allBlocks.length === 1 && this.isEditorEmpty(allBlocks)) {
            const onlyBlock = allBlocks[0];
            if (this.isParagraphBlock(onlyBlock)) {
                // Keep the browser's undo/redo references to a valid empty block.
                // Replacing it on every update destroys the native edit history.
                return onlyBlock;
            }
        }

        if (needsDefault) {
            if (allBlocks.length > 0) {
                this.detachBlockEvents(allBlocks);
            }

            this.editor.contentArea.innerHTML = '';
            this.editor.currentBlock = null;

            const newBlock = this.editor.addDefaultBlock();
            return newBlock;
        }

        return null;
    }

    /**
     * Detach events from blocks before removing them.
     * @param {NodeList|Array} blocks
     */
    detachBlockEvents(blocks) {
        log('detachBlockEvents()', 'BlockManager.');

        blocks.forEach(block => {
            const clonedBlock = block.cloneNode(true);

            if (block.getAttribute('data-block-id')) {
                this.editor.eventEmitter.emit(EVENTS.BLOCK_DESTROYED, {
                    blockId: block.getAttribute('data-block-id'),
                    blockType: block.getAttribute('data-block-type'),
                    timestamp: Date.now()
                }, { source: 'editor.cleanup' });
            }

            if (block.parentNode) {
                block.parentNode.replaceChild(clonedBlock, block);
            }
        });
    }

    /**
     * Add a new default (paragraph) block after the current block.
     * @returns {HTMLElement}
     */
    addDefaultBlock() {
        log('addDefaultBlock()', 'BlockManager.');

        this.editor._stateMachine.startCreating();

        const block = new Block(BlockType.PARAGRAPH);
        const htmlBlock = Parser.html(block);

        const typedBlock = block.getBlockInstance ? block.getBlockInstance() : block;
        if (typedBlock && typedBlock.element !== undefined) {
            typedBlock.element = htmlBlock;
        }
        this.editor._blockMap.set(htmlBlock, typedBlock);

        const blockId = 'block-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        htmlBlock.setAttribute('data-block-id', blockId);
        htmlBlock.setAttribute('data-timestamp', Date.now().toString());

        const currentBlock = this.editor.currentBlock;

        if (!currentBlock) {
            this.editor.contentArea.appendChild(htmlBlock);
        } else {
            currentBlock.after(htmlBlock);
        }

        this.editor.setCurrentBlock(htmlBlock);

        this.editor.eventEmitter.emit(EVENTS.BLOCK_CREATED, {
            blockId: blockId,
            blockType: BlockType.PARAGRAPH,
            position: Array.from(this.editor.instance.querySelectorAll('.bke-block')).indexOf(htmlBlock),
            timestamp: Date.now()
        }, { source: 'editor.create' });

        if (htmlBlock.isConnected) {
            this.editor.focus(htmlBlock);
        }
        this.editor._stateMachine.finishCreating();

        return htmlBlock;
    }

    /**
     * Insert a new default (paragraph) block BEFORE the current block.
     * @returns {HTMLElement}
     */
    addDefaultBlockBefore() {
        log('addDefaultBlockBefore()', 'BlockManager.');

        this.editor._stateMachine.startCreating();

        const block = new Block(BlockType.PARAGRAPH);
        const htmlBlock = Parser.html(block);

        const typedBlock = block.getBlockInstance ? block.getBlockInstance() : block;
        if (typedBlock && typedBlock.element !== undefined) {
            typedBlock.element = htmlBlock;
        }
        this.editor._blockMap.set(htmlBlock, typedBlock);

        const blockId = 'block-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        htmlBlock.setAttribute('data-block-id', blockId);
        htmlBlock.setAttribute('data-timestamp', Date.now().toString());

        const currentBlock = this.editor.currentBlock;

        if (!currentBlock) {
            this.editor.contentArea.insertBefore(htmlBlock, this.editor.contentArea.firstChild);
        } else {
            currentBlock.parentNode.insertBefore(htmlBlock, currentBlock);
        }

        this.editor.eventEmitter.emit(EVENTS.BLOCK_CREATED, {
            blockId: blockId,
            blockType: BlockType.PARAGRAPH,
            position: Array.from(this.editor.instance.querySelectorAll('.bke-block')).indexOf(htmlBlock),
            timestamp: Date.now()
        }, { source: 'editor.create' });

        requestAnimationFrame(() => {
            this.editor._stateMachine.finishCreating();
        });

        return htmlBlock;
    }

    /**
     * Create a new block of the specified type after the current block.
     * @param {string} blockType
     * @param {Object} [options={}]
     * @returns {boolean}
     */
    createNewBlock(blockType, options = {}) {
        log('createNewBlock()', 'BlockManager.');

        try {
            this.editor._stateMachine.startCreating();

            if (!this.editor.currentBlock) {
                this.ensureDefaultBlock();
            }

            const newBlock = BlockFactory.createBlock(blockType);
            if (!newBlock) {
                return false;
            }

            const htmlBlock = Parser.html(newBlock);
            if (!htmlBlock) {
                return false;
            }

            newBlock.element = htmlBlock;
            this.editor._blockMap.set(htmlBlock, newBlock);

            const blockId = 'block-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            htmlBlock.setAttribute('data-block-id', blockId);
            htmlBlock.setAttribute('data-timestamp', Date.now().toString());

            const currentBlock = this.editor.currentBlock;
            if (!currentBlock) {
                this.editor.contentArea.appendChild(htmlBlock);
            } else {
                currentBlock.after(htmlBlock);
            }

            this.editor.setCurrentBlock(htmlBlock);

            if (blockType === 'ul' || blockType === 'ol') {
                const listItem = htmlBlock.querySelector('li');
                if (listItem) {
                    listItem.focus();
                }
            }

            this.editor.eventEmitter.emit(EVENTS.BLOCK_CREATED, {
                blockId: blockId,
                blockType: blockType,
                options: options,
                position: Array.from(this.editor.instance.querySelectorAll('.bke-block')).indexOf(htmlBlock),
                timestamp: Date.now()
            }, { source: 'editor.create' });

            setTimeout(() => {
                this.editor._stateMachine.finishCreating();
            }, 100);

            return true;
        } catch (error) {
            logWarning('Error creating new block: ' + error.message, 'BlockManager.createNewBlock()');
            this.editor._stateMachine.finishCreating();
            return false;
        }
    }
}
