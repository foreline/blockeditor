'use strict';

jest.unmock('../src/blocks/BlockFactory');
jest.mock('../src/utils/log.js');

import {Parser} from '../src/Parser.js';
import {ParagraphBlock} from '../src/blocks/ParagraphBlock.js';
import {TaskListBlock} from '../src/blocks/TaskListBlock.js';
import {PasteHandler} from '../src/PasteHandler.js';
import {sanitizePasteHtml} from '../src/utils/sanitizePasteHtml.js';
import {BlockManager} from '../src/BlockManager.js';
import {getCodeText} from '../src/utils/codeText.js';
import {DelimiterBlock} from '../src/blocks/DelimiterBlock.js';
import {UnorderedListBlock} from '../src/blocks/UnorderedListBlock.js';
import {BlockFactory} from '../src/blocks/BlockFactory.js';
import {Editor} from '../src/Editor.js';
import {OrderedListBlock} from '../src/blocks/OrderedListBlock.js';
import {ImageBlock} from '../src/blocks/ImageBlock.js';

beforeAll(() => {
    document.createElement = global._originalCreateElement;
    document.createTextNode = global._originalCreateTextNode;
    delete document.body;
    delete document.documentElement;
});

afterEach(() => { document.body.innerHTML = ''; });

test('horizontal rule triggers accept whole marker lines without consuming ordinary text', () => {
    for (const marker of ['---', '****', '_____', '--- ']) {
        expect(BlockFactory.findBlockClassForTrigger(marker)).toBe(DelimiterBlock);
        expect(DelimiterBlock.computeRemainingContent(marker)).toBe('');
    }
    for (const text of ['--', '**', '__', '---text', '***bold***', '___word___', 'before ---']) {
        expect(DelimiterBlock.matchesMarkdownTrigger(text)).toBe(false);
    }
});

test('empty bullet items render an editable line without adding characters to exports', () => {
    const block = new UnorderedListBlock();
    const element = block.renderToElement();
    expect(element.querySelector('li br')).not.toBeNull();
    block.applyTransformation(element);
    expect(element.querySelector('li br')).not.toBeNull();
    block.createNewListItem(element, element.querySelector('li'));
    expect(element.querySelectorAll('li br')).toHaveLength(2);
    block.element = element;
    expect(block.toMarkdown()).toBe('- \n- ');
    expect(block.toHtml()).not.toContain('<br>');
});

test('empty numbered items have a text line and keep numbering in exports', () => {
    const block = new OrderedListBlock();
    const element = block.renderToElement();
    expect(element.querySelector('li br')).not.toBeNull();
    block.applyTransformation(element);
    block.createNewListItem(element, element.querySelector('li'));
    expect(element.querySelectorAll('li br')).toHaveLength(2);
    block.element = element;
    expect(block.toMarkdown()).toBe('1. \n2. ');
});

test('Backspace on the first task preserves formatting and later checked items', () => {
    const block = new TaskListBlock('First\nSecond');
    const element = block.renderToElement();
    document.body.appendChild(element);
    const text = element.querySelector('span');
    // jsdom does not reflect the contentEditable property into an attribute.
    text.setAttribute('contenteditable', 'true');
    text.innerHTML = '<strong>First</strong>';
    element.querySelectorAll('input')[1].checked = true;
    const range = document.createRange();
    range.setStart(text, 0);
    range.collapse(true);
    const getSelection = window.getSelection;
    window.getSelection = () => ({ rangeCount: 1, isCollapsed: true, getRangeAt: () => range });
    const editor = {
        createParagraphBlock: html => new ParagraphBlock('', html).renderToElement(),
        transaction: fn => fn(), setCurrentBlock: jest.fn(),
        findEditableElementInBlock: el => el.querySelector('p') || el,
        cursor: { placeCursorAtStart: jest.fn() }
    };
    const lookup = jest.spyOn(Editor, 'getInstanceFromElement').mockReturnValue(editor);
    try {
        const event = { preventDefault: jest.fn() };
        expect(block.handleBackspaceKey(event)).toBe(true);
        expect(event.preventDefault).toHaveBeenCalled();
        expect(element.previousElementSibling.querySelector('strong').textContent).toBe('First');
        expect(element.querySelectorAll('li')).toHaveLength(1);
        expect(element.querySelector('input').checked).toBe(true);
        expect(element.textContent).toBe('Second');
    } finally {
        lookup.mockRestore();
        window.getSelection = getSelection;
    }
});

test.each([
    ['first<p>second</p>', 'first\nsecond'],
    ['first<div><br></div><div>third</div>', 'first\n\nthird'],
    ['<span>first</span><br><span>second</span>', 'first\nsecond'],
    ['first\n  second', 'first\n  second'],
    ['<p>first</p><p>second</p>', 'first\nsecond']
])('code export preserves browser line breaks: %s', (html, expected) => {
    const code = document.createElement('code');
    code.innerHTML = html;
    expect(getCodeText(code)).toBe(expected);
});

