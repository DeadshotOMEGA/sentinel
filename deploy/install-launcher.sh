#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"

read_env_version() {
  if [[ -f "${ENV_FILE}" ]]; then
    grep -E '^SENTINEL_VERSION=' "${ENV_FILE}" | cut -d= -f2- || true
  fi
}

read_env_ghcr_owner() {
  if [[ -f "${ENV_FILE}" ]]; then
    grep -E '^GHCR_OWNER=' "${ENV_FILE}" | cut -d= -f2- || true
  fi
}

fetch_latest_release_version() {
  local owner="${1:-deadshotomega}"
  curl -fsSL --max-time 8 "https://api.github.com/repos/${owner}/sentinel/releases/latest" \
    | sed -n 's/.*"tag_name":[[:space:]]*"\(v[^"]*\)".*/\1/p' \
    | head -n1
}

prompt_version_terminal() {
  local default_version="${1:-v1.0.0}"
  local version=""
  printf '\nSentinel Install Launcher\n'
  printf 'Enter release version tag (example: v1.1.10)\n'
  read -r -p "Version [${default_version}]: " version
  if [[ -z "${version}" ]]; then
    version="${default_version}"
  fi
  printf '%s\n' "${version}"
}

prompt_version_zenity() {
  local default_version="${1:-v1.0.0}"
  zenity --entry \
    --title="Install Sentinel Appliance" \
    --text="Enter Sentinel version tag (example: v1.1.10):" \
    --entry-text="${default_version}"
}

DEFAULT_VERSION="$(read_env_version)"
if [[ -z "${DEFAULT_VERSION}" ]]; then
  GHCR_OWNER="$(read_env_ghcr_owner)"
  if [[ -z "${GHCR_OWNER}" ]]; then
    GHCR_OWNER="deadshotomega"
  fi
  DEFAULT_VERSION="$(fetch_latest_release_version "${GHCR_OWNER}" || true)"
fi
if [[ -z "${DEFAULT_VERSION}" ]]; then
  DEFAULT_VERSION="v1.0.0"
fi

VERSION=""
if command -v zenity >/dev/null 2>&1; then
  VERSION="$(prompt_version_zenity "${DEFAULT_VERSION}" || true)"
  if [[ -z "${VERSION}" ]]; then
    exit 1
  fi
else
  VERSION="$(prompt_version_terminal "${DEFAULT_VERSION}")"
fi

if [[ -z "${VERSION}" || "${VERSION}" == "latest" ]]; then
  printf 'Invalid version: must be explicit SemVer tag like v1.1.8\n' >&2
  exit 1
fi

cd "${SCRIPT_DIR}"
exec ./install.sh --version "${VERSION}"
