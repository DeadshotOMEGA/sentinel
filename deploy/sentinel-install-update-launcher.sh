#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

set +e
cd "${SCRIPT_DIR}"
bash "${SCRIPT_DIR}/sentinel_update_quiet.sh" "$@"
exit_code=$?
set -e

if [[ -t 0 ]]; then
  echo
  if [[ "${exit_code}" -eq 0 ]]; then
    echo "[sentinel] Completed successfully."
  else
    echo "[sentinel] Failed with exit code ${exit_code}."
  fi
  echo "[sentinel] Press Enter to close."
  read -r _
fi

exit "${exit_code}"
