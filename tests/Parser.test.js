import { Parser } from '@/Parser.js';
import { Block } from '@/Block.js';
import { BlockType } from '@/BlockType.js';
import { ParagraphBlock } from '@/blocks/ParagraphBlock.js';
import { H1Block } from '@/blocks/H1Block.js';
import { HeadingBlock } from '@/blocks/HeadingBlock.js';
import { TaskListBlock } from '@/blocks/TaskListBlock.js';

// Mock DOM for testing
beforeAll(() => {
  const mockElement = {
    classList: {
      add: jest.fn()
    },
    setAttribute: jest.fn(),
    appendChild: jest.fn(),
    innerHTML: '',
    style: {}
  };
  
  global.document.createElement = jest.fn(() => mockElement);
});

describe('Parser - Block-based parsing', () => {
  describe('Block parsing delegation', () => {
    test('should delegate HTML parsing to block types', () => {
      jest.spyOn(console, 'log').mockImplementation(() => {});
      
      // Test heading parsing
      const headingHtml = '<h1>Test Heading</h1>';
      const result = Parser.parseHtml(headingHtml);
      
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(BlockType.H1);
      expect(result[0].content).toBe('Test Heading');
      
      console.log.mockRestore();
    });

    test('should parse task list items using TaskListBlock', () => {
      jest.spyOn(console, 'log').mockImplementation(() => {});
      
      // Use proper task list HTML structure that matches implementation
      const taskHtml = '<div data-block-type="sq" class="task-item"><input type="checkbox" checked> Complete task</div>';
      const result = Parser.parseHtml(taskHtml);
      
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(BlockType.SQ);
      expect(result[0].content).toBe('Complete task');
      expect(result[0]._checked).toBe(true);
      
      console.log.mockRestore();
    });

    test('should parse paragraphs using ParagraphBlock', () => {
      jest.spyOn(console, 'log').mockImplementation(() => {});
      
      const paragraphHtml = '<p>This is a paragraph</p>';
      const result = Parser.parseHtml(paragraphHtml);
      
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(BlockType.PARAGRAPH);
      expect(result[0].content).toBe('This is a paragraph');
      
      console.log.mockRestore();
    });
  });

  describe('Markdown parsing delegation', () => {
    test('should delegate markdown parsing to block types', () => {
      jest.spyOn(console, 'log').mockImplementation(() => {});
      
      const markdown = '# Heading 1\n\nThis is a paragraph\n\n- [x] Completed task';
      const result = Parser.parse(markdown);
      
      expect(result.length).toBeGreaterThan(0);
      // Should have at least heading and paragraph blocks
      
      console.log.mockRestore();
    });
  });

  describe('Block rendering delegation', () => {
    test('should delegate rendering to block instances', () => {
      jest.spyOn(console, 'log').mockImplementation(() => {});
      
      const blockInstance = new H1Block('Test', '<h1>Test</h1>');
      const block = new Block(BlockType.H1, 'Test', '<h1>Test</h1>', null, false, blockInstance);
      
      const element = Parser.html(block);
      
      expect(document.createElement).toHaveBeenCalledWith('div');
      expect(element.classList.add).toHaveBeenCalledWith('bke-block');
      expect(element.classList.add).toHaveBeenCalledWith('bke-block--h1');
      
      console.log.mockRestore();
    });
  });

  describe('Block type detection', () => {
    test('HeadingBlock should detect HTML headings', () => {
      expect(H1Block.canParseHtml('<h1>Test</h1>')).toBe(true);
      expect(H1Block.canParseHtml('<h2>Test</h2>')).toBe(true);
      expect(H1Block.canParseHtml('<p>Test</p>')).toBe(false);
    });

    test('TaskListBlock should detect task list HTML', () => {
      expect(TaskListBlock.canParseHtml('<li data-block-type="sq">Test</li>')).toBe(true);
      expect(TaskListBlock.canParseHtml('<li><input type="checkbox"> Test</li>')).toBe(true);
      expect(TaskListBlock.canParseHtml('<p>Test</p>')).toBe(false);
    });

    test('ParagraphBlock should detect paragraphs and fallback cases', () => {
      expect(ParagraphBlock.canParseHtml('<p>Test</p>')).toBe(true);
      expect(ParagraphBlock.canParseHtml('<h1>Test</h1>')).toBe(false);
    });
  });

  describe('Block creation from parsing', () => {
    test('should create correct block instances from HTML', () => {
      const headingBlock = H1Block.parseFromHtml('<h1>Test Heading</h1>');
      expect(headingBlock).toBeInstanceOf(HeadingBlock); // HeadingBlock is the base class
      expect(headingBlock.level).toBe(1);
      expect(headingBlock.content).toBe('Test Heading');

      const taskBlock = TaskListBlock.parseFromHtml('<li data-block-type="sq"><input type="checkbox" checked> Test Task</li>');
      expect(taskBlock).toBeInstanceOf(TaskListBlock);
      expect(taskBlock.content).toBe('Test Task');
      expect(taskBlock.isChecked()).toBe(true);
    });

    test('should create correct block instances from markdown', () => {
      const headingBlock = H1Block.parseFromMarkdown('# Test Heading');
      expect(headingBlock).toBeInstanceOf(HeadingBlock); // HeadingBlock is the base class
      expect(headingBlock.level).toBe(1);
      expect(headingBlock.content).toBe('Test Heading');

      const taskBlock = TaskListBlock.parseFromMarkdown('- [x] Test Task');
      expect(taskBlock).toBeInstanceOf(TaskListBlock);
      expect(taskBlock.content).toBe('Test Task');
      expect(taskBlock.isChecked()).toBe(true);
    });
  });

  describe('Mixed block parsing', () => {
    test('should parse markdown with code blocks mixed with other blocks', () => {
      jest.spyOn(console, 'log').mockImplementation(() => {});
      
      const markdown = `# Heading 1

This is a paragraph before the code block.

\`\`\`javascript
function hello() {
  console.log('Hello World');
}
\`\`\`

This is a paragraph after the code block.

## Heading 2

Another paragraph with some **bold** text.

\`\`\`python
def greet():
    print("Hello")
\`\`\`

Final paragraph.`;

      const result = Parser.parse(markdown);
      
      expect(result.length).toBeGreaterThan(5);
      
      // Check that we have the expected block types in order
      const blockTypes = result.map(block => block.constructor.name);
      expect(blockTypes).toContain('HeadingBlock');
      expect(blockTypes).toContain('ParagraphBlock');
      expect(blockTypes).toContain('CodeBlock');
      
      // Verify code blocks were parsed correctly
      const codeBlocks = result.filter(block => block.constructor.name === 'CodeBlock');
      expect(codeBlocks.length).toBe(2);
      
      if (codeBlocks.length >= 2) {
        expect(codeBlocks[0].content).toContain('function hello()');
        expect(codeBlocks[0]._language).toBe('javascript');
        expect(codeBlocks[1].content).toContain('def greet()');
        expect(codeBlocks[1]._language).toBe('python');
      }
      
      console.log.mockRestore();
    });

    test('should parse HTML with code blocks mixed with other blocks', () => {
      jest.spyOn(console, 'log').mockImplementation(() => {});
      
      const html = `<h1>Test Heading</h1>
<p>This is a paragraph.</p>
<pre><code class="javascript language-javascript">console.log('test');</code></pre>
<p>Another paragraph.</p>
<pre><code class="python language-python">print("hello")</code></pre>
<h2>Another Heading</h2>`;

      const result = Parser.parseHtml(html);
      
      expect(result.length).toBeGreaterThan(4);
      
      const blockTypes = result.map(block => block.constructor.name);
      expect(blockTypes).toContain('HeadingBlock');
      expect(blockTypes).toContain('ParagraphBlock');
      expect(blockTypes).toContain('CodeBlock');
      
      // Verify code blocks
      const codeBlocks = result.filter(block => block.constructor.name === 'CodeBlock');
      expect(codeBlocks.length).toBe(2);
      
      if (codeBlocks.length >= 2) {
        expect(codeBlocks[0].content).toBe('console.log(\'test\');');
        expect(codeBlocks[1].content).toBe('print("hello")');
      }
      
      console.log.mockRestore();
    });

    test('should handle complex mixed content with nested structures', () => {
      jest.spyOn(console, 'log').mockImplementation(() => {});
      
      const markdown = `# Main Title

Some introductory text here.

- First list item
- Second list item with \`inline code\`

\`\`\`bash
npm install package
cd directory
\`\`\`

> This is a blockquote
> with multiple lines

- [ ] Todo item 1
- [x] Completed item

| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |

\`\`\`json
{
  "key": "value",
  "array": [1, 2, 3]
}
\`\`\`

Final thoughts and conclusion.`;

      const result = Parser.parse(markdown);
      
      expect(result.length).toBeGreaterThan(6);
      
      const blockTypes = result.map(block => block.constructor.name);
      expect(blockTypes).toContain('HeadingBlock');
      expect(blockTypes).toContain('ParagraphBlock');
      expect(blockTypes).toContain('CodeBlock');
      
      // Should have multiple code blocks
      const codeBlocks = result.filter(block => block.constructor.name === 'CodeBlock');
      expect(codeBlocks.length).toBe(2);
      
      if (codeBlocks.length >= 2) {
        expect(codeBlocks[0]._language).toBe('bash');
        expect(codeBlocks[0].content).toContain('npm install');
        expect(codeBlocks[1]._language).toBe('json');
        expect(codeBlocks[1].content).toContain('"key": "value"');
      }
      
      console.log.mockRestore();
    });

    test('should preserve block boundaries when parsing mixed content', () => {
      jest.spyOn(console, 'log').mockImplementation(() => {});
      
      const markdown = `Text before

\`\`\`
code block content
\`\`\`
Text between
\`\`\`
another code block
\`\`\`

Text after`;

      const result = Parser.parse(markdown);
      
      expect(result.length).toBeGreaterThan(3);
      
      // Should have separate blocks, not merged content
      const codeBlocks = result.filter(block => block.constructor.name === 'CodeBlock');
      expect(codeBlocks.length).toBe(2);
      
      if (codeBlocks.length >= 2) {
        expect(codeBlocks[0].content.trim()).toBe('code block content');
        expect(codeBlocks[1].content.trim()).toBe('another code block');
        
        // Code blocks should not contain content from other blocks
        expect(codeBlocks[0].content).not.toContain('Text between');
        expect(codeBlocks[1].content).not.toContain('Text between');
      }
      
      console.log.mockRestore();
    });

    test('should handle edge cases in mixed content parsing', () => {
      jest.spyOn(console, 'log').mockImplementation(() => {});
      
      const markdown = `# Title
\`\`\`
code immediately after heading
\`\`\`
\`\`\`javascript
// Another code block
console.log('test');
\`\`\`
## Another heading immediately after code`;

      const result = Parser.parse(markdown);
      
      expect(result.length).toBeGreaterThan(3);
      
      const blockTypes = result.map(block => block.constructor.name);
      expect(blockTypes).toContain('HeadingBlock');
      expect(blockTypes).toContain('CodeBlock');
      
      const codeBlocks = result.filter(block => block.constructor.name === 'CodeBlock');
      expect(codeBlocks.length).toBe(2);
      
      console.log.mockRestore();
    });
  });
});
