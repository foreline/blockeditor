# Changelog

All notable changes to the BlockEditor project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [v0.1.1] - 2026-05-01

### Changed
- Align documentation with BlockEditor project name: Updated all project documentation, configuration files, and demo files to use "BlockEditor" naming instead of "JS Editor" to reflect the official project identity following npmjs publication.

## [v0.1.0] - 2026-05-01

### Changed
- Package renamed to `blockeditor` for npm publication. Update import statements from `BlockEditor` to `blockeditor`: `npm install blockeditor` and `import Editor from 'blockeditor'`.
- Introduce Inbox & Documentation Pipeline: Established a structured docs-first workflow for managing ideas, proposals, issues, and bug reports. New directories: `dev-docs/_inbox/`, `dev-docs/adr/`, `dev-docs/issues/`, `dev-docs/proposals/`. New skills: `inbox-writer`, `proposal-writer`, `adr-writer`. New prompts for contributing ideas, issues, and proposals.

### Fixed
- GitLab CI test failure on Node 20: Fixed jsdom `_version` crash that occurred when integration tests restored the real `document.body` but jsdom's property descriptor was non-configurable. Now properly uses `delete document.body` to restore jsdom's prototype accessor, preventing internal tree tracking corruption. Enables all tests to pass on Node 20 Alpine (CI environment) without affecting unit test mocks.

## [v0.0.29] - 2026-03-29

### Fixed
- GitLab CI pipeline failure: Added `image: node:20-alpine` to use Node.js in all pipeline jobs. Removed duplicate `npm ci` from global `before_script` to prevent redundant installs. This resolves "node: not found" and "npm: not found" errors in the install stage.

## [v0.0.28] - 2025-08-28

### Fixed
- Header focus after conversion: When converting a paragraph to a heading via markdown trigger (e.g., typing `# `), focus was left on the block container instead of the new heading element. Updated focus resolution to prefer inner contenteditable elements (`Editor.findEditableElementInBlock()`), and ensured headings are explicitly contenteditable in `HeadingBlock.applyTransformation()`. Cursor now lands at the end of the heading text after conversion.

### Follow-up
- Prevented typing into the block container for headings by setting the block div `contenteditable="false"` during heading conversion, ensuring all input goes into the newly created `<h1>` element.

## [v0.0.27] - 2025-08-28

### Fixed
- Single empty block issue: When the editor had exactly one empty block, pressing Enter created a new block which was immediately removed by over-aggressive empty-editor protection. Adjusted `_performUpdate()` to enforce a default block only when there are zero blocks or exactly one empty block, without collapsing multiple empty blocks. This lets users create multiple empty blocks freely while still protecting the truly empty editor case.
- Markdown trigger in single empty block: Conversion like typing `# ` in the sole empty paragraph sometimes got overridden by empty-editor protection. We now skip protection during conversion/creation and only enforce when the single empty block is a paragraph, allowing the header/list conversion to persist.

## [0.0.26] - 2025-01-28

### Fixed
- **Markdown trigger for empty block conversion (Race Condition Fix)**: Fixed critical race condition where markdown triggers like `# `, `- `, `* `, `1. ` would fail to convert empty blocks properly. The issue was that during block conversion, when `convertBlockType()` temporarily cleared the block content, the input event handler would detect an "empty" editor and call `ensureDefaultBlock()` to reset it before the transformation could complete. Added `isConvertingBlock` flag to prevent the empty editor check from interfering during block conversion, ensuring proper conversion even for trigger-only inputs.

### Fixed

## [0.0.25] - 2025-01-28

### Fixed
- **Markdown trigger for empty block conversion**: Fixed issue where markdown triggers like `# `, `- `, `* `, `1. ` would fail to convert empty blocks properly. The problem was an overly aggressive empty content check in `checkAndConvertBlock()` that prevented trigger recognition. Updated the logic to check for matching markdown triggers before rejecting empty content, ensuring proper conversion even for trigger-only inputs.

## [0.0.24] - 2025-01-28

### Fixed
- **Markdown trigger for empty block not working**: Fixed issue where typing markdown trigger sequences like `# `, `- `, `* `, `1 `, `1. ` in empty blocks would fail to convert
  - **Root Cause**: The `convertBlockType()` method was clearing block content before calling `applyTransformation()`, causing transformation methods to read empty content instead of the intended remaining content
  - **Solution**: Modified the conversion sequence to set block content to remaining content (without trigger) before applying transformation, ensuring proper conversion even for trigger-only inputs
  - This fix enables proper block conversion for all markdown triggers when typed in empty blocks
  - Conversion now works correctly whether typing just the trigger (e.g., `# `) or trigger with content (e.g., `# Hello`)

## [v0.0.23] - 2025-08-27

### Fixed
- **Empty block focus causes methods call duplication**: Fixed issue where clicking on empty blocks caused duplicate method calls
  - **Root Cause**: Both `focusin` and `mouseup` event listeners were calling `setCurrentBlock()` for the same user action
  - **Solution**: Added duplicate check in `setCurrentBlock()` to prevent setting the same block as current if it's already current
  - Removed redundant logging call in `updateToolbarButtonStates()` to eliminate duplicate console output
  - This eliminates the rapid-fire calls pattern seen in console logs when focusing empty blocks

