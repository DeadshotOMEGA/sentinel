#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="/opt/sentinel/deploy"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/_common.sh"

TARGET_VERSION=""
LAN_CIDR_OVERRIDE=""
NO_FIREWALL="false"
CLI_WITH_OBS=""
CLI_ALLOW_GRAFANA_LAN=""
CLI_ALLOW_WIKI_LAN=""
SYNCED="false"

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
  --allow-wiki-lan         Publish Wiki.js on LAN (port defaults to 3020)
  --disallow-wiki-lan      Disable Wiki.js LAN publish override
  --no-firewall            Skip UFW update
  --synced                 Internal flag used after syncing to /opt/sentinel/deploy
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
    --allow-wiki-lan)
      CLI_ALLOW_WIKI_LAN="true"
      shift
      ;;
    --disallow-wiki-lan)
      CLI_ALLOW_WIKI_LAN="false"
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
      die "Unknown option: $1"
      ;;
  esac
done

if [[ -n "${TARGET_VERSION}" ]]; then
  TARGET_VERSION="$(normalize_version_value "${TARGET_VERSION}")"
fi

if [[ "${SYNCED}" != "true" && "${SCRIPT_DIR}" != "${TARGET_DIR}" ]]; then
  preserved_env=""
  preserved_state=""
  had_target_env="false"
  had_target_state="false"
  if [[ -f "${TARGET_DIR}/.env" ]]; then
    had_target_env="true"
    preserved_env="$(mktemp)"
    if [[ "${EUID}" -eq 0 ]]; then
      cp -a "${TARGET_DIR}/.env" "${preserved_env}"
    else
      sudo cp -a "${TARGET_DIR}/.env" "${preserved_env}"
    fi
  fi
  if [[ -f "${TARGET_DIR}/.appliance-state" ]]; then
    had_target_state="true"
    preserved_state="$(mktemp)"
    if [[ "${EUID}" -eq 0 ]]; then
      cp -a "${TARGET_DIR}/.appliance-state" "${preserved_state}"
    else
      sudo cp -a "${TARGET_DIR}/.appliance-state" "${preserved_state}"
    fi
  fi

  if [[ "${EUID}" -eq 0 ]]; then
    mkdir -p "${TARGET_DIR}"
    cp -a "${SCRIPT_DIR}/." "${TARGET_DIR}/"
    if [[ -n "${preserved_env}" ]]; then
      cp -a "${preserved_env}" "${TARGET_DIR}/.env"
      rm -f "${preserved_env}"
    fi
    if [[ -n "${preserved_state}" ]]; then
      cp -a "${preserved_state}" "${TARGET_DIR}/.appliance-state"
      rm -f "${preserved_state}"
    fi
    if [[ "${had_target_env}" != "true" ]]; then
      rm -f "${TARGET_DIR}/.env"
    fi
    if [[ "${had_target_state}" != "true" ]]; then
      rm -f "${TARGET_DIR}/.appliance-state"
    fi
  else
    sudo mkdir -p "${TARGET_DIR}"
    sudo cp -a "${SCRIPT_DIR}/." "${TARGET_DIR}/"
    if [[ -n "${preserved_env}" ]]; then
      sudo cp -a "${preserved_env}" "${TARGET_DIR}/.env"
      rm -f "${preserved_env}"
    fi
    if [[ -n "${preserved_state}" ]]; then
      sudo cp -a "${preserved_state}" "${TARGET_DIR}/.appliance-state"
      rm -f "${preserved_state}"
    fi
    if [[ "${had_target_env}" != "true" ]]; then
      sudo rm -f "${TARGET_DIR}/.env"
    fi
    if [[ "${had_target_state}" != "true" ]]; then
      sudo rm -f "${TARGET_DIR}/.appliance-state"
    fi
    sudo chown -R "${USER}:${USER}" "${TARGET_DIR}"
  fi

  reexec_args=(--synced)
  if [[ -n "${TARGET_VERSION}" ]]; then
    reexec_args=(--version "${TARGET_VERSION}" --synced)
  fi
  if [[ -n "${LAN_CIDR_OVERRIDE}" ]]; then
    reexec_args+=(--lan-cidr "${LAN_CIDR_OVERRIDE}")
  fi
  if [[ -n "${CLI_WITH_OBS}" ]]; then
    if [[ "${CLI_WITH_OBS}" == "true" ]]; then
      reexec_args+=(--with-obs)
    else
      reexec_args+=(--without-obs)
    fi
  fi
  if [[ -n "${CLI_ALLOW_GRAFANA_LAN}" ]]; then
    if [[ "${CLI_ALLOW_GRAFANA_LAN}" == "true" ]]; then
      reexec_args+=(--allow-grafana-lan)
    else
      reexec_args+=(--disallow-grafana-lan)
    fi
  fi
  if [[ -n "${CLI_ALLOW_WIKI_LAN}" ]]; then
    if [[ "${CLI_ALLOW_WIKI_LAN}" == "true" ]]; then
      reexec_args+=(--allow-wiki-lan)
    else
      reexec_args+=(--disallow-wiki-lan)
    fi
  fi
  if [[ "${NO_FIREWALL}" == "true" ]]; then
    reexec_args+=(--no-firewall)
  fi

  exec "${TARGET_DIR}/update.sh" "${reexec_args[@]}"
