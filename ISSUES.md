# Issues, Features and Improvements Checklist

## Bugs

Take into consideration: the bugs can be repeated, indicating that the bug may have already been fixed and appeared again.

- [x] **Focus Management**: Ensure `Editor.focus()` handles cases where the `currentBlock` is null or detached from the DOM. Add a fallback mechanism to focus on the editor instance itself.
- [x] **Clipboard Handling**: Refactor `Editor.paste()` to sanitize pasted content properly and prevent XSS attacks. Use a dedicated parser for HTML sanitization.
- [x] **Event Listeners**: Fix the `focusin` event listener in `Editor.addListeners()` to ensure it works correctly for keyboard navigation.
- [x] **Markdown Conversion**: Address edge cases in `Editor.md2html()` and `Editor.html2md()` where malformed markdown or HTML might cause errors.
- [x] **Toolbar Integration**: Ensure all toolbar buttons are dynamically initialized and their event listeners are removed during reinitialization to prevent memory leaks.
- [x] **Error Handling**: Improve error handling in methods like `Editor.initMarkdownContainer()` and `Editor.initHtmlContainer()` to log warnings when containers are not found.
- [x] **Focus management**: When backspace is pressed inside an empty block it should be removed and the nearest upper block should become active.
- [x] **Enter key press handling**. 
    - [x] Ensure that enter key press inside a block leads to creating a new default block when a cursor is at the end of block. Except cases when user edits ul or ol list, when enter key press should lead to creating a new ul or ol item.
    - [x] In lists (`ol` and `ul`) when the cursor is at the end of the its last item the `Enter` keypress must lead to creating a new list item. Now it is creating a new default block.
    - [x] Ensure that when the new default block is created it becomes focused.
    - [x] (appeared again) Ensure that enter key press inside a block leads to creating a new default block when a cursor is at the end of block. Except cases when user edits ul or ol list, when enter key press should lead to creating a new ul or ol item.
