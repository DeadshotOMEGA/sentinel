#!/usr/bin/env bash

set -euo pipefail

ROOT_HELPER="${ROOT_HELPER:-/usr/local/sbin/recover-sentinel-hotspot-root}"

if [[ $# -ne 0 ]]; then
  printf 'Usage: %s\n' "$0" >&2
  exit 64
fi

exec sudo -n -- "${ROOT_HELPER}"
