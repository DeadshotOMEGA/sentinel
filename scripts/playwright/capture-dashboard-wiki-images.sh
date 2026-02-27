#!/usr/bin/env bash
set -euo pipefail

SESSION_NAME="${1:-sentinel-dashboard-docs}"
BASE_URL="${BASE_URL:-http://localhost:3001}"
AUTH_STATE_PATH="${AUTH_STATE_PATH:-.playwright-cli/auth.json}"
OUT_ROOT="${OUT_ROOT:-test-results/manual/playwright-cli/dashboard-wiki}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="${OUT_ROOT}/${STAMP}"

mkdir -p "$OUT_DIR"

if [[ ! -f "$AUTH_STATE_PATH" ]]; then
  echo "Missing auth state: $AUTH_STATE_PATH"
  echo "Run: pnpm playwright-cli:auth"
  exit 1
fi

playwright-cli -s="$SESSION_NAME" close >/dev/null 2>&1 || true
playwright-cli -s="$SESSION_NAME" open "${BASE_URL}/dashboard" >/dev/null
playwright-cli -s="$SESSION_NAME" state-load "$AUTH_STATE_PATH" >/dev/null
playwright-cli -s="$SESSION_NAME" goto "${BASE_URL}/dashboard" >/dev/null
playwright-cli -s="$SESSION_NAME" snapshot --filename="${OUT_DIR}/dashboard-full-default.yml" >/dev/null

read -r -d '' CAPTURE_JS <<'JS' || true
async page => {
  const outDir = '__OUT_DIR__'
  const captures = [
    ['dashboard-full-default', null],
    ['dashboard-security-alerts-focus', '[data-help-id="dashboard.security-alerts"]'],
    ['dashboard-quick-actions-focus', '[data-help-id="dashboard.quick-actions"]'],
    ['dashboard-status-panel-focus', '[data-help-id="dashboard.status-stats"]'],
    ['dashboard-presence-grid-focus', '[data-help-id="dashboard.presence"]'],
    ['dashboard-state-alerts-active', '[data-help-id="dashboard.security-alerts"]'],
    ['dashboard-state-duty-watch-gap', '[data-help-id="dashboard.stat.duty-watch"]'],
    ['dashboard-state-lockup-held', '[data-help-id="dashboard.stat.lockup-holder"]'],
  ]

  const missing = []

  await page.setViewportSize({ width: 1440, height: 1100 })
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(300)

  for (const [name, selector] of captures) {
    if (!selector) {
      await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true })
      continue
    }

    const target = page.locator(selector).first()
    const found = (await target.count()) > 0
    if (!found) {
      missing.push(`${name} => ${selector}`)
      await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true })
      continue
    }

    await target.scrollIntoViewIfNeeded()
    await page.waitForTimeout(150)
    await target.screenshot({ path: `${outDir}/${name}.png` })
  }

  if (missing.length > 0) {
    console.log(`[dashboard-wiki-capture] Missing selectors:\n${missing.join('\n')}`)
  }
}
JS

CAPTURE_JS="${CAPTURE_JS//__OUT_DIR__/$OUT_DIR}"
playwright-cli -s="$SESSION_NAME" run-code "$CAPTURE_JS" >/dev/null
playwright-cli -s="$SESSION_NAME" close >/dev/null 2>&1 || true

cat > "${OUT_DIR}/_index.json" <<'JSON'
{
  "dashboard-full-default": "Full dashboard baseline",
  "dashboard-security-alerts-focus": "Security alerts section",
  "dashboard-quick-actions-focus": "Quick actions section",
  "dashboard-status-panel-focus": "Status panel section",
  "dashboard-presence-grid-focus": "Presence grid section",
  "dashboard-state-alerts-active": "Operational alert-state variant",
  "dashboard-state-duty-watch-gap": "Duty watch gap variant",
  "dashboard-state-lockup-held": "Lockup holder variant"
}
JSON

echo "Saved dashboard wiki capture set to ${OUT_DIR}"
echo "Next: copy selected PNG files to screenshots/badges-ux/wiki-dashboard"
