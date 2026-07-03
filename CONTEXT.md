# Sentinel

Sentinel tracks who is present at the Unit and how people are identified for check-in, visitor handling, and local attendance workflows.

## Language

**Member**:
A person who belongs to the Unit and is tracked as part of the Unit's personnel.
_Avoid_: User, account, attendee

**Visitor**:
A person recorded for a specific visit to the Unit.
_Avoid_: Guest, temporary member

**Visitor Self-Service**:
A Visitor-facing workflow for recording a Visitor's own visit details or departure.
_Avoid_: Visitor log, guest book

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

**NFC Scanner Input**:
The badge identifier produced when an NFC Tag is scanned at a Sentinel check-in station.
_Avoid_: Manual typing, visitor text entry

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

**Administrative Presence Action**:
A staff-initiated correction or override to a person's presence state.
_Avoid_: Dashboard action, manual change

**Account Level**:
A Member authority tier used to decide which Sentinel workflows the Member may use.
_Avoid_: Role, rank, permission

**Operational Qualification**:
A Unit approval that confirms a Member may hold a specific operational responsibility.
_Avoid_: Account Level, permission, role

**Access Rule**:
A named Sentinel workflow or action with a required minimum Account Level.
_Avoid_: Option, hard-coded restriction, page permission

**System Identity**:
An internal Sentinel identity used for maintenance or recovery rather than human workflow access.
_Avoid_: Member, Developer

**Remote System**:
A Sentinel workstation or appliance context where a Member signs in and uses Sentinel.
_Avoid_: Separate permission set, local role

**Access Rule Floor**:
The lowest Account Level Sentinel allows for an Access Rule.
_Avoid_: Default permission, suggested level

**Built-in Access Rule Default**:
The Sentinel-defined Account Level used for an Access Rule when no valid configured level is available.
_Avoid_: Fallback permission, hard-coded access

**Destructive Access Rule**:
An Access Rule for an action that can remove, overwrite, export, or broadly expose Sentinel data.
_Avoid_: Dangerous option, admin action

**Operational Report**:
A report that supports routine Unit attendance, presence, visitor, or duty workflows.
_Avoid_: Diagnostic report, audit log

**Diagnostic Record**:
A record used to inspect Sentinel system activity, configuration, or data state.
_Avoid_: Operational report

## Relationships

- A **Member** may have one **NFC Tag**
- **NFC Scanner Input** identifies an **NFC Tag**, not a Visitor form response
- A **Member** has one **Account Level**
- A **Member** may have one or more **Operational Qualifications**
- An **Access Rule** has one minimum **Account Level**
- An **Access Rule** has one **Access Rule Floor**
- An **Access Rule** has one **Built-in Access Rule Default**
- An **Access Rule** belongs to a Sentinel-defined catalog
- The **Access Rule** catalog covers Sentinel workflows whose visibility or authority depends on Account Level
- Developer recovery workflows are represented as **Access Rules** with Developer **Access Rule Floors**
- An **Access Rule** applies the same way across **Remote Systems**
- An **Access Rule** starts from Sentinel's current authority threshold unless a Developer changes it
- The **Access Rule** for changing Access Rules requires the Developer **Account Level**
- The **Access Rule** for assigning Developer **Account Level** requires the Developer **Account Level**
- An **Access Rule** always resolves to an **Account Level**, not to a disabled state
- A **Member** may use an **Access Rule** when their **Account Level** meets or exceeds that rule's minimum **Account Level**
- **Account Levels** inherit upward for **Access Rules**
- A **Member** cannot assign another Member an **Account Level** equal to or higher than their own, except at Developer **Account Level**
- A **Member** cannot lower their own **Account Level** through normal account-level management
- Sentinel must retain at least one active Developer-level **Member**
- A Developer-level **Member** may assign another **Member** to Developer **Account Level**
- An **Access Rule** change is an audited governance change
- An **Access Rule** change takes effect immediately for authority checks
- An **Access Rule** minimum **Account Level** cannot be lower than its **Access Rule Floor**
- A missing or invalid **Access Rule** configuration uses the **Built-in Access Rule Default**
- An **Access Rule** governs both whether a workflow is visible and whether the workflow may be performed
- Operationally sensitive help follows the **Access Rule** for the workflow it explains
- **Operational Reports** and **Diagnostic Records** may have different **Access Rules**
- Exporting Sentinel data is governed by a **Destructive Access Rule**
- **Administrative Presence Actions** may have separate **Access Rules** from routine check-in workflows
- **System Identities** are excluded from **Access Rules** for human workflow access
- An **Access Rule** does not replace an **Operational Qualification**
- View, change, and **Destructive Access Rules** may have different minimum **Account Levels**
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
- **Visitor Self-Service** records Visitors without making them Members or Temporary Personnel
- **NFC Scanner Input** may be accepted during **Visitor Self-Service** without becoming Visitor form content
- **NFC Scanner Input** may record Member or Temporary Personnel presence while **Visitor Self-Service** remains in progress
- A Visitor-assigned **NFC Tag** is not the same as **Visitor Self-Service** sign-out
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

> **Dev:** "Is the Visitor log the same thing as the self-service visitor flow?"
> **Domain expert:** "Use **Visitor Self-Service** for the Visitor-facing workflow; reports and history views are separate records of what happened."

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

> **Dev:** "Should network settings be tied directly to Admin in the code?"
> **Domain expert:** "No - network settings should be governed by an **Access Rule** whose minimum **Account Level** can be reviewed by future administrators."

