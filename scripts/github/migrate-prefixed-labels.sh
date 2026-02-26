#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<USAGE
Usage: migrate-prefixed-labels.sh [owner/repo] [--confirm] [--keep-old-labels]

Options:
  --confirm          Execute mutations (default is preview only)
  --keep-old-labels  Do not delete deprecated unprefixed labels after migration
USAGE
}

require() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing dependency: $1" >&2; exit 1; }
}

warn() {
  echo "Warning: $*" >&2
}

info() {
  echo "$*"
}

CONFIRM="false"
PRUNE_OLD_LABELS="true"
REPO=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --confirm)
      CONFIRM="true"
      shift
      ;;
    --keep-old-labels)
      PRUNE_OLD_LABELS="false"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      if [[ -z "${REPO}" ]]; then
        REPO="$1"
        shift
      else
        echo "Unknown argument: $1" >&2
        usage
        exit 1
      fi
      ;;
  esac
done

require gh
require jq

if [[ -z "${REPO}" ]]; then
  REPO="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI is not authenticated. Run: gh auth login" >&2
  exit 1
fi

declare -A REMAP=(
  [bug]='type:bug'
  [feature]='type:feature'
  [task]='type:task'
  [refactor]='type:refactor'
  [backend]='area:backend'
  [frontend]='area:frontend'
  [hardware]='area:hardware'
  [infra]='area:infra'
  [database]='area:database'
  [auth]='area:auth'
  [logging]='area:logging'
  [P0]='priority:p0'
  [P1]='priority:p1'
  [P2]='priority:p2'
)

DEPRECATED_LABELS=(
  bug feature task refactor
  backend frontend hardware infra database auth logging
  P0 P1 P2
)

starts_with() {
  local value="$1"
  local prefix="$2"
  [[ "${value}" == "${prefix}"* ]]
}

join_csv() {
  local IFS=,
  echo "$*"
}

migrate_item() {
  local kind="$1"
  local number="$2"

  local view_cmd
  local edit_cmd
  if [[ "${kind}" == "issue" ]]; then
    view_cmd=(gh issue view "${number}" --repo "${REPO}" --json number,labels,state)
    edit_cmd=(gh issue edit "${number}" --repo "${REPO}")
  else
    view_cmd=(gh pr view "${number}" --repo "${REPO}" --json number,labels,state)
    edit_cmd=(gh pr edit "${number}" --repo "${REPO}")
  fi

  local item_json
  item_json="$("${view_cmd[@]}")"

  mapfile -t current_labels < <(jq -r '.labels[].name' <<<"${item_json}")

  declare -A add_labels=()
  declare -A remove_labels=()
  declare -A projected=()

  for label in "${current_labels[@]:-}"; do
    [[ -n "${label}" ]] || continue
    projected["${label}"]=1
    if [[ -n "${REMAP[${label}]+x}" ]]; then
      add_labels["${REMAP[${label}]}"]=1
      remove_labels["${label}"]=1
    fi
  done

  for label in "${!remove_labels[@]}"; do
    unset "projected[${label}]"
  done
  for label in "${!add_labels[@]}"; do
    projected["${label}"]=1
  done

  local type_count=0
  local area_count=0
  local blocked_count=0
  local has_status_blocked="false"

  for label in "${!projected[@]}"; do
    starts_with "${label}" "type:" && type_count=$((type_count + 1))
    starts_with "${label}" "area:" && area_count=$((area_count + 1))
    starts_with "${label}" "blocked:" && blocked_count=$((blocked_count + 1))
    [[ "${label}" == "status:blocked" ]] && has_status_blocked="true"
  done

  if [[ "${kind}" == "issue" ]]; then
    if [[ "${type_count}" -eq 0 ]]; then
      warn "Issue #${number}: no type:* label after remap"
    fi
    if [[ "${area_count}" -eq 0 ]]; then
      warn "Issue #${number}: no area:* label after remap"
    fi
  fi

  if [[ "${has_status_blocked}" == "true" && "${blocked_count}" -eq 0 ]]; then
    add_labels['blocked:decision']=1
    projected['blocked:decision']=1
    info "${kind^} #${number}: adding blocked:decision because status:blocked is present"
  fi

  local add_list=()
  local remove_list=()
  for label in "${!add_labels[@]}"; do
    add_list+=("${label}")
  done
  for label in "${!remove_labels[@]}"; do
    remove_list+=("${label}")
  done

  if [[ "${#add_list[@]}" -eq 0 && "${#remove_list[@]}" -eq 0 ]]; then
    info "${kind^} #${number}: no label changes"
    return 0
  fi

  info "${kind^} #${number}: +[$(join_csv "${add_list[@]}")] -[$(join_csv "${remove_list[@]}")]"

  if [[ "${CONFIRM}" != "true" ]]; then
    return 0
  fi

  local cmd=("${edit_cmd[@]}")
  for label in "${add_list[@]}"; do
    cmd+=(--add-label "${label}")
  done
  for label in "${remove_list[@]}"; do
    cmd+=(--remove-label "${label}")
  done
  "${cmd[@]}" >/dev/null
}

info "Repo: ${REPO}"
if [[ "${CONFIRM}" == "true" ]]; then
  info "Mode: EXECUTE"
else
  info "Mode: PREVIEW (pass --confirm to execute)"
fi

mapfile -t issue_numbers < <(gh issue list --repo "${REPO}" --state open --limit 500 --json number --jq '.[].number')
mapfile -t pr_numbers < <(gh api --paginate "repos/${REPO}/pulls?state=open&per_page=100" --jq '.[].number')

for number in "${issue_numbers[@]}"; do
  [[ -n "${number}" ]] || continue
  migrate_item "issue" "${number}"
done
for number in "${pr_numbers[@]}"; do
  [[ -n "${number}" ]] || continue
  migrate_item "pr" "${number}"
done

if [[ "${CONFIRM}" == "true" && "${PRUNE_OLD_LABELS}" == "true" ]]; then
  info "Deleting deprecated unprefixed labels"
  for label in "${DEPRECATED_LABELS[@]}"; do
    gh label delete "${label}" --repo "${REPO}" --yes >/dev/null 2>&1 || true
  done
fi

info "Done."
