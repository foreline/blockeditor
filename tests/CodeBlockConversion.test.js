import { Editor } from '@/Editor.js';
import { CodeBlock } from '@/blocks/CodeBlock.js';
import { BlockType } from '@/BlockType.js';
import { Utils } from '@/Utils.js';
import { BlockFactory } from '@/blocks/BlockFactory.js';

// Mock dependencies
jest.mock('@/utils/log.js');
jest.mock('@/Toolbar.js');

describe('CodeBlock Conversion', () => {
    let editor;
    let container;
    let paragraphBlock;

    beforeEach(() => {
        // Prepare container and a paragraph block
        document.body.innerHTML = '';
        container = document.createElement('div');
        container.id = 'code-trigger-editor';
        document.body.appendChild(container);
        
        // Make getElementById return our container
        document.getElementById = jest.fn().mockReturnValue(container);

        paragraphBlock = document.createElement('div');
        paragraphBlock.className = 'bke-block bke-block--p';
        paragraphBlock.setAttribute('data-block-type', 'paragraph');
        paragraphBlock.setAttribute('contenteditable', 'true');
        paragraphBlock.innerHTML = '```';
        container.appendChild(paragraphBlock);
        
        // Ensure block discovery works
        container.querySelectorAll = jest.fn((sel) => sel === '.bke-block' ? [paragraphBlock] : []);
        container.querySelector = jest.fn((sel) => sel === '.bke-block' ? paragraphBlock : null);

        // Mock Utils.stripTags
        jest.spyOn(Utils, 'stripTags').mockReturnValue('```');

        // Mock the trigger resolution to return CodeBlock class
        class CodeBlockMock {
            constructor() { this.type = 'code'; }
            static getMarkdownTriggers() { return ['```', '~~~']; }
            static matchesMarkdownTrigger() { return true; }
        }

        BlockFactory.findBlockClassForTrigger = jest.fn().mockReturnValue(CodeBlockMock);

        // Mock createBlock to perform DOM transform
        BlockFactory.createBlock = jest.fn((type) => {
            if (type === 'code') {
                return {
                    constructor: { getMarkdownTriggers: () => ['```', '~~~'] },
                    applyTransformation: jest.fn(() => {
                        const editorInstance = Editor.getInstanceFromElement(document.activeElement);
                        const current = editorInstance?.currentBlock;
                        if (!current) return;
                        current.setAttribute('data-block-type', 'code');
                        current.className = 'bke-block bke-block--code';
                        current.setAttribute('contenteditable', 'false');
                        const pre = document.createElement('pre');
                        const code = document.createElement('code');
                        code.textContent = '';
                        code.setAttribute('contenteditable', 'true');
                        pre.appendChild(code);
                        current.innerHTML = '';
                        current.appendChild(pre);
                    }),
                    createLanguageSelector: jest.fn(() => {
                        const selector = document.createElement('div');
                        selector.className = 'language-selector';
                        return selector;
                    })
                };
            }
            return { constructor: { getMarkdownTriggers: () => [] }, applyTransformation: jest.fn() };
        });

        // Initialize editor
        editor = new Editor({ id: 'code-trigger-editor', toolbar: false });
        editor.setCurrentBlock(paragraphBlock);
    });

    afterEach(() => {
        jest.restoreAllMocks();
        if (editor && typeof editor.destroy === 'function') {
            editor.destroy();
        }
        document.body.innerHTML = '';
    });

    describe('Markdown trigger conversion', () => {
        test('converts paragraph starting with "```" to code block', () => {
            const converted = editor.checkAndConvertBlock(paragraphBlock);
            expect(converted).toBe(true);

            // Assert the transformation to code block was applied
            expect(paragraphBlock.getAttribute('data-block-type')).toBe('code');
            expect(paragraphBlock.className).toBe('bke-block bke-block--code');
            expect(paragraphBlock.querySelector('pre')).toBeTruthy();
            expect(paragraphBlock.querySelector('code')).toBeTruthy();
        });

        test('converts paragraph starting with "~~~" to code block', () => {
            // Reset for tilde trigger
            jest.spyOn(Utils, 'stripTags').mockReturnValue('~~~');
            paragraphBlock.innerHTML = '~~~';

            const converted = editor.checkAndConvertBlock(paragraphBlock);
            expect(converted).toBe(true);

            expect(paragraphBlock.getAttribute('data-block-type')).toBe('code');
            expect(paragraphBlock.className).toBe('bke-block bke-block--code');
        });
    });

    describe('Toolbar button conversion', () => {
        test('convertCurrentBlockOrCreate("code") should convert paragraph to code block', () => {
            // Set some content
            paragraphBlock.textContent = 'test code';
            jest.spyOn(Utils, 'stripTags').mockReturnValue('test code');
            
            // Mock createBlock for toolbar call
            const codeBlockInstance = new CodeBlock();
            codeBlockInstance.applyTransformation = jest.fn(() => {
                const editorInstance = Editor.getInstanceFromElement(document.activeElement);
                const current = editorInstance?.currentBlock;
                if (!current) return;
                current.setAttribute('data-block-type', 'code');
                current.className = 'bke-block bke-block--code';
                current.setAttribute('contenteditable', 'false');
                const pre = document.createElement('pre');
                const code = document.createElement('code');
                code.textContent = 'test code';
                code.setAttribute('contenteditable', 'true');
                pre.appendChild(code);
                current.innerHTML = '';
                current.appendChild(pre);
            });
            codeBlockInstance.createLanguageSelector = jest.fn(() => {
                const selector = document.createElement('div');
                selector.className = 'language-selector';
                return selector;
            });
            
            BlockFactory.createBlock = jest.fn().mockReturnValue(codeBlockInstance);
            
            // Convert to code block
            const result = editor.convertCurrentBlockOrCreate('code');
            
            expect(result).toBe(true);
            expect(paragraphBlock.getAttribute('data-block-type')).toBe('code');
            expect(paragraphBlock.querySelector('pre')).toBeTruthy();
            expect(paragraphBlock.querySelector('code')).toBeTruthy();
        });
    });
});
