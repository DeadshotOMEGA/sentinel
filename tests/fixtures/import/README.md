# Import CSV Fixtures

These files are derived from `nominal-roll.csv` and are intended for import preview/execute testing.

- `nominal-roll.valid.csv`
  - Baseline valid fixture.
- `nominal-roll.valid-small.csv`
  - Header + first 5 rows from baseline; intended for fast E2E execute-path tests.
- `nominal-roll.valid-lowercase-headers.csv`
  - Same data with lowercase headers; used to verify header normalization.
- `nominal-roll.invalid-missing-sn.csv`
  - One row has an empty `SN` (service number).
- `nominal-roll.invalid-email.csv`
  - One row has an invalid `EMAIL ADDRESS`.
- `nominal-roll.invalid-duplicate-sn.csv`
  - Two rows intentionally share the same `SN`.
- `nominal-roll.invalid-unknown-division.csv`
  - One row uses unknown `DEPT` code `ZZZ`.
- `nominal-roll.invalid-headers.csv`
  - Key headers were renamed (`SN`, `DEPT`, `EMAIL ADDRESS`) to simulate incompatible format.
