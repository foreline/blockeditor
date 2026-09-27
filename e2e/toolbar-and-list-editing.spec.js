'use strict';

import { test, expect } from '@playwright/test';

async function emptyEditor(page) {
  await page.goto('/');
  await page.locator('.bke-block').first().click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('Backspace');
  await expect(page.locator('.bke-block')).toHaveCount(1);
}

test('toolbar starts pinned, stays visible while scrolling, and can be unpinned and repinned', async ({ page }) => {
  await page.goto('/');
  const toolbar = page.locator('.bke-toolbar');
  const pin = page.locator('.bke-toolbar-pin');
  await expect(pin).toHaveAttribute('aria-pressed', 'true');
  await expect(pin).toHaveAccessibleName('Открепить панель');
  const before = await page.evaluate(() => window.editor.getMarkdown());
  await page.locator('.bke-block').last().scrollIntoViewIfNeeded();
  await expect.poll(async () => (await toolbar.boundingBox()).y).toBeGreaterThanOrEqual(0);
  const pinBounds = await pin.boundingBox();
  const toolbarBounds = await toolbar.boundingBox();
  expect(pinBounds.x + pinBounds.width).toBeCloseTo(toolbarBounds.x + toolbarBounds.width, 0);
  await pin.click();
  await expect(pin).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(async () => {
    const bounds = await toolbar.boundingBox();
    return bounds.y + bounds.height;
  }).toBeLessThan(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await pin.focus();
  await page.keyboard.press('Space');
  await expect(pin).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.bke-block').last().scrollIntoViewIfNeeded();
  expect((await toolbar.boundingBox()).y).toBeGreaterThanOrEqual(0);
  expect(await page.evaluate(() => window.editor.getMarkdown())).toBe(before);
});

test('pinning preserves the caret and editing selection', async ({ page }) => {
  await emptyEditor(page);
  await page.keyboard.type('Hello world');
  await page.keyboard.press('Home');
  await page.keyboard.press('ControlOrMeta+Shift+ArrowRight');
  await page.locator('.bke-toolbar-pin').click();
  await page.locator('.bke-toolbar-bold').click();
  await expect(page.locator('.bke-block strong, .bke-block b')).toContainText('Hello');
});

test('code toolbar merges selected paragraphs and keeps text outside the selection', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const area = window.editor.contentArea;
    area.innerHTML = [
      '<div class="bke-block bke-block--p" data-block-type="paragraph" contenteditable="true">Before alpha</div>',
      '<div class="bke-block bke-block--p" data-block-type="paragraph" contenteditable="true">beta</div>',
      '<div class="bke-block bke-block--p" data-block-type="paragraph" contenteditable="true">gamma After</div>'
    ].join('');
    const blocks = area.querySelectorAll('.bke-block');
    const range = document.createRange();
    range.setStart(blocks[0].firstChild, 7);
    range.setEnd(blocks[2].firstChild, 5);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  });

  await page.locator('.bke-toolbar-code').click();
  await expect(page.locator('.bke-content-area > .bke-block')).toHaveCount(3);
  await expect(page.locator('.bke-content-area > .bke-block').first()).toHaveText('Before ');
  await expect(page.locator('.bke-block--code code')).toHaveText('alpha\nbeta\ngamma');
  await expect(page.locator('.bke-content-area > .bke-block').last()).toHaveText(' After');
  expect(await page.evaluate(() => window.editor.getMarkdown())).toContain('```\nalpha\nbeta\ngamma\n```');
});

test('code toolbar converts entire selected paragraphs into one block', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const area = window.editor.contentArea;
    area.innerHTML = ['one', 'two', 'three'].map(text =>
      `<div class="bke-block bke-block--p" data-block-type="paragraph" contenteditable="true">${text}</div>`
    ).join('');
    const blocks = area.querySelectorAll('.bke-block');
    const range = document.createRange();
    range.setStart(blocks[0].firstChild, 0);
    range.setEnd(blocks[2].firstChild, 5);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
  });

  await page.locator('.bke-toolbar-code').click();
  await expect(page.locator('.bke-content-area > .bke-block')).toHaveCount(1);
  await expect(page.locator('.bke-block--code code')).toHaveText('one\ntwo\nthree');
  expect(await page.evaluate(() => window.editor.getMarkdown())).toBe('```\none\ntwo\nthree\n```');
});

