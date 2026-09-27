'use strict';

/** Labels for built-in toolbar controls. Configured button titles still take precedence. */
export const toolbarMessages = {
    en: {
        pin: 'Pin toolbar', unpin: 'Unpin toolbar', help: 'Editor help',
        link: 'Insert or edit link', inline: 'Inline code (select text)',
        url: 'Link address', apply: 'Apply', remove: 'Remove link', close: 'Close',
        linkPreview: 'Link', openLink: 'Open link in a new tab', editLink: 'Edit link',
        invalidUrl: 'Enter an http, https, mailto, tel, or relative address.',
        selectText: 'Place the caret in text or select text within one paragraph, list item, or table cell.',
        basics: 'Select text to format it with the toolbar. Use the link button to insert, edit, or remove a link. Enter creates a paragraph or list item; Enter on an empty item exits the list. Use the pin to keep the toolbar visible. Escape closes this help.',
        shortcuts: 'Markdown shortcuts', blockHint: 'At the start of a paragraph (␣ means a space):',
        heading: 'Heading (levels 1–6)', bullet: 'Bulleted list', numbered: 'Numbered list', quote: 'Quote', code: 'Code block', rule: 'Horizontal rule',
        inlineHint: 'Within text:', bold: 'Bold', italic: 'Italic', strike: 'Strikethrough', inlineCode: 'Inline code',
        taskHint: 'Use the checkbox-list button for tasks. Markdown pasted into the editor also supports - [ ] task and [text](https://example.com).'
    },
    ru: {
        pin: 'Закрепить панель', unpin: 'Открепить панель', help: 'Справка редактора',
        link: 'Вставить или изменить ссылку', inline: 'Строчный код (выделите текст)',
        url: 'Адрес ссылки', apply: 'Применить', remove: 'Удалить ссылку', close: 'Закрыть',
        linkPreview: 'Ссылка', openLink: 'Открыть ссылку в новой вкладке', editLink: 'Изменить ссылку',
        invalidUrl: 'Введите адрес http, https, mailto, tel или относительный путь.',
        selectText: 'Установите курсор в тексте или выделите текст в одном абзаце, пункте списка или ячейке таблицы.',
        basics: 'Выделите текст и выберите форматирование на панели. Кнопка ссылки позволяет вставить, изменить или удалить ссылку. Enter создаёт абзац или пункт списка; Enter в пустом пункте завершает список. Закрепите панель, чтобы она оставалась видимой при прокрутке. Escape закрывает справку.',
        shortcuts: 'Сокращения Markdown', blockHint: 'В начале абзаца (␣ обозначает пробел):',
        heading: 'Заголовок (уровни 1–6)', bullet: 'Маркированный список', numbered: 'Нумерованный список', quote: 'Цитата', code: 'Блок кода', rule: 'Горизонтальная линия',
        inlineHint: 'Внутри текста:', bold: 'Жирный', italic: 'Курсив', strike: 'Зачёркнутый', inlineCode: 'Строчный код',
        taskHint: 'Для задач используйте кнопку списка с чекбоксами. При вставке Markdown также поддерживаются - [ ] задача и [текст](https://example.com).'
    }
};
