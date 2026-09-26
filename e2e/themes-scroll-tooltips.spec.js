'use strict';
import { test, expect } from '@playwright/test';

for (const nested of [false, true]) {
  for (const apply of ['button', 'Enter']) {
    test(`link ${apply} preserves ${nested ? 'nested container' : 'page'} scroll and active block`, async ({ page }) => {
      await page.goto('/');
      if (nested) await page.locator('.bke-editor').first().evaluate(el => {
        el.style.height = '500px'; el.style.overflow = 'auto';
      });
      const last = page.locator('.bke-block').last();
      await last.click(); await page.keyboard.press('End'); await page.keyboard.press('Home');
      await page.keyboard.press('ControlOrMeta+Shift+ArrowRight');
      const position = () => page.evaluate(() => ({ y: scrollY, inner: window.editor.instance.scrollTop }));
      const before = await position();
      expect(nested ? before.inner : before.y).toBeGreaterThan(100);
      await page.locator('.bke-toolbar-link').click();
      await expect.poll(position).toEqual(before);
      await page.getByLabel('Адрес ссылки').fill('https://example.com');
      if (apply === 'button') await page.getByRole('button', { name: 'Применить', exact: true }).click();
      else await page.getByLabel('Адрес ссылки').press('Enter');
      await expect(last.locator('a[href="https://example.com"]')).toHaveCount(1);
      await expect.poll(position).toEqual(before);
      expect(await page.evaluate(() => window.editor.currentBlock === window.editor.contentArea.lastElementChild)).toBe(true);
      await page.locator('.bke-toolbar-link').click();
      await page.getByRole('button', { name: 'Удалить ссылку', exact: true }).click();
      await expect.poll(position).toEqual(before);
      await page.locator('.bke-toolbar-link').click();
      await page.getByLabel('Адрес ссылки').press('Escape');
      await expect.poll(position).toEqual(before);
      await page.keyboard.press('End'); await page.keyboard.type('!');
      await expect(last).toContainText('!');
    });
  }
}

async function themeDocument(page) {
  await page.goto('/');
  await page.evaluate(async () => {
    const { Editor } = await import('/src/Editor.js');
    const root = window.editor.instance;
    window.editor.destroy(); root.innerHTML = '';
    window.editor = new Editor({ element: root, toolbar: { locale: 'ru' }, text: '# Редактор\n\n> Хороший текст начинается с ясной мысли.\n\nОбычный текст со ссылкой [пример](https://example.com) и `кодом`.\n\n```javascript\n// Понятный код\nconst message = "Hello";\nfunction greet(name) { return message + name; }\ngreet("reader");\n```\n\n```json\n{"ready": true, "count": 42, "name": "Editor"}\n```\n\n- [ ] Проверить текст\n- [x] Сохранить ясность\n\n| Имя | Значение |\n| --- | --- |\n| Тема | Автоматически |' });
  });
}

