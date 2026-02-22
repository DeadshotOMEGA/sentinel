#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="/opt/sentinel/deploy"

TARGET_VERSION=""
LAN_CIDR_OVERRIDE=""
CLI_WITH_OBS="false"
CLI_ALLOW_GRAFANA_LAN="false"
NO_FIREWALL="false"
SYNCED="false"

usage() {
  cat <<USAGE
Usage: ./install.sh --version vX.Y.Z [options]

Options:
  --version <tag>          Required explicit image tag (vX.Y.Z)
  --lan-cidr <cidr>        Override auto-detected LAN CIDR
  --with-obs               Enable observability profile
  --allow-grafana-lan      Publish Grafana on LAN (implies --with-obs)
  --no-firewall            Skip UFW LAN-only rule configuration
  --synced                 Internal flag used after copying to /opt/sentinel/deploy
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
    --lan-cidr)
      LAN_CIDR_OVERRIDE="${2:-}"
      shift 2
      ;;
    --with-obs)
      CLI_WITH_OBS="true"
      shift
      ;;
    --allow-grafana-lan)
      CLI_ALLOW_GRAFANA_LAN="true"
      CLI_WITH_OBS="true"
      shift
      ;;
    --no-firewall)
      NO_FIREWALL="true"
      shift
      ;;
    --synced)
      SYNCED="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -n "${TARGET_VERSION}" ]]; then
  TARGET_VERSION="$(normalize_version_value "${TARGET_VERSION}")"
fi

if [[ "${SYNCED}" != "true" && "${SCRIPT_DIR}" != "${TARGET_DIR}" ]]; then
  if [[ "${EUID}" -eq 0 ]]; then
    mkdir -p /opt/sentinel
    rm -rf "${TARGET_DIR}"
    mkdir -p "${TARGET_DIR}"
    cp -a "${SCRIPT_DIR}/." "${TARGET_DIR}/"
  else
    sudo mkdir -p /opt/sentinel
    sudo rm -rf "${TARGET_DIR}"
    sudo mkdir -p "${TARGET_DIR}"
    sudo cp -a "${SCRIPT_DIR}/." "${TARGET_DIR}/"
    sudo chown -R "${USER}:${USER}" "${TARGET_DIR}"
  fi

  reexec_args=(--synced)
  if [[ -n "${TARGET_VERSION}" ]]; then
    reexec_args=(--version "${TARGET_VERSION}" --synced)
  fi
  if [[ -n "${LAN_CIDR_OVERRIDE}" ]]; then
    reexec_args+=(--lan-cidr "${LAN_CIDR_OVERRIDE}")
  fi
  if [[ "${CLI_WITH_OBS}" == "true" ]]; then
    reexec_args+=(--with-obs)
  fi
  if [[ "${CLI_ALLOW_GRAFANA_LAN}" == "true" ]]; then
    reexec_args+=(--allow-grafana-lan)
  fi
  if [[ "${NO_FIREWALL}" == "true" ]]; then
    reexec_args+=(--no-firewall)
  fi

  exec "${TARGET_DIR}/install.sh" "${reexec_args[@]}"
fi

# shellcheck disable=SC1091
source "${TARGET_DIR}/_common.sh"
WITH_OBS="${CLI_WITH_OBS}"
ALLOW_GRAFANA_LAN="${CLI_ALLOW_GRAFANA_LAN}"

log "Starting Sentinel appliance install"

if [[ -f /etc/os-release ]]; then
  # shellcheck disable=SC1091
  source /etc/os-release
  if [[ "${ID:-}" != "ubuntu" || "${VERSION_ID:-}" != "24.04" ]]; then
    warn "This installer targets Ubuntu 24.04. Detected ${ID:-unknown} ${VERSION_ID:-unknown}."
  fi
fi

ensure_docker_and_compose_v2

if ! check_ghcr_reachability; then
  print_captive_portal_help
  die "Cannot reach ghcr.io"
fi

ensure_env_file
bootstrap_env_defaults
write_admin_credentials_snapshot

if [[ -z "${TARGET_VERSION}" ]]; then
  TARGET_VERSION="$(grep -E '^SENTINEL_VERSION=' "${ENV_FILE}" | cut -d= -f2- || true)"
fi
TARGET_VERSION="$(normalize_version_value "${TARGET_VERSION}")"
require_explicit_version "${TARGET_VERSION}"
upsert_env "SENTINEL_VERSION" "${TARGET_VERSION}"

LAN_CIDR="${LAN_CIDR_OVERRIDE}"
if [[ -z "${LAN_CIDR}" ]]; then
  LAN_CIDR="$(grep -E '^LAN_CIDR=' "${ENV_FILE}" | cut -d= -f2- || true)"
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

CURRENT_VERSION="${TARGET_VERSION}"
PREVIOUS_VERSION=""
save_state
set_compose_file_args

ensure_compose_pull_with_login_fallback
compose up -d

run_bootstrap_schema_and_baseline

if ! wait_for_healthz 240; then
  print_health_diagnostics
  die "Install failed health gate check at /healthz"
fi

if command -v systemctl >/dev/null 2>&1; then
  write_systemd_unit
fi

if [[ "${NO_FIREWALL}" != "true" ]]; then
  configure_firewall "${LAN_CIDR}"
else
  warn "Skipping firewall configuration (--no-firewall)."
fi

if ! command -v avahi-daemon >/dev/null 2>&1; then
  run_root apt-get update -y >/dev/null 2>&1 || true
  run_root apt-get install -y avahi-daemon >/dev/null 2>&1 || true
  run_root systemctl enable --now avahi-daemon >/dev/null 2>&1 || true
fi

log "Install complete."
log "Version: ${TARGET_VERSION}"
log "Local URL (mDNS): http://sentinel.local"
if [[ -n "${SERVER_IP}" ]]; then
  log "Local URL (IP fallback): http://${SERVER_IP}"
fi
