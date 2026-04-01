#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/_common.sh"

OUTPUT_DIR="${SCRIPT_DIR}/runtime/network-status"
OUTPUT_FILE="${OUTPUT_DIR}/network-status.json"
CHECK_URL="$(env_value CAPTIVE_PORTAL_RECOVERY_CHECK_URL https://connectivitycheck.gstatic.com/generate_204)"
REMOTE_TARGET="$(env_value CAPTIVE_PORTAL_TAILSCALE_TARGET)"

json_escape() {
  printf '%s' "${1:-}" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

json_string_or_null() {
  local value="${1:-}"
  if [[ -z "${value}" ]]; then
    printf 'null'
    return
  fi

  printf '"%s"' "$(json_escape "${value}")"
}

wifi_connected() {
  if ! command -v nmcli >/dev/null 2>&1; then
    return 2
  fi

  if nmcli -t -f TYPE,STATE device status 2>/dev/null | grep -q '^wifi:connected$'; then
    return 0
  fi

  return 1
}

current_ssid() {
  if ! command -v nmcli >/dev/null 2>&1; then
    return 0
  fi

  nmcli -t -f ACTIVE,SSID dev wifi 2>/dev/null | awk -F: '$1=="yes"{print substr($0, index($0,$2)); exit}'
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

mkdir -p "${OUTPUT_DIR}"

generated_at="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
wifi_connected_value="null"
current_ssid_value=""
internet_reachable_value="null"
remote_reachable_value="null"
portal_recovery_likely_value="null"
message_value="Telemetry snapshot captured"

if wifi_connected; then
  wifi_connected_value="true"
elif [[ $? -eq 1 ]]; then
  wifi_connected_value="false"
  message_value="Wi-Fi disconnected"
fi

current_ssid_value="$(current_ssid || true)"

if check_url "${CHECK_URL}"; then
  internet_reachable_value="true"
elif command -v curl >/dev/null 2>&1; then
  internet_reachable_value="false"
  if [[ "${wifi_connected_value}" == "true" ]]; then
    portal_recovery_likely_value="true"
    message_value="Internet reachability failed while Wi-Fi is connected"
  else
    message_value="Internet reachability failed"
  fi
fi

if [[ -n "${REMOTE_TARGET}" ]]; then
  if check_target "${REMOTE_TARGET}"; then
    remote_reachable_value="true"
  else
    remote_reachable_value="false"
    if [[ "${internet_reachable_value}" == "true" ]]; then
      message_value="Remote reachability failed for ${REMOTE_TARGET}"
    fi
  fi
fi

if [[ "${wifi_connected_value}" == "true" && "${internet_reachable_value}" == "true" ]]; then
  message_value="Connected to Wi-Fi and internet is reachable"
fi

tmp_file="$(mktemp "${OUTPUT_DIR}/network-status.XXXXXX")"
cat >"${tmp_file}" <<JSON
{
  "generatedAt": "${generated_at}",
  "wifiConnected": ${wifi_connected_value},
  "currentSsid": $(json_string_or_null "${current_ssid_value}"),
  "internetReachable": ${internet_reachable_value},
  "remoteTarget": $(json_string_or_null "${REMOTE_TARGET}"),
  "remoteReachable": ${remote_reachable_value},
  "portalRecoveryLikely": ${portal_recovery_likely_value},
  "message": $(json_string_or_null "${message_value}")
}
JSON
mv "${tmp_file}" "${OUTPUT_FILE}"
