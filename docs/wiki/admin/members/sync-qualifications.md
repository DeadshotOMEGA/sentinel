# Sync Qualifications

> Audience: Admins

![Sync qualifications action button](/uploads/wiki-dashboard/operations/members-sync-qualifications.png)

## What This Is

Sync Qualifications recalculates automatic qualifications after member data changes.

## When To Use It

- After CSV import.
- After many member edits.
- When schedules or Duty Watch eligibility appears stale.

## What To Check

- Recent member data changes are complete.
- No one else is mid-editing the same records.
- You can review the success or error output.

## Step-By-Step Procedure

1. Finish member edits first.
2. Click Sync Qualifications.
3. Wait for the result message.
4. Review grants, removals, or errors.
5. Check Schedules if eligibility was the reason for syncing.

## Good / Caution / Stop Conditions

Good: Sync completes and qualification-dependent pages show the expected members.

Caution: Sync can change who appears eligible for duty assignments.

Stop: Do not sync while an import or bulk edit is still in progress.

## Confirm After Action

- The result message shows success.
- Expected members appear in member picker filters.

## When To Escalate

Escalate if sync fails or removes an expected qualification.

## Related Pages

- [Member Records](/admin/members/member-records)
- [Filters And Search](/admin/members/filters-and-search)
- [Create Member](/admin/members/create-member)
- [Import CSV](/admin/members/import-csv)
- [Bulk Actions](/admin/members/bulk-actions)
- [Schedules](/operations/schedules/dds-duty-watch-scheduling)
