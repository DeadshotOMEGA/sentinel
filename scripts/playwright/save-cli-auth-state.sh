#!/usr/bin/env bash
set -euo pipefail

SESSION_NAME="${1:-sentinel-auth}"
BASE_URL="${BASE_URL:-http://localhost:3001}"
PLAYWRIGHT_BADGE_SERIAL="${PLAYWRIGHT_BADGE_SERIAL:-${E2E_BADGE_SERIAL:-0000000000}}"
PLAYWRIGHT_REMOTE_SYSTEM="${PLAYWRIGHT_REMOTE_SYSTEM:-}"
PLAYWRIGHT_CLI_CONFIG="${PLAYWRIGHT_CLI_CONFIG:-.playwright-cli/cli.config.json}"
AUTH_STATE_PATH="${AUTH_STATE_PATH:-.playwright-cli/auth/bootstrap.json}"
RUN_DATE="$(date +%F)"
STAMP="$(date +%Y%m%d-%H%M%S)"
RUN_DIR=".playwright-cli/runs/auth/${RUN_DATE}/${STAMP}"
LOG_DIR=".playwright-cli/logs/auth/${RUN_DATE}"
WORKFLOW_FILE=".playwright-cli/artifacts/save-auth-state-${STAMP}.js"

mkdir -p "$(dirname "$AUTH_STATE_PATH")"
mkdir -p "$RUN_DIR" "$LOG_DIR" "$(dirname "$WORKFLOW_FILE")"

if [[ -z "$PLAYWRIGHT_REMOTE_SYSTEM" ]]; then
  PLAYWRIGHT_REMOTE_SYSTEM="Brow"
fi

playwright_cli() {
  playwright-cli "$@"
}

list_root_artifacts() {
  find .playwright-cli -maxdepth 1 -type f \( -name 'console-*.log' -o -name 'page-*.yml' \) -printf '%f\n' | sort
}

relocate_root_artifacts() {
  local before_file="$1"
  local after_file
  after_file="$(mktemp)"
  list_root_artifacts >"$after_file"

  while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    case "$file" in
      console-*.log) mv ".playwright-cli/$file" "${LOG_DIR}/${file}" ;;
      page-*.yml) mv ".playwright-cli/$file" "${RUN_DIR}/${file}" ;;
    esac
  done < <(comm -13 "$before_file" "$after_file")

  rm -f "$after_file"
}

ROOT_ARTIFACTS_BEFORE="$(mktemp)"
list_root_artifacts >"$ROOT_ARTIFACTS_BEFORE"

cat >"$WORKFLOW_FILE" <<'JS'
async page => {
  const badgeSerial = __PLAYWRIGHT_BADGE_SERIAL__
  const preferredRemoteSystem = __PLAYWRIGHT_REMOTE_SYSTEM__
  const authStatePath = __AUTH_STATE_PATH__

  await page.getByTestId('auth-badge-input').fill(badgeSerial)
  await page.keyboard.press('Enter')

  const remoteSystemSelect = page.getByTestId('auth-remote-system-select')
  await remoteSystemSelect.waitFor({ state: 'visible', timeout: 30000 })

  const desiredRemoteSystemValue = await remoteSystemSelect.evaluate(
    (element, expectedLabel) => {
      if (!(element instanceof HTMLSelectElement)) {
        return null
      }

      const normalizedLabel = String(expectedLabel).trim().toLowerCase()
      const matchingOption = Array.from(element.options).find(
        option => option.label.trim().toLowerCase() === normalizedLabel && !option.disabled
      )

      return matchingOption?.value ?? null
    },
    preferredRemoteSystem
  )

  if (!desiredRemoteSystemValue) {
    throw new Error(preferredRemoteSystem + ' is not available on the login screen')
  }
  await remoteSystemSelect.selectOption(desiredRemoteSystemValue)

  await page.getByTestId('auth-login-submit').click()
  await page.waitForURL('**/dashboard', { timeout: 30000 })
  await page.waitForFunction(() => {
    const rawAuthState = window.localStorage.getItem('auth-storage')
    if (!rawAuthState) {
      return false
    }

    try {
      const parsedAuthState = JSON.parse(rawAuthState)
      const state = parsedAuthState?.state
      return (
        state?.isAuthenticated === true &&
        typeof state?.token === 'string' &&
        state.token.length > 0 &&
        Boolean(state?.member) &&
        Boolean(state?.session)
      )
    } catch {
      return false
    }
  }, null, { timeout: 30000 })

  await page.context().storageState({ path: authStatePath })
}
JS

node - "$WORKFLOW_FILE" "$PLAYWRIGHT_BADGE_SERIAL" "$PLAYWRIGHT_REMOTE_SYSTEM" "$AUTH_STATE_PATH" <<'NODE'
const fs = require('fs')

const [file, badgeSerial, remoteSystem, authStatePath] = process.argv.slice(2)
let source = fs.readFileSync(file, 'utf8')
const replacements = {
  __PLAYWRIGHT_BADGE_SERIAL__: JSON.stringify(badgeSerial),
  __PLAYWRIGHT_REMOTE_SYSTEM__: JSON.stringify(remoteSystem),
  __AUTH_STATE_PATH__: JSON.stringify(authStatePath),
}

for (const [token, value] of Object.entries(replacements)) {
  source = source.replace(token, value)
}

fs.writeFileSync(file, source)
NODE

playwright_cli -s="$SESSION_NAME" close >/dev/null 2>&1 || true
playwright_cli -s="$SESSION_NAME" open --browser=chromium --config="$PLAYWRIGHT_CLI_CONFIG" "$BASE_URL/login" >/dev/null
playwright_cli -s="$SESSION_NAME" resize 1920 1080 >/dev/null

playwright_cli -s="$SESSION_NAME" run-code --filename="$WORKFLOW_FILE" >/dev/null

playwright_cli -s="$SESSION_NAME" close >/dev/null 2>&1 || true
relocate_root_artifacts "$ROOT_ARTIFACTS_BEFORE"
rm -f "$ROOT_ARTIFACTS_BEFORE"

echo "Saved playwright-cli auth state to $AUTH_STATE_PATH"
