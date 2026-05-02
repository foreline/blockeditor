'use strict';

import { ListBlock } from '../src/blocks/ListBlock.js';
import { BlockFactory } from '../src/blocks/BlockFactory.js';
import { Editor } from '../src/Editor.js';

// Mock dependencies
jest.mock('../src/Editor.js');
jest.mock('../src/utils/log.js');

describe('ListBlock', () => {
    let listBlock;
    let mockCurrentBlock;

    beforeEach(() => {
        mockCurrentBlock = {
            innerHTML: '<li>Item 1</li><li>Item 2</li>',
            querySelector: jest.fn(),
            querySelectorAll: jest.fn(),
            appendChild: jest.fn(),
            removeChild: jest.fn(),
            dataset: { blockType: 'ul' },
            getAttribute: jest.fn(),
            setAttribute: jest.fn(),
            classList: { add: jest.fn(), remove: jest.fn() },
            focus: jest.fn(),
            addEventListener: jest.fn()
        };

        Editor.getInstanceFromElement = jest.fn().mockReturnValue({
            currentBlock: mockCurrentBlock,
            update: jest.fn(),
            addDefaultBlock: jest.fn(),
            setCurrentBlock: jest.fn()
        });

        listBlock = new ListBlock();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should create a ListBlock instance', () => {
            expect(listBlock).toBeInstanceOf(ListBlock);
        });

        it('should initialize with default properties', () => {
            expect(listBlock.type).toBe('list');
        });
    });

    describe('getMarkdownTriggers', () => {
        it('should return list markdown triggers', () => {
            const triggers = ListBlock.getMarkdownTriggers();
            
            expect(triggers).toEqual([
                '* ',
                '- ',
                '+ ',
                '1. ',
                '1) '
            ]);
        });
    });

    describe('matches', () => {
        it('should match unordered list triggers', () => {
            expect(ListBlock.matches('* ')).toBe(true);
            expect(ListBlock.matches('- ')).toBe(true);
            expect(ListBlock.matches('+ ')).toBe(true);
        });

        it('should match ordered list triggers', () => {
            expect(ListBlock.matches('1. ')).toBe(true);
            expect(ListBlock.matches('1) ')).toBe(true);
            expect(ListBlock.matches('2. ')).toBe(true);
            expect(ListBlock.matches('10. ')).toBe(true);
        });

        it('should not match invalid patterns', () => {
            expect(ListBlock.matches('# ')).toBe(false);
            expect(ListBlock.matches('text')).toBe(false);
            expect(ListBlock.matches('')).toBe(false);
        });
    });

    describe('getListType', () => {
        it('should return "ul" for unordered list triggers', () => {
            expect(ListBlock.getListType('* ')).toBe('ul');
            expect(ListBlock.getListType('- ')).toBe('ul');
            expect(ListBlock.getListType('+ ')).toBe('ul');
        });

        it('should return "ol" for ordered list triggers', () => {
            expect(ListBlock.getListType('1. ')).toBe('ol');
            expect(ListBlock.getListType('1) ')).toBe('ol');
            expect(ListBlock.getListType('5. ')).toBe('ol');
        });

        it('should return null for non-list triggers', () => {
            expect(ListBlock.getListType('# ')).toBeNull();
            expect(ListBlock.getListType('text')).toBeNull();
        });
    });

    describe('applyTransformation', () => {
        it('should transform current block into unordered list', () => {
            const mockListElement = {
                innerHTML: '',
                appendChild: jest.fn(),
                classList: { add: jest.fn() },
                setAttribute: jest.fn(),
                focus: jest.fn()
            };

            document.createElement = jest.fn().mockReturnValueOnce(mockListElement).mockReturnValue({
                innerHTML: '',
                appendChild: jest.fn(),
                focus: jest.fn()
            });

            mockCurrentBlock.parentNode = {
                replaceChild: jest.fn()
            };

            listBlock.listType = 'ul';
            listBlock.applyTransformation();

            expect(document.createElement).toHaveBeenCalledWith('ul');
            expect(mockListElement.classList.add).toHaveBeenCalledWith('bke-block');
            expect(mockListElement.setAttribute).toHaveBeenCalledWith('data-block-type', 'ul');
            expect(mockCurrentBlock.parentNode.replaceChild).toHaveBeenCalledWith(mockListElement, mockCurrentBlock);
        });

        it('should transform current block into ordered list', () => {
            const mockListElement = {
                innerHTML: '',
                appendChild: jest.fn(),
                classList: { add: jest.fn() },
                setAttribute: jest.fn(),
                focus: jest.fn()
            };

            document.createElement = jest.fn().mockReturnValueOnce(mockListElement).mockReturnValue({
                innerHTML: '',
                appendChild: jest.fn(),
                focus: jest.fn()
            });

            mockCurrentBlock.parentNode = {
                replaceChild: jest.fn()
            };

            listBlock.listType = 'ol';
            listBlock.applyTransformation();

            expect(document.createElement).toHaveBeenCalledWith('ol');
            expect(mockListElement.setAttribute).toHaveBeenCalledWith('data-block-type', 'ol');
        });

        it('should handle missing current block', () => {
            Editor.getInstanceFromElement = jest.fn().mockReturnValue(null);

            expect(() => {
                listBlock.applyTransformation();
            }).not.toThrow();
        });

        it('should handle missing parent node', () => {
            mockCurrentBlock.parentNode = null;

            expect(() => {
                listBlock.applyTransformation();
            }).not.toThrow();
        });
    });

    describe('handleKeyPress', () => {
        let mockEvent;

        beforeEach(() => {
            mockEvent = {
                key: 'Enter',
                preventDefault: jest.fn(),
                stopPropagation: jest.fn()
            };

            // Mock document methods
            global.window.getSelection = jest.fn().mockReturnValue({
                rangeCount: 1,
                getRangeAt: jest.fn().mockReturnValue({
                    commonAncestorContainer: {
                        closest: jest.fn()
                    }
                })
            });
        });

        it('should handle Enter key in list item', () => {
            const mockListItem = {
                textContent: 'Some text',
                classList: { contains: jest.fn().mockReturnValue(false) }
            };

            global.window.getSelection().getRangeAt().commonAncestorContainer.closest
                .mockReturnValue(mockListItem);

            const createNewListItemSpy = jest.spyOn(listBlock, 'createNewListItem').mockImplementation();

            const result = listBlock.handleKeyPress(mockEvent, 'text');

            expect(createNewListItemSpy).toHaveBeenCalledWith(mockEvent);
            expect(result).toBe(true);
        });

        it('should handle Enter key in empty list item', () => {
            const mockListItem = {
                textContent: '',
                classList: { contains: jest.fn().mockReturnValue(false) }
            };

            global.window.getSelection().getRangeAt().commonAncestorContainer.closest
                .mockReturnValue(mockListItem);

            const exitListSpy = jest.spyOn(listBlock, 'exitList').mockImplementation();

            const result = listBlock.handleKeyPress(mockEvent, '');

            expect(exitListSpy).toHaveBeenCalledWith(mockEvent);
            expect(result).toBe(true);
        });

        it('should not handle non-Enter keys', () => {
            mockEvent.key = 'Tab';

            const result = listBlock.handleKeyPress(mockEvent, 'text');

            expect(result).toBe(false);
        });

        it('should handle missing selection', () => {
            global.window.getSelection = jest.fn().mockReturnValue({
                rangeCount: 0
            });

            const result = listBlock.handleKeyPress(mockEvent, 'text');

            expect(result).toBe(false);
        });
    });

    describe('createNewListItem', () => {
        let mockEvent;

        beforeEach(() => {
            mockEvent = {
                preventDefault: jest.fn(),
                stopPropagation: jest.fn()
            };

            const mockNewItem = {
                focus: jest.fn(),
                innerHTML: '',
                appendChild: jest.fn()
            };

            document.createElement = jest.fn().mockReturnValue(mockNewItem);
        });

        it('should create new list item and focus it', () => {
            listBlock.createNewListItem(mockEvent);

            expect(document.createElement).toHaveBeenCalledWith('li');
            expect(mockCurrentBlock.appendChild).toHaveBeenCalled();
            expect(mockEvent.preventDefault).toHaveBeenCalled();
            expect(mockEvent.stopPropagation).toHaveBeenCalled();
        });
    });

    describe('exitList', () => {
        let mockEvent;

        beforeEach(() => {
            mockEvent = {
                preventDefault: jest.fn(),
                stopPropagation: jest.fn()
            };

            const mockSelection = {
                rangeCount: 1,
                getRangeAt: jest.fn().mockReturnValue({
                    commonAncestorContainer: {
                        closest: jest.fn().mockReturnValue({
                            remove: jest.fn()
                        })
                    }
                })
            };

            global.window.getSelection = jest.fn().mockReturnValue(mockSelection);
        });

        it('should remove empty list item and add new paragraph block', () => {
            const addDefaultBlockSpy = jest.spyOn(Editor, 'addDefaultBlock').mockImplementation();

            listBlock.exitList(mockEvent);

            expect(addDefaultBlockSpy).toHaveBeenCalled();
            expect(mockEvent.preventDefault).toHaveBeenCalled();
            expect(mockEvent.stopPropagation).toHaveBeenCalled();
        });

        it('should handle missing selection', () => {
            global.window.getSelection = jest.fn().mockReturnValue({
                rangeCount: 0
            });

            expect(() => {
                listBlock.exitList(mockEvent);
            }).not.toThrow();
        });
    });

    describe('getToolbarButtons', () => {
        it('should return list-related toolbar buttons', () => {
            const buttons = ListBlock.getToolbarButtons();

            expect(buttons).toEqual([
                { 
                    icon: 'fa-list-ul', 
                    title: 'Unordered List', 
                    action: 'ul',
                    class: 'bke-toolbar-ul'
                },
                { 
                    icon: 'fa-list-ol', 
                    title: 'Ordered List', 
                    action: 'ol',
                    class: 'bke-toolbar-ol'
                }
            ]);
        });
    });

    describe('getDisabledButtons', () => {
        it('should return buttons that should be disabled for lists', () => {
            const disabledButtons = ListBlock.getDisabledButtons();

            expect(disabledButtons).toContain('bke-toolbar-h1');
            expect(disabledButtons).toContain('bke-toolbar-h2');
            expect(disabledButtons).toContain('bke-toolbar-h3');
            expect(disabledButtons).toContain('bke-toolbar-h4');
            expect(disabledButtons).toContain('bke-toolbar-h5');
            expect(disabledButtons).toContain('bke-toolbar-h6');
        });
    });

    describe('handleBackspaceKey', () => {
        let mockEvent;

        beforeEach(() => {
            mockEvent = {
                preventDefault: jest.fn(),
                stopPropagation: jest.fn()
            };

            global.window.getSelection = jest.fn().mockReturnValue({
                rangeCount: 1,
                getRangeAt: jest.fn().mockReturnValue({
                    startOffset: 0,
                    endOffset: 0,
                    commonAncestorContainer: {
                        closest: jest.fn()
                    }
                })
            });
        });

        it('should handle backspace at beginning of list item', () => {
            const mockListItem = {
                textContent: 'Text content',
                previousElementSibling: null
            };

            global.window.getSelection().getRangeAt().commonAncestorContainer.closest
                .mockReturnValue(mockListItem);

            const exitListSpy = jest.spyOn(listBlock, 'exitList').mockImplementation();

            const result = listBlock.handleBackspaceKey(mockEvent);

            expect(exitListSpy).toHaveBeenCalledWith(mockEvent);
            expect(result).toBe(true);
        });

        it('should not handle backspace when not at beginning', () => {
            global.window.getSelection().getRangeAt.mockReturnValue({
                startOffset: 5,
                endOffset: 5
            });

            const result = listBlock.handleBackspaceKey(mockEvent);

            expect(result).toBe(false);
        });

        it('should not handle backspace with selection', () => {
            global.window.getSelection().getRangeAt.mockReturnValue({
                startOffset: 0,
                endOffset: 5
            });

            const result = listBlock.handleBackspaceKey(mockEvent);

            expect(result).toBe(false);
        });
    });
});
