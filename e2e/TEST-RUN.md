# Browser test run — 2026-09-26

Environment: Windows, Node 24.19.0, Playwright Chromium, local Vite server at `http://localhost:5173`. A visible in-app browser was also used to follow the editing path.

## Results

- Baseline browser suite: 68 passed, 3 skipped.
- New writing-journey suite: 9 passed in the focused run.
- Initial complete browser run: 80 passed, 0 failed, 0 skipped in 2.8 minutes (4 workers, no retries).
- Previous browser run after image/inline-code/list-layout changes: 104 passed.
- Previous browser run after caret/link/help changes: 124 passed.
- Final complete browser run after themes/scroll/tooltips changes: **132 passed, 0 failed, 0 skipped** in 2.6 minutes (4 workers, no retries).
- Final unit/integration suite: 60 suites, **1007 tests passed**.
- Library build, post-build artifact copying, and package verification: passed.
- Whitespace/diff check: passed.

The three original skipped browser tests are now enabled. Two mixed-content deletion tests now assert correct recovery instead of asserting the old bug.

## Visible browser walkthrough

Performed with keyboard and mouse actions on the actual demo:

1. Created a heading, bold paragraph, two list items, and a closing paragraph.
2. Inspected Markdown and HTML previews, then returned to editing.
3. Selected and deleted the mixed document and successfully typed two new paragraphs.
4. Converted a heading to normal text and confirmed its block type changed and the dropdown closed.
5. Entered two code lines, exited with Ctrl+Enter, and confirmed both lines and the following paragraph in Markdown.
6. Created a task through the toolbar, checked it, and confirmed `[x] Ship release` in Markdown.

Table cell navigation, clipboard paste, plain-text undo/redo, and standalone heading labels are also checked by the new Playwright tests.

## Horizontal-rule and bullet-caret follow-up

Both user-reported issues were reproduced in the visible browser: typing `---` left a paragraph containing literal dashes, and Enter after a bullet item displayed the empty item's caret before the bullet.

The new `delimiter-list-caret.spec.js` suite initially reported 5 failures and 1 pass. After the fixes, all 6 pass:

- Standalone `---`, `***`, and `___` convert immediately to a horizontal-rule block and focus a new paragraph below it. Continued writing and both exports are checked.
- Rule markers inside ordinary text are retained.
- Lists created with the shortcut or toolbar have an empty first/new line at the same horizontal position as typed text, to the right of the bullet. Tests check focus, collapsed selection, rendered line geometry, typing, export, and list exit.

The visible walkthrough confirmed the horizontal rule, typing below it, the corrected empty-item caret, two completed list items, exit into a paragraph, and Markdown preview. Unit tests also check whole-line delimiter matching and that empty-list placeholders add no characters to exports. The full browser/unit suites, library build, package verification, and diff check passed again.

Follow-up logs: `test-results/delimiter-caret-{baseline,focused,full,unit,build}.log`.

## Checkbox alignment and debug-border follow-up

The visible browser reproduced checkboxes sitting above their text and a task-list border remaining visible with debug mode off. Checkbox sizing and top spacing now follow the text size and line height, with a full editable line reserved for empty items. Task-specific border overrides were removed so the shared debug rules control both active and inactive borders.

All 4 tests in `task-list-layout.spec.js` pass: parsed checked/unchecked tasks at default and larger text sizes; empty and wrapped toolbar-created tasks, continuation and checkbox export; and debug on/off with active/inactive borders and stable document geometry. The visible browser also confirmed alignment and the absence of borders with debug off. This follow-up changes CSS only; the previously recorded full unit/browser runs were not repeated.

The library build, package verification, and diff check also passed. Follow-up logs: `test-results/task-layout-focused.log` and `test-results/task-layout-build.log`.

## Pinned toolbar and list-editing follow-up

The toolbar now starts pinned and has a right-hand toggle with an accessible name and pressed state. CSS sticky positioning keeps it within its editor's scrolling area. Consumers can start unpinned with `toolbar: { pinned: false }`, change it through `editor.toolbar.setPinned(...)`, and configure a fixed-header offset through `--bke-toolbar-top`. The setting belongs to each editor instance and resets on reload.

The visible browser confirmed both reported defects before the fixes: an empty checkbox item remained after Backspace, and the numbered-item caret appeared before the number. Task boundaries now handle Backspace before whole-block deletion: an empty later item is removed, later text merges into the preceding task, and the first task becomes a paragraph while preserving formatting and remaining tasks. Numbered lists now use an empty-line placeholder and immediate focus; the standalone content stylesheet places numbers outside the text to avoid a caret jump as typing begins.

All 8 tests in `toolbar-and-list-editing.spec.js` pass, covering scrolling, mouse/keyboard pin toggling, retained selection, numbered-list shortcut/toolbar creation, checkbox removal, task merging, formatting, checkbox state, and continued text deletion. The full browser run passes all 98 tests. The visible browser walkthrough also confirmed pin/unpin while scrolled, checkbox Backspace followed by continued typing, and numbered-list caret alignment. Build and package verification passed.

