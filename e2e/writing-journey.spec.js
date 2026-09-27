'use strict';

import { test, expect } from '@playwright/test';

// Exercise the shipped demo with real input. API calls only read exports;
// they never manufacture the document or repair the selection under test.
test.beforeEach(async ({ page }) => {
  const errors = [];
  page.__journeyErrors = errors;
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.bke-content-area')).toBeVisible();
  await page.locator('.bke-block').first().click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('Backspace');
  await expect(page.locator('.bke-block')).toHaveCount(1);
  await expect(page.locator('.bke-block')).toHaveText('');
  await expect(page.locator('.bke-block')).toHaveAttribute('data-block-type', 'paragraph');
});

test.afterEach(async ({ page }) => {
  expect(page.__journeyErrors).toEqual([]);
});

test('source views wrap long lines and remain navigable in viewing mode', async ({ page }) => {
  await page.keyboard.type('a'.repeat(300));
  await page.evaluate(() => window.editor.setEditable(false));

  for (const mode of ['markdown', 'html']) {
    const button = page.locator(`.bke-toolbar-${mode}`);
    await expect(button).toBeEnabled();
    await button.click();
    const source = page.locator(`.bke-editor-${mode}`);
    await expect(source).toBeVisible();
    const pre = source.locator('pre');
    const code = source.locator('code');
    await expect(pre).toHaveCSS('white-space', 'pre-wrap');
    await expect(code).toHaveCSS('white-space', 'pre-wrap');
    await expect(code).toHaveCSS('overflow-wrap', 'anywhere');
    expect(await pre.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  }

  await expect(page.locator('.bke-toolbar-text')).toBeEnabled();
  await page.locator('.bke-toolbar-text').click();
  await expect(page.locator('.bke-content-area')).toBeVisible();
});

test('write, export, clear, and rebuild a mixed document', async ({ page }) => {
  await test.step('Write a heading and formatted paragraph', async () => {
    await page.keyboard.type('# Release notes');
    await expect(page.locator('.bke-block').first()).toHaveAttribute('data-block-type', 'h1');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Today we tested **bold** and plain text.');
    await expect(page.locator('.bke-block').nth(1).locator('strong')).toHaveText('bold');
  });
  await test.step('Continue a list and exit into a paragraph', async () => {
    await page.keyboard.press('Enter');
    await page.keyboard.type('- First item');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Second item');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Final paragraph');
    await expect(page.locator('.bke-block')).toHaveCount(4);
    await expect(page.locator('.bke-block').nth(2).locator('li')).toHaveText(['First item', 'Second item']);
    await expect(page.locator('.bke-block').last()).toHaveText('Final paragraph');
  });
  await test.step('Inspect both export views and resume editing', async () => {
    await page.locator('.bke-toolbar-markdown').click();
    const markdown = page.locator('.bke-editor-markdown');
    await expect(markdown).toBeVisible();
    await expect(markdown).toContainText('# Release notes');
    await expect(markdown).toContainText('**bold**');
    await expect(markdown).toContainText('Second item');
    await page.locator('.bke-toolbar-html').click();
    await expect(page.locator('.bke-editor-html')).toContainText(/<h1[^>]*>Release notes<\/h1>/);
    await page.locator('.bke-toolbar-text').click();
    await page.locator('.bke-block').last().click();
    await page.keyboard.press('End');
    await page.keyboard.type(' updated');
    await expect(page.locator('.bke-block').last()).toHaveText('Final paragraph updated');
  });
  await test.step('Delete the entire document and continue typing', async () => {
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Backspace');
    await expect(page.locator('.bke-block')).toHaveCount(1);
    await page.keyboard.type('Rebuilt first');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Rebuilt second');
    await expect(page.locator('.bke-block')).toHaveText(['Rebuilt first', 'Rebuilt second']);
    expect(await page.evaluate(() => window.editor.getMarkdown())).toBe('Rebuilt first\n\nRebuilt second');
  });
});

