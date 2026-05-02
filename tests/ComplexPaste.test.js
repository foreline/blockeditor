'use strict';

import { Editor } from '../src/Editor.js';
import { EVENTS } from '../src/utils/eventEmitter.js';
import { Parser } from '../src/Parser.js';
import { BlockFactory } from '../src/blocks/BlockFactory.js';
import { BlockType } from '../src/BlockType.js';
import { Utils } from '../src/Utils.js';

// Mock dependencies
jest.mock('../src/utils/log.js');
jest.mock('../src/Toolbar.js');
jest.mock('../src/Parser.js');
jest.mock('../src/blocks/BlockFactory.js');
jest.mock('../src/Utils.js');

describe('Complex Paste Functionality', () => {
    let editor;
    let mockElement;

    beforeEach(() => {
        // Clear the instances registry
        Editor._instances.clear();

        // Mock DOM element
        mockElement = {
            id: 'test-editor',
            innerHTML: '',
            appendChild: jest.fn(),
            querySelector: jest.fn(),
            querySelectorAll: jest.fn().mockReturnValue([]),
            setAttribute: jest.fn(),
            addEventListener: jest.fn(),
            closest: jest.fn(),
            parentNode: {
                replaceChild: jest.fn()
            }
        };

        // Mock document methods
        document.getElementById = jest.fn().mockReturnValue(mockElement);
        document.createElement = jest.fn().mockReturnValue({
            classList: { 
                add: jest.fn(), 
                remove: jest.fn(),
                contains: jest.fn().mockReturnValue(false)
            },
            appendChild: jest.fn(),
            innerHTML: '',
            textContent: '',
            setAttribute: jest.fn(),
            getAttribute: jest.fn(),
            parentNode: {
                replaceChild: jest.fn()
            },
            after: jest.fn(),
            style: {}
        });

        // Mock Parser
        Parser.parse = jest.fn().mockReturnValue([]);
        Parser.html = jest.fn().mockReturnValue(mockElement);
        Parser.parseHtml = jest.fn().mockReturnValue([]);

        // Mock Utils
        Utils.escapeHTML = jest.fn(text => text);

        // Mock BlockFactory
        BlockFactory.createBlock = jest.fn().mockReturnValue({
            _type: 'p',
            _content: '',
            _html: '',
            _nested: false,
            renderToElement: jest.fn().mockReturnValue(document.createElement('div'))
        });

        // Mock Editor static methods
        Editor.md2html = jest.fn().mockReturnValue('<p>Test</p>');

        // Create editor instance
        editor = new Editor({ id: 'test-editor' });
        
        // Mock instance methods
        editor.setCurrentBlock = jest.fn();
        editor.focus = jest.fn();
        editor.update = jest.fn();
        editor.eventEmitter.emit = jest.fn();
        
        // Mock window.getSelection
        const mockSelection = {
            rangeCount: 1,
            getRangeAt: jest.fn().mockReturnValue({
                deleteContents: jest.fn(),
                insertNode: jest.fn(),
                collapse: jest.fn()
            }),
            removeAllRanges: jest.fn(),
            addRange: jest.fn()
        };
        
        Object.defineProperty(window, 'getSelection', {
            value: jest.fn().mockReturnValue(mockSelection),
            writable: true
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('insertMultipleBlocks', () => {
        it('should insert multiple blocks as separate elements', () => {
            // Create mock blocks
            const mockBlocks = [
                {
                    type: 'p',
                    content: 'First paragraph',
                    html: '<p>First paragraph</p>',
                    _blockInstance: {
                        renderToElement: jest.fn().mockReturnValue(document.createElement('div'))
                    }
                },
                {
                    type: 'h1',
                    content: 'Heading',
                    html: '<h1>Heading</h1>',
                    _blockInstance: {
                        renderToElement: jest.fn().mockReturnValue(document.createElement('div'))
                    }
                }
            ];

            // Mock current block
            const currentBlock = document.createElement('div');
            currentBlock.classList.add('bke-block');
            currentBlock.innerHTML = '<br>';
            editor.currentBlock = currentBlock;

            // Mock isBlockEmpty to return true for empty block
            editor.isBlockEmpty = jest.fn().mockReturnValue(true);

            // Call insertMultipleBlocks
            editor.insertMultipleBlocks(mockBlocks);

            // Verify blocks were processed
            expect(mockBlocks[0]._blockInstance.renderToElement).toHaveBeenCalled();
            expect(editor.eventEmitter.emit).toHaveBeenCalledWith(
                EVENTS.BLOCK_CREATED,
                expect.objectContaining({
                    blockType: 'p'
                }),
                { source: 'paste.create' }
            );
        });

        it('should handle empty current block replacement', () => {
            const mockBlock = {
                type: 'p',
                content: 'New content',
                html: '<p>New content</p>',
                _blockInstance: {
                    renderToElement: jest.fn().mockReturnValue(document.createElement('div'))
                }
            };

            const currentBlock = document.createElement('div');
            currentBlock.classList.add('bke-block');
            editor.currentBlock = currentBlock;

            editor.isBlockEmpty = jest.fn().mockReturnValue(true);

            editor.insertMultipleBlocks([mockBlock]);

            expect(editor.isBlockEmpty).toHaveBeenCalledWith(currentBlock);
            expect(mockBlock._blockInstance.renderToElement).toHaveBeenCalled();
        });
    });

    describe('insertMultipleLinesAsBlocks', () => {
        it('should create separate paragraph blocks for multiple lines', () => {
            const lines = ['First line', 'Second line', 'Third line'];
            
            const currentBlock = document.createElement('div');
            currentBlock.classList.add('bke-block');
            currentBlock.innerHTML = '<br>';
            editor.currentBlock = currentBlock;

            editor.isBlockEmpty = jest.fn().mockReturnValue(true);
            editor.createParagraphBlock = jest.fn().mockReturnValue(document.createElement('div'));

            // Mock Editor.md2html
            Editor.md2html = jest.fn()
                .mockReturnValueOnce('<p>First line</p>')
                .mockReturnValueOnce('<p>Second line</p>')
                .mockReturnValueOnce('<p>Third line</p>');

            editor.insertMultipleLinesAsBlocks(lines);

            // Should create paragraph blocks for each line
            expect(editor.createParagraphBlock).toHaveBeenCalledTimes(3);
            expect(editor.createParagraphBlock).toHaveBeenCalledWith('<p>First line</p>');
            expect(editor.createParagraphBlock).toHaveBeenCalledWith('<p>Second line</p>');
            expect(editor.createParagraphBlock).toHaveBeenCalledWith('<p>Third line</p>');
        });
    });

    describe('isBlockEmpty', () => {
        it('should return true for empty blocks', () => {
            const emptyBlock1 = document.createElement('div');
            emptyBlock1.innerHTML = '';
            expect(editor.isBlockEmpty(emptyBlock1)).toBe(true);

            const emptyBlock2 = document.createElement('div');
            emptyBlock2.innerHTML = '<br>';
            expect(editor.isBlockEmpty(emptyBlock2)).toBe(true);

            const emptyBlock3 = document.createElement('div');
            emptyBlock3.innerHTML = '   ';
            expect(editor.isBlockEmpty(emptyBlock3)).toBe(true);
        });

        it('should return false for non-empty blocks', () => {
            const nonEmptyBlock = {
                textContent: 'Some content',
                innerHTML: '<p>Some content</p>'
            };
            expect(editor.isBlockEmpty(nonEmptyBlock)).toBe(false);

            const textBlock = {
                textContent: 'Text content',
                innerHTML: 'Text content'
            };
            expect(editor.isBlockEmpty(textBlock)).toBe(false);
        });

        it('should handle null blocks', () => {
            expect(editor.isBlockEmpty(null)).toBe(true);
            expect(editor.isBlockEmpty(undefined)).toBe(true);
        });
    });

    describe('createBlockElement', () => {
        it('should create block element from parsed block', () => {
            const mockBlock = {
                type: 'p',
                content: 'Test content',
                html: '<p>Test content</p>',
                nested: false
            };

            const mockBlockInstance = {
                renderToElement: jest.fn().mockReturnValue(document.createElement('div'))
            };

            BlockFactory.createBlock.mockReturnValue(mockBlockInstance);

            const result = editor.createBlockElement(mockBlock);

            expect(BlockFactory.createBlock).toHaveBeenCalledWith('p', 'Test content', '<p>Test content</p>', false);
            expect(mockBlockInstance.renderToElement).toHaveBeenCalled();
            expect(result).toBeTruthy();
        });

        it('should handle block creation errors gracefully', () => {
            const mockBlock = {
                type: 'invalid',
                content: 'Test',
                html: '<p>Test</p>',
                nested: false
            };

            BlockFactory.createBlock.mockReturnValue(null);

            const result = editor.createBlockElement(mockBlock);

            expect(result).toBeNull();
        });
    });

    describe('createParagraphBlock', () => {
        it('should create paragraph block with HTML content', () => {
            const html = '<p>Test paragraph</p>';
            
            const mockBlockInstance = {
                renderToElement: jest.fn().mockReturnValue(document.createElement('div'))
            };

            BlockFactory.createBlock.mockReturnValue(mockBlockInstance);

            const result = editor.createParagraphBlock(html);

            expect(BlockFactory.createBlock).toHaveBeenCalledWith(BlockType.PARAGRAPH, '', html);
            expect(mockBlockInstance.renderToElement).toHaveBeenCalled();
            expect(result).toBeTruthy();
        });
    });

    describe('paste with complex content', () => {
        let mockClipboardEvent;

        beforeEach(() => {
            mockClipboardEvent = {
                preventDefault: jest.fn(),
                clipboardData: {
                    getData: jest.fn()
                }
            };
        });

        it('should handle multiple HTML blocks as separate blocks', () => {
            // Mock complex HTML content
            const complexHtml = `
                <p>First paragraph</p>
                <h1>Main heading</h1>
                <ul>
                    <li>List item 1</li>
                    <li>List item 2</li>
                </ul>
                <p>Another paragraph</p>
            `;

            mockClipboardEvent.clipboardData.getData
                .mockReturnValueOnce(complexHtml) // text/html
                .mockReturnValueOnce('Plain text version'); // text/plain

            // Mock Parser.parseHtml to return multiple blocks
            const mockBlocks = [
                { type: 'p', content: 'First paragraph', html: '<p>First paragraph</p>' },
                { type: 'h1', content: 'Main heading', html: '<h1>Main heading</h1>' },
                { type: 'ul', content: 'List items', html: '<ul><li>List item 1</li><li>List item 2</li></ul>' },
                { type: 'p', content: 'Another paragraph', html: '<p>Another paragraph</p>' }
            ];

            Parser.parseHtml.mockReturnValue(mockBlocks);
            editor.insertMultipleBlocks = jest.fn();

            editor.paste(mockClipboardEvent);

            expect(editor.insertMultipleBlocks).toHaveBeenCalledWith(mockBlocks);
            expect(editor.eventEmitter.emit).toHaveBeenCalledWith(
                EVENTS.USER_PASTE,
                expect.objectContaining({
                    blocksCount: 4
                }),
                { source: 'user.paste' }
            );
        });

        it('should handle multiple text lines as separate blocks', () => {
            const multiLineText = `First line of text
Second line of text
Third line of text`;

            // Make sure getData returns the right values in the right order
            // paste() calls getData('text') first, then getData('text/html')
            mockClipboardEvent.clipboardData.getData = jest.fn()
                .mockReturnValueOnce(multiLineText)  // First call: text
                .mockReturnValueOnce('');  // Second call: text/html (empty)

            editor.insertMultipleLinesAsBlocks = jest.fn();

            editor.paste(mockClipboardEvent);

            // Check that getData was called properly
            expect(mockClipboardEvent.clipboardData.getData).toHaveBeenCalledTimes(2);
            expect(mockClipboardEvent.clipboardData.getData).toHaveBeenNthCalledWith(1, 'text');
            expect(mockClipboardEvent.clipboardData.getData).toHaveBeenNthCalledWith(2, 'text/html');

            // Should be called with the split lines
            expect(editor.insertMultipleLinesAsBlocks).toHaveBeenCalledWith([
                'First line of text',
                'Second line of text', 
                'Third line of text'
            ]);
        });

        it('should handle single block content inline', () => {
            const singleBlockHtml = '<p>Single paragraph</p>';

            mockClipboardEvent.clipboardData.getData
                .mockReturnValueOnce(singleBlockHtml)
                .mockReturnValueOnce('Single paragraph');

            // Mock Parser.parseHtml to return single block
            const mockBlock = { type: 'p', content: 'Single paragraph', html: '<p>Single paragraph</p>' };
            Parser.parseHtml.mockReturnValue([mockBlock]);
            editor.insertInlineContent = jest.fn();

            editor.paste(mockClipboardEvent);

            expect(editor.insertInlineContent).toHaveBeenCalledWith(
                '<p>Single paragraph</p>',
                expect.any(Object)
            );
        });
    });
});
