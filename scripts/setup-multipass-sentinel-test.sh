#!/usr/bin/env bash
set -euo pipefail

VM_NAME="${1:-sentinel-appliance-test}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTE_PATH="/home/ubuntu/sentinel"

if ! command -v multipass >/dev/null 2>&1; then
  echo "multipass is not installed. Install it first, then re-run this script." >&2
  exit 1
fi

if multipass info "${VM_NAME}" >/dev/null 2>&1; then
  echo "[sentinel] VM '${VM_NAME}' already exists; starting it."
  multipass start "${VM_NAME}"
else
  echo "[sentinel] Launching Ubuntu 24.04 VM '${VM_NAME}'."
  multipass launch 24.04 --name "${VM_NAME}" --cpus 4 --memory 8G --disk 40G
fi

if ! multipass info "${VM_NAME}" | grep -q "${REMOTE_PATH}"; then
  echo "[sentinel] Mounting repository into VM at ${REMOTE_PATH}."
  multipass mount "${REPO_ROOT}" "${VM_NAME}:${REMOTE_PATH}"
fi

echo
echo "[sentinel] VM ready."
echo "Open shell:"
echo "  multipass shell ${VM_NAME}"
echo
echo "Inside VM run:"
echo "  cd ${REMOTE_PATH}/deploy"
echo "  cp .env.example .env"
echo "  ./install.sh --version v1.1.8"
echo
echo "Optional snapshot commands:"
echo "  multipass stop ${VM_NAME}"
echo "  multipass snapshot ${VM_NAME} --name clean-install-point"
