import { test, expect } from '@playwright/test';

/**
 * BlockEditor — Select All + Delete (Ctrl+A > Backspace) Bug Tests
 *
 * Reproduces the "one_block_issue": after Ctrl+A > Backspace, pressing Enter
 * multiple times does not create new blocks. The editor stays stuck with one
 * block and raw <br> elements are inserted outside the block structure.
 *
 * @see docs/issues/one_block_issue/BUG_REPORT.md
 */

/** Helper: set up multi-block content in the editor */
async function createMultiBlockContent(page) {
  const block = page.locator('[contenteditable="true"]').first();
  await block.click();

  await page.keyboard.type('First paragraph');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);

  await page.keyboard.type('Second paragraph');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);

  await page.keyboard.type('Third paragraph');
  await page.waitForTimeout(300);

  // Verify 3 blocks exist before proceeding
  const blocks = page.locator('.bke-block');
  await expect(blocks).toHaveCount(3);
}

/** Helper: select all content and delete it */
async function selectAllAndDelete(page) {
  await page.keyboard.press('Control+a');
  await page.waitForTimeout(200);
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(500); // Allow time for ensureDefaultBlock recovery
}

test.describe('Select All + Delete — Block Recovery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-page.html');
    await page.waitForFunction(() => window.editorReady === true, { timeout: 10000 });
  });

  test('should have exactly one block after Ctrl+A > Backspace on multi-block content', async ({ page }) => {
    await createMultiBlockContent(page);

    await selectAllAndDelete(page);

    // Editor should recover to exactly one default block
    const blocks = page.locator('.bke-block');
    await expect(blocks).toHaveCount(1);
  });

  test('should have a paragraph block after Ctrl+A > Backspace', async ({ page }) => {
    await createMultiBlockContent(page);

    await selectAllAndDelete(page);

    // The recovered block should be a paragraph
    const pBlock = page.locator('.bke-block--p');
    await expect(pBlock).toBeVisible();
  });

  test('should have an empty block after Ctrl+A > Backspace', async ({ page }) => {
    await createMultiBlockContent(page);

    await selectAllAndDelete(page);

    // The recovered block should be empty
    const block = page.locator('.bke-block').first();
    const textContent = await block.textContent();
    expect(textContent.trim()).toBe('');
  });

  test('should not have any content outside .block elements after Ctrl+A > Backspace', async ({ page }) => {
    await createMultiBlockContent(page);

    await selectAllAndDelete(page);

    // Check that no stray <br> or text nodes exist outside .block in the container
    const strayContent = await page.evaluate(() => {
      const container = document.querySelector('.bke-editor');
      if (!container) return { brCount: 0, textNodes: 0 };

      let brCount = 0;
      let textNodes = 0;
      for (const child of container.childNodes) {
        if (child.nodeType === Node.ELEMENT_NODE && !child.classList.contains('bke-block')) {
          if (child.tagName === 'BR') brCount++;
        }
        if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
          textNodes++;
        }
      }
      return { brCount, textNodes };
    });

    expect(strayContent.brCount).toBe(0);
    expect(strayContent.textNodes).toBe(0);
  });
});

