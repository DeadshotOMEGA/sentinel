#!/usr/bin/env bash
set -euo pipefail

SELF_PATH="$(readlink -f "${BASH_SOURCE[0]}")"
if [[ "${EUID}" -ne 0 ]]; then
  exec sudo "${SELF_PATH}" "$@"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/_common.sh"

TARGET_VERSION=""
REPORT_SOURCE="manual"
REPORT_STATUS="running"
REPORT_RESULT="failed"
REPORT_WARNINGS=""
REPORT_NEXT_ACTION=""
REPORT_EMITTED="false"
REPORT_HEALTHZ_PASSED="false"

usage() {
  cat <<USAGE
Usage: ./rollback.sh [--version vX.Y.Z] [--source <value>]

If --version is omitted, rollback uses PREVIOUS_VERSION from .appliance-state.
USAGE
}

normalize_version_value() {
  local raw="${1:-}"
  raw="${raw%%#*}"
  raw="$(printf '%s' "${raw}" | tr -d '\r' | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"
  raw="${raw%\"}"
  raw="${raw#\"}"
  raw="${raw%\'}"
  raw="${raw#\'}"
  printf '%s\n' "${raw}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      TARGET_VERSION="${2:-}"
      shift 2
      ;;
    --version=*)
      TARGET_VERSION="${1#*=}"
      shift
      ;;
    --source)
      REPORT_SOURCE="${2:-manual}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Unknown option: $1"
      ;;
  esac
done

if [[ -n "${TARGET_VERSION}" ]]; then
  TARGET_VERSION="$(normalize_version_value "${TARGET_VERSION}")"
fi

enable_update_trace \
  "rollback.sh" \
  "reset" \
  "Starting Sentinel rollback flow${TARGET_VERSION:+ to ${TARGET_VERSION}}." \
  "${TARGET_VERSION:-rollback}"

ensure_docker_and_compose_v2
ensure_env_file
load_state
set_compose_file_args
acquire_updater_lock

REPORT_ID="$(new_operation_report_id rollback)"
REPORT_STARTED_AT="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"

emit_rollback_report() {
  local report_status="${1}" report_result="${2}" next_action="${3:-${REPORT_NEXT_ACTION}}" finished_at rollback_json network_json artifact_json
  finished_at="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  rollback_json="$(
    python3 - "${TARGET_VERSION}" "${CURRENT_VERSION:-}" "${report_result}" <<'PY'
from __future__ import annotations

import json
import sys

target_version, current_version, result = sys.argv[1:]
payload = {
    "attempted": True,
    "result": result,
    "targetVersion": target_version or None,
    "currentVersion": current_version or None,
}
print(json.dumps(payload, sort_keys=True))
PY
  )"
  artifact_json='{}'
  if [[ -f "${CACHED_DEB:-}" ]]; then
    artifact_json="$(
      python3 - "${TARGET_VERSION}" "${CACHED_DEB}" <<'PY'
from __future__ import annotations

import json
import sys
from pathlib import Path

target_version, artifact_path = sys.argv[1:]
payload = {
    "target": {
        "debPath": artifact_path,
        "present": Path(artifact_path).exists(),
        "version": target_version or None,
        "verificationMode": "cached",
    }
}
print(json.dumps(payload, sort_keys=True))
PY
    )"
  fi
  network_json='{"status": "ok", "message": "Rollback completed."}'
  if [[ -n "${REPORT_WARNINGS}" ]]; then
    network_json='{"status": "degraded", "message": "Rollback completed with warnings."}'
  fi

  REPORT_PATH="$(emit_operation_report \
    "${REPORT_ID}" \
    "rollback" \
    "${report_status}" \
    "${report_result}" \
    "${TARGET_VERSION}" \
    "${TARGET_VERSION}" \
    "${PREVIOUS_VERSION:-}" \
    "${LAST_KNOWN_GOOD_VERSION:-${CURRENT_VERSION:-}}" \
    "${REPORT_STARTED_AT}" \
    "${finished_at}" \
    "${REPORT_HEALTHZ_PASSED}" \
    "" \
    "${UPDATE_TRACE_FILE}" \
    "${next_action}" \
    "${REPORT_SOURCE}" \
    "${artifact_json}" \
    "{}" \
    "${rollback_json}" \
    "{\"mode\": \"rollback\", \"status\": \"${report_status}\"}" \
    "${network_json}" \
    "${REPORT_WARNINGS}"
  )"
  REPORT_EMITTED="true"
}

