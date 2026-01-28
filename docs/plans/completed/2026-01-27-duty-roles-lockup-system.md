# Duty Roles & Lockup System Architecture

**Created:** 2026-01-27
**Completed:** 2026-01-27
**Status:** Completed
**Lifecycle:** Completed
**Priority:** High

---

## Overview

This plan defines a unified system for managing scheduled duty roles (DDS, Duty Watch) and the transferable Lockup responsibility at HMCS Chippawa.

---

## Detailed Business Context (User Requirements)

### DDS (Duty Day Staff) Responsibilities

The DDS is scheduled for a **full week, Monday to Monday**. Their responsibilities vary by day:

**Monday, Wednesday, Friday (Normal Days):**
- DDS handles building unlock in the morning
- DDS typically handles building lockup at end of day (~4pm, but can be earlier or later)
- DDS holds Lockup responsibility all day
- **However:** DDS can transfer Lockup to someone else if needed (e.g., appointment, leaving early)

**Tuesday, Thursday (Duty Watch Days):**
- DDS works a normal day shift (8am - 4pm)
- DDS must hand off the building to someone else before leaving at 4pm
- "Handing off the building" means transferring Lockup responsibility
- This interim person is entrusted with Lockup while DDS is at home
- When Duty Watch arrives at 7pm, the Senior Watchkeeper (SWK) takes over Lockup

### Duty Watch Structure

The Duty Watch is scheduled for a week but **only works Tuesday and Thursday nights**. The team consists of:

| Position | Abbreviation | Count | Description |
|----------|--------------|-------|-------------|
| Senior Watchkeeper | SWK | 1 | Team leader, takes Lockup responsibility |
| Deputy Senior Watchkeeper | DSWK | 1 | Backup to SWK |
| Quartermaster | QM | 1 | |
| Boatswain's Mate | BM | 1 | |
| Access Point Sentry | APS | 2 | Two positions |

**Total: 6 positions per Duty Watch team**

### Lockup Responsibility Chain (Tue/Thu)

1. **Morning**: DDS unlocks building, holds Lockup
2. **8am-4pm**: DDS works, still holds Lockup
3. **~4pm**: DDS hands off Lockup to interim person (so DDS can leave)
4. **4pm-7pm**: Interim person holds Lockup
5. **7pm**: Duty Watch arrives, SWK (or DSWK) takes Lockup
6. **End of night**: SWK performs building lockup (can be 11pm or as late as 2am)

### Critical Rule: DDS Cannot Leave Without Transferring

**The DDS cannot check-out of the system until they have passed off the Lockup status.** This is enforced by the system.

### Duty Watch Timing & Alerts

- Duty Watch starts at **7pm**
- All Duty Watch members must be checked in **before 7pm**
- If by **7pm** the SWK or DSWK have not taken over Lockup status → **Critical alert**
- If Duty Watch members are missing after 7pm → **Critical alert**

### Variable Lockup Times

Lockup timing varies significantly:

| Day | Typical Lockup Time | Who Typically Performs | Notes |
|-----|---------------------|------------------------|-------|
| Monday | ~4pm | DDS (or delegate) | Can be earlier/later |
| Tuesday | 11pm - 2am | SWK (Duty Watch) | Depends on events |
| Wednesday | ~4pm | DDS (or delegate) | Can be earlier/later |
| Thursday | 11pm - 2am | SWK (Duty Watch) | Depends on events |
| Friday | ~4pm | DDS (or delegate) | Can be earlier/later |

**Note:** DDS can transfer Lockup to another member any day if they have an appointment or need to leave before lockup time.

> "Lockup on Tue/Thu can sometimes be 11pm or it can sometimes run into 2am the next day if there's an event or party going on in one of the messes."

### Lockup Execution Process

The person with Lockup status is in charge of:
1. Making sure all doors are locked
2. Ensuring nobody is left in the building
3. Arming the security system

When they scan their card to check out, the system must distinguish between:
- **Locking up the building** (legitimate end-of-day)
- **Trying to leave while still having Lockup** (should be blocked)

### 3am Day Rollover

> "3am is the best time to conduct any 'new day' procedures such as resetting the Lockup tag to the DDS. Sometimes we have to come in really early so 3am is a good time after events and before early opening."

### Missed Checkout Tracking

When Admin or the Lockup Execution Sequence has to manually check a member or visitor out:
- Must be noted in the logs
- Must be tracked on the Member's record
- Track count of how many times they've forgotten to check out

### Future: Three Critical Tags Need Special Systems

