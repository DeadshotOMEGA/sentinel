#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
README_PATH="${SCRIPT_DIR}/README_DEPLOY.md"

GH_OWNER=""
TARGET_TAG=""
USE_LATEST="false"
WITH_OBS="true"
ALLOW_GRAFANA_LAN="true"
ALLOW_WIKI_LAN="true"
DRY_RUN="false"

RELEASE_JSON=""
RELEASE_TITLE=""
RELEASE_PUBLISHED_AT=""
RELEASE_URL=""
RELEASE_HIGHLIGHTS=""
DEPLOYMENT_NOTES=""

usage() {
  cat <<USAGE
Usage: ./upgrade-launcher.sh [options]

Options:
  --latest                  Upgrade to latest stable release
  --version <vX.Y.Z>        Upgrade/downgrade to a specific tag
  --owner <github-owner>    GitHub owner/org (default from .env GHCR_OWNER)
  --with-obs                Enable observability profile (default)
  --without-obs             Disable observability profile
  --allow-grafana-lan       Publish Grafana on LAN (default)
  --disallow-grafana-lan    Disable Grafana LAN publish
  --allow-wiki-lan          Publish Wiki.js on LAN (default)
  --disallow-wiki-lan       Disable Wiki.js LAN publish
  --dry-run                 Validate release/assets/checksum only
USAGE
}

die() {
  echo "[upgrade] ERROR: $*" >&2
  exit 1
}

warn() {
  echo "[upgrade] WARN: $*" >&2
}

