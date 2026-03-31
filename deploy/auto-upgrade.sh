#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
UPGRADE_LAUNCHER="${SCRIPT_DIR}/upgrade-launcher.sh"

log() {
  printf '[auto-upgrade] %s\n' "$*"
}

die() {
  printf '[auto-upgrade][error] %s\n' "$*" >&2
  exit 1
}

env_value() {
  local key="${1}" default_value="${2:-}"
  local value=""
  if [[ -f "${ENV_FILE}" ]]; then
    value="$(grep -E "^${key}=" "${ENV_FILE}" | cut -d= -f2- || true)"
  fi
  if [[ -n "${value}" ]]; then
    printf '%s\n' "${value}"
  else
    printf '%s\n' "${default_value}"
  fi
}

validate_tag() {
  local tag="${1:-}"
  [[ "${tag}" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]
}

normalize_bool() {
  local value="${1:-}"
  value="$(printf '%s' "${value}" | tr '[:upper:]' '[:lower:]' | tr -d '\r' | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"
  case "${value}" in
    1|true|yes|y|on) printf 'true\n' ;;
    *) printf 'false\n' ;;
  esac
}

fetch_latest_release_tag() {
  local owner="${1}"
  curl -fsSL \
    -H 'Accept: application/vnd.github+json' \
    -H 'X-GitHub-Api-Version: 2022-11-28' \
    "https://api.github.com/repos/${owner}/sentinel/releases/latest" \
    | sed -n 's/.*"tag_name"[[:space:]]*:[[:space:]]*"\(v[^"]*\)".*/\1/p' \
    | head -n1
}

[[ -x "${UPGRADE_LAUNCHER}" ]] || die "Missing executable upgrade launcher: ${UPGRADE_LAUNCHER}"
command -v curl >/dev/null 2>&1 || die "curl is required"

GH_OWNER="${GH_OWNER:-$(env_value GHCR_OWNER deadshotomega)}"
CURRENT_VERSION="$(env_value SENTINEL_VERSION)"
LATEST_VERSION="$(fetch_latest_release_tag "${GH_OWNER}" || true)"

validate_tag "${CURRENT_VERSION}" || die "Invalid current SENTINEL_VERSION '${CURRENT_VERSION}' in ${ENV_FILE}"
validate_tag "${LATEST_VERSION}" || die "Unable to resolve latest release tag from GitHub for ${GH_OWNER}/sentinel"

if [[ "${CURRENT_VERSION}" == "${LATEST_VERSION}" ]]; then
  log "Already up to date (${CURRENT_VERSION}). No action required."
  exit 0
fi

WITH_OBS="$(normalize_bool "${AUTO_UPGRADE_WITH_OBS:-true}")"
ALLOW_GRAFANA_LAN="$(normalize_bool "${AUTO_UPGRADE_ALLOW_GRAFANA_LAN:-true}")"
ALLOW_WIKI_LAN="$(normalize_bool "${AUTO_UPGRADE_ALLOW_WIKI_LAN:-true}")"

UPGRADE_ARGS=(--latest --yes)

if [[ "${WITH_OBS}" == "true" ]]; then
  UPGRADE_ARGS+=(--with-obs)
else
  UPGRADE_ARGS+=(--without-obs)
fi

if [[ "${ALLOW_GRAFANA_LAN}" == "true" ]]; then
  UPGRADE_ARGS+=(--allow-grafana-lan)
else
  UPGRADE_ARGS+=(--disallow-grafana-lan)
fi

if [[ "${ALLOW_WIKI_LAN}" == "true" ]]; then
  UPGRADE_ARGS+=(--allow-wiki-lan)
else
  UPGRADE_ARGS+=(--disallow-wiki-lan)
fi

log "Current ${CURRENT_VERSION}; latest ${LATEST_VERSION}. Starting automated upgrade."
"${UPGRADE_LAUNCHER}" "${UPGRADE_ARGS[@]}"
log "Automated upgrade completed."