test('toolbar-created task lists keep checkbox state and text in both exports', () => {
    const element = document.createElement('div');
    element.textContent = 'Ship release';
    const block = new TaskListBlock();
    block.applyTransformation(element);
    block.element = element;
    const checkbox = element.querySelector('li input');
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    expect(checkbox.checked).toBe(true);
    expect(block.toMarkdown()).toBe('- [x] Ship release');
    expect(block.toHtml()).toContain('checked');
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));
    expect(block.toMarkdown()).toBe('- [ ] Ship release');
});

test('empty-editor protection preserves an existing paragraph node for browser undo', () => {
    const instance = document.createElement('div');
    instance.innerHTML = '<div class="bke-block" data-block-type="paragraph"><br></div>';
    const paragraph = instance.firstChild;
    const editor = { instance, addDefaultBlock: jest.fn() };
    const manager = new BlockManager({ editor });
    expect(manager.ensureDefaultBlock()).toBe(paragraph);
    expect(instance.firstChild).toBe(paragraph);
    expect(editor.addDefaultBlock).not.toHaveBeenCalled();
});

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

test('image rendering escapes attributes and attaches resizing to a real image', () => {
    const block = new ImageBlock();
    block.setSrc('https://example.test/image.png?x="quoted"');
    block.setAlt('" onerror="bad');
    const element = block.renderToElement();
    expect(element.querySelector('img').getAttribute('alt')).toBe('" onerror="bad');
    expect(element.querySelector('img').hasAttribute('onerror')).toBe(false);
    expect(element.querySelector('.bke-resize-handle')).not.toBeNull();
    expect(element.querySelector('img').draggable).toBe(false);
    expect(element.style.cursor).not.toBe('nw-resize');
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

function pasteFixture(html, startIndex, startOffset, endIndex, endOffset, clipboard) {
    const area = document.createElement('div');
    area.innerHTML = html;
    document.body.appendChild(area);
    const range = document.createRange();
    range.setStart(area.children[startIndex].querySelector('p').firstChild, startOffset);
    range.setEnd(area.children[endIndex].querySelector('p').firstChild, endOffset);
    const selection = {rangeCount: 1, getRangeAt: () => range, removeAllRanges: jest.fn(), addRange: jest.fn()};
    window.getSelection = () => selection;
    const editor = {
        contentArea: area, currentBlock: area.firstElementChild,
        createBlockElement: block => Parser.html(block),
        createParagraphBlock: html => new ParagraphBlock('', html).renderToElement(),
        setCurrentBlock: jest.fn(), transaction: fn => fn(), update: jest.fn(), eventEmitter: {emit: jest.fn()}
    };
    new PasteHandler({editor}).handle({preventDefault() {}, clipboardData: {getData: type => clipboard[type] || ''}});
    return {area, range};
}
const paragraph = text => `<div class="bke-block" data-block-type="paragraph"><p>${text}</p></div>`;

test.each([
    {text: 'X\nY'},
    {'text/html': '<p>X</p><p>Y</p>'}
])('multiline paste replaces selected text and preserves the suffix: %j', clipboard => {
    const {area, range} = pasteFixture(paragraph('abcdef'), 0, 2, 0, 4, clipboard);
    expect(Array.from(area.children).map(b => b.textContent)).toEqual(['abX', 'Yef']);
    const remaining = range.cloneRange();
    remaining.setEndAfter(area.lastChild);
    expect(remaining.toString()).toBe('ef');
});

test('multiline paste replaces a selection crossing blocks', () => {
    const {area} = pasteFixture(paragraph('abc') + paragraph('middle') + paragraph('def'), 0, 2, 2, 1, {text: 'X\nY'});
    expect(Array.from(area.children).map(b => b.textContent)).toEqual(['abX', 'Yef']);
});

test('multiline paste splits at a collapsed caret', () => {
    const {area} = pasteFixture(paragraph('abcd'), 0, 2, 0, 2, {text: 'X\nY'});
    expect(Array.from(area.children).map(b => b.textContent)).toEqual(['abX', 'Ycd']);
});

test('pasting a standalone image preserves the text around the insertion point', () => {
    const {area} = pasteFixture(paragraph('beforeafter'), 0, 6, 0, 6, {
        'text/html': '<img src="https://example.test/large.png" width="2400" height="1200">'
    });
    expect(Array.from(area.children).map(block => block.getAttribute('data-block-type')))
        .toEqual(['paragraph', 'image', 'paragraph']);
    expect(area.firstElementChild.textContent).toBe('before');
    expect(area.lastElementChild.textContent).toBe('after');
    expect(area.querySelector('img').getAttribute('src')).toBe('https://example.test/large.png');
});

test('paste sanitizes HTML and links generated from plain markdown', () => {
    const {area} = pasteFixture(paragraph('text'), 0, 0, 0, 0, {'text/html': '<p><span onmouseover=alert(1)>safe</span></p>'});
    expect(area.querySelector('span').hasAttribute('onmouseover')).toBe(false);
    const result = pasteFixture(paragraph('text'), 0, 0, 0, 0, {text: '[link](javascript:alert(1))'});
    expect(result.area.querySelector('a').hasAttribute('href')).toBe(false);
});
