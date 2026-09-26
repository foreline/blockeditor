/**
 * Default toolbar configuration for BlockEditor.
 * This is pure data — no logic, no imports.
 */
export const defaultToolbarConfig = [
    {
        group: [
            { class: 'bke-toolbar-undo', icon: 'fa-undo', title: 'undo' },
            { class: 'bke-toolbar-redo', icon: 'fa-redo', title: 'redo' }
        ]
    },
    {
        group: [
            { class: 'bke-toolbar-header1', label: 'Header 1' },
            { class: 'bke-toolbar-header2', label: 'Header 2' },
            { class: 'bke-toolbar-header3', label: 'Header 3' },
            { class: 'bke-toolbar-header4', label: 'Header 4' },
            { class: 'bke-toolbar-header5', label: 'Header 5' },
            { class: 'bke-toolbar-header6', label: 'Header 6' },
            { class: 'bke-toolbar-paragraph', label: 'Paragraph' }
        ],
        dropdown: true,
        icon: 'fa-heading',
        id: 'dropdownMenuHeader'
    },
    {
        group: [
            { class: 'bke-toolbar-bold', icon: 'fa-bold', title: 'bold' },
            { class: 'bke-toolbar-italic', icon: 'fa-italic', title: 'italic' },
            { class: 'bke-toolbar-underline', icon: 'fa-underline', title: 'underline' },
            { class: 'bke-toolbar-strikethrough', icon: 'fa-strikethrough', title: 'strikethrough' }
        ]
    },
    {
        group: [
            { class: 'bke-toolbar-ul', icon: 'fa-list', title: 'unordered list' },
            { class: 'bke-toolbar-ol', icon: 'fa-list-ol', title: 'ordered list' },
            { class: 'bke-toolbar-sq', icon: 'fa-list-check', title: 'task list' }
        ]
    },
    {
        group: [
            { class: 'bke-toolbar-table', icon: 'fa-table', title: 'insert table' },
            { class: 'bke-toolbar-image', icon: 'fa-image', title: 'insert image' }
        ]
    },
    {
        group: [
            { class: 'bke-toolbar-inline', icon: 'bke-inline-code', titleKey: 'inline', title: 'Inline code (select text)' },
            { class: 'bke-toolbar-code', icon: 'fa-code', title: 'code block' }
        ]
    },
    {
        group: [
            { class: 'bke-toolbar-text', icon: 'fa-paragraph', title: 'text view', disabled: true },
            { class: 'bke-toolbar-markdown', icon: 'fa-brands fa-markdown', title: 'markdown view' },
            { class: 'bke-toolbar-html', icon: 'fa-brands fa-html5', title: 'html view' }
        ]
    }
];
