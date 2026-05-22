#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/ensure-host-hotspot-profile.sh"

REQUEST_DIR="${HOST_HOTSPOT_RECOVERY_REQUEST_DIR:-${SCRIPT_DIR}/runtime/hotspot-recovery/requests}"
STATE_FILE="${HOST_HOTSPOT_MONITOR_STATE_FILE:-${SCRIPT_DIR}/runtime/hotspot-recovery/monitor.json}"
RECOVERY_STATUS_FILE="${HOST_HOTSPOT_RECOVERY_STATUS_FILE:-${SCRIPT_DIR}/runtime/hotspot-recovery/status.json}"
LOCK_FILE="${HOST_HOTSPOT_MONITOR_LOCK_FILE:-/run/lock/sentinel-host-hotspot-monitor.lock}"
COOLDOWN_SECONDS="${HOST_HOTSPOT_MONITOR_COOLDOWN_SECONDS:-$(env_value HOST_HOTSPOT_MONITOR_COOLDOWN_SECONDS 600)}"
DRY_RUN="$(normalize_boolean_env "${HOST_HOTSPOT_MONITOR_DRY_RUN:-false}")"
START_SERVICE="$(normalize_boolean_env "${HOST_HOTSPOT_MONITOR_START_SERVICE:-true}")"

monitor_log() {
  printf '[host-hotspot-monitor] %s\n' "$*"
}

monitor_warn() {
  printf '[host-hotspot-monitor] %s\n' "$*" >&2
}

monitor_json_string_or_null() {
  local value="${1:-}"
  if [[ -z "${value}" ]]; then
    printf 'null'
    return 0
  fi

  printf '"%s"' "$(json_escape "${value}")"
}

monitor_normalize_cooldown() {
  if [[ ! "${COOLDOWN_SECONDS}" =~ ^[0-9]+$ ]] || (( COOLDOWN_SECONDS < 60 )); then
    COOLDOWN_SECONDS="600"
  fi
}

monitor_now_epoch() {
  if [[ -n "${HOST_HOTSPOT_MONITOR_NOW_EPOCH:-}" ]]; then
    printf '%s\n' "${HOST_HOTSPOT_MONITOR_NOW_EPOCH}"
    return 0
  fi

  date -u +%s
}

monitor_now_timestamp() {
  if [[ -n "${HOST_HOTSPOT_MONITOR_NOW_EPOCH:-}" ]]; then
    date -u -d "@${HOST_HOTSPOT_MONITOR_NOW_EPOCH}" +'%Y-%m-%dT%H:%M:%SZ'
    return 0
  fi

  utc_timestamp
}

monitor_json_field() {
  local file_path="${1:-}" field_name="${2:-}" default_value="${3:-}"
  [[ -f "${file_path}" && -n "${field_name}" ]] || {
    printf '%s\n' "${default_value}"
    return 0
  }

  python3 - "${file_path}" "${field_name}" "${default_value}" <<'PY'
from __future__ import annotations

import json
import sys
from pathlib import Path

path = Path(sys.argv[1])
field = sys.argv[2]
default = sys.argv[3]

try:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
except (OSError, json.JSONDecodeError):
    print(default)
    raise SystemExit(0)

value = payload.get(field, default)
if value is None:
    print(default)
else:
    print(value)
PY
}

monitor_load_state_from_fixture() {
  local fixture="${HOST_HOTSPOT_MONITOR_STATE_JSON_FILE:-}"
  [[ -n "${fixture}" ]] || return 1

  HOTSPOT_STATE_ISSUE_CODE="$(monitor_json_field "${fixture}" "issueCode" "none")"
  HOTSPOT_STATE_MESSAGE="$(monitor_json_field "${fixture}" "message" "")"
  HOTSPOT_STATE_HOTSPOT_DEVICE="$(monitor_json_field "${fixture}" "hotspotDevice" "")"
  HOTSPOT_STATE_HOTSPOT_SCAN_DEVICE="$(monitor_json_field "${fixture}" "scanDevice" "")"
  HOTSPOT_STATE_HOTSPOT_SSID="$(monitor_json_field "${fixture}" "hotspotSsid" "")"
  return 0
}

