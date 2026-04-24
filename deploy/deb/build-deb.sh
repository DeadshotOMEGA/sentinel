#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_DIR="$(cd "${DEPLOY_DIR}/.." && pwd)"

PKG_NAME="sentinel"
VERSION_INPUT=""
OUTPUT_DIR="${SCRIPT_DIR}/dist"
ASSETS_DIR="${SCRIPT_DIR}/assets"
LOGO_SOURCE="${REPO_DIR}/Logo.png"
ICON_NAME="sentinel-appliance"
ICON_SIZES=(64 128 256 512 1024)

usage() {
  cat <<USAGE
Usage: ./deploy/deb/build-deb.sh [--version vX.Y.Z] [--output-dir path]

Builds a Debian package that installs:
  - /opt/sentinel/deploy (installer/update bundle)
  - App launcher entry in GNOME application menu
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

if [[ ! -f "${LOGO_SOURCE}" ]]; then
  echo "Missing logo file: ${LOGO_SOURCE}" >&2
  exit 1
fi

rsync -a \
  --exclude '.env' \
  --exclude '.appliance-state' \
  --exclude 'deb' \
  "${DEPLOY_DIR}/" "${PKG_ROOT}/opt/sentinel/deploy/"

rsync -a "${ASSETS_DIR}/" "${PKG_ROOT}/"

chmod 755 \
  "${PKG_ROOT}/usr/local/bin/sentinel-install-update" \
  "${PKG_ROOT}/usr/lib/sentinel/sentinel-update-bridge" \
  "${PKG_ROOT}/usr/lib/sentinel/sentinel-updater"

chmod 644 \
  "${PKG_ROOT}/usr/lib/sentinel/sentinel_update_common.py" \
  "${PKG_ROOT}/usr/share/applications/sentinel-install-update.desktop" \
  "${PKG_ROOT}/usr/share/polkit-1/actions/com.deadshotomega.sentinel.update.start.policy" \
  "${PKG_ROOT}/etc/polkit-1/rules.d/49-sentinel-updater.rules" \
  "${PKG_ROOT}/etc/logrotate.d/sentinel-updater" \
  "${PKG_ROOT}/etc/systemd/system/sentinel-update-bridge.service" \
  "${PKG_ROOT}/etc/systemd/system/sentinel-update-bridge.socket" \
  "${PKG_ROOT}/etc/systemd/system/sentinel-updater.service" \
  "${PKG_ROOT}/etc/systemd/system/sentinel-updater-prune.service" \
  "${PKG_ROOT}/etc/systemd/system/sentinel-updater-prune.timer"

for size in "${ICON_SIZES[@]}"; do
  install -D -m 644 \
    "${LOGO_SOURCE}" \
    "${PKG_ROOT}/usr/share/icons/hicolor/${size}x${size}/apps/${ICON_NAME}.png"
done

cat >"${PKG_ROOT}/DEBIAN/control" <<CONTROL
Package: ${PKG_NAME}
Version: ${DEB_VERSION}
Section: admin
Priority: optional
Architecture: all
Depends: bash, coreutils, curl, grep, sed, sudo, python3, ca-certificates, policykit-1, systemd, logrotate, postgresql-client, util-linux
Provides: sentinel-appliance-tools
Replaces: sentinel-appliance-tools
Conflicts: sentinel-appliance-tools
Maintainer: Sentinel Team <noreply@sentinel.local>
Description: Sentinel appliance installer and updater bundle
 Installs Sentinel deployment scripts to /opt/sentinel/deploy and provides
 a desktop app launcher for guided install/update workflows.
CONTROL

cat >"${PKG_ROOT}/DEBIAN/postinst" <<'POSTINST'
#!/bin/sh
set -e

ensure_group() {
  name="$1"
  gid="$2"
  if getent group "$name" >/dev/null 2>&1; then
    return 0
  fi
  addgroup --system --gid "$gid" "$name"
}

ensure_user() {
  name="$1"
  uid="$2"
  group="$3"
  if id "$name" >/dev/null 2>&1; then
    return 0
  fi
  adduser --system --uid "$uid" --ingroup "$group" --home /nonexistent --shell /usr/sbin/nologin "$name"
}

ensure_group sentinel-backend 10001
ensure_group sentinel-updater-bridge 10002
ensure_user sentinel-updater-bridge 10002 sentinel-updater-bridge

install -d -m 755 /etc/sentinel /var/lib/sentinel /var/lib/sentinel/appliance /run/sentinel
install -d -m 775 /var/lib/sentinel/updater /var/lib/sentinel/updater/jobs /var/lib/sentinel/updater/downloads /var/lib/sentinel/updater/backups /var/lib/sentinel/updater/traces
install -d -m 775 \
  /opt/sentinel/deploy/runtime/hotspot-recovery \
  /opt/sentinel/deploy/runtime/hotspot-recovery/requests \
  /opt/sentinel/deploy/runtime/hotspot-recovery/processed \
  /opt/sentinel/deploy/runtime/hotspot-recovery/failed
install -d -m 750 /var/log/sentinel
chown root:sentinel-updater-bridge /var/lib/sentinel/updater /var/lib/sentinel/updater/jobs /var/lib/sentinel/updater/downloads /var/lib/sentinel/updater/backups /var/lib/sentinel/updater/traces
chown root:sentinel-backend \
  /opt/sentinel/deploy/runtime/hotspot-recovery \
  /opt/sentinel/deploy/runtime/hotspot-recovery/requests \
  /opt/sentinel/deploy/runtime/hotspot-recovery/processed \
  /opt/sentinel/deploy/runtime/hotspot-recovery/failed
chmod 775 /var/lib/sentinel/updater /var/lib/sentinel/updater/jobs /var/lib/sentinel/updater/downloads /var/lib/sentinel/updater/backups /var/lib/sentinel/updater/traces
chmod 775 \
  /opt/sentinel/deploy/runtime/hotspot-recovery \
  /opt/sentinel/deploy/runtime/hotspot-recovery/requests \
  /opt/sentinel/deploy/runtime/hotspot-recovery/processed \
  /opt/sentinel/deploy/runtime/hotspot-recovery/failed

if [ -d /opt/sentinel/deploy ]; then
  chmod +x /opt/sentinel/deploy/*.sh 2>/dev/null || true
  chmod +x /opt/sentinel/deploy/*.desktop 2>/dev/null || true
fi
chmod 755 /usr/lib/sentinel/sentinel-update-bridge /usr/lib/sentinel/sentinel-updater

if [ ! -f /etc/sentinel/appliance.env ] && [ -f /opt/sentinel/deploy/.env ]; then
  cp /opt/sentinel/deploy/.env /etc/sentinel/appliance.env
  chmod 600 /etc/sentinel/appliance.env
fi

if [ -f /etc/sentinel/appliance.env ]; then
  ln -sfn /etc/sentinel/appliance.env /opt/sentinel/deploy/.env
fi

if [ ! -f /var/lib/sentinel/appliance/state.json ] && [ -f /opt/sentinel/deploy/.appliance-state ]; then
  WITH_OBS=false
  ALLOW_GRAFANA_LAN=false
  ALLOW_WIKI_LAN=false
  LAN_CIDR=
  CURRENT_VERSION=
  PREVIOUS_VERSION=
  LAST_KNOWN_GOOD_VERSION=
  LAST_ATTEMPTED_VERSION=
  LAST_FAILED_VERSION=
  . /opt/sentinel/deploy/.appliance-state || true
  cat >/var/lib/sentinel/appliance/state.json <<EOF
{
  "schemaVersion": 2,
  "withObs": ${WITH_OBS:-false},
  "allowGrafanaLan": ${ALLOW_GRAFANA_LAN:-false},
  "allowWikiLan": ${ALLOW_WIKI_LAN:-false},
  "lanCidr": "${LAN_CIDR:-}",
  "currentVersion": "${LAST_KNOWN_GOOD_VERSION:-${CURRENT_VERSION:-}}",
  "previousVersion": "${PREVIOUS_VERSION:-}",
  "lastKnownGoodVersion": "${LAST_KNOWN_GOOD_VERSION:-${CURRENT_VERSION:-}}",
  "lastAttemptedVersion": "${LAST_ATTEMPTED_VERSION:-${CURRENT_VERSION:-}}",
  "lastFailedVersion": "${LAST_FAILED_VERSION:-}"
}
EOF
  chmod 644 /var/lib/sentinel/appliance/state.json
fi

if [ -f /var/lib/sentinel/appliance/state.json ] && [ ! -f /opt/sentinel/deploy/.appliance-state ]; then
  current_version="$(sed -n 's/.*"currentVersion":[[:space:]]*"\([^"]*\)".*/\1/p' /var/lib/sentinel/appliance/state.json | head -n1)"
  previous_version="$(sed -n 's/.*"previousVersion":[[:space:]]*"\([^"]*\)".*/\1/p' /var/lib/sentinel/appliance/state.json | head -n1)"
  last_known_good_version="$(sed -n 's/.*"lastKnownGoodVersion":[[:space:]]*"\([^"]*\)".*/\1/p' /var/lib/sentinel/appliance/state.json | head -n1)"
  last_attempted_version="$(sed -n 's/.*"lastAttemptedVersion":[[:space:]]*"\([^"]*\)".*/\1/p' /var/lib/sentinel/appliance/state.json | head -n1)"
  last_failed_version="$(sed -n 's/.*"lastFailedVersion":[[:space:]]*"\([^"]*\)".*/\1/p' /var/lib/sentinel/appliance/state.json | head -n1)"
  with_obs="$(sed -n 's/.*"withObs":[[:space:]]*\(true\|false\).*/\1/p' /var/lib/sentinel/appliance/state.json | head -n1)"
  allow_grafana="$(sed -n 's/.*"allowGrafanaLan":[[:space:]]*\(true\|false\).*/\1/p' /var/lib/sentinel/appliance/state.json | head -n1)"
  allow_wiki="$(sed -n 's/.*"allowWikiLan":[[:space:]]*\(true\|false\).*/\1/p' /var/lib/sentinel/appliance/state.json | head -n1)"
  lan_cidr="$(sed -n 's/.*"lanCidr":[[:space:]]*"\([^"]*\)".*/\1/p' /var/lib/sentinel/appliance/state.json | head -n1)"
  cat >/opt/sentinel/deploy/.appliance-state <<EOF
WITH_OBS=${with_obs:-false}
ALLOW_GRAFANA_LAN=${allow_grafana:-false}
ALLOW_WIKI_LAN=${allow_wiki:-false}
LAN_CIDR=${lan_cidr:-}
CURRENT_VERSION=${current_version:-}
PREVIOUS_VERSION=${previous_version:-}
LAST_KNOWN_GOOD_VERSION=${last_known_good_version:-${current_version:-}}
LAST_ATTEMPTED_VERSION=${last_attempted_version:-${current_version:-}}
LAST_FAILED_VERSION=${last_failed_version:-}
EOF
  chmod 644 /opt/sentinel/deploy/.appliance-state
fi

chgrp -R sentinel-backend /opt/sentinel/deploy/runtime/hotspot-recovery || true
chmod -R g+rwX /opt/sentinel/deploy/runtime/hotspot-recovery || true

if command -v systemctl >/dev/null 2>&1; then
  systemctl disable --now sentinel-system-update-request.path sentinel-system-update-request.service >/dev/null 2>&1 || true
  systemctl daemon-reload || true
  systemctl enable --now sentinel-update-bridge.socket >/dev/null 2>&1 || true
  systemctl enable --now sentinel-updater-prune.timer >/dev/null 2>&1 || true
fi

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database /usr/share/applications || true
fi

if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -q -f /usr/share/icons/hicolor || true
fi

exit 0
POSTINST
chmod 755 "${PKG_ROOT}/DEBIAN/postinst"

mkdir -p "${OUTPUT_DIR}"
OUTPUT_FILE="${OUTPUT_DIR}/${PKG_NAME}_${DEB_VERSION}_all.deb"
dpkg-deb --build --root-owner-group "${PKG_ROOT}" "${OUTPUT_FILE}"
(
  cd "${OUTPUT_DIR}"
  sha256sum "$(basename "${OUTPUT_FILE}")" >SHA256SUMS.txt
)

echo "Built package: ${OUTPUT_FILE}"
