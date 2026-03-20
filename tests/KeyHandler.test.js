'use strict';

import { KeyHandler } from '../src/KeyHandler.js';
import { Editor } from '../src/Editor.js';
import { BlockFactory } from '../src/blocks/BlockFactory.js';
import { Utils } from '../src/Utils.js';
import { EVENTS } from '../src/utils/eventEmitter.js';

// Mock dependencies
jest.mock('../src/Editor.js');
jest.mock('../src/blocks/BlockFactory.js');
jest.mock('../src/Utils.js');
jest.mock('../src/utils/log.js');

describe('KeyHandler', () => {
    let mockEditorInstance;
    let mockEvent;
    let mockCurrentBlock;

    beforeEach(() => {
        // Setup mock editor instance
        mockCurrentBlock = {
            innerHTML: '<p>test content</p>',
            dataset: { blockType: 'p' },
            getAttribute: jest.fn((attr) => attr === 'data-block-type' ? 'p' : null),
            id: 'block-1'
        };

        mockEditorInstance = {
            keybuffer: [],
            currentBlock: mockCurrentBlock,
            instance: document.createElement('div'),
            eventEmitter: {
                emit: jest.fn()
            },
            update: jest.fn(),
            addDefaultBlock: jest.fn(),
            setCurrentBlock: jest.fn(),
            focus: jest.fn(),
            checkAndConvertBlock: jest.fn().mockReturnValue(false)
        };

        // Setup mock event
        mockEvent = {
            key: 'a',
            code: 'KeyA',
            ctrlKey: false,
            altKey: false,
            shiftKey: false,
            preventDefault: jest.fn()
        };

        // Setup Editor static methods (just getInstanceFromElement for block-level lookups)
        Editor.getInstanceFromElement = jest.fn().mockReturnValue(mockEditorInstance);

        // Setup Utils mock
        Utils.stripTags = jest.fn().mockReturnValue('test content');

        // Setup BlockFactory mock
        BlockFactory.findBlockClassForTrigger = jest.fn().mockReturnValue(null);
        BlockFactory.createBlock = jest.fn().mockReturnValue({
            handleKeyPress: jest.fn().mockReturnValue(false),
            handleBackspaceKey: jest.fn().mockReturnValue(false)
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('handleKeyPress', () => {
        it('should add key to keybuffer and emit USER_KEY_PRESS event', () => {
            KeyHandler.handleKeyPress(mockEvent, mockEditorInstance);

            expect(mockEditorInstance.keybuffer).toContain('a');
            expect(mockEditorInstance.eventEmitter.emit).toHaveBeenCalledWith(
                EVENTS.USER_KEY_PRESS,
                expect.objectContaining({
                    key: 'a',
                    code: 'KeyA',
                    ctrlKey: false,
                    altKey: false,
                    shiftKey: false,
                    timestamp: expect.any(Number),
                    blockId: 'block-1'
                }),
                { throttle: 50, source: 'user.keypress' }
            );
        });

        it('should return early if no current block', () => {
            mockEditorInstance.currentBlock = null;

            KeyHandler.handleKeyPress(mockEvent, mockEditorInstance);

            expect(Utils.stripTags).not.toHaveBeenCalled();
            expect(mockEditorInstance.update).not.toHaveBeenCalled();
        });

        it('should handle block conversion through checkAndConvertBlock', () => {
            jest.useFakeTimers();
            mockEditorInstance.checkAndConvertBlock.mockReturnValue(true);
            Utils.stripTags.mockReturnValue('# ');
            mockEvent.key = ' '; // Space key is required to trigger block conversion

            KeyHandler.handleKeyPress(mockEvent, mockEditorInstance);

            // Fast-forward time to trigger the setTimeout
            jest.advanceTimersByTime(50);

            expect(mockEditorInstance.checkAndConvertBlock).toHaveBeenCalledWith(mockCurrentBlock);
            expect(mockEditorInstance.update).toHaveBeenCalled();
            
            jest.useRealTimers();
        });

        it('should delegate to current block handleKeyPress', () => {
            const mockBlock = {
                handleKeyPress: jest.fn().mockReturnValue(true)
            };
            BlockFactory.createBlock.mockReturnValue(mockBlock);

            KeyHandler.handleKeyPress(mockEvent, mockEditorInstance);

            expect(BlockFactory.createBlock).toHaveBeenCalledWith('p');
            expect(mockBlock.handleKeyPress).toHaveBeenCalledWith(mockEvent, 'test content');
            expect(mockEditorInstance.update).toHaveBeenCalled();
        });

        it('should call default update when no special handling', () => {
            KeyHandler.handleKeyPress(mockEvent, mockEditorInstance);

            expect(mockEditorInstance.update).toHaveBeenCalled();
        });
    });

    describe('handleSpecialKeys', () => {
        it('should handle Enter key', () => {
            mockEvent.key = 'Enter';
            mockEvent.shiftKey = false;
            
            const handleEnterKeySpy = jest.spyOn(KeyHandler, 'handleEnterKey').mockImplementation();

            KeyHandler.handleSpecialKeys(mockEvent, mockEditorInstance);

            expect(handleEnterKeySpy).toHaveBeenCalledWith(mockEvent, mockEditorInstance);
        });

        it('should handle Backspace key', () => {
            mockEvent.key = 'Backspace';
            
            const handleBackspaceKeySpy = jest.spyOn(KeyHandler, 'handleBackspaceKey').mockImplementation();

            KeyHandler.handleSpecialKeys(mockEvent, mockEditorInstance);

            expect(handleBackspaceKeySpy).toHaveBeenCalledWith(mockEvent, mockEditorInstance);
        });

        it('should handle Tab key with block handling', () => {
            mockEvent.key = 'Tab';
            const mockBlock = {
                handleKeyPress: jest.fn().mockReturnValue(true)
            };
            BlockFactory.createBlock.mockReturnValue(mockBlock);

            KeyHandler.handleSpecialKeys(mockEvent, mockEditorInstance);

            expect(BlockFactory.createBlock).toHaveBeenCalledWith('p');
            expect(mockBlock.handleKeyPress).toHaveBeenCalledWith(mockEvent, '');
        });

        it('should prevent default Tab behavior when not handled by block', () => {
            mockEvent.key = 'Tab';
            const mockBlock = {
                handleKeyPress: jest.fn().mockReturnValue(false)
            };
            BlockFactory.createBlock.mockReturnValue(mockBlock);

            KeyHandler.handleSpecialKeys(mockEvent, mockEditorInstance);

            expect(mockEvent.preventDefault).toHaveBeenCalled();
        });
    });

    describe('handleEnterKey', () => {
        beforeEach(() => {
            // Mock selection and range
            global.window.getSelection = jest.fn().mockReturnValue({
                rangeCount: 1,
                getRangeAt: jest.fn().mockReturnValue({
                    collapsed: true,
                    startOffset: 0,
                    endOffset: 0
                })
            });
        });

        it('should return early if no current block', () => {
            mockEditorInstance.currentBlock = null;

            KeyHandler.handleEnterKey(mockEvent, mockEditorInstance);

            expect(mockEditorInstance.addDefaultBlock).not.toHaveBeenCalled();
        });

        it('should create code block when triple backticks detected', () => {
            mockEditorInstance.keybuffer = ['`', '`', '`'];
            const mockCodeBlock = {
                applyTransformation: jest.fn()
            };
            BlockFactory.createBlock.mockReturnValue(mockCodeBlock);

            KeyHandler.handleEnterKey(mockEvent, mockEditorInstance);

            expect(BlockFactory.createBlock).toHaveBeenCalledWith('code');
            expect(mockCodeBlock.applyTransformation).toHaveBeenCalled();
            expect(mockEditorInstance.update).toHaveBeenCalled();
        });

        it('should add empty block when cursor at end', () => {
            mockEditorInstance.keybuffer = [];
            
            // Mock cursor at end of block
            const mockRange = {
                collapsed: true,
                startOffset: 12,
                endOffset: 12
            };
            global.window.getSelection.mockReturnValue({
                rangeCount: 1,
                getRangeAt: jest.fn().mockReturnValue(mockRange)
            });

            const isCursorAtEndSpy = jest.spyOn(KeyHandler, 'isCursorAtEndOfBlock').mockReturnValue(true);

            KeyHandler.handleEnterKey(mockEvent, mockEditorInstance);

            expect(mockEditorInstance.addDefaultBlock).toHaveBeenCalled();
            expect(isCursorAtEndSpy).toHaveBeenCalled();
        });
    });

    describe('handleBackspaceKey', () => {
        it('should return early if no current block', () => {
            mockEditorInstance.currentBlock = null;

            KeyHandler.handleBackspaceKey(mockEvent, mockEditorInstance);

            expect(Utils.stripTags).not.toHaveBeenCalled();
        });

        it('should remove empty block and focus previous', () => {
            Utils.stripTags.mockReturnValue('');
            
            const mockPreviousBlock = { classList: { contains: jest.fn().mockReturnValue(true) } };
            const mockCurrBlock = {
                innerHTML: '',
                previousElementSibling: mockPreviousBlock,
                remove: jest.fn()
            };
            
            mockEditorInstance.currentBlock = mockCurrBlock;
            mockEditorInstance.instance = {
                querySelectorAll: jest.fn().mockReturnValue(['block1', 'block2']) // More than 1 block
            };
            mockEditorInstance.setCurrentBlock = jest.fn();
            mockEditorInstance.focus = jest.fn();

            KeyHandler.handleBackspaceKey(mockEvent, mockEditorInstance);

            expect(mockCurrBlock.remove).toHaveBeenCalled();
            expect(mockEditorInstance.setCurrentBlock).toHaveBeenCalledWith(mockPreviousBlock);
            expect(mockEvent.preventDefault).toHaveBeenCalled();
        });

        it('should not remove last remaining block', () => {
            Utils.stripTags.mockReturnValue('');
            
            const mockCurrBlock = {
                innerHTML: '',
                previousElementSibling: null,
                remove: jest.fn()
            };
            
            mockEditorInstance.currentBlock = mockCurrBlock;
            mockEditorInstance.instance = {
                querySelectorAll: jest.fn().mockReturnValue(['block1']) // Only 1 block
            };

            KeyHandler.handleBackspaceKey(mockEvent, mockEditorInstance);

            expect(mockCurrBlock.remove).not.toHaveBeenCalled();
        });

        it('should delegate to block handleBackspaceKey', () => {
            Utils.stripTags.mockReturnValue('some content');
            
            const mockBlock = {
                handleBackspaceKey: jest.fn().mockReturnValue(true)
            };
            BlockFactory.createBlock.mockReturnValue(mockBlock);

            KeyHandler.handleBackspaceKey(mockEvent, mockEditorInstance);

            expect(mockBlock.handleBackspaceKey).toHaveBeenCalledWith(mockEvent);
            expect(mockEditorInstance.update).toHaveBeenCalled();
        });
    });

    describe('isCursorAtEndOfBlock', () => {
        it('should return true when cursor is at end of block', () => {
            const mockBlock = {
                textContent: 'test content'
            };
            const mockRange = {
                startOffset: 12,
                endOffset: 12
            };

            const result = KeyHandler.isCursorAtEndOfBlock(mockBlock, mockRange);

            expect(result).toBe(true);
        });

        it('should return false when cursor is not at end', () => {
            const mockBlock = {
                textContent: 'test content'
            };
            const mockRange = {
                startOffset: 5,
                endOffset: 5
            };

            const result = KeyHandler.isCursorAtEndOfBlock(mockBlock, mockRange);

            expect(result).toBe(false);
        });
    });

    describe('clearKeyBuffer', () => {
        it('should clear the key buffer', () => {
            mockEditorInstance.keybuffer = ['a', 'b', 'c'];

            KeyHandler.clearKeyBuffer(mockEditorInstance);

            expect(mockEditorInstance.keybuffer).toEqual([]);
        });
    });

    describe('getKeyBuffer', () => {
        it('should return copy of key buffer', () => {
            mockEditorInstance.keybuffer = ['a', 'b', 'c'];

            const result = KeyHandler.getKeyBuffer(mockEditorInstance);

            expect(result).toEqual(['a', 'b', 'c']);
            expect(result).not.toBe(mockEditorInstance.keybuffer); // Should be a copy
        });
    });
});
