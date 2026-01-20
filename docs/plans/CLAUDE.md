# Implementation Plans (AI-First Guide)

**Purpose:** Plan lifecycle management and format guide

**AI Context Priority:** high

**When to Load:** Creating/updating plans, checking plan status, planning new work

---

## Quick Reference

### What Goes Here

Implementation plans with clear phases, deliverables, and success metrics.

**Structure:**
```
plans/
├── index.md              # All plans with status
├── active/               # Currently executing
│   ├── backend-rebuild-plan.md
│   └── 2026-01-20-feature-name.md
└── completed/            # Historical record
    └── 2026-01-15-completed-plan.md
```

### When to Create Plans

**Create plan when:**
- Work spans multiple phases (3+ steps)
- Multiple systems involved
- Timeline > 1 week
- Requires coordination
- Architecture decisions needed
- User explicitly requests plan

**Skip plan when:**
- Single file change
- Obvious implementation
- < 1 day work
- No design decisions

---

## Plan Lifecycle

### States

Plans move through these states:

```
draft → active → completed
              ↓
           archived
              ↓
         superseded
```

**draft:** Being written, not yet approved
**active:** Currently executing, in `active/` directory
**completed:** Finished, moved to `completed/` directory
**archived:** No longer relevant, context changed
**superseded:** Replaced by newer plan

### State Transitions

**draft → active:**
- User approves plan
- Move to `active/` directory
- Update `lifecycle: active` in frontmatter
- Start work

**active → completed:**
- All phases finished
- All deliverables complete
- Success metrics met
- Move to `completed/` directory
- Update `lifecycle: completed`
- Add completion date

**active → archived:**
- Plan cancelled or deprioritized
- Context changed making plan obsolete
- Update `lifecycle: archived`
- Note reason in update log

**active → superseded:**
- New plan replaces this one
- Add `superseded_by:` link in frontmatter
- Update `lifecycle: superseded`
- Keep in `active/` or move to `completed/`

---

## File Naming

### Pattern

`YYYY-MM-DD-descriptive-title.md`

**Why date prefix:**
- Chronological sorting
- Instant recognition of age
- Prevents name collisions

**Examples:**
- `2026-01-19-ai-first-documentation-system.md`
- `2026-01-15-backend-rebuild.md`
- `2026-02-01-phase-2-infrastructure.md`

### Living Document Exception

Active plans that are continuously updated can omit date:
- `backend-rebuild-plan.md` ✅ (if actively updated weekly)
- But prefer dated names when plan is time-boxed

**Rule of thumb:**
- Time-boxed plan (finite) → Use date
- Living document (ongoing) → Optional date

---

## Required Frontmatter

### Standard Fields

```yaml
---
type: plan
title: "Feature/Goal Implementation Plan"
status: draft | active | completed
created: YYYY-MM-DD
last_updated: YYYY-MM-DD
---
```

### Lifecycle Fields (Required for Plans)

```yaml
---
# ... standard fields ...
lifecycle: draft | active | completed | archived | superseded
reviewed: YYYY-MM-DD           # Last review date
expires: YYYY-MM-DD            # When to review for staleness (optional)
superseded_by: path/to/new.md  # Only if superseded
related_code:
  - path/to/affected/code/
  - apps/backend/src/
---
```

### AI Metadata (Recommended)

```yaml
---
# ... other fields ...
ai:
  priority: high              # Plans are high priority
  context_load: always        # Load when working on related code
  triggers: [plan, implementation, feature-name]
  token_budget: 2000          # Plans can be large
---
```

---

## Plan Structure

### Required Sections

**1. Executive Summary**
- One paragraph: what, why, key changes
- Timeline estimate
- Related plans/decisions

**2. Current State**
- What exists now
- Problems with current state
- What's changing

**3. Goals**
- Primary goals (measurable)
- Secondary goals (nice-to-have)
- Non-goals (explicitly out of scope)

**4. Implementation Phases**
- Phase 1: [Name] (Timeline)
  - Goal
  - Tasks (checkboxes)
  - Deliverables
  - Success criteria
  - Files changed
- Phase 2: ...
- Phase N: ...

**5. Success Metrics**
- Technical metrics (coverage, performance)
- Business metrics (if applicable)
- Quality metrics

