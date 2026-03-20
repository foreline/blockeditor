'use strict';

import {BaseBlock} from "@/blocks/BaseBlock";
import {BlockType} from "@/BlockType";
import {Toolbar} from "@/Toolbar";
import {Editor} from "@/Editor";

/**
 * Table block for markdown tables
 */
export class TableBlock extends BaseBlock
{
    constructor(content = '', html = '', nested = false) {
        super(BlockType.TABLE, content, html, nested);
        this._rows = [];
        this._headers = [];
        
        // Parse content if provided
        if (content) {
            this.parseTableContent(content);
        }
    }

    /**
     * Parse table content from markdown format
     * @param {string} content - Table content in markdown format
     */
    parseTableContent(content) {
        const lines = content.split('\n').map(line => line.trim()).filter(line => line);
        
        if (lines.length >= 2) {
            // First line is headers
            this._headers = lines[0].split('|').map(cell => cell.trim()).filter(cell => cell);
            
            // Skip separator line (second line with dashes)
            // Remaining lines are data rows
            this._rows = lines.slice(2).map(line => 
                line.split('|').map(cell => cell.trim()).filter(cell => cell)
            );
        }
    }

    /**
     * Get table headers
     * @returns {Array<string>} - Array of header names
     */
    get headers() {
        return this._headers;
    }

    /**
     * Set table headers
     * @param {Array<string>} value - Array of header names
     */
    set headers(value) {
        this._headers = value;
    }

    /**
     * Get table rows
     * @returns {Array<Array<string>>} - Array of row arrays
     */
    get rows() {
        return this._rows;
    }

    /**
     * Set table rows
     * @param {Array<Array<string>>} value - Array of row arrays
     */
    set rows(value) {
        this._rows = value;
    }

    /**
     * Handle key press for table blocks
     * @param {KeyboardEvent} event
     * @param {string} text - current text content of the block
     * @returns {boolean} - true if key was handled, false otherwise
     */
    handleKeyPress(event, text) {
        // Handle Tab key for moving between cells
        if (event.key === 'Tab') {
            event.preventDefault();
            this.moveToNextCell(event.shiftKey);
            return true;
        }
        
        // Handle Enter key for adding new rows
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.addNewRow();
            return true;
        }
        
