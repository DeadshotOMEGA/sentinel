#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<USAGE
Usage: align-milestone-release.sh --repo <owner/repo> --issue-number <n> [options]

Options:
  --project-owner <owner>      Defaults to repo owner
  --project-number <number>    Defaults to 3
  --project-title <title>      Defaults to Sentinel Development
  --prefer-source <milestone|release>  Defaults to milestone
  --dry-run
  --confirm
USAGE
}

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SET_FIELDS_SCRIPT="${SCRIPT_DIR}/../../sentinel-github-issue-intake/scripts/set-project-fields.sh"

REPO=""
ISSUE_NUMBER=""
PROJECT_OWNER=""
PROJECT_NUMBER="3"
PROJECT_TITLE="Sentinel Development"
PREFER_SOURCE="milestone"
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
    --prefer-source)
      PREFER_SOURCE="${2:-}"
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
[[ -x "${SET_FIELDS_SCRIPT}" ]] || { echo "Missing helper script: ${SET_FIELDS_SCRIPT}" >&2; exit 1; }

[[ -n "${REPO}" ]] || { echo "--repo is required" >&2; exit 1; }
[[ -n "${ISSUE_NUMBER}" ]] || { echo "--issue-number is required" >&2; exit 1; }

if [[ -z "${PROJECT_OWNER}" ]]; then
  PROJECT_OWNER="${REPO%%/*}"
fi

if [[ "${DRY_RUN}" == "true" ]]; then
  CONFIRM="false"
fi

case "${PREFER_SOURCE}" in
  milestone|release)
    ;;
  *)
    echo "--prefer-source must be milestone or release" >&2
    exit 1
    ;;
esac

ISSUE_JSON="$(gh issue view "${ISSUE_NUMBER}" --repo "${REPO}" --json number,title,url,milestone)"
MILESTONE_VALUE="$(jq -r '.milestone.title // empty' <<<"${ISSUE_JSON}")"

# shellcheck disable=SC2016
ALIGN_QUERY='query($owner:String!, $repo:String!, $issue:Int!){repository(owner:$owner,name:$repo){issue(number:$issue){projectItems(first:50){nodes{id project{__typename ... on ProjectV2{id number owner{__typename ... on User{login} ... on Organization{login}}}} fieldValues(first:50){nodes{... on ProjectV2ItemFieldSingleSelectValue{name field{... on ProjectV2SingleSelectField{name}}}}}}}}}}'

ALIGN_DATA="$(gh api graphql -f query="${ALIGN_QUERY}" -F owner="${REPO%%/*}" -F repo="${REPO##*/}" -F issue="${ISSUE_NUMBER}")"

RELEASE_VALUE="$(jq -r --arg owner "${PROJECT_OWNER}" --argjson number "${PROJECT_NUMBER}" '
  .data.repository.issue.projectItems.nodes[]?
  | select(.project.__typename == "ProjectV2")
  | select(.project.number == $number)
  | select(.project.owner.login == $owner)
  | .fieldValues.nodes[]?
  | select(.field.name == "Release")
  | .name
' <<<"${ALIGN_DATA}" | head -n1)"

TARGET_MILESTONE=""
TARGET_RELEASE=""
ACTION="none"

if [[ -n "${MILESTONE_VALUE}" && -z "${RELEASE_VALUE}" ]]; then
  TARGET_RELEASE="${MILESTONE_VALUE}"
  ACTION="set_release_from_milestone"
elif [[ -z "${MILESTONE_VALUE}" && -n "${RELEASE_VALUE}" ]]; then
  TARGET_MILESTONE="${RELEASE_VALUE}"
  ACTION="set_milestone_from_release"
elif [[ -n "${MILESTONE_VALUE}" && -n "${RELEASE_VALUE}" && "${MILESTONE_VALUE}" != "${RELEASE_VALUE}" ]]; then
  ACTION="repair_mismatch"
  if [[ "${PREFER_SOURCE}" == "milestone" ]]; then
    TARGET_RELEASE="${MILESTONE_VALUE}"
  else
    TARGET_MILESTONE="${RELEASE_VALUE}"
  fi
fi

PLAN_JSON="$(jq -n \
  --arg repo "${REPO}" \
  --arg issueNumber "${ISSUE_NUMBER}" \
  --arg currentMilestone "${MILESTONE_VALUE}" \
  --arg currentRelease "${RELEASE_VALUE}" \
  --arg targetMilestone "${TARGET_MILESTONE}" \
  --arg targetRelease "${TARGET_RELEASE}" \
  --arg action "${ACTION}" \
  --arg dryRun "${DRY_RUN}" \
  --arg confirm "${CONFIRM}" \
  '{
    repo: $repo,
    issueNumber: ($issueNumber | tonumber),
    action: $action,
    current: {
      milestone: (if ($currentMilestone|length)>0 then $currentMilestone else null end),
      release: (if ($currentRelease|length)>0 then $currentRelease else null end)
    },
    target: {
      milestone: (if ($targetMilestone|length)>0 then $targetMilestone else null end),
      release: (if ($targetRelease|length)>0 then $targetRelease else null end)
    },
    dryRun: ($dryRun == "true"),
    confirm: ($confirm == "true")
  }')"

if [[ "${ACTION}" == "none" || "${CONFIRM}" != "true" ]]; then
  jq '. + {mutated:false}' <<<"${PLAN_JSON}"
  exit 0
fi

if [[ -n "${TARGET_MILESTONE}" ]]; then
  gh issue edit "${ISSUE_NUMBER}" --repo "${REPO}" --milestone "${TARGET_MILESTONE}" >/dev/null
fi

if [[ -n "${TARGET_RELEASE}" ]]; then
  "${SET_FIELDS_SCRIPT}" \
    --repo "${REPO}" \
    --issue-number "${ISSUE_NUMBER}" \
    --project-owner "${PROJECT_OWNER}" \
    --project-number "${PROJECT_NUMBER}" \
    --project-title "${PROJECT_TITLE}" \
    --release "${TARGET_RELEASE}" \
    --confirm >/dev/null
fi

jq '. + {mutated:true}' <<<"${PLAN_JSON}"
