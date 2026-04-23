#!/usr/bin/env bash
set -euo pipefail

SELF_PATH="$(readlink -f "${BASH_SOURCE[0]}")"
if [[ "${EUID}" -ne 0 ]]; then
  exec sudo "${SELF_PATH}" "$@"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/_common.sh"

OUTPUT_FILE=""
OUTPUT_DIR=""
SCOPE="all"
REPORT_SOURCE="manual"

usage() {
  cat <<USAGE
Usage: ./backup.sh [options]

Options:
  --scope <sentinel|wiki|all>  Backup target scope (default: all)
  --output <path>              Output file path for single-scope backup.
                               For --scope all, treated as output directory.
  --output-dir <path>          Output directory for generated backup files.
  --source <value>             Report source tag (default: manual)
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --scope)
      SCOPE="${2:-}"
      shift 2
      ;;
    --output)
      OUTPUT_FILE="${2:-}"
      shift 2
      ;;
    --output-dir)
      OUTPUT_DIR="${2:-}"
      shift 2
      ;;
    --source)
      REPORT_SOURCE="${2:-manual}"
      shift 2
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

case "${SCOPE}" in
  sentinel|wiki|all)
    ;;
  *)
    die "--scope must be one of: sentinel, wiki, all"
    ;;
esac

enable_update_trace \
  "backup.sh" \
  "append" \
  "Backup helper invoked for scope ${SCOPE}."

ensure_docker_and_compose_v2
ensure_env_file
load_state
set_compose_file_args
acquire_updater_lock

REPORT_ID="$(new_operation_report_id backup)"
REPORT_STARTED_AT="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
REPORT_STATUS="running"
REPORT_RESULT="failed"
REPORT_WARNINGS=""
REPORT_NEXT_ACTION=""
BACKUP_PATHS=()
BACKUP_MANIFESTS=()
REPORT_EMITTED="false"

timestamp="$(date +%Y%m%d_%H%M%S)"
default_backup_dir="${UPDATER_BACKUPS_DIR}/manual"

if [[ -n "${OUTPUT_FILE}" && "${SCOPE}" == "all" ]]; then
  OUTPUT_DIR="${OUTPUT_FILE}"
  OUTPUT_FILE=""
fi

if [[ -z "${OUTPUT_DIR}" ]]; then
  OUTPUT_DIR="${default_backup_dir}"
fi
mkdir -p "${OUTPUT_DIR}"

POSTGRES_USER="$(env_value POSTGRES_USER sentinel)"
POSTGRES_DB="$(env_value POSTGRES_DB sentinel)"
WIKI_POSTGRES_USER="$(env_value WIKI_POSTGRES_USER wikijs)"
WIKI_POSTGRES_DB="$(env_value WIKI_POSTGRES_DB wikijs)"
LAST_KNOWN_GOOD_VERSION="${LAST_KNOWN_GOOD_VERSION:-${CURRENT_VERSION:-$(env_value SENTINEL_VERSION)}}"

emit_backup_report() {
  local report_status="${1}" report_result="${2}" next_action="${3:-${REPORT_NEXT_ACTION}}"
  local finished_at backup_json
  finished_at="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  backup_json="$(
    python3 - "${OUTPUT_DIR}" "${REPORT_ID}" "${LAST_KNOWN_GOOD_VERSION}" "${report_result}" "$(printf '%s\n' "${BACKUP_PATHS[@]}")" "$(printf '%s\n' "${BACKUP_MANIFESTS[@]}")" <<'PY'
from __future__ import annotations

import json
import sys

output_dir, report_id, related_version, result, paths_text, manifests_text = sys.argv[1:]

payload = {
    "attempted": True,
    "succeeded": result in {"success", "degraded"},
    "outputDir": output_dir,
    "paths": [line for line in paths_text.splitlines() if line.strip()],
    "manifests": [line for line in manifests_text.splitlines() if line.strip()],
    "relatedVersion": related_version,
    "jobId": report_id,
}
print(json.dumps(payload, sort_keys=True))
PY
  )"

  REPORT_PATH="$(emit_operation_report \
    "${REPORT_ID}" \
    "backup" \
    "${report_status}" \
    "${report_result}" \
    "${LAST_KNOWN_GOOD_VERSION}" \
    "${LAST_KNOWN_GOOD_VERSION}" \
    "${PREVIOUS_VERSION:-}" \
    "${LAST_KNOWN_GOOD_VERSION}" \
    "${REPORT_STARTED_AT}" \
    "${finished_at}" \
    "" \
    "" \
    "${UPDATE_TRACE_FILE}" \
    "${next_action}" \
    "${REPORT_SOURCE}" \
    "{}" \
    "${backup_json}" \
    "{}" \
    "{\"mode\": \"backup\", \"status\": \"${report_status}\"}" \
    "{\"status\": \"ok\", \"message\": \"Backup completed.\"}" \
    "${REPORT_WARNINGS}"
  )"
  REPORT_EMITTED="true"
}

