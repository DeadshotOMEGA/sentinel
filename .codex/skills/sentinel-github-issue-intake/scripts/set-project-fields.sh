#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<USAGE
Usage: set-project-fields.sh --repo <owner/repo> --issue-number <n> [options]

Options:
  --project-owner <owner>           Defaults to repo owner
  --project-number <number>         Defaults to 3
  --project-title <title>           Defaults to "Sentinel Development"
  --status <status-option-name>
  --priority <P0|P1|P2>
  --area <backend|frontend|hardware|infra|database|auth|logging|unknown>
  --release <vX.Y.Z>
  --dry-run                         Print planned actions only
  --confirm                         Execute mutations
USAGE
}

REPO=""
ISSUE_NUMBER=""
PROJECT_OWNER=""
PROJECT_NUMBER="3"
PROJECT_TITLE="Sentinel Development"
STATUS_VALUE=""
PRIORITY_VALUE=""
AREA_VALUE=""
RELEASE_VALUE=""
DRY_RUN="false"
CONFIRM="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      REPO="${2:-}"
      shift 2
      ;;
    --issue-number)
      ISSUE_NUMBER="${2:-}"
      shift 2
      ;;
    --project-owner)
      PROJECT_OWNER="${2:-}"
      shift 2
      ;;
    --project-number)
      PROJECT_NUMBER="${2:-}"
      shift 2
      ;;
    --project-title)
      PROJECT_TITLE="${2:-}"
      shift 2
      ;;
    --status)
      STATUS_VALUE="${2:-}"
      shift 2
      ;;
    --priority)
      PRIORITY_VALUE="${2:-}"
      shift 2
      ;;
    --area)
      AREA_VALUE="${2:-}"
      shift 2
      ;;
    --release)
      RELEASE_VALUE="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    --confirm)
      CONFIRM="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

command -v gh >/dev/null 2>&1 || { echo "Missing dependency: gh" >&2; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "Missing dependency: jq" >&2; exit 1; }

[[ -n "${REPO}" ]] || { echo "--repo is required" >&2; exit 1; }
[[ -n "${ISSUE_NUMBER}" ]] || { echo "--issue-number is required" >&2; exit 1; }

if [[ -z "${PROJECT_OWNER}" ]]; then
  PROJECT_OWNER="${REPO%%/*}"
fi

if [[ "${DRY_RUN}" == "true" ]]; then
  CONFIRM="false"
fi

PROJECT_VIEW_JSON="$(gh project view "${PROJECT_NUMBER}" --owner "${PROJECT_OWNER}" --format json)"
PROJECT_ID="$(jq -r '.id' <<<"${PROJECT_VIEW_JSON}")"
[[ -n "${PROJECT_ID}" && "${PROJECT_ID}" != "null" ]] || {
  echo "Unable to resolve project id for owner=${PROJECT_OWNER} number=${PROJECT_NUMBER}" >&2
  exit 1
}

PROJECT_FIELDS_JSON="$(gh project field-list "${PROJECT_NUMBER}" --owner "${PROJECT_OWNER}" --format json)"

# shellcheck disable=SC2016
ISSUE_ITEM_QUERY='query($owner:String!, $repo:String!, $issue:Int!){repository(owner:$owner,name:$repo){issue(number:$issue){projectItems(first:50){nodes{id project{__typename ... on ProjectV2{id number owner{__typename ... on User{login} ... on Organization{login}}}}}}}}}'

fetch_issue_item_id() {
  gh api graphql -f query="${ISSUE_ITEM_QUERY}" -F owner="${REPO%%/*}" -F repo="${REPO##*/}" -F issue="${ISSUE_NUMBER}" \
    | jq -r --arg owner "${PROJECT_OWNER}" --argjson number "${PROJECT_NUMBER}" '
      .data.repository.issue.projectItems.nodes[]?
      | select(.project.__typename == "ProjectV2")
      | select(.project.number == $number)
      | select(.project.owner.login == $owner)
      | .id
    ' \
    | head -n1
}

ISSUE_ITEM_ID="$(fetch_issue_item_id || true)"

if [[ -z "${ISSUE_ITEM_ID}" ]]; then
  if [[ "${CONFIRM}" == "true" ]]; then
    gh issue edit "${ISSUE_NUMBER}" --repo "${REPO}" --add-project "${PROJECT_TITLE}" >/dev/null
    ISSUE_ITEM_ID="$(fetch_issue_item_id || true)"
  fi
