#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/ensure-host-hotspot-profile.sh"

CONNECTION_NAME="${1:-$(env_value HOTSPOT_CONNECTION_NAME 'Sentinel Hotspot')}"
REQUEST_ID="${2:-}"
SSID_WAIT_TIMEOUT="${SSID_WAIT_TIMEOUT:-45}"
SSID_POLL_INTERVAL="${SSID_POLL_INTERVAL:-2}"
HOTSPOT_BAND="$(env_value HOTSPOT_BAND 'bg')"
HOTSPOT_CHANNEL="$(env_value HOTSPOT_CHANNEL '1')"
LOCK_FILE="${LOCK_FILE:-/run/lock/sentinel-host-hotspot-recover.lock}"
STATUS_FILE="${HOST_HOTSPOT_RECOVERY_STATUS_FILE:-${SCRIPT_DIR}/runtime/hotspot-recovery/status.json}"
HISTORY_FILE="${HOST_HOTSPOT_RECOVERY_HISTORY_FILE:-${SCRIPT_DIR}/runtime/hotspot-recovery/history.jsonl}"
RECOVERY_SOURCE="${HOST_HOTSPOT_RECOVERY_SOURCE:-unknown}"
export HOTSPOT_CONNECTION_NAME_OVERRIDE="${CONNECTION_NAME}"

STARTED_AT="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
DEVICE=""
SSID=""
SCAN_DEVICE=""
USB_DEVICE_NAME=""
hardware_reset_applied="false"

log() {
  printf '[host-hotspot-recover] %s\n' "$*"
}

die() {
  recovery_write_status "failed" "failed" "$*" "true" || true
  printf '[host-hotspot-recover] %s\n' "$*" >&2
  exit 1
}

json_string_or_null() {
  local value="${1:-}"
  if [[ -z "${value}" ]]; then
    printf 'null'
    return 0
  fi

  printf '"%s"' "$(json_escape "${value}")"
}

recovery_duration_seconds() {
  local completed_at="${1:-}" start_epoch completed_epoch
  [[ -n "${completed_at}" ]] || return 0

  start_epoch="$(date -u -d "${STARTED_AT}" +%s 2>/dev/null || true)"
  completed_epoch="$(date -u -d "${completed_at}" +%s 2>/dev/null || true)"
  if [[ -z "${start_epoch}" || -z "${completed_epoch}" ]]; then
    return 0
  fi

  printf '%s\n' "$((completed_epoch - start_epoch))"
}

recovery_append_history() {
  local state="${1:-}" stage="${2:-}" message="${3:-}" completed_at="${4:-}" duration_seconds="${5:-}" tmp_file
  [[ "${stage}" == "completed" || "${stage}" == "failed" ]] || return 0

  mkdir -p "$(dirname "${HISTORY_FILE}")" >/dev/null 2>&1 || return 0
  tmp_file="$(mktemp "$(dirname "${HISTORY_FILE}")/history.XXXXXX" 2>/dev/null)" || return 0

  cat >"${tmp_file}" <<JSON
{"state":"$(json_escape "${state}")","stage":"$(json_escape "${stage}")","message":"$(json_escape "${message}")","requestId":$(json_string_or_null "${REQUEST_ID}"),"source":"$(json_escape "${RECOVERY_SOURCE}")","startedAt":"$(json_escape "${STARTED_AT}")","completedAt":$(json_string_or_null "${completed_at}"),"durationSeconds":$(json_string_or_null "${duration_seconds}")}
JSON
  cat "${tmp_file}" >>"${HISTORY_FILE}" 2>/dev/null || true
  rm -f "${tmp_file}"
  chmod 664 "${HISTORY_FILE}" >/dev/null 2>&1 || true
}

