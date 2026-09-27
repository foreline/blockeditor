# BlockEditor — Agent Guide

This document is a single source of truth for AI coding agents working on the `@foreline/blockeditor` project. It describes the project's purpose, technology stack, architecture, build/test workflows, coding conventions, and security posture. All information is derived from the actual project contents.

---

## Project Overview

**BlockEditor** is a vanilla-JavaScript WYSIWYG editor built around a block-based content model. It is published to npm as `@foreline/blockeditor` and ships as ES module, CommonJS, and IIFE bundles so it can be consumed by bundlers, Node scripts, or direct browser `<script>` tags.

Key capabilities:

- Block-based editing (paragraphs, headings H1–H6, unordered/ordered/task lists, blockquotes, code blocks, tables, images, delimiters).
- Markdown shortcuts that convert paragraphs into other block types as the user types (e.g. `# ` → heading, `- [ ] ` → task list).
- Inline markdown formatting (`**bold**`, `_italic_`, `` `code` ``).
- Content export as Markdown (`editor.getMarkdown()`) and HTML (`editor.getHtml()`).
- Instance-scoped event system with debounce/throttle support.
- Optional toolbar with dropdowns, FontAwesome or custom SVG icons.
- Read-only mode and multiple isolated editor instances on the same page.

The current version in `package.json` is `0.6.5` (as of the last workspace state, this change is uncommitted).

---

## Technology Stack

| Layer | Tool / Library |
|---|---|
| Language | Vanilla JavaScript (ES modules, `"type": "module"`) |
| Build tool | Vite 6 (`vite.config.js`) |
| Unit tests | Jest 29 + jsdom + babel-jest |
| E2E tests | Playwright 1.58 |
| Markdown | Showdown |
| Syntax highlighting | PrismJS |
| Icons | FontAwesome Free (optional peer dependency) or bundled inline SVGs in `src/icons.js` |
| CI/CD | GitLab CI (`.gitlab-ci.yml`) |

All runtime dependencies are kept external in the library build:

- `@fortawesome/fontawesome-free` (optional peer)
- `prismjs`
- `showdown`

---

## Repository Layout

```
D:/github/js-editor
├── src/                    # Source code
│   ├── blocks/             # Block type implementations
│   ├── config/             # Toolbar configuration
│   ├── css/                # Stylesheets
│   ├── interfaces/         # BlockInterface contract
│   ├── utils/              # Event emitter, state machine, logger, highlighter
│   ├── Block.js            # Legacy/generic block wrapper
│   ├── BlockConverter.js   # Markdown-trigger driven block conversions
│   ├── BlockManager.js     # Block lifecycle (create/insert/remove)
│   ├── BlockType.js        # Block type constants and helpers
│   ├── ContentSerializer.js# Markdown/HTML serialization
│   ├── CursorManager.js    # Selection/cursor utilities
│   ├── DebugTooltip.js     # Debug-mode UI overlay
│   ├── Editor.js           # Main editor orchestrator
│   ├── icons.js            # Inline SVG toolbar icons
│   ├── index.js            # Public library entry point
│   ├── index.d.ts          # TypeScript declarations
│   ├── InlineMarkdownHandler.js
│   ├── KeyHandler.js       # Enter/Backspace/Tab/etc handling
│   ├── Parser.js           # Markdown/HTML → block parsing
│   ├── PasteHandler.js     # Paste with markdown conversion
│   ├── Toolbar.js          # Toolbar rendering and positioning
│   ├── ToolbarHandlers.js  # Toolbar action handlers
│   └── Utils.js            # HTML escaping, tag stripping, normalization
├── tests/                  # Jest unit/integration tests
├── e2e/                    # Playwright end-to-end tests
├── scripts/                # Build helpers (post-build, package verify)
├── dev-docs/               # ADRs, proposals, architecture notes
├── dist/                   # Library build output
├── demo-dist/              # Demo app build output
├── vite.config.js
├── jest.config.cjs
├── playwright.config.js
├── babel.config.cjs
├── package.json
├── README.md
├── LIBRARY.md
└── CHANGELOG.md
```

---

## Architecture

### Editor Instance

`Editor.js` is the orchestrator. Constructing an editor mounts it into a DOM element:

```javascript
const editor = new Editor({ id: 'my-editor' });
```

or via the static mount helper:

```javascript
const editor = Editor.mount(document.getElementById('my-editor'));
```

