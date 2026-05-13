# Kiosk Check-In

> Audience: Duty Day Staff (DDS), kiosk operators

![Kiosk check-in success state](/uploads/wiki-dashboard/operations/kiosk-check-in.png)

## What This Is

Kiosk Check-In is the normal member attendance flow. Members scan their badge at the external reader. Sentinel records the check-in or check-out and then updates Dashboard Presence.

The staff fallback field is only for DDS or authorized staff when the reader fails.

## When To Use It

- A member arrives or leaves and uses the external badge reader.
- DDS is monitoring arrivals at the front entrance.
- The scanner fails and staff must type the badge number as a fallback.
- DDS needs to confirm that a scan changed Presence.

## What To Check

- Sentinel says the kiosk is connected.
- The scanner state says ready or shows a clear success/error result.
- The person standing at the kiosk is the person whose badge is scanned.
- Dashboard Presence changes after the scan.
- Any manual fallback use is explainable and auditable.

## Step-By-Step DDS Procedure

1. Confirm the kiosk header shows Connected.
2. Ask the member to hold the badge steady at the external reader.
3. Watch for the scan result on the Member Scan panel.
4. If the result is accepted, confirm whether Sentinel recorded IN or OUT.
5. Check Dashboard Presence if the result affects duty coverage, lockup, or visitor supervision.
6. If the reader fails, use the staff fallback field only after confirming the badge number.
7. Record or escalate repeated scanner failures.

## Good / Caution / Stop

Good: The kiosk shows scan accepted and Dashboard Presence matches the member's real location.

Caution: The kiosk accepts the scan but Presence does not update quickly. Refresh Dashboard and check System Status before scanning repeatedly.

Stop: Do not use staff fallback for convenience, for an unknown badge, or when Sentinel services are unavailable. Escalate instead.

## Confirm After Action

- The member appears checked in or checked out as expected.
- Duty Watch and DDS coverage still match reality.
- Any failed scan is either resolved or reported.
- No duplicate-looking entries were created by repeated scans.

## When To Escalate

Escalate if the scanner repeatedly fails, the kiosk is disconnected, Sentinel says the wrong person scanned, or the check-in direction does not match the member's actual arrival/departure.

## Related Pages

- [Kiosk Operations](/operations/kiosk/kiosk-operations)
- [Check-ins History and Corrections](/operations/day-duty/checkins-history-and-corrections)
- [DDS: Presence, Visitors, And Corrections](/operations/day-duty/presence-visitors-and-corrections)
- [Dashboard Presence Grid](/operations/dashboard/presence-grid)
