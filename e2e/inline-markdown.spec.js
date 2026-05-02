import { test, expect } from '@playwright/test';

/**
 * BlockEditor — Inline Markdown Replacement E2E Tests
 *
 * Verifies that typing inline markdown patterns (e.g., **bold**, *italic*,
 * `code`) inside blocks triggers live formatting replacement.
 */
test.describe('BlockEditor — Inline Markdown Replacements', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/test-page.html');
        await page.waitForFunction(() => window.editorReady === true, { timeout: 10000 });
    });

    // -- Bold --------------------------------------------------------

    test('**text** becomes bold', async ({ page }) => {
        const block = page.locator('[contenteditable="true"]').first();
        await block.click();
        await page.keyboard.type('hello **world**');
        await page.waitForTimeout(300);

        const strong = block.locator('strong');
        await expect(strong).toBeVisible();
        await expect(strong).toHaveText('world');
    });

    test('__text__ becomes bold', async ({ page }) => {
        const block = page.locator('[contenteditable="true"]').first();
        await block.click();
        await page.keyboard.type('hello __world__');
        await page.waitForTimeout(300);

        const strong = block.locator('strong');
        await expect(strong).toBeVisible();
        await expect(strong).toHaveText('world');
    });

    // -- Italic ------------------------------------------------------

    test('*text* becomes italic', async ({ page }) => {
        const block = page.locator('[contenteditable="true"]').first();
        await block.click();
        await page.keyboard.type('hello *world*');
        await page.waitForTimeout(300);

        const em = block.locator('em');
        await expect(em).toBeVisible();
        await expect(em).toHaveText('world');
    });

    test('_text_ becomes italic', async ({ page }) => {
        const block = page.locator('[contenteditable="true"]').first();
        await block.click();
        await page.keyboard.type('hello _world_');
        await page.waitForTimeout(300);

        const em = block.locator('em');
        await expect(em).toBeVisible();
        await expect(em).toHaveText('world');
    });

    // -- Inline code -------------------------------------------------

    test('`text` becomes inline code', async ({ page }) => {
        const block = page.locator('[contenteditable="true"]').first();
        await block.click();
        await page.keyboard.type('use `console.log()` here');
        await page.waitForTimeout(300);

        const code = block.locator('code');
        await expect(code).toBeVisible();
        await expect(code).toHaveText('console.log()');
    });

    // -- Strikethrough -----------------------------------------------

    test('~~text~~ becomes strikethrough', async ({ page }) => {
        const block = page.locator('[contenteditable="true"]').first();
        await block.click();
        await page.keyboard.type('hello ~~world~~');
        await page.waitForTimeout(300);

        const del = block.locator('del');
        await expect(del).toBeVisible();
        await expect(del).toHaveText('world');
    });

    // -- No false positives ------------------------------------------

    test('unclosed **text does not trigger bold', async ({ page }) => {
        const block = page.locator('[contenteditable="true"]').first();
        await block.click();
        await page.keyboard.type('hello **world foo');
        await page.waitForTimeout(300);

        const strong = block.locator('strong');
        await expect(strong).toHaveCount(0);
    });

    test('snake_case_name does not trigger italic', async ({ page }) => {
        const block = page.locator('[contenteditable="true"]').first();
        await block.click();
        await page.keyboard.type('variable snake_case_name here');
        await page.waitForTimeout(300);

        const em = block.locator('em');
        await expect(em).toHaveCount(0);
    });

    // -- Continuation after formatting -------------------------------

    test('can continue typing after bold formatting', async ({ page }) => {
        const block = page.locator('[contenteditable="true"]').first();
        await block.click();
        await page.keyboard.type('**bold**');
        await page.waitForTimeout(300);

        // Continue typing after the formatted word
        await page.keyboard.type(' more text');
        await page.waitForTimeout(200);

        await expect(block).toContainText('bold');
        await expect(block).toContainText('more text');
    });
});
