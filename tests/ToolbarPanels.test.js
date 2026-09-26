'use strict';
import { URL as NativeURL } from 'node:url';
import { ToolbarPanels } from '../src/ToolbarPanels.js';
import { KeyHandler } from '../src/KeyHandler.js';

beforeAll(() => { global.URL = NativeURL; document.createElement = global._originalCreateElement; });

test.each(['https://example.com', 'http://example.com/a', 'mailto:test@example.com', 'tel:+123', '/guide', '#section', '../path'])('link address accepts %s', url => {
    expect(ToolbarPanels.isSafeUrl(url)).toBe(true);
});
test.each(['', 'javascript:alert(1)', 'data:text/html,hi', 'vbscript:msgbox(1)', 'java\nscript:alert(1)', 'https://exa mple.com'])('link address rejects %s', url => {
    expect(ToolbarPanels.isSafeUrl(url)).toBe(false);
});

test('deletion targets the last task text, and forward deletion targets the first', () => {
    const block = document.createElement('div');
    block.dataset.blockType = 'sq';
    block.innerHTML = '<ul><li><input type="checkbox"><span contenteditable="true">First</span></li><li><input type="checkbox"><span contenteditable="true">Last</span></li></ul>';
    const editor = { setCurrentBlock: jest.fn(), placeCursorAtEnd: jest.fn(), placeCursorAtStart: jest.fn() };
    const handler = new KeyHandler(editor);
    handler.focusDeletionBoundary(block, true);
    expect(editor.placeCursorAtEnd).toHaveBeenCalledWith(block.querySelectorAll('span')[1]);
    handler.focusDeletionBoundary(block, false);
    expect(editor.placeCursorAtStart).toHaveBeenCalledWith(block.querySelector('span'));
});

test.each(['image', 'delimiter'])('deletion preserves an editable boundary beside %s', type => {
    const block = document.createElement('div');
    block.dataset.blockType = type;
    const editor = { setCurrentBlock: jest.fn() };
    expect(new KeyHandler(editor).focusDeletionBoundary(block, true)).toBe(false);
    expect(editor.setCurrentBlock).not.toHaveBeenCalled();
});

test('link actions restore nested scrolling even if the editing command throws', () => {
    const outer = document.createElement('div');
    const area = document.createElement('div');
    outer.appendChild(area);
    outer.scrollTop = 240; area.scrollLeft = 35;
    const scroll = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const context = { toolbar: { editorInstance: { contentArea: area } } };
    expect(() => ToolbarPanels.prototype.preserveScroll.call(context, () => {
        outer.scrollTop = 0; area.scrollLeft = 0;
        throw new Error('editing failed');
    })).toThrow('editing failed');
    expect(outer.scrollTop).toBe(240);
    expect(area.scrollLeft).toBe(35);
    expect(scroll).toHaveBeenCalledWith({ left: window.scrollX, top: window.scrollY, behavior: 'instant' });
    scroll.mockRestore();
});
