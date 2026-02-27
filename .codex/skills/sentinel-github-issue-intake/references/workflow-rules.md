# Sentinel Workflow Rules (Issue Intake)

Derived from `docs/WORKFLOW.md`.

## Core Rules

1. Every bug becomes an issue.
2. New issues start in triage (`status:triage` / project `🧪 Inbox`).
3. Type labels are mandatory: `type:bug|type:feature|type:task|type:refactor`.
4. Area labels should match domain: `area:backend|area:frontend|area:hardware|area:infra|area:database|area:auth|area:logging`.
5. Priority labels use `priority:p0|priority:p1|priority:p2`.
6. Use `needs-investigation` for unclear/flaky/intermittent cases.

## Release Alignment

- Milestone and project `Release` should match version semantics.
- If only one is provided at intake, align the other to the same value.
- If both are provided and mismatched, stop and require correction.

## Mutation Safety

- Preview-first is the default.
- Never mutate GitHub state without explicit confirmation.