test('heading to paragraph restores editing behavior and exports', async ({ page }) => {
  await page.keyboard.type('# Former heading');
  await page.locator('#dropdownMenuHeader').click();
  await page.locator('.bke-toolbar-paragraph').click();
  await expect(page.locator('.bke-block')).toHaveAttribute('data-block-type', 'paragraph');
  await expect(page.locator('.bke-toolbar-bold')).toBeEnabled();
  expect(await page.evaluate(() => window.editor.getMarkdown())).toBe('Former heading');
  expect(await page.evaluate(() => window.editor.getHtml())).toBe('<p>Former heading</p>');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Next paragraph');
  await expect(page.locator('.bke-block')).toHaveText(['Former heading', 'Next paragraph']);
});

test('heading menu closes after selecting a block type', async ({ page }) => {
  await page.keyboard.type('Title');
  await page.locator('#dropdownMenuHeader').click();
  await page.locator('.bke-toolbar-header2').click();
  await expect(page.locator('.bke-dropdown-menu')).toBeHidden();
  await expect(page.locator('#dropdownMenuHeader')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.bke-block')).toHaveAttribute('data-block-type', 'h2');
});

test('standalone heading controls have visible accessible labels', async ({ page }) => {
  await page.goto('/test-page.html');
  for (const level of [1, 2, 3]) {
    await expect(page.getByRole('button', { name: `H${level}`, exact: true })).toBeVisible();
  }
});

test('code preserves line breaks and can be followed by normal text', async ({ page }) => {
  await page.locator('.bke-toolbar-code').click();
  const code = page.locator('.bke-block code');
  await code.click();
  await page.keyboard.type('const answer = 42;');
  await page.keyboard.press('Enter');
  await page.keyboard.type('return answer;');
  await page.keyboard.press('ControlOrMeta+Enter');
  await page.keyboard.type('Explanation');
  await expect(page.locator('.bke-block')).toHaveCount(2);
  await expect(page.locator('.bke-block').last()).toHaveText('Explanation');
  const markdown = await page.evaluate(() => window.editor.getMarkdown());
  expect(markdown).toContain('const answer = 42;\nreturn answer;');
  expect(markdown).toContain('```');
  expect(markdown).toContain('Explanation');
});

test('task checkbox state is reflected in markdown export', async ({ page }) => {
  await page.keyboard.type('Ship release');
  await page.locator('.bke-toolbar-sq').click();
  const checkbox = page.getByRole('checkbox');
  await checkbox.check();
  expect(await page.evaluate(() => window.editor.getMarkdown())).toContain('- [x] Ship release');
  await checkbox.uncheck();
  expect(await page.evaluate(() => window.editor.getMarkdown())).toContain('- [ ] Ship release');
});

test('table supports keyboard navigation and exports edited cells', async ({ page }) => {
  await page.locator('.bke-toolbar-table').click();
  const cells = page.locator('.bke-block table').locator('th, td');
  await cells.first().click();
  await page.keyboard.press('Home');
  await page.keyboard.press('Shift+End');
  await page.keyboard.type('Name');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Home');
  await page.keyboard.press('Shift+End');
  await page.keyboard.type('Value');
  await expect(cells.nth(0)).toHaveText('Name');
  await expect(cells.nth(1)).toHaveText('Value');
  expect(await page.evaluate(() => window.editor.getMarkdown())).toContain('| Name | Value |');
});

test('undo and redo plain typing leaves the editor usable', async ({ page }) => {
  await page.goto('/test-page.html');
  await page.locator('.bke-block').click();
  await page.keyboard.type('Draft');
  await page.keyboard.press('ControlOrMeta+Z');
  await expect(page.locator('.bke-block')).toHaveText('');
  await page.keyboard.press('ControlOrMeta+Shift+Z');
  await expect(page.locator('.bke-block')).toHaveText('Draft');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Next');
  await expect(page.locator('.bke-block')).toHaveText(['Draft', 'Next']);
});

test('pasting markdown creates editable blocks and preserves subsequent typing', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.evaluate(() => navigator.clipboard.writeText('## Pasted heading\n\nPasted paragraph'));
  await page.keyboard.press('ControlOrMeta+V');
  await expect(page.locator('.bke-block')).toHaveText(['Pasted heading', 'Pasted paragraph']);
  await expect(page.locator('.bke-block').first()).toHaveAttribute('data-block-type', 'h2');
  await page.keyboard.type(' extended');
  await expect(page.locator('.bke-block').last()).toHaveText('Pasted paragraph extended');
  expect(await page.evaluate(() => window.editor.getMarkdown())).toBe('## Pasted heading\n\nPasted paragraph extended');
});
