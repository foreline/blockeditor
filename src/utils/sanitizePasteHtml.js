'use strict';

// Rebuild clipboard markup in an inert document. Only editor-supported HTML
// and attributes survive; browser parsing handles entities and unquoted values.
export function sanitizePasteHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const allowed = new Set('p div span br hr h1 h2 h3 h4 h5 h6 strong b em i u s del strike code pre blockquote ul ol li table thead tbody tfoot tr th td a img input'.split(' '));
    const discard = new Set('script style iframe object embed template svg math form'.split(' '));
    const attributes = {
        a: ['href', 'title'], img: ['src', 'alt', 'title', 'width', 'height'],
        input: ['type', 'checked'], ol: ['start'], li: ['value'],
        th: ['colspan', 'rowspan'], td: ['colspan', 'rowspan']
    };
    const clean = node => {
        for (const child of Array.from(node.childNodes)) {
            if (child.nodeType === 3) continue;
            if (child.nodeType !== 1) { child.remove(); continue; }
            const tag = child.localName;
            if (discard.has(tag) || child.namespaceURI !== 'http://www.w3.org/1999/xhtml') {
                child.remove();
                continue;
            }
            clean(child);
            if (!allowed.has(tag)) { child.replaceWith(...child.childNodes); continue; }
            if (tag === 'input' && child.getAttribute('type')?.toLowerCase() !== 'checkbox') {
                child.remove();
                continue;
            }
            for (const attr of Array.from(child.attributes)) {
                const name = attr.name;
                if (name === 'class') {
                    const classes = attr.value.split(/\s+/).filter(value => /^(?:language-[\w-]+|bke-task-list|bke-task-list-item|bke-task-completed)$/.test(value));
                    child.setAttribute(name, classes.join(' '));
                } else if (!(attributes[tag] || []).includes(name)) {
                    child.removeAttribute(name);
                } else if (name === 'href' || name === 'src') {
                    const value = attr.value.replace(/[\u0000-\u0020\u007f]/g, '');
                    if (/^[a-z][a-z\d+.-]*:/i.test(value) && !/^(https?:|mailto:|tel:)/i.test(value)) {
                        child.removeAttribute(name);
                    }
                }
            }
        }
    };
    clean(doc.body);
    return doc.body.innerHTML;
}
