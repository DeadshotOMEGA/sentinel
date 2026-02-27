#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<USAGE
Usage: transition-issue.sh --payload-file <path> [--dry-run] [--confirm]
       transition-issue.sh --payload-json '<json>' [--dry-run] [--confirm]
USAGE
}

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
CHECK_WORKING_SCRIPT="${SCRIPT_DIR}/check-working-load.sh"
ALIGN_SCRIPT="${SCRIPT_DIR}/align-milestone-release.sh"
SET_FIELDS_SCRIPT="${SCRIPT_DIR}/../../sentinel-github-issue-intake/scripts/set-project-fields.sh"

PAYLOAD_FILE=""
PAYLOAD_JSON=""
DRY_RUN="false"
CONFIRM_OVERRIDE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --payload-file)
      PAYLOAD_FILE="${2:-}"
      shift 2
      ;;
    --payload-json)
      PAYLOAD_JSON="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    --confirm)
      CONFIRM_OVERRIDE="true"
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
[[ -x "${CHECK_WORKING_SCRIPT}" ]] || { echo "Missing helper script: ${CHECK_WORKING_SCRIPT}" >&2; exit 1; }
[[ -x "${ALIGN_SCRIPT}" ]] || { echo "Missing helper script: ${ALIGN_SCRIPT}" >&2; exit 1; }
[[ -x "${SET_FIELDS_SCRIPT}" ]] || { echo "Missing helper script: ${SET_FIELDS_SCRIPT}" >&2; exit 1; }

normalize_blocked_label() {
  case "$1" in
    blocked:external|external) echo "blocked:external" ;;
    blocked:dependency|dependency) echo "blocked:dependency" ;;
    blocked:decision|decision) echo "blocked:decision" ;;
    "") echo "" ;;
    *) echo "" ;;
  esac
}

if [[ -n "${PAYLOAD_FILE}" ]]; then
  [[ -f "${PAYLOAD_FILE}" ]] || { echo "Payload file not found: ${PAYLOAD_FILE}" >&2; exit 1; }
  PAYLOAD_JSON="$(cat "${PAYLOAD_FILE}")"
elif [[ -z "${PAYLOAD_JSON}" ]]; then
  if [[ ! -t 0 ]]; then
    PAYLOAD_JSON="$(cat)"
  else
    echo "Provide --payload-file or --payload-json" >&2
    exit 1
  fi
fi

jq -e . >/dev/null 2>&1 <<<"${PAYLOAD_JSON}" || {
  echo "Payload is not valid JSON" >&2
  exit 1
}

REPO="$(jq -r '.repo // "DeadshotOMEGA/sentinel"' <<<"${PAYLOAD_JSON}")"
ISSUE_NUMBER="$(jq -r '.issueNumber // empty' <<<"${PAYLOAD_JSON}")"
TARGET_STATE="$(jq -r '.targetState // empty' <<<"${PAYLOAD_JSON}")"
PROJECT_TITLE="$(jq -r '.projectTitle // "Sentinel Development"' <<<"${PAYLOAD_JSON}")"
PROJECT_NUMBER="$(jq -r '.projectNumber // 3' <<<"${PAYLOAD_JSON}")"
PROJECT_OWNER="$(jq -r '.projectOwner // empty' <<<"${PAYLOAD_JSON}")"
WARN_ONLY_WORKING_LIMIT="$(jq -r '.warnOnlyWorkingLimit // true' <<<"${PAYLOAD_JSON}")"
BLOCKER_NOTE="$(jq -r '.blockerNote // empty' <<<"${PAYLOAD_JSON}")"
BLOCKED_LABEL="$(jq -r '.blockedLabel // .blockedReason // .blocked // empty' <<<"${PAYLOAD_JSON}")"
MILESTONE_VALUE="$(jq -r '.milestone // empty' <<<"${PAYLOAD_JSON}")"
RELEASE_VALUE="$(jq -r '.release // empty' <<<"${PAYLOAD_JSON}")"
PREFER_SOURCE="$(jq -r '.preferSource // "milestone"' <<<"${PAYLOAD_JSON}")"
PAYLOAD_CONFIRM="$(jq -r '.confirm // false' <<<"${PAYLOAD_JSON}")"

if [[ -n "${CONFIRM_OVERRIDE}" ]]; then
  CONFIRM="${CONFIRM_OVERRIDE}"
else
  CONFIRM="${PAYLOAD_CONFIRM}"
fi
if [[ "${DRY_RUN}" == "true" ]]; then
  CONFIRM="false"
