# CSS Inheritance & Host-Page Styling Analysis

**Status:** Proposal — for review and discussion  
**Date:** 2026-05-03  
**Author:** Copilot Analysis

---

## 1. Executive Summary

BlockEditor currently ships a significant volume of **opinionated, hardcoded CSS** that overrides the consumer's host-page typography and layout styles for the content editing area. This is the opposite of industry best practice: mature editors like Tiptap and ProseMirror ship **zero content styles** by default, asking the host application to provide them. Only the **editor chrome** (toolbar, dropdowns, debug UI) warrants shipped styles.

---

## 2. Current State Audit

### 2.1 What BlockEditor ships (`src/css/editor.css`)

The shipped stylesheet is ~560 lines. It can be divided into three concern categories:

| Category | Lines (approx.) | Should ship? |
|---|---|---|
| **Scoped box-sizing reset** | 5 | ✅ Yes (structural necessity) |
| **Toolbar UI** (`.bke-toolbar`, `.bke-toolbar-group`, `.bke-dropdown*`) | ~120 | ✅ Yes |
| **Debug UI** (`.bke-debug-tooltip*`, `.bke-debug-mode`) | ~50 | ✅ Yes |
| **Content area typography** (headings font-sizes, paragraph spacing, list styles) | ~80 | ❌ No — should inherit |
| **Hardcoded content colours** (`#666`, `#ddd`, `#f5f5f5`, `#333`, `#007cba`, etc.) | scattered | ❌ No — should inherit or be CSS variables |
| **Block layout** (margins, min-height, dashed debug borders) | ~30 | ⚠️ Partially — structure yes, visual design no |
| **Table styles** (borders, cell padding, header background `#f5f5f5`) | ~40 | ❌ No — should inherit |
| **Image block** (placeholder colours, box-shadow, border-radius on `<img>`) | ~60 | ❌ No — should inherit |
| **Code block** (hardcoded GitHub-like `#f6f8fa` background, monospace font-family, `14px` font-size) | ~50 | ❌ No — should inherit |
| **`prism-theme.css`** (full syntax highlighting colour theme) | ~120 | ⚠️ Optional add-on, should not be the default import |
| **View mode containers** (markdown/HTML view background, border, font-family) | ~50 | ❌ No |

**Total content-area styles that should be removed or converted to inherit: ~310 lines out of 560.**

### 2.2 Specific Hardcoded Problems

#### Headings — impose relative sizes instead of inheriting

```css
/* Current — overrides the host page's h1–h6 */
.bke-editor .bke-block[data-block-type="h1"] h1 { font-size: var(--bke-h1-size); }
/* --bke-h1-size defaults to 1.5em — host page may define h1 at 2.5rem */
```

#### Code block — hardcodes GitHub's design language

```css
/* Current */
.bke-editor .bke-block[data-block-type="code"] pre {
    background: #f6f8fa;
    border: 1px solid #e1e4e8;
    border-radius: 6px;
    font-family: "SFMono-Regular", "Consolas", "Liberation Mono", "Menlo", monospace;
    font-size: 14px;        /* absolute px — ignores host rem scale */
    line-height: 1.45;
}
```

A consumer using a dark-mode design system gets a blinding white code block.

#### Table — imposes visual design

```css
/* Current */
.bke-editor .bke-block[data-block-type="table"] th {
    background-color: #f5f5f5;
    font-weight: bold;
}
.bke-editor .bke-block[data-block-type="table"] th,
.bke-editor .bke-block[data-block-type="table"] td {
    border: 1px solid #ddd;
    padding: 8px;
}
```

A consumer using a Tailwind or Bootstrap project already has table styles. These hardcoded values create specificity wars.

#### Image block — drops shadow and border-radius on every `<img>`

```css
/* Current */
.bke-editor .bke-block[data-block-type="image"] img {
    max-width: 100%;
    height: auto;
    border-radius: 3px;           /* aesthetic — not structural */
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);  /* aesthetic — not structural */
}
```

