'use strict';

import { AutoLinker } from '../src/AutoLinker.js';
import { URL as NodeURL } from 'node:url';

const savedCreateElement = document.createElement;
const savedCreateTextNode = document.createTextNode;
const savedBody = document.body;
const savedURL = global.URL;

beforeAll(() => {
    document.createElement = global._originalCreateElement;
    document.createTextNode = global._originalCreateTextNode;
    delete document.body;
    global.URL = NodeURL;
});

afterAll(() => {
    document.createElement = savedCreateElement;
    document.createTextNode = savedCreateTextNode;
    Object.defineProperty(document, 'body', { value: savedBody, writable: true, configurable: true });
    global.URL = savedURL;
});

afterEach(() => { document.body.innerHTML = ''; });

function block(html, type = 'paragraph') {
    const area = document.createElement('div');
    area.innerHTML = `<div class="bke-block" data-block-type="${type}">${html}</div>`;
    document.body.appendChild(area);
    return { area, element: area.firstElementChild, linker: new AutoLinker({ contentArea: area }) };
}

test('links completed URLs, including two in one text node, without swallowing punctuation', () => {
    const { element, linker } = block('See https://example.com/a, then www.example.org/path.');
    expect(linker.linkifyBlock(element, true)).toBe(true);
    expect(Array.from(element.querySelectorAll('a'), a => [a.textContent, a.href])).toEqual([
        ['https://example.com/a', 'https://example.com/a'],
        ['www.example.org/path', 'https://www.example.org/path']
    ]);
    expect(element.textContent).toBe('See https://example.com/a, then www.example.org/path.');
    expect(Array.from(element.querySelectorAll('a'), a => [a.target, a.rel])).toEqual([
        ['_blank', 'noopener noreferrer'],
        ['_blank', 'noopener noreferrer']
    ]);
});

test('waits for a typing boundary and leaves existing links and code untouched', () => {
    const { element, linker } = block('https://example.com <a href="https://old.test">https://old.test</a> <code>https://code.test</code>');
    expect(linker.linkifyBlock(element)).toBe(true);
    expect(element.querySelectorAll('a')).toHaveLength(2);
    expect(element.querySelector('code a')).toBeNull();
    const pending = block('https://new.example.com');
    expect(pending.linker.linkifyBlock(pending.element)).toBe(false);
    expect(pending.linker.linkifyBlock(pending.element, true)).toBe(true);
});

test('never links code blocks or unsafe and incomplete addresses', () => {
    const code = block('https://example.com ', 'code');
    expect(code.linker.linkifyBlock(code.element, true)).toBe(false);
    const text = block('javascript:alert(1) https://invalid/ www. ');
    expect(text.linker.linkifyBlock(text.element, true)).toBe(false);
});
