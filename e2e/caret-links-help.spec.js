'use strict';
import { test, expect } from '@playwright/test';

async function clear(page) {
  await page.goto('/');
  await page.locator('.bke-block').first().click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('Backspace');
}

for (const type of ['ul', 'ol', 'sq']) {
  test(`Backspace after ${type} resumes at the last item`, async ({ page }) => {
    await clear(page);
    await page.locator(`.bke-toolbar-${type}`).click();
    await page.keyboard.type('First');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Last');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('xy');
    await page.keyboard.press('Backspace');
    await expect(page.locator('.bke-block').last()).toHaveText('x');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('!');
    await expect(page.locator('.bke-block')).toHaveCount(1);
    await expect(page.locator('.bke-content-area li').filter({ hasText: 'Last!' })).toHaveCount(1);
    expect(await page.locator('.bke-content-area li').allTextContents()).toEqual(['First', 'Last!']);
  });
}

const fixtures = [
  ['paragraph', '<div contenteditable="true">First <strong>last</strong></div>', 'div'],
  ['h2', '<h2 contenteditable="true">First last</h2>', 'h2'],
  ['quote', '<blockquote contenteditable="true">First last</blockquote>', 'blockquote'],
  ['code', '<pre><code contenteditable="true">First\nlast</code></pre>', 'code'],
  ['table', '<table><tbody><tr><td contenteditable="true">First</td><td contenteditable="true">last</td></tr></tbody></table>', 'td:last-child'],
  ['ul', '<ul><li contenteditable="true">First</li><li contenteditable="true"><br></li></ul>', 'li:last-child']
];
for (const [type, html, target] of fixtures) {
  test(`empty paragraph after ${type} focuses its final editing host`, async ({ page }) => {
    await page.goto('/');
    await page.evaluate(({type,html}) => window.editor.transaction(() => {
      window.editor.contentArea.innerHTML = `<div class="bke-block" data-block-type="${type}" contenteditable="false">${html}</div><div class="bke-block" data-block-type="paragraph" contenteditable="true"><br></div>`;
    }), {type,html});
    await page.locator('.bke-block').last().click();
    await page.keyboard.press('Backspace');
    await page.keyboard.type('!');
    await expect(page.locator('.bke-block')).toHaveCount(1);
    await expect(page.locator('.bke-block').locator(target)).toContainText(type === 'ul' ? '!' : 'last!');
  });
}

for (const key of ['Backspace', 'Delete']) {
  test(`${key} on first empty paragraph starts the next list; sole empty paragraph stays usable`, async ({ page }) => {
    await clear(page);
    await page.evaluate(() => window.editor.transaction(() => {
      window.editor.contentArea.innerHTML = '<div class="bke-block" data-block-type="paragraph" contenteditable="true"><br></div><div class="bke-block" data-block-type="ul"><ul><li contenteditable="true">First</li><li contenteditable="true">Last</li></ul></div>';
    }));
    await page.locator('.bke-block').first().click();
    await page.keyboard.press(key);
    await page.keyboard.type('!');
    await expect(page.locator('.bke-content-area li')).toHaveText(['!First','Last']);
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.press(key);
    await page.keyboard.type('Still editable');
    await expect(page.locator('.bke-block')).toHaveText('Still editable');
  });
}

test('Backspace beside media retains a place to type', async ({ page }) => {
  await clear(page);
  await page.keyboard.type('---');
  await page.keyboard.press('Backspace');
  await page.keyboard.type('After rule');
  await expect(page.locator('hr')).toHaveCount(1);
  await expect(page.locator('.bke-block').last()).toHaveText('After rule');
});

test('links apply to selection, edit, remove and support undo and Markdown export', async ({ page }) => {
  await clear(page);
  await page.keyboard.type('Hello world');
  await page.keyboard.press('Home');
  await page.keyboard.press('ControlOrMeta+Shift+ArrowRight');
  await page.getByTitle('Вставить или изменить ссылку').click();
  await page.getByLabel('Адрес ссылки').fill('https://example.com');
  await page.getByLabel('Адрес ссылки').press('Enter');
  await expect(page.locator('.bke-block a')).toHaveAttribute('href', 'https://example.com');
  expect(await page.evaluate(() => window.editor.getMarkdown())).toContain('https://example.com');
  await page.getByTitle('Вставить или изменить ссылку').click();
  await expect(page.getByLabel('Адрес ссылки')).toHaveValue('https://example.com');
  await page.getByLabel('Адрес ссылки').fill('https://example.org/path');
  await page.getByRole('button', { name: 'Применить', exact: true }).click();
  await expect(page.locator('.bke-block a')).toHaveAttribute('href', 'https://example.org/path');
  await page.getByTitle('Вставить или изменить ссылку').click();
  await page.getByRole('button', { name: 'Удалить ссылку', exact: true }).click();
  await expect(page.locator('.bke-block a')).toHaveCount(0);
  await page.keyboard.press('ControlOrMeta+Z');
  await expect(page.locator('.bke-block a')).toHaveAttribute('href', 'https://example.org/path');
});

