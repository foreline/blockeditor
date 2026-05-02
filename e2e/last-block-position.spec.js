import { test, expect } from '@playwright/test';

/**
 * BlockEditor — Last Block Detection Issue
 *
 * Reproduces: after Ctrl+A > Backspace, creating a heading via markdown
 * trigger (# ), pressing Enter, typing text, and pressing Enter again
 * causes the new block to appear in the WRONG position (between Block 1
 * and Block 2 instead of after Block 2).
 *
 * @see docs/issues/last_block/00. LAST_BLOCK_DETECTION_ISSUE.md
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

  const blocks = page.locator('.bke-block');
  await expect(blocks).toHaveCount(3);
}

/** Helper: select all content and delete it */
async function selectAllAndDelete(page) {
  await page.keyboard.press('Control+a');
  await page.waitForTimeout(200);
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(500);
}

test.describe('Last Block Detection — Heading then Enter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-page.html');
    await page.waitForFunction(() => window.editorReady === true, { timeout: 10000 });
  });

  test('Block 3 should appear AFTER Block 2 (not between Block 1 and Block 2)', async ({ page }) => {
    // Step 1: Create multi-block content
    await createMultiBlockContent(page);

    // Step 2: Select all and delete
    await selectAllAndDelete(page);

    // Verify editor recovered to 1 block
    await expect(page.locator('.bke-block')).toHaveCount(1);

    // Step 3: Type "# " to create heading block (Block 1)
    await page.keyboard.type('# ', { delay: 50 });
    await page.waitForTimeout(400);

    // Verify heading block was created
    await expect(page.locator('.bke-block--h1')).toHaveCount(1);

    // Step 4: Press Enter to create a new block (Block 2 - paragraph)
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);

    const blocksAfterEnter = page.locator('.bke-block');
    await expect(blocksAfterEnter).toHaveCount(2);

    // Step 5: Type some text in Block 2
    await page.keyboard.type('Some text in block 2', { delay: 30 });
    await page.waitForTimeout(300);

    // Step 6: Press Enter to create Block 3
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);

    // Should have 3 blocks
    const allBlocks = page.locator('.bke-block');
    await expect(allBlocks).toHaveCount(3);

    // Verify block ORDER:
    // Block 1 = h1, Block 2 = p with text, Block 3 = empty p
    const blockInfo = await page.evaluate(() => {
      const blocks = document.querySelectorAll('.bke-block');
      return Array.from(blocks).map((b, i) => ({
        index: i,
        type: b.getAttribute('data-block-type'),
        text: b.textContent.trim(),
        className: b.className
      }));
    });

    console.log('Block order after test:', JSON.stringify(blockInfo, null, 2));

    // Block 1 should be h1
    expect(blockInfo[0].type).toBe('h1');

    // Block 2 should be paragraph WITH text
    expect(blockInfo[1].type).toMatch(/^p(aragraph)?$/);
    expect(blockInfo[1].text).toBe('Some text in block 2');

    // Block 3 should be empty paragraph AFTER Block 2
    expect(blockInfo[2].type).toMatch(/^p(aragraph)?$/);
    expect(blockInfo[2].text).toBe('');
  });

  test('Block order with H2 trigger should also be correct', async ({ page }) => {
    await createMultiBlockContent(page);
    await selectAllAndDelete(page);
    await expect(page.locator('.bke-block')).toHaveCount(1);

    // Type "## " to create h2 block
    await page.keyboard.type('## ', { delay: 50 });
    await page.waitForTimeout(400);
    await expect(page.locator('.bke-block--h2')).toHaveCount(1);

    // Press Enter to create Block 2
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);

    // Type text
    await page.keyboard.type('Text after heading', { delay: 30 });
    await page.waitForTimeout(300);

    // Press Enter to create Block 3
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);

    const blockInfo = await page.evaluate(() => {
      const blocks = document.querySelectorAll('.bke-block');
      return Array.from(blocks).map((b, i) => ({
        index: i,
        type: b.getAttribute('data-block-type'),
        text: b.textContent.trim()
      }));
    });

    console.log('H2 block order:', JSON.stringify(blockInfo, null, 2));

    expect(blockInfo[0].type).toBe('h2');
    expect(blockInfo[1].text).toBe('Text after heading');
    expect(blockInfo[2].text).toBe('');
  });

  test('Block order without select-all-delete (fresh editor) should be correct', async ({ page }) => {
    // This tests the same flow but WITHOUT the select-all-delete step
    // to see if the issue is specific to the select-all-delete path

    const block = page.locator('[contenteditable="true"]').first();
    await block.click();

    // Type "# " to create heading
    await page.keyboard.type('# ', { delay: 50 });
    await page.waitForTimeout(400);
    await expect(page.locator('.bke-block--h1')).toHaveCount(1);

    // Press Enter -> Block 2
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);

    // Type text
    await page.keyboard.type('Text in block 2', { delay: 30 });
    await page.waitForTimeout(300);

    // Press Enter -> Block 3
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);

    const blockInfo = await page.evaluate(() => {
      const blocks = document.querySelectorAll('.bke-block');
      return Array.from(blocks).map((b, i) => ({
        index: i,
        type: b.getAttribute('data-block-type'),
        text: b.textContent.trim()
      }));
    });

    console.log('Fresh editor block order:', JSON.stringify(blockInfo, null, 2));

    expect(blockInfo[0].type).toBe('h1');
    expect(blockInfo[1].text).toBe('Text in block 2');
    expect(blockInfo[2].text).toBe('');
  });
});
