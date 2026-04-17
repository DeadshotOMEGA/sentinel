#!/usr/bin/env bash

set -euo pipefail

CONNECTION_NAME="${1:-${HOTSPOT_CONNECTION_NAME:-Sentinel Hotspot}}"
SSID_WAIT_TIMEOUT="${SSID_WAIT_TIMEOUT:-20}"
SSID_POLL_INTERVAL="${SSID_POLL_INTERVAL:-2}"
HOTSPOT_BAND="${HOTSPOT_BAND:-bg}"
HOTSPOT_CHANNEL="${HOTSPOT_CHANNEL:-1}"
LOCK_FILE="${LOCK_FILE:-/run/lock/sentinel-host-hotspot-recover.lock}"

log() {
  printf '[host-hotspot-recover] %s\n' "$*"
}

die() {
  printf '[host-hotspot-recover] %s\n' "$*" >&2
  exit 1
}

have_command() {
  command -v "$1" >/dev/null 2>&1
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
  nmcli -w 15 connection down "${CONNECTION_NAME}" >/dev/null 2>&1 || true
}

start_hotspot() {
  log "Bringing hotspot connection up"
  nmcli -w 30 connection up "${CONNECTION_NAME}" >/dev/null
}

reset_driver_binding() {
  local driver_unbind="$1"
  local driver_bind="$2"
  local usb_function_name="$3"

  if [[ ! -w "${driver_unbind}" || ! -w "${driver_bind}" ]]; then
    return 1
  fi

  log "Rebinding driver function ${usb_function_name}"
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
    printf '0' >"${usb_authorized}"
    sleep 2
    printf '1' >"${usb_authorized}"
    return 0
  fi

  if [[ -w "${usb_unbind}" && -w "${usb_bind}" ]]; then
    log "Rebinding USB device ${usb_device_name}"
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
  die "Host hotspot recovery is already running"
fi

if ! nmcli -t -f NAME connection show | grep -Fxq "${CONNECTION_NAME}"; then
  die "NetworkManager connection \"${CONNECTION_NAME}\" was not found"
fi

SSID="$(nmcli -g 802-11-wireless.ssid connection show "${CONNECTION_NAME}" | head -n1)"
DEVICE="$(nmcli -g connection.interface-name connection show "${CONNECTION_NAME}" | head -n1)"
KEY_MGMT="$(nmcli -g 802-11-wireless-security.key-mgmt connection show "${CONNECTION_NAME}" | head -n1)"

if [[ -z "${DEVICE}" ]]; then
  DEVICE="$(nmcli -t -f NAME,TYPE,DEVICE connection show --active | awk -F: -v conn="${CONNECTION_NAME}" '$1 == conn && ($2 == "wifi" || $2 == "802-11-wireless") { print $3; exit }')"
fi

[[ -n "${DEVICE}" ]] || die "Could not determine the hotspot interface for \"${CONNECTION_NAME}\""
[[ -d "/sys/class/net/${DEVICE}" ]] || die "Interface ${DEVICE} is not present"

USB_FUNCTION_PATH="$(readlink -f "/sys/class/net/${DEVICE}/device")"
USB_DEVICE_PATH="$(readlink -f "/sys/class/net/${DEVICE}/device/..")"
DRIVER_PATH="$(readlink -f "/sys/class/net/${DEVICE}/device/driver")"

USB_FUNCTION_NAME="$(basename "${USB_FUNCTION_PATH}")"
USB_DEVICE_NAME="$(basename "${USB_DEVICE_PATH}")"
DRIVER_NAME="$(basename "${DRIVER_PATH}")"

DRIVER_UNBIND="/sys/bus/usb/drivers/${DRIVER_NAME}/unbind"
DRIVER_BIND="/sys/bus/usb/drivers/${DRIVER_NAME}/bind"
USB_AUTHORIZED="/sys/bus/usb/devices/${USB_DEVICE_NAME}/authorized"
USB_UNBIND="/sys/bus/usb/drivers/usb/unbind"
USB_BIND="/sys/bus/usb/drivers/usb/bind"

SCAN_DEVICE="$(nmcli -t -f DEVICE,TYPE device status | awk -F: -v dev="${DEVICE}" '$2 == "wifi" && $1 != dev { print $1; exit }')"

log "Connection: ${CONNECTION_NAME}"
log "SSID: ${SSID:-unknown}"
log "Hotspot device: ${DEVICE}"
log "USB device: ${USB_DEVICE_NAME}"
log "Driver: ${DRIVER_NAME}"
log "Security mode: ${KEY_MGMT:-unknown}"

log "Reapplying known-good hotspot radio settings"
nmcli connection modify "${CONNECTION_NAME}" \
  802-11-wireless.band "${HOTSPOT_BAND}" \
  802-11-wireless.channel "${HOTSPOT_CHANNEL}" \
  802-11-wireless.powersave 2

if [[ "${KEY_MGMT}" == "sae" ]]; then
  log "WPA3-only (sae) is less reliable on some adapters; mixed WPA2/WPA3 may recover more reliably."
fi

stop_hotspot

if ! reset_driver_binding "${DRIVER_UNBIND}" "${DRIVER_BIND}" "${USB_FUNCTION_NAME}"; then
  log "Driver rebind path was not available; falling back to a USB reset"
  reset_usb_device "${USB_AUTHORIZED}" "${USB_UNBIND}" "${USB_BIND}" "${USB_DEVICE_NAME}" ||
    die "Could not reset ${USB_DEVICE_NAME}"
fi

if have_command udevadm; then
  udevadm settle || true
fi

wait_for_path "/sys/class/net/${DEVICE}" 20 || die "Interface ${DEVICE} did not come back after reset"

start_hotspot

if have_command iw; then
  iw dev "${DEVICE}" set power_save off >/dev/null 2>&1 || true
fi

if have_command iwconfig; then
  iwconfig "${DEVICE}" power off >/dev/null 2>&1 || true
fi

if [[ -n "${SCAN_DEVICE}" && -n "${SSID}" ]]; then
  log "Waiting up to ${SSID_WAIT_TIMEOUT}s for ${SSID} to appear on ${SCAN_DEVICE}"
  if wait_for_ssid "${SCAN_DEVICE}" "${SSID}" "${SSID_WAIT_TIMEOUT}" "${SSID_POLL_INTERVAL}"; then
    log "The SSID ${SSID} is visible from ${SCAN_DEVICE}"
  else
    log "The hotspot restarted, but ${SCAN_DEVICE} still cannot see ${SSID} after ${SSID_WAIT_TIMEOUT}s"
    exit 2
  fi
fi

log "Host hotspot recovery complete"
