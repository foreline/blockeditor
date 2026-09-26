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
jest.mock('../src/icons.js', () => ({ ICONS: {} }));
jest.mock('../src/utils/syntaxHighlighter.js', () => ({
    SyntaxHighlighter: {
        highlight: jest.fn((code) => code)
    }
}));

// Mock document.execCommand
document.execCommand = jest.fn();

// Helper: build a Toolbar instance without real DOM side effects
function makeToolbar(editorOverrides = {}) {
    const createToolbarSpy = jest.spyOn(Toolbar.prototype, 'createToolbar').mockImplementation(() => {});
    const mockContentArea = {
        classList: { add: jest.fn(), remove: jest.fn(), contains: jest.fn().mockReturnValue(false) }
    };
    const mockViewContainer = {
        classList: { add: jest.fn(), remove: jest.fn(), contains: jest.fn().mockReturnValue(false) },
        querySelector: jest.fn().mockReturnValue({ innerHTML: '' })
    };
    const mockBtn = { disabled: false };
    const mockContainer = {
        appendChild: jest.fn(),
        querySelector: jest.fn().mockImplementation((selector) => {
            if (selector === '.bke-editor-markdown' || selector === '.bke-editor-html') {
                return mockViewContainer;
            }
            return mockBtn;
        })
    };
    const mockEditorInstance = {
        convertCurrentBlockOrCreate: jest.fn().mockReturnValue(false),
        convertBlockType: jest.fn().mockReturnValue(true),
        findEditableElementInBlock: jest.fn().mockReturnValue({ textContent: 'Heading text' }),
        currentBlock: { id: 'block-1' },
        update: jest.fn(),
        getMarkdown: jest.fn().mockReturnValue('# Test'),
        getHtml: jest.fn().mockReturnValue('<h1>Test</h1>'),
        contentArea: mockContentArea,
        ...editorOverrides
    };
    const toolbar = new Toolbar({ container: mockContainer, config: [], editorInstance: mockEditorInstance });
    toolbar.editorInstance = mockEditorInstance;
    toolbar.container = mockContainer;
    createToolbarSpy.mockRestore();
    return { toolbar, mockEditorInstance, mockContainer, mockContentArea, mockViewContainer };
}