for (const entry of ['shortcut', 'toolbar']) {
  test(`numbered-list caret is after the number via ${entry} and Enter`, async ({ page }) => {
    await emptyEditor(page);
    if (entry === 'shortcut') await page.keyboard.type('1. ');
    else await page.locator('.bke-toolbar-ol').click();
    const items = page.locator('[data-block-type="ol"] li');
    const lineRect = li => {
      const range = document.createRange();
      range.selectNodeContents(li);
      const rect = range.getBoundingClientRect();
      return { x: rect.x, height: rect.height };
    };
    const empty = await items.first().evaluate(lineRect);
    expect(empty.height).toBeGreaterThan(0);
    await page.keyboard.type('First');
    const textX = (await items.first().evaluate(lineRect)).x;
    expect(Math.abs(empty.x - textX)).toBeLessThan(1);
    await page.keyboard.press('Enter');
    await expect(items.last()).toBeFocused();
    const next = await items.last().evaluate(lineRect);
    expect(next.height).toBeGreaterThan(0);
    expect(Math.abs(next.x - textX)).toBeLessThan(1);
    await page.keyboard.type('Second');
    await expect(items).toHaveText(['First', 'Second']);
    expect(await page.evaluate(() => window.editor.getMarkdown())).toBe('1. First\n2. Second');
  });
}

test('Backspace removes a new empty checkbox item and typing continues in the previous task', async ({ page }) => {
  await emptyEditor(page);
  await page.locator('.bke-toolbar-sq').click();
  await page.keyboard.type('Keep');
  await page.getByRole('checkbox').check();
  await page.locator('.bke-task-list-item span').click();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(' this');
  await expect(page.getByRole('checkbox')).toHaveCount(1);
  await expect(page.getByRole('checkbox')).toBeChecked();
  expect(await page.evaluate(() => window.editor.getMarkdown())).toBe('- [x] Keep this');
});

test('Backspace removes a lone empty checkbox and leaves an editable paragraph', async ({ page }) => {
  await emptyEditor(page);
  await page.locator('.bke-toolbar-sq').click();
  await page.keyboard.press('Backspace');
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await expect(page.locator('.bke-block')).toHaveAttribute('data-block-type', 'paragraph');
  await page.keyboard.type('Normal text');
  await expect(page.locator('.bke-block')).toHaveText('Normal text');
});

test('Backspace at the first task preserves formatted text and remaining checkboxes', async ({ page }) => {
  await emptyEditor(page);
  await page.locator('.bke-toolbar-sq').click();
  await page.keyboard.type('First');
  await page.keyboard.press('Home');
  await page.keyboard.press('Shift+End');
  await page.locator('.bke-toolbar-bold').click();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Second');
  await page.getByRole('checkbox').last().check();
  await page.locator('.bke-task-list-item span').first().click();
  await page.keyboard.press('Home');
  await page.keyboard.press('Backspace');
  await expect(page.locator('.bke-block').first()).toHaveAttribute('data-block-type', 'paragraph');
  await expect(page.locator('.bke-block').first().locator('strong, b')).toHaveText('First');
  await expect(page.getByRole('checkbox')).toBeChecked();
  expect(await page.evaluate(() => window.editor.getMarkdown())).toBe('**First**\n\n- [x] Second');
});

test('Backspace at a later task merges text while ordinary text deletion stays native', async ({ page }) => {
  await emptyEditor(page);
  await page.locator('.bke-toolbar-sq').click();
  await page.keyboard.type('First');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Second');
  await page.keyboard.press('Home');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(' ');
  await expect(page.getByRole('checkbox')).toHaveCount(1);
  await expect(page.locator('.bke-task-list-item span')).toHaveText('First Second');
  await page.keyboard.press('End');
  await page.keyboard.press('Shift+ArrowLeft');
  await page.keyboard.press('Backspace');
  await expect(page.locator('.bke-task-list-item span')).toHaveText('First Secon');
});