recovery_write_status() {
  local state="$1"
  local stage="$2"
  local message="$3"
  local completed="${4:-false}"
  local updated_at completed_at duration_seconds tmp_file had_errexit

  updated_at="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  if [[ "${completed}" == "true" ]]; then
    completed_at="${updated_at}"
    duration_seconds="$(recovery_duration_seconds "${completed_at}" || true)"
  else
    completed_at=""
    duration_seconds=""
  fi

  had_errexit="false"
  case "$-" in
    *e*)
      had_errexit="true"
      set +e
      ;;
  esac

  mkdir -p "$(dirname "${STATUS_FILE}")" >/dev/null 2>&1
  tmp_file="$(mktemp "$(dirname "${STATUS_FILE}")/status.XXXXXX" 2>/dev/null)"
  if [[ -z "${tmp_file}" ]]; then
    if [[ "${had_errexit}" == "true" ]]; then
      set -e
    fi
    return 0
  fi

  cat >"${tmp_file}" <<JSON
{
  "state": "$(json_escape "${state}")",
  "stage": "$(json_escape "${stage}")",
  "message": "$(json_escape "${message}")",
  "requestId": $(json_string_or_null "${REQUEST_ID}"),
  "source": $(json_string_or_null "${RECOVERY_SOURCE}"),
  "connectionName": $(json_string_or_null "${CONNECTION_NAME}"),
  "hotspotSsid": $(json_string_or_null "${SSID:-}"),
  "hotspotDevice": $(json_string_or_null "${DEVICE:-}"),
  "scanDevice": $(json_string_or_null "${SCAN_DEVICE:-}"),
  "usbDevice": $(json_string_or_null "${USB_DEVICE_NAME:-}"),
  "hardwareResetApplied": $(json_bool "${hardware_reset_applied:-false}"),
  "startedAt": "$(json_escape "${STARTED_AT}")",
  "updatedAt": "$(json_escape "${updated_at}")",
  "completedAt": $(json_string_or_null "${completed_at}"),
  "durationSeconds": $(json_string_or_null "${duration_seconds}")
}
JSON
  chmod 664 "${tmp_file}" >/dev/null 2>&1 || true
  mv "${tmp_file}" "${STATUS_FILE}" >/dev/null 2>&1 || rm -f "${tmp_file}" >/dev/null 2>&1 || true
  recovery_append_history "${state}" "${stage}" "${message}" "${completed_at}" "${duration_seconds}"

  if [[ "${had_errexit}" == "true" ]]; then
    set -e
  fi
  return 0
}

have_command() {
  command -v "$1" >/dev/null 2>&1
}

safe_readlink_path() {
  local path="${1:-}"
  [[ -n "${path}" ]] || return 0
  readlink -f "${path}" 2>/dev/null || true
}

wait_for_path() {
  local path="$1"
  local timeout="${2:-20}"
  local end=$((SECONDS + timeout))

  while (( SECONDS < end )); do
    if [[ -e "${path}" ]]; then
      return 0
    fi
    sleep 1
  done

  return 1
}

wait_for_nm_device() {
  local device="$1"
  local timeout="${2:-20}"
  local end=$((SECONDS + timeout))

  while (( SECONDS < end )); do
    if nmcli -t -f DEVICE device status | grep -Fxq "${device}"; then
      return 0
    fi
    sleep 1
  done

  return 1
}

wait_for_ssid() {
  local scan_device="$1"
  local ssid="$2"
  local timeout="${3:-20}"
  local interval="${4:-2}"
  local end=$((SECONDS + timeout))

  while (( SECONDS < end )); do
    if nmcli -t -f SSID,CHAN,SECURITY device wifi list ifname "${scan_device}" | awk -F: -v ssid="${ssid}" '$1 == ssid { found = 1 } END { exit found ? 0 : 1 }'; then
      return 0
    fi

    log "SSID ${ssid} is not visible on ${scan_device} yet; rescanning"
    nmcli device wifi rescan ifname "${scan_device}" >/dev/null 2>&1 || true
    sleep "${interval}"
  done

  return 1
}

stop_hotspot() {
  log "Bringing hotspot connection down"
  recovery_write_status "running" "stopping_hotspot" "Stopping the hotspot before resetting the USB AP dongle."
  nmcli -w 15 connection down "${CONNECTION_NAME}" >/dev/null 2>&1 || true
}

start_hotspot() {
  local device="${1:-}"

  if [[ -n "${device}" ]]; then
    log "Bringing hotspot connection up on ${device}"
    nmcli -w 30 connection up "${CONNECTION_NAME}" ifname "${device}" >/dev/null
    return 0
  fi

  log "Bringing hotspot connection up"
  nmcli -w 30 connection up "${CONNECTION_NAME}" >/dev/null
}

connection_interface_name() {
  local connection_name="${1:-}"
  [[ -n "${connection_name}" ]] || return 0

  nmcli -g connection.interface-name connection show "${connection_name}" 2>/dev/null |
    head -n1
}

