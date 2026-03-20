'use strict';

import {ListBlock} from "@/blocks/ListBlock";
import {BlockType} from "@/BlockType";
import {Editor} from "@/Editor";

/**
 * Task list block (checkbox list)
 */
export class TaskListBlock extends ListBlock
{
    constructor(content = '', html = '', nested = false) {
        super(BlockType.SQ, content, html, nested);
        this._checked = false; // Track checkbox state - must be after super() call
    }

    /**
     * Handle key press for task list blocks
     * @param {KeyboardEvent} event
     * @param {string} text - current text content of the block
     * @returns {boolean} - true if key was handled, false otherwise
     */
    handleKeyPress(event, text) {
        // Handle checkbox toggling and task list continuation
        if (event.key === ' ' && event.ctrlKey) {
            // Toggle checkbox state
            this.toggleCheckbox(event.target.closest('.block'));
            return true;
        }
        return false;
    }

    /**
     * Toggle checkbox state for the task list item
     * @param {HTMLElement} currentBlock
     */
    toggleCheckbox(currentBlock) {
        if (!currentBlock) return;
        
        // Try to find the checkbox in the current block
        let checkbox = null;
        let targetListItem = null;
        let textContainer = null;
        
        // First, try to find checkbox directly in the current block (legacy compatibility)
        if (typeof currentBlock.querySelector === 'function') {
            checkbox = currentBlock.querySelector('input[type="checkbox"]');
            
            if (!checkbox) {
                // Try to find the currently focused task item within the block
                if (typeof window !== 'undefined' && window.getSelection) {
                    const selection = window.getSelection();
                    if (selection.rangeCount > 0) {
                        const range = selection.getRangeAt(0);
                        const element = range.startContainer.nodeType === Node.TEXT_NODE ? 
                            range.startContainer.parentElement : range.startContainer;
                        targetListItem = element.closest('li.task-list-item');
                        
                        if (targetListItem && typeof targetListItem.querySelector === 'function') {
                            checkbox = targetListItem.querySelector('input[type="checkbox"]');
                            textContainer = targetListItem.querySelector('span[contenteditable]');
                        }
                    }
                }
                
                // If no specific item is focused, toggle the first checkbox in the block
                if (!checkbox) {
                    targetListItem = currentBlock.querySelector('li.task-list-item');
                    if (targetListItem && typeof targetListItem.querySelector === 'function') {
                        checkbox = targetListItem.querySelector('input[type="checkbox"]');
                        textContainer = targetListItem.querySelector('span[contenteditable]');
                    }
                }
            } else {
                // Direct checkbox found - legacy mode for tests
                targetListItem = currentBlock;
            }
        }
        
        if (!checkbox) return;
        
        // Toggle checkbox state
        checkbox.checked = !checkbox.checked;
        this._checked = checkbox.checked;
        
        // Update visual state
        if (targetListItem) {
            if (checkbox.checked) {
                if (typeof targetListItem.classList?.add === 'function') {
                    targetListItem.classList.add('task-completed');
                }
                if (textContainer && textContainer.style) {
                    textContainer.style.textDecoration = 'line-through';
                    textContainer.style.opacity = '0.6';
                }
            } else {
                if (typeof targetListItem.classList?.remove === 'function') {
                    targetListItem.classList.remove('task-completed');
                }
                if (textContainer && textContainer.style) {
                    textContainer.style.textDecoration = 'none';
                    textContainer.style.opacity = '1';
                }
            }
        }
        
        // Trigger editor update
        Editor.getInstanceFromElement(currentBlock)?.update();
    }

