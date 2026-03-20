// noinspection JSDeprecatedSymbols

'use strict';

import { ToolbarHandlers } from "./ToolbarHandlers.js";
import { BlockFactory } from "./blocks/BlockFactory.js";
import {log} from "./utils/log.js";
import {eventEmitter, EVENTS} from "@/utils/eventEmitter.js";

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
        const { container, config, debug, editorInstance } = options;
        
        this.editorInstance = editorInstance;
        
        this.createToolbar(container, config, debug);
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

        const noteText = document.querySelector('.note-text');
        const textMd = document.querySelector('.editor-text-md');
        const textHtml = document.querySelector('.editor-text-html');
        const btnText = document.querySelector('.editor-toolbar-text');
        const btnMarkdown = document.querySelector('.editor-toolbar-markdown');
        const btnHtml = document.querySelector('.editor-toolbar-html');

        noteText?.classList.remove('visually-hidden');
        textMd?.classList.add('visually-hidden');
        textHtml?.classList.add('visually-hidden');

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

        const noteText = document.querySelector('.note-text');
        const textMd = document.querySelector('.editor-text-md');
        const textHtml = document.querySelector('.editor-text-html');

        const btnText = document.querySelector('.editor-toolbar-text');
        const btnMarkdown = document.querySelector('.editor-toolbar-markdown');
        const btnHtml = document.querySelector('.editor-toolbar-html');

        noteText?.classList.add('visually-hidden');
        textMd?.classList.remove('visually-hidden');
        textHtml?.classList.add('visually-hidden');

        if (textMd && this.editorInstance) {
            textMd.textContent = this.editorInstance.getMarkdown();
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

        const noteText = document.querySelector('.note-text');
        const textMd = document.querySelector('.editor-text-md');
        const textHtml = document.querySelector('.editor-text-html');
        const btnText = document.querySelector('.editor-toolbar-text');
        const btnMarkdown = document.querySelector('.editor-toolbar-markdown');
        const btnHtml = document.querySelector('.editor-toolbar-html');

        noteText?.classList.add('visually-hidden');
        textMd?.classList.add('visually-hidden');
        textHtml?.classList.remove('visually-hidden');

        if (textHtml && this.editorInstance) {
            textHtml.textContent = this.editorInstance.getHtml();
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
            
            const debugBtn = document.querySelector('.editor-toolbar-debug');
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
    createToolbar(container, config, debug = false)
    {
        log('createToolbar()', 'Toolbar.'); console.log({container, config, debug});

        const toolbar = document.createElement('div');
        toolbar.className = 'editor-toolbar';

        const sections = config.config || config || [];
        
        sections.forEach((section) => {
            const group = document.createElement('div');
            group.className = 'editor-toolbar-group';
            if (section.dropdown) {
                const dropdown = document.createElement('div');
                dropdown.className = 'dropdown';
                const btn = document.createElement('button');
                btn.className = 'btn btn-secondary dropdown-toggle';
                btn.type = 'button';
                btn.id = section.id;
                btn.setAttribute('data-bs-toggle', 'dropdown');
                btn.setAttribute('aria-expanded', 'false');
                btn.innerHTML = `<i class="fa ${section.icon}"></i>`;
                dropdown.appendChild(btn);
                const ul = document.createElement('ul');
                ul.className = 'dropdown-menu';
                ul.setAttribute('aria-labelledby', section.id);
                section.group.forEach(item => {
                    const li = document.createElement('li');
                    const button = document.createElement('button');
                    button.className = item.class;
                    button.textContent = item.label || '';
                    if (item.icon) button.innerHTML = `<i class="fa ${item.icon}"></i> ` + button.textContent;
                    if (item.title) button.title = item.title;
                    if (item.disabled) button.disabled = true;
                    li.appendChild(button);
                    ul.appendChild(li);
                });
                dropdown.appendChild(ul);
                group.appendChild(dropdown);
            } else {
                section.group.forEach(item => {
                    const button = document.createElement('button');
                    button.className = item.class;
                    if (item.icon) button.innerHTML = `<i class="fa ${item.icon}"></i>`;
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
            debugGroup.className = 'editor-toolbar-group';
            
            const debugButton = document.createElement('button');
            debugButton.className = 'editor-toolbar-debug active';
            debugButton.innerHTML = '<i class="fa fa-bug"></i>';
            debugButton.title = 'отключить режим отладки';
            
            debugGroup.appendChild(debugButton);
            toolbar.appendChild(debugGroup);
        }
        
        container.insertBefore(toolbar, container.firstChild);
    }
}