These tags require special rules and systems once built:
1. **DDS** - Duty Day Staff (this plan)
2. **Duty Watch** - The evening team (this plan)
3. **Lockup** - Transferable responsibility (this plan)

All three are interconnected in this architecture.

---

## Summary of Requirements

The unit has three critical responsibilities that require scheduling and tracking:

| Role | Schedule | Duration | Structure | Active Days |
|------|----------|----------|-----------|-------------|
| **DDS** (Duty Day Staff) | Weekly | Mon-Mon | Single person | All days |
| **Lockup** | Daily | End of day | Transferable token | All days |
| **Duty Watch** | Weekly | Tue/Thu | Team of 6 positions | Tue, Thu only |

**Duty Watch Positions:**
- 1x Senior Watchkeeper (SWK)
- 1x Deputy Senior Watchkeeper (DSWK)
- 1x Quartermaster (QM)
- 1x Boatswain's Mate (BM)
- 2x Access Point Sentry (APS)

---

## Key Concepts

### Lockup is a Transferable Responsibility Token

Lockup is NOT a scheduled role - it's a responsibility that gets passed between people throughout the day:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    LOCKUP RESPONSIBILITY FLOW                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  MON/WED/FRI (Normal Days - Typical)                                    │
│  ┌─────────┐                                              ┌─────────┐   │
│  │   DDS   │ ─────────── Holds Lockup all day ──────────▶ │ Lockup  │   │
│  └─────────┘                                              └─────────┘   │
│                                                                         │
│  MON/WED/FRI (If DDS has appointment/leaves early)                      │
│  ┌─────────┐      ┌─────────┐                             ┌─────────┐   │
│  │   DDS   │─────▶│ Another │ ────────────────────────── │ Lockup  │   │
│  │         │      │ Member  │                             │         │   │
│  └─────────┘      └─────────┘                             └─────────┘   │
│                                                                         │
│  TUE/THU (Duty Watch Days)                                              │
│  ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐        │
│  │   DDS   │─────▶│ Interim │─────▶│   SWK   │─────▶│ Lockup  │        │
│  │ (8am-4pm)│ 4pm │ Person  │ 7pm  │(Duty Wtch)│     │         │        │
│  └─────────┘      └─────────┘      └─────────┘      └─────────┘        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Operational Day (3am Rollover)

The operational day runs from 3am to 3am (not midnight to midnight) to accommodate late-night events:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    OPERATIONAL DAY DEFINITION                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Calendar Day:  |-- Mon 00:00 --|-- Tue 00:00 --|-- Wed 00:00 --|      │
│                                                                         │
│  Operational    |------- Monday -------|------- Tuesday -------|       │
│  Day:           3am                    3am                     3am      │
│                                                                         │
│  Example Timeline (Tuesday Duty Watch):                                 │
│                                                                         │
│  Mon 3am ──────────────────────────────────────────────▶ Tue 3am       │
│      │                                                       │          │
│      │  "Monday" operational day                             │          │
│      │  DDS has Lockup                                       │          │
│      │  Lockup ~4pm                                          │          │
│      └───────────────────────────────────────────────────────┘          │
│                                                                         │
│  Tue 3am ──────────────────────────────────────────────▶ Wed 3am       │
│      │                                                       │          │
│      │  "Tuesday" operational day                            │          │
│      │  DDS gets Lockup at 3am                               │          │
│      │  DDS works 8am-4pm, transfers Lockup                  │          │
│      │  SWK takes Lockup at 7pm                              │          │
│      │  Duty Watch event runs until 1:30am Wed               │          │
│      │  SWK executes Lockup at 1:45am Wed (still "Tuesday")  │          │
│      └───────────────────────────────────────────────────────┘          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Business Rules

### DDS Rules
1. DDS is scheduled Monday to Monday (weekly)
2. DDS automatically receives Lockup responsibility at start of their week
3. DDS **cannot check out** until Lockup is transferred to someone else
4. On Mon/Wed/Fri: DDS handles unlock (AM) and lockup (PM)
5. On Tue/Thu: DDS works 8am-4pm, must hand off Lockup before leaving

### Duty Watch Rules
1. Duty Watch is scheduled weekly, active Tuesday and Thursday nights only
2. Duty Watch starts at 7pm
3. All Duty Watch members must be checked in by 7pm
4. SWK (or DSWK) must take Lockup responsibility by 7pm
5. Critical alerts if Duty Watch members missing after 7pm
6. Critical alert if Lockup not transferred to SWK/DSWK by 7pm

