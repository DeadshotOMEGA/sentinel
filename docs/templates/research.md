---
type: research
title: "[Research Topic/Question]"
status: [in-progress | completed | archived]
created: YYYY-MM-DD
last_updated: YYYY-MM-DD
completed: YYYY-MM-DD
ai:
  priority: high
  context_load: on-demand
  triggers:
    - [add relevant keywords]
    - research
    - investigation
  token_budget: 1500
researcher: [Name]
stakeholders:
  - [Who requested this]
  - [Who needs results]
research_type: [spike | comparison | performance | feasibility | security]
duration: [X days/weeks]
resulting_decision: [Link to ADR if decision made]
---

# Research: [Topic/Question]

**Research Question:** [Clear, specific question being investigated]

**Status:** [In Progress | Completed | Archived]

**Researcher:** [Name]

**Duration:** [Start date] to [End date] ([X days])

**Resulting Decision:** [Link to ADR if applicable]

---

## Executive Summary

**For decision makers who need the bottom line:**

**Question:** [The research question in one sentence]

**Answer:** [The key finding in one sentence]

**Recommendation:** [What we should do based on findings]

**Confidence:** [High | Medium | Low] - [Why]

---

## Context

**Why this research was needed:**

[Explain the problem, opportunity, or question that prompted this investigation]

**Stakeholders:**
- [Person/team 1] - [Their interest]
- [Person/team 2] - [Their interest]

**Decision to be made:**
[What decision depends on this research]

**Timeline:** [When decision needs to be made]

---

## Research Question

**Primary question:**

[Clearly stated research question]

**Sub-questions:**
1. [Related question 1]
2. [Related question 2]
3. [Related question 3]

---

## Success Criteria

**This research succeeds if it provides:**

- [ ] [Criterion 1 - e.g., "Quantitative performance comparison"]
- [ ] [Criterion 2 - e.g., "Security assessment"]
- [ ] [Criterion 3 - e.g., "Implementation complexity estimate"]
- [ ] Clear recommendation
- [ ] Confidence level with justification

---

## Methodology

**How the research was conducted:**

### Approach

[Describe the research approach: benchmarks, code exploration, prototypes, literature review, etc.]

**Sources:**
- [Source 1 - e.g., "Official documentation"]
- [Source 2 - e.g., "Benchmark suite"]
- [Source 3 - e.g., "Production data"]

**Tools used:**
- [Tool 1]
- [Tool 2]

---

### Scope & Limitations

**What was investigated:**
- [Aspect 1]
- [Aspect 2]

**What was NOT investigated:**
- [Limitation 1 - and why]
- [Limitation 2 - and why]

**Constraints:**
- [Time limit]
- [Budget limit]
- [Access/permission constraints]

---

## Options Investigated

### Option 1: [Name]

**Description:** [What this option is]

**Investigated aspects:**
- [Aspect 1] - [Findings]
- [Aspect 2] - [Findings]
- [Aspect 3] - [Findings]

**Test setup:**
```[language]
// Code or configuration used for testing
```

**Results:**
[Data, measurements, observations]

---

### Option 2: [Name]

[Repeat structure for all options]

---

### Option N: [Name]

[Repeat structure]

---

## Findings

### Key Findings

**Finding 1:** [Major discovery or insight]

**Evidence:**
- [Data point 1]
- [Data point 2]

**Implications:**
[What this means for the decision]

---

**Finding 2:** [Another major discovery]

[Repeat structure]

---

### Detailed Results

#### Performance Comparison

| Metric | Option 1 | Option 2 | Option 3 |
|--------|----------|----------|----------|
| [Metric 1] | [Value] | [Value] | [Value] |
| [Metric 2] | [Value] | [Value] | [Value] |
| [Metric 3] | [Value] | [Value] | [Value] |

**Analysis:**
[Interpret the data - what does it tell us?]

---

#### Feature Comparison

| Feature | Option 1 | Option 2 | Option 3 |
|---------|----------|----------|----------|
| [Feature 1] | ✅ Full | ⚠️ Partial | ❌ None |
| [Feature 2] | ✅ Yes | ✅ Yes | ❌ No |
| [Feature 3] | [Details] | [Details] | [Details] |

**Analysis:**
[What do the feature differences mean for our use case?]

---

#### Complexity Assessment

| Aspect | Option 1 | Option 2 | Option 3 |
|--------|----------|----------|----------|
| Setup complexity | [Easy/Med/Hard] | [Easy/Med/Hard] | [Easy/Med/Hard] |
| Learning curve | [Steep/Moderate/Gentle] | [Steep/Moderate/Gentle] | [Steep/Moderate/Gentle] |
| Ongoing maintenance | [Low/Med/High] | [Low/Med/High] | [Low/Med/High] |

