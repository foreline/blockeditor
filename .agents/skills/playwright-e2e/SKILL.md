---
name: playwright-e2e
description: Write, debug, and maintain Playwright E2E tests for the BlockEditor. Use this when creating browser automation tests, debugging test failures, adding new test scenarios, or improving test coverage for editor functionality.
---

# Playwright E2E Testing

Write and maintain end-to-end tests for the BlockEditor using Playwright, following project conventions for test structure, naming, and best practices.

## Test Configuration

- **Framework**: Playwright Test (`@playwright/test`)
- **Config file**: `playwright.config.js`
- **Test directory**: `e2e/`
- **Test page**: `test-page.html` (clean test environment)
- **Browser**: Chromium (default), configurable for Firefox/WebKit
- **Dev server**: Auto-starts on `localhost:5175` during tests

## Test File Structure

### Naming Convention
```
<feature>.spec.js
```

Examples:
- `editor.spec.js` — Core editor functionality
- `blocks.spec.js` — Block-specific tests
- `toolbar.spec.js` — Toolbar interaction tests
- `export.spec.js` — Export functionality tests

### Test Organization

```javascript
import { test, expect } from '@playwright/test';

test.describe('Feature Group Name', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to test page
    await page.goto('/test-page.html');
    
    // Wait for editor initialization
    await page.waitForFunction(() => window.editorReady === true, { 
      timeout: 5000 
    });
  });

  test('should [specific behavior]', async ({ page }) => {
    // Arrange - set up test conditions
    const block = page.locator('[contenteditable="true"]').first();
    
    // Act - perform user actions
    await block.click();
    await page.keyboard.type('Test content');
    
    // Assert - verify expected outcomes
    await expect(block).toContainText('Test content');
  });
});
```

## Common Test Patterns

### Editor Initialization
```javascript
// Always wait for editor to be ready
await page.goto('/test-page.html');
await page.waitForFunction(() => window.editorReady === true);
```

### Block Interaction
```javascript
// Get first editable block
const block = page.locator('[contenteditable="true"]').first();
await block.click();
await page.keyboard.type('Content');

// Get block by type
const h1Block = page.locator('.block-h1').first();
const codeBlock = page.locator('.block-code');
```

### Keyboard Input
```javascript
// Type text
await page.keyboard.type('Hello World');

// Special keys
await page.keyboard.press('Enter');
await page.keyboard.press('Backspace');
await page.keyboard.press('Control+A');

// Home/End navigation
await page.keyboard.press('Home');
await page.keyboard.press('End');
```

### Toolbar Interactions
```javascript
// Click toolbar button
await page.locator('.editor-toolbar-bold').click();
await page.locator('.editor-toolbar-header1').click();

// Wait for button to be visible
const boldButton = page.locator('.editor-toolbar-bold');
await expect(boldButton).toBeVisible();
```

### Markdown Triggers
```javascript
// Test markdown conversion with timing
await page.keyboard.type('# Heading');
await page.waitForTimeout(200); // Allow conversion processing

const h1Block = page.locator('.block-h1');
await expect(h1Block).toBeVisible();
```

### Editor API Access
```javascript
// Access editor instance via window object
const markdown = await page.evaluate(() => {
  return window.editor.getMarkdown();
});

const html = await page.evaluate(() => {
  return window.editor.getHtml();
});

expect(markdown).toContain('Expected content');
```

### Waiting for Changes
```javascript
// Wait for DOM updates
await page.waitForTimeout(200); // Short wait for conversions

// Wait for element state
await expect(block).toBeVisible();
await expect(block).toContainText('text');

// Wait for block count changes
const blocks = page.locator('.block');
await expect(blocks).toHaveCount(2);
// Or use dynamic count checks
const count = await blocks.count();
expect(count).toBeGreaterThanOrEqual(2);
```

## Test Categories

### 1. Basic Functionality (`editor.spec.js`)
- Editor loads successfully
- Toolbar is visible
- Block creation/deletion
- Text input and editing
- Focus management

### 2. Markdown Triggers (`blocks.spec.js`)
- `# ` → H1, `## ` → H2, etc.
- `- ` → Unordered list
- `1. ` → Ordered list
- ` ``` ` → Code block
- `> ` → Quote block
- `- [ ]` → Task list

### 3. Toolbar Actions (`toolbar.spec.js`)
- Bold/italic/underline formatting
- Block type conversions (H1-H6)
- List insertion
- Code block insertion
- Table/image insertion

### 4. Export Functions (`export.spec.js`)
- Markdown export (`getMarkdown()`)
- HTML export (`getHtml()`)
- Content accuracy
- Multi-block export

### 5. Paste Handling
- Plain text paste
- Markdown paste with conversion
- Multi-block paste
- HTML paste sanitization

## Running Tests

### Scripts
```powershell
# Run all tests
npm run test:e2e