### Lockup Rules
1. Lockup is a transferable responsibility token
2. Only one person holds Lockup at any time
3. **Lockup can ONLY be transferred to qualified members** (see Lockup Qualifications below)
4. DDS doesn't have to personally perform lockup - they can transfer it if they have an appointment or need to leave early
5. Lockup holder cannot check out without either:
   - Transferring Lockup to another qualified member
   - Executing building lockup (end of day)
6. Lockup execution can happen at variable times:
   - Mon/Wed/Fri: Usually ~4pm (but whoever holds Lockup does it)
   - Tue/Thu: Can be 11pm to 2am depending on events

### Lockup Qualifications

**Only members with one of these qualifications can receive Lockup responsibility:**

| Qualification | Description | Typical Use |
|---------------|-------------|-------------|
| **DDS Qualified** | Trained to serve as Duty Day Staff | Can receive Lockup any time |
| **SWK Qualified** | Trained to serve as Senior Watchkeeper | Takes over on Tue/Thu evenings |
| **Building Authorized** | Has alarm codes and building access, but not DDS/SWK qualified | Can receive Lockup in a pinch |

**System must enforce:** When transferring Lockup, only show/allow members who have **at least one** qualification with `canReceiveLockup=true` AND are currently checked in.

**Important:** Qualifications are additive. A member can have multiple qualifications. If a member has FM (canReceiveLockup=false) but also has DDS Qualified (canReceiveLockup=true), they CAN receive Lockup because of their DDS qualification. The system checks if the member has ANY lockup-eligible qualification.

### Other Qualifications (Tracked but not Lockup-related)

The system also tracks these qualifications for other purposes:

| Qualification | Description | Notes |
|---------------|-------------|-------|
| **Vault Key** | Has physical key to the vault | |
| **Vault Code** | Knows the vault combination | |
| **Facility Manager (FM)** | Facility Manager responsibilities | Usually also DDS Qualified |
| **ISA** | Unit Security Authority responsibilities | Usually also DDS Qualified |

These qualifications use the same `MemberQualification` table but have `canReceiveLockup=false`. However, members with these qualifications typically also have DDS Qualified, which grants them Lockup eligibility.

---

## Critical Alerts

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CRITICAL ALERTS                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ALERT: duty_watch_missing_lockup                                       │
│  ├── Trigger: Tue/Thu at 7:00pm                                         │
│  ├── Condition: Lockup NOT held by SWK or DSWK                          │
│  ├── Severity: CRITICAL                                                 │
│  └── Message: "Duty Watch has not taken over Lockup responsibility"     │
│                                                                         │
│  ALERT: duty_watch_member_missing                                       │
│  ├── Trigger: Tue/Thu at 7:00pm                                         │
│  ├── Condition: Scheduled Duty Watch member not checked in              │
│  ├── Severity: CRITICAL                                                 │
│  └── Message: "{Position} {Name} has not checked in for Duty Watch"     │
│                                                                         │
│  ALERT: dds_checkout_without_lockup_transfer                            │
│  ├── Trigger: DDS attempts to check out                                 │
│  ├── Condition: DDS still holds Lockup                                  │
│  ├── Severity: WARNING (block checkout)                                 │
│  └── Message: "You must transfer Lockup before checking out"            │
│                                                                         │
│  ALERT: lockup_not_executed                                             │
│  ├── Trigger: Configurable time (e.g., 10:00pm warning, 11pm critical)  │
│  ├── Condition: Lockup not executed, people still checked in            │
│  ├── Severity: CRITICAL                                                 │
│  └── Message: "Building lockup has not been performed"                  │
│                                                                         │
│  ALERT: building_not_secured_3am                                        │
│  ├── Trigger: 3:00am daily reset                                        │
│  ├── Condition: Building not secured from previous day                  │
│  ├── Severity: CRITICAL                                                 │
│  └── Message: "Building was not secured - Lockup not executed"          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Lockup Execution Flow

### When Lockup Holder Scans to Check Out

