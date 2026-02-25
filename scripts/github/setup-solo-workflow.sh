#!/usr/bin/env bash
set -euo pipefail

# Idempotent GitHub setup for Sentinel's solo-dev workflow.
# Requires: gh auth login, jq
# Usage:
#   scripts/github/setup-solo-workflow.sh [owner/repo]
#   scripts/github/setup-solo-workflow.sh DeadshotOMEGA/sentinel

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || true)"
PROJECT_TITLE="Sentinel Development"
PRUNE_UNUSED="${PRUNE_UNUSED:-false}"
CURRENT_RELEASE_VERSION="${CURRENT_RELEASE_VERSION:-}"
PROJECT_OWNER="${PROJECT_OWNER:-}"
RELEASE_MILESTONES=()

require() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing dependency: $1" >&2; exit 1; }
}

die() {
  echo "Error: $*" >&2
  exit 1
}

warn() {
  echo "Warning: $*" >&2
}

info() {
  echo "$*"
}

build_release_milestones() {
  local raw_version="${CURRENT_RELEASE_VERSION}"
  local major minor patch next_patch minor_release major_release

  if [[ -z "${raw_version}" ]]; then
    raw_version="$(jq -r '.version' "${REPO_ROOT}/package.json" 2>/dev/null || true)"
  fi
  raw_version="${raw_version#v}"

  if [[ ! "${raw_version}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    die "CURRENT_RELEASE_VERSION must be SemVer (X.Y.Z); got: ${raw_version:-<empty>}"
  fi

  IFS='.' read -r major minor patch <<<"${raw_version}"
  next_patch=$((patch + 1))
  minor_release=$((minor + 1))
  major_release=$((major + 1))

  RELEASE_MILESTONES=(
    "v${major}.${minor}.${patch}"
    "v${major}.${minor}.${next_patch}"
    "v${major}.${minor_release}.0"
    "v${major_release}.0.0"
  )
}

require gh
require jq

if [[ -z "${REPO_ROOT}" ]]; then
  REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
fi
cd "$REPO_ROOT"
build_release_milestones

REPO="${1:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"
OWNER="${REPO%%/*}"
if [[ -z "${PROJECT_OWNER}" ]]; then
  PROJECT_OWNER="${OWNER,,}"
fi
LABELS_FILE="${REPO_ROOT}/.github/labels.solo-workflow.json"

if [[ ! -f "$LABELS_FILE" ]]; then
  die "Labels file not found: $LABELS_FILE"
fi

if ! gh auth status >/dev/null 2>&1; then
  die "GitHub CLI is not authenticated. Run: gh auth login"
fi

if ! jq -e 'type == "array"' "$LABELS_FILE" >/dev/null 2>&1; then
  die "Invalid labels file format (expected JSON array): $LABELS_FILE"
fi

info "Configuring repo: $REPO"
info "Project owner: $PROJECT_OWNER"
info "Release set: $(IFS=', '; echo "${RELEASE_MILESTONES[*]}")"

fetch_existing_labels() {
  gh label list --repo "$REPO" --limit 500 --json name --jq '.[].name'
}

label_exists() {
  local label_name="${1}"
  grep -Fxq "$label_name" <<<"$EXISTING_LABELS"
}

# Optional conservative remaps from common old labels.
declare -A REMAP=(
  [enhancement]=feature
  [chore]=task
  [tech-debt]=refactor
  [investigate]=needs-investigation
)

EXISTING_LABELS="$(fetch_existing_labels)"

for old in "${!REMAP[@]}"; do
  new="${REMAP[$old]}"
  if label_exists "$old"; then
    if ! label_exists "$new"; then
      info "Renaming label: $old -> $new"
      gh label edit "$old" --repo "$REPO" --name "$new" >/dev/null
      EXISTING_LABELS="$(fetch_existing_labels)"
    else
      info "Keeping both labels for safety (old exists): $old"
    fi
  fi
done

# Upsert canonical labels.
while IFS= read -r label; do
  name="$(jq -r '.name' <<<"$label")"
  color="$(jq -r '.color' <<<"$label")"
  description="$(jq -r '.description' <<<"$label")"

  if label_exists "$name"; then
    gh label edit "$name" --repo "$REPO" --color "$color" --description "$description" >/dev/null
    info "Updated label: $name"
  else
    gh label create "$name" --repo "$REPO" --color "$color" --description "$description" >/dev/null
    info "Created label: $name"
    EXISTING_LABELS+=$'\n'"$name"
  fi
done < <(jq -c '.[]' "$LABELS_FILE")

if [[ "$PRUNE_UNUSED" == "true" ]]; then
  info "PRUNE_UNUSED=true: deleting labels not in canonical pack (except default GitHub labels)"
  declare -A CANONICAL_LABELS=()
  while IFS= read -r canonical_name; do
    [[ -n "${canonical_name}" ]] || continue
    CANONICAL_LABELS["$canonical_name"]=1
  done < <(jq -r '.[].name' "$LABELS_FILE")

  while IFS= read -r existing; do
    [[ -n "${existing}" ]] || continue
    if [[ -n "${CANONICAL_LABELS[$existing]+x}" ]]; then
      continue
    fi
    case "$existing" in
      "good first issue"|"help wanted") continue ;;
    esac
    gh label delete "$existing" --repo "$REPO" --yes >/dev/null || true
    info "Deleted label: $existing"
  done < <(printf '%s\n' "$EXISTING_LABELS")

  EXISTING_LABELS="$(fetch_existing_labels)"
fi

# Milestones (idempotent)
fetch_milestones() {
  gh api --paginate "repos/$REPO/milestones?state=all&per_page=100" --jq '.[].title'
}

milestone_exists() {
  local milestone_title="${1}"
  grep -Fxq "$milestone_title" <<<"$EXISTING_MILESTONES"
}

EXISTING_MILESTONES="$(fetch_milestones)"

for ms in "${RELEASE_MILESTONES[@]}"; do
  if milestone_exists "$ms"; then
    info "Milestone exists: $ms"
  else
    if gh api --method POST "repos/$REPO/milestones" -f title="$ms" >/dev/null 2>&1; then
      info "Created milestone: $ms"
      EXISTING_MILESTONES+=$'\n'"$ms"
    else
      EXISTING_MILESTONES="$(fetch_milestones)"
      if milestone_exists "$ms"; then
        warn "Milestone already exists after create attempt: $ms"
      else
        die "Failed to create milestone: $ms"
      fi
    fi
  fi
done

# Project (idempotent)
project_number="$(gh project list --owner "$PROJECT_OWNER" --limit 100 --format json --jq ".projects[] | select(.title == \"$PROJECT_TITLE\") | .number" | head -n1 || true)"
if [[ -z "${project_number:-}" ]]; then
  gh project create --owner "$PROJECT_OWNER" --title "$PROJECT_TITLE" >/dev/null
  project_number="$(gh project list --owner "$PROJECT_OWNER" --limit 100 --format json --jq ".projects[] | select(.title == \"$PROJECT_TITLE\") | .number" | head -n1)"
  info "Created project: $PROJECT_TITLE (#$project_number)"
else
  info "Project exists: $PROJECT_TITLE (#$project_number)"
fi

if gh project link "$project_number" --owner "$PROJECT_OWNER" --repo "$REPO" >/dev/null 2>&1; then
  info "Linked project #$project_number to repo: $REPO"
else
  warn "Could not link project #$project_number to $REPO (may already be linked or missing permissions)"
fi

# Best-effort field creation (safe if command unavailable on older gh versions)
fetch_project_fields() {
  gh project field-list "$project_number" --owner "$PROJECT_OWNER" --format json --jq '.fields[]?.name'
}

ensure_project_field() {
  local field_name="${1}"
  local field_options="${2}"

  if grep -Fxq "$field_name" <<<"$PROJECT_FIELDS"; then
    return 0
  fi

  if gh project field-create "$project_number" --owner "$PROJECT_OWNER" --name "$field_name" --data-type "SINGLE_SELECT" --single-select-options "$field_options" >/dev/null 2>&1; then
    info "Created project field: $field_name"
    PROJECT_FIELDS+=$'\n'"$field_name"
    return 0
  fi

  PROJECT_FIELDS="$(fetch_project_fields || true)"
  if grep -Fxq "$field_name" <<<"$PROJECT_FIELDS"; then
    warn "Project field already exists after create attempt: $field_name"
  else
    warn "Failed to create project field '$field_name'. Configure it manually."
  fi
}

sync_release_field_options() {
  local release_field_id
  local release_mutation
  local current_release next_patch next_minor next_major
  current_release="${RELEASE_MILESTONES[0]}"
  next_patch="${RELEASE_MILESTONES[1]}"
  next_minor="${RELEASE_MILESTONES[2]}"
  next_major="${RELEASE_MILESTONES[3]}"
  release_field_id="$(
    gh project field-list "$project_number" --owner "$PROJECT_OWNER" --format json --jq '.fields[] | select(.name == "Release") | .id' | head -n1
  )"

  if [[ -z "${release_field_id}" ]]; then
    warn "Release field not found; skipping Release option sync."
    return 0
  fi

  release_mutation="$(cat <<'GRAPHQL'
mutation($fieldId:ID!){
  updateProjectV2Field(input:{
    fieldId:$fieldId,
    name:"Release",
    singleSelectOptions:[
      {name:"__CURRENT__",description:"Current release",color:GRAY},
      {name:"__PATCH__",description:"Patch release",color:BLUE},
      {name:"__MINOR__",description:"Minor release",color:YELLOW},
      {name:"__MAJOR__",description:"Major release",color:RED}
    ]
  }){
    projectV2Field{
      ... on ProjectV2SingleSelectField{
        id
        name
        options{ id name }
      }
    }
  }
}
GRAPHQL
)"
  release_mutation="${release_mutation//__CURRENT__/${current_release}}"
  release_mutation="${release_mutation//__PATCH__/${next_patch}}"
  release_mutation="${release_mutation//__MINOR__/${next_minor}}"
  release_mutation="${release_mutation//__MAJOR__/${next_major}}"

  if gh api graphql -f query="$release_mutation" -f fieldId="$release_field_id" >/dev/null 2>&1; then
    info "Synced Release field options: $(IFS=', '; echo "${RELEASE_MILESTONES[*]}")"
  else
    warn "Failed to sync Release field options automatically. Update via project UI if needed."
  fi
}

if gh project field-list "$project_number" --owner "$PROJECT_OWNER" >/dev/null 2>&1; then
  PROJECT_FIELDS="$(fetch_project_fields || true)"
  ensure_project_field "Priority" "P0,P1,P2"
  ensure_project_field "Area" "backend,frontend,hardware,infra,database,auth,logging,unknown"
  ensure_project_field "Release" "$(IFS=,; echo "${RELEASE_MILESTONES[*]}")"
  sync_release_field_options
else
  warn "Skipping field creation; gh project field-list is unavailable in this environment."
fi

info "Done."
info "Next: apply manual UI checklist in docs/WORKFLOW.md for board columns, saved views, and auto-add workflow."
