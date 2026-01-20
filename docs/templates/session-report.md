---
type: session
title: "[Session Topic/Focus]"
date: YYYY-MM-DD
duration: [X hours]
ai:
  priority: medium
  context_load: on-demand
  triggers:
    - [add relevant keywords]
    - session
    - work-log
  token_budget: 1200
participants:
  - [AI assistant]
  - [User/Developer]
phase: [Which project phase]
domains:
  - [Domain worked on]
related_plan: [Link to active plan]
next_session: [Link to follow-up session if applicable]
---

# Session Report: [Topic] - YYYY-MM-DD

**Date:** YYYY-MM-DD

**Duration:** [X] hours

**Phase:** [Project phase - e.g., "Phase 1: Testing Foundation"]

**Focus:** [Main area of work - e.g., "Repository migration and testing"]

---

## Session Context

**Starting point:**

[Where things stood at the beginning of this session. What was the state of the code/project?]

**Goal for session:**

[What we intended to accomplish in this session]

**Related work:**
- [Previous session](YYYY-MM-DD-previous-topic.md)
- [Active plan](../plans/active/plan-name.md)
- [Related ADR](../decisions/adr/NNNN-decision.md)

---

## Work Completed

### Task 1: [What was done]

**Objective:** [What this task aimed to achieve]

**Approach:** [How we did it]

**Outcome:** [What was accomplished]

**Files modified:**
- [`path/to/file1.ts`](../../../path/to/file1.ts) - [What changed]
- [`path/to/file2.ts`](../../../path/to/file2.ts) - [What changed]

**Key code changes:**
```[language]
// Notable code snippet showing key change
```

---

### Task 2: [What was done]

[Repeat structure for all significant tasks]

---

### Task N: [What was done]

[Repeat structure]

---

## Decisions Made

### Decision 1: [What was decided]

**Context:** [Why this decision was needed]

**Options considered:**
- Option A: [Brief description]
- Option B: [Brief description]

**Chose:** [Which option]

**Rationale:** [Why this option]

**Implications:**
- [Impact 1]
- [Impact 2]

**Should this become an ADR?** [Yes/No - and why]

---

### Decision 2: [What was decided]

[Repeat for all significant decisions]

---

## Problems Encountered

### Problem 1: [What went wrong]

**Issue:** [Description of the problem]

**Symptom:** [What we observed]

**Root cause:** [Why it happened]

**Solution:** [How we fixed it]

**Time impact:** [How much time this cost]

**Prevention:** [How to avoid this in future]

**Reference:**
```[language]
// Code showing the fix if applicable
```

---

### Problem 2: [What went wrong]

[Repeat for all significant problems]

---

## Knowledge Gained

### Insight 1: [What we learned]

**Discovery:** [What we found out]

**Why it matters:** [Implications for project]

**Applied to:** [Where we used this knowledge]

**Document this?** [Should this become an explanation doc?]

---

### Insight 2: [What we learned]

[Repeat for all significant learnings]

---

## Testing & Verification

**Tests written:**
- [Test file 1] - [What it covers]
- [Test file 2] - [What it covers]

**Tests run:**
```bash
# Commands used
pnpm test
```

**Results:**
- ✅ [X] tests passing
- ❌ [Y] tests failing (if any)
- 📊 Coverage: [Z]%

**Manual testing performed:**
- [ ] [Test scenario 1]
- [ ] [Test scenario 2]

---

## Code Quality

**Linting/Type checking:**
```bash
# Commands run
pnpm lint
pnpm typecheck
```

**Result:** [Clean | X errors fixed | Y warnings remaining]

**Technical debt:**
- [Debt item 1] - [Why incurred, plan to address]
- [Debt item 2] - [Why incurred, plan to address]

**Refactoring opportunities identified:**
- [Opportunity 1]
- [Opportunity 2]

---

## Progress Tracking

**Plan progress:**

[Link to related plan](../plans/active/plan-name.md)

**Completed:**
- [✅] [Task from plan]
- [✅] [Task from plan]

**In progress:**
- [🔄] [Task from plan] - [X%] complete

**Blocked:**
- [❌] [Task from plan] - [Reason for block]

---

## Files Changed

**New files created:**
```
apps/backend/src/repositories/new-repository.ts
apps/backend/tests/integration/repositories/new-repository.test.ts
```

**Modified files:**
```
apps/backend/src/services/service.ts (refactored)
packages/database/prisma/schema.prisma (added fields)
```

**Deleted files:**
```
apps/backend/src/old-deprecated-file.ts (replaced by new-repository.ts)
```

**Total:**
- Created: [X] files
- Modified: [Y] files
- Deleted: [Z] files
- Lines added: [+XXX]
- Lines deleted: [-YYY]

---

## Commits

**Commits made this session:**

```
abc1234 - feat: implement new repository with integration tests
def5678 - test: add test coverage for service layer
ghi9012 - refactor: extract common validation logic
```

**Branch:** `[branch-name]`

**PR created:** [Link to PR if applicable]

---

## Blockers & Open Issues

### Active Blockers

**Blocker 1:** [What's blocking progress]

**Impact:** [What can't be done until resolved]

**Owner:** [Who's working on it]

**ETA:** [Expected resolution]

**Workaround:** [Temporary solution if any]

---

### Open Questions

**Question 1:** [Something unclear or undecided]

**Context:** [Why this matters]

**Needs input from:** [Who should answer]

**Blocking:** [What this blocks, if anything]

---

## Next Session

**Planned work:**

1. [Task 1 to tackle next]
2. [Task 2 to tackle next]
3. [Task 3 to tackle next]

**Prerequisites:**
- [ ] [Thing that must happen before next session]
- [ ] [Another prerequisite]

**Estimated duration:** [X hours]

**Questions to resolve before next session:**
- [Question 1]
- [Question 2]

---

## Context for Next Session

**Current state:**

[Summary of where things are now, so next session can resume efficiently]

**Key context to remember:**
- [Important detail 1]
- [Important detail 2]

**Watch out for:**
- [Gotcha 1]
- [Gotcha 2]

**Useful commands:**
```bash
# Commands that will be needed next session
pnpm test specific-test.test.ts
```

---

## Metrics

**Session productivity:**
- Tasks completed: [X]
- Tests written: [Y]
- Coverage increase: [+Z%]
- Blockers resolved: [N]

**Code health:**
- Type safety: [Improved/Maintained/Declined]
- Test coverage: [X%] (was [Y%])
- Tech debt: [Items added/removed]

---

## Retrospective

### What Went Well

- ✅ [Thing that went well]
- ✅ [Another success]

---

### What Could Be Improved

- ⚠️ [Thing that could be better]
- ⚠️ [Another area for improvement]

---

### Process Observations

**Effective practices:**
- [Practice 1 that worked well]
- [Practice 2 that worked well]

**Process improvements for next time:**
- [Improvement 1]
- [Improvement 2]

---

## Related Documentation

**Session reports:**
- [Previous session](YYYY-MM-DD-previous-topic.md)
- [Next session](YYYY-MM-DD-next-topic.md)

**Plans:**
- [Active plan](../plans/active/plan-name.md)

**Decisions:**
- [Related ADR](../decisions/adr/NNNN-decision.md)

**Code:**
- [Key files worked on](../../apps/backend/src/...)

---

## Attachments

**Screenshots:**
[If any screenshots were taken]

**Diagrams:**
[If any diagrams were created]

**External links:**
- [Relevant documentation]
- [GitHub issues]
- [Slack discussions]

---

**Last Updated:** YYYY-MM-DD