#### Placeholder colour is hardcoded

```css
/* Current */
.bke-editor .bke-block:empty::before {
    color: #666;  /* hardcoded mid-grey — invisible on dark backgrounds */
}
```

---

## 3. Industry Standard Analysis

### 3.1 Tiptap (most relevant comparator — also block-based, npm library)

> *"Tiptap doesn't include visual styles by default. The editor only outputs semantic HTML. You can style it however you like with your own CSS or a framework such as Tailwind or Bootstrap."*
> — Official Tiptap documentation

**What Tiptap ships:** Nothing for content. The `@tiptap/starter-kit` adds minimal `prose-mirror.css` only for structural editability (cursor appearance, selection highlight). All visual design is the consumer's responsibility.

**Lesson:** Semantic HTML output + zero content styles = maximum integration flexibility.

### 3.2 ProseMirror (the engine under Tiptap and many others)

ProseMirror ships `prosemirror-view/style/prosemirror.css` — a ~50-line file that contains **only**:
- `.ProseMirror` — `outline: none`, `white-space: pre-wrap`
- `.ProseMirror-selectednode` — outline for node selection
- `img.ProseMirror-separator` — structural separator

No typography, no colours, no heading sizes, no table styles.

**The ProseMirror philosophy:** *"The core library has no opinion on what the content should look like."*

### 3.3 Quill

Quill ships two optional themes (`snow` and `bubble`) as **separate CSS imports**. The content area itself (`ql-editor`) only sets:
- `box-sizing: border-box`
- `outline: none`
- `overflow-y: auto`
- `padding: 12px 15px`

Typography, font-size, colours are **explicitly left to the host page**. Quill's guide states: *"Themes are optional and must be explicitly imported."*

### 3.4 EditorJS (most architecturally similar to BlockEditor)

EditorJS ships a minimal stylesheet for its **block chrome** (hover handles, toolbox) but the actual block content inherits completely from the page. Their `paragraph` block renders a plain `<div contenteditable>` with no CSS. Their heading block renders a plain `<h2>` with no CSS.

**Lesson:** Editor chrome (insertion handle, toolbox) = styled by library. Content blocks = styled by host.

### 3.5 CKEditor 5

CKEditor 5 uses a `ck-content` wrapper class on the editable area. Their shipped styles for `ck-content` are:
- `word-break: break-word` (structural)
- `outline: none` (structural)
- Thin, namespaced overrides only where the browser inconsistency requires it

Their content styles guide says: *"CKEditor 5 generates semantic HTML that is designed to be styled by the consuming application, not the editor itself."*

---

## 4. Recommended Split: Chrome vs. Content

The clean mental model is:

```
BlockEditor CSS surface
├── chrome/          ← Library owns, always ships
│   ├── toolbar.css         (.bke-toolbar, .bke-toolbar-group, .bke-dropdown*)
│   └── debug.css           (.bke-debug-tooltip*, .bke-debug-mode)
├── structural/      ← Library owns (minimum viable editing surface)
│   └── structure.css       (box-sizing, outline:none, position:relative on blocks)
└── content/         ← Consumer owns (SHOULD NOT ship defaults)
    ├── typography.css      (font sizes, heading sizes, list markers, spacing)
    ├── table.css           (borders, backgrounds, cell padding)
    ├── image.css           (border-radius, box-shadow)
    └── code.css            (background, border, font-family — also prism theme)
```

---

## 5. Proposed Changes

### 5.1 Remove hardcoded content colours, replace with `inherit` or CSS custom properties

```css
/* BEFORE */
.bke-editor .bke-block:empty::before {
    color: #666;
}

/* AFTER — inherits from host, falls back to a neutral token */
.bke-editor .bke-block:empty::before {
    color: var(--bke-placeholder-color, color-mix(in srgb, currentColor 40%, transparent));
}
```

