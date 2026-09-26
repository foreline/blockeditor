'use strict';

jest.mock('@/Editor.js');
jest.mock('@/utils/log.js');
jest.mock('@/Utils.js');

import { KeyHandler } from '../src/KeyHandler.js';
import { Editor } from '../src/Editor.js';
import { BlockFactory } from '../src/blocks/BlockFactory.js';
import { Utils } from '../src/Utils.js';
import { EVENTS } from '../src/utils/eventEmitter.js';

describe('KeyHandler', () => {
    let keyHandler;
    let mockEditorInstance;
    let mockEvent;
    let mockCurrentBlock;

    beforeEach(() => {
        mockCurrentBlock = {
            innerHTML: '<p>test content</p>',
            dataset: { blockType: 'p' },
            getAttribute: jest.fn((attr) => attr === 'data-block-type' ? 'p' : null),
            id: 'block-1',
            textContent: 'test content',
            previousElementSibling: null,
            remove: jest.fn(),
            classList: { contains: jest.fn(() => true) }
        };

        mockEditorInstance = {
            keybuffer: [],
            currentBlock: mockCurrentBlock,
            instance: { querySelectorAll: jest.fn().mockReturnValue(['block1', 'block2']) },
            eventEmitter: { emit: jest.fn() },
            update: jest.fn(),
            addDefaultBlock: jest.fn(),
            setCurrentBlock: jest.fn(),
            focus: jest.fn(),
            checkAndConvertBlock: jest.fn().mockReturnValue(false)
        };

        mockEvent = {
            key: 'a',
            code: 'KeyA',
            ctrlKey: false,
            metaKey: false,
            altKey: false,
            shiftKey: false,
            preventDefault: jest.fn()
        };

        Editor.getInstanceFromElement = jest.fn().mockReturnValue(mockEditorInstance);
        Utils.stripTags = jest.fn().mockReturnValue('test content');
        BlockFactory.findBlockClassForTrigger = jest.fn().mockReturnValue(null);
        BlockFactory.createBlock = jest.fn().mockReturnValue({
            handleKeyPress: jest.fn().mockReturnValue(false),
            handleBackspaceKey: jest.fn().mockReturnValue(false),
            handleEnterKey: jest.fn().mockReturnValue(false),
        });

        keyHandler = new KeyHandler(mockEditorInstance);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('creates instance with editor reference', () => {
            expect(keyHandler.editorInstance).toBe(mockEditorInstance);
        });
    });

    describe('handleKeyPress', () => {
        it.each(['Tab', 'Enter'])('does not repeat %s actions on keyup', key => {
            keyHandler.handleKeyPress({ ...mockEvent, key });
            expect(BlockFactory.createBlock).not.toHaveBeenCalled();
        });
        it('should add key to keybuffer', () => {
            keyHandler.handleKeyPress(mockEvent);
            expect(mockEditorInstance.keybuffer).toContain('a');
        });

        it('should emit USER_KEY_PRESS event', () => {
            keyHandler.handleKeyPress(mockEvent);
            expect(mockEditorInstance.eventEmitter.emit).toHaveBeenCalledWith(
                EVENTS.USER_KEY_PRESS,
                expect.objectContaining({ key: 'a', code: 'KeyA' }),
                expect.objectContaining({ throttle: 50 })
            );
        });

        it('should return early if no current block', () => {
            mockEditorInstance.currentBlock = null;
            keyHandler.handleKeyPress(mockEvent);
            expect(Utils.stripTags).not.toHaveBeenCalled();
        });

        it('should call update after handling', () => {
            keyHandler.handleKeyPress(mockEvent);
            expect(mockEditorInstance.update).toHaveBeenCalled();
        });

        it('should delegate to block handleKeyPress when block handles it', () => {
            const mockBlock = { handleKeyPress: jest.fn().mockReturnValue(true), handleBackspaceKey: jest.fn(), handleEnterKey: jest.fn() };
            BlockFactory.createBlock.mockReturnValue(mockBlock);

            keyHandler.handleKeyPress(mockEvent);
            expect(mockBlock.handleKeyPress).toHaveBeenCalledWith(mockEvent, 'test content');
        });
    });

    describe('handleSpecialKeys', () => {
        it('should handle Enter key by calling handleEnterKey', () => {
            mockEvent.key = 'Enter';
            const spy = jest.spyOn(keyHandler, 'handleEnterKey').mockImplementation(() => {});
            keyHandler.handleSpecialKeys(mockEvent);
            expect(spy).toHaveBeenCalledWith(mockEvent);
        });

        it('should handle Backspace key by calling handleBackspaceKey', () => {
            mockEvent.key = 'Backspace';
            const spy = jest.spyOn(keyHandler, 'handleBackspaceKey').mockImplementation(() => {});
            keyHandler.handleSpecialKeys(mockEvent);
            expect(spy).toHaveBeenCalledWith(mockEvent);
        });

        it('should prevent default Tab when block does not handle it', () => {
            mockEvent.key = 'Tab';
            BlockFactory.createBlock.mockReturnValue({ handleKeyPress: jest.fn().mockReturnValue(false) });
            keyHandler.handleSpecialKeys(mockEvent);
            expect(mockEvent.preventDefault).toHaveBeenCalled();
        });
    });

    describe('handleEnterKey', () => {
        beforeEach(() => {
            mockEditorInstance.instance.querySelector = jest.fn().mockReturnValue(null);
            global.window.getSelection = jest.fn().mockReturnValue({
                rangeCount: 1,
                getRangeAt: jest.fn().mockReturnValue({ collapsed: true, startOffset: 0, endOffset: 0 })
            });
        });

        it('should return early if no current block and no fallback', () => {
            mockEditorInstance.currentBlock = null;
            mockEditorInstance.instance.querySelector = jest.fn().mockReturnValue(null);
            keyHandler.handleEnterKey(mockEvent);
            expect(mockEditorInstance.addDefaultBlock).not.toHaveBeenCalled();
        });

        it('should delegate to block handleEnterKey', () => {
            const mockBlock = { handleEnterKey: jest.fn().mockReturnValue(true), handleKeyPress: jest.fn() };
            BlockFactory.createBlock.mockReturnValue(mockBlock);
            // Make currentBlock appear connected
            mockCurrentBlock.isConnected = true;
            keyHandler.handleEnterKey(mockEvent);
            expect(mockBlock.handleEnterKey).toHaveBeenCalledWith(mockEvent);
        });
    });

    describe('handleBackspaceKey', () => {
        it('should return early if no current block', () => {
            mockEditorInstance.currentBlock = null;
            keyHandler.handleBackspaceKey(mockEvent);
            expect(Utils.stripTags).not.toHaveBeenCalled();
        });

        it('should not remove last remaining block', () => {
            Utils.stripTags.mockReturnValue('');
            mockCurrentBlock.previousElementSibling = null;
            mockEditorInstance.instance.querySelectorAll.mockReturnValue(['block1']);
            keyHandler.handleBackspaceKey(mockEvent);
            expect(mockCurrentBlock.remove).not.toHaveBeenCalled();
        });
    });

    describe('static cursor methods', () => {
        it('isCursorAtEndOfBlock returns false for null range', () => {
            expect(KeyHandler.isCursorAtEndOfBlock(null, null)).toBe(false);
        });

        it('isCursorAtEndOfBlock returns false for non-collapsed range', () => {
            const range = { collapsed: false };
            const block = { textContent: 'hello' };
            expect(KeyHandler.isCursorAtEndOfBlock(block, range)).toBe(false);
        });

        it('isCursorAtStartOfBlock returns false for null', () => {
            expect(KeyHandler.isCursorAtStartOfBlock(null, null)).toBe(false);
        });

        it('isCursorAtStartOfBlock returns false for non-collapsed range', () => {
            const range = { collapsed: false };
            expect(KeyHandler.isCursorAtStartOfBlock({}, range)).toBe(false);
        });
    });
});
