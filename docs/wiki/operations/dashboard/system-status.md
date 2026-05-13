# System Status

![System Status dropdown with service health details](/uploads/wiki-dashboard/operations/dashboard-system-status-dropdown.png)

Open System Status when the Dashboard looks stale, actions fail, or Wiki does not load.

## What This Is

System Status tells you whether Sentinel itself is healthy enough to trust. Healthy means the main service checks are passing. Warning or error means you should inspect the details before retrying failed actions.

## When To Use It

Use this at the start of day, any time data looks stale, when a control action fails, when Wiki does not open, or when connected systems are missing.

## What To Check

- Database and backend API health.
- Frontend status and current app version.
- Wiki reachability.
- Network and appliance connection state.
- Connected systems such as kiosk or server workstations.
- Updates, uptime, and last check time.

## Admin Procedure

1. Confirm the pill reads Healthy before routine work.
2. If it does not, open the dropdown.
3. Read each service row and identify what is degraded.
4. Refresh the Dashboard once if the issue looks stale.
5. If the problem remains, record the visible status and escalate.

## Good / Caution / Stop

Good: System Status is Healthy and the last check is recent.

Caution: One non-critical service is warning, but Dashboard data still updates.

Stop: Database, backend, network, or Wiki status is failing while you need live operational data.

## DDS Decision Table

| Status result             | Can DDS continue?                                               |
| ------------------------- | --------------------------------------------------------------- |
| Healthy                   | Yes. Continue normal checks and actions.                        |
| Wiki down only            | Continue urgent operations, but use local SOPs and report it.   |
| Backend or database down  | Stop control actions and escalate. Dashboard data may be stale. |
| Network or kiosk degraded | Continue only after confirming the real person/building state.  |

## What To Confirm After Action

After a failed action or stale display, confirm System Status returns to Healthy before relying on the Dashboard again.

## When To Escalate

Escalate with the service name, status text, last check time, and any action that failed.

## Related Dashboard Help Pages

- [Overview](/operations/dashboard/overview)
- [System Status](/operations/dashboard/daily-start/system-status)
- [Help Button](/operations/dashboard/help-button)
