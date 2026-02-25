#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<USAGE
Usage: extract-template-requirements.sh --type <bug|feature|task|refactor> [--repo-root <path>]
USAGE
}

TYPE=""
REPO_ROOT=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --type)
      TYPE="${2:-}"
      shift 2
      ;;
    --repo-root)
      REPO_ROOT="${2:-}"
      shift 2
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

command -v jq >/dev/null 2>&1 || {
  echo "Missing dependency: jq" >&2
  exit 1
}

if [[ -z "${TYPE}" ]]; then
  echo "--type is required" >&2
  exit 1
fi

case "${TYPE}" in
  bug|feature|task|refactor)
    ;;
  *)
    echo "Unsupported type: ${TYPE}" >&2
    exit 1
    ;;
esac

if [[ -z "${REPO_ROOT}" ]]; then
  SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
  REPO_ROOT="$(git -C "${SCRIPT_DIR}" rev-parse --show-toplevel 2>/dev/null || true)"
  if [[ -z "${REPO_ROOT}" ]]; then
    REPO_ROOT="$(cd "${SCRIPT_DIR}/../../../../" && pwd)"
  fi
fi

TEMPLATE_PATH="${REPO_ROOT}/.github/ISSUE_TEMPLATE/${TYPE}.yml"
[[ -f "${TEMPLATE_PATH}" ]] || {
  echo "Template not found: ${TEMPLATE_PATH}" >&2
  exit 1
}

TITLE_PREFIX="$(awk -F': ' '/^title:/ {gsub(/^"|"$/, "", $2); print $2; exit}' "${TEMPLATE_PATH}")"

json_array_from_lines() {
  if [[ $# -eq 0 ]]; then
    printf '[]\n'
    return
  fi
  printf '%s\n' "$@" | jq -R . | jq -s .
}

mapfile -t DEFAULT_LABELS < <(
  awk '
    /^labels:/ {in_labels=1; next}
    in_labels && /^  - / {sub(/^  - /, ""); print; next}
    in_labels {in_labels=0}
  ' "${TEMPLATE_PATH}"
)

mapfile -t ALL_FIELD_IDS < <(
  awk '
    /^  - type:/ {
      if (id != "") print id;
      id="";
      next
    }
    /^    id:[[:space:]]*/ {
      sub(/^    id:[[:space:]]*/, "");
      id=$0;
      next
    }
    END {
      if (id != "") print id;
    }
  ' "${TEMPLATE_PATH}"
)

mapfile -t REQUIRED_FIELD_IDS < <(
  awk '
    /^  - type:/ {
      if (id != "" && required == 1) print id;
      id="";
      required=0;
      next
    }
    /^    id:[[:space:]]*/ {
      sub(/^    id:[[:space:]]*/, "");
      id=$0;
      next
    }
    /^[[:space:]]+required:[[:space:]]*true[[:space:]]*$/ {
      required=1;
      next
    }
    END {
      if (id != "" && required == 1) print id;
    }
  ' "${TEMPLATE_PATH}"
)

DEFAULT_LABELS_JSON="$(json_array_from_lines "${DEFAULT_LABELS[@]:-}")"
ALL_FIELD_IDS_JSON="$(json_array_from_lines "${ALL_FIELD_IDS[@]:-}")"
REQUIRED_FIELD_IDS_JSON="$(json_array_from_lines "${REQUIRED_FIELD_IDS[@]:-}")"

jq -n \
  --arg type "${TYPE}" \
  --arg templatePath "${TEMPLATE_PATH#"${REPO_ROOT}"/}" \
  --arg titlePrefix "${TITLE_PREFIX}" \
  --argjson defaultLabels "${DEFAULT_LABELS_JSON}" \
  --argjson allFieldIds "${ALL_FIELD_IDS_JSON}" \
  --argjson requiredFieldIds "${REQUIRED_FIELD_IDS_JSON}" \
  '{
    type: $type,
    templatePath: $templatePath,
    titlePrefix: $titlePrefix,
    defaultLabels: $defaultLabels,
    allFieldIds: $allFieldIds,
    requiredFieldIds: $requiredFieldIds
  }'
