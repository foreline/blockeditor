'use strict';

import {Toolbar} from "./Toolbar.js";
import {log, logWarning} from "./utils/log.js";
import {EditorEventEmitter, EVENTS} from "@/utils/eventEmitter.js";
import {Block} from "@/Block.js";
import {Parser} from "@/Parser.js";
import {BlockType} from "@/BlockType.js";
import {Utils} from "@/Utils.js";
import {BlockFactory} from "@/blocks/BlockFactory.js";
import {KeyHandler} from "@/KeyHandler.js";
import {InlineMarkdownHandler} from "@/InlineMarkdownHandler.js";
import {DebugTooltip} from "@/DebugTooltip.js";
import {EditorStateMachine} from "@/utils/EditorStateMachine.js";
import {defaultToolbarConfig} from "./config/defaultToolbarConfig.js";
import {CursorManager} from "./CursorManager.js";
import {ContentSerializer, html2md as _html2md, md2html as _md2html} from "./ContentSerializer.js";
import {PasteHandler} from "./PasteHandler.js";
import {BlockConverter} from "./BlockConverter.js";
import {BlockManager} from "./BlockManager.js";

/**
 * Editor class
 * @class Editor
 * @property {HTMLElement} instance - The editor instance
 * @property {Array.<Block>} blocks - Array of Block objects
 * @property {HTMLElement} currentBlock - The currently focused block
 * @property {Array.<string>} keybuffer - Buffer for tracking key presses
 * @property {Array.<Object>} rules - Custom rules for the editor
 * @property {EditorEventEmitter} eventEmitter - Instance-specific event emitter
 */
export class Editor
{
    // Static registry to track all editor instances
    static _instances = new Map();

    /**
     * @param {object} options
     */
    constructor(options = {})
    {
        log('construct()', 'Editor.'); console.log({options});
        
        const elementId = options.id ?? null;
        
        if ( !elementId ) {
            return console.warn('Element id is not set.');
        }

        // Instance properties
        this.instance = null;
        this.blocks = [];
        this.currentBlock = null;
        this.rules = [];
        this.keybuffer = [];
        this._blockMap = new WeakMap();
        this.debug = options.debug || false;
        this.debugMode = this.debug; // Current debug state (can be toggled)
        
        // State machine replaces ad-hoc boolean flags (isCreatingBlock, isConvertingBlock)
        // with explicit state transitions and an operation queue
        this._stateMachine = new EditorStateMachine();
        
        // Create instance-specific event emitter
        this.eventEmitter = new EditorEventEmitter({ debug: options.debug || false });
        
        // Initialize debug tooltip instance
        this.debugTooltip = null;

        // Cursor and selection management
        this.cursor = new CursorManager();

        // Content serialization (markdown/HTML output)
        this.serializer = new ContentSerializer();

        // Paste handling
        this._pasteHandler = new PasteHandler({ editor: this });

        // Block type conversion
        this._blockConverter = new BlockConverter({ editor: this });

        // Block lifecycle management
        this._blockManager = new BlockManager({ editor: this });
        
        // Initialize the editor first
        this.init(options);
        
        // Now initialize toolbar after instance is created
        this.initializeToolbar(options);
        
        // Register this instance
        Editor._instances.set(this.instance, this);
    }

    /**
     * Backward-compatible getter for isCreatingBlock flag.
     * Delegates to the state machine.
     * @returns {boolean}
     */
    get isCreatingBlock() {
        return this._stateMachine.isCreating;
    }

    /**
     * Backward-compatible setter for isCreatingBlock flag.
     * Delegates to the state machine transitions.
     * @param {boolean} value
     */
    set isCreatingBlock(value) {
        if (value && !this._stateMachine.isCreating) {
            this._stateMachine.startCreating();
        } else if (!value && this._stateMachine.isCreating) {
            this._stateMachine.finishCreating();
        }
    }

    /**
     * Backward-compatible getter for isConvertingBlock flag.
     * Delegates to the state machine.
     * @returns {boolean}
     */
    get isConvertingBlock() {
        return this._stateMachine.isConverting;
    }

    /**
     * Backward-compatible setter for isConvertingBlock flag.
     * Delegates to the state machine transitions.
     * @param {boolean} value
     */
    set isConvertingBlock(value) {
        if (value && !this._stateMachine.isConverting) {
            this._stateMachine.startConverting();
        } else if (!value && this._stateMachine.isConverting) {
            this._stateMachine.finishConverting();
        }
    }
    
    /**
     * Initialize toolbar after editor instance is created
     * @param {object} options 
     */
    initializeToolbar(options)
    {
        log('initializeToolbar()', 'Editor.');

        if (options.readonly) { return; }

        // Initialize toolbar - use the editor instance element itself as container
        const toolbarContainer = this.instance;
        
        // Use provided toolbar config or default, only initialize if toolbar is not disabled
        const toolbarConfig = options.toolbar === false ? null : (
            typeof options.toolbar === 'object' && options.toolbar.config ? options.toolbar.config :
            typeof options.toolbar === 'object' && Array.isArray(options.toolbar) ? options.toolbar :
            defaultToolbarConfig
        );
        
        if (toolbarConfig) {
            const toolbarOptions = {
                id: options.toolbarId ?? null,
                container: toolbarContainer,
                config: toolbarConfig,
                debug: this.debug,
                editorInstance: this,
                icons: options.icons ?? {}
            };
            this.toolbar = new Toolbar(toolbarOptions);
        }
    }
    
