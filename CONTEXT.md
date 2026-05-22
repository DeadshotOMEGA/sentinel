# Sentinel

Sentinel tracks who is present at the Unit and how people are identified for check-in, visitor handling, and local attendance workflows.

## Language

**Member**:
A person who belongs to the Unit and is tracked as part of the Unit's personnel.
_Avoid_: User, account, attendee

**Visitor**:
A person recorded for a specific visit to the Unit.
_Avoid_: Guest, temporary member

**Temporary Personnel**:
A non-member person temporarily working at the Unit who needs repeatable check-in access for a defined assignment.
_Avoid_: Visitor, guest, temporary member

**Organization**:
The external unit, office, company, or body a non-member person represents while at the Unit.
_Avoid_: Division

**Temporary Personnel Assignment**:
A named period of temporary work at the Unit that groups one or more Temporary Personnel.
_Avoid_: Visit, membership

**Assignment Sponsor**:
The Unit person or office accountable for a Temporary Personnel Assignment.
_Avoid_: Host, supervisor

**Present Person**:
Any person currently recorded as being at the Unit, whether they are a Member, Visitor, or Temporary Personnel.
_Avoid_: Present member

**Building Occupancy**:
The count of all people currently present at the Unit.
_Avoid_: Member presence

**Member Presence**:
The count of Members currently present at the Unit.
_Avoid_: Building occupancy

**NFC Tag**:
A physical badge or tag scanned to identify a person during check-in workflows.
_Avoid_: Card, token

**Presence-Only NFC Tag**:
An NFC Tag that can record presence but cannot grant Sentinel authentication or Unit responsibilities.
_Avoid_: Login badge, access badge

**Temporary Personnel NFC Assignment**:
The assignment of an NFC Tag to Temporary Personnel for presence-only scanning.
_Avoid_: Visitor badge assignment, member badge assignment

**Expired Temporary Access**:
A former temporary access state where the assignment is no longer active but the person or tag is still known.
_Avoid_: Unknown badge, unassigned badge

**Revoked Temporary Access**:
A temporary access state intentionally ended before the assignment would otherwise expire.
_Avoid_: Deleted access, inactive member

**Returned NFC Tag**:
An NFC Tag that has been physically recovered and made available for reassignment.
_Avoid_: Expired tag, deleted tag

**Assignable NFC Tag**:
An active NFC Tag that is physically available and not assigned to anyone.
_Avoid_: Expired tag, known tag

**Check-In Direction**:
Whether a scan records a person entering or leaving the Unit.
_Avoid_: Status, state

**Temporary Personnel Check-In**:
A presence record for Temporary Personnel entering or leaving the Unit.
_Avoid_: Member check-in, visitor sign-in

**Member Attendance**:
Attendance reporting for Members of the Unit.
_Avoid_: Presence, building occupancy

**Building Close**:
The operational act of confirming and clearing who remains present before the Unit is secured.
_Avoid_: Attendance close, daily checkout

## Relationships

- A **Member** may have one **NFC Tag**
- A **Temporary Personnel Assignment** has one or more **Temporary Personnel**
- A **Temporary Personnel Assignment** has one **Assignment Sponsor**
- **Temporary Personnel** belong to one active **Temporary Personnel Assignment** while working at the Unit
- The Unit may have more than one active **Temporary Personnel Assignment** at the same time
- **Temporary Personnel** are identified by display name and **Organization**, not by Unit member fields
- **Temporary Personnel** may have one **Temporary Personnel NFC Assignment** for the duration of their **Temporary Personnel Assignment**
- A **Presence-Only NFC Tag** may be reassigned only after its current Temporary Personnel assignment is explicitly ended
- A **Temporary Personnel NFC Assignment** can only use an **Assignable NFC Tag**
- An expired **Temporary Personnel Assignment** stops **Temporary Personnel** NFC Tag access but does not make an NFC Tag returned
- A scan with **Expired Temporary Access** is rejected as known but no longer valid
- A scan with **Revoked Temporary Access** is rejected as intentionally no longer valid
- Revoking a **Temporary Personnel Assignment** revokes all Temporary Personnel access under it
- Ended or revoked temporary access is not reactivated; a later need creates a new temporary access history
- A **Visitor** represents one visit, not a reusable person identity
- **Temporary Personnel** appear as **Present People** but do not count as Unit Members
- **Building Occupancy** includes Members, Visitors, and Temporary Personnel
- **Member Presence** includes Members only
- **Temporary Personnel Check-Ins** are shown in presence views but remain distinct from **Member Attendance**
- **Temporary Personnel** are included in presence and assignment reporting, not **Member Attendance**
- **Temporary Personnel** are not converted into Members; Member records are created through the Member workflow
- Temporary Personnel with presence history are retained as historical records
- **Building Close** includes Members, Visitors, and Temporary Personnel who are still present
- A **Check-In Direction** toggles from the person's most recent active check-in record

