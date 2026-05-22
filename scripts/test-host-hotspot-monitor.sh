#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

assert_file_count() {
  local expected="${1:-0}" directory="${2:-}"
  local actual
  shopt -s nullglob
  local files=("${directory}"/*.json)
  shopt -u nullglob
  actual="${#files[@]}"
  if [[ "${actual}" != "${expected}" ]]; then
    printf 'Expected %s JSON files in %s, found %s\n' "${expected}" "${directory}" "${actual}" >&2
    exit 1
  fi
}

assert_json_field() {
  local file_path="${1:-}" field_name="${2:-}" expected="${3:-}"
  local actual
  actual="$(
    python3 - "${file_path}" "${field_name}" <<'PY'
from __future__ import annotations

import json
import sys
from pathlib import Path

with Path(sys.argv[1]).open("r", encoding="utf-8") as handle:
    payload = json.load(handle)
print(payload.get(sys.argv[2], ""))
PY
  )"

  if [[ "${actual}" != "${expected}" ]]; then
    printf 'Expected %s=%s in %s, got %s\n' "${field_name}" "${expected}" "${file_path}" "${actual}" >&2
    exit 1
  fi
}

write_fixture() {
  local file_path="${1:-}" issue_code="${2:-none}" message="${3:-}"
  cat >"${file_path}" <<JSON
{
  "issueCode": "${issue_code}",
  "message": "${message}",
  "hotspotDevice": "wlan-ap",
  "scanDevice": "wlan-scan",
  "hotspotSsid": "Stone Frigate"
}
JSON
}

run_monitor() {
  local fixture="${1:-}" now_epoch="${2:-1000}" request_dir="${3:-${TMP_DIR}/requests}" state_file="${4:-${TMP_DIR}/monitor.json}"
  HOST_HOTSPOT_MONITOR_STATE_JSON_FILE="${fixture}" \
    HOST_HOTSPOT_RECOVERY_REQUEST_DIR="${request_dir}" \
    HOST_HOTSPOT_RECOVERY_STATUS_FILE="${TMP_DIR}/recovery-status.json" \
    HOST_HOTSPOT_MONITOR_STATE_FILE="${state_file}" \
    HOST_HOTSPOT_MONITOR_LOCK_FILE="${TMP_DIR}/monitor.lock" \
    HOST_HOTSPOT_MONITOR_COOLDOWN_SECONDS="600" \
    HOST_HOTSPOT_MONITOR_START_SERVICE="false" \
    HOST_HOTSPOT_MONITOR_NOW_EPOCH="${now_epoch}" \
    bash "${REPO_ROOT}/deploy/monitor-host-hotspot.sh" >/dev/null
}

REQUEST_DIR="${TMP_DIR}/requests"
STATE_FILE="${TMP_DIR}/monitor.json"
mkdir -p "${REQUEST_DIR}"

write_fixture "${TMP_DIR}/healthy.json" "none" "Hotspot profile and adapters are ready."
run_monitor "${TMP_DIR}/healthy.json" "1000" "${REQUEST_DIR}" "${STATE_FILE}"
assert_file_count "0" "${REQUEST_DIR}"
assert_json_field "${STATE_FILE}" "state" "healthy"

write_fixture "${TMP_DIR}/missing.json" "approved_hotspot_adapter_missing" "No approved USB AP dongle is visible."
run_monitor "${TMP_DIR}/missing.json" "2000" "${REQUEST_DIR}" "${STATE_FILE}"
assert_file_count "1" "${REQUEST_DIR}"
assert_json_field "${STATE_FILE}" "state" "repair_queued"
assert_json_field "${STATE_FILE}" "issueCode" "approved_hotspot_adapter_missing"

run_monitor "${TMP_DIR}/missing.json" "2200" "${REQUEST_DIR}" "${STATE_FILE}"
assert_file_count "1" "${REQUEST_DIR}"
assert_json_field "${STATE_FILE}" "state" "cooldown"

write_fixture "${TMP_DIR}/scan-missing.json" "scan_adapter_missing" "A second Wi-Fi radio is unavailable for hotspot verification."
run_monitor "${TMP_DIR}/scan-missing.json" "3000" "${TMP_DIR}/scan-requests" "${TMP_DIR}/scan-monitor.json"
assert_file_count "0" "${TMP_DIR}/scan-requests"
assert_json_field "${TMP_DIR}/scan-monitor.json" "state" "degraded"

write_fixture "${TMP_DIR}/not-visible.json" "hotspot_not_visible" "Hotspot SSID is not visible from wlan-scan."
run_monitor "${TMP_DIR}/not-visible.json" "4000" "${TMP_DIR}/visibility-requests" "${TMP_DIR}/visibility-monitor.json"
assert_file_count "1" "${TMP_DIR}/visibility-requests"
assert_json_field "${TMP_DIR}/visibility-monitor.json" "state" "repair_queued"

printf 'host hotspot monitor tests passed\n'