> **Dev:** "If a Member cannot see a workflow, can they still perform it another way?"
> **Domain expert:** "No - an **Access Rule** controls both visibility and authority."

> **Dev:** "Can an Admin lower the rule that controls who edits Access Rules?"
> **Domain expert:** "No - changing Access Rules is reserved for the Developer **Account Level**."

> **Dev:** "Can future staff create a new Access Rule from Settings?"
> **Domain expert:** "No - Sentinel defines the **Access Rule** catalog, and staff can adjust the minimum **Account Level** for those rules."

> **Dev:** "Can a sensitive Access Rule be lowered all the way to Basic?"
> **Domain expert:** "No - each **Access Rule** has an **Access Rule Floor** that protects the lowest allowed threshold."

> **Dev:** "Can an Access Rule be disabled so nobody can use it?"
> **Domain expert:** "No - an **Access Rule** always has a minimum **Account Level**."

> **Dev:** "If an Access Rule requires Quartermaster, do Command Members get it too?"
> **Domain expert:** "Yes - **Account Levels** inherit upward for **Access Rules**."

> **Dev:** "Should the new Access Rules change who can do things immediately after upgrade?"
> **Domain expert:** "No - each **Access Rule** starts from Sentinel's current authority threshold."

> **Dev:** "Should Access Rules only cover the Admin Settings area?"
> **Domain expert:** "No - the **Access Rule** catalog covers Sentinel workflows whose visibility or authority depends on **Account Level**."

> **Dev:** "Should viewing a page and changing its data always require the same Account Level?"
> **Domain expert:** "No - view, change, and **Destructive Access Rules** may have different minimum **Account Levels**."

> **Dev:** "Can an Admin promote another Member to Admin or Developer?"
> **Domain expert:** "No - a **Member** cannot assign another Member an **Account Level** equal to or higher than their own, except at Developer **Account Level**."

> **Dev:** "Can a Member lower their own Account Level?"
> **Domain expert:** "No - a **Member** cannot lower their own **Account Level** through normal account-level management."

> **Dev:** "Can the last Developer-level Member be lowered or removed?"
> **Domain expert:** "No - Sentinel must retain at least one active Developer-level **Member**."

> **Dev:** "Can a Developer-level Member appoint another Developer-level Member?"
> **Domain expert:** "Yes - a Developer-level **Member** may assign another **Member** to Developer **Account Level**."

> **Dev:** "Do we need to know who changed an Access Rule later?"
> **Domain expert:** "Yes - an **Access Rule** change is an audited governance change."

> **Dev:** "Does an Access Rule change wait until Members sign in again?"
> **Domain expert:** "No - an **Access Rule** change takes effect immediately for authority checks."

> **Dev:** "If an Access Rule setting is missing or invalid, should Sentinel deny everyone?"
> **Domain expert:** "No - Sentinel uses the **Built-in Access Rule Default** and raises the problem for staff."

> **Dev:** "Can a Member read operationally sensitive help for a workflow they cannot use?"
> **Domain expert:** "No - operationally sensitive help follows the **Access Rule** for the workflow it explains."

> **Dev:** "Should routine reports and diagnostic logs use the same Access Rule?"
> **Domain expert:** "No - **Operational Reports** and **Diagnostic Records** may have different **Access Rules**."

> **Dev:** "Is exporting data safer just because it does not modify records?"
> **Domain expert:** "No - exporting Sentinel data is governed by a **Destructive Access Rule**."

> **Dev:** "Should all dashboard presence controls share one Access Rule?"
> **Domain expert:** "No - **Administrative Presence Actions** may have separate **Access Rules** from routine check-in workflows."

> **Dev:** "Does an Access Rule replace a lockup qualification?"
> **Domain expert:** "No - an **Access Rule** answers whether the Member may use that class of workflow; an **Operational Qualification** answers whether the Member is approved for that responsibility."

> **Dev:** "Is changing Access Rules the same authority as assigning Account Levels?"
> **Domain expert:** "No - changing **Access Rules**, assigning ordinary **Account Levels**, and assigning Developer **Account Level** are separate authorities."

> **Dev:** "Does the same Member have different Access Rules at different workstations?"
> **Domain expert:** "No - an **Access Rule** applies the same way across **Remote Systems**."

> **Dev:** "Should Developer recovery workflows be hidden from the Access Rule catalog?"
> **Domain expert:** "No - Developer recovery workflows are represented as **Access Rules** with Developer **Access Rule Floors**."

> **Dev:** "Does Sentinel Bootstrap count as a Developer-level Member?"
> **Domain expert:** "No - **System Identities** are excluded from **Access Rules** for human workflow access."

## Flagged Ambiguities

- "temporary people" could mean repeat visitors or short-term personnel - resolved: people working at the Unit for a defined assignment are **Temporary Personnel**.
- "visitor log" could mean Visitor Self-Service, a report, or a history view - resolved: use **Visitor Self-Service** for the Visitor-facing kiosk workflow.
- "option" could mean a page, button, API endpoint, or workflow - resolved: configurable access thresholds are **Access Rules**.
- "permission" could mean Account Level authority or operational approval - resolved: **Access Rules** govern Account Level authority, while **Operational Qualifications** govern approved responsibilities.
- "role" could mean Account Level authority, duty assignment, or organizational position - resolved: use **Access Rule** for configurable workflow thresholds and **Account Level** for member authority tiers.
