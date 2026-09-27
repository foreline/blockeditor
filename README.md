# BlockEditor

WYSIWYG editor built with JavaScript, featuring a comprehensive toolbar and block-based content management system.

**Available as a Universal Library!** Install via npm: `npm install @foreline/blockeditor`

📖 **[Library Documentation](./LIBRARY.md)** - Learn how to use BlockEditor as a library in your projects.

## Features

- **Block-based architecture**: Modular content management with individual block types.
- **Content export**: Export editor content as markdown (`Editor.getMarkdown()`) or HTML (`Editor.getHtml()`).
- **BlockInterface contract**: Consistent behavior across all block types with standardized methods.
- **Comprehensive toolbar**: Text formatting, lists, blockquotes, and code blocks. Pinned by default, with a right-hand pin toggle.
- **Markdown support**: Full markdown parsing and conversion using Showdown.
- **Advanced key handling**: Smart Enter/Backspace behavior for different block types.
- **Clipboard integration**: Paste support with markdown conversion and XSS protection.
- **Block type system**: Support for paragraphs, headings (H1-H6), lists (ul/ol), checklists, tables, images, and special blocks.
- **Interactive checklists**: Task lists with clickable checkboxes supporting markdown syntax `- [ ]` and `- [x]`.
- **Inline code control**: Select text and click the `<>` toolbar button; click again within inline code to remove it. This preserves the surrounding paragraph and supports native undo.
- **Viewing and links**: `setEditable(false)` keeps the toolbar visible but disabled; click text to edit, and use `viewOnBlur: true` to return to viewing when focus leaves. All links open in a new tab. URLs become links by default; set `autoLink: false` to leave plain URLs untouched. In edit mode, clicking a link shows open, edit, and remove actions.
- **Responsive pasted images**: HTML images and clipboard image files fit the editor width. Image blocks resize proportionally from their bottom-right handle.
- **Table support**: Markdown tables with Tab navigation, cell editing, and dynamic row creation.
- **Image support**: Drag & drop image upload, URL insertion, and resizable images with markdown syntax `![alt](src)`.
- **Universal library**: Available as CommonJS and ES modules for easy integration.

## Library Usage

### Quick Start

```bash
npm install @foreline/blockeditor
```

```javascript
import Editor from '@foreline/blockeditor';
import '@foreline/blockeditor/css';

const editor = new Editor({
    id: 'my-editor'
});
```

See [LIBRARY.md](./LIBRARY.md) for complete documentation.

### Automatic light and dark themes

The editor follows the browser/OS `prefers-color-scheme` setting, including changes made while it is open. Toolbar controls, panels, tables, quotations, inline code, and code/source views use matching colors. Import `content-defaults.css` for the quotation inset and other standalone content styling, and `prism-theme.css` for syntax highlighting in both themes. These styles are scoped to the editor.

Theme colors can be customized through `--bke-background`, `--bke-foreground`, `--bke-surface`, `--bke-border`, `--bke-accent`, `--bke-code-background`, and `--bke-code-foreground`. Toolbar icons have native tooltips with available keyboard or Markdown shortcuts; Command is shown on macOS and Ctrl elsewhere.

### Links, help, and language

The chain button opens a small link panel. Select text to link it, or place the caret to insert the address as text. Open it within an existing link to edit or remove the link. Enter applies; Escape cancels and restores the editing selection. Link operations support native undo. Selections must stay within one paragraph, heading, list item, or table cell.

The help button, immediately before the pin toggle, shows editing tips and Markdown shortcuts. Set `toolbar: { locale: 'ru' }` for Russian help, link-panel text, and pin labels; the library defaults to English. Override individual messages with `toolbar.labels`, for example `{ pin: 'Закрепить', unpin: 'Открепить' }`. Custom toolbar configurations still control their own button titles. The demo uses Russian.

Custom toolbars can add `{ class: 'bke-toolbar-link', icon: 'bke-link', title: 'Вставить или изменить ссылку' }`. Inline code now sits beside the code-block button.

### Toolbar pinning

The toolbar stays visible at the top of the scrolling area while its editor is in view. Use the pin icon at the right to switch between pinned and normal scrolling. Each editor keeps its own setting for its lifetime; reloading restores the configured default.

