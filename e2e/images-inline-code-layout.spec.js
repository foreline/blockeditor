'use strict';

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.route('**/wide-test.svg', route => route.fulfill({
    contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="1200"><rect width="2400" height="1200" fill="steelblue"/></svg>'
  }));
  await page.goto('/');
});

async function clear(page) {
  await page.locator('.bke-block').first().click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('Backspace');
}

async function pasteHtml(page, html) {
  await page.evaluate(async html => navigator.clipboard.write([
    new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }) })
  ]), html);
  await page.keyboard.press('ControlOrMeta+V');
}

async function expectContained(page) {
  const image = page.locator('.bke-content-area img');
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
  const box = await image.boundingBox();
  const editor = await page.locator('.bke-content-area').boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(editor.x);
  expect(box.x + box.width).toBeLessThanOrEqual(editor.x + editor.width + 1);
  expect(Math.abs(box.width / box.height - 2)).toBeLessThan(0.02);
}

test('large pasted HTML image fits the editor, resizes only at the handle, and stays proportional', async ({ page }) => {
  await clear(page);
  await pasteHtml(page, '<img src="http://localhost:5173/wide-test.svg" width="2400" height="1200" alt="Wide test">');
  await expectContained(page);
  const image = page.locator('.bke-content-area img');
  const handle = page.locator('.bke-resize-handle');
  await image.hover();
  await expect(image).toHaveCSS('cursor', 'default');
  await handle.hover();
  await expect(handle).toHaveCSS('cursor', 'nwse-resize');
  const bounds = await handle.boundingBox();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x - 150, bounds.y, { steps: 4 });
  await page.mouse.up();
  const smaller = (await image.boundingBox()).width;
  expect(smaller).toBeLessThan(700);
  const next = await handle.boundingBox();
  await page.mouse.move(next.x + 7, next.y + 7);
  await page.mouse.down();
  await page.mouse.move(next.x + 1800, next.y + 900, { steps: 4 });
  await page.mouse.up();
  await expectContained(page);
  await page.setViewportSize({ width: 440, height: 800 });
  await expectContained(page);
});

test('an image pasted inside text cannot overflow a paragraph', async ({ page }) => {
  await clear(page);
  await pasteHtml(page, '<p>Before <img src="http://localhost:5173/wide-test.svg" width="2400" height="1200"> after</p>');
  await expectContained(page);
  await expect(page.locator('.bke-block')).toContainText('Before');
  await expect(page.locator('.bke-block')).toContainText('after');
});

test('pasting clipboard image pixels creates an image and leaves a place to continue typing', async ({ page }) => {
  await clear(page);
  await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 2400;
    canvas.height = 1200;
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
  });
  await page.keyboard.press('ControlOrMeta+V');
  await expectContained(page);
  await page.keyboard.type('After the image');
  await expect(page.locator('.bke-block').last()).toHaveText('After the image');
  expect(await page.evaluate(() => window.editor.getMarkdown())).toContain('data:image/png;base64,');
});

test('inline code wraps selected text, exports it, and toggles back to normal text', async ({ page }) => {
  await clear(page);
  await page.keyboard.type('Use value here');
  await page.keyboard.press('Home');
  for (let n = 0; n < 4; n++) await page.keyboard.press('ArrowRight');
  for (let n = 0; n < 5; n++) await page.keyboard.press('Shift+ArrowRight');
  await page.locator('.bke-toolbar-inline').click();
  await expect(page.locator('.bke-block code')).toHaveText('value');
  await expect(page.locator('.bke-block')).toHaveAttribute('data-block-type', 'paragraph');
  // Native editing may turn spaces beside inline elements into nonbreaking spaces.
  expect((await page.evaluate(() => window.editor.getMarkdown())).replace(/\u00a0/g, ' ')).toBe('Use `value` here');
  await page.locator('.bke-toolbar-inline').click();
  await expect(page.locator('.bke-block code')).toHaveCount(0);
  await expect(page.locator('.bke-block')).toHaveText('Use value here');
});

test('inline code supports undo and does not replace multiple blocks', async ({ page }) => {
  await clear(page);
  await page.keyboard.type('First');
  await page.keyboard.press('Home');
  await page.keyboard.press('Shift+End');
  await page.locator('.bke-toolbar-inline').click();
  await page.keyboard.press('ControlOrMeta+Z');
  await expect(page.locator('.bke-block code')).toHaveCount(0);
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Second');
  await page.keyboard.press('ControlOrMeta+A');
  await page.locator('.bke-toolbar-inline').click();
  await expect(page.locator('.bke-block')).toHaveText(['First', 'Second']);
});

test('bullet, numbered, and checkbox lists share marker centers and text origins', async ({ page }) => {
  const positions = await page.evaluate(() => {
    return ['ul', 'ol', 'sq'].map(type => {
      const item = document.querySelector(`.bke-block[data-block-type="${type}"] li`);
      const text = type === 'sq' ? item.querySelector('span') : item;
      const range = document.createRange();
      range.selectNodeContents(text);
      const marker = type === 'sq' ? item.querySelector('input').getBoundingClientRect() : null;
      return {
        text: range.getBoundingClientRect().x,
        marker: marker ? marker.x + marker.width / 2 : item.getBoundingClientRect().x + parseFloat(getComputedStyle(item, '::before').width) / 2
      };
    });
  });
  for (const item of positions.slice(1)) {
    expect(Math.abs(item.text - positions[0].text)).toBeLessThan(1);
    expect(Math.abs(item.marker - positions[0].marker)).toBeLessThan(1);
  }
});
