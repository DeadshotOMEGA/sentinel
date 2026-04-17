#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/_common.sh"

REQUEST_DIR="${SCRIPT_DIR}/runtime/system-update/requests"
PROCESSED_DIR="${SCRIPT_DIR}/runtime/system-update/processed"
FAILED_DIR="${SCRIPT_DIR}/runtime/system-update/failed"
LOCK_FILE="/run/lock/sentinel-system-update-request-processor.lock"

if [[ "${EUID}" -ne 0 ]]; then
  die "Please run as root: sudo bash $0"
fi

mkdir -p "$(dirname "${LOCK_FILE}")" "${REQUEST_DIR}" "${PROCESSED_DIR}" "${FAILED_DIR}"
exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
  log "System update request processor is already running."
  exit 0
fi

shopt -s nullglob
requests=("${REQUEST_DIR}"/*.json)
if [[ "${#requests[@]}" -eq 0 ]]; then
  log "No queued system update requests were found."
  exit 0
fi

for request_file in "${requests[@]}"; do
  base_name="$(basename "${request_file}")"
  log "Processing queued system update request ${base_name}"

  if "${SCRIPT_DIR}/upgrade-launcher.sh" --latest --yes; then
    mv "${request_file}" "${PROCESSED_DIR}/${base_name}"
    log "System update request ${base_name} completed."
  else
    warn "System update failed for ${base_name}"
    mv "${request_file}" "${FAILED_DIR}/${base_name}"
  fi
done
