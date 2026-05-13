# History Records Table

> Audience: DDS, managers, admins

![History records table showing check-in and check-out audit rows](/uploads/wiki-dashboard/operations/history-records-table.png)

## What This Is

The records table is the detailed audit list. Each row represents one movement event recorded by Sentinel.

## When To Use It

- You need evidence for who entered or left.
- You need to compare a timestamp against a real event.
- You are deciding whether a row should be edited.

## What To Check

- Person or visitor identity.
- Timestamp and direction.
- Method such as badge, kiosk, or manual entry.
- Kiosk/source and review status.

## Step-By-Step Procedure

1. Read the row from left to right.
2. Confirm the person or visitor identity first.
3. Compare timestamp and direction against the real event.
4. Check method and status before editing.
5. Use pagination carefully when the record set spans multiple pages.

## Good / Caution / Stop Conditions

Good: Sentinel says the row happened and real evidence supports it.

Caution: Multiple rows near the same time can look similar. Match the exact row.

Stop: Do not edit a nearby row because it seems close enough.

## Confirm After Action

- The row you selected is the exact record needing action.
- Pagination and filters are still showing the intended result set.

## When To Escalate

Escalate if two rows conflict or a record is missing after the date range is widened.

## Related Pages

- [History Overview](/operations/history/overview)
- [Filters](/operations/history/filters)
- [Records Table](/operations/history/records-table)
- [Manual Corrections](/operations/history/manual-corrections)
- [DDS History Workflow](/operations/day-duty/checkins-history-and-corrections)
- [Dashboard Presence](/operations/dashboard/presence-grid)
