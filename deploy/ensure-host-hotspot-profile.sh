#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/_common.sh"

HOTSPOT_CONFIG_CONNECTION_NAME=""
HOTSPOT_CONFIG_SSID=""
HOTSPOT_CONFIG_PSK=""
HOTSPOT_CONFIG_BAND=""
HOTSPOT_CONFIG_CHANNEL=""
HOTSPOT_CONFIG_MANIFEST_PATH=""

HOTSPOT_STATE_ISSUE_CODE="none"
HOTSPOT_STATE_MESSAGE=""
HOTSPOT_STATE_PROFILE_PRESENT="false"
HOTSPOT_STATE_HOTSPOT_ADAPTER_APPROVED="false"
HOTSPOT_STATE_SCAN_ADAPTER_PRESENT="false"
HOTSPOT_STATE_HOTSPOT_DEVICE=""
HOTSPOT_STATE_HOTSPOT_SCAN_DEVICE=""
HOTSPOT_STATE_HOTSPOT_SSID=""
HOTSPOT_STATE_HOTSPOT_VISIBILITY="null"
HOTSPOT_STATE_APPROVED_ADAPTER_COUNT="0"
HOTSPOT_STATE_ENV_PSK_CONFIGURED="false"

hotspot_log() {
  printf '[host-hotspot-profile] %s\n' "$*"
}

hotspot_warn() {
  printf '[host-hotspot-profile] %s\n' "$*" >&2
}

