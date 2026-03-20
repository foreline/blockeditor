'use strict';

import {BaseBlock} from "@/blocks/BaseBlock";
import {BlockType} from "@/BlockType";
import {Toolbar} from "@/Toolbar";
import {Editor} from "@/Editor";
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
     * Handle Enter key press for code blocks
     * @param {KeyboardEvent} event
     * @returns {boolean} - true if key was handled, false otherwise
     */
    handleEnterKey(event) {
        // In code blocks, preserve indentation on new lines
        return false;
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
     * @returns {void}
     */
    applyTransformation() {
        // Perform direct DOM transformation (similar to HeadingBlock)
        // to avoid circular dependency with Toolbar.code()
        const editorInstance = Editor.getInstanceFromElement(document.activeElement);
        const currentBlock = editorInstance?.currentBlock;
        if (!currentBlock) return;
        
        // Update block attributes
        currentBlock.setAttribute('data-block-type', 'code');
        currentBlock.className = 'block block-code';
        currentBlock.setAttribute('contenteditable', 'false');
        
        // Get existing content (markdown trigger already stripped by Editor.convertBlockType)
        const existingContent = currentBlock.textContent || '';
        
        // Create code structure (pre > code)
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.textContent = existingContent;
        code.setAttribute('contenteditable', 'true');
        
        // Replace content with code structure
        currentBlock.innerHTML = '';
        pre.appendChild(code);
        currentBlock.appendChild(pre);
        
        // Create and append language selector
        const languageSelector = this.createLanguageSelector();
        currentBlock.appendChild(languageSelector);
        
        // Focus the code element if the block was focused
        if (document.activeElement === currentBlock || 
            currentBlock.contains(document.activeElement)) {
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
    }

    /**
     * Convert this code block to markdown
     * @returns {string} - markdown representation
     */
    toMarkdown() {
        const langSuffix = this._language ? this._language : '';
        return `\`\`\`${langSuffix}\n${this._content}\n\`\`\``;
    }

    /**
     * Convert this code block to HTML
     * @returns {string} - HTML representation
     */
    toHtml() {
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
        element.setAttribute('data-placeholder', 'Type "/" to insert block');
        
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
     * Refresh syntax highlighting after language change
     */
    refreshHighlighting() {
        const element = document.querySelector(`[data-block-type="code"]`);
        if (element) {
            const code = element.querySelector('code');
            if (code) {
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
