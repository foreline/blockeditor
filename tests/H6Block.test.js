import { H6Block } from '@/blocks/H6Block.js';
import { HeadingBlock } from '@/blocks/HeadingBlock.js';
import { BaseBlock } from '@/blocks/BaseBlock.js';
import { BlockType } from '@/BlockType.js';
import { Toolbar } from '@/Toolbar.js';

// Mock the Toolbar module
jest.mock('@/Toolbar.js', () => ({
  Toolbar: {
    h6: jest.fn()
  }
}));

describe('H6Block', () => {
  let h6Block;

  beforeEach(() => {
    h6Block = new H6Block();
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('creates instance with default parameters', () => {
      const block = new H6Block();
      expect(block).toBeInstanceOf(H6Block);
      expect(block).toBeInstanceOf(HeadingBlock);
      expect(block).toBeInstanceOf(BaseBlock);
      expect(block.type).toBe(BlockType.H6);
      expect(block.content).toBe('');
      expect(block.html).toBe('');
      expect(block.nested).toBe(false);
      expect(block.level).toBe(6);
    });

    test('creates instance with custom parameters', () => {
      const content = 'Sixth Level Heading';
      const html = '<h6>Sixth Level Heading</h6>';
      const nested = true;
      
      const block = new H6Block(content, html, nested);
      expect(block.type).toBe(BlockType.H6);
      expect(block.content).toBe(content);
      expect(block.html).toBe(html);
      expect(block.nested).toBe(nested);
      expect(block.level).toBe(6);
    });
  });

  describe('Static Methods', () => {
    test('getMarkdownTriggers returns correct triggers', () => {
      const triggers = H6Block.getMarkdownTriggers();
      expect(triggers).toHaveLength(1);
      expect(triggers).toContain('###### ');
    });

    test('getToolbarConfig returns correct configuration', () => {
      const config = H6Block.getToolbarConfig();
      expect(config).toEqual({
        class: 'bke-toolbar-header6',
        label: 'Heading 6',
        group: 'headers'
      });
    });
  });

  describe('applyTransformation', () => {
    test('calls Toolbar.h6 method', () => {
      h6Block.applyTransformation();
      expect(Toolbar.h6).toHaveBeenCalledTimes(1);
      expect(Toolbar.h6).toHaveBeenCalledWith();
    });
  });

  describe('Inheritance and Type', () => {
    test('inherits from HeadingBlock', () => {
      expect(h6Block).toBeInstanceOf(HeadingBlock);
    });

    test('has correct block type', () => {
      expect(h6Block.type).toBe(BlockType.H6);
    });

    test('has correct heading level', () => {
      expect(h6Block.level).toBe(6);
    });
  });
});
