# Consumer Integration Feedback — Analysis & Implementation Plan

**Source:** `dev-docs/_inbox/CONSUMER_FEEDBACK.md`  
**Context:** Feedback from integrating `@foreline/blockeditor@0.1.3` into a Bitrix Framework host (PHP, SidePanel iframe, custom CSS pipeline)  
**Date:** 2026-05-02  
**Status:** Under review

---

## Executive Summary

The consumer identified 11 issues. Cross-referencing with the codebase confirms all of them are real. Three are trivially fixable in under an hour; two are already partially resolved; the remainder require genuine refactoring. The single highest-ROI change is **removing the Bootstrap dropdown and scoping CSS** — it eliminates the root cause of every visual breakage they described.

One important correction to the consumer's report: **named + default exports already exist** in `src/index.js` (issue 3.3 is not a bug in the current source).

---

## Confirmed Findings

### 1. Bootstrap & Popper — Critical ✅ Confirmed

**In `package.json` `dependencies`:**
```json
"@popperjs/core": "^2.11.8",
"bootstrap": "^5.3.3"
```

**In `src/Toolbar.js` (lines 479–496) — hardcoded Bootstrap classes:**
```js
dropdown.className = 'dropdown';
btn.className = 'btn btn-secondary dropdown-toggle';
btn.setAttribute('data-bs-toggle', 'dropdown');
ul.className = 'dropdown-menu';
```

The Vite library build externalizes these — they don't bloat the JS bundle — but because they are in `dependencies` (not `peerDependencies`), npm installs them for every consumer. More critically, the toolbar HTML structure requires Bootstrap's JavaScript (for dropdown toggle behavior) and Bootstrap CSS (for visual rendering). Any host without Bootstrap gets a broken toolbar. Any host with a *different version* gets cascading conflicts.

**Verdict:** The dependency must be removed. The toolbar dropdown must be re-implemented in pure CSS.

---

### 2. CSS Scoping — Critical ✅ Confirmed

**In `src/css/editor.css`:**
```css
.editor { ... }          /* extremely generic */
.editor .block { ... }   /* extremely generic child */
.editor-toolbar { ... }  /* acceptable prefix but still global */
```

No namespace. Classes like `.editor`, `.block`, `.active-block` will collide in virtually every CMS host environment. Additionally, the task list fix rules use inline `!important` to fight Bootstrap's own resets — a symptom of the scoping problem, not a solution to it.

**Verdict:** All classes need a `bke-` prefix (or `[data-bke-root]` attribute scoping). This is a breaking change but essential before any future major release.

---

### 3. Scoped CSS Reset — High ✅ Confirmed as absent

The editor contains no local reset. The task-list block has multiple `!important` declarations fighting external stylesheets. Without a scoped reset, the editor's visual consistency is entirely at the mercy of the host page.

---

### 4. FontAwesome — High ✅ Confirmed

**In `package.json` `dependencies`:**
```json
"@fortawesome/fontawesome-free": "^6.5.1"
```

**In `src/Toolbar.js` — hardcoded FA class strings:**
```js
btn.innerHTML = `<i class="fa ${section.icon}"></i>`;
button.innerHTML = `<i class="fa ${item.icon}"></i> ` + button.textContent;
```

The toolbar config passes icon names as strings (`fa-bold`, `fa-heading`, etc.). The library owns ~15–20 icons. FontAwesome ships ~1,400+. The font files are the largest assets in the consumer's page load.

**Verdict:** Inline SVG is the cleanest long-term solution. An icon-renderer abstraction is a viable migration path that allows consumers to bring their own icons without a forced upgrade.

---

### 5. `initMarkdownContainer` global query — High ✅ Confirmed

**In `src/Editor.js` (line ~1690):**
```js
const container = document.querySelector('.editor-container');
```

This is a document-wide search for a class that the library itself never creates. The class exists only in `index.html` as a demo convention. If `.editor-container` is absent (or a different element matches), the textarea silently fails to mount. There is an identical bug in `initHtmlContainer()`.

**Verdict:** The textarea should be appended to `this.instance.parentElement` or injected directly relative to the editor's own DOM node.

---

### 6. `declare module 'js-editor'` — Medium ✅ Confirmed critical for TS consumers

**In `src/index.d.ts` (line 5):**
```ts
declare module 'js-editor' {   // wrong — package is @foreline/blockeditor
```