log() {
  echo "[upgrade] $*"
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

can_use_zenity() {
  if ! command_exists zenity; then
    return 1
  fi
  [[ -n "${DISPLAY:-}" || -n "${WAYLAND_DISPLAY:-}" ]]
}

read_env_value() {
  local key="${1}"
  if [[ -f "${ENV_FILE}" ]]; then
    grep -E "^${key}=" "${ENV_FILE}" | cut -d= -f2- || true
  fi
}

validate_tag() {
  local tag="${1:-}"
  [[ "${tag}" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]
}

api_get() {
  local url="${1}"
  curl -fsSL \
    -H 'Accept: application/vnd.github+json' \
    -H 'X-GitHub-Api-Version: 2022-11-28' \
    "${url}"
}

fetch_latest_release_tag() {
  local owner="${1}"
  local json
  json="$(api_get "https://api.github.com/repos/${owner}/sentinel/releases/latest")"
  echo "${json}" | sed -n 's/.*"tag_name"[[:space:]]*:[[:space:]]*"\(v[^"]*\)".*/\1/p' | head -n1
}

fetch_recent_release_tags() {
  local owner="${1}"
  local json
  json="$(api_get "https://api.github.com/repos/${owner}/sentinel/releases?per_page=15")"
  echo "${json}" | sed -n 's/.*"tag_name"[[:space:]]*:[[:space:]]*"\(v[^"]*\)".*/\1/p' | head -n 10
}

extract_asset_urls() {
  local json="${1}"
  echo "${json}" \
    | grep -oE '"browser_download_url"[[:space:]]*:[[:space:]]*"[^"]+"' \
    | sed -E 's/^.*"(https:[^"]+)"$/\1/'
}

select_deb_asset_url() {
  local json="${1}"
  local url
  while IFS= read -r url; do
    case "$(basename "${url}")" in
      sentinel_*_all.deb|sentinel-appliance-tools_*_all.deb)
        echo "${url}"
        return 0
        ;;
    esac
  done < <(extract_asset_urls "${json}")

  return 1
}

select_checksum_asset_url() {
  local json="${1}"
  local url
  local base
  while IFS= read -r url; do
    base="$(basename "${url}" | tr '[:upper:]' '[:lower:]')"
    if [[ "${base}" == *checksum* ]] || [[ "${base}" == *sha256* ]]; then
      if [[ "${base}" == *.txt ]] || [[ "${base}" == *sums* ]]; then
        echo "${url}"
        return 0
      fi
    fi
  done < <(extract_asset_urls "${json}")

  return 1
}

run_preflight_checks() {
  local owner="${1}"

  for cmd in curl sed grep awk sha256sum dpkg sudo; do
    command_exists "${cmd}" || die "Missing required command: ${cmd}"
  done

  local free_kb
  free_kb="$(df -Pk /opt 2>/dev/null | awk 'NR==2 {print $4}')"
  if [[ -n "${free_kb}" ]] && [[ "${free_kb}" =~ ^[0-9]+$ ]]; then
    if (( free_kb < 1048576 )); then
      die "Insufficient disk space under /opt (need at least 1GiB free)"
    fi
  fi

  api_get "https://api.github.com/repos/${owner}/sentinel/releases/latest" >/dev/null || \
    die "Unable to reach GitHub Releases API"
}

open_document() {
  local target="${1}"
  if command_exists xdg-open; then
    if ! xdg-open "${target}" >/dev/null 2>&1; then
      warn "Unable to open: ${target}"
    fi
  else
    warn "xdg-open unavailable. Open manually: ${target}"
  fi
}

extract_release_brief() {
  local json="${1}"

  RELEASE_TITLE=""
  RELEASE_PUBLISHED_AT=""
  RELEASE_URL=""
  RELEASE_HIGHLIGHTS=""

  if command_exists python3; then
    mapfile -t parsed < <(printf '%s' "${json}" | python3 - <<'PY'
import json
import sys

d = json.load(sys.stdin)
name = d.get('name') or ''
tag = d.get('tag_name') or ''
published = d.get('published_at') or ''
url = d.get('html_url') or ''
body = d.get('body') or ''

print(name)
print(tag)
print(published)
print(url)

count = 0
for raw in body.splitlines():
    line = raw.strip()
    if not line:
        continue
    if line.startswith(('- ', '* ', '##', '###')):
        print(line)
        count += 1
        if count >= 5:
            break
PY
)

    RELEASE_TITLE="${parsed[0]:-}"
    local parsed_tag="${parsed[1]:-}"
    RELEASE_PUBLISHED_AT="${parsed[2]:-}"
    RELEASE_URL="${parsed[3]:-}"

    if [[ -z "${RELEASE_TITLE}" ]]; then
      RELEASE_TITLE="${parsed_tag:-${TARGET_TAG}}"
    fi

    if (( ${#parsed[@]} > 4 )); then
      local i
      for (( i=4; i<${#parsed[@]}; i++ )); do
        if [[ -n "${RELEASE_HIGHLIGHTS}" ]]; then
          RELEASE_HIGHLIGHTS+=$'\n'
        fi
        RELEASE_HIGHLIGHTS+="${parsed[$i]}"
      done
    fi
  else
    RELEASE_TITLE="$(echo "${json}" | sed -n 's/.*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)"
    RELEASE_PUBLISHED_AT="$(echo "${json}" | sed -n 's/.*"published_at"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)"
    RELEASE_URL="$(echo "${json}" | sed -n 's/.*"html_url"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)"
  fi

  [[ -n "${RELEASE_TITLE}" ]] || RELEASE_TITLE="${TARGET_TAG}"
  [[ -n "${RELEASE_PUBLISHED_AT}" ]] || RELEASE_PUBLISHED_AT="unknown"
  [[ -n "${RELEASE_URL}" ]] || RELEASE_URL="https://github.com/${GH_OWNER}/sentinel/releases/tag/${TARGET_TAG}"
  [[ -n "${RELEASE_HIGHLIGHTS}" ]] || RELEASE_HIGHLIGHTS="- Release notes did not include parsable bullet/headline highlights."
}

extract_deployment_notes() {
  DEPLOYMENT_NOTES=""

  if [[ -f "${README_PATH}" ]]; then
    local update_line rollback_line smoke_line logs_line

    update_line="$(awk '
      /^## Update/ {in_update=1; next}
      /^## / && in_update {in_update=0}
      in_update && /automatic pre-update backup/ {print; exit}
    ' "${README_PATH}")"

    rollback_line="$(awk '
      /^## Rollback/ {in_rollback=1; next}
      /^## / && in_rollback {in_rollback=0}
      in_rollback && /^\.\/rollback\.sh/ {print; exit}
    ' "${README_PATH}")"

    smoke_line="$(awk '
      /^## Health check/ {in_health=1; next}
      /^## / && in_health {in_health=0}
      in_health && /^curl -f http:\/\/127\.0\.0\.1\/healthz/ {print; exit}
    ' "${README_PATH}")"

    logs_line="$(awk '
      /^## Service management/ {in_services=1; next}
      /^## / && in_services {in_services=0}
      in_services && /sudo systemctl status sentinel-appliance\.service/ {print; exit}
    ' "${README_PATH}")"

    if [[ -n "${update_line}" ]]; then
      DEPLOYMENT_NOTES+="- ${update_line}"$'\n'
    else
      DEPLOYMENT_NOTES+="- Update flow performs pre-update backup, migration deploy checks, and health gates."$'\n'
    fi

    if [[ -n "${rollback_line}" ]]; then
      DEPLOYMENT_NOTES+="- Rollback command: ${rollback_line}"$'\n'
    else
      DEPLOYMENT_NOTES+="- Rollback command: ./rollback.sh"$'\n'
    fi

    if [[ -n "${smoke_line}" ]]; then
      DEPLOYMENT_NOTES+="- Post-upgrade health check: ${smoke_line}"$'\n'
    else
      DEPLOYMENT_NOTES+="- Post-upgrade health check: curl -f http://127.0.0.1/healthz"$'\n'
    fi

    if [[ -n "${logs_line}" ]]; then
      DEPLOYMENT_NOTES+="- Status/logs: ${logs_line}"$'\n'
    else
      DEPLOYMENT_NOTES+="- Status/logs: sudo systemctl status sentinel-appliance.service"$'\n'
    fi
  else
    DEPLOYMENT_NOTES+="- Deployment README not found at ${README_PATH}"$'\n'
    DEPLOYMENT_NOTES+="- Rollback command: /opt/sentinel/deploy/rollback.sh"$'\n'
    DEPLOYMENT_NOTES+="- Health check: curl -f http://127.0.0.1/healthz"$'\n'
  fi
}

show_release_brief_terminal() {
  echo
  echo "Release Brief"
  echo "  Title: ${RELEASE_TITLE}"
  echo "  Tag: ${TARGET_TAG}"
  echo "  Published: ${RELEASE_PUBLISHED_AT}"
  echo
  echo "Top changes:"
  printf '%s\n' "${RELEASE_HIGHLIGHTS}"
  echo
  echo "Deployment notes:"
  printf '%s\n' "${DEPLOYMENT_NOTES}" | sed '/^$/d'
  echo
  echo "Full release notes: ${RELEASE_URL}"
  echo "Deployment README: ${README_PATH}"
  echo
}

show_release_brief_zenity() {
  local text
  text="Release Brief\n\nTitle: ${RELEASE_TITLE}\nTag: ${TARGET_TAG}\nPublished: ${RELEASE_PUBLISHED_AT}\n\nTop changes:\n${RELEASE_HIGHLIGHTS}\n\nDeployment notes:\n${DEPLOYMENT_NOTES}\nFull release notes: ${RELEASE_URL}\nDeployment README: ${README_PATH}"

  zenity --info \
    --title='Upgrade Sentinel - Release Brief' \
    --width=980 \
    --height=640 \
    --text="${text}" >/dev/null

  while true; do
    local selection=""
    if ! selection="$(zenity --question \
      --title='Upgrade Sentinel - Docs' \
      --width=620 \
      --ok-label='Continue' \
      --cancel-label='Cancel' \
      --extra-button='Open Release Notes' \
      --extra-button='Open Deployment README' \
      --text='Open full docs before continuing?')"; then
      exit 1
    fi

    case "${selection}" in
      'Open Release Notes')
        open_document "${RELEASE_URL}"
        ;;
      'Open Deployment README')
        open_document "${README_PATH}"
        ;;
      *)
        break
        ;;
    esac
  done
}

prompt_select_terminal() {
  local default_latest="${1}"
  local choice=""

  echo
  echo "Upgrade Sentinel"
  echo "Select target release mode:"
  echo "  1) Latest stable (${default_latest})"
  echo "  2) Choose from recent releases"
  echo "  3) Enter a specific version tag"
  read -r -p "Choice [1]: " choice
  choice="${choice:-1}"

  case "${choice}" in
    1)
      TARGET_TAG="${default_latest}"
      ;;
    2)
      mapfile -t tags < <(fetch_recent_release_tags "${GH_OWNER}")
      [[ "${#tags[@]}" -gt 0 ]] || die "No release tags found"
      echo
      echo "Recent release tags:"
      local i
      for i in "${!tags[@]}"; do
        printf '  %d) %s\n' "$((i + 1))" "${tags[$i]}"
      done
      read -r -p "Select tag [1]: " choice
      choice="${choice:-1}"
      [[ "${choice}" =~ ^[0-9]+$ ]] || die "Invalid selection"
      (( choice >= 1 && choice <= ${#tags[@]} )) || die "Selection out of range"
      TARGET_TAG="${tags[$((choice - 1))]}"
      ;;
    3)
      read -r -p "Enter version tag (vX.Y.Z): " TARGET_TAG
      ;;
    *)
      die "Invalid selection"
      ;;
  esac
}

prompt_advanced_terminal() {
  local input=""

  read -r -p "Enable observability stack? [Y/n]: " input
  if [[ "${input,,}" == "n" ]]; then
    WITH_OBS="false"
  fi

  read -r -p "Publish Grafana on LAN? [Y/n]: " input
  if [[ "${input,,}" == "n" ]]; then
    ALLOW_GRAFANA_LAN="false"
  fi

  read -r -p "Publish Wiki on LAN? [Y/n]: " input
  if [[ "${input,,}" == "n" ]]; then
    ALLOW_WIKI_LAN="false"
  fi

  read -r -p "Dry run only (no install/update)? [y/N]: " input
  if [[ "${input,,}" == "y" ]]; then
    DRY_RUN="true"
  fi
}

prompt_select_zenity() {
  local default_latest="${1}"
  local mode

  mode="$(zenity --list --radiolist \
    --title='Upgrade Sentinel' \
    --text='Choose target release mode' \
    --column='Pick' --column='Mode' --column='Description' \
    TRUE latest "Latest stable (${default_latest})" \
    FALSE recent 'Choose from recent releases' \
    FALSE manual 'Enter a specific version tag' \
    --height=300 --width=760)" || exit 1

  case "${mode}" in
    latest)
      TARGET_TAG="${default_latest}"
      ;;
    recent)
      mapfile -t tags < <(fetch_recent_release_tags "${GH_OWNER}")
      [[ "${#tags[@]}" -gt 0 ]] || die "No release tags found"

      local list_args=()
      local tag
      for tag in "${tags[@]}"; do
        list_args+=(FALSE "${tag}" "Sentinel release")
      done

      TARGET_TAG="$(zenity --list --radiolist \
        --title='Upgrade Sentinel' \
        --text='Select a release tag' \
        --column='Pick' --column='Tag' --column='Notes' \
        "${list_args[@]}" \
        --height=420 --width=760)" || exit 1
      ;;
    manual)
      TARGET_TAG="$(zenity --entry \
        --title='Upgrade Sentinel' \
        --text='Enter target version tag (vX.Y.Z)' \
        --entry-text='v1.4.4')" || exit 1
      ;;
    *)
      die "Invalid mode selection"
      ;;
  esac
}

