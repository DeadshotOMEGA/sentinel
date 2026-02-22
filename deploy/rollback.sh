#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/_common.sh"

TARGET_VERSION=""

usage() {
  cat <<USAGE
Usage: ./rollback.sh [--version vX.Y.Z]

If --version is omitted, rollback uses PREVIOUS_VERSION from .appliance-state.
USAGE
}

normalize_version_value() {
  local raw="${1:-}"
  raw="${raw%%#*}"
  raw="$(printf '%s' "${raw}" | tr -d '\r' | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"
  raw="${raw%\"}"
  raw="${raw#\"}"
  raw="${raw%\'}"
  raw="${raw#\'}"
  printf '%s\n' "${raw}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      TARGET_VERSION="${2:-}"
      shift 2
      ;;
    --version=*)
      TARGET_VERSION="${1#*=}"
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

if [[ -n "${TARGET_VERSION}" ]]; then
  TARGET_VERSION="$(normalize_version_value "${TARGET_VERSION}")"
fi

ensure_docker_and_compose_v2
ensure_env_file
load_state
set_compose_file_args

CURRENT_VERSION="$(env_value SENTINEL_VERSION)"
CURRENT_VERSION="$(normalize_version_value "${CURRENT_VERSION}")"
require_explicit_version "${CURRENT_VERSION}"

if [[ -z "${TARGET_VERSION}" ]]; then
  TARGET_VERSION="${PREVIOUS_VERSION:-}"
fi
TARGET_VERSION="$(normalize_version_value "${TARGET_VERSION}")"

require_explicit_version "${TARGET_VERSION}"

log "Rolling back from ${CURRENT_VERSION} to ${TARGET_VERSION}"

PREV_FOR_SWAP="${CURRENT_VERSION}"
CURRENT_VERSION="${TARGET_VERSION}"
PREVIOUS_VERSION="${PREV_FOR_SWAP}"

upsert_env "SENTINEL_VERSION" "${TARGET_VERSION}"
save_state

ensure_compose_pull_with_login_fallback
compose up -d
run_bootstrap_sentinel_account

if ! wait_for_healthz 240; then
  print_health_diagnostics
  die "Rollback failed health gate check at /healthz"
fi

if command -v systemctl >/dev/null 2>&1; then
  write_systemd_unit
fi

log "Rollback complete. Current version: ${CURRENT_VERSION}"
warn "If database schema changed incompatibly, use restore.sh with a pre-update backup."
