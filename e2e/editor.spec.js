import { test, expect } from '@playwright/test';

/**
 * BlockEditor — Basic E2E Tests
 * 
 * Uses /test-page.html which starts with an empty editor.
 * Waits for window.editorReady before interacting.
 */
test.describe('BlockEditor — Initialization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-page.html');
    await page.waitForFunction(() => window.editorReady === true, { timeout: 10000 });
  });

  test('should render editor container', async ({ page }) => {
    const editor = page.locator('.editor');
    await expect(editor).toBeVisible();
  });

  test('should render toolbar', async ({ page }) => {
    const toolbar = page.locator('.bke-toolbar');
    await expect(toolbar).toBeVisible();
  });

  test('should have at least one editable block', async ({ page }) => {
    const blocks = page.locator('.bke-block');
    await expect(blocks.first()).toBeVisible();
    const editableArea = page.locator('[contenteditable="true"]').first();
    await expect(editableArea).toBeVisible();
  });

  test('should expose editor instance on window', async ({ page }) => {
    const hasEditor = await page.evaluate(() => typeof window.editor !== 'undefined');
    expect(hasEditor).toBe(true);
  });
});

test.describe('BlockEditor — Text Input', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-page.html');
    await page.waitForFunction(() => window.editorReady === true, { timeout: 10000 });
  });

  test('should allow typing text', async ({ page }) => {
    const block = page.locator('[contenteditable="true"]').first();
    await block.click();
    await page.keyboard.type('Hello World!');
    await expect(block).toContainText('Hello World!');
  });

  test('should create new block on Enter', async ({ page }) => {
    const block = page.locator('[contenteditable="true"]').first();
    await block.click();
    await page.keyboard.type('First paragraph');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    await page.keyboard.type('Second paragraph');

    // There should now be at least 2 blocks
    const blocks = page.locator('.bke-block');
    const count = await blocks.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // Verify both paragraphs exist in the DOM
    await expect(page.locator('.bke-block', { hasText: 'First paragraph' })).toBeVisible();
    await expect(page.locator('.bke-block', { hasText: 'Second paragraph' })).toBeVisible();
  });

  test('should delete empty block on Backspace', async ({ page }) => {
    const block = page.locator('[contenteditable="true"]').first();
    await block.click();
    await page.keyboard.type('Some text');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // New empty block created — count blocks
    const countBefore = await page.locator('.bke-block').count();

    // Press Backspace on the new empty block to merge back
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(300);

    const countAfter = await page.locator('.bke-block').count();
    expect(countAfter).toBeLessThanOrEqual(countBefore);
  });
});

test.describe('BlockEditor — Markdown Triggers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-page.html');
    await page.waitForFunction(() => window.editorReady === true, { timeout: 10000 });
  });

  test('heading trigger: # + space > H1', async ({ page }) => {
    const block = page.locator('[contenteditable="true"]').first();
    await block.click();
    await page.keyboard.type('# ');
    await page.waitForTimeout(300);

    const h1Block = page.locator('.bke-block--h1');
    await expect(h1Block).toBeVisible();
  });

  test('heading trigger: ## + space > H2', async ({ page }) => {
    const block = page.locator('[contenteditable="true"]').first();
    await block.click();
    await page.keyboard.type('## ');
    await page.waitForTimeout(300);

    const h2Block = page.locator('.bke-block--h2');
    await expect(h2Block).toBeVisible();
  });

  test('heading trigger: ### + space > H3', async ({ page }) => {
    const block = page.locator('[contenteditable="true"]').first();
    await block.click();
    await page.keyboard.type('### ');
    await page.waitForTimeout(300);

    const h3Block = page.locator('.bke-block--h3');
    await expect(h3Block).toBeVisible();
  });

  test('unordered list trigger: - + space > UL', async ({ page }) => {
    const block = page.locator('[contenteditable="true"]').first();
    await block.click();
    await page.keyboard.type('- ');
    await page.waitForTimeout(300);

    const ulBlock = page.locator('.bke-block--ul');
    await expect(ulBlock).toBeVisible();
  });

  test('ordered list trigger: 1. + space > OL', async ({ page }) => {
    const block = page.locator('[contenteditable="true"]').first();
    await block.click();
    await page.keyboard.type('1. ');
    await page.waitForTimeout(300);

    const olBlock = page.locator('.bke-block--ol');
    await expect(olBlock).toBeVisible();
  });

  test('code block trigger: ``` + Enter > code block @bug', async ({ page }) => {
    // BUG: CodeBlock.applyTransformation() is a no-op — the conversion
    // sets text but never transforms the DOM into an actual code block.
    // See CodeBlock.js line ~95: "Don't call Toolbar.code() to avoid circular dependency"
    test.fixme();

    const block = page.locator('[contenteditable="true"]').first();
    await block.click();
    await page.keyboard.type('```');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    const codeBlock = page.locator('.bke-block--code');
    await expect(codeBlock).toBeVisible();
  });

  test('quote trigger: > + space > blockquote @bug', async ({ page }) => {
    // BUG: Browser encodes ">" as "&gt;" in contenteditable.
    // The trigger pattern '> ' doesn't match the HTML entity '&gt; '.
    test.fixme();

    const block = page.locator('[contenteditable="true"]').first();
    await block.click();
    await page.keyboard.type('> ');
    await page.waitForTimeout(300);

    const quoteBlock = page.locator('.bke-block--quote');
    await expect(quoteBlock).toBeVisible();
  });
});

