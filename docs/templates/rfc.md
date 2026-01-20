---
type: rfc
title: "[Proposal Title]"
status: [draft | open | under-review | accepted | rejected | withdrawn]
created: YYYY-MM-DD
last_updated: YYYY-MM-DD
author: [Author name/team]
ai:
  priority: high
  context_load: on-demand
  triggers:
    - [add relevant keywords]
    - rfc
    - proposal
  token_budget: 2000
comment_deadline: YYYY-MM-DD
discussion:
  - [Link to discussion thread]
  - [Link to meeting notes]
stakeholders:
  - [Who should review]
decision_date: [YYYY-MM-DD when final decision will be made]
resulting_adr: [Link to ADR if accepted]
---

# RFC: [Proposal Title]

**Status:** [Draft | Open | Under Review | Accepted | Rejected | Withdrawn]

**Author:** [Name]

**Created:** YYYY-MM-DD

**Comment Deadline:** YYYY-MM-DD

**Discussion:** [Link to where feedback is being collected]

---

## Summary

**One paragraph:** [Concise summary of what is being proposed and why]

**In one sentence:** [The proposal distilled to its essence]

---

## Problem Statement

**What problem are we trying to solve?**

[Detailed description of the problem, pain points, or opportunity]

**Current situation:**
[What happens now]

**Why this is a problem:**
- [Impact 1]
- [Impact 2]
- [Impact 3]

**Who is affected:**
- [Stakeholder group 1]
- [Stakeholder group 2]

**Urgency:** [Why this needs to be addressed now, or timeline constraints]

---

## Goals & Non-Goals

### Goals

**What this proposal aims to achieve:**

1. [Primary goal 1]
2. [Primary goal 2]
3. [Primary goal 3]

**Success criteria:**
- [ ] [Measurable outcome 1]
- [ ] [Measurable outcome 2]
- [ ] [Measurable outcome 3]

---

### Non-Goals

**What this proposal explicitly does NOT aim to solve:**

- [Explicitly out of scope 1]
- [Explicitly out of scope 2]

**Why these are non-goals:** [Reasoning for scope limitation]

---

## Proposal

**What is the proposed solution?**

[Detailed description of the proposed approach. Be specific about what will change.]

### High-Level Design

[Overview of the solution architecture or approach]

**Key components:**
1. [Component 1] - [What it does]
2. [Component 2] - [What it does]
3. [Component 3] - [What it does]

**Diagram:**
```
[ASCII diagram or flowchart showing the solution]
```

---

### Detailed Design

**Component 1: [Name]**

[Detailed explanation of how this component works]

**Implementation:**
```[language]
// Pseudo-code or example implementation
```

**Interactions:**
- [How it interacts with Component 2]
- [How it interacts with existing systems]

---

**Component 2: [Name]**

[Repeat pattern for all major components]

---

### API / Interface Changes

**New APIs:**
```[language]
// New functions/endpoints being added
```

**Modified APIs:**
```[language]
// Existing APIs that will change
// Old signature
// New signature
```

**Deprecated APIs:**
```[language]
// APIs that will be removed
// Migration path
```

---

### Migration Path

**For existing users/code:**

**Phase 1:** [What happens first]
**Phase 2:** [What happens next]
**Phase 3:** [Final state]

**Timeline:** [Estimated duration]

**Backwards compatibility:** [How existing code continues to work]

---

## Alternatives Considered

### Alternative 1: [Different Approach]

**Description:** [What this alternative would entail]

**Pros:**
- [Advantage 1]
- [Advantage 2]

**Cons:**
- [Disadvantage 1]
- [Disadvantage 2]

**Why not chosen:** [Current thinking - may change based on feedback]

---

### Alternative 2: [Another Approach]

[Repeat pattern for all alternatives]

---

### Alternative N: Do Nothing