## [v0.0.21]

## [v0.0.22]

### Fixed
- **Markdown header triggers not working**: Header triggers like `# `, `## `, ... were not detected because trailing spaces were trimmed before matching. Updated `Editor.checkAndConvertBlock()` and input handler to preserve trailing space while trimming only leading whitespace. This enables live conversion of paragraph blocks to heading blocks when typing markdown triggers.

### Fixed
- **Headers not working**: Fixed critical bug where clicking header buttons in toolbar would not convert text to headers and could cause text to disappear
  - **Root Cause**: The issue was caused by circular dependency in `HeadingBlock.applyTransformation()` method which was calling `Toolbar.h1()` etc., which in turn called `Editor.convertCurrentBlockOrCreate()`, creating infinite recursion
  - **Solution**: Refactored `HeadingBlock.applyTransformation()` to perform direct DOM transformation instead of calling Toolbar methods
  - Added proper Editor import to HeadingBlock to access `Editor.currentBlock`
  - Updated block transformation to preserve existing content during header conversion
  - Added proper focus management and cursor positioning after header conversion
  - **Testing**: Added HeaderFix.test.js to verify the circular dependency is resolved
  - **Architecture Improvement**: This fix prevents infinite recursion and ensures reliable header conversion functionality

## [v0.0.20]

### Fixed
- **Remaining Static Methods**: Completed the migration from static-based to instance-based Editor architecture by removing legacy static methods that were no longer needed
  - Removed `static key(e)` method - key handling is now fully managed by KeyHandler class through instance methods
  - Removed `static checkKeys(e)` method - key checking is now handled by KeyHandler through instance methods  
  - Removed `static handleEnterKey(e)` method - Enter key handling is now managed by KeyHandler through instance methods
  - Updated test suite to remove tests for the deleted static methods
  - Fixed test mocking issues for remaining static methods that delegate to instance methods
  - All functionality is preserved through the proper instance-based architecture using KeyHandler
  - **Architecture Improvement**: The Editor class now has a cleaner separation between static utility methods (like `html2md`, `md2html`) and instance-specific functionality

## [v0.0.19]

### Fixed
- **Empty Editor Edge Case**: Fixed critical bug where selecting all text and pressing Backspace or Delete could remove all blocks, leaving the editor unusable
  - Added `isEditorEmpty()` method to check if all blocks are effectively empty (contain only whitespace or no content)
  - Added `detachBlockEvents()` method to properly clean up event listeners before removing blocks, emitting `BLOCK_DESTROYED` events
  - Enhanced `_performUpdate()` method to detect empty editor state and automatically add a default block
  - Enhanced input event handler to catch content deletion scenarios and maintain at least one block
  - Added Delete key handling in KeyHandler (previously only Backspace was handled)
  - **Event System**: Added new `BLOCK_DESTROYED` event to track block cleanup operations
  - **Comprehensive Testing**: Added EmptyEditorEdgeCase.test.js with 11 test cases covering all edge cases
  - **Protection Logic**: Editor now ensures at least one default paragraph block remains at all times, preventing unusable states

## [v0.0.18]

### Fixed
- **Block conversion using special key sequences**: Fixed issue where typing markdown sequences like `# `, `- `, `* `, `1 `, `1. ` followed by a space would not convert paragraph blocks to corresponding block types (headers, lists, etc.). The KeyHandler was only checking for block type 'p' but ParagraphBlock renders with data-block-type 'paragraph'. Updated KeyHandler.js to check for both 'p' and 'paragraph' block types.

## [v0.0.17]

### Added
- **Block Conversion using Toolbar Buttons**: Implemented comprehensive block conversion functionality for all toolbar buttons
  - Added `convertCurrentBlockOrCreate()` method to Editor class that intelligently converts current paragraph blocks or creates new blocks when conversion isn't possible
  - Added `generateTriggerForBlockType()` method to generate appropriate markdown triggers for different block types during conversion
  - Added `createNewBlock()` method as a unified interface for creating new blocks with proper event emission
  - Added static wrapper `Editor.convertCurrentBlockOrCreate()` for backward compatibility
  - **Updated Toolbar Methods**: All block-creating toolbar buttons now use the conversion logic:
    - `h1()`, `h2()`, `h3()`, `h4()`, `h5()`, `h6()` - Convert paragraphs to headers or create new header blocks
    - `ul()`, `ol()` - Convert paragraphs to lists or create new list blocks
    - `sq()` - Convert paragraphs to task lists or create new task list blocks
    - `code()` - Convert paragraphs to code blocks or create new code blocks
    - `table()` - Convert paragraphs to tables or create new table blocks
    - `image()` - Convert paragraphs to image blocks or create new image blocks
    - `quote()` - Added new quote toolbar method with conversion support
  - **Content Preservation**: When converting blocks, all existing content is preserved and properly positioned in the new block structure
  - **Smart Behavior**: Conversion only occurs from paragraph blocks to other types; other block types trigger creation of new blocks
  - **Event Consistency**: Both `BLOCK_CONVERTED` and `BLOCK_CREATED` events are emitted appropriately depending on the action taken
  - **Fallback Compatibility**: All methods maintain backward compatibility with legacy `document.execCommand` behavior when conversion fails