Each instance owns:

- A `contentArea` (`contenteditable`) where blocks live.
- A private `WeakMap` (`_blockMap`) linking DOM block elements to typed block instances.
- Dedicated collaborators injected in the constructor:
  - `CursorManager` — selection, focus, caret positioning.
  - `ContentSerializer` — markdown/HTML export.
  - `PasteHandler` — clipboard processing.
  - `BlockConverter` — markdown-trigger block type conversions.
  - `BlockManager` — block creation, insertion, deletion, empty-editor protection.
  - `KeyHandler` — keyboard input.
  - `InlineMarkdownHandler` — inline markdown patterns.
  - `EditorStateMachine` — replaces boolean flags (`isCreatingBlock`, `isConvertingBlock`) with explicit states and an operation queue.
  - `EditorEventEmitter` — per-instance event bus with debounce/throttle/suppress support.

### Blocks

Every block type extends `BaseBlock` (`src/blocks/BaseBlock.js`) and implements the contract documented in `src/interfaces/BlockInterface.js`. Required behavior includes:

- Instance methods: `handleKeyPress`, `handleEnterKey`, `applyTransformation`, `toMarkdown`, `toHtml`, `renderToElement`.
- Static methods: `getMarkdownTriggers`, `matchesMarkdownTrigger`, `getToolbarConfig`, `getDisabledButtons`, `parseFromHtml`, `parseFromMarkdown`, `canParseHtml`, `canParseMarkdown`.
- Properties: `type`, `content`, `html`, `nested`.

Block classes are registered in `BlockFactory.blockRegistry` (`src/blocks/BlockFactory.js`). The parser delegates block detection to each class's `canParseHtml` / `canParseMarkdown` methods.

Supported block type identifiers (from `BlockType.js`):

- `paragraph`, `h1`–`h6`, `code`, `quote`, `ul`, `ol`, `sq` (task list), `table`, `image`, `delimiter`.

### Content Flow

1. Initial content (markdown or HTML) is parsed by `Parser.js` using Showdown into HTML, then split and handed to block-specific parsers.
2. Rendered blocks are appended to the `contentArea`.
3. User typing triggers `input` events; paragraph blocks are inspected for markdown triggers and converted via `BlockConverter`.
4. Inline markdown is applied by `InlineMarkdownHandler`.
5. `editor.update()` serializes content and emits `CONTENT_CHANGED` (debounced) and `EDITOR_UPDATED`.

### Events

Use `editor.on(EVENTS.CONTENT_CHANGED, callback)` etc. Events live on the instance, so multiple editors on one page do not share state. The legacy global `eventEmitter` still exists for backward compatibility but routes through the first instance.

Key event names (`src/utils/eventEmitter.js`):

- `content.changed`, `editor.updated`
- `block.created`, `block.deleted`, `block.focused`, `block.activated`, `block.content.changed`, `block.type.changed`
- `toolbar.action`, `user.paste`, `user.keypress`
- `editor.initialized`, `editor.debug.mode.changed`

---

## Build and Test Commands

All commands are defined in `package.json`.

```bash
# Install dependencies
npm install

# Development server (serves the demo, port 5173)
npm run dev

# Build the demo app to demo-dist/
npm run build:demo

# Build the library to dist/ (ES, CJS, IIFE) + CSS + type definitions
npm run build:lib

# Verify that dist/ contains all expected publish artifacts
npm run verify

# Full unit/integration test suite (Jest)
npm test

# Watch mode
npm run test:watch

# Coverage report (written to coverage/)
npm run test:coverage

# E2E tests (Playwright)
npm run test:e2e
npm run test:e2e:ui
npm run test:e2e:headed
npm run test:e2e:debug
```

`npm run prepublishOnly` runs tests, the library build, and package verification before publishing.

### Build Details

- `vite.config.js` exposes two modes:
  - `library` mode produces `dist/blockeditor.{es,cjs,iife}.js` with source maps and keeps `prismjs`, `showdown`, and `@fortawesome/fontawesome-free` external.
  - Demo mode builds the development demo into `demo-dist/`.
- `scripts/post-build.js` copies individual CSS files and `src/index.d.ts` into `dist/`, and creates `dist/style.css` from `src/css/editor.css`.
- `scripts/verify-package.js` checks that all required publish files exist.

---

## Testing Instructions

