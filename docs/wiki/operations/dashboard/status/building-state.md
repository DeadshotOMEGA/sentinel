# Status: Building State

![Building Status block](/uploads/wiki-dashboard/operations/dashboard-stat-building.png)

Building State is Sentinel's record of whether the building is open, secured, or in transition.

## What This Is

Building State is Sentinel's record of whether the building is open, secured, or in transition.

## When To Use It

Use it before Open Building, Execute Lockup, or any building-state explanation.

## What To Check

- Sentinel says Open, Secured, or transitional.
- The real building matches that state.
- The next available action makes sense.
- Lockup holder state supports the action.

## Step-by-Step Admin Procedure

1. Read Building Status.
2. Compare it to the real building.
3. Check available actions.
4. Stop if state and reality disagree.

## Good / Caution / Stop Conditions

Good: Sentinel and the building agree.

Caution: The next action is unclear but state is not unsafe.

Stop: State and reality disagree.

## What To Confirm After Action

After action, confirm Building Status updates.

## When To Escalate

Escalate any mismatch before further actions.

## Related Dashboard Help Pages

- [Overview](/operations/dashboard/overview)
- [Status Panel](/operations/dashboard/status-panel)
- [DDS](/operations/dashboard/status/dds)
- [Duty Watch](/operations/dashboard/status/duty-watch)
- [Building State](/operations/dashboard/status/building-state)
- [Lockup Holder](/operations/dashboard/status/lockup-holder)
- [Quick Action State](/operations/dashboard/status/quick-action-state)
