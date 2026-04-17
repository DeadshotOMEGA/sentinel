#!/usr/bin/env bash

set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  printf 'Please run as root: sudo bash %s [app-user]\n' "$0" >&2
  exit 1
fi

APP_USER="${1:-www-data}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_HELPER="${SCRIPT_DIR}/recover-sentinel-hotspot.sh"
INSTALLED_HELPER="/usr/local/sbin/recover-sentinel-hotspot-root"
SUDOERS_PATH="/etc/sudoers.d/sentinel-hotspot-recovery"

command -v install >/dev/null 2>&1 || {
  printf 'install is required\n' >&2
  exit 1
}

command -v visudo >/dev/null 2>&1 || {
  printf 'visudo is required\n' >&2
  exit 1
}

if ! id "${APP_USER}" >/dev/null 2>&1; then
  printf 'User %s does not exist\n' "${APP_USER}" >&2
  exit 1
fi

if [[ ! -f "${SOURCE_HELPER}" ]]; then
  printf 'Source helper not found: %s\n' "${SOURCE_HELPER}" >&2
  exit 1
fi

install -o root -g root -m 0755 "${SOURCE_HELPER}" "${INSTALLED_HELPER}"

cat >"${SUDOERS_PATH}" <<EOF
Defaults:${APP_USER} !requiretty
Defaults:${APP_USER} secure_path="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
${APP_USER} ALL=(root) NOPASSWD: ${INSTALLED_HELPER}
EOF

chmod 0440 "${SUDOERS_PATH}"
visudo -cf "${SUDOERS_PATH}"

cat <<EOF
Installed:
  ${INSTALLED_HELPER}

Sudoers rule:
  ${SUDOERS_PATH}

The webapp user can now trigger recovery with:
  sudo -n ${INSTALLED_HELPER}
EOF