### 5.2 Strip heading size overrides — let browser defaults (and host CSS) apply

```css
/* REMOVE entirely: */
.bke-editor .bke-block[data-block-type="h1"] h1 { font-size: var(--bke-h1-size); }
/* ...h2–h6... */

/* The inner <h1>–<h6> elements will inherit whatever the host page defines */
```

If the consumer wants to change heading sizes inside the editor, they target:
```css
.bke-editor h1 { font-size: 2.5rem; }
```

### 5.3 Code block — inherit font-family, remove background and border

```css
/* BEFORE */
.bke-editor .bke-block[data-block-type="code"] pre {
    background: #f6f8fa;
    border: 1px solid #e1e4e8;
    border-radius: 6px;
    font-family: "SFMono-Regular", "Consolas", "Liberation Mono", "Menlo", monospace;
    font-size: 14px;
    line-height: 1.45;
}

/* AFTER — structural only */
.bke-editor .bke-block[data-block-type="code"] pre {
    margin: 0;
    overflow-x: auto;
    tab-size: 4;
    /* font-family, background, border, border-radius → consumer's responsibility */
}
```

Prism theme should be split into a separate optional import:
```js
// Current (forced on consumers):
import '@foreline/blockeditor/style.css'; // includes prism theme

// Proposed:
import '@foreline/blockeditor/style.css';             // chrome + structural only
import '@foreline/blockeditor/themes/prism.css';      // opt-in syntax highlighting
```

### 5.4 Table block — remove visual design, keep only `border-collapse`

```css
/* BEFORE */
.bke-editor .bke-block[data-block-type="table"] th {
    background-color: #f5f5f5;
    font-weight: bold;
}
.bke-editor .bke-block[data-block-type="table"] th,
.bke-editor .bke-block[data-block-type="table"] td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: left;
    min-width: 100px;
}

/* AFTER — structural only */
.bke-editor .bke-block[data-block-type="table"] table {
    border-collapse: collapse;
    width: 100%;
}
.bke-editor .bke-block[data-block-type="table"] td,
.bke-editor .bke-block[data-block-type="table"] th {
    min-width: 60px; /* structural minimum for usability */
}
```

### 5.5 Image block — remove aesthetic styles

```css
/* BEFORE */
.bke-editor .bke-block[data-block-type="image"] img {
    max-width: 100%;
    height: auto;
    border-radius: 3px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

/* AFTER — keep only responsive constraint */
.bke-editor .bke-block[data-block-type="image"] img {
    max-width: 100%;
    height: auto;
    /* border-radius, box-shadow → consumer's responsibility */
}
```

### 5.6 List styles — let browser defaults apply

```css
/* REMOVE: these fight against the host page's list styles */
.bke-editor ul, .bke-editor ol {
    list-style: none;
    margin: 0;
    padding: 0;
}
.bke-editor li {
    list-style: none;
    margin: 0;
    padding: 0;
}
```

The reset was added to prevent Bootstrap/Tailwind list resets from breaking the editor. The **correct fix** is to scope the reset only to toolbar UI, not the entire `.bke-editor`:

```css
/* Scoped reset — ONLY inside toolbar chrome, not content */
.bke-toolbar ul,
.bke-toolbar ol,
.bke-toolbar li {
    list-style: none;
    margin: 0;
    padding: 0;
}

/* Content lists should use browser defaults + host-page styles */
.bke-editor .bke-block[data-block-type="ul"] ul {
    /* no overrides — inherits from host page */
}
```

### 5.7 Focus colour — replace hardcoded blue with `currentColor` or system accent

```css
/* BEFORE */
.bke-editor .bke-block[data-block-type="table"] td:focus,
.bke-editor .bke-block[data-block-type="table"] th:focus {
    outline: 2px solid #007cba;
    background-color: #f0f8ff;
}

/* AFTER — uses the system focus ring colour */
.bke-editor .bke-block[data-block-type="table"] td:focus,
.bke-editor .bke-block[data-block-type="table"] th:focus {
    outline: 2px solid var(--bke-focus-color, Highlight);
}
```

