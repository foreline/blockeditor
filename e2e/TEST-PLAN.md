# BlockEditor end-to-end test plan

## Purpose and scope

Protect a user's ability to write, revise, paste, export, clear, and continue a document without losing text or leaving the editor unusable. Test the real demo (`/`) as well as the empty fixture (`/test-page.html`). Browser interaction is essential: the Jest suite mocks selection and much of the DOM.

The current automated browser target is desktop Chromium. This is not a claim of Firefox, Safari, mobile, IME, or assistive-technology compatibility.

## Primary acceptance journey

Implemented in `writing-journey.spec.js`, using keyboard and toolbar actions. Editor API access reads the exported result; it does not create the document or repair the selection.

1. Open `/`; confirm the content and toolbar are visible and no uncaught page errors occur.
2. Click the first block, press Ctrl/Cmd+A and Backspace. Expect one empty paragraph and usable controls.
3. Type `# Release notes`, then Enter. Expect a heading followed by a paragraph.
4. Type `Today we tested **bold** and plain text.` Expect bold formatting and all surrounding text intact.
5. Enter, type `- First item`, Enter, type `Second item`, Enter twice, then `Final paragraph`. Expect four blocks in that order and exactly two list items.
6. Open Markdown, then HTML preview. Check heading, emphasis, list content, and closing paragraph.
7. Return to text view; append ` updated` to the closing paragraph.
8. Select all and delete again. Type `Rebuilt first`, Enter, then `Rebuilt second`. Expect exactly two paragraphs and matching Markdown.

Do not add sleeps to conceal dropped characters or misplaced caret movement. Assert each meaningful state with Playwright's retrying assertions.

## Additional automated acceptance paths

| Path | Required result |
| --- | --- |
| Heading → normal text | Block metadata, HTML/Markdown export, toolbar availability, and subsequent Enter behavior all become paragraph behavior. |
| Heading dropdown | Selecting an item closes the menu and resets its expanded state. |
| Standalone heading buttons | H1, H2, H3 have visible, accessible labels. |
| Code → paragraph | Empty code area is clickable; Enter preserves a newline in export; Ctrl/Cmd+Enter creates an editable paragraph below. |
| Task checkbox | Checking and unchecking changes both the visible state and `[x]` / `[ ]` in Markdown. |
| Table navigation | One Tab moves one cell; editing the next cell does not overwrite the previous cell. Both values export. |
| Plain typing undo/redo | Undo removes the typed text; redo restores it; Enter and further typing still work. |
| Clipboard Markdown | Pasting a heading and paragraph preserves their block types; typing continues at the pasted suffix. |
| Horizontal-rule shortcuts | Typing `---`, `***`, or `___` on its own creates a rule immediately, places the caret in a paragraph below, and exports `---` / `<hr>`. Markers inside ordinary text remain text. |
| Empty bullet-item caret | Shortcut- and toolbar-created lists place the empty first/new item's caret at the same horizontal position as typed text, after the bullet; typing, Markdown export, and empty-item exit still work. |
| Checkbox-list layout | Checked/unchecked boxes align with the first text line at default and larger text sizes, with empty and wrapped items. Debug borders disappear when disabled and distinguish active/inactive blocks when enabled without shifting content. |
| Toolbar pinning | Pinned by default at the scroll area's top; the right-hand toggle unpins/repins by mouse or keyboard, preserves content and selection, and exposes its pressed state. |
| Checkbox Backspace | Empty later items disappear and focus returns to the previous task; a first item becomes a paragraph; merging tasks preserves text, formatting and neighboring checkbox states. Text-range deletion remains native. |
| Numbered-list caret | Empty first/new items place the caret after the number at the text origin; immediate typing and numbered Markdown export preserve both items. |
| Pasted images | Oversized HTML images, including images inside paragraphs, fit the editor. Clipboard PNG pixels create an image block and a following editable paragraph. Resizing and a narrower viewport retain aspect ratio and width limits. |
| Image mouse behavior | The image body has a normal cursor; only the bottom-right handle shows a resize cursor and starts a resize operation. |
| Inline code control | Selected text becomes inline code and toggles back without converting the paragraph. Markdown export and native undo work; multi-block selections remain intact. |
| Shared list gutters | Bullet, number, and checkbox centers align; the editable text of all three starts in the same column. |
| Existing regression suite | Cross-block deletion, selection recovery, repeated Enter, block order, shortcuts, inline formatting, and exports continue to pass. |

## Defects found during this run

These received fixes and automated coverage:

