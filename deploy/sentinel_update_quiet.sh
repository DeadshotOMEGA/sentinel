#!/usr/bin/env bash
set -Eeuo pipefail

# Sentinel Wi-Fi Recovery + Release Install + Update Script
#
# What it does:
#   1) Ensures Wi-Fi is enabled
#   2) Ensures connection to the target SSID
#   3) Verifies real Internet access
#   4) If captive portal access is needed, cycles Wi-Fi, reconnects, opens the portal,
#      and performs a best-effort checkbox/button keystroke flow on X11
#   5) Prompts for a Sentinel version number (#.#.#)
#   6) Verifies GitHub CLI authentication
#   7) Downloads the matching .deb from GitHub Releases
#   8) Installs the .deb
#   9) Runs /opt/sentinel/deploy/update.sh --version v#.#.#
#  10) Runs host hotspot recovery after a successful update
#  11) Logs everything and reports errors clearly
#
# Notes:
#   - The captive portal automation is best-effort and is most reliable on X11.
#   - On Wayland, simulated keystrokes are often blocked by design.
#   - You can still complete the portal manually if automatic keystrokes are unavailable.
#   - This wrapper suppresses noisy Docker pull/progress chatter only for automated runs.
#
# Usage:
#   bash ./sentinel_update_quiet.sh
#
# Optional environment overrides:
#   SSID=MySSID CAPTIVE_URL=http://neverssl.com bash ./sentinel_update_quiet.sh
#   SENTINEL_SHOW_PROGRESS=1 bash ./sentinel_update_quiet.sh   # show full update.sh output

#######################################
# Configuration
#######################################
SSID="${SSID:-HMCS_Chippawa_publicguestaccess}"
REPO="${REPO:-DeadshotOMEGA/sentinel}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/sentinel/deploy}"
DOWNLOAD_DIR="${DOWNLOAD_DIR:-${DEPLOY_DIR}/runtime/downloads}"
CAPTIVE_URL="${CAPTIVE_URL:-http://neverssl.com}"
CONNECTIVITY_TEST_URL="${CONNECTIVITY_TEST_URL:-http://connectivitycheck.gstatic.com/generate_204}"
FALLBACK_TEST_URL="${FALLBACK_TEST_URL:-https://github.com}"
HOTSPOT_CONNECTION_NAME="${HOTSPOT_CONNECTION_NAME:-Sentinel Hotspot}"

LOG_DIR="${LOG_DIR:-/tmp}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
LOG_FILE="${LOG_DIR}/sentinel_update_${TIMESTAMP}.log"
RAW_UPDATE_LOG="${LOG_DIR}/sentinel_update_raw_${TIMESTAMP}.log"

WIFI_TOGGLE_WAIT="${WIFI_TOGGLE_WAIT:-4}"
CONNECT_WAIT="${CONNECT_WAIT:-20}"
BROWSER_OPEN_WAIT="${BROWSER_OPEN_WAIT:-8}"
POST_KEY_WAIT="${POST_KEY_WAIT:-6}"

# Set to 1 to show the full raw update.sh output live.
SENTINEL_SHOW_PROGRESS="${SENTINEL_SHOW_PROGRESS:-0}"
USE_GH_CLI="false"

path_has_entry() {
  local needle="${1:-}"
  [[ -n "${needle}" ]] || return 1
  case ":${PATH}:" in
    *":${needle}:"*) return 0 ;;
    *) return 1 ;;
  esac
}

append_path_if_dir_exists() {
  local dir="${1:-}"
  [[ -n "${dir}" && -d "${dir}" ]] || return 0
  if ! path_has_entry "${dir}"; then
    PATH="${PATH}:${dir}"
  fi
}

normalize_runtime_path() {
  local primary_user primary_home
  primary_user="${SUDO_USER:-${USER:-}}"
  if [[ -n "${primary_user}" ]]; then
    primary_home="$(getent passwd "${primary_user}" | cut -d: -f6 || true)"
    append_path_if_dir_exists "${primary_home}/.local/bin"
  fi

  append_path_if_dir_exists "/snap/bin"
  append_path_if_dir_exists "/usr/local/bin"
  append_path_if_dir_exists "/usr/bin"

  export PATH
}

#######################################
# Logging
#######################################
mkdir -p "$LOG_DIR"
touch "$LOG_FILE"
exec > >(tee -a "$LOG_FILE") 2>&1

