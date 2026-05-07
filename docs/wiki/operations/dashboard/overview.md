# Dashboard Overview

> Audience: Duty Day Staff (DDS), duty supervisors, operations admins

[Open Dashboard](http://sentinel.local/dashboard)

## Purpose

The Dashboard is Sentinel’s operational control surface for real-time attendance, security alerts, and lockup readiness.

## Preconditions

- You are signed in with an operational account.
- You are on the appliance network and can reach `sentinel.local`.
- If taking lockup-related actions, you have verified role authority before proceeding.

## At-a-Glance Layout

![TODO: Dashboard Overview Main](https://placehold.co/1600x900?text=TODO+dashboard-overview-main)

**Capture note**

- Screen/state: Full dashboard with Security Alerts, Quick Actions, Status Panel, and Presence Grid.
- Preconditions: Operational account logged in; system in normal active state.
- Suggested filename: `dashboard-overview-main.png`
- Target Wiki.js asset path: `wiki-dashboard/operations/dashboard-overview-main.png`
- Replacement: Replace this placeholder with uploaded Wiki.js asset URL after capture.

Use this page to orient yourself, then continue to section pages for detailed procedures. The
in-app Help button starts grouped guided procedures for orientation, daily start, daily end, status
interpretation, Presence review, and control actions.

- Navbar brand: `operations/dashboard/navbar-brand`
- Navbar navigation: `operations/dashboard/navbar-navigation`
- Help button: `operations/dashboard/help-button`
- System status: `operations/dashboard/system-status`
- User menu: `operations/dashboard/user-menu`
- Security alerts: `operations/dashboard/security-alerts`
- Quick actions: `operations/dashboard/quick-actions`
- Status panel: `operations/dashboard/status-panel`
- Presence grid: `operations/dashboard/presence-grid`

## Daily Start Routine

1. Confirm **System Status** is healthy.
2. Review **Security Alerts** before any building or lockup changes.
3. Confirm **DDS** is assigned and on site.
4. Confirm **Duty Watch** coverage and uncovered positions.
5. Confirm **Building Status** and **Lockup Holder** match the real building.
6. Review **Presence** for unexpected people or missing duty staff.
7. Escalate unresolved gaps before operations begin.

Detailed daily-start pages:

- `operations/dashboard/daily-start/system-status`
- `operations/dashboard/daily-start/security-alerts`
- `operations/dashboard/daily-start/dds`
- `operations/dashboard/daily-start/duty-watch`
- `operations/dashboard/daily-start/building-state`
- `operations/dashboard/daily-start/presence-review`
- `operations/dashboard/daily-start/escalation`

## End-of-Day Routine

1. Review active alerts and acknowledge only after action is taken.
2. Search Presence for remaining visitors and unexpected checked-in members.
3. Confirm DDS and Duty Watch handoff expectations.
4. Confirm lockup holder identity before transfer or lockup.
5. Execute lockup only when building state, holder, and real conditions agree.
6. Recheck Building Status after lockup.
7. Leave notes or escalate if anything does not match reality.

Detailed end-of-day pages:

- `operations/dashboard/daily-end/security-alerts`
- `operations/dashboard/daily-end/presence-review`
- `operations/dashboard/daily-end/duty-handoff`
- `operations/dashboard/daily-end/lockup-holder`
- `operations/dashboard/daily-end/execute-lockup`
- `operations/dashboard/daily-end/building-recheck`
- `operations/dashboard/daily-end/escalation-notes`

## Operating Sequence (Recommended)

1. Check **Security Alerts** first and acknowledge/triage critical items.
2. Verify **Status Panel** blocks (DDS, Duty Watch, Building, Lockup Holder).
3. Execute only the **Quick Actions** that are valid for the current building/role state.
4. Confirm effect in the **Presence Grid** and operational status blocks.

## Security Alerts (Summary)

![TODO: Security Alerts Focus](https://placehold.co/1600x900?text=TODO+dashboard-security-alerts-focus)

- Treat critical alerts as priority work.
- Acknowledge alerts with a clear operational note.
- If alert context is incomplete, escalate before taking lockup state changes.

See full detail: `operations/dashboard/security-alerts`

## Quick Actions (Summary)

![TODO: Quick Actions Focus](https://placehold.co/1600x900?text=TODO+dashboard-quick-actions-focus)

- Kiosk check-in and visitor sign-in are high-frequency operations.
- Lockup/open-building controls must be aligned with current holder/state.
- Transfer lockup only after explicit handoff verification.

See full detail: `operations/dashboard/quick-actions`

## Status Panel (Summary)

![TODO: Status Panel Focus](https://placehold.co/1600x900?text=TODO+dashboard-status-panel-focus)

Validate these before any control action:

- DDS status
- Duty Watch readiness
- Building state
- Lockup holder identity/time-held

See full detail: `operations/dashboard/status-panel`

Detailed status pages:

- `operations/dashboard/status/dds`
- `operations/dashboard/status/duty-watch`
- `operations/dashboard/status/building-state`
- `operations/dashboard/status/lockup-holder`
- `operations/dashboard/status/quick-action-state`

## Presence Grid (Summary)

![TODO: Presence Grid Focus](https://placehold.co/1600x900?text=TODO+dashboard-presence-grid-focus)

- Confirm who is on site (members and visitors).
- Use filters/search to quickly validate the expected person.
- Recheck after high-impact actions (check-in/out, visitor sign-in, lockup transfer).

See full detail: `operations/dashboard/presence-grid`

Detailed Presence pages:

- `operations/dashboard/presence/filters`
- `operations/dashboard/presence/search`
- `operations/dashboard/presence/manual-in-out`
- `operations/dashboard/presence/person-cards`
- `operations/dashboard/presence/member-actions`
- `operations/dashboard/presence/visitor-checkout`
- `operations/dashboard/presence/empty-states`

## State Variants (Reference Visuals)

![TODO: Alerts Active Variant](https://placehold.co/1600x900?text=TODO+dashboard-state-alerts-active)

![TODO: Duty Watch Gap Variant](https://placehold.co/1600x900?text=TODO+dashboard-state-duty-watch-gap)

![TODO: Lockup Holder Variant](https://placehold.co/1600x900?text=TODO+dashboard-state-lockup-held)

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
- `operations/dashboard/status/quick-action-state`
- `operations/dashboard/daily-start/system-status`
- `operations/dashboard/daily-end/execute-lockup`
- `operations/dashboard/presence/person-cards`
- `operations/dashboard/actions/open-or-lockup`
- `operations/day-duty/kiosk-check-in`
- `operations/day-duty/visitor-sign-in`
- `operations/lockup/building-lockup-control`
- `operations/lockup/transfer-lockup`