## [v0.0.16]

### Added
- **Blocks Conversion**: Implemented automatic block type conversion based on markdown triggers
  - Added `checkAndConvertBlock()` method to Editor class for detecting when a block should be converted to a different type
  - Added `convertBlockType()` method to handle the actual conversion process
  - Added `findEditableElementInBlock()` method to locate the correct element to edit within converted blocks
  - Added `placeCursorAtEnd()` method for proper cursor positioning after conversion
  - Added `BLOCK_CONVERTED` event to track conversion operations
  - Integrated conversion logic into `KeyHandler.handleKeyPress()` for real-time conversion as user types
  - Added input event listener to catch content changes from paste operations and other sources
  - When typing markdown triggers (e.g., `# `, `- `, `* `, `1. `, `- [ ]`) in a paragraph block, the block automatically converts to the appropriate type (heading, list, task list, etc.)
  - Conversion only occurs from paragraph blocks to other types to prevent unwanted conversions
  - Remaining content after the trigger is preserved and properly positioned in the new block structure
  - Static method `Editor.checkAndConvertBlock()` added for backward compatibility

## [v0.0.15]

### Fixed
- **Enter keypress at the last list item**: Fixed issue where pressing Enter at the end of the last item in list blocks (unordered, ordered, and task lists) was creating a new default paragraph block instead of adding a new list item to the current list
  - Modified `ListBlock.handleEnterKey()` to detect when cursor is at the last list item and handle it appropriately
  - Updated `createNewListItem()` method signature to accept both `currentBlock` and `currentListItem` parameters
  - Enhanced `UnorderedListBlock.createNewListItem()` to append new list items to the existing `<ul>` container instead of creating separate blocks
  - Enhanced `OrderedListBlock.createNewListItem()` to append new list items to the existing `<ol>` container instead of creating separate blocks
  - Updated `TaskListBlock.createNewListItem()` to maintain consistency with new method signature
  - Added defensive programming to handle test environments and edge cases in focus management
  - Updated test cases to reflect the new behavior and ensure proper functionality
  - Lists now behave like normal contenteditable lists: Enter at the last item adds a new item, Enter at an empty last item exits the list

## [v0.0.14]

### Fixed
- **TaskList Block Presentation**: Completely refactored TaskList blocks to render as proper semantic unordered lists
  - TaskList blocks now render as `<div class="block block-sq">` containing `<ul class="task-list">` with proper `<li class="task-list-item">` elements
  - Each task item contains `<input type="checkbox">` and editable `<span>` for task text
  - Completed tasks display with `checked="checked"` attribute and strikethrough text styling
  - Checkbox state changes update both input state and text appearance dynamically
  - Updated `toHtml()` method to generate proper `<ul>` structure instead of individual `<li>` elements
  - Enhanced `toMarkdown()` method to handle multiple tasks within a single block
  - Updated Parser to group consecutive task list items into proper `<ul>` containers
  - Improved CSS styling to target the new semantic structure
  - Updated all test cases to match the new implementation architecture
  - Fixed HTML parsing to handle both legacy and new task list formats
  - Enhanced focus management and checkbox interaction for better user experience

## [v0.0.13]

### Fixed
- **Block Structure Consistency**: Fixed all blocks to be wrapped in `<div>` tags for consistent block architecture
  - Updated `UnorderedListBlock.renderToElement()` to create div wrapper containing `<ul>` element
  - Updated `OrderedListBlock.renderToElement()` to create div wrapper containing `<ol>` element  
  - Updated `TaskListBlock.renderToElement()` to create div wrapper containing `<li>` element
  - Updated CSS selectors to properly target nested list elements within div wrappers
  - All blocks now follow the consistent pattern: `<div class="block block-[type]" data-block-type="[type]">...</div>`

### ? COMPLETED: Instance-Based Architecture

**MAJOR UPDATE**: Successfully converted Editor from static to instance-based architecture with isolated event systems.

### Added
- **Instance-Based Editor Architecture**: Complete refactoring to support multiple editor instances
  - Each `new Editor()` creates an isolated instance with its own event system
  - Multiple editors can coexist on the same page without interference
  - Instance methods: `editor.on()`, `editor.off()`, `editor.once()`, `editor.emit()`
  - Static instance registry: `Editor._instances` Map for tracking all instances
  - Backward compatibility: Static methods delegate to first instance
  - Lifecycle management: `editor.destroy()` for proper cleanup
- **Enhanced Event Management System**: Implemented comprehensive event system with debouncing and throttling
  - Added `EditorEventEmitter` class with advanced features
  - Support for event priorities and one-time subscriptions
  - Debouncing for content change events (default 500ms delay)
  - Throttling for user interaction events (key presses, focus changes)
  - Structured event types with categories (CONTENT, BLOCK, EDITOR, TOOLBAR, USER)
  - Block content change tracking with timestamps using `data-timestamp` attributes

