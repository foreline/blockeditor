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

test('retains horizontal rules and inline-code-only paragraphs', () => {
    expect(Parser.parse('---').map(b => b.type)).toEqual(['delimiter']);
    expect(Parser.parse('before\n\n---\n\nafter').map(b => b.type)).toEqual(['paragraph', 'delimiter', 'paragraph']);
    const blocks = Parser.parse('`hello`');
    expect(blocks).toHaveLength(1);
    expect(Parser.html(blocks[0]).querySelector('code').textContent).toBe('hello');
});

test('preserves all task states through render, HTML and markdown round trips', () => {
    const md = '- [x] first\n- [ ] second\n- [x] third';
    const block = Parser.parse(md)[0];
    expect(block.toMarkdown()).toBe(md);
    const element = block.renderToElement();
    expect(Array.from(element.querySelectorAll('input')).map(c => c.checked)).toEqual([true, false, true]);
    expect(TaskListBlock.parseFromHtml(element.innerHTML).toMarkdown()).toBe(md);
    expect(Parser.parseHtml(element.innerHTML)[0].toMarkdown()).toBe(md);
    expect(TaskListBlock.parseFromHtml(block.toHtml()).toMarkdown()).toBe(md);
    const manager = new BlockManager({editor: {eventEmitter: {emit: jest.fn()}}});
    expect(Array.from(manager.createBlockElement(block).querySelectorAll('input')).map(c => c.checked)).toEqual([true, false, true]);
});