monitor_collect_state() {
  if monitor_load_state_from_fixture; then
    return 0
  fi

  hotspot_refresh_config
  hotspot_collect_runtime_state
}

monitor_is_recoverable_issue() {
  case "${HOTSPOT_STATE_ISSUE_CODE}" in
    approved_hotspot_adapter_missing|hotspot_profile_missing|hotspot_adapter_busy|hotspot_not_visible)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

monitor_request_id() {
  local uuid timestamp
  timestamp="$(date -u +'%Y%m%d-%H%M%S')"
  if [[ -r /proc/sys/kernel/random/uuid ]]; then
    uuid="$(cat /proc/sys/kernel/random/uuid)"
  else
    uuid="${RANDOM}${RANDOM}"
  fi
  printf 'monitor-%s-%s\n' "${timestamp}" "${uuid}"
}

monitor_write_status() {
  local state="${1:-unknown}" action="${2:-none}" request_id="${3:-}" last_recovery_epoch="${4:-}" message="${5:-${HOTSPOT_STATE_MESSAGE:-}}" updated_at tmp_file
  updated_at="$(monitor_now_timestamp)"
  tmp_file="$(mktemp)"

  cat >"${tmp_file}" <<JSON
{
  "schemaVersion": 1,
  "state": "$(json_escape "${state}")",
  "action": "$(json_escape "${action}")",
  "issueCode": "$(json_escape "${HOTSPOT_STATE_ISSUE_CODE:-none}")",
  "message": "$(json_escape "${message}")",
  "requestId": $(monitor_json_string_or_null "${request_id}"),
  "hotspotDevice": $(monitor_json_string_or_null "${HOTSPOT_STATE_HOTSPOT_DEVICE:-}"),
  "scanDevice": $(monitor_json_string_or_null "${HOTSPOT_STATE_HOTSPOT_SCAN_DEVICE:-}"),
  "hotspotSsid": $(monitor_json_string_or_null "${HOTSPOT_STATE_HOTSPOT_SSID:-}"),
  "cooldownSeconds": ${COOLDOWN_SECONDS},
  "lastRecoveryEpoch": $(monitor_json_string_or_null "${last_recovery_epoch}"),
  "updatedAt": "$(json_escape "${updated_at}")"
}
JSON

  mkdir -p "$(dirname "${STATE_FILE}")"
  install -m 664 "${tmp_file}" "${STATE_FILE}"
  rm -f "${tmp_file}"
}

monitor_queue_recovery() {
  local request_id request_file tmp_file created_at
  request_id="$(monitor_request_id)"
  request_file="${REQUEST_DIR}/${request_id}.json"
  tmp_file="$(mktemp)"
  created_at="$(monitor_now_timestamp)"

  cat >"${tmp_file}" <<JSON
{
  "requestId": "$(json_escape "${request_id}")",
  "source": "host-hotspot-monitor",
  "issueCode": "$(json_escape "${HOTSPOT_STATE_ISSUE_CODE}")",
  "message": "$(json_escape "${HOTSPOT_STATE_MESSAGE}")",
  "createdAt": "$(json_escape "${created_at}")"
}
JSON

  mkdir -p "${REQUEST_DIR}"
  install -m 664 "${tmp_file}" "${request_file}"
  rm -f "${tmp_file}"

  printf '%s\n' "${request_id}"
}