**Analysis:**
[What's the total cost of ownership?]

---

### Unexpected Discoveries

**Surprise finding 1:** [Something unexpected]

**Why it matters:** [Implications]

---

**Surprise finding 2:** [Another surprise]

[Repeat]

---

## Analysis

### Pros & Cons Summary

#### Option 1: [Name]

**Pros:**
- ✅ [Advantage 1]
- ✅ [Advantage 2]
- ✅ [Advantage 3]

**Cons:**
- ❌ [Disadvantage 1]
- ❌ [Disadvantage 2]
- ❌ [Disadvantage 3]

**Best for:** [Scenarios where this excels]

**Worst for:** [Scenarios where this struggles]

---

#### Option 2: [Name]

[Repeat structure]

---

### Trade-offs

**What are we optimizing for?**

[Explain the primary optimization target based on business needs]

**Key trade-offs:**

| Decision | If we choose Option 1 | If we choose Option 2 |
|----------|----------------------|----------------------|
| [Trade-off 1] | [What we get/lose] | [What we get/lose] |
| [Trade-off 2] | [What we get/lose] | [What we get/lose] |
| [Trade-off 3] | [What we get/lose] | [What we get/lose] |

---

### Risk Assessment

**Risks of each option:**

| Risk | Option 1 | Option 2 | Option 3 |
|------|----------|----------|----------|
| [Risk 1] | [H/M/L] | [H/M/L] | [H/M/L] |
| [Risk 2] | [H/M/L] | [H/M/L] | [H/M/L] |
| [Risk 3] | [H/M/L] | [H/M/L] | [H/M/L] |

**Mitigation strategies:**
- [Risk 1]: [How to mitigate]
- [Risk 2]: [How to mitigate]

---

## Recommendations

### Primary Recommendation

**Choose:** [Option X]

**Confidence level:** [High | Medium | Low]

**Reasoning:**

[Detailed explanation of why this is recommended]

**Key factors:**
1. [Factor 1 and why it matters most]
2. [Factor 2]
3. [Factor 3]

---

### Alternative Recommendation

**If constraints change:**

**If [condition], consider:** [Alternative option]

**Example:** "If budget is not a constraint, Option 2 provides better long-term scalability."

---

### Conditions & Caveats

**This recommendation holds if:**
- [Assumption 1]
- [Assumption 2]

**This recommendation may not hold if:**
- [Scenario 1 that would change recommendation]
- [Scenario 2]

---

## Next Steps

### Immediate Actions

1. [ ] [Action 1 - Who - When]
2. [ ] [Action 2 - Who - When]
3. [ ] [Action 3 - Who - When]

---

### Follow-up Research

**Questions that still need investigation:**

1. [Question 1]
   - Why: [Why this matters]
   - How: [How to investigate]
   - Priority: [High/Med/Low]

2. [Question 2]
   - [Same structure]

---

### Decision Process

**How to move from research to decision:**

1. **Review:** [Who needs to review findings]
2. **Discuss:** [Where discussion happens]
3. **Decide:** [Who makes final decision]
4. **Document:** [Create ADR with link to this research]

**Timeline:** [When decision should be made]

---

## Appendix

### Detailed Data

[Raw data, detailed benchmarks, full test results that support findings but are too detailed for main body]

---

### Test Scripts

```[language]
// Scripts used to generate results
// Include so research can be reproduced
```

---

### Environment Details

**Test environment:**
- Hardware: [Specs]
- Software: [Versions]
- Configuration: [Settings]

**Reproducibility:**
[How to reproduce these results]

---

### References

**Documentation:**
- [Doc 1]
- [Doc 2]

**Articles/Papers:**
- [Article 1]
- [Article 2]

**Code Examples:**
- [Example 1]
- [Example 2]

**Community Input:**
- [Forum discussion]
- [GitHub issue]

---

## Related Documentation

**Research:**
- [Related investigation](YYYY-MM-DD-related-topic.md)

**Decisions:**
- [Resulting ADR](../decisions/adr/NNNN-decision.md)
- [Related RFC](../decisions/rfc/YYYY-MM-DD-proposal.md)

**Implementation:**
- [Plan using this research](../plans/active/plan-name.md)

---

## Feedback & Questions

**Questions about this research?**
[How to contact researcher]

**Disagree with findings?**
[How to provide alternative perspective or additional data]

---

**Last Updated:** YYYY-MM-DD
