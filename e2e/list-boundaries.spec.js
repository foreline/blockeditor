'use strict';

import {test, expect} from '@playwright/test';

async function setBlocks(page, html) {
    await page.goto('/');
    await page.evaluate(value => window.editor.transaction(() => {
        window.editor.contentArea.innerHTML = value;
        window.editor.setCurrentBlock(window.editor.contentArea.querySelector('.bke-block'));
    }), html);
}

for (const type of ['ul', 'ol', 'sq']) {
    test(`selected paragraphs become one ${type} list`, async ({page}) => {
        await setBlocks(page, ['First <strong>bold</strong>', 'Second', 'Third'].map(text =>
            `<div class="bke-block bke-block--p" data-block-type="paragraph" contenteditable="true">${text}</div>`).join(''));
        await page.evaluate(() => {
            const blocks = window.editor.contentArea.querySelectorAll('.bke-block');
            const range = document.createRange();
            range.setStart(blocks[0].firstChild, 2);
            range.setEnd(blocks[2].firstChild, 3);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        });
        await page.locator(`.bke-toolbar-${type}`).click();
        await expect(page.locator('.bke-content-area > .bke-block')).toHaveCount(1);
        await expect(page.locator('.bke-content-area > .bke-block')).toHaveAttribute('data-block-type', type);
        await expect(page.locator('.bke-content-area li')).toHaveText(['First bold', 'Second', 'Third']);
        await expect(page.locator('.bke-content-area li:first-child strong')).toHaveText('bold');
        await page.keyboard.type('!');
        await expect(page.locator('.bke-content-area li:last-child')).toHaveText('Third!');
    });

    test(`Backspace merges a paragraph into the last ${type} item`, async ({page}) => {
        const item = type === 'sq'
            ? '<li class="bke-task-list-item"><input type="checkbox"><span contenteditable="true">Task</span></li>'
            : '<li contenteditable="true">Task</li>';
        const list = type === 'ol' ? 'ol' : 'ul';
        await setBlocks(page, `<div class="bke-block" data-block-type="${type}" contenteditable="false"><${list}>${item}</${list}></div><div class="bke-block" data-block-type="paragraph" contenteditable="true"><strong>next</strong></div>`);
        await page.locator('.bke-content-area > .bke-block').last().click();
        await page.keyboard.press('Home');
        await page.keyboard.press('Backspace');
        await expect(page.locator('.bke-content-area > .bke-block')).toHaveCount(1);
        await expect(page.locator('.bke-content-area li')).toHaveText('Tasknext');
        await expect(page.locator('.bke-content-area li strong')).toHaveText('next');
        await page.keyboard.type('!');
        await expect(page.locator('.bke-content-area li')).toHaveText('Task!next');
    });

    test(`Backspace turns a lone empty ${type} item into a paragraph`, async ({page}) => {
        const item = type === 'sq'
            ? '<li class="bke-task-list-item"><input type="checkbox"><span contenteditable="true"><br></span></li>'
            : '<li contenteditable="true"><br></li>';
        const list = type === 'ol' ? 'ol' : 'ul';
        await setBlocks(page, `<div class="bke-block" data-block-type="${type}" contenteditable="false"><${list}>${item}</${list}></div>`);
        await page.locator(type === 'sq' ? '.bke-task-list-item span' : '.bke-content-area li').click();
        await page.keyboard.press('Backspace');
        await expect(page.locator('.bke-content-area > .bke-block')).toHaveAttribute('data-block-type', 'paragraph');
        await page.keyboard.type('Text');
        await expect(page.locator('.bke-content-area > .bke-block')).toHaveText('Text');
    });
}

test('a leading rule has a paragraph above it and Backspace after it removes the rule', async ({page}) => {
    await page.goto('/');
    await page.locator('.bke-block').first().click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('---');
    await expect(page.locator('.bke-content-area > .bke-block')).toHaveCount(3);
    await expect(page.locator('.bke-content-area > .bke-block').first()).toHaveAttribute('data-block-type', 'paragraph');
    await page.locator('.bke-content-area > .bke-block').first().click();
    await page.keyboard.type('Before');
    await expect(page.locator('.bke-content-area > .bke-block').first()).toHaveText('Before');
    await page.locator('.bke-content-area > .bke-block').last().click();
    await page.keyboard.press('Backspace');
    await expect(page.locator('[data-block-type="delimiter"]')).toHaveCount(0);
});

test('initial content beginning with a rule leaves an editable paragraph above it', async ({page}) => {
    await page.goto('/');
    await page.evaluate(() => {
        const mount = document.createElement('div');
        mount.id = 'leading-rule-editor';
        document.body.appendChild(mount);
        const EditorClass = window.editor.constructor;
        window.leadingRuleEditor = new EditorClass({id: mount.id, text: '---\n\nAfter'});
    });
    await expect(page.locator('#leading-rule-editor .bke-content-area > .bke-block').first()).toHaveAttribute('data-block-type', 'paragraph');
    await page.locator('#leading-rule-editor .bke-content-area > .bke-block').first().click();
    await page.keyboard.type('Before');
    await expect(page.locator('#leading-rule-editor .bke-content-area > .bke-block').first()).toHaveText('Before');
});

for (const [type, body, selector] of [
    ['paragraph', 'Before', null],
    ['h2', '<h2 contenteditable="true">Before</h2>', 'h2'],
    ['quote', '<blockquote contenteditable="true">Before</blockquote>', 'blockquote'],
    ['code', '<pre><code contenteditable="true">Before</code></pre>', 'code'],
    ['table', '<table><tr><td contenteditable="true">Before</td></tr></table>', 'td']
]) {
    test(`Backspace merges paragraph text into preceding ${type}`, async ({page}) => {
        await setBlocks(page, `<div class="bke-block" data-block-type="${type}" contenteditable="${type === 'paragraph'}">${body}</div><div class="bke-block" data-block-type="paragraph" contenteditable="true">after</div>`);
        await page.locator('.bke-content-area > .bke-block').last().click();
        await page.keyboard.press('Home');
        await page.keyboard.press('Backspace');
        await expect(page.locator('.bke-content-area > .bke-block')).toHaveCount(1);
        const block = page.locator('.bke-content-area > .bke-block');
        await expect(selector ? block.locator(selector) : block).toHaveText('Beforeafter');
    });
}
