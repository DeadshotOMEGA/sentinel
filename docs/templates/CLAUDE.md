# CLAUDE Rules: Document Templates

## Scope
Applies when creating documentation in: `docs/templates/`

## Non-Negotiables (MUST / MUST NOT)

**Template Files**:
- MUST provide 9 templates: tutorial, howto, reference, explanation, adr, rfc, plan, research, session-report
- MUST include complete frontmatter in each template
- MUST include section structure guidance
- MUST use `.md` extension

**Frontmatter Requirements**:
- MUST include: type, title, status, created, last_updated
- MUST include AI metadata (priority, context_load, triggers, token_budget)
- MUST include lifecycle fields for temporal docs (plans, research, sessions)

**Template Usage**:
- MUST copy template to destination, then customize
- MUST update all frontmatter fields (never leave placeholders)
- MUST follow file naming conventions from root CLAUDE.md

## Defaults (SHOULD)

**When Using Templates**:
- SHOULD start with appropriate template for document type
- SHOULD preserve frontmatter structure
- SHOULD customize AI metadata triggers for content
- SHOULD validate frontmatter completeness before publishing

**Template Selection**:
- Teaching → `tutorial.md`
- Task-oriented → `howto.md`
- Specifications → `reference.md`
- Concepts/why → `explanation.md`
- Decisions → `adr.md`
- Proposals → `rfc.md`
- Implementation → `plan.md`
- Investigation → `research.md`
- Work session → `session-report.md`

## Workflow

**When creating new documentation**:
1. Determine document type (Diátaxis classification)
2. Copy appropriate template from `docs/templates/`
3. Update frontmatter (title, status, dates, AI metadata)
4. Fill in content following template structure
5. Follow file naming convention for destination
6. Cross-reference related documents

**Template copy commands**:
```bash
cp docs/templates/howto.md docs/guides/howto/[task].md
cp docs/templates/adr.md docs/decisions/adr/NNNN-[title].md
cp docs/templates/plan.md docs/plans/active/YYYY-MM-DD-[name].md
```

## Quick Reference

**Available Templates**:
1. [tutorial.md](tutorial.md) - Learning-oriented guides
2. [howto.md](howto.md) - Task-oriented solutions
3. [reference.md](reference.md) - Complete specifications
4. [explanation.md](explanation.md) - Conceptual understanding
5. [adr.md](adr.md) - Architecture Decision Records
6. [rfc.md](rfc.md) - Request for Comments
7. [plan.md](plan.md) - Implementation plans
8. [research.md](research.md) - Investigation documents
9. [session-report.md](session-report.md) - Session summaries

**Required Frontmatter Fields**:
- `type` - Must match template type
- `title` - Descriptive, matches filename
- `status` - draft | review | published | deprecated
- `created` - YYYY-MM-DD (today's date)
- `last_updated` - YYYY-MM-DD (same as created initially)

**AI Metadata** (recommended):
- `priority` - high | medium | low | reference-only
- `context_load` - always | on-demand | never
- `triggers` - Array of keywords
- `token_budget` - Estimated tokens

**Related**:
- [Root CLAUDE.md](../CLAUDE.md) - File naming conventions
- [Creating Documentation Guide](../CLAUDE.md#creating-new-documentation)
