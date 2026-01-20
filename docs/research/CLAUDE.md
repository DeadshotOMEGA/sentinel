# Research Documentation (AI-First Guide)

**Purpose:** Investigation and research findings documentation

**AI Context Priority:** medium

**When to Load:** User researching options, investigating issues, evaluating tech

**Triggers:** research, investigation, evaluation, compare, analysis

---

## Quick Reference

### What Goes Here

Research and investigation documents:
- Technology evaluations
- Performance comparisons
- Issue investigations
- Feasibility studies
- Competitive analysis

### File Naming

**Pattern:** `YYYY-MM-DD-topic.md`

**Examples:**
- `2026-01-15-testcontainers-evaluation.md`
- `2026-01-18-orm-performance-comparison.md`
- `2026-01-20-websocket-libraries-research.md`

**Date:** Research start date

---

## When to Create Research Docs

**Create research when:**
- Evaluating technology options
- Comparing approaches
- Investigating issues
- Analyzing performance
- Need data to inform decision

**Outcome:**
- Findings inform RFCs
- Results inform ADRs
- Data guides implementation plans

---

## Research Structure

### Required Sections

```markdown
# Research: Title

**Status:** Active | Completed

**Date:** YYYY-MM-DD

**Researcher:** Name

## Hypothesis / Question

What are we trying to find out?

## Methodology

How did we investigate?

## Findings

What did we discover?

## Analysis

What does this mean?

## Recommendation

What should we do?

## References

- Links
- Sources
- Related docs
```

---

## Research Lifecycle

### States

**Active:** Research in progress
**Completed:** Research finished, findings documented

### Progression

```
Question → Research (active) → Findings → Recommendation → Completed
                                               ↓
                                          RFC/ADR/Plan
```

---

## Writing Good Research Docs

### Do

✅ **Clear hypothesis**
```markdown
## Hypothesis

Testcontainers will provide better test reliability than in-memory
databases while keeping test execution under 60 seconds.
```

✅ **Detailed methodology**
```markdown
## Methodology

1. Set up Testcontainers with PostgreSQL
2. Implement container reuse
3. Run full repository test suite
4. Measure:
   - Test execution time
   - False positive rate
   - Setup complexity
5. Compare against in-memory H2 baseline
```

✅ **Honest findings**
```markdown
## Findings

**Performance:**
- Testcontainers: 45s for 477 tests
- H2 in-memory: 12s for 477 tests

**Reliability:**
- Testcontainers: 0 false positives
- H2: 15 false positives (foreign key issues)

**Verdict:** Speed trade-off worth the reliability gain
```

### Don't

❌ **Be vague**
```markdown
## Findings

Testcontainers is better.

[No data, no details]
```

❌ **Skip methodology**
```markdown
## Findings

After testing, we found...

[How did you test? No way to reproduce]
```

---

## Research Outcomes

### Leads to RFC
```markdown
<!-- research/2026-01-20-realtime-options.md -->
## Recommendation

Propose WebSocket approach via RFC.

**Next:** [RFC: Real-Time Notifications](../decisions/rfc/2026-02-01-real-time-notifications.md)
```

### Leads to ADR
```markdown
<!-- research/2026-01-15-testcontainers-evaluation.md -->
## Recommendation

Adopt Testcontainers for integration tests.

**Decision:** [ADR-0001: Integration-First Testing](../decisions/adr/0001-integration-first-testing.md)
```

### Leads to Plan
```markdown
<!-- research/2026-01-18-migration-complexity.md -->
## Recommendation

Migration feasible. Proceed with detailed plan.

**Plan:** [Backend Rebuild Plan](../plans/active/backend-rebuild-plan.md)
```

---

## Index Management

### research/index.md

```markdown
# Research Index

## Active

| Research | Started | Researcher |
|----------|---------|------------|
| [2026-02-01 Caching Options](2026-02-01-caching-options.md) | 2026-02-01 | Alice |

## Completed

| Research | Completed | Outcome |
|----------|-----------|---------|
| [2026-01-15 Testcontainers](2026-01-15-testcontainers-evaluation.md) | 2026-01-17 | ADR-0001 |
| [2026-01-18 ORM Performance](2026-01-18-orm-performance-comparison.md) | 2026-01-19 | Keep Prisma |
```

---

## Related Documentation

**Decisions:**
- [ADR CLAUDE.md](../decisions/adr/CLAUDE.md)
- [RFC CLAUDE.md](../decisions/rfc/CLAUDE.md)

**Plans:**
- [Plans CLAUDE.md](../plans/CLAUDE.md)

**Templates:**
- [Research Template](../templates/research.md)

---

**Last Updated:** 2026-01-19
