'use strict';

import {BaseBlock} from "@/blocks/BaseBlock";
import {BlockType} from "@/BlockType";
import {Editor} from "@/Editor";

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
        // Make image resizable by adding resize handles
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.cursor = 'nw-resize';
        
        let isResizing = false;
        let startX, startY, startWidth, startHeight;

        img.addEventListener('mousedown', (e) => {
            // Only resize if clicking near the bottom-right corner
            const rect = img.getBoundingClientRect();
            const threshold = 20; // 20px threshold from corner
            
            if (e.clientX > rect.right - threshold && e.clientY > rect.bottom - threshold) {
                isResizing = true;
                startX = e.clientX;
                startY = e.clientY;
                startWidth = parseInt(getComputedStyle(img).width, 10);
                startHeight = parseInt(getComputedStyle(img).height, 10);
                
                e.preventDefault();
                
                document.addEventListener('mousemove', doResize);
                document.addEventListener('mouseup', stopResize);
            }
        });

        const doResize = (e) => {
            if (!isResizing) return;
            
            const newWidth = startWidth + e.clientX - startX;
            const aspectRatio = startHeight / startWidth;
            const newHeight = newWidth * aspectRatio;
            
            if (newWidth > 50) { // Minimum width
                img.style.width = newWidth + 'px';
                img.style.height = newHeight + 'px';
                
                this._width = newWidth;
                this._height = newHeight;
            }
        };

        const stopResize = () => {
            isResizing = false;
            document.removeEventListener('mousemove', doResize);
            document.removeEventListener('mouseup', stopResize);
            Editor.getInstanceFromElement(img)?.update();
        };
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
        targetElement.innerHTML = this.generateImageHTML();
        
        // Set up drag and drop
        this.setupDragAndDrop(targetElement);
        
        // Set up resizing for the image
        const img = targetElement.querySelector('img');
        if (img) {
            img.onload = () => this.setupImageResizing(img);
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
                <div class="image-placeholder" style="border: 2px dashed #ccc; padding: 40px; text-align: center; background: #f9f9f9;">
                    <div>📷</div>
                    <div>Drag & drop an image here or click to select</div>
                    <input type="file" accept="image/*" style="margin-top: 10px;" onchange="this.closest('.bke-block').dispatchEvent(new CustomEvent('imageSelected', {detail: this.files[0]}))">
                </div>
            `;
        }
        
        const widthStyle = this._width ? `width: ${this._width}px;` : 'max-width: 100%;';
        const heightStyle = this._height ? `height: ${this._height}px;` : 'height: auto;';
        
        return `
            <div class="image-container" style="position: relative; display: inline-block;">
                <img src="${this._src}" alt="${this._alt}" style="${widthStyle} ${heightStyle} display: block; cursor: nw-resize;">
                <div class="resize-handle" style="position: absolute; bottom: 0; right: 0; width: 20px; height: 20px; background: #007cba; cursor: nw-resize; opacity: 0.7;"></div>
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
        return ['bke-toolbar-bold', 'bke-toolbar-italic', 'bke-toolbar-ul', 'bke-toolbar-ol', 'bke-toolbar-sq'];
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
        element.contentEditable = true;
        
        if (this._src) {
            const img = document.createElement('img');
            img.src = this._src;
            img.alt = this._alt || 'Image';
            
            if (this._width) img.style.width = this._width + 'px';
            if (this._height) img.style.height = this._height + 'px';
            
            element.appendChild(img);
            element.contentEditable = false;
        } else {
            element.textContent = this._content || '';
        }
        
        // Set up drag and drop and resizing
        setTimeout(() => {
            this.setupDragAndDrop(element);
            if (this._src) {
                this.setupImageResizing(element);
            }
        }, 0);
        
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