prompt_advanced_zenity() {
  local selected
  selected="$(zenity --list --checklist \
    --title='Upgrade Sentinel - Advanced Options' \
    --text='Configure upgrade options' \
    --column='Enabled' --column='Option' --column='Explanation' \
    TRUE OBS 'Observability stack (--with-obs): deploy/keep Grafana, Prometheus, Loki, Promtail' \
    TRUE GRAFANA 'Publish Grafana on LAN (--allow-grafana-lan)' \
    TRUE WIKI 'Publish Wiki on LAN (--allow-wiki-lan)' \
    FALSE DRYRUN 'Dry run: validate release + checksum + preflight without install/update' \
    --separator='|' --height=420 --width=980)" || exit 1

  WITH_OBS="false"
  ALLOW_GRAFANA_LAN="false"
  ALLOW_WIKI_LAN="false"
  DRY_RUN="false"

  if [[ "|${selected}|" == *"|OBS|"* ]]; then
    WITH_OBS="true"
  fi
  if [[ "|${selected}|" == *"|GRAFANA|"* ]]; then
    ALLOW_GRAFANA_LAN="true"
  fi
  if [[ "|${selected}|" == *"|WIKI|"* ]]; then
    ALLOW_WIKI_LAN="true"
  fi
  if [[ "|${selected}|" == *"|DRYRUN|"* ]]; then
    DRY_RUN="true"
  fi
}

