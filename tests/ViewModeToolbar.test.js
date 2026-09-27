'use strict';

import {Toolbar} from '../src/Toolbar.js';

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

test('viewing disables the toolbar and editing restores prior button states', () => {
    const element = document.createElement('div');
    element.innerHTML = '<button type="button">Bold</button><button type="button" disabled>Unavailable</button>' +
        '<button type="button" class="bke-toolbar-text" disabled>Text</button>' +
        '<button type="button" class="bke-toolbar-markdown">Markdown</button>' +
        '<button type="button" class="bke-toolbar-html">HTML</button>';
    document.body.appendChild(element);
    const toolbar = Object.create(Toolbar.prototype);
    toolbar.element = element;
    toolbar.editorInstance = {currentBlock: null};
    const buttons = element.querySelectorAll('button');

    toolbar.setViewing(true);
    expect(Array.from(buttons, button => button.disabled)).toEqual([true, true, true, false, false]);

    // Source views may change while the editor remains in viewing mode.
    buttons[2].disabled = false;
    buttons[3].disabled = true;

    toolbar.setViewing(false);
    expect(Array.from(buttons, button => button.disabled)).toEqual([false, true, false, true, false]);
});
