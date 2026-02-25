#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<USAGE
Usage: create-issue.sh --payload-file <path> [--dry-run] [--confirm]
       create-issue.sh --payload-json '<json>' [--dry-run] [--confirm]

Payload shape:
{
  "repo": "DeadshotOMEGA/sentinel",
  "type": "bug|feature|task|refactor",
  "title": "string",
  "body": "string",
  "area": "backend|frontend|hardware|infra|database|auth|logging",
  "priority": "P0|P1|P2|null",
  "labels": ["string"],
  "fields": { "area": "frontend", "...": "..." },
  "projectTitle": "Sentinel Development",
  "milestone": "vX.Y.Z|null",
  "release": "vX.Y.Z|null",
  "needsInvestigation": false,
  "additionalLabels": ["string"],
  "confirm": false
}
USAGE
}

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "${SCRIPT_DIR}" rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "${REPO_ROOT}" ]]; then
  REPO_ROOT="$(cd "${SCRIPT_DIR}/../../../../" && pwd)"
fi

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

TYPE="$(jq -r '.type // empty' <<<"${PAYLOAD_JSON}")"
TITLE="$(jq -r '.title // empty' <<<"${PAYLOAD_JSON}")"
REPO="$(jq -r '.repo // "DeadshotOMEGA/sentinel"' <<<"${PAYLOAD_JSON}")"
PROJECT_TITLE="$(jq -r '.projectTitle // "Sentinel Development"' <<<"${PAYLOAD_JSON}")"
MILESTONE="$(jq -r '.milestone // empty' <<<"${PAYLOAD_JSON}")"
RELEASE="$(jq -r '.release // empty' <<<"${PAYLOAD_JSON}")"
NEEDS_INVESTIGATION="$(jq -r '.needsInvestigation // false' <<<"${PAYLOAD_JSON}")"
PAYLOAD_CONFIRM="$(jq -r '.confirm // false' <<<"${PAYLOAD_JSON}")"

if [[ -n "${CONFIRM_OVERRIDE}" ]]; then
  CONFIRM="${CONFIRM_OVERRIDE}"
else
  CONFIRM="${PAYLOAD_CONFIRM}"
fi

if [[ "${DRY_RUN}" == "true" ]]; then
  CONFIRM="false"
fi

[[ -n "${TYPE}" ]] || { echo "Payload.type is required" >&2; exit 1; }
[[ -n "${TITLE}" ]] || { echo "Payload.title is required" >&2; exit 1; }

