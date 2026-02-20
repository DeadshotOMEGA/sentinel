#!/usr/bin/env bash
set -euo pipefail

SESSION_NAME="${1:-sentinel-auth}"
BASE_URL="${BASE_URL:-http://localhost:3001}"
E2E_BADGE_SERIAL="${E2E_BADGE_SERIAL:-CLAUDE-E2E-BADGE}"
E2E_PIN="${E2E_PIN:-9999}"
AUTH_STATE_PATH="${AUTH_STATE_PATH:-.playwright-cli/auth.json}"

mkdir -p "$(dirname "$AUTH_STATE_PATH")"

playwright-cli -s="$SESSION_NAME" close >/dev/null 2>&1 || true
playwright-cli -s="$SESSION_NAME" open "$BASE_URL/login" >/dev/null

playwright-cli -s="$SESSION_NAME" run-code "
async page => {
  await page.getByTestId('auth-badge-input').fill(process.env.E2E_BADGE_SERIAL || '$E2E_BADGE_SERIAL')
  await page.keyboard.press('Enter')
  await page.getByTestId('auth-pin-input').fill(process.env.E2E_PIN || '$E2E_PIN')
  await page.waitForURL('**/dashboard', { timeout: 30000 })
}
" >/dev/null

playwright-cli -s="$SESSION_NAME" state-save "$AUTH_STATE_PATH" >/dev/null
playwright-cli -s="$SESSION_NAME" close >/dev/null 2>&1 || true

echo "Saved playwright-cli auth state to $AUTH_STATE_PATH"
