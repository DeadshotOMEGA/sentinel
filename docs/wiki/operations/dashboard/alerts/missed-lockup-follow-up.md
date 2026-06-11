# Missed Lockup Follow-up

Missed lockup alerts mean Sentinel expected the building to be secured, but the overnight record still shows unresolved lockup, duty/watch, or checkout state.

Treat the alert as a follow-up checklist, not as a message to clear.

## What Was Wrong

One or more of these conditions was still unresolved after the lockup window:

- Execute Lockup was not recorded.
- Building Status did not reach Secured.
- Lockup responsibility was not transferred to SWK or DSWK when required.
- Duty Watch coverage was missing or not checked in.
- Members were still checked in and had to be cleaned up by the daily reset.

These alerts are grouped together on the Dashboard because they usually describe the same missed end-of-day process.

## What Should Have Happened

Before leaving end-of-day operations, the DDS or lockup holder should have:

1. Reviewed Security Alerts.
2. Resolved visitors and unexpected people still checked in.
3. Confirmed who held lockup responsibility.
4. Transferred duty/watch or lockup responsibility if the handoff was required.
5. Confirmed the real building was ready to secure.
6. Used Execute Lockup once.
7. Rechecked that Building Status changed to Secured.

## What To Do Now

1. Confirm the real building state before changing Sentinel records.
2. Review History for the previous operational night.
3. Check whether any people were incorrectly left checked in.
4. Correct attendance only when the real-world status is known.
5. Confirm duty/watch coverage and whether SWK or DSWK should have held lockup.
6. Record a clear acknowledgement note explaining what was checked or escalated.

If the real building state is uncertain, do not acknowledge the alert as resolved. Escalate to duty leadership.

## Acknowledgement Note Examples

Good: "Confirmed with SWK: building secured at 2235, Execute Lockup was missed in Sentinel. Corrected attendance cleanup and notified DDS."

Caution: "Alert seen" is not enough context.

Stop: Do not write that lockup was completed unless the real building state or duty leadership confirms it.

## Related Pages

- [Security Alerts](/operations/dashboard/security-alerts)
- [Daily End: Security Alerts](/operations/dashboard/daily-end/security-alerts)
- [Daily End: Execute Lockup](/operations/dashboard/daily-end/execute-lockup)
- [DDS: Execute Lockup](/operations/day-duty/execute-lockup)
- [End Of Day Handoff](/operations/day-duty/end-of-day-handoff)
- [History Overview](/operations/history/overview)
