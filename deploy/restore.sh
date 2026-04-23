#!/usr/bin/env bash
set -euo pipefail

SELF_PATH="$(readlink -f "${BASH_SOURCE[0]}")"
if [[ "${EUID}" -ne 0 ]]; then
  exec sudo "${SELF_PATH}" "$@"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/_common.sh"

BACKUP_FILE=""
SENTINEL_BACKUP_FILE=""
WIKI_BACKUP_FILE=""
ASSUME_YES="false"
NO_PRE_RESTORE_BACKUP="false"
SCOPE="sentinel"
REPORT_SOURCE="manual"

usage() {
  cat <<USAGE
Usage: ./restore.sh [options]

Options:
  --scope <sentinel|wiki|all>   Restore target scope (default: sentinel)
  --file <path>                 Backup file for single-scope restore
  --sentinel-file <path>        Sentinel backup file (required for --scope all)
  --wiki-file <path>            Wiki.js backup file (required for --scope all)
  --yes                         Skip interactive confirmation
  --no-pre-restore-backup       Skip the automatic pre-restore backup
  --source <value>              Report source tag (default: manual)
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --scope)
      SCOPE="${2:-}"
      shift 2
      ;;
    --file)
      BACKUP_FILE="${2:-}"
      shift 2
      ;;
    --sentinel-file)
      SENTINEL_BACKUP_FILE="${2:-}"
      shift 2
      ;;
    --wiki-file)
      WIKI_BACKUP_FILE="${2:-}"
      shift 2
      ;;
    --yes)
      ASSUME_YES="true"
      shift
      ;;
    --no-pre-restore-backup)
      NO_PRE_RESTORE_BACKUP="true"
      shift
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
  sentinel)
    if [[ -z "${BACKUP_FILE}" ]]; then
      BACKUP_FILE="${SENTINEL_BACKUP_FILE}"
    fi
    [[ -n "${BACKUP_FILE}" ]] || die "--file is required for --scope sentinel"
    [[ -f "${BACKUP_FILE}" ]] || die "Backup file not found: ${BACKUP_FILE}"
    SENTINEL_BACKUP_FILE="${BACKUP_FILE}"
    ;;
  wiki)
    if [[ -z "${BACKUP_FILE}" ]]; then
      BACKUP_FILE="${WIKI_BACKUP_FILE}"
    fi
    [[ -n "${BACKUP_FILE}" ]] || die "--file is required for --scope wiki"
    [[ -f "${BACKUP_FILE}" ]] || die "Backup file not found: ${BACKUP_FILE}"
    WIKI_BACKUP_FILE="${BACKUP_FILE}"
    ;;
  all)
    [[ -n "${SENTINEL_BACKUP_FILE}" ]] || die "--sentinel-file is required for --scope all"
    [[ -n "${WIKI_BACKUP_FILE}" ]] || die "--wiki-file is required for --scope all"
    [[ -f "${SENTINEL_BACKUP_FILE}" ]] || die "Sentinel backup file not found: ${SENTINEL_BACKUP_FILE}"
    [[ -f "${WIKI_BACKUP_FILE}" ]] || die "Wiki backup file not found: ${WIKI_BACKUP_FILE}"
    ;;
  *)
    die "--scope must be one of: sentinel, wiki, all"
    ;;
esac

if [[ "${ASSUME_YES}" != "true" ]]; then
  case "${SCOPE}" in
    sentinel)
      echo "This will replace current Sentinel PostgreSQL data with: ${SENTINEL_BACKUP_FILE}"
      ;;
    wiki)
      echo "This will replace current Wiki.js PostgreSQL data with: ${WIKI_BACKUP_FILE}"
      ;;
    all)
      echo "This will replace both Sentinel and Wiki.js PostgreSQL datasets:"
      echo "  Sentinel: ${SENTINEL_BACKUP_FILE}"
      echo "  Wiki.js:  ${WIKI_BACKUP_FILE}"
      ;;
  esac
  read -r -p "Continue? [y/N] " reply
  [[ "${reply}" =~ ^[Yy]$ ]] || exit 1
fi

ensure_docker_and_compose_v2
ensure_env_file
load_state
set_compose_file_args
acquire_updater_lock

REPORT_ID="$(new_operation_report_id restore)"
REPORT_STARTED_AT="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
REPORT_STATUS="running"
REPORT_RESULT="failed"
REPORT_WARNINGS=""
REPORT_NEXT_ACTION=""
REPORT_HEALTH=""
REPORT_EMITTED="false"
PRE_RESTORE_BACKUP_DIR=""