```javascript
const editor = new Editor({
    id: 'my-editor',
    toolbar: { pinned: false } // Optional: start unpinned (default is true).
});
editor.toolbar.setPinned(true);
```

For a page with a fixed header, set `--bke-toolbar-top` on `.bke-editor` to the header's height. `--bke-toolbar-background` sets the toolbar's opaque background. Pinning uses CSS sticky positioning within the editor's scroll container.

Bullet, numbered, and checkbox lists share a marker column and text gutter. Customize them with `--bke-list-marker-width` (default `1.25em`) and `--bke-list-marker-gap` (default `0.5em`). Custom toolbars can opt into inline code with `{ class: 'bke-toolbar-inline', icon: 'bke-inline-code', title: 'Inline code (select text)' }`.

## Development Setup

Install dependencies:

```shell
npm install
```

Start development server:

```shell
npm run dev
```

Build for production:

```shell
npm run build
```

## Testing

This project uses Jest for unit testing and integration tests.

Run tests:

```shell
npm test
```

Run tests in watch mode:

```shell
npm run test:watch
```

Generate test coverage report:

```shell
npm run test:coverage
```

After running the coverage command, you can find the detailed coverage report in the `coverage` directory.

## Dependencies

- Showdown (for markdown support)

## Usage

Initialize the editor in your HTML:

```html
<div id="editor" class="editor"></div>

<script type="module">
    import { Editor } from './src/Editor.js';
    
    // Create a single editor instance
    const editor = new Editor({ 
        id: 'editor',
        debug: true  // Enable debug mode for development
    });
    
    // Or create multiple isolated instances
    const editor1 = new Editor({ id: 'editor1' });
    const editor2 = new Editor({ id: 'editor2' });
    
    // Each instance has its own event system and state
    editor1.on('CONTENT_CHANGED', (data) => console.log('Editor 1:', data));
    editor2.on('CONTENT_CHANGED', (data) => console.log('Editor 2:', data));
</script>
```

### Content Export

Export editor content as markdown or HTML from any instance:

```javascript
// Instance method (recommended)
const markdownContent = editor.getMarkdown();
const htmlContent = editor.getHtml();

// Static method (uses first editor instance for backward compatibility)
const markdownContent = Editor.getMarkdown();
const htmlContent = Editor.getHtml();
```

### Event System

The editor provides an **instance-based event system** for monitoring content changes and user interactions. Each editor instance has its own isolated event emitter:

```javascript
import { EVENTS } from './src/utils/eventEmitter.js';

// Create editor instances
const editor1 = new Editor({ id: 'editor1', debug: true });
const editor2 = new Editor({ id: 'editor2', debug: true });

// Each editor has isolated events - no cross-contamination
editor1.on(EVENTS.CONTENT_CHANGED, (data) => {
    console.log('Editor 1 content changed:', data.data.markdown);
    // Only triggered by editor1 changes
});

editor2.on(EVENTS.CONTENT_CHANGED, (data) => {
    console.log('Editor 2 content changed:', data.data.markdown);
    // Only triggered by editor2 changes
});

// Listen for block focus changes
editor1.on(EVENTS.BLOCK_FOCUSED, (data) => {
    console.log('Editor 1 block focused:', data.data.blockType);
});

// Listen for user interactions with throttling
editor1.on(EVENTS.USER_KEY_PRESS, (data) => {
    console.log('User pressed:', data.data.key);
}, { throttle: 100 }); // Throttled for performance

// One-time event subscription
editor1.once(EVENTS.BLOCK_CREATED, (data) => {
    console.log('First block created in editor1!');
});

// Unsubscribe from events
const subscription = editor1.on(EVENTS.TOOLBAR_ACTION, (data) => {
    console.log('Toolbar action:', data.data.action);
});

// Later, unsubscribe
subscription.unsubscribe();
// Or use the off method
editor1.off(EVENTS.TOOLBAR_ACTION, callbackFunction);

// Custom event handling with priorities
editor1.on(EVENTS.BLOCK_CREATED, (data) => {
    console.log('High priority handler');
}, { priority: 10 });

editor1.on(EVENTS.BLOCK_CREATED, (data) => {
    console.log('Low priority handler');
}, { priority: 1 });

// Manual event emission
editor1.emit(EVENTS.CONTENT_CHANGED, { 
    markdown: editor1.getMarkdown(),
    html: editor1.getHtml()
}, { debounce: 500 });
```

