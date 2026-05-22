---
type: adr
title: 'Temporary Personnel Presence Model'
status: accepted
created: 2026-05-22
decided: 2026-05-22
ai:
  priority: high
  context_load: always
  triggers:
    - temporary personnel
    - temporary access
    - visitor badge
    - nfc assignment
    - presence
    - check-in
  token_budget: 1500
decision_makers:
  - Sentinel project owner
stakeholders:
  - Unit staff
  - Temporary Personnel
  - Members
related_adrs: []
supersedes: null
superseded_by: null
---

# ADR-0001: Temporary Personnel Presence Model

**Status:** Accepted

**Date:** 2026-05-22

**Decision Makers:** Sentinel project owner

---

## Context

Sentinel needs to support non-member people who work at the Unit temporarily, such as court staff for a Standing Court Martial, and who need repeatable NFC-based check-in without being entered as Members or signing in as Visitors every day.

The existing domain has Members, Visitors, NFC badge assignment, member check-ins, visitor sign-ins, and presence views. Visitors represent specific visits, while Members participate in member attendance, duty, lockup, and authentication workflows. Temporary workers need presence tracking, but they must not inherit member attendance, duty eligibility, lockup authority, or Sentinel authentication.

Key factors:

- Temporary Personnel may need to scan repeatedly over days or weeks.
- Their access must expire or be revoked without deleting historical presence.
- Building occupancy should include them, but member attendance should not.
- NFC tag custody and audit history must survive reassignment.

Constraints:

- Member check-ins are member-shaped and drive member-only behavior.
- Visitor sign-ins are visit-shaped and do not model reusable temporary identities cleanly.
- NFC tag assignment semantics must remain clear enough for kiosk and admin workflows.

## Decision

Temporary Personnel will be modeled as first-class temporary identities under named Temporary Personnel Assignments, with a distinct temporary-personnel NFC assignment category and separate Temporary Personnel Check-In history.

In short: Temporary Personnel are neither Members nor Visitors; they are assignment-bound, presence-only people who can scan NFC tags for building occupancy.

Specifically:

- Temporary Personnel belong to a named Temporary Personnel Assignment with an active access window and sponsor.
- Temporary Personnel NFC assignments are distinct from member and visitor badge assignments.
- Temporary Personnel check-ins remain separate from member attendance records.
- Presence and building-close views merge Members, Visitors, and Temporary Personnel.
- Member-only workflows such as authentication, duty roles, lockup authority, division attendance, and member reports exclude Temporary Personnel.

## Options Considered

### Option 1: First-class Temporary Personnel

Description: Add a separate temporary-personnel identity and check-in lane, then merge it into presence and activity views.

Pros:

- Preserves the distinction between Unit Members, single-visit Visitors, and temporary workers.
- Prevents accidental inclusion in member attendance, duty, lockup, and authentication workflows.
- Supports assignment-level expiry, revocation, sponsorship, reports, and tag custody history.
- Keeps building occupancy accurate without overloading existing concepts.

Cons:

- Requires new data model, API, UI, and scan-path work.
- Presence and reporting code must merge another source.

Why chosen: This best matches the domain and avoids corrupting existing Member and Visitor semantics.

### Option 2: Reuse Visitors with temporary badges

Description: Treat court staff as Visitors with assigned NFC tags and adapt visitor badge scanning to check them in and out.

Pros:

- Reuses some existing visitor fields and visitor presence UI.
- May appear smaller initially because Visitor already has a temporary badge field.

Cons:

- Visitors are visit records, not reusable identities.
- Repeat scanning over multiple days would blur visit history and person identity.
- Assignment-level expiry, sponsorship, revocation, and tag custody would be awkward.
- The term Visitor would become a catch-all for unrelated concepts.

Why not chosen: It overloads Visitor beyond its domain meaning and would make future reporting and audit behavior harder to reason about.

### Option 3: Create inactive or special Members

Description: Create Member records for temporary workers with special status or member type.

Pros:

- Reuses the existing member badge scan path.
- Minimizes initial kiosk changes.

Cons:

- Temporary workers are not Unit Members.
- They could accidentally appear in member attendance, duty eligibility, member reports, or authentication paths.
- Requires many guardrails to keep member-only behavior from applying.

Why not chosen: It makes the fastest path the least honest one and risks contaminating member data.

### Option 4: Keep status quo

Description: Require court staff to sign in as Visitors each time.

Pros:

- No new implementation work.
- Keeps current Visitor flow unchanged.

Cons:

- Creates avoidable daily friction for people working at the Unit repeatedly.
- Does not support NFC-based repeat check-in.
- Makes the presence workflow less useful for short-term working groups.

Why not chosen: It fails the operational need that prompted the decision.

## Consequences

Positive consequences:

- Sentinel can track temporary workers as present without making them Members.
- Building occupancy and building close can include all people present.
- Member attendance, duty, lockup, and authentication workflows remain member-only.
- Temporary access can expire, be revoked, and be audited by assignment.
- NFC tag reassignment can preserve custody history.

Negative consequences:

- The implementation must introduce a new check-in source and merge it into presence/activity screens.
- Offline kiosk support for Temporary Personnel should wait until active assignment windows can be cached safely.
- Reports must explicitly choose between building occupancy, temporary assignment reporting, and member attendance.

Risks and mitigations:

| Risk                                                    | Probability | Impact | Mitigation                                                                                |
| ------------------------------------------------------- | ----------- | ------ | ----------------------------------------------------------------------------------------- |
| Temporary Personnel are accidentally counted as Members | Medium      | High   | Keep separate check-in history and explicit presence aggregation rules.                   |
| Expired tags still scan successfully                    | Medium      | High   | Validate assignment status and access window during every online scan.                    |
| Tag custody history is lost during reassignment         | Low         | Medium | Require explicit end/unassignment before reassignment and retain historical records.      |
| UI becomes confusing with three person categories       | Medium      | Medium | Display Temporary Personnel distinctly in presence, assignment, and building-close views. |
