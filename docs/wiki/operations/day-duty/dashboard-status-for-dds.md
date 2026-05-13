# DDS: Dashboard Status For DDS

> Audience: DDS, duty supervisors

![Dashboard status blocks](/uploads/wiki-dashboard/operations/dashboard-status-panel-focus.png)

Use this when you need to understand what the Dashboard is telling you before taking action.

## Status Blocks In DDS Language

| Dashboard block | DDS question                                         | What to do                                                    |
| --------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| DDS             | Who currently owns DDS responsibility?               | Confirm live DDS matches the person responsible in real life. |
| Duty Watch      | Is tonight or today's coverage complete?             | Identify uncovered positions and escalate if required.        |
| Building Status | Does Sentinel think the building is Open or Secured? | Compare to the real building before opening or locking up.    |
| Lockup Holder   | Who owns lockup responsibility right now?            | Confirm identity before transfer, checkout, or lockup.        |
| Actions         | What can safely change right now?                    | Use only after the status blocks and real-world state agree.  |

## How To Read Mismatches

Use this wording when troubleshooting:

- Sentinel says the building is Open, but the real building is secured.
- Sentinel says MS Voth holds lockup, but MS Voth has left.
- Sentinel says DDS is pending, but DDS handover already happened.
- Sentinel says a visitor is on site, but the visitor has departed.

The mismatch is the problem to solve. Do not press actions just to make the screen look right unless you have verified the real event and are authorized to correct it.

## Common DDS Decisions

If DDS is wrong: use [Transfer DDS](/operations/day-duty/transfer-dds) or escalate to an Admin.

If lockup holder is wrong: use [Transfer Lockup](/operations/day-duty/transfer-lockup) only after confirming the receiving member is qualified and checked in.

If Building Status is wrong: confirm the real building state, then use Open Building or Execute Lockup only if that action reflects reality.

If Presence is wrong: search, filter, and use manual correction only when the missed event is verified.

## Related Pages

- [Status Panel](/operations/dashboard/status-panel)
- [Status: DDS](/operations/dashboard/status/dds)
- [Status: Duty Watch](/operations/dashboard/status/duty-watch)
- [Status: Building State](/operations/dashboard/status/building-state)
- [Status: Lockup Holder](/operations/dashboard/status/lockup-holder)
- [Status: Quick Action State](/operations/dashboard/status/quick-action-state)
