#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/_common.sh"

TARGET_VERSION=""
LAN_CIDR_OVERRIDE=""
NO_FIREWALL="false"
CLI_WITH_OBS=""
CLI_ALLOW_GRAFANA_LAN=""

usage() {
  cat <<USAGE
Usage: ./update.sh --version vX.Y.Z [options]

Options:
  --version <tag>          Required explicit image tag (vX.Y.Z)
  --lan-cidr <cidr>        Override stored LAN CIDR for firewall step
  --with-obs               Enable observability profile
  --without-obs            Disable observability profile
  --allow-grafana-lan      Publish Grafana on LAN (implies --with-obs)
  --disallow-grafana-lan   Disable Grafana LAN publish override
  --no-firewall            Skip UFW update
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      TARGET_VERSION="${2:-}"
      shift 2
      ;;
    --lan-cidr)
      LAN_CIDR_OVERRIDE="${2:-}"
      shift 2
      ;;
    --with-obs)
      CLI_WITH_OBS="true"
      shift
      ;;
    --without-obs)
      CLI_WITH_OBS="false"
      shift
      ;;
    --allow-grafana-lan)
      CLI_ALLOW_GRAFANA_LAN="true"
      CLI_WITH_OBS="true"
      shift
      ;;
    --disallow-grafana-lan)
      CLI_ALLOW_GRAFANA_LAN="false"
      shift
      ;;
    --no-firewall)
      NO_FIREWALL="true"
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

ensure_docker_and_compose_v2

if ! check_ghcr_reachability; then
  print_captive_portal_help
  die "Cannot reach ghcr.io"
fi

ensure_env_file
load_state

if [[ -n "${CLI_WITH_OBS}" ]]; then
  WITH_OBS="${CLI_WITH_OBS}"
fi
if [[ -n "${CLI_ALLOW_GRAFANA_LAN}" ]]; then
  ALLOW_GRAFANA_LAN="${CLI_ALLOW_GRAFANA_LAN}"
fi

set_compose_file_args

if [[ -z "${TARGET_VERSION}" ]]; then
  die "--version is required"
fi
require_explicit_version "${TARGET_VERSION}"

CURRENT_VERSION="$(env_value SENTINEL_VERSION)"
require_explicit_version "${CURRENT_VERSION}"

if [[ "${CURRENT_VERSION}" == "${TARGET_VERSION}" ]]; then
  warn "Target version matches current version (${CURRENT_VERSION}); continuing anyway."
fi

log "Creating pre-update backup"
"${SCRIPT_DIR}/backup.sh"

PREVIOUS_VERSION="${CURRENT_VERSION}"
CURRENT_VERSION="${TARGET_VERSION}"
upsert_env "SENTINEL_VERSION" "${TARGET_VERSION}"

LAN_CIDR="${LAN_CIDR_OVERRIDE}"
if [[ -z "${LAN_CIDR}" ]]; then
  LAN_CIDR="$(env_value LAN_CIDR)"
fi
if [[ -z "${LAN_CIDR}" ]]; then
  LAN_CIDR="$(detect_lan_cidr || true)"
fi
[[ -n "${LAN_CIDR}" ]] || LAN_CIDR="192.168.0.0/16"
upsert_env "LAN_CIDR" "${LAN_CIDR}"

SERVER_IP="$(detect_server_ip || true)"
if [[ -n "${SERVER_IP}" ]]; then
  CURRENT_CORS="$(env_value CORS_ORIGIN "http://sentinel.local,http://localhost,http://127.0.0.1")"
  if [[ ",${CURRENT_CORS}," != *",http://${SERVER_IP},"* ]]; then
    upsert_env "CORS_ORIGIN" "${CURRENT_CORS},http://${SERVER_IP}"
  fi
fi

save_state

ensure_compose_pull_with_login_fallback
compose up -d

run_safe_migrations

if ! wait_for_healthz 240; then
  print_health_diagnostics
  die "Update failed health gate check at /healthz"
fi

if command -v systemctl >/dev/null 2>&1; then
  write_systemd_unit
fi

if [[ "${NO_FIREWALL}" != "true" ]]; then
  configure_firewall "${LAN_CIDR}"
fi

log "Update complete: ${PREVIOUS_VERSION} -> ${CURRENT_VERSION}"
