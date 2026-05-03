// noinspection JSDeprecatedSymbols

'use strict';

import { ToolbarHandlers } from "./ToolbarHandlers.js";
import { BlockFactory } from "./blocks/BlockFactory.js";
import {log} from "./utils/log.js";
import {eventEmitter, EVENTS} from "@/utils/eventEmitter.js";
import { ICONS } from "./icons.js";
import { SyntaxHighlighter } from "./utils/syntaxHighlighter.js";

/**
 * Render an icon for use inside a toolbar button.
 *
 * Resolution order:
 *   1. Consumer override  — value from the `icons` Editor option keyed by iconSpec
 *   2. Inline SVG default — looked up in the bundled ICONS map
 *   3. Raw HTML passthrough — strings that start with '<' are returned as-is
 *   4. Function — called and its return value used
 *   5. Legacy FA fallback — rendered as <i class="fa {iconSpec}"></i>
 *
 * @param {string|Function} iconSpec - FA class string, raw HTML/SVG, or factory function
 * @param {Object} [customIcons={}] - Consumer-supplied overrides keyed by iconSpec
 * @returns {string} HTML string for the icon
 */
function renderIcon(iconSpec, customIcons = {}) {
    if (typeof iconSpec === 'function') return iconSpec();
    if (customIcons[iconSpec]) return customIcons[iconSpec];
    if (ICONS[iconSpec]) return ICONS[iconSpec];
    if (typeof iconSpec === 'string' && iconSpec.startsWith('<')) return iconSpec;
    return `<i class="fa ${iconSpec}"></i>`;
}

/**
 * Toolbar class for text formatting and block management.
 * Each Editor instance creates its own Toolbar instance.
 */
export class Toolbar
{
    /**
     * @param {Object} options
     * @param {HTMLElement} options.container - The container element for the toolbar
     * @param {Array} options.config - Toolbar button configuration
     * @param {boolean} [options.debug=false] - Whether debug mode is enabled
     * @param {Object} options.editorInstance - The Editor instance this toolbar belongs to
     */
    constructor(options)
    {
        log('constructor()', 'Toolbar.'); console.log({options});
        const { container, config, debug, editorInstance, icons } = options;
        
        this.container = container;
        this.editorInstance = editorInstance;
        this.customIcons = icons ?? {};
        
        this.createToolbar(container, config, debug, this.customIcons);
        ToolbarHandlers.init(this);
        
        // Emit toolbar initialization event
        eventEmitter.emit(EVENTS.EDITOR_INITIALIZED, {
            toolbarContainer: container,
            toolbarConfig: config,
            timestamp: Date.now()
        }, { source: 'toolbar.init' });
    }

    /*
     * UNDO | REDO
     */
    undo()
    {
        log('undo()', 'Toolbar.');
        document.execCommand('undo');
        this.after();
    }
    
    redo()
    {
        log('redo()', 'Toolbar.');
        document.execCommand('redo');
        this.after();
    }
    
    /*
     * HEADERs | PARAGRAPH
     */
    h1()
    {
        log('h1()', 'Toolbar.');
        
        if (!this.editorInstance?.convertCurrentBlockOrCreate('h1')) {
            document.execCommand('formatBlock', false, '<h1>');
        }
        
        this.after();
    }
    
    h2()
    {
        log('h2()', 'Toolbar.');
        
        if (!this.editorInstance?.convertCurrentBlockOrCreate('h2')) {
            document.execCommand('formatBlock', false, '<h2>');
        }
        
        this.after();
    }
    
    h3()
    {
        log('h3()', 'Toolbar.');
        
        if (!this.editorInstance?.convertCurrentBlockOrCreate('h3')) {
            document.execCommand('formatBlock', false, '<h3>');
        }
        
        this.after();
    }
    
    h4()
    {
        log('h4()', 'Toolbar.');
        
        if (!this.editorInstance?.convertCurrentBlockOrCreate('h4')) {
            document.execCommand('formatBlock', false, '<h4>');
        }
        
        this.after();
    }
    
    h5()
    {
        log('h5()', 'Toolbar.');
        
        if (!this.editorInstance?.convertCurrentBlockOrCreate('h5')) {
            document.execCommand('formatBlock', false, '<h5>');
        }
        
        this.after();
    }
    