describe('Toolbar', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        document.createElement = jest.fn().mockImplementation(() => ({
            className: '',
            classList: { add: jest.fn(), remove: jest.fn(), toggle: jest.fn(), contains: jest.fn().mockReturnValue(false) },
            appendChild: jest.fn(),
            addEventListener: jest.fn(),
            setAttribute: jest.fn(),
            getAttribute: jest.fn(),
            querySelector: jest.fn().mockReturnValue(null),
            innerHTML: '',
            textContent: '',
            style: {}
        }));
        document.querySelector = jest.fn().mockReturnValue({
            classList: { add: jest.fn(), remove: jest.fn() },
            style: {},
            disabled: false,
            textContent: ''
        });
        document.querySelectorAll = jest.fn().mockReturnValue([]);
        ToolbarHandlers.init = jest.fn();
        eventEmitter.emit = jest.fn();
    });

    describe('constructor', () => {
        it('pins toolbars by default and keeps each instance toggle independent', () => {
            document.createElement = global._originalCreateElement;
            const first = new Toolbar({ container: document.createElement('div'), config: [] });
            const second = new Toolbar({ container: document.createElement('div'), config: [], pinned: false });
            expect(first.element.classList.contains('bke-toolbar--pinned')).toBe(true);
            expect(second.element.classList.contains('bke-toolbar--pinned')).toBe(false);
            first.togglePinned();
            expect(first.element.querySelector('.bke-toolbar-pin').getAttribute('aria-pressed')).toBe('false');
            second.togglePinned();
            expect(second.element.querySelector('.bke-toolbar-pin').getAttribute('aria-label')).toBe('Unpin toolbar');
            expect(first.pinned).toBe(false);
        });
        it('should call createToolbar, ToolbarHandlers.init and emit EDITOR_INITIALIZED', () => {
            const createToolbarSpy = jest.spyOn(Toolbar.prototype, 'createToolbar').mockImplementation(() => {});
            const container = { appendChild: jest.fn() };
            const config = [];
            const toolbar = new Toolbar({ container, config, editorInstance: {} });
            expect(createToolbarSpy).toHaveBeenCalledWith(container, config, undefined, {});
            expect(ToolbarHandlers.init).toHaveBeenCalledWith(toolbar);
            expect(eventEmitter.emit).toHaveBeenCalledWith(
                EVENTS.EDITOR_INITIALIZED,
                expect.objectContaining({ toolbarContainer: container, toolbarConfig: config }),
                { source: 'toolbar.init' }
            );
            createToolbarSpy.mockRestore();
        });
    });

    describe('undo / redo', () => {
        it('should execute undo and call after', () => {
            const { toolbar, mockEditorInstance } = makeToolbar();
            toolbar.undo();
            expect(document.execCommand).toHaveBeenCalledWith('undo');
            expect(mockEditorInstance.update).toHaveBeenCalled();
        });
        it('should execute redo and call after', () => {
            const { toolbar, mockEditorInstance } = makeToolbar();
            toolbar.redo();
            expect(document.execCommand).toHaveBeenCalledWith('redo');
            expect(mockEditorInstance.update).toHaveBeenCalled();
        });
    });

    describe('heading / paragraph methods', () => {
        it.each(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])('%s() calls convertCurrentBlockOrCreate', (method) => {
            const { toolbar, mockEditorInstance } = makeToolbar();
            toolbar[method]();
            expect(mockEditorInstance.convertCurrentBlockOrCreate).toHaveBeenCalledWith(method);
            expect(mockEditorInstance.update).toHaveBeenCalled();
        });
        it('h1() falls back to execCommand without editorInstance', () => {
            const { toolbar } = makeToolbar();
            toolbar.editorInstance = null;
            toolbar.h1();
            expect(document.execCommand).toHaveBeenCalledWith('formatBlock', false, '<h1>');
        });
        it('paragraph() converts the tracked block instead of only its DOM appearance', () => {
            const { toolbar, mockEditorInstance } = makeToolbar();
            toolbar.paragraph();
            expect(mockEditorInstance.convertBlockType).toHaveBeenCalledWith(mockEditorInstance.currentBlock, 'paragraph', 'Heading text');
            expect(document.execCommand).not.toHaveBeenCalled();
            expect(mockEditorInstance.update).toHaveBeenCalled();
        });
    });

    describe('text formatting', () => {
        it.each([['bold','bold'],['italic','italic'],['underline','underline'],['strikethrough','strikeThrough']])('%s() calls execCommand', (method, command) => {
            const { toolbar, mockEditorInstance } = makeToolbar();
            toolbar[method]();
            expect(document.execCommand).toHaveBeenCalledWith(command);
            expect(mockEditorInstance.update).toHaveBeenCalled();
        });
    });

    describe('list methods', () => {
        it('ul() calls convertCurrentBlockOrCreate', () => {
            const { toolbar, mockEditorInstance } = makeToolbar();
            toolbar.ul();
            expect(mockEditorInstance.convertCurrentBlockOrCreate).toHaveBeenCalledWith('ul');
            expect(mockEditorInstance.update).toHaveBeenCalled();
        });
        it('ul() falls back to execCommand without editorInstance', () => {
            const { toolbar } = makeToolbar();
            toolbar.editorInstance = null;
            toolbar.ul();
            expect(document.execCommand).toHaveBeenCalledWith('insertUnorderedList');
        });
        it('ol() calls convertCurrentBlockOrCreate', () => {
            const { toolbar, mockEditorInstance } = makeToolbar();
            toolbar.ol();
            expect(mockEditorInstance.convertCurrentBlockOrCreate).toHaveBeenCalledWith('ol');
            expect(mockEditorInstance.update).toHaveBeenCalled();
        });
    });

    describe('sq (task list)', () => {
        it('calls convertCurrentBlockOrCreate for sq', () => {
            const { toolbar, mockEditorInstance } = makeToolbar();
            toolbar.sq();
            expect(mockEditorInstance.convertCurrentBlockOrCreate).toHaveBeenCalledWith('sq');
            expect(mockEditorInstance.update).toHaveBeenCalled();
        });
        it('falls back to BlockFactory when convertCurrentBlockOrCreate returns false', () => {
            const mockBlock = { applyTransformation: jest.fn() };
            BlockFactory.createBlock = jest.fn().mockReturnValue(mockBlock);
            const { toolbar, mockEditorInstance } = makeToolbar({ convertCurrentBlockOrCreate: jest.fn().mockReturnValue(false), currentBlock: { id: 'block-1' } });
            toolbar.sq();
            expect(BlockFactory.createBlock).toHaveBeenCalledWith('sq');
            expect(mockBlock.applyTransformation).toHaveBeenCalled();
            expect(mockEditorInstance.update).toHaveBeenCalled();
        });
        it('returns early if no currentBlock', () => {
            BlockFactory.createBlock = jest.fn();
            const { toolbar } = makeToolbar({ convertCurrentBlockOrCreate: jest.fn().mockReturnValue(false), currentBlock: null });
            toolbar.sq();
            expect(BlockFactory.createBlock).not.toHaveBeenCalled();
        });
    });

    describe('code', () => {
        it('calls convertCurrentBlockOrCreate for code', () => {
            const { toolbar, mockEditorInstance } = makeToolbar({ convertCurrentBlockOrCreate: jest.fn().mockReturnValue(true) });
            toolbar.code();
            expect(mockEditorInstance.convertCurrentBlockOrCreate).toHaveBeenCalledWith('code');
            expect(mockEditorInstance.update).toHaveBeenCalled();
        });
    });

    describe('tab', () => {
        it('inserts tab characters', () => {
            const { toolbar, mockEditorInstance } = makeToolbar();
            toolbar.tab();
            expect(document.execCommand).toHaveBeenCalledWith('insertText', false, '    ');
            expect(mockEditorInstance.update).toHaveBeenCalled();
        });
    });

    describe('view methods', () => {
        it('text() shows contentArea and hides view containers', () => {
            const { toolbar, mockContentArea } = makeToolbar();
            toolbar.text();
            expect(mockContentArea.classList.remove).toHaveBeenCalledWith('bke-hidden');
        });
        it('text() calls debugTooltip.show() if present', () => {
            const mockDebugTooltip = { show: jest.fn(), hide: jest.fn() };
            const { toolbar } = makeToolbar({ debugTooltip: mockDebugTooltip });
            toolbar.text();
            expect(mockDebugTooltip.show).toHaveBeenCalled();
        });
        it('markdown() hides contentArea', () => {
            const { toolbar, mockContentArea } = makeToolbar();
            toolbar.markdown();
            expect(mockContentArea.classList.add).toHaveBeenCalledWith('bke-hidden');
        });
        it('markdown() calls debugTooltip.hide() if present', () => {
            const mockDebugTooltip = { show: jest.fn(), hide: jest.fn() };
            const { toolbar } = makeToolbar({ debugTooltip: mockDebugTooltip });
            toolbar.markdown();
            expect(mockDebugTooltip.hide).toHaveBeenCalled();
        });
        it('markdown() calls editorInstance.getMarkdown', () => {
            const { toolbar, mockEditorInstance } = makeToolbar();
            toolbar.markdown();
            expect(mockEditorInstance.getMarkdown).toHaveBeenCalled();
        });
        it('html() hides contentArea', () => {
            const { toolbar, mockContentArea } = makeToolbar();
            toolbar.html();
            expect(mockContentArea.classList.add).toHaveBeenCalledWith('bke-hidden');
        });
        it('html() calls debugTooltip.hide() if present', () => {
            const mockDebugTooltip = { show: jest.fn(), hide: jest.fn() };
            const { toolbar } = makeToolbar({ debugTooltip: mockDebugTooltip });
            toolbar.html();
            expect(mockDebugTooltip.hide).toHaveBeenCalled();
        });
        it('html() calls editorInstance.getHtml', () => {
            const { toolbar, mockEditorInstance } = makeToolbar();
            toolbar.html();
            expect(mockEditorInstance.getHtml).toHaveBeenCalled();
        });
    });

    describe('table / image', () => {
        it('table() calls convertCurrentBlockOrCreate with table', () => {
            const { toolbar, mockEditorInstance } = makeToolbar({ convertCurrentBlockOrCreate: jest.fn().mockReturnValue(true) });
            toolbar.table();
            expect(mockEditorInstance.convertCurrentBlockOrCreate).toHaveBeenCalledWith('table');
            expect(mockEditorInstance.update).toHaveBeenCalled();
        });
        it('image() calls convertCurrentBlockOrCreate with image', () => {
            const { toolbar, mockEditorInstance } = makeToolbar({ convertCurrentBlockOrCreate: jest.fn().mockReturnValue(true) });
            toolbar.image();
            expect(mockEditorInstance.convertCurrentBlockOrCreate).toHaveBeenCalledWith('image');
            expect(mockEditorInstance.update).toHaveBeenCalled();
        });
    });

    describe('createToolbar', () => {
        it('creates a bke-toolbar div and inserts it into the container', () => {
            const container = { insertBefore: jest.fn(), firstChild: null };
            const toolbar = Object.create(Toolbar.prototype);
            toolbar.customIcons = {};
            document.createElement = global._originalCreateElement;
            toolbar.createToolbar(container, [], false, {});
            expect(toolbar.element.classList.contains('bke-toolbar')).toBe(true);
            expect(container.insertBefore).toHaveBeenCalledWith(toolbar.element, null);
        });
        it('handles config.config format', () => {
            const container = { insertBefore: jest.fn(), firstChild: null };
            const toolbar = Object.create(Toolbar.prototype);
            toolbar.customIcons = {};
            document.createElement = global._originalCreateElement;
            toolbar.createToolbar(container, { config: [] }, false, {});
            expect(container.insertBefore).toHaveBeenCalledWith(toolbar.element, null);
        });
        it('renders labels on standalone toolbar buttons', () => {
            const container = { insertBefore: jest.fn(), firstChild: null };
            const toolbar = Object.create(Toolbar.prototype);
            toolbar.createToolbar(container, [{ group: [{ class: 'bke-toolbar-header1', label: 'H1' }] }]);
            const button = document.createElement.mock.results.map(result => result.value)
                .find(element => element.className === 'bke-toolbar-header1');
            expect(button.textContent).toBe('H1');
            expect(button.type).toBe('button');
        });
    });
});
