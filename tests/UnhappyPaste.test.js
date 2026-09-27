'use strict';

jest.unmock('../src/blocks/BlockFactory');
import {PasteHandler} from '../src/PasteHandler.js';
import {ContentSerializer} from '../src/ContentSerializer.js';
import {ParagraphBlock} from '../src/blocks/ParagraphBlock.js';
import {CodeBlock} from '../src/blocks/CodeBlock.js';
import {Editor} from '../src/Editor.js';
import {EditorHistory} from '../src/utils/EditorHistory.js';

beforeAll(() => {
    document.createElement = global._originalCreateElement;
    document.createTextNode = global._originalCreateTextNode;
});

test('pasted Markdown keeps code, numbering, tasks, tables and quotes as blocks', () => {
    const editor = {transaction: fn => fn(), update: jest.fn(), eventEmitter: {emit: jest.fn()}};
    const handler = new PasteHandler({editor});
    const insert = jest.spyOn(handler, '_insertMultipleBlocks').mockImplementation(() => {});
    const text = '```bash\ngit status\n\ngit diff > changes.patch\n```\n\n1. Inspect\n2. Commit\n\n- [x] Done\n- [ ] Next\n\n> Check first\n\n| Command | Use |\n| --- | --- |\n| status | inspect |';
    const previous = window.getSelection;
    window.getSelection = () => ({rangeCount: 1});
    try {
        handler.handle({preventDefault: jest.fn(), clipboardData: {files: [], getData: type => type === 'text' ? text : ''}});
        const blocks = insert.mock.calls[0][0];
        expect(blocks.map(block => block.type)).toEqual(expect.arrayContaining(['code', 'ol', 'sq', 'quote', 'table']));
        expect(blocks.find(block => block.type === 'code').content).toBe('git status\n\ngit diff > changes.patch');
        expect(blocks.find(block => block.type === 'ol').toMarkdown()).toContain('2. Commit');
        expect(editor.update).toHaveBeenCalled();
    } finally {
        window.getSelection = previous;
    }
});

test('HTML exports do not nest a paragraph inside another paragraph', () => {
    const element = document.createElement('div');
    element.innerHTML = '<p>Use <code>git status</code>.</p>';
    const serializer = new ContentSerializer({editor: {}});
    expect(serializer._blockElementToHtml(element, 'p')).toBe(element.innerHTML);
    expect(ParagraphBlock.parseFromHtml(element.innerHTML).toHtml()).toBe(element.innerHTML);
});

test('HTML fenced code selects the HTML language instead of plain text', () => {
    const block = new CodeBlock('<textarea>git status</textarea>', '', false, 'html');
    expect(block.createLanguageSelector().querySelector('select').value).toBe('markup');
});

test('history rebuilds real code and task blocks and preserves redo after an update', () => {
    const editor = Object.create(Editor.prototype);
    editor.instance = document.createElement('div');
    editor.contentArea = document.createElement('div');
    editor.instance.appendChild(editor.contentArea);
    editor.serializer = new ContentSerializer();
    editor.transaction = fn => fn();
    editor.setCurrentBlock = jest.fn();
    editor.focus = jest.fn();
    editor.restoreHistory('<p>Before</p>');
    editor.history = new EditorHistory(() => editor.getHtml(), html => editor.restoreHistory(html));
    editor.restoreHistory('<pre><code class="language-html">&lt;textarea&gt;\n\ngit status\n&lt;/textarea&gt;</code></pre><ul><li><input type="checkbox" checked>Done</li></ul>');
    const pasted = editor.getMarkdown();
    expect(editor.undo()).toBe(true);
    expect(editor.getMarkdown()).toBe('Before');
    editor.history.record();
    expect(editor.redo()).toBe(true);
    expect(editor.getMarkdown()).toBe(pasted);
    expect(editor.contentArea.querySelector('input[type="checkbox"]').checked).toBe(true);
    expect(editor.contentArea.querySelector('code').textContent).toBe('<textarea>\n\ngit status\n</textarea>');
});
