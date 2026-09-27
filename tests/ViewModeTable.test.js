'use strict';

import {TableBlock} from '../src/blocks/TableBlock.js';

const savedCreateElement = document.createElement;
const savedBody = document.body;

beforeAll(() => {
    document.createElement = global._originalCreateElement;
    delete document.body;
});

afterAll(() => {
    document.createElement = savedCreateElement;
    Object.defineProperty(document, 'body', {value: savedBody, writable: true, configurable: true});
});

afterEach(() => { document.body.innerHTML = ''; });

test('table cells respect viewing mode when their delayed setup runs', () => {
    const editor = document.createElement('div');
    editor.className = 'bke-editor';
    editor.setAttribute('aria-readonly', 'true');
    editor.innerHTML = '<div data-block-type="table"><table><tr><th>Title</th><td>Value</td></tr></table></div>';
    document.body.appendChild(editor);
    const block = editor.firstElementChild;
    const table = new TableBlock();

    table.setupCellEditing(block);
    expect(Array.from(block.querySelectorAll('td, th'), cell => cell.contentEditable)).toEqual([false, false]);

    editor.setAttribute('aria-readonly', 'false');
    table.setupCellEditing(block);
    expect(Array.from(block.querySelectorAll('td, th'), cell => cell.contentEditable)).toEqual([true, true]);
});