#### Legacy Global Event Access

For backward compatibility, you can still access events globally (uses first editor instance):

```javascript
import { eventEmitter, EVENTS } from './src/utils/eventEmitter.js';

// This will use the global instance
eventEmitter.subscribe(EVENTS.CONTENT_CHANGED, (eventData) => {
    console.log('Content changed:', eventData.data.markdown);
});
```

#### Event Types

Available event types:
- `EVENTS.CONTENT_CHANGED` - Debounced content changes for backend sync
- `EVENTS.BLOCK_CREATED` - When a new block is created
- `EVENTS.BLOCK_DELETED` - When a block is deleted  
- `EVENTS.BLOCK_FOCUSED` - When a block gains focus
- `EVENTS.BLOCK_CONTENT_CHANGED` - When block content changes
- `EVENTS.TOOLBAR_ACTION` - When toolbar buttons are clicked
- `EVENTS.USER_PASTE` - When user pastes content
- `EVENTS.USER_KEY_PRESS` - When user presses keys (throttled)
- `EVENTS.EDITOR_INITIALIZED` - When the editor is fully initialized
- `EVENTS.EDITOR_UPDATED` - When the editor content is updated

#### Event Data Structure

All events follow a consistent data structure:

```javascript
{
    type: 'event.type',           // Event type identifier
    timestamp: 1642684800000,     // Unix timestamp when event occurred
    source: 'editor',             // Source that triggered the event
    data: {                       // Event-specific data
        // Varies by event type
        blockId: 'block-123',
        content: 'new content',
        markdown: '# Title',
        html: '<h1>Title</h1>',
        // ... other event-specific properties
    }
}
```

### Block System

The editor uses a modular block system where each block type implements the BlockInterface:

```javascript
import { ParagraphBlock, H1Block, TaskListBlock, TableBlock, ImageBlock } from './src/blocks/';

// Create blocks programmatically
const paragraph = new ParagraphBlock('Hello world');
const heading = new H1Block('My Title');
const checklist = new TaskListBlock('My task item');
const table = new TableBlock();
const image = new ImageBlock('![Sample](https://example.com/image.jpg)');

// Get markdown representation
console.log(paragraph.toMarkdown()); // "Hello world"
console.log(heading.toMarkdown());   // "# My Title"
console.log(checklist.toMarkdown()); // "- [ ] My task item"
console.log(table.toMarkdown());     // "| Header | ... |"
console.log(image.toMarkdown());     // "![Sample](https://example.com/image.jpg)"

// Get HTML representation  
console.log(paragraph.toHtml()); // "<p>Hello world</p>"
console.log(heading.toHtml());   // "<h1>My Title</h1>"
console.log(checklist.toHtml()); // "<li><input type=\"checkbox\"> My task item</li>"
console.log(table.toHtml());     // "<table>...</table>"
console.log(image.toHtml());     // "<img src=\"...\" alt=\"Sample\">"
```

### Image Features

Insert images using markdown syntax or drag & drop:

```markdown
![Alt text](https://example.com/image.jpg)
```

- Drag & drop image files directly onto image placeholders
- Click image placeholders to open file picker
- Resize images by dragging the resize handle (appears on hover)
- Images support both URLs and uploaded files (converted to base64)
- Export maintains image references in both markdown and HTML formats

### Table Features

Create tables using markdown syntax:

```markdown
| Header 1 | Header 2 | Header 3 |
| -------- | -------- | -------- |
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
```

- Use `Tab` to navigate between table cells
- Use `Shift+Tab` to navigate backwards
- Press `Enter` within a table to add a new row
- Click cells to edit content directly
- Tables export properly to both markdown and HTML formats

### Checklist Features

Create interactive task lists using markdown syntax:

```markdown
- [ ] Unchecked task item
- [x] Checked task item
```

- Click checkboxes to toggle completion status
- Use `Ctrl+Space` keyboard shortcut to toggle checkboxes
- Press `Enter` at the end of a task item to create a new task item
- Export maintains checkbox state in both markdown and HTML formats

## Contribution Guidelines

We welcome contributions to improve the BlockEditor. To contribute:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Write clear and concise commit messages.
4. Submit a pull request with a detailed description of your changes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
