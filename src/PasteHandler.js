'use strict';

import {log, logWarning} from "./utils/log.js";
import {EVENTS} from "@/utils/eventEmitter.js";
import {Parser} from "@/Parser.js";
import {Utils} from "./Utils.js";
import {md2html} from "./ContentSerializer.js";
import {sanitizePasteHtml} from "./utils/sanitizePasteHtml.js";

/**
 * Handles clipboard paste events for the editor.
 * Sanitizes, parses, and inserts pasted content as one or more blocks.
 */
export class PasteHandler
{
    /**
     * @param {{ editor: import('./Editor.js').Editor }} options
     */
    constructor({ editor })
    {
        this.editor = editor;
    }

    /**
     * Main entry point — call from addListeners.
     * @param {ClipboardEvent} e
     */
    handle(e)
    {
        log('handle()', 'PasteHandler');

        e.preventDefault();

        const text    = (e.clipboardData || window.clipboardData).getData('text');
        let   htmlData = (e.clipboardData || window.clipboardData).getData('text/html');

        const selection = window.getSelection();

        if (!selection.rangeCount) {
            return false;
        }

        if (htmlData && htmlData.trim() !== '') {
            htmlData = sanitizePasteHtml(htmlData);

            try {
                const blocks = Parser.parseHtml(htmlData);

                if (blocks.length > 1) {
                    this.editor.transaction(() => {
                        this._insertMultipleBlocks(blocks);
                    });

                    this.editor.eventEmitter.emit(EVENTS.USER_PASTE, {
                        text,
                        html: htmlData,
                        blocksCount: blocks.length,
                        timestamp: Date.now()
                    }, { source: 'user.paste' });

                    return;
                } else if (blocks.length === 1) {
                    const block = blocks[0];
                    this._insertInlineContent(block.html || block.content, selection);
                } else {
                    const finalHtml = md2html(Utils.escapeHTML(text));
                    this._insertInlineContent(finalHtml, selection);
                }
            } catch (error) {
                logWarning('Error parsing HTML data, falling back to markdown conversion', 'PasteHandler.handle()');
                const finalHtml = md2html(Utils.escapeHTML(text));
                this._insertInlineContent(finalHtml, selection);
            }
        } else {
            const lines = text.split('\n').filter(line => line.trim() !== '');

            if (lines.length > 1) {
                this.editor.transaction(() => {
                    this._insertMultipleLinesAsBlocks(lines);
                });

                this.editor.eventEmitter.emit(EVENTS.USER_PASTE, {
                    text,
                    html: htmlData,
                    linesCount: lines.length,
                    timestamp: Date.now()
                }, { source: 'user.paste' });

                return;
            } else {
                const finalHtml = md2html(Utils.escapeHTML(text));
                this._insertInlineContent(finalHtml, selection);
            }
        }

        this.editor.eventEmitter.emit(EVENTS.USER_PASTE, {
            text,
            html: htmlData,
            timestamp: Date.now()
        }, { source: 'user.paste' });

        this.editor.update();
    }

    /**
     * Insert multiple parsed blocks after the current block.
     * @param {Array} blocks
     * @private
     */
    _insertMultipleBlocks(blocks)
    {
        log('_insertMultipleBlocks()', 'PasteHandler');

        const editor = this.editor;
        const currentBlock = editor.currentBlock;
        let insertAfterBlock = currentBlock;

        if (currentBlock && editor.isBlockEmpty(currentBlock)) {
            const firstBlock = blocks[0];
            const firstBlockElement = editor.createBlockElement(firstBlock);

            if (firstBlockElement) {
                currentBlock.parentNode.replaceChild(firstBlockElement, currentBlock);
                editor.setCurrentBlock(firstBlockElement);
                insertAfterBlock = firstBlockElement;
                blocks = blocks.slice(1);
            }
        }

        blocks.forEach((block, index) => {
            const blockElement = editor.createBlockElement(block);
            if (blockElement && insertAfterBlock) {
                insertAfterBlock.after(blockElement);
                insertAfterBlock = blockElement;

                if (index === blocks.length - 1) {
                    editor.setCurrentBlock(blockElement);
                    editor.focus(blockElement);
                }
            }
        });
    }

    /**
     * Insert multiple plain-text lines as separate paragraph blocks.
     * @param {Array<string>} lines
     * @private
     */
    _insertMultipleLinesAsBlocks(lines)
    {
        log('_insertMultipleLinesAsBlocks()', 'PasteHandler');

        const editor = this.editor;
        const currentBlock = editor.currentBlock;
        let insertAfterBlock = currentBlock;

        if (currentBlock && editor.isBlockEmpty(currentBlock)) {
            const firstLineHtml = sanitizePasteHtml(md2html(Utils.escapeHTML(lines[0])));
            const firstBlockElement = editor.createParagraphBlock(firstLineHtml);

            if (firstBlockElement) {
                currentBlock.parentNode.replaceChild(firstBlockElement, currentBlock);
                editor.setCurrentBlock(firstBlockElement);
                insertAfterBlock = firstBlockElement;
                lines = lines.slice(1);
            }
        }

        lines.forEach((line, index) => {
            const lineHtml = sanitizePasteHtml(md2html(Utils.escapeHTML(line)));
            const blockElement = editor.createParagraphBlock(lineHtml);

            if (blockElement && insertAfterBlock) {
                insertAfterBlock.after(blockElement);
                insertAfterBlock = blockElement;

                if (index === lines.length - 1) {
                    editor.setCurrentBlock(blockElement);
                    editor.focus(blockElement);
                }
            }
        });
    }

    /**
     * Insert HTML content inline at the current selection.
     * @param {string} html
     * @param {Selection} selection
     * @private
     */
    _insertInlineContent(html, selection)
    {
        if (!selection.rangeCount) return;

        html = sanitizePasteHtml(html);

        const range = selection.getRangeAt(0);

        try {
            const node = document.createRange().createContextualFragment(html);
            range.deleteContents();
            range.insertNode(node);

            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        } catch (error) {
            logWarning('Error inserting inline content', 'PasteHandler._insertInlineContent()');
            document.execCommand('insertHTML', false, html);
        }
    }
}
