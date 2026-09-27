# BlockEditor Library

A modern JavaScript WYSIWYG editor with block-based architecture.

## Installation

```bash
npm install @foreline/blockeditor
```

## Quick Start

### ES Modules (Recommended)

```javascript
import Editor from '@foreline/blockeditor';
import '@foreline/blockeditor/css'; // Import styles

// Create editor instance
const editor = new Editor({
    id: 'my-editor' // ID of the container element
});
```

### CommonJS

```javascript
const Editor = require('@foreline/blockeditor');
require('@foreline/blockeditor/css'); // Import styles

// Create editor instance
const editor = new Editor({
    id: 'my-editor'
});
```

### HTML Setup

```html
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="node_modules/@foreline/blockeditor/dist/style.css">
</head>
<body>
    <div id="my-editor"></div>
    
    <script type="module">
        import Editor from './node_modules/@foreline/blockeditor/dist/blockeditor.es.js';
        
        const editor = new Editor({
            id: 'my-editor'
        });
    </script>
</body>
</html>
```

## Configuration Options

```javascript
const editor = new Editor({
    id: 'my-editor',           // Required: Container element ID
    placeholder: 'Start writing...', // Placeholder text
    debug: false,              // Enable debug mode
    autofocus: true,          // Auto-focus on creation
    readonly: false,          // Make editor read-only
    editable: true,           // Start in edit mode; false starts in view mode
    viewOnBlur: false,        // Return to view mode when focus leaves (default: false)
    autoLink: true,           // Link completed URLs on typing/paste/load (default)
    minHeight: '200px',       // Minimum height
    maxHeight: '500px',       // Maximum height
    toolbar: true,            // Enable default toolbar (true/false or config object)
    markdown: '# Hello World', // Initial markdown content
    html: '<h1>Hello World</h1>' // Initial HTML content
});
```

Use `editor.setEditable(false)` to let readers select text and follow links. The
toolbar stays visible with its buttons disabled. Clicking ordinary editor text
resumes editing without remounting; link clicks still open the destination in a
new tab. Set `viewOnBlur: true` to return to view mode when focus leaves the
editor. Listen to `editor.editable.changed` for mode changes.
`editor.isEditable` reports the current mode. `readonly: true` is a fixed
read-only instance; it cannot be switched into editing. In edit mode, clicking
a link opens a small menu to open, edit, or remove it. Set `autoLink: false` to
leave plain URLs as text; explicit Markdown links still render normally.

### Toolbar Configuration

The toolbar can be configured in several ways:

```javascript
// 1. Default toolbar (recommended)
const editor = new Editor({
    id: 'my-editor',
    toolbar: true  // or omit this property
});

// 2. Disable toolbar
const editor = new Editor({
    id: 'my-editor',
    toolbar: false
});

// 3. Custom toolbar as array
const editor = new Editor({
    id: 'my-editor',
    toolbar: [
        {
            group: [
                { class: 'editor-toolbar-bold', icon: 'fa-bold', title: 'Bold' },
                { class: 'editor-toolbar-italic', icon: 'fa-italic', title: 'Italic' }
            ]
        },
        {
            group: [
                { class: 'editor-toolbar-ul', icon: 'fa-list', title: 'List' },
                { class: 'editor-toolbar-code', icon: 'fa-code', title: 'Code' }
            ]
        }
    ]
});

// 4. Custom toolbar as config object
const editor = new Editor({
    id: 'my-editor',
    toolbar: {
        config: [
            {
                group: [
                    { class: 'editor-toolbar-bold', icon: 'fa-bold', title: 'Bold' },
                    { class: 'editor-toolbar-italic', icon: 'fa-italic', title: 'Italic' }
                ]
            }
        ]
    }
});
```

#### Available Toolbar Buttons

The following toolbar buttons are available:

**History:**
- `editor-toolbar-undo` - Undo action
- `editor-toolbar-redo` - Redo action

**Headers (typically in dropdown):**
- `editor-toolbar-header1` to `editor-toolbar-header6` - Headers H1-H6
- `editor-toolbar-paragraph` - Paragraph text

**Text Formatting:**
- `editor-toolbar-bold` - Bold text
- `editor-toolbar-italic` - Italic text
- `editor-toolbar-underline` - Underlined text
- `editor-toolbar-strikethrough` - Strikethrough text

**Lists:**
- `editor-toolbar-ul` - Unordered list
- `editor-toolbar-ol` - Ordered list
- `editor-toolbar-sq` - Task list (checkboxes)

**Blocks:**
- `editor-toolbar-code` - Code block
- `editor-toolbar-table` - Table
- `editor-toolbar-image` - Image

**View modes:**
- `editor-toolbar-text` - Text view
- `editor-toolbar-markdown` - Markdown view
- `editor-toolbar-html` - HTML view

## API Reference

### Editor Methods

```javascript
// Content methods
editor.getMarkdown();         // Get content as markdown
editor.getHtml();            // Get content as HTML
editor.setMarkdown(md);      // Set content from markdown
editor.setHtml(html);        // Set content from HTML
editor.clear();              // Clear all content

// Control methods
editor.focus();              // Focus the editor
editor.blur();               // Remove focus
editor.destroy();            // Destroy editor instance

// Event methods
editor.on('change', callback);    // Listen to content changes
editor.off('change', callback);   // Remove event listener
editor.emit('custom-event', data); // Emit custom event
```

### Static Methods

```javascript
// Instance management
Editor.getInstance(id);       // Get editor instance by ID
Editor.getAllInstances();     // Get all editor instances
Editor.destroyInstance(id);   // Destroy specific instance
```

### Events

```javascript
editor.on('ready', () => {
    console.log('Editor is ready');
});

editor.on('change', (data) => {
    console.log('Content changed:', data);
});

editor.on('focus', () => {
    console.log('Editor focused');
});

editor.on('blur', () => {
    console.log('Editor blurred');
});

editor.on('block:add', (block) => {
    console.log('Block added:', block);
});

editor.on('block:remove', (block) => {
    console.log('Block removed:', block);
});
```

## Block Types

The editor supports various block types:

- **Paragraph** - Regular text content
- **Headings** - H1 through H6
- **Lists** - Ordered and unordered lists
- **Task Lists** - Interactive checkboxes
- **Quotes** - Blockquotes
- **Code** - Syntax-highlighted code blocks
- **Tables** - Markdown tables with editing
- **Images** - Drag & drop image support
- **Delimiters** - Horizontal rules

## Styling

### CSS Files

The library provides separate CSS files for different purposes:

```javascript
// All styles (recommended)
import '@foreline/blockeditor/css';

// Individual stylesheets
import '@foreline/blockeditor/css/editor';  // Core editor styles
import '@foreline/blockeditor/css/prism';   // Syntax highlighting
```

### Custom Themes

You can override CSS variables to customize the appearance:

```css
.editor {
    --editor-font-family: 'Your Font', sans-serif;
    --editor-font-size: 16px;
    --editor-line-height: 1.6;
    --editor-border-color: #e1e5e9;
    --editor-focus-color: #007bff;
}
```

## Dependencies

The library depends on these packages (install them separately):

```bash
npm install @fortawesome/fontawesome-free @popperjs/core bootstrap prismjs showdown
```

## TypeScript Support

TypeScript definitions are included:

```typescript
import Editor, { EditorOptions, BlockData } from '@foreline/blockeditor';

const options: EditorOptions = {
    id: 'my-editor',
    placeholder: 'Start writing...'
};

const editor = new Editor(options);
```

## Browser Support

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## License

MIT License - see LICENSE file for details.
