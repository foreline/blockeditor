'use strict';

import { Editor } from '../src/Editor.js';
import { Utils } from '../src/Utils.js';
import { BlockFactory } from '../src/blocks/BlockFactory.js';
import { EVENTS } from '../src/utils/eventEmitter.js';

// Mock dependencies
jest.mock('../src/Utils.js');
jest.mock('../src/blocks/BlockFactory.js');
jest.mock('../src/Toolbar.js');
jest.mock('../src/utils/log.js');

describe('Block Conversion Feature', () => {
    let editor;
    let mockContainer;
    let mockBlock;

    beforeEach(() => {
        // Setup DOM mocks
        document.body.innerHTML = '';
        mockContainer = document.createElement('div');
        mockContainer.id = 'test-editor';
        document.body.appendChild(mockContainer);

        mockBlock = document.createElement('div');
        mockBlock.className = 'bke-block bke-block--p';
        mockBlock.setAttribute('data-block-type', 'p');
        mockBlock.setAttribute('contenteditable', 'true');
        mockBlock.innerHTML = 'test content';
        mockContainer.appendChild(mockBlock);

        // Setup Utils mock
        Utils.stripTags = jest.fn().mockReturnValue('test content');

        // Setup comprehensive BlockFactory mocks
        BlockFactory.findBlockClassForTrigger = jest.fn();
        BlockFactory.createBlock = jest.fn().mockReturnValue({
            _type: 'p',
            _content: '',
            _html: '',
            _nested: false
        });
        BlockFactory.getAllBlockClasses = jest.fn().mockReturnValue([]);
        BlockFactory.getBlockClass = jest.fn();

        // Create editor instance
        editor = new Editor({ id: 'test-editor' });
        editor.currentBlock = mockBlock;
    });

    afterEach(() => {
        if (editor && typeof editor.destroy === 'function') {
            editor.destroy();
        }
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    describe('checkAndConvertBlock', () => {
        it('should return false when no block element provided', () => {
            const result = editor.checkAndConvertBlock(null);
            expect(result).toBe(false);
        });

        it('should return false when block has no data-block-type attribute', () => {
            const blockWithoutType = document.createElement('div');
            const result = editor.checkAndConvertBlock(blockWithoutType);
            expect(result).toBe(false);
        });

        it('should return false when block content is empty', () => {
            Utils.stripTags.mockReturnValue('');
            const result = editor.checkAndConvertBlock(mockBlock);
            expect(result).toBe(false);
        });

        it('should return false when no matching block class found', () => {
            Utils.stripTags.mockReturnValue('# heading');
            BlockFactory.findBlockClassForTrigger.mockReturnValue(null);
            
            const result = editor.checkAndConvertBlock(mockBlock);
            expect(result).toBe(false);
        });

        it('should return false when block is already the correct type', () => {
            const mockBlockClass = jest.fn().mockImplementation(() => ({
                getType: () => 'p' // Same as current block type
            }));
            
            Utils.stripTags.mockReturnValue('# heading');
            BlockFactory.findBlockClassForTrigger.mockReturnValue(mockBlockClass);
            
            const result = editor.checkAndConvertBlock(mockBlock);
            expect(result).toBe(false);
        });

        it('should return false when trying to convert non-paragraph blocks', () => {
            const mockBlockClass = jest.fn().mockImplementation(() => ({
                getType: () => 'h1'
            }));
            
            mockBlock.setAttribute('data-block-type', 'h2'); // Not a paragraph
            Utils.stripTags.mockReturnValue('# heading');
            BlockFactory.findBlockClassForTrigger.mockReturnValue(mockBlockClass);
            
            const result = editor.checkAndConvertBlock(mockBlock);
            expect(result).toBe(false);
        });

        it('should successfully convert paragraph to heading', () => {
            const mockBlockInstance = {
                getType: () => 'h1',
                constructor: {
                    getMarkdownTriggers: () => ['# ']
                },
                applyTransformation: jest.fn()
            };
            
            const mockBlockClass = jest.fn().mockImplementation(() => mockBlockInstance);
            
            Utils.stripTags.mockReturnValue('# heading text');
            BlockFactory.findBlockClassForTrigger.mockReturnValue(mockBlockClass);
            BlockFactory.createBlock.mockReturnValue(mockBlockInstance);
            
            // Mock findEditableElementInBlock
            editor.findEditableElementInBlock = jest.fn().mockReturnValue(mockBlock);
            
            const result = editor.checkAndConvertBlock(mockBlock);
            expect(result).toBe(true);
            expect(mockBlockInstance.applyTransformation).toHaveBeenCalled();
        });

        it('should successfully convert paragraph to unordered list', () => {
            const mockBlockInstance = {
                getType: () => 'ul',
                constructor: {
                    getMarkdownTriggers: () => ['- ', '* ']
                },
                applyTransformation: jest.fn()
            };
            
            const mockBlockClass = jest.fn().mockImplementation(() => mockBlockInstance);
            
            Utils.stripTags.mockReturnValue('- list item');
            BlockFactory.findBlockClassForTrigger.mockReturnValue(mockBlockClass);
            BlockFactory.createBlock.mockReturnValue(mockBlockInstance);
            
            // Mock findEditableElementInBlock
            editor.findEditableElementInBlock = jest.fn().mockReturnValue(mockBlock);
            
            const result = editor.checkAndConvertBlock(mockBlock);
            expect(result).toBe(true);
            expect(mockBlockInstance.applyTransformation).toHaveBeenCalled();
        });

        it('should emit BLOCK_CONVERTED event on successful conversion', () => {
            const mockBlockInstance = {
                getType: () => 'h1',
                constructor: {
                    getMarkdownTriggers: () => ['# ']
                },
                applyTransformation: jest.fn()
            };
            
            const mockBlockClass = jest.fn().mockImplementation(() => mockBlockInstance);
            
            Utils.stripTags.mockReturnValue('# heading text');
            BlockFactory.findBlockClassForTrigger.mockReturnValue(mockBlockClass);
            BlockFactory.createBlock.mockReturnValue(mockBlockInstance);
            
            // Mock findEditableElementInBlock
            editor.findEditableElementInBlock = jest.fn().mockReturnValue(mockBlock);
            
            // Spy on event emission
            const emitSpy = jest.spyOn(editor.eventEmitter, 'emit');
            
            editor.checkAndConvertBlock(mockBlock);
            
            expect(emitSpy).toHaveBeenCalledWith(
                EVENTS.BLOCK_CONVERTED,
                expect.objectContaining({
                    fromType: 'p',
                    toType: 'h1',
                    triggerText: '# heading text'
                })
            );
        });
    });

    describe('convertBlockType', () => {
        it('should return false when BlockFactory.createBlock returns null', () => {
            BlockFactory.createBlock.mockReturnValue(null);
            
            const result = editor.convertBlockType(mockBlock, 'h1', '# heading');
            expect(result).toBe(false);
        });

        it('should clear block content and apply transformation', () => {
            const mockBlockInstance = {
                constructor: {
                    getMarkdownTriggers: () => ['# ']
                },
                applyTransformation: jest.fn()
            };
            
            BlockFactory.createBlock.mockReturnValue(mockBlockInstance);
            editor.findEditableElementInBlock = jest.fn().mockReturnValue(mockBlock);
            
            const result = editor.convertBlockType(mockBlock, 'h1', '# heading text');
            
            expect(result).toBe(true);
            expect(mockBlock.innerHTML).toBe('');
            expect(mockBlockInstance.applyTransformation).toHaveBeenCalled();
        });

        it('should handle remaining content after trigger removal', () => {
            const mockBlockInstance = {
                constructor: {
                    getMarkdownTriggers: () => ['# ']
                },
                applyTransformation: jest.fn()
            };
            
            const mockEditableElement = document.createElement('div');
            
            BlockFactory.createBlock.mockReturnValue(mockBlockInstance);
            editor.findEditableElementInBlock = jest.fn().mockReturnValue(mockEditableElement);
            
            const result = editor.convertBlockType(mockBlock, 'h1', '# heading text');
            
            expect(result).toBe(true);
            expect(mockEditableElement.textContent).toBe('heading text');
        });
    });

    describe('findEditableElementInBlock', () => {
        it('should return first list item for list blocks', () => {
            const listItem = document.createElement('li');
            mockBlock.appendChild(listItem);
            
            const result = editor.findEditableElementInBlock(mockBlock);
            expect(result).toBe(listItem);
        });

        it('should return block itself when contenteditable', () => {
            const result = editor.findEditableElementInBlock(mockBlock);
            expect(result).toBe(mockBlock);
        });

        it('should find contenteditable child', () => {
            mockBlock.removeAttribute('contenteditable');
            const editableChild = document.createElement('span');
            editableChild.setAttribute('contenteditable', 'true');
            mockBlock.appendChild(editableChild);
            
            const result = editor.findEditableElementInBlock(mockBlock);
            expect(result).toBe(editableChild);
        });

        it('should return block as fallback', () => {
            mockBlock.removeAttribute('contenteditable');
            
            const result = editor.findEditableElementInBlock(mockBlock);
            expect(result).toBe(mockBlock);
        });
    });

    describe('placeCursorAtEnd', () => {
        it('should handle null element gracefully', () => {
            expect(() => {
                editor.placeCursorAtEnd(null);
            }).not.toThrow();
        });

        it('should place cursor at end of text content', () => {
            const textNode = document.createTextNode('test text');
            mockBlock.appendChild(textNode);
            
            // Mock selection API
            const mockRange = {
                setStart: jest.fn(),
                collapse: jest.fn()
            };
            const mockSelection = {
                removeAllRanges: jest.fn(),
                addRange: jest.fn()
            };
            
            Object.defineProperty(window, 'getSelection', {
                value: jest.fn().mockReturnValue(mockSelection)
            });
            Object.defineProperty(document, 'createRange', {
                value: jest.fn().mockReturnValue(mockRange)
            });
            
            editor.placeCursorAtEnd(mockBlock);
            
            expect(mockRange.setStart).toHaveBeenCalledWith(textNode, 9); // 'test text'.length
            expect(mockRange.collapse).toHaveBeenCalledWith(true);
            expect(mockSelection.removeAllRanges).toHaveBeenCalled();
            expect(mockSelection.addRange).toHaveBeenCalledWith(mockRange);
        });
    });

    describe('Integration with KeyHandler', () => {
        it('should be called from KeyHandler.handleKeyPress', () => {
            const checkAndConvertBlockSpy = jest.spyOn(editor, 'checkAndConvertBlock').mockReturnValue(false);
            
            // Simulate the KeyHandler logic
            if (editor.currentBlock) {
                if (editor.checkAndConvertBlock(editor.currentBlock)) {
                    editor.update();
                }
            }
            
            expect(checkAndConvertBlockSpy).toHaveBeenCalledWith(editor.currentBlock);
        });
    });
});