### Unit / Integration Tests (Jest)

- Configuration: `jest.config.cjs`.
- Environment: `jsdom`.
- Setup: `tests/setup.js` provides a heavily mocked DOM, global mocks for `window.getSelection`, `Range`, `Prism`, `requestAnimationFrame`, storage, URL, and console methods. It also auto-mocks `src/blocks/BlockFactory`.
- Alias mapping: `@/` resolves to `src/`. `@/utils/log.js` is remapped to `tests/mocks/log.js` so tests don't spam console output.
- Coverage is collected from `src/**/*.js` except `src/index.js`.
- As of the last run, the suite contains **57 test files / 951 passing tests**.

When adding or fixing behavior, add or update a Jest test in `tests/`. Follow the existing naming convention: `FeatureName.test.js` or `ModuleName.test.js`.

### E2E Tests (Playwright)

- Configuration: `playwright.config.js`.
- Specs live in `e2e/`.
- The dev server is started automatically (`npm run dev` on `http://localhost:5173`).
- CI runs use one worker and two retries; local runs use default parallelism.
- Only Chromium is configured in the current project.

When writing E2E tests, use `await page.goto('/')` and the standard Playwright `test`/`expect` API.

---

## Code Style Guidelines

Follow the patterns already in the codebase:

- **Modules**: ES modules only. Start files with `'use strict';`.
- **Imports**: Prefer `@/` aliases for `src/` paths. Example: `import {BlockType} from "@/BlockType";`.
- **Classes**: Use `class` with explicit methods. JSDoc comment blocks are common.
- **Naming**:
  - Classes: `PascalCase`.
  - Methods/properties: `camelCase`.
  - CSS classes: `bke-*` prefix (e.g. `.bke-editor`, `.bke-block`, `.bke-toolbar-bold`).
- **Logging**: Use `src/utils/log.js` (`log`, `logWarning`, `logError`) instead of raw `console` in source files. Logs are mocked in tests.
- **Block types**: Add new block types by extending `BaseBlock`, registering them in `BlockFactory`, adding constants to `BlockType`, and exporting them from `src/blocks/index.js` and `src/index.js`.
- **DOM markers**: Blocks are identified by the `data-block-type` attribute and the `.bke-block` class.
- **Transactions**: Use `editor.transaction(fn)` when performing multi-step mutations to suppress intermediate events and empty-editor protection.

---

## Security Considerations

- The editor relies on `contenteditable` and direct DOM manipulation. Any feature that injects HTML must be careful to avoid XSS.
- `Utils.escapeHTML` is available for escaping user text when building HTML strings.
- Paste handling converts clipboard content through markdown parsing; avoid inserting raw HTML from untrusted sources without sanitization.
- The library keeps Showdown and PrismJS external; consumers should keep those dependencies up to date.
- FontAwesome is an optional peer dependency; bundled inline SVG icons in `src/icons.js` are the default fallback.

---

## Common Tasks

### Adding a New Block Type

1. Create `src/blocks/NewBlock.js` extending `BaseBlock`.
2. Add a constant to `BlockType.js`.
3. Register the class in `BlockFactory.js`.
4. Export it from `src/blocks/index.js` and `src/index.js`.
5. Add markdown triggers and `applyTransformation` so the shortcut and toolbar both work.
6. Add test coverage in `tests/NewBlock.test.js`.

### Adding a Toolbar Button

1. Add the button definition to `src/config/defaultToolbarConfig.js`.
2. Add the SVG icon to `src/icons.js` or use a FontAwesome class.
3. Implement the action in `ToolbarHandlers.js`.
4. Update any block-specific `getDisabledButtons()` methods if the button should be disabled for certain blocks.

### Changing Serialization

- Per-block markdown/HTML extraction is in `ContentSerializer.js` (`_blockElementToMarkdown`, `_blockElementToHtml`).
- Block-level parsing is delegated to each block class's static `parseFromHtml` / `parseFromMarkdown` methods.

---

## Notes

- The project is **not** a React/Vue/Angular component; it is a vanilla-JS library that manipulates the DOM directly.
- There is no GitHub Actions workflow; CI is configured in `.gitlab-ci.yml` for GitLab.
- The `dist/` and `demo-dist/` directories are ignored by git and regenerated by builds.
- The current working tree has an uncommitted version bump in `package.json` (`0.6.4` → `0.6.5`).
