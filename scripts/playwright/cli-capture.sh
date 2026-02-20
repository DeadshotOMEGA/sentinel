#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <session-name> <label> [subdir]"
  echo "Example: $0 members-qa round1 members"
  exit 1
fi

SESSION_NAME="$1"
LABEL="$2"
SUBDIR="${3:-ad-hoc}"
STAMP="$(date +%Y%m%d-%H%M%S)"
ARTIFACT_DIR="test-results/manual/playwright-cli/${SUBDIR}"

mkdir -p "$ARTIFACT_DIR"

playwright-cli -s="$SESSION_NAME" snapshot --filename="${ARTIFACT_DIR}/${LABEL}-${STAMP}.yml"
playwright-cli -s="$SESSION_NAME" screenshot --filename="${ARTIFACT_DIR}/${LABEL}-${STAMP}.png"

echo "Saved:"
echo "  ${ARTIFACT_DIR}/${LABEL}-${STAMP}.yml"
echo "  ${ARTIFACT_DIR}/${LABEL}-${STAMP}.png"
