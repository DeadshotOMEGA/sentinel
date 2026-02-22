#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_DIR="$(cd "${DEPLOY_DIR}/.." && pwd)"

PKG_NAME="sentinel-appliance-tools"
VERSION_INPUT=""
OUTPUT_DIR="${SCRIPT_DIR}/dist"

usage() {
  cat <<USAGE
Usage: ./deploy/deb/build-deb.sh [--version vX.Y.Z] [--output-dir path]

Builds a Debian package that installs:
  - /opt/sentinel/deploy (installer/update bundle)
  - App launcher entries in GNOME application menu
USAGE
}

normalize_deb_version() {
  local raw="${1:-}"
  raw="$(printf '%s' "${raw}" | tr -d '\r' | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"
  raw="${raw#v}"
  printf '%s\n' "${raw}"
}

guess_version() {
  local tag
  tag="$(git -C "${REPO_DIR}" describe --tags --abbrev=0 2>/dev/null || true)"
  if [[ -n "${tag}" ]]; then
    normalize_deb_version "${tag}"
    return 0
  fi
  printf '1.0.0\n'
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      VERSION_INPUT="${2:-}"
      shift 2
      ;;
    --version=*)
      VERSION_INPUT="${1#*=}"
      shift
      ;;
    --output-dir)
      OUTPUT_DIR="${2:-}"
      shift 2
      ;;
    --output-dir=*)
      OUTPUT_DIR="${1#*=}"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "${VERSION_INPUT}" ]]; then
  VERSION_INPUT="$(guess_version)"
fi

DEB_VERSION="$(normalize_deb_version "${VERSION_INPUT}")"
if [[ ! "${DEB_VERSION}" =~ ^[0-9][A-Za-z0-9.+~:-]*$ ]]; then
  echo "Invalid Debian package version: ${DEB_VERSION}" >&2
  exit 1
fi

WORK_ROOT="$(mktemp -d)"
PKG_ROOT="${WORK_ROOT}/${PKG_NAME}"
trap 'rm -rf "${WORK_ROOT}"' EXIT

mkdir -p "${PKG_ROOT}/DEBIAN"
mkdir -p "${PKG_ROOT}/opt/sentinel/deploy"

rsync -a \
  --exclude '.env' \
  --exclude '.appliance-state' \
  --exclude 'deb' \
  "${DEPLOY_DIR}/" "${PKG_ROOT}/opt/sentinel/deploy/"

install -D -m 755 \
  "${SCRIPT_DIR}/assets/usr/local/bin/sentinel-install" \
  "${PKG_ROOT}/usr/local/bin/sentinel-install"
install -D -m 755 \
  "${SCRIPT_DIR}/assets/usr/local/bin/sentinel-update" \
  "${PKG_ROOT}/usr/local/bin/sentinel-update"
install -D -m 644 \
  "${SCRIPT_DIR}/assets/usr/share/applications/sentinel-install.desktop" \
  "${PKG_ROOT}/usr/share/applications/sentinel-install.desktop"
install -D -m 644 \
  "${SCRIPT_DIR}/assets/usr/share/applications/sentinel-update.desktop" \
  "${PKG_ROOT}/usr/share/applications/sentinel-update.desktop"

cat >"${PKG_ROOT}/DEBIAN/control" <<CONTROL
Package: ${PKG_NAME}
Version: ${DEB_VERSION}
Section: admin
Priority: optional
Architecture: all
Depends: bash, coreutils, curl, grep, sed, sudo
Maintainer: Sentinel Team <noreply@sentinel.local>
Description: Sentinel appliance installer and updater bundle
 Installs Sentinel deployment scripts to /opt/sentinel/deploy and provides
 desktop app launchers for guided install/update workflows.
CONTROL

cat >"${PKG_ROOT}/DEBIAN/postinst" <<'POSTINST'
#!/bin/sh
set -e

if [ -d /opt/sentinel/deploy ]; then
  chmod +x /opt/sentinel/deploy/*.sh 2>/dev/null || true
  chmod +x /opt/sentinel/deploy/*.desktop 2>/dev/null || true
fi

exit 0
POSTINST
chmod 755 "${PKG_ROOT}/DEBIAN/postinst"

mkdir -p "${OUTPUT_DIR}"
OUTPUT_FILE="${OUTPUT_DIR}/${PKG_NAME}_${DEB_VERSION}_all.deb"
dpkg-deb --build --root-owner-group "${PKG_ROOT}" "${OUTPUT_FILE}"

echo "Built package: ${OUTPUT_FILE}"