        return false;
    }

    /**
     * Handle Enter key press for table blocks
     * @param {KeyboardEvent} event
     * @returns {boolean} - true if key was handled, false otherwise
     */
    handleEnterKey(event) {
        // Add new row when Enter is pressed in a table
        event.preventDefault();
        this.addNewRow();
        return true;
    }

    /**
     * Move focus to next/previous cell
     * @param {boolean} backwards - true to move backwards (Shift+Tab)
     */
    moveToNextCell(backwards = false) {
        const editorInstance = Editor.getInstanceFromElement(document.activeElement);
        const currentBlock = editorInstance?.currentBlock;
        if (!currentBlock) return;
        
        const table = currentBlock.closest('table') || currentBlock.querySelector('table');
        if (!table) return;
        
        const cells = table.querySelectorAll('td, th');
        const currentCell = document.activeElement.closest('td, th');
        
        if (currentCell) {
            const currentIndex = Array.from(cells).indexOf(currentCell);
            let nextIndex = backwards ? currentIndex - 1 : currentIndex + 1;
            
            if (nextIndex >= 0 && nextIndex < cells.length) {
                cells[nextIndex].focus();
            }
        }
    }

    /**
     * Add a new row to the table
     */
    addNewRow() {
        const editorInstance = Editor.getInstanceFromElement(document.activeElement);
        const currentBlock = editorInstance?.currentBlock;
        if (!currentBlock) return;
        
        const table = currentBlock.querySelector('table');
        if (!table) return;
        
        const tbody = table.querySelector('tbody');
        if (!tbody) return;
        
        // Create new row with same number of columns as headers
        const newRow = document.createElement('tr');
        for (let i = 0; i < this._headers.length; i++) {
            const cell = document.createElement('td');
            cell.contentEditable = true;
            cell.style.border = '1px solid #ddd';
            cell.style.padding = '8px';
            cell.tabIndex = 0;
            newRow.appendChild(cell);
            
            // Add event listeners to new cell
            this.addCellEventListeners(cell);
        }
        
        tbody.appendChild(newRow);
        
        // Focus on first cell of new row
        const firstCell = newRow.querySelector('td');
        if (firstCell) {
            firstCell.focus();
        }
        
        // Update internal data structure
        this._rows.push(new Array(this._headers.length).fill(''));
        
        editorInstance?.update();
    }

    /**
     * Get markdown triggers for table creation
     * @returns {Array<string>} - Array of trigger strings
     */
    static getMarkdownTriggers() {
        return ['| ', '|--', '|:--'];
    }

    /**
     * Apply table transformation
     */
    applyTransformation() {
        const editorInstance = Editor.getInstanceFromElement(document.activeElement);
        const currentBlock = editorInstance?.currentBlock;
        if (!currentBlock) return;
        
        // Create a basic 2x3 table (header + 2 rows, 3 columns)
        this._headers = ['Column 1', 'Column 2', 'Column 3'];
        this._rows = [
            ['Row 1 Col 1', 'Row 1 Col 2', 'Row 1 Col 3'],
            ['Row 2 Col 1', 'Row 2 Col 2', 'Row 2 Col 3']
        ];
        
        currentBlock.setAttribute('data-block-type', 'table');
        currentBlock.innerHTML = this.generateTableHTML();
        
        // Ensure cells are properly editable
        this.setupCellEditing(currentBlock);
        
        if (editorInstance) {
            editorInstance.setCurrentBlock(currentBlock);
            editorInstance.update();
        }
    }

    /**
     * Set up cell editing for the table
     * @param {HTMLElement} tableBlock - the table block element
     */
    setupCellEditing(tableBlock) {
        const table = tableBlock.querySelector('table');
        if (!table) return;
        
        // Ensure all cells are properly set up for editing
        const cells = table.querySelectorAll('td, th');
        cells.forEach(cell => {
            // Ensure contentEditable is set
            cell.contentEditable = true;
            
            // Add tabindex to make cells focusable
            cell.tabIndex = 0;
            
            // Add event listeners
            this.addCellEventListeners(cell);
        });
        
        // Focus on first cell if it exists
        const firstCell = table.querySelector('td, th');
        if (firstCell) {
            setTimeout(() => {
                firstCell.focus();
            }, 100);
        }
    }

    /**
     * Add event listeners to a table cell
     * @param {HTMLElement} cell - The cell element
     */
    addCellEventListeners(cell) {
        // Remove any existing event listeners to avoid duplicates
        cell.removeEventListener('focus', this.handleCellFocus);
        cell.removeEventListener('blur', this.handleCellBlur);
        cell.removeEventListener('input', this.handleCellInput);
        
        // Add event listeners
        cell.addEventListener('focus', this.handleCellFocus.bind(this));
        cell.addEventListener('blur', this.handleCellBlur.bind(this));
        cell.addEventListener('input', this.handleCellInput.bind(this));
    }

    /**
     * Handle cell focus events
     * @param {Event} event
     */
    handleCellFocus(event) {
        const cell = event.target;
        cell.style.outline = '2px solid #007cba';
        cell.style.backgroundColor = '#f0f8ff';
        
        // Show table controls when any cell is focused
        this.showTableControls(cell);
    }

    /**
     * Handle cell blur events
     * @param {Event} event
     */
    handleCellBlur(event) {
        const cell = event.target;
        cell.style.outline = '';
        cell.style.backgroundColor = '';
        
        // Update internal data structure when cell loses focus
        this.updateDataFromDOM();
        
        // Hide table controls after a short delay (to allow clicking on controls)
        setTimeout(() => {
            this.hideTableControls();
        }, 200);
    }

    /**
     * Handle cell input events
     * @param {Event} event
     */
    handleCellInput(event) {
        // Update internal data structure as user types
        this.updateDataFromDOM();
        Editor.getInstanceFromElement(event.target)?.update();
    }

    /**
     * Update internal data structure from current DOM state
     */
    updateDataFromDOM() {
        const editorInstance = Editor.getInstanceFromElement(document.activeElement);
        const currentBlock = editorInstance?.currentBlock;
        if (!currentBlock) return;
        
        const table = currentBlock.querySelector('table');
        if (!table) return;
        
        // Update headers
        const headerCells = table.querySelectorAll('th');
        this._headers = Array.from(headerCells).map(cell => cell.textContent || '');
        
        // Update rows
        const rows = table.querySelectorAll('tbody tr');
        this._rows = Array.from(rows).map(row => {
            const cells = row.querySelectorAll('td');
            return Array.from(cells).map(cell => cell.textContent || '');
        });
    }

    /**
     * Generate HTML table structure
     * @returns {string} - HTML table string
     */
    generateTableHTML() {
        let html = '<table style="border-collapse: collapse; width: 100%;">';
        
        // Add header
        if (this._headers.length > 0) {
            html += '<thead><tr>';
            this._headers.forEach(header => {
                html += `<th contenteditable="true" style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5;">${header}</th>`;
            });
            html += '</tr></thead>';
        }
        
        // Add rows
        if (this._rows.length > 0) {
            html += '<tbody>';
            this._rows.forEach(row => {
                html += '<tr>';
                row.forEach(cell => {
                    html += `<td contenteditable="true" style="border: 1px solid #ddd; padding: 8px;">${cell}</td>`;
                });
                html += '</tr>';
            });
            html += '</tbody>';
        }
        
        html += '</table>';
        return html;
    }

    /**
     * Show table control buttons around the focused table
     * @param {HTMLElement} cell - The focused cell
     */
    showTableControls(cell) {
        // Remove any existing control panel
        this.hideTableControls();
        
        const tableBlock = cell.closest('[data-block-type="table"]');
        if (!tableBlock) return;
        
        const table = tableBlock.querySelector('table');
        if (!table) return;
        
        // Create main container for all controls
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'table-controls-container';
        controlsContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: 1000;
        `;
        
        // Create top-left corner control (add column/row controls)
        const topLeftControl = document.createElement('div');
        topLeftControl.className = 'table-control-topleft';
        topLeftControl.style.cssText = `
            position: absolute;
            top: -35px;
            left: -35px;
            width: 30px;
            height: 30px;
            background: white;
            border: 2px solid #ddd;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            pointer-events: auto;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        `;
        topLeftControl.innerHTML = '⊞';
        topLeftControl.title = 'Table Controls';
        
        // Create right edge control (add column)
        const rightControl = document.createElement('div');
        rightControl.className = 'table-control-right';
        rightControl.style.cssText = `
            position: absolute;
            top: 50%;
            right: -20px;
            transform: translateY(-50%);
            width: 16px;
            height: 30px;
            background: #4285f4;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            pointer-events: auto;
            color: white;
            font-weight: bold;
            font-size: 14px;
        `;
        rightControl.innerHTML = '+';
        rightControl.title = 'Add Column';
        
        // Create bottom edge control (add row)
        const bottomControl = document.createElement('div');
        bottomControl.className = 'table-control-bottom';
        bottomControl.style.cssText = `
            position: absolute;
            bottom: -20px;
            left: 50%;
            transform: translateX(-50%);
            width: 30px;
            height: 16px;
            background: #4285f4;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            pointer-events: auto;
            color: white;
            font-weight: bold;
            font-size: 14px;
        `;
        bottomControl.innerHTML = '+';
        bottomControl.title = 'Add Row';
        
        // Add event listeners
        rightControl.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.addColumn();
        });
        
        bottomControl.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.addNewRow();
        });
        
        // Create dropdown menu for top-left control
        topLeftControl.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showTableMenu(topLeftControl);
        });
        
        // Add hover effects
        [rightControl, bottomControl].forEach(control => {
            control.addEventListener('mouseenter', () => {
                control.style.background = '#3367d6';
            });
            control.addEventListener('mouseleave', () => {
                control.style.background = '#4285f4';
            });
        });
        
        topLeftControl.addEventListener('mouseenter', () => {
            topLeftControl.style.background = '#f0f0f0';
        });
        topLeftControl.addEventListener('mouseleave', () => {
            topLeftControl.style.background = 'white';
        });
        
        // Append controls to container
        controlsContainer.appendChild(topLeftControl);
        controlsContainer.appendChild(rightControl);
        controlsContainer.appendChild(bottomControl);
        
        // Add to table block with relative positioning
        tableBlock.style.position = 'relative';
        tableBlock.appendChild(controlsContainer);
        
        // Store reference for cleanup
        this._controlsContainer = controlsContainer;
    }

    /**
     * Show table menu with all available actions
     * @param {HTMLElement} triggerElement - The element that triggered the menu
     */
    showTableMenu(triggerElement) {
        // Remove any existing menu
        this.hideTableMenu();
        
        const menu = document.createElement('div');
        menu.className = 'table-menu';
        menu.style.cssText = `
            position: absolute;
            top: 35px;
            left: 0;
            background: white;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1001;
            min-width: 150px;
            pointer-events: auto;
        `;
        
        const menuItems = [
            {
                label: 'Add Row Above',
                action: () => this.addRowAbove()
            },
            {
                label: 'Add Row Below', 
                action: () => this.addNewRow()
            },
            {
                label: 'Add Column Left',
                action: () => this.addColumnLeft()
            },
            {
                label: 'Add Column Right',
                action: () => this.addColumn()
            },
            { divider: true },
            {
                label: 'Remove Row',
                action: () => this.removeRow()
            },
            {
                label: 'Remove Column',
                action: () => this.removeColumn()
            },
            { divider: true },
            {
                label: 'Delete Table',
                action: () => this.deleteTable(),
                className: 'danger'
            }
        ];
        
        menuItems.forEach(item => {
            if (item.divider) {
                const divider = document.createElement('div');
                divider.style.cssText = `
                    height: 1px;
                    background: #eee;
                    margin: 4px 0;
                `;
                menu.appendChild(divider);
            } else {
                const menuItem = document.createElement('div');
                menuItem.className = 'table-menu-item';
                menuItem.textContent = item.label;
                menuItem.style.cssText = `
                    padding: 8px 12px;
                    cursor: pointer;
                    font-size: 13px;
                    border-radius: 2px;
                    ${item.className === 'danger' ? 'color: #dc3545;' : ''}
                `;
                
                menuItem.addEventListener('mouseenter', () => {
                    menuItem.style.background = item.className === 'danger' ? '#fff5f5' : '#f0f0f0';
                });
                
                menuItem.addEventListener('mouseleave', () => {
                    menuItem.style.background = 'white';
                });
                
                menuItem.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    item.action();
                    this.hideTableMenu();
                });
                
                menu.appendChild(menuItem);
            }
        });
        
        triggerElement.appendChild(menu);
        this._tableMenu = menu;
        
        // Close menu when clicking outside
        setTimeout(() => {
            document.addEventListener('click', this.handleClickOutsideMenu.bind(this));
        }, 100);
    }

    /**
     * Hide table menu
     */
    hideTableMenu() {
        if (this._tableMenu) {
            this._tableMenu.remove();
            this._tableMenu = null;
        }
        document.removeEventListener('click', this.handleClickOutsideMenu);
    }

    /**
     * Handle clicks outside the menu to close it
     * @param {Event} event
     */
    handleClickOutsideMenu(event) {
        if (this._tableMenu && !this._tableMenu.contains(event.target)) {
            this.hideTableMenu();
        }
    }

    /**
     * Hide table control buttons
     */
    hideTableControls() {
        if (this._controlsContainer) {
            this._controlsContainer.remove();
            this._controlsContainer = null;
        }
        
        this.hideTableMenu();
        
        // Also remove any orphaned control containers
        document.querySelectorAll('.table-controls-container').forEach(container => {
            container.remove();
        });
    }

    /**
     * Add a new column to the table
     */
    addColumn() {
        const editorInstance = Editor.getInstanceFromElement(document.activeElement);
        const currentBlock = editorInstance?.currentBlock;
        if (!currentBlock) return;
        
        const table = currentBlock.querySelector('table');
        if (!table) return;
        
        // Get current table structure
        const headerRow = table.querySelector('thead tr');
        const bodyRows = table.querySelectorAll('tbody tr');
        
        // Add header for new column
        if (headerRow) {
            const newHeader = document.createElement('th');
            newHeader.contentEditable = true;
            newHeader.style.border = '1px solid #ddd';
            newHeader.style.padding = '8px';
            newHeader.style.background = '#f5f5f5';
            newHeader.tabIndex = 0;
            const columnCount = headerRow.children.length;
            newHeader.textContent = `Column ${columnCount + 1}`;
            headerRow.appendChild(newHeader);
            
            // Add event listeners to new header
            this.addCellEventListeners(newHeader);
        }
        
        // Add cells to all existing rows
        bodyRows.forEach(row => {
            const newCell = document.createElement('td');
            newCell.contentEditable = true;
            newCell.style.border = '1px solid #ddd';
            newCell.style.padding = '8px';
            newCell.tabIndex = 0;
            newCell.textContent = '';
            row.appendChild(newCell);
            
            // Add event listeners to new cell
            this.addCellEventListeners(newCell);
        });
        
        // Update internal data structure
        this._headers.push(`Column ${this._headers.length + 1}`);
        this._rows.forEach(row => row.push(''));
        
        editorInstance?.update();
    }

    /**
     * Remove the last column from the table
     */
    removeColumn() {
        const editorInstance = Editor.getInstanceFromElement(document.activeElement);
        const currentBlock = editorInstance?.currentBlock;
        if (!currentBlock) return;
        
        const table = currentBlock.querySelector('table');
        if (!table) return;
        
        const headerRow = table.querySelector('thead tr');
        const bodyRows = table.querySelectorAll('tbody tr');
        
        // Don't remove if only one column left
        if (headerRow && headerRow.children.length <= 1) return;
        
        // Remove header
        if (headerRow) {
            const lastHeader = headerRow.lastElementChild;
            if (lastHeader) lastHeader.remove();
        }
        
        // Remove cells from all rows
        bodyRows.forEach(row => {
            const lastCell = row.lastElementChild;
            if (lastCell) lastCell.remove();
        });
        
        // Update internal data structure
        this._headers.pop();
        this._rows.forEach(row => row.pop());
        
        editorInstance?.update();
    }

    /**
     * Add a new column to the left of the table
     */
    addColumnLeft() {
        const editorInstance = Editor.getInstanceFromElement(document.activeElement);
        const currentBlock = editorInstance?.currentBlock;
        if (!currentBlock) return;
        
        const table = currentBlock.querySelector('table');
        if (!table) return;
        
        // Get current table structure
        const headerRow = table.querySelector('thead tr');
        const bodyRows = table.querySelectorAll('tbody tr');
        
        // Add header for new column at the beginning
        if (headerRow) {
            const newHeader = document.createElement('th');
            newHeader.contentEditable = true;
            newHeader.style.border = '1px solid #ddd';
            newHeader.style.padding = '8px';
            newHeader.style.background = '#f5f5f5';
            newHeader.tabIndex = 0;
            newHeader.textContent = 'New Column';
            headerRow.insertBefore(newHeader, headerRow.firstChild);
            
            // Add event listeners to new header
            this.addCellEventListeners(newHeader);
        }
        
        // Add cells to all existing rows at the beginning
        bodyRows.forEach(row => {
            const newCell = document.createElement('td');
            newCell.contentEditable = true;
            newCell.style.border = '1px solid #ddd';
            newCell.style.padding = '8px';
            newCell.tabIndex = 0;
            newCell.textContent = '';
            row.insertBefore(newCell, row.firstChild);
            
            // Add event listeners to new cell
            this.addCellEventListeners(newCell);
        });
        
        // Update internal data structure
        this._headers.unshift('New Column');
        this._rows.forEach(row => row.unshift(''));
        
        editorInstance?.update();
    }

    /**
     * Add a new row above the current row
     */
    addRowAbove() {
        const editorInstance = Editor.getInstanceFromElement(document.activeElement);
        const currentBlock = editorInstance?.currentBlock;
        if (!currentBlock) return;
        
        const table = currentBlock.querySelector('table');
        if (!table) return;
        
        const tbody = table.querySelector('tbody');
        if (!tbody) return;
        
        // Create new row with same number of columns as headers
        const newRow = document.createElement('tr');
        for (let i = 0; i < this._headers.length; i++) {
            const cell = document.createElement('td');
            cell.contentEditable = true;
            cell.style.border = '1px solid #ddd';
            cell.style.padding = '8px';
            cell.tabIndex = 0;
            cell.textContent = '';
            newRow.appendChild(cell);
            
            // Add event listeners to new cell
            this.addCellEventListeners(cell);
        }
        
        // Insert at the beginning of tbody
        tbody.insertBefore(newRow, tbody.firstChild);
        
        // Focus on first cell of new row
        const firstCell = newRow.querySelector('td');
        if (firstCell) {
            firstCell.focus();
        }
        
        // Update internal data structure
        this._rows.unshift(new Array(this._headers.length).fill(''));
        
        editorInstance?.update();
    }

    /**
     * Delete the entire table
     */
    deleteTable() {
        const editorInstance = Editor.getInstanceFromElement(document.activeElement);
        const currentBlock = editorInstance?.currentBlock;
        if (!currentBlock) return;
        
        // Confirm deletion
        if (confirm('Are you sure you want to delete this table?')) {
            // Hide controls first
            this.hideTableControls();
            
            // Replace with empty paragraph block
            currentBlock.setAttribute('data-block-type', 'paragraph');
            currentBlock.className = 'block block-p';
            currentBlock.innerHTML = '<p><br></p>';
            currentBlock.contentEditable = true;
            
            // Focus the new paragraph
            currentBlock.focus();
            
            editorInstance?.update();
        }
    }

    /**
     * Remove the last row from the table
     */
    removeRow() {
        const editorInstance = Editor.getInstanceFromElement(document.activeElement);
        const currentBlock = editorInstance?.currentBlock;
        if (!currentBlock) return;
        
        const table = currentBlock.querySelector('table');
        if (!table) return;
        
        const tbody = table.querySelector('tbody');
        
        if (tbody) {
            // Don't remove if only one row left
            if (tbody.children.length <= 1) return;
            
            // Remove last row
            const lastRow = tbody.lastElementChild;
            if (lastRow) lastRow.remove();
            
            // Update internal data structure
            this._rows.pop();
            
            editorInstance?.update();
        }
    }

    /**
     * Convert this table block to markdown
     * @returns {string} - markdown representation
     */
    toMarkdown() {
        if (!this._headers.length) return '';
        
        let markdown = '| ' + this._headers.join(' | ') + ' |\n';
        markdown += '| ' + this._headers.map(() => '---').join(' | ') + ' |\n';
        
        this._rows.forEach(row => {
            markdown += '| ' + row.join(' | ') + ' |\n';
        });
        
        return markdown;
    }

    /**
     * Convert this table block to HTML
     * @returns {string} - HTML representation
     */
    toHtml() {
        return this.generateTableHTML();
    }

    /**
     * Get disabled toolbar buttons for table blocks
     * @returns {Array<string>} - Array of disabled button classes
     */
    static getDisabledButtons() {
        return ['editor-toolbar-bold', 'editor-toolbar-italic', 'editor-toolbar-ul', 'editor-toolbar-ol'];
    }

    /**
     * Set table headers
     * @param {Array<string>} headers
     */
    setHeaders(headers) {
        this._headers = headers;
    }

    /**
     * Add row to table
     * @param {Array<string>} rowData
     */
    addRow(rowData) {
        this._rows.push(rowData);
    }

    /**
     * Get table headers
     * @returns {Array<string>}
     */
    getHeaders() {
        return this._headers;
    }

    /**
     * Get table rows
     * @returns {Array<Array<string>>}
     */
    getRows() {
        return this._rows;
    }

    /**
     * Get toolbar configuration for tables
     * @returns {Object} - toolbar button configuration
     */
    static getToolbarConfig() {
        return {
            class: 'editor-toolbar-table',
            icon: 'fa-table',
            title: 'Table',
            group: 'blocks'
        };
    }

    /**
     * Render this table block as an HTML element
     * @returns {HTMLElement} - DOM element representation
     */
    renderToElement() {
        let element = document.createElement('div');
        element.classList.add('block');
        element.classList.add('block-table');
        element.setAttribute('data-block-type', 'table');
        element.setAttribute('data-placeholder', 'Table');
        element.contentEditable = false; // Tables manage their own editing
        
        // Use the HTML from the block or generate from content
        if (this._html && this._html.includes('<table')) {
            element.innerHTML = this._html;
        } else {
            element.innerHTML = this.generateTableHTML();
        }
        
        // Set up cell editing for the table
        setTimeout(() => {
            this.setupCellEditing(element);
        }, 0);
        
        return element;
    }

    /**
     * Check if this block type can parse the given HTML
     * @param {string} htmlString - HTML to check
     * @returns {boolean} - true if can parse, false otherwise
     */
    static canParseHtml(htmlString) {
        return /^<table[^>]*>/i.test(htmlString);
    }

    /**
     * Parse HTML string to create a table block instance
     * @param {string} htmlString - HTML to parse
     * @returns {TableBlock|null} - Block instance or null if can't parse
     */
    static parseFromHtml(htmlString) {
        if (!this.canParseHtml(htmlString)) return null;

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        const table = doc.querySelector('table');
        
        if (!table) return null;
        
        const tableBlock = new TableBlock('', htmlString);
        
        // Extract headers
        const headerCells = table.querySelectorAll('th');
        if (headerCells.length > 0) {
            tableBlock._headers = Array.from(headerCells).map(cell => cell.textContent.trim());
        }
        
        // Extract data rows
        const dataRows = table.querySelectorAll('tbody tr, tr:not(:has(th))');
        tableBlock._rows = Array.from(dataRows).map(row => {
            const cells = row.querySelectorAll('td, th');
            return Array.from(cells).map(cell => cell.textContent.trim());
        });
        
        return tableBlock;
    }

    /**
     * Check if this block type can parse the given markdown
     * @param {string} markdownString - Markdown to check
     * @returns {boolean} - true if can parse, false otherwise
     */
    static canParseMarkdown(markdownString) {
        const lines = markdownString.trim().split('\n');
        return lines.length >= 2 && 
               lines[0].includes('|') && 
               lines[1].includes('|') && 
               lines[1].includes('-');
    }

    /**
     * Parse markdown string to create a table block instance
     * @param {string} markdownString - Markdown to parse
     * @returns {TableBlock|null} - Block instance or null if can't parse
     */
    static parseFromMarkdown(markdownString) {
        const lines = markdownString.trim().split('\n').map(line => line.trim()).filter(line => line);
        
        if (lines.length < 2) return null;
        
        // Check if it's a table format
        if (!lines[0].includes('|') || !lines[1].includes('-')) return null;
        
        const tableBlock = new TableBlock();
        
        // Parse headers (first line)
        tableBlock._headers = lines[0].split('|').map(cell => cell.trim()).filter(cell => cell);
        
        // Skip separator line (second line with dashes)
        // Parse data rows (remaining lines)
        tableBlock._rows = lines.slice(2).map(line => 
            line.split('|').map(cell => cell.trim()).filter(cell => cell)
        );
        
        // Generate HTML
        const html = tableBlock.generateTableHTML();
        tableBlock._html = html;
        
        return tableBlock;
    }
}
