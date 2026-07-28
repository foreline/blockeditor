/**
 * Tests for mounting the editor on a detached DOM element.
 *
 * Regression: Editor.mount() used to pass only the element id to the
 * constructor, which resolved it via document.getElementById — so mounting
 * an element that was not yet attached to the document crashed with
 * "Cannot read properties of null (reading 'innerHTML')".
 */

import {Editor} from '../src/Editor.js';
import '@testing-library/jest-dom';

// Un-mock BlockFactory so real block types are available
jest.unmock('../src/blocks/BlockFactory');

describe('Editor.mount() with a detached element', () => {
    let savedCreateElement;
    let savedGetElementById;
    let savedQuerySelector;
    let savedQuerySelectorAll;
    let savedCreateTextNode;

    beforeEach(() => {
        // Restore real JSDOM functions for integration-level tests
        savedCreateElement = document.createElement;
        savedGetElementById = document.getElementById;
        savedQuerySelector = document.querySelector;
        savedQuerySelectorAll = document.querySelectorAll;
        savedCreateTextNode = document.createTextNode;
        document.createElement = global._originalCreateElement;
        document.getElementById = global._originalGetElementById;
        document.querySelector = global._originalQuerySelector;
        document.querySelectorAll = global._originalQuerySelectorAll;
        document.createTextNode = global._originalCreateTextNode;
        // Delete the own data property to restore jsdom's prototype accessor
        delete document.body;

        Editor._instances.clear();
    });

    afterEach(() => {
        Editor._instances.clear();

        // Restore mocked functions
        document.createElement = savedCreateElement;
        document.getElementById = savedGetElementById;
        document.querySelector = savedQuerySelector;
        document.querySelectorAll = savedQuerySelectorAll;
        document.createTextNode = savedCreateTextNode;
    });

    test('mounts on an element that is not attached to the document', () => {
        const element = document.createElement('div');
        expect(element.isConnected).toBe(false);

        let editor;
        expect(() => {
            editor = Editor.mount(element, { toolbar: false });
        }).not.toThrow();

        expect(editor).toBeInstanceOf(Editor);
        expect(element.id).not.toBe('');
        expect(element.classList.contains('bke-editor')).toBe(true);
        expect(element.querySelector('.bke-content-area')).not.toBeNull();
    });

    test('initialises empty content (empty text option) on a detached element', () => {
        // Regression: with an empty text option the constructor fell through
        // to reading innerHTML from the null getElementById result.
        const element = document.createElement('div');

        const editor = Editor.mount(element, { toolbar: false, text: '' });

        expect(editor).toBeInstanceOf(Editor);
        expect(element.querySelector('.bke-content-area')).not.toBeNull();
    });

    test('renders initial markdown content on a detached element', () => {
        const element = document.createElement('div');

        const editor = Editor.mount(element, { toolbar: false, text: '# Hello' });

        expect(editor.getMarkdown()).toContain('Hello');
    });

    test('instance is retrievable via getInstance before attaching to the document', () => {
        const element = document.createElement('div');

        const editor = Editor.mount(element, { toolbar: false });

        expect(Editor.getInstance(element)).toBe(editor);
    });

    test('still works after the element is later attached to the document', () => {
        const element = document.createElement('div');
        const editor = Editor.mount(element, { toolbar: false, text: 'Some text' });

        document.body.appendChild(element);
        expect(element.isConnected).toBe(true);
        expect(editor.getMarkdown()).toContain('Some text');

        element.parentNode.removeChild(element);
    });

    test('constructor accepts options.element directly and prefers it over the id lookup', () => {
        const element = document.createElement('div');
        // An id that does NOT exist in the document — the element must win.
        const editor = new Editor({ id: 'nonexistent-id', element, toolbar: false });

        expect(editor).toBeInstanceOf(Editor);
        expect(editor.instance).toBe(element);
        expect(element.classList.contains('bke-editor')).toBe(true);
    });
});
