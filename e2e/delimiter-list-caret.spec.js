'use strict';

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.locator('.bke-block').first().click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('Backspace');
  await expect(page.locator('.bke-block')).toHaveCount(1);
});

for (const marker of ['---', '***', '___']) {
  test(`typing ${marker} creates a horizontal rule and allows continued writing`, async ({ page }) => {
    await page.keyboard.type('Before');
    await page.keyboard.press('Enter');
    await page.keyboard.type(marker);
    await expect(page.locator('[data-block-type="delimiter"] hr')).toHaveCount(1);
    await expect(page.locator('.bke-block').last()).toHaveAttribute('data-block-type', 'paragraph');
    await page.keyboard.type('After');
    await expect(page.locator('.bke-block')).toHaveText(['Before', '', 'After']);
    expect(await page.evaluate(() => window.editor.getMarkdown())).toBe('Before\n\n---\n\nAfter');
    expect(await page.evaluate(() => window.editor.getHtml())).toContain('<hr>');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Still editing');
    await expect(page.locator('.bke-block').last()).toHaveText('Still editing');
  });
}

test('horizontal-rule characters inside text remain ordinary text', async ({ page }) => {
  await page.keyboard.type('Keep --- here and __underscores__.');
  await expect(page.locator('[data-block-type="delimiter"]')).toHaveCount(0);
  await expect(page.locator('.bke-block')).toContainText('Keep --- here');
});

// Empty editable LIs need a rendered line at the text origin. A bare LI with
// an inside marker paints the caret before the bullet and has no content rect.
async function expectEmptyCaretAtTextOrigin(item, expectedX) {
  await expect(item).toBeFocused();
  await expect(item).toHaveText('');
  const position = await item.evaluate(li => {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0).cloneRange();
    const inside = li === selection.anchorNode || li.contains(selection.anchorNode);
    range.selectNodeContents(li);
    const rect = range.getBoundingClientRect();
    return { inside, collapsed: selection.isCollapsed, x: rect.x, height: rect.height };
  });
  expect(position.inside).toBe(true);
  expect(position.collapsed).toBe(true);
  expect(position.height).toBeGreaterThan(0);
  expect(Math.abs(position.x - expectedX)).toBeLessThan(2);
}

for (const entry of ['shortcut', 'toolbar']) {
  test(`bullet list caret stays after the marker via ${entry} and Enter`, async ({ page }) => {
    if (entry === 'shortcut') await page.keyboard.type('- ');
    else await page.locator('.bke-toolbar-ul').click();
    const items = page.locator('[data-block-type="ul"] li');
    await expect(items).toHaveCount(1);
    // Measure the empty line, then compare with the actual start of typed text.
    const initialX = await items.first().evaluate(li => {
      const range = document.createRange();
      range.selectNodeContents(li);
      return range.getBoundingClientRect().x;
    });
    await expectEmptyCaretAtTextOrigin(items.first(), initialX);
    await page.keyboard.type('First');
    const textX = await items.first().evaluate(li => {
      const range = document.createRange();
      range.setStart(li.firstChild, 0);
      range.setEnd(li.firstChild, 1);
      return range.getBoundingClientRect().x;
    });
    expect(Math.abs(initialX - textX)).toBeLessThan(2);
    await page.keyboard.press('Enter');
    await expect(items).toHaveCount(2);
    await expectEmptyCaretAtTextOrigin(items.nth(1), textX);
    await page.keyboard.type('Second');
    await expect(items).toHaveText(['First', 'Second']);
    expect(await page.evaluate(() => window.editor.getMarkdown())).toBe('- First\n- Second');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('After the list');
    await expect(page.locator('.bke-block').last()).toHaveText('After the list');
  });
}
