---
name: git-commit
description: Commit staged changes for the BlockEditor repository using Conventional Commits. Updates CHANGELOG.md before each code commit, splits commits by feature/issue, and can run npm version after the batch. Pass an optional message for additional commit context.
---

# Git Commit

Create focused, Conventional Commits for the **BlockEditor** repository — a vanilla JavaScript WYSIWYG editor with a block-based architecture.

## Workflow

1. **Inspect staged changes**
   - Run `git diff --staged --stat`.
   - If nothing is staged, run `git add -A` and re-check.
2. **Review the diff**
   - Run `git diff --staged`.
3. **Classify changes**
   - Group files by feature, component, or issue.
4. **Split commits by concern (mandatory)**
   - If staged files belong to different features or different issues, do **not** combine them.
   - Create one commit per feature or issue.
   - Present the planned commits to the user and confirm before executing any git mutation.
5. **Update CHANGELOG.md before each code commit**
   - Map the commit type to a changelog section:
     - `feat` → **Added**
     - `fix` → **Fixed**
     - `refactor` / `perf` → **Changed**
   - Stage both the code changes and `CHANGELOG.md` together in the same commit.
6. **Generate Conventional Commit messages in English.**
7. **Optional version bump (confirm first)**
   - Only when the user explicitly asks for a release or version bump.
   - Review commits since the last tag with `git log $(git describe --tags --abbrev=0)..HEAD --oneline`.
   - Propose the bump based on the *batch* of changes:
     - **PATCH** (default): bug fixes, refactors, performance, minor enhancements, docs
     - **MINOR** (rare in 0.x): significant new feature sets, major architectural improvements, breaking API refinements
     - **MAJOR**: only for 1.0+; not used during the 0.x pre-stable phase
   - Confirm with the user before running `npm version <type-or-version>` to bump `package.json`, create a version commit, and generate a git tag.

## Scopes

Prefer scopes that match this codebase:

| Scope | Area |
|-------|------|
| `editor` | `Editor.js` — lifecycle, state, rendering, paste |
| `blocks` | `src/blocks/` block classes in general |
| `paragraph` / `heading` / `code-block` / `table-block` / `list-block` / `quote-block` / `delimiter-block` / `image-block` / `task-list` | Individual block type |
| `toolbar` | `Toolbar.js`, `ToolbarHandlers.js` |
| `parser` | `Parser.js`, markdown/HTML conversion, sanitization |
| `keyhandler` | `KeyHandler.js` |
| `events` | Event system, debouncing |
| `debug` | `DebugTooltip.js` |
| `styles` | CSS/SCSS files in `src/css/` and `src/scss/` |
| `build` | Vite config, post-build scripts, package config |
| `docs` | Documentation, `dev-docs/`, `CHANGELOG.md` |
| `tests` | Jest unit tests in `tests/` |
| `e2e` | Playwright E2E tests in `e2e/` |

When a change touches a single block type, use the block name as scope.

## Commit Format

```
<type>(<scope>): <short imperative summary>

<optional body: what changed and why>

Refs: #123
```

### Types

- `feat` — new functionality
- `fix` — bug fix
- `refactor` — internal restructuring without behavior change
- `docs` — documentation-only changes
- `style` — formatting-only changes (CSS, whitespace, semicolons)
- `chore` — maintenance, tooling, dependencies, housekeeping
- `perf` — performance improvements
- `test` — adding or updating tests

### Rules

- Subject line in English, imperative mood, max 72 characters.
- Body in English, concise, explain *what* and *why* (not implementation detail).
- Add issue references when available.
- Do not commit unrelated changes together.

### Examples

```
feat(code-block): implement applyTransformation for markdown trigger

Allow triple-backtick trigger to convert paragraph into code block.
Refs: #5
```

```
fix(editor): prevent race condition during block type conversion

Guard ensureDefaultBlock with isConvertingBlock flag to avoid duplicate blocks.
```

```
fix(debug): show correct content after block removal
```

```
test(e2e): add cross-block deletion tests
```

```
docs: update SPECS.md with task list preprocessing rules
```

## Notes

- In the **0.x.y phase**, versions grow intentionally — not automatically with every commit. Mature releases are infrequent and deliberate.
- `npm version` automatically bumps `package.json`, creates a version commit, generates an annotated tag, and aligns the git tag with the npm version.
- Push only when the user explicitly asks: `git push origin main --tags`.