restore_connection_interface_name() {
  local connection_name="${1:-}" original_interface="${2:-}"
  [[ -n "${connection_name}" ]] || return 0

  if [[ -n "${original_interface}" ]]; then
    nmcli connection modify "${connection_name}" connection.interface-name "${original_interface}" >/dev/null 2>&1 || true
    return 0
  fi

  nmcli connection modify "${connection_name}" connection.interface-name "" >/dev/null 2>&1 || true
}

move_client_wifi_off_hotspot_adapter() {
  local hotspot_device scan_device client_connection client_ssid original_interface

  hotspot_collect_runtime_state
  if [[ "${HOTSPOT_STATE_HOTSPOT_ADAPTER_BUSY}" != "true" ]]; then
    return 0
  fi

  hotspot_device="${HOTSPOT_STATE_HOTSPOT_DEVICE:-}"
  scan_device="${HOTSPOT_STATE_HOTSPOT_SCAN_DEVICE:-}"
  client_connection="${HOTSPOT_STATE_INTERNET_WIFI_CONNECTION:-}"
  client_ssid="${HOTSPOT_STATE_INTERNET_WIFI_SSID:-internet Wi-Fi}"

  [[ -n "${hotspot_device}" ]] || die "The approved AP dongle is busy, but Sentinel could not identify its interface."
  [[ -n "${client_connection}" ]] || die "The approved AP dongle is busy, but Sentinel could not identify the active Wi-Fi profile."

  if [[ -z "${scan_device}" ]]; then
    scan_device="$(hotspot_pick_scan_device "${hotspot_device}")"
  fi

  [[ -n "${scan_device}" ]] || die "The AP dongle is connected to ${client_ssid}, and no scan radio is available to take over internet Wi-Fi."
  [[ -d "/sys/class/net/${scan_device}" ]] || die "Scan radio ${scan_device} is not present."

  original_interface="$(connection_interface_name "${client_connection}" || true)"

  log "Moving internet Wi-Fi profile ${client_connection} (${client_ssid}) from AP dongle ${hotspot_device} to scan radio ${scan_device}"
  recovery_write_status "running" "moving_internet_wifi" "Moving internet Wi-Fi off the USB AP dongle so the dongle can host the Sentinel hotspot."
  nmcli connection modify "${client_connection}" \
    connection.interface-name "${scan_device}" \
    connection.autoconnect yes \
    connection.autoconnect-priority 50 >/dev/null ||
    die "Failed to update Wi-Fi profile ${client_connection} for scan radio ${scan_device}"

  nmcli -w 15 connection down "${client_connection}" >/dev/null 2>&1 || true

  if nmcli -w 45 connection up "${client_connection}" ifname "${scan_device}" >/dev/null; then
    log "Internet Wi-Fi profile ${client_connection} is now using ${scan_device}"
    return 0
  fi

  restore_connection_interface_name "${client_connection}" "${original_interface}"
  die "Failed to reconnect ${client_connection} on scan radio ${scan_device}; hotspot repair stopped before taking over the AP dongle."
}

reset_driver_binding() {
  local driver_unbind="$1"
  local driver_bind="$2"
  local usb_function_name="$3"

  if [[ ! -w "${driver_unbind}" || ! -w "${driver_bind}" ]]; then
    return 1
  fi

  log "Rebinding driver function ${usb_function_name}"
  recovery_write_status "running" "resetting_driver" "Resetting the USB AP dongle driver. The adapter may disappear briefly."
  printf '%s' "${usb_function_name}" >"${driver_unbind}"
  sleep 2
  printf '%s' "${usb_function_name}" >"${driver_bind}"
  return 0
}

reset_usb_device() {
  local usb_authorized="$1"
  local usb_unbind="$2"
  local usb_bind="$3"
  local usb_device_name="$4"

  if [[ -w "${usb_authorized}" ]]; then
    log "Toggling USB authorization for ${usb_device_name}"
    recovery_write_status "running" "resetting_usb" "Power-cycling the USB AP dongle. The adapter may take about 10 seconds to return."
    printf '0' >"${usb_authorized}"
    sleep 2
    printf '1' >"${usb_authorized}"
    return 0
  fi

  if [[ -w "${usb_unbind}" && -w "${usb_bind}" ]]; then
    log "Rebinding USB device ${usb_device_name}"
    recovery_write_status "running" "resetting_usb" "Rebinding the USB AP dongle. The adapter may take about 10 seconds to return."
    printf '%s' "${usb_device_name}" >"${usb_unbind}"
    sleep 2
    printf '%s' "${usb_device_name}" >"${usb_bind}"
    return 0
  fi

  return 1
}

