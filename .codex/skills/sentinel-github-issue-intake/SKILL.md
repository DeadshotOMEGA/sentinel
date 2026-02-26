---
name: sentinel-github-issue-intake
description: Create Sentinel issues using strict GitHub templates (bug/feature/task/refactor), with preview-first planning and explicit confirm-before-mutate execution.
---

# Sentinel GitHub Issue Intake

## Use This Skill When

- A user asks to create/file/open a GitHub issue.
- The issue type is `bug`, `feature`, `task`, or `refactor`.
- The user wants milestone/release/project metadata set at creation time.

## Required Behavior

1. Resolve issue type first.
2. Load authoritative template requirements from `.github/ISSUE_TEMPLATE/<type>.yml` using:
   - `scripts/extract-template-requirements.sh`
3. Ask only for missing required fields.
4. Produce a normalized preview plan before mutation:
   - title
   - body
   - labels
   - milestone
   - release
   - project target and fields
5. Mutate only on explicit confirmation (`confirm=true` or `--confirm`).
6. Return issue URL + applied metadata summary.

## Script Workflow

```bash
# Ensure local temp payload directory exists
mkdir -p .codex/tmp

# 1) Read template contract (source of truth)
.codex/skills/sentinel-github-issue-intake/scripts/extract-template-requirements.sh \
  --type task

# 2) Preview issue creation plan (no mutation)
.codex/skills/sentinel-github-issue-intake/scripts/create-issue.sh \
  --payload-file .codex/tmp/intake.json

# 3) Execute creation only after explicit confirmation
.codex/skills/sentinel-github-issue-intake/scripts/create-issue.sh \
  --payload-file .codex/tmp/intake.json \
  --confirm
```

## Payload Contract

`create-issue.sh` accepts:

```json
{
  "repo": "DeadshotOMEGA/sentinel",
  "type": "bug|feature|task|refactor",
  "title": "string",
  "fields": {
    "area": "area:backend|area:frontend|area:hardware|area:infra|area:database|area:auth|area:logging",
    "priority": "priority:p0|priority:p1|priority:p2"
  },
  "projectTitle": "Sentinel Development",
  "milestone": "vX.Y.Z|null",
  "release": "vX.Y.Z|null",
  "additionalLabels": [],
  "needsInvestigation": false,
  "confirm": false
}
```

## References

- `references/workflow-rules.md`
- `references/template-contracts.md`