## Example Dialogue

> **Dev:** "Should court staff be entered as **Visitors** every morning?"
> **Domain expert:** "No - they are **Temporary Personnel** while assigned here, so their **NFC Tag** should let them check in repeatedly without creating a new visitor sign-in each time."

> **Dev:** "Do **Temporary Personnel** count toward member strength or duty eligibility?"
> **Domain expert:** "No - they can appear as **Present People**, but they are not **Members**."

> **Dev:** "Should court staff count in the total present number?"
> **Domain expert:** "Yes for **Building Occupancy**, no for **Member Presence**."

> **Dev:** "If a temporary worker later joins the Unit, do we convert their record?"
> **Domain expert:** "No - create a **Member** through the Member workflow and keep temporary history separate."

> **Dev:** "Can we delete court staff after they have checked in?"
> **Domain expert:** "No - once Temporary Personnel have presence history, they are retained as historical records."

> **Dev:** "Can a court staff tag keep working after the proceeding ends?"
> **Domain expert:** "No - the **NFC Tag** only works during the **Temporary Personnel Assignment**."

> **Dev:** "When the assignment ends, can we immediately reuse the tag?"
> **Domain expert:** "No - access expires automatically, but the tag is only a **Returned NFC Tag** once staff physically recover it."

> **Dev:** "Can we assign a lost or member-owned tag to court staff?"
> **Domain expert:** "No - Temporary Personnel can only receive an **Assignable NFC Tag**."

> **Dev:** "Can the same tag move from one court staff member to another?"
> **Domain expert:** "Yes - but only after the first person's temporary tag assignment is explicitly ended."

> **Dev:** "Is an expired court staff tag an unknown badge?"
> **Domain expert:** "No - it is **Expired Temporary Access**, so the scan is rejected with that reason."

> **Dev:** "If court staff access is cut off early, is that the same as expiry?"
> **Domain expert:** "No - that is **Revoked Temporary Access** because staff intentionally ended it early."

> **Dev:** "If the whole court martial assignment is revoked, do individual tags keep working?"
> **Domain expert:** "No - revoking the **Temporary Personnel Assignment** revokes all temporary access under it."

> **Dev:** "If the court martial resumes later, do we reopen the old access?"
> **Domain expert:** "No - ended or revoked temporary access stays historical, and later work creates new access."

> **Dev:** "Should each court staff member have their own unrelated temporary access?"
> **Domain expert:** "No - they belong under the same **Temporary Personnel Assignment**, such as Standing Court Martial."

> **Dev:** "Can a court martial and a contractor project both be active?"
> **Domain expert:** "Yes - the Unit can have multiple active **Temporary Personnel Assignments**."

> **Dev:** "Who owns a temporary group if a tag is missing?"
> **Domain expert:** "The **Assignment Sponsor** is accountable for the **Temporary Personnel Assignment**."

> **Dev:** "Should we capture service number and division for **Temporary Personnel**?"
> **Domain expert:** "No - use display name and **Organization**; those are enough to identify them without making them **Members**."

> **Dev:** "Does a **Temporary Personnel** scan behave differently from a **Member** scan?"
> **Domain expert:** "The **Check-In Direction** toggles the same way, but member-only duties and attendance rules do not apply."

> **Dev:** "Are **Temporary Personnel Check-Ins** the same as **Member Attendance**?"
> **Domain expert:** "No - they are presence records for temporary workers, not attendance records for Unit **Members**."

> **Dev:** "Can **Temporary Personnel** use their tag to log in or accept lockup?"
> **Domain expert:** "No - their tag is a **Presence-Only NFC Tag**."

> **Dev:** "Should court staff tags be treated as visitor badges?"
> **Domain expert:** "No - they use a **Temporary Personnel NFC Assignment** because their access is repeatable and assignment-bound."

> **Dev:** "Should court staff affect training-night attendance?"
> **Domain expert:** "No - they can appear in presence and **Temporary Personnel Assignment** reports, but not **Member Attendance**."

> **Dev:** "Should **Temporary Personnel** block the building from being secured if they are still checked in?"
> **Domain expert:** "Yes - **Building Close** needs to show and clear everyone still present."

## Flagged Ambiguities

- "temporary people" could mean repeat visitors or short-term personnel - resolved: people working at the Unit for a defined assignment are **Temporary Personnel**.
