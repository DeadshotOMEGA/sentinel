#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="/opt/sentinel/deploy"

TARGET_VERSION=""
CLI_WITH_OBS=""
CLI_ALLOW_GRAFANA_LAN=""
CLI_ALLOW_WIKI_LAN=""
NO_WAIT="false"
SYNCED="false"

usage() {
  cat <<USAGE
Usage: ./update.sh --version vX.Y.Z [options]

This compatibility wrapper now forwards to the packaged Sentinel updater.

Options:
  --version <tag>          Required explicit release tag (vX.Y.Z)
  --with-obs               Enable observability profile override
  --without-obs            Disable observability profile override
  --allow-grafana-lan      Enable Grafana LAN publish override
  --disallow-grafana-lan   Disable Grafana LAN publish override
  --allow-wiki-lan         Enable Wiki.js LAN publish override
  --disallow-wiki-lan      Disable Wiki.js LAN publish override
  --no-wait                Queue the update and exit without waiting
  --synced                 Internal flag used after syncing to /opt/sentinel/deploy
USAGE
}

die() {
  printf '[sentinel][error] %s\n' "$*" >&2
  exit 1
}

warn() {
  printf '[sentinel][warn] %s\n' "$*" >&2
}

log() {
  printf '[sentinel] %s\n' "$*"
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

run_updater_readonly() {
  local updater_cli="${1}"
  shift
  env SENTINEL_DEPLOY_DIR="${SCRIPT_DIR}" "${updater_cli}" "$@"
}

json_field() {
  local field="${1}"
  python3 -c 'import json, sys; payload = json.load(sys.stdin); value = payload.get(sys.argv[1]); print("" if value is None else value)' "${field}"
}

sync_into_target_dir() {
  local preserved_env=""
  local preserved_state=""
  local had_target_env="false"
  local had_target_state="false"

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
}

wait_for_terminal_job() {
  local updater_cli="${1}" job_id="${2}"
  local last_status=""
  local last_message=""

  while true; do
    local job_json job_status job_message
    job_json="$(run_updater_readonly "${updater_cli}" show-job "${job_id}" 2>/dev/null || true)"
    if [[ -z "${job_json}" || "${job_json}" == "null" ]]; then
      sleep 2
      continue
    fi

    job_status="$(printf '%s' "${job_json}" | json_field status)"
    job_message="$(printf '%s' "${job_json}" | json_field message)"
    if [[ "${job_status}" != "${last_status}" || "${job_message}" != "${last_message}" ]]; then
      printf '[sentinel] Update status: %s - %s\n' "${job_status}" "${job_message}" >&2
      last_status="${job_status}"
      last_message="${job_message}"
    fi

    case "${job_status}" in
      completed|failed|rollback_attempted|rolled_back)
        printf '%s\n' "${job_status}"
        return 0
        ;;
    esac

    sleep 3
  done
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
    --no-wait)
      NO_WAIT="true"
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
[[ "${TARGET_VERSION}" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "--version must be an explicit vX.Y.Z tag"

if [[ "${SYNCED}" != "true" && "${SCRIPT_DIR}" != "${TARGET_DIR}" ]]; then
  sync_into_target_dir

  reexec_args=(--version "${TARGET_VERSION}" --synced)
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
  if [[ "${NO_WAIT}" == "true" ]]; then
    reexec_args+=(--no-wait)
  fi

  exec "${TARGET_DIR}/update.sh" "${reexec_args[@]}"
fi

warn "update.sh is now a compatibility wrapper around the packaged Sentinel updater."

UPDATER_CLI="$(resolve_updater_cli)"
REQUESTED_BY="${SUDO_USER:-${USER:-Local operator}}"
QUEUE_ARGS=(enqueue-manual-update --version "${TARGET_VERSION}" --source cli --requested-by "${REQUESTED_BY}")

if [[ -n "${CLI_WITH_OBS}" ]]; then
  if [[ "${CLI_WITH_OBS}" == "true" ]]; then
    QUEUE_ARGS+=(--with-obs)
  else
    QUEUE_ARGS+=(--without-obs)
  fi
fi
if [[ -n "${CLI_ALLOW_GRAFANA_LAN}" ]]; then
  if [[ "${CLI_ALLOW_GRAFANA_LAN}" == "true" ]]; then
    QUEUE_ARGS+=(--allow-grafana-lan)
  else
    QUEUE_ARGS+=(--disallow-grafana-lan)
  fi
fi
if [[ -n "${CLI_ALLOW_WIKI_LAN}" ]]; then
  if [[ "${CLI_ALLOW_WIKI_LAN}" == "true" ]]; then
    QUEUE_ARGS+=(--allow-wiki-lan)
  else
    QUEUE_ARGS+=(--disallow-wiki-lan)
  fi
fi

QUEUE_JSON="$(run_updater_as_root "${UPDATER_CLI}" "${QUEUE_ARGS[@]}")"
JOB_ID="$(printf '%s' "${QUEUE_JSON}" | json_field jobId)"
LOG_PATH="$(printf '%s' "${QUEUE_JSON}" | json_field logPath)"
TRACE_PATH="$(printf '%s' "${QUEUE_JSON}" | json_field tracePath)"

log "Queued Sentinel update job ${JOB_ID} for ${TARGET_VERSION}"
[[ -n "${LOG_PATH}" ]] && log "Log path: ${LOG_PATH}"
[[ -n "${TRACE_PATH}" ]] && log "Trace path: ${TRACE_PATH}"

if [[ "${NO_WAIT}" == "true" ]]; then
  exit 0
fi

FINAL_STATUS="$(wait_for_terminal_job "${UPDATER_CLI}" "${JOB_ID}")"
run_updater_readonly "${UPDATER_CLI}" show-last-report --operation update || true

case "${FINAL_STATUS}" in
  completed)
    exit 0
    ;;
  *)
    exit 1
    ;;
esac