hotspot_refresh_config() {
  HOTSPOT_CONFIG_CONNECTION_NAME="${HOTSPOT_CONNECTION_NAME_OVERRIDE:-$(env_value HOTSPOT_CONNECTION_NAME 'Sentinel Hotspot')}"
  HOTSPOT_CONFIG_SSID="${HOTSPOT_SSID_OVERRIDE:-$(env_value HOTSPOT_SSID 'Stone Frigate')}"
  HOTSPOT_CONFIG_PSK="${HOTSPOT_PSK_OVERRIDE:-$(env_value HOTSPOT_PSK '')}"
  HOTSPOT_CONFIG_BAND="${HOTSPOT_BAND_OVERRIDE:-$(env_value HOTSPOT_BAND 'bg')}"
  HOTSPOT_CONFIG_CHANNEL="${HOTSPOT_CHANNEL_OVERRIDE:-$(env_value HOTSPOT_CHANNEL '1')}"
  HOTSPOT_CONFIG_MANIFEST_PATH="${HOTSPOT_APPROVED_DONGLES_FILE_OVERRIDE:-$(env_value HOTSPOT_APPROVED_DONGLES_FILE "${SCRIPT_DIR}/hardware/approved-hotspot-dongles.json")}"

  if [[ "${HOTSPOT_CONFIG_MANIFEST_PATH}" != /* ]]; then
    HOTSPOT_CONFIG_MANIFEST_PATH="${SCRIPT_DIR}/${HOTSPOT_CONFIG_MANIFEST_PATH}"
  fi
}

hotspot_json_string_or_null() {
  local value="${1:-}"
  if [[ -z "${value}" ]]; then
    printf 'null'
    return 0
  fi

  printf '"%s"' "$(json_escape "${value}")"
}

hotspot_have_command() {
  command -v "$1" >/dev/null 2>&1
}

hotspot_connection_exists() {
  nmcli -t -f NAME connection show 2>/dev/null | grep -Fxq "${HOTSPOT_CONFIG_CONNECTION_NAME}"
}

hotspot_connection_type() {
  nmcli -g connection.type connection show "${HOTSPOT_CONFIG_CONNECTION_NAME}" 2>/dev/null | head -n1
}

hotspot_connection_device() {
  local active_device configured_device

  active_device="$(
    nmcli -t -f NAME,TYPE,DEVICE connection show --active 2>/dev/null |
      awk -F: -v conn="${HOTSPOT_CONFIG_CONNECTION_NAME}" '$1 == conn && ($2 == "wifi" || $2 == "802-11-wireless") { print $3; exit }'
  )"
  if [[ -n "${active_device}" ]]; then
    printf '%s\n' "${active_device}"
    return 0
  fi

  configured_device="$(
    nmcli -g connection.interface-name connection show "${HOTSPOT_CONFIG_CONNECTION_NAME}" 2>/dev/null |
      head -n1
  )"
  if [[ -n "${configured_device}" ]]; then
    printf '%s\n' "${configured_device}"
  fi
}

hotspot_connection_ssid() {
  local configured_ssid
  configured_ssid="$(
    nmcli -g 802-11-wireless.ssid connection show "${HOTSPOT_CONFIG_CONNECTION_NAME}" 2>/dev/null |
      head -n1
  )"
  if [[ -n "${configured_ssid}" ]]; then
    printf '%s\n' "${configured_ssid}"
    return 0
  fi

  printf '%s\n' "${HOTSPOT_CONFIG_SSID}"
}

hotspot_device_property() {
  local device="${1:-}" key="${2:-}"
  [[ -n "${device}" && -n "${key}" ]] || return 1
  [[ -e "/sys/class/net/${device}" ]] || return 1
  hotspot_have_command udevadm || return 1

  udevadm info --query=property --path="/sys/class/net/${device}" 2>/dev/null |
    awk -F= -v wanted="${key}" '$1 == wanted { print substr($0, index($0, $2)); exit }'
}

hotspot_device_bus() {
  hotspot_device_property "${1:-}" ID_BUS
}

hotspot_device_driver() {
  local driver
  driver="$(hotspot_device_property "${1:-}" ID_USB_DRIVER || true)"
  if [[ -n "${driver}" ]]; then
    printf '%s\n' "${driver}"
    return 0
  fi

  hotspot_device_property "${1:-}" ID_NET_DRIVER || true
}

hotspot_device_vid_pid() {
  local device="${1:-}" vendor_id product_id
  vendor_id="$(hotspot_device_property "${device}" ID_VENDOR_ID || true)"
  product_id="$(hotspot_device_property "${device}" ID_MODEL_ID || true)"
  if [[ -z "${vendor_id}" || -z "${product_id}" ]]; then
    return 1
  fi

  printf '%s:%s\n' "${vendor_id,,}" "${product_id,,}"
}

hotspot_device_label() {
  local device="${1:-}" vendor model
  vendor="$(hotspot_device_property "${device}" ID_VENDOR_FROM_DATABASE || true)"
  if [[ -z "${vendor}" ]]; then
    vendor="$(hotspot_device_property "${device}" ID_VENDOR || true)"
  fi

  model="$(hotspot_device_property "${device}" ID_MODEL_FROM_DATABASE || true)"
  if [[ -z "${model}" ]]; then
    model="$(hotspot_device_property "${device}" ID_USB_MODEL || true)"
  fi
  if [[ -z "${model}" ]]; then
    model="$(hotspot_device_property "${device}" ID_MODEL || true)"
  fi

  if [[ -n "${vendor}" && -n "${model}" ]]; then
    printf '%s %s\n' "${vendor}" "${model}"
    return 0
  fi
  if [[ -n "${vendor}" ]]; then
    printf '%s\n' "${vendor}"
    return 0
  fi
  if [[ -n "${model}" ]]; then
    printf '%s\n' "${model}"
    return 0
  fi

  printf '%s\n' "${device}"
}

hotspot_manifest_exists() {
  [[ -f "${HOTSPOT_CONFIG_MANIFEST_PATH}" ]]
}

hotspot_adapter_matches_manifest() {
  local device="${1:-}" vid_pid driver vendor_id product_id
  [[ -n "${device}" ]] || return 1
  hotspot_manifest_exists || return 1
  hotspot_have_command python3 || return 1

  vid_pid="$(hotspot_device_vid_pid "${device}" || true)"
  [[ -n "${vid_pid}" ]] || return 1
  vendor_id="${vid_pid%%:*}"
  product_id="${vid_pid##*:}"
  driver="$(hotspot_device_driver "${device}" || true)"

  python3 - "${HOTSPOT_CONFIG_MANIFEST_PATH}" "${vendor_id}" "${product_id}" "${driver,,}" <<'PY'
import json
import sys
from pathlib import Path

manifest_path = Path(sys.argv[1])
vendor_id = sys.argv[2].lower()
product_id = sys.argv[3].lower()
driver = sys.argv[4].lower()

try:
    payload = json.loads(manifest_path.read_text(encoding="utf-8"))
except Exception:
    raise SystemExit(1)

entries = payload.get("dongles", []) if isinstance(payload, dict) else payload
if not isinstance(entries, list):
    raise SystemExit(1)

for entry in entries:
    if not isinstance(entry, dict):
        continue
    entry_vendor = str(entry.get("vendorId", "")).lower()
    entry_product = str(entry.get("productId", "")).lower()
    entry_driver = str(entry.get("driver", "")).lower()
    if entry_vendor != vendor_id or entry_product != product_id:
        continue
    if entry_driver and entry_driver != driver:
        continue
    raise SystemExit(0)

raise SystemExit(1)
PY
}

hotspot_wifi_devices() {
  nmcli -t -f DEVICE,TYPE device status 2>/dev/null |
    awk -F: '$2 == "wifi" { print $1 }'
}

hotspot_find_approved_adapters() {
  local device
  while IFS= read -r device; do
    [[ -n "${device}" ]] || continue
    if [[ "$(hotspot_device_bus "${device}" || true)" != "usb" ]]; then
      continue
    fi
    if hotspot_adapter_matches_manifest "${device}"; then
      printf '%s\n' "${device}"
    fi
  done < <(hotspot_wifi_devices)
}

hotspot_pick_scan_device() {
  local hotspot_device="${1:-}" preferred_device fallback_device line device type state
  [[ -n "${hotspot_device}" ]] || return 0

  while IFS= read -r line; do
    [[ -n "${line}" ]] || continue
    IFS=':' read -r device type state <<<"${line}"
    if [[ "${type}" == "wifi" && "${device}" != "${hotspot_device}" && "${state}" == "connected" ]]; then
      preferred_device="${device}"
      break
    fi
  done < <(nmcli -t -f DEVICE,TYPE,STATE device status 2>/dev/null || true)

  if [[ -n "${preferred_device}" ]]; then
    printf '%s\n' "${preferred_device}"
    return 0
  fi

  while IFS= read -r line; do
    [[ -n "${line}" ]] || continue
    IFS=':' read -r device type _ <<<"${line}"
    if [[ "${type}" == "wifi" && "${device}" != "${hotspot_device}" ]]; then
      fallback_device="${device}"
      break
    fi
  done < <(nmcli -t -f DEVICE,TYPE,STATE device status 2>/dev/null || true)

  if [[ -n "${fallback_device}" ]]; then
    printf '%s\n' "${fallback_device}"
  fi
}

hotspot_is_ssid_visible_on_device() {
  local scan_device="${1:-}" ssid="${2:-}"
  [[ -n "${scan_device}" && -n "${ssid}" ]] || return 2

  if nmcli -t -f SSID,CHAN,SECURITY device wifi list ifname "${scan_device}" 2>/dev/null |
    awk -F: -v wanted="${ssid}" '$1 == wanted { found = 1 } END { exit found ? 0 : 1 }'; then
    return 0
  fi

  nmcli device wifi rescan ifname "${scan_device}" >/dev/null 2>&1 || true
  nmcli -t -f SSID,CHAN,SECURITY device wifi list ifname "${scan_device}" 2>/dev/null |
    awk -F: -v wanted="${ssid}" '$1 == wanted { found = 1 } END { exit found ? 0 : 1 }'
}

hotspot_has_configured_psk() {
  hotspot_refresh_config
  if is_placeholder_env_value "${HOTSPOT_CONFIG_PSK}"; then
    return 1
  fi
  return 0
}

hotspot_reset_state() {
  HOTSPOT_STATE_ISSUE_CODE="none"
  HOTSPOT_STATE_MESSAGE="Hotspot profile and adapters are ready."
  HOTSPOT_STATE_PROFILE_PRESENT="false"
  HOTSPOT_STATE_HOTSPOT_ADAPTER_APPROVED="false"
  HOTSPOT_STATE_SCAN_ADAPTER_PRESENT="false"
  HOTSPOT_STATE_HOTSPOT_DEVICE=""
  HOTSPOT_STATE_HOTSPOT_SCAN_DEVICE=""
  HOTSPOT_STATE_HOTSPOT_SSID="${HOTSPOT_CONFIG_SSID}"
  HOTSPOT_STATE_HOTSPOT_VISIBILITY="null"
  HOTSPOT_STATE_APPROVED_ADAPTER_COUNT="0"
  HOTSPOT_STATE_ENV_PSK_CONFIGURED="false"
}

hotspot_collect_runtime_state() {
  local profile_device profile_ssid approved_devices approved_count visibility_rc

  hotspot_refresh_config
  hotspot_reset_state

  if ! hotspot_have_command nmcli; then
    HOTSPOT_STATE_ISSUE_CODE="hotspot_profile_missing"
    HOTSPOT_STATE_MESSAGE="NetworkManager is unavailable on this host."
    return 0
  fi

  if hotspot_connection_exists; then
    HOTSPOT_STATE_PROFILE_PRESENT="true"
  fi

  profile_device="$(hotspot_connection_device || true)"
  profile_ssid="$(hotspot_connection_ssid || true)"
  if [[ -n "${profile_ssid}" ]]; then
    HOTSPOT_STATE_HOTSPOT_SSID="${profile_ssid}"
  fi

  mapfile -t approved_devices < <(hotspot_find_approved_adapters)
  approved_count="${#approved_devices[@]}"
  HOTSPOT_STATE_APPROVED_ADAPTER_COUNT="${approved_count}"

  if hotspot_has_configured_psk; then
    HOTSPOT_STATE_ENV_PSK_CONFIGURED="true"
  fi

  if (( approved_count == 1 )); then
    HOTSPOT_STATE_HOTSPOT_ADAPTER_APPROVED="true"
    HOTSPOT_STATE_HOTSPOT_DEVICE="${approved_devices[0]}"
  elif [[ -n "${profile_device}" ]]; then
    HOTSPOT_STATE_HOTSPOT_DEVICE="${profile_device}"
  fi

  HOTSPOT_STATE_HOTSPOT_SCAN_DEVICE="$(hotspot_pick_scan_device "${HOTSPOT_STATE_HOTSPOT_DEVICE}")"
  if [[ -n "${HOTSPOT_STATE_HOTSPOT_SCAN_DEVICE}" ]]; then
    HOTSPOT_STATE_SCAN_ADAPTER_PRESENT="true"
  fi

  if hotspot_is_ssid_visible_on_device "${HOTSPOT_STATE_HOTSPOT_SCAN_DEVICE}" "${HOTSPOT_STATE_HOTSPOT_SSID}"; then
    HOTSPOT_STATE_HOTSPOT_VISIBILITY="true"
  else
    visibility_rc=$?
    if [[ "${visibility_rc}" -eq 1 ]]; then
      HOTSPOT_STATE_HOTSPOT_VISIBILITY="false"
    fi
  fi

  if ! hotspot_manifest_exists; then
    HOTSPOT_STATE_ISSUE_CODE="approved_hotspot_adapter_missing"
    HOTSPOT_STATE_MESSAGE="Approved hotspot hardware manifest is missing."
    return 0
  fi

  if (( approved_count == 0 )); then
    HOTSPOT_STATE_ISSUE_CODE="approved_hotspot_adapter_missing"
    if [[ -n "${profile_device}" ]]; then
      HOTSPOT_STATE_MESSAGE="No approved hotspot dongle is detected. The current profile is bound to ${profile_device}."
    else
      HOTSPOT_STATE_MESSAGE="No approved hotspot dongle is detected on this laptop."
    fi
    return 0
  fi

  if (( approved_count > 1 )); then
    HOTSPOT_STATE_ISSUE_CODE="approved_hotspot_adapter_missing"
    HOTSPOT_STATE_MESSAGE="Multiple approved hotspot dongles are connected. Unplug extras and retry."
    return 0
  fi

  if [[ "${HOTSPOT_STATE_PROFILE_PRESENT}" != "true" ]]; then
    HOTSPOT_STATE_ISSUE_CODE="hotspot_profile_missing"
    if [[ "${HOTSPOT_STATE_ENV_PSK_CONFIGURED}" != "true" ]]; then
      HOTSPOT_STATE_MESSAGE="The hotspot password is not configured, so Sentinel cannot create the hosted profile automatically."
    else
      HOTSPOT_STATE_MESSAGE="The managed Sentinel hotspot profile is missing."
    fi
    return 0
  fi

  if [[ "${HOTSPOT_STATE_SCAN_ADAPTER_PRESENT}" != "true" ]]; then
    HOTSPOT_STATE_ISSUE_CODE="scan_adapter_missing"
    HOTSPOT_STATE_MESSAGE="A second Wi-Fi radio is unavailable for hotspot verification."
    return 0
  fi

  if [[ "${HOTSPOT_STATE_HOTSPOT_VISIBILITY}" == "false" ]]; then
    HOTSPOT_STATE_ISSUE_CODE="hotspot_not_visible"
    HOTSPOT_STATE_MESSAGE="Hotspot SSID \"${HOTSPOT_STATE_HOTSPOT_SSID}\" is not visible from ${HOTSPOT_STATE_HOTSPOT_SCAN_DEVICE}."
    return 0
  fi

  HOTSPOT_STATE_ISSUE_CODE="none"
  HOTSPOT_STATE_MESSAGE="Hotspot profile and adapters are ready."
}

hotspot_state_exit_code() {
  case "${HOTSPOT_STATE_ISSUE_CODE}" in
    none)
      return 0
      ;;
    scan_adapter_missing|hotspot_not_visible)
      return 2
      ;;
    *)
      return 1
      ;;
  esac
}

emit_hotspot_state_json() {
  cat <<JSON
{
  "issueCode": "$(json_escape "${HOTSPOT_STATE_ISSUE_CODE}")",
  "message": "$(json_escape "${HOTSPOT_STATE_MESSAGE}")",
  "hotspotProfilePresent": $(json_bool "${HOTSPOT_STATE_PROFILE_PRESENT}"),
  "hotspotAdapterApproved": $(json_bool "${HOTSPOT_STATE_HOTSPOT_ADAPTER_APPROVED}"),
  "scanAdapterPresent": $(json_bool "${HOTSPOT_STATE_SCAN_ADAPTER_PRESENT}"),
  "hotspotDevice": $(hotspot_json_string_or_null "${HOTSPOT_STATE_HOTSPOT_DEVICE}"),
  "scanDevice": $(hotspot_json_string_or_null "${HOTSPOT_STATE_HOTSPOT_SCAN_DEVICE}"),
  "hotspotSsid": $(hotspot_json_string_or_null "${HOTSPOT_STATE_HOTSPOT_SSID}"),
  "hotspotVisibility": ${HOTSPOT_STATE_HOTSPOT_VISIBILITY},
  "approvedAdapterCount": ${HOTSPOT_STATE_APPROVED_ADAPTER_COUNT},
  "hotspotPskConfigured": $(json_bool "${HOTSPOT_STATE_ENV_PSK_CONFIGURED}")
}
JSON
}

recreate_hotspot_profile_if_needed() {
  local device="${1:-}" profile_type
  [[ -n "${device}" ]] || return 1

  if hotspot_connection_exists; then
    profile_type="$(hotspot_connection_type || true)"
    if [[ "${profile_type}" != "wifi" && "${profile_type}" != "802-11-wireless" ]]; then
      hotspot_log "Recreating non-Wi-Fi NetworkManager profile ${HOTSPOT_CONFIG_CONNECTION_NAME}"
      nmcli connection delete "${HOTSPOT_CONFIG_CONNECTION_NAME}" >/dev/null
    fi
  fi

  if ! hotspot_connection_exists; then
    hotspot_log "Creating hotspot profile ${HOTSPOT_CONFIG_CONNECTION_NAME} on ${device}"
    nmcli connection add type wifi ifname "${device}" con-name "${HOTSPOT_CONFIG_CONNECTION_NAME}" ssid "${HOTSPOT_CONFIG_SSID}" autoconnect yes >/dev/null
  fi
}

apply_hotspot_profile_settings() {
  local device="${1:-}"
  [[ -n "${device}" ]] || return 1

  hotspot_log "Applying canonical hotspot settings to ${HOTSPOT_CONFIG_CONNECTION_NAME}"
  nmcli connection modify "${HOTSPOT_CONFIG_CONNECTION_NAME}" \
    connection.interface-name "${device}" \
    connection.autoconnect yes \
    connection.autoconnect-priority 100 \
    802-11-wireless.mode ap \
    802-11-wireless.ssid "${HOTSPOT_CONFIG_SSID}" \
    802-11-wireless.band "${HOTSPOT_CONFIG_BAND}" \
    802-11-wireless.channel "${HOTSPOT_CONFIG_CHANNEL}" \
    802-11-wireless.hidden no \
    802-11-wireless.powersave 2 \
    ipv4.method shared \
    ipv6.method ignore \
    802-11-wireless-security.key-mgmt wpa-psk \
    802-11-wireless-security.psk "${HOTSPOT_CONFIG_PSK}" >/dev/null
}

ensure_host_hotspot_profile() {
  hotspot_collect_runtime_state

  if [[ "${HOTSPOT_STATE_HOTSPOT_ADAPTER_APPROVED}" != "true" ]]; then
    hotspot_warn "${HOTSPOT_STATE_MESSAGE}"
    return 1
  fi

  if [[ "${HOTSPOT_STATE_ENV_PSK_CONFIGURED}" != "true" ]]; then
    hotspot_warn "HOTSPOT_PSK is not configured; Sentinel cannot create or repair the hosted hotspot profile."
    return 1
  fi

  recreate_hotspot_profile_if_needed "${HOTSPOT_STATE_HOTSPOT_DEVICE}"
  apply_hotspot_profile_settings "${HOTSPOT_STATE_HOTSPOT_DEVICE}"

  hotspot_collect_runtime_state
  if [[ "${HOTSPOT_STATE_SCAN_ADAPTER_PRESENT}" != "true" ]]; then
    hotspot_warn "${HOTSPOT_STATE_MESSAGE}"
    return 2
  fi

  hotspot_log "Hotspot profile ${HOTSPOT_CONFIG_CONNECTION_NAME} is configured on ${HOTSPOT_STATE_HOTSPOT_DEVICE}"
  return 0
}

usage() {
  cat <<USAGE
Usage: ./ensure-host-hotspot-profile.sh [--report-json]

Options:
  --report-json   Print the detected hotspot/profile state as JSON and exit.
  -h, --help      Show this help text.
USAGE
}

main() {
  local report_json="false"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --report-json)
        report_json="true"
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        hotspot_warn "Unknown option: $1"
        usage
        exit 1
        ;;
    esac
  done

  hotspot_refresh_config

  if [[ "${report_json}" == "true" ]]; then
    hotspot_collect_runtime_state
    emit_hotspot_state_json
    hotspot_state_exit_code
    return $?
  fi

  ensure_host_hotspot_profile
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