- [x] **TableBlock is not editable**: The text inside a table is not editable.
- [x] **Lists blocks margin and padding**: The padding or margin of list blocks (`ul`, `ol`, `sq`) is different from other blocks. All blocks must be aligned evenly.
- [x] **Code Block parsing error**: The ```\ncode block\n``` must be parsed as a separate block.
- [x] **Active block**: If the cursor is placed on block it should become active.
- [x] (appeared again) **Code Block parsing error**: The ```\ncode block\n``` must be parsed as a separate block.
- [x] **TaskBlock presentation**: The task block must not have `li` bullets in HTML representation. It must be rendered as `<input type="checkbox">` only. It should be aligned with proper margin from the left.
- [x] **Block classes**: The list blocks have wrong class `block-p` instead of `block-ul`, `block-ol`. The `data-block-type` attribute value is also wrong. Other block must also be checked for this error.
- [x] **Enter key focus**: When placing the cursor at the end of a block (i.e. a Header Block) and hitting Enter, the new default block is created but the cursor remains in the header block instead of moving to the newly created block. Fixed by improving focus handling in `Editor.addEmptyBlock()` and removing redundant `Editor.update()` calls.
- [x] **Backspace key focus**: When hitting backspace at an empty block, the block must be deleted (which is working) and the cursor must be placed at the end of the previous block. Now the cursor is placed at the beginning of the next block
- [x] **List elements interpreted as Blocks**: List items (`<li>` tags) should not be interpreted (and behave) as a Block element and thus should not have a `block` class on them. They are just a part of OrderedList `<ol>`, UnorderedList `<ul>` and TaskList blocks.
- [x] **TaskList HTML structure inconsistency**: TaskListBlock.renderToElement() creates a `<div>` with block classes, but Parser generates `<li>` elements with task-list-item class. This causes styling conflicts and inconsistent appearance between different rendering paths. Fixed by updating renderToElement() to create `<li>` elements consistently.
- [x] **TaskList CSS selector issues**: The CSS targets `[data-block-type="sq"]` but different rendering methods create different element types (div vs li), causing styling to not apply consistently. Fixed by updating CSS to handle both `.task-list-item` and `[data-block-type="sq"]` selectors.
- [x] **TaskList semantic structure**: Task lists should semantically be list items (`<li>`) for proper accessibility, but renderToElement() creates block divs instead. Fixed by making renderToElement() create `<li>` elements with proper semantic structure.
- [x] **TaskList event handling duplication**: Event listeners are attached in both renderToElement() and createNewListItem() methods, which may lead to duplicate event handlers or inconsistent behavior. Fixed by consolidating event handling approach.
- [x] **TaskList focus management complexity**: createNewListItem() has complex focus handling with requestAnimationFrame that may not work correctly in all scenarios, especially when dealing with text nodes and cursor positioning. Simplified focus management to use proper text container elements.
- [x] **TaskList markdown parsing edge cases**: The markdown parsing doesn't handle edge cases like capital X (`[X]`) or empty brackets (`[]`) consistently. Fixed regex patterns to handle all valid task list formats including `[X]`, `[x]`, `[ ]`, and `[]`.
- [x] **TaskList content editing inconsistency**: The renderToElement() method creates a separate editable span for text, but other parts of the code expect the checkbox and text to be direct children of the block element. Fixed by creating consistent structure with editable text container.
- [x] **TaskList checkbox interaction bug**: The Parser is using both Showdown's native task list support (which creates disabled checkboxes) and custom preprocessing. If Showdown's native task lists are processed instead of the custom <task-item> elements, the checkboxes become disabled and unclickable. Fixed by disabling Showdown's task list support (`tasklists: false`) and improving the custom preprocessing regex to handle all task list formats including uppercase X, empty brackets, different bullet styles, and indented tasks.
- [x] **All blocks must wrapped in div tag**: All blocks should be wrapped in `<div>` tag. Currently we have issues with OrderedList, UnorderedList and TaskList blocks.
- [x] **TaskList block presentation**: ✅ **FIXED in v0.0.14** - A TaskList block must me rendered as an ordinary unordered list `<ul>` with list items `<li>` representing each task of the list. The tasks inside a list item should be represented as `<input type="checkbox">` with task text near to the checkbox. The completed tasks must check the input (`checked="checked"`) and strikethrough the task text. The checked/unchecked task status must update input and task text dynamically.
- [x] **Enter keypress at the last list item**: The `Enter` key press when we are at the end of the last item of ListBlocks should add a new list item to the current list. But instead the `Enter` keypress leads to creating a new default block. The lists should behave as a normal content editable lists. To create a new default block we should press enter at the last empty list item.
- [x] **Blocks conversion**: If a list inserted inside a `Paragraph` (default) block the block should become a List block. Now it stays a paragraph block (has block-p) class on it. The other types of block must be converted in the same manner. This should be implemented as a common mechanism for converting a block from one type to another.
- [x] **Block conversion using toolbar buttons**: If a user adds a default (paragraph) block and hits a `editor-toolbar-ul` button (which inserts an unordered list), the current block should be converted to UnorderedList Block. This behaviour should be typical for other blocks as well.
- [x] **Remaining static methods**. Due to design decision we moved to instance base approach for the Editor, which was the best suiting architecture. However there may be some code pieces related to previous static architecter, which should be removed with related tests.
- [x] **Multiple tests TypeError: Cannot read properties of undefined (reading 'add')** and **TypeError: Cannot read properties of undefined (reading 'querySelectorAll')**.
- [ ] **Block conversion performance**: If a user converts the default (paragraph) block to UnorderedList Block they faces some serious performance issues. The multiple calls of `Editor.update` and `Editor.html2md` methods are observed. The conversion is not always completed. The conversion workflow must be invested. The console output should be investigated.
- [x] **Block conversion using special key sequences not working**. When user creates a new default (paragraph) block and hits the special key sequences i.e. `# `, `- `, `* `, `1 `, `1. ` which should convert the paragraph block to H1, UnOrderedList, OrderedList Blocks, that behaviour is not observed, but expected. ✅ **FIXED** - The issue was caused by duplicate handling in KeyHandler.js and Editor.js. KeyHandler was trying to handle space key conversion but this was interfering with the more reliable input event handler in Editor.js. Fixed by removing the duplicate code from KeyHandler and improving timing with requestAnimationFrame instead of setTimeout. 
- [x] **Empty Editor edge case**. When user selects all text in Editor and hits `backspace` or `del` key all blocks are removed. But there must be at least one default block left. All events should be detached from blocks before deleting. All blocks should implement some kind of before destroy handler.
- [x] **Empty Editor case**. Appeared again. When user selects all text in Editor and hits `backspace` or `del` key all blocks are removed. The infinite console warning `Editor.focus()Cannot focus on non-existent or detached element` occures. But there ALWAYS must be at least one default block in Editor. All events should be detached from blocks before deleting. All blocks should implement some kind of before destroy handler. Fixed by preventing infinite recursion in focus method and improving empty editor protection with `ensureDefaultBlock()` method.
- [x] **Endless methods call when clearing the editor**. ✅ **FIXED** - Clearing the editor was causing endless method calls due to an infinite loop between `_performUpdate()` and `ensureDefaultBlock()`. The issue was that `ensureDefaultBlock()` was calling `this.update()` which eventually triggered `_performUpdate()` again, creating an infinite cycle. Fixed by removing the `this.update()` call from `ensureDefaultBlock()` since the method is already called from within the update cycle and the newly created block will be processed by the current update cycle.
- [x] **Unordered list rendering in empty editor**. ✅ **FIXED** - The `ensureDefaultBlock()` method now checks `isParagraphBlock()` before replacing empty blocks, and the `isConvertingBlock` flag prevents empty-editor checks during conversion. Non-paragraph empty blocks (like freshly converted lists) persist correctly.
- [x] **Headers not working**. When selecting a text in editor and pushing a header button on toolbar the text does not converts to header and disapears. ✅ **FIXED** - The issue was caused by circular dependency in `HeadingBlock.applyTransformation()` method which was calling `Toolbar.h1()` etc., which in turn called `Editor.convertCurrentBlockOrCreate()`, creating infinite recursion. Fixed by implementing direct DOM transformation in `applyTransformation()` method instead of calling Toolbar methods.
- [x] **Export functions return empty strings (getMarkdown/getHtml)**. ✅ **FIXED** - Rewrote `getMarkdown()` and `getHtml()` to read directly from the live DOM via `_blockElementToMarkdown()` and `_blockElementToHtml()` private methods instead of relying on stale `this.blocks` array. All block types are now extracted from the DOM on each call.
- [x] **Code block markdown trigger (```) not working**. ✅ **FIXED** - `CodeBlock.applyTransformation()` now performs a full DOM transformation: creates `<pre><code>` structure, sets block type/class, appends language selector, and handles focus. The circular dependency with Toolbar was removed.
- [x] **Quote block markdown trigger (>) not working**. ✅ **FIXED** - Added HTML entity decoding (`&gt;`→`>`, `&lt;`→`<`, `&amp;`→`&`) in both the input handler and `checkAndConvertBlock()`. Rewrote `QuoteBlock.applyTransformation()` for direct DOM transformation instead of calling `Toolbar.quote()`.
- [x] **test-page.html had wrong editor ID**. ✅ **FIXED** - Changed to `id: 'editor'` to match what Editor.init() expects.
- [x] **test-page.html had DOCTYPE typo**. ✅ **FIXED** - Corrected `<!DOCOTYPE html>` to `<!DOCTYPE html>`.
- [x] **Lists enter keypress issue**. When pressing `Enter` key inside a **last** list item, it should create a new list item below the current one. Fixed by strengthening list-item detection in `ListBlock.handleEnterKey()` (robust `li` lookup via `closest` and selection fallback) and adding a guard in `KeyHandler.handleEnterKey()` to create a new list item instead of a paragraph when at end-of-item within lists.
- [x] **Markdown trigger for headers block not working** Fixed detection by preserving trailing spaces in trigger checks so sequences like `# ` convert paragraph to headers on space/input.
- [x] **Empty block focus causes methods call duplication**. ✅ **FIXED** - When a cursor is placed in an empty block the same methods were called multiple times. Fixed by adding duplicate check in `setCurrentBlock()` to prevent setting the same block as current if it's already current, and removing redundant logging in `updateToolbarButtonStates()`. The issue was caused by both `focusin` and `mouseup` events calling `setCurrentBlock()` for the same user action.
- [x] **Markdown trigger for empty block not working** When hitting markdown trigger key sequence, i.e. `# `, `- `, `* `, `1 `, `1. ` the empty block should convert to the corresponding block type. Now the block tries to convert, but then just clears its contents and resets to default block type. ✅ **FIXED** - The issue was a race condition between the block conversion process and the input event handler's empty editor check. When `convertBlockType()` temporarily cleared the block content during conversion, the input event handler would detect an "empty" editor and reset it to a default paragraph block before the transformation could complete. Fixed by adding a `isConvertingBlock` flag to prevent the empty editor check from interfering during block conversion.
- [x] **Editor.setCurrentBlock is called multiple times** ✅ **FIXED** - When a cursor is placed at a block, the `Editor.setCurrentBlock()` method was called multiple times unnecessarily, leading to performance issues. Fixed by optimizing the duplicate check to occur before any logging/processing operations, and by reducing redundant event handlers. Removed the redundant `mouseup` event handler and added mouse tracking to prevent `focusin` events from firing duplicate calls when caused by mouse interactions.
- [x] **Remove Editor remaining static methods**. Due to design decision we moved to instance base approach for the Editor, which was the best suiting architecture. However there may be some code pieces related to previous static architecter, which should be removed one by one with related references and tests. ✅ **ADDRESSED in latest commit** - Static methods have been deprecated in favor of instance methods. The Toolbar now uses instance methods through `Toolbar.editorInstance`. All static methods are marked as `@deprecated` and delegate to the first editor instance for backward compatibility. This allows for gradual migration while maintaining the instance-based architecture.
- [x] **Empty blocks are automatically removed**. ✅ **FIXED** - When a user hits `enter` key in an empty block a new empty (default) block should appear and persist. Previously, empty blocks were being automatically removed by the input event handler which checked if all blocks were empty and then trigered the `ensureDefaultBlock()` method. Fixed by adding an `isCreatingBlock` flag that prevents the empty editor check from running immediately after creating new blocks. This allows users to create multiple empty blocks as intended. A user can now create as many empty (default) blocks as they want and they will persist.
- [x] **Extract debug tooltip to its own class** All debug tooltip functionality should be extracted from the `Editor` to its own class. The current implementation violates SRP principle. ✅ **COMPLETED** - Successfully extracted all debug tooltip functionality into a new `DebugTooltip` class. The `Editor` class is now cleaner and follows the Single Responsibility Principle. The `DebugTooltip` class handles all tooltip creation, positioning, content updating, and lifecycle management. Backward compatibility is maintained through proper integration with the existing debug mode toggle functionality.
- [x] **Single empty block issue**. If an Editor contains only one empty (default) block a user can not add another empty (default) block by hitting `enter` key. A new block appears and then is removed. A user can add unlimited number of empty blocks.
- [x] **Markdown triger for single empty block not working**. Fixed by skipping empty-editor enforcement during conversion/creation and only replacing a single empty block when it’s a paragraph, allowing triggers like `# ` to convert the sole empty block to a header.
- [x] **Header focus issue after conversion**. ✅ FIXED - After markdown trigger conversion (e.g., `# `), focus now moves to the inner heading element (e.g., `<h1>`), not the block container. Implemented by preferring inner contenteditable elements in `Editor.findEditableElementInBlock()` and ensuring `HeadingBlock.applyTransformation()` marks the heading as `contenteditable` and is focusable.
- [x] **Pasting complex content**. ✅ **FIXED** - Complex formatted content (lists, tables, multiple paragraphs) is now correctly parsed and each text block is rendered as a separate block element. The paste handler now detects multiple blocks/lines and creates individual block elements instead of inserting everything as a single HTML fragment. Enhanced with proper sanitization, block creation events, and support for both HTML and plain text multi-line content.
- [x] **Code block conversion issue**. ✅ **FIXED** - The `editor-toolbar-code` button in toolbar is now working correctly. Fixed by removing circular dependency between `CodeBlock.applyTransformation()` and `Toolbar.code()`, implementing proper block conversion through `Editor.convertCurrentBlockOrCreate('code')`, and ensuring HTML entity escaping for security. The code button now converts selected text to a properly formatted code block with syntax highlighting support.
- [x] **Markdown triggers for lists not working**. ✅ **FIXED** - List triggers (`- `, `* `, `1. `, `1 `) now properly convert paragraph blocks. Fixed by HTML entity decoding in the input handler and `checkAndConvertBlock()`, and by protecting conversion with `isConvertingBlock` flag. Verified by MarkdownShortcuts tests (all 5 list tests pass).


## Features

- [x] **Get Editor content as markdown**: The `Editor` must provide a static method `getMarkdown` for getting all its content in markdown format. Just a content without metadata must be provided.
- [x] **Get Editor content as html**: The `Editor` must provide a static method `getHtml` for getting all its content in html format. Just a content without metadata must be provided.
- [x] **BlockInterface**. Each block must implement a `BlockInterface`.
- [x] **Toolbar buttons groups**. Toolbar buttons must be placed inside a group. A block can create its own group or put its control buttons to other groups.
- [x] **Block integration with Toolbar**: Blocks must provide control buttons to Toolbar. I.e. a `TableBlock` should put a button to toolbar for creating tables. Each block must provide a static method returning toolbar configuration. Block must have control on its own toolbar buttons and buttons of other blocks.
- [x] **Checklist support**: A BlockType for working with checklists (square brackets, where `- [ ] unchecked item` means unchecked item and `- [x] checked item` means checked item). Checklists must be represented as `<input type="checkbox">` html tag.
- [x] **Tables support**: A BlockType for working with basic markdown tables.
    - [x] The ability to add and remove table columns and table rows. The buttons should appear near the current table when it is in focus.
- [x] **Images support**: A BlockType for working with images. An ImageBlock must support drag and drop. An image can have an URL. An image inside an ImageBlock must be resizable.
- [x] **Event listeners**: The support of events. A change in the editor content must trigger an event so that the whole content can be send to backend and stored. Such events can be debounced with custom interval to avoid too frequent updates.
- [x] **Event system improvements**: Subscription to event through Editor instance. Events can be subscribed through `Editor` method `on`.
- [x] **Tracking blocks changes mechanism**: Use timestamp(content) for tracking changes in block's content. Use `data-timestamp` attribute on Blocks for holding timestamp value.

## Improvements

- [x] **Block Architecture Refactoring**: Refactored the editor to use a modular block architecture where each block type is its own class with specific key press handling and behavior. This provides perfect extensibility for future block types.
- [x] **Code Quality**: Enforce consistent code style using Prettier and ESLint. Refactor repetitive code in `Editor.js` and `ToolbarHandlers.js`. *(Partially completed with block architecture refactoring)*
- [ ] **Dynamic Toolbar Configuration**: Allow users to dynamically configure toolbar buttons and their behavior via a plugin system.
- [ ] **Export/Import**: Support exporting and import of Editor content to JSON with block metadata.
- [ ] **Performance Optimization**: Use a virtual DOM approach to minimize DOM updates and improve rendering efficiency, especially for large documents.
- [ ] **Accessibility**: Add ARIA roles and keyboard navigation support to ensure the editor is fully accessible.
- [ ] **Scalability**: Optimize the `Editor.update()` method to handle thousands of blocks efficiently without performance degradation.
- [ ] **Testing Coverage**: Write integration tests for edge cases, such as invalid toolbar configurations and malformed content blocks.
- [ ] **Enhanced Parsing**: Extend markdown parsing to support advanced syntax like tables, task lists, and fenced code blocks.
- [ ] **Version Control**: Add versioning capabilities to track changes and allow rollback to previous states.

---

## Spec Conformance Review and Improvement Proposal (2025-08-28)

This section summarizes a spec-to-implementation review against `SPECS.md`, highlights gaps, and proposes concrete, prioritized improvements. No code changes have been made; this is a structured plan.

### quick summary
- Broad alignment: instance-based Editor, block architecture, conversion flow (`convertCurrentBlockOrCreate`), flags (`isCreatingBlock`, `isConvertingBlock`), paste sanitization with multi-block insert, parser customizations (tasklists disabled, code fence preprocessing), toolbar groups and dynamic init/cleanup, per-block `applyTransformation`/`handleEnterKey`, event system with throttling, `data-timestamp`, instance export methods.
- Divergences/risk areas surfaced by tests: toolbar view toggles rely on demo DOM, some contexts lack `editorInstance` binding, `Element.closest` missing in JSDOM, legacy expectations in Heading/KeyHandler tests, mixed-block parsing counts, and a few performance hotspots during conversions.

### priorities at a glance
- P0: Stabilize conversion and key flows in all contexts; ensure toolbar safety and test env compatibility; reduce redundant updates during conversion.
- P1: Replace deprecated `document.execCommand` usages; harden paste sanitizer policy; improve accessibility.
- P2: Expand test harness and fixtures to reflect instance APIs; observability and docs polish.

### editor core
- Conformance: `focus()` fallback, `ensureDefaultBlock()`, dedupbed `setCurrentBlock()`, creation/conversion flags, instance exports present.
- Gaps/risks:
    - Redundant update cycles observed during conversion in some flows (console shows multiple `update`/`html2md` passes).
    - Tests expect synchronous `update()` side-effects; implementation uses debounced/emitted updates.
- Proposals:
    - Batch DOM mutations during conversions (single `requestAnimationFrame` or microtask batch) and call `update()` once per conversion.
    - Provide a test hook: `Editor.flushUpdates()` to drain debounced work in tests; document it in `SPECS.md` and use it in Jest.
    - Add lightweight performance counters (DEV-only) for `update()` invocations per user action with console summary in debug mode.

### keyboard handling (Enter/Backspace and markdown triggers)
- Conformance: List enter-at-end creates item; empty-block creation fixed; triggers like `# ` work; focus moves to inner element after conversion.
- Gaps/risks:
    - Some tests report mismatches for Heading transforms (attribute/class checks) and KeyHandler calling patterns.
- Proposals:
    - Ensure Heading blocks set `contenteditable` on inner heading and preserve expected classes/attributes for backward-compat tests or adjust tests to the new contract (preferred).
    - Add unit tests covering: end-of-item detection, conversion flags preventing race with empty-editor protection, and focus targeting via `findEditableElementInBlock()`.

### toolbar and handlers
- Conformance: Instance interaction via `Toolbar.editorInstance`, dynamic init, groups, cleanup tracker.
- Gaps/risks:
    - View toggles (`text`, `markdown`, `html`) query demo-specific selectors; tests see undefined elements (classList errors).
    - Some tests run Toolbar methods without binding `editorInstance`.
- Proposals:
    - Make view toggles no-op when containers are missing; guard all DOM reads/writes and return early if not present.
    - Add an optional `options.viewSelectors` in `Toolbar.init` for explicit targets; default to safe no-ops in library usage.
    - Document that these view methods are demo-helpers; not required for core library.

### parser and content processing
- Conformance: Tasklists disabled in Showdown; custom preprocessing for fences and task items; multi-block paste supported.
- Gaps/risks:
    - Mixed-block parsing count mismatches in tests indicate edge cases in fence normalization or list grouping.
- Proposals:
    - Add golden tests for: nested lists with task items, back-to-back fenced code + paragraph, and table then list sequences.
    - Instrument parser steps (DEV-only logs behind debug flag) to trace tokenization vs. block reconstruction during failures.

### paste sanitization and security
- Conformance: Sanitization present; multi-block splitting implemented.
- Proposals:
    - Externalize allow/deny lists into a config with sensible defaults; expose `onPasteTransform(html|text)` hook for apps.
    - Add tests for script/style/iframe stripping and data-URL whitelisting only for images when enabled.

### accessibility (a11y)
- Proposals:
    - Add ARIA roles for toolbar and buttons; toggle `aria-pressed` for active state; ensure focus visibility.
    - For task list items, associate checkbox and label text; ensure keyboard toggle with space/enter.
    - Announce conversions via `aria-live="polite"` region in debug mode (optional).

### deprecated APIs and migration
- Conformance: Static shims delegate to first instance and are marked deprecated.
- Proposals:
    - Emit a single deprecation warning once per session; document migration guide in `README.md`.
    - Add runtime assertion if multiple editors exist and static APIs are used, to steer users to instance methods.

### testing and CI
- Current status: Many failing tests (e.g., toolbar view, Heading expectations, `closest` in JSDOM, conversion method undefined in certain harnesses).
- Proposals:
    - Add polyfills in `tests/setup.js` (e.g., `Element.prototype.closest`) and DOM fixtures for view toggles.
    - Update tests to instantiate an Editor and pass it to Toolbar where needed; avoid calling toolbar actions without an instance.
    - Provide `Editor.flushUpdates()` test helper to make debounced updates deterministic.
    - Mark legacy static-API tests as deprecated; replace with instance-based ones.

### observability and debug
- Proposals:
    - Ensure `DebugTooltip` shows `data-timestamp`, block type, selection info; add toggle via keyboard (e.g., Ctrl+Alt+D).
    - Add namespaced event logs with counts and last payload preview when debug mode is active.

### performance optimization
- Proposals:
    - Coalesce multiple conversions/updates in a tick; remove cascading `html2md` calls inside conversions where avoidable.
    - Defer expensive parsing until idle (`requestIdleCallback` with timeout fallback) for large pastes.
    - Add simple trace to measure time spent in `update()`, `html2md()`, `md2html()`; expose in debug tooltip.

### roadmap and tasks
- [ ] P0: Add guards and selector config to Toolbar view toggles; make them safe no-ops without containers.
- [ ] P0: Provide `Editor.flushUpdates()` and batch conversion updates to one `update()` per action.
- [ ] P0: Add `closest` polyfill in Jest setup and fixtures for toolbar view tests; ensure tests bind `editorInstance`.
- [ ] P1: Replace `document.execCommand` with Selection/Range-based ops in toolbar formatting paths.
- [ ] P1: Externalize sanitizer policy and add security-focused paste tests (strip scripts/unsafe attrs).
- [ ] P1: Add a11y attributes/roles and keyboard toggles for toolbar and task lists.
- [ ] P2: Add parser golden tests for mixed content edge cases; instrument debug logs behind a flag.
- [ ] P2: Emit deprecation warnings once per session; document migration in README.
- [ ] P2: Add performance counters and debug visualization for update cycles.

### acceptance criteria
- Toolbar view methods never throw when DOM fixtures are absent; library builds remain framework-agnostic.
- Conversions trigger a single `update()` per action; measured by dev counters <= 1 per conversion in debug mode.
- Tests pass with polyfills/fixtures; no reliance on deprecated static APIs; deterministic update behavior via `flushUpdates()`.
- Paste sanitizer blocks unsafe content by default and is configurable; tests cover common attack vectors.
- Basic a11y checks: roles/aria attributes present; keyboard interaction for checkboxes; focus retention after conversions.

### risks and mitigations
- Replacing `execCommand` touches user interaction paths; mitigate by introducing parallel code path behind a feature flag and keeping legacy fallback for one minor version.
- Tightening sanitizer may change existing content behavior; mitigate with a config default matching current behavior and a warning when unsafe content is encountered in debug mode.

— End of proposal —
