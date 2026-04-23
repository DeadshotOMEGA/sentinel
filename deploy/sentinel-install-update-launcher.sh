#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
APPLIANCE_STATE_FILE="/var/lib/sentinel/appliance/state.json"

read_env_value() {
  local key="${1:-}"
  [[ -n "${key}" ]] || return 0
  if [[ -f "${ENV_FILE}" ]]; then
    grep -E "^${key}=" "${ENV_FILE}" | cut -d= -f2- || true
  fi
}

normalize_version_tag() {
  local raw="${1:-}"
  raw="${raw%%#*}"
  raw="$(printf '%s' "${raw}" | tr -d '\r' | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"
  raw="${raw#v}"
  if [[ ! "${raw}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    return 1
  fi

  printf 'v%s\n' "${raw}"
}

fetch_latest_release_version() {
  local owner="${1:-deadshotomega}"
  curl -fsSL --max-time 8 "https://api.github.com/repos/${owner}/sentinel/releases/latest" |
    sed -n 's/.*"tag_name":[[:space:]]*"\(v[^"]*\)".*/\1/p' |
    head -n1
}

can_use_zenity() {
  command -v zenity >/dev/null 2>&1 && [[ -n "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ]]
}

existing_install_detected() {
  if [[ -f "${APPLIANCE_STATE_FILE}" ]]; then
    return 0
  fi

  dpkg-query -W -f='${Status}\n' sentinel 2>/dev/null | grep -Fq 'install ok installed'
}

prompt_action_zenity() {
  local install_selected update_selected
  if existing_install_detected; then
    update_selected="TRUE"
    install_selected="FALSE"
  else
    update_selected="FALSE"
    install_selected="TRUE"
  fi

  zenity --list \
    --radiolist \
    --title="Sentinel install and update" \
    --text="Choose the guided workflow for this laptop." \
    --width=520 \
    --height=260 \
    --column="" \
    --column="Workflow" \
    "${install_selected}" "Install Sentinel on this laptop" \
    "${update_selected}" "Update existing Sentinel appliance"
}

prompt_action_terminal() {
  local prompt
  if existing_install_detected; then
    prompt="Update existing Sentinel appliance"
  else
    prompt="Install Sentinel on this laptop"
  fi

  printf '\nSentinel install and update\n'
  printf 'Recommended workflow: %s\n' "${prompt}"
  printf '1) Install Sentinel on this laptop\n'
  printf '2) Update existing Sentinel appliance\n'
  read -r -p 'Choose a workflow [1/2]: ' selection
  case "${selection}" in
    1) printf 'Install Sentinel on this laptop\n' ;;
    2) printf 'Update existing Sentinel appliance\n' ;;
    *)
      printf 'Invalid workflow selection.\n' >&2
      exit 1
      ;;
  esac
}

prompt_version_zenity() {
  local default_version="${1:-v1.0.0}" action_label="${2:-install}"
  zenity --entry \
    --title="Sentinel ${action_label}" \
    --text="Enter the Sentinel release version to ${action_label} on this laptop." \
    --entry-text="${default_version}"
}

prompt_version_terminal() {
  local default_version="${1:-v1.0.0}" action_label="${2:-install}" version=""
  printf '\nEnter the Sentinel release version to %s (example: v2.6.7)\n' "${action_label}"
  read -r -p "Version [${default_version}]: " version
  if [[ -z "${version}" ]]; then
    version="${default_version}"
  fi
  printf '%s\n' "${version}"
}

confirm_continue_zenity() {
  local title="${1:-Continue}" message="${2:-Continue?}"
  zenity --question \
    --title="${title}" \
    --text="${message}" \
    --ok-label="Continue" \
    --cancel-label="Cancel"
}

confirm_continue_terminal() {
  local message="${1:-Continue? [y/N]: }" reply
  read -r -p "${message}" reply
  [[ "${reply}" =~ ^[Yy]([Ee][Ss])?$ ]]
}

run_environment_preflight() {
  local owner="${1:-deadshotomega}" action_label="${2:-install}"
  local message

  if curl -fsSL --max-time 10 "https://api.github.com/repos/${owner}/sentinel/releases/latest" >/dev/null; then
    return 0
  fi

  message="Sentinel could not reach GitHub release metadata during preflight. ${action_label^} may still fail later if internet access is not restored."
  if can_use_zenity; then
    confirm_continue_zenity "Network preflight" "${message}"
    return $?
  fi

  printf '[sentinel] %s\n' "${message}" >&2
  confirm_continue_terminal "Continue anyway? [y/N]: "
}

read_hotspot_report_json() {
  if [[ ! -x "${SCRIPT_DIR}/ensure-host-hotspot-profile.sh" ]]; then
    return 0
  fi

  "${SCRIPT_DIR}/ensure-host-hotspot-profile.sh" --report-json 2>/dev/null || true
}

hotspot_report_field() {
  local field="${1:-}" report_json="${2:-}"
  [[ -n "${field}" && -n "${report_json}" ]] || return 0
  command -v python3 >/dev/null 2>&1 || return 0
  printf '%s' "${report_json}" |
    python3 -c "import json, sys; payload = json.load(sys.stdin); print(payload.get('${field}', ''))"
}

prompt_hotspot_choice_zenity() {
  local action_label="${1:-install}" message="${2:-Hotspot setup needs attention.}"
  zenity --list \
    --radiolist \
    --title="Wireless recovery" \
    --text="${message}" \
    --width=560 \
    --height=280 \
    --column="" \
    --column="Action" \
    TRUE "Retry hotspot setup" \
    FALSE "Continue without hotspot" \
    FALSE "Cancel ${action_label}"
}

prompt_hotspot_choice_terminal() {
  local action_label="${1:-install}" message="${2:-Hotspot setup needs attention.}" selection
  printf '\n%s\n' "${message}"
  printf '1) Retry hotspot setup\n'
  printf '2) Continue without hotspot\n'
  printf '3) Cancel %s\n' "${action_label}"
  read -r -p 'Choose an action [1/2/3]: ' selection
  case "${selection}" in
    1) printf 'Retry hotspot setup\n' ;;
    2) printf 'Continue without hotspot\n' ;;
    3) printf 'Cancel %s\n' "${action_label}" ;;
    *)
      printf 'Invalid hotspot choice.\n' >&2
      exit 1
      ;;
  esac
}

