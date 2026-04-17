#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/_common.sh"

TARGET_SSID="${HOTSPOT_PRIMARY_SSID:-}"

urldecode() {
  local value="${1//+/ }"
  printf '%b' "${value//%/\\x}"
}

extract_query_param() {
  local uri="${1:-}" key="${2:-}"
  local query_string parameter
  query_string="${uri#*\?}"
  if [[ "${query_string}" == "${uri}" ]]; then
    return 1
  fi

  query_string="${query_string%%#*}"
  IFS='&' read -r -a parameter <<<"${query_string}"
  for item in "${parameter[@]}"; do
    if [[ "${item}" == "${key}="* ]]; then
      urldecode "${item#*=}"
      return 0
    fi
  done

  return 1
}

resolve_wifi_device() {
  nmcli -t -f DEVICE,TYPE device status 2>/dev/null | awk -F: '$2 == "wifi" { print $1; exit }'
}

resolve_connection_for_ssid() {
  local target_ssid="${1:-}"
  nmcli -t -f NAME,TYPE,802-11-wireless.ssid connection show 2>/dev/null |
    awk -F: -v ssid="${target_ssid}" '$2 == "wifi" || $2 == "802-11-wireless" { if ($3 == ssid) { print $1; exit } }'
}

current_wifi_ssid() {
  nmcli -t -f ACTIVE,SSID dev wifi 2>/dev/null | awk -F: '$1 == "yes" { print substr($0, index($0, $2)); exit }'
}

open_wifi_settings() {
  if command -v gnome-control-center >/dev/null 2>&1; then
    log "Opening GNOME Wi-Fi settings."
    gnome-control-center wifi >/dev/null 2>&1 &
    return 0
  fi

  if command -v nm-connection-editor >/dev/null 2>&1; then
    log "Opening NetworkManager connection editor."
    nm-connection-editor >/dev/null 2>&1 &
    return 0
  fi

  if command -v xdg-open >/dev/null 2>&1; then
    log "Opening generic network settings."
    xdg-open settings://network >/dev/null 2>&1 &
    return 0
  fi

  warn "No desktop network settings launcher is available."
  return 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --uri)
      shift
      if [[ $# -gt 0 ]]; then
        TARGET_SSID="$(extract_query_param "$1" "ssid" || true)"
        shift
      fi
      ;;
    *)
      TARGET_SSID="${1}"
      shift
      ;;
  esac
done

if ! command -v nmcli >/dev/null 2>&1; then
  warn "nmcli is unavailable; opening Wi-Fi settings instead."
  open_wifi_settings
  exit 0
fi

if [[ -n "${TARGET_SSID}" ]]; then
  current_ssid="$(current_wifi_ssid || true)"
  if [[ "${current_ssid}" == "${TARGET_SSID}" ]]; then
    log "Already connected to ${TARGET_SSID}."
    exit 0
  fi

  connection_name="$(resolve_connection_for_ssid "${TARGET_SSID}" || true)"
  if [[ -n "${connection_name}" ]]; then
    log "Trying saved connection ${connection_name} for SSID ${TARGET_SSID}."
    if nmcli -w 20 connection up "${connection_name}" >/dev/null 2>&1; then
      log "Connected to ${TARGET_SSID}."
      exit 0
    fi
  fi

  wifi_device="$(resolve_wifi_device || true)"
  if [[ -n "${wifi_device}" ]]; then
    log "Rescanning Wi-Fi on ${wifi_device} and trying SSID ${TARGET_SSID}."
    nmcli device wifi rescan ifname "${wifi_device}" >/dev/null 2>&1 || true
    if nmcli -w 20 device wifi connect "${TARGET_SSID}" ifname "${wifi_device}" >/dev/null 2>&1; then
      log "Connected to ${TARGET_SSID}."
      exit 0
    fi
  fi

  warn "Automatic reconnection to ${TARGET_SSID} was not successful."
else
  warn "No hotspot SSID was provided; opening Wi-Fi settings."
fi

open_wifi_settings