    /**
     * Create a new task list item
     * @param {HTMLElement} currentBlock - The block containing the list
     * @param {HTMLElement} currentListItem - The current list item
     */
    createNewListItem(currentBlock, currentListItem) {
        // Find the ul element within the current block
        let ulElement = null;
        
        if (typeof currentBlock.querySelector === 'function') {
            ulElement = currentBlock.querySelector('ul');
        }
        
        if (!ulElement) {
            // Fallback: if no ul found, assume currentBlock is the container
            // This helps with test compatibility
            ulElement = currentBlock;
        }
        
        // Create new task list item
        const newListItem = this.createTaskListItem('', false);
        
        // Append to the ul element or container
        if (typeof ulElement.appendChild === 'function') {
            ulElement.appendChild(newListItem);
        }
        
        // Focus on the text container
        const textContainer = newListItem && typeof newListItem.querySelector === 'function' 
            ? newListItem.querySelector('span[contenteditable]') 
            : null;
            
        const editorInstance = Editor.getInstanceFromElement(currentBlock);
        if (editorInstance) {
            editorInstance.setCurrentBlock(currentBlock); // Keep the block reference
        }
        
        // Use requestAnimationFrame to ensure DOM is updated before focusing
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(() => {
                if (textContainer && typeof textContainer.focus === 'function') {
                    textContainer.focus();
                    // Place cursor at the start of the text container
                    if (typeof window !== 'undefined' && window.getSelection) {
                        const selection = window.getSelection();
                        const range = document.createRange();
                        range.setStart(textContainer, 0);
                        range.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                }
            });
        }
        
        return true;
    }

    /**
     * Get markdown triggers for task list blocks
     * @returns {Array<string>} - Array of markdown triggers
     */
    static getMarkdownTriggers() {
        return ['- [ ]', '- [x]', '- [X]', '- []', '[]', '[x]', '[X]', '[ ]'];
    }

