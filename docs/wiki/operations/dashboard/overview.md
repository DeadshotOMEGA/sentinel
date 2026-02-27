# Dashboard Overview

> Audience: Day Duty staff, duty supervisors, operations admins

[Open Dashboard](http://sentinel.local/dashboard)

## Purpose

The Dashboard is Sentinel’s operational control surface for real-time attendance, security alerts, and lockup readiness.

## Preconditions

- You are signed in with an operational account.
- You are on the appliance network and can reach `sentinel.local`.
- If taking lockup-related actions, you have verified role authority before proceeding.

## At-a-Glance Layout

![Dashboard Overview](dashboard-full-default.png)

Use this page to orient yourself, then continue to section pages for detailed procedures.

- Security alerts: `operations/dashboard/security-alerts`
- Quick actions: `operations/dashboard/quick-actions`
- Status panel: `operations/dashboard/status-panel`
- Presence grid: `operations/dashboard/presence-grid`

## Operating Sequence (Recommended)

1. Check **Security Alerts** first and acknowledge/triage critical items.
2. Verify **Status Panel** blocks (DDS, Duty Watch, Building, Lockup Holder).
3. Execute only the **Quick Actions** that are valid for the current building/role state.
4. Confirm effect in the **Presence Grid** and operational status blocks.

## Security Alerts (Summary)

![Security Alerts](dashboard-security-alerts-focus.png)

- Treat critical alerts as priority work.
- Acknowledge alerts with a clear operational note.
- If alert context is incomplete, escalate before taking lockup state changes.

See full detail: `operations/dashboard/security-alerts`

## Quick Actions (Summary)

![Quick Actions](dashboard-quick-actions-focus.png)

- Kiosk check-in and visitor sign-in are high-frequency operations.
- Lockup/open-building controls must be aligned with current holder/state.
- Transfer lockup only after explicit handoff verification.

See full detail: `operations/dashboard/quick-actions`

## Status Panel (Summary)

![Status Panel](dashboard-status-panel-focus.png)

Validate these before any control action:

- DDS status
- Duty Watch readiness
- Building state
- Lockup holder identity/time-held

See full detail: `operations/dashboard/status-panel`

## Presence Grid (Summary)

![Presence Grid](dashboard-presence-grid-focus.png)

- Confirm who is on site (members and visitors).
- Use filters/search to quickly validate the expected person.
- Recheck after high-impact actions (check-in/out, visitor sign-in, lockup transfer).

See full detail: `operations/dashboard/presence-grid`

## State Variants (Reference Visuals)

![Alerts Active Variant](dashboard-state-alerts-active.png)

![Duty Watch Gap Variant](dashboard-state-duty-watch-gap.png)

![Lockup Holder Variant](dashboard-state-lockup-held.png)

Use these images to recognize degraded/critical conditions quickly during operations.

## Validation Checks

- Dashboard loads and shows all four major sections.
- Current operational state is reflected in status blocks.
- Presence changes appear after relevant actions.
- Help route slug resolves to `operations/dashboard/overview`.

## Failure / Escalation

- If dashboard data appears stale, refresh once and re-check status blocks.
- If lockup/building controls do not match expected state, stop and escalate to watch leadership.
- If alerts cannot be acknowledged or API behavior is degraded, capture screenshot + timestamp and escalate.

## Related Pages

- `operations/dashboard/security-alerts`
- `operations/dashboard/quick-actions`
- `operations/dashboard/status-panel`
- `operations/dashboard/presence-grid`
- `operations/dashboard/status/dds`
- `operations/dashboard/status/duty-watch`
- `operations/dashboard/status/building-state`
- `operations/dashboard/status/lockup-holder`
- `operations/day-duty/kiosk-check-in`
- `operations/day-duty/visitor-sign-in`
- `operations/lockup/building-lockup-control`
- `operations/lockup/transfer-lockup`
