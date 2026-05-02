import { DelimiterBlock } from '@/blocks/DelimiterBlock.js';
import { BaseBlock } from '@/blocks/BaseBlock.js';
import { BlockType } from '@/BlockType.js';

// Mock the Editor module
jest.mock('@/Editor.js', () => {
  const mockUpdate = jest.fn();
  const mockCurrentBlock = {
    setAttribute: jest.fn(),
    appendChild: jest.fn(),
    innerHTML: '',
    className: '',
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

// Mock document.createElement
global.document.createElement = jest.fn(() => ({
  classList: {
    add: jest.fn()
  },
  setAttribute: jest.fn(),
  contentEditable: null
}));

describe('DelimiterBlock', () => {
  let delimiterBlock;

  beforeEach(() => {
    delimiterBlock = new DelimiterBlock();
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('creates instance with default parameters', () => {
      const block = new DelimiterBlock();
      expect(block).toBeInstanceOf(DelimiterBlock);
      expect(block).toBeInstanceOf(BaseBlock);
      expect(block.type).toBe(BlockType.DELIMITER);
      expect(block.content).toBe('');
      expect(block.html).toBe('');
      expect(block.nested).toBe(false);
    });

    test('creates instance with custom parameters', () => {
      const content = '---';
      const html = '<hr>';
      const nested = true;
      
      const block = new DelimiterBlock(content, html, nested);
      expect(block.type).toBe(BlockType.DELIMITER);
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
        const result = delimiterBlock.handleKeyPress(event, 'some text');
        expect(result).toBe(false);
      });
    });

    test('handleEnterKey returns false', () => {
      const event = { key: 'Enter' };
      const result = delimiterBlock.handleEnterKey(event);
      expect(result).toBe(false);
    });
  });

  describe('Static Methods', () => {
    test('getMarkdownTriggers returns correct triggers', () => {
      const triggers = DelimiterBlock.getMarkdownTriggers();
      expect(triggers).toHaveLength(3);
      expect(triggers).toContain('---');
      expect(triggers).toContain('***');
      expect(triggers).toContain('___');
    });

    test('triggers are static and immutable', () => {
      const triggers1 = DelimiterBlock.getMarkdownTriggers();
      const triggers2 = DelimiterBlock.getMarkdownTriggers();
      
      expect(triggers1).toEqual(triggers2);
      expect(triggers1).not.toBe(triggers2); // Different array instances
    });
  });

  describe('applyTransformation', () => {
    test('performs direct DOM transformation', () => {
      const mockBlock = Editor._mockCurrentBlock;
      const mockEditor = { update: Editor._mockUpdate };
      delimiterBlock.applyTransformation(mockBlock, mockEditor);
      
      expect(mockBlock.setAttribute).toHaveBeenCalledWith('data-block-type', 'delimiter');
      expect(mockBlock.className).toBe('bke-block bke-block--delimiter');
      expect(mockBlock.setAttribute).toHaveBeenCalledWith('contenteditable', 'false');
      expect(mockBlock.appendChild).toHaveBeenCalled();
    });

    test('calls editor update after transformation', () => {
      const mockBlock = Editor._mockCurrentBlock;
      const mockEditor = { update: Editor._mockUpdate };
      delimiterBlock.applyTransformation(mockBlock, mockEditor);
      expect(Editor._mockUpdate).toHaveBeenCalledTimes(1);
    });

    test('does nothing when no target element exists', () => {
      delimiterBlock.applyTransformation(null, null);
      
      // No calls should have been made
      expect(Editor._mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('renderToElement', () => {
    test('creates hr element with correct properties', () => {
      const mockElement = {
        classList: {
          add: jest.fn()
        },
        setAttribute: jest.fn(),
        contentEditable: null
      };
      
      document.createElement.mockReturnValueOnce(mockElement);
      
      const element = delimiterBlock.renderToElement();
      
      expect(document.createElement).toHaveBeenCalledWith('hr');
      expect(mockElement.classList.add).toHaveBeenCalledWith('bke-block');
      expect(mockElement.classList.add).toHaveBeenCalledWith('bke-block--delimiter');
      expect(mockElement.setAttribute).toHaveBeenCalledWith('data-block-type', 'delimiter');
      expect(mockElement.contentEditable).toBe(false);
    });
  });

  describe('Inheritance and Type', () => {
    test('inherits from BaseBlock', () => {
      expect(delimiterBlock).toBeInstanceOf(BaseBlock);
    });

    test('has correct block type', () => {
      expect(delimiterBlock.type).toBe(BlockType.DELIMITER);
    });

    test('maintains type when content changes', () => {
      delimiterBlock.content = '***';
      expect(delimiterBlock.type).toBe(BlockType.DELIMITER);
    });
  });

  describe('Content and HTML handling', () => {
    test('can set and get content', () => {
      const content = '---';
      delimiterBlock.content = content;
      expect(delimiterBlock.content).toBe(content);
    });

    test('can set and get HTML', () => {
      const html = '<hr>';
      delimiterBlock.html = html;
      expect(delimiterBlock.html).toBe(html);
    });

    test('can set and get nested status', () => {
      expect(delimiterBlock.nested).toBe(false);
      delimiterBlock.nested = true;
      expect(delimiterBlock.nested).toBe(true);
    });
  });
});