Every TypeScript consumer gets zero type-checking because the module declaration name doesn't match the import path. This is a one-line fix.

---

### 7. Named + Default ESM Exports — ✅ Already fixed (not a bug)

**In `src/index.js`:**
```js
export { Editor } from './Editor.js';      // named ✓
export { Editor as default } from './Editor.js';  // default ✓
```

The consumer's complaint is not reproducible on the current source. This was likely fixed between the version they integrated and the current codebase.

---

### 8. `change` Event Payload — Medium ✅ Confirmed undocumented

**In `src/Editor.js` the emitter fires:**
```js
// EVENTS.CONTENT_CHANGED ('content.changed') payload:
{ html, markdown, timestamp }

// EVENTS.EDITOR_UPDATED ('editor.updated') payload (legacy):
{ html, markdown, blockCount }

// EVENTS.BLOCK_CONTENT_CHANGED ('block.content.changed') payload:
{ blockId, blockType, content, previousContent, timestamp }
```

These payloads are well-defined internally but `index.d.ts` types `on()` as:
```ts
on(event: string, callback: Function): void;
```

No event name union, no payload types — consumers are forced to guess.

---

### 9. `destroy()` — Medium ✅ Confirmed incomplete

**Current `destroy()` in `src/Editor.js`:**
```js
destroy() {
    this.debugTooltip?.disable();
    Editor._instances.delete(this.instance);
    this.blocks = [];
    this.currentBlock = null;
    this._blockMap = new WeakMap();
    this.debugTooltip = null;
    this.eventEmitter = null;    // set to null — never cleaned up
}
```

The `addListeners()` method attaches `keydown`, `keyup`, `beforeinput`, `input`, `focus`, `blur`, `click`, `paste` event listeners to `this.instance` and potentially to `document`. None are removed on destroy. In SPA/AJAX environments this causes listener accumulation every time the editor is re-mounted.

---

### 10. `readonly` Mode — Low ✅ Confirmed unimplemented

`readonly` is declared in `EditorOptions` in `index.d.ts` (line 11) but `init()` unconditionally sets `contenteditable="true"` without checking the option. The feature is a stub.

---

## Implementation Plan

### Priority 0 — Trivial fixes (< 1 hour, no risk)

#### Fix `declare module` name

```ts
// src/index.d.ts — line 5
// Before:
declare module 'js-editor' {
// After:
declare module '@foreline/blockeditor' {
```

#### Fix `initMarkdownContainer` global query

```js
// src/Editor.js — initMarkdownContainer() and initHtmlContainer()
// Before:
const container = document.querySelector('.editor-container');
// After:
const container = this.instance?.parentElement ?? document.body;
```

#### Move Bootstrap/Popper/FA out of `dependencies`

Since the Vite build already externalizes them, they should not be in `dependencies` at all. Move to `peerDependencies` with `optional: true`:

```json
// package.json
"peerDependencies": {
    "bootstrap": ">=5",
    "@popperjs/core": ">=2",
    "@fortawesome/fontawesome-free": ">=6"
},
"peerDependenciesMeta": {
    "bootstrap":                     { "optional": true },
    "@popperjs/core":                { "optional": true },
    "@fortawesome/fontawesome-free": { "optional": true }
}
```

---

### Priority 1 — Bootstrap dropdown replacement (High impact, Medium effort)

The toolbar dropdown is the only Bootstrap component actually used. It can be replaced with a CSS-only pattern that is simpler, lighter, and has zero external dependency.

**New dropdown HTML structure (generated in Toolbar.js):**

```js
// Replace Bootstrap dropdown with CSS-only dropdown
const wrapper = document.createElement('div');
wrapper.className = 'bke-dropdown';

const trigger = document.createElement('button');
trigger.className = 'bke-toolbar-btn bke-dropdown-trigger';
trigger.type = 'button';
trigger.setAttribute('aria-haspopup', 'true');
trigger.setAttribute('aria-expanded', 'false');
trigger.innerHTML = renderIcon(section.icon);
wrapper.appendChild(trigger);

const menu = document.createElement('div');
menu.className = 'bke-dropdown-menu';
menu.setAttribute('role', 'menu');
// ... populate menu items
wrapper.appendChild(menu);

// Toggle on click — no Popper needed
trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const expanded = trigger.getAttribute('aria-expanded') === 'true';
    trigger.setAttribute('aria-expanded', String(!expanded));
    menu.classList.toggle('bke-dropdown-menu--open', !expanded);
});

// Close on outside click
document.addEventListener('click', () => {
    trigger.setAttribute('aria-expanded', 'false');
    menu.classList.remove('bke-dropdown-menu--open');
});
```