    h6()
    {
        log('h6()', 'Toolbar.');
        
        if (!this.editorInstance?.convertCurrentBlockOrCreate('h6')) {
            document.execCommand('formatBlock', false, '<h6>');
        }
        
        this.after();
    }
    
    paragraph()
    {
        log('paragraph()', 'Toolbar.');
        document.execCommand('formatBlock', false, '<p>');
        this.after();
    }
    
    /*
     * BOLD | ITALIC | UNDERLINE | STRIKETHROUGH
     */
    
    bold()
    {
        log('bold()', 'Toolbar.');
        document.execCommand('bold');
        this.after();
    }
    
    italic()
    {
        log('italic()', 'Toolbar.');
        document.execCommand('italic');
        this.after();
    }
    
    underline()
    {
        log('underline()', 'Toolbar.');
        document.execCommand('underline');
        this.after();
    }
    
    strikethrough()
    {
        log('strikethrough()', 'Toolbar.');
        document.execCommand('strikeThrough');
        this.after();
    }
    
    /**
     * Inserts unordered list
     */
    ul()
    {
        log('ul()', 'Toolbar.');
        
        if (!this.editorInstance?.convertCurrentBlockOrCreate('ul')) {
            document.execCommand('insertUnorderedList');
        }
        
        this.after();
    }
    
    /**
     * Inserts ordered list
     */
    ol()
    {
        log('ol()', 'Toolbar.');
        
        if (!this.editorInstance?.convertCurrentBlockOrCreate('ol')) {
            document.execCommand('insertOrderedList');
        }
        
        this.after();
    }
    
    /**
     * Inserts checkbox list
     */
    sq()
    {
        log('sq()', 'Toolbar.');
        
        if (!this.editorInstance?.convertCurrentBlockOrCreate('sq')) {
            const currentBlock = this.editorInstance?.currentBlock;
            if (!currentBlock) return;
            
            const taskBlock = BlockFactory.createBlock('sq');
            taskBlock.applyTransformation(currentBlock, this.editorInstance);
        }
        
        this.after();
    }
    
    /**
     * Inserts code block
     */
    code()
    {
        log('code()', 'Toolbar.');
        
        if (this.editorInstance) {
            const result = this.editorInstance.convertCurrentBlockOrCreate('code');
            if (result) {
                this.after();
                return;
            }
        }
        
        log('Warning: Falling back to legacy code block creation', 'Toolbar.');
        this.after();
    }
    
    /**
     * Inserts inline block code
     */
    inline()
    {
        log('inline()', 'Toolbar.');
    
        document.execCommand('formatBlock', false, '<code>');
        
        this.after();
    }
    
    /**
     * Inserts table
     */
    table()
    {
        log('table()', 'Toolbar.');
        
        if (!this.editorInstance?.convertCurrentBlockOrCreate('table')) {
            const currentBlock = this.editorInstance?.currentBlock;
            if (!currentBlock) return;
            
            const tableBlock = BlockFactory.createBlock('table');
            tableBlock.applyTransformation(currentBlock, this.editorInstance);
        }
        
        this.after();
    }
    
    /**
     * Inserts image
     */
    image()
    {
        log('image()', 'Toolbar.');
        
        if (!this.editorInstance?.convertCurrentBlockOrCreate('image')) {
            const currentBlock = this.editorInstance?.currentBlock;
            if (!currentBlock) return;
            
            const imageBlock = BlockFactory.createBlock('image');
            imageBlock.applyTransformation(currentBlock, this.editorInstance);
        }
        
        this.after();
    }

    /**
     * Inserts quote block
     */
    quote()
    {
        log('quote()', 'Toolbar.');
        
        if (!this.editorInstance?.convertCurrentBlockOrCreate('quote')) {
            const currentBlock = this.editorInstance?.currentBlock;
            if (!currentBlock) return;
            
            const quoteBlock = BlockFactory.createBlock('quote');
            quoteBlock.applyTransformation(currentBlock, this.editorInstance);
        }
        
        this.after();
    }
    
