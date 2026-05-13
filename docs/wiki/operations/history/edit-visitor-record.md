# Edit Visitor History Record

> Audience: Managers and admins

![Edit visitor history record modal](/uploads/wiki-dashboard/operations/history-edit-visitor-record.png)

## What This Is

Visitor record edit updates visitor identity details tied to History and Presence records.

## When To Use It

- A visitor name, organization, visit type, or note was entered incorrectly.
- A host confirms a visitor detail should be corrected.
- The record needs clearer audit context.

## What To Check

- Sentinel says the visitor identity detail is wrong or incomplete.
- The real visitor or host confirms the correct information.
- The timestamp and checkout state are not being changed by this identity edit.

## Step-By-Step Procedure

1. Find the visitor row in History.
2. Open Edit Visitor on that row.
3. Correct only identity or note fields that are wrong.
4. Save and review the History row.
5. If the visitor is still present, recheck Dashboard Presence.

## Good / Caution / Stop Conditions

Good: The visitor details now match the real visitor record.

Caution: Visitor edits can make a record look like a different person if entered carelessly.

Stop: Do not change visitor identity when the visitor or host cannot be confirmed.

## Confirm After Action

- The visitor row shows the corrected name or organization.
- Any active visitor still appears correctly in Presence.

## When To Escalate

Escalate if visitor identity is uncertain, tied to an alert, or affects lockup readiness.

## Related Pages

- [History Overview](/operations/history/overview)
- [Filters](/operations/history/filters)
- [Records Table](/operations/history/records-table)
- [Manual Corrections](/operations/history/manual-corrections)
- [DDS History Workflow](/operations/day-duty/checkins-history-and-corrections)
- [Dashboard Presence](/operations/dashboard/presence-grid)
