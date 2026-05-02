'use strict';

import {log} from "@/utils/log.js";
import {Block} from "@/Block.js";
import {BlockFactory} from "@/blocks/BlockFactory.js";
import {BlockType} from "@/BlockType";
import showdown from "showdown";

/**
 * Improved Parser that delegates parsing responsibilities to individual block types
 * This follows the Single Responsibility Principle and Open/Closed Principle
 */
export class Parser
{
    /**
     * Parse HTML string and return array of Block objects
     * Each block type is responsible for determining if it can parse the HTML
     * @param {string} htmlString
     * @returns {array<Block>} blocks
     */
    static parseHtml(htmlString) {
        log('parseHtml()', 'Parser.'); console.log({htmlString});

        if (!htmlString || htmlString.trim() === '') return [];

        // Split HTML into individual block elements
        const blocks = [];
        const blockElements = this.extractHtmlBlocks(htmlString);
        
        for (const htmlBlock of blockElements) {
            const block = this.parseHtmlBlock(htmlBlock);
            if (block) {
                blocks.push(block);
            }
        }

        return blocks;
    }

    /**
     * Extract individual HTML blocks from a string
     * @param {string} htmlString
     * @returns {string[]} - Array of HTML block strings
     */
    static extractHtmlBlocks(htmlString) {
        const blocks = [];
        const blockTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'pre', 'blockquote', 'ul', 'ol', 'table', 'img', 'del'];
        const selfClosingTags = ['img', 'hr', 'br'];
        
        let currentPos = 0;
        while (currentPos < htmlString.length) {
            // Find the next opening tag
            const tagMatch = htmlString.slice(currentPos).match(/<(\w+)[^>]*\/?>/);
            if (!tagMatch) break;
            
            const tagName = tagMatch[1].toLowerCase();
            if (!blockTags.includes(tagName)) {
                currentPos += tagMatch.index + tagMatch[0].length;
                continue;
            }
            
            const startPos = currentPos + tagMatch.index;
            const tagStart = tagMatch[0];
            
            // Handle self-closing tags (including img)
            if (selfClosingTags.includes(tagName) || tagStart.endsWith('/>')) {
                blocks.push(tagStart);
                currentPos = startPos + tagStart.length;
                continue;
            }
            
            // Handle regular block elements
            const closingTag = `</${tagName}>`;
            let depth = 1;
            let searchPos = startPos + tagStart.length;
            let endPos = -1;
            
            while (searchPos < htmlString.length && depth > 0) {
                const nextOpen = htmlString.indexOf(`<${tagName}`, searchPos);
                const nextClose = htmlString.indexOf(closingTag, searchPos);
                
                if (nextClose === -1) break;
                
                if (nextOpen !== -1 && nextOpen < nextClose) {
                    // Found another opening tag
                    depth++;
                    searchPos = nextOpen + `<${tagName}`.length;
                } else {
                    // Found a closing tag
                    depth--;
                    if (depth === 0) {
                        endPos = nextClose + closingTag.length;
                    } else {
                        searchPos = nextClose + closingTag.length;
                    }
                }
            }
            
            if (endPos !== -1) {
                const blockHtml = htmlString.slice(startPos, endPos);
                blocks.push(blockHtml);
                currentPos = endPos;
            } else {
                currentPos = startPos + tagStart.length;
            }
        }
        