    /**
     * Inserts line break <br />
     */
    br()
    {
        log('br()', 'Toolbar.');
        
        let selection = window.getSelection();
        
        if ( selection.rangeCount ) {
            let range = selection.getRangeAt(0);
            let preElement = range.commonAncestorContainer.parentNode;
        
            let br = document.createElement('br');
        
            preElement.parentNode.insertBefore(br, preElement.nextSibling);
        } else {
            console.warn({selection});
        }
    }
    
    /**
     * Inserts tab (4 spaces)
     */
    tab()
    {
        log('tab()', 'Toolbar.');
    
        document.execCommand('insertText', false, '    ');
        
        this.after();
    }
    
    /**
     * Switch to text (normal) view
     */
    text()
    {
        log('text()', 'Toolbar.');

        const contentArea = this.editorInstance?.contentArea;
        const textMd = this.container?.querySelector('.bke-editor-markdown');
        const textHtml = this.container?.querySelector('.bke-editor-html');
        const btnText = this.container?.querySelector('.bke-toolbar-text');
        const btnMarkdown = this.container?.querySelector('.bke-toolbar-markdown');
        const btnHtml = this.container?.querySelector('.bke-toolbar-html');

        contentArea?.classList.remove('bke-hidden');
        textMd?.classList.add('bke-hidden');
        textHtml?.classList.add('bke-hidden');

        // Re-show debug tooltips now that the content area is visible again
        this.editorInstance?.debugTooltip?.show();

        if (btnText) {
            btnText.disabled = true;
        }
        if (btnMarkdown) {
            btnMarkdown.disabled = false;
        }
        if (btnHtml) {
            btnHtml.disabled = false;
        }
    }

    /**
     * Switch to markdown view
     */
    markdown()
    {
        log('markdown()', 'Toolbar.');

        const contentArea = this.editorInstance?.contentArea;
        const textMd = this.container?.querySelector('.bke-editor-markdown');
        const textHtml = this.container?.querySelector('.bke-editor-html');
        const btnText = this.container?.querySelector('.bke-toolbar-text');
        const btnMarkdown = this.container?.querySelector('.bke-toolbar-markdown');
        const btnHtml = this.container?.querySelector('.bke-toolbar-html');

        contentArea?.classList.add('bke-hidden');
        textMd?.classList.remove('bke-hidden');
        textHtml?.classList.add('bke-hidden');

        // Hide debug tooltips — blocks are no longer visible
        this.editorInstance?.debugTooltip?.hide();

        if (textMd && this.editorInstance) {
            const markdownContent = this.editorInstance.getMarkdown();
            const codeEl = textMd.querySelector('code');
            if (codeEl) {
                codeEl.innerHTML = SyntaxHighlighter.highlight(markdownContent, 'markdown');
            }
        }

        if (btnText) {
            btnText.disabled = false;
        }
        if (btnMarkdown) {
            btnMarkdown.disabled = true;
        }
        if (btnHtml) {
            btnHtml.disabled = false;
        }
    }

    /**
     * Switch to html view
     */
    html()
    {
        log('html()', 'Toolbar.');

        const contentArea = this.editorInstance?.contentArea;
        const textMd = this.container?.querySelector('.bke-editor-markdown');
        const textHtml = this.container?.querySelector('.bke-editor-html');
        const btnText = this.container?.querySelector('.bke-toolbar-text');
        const btnMarkdown = this.container?.querySelector('.bke-toolbar-markdown');
        const btnHtml = this.container?.querySelector('.bke-toolbar-html');

        contentArea?.classList.add('bke-hidden');
        textMd?.classList.add('bke-hidden');
        textHtml?.classList.remove('bke-hidden');

        // Hide debug tooltips — blocks are no longer visible
        this.editorInstance?.debugTooltip?.hide();

        if (textHtml && this.editorInstance) {
            const htmlContent = this.editorInstance.getHtml();
            const codeEl = textHtml.querySelector('code');
            if (codeEl) {
                codeEl.innerHTML = SyntaxHighlighter.highlight(htmlContent, 'html');
            }
        }

        if (btnText) {
            btnText.disabled = false;
        }
        if (btnMarkdown) {
            btnMarkdown.disabled = false;
        }
        if (btnHtml) {
            btnHtml.disabled = true;
        }
    }

