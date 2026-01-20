# Request for Comments (AI-First Guide)

**Purpose:** RFC format and process guide

**AI Context Priority:** high

**When to Load:** User proposing changes, seeking consensus, major decisions

**Triggers:** rfc, proposal, request for comments, propose

---

## Quick Reference

### What Are RFCs?

Proposals for major changes that need team discussion and consensus before implementation.

### File Naming

**Pattern:** `YYYY-MM-DD-descriptive-title.md`

**Examples:**
- `2026-01-15-backend-rebuild-proposal.md`
- `2026-02-01-real-time-notifications.md`
- `2026-02-15-multi-tenant-architecture.md`

**Date:** Creation date (today)

---

## When to Create RFCs

**Create RFC when:**
- Proposing major system change
- Multiple viable approaches exist
- Breaking changes planned
- Significant resource investment
- Team consensus needed
- Impact spans multiple domains

**Examples:**
- "RFC: Migrate to Microservices"
- "RFC: Add Real-Time Collaboration"
- "RFC: Implement Multi-Tenancy"

**Don't create RFC for:**
- Bug fixes (just fix)
- Minor improvements (just implement)
- Internal refactoring (low impact)
- Emergency fixes (act first, document later)
- Obvious solutions (no alternatives)

---

## RFC Structure

### Required Sections

```markdown
# RFC: Title

**Status:** Draft | Discussion | Accepted | Rejected

**Date:** YYYY-MM-DD

**Author:** Name

## Problem

What problem are we solving?

## Goals

What are we trying to achieve?

## Non-Goals

What are we explicitly NOT trying to solve?

## Proposal

Detailed description of proposed solution.

## Alternatives Considered

### Alternative 1
[Description, pros, cons]

### Alternative 2
[Description, pros, cons]

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Risk 1 | High | Medium | How to prevent |

## Rollout Plan

How will we implement this?

## Open Questions

- Question 1?
- Question 2?

## Discussion

[Link to discussion thread, comments, decisions]
```

---

## RFC Process

### 1. Draft

**Author creates RFC:**
- Identifies problem
- Proposes solution
- Lists alternatives
- Identifies risks

**Status:** Draft

### 2. Review & Discussion

**Team reviews:**
- Comments on RFC document
- Discussion in meetings/threads
- Questions answered
- Proposal refined

**Status:** Discussion

**Duration:** 1-2 weeks typically

### 3. Decision

**Outcomes:**
- **Accepted:** Move to implementation, create ADR
- **Rejected:** Document why, archive RFC
- **Needs Revision:** Back to draft

**Status:** Accepted or Rejected

### 4. Implementation

**If accepted:**
1. Create ADR documenting decision
2. Create implementation plan
3. Begin work

---

## Writing Good RFCs

### Do

✅ **Define problem clearly**
```markdown
## Problem

Sentinel currently has no real-time updates. Users must manually
refresh to see new check-ins. This causes:
- Delayed incident response
- Poor user experience
- Missed critical events

We need real-time updates without sacrificing performance or
reliability.
```

✅ **Explore alternatives**
```markdown
## Alternatives Considered

### 1. Polling (Current)
- Pro: Simple, no new infrastructure
- Con: Inefficient, delayed updates

### 2. WebSocket (Socket.IO)
- Pro: True real-time, widely used
- Con: Stateful connections, scaling concerns

### 3. Server-Sent Events (SSE)
- Pro: Simpler than WebSocket, unidirectional
- Con: Browser limits, no binary data

### 4. Firebase/Pusher (External)
- Pro: Managed service
- Con: Cost, vendor lock-in

**Recommendation:** WebSocket with Socket.IO (option 2)
```

✅ **Identify risks honestly**
```markdown
## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| WebSocket connections fail | High | Medium | Implement automatic reconnection |
| Scaling issues with connections | High | Low | Redis adapter for multi-server |
| Increased infrastructure cost | Medium | High | Monitor usage, optimize broadcast |
```

### Don't

❌ **Be vague**
```markdown
## Problem

Things are slow.

## Proposal

Make them faster.

[No specifics, no details]
```

❌ **Only present one option**
```markdown
## Proposal

We should use technology X.

[No alternatives considered, no justification]
```

❌ **Hide risks**
```markdown
## Risks

None. This is perfect.

[Unrealistic]
```

---

## RFC Status

### Draft
- Author still writing
- Not ready for review
- May change significantly

### Discussion
- Ready for team review
- Accepting feedback
- Being refined

### Accepted
- Team consensus reached
- Implementation approved
- Create ADR next

### Rejected
- Team decided not to proceed
- Document why in RFC
- Keep for historical record

---

## Linking RFCs to ADRs

**When RFC accepted, create ADR:**

```markdown
<!-- decisions/adr/0004-websocket-real-time.md -->
# ADR-0004: Implement WebSocket Real-Time Updates

**RFC:** [2026-02-01 Real-Time Notifications](../rfc/2026-02-01-real-time-notifications.md)

**Status:** Accepted

## Context

[Summarize from RFC]

## Decision

We will implement WebSocket-based real-time updates using Socket.IO.

## Consequences

[From RFC]
```

**And update RFC:**
```markdown
<!-- decisions/rfc/2026-02-01-real-time-notifications.md -->
**Status:** Accepted

**ADR:** [ADR-0004](../adr/0004-websocket-real-time.md)

[Rest of RFC]
```

---

## Index Management

### rfc/index.md

```markdown
# Request for Comments

## Active Discussion

| RFC | Status | Date | Author |
|-----|--------|------|--------|
| [2026-02-15 Multi-Tenant](2026-02-15-multi-tenant.md) | Discussion | 2026-02-15 | Alice |

## Accepted

| RFC | Accepted | ADR | Date |
|-----|----------|-----|------|
| [2026-02-01 Real-Time](2026-02-01-real-time-notifications.md) | Yes | [0004](../adr/0004-websocket-real-time.md) | 2026-02-01 |

## Rejected

| RFC | Rejected | Reason | Date |
|-----|----------|--------|------|
| [2026-01-20 GraphQL API](2026-01-20-graphql-api.md) | Yes | Complexity not justified | 2026-01-25 |
```

---

## Related Documentation

**ADRs:**
- [ADR CLAUDE.md](../adr/CLAUDE.md) - Recording decisions

**Templates:**
- [RFC Template](../../templates/rfc.md)

**Decisions parent:**
- [Decisions CLAUDE.md](../CLAUDE.md)

---

**Last Updated:** 2026-01-19
