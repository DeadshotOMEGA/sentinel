# Sentinel Workflow Rules (Issue Flow)

Derived from `docs/WORKFLOW.md`.

## Status Semantics

- `status:triage` -> issue is in Inbox.
- `status:planned` -> issue is scoped and queued with release target.
- `status:working` -> active implementation.
- `status:blocked` -> blocked by external dependency/decision.
- `✅ Done` -> completion state in project field (issue may then be closed).

## Working-Limit Policy

- Target policy: one active Working issue at a time.
- Enforcement mode for Codex skills: warn-only.
- Moving to Working requires explicit confirmation if warning is raised.

## Alignment Rules

1. Milestone set and Release empty -> set Release = milestone.
2. Release set and Milestone empty -> set Milestone = release.
3. Mismatch -> propose repair and require confirmation.