fi

[[ -n "${ISSUE_NUMBER}" ]] || { echo "Payload.issueNumber is required" >&2; exit 1; }
[[ -n "${TARGET_STATE}" ]] || { echo "Payload.targetState is required" >&2; exit 1; }

case "${TARGET_STATE}" in
  triage|planned|working|blocked|done)
    ;;
  *)
    echo "Unsupported targetState: ${TARGET_STATE}" >&2
    exit 1
    ;;
esac

if [[ -z "${PROJECT_OWNER}" ]]; then
  PROJECT_OWNER="${REPO%%/*}"
fi

ISSUE_JSON="$(gh issue view "${ISSUE_NUMBER}" --repo "${REPO}" --json number,title,url,labels,milestone)"

mapfile -t CURRENT_LABELS < <(jq -r '.labels[].name' <<<"${ISSUE_JSON}")
TYPE_LABELS=(type:bug type:feature type:task type:refactor bug feature task refactor)

has_label() {
  local label="${1}"
  printf '%s\n' "${CURRENT_LABELS[@]:-}" | grep -Fxq "${label}"
}

DESIRED_STATUS_LABEL=""
DESIRED_PROJECT_STATUS=""
case "${TARGET_STATE}" in
  triage)
    DESIRED_STATUS_LABEL="status:triage"
    DESIRED_PROJECT_STATUS="🧪 Inbox"
    ;;
  planned)
    DESIRED_STATUS_LABEL="status:planned"
    DESIRED_PROJECT_STATUS="📌 Planned"
    ;;
  working)
    DESIRED_STATUS_LABEL="status:working"
    DESIRED_PROJECT_STATUS="⚙️ Working"
    ;;
  blocked)
    DESIRED_STATUS_LABEL="status:blocked"
    DESIRED_PROJECT_STATUS="🚧 Blocked"
    ;;
  done)
    DESIRED_PROJECT_STATUS="✅ Done"
    ;;
esac

if [[ "${TARGET_STATE}" == "triage" ]]; then
  HAS_TYPE="false"
  for type_label in "${TYPE_LABELS[@]}"; do
    if has_label "${type_label}"; then
      HAS_TYPE="true"
      break
    fi
  done
  if [[ "${HAS_TYPE}" != "true" ]]; then
    echo "Issue lacks a type label (type:bug|type:feature|type:task|type:refactor)." >&2
    exit 1
  fi
fi

CURRENT_BLOCKED_LABELS=()
for existing in "${CURRENT_LABELS[@]:-}"; do
  case "${existing}" in
    blocked:external|blocked:dependency|blocked:decision)
      CURRENT_BLOCKED_LABELS+=("${existing}")
      ;;
  esac
done

if [[ "${TARGET_STATE}" == "blocked" ]]; then
  BLOCKED_LABEL="$(normalize_blocked_label "${BLOCKED_LABEL}")"

  if [[ -z "${BLOCKED_LABEL}" ]]; then
    if [[ "${#CURRENT_BLOCKED_LABELS[@]}" -eq 1 ]]; then
      BLOCKED_LABEL="${CURRENT_BLOCKED_LABELS[0]}"
    else
      echo "blocked transition requires blockedLabel (blocked:external|blocked:dependency|blocked:decision)." >&2
      exit 1
    fi
  fi

  if [[ -z "${BLOCKER_NOTE}" ]]; then
    echo "blocked transition requires blockerNote" >&2
    exit 1
  fi
fi

if [[ "${TARGET_STATE}" == "planned" ]]; then
  if [[ -z "${MILESTONE_VALUE}" ]]; then
    MILESTONE_VALUE="$(jq -r '.milestone.title // empty' <<<"${ISSUE_JSON}")"
  fi
  if [[ -z "${RELEASE_VALUE}" && -n "${MILESTONE_VALUE}" ]]; then
    RELEASE_VALUE="${MILESTONE_VALUE}"
  fi
  if [[ -z "${MILESTONE_VALUE}" || -z "${RELEASE_VALUE}" ]]; then
    echo "planned transition requires milestone and release (or existing milestone on issue)." >&2
    exit 1
  fi
fi

if [[ -n "${MILESTONE_VALUE}" && -z "${RELEASE_VALUE}" ]]; then
  RELEASE_VALUE="${MILESTONE_VALUE}"
fi
if [[ -z "${MILESTONE_VALUE}" && -n "${RELEASE_VALUE}" ]]; then
  MILESTONE_VALUE="${RELEASE_VALUE}"
fi

