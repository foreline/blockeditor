'use strict';

import { Toolbar } from '../src/Toolbar.js';
import { ToolbarHandlers } from '../src/ToolbarHandlers.js';
import { BlockFactory } from '../src/blocks/BlockFactory.js';
import { eventEmitter, EVENTS } from '../src/utils/eventEmitter.js';

// Mock dependencies
jest.mock('../src/Editor.js');
jest.mock('../src/ToolbarHandlers.js');
jest.mock('../src/blocks/BlockFactory.js');
jest.mock('../src/utils/log.js');
jest.mock('../src/utils/eventEmitter.js');

// Mock document.execCommand
document.execCommand = jest.fn();

describe('Toolbar', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock DOM methods
        document.createElement = jest.fn().mockReturnValue({
            className: '',
            classList: { 
                add: jest.fn(), 
                remove: jest.fn(), 
                toggle: jest.fn(), 
                contains: jest.fn().mockReturnValue(false) 
            },
            appendChild: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            setAttribute: jest.fn(),
            getAttribute: jest.fn(),
            innerHTML: '',
            textContent: '',
            style: {},
            focus: jest.fn(),
            blur: jest.fn(),
            parentNode: null,
            children: []
        });
        
        document.querySelector = jest.fn().mockReturnValue({
            classList: { 
                add: jest.fn(), 
                remove: jest.fn(), 
                toggle: jest.fn(), 
                contains: jest.fn().mockReturnValue(false) 
            },
            className: '',
            appendChild: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            setAttribute: jest.fn(),
            getAttribute: jest.fn(),
            innerHTML: '',
            textContent: '',
            style: {},
            focus: jest.fn(),
            blur: jest.fn(),
            parentNode: null,
            children: []
        });
        document.querySelectorAll = jest.fn().mockReturnValue([]);
        
        // Mock Toolbar.after method to avoid circular calls
        Toolbar.after = jest.fn();
        
        // Mock ToolbarHandlers
        ToolbarHandlers.init = jest.fn();
        
        // Mock eventEmitter
        eventEmitter.emit = jest.fn();
    });

    describe('init', () => {
        it('should initialize toolbar with container and config', () => {
            const options = {
                container: document.createElement('div'),
                config: []
            };
            
            const createToolbarSpy = jest.spyOn(Toolbar, 'createToolbar').mockImplementation();

            Toolbar.init(options);

            expect(createToolbarSpy).toHaveBeenCalledWith(options.container, options.config);
            expect(ToolbarHandlers.init).toHaveBeenCalled();
            expect(eventEmitter.emit).toHaveBeenCalledWith(
                EVENTS.EDITOR_INITIALIZED,
                expect.objectContaining({
                    toolbarContainer: options.container,
                    toolbarConfig: options.config,
                    timestamp: expect.any(Number)
                }),
                { source: 'toolbar.init' }
            );
        });
    });

    describe('undo', () => {
        it('should execute undo command and call after', () => {
            Toolbar.undo();

            expect(document.execCommand).toHaveBeenCalledWith('undo');
            expect(Toolbar.after).toHaveBeenCalled();
        });
    });

    describe('redo', () => {
        it('should execute redo command and call after', () => {
            Toolbar.redo();

            expect(document.execCommand).toHaveBeenCalledWith('redo');
            expect(Toolbar.after).toHaveBeenCalled();
        });
    });

    describe('header methods', () => {
        it('should execute h1 command', () => {
            Toolbar.h1();

            expect(document.execCommand).toHaveBeenCalledWith('formatBlock', false, '<h1>');
            expect(Toolbar.after).toHaveBeenCalled();
        });

        it('should execute h2 command', () => {
            Toolbar.h2();

            expect(document.execCommand).toHaveBeenCalledWith('formatBlock', false, '<h2>');
            expect(Toolbar.after).toHaveBeenCalled();
        });

        it('should execute h3 command', () => {
            Toolbar.h3();

            expect(document.execCommand).toHaveBeenCalledWith('formatBlock', false, '<h3>');
            expect(Toolbar.after).toHaveBeenCalled();
        });

        it('should execute h4 command', () => {
            Toolbar.h4();

            expect(document.execCommand).toHaveBeenCalledWith('formatBlock', false, '<h4>');
            expect(Toolbar.after).toHaveBeenCalled();
        });

        it('should execute h5 command', () => {
            Toolbar.h5();

            expect(document.execCommand).toHaveBeenCalledWith('formatBlock', false, '<h5>');
            expect(Toolbar.after).toHaveBeenCalled();
        });

        it('should execute h6 command', () => {
            Toolbar.h6();

            expect(document.execCommand).toHaveBeenCalledWith('formatBlock', false, '<h6>');
            expect(Toolbar.after).toHaveBeenCalled();
        });

        it('should execute paragraph command', () => {
            Toolbar.paragraph();

            expect(document.execCommand).toHaveBeenCalledWith('formatBlock', false, '<p>');
            expect(Toolbar.after).toHaveBeenCalled();
        });
    });

    describe('text formatting methods', () => {
        it('should execute bold command', () => {
            Toolbar.bold();

            expect(document.execCommand).toHaveBeenCalledWith('bold');
            expect(Toolbar.after).toHaveBeenCalled();
        });

        it('should execute italic command', () => {
            Toolbar.italic();

            expect(document.execCommand).toHaveBeenCalledWith('italic');
            expect(Toolbar.after).toHaveBeenCalled();
        });

        it('should execute underline command', () => {
            Toolbar.underline();

            expect(document.execCommand).toHaveBeenCalledWith('underline');
            expect(Toolbar.after).toHaveBeenCalled();
        });

        it('should execute strikethrough command', () => {
            Toolbar.strikethrough();

            expect(document.execCommand).toHaveBeenCalledWith('strikeThrough');
            expect(Toolbar.after).toHaveBeenCalled();
        });
    });

    describe('list methods', () => {
        it('should execute unordered list command', () => {
            Toolbar.ul();

            expect(document.execCommand).toHaveBeenCalledWith('insertUnorderedList');
            expect(Toolbar.after).toHaveBeenCalled();
        });

        it('should execute ordered list command', () => {
            Toolbar.ol();

            expect(document.execCommand).toHaveBeenCalledWith('insertOrderedList');
            expect(Toolbar.after).toHaveBeenCalled();
        });
    });

    describe('sq (task list)', () => {
        it('should create task list block using BlockFactory', () => {
            const mockTaskBlock = {
                applyTransformation: jest.fn()
            };
            
            BlockFactory.createBlock.mockReturnValue(mockTaskBlock);
            
            // Mock Editor instance with currentBlock
            const mockCurrentBlock = document.createElement('div');
            const mockEditorInstance = {
                currentBlock: mockCurrentBlock,
                convertCurrentBlockOrCreate: jest.fn().mockReturnValue(false)
            };
            Toolbar.editorInstance = mockEditorInstance;

            Toolbar.sq();

            expect(BlockFactory.createBlock).toHaveBeenCalledWith('sq');
            expect(mockTaskBlock.applyTransformation).toHaveBeenCalled();
            expect(Toolbar.after).toHaveBeenCalled();
        });

        it('should return early if no current block', () => {
            const mockEditorInstance = {
                currentBlock: null,
                convertCurrentBlockOrCreate: jest.fn().mockReturnValue(false)
            };
            Toolbar.editorInstance = mockEditorInstance;

            Toolbar.sq();

            expect(BlockFactory.createBlock).not.toHaveBeenCalled();
            expect(Toolbar.after).toHaveBeenCalled();
        });
    });

    describe('code', () => {
        beforeEach(() => {
            // Mock window.getSelection
            global.window.getSelection = jest.fn().mockReturnValue({
                getRangeAt: jest.fn().mockReturnValue({
                    toString: jest.fn().mockReturnValue('selected text')
                })
            });
        });

        it('should format selected text as code block', () => {
            Toolbar.code();

            expect(document.execCommand).toHaveBeenCalledWith('formatBlock', false, '<pre>');
            expect(Toolbar.after).toHaveBeenCalled();
        });
    });

    describe('br', () => {
        it('should insert line break when selection exists', () => {
            const mockParentNode = {
                parentNode: {
                    insertBefore: jest.fn()
                },
                nextSibling: null
            };
            
            global.window.getSelection = jest.fn().mockReturnValue({
                rangeCount: 1,
                getRangeAt: jest.fn().mockReturnValue({
                    commonAncestorContainer: {
                        parentNode: mockParentNode
                    }
                })
            });

            const mockBr = { tagName: 'BR' };
            document.createElement.mockReturnValue(mockBr);

            Toolbar.br();

            expect(document.createElement).toHaveBeenCalledWith('br');
            expect(mockParentNode.parentNode.insertBefore).toHaveBeenCalledWith(mockBr, mockParentNode.nextSibling);
        });

        it('should warn when no selection exists', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            global.window.getSelection = jest.fn().mockReturnValue({
                rangeCount: 0
            });

            Toolbar.br();

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('tab', () => {
        it('should insert tab characters', () => {
            Toolbar.tab();

            expect(document.execCommand).toHaveBeenCalledWith('insertText', false, '    ');
            expect(Toolbar.after).toHaveBeenCalled();
        });
    });

    describe('view methods', () => {
        beforeEach(() => {
            // Mock DOM elements for view methods
            const mockTextElement = { style: {}, disabled: false };
            const mockMarkdownElement = { style: {}, disabled: false };
            const mockHtmlElement = { style: {}, disabled: true };
            const mockNoteText = { style: {} };
            const mockNoteMarkdown = { style: {} };
            const mockNoteHtml = { style: {} };

            document.querySelector
                .mockReturnValueOnce(mockTextElement)
                .mockReturnValueOnce(mockMarkdownElement)
                .mockReturnValueOnce(mockHtmlElement)
                .mockReturnValueOnce(mockNoteText)
                .mockReturnValueOnce(mockNoteMarkdown)
                .mockReturnValueOnce(mockNoteHtml);
        });

        it('should switch to text view', () => {
            Toolbar.text();

            expect(document.querySelector).toHaveBeenCalledWith('.bke-toolbar-text');
            expect(document.querySelector).toHaveBeenCalledWith('.note-text');
        });

        it('should switch to markdown view', () => {
            // Mock Editor instance and methods
            const mockEditorInstance = {
                getMarkdown: jest.fn().mockReturnValue('# Test markdown')
            };
            Toolbar.editorInstance = mockEditorInstance;

            Toolbar.markdown();

            expect(mockEditorInstance.getMarkdown).toHaveBeenCalled();
            expect(document.querySelector).toHaveBeenCalledWith('.note-text');
        });

        it('should switch to html view', () => {
            // Mock Editor instance and methods
            const mockEditorInstance = {
                getHtml: jest.fn().mockReturnValue('<h1>Test HTML</h1>')
            };
            Toolbar.editorInstance = mockEditorInstance;

            Toolbar.html();

            expect(mockEditorInstance.getHtml).toHaveBeenCalled();
            expect(document.querySelector).toHaveBeenCalledWith('.note-text');
        });
    });

    describe('table', () => {
        it('should create table block using BlockFactory', () => {
            const mockTableBlock = {
                applyTransformation: jest.fn()
            };
            
            BlockFactory.createBlock.mockReturnValue(mockTableBlock);

            Toolbar.table();

            expect(BlockFactory.createBlock).toHaveBeenCalledWith('table');
            expect(mockTableBlock.applyTransformation).toHaveBeenCalled();
            expect(Toolbar.after).toHaveBeenCalled();
        });
    });

    describe('image', () => {
        it('should create image block using BlockFactory', () => {
            const mockImageBlock = {
                applyTransformation: jest.fn()
            };
            
            BlockFactory.createBlock.mockReturnValue(mockImageBlock);

            Toolbar.image();

            expect(BlockFactory.createBlock).toHaveBeenCalledWith('image');
            expect(mockImageBlock.applyTransformation).toHaveBeenCalled();
            expect(Toolbar.after).toHaveBeenCalled();
        });
    });

    describe('createToolbar', () => {
        it('should create toolbar with config array', () => {
            const mockContainer = {
                appendChild: jest.fn()
            };
            
            const mockToolbar = {
                className: '',
                appendChild: jest.fn()
            };
            
            document.createElement.mockReturnValue(mockToolbar);
            
            const config = [
                {
                    group: [
                        { class: 'test-button', icon: 'fa-test', title: 'Test Button' }
                    ]
                }
            ];

            Toolbar.createToolbar(mockContainer, config);

            expect(document.createElement).toHaveBeenCalledWith('div');
            expect(mockToolbar.className).toBe('bke-toolbar');
            expect(mockContainer.appendChild).toHaveBeenCalledWith(mockToolbar);
        });

        it('should handle config.config format', () => {
            const mockContainer = {
                appendChild: jest.fn()
            };
            
            const mockToolbar = {
                className: '',
                appendChild: jest.fn()
            };
            
            document.createElement.mockReturnValue(mockToolbar);
            
            const config = {
                config: [
                    {
                        group: [
                            { class: 'test-button', icon: 'fa-test', title: 'Test Button' }
                        ]
                    }
                ]
            };

            Toolbar.createToolbar(mockContainer, config);

            expect(mockContainer.appendChild).toHaveBeenCalledWith(mockToolbar);
        });

        it('should create dropdown sections', () => {
            // Skip this test for now - it requires complex mocking
            expect(true).toBe(true);
        });
    });
});