run_hotspot_wizard_gate() {
  local action_label="${1:-install}" recovery_rc report_json report_issue report_message choice

  while true; do
    set +e
    sudo bash "${SCRIPT_DIR}/recover-host-hotspot.sh"
    recovery_rc=$?
    set -e

    report_json="$(read_hotspot_report_json)"
    report_issue="$(hotspot_report_field issueCode "${report_json}")"
    report_message="$(hotspot_report_field message "${report_json}")"

    if [[ "${report_issue:-none}" == "none" && "${recovery_rc}" -eq 0 ]]; then
      return 0
    fi

    if [[ -z "${report_message}" ]]; then
      if [[ "${recovery_rc}" -eq 0 ]]; then
        report_message="Hotspot setup finished, but Sentinel still could not verify the hosted AP cleanly."
      else
        report_message="Hotspot setup could not finish cleanly on the host laptop."
      fi
    fi

    if can_use_zenity; then
      choice="$(prompt_hotspot_choice_zenity "${action_label}" "${report_message}")" || exit 1
    else
      choice="$(prompt_hotspot_choice_terminal "${action_label}" "${report_message}")"
    fi

    case "${choice}" in
      "Retry hotspot setup")
        continue
        ;;
      "Continue without hotspot")
        if can_use_zenity; then
          zenity --warning \
            --title="Continuing in degraded mode" \
            --text="Sentinel will continue without a verified hotspot. The web app will keep showing the networking issue until the host hotspot is repaired."
        else
          printf '[sentinel] Continuing without a verified hotspot. Sentinel will remain in degraded networking mode.\n'
        fi
        return 0
        ;;
      *)
        exit 1
        ;;
    esac
  done
}

show_final_summary() {
  local exit_code="${1:-0}" action_label="${2:-install}"
  local summary
  if [[ "${exit_code}" -eq 0 ]]; then
    summary="Sentinel ${action_label} finished successfully."
    if can_use_zenity; then
      zenity --info --title="Sentinel ${action_label}" --text="${summary}"
    fi
  else
    summary="Sentinel ${action_label} failed with exit code ${exit_code}. Review the terminal log for details."
    if can_use_zenity; then
      zenity --error --title="Sentinel ${action_label}" --text="${summary}"
    fi
  fi

  if [[ -t 0 ]]; then
    echo
    echo "[sentinel] ${summary}"
    echo "[sentinel] Press Enter to close."
    read -r _
  fi
}

main() {
  local gh_owner default_version workflow action_label raw_version version_tag exit_code

  gh_owner="$(read_env_value GHCR_OWNER)"
  if [[ -z "${gh_owner}" ]]; then
    gh_owner="deadshotomega"
  fi

  default_version="$(read_env_value SENTINEL_VERSION)"
  if ! default_version="$(normalize_version_tag "${default_version}")"; then
    default_version="$(fetch_latest_release_version "${gh_owner}" || true)"
  fi
  if ! default_version="$(normalize_version_tag "${default_version}")"; then
    default_version="v1.0.0"
  fi

  if can_use_zenity; then
    workflow="$(prompt_action_zenity)" || exit 1
  else
    workflow="$(prompt_action_terminal)"
  fi

  case "${workflow}" in
    "Install Sentinel on this laptop")
      action_label="install"
      ;;
    "Update existing Sentinel appliance")
      action_label="update"
      ;;
    *)
      printf 'Unknown workflow selection: %s\n' "${workflow}" >&2
      exit 1
      ;;
  esac

  if can_use_zenity; then
    raw_version="$(prompt_version_zenity "${default_version}" "${action_label}")" || exit 1
  else
    raw_version="$(prompt_version_terminal "${default_version}" "${action_label}")"
  fi
  version_tag="$(normalize_version_tag "${raw_version}")" || {
    printf 'Invalid version: %s\n' "${raw_version}" >&2
    exit 1
  }

  run_environment_preflight "${gh_owner}" "${action_label}" || exit 1
  run_hotspot_wizard_gate "${action_label}"

  set +e
  if [[ "${action_label}" == "install" ]]; then
    bash "${SCRIPT_DIR}/install.sh" --version "${version_tag}"
    exit_code=$?
  else
    SENTINEL_TARGET_VERSION="${version_tag}" bash "${SCRIPT_DIR}/sentinel_update_quiet.sh"
    exit_code=$?
  fi
  set -e

  show_final_summary "${exit_code}" "${action_label}"
  exit "${exit_code}"
}

main "$@"