```
┌─────────────────────────────────────────────────────────────────────────┐
│              WHEN LOCKUP HOLDER SCANS TO CHECK OUT                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────┐                                                   │
│  │ Badge Scan at    │                                                   │
│  │ Exit Kiosk       │                                                   │
│  └────────┬─────────┘                                                   │
│           │                                                             │
│           ▼                                                             │
│  ┌──────────────────┐     No      ┌──────────────────┐                  │
│  │ Holds Lockup?    │────────────▶│ Normal Checkout  │                  │
│  └────────┬─────────┘             └──────────────────┘                  │
│           │ Yes                                                         │
│           ▼                                                             │
│  ┌──────────────────────────────────────────────────┐                   │
│  │              LOCKUP HOLDER OPTIONS               │                   │
│  │                                                  │                   │
│  │  ┌─────────────────────────────────────────┐    │                   │
│  │  │  🔒 LOCK UP BUILDING                    │    │                   │
│  │  │  "I am securing the building for       │    │                   │
│  │  │   the night"                           │    │                   │
│  │  └─────────────────────────────────────────┘    │                   │
│  │                                                  │                   │
│  │  ┌─────────────────────────────────────────┐    │                   │
│  │  │  🔄 TRANSFER LOCKUP                     │    │                   │
│  │  │  "Hand off responsibility to           │    │                   │
│  │  │   another member"                      │    │                   │
│  │  └─────────────────────────────────────────┘    │                   │
│  │                                                  │                   │
│  │  ┌─────────────────────────────────────────┐    │                   │
│  │  │  ❌ CANCEL                              │    │                   │
│  │  │  "Return to previous screen"           │    │                   │
│  │  └─────────────────────────────────────────┘    │                   │
│  └──────────────────────────────────────────────────┘                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Lock Up Building Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    LOCKUP EXECUTION SEQUENCE                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  STEP 1: Show Current Building Status                                   │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  🏢 BUILDING STATUS                                              │   │
│  │                                                                  │   │
│  │  Members Still Checked In: 3                                     │   │
│  │  ├── PO1 Smith, John (Orderly Room)                              │   │
│  │  ├── LS Jones, Mary (Supply)                                     │   │
│  │  └── OS Brown, Mike (Galley)                                     │   │
│  │                                                                  │   │
│  │  Visitors Still Checked In: 1                                    │   │
│  │  └── Jane Doe (Contractor - IT Services)                         │   │
│  │                                                                  │   │
│  │  ⚠️  4 people must leave before lockup                          │   │
│  │                                                                  │   │
│  │  [Check Out All & Lock Up]  [Refresh]  [Cancel]                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  STEP 2: Confirm Lockup                                                 │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  ⚠️  CONFIRM BUILDING LOCKUP                                     │   │
│  │                                                                  │   │
│  │  This will:                                                      │   │
│  │  • Check out 3 members and 1 visitor                             │   │
│  │  • Mark the building as secured                                  │   │
│  │  • Check you out as the last person                              │   │
│  │  • Log this lockup in the audit trail                            │   │
│  │                                                                  │   │
│  │  Optional Note:                                                  │   │
│  │  ┌──────────────────────────────────────────────────────────┐    │   │
│  │  │ All doors secured. Alarm armed.                          │    │   │
│  │  └──────────────────────────────────────────────────────────┘    │   │
│  │                                                                  │   │
│  │  [Confirm Lock Up]  [Go Back]                                    │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  STEP 3: Lockup Complete                                                │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  ✅ BUILDING SECURED                                             │   │
│  │                                                                  │   │
│  │  Lockup completed at 11:47 PM                                    │   │
│  │  By: PO2 Williams, Tom (SWK)                                     │   │
│  │                                                                  │   │
│  │  Checked out: 3 members, 1 visitor                               │   │
│  │                                                                  │   │
│  │  You have been checked out. Good night!                          │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Transfer Lockup Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     LOCKUP TRANSFER SEQUENCE                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  STEP 1: Select Recipient (Only Qualified Members Shown)                │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  🔄 TRANSFER LOCKUP RESPONSIBILITY                               │   │
│  │                                                                  │   │
│  │  Qualified & Checked In:                                         │   │
│  │  ○ PO1 Smith, John (DDS Qualified)                               │   │
│  │  ○ LS Jones, Mary (SWK Qualified)                                │   │
│  │  ○ MS Brown, Mike (Building Authorized)                          │   │
│  │                                                                  │   │
│  │  Or have them scan their badge: [Waiting for scan...]            │   │
│  │  (Must be DDS Qualified, SWK Qualified, or Building Authorized)  │   │
│  │                                                                  │   │
│  │  [Transfer to Selected]  [Cancel]                                │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  STEP 2: Confirm Transfer                                               │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  ✅ LOCKUP TRANSFERRED                                           │   │
│  │                                                                  │   │
│  │  PO1 Smith, John now has Lockup responsibility                   │   │
│  │                                                                  │   │
│  │  You may now check out.                                          │   │
│  │                                                                  │   │
│  │  [Check Out Now]  [Stay Checked In]                              │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Building Status Lifecycle

```
┌────────────────────────────────────────────────────────────────┐
│                    DAILY BUILDING LIFECYCLE                    │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  3:00 AM ─────────────────────────────────────────────────────▶│
│    │                                                           │
│    ▼                                                           │
│  ┌──────────────┐                                              │
│  │   SECURED    │  Building locked from previous night         │
│  │   (overnight)│  No one checked in                           │
│  └──────┬───────┘                                              │
│         │  DDS checks in / unlocks                             │
│         ▼                                                      │
│  ┌──────────────┐                                              │
│  │    OPEN      │  Building operational                        │
│  │              │  Lockup held by: DDS                         │
│  └──────┬───────┘                                              │
│         │  (Tue/Thu only) DDS transfers → Interim → SWK        │
│         │  Lockup can transfer multiple times                  │
│         ▼                                                      │
│  ┌──────────────┐                                              │
│  │  LOCKING UP  │  Lockup holder initiates lockup              │
│  │              │  Checking out remaining people               │
│  └──────┬───────┘                                              │
│         │  All out, holder checks out                          │
│         ▼                                                      │
│  ┌──────────────┐                                              │
│  │   SECURED    │  Building locked, alarm armed                │
│  │   (night)    │  Lockup executed at [time]                   │
│  └──────────────┘                                              │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Missed Checkout Tracking

