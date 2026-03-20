/**
 * Tests for Toolbar Groups functionality
 */

import { Toolbar } from '../src/Toolbar.js';

// Mock FontAwesome and Bootstrap dependencies
global.document.querySelector = jest.fn();
global.document.createElement = jest.fn();

// Mock log function
jest.mock('../src/utils/log.js', () => ({
    log: jest.fn()
}));

// Mock ToolbarHandlers
jest.mock('../src/ToolbarHandlers.js', () => ({
    ToolbarHandlers: {
        init: jest.fn()
    }
}));

// Mock eventEmitter
jest.mock('../src/utils/eventEmitter.js', () => ({
    eventEmitter: { emit: jest.fn() },
    EVENTS: { EDITOR_INITIALIZED: 'EDITOR_INITIALIZED' }
}));

describe('Toolbar Groups', () => {
    let mockContainer;
    let mockCreatedElements;
    let mockEditorInstance;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Setup mock editor instance
        mockEditorInstance = { update: jest.fn() };
        
        // Setup mock elements
        mockCreatedElements = [];
        mockContainer = {
            insertBefore: jest.fn(),
            firstChild: null
        };

        // Mock document.createElement to track created elements
        global.document.createElement = jest.fn((tagName) => {
            const element = {
                tagName: tagName.toUpperCase(),
                className: '',
                innerHTML: '',
                textContent: '',
                disabled: false,
                type: '',
                id: '',
                title: '',
                appendChild: jest.fn(),
                setAttribute: jest.fn()
            };
            mockCreatedElements.push(element);
            return element;
        });
    });

    /**
     * Helper to create a Toolbar instance with the given config
     */
    function createToolbar(config, debug = false) {
        return new Toolbar({
            container: mockContainer,
            config,
            debug,
            editorInstance: mockEditorInstance
        });
    }

    test('should create toolbar with multiple groups', () => {
        const config = [
            {
                group: [
                    { class: 'editor-toolbar-undo', icon: 'fa-undo', title: 'Undo' },
                    { class: 'editor-toolbar-redo', icon: 'fa-redo', title: 'Redo' }
                ]
            },
            {
                group: [
                    { class: 'editor-toolbar-bold', icon: 'fa-bold', title: 'Bold' },
                    { class: 'editor-toolbar-italic', icon: 'fa-italic', title: 'Italic' }
                ]
            }
        ];

        createToolbar(config);

        // Should create main toolbar div
        const toolbarDiv = mockCreatedElements.find(el => el.className === 'editor-toolbar');
        expect(toolbarDiv).toBeDefined();

        // Should create two group divs
        const groupDivs = mockCreatedElements.filter(el => el.className === 'editor-toolbar-group');
        expect(groupDivs).toHaveLength(2);

        // Should create four buttons (2 per group)
        const buttons = mockCreatedElements.filter(el => el.tagName === 'BUTTON');
        expect(buttons).toHaveLength(4);

        // Check button classes
        expect(buttons.some(btn => btn.className === 'editor-toolbar-undo')).toBe(true);
        expect(buttons.some(btn => btn.className === 'editor-toolbar-redo')).toBe(true);
        expect(buttons.some(btn => btn.className === 'editor-toolbar-bold')).toBe(true);
        expect(buttons.some(btn => btn.className === 'editor-toolbar-italic')).toBe(true);
    });

    test('should create dropdown groups', () => {
        const config = [
            {
                group: [
                    { class: 'editor-toolbar-header1', label: 'Header 1' },
                    { class: 'editor-toolbar-header2', label: 'Header 2' }
                ],
                dropdown: true,
                icon: 'fa-heading',
                id: 'dropdownMenuHeader'
            }
        ];

        createToolbar(config);

        // Should create dropdown div
        const dropdownDiv = mockCreatedElements.find(el => el.className === 'dropdown');
        expect(dropdownDiv).toBeDefined();

        // Should create dropdown button
        const dropdownButton = mockCreatedElements.find(el => 
            el.className === 'btn btn-secondary dropdown-toggle'
        );
        expect(dropdownButton).toBeDefined();
        expect(dropdownButton.id).toBe('dropdownMenuHeader');

        // Should create dropdown menu
        const dropdownMenu = mockCreatedElements.find(el => el.className === 'dropdown-menu');
        expect(dropdownMenu).toBeDefined();

        // Should create list items
        const listItems = mockCreatedElements.filter(el => el.tagName === 'LI');
        expect(listItems).toHaveLength(2);
    });

    test('should handle button properties correctly', () => {
        const config = [
            {
                group: [
                    { 
                        class: 'editor-toolbar-test', 
                        icon: 'fa-test', 
                        title: 'Test Button',
                        disabled: true
                    }
                ]
            }
        ];

        createToolbar(config);

        const button = mockCreatedElements.find(el => el.className === 'editor-toolbar-test');
        expect(button).toBeDefined();
        expect(button.title).toBe('Test Button');
        expect(button.disabled).toBe(true);
        expect(button.innerHTML).toBe('<i class="fa fa-test"></i>');
    });

    test('should organize buttons into logical groups', () => {
        const realConfig = [
            {
                group: [
                    { class: 'editor-toolbar-undo', icon: 'fa-undo', title: 'отменить действие' },
                    { class: 'editor-toolbar-redo', icon: 'fa-redo', title: 'применить действие' }
                ]
            },
            {
                group: [
                    { class: 'editor-toolbar-bold', icon: 'fa-bold', title: 'жирный текст' },
                    { class: 'editor-toolbar-italic', icon: 'fa-italic', title: 'курсив' },
                    { class: 'editor-toolbar-underline', icon: 'fa-underline', title: 'подчеркнутый' },
                    { class: 'editor-toolbar-strikethrough', icon: 'fa-strikethrough', title: 'перечеркнутый' }
                ]
            },
            {
                group: [
                    { class: 'editor-toolbar-ul', icon: 'fa-list', title: 'вставить список' },
                    { class: 'editor-toolbar-ol', icon: 'fa-list-ol', title: 'вставить нумерованный список' },
                    { class: 'editor-toolbar-sq', icon: 'fa-list-check', title: 'вставить список с чекбоксами' }
                ]
            }
        ];

        createToolbar(realConfig);

        // Should create appropriate number of groups
        const groupDivs = mockCreatedElements.filter(el => el.className === 'editor-toolbar-group');
        expect(groupDivs).toHaveLength(3);

        // Should organize buttons logically
        const buttons = mockCreatedElements.filter(el => el.tagName === 'BUTTON');
        
        // History group (undo/redo)
        expect(buttons.some(btn => btn.className === 'editor-toolbar-undo')).toBe(true);
        expect(buttons.some(btn => btn.className === 'editor-toolbar-redo')).toBe(true);
        
        // Formatting group
        expect(buttons.some(btn => btn.className === 'editor-toolbar-bold')).toBe(true);
        expect(buttons.some(btn => btn.className === 'editor-toolbar-italic')).toBe(true);
        expect(buttons.some(btn => btn.className === 'editor-toolbar-underline')).toBe(true);
        expect(buttons.some(btn => btn.className === 'editor-toolbar-strikethrough')).toBe(true);
        
        // Lists group
        expect(buttons.some(btn => btn.className === 'editor-toolbar-ul')).toBe(true);
        expect(buttons.some(btn => btn.className === 'editor-toolbar-ol')).toBe(true);
        expect(buttons.some(btn => btn.className === 'editor-toolbar-sq')).toBe(true);
    });

    test('should insert toolbar into container', () => {
        const config = [
            {
                group: [
                    { class: 'editor-toolbar-test', icon: 'fa-test', title: 'Test' }
                ]
            }
        ];

        createToolbar(config);

        // Should insert toolbar as first child
        expect(mockContainer.insertBefore).toHaveBeenCalledTimes(1);
        const insertedElement = mockContainer.insertBefore.mock.calls[0][0];
        expect(insertedElement.className).toBe('editor-toolbar');
        expect(mockContainer.insertBefore.mock.calls[0][1]).toBe(mockContainer.firstChild);
    });
});