# Interactive UI mode (recommended for development)
npm run test:e2e:ui

# Run with visible browser
npm run test:e2e:headed

# Debug specific test
npm run test:e2e:debug

# Run specific test file
npx playwright test e2e/editor.spec.js

# Run specific test by name
npx playwright test -g "should load the editor"
```

### Debugging Failed Tests

1. **Check screenshots**: `test-results/<test-name>/test-failed-1.png`
2. **View HTML report**: Auto-served at `http://localhost:9323` after test run
3. **Use debug mode**: `npm run test:e2e:debug`
4. **Check console logs**: Use `page.on('console', msg => console.log(msg.text()))`

## Best Practices

### DO:
- ✅ Use `test-page.html` for predictable test environment
- ✅ Always wait for `window.editorReady` before testing
- ✅ Use specific locators (`.block-h1`, `.editor-toolbar-bold`)
- ✅ Add `waitForTimeout()` after markdown triggers (200ms)
- ✅ Use `toBeGreaterThanOrEqual()` for dynamic block counts
- ✅ Group related tests in `describe` blocks
- ✅ Use descriptive test names: "should [expected behavior]"
- ✅ Test one behavior per test case

### DON'T:
- ❌ Use `index.html` (has pre-populated content)
- ❌ Use ID selectors that might have duplicates (`#editor`)
- ❌ Assume immediate DOM updates (markdown conversions need time)
- ❌ Hard-code block counts if initial content exists
- ❌ Skip `beforeEach` setup for navigation
- ❌ Test multiple unrelated behaviors in one test
- ❌ Use brittle selectors (prefer class-based)

## Debugging Tips

### Check Editor State
```javascript
// Log current blocks
const blockInfo = await page.evaluate(() => {
  const blocks = document.querySelectorAll('.block');
  return Array.from(blocks).map(b => ({
    type: b.dataset.blockType,
    content: b.textContent.substring(0, 50)
  }));
});
console.log('Current blocks:', blockInfo);
```

### Screenshot on Demand
```javascript
await page.screenshot({ 
  path: 'debug-screenshot.png',
  fullPage: true 
});
```

### Slow Down Tests
```javascript
// In playwright.config.js, add to 'use' section:
use: {
  launchOptions: {
    slowMo: 500 // Milliseconds between actions
  }
}
```

## Continuous Integration

For CI environments, the configuration automatically:
- Runs 1 worker instead of parallel
- Retries failed tests 2 times
- Disables `test.only` (via `forbidOnly`)
- Uses headless mode

## Test Artifacts

### Ignored (in .gitignore)
- `test-results/` — Test run artifacts and screenshots
- `playwright-report/` — HTML test reports

### Tracked (in git)
- `e2e/` — Test files
- `playwright.config.js` — Configuration
- `test-page.html` — Test fixture page

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Element not visible" | Add `await page.waitForTimeout(200)` after triggers |
| "Strict mode violation" (multiple elements) | Use `.first()` or more specific selector |
| `window.editor` is undefined | Wait for `window.editorReady` flag |
| Tests pass locally, fail in CI | Check timing assumptions, add explicit waits |
| Block count mismatch | Use `toBeGreaterThanOrEqual()` or clear test page |

## Selectors Reference

### Editor Elements
- `.editor-toolbar` — Main toolbar
- `.block` — Any block
- `.block-{type}` — Specific block type (h1, p, ul, code, etc.)
- `[contenteditable="true"]` — Editable elements
- `.task-list-item` — Task list items

### Toolbar Buttons
- `.editor-toolbar-bold`, `.editor-toolbar-italic`, `.editor-toolbar-underline`
- `.editor-toolbar-header1` through `.editor-toolbar-header6`
- `.editor-toolbar-ul`, `.editor-toolbar-ol`, `.editor-toolbar-sq`
- `.editor-toolbar-code`, `.editor-toolbar-table`, `.editor-toolbar-image`

## Coverage Goals

Aim to cover:
1. **Happy paths** — Standard user workflows
2. **Edge cases** — Empty editor, single character, very long content
3. **Error conditions** — Invalid input, malformed markdown
4. **Cross-browser** — Add Firefox/WebKit when needed
5. **Accessibility** — Keyboard navigation, ARIA attributes

## Integration with Jest Tests

Playwright E2E tests complement Jest unit tests:
- **Jest**: Block logic, markdown parsing, event system, utilities
- **Playwright**: User interactions, visual feedback, browser-specific behavior

Both test suites should pass before committing.
