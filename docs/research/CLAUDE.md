# CLAUDE Rules: Research Documentation

## Scope
Applies when creating documentation in: `docs/research/`

## Non-Negotiables (MUST / MUST NOT)

**File Naming**:
- MUST use date prefix: `YYYY-MM-DD-topic.md`
- MUST use research start date
- MUST use kebab-case for topic

**Structure**:
- MUST include: Hypothesis/Question, Methodology, Findings, Analysis, Recommendation
- MUST document honest findings (including negative results)
- MUST include detailed methodology for reproducibility
- MUST link to resulting RFC, ADR, or Plan

**Status**:
- MUST use lifecycle status: Active or Completed

## Defaults (SHOULD)

**Content Quality**:
- SHOULD provide clear hypothesis
- SHOULD document detailed methodology
- SHOULD include quantitative data when possible
- SHOULD be honest about findings (positive and negative)

**Organization**:
- SHOULD maintain index.md with active and completed research
- SHOULD cross-reference to decisions and plans that resulted

## Workflow

**When conducting research**:
1. Create file with today's date
2. Define clear hypothesis or question
3. Document methodology
4. Record findings as discovered
5. Update to Completed when finished
6. Link to resulting RFC, ADR, or Plan

**Research outcomes**:
- Findings inform RFCs (proposals)
- Results inform ADRs (decisions)
- Data guides Plans (implementation)

## Quick Reference

**Purpose**: Investigation and research findings documentation

**File Pattern**: `YYYY-MM-DD-topic.md`

**Examples**:
- `2026-01-15-testcontainers-evaluation.md`
- `2026-01-18-orm-performance-comparison.md`
- `2026-01-20-websocket-libraries-research.md`

**Lifecycle**:
```
Question → Research (active) → Findings → Recommendation → Completed
                                             ↓
                                        RFC/ADR/Plan
```

**Related**:
- [ADRs](../decisions/adr/CLAUDE.md) - Architecture decisions
- [RFCs](../decisions/rfc/CLAUDE.md) - Proposals
- [Plans](../plans/CLAUDE.md) - Implementation plans
- [Research Template](../templates/research.md)
