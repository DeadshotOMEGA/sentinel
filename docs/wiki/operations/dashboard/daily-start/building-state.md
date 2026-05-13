# Daily Start: Building State

![Building Status block in the status panel](/uploads/wiki-dashboard/operations/dashboard-stat-building.png)

Building Status is Sentinel's record of whether the building is open, secured, or in a transition state.

## What This Is

Building Status is Sentinel's record of whether the building is open, secured, or in a transition state.

## When To Use It

Use it before opening the building, securing the building, or explaining a status mismatch.

## What To Check

- Sentinel says Open or Secured.
- The real building condition matches Sentinel.
- The available action matches what should happen next.
- The lockup holder is correct for the current state.

## Step-by-Step Admin Procedure

1. Read the Building Status block.
2. Compare it to the real building state.
3. Check whether Open Building or Execute Lockup is the expected next action.
4. Do not use actions to hide a mismatch.
5. Escalate if Sentinel and reality disagree.

## Good / Caution / Stop Conditions

Good: Sentinel and the real building state agree.

Caution: The state is valid, but the next expected action is not obvious.

Stop: Sentinel says Open while the building is secured, or Sentinel says Secured while the building is open.

## What To Confirm After Action

After an open or lockup action, confirm Building Status changed as expected.

## When To Escalate

Escalate mismatched building state before pressing Open Building or Execute Lockup.

## Related Dashboard Help Pages

- [Overview](/operations/dashboard/overview)
- [Building State](/operations/dashboard/status/building-state)
- [Open Or Lockup](/operations/dashboard/actions/open-or-lockup)
- [System Status](/operations/dashboard/daily-start/system-status)
- [Security Alerts](/operations/dashboard/daily-start/security-alerts)
- [DDS](/operations/dashboard/daily-start/dds)
- [Duty Watch](/operations/dashboard/daily-start/duty-watch)
- [Building State](/operations/dashboard/daily-start/building-state)
- [Presence Review](/operations/dashboard/daily-start/presence-review)
- [Escalation](/operations/dashboard/daily-start/escalation)