**Description:** [What happens if we don't make any changes]

**Pros:**
- [What we keep]
- [What we avoid]

**Cons:**
- [Problems that persist]
- [Opportunities missed]

**Why not chosen:** [Why change is necessary]

---

## Trade-offs

**What are we optimizing for?**

[Explain the primary optimization target: performance, simplicity, flexibility, etc.]

**What are we sacrificing?**

| Aspect | This Proposal | Alternative 1 | Status Quo |
|--------|---------------|---------------|------------|
| [Criterion 1] | [Rating/Value] | [Rating/Value] | [Rating/Value] |
| [Criterion 2] | [Rating/Value] | [Rating/Value] | [Rating/Value] |
| [Criterion 3] | [Rating/Value] | [Rating/Value] | [Rating/Value] |

**Key trade-off:** [The most important trade-off explained]

---

## Implementation Plan

### Timeline

**Phase 1: [Name]** (Week 1-2)
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

**Phase 2: [Name]** (Week 3-4)
- [ ] Task 1
- [ ] Task 2

**Total estimated time:** [X weeks]

---

### Resources Required

**Engineering:**
- [X developers for Y weeks]
- [Specific skills needed]

**Infrastructure:**
- [New services/resources needed]

**Documentation:**
- [Docs to create/update]

**Testing:**
- [Test requirements]

---

### Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| [Risk 1] | [H/M/L] | [H/M/L] | [How to address] |
| [Risk 2] | [H/M/L] | [H/M/L] | [How to address] |
| [Risk 3] | [H/M/L] | [H/M/L] | [How to address] |

---

### Dependencies

**This proposal depends on:**
- [Dependency 1] - [Current status]
- [Dependency 2] - [Current status]

**Blocked by:**
- [Blocker 1] - [Expected resolution]

**Blocks:**
- [What can't proceed until this is done]

---

## Open Questions

**Questions that need answers before proceeding:**

1. [Question 1]?
   - **Context:** [Why this is unclear]
   - **Options:** [Possible answers]
   - **Deciding factor:** [What will help us decide]

2. [Question 2]?
   - [Same structure]

**See Discussion section for ongoing debate**

---

## Impact Assessment

### User Impact

**End users:**
- [How users experience this change]
- [Migration required?]

**Developers:**
- [New APIs to learn]
- [Code changes required]

**Operations:**
- [Deployment changes]
- [Monitoring changes]

---

### Technical Impact

**Performance:**
- [Expected impact on performance]
- [Benchmarks if available]

**Scalability:**
- [How this affects scaling]

**Maintainability:**
- [How this affects long-term maintenance]

**Security:**
- [Security implications]

---

### Organizational Impact

**Process changes:**
- [How workflows change]

**Training needs:**
- [What team needs to learn]

**Documentation:**
- [What docs need updating]

---

## Success Metrics

**How will we measure success?**

**Quantitative metrics:**
- [Metric 1]: Target [value] within [timeframe]
- [Metric 2]: Target [value] within [timeframe]

**Qualitative metrics:**
- [Indicator 1]
- [Indicator 2]

**Review cadence:**
- [When and how often we'll check metrics]

---

## Prior Art

**Similar approaches in other systems:**

**System 1:** [Name]
- [How they solved similar problem]
- [What we can learn]
- [What we'll do differently]

**System 2:** [Name]
- [Same structure]

**Industry standards:**
- [Relevant standards or best practices]

---

## Unresolved Questions

**Questions that don't block acceptance but need answers eventually:**

1. [Question about implementation detail]
2. [Question about future enhancement]

---

## Future Work

**What this enables:**
- [Future improvement 1]
- [Future improvement 2]

**What we'll do later:**
- [Enhancement 1 - with rough timeline]
- [Enhancement 2 - with rough timeline]

---

## Feedback & Discussion

**How to provide feedback:**

1. [Comment in discussion thread](link)
2. [Reply to email]
3. [Attend RFC review meeting on DATE]

**Specific feedback requested on:**
- [Aspect 1] - [What kind of input would be helpful]
- [Aspect 2] - [What kind of input would be helpful]

**Deadline for comments:** YYYY-MM-DD

---

## Changelog

**Track changes made in response to feedback:**

### YYYY-MM-DD
- Added [section/clarification] based on feedback from [person]
- Revised [aspect] to address concern about [issue]

### YYYY-MM-DD
- Initial draft

---

## References

**Related documentation:**
- [Research doc](../../research/YYYY-MM-DD-investigation.md)
- [Related RFC](YYYY-MM-DD-other-proposal.md)

**External resources:**
- [Article/paper]
- [Library documentation]
- [Prior discussion]

---

## Decision

**If status is "Accepted":**

> **Accepted on:** YYYY-MM-DD
>
> **Decision makers:** [Who approved]
>
> **Next steps:**
> 1. [Immediate action]
> 2. [Follow-up action]
>
> **ADR:** [Link to resulting ADR](../adr/NNNN-decision.md)

**If status is "Rejected":**

> **Rejected on:** YYYY-MM-DD
>
> **Reason:** [Why this was not approved]
>
> **Alternative chosen:** [What we're doing instead]

**If status is "Withdrawn":**

> **Withdrawn on:** YYYY-MM-DD
>
> **Reason:** [Why author withdrew proposal]

---

**Last Updated:** YYYY-MM-DD
