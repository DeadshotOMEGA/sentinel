# Implementation Plans Index

**Purpose:** Central registry of all implementation plans

**Last Updated:** 2026-01-19

---

## Active Plans

Currently executing plans tracked here:

| Plan | Started | Status | Current Phase | Progress |
|------|---------|--------|---------------|----------|
| [Backend Rebuild](active/backend-rebuild-plan.md) | 2026-01-15 | 🔄 Active | Phase 2 | Core Infrastructure ✅ |
| [AI-First Documentation System](active/2026-01-19-ai-first-documentation-system.md) | 2026-01-19 | 🔄 Active | Phase 1 | CLAUDE.md files |
| [Better-Auth Plugin Integration](active/2026-01-19-better-auth-plugin-integration.md) | 2026-01-19 | 🔄 Active | Phase 2.2 | Ready to implement |

**Total Active:** 3

---

## Completed Plans

Successfully finished plans:

| Plan | Completed | Duration | Outcome |
|------|-----------|----------|---------|
| *None yet* | - | - | - |

**Total Completed:** 0

---

## Archived Plans

Plans that were cancelled, superseded, or no longer relevant:

| Plan | Archived | Reason | Superseded By |
|------|----------|--------|---------------|
| *None yet* | - | - | - |

**Total Archived:** 0

---

## Plan Statistics

- **Active:** 2
- **Completed:** 0
- **Archived:** 0
- **Success Rate:** N/A (no completed plans yet)
- **Average Duration:** N/A

---

## Creating New Plans

**When to create a plan:**
- Multi-phase work (3+ steps)
- Timeline > 1 week
- Multiple systems involved
- Architecture decisions required

**How to create:**
1. Copy template: `cp docs/templates/plan.md docs/plans/active/YYYY-MM-DD-plan-name.md`
2. Fill in frontmatter with lifecycle metadata
3. Write phases with clear tasks and success criteria
4. Add to this index

**See:** [Plans CLAUDE.md](CLAUDE.md) for format guide

---

## Review Schedule

**Active plans:** Review weekly
- Update progress tracking
- Check relevance
- Adjust timeline
- Update `reviewed` date

**Completed plans:** Review when referenced
- Verify accuracy
- Update if used as template

---

## Related Documentation

- [Plans Format Guide](CLAUDE.md) - How to write plans
- [Plan Template](../templates/plan.md) - Starting template
- [ADR Index](../decisions/adr/index.md) - Related decisions
- [Backend Rebuild Plan](active/backend-rebuild-plan.md) - Current major effort
