import { H5Block } from '@/blocks/H5Block.js';
import { HeadingBlock } from '@/blocks/HeadingBlock.js';
import { BaseBlock } from '@/blocks/BaseBlock.js';
import { BlockType } from '@/BlockType.js';
import { Toolbar } from '@/Toolbar.js';

// Mock the Toolbar module
jest.mock('@/Toolbar.js', () => ({
  Toolbar: {
    h5: jest.fn()
  }
}));

describe('H5Block', () => {
  let h5Block;

  beforeEach(() => {
    h5Block = new H5Block();
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('creates instance with default parameters', () => {
      const block = new H5Block();
      expect(block).toBeInstanceOf(H5Block);
      expect(block).toBeInstanceOf(HeadingBlock);
      expect(block).toBeInstanceOf(BaseBlock);
      expect(block.type).toBe(BlockType.H5);
      expect(block.content).toBe('');
      expect(block.html).toBe('');
      expect(block.nested).toBe(false);
      expect(block.level).toBe(5);
    });

    test('creates instance with custom parameters', () => {
      const content = 'Fifth Level Heading';
      const html = '<h5>Fifth Level Heading</h5>';
      const nested = true;
      
      const block = new H5Block(content, html, nested);
      expect(block.type).toBe(BlockType.H5);
      expect(block.content).toBe(content);
      expect(block.html).toBe(html);
      expect(block.nested).toBe(nested);
      expect(block.level).toBe(5);
    });
  });

  describe('Static Methods', () => {
    test('getMarkdownTriggers returns correct triggers', () => {
      const triggers = H5Block.getMarkdownTriggers();
      expect(triggers).toHaveLength(1);
      expect(triggers).toContain('##### ');
    });

    test('getToolbarConfig returns correct configuration', () => {
      const config = H5Block.getToolbarConfig();
      expect(config).toEqual({
        class: 'bke-toolbar-header5',
        label: 'Heading 5',
        group: 'headers'
      });
    });
  });

  describe('applyTransformation', () => {
    test('calls Toolbar.h5 method', () => {
      h5Block.applyTransformation();
      expect(Toolbar.h5).toHaveBeenCalledTimes(1);
      expect(Toolbar.h5).toHaveBeenCalledWith();
    });
  });

  describe('Inheritance and Type', () => {
    test('inherits from HeadingBlock', () => {
      expect(h5Block).toBeInstanceOf(HeadingBlock);
    });

    test('has correct block type', () => {
      expect(h5Block.type).toBe(BlockType.H5);
    });

    test('has correct heading level', () => {
      expect(h5Block.level).toBe(5);
    });
  });
});
