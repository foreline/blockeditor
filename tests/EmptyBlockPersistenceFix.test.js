/**
 * Test for empty block persistence fix
 * This test verifies that the isCreatingBlock flag prevents empty blocks from being removed
 */

import { Editor } from '../src/Editor.js';
import { BlockType } from '../src/BlockType.js';

describe('Empty Block Persistence Fix', () => {
    let editor;
    let mockContainer;

    beforeEach(() => {
        // Create a mock DOM container
        mockContainer = document.createElement('div');
        mockContainer.id = 'test-editor';
        document.body.appendChild(mockContainer);

        // Create editor instance with proper options
        editor = new Editor({
            container: mockContainer,
            toolbar: false  // Disable toolbar for tests
        });
        editor.init();
    });

    afterEach(() => {
        // Clean up
        if (mockContainer && mockContainer.parentNode) {
            mockContainer.parentNode.removeChild(mockContainer);
        }
    });

    test('should have isCreatingBlock flag available', () => {
        expect(editor.isCreatingBlock).toBeDefined();
        expect(editor.isCreatingBlock).toBe(false);
    });

    test('should set isCreatingBlock flag when calling addDefaultBlock', async () => {
        // Initially false
        expect(editor.isCreatingBlock).toBe(false);

        // Call addDefaultBlock - this should set the flag temporarily
        const newBlock = editor.addDefaultBlock();
        
        // Flag should be set immediately
        expect(editor.isCreatingBlock).toBe(true);
        expect(newBlock).toBeTruthy();

        // Wait for the flag to be cleared
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // Flag should be cleared after processing
        expect(editor.isCreatingBlock).toBe(false);
    });

    test('should create and persist empty blocks without removal', async () => {
        const initialBlockCount = editor.instance.querySelectorAll('.bke-block').length;
        
        // Add a new empty block
        const newBlock = editor.addDefaultBlock();
        
        // Block should be created
        expect(newBlock).toBeTruthy();
        
        // Wait for all processing to complete
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Check that the block persists
        const finalBlockCount = editor.instance.querySelectorAll('.bke-block').length;
        expect(finalBlockCount).toBe(initialBlockCount + 1);
        
        // The new block should be empty but still exist
        const lastBlock = editor.instance.querySelectorAll('.bke-block')[finalBlockCount - 1];
        expect(lastBlock.textContent.trim()).toBe('');
        expect(lastBlock.isConnected).toBe(true);
    });

    test('should create multiple empty blocks and persist them all', async () => {
        const initialBlockCount = editor.instance.querySelectorAll('.bke-block').length;
        
        // Add multiple empty blocks
        const block1 = editor.addDefaultBlock();
        await new Promise(resolve => setTimeout(resolve, 60));
        
        const block2 = editor.addDefaultBlock();
        await new Promise(resolve => setTimeout(resolve, 60));
        
        const block3 = editor.addDefaultBlock();
        await new Promise(resolve => setTimeout(resolve, 60));
        
        // Wait for all processing to complete
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // All blocks should persist
        const finalBlockCount = editor.instance.querySelectorAll('.bke-block').length;
        expect(finalBlockCount).toBe(initialBlockCount + 3);
        
        // All three new blocks should exist and be empty
        const allBlocks = editor.instance.querySelectorAll('.bke-block');
        const lastThreeBlocks = Array.from(allBlocks).slice(-3);
        
        lastThreeBlocks.forEach((block, index) => {
            expect(block.textContent.trim()).toBe('');
            expect(block.isConnected).toBe(true);
            expect(block.getAttribute('data-block-type')).toBe('p');
        });
    });

    test('should not interfere with empty editor protection for truly empty editor', async () => {
        // Clear all blocks to make editor truly empty
        editor.instance.innerHTML = '';
        
        // Trigger an input event to test empty editor protection
        const inputEvent = new Event('input', { bubbles: true });
        editor.instance.dispatchEvent(inputEvent);
        
        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Editor should have created at least one default block
        const blocks = editor.instance.querySelectorAll('.bke-block');
        expect(blocks.length).toBeGreaterThan(0);
    });

    test('should allow Enter key to create new empty blocks that persist', async () => {
        // Ensure we have at least one block
        if (editor.instance.querySelectorAll('.bke-block').length === 0) {
            editor.addDefaultBlock();
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        const initialBlockCount = editor.instance.querySelectorAll('.bke-block').length;
        const blocks = editor.instance.querySelectorAll('.bke-block');
        const lastBlock = blocks[blocks.length - 1];
        
        // Focus on the last block and make it empty
        editor.setCurrentBlock(lastBlock);
        lastBlock.innerHTML = '';
        editor.focus(lastBlock);
        
        // Simulate Enter key press
        const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            bubbles: true,
            cancelable: true
        });
        
        lastBlock.dispatchEvent(enterEvent);
        
        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Should have created a new block
        const finalBlockCount = editor.instance.querySelectorAll('.bke-block').length;
        expect(finalBlockCount).toBe(initialBlockCount + 1);
        
        // Wait a bit more to ensure blocks persist
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Blocks should still be there
        const persistentBlockCount = editor.instance.querySelectorAll('.bke-block').length;
        expect(persistentBlockCount).toBe(finalBlockCount);
    });
});