MISMATCH_REPAIR=""
if [[ -n "${MILESTONE_VALUE}" && -n "${RELEASE_VALUE}" && "${MILESTONE_VALUE}" != "${RELEASE_VALUE}" ]]; then
  if [[ "${PREFER_SOURCE}" == "release" ]]; then
    MISMATCH_REPAIR="milestone<=${RELEASE_VALUE}"
    MILESTONE_VALUE="${RELEASE_VALUE}"
  else
    MISMATCH_REPAIR="release<=${MILESTONE_VALUE}"
    RELEASE_VALUE="${MILESTONE_VALUE}"
  fi
fi

WORKING_LOAD_JSON='{"count":0,"issues":[]}'
WORKING_WARNING=""
if [[ "${TARGET_STATE}" == "working" ]]; then
  WORKING_LOAD_JSON="$(${CHECK_WORKING_SCRIPT} --repo "${REPO}" --exclude-issue "${ISSUE_NUMBER}")"
  if [[ "$(jq -r '.count' <<<"${WORKING_LOAD_JSON}")" != "0" ]]; then
    WORKING_WARNING="Another issue is already in status:working"
  fi
fi

STATUS_LABELS_TO_REMOVE=()
for existing in "${CURRENT_LABELS[@]:-}"; do
  case "${existing}" in
    status:triage|status:planned|status:working|status:blocked|status:done)
      if [[ -n "${DESIRED_STATUS_LABEL}" && "${existing}" == "${DESIRED_STATUS_LABEL}" ]]; then
        continue
      fi
      STATUS_LABELS_TO_REMOVE+=("${existing}")
      ;;
  esac
done

BLOCKED_LABELS_TO_REMOVE=()
for existing in "${CURRENT_LABELS[@]:-}"; do
  case "${existing}" in
    blocked:external|blocked:dependency|blocked:decision)
      if [[ "${TARGET_STATE}" == "blocked" && "${existing}" == "${BLOCKED_LABEL}" ]]; then
        continue
      fi
      BLOCKED_LABELS_TO_REMOVE+=("${existing}")
      ;;
  esac
done

ADD_BLOCKED_LABEL="false"
if [[ "${TARGET_STATE}" == "blocked" && -n "${BLOCKED_LABEL}" ]]; then
  if ! has_label "${BLOCKED_LABEL}"; then
    ADD_BLOCKED_LABEL="true"
  fi
fi

AREA_VALUE=""
PRIORITY_VALUE=""
for existing in "${CURRENT_LABELS[@]:-}"; do
  case "${existing}" in
    area:backend|backend)
      AREA_VALUE="backend"
      ;;
    area:frontend|frontend)
      AREA_VALUE="frontend"
      ;;
    area:hardware|hardware)
      AREA_VALUE="hardware"
      ;;
    area:infra|infra)
      AREA_VALUE="infra"
      ;;
    area:database|database)
      AREA_VALUE="database"
      ;;
    area:auth|auth)
      AREA_VALUE="auth"
      ;;
    area:logging|logging)
      AREA_VALUE="logging"
      ;;
    priority:p0|P0|p0)
      PRIORITY_VALUE="P0"
      ;;
    priority:p1|P1|p1)
      PRIORITY_VALUE="P1"
      ;;
    priority:p2|P2|p2)
      PRIORITY_VALUE="P2"
      ;;
  esac
done

PLAN_JSON="$(jq -n \
  --arg repo "${REPO}" \
  --arg issueNumber "${ISSUE_NUMBER}" \
  --arg targetState "${TARGET_STATE}" \
  --arg desiredStatusLabel "${DESIRED_STATUS_LABEL}" \
  --arg desiredProjectStatus "${DESIRED_PROJECT_STATUS}" \
  --arg milestone "${MILESTONE_VALUE}" \
  --arg release "${RELEASE_VALUE}" \
  --arg mismatchRepair "${MISMATCH_REPAIR}" \
  --arg blockedLabel "${BLOCKED_LABEL}" \
  --arg addBlocked "${ADD_BLOCKED_LABEL}" \
  --arg workingWarning "${WORKING_WARNING}" \
  --arg dryRun "${DRY_RUN}" \
  --arg confirm "${CONFIRM}" \
  --argjson removeLabels "$(printf '%s\n' "${STATUS_LABELS_TO_REMOVE[@]:-}" | sed '/^$/d' | jq -R . | jq -s .)" \
  --argjson removeBlockedLabels "$(printf '%s\n' "${BLOCKED_LABELS_TO_REMOVE[@]:-}" | sed '/^$/d' | jq -R . | jq -s .)" \
  --argjson workingLoad "${WORKING_LOAD_JSON}" \
  '{
    repo: $repo,
    issueNumber: ($issueNumber|tonumber),
    targetState: $targetState,
    statusLabel: (if ($desiredStatusLabel|length)>0 then $desiredStatusLabel else null end),
    projectStatus: (if ($desiredProjectStatus|length)>0 then $desiredProjectStatus else null end),
    milestone: (if ($milestone|length)>0 then $milestone else null end),
    release: (if ($release|length)>0 then $release else null end),
    mismatchRepair: (if ($mismatchRepair|length)>0 then $mismatchRepair else null end),
    blockedLabel: (if ($blockedLabel|length)>0 then $blockedLabel else null end),
    addBlockedLabel: ($addBlocked == "true"),
    removeLabels: $removeLabels,
    removeBlockedLabels: $removeBlockedLabels,
    workingLoad: $workingLoad,
    warnings: ( [($workingWarning|select(length>0))] ),
    dryRun: ($dryRun == "true"),
    confirm: ($confirm == "true")
  }')"

