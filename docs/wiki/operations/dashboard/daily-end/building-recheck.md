# Daily End: Building Recheck

![Building Status after lockup](/uploads/wiki-dashboard/operations/dashboard-stat-building.png)

Building recheck confirms Sentinel recorded the secured state after lockup.

## What This Is

Building recheck confirms Sentinel recorded the secured state after lockup.

## When To Use It

Use it immediately after Execute Lockup or after any lockup-related correction.

## What To Check

- Building Status changed as expected.
- Lockup Holder state makes sense.
- Presence no longer shows unresolved people.
- No new alerts appeared.

## Step-by-Step Admin Procedure

1. Read Building Status.
2. Read Lockup Holder.
3. Review Presence counts.
4. Check Security Alerts again.
5. Do not retry blindly if the state did not change.

## Good / Caution / Stop Conditions

Good: Sentinel says Secured and the real building is secured.

Caution: The state changed slowly but now matches reality.

Stop: The state did not change or changed to something unexpected.

## What To Confirm After Action

Confirm the dashboard remains consistent after refresh.

## When To Escalate

Escalate failed or mismatched lockup state with screenshot and timestamp.

## Related Dashboard Help Pages

- [Overview](/operations/dashboard/overview)
- [Security Alerts](/operations/dashboard/daily-end/security-alerts)
- [Presence Review](/operations/dashboard/daily-end/presence-review)
- [Duty Handoff](/operations/dashboard/daily-end/duty-handoff)
- [Lockup Holder](/operations/dashboard/daily-end/lockup-holder)
- [Execute Lockup](/operations/dashboard/daily-end/execute-lockup)
- [Building Recheck](/operations/dashboard/daily-end/building-recheck)
- [Escalation Notes](/operations/dashboard/daily-end/escalation-notes)
