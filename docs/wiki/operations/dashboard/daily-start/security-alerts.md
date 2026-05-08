# Daily Start: Security Alerts

![Security alerts reviewed before daily operations](/uploads/wiki-dashboard/operations/dashboard-security-alerts-active.png)

This check prevents Admins from starting routine operations while an unresolved security issue is active.

## What This Is

This check prevents Admins from starting routine operations while an unresolved security issue is active.

## When To Use It

Use it after System Status and before building, DDS, lockup, or attendance actions.

## What To Check

- Every active alert has been read.
- The real-world situation has been checked.
- Simple authorized corrections are complete.
- Unclear or unsafe alerts are escalated.

## Step-by-Step Admin Procedure

1. Read each active alert from top to bottom.
2. Identify the person, badge, system, or responsibility affected.
3. Check whether the alert is still true.
4. Correct the issue only if you are authorized.
5. Acknowledge only after action or escalation is complete.

## Good / Caution / Stop Conditions

Good: No active alerts remain, or each alert has a clear action trail.

Caution: An alert looks old, but nobody has confirmed whether it still matters.

Stop: An alert suggests unsafe access, missing coverage, or lockup/building mismatch.

## What To Confirm After Action

Confirm the alert area updates and the related status/person no longer shows the issue.

## When To Escalate

Escalate any alert you cannot explain or safely resolve before operations begin.

## Related Dashboard Help Pages

- [Overview](/operations/dashboard/overview)
- [Security Alerts](/operations/dashboard/security-alerts)
- [System Status](/operations/dashboard/daily-start/system-status)
- [Security Alerts](/operations/dashboard/daily-start/security-alerts)
- [DDS](/operations/dashboard/daily-start/dds)
- [Duty Watch](/operations/dashboard/daily-start/duty-watch)
- [Building State](/operations/dashboard/daily-start/building-state)
- [Presence Review](/operations/dashboard/daily-start/presence-review)
- [Escalation](/operations/dashboard/daily-start/escalation)
