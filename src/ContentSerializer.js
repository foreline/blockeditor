'use strict';

import {getCodeText} from './utils/codeText.js';

import showdown from "showdown";
import {log, logWarning} from "./utils/log.js";
import {Utils} from "./Utils.js";

/**
 * Converts HTML to Markdown.
 * @param {string} html
 * @returns {string} markdown
 */
export function html2md(html)
{
    log('html2md()', 'ContentSerializer'); //console.log({html});

    try {
        if ( !html || typeof html !== 'string' ) {
            logWarning('Invalid HTML input for conversion', 'ContentSerializer.html2md()');
            return '';
        }

        let converter = new showdown.Converter({ ghCompatibleHeaderId: false, headerIds: false });

        return converter.makeMd(html);
    } catch (error) {
        logWarning('Error converting HTML to markdown: ' + error.message, 'ContentSerializer.html2md()');
        return html;
    }
}

/**
 * Converts Markdown to HTML.
 * @param {string} md
 * @returns {string} html
 */
export function md2html(md)
{
    log('md2html()', 'ContentSerializer');

    try {
        if ( !md || typeof md !== 'string' ) {
            logWarning('Invalid markdown input for conversion', 'ContentSerializer.md2html()');
            return '';
        }

        const converter = new showdown.Converter({ ghCompatibleHeaderId: false, headerIds: false });

        let html = converter.makeHtml(md);

        html = html.replace(/(<\/code><\/pre>$(?![\r\n]))/gm, '$1<br>');

        return html;
    } catch (error) {
        logWarning('Error converting markdown to HTML: ' + error.message, 'ContentSerializer.md2html()');
        return Utils.escapeHTML(md);
    }
}

/**
 * Serializes editor content (DOM blocks) to Markdown and HTML.
 */
export class ContentSerializer
{
    /**
     * Get all editor content as markdown.
     * @param {HTMLElement} contentArea - The editor's root element
     * @returns {string}
     */
    getMarkdown(contentArea)
    {
        log('getMarkdown()', 'ContentSerializer');

        try {
            const blockElements = contentArea.querySelectorAll('.bke-block');
            if (blockElements.length === 0) return '';

            const markdownParts = [];
            for (const blockEl of blockElements) {
                const blockType = blockEl.getAttribute('data-block-type');
                const md = this._blockElementToMarkdown(blockEl, blockType);
                if (md !== null) markdownParts.push(md);
            }

            return markdownParts.join('\n\n').trim();
        } catch (error) {
            logWarning('Error getting markdown content: ' + error.message, 'ContentSerializer.getMarkdown()');
            return '';
        }
    }

    /**
     * Get all editor content as HTML.
     * @param {HTMLElement} contentArea - The editor's root element
     * @returns {string}
     */
    getHtml(contentArea)
    {
        log('getHtml()', 'ContentSerializer');

        try {
            const blockElements = contentArea.querySelectorAll('.bke-block');
            if (blockElements.length === 0) return '';

            const htmlParts = [];
            for (const blockEl of blockElements) {
                const blockType = blockEl.getAttribute('data-block-type');
                const html = this._blockElementToHtml(blockEl, blockType);
                if (html) htmlParts.push(html);
            }

            return htmlParts.join('\n').trim();
        } catch (error) {
            logWarning('Error getting HTML content: ' + error.message, 'ContentSerializer.getHtml()');
            return '';
        }
    }

    /**
     * Extract markdown from a single block DOM element.
     * @param {HTMLElement} blockEl
     * @param {string} blockType
     * @returns {string|null}
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
                    return html2md(`<p>${innerHTML}</p>`).trim();
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
                    const textNode = li.querySelector('.task-text, span') || li;
                    let text = textNode.textContent || '';
                    text = text.replace(/^\s+/, '');
                    return `- [${checked}] ${text}`;
                }).join('\n');
            }
            case 'code': {
                const code = blockEl.querySelector('code');
                const text = getCodeText(code || blockEl);
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
     * Extract semantic HTML from a single block DOM element.
     * @param {HTMLElement} blockEl
     * @param {string} blockType
     * @returns {string}
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
}
