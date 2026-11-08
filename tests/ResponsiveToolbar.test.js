'use strict';

import { ResponsiveToolbar } from '../src/ResponsiveToolbar.js';

beforeAll(() => {
    document.createElement = global._originalCreateElement;
    delete document.body;
});

let responsive;
afterEach(() => { responsive?.destroy(); document.body.innerHTML = ''; delete global.ResizeObserver; });

function fixture(width = 240) {
    const container = document.createElement('div');
    container.innerHTML = '<div class="bke-toolbar"><div class="bke-toolbar-group">' +
        '<button aria-label="Bold">B</button><button aria-label="Italic">I</button><button disabled aria-label="Unavailable">U</button>' +
        '</div><div class="bke-toolbar-group"><button aria-label="Single">S</button></div></div>';
    document.body.appendChild(container);
    const element = container.firstChild;
    element.getBoundingClientRect = () => ({ width });
    for (const child of element.children) child.getBoundingClientRect = () => ({ width: 80 });
    const toolbar = { element, container, locale: 'en' };
    let notify;
    const disconnect = jest.fn();
    global.ResizeObserver = class {
        constructor(callback) { notify = callback; }
        observe() {}
        disconnect = disconnect;
    };
    responsive = new ResponsiveToolbar(toolbar);
    return { element, disconnect, resize: value => { width = value; notify(); } };
}

test('container resize collapses groups and restores the same buttons in order', () => {
    const {element, resize} = fixture();
    const group = element.firstChild;
    const buttons = [...group.querySelectorAll('button:not(.bke-group-toggle)')];
    const action = jest.fn(); buttons[1].addEventListener('click', action);
    expect(group.classList.contains('bke-toolbar-group--collapsed')).toBe(false);
    resize(120);
    expect(group.classList.contains('bke-toolbar-group--collapsed')).toBe(true);
    expect(group.firstChild).toBe(buttons[0]);
    expect(group.querySelector('[role="menu"]').contains(buttons[1])).toBe(true);
    expect(element.querySelectorAll('.bke-group-toggle')).toHaveLength(1);
    buttons[1].click(); expect(action).toHaveBeenCalledTimes(1);
    expect(buttons[2].disabled).toBe(true);
    resize(240);
    expect([...group.querySelectorAll(':scope > button:not(.bke-group-toggle)')]).toEqual(buttons);
    expect(buttons[1].hasAttribute('role')).toBe(false);
});

test('menu supports keyboard navigation, skips disabled actions and Escape returns focus', () => {
    const {element} = fixture(120);
    const trigger = element.querySelector('.bke-group-toggle');
    trigger.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));
    const menu = element.querySelector('[role="menu"]');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(menu.querySelector('button'));
    menu.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));
    expect(document.activeElement.disabled).toBe(false);
    menu.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
});

test('outside click, action and resizing close menus; hidden mount can become visible', () => {
    const {element, resize} = fixture(0);
    resize(120);
    const trigger = element.querySelector('.bke-group-toggle');
    trigger.click();
    document.body.click();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    trigger.click();
    element.querySelector('[role="menu"] button').click();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    trigger.click(); resize(240);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
});

test('instances have unique menu IDs and destruction disconnects the observer', () => {
    const first = fixture(120);
    const firstResponsive = responsive;
    const id = first.element.querySelector('[role="menu"]').id;
    const second = fixture(120);
    expect(second.element.querySelector('[role="menu"]').id).not.toBe(id);
    firstResponsive.destroy();
    expect(first.disconnect).toHaveBeenCalledTimes(1);
});
