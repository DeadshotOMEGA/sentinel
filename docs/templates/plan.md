---
type: plan
title: "[Feature/Goal] Implementation Plan"
status: [draft | active | completed | archived | superseded]
created: YYYY-MM-DD
last_updated: YYYY-MM-DD
lifecycle: [draft | active | completed | archived | superseded]
reviewed: YYYY-MM-DD
expires: YYYY-MM-DD
ai:
  priority: high
  context_load: always
  triggers:
    - [add relevant keywords]
    - plan
    - implementation
  token_budget: 2500
owner: [Team/person responsible]
stakeholders:
  - [Who cares about this]
related_code:
  - [Path to code this affects]
related_plans:
  - [Related implementation plans]
supersedes: [Link to plan this replaces]
superseded_by: [Link to newer plan]
---

# [Feature/Goal] Implementation Plan

**Status:** [Draft | Active | Completed | Archived | Superseded]

**Owner:** [Team/person]

**Timeline:** [Start date] to [End date] ([X weeks/days])

**Current Phase:** [Phase N of M]

---

## Executive Summary

[One paragraph: What we're building, why, and how long it will take. Make it skimmable.]

**In one sentence:** [The entire plan distilled]

**Key changes:**
- [Major change 1]
- [Major change 2]
- [Major change 3]

**Timeline:** [X weeks] across [N phases]

**Related:**
- [ADR explaining decision](../decisions/adr/NNNN-decision.md)
- [RFC proposal](../decisions/rfc/YYYY-MM-DD-proposal.md)

---

## Current State

**What exists now:**

[Description of current implementation/situation]

**Problems with current state:**
1. [Problem 1]
2. [Problem 2]
3. [Problem 3]

**What's changing:**
- [Change 1]: [Old way] → [New way]
- [Change 2]: [Old way] → [New way]

---

## Goals

### Primary Goals

**What this plan MUST accomplish:**

1. [Goal 1 - with measurable outcome]
   - Success criteria: [Specific metric/outcome]
2. [Goal 2 - with measurable outcome]
   - Success criteria: [Specific metric/outcome]
3. [Goal 3 - with measurable outcome]
   - Success criteria: [Specific metric/outcome]

---

### Secondary Goals

**Nice-to-have outcomes:**

1. [Secondary goal 1]
2. [Secondary goal 2]

---

### Non-Goals

**Explicitly out of scope:**

- [Non-goal 1] - [Why it's not included]
- [Non-goal 2] - [Why it's not included]
- [Non-goal 3] - [Why it's not included]

---

## Implementation Phases

### Phase 1: [Phase Name] (Weeks X-Y)

**Priority:** [Critical | High | Medium | Low]

**Goal:** [What this phase accomplishes]

**Duration:** [X weeks/days]

**Dependencies:** [What must be complete before starting]

---

#### Tasks

- [ ] **Task 1:** [Description]
  - Owner: [Name]
  - Estimate: [X hours/days]
  - Depends on: [Other task if applicable]

- [ ] **Task 2:** [Description]
  - Owner: [Name]
  - Estimate: [X hours/days]
  - Depends on: [Other task if applicable]

- [ ] **Task 3:** [Description]
  - Owner: [Name]
  - Estimate: [X hours/days]
  - Depends on: [Other task if applicable]

---

#### Deliverables

- [ ] [Deliverable 1] - [What "done" looks like]
- [ ] [Deliverable 2] - [What "done" looks like]
- [ ] [Deliverable 3] - [What "done" looks like]

---

#### Success Criteria

**Phase 1 is complete when:**
- [Criterion 1 - measurable]
- [Criterion 2 - measurable]
- [Criterion 3 - measurable]

**Exit gate:**
- [ ] All tasks completed
- [ ] All deliverables met
- [ ] Tests passing
- [ ] Code reviewed
- [ ] Documentation updated

---

#### Files Changed

**New files:**
- `path/to/new/file.ts` - [Purpose]

**Modified files:**
- `path/to/existing/file.ts` - [What changed]

**Deleted files:**
- `path/to/old/file.ts` - [Why removed]

---

### Phase 2: [Next Phase Name] (Weeks X-Y)

[Repeat structure for all phases]

**Dependencies:** Phase 1 complete

[... tasks, deliverables, success criteria, files ...]

---

### Phase N: [Final Phase Name] (Weeks X-Y)

[Repeat structure]

---

## Success Metrics

**How we'll know this plan succeeded:**

### Technical Metrics

- **[Metric 1]:** Target [value]
  - Baseline: [current value]
  - Measurement: [How to measure]

- **[Metric 2]:** Target [value]
  - Baseline: [current value]
  - Measurement: [How to measure]

---

### Business Metrics

- **[Metric 1]:** Target [value]
  - Current: [baseline]

- **[Metric 2]:** Target [value]
  - Current: [baseline]

---

### Quality Metrics

- **Test coverage:** [X%] (from [Y%])
- **Performance:** [Target] (from [baseline])
- **Bug rate:** [Target] (from [baseline])

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation | Owner |
|------|-------------|--------|------------|-------|
| [Risk 1] | [H/M/L] | [H/M/L] | [How to prevent/handle] | [Name] |
| [Risk 2] | [H/M/L] | [H/M/L] | [How to prevent/handle] | [Name] |
| [Risk 3] | [H/M/L] | [H/M/L] | [How to prevent/handle] | [Name] |

**Contingency plans:**

**If [Risk 1] occurs:**
1. [Action 1]
2. [Action 2]

**If timeline slips:**
1. [What can be de-scoped]
2. [What can be delayed]

---

## Dependencies

### Technical Dependencies

**This plan depends on:**
- [Dependency 1] - [Status]
- [Dependency 2] - [Status]

**This plan provides:**
- [What other work depends on this]

---

### Team Dependencies

**External teams needed:**
- [Team 1] - [For what] - [When]
- [Team 2] - [For what] - [When]

**Reviews required:**
- [Review type] - [By whom] - [When]

---

### External Dependencies

**Third-party services:**
- [Service 1] - [What we need]

**Approvals needed:**
- [Approval 1] - [From whom] - [When]

---

## Timeline

**Visual timeline:**

```
Week 1-2:  Phase 1 [====================]
Week 3-4:  Phase 2          [====================]
Week 5-6:  Phase 3                       [====================]
Week 7-8:  Phase 4                                    [====================]

Milestones:
Week 2:  [Milestone 1] ▲
Week 4:  [Milestone 2]           ▲
Week 6:  [Milestone 3]                          ▲
Week 8:  [Launch]                                                  ▲
```

**Key milestones:**
- **[Date 1]:** [Milestone 1]
- **[Date 2]:** [Milestone 2]
- **[Date 3]:** [Final milestone]

---

## Testing Strategy

**How we'll verify everything works:**

### Unit Tests

**Coverage target:** [X%]

**Key areas:**
- [Area 1] - [Why important]
- [Area 2] - [Why important]

---

### Integration Tests

**Coverage target:** [X%]

**Key flows:**
- [Flow 1] - [What to test]
- [Flow 2] - [What to test]

---

### E2E Tests

**Critical paths:**
- [Path 1] - [User journey to test]
- [Path 2] - [User journey to test]

---

### Manual Testing

**Test scenarios:**
- [ ] [Scenario 1]
- [ ] [Scenario 2]

---

## Rollout Plan

**How we'll deploy this to production:**

### Phase 1: Internal (Week X)

**Who:** [Internal team]

**What:** [What they test]

**Success criteria:** [What must work]

---

### Phase 2: Beta (Week Y)

**Who:** [Beta users]

**What:** [What they test]

**Metrics to watch:** [What to monitor]

---

### Phase 3: General Availability (Week Z)

**Rollout approach:** [Gradual/all-at-once]

**Rollback plan:** [How to undo if issues]

**Monitoring:** [What to watch]

---

## Rollback Plan

**If things go wrong:**

### Triggers for Rollback

Rollback if:
- [Trigger 1]
- [Trigger 2]
- [Trigger 3]

---

### Rollback Steps

1. [Step 1]
2. [Step 2]
3. [Step 3]

**Time to rollback:** [X minutes]

**Data migration:** [How to handle if data changed]

---

## Communication Plan

**Who needs updates and when:**

| Stakeholder | Frequency | Channel | Content |
|-------------|-----------|---------|---------|
| [Team 1] | [Weekly] | [Email] | [Progress summary] |
| [Team 2] | [Bi-weekly] | [Meeting] | [Deep dive] |
| [Leadership] | [Monthly] | [Report] | [High-level status] |

---

## Progress Tracking

**Updated:** [Date of last update]

### Overall Progress

**Completion:** [X]% overall

**On track:** [Yes/No/At Risk]

**Current status:** [Brief summary of where we are]

---

### Phase Status

| Phase | Status | Progress | Start | End | Notes |
|-------|--------|----------|-------|-----|-------|
| Phase 1 | [✅/🔄/⏳/❌] | [X%] | [Date] | [Date] | [Any notes] |
| Phase 2 | [✅/🔄/⏳/❌] | [X%] | [Date] | [Date] | [Any notes] |
| Phase N | [✅/🔄/⏳/❌] | [X%] | [Date] | [Date] | [Any notes] |

**Legend:**
- ✅ Complete
- 🔄 In Progress
- ⏳ Not Started
- ❌ Blocked

---

### Current Blockers

**Active blockers:**

1. [Blocker 1]
   - Impact: [What it blocks]
   - Owner: [Who's resolving]
   - ETA: [When it will be resolved]

2. [Blocker 2]
   - Impact: [What it blocks]
   - Owner: [Who's resolving]
   - ETA: [When it will be resolved]

---

### Timeline Adjustments

**Changes to original plan:**

- [Date]: [What changed] - [Reason] - [Impact: +X days]
- [Date]: [What changed] - [Reason] - [Impact: +X days]

**Current estimated completion:** [Date] (was [original date])

---

## Update Log

**Track significant changes to this plan:**

### YYYY-MM-DD

**Status:** [What changed]

**Progress:**
- Completed: [Task/deliverable]
- In progress: [Task/deliverable]
- Blocked: [Task/deliverable]

**Changes:**
- [Change 1]
- [Change 2]

**Next steps:**
- [Next action 1]
- [Next action 2]

---

### YYYY-MM-DD

[Repeat for each significant update]

---

## Related Documentation

**Plans:**
- [Related implementation plan]

**Decisions:**
- [ADR explaining why](../decisions/adr/NNNN-decision.md)
- [RFC proposal](../decisions/rfc/YYYY-MM-DD-proposal.md)

**Research:**
- [Investigation findings](../research/YYYY-MM-DD-investigation.md)

**Code:**
- [Key implementation files]

---

## Review Schedule

**Next review:** [Date]

**Review cadence:** [Weekly/Bi-weekly/etc]

**Review checklist:**
- [ ] Progress vs timeline
- [ ] Blockers resolved?
- [ ] Risks materialized?
- [ ] Success metrics on track?
- [ ] Dependencies resolved?

---

**Last Updated:** YYYY-MM-DD
