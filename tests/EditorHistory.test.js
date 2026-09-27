import {EditorHistory} from '../src/utils/EditorHistory.js';

test('undo and redo preserve a whole custom paste, including rapid changes', () => {
    let content = '<p>Before</p>';
    const history = new EditorHistory(() => content, html => { content = html; history.record(); });
    content = '<h2>Git</h2><pre><code>git status\n\ngit diff</code></pre>';
    const pasted = content;
    expect(history.move(-1)).toBe(true);
    expect(content).toBe('<p>Before</p>');
    expect(history.move(1)).toBe(true);
    expect(content).toBe(pasted);
    history.move(-1);
    content = '<p>Different edit</p>';
    history.record();
    expect(history.move(1)).toBe(false);
});

test('history is bounded and isolated between editors', () => {
    let content = '0';
    const a = new EditorHistory(() => content, value => { content = value; }, 3);
    const b = new EditorHistory(() => 'other', () => {});
    for (let i = 1; i <= 5; i++) { content = String(i); a.record(); }
    expect(a.states).toEqual(['3', '4', '5']);
    expect(b.move(-1)).toBe(false);
    a.move(-1);
    a.move(-1);
    expect(a.move(-1)).toBe(false);
    expect(content).toBe('3');
});
