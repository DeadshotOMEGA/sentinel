# Automation Rules

## Issue open/reopen

- Ensure `status:triage` is applied.
- Remove conflicting `status:*` labels on reopen.

## Label policy validation

- Validate issue cardinality rules for `type:*`, `area:*`, `priority:*`, `status:*`.
- Validate blocked reason policy (`status:blocked` requires one `blocked:*`).
- Validate PR has at least one `area:*` label.
- Default mode is warn-only; hard-fail can be enabled with repo variable `LABEL_POLICY_ENFORCE=true`.

## PR autolabel

- Apply `area:*` labels from changed paths.
- Apply/remove `bot:conflict` based on merge conflict state.

## Stale policy

- Add `bot:stale` after 30 days of issue inactivity.
- Do not auto-close.
- Exempt labels: `status:working`, `status:testing`, `priority:p0`.
