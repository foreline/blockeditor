'use strict';

import {CodeBlock} from '../src/blocks/CodeBlock.js';
import {ContentSerializer} from '../src/ContentSerializer.js';

beforeAll(() => { document.createElement = global._originalCreateElement; delete document.body; });
beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText: jest.fn().mockResolvedValue(undefined)}});
});
afterEach(() => { jest.runOnlyPendingTimers(); jest.useRealTimers(); document.body.innerHTML = ''; });

function mount() {
    const block = new CodeBlock('original');
    const element = block.renderToElement();
    document.body.appendChild(element);
    return {block, element, button: element.querySelector('.bke-code-copy')};
}

test('copies current code, preserving whitespace, line wrappers and HTML characters', async () => {
    const {element, button} = mount();
    element.querySelector('code').innerHTML = '<span>echo &lt;value&gt;</span><div>\tsecond &amp; third</div><div><br></div>';
    expect(button).not.toBeNull();
    button.click();
    await Promise.resolve();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('echo <value>\n\tsecond & third\n');
    expect(button.textContent).toBe('Copied');
    expect(button.disabled).toBe(false);
    jest.runOnlyPendingTimers();
    expect(button.textContent).toBe('Copy code');
});

test('clipboard rejection is visible, does not claim success, and permits retry', async () => {
    const {button} = mount();
    navigator.clipboard.writeText.mockRejectedValueOnce(new Error('denied'));
    button.click(); await Promise.resolve();
    expect(button.textContent).toBe('Could not copy');
    expect(button.disabled).toBe(false);
    button.click(); await Promise.resolve();
    expect(button.textContent).toBe('Copied');
});

test('unavailable clipboard produces actionable feedback', async () => {
    Object.defineProperty(navigator, 'clipboard', {configurable: true, value: undefined});
    const {button} = mount();
    button.click(); await Promise.resolve();
    expect(button.title).toContain('select the code');
    expect(button.textContent).toBe('Could not copy');
});

test('copy controls are non-editable, do not submit forms or enter exported content', () => {
    const {block, element, button} = mount();
    expect(button.type).toBe('button');
    expect(element.querySelector('.bke-code-actions').getAttribute('contenteditable')).toBe('false');
    element.querySelector('code').textContent = 'echo ok';
    expect(block.toMarkdown()).toBe('```\necho ok\n```');
    const area = document.createElement('div'); area.appendChild(element);
    expect(new ContentSerializer().getMarkdown(area)).toBe('```\necho ok\n```');
    expect(new ContentSerializer().getHtml(area)).not.toContain('Copy');
});
