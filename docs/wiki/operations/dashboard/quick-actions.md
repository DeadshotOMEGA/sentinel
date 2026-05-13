# Dashboard Quick Actions

![Dashboard quick action controls](/uploads/wiki-dashboard/operations/dashboard-quick-actions-focus.png)

Quick Actions are controls that change live responsibility, attendance, or building state. Treat them as operational decisions, not shortcuts.

## What This Is

The Dashboard groups high-impact actions near the status panel so DDS and Admin users can act only after reviewing System Status, alerts, status blocks, and Presence.

## Choose The Correct Action

| Action          | Use when                                    | Detailed page                                                  |
| --------------- | ------------------------------------------- | -------------------------------------------------------------- |
| Open Building   | The building is physically open and staffed | [Open Or Lockup](/operations/dashboard/actions/open-or-lockup) |
| Execute Lockup  | The building is ready to be secured         | [DDS: Execute Lockup](/operations/day-duty/execute-lockup)     |
| Transfer DDS    | Duty Day Staff responsibility is changing   | [DDS: Transfer DDS](/operations/day-duty/transfer-dds)         |
| Transfer Lockup | Lockup responsibility is moving to someone  | [DDS: Transfer Lockup](/operations/day-duty/transfer-lockup)   |
| Manual in/out   | A verified scan/check-in did not happen     | [Manual In Out](/operations/dashboard/actions/manual-in-out)   |

## What To Check First

- Sentinel says the system is Healthy.
- Security Alerts are handled or escalated.
- DDS, Building Status, and Lockup Holder match the real building state.
- Presence matches who is actually on site.
- The person taking responsibility is present, qualified, and accepts it.

## Good / Caution / Stop

Good: The action matches both Sentinel and the real situation.

Caution: The action is enabled, but a count, alert, or handoff detail still needs confirmation.

Stop: Do not use a Quick Action to make the Dashboard look correct when the real situation is unresolved.

## Related Pages

- [Actions: Action Block](/operations/dashboard/actions/action-block)
- [Actions: Open Or Lockup](/operations/dashboard/actions/open-or-lockup)
- [Actions: Transfer DDS](/operations/dashboard/actions/transfer-dds)
- [Actions: Transfer Lockup](/operations/dashboard/actions/transfer-lockup)
- [Actions: Manual In/Out](/operations/dashboard/actions/manual-in-out)
- [DDS Start Here](/operations/day-duty/dds-start-here)
