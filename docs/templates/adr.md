---
type: adr
title: "[Short Decision Title]"
status: [proposed | accepted | deprecated | rejected | superseded]
created: YYYY-MM-DD
decided: YYYY-MM-DD
ai:
  priority: high
  context_load: always
  triggers:
    - [add relevant keywords]
    - decision
    - adr
    - architecture
  token_budget: 1500
decision_makers:
  - [Name/team who decided]
stakeholders:
  - [Who is affected]
related_adrs:
  - [Previous ADR this builds on]
supersedes: [NNNN-old-adr.md]
superseded_by: [NNNN-new-adr.md]
---

# ADR-NNNN: [Short Decision Title]

**Status:** [Proposed | Accepted | Deprecated | Rejected | Superseded]

**Date:** YYYY-MM-DD

**Decision Makers:** [Name/team]

**Related:**
- Supersedes: [ADR-XXXX](XXXX-title.md)
- Related to: [ADR-YYYY](YYYY-title.md)

---

## Context

**What is the issue that we're seeing that is motivating this decision or change?**

[Describe the problem, the current situation, and why a decision needs to be made. Include relevant background information, constraints, and requirements.]

**Key factors:**
- [Factor 1]
- [Factor 2]
- [Factor 3]

**Constraints:**
- [Constraint 1 - e.g., technical limitation]
- [Constraint 2 - e.g., time/budget]
- [Constraint 3 - e.g., team skills]

---

## Decision

**What is the change that we're proposing and/or doing?**

[State the decision clearly and precisely. This should be unambiguous.]

**In short:** [One sentence summary of the decision]

**Specifically:**
- [Specific aspect 1 of what will be done]
- [Specific aspect 2]
- [Specific aspect 3]

---

## Rationale

**Why did we choose this option?**

[Explain why this decision was made. What convinced the team this was the right choice?]

**Primary reasons:**
1. [Reason 1 - with evidence/data if available]
2. [Reason 2]
3. [Reason 3]

**Supporting evidence:**
- [Data point, benchmark, or research finding]
- [Team experience or precedent]
- [External validation]

---

## Alternatives Considered

### Alternative 1: [Alternative Approach]

**Description:** [What this alternative entailed]

**Pros:**
- [Advantage 1]
- [Advantage 2]

**Cons:**
- [Disadvantage 1]
- [Disadvantage 2]

**Why not chosen:** [Key reason this was rejected]

---

### Alternative 2: [Another Approach]

[Repeat pattern for all considered alternatives]

---

### Alternative 3: Status Quo (Do Nothing)

**Description:** [What it means to keep current approach]

**Pros:**
- [What we keep]
- [What we avoid]

**Cons:**
- [Problems that persist]
- [Opportunities missed]

**Why not chosen:** [Why change is necessary]

---

## Consequences

**What becomes easier or more difficult to do and any risks introduced by the change that will need to be mitigated?**

### Positive Consequences (Benefits)

**✅ Technical benefits:**
- [Benefit 1]
- [Benefit 2]

**✅ Process benefits:**
- [Benefit 1]
- [Benefit 2]

**✅ Team benefits:**
- [Benefit 1]
- [Benefit 2]

---

### Negative Consequences (Drawbacks)

**❌ Technical costs:**
- [Cost 1]
- [Mitigation: How we'll handle it]

**❌ Process changes:**
- [Change 1]
- [Mitigation: How we'll adapt]

**❌ Team impacts:**
- [Impact 1]
- [Mitigation: Support plan]

---

### Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| [Risk 1] | [High/Med/Low] | [High/Med/Low] | [How we'll address it] |
| [Risk 2] | [High/Med/Low] | [High/Med/Low] | [How we'll address it] |

---

## Implementation

**How will this decision be implemented?**

**Timeline:**
- [Phase 1]: [When] - [What]
- [Phase 2]: [When] - [What]

**Code changes:**
- [Area 1 that will change]
- [Area 2 that will change]

**Migration path:**
[If replacing existing system, how will migration happen?]

**See:** [Related implementation plan](../../plans/active/plan-name.md)

---

## Validation

**How will we know this decision was correct?**

**Success criteria:**
- [ ] [Measurable outcome 1]
- [ ] [Measurable outcome 2]
- [ ] [Measurable outcome 3]

**Metrics to track:**
- [Metric 1] - Target: [value]
- [Metric 2] - Target: [value]

**Review date:** YYYY-MM-DD - [When we'll assess if decision was right]

---

## Related Decisions

**Previous decisions:**
- [ADR-XXXX](XXXX-title.md) - [How it relates]

**Future decisions:**
- [What decisions this enables or requires]

**External context:**
- [RFC that led to this](../rfc/YYYY-MM-DD-proposal.md)
- [Research that informed this](../../research/YYYY-MM-DD-investigation.md)

---

## References

**Research & Resources:**
- [Document 1]
- [Document 2]
- [External article/paper]

**Discussion:**
- [Meeting notes]
- [Slack thread]
- [GitHub issue]

---

## Update Log

**Note:** ADRs should generally NOT be updated after acceptance. If the decision changes, create a new ADR that supersedes this one.

**Exceptions** (non-substantive updates only):
- [Date]: [Minor clarification or typo fix]

---

## Notes

**For "Deprecated" status:**
If this ADR has been superseded, explain briefly what changed and link to the new ADR:

> This decision has been superseded by [ADR-NNNN](NNNN-new-decision.md) due to [reason]. See the new ADR for current guidance.

**For "Rejected" status:**
If this ADR was proposed but rejected, explain why:

> This proposal was rejected on [date] because [reason]. We decided to [alternative approach] instead. See [ADR-NNNN](NNNN-alternative.md).

---

**Last Updated:** YYYY-MM-DD