for (const theme of ['light','dark']) {
  test(`${theme} theme styles quotes, controls, and readable code without affecting host content`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await themeDocument(page);
    const quote = page.locator('blockquote');
    await expect(quote).toHaveCSS('border-left-width', '3px');
    await expect(quote).toHaveCSS('padding-left', '16px');
    const code = page.locator('[data-block-type="code"] pre').first();
    await expect(code).toHaveCSS('background-color', theme === 'dark' ? 'rgb(13, 17, 23)' : 'rgb(246, 248, 250)');
    const contrast = await page.locator('[data-block-type="code"] pre').evaluateAll(blocks => {
      const luminance = color => {
        const values = color.match(/[\d.]+/g).slice(0,3).map(Number).map(v => { v/=255; return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4; });
        return values[0]*0.2126+values[1]*0.7152+values[2]*0.0722;
      };
      return blocks.flatMap(pre => [pre, ...pre.querySelectorAll('.token')].map(el => {
        const a = luminance(getComputedStyle(el).color), b = luminance(getComputedStyle(pre).backgroundColor);
        return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
      }));
    });
    expect(Math.min(...contrast)).toBeGreaterThanOrEqual(4.5);
    const select = page.locator('.bke-language-selector').first();
    await select.locator('select').focus(); await expect(select).toHaveCSS('opacity','1');
    await expect(select.locator('select')).toHaveCSS('color', theme === 'dark' ? 'rgb(173, 183, 195)' : 'rgb(87, 96, 106)');
    await page.locator('.bke-toolbar-help').click();
    await expect(page.getByRole('dialog')).toHaveCSS('background-color', theme === 'dark' ? 'rgb(22, 27, 34)' : 'rgb(255, 255, 255)');
    await page.keyboard.press('Escape');
    await page.locator('th').first().click();
    await expect(page.locator('th').first()).toHaveCSS('background-color', theme === 'dark' ? 'rgb(38, 79, 120)' : 'rgb(198, 227, 255)');
    await page.screenshot({ path: `test-results/theme-${theme}.png`, fullPage: true });
    await page.locator('.bke-toolbar-markdown').click();
    await expect(page.locator('.bke-editor-markdown pre')).toHaveCSS('background-color', theme === 'dark' ? 'rgb(13, 17, 23)' : 'rgb(246, 248, 250)');
    await page.evaluate(() => {
      const pre = document.createElement('pre'); pre.id='host-code'; pre.className='language-js'; pre.innerHTML='<code><span class="token keyword">const</span> value = 1;</code>'; document.body.appendChild(pre);
    });
    expect(await page.locator('#host-code .token').evaluate(el => getComputedStyle(el).color === getComputedStyle(el.parentElement).color)).toBe(true);
  });
}

test('OS theme changes live without replacing text or selection', async ({ page }) => {
  await page.emulateMedia({ colorScheme:'light' }); await themeDocument(page);
  await page.locator('blockquote').click(); await page.keyboard.press('End');
  const before = await page.evaluate(() => ({ md:window.editor.getMarkdown(), offset:getSelection().anchorOffset, node:getSelection().anchorNode.textContent }));
  await page.emulateMedia({ colorScheme:'dark' });
  await expect(page.locator('.bke-editor').first()).toHaveCSS('color-scheme','dark');
  expect(await page.evaluate(() => ({ md:window.editor.getMarkdown(), offset:getSelection().anchorOffset, node:getSelection().anchorNode.textContent }))).toEqual(before);
  await page.keyboard.type('!'); await expect(page.locator('blockquote')).toContainText('!');
  await page.emulateMedia({ colorScheme:'light' });
  await expect(page.locator('.bke-editor').first()).toHaveCSS('color-scheme','light');
});

test('toolbar groups start with link and inline code, every icon has a tooltip, and keyboard hints work', async ({ page }) => {
  await page.goto('/');
  expect(await page.locator('.bke-toolbar-link').evaluate(el => el === el.parentElement.firstElementChild)).toBe(true);
  expect(await page.locator('.bke-toolbar-inline').evaluate(el => el === el.parentElement.firstElementChild)).toBe(true);
  expect(await page.locator('.bke-toolbar button').evaluateAll(buttons => buttons.filter(button => button.querySelector('svg, i')).every(button => button.title && button.getAttribute('aria-label')))).toBe(true);
  await expect(page.locator('.bke-toolbar-bold')).toHaveAttribute('title', /Ctrl\+B/);
  await expect(page.locator('#dropdownMenuHeader')).toHaveAttribute('title', /#.*пробел/);
  await page.locator('.bke-block').first().click(); await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.press('Backspace');
  await page.keyboard.type('test'); await page.keyboard.press('Home'); await page.keyboard.press('Shift+End');
  await page.keyboard.press('ControlOrMeta+B');
  await expect(page.locator('.bke-block b, .bke-block strong')).toHaveText('test');
  await page.keyboard.press('ControlOrMeta+Z');
  await expect(page.locator('.bke-block b, .bke-block strong')).toHaveCount(0);
  await page.keyboard.press('ControlOrMeta+Shift+Z');
  await expect(page.locator('.bke-block b, .bke-block strong')).toHaveText('test');
});