log()  { printf '[INFO] %s\n' "$*"; }
warn() { printf '[WARN] %s\n' "$*" >&2; }
err()  { printf '[ERROR] %s\n' "$*" >&2; }
die()  { err "$*"; exit 1; }

on_error() {
  local exit_code=$?
  err "Script failed at line ${BASH_LINENO[0]} with exit code ${exit_code}."
  err "See log: ${LOG_FILE}"
  if [[ -f "$RAW_UPDATE_LOG" ]]; then
    err "Raw update output: ${RAW_UPDATE_LOG}"
  fi
  exit "$exit_code"
}
trap on_error ERR

#######################################
# Helpers
#######################################
require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

retry() {
  local attempts="$1"
  local delay="$2"
  shift 2

  local n=1
  until "$@"; do
    if (( n >= attempts )); then
      return 1
    fi
    warn "Attempt ${n}/${attempts} failed: $*"
    warn "Retrying in ${delay}s..."
    sleep "$delay"
    ((n++))
  done
}

pick_browser() {
  local candidates=(xdg-open firefox google-chrome chromium chromium-browser brave-browser)
  local browser
  for browser in "${candidates[@]}"; do
    if command -v "$browser" >/dev/null 2>&1; then
      printf '%s\n' "$browser"
      return 0
    fi
  done
  return 1
}

