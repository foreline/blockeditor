/**
 * Tests for markdown shortcut conversions (Issue #45)
 * Tests that typing markdown shortcuts like "# ", "## ", "- ", etc. converts blocks
 */

import {Editor} from '../src/Editor.js';
import '@testing-library/jest-dom';

// Un-mock BlockFactory so real block types are available
jest.unmock('../src/blocks/BlockFactory');

describe('Markdown Shortcuts (Issue #45)', () => {
    let container;
    let editor;
    let savedCreateElement;
    let savedGetElementById;
    let savedQuerySelector;
    let savedQuerySelectorAll;
    let savedBody;
    let savedCreateTextNode;

    beforeEach(() => {
        // Restore real JSDOM functions for integration-level tests
        savedCreateElement = document.createElement;
        savedGetElementById = document.getElementById;
        savedQuerySelector = document.querySelector;
        savedQuerySelectorAll = document.querySelectorAll;
        savedBody = document.body;
        savedCreateTextNode = document.createTextNode;
        document.createElement = global._originalCreateElement;
        document.getElementById = global._originalGetElementById;
        document.querySelector = global._originalQuerySelector;
        document.querySelectorAll = global._originalQuerySelectorAll;
        document.createTextNode = global._originalCreateTextNode;
        // Delete the own data property to restore jsdom's prototype accessor
        // (avoids _version crash in jsdom's named property resolver on Node 20)
        delete document.body;

        // Create container
        container = document.createElement('div');
        container.id = 'test-editor';
        document.body.appendChild(container);

        // Initialize editor
        editor = new Editor({ id: 'test-editor', debug: false });
    });

    afterEach(() => {
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
        Editor._instances.clear();
        editor = null;

        // Restore mocked functions
        document.createElement = savedCreateElement;
        document.getElementById = savedGetElementById;
        document.querySelector = savedQuerySelector;
        document.querySelectorAll = savedQuerySelectorAll;
        document.createTextNode = savedCreateTextNode;
        Object.defineProperty(document, 'body', { value: savedBody, writable: true, configurable: true });
    });

    describe('Header Shortcuts', () => {
        test('typing "# " should convert paragraph to H1', (done) => {
            // Get the first block (should be a paragraph)
            const block = editor.instance.querySelector('.bke-block');
            expect(block).toBeTruthy();
            expect(block.getAttribute('data-block-type')).toBe('paragraph');

            // Set content to "# " and trigger the conversion
            block.textContent = '# ';
            editor.currentBlock = block;

            // Call checkAndConvertBlock as KeyHandler does
            const converted = editor.checkAndConvertBlock(block);

            // Wait for async operations
            setTimeout(() => {
                expect(converted).toBe(true);
                expect(block.getAttribute('data-block-type')).toBe('h1');
                expect(block.querySelector('h1')).toBeTruthy();
                done();
            }, 100);
        });

        test('typing "## " should convert paragraph to H2', (done) => {
            const block = editor.instance.querySelector('.bke-block');
            block.textContent = '## ';
            editor.currentBlock = block;

            const converted = editor.checkAndConvertBlock(block);

            setTimeout(() => {
                expect(converted).toBe(true);
                expect(block.getAttribute('data-block-type')).toBe('h2');
                expect(block.querySelector('h2')).toBeTruthy();
                done();
            }, 100);
        });

        test('typing "### " should convert paragraph to H3', (done) => {
            const block = editor.instance.querySelector('.bke-block');
            block.textContent = '### ';
            editor.currentBlock = block;

            const converted = editor.checkAndConvertBlock(block);

            setTimeout(() => {
                expect(converted).toBe(true);
                expect(block.getAttribute('data-block-type')).toBe('h3');
                expect(block.querySelector('h3')).toBeTruthy();
                done();
            }, 100);
        });

        test('typing "# Hello" should convert to H1 with "Hello" as content', (done) => {
            const block = editor.instance.querySelector('.bke-block');
            block.textContent = '# Hello';
            editor.currentBlock = block;

            const converted = editor.checkAndConvertBlock(block);

            setTimeout(() => {
                expect(converted).toBe(true);
                expect(block.getAttribute('data-block-type')).toBe('h1');
                const h1 = block.querySelector('h1');
                expect(h1).toBeTruthy();
                expect(h1.textContent.trim()).toBe('Hello');
                done();
            }, 100);
        });
    });

    describe('List Shortcuts', () => {
        test('typing "- " should convert paragraph to unordered list', (done) => {
            const block = editor.instance.querySelector('.bke-block');
            block.textContent = '- ';
            editor.currentBlock = block;

            const converted = editor.checkAndConvertBlock(block);

            setTimeout(() => {
                expect(converted).toBe(true);
                expect(block.getAttribute('data-block-type')).toBe('ul');
                expect(block.querySelector('ul')).toBeTruthy();
                expect(block.querySelector('li')).toBeTruthy();
                done();
            }, 100);
        });

        test('typing "* " should convert paragraph to unordered list', (done) => {
            const block = editor.instance.querySelector('.bke-block');
            block.textContent = '* ';
            editor.currentBlock = block;

            const converted = editor.checkAndConvertBlock(block);

            setTimeout(() => {
                expect(converted).toBe(true);
                expect(block.getAttribute('data-block-type')).toBe('ul');
                expect(block.querySelector('ul')).toBeTruthy();
                done();
            }, 100);
        });

        test('typing "1. " should convert paragraph to ordered list', (done) => {
            const block = editor.instance.querySelector('.bke-block');
            block.textContent = '1. ';
            editor.currentBlock = block;

            const converted = editor.checkAndConvertBlock(block);

            setTimeout(() => {
                expect(converted).toBe(true);
                expect(block.getAttribute('data-block-type')).toBe('ol');
                expect(block.querySelector('ol')).toBeTruthy();
                expect(block.querySelector('li')).toBeTruthy();
                done();
            }, 100);
        });

        test('typing "1 " should convert paragraph to ordered list', (done) => {
            const block = editor.instance.querySelector('.bke-block');
            block.textContent = '1 ';
            editor.currentBlock = block;

            const converted = editor.checkAndConvertBlock(block);

            setTimeout(() => {
                expect(converted).toBe(true);
                expect(block.getAttribute('data-block-type')).toBe('ol');
                expect(block.querySelector('ol')).toBeTruthy();
                done();
            }, 100);
        });

        test('typing "- Item text" should create list with "Item text" as content', (done) => {
            const block = editor.instance.querySelector('.bke-block');
            block.textContent = '- Item text';
            editor.currentBlock = block;

            const converted = editor.checkAndConvertBlock(block);

            setTimeout(() => {
                expect(converted).toBe(true);
                expect(block.getAttribute('data-block-type')).toBe('ul');
                const li = block.querySelector('li');
                expect(li).toBeTruthy();
                expect(li.textContent.trim()).toBe('Item text');
                done();
            }, 100);
        });
    });

    describe('No Conversion Cases', () => {
        test('typing "#" without space should not convert', () => {
            const block = editor.instance.querySelector('.bke-block');
            block.textContent = '#';
            editor.currentBlock = block;

            const converted = editor.checkAndConvertBlock(block);

            expect(converted).toBe(false);
            expect(block.getAttribute('data-block-type')).toBe('paragraph');
        });

        test('typing "# " in already converted H1 should not convert', () => {
            const block = editor.instance.querySelector('.bke-block');
            // Manually convert to H1 first
            block.setAttribute('data-block-type', 'h1');
            block.innerHTML = '<h1 contenteditable="true"># </h1>';
            editor.currentBlock = block;

            const converted = editor.checkAndConvertBlock(block);

            expect(converted).toBe(false);
            expect(block.getAttribute('data-block-type')).toBe('h1');
        });
    });
});
