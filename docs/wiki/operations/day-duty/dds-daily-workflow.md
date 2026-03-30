# DDS Daily Workflow

> Audience: Duty Day Staff (DDS), duty supervisors, operations admins

[Open Sentinel Dashboard](http://sentinel.local/dashboard)

## Purpose

This page explains how Sentinel now manages DDS responsibility day to day and during the weekly handover.

The key rule is:

- The weekly schedule still changes on Monday.
- The live DDS does **not** switch automatically at rollover.
- The outgoing DDS remains responsible until DDS is explicitly transferred.

This removes the Monday-morning ambiguity where the next scheduled DDS appeared to become live before the building had actually been opened and before the handover had happened in real life.

## Core Concepts

### Scheduled DDS

The **scheduled DDS** is the person assigned on the weekly schedule for a given week.

- Schedules still run Monday to Monday.
- Stat holidays can delay the first operational day of the week.
- The scheduled DDS is the expected handover target for the new week.

### Live DDS

The **live DDS** is the person Sentinel currently treats as holding DDS responsibility right now.

- The live DDS is what drives the operational state.
- The live DDS is separate from the weekly schedule.
- The live DDS changes only through an explicit system action such as transfer or admin override.

### Handover Pending

**Handover pending** is the special weekly transition state.

- It starts on the first operational day of the new week.
- It applies when the outgoing week DDS and incoming week DDS are different people.
- While handover is pending, the outgoing DDS remains the live DDS.
- The incoming DDS is shown as the scheduled DDS, not the live DDS.

## Normal Daily Flow

On a normal day with no weekly transition in progress:

1. The scheduled DDS for the current week is the expected DDS for the day.
2. When that DDS is accepted or assigned in Sentinel, they become the live DDS.
3. If someone else opened the building first, lockup is transferred to the live DDS when DDS is accepted.
4. The live DDS remains responsible until DDS is transferred, replaced, or released.

## Weekly Handover Flow

### When the new week starts

At the start of a new week:

- Sentinel still recognizes the incoming week’s scheduled DDS.
- Sentinel does **not** automatically make that person the live DDS.
- The outgoing DDS stays live until a DDS transfer happens.

### What happens on the first operational day

On the first operational day of the week, the intended workflow is:

1. The outgoing DDS opens the building.
2. The outgoing DDS completes the morning DDS rounds.
3. The outgoing DDS performs a proper DDS transfer in Sentinel.
4. The incoming scheduled DDS becomes the new live DDS.

If Monday is a stat holiday, the same flow shifts to Tuesday. If Monday and Tuesday are both holidays, it shifts again to Wednesday. Sentinel uses the first non-holiday weekday as the handover day.

### During the handover window

While handover is still pending:

- Sentinel treats the outgoing DDS as the live DDS.
- Sentinel does **not** auto-seed the incoming DDS as the live DDS during daily rollover.
- Other members cannot self-accept DDS away from the outgoing DDS.
- The incoming DDS remains visible as the scheduled DDS for the current week.

### What completes the handover

The weekly handover is considered complete when DDS is explicitly moved away from the outgoing DDS for the current week.

Examples:

- The outgoing DDS transfers DDS to the incoming scheduled DDS.
- An admin transfers DDS to the incoming scheduled DDS.
- An admin assigns a different DDS for the week because of a sick call or other exception.

Once that happens:

- The incoming or replacement member becomes the live DDS.
- Future days in that week use the new week normally.
- Sentinel can again auto-create the expected pending DDS for later operational days.

## Building Opening and Lockup Behavior

DDS and building opening are related, but they are not the same thing.

- Opening the building resolves the building-secured state.
- DDS acceptance resolves live DDS responsibility.
- Accepting DDS can also open the building and align lockup automatically.
- During weekly handover, building opening can happen before DDS transfer is completed.

This means Sentinel can now represent the real-world sequence more accurately:

- outgoing DDS opens building first
- outgoing DDS remains live DDS during morning duties
- incoming DDS does not become live until transfer

## Dashboard and Kiosk Expectations

### Dashboard

On handover day, the dashboard should be interpreted as follows:

- **Live DDS**: outgoing DDS until transfer occurs
- **Scheduled DDS**: incoming DDS for the new week
- **Transfer DDS** action: use this to complete the weekly handover

If the live DDS and scheduled DDS are different on the first operational day, that usually means weekly handover is still pending.

### Kiosk

On handover day:

- The kiosk can still prompt for building opening if the building is secured.
- The kiosk should not allow another member to take DDS while the weekly handover is still pending.
- DDS responsibility remains locked to the outgoing DDS until a transfer is recorded.

## Daily Reset Behavior

Sentinel still performs its operational-day reset at the configured rollover time.

However, the DDS behavior is now different during weekly handover:

- Sentinel no longer auto-creates the incoming week’s pending DDS if weekly handover is still pending.
- This prevents the system from silently switching DDS at rollover.
- The incoming DDS only becomes live through an explicit transfer or override.

## Exceptions and Admin Overrides

Operations staff may need to override the normal weekly handover flow.

Examples:

- The outgoing DDS is absent.
- The incoming scheduled DDS is sick or unavailable.
- The building was opened by another qualified member before DDS transfer could happen.
- The weekly schedule needs to be overridden for an operational reason.

In those cases, an admin can use the dashboard DDS action to transfer or replace the live DDS. This counts as completing the weekly handover for that week.

## Operational Examples

### Example 1: Standard Monday handover

- Previous week DDS: PO1 Stone
- New week scheduled DDS: PO2 Wright
- Monday is not a holiday

Sequence:

1. Monday morning starts.
2. Sentinel still treats PO1 Stone as live DDS.
3. PO1 Stone opens the building and completes morning rounds.
4. DDS is transferred to PO2 Wright.
5. PO2 Wright becomes the live DDS for the rest of the week.

### Example 2: Monday holiday

- Monday is a stat holiday
- Tuesday is the first operational day

Sequence:

1. Tuesday morning is treated as the weekly handover day.
2. The previous week DDS remains live until transfer.
3. The incoming scheduled DDS does not become live automatically at rollover.
4. Transfer completes the handover on Tuesday.

### Example 3: Outgoing DDS unavailable

- The outgoing DDS cannot perform the handover

Sequence:

1. Admin reviews the operational situation.
2. Admin transfers or replaces the live DDS in Sentinel.
3. The assigned replacement becomes the live DDS.
4. The system treats weekly handover as complete from that point onward.

## Validation Checklist

Before considering DDS state resolved for the day, confirm all of the following:

- The building status matches reality.
- The live DDS matches the person who currently holds DDS responsibility.
- The scheduled DDS matches the current week’s published schedule.
- If this is the first operational day of the week, weekly handover has been explicitly completed.
- Lockup holder and DDS ownership do not conflict unexpectedly.

## Failure / Escalation

Escalate when any of these conditions occur:

- The scheduled DDS and live DDS differ unexpectedly outside of a known handover.
- The outgoing DDS cannot complete the transfer.
- The building has been opened but DDS transfer has not been completed.
- Someone tries to assume DDS without a proper handover.
- The dashboard and real-world responsibility do not match.

When escalating:

1. Capture the current dashboard state.
2. Record who physically opened the building.
3. Record who is expected to be the outgoing DDS and incoming DDS.
4. Record whether a DDS transfer has already been attempted.
5. Ask an admin to perform an override if operations cannot wait.

## Summary Rule

Use this rule when in doubt:

> The weekly schedule identifies who should take DDS next, but the live DDS does not change until Sentinel records an explicit DDS transfer or admin override.
