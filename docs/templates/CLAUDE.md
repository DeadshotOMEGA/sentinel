# CLAUDE Rules: Document Templates

## Scope

Applies when creating documentation in: `docs/templates/`

## Non-Negotiables (MUST / MUST NOT)

- MUST provide 9 templates: tutorial, howto, reference, explanation, adr, rfc, plan, research, session-report
- MUST include complete frontmatter (type, title, status, created, last_updated)
- MUST include AI metadata (priority, context_load, triggers, token_budget)
- MUST include lifecycle fields for temporal docs (plans, research, sessions)
- MUST use `.md` extension
- MUST copy template to destination, then customize (never leave placeholders)

## Defaults (SHOULD)

- SHOULD select template by document type (tutorial → teaching, howto → task, reference → specs, explanation → concepts, adr → decisions, rfc → proposals, plan → implementation, research → investigation, session-report → work session)
- SHOULD validate frontmatter completeness before publishing

## Workflow

1. Determine document type (Diátaxis classification)
2. Copy appropriate template from `docs/templates/`
3. Update all frontmatter fields (type, title, status, dates, AI metadata)
4. Follow file naming convention for destination
5. Cross-reference related documents