    /**
     * Toggle debug mode
     */
    debug()
    {
        log('debug()', 'Toolbar.');
        
        if (this.editorInstance) {
            this.editorInstance.toggleDebugMode();
            
            const debugBtn = this.container.querySelector('.bke-toolbar-debug');
            if (debugBtn) {
                const isActive = this.editorInstance.debugMode;
                if (isActive) {
                    debugBtn.classList.add('active');
                    debugBtn.title = 'отключить режим отладки';
                } else {
                    debugBtn.classList.remove('active');
                    debugBtn.title = 'включить режим отладки';
                }
            }
        }
    }

    /**
     * Post-action hook: triggers editor update
     */
    after()
    {
        log('after()', 'Toolbar.');
        this.editorInstance?.update();
    }

    /**
     * Create toolbar DOM structure
     * @param {HTMLElement} container 
     * @param {Array|Object} config 
     * @param {boolean} debug - Whether debug mode is enabled
     */
    createToolbar(container, config, debug = false, customIcons = {})
    {
        log('createToolbar()', 'Toolbar.'); console.log({container, config, debug});

        const toolbar = document.createElement('div');
        toolbar.className = 'bke-toolbar';

        const sections = config.config || config || [];
        
        sections.forEach((section) => {
            const group = document.createElement('div');
            group.className = 'bke-toolbar-group';
            if (section.dropdown) {
                const menuId = `editor-dropdown-${section.id}`;
                const supportsPopover = typeof HTMLElement !== 'undefined' && 'popover' in HTMLElement.prototype;

                // Wrapper div (replaces Bootstrap .dropdown)
                const wrapper = document.createElement('div');
                wrapper.className = 'bke-dropdown';

                // Trigger button (replaces Bootstrap .btn.dropdown-toggle)
                const trigger = document.createElement('button');
                trigger.type = 'button';
                trigger.id = section.id;
                trigger.className = 'bke-toolbar-btn';
                trigger.setAttribute('aria-haspopup', 'true');
                trigger.setAttribute('aria-expanded', 'false');
                trigger.setAttribute('aria-controls', menuId);
                trigger.innerHTML = renderIcon(section.icon, customIcons);

                // Menu list (replaces Bootstrap .dropdown-menu)
                const ul = document.createElement('ul');
                ul.id = menuId;
                ul.className = 'bke-dropdown-menu';
                ul.setAttribute('role', 'menu');
                ul.setAttribute('aria-labelledby', section.id);

                section.group.forEach(item => {
                    const li = document.createElement('li');
                    const button = document.createElement('button');
                    button.className = item.class;
                    button.setAttribute('role', 'menuitem');
                    button.textContent = item.label || '';
                    if (item.icon) button.innerHTML = renderIcon(item.icon, customIcons) + ' ' + button.textContent;
                    if (item.title) button.title = item.title;
                    if (item.disabled) button.disabled = true;
                    li.appendChild(button);
                    ul.appendChild(li);
                });

                if (supportsPopover) {
                    // Native Popover API: renders in Top Layer, bypasses overflow/z-index
                    trigger.setAttribute('popovertarget', menuId);
                    trigger.setAttribute('popovertargetaction', 'toggle');
                    ul.setAttribute('popover', 'auto');

                    ul.addEventListener('toggle', (evt) => {
                        const isOpen = evt.newState === 'open';
                        trigger.setAttribute('aria-expanded', String(isOpen));
                        if (isOpen) {
                            Toolbar._positionDropdown(trigger, ul);
                        }
                    });
                } else {
                    // Fallback: position:fixed menu appended inside wrapper
                    trigger.addEventListener('click', (evt) => {
                        evt.stopPropagation();
                        const isOpen = trigger.getAttribute('aria-expanded') === 'true';
                        Toolbar._closeAllDropdowns();
                        if (!isOpen) {
                            ul.classList.add('bke-dropdown-menu--open');
                            trigger.setAttribute('aria-expanded', 'true');
                            Toolbar._positionDropdown(trigger, ul);
                        }
                    });

                    // Register document-level fallback handlers once
                    if (!Toolbar._fallbackListenersAttached) {
                        Toolbar._fallbackListenersAttached = true;
                        document.addEventListener('click', Toolbar._onDocumentClick);
                        document.addEventListener('keydown', Toolbar._onDocumentKeydown);
                    }
                }

                wrapper.appendChild(trigger);
                wrapper.appendChild(ul);
                group.appendChild(wrapper);
            } else {
                section.group.forEach(item => {
                    const button = document.createElement('button');
                    button.className = item.class;
                    if (item.icon) button.innerHTML = renderIcon(item.icon, customIcons);
                    if (item.title) button.title = item.title;
                    if (item.disabled) button.disabled = true;
                    group.appendChild(button);
                });
            }
            toolbar.appendChild(group);
        });
        
        // Add debug button if debug mode is enabled
        if (debug) {
            const debugGroup = document.createElement('div');
            debugGroup.className = 'bke-toolbar-group';
            
            const debugButton = document.createElement('button');
            debugButton.className = 'bke-toolbar-debug active';
            debugButton.innerHTML = renderIcon('fa-bug', customIcons);
            debugButton.title = 'отключить режим отладки';
            
            debugGroup.appendChild(debugButton);
            toolbar.appendChild(debugGroup);
        }
        
        container.insertBefore(toolbar, container.firstChild);
    }

