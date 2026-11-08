'use strict';

/** Copy only code text; feedback never changes the block's editable content. */
export function createCodeCopyButton(getText) {
    const ru = (document.documentElement.lang || '').toLowerCase().startsWith('ru');
    const labels = ru
        ? {copy: 'Копировать код', copied: 'Скопировано', failed: 'Не удалось скопировать', help: 'Выделите код и скопируйте вручную.'}
        : {copy: 'Copy code', copied: 'Copied', failed: 'Could not copy', help: 'Please select the code and copy it manually.'};
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'bke-code-copy';
    button.textContent = labels.copy;
    button.title = labels.copy;
    button.setAttribute('aria-live', 'polite');
    let timer;
    button.addEventListener('mousedown', event => event.preventDefault());
    button.addEventListener('keydown', event => event.stopPropagation());
    button.addEventListener('click', async event => {
        event.preventDefault();
        event.stopPropagation();
        clearTimeout(timer);
        button.disabled = true;
        try {
            if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
            await navigator.clipboard.writeText(getText());
            button.textContent = labels.copied;
            button.title = labels.copied;
        } catch {
            button.textContent = labels.failed;
            button.title = labels.help;
        } finally {
            button.disabled = false;
            timer = setTimeout(() => {
                button.textContent = labels.copy;
                button.title = labels.copy;
            }, 2500);
        }
    });
    return button;
}