    /**
     * Initialize the editor instance
     * @param {object} options
     */
    init(options)
    {
        log('init()', 'Editor.'); console.log({options});

        const editorContainer = document.createElement('div');
        editorContainer.id = 'editor';
        editorContainer.className = 'bke-editor';

        if ( options.container ) {
            if ( Array.isArray(options.container) ) {
                options.container.forEach(container => {
                    container.appendChild(editorContainer);
                });
            } else {
                options.container.appendChild(editorContainer);
            }
        }

        this.instance = document.getElementById(options.id);
        this._readonly = !!options.readonly;

        // Read initial content BEFORE we modify the mount element's DOM.
        const _initialContent = options.text || this.instance.innerHTML || '';

        // Create a dedicated content area inside the mount element.
        // The toolbar (inserted later by initializeToolbar) becomes a sibling of
        // this div, NOT a child of the contenteditable surface. This prevents
        // Ctrl+A + Delete from removing the toolbar.
        this.contentArea = document.createElement('div');
        this.contentArea.className = 'bke-content-area';

        if (this._readonly) {
            this.contentArea.style.userSelect = 'text';
            this.instance.setAttribute('aria-readonly', 'true'); // kept on instance for CSS selector
        } else {
            this.contentArea.setAttribute('contenteditable', 'true');
        }

        // Apply size constraints to the content area (the visible editing surface),
        // not the mount element which also contains the toolbar and storage elements.
        if (options.minHeight) { this.contentArea.style.minHeight = options.minHeight; }
        if (options.maxHeight) { this.contentArea.style.maxHeight = options.maxHeight; }

        // Clear the mount element and insert the content area.
        this.instance.innerHTML = '';
        this.instance.appendChild(this.contentArea);

        let content = _initialContent;
        let blocks = Parser.parse(content);
        
        this.blocks = blocks;
        
        if ( 0 === blocks.length ) {
            blocks = [new Block()];
        }

        for ( let block of blocks ) {
            let html = Parser.html(block);
            this.contentArea.appendChild(html);
            // Link typed block instance to its DOM element
            const typedBlock = block.getBlockInstance ? block.getBlockInstance() : block;
            if (typedBlock && typedBlock.element !== undefined) {
                typedBlock.element = html;
            }
            this._blockMap.set(html, typedBlock);
        }
        
        this.setCurrentBlock(this.instance.querySelectorAll('.bke-block')[0]);
    
        this.keyHandler = new KeyHandler(this);
        this._inlineMarkdownHandler = new InlineMarkdownHandler(this);
        if (!this._readonly) {
            this.addListeners();
        }

        this.initMarkdownContainer();
        this.initHtmlContainer();
        
        // Emit editor initialization event
        this.eventEmitter.emit(EVENTS.EDITOR_INITIALIZED, {
            elementId: options.id,
            blockCount: this.blocks.length,
            timestamp: Date.now()
        }, { source: 'editor.init' });
        
        // Initialize debug tooltip after editor is fully set up
        this.debugTooltip = new DebugTooltip({
            editorInstance: this.instance,
            eventEmitter: this.eventEmitter
        });
        
        // Enable debug tooltips if debug mode is on
        if (this.debugMode) {
            this.debugTooltip.enable(this);
        }
    }
    
    /**
     * Toggle debug mode
     */
    toggleDebugMode()
    {
        log('toggleDebugMode()', 'Editor.');

        this.debugMode = !this.debugMode;
        
        if (this.debugMode) {
            if (this.debugTooltip) {
                this.debugTooltip.enable(this);
            }
        } else {
            if (this.debugTooltip) {
                this.debugTooltip.disable();
            }
        }
        
        // Emit debug mode change event
        this.eventEmitter.emit(EVENTS.DEBUG_MODE_CHANGED, {
            debugMode: this.debugMode,
            timestamp: Date.now()
        }, { source: 'editor.toggleDebugMode' });
    }
    
    
    /**
     * Subscribe to events on this editor instance
     * @param {string} eventType - The event type to subscribe to
     * @param {Function} callback - The callback function
     * @param {Object} options - Subscription options
     * @returns {Object} Subscription object with unsubscribe method
     */
    on(eventType, callback, options = {}) {
        return this.eventEmitter.subscribe(eventType, callback, options);
    }
    
    /**
     * Unsubscribe from events (alias for more intuitive API)
     * @param {string} eventType - The event type
     * @param {Function} callback - The callback function to remove
     */
    off(eventType, callback) {
        // Find and remove the specific callback
        const listeners = this.eventEmitter.events.get(eventType);
        if (listeners) {
            for (const listener of listeners) {
                if (listener.callback === callback) {
                    listeners.delete(listener);
                    break;
                }
            }
            if (listeners.size === 0) {
                this.eventEmitter.events.delete(eventType);
            }
        }
    }
    
    /**
     * Subscribe to event that fires only once
     * @param {string} eventType - The event type
     * @param {Function} callback - The callback function
     * @param {Object} options - Subscription options
     * @returns {Object} Subscription object with unsubscribe method
     */
    once(eventType, callback, options = {}) {
        return this.eventEmitter.subscribe(eventType, callback, { ...options, once: true });
    }
    
    /**
     * Emit events from this editor instance
     * @param {string} eventType - The event type
     * @param {*} data - Event data
     * @param {Object} options - Emission options
     */
    emit(eventType, data, options = {}) {
        this.eventEmitter.emit(eventType, data, options);
    }
    
    /**
     * Get the editor instance from a DOM element
     * @param {HTMLElement} element - The editor DOM element
     * @returns {Editor|null} The editor instance or null if not found
     */
    static getInstance(element)
    {
        return Editor._instances.get(element) || null;
    }
    