TEMPLATE_META="$("${SCRIPT_DIR}"/extract-template-requirements.sh --type "${TYPE}" --repo-root "${REPO_ROOT}")"
ALL_FIELD_IDS_JSON="$(jq -c '.allFieldIds' <<<"${TEMPLATE_META}")"
FIELD_VALUES_JSON="$(jq -c --argjson allFieldIds "${ALL_FIELD_IDS_JSON}" '
  . as $root
  | reduce $allFieldIds[] as $id (
      {};
      ( ($root.fields[$id] // $root[$id]) ) as $value
      | if $value == null then . else .[$id] = $value end
    )
' <<<"${PAYLOAD_JSON}")"

validate_required_field() {
  local field_id="${1}"
  jq -e --arg id "${field_id}" '.[$id] != null and (.[$id] | tostring | gsub("^\\s+|\\s+$"; "") | length > 0)' <<<"${FIELD_VALUES_JSON}" >/dev/null
}

MISSING_REQUIRED=()
while IFS= read -r required_id; do
  [[ -n "${required_id}" ]] || continue
  if ! validate_required_field "${required_id}"; then
    MISSING_REQUIRED+=("${required_id}")
  fi
done < <(jq -r '.requiredFieldIds[]' <<<"${TEMPLATE_META}")

if [[ "${#MISSING_REQUIRED[@]}" -gt 0 ]]; then
  echo "Missing required template field(s): ${MISSING_REQUIRED[*]}" >&2
  exit 1
fi

if [[ -n "${MILESTONE}" && -z "${RELEASE}" ]]; then
  RELEASE="${MILESTONE}"
elif [[ -z "${MILESTONE}" && -n "${RELEASE}" ]]; then
  MILESTONE="${RELEASE}"
fi

if [[ -n "${MILESTONE}" && -n "${RELEASE}" && "${MILESTONE}" != "${RELEASE}" ]]; then
  echo "Milestone/release mismatch (${MILESTONE} vs ${RELEASE}); resolve before create." >&2
  exit 1
fi

AREA_VALUE="$(jq -r '.fields.area // .area // empty' <<<"${PAYLOAD_JSON}")"
PRIORITY_VALUE="$(jq -r '.fields.priority // .priority // empty' <<<"${PAYLOAD_JSON}")"
EXTRA_LABELS_JSON="$(jq -c '((.labels // []) + (.additionalLabels // []))' <<<"${PAYLOAD_JSON}")"

LABELS_JSON="$(jq -n --argjson defaults "$(jq -c '.defaultLabels' <<<"${TEMPLATE_META}")" --arg area "${AREA_VALUE}" --arg priority "${PRIORITY_VALUE}" --arg needsInvestigation "${NEEDS_INVESTIGATION}" --argjson extra "${EXTRA_LABELS_JSON}" '
  (
    ($defaults +
      (if ($area | length) > 0 then [$area] else [] end) +
      (if ($priority | test("^P[0-9]+$")) then [$priority] else [] end) +
      (if $needsInvestigation == "true" then ["needs-investigation"] else [] end) +
      $extra
    )
    | map(select(length > 0))
    | unique
  )
')"

BODY_CONTENT="$(jq -r '.body // empty' <<<"${PAYLOAD_JSON}")"
if [[ -z "${BODY_CONTENT}" ]]; then
  BODY_CONTENT="$(jq -r '
    to_entries
    | map(select(.value != null and (.value|tostring|length) > 0))
    | map("### " + .key + "\n" + (.value|tostring) + "\n")
    | join("\n")
  ' <<<"${FIELD_VALUES_JSON}")"
fi

if [[ -z "${BODY_CONTENT}" ]]; then
  echo "No issue body content generated (provide payload.body or template field values)." >&2
  exit 1
fi

PLAN_JSON="$(jq -n \
  --arg repo "${REPO}" \
  --arg type "${TYPE}" \
  --arg title "${TITLE}" \
  --arg projectTitle "${PROJECT_TITLE}" \
  --arg milestone "${MILESTONE}" \
  --arg release "${RELEASE}" \
  --arg area "${AREA_VALUE}" \
  --arg priority "${PRIORITY_VALUE}" \
  --arg dryRun "${DRY_RUN}" \
  --arg confirm "${CONFIRM}" \
  --argjson labels "${LABELS_JSON}" \
  '{
    repo: $repo,
    type: $type,
    title: $title,
    labels: $labels,
    projectTitle: $projectTitle,
    milestone: (if ($milestone|length)>0 then $milestone else null end),
    release: (if ($release|length)>0 then $release else null end),
    area: (if ($area|length)>0 then $area else null end),
    priority: (if ($priority|length)>0 then $priority else null end),
    dryRun: ($dryRun == "true"),
    confirm: ($confirm == "true")
  }')"

if [[ "${CONFIRM}" != "true" ]]; then
  jq '. + {mutated:false, note:"Preview only. Re-run with --confirm or payload.confirm=true to execute."}' <<<"${PLAN_JSON}"
  exit 0
fi

TMP_BODY_FILE="$(mktemp)"
printf '%s\n' "${BODY_CONTENT}" > "${TMP_BODY_FILE}"

create_cmd=(gh issue create --repo "${REPO}" --title "${TITLE}" --body-file "${TMP_BODY_FILE}")
if [[ -n "${MILESTONE}" ]]; then
  create_cmd+=(--milestone "${MILESTONE}")
fi
if [[ -n "${PROJECT_TITLE}" ]]; then
  create_cmd+=(--project "${PROJECT_TITLE}")
fi
while IFS= read -r label; do
  [[ -n "${label}" ]] || continue
  create_cmd+=(--label "${label}")
done < <(jq -r '.[]' <<<"${LABELS_JSON}")

ISSUE_URL="$("${create_cmd[@]}")"
rm -f "${TMP_BODY_FILE}"

ISSUE_NUMBER="${ISSUE_URL##*/}"

STATUS_OPTION="🧪 Inbox"

"${SCRIPT_DIR}"/set-project-fields.sh \
  --repo "${REPO}" \
  --issue-number "${ISSUE_NUMBER}" \
  --project-title "${PROJECT_TITLE}" \
  --status "${STATUS_OPTION}" \
  --area "${AREA_VALUE}" \
  --priority "${PRIORITY_VALUE}" \
  --release "${RELEASE}" \
  --confirm >/dev/null

jq -n \
  --argjson plan "${PLAN_JSON}" \
  --arg issueUrl "${ISSUE_URL}" \
  --arg issueNumber "${ISSUE_NUMBER}" \
  '{
    mutated: true,
    issueUrl: $issueUrl,
    issueNumber: ($issueNumber|tonumber),
    applied: $plan
  }'
