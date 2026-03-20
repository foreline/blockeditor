import { QuoteBlock } from '@/blocks/QuoteBlock.js';
import { BaseBlock } from '@/blocks/BaseBlock.js';
import { BlockType } from '@/BlockType.js';
import { Editor } from '@/Editor.js';

// Use real Editor module - manipulate _instances to control currentBlock
// No jest.mock needed since we'll set up a fake editor instance

describe('QuoteBlock', () => {
  let quoteBlock;

  beforeEach(() => {
    quoteBlock = new QuoteBlock();
    // Clear any Editor instances from previous tests
    Editor._instances.clear();
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('creates instance with default parameters', () => {
      const block = new QuoteBlock();
      expect(block).toBeInstanceOf(QuoteBlock);
      expect(block).toBeInstanceOf(BaseBlock);
      expect(block.type).toBe(BlockType.QUOTE);
      expect(block.content).toBe('');
      expect(block.html).toBe('');
      expect(block.nested).toBe(false);
    });

    test('creates instance with custom parameters', () => {
      const content = 'This is a quoted text block.';
      const html = '<blockquote>This is a quoted text block.</blockquote>';
      const nested = true;
      
      const block = new QuoteBlock(content, html, nested);
      expect(block.type).toBe(BlockType.QUOTE);
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
        const result = quoteBlock.handleKeyPress(event, 'some text');
        expect(result).toBe(false);
      });
    });

    test('handleEnterKey returns false', () => {
      const event = { key: 'Enter' };
      const result = quoteBlock.handleEnterKey(event);
      expect(result).toBe(false);
    });
  });

  describe('Static Methods', () => {
    test('getMarkdownTriggers returns correct triggers', () => {
      const triggers = QuoteBlock.getMarkdownTriggers();
      expect(triggers).toHaveLength(1);
      expect(triggers).toContain('> ');
    });

    test('triggers are static and immutable', () => {
      const triggers1 = QuoteBlock.getMarkdownTriggers();
      const triggers2 = QuoteBlock.getMarkdownTriggers();
      
      expect(triggers1).toEqual(triggers2);
      expect(triggers1).not.toBe(triggers2); // Different array instances
    });
  });

  describe('applyTransformation', () => {
    test('transforms block element to quote block', () => {
      // Create a mock block element
      const blockEl = document.createElement('div');
      blockEl.className = 'block block-p';
      blockEl.setAttribute('data-block-type', 'paragraph');
      blockEl.textContent = 'Some text';
      document.body.appendChild(blockEl);
      
      quoteBlock.applyTransformation(blockEl, null);
      
      expect(blockEl.getAttribute('data-block-type')).toBe('quote');
      expect(blockEl.className).toBe('block block-quote');
      // querySelector is mocked, so check children array directly
      const bq = blockEl.children.find(c => c.tagName === 'BLOCKQUOTE');
      expect(bq).toBeTruthy();
      expect(bq.textContent).toBe('Some text');
      expect(bq.getAttribute('contenteditable')).toBe('true');
      
      document.body.removeChild(blockEl);
    });

    test('handles null targetElement gracefully', () => {
      expect(() => quoteBlock.applyTransformation(null, null)).not.toThrow();
    });
  });

  describe('Content Conversion', () => {
    test('toMarkdown returns quoted format', () => {
      quoteBlock.content = 'This is a test quote';
      const markdown = quoteBlock.toMarkdown();
      expect(markdown).toBe('> This is a test quote');
    });

    test('toMarkdown handles empty content', () => {
      quoteBlock.content = '';
      const markdown = quoteBlock.toMarkdown();
      expect(markdown).toBe('> ');
    });

    test('toHtml returns blockquote format', () => {
      quoteBlock.content = 'This is a test quote';
      const html = quoteBlock.toHtml();
      expect(html).toBe('<blockquote>This is a test quote</blockquote>');
    });

    test('toHtml handles empty content', () => {
      quoteBlock.content = '';
      const html = quoteBlock.toHtml();
      expect(html).toBe('<blockquote></blockquote>');
    });
  });

  describe('Inheritance and Type', () => {
    test('inherits from BaseBlock', () => {
      expect(quoteBlock).toBeInstanceOf(BaseBlock);
    });

    test('has correct block type', () => {
      expect(quoteBlock.type).toBe(BlockType.QUOTE);
    });

    test('maintains type when content changes', () => {
      quoteBlock.content = 'New quote content';
      expect(quoteBlock.type).toBe(BlockType.QUOTE);
    });
  });

  describe('Content and HTML handling', () => {
    test('can set and get content', () => {
      const content = 'To be or not to be, that is the question.';
      quoteBlock.content = content;
      expect(quoteBlock.content).toBe(content);
    });

    test('can set and get HTML', () => {
      const html = '<blockquote>To be or not to be, that is the question.</blockquote>';
      quoteBlock.html = html;
      expect(quoteBlock.html).toBe(html);
    });

    test('can set and get nested status', () => {
      expect(quoteBlock.nested).toBe(false);
      quoteBlock.nested = true;
      expect(quoteBlock.nested).toBe(true);
    });
  });
});
