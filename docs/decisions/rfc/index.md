# Request for Comments (RFC) Index

**Purpose:** Proposals seeking team consensus before implementation

**Last Updated:** 2026-01-19

---

## What Are RFCs?

Requests for Comments are proposals that:
- Suggest significant changes
- Seek team feedback and consensus
- Present problems and solutions
- Discuss alternatives and trade-offs
- Lead to ADRs after approval

**Key Difference from ADRs:** RFCs are **proposals** (seeking feedback), ADRs are **decisions** (finalized)

---

## RFC Status

| Status | Count | Description |
|--------|-------|-------------|
| Draft | 0 | Being written |
| Open | 0 | Seeking feedback |
| Under Review | 0 | Active discussion |
| Accepted | 0 | Approved, ADR created |
| Rejected | 0 | Not approved |
| Withdrawn | 0 | Author withdrew |

**Total RFCs:** 0

---

## Open RFCs (Seeking Feedback)

| RFC | Title | Status | Opened | Comments | Author |
|-----|-------|--------|--------|----------|--------|
| *No open RFCs* | - | - | - | - | - |

---

## Recent Activity

| RFC | Action | Date | Notes |
|-----|--------|------|-------|
| *No activity yet* | - | - | - |

---

## Closed RFCs

### Accepted

| RFC | Title | Accepted | Resulted in ADR |
|-----|-------|----------|-----------------|
| *No accepted RFCs yet* | - | - | - |

### Rejected

| RFC | Title | Rejected | Reason |
|-----|-------|----------|--------|
| *No rejected RFCs yet* | - | - | - |

### Withdrawn

| RFC | Title | Withdrawn | Reason |
|-----|-------|-----------|--------|
| *No withdrawn RFCs yet* | - | - | - |

---

## RFCs by Category

### Architecture & Infrastructure
*No RFCs yet*

### Process & Workflow
*No RFCs yet*

### Technology Adoption
*No RFCs yet*

### Performance & Optimization
*No RFCs yet*

### Security
*No RFCs yet*

---

## Creating RFCs

**When to create:**
- Proposing major change
- Introducing new technology
- Changing architecture
- Modifying processes
- Need team consensus

**How to create:**
1. Copy template: `cp docs/templates/rfc.md docs/decisions/rfc/YYYY-MM-DD-rfc-title.md`
2. Fill in problem, proposal, alternatives, risks
3. Mark status as `draft` while writing
4. Change to `open` when ready for feedback
5. Announce to team for comments
6. Address feedback and update document
7. Move to `under-review` when discussion stabilizes
8. Final decision → `accepted` or `rejected`
9. If accepted, create corresponding ADR
10. Add to this index

**See:** [RFC Format Guide](CLAUDE.md) for complete guide

---

## RFC Naming Convention

**Pattern:** `YYYY-MM-DD-short-kebab-case-title.md`

**Examples:**
- `2026-01-20-testing-first-approach.md`
- `2026-01-22-adopt-better-auth.md`
- `2026-02-01-switch-to-monorepo.md`

**Why date prefix:**
- Chronological sorting
- Instant recognition of proposal age
- Context about when problem arose

---

## RFC Lifecycle

```
Draft → Open → Under Review → Accepted/Rejected/Withdrawn
                                    ↓
                              Create ADR (if accepted)
```

**Typical Timeline:**
- Draft: 1-3 days (author writing)
- Open: 3-7 days (team feedback)
- Under Review: 1-3 days (discussion)
- Decision: 1 day (accept/reject)

**Total:** ~1-2 weeks per RFC

---

## Commenting on RFCs

**How to provide feedback:**

1. **In document:** Add comments inline (if using PR workflow)
2. **In discussions:** Team chat or dedicated channel
3. **In issues:** Link GitHub issue for structured discussion

**Good feedback includes:**
- Specific concerns or questions
- Alternative approaches
- Real-world experience with proposal
- Implementation challenges
- Security or performance implications

---

## From RFC to ADR

When RFC is accepted:

1. **Create ADR** with sequential number
2. Reference RFC in ADR context section:
   ```markdown
   ## Context

   This decision addresses the problem outlined in [RFC 2026-01-20](../rfc/2026-01-20-testing-first.md).
   ```
3. Mark RFC status as `accepted`
4. Add link to resulting ADR in RFC:
   ```markdown
   **Status:** Accepted → [ADR-0001](../adr/0001-testing-first.md)
   ```
5. Update both indexes

---

## Search RFCs

**By keyword:**
```bash
rg "testing|authentication|monorepo" docs/decisions/rfc/
```

**By status:**
```bash
rg "status: open" docs/decisions/rfc/
```

**By date:**
```bash
ls docs/decisions/rfc/2026-01-*.md
```

---

## RFC Statistics

- **Total RFCs:** 0
- **Open:** 0
- **Accepted:** 0
- **Rejected:** 0
- **Withdrawn:** 0
- **Acceptance Rate:** N/A
- **Average Time to Decision:** N/A

---

## Related Documentation

- [RFC Format Guide](CLAUDE.md) - How to write RFCs
- [RFC Template](../../templates/rfc.md) - Starting template
- [ADR Index](../adr/index.md) - Finalized decisions
- [Research Index](../../research/index.md) - Investigation findings
- [Plans Index](../../plans/index.md) - Implementation plans

---

## Quick Links

- [Backend Rebuild Plan](../../plans/active/backend-rebuild-plan.md) - Current project
- [Documentation System Plan](../../plans/active/2026-01-19-ai-first-documentation-system.md) - Doc structure