    /**
     * Update toolbar button states based on the active block type.
     * Disables buttons that are not applicable for the given block type
     * and re-enables all others.
     * @param {string} blockType
     */
    updateButtonStates(blockType)
    {
        log('updateButtonStates()', 'Toolbar.', { blockType });

        if (!blockType) return;

        const blockClass = BlockFactory.getBlockClass(blockType);
        if (!blockClass) return;

        const disabledButtons = blockClass.getDisabledButtons();
        this.resetButtonStates();

        disabledButtons.forEach(buttonClass => {
            const button = this.container.querySelector(`.${buttonClass}`);
            if (button) {
                button.disabled = true;
                button.classList.add('disabled');
            }
        });
    }

    /**
     * Re-enable all toolbar buttons (except view-toggle buttons).
     */
    resetButtonStates()
    {
        log('resetButtonStates()', 'Toolbar.');

        this.container.querySelectorAll('button').forEach(button => {
            const isViewButton = button.classList.contains('bke-toolbar-text') ||
                button.classList.contains('bke-toolbar-markdown') ||
                button.classList.contains('bke-toolbar-html');

            if (!isViewButton) {
                button.disabled = false;
                button.classList.remove('disabled');
            }
        });
    }

    /**
     * Position a dropdown menu below its trigger using fixed coordinates.
     * Uses requestAnimationFrame for vertical collision detection (flip upward
     * if the menu would extend below the viewport).
     * @param {HTMLElement} trigger
     * @param {HTMLElement} menu
     */
    static _positionDropdown(trigger, menu) {
        const rect = trigger.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.left = `${rect.left}px`;
        menu.style.top = `${rect.bottom + 4}px`;
        menu.style.minWidth = `${Math.max(rect.width, 160)}px`;

        // Vertical collision: flip upward if menu overflows viewport bottom
        requestAnimationFrame(() => {
            const menuRect = menu.getBoundingClientRect();
            if (menuRect.bottom > window.innerHeight) {
                menu.style.top = `${rect.top - menuRect.height - 4}px`;
            }
        });
    }

    /**
     * Close all open fallback (non-Popover) dropdowns.
     */
    static _closeAllDropdowns() {
        document.querySelectorAll('.bke-dropdown-menu--open').forEach(menu => {
            menu.classList.remove('bke-dropdown-menu--open');
            const triggerId = menu.getAttribute('aria-labelledby');
            if (triggerId) {
                const t = document.getElementById(triggerId);
                if (t) t.setAttribute('aria-expanded', 'false');
            }
        });
    }

    /** Document-level click handler for the non-Popover fallback. */
    static _onDocumentClick() {
        Toolbar._closeAllDropdowns();
    }

    /** Document-level keydown handler for the non-Popover fallback. */
    static _onDocumentKeydown(evt) {
        if (evt.key === 'Escape') {
            Toolbar._closeAllDropdowns();
        }
    }
}

/** @type {boolean} Prevents duplicate document-level fallback listeners. */
Toolbar._fallbackListenersAttached = false;