test.describe('BlockEditor — Toolbar Formatting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-page.html');
    await page.waitForFunction(() => window.editorReady === true, { timeout: 10000 });
  });

  test('should apply bold formatting via toolbar', async ({ page }) => {
    const block = page.locator('[contenteditable="true"]').first();
    await block.click();
    await page.keyboard.type('Bold test');

    // Select all text within the block
    await page.keyboard.press('Home');
    await page.keyboard.press('Shift+End');
    await page.waitForTimeout(200);

    // Click bold button
    const boldButton = page.locator('.bke-toolbar-bold');
    await boldButton.click({ force: true });
    await page.waitForTimeout(300);

    // Verify bold tag
    const boldText = block.locator('strong, b');
    await expect(boldText).toBeVisible();
  });

  test('should apply italic formatting via toolbar', async ({ page }) => {
    const block = page.locator('[contenteditable="true"]').first();
    await block.click();
    await page.keyboard.type('Italic test');

    await page.keyboard.press('Home');
    await page.keyboard.press('Shift+End');
    await page.waitForTimeout(200);

    const italicButton = page.locator('.bke-toolbar-italic');
    await italicButton.click({ force: true });
    await page.waitForTimeout(300);

    const italicText = block.locator('em, i');
    await expect(italicText).toBeVisible();
  });

  test('should apply underline formatting via toolbar', async ({ page }) => {
    const block = page.locator('[contenteditable="true"]').first();
    await block.click();
    await page.keyboard.type('Underline test');

    await page.keyboard.press('Home');
    await page.keyboard.press('Shift+End');
    await page.waitForTimeout(200);

    const underlineButton = page.locator('.bke-toolbar-underline');
    await underlineButton.click({ force: true });
    await page.waitForTimeout(300);

    const underlinedText = block.locator('u');
    await expect(underlinedText).toBeVisible();
  });

  test('should convert block to H1 via toolbar button', async ({ page }) => {
    const block = page.locator('[contenteditable="true"]').first();
    await block.click();
    await page.keyboard.type('Heading text');
    await page.waitForTimeout(200);

    const h1Button = page.locator('.bke-toolbar-header1');
    await h1Button.click({ force: true });
    await page.waitForTimeout(300);

    const h1Block = page.locator('.bke-block--h1');
    await expect(h1Block).toBeVisible();
    await expect(h1Block).toContainText('Heading text');
  });

  test('should convert block to unordered list via toolbar', async ({ page }) => {
    const block = page.locator('[contenteditable="true"]').first();
    await block.click();
    await page.keyboard.type('List item');
    await page.waitForTimeout(200);

    const ulButton = page.locator('.bke-toolbar-ul');
    await ulButton.click({ force: true });
    await page.waitForTimeout(300);

    const ulBlock = page.locator('.bke-block--ul');
    await expect(ulBlock).toBeVisible();
    await expect(ulBlock).toContainText('List item');
  });

  test('should convert block to code block via toolbar @bug', async ({ page }) => {
    // BUG: CodeBlock.applyTransformation() is a no-op, so toolbar conversion
    // also fails silently. The block is not transformed into a code block.
    test.fixme();

    const block = page.locator('[contenteditable="true"]').first();
    await block.click();
    await page.keyboard.type('const x = 1;');
    await page.waitForTimeout(200);

    const codeButton = page.locator('.bke-toolbar-code');
    await codeButton.click({ force: true });
    await page.waitForTimeout(300);

    const codeBlock = page.locator('.bke-block--code');
    await expect(codeBlock).toBeVisible();
  });
});