**6. Risks & Mitigations**
- Table: Risk | Probability | Impact | Mitigation

**7. Dependencies**
- Technical dependencies
- Team dependencies
- External dependencies

**8. Progress Tracking**
- Phase status updates
- Blockers
- Timeline adjustments

### Optional Sections

- **Timeline Details** - Gantt chart, milestones
- **Team Assignments** - Who owns what
- **Budget** - Resource allocation
- **Testing Strategy** - How to validate
- **Rollback Plan** - How to undo if needed

---

## Writing Good Plans

### Executive Summary

**Good:**
> Convert Sentinel backend from Bun to Node.js 22 with testing-first approach. Key changes: monorepo structure, better-auth adoption, ts-rest contracts. Timeline: 8 weeks across 4 phases.

**Bad:**
> This plan outlines our comprehensive strategy for modernizing the backend architecture through a series of carefully considered phases that will ultimately result in a more maintainable and testable codebase.

**Why:** Good version is concise, specific, actionable. Bad version is verbose, vague, fluffy.

### Goals

**Good:**
```markdown
## Goals

**Primary:**
1. Achieve 80%+ test coverage (from 40%)
2. Migrate all 14 repositories with integration tests
3. Zero production bugs during migration

**Secondary:**
1. Improve query performance < 100ms
2. Generate OpenAPI documentation

## Non-Goals

- Frontend migration (separate effort)
- Data migration (handled separately)
- Performance optimization (post-migration)
```

**Bad:**
```markdown
## Goals

- Make the system better
- Improve code quality
- Modernize the stack
```

**Why:** Good version is specific, measurable, with clear non-goals. Bad version is vague, unmeasurable.

### Implementation Phases

**Good:**
```markdown
### Phase 1: Testing Foundation (Weeks 1-2)

**Goal:** Establish Testcontainers infrastructure

**Tasks:**
- [ ] Set up Testcontainers helper class
- [ ] Configure Vitest with coverage
- [ ] Create test factories
- [ ] Write example repository test

**Deliverables:**
- [ ] TestDatabase class with reuse
- [ ] 90%+ coverage on first repository
- [ ] Documentation in tests/CLAUDE.md

**Success Criteria:**
- Tests run in < 30s
- Coverage thresholds enforced in CI
- Zero flaky tests

**Files Changed:**
- `apps/backend/tests/helpers/testcontainers.ts` (new)
- `apps/backend/vitest.config.ts` (new)
```

**Bad:**
```markdown
### Phase 1: Setup

Do testing stuff. Make it work.
```

**Why:** Good version has clear goal, tasks, deliverables, criteria. Bad version is useless.

---

## Update Management

### When to Update Plans

**Update plan when:**
- Scope changes
- New blockers discovered
- Timeline adjusts
- Dependencies change
- Phase completes
- Major progress made

**How often:** Weekly for active plans

### Update Log Format

Add at bottom of plan:

```markdown
## Update Log

### 2026-01-20
- Completed Phase 1 (all 14 repositories migrated)
- Discovered: Missing enum tables in schema
- Added Phase 1.5 for enum migration
- Timeline: +1 week

### 2026-01-15
- Started Phase 1
- Set up Testcontainers infrastructure

### 2026-01-10
- Initial plan creation
- Plan approved by team
```

**Include:**
- Date of update
- What changed
- Why it changed
- Impact on timeline/scope

---

## Review & Staleness

### Review Schedule

**Active plans:** Review weekly
- Update progress tracking
- Check if still relevant
- Adjust timeline if needed
- Update `reviewed` date in frontmatter

**Completed plans:** Review when referenced
- Verify information still accurate
- Update if used as template
- Link to related new plans

### Staleness Detection

Plans become stale when:
- `reviewed` date > 90 days old
- Related code changed significantly
- Assumptions no longer valid
- Better approach discovered

**When plan is stale:**
1. Review and update
2. OR mark as `archived` with reason
3. OR mark as `superseded` and create new plan

### Expires Field

Optional but helpful:

```yaml
expires: 2026-03-01  # Review after this date
```

System can alert when plans expire without review.

---

## Examples

### Good Plan Example

**File:** `plans/active/2026-01-19-ai-first-documentation-system.md`

