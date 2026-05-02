import { H1Block } from '@/blocks/H1Block.js';
import { HeadingBlock } from '@/blocks/HeadingBlock.js';
import { BaseBlock } from '@/blocks/BaseBlock.js';
import { BlockType } from '@/BlockType.js';
import { Toolbar } from '@/Toolbar.js';

// Mock the Toolbar module
jest.mock('@/Toolbar.js', () => ({
  Toolbar: {
    h1: jest.fn()
  }
}));

describe('H1Block', () => {
  let h1Block;

  beforeEach(() => {
    h1Block = new H1Block();
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('creates instance with default parameters', () => {
      const block = new H1Block();
      expect(block).toBeInstanceOf(H1Block);
      expect(block).toBeInstanceOf(HeadingBlock);
      expect(block).toBeInstanceOf(BaseBlock);
      expect(block.type).toBe(BlockType.H1);
      expect(block.content).toBe('');
      expect(block.html).toBe('');
      expect(block.nested).toBe(false);
      expect(block.level).toBe(1);
    });

    test('creates instance with custom parameters', () => {
      const content = 'Main Heading';
      const html = '<h1>Main Heading</h1>';
      const nested = true;
      
      const block = new H1Block(content, html, nested);
      expect(block.type).toBe(BlockType.H1);
      expect(block.content).toBe(content);
      expect(block.html).toBe(html);
      expect(block.nested).toBe(nested);
      expect(block.level).toBe(1);
    });
  });

  describe('Static Methods', () => {
    test('getMarkdownTriggers returns correct triggers', () => {
      const triggers = H1Block.getMarkdownTriggers();
      expect(triggers).toHaveLength(1);
      expect(triggers).toContain('# ');
    });

    test('getToolbarConfig returns correct configuration', () => {
      const config = H1Block.getToolbarConfig();
      expect(config).toEqual({
        class: 'bke-toolbar-header1',
        label: 'Heading 1',
        group: 'headers'
      });
    });

    test('triggers are static and immutable', () => {
      const triggers1 = H1Block.getMarkdownTriggers();
      const triggers2 = H1Block.getMarkdownTriggers();
      
      expect(triggers1).toEqual(triggers2);
      expect(triggers1).not.toBe(triggers2); // Different array instances
    });
  });

  describe('applyTransformation', () => {
    test('calls Toolbar.h1 method', () => {
      h1Block.applyTransformation();
      expect(Toolbar.h1).toHaveBeenCalledTimes(1);
      expect(Toolbar.h1).toHaveBeenCalledWith();
    });

    test('can be called multiple times', () => {
      h1Block.applyTransformation();
      h1Block.applyTransformation();
      h1Block.applyTransformation();
      
      expect(Toolbar.h1).toHaveBeenCalledTimes(3);
    });
  });

  describe('Inheritance and Type', () => {
    test('inherits from HeadingBlock', () => {
      expect(h1Block).toBeInstanceOf(HeadingBlock);
    });

    test('inherits from BaseBlock', () => {
      expect(h1Block).toBeInstanceOf(BaseBlock);
    });

    test('has correct block type', () => {
      expect(h1Block.type).toBe(BlockType.H1);
    });

    test('maintains type when content changes', () => {
      h1Block.content = 'New heading content';
      expect(h1Block.type).toBe(BlockType.H1);
    });
  });

  describe('Content and HTML handling', () => {
    test('can set and get content', () => {
      const heading = 'Important Heading';
      h1Block.content = heading;
      expect(h1Block.content).toBe(heading);
    });

    test('can set and get HTML', () => {
      const html = '<h1>Important Heading</h1>';
      h1Block.html = html;
      expect(h1Block.html).toBe(html);
    });

    test('can set and get nested status', () => {
      expect(h1Block.nested).toBe(false);
      h1Block.nested = true;
      expect(h1Block.nested).toBe(true);
    });
  });

  describe('Level property', () => {
    test('has correct heading level', () => {
      expect(h1Block.level).toBe(1);
    });

    test('level remains constant', () => {
      h1Block.content = 'Different content';
      expect(h1Block.level).toBe(1);
    });
  });
});
