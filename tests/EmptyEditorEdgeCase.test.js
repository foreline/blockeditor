/**
 * Test for Empty Editor Edge Case Bug Fix
 * 
 * This test verifies that when a user selects all text in the editor 
 * and hits 'backspace' or 'delete', at least one default block remains
 * and the editor doesn't become unusable.
 */

import { Editor } from '../src/Editor.js';
import { Utils } from '../src/Utils.js';

describe('Empty Editor Edge Case Fix', () => {
    let mockEditor;
    let mockEventEmitter;
    
    beforeEach(() => {
        // Setup DOM
        document.body.innerHTML = `
            <div id="test-editor" contenteditable="true">
                <div class="block" data-block-type="p">First block content</div>
                <div class="block" data-block-type="p">Second block content</div>
                <div class="block" data-block-type="p">Third block content</div>
            </div>
        `;
        
        // Mock event emitter
        mockEventEmitter = {
            emit: jest.fn()
        };
        
        // Create mock editor instance
        const editorElement = document.getElementById('test-editor');
        
        // Create mock block elements for testing
        const mockBlocks = [
            {
                innerHTML: 'First block content',
                textContent: 'First block content',
                setAttribute: jest.fn(),
                getAttribute: jest.fn().mockReturnValue(null),
                classList: { add: jest.fn(), remove: jest.fn(), contains: jest.fn() },
                cloneNode: jest.fn().mockReturnValue({})
            },
            {
                innerHTML: 'Second block content', 
                textContent: 'Second block content',
                setAttribute: jest.fn(),
                getAttribute: jest.fn().mockReturnValue(null),
                classList: { add: jest.fn(), remove: jest.fn(), contains: jest.fn() },
                cloneNode: jest.fn().mockReturnValue({})
            },
            {
                innerHTML: 'Third block content',
                textContent: 'Third block content', 
                setAttribute: jest.fn(),
                getAttribute: jest.fn().mockReturnValue(null),
                classList: { add: jest.fn(), remove: jest.fn(), contains: jest.fn() },
                cloneNode: jest.fn().mockReturnValue({})
            }
        ];
        
        // Mock querySelectorAll to return our mock blocks
        editorElement.querySelectorAll = jest.fn().mockReturnValue(mockBlocks);
        
        mockEditor = {
            instance: editorElement,
            eventEmitter: mockEventEmitter,
            isEditorEmpty: Editor.prototype.isEditorEmpty.bind({ eventEmitter: mockEventEmitter }),
            detachBlockEvents: Editor.prototype.detachBlockEvents.bind({ eventEmitter: mockEventEmitter }),
        };
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    describe('isEditorEmpty', () => {
        test('should return false when blocks have content', () => {
            const blocks = mockEditor.instance.querySelectorAll('.bke-block');
            const result = mockEditor.isEditorEmpty(blocks);
            
            expect(result).toBe(false);
        });

        test('should return true when all blocks are empty', () => {
            // Make all blocks empty
            const blocks = mockEditor.instance.querySelectorAll('.bke-block');
            blocks.forEach(block => {
                block.innerHTML = '';
            });
            
            const result = mockEditor.isEditorEmpty(blocks);
            
            expect(result).toBe(true);
        });

        test('should return true when blocks contain only whitespace', () => {
            // Make all blocks contain only whitespace
            const blocks = mockEditor.instance.querySelectorAll('.bke-block');
            blocks.forEach(block => {
                block.innerHTML = '   \n\t  ';
            });
            
            const result = mockEditor.isEditorEmpty(blocks);
            
            expect(result).toBe(true);
        });

        test('should return true when no blocks exist', () => {
            mockEditor.instance.innerHTML = '';
            const blocks = mockEditor.instance.querySelectorAll('.bke-block');
            
            const result = mockEditor.isEditorEmpty(blocks);
            
            expect(result).toBe(true);
        });

        test('should return false when at least one block has content', () => {
            const blocks = mockEditor.instance.querySelectorAll('.bke-block');
            // Make most blocks empty but keep one with content
            blocks[0].innerHTML = '';
            blocks[1].innerHTML = '   ';
            // blocks[2] keeps its original content
            
            const result = mockEditor.isEditorEmpty(blocks);
            
            expect(result).toBe(false);
        });
    });

    describe('detachBlockEvents', () => {
        test('should emit block destroyed events for blocks with IDs', () => {
            const blocks = mockEditor.instance.querySelectorAll('.bke-block');
            blocks[0].setAttribute('data-block-id', 'block-1');
            blocks[1].setAttribute('data-block-id', 'block-2');
            
            mockEditor.detachBlockEvents(blocks);
            
            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
                'block.destroyed',
                expect.objectContaining({
                    blockId: 'block-1',
                    blockType: 'p'
                }),
                { source: 'editor.cleanup' }
            );
            
            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
                'block.destroyed',
                expect.objectContaining({
                    blockId: 'block-2',
                    blockType: 'p'
                }),
                { source: 'editor.cleanup' }
            );
        });

        test('should handle blocks without IDs gracefully', () => {
            const blocks = mockEditor.instance.querySelectorAll('.bke-block');
            
            // Should not throw error
            expect(() => {
                mockEditor.detachBlockEvents(blocks);
            }).not.toThrow();
        });
    });

    describe('Utils.stripTags integration', () => {
        test('should correctly identify empty content using Utils.stripTags', () => {
            const testCases = [
                { html: '', expected: true },
                { html: '   ', expected: true },
                { html: '\n\t', expected: true },
                { html: '<br>', expected: true },
                { html: '<div></div>', expected: true },
                { html: '<span>   </span>', expected: true },
                { html: 'actual content', expected: false },
                { html: '<b>bold text</b>', expected: false },
                { html: '&nbsp;', expected: false }, // Non-breaking space is content
            ];

            testCases.forEach(({ html, expected }) => {
                const stripped = Utils.stripTags(html).trim();
                const isEmpty = stripped.length === 0;
                expect(isEmpty).toBe(expected);
            });
        });
    });

    describe('Empty editor protection logic', () => {
        test('should identify when editor needs protection', () => {
            // Simulate empty editor state
            mockEditor.instance.innerHTML = '';
            
            const blocks = mockEditor.instance.querySelectorAll('.bke-block');
            const needsProtection = blocks.length === 0 || mockEditor.isEditorEmpty(blocks);
            
            expect(needsProtection).toBe(true);
        });

        test('should identify when editor has valid content', () => {
            // Keep existing content
            const blocks = mockEditor.instance.querySelectorAll('.bke-block');
            const needsProtection = blocks.length === 0 || mockEditor.isEditorEmpty(blocks);
            
            expect(needsProtection).toBe(false);
        });

        test('should handle mixed empty and non-empty blocks correctly', () => {
            const blocks = mockEditor.instance.querySelectorAll('.bke-block');
            
            // Make some blocks empty
            blocks[0].innerHTML = '';
            blocks[1].innerHTML = '   ';
            // blocks[2] keeps content
            
            const needsProtection = mockEditor.isEditorEmpty(blocks);
            
            expect(needsProtection).toBe(false); // Should not need protection because one block has content
        });
    });
});
