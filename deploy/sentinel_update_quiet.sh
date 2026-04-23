#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SENTINEL_TARGET_VERSION="${SENTINEL_TARGET_VERSION:-}"

warn() {
  printf '[sentinel-update-quiet][warn] %s\n' "$*" >&2
}

die() {
  printf '[sentinel-update-quiet][error] %s\n' "$*" >&2
  exit 1
}

prompt_version() {
  local version=""
  if [[ -n "${SENTINEL_TARGET_VERSION}" ]]; then
    printf '%s\n' "${SENTINEL_TARGET_VERSION}"
    return 0
  fi

  read -r -p "Enter Sentinel version (vX.Y.Z): " version
  printf '%s\n' "${version}"
}

TARGET_VERSION="$(prompt_version)"
[[ "${TARGET_VERSION}" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "Version must be an explicit vX.Y.Z tag."

warn "sentinel_update_quiet.sh is deprecated and now forwards to ./update.sh."
exec "${SCRIPT_DIR}/update.sh" --version "${TARGET_VERSION}"