emit_restore_report() {
  local report_status="${1}" report_result="${2}" next_action="${3:-${REPORT_NEXT_ACTION}}" finished_at backup_json health_json
  finished_at="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  backup_json="$(
    python3 - "${PRE_RESTORE_BACKUP_DIR}" <<'PY'
from __future__ import annotations

import json
import sys
from pathlib import Path

backup_dir = Path(sys.argv[1]) if sys.argv[1] else None
payload = {
    "attempted": bool(backup_dir),
    "succeeded": bool(backup_dir and backup_dir.exists()),
    "outputDir": str(backup_dir) if backup_dir else None,
    "paths": [],
    "manifests": [],
}
if backup_dir and backup_dir.exists():
    payload["paths"] = [str(path) for path in sorted(backup_dir.glob("*")) if path.is_file()]
    payload["manifests"] = [str(path) for path in sorted(backup_dir.glob("*.manifest.json")) if path.is_file()]
print(json.dumps(payload, sort_keys=True))
PY
  )"
  health_json="{\"status\": \"unknown\", \"message\": \"Restore did not finish health verification.\"}"
  if [[ -n "${REPORT_HEALTH}" ]]; then
    health_json="{\"status\": \"ok\", \"message\": \"${REPORT_HEALTH}\"}"
  fi

  REPORT_PATH="$(emit_operation_report \
    "${REPORT_ID}" \
    "restore" \
    "${report_status}" \
    "${report_result}" \
    "$(env_value SENTINEL_VERSION)" \
    "$(env_value SENTINEL_VERSION)" \
    "${PREVIOUS_VERSION:-}" \
    "${LAST_KNOWN_GOOD_VERSION:-$(env_value SENTINEL_VERSION)}" \
    "${REPORT_STARTED_AT}" \
    "${finished_at}" \
    "$([[ -n "${REPORT_HEALTH}" ]] && printf 'true' || printf '')" \
    "" \
    "${UPDATE_TRACE_FILE}" \
    "${next_action}" \
    "${REPORT_SOURCE}" \
    "{}" \
    "${backup_json}" \
    "{}" \
    "{\"mode\": \"restore-followup\", \"status\": \"${report_status}\"}" \
    "${health_json}" \
    "${REPORT_WARNINGS}"
  )"
  REPORT_EMITTED="true"
}

finish_restore_report() {
  local exit_code=$?
  if [[ "${REPORT_EMITTED}" == "true" ]]; then
    return 0
  fi

  if [[ "${exit_code}" -eq 0 ]]; then
    emit_restore_report "${REPORT_STATUS}" "${REPORT_RESULT}" "${REPORT_NEXT_ACTION}"
    return 0
  fi

  REPORT_WARNINGS+=$'Restore terminated before completion.\n'
  emit_restore_report "failed" "failed" "Inspect the update trace and restore logs before retrying."
  return "${exit_code}"
}

trap finish_restore_report EXIT

POSTGRES_USER="$(env_value POSTGRES_USER sentinel)"
POSTGRES_DB="$(env_value POSTGRES_DB sentinel)"
WIKI_POSTGRES_USER="$(env_value WIKI_POSTGRES_USER wikijs)"
WIKI_POSTGRES_DB="$(env_value WIKI_POSTGRES_DB wikijs)"

verify_dump_readable() {
  local dump_file="${1}" label="${2}"
  log "Verifying restore archive readability for ${label}: ${dump_file}"
  pg_restore --list "${dump_file}" >/dev/null
}

restore_database_dump() {
  local service="${1}" db_user="${2}" db_name="${3}" dump_file="${4}" label="${5}"

  log "Restoring ${label} database from ${dump_file}"
  cat "${dump_file}" | compose exec -T "${service}" pg_restore -U "${db_user}" -d "${db_name}" --clean --if-exists --no-owner --no-privileges
}

restore_required_bytes=0
case "${SCOPE}" in
  sentinel)
    restore_required_bytes="$(( $(stat -c %s "${SENTINEL_BACKUP_FILE}") + 1024 * 1024 * 1024 ))"
    ;;
  wiki)
    restore_required_bytes="$(( $(stat -c %s "${WIKI_BACKUP_FILE}") + 1024 * 1024 * 1024 ))"
    ;;
  all)
    restore_required_bytes="$(( $(stat -c %s "${SENTINEL_BACKUP_FILE}") + $(stat -c %s "${WIKI_BACKUP_FILE}") + 1536 * 1024 * 1024 ))"
    ;;