fi

ensure_docker_and_compose_v2

if ! check_ghcr_reachability; then
  print_captive_portal_help
  die "Cannot reach ghcr.io"
fi

ensure_env_file
bootstrap_env_defaults
write_admin_credentials_snapshot
load_state

if [[ -n "${CLI_WITH_OBS}" ]]; then
  WITH_OBS="${CLI_WITH_OBS}"
fi
if [[ -n "${CLI_ALLOW_GRAFANA_LAN}" ]]; then
  ALLOW_GRAFANA_LAN="${CLI_ALLOW_GRAFANA_LAN}"
fi
if [[ -n "${CLI_ALLOW_WIKI_LAN}" ]]; then
  ALLOW_WIKI_LAN="${CLI_ALLOW_WIKI_LAN}"
fi

set_compose_file_args

if [[ -z "${TARGET_VERSION}" ]]; then
  die "--version is required"
fi
require_explicit_version "${TARGET_VERSION}"

CURRENT_VERSION="$(env_value SENTINEL_VERSION)"
CURRENT_VERSION="$(normalize_version_value "${CURRENT_VERSION}")"
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

APP_PUBLIC_URL_VALUE="$(env_value APP_PUBLIC_URL "http://$(env_value MDNS_HOSTNAME sentinel).local")"
CURRENT_CORS="$(env_value CORS_ORIGIN "${APP_PUBLIC_URL_VALUE},http://localhost,http://127.0.0.1")"
if [[ ",${CURRENT_CORS}," != *",${APP_PUBLIC_URL_VALUE},"* ]]; then
  CURRENT_CORS="${CURRENT_CORS},${APP_PUBLIC_URL_VALUE}"
fi

SERVER_IP="$(detect_server_ip || true)"
if [[ -n "${SERVER_IP}" && ",${CURRENT_CORS}," != *",http://${SERVER_IP},"* ]]; then
  CURRENT_CORS="${CURRENT_CORS},http://${SERVER_IP}"
fi
upsert_env "CORS_ORIGIN" "${CURRENT_CORS}"

save_state

ensure_compose_pull_with_login_fallback
compose up -d

run_safe_migrations

log "Re-applying bootstrap + default enum seed post-update (idempotent)"
run_bootstrap_sentinel_account

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

ensure_mdns_hostname
MDNS_HOSTNAME="$(env_value MDNS_HOSTNAME sentinel)"

log "Update complete: ${PREVIOUS_VERSION} -> ${CURRENT_VERSION}"
log "Local URL (mDNS): http://${MDNS_HOSTNAME}.local"