prompt_version() {
  local version
  while true; do
    read -r -p "Enter Sentinel version (#.#.#, example 2.1.2): " version
    if [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      VERSION="$version"
      TAG="v${VERSION}"
      DEB_FILE="sentinel_${VERSION}_all.deb"
      log "Using version: ${VERSION}"
      return 0
    fi
    warn "Invalid version format. Expected #.#.#"
  done
}

confirm_continue() {
  local prompt="${1:-Continue? [y/N]: }"
  local reply
  read -r -p "$prompt" reply
  [[ "$reply" =~ ^[Yy]([Ee][Ss])?$ ]]
}

installed_version() {
  dpkg-query -W -f='${Version}\n' sentinel 2>/dev/null || true
}

same_version_installed() {
  local installed
  installed="$(installed_version)"
  [[ -n "$installed" && "$installed" == "$VERSION" ]]
}

print_prisma_troubleshooting() {
  cat <<EOF2
[INFO] Helpful follow-up commands:
  cd "${DEPLOY_DIR}" && docker compose exec -T backend sh -lc "cd /app && pnpm --filter @sentinel/database exec prisma migrate status"
  cd "${DEPLOY_DIR}" && docker compose exec -T backend sh -lc 'cd /app && pnpm --filter @sentinel/database exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma'

If docker needs sudo on this machine:
  cd "${DEPLOY_DIR}" && sudo docker compose exec -T backend sh -lc "cd /app && pnpm --filter @sentinel/database exec prisma migrate status"
  cd "${DEPLOY_DIR}" && sudo docker compose exec -T backend sh -lc 'cd /app && pnpm --filter @sentinel/database exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma'
EOF2
}

# Filter only the noisy Docker/Compose progress chatter from live console output.
# The full raw update output is still saved to RAW_UPDATE_LOG.
filter_update_output() {
  awk '
    {
      gsub(/\r/, "", $0)
    }

    /Pulling fs layer/ { next }
    /Waiting$/ { next }
    /Downloading[[:space:]]+\[/ { next }
    /Verifying Checksum/ { next }
    /Download complete/ { next }
    /Extracting[[:space:]]+\[/ { next }
    /Pull complete/ { next }
    /Already exists$/ { next }
    /Layer already exists$/ { next }

    /^[[:space:]]*[A-Za-z0-9_.:-]+[[:space:]]+(Downloading|Extracting)[[:space:]]+/ { next }
    /^[[:space:]]*[0-9a-f]{6,}[[:space:]]+/ { next }

    { print; fflush() }
  '
}

#######################################
# Dependency checks
#######################################
check_dependencies() {
  require_cmd nmcli
  require_cmd curl
  require_cmd sudo
  require_cmd apt-get
  require_cmd dpkg-query

  if command -v gh >/dev/null 2>&1; then
    USE_GH_CLI="true"
  else
    USE_GH_CLI="false"
    warn "GitHub CLI (gh) not found. Falling back to GitHub API + direct release download via curl."
  fi

  if ! pick_browser >/dev/null 2>&1; then
    warn "No known browser launcher found. Portal opening may fail."
  fi

  if [[ "${XDG_SESSION_TYPE:-}" == "x11" ]]; then
    if ! command -v xdotool >/dev/null 2>&1; then
      warn "xdotool not found. Captive portal can still be opened, but checkbox/button keystrokes cannot be automated."
    fi
  else
    warn "Session type appears to be '${XDG_SESSION_TYPE:-unknown}'. Simulated keystrokes are usually unreliable outside X11."
  fi
}

#######################################
# Wi-Fi helpers
#######################################
wifi_radio_is_on() {
  [[ "$(nmcli -t -f WIFI general status 2>/dev/null)" == "enabled" ]]
}

wifi_enable() {
  log "Turning Wi-Fi ON..."
  nmcli radio wifi on
  sleep "$WIFI_TOGGLE_WAIT"
}

wifi_disable() {
  log "Turning Wi-Fi OFF..."
  nmcli radio wifi off
  sleep "$WIFI_TOGGLE_WAIT"
}

current_ssid() {
  nmcli -t -f ACTIVE,SSID dev wifi 2>/dev/null | awk -F: '$1=="yes"{print $2; exit}'
}

connected_to_target_ssid() {
  [[ "$(current_ssid)" == "$SSID" ]]
}

rescan_wifi() {
  log "Rescanning Wi-Fi networks..."
  nmcli dev wifi rescan || true
  sleep 3
}

connect_to_ssid() {
  log "Connecting to SSID: ${SSID}"
  rescan_wifi

  if nmcli --wait "$CONNECT_WAIT" dev wifi connect "$SSID" >/dev/null 2>&1; then
    sleep 2
    return 0
  fi

  warn "Initial connect attempt failed. Retrying once more..."
  rescan_wifi
  nmcli --wait "$CONNECT_WAIT" dev wifi connect "$SSID"
  sleep 2
}

#######################################
# Internet / captive portal checks
#######################################
has_internet_access() {
  local http_code
  http_code="$(curl -I -L -s -o /dev/null -w '%{http_code}' --max-time 10 "$CONNECTIVITY_TEST_URL" || true)"

  if [[ "$http_code" == "204" ]]; then
    return 0
  fi

  if curl -fsS --max-time 10 "$FALLBACK_TEST_URL" >/dev/null 2>&1; then
    return 0
  fi

  return 1
}

open_browser_to_portal() {
  local browser
  browser="$(pick_browser)" || return 1

  log "Opening browser to: ${CAPTIVE_URL}"
  case "$browser" in
    xdg-open)
      xdg-open "$CAPTIVE_URL" >/dev/null 2>&1 || return 1
      ;;
    *)
      "$browser" "$CAPTIVE_URL" >/dev/null 2>&1 &
      ;;
  esac
}

portal_auto_accept_best_effort() {
  if [[ "${XDG_SESSION_TYPE:-}" != "x11" ]]; then
    warn "Skipping automatic keystrokes because this does not appear to be an X11 session."
    return 1
  fi

  if ! command -v xdotool >/dev/null 2>&1; then
    warn "Skipping automatic keystrokes because xdotool is not installed."
    return 1
  fi

  log "Waiting ${BROWSER_OPEN_WAIT}s for the portal page to load..."
  sleep "$BROWSER_OPEN_WAIT"

  log "Sending best-effort portal acceptance keystrokes: Tab x2, Space x1, Return x1"
  xdotool key Tab
  sleep 0.4
  xdotool key Tab
  sleep 0.4
  xdotool key space
  sleep 0.5
  xdotool key Return

  sleep "$POST_KEY_WAIT"
  return 0
}

handle_captive_portal() {
  warn "Internet access is unavailable. Starting Wi-Fi recovery + captive portal flow."

  wifi_disable
  wifi_enable
  retry 2 3 connect_to_ssid || die "Failed to reconnect to SSID: ${SSID}"

  if ! connected_to_target_ssid; then
    die "Not connected to target SSID after recovery: ${SSID}"
  fi

  if ! open_browser_to_portal; then
    warn "Could not automatically open a browser."
  fi

  if ! portal_auto_accept_best_effort; then
    warn "Automatic portal acceptance was not completed."
    warn "If the portal page is open, complete it manually, then return here."
    read -r -p "Press Enter after the captive portal is complete..."
  fi

  if retry 3 5 has_internet_access; then
    log "Internet access restored."
  else
    die "Internet access is still unavailable after captive portal handling."
  fi
}

#######################################
# GitHub helpers
#######################################
gh_is_authenticated() {
  if [[ "${USE_GH_CLI}" != "true" ]]; then
    return 0
  fi

  if [[ "${EUID}" -eq 0 && -n "${SUDO_USER:-}" && "${SUDO_USER}" != "root" ]]; then
    local gh_bin
    gh_bin="$(command -v gh || true)"
    if [[ -n "${gh_bin}" ]]; then
      runuser -u "${SUDO_USER}" -- "${gh_bin}" auth status >/dev/null 2>&1
      return $?
    fi
  fi

  gh auth status >/dev/null 2>&1
}

run_gh() {
  if [[ "${EUID}" -eq 0 && -n "${SUDO_USER:-}" && "${SUDO_USER}" != "root" ]]; then
    local gh_bin
    gh_bin="$(command -v gh || true)"
    [[ -n "${gh_bin}" ]] || return 127
    runuser -u "${SUDO_USER}" -- "${gh_bin}" "$@"
    return $?
  fi

  gh "$@"
}

run_update_cmd() {
  if [[ "${EUID}" -eq 0 ]]; then
    "$@"
    return $?
  fi

  sudo "$@"
}

ensure_download_dir_writable() {
  mkdir -p "$DOWNLOAD_DIR"

  if [[ "${EUID}" -eq 0 && -n "${SUDO_USER:-}" && "${SUDO_USER}" != "root" ]]; then
    local owner_group
    owner_group="$(id -gn "${SUDO_USER}" 2>/dev/null || true)"
    if [[ -n "${owner_group}" ]]; then
      chown "${SUDO_USER}:${owner_group}" "$DOWNLOAD_DIR"
    else
      chown "${SUDO_USER}" "$DOWNLOAD_DIR"
    fi

    if ! runuser -u "${SUDO_USER}" -- test -w "$DOWNLOAD_DIR"; then
      die "Download directory is not writable by ${SUDO_USER}: ${DOWNLOAD_DIR}"
    fi
    return 0
  fi

  [[ -w "$DOWNLOAD_DIR" ]] || die "Download directory is not writable: ${DOWNLOAD_DIR}"
}

validate_release_exists() {
  log "Checking GitHub release tag exists: ${TAG}"
  if [[ "${USE_GH_CLI}" == "true" ]]; then
    run_gh release view "$TAG" -R "$REPO" >/dev/null
    return 0
  fi

  curl -fsSL --max-time 20 "https://api.github.com/repos/${REPO}/releases/tags/${TAG}" >/dev/null
}

download_release_deb() {
  ensure_download_dir_writable
  cd "$DOWNLOAD_DIR"

  rm -f "$DEB_FILE"

  log "Downloading asset '${DEB_FILE}' from ${REPO} release ${TAG}"
  if [[ "${USE_GH_CLI}" == "true" ]]; then
    retry 3 5 run_gh release download "$TAG" \
      -R "$REPO" \
      -p "$DEB_FILE" \
      -D "$DOWNLOAD_DIR"
  else
    local release_asset_url="https://github.com/${REPO}/releases/download/${TAG}/${DEB_FILE}"
    retry 3 5 curl -fL --max-time 180 -o "${DOWNLOAD_DIR}/${DEB_FILE}" "${release_asset_url}"
  fi

  [[ -f "${DOWNLOAD_DIR}/${DEB_FILE}" ]] || die "Expected package was not found after download: ${DOWNLOAD_DIR}/${DEB_FILE}"

  log "Confirmed download: ${DOWNLOAD_DIR}/${DEB_FILE}"
  ls -lh "${DOWNLOAD_DIR}/${DEB_FILE}"
}

#######################################
# Install / update
#######################################
install_deb() {
  cd "$DOWNLOAD_DIR"
  log "Installing package with apt-get: ${DEB_FILE}"
  sudo apt-get install -y "./${DEB_FILE}"
}

run_update() {
  [[ -d "$DEPLOY_DIR" ]] || die "Deploy directory not found: ${DEPLOY_DIR}"
  cd "$DEPLOY_DIR"

  [[ -x "./update.sh" ]] || die "update.sh not found or not executable in ${DEPLOY_DIR}"

  : > "$RAW_UPDATE_LOG"
  log "Running update: ./update.sh --version ${TAG}"

  if [[ "$SENTINEL_SHOW_PROGRESS" == "1" ]]; then
    log "Full update progress output enabled."
    run_update_cmd ./update.sh --version "$TAG" 2>&1 | tee -a "$RAW_UPDATE_LOG"
  else
    log "Suppressing noisy Docker pull progress in live output."
    log "Full raw update output is still being saved to: ${RAW_UPDATE_LOG}"
    run_update_cmd ./update.sh --version "$TAG" 2>&1 | tee -a "$RAW_UPDATE_LOG" | filter_update_output
  fi

  local update_rc=${PIPESTATUS[0]}
  if (( update_rc == 0 )); then
    log "update.sh completed successfully."
    return 0
  fi

  err "update.sh failed with exit code ${update_rc}."
  err "Raw update output: ${RAW_UPDATE_LOG}"

  if grep -qi "Database schema drift detected" "$RAW_UPDATE_LOG"; then
    err "Likely cause: Prisma schema drift detected."
    print_prisma_troubleshooting
  elif grep -qi "no configuration file provided" "$RAW_UPDATE_LOG"; then
    err "Docker Compose could not find a compose file."
    err "Make sure commands are run from: ${DEPLOY_DIR}"
  fi

  return "$update_rc"
}

run_post_update_hotspot_recovery() {
  local recovery_script="${DEPLOY_DIR}/recover-host-hotspot.sh"

  if [[ ! -x "${recovery_script}" ]]; then
    warn "Hotspot recovery script not found or not executable: ${recovery_script}"
    return 0
  fi

  log "Running post-update hotspot recovery for connection: ${HOTSPOT_CONNECTION_NAME}"
  if sudo "${recovery_script}" "${HOTSPOT_CONNECTION_NAME}"; then
    log "Post-update hotspot recovery completed."
    return 0
  fi

  warn "Post-update hotspot recovery failed. Review logs above."
  return 0
}

#######################################
# Main
#######################################
main() {
  log "Sentinel update script starting..."
  log "Log file: ${LOG_FILE}"
  normalize_runtime_path

  check_dependencies
  prompt_version

  log "Checking Wi-Fi radio state..."
  if ! wifi_radio_is_on; then
    warn "Wi-Fi is OFF."
    wifi_enable
  else
    log "Wi-Fi is already ON."
  fi

  log "Checking real Internet access..."
  if has_internet_access; then
    log "Internet access is available."
    log "Skipping strict SSID enforcement because internet connectivity already passes."
  else
    log "Internet access not detected; enforcing target SSID before captive portal recovery."
    if ! connected_to_target_ssid; then
      warn "Not currently connected to '${SSID}'."
      retry 2 3 connect_to_ssid || die "Unable to connect to SSID: ${SSID}"
    else
      log "Already connected to '${SSID}'."
    fi

    if ! connected_to_target_ssid; then
      die "Connection check failed: expected SSID '${SSID}', got '${CURRENT_SSID:-$(current_ssid)}'."
    fi

    handle_captive_portal
  fi

  log "Checking GitHub CLI authentication..."
  if [[ "${USE_GH_CLI}" == "true" ]]; then
    if gh_is_authenticated; then
      log "GitHub CLI authentication is available."
    else
      warn "GitHub CLI authentication is unavailable in this execution context."
      warn "Falling back to GitHub API + direct release download via curl."
      USE_GH_CLI="false"
    fi
  else
    log "Skipping GitHub CLI auth check because gh is unavailable."
  fi

  if same_version_installed; then
    warn "Sentinel ${VERSION} is already installed."
    if ! confirm_continue "Run install/update anyway? [y/N]: "; then
      log "Nothing to do. Exiting."
      exit 0
    fi
  fi

  validate_release_exists
  download_release_deb
  install_deb
  run_update
  run_post_update_hotspot_recovery

  log "Sentinel update completed successfully."
  log "Log saved to: ${LOG_FILE}"
  log "Raw update output saved to: ${RAW_UPDATE_LOG}"
}

main "$@"
