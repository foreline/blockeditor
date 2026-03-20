'use strict';

import {BaseBlock} from "@/blocks/BaseBlock";
import {BlockType} from "@/BlockType";
import {SyntaxHighlighter} from "@/utils/syntaxHighlighter";
import {Utils} from "@/Utils";

/**
 * Code block
 */
export class CodeBlock extends BaseBlock
{
    constructor(content = '', html = '', nested = false, language = '') {
        super(BlockType.CODE, content, html, nested);
        this._language = language;
        this._highlighted = false; // Track if content is already highlighted
    }

    /**
     * Get the language of this code block
     * @returns {string} - Language identifier
     */
    get language() {
        return this._language;
    }

    /**
     * Set the language of this code block
     * @param {string} language - Language identifier
     */
    set language(language) {
        this._language = language;
        this._highlighted = false; // Reset highlighting when language changes
    }

    /**
     * Apply syntax highlighting to the content
     * @returns {string} - Highlighted HTML content
     */
    highlightSyntax() {
        if (!this._content) return this._content || '';
        
        const highlighted = SyntaxHighlighter.highlight(this._content, this._language);
        this._highlighted = true;
        return highlighted;
    }

    /**
     * Get buttons that should be disabled when a code block is active.
     * Formatting actions don't apply inside <code> elements.
     * @returns {string[]} - array of button class names to disable
     */
    static getDisabledButtons() {
        return [
            'editor-toolbar-bold',
            'editor-toolbar-italic',
            'editor-toolbar-underline',
            'editor-toolbar-strikethrough',
            'editor-toolbar-inline',
        ];
    }

    /**
     * Handle key press for code blocks
     * @param {KeyboardEvent} event
     * @param {string} text - current text content of the block
     * @returns {boolean} - true if key was handled, false otherwise
     */
    handleKeyPress(event, text) {
        // Handle special formatting in code blocks
        if (event.key === 'Tab') {
            // Insert tab character instead of changing focus
            event.preventDefault();
            document.execCommand('insertText', false, '\t');
            return true;
        }
        return false;
    }

    /**
     * Handle Enter key press for code blocks.
     * Always return true to prevent the default "add new block" behavior.
     * The browser's native contenteditable behavior inserts a newline, which
     * is exactly what we want inside a code block.
     * To create a new block below, use Ctrl+Enter (handled in KeyHandler).
     * @param {KeyboardEvent} event
     * @returns {boolean} - true (always handled)
     */
    handleEnterKey(event) {
        // Don't call preventDefault — let the browser insert a newline.
        // Return true so KeyHandler knows we handled it and won't create a new block.
        return true;
    }

    /**
     * Handle Backspace key press for code blocks.
     * When the <code> element is empty and cursor is at position 0,
     * convert the block back to a paragraph.
     * @param {KeyboardEvent} event
     * @returns {boolean} - true if key was handled, false otherwise
     */
    handleBackspaceKey(event) {
        const blockElement = event?.target?.closest?.('.block') || this._element;
        if (!blockElement) return false;

        const code = blockElement.querySelector('code');
        if (!code) return false;

        const codeText = (code.textContent || '').trim();
        if (codeText !== '') return false;

        // Convert empty code block back to paragraph
        event.preventDefault();

        const existingContent = '';
        blockElement.setAttribute('data-block-type', 'p');
        blockElement.className = 'block block-p';
        blockElement.setAttribute('contenteditable', 'true');
        blockElement.setAttribute('data-placeholder', '');
        blockElement.innerHTML = existingContent;

        requestAnimationFrame(() => {
            blockElement.focus();
        });

        return true;
    }

    /**
     * Get markdown triggers for code blocks
     * @returns {Array<string>} - Array of markdown triggers
     */
    static getMarkdownTriggers() {
        return ['```', '~~~'];
    }

    /**
     * Apply code block transformation via toolbar
     * @param {HTMLElement} targetElement - The block DOM element to transform
     * @param {Object} editorInstance - The editor instance owning this block
     * @returns {void}
     */
    applyTransformation(targetElement, editorInstance) {
        if (!targetElement) return;
        
        // Store element reference so instance methods (refreshHighlighting, syncFromElement) work
        this._element = targetElement;
        
        // Update block attributes
        targetElement.setAttribute('data-block-type', 'code');
        targetElement.className = 'block block-code';
        targetElement.setAttribute('contenteditable', 'false');
        
        // Get existing content — strip markdown triggers that may still be present
        // when called directly (e.g. from KeyHandler keybuffer path)
        let existingContent = targetElement.textContent || '';
        const triggers = CodeBlock.getMarkdownTriggers();
        for (const trigger of triggers) {
            if (existingContent.startsWith(trigger)) {
                existingContent = existingContent.substring(trigger.length);
                break;
            }
        }
        existingContent = existingContent.trim();
        
        // Create code structure (pre > code)
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.textContent = existingContent;
        code.setAttribute('contenteditable', 'true');
        
        // Replace content with code structure
        targetElement.innerHTML = '';
        pre.appendChild(code);
        targetElement.appendChild(pre);
        
        // Create and append language selector
        const languageSelector = this.createLanguageSelector();
        targetElement.appendChild(languageSelector);
        
        // Focus the code element
        requestAnimationFrame(() => {
            code.focus();
            // Place cursor at end
            const range = document.createRange();
            const selection = window.getSelection();
            range.selectNodeContents(code);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        });
    }

