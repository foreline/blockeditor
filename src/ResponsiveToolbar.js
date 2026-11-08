'use strict';

import { ICONS } from './icons.js';

let nextMenuId = 0;

/** Collapse existing groups according to their container, retaining action nodes and handlers. */
export class ResponsiveToolbar {
    constructor(toolbar) {
        this.toolbar = toolbar;
        this.element = toolbar.element;
        this.groups = [];
        this.listeners = [];
        if (!(this.element instanceof HTMLElement)) return;
        for (const group of this.element.querySelectorAll(':scope > .bke-toolbar-group')) {
            const buttons = [...group.children];
            // Explicit dropdown groups and single actions already occupy one slot.
            if (buttons.length < 2 || buttons.some(button => button.tagName !== 'BUTTON')) continue;
            const trigger = document.createElement('button');
            trigger.type = 'button';
            trigger.className = 'bke-group-toggle';
            trigger.innerHTML = toolbar.customIcons?.['bke-chevron-down'] || ICONS['bke-chevron-down'];
            trigger.hidden = true;
            trigger.id = `bke-group-toggle-${++nextMenuId}`;
            trigger.setAttribute('aria-label', (toolbar.locale === 'ru' ? 'Ещё команды: ' : 'More actions: ') + buttons[0].getAttribute('aria-label'));
            trigger.setAttribute('aria-haspopup', 'menu');
            trigger.setAttribute('aria-expanded', 'false');
            const menu = document.createElement('ul');
            menu.id = `bke-group-menu-${nextMenuId}`;
            menu.className = 'bke-dropdown-menu bke-group-menu';
            menu.setAttribute('role', 'menu');
            menu.setAttribute('aria-labelledby', trigger.id);
            trigger.setAttribute('aria-controls', menu.id);
            const native = typeof menu.showPopover === 'function';
            if (native) menu.setAttribute('popover', 'auto');
            const entry = {group, buttons, trigger, menu, native, items: []};
            for (const button of buttons.slice(1)) {
                const item = document.createElement('li');
                item.setAttribute('role', 'none');
                const label = document.createElement('span');
                label.className = 'bke-group-action-label';
                label.textContent = button.getAttribute('aria-label') || button.title || button.textContent;
                entry.items.push({button, item, label, role: button.getAttribute('role')});
            }
            group.append(trigger, menu);
            this.groups.push(entry);
            this.listen(trigger, 'mousedown', event => { this.rememberSelection(); event.preventDefault(); });
            this.listen(trigger, 'click', () => this.openEntry === entry ? this.close() : this.open(entry));
            this.listen(trigger, 'keydown', event => {
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                    event.preventDefault(); this.open(entry);
                    const actions = this.enabledActions(entry);
                    (event.key === 'ArrowUp' ? actions.at(-1) : actions[0])?.focus();
                }
            });
            this.listen(menu, 'mousedown', event => event.preventDefault());
            // Capture runs before existing action handlers: formatting uses the saved range.
            this.listen(menu, 'click', event => {
                const button = event.target.closest('button');
                if (!button || button.disabled) return;
                this.close(menu.contains(document.activeElement));
                this.restoreSelection();
            }, true);
            this.listen(menu, 'keydown', event => this.onMenuKey(entry, event));
            if (native) this.listen(menu, 'toggle', event => {
                if (event.newState === 'closed' && this.openEntry === entry) this.close();
            });
        }
        this.listen(document, 'click', event => {
            if (this.openEntry && !this.openEntry.group.contains(event.target)) this.close();
        });
        this.listen(document, 'keydown', event => {
            if (event.key === 'Escape' && this.openEntry) { event.preventDefault(); this.close(true); }
        });
        this.listen(window, 'scroll', event => {
            if (!this.openEntry?.menu.contains(event.target)) this.close();
        }, true);
        this.listen(window, 'resize', () => { this.close(); this.refresh(); });
        if (typeof ResizeObserver !== 'undefined') {
            this.observer = new ResizeObserver(() => this.refresh());
            this.observer.observe(this.element);
        }
        this.refresh();
    }

    listen(target, type, handler, capture = false) {
        target.addEventListener(type, handler, capture);
        this.listeners.push(() => target.removeEventListener(type, handler, capture));
    }

    refresh() {
        const width = this.element.getBoundingClientRect().width;
        if (!width || width === this.width) return;
        this.width = width;
        this.close();
        this.setCollapsed(false);
        const style = getComputedStyle(this.element);
        const children = [...this.element.children];
        const number = value => parseFloat(value) || 0;
        const needed = children.reduce((sum, child) => {
            const css = getComputedStyle(child);
            return sum + child.getBoundingClientRect().width + number(css.marginLeft) + number(css.marginRight);
        }, 0) + number(style.columnGap) * Math.max(0, children.length - 1);
        this.setCollapsed(needed > width - number(style.paddingLeft) - number(style.paddingRight));
    }

    setCollapsed(collapsed) {
        this.element.classList.toggle('bke-toolbar--compact', collapsed);
        for (const {group, trigger, menu, items} of this.groups) {
            group.classList.toggle('bke-toolbar-group--collapsed', collapsed);
            trigger.hidden = !collapsed;
            for (const {button, item, label, role} of items) {
                if (collapsed) {
                    button.setAttribute('role', 'menuitem');
                    button.appendChild(label);
                    item.appendChild(button);
                    menu.appendChild(item);
                } else {
                    label.remove();
                    if (role === null) button.removeAttribute('role'); else button.setAttribute('role', role);
                    group.insertBefore(button, trigger);
                    item.remove();
                }
            }
        }
    }

    rememberSelection() {
        const selection = window.getSelection();
        const area = this.toolbar.editorInstance?.contentArea;
        if (selection?.rangeCount && area?.contains(selection.anchorNode)) this.range = selection.getRangeAt(0).cloneRange();
    }

    restoreSelection() {
        if (!this.range?.startContainer.isConnected) return;
        const selection = window.getSelection();
        selection.removeAllRanges(); selection.addRange(this.range);
    }

    enabledActions(entry) { return entry.items.map(item => item.button).filter(button => !button.disabled); }

    open(entry) {
        this.close();
        this.rememberSelection();
        this.openEntry = entry;
        if (entry.native) entry.menu.showPopover(); else entry.menu.classList.add('bke-dropdown-menu--open');
        entry.trigger.setAttribute('aria-expanded', 'true');
        const rect = entry.trigger.getBoundingClientRect();
        const menu = entry.menu;
        Object.assign(menu.style, {position: 'fixed', left: '0px', top: '0px'});
        const size = menu.getBoundingClientRect();
        menu.style.left = `${Math.max(4, Math.min(rect.left, window.innerWidth - size.width - 4))}px`;
        menu.style.top = `${Math.max(4, rect.bottom + size.height + 4 <= window.innerHeight ? rect.bottom + 4 : rect.top - size.height - 4)}px`;
    }

    close(focus = false) {
        const entry = this.openEntry;
        if (!entry) return;
        this.openEntry = null;
        if (entry.native && entry.menu.matches(':popover-open')) entry.menu.hidePopover();
        entry.menu.classList.remove('bke-dropdown-menu--open');
        entry.trigger.setAttribute('aria-expanded', 'false');
        if (focus) entry.trigger.focus();
    }

    onMenuKey(entry, event) {
        const actions = this.enabledActions(entry);
        const index = actions.indexOf(document.activeElement);
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? actions.length - 1 :
                (index + (event.key === 'ArrowDown' ? 1 : -1) + actions.length) % actions.length;
            actions[next]?.focus();
        } else if (event.key === 'Escape') {
            event.preventDefault(); this.close(true);
        } else if (event.key === 'Tab') this.close(true);
    }

    destroy() {
        this.close();
        this.observer?.disconnect();
        this.listeners.forEach(remove => remove());
        this.listeners = [];
    }
}
