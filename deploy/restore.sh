#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/_common.sh"

BACKUP_FILE=""
ASSUME_YES="false"

usage() {
  cat <<USAGE
Usage: ./restore.sh --file /path/to/backup.dump [--yes]
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --file)
      BACKUP_FILE="${2:-}"
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

[[ -n "${BACKUP_FILE}" ]] || die "--file is required"
[[ -f "${BACKUP_FILE}" ]] || die "Backup file not found: ${BACKUP_FILE}"

if [[ "${ASSUME_YES}" != "true" ]]; then
  echo "This will replace current PostgreSQL data with: ${BACKUP_FILE}"
  read -r -p "Continue? [y/N] " reply
  [[ "${reply}" =~ ^[Yy]$ ]] || exit 1
fi

ensure_docker_and_compose_v2
ensure_env_file
load_state
set_compose_file_args

POSTGRES_USER="$(env_value POSTGRES_USER sentinel)"
POSTGRES_DB="$(env_value POSTGRES_DB sentinel)"

compose up -d postgres backend frontend caddy

log "Restoring database from ${BACKUP_FILE}"
compose exec -T postgres psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
cat "${BACKUP_FILE}" | compose exec -T postgres pg_restore -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --clean --if-exists --no-owner --no-privileges

run_safe_migrations

if ! wait_for_healthz 240; then
  print_health_diagnostics
  die "Restore completed, but health gate check failed at /healthz"
fi

log "Restore complete"