if [[ "${CONFIRM}" != "true" ]]; then
  jq '. + {mutated:false, note:"Preview only. Re-run with --confirm or payload.confirm=true to execute."}' <<<"${PLAN_JSON}"
  exit 0
fi

if [[ -n "${WORKING_WARNING}" && "${WARN_ONLY_WORKING_LIMIT}" != "true" ]]; then
  echo "Working limit exceeded and warnOnlyWorkingLimit=false" >&2
  exit 1
fi

edit_cmd=(gh issue edit "${ISSUE_NUMBER}" --repo "${REPO}")
HAS_ISSUE_EDIT_MUTATION="false"
if [[ -n "${DESIRED_STATUS_LABEL}" ]]; then
  edit_cmd+=(--add-label "${DESIRED_STATUS_LABEL}")
  HAS_ISSUE_EDIT_MUTATION="true"
fi
for remove_label in "${STATUS_LABELS_TO_REMOVE[@]:-}"; do
  [[ -n "${remove_label}" ]] || continue
  edit_cmd+=(--remove-label "${remove_label}")
  HAS_ISSUE_EDIT_MUTATION="true"
done
for remove_label in "${BLOCKED_LABELS_TO_REMOVE[@]:-}"; do
  [[ -n "${remove_label}" ]] || continue
  edit_cmd+=(--remove-label "${remove_label}")
  HAS_ISSUE_EDIT_MUTATION="true"
done
if [[ "${ADD_BLOCKED_LABEL}" == "true" && -n "${BLOCKED_LABEL}" ]]; then
  edit_cmd+=(--add-label "${BLOCKED_LABEL}")
  HAS_ISSUE_EDIT_MUTATION="true"
fi
if [[ -n "${MILESTONE_VALUE}" ]]; then
  edit_cmd+=(--milestone "${MILESTONE_VALUE}")
  HAS_ISSUE_EDIT_MUTATION="true"
fi
if [[ "${HAS_ISSUE_EDIT_MUTATION}" == "true" ]]; then
  "${edit_cmd[@]}" >/dev/null
fi

if [[ "${TARGET_STATE}" == "blocked" && -n "${BLOCKER_NOTE}" ]]; then
  gh issue comment "${ISSUE_NUMBER}" --repo "${REPO}" --body "Blocked reason: ${BLOCKER_NOTE}" >/dev/null
fi

"${SET_FIELDS_SCRIPT}" \
  --repo "${REPO}" \
  --issue-number "${ISSUE_NUMBER}" \
  --project-owner "${PROJECT_OWNER}" \
  --project-number "${PROJECT_NUMBER}" \
  --project-title "${PROJECT_TITLE}" \
  --status "${DESIRED_PROJECT_STATUS}" \
  --area "${AREA_VALUE}" \
  --priority "${PRIORITY_VALUE}" \
  --release "${RELEASE_VALUE}" \
  --confirm >/dev/null

"${ALIGN_SCRIPT}" \
  --repo "${REPO}" \
  --issue-number "${ISSUE_NUMBER}" \
  --project-owner "${PROJECT_OWNER}" \
  --project-number "${PROJECT_NUMBER}" \
  --project-title "${PROJECT_TITLE}" \
  --prefer-source "${PREFER_SOURCE}" \
  --confirm >/dev/null

jq '. + {mutated:true}' <<<"${PLAN_JSON}"
