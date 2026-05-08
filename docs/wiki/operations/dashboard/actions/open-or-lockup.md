# Actions: Open or Lockup

![Open Building and Execute Lockup controls](/uploads/wiki-dashboard/operations/dashboard-lockup-ready-state.png)

Open Building and Execute Lockup are opposite building-state actions.

## What This Is

Open Building and Execute Lockup are opposite building-state actions.

## When To Use It

Use Open Building when a qualified person is taking responsibility for an already secured building. Use Execute Lockup when the building should be secured.

## What To Check

- Current Building Status.
- Current Lockup Holder.
- People still present.
- Active alerts.

## Step-by-Step Admin Procedure

1. Compare Sentinel Building Status to the real building.
2. Confirm the responsible person.
3. Review Presence and alerts.
4. Use the action that matches the real state.
5. Recheck Building Status.

## Good / Caution / Stop Conditions

Good: Building Status changes to the expected state.

Caution: The button is available but pre-checks are not complete.

Stop: Sentinel and the real building disagree.

## What To Confirm After Action

Confirm Building Status, Lockup Holder, and Presence.

## When To Escalate

Escalate mismatched or failed building-state changes.

## Related Dashboard Help Pages

- [Overview](/operations/dashboard/overview)
- [Status Panel](/operations/dashboard/status-panel)
- [Action Block](/operations/dashboard/actions/action-block)
- [Open Or Lockup](/operations/dashboard/actions/open-or-lockup)
- [Transfer DDS](/operations/dashboard/actions/transfer-dds)
- [Transfer Lockup](/operations/dashboard/actions/transfer-lockup)
- [Manual In Out](/operations/dashboard/actions/manual-in-out)
