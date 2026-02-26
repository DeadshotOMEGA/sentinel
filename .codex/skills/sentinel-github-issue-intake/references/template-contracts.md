# Template Contracts (Authoritative)

Source templates:

- `.github/ISSUE_TEMPLATE/bug.yml`
- `.github/ISSUE_TEMPLATE/feature.yml`
- `.github/ISSUE_TEMPLATE/task.yml`
- `.github/ISSUE_TEMPLATE/refactor.yml`

The parser script `scripts/extract-template-requirements.sh` is authoritative for required field enforcement.

## Bug

- Default labels: `type:bug`, `status:triage`
- Required fields: `area`, `priority`, `happened`, `expected`, `repro`

## Feature

- Default labels: `type:feature`, `status:triage`
- Required fields: `area`, `problem`, `proposal`

## Task

- Default labels: `type:task`, `status:triage`
- Required fields: `area`, `goal`, `work`

## Refactor

- Default labels: `type:refactor`, `status:triage`
- Required fields: `area`, `pain`, `scope`, `safety`

## No-Drift Rule

- Skills must not hardcode required fields.
- Always resolve required fields from template YAML at runtime.
