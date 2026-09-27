---
name: inbox-writer
description: Capture raw ideas, proposals, issues, and bug reports into the dev-docs/_inbox/ directory with a consistent structured format. Use this when the user wants to record an idea or concept that needs triage before becoming a formal proposal, ADR, or issue.
---

# Inbox Writer

Capture incoming ideas and concepts into `dev-docs/_inbox/` with consistent YAML frontmatter and structure for downstream triage.

## Location

All inbox items must be placed in: `dev-docs/_inbox/`

## Naming Convention

### Format
```
XX. SHORT_DESCRIPTION.md
```

Where:
- `XX` — two-digit incremental number (00, 01, 02…)
- `SHORT_DESCRIPTION` — brief description in UPPERCASE with underscores
- English only, underscores between words

Before creating a new inbox item, check existing files in `dev-docs/_inbox/` and use the next incremental number.

### Examples
```
00. GHOST_TEXT_MODE.md
01. PLUGIN_SYSTEM.md
02. COLLABORATIVE_EDITING.md
```

## Inbox Item Template

Every inbox item must start with YAML frontmatter followed by a structured body:

```markdown
---
title: "Short descriptive title"
type: idea | proposal | issue | bug
priority: low | medium | high | critical
status: inbox
date: YYYY-MM-DD
---

# [Title]

## Summary
One-paragraph overview: what is the idea and why does it matter?

## Motivation
- What problem does this solve or what opportunity does it open?
- Who benefits? (developer experience, end users, integrators)
- Any related issues or requests that prompted this?

## Rough Scope
- Which parts of the editor might be affected?
- Is this a new component, a modification, or an integration?
- Any known constraints or dependencies?

## Open Questions
- What needs to be researched or prototyped before this can move forward?
- Are there competing approaches to evaluate?

## References
- Links to external resources, similar implementations, related `ISSUES.md` items, or `SPECS.md` sections
```

## Guidelines

- **Capture, don't design** — inbox items are raw ideas, not polished proposals. Include enough context to understand the idea but don't try to solve all design questions here.
- **One idea per item** — keep each document focused on a single concept. If an idea has sub-ideas, mention them but create separate inbox items for each.
- **Use the frontmatter** — the `type`, `priority`, and `status` fields enable mechanical triage. Always fill them in.
- **Status transitions**: `inbox` → triaged → routed (then the item is moved or deleted from `_inbox/`)
- **Be honest about unknowns** — the Open Questions section is the most valuable part for triage. Don't leave it empty.

## Triage Routing

After triage, inbox items are routed based on their `type`:

| Type | Destination | Skill |
|------|-------------|-------|
| `idea` | Stays in `_inbox/` until refined, then becomes a `proposal` | — |
| `proposal` | `dev-docs/proposals/` | `proposal-writer` |
| `issue` | `dev-docs/issues/` or `ISSUES.md` | — |
| `bug` | `ISSUES.md` (Bugs section) | — |