esac

require_free_space "${UPDATER_BACKUPS_DIR}" "$(( restore_required_bytes / 2 + 512 * 1024 * 1024 ))" "pre-restore backup destination"
require_free_space "/var/lib/docker" "${restore_required_bytes}" "Docker state"

case "${SCOPE}" in
  sentinel)
    verify_dump_readable "${SENTINEL_BACKUP_FILE}" "Sentinel"
    ;;
  wiki)
    verify_dump_readable "${WIKI_BACKUP_FILE}" "Wiki.js"
    ;;
  all)
    verify_dump_readable "${SENTINEL_BACKUP_FILE}" "Sentinel"
    verify_dump_readable "${WIKI_BACKUP_FILE}" "Wiki.js"
    ;;
esac

if [[ "${NO_PRE_RESTORE_BACKUP}" != "true" ]]; then
  PRE_RESTORE_BACKUP_DIR="${UPDATER_BACKUPS_DIR}/pre-restore-${REPORT_ID}"
  log "Creating automatic pre-restore backup in ${PRE_RESTORE_BACKUP_DIR}"
  "${SCRIPT_DIR}/backup.sh" --scope "${SCOPE}" --output-dir "${PRE_RESTORE_BACKUP_DIR}" --source "restore-preflight"
fi

case "${SCOPE}" in
  sentinel)
    compose up -d postgres backend frontend caddy >/dev/null
    wait_for_service_health postgres 120 || die "Postgres is not healthy; cannot restore Sentinel backup"
    restore_database_dump postgres "${POSTGRES_USER}" "${POSTGRES_DB}" "${SENTINEL_BACKUP_FILE}" "Sentinel"
    run_safe_migrations
    if ! wait_for_healthz 240; then
      print_health_diagnostics
      REPORT_NEXT_ACTION="Inspect the health diagnostics and consider restoring the automatic pre-restore backup."
      die "Sentinel restore completed, but health gate check failed at /healthz"
    fi
    REPORT_HEALTH="Sentinel restore health checks passed."
    ;;
  wiki)
    compose up -d wikijs-postgres wikijs >/dev/null
    wait_for_service_health wikijs-postgres 120 || die "Wiki.js Postgres is not healthy; cannot restore Wiki backup"
    restore_database_dump wikijs-postgres "${WIKI_POSTGRES_USER}" "${WIKI_POSTGRES_DB}" "${WIKI_BACKUP_FILE}" "Wiki.js"
    compose restart wikijs
    wait_for_service_health wikijs 180 || die "Wiki.js service did not recover after restore"
    REPORT_HEALTH="Wiki.js restore health checks passed."
    ;;
  all)
    compose up -d postgres wikijs-postgres backend frontend wikijs caddy >/dev/null
    wait_for_service_health postgres 120 || die "Postgres is not healthy; cannot restore Sentinel backup"
    wait_for_service_health wikijs-postgres 120 || die "Wiki.js Postgres is not healthy; cannot restore Wiki backup"
    restore_database_dump postgres "${POSTGRES_USER}" "${POSTGRES_DB}" "${SENTINEL_BACKUP_FILE}" "Sentinel"
    restore_database_dump wikijs-postgres "${WIKI_POSTGRES_USER}" "${WIKI_POSTGRES_DB}" "${WIKI_BACKUP_FILE}" "Wiki.js"
    run_safe_migrations
    compose restart wikijs
    wait_for_service_health wikijs 180 || die "Wiki.js service did not recover after restore"
    if ! wait_for_healthz 240; then
      print_health_diagnostics
      REPORT_NEXT_ACTION="Inspect the health diagnostics and consider restoring the automatic pre-restore backup."
      die "Combined restore completed, but health gate check failed at /healthz"
    fi
    REPORT_HEALTH="Combined restore health checks passed."
    ;;
esac

REPORT_STATUS="completed"
REPORT_RESULT="success"
REPORT_NEXT_ACTION="No action required."
emit_restore_report "${REPORT_STATUS}" "${REPORT_RESULT}" "${REPORT_NEXT_ACTION}"

log "Restore complete (${SCOPE})"
log "Report: ${REPORT_PATH}"
