#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/_common.sh"

OUTPUT_FILE=""
OUTPUT_DIR=""
SCOPE="all"

usage() {
  cat <<USAGE
Usage: ./backup.sh [options]

Options:
  --scope <sentinel|wiki|all>  Backup target scope (default: all)
  --output <path>              Output file path for single-scope backup.
                               For --scope all, treated as output directory.
  --output-dir <path>          Output directory for generated backup files.
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

ensure_docker_and_compose_v2
ensure_env_file
load_state
set_compose_file_args

timestamp="$(date +%Y%m%d_%H%M%S)"
default_backup_dir="${DEPLOY_DIR}/backups"

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

backup_sentinel() {
  local target_file="${1}"
  log "Creating Sentinel backup: ${target_file}"
  compose exec -T postgres pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -Fc >"${target_file}"
}

backup_wiki() {
  local target_file="${1}"
  log "Creating Wiki.js backup: ${target_file}"
  compose exec -T wikijs-postgres pg_dump -U "${WIKI_POSTGRES_USER}" -d "${WIKI_POSTGRES_DB}" -Fc >"${target_file}"
}

case "${SCOPE}" in
  sentinel)
    if [[ -z "${OUTPUT_FILE}" ]]; then
      OUTPUT_FILE="${OUTPUT_DIR}/sentinel_${timestamp}.dump"
    fi
    compose up -d postgres
    wait_for_service_health postgres 120 || die "Postgres is not healthy; cannot run backup"
    backup_sentinel "${OUTPUT_FILE}"
    log "Backup complete: ${OUTPUT_FILE}"
    ;;
  wiki)
    if [[ -z "${OUTPUT_FILE}" ]]; then
      OUTPUT_FILE="${OUTPUT_DIR}/wikijs_${timestamp}.dump"
    fi
    compose up -d wikijs-postgres
    wait_for_service_health wikijs-postgres 120 || die "Wiki.js Postgres is not healthy; cannot run backup"
    backup_wiki "${OUTPUT_FILE}"
    log "Backup complete: ${OUTPUT_FILE}"
    ;;
  all)
    sentinel_file="${OUTPUT_DIR}/sentinel_${timestamp}.dump"
    wiki_file="${OUTPUT_DIR}/wikijs_${timestamp}.dump"
    compose up -d postgres wikijs-postgres
    wait_for_service_health postgres 120 || die "Postgres is not healthy; cannot run backup"
    wait_for_service_health wikijs-postgres 120 || die "Wiki.js Postgres is not healthy; cannot run backup"
    backup_sentinel "${sentinel_file}"
    backup_wiki "${wiki_file}"
    log "Combined backup complete:"
    log "  Sentinel: ${sentinel_file}"
    log "  Wiki.js:  ${wiki_file}"
    ;;
esac
