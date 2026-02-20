#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/_common.sh"

OUTPUT_FILE=""

usage() {
  cat <<USAGE
Usage: ./backup.sh [--output /path/to/file.dump]
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --output)
      OUTPUT_FILE="${2:-}"
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

ensure_docker_and_compose_v2
ensure_env_file
load_state
set_compose_file_args

POSTGRES_USER="$(env_value POSTGRES_USER sentinel)"
POSTGRES_DB="$(env_value POSTGRES_DB sentinel)"

if [[ -z "${OUTPUT_FILE}" ]]; then
  timestamp="$(date +%Y%m%d_%H%M%S)"
  backup_dir="${DEPLOY_DIR}/backups"
  mkdir -p "${backup_dir}"
  OUTPUT_FILE="${backup_dir}/sentinel_${timestamp}.dump"
fi

compose up -d postgres

log "Creating backup: ${OUTPUT_FILE}"
compose exec -T postgres pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -Fc >"${OUTPUT_FILE}"

log "Backup complete: ${OUTPUT_FILE}"
