# Import CSV

> Audience: Admins

![Members CSV import dialog](/uploads/wiki-dashboard/operations/members-import-csv.png)

## What This Is

Import CSV is for controlled roster updates from a nominal roll file. It previews additions, updates, errors, and possible review items before applying changes.

## When To Use It

- A roster update file is ready.
- Many member records need to be added or updated.
- You need to reconcile Sentinel with a trusted personnel source.

## What To Check

- The file came from the approved source.
- Preview results are reviewed before execution.
- Blocking errors are fixed or excluded according to procedure.

## Step-By-Step Procedure

1. Open Import CSV.
2. Paste or upload the CSV data.
3. Run preview.
4. Review additions, updates, review rows, errors, and new divisions.
5. Fix blocking issues before execute.
6. Run the import and review the result summary.
7. Run qualification sync if the update affects eligibility.

## Good / Caution / Stop Conditions

Good: Preview and final results are understood before changes are committed.

Caution: Imports can update many records at once.

Stop: Do not execute an import with unexplained blocking errors or an unexpected number of updates.

## Confirm After Action

- The result summary matches expectations.
- Important records can be found by search afterward.
- Any errors are resolved or escalated.

## When To Escalate

Escalate if import results are larger, smaller, or different than expected.

## Related Pages

- [Member Records](/admin/members/member-records)
- [Filters And Search](/admin/members/filters-and-search)
- [Create Member](/admin/members/create-member)
- [Import CSV](/admin/members/import-csv)
- [Bulk Actions](/admin/members/bulk-actions)
- [Schedules](/operations/schedules/dds-duty-watch-scheduling)
