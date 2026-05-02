'use strict';

import { InlineMarkdownHandler } from '../src/InlineMarkdownHandler.js';

// Keep output clean
jest.mock('../src/utils/log.js');

describe('InlineMarkdownHandler', () => {
    let handler;
    let mockEditor;

    // The global setup.js replaces DOM primitives with mock objects.
    // InlineMarkdownHandler needs real jsdom DOM nodes (TreeWalker, etc.),
    // so we restore the originals for these tests.
    const savedCreateElement = global.document.createElement;
    const savedCreateTextNode = global.document.createTextNode;
    const savedBody = global.document.body;

    beforeAll(() => {
        global.document.createElement = global._originalCreateElement;
        global.document.createTextNode = global._originalCreateTextNode;
        // Delete the own data property to restore jsdom's prototype accessor
        delete global.document.body;
    });

    afterAll(() => {
        global.document.createElement = savedCreateElement;
        global.document.createTextNode = savedCreateTextNode;
        Object.defineProperty(global.document, 'body', {
            value: savedBody,
            writable: true,
            configurable: true,
        });
    });

    beforeEach(() => {
        mockEditor = { update: jest.fn() };
        handler = new InlineMarkdownHandler(mockEditor);
    });

    /**
     * Helper: create a contenteditable block element with the given text.
     */
    function createBlock(text, blockType = 'p') {
        const block = document.createElement('div');
        block.className = `bke-block bke-block--${blockType}`;
        block.setAttribute('data-block-type', blockType);
        block.setAttribute('contenteditable', 'true');
        block.textContent = text;
        document.body.appendChild(block);
        return block;
    }

    afterEach(() => {
        document.body.innerHTML = '';
    });

    // ── Bold (**) ──────────────────────────────────────────────────

    describe('bold (**)', () => {
        test('converts **text** to <strong>text</strong>', () => {
            const block = createBlock('hello **world** foo');
            const result = handler.checkAndApply(block);

            expect(result).toBe(true);
            const strong = block.querySelector('strong');
            expect(strong).not.toBeNull();
            expect(strong.textContent).toBe('world');
            expect(block.textContent).toBe('hello world foo');
        });

        test('converts **text** at start of line', () => {
            const block = createBlock('**bold** text');
            handler.checkAndApply(block);

            const strong = block.querySelector('strong');
            expect(strong).not.toBeNull();
            expect(strong.textContent).toBe('bold');
        });

        test('converts **text** at end of line', () => {
            const block = createBlock('text **bold**');
            handler.checkAndApply(block);

            const strong = block.querySelector('strong');
            expect(strong).not.toBeNull();
            expect(strong.textContent).toBe('bold');
        });

        test('does not convert unclosed **text', () => {
            const block = createBlock('hello **world foo');
            const result = handler.checkAndApply(block);

            expect(result).toBe(false);
            expect(block.querySelector('strong')).toBeNull();
        });
    });

    // ── Bold (__) ──────────────────────────────────────────────────

    describe('bold (__)', () => {
        test('converts __text__ to <strong>text</strong>', () => {
            const block = createBlock('hello __world__ foo');
            handler.checkAndApply(block);

            const strong = block.querySelector('strong');
            expect(strong).not.toBeNull();
            expect(strong.textContent).toBe('world');
        });

        test('does not convert unclosed __text', () => {
            const block = createBlock('hello __world foo');
            const result = handler.checkAndApply(block);
            expect(result).toBe(false);
        });
    });

    // ── Italic (*) ─────────────────────────────────────────────────

    describe('italic (*)', () => {
        test('converts *text* to <em>text</em>', () => {
            const block = createBlock('hello *world* foo');
            handler.checkAndApply(block);

            const em = block.querySelector('em');
            expect(em).not.toBeNull();
            expect(em.textContent).toBe('world');
        });

        test('does not convert **bold** as italic', () => {
            const block = createBlock('hello **bold** foo');
            handler.checkAndApply(block);

            // Should be converted as bold, not italic
            expect(block.querySelector('strong')).not.toBeNull();
            expect(block.querySelector('em')).toBeNull();
        });

        test('does not convert unclosed *text', () => {
            const block = createBlock('hello *world foo');
            const result = handler.checkAndApply(block);
            expect(result).toBe(false);
        });
    });

    // ── Italic (_) ─────────────────────────────────────────────────

    describe('italic (_)', () => {
        test('converts _text_ to <em>text</em>', () => {
            const block = createBlock('hello _world_ foo');
            handler.checkAndApply(block);

            const em = block.querySelector('em');
            expect(em).not.toBeNull();
            expect(em.textContent).toBe('world');
        });

        test('does not convert snake_case_name (mid-word underscores)', () => {
            const block = createBlock('hello snake_case_name foo');
            const result = handler.checkAndApply(block);
            expect(result).toBe(false);
        });

        test('does not convert __bold__ as italic', () => {
            const block = createBlock('hello __bold__ foo');
            handler.checkAndApply(block);

            expect(block.querySelector('strong')).not.toBeNull();
            expect(block.querySelector('em')).toBeNull();
        });
    });

    // ── Inline code (`) ────────────────────────────────────────────

    describe('inline code (`)', () => {
        test('converts `text` to <code>text</code>', () => {
            const block = createBlock('use `console.log()` for debugging');
            handler.checkAndApply(block);

            const code = block.querySelector('code');
            expect(code).not.toBeNull();
            expect(code.textContent).toBe('console.log()');
        });

        test('does not convert unclosed `text', () => {
            const block = createBlock('hello `world foo');
            const result = handler.checkAndApply(block);
            expect(result).toBe(false);
        });

        test('does not convert triple backticks as inline code', () => {
            const block = createBlock('```not code```');
            // Triple backticks are for code blocks, not inline code.
            // The regex (?<!`)`(?!`) prevents matching ` that are adjacent to other backticks.
            const result = handler.checkAndApply(block);
            expect(result).toBe(false);
        });
    });

    // ── Strikethrough (~~) ─────────────────────────────────────────

    describe('strikethrough (~~)', () => {
        test('converts ~~text~~ to <del>text</del>', () => {
            const block = createBlock('hello ~~world~~ foo');
            handler.checkAndApply(block);

            const del = block.querySelector('del');
            expect(del).not.toBeNull();
            expect(del.textContent).toBe('world');
        });

        test('does not convert unclosed ~~text', () => {
            const block = createBlock('hello ~~world foo');
            const result = handler.checkAndApply(block);
            expect(result).toBe(false);
        });
    });

    // ── Code blocks are excluded ───────────────────────────────────

    describe('code block exclusion', () => {
        test('does not format inside code blocks', () => {
            const block = createBlock('**bold** text', 'code');
            const result = handler.checkAndApply(block);

            expect(result).toBe(false);
            expect(block.querySelector('strong')).toBeNull();
        });
    });

    // ── Already-formatted content ──────────────────────────────────

    describe('already-formatted content', () => {
        test('does not re-format text inside <strong>', () => {
            const block = document.createElement('div');
            block.className = 'bke-block bke-block--p';
            block.setAttribute('data-block-type', 'p');
            block.setAttribute('contenteditable', 'true');

            const strong = document.createElement('strong');
            strong.textContent = '**already bold**';
            block.appendChild(strong);
            document.body.appendChild(block);

            const result = handler.checkAndApply(block);
            expect(result).toBe(false);
        });

        test('does not re-format text inside <em>', () => {
            const block = document.createElement('div');
            block.className = 'bke-block bke-block--p';
            block.setAttribute('data-block-type', 'p');
            block.setAttribute('contenteditable', 'true');

            const em = document.createElement('em');
            em.textContent = '*already italic*';
            block.appendChild(em);
            document.body.appendChild(block);

            const result = handler.checkAndApply(block);
            expect(result).toBe(false);
        });

        test('does not re-format text inside <code>', () => {
            const block = document.createElement('div');
            block.className = 'bke-block bke-block--p';
            block.setAttribute('data-block-type', 'p');
            block.setAttribute('contenteditable', 'true');

            const code = document.createElement('code');
            code.textContent = '`already code`';
            block.appendChild(code);
            document.body.appendChild(block);

            const result = handler.checkAndApply(block);
            expect(result).toBe(false);
        });
    });

    // ── Text preservation ──────────────────────────────────────────

    describe('text preservation', () => {
        test('preserves text before and after the pattern', () => {
            const block = createBlock('before **bold** after');
            handler.checkAndApply(block);

            expect(block.textContent).toBe('before bold after');
            expect(block.querySelector('strong').textContent).toBe('bold');
        });

        test('handles pattern as only content', () => {
            const block = createBlock('**bold**');
            handler.checkAndApply(block);

            expect(block.querySelector('strong').textContent).toBe('bold');
        });
    });

    // ── No marker characters → early exit ──────────────────────────

    describe('early exit optimization', () => {
        test('returns false quickly for text without marker chars', () => {
            const block = createBlock('just plain text here');
            const result = handler.checkAndApply(block);
            expect(result).toBe(false);
        });
    });

    // ── Heading blocks should also get inline formatting ───────────

    describe('non-paragraph blocks', () => {
        test('applies inline formatting inside heading blocks', () => {
            const block = document.createElement('div');
            block.className = 'bke-block bke-block--h1';
            block.setAttribute('data-block-type', 'h1');

            const h1 = document.createElement('h1');
            h1.setAttribute('contenteditable', 'true');
            h1.textContent = 'Hello **World**';
            block.appendChild(h1);
            document.body.appendChild(block);

            const result = handler.checkAndApply(block);
            expect(result).toBe(true);
            expect(h1.querySelector('strong').textContent).toBe('World');
        });
    });
});