        return blocks.filter(block => block.trim().length > 0);
    }

    /**
     * Parse a single HTML block by asking each block type if it can handle it
     * @param {string} htmlString - Single HTML block
     * @returns {Block|null} - Parsed block or null
     */
    static parseHtmlBlock(htmlString) {
        const blockClasses = BlockFactory.getAllBlockClasses();
        
        // Try each block type to see which one can parse this HTML
        for (const BlockClass of blockClasses) {
            if (BlockClass.canParseHtml && BlockClass.canParseHtml(htmlString)) {
                const blockInstance = BlockClass.parseFromHtml(htmlString);
                if (blockInstance) {
                    // Return the actual block instance, not a generic Block wrapper
                    return blockInstance;
                }
            }
        }

        // Fallback: create a paragraph block for unrecognized HTML
        const content = this.extractTextContent(htmlString);
        const ParagraphBlock = BlockFactory.getBlockClass(BlockType.PARAGRAPH);
        if (ParagraphBlock) {
            return new ParagraphBlock(content, htmlString);
        }

        return null;
    }

    /**
     * Parse markdown string and return array of Block objects
     * @param {string} markdownString
     * @returns {array<Block>} blocks
     */
    static parse(markdownString) {
        log('parse()', 'Parser.'); console.log({markdownString});

        if (!markdownString || markdownString.trim() === '') {
            return [];
        }

        // Pre-process markdown for special syntax
        let processedMarkdown = this.preprocessMarkdown(markdownString);

        // Use showdown to convert to HTML first
        const converter = new showdown.Converter({ 
            ghCompatibleHeaderId: false, 
            headerIds: false,
            tasklists: false, // Disabled to prevent conflicts with custom task list processing
            tables: true,
            simplifiedAutoLink: true,
            literalMidWordUnderscores: true,
            strikethrough: true,
            emoji: true
        });
        
        const html = converter.makeHtml(processedMarkdown);
        const cleanHtml = this.cleanHtml(html);
        
        // Now parse the HTML into blocks using block-specific parsers
        return this.parseHtml(cleanHtml);
    }

    /**
     * Pre-process markdown to handle special syntax
     * @param {string} markdownString
     * @returns {string} - Processed markdown
     */
    static preprocessMarkdown(markdownString) {
        let processed = markdownString;
        
        // Pre-process fenced code blocks to ensure proper separation
        processed = processed.replace(/^```([\w]*)\n?([\s\S]*?)\n?```$/gm, (match, language, content) => {
            // Ensure code blocks are surrounded by newlines for proper separation
            return `\n\`\`\`${language}\n${content}\n\`\`\`\n`;
        });
        
        processed = processed.replace(/^~~~([\w]*)\n?([\s\S]*?)\n?~~~$/gm, (match, language, content) => {
            return `\n~~~${language}\n${content}\n~~~\n`;
        });
        
        // Pre-process task lists to ensure they're handled consistently
        // This prevents Showdown's native task list (which creates disabled checkboxes)
        // and ensures our custom interactive checkboxes are used instead
        processed = processed.replace(/^(\s*)[-*+]\s*\[([xX ]?)\]\s*(.*)$/gm, (match, indent, checked, text) => {
            const isChecked = checked.toLowerCase() === 'x';
            return `${indent}<task-item data-checked="${isChecked}">${text}</task-item>`;
        });

        return processed;
    }

    /**
     * Clean HTML output from showdown
     * @param {string} html
     * @returns {string} - Cleaned HTML
     */
    static cleanHtml(html) {
        let cleaned = html
            .replace(/~~(.*?)~~/g, '<del>$1</del>')
            .replace(/<blockquote>\s*<p>(.*?)<\/p>\s*<\/blockquote>/gs, '<blockquote>$1</blockquote>')
            .replace(/<p><code>(.*?)<\/code><\/p>/g, '<code>$1</code>')
            .replace(/<task-item data-checked="(true|false)">(.*?)<\/task-item>/g, (match, checked, text) => {
                const checkedAttr = checked === 'true' ? ' checked' : '';
                const completedClass = checked === 'true' ? ' bke-task-completed' : '';
                return `<li class="bke-task-list-item${completedClass}" data-block-type="sq"><input type="checkbox"${checkedAttr}> ${text}</li>`;
            })
            .replace(/(<\/(?:h[1-6]|div|del|p|ol|ul|blockquote|pre|code)>)\s*(<(?:h[1-6]|div|del|p|ol|ul|blockquote|pre|code))/g, '$1\n$2')
            .replace(/<h[1-6]\s+id="[^"]+"/g, match => match.replace(/\s+id="[^"]+"/, ''));

        // Group consecutive task list items into ul containers
        cleaned = this.groupTaskListItems(cleaned);
        
        return cleaned;
    }

    /**
     * Group consecutive task list items into proper ul containers
     * @param {string} html
     * @returns {string} - HTML with grouped task lists
     */
    static groupTaskListItems(html) {
        // Find consecutive task list items and wrap them in ul
        return html.replace(
            /(<li class="bke-task-list-item[^"]*"[^>]*>.*?<\/li>)(\s*<li class="bke-task-list-item[^"]*"[^>]*>.*?<\/li>)*/g,
            (match) => {
                // Extract individual li elements
                const liElements = match.match(/<li class="bke-task-list-item[^"]*"[^>]*>.*?<\/li>/g) || [];
                
                if (liElements.length === 0) return match;
                
                // Wrap in ul with task-list class
                return `<ul class="bke-task-list">\n${liElements.join('\n')}\n</ul>`;
            }
        );
    }

    /**
     * Render Block objects to HTML elements
     * Delegates to the block's own rendering method
     * @param {Block|Block[]} blocks - Single block or array of blocks
     * @returns {HTMLElement|HTMLElement[]} htmlElement(s)
     */
    static html(blocks) {
        log('html()', 'Parser.');

        // Handle array of blocks
        if (Array.isArray(blocks)) {
            return blocks.map(block => this.html(block));
        }

        // Handle single block
        const block = blocks;

        // If it's already a proper block instance with renderToElement method
        if (block && typeof block.renderToElement === 'function') {
            return block.renderToElement();
        }

        // If block has a block instance, use its render method
        if (block._blockInstance && typeof block._blockInstance.renderToElement === 'function') {
            return block._blockInstance.renderToElement();
        }

        // Try to create a block instance and render it
        const BlockClass = BlockFactory.getBlockClass(block.type);
        if (BlockClass) {
            const blockInstance = new BlockClass(block.content, block.html, block.nested);
            if (typeof blockInstance.renderToElement === 'function') {
                return blockInstance.renderToElement();
            }
        }

        // Fallback to default rendering
        return this.defaultRender(block);
    }

    /**
     * Default rendering for blocks that don't have custom rendering
     * @param {Block} block
     * @returns {HTMLElement}
     */
    static defaultRender(block) {
        let element = document.createElement('div');
        element.classList.add('bke-block');
        element.setAttribute('data-block-type', block.type);
        element.setAttribute('data-placeholder', '');
        
        // Add block type specific class
        const typeClass = `bke-block--${block.type.replace(/[^a-z0-9]/gi, '').toLowerCase()}`;
        element.classList.add(typeClass);
        
        element.innerHTML = block.html || block.content || '';
        return element;
    }

    /**
     * Extract text content from HTML
     * @param {string} html
     * @returns {string}
     */
    static extractTextContent(html) {
        // For lists, preserve line breaks between list items
        if (html.includes('<li>')) {
            const listItems = html.match(/<li>(.*?)<\/li>/g);
            if (listItems) {
                return listItems
                    .map(item => item.replace(/<li>(.*?)<\/li>/, '$1'))
                    .join('\n');
            }
        }
        
        // For pre/code blocks, extract the inner code content
        if (html.includes('<pre>') || html.includes('<code>')) {
            const preCodeMatch = html.match(/<pre><code[^>]*>(.*?)<\/code><\/pre>/s);
            if (preCodeMatch) {
                return preCodeMatch[1].trim();
            }
            const codeMatch = html.match(/<code[^>]*>(.*?)<\/code>/s);
            if (codeMatch) {
                return codeMatch[1].trim();
            }
        }
        
        return html.replace(/<[^>]+>/g, '').trim();
    }
}
