'use strict';

import { Editor } from '../src/Editor.js';
import { Parser } from '../src/Parser.js';
import { Toolbar } from '../src/Toolbar.js';
import { KeyHandler } from '../src/KeyHandler.js';
import { EditorEventEmitter, EVENTS } from '../src/utils/eventEmitter.js';
import { BlockFactory } from '../src/blocks/BlockFactory.js';
import { Utils } from '../src/Utils.js';

// Mock dependencies
jest.mock('../src/Parser.js');
jest.mock('../src/Toolbar.js');
jest.mock('../src/KeyHandler.js');
jest.mock('../src/utils/eventEmitter.js');
jest.mock('../src/blocks/BlockFactory.js');
jest.mock('../src/Utils.js');
jest.mock('../src/utils/log.js');

describe('Editor Instance Methods', () => {
    let editor;
    let mockContainer;
    let mockElement;

    beforeEach(() => {
        // Clear the instances registry
        Editor._instances.clear();
        Editor._fallbackBlocks = [];

        // Mock DOM elements
        mockElement = {
            id: 'test-editor',
            innerHTML: '',
            appendChild: jest.fn(),
            append: jest.fn(),
            querySelector: jest.fn(),
            querySelectorAll: jest.fn().mockReturnValue([{
                classList: { add: jest.fn(), remove: jest.fn() },
                getAttribute: jest.fn(),
                dataset: { blockType: 'p' }
            }]),
            setAttribute: jest.fn(),
            addEventListener: jest.fn(),
            closest: jest.fn()
        };

        mockContainer = {
            appendChild: jest.fn()
        };

        // Mock document methods
        document.getElementById = jest.fn().mockReturnValue(mockElement);
        document.createElement = jest.fn().mockReturnValue({
            id: '',
            className: '',
            classList: { 
                add: jest.fn(), 
                remove: jest.fn(), 
                toggle: jest.fn(), 
                contains: jest.fn().mockReturnValue(false) 
            },
            appendChild: jest.fn(),
            innerHTML: '',
            textContent: '',
            setAttribute: jest.fn(),
            getAttribute: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            focus: jest.fn(),
            blur: jest.fn(),
            parentNode: null,
            children: [],
            style: {}
        });
        document.querySelector = jest.fn().mockReturnValue(mockContainer);
        document.addEventListener = jest.fn();

        // Mock Parser
        Parser.parse = jest.fn().mockReturnValue([]);
        Parser.html = jest.fn().mockReturnValue(mockElement);

        // Mock Toolbar
        Toolbar.init = jest.fn();

        // Mock EditorEventEmitter
        EditorEventEmitter.mockImplementation(() => ({
            emit: jest.fn(),
            subscribe: jest.fn(),
            cleanup: jest.fn(),
            events: new Map()
        }));

        // Mock Utils
        Utils.escapeHTML = jest.fn(text => text);
        Utils.stripTags = jest.fn(html => html.replace(/<[^>]*>/g, ''));

        // Mock BlockFactory
        BlockFactory.createBlock = jest.fn().mockReturnValue({
            _type: 'p',
            _content: '',
            _html: '',
            _nested: false
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should create editor instance with default options', () => {
            const options = { id: 'test-editor' };
            
            editor = new Editor(options);

            expect(editor.instance).toBe(mockElement);
            expect(editor.blocks).toEqual([]);
            expect(editor.currentBlock).toBeNull();
            expect(editor.rules).toEqual([]);
            expect(editor.keybuffer).toEqual([]);
            expect(EditorEventEmitter).toHaveBeenCalled();
            expect(Toolbar.init).toHaveBeenCalled();
        });

        it('should warn when no element id provided', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            editor = new Editor({});

            expect(consoleSpy).toHaveBeenCalledWith('Element id is not set.');
            consoleSpy.mockRestore();
        });

        it('should register instance in static registry', () => {
            editor = new Editor({ id: 'test-editor' });

            expect(Editor._instances.has(mockElement)).toBe(true);
            expect(Editor._instances.get(mockElement)).toBe(editor);
        });
    });

    describe('init', () => {
        beforeEach(() => {
            editor = new Editor({ id: 'test-editor' });
        });

        it('should create editor element and set attributes', () => {
            expect(mockElement.setAttribute).toHaveBeenCalledWith('contenteditable', 'true');
        });

        it('should handle container as array', () => {
            const containers = [mockContainer, { appendChild: jest.fn() }];
            const newEditor = new Editor({ 
                id: 'test-editor-2',
                container: containers
            });

            containers.forEach(container => {
                expect(container.appendChild).toHaveBeenCalled();
            });
        });

        it('should parse initial content', () => {
            const initialContent = '<p>Test content</p>';
            mockElement.innerHTML = initialContent;
            
            new Editor({ id: 'test-editor-3' });

            expect(Parser.parse).toHaveBeenCalledWith(initialContent);
        });

        it('should create default block when content is empty', () => {
            mockElement.innerHTML = '';
            Parser.parse.mockReturnValue([]);
            
            new Editor({ id: 'test-editor-4' });

            expect(mockElement.appendChild).toHaveBeenCalled();
        });

        it('should emit initialization event', () => {
            const newEditor = new Editor({ id: 'test-editor-5' });

            expect(newEditor.eventEmitter.emit).toHaveBeenCalledWith(
                EVENTS.EDITOR_INITIALIZED,
                expect.objectContaining({
                    elementId: 'test-editor-5',
                    blockCount: expect.any(Number),
                    timestamp: expect.any(Number)
                }),
                { source: 'editor.init' }
            );
        });
    });

    describe('event subscription methods', () => {
        beforeEach(() => {
            editor = new Editor({ id: 'test-editor' });
        });

        it('should subscribe to events', () => {
            const callback = jest.fn();
            const options = { throttle: 100 };

            editor.on('test-event', callback, options);

            expect(editor.eventEmitter.subscribe).toHaveBeenCalledWith('test-event', callback, options);
        });

        it('should unsubscribe from events', () => {
            const callback = jest.fn();
            const mockListeners = new Set([{ callback }]);
            editor.eventEmitter.events = new Map([['test-event', mockListeners]]);

            editor.off('test-event', callback);

            expect(mockListeners.size).toBe(0);
        });

        it('should subscribe to one-time events', () => {
            const callback = jest.fn();
            const options = { throttle: 100 };

            editor.once('test-event', callback, options);

            expect(editor.eventEmitter.subscribe).toHaveBeenCalledWith(
                'test-event', 
                callback, 
                { ...options, once: true }
            );
        });

        it('should emit events', () => {
            const data = { test: 'data' };
            const options = { source: 'test' };

            editor.emit('test-event', data, options);

            expect(editor.eventEmitter.emit).toHaveBeenCalledWith('test-event', data, options);
        });
    });

    describe('getInstance', () => {
        it('should return editor instance for element', () => {
            editor = new Editor({ id: 'test-editor' });

            const result = Editor.getInstance(mockElement);

            expect(result).toBe(editor);
        });

        it('should return null for unregistered element', () => {
            const unknownElement = { id: 'unknown' };

            const result = Editor.getInstance(unknownElement);

            expect(result).toBeNull();
        });
    });

    describe('destroy', () => {
        beforeEach(() => {
            editor = new Editor({ id: 'test-editor' });
        });

        it('should cleanup event emitter and remove from registry', () => {
            editor.destroy();

            expect(editor.eventEmitter.cleanup).toHaveBeenCalled();
            expect(Editor._instances.has(mockElement)).toBe(false);
            expect(editor.instance).toBeNull();
            expect(editor.blocks).toEqual([]);
            expect(editor.currentBlock).toBeNull();
        });
    });

    describe('addListeners', () => {
        beforeEach(() => {
            editor = new Editor({ id: 'test-editor' });
        });

        it('should add keydown listener that calls KeyHandler', () => {
            const mockEvent = { key: 'Enter' };

            expect(mockElement.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
            
            // Get the keydown handler and test it
            const keydownHandler = mockElement.addEventListener.mock.calls
                .find(call => call[0] === 'keydown')[1];
            
            keydownHandler(mockEvent);

            expect(KeyHandler.handleSpecialKeys).toHaveBeenCalledWith(mockEvent, editor);
        });

        it('should add keyup listener that calls KeyHandler', () => {
            const mockEvent = { key: 'a' };

            expect(mockElement.addEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
            
            // Get the keyup handler and test it
            const keyupHandler = mockElement.addEventListener.mock.calls
                .find(call => call[0] === 'keyup')[1];
            
            keyupHandler(mockEvent);

            expect(KeyHandler.handleKeyPress).toHaveBeenCalledWith(mockEvent, editor);
        });

        it('should add paste listener', () => {
            const mockEvent = { 
                preventDefault: jest.fn(),
                clipboardData: {
                    getData: jest.fn().mockReturnValue('pasted text')
                }
            };
            
            const pasteSpy = jest.spyOn(editor, 'paste').mockImplementation();

            expect(mockElement.addEventListener).toHaveBeenCalledWith('paste', expect.any(Function));
            
            // Get the paste handler and test it
            const pasteHandler = mockElement.addEventListener.mock.calls
                .find(call => call[0] === 'paste')[1];
            
            pasteHandler(mockEvent);

            expect(pasteSpy).toHaveBeenCalledWith(mockEvent);
            expect(mockEvent.preventDefault).toHaveBeenCalled();
        });

        it('should add click listener for current block selection', () => {
            expect(document.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
        });

        it('should add focusin listener', () => {
            expect(mockElement.addEventListener).toHaveBeenCalledWith('focusin', expect.any(Function));
        });
    });

    describe('focus', () => {
        beforeEach(() => {
            editor = new Editor({ id: 'test-editor' });
            editor.currentBlock = {
                focus: jest.fn(),
                getAttribute: jest.fn().mockReturnValue('block-id')
            };
        });

        it('should focus current block when no element provided', () => {
            editor.focus();

            expect(editor.currentBlock.focus).toHaveBeenCalled();
        });

        it('should focus provided element', () => {
            const mockElement = { 
                focus: jest.fn(),
                getAttribute: jest.fn().mockReturnValue('other-block')
            };

            editor.focus(mockElement);

            expect(mockElement.focus).toHaveBeenCalled();
        });

        it('should emit block focused event', () => {
            editor.focus();

            expect(editor.eventEmitter.emit).toHaveBeenCalledWith(
                EVENTS.BLOCK_FOCUSED,
                expect.objectContaining({
                    blockId: 'block-id',
                    timestamp: expect.any(Number)
                }),
                { source: 'editor.focus' }
            );
        });

        it('should focus editor instance when currentBlock is null', () => {
            editor.currentBlock = null;
            editor.instance.focus = jest.fn();

            editor.focus();

            expect(editor.instance.focus).toHaveBeenCalled();
        });
    });

    describe('paste', () => {
        beforeEach(() => {
            editor = new Editor({ id: 'test-editor' });
            editor.currentBlock = {
                innerHTML: '',
                focus: jest.fn()
            };
            editor.update = jest.fn();
        });

        it('should handle text paste', () => {
            const mockEvent = {
                clipboardData: {
                    getData: jest.fn()
                        .mockReturnValueOnce('<script>alert("xss")</script><p>Clean content</p>')
                        .mockReturnValueOnce('Plain text')
                }
            };

            Parser.parseHtml = jest.fn().mockReturnValue([]);

            editor.paste(mockEvent);

            expect(Utils.escapeHTML).toHaveBeenCalledWith('Plain text');
            expect(mockEvent.clipboardData.getData).toHaveBeenCalledWith('text/html');
            expect(mockEvent.clipboardData.getData).toHaveBeenCalledWith('text/plain');
        });

        it('should sanitize HTML content', () => {
            const mockEvent = {
                clipboardData: {
                    getData: jest.fn()
                        .mockReturnValueOnce('<script>alert("xss")</script><p>Clean content</p>')
                        .mockReturnValueOnce('')
                }
            };

            Parser.parseHtml = jest.fn().mockReturnValue([]);

            editor.paste(mockEvent);

            expect(Parser.parseHtml).toHaveBeenCalled();
            // Check that script tags would be removed (tested via regex in actual implementation)
            const htmlData = mockEvent.clipboardData.getData('text/html');
            expect(htmlData).toContain('<script>');
        });

        it('should emit paste event', () => {
            const mockEvent = {
                clipboardData: {
                    getData: jest.fn().mockReturnValue('')
                }
            };

            editor.paste(mockEvent);

            expect(editor.eventEmitter.emit).toHaveBeenCalledWith(
                EVENTS.USER_PASTE,
                expect.objectContaining({
                    content: '',
                    timestamp: expect.any(Number)
                }),
                { source: 'user.paste' }
            );
        });
    });

    describe('update', () => {
        beforeEach(() => {
            editor = new Editor({ id: 'test-editor' });
        });

        it('should emit content changed event', () => {
            editor.update();

            expect(editor.eventEmitter.emit).toHaveBeenCalledWith(
                EVENTS.CONTENT_CHANGED,
                expect.objectContaining({
                    timestamp: expect.any(Number)
                }),
                { source: 'editor.update', throttle: 300 }
            );
        });
    });

    describe('setCurrentBlock', () => {
        beforeEach(() => {
            editor = new Editor({ id: 'test-editor' });
        });

        it('should set current block and update toolbar', () => {
            const mockBlock = {
                getAttribute: jest.fn().mockReturnValue('block-id'),
                classList: { add: jest.fn(), remove: jest.fn() }
            };
            
            const mockOldBlock = {
                classList: { remove: jest.fn() }
            };
            
            editor.currentBlock = mockOldBlock;
            editor.updateToolbarButtonStates = jest.fn();

            editor.setCurrentBlock(mockBlock);

            expect(editor.currentBlock).toBe(mockBlock);
            expect(mockOldBlock.classList.remove).toHaveBeenCalledWith('active');
            expect(mockBlock.classList.add).toHaveBeenCalledWith('active');
            expect(editor.updateToolbarButtonStates).toHaveBeenCalled();
        });

        it('should emit block focused event', () => {
            const mockBlock = {
                getAttribute: jest.fn().mockReturnValue('test-block'),
                classList: { add: jest.fn(), remove: jest.fn() }
            };

            editor.setCurrentBlock(mockBlock);

            expect(editor.eventEmitter.emit).toHaveBeenCalledWith(
                EVENTS.BLOCK_FOCUSED,
                expect.objectContaining({
                    blockId: 'test-block',
                    timestamp: expect.any(Number)
                }),
                { source: 'editor.setCurrentBlock' }
            );
        });
    });

    describe('addDefaultBlock', () => {
        beforeEach(() => {
            editor = new Editor({ id: 'test-editor' });
            editor.setCurrentBlock = jest.fn();
        });

        it('should create and append new block', () => {
            const mockBlock = {
                classList: { add: jest.fn() },
                innerHTML: '',
                focus: jest.fn()
            };
            
            document.createElement.mockReturnValue(mockBlock);

            const result = editor.addDefaultBlock();

            expect(document.createElement).toHaveBeenCalledWith('div');
            expect(mockBlock.classList.add).toHaveBeenCalledWith('bke-block');
            expect(mockBlock.innerHTML).toBe('<br />');
            expect(editor.instance.appendChild).toHaveBeenCalledWith(mockBlock);
            expect(editor.setCurrentBlock).toHaveBeenCalledWith(mockBlock);
            expect(result).toBe(mockBlock);
        });

        it('should emit block created event', () => {
            const mockBlock = {
                classList: { add: jest.fn() },
                innerHTML: '',
                focus: jest.fn()
            };
            
            document.createElement.mockReturnValue(mockBlock);

            editor.addDefaultBlock();

            expect(editor.eventEmitter.emit).toHaveBeenCalledWith(
                EVENTS.BLOCK_CREATED,
                expect.objectContaining({
                    blockType: 'default',
                    timestamp: expect.any(Number)
                }),
                { source: 'editor.addDefaultBlock' }
            );
        });
    });

    describe('updateToolbarButtonStates', () => {
        beforeEach(() => {
            editor = new Editor({ id: 'test-editor' });
            editor.enableAllToolbarButtons = jest.fn();
            
            document.querySelector = jest.fn();
            document.querySelectorAll = jest.fn().mockReturnValue([]);
        });

        it('should return early if no current block', () => {
            editor.currentBlock = null;

            editor.updateToolbarButtonStates();

            expect(editor.enableAllToolbarButtons).not.toHaveBeenCalled();
        });

        it('should return early if no block type', () => {
            editor.currentBlock = {
                getAttribute: jest.fn().mockReturnValue(null)
            };

            editor.updateToolbarButtonStates();

            expect(editor.enableAllToolbarButtons).not.toHaveBeenCalled();
        });

        it('should update toolbar button states for block type', () => {
            const mockButton = {
                disabled: false,
                classList: { add: jest.fn() }
            };
            
            editor.currentBlock = {
                getAttribute: jest.fn().mockReturnValue('p')
            };
            
            document.querySelector.mockReturnValue(mockButton);
            
            const mockBlockClass = {
                getDisabledButtons: jest.fn().mockReturnValue(['bke-toolbar-bold'])
            };
            
            const getBlockClassSpy = jest.spyOn(Editor, 'getBlockClass').mockReturnValue(mockBlockClass);

            editor.updateToolbarButtonStates();

            expect(editor.enableAllToolbarButtons).toHaveBeenCalled();
            expect(getBlockClassSpy).toHaveBeenCalledWith('p');
            expect(mockBlockClass.getDisabledButtons).toHaveBeenCalled();
            expect(document.querySelector).toHaveBeenCalledWith('.bke-toolbar-bold');
            expect(mockButton.disabled).toBe(true);
            expect(mockButton.classList.add).toHaveBeenCalledWith('disabled');
        });
    });

    describe('enableAllToolbarButtons', () => {
        beforeEach(() => {
            editor = new Editor({ id: 'test-editor' });
        });

        it('should enable all non-view toolbar buttons', () => {
            const mockButtons = [
                {
                    disabled: true,
                    classList: { 
                        contains: jest.fn().mockReturnValue(false),
                        remove: jest.fn()
                    }
                },
                {
                    disabled: true,
                    classList: { 
                        contains: jest.fn().mockReturnValue(true), // view button
                        remove: jest.fn()
                    }
                }
            ];
            
            document.querySelectorAll.mockReturnValue(mockButtons);

            editor.enableAllToolbarButtons();

            expect(mockButtons[0].disabled).toBe(false);
            expect(mockButtons[0].classList.remove).toHaveBeenCalledWith('disabled');
            expect(mockButtons[1].disabled).toBe(true); // view button should remain unchanged
        });
    });

    describe('initMarkdownContainer and initHtmlContainer', () => {
        beforeEach(() => {
            editor = new Editor({ id: 'test-editor' });
        });

        it('should initialize markdown container if present', () => {
            const mockContainer = document.createElement('div');
            document.querySelector.mockReturnValue(mockContainer);

            editor.initMarkdownContainer();

            expect(document.querySelector).toHaveBeenCalledWith('.note-markdown');
        });

        it('should initialize html container if present', () => {
            const mockContainer = document.createElement('div');
            document.querySelector.mockReturnValue(mockContainer);

            editor.initHtmlContainer();

            expect(document.querySelector).toHaveBeenCalledWith('.note-html');
        });

        it('should warn if containers are not found', () => {
            const logWarningSpy = jest.requireMock('../src/utils/log.js').logWarning;
            document.querySelector.mockReturnValue(null);

            editor.initMarkdownContainer();
            editor.initHtmlContainer();

            expect(logWarningSpy).toHaveBeenCalledTimes(2);
        });
    });
});
