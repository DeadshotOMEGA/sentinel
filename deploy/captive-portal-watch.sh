#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/_common.sh"

ENABLED="$(normalize_boolean_env "$(env_value CAPTIVE_PORTAL_RECOVERY_ENABLED false)")"
AUTO_ENABLED="$(normalize_boolean_env "$(env_value CAPTIVE_PORTAL_AUTO_RECOVER false)")"
INTERVAL_RAW="$(env_value CAPTIVE_PORTAL_RECOVERY_INTERVAL_SECONDS 60)"
FAILURE_THRESHOLD_RAW="$(env_value CAPTIVE_PORTAL_RECOVERY_FAILURE_THRESHOLD 2)"

INTERVAL_SECONDS=60
if [[ "${INTERVAL_RAW}" =~ ^[0-9]+$ ]] && (( INTERVAL_RAW > 0 )); then
  INTERVAL_SECONDS="${INTERVAL_RAW}"
fi

FAILURE_THRESHOLD=2
if [[ "${FAILURE_THRESHOLD_RAW}" =~ ^[0-9]+$ ]] && (( FAILURE_THRESHOLD_RAW > 0 )); then
  FAILURE_THRESHOLD="${FAILURE_THRESHOLD_RAW}"
fi

if [[ "${ENABLED}" != "true" || "${AUTO_ENABLED}" != "true" ]]; then
  exit 0
fi

CACHE_DIR="${XDG_CACHE_HOME:-${HOME}/.cache}/sentinel"
mkdir -p "${CACHE_DIR}"
exec >>"${CACHE_DIR}/captive-portal-watch.log" 2>&1

log "Starting captive portal recovery watcher."
sleep 15

consecutive_failures=0

while true; do
  if "${SCRIPT_DIR}/captive-portal-recover.sh" check; then
    consecutive_failures=0
  else
    status=$?
    if [[ "${status}" -eq 10 ]]; then
      consecutive_failures=$((consecutive_failures + 1))
      log "Connectivity check failed ${consecutive_failures}/${FAILURE_THRESHOLD} time(s)."
      if (( consecutive_failures >= FAILURE_THRESHOLD )); then
        "${SCRIPT_DIR}/captive-portal-recover.sh" run || true
        consecutive_failures=0
      fi
    else
      warn "Captive portal watcher received unexpected status ${status}; resetting failure counter."
      consecutive_failures=0
    fi
  fi

  sleep "${INTERVAL_SECONDS}"
done
