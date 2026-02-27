# Project Field Mapping

## Sentinel Development project fields

- `Status` (single-select): Inbox/Planned/Working/Blocked/Done
- `Priority` (single-select): `P0`, `P1`, `P2`
- `Area` (single-select): backend/frontend/hardware/infra/database/auth/logging/unknown
- `Release` (single-select): milestone-aligned release versions

## Label to field mapping

- `priority:p0/p1/p2` -> `Priority` `P0/P1/P2`
- `area:*` -> `Area` value without prefix
- `status:*` -> `Status` board state

## Source-of-truth guidance

- Labels drive triage/query workflows.
- Project fields drive board UX and release views.
