#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <session-name> <label> [subdir]"
  echo "Example: $0 members-qa round1 members"
  exit 1
fi

SESSION_NAME="$1"
LABEL="$2"
SUBDIR="${3:-ad-hoc}"
PLAYWRIGHT_CLI_CONFIG="${PLAYWRIGHT_CLI_CONFIG:-.playwright-cli/cli.config.json}"
RUN_DATE="$(date +%F)"
STAMP="$(date +%Y%m%d-%H%M%S)"
ARTIFACT_DIR=".playwright-cli/runs/${SUBDIR}/${RUN_DATE}/${STAMP}-${LABEL}"
LOG_DIR=".playwright-cli/logs/${SUBDIR}/${RUN_DATE}"
SNAPSHOT_PATH="${ARTIFACT_DIR}/${LABEL}.yml"
SCREENSHOT_PATH="${ARTIFACT_DIR}/${LABEL}.png"

mkdir -p "$ARTIFACT_DIR"
mkdir -p "$LOG_DIR"

playwright_cli() {
  playwright-cli --config="$PLAYWRIGHT_CLI_CONFIG" "$@"
}

list_root_artifacts() {
  find .playwright-cli -maxdepth 1 -type f \( -name 'console-*.log' -o -name 'page-*.yml' \) -printf '%f\n' | sort
}

relocate_root_artifacts() {
  local before_file="$1"
  local after_file
  after_file="$(mktemp)"
  list_root_artifacts >"$after_file"

  while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    case "$file" in
      console-*.log) mv ".playwright-cli/$file" "${LOG_DIR}/${file}" ;;
      page-*.yml) mv ".playwright-cli/$file" "${ARTIFACT_DIR}/${file}" ;;
    esac
  done < <(comm -13 "$before_file" "$after_file")

  rm -f "$after_file"
}

ROOT_ARTIFACTS_BEFORE="$(mktemp)"
list_root_artifacts >"$ROOT_ARTIFACTS_BEFORE"

playwright_cli -s="$SESSION_NAME" snapshot --filename="${SNAPSHOT_PATH}"
playwright_cli -s="$SESSION_NAME" screenshot --filename="${SCREENSHOT_PATH}"
relocate_root_artifacts "$ROOT_ARTIFACTS_BEFORE"
rm -f "$ROOT_ARTIFACTS_BEFORE"

echo "Saved:"
echo "  ${SNAPSHOT_PATH}"
echo "  ${SCREENSHOT_PATH}"