When someone is force-checked-out (by admin or lockup sequence), track it:

### Member Profile View

```
┌─────────────────────────────────────────────────────────────────────────┐
│              MEMBER PROFILE - CHECKOUT STATS                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  PO1 Smith, John                                                        │
│  Service #: A12345678                                                   │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │  📊 CHECK-IN/OUT STATISTICS                                    │     │
│  │                                                                │     │
│  │  Total Check-ins (this year):     142                          │     │
│  │  Missed Checkouts:                  5  ⚠️                      │     │
│  │  Compliance Rate:                96.5%                         │     │
│  │                                                                │     │
│  │  Last Missed Checkout:  Jan 15, 2026                           │     │
│  │                                                                │     │
│  │  [View Missed Checkout History]                                │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                         │
│  Missed Checkout Details:                                               │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │  Date       │ Checked In │ Forced Out │ By              │ Note │     │
│  │─────────────┼────────────┼────────────┼─────────────────┼──────│     │
│  │  Jan 15     │ 08:15 AM   │ 11:42 PM   │ Lockup Sequence │      │     │
│  │  Dec 03     │ 07:45 AM   │ 05:30 PM   │ Admin (Jones)   │ Left │     │
│  │  Nov 22     │ 09:00 AM   │ 11:58 PM   │ Lockup Sequence │      │     │
│  │  Oct 18     │ 08:30 AM   │ 04:15 PM   │ Admin (Brown)   │ Sick │     │
│  │  Sep 05     │ 08:00 AM   │ 11:45 PM   │ Lockup Sequence │      │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Model

### Scheduled Roles

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SCHEDULED ROLES                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  DutyRole                           DutyPosition (team roles only)      │
│  ├── id, code, name                 ├── id, dutyRoleId                  │
│  ├── roleType: single | team        ├── code, name                      │
│  ├── scheduleType: weekly           ├── maxSlots (1 or 2)               │
│  └── activeDays: []                 └── displayOrder                    │
│                                                                         │
│  WeeklySchedule                     ScheduleAssignment                  │
│  ├── id, dutyRoleId                 ├── id, scheduleId                  │
│  ├── weekStartDate (Monday)         ├── dutyPositionId (nullable)       │
│  ├── status: draft|published|active ├── memberId                        │
│  └── createdBy, publishedAt         └── status, notes                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Lockup System

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     LOCKUP DATA STRUCTURES                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  LockupStatus (current state - one active record per day)               │
│  ├── id                                                                 │
│  ├── date (operational date)                                            │
│  ├── currentHolderId (FK to Member)                                     │
│  ├── acquiredAt                                                         │
│  ├── buildingStatus: 'open' | 'secured'                                 │
│  ├── securedAt (nullable - when lockup was executed)                    │
│  ├── securedBy (nullable - who performed lockup)                        │
│  └── isActive (false after building secured)                            │
│                                                                         │
│  LockupTransfer (every handoff)                                         │
│  ├── id                                                                 │
│  ├── lockupStatusId (FK)                                                │
│  ├── fromMemberId                                                       │
│  ├── toMemberId                                                         │
│  ├── transferredAt                                                      │
│  ├── reason: 'manual' | 'dds_handoff' | 'duty_watch_takeover'           │
│  └── notes                                                              │
│                                                                         │
│  LockupExecution (end of day record)                                    │
│  ├── id                                                                 │
│  ├── lockupStatusId (FK)                                                │
│  ├── executedBy (FK to Member)                                          │
│  ├── executedAt                                                         │
│  ├── membersCheckedOut (JSON array of IDs + names)                      │
│  ├── visitorsCheckedOut (JSON array of IDs + names)                     │
│  ├── totalCheckedOut                                                    │
│  └── notes                                                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Member Qualifications

**Decision: Use qualification table (Option B) for flexibility and audit trail.**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     MEMBER QUALIFICATIONS                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  QualificationType (enum/reference table)                               │
│  ├── id                                                                 │
│  ├── code: 'DDS' | 'SWK' | 'BUILDING_AUTH'                              │
│  ├── name: 'DDS Qualified' | 'SWK Qualified' | 'Building Authorized'    │
│  ├── description                                                        │
│  └── canReceiveLockup (Boolean, default true)                           │
│                                                                         │
│  MemberQualification (join table with audit)                            │
│  ├── id                                                                 │
│  ├── memberId (FK to Member)                                            │
│  ├── qualificationTypeId (FK to QualificationType)                      │
│  ├── status: 'active' | 'expired' | 'revoked'                           │
│  ├── grantedAt                                                          │
│  ├── grantedBy (FK to AdminUser)                                        │
│  ├── expiresAt (nullable - for time-limited quals)                      │
│  ├── revokedAt (nullable)                                               │
│  ├── revokedBy (FK to AdminUser, nullable)                              │
│  ├── revokeReason (nullable)                                            │
│  ├── notes                                                              │
│  ├── createdAt                                                          │
│  └── updatedAt                                                          │
│                                                                         │
│  Benefits:                                                              │
│  • Full audit trail (who granted, when, why revoked)                    │
│  • Support for expiring qualifications                                  │
│  • Can add new qualification types without schema changes               │
│  • Can track qualification history                                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Missed Checkout Tracking

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     MISSED CHECKOUT TRACKING                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Member (additional fields)                                             │
│  ├── missedCheckoutCount (Int, default 0)                               │
│  └── lastMissedCheckout (DateTime, nullable)                            │
│                                                                         │
│  MissedCheckout (detailed history)                                      │
│  ├── id                                                                 │
│  ├── memberId (FK)                                                      │
│  ├── date                                                               │
│  ├── originalCheckin                                                    │
│  ├── forcedCheckout                                                     │
│  ├── resolvedBy: 'lockup_sequence' | 'admin'                            │
│  ├── resolvedById (FK to AdminUser, nullable)                           │
│  ├── lockupExecutionId (FK, nullable)                                   │
│  └── notes                                                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Seed Data

**DutyRole entries:**

| code | name | type | schedule | activeDays |
|------|------|------|----------|------------|
| DDS | Duty Day Staff | single | weekly | [1,2,3,4,5,6,7] |
| DUTY_WATCH | Duty Watch | team | weekly | [2,4] (Tue, Thu) |

**DutyPosition entries (for DUTY_WATCH):**

| code | name | maxSlots | displayOrder |
|------|------|----------|--------------|
| SWK | Senior Watchkeeper | 1 | 1 |
| DSWK | Deputy Senior Watchkeeper | 1 | 2 |
| QM | Quartermaster | 1 | 3 |
| BM | Boatswain's Mate | 1 | 4 |
| APS | Access Point Sentry | 2 | 5 |

**QualificationType entries:**

| code | name | description | canReceiveLockup |
|------|------|-------------|------------------|
| DDS | DDS Qualified | Trained to serve as Duty Day Staff | true |
| SWK | SWK Qualified | Trained to serve as Senior Watchkeeper | true |
| BUILDING_AUTH | Building Authorized | Has alarm codes and building access | true |
| VAULT_KEY | Vault Key Holder | Has physical key to the vault | false |
| VAULT_CODE | Vault Code Holder | Knows the vault combination | false |
| FM | Facility Manager | Facility Manager responsibilities | false |
| ISA | ISA | Unit Security Authority responsibilities | false |

**Note:** `canReceiveLockup` indicates which qualifications allow a member to receive Lockup responsibility. Additional qualifications (Vault Key, Vault Code, FM, ISA) are tracked for other purposes but don't grant Lockup eligibility by default.

---

## API Design

### Schedule Management (Admin)

```
/api/duty-roles                    # Role definitions
  GET    /                         # List all duty roles
  GET    /:id                      # Get role details + positions

