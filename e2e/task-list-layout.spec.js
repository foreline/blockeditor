'use strict';

import { test, expect } from '@playwright/test';

const taskBlock = '.bke-block[data-block-type="sq"]';
const taskText = '.bke-task-list-item > span[contenteditable="true"]';

async function expectCheckboxAlignment(items) {
  const rows = await items.evaluateAll(elements => elements.map(li => {
    const checkbox = li.querySelector('input').getBoundingClientRect();
    const span = li.querySelector('span[contenteditable]');
    const text = span.getBoundingClientRect();
    const lineHeight = parseFloat(getComputedStyle(span).lineHeight);
    return {
      checkboxCenter: checkbox.top + checkbox.height / 2,
      firstLineCenter: text.top + lineHeight / 2,
      gap: text.left - checkbox.right,
      textHeight: text.height,
      lineHeight
    };
  }));
  expect(rows.length).toBeGreaterThan(0);
  for (const row of rows) {
    expect(Math.abs(row.checkboxCenter - row.firstLineCenter)).toBeLessThan(1);
    expect(row.gap).toBeGreaterThanOrEqual(6);
    expect(row.textHeight).toBeGreaterThanOrEqual(row.lineHeight - 1);
  }
  return rows;
}

for (const typography of ['default', 'large']) {
  test(`parsed checked and unchecked tasks align with ${typography} text`, async ({ page }) => {
    await page.goto('/');
    if (typography === 'large') {
      await page.addStyleTag({ content: '.bke-editor { --bke-font-size: 22px; --bke-line-height: 1.8; }' });
    }
    const items = page.locator(`${taskBlock} .bke-task-list-item`);
    await expect(items).toHaveCount(3);
    await expectCheckboxAlignment(items);
  });
}

test('empty and wrapped task text stays aligned with its checkbox', async ({ page }) => {
  await page.setViewportSize({ width: 440, height: 800 });
  await page.goto('/');
  await page.locator('.bke-block').first().click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('Backspace');
  await page.locator('.bke-toolbar-sq').click();
  const items = page.locator(`${taskBlock} .bke-task-list-item`);
  await expectCheckboxAlignment(items);
  const text = 'A longer task description that wraps onto several lines while keeping the checkbox beside the first line.';
  await page.keyboard.type(text);
  await expect(page.locator(taskText)).toHaveText(text);
  const [wrapped] = await expectCheckboxAlignment(items);
  expect(wrapped.textHeight).toBeGreaterThanOrEqual(wrapped.lineHeight * 2);
  await page.keyboard.press('Enter');
  await expect(items).toHaveCount(2);
  await expect(page.locator(taskText).last()).toBeFocused();
  await expectCheckboxAlignment(items);
  await page.keyboard.type('Second task');
  await page.getByRole('checkbox').first().check();
  await expectCheckboxAlignment(items);
  expect(await page.evaluate(() => window.editor.getMarkdown())).toBe(`- [x] ${text}\n- [ ] Second task`);
});

test('task borders follow debug mode for both active and inactive blocks without shifting content', async ({ page }) => {
  await page.goto('/');
  const block = page.locator(taskBlock);
  const text = page.locator(taskText).first();
  const toggle = page.locator('.bke-toolbar-debug');
  await expect(page.locator('.bke-editor').first()).toHaveClass(/bke-debug-mode/);
  const documentBounds = element => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x + window.scrollX, y: rect.y + window.scrollY, width: rect.width, height: rect.height };
  };
  const initialBounds = await block.evaluate(documentBounds);
  await toggle.click();
  await expect(block).toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)');
  await text.click();
  await expect(block).toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)');
  await toggle.click();
  await expect(block).toHaveCSS('border-top-color', 'rgb(163, 59, 48)');
  await page.locator('.bke-block').first().click();
  await expect(block).toHaveCSS('border-top-color', 'rgb(155, 139, 214)');
  await toggle.click();
  await expect(block).toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)');
  expect(await block.evaluate(documentBounds)).toEqual(initialBounds);
});