    /**
     * Apply transformation to the current block
     * @returns {string} - markdown representation
     */
    applyTransformation() {
        // Get current block and convert to task list
        const editorInstance = Editor.getInstanceFromElement(document.activeElement);
        const currentBlock = editorInstance?.currentBlock;
        if (!currentBlock) return;
        
        // Set block type
        currentBlock.setAttribute('data-block-type', 'sq');
        
        // Clear existing content
        const existingText = currentBlock.textContent.trim();
        currentBlock.innerHTML = '';
        
        // Create checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.addEventListener('change', (e) => {
            this.toggleCheckbox(currentBlock);
        });
        
        currentBlock.appendChild(checkbox);
        currentBlock.appendChild(document.createTextNode(' ' + existingText));
        
        if (editorInstance) {
            editorInstance.setCurrentBlock(currentBlock);
            editorInstance.update();
        }
    }

    /**
     * Get toolbar configuration for task lists
     * @returns {Object} - toolbar button configuration
     */
    static getToolbarConfig() {
        return {
            class: 'editor-toolbar-sq',
            icon: 'fa-list-check',
            title: 'Checklist',
            group: 'lists'
        };
    }

    /**
     * Convert this task list block to markdown
     * @returns {string} - markdown representation
     */
    toMarkdown() {
        const tasks = this._content ? this._content.split('\n').filter(task => task.trim()) : [''];
        
        if (tasks.length === 0 || (tasks.length === 1 && !tasks[0].trim())) {
            // Single empty or single task
            const checkbox = this._checked ? '[x]' : '[ ]';
            return `- ${checkbox} ${tasks[0] || ''}`;
        }
        
        // Multiple tasks
        return tasks.map((task, index) => {
            // For now, use the block's checked state for the first item only
            const isChecked = index === 0 ? this._checked : false;
            const checkbox = isChecked ? '[x]' : '[ ]';
            return `- ${checkbox} ${task.trim()}`;
        }).join('\n');
    }

    /**
     * Convert this task list block to HTML
     * @returns {string} - HTML representation
     */
    toHtml() {
        const tasks = this._content ? this._content.split('\n').filter(task => task.trim()) : [''];
        
        if (tasks.length === 0 || (tasks.length === 1 && !tasks[0].trim())) {
            // Single empty task
            const checked = this._checked ? ' checked' : '';
            return `<ul class="task-list">\n<li class="task-list-item"><input type="checkbox"${checked}> </li>\n</ul>`;
        }
        
        // Multiple tasks
        const listItems = tasks.map((task, index) => {
            // For now, use the block's checked state for the first item only
            const isChecked = index === 0 ? this._checked : false;
            const checked = isChecked ? ' checked' : '';
            const completedClass = isChecked ? ' task-completed' : '';
            return `<li class="task-list-item${completedClass}"><input type="checkbox"${checked}> ${task.trim()}</li>`;
        }).join('\n');
        
        return `<ul class="task-list">\n${listItems}\n</ul>`;
    }

    /**
     * Set checkbox state
     * @param {boolean} checked
     */
    setChecked(checked) {
        this._checked = checked;
    }

    /**
     * Get checkbox state
     * @returns {boolean}
     */
    isChecked() {
        return this._checked;
    }

    /**
     * Render this task list block as an HTML element
     * @returns {HTMLElement} - DOM element representation
     */
    renderToElement() {
        // Create div wrapper for the block
        let element = document.createElement('div');
        element.classList.add('block');
        element.classList.add('block-sq');
        element.setAttribute('data-block-type', 'sq');
        element.setAttribute('data-placeholder', 'Task item');
        
        // Create the actual ul element (semantic unordered list)
        let ulElement = document.createElement('ul');
        if (ulElement.classList && typeof ulElement.classList.add === 'function') {
            ulElement.classList.add('task-list');
        }
        if (ulElement.style) {
            ulElement.style.listStyle = 'none';
            ulElement.style.marginLeft = '0';
            ulElement.style.paddingLeft = '0';
        }
        
        // Parse content to create multiple task items if needed
        const tasks = this._content ? this._content.split('\n').filter(task => task.trim()) : [''];
        
        if (tasks.length === 0 || (tasks.length === 1 && !tasks[0].trim())) {
            // Create single empty task item
            const listItem = this.createTaskListItem('', this._checked);
            if (ulElement && typeof ulElement.appendChild === 'function') {
                ulElement.appendChild(listItem);
            }
        } else {
            // Create task items for each line
            tasks.forEach((taskText, index) => {
                // For now, use the block's checked state for all items
                // In the future, this could be enhanced to track individual item states
                const isChecked = index === 0 ? this._checked : false;
                const listItem = this.createTaskListItem(taskText.trim(), isChecked);
                if (ulElement && typeof ulElement.appendChild === 'function') {
                    ulElement.appendChild(listItem);
                }
            });
        }
        
        // Append ul to the div wrapper
        if (element && typeof element.appendChild === 'function') {
            element.appendChild(ulElement);
        }
        
        return element;
    }

    /**
     * Create a single task list item element
     * @param {string} taskText - Text content of the task
     * @param {boolean} isChecked - Whether the task is checked
     * @returns {HTMLElement} - li element with checkbox and text
     */
    createTaskListItem(taskText, isChecked = false) {
        const listItem = document.createElement('li');
        
        // Add class safely
        if (listItem.classList && typeof listItem.classList.add === 'function') {
            listItem.classList.add('task-list-item');
        }
        
        // Set data-block-type attribute for compatibility
        if (typeof listItem.setAttribute === 'function') {
            listItem.setAttribute('data-block-type', 'sq');
        }
        
        // Set styles if available
        if (listItem.style) {
            listItem.style.listStyle = 'none';
            listItem.style.display = 'flex';
            listItem.style.alignItems = 'flex-start';
            listItem.style.marginBottom = '4px';
        }
        
        // Create checkbox
        const checkbox = document.createElement('input');
        if (checkbox) {
            checkbox.type = 'checkbox';
            checkbox.checked = isChecked;
            
            if (checkbox.style) {
                checkbox.style.marginRight = '8px';
                checkbox.style.marginTop = '2px';
                checkbox.style.flexShrink = '0';
            }
        }
        
        // Create text container that is editable
        const textContainer = document.createElement('span');
        if (textContainer) {
            textContainer.contentEditable = true;
            textContainer.textContent = taskText || '';
            
            if (textContainer.style) {
                textContainer.style.outline = 'none';
                textContainer.style.flex = '1';
            }
        }
        
        // Apply completed styling if checked
        if (isChecked) {
            if (listItem.classList && typeof listItem.classList.add === 'function') {
                listItem.classList.add('task-completed');
            }
            if (textContainer && textContainer.style) {
                textContainer.style.textDecoration = 'line-through';
                textContainer.style.opacity = '0.6';
            }
        }
        
        // Add change event listener to handle dynamic updates
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                const isChecked = checkbox.checked;
                
                if (isChecked) {
                    if (listItem.classList && typeof listItem.classList.add === 'function') {
                        listItem.classList.add('task-completed');
                    }
                    if (textContainer && textContainer.style) {
                        textContainer.style.textDecoration = 'line-through';
                        textContainer.style.opacity = '0.6';
                    }
                } else {
                    if (listItem.classList && typeof listItem.classList.remove === 'function') {
                        listItem.classList.remove('task-completed');
                    }
                    if (textContainer && textContainer.style) {
                        textContainer.style.textDecoration = 'none';
                        textContainer.style.opacity = '1';
                    }
                }
                
                // Update block state if this is the first/main item
                this._checked = isChecked;
                
                // Trigger editor update
                Editor.getInstanceFromElement(listItem)?.update();
            });
        }
        
        // Append children safely
        if (checkbox && typeof listItem.appendChild === 'function') {
            listItem.appendChild(checkbox);
        }
        if (textContainer && typeof listItem.appendChild === 'function') {
            listItem.appendChild(textContainer);
        }
        
        return listItem;
    }

    /**
     * Check if this block type can parse the given HTML
     * @param {string} htmlString - HTML to check
     * @returns {boolean} - true if can parse, false otherwise
     */
    static canParseHtml(htmlString) {
        return htmlString.includes('data-block-type="sq"') ||
               (htmlString.includes('<input type="checkbox"') && 
                (htmlString.includes('<li') || htmlString.includes('task-list'))) ||
               htmlString.includes('class="task-list"');
    }

    /**
     * Parse HTML string to create a task list block instance
     * @param {string} htmlString - HTML to parse
     * @returns {TaskListBlock|null} - Block instance or null if can't parse
     */
    static parseFromHtml(htmlString) {
        if (!this.canParseHtml(htmlString)) return null;

        // Parse the HTML to extract task items
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        
        // Look for task list items
        const taskItems = doc.querySelectorAll('li.task-list-item, li[data-block-type="sq"]');
        
        if (taskItems.length === 0) {
            // Try to parse a single checkbox input
            const checkboxMatch = htmlString.match(/<input type="checkbox"([^>]*)?>/);
            const isChecked = checkboxMatch && checkboxMatch[1] && checkboxMatch[1].includes('checked');
            const textContent = htmlString.replace(/<[^>]+>/g, '').trim();
            
            const taskBlock = new TaskListBlock(textContent, htmlString);
            taskBlock.setChecked(isChecked);
            return taskBlock;
        }
        
        // Extract content from all task items
        const tasks = Array.from(taskItems).map(li => {
            const checkbox = li.querySelector('input[type="checkbox"]');
            const isChecked = checkbox ? checkbox.checked : false;
            const text = li.textContent.replace(/^\s*\[\s*[xX]?\s*\]\s*/, '').trim();
            return { text, isChecked };
        });
        
        // Use the first task for the block content and state
        const firstTask = tasks[0];
        const content = tasks.map(task => task.text).join('\n');
        
        const taskBlock = new TaskListBlock(content, htmlString);
        taskBlock.setChecked(firstTask.isChecked);
        return taskBlock;
    }

    /**
     * Check if this block type can parse the given markdown
     * @param {string} markdownString - Markdown to check
     * @returns {boolean} - true if can parse, false otherwise
     */
    static canParseMarkdown(markdownString) {
        return /^-\s*\[[xX ]?\]\s*/.test(markdownString.trim());
    }

    /**
     * Parse markdown string to create a task list block instance
     * @param {string} markdownString - Markdown to parse
     * @returns {TaskListBlock|null} - Block instance or null if can't parse
     */
    static parseFromMarkdown(markdownString) {
        const match = markdownString.trim().match(/^-\s*\[([xX ]?)\]\s*(.*)$/);
        if (!match) return null;

        const checkState = match[1].toLowerCase();
        const isChecked = checkState === 'x';
        const content = match[2].trim();
        const checked = isChecked ? ' checked' : '';
        const html = `<li class="task-list-item" data-block-type="sq"><input type="checkbox"${checked}> ${content}</li>`;
        
        const taskBlock = new TaskListBlock(content, html);
        taskBlock.setChecked(isChecked);
        return taskBlock;
    }
}
