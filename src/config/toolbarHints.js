'use strict';

/** Only implemented keyboard commands and supported Markdown input hints. */
export function toolbarHint(action, locale = 'en') {
    const ru = locale === 'ru';
    const modifier = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';
    const keys = { undo: `${modifier}+Z`, redo: `${modifier}+Shift+Z`, bold: `${modifier}+B`, italic: `${modifier}+I`, underline: `${modifier}+U` };
    if (keys[action]) return keys[action];
    const markdown = { ul: '- ', ol: '1. ', sq: '[ ] ', code: '```', inline: ru ? '`код`' : '`code`' };
    if (markdown[action]) return 'Markdown: ' + markdown[action].replace(/ $/, ru ? ' + пробел' : ' + Space');
    if (/^header[1-6]$/.test(action)) return 'Markdown: ' + '#'.repeat(Number(action.slice(-1))) + (ru ? ' + пробел' : ' + Space');
    return ({
        strikethrough: ru ? 'Markdown: ~~текст~~' : 'Markdown: ~~text~~',
        table: ru ? 'Tab — следующая ячейка' : 'Tab — next cell',
        btn: ru ? 'Markdown: # + пробел' : 'Markdown: # + Space',
        link: ru ? 'Выделите текст; Enter — применить, Escape — закрыть' : 'Select text; Enter applies, Escape closes',
        help: ru ? 'Советы и Markdown; Escape — закрыть' : 'Tips and Markdown; Escape closes',
        pin: ru ? 'Оставить панель видимой при прокрутке' : 'Keep the toolbar visible while scrolling'
    })[action] || '';
}