test('link at caret uses address as text, rejects unsafe URLs and Escape restores selection', async ({ page }) => {
  await clear(page);
  await page.keyboard.type('Go ');
  await page.getByTitle('Вставить или изменить ссылку').click();
  await page.getByLabel('Адрес ссылки').fill('javascript:alert(1)');
  await page.getByLabel('Адрес ссылки').press('Enter');
  await expect(page.getByRole('alert')).toContainText('Введите адрес');
  await expect(page.locator('.bke-block a')).toHaveCount(0);
  await page.getByLabel('Адрес ссылки').fill('https://example.com');
  await page.getByLabel('Адрес ссылки').press('Enter');
  await expect(page.locator('.bke-block a')).toHaveText('https://example.com');
  await page.keyboard.press('End');
  await page.getByTitle('Вставить или изменить ссылку').click();
  await page.getByLabel('Адрес ссылки').press('Escape');
  await page.keyboard.type('!');
  await expect(page.locator('.bke-block')).toContainText('https://example.com!');
});

test('link panel refuses a selection crossing blocks', async ({ page }) => {
  await clear(page);
  await page.keyboard.type('First'); await page.keyboard.press('Enter'); await page.keyboard.type('Last');
  await page.keyboard.press('ControlOrMeta+A');
  await page.getByTitle('Вставить или изменить ссылку').click();
  await expect(page.getByRole('dialog')).toContainText('в одном абзаце');
  await expect(page.getByLabel('Адрес ссылки')).toHaveCount(0);
});

test('Russian help, translated pin labels and inline-code ordering work on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await clear(page);
  await page.keyboard.type('Keep');
  expect(await page.locator('.bke-toolbar-inline').evaluate(el => el.nextElementSibling.className)).toBe('bke-toolbar-code');
  expect(await page.locator('.bke-toolbar-pin').evaluate(el => el.previousElementSibling.className)).toBe('bke-toolbar-help');
  await page.getByTitle('Справка редактора').click();
  const help = page.getByRole('dialog');
  await expect(help).toContainText('Сокращения Markdown');
  const box = await help.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(390);
  await page.keyboard.press('Escape');
  await page.keyboard.type('!');
  await expect(page.locator('.bke-block')).toHaveText('Keep!');
  await page.getByTitle('Открепить панель').click();
  await expect(page.getByTitle('Закрепить панель')).toBeVisible();
});
for (const type of ['ul', 'ol', 'sq']) {
  test(`links in ${type} survive Markdown and HTML export`, async ({ page }) => {
    await clear(page);
    await page.locator(`.bke-toolbar-${type}`).click();
    await page.keyboard.type('Linked');
    await page.keyboard.press('Home');
    await page.keyboard.press('Shift+End');
    await page.getByTitle('Вставить или изменить ссылку').click();
    await page.getByLabel('Адрес ссылки').fill('https://example.com/guide');
    await page.getByLabel('Адрес ссылки').press('Enter');
    await expect(page.locator('.bke-content-area li a')).toHaveText('Linked');
    expect(await page.evaluate(() => window.editor.getMarkdown())).toContain('[Linked](<https://example.com/guide>)');
    expect(await page.evaluate(() => window.editor.getHtml())).toContain('href="https://example.com/guide"');
    await page.keyboard.press('ControlOrMeta+Z');
    await expect(page.locator('.bke-content-area li a')).toHaveCount(0);
  });
}

test('built-in labels support Russian defaults, overrides, and isolated editor selections', async ({ page }) => {
  await clear(page);
  await page.keyboard.type('First');
  await page.keyboard.press('Home');
  await page.keyboard.press('Shift+End');
  await page.evaluate(async () => {
    const { Editor } = await import('/src/Editor.js');
    const element = document.createElement('div');
    element.id = 'second-editor'; document.body.appendChild(element);
    window.secondEditor = new Editor({ id: 'second-editor', text: 'Second', toolbar: { locale: 'ru', labels: { help: 'Помощь' } } });
  });
  const second = page.locator('#second-editor');
  await expect(second.locator('.bke-toolbar-inline')).toHaveAttribute('title', /Строчный код.*Markdown/);
  await expect(second.locator('.bke-toolbar-link')).toHaveAttribute('title', /Вставить или изменить ссылку/);
  await second.locator('.bke-block').click();
  await page.keyboard.press('Home'); await page.keyboard.press('Shift+End');
  await second.locator('.bke-toolbar-link').focus();
  await page.keyboard.press('Enter');
  await second.getByLabel('Адрес ссылки').fill('https://example.org');
  await second.getByLabel('Адрес ссылки').press('Enter');
  await expect(second.locator('.bke-block a')).toHaveText('Second');
  await expect(page.locator('#editor .bke-block a')).toHaveCount(0);
  await second.getByTitle('Помощь').click();
  await expect(second.getByRole('dialog')).toContainText('Сокращения Markdown');
  await page.evaluate(() => window.secondEditor.destroy());
  await expect(second.getByRole('dialog')).toHaveCount(0);
});
