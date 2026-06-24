# DDS: Login And First Checks

> Audience: DDS, incoming DDS, duty supervisors

![Sentinel badge or service number login screen](/uploads/wiki-dashboard/operations/sentinel-login-badge-entry.png)

Use this page when you first sit down at Sentinel for a DDS shift.

## What This Is

Logging in is not just access control. It is the first operational check. Before you act as DDS, confirm Sentinel accepts your own badge or service number, shows the correct managed workstation, and lands you on the correct Dashboard.

## When To Use It

- At the start of your DDS shift.
- After another user has used the same workstation.
- After Sentinel signs you out or asks you to reauthenticate.
- Before you transfer DDS, transfer lockup, execute lockup, or make manual attendance corrections.

## Step-By-Step DDS Procedure

1. Open Sentinel at `http://sentinel.local`.
2. On the login screen, scan your badge or type your badge/service number.
3. Press Enter to continue.

![Sentinel remote system login screen](/uploads/wiki-dashboard/operations/sentinel-login-workstation-entry.png)

4. Confirm the Remote system field matches the workstation or managed station you are using.
5. Select Sign In.
6. Confirm the Dashboard opens before taking any operational action.

![Sentinel Dashboard after successful login](/uploads/wiki-dashboard/operations/sentinel-login-dashboard-confirmation.png)

## What To Check

- Correct account: your rank/name should be shown in the user menu.
- Correct system: the navbar should match the Sentinel system you are operating.
- Correct remote system: the selected remote system should match the workstation you are using.
- System Status: Healthy is the normal starting condition.
- Help access: Wiki and page Help should be reachable before you rely on them during a problem.

## Good / Caution / Stop

Good: You are signed in under your own account, the system is correct, and System Status is Healthy.

Caution: You are on a shared workstation or remote system. Confirm the account, remote system, and Dashboard identity before changing DDS, lockup, or attendance state.

Stop: You are signed in as someone else, the wrong remote system is selected, System Status is unhealthy and data looks stale, or the Wiki link opens the wrong host. Sign out or escalate before continuing.

## Confirm After Login

After login, the Dashboard should load and show:

- The Sentinel unit and environment badge in the navbar.
- Your account in the user menu.
- The System Status pill.
- The status blocks, quick actions, and Presence grid.

If the Dashboard does not load, capture the screen and escalate.

## When To Escalate

- Your badge or service number is not accepted.
- You cannot select the correct remote system.
- Sentinel signs in but does not reach Dashboard.
- Sentinel says one account/system, but the real workstation or person using it is different.

## Related Pages

- [DDS Start Here](/operations/day-duty/dds-start-here)
- [Daily Start](/operations/day-duty/daily-start)
- [System Status](/operations/dashboard/system-status)
- [Navbar Navigation](/operations/dashboard/navbar-navigation)