confirm_summary_terminal() {
  echo
  echo "Upgrade summary:"
  echo "  Owner: ${GH_OWNER}"
  echo "  Target: ${TARGET_TAG}"
  echo "  Observability stack: ${WITH_OBS}"
  echo "  Publish Grafana on LAN: ${ALLOW_GRAFANA_LAN}"
  echo "  Publish Wiki on LAN: ${ALLOW_WIKI_LAN}"
  echo "  Dry run: ${DRY_RUN}"
  echo
  echo "Release brief:"
  echo "  ${RELEASE_TITLE} (${RELEASE_PUBLISHED_AT})"
  echo "  ${RELEASE_URL}"
  echo
  echo "Deployment notes:"
  printf '%s\n' "${DEPLOYMENT_NOTES}" | sed '/^$/d'
  echo

  local input=""
  read -r -p "Proceed with package install and update? [Y/n]: " input
  if [[ "${input,,}" == "n" ]]; then
    exit 1
  fi
}

confirm_summary_zenity() {
  local text
  text="Owner: ${GH_OWNER}\nTarget: ${TARGET_TAG}\nObservability stack: ${WITH_OBS}\nPublish Grafana on LAN: ${ALLOW_GRAFANA_LAN}\nPublish Wiki on LAN: ${ALLOW_WIKI_LAN}\nDry run: ${DRY_RUN}\n\nRelease brief:\n${RELEASE_TITLE} (${RELEASE_PUBLISHED_AT})\n${RELEASE_URL}\n\nDeployment notes:\n${DEPLOYMENT_NOTES}\nProceed with package install and update?"

  zenity --question \
    --title='Upgrade Sentinel - Confirm' \
    --width=860 \
    --height=560 \
    --text="${text}" || exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --latest)
      USE_LATEST="true"
      shift
      ;;
    --version)
      TARGET_TAG="${2:-}"
      shift 2
      ;;
    --version=*)
      TARGET_TAG="${1#*=}"
      shift
      ;;
    --owner)
      GH_OWNER="${2:-}"
      shift 2
      ;;
    --owner=*)
      GH_OWNER="${1#*=}"
      shift
      ;;
    --with-obs)
      WITH_OBS="true"
      shift
      ;;
    --without-obs)
      WITH_OBS="false"
      shift
      ;;
    --allow-grafana-lan)
      ALLOW_GRAFANA_LAN="true"
      shift
      ;;
    --disallow-grafana-lan)
      ALLOW_GRAFANA_LAN="false"
      shift
      ;;
    --allow-wiki-lan)
      ALLOW_WIKI_LAN="true"
      shift
      ;;
    --disallow-wiki-lan)
      ALLOW_WIKI_LAN="false"
      shift
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
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