test.describe('Select All + Delete — Enter Creates New Blocks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-page.html');
    await page.waitForFunction(() => window.editorReady === true, { timeout: 10000 });
  });

  test('pressing Enter once after Ctrl+A > Backspace should create a second block', async ({ page }) => {
    await createMultiBlockContent(page);
    await selectAllAndDelete(page);

    // Press Enter to create a new block
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    const blocks = page.locator('.bke-block');
    const count = await blocks.count();
    expect(count).toBe(2);
  });

  test('pressing Enter 3 times after Ctrl+A > Backspace should create 4 blocks', async ({ page }) => {
    await createMultiBlockContent(page);
    await selectAllAndDelete(page);

    // Press Enter 3 times
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
    }

    const blocks = page.locator('.bke-block');
    const count = await blocks.count();
    expect(count).toBe(4);
  });

  test('typing text after Ctrl+A > Backspace + Enter should appear in new block', async ({ page }) => {
    await createMultiBlockContent(page);
    await selectAllAndDelete(page);

    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    await page.keyboard.type('New content after deletion');
    await page.waitForTimeout(300);

    await expect(page.locator('.bke-block', { hasText: 'New content after deletion' })).toBeVisible();
  });

  test('all blocks created after Ctrl+A > Backspace + Enter should be proper .block elements', async ({ page }) => {
    await createMultiBlockContent(page);
    await selectAllAndDelete(page);

    // Press Enter 3 times
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
    }

    // Every block should have proper data-block-type attribute
    const blockTypes = await page.evaluate(() => {
      const blocks = document.querySelectorAll('.bke-block');
      return Array.from(blocks).map(b => b.dataset.blockType || 'missing');
    });

    for (const type of blockTypes) {
      expect(type).not.toBe('missing');
    }

    // No content should exist outside .block elements
    const strayElements = await page.evaluate(() => {
      const container = document.querySelector('.bke-editor');
      let strayCount = 0;
      for (const child of container.childNodes) {
        if (child.nodeType === Node.ELEMENT_NODE && !child.classList.contains('bke-block')) {
          strayCount++;
        }
        if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
          strayCount++;
        }
      }
      return strayCount;
    });

    expect(strayElements).toBe(0);
  });
});

test.describe('Select All + Delete — Single Block Scenario', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-page.html');
    await page.waitForFunction(() => window.editorReady === true, { timeout: 10000 });
  });

  test('Ctrl+A > Backspace on a single block with text should leave one empty block', async ({ page }) => {
    const block = page.locator('[contenteditable="true"]').first();
    await block.click();
    await page.keyboard.type('Some content to delete');
    await page.waitForTimeout(200);

    await selectAllAndDelete(page);

    const blocks = page.locator('.bke-block');
    await expect(blocks).toHaveCount(1);
  });

  test('Enter after Ctrl+A > Backspace on single block should create a new block', async ({ page }) => {
    const block = page.locator('[contenteditable="true"]').first();
    await block.click();
    await page.keyboard.type('Content');
    await page.waitForTimeout(200);

    await selectAllAndDelete(page);

    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    const blocks = page.locator('.bke-block');
    const count = await blocks.count();
    expect(count).toBe(2);
  });
});

test.describe('Select All + Delete — Mixed Block Types', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-page.html');
    await page.waitForFunction(() => window.editorReady === true, { timeout: 10000 });
  });

  test('Ctrl+A > Backspace on heading + paragraph — heading contenteditable nesting @known-issue', async ({ page }) => {
    // KNOWN ISSUE: Heading blocks use contenteditable="false" on the wrapper
    // with contenteditable="true" on the inner <h1>. This causes Ctrl+A to
    // only select the heading text, NOT the entire editor content.
    // As a result, Backspace only clears the heading text — the paragraph
    // block survives untouched. This is a separate issue from the main
    // select-all-delete bug (which is fixed for standard blocks).
    const block = page.locator('[contenteditable="true"]').first();
    await block.click();

    // Create H1
    await page.keyboard.type('# ');
    await page.waitForTimeout(300);
    await page.keyboard.type('My Heading');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // Type paragraph
    await page.keyboard.type('A paragraph');
    await page.waitForTimeout(300);

    // Verify mixed content exists
    await expect(page.locator('.bke-block--h1')).toBeVisible();
    const totalBlocks = await page.locator('.bke-block').count();
    expect(totalBlocks).toBeGreaterThanOrEqual(2);

    // Select all and delete — Ctrl+A only selects heading text due to
    // contenteditable nesting, so only heading text is deleted
    await selectAllAndDelete(page);

    // Due to the heading contenteditable nesting, we get 2 blocks:
    // an empty heading + the untouched paragraph
    const blocks = page.locator('.bke-block');
    const count = await blocks.count();
    expect(count).toBe(2); // Ideally should be 1 when heading CE nesting is fixed
  });

  test('Enter after Ctrl+A > Backspace on mixed content — heading contenteditable nesting @known-issue', async ({ page }) => {
    // KNOWN ISSUE: Same heading contenteditable nesting as above.
    // Ctrl+A doesn't truly select all, so we get an extra block.
    const block = page.locator('[contenteditable="true"]').first();
    await block.click();

    // Create heading + paragraph
    await page.keyboard.type('# ');
    await page.waitForTimeout(300);
    await page.keyboard.type('Heading');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    await page.keyboard.type('Paragraph text');
    await page.waitForTimeout(300);

    // Select all and delete (only heading text actually selected)
    await selectAllAndDelete(page);

    // Press Enter twice
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    const blocks = page.locator('.bke-block');
    const count = await blocks.count();
    // 4 blocks: empty heading + paragraph + 2 from Enter presses
    // Ideally 3 when heading CE nesting is fixed
    expect(count).toBe(4);
  });
});