    /**
     * Sync internal state from the associated DOM element
     */
    syncFromElement() {
        if (!this._element) return;
        const code = this._element.querySelector('code');
        if (code) {
            this._content = code.textContent || '';
            const langMatch = code.className?.match(/language-(\w+)/);
            if (langMatch) {
                this._language = langMatch[1];
            }
        } else {
            this._content = this._element.textContent || '';
        }
    }

    /**
     * Convert this code block to markdown
     * @returns {string} - markdown representation
     */
    toMarkdown() {
        this.syncFromElement();
        const langSuffix = this._language ? this._language : '';
        return `\`\`\`${langSuffix}\n${this._content}\n\`\`\``;
    }

    /**
     * Convert this code block to HTML
     * @returns {string} - HTML representation
     */
    toHtml() {
        this.syncFromElement();
        // Handle empty content case
        if (!this._content) {
            return `<pre><code></code></pre>`;
        }
        
        // For testing and backward compatibility, use content directly if highlighting fails
        let highlighted;
        try {
            highlighted = this.highlightSyntax();
            // If highlighting returns empty but content exists, use escaped content directly
            if (!highlighted && this._content) {
                highlighted = Utils.escapeHTML(this._content);
            }
        } catch (error) {
            // Fallback to escaped plain content if highlighting fails
            highlighted = Utils.escapeHTML(this._content);
        }
        
        if (!this._language) {
            return `<pre><code>${highlighted}</code></pre>`;
        }
        
        const normalizedLang = SyntaxHighlighter.normalizeLanguage(this._language);
        const classes = [normalizedLang, `language-${this._language}`].filter(Boolean).join(' ');
        
        return `<pre><code class="${classes}">${highlighted}</code></pre>`;
    }

    /**
     * Render this code block as an HTML element
     * @returns {HTMLElement} - DOM element representation
     */
    renderToElement() {
        let element = document.createElement('div');
        element.classList.add('block');
        element.classList.add('block-code');
        element.setAttribute('data-block-type', this._type);
        element.setAttribute('data-placeholder', '');
        
        // Create code container
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        
        // Apply syntax highlighting
        const highlighted = this.highlightSyntax();
        code.innerHTML = highlighted;
        
        // Add language classes
        if (this._language) {
            const normalizedLang = SyntaxHighlighter.normalizeLanguage(this._language);
            code.classList.add(normalizedLang);
            code.classList.add(`language-${this._language}`);
        }
        
        pre.appendChild(code);
        
        // Create language selector
        const languageSelector = this.createLanguageSelector();
        
        element.appendChild(pre);
        element.appendChild(languageSelector);
        
        return element;
    }

    /**
     * Create language selector dropdown
     * @returns {HTMLElement} - Language selector element
     */
    createLanguageSelector() {
        const container = document.createElement('div');
        container.classList.add('language-selector');
        
        const select = document.createElement('select');
        select.setAttribute('title', 'Select programming language');
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Plain text';
        select.appendChild(defaultOption);
        
        // Add supported languages
        const languages = SyntaxHighlighter.getSupportedLanguages();
        languages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.key;
            option.textContent = lang.name;
            if (lang.key === this._language) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        
        // Handle language change
        select.addEventListener('change', (e) => {
            this.language = e.target.value;
            this.refreshHighlighting();
        });
        
        container.appendChild(select);
        return container;
    }

    /**
     * Refresh syntax highlighting after language change.
     * Uses this._element to scope to the correct block instance.
     */
    refreshHighlighting() {
        const element = this._element;
        if (!element) return;

        const code = element.querySelector('code');
        if (code) {
            // Sync content from DOM before re-highlighting
            this._content = code.textContent || '';

            // Remove old language classes
            code.className = '';

            // Apply new highlighting
            const highlighted = this.highlightSyntax();
            code.innerHTML = highlighted;

            // Add new language classes
            if (this._language) {
                const normalizedLang = SyntaxHighlighter.normalizeLanguage(this._language);
                code.classList.add(normalizedLang);
                code.classList.add(`language-${this._language}`);
            }
        }
    }

