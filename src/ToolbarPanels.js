'use strict';

import { ToolbarHandlers } from './ToolbarHandlers.js';

/** Small, instance-scoped, non-modal help and link panels. */
export class ToolbarPanels {
    constructor(toolbar) {
        this.toolbar = toolbar;
        this.captureSelection = () => {
            const selection = window.getSelection();
            if (!selection?.rangeCount) return;
            const range = selection.getRangeAt(0);
            if (this.containsRange(range)) this.savedRange = range.cloneRange();
        };
        ToolbarHandlers.addEventListenerWithTracking(document, 'selectionchange', this.captureSelection, toolbar.container);
    }

    containsRange(range) {
        const area = this.toolbar.editorInstance?.contentArea;
        return range && area?.contains(range.startContainer) && area.contains(range.endContainer);
    }

    preserveScroll(action) {
        const positions = [];
        for (let el = this.toolbar.editorInstance.contentArea; el; el = el.parentElement) {
            positions.push([el, el.scrollLeft, el.scrollTop]);
        }
        const x = window.scrollX, y = window.scrollY;
        try { return action(); }
        finally {
            positions.forEach(([el, left, top]) => { el.scrollLeft = left; el.scrollTop = top; });
            window.scrollTo({ left: x, top: y, behavior: 'instant' });
        }
    }

    restore(range) {
        if (!this.containsRange(range)) return false;
        const element = range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement;
        element.closest('[contenteditable="true"]')?.focus({ preventScroll: true });
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        const block = element.closest('.bke-block');
        if (block) this.toolbar.editorInstance.setCurrentBlock(block);
        return true;
    }

    close(restore = false) {
        if (!this.panel) return;
        this.panel.remove();
        this.trigger.setAttribute('aria-expanded', 'false');
        document.removeEventListener('pointerdown', this.onOutside);
        this.panel = null;
        if (restore) {
            this.preserveScroll(() => { if (!this.restore(this.returnRange)) this.trigger.focus({ preventScroll: true }); });
        }
    }

    open(kind) {
        this.captureSelection();
        if (this.panel && this.kind === kind) { this.close(true); return null; }
        this.close();
        this.kind = kind;
        this.returnRange = this.savedRange?.cloneRange();
        this.trigger = this.toolbar.element.querySelector(`.bke-toolbar-${kind}`);
        this.trigger.setAttribute('aria-expanded', 'true');
        const panel = document.createElement('div');
        panel.className = 'bke-toolbar-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', this.toolbar.messages[kind]);
        panel.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                this.close(true);
            }
        });
        this.panel = panel;
        this.toolbar.element.appendChild(panel);
        this.onOutside = event => {
            if (!panel.contains(event.target) && !this.trigger.contains(event.target)) this.close();
        };
        document.addEventListener('pointerdown', this.onOutside);
        const close = this.button(this.toolbar.messages.close, () => this.close(true));
        close.className = 'bke-panel-close';
        panel.appendChild(close);
        return panel;
    }

    button(text, action) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = text;
        button.addEventListener('click', action);
        return button;
    }

    help() {
        const panel = this.open('help');
        if (!panel) return;
        const labels = this.toolbar.messages;
        const append = (tag, text) => {
            const el = document.createElement(tag);
            el.textContent = text;
            panel.appendChild(el);
        };
        append('h3', labels.help);
        append('p', labels.basics);
        append('h4', labels.shortcuts);
        append('p', labels.blockHint);
        const rows = (entries) => {
            const list = document.createElement('dl');
            entries.forEach(([shortcut, label]) => {
                const term = document.createElement('dt');
                const code = document.createElement('code');
                code.textContent = shortcut;
                term.appendChild(code);
                const definition = document.createElement('dd');
                definition.textContent = label;
                list.append(term, definition);
            });
            panel.appendChild(list);
        };
        rows([['#␣ … ######␣', labels.heading], ['-␣', labels.bullet], ['1.␣', labels.numbered], ['>␣', labels.quote], ['```', labels.code], ['---', labels.rule]]);
        append('p', labels.inlineHint);
        const sample = this.toolbar.locale === 'ru' ? 'текст' : 'text';
        rows([['**' + sample + '**', labels.bold], ['*' + sample + '*', labels.italic], ['~~' + sample + '~~', labels.strike], ['`' + sample + '`', labels.inlineCode]]);
        append('p', labels.taskHint);
        panel.querySelector('button').focus({ preventScroll: true });
    }

    link() {
        const editor = this.toolbar.editorInstance;
        if (editor?._readonly || editor?.contentArea.classList.contains('bke-hidden')) return;
        const panel = this.open('link');
        if (!panel) return;
        const labels = this.toolbar.messages;
        const range = this.returnRange;
        const element = node => node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
        const start = element(range?.startContainer);
        const end = element(range?.endContainer);
        const host = node => node?.closest('li, td, th, .bke-block');
        if (!this.containsRange(range) || !host(start) || host(start) !== host(end) || start.closest('pre') || end.closest('pre')) {
            const message = document.createElement('p');
            message.textContent = labels.selectText;
            panel.appendChild(message);
            panel.querySelector('button').focus({ preventScroll: true });
            return;
        }
        const anchor = start.closest('a');
        const existing = anchor && anchor === end.closest('a') ? anchor : null;
        const label = document.createElement('label');
        label.textContent = labels.url;
        const input = document.createElement('input');
        input.type = 'text';
        input.inputMode = 'url';
        input.placeholder = 'https://example.com';
        input.value = existing?.getAttribute('href') || '';
        label.appendChild(input);
        const error = document.createElement('p');
        error.className = 'bke-panel-error';
        error.setAttribute('role', 'alert');
        const form = document.createElement('form');
        form.append(label, error);
        const apply = this.button(labels.apply, () => {});
        apply.type = 'submit';
        form.appendChild(apply);
        form.addEventListener('submit', event => {
            event.preventDefault();
            const url = input.value.trim();
            if (!ToolbarPanels.isSafeUrl(url)) {
                error.textContent = labels.invalidUrl;
                input.setAttribute('aria-invalid', 'true');
                input.focus({ preventScroll: true });
                return;
            }
            this.preserveScroll(() => {
                if (!this.restore(range)) { this.close(); return; }
                if (existing) range.selectNodeContents(existing);
                if (range.collapsed && !existing) {
                    const link = document.createElement('a');
                    link.setAttribute('href', url);
                    link.textContent = url;
                    document.execCommand('insertHTML', false, link.outerHTML);
                } else document.execCommand('createLink', false, url);
                // Native editing commands retain undo history and inline formatting.
                this.close();
                editor.update();
            });
        });
        if (existing) {
            form.appendChild(this.button(labels.remove, () => this.preserveScroll(() => {
                if (!this.restore(range)) { this.close(); return; }
                range.selectNodeContents(existing);
                document.execCommand('unlink');
                this.close();
                editor.update();
            })));
        }
        panel.appendChild(form);
        input.focus({ preventScroll: true });
        input.select();
    }

    static isSafeUrl(url) {
        if (!url || /[\u0000-\u0020\u007f]/.test(url)) return false;
        try { return ['http:', 'https:', 'mailto:', 'tel:'].includes(new URL(url, document.baseURI).protocol); }
        catch { return false; }
    }
}