test.describe('Select All + Delete — Rapid Enter Presses', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-page.html');
    await page.waitForFunction(() => window.editorReady === true, { timeout: 10000 });
  });

  test('rapid Enter presses immediately after Ctrl+A > Backspace should each create a block', async ({ page }) => {
    // This test specifically reproduces the timing race condition
    await createMultiBlockContent(page);

    // Select all and delete, then immediately mash Enter
    await page.keyboard.press('Control+a');
    await page.waitForTimeout(100);
    await page.keyboard.press('Backspace');
    // Deliberately short wait — reproducing quick user input
    await page.waitForTimeout(200);

    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    const blocks = page.locator('.bke-block');
    const count = await blocks.count();
    // Should have 4 blocks: 1 recovered + 3 from Enter presses
    expect(count).toBe(4);
  });

  test('cursor should be in the last created block after rapid Enter presses', async ({ page }) => {
    await createMultiBlockContent(page);
    await selectAllAndDelete(page);

    // Press Enter twice
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // Type text — it should appear in the last block
    await page.keyboard.type('I am here');
    await page.waitForTimeout(300);

    const blocks = page.locator('.bke-block');
    const lastBlock = blocks.last();
    await expect(lastBlock).toContainText('I am here');
  });
});

test.describe('Select All + Delete — Editor State Integrity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-page.html');
    await page.waitForFunction(() => window.editorReady === true, { timeout: 10000 });
  });

  test('editor.currentBlock should point to a valid block after Ctrl+A > Backspace', async ({ page }) => {
    await createMultiBlockContent(page);
    await selectAllAndDelete(page);

    const currentBlockValid = await page.evaluate(() => {
      const editor = window.editor;
      if (!editor.currentBlock) return false;
      // Check the block is actually in the DOM
      return document.body.contains(editor.currentBlock);
    });

    expect(currentBlockValid).toBe(true);
  });

  test('editor container should have no detached block references after Ctrl+A > Backspace', async ({ page }) => {
    await createMultiBlockContent(page);
    await selectAllAndDelete(page);

    // The editor's blocks container should only contain .block elements
    const containerState = await page.evaluate(() => {
      const container = document.querySelector('.bke-editor');
      const children = Array.from(container.children);
      const allAreBlocks = children.every(
        el => el.classList.contains('bke-block') || el.classList.contains('bke-toolbar')
      );
      return {
        childCount: children.length,
        allAreBlocks,
        blockCount: container.querySelectorAll('.bke-block').length
      };
    });

    expect(containerState.allAreBlocks).toBe(true);
    expect(containerState.blockCount).toBeGreaterThanOrEqual(1);
  });

  test('editor should remain functional after multiple Ctrl+A > Backspace cycles', async ({ page }) => {
    // First cycle: create content, delete all, verify recovery
    const block = page.locator('[contenteditable="true"]').first();
    await block.click();
    await page.keyboard.type('Cycle 1');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    await page.keyboard.type('More content');
    await page.waitForTimeout(300);

    await selectAllAndDelete(page);
    await page.waitForTimeout(300);

    // Second cycle: type again, delete again
    const block2 = page.locator('[contenteditable="true"]').first();
    await block2.click();
    await page.keyboard.type('Cycle 2 content');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    await page.keyboard.type('More content again');
    await page.waitForTimeout(300);

    await selectAllAndDelete(page);
    await page.waitForTimeout(300);

    // After second cycle, Enter should still work
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    await page.keyboard.type('Still works');
    await page.waitForTimeout(300);

    const blocks = page.locator('.bke-block');
    const count = await blocks.count();
    expect(count).toBe(2);
    await expect(page.locator('.bke-block', { hasText: 'Still works' })).toBeVisible();
  });
});