/api/duty-roles/:roleId/positions  # Position management
  GET    /                         # List positions for role

/api/schedules                     # Weekly schedule management
  GET    /                         # List schedules (with filters)
  GET    /current                  # Current week's schedules
  GET    /week/:date               # Schedules for specific week
  POST   /                         # Create new schedule (admin)

/api/schedules/:id
  GET    /                         # Get schedule with assignments
  PATCH  /                         # Update schedule metadata
  POST   /publish                  # Publish draft schedule
  DELETE /                         # Delete draft schedule

/api/schedules/:id/assignments     # Assignment management
  GET    /                         # List all assignments
  POST   /                         # Assign member to position
  PATCH  /:assignmentId            # Update assignment
  DELETE /:assignmentId            # Remove assignment
  POST   /:assignmentId/swap       # Swap with another member
```

### DDS Domain

```
/api/dds
  GET    /current                  # Current DDS member
  GET    /week/:date               # DDS for specific week
  POST   /assign                   # Assign DDS (creates schedule)
```

### Duty Watch Domain

```
/api/duty-watch
  GET    /current                  # Current week's team
  GET    /tonight                  # Tonight's team (if Tue/Thu)
  GET    /positions                # List positions
```

### Lockup

```
/api/lockup
  # Status
  GET    /status                   # Current lockup status + holder
  GET    /status/:date             # Status for specific date

  # Holder Management
  GET    /holder                   # Who currently holds Lockup
  POST   /transfer                 # Transfer to another member
         body: { toMemberId, reason?, notes? }

  # Checkout Integration
  GET    /checkout-options/:memberId   # What options to show at checkout
         response: { holdsLockup, canCheckout, options: ['lockup', 'transfer'] }

  # Lockup Execution
  GET    /present                  # Who's still in building
  POST   /execute                  # Execute building lockup
         body: { executedBy, notes?, forceCheckoutMemberIds?: [] }

  # History
  GET    /history                  # Transfer + execution history
  GET    /history/:date            # History for specific date