finish_backup_report() {
  local exit_code=$?
  if [[ "${REPORT_EMITTED}" == "true" ]]; then
    return 0
  fi

  if [[ "${exit_code}" -eq 0 ]]; then
    emit_backup_report "${REPORT_STATUS}" "${REPORT_RESULT}" "${REPORT_NEXT_ACTION}"
    return 0
  fi

  REPORT_WARNINGS+=$'Backup terminated before completion.\n'
  emit_backup_report "failed" "failed" "Inspect the update trace and retry the backup once the failure is corrected."
  return "${exit_code}"
}

trap finish_backup_report EXIT

database_size_bytes() {
  local service="${1}" db_user="${2}" db_name="${3}" raw_size
  raw_size="$(
    compose exec -T "${service}" psql -U "${db_user}" -d "${db_name}" -tAc \
      "SELECT pg_database_size('${db_name}');" 2>/dev/null || true
  )"
  raw_size="$(printf '%s' "${raw_size}" | tr -d '[:space:]')"
  if [[ "${raw_size}" =~ ^[0-9]+$ ]]; then
    printf '%s\n' "${raw_size}"
  else
    printf '0\n'
  fi
}

wikijs_data_source_path() {
  docker_cmd inspect sentinel-wikijs --format '{{range .Mounts}}{{if eq .Destination "/wiki/data"}}{{.Source}}{{end}}{{end}}' 2>/dev/null || true
}

directory_size_bytes() {
  local path="${1:-}"
  [[ -n "${path}" && -e "${path}" ]] || {
    printf '0\n'
    return 0
  }
  du -sb "${path}" 2>/dev/null | awk '{print $1}'
}

write_backup_manifest() {
  local file_path="${1}" scope="${2}"
  local manifest_path
  manifest_path="$(write_manifest_file "${file_path}" "backup-artifact" "${scope}" "${LAST_KNOWN_GOOD_VERSION}" "${REPORT_ID}")"
  BACKUP_MANIFESTS+=("${manifest_path}")
}

add_backup_path() {
  local file_path="${1}" scope="${2}"
  BACKUP_PATHS+=("${file_path}")
  write_backup_manifest "${file_path}" "${scope}"
}

preflight_required_bytes=0
case "${SCOPE}" in
  sentinel)
    compose up -d postgres >/dev/null
    wait_for_service_health postgres 120 || die "Postgres is not healthy; cannot run backup"
    preflight_required_bytes="$(( $(database_size_bytes postgres "${POSTGRES_USER}" "${POSTGRES_DB}") + 512 * 1024 * 1024 ))"
    ;;
  wiki)
    compose up -d wikijs-postgres wikijs >/dev/null
    wait_for_service_health wikijs-postgres 120 || die "Wiki.js Postgres is not healthy; cannot run backup"
    preflight_required_bytes="$(( $(database_size_bytes wikijs-postgres "${WIKI_POSTGRES_USER}" "${WIKI_POSTGRES_DB}") + $(directory_size_bytes "$(wikijs_data_source_path)") + 512 * 1024 * 1024 ))"
    ;;
  all)
    compose up -d postgres wikijs-postgres wikijs >/dev/null
    wait_for_service_health postgres 120 || die "Postgres is not healthy; cannot run backup"
    wait_for_service_health wikijs-postgres 120 || die "Wiki.js Postgres is not healthy; cannot run backup"
    preflight_required_bytes="$(( $(database_size_bytes postgres "${POSTGRES_USER}" "${POSTGRES_DB}") + $(database_size_bytes wikijs-postgres "${WIKI_POSTGRES_USER}" "${WIKI_POSTGRES_DB}") + $(directory_size_bytes "$(wikijs_data_source_path)") + 768 * 1024 * 1024 ))"
    ;;
esac