if [[ -n "${TARGET_TAG}" && "${USE_LATEST}" == "true" ]]; then
  die "Use either --latest or --version, not both"
fi

if [[ -z "${GH_OWNER}" ]]; then
  GH_OWNER="$(read_env_value GHCR_OWNER)"
fi
if [[ -z "${GH_OWNER}" ]]; then
  GH_OWNER="deadshotomega"
fi

run_preflight_checks "${GH_OWNER}"

DEFAULT_LATEST="$(fetch_latest_release_tag "${GH_OWNER}")"
validate_tag "${DEFAULT_LATEST}" || die "Unable to resolve latest stable release tag"

if [[ "${USE_LATEST}" == "true" ]]; then
  TARGET_TAG="${DEFAULT_LATEST}"
fi

if [[ -z "${TARGET_TAG}" ]]; then
  if can_use_zenity; then
    prompt_select_zenity "${DEFAULT_LATEST}"
    prompt_advanced_zenity
  else
    prompt_select_terminal "${DEFAULT_LATEST}"
    prompt_advanced_terminal
  fi
fi

validate_tag "${TARGET_TAG}" || die "Invalid target tag '${TARGET_TAG}'. Expected format vX.Y.Z"

if RELEASE_JSON="$(api_get "https://api.github.com/repos/${GH_OWNER}/sentinel/releases/tags/${TARGET_TAG}")"; then
  extract_release_brief "${RELEASE_JSON}"
