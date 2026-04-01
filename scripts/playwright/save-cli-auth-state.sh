#!/usr/bin/env bash
set -euo pipefail

SESSION_NAME="${1:-sentinel-auth}"
BASE_URL="${BASE_URL:-http://localhost:3001}"
PLAYWRIGHT_BADGE_SERIAL="${PLAYWRIGHT_BADGE_SERIAL:-${E2E_BADGE_SERIAL:-0000000000}}"
PLAYWRIGHT_PIN="${PLAYWRIGHT_PIN:-${E2E_PIN:-0000}}"
PLAYWRIGHT_REMOTE_SYSTEM="${PLAYWRIGHT_REMOTE_SYSTEM:-Deployment Laptop}"
PLAYWRIGHT_CLI_CONFIG="${PLAYWRIGHT_CLI_CONFIG:-.playwright-cli/cli.config.json}"
AUTH_STATE_PATH="${AUTH_STATE_PATH:-.playwright-cli/auth/bootstrap.json}"
RUN_DATE="$(date +%F)"
STAMP="$(date +%Y%m%d-%H%M%S)"
RUN_DIR=".playwright-cli/runs/auth/${RUN_DATE}/${STAMP}"
LOG_DIR=".playwright-cli/logs/auth/${RUN_DATE}"

mkdir -p "$(dirname "$AUTH_STATE_PATH")"
mkdir -p "$RUN_DIR" "$LOG_DIR"

playwright_cli() {
  playwright-cli --config="$PLAYWRIGHT_CLI_CONFIG" "$@"
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

playwright_cli -s="$SESSION_NAME" close >/dev/null 2>&1 || true
playwright_cli -s="$SESSION_NAME" open "$BASE_URL/login" >/dev/null
playwright_cli -s="$SESSION_NAME" resize 1920 1080 >/dev/null

playwright_cli -s="$SESSION_NAME" run-code "
async page => {
  const preferredRemoteSystem = process.env.PLAYWRIGHT_REMOTE_SYSTEM ?? 'Deployment Laptop'

  await page.getByTestId('auth-badge-input').fill('$PLAYWRIGHT_BADGE_SERIAL')
  await page.keyboard.press('Enter')
  await page.getByTestId('auth-pin-input').waitFor({ state: 'visible', timeout: 30000 })
  await page.getByTestId('auth-pin-input').fill('$PLAYWRIGHT_PIN')

  const remoteSystemSelect = page.getByTestId('auth-remote-system-select')
  await remoteSystemSelect.waitFor({ state: 'visible', timeout: 30000 })

  const desiredRemoteSystemValue = await remoteSystemSelect.evaluate(
    (element, expectedLabel) => {
      if (!(element instanceof HTMLSelectElement)) {
        return null
      }

      const normalizedLabel = String(expectedLabel).trim().toLowerCase()
      const matchingOption = Array.from(element.options).find(
        option => option.label.trim().toLowerCase() === normalizedLabel
      )

      return matchingOption?.value ?? null
    },
    preferredRemoteSystem
  )

  const fallbackRemoteSystemValue = await remoteSystemSelect.evaluate(element => {
    if (!(element instanceof HTMLSelectElement)) {
      return null
    }

    const firstManagedOption = Array.from(element.options).find(
      option => option.value.length > 0 && !option.disabled
    )

    return firstManagedOption?.value ?? null
  })

  const selectedRemoteSystemValue = desiredRemoteSystemValue ?? fallbackRemoteSystemValue
  if (!selectedRemoteSystemValue) {
    throw new Error('No managed remote systems are available on the login screen')
  }
  await remoteSystemSelect.selectOption(selectedRemoteSystemValue)

  await page.getByTestId('auth-pin-submit').click()
  await page.waitForURL('**/dashboard', { timeout: 30000 })
}
" >/dev/null

playwright_cli -s="$SESSION_NAME" state-save "$AUTH_STATE_PATH" >/dev/null
playwright_cli -s="$SESSION_NAME" close >/dev/null 2>&1 || true
relocate_root_artifacts "$ROOT_ARTIFACTS_BEFORE"
rm -f "$ROOT_ARTIFACTS_BEFORE"

echo "Saved playwright-cli auth state to $AUTH_STATE_PATH"
