'use strict';

/** Converts completed plain-text URLs without touching existing links or code. */
export class AutoLinker {
    constructor(editor) {
        this.editor = editor;
    }

    linkifyAll(includeTerminal = false) {
        if (!this.editor.contentArea?.querySelectorAll) return false;
        let changed = false;
        this.editor.contentArea.querySelectorAll('.bke-block').forEach(block => {
            changed = this.linkifyBlock(block, includeTerminal) || changed;
        });
        return changed;
    }

    linkifyBlock(block, includeTerminal = false) {
        if (!block || block.getAttribute('data-block-type') === 'code') return false;
        const nodes = [];
        const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) nodes.push(walker.currentNode);
        let changed = false;
        for (const node of nodes) {
            if (!node.isConnected || node.parentElement?.closest('a, code, pre, script, style')) continue;
            let current = node;
            while (current.isConnected) {
                const match = AutoLinker.findUrl(current.nodeValue, includeTerminal);
                if (!match) break;
                current = this.replace(current, match);
                changed = true;
            }
        }
        return changed;
    }

    static findUrl(text, includeTerminal = false) {
        const pattern = /(?:https?:\/\/|www\.)[^\s<>"'`]+/gi;
        for (const candidate of text.matchAll(pattern)) {
            const start = candidate.index;
            if (start > 0 && /[\w@/]/.test(text[start - 1])) continue;
            let value = candidate[0].replace(/[.,;:!?]+$/, '');
            while (value.endsWith(')') && (value.match(/\)/g) || []).length > (value.match(/\(/g) || []).length) {
                value = value.slice(0, -1);
            }
            if (!value || (!includeTerminal && !/^[\s,;!?)}\]]/.test(text.slice(start + value.length)))) continue;
            try {
                const url = new URL(value.startsWith('www.') ? `https://${value}` : value);
                if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.') || url.hostname.endsWith('.')) continue;
                return { start, end: start + value.length, text: value, href: url.href };
            } catch (_) { /* An unfinished or malformed URL remains plain text. */ }
        }
        return null;
    }

    replace(node, match) {
        const selection = window.getSelection();
        const range = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
        const startOffset = range?.startContainer === node ? range.startOffset : null;
        const endOffset = range?.endContainer === node ? range.endOffset : null;
        const before = document.createTextNode(node.nodeValue.slice(0, match.start));
        const after = document.createTextNode(node.nodeValue.slice(match.end));
        const link = document.createElement('a');
        link.href = match.href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = match.text;
        node.replaceWith(before, link, after);
        if (!range) return after;
        const position = offset => {
            if (offset <= match.start) return [before, offset];
            if (offset >= match.end) return [after, offset - match.end];
            return [link.firstChild, offset - match.start];
        };
        if (startOffset !== null) range.setStart(...position(startOffset));
        if (endOffset !== null) range.setEnd(...position(endOffset));
        selection.removeAllRanges();
        selection.addRange(range);
        return after;
    }
}
