---
name: sentinel-github-issue-flow
description: Manage Sentinel issue lifecycle transitions (triage/planned/working/blocked/done) with release-milestone alignment and warn-only working-limit policy.
---

# Sentinel GitHub Issue Flow

## Use This Skill When

- A user asks to triage/reprioritize/release-align/update issue status.
- A user asks to move an issue to planned, working, blocked, or done.
- A user asks to repair milestone/release mismatch.

## Required Behavior

1. Read current issue + project state.
2. Compute transition plan and output preview first.
3. Apply status label hygiene (remove conflicting `status:*` labels).
4. Keep milestone and Release aligned.
5. For `working`:
   - check open `status:working` load
   - warn when one already exists (warn-only policy)
6. Mutate only on explicit confirmation (`confirm=true` or `--confirm`).

## Script Workflow

```bash
# 1) Preview transition
.codex/skills/sentinel-github-issue-flow/scripts/transition-issue.sh \
  --payload-file /tmp/transition.json

# 2) Execute transition on confirmation
.codex/skills/sentinel-github-issue-flow/scripts/transition-issue.sh \
  --payload-file /tmp/transition.json \
  --confirm
```

## Payload Contract

```json
{
  "repo": "DeadshotOMEGA/sentinel",
  "issueNumber": 123,
  "targetState": "triage|planned|working|blocked|done",
  "warnOnlyWorkingLimit": true,
  "blockedLabel": "blocked:external|blocked:dependency|blocked:decision|null",
  "blockerNote": "string|null",
  "milestone": "vX.Y.Z|null",
  "release": "vX.Y.Z|null",
  "confirm": false
}
```

## References

- `references/workflow-rules.md`
- `references/status-transition-matrix.md`
