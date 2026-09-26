'use strict';

import {BaseBlock} from "@/blocks/BaseBlock";
import {BlockType} from "@/BlockType";
import {Editor} from "@/Editor";
import {Utils} from "@/Utils";

/**
 * Image block for handling images with drag & drop and resizing
 */
export class ImageBlock extends BaseBlock
{
    constructor(content = '', html = '', nested = false) {
        super(BlockType.IMAGE, content, html, nested);
        this._src = '';
        this._alt = '';
        this._width = null;
        this._height = null;
        this._resizableImages = new WeakSet();
        
        // Parse content if provided (should be image URL or markdown image syntax)
        if (content) {
            this.parseImageContent(content);
        }
    }

    /**
     * Parse image content from markdown format or URL
     * @param {string} content - Image content (URL or markdown syntax)
     */
    parseImageContent(content) {
        // Check if it's markdown image syntax: ![alt](src)
        const markdownMatch = content.match(/!\[([^\]]*)\]\(([^)]+)\)/);
        if (markdownMatch) {
            this._alt = markdownMatch[1];
            this._src = markdownMatch[2];
        } else if (content.startsWith('http') || content.startsWith('data:') || content.startsWith('./') || content.startsWith('../')) {
            // Treat as direct URL
            this._src = content;
            this._alt = 'Image';
        }
    }

    /**
     * Handle key press for image blocks
     * @param {KeyboardEvent} event
     * @param {string} text - current text content of the block
     * @returns {boolean} - true if key was handled, false otherwise
     */
    handleKeyPress(event, text) {
        // Images don't handle text input, but can handle navigation keys
        if (event.key === 'Delete' || event.key === 'Backspace') {
            // Allow deletion of image block
            return false; // Let default handler manage block deletion
        }
        
        return false;
    }

    /**
     * Handle Enter key press for image blocks
     * @param {KeyboardEvent} event
     * @returns {boolean} - true if key was handled, false otherwise
     */
    handleEnterKey(event) {
        // Create new paragraph block after image
        event.preventDefault();
        const editorInstance = Editor.getInstanceFromElement(document.activeElement);
        if (editorInstance) {
            editorInstance.addDefaultBlock();
        }
        return true;
    }

    /**
     * Set up drag and drop functionality for image upload
     * @param {HTMLElement} element - The image block element
     */
    setupDragAndDrop(element) {
        // Prevent default drag behaviors
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            element.classList.add('bke-drag-over');
        });

        element.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            element.classList.remove('bke-drag-over');
        });

        element.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            element.classList.remove('bke-drag-over');

            const files = Array.from(e.dataTransfer.files);
            const imageFile = files.find(file => file.type.startsWith('image/'));

            if (imageFile) {
                this.handleImageFile(imageFile, element);
            }
        });

        // Handle file input selection
        element.addEventListener('imageSelected', (e) => {
            const file = e.detail;
            if (file && file.type.startsWith('image/')) {
                this.handleImageFile(file, element);
            }
        });

        // Handle click on placeholder to trigger file selection
        element.addEventListener('click', (e) => {
            const fileInput = element.querySelector('input[type="file"]');
            if (fileInput && e.target.closest('.bke-image-placeholder')) {
                fileInput.click();
            }
        });
    }

    /**
     * Handle uploaded image file
     * @param {File} file - The image file
     * @param {HTMLElement} element - The image block element
     */
    handleImageFile(file, element) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            this._src = e.target.result; // Base64 data URL
            this._alt = file.name;
            
            // Update the image element
            if (!element.querySelector('img')) element.innerHTML = this.generateImageHTML();
            const img = element.querySelector('img');
            if (img) {
                img.src = this._src;
                img.alt = this._alt;
                this.setupImageResizing(img);
            }
            
            Editor.getInstanceFromElement(element)?.update();
        };
        
        reader.readAsDataURL(file);
    }

    /**
     * Set up image resizing functionality
     * @param {HTMLImageElement} img - The image element
     */
    setupImageResizing(img) {
        if (!img || img.tagName !== 'IMG' || this._resizableImages.has(img)) return;
        this._resizableImages.add(img);
        img.draggable = false;
        const handle = img.parentElement.querySelector('.bke-resize-handle');
        if (!handle) return;
        let start = null;
        handle.addEventListener('pointerdown', event => {
            if (event.button !== 0) return;
            const rect = img.getBoundingClientRect();
            if (!rect.width) return;
            event.preventDefault();
            start = { x: event.clientX, width: rect.width, ratio: rect.height / rect.width };
            handle.setPointerCapture(event.pointerId);
        });
        handle.addEventListener('pointermove', event => {
            if (!start) return;
            const maximum = img.closest('.bke-block').clientWidth;
            const width = Math.min(maximum, Math.max(Math.min(50, maximum), start.width + event.clientX - start.x));
            img.style.width = `${width}px`;
            img.style.height = 'auto';
            this._width = width;
            this._height = width * start.ratio;
        });
        const finish = () => {
            if (!start) return;
            start = null;
            Editor.getInstanceFromElement(img)?.update();
        };
        handle.addEventListener('pointerup', finish);
        handle.addEventListener('pointercancel', finish);
        handle.addEventListener('lostpointercapture', finish);
    }

    /**
     * Get markdown triggers for image creation
     * @returns {Array<string>} - Array of trigger strings
     */
    static getMarkdownTriggers() {
        return ['!['];
    }

    /**
     * Apply image transformation
     */
    applyTransformation(targetElement, editorInstance) {
        if (!targetElement) return;
        
        // Prompt for image URL or show file picker
        const url = prompt('Enter image URL or drag & drop an image file:');
        if (url) {
            this._src = url;
            this._alt = 'Image';
        }
        
        targetElement.setAttribute('data-block-type', 'image');
        targetElement.setAttribute('contenteditable', 'false');
        targetElement.innerHTML = this.generateImageHTML();
        
        // Set up drag and drop
        this.setupDragAndDrop(targetElement);
        
        // Set up resizing for the image
        const img = targetElement.querySelector('img');
        if (img) {
            this.setupImageResizing(img);
        }
        
        if (editorInstance) {
            editorInstance.setCurrentBlock(targetElement);
            editorInstance.update();
        }
    }

    /**
     * Generate HTML for image display
     * @returns {string} - HTML string for image
     */
    generateImageHTML() {
        if (!this._src) {
            return `
                <div class="bke-image-placeholder" style="border: 2px dashed #ccc; padding: 40px; text-align: center; background: #f9f9f9;">
                    <div>📷</div>
                    <div>Drag & drop an image here or click to select</div>
                    <input type="file" accept="image/*" style="margin-top: 10px;" onchange="this.closest('.bke-block').dispatchEvent(new CustomEvent('imageSelected', {detail: this.files[0]}))">
                </div>
            `;
        }
        
        const widthStyle = this._width ? `width: ${this._width}px;` : 'max-width: 100%;';
        const heightStyle = 'height: auto;';
        
        return `
            <div class="bke-image-container">
                <img src="${Utils.escapeHTML(this._src)}" alt="${Utils.escapeHTML(this._alt)}" style="${widthStyle} ${heightStyle}">
                <span class="bke-resize-handle" title="Resize image" aria-hidden="true"></span>
            </div>
        `;
    }

    /**
     * Get toolbar configuration for images
     * @returns {Object} - toolbar button configuration
     */
    static getToolbarConfig() {
        return {
            class: 'bke-toolbar-image',
            icon: 'fa-image',
            title: 'Image',
            group: 'media'
        };
    }

    /**
     * Sync internal state from the associated DOM element
     */
    syncFromElement() {
        if (!this._element) return;
        const img = this._element.querySelector('img');
        if (img) {
            this._src = img.getAttribute('src') || '';
            this._alt = img.getAttribute('alt') || '';
        }
    }

    /**
     * Convert this image block to markdown
     * @returns {string} - markdown representation
     */
    toMarkdown() {
        this.syncFromElement();
        if (!this._src) return '';
        return `![${this._alt}](${this._src})`;
    }

    /**
     * Convert this image block to HTML
     * @returns {string} - HTML representation
     */
    toHtml() {
        this.syncFromElement();
        if (!this._src) return '';
        
        const widthAttr = this._width ? ` width="${this._width}"` : '';
        const heightAttr = this._height ? ` height="${this._height}"` : '';
        
        return `<img src="${this._src}" alt="${this._alt}"${widthAttr}${heightAttr}>`;
    }

    /**
     * Get disabled toolbar buttons for image blocks
     * @returns {Array<string>} - Array of disabled button classes
     */
    static getDisabledButtons() {
        return ['bke-toolbar-bold', 'bke-toolbar-italic', 'bke-toolbar-inline', 'bke-toolbar-ul', 'bke-toolbar-ol', 'bke-toolbar-sq'];
    }

    /**
     * Set image source
     * @param {string} src - Image source URL
     */
    setSrc(src) {
        this._src = src;
    }

    /**
     * Set image alt text
     * @param {string} alt - Alt text
     */
    setAlt(alt) {
        this._alt = alt;
    }

    /**
     * Set image dimensions
     * @param {number} width - Image width
     * @param {number} height - Image height
     */
    setDimensions(width, height) {
        this._width = width;
        this._height = height;
    }

    /**
     * Get image source
     * @returns {string}
     */
    getSrc() {
        return this._src;
    }

    /**
     * Get image alt text
     * @returns {string}
     */
    getAlt() {
        return this._alt;
    }

    /**
     * Get image dimensions
     * @returns {Object} - {width, height}
     */
    getDimensions() {
        return {
            width: this._width,
            height: this._height
        };
    }

    /**
     * Render this image block as an HTML element
     * @returns {HTMLElement} - DOM element representation
     */
    renderToElement() {
        let element = document.createElement('div');
        element.classList.add('bke-block');
        element.classList.add('bke-block--image');
        element.setAttribute('data-block-type', 'image');
        element.setAttribute('data-placeholder', 'Drag an image or paste URL');
        element.contentEditable = false;
        element.innerHTML = this.generateImageHTML();
        this.setupDragAndDrop(element);
        this.setupImageResizing(element.querySelector('img'));
        
        return element;
    }

    /**
     * Check if this block type can parse the given HTML
     * @param {string} htmlString - HTML to check
     * @returns {boolean} - true if can parse, false otherwise
     */
    static canParseHtml(htmlString) {
        return /^<img[^>]*>/i.test(htmlString) || 
               /^<figure[^>]*>.*<img[^>]*>.*<\/figure>/i.test(htmlString) ||
               /^<p[^>]*>\s*<img[^>]*>\s*<\/p>$/i.test(htmlString.trim());
    }

    /**
     * Parse HTML string to create an image block instance
     * @param {string} htmlString - HTML to parse
     * @returns {ImageBlock|null} - Block instance or null if can't parse
     */
    static parseFromHtml(htmlString) {
        if (!this.canParseHtml(htmlString)) return null;

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        const img = doc.querySelector('img');
        
        if (!img) return null;
        
        const imageBlock = new ImageBlock();
        imageBlock._src = img.getAttribute('src') || '';
        imageBlock._alt = img.getAttribute('alt') || '';
        
        // Extract dimensions if present
        const width = img.getAttribute('width') || img.style.width;
        const height = img.getAttribute('height') || img.style.height;
        
        if (width) imageBlock._width = parseInt(width);
        if (height) imageBlock._height = parseInt(height);
        
        return imageBlock;
    }

    /**
     * Get image source URL
     * @returns {string} - Image source URL
     */
    get src() {
        return this._src;
    }

    /**
     * Set image source URL
     * @param {string} value - Image source URL
     */
    set src(value) {
        this._src = value;
    }

    /**
     * Get image alt text
     * @returns {string} - Image alt text
     */
    get alt() {
        return this._alt;
    }

    /**
     * Set image alt text
     * @param {string} value - Image alt text
     */
    set alt(value) {
        this._alt = value;
    }

    /**
     * Get image width
     * @returns {number|null} - Image width in pixels
     */
    get width() {
        return this._width;
    }

    /**
     * Set image width
     * @param {number} value - Image width in pixels
     */
    set width(value) {
        this._width = value;
    }

    /**
     * Get image height
     * @returns {number|null} - Image height in pixels
     */
    get height() {
        return this._height;
    }

    /**
     * Set image height
     * @param {number} value - Image height in pixels
     */
    set height(value) {
        this._height = value;
    }

    /**
     * Check if this block type can parse the given markdown
     * @param {string} markdownString - Markdown to check
     * @returns {boolean} - true if can parse, false otherwise
     */
    static canParseMarkdown(markdownString) {
        return /^!\[.*?\]\(.*?\)/.test(markdownString.trim());
    }

    /**
     * Parse markdown string to create an image block instance
     * @param {string} markdownString - Markdown to parse
     * @returns {ImageBlock|null} - Block instance or null if can't parse
     */
    static parseFromMarkdown(markdownString) {
        if (!this.canParseMarkdown(markdownString)) return null;
        
        const match = markdownString.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)/);
        if (!match) return null;
        
        const imageBlock = new ImageBlock();
        imageBlock._alt = match[1];
        imageBlock._src = match[2];
        
        return imageBlock;
    }
}
