import { Editor } from '../src/Editor.js';
import { BlockFactory } from '../src/blocks/BlockFactory.js';

// Create a mock DOM element
const mockDiv = document.createElement('div');
mockDiv.innerHTML = '';

// Test the specific issue: creating UL in empty editor
describe('UnorderedList in Empty Editor Fix', () => {
    let editorInstance;
    
    beforeEach(() => {
        // Clear previous state
        mockDiv.innerHTML = '';
        
        // Create a new editor instance
        editorInstance = new Editor(mockDiv);
    });
    
    afterEach(() => {
        if (editorInstance) {
            // Clean up the instance
            Editor._instances.delete(mockDiv);
        }
    });
    
    test('should create unordered list in empty editor without infinite recursion', () => {
        // Verify editor starts empty
        expect(mockDiv.querySelectorAll('.bke-block').length).toBe(0);
        console.log('Before calling convertCurrentBlockOrCreate');
        console.log('Editor instance:', editorInstance);
        console.log('Editor instance type:', typeof editorInstance);
        console.log('convertCurrentBlockOrCreate method:', typeof editorInstance.convertCurrentBlockOrCreate);
        
        try {
            // Attempt to create unordered list via convertCurrentBlockOrCreate
            const success = editorInstance.convertCurrentBlockOrCreate('ul');
            console.log('convertCurrentBlockOrCreate returned:', success);
            
            // Should succeed
            expect(success).toBe(true);
        } catch (error) {
            console.error('Error calling convertCurrentBlockOrCreate:', error);
            throw error;
        }
        
        // Should have created a UL block
        const blocks = mockDiv.querySelectorAll('.bke-block');
        expect(blocks.length).toBe(1);
        
        const ulBlock = mockDiv.querySelector('[data-block-type="ul"]');
        expect(ulBlock).not.toBeNull();
        
        // Should contain a UL element with at least one LI
        const ulElement = ulBlock.querySelector('ul');
        expect(ulElement).not.toBeNull();
        
        const listItems = ulElement.querySelectorAll('li');
        expect(listItems.length).toBe(1);
        expect(listItems[0].contentEditable).toBe("true");
    });
    
    test('should handle empty editor case when creating list via toolbar', () => {
        // Verify editor starts empty
        expect(mockDiv.querySelectorAll('.bke-block').length).toBe(0);
        
        // Clear current block to simulate empty editor
        editorInstance.currentBlock = null;
        
        // Test the createNewBlock method directly
        const success = editorInstance.createNewBlock('ul');
        
        // Should succeed without infinite recursion
        expect(success).toBe(true);
        
        // Should have a UL block
        const ulBlock = mockDiv.querySelector('[data-block-type="ul"]');
        expect(ulBlock).not.toBeNull();
    });
});
