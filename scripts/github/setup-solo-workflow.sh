#!/usr/bin/env bash
set -euo pipefail

# Idempotent GitHub setup for Sentinel's solo-dev workflow.
# Requires: gh auth login, jq
# Usage:
#   scripts/github/setup-solo-workflow.sh [owner/repo]
#   scripts/github/setup-solo-workflow.sh DeadshotOMEGA/sentinel

REPO="${1:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"
OWNER="${REPO%%/*}"
PROJECT_TITLE="Sentinel Development"
LABELS_FILE=".github/labels.solo-workflow.json"
PRUNE_UNUSED="${PRUNE_UNUSED:-false}"

require() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing dependency: $1" >&2; exit 1; }
}

require gh
require jq

if [[ ! -f "$LABELS_FILE" ]]; then
  echo "Labels file not found: $LABELS_FILE" >&2
  exit 1
fi

echo "Configuring repo: $REPO"

# Optional conservative remaps from common old labels.
declare -A REMAP=(
  [enhancement]=feature
  [chore]=task
  [tech-debt]=refactor
  [investigate]=needs-investigation
)

for old in "${!REMAP[@]}"; do
  new="${REMAP[$old]}"
  if gh label list --repo "$REPO" --limit 200 --json name --jq '.[].name' | grep -Fxq "$old"; then
    if ! gh label list --repo "$REPO" --limit 200 --json name --jq '.[].name' | grep -Fxq "$new"; then
      echo "Renaming label: $old -> $new"
      gh label edit "$old" --repo "$REPO" --name "$new" >/dev/null
    else
      echo "Keeping both labels for safety (old exists): $old"
    fi
  fi
done

# Upsert canonical labels.
while IFS= read -r label; do
  name="$(jq -r '.name' <<<"$label")"
  color="$(jq -r '.color' <<<"$label")"
  description="$(jq -r '.description' <<<"$label")"

  if gh label list --repo "$REPO" --limit 300 --json name --jq '.[].name' | grep -Fxq "$name"; then
    gh label edit "$name" --repo "$REPO" --color "$color" --description "$description" >/dev/null
    echo "Updated label: $name"
  else
    gh label create "$name" --repo "$REPO" --color "$color" --description "$description" >/dev/null
    echo "Created label: $name"
  fi
done < <(jq -c '.[]' "$LABELS_FILE")

if [[ "$PRUNE_UNUSED" == "true" ]]; then
  echo "PRUNE_UNUSED=true: deleting labels not in canonical pack (except default GitHub labels)"
  canonical="$(jq -r '.[].name' "$LABELS_FILE" | sort)"
  gh label list --repo "$REPO" --limit 500 --json name --jq '.[].name' | while IFS= read -r existing; do
    if grep -Fxq "$existing" <(printf '%s\n' "$canonical"); then
      continue
    fi
    case "$existing" in
      "good first issue"|"help wanted") continue ;;
    esac
    gh label delete "$existing" --repo "$REPO" --yes >/dev/null || true
    echo "Deleted label: $existing"
  done
fi

# Milestones (idempotent)
for ms in v0.6 v0.7 v1.0; do
  if gh api "repos/$REPO/milestones?state=all&per_page=100" --jq '.[].title' | grep -Fxq "$ms"; then
    echo "Milestone exists: $ms"
  else
    gh api --method POST "repos/$REPO/milestones" -f title="$ms" >/dev/null
    echo "Created milestone: $ms"
  fi
done

# Project (idempotent)
project_number="$(gh project list --owner "$OWNER" --limit 100 --format json --jq ".projects[] | select(.title == \"$PROJECT_TITLE\") | .number" | head -n1 || true)"
if [[ -z "${project_number:-}" ]]; then
  gh project create --owner "$OWNER" --title "$PROJECT_TITLE" >/dev/null
  project_number="$(gh project list --owner "$OWNER" --limit 100 --format json --jq ".projects[] | select(.title == \"$PROJECT_TITLE\") | .number" | head -n1)"
  echo "Created project: $PROJECT_TITLE (#$project_number)"
else
  echo "Project exists: $PROJECT_TITLE (#$project_number)"
fi

gh project link "$project_number" --owner "$OWNER" --repo "$REPO" >/dev/null || true

# Best-effort field creation (safe if command unavailable on older gh versions)
if gh project field-list "$project_number" --owner "$OWNER" >/dev/null 2>&1; then
  if ! gh project field-list "$project_number" --owner "$OWNER" --format json --jq '.fields[]?.name' | grep -Fxq "Priority"; then
    gh project field-create "$project_number" --owner "$OWNER" --name "Priority" --data-type "SINGLE_SELECT" --single-select-options "P0,P1,P2" >/dev/null || true
  fi
  if ! gh project field-list "$project_number" --owner "$OWNER" --format json --jq '.fields[]?.name' | grep -Fxq "Area"; then
    gh project field-create "$project_number" --owner "$OWNER" --name "Area" --data-type "SINGLE_SELECT" --single-select-options "backend,frontend,hardware,infra,database,auth,logging,unknown" >/dev/null || true
  fi
  if ! gh project field-list "$project_number" --owner "$OWNER" --format json --jq '.fields[]?.name' | grep -Fxq "Release"; then
    gh project field-create "$project_number" --owner "$OWNER" --name "Release" --data-type "SINGLE_SELECT" --single-select-options "v0.6,v0.7,v1.0" >/dev/null || true
  fi
fi

echo "Done."
echo "Next: apply manual UI checklist in docs/WORKFLOW.md for board columns, saved views, and auto-add workflow."
