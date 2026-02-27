# Label Taxonomy

## Core labels

- `type:*`: `type:bug`, `type:feature`, `type:task`, `type:refactor`
- `area:*`: `area:backend`, `area:frontend`, `area:database`, `area:infra`, `area:auth`, `area:logging`, `area:hardware`
- `status:*`: `status:triage`, `status:planned`, `status:working`, `status:testing`, `status:blocked`, `status:done`
- `priority:*`: `priority:p0`, `priority:p1`, `priority:p2`

## Special labels

- Investigation: `needs-investigation`
- Blocked reason: `blocked:external`, `blocked:dependency`, `blocked:decision`
- Bot-managed: `bot:stale`, `bot:conflict`

## Validation policy

- Issues: exactly 1 `type:*`, at least 1 `area:*`, max 1 `priority:*`, exactly 1 `status:*` while open
- If `status:blocked` is present, exactly 1 `blocked:*` must be present
- PRs: at least 1 `area:*` (autolabel)
