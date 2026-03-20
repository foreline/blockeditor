'use strict';

import { Editor } from '../src/Editor.js';
import { Utils } from '../src/Utils.js';
import { BlockFactory } from '../src/blocks/BlockFactory.js';

// Keep output clean
jest.mock('../src/utils/log.js');
jest.mock('../src/Toolbar.js');

describe('Header Markdown Trigger Conversion', () => {
  let editor;
  let container;
  let paragraphBlock;

  beforeEach(() => {
    // Prepare container and a paragraph block with trigger
    document.body.innerHTML = '';
  container = document.createElement('div');
    container.id = 'header-trigger-editor';
  document.body.appendChild(container);
  // Ensure append exists for Editor.init flow
  // Our global createElement mock lacks Element.append
  container.append = function(child) { return this.appendChild(child); };
  // Make getElementById return our container instance
  document.getElementById = jest.fn().mockReturnValue(container);

  paragraphBlock = document.createElement('div');
    paragraphBlock.className = 'block block-p';
  paragraphBlock.setAttribute('data-block-type', 'p');
  // Ensure attribute access works as expected for Editor checks
  paragraphBlock.getAttribute = jest.fn((name) => paragraphBlock.attributes[name]);
  paragraphBlock.hasAttribute = jest.fn((name) => Object.prototype.hasOwnProperty.call(paragraphBlock.attributes, name));
    paragraphBlock.setAttribute('contenteditable', 'true');
    paragraphBlock.innerHTML = '# Title ';
  container.appendChild(paragraphBlock);
  // Ensure block discovery works in Editor.init
  container.querySelectorAll = jest.fn((sel) => sel === '.block' ? [paragraphBlock] : []);
  container.querySelector = jest.fn((sel) => sel === '.block' ? paragraphBlock : null);

    // Preserve trailing space in the stripped text
    jest.spyOn(Utils, 'stripTags').mockReturnValue('# Title ');

    // Mock the trigger resolution to return an H1-like class
    class H1Mock {
      constructor() { this.type = 'h1'; }
      static getMarkdownTriggers() { return ['# ']; }
      static matchesMarkdownTrigger() { return true; }
    }

    BlockFactory.findBlockClassForTrigger = jest.fn().mockReturnValue(H1Mock);

    // Mock createBlock to perform a real DOM transform similar to HeadingBlock
    BlockFactory.createBlock = jest.fn((type) => {
      if (type === 'h1') {
        return {
          constructor: { getMarkdownTriggers: () => ['# '] },
          applyTransformation: jest.fn(() => {
            const editorInstance = Editor.getInstanceFromElement(document.activeElement);
            const current = editorInstance?.currentBlock;
            if (!current) return;
            current.setAttribute('data-block-type', 'h1');
            current.className = 'block block-h1';
            const h = document.createElement('h1');
            h.textContent = '';
            current.innerHTML = '';
            current.appendChild(h);
            h.setAttribute('contenteditable', 'true');
          })
        };
      }
      return { constructor: { getMarkdownTriggers: () => [] }, applyTransformation: jest.fn() };
    });

    // Instantiate editor (toolbar disabled for test simplicity)
    editor = new Editor({ id: 'header-trigger-editor', toolbar: false });
    editor.setCurrentBlock(paragraphBlock);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (editor && typeof editor.destroy === 'function') editor.destroy();
    document.body.innerHTML = '';
  });

  test('converts paragraph starting with "# " to H1 block', () => {
    const converted = editor.checkAndConvertBlock(paragraphBlock);
    expect(converted).toBe(true);

    // Assert the transformation to H1 was applied
    expect(paragraphBlock.setAttribute).toHaveBeenCalledWith('data-block-type', 'h1');
    expect(paragraphBlock.className).toBe('block block-h1');
    expect(document.createElement).toHaveBeenCalledWith('h1');
  });

  test('converts paragraph starting with "#\u00A0" (NBSP) to H1 block', () => {
    // Reset mocks and set NBSP content
    jest.restoreAllMocks();

    // Recreate minimal mocks used in this test
    jest.spyOn(Utils, 'stripTags').mockReturnValue('#\u00A0Title');

    class H1Mock {
      constructor() { this.type = 'h1'; }
      static getMarkdownTriggers() { return ['# ']; }
      static matchesMarkdownTrigger() { return true; }
    }
    BlockFactory.findBlockClassForTrigger = jest.fn().mockReturnValue(H1Mock);
    BlockFactory.createBlock = jest.fn(() => ({
      constructor: { getMarkdownTriggers: () => ['# '] },
      applyTransformation: jest.fn(() => {
        const editorInstance = Editor.getInstanceFromElement(document.activeElement);
        const current = editorInstance?.currentBlock;
        if (!current) return;
        current.setAttribute('data-block-type', 'h1');
        current.className = 'block block-h1';
        const h = document.createElement('h1');
        current.innerHTML = '';
        current.appendChild(h);
        h.setAttribute('contenteditable', 'true');
      })
    }));

    // Set current block and run conversion
    editor.setCurrentBlock(paragraphBlock);
    const converted = editor.checkAndConvertBlock(paragraphBlock);

    expect(converted).toBe(true);
    expect(paragraphBlock.className).toBe('block block-h1');
  });
});