finish_rollback_report() {
  local exit_code=$?
  if [[ "${REPORT_EMITTED}" == "true" ]]; then
    return 0
  fi

  if [[ "${exit_code}" -eq 0 ]]; then
    emit_rollback_report "${REPORT_STATUS}" "${REPORT_RESULT}" "${REPORT_NEXT_ACTION}"
    return 0
  fi

  REPORT_WARNINGS+=$'Rollback terminated before completion.\n'
  emit_rollback_report "failed" "failed" "Inspect the update trace and restore from a known-good backup if needed."
  return "${exit_code}"
}

trap finish_rollback_report EXIT

CURRENT_VERSION="$(env_value SENTINEL_VERSION)"
CURRENT_VERSION="$(normalize_version_value "${CURRENT_VERSION}")"
require_explicit_version "${CURRENT_VERSION}"

if [[ -z "${TARGET_VERSION}" ]]; then
  TARGET_VERSION="${PREVIOUS_VERSION:-}"
fi
TARGET_VERSION="$(normalize_version_value "${TARGET_VERSION}")"
require_explicit_version "${TARGET_VERSION}"

log "Rolling back from ${CURRENT_VERSION} to ${TARGET_VERSION}"

CACHED_DEB="/var/lib/sentinel/updater/downloads/sentinel_${TARGET_VERSION#v}_all.deb"
if [[ -f "${CACHED_DEB}" ]]; then
  log "Reinstalling cached updater bundle artifact for ${TARGET_VERSION}: ${CACHED_DEB}"
  if ! apt-get install -y "${CACHED_DEB}"; then
    dpkg -i "${CACHED_DEB}"
    apt-get -f install -y
  fi
else
  REPORT_WARNINGS+=$"Cached package artifact for ${TARGET_VERSION} was not found at ${CACHED_DEB}; continuing with compose-level rollback only.\n"
fi

PREVIOUS_VERSION="${CURRENT_VERSION}"
CURRENT_VERSION="${TARGET_VERSION}"
LAST_KNOWN_GOOD_VERSION="${TARGET_VERSION}"
LAST_ATTEMPTED_VERSION="${TARGET_VERSION}"
LAST_FAILED_VERSION=""

upsert_env "SENTINEL_VERSION" "${TARGET_VERSION}"

ensure_compose_pull_with_login_fallback
log "Applying rollback target ${TARGET_VERSION}"
compose up -d
run_bootstrap_sentinel_account

if ! wait_for_healthz 240; then
  print_health_diagnostics
  REPORT_NEXT_ACTION="Inspect the health diagnostics and restore from a known-good backup if required."
  die "Rollback failed health gate check at /healthz"
fi
REPORT_HEALTHZ_PASSED="true"

save_state
archive_superseded_terminal_job

if command -v systemctl >/dev/null 2>&1; then
  write_systemd_unit
  configure_network_status_telemetry
fi

configure_hotspot_connectivity_helpers
run_host_hotspot_recovery_nonblocking || REPORT_WARNINGS+=$'Hotspot recovery completed with warnings.\n'

REPORT_STATUS="completed"
REPORT_RESULT="success"
REPORT_NEXT_ACTION="No action required."
if [[ -n "${REPORT_WARNINGS}" ]]; then
  REPORT_RESULT="degraded"
  REPORT_NEXT_ACTION="Review rollback warnings and verify host networking."
fi
emit_rollback_report "${REPORT_STATUS}" "${REPORT_RESULT}" "${REPORT_NEXT_ACTION}"

log "Rollback complete. Current version: ${CURRENT_VERSION}"
log "Report: ${REPORT_PATH}"
warn "If database schema changed incompatibly, use restore.sh with a known-good pre-update backup."
