import { H2Block } from '@/blocks/H2Block.js';
import { HeadingBlock } from '@/blocks/HeadingBlock.js';
import { BaseBlock } from '@/blocks/BaseBlock.js';
import { BlockType } from '@/BlockType.js';
import { Toolbar } from '@/Toolbar.js';

// Mock the Toolbar module
jest.mock('@/Toolbar.js', () => ({
  Toolbar: {
    h2: jest.fn()
  }
}));

describe('H2Block', () => {
  let h2Block;

  beforeEach(() => {
    h2Block = new H2Block();
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('creates instance with default parameters', () => {
      const block = new H2Block();
      expect(block).toBeInstanceOf(H2Block);
      expect(block).toBeInstanceOf(HeadingBlock);
      expect(block).toBeInstanceOf(BaseBlock);
      expect(block.type).toBe(BlockType.H2);
      expect(block.content).toBe('');
      expect(block.html).toBe('');
      expect(block.nested).toBe(false);
      expect(block.level).toBe(2);
    });

    test('creates instance with custom parameters', () => {
      const content = 'Secondary Heading';
      const html = '<h2>Secondary Heading</h2>';
      const nested = true;
      
      const block = new H2Block(content, html, nested);
      expect(block.type).toBe(BlockType.H2);
      expect(block.content).toBe(content);
      expect(block.html).toBe(html);
      expect(block.nested).toBe(nested);
      expect(block.level).toBe(2);
    });
  });

  describe('Static Methods', () => {
    test('getMarkdownTriggers returns correct triggers', () => {
      const triggers = H2Block.getMarkdownTriggers();
      expect(triggers).toHaveLength(1);
      expect(triggers).toContain('## ');
    });

    test('getToolbarConfig returns correct configuration', () => {
      const config = H2Block.getToolbarConfig();
      expect(config).toEqual({
        class: 'bke-toolbar-header2',
        label: 'Heading 2',
        group: 'headers'
      });
    });
  });

  describe('applyTransformation', () => {
    test('calls Toolbar.h2 method', () => {
      h2Block.applyTransformation();
      expect(Toolbar.h2).toHaveBeenCalledTimes(1);
      expect(Toolbar.h2).toHaveBeenCalledWith();
    });
  });

  describe('Inheritance and Type', () => {
    test('inherits from HeadingBlock', () => {
      expect(h2Block).toBeInstanceOf(HeadingBlock);
    });

    test('has correct block type', () => {
      expect(h2Block.type).toBe(BlockType.H2);
    });

    test('has correct heading level', () => {
      expect(h2Block.level).toBe(2);
    });
  });
});
