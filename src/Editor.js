'use strict';

import {Toolbar} from "./Toolbar.js";
import {log, logWarning} from "./utils/log.js";
import showdown from "showdown";
import {EditorEventEmitter, EVENTS} from "@/utils/eventEmitter.js";
import {Block} from "@/Block.js";
import {Parser} from "@/Parser.js";
import {BlockType} from "@/BlockType.js";
import {Utils} from "@/Utils.js";
import {BlockFactory} from "@/blocks/BlockFactory.js";
import {KeyHandler} from "@/KeyHandler.js";
import {DebugTooltip} from "@/DebugTooltip.js";
import {EditorStateMachine} from "@/utils/EditorStateMachine.js";

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

        // Initialize toolbar - use the editor instance element's parent as container
        const toolbarContainer = this.instance.parentElement || this.instance;
        const defaultToolbarConfig = [
            {
                group: [
                    { class: 'editor-toolbar-undo', icon: 'fa-undo', title: 'undo' },
                    { class: 'editor-toolbar-redo', icon: 'fa-redo', title: 'redo' }
                ]
            },
            {
                group: [
                    { class: 'editor-toolbar-header1', label: 'Header 1' },
                    { class: 'editor-toolbar-header2', label: 'Header 2' },
                    { class: 'editor-toolbar-header3', label: 'Header 3' },
                    { class: 'editor-toolbar-header4', label: 'Header 4' },
                    { class: 'editor-toolbar-header5', label: 'Header 5' },
                    { class: 'editor-toolbar-header6', label: 'Header 6' },
                    { class: 'editor-toolbar-paragraph', label: 'Paragraph' }
                ],
                dropdown: true,
                icon: 'fa-heading',
                id: 'dropdownMenuHeader'
            },
            {
                group: [
                    { class: 'editor-toolbar-bold', icon: 'fa-bold', title: 'bold' },
                    { class: 'editor-toolbar-italic', icon: 'fa-italic', title: 'italic' },
                    { class: 'editor-toolbar-underline', icon: 'fa-underline', title: 'underline' },
                    { class: 'editor-toolbar-strikethrough', icon: 'fa-strikethrough', title: 'strikethrough' }
                ]
            },
            {
                group: [
                    { class: 'editor-toolbar-ul', icon: 'fa-list', title: 'unordered list' },
                    { class: 'editor-toolbar-ol', icon: 'fa-list-ol', title: 'ordered list' },
                    { class: 'editor-toolbar-sq', icon: 'fa-list-check', title: 'task list' }
                ]
            },
            {
                group: [
                    { class: 'editor-toolbar-table', icon: 'fa-table', title: 'insert table' },
                    { class: 'editor-toolbar-image', icon: 'fa-image', title: 'insert image' }
                ]
            },
            {
                group: [
                    { class: 'editor-toolbar-code', icon: 'fa-code', title: 'code block' }
                ]
            },
            {
                group: [
                    { class: 'editor-toolbar-text', icon: 'fa-paragraph', title: 'text view', disabled: true },
                    { class: 'editor-toolbar-markdown', icon: 'fa-brands fa-markdown', title: 'markdown view' },
                    { class: 'editor-toolbar-html', icon: 'fa-brands fa-html5', title: 'html view' }
                ]
            }
        ];
        
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
                editorInstance: this
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
        editorContainer.className = 'editor';

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
        this.instance.setAttribute('contenteditable', 'true');

        let content = options.text || this.instance.innerHTML || '';
        let blocks = Parser.parse(content);
        
        this.blocks = blocks;
        
        if ( 0 === blocks.length ) {
            blocks = [new Block()];
        }

        // @fixme use timestamp(content) for tracking changes
        
        /*$(element).on('focus', (e) => {
            const currentTarget = e.currentTarget;
            currentTarget.data('before', $(this).html());
        }).on('blur keyup paste input', (e) => {
            const currentTarget = e.currentTarget;
            if ( $(this).data('before') !== $(this).html() ) {
                $(this).data('before', $(this).html());
                $(this).trigger('change');
            }
        });*/
        
        //Editor.html2md($(element).html());
        
        /*$(element).on('change', () => {
            Editor.update();
        });*/
    
        //Editor.update();
        
        for ( let block of blocks ) {
            let html = Parser.html(block);
            this.instance.appendChild(html);
            // Link typed block instance to its DOM element
            const typedBlock = block.getBlockInstance ? block.getBlockInstance() : block;
            if (typedBlock && typedBlock.element !== undefined) {
                typedBlock.element = html;
            }
            this._blockMap.set(html, typedBlock);
        }
        
        this.setCurrentBlock(this.instance.querySelectorAll('.block')[0]);
    
        this.keyHandler = new KeyHandler(this);
        this.addListeners();
        
        // @fixme focus only if empty content
        if ( 0 ) {
            this.focus();
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
     * Destroy the editor instance and cleanup
     */
    destroy()
    {
        log('destroy()', 'Editor.');

        // Stop debug update loop and remove tooltips
        this.stopDebugUpdateLoop();
        this.removeDebugTooltips();
        this.removeDebugEventListeners();
        
        // Remove debug mode class
        if (this.instance) {
            this.instance.classList.remove('debug-mode');
        }
        
        // Cleanup event emitter
        this.eventEmitter.cleanup();
        
        // Remove from instances registry
        Editor._instances.delete(this.instance);
        
        // Remove DOM event listeners
        // (Event listeners will be cleaned up when element is removed)
        
        // Clear instance properties
        this.instance = null;
        this.blocks = [];
        this.currentBlock = null;
        this._blockMap = new WeakMap();
        this.rules = [];
        this.keybuffer = [];
    }
    
    /**
     * Adds event listeners to this editor instance
     */
    addListeners()
    {
        log('addListeners()', 'Editor.');
        
        this.instance.addEventListener('keydown', (e) => {
            this.keyHandler.handleSpecialKeys(e);
        });
    
        this.instance.addEventListener('keyup', (e) => {
            this.keyHandler.handleKeyPress(e);
        });
        
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
        this.instance.addEventListener('beforeinput', (e) => {
            if (!e.inputType.startsWith('delete')) return;

            const selection = window.getSelection();
            if (!selection || !selection.rangeCount) return;

            const range = selection.getRangeAt(0);
            if (range.collapsed) return; // Single-point deletion — let the browser handle it

            const allBlocks = this.instance.querySelectorAll('.block');
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
            let remainingBlocks = this.instance.querySelectorAll('.block');

            if (!firstBlockContent && remainingBlocks.length > 1 && firstBlock.isConnected) {
                const neighbor = firstBlock.previousElementSibling
                    || firstBlock.nextElementSibling;
                firstBlock.remove();
                remainingBlocks = this.instance.querySelectorAll('.block');
                if (neighbor && neighbor.isConnected && neighbor.classList.contains('block')) {
                    this.setCurrentBlock(neighbor);
                    this.focus(neighbor);
                } else if (remainingBlocks.length > 0) {
                    this.setCurrentBlock(remainingBlocks[remainingBlocks.length - 1]);
                    this.focus(remainingBlocks[remainingBlocks.length - 1]);
                }
            }

            // --- 7. Ensure at least one block always exists -------------------
            remainingBlocks = this.instance.querySelectorAll('.block');
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
        });

        // PASTE TEXT/HTML Event handler
        this.instance.addEventListener('paste', (e) => {
            this.paste(e);
            e.preventDefault();
        });
        
        // INPUT Event handler - catch content changes for block conversion
        this.instance.addEventListener('input', (e) => {
            // Only handle input events for this editor instance
            if (!e.target.closest(`#${this.instance.id}`)) {
                return;
            }
            
            // Find the block where the input occurred.
            // NOTE: e.target for input events in a contenteditable container is the
            // editing host (the editor container itself), NOT the child block element.
            // Therefore e.target.closest('.block') would always return null.
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
                    block = anchorNode.closest('.block');
                    // If no block is found but the anchor is a list item, look for the parent list block
                    if (!block && anchorNode.tagName === 'LI') {
                        block = anchorNode.closest('ul, ol, div')?.closest('.block') || null;
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
                const allBlocks = this.instance.querySelectorAll('.block');
                
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
                    }
                }
            }
        });
        
        // Primary handler for setting current block - handles both click and focus events
        this.instance.addEventListener('click', (e) => {
            // Only handle clicks for this editor instance
            if (!e.target.closest(`#${this.instance.id}`)) {
                return;
            }

            let block = e.target.closest('.block');
            
            // If no block is found but the target is a list item, look for the parent list block
            if (!block && e.target.tagName === 'LI') {
                block = e.target.closest('ul, ol, div').closest('.block');
            }
            
            if ( block ) {
                this.setCurrentBlock(block);
            }
        });

        // Handle focus events for keyboard navigation (only when not caused by mouse interaction)
        this.instance.addEventListener('focusin', (e) => {
            // Only handle focus events for this editor instance
            if (!e.target.closest(`#${this.instance.id}`)) {
                return;
            }

            // Skip if this focus event was caused by a recent mouse click
            // to avoid duplicate setCurrentBlock calls
            if (this._lastClickTime && Date.now() - this._lastClickTime < 100) {
                return;
            }

            let block = e.target.closest('.block');
            
            // If no block is found but the target is a list item, look for the parent list block
            if (!block && e.target.tagName === 'LI') {
                block = e.target.closest('ul, ol, div').closest('.block');
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
                        const blockFromSel = anchor.closest('.block');
                        if (blockFromSel) {
                            this.setCurrentBlock(blockFromSel);
                            return;
                        }
                    }
                }
                // Last resort: pick the first block
                const firstBlock = this.instance.querySelector('.block');
                if ( firstBlock ) {
                    this.setCurrentBlock(firstBlock);
                }
            }
        });

        // Track mouse clicks to prevent duplicate focus handling
        this.instance.addEventListener('mousedown', () => {
            this._lastClickTime = Date.now();
        });
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
            const firstBlock = this.instance.querySelector('.block');
            if ( firstBlock && firstBlock.isConnected ) {
                // Set current block and try to focus again, but prevent infinite recursion
                this.setCurrentBlock(firstBlock);
                // Direct focus without recursive call
                this.focusElement(firstBlock);
                return;
            } else {
                // No blocks available, focus on editor instance itself
                if (this.instance && this.instance.isConnected) {
                    this.instance.focus();
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
        log('focusElement()', 'Editor.');

        if (!element || !element.isConnected) {
            return;
        }
        
        const range = document.createRange();
        const selection = window.getSelection();
    
        // Clear existing selections
        selection.removeAllRanges();
        
        //range.selectNode(element);
        // Create and set the range
        range.selectNodeContents(element);
        range.collapse(false);
        
        // Set the selection
        selection.addRange(range);
    
        // Ensure element is visible
        element.scrollIntoView({ behavior: 'smooth' });
    }
    
    /**
     *
     * @param {ClipboardEvent} e
     */
    paste(e)
    {
        log('paste()', 'Editor.'); console.log({e});
        
        e.preventDefault(); // Prevent default paste behavior
        
        let text = (e.clipboardData || window.clipboardData).getData('text');
        let htmlData = (e.clipboardData || window.clipboardData).getData('text/html');
        
        const selection = window.getSelection();
        
        if ( !selection.rangeCount ) {
            return false;
        }
        
        // If HTML data is available, handle complex content properly
        if ( htmlData && htmlData.trim() !== '' ) {
            // Basic HTML sanitization - remove script tags and event handlers
            htmlData = htmlData
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/on\w+="[^"]*"/gi, '')
                .replace(/on\w+='[^']*'/gi, '')
                .replace(/javascript:/gi, '');
            
            // Use Parser to properly parse HTML into blocks
            try {
                const blocks = Parser.parseHtml(htmlData);
                if ( blocks.length > 1 ) {
                    // Complex content with multiple blocks - insert as separate blocks
                    this.transaction(() => {
                        this.insertMultipleBlocks(blocks);
                    });
                    
                    // Emit paste event
                    this.eventEmitter.emit(EVENTS.USER_PASTE, {
                        text: text,
                        html: htmlData,
                        blocksCount: blocks.length,
                        timestamp: Date.now()
                    }, { source: 'user.paste' });
                    
                    return;
                } else if ( blocks.length === 1 ) {
                    // Single block - handle as inline content
                    const block = blocks[0];
                    this.insertInlineContent(block.html || block.content, selection);
                } else {
                    // Fallback to markdown conversion
                    const finalHtml = Editor.md2html(Utils.escapeHTML(text));
                    this.insertInlineContent(finalHtml, selection);
                }
            } catch (error) {
                logWarning('Error parsing HTML data, falling back to markdown conversion', 'Editor.paste()');
                const finalHtml = Editor.md2html(Utils.escapeHTML(text));
                this.insertInlineContent(finalHtml, selection);
            }
        } else {
            // Handle plain text - check for multiple lines that could be separate blocks
            const lines = text.split('\n').filter(line => line.trim() !== '');
            if (lines.length > 1) {
                // Multiple lines - create separate blocks for each line
                this.transaction(() => {
                    this.insertMultipleLinesAsBlocks(lines);
                });
                
                // Emit paste event
                this.eventEmitter.emit(EVENTS.USER_PASTE, {
                    text: text,
                    html: htmlData,
                    linesCount: lines.length,
                    timestamp: Date.now()
                }, { source: 'user.paste' });
                
                return;
            } else {
                // Single line - convert markdown to HTML and insert inline
                const finalHtml = Editor.md2html(Utils.escapeHTML(text));
                this.insertInlineContent(finalHtml, selection);
            }
        }
        
        // Emit paste event for single content
        this.eventEmitter.emit(EVENTS.USER_PASTE, {
            text: text,
            html: htmlData,
            timestamp: Date.now()
        }, { source: 'user.paste' });
        
        // Update editor after paste
        this.update();
    }

    /**
     * Insert multiple blocks as separate block elements
     * @param {Array} blocks - Array of parsed block objects
     */
    insertMultipleBlocks(blocks) {
        log('insertMultipleBlocks()', 'Editor.');
        
        // Get current block
        const currentBlock = this.currentBlock;
        let insertAfterBlock = currentBlock;
        
        // Clear current block if it's empty (to replace it with first pasted block)
        if (currentBlock && this.isBlockEmpty(currentBlock)) {
            // Replace empty block with first pasted block
            const firstBlock = blocks[0];
            const firstBlockElement = this.createBlockElement(firstBlock);
            
            if (firstBlockElement) {
                currentBlock.parentNode.replaceChild(firstBlockElement, currentBlock);
                this.setCurrentBlock(firstBlockElement);
                insertAfterBlock = firstBlockElement;
                
                // Remove first block from array since it replaced the current block
                blocks = blocks.slice(1);
            }
        }
        
        // Insert remaining blocks after the current/replaced block
        blocks.forEach((block, index) => {
            const blockElement = this.createBlockElement(block);
            if (blockElement && insertAfterBlock) {
                insertAfterBlock.after(blockElement);
                insertAfterBlock = blockElement;
                
                // Set focus to the last inserted block
                if (index === blocks.length - 1) {
                    this.setCurrentBlock(blockElement);
                    this.focus(blockElement);
                }
            }
        });
    }

    /**
     * Insert multiple lines as separate paragraph blocks
     * @param {Array} lines - Array of text lines
     */
    insertMultipleLinesAsBlocks(lines) {
        log('insertMultipleLinesAsBlocks()', 'Editor.');
        
        // Get current block
        const currentBlock = this.currentBlock;
        let insertAfterBlock = currentBlock;
        
        // Clear current block if it's empty (to replace it with first line)
        if (currentBlock && this.isBlockEmpty(currentBlock)) {
            // Replace empty block with first line
            const firstLineHtml = Editor.md2html(Utils.escapeHTML(lines[0]));
            const firstBlockElement = this.createParagraphBlock(firstLineHtml);
            
            if (firstBlockElement) {
                currentBlock.parentNode.replaceChild(firstBlockElement, currentBlock);
                this.setCurrentBlock(firstBlockElement);
                insertAfterBlock = firstBlockElement;
                
                // Remove first line from array since it replaced the current block
                lines = lines.slice(1);
            }
        }
        
        // Insert remaining lines as new paragraph blocks
        lines.forEach((line, index) => {
            const lineHtml = Editor.md2html(Utils.escapeHTML(line));
            const blockElement = this.createParagraphBlock(lineHtml);
            
            if (blockElement && insertAfterBlock) {
                insertAfterBlock.after(blockElement);
                insertAfterBlock = blockElement;
                
                // Set focus to the last inserted block
                if (index === lines.length - 1) {
                    this.setCurrentBlock(blockElement);
                    this.focus(blockElement);
                }
            }
        });
    }

    /**
     * Create a block element from a parsed block object
     * @param {Object} block - Parsed block object
     * @returns {HTMLElement|null} - Created block element
     */
    createBlockElement(block) {
        try {
            // Create block instance
            const blockInstance = block._blockInstance || BlockFactory.createBlock(
                block.type, 
                block.content, 
                block.html, 
                block.nested
            );
            
            if (!blockInstance) {
                return null;
            }
            
            // Render to element
            const blockElement = blockInstance.renderToElement();
            
            if (blockElement) {
                // Generate unique block ID
                const blockId = 'block-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                blockElement.setAttribute('data-block-id', blockId);
                blockElement.setAttribute('data-timestamp', Date.now().toString());
                
                // Emit block creation event
                this.eventEmitter.emit(EVENTS.BLOCK_CREATED, {
                    blockId: blockId,
                    blockType: block.type,
                    timestamp: Date.now()
                }, { source: 'paste.create' });
            }
            
            return blockElement;
        } catch (error) {
            logWarning('Error creating block element', 'Editor.createBlockElement()');
            return null;
        }
    }

    /**
     * Create a paragraph block element with given HTML content
     * @param {string} html - HTML content for the paragraph
     * @returns {HTMLElement|null} - Created paragraph block element
     */
    createParagraphBlock(html) {
        try {
            const paragraphBlock = BlockFactory.createBlock(BlockType.PARAGRAPH, '', html);
            const blockElement = paragraphBlock.renderToElement();
            
            if (blockElement) {
                // Generate unique block ID
                const blockId = 'block-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                blockElement.setAttribute('data-block-id', blockId);
                blockElement.setAttribute('data-timestamp', Date.now().toString());
                
                // Emit block creation event
                this.eventEmitter.emit(EVENTS.BLOCK_CREATED, {
                    blockId: blockId,
                    blockType: BlockType.PARAGRAPH,
                    timestamp: Date.now()
                }, { source: 'paste.create' });
            }
            
            return blockElement;
        } catch (error) {
            logWarning('Error creating paragraph block', 'Editor.createParagraphBlock()');
            return null;
        }
    }

    /**
     * Insert content inline within the current selection
     * @param {string} html - HTML content to insert
     * @param {Selection} selection - Current selection object
     */
    insertInlineContent(html, selection) {
        if ( selection.rangeCount ) {
            const range = selection.getRangeAt(0);
            
            try {
                const node = document.createRange().createContextualFragment(html);
                range.deleteContents(); // Clear selected content first
                range.insertNode(node);
                
                // Move cursor to end of inserted content
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            } catch (error) {
                logWarning('Error inserting inline content', 'Editor.insertInlineContent()');
                // Fallback to execCommand if modern approach fails
                document.execCommand('insertHTML', false, html);
            }
        }
    }

    /**
     * Check if a block is effectively empty
     * @param {HTMLElement} block - Block element to check
     * @returns {boolean} - True if block is empty
     */
    isBlockEmpty(block) {
        if (!block) return true;
        
        const textContent = block.textContent || '';
        const cleanText = textContent.trim();
        const innerHTML = block.innerHTML || '';
        
        // Consider block empty if it only contains whitespace or common empty elements
        return cleanText === '' || cleanText === '\n' || innerHTML === '<br>' || innerHTML === '<br/>' || innerHTML === '<br />';
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

        let editorHtml = this.instance.innerHTML;
        
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
        const blocks = this.instance.querySelectorAll('.block');
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
            blockCount: this.instance.querySelectorAll('.block').length
        });
        
        // Emit debounced content change event for backend synchronization
        this.eventEmitter.emit(EVENTS.CONTENT_CHANGED, {
            html: editorHtml,
            markdown: markdownContent,
            timestamp: Date.now()
        }, { debounce: 500, source: 'editor.update' });
        
        // Update debug tooltips if debug mode is active
        /*if (this.debugMode && this.debugTooltip) {
            // Use a slight delay to ensure DOM updates are complete
            setTimeout(() => this.debugTooltip.updateActiveBlockTooltip(), 10);
        }*/
    }

    /**
     * Update timestamps for all blocks to track content changes
     */
    updateBlockTimestamps()
    {
        log('updateBlockTimestamps()', 'Editor.');

        const blocks = this.instance.querySelectorAll('.block');
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
                
                // Update debug tooltip if this is the active block
                /*if (this.debugMode && this.debugTooltip && block === this.currentBlock) {
                    setTimeout(() => this.debugTooltip.updateActiveBlockTooltip(), 10);
                }*/
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
        if (!block) return false;
        const type = block.getAttribute('data-block-type');
        // Treat missing type as paragraph (for legacy/malformed blocks)
        return !type || type === 'p' || type === 'paragraph';
    }

    /**
     * Check if the editor is effectively empty (all blocks contain no meaningful content)
     * @param {NodeList} blocks - Collection of block elements
     * @returns {boolean}
     */
    isEditorEmpty(blocks)
    {
        log('isEditorEmpty()', 'Editor.');
        
        if (blocks.length === 0) {
            return true;
        }
        
        // Check if all blocks are empty (contain only whitespace or no content)
        for (let block of blocks) {
            const textContent = Utils.stripTags(block.innerHTML).trim();
            if (textContent.length > 0) {
                return false; // Found non-empty block
            }
        }
        
        return true; // All blocks are empty
    }

    /**
     * Ensures the editor has at least one default block
     * Handles the empty editor edge case safely
     */
    ensureDefaultBlock()
    {
        log('ensureDefaultBlock()', 'Editor.');
        
        // Get all current blocks
        const allBlocks = this.instance.querySelectorAll('.block');
        
        // Decide if we need a default block
        let needsDefault = false;
        
        if (allBlocks.length === 0) {
            // No blocks at all - definitely need a default
            needsDefault = true;
        } else if (allBlocks.length === 1 && this.isEditorEmpty(allBlocks)) {
            // One empty block - only replace if it's a paragraph
            const onlyBlock = allBlocks[0];
            if (this.isParagraphBlock(onlyBlock)) {
                needsDefault = true;
            }
        }
        
        // If editor is empty, create a default block
        if (needsDefault) {
            // Detach events from existing blocks first
            if (allBlocks.length > 0) {
                this.detachBlockEvents(allBlocks);
            }
            
            // Clear the editor content
            this.instance.innerHTML = '';
            
            // Reset current block reference to prevent focus issues
            this.currentBlock = null;
            
            // Create and add a new default block
            const newBlock = this.addDefaultBlock();
            
            // No need to call update() here as this method is already called from within the update cycle
            // The newly created block will be processed by the current update cycle
            
            return newBlock;
        }
        
        return null;
    }

    /**
     * Detach events from blocks before removing them
     * @param {NodeList} blocks - Collection of block elements to clean up
     */
    detachBlockEvents(blocks)
    {
        log('detachBlockEvents()', 'Editor.');
        
        blocks.forEach(block => {
            // Clone the block to remove all event listeners
            const clonedBlock = block.cloneNode(true);
            
            // Emit a block destroy event for any cleanup needed
            if (block.getAttribute('data-block-id')) {
                this.eventEmitter.emit(EVENTS.BLOCK_DESTROYED, {
                    blockId: block.getAttribute('data-block-id'),
                    blockType: block.getAttribute('data-block-type'),
                    timestamp: Date.now()
                }, { source: 'editor.cleanup' });
            }
            
            // Replace the block with its clone (removes all event listeners)
            if (block.parentNode) {
                block.parentNode.replaceChild(clonedBlock, block);
            }
        });
    }

      /**
     *
     * @param {string} html
     * @returns {string} md
     */
    static html2md(html)
    {
        log('html2md()', 'Editor.'); //console.log({html});
        
        try {
            // Validate input
            if ( !html || typeof html !== 'string' ) {
                logWarning('Invalid HTML input for conversion', 'Editor.html2md()');
                return '';
            }
            
            let converter = new showdown.Converter({ ghCompatibleHeaderId: false, headerIds: false });
            
            return converter.makeMd(html);
        } catch (error) {
            logWarning('Error converting HTML to markdown: ' + error.message, 'Editor.html2md()');
            return html; // Return original HTML as fallback
        }
    }

    /**
     *
     * @param {string} md
     * @returns {string} html
     */
    static md2html(md)
    {
        log('md2html()', 'Editor.');
        
        try {
            // Validate input
            if ( !md || typeof md !== 'string' ) {
                logWarning('Invalid markdown input for conversion', 'Editor.md2html()');
                return '';
            }
    
            const converter = new showdown.Converter({ ghCompatibleHeaderId: false, headerIds: false });
            
            let html = converter.makeHtml(md);
            
            //html = html.replace(/(<\/code><\/pre>$(?![\r\n]))/gm, '$1<p><br></p>');
            html = html.replace(/(<\/code><\/pre>$(?![\r\n]))/gm, '$1<br>');
            
            return html;
        } catch (error) {
            logWarning('Error converting markdown to HTML: ' + error.message, 'Editor.md2html()');
            return Utils.escapeHTML(md); // Return escaped markdown as fallback
        }
    }
    

    
    /**
     * @return HTMLElement
     */
    addDefaultBlock()
    {
        log('addDefaultBlock()', 'Editor.');
        
        // Transition state machine to CREATING to prevent empty-editor checks
        this._stateMachine.startCreating();
        
        const block = new Block(BlockType.PARAGRAPH);
        const htmlBlock = Parser.html(block);
        
        // Link block instance to its DOM element
        const typedBlock = block.getBlockInstance ? block.getBlockInstance() : block;
        if (typedBlock && typedBlock.element !== undefined) {
            typedBlock.element = htmlBlock;
        }
        this._blockMap.set(htmlBlock, typedBlock);
        
        // Generate unique block ID
        const blockId = 'block-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        htmlBlock.setAttribute('data-block-id', blockId);
        htmlBlock.setAttribute('data-timestamp', Date.now().toString());
        
        const currentBlock = this.currentBlock;
    
        // Ensure currentBlock exists
        if ( !currentBlock ) {
            this.instance.appendChild(htmlBlock);
        } else {
            currentBlock.after(htmlBlock);
        }
    
        // Update currentBlock reference
        this.setCurrentBlock(htmlBlock);
    
        // Emit block creation event
        this.eventEmitter.emit(EVENTS.BLOCK_CREATED, {
            blockId: blockId,
            blockType: BlockType.PARAGRAPH,
            position: Array.from(this.instance.querySelectorAll('.block')).indexOf(htmlBlock),
            timestamp: Date.now()
        }, { source: 'editor.create' });
    
        // Focus the block synchronously within a single requestAnimationFrame
        // to avoid timing races where user input arrives before focus lands
        requestAnimationFrame(() => {
            if (htmlBlock.isConnected) {
                this.focus(htmlBlock);
            }
            this._stateMachine.finishCreating();
        });
        
        return htmlBlock;
    }

    /**
     * Updates toolbar button states based on the current block
     */
    updateToolbarButtonStates()
    {
        log('updateToolbarButtonStates()', 'Editor.');

        if (!this.currentBlock) {
            return;
        }

        const blockType = this.currentBlock.getAttribute('data-block-type');
        if (!blockType) {
            return;
        }

        // Get the block class to access its static methods
        const blockClass = Editor.getBlockClass(blockType);
        if (!blockClass) {
            return;
        }

        // Get disabled buttons for this block type (static method)
        const disabledButtons = blockClass.getDisabledButtons();
        
        // Reset all toolbar buttons to enabled state
        this.enableAllToolbarButtons();
        
        // Disable buttons that shouldn't be available for this block type
        disabledButtons.forEach(buttonClass => {
            const button = document.querySelector(`.${buttonClass}`);
            if (button) {
                button.disabled = true;
                button.classList.add('disabled');
            }
        });

        log('updateToolbarButtonStates()', 'Editor.', { blockType, disabledButtons });
    }

    /**
     * Enables all toolbar buttons (resets their state)
     */
    enableAllToolbarButtons()
    {
        log('enableAllToolbarButtons()', 'Editor.');

        const toolbarButtons = document.querySelectorAll('.editor-toolbar button');
        toolbarButtons.forEach(button => {
            // Don't re-enable view buttons that are currently disabled for good reason
            const isViewButton = button.classList.contains('editor-toolbar-text') || 
                               button.classList.contains('editor-toolbar-markdown') || 
                               button.classList.contains('editor-toolbar-html');
            
            // Enable all non-view buttons, but preserve view button states
            if (!isViewButton) {
                button.disabled = false;
                button.classList.remove('disabled');
            }
        });
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
            this.currentBlock.classList.remove('active-block');
        }
        
        this.currentBlock = block;
        this.currentBlock.classList.add('active-block');
        
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
            const markdownContainer = document.createElement('textarea');
            markdownContainer.id = 'editor-markdown';
            markdownContainer.className = 'editor-text-md visually-hidden';
            markdownContainer.style.width = '100%';
            markdownContainer.style.minHeight = '300px';

            const container = document.querySelector('.editor-container');
            if (container) {
                // Check if container already exists to avoid duplicates
                const existing = container.querySelector('#editor-markdown');
                if (existing) {
                    logWarning('Markdown container already exists, skipping initialization.', 'Editor.initMarkdownContainer()');
                    return true;
                }
                container.appendChild(markdownContainer);
                return true;
            } else {
                logWarning('Editor container not found for Markdown container initialization.', 'Editor.initMarkdownContainer()');
                return false;
            }
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
            const htmlContainer = document.createElement('div');
            htmlContainer.id = 'editor-html';
            htmlContainer.className = 'editor-text-html visually-hidden';
            htmlContainer.style.width = '100%';
            htmlContainer.style.minHeight = '300px';

            const container = document.querySelector('.editor-container');
            if (container) {
                // Check if container already exists to avoid duplicates
                const existing = container.querySelector('#editor-html');
                if (existing) {
                    logWarning('HTML container already exists, skipping initialization.', 'Editor.initHtmlContainer()');
                    return true;
                }
                container.appendChild(htmlContainer);
                return true;
            } else {
                logWarning('Editor container not found for HTML container initialization.', 'Editor.initHtmlContainer()');
                return false;
            }
        } catch (error) {
            logWarning('Error initializing HTML container: ' + error.message, 'Editor.initHtmlContainer()');
            return false;
        }
    }

    /**
     * Get all editor content as markdown
     * Reads directly from the DOM to ensure current content is serialized
     * @returns {string} - markdown representation of all content
     */
    getMarkdown()
    {
        log('getMarkdown()', 'Editor.');
        
        try {
            const blockElements = this.instance.querySelectorAll('.block');
            if (blockElements.length === 0) return '';

            const markdownParts = [];
            for (const blockEl of blockElements) {
                const blockType = blockEl.getAttribute('data-block-type');
                const md = this._blockElementToMarkdown(blockEl, blockType);
                if (md !== null) markdownParts.push(md);
            }

            return markdownParts.join('\n\n').trim();
        } catch (error) {
            logWarning('Error getting markdown content: ' + error.message, 'Editor.getMarkdown()');
            return '';
        }
    }

    /**
     * Extract markdown from a single block DOM element
     * @param {HTMLElement} blockEl - The block element
     * @param {string} blockType - The block type attribute value
     * @returns {string|null} - Markdown string or null
     * @private
     */
    _blockElementToMarkdown(blockEl, blockType)
    {
        switch (blockType) {
            case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': {
                const level = parseInt(blockType[1]);
                const heading = blockEl.querySelector(`h${level}`) || blockEl;
                return '#'.repeat(level) + ' ' + (heading.textContent || '');
            }
            case 'p': case 'paragraph': {
                const innerHTML = blockEl.innerHTML || '';
                // Convert inline HTML formatting to markdown
                if (/<[^>]+>/.test(innerHTML)) {
                    return Editor.html2md(`<p>${innerHTML}</p>`).trim();
                }
                return blockEl.textContent || '';
            }
            case 'ul': {
                const items = blockEl.querySelectorAll('li');
                return Array.from(items).map(li => `- ${li.textContent || ''}`).join('\n');
            }
            case 'ol': {
                const items = blockEl.querySelectorAll('li');
                return Array.from(items).map((li, i) => `${i + 1}. ${li.textContent || ''}`).join('\n');
            }
            case 'sq': {
                const items = blockEl.querySelectorAll('li');
                return Array.from(items).map(li => {
                    const checkbox = li.querySelector('input[type="checkbox"]');
                    const checked = checkbox?.checked ? 'x' : ' ';
                    // Get text content excluding the checkbox
                    const textNode = li.querySelector('.task-text, span') || li;
                    let text = textNode.textContent || '';
                    // Remove leading whitespace from checkbox label
                    text = text.replace(/^\s+/, '');
                    return `- [${checked}] ${text}`;
                }).join('\n');
            }
            case 'code': {
                const code = blockEl.querySelector('code');
                const text = code?.textContent || blockEl.textContent || '';
                const langMatch = code?.className?.match(/language-(\w+)/);
                const lang = langMatch ? langMatch[1] : '';
                return '```' + lang + '\n' + text + '\n```';
            }
            case 'quote': {
                const bq = blockEl.querySelector('blockquote') || blockEl;
                return '> ' + (bq.textContent || '');
            }
            case 'delimiter':
                return '---';
            case 'table': {
                const headers = Array.from(blockEl.querySelectorAll('th')).map(th => th.textContent || '');
                const rows = Array.from(blockEl.querySelectorAll('tbody tr')).map(tr =>
                    Array.from(tr.querySelectorAll('td')).map(td => td.textContent || '')
                );
                if (headers.length === 0) return '';
                let md = '| ' + headers.join(' | ') + ' |\n';
                md += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
                rows.forEach(row => {
                    md += '| ' + row.join(' | ') + ' |\n';
                });
                return md.trim();
            }
            case 'image': {
                const img = blockEl.querySelector('img');
                if (!img) return '';
                const src = img.getAttribute('src') || '';
                const alt = img.getAttribute('alt') || '';
                return `![${alt}](${src})`;
            }
            default:
                return blockEl.textContent || '';
        }
    }

    /**
     * Get all editor content as HTML
     * Reads directly from the DOM to ensure current content is serialized
     * @returns {string} - HTML representation of all content
     */
    getHtml()
    {
        log('getHtml()', 'Editor.');
        
        try {
            const blockElements = this.instance.querySelectorAll('.block');
            if (blockElements.length === 0) return '';

            const htmlParts = [];
            for (const blockEl of blockElements) {
                const blockType = blockEl.getAttribute('data-block-type');
                const html = this._blockElementToHtml(blockEl, blockType);
                if (html) htmlParts.push(html);
            }

            return htmlParts.join('\n').trim();
        } catch (error) {
            logWarning('Error getting HTML content: ' + error.message, 'Editor.getHtml()');
            return '';
        }
    }

    /**
     * Extract semantic HTML from a single block DOM element
     * @param {HTMLElement} blockEl - The block element
     * @param {string} blockType - The block type attribute value
     * @returns {string} - Semantic HTML string
     * @private
     */
    _blockElementToHtml(blockEl, blockType)
    {
        switch (blockType) {
            case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': {
                const heading = blockEl.querySelector('h1,h2,h3,h4,h5,h6');
                return heading ? heading.outerHTML : `<${blockType}>${blockEl.textContent || ''}</${blockType}>`;
            }
            case 'p': case 'paragraph':
                return `<p>${blockEl.innerHTML}</p>`;
            case 'ul': case 'ol': {
                const list = blockEl.querySelector(blockType === 'ol' ? 'ol' : 'ul');
                return list ? list.outerHTML : '';
            }
            case 'sq': {
                const list = blockEl.querySelector('ul');
                return list ? list.outerHTML : '';
            }
            case 'code': {
                const pre = blockEl.querySelector('pre');
                return pre ? pre.outerHTML : `<pre><code>${Utils.escapeHTML(blockEl.textContent || '')}</code></pre>`;
            }
            case 'quote': {
                const bq = blockEl.querySelector('blockquote');
                return bq ? bq.outerHTML : `<blockquote>${blockEl.textContent || ''}</blockquote>`;
            }
            case 'delimiter':
                return '<hr>';
            case 'table': {
                const table = blockEl.querySelector('table');
                return table ? table.outerHTML : '';
            }
            case 'image': {
                const img = blockEl.querySelector('img');
                return img ? img.outerHTML : '';
            }
            default:
                return `<p>${blockEl.innerHTML}</p>`;
        }
    }

    /**
     * Check if a block should be converted to a different type based on its content
     * @param {HTMLElement} blockElement - The block element to check
     * @returns {boolean} - true if block was converted, false otherwise
     */
    checkAndConvertBlock(blockElement) 
    {
        log('checkAndConvertBlock()', 'Editor.');
        
        if (!blockElement || !blockElement.hasAttribute('data-block-type')) {
            return false;
        }

        const currentBlockType = blockElement.getAttribute('data-block-type');
        // Preserve trailing space to allow triggers like "# " to match
        // but ignore leading whitespace so triggers at the start still detect
        const rawText = Utils.stripTags(blockElement.innerHTML);
        // Normalize non-breaking spaces (&nbsp; and \u00A0) to regular spaces before checking triggers
        const normalizedText = rawText.replace(/&nbsp;/g, ' ').replace(/\u00A0|\xA0|\u00a0/g, ' ');
        // Decode HTML entities that browsers inject in contenteditable (e.g. > becomes &gt;)
        const decodedText = normalizedText.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
        const textContent = decodedText.replace(/^\s+/, '');
        
        // Find matching block class for the current text content
        const matchingBlockClass = BlockFactory.findBlockClassForTrigger(textContent);
        
        // Only skip conversion if content is empty AND no markdown trigger was found
        // This allows triggers like "# " to work even in "empty" blocks
        if (!textContent && !matchingBlockClass) {
            return false;
        }
        
        if (!matchingBlockClass) {
            return false;
        }

        // Get the block type that should be created
        const targetBlockType = new matchingBlockClass().type;
        
        // Don't convert if it's already the correct type
        if (currentBlockType === targetBlockType) {
            return false;
        }

        // Don't convert non-paragraph blocks (to avoid conflicts)
        // Handle both 'p' (legacy/HTML) and 'paragraph' (current) formats
        if (currentBlockType !== 'p' && currentBlockType !== 'paragraph') {
            return false;
        }

        // Perform the conversion
        return this.convertBlockType(blockElement, targetBlockType, textContent);
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
     * @param {HTMLElement} blockElement - The block element to convert
     * @param {string} targetBlockType - The target block type
     * @param {string} triggerText - The text that triggered the conversion
     * @returns {boolean} - true if conversion was successful, false otherwise
     */
    convertBlockType(blockElement, targetBlockType, triggerText) 
    {
        log('convertBlockType()', 'Editor.');
        
        try {
            // Transition state machine to CONVERTING to prevent empty-editor interference
            this._stateMachine.startConverting();
            
            // Create new block instance
            const newBlock = BlockFactory.createBlock(targetBlockType);
            
            if (!newBlock) {
                return false;
            }

            // Calculate remaining content after removing the trigger
            const blockClass = newBlock.constructor;
            let remainingContent = triggerText;
            
            // Prefer class-provided computation (supports regex triggers)
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

            // Store the cursor position before applying transformation
            const wasFocused = blockElement === this.currentBlock;
            
            // Set the block content to just the remaining content (without trigger)
            // so that applyTransformation can read the correct content
            blockElement.textContent = remainingContent.trim();
            
            // Apply the transformation (this will call the appropriate Toolbar method)
            newBlock.applyTransformation(blockElement, this);
            
            // Link new block to its DOM element
            newBlock.element = blockElement;
            this._blockMap.set(blockElement, newBlock);
            
            // Position cursor appropriately after transformation
            if (wasFocused) {
                requestAnimationFrame(() => {
                    const editableElement = this.findEditableElementInBlock(blockElement);
                    if (editableElement) {
                        editableElement.focus();
                        // If there's content, place cursor at the end
                        if (remainingContent.trim()) {
                            this.placeCursorAtEnd(editableElement);
                        }
                    }
                });
            }
            
            // Emit block conversion event
            this.eventEmitter.emit(EVENTS.BLOCK_CONVERTED, {
                blockId: blockElement.getAttribute('data-block-id') || blockElement.id,
                fromType: blockElement.getAttribute('data-block-type'),
                toType: targetBlockType,
                triggerText: triggerText,
                remainingContent: remainingContent,
                timestamp: Date.now()
            });
            
            return true;
            
        } catch (error) {
            logWarning('Error converting block type: ' + error.message, 'Editor.convertBlockType()');
            return false;
        } finally {
            // Always transition back to IDLE
            this._stateMachine.finishConverting();
        }
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
        log('findEditableElementInBlock()', 'Editor.');

        // 1) For list blocks, prefer the first list item (or its editable child)
        const firstListItem = blockElement.querySelector('li');
        if (firstListItem) {
            const editableInLi = firstListItem.querySelector('[contenteditable="true"]');
            return editableInLi || firstListItem;
        }

        // 2) Prefer any explicitly editable descendant (e.g., <h1 contenteditable="true">)
        const editableChild = blockElement.querySelector('[contenteditable="true"]');
        if (editableChild) {
            return editableChild;
        }

        // 3) If the block itself is contenteditable, use it
        if (blockElement.isContentEditable || blockElement.getAttribute('contenteditable') === 'true') {
            return blockElement;
        }

        // 4) Fallback to the block itself
        return blockElement;
    }

    /**
     * Place cursor at the end of the given element
     * @param {HTMLElement} element - The element to place cursor in
     */
    placeCursorAtEnd(element)
    {
        log('placeCursorAtEnd()', 'Editor.');

        if (!element) {
            return;
        }

        try {
            const selection = window.getSelection();
            const range = document.createRange();
            
            // If element has text content, place cursor at the end
            if (element.childNodes.length > 0) {
                const lastChild = element.childNodes[element.childNodes.length - 1];
                if (lastChild.nodeType === Node.TEXT_NODE) {
                    range.setStart(lastChild, lastChild.textContent.length);
                } else {
                    range.setStart(element, element.childNodes.length);
                }
            } else {
                range.setStart(element, 0);
            }
            
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        } catch (error) {
            // Silently fail for cursor positioning
        }
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
        
        console.log('convertCurrentBlockOrCreate called with:', targetBlockType);
        
        const currentBlock = this.currentBlock;
        log('Current block:', currentBlock);

        if (!currentBlock) {
            // No current block, create a new one
            console.log('No current block, calling createNewBlock');
            return this.createNewBlock(targetBlockType, options);
        }

        const currentBlockType = currentBlock.getAttribute('data-block-type');
        console.log('Current block type:', currentBlockType);
        
        // If current block is a paragraph with content, convert it
        if (currentBlockType === BlockType.PARAGRAPH) {
            // Get current content
            const textContent = currentBlock.textContent || '';
            
            // For conversion, we simulate a trigger that matches the target type
            const triggerText = this.generateTriggerForBlockType(targetBlockType, textContent);
            
            // Use existing conversion logic
            return this.convertBlockType(currentBlock, targetBlockType, triggerText);
        }
        
        // For non-paragraph blocks or empty paragraphs, create a new block after current
        console.log('Creating new block after current');
        return this.createNewBlock(targetBlockType, options);
    }

    /**
     * Generate appropriate trigger text for a given block type
     * @param {string} blockType - The block type to generate trigger for
     * @param {string} existingContent - Existing content to preserve
     * @returns {string} - The trigger text with existing content
     */
    generateTriggerForBlockType(blockType, existingContent = '')
    {
        log('generateTriggerForBlockType()', 'Editor.');

        const blockClass = BlockFactory.getBlockClass(blockType);
        if (!blockClass || typeof blockClass.getMarkdownTriggers !== 'function') {
            return existingContent;
        }
        
        const triggers = blockClass.getMarkdownTriggers();
        if (triggers.length === 0) {
            return existingContent;
        }
        
        // Use the first trigger and append existing content
        return triggers[0] + existingContent;
    }

    /**
     * Create a new block of the specified type
     * @param {string} blockType - The type of block to create
     * @param {Object} options - Optional parameters for block creation
     * @returns {boolean} - true if creation was successful
     */
    createNewBlock(blockType, options = {})
    {
        log('createNewBlock()', 'Editor.');

        try {
            // Transition state machine to CREATING to prevent empty-editor checks
            this._stateMachine.startCreating();
            
            // Ensure there's a current block context
            if (!this.currentBlock) {
                this.ensureDefaultBlock();
            }
            
            // Create the block object
            const newBlock = BlockFactory.createBlock(blockType);
            if (!newBlock) {
                return false;
            }
            
            // Convert block to HTML element
            const htmlBlock = Parser.html(newBlock);
            if (!htmlBlock) {
                return false;
            }
            
            // Link block instance to its DOM element
            newBlock.element = htmlBlock;
            this._blockMap.set(htmlBlock, newBlock);
            
            // Generate unique block ID
            const blockId = 'block-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            htmlBlock.setAttribute('data-block-id', blockId);
            htmlBlock.setAttribute('data-timestamp', Date.now().toString());
            
            // Add the block to the DOM
            const currentBlock = this.currentBlock;
            if (!currentBlock) {
                console.log('Appending to instance');
                this.instance.appendChild(htmlBlock);
            } else {
                console.log('Adding after current block');
                currentBlock.after(htmlBlock);
            }
            
            // Update current block reference
            this.setCurrentBlock(htmlBlock);
            
            // For list blocks, focus on the first list item
            if (blockType === 'ul' || blockType === 'ol') {
                const listItem = htmlBlock.querySelector('li');
                if (listItem) {
                    listItem.focus();
                }
            }
            
            // Emit block creation event
            this.eventEmitter.emit(EVENTS.BLOCK_CREATED, {
                blockId: blockId,
                blockType: blockType,
                options: options,
                position: Array.from(this.instance.querySelectorAll('.block')).indexOf(htmlBlock),
                timestamp: Date.now()
            }, { source: 'editor.create' });
            
            console.log('Block creation successful');
            
            // Clear the state after a short delay to allow the new block to be processed
            setTimeout(() => {
                this._stateMachine.finishCreating();
            }, 100);
            
            return true;
        } catch (error) {
            console.error('Error in createNewBlock:', error);
            logWarning('Error creating new block: ' + error.message, 'Editor.createNewBlock()');
            
            // Clear the state even in error case
            this._stateMachine.finishCreating();
            
            return false;
        }
    }
    
    /**
     * Destroy the editor instance and clean up resources
     */
    destroy() {
        log('destroy()', 'Editor.');
        
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
    }
}