#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"

GH_OWNER=""
TARGET_TAG=""
USE_LATEST="false"
WITH_OBS="true"
ALLOW_GRAFANA_LAN="true"
ALLOW_WIKI_LAN="true"
DRY_RUN="false"
AUTO_APPROVE="false"

usage() {
  cat <<USAGE
Usage: ./upgrade-launcher.sh [options]

This compatibility wrapper now resolves a target version and forwards to ./update.sh.

Options:
  --latest                  Upgrade to the latest stable release
  --version <vX.Y.Z>        Upgrade to a specific release tag
  --owner <github-owner>    GitHub owner/org (default from .env GHCR_OWNER)
  --with-obs                Enable observability profile (default)
  --without-obs             Disable observability profile
  --allow-grafana-lan       Publish Grafana on LAN (default)
  --disallow-grafana-lan    Disable Grafana LAN publish
  --allow-wiki-lan          Publish Wiki.js on LAN (default)
  --disallow-wiki-lan       Disable Wiki.js LAN publish
  --dry-run                 Print the resolved update command without queuing it
  --yes                     Non-interactive mode
USAGE
}

die() {
  printf '[upgrade][error] %s\n' "$*" >&2
  exit 1
}

warn() {
  printf '[upgrade][warn] %s\n' "$*" >&2
}

log() {
  printf '[upgrade] %s\n' "$*"
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
    --owner)
      GH_OWNER="${2:-}"
      shift 2
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
    --yes)
      AUTO_APPROVE="true"
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

warn "upgrade-launcher.sh is now a compatibility wrapper around ./update.sh."

if [[ -z "${GH_OWNER}" ]]; then
  GH_OWNER="$(read_env_value GHCR_OWNER)"
fi
if [[ -z "${GH_OWNER}" ]]; then
  GH_OWNER="deadshotomega"
fi

if [[ "${USE_LATEST}" == "true" || -z "${TARGET_TAG}" ]]; then
  TARGET_TAG="$(fetch_latest_release_tag "${GH_OWNER}" || true)"
fi
validate_tag "${TARGET_TAG}" || die "Unable to resolve a valid Sentinel release tag."

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

if [[ "${DRY_RUN}" == "true" ]]; then
  printf 'Resolved update target: %s\n' "${TARGET_TAG}"
  printf 'Command: %q ' "${SCRIPT_DIR}/update.sh" "${UPDATE_ARGS[@]}"
  printf '\n'
  exit 0
fi

if [[ "${AUTO_APPROVE}" != "true" ]]; then
  printf 'Queue Sentinel update to %s? [y/N] ' "${TARGET_TAG}"
  read -r reply
  [[ "${reply}" =~ ^[Yy]([Ee][Ss])?$ ]] || exit 1
fi

log "Forwarding upgrade request for ${TARGET_TAG} to ./update.sh"
exec "${SCRIPT_DIR}/update.sh" "${UPDATE_ARGS[@]}"