**Corresponding CSS:**

```css
.bke-dropdown { position: relative; display: inline-block; }

.bke-dropdown-menu {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 1000;
    min-width: 160px;
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    padding: 4px 0;
}

.bke-dropdown-menu--open { display: block; }
```

---

### Priority 2 — CSS namespace (`bke-*` prefix, High impact, Medium effort)

All CSS classes in `src/css/editor.css` and all class assignments in `src/Toolbar.js`, `src/Editor.js`, and every block file need to be migrated to the `bke-` prefix.

**Mapping table (partial — full audit required):**

| Before | After |
|---|---|
| `.editor` | `.bke-editor` |
| `.block` | `.bke-block` |
| `.active-block` | `.bke-block--active` |
| `.editor-toolbar` | `.bke-toolbar` |
| `.editor-toolbar-group` | `.bke-toolbar-group` |
| `.editor-toolbar-btn` | `.bke-toolbar-btn` |
| `.dropdown` | `.bke-dropdown` |
| `.dropdown-menu` | `.bke-dropdown-menu` |
| `data-block-type` | stays (it's an attribute, not a class) |

**Migration approach:** A single search-and-replace pass on `src/css/editor.css` plus all JS files where `className` is assigned. The block files in `src/blocks/` each assign `block block-<type>` — those become `bke-block bke-block--<type>`.

---

### Priority 3 — Scoped CSS reset (High impact, Low effort)

Add at the top of `src/css/editor.css`:

```css
/* Scoped reset — neutralises host styles within the editor boundary */
.bke-editor,
.bke-editor *,
.bke-editor *::before,
.bke-editor *::after {
    box-sizing: border-box;
}

.bke-editor ul,
.bke-editor ol {
    list-style: none;
    margin: 0;
    padding: 0;
}

.bke-editor li {
    list-style: none;
    margin: 0;
    padding: 0;
}

.bke-editor button {
    font-family: inherit;
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
}

.bke-editor table {
    border-collapse: collapse;
}
```

This makes the task-list `!important` overrides unnecessary and removes the Bootstrap reboot dependency entirely.

---

### Priority 4 — FontAwesome removal / icon abstraction (High impact, Medium-High effort)

**Recommended: icon abstraction layer** (less disruptive than forcing SVG, more future-proof than peer dep only)

```js
// src/Toolbar.js — renderIcon helper
function renderIcon(iconSpec) {
    if (typeof iconSpec === 'function') return iconSpec();
    if (typeof iconSpec === 'string' && iconSpec.startsWith('<')) return iconSpec; // raw SVG/HTML
    return `<i class="fa ${iconSpec}"></i>`; // legacy FA default
}
```

Constructor option to override all icons:

```js
new Editor({
    id: 'my-editor',
    icons: {
        bold:   '<svg viewBox="0 0 24 24" ...>...</svg>',
        // only override what you need; rest fall back to FA
    }
});
```

**Long-term:** Replace all ~17 FA icons with inline SVG from Lucide or Heroicons (MIT licensed, zero external dependency). Each icon is ~200–400 bytes inline. Total: < 8 kB added to bundle vs 75 kB CSS + 280 kB fonts removed.

---

### Priority 5 — Type improvements and event documentation (Medium impact, Low effort)

**Fix `index.d.ts`:**

```ts
declare module '@foreline/blockeditor' {

    // Event name union
    export type EditorEventName =
        | 'content.changed'
        | 'editor.updated'
        | 'block.content.changed'
        | 'focus'
        | 'blur';

    // Typed event payloads
    export interface ContentChangedPayload {
        html: string;
        markdown: string;
        timestamp: number;
    }

    export interface BlockContentChangedPayload {
        blockId: string;
        blockType: string;
        content: string;
        previousContent: string;
        timestamp: number;
    }

    // Overloaded on() signatures
    export class Editor {
        on(event: 'content.changed', callback: (data: ContentChangedPayload) => void): void;
        on(event: 'block.content.changed', callback: (data: BlockContentChangedPayload) => void): void;
        on(event: 'focus' | 'blur', callback: () => void): void;
        on(event: EditorEventName, callback: Function): void;  // fallback
        // ...
    }
}
```

---

### Priority 6 — `destroy()` completeness (Medium impact, Low effort)

**Approach:** Store listener references at construction time and remove them in `destroy()`.

```js
// src/Editor.js — in addListeners()
this._boundHandlers = {
    keydown:     this._handleKeydown.bind(this),
    keyup:       this._handleKeyup.bind(this),
    beforeinput: this._handleBeforeinput.bind(this),
    input:       this._handleInput.bind(this),
    focus:       this._handleFocus.bind(this),
    blur:        this._handleBlur.bind(this),
    click:       this._handleClick.bind(this),
    paste:       this._handlePaste.bind(this),
};

Object.entries(this._boundHandlers).forEach(([event, handler]) => {
    this.instance.addEventListener(event, handler);
});
```

```js
// src/Editor.js — in destroy()
destroy() {
    if (this._boundHandlers && this.instance) {
        Object.entries(this._boundHandlers).forEach(([event, handler]) => {
            this.instance.removeEventListener(event, handler);
        });
        this._boundHandlers = null;
    }
    this.eventEmitter?.cleanup?.();
    this.debugTooltip?.disable();
    Editor._instances.delete(this.instance);
    this.blocks = [];
    this.currentBlock = null;
    this._blockMap = new WeakMap();
    this.debugTooltip = null;
    this.eventEmitter = null;
    this.instance = null;  // prevent stale references
}
```

Making `destroy()` idempotent is automatic once `this.instance` is nulled — the guard `if (this._boundHandlers && this.instance)` prevents double-removal.

---

### Priority 7 — `readonly` implementation (Low-Medium impact, Low effort)

```js
// src/Editor.js — in init()
if (options.readonly) {
    this.instance.removeAttribute('contenteditable');
    this.instance.setAttribute('aria-readonly', 'true');
    this.instance.style.pointerEvents = 'none';
    this.instance.style.userSelect = 'text'; // allow copy but not edit
    // Do not call addListeners() in readonly mode
    // Do not render toolbar
    return;
}
```

```css
/* src/css/editor.css */
.bke-editor[aria-readonly="true"] {
    pointer-events: none;
    user-select: text;
    cursor: default;
}
```

---

## Recommended Release Strategy

This work splits naturally into two releases:

### v0.2.0 — Non-breaking fixes (can ship immediately)

| Item | Risk | Effort |
|---|---|---|
| Fix `declare module 'js-editor'` | None | Trivial |
| Move Bootstrap/FA/Popper to `peerDependencies` | Low | Trivial |
| Fix `initMarkdownContainer` global query | Low | Small |
| Type + document `change` event payloads | None | Small |
| Fix `destroy()` listener cleanup | Low | Small |
| Implement `readonly` mode | Low | Small |

### v1.0.0 — Breaking CSS + dependency removal

| Item | Breaking? | Effort |
|---|---|---|
| Remove Bootstrap dropdown → CSS-only | Yes (Bootstrap CSS classes) | Medium |
| `bke-*` CSS namespace | Yes (all CSS class names) | Medium |
| Scoped CSS reset | No | Small |
| FA → icon abstraction + SVG default | Yes (icon config format) | Medium–High |

The v1.0.0 items should ship together in one breaking release with a migration guide. Shipping them piecemeal forces consumers to update twice.

---

## What to Do Next

1. **Create issues** in `ISSUES.md` or `dev-docs/issues/` for each item in v0.2.0 — they can be assigned and tracked individually
2. **Create an ADR** for the CSS namespace decision (`bke-` vs `[data-bke-root]`) — it affects every file in the project
3. **Create an ADR** for icon strategy (FA peer dep vs SVG inline vs abstraction layer)
4. **Spike the Bootstrap removal** in a branch to measure actual diff size before committing to the full CSS rename

---

## Risk Register

| Risk | Mitigation |
|---|---|
| CSS rename breaks existing consumer overrides | Major semver bump + migration guide in CHANGELOG |
| CSS-only dropdown breaks keyboard navigation (a11y) | Add `aria-haspopup`, `aria-expanded`, keyboard handler (Enter/Escape/Arrow) |
| Icon abstraction adds API surface that's hard to remove | Keep it minimal: `icons` option is a plain `Record<string, string>` — no callbacks needed |
| `destroy()` change causes regressions in tests that assume listener state | Update test setup to call `destroy()` and assert listener absence |