---

## 6. CSS Custom Properties — What to Keep vs. Remove

| Custom property | Keep? | Reason |
|---|---|---|
| `--bke-font-family: inherit` | ✅ Keep | Already correct — inherits from host |
| `--bke-font-size: 1rem` | ✅ Keep | Reasonable default, overridable |
| `--bke-line-height: 1.5` | ✅ Keep | Reasonable default |
| `--bke-h1-size: 1.5em` | ❌ Remove | Overrides host h1 with undersized heading |
| `--bke-h2-size` … `--bke-h6-size` | ❌ Remove | Same reason |
| `--editor-font-size` (alias) | ⚠️ Deprecated | Legacy; keep for one version, then remove |

---

## 7. Migration Strategy

### Breaking change classification

Removing the content-area CSS is a **visual breaking change** but not a functional one. Consumers who relied on BlockEditor to provide all the styling (e.g., zero-CSS integrations in plain HTML pages) will see unstyled content.

**Recommended versioning approach:**

- **v1.x.x (current):** Keep existing styles, add `--bke-*` CSS variables for every hardcoded value as an opt-in override mechanism.
- **v2.0.0 (next major):** Strip content styles. Ship an optional `@foreline/blockeditor/content-defaults.css` for consumers who want the old look.

### Optional content-defaults bundle

```css
/* dist/content-defaults.css — opt-in legacy/standalone styles */

/* For consumers who do NOT have their own typography: */
.bke-editor h1 { font-size: 1.75rem; font-weight: 700; }
.bke-editor h2 { font-size: 1.5rem; font-weight: 600; }
/* ... */
.bke-editor pre, .bke-editor code {
    font-family: "SFMono-Regular", Consolas, monospace;
    background: #f6f8fa;
    border: 1px solid #e1e4e8;
}
.bke-editor table td, .bke-editor table th {
    border: 1px solid #ddd;
    padding: 8px;
}
```

---

## 8. What Should Always Ship (Non-Negotiable)

These styles are **structural requirements** for editing to work — they are not stylistic opinions:

```css
/* structural.css — always shipped, cannot be removed */

.bke-editor,
.bke-editor *,
.bke-editor *::before,
.bke-editor *::after {
    box-sizing: border-box; /* prevents layout explosions */
}

.bke-editor {
    outline: none; /* suppresses browser default focus outline on the container */
}

.bke-editor * {
    outline: none; /* same for contenteditable children */
}

.bke-editor .bke-block {
    position: relative; /* required for debug tooltips and resize handles */
    min-height: 1lh;    /* prevents 0-height blocks from being unreachable */
}

.bke-editor[aria-readonly="true"] {
    pointer-events: none;
    user-select: text;
}

.bke-hidden {
    display: none !important;
}
```

---

## 9. Summary Recommendation

| Action | Priority |
|---|---|
| Remove hardcoded heading font-sizes | High |
| Remove hardcoded code block background/border/font-family | High |
| Remove list reset from `.bke-editor` scope (scope to `.bke-toolbar` only) | High |
| Remove table visual design (background, border, padding) | High |
| Remove image aesthetic styles (border-radius, box-shadow) | Medium |
| Replace hardcoded `#666` placeholder colour with CSS variable | Medium |
| Replace hardcoded focus colour `#007cba` with CSS variable | Medium |
| Split prism theme into a separate optional CSS file | Medium |
| Provide `content-defaults.css` as an opt-in fallback bundle | Medium |
| Remove heading CSS custom properties (`--bke-h1-size` etc.) | Low (v2) |

**The single guiding rule:** BlockEditor should style its own UI chrome. The document content should look exactly like the host page's HTML looks — because that's what the exported HTML will look like after it leaves the editor.