- Heading-to-paragraph conversion changed appearance without updating block identity or toolbar restrictions.
- Standalone label-only toolbar buttons rendered blank; native dropdowns stayed open after selection.
- Deferred block conversion and caret movement could lose or misplace rapidly typed characters. Inline formatting could miss text when the user immediately moved to another block.
- Select All was limited by nested editing hosts; deleting mixed content could leave an empty heading. Cross-host deletion also needed a keydown path because the in-app browser did not always issue `beforeinput` for that selection.
- Empty-editor recovery unnecessarily replaced a valid empty paragraph, interfering with native editing history.
- Toolbar-created tasks used a different DOM structure from parsed tasks, and their change handler reversed the checkbox's native toggle.
- Tab actions ran on both keydown and keyup; converted tables also had an editable wrapper and delayed focus.
- Empty code had no reliable click target, and exported code lost browser-generated paragraph/line-break boundaries.
- Multiline Markdown paste wrapped headings in paragraph blocks, giving incorrect block identity and exports.
- Horizontal-rule shortcuts were excluded from the typing conversion filter; converted rules also need an editable paragraph below for continued typing.
- Empty bullet items lacked a rendered text line, so Chromium drew the caret before the inside bullet. Empty items now use a line-break placeholder without adding characters to exports.
- Checkbox lists used a fixed checkbox offset instead of aligning to the first text line, and task-specific borders remained visible outside debug mode. Their layout now follows text sizing and the shared block debug rules.
- Task lists had no item-level Backspace handling; the generic whole-block check could not remove an empty item. Task boundaries now have explicit removal/conversion/merge behavior.
- Numbered items lacked empty-line placeholders and deferred focus; inside numbers also collapsed the gap before empty text. Placeholders, synchronous focus, and outside markers in content-defaults keep the caret aligned.
- Pasted paragraph images bypassed image-block sizing rules. All content images are now constrained, and standalone/file images get an image block followed by an editable paragraph.
- Image rendering initialized resizing on the wrapper instead of the image and used a resize cursor across the entire block. Rendering now shares one image/handle structure, with pointer capture and bounded proportional resizing.
- The existing inline-code method called block formatting and had no toolbar binding. It now formats selected text and uses native editing commands for undo.
- List marker placement is now a shared column in the core stylesheet, replacing the different native marker positions described in the earlier numbered-list fix.

Three obsolete `fixme` skips were removed. Two tests that asserted known-broken mixed-content deletion now assert the intended behavior.

Generated build and report folders are excluded from Vite's watcher to prevent test-page reloads and Windows file-lock errors during validation.

## Remaining test backlog

These are coverage gaps, not verified passing behavior:

| Priority | Scenario | Assertions |
| --- | --- | --- |
| P0 | Undo/redo after structural changes, paste, and cross-block deletion | Restore exact content, types, selection, checkbox state, and editable structure. Current undo coverage is plain typing only. |
| P0 | Mixed-block selection replacement and cutting | Test heading/list/code/table boundaries, forward and backward selection, Backspace/Delete, and typing over selection. |
| P0 | Rich HTML and complex Markdown paste | Preserve surrounding text, nested lists, fenced code, blank lines and tables; reject active HTML and unsafe URLs. Simple clipboard Markdown is covered. |
| P1 | Multiple instances and read-only mode | Edits, toolbar actions, events, selection and Select All remain scoped; read-only content cannot mutate. |
| P1 | Additional image operations | URL-dialog cancellation, alt editing, broken images, and upload failures. HTML/file paste, basic resizing, width limits, and following-paragraph typing are covered. |
| P1 | Ordered/task list continuation and indentation | Enter, Tab, Shift+Tab, empty-item exit, checkbox states, exact exported nesting. |
| P1 | Table row/column operations | Add/remove, last-cell Tab, Shift+Tab, Enter, selection, export and continued editing. |
| P1 | Export hygiene and round trips | Strip editor-only attributes/zero-width caret markers; parse exported content back without semantic loss. Existing HTML output still includes editing attributes. |
| P1 | Clean installation and packaged library | Demo dependency imports must resolve after a clean install; test built ES/CJS/IIFE consumers. Demo pages currently import Bootstrap/Popper although package.json does not declare them. |
| P2 | Firefox/WebKit, mobile, IME and accessibility | Composition input, touch selection, keyboard-only menu use, screen-reader labels, long-document scrolling. |

## Running and reviewing

```sh
npm run test:e2e -- --workers=2
npm run test:e2e -- e2e/writing-journey.spec.js --headed --workers=1
npm run test:e2e -- e2e/delimiter-list-caret.spec.js --headed --workers=1
npm run test:e2e -- e2e/task-list-layout.spec.js --headed --workers=1
npm run test:e2e -- e2e/toolbar-and-list-editing.spec.js --headed --workers=1
npm run test:e2e -- e2e/images-inline-code-layout.spec.js --headed --workers=1
npm test -- --runInBand
npm run build:lib
npm run verify
```

Playwright starts the development server automatically on port 5173. The default HTML report is in `playwright-report/`; screenshots and retained failure traces are in `test-results/`. A failed acceptance test must not be weakened to assert broken behavior or skipped without an explicit tracked issue.

Record final run counts and manual-browser observations in `TEST-RUN.md`.

## Caret boundaries, links, and Russian help

- Delete a paragraph after UL, OL, and tasks; type immediately at the last item.
- Repeat after paragraphs with inline formatting, headings, quotes, code, tables, and an empty final list item.
- Remove the first empty paragraph with Backspace/Delete: type at the start of the next block. Preserve an insertion paragraph beside non-editable media and the sole empty paragraph.
- Apply, edit, remove, cancel, and undo links; reject unsafe URLs and cross-block selections. Verify HTML and Markdown export, including lists.
- Verify keyboard activation, selection isolation between editors, translated labels/overrides, and panel cleanup on destroy.
- Open Russian help at a narrow viewport; verify shortcut text, panel fit, Escape, and inline-code/help/pin ordering.

## Themes, quotations, tooltips, and link scroll position

- Select text near the end of a long document; apply a link by mouse and Enter. Verify page and nested-container scroll offsets, active block, and subsequent typing.
- Repeat removal and Escape cancellation without moving the viewport.
- Check light and dark themes for quotes, code blocks, syntax tokens, language selectors, help panels, source views, and focused table cells.
- Require at least 4.5:1 contrast for the tested JavaScript/JSON code text and syntax tokens; visually inspect both theme screenshots.
- Change the browser color-scheme preference while editing and verify text and selection remain unchanged.
- Verify every toolbar icon has a title and accessible label. Check link/inline-code group order and actual Bold, Undo, and Redo keyboard behavior.
- Verify the optional Prism stylesheet does not recolor code outside the editor.
