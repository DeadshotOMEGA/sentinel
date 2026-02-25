#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/_common.sh"

BACKUP_FILE=""
SENTINEL_BACKUP_FILE=""
WIKI_BACKUP_FILE=""
ASSUME_YES="false"
SCOPE="sentinel"

usage() {
  cat <<USAGE
Usage: ./restore.sh [options]

Options:
  --scope <sentinel|wiki|all>   Restore target scope (default: sentinel)
  --file <path>                 Backup file for single-scope restore
  --sentinel-file <path>        Sentinel backup file (required for --scope all)
  --wiki-file <path>            Wiki.js backup file (required for --scope all)
  --yes                         Skip interactive confirmation
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

POSTGRES_USER="$(env_value POSTGRES_USER sentinel)"
POSTGRES_DB="$(env_value POSTGRES_DB sentinel)"
WIKI_POSTGRES_USER="$(env_value WIKI_POSTGRES_USER wikijs)"
WIKI_POSTGRES_DB="$(env_value WIKI_POSTGRES_DB wikijs)"

restore_database_dump() {
  local service="${1}"
  local db_user="${2}"
  local db_name="${3}"
  local dump_file="${4}"
  local label="${5}"

  log "Restoring ${label} database from ${dump_file}"
  compose exec -T "${service}" psql -U "${db_user}" -d "${db_name}" -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
  cat "${dump_file}" | compose exec -T "${service}" pg_restore -U "${db_user}" -d "${db_name}" --clean --if-exists --no-owner --no-privileges
}

case "${SCOPE}" in
  sentinel)
    compose up -d postgres backend frontend caddy
    wait_for_service_health postgres 120 || die "Postgres is not healthy; cannot restore Sentinel backup"
    restore_database_dump postgres "${POSTGRES_USER}" "${POSTGRES_DB}" "${SENTINEL_BACKUP_FILE}" "Sentinel"
    run_safe_migrations
    if ! wait_for_healthz 240; then
      print_health_diagnostics
      die "Sentinel restore completed, but health gate check failed at /healthz"
    fi
    ;;
  wiki)
    compose up -d wikijs-postgres wikijs
    wait_for_service_health wikijs-postgres 120 || die "Wiki.js Postgres is not healthy; cannot restore Wiki backup"
    restore_database_dump wikijs-postgres "${WIKI_POSTGRES_USER}" "${WIKI_POSTGRES_DB}" "${WIKI_BACKUP_FILE}" "Wiki.js"
    compose restart wikijs
    wait_for_service_health wikijs 180 || die "Wiki.js service did not recover after restore"
    ;;
  all)
    compose up -d postgres wikijs-postgres backend frontend wikijs caddy
    wait_for_service_health postgres 120 || die "Postgres is not healthy; cannot restore Sentinel backup"
    wait_for_service_health wikijs-postgres 120 || die "Wiki.js Postgres is not healthy; cannot restore Wiki backup"
    restore_database_dump postgres "${POSTGRES_USER}" "${POSTGRES_DB}" "${SENTINEL_BACKUP_FILE}" "Sentinel"
    restore_database_dump wikijs-postgres "${WIKI_POSTGRES_USER}" "${WIKI_POSTGRES_DB}" "${WIKI_BACKUP_FILE}" "Wiki.js"
    run_safe_migrations
    compose restart wikijs
    wait_for_service_health wikijs 180 || die "Wiki.js service did not recover after restore"
    if ! wait_for_healthz 240; then
      print_health_diagnostics
      die "Combined restore completed, but health gate check failed at /healthz"
    fi
    ;;
esac

log "Restore complete (${SCOPE})"
