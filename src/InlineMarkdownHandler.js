'use strict';

import {log} from "@/utils/log.js";

/**
 * Handles inline markdown pattern detection and replacement.
 * Monitors text input within blocks and detects completed inline markdown
 * patterns (e.g., **bold**, *italic*, `code`), replacing them with
 * formatted HTML in real time.
 *
 * This is a sibling system to block-level markdown triggers — block triggers
 * convert entire blocks (e.g., # → heading), while this handler formats
 * portions of text within a block.
 */
export class InlineMarkdownHandler
{
    /**
     * Inline patterns, checked in order. Longer/more-specific markers first
     * to ensure **bold** is matched before *italic*.
     *
     * Each entry:
     *  - regex  : pattern to match against a text node's value
     *  - tag    : HTML element to wrap the captured content in
     *  - marker : the raw marker string (for documentation / debugging)
     */
    static PATTERNS = [
        // **bold** and __bold__ (two-char markers before single-char)
        { regex: /\*\*(.+?)\*\*/, tag: 'strong', marker: '**' },
        { regex: /__(.+?)__/, tag: 'strong', marker: '__' },
        // ~~strikethrough~~
        { regex: /~~(.+?)~~/, tag: 'del', marker: '~~' },
        // *italic* — must not be inside ** sequences
        { regex: /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/, tag: 'em', marker: '*' },
        // _italic_ — only at word boundaries (avoid snake_case false positives)
        { regex: /(?:^|(?<=\s))_(?!_)(.+?)(?<!_)_(?:$|(?=[\s,.;:!?]))/, tag: 'em', marker: '_' },
        // `inline code`
        { regex: /(?<!`)`(?!`)([^`]+?)(?<!`)`(?!`)/, tag: 'code', marker: '`' },
    ];

    /**
     * Quick pre-check: does the text contain any marker character at all?
     * Avoids running full regex suite on text with no markers.
     */
    static MARKER_CHARS = /[*_`~]/;

    /**
     * @param {import('./Editor.js').Editor} editorInstance
     */
    constructor(editorInstance)
    {
        log('constructor()', 'InlineMarkdownHandler.');
        this.editorInstance = editorInstance;
    }

    /**
     * Scan a block element for inline markdown patterns and apply
     * formatting if a complete pattern is found.
     *
     * @param {HTMLElement} blockElement - The block DOM element to scan
     * @returns {boolean} Whether a replacement was made
     */
    checkAndApply(blockElement)
    {
        log('checkAndApply()', 'InlineMarkdownHandler.');

        // Never format inside code blocks
        const blockType = blockElement.getAttribute('data-block-type');
        if (blockType === 'code') {
            return false;
        }

        const editableEl = this._getEditableElement(blockElement);
        if (!editableEl) {
            return false;
        }

        const textNodes = this._getTextNodes(editableEl);

        for (const textNode of textNodes) {
            const text = textNode.nodeValue;
            if (!text || !InlineMarkdownHandler.MARKER_CHARS.test(text)) {
                continue;
            }

            // Skip text nodes that live inside an already-formatted element
            if (this._isInsideFormattingTag(textNode)) {
                continue;
            }

            for (const { regex, tag } of InlineMarkdownHandler.PATTERNS) {
                const match = regex.exec(text);
                if (match && match[1]) {
                    this._applyFormat(textNode, match, tag);
                    return true;
                }
            }
        }

        return false;
    }

    // ── Private helpers ────────────────────────────────────────────

    /**
     * Find the contenteditable element inside a block.
     * @param {HTMLElement} blockElement
     * @returns {HTMLElement|null}
     */
    _getEditableElement(blockElement)
    {
        return blockElement.querySelector('[contenteditable="true"]') || blockElement;
    }

    /**
     * Collect all text nodes within an element using a TreeWalker.
     * @param {HTMLElement} element
     * @returns {Text[]}
     */
    _getTextNodes(element)
    {
        const nodes = [];
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        while (walker.nextNode()) {
            nodes.push(walker.currentNode);
        }
        return nodes;
    }

    /**
     * Check whether a text node already lives inside a formatting tag
     * (strong, em, del, code) to avoid double-formatting.
     * @param {Text} textNode
     * @returns {boolean}
     */
    _isInsideFormattingTag(textNode)
    {
        const formattingTags = ['STRONG', 'EM', 'B', 'I', 'DEL', 'S', 'CODE'];
        let parent = textNode.parentNode;
        while (parent) {
            if (parent.nodeType === Node.ELEMENT_NODE && formattingTags.includes(parent.tagName)) {
                return true;
            }
            // Stop at the block boundary
            if (parent.classList && parent.classList.contains('bke-block')) {
                break;
            }
            parent = parent.parentNode;
        }
        return false;
    }

    /**
     * Replace a matched pattern inside a text node with a formatted HTML element.
     *
     * Given text "hello **world** foo", match on "**world**":
     *   before = "hello "
     *   content = "world"        (capture group 1)
     *   after  = " foo"
     *
     * The original text node is replaced with:
     *   [TextNode "hello "] [<strong>world</strong>] [TextNode " foo"]
     *
     * @param {Text} textNode
     * @param {RegExpExecArray} match
     * @param {string} tag - tag name to wrap content in
     */
    _applyFormat(textNode, match, tag)
    {
        log(`_applyFormat() tag=${tag}`, 'InlineMarkdownHandler.');

        const before = textNode.nodeValue.substring(0, match.index);
        const content = match[1];
        const after = textNode.nodeValue.substring(match.index + match[0].length);

        const parent = textNode.parentNode;

        // Build the formatted element
        const formatted = document.createElement(tag);
        formatted.textContent = content;

        // Insert before / formatted / after, then remove original
        if (before) {
            parent.insertBefore(document.createTextNode(before), textNode);
        }
        parent.insertBefore(formatted, textNode);

        if (after) {
            parent.insertBefore(document.createTextNode(after), textNode);
        }

        parent.removeChild(textNode);

        // Position cursor right after the formatted element
        this._placeCursorAfter(formatted);
    }

    /**
     * Place the caret immediately after the given element so the user
     * can continue typing unformatted text.
     *
     * @param {HTMLElement} element
     */
    _placeCursorAfter(element)
    {
        const selection = window.getSelection();
        if (!selection) return;

        const range = document.createRange();

        // If a text node already follows the element, place cursor at its start
        if (element.nextSibling && element.nextSibling.nodeType === Node.TEXT_NODE) {
            range.setStart(element.nextSibling, 0);
        } else {
            // Insert a zero-width space so the caret has somewhere to land
            const spacer = document.createTextNode('\u200B');
            element.parentNode.insertBefore(spacer, element.nextSibling);
            range.setStart(spacer, 1);
        }

        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    }
}