```

---

## 3am Daily Reset Procedure

```
┌─────────────────────────────────────────────────────────────────────────┐
│              DAILY 3AM RESET PROCEDURE                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Scheduled Job: Every day at 3:00 AM local time                         │
│                                                                         │
│  1. CHECK: Is building secured?                                         │
│     ├── YES → Continue to step 2                                        │
│     └── NO  → CRITICAL ALERT: Building not secured!                     │
│              (Someone still has Lockup, building may be open)           │
│                                                                         │
│  2. CHECK: Anyone still checked in?                                     │
│     ├── YES → WARNING ALERT: Members still checked in at 3am            │
│     │         - Force checkout all remaining                            │
│     │         - Create MissedCheckout records                           │
│     └── NO  → Continue                                                  │
│                                                                         │
│  3. CREATE: New operational day                                         │
│     ├── Create new LockupStatus record                                  │
│     │   - date: today's operational date                                │
│     │   - buildingStatus: 'secured' (from overnight)                    │
│     │   - currentHolderId: NULL (assigned when DDS checks in)           │
│     └── OR: Auto-assign to scheduled DDS if known                       │
│                                                                         │
│  4. PREPARE: Duty Watch alerts (if Tue/Thu)                             │
│     └── Schedule 7pm alert check                                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Configuration

```typescript
// Settings table entries
{
  key: 'lockup_settings',
  category: 'operations',
  value: {
    dayRolloverTime: '03:00',
    timezone: 'America/Winnipeg',

    // Alert thresholds
    dutyWatchStartTime: '19:00',           // 7pm
    lockupNotExecutedWarningTime: '22:00', // 10pm warning
    lockupNotExecutedCriticalTime: '23:00',// 11pm critical

    // Missed checkout tracking
    trackMissedCheckouts: true,
    missedCheckoutWarningThreshold: 3,     // Show warning on profile
    missedCheckoutAlertThreshold: 5,       // Alert admin
  }
}
```

---

## Implementation Phases

