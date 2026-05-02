import { ImageBlock } from '@/blocks/ImageBlock.js';
import { BaseBlock } from '@/blocks/BaseBlock.js';
import { BlockType } from '@/BlockType.js';
import { Toolbar } from '@/Toolbar.js';
import { Editor } from '@/Editor.js';

// Mock dependencies
jest.mock('@/Toolbar.js', () => ({
  Toolbar: {
    image: jest.fn()
  }
}));

jest.mock('@/Editor.js', () => {
  const mockEditorInstance = {
    addDefaultBlock: jest.fn(),
    update: jest.fn(),
    setCurrentBlock: jest.fn(),
    currentBlock: null
  };
  return {
    Editor: {
      getInstanceFromElement: jest.fn().mockReturnValue(mockEditorInstance),
      _mockInstance: mockEditorInstance
    }
  };
});

describe('ImageBlock', () => {
  let imageBlock;

  beforeEach(() => {
    imageBlock = new ImageBlock();
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('creates instance with default parameters', () => {
      const block = new ImageBlock();
      expect(block).toBeInstanceOf(ImageBlock);
      expect(block).toBeInstanceOf(BaseBlock);
      expect(block.type).toBe(BlockType.IMAGE);
      expect(block.content).toBe('');
      expect(block.html).toBe('');
      expect(block.nested).toBe(false);
      expect(block._src).toBe('');
      expect(block._alt).toBe('');
      expect(block._width).toBeNull();
      expect(block._height).toBeNull();
    });

    test('creates instance with custom parameters', () => {
      const content = '![Test Image](https://example.com/image.jpg)';
      const html = '<img src="https://example.com/image.jpg" alt="Test Image">';
      const nested = true;
      
      const block = new ImageBlock(content, html, nested);
      expect(block.type).toBe(BlockType.IMAGE);
      expect(block.content).toBe(content);
      expect(block.html).toBe(html);
      expect(block.nested).toBe(nested);
      expect(block._src).toBe('https://example.com/image.jpg');
      expect(block._alt).toBe('Test Image');
    });

    test('parses content on construction', () => {
      const content = '![Alt Text](https://example.com/test.png)';
      const block = new ImageBlock(content);
      
      expect(block._src).toBe('https://example.com/test.png');
      expect(block._alt).toBe('Alt Text');
    });
  });

  describe('parseImageContent', () => {
    test('parses markdown image syntax correctly', () => {
      imageBlock.parseImageContent('![My Image](https://example.com/image.jpg)');
      
      expect(imageBlock._src).toBe('https://example.com/image.jpg');
      expect(imageBlock._alt).toBe('My Image');
    });

    test('parses markdown with empty alt text', () => {
      imageBlock.parseImageContent('![](https://example.com/image.jpg)');
      
      expect(imageBlock._src).toBe('https://example.com/image.jpg');
      expect(imageBlock._alt).toBe('');
    });

    test('parses direct HTTP URL', () => {
      imageBlock.parseImageContent('https://example.com/image.jpg');
      
      expect(imageBlock._src).toBe('https://example.com/image.jpg');
      expect(imageBlock._alt).toBe('Image');
    });

    test('parses data URL', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      imageBlock.parseImageContent(dataUrl);
      
      expect(imageBlock._src).toBe(dataUrl);
      expect(imageBlock._alt).toBe('Image');
    });

    test('parses relative path', () => {
      imageBlock.parseImageContent('./images/test.jpg');
      
      expect(imageBlock._src).toBe('./images/test.jpg');
      expect(imageBlock._alt).toBe('Image');
    });

    test('parses parent directory path', () => {
      imageBlock.parseImageContent('../assets/image.png');
      
      expect(imageBlock._src).toBe('../assets/image.png');
      expect(imageBlock._alt).toBe('Image');
    });

    test('handles invalid content gracefully', () => {
      imageBlock.parseImageContent('not an image');
      
      expect(imageBlock._src).toBe('');
      expect(imageBlock._alt).toBe('');
    });
  });

  describe('Key Handling', () => {
    test('handleKeyPress returns false for Delete key', () => {
      const event = { key: 'Delete' };
      const result = imageBlock.handleKeyPress(event, '');
      expect(result).toBe(false);
    });

    test('handleKeyPress returns false for Backspace key', () => {
      const event = { key: 'Backspace' };
      const result = imageBlock.handleKeyPress(event, '');
      expect(result).toBe(false);
    });

    test('handleKeyPress returns false for other keys', () => {
      const scenarios = [
        'Enter', 'Tab', 'a', 'Space', 'ArrowUp', 'ArrowDown'
      ];

      scenarios.forEach(key => {
        const event = { key };
        const result = imageBlock.handleKeyPress(event, '');
        expect(result).toBe(false);
      });
    });

    test('handleEnterKey prevents default and adds empty block', () => {
      const event = {
        preventDefault: jest.fn()
      };
      
      const result = imageBlock.handleEnterKey(event);
      
      expect(event.preventDefault).toHaveBeenCalled();
      expect(Editor._mockInstance.addDefaultBlock).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('Drag and Drop Setup', () => {
    test('setupDragAndDrop adds event listeners', () => {
      const mockElement = {
        addEventListener: jest.fn(),
        classList: {
          add: jest.fn(),
          remove: jest.fn()
        }
      };
      
      imageBlock.setupDragAndDrop(mockElement);
      
      expect(mockElement.addEventListener).toHaveBeenCalledWith('dragover', expect.any(Function));
      expect(mockElement.addEventListener).toHaveBeenCalledWith('dragleave', expect.any(Function));
      expect(mockElement.addEventListener).toHaveBeenCalledWith('drop', expect.any(Function));
    });

    test('dragover event adds drag-over class', () => {
      const mockElement = {
        addEventListener: jest.fn(),
        classList: {
          add: jest.fn(),
          remove: jest.fn()
        }
      };
      
      imageBlock.setupDragAndDrop(mockElement);
      
      // Get the dragover event handler
      const dragoverHandler = mockElement.addEventListener.mock.calls
        .find(call => call[0] === 'dragover')[1];
      
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };
      
      dragoverHandler(mockEvent);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(mockElement.classList.add).toHaveBeenCalledWith('bke-drag-over');
    });
  });

  describe('Properties', () => {
    test('src getter and setter work correctly', () => {
      expect(imageBlock.src).toBe('');
      
      imageBlock.src = 'https://example.com/image.jpg';
      expect(imageBlock.src).toBe('https://example.com/image.jpg');
      expect(imageBlock._src).toBe('https://example.com/image.jpg');
    });

    test('alt getter and setter work correctly', () => {
      expect(imageBlock.alt).toBe('');
      
      imageBlock.alt = 'Test Alt Text';
      expect(imageBlock.alt).toBe('Test Alt Text');
      expect(imageBlock._alt).toBe('Test Alt Text');
    });

    test('width getter and setter work correctly', () => {
      expect(imageBlock.width).toBeNull();
      
      imageBlock.width = 300;
      expect(imageBlock.width).toBe(300);
      expect(imageBlock._width).toBe(300);
    });

    test('height getter and setter work correctly', () => {
      expect(imageBlock.height).toBeNull();
      
      imageBlock.height = 200;
      expect(imageBlock.height).toBe(200);
      expect(imageBlock._height).toBe(200);
    });
  });

  describe('Inheritance and Type', () => {
    test('inherits from BaseBlock', () => {
      expect(imageBlock).toBeInstanceOf(BaseBlock);
    });

    test('has correct block type', () => {
      expect(imageBlock.type).toBe(BlockType.IMAGE);
    });

    test('maintains type when content changes', () => {
      imageBlock.content = '![New Image](https://example.com/new.jpg)';
      expect(imageBlock.type).toBe(BlockType.IMAGE);
    });
  });

  describe('Content and HTML handling', () => {
    test('can set and get content', () => {
      const content = '![Beautiful Sunset](https://example.com/sunset.jpg)';
      imageBlock.content = content;
      expect(imageBlock.content).toBe(content);
    });

    test('can set and get HTML', () => {
      const html = '<img src="https://example.com/sunset.jpg" alt="Beautiful Sunset" width="400">';
      imageBlock.html = html;
      expect(imageBlock.html).toBe(html);
    });

    test('can set and get nested status', () => {
      expect(imageBlock.nested).toBe(false);
      imageBlock.nested = true;
      expect(imageBlock.nested).toBe(true);
    });
  });
});