    /**
     * Get the editor instance that contains a given DOM element
     * @param {HTMLElement} element - Any DOM element within an editor
     * @returns {Editor|null} The editor instance or null if not found
     */
    static getInstanceFromElement(element)
    {
        log('getInstanceFromElement()', 'Editor.');

        if (!element) {
            return null;
        }

        // Walk up the DOM tree to find an editor instance
        let currentElement = element;
        while (currentElement) {
            const editorInstance = Editor._instances.get(currentElement);
            if (editorInstance) {
                return editorInstance;
            }
            currentElement = currentElement.parentElement;
        }
        
        // If not found by walking up, try to find the first instance as fallback
        const instances = Array.from(Editor._instances.values());
        return instances.length > 0 ? instances[0] : null;
    }
    
    /**
     * Adds event listeners to this editor instance
     */
    addListeners()
    {
        log('addListeners()', 'Editor.');

        this._boundHandlers = {};

        this._boundHandlers.keydown = (e) => {
            this.keyHandler.handleSpecialKeys(e);
        };
        this.contentArea.addEventListener('keydown', this._boundHandlers.keydown);
    
        this._boundHandlers.keyup = (e) => {
            this.keyHandler.handleKeyPress(e);
        };
        this.contentArea.addEventListener('keyup', this._boundHandlers.keyup);
        
        // BEFOREINPUT Event handler — intercept deletions that cross block boundaries.
        // The browser's native contenteditable handling can corrupt the block
        // structure when a deletion spans multiple blocks:
        //   • Stray text/BR nodes may appear outside .block elements
        //   • The cursor may land outside any block
        //   • All blocks may be removed with no recovery
        //
        // By intercepting in `beforeinput` we can:
        //   1. Use range.deleteContents() to remove the selected text cleanly
        //   2. Merge the surviving content of the first and last blocks
        //   3. Remove empty/orphaned blocks
        //   4. Guarantee at least one block always exists
        //   5. Place the cursor exactly at the merge point
        this._boundHandlers.beforeinput = (e) => this._handleCrossBlockDelete(e);
        this.contentArea.addEventListener('beforeinput', this._boundHandlers.beforeinput);

        // PASTE TEXT/HTML Event handler
        this._boundHandlers.paste = (e) => this._pasteHandler.handle(e);
        this.contentArea.addEventListener('paste', this._boundHandlers.paste);
        
        // INPUT Event handler - catch content changes for block conversion
        this._boundHandlers.input = (e) => {
            // Only handle input events for this editor instance
            if (!e.target.closest(`#${this.instance.id}`)) {
                return;
            }
            
            // Find the block where the input occurred.
            // NOTE: e.target for input events in a contenteditable container is the
            // editing host (the editor container itself), NOT the child block element.
            // Therefore e.target.closest('.bke-block') would always return null.
            // Instead, use the current selection to determine which block received input.
            let block = null;
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                let anchorNode = selection.anchorNode;
                // Text nodes don't have .closest(), walk up to the parent element
                if (anchorNode && anchorNode.nodeType === Node.TEXT_NODE) {
                    anchorNode = anchorNode.parentElement;
                }
                if (anchorNode) {
                    block = anchorNode.closest('.bke-block');
                    // If no block is found but the anchor is a list item, look for the parent list block
                    if (!block && anchorNode.tagName === 'LI') {
                        block = anchorNode.closest('ul, ol, div')?.closest('.bke-block') || null;
                    }
                }
            }
            // Fallback to the currently tracked block if selection-based lookup failed
            if (!block) {
                block = this.currentBlock;
            }
            
            // Check if editor is effectively empty after content deletion
            // Skip this check if a state transition (creating/converting) is in progress
            if (!this._stateMachine.isBusy()) {
                const allBlocks = this.instance.querySelectorAll('.bke-block');
                
                // Only trigger empty editor protection if:
                // 1. There are no blocks at all, OR
                // 2. There's exactly one block and it's empty (likely user deleted all content)
                // Do NOT trigger if there are multiple blocks, even if they're all empty,
                // as the user may have intentionally created multiple empty blocks
                if (allBlocks.length === 0) {
                    // Editor is completely empty, ensure at least one default block exists
                    this.ensureDefaultBlock();
                    return;
                } else if (allBlocks.length === 1 && this.isEditorEmpty(allBlocks)) {
                    const onlyBlock = allBlocks[0];
                    // Only enforce default block if the single empty block is a paragraph.
                    // Allow empty non-paragraph blocks (e.g., an empty heading, list, etc.) to persist.
                    if (this.isParagraphBlock(onlyBlock)) {
                        this.ensureDefaultBlock();
                        return;
                    }
                }
            }
        
            if (block) {
                // Only check for conversion on paragraph blocks to avoid performance issues
                const blockType = block.getAttribute('data-block-type');
                if (blockType === 'p' || blockType === 'paragraph') {
                    // Get current text content, preserve trailing space for triggers like "# "
                    // and normalize non-breaking spaces from contenteditable
                    const raw = Utils.stripTags(block.innerHTML);
                    const normalized = raw.replace(/&nbsp;/g, ' ').replace(/\u00A0|\xA0|\u00a0/g, ' ');
                    // Decode HTML entities that browsers inject in contenteditable (e.g. > becomes &gt;)
                    const decoded = normalized.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
                    const textContent = decoded.replace(/^\s+/, '');
                    
                    // Only check for conversion if text contains potential triggers
                    // Support: headings, unordered (* - +), task [- [ ]], ordered (1. / 1) ), quote, fences
                    if (textContent.match(/^(#{1,6}\s|[\*\-\+]\s|[\*\-]\s*\[[x\s]\]\s*|\d+[\.)]?\s|>\s|```|~~~)/)) {
                        // Check if this block should be converted to a different type
                        // The input event fires after the character is inserted, so we can check immediately
                        // Use requestAnimationFrame to ensure DOM is fully updated
                        requestAnimationFrame(() => {
                            if (this.checkAndConvertBlock(block)) {
                                this.update();
                            }
                        });
                        // Block-level trigger matched — skip inline check
                        return;
                    }
                }

                // Inline markdown pattern check (e.g., **bold**, *italic*, `code`)
                // Runs for all non-code block types, after block-level triggers
                const inlineBlockType = block.getAttribute('data-block-type');
                if (inlineBlockType !== 'code') {
                    requestAnimationFrame(() => {
                        if (this._inlineMarkdownHandler.checkAndApply(block)) {
                            this.update();
                        }
                    });
                }
            }
        };
        this.contentArea.addEventListener('input', this._boundHandlers.input);
        
        // Primary handler for setting current block - handles both click and focus events
        this._boundHandlers.click = (e) => {
            // Only handle clicks for this editor instance
            if (!e.target.closest(`#${this.instance.id}`)) {
                return;
            }

            let block = e.target.closest('.bke-block');
            
            // If no block is found but the target is a list item, look for the parent list block
            if (!block && e.target.tagName === 'LI') {
                block = e.target.closest('ul, ol, div').closest('.bke-block');
            }
            
            if ( block ) {
                this.setCurrentBlock(block);
            }
        };
        this.contentArea.addEventListener('click', this._boundHandlers.click);

        // Handle focus events for keyboard navigation (only when not caused by mouse interaction)
        this._boundHandlers.focusin = (e) => {
            // Only handle focus events for this editor instance
            if (!e.target.closest(`#${this.instance.id}`)) {
                return;
            }

            // Skip if this focus event was caused by a recent mouse click
            // to avoid duplicate setCurrentBlock calls
            if (this._lastClickTime && Date.now() - this._lastClickTime < 100) {
                return;
            }

            let block = e.target.closest('.bke-block');
            
            // If no block is found but the target is a list item, look for the parent list block
            if (!block && e.target.tagName === 'LI') {
                block = e.target.closest('ul, ol, div').closest('.bke-block');
            }
            
            if ( block ) {
                this.setCurrentBlock(block);
            } else {
                // e.target may be the editor container when a paragraph
                // (contenteditable="true") is nested inside the also-
                // contenteditable editor.  Use the current selection to
                // find the correct block before falling back to the first.
                const sel = window.getSelection();
                if (sel && sel.anchorNode) {
                    let anchor = sel.anchorNode;
                    if (anchor.nodeType === Node.TEXT_NODE) {
                        anchor = anchor.parentElement;
                    }
                    if (anchor) {
                        const blockFromSel = anchor.closest('.bke-block');
                        if (blockFromSel) {
                            this.setCurrentBlock(blockFromSel);
                            return;
                        }
                    }
                }
                // Last resort: pick the first block
                const firstBlock = this.instance.querySelector('.bke-block');
                if ( firstBlock ) {
                    this.setCurrentBlock(firstBlock);
                }
            }
        };
        this.contentArea.addEventListener('focusin', this._boundHandlers.focusin);

        // Track mouse clicks to prevent duplicate focus handling
        // and reset sticky column offset
        this._boundHandlers.mousedown = () => {
            this._lastClickTime = Date.now();
            if (this.keyHandler) {
                this.keyHandler._desiredOffset = null;
            }
        };
        this.contentArea.addEventListener('mousedown', this._boundHandlers.mousedown);
    }

    /**
     * Handles cross-block deletion initiated by beforeinput events.
     * Intercepts delete operations that span multiple blocks to prevent
     * browser from corrupting the block structure.
     * @param {InputEvent} e
     */
    _handleCrossBlockDelete(e) {
        if (!e.inputType.startsWith('delete')) return;

        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        if (range.collapsed) return; // Single-point deletion — let the browser handle it

        const allBlocks = this.instance.querySelectorAll('.bke-block');
        if (allBlocks.length === 0) return;

        // Collect the blocks that are touched by the selection
        const intersectedBlocks = [];
        for (const block of allBlocks) {
            if (range.intersectsNode(block)) intersectedBlocks.push(block);
        }

        // Only take over when the deletion crosses a block boundary
        if (intersectedBlocks.length < 2) return;

        e.preventDefault();
        log('beforeinput: intercepted cross-block deletion (' + intersectedBlocks.length + ' blocks)', 'Editor.');

        const firstBlock = intersectedBlocks[0];
        const lastBlock  = intersectedBlocks[intersectedBlocks.length - 1];

        // --- 1. Insert a <span> cursor marker at the deletion point -------
        //     We use an element (not a text node) so that normalize() won't
        //     remove it later when we merge adjacent text nodes.
        const cursorMarker = document.createElement('span');
        cursorMarker.setAttribute('data-cursor-marker', '');
        range.insertNode(cursorMarker);

        // --- 2. Re-create a range that covers the selected content --------
        //     insertNode() pushes the range start before the marker, so we
        //     build a fresh range from just after the marker to the original
        //     selection end (which hasn't moved).
        const deleteRange = document.createRange();
        deleteRange.setStartAfter(cursorMarker);
        deleteRange.setEnd(range.endContainer, range.endOffset);
        deleteRange.deleteContents();

        // --- 3. Merge the last block's remaining content into the first ---
        if (firstBlock !== lastBlock && lastBlock.isConnected && firstBlock.isConnected) {
            while (lastBlock.firstChild) {
                firstBlock.appendChild(lastBlock.firstChild);
            }
            lastBlock.remove();
        }

        // --- 4. Remove any remaining intersected blocks -------------------
        for (const block of intersectedBlocks) {
            if (block !== firstBlock && block.isConnected) {
                block.remove();
            }
        }

        // Normalize text nodes around the merge point
        firstBlock.normalize();

        // --- 5. Place cursor at the marker, then remove it ----------------
        const restoreRange = document.createRange();
        if (cursorMarker.isConnected) {
            restoreRange.setStartAfter(cursorMarker);
            restoreRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(restoreRange);
            cursorMarker.remove();
        }

        // --- 6. Clean up: if firstBlock is empty but other blocks exist,
        //        remove it and focus the nearest neighbor instead. ----------
        const firstBlockContent = (firstBlock.textContent || '').trim();
        let remainingBlocks = this.instance.querySelectorAll('.bke-block');

        if (!firstBlockContent && remainingBlocks.length > 1 && firstBlock.isConnected) {
            const neighbor = firstBlock.previousElementSibling
                || firstBlock.nextElementSibling;
            firstBlock.remove();
            remainingBlocks = this.instance.querySelectorAll('.bke-block');
            if (neighbor && neighbor.isConnected && neighbor.classList.contains('bke-block')) {
                this.setCurrentBlock(neighbor);
                this.focus(neighbor);
            } else if (remainingBlocks.length > 0) {
                this.setCurrentBlock(remainingBlocks[remainingBlocks.length - 1]);
                this.focus(remainingBlocks[remainingBlocks.length - 1]);
            }
        }

        // --- 7. Ensure at least one block always exists -------------------
        remainingBlocks = this.instance.querySelectorAll('.bke-block');
        if (remainingBlocks.length === 0) {
            this.currentBlock = null;
            this.addDefaultBlock();
        } else if (firstBlock.isConnected) {
            this.setCurrentBlock(firstBlock);
        } else {
            // firstBlock was removed or disconnected — focus nearest remaining
            const target = remainingBlocks[remainingBlocks.length - 1];
            this.setCurrentBlock(target);
            this.focus(target);
        }

        this.update();
    }

    /**
     * Sets focus on given or current editor block.
     * @param {?HTMLElement} element
     */
    focus(element = null)
    {
        log('focus()', 'Editor.');
        
        if ( !element ) {
            element = this.currentBlock;
        }
        
        // Verify element exists and is attached to DOM
        if ( !element || !element.isConnected ) {
            logWarning('Cannot focus on non-existent or detached element', 'Editor.focus()');
            
            // Fallback mechanism: focus on editor instance or first available block
            // Use instance method instead of static to avoid recursion
            const firstBlock = this.instance.querySelector('.bke-block');
            if ( firstBlock && firstBlock.isConnected ) {
                // Set current block and try to focus again, but prevent infinite recursion
                this.setCurrentBlock(firstBlock);
                // Direct focus without recursive call
                this.focusElement(firstBlock);
                return;
            } else {
                // No blocks available, focus on editor instance itself
                if (this.contentArea && this.contentArea.isConnected) {
                    this.contentArea.focus();
                }
                return;
            }
        }
        
        this.focusElement(element);
    }

    /**
     * Helper method to focus on an element without recursion
     * @param {HTMLElement} element - The element to focus on
     */
    focusElement(element)
    {
        return this.cursor.focusElement(element);
    }
    
    /**
     *
     * @param {ClipboardEvent} e
     */
    paste(e)
    {
        log('paste()', 'Editor.');
        return this._pasteHandler.handle(e);
    }

    /**
     * Insert multiple blocks as separate block elements
     * @param {Array} blocks - Array of parsed block objects
     */
    insertMultipleBlocks(blocks) {
        log('insertMultipleBlocks()', 'Editor.');
        return this._pasteHandler._insertMultipleBlocks(blocks);
    }

    insertMultipleLinesAsBlocks(lines) {
        log('insertMultipleLinesAsBlocks()', 'Editor.');
        return this._pasteHandler._insertMultipleLinesAsBlocks(lines);
    }

    /**
     * Create a block element from a parsed block object
     * @param {Object} block
     * @returns {HTMLElement|null}
     */
    createBlockElement(block) {
        return this._blockManager.createBlockElement(block);
    }

    /**
     * Create a paragraph block element with given HTML content
     * @param {string} html
     * @returns {HTMLElement|null}
     */
    createParagraphBlock(html) {
        return this._blockManager.createParagraphBlock(html);
    }

    insertInlineContent(html, selection) {
        log('insertInlineContent()', 'Editor.');
        return this._pasteHandler._insertInlineContent(html, selection);
    }

    /**
     * Check if a block element is effectively empty.
     * @param {HTMLElement} block
     * @returns {boolean}
     */
    isBlockEmpty(block) {
        return this._blockManager.isBlockEmpty(block);
    }
    
    /**
     * Raises editor updated event with content change tracking
     */
    update()
    {
        log('update()', 'Editor.');
        
        // Cancel any pending update to avoid multiple rapid calls
        if (this._updateTimeout) {
            clearTimeout(this._updateTimeout);
        }
        
        // Debounce the actual update to improve performance
        this._updateTimeout = setTimeout(() => {
            this._performUpdate();
        }, 50);
    }

    /**
     * Perform the actual update operation (private method)
     * @private
     */
    _performUpdate()
    {
        log('_performUpdate()', 'Editor.');

        let editorHtml = this.contentArea.innerHTML;
        
        // Only compute markdown if it's actually needed (performance optimization)
        let markdownContent = '';
        if (this.eventEmitter.hasListeners(EVENTS.EDITOR_UPDATED) || 
            this.eventEmitter.hasListeners(EVENTS.CONTENT_CHANGED)) {
            markdownContent = Editor.html2md(editorHtml);
        }
        
        // Update timestamps for all blocks
        this.updateBlockTimestamps();
        
        // Empty-editor protection: ensure at least one default block exists
        // Only enforce when there are no blocks, or when there's exactly one empty block.
        // Do NOT collapse multiple empty blocks, as users may intentionally create them.
        // Also skip enforcement while a state transition is in progress to avoid racing with transformations.
        const blocks = this.instance.querySelectorAll('.bke-block');
        if (!this._stateMachine.isBusy()) {
            if (blocks.length === 0) {
                this.ensureDefaultBlock();
            } else if (blocks.length === 1 && this.isEditorEmpty(blocks)) {
                const onlyBlock = blocks[0];
                // Only enforce default block if the single empty block is a paragraph.
                // Allow empty non-paragraph blocks (e.g., an empty heading, list, etc.) to persist.
                if (this.isParagraphBlock(onlyBlock)) {
                    this.ensureDefaultBlock();
                }
            }
        }

        // Emit both legacy and new events
        this.eventEmitter.emit(EVENTS.EDITOR_UPDATED, {
            html: editorHtml,
            markdown: markdownContent,
            blockCount: this.instance.querySelectorAll('.bke-block').length
        });
        
        // Emit debounced content change event for backend synchronization
        this.eventEmitter.emit(EVENTS.CONTENT_CHANGED, {
            html: editorHtml,
            markdown: markdownContent,
            timestamp: Date.now()
        }, { debounce: 500, source: 'editor.update' });
    }

    /**
     * Update timestamps for all blocks to track content changes
     */
    updateBlockTimestamps()
    {
        log('updateBlockTimestamps()', 'Editor.');

        const blocks = this.instance.querySelectorAll('.bke-block');
        const currentTimestamp = Date.now();
        
        blocks.forEach(block => {
            const content = block.textContent || block.innerHTML;
            const lastContent = block.getAttribute('data-last-content');
            
            // Only update timestamp if content has actually changed
            if (lastContent !== content) {
                block.setAttribute('data-timestamp', currentTimestamp.toString());
                block.setAttribute('data-last-content', content);
                
                // Emit block-specific content change event
                this.eventEmitter.emit(EVENTS.BLOCK_CONTENT_CHANGED, {
                    blockId: block.getAttribute('data-block-id') || block.id,
                    blockType: block.getAttribute('data-block-type'),
                    content: content,
                    previousContent: lastContent,
                    timestamp: currentTimestamp
                }, { throttle: 200, source: 'block.content' });
            }
        });
    }

    /**
     * Check if a block is a paragraph block (or legacy block without type)
     * @param {HTMLElement} block - Block element to check
     * @returns {boolean}
     */
    isParagraphBlock(block)
    {
        return this._blockManager.isParagraphBlock(block);
    }

    /**
     * Check if the editor is effectively empty (all blocks contain no meaningful content)
     * @param {NodeList} blocks - Collection of block elements
     * @returns {boolean}
     */
    isEditorEmpty(blocks)
    {
        return this._blockManager.isEditorEmpty(blocks);
    }

    /**
     * Ensures the editor has at least one default block
     * Handles the empty editor edge case safely
     */
    ensureDefaultBlock()
    {
        return this._blockManager.ensureDefaultBlock();
    }

    /**
     * Detach events from blocks before removing them
     * @param {NodeList} blocks - Collection of block elements to clean up
     */
    detachBlockEvents(blocks)
    {
        this._blockManager.detachBlockEvents(blocks);
    }

      /**
     *
     * @param {string} html
     * @returns {string} md
     */
    static html2md(html)
    {
        return _html2md(html);
    }

    /**
     *
     * @param {string} md
     * @returns {string} html
     */
    static md2html(md)
    {
        return _md2html(md);
    }
    

    
    /**
     * @return HTMLElement
     */
    addDefaultBlock()
    {
        return this._blockManager.addDefaultBlock();
    }

    /**
     * Insert a new default (paragraph) block BEFORE the current block.
     * @return HTMLElement
     */
    addDefaultBlockBefore()
    {
        return this._blockManager.addDefaultBlockBefore();
    }

    /**
     * Updates toolbar button states based on the current block.
     * Delegates to Toolbar.updateButtonStates() when a toolbar is present.
     */
    updateToolbarButtonStates()
    {
        log('updateToolbarButtonStates()', 'Editor.');

        if (!this.currentBlock) return;

        const blockType = this.currentBlock.getAttribute('data-block-type');
        if (!blockType) return;

        if (this.toolbar) {
            this.toolbar.updateButtonStates(blockType);
        }
    }

    /**
     * Enables all toolbar buttons (resets their state).
     * Delegates to Toolbar.resetButtonStates() when a toolbar is present.
     */
    enableAllToolbarButtons()
    {
        log('enableAllToolbarButtons()', 'Editor.');

        if (this.toolbar) {
            this.toolbar.resetButtonStates();
        }
    }

    /**
     * Gets a block instance for the given block type
     * @param {string} blockType The block type identifier
     * @returns {object|null} Block instance or null if not found
     */
    static getBlockInstance(blockType)
    {
        log('getBlockInstance()', 'Editor.', { blockType });

        try {
            // Create a temporary instance to access its methods
            return BlockFactory.createBlock(blockType, '', '', false);
        } catch (error) {
            console.warn(`Could not create block instance for type: ${blockType}`, error);
            return null;
        }
    }

    /**
     * Gets a block class for the given block type
     * @param {string} blockType The block type identifier
     * @returns {Function|null} Block class or null if not found
     */
    static getBlockClass(blockType)
    {
        try {
            // Get the block class from the factory
            return BlockFactory.getBlockClass(blockType);
        } catch (error) {
            console.warn(`Could not get block class for type: ${blockType}`, error);
            return null;
        }
    }

    /**
     * Sets the current block
     * @param {HTMLElement} block 
     */
    setCurrentBlock(block)
    {
        log('setCurrentBlock()', 'Editor.', { block });

        // Ensure block is valid before proceeding
        if (!block) {
            return;
        }

        // Prevent duplicate calls for the same block - check this first before any other operations
        if (this.currentBlock === block) {
            return;
        }

        log('setCurrentBlock()', 'Editor.', { block });

        const previousBlock = this.currentBlock;
        
        if (this.currentBlock) {
            this.currentBlock.classList.remove('bke-block--active');
        }
        
        this.currentBlock = block;
        this.currentBlock.classList.add('bke-block--active');
        
        // Update toolbar button states based on current block
        this.updateToolbarButtonStates();
        
        // Emit block focus event
        this.eventEmitter.emit(EVENTS.BLOCK_ACTIVATED, {
            blockId: (block && block.getAttribute) ? (block.getAttribute('data-block-id') || block.id) : null,
            blockType: (block && block.getAttribute) ? block.getAttribute('data-block-type') : null,
            previousBlockId: (previousBlock && previousBlock.getAttribute) ? (previousBlock.getAttribute('data-block-id') || previousBlock.id) : null,
            timestamp: Date.now()
        }, { throttle: 50, source: 'editor.focus' });
        
        // Update debug tooltip for the active block only
        if (this.debugMode && this.debugTooltip) {
            this.debugTooltip.updateActiveBlockTooltip();
        }
    }

    /**
     * Creates and initializes the markdown container
     * @returns {boolean} True if successful, false otherwise
     */
    initMarkdownContainer()
    {
        log('initMarkdownContainer()', 'Editor.');

        try {
            const container = this.instance;
            // Check if container already exists to avoid duplicates
            const existing = container.querySelector('.bke-editor-markdown');
            if (existing) {
                logWarning('Markdown container already exists, skipping initialization.', 'Editor.initMarkdownContainer()');
                return true;
            }

            const wrapper = document.createElement('div');
            wrapper.className = 'bke-editor-markdown bke-hidden';

            const header = document.createElement('div');
            header.className = 'bke-view-header';

            const label = document.createElement('span');
            label.className = 'bke-view-label';
            label.textContent = 'Markdown';

            const copyBtn = document.createElement('button');
            copyBtn.className = 'bke-copy-btn';
            copyBtn.title = 'Copy to clipboard';
            copyBtn.setAttribute('type', 'button');
            copyBtn.textContent = 'Copy';
            copyBtn.addEventListener('click', () => {
                const codeEl = wrapper.querySelector('code');
                if (codeEl && navigator.clipboard) {
                    navigator.clipboard.writeText(codeEl.textContent).then(() => {
                        copyBtn.textContent = 'Copied!';
                        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
                    }).catch(() => {});
                }
            });

            header.appendChild(label);
            header.appendChild(copyBtn);

            const pre = document.createElement('pre');
            pre.className = 'language-markdown';

            const code = document.createElement('code');
            code.className = 'language-markdown';
            pre.appendChild(code);

            wrapper.appendChild(header);
            wrapper.appendChild(pre);
            container.appendChild(wrapper);
            return true;
        } catch (error) {
            logWarning('Error initializing markdown container: ' + error.message, 'Editor.initMarkdownContainer()');
            return false;
        }
    }

    /**
     * Creates and initializes the HTML container
     * @returns {boolean} True if successful, false otherwise
     */
    initHtmlContainer()
    {
        log('initHtmlContainer()', 'Editor.');
        
        try {
            const container = this.instance;
            // Check if container already exists to avoid duplicates
            const existing = container.querySelector('.bke-editor-html');
            if (existing) {
                logWarning('HTML container already exists, skipping initialization.', 'Editor.initHtmlContainer()');
                return true;
            }

            const wrapper = document.createElement('div');
            wrapper.className = 'bke-editor-html bke-hidden';

            const header = document.createElement('div');
            header.className = 'bke-view-header';

            const label = document.createElement('span');
            label.className = 'bke-view-label';
            label.textContent = 'HTML';

            const copyBtn = document.createElement('button');
            copyBtn.className = 'bke-copy-btn';
            copyBtn.title = 'Copy to clipboard';
            copyBtn.setAttribute('type', 'button');
            copyBtn.textContent = 'Copy';
            copyBtn.addEventListener('click', () => {
                const codeEl = wrapper.querySelector('code');
                if (codeEl && navigator.clipboard) {
                    navigator.clipboard.writeText(codeEl.textContent).then(() => {
                        copyBtn.textContent = 'Copied!';
                        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
                    }).catch(() => {});
                }
            });

            header.appendChild(label);
            header.appendChild(copyBtn);

            const pre = document.createElement('pre');
            pre.className = 'language-markup';

            const code = document.createElement('code');
            code.className = 'language-markup';
            pre.appendChild(code);

            wrapper.appendChild(header);
            wrapper.appendChild(pre);
            container.appendChild(wrapper);
            return true;
        } catch (error) {
            logWarning('Error initializing HTML container: ' + error.message, 'Editor.initHtmlContainer()');
            return false;
        }
    }

    /**
     * Get all editor content as markdown
     * @returns {string}
     */
    getMarkdown()
    {
        log('getMarkdown()', 'Editor.');
        return this.serializer.getMarkdown(this.instance);
    }

    /**
     * Get all editor content as HTML
     * @returns {string}
     */
    getHtml()
    {
        log('getHtml()', 'Editor.');
        return this.serializer.getHtml(this.instance);
    }

    /**
     * Check if a block should be converted to a different type based on its content
     * @param {HTMLElement} blockElement - The block element to check
     * @returns {boolean} - true if block was converted, false otherwise
     */
    checkAndConvertBlock(blockElement)
    {
        log('checkAndConvertBlock()', 'Editor.');
        return this._blockConverter.checkAndConvert(blockElement);
    }

    /**
     * Execute a function inside a transaction. During the transaction:
     * - Event emission is suppressed (no intermediate EDITOR_UPDATED / CONTENT_CHANGED)
     * - Empty-editor protection is disabled (isBusy() returns true)
     * - Pending debounced updates are cancelled
     *
     * After the callback completes (or throws) the transaction ends and a
     * single update() is triggered so listeners receive one consolidated event.
     *
     * Transactions nest safely — only the outermost transaction triggers
     * the final update.
     *
     * @param {Function} fn - The function to execute inside the transaction
     * @returns {*} The return value of fn
     */
    transaction(fn) {
        log('transaction()', 'Editor.');

        const isOutermost = this._stateMachine._transactionDepth === 0;

        // Cancel any pending debounced update so it doesn't fire mid-transaction
        if (isOutermost && this._updateTimeout) {
            clearTimeout(this._updateTimeout);
            this._updateTimeout = null;
        }

        this._stateMachine.startTransaction();
        this.eventEmitter.suppress();

        try {
            return fn();
        } finally {
            this.eventEmitter.resume();
            this._stateMachine.finishTransaction();

            // Only the outermost transaction triggers the consolidated update
            if (this._stateMachine._transactionDepth === 0) {
                this.update();
            }
        }
    }

    /**
     * Convert a block from one type to another
     * @param {HTMLElement} blockElement
     * @param {string} targetBlockType
     * @param {string} triggerText
     * @returns {boolean}
     */
    convertBlockType(blockElement, targetBlockType, triggerText)
    {
        log('convertBlockType()', 'Editor.');
        return this._blockConverter.convertType(blockElement, targetBlockType, triggerText);
    }

    /**
     * Get the block instance associated with a DOM element
     * @param {HTMLElement} element - The block DOM element
     * @returns {BaseBlock|null} - The block instance or null
     */
    getBlockForElement(element)
    {
        return this._blockMap.get(element) || null;
    }

    /**
     * Find the editable element within a block (for lists, this might be an <li>, for others the block itself)
     * @param {HTMLElement} blockElement - The block element to search in
     * @returns {HTMLElement|null} - The editable element or null if not found
     */
    findEditableElementInBlock(blockElement)
    {
        return this.cursor.findEditableElementInBlock(blockElement);
    }

    /**
     * Place cursor at the end of the given element
     * @param {HTMLElement} element - The element to place cursor in
     */
    placeCursorAtEnd(element)
    {
        return this.cursor.placeCursorAtEnd(element);
    }

    /**
     * Place cursor at the start of the given element
     * @param {HTMLElement} element - The element to place cursor in
     */
    placeCursorAtStart(element)
    {
        return this.cursor.placeCursorAtStart(element);
    }

    /**
     * Place cursor at a specific character offset within an element.
     * Clamps to the element's text length if offset exceeds it.
     * @param {HTMLElement} element - The element to place cursor in
     * @param {number} offset - The desired character offset from the start
     */
    placeCursorAtOffset(element, offset)
    {
        return this.cursor.placeCursorAtOffset(element, offset);
    }

    /**
     * Convert current block to target type or create new block if conversion is not possible
     * @param {string} targetBlockType - The target block type to convert to
     * @param {Object} options - Optional parameters for block creation
     * @returns {boolean} - true if conversion or creation was successful
     */
    convertCurrentBlockOrCreate(targetBlockType, options = {})
    {
        log('convertCurrentBlockOrCreate()', 'Editor.');
        return this._blockConverter.convertCurrentOrCreate(targetBlockType, options, this.currentBlock);
    }

    /**
     * Generate appropriate trigger text for a given block type
     * @param {string} blockType
     * @param {string} existingContent
     * @returns {string}
     */
    generateTriggerForBlockType(blockType, existingContent = '')
    {
        log('generateTriggerForBlockType()', 'Editor.');
        return this._blockConverter.generateTrigger(blockType, existingContent);
    }

    /**
     * Create a new block of the specified type
     * @param {string} blockType - The type of block to create
     * @param {Object} options - Optional parameters for block creation
     * @returns {boolean} - true if creation was successful
     */
    createNewBlock(blockType, options = {})
    {
        return this._blockManager.createNewBlock(blockType, options);
    }
    
    /**
     * Destroy the editor instance and clean up resources
     */
    destroy() {
        log('destroy()', 'Editor.');

        // Remove DOM event listeners
        if (this._boundHandlers && this.contentArea) {
            Object.entries(this._boundHandlers).forEach(([event, handler]) => {
                this.contentArea.removeEventListener(event, handler);
            });
            this._boundHandlers = null;
        }

        // Cleanup event emitter
        this.eventEmitter?.cleanup?.();

        // Disable debug tooltips if enabled
        if (this.debugTooltip) {
            this.debugTooltip.disable();
        }

        // Remove this instance from the registry
        if (this.instance) {
            Editor._instances.delete(this.instance);
        }

        // Clear references
        this.blocks = [];
        this.currentBlock = null;
        this._blockMap = new WeakMap();
        this.debugTooltip = null;
        this.eventEmitter = null;
        this.instance = null;
    }
}