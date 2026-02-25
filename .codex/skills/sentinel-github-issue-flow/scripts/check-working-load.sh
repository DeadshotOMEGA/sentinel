#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<USAGE
Usage: check-working-load.sh --repo <owner/repo> [--exclude-issue <n>] [--limit <n>]
USAGE
}

REPO=""
EXCLUDE_ISSUE=""
LIMIT="200"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      REPO="${2:-}"
      shift 2
      ;;
    --exclude-issue)
      EXCLUDE_ISSUE="${2:-}"
      shift 2
      ;;
    --limit)
      LIMIT="${2:-}"
      shift 2
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

command -v gh >/dev/null 2>&1 || { echo "Missing dependency: gh" >&2; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "Missing dependency: jq" >&2; exit 1; }

[[ -n "${REPO}" ]] || { echo "--repo is required" >&2; exit 1; }

ISSUES_JSON="$(gh issue list --repo "${REPO}" --state open --label status:working --limit "${LIMIT}" --json number,title,url)"

if [[ -n "${EXCLUDE_ISSUE}" ]]; then
  ISSUES_JSON="$(jq --argjson exclude "${EXCLUDE_ISSUE}" '[ .[] | select(.number != $exclude) ]' <<<"${ISSUES_JSON}")"
fi

COUNT="$(jq 'length' <<<"${ISSUES_JSON}")"

jq -n --arg repo "${REPO}" --argjson count "${COUNT}" --argjson issues "${ISSUES_JSON}" '{repo:$repo,count:$count,issues:$issues}'
