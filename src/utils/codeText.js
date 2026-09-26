'use strict';

/** Read code independently of layout, including browser-created line wrappers. */
export function getCodeText(element) {
    if (!element) return '';
    if (!element.childNodes) return element.textContent || '';

    const read = node => {
        if (node.nodeType === 3) return node.textContent || '';
        if (node.nodeName === 'BR') return '\n';
        const children = Array.from(node.childNodes || []);
        // An otherwise empty line has a browser caret placeholder, not two breaks.
        if (/^(P|DIV)$/.test(node.nodeName) && children.length === 1 && children[0].nodeName === 'BR') {
            return '';
        }
        return children.map((child, index) => {
            const startsLine = /^(P|DIV)$/.test(child.nodeName);
            const followsLine = index > 0 && /^(P|DIV)$/.test(children[index - 1].nodeName);
            return (index > 0 && (startsLine || followsLine) ? '\n' : '') + read(child);
        }).join('');
    };
    return read(element);
}