if [[ "${EUID}" -ne 0 ]]; then
  die "Please run as root: sudo bash $0 [connection-name]"
fi

have_command nmcli || die "nmcli is required"
have_command flock || die "flock is required"

mkdir -p "$(dirname "${LOCK_FILE}")"
exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
  recovery_write_status "running" "processing_request" "Host hotspot recovery is already running; reusing the active recovery attempt."
  log "Host hotspot recovery is already running; reusing the active recovery attempt"
  exit 0
fi

skip_visibility_check="false"
recovery_write_status "running" "processing_request" "Host hotspot recovery started."
move_client_wifi_off_hotspot_adapter

recovery_write_status "running" "ensuring_profile" "Checking and repairing the managed Sentinel hotspot profile."
if ensure_host_hotspot_profile; then
  :
else
  ensure_rc=$?
  if [[ "${ensure_rc}" -eq 2 ]]; then
    skip_visibility_check="true"
    log "Hotspot profile is configured, but no second Wi-Fi radio is available for visibility verification."
  else
    die "Unable to ensure the canonical hotspot profile for \"${CONNECTION_NAME}\""
  fi
fi

if ! hotspot_connection_exists; then
  die "NetworkManager connection \"${CONNECTION_NAME}\" was not found"
fi

SSID="$(hotspot_connection_ssid || true)"
DEVICE="$(hotspot_connection_device || true)"
KEY_MGMT="$(nmcli -g 802-11-wireless-security.key-mgmt connection show "${CONNECTION_NAME}" 2>/dev/null | head -n1 || true)"

if [[ -z "${DEVICE}" ]]; then
  DEVICE="${HOTSPOT_STATE_HOTSPOT_DEVICE:-}"
fi

[[ -n "${DEVICE}" ]] || die "Could not determine the hotspot interface for \"${CONNECTION_NAME}\""
[[ -d "/sys/class/net/${DEVICE}" ]] || die "Interface ${DEVICE} is not present"

USB_FUNCTION_PATH="$(safe_readlink_path "/sys/class/net/${DEVICE}/device")"
USB_DEVICE_PATH="$(safe_readlink_path "/sys/class/net/${DEVICE}/device/..")"
DRIVER_PATH="$(safe_readlink_path "/sys/class/net/${DEVICE}/device/driver")"

USB_FUNCTION_NAME=""
USB_DEVICE_NAME=""
DRIVER_NAME=""
if [[ -n "${USB_FUNCTION_PATH}" ]]; then
  USB_FUNCTION_NAME="$(basename "${USB_FUNCTION_PATH}")"
fi
if [[ -n "${USB_DEVICE_PATH}" ]]; then
  USB_DEVICE_NAME="$(basename "${USB_DEVICE_PATH}")"
fi
if [[ -n "${DRIVER_PATH}" ]]; then
  DRIVER_NAME="$(basename "${DRIVER_PATH}")"
fi

DRIVER_UNBIND=""
DRIVER_BIND=""
USB_AUTHORIZED=""
USB_UNBIND=""
USB_BIND=""
if [[ -n "${DRIVER_NAME}" ]]; then
  DRIVER_UNBIND="/sys/bus/usb/drivers/${DRIVER_NAME}/unbind"
  DRIVER_BIND="/sys/bus/usb/drivers/${DRIVER_NAME}/bind"
fi
if [[ -n "${USB_DEVICE_NAME}" ]]; then
  USB_AUTHORIZED="/sys/bus/usb/devices/${USB_DEVICE_NAME}/authorized"
  USB_UNBIND="/sys/bus/usb/drivers/usb/unbind"
  USB_BIND="/sys/bus/usb/drivers/usb/bind"
fi

SCAN_DEVICE="${HOTSPOT_STATE_HOTSPOT_SCAN_DEVICE:-}"
if [[ -z "${SCAN_DEVICE}" ]]; then
  SCAN_DEVICE="$(hotspot_pick_scan_device "${DEVICE}")"
fi