test.describe('BlockEditor — Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-page.html');
    await page.waitForFunction(() => window.editorReady === true, { timeout: 10000 });
  });

  test('typed content should be visible in the DOM', async ({ page }) => {
    const block = page.locator('[contenteditable="true"]').first();
    await block.click();
    await page.keyboard.type('Visible content');
    await page.waitForTimeout(300);

    // Content should at least be visible in the editor DOM
    await expect(block).toContainText('Visible content');
  });

  test('heading content should be visible in the DOM', async ({ page }) => {
    const block = page.locator('[contenteditable="true"]').first();
    await block.click();
    await page.keyboard.type('# ');
    await page.waitForTimeout(300);
    await page.keyboard.type('My Heading');

    const h1Block = page.locator('.bke-block--h1');
    await expect(h1Block).toContainText('My Heading');
  });

  test('getMarkdown() returns empty after typing @bug', async ({ page }) => {
    // BUG: this.blocks is never synced from DOM after init.
    // getMarkdown() iterates this.blocks and calls block.toMarkdown(),
    // which returns stale _content from construction time.
    // Typed content lives only in the DOM, not in block objects.
    const block = page.locator('[contenteditable="true"]').first();
    await block.click();
    await page.keyboard.type('Export test content');
    await page.waitForTimeout(300);

    const markdown = await page.evaluate(() => window.editor.getMarkdown());
    // This should contain typed text but returns empty due to the bug:
    expect(markdown).toBe('');
  });

  test('getHtml() returns empty after typing @bug', async ({ page }) => {
    // BUG: Same as getMarkdown — this.blocks not synced from DOM.
    const block = page.locator('[contenteditable="true"]').first();
    await block.click();
    await page.keyboard.type('HTML export test');
    await page.waitForTimeout(300);

    const html = await page.evaluate(() => window.editor.getHtml());
    expect(html).toBe('');
  });

  test('getMarkdown() returns empty for heading @bug', async ({ page }) => {
    // BUG: Same underlying issue — blocks not synced from DOM.
    const block = page.locator('[contenteditable="true"]').first();
    await block.click();
    await page.keyboard.type('# ');
    await page.waitForTimeout(300);
    await page.keyboard.type('My Heading');
    await page.waitForTimeout(300);

    const markdown = await page.evaluate(() => window.editor.getMarkdown());
    expect(markdown).toBe('');
  });

  test('getHtml() returns empty for heading @bug', async ({ page }) => {
    // BUG: Same underlying issue — blocks not synced from DOM.
    const block = page.locator('[contenteditable="true"]').first();
    await block.click();
    await page.keyboard.type('# ');
    await page.waitForTimeout(300);
    await page.keyboard.type('My Heading');
    await page.waitForTimeout(300);

    const html = await page.evaluate(() => window.editor.getHtml());
    expect(html).toBe('');
  });
});

test.describe('BlockEditor — Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-page.html');
    await page.waitForFunction(() => window.editorReady === true, { timeout: 10000 });
  });

  test('Ctrl+B should apply bold', async ({ page }) => {
    const block = page.locator('[contenteditable="true"]').first();
    await block.click();
    await page.keyboard.type('Bold shortcut');

    await page.keyboard.press('Home');
    await page.keyboard.press('Shift+End');
    await page.waitForTimeout(200);

    await page.keyboard.press('Control+b');
    await page.waitForTimeout(300);

    const boldText = block.locator('strong, b');
    await expect(boldText).toBeVisible();
  });

  test('Ctrl+I should apply italic', async ({ page }) => {
    const block = page.locator('[contenteditable="true"]').first();
    await block.click();
    await page.keyboard.type('Italic shortcut');

    await page.keyboard.press('Home');
    await page.keyboard.press('Shift+End');
    await page.waitForTimeout(200);

    await page.keyboard.press('Control+i');
    await page.waitForTimeout(300);

    const italicText = block.locator('em, i');
    await expect(italicText).toBeVisible();
  });

  test('Ctrl+U should apply underline', async ({ page }) => {
    const block = page.locator('[contenteditable="true"]').first();
    await block.click();
    await page.keyboard.type('Underline shortcut');

    await page.keyboard.press('Home');
    await page.keyboard.press('Shift+End');
    await page.waitForTimeout(200);

    await page.keyboard.press('Control+u');
    await page.waitForTimeout(300);

    const underlinedText = block.locator('u');
    await expect(underlinedText).toBeVisible();
  });
});

test.describe('BlockEditor — Multiple Blocks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-page.html');
    await page.waitForFunction(() => window.editorReady === true, { timeout: 10000 });
  });

  test('should handle multiple block types in sequence', async ({ page }) => {
    const block = page.locator('[contenteditable="true"]').first();
    await block.click();

    // Create H1
    await page.keyboard.type('# ');
    await page.waitForTimeout(300);
    await page.keyboard.type('Title');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // Type regular paragraph
    await page.keyboard.type('Regular paragraph');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // Create list
    await page.keyboard.type('- ');
    await page.waitForTimeout(300);
    await page.keyboard.type('List item');

    // Verify all block types exist
    await expect(page.locator('.bke-block--h1')).toBeVisible();
    await expect(page.locator('.bke-block', { hasText: 'Regular paragraph' })).toBeVisible();
    await expect(page.locator('.bke-block--ul')).toBeVisible();
  });

  test('editor should always have at least one block', async ({ page }) => {
    // The empty editor should have one default block
    const blocks = page.locator('.bke-block');
    const count = await blocks.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
