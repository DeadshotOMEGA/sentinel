# Sentinel Solo-Dev GitHub Workflow

A lightweight workflow designed to keep bugs from disappearing while you continue shipping features.

## Core operating rules

1. **Every bug becomes an issue** (even tiny bugs).
2. **Everything starts in 🧪 Inbox** (new issues always get `status:triage`).
3. **Only one issue in ⚙️ Working at a time**.
4. If you task-switch: move current work back to 📌 Planned, pull the next item into ⚙️ Working.
5. Use `needs-investigation` when root cause is unclear, flaky, or hardware behavior is intermittent.

---

## Label system (minimal + consistent)

- **Type**: `bug`, `feature`, `task`, `refactor`
- **Area**: `backend`, `frontend`, `hardware`, `infra`, `database`, `auth`, `logging`
- **Priority**: `P0`, `P1`, `P2`
- **Status**: `status:triage`, `status:planned`, `status:working`, `status:blocked`
- **Special**: `needs-investigation`

Source-of-truth file: `.github/labels.solo-workflow.json`

---

## Milestone versioning strategy (v0.6 / v0.7 / v1.0)

Use milestones as release containers:

- **v0.6**: next release target (active planning)
- **v0.7**: near-future release bucket
- **v1.0**: stabilization + launch-level completion

Rules:

- Every planned issue should have one milestone (or explicit reason it does not).
- P0 bugs always get assigned to the nearest viable release milestone.
- During release planning, triage Inbox first, then set milestone as item moves to Planned.
- At release cut: close milestone when all critical items are done or intentionally deferred.

---

## Setup options

### Option A: one-command setup (recommended)

#### Bash

```bash
scripts/github/setup-solo-workflow.sh DeadshotOMEGA/sentinel
```

#### PowerShell

```powershell
pwsh ./scripts/github/setup-solo-workflow.ps1 -Repo DeadshotOMEGA/sentinel
```

What scripts do:

- Upsert canonical labels from `.github/labels.solo-workflow.json`
- Create milestones `v0.6`, `v0.7`, `v1.0` (idempotent)
- Create/link project `Sentinel Development` (idempotent)

### Option B: manual GitHub UI checklist

Use this for project board details that are easier in UI.

1. Open **Projects** → create project **Sentinel Development**.
2. Set board columns/status options to:
   - `🧪 Inbox`
   - `📌 Planned`
   - `⚙️ Working`
   - `🚧 Blocked`
   - `✅ Done`
3. Add custom fields:
   - `Priority` (single-select: P0, P1, P2)
   - `Area` (single-select: backend, frontend, hardware, infra, database, auth, logging, unknown)
   - `Release` (single-select: v0.6, v0.7, v1.0)
4. Enable **Auto-add** workflow: auto-add issues from `DeadshotOMEGA/sentinel`.
5. Create saved views:
   - **Bug Hotlist**: `label:bug is:open`, sort by Priority, show Area + Release
   - **Release View (v0.6)**: `is:open milestone:v0.6 -status:Done`
   - **Weird stuff**: `label:needs-investigation is:open`
   - **Inbox**: `label:status:triage is:open`

---

## Suggested daily flow (5 minutes)

1. Check **Inbox** view.
2. Triage each item:
   - Add `Type`, `Area`, `Priority`
   - If ready, move to **Planned** and set milestone/release.
3. Keep only one **Working** item.
4. When blocked, move to **Blocked** and note blocker in issue.
5. Close completed work and move to **Done**.

---

## GitHub CLI/API quick commands

### Labels import (direct)

```bash
jq -c '.[]' .github/labels.solo-workflow.json | while read -r l; do
  n=$(jq -r '.name' <<<"$l")
  c=$(jq -r '.color' <<<"$l")
  d=$(jq -r '.description' <<<"$l")
  gh label create "$n" --color "$c" --description "$d" --repo DeadshotOMEGA/sentinel 2>/dev/null || \
  gh label edit "$n" --color "$c" --description "$d" --repo DeadshotOMEGA/sentinel
 done
```

### Milestones (idempotent)

```bash
for m in v0.6 v0.7 v1.0; do
  gh api repos/DeadshotOMEGA/sentinel/milestones?state=all --jq '.[].title' | grep -Fxq "$m" || \
  gh api --method POST repos/DeadshotOMEGA/sentinel/milestones -f title="$m"
done
```

### Create project if missing

```bash
OWNER=DeadshotOMEGA
TITLE='Sentinel Development'
NUM=$(gh project list --owner "$OWNER" --format json --jq ".projects[] | select(.title == \"$TITLE\") | .number" | head -n1)
if [ -z "$NUM" ]; then
  gh project create --owner "$OWNER" --title "$TITLE"
fi
```

---

## Verification checklist

1. Open a test bug via **Bug report** template.
2. Confirm issue starts with labels: `bug` + `status:triage`.
3. Reopen the issue; confirm triage workflow re-applies `status:triage` if removed.
4. Confirm issue is auto-added to **Sentinel Development** project.
5. Set Priority/Area/Release; confirm item appears in:
   - Bug Hotlist (for bug label)
   - Release View (v0.6) when milestone/release matches
   - Weird stuff when `needs-investigation` is applied
6. Move item through Inbox → Planned → Working → Done to confirm board behavior.