**Characteristics:**
- Clear executive summary
- Specific, measurable goals
- Detailed phases with checkboxes
- Success metrics defined
- Risks identified with mitigations
- Regular updates logged
- Complete frontmatter with lifecycle metadata

**See:** [AI-First Documentation System Plan](active/ai-first-documentation-system.md)

### Living Document Example

**File:** `plans/active/backend-rebuild-plan.md`

**Characteristics:**
- Continuously updated (no date in filename)
- Tracks multi-week project
- Progress section updated weekly
- Comprehensive phase breakdown
- Success metrics updated as phases complete

**See:** [Backend Rebuild Plan](active/backend-rebuild-plan.md)

---

## Anti-Patterns

### ❌ Vague Goals

```markdown
## Goals
- Improve the system
- Make it better
- Modernize
```

**Fix:** Be specific and measurable:
```markdown
## Goals
- Achieve 80%+ test coverage
- Reduce query time to < 100ms
- Support 1000+ concurrent users
```

### ❌ No Progress Tracking

Plan created but never updated. Status unknown.

**Fix:** Update weekly:
```markdown
## Progress Tracking

### Phase 1: Completed ✅ (2026-01-15)
- All tasks done
- Delivered on time

### Phase 2: In Progress 🔄 (Started 2026-01-16)
- Tasks: 3/5 complete
- Blocker: Waiting on API key approval
```

### ❌ Missing Success Criteria

How do you know when done?

**Fix:** Define clear criteria:
```markdown
**Success Criteria:**
- All 14 repositories migrated
- 90%+ test coverage
- Zero production bugs
- CI/CD pipeline passing
```

### ❌ No Risk Assessment

Surprised by problems that could have been anticipated.

**Fix:** Identify risks upfront:
```markdown
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Testcontainers slow | High | Medium | Use container reuse |
| Schema changes break prod | Low | High | Test on staging first |
```

---

## Plan vs. Other Docs

### Plan vs. ADR

**Plan:**
- How to implement
- Phases, timeline, tasks
- Execution-focused
- Updates frequently

**ADR:**
- What was decided and why
- Alternatives considered
- Decision-focused
- Rarely updates (immutable)

**Relationship:** Plans may reference ADRs, ADRs may link to plans

### Plan vs. RFC

**Plan:**
- Approved approach
- Implementation details
- Currently executing

**RFC:**
- Proposal for discussion
- Seeking consensus
- Not yet approved

**Relationship:** RFC → discussion → ADR → Plan

### Plan vs. Research

**Plan:**
- How to build something
- Implementation-focused
- Action items

**Research:**
- Investigation findings
- Analysis-focused
- Recommendations

**Relationship:** Research informs plans

---

## Index Management

### plans/index.md

Keep updated with all plans:

```markdown
# Implementation Plans Index

## Active Plans

| Plan | Started | Status | Progress |
|------|---------|--------|----------|
| [AI-First Docs](active/2026-01-19-ai-first-documentation-system.md) | 2026-01-19 | Active | Phase 1: 100% |
| [Backend Rebuild](active/backend-rebuild-plan.md) | 2026-01-15 | Active | Phase 1: 100% |

## Completed Plans

| Plan | Completed | Outcome |
|------|-----------|---------|
| [Phase 1 Repositories](completed/2026-01-19-repository-migration.md) | 2026-01-19 | Success ✅ |

## Archived Plans

| Plan | Archived | Reason |
|------|----------|--------|
| [Old Approach](completed/2025-12-01-old-plan.md) | 2026-01-10 | Superseded |
```

Update when:
- New plan created
- Plan moves to completed
- Plan archived
- Progress milestones reached

---

## Related Documentation

**Creating plans:**
- [Plan Template](../templates/plan.md)
- [Template Usage Guide](../templates/CLAUDE.md)

**Plan examples:**
- [AI-First Documentation System](active/ai-first-documentation-system.md)
- [Backend Rebuild](active/backend-rebuild-plan.md)

**Related governance:**
- [ADRs](../decisions/adr/CLAUDE.md)
- [RFCs](../decisions/rfc/CLAUDE.md)

**Style guides:**
- [Root CLAUDE.md](../CLAUDE.md)
- [Style Guide](../meta/style-guide.md) (coming soon)

---

**Last Updated:** 2026-01-19
