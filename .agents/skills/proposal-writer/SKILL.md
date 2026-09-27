---
name: proposal-writer
description: Create architectural proposals and design documents for the BlockEditor project. Use this when suggesting new features, proposing architectural changes, refactoring strategies, documenting design decisions, or discussing complex implementation approaches.
---

# Proposal Writer

Create architectural proposals and design documents following project conventions for naming, structure, and linking.

## Location

All proposals must be in: `dev-docs/proposals/`

## Naming Convention

### Format
```
XX. SHORT_DESCRIPTION.md
```

Where:
- `XX` — two-digit incremental number (01, 02, 03…)
- `SHORT_DESCRIPTION` — brief description in UPPERCASE with underscores
- English only, underscores between words

Before creating a new proposal, check existing files in `dev-docs/proposals/` and use the next incremental number.

### Examples
```
01. BLOCK_PLUGIN_SYSTEM.md
02. VIRTUAL_DOM_STRATEGY.md
03. ACCESSIBILITY_IMPROVEMENTS.md
```

## Proposal Template

Every proposal must follow this structure:

```markdown
# [Title]

## Status
Draft | Under Review | Accepted | Rejected | Superseded by XX

## Summary
One-paragraph overview of what is proposed and why.

## Motivation
- What problem does this solve?
- Link to relevant `ISSUES.md` items or `SPECS.md` sections

## Design

### Architecture
- Which components are affected? (`Editor.js`, block classes, `Toolbar.js`, `Parser.js`, etc.)
- Does this introduce new classes or modify existing ones?
- Are there any circular dependency risks (block ↔ toolbar)?

### Block Contract Impact
- Does this change the block contract (instance/static methods, properties)?
- Are new block types added? Follow `src/blocks/` patterns

### DOM Changes
- Any new `data-*` attributes, CSS classes (`block block-<type>`), or structural changes?

### API Surface
- New instance methods on Editor? (no new static methods)
- Event system changes?

## Alternatives Considered
Brief description of rejected approaches and why.

## Implementation Plan
- [ ] Step 1 — description (component/file affected)
- [ ] Step 2 — description
- [ ] Step N — description

## Testing Strategy
- Which test files to create or update in `tests/`
- Key scenarios to cover

## Documentation Impact
- [ ] `SPECS.md` — sections to add/update
- [ ] `dev-docs/BLOCK_ARCHITECTURE.md`
- [ ] `dev-docs/BLOCK_TOOLBAR_INTEGRATION.md`
- [ ] `dev-docs/EVENT_SYSTEM.md`
- [ ] `dev-docs/TOOLBAR_GROUPS.md`
- [ ] `ISSUES.md` — mark related items
- [ ] `CHANGELOG.md`
- [ ] `README.md`

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| ... | ... | ... |
```

## Guidelines

- Reference existing architecture: instance-based Editor, BaseBlock contract, toolbar groups, event system with debouncing
- Follow SOLID principles — proposals should not bloat existing classes
- Consider the state flags (`isCreatingBlock`, `isConvertingBlock`) when proposing changes to the update cycle
- Link to specific `ISSUES.md` items when the proposal addresses known issues
- Keep proposals focused — one concern per document; split large changes into multiple proposals
- Include performance considerations if the change touches `Editor.update()`, `Parser`, or conversion flows