### Phase 1: Database Schema
- [ ] Add DutyRole, DutyPosition models
- [ ] Add WeeklySchedule, ScheduleAssignment, ScheduleChange models
- [ ] Add LockupStatus, LockupTransfer, LockupExecution models
- [ ] Add MissedCheckout model
- [ ] Add missedCheckoutCount, lastMissedCheckout to Member
- [ ] Add QualificationType table (DDS, SWK, BUILDING_AUTH)
- [ ] Add MemberQualification table (with audit fields)
- [ ] Create seed data for duty roles, positions, and qualification types

### Phase 2: Core Utilities
- [ ] Implement `getOperationalDate()` function (3am rollover)
- [ ] Implement `getOperationalWeek()` function
- [ ] Create timezone-aware date utilities

### Phase 3: Lockup System
- [ ] Refactor existing lockup routes to new data model
- [ ] Implement lockup transfer API
- [ ] **Enforce qualification check on transfer** (DDS Qualified, SWK Qualified, or Building Authorized)
- [ ] Implement lockup execution with missed checkout tracking
- [ ] Integrate with checkout flow (detect lockup holder)

### Phase 4: Schedule System
- [ ] Implement DDS scheduling API
- [ ] Implement Duty Watch scheduling API
- [ ] Create schedule management UI (admin)
- [ ] Implement assignment/swap functionality

### Phase 5: Alerts & Automation
- [ ] Implement 7pm Duty Watch alerts
- [ ] Implement 3am reset job
- [ ] Implement lockup not executed alerts
- [ ] Configure alert thresholds in settings

### Phase 6: Frontend Integration
- [ ] Kiosk lockup holder checkout flow
- [ ] Admin schedule management UI
- [ ] Member profile missed checkout stats
- [ ] **Member qualifications management UI**:
  - [ ] View current qualifications on member profile
  - [ ] Grant/revoke qualifications (with reason)
  - [ ] Set expiration dates
  - [ ] View qualification history
  - [ ] Filter members by qualification in member list
- [ ] Dashboard duty status widgets

---

## Migration from Current System

### What Gets Removed
- `tag.contract.ts` (lockup transfer via tags)
- `/routes/tags.ts` (lockup tag operations)
- Lockup as a Tag concept

### What Gets Refactored
- Existing `DdsAssignment` table → migrate to new WeeklySchedule system
- Existing lockup routes → new LockupStatus-based system
- `ResponsibilityAuditLog` → replaced by LockupTransfer + ScheduleChange

### What Stays
- `Tag` / `MemberTag` tables for simple member labels
- Enum tags CRUD at `/api/enums/tags`

---

## Related Files

- Current DDS: `apps/backend/src/routes/dds.ts`
- Current Lockup: `apps/backend/src/routes/lockup.ts`
- Current Tag Transfer: `apps/backend/src/routes/tags.ts`
- Prisma Schema: `packages/database/prisma/schema.prisma`

---

## Appendix: Current Naming Issues (Pre-Refactor)

During investigation, the following naming conflicts were identified that this refactor will resolve:

### Dual Tags Routers Problem

Two completely different routers were both named `tagsRouter`:

| File | Export | Contract | API Path | Purpose |
|------|--------|----------|----------|---------|
| `routes/enums.ts` | `tagsRouter` | `tagsContract` | `/api/enums/tags` | Tag CRUD |
| `routes/tags.ts` | `tagsRouter` | `tagContract` | `/api/tags/lockup/*` | Lockup transfer |

**Current Workaround in app.ts:**
```typescript
import { tagsRouter as enumTagsRouter } from './routes/enums.js'
import { tagsRouter } from './routes/tags.js'
```

### Resolution After This Refactor

| Current | After Refactor | Notes |
|---------|----------------|-------|
| `tagsContract` (enum.contract.ts) | Keep as-is | Tag enum CRUD |
| `tagContract` (tag.contract.ts) | **DELETE** | Merged into lockup |
| `tagsRouter` (enums.ts) | Rename to `enumTagsRouter` | Clarity |
| `tagsRouter` (tags.ts) | **DELETE** | Merged into lockup |
| `/api/tags/lockup/*` | **DELETE** | Now `/api/lockup/*` |

### Tags vs Duty Roles (Final State)

After refactor, clear separation:

| Concept | System | Purpose |
|---------|--------|---------|
| **Tags** | `Tag`/`MemberTag` tables | Simple labels for members (e.g., "Officer Cadet", "New Member", "Exempt from PT") |
| **Duty Roles** | New scheduling system | Scheduled responsibilities with assignments, transfers, alerts |

**Lockup, DDS, SWK, etc. will NOT be Tags** - they will be Duty Roles/Positions managed by the new scheduling system.
