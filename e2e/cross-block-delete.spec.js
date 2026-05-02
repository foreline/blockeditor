import { test, expect } from '@playwright/test';

/**
 * Cross-block deletion tests.
 *
 * These tests verify that deleting a selection that spans multiple blocks
 * correctly merges remaining content, preserves the block structure, and
 * leaves the cursor inside a valid block.
 */
test.describe('Cross-Block Deletion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-page.html');
    await page.waitForFunction(() => window.editorReady === true, {
      timeout: 5000,
    });
  });

  // ---------------------------------------------------------------------------
  // Helper: create N paragraph blocks with given text values
  // ---------------------------------------------------------------------------
  async function createBlocks(page, texts) {
    // Click the first editable element to focus the editor
    const editable = page.locator('[contenteditable="true"]').first();
    await editable.click();

    // Clear any existing content
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(200);

    for (let i = 0; i < texts.length; i++) {
      if (i > 0) {
        await page.keyboard.press('Enter');
        await page.waitForTimeout(100);
      }
      await page.keyboard.type(texts[i]);
    }
    await page.waitForTimeout(200);
  }

  // ---------------------------------------------------------------------------
  // 1. Select last two of three blocks entirely → Backspace
  // ---------------------------------------------------------------------------
  test.describe('Delete last two of three blocks', () => {
    test('should leave only the first block', async ({ page }) => {
      await createBlocks(page, ['Block one', 'Block two', 'Block three']);

      // Programmatically select blocks 2 and 3 entirely
      await page.evaluate(() => {
        const blocks = document.querySelectorAll('.bke-block');
        const sel = window.getSelection();
        const range = document.createRange();
        range.setStartBefore(blocks[1]);
        range.setEndAfter(blocks[2]);
        sel.removeAllRanges();
        sel.addRange(range);
      });

      await page.keyboard.press('Backspace');
      await page.waitForTimeout(300);

      const blocks = page.locator('.bke-block');
      await expect(blocks).toHaveCount(1);
      await expect(blocks.first()).toContainText('Block one');
    });

    test('cursor should be inside a block after deletion', async ({ page }) => {
      await createBlocks(page, ['Block one', 'Block two', 'Block three']);

      await page.evaluate(() => {
        const blocks = document.querySelectorAll('.bke-block');
        const sel = window.getSelection();
        const range = document.createRange();
        range.setStartBefore(blocks[1]);
        range.setEndAfter(blocks[2]);
        sel.removeAllRanges();
        sel.addRange(range);
      });

      await page.keyboard.press('Backspace');
      await page.waitForTimeout(300);

      const cursorInBlock = await page.evaluate(() => {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) return false;
        let node = sel.anchorNode;
        if (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement;
        return !!node?.closest('.bke-block');
      });
      expect(cursorInBlock).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Partial cross-block selection (mid-block to mid-block)
  // ---------------------------------------------------------------------------
  test.describe('Partial cross-block deletion preserves unselected content', () => {
    test('should keep content before and after the selection', async ({ page }) => {
      await createBlocks(page, ['AAABBB', 'CCCDDD', 'EEEFFFGGG']);

      // Select from offset 3 in block 1 ("BBB") through offset 3 in block 3 ("EEE")
      await page.evaluate(() => {
        const blocks = document.querySelectorAll('.bke-block');
        const first = blocks[0].firstChild;       // text node "AAABBB"
        const last  = blocks[2].firstChild;        // text node "EEEFFFGGG"
        const sel = window.getSelection();
        const range = document.createRange();
        range.setStart(first, 3);
        range.setEnd(last, 3);
        sel.removeAllRanges();
        sel.addRange(range);
      });

      await page.keyboard.press('Backspace');
      await page.waitForTimeout(300);

      // Should be exactly one block with merged content "AAAFFFGGG"
      const blocks = page.locator('.bke-block');
      await expect(blocks).toHaveCount(1);

      const text = await blocks.first().textContent();
      expect(text).toBe('AAAFFFGGG');
    });

    test('cursor should be at the merge point', async ({ page }) => {
      await createBlocks(page, ['AAABBB', 'CCCDDD', 'EEEFFFGGG']);

      await page.evaluate(() => {
        const blocks = document.querySelectorAll('.bke-block');
        const first = blocks[0].firstChild;
        const last  = blocks[2].firstChild;
        const sel = window.getSelection();
        const range = document.createRange();
        range.setStart(first, 3);
        range.setEnd(last, 3);
        sel.removeAllRanges();
        sel.addRange(range);
      });

      await page.keyboard.press('Backspace');
      await page.waitForTimeout(300);

      const cursorInBlock = await page.evaluate(() => {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) return false;
        let node = sel.anchorNode;
        if (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement;
        return !!node?.closest('.bke-block');
      });
      expect(cursorInBlock).toBe(true);
    });

    test('typing after partial cross-block delete should insert at merge point', async ({ page }) => {
      await createBlocks(page, ['AAABBB', 'CCCDDD', 'EEEFFFGGG']);

      await page.evaluate(() => {
        const blocks = document.querySelectorAll('.bke-block');
        const first = blocks[0].firstChild;
        const last  = blocks[2].firstChild;
        const sel = window.getSelection();
        const range = document.createRange();
        range.setStart(first, 3);
        range.setEnd(last, 3);
        sel.removeAllRanges();
        sel.addRange(range);
      });

      await page.keyboard.press('Backspace');
      await page.waitForTimeout(300);

      // Type at the cursor position (the merge point)
      await page.keyboard.type('XYZ');
      await page.waitForTimeout(200);

      const text = await page.locator('.bke-block').first().textContent();
      expect(text).toBe('AAAXYZFFFGGG');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Select from start of block 2 to end of block 3 (first block untouched)
  // ---------------------------------------------------------------------------
  test('deleting blocks 2–3 entirely via range should leave block 1 with cursor inside', async ({ page }) => {
    await createBlocks(page, ['First', 'Second', 'Third']);

    await page.evaluate(() => {
      const blocks = document.querySelectorAll('.bke-block');
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(blocks[1]);
      range.setEnd(blocks[2], blocks[2].childNodes.length);
      sel.removeAllRanges();
      sel.addRange(range);
    });

    await page.keyboard.press('Backspace');
    await page.waitForTimeout(300);

    const blocks = page.locator('.bke-block');
    const count = await blocks.count();
    // First block survives; second may be empty or removed — at most 2
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThanOrEqual(2);
    await expect(blocks.first()).toContainText('First');

    const cursorInBlock = await page.evaluate(() => {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return false;
      let node = sel.anchorNode;
      if (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      return !!node?.closest('.bke-block');
    });
    expect(cursorInBlock).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 4. Select all blocks entirely (Ctrl+A equivalent via range)
  // ---------------------------------------------------------------------------
  test('deleting all blocks via programmatic range should create a default block', async ({ page }) => {
    await createBlocks(page, ['One', 'Two', 'Three']);

    await page.evaluate(() => {
      const editor = document.querySelector('[contenteditable="true"]');
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editor);
      sel.removeAllRanges();
      sel.addRange(range);
    });

    await page.keyboard.press('Backspace');
    await page.waitForTimeout(300);

    const blocks = page.locator('.bke-block');
    await expect(blocks).toHaveCount(1);

    const text = await blocks.first().textContent();
    expect(text.trim()).toBe('');
  });

  // ---------------------------------------------------------------------------
  // 5. Two blocks only — select across both partially
  // ---------------------------------------------------------------------------
  test('partial deletion across two blocks merges correctly', async ({ page }) => {
    await createBlocks(page, ['HelloWorld', 'FooBar']);

    await page.evaluate(() => {
      const blocks = document.querySelectorAll('.bke-block');
      const first = blocks[0].firstChild; // "HelloWorld"
      const last  = blocks[1].firstChild; // "FooBar"
      const sel = window.getSelection();
      const range = document.createRange();
      range.setStart(first, 5);  // after "Hello"
      range.setEnd(last, 3);     // after "Foo"
      sel.removeAllRanges();
      sel.addRange(range);
    });

    await page.keyboard.press('Backspace');
    await page.waitForTimeout(300);

    const blocks = page.locator('.bke-block');
    await expect(blocks).toHaveCount(1);

    const text = await blocks.first().textContent();
    expect(text).toBe('HelloBar');
  });

  // ---------------------------------------------------------------------------
  // 6. No content outside .block elements after cross-block delete
  // ---------------------------------------------------------------------------
  test('no stray text nodes outside .block elements after cross-block deletion', async ({ page }) => {
    await createBlocks(page, ['Alpha', 'Beta', 'Gamma']);

    await page.evaluate(() => {
      const blocks = document.querySelectorAll('.bke-block');
      const sel = window.getSelection();
      const range = document.createRange();
      range.setStartBefore(blocks[1]);
      range.setEndAfter(blocks[2]);
      sel.removeAllRanges();
      sel.addRange(range);
    });

    await page.keyboard.press('Backspace');
    await page.waitForTimeout(300);

    const strayText = await page.evaluate(() => {
      const editor = document.querySelector('[contenteditable="true"]');
      let stray = '';
      for (const child of editor.childNodes) {
        if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
          stray += child.textContent;
        }
      }
      return stray;
    });
    expect(strayText).toBe('');
  });

  // ---------------------------------------------------------------------------
  // 7. Editor remains functional after cross-block deletion
  // ---------------------------------------------------------------------------
  test('editor should remain functional after cross-block deletion', async ({ page }) => {
    await createBlocks(page, ['One', 'Two', 'Three']);

    // Delete blocks 2 and 3
    await page.evaluate(() => {
      const blocks = document.querySelectorAll('.bke-block');
      const sel = window.getSelection();
      const range = document.createRange();
      range.setStartBefore(blocks[1]);
      range.setEndAfter(blocks[2]);
      sel.removeAllRanges();
      sel.addRange(range);
    });

    await page.keyboard.press('Backspace');
    await page.waitForTimeout(300);

    // Now type text — it should appear inside a block
    await page.keyboard.type('NewText');
    await page.waitForTimeout(200);

    const blocks = page.locator('.bke-block');
    const count = await blocks.count();
    expect(count).toBeGreaterThanOrEqual(1);

    const hasNewText = await page.evaluate(() => {
      const blocks = document.querySelectorAll('.bke-block');
      return Array.from(blocks).some(b => b.textContent.includes('NewText'));
    });
    expect(hasNewText).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 8. Enter should work after cross-block deletion
  // ---------------------------------------------------------------------------
  test('pressing Enter after cross-block deletion should create a new block', async ({ page }) => {
    await createBlocks(page, ['One', 'Two', 'Three']);

    await page.evaluate(() => {
      const blocks = document.querySelectorAll('.bke-block');
      const sel = window.getSelection();
      const range = document.createRange();
      range.setStartBefore(blocks[1]);
      range.setEndAfter(blocks[2]);
      sel.removeAllRanges();
      sel.addRange(range);
    });

    await page.keyboard.press('Backspace');
    await page.waitForTimeout(300);

    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    const blocks = page.locator('.bke-block');
    const count = await blocks.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });
});