monitor_write_recovery_status() {
  local request_id="${1:-}" updated_at tmp_file
  updated_at="$(monitor_now_timestamp)"
  tmp_file="$(mktemp)"

  cat >"${tmp_file}" <<JSON
{
  "state": "queued",
  "stage": "request_queued",
  "message": "Automated hotspot recovery queued. Sentinel is repairing the hosted Wi-Fi signal.",
  "requestId": $(monitor_json_string_or_null "${request_id}"),
  "source": "host-hotspot-monitor",
  "connectionName": null,
  "hotspotSsid": $(monitor_json_string_or_null "${HOTSPOT_STATE_HOTSPOT_SSID:-}"),
  "hotspotDevice": $(monitor_json_string_or_null "${HOTSPOT_STATE_HOTSPOT_DEVICE:-}"),
  "scanDevice": $(monitor_json_string_or_null "${HOTSPOT_STATE_HOTSPOT_SCAN_DEVICE:-}"),
  "usbDevice": null,
  "hardwareResetApplied": null,
  "startedAt": "$(json_escape "${updated_at}")",
  "updatedAt": "$(json_escape "${updated_at}")",
  "completedAt": null,
  "durationSeconds": null
}
JSON

  mkdir -p "$(dirname "${RECOVERY_STATUS_FILE}")"
  install -m 664 "${tmp_file}" "${RECOVERY_STATUS_FILE}"
  rm -f "${tmp_file}"
}

monitor_start_recovery_service() {
  if [[ "${START_SERVICE}" != "true" ]]; then
    return 0
  fi

  if command -v systemctl >/dev/null 2>&1; then
    systemctl start sentinel-host-hotspot-recovery.service || monitor_warn "Unable to start sentinel-host-hotspot-recovery.service; the path watcher should process the queued request."
  fi
}

main() {
  local now_epoch last_recovery_epoch elapsed request_id
  monitor_normalize_cooldown

  mkdir -p "$(dirname "${LOCK_FILE}")"
  exec 9>"${LOCK_FILE}"
  if ! flock -n 9; then
    monitor_log "Host hotspot monitor is already running."
    exit 0
  fi

  monitor_collect_state
  now_epoch="$(monitor_now_epoch)"

  if [[ "${HOTSPOT_STATE_ISSUE_CODE}" == "none" ]]; then
    monitor_write_status "healthy" "none" "" "" "${HOTSPOT_STATE_MESSAGE:-Hotspot profile and adapters are ready.}"
    monitor_log "Hotspot is healthy."
    exit 0
  fi

  if ! monitor_is_recoverable_issue; then
    monitor_write_status "degraded" "none" "" "" "${HOTSPOT_STATE_MESSAGE}"
    monitor_log "Hotspot monitor found ${HOTSPOT_STATE_ISSUE_CODE}; no automatic repair was queued."
    exit 0
  fi

  last_recovery_epoch="$(monitor_json_field "${STATE_FILE}" "lastRecoveryEpoch" "")"
  if [[ "${last_recovery_epoch}" =~ ^[0-9]+$ ]]; then
    elapsed=$((now_epoch - last_recovery_epoch))
    if (( elapsed >= 0 && elapsed < COOLDOWN_SECONDS )); then
      monitor_write_status "cooldown" "skipped" "" "${last_recovery_epoch}" "${HOTSPOT_STATE_MESSAGE}"
      monitor_log "Hotspot issue ${HOTSPOT_STATE_ISSUE_CODE} is within repair cooldown; skipping."
      exit 0
    fi
  fi

  if [[ "${DRY_RUN}" == "true" ]]; then
    monitor_write_status "would_repair" "dry_run" "" "${now_epoch}" "${HOTSPOT_STATE_MESSAGE}"
    monitor_log "Dry run would queue hotspot recovery for ${HOTSPOT_STATE_ISSUE_CODE}."
    exit 0
  fi

  request_id="$(monitor_queue_recovery)"
  monitor_write_status "repair_queued" "queued_recovery" "${request_id}" "${now_epoch}" "${HOTSPOT_STATE_MESSAGE}"
  monitor_write_recovery_status "${request_id}"
  monitor_start_recovery_service
  monitor_log "Queued host hotspot recovery request ${request_id} for ${HOTSPOT_STATE_ISSUE_CODE}."
}

main "$@"