    /**
     * Check if this block type can parse the given HTML
     * @param {string} htmlString - HTML to check
     * @returns {boolean} - true if can parse, false otherwise
     */
    static canParseHtml(htmlString) {
        if (!htmlString || typeof htmlString !== 'string') {
            return false;
        }
        
        // Only match block-level code elements starting with <pre>
        // This excludes inline <code> elements which should not be treated as code blocks
        return /^<pre[^>]*>/i.test(htmlString);
    }

    /**
     * Parse HTML string to create a code block instance
     * @param {string} htmlString - HTML to parse
     * @returns {CodeBlock|null} - Block instance or null if can't parse
     */
    static parseFromHtml(htmlString) {
        if (!htmlString || typeof htmlString !== 'string') {
            return null;
        }
        
        // Handle <pre><code>content</code></pre> pattern
        let match = htmlString.match(/^<pre[^>]*><code([^>]*)>(.*?)<\/code><\/pre>/is);
        if (match) {
            const codeAttributes = match[1];
            const content = match[2].trim();
            
            // Extract language from class attribute
            let language = '';
            const classMatch = codeAttributes.match(/class="([^"]*?)"/);
            if (classMatch) {
                // Look for language-* pattern or direct language name
                const classes = classMatch[1].split(' ');
                for (const cls of classes) {
                    if (cls.startsWith('language-')) {
                        language = cls.replace('language-', '');
                        break;
                    } else if (cls && !cls.includes('-') && cls !== 'hljs' && cls !== 'language') {
                        // Likely a direct language class name
                        language = cls;
                    }
                }
            }
            
            return new CodeBlock(content, htmlString, false, language);
        }

        // Handle standalone <code>content</code> pattern
        match = htmlString.match(/^<code([^>]*)>(.*?)<\/code>/is);
        if (match) {
            const codeAttributes = match[1];
            const content = match[2].trim();
            
            // Extract language from class attribute
            let language = '';
            const classMatch = codeAttributes.match(/class="([^"]*?)"/);
            if (classMatch) {
                const classes = classMatch[1].split(' ');
                for (const cls of classes) {
                    if (cls.startsWith('language-')) {
                        language = cls.replace('language-', '');
                        break;
                    } else if (cls && !cls.includes('-') && cls !== 'hljs' && cls !== 'language') {
                        language = cls;
                    }
                }
            }
            
            return new CodeBlock(content, htmlString, false, language);
        }

        // Handle <pre>content</pre> pattern
        match = htmlString.match(/^<pre([^>]*)>(.*?)<\/pre>/is);
        if (match) {
            const preAttributes = match[1];
            const content = match[2].trim();
            
            // Extract language from class attribute if present
            let language = '';
            const classMatch = preAttributes.match(/class="([^"]*?)"/);
            if (classMatch) {
                const classes = classMatch[1].split(' ');
                for (const cls of classes) {
                    if (cls.startsWith('language-')) {
                        language = cls.replace('language-', '');
                        break;
                    } else if (cls && !cls.includes('-') && cls !== 'hljs' && cls !== 'language') {
                        language = cls;
                    }
                }
            }
            
            return new CodeBlock(content, htmlString, false, language);
        }

        return null;
    }

    /**
     * Check if this block type can parse the given markdown
     * @param {string} markdownString - Markdown to check
     * @returns {boolean} - true if can parse, false otherwise
     */
    static canParseMarkdown(markdownString) {
        if (!markdownString || typeof markdownString !== 'string') {
            return false;
        }
        return /^```/.test(markdownString.trim()) || /^~~~/.test(markdownString.trim());
    }

    /**
     * Parse markdown string to create a code block instance
     * @param {string} markdownString - Markdown to parse
     * @returns {CodeBlock|null} - Block instance or null if can't parse
     */
    static parseFromMarkdown(markdownString) {
        if (!markdownString || typeof markdownString !== 'string') {
            return null;
        }
        
        const match = markdownString.trim().match(/^```([\w]*)\n?([\s\S]*?)\n?```$|^~~~([\w]*)\n?([\s\S]*?)\n?~~~$/);
        if (!match) return null;

        // Extract language and content
        const language = match[1] || match[3] || '';
        const content = match[2] || match[4] || '';
        
        // Generate highlighted HTML
        const highlighted = SyntaxHighlighter.highlight(content, language);
        const normalizedLang = SyntaxHighlighter.normalizeLanguage(language);
        const classes = [normalizedLang, `language-${language}`].filter(Boolean).join(' ');
        const html = `<pre><code class="${classes}">${highlighted}</code></pre>`;
        
        return new CodeBlock(content, html, false, language);
    }
}
