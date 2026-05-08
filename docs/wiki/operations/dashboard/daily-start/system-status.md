# Daily Start: System Status

![System Status details used at the start of day](/uploads/wiki-dashboard/operations/dashboard-system-status-dropdown.png)

This check confirms Sentinel is healthy before the Admin relies on Dashboard information.

## What This Is

This check confirms Sentinel is healthy before the Admin relies on Dashboard information.

## When To Use It

Use it at the beginning of the day, after a workstation restart, or any time the Dashboard looks stale.

## What To Check

- The System Status pill reads Healthy.
- Database, backend, frontend, Wiki, and network checks are passing.
- Connected systems expected for the day are visible.
- The last check time is recent.

## Step-by-Step Admin Procedure

1. Open the Dashboard.
2. Read the System Status pill before reviewing people or actions.
3. If the pill is not Healthy, open the dropdown.
4. Identify which service is warning or failing.
5. Refresh once if the issue may be stale.
6. Escalate if the issue remains.

## Good / Caution / Stop Conditions

Good: Sentinel is Healthy and service details are current.

Caution: A non-critical warning is present, but live data still updates.

Stop: Database, backend, network, or Wiki is failing while you need live operations.

## What To Confirm After Action

Confirm System Status is Healthy before proceeding to alerts and duty checks.

## When To Escalate

Report the failing service, visible status text, last check time, and any action that failed.

## Related Dashboard Help Pages

- [Overview](/operations/dashboard/overview)
- [System Status](/operations/dashboard/system-status)
- [System Status](/operations/dashboard/daily-start/system-status)
- [Security Alerts](/operations/dashboard/daily-start/security-alerts)
- [DDS](/operations/dashboard/daily-start/dds)
- [Duty Watch](/operations/dashboard/daily-start/duty-watch)
- [Building State](/operations/dashboard/daily-start/building-state)
- [Presence Review](/operations/dashboard/daily-start/presence-review)
- [Escalation](/operations/dashboard/daily-start/escalation)
