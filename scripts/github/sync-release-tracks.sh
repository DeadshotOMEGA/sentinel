#!/usr/bin/env bash
set -euo pipefail

# Synchronize Sentinel release tracks across:
# 1) GitHub Project "Release" single-select options
# 2) Repository milestones
#
# Inputs:
# - arg1: owner/repo (optional; defaults to current gh repo)
# - env CURRENT_RELEASE_VERSION: X.Y.Z or vX.Y.Z (optional; defaults to package.json version)
# - env PROJECT_NUMBER: GitHub project number (default: 3)
# - env PROJECT_OWNER: GitHub project owner login (optional; defaults to repo owner lowercase)
# - env PROJECTS_TOKEN: optional PAT used for GitHub Project operations when Actions' default token lacks project scopes

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || true)"
CURRENT_RELEASE_VERSION="${CURRENT_RELEASE_VERSION:-}"
PROJECT_NUMBER="${PROJECT_NUMBER:-3}"
PROJECT_OWNER="${PROJECT_OWNER:-}"
RESOLVED_PROJECT_OWNER=""

require() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing dependency: $1" >&2
    exit 1
  }
}

die() {
  echo "Error: $*" >&2
  exit 1
}

warn() {
  echo "Warning: $*" >&2
}

info() {
  echo "$*"
}

require gh
require jq

if [[ -z "${REPO_ROOT}" ]]; then
  REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
fi
cd "$REPO_ROOT"

ensure_gh_auth() {
  # In CI, gh commonly authenticates via GH_TOKEN/GITHUB_TOKEN rather than stored hosts.yml state.
  if [[ -n "${GH_TOKEN:-}" || -n "${GITHUB_TOKEN:-}" ]]; then
    if ! gh api rate_limit >/dev/null 2>&1; then
      die "GitHub CLI token auth failed. Verify GH_TOKEN/GITHUB_TOKEN and required scopes."
    fi
    return 0
  fi

  if ! gh auth status >/dev/null 2>&1; then
    die "GitHub CLI is not authenticated. Run: gh auth login"
  fi
}

ensure_gh_auth

REPO="${1:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"
OWNER="${REPO%%/*}"

resolve_version() {
  local value="${CURRENT_RELEASE_VERSION}"
  if [[ -z "${value}" ]]; then
    value="$(jq -r '.version' "${REPO_ROOT}/package.json" 2>/dev/null || true)"
  fi
  value="${value#v}"
  if [[ ! "${value}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    die "Current release must be SemVer X.Y.Z; got: ${value:-<empty>}"
  fi
  printf '%s\n' "${value}"
}

build_release_tracks() {
  local semver="${1}"
  local major minor patch
  IFS='.' read -r major minor patch <<<"${semver}"
  printf 'v%s.%s.%s\n' "${major}" "${minor}" "${patch}"
  printf 'v%s.%s.%s\n' "${major}" "${minor}" "$((patch + 1))"
  printf 'v%s.%s.0\n' "${major}" "$((minor + 1))"
  printf 'v%s.0.0\n' "$((major + 1))"
}

CURRENT_SEMVER="$(resolve_version)"
mapfile -t RELEASE_TRACKS < <(build_release_tracks "${CURRENT_SEMVER}")
CURRENT_RELEASE="${RELEASE_TRACKS[0]}"
PATCH_RELEASE="${RELEASE_TRACKS[1]}"
MINOR_RELEASE="${RELEASE_TRACKS[2]}"
MAJOR_RELEASE="${RELEASE_TRACKS[3]}"

info "Repo: ${REPO}"
info "Project number: ${PROJECT_NUMBER}"
info "Release tracks: $(IFS=', '; echo "${RELEASE_TRACKS[*]}")"

resolve_project_owner() {
  local candidate
  local configured_owner="${PROJECT_OWNER}"

  if [[ -n "${configured_owner}" ]]; then
    if run_project_gh project field-list "${PROJECT_NUMBER}" --owner "${configured_owner}" --format json >/dev/null 2>&1; then
      RESOLVED_PROJECT_OWNER="${configured_owner}"
      return 0
    fi
    return 1
  fi

  for candidate in "${OWNER,,}" "${OWNER}" "@me"; do
    if run_project_gh project field-list "${PROJECT_NUMBER}" --owner "${candidate}" --format json >/dev/null 2>&1; then
      RESOLVED_PROJECT_OWNER="${candidate}"
      return 0
    fi
  done

  return 1
}

fetch_milestones() {
  gh api --paginate "repos/${REPO}/milestones?state=all&per_page=100" --jq '.[].title'
}

run_project_gh() {
  if [[ -n "${PROJECTS_TOKEN:-}" ]]; then
    GH_TOKEN="${PROJECTS_TOKEN}" GITHUB_TOKEN="${PROJECTS_TOKEN}" gh "$@"
    return $?
  fi

  gh "$@"
}

MILESTONES="$(fetch_milestones)"
for milestone in "${RELEASE_TRACKS[@]}"; do
  if grep -Fxq "${milestone}" <<<"${MILESTONES}"; then
    info "Milestone exists: ${milestone}"
  else
    gh api --method POST "repos/${REPO}/milestones" -f title="${milestone}" >/dev/null
    info "Created milestone: ${milestone}"
    MILESTONES+=$'\n'"${milestone}"
  fi
done

sync_project_release_field() {
  local release_field_id release_mutation

  if ! resolve_project_owner; then
    return 1
  fi
  info "Project owner: ${RESOLVED_PROJECT_OWNER}"

  release_field_id="$(
    run_project_gh project field-list "${PROJECT_NUMBER}" --owner "${RESOLVED_PROJECT_OWNER}" --format json --jq '.fields[] | select(.name == "Release") | .id' | head -n1
  )"

  if [[ -z "${release_field_id}" ]]; then
    run_project_gh project field-create "${PROJECT_NUMBER}" --owner "${RESOLVED_PROJECT_OWNER}" --name "Release" --data-type "SINGLE_SELECT" --single-select-options "$(IFS=,; echo "${RELEASE_TRACKS[*]}")" >/dev/null
    release_field_id="$(
      run_project_gh project field-list "${PROJECT_NUMBER}" --owner "${RESOLVED_PROJECT_OWNER}" --format json --jq '.fields[] | select(.name == "Release") | .id' | head -n1
    )"
  fi

  [[ -n "${release_field_id}" ]] || return 1

  release_mutation="$(cat <<GRAPHQL
mutation(\$fieldId:ID!){
  updateProjectV2Field(input:{
    fieldId:\$fieldId,
    name:"Release",
    singleSelectOptions:[
      {name:"${CURRENT_RELEASE}",description:"Current release",color:GRAY},
      {name:"${PATCH_RELEASE}",description:"Patch release",color:BLUE},
      {name:"${MINOR_RELEASE}",description:"Minor release",color:YELLOW},
      {name:"${MAJOR_RELEASE}",description:"Major release",color:RED}
    ]
  }){
    projectV2Field{
      ... on ProjectV2SingleSelectField{
        id
        name
        options{
          id
          name
        }
      }
    }
  }
}
GRAPHQL
)"

  run_project_gh api graphql -f query="${release_mutation}" -f fieldId="${release_field_id}" >/dev/null
}

if sync_project_release_field; then
  info "Synced project Release options."
else
  warn "Skipping GitHub Project Release sync. Verify PROJECTS_TOKEN scopes/SSO or set PROJECT_OWNER explicitly if needed."
fi

info "Done."
