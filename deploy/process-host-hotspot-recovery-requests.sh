#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/_common.sh"

REQUEST_DIR="${SCRIPT_DIR}/runtime/hotspot-recovery/requests"
PROCESSED_DIR="${SCRIPT_DIR}/runtime/hotspot-recovery/processed"
FAILED_DIR="${SCRIPT_DIR}/runtime/hotspot-recovery/failed"
LOCK_FILE="/run/lock/sentinel-host-hotspot-recovery-processor.lock"
CONNECTION_NAME="$(env_value HOTSPOT_CONNECTION_NAME 'Sentinel Hotspot')"

if [[ "${EUID}" -ne 0 ]]; then
  die "Please run as root: sudo bash $0"
fi

mkdir -p "$(dirname "${LOCK_FILE}")" "${REQUEST_DIR}" "${PROCESSED_DIR}" "${FAILED_DIR}"
exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
  log "Host hotspot recovery processor is already running."
  exit 0
fi

shopt -s nullglob
requests=("${REQUEST_DIR}"/*.json)
if [[ "${#requests[@]}" -eq 0 ]]; then
  log "No queued host hotspot recovery requests were found."
  exit 0
fi

for request_file in "${requests[@]}"; do
  base_name="$(basename "${request_file}")"
  log "Processing host hotspot recovery request ${base_name}"

  if "${SCRIPT_DIR}/recover-host-hotspot.sh" "${CONNECTION_NAME}"; then
    mv "${request_file}" "${PROCESSED_DIR}/${base_name}"
    log "Host hotspot recovery request ${base_name} completed."
  else
    warn "Host hotspot recovery failed for ${base_name}"
    mv "${request_file}" "${FAILED_DIR}/${base_name}"
  fi
done
