'use strict';

jest.unmock('../src/blocks/BlockFactory');
jest.mock('../src/utils/log.js');

import {Parser} from '../src/Parser.js';
import {ParagraphBlock} from '../src/blocks/ParagraphBlock.js';
import {TaskListBlock} from '../src/blocks/TaskListBlock.js';
import {PasteHandler} from '../src/PasteHandler.js';
import {sanitizePasteHtml} from '../src/utils/sanitizePasteHtml.js';
import {BlockManager} from '../src/BlockManager.js';

beforeAll(() => {
    document.createElement = global._originalCreateElement;
    document.createTextNode = global._originalCreateTextNode;
    delete document.body;
    delete document.documentElement;
});

afterEach(() => { document.body.innerHTML = ''; });

test.each([
    '<p><span onmouseover=alert(1)>text</span></p>',
    '<p><a href="java&#x09;script:alert(1)" onclick = "alert(1)">text</a></p>',
    '<p><img src=x onerror=alert(1)><svg onload=alert(1)></svg></p>',
    '<iframe srcdoc="<script>alert(1)</script>"></iframe><p>safe</p>'
])('sanitizes browser-parsed attributes and active elements: %s', html => {
    const el = document.createElement('div');
    el.innerHTML = sanitizePasteHtml(html);
    expect(el.querySelector('script, iframe, svg')).toBeNull();
    for (const node of el.querySelectorAll('*')) {
        expect(Array.from(node.attributes).some(a => /^on/i.test(a.name))).toBe(false);
        expect(node.getAttribute('href') || '').not.toMatch(/script:/i);
    }
});

test('keeps safe formatting and links', () => {
    expect(sanitizePasteHtml('<p><strong>bold</strong> <a href="https://example.com">link</a></p>'))
        .toBe('<p><strong>bold</strong> <a href="https://example.com">link</a></p>');
});

test('paragraph conversion keeps HTML-looking text inert', () => {
    const el = document.createElement('div');
    const text = '<img src=x onerror=alert(1)> & text';
    el.textContent = text;
    new ParagraphBlock().applyTransformation(el);
    expect(el.textContent).toBe(text);
    expect(el.querySelector('img')).toBeNull();
});