Logs: `test-results/toolbar-lists-{focused,full,unit,unit-focused,build}.log`.

## Images, inline code, and list alignment follow-up

Image-block-only CSS did not constrain images pasted into paragraphs, and the image renderer initialized resizing on the wrapper with a resize cursor across its entire surface. All content images now fit the editor width. Image blocks share a responsive image/handle structure; only the corner handle starts resizing, with pointer capture, maximum-width clamping, and proportional height. Standalone HTML/Markdown images and clipboard image files get a following paragraph for continued typing. File reads update their inserted image without moving a later caret.

The new inline-code button formats selected text without changing its block type and toggles code back to ordinary text. Native editing commands retain undo support, and selections across blocks/items/cells are rejected. The shared list gutter aligns bullet/number/checkbox centers and the start of their text.

All 6 tests in `images-inline-code-layout.spec.js` pass, covering large standalone and paragraph images, PNG clipboard paste, continued typing, constrained resizing, narrower viewports, cursor styles, inline-code export/toggling/undo, multi-block selection preservation, and list alignment. Unit coverage also checks safe image attribute rendering and preservation of text around a pasted image. The full run passes 104 browser tests and 990 unit tests; library build, package verification, and diff check pass.

The visible browser walkthrough pasted a 2400-pixel-wide image, resized it using the corner handle, and typed below it. It also applied inline code to selected text and displayed bullet, numbered, and checkbox lists with matching text columns. A complete demonstration remains open in the browser.

Link-control recommendation (design only): a chain icon and Ctrl/Cmd+K should open a small anchored URL field, with Enter to apply, Escape to cancel, and edit/remove actions for existing links. A full modal is unnecessary. Rich HTML paste already retains safe links.

Logs: `test-results/images-code-{focused,full,unit,unit-focused,build}.log`.

## Test infrastructure finding

An earlier complete run passed 78 tests but lost the development server before the last two pages loaded. The server log showed `EBUSY` while watching a generated `dist/editor.css` file. It also showed generated coverage HTML causing live page reloads. Vite now excludes build/report directories from its watcher. The final full run is performed after this fix.

## Limits and next work

This run validates the listed desktop paths; it does not establish that the editor is free of bugs. Structural undo/redo, complex paste, images, multi-instance/read-only workflows, richer table/list operations, and other browser engines remain in the prioritized [test plan](TEST-PLAN.md). Export cleanup and clean-install demo dependencies also need follow-up.

Changes are local and uncommitted. Existing user changes to agent/skill files were left intact.

Artifacts: `playwright-report/index.html`, `test-results/browser-journey-results.log`, `test-results/unit-journey-results.log`, and `test-results/build-journey-results.log` (generated and ignored by Git).

## Paragraph deletion, links, and Russian help

Reproduced the user's exact sequence in the visible browser: create two bullet items, exit into a paragraph, erase it, press Backspace again, and type. Before the fix the paragraph disappeared and the next character was lost. Afterward typing continues at the end of the last list item.

The new caret-links-help.spec.js adds 20 passing scenarios covering all three lists, headings, formatted paragraphs, quotes, code, tables, first/last empty paragraphs, and editable boundaries beside media. Links are tested for insertion, editing, removal, cancellation, unsafe-address rejection, undo, and HTML/Markdown export. Russian help, translated default labels and overrides, narrow screens, keyboard activation, multiple editors, and cleanup are also covered.

The inline-code button is adjacent to the code-block button. The link panel is non-modal; the Russian help button immediately precedes the translated pin toggle. These were also exercised manually in the in-app browser.

Library build, post-build, package verification, and git diff whitespace checks passed. Changes remain uncommitted.

## Quotations, system themes, link scrolling, and toolbar hints

Reproduced the link-Apply bug in the visible browser: scroll position changed from roughly 517px to 0 and the first block became active. After the fix, applying a link retained the viewport (539px in the confirmation run) and the selected paragraph remained active. The tests cover mouse/Enter application, removal, and cancellation in both window and nested scrolling containers.

The new themes-scroll-tooltips.spec.js adds eight browser scenarios. Light and dark screenshots were inspected, including a correction for table focus colors that were previously hard-coded. Tested JavaScript and JSON text/token contrast is at least 4.5:1 in both palettes. System theme changes preserve text and selection; syntax styles stay scoped to the editor. Toolbar tests cover first-in-group ordering, icon titles/accessibility labels, and actual Bold/Undo/Redo keyboard behavior.

Theme screenshots from the final run are saved as test-results/theme-light.png and test-results/theme-dark.png. The updated dark editor preview is also open in the in-app browser.

Final verification: 132 browser tests and 1007 unit/integration tests passed. Library build, package verification, and whitespace checks passed. The old debug-border color expectation was updated for the new palette before the final complete browser run.
