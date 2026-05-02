import { ParagraphBlock } from '@/blocks/ParagraphBlock.js';
import { BaseBlock } from '@/blocks/BaseBlock.js';
import { BlockType } from '@/BlockType.js';

// Mock the Editor module
jest.mock('@/Editor.js', () => {
  const mockUpdate = jest.fn();
  const mockCurrentBlock = {
    setAttribute: jest.fn(),
    textContent: 'existing content',
    innerHTML: '',
    className: '',
    focus: jest.fn(),
  };
  return {
    Editor: {
      getInstanceFromElement: jest.fn(() => ({
        currentBlock: mockCurrentBlock,
        update: mockUpdate,
      })),
      _mockCurrentBlock: mockCurrentBlock,
      _mockUpdate: mockUpdate,
    }
  };
});

import { Editor } from '@/Editor.js';

describe('ParagraphBlock', () => {
  let paragraphBlock;

  beforeEach(() => {
    paragraphBlock = new ParagraphBlock();
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('creates instance with default parameters', () => {
      const block = new ParagraphBlock();
      expect(block).toBeInstanceOf(ParagraphBlock);
      expect(block).toBeInstanceOf(BaseBlock);
      expect(block.type).toBe(BlockType.PARAGRAPH);
      expect(block.content).toBe('');
      expect(block.html).toBe('');
      expect(block.nested).toBe(false);
    });

    test('creates instance with custom parameters', () => {
      const content = 'This is a paragraph of text.';
      const html = '<p>This is a paragraph of text.</p>';
      const nested = true;
      
      const block = new ParagraphBlock(content, html, nested);
      expect(block.type).toBe(BlockType.PARAGRAPH);
      expect(block.content).toBe(content);
      expect(block.html).toBe(html);
      expect(block.nested).toBe(nested);
    });
  });

  describe('Key Handling', () => {
    test('handleKeyPress returns false for all keys', () => {
      const scenarios = [
        { key: 'Enter', description: 'Enter key' },
        { key: 'Tab', description: 'Tab key' },
        { key: 'Backspace', description: 'Backspace key' },
        { key: 'a', description: 'letter key' }
      ];

      scenarios.forEach(({ key, description }) => {
        const event = { key };
        const result = paragraphBlock.handleKeyPress(event, 'some text');
        expect(result).toBe(false);
      });
    });

    test('handleEnterKey returns false', () => {
      const event = { key: 'Enter' };
      const result = paragraphBlock.handleEnterKey(event);
      expect(result).toBe(false);
    });
  });

  describe('Static Methods', () => {
    test('getMarkdownTriggers returns empty array', () => {
      const triggers = ParagraphBlock.getMarkdownTriggers();
      expect(triggers).toEqual([]);
      expect(triggers).toHaveLength(0);
    });

    test('getToolbarConfig returns correct configuration', () => {
      const config = ParagraphBlock.getToolbarConfig();
      expect(config).toEqual({
        class: 'bke-toolbar-paragraph',
        label: 'Paragraph',
        group: 'headers'
      });
    });
  });

  describe('applyTransformation', () => {
    test('performs direct DOM transformation', () => {
      const mockBlock = Editor._mockCurrentBlock;
      const mockEditor = { update: Editor._mockUpdate };
      paragraphBlock.applyTransformation(mockBlock, mockEditor);
      
      expect(mockBlock.setAttribute).toHaveBeenCalledWith('data-block-type', 'p');
      expect(mockBlock.className).toBe('bke-block bke-block--p');
      expect(mockBlock.setAttribute).toHaveBeenCalledWith('contenteditable', 'true');
      expect(mockBlock.innerHTML).toBe('existing content');
    });

    test('calls editor update after transformation', () => {
      const mockBlock = Editor._mockCurrentBlock;
      const mockEditor = { update: Editor._mockUpdate };
      paragraphBlock.applyTransformation(mockBlock, mockEditor);
      expect(Editor._mockUpdate).toHaveBeenCalledTimes(1);
    });

    test('does nothing when no target element exists', () => {
      paragraphBlock.applyTransformation(null, null);
      expect(Editor._mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('Inheritance and Type', () => {
    test('inherits from BaseBlock', () => {
      expect(paragraphBlock).toBeInstanceOf(BaseBlock);
    });

    test('has correct block type', () => {
      expect(paragraphBlock.type).toBe(BlockType.PARAGRAPH);
    });

    test('maintains type when content changes', () => {
      paragraphBlock.content = 'New paragraph content';
      expect(paragraphBlock.type).toBe(BlockType.PARAGRAPH);
    });
  });

  describe('Content and HTML handling', () => {
    test('can set and get content', () => {
      const content = 'This is a long paragraph with multiple sentences. It contains various words and punctuation.';
      paragraphBlock.content = content;
      expect(paragraphBlock.content).toBe(content);
    });

    test('can set and get HTML', () => {
      const html = '<p>This is a paragraph with <strong>bold</strong> and <em>italic</em> text.</p>';
      paragraphBlock.html = html;
      expect(paragraphBlock.html).toBe(html);
    });

    test('can set and get nested status', () => {
      expect(paragraphBlock.nested).toBe(false);
      paragraphBlock.nested = true;
      expect(paragraphBlock.nested).toBe(true);
    });
  });
});