log "Connection: ${CONNECTION_NAME}"
log "SSID: ${SSID:-unknown}"
log "Hotspot device: ${DEVICE}"
log "USB device: ${USB_DEVICE_NAME:-unknown}"
log "Driver: ${DRIVER_NAME:-unknown}"
log "Security mode: ${KEY_MGMT:-unknown}"

log "Reapplying known-good hotspot radio settings"
recovery_write_status "running" "ensuring_profile" "Reapplying known-good hotspot radio settings."
nmcli connection modify "${CONNECTION_NAME}" \
  802-11-wireless.band "${HOTSPOT_BAND}" \
  802-11-wireless.channel "${HOTSPOT_CHANNEL}" \
  802-11-wireless.powersave 2 || die "Failed to reapply hotspot radio settings for ${CONNECTION_NAME}"

if [[ "${KEY_MGMT}" == "sae" ]]; then
  log "WPA3-only (sae) is less reliable on some adapters; mixed WPA2/WPA3 may recover more reliably."
fi

stop_hotspot

if [[ -n "${USB_FUNCTION_NAME}" && -n "${DRIVER_NAME}" ]] && reset_driver_binding "${DRIVER_UNBIND}" "${DRIVER_BIND}" "${USB_FUNCTION_NAME}"; then
  hardware_reset_applied="true"
elif [[ -n "${USB_DEVICE_NAME}" ]]; then
  log "Driver rebind path was not available; falling back to a USB reset"
  if reset_usb_device "${USB_AUTHORIZED}" "${USB_UNBIND}" "${USB_BIND}" "${USB_DEVICE_NAME}"; then
    hardware_reset_applied="true"
  else
    log "USB reset path was not available for ${USB_DEVICE_NAME}; continuing with a soft hotspot restart"
  fi
else
  log "USB/driver sysfs metadata is unavailable for ${DEVICE}; continuing with a soft hotspot restart"
fi

if [[ "${hardware_reset_applied}" == "true" ]] && have_command udevadm; then
  udevadm settle || true
fi

recovery_write_status "running" "waiting_for_adapter" "Waiting for the USB AP dongle to reappear after reset. This can take about 10 seconds."
wait_for_path "/sys/class/net/${DEVICE}" 20 || die "Interface ${DEVICE} did not come back after recovery"
wait_for_nm_device "${DEVICE}" 20 || die "NetworkManager did not rediscover ${DEVICE} after recovery"

recovery_write_status "running" "starting_hotspot" "Starting the Sentinel hotspot on the USB AP dongle."
if ! start_hotspot "${DEVICE}"; then
  die "Failed to bring hotspot connection ${CONNECTION_NAME} up on ${DEVICE}"
fi

if have_command iw; then
  iw dev "${DEVICE}" set power_save off >/dev/null 2>&1 || true
fi

if have_command iwconfig; then
  iwconfig "${DEVICE}" power off >/dev/null 2>&1 || true
fi

if [[ "${skip_visibility_check}" == "true" || -z "${SCAN_DEVICE}" || -z "${SSID}" ]]; then
  log "Host hotspot recovery complete without a scan-radio visibility check"
  recovery_write_status "completed" "completed" "Host hotspot recovery completed without a scan-radio visibility check." "true"
  exit 0
fi

if [[ -n "${SCAN_DEVICE}" && -n "${SSID}" ]]; then
  log "Waiting up to ${SSID_WAIT_TIMEOUT}s for ${SSID} to appear on ${SCAN_DEVICE}"
  recovery_write_status "running" "verifying_visibility" "Checking whether the scan radio can see the Sentinel hotspot."
  if wait_for_ssid "${SCAN_DEVICE}" "${SSID}" "${SSID_WAIT_TIMEOUT}" "${SSID_POLL_INTERVAL}"; then
    log "The SSID ${SSID} is visible from ${SCAN_DEVICE}"
  else
    log "The hotspot restarted, but ${SCAN_DEVICE} still cannot see ${SSID} after ${SSID_WAIT_TIMEOUT}s"
    recovery_write_status "failed" "failed" "The hotspot restarted, but the scan radio still cannot see ${SSID} after ${SSID_WAIT_TIMEOUT}s." "true"
    exit 2
  fi
fi

log "Host hotspot recovery complete"
recovery_write_status "completed" "completed" "Host hotspot recovery completed. The Sentinel hotspot is visible from the scan radio." "true"
