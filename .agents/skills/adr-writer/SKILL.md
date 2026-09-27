---
name: adr-writer
description: Create Architecture Decision Records (ADRs) for the BlockEditor project. Use this when recording significant architectural decisions, documenting technical trade-offs, capturing the context and rationale behind design choices, or explaining why a particular approach was chosen over alternatives.
---

# ADR Writer

Create Architecture Decision Records following project conventions for naming, structure, and linking.

## Location

All ADRs must be in: `dev-docs/adr/`

Subdirectories are allowed for grouping related ADRs (e.g., `dev-docs/adr/state_machine/`).

## Naming Convention

### Format
```
XX. SHORT_DESCRIPTION.md
```

Where:
- `XX` — two-digit incremental number (00, 01, 02…)
- `SHORT_DESCRIPTION` — brief description in UPPERCASE with underscores
- English only, underscores between words

Before creating a new ADR, check existing files in `dev-docs/adr/` (and any subdirectories) and use the next incremental number within the target directory.

### Examples
```
00. CONTENT_STALENESS.md
01. BLOCK_SERIALIZATION.md
02. EVENT_DEBOUNCING.md
```

## ADR Template

Every ADR must follow this structure:

```markdown
# ADR-XX: [Title]

## Status
Proposed | Accepted | Deprecated | Superseded by ADR-XX | Resolved

## Context
- What situation or problem prompted this decision?
- What constraints, requirements, or forces are at play?
- Link to relevant `ISSUES.md` items, `SPECS.md` sections, or proposals in `dev-docs/proposals/`

## Decision

Describe the decision that was made and the approach chosen.

### Design
- Which components are affected? (`Editor.js`, block classes, `Toolbar.js`, `Parser.js`, etc.)
- Does this introduce new classes or modify existing ones?
- Are there any circular dependency risks (block ↔ toolbar)?
- Include diagrams, tables, or code snippets where they clarify the design

## Alternatives Considered

| Alternative | Pros | Cons | Why rejected |
|-------------|------|------|--------------|
| ... | ... | ... | ... |

## Consequences

### Positive
- Benefits and improvements resulting from this decision

### Negative
- Trade-offs, limitations, or new constraints introduced

### Neutral
- Side effects that are neither clearly positive nor negative

## Related
- **Proposals**: link to `dev-docs/proposals/` documents if applicable
- **ADRs**: link to related ADRs (superseded, dependent, or complementary)
- **Issues**: link to `ISSUES.md` items addressed by this decision
- **Specs**: link to `SPECS.md` sections affected
```

## Guidelines

- **One decision per ADR** — keep each record focused on a single architectural decision; split compound decisions into separate ADRs
- **Immutable once accepted** — do not modify accepted ADRs; instead, create a new ADR that supersedes the old one and update the old ADR's status to `Superseded by ADR-XX`
- **Record context, not just conclusions** — the most valuable part of an ADR is *why* a decision was made, not just *what* was decided
- **Reference existing architecture** — mention instance-based Editor, BaseBlock contract, toolbar groups, event system with debouncing where relevant
- **Follow SOLID principles** — decisions should not bloat existing classes or introduce unnecessary coupling
- **Consider state flags** (`isCreatingBlock`, `isConvertingBlock`) when the decision touches the update cycle
- **Link to related documents** — cross-reference `ISSUES.md`, `SPECS.md`, proposals, and other ADRs to maintain traceability
- **Use tables for block-specific details** — when a decision affects multiple block types, summarize per-block impact in a table (see ADR-00 for an example)
- **Include performance considerations** if the decision touches `Editor.update()`, `Parser`, or conversion flows
