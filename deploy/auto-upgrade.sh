#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"

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

resolve_updater_cli() {
  if [[ -x "/usr/lib/sentinel/sentinel-updater" ]]; then
    printf '%s\n' "/usr/lib/sentinel/sentinel-updater"
    return 0
  fi

  if [[ -x "${SCRIPT_DIR}/deb/assets/usr/lib/sentinel/sentinel-updater" ]]; then
    printf '%s\n' "${SCRIPT_DIR}/deb/assets/usr/lib/sentinel/sentinel-updater"
    return 0
  fi

  die "Unable to locate the packaged Sentinel updater CLI."
}

run_updater_as_root() {
  local updater_cli="${1}"
  shift

  if [[ "${EUID}" -eq 0 ]]; then
    env SENTINEL_DEPLOY_DIR="${SCRIPT_DIR}" "${updater_cli}" "$@"
  else
    sudo env SENTINEL_DEPLOY_DIR="${SCRIPT_DIR}" "${updater_cli}" "$@"
  fi
}

json_field() {
  local field="${1}"
  python3 -c 'import json, sys; payload = json.load(sys.stdin); value = payload.get(sys.argv[1]); print("" if value is None else value)' "${field}"
}

command -v curl >/dev/null 2>&1 || die "curl is required"

UPDATER_CLI="$(resolve_updater_cli)"
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

QUEUE_ARGS=(enqueue-manual-update --version "${LATEST_VERSION}" --source auto-upgrade --requested-by "Automatic upgrade")

if [[ "${WITH_OBS}" == "true" ]]; then
  QUEUE_ARGS+=(--with-obs)
else
  QUEUE_ARGS+=(--without-obs)
fi

if [[ "${ALLOW_GRAFANA_LAN}" == "true" ]]; then
  QUEUE_ARGS+=(--allow-grafana-lan)
else
  QUEUE_ARGS+=(--disallow-grafana-lan)
fi

if [[ "${ALLOW_WIKI_LAN}" == "true" ]]; then
  QUEUE_ARGS+=(--allow-wiki-lan)
else
  QUEUE_ARGS+=(--disallow-wiki-lan)
fi

log "Current ${CURRENT_VERSION}; latest ${LATEST_VERSION}. Queueing automated upgrade."
QUEUE_JSON="$(run_updater_as_root "${UPDATER_CLI}" "${QUEUE_ARGS[@]}")"
JOB_ID="$(printf '%s' "${QUEUE_JSON}" | json_field jobId)"
LOG_PATH="$(printf '%s' "${QUEUE_JSON}" | json_field logPath)"
TRACE_PATH="$(printf '%s' "${QUEUE_JSON}" | json_field tracePath)"
log "Automated upgrade request accepted as job ${JOB_ID}."
[[ -n "${LOG_PATH}" ]] && log "Log path: ${LOG_PATH}"
[[ -n "${TRACE_PATH}" ]] && log "Trace path: ${TRACE_PATH}"