fi

if [[ -z "${ISSUE_ITEM_ID}" ]]; then
  jq -n \
    --arg repo "${REPO}" \
    --arg issueNumber "${ISSUE_NUMBER}" \
    --arg projectTitle "${PROJECT_TITLE}" \
    --arg dryRun "${DRY_RUN}" \
    --arg confirm "${CONFIRM}" \
    '{
      repo: $repo,
      issueNumber: ($issueNumber | tonumber),
      projectTitle: $projectTitle,
      dryRun: ($dryRun == "true"),
      confirm: ($confirm == "true"),
      changed: false,
      warning: "Issue is not in project; project-link required before field updates"
    }'
  exit 0
fi

get_field_id() {
  local field_name="${1}"
  jq -r --arg fieldName "${field_name}" '.fields[] | select(.name == $fieldName) | .id' <<<"${PROJECT_FIELDS_JSON}" | head -n1
}

get_option_id() {
  local field_name="${1}"
  local option_name="${2}"
  jq -r --arg fieldName "${field_name}" --arg optionName "${option_name}" '.fields[] | select(.name == $fieldName) | .options[]? | select(.name == $optionName) | .id' <<<"${PROJECT_FIELDS_JSON}" | head -n1
}

apply_single_select() {
  local field_name="${1}"
  local field_value="${2}"

  [[ -n "${field_value}" ]] || return 0

  local field_id option_id
  field_id="$(get_field_id "${field_name}")"
  if [[ -z "${field_id}" ]]; then
    echo "Field '${field_name}' not found in project ${PROJECT_NUMBER}" >&2
    return 1
  fi

  option_id="$(get_option_id "${field_name}" "${field_value}")"
  if [[ -z "${option_id}" ]]; then
    echo "Option '${field_value}' not found for field '${field_name}'" >&2
    return 1
  fi

  if [[ "${CONFIRM}" == "true" ]]; then
    gh project item-edit \
      --id "${ISSUE_ITEM_ID}" \
      --project-id "${PROJECT_ID}" \
      --field-id "${field_id}" \
      --single-select-option-id "${option_id}" >/dev/null
  fi

  echo "${field_name}=${field_value}"
}

APPLIED=()
WARNINGS=()

if output="$(apply_single_select "Status" "${STATUS_VALUE}" 2>&1)"; then
  [[ -n "${output}" ]] && APPLIED+=("${output}")
elif [[ -n "${STATUS_VALUE}" ]]; then
  WARNINGS+=("${output}")
fi
if output="$(apply_single_select "Priority" "${PRIORITY_VALUE}" 2>&1)"; then
  [[ -n "${output}" ]] && APPLIED+=("${output}")
elif [[ -n "${PRIORITY_VALUE}" ]]; then
  WARNINGS+=("${output}")
fi
if output="$(apply_single_select "Area" "${AREA_VALUE}" 2>&1)"; then
  [[ -n "${output}" ]] && APPLIED+=("${output}")
elif [[ -n "${AREA_VALUE}" ]]; then
  WARNINGS+=("${output}")
fi
if output="$(apply_single_select "Release" "${RELEASE_VALUE}" 2>&1)"; then
  [[ -n "${output}" ]] && APPLIED+=("${output}")
elif [[ -n "${RELEASE_VALUE}" ]]; then
  WARNINGS+=("${output}")
fi

jq -n \
  --arg repo "${REPO}" \
  --arg issueNumber "${ISSUE_NUMBER}" \
  --arg projectOwner "${PROJECT_OWNER}" \
  --arg projectNumber "${PROJECT_NUMBER}" \
  --arg dryRun "${DRY_RUN}" \
  --arg confirm "${CONFIRM}" \
  --argjson applied "$(printf '%s\n' "${APPLIED[@]:-}" | sed '/^$/d' | jq -R . | jq -s .)" \
  --argjson warnings "$(printf '%s\n' "${WARNINGS[@]:-}" | sed '/^$/d' | jq -R . | jq -s .)" \
  '{
    repo: $repo,
    issueNumber: ($issueNumber | tonumber),
    projectOwner: $projectOwner,
    projectNumber: ($projectNumber | tonumber),
    dryRun: ($dryRun == "true"),
    confirm: ($confirm == "true"),
    changed: (($confirm == "true") and ($applied | length > 0)),
    plannedUpdates: $applied,
    warnings: $warnings
  }'
