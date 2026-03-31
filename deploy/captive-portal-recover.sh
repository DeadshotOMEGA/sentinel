#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/_common.sh"

MODE="check-and-recover"
FORCE="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    check|run|check-and-recover)
      MODE="$1"
      shift
      ;;
    --force)
      FORCE="true"
      shift
      ;;
    --uri)
      FORCE="true"
      shift
      if [[ $# -gt 0 ]]; then
        shift
      fi
      ;;
    *)
      FORCE="true"
      shift
      ;;
  esac
done

PORTAL_URL="$(env_value CAPTIVE_PORTAL_RECOVERY_PORTAL_URL http://neverssl.com)"
CHECK_URL="$(env_value CAPTIVE_PORTAL_RECOVERY_CHECK_URL https://connectivitycheck.gstatic.com/generate_204)"
TAILSCALE_TARGET="$(env_value CAPTIVE_PORTAL_TAILSCALE_TARGET)"
DELAY_SECONDS_RAW="$(env_value CAPTIVE_PORTAL_RECOVERY_DELAY_SECONDS 8)"
TAB_COUNT_RAW="$(env_value CAPTIVE_PORTAL_RECOVERY_TAB_COUNT 1)"
COOLDOWN_SECONDS_RAW="$(env_value CAPTIVE_PORTAL_RECOVERY_COOLDOWN_SECONDS 900)"
ENABLED="$(normalize_boolean_env "$(env_value CAPTIVE_PORTAL_RECOVERY_ENABLED false)")"

DELAY_SECONDS=8
if [[ "${DELAY_SECONDS_RAW}" =~ ^[0-9]+$ ]]; then
  DELAY_SECONDS="${DELAY_SECONDS_RAW}"
fi

TAB_COUNT=1
if [[ "${TAB_COUNT_RAW}" =~ ^[0-9]+$ ]]; then
  TAB_COUNT="${TAB_COUNT_RAW}"
fi

COOLDOWN_SECONDS=900
if [[ "${COOLDOWN_SECONDS_RAW}" =~ ^[0-9]+$ ]]; then
  COOLDOWN_SECONDS="${COOLDOWN_SECONDS_RAW}"
fi

LOCK_FILE="${XDG_RUNTIME_DIR:-/tmp}/sentinel-captive-portal-recover.lock"
STATE_FILE="${XDG_RUNTIME_DIR:-/tmp}/sentinel-captive-portal-recover.last"

wifi_connected() {
  if ! command -v nmcli >/dev/null 2>&1; then
    warn "nmcli is unavailable; assuming recovery preconditions are met."
    return 0
  fi

  nmcli -t -f TYPE,STATE device status 2>/dev/null | grep -q '^wifi:connected$'
}

check_url() {
  local target="${1:-}"
  [[ -n "${target}" ]] || return 0
  curl -fsSL --max-time 10 --output /dev/null "${target}"
}

check_target() {
  local target="${1:-}"
  [[ -n "${target}" ]] || return 0

  case "${target}" in
    http://*|https://*)
      check_url "${target}"
      ;;
    *)
      ping -c 1 -W 3 "${target}" >/dev/null 2>&1
      ;;
  esac
}

needs_recovery() {
  if ! wifi_connected; then
    log "Wi-Fi is not connected; skipping captive portal recovery."
    return 1
  fi

  if ! check_url "${CHECK_URL}"; then
    log "Internet reachability check failed; captive portal recovery is required."
    return 0
  fi

  if [[ -n "${TAILSCALE_TARGET}" ]] && ! check_target "${TAILSCALE_TARGET}"; then
    log "Tailscale reachability check failed for ${TAILSCALE_TARGET}; captive portal recovery is required."
    return 0
  fi

  return 1
}

run_recovery() {
  local now last_run index

  if [[ -z "${DISPLAY:-}" ]]; then
    warn "DISPLAY is not set; captive portal recovery requires an active desktop session."
    return 1
  fi

  if ! command -v xdg-open >/dev/null 2>&1; then
    warn "xdg-open is unavailable; cannot launch captive portal."
    return 1
  fi

  if ! command -v xdotool >/dev/null 2>&1; then
    warn "xdotool is unavailable; cannot drive the captive portal checkbox flow."
    return 1
  fi

  exec 9>"${LOCK_FILE}"
  if ! flock -n 9; then
    log "Captive portal recovery is already running."
    return 0
  fi

  now="$(date +%s)"
  last_run=0
  if [[ -f "${STATE_FILE}" ]]; then
    last_run="$(cat "${STATE_FILE}" 2>/dev/null || printf '0')"
  fi

  if [[ "${FORCE}" != "true" ]] && [[ "${last_run}" =~ ^[0-9]+$ ]] && (( now - last_run < COOLDOWN_SECONDS )); then
    log "Captive portal recovery cooldown is still active; skipping duplicate launch."
    return 0
  fi

  printf '%s\n' "${now}" >"${STATE_FILE}"

  log "Launching captive portal helper at ${PORTAL_URL}"
  xdg-open "${PORTAL_URL}" >/dev/null 2>&1 &
  sleep "${DELAY_SECONDS}"

  for ((index = 0; index < TAB_COUNT; index += 1)); do
    xdotool key Tab
    sleep 0.2
  done
  xdotool key space
  sleep 0.2
  xdotool key Return

  log "Captive portal recovery key sequence sent."
}

if [[ "${ENABLED}" != "true" ]]; then
  log "Captive portal recovery helper is disabled."
  exit 0
fi

case "${MODE}" in
  check)
    if needs_recovery; then
      exit 10
    fi
    exit 0
    ;;
  run)
    if [[ "${FORCE}" == "true" ]] || needs_recovery; then
      run_recovery
    fi
    ;;
  check-and-recover)
    if [[ "${FORCE}" == "true" ]] || needs_recovery; then
      run_recovery
    fi
    ;;
  *)
    die "Unknown mode: ${MODE}"
    ;;
esac