else
  warn "Unable to fetch release notes for ${TARGET_TAG}; showing deployment notes only."
  RELEASE_TITLE="${TARGET_TAG}"
  RELEASE_PUBLISHED_AT="unknown"
  RELEASE_URL="https://github.com/${GH_OWNER}/sentinel/releases/tag/${TARGET_TAG}"
  RELEASE_HIGHLIGHTS="- Release notes unavailable from GitHub API right now."
fi

extract_deployment_notes

if can_use_zenity; then
  show_release_brief_zenity
  confirm_summary_zenity
else
  show_release_brief_terminal
  confirm_summary_terminal
fi

if [[ -z "${RELEASE_JSON}" ]]; then
  die "Cannot continue without release metadata (GitHub API unavailable for selected tag)."
fi

DEB_URL="$(select_deb_asset_url "${RELEASE_JSON}")" || \
  die "No supported .deb asset found in release ${TARGET_TAG}"
CHECKSUM_URL="$(select_checksum_asset_url "${RELEASE_JSON}")" || \
  die "No checksum asset found in release ${TARGET_TAG}"

WORK_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "${WORK_DIR}"
}
trap cleanup EXIT

DEB_FILE="${WORK_DIR}/$(basename "${DEB_URL}")"
CHECKSUM_FILE="${WORK_DIR}/$(basename "${CHECKSUM_URL}")"

log "Downloading package: $(basename "${DEB_URL}")"
curl -fL --retry 3 --retry-delay 1 -o "${DEB_FILE}" "${DEB_URL}"

log "Downloading checksum file: $(basename "${CHECKSUM_URL}")"
curl -fL --retry 3 --retry-delay 1 -o "${CHECKSUM_FILE}" "${CHECKSUM_URL}"

EXPECTED_HASH="$(awk -v file="$(basename "${DEB_FILE}")" '
  {
    gsub("*", "", $2)
    if ($2 == file) {
      print $1
      exit
    }
  }
' "${CHECKSUM_FILE}")"

[[ -n "${EXPECTED_HASH}" ]] || die "Checksum entry for $(basename "${DEB_FILE}") not found"

ACTUAL_HASH="$(sha256sum "${DEB_FILE}" | awk '{print $1}')"
if [[ "${EXPECTED_HASH}" != "${ACTUAL_HASH}" ]]; then
  die "Checksum mismatch for $(basename "${DEB_FILE}")"
fi
log "Checksum verified"

if [[ "${DRY_RUN}" == "true" ]]; then
  log "Dry run complete. No package install or update actions were performed."
  exit 0
fi

log "Installing package: $(basename "${DEB_FILE}")"
if ! sudo dpkg -i "${DEB_FILE}"; then
  log "dpkg reported missing dependencies; attempting apt fix"
  sudo apt-get update -y
  sudo apt-get -f install -y
  sudo dpkg -i "${DEB_FILE}"
fi

UPDATED_SCRIPT="/opt/sentinel/deploy/update.sh"
[[ -x "${UPDATED_SCRIPT}" ]] || die "Updated deploy script missing: ${UPDATED_SCRIPT}"

UPDATE_ARGS=(--version "${TARGET_TAG}")
if [[ "${WITH_OBS}" == "true" ]]; then
  UPDATE_ARGS+=(--with-obs)
else
  UPDATE_ARGS+=(--without-obs)
fi
if [[ "${ALLOW_GRAFANA_LAN}" == "true" ]]; then
  UPDATE_ARGS+=(--allow-grafana-lan)
else
  UPDATE_ARGS+=(--disallow-grafana-lan)
fi
if [[ "${ALLOW_WIKI_LAN}" == "true" ]]; then
  UPDATE_ARGS+=(--allow-wiki-lan)
else
  UPDATE_ARGS+=(--disallow-wiki-lan)
fi

log "Running updated deploy script: ${UPDATED_SCRIPT} ${UPDATE_ARGS[*]}"
if ! "${UPDATED_SCRIPT}" "${UPDATE_ARGS[@]}"; then
  echo
  echo "[upgrade] Update failed. Recovery options:"
  echo "[upgrade] 1) Inspect service status: sudo systemctl status sentinel-appliance.service"
  echo "[upgrade] 2) Inspect deploy logs: cd /opt/sentinel/deploy && docker compose logs --tail=120"
  echo "[upgrade] 3) Roll back: cd /opt/sentinel/deploy && ./rollback.sh"
  exit 1
fi

log "Upgrade completed successfully"