require_free_space "${OUTPUT_DIR}" "${preflight_required_bytes}" "backup destination"
require_free_space "/var/lib/docker" "$(( 256 * 1024 * 1024 ))" "Docker state"
log "Backup disk preflight passed for ${SCOPE}: need $(humanize_bytes "${preflight_required_bytes}") in ${OUTPUT_DIR}"

log "Preparing backup output in ${OUTPUT_DIR} (scope: ${SCOPE})"

backup_sentinel() {
  local target_file="${1}"
  log "Creating Sentinel backup: ${target_file}"
  compose exec -T postgres pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -Fc >"${target_file}"
  add_backup_path "${target_file}" "sentinel-db"
}

backup_wiki() {
  local target_file="${1}"
  log "Creating Wiki.js backup: ${target_file}"
  compose exec -T wikijs-postgres pg_dump -U "${WIKI_POSTGRES_USER}" -d "${WIKI_POSTGRES_DB}" -Fc >"${target_file}"
  add_backup_path "${target_file}" "wiki-db"
}

backup_appliance_state() {
  local target_file="${1}" staging_dir
  staging_dir="$(mktemp -d)"
  trap 'rm -rf "${staging_dir}"' RETURN

  if [[ -f "/etc/sentinel/appliance.env" ]]; then
    run_root cp -a "/etc/sentinel/appliance.env" "${staging_dir}/appliance.env"
  fi
  if [[ -f "/var/lib/sentinel/appliance/state.json" ]]; then
    run_root cp -a "/var/lib/sentinel/appliance/state.json" "${staging_dir}/state.json"
  fi
  if [[ -f "/opt/sentinel/credentials/service-secrets.env" ]]; then
    run_root cp -a "/opt/sentinel/credentials/service-secrets.env" "${staging_dir}/service-secrets.env"
    run_root chmod 600 "${staging_dir}/service-secrets.env" >/dev/null 2>&1 || true
  fi

  run_root tar -czf "${target_file}" -C "${staging_dir}" .
  rm -rf "${staging_dir}"
  trap - RETURN
  add_backup_path "${target_file}" "appliance-state"
}

backup_wiki_data() {
  local target_file="${1}" source_path
  source_path="$(wikijs_data_source_path)"
  if [[ -z "${source_path}" || ! -d "${source_path}" ]]; then
    REPORT_WARNINGS+=$'Wiki.js data volume was not available for backup.\n'
    return 0
  fi

  log "Creating Wiki.js data backup: ${target_file}"
  run_root tar -czf "${target_file}" -C "${source_path}" .
  add_backup_path "${target_file}" "wiki-data"
}

case "${SCOPE}" in
  sentinel)
    if [[ -z "${OUTPUT_FILE}" ]]; then
      OUTPUT_FILE="${OUTPUT_DIR}/sentinel_${timestamp}.dump"
    fi
    backup_sentinel "${OUTPUT_FILE}"
    backup_appliance_state "${OUTPUT_DIR}/appliance_state_${timestamp}.tar.gz"
    ;;
  wiki)
    if [[ -z "${OUTPUT_FILE}" ]]; then
      OUTPUT_FILE="${OUTPUT_DIR}/wikijs_${timestamp}.dump"
    fi
    backup_wiki "${OUTPUT_FILE}"
    backup_wiki_data "${OUTPUT_DIR}/wikijs_data_${timestamp}.tar.gz"
    ;;
  all)
    sentinel_file="${OUTPUT_DIR}/sentinel_${timestamp}.dump"
    wiki_file="${OUTPUT_DIR}/wikijs_${timestamp}.dump"
    backup_sentinel "${sentinel_file}"
    backup_wiki "${wiki_file}"
    backup_appliance_state "${OUTPUT_DIR}/appliance_state_${timestamp}.tar.gz"
    backup_wiki_data "${OUTPUT_DIR}/wikijs_data_${timestamp}.tar.gz"
    ;;
esac

REPORT_STATUS="completed"
REPORT_RESULT="success"
if [[ -n "${REPORT_WARNINGS}" ]]; then
  REPORT_RESULT="degraded"
  REPORT_NEXT_ACTION="Review backup warnings before relying on this backup set."
fi

emit_backup_report "${REPORT_STATUS}" "${REPORT_RESULT}" "${REPORT_NEXT_ACTION}"

log "Backup complete (${SCOPE})"
for path in "${BACKUP_PATHS[@]}"; do
  log "  ${path}"
done
log "Report: ${REPORT_PATH}"
