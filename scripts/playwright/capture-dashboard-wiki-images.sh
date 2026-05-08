#!/usr/bin/env bash
set -euo pipefail

SESSION_NAME="${SESSION_NAME:-dashboard-wiki-images}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3001}"
BADGE_NUMBER="${BADGE_NUMBER:-0000000000}"
PIN_CODE="${PIN_CODE:-0000}"
RUN_DATE="$(date +%F)"
STAMP="$(date +%Y%m%d-%H%M%S)"
RUN_DIR=".playwright-cli/runs/dashboard-wiki/${RUN_DATE}/${STAMP}"
LOG_DIR=".playwright-cli/logs/dashboard-wiki/${RUN_DATE}"
ASSET_DIR="${ASSET_DIR:-docs/wiki/assets/wiki-dashboard/operations}"
PLAYWRIGHT_CLI_CONFIG="${PLAYWRIGHT_CLI_CONFIG:-.playwright-cli/cli.config.json}"
WORKFLOW_FILE=".playwright-cli/artifacts/dashboard-wiki-capture-${STAMP}.js"

mkdir -p "$RUN_DIR" "$LOG_DIR" "$ASSET_DIR" "$(dirname "$WORKFLOW_FILE")"

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
async (page) => {
  const baseUrl = __FRONTEND_URL__
  const badgeNumber = __BADGE_NUMBER__
  const pinCode = __PIN_CODE__
  const assetDir = __ASSET_DIR__

  const filename = (name) => `${assetDir}/${name}.png`
  const wait = (ms) => page.waitForTimeout(ms)

  async function hideChrome() {
    await page.addStyleTag({
      content: `
        nextjs-portal,
        [aria-label="Open Next.js Dev Tools"],
        [data-nextjs-toast],
        .nextjs-toast {
          display: none !important;
          visibility: hidden !important;
        }
      `,
    })

    await page.evaluate(() => {
      for (const element of Array.from(document.body.querySelectorAll('*'))) {
        const style = window.getComputedStyle(element)
        if (style.position !== 'fixed') continue

        const rect = element.getBoundingClientRect()
        const isBottomRight = rect.left > window.innerWidth - 120 && rect.top > window.innerHeight - 120
        const hasVisibleText = Boolean(element.textContent?.trim())

        if (isBottomRight && !hasVisibleText) {
          element.setAttribute('data-sentinel-wiki-hidden', 'true')
          element.style.setProperty('display', 'none', 'important')
          element.style.setProperty('visibility', 'hidden', 'important')
        }
      }
    })
  }

  async function login() {
    await page.goto(`${baseUrl.replace(/\/+$/, '')}/login`)
    await page.waitForLoadState('networkidle')

    if (await page.getByTestId('auth-badge-input').isVisible().catch(() => false)) {
      await page.getByTestId('auth-badge-input').fill(badgeNumber)
      await page.keyboard.press('Enter')
    }

    await page.getByTestId('auth-pin-input').waitFor({ state: 'visible', timeout: 10000 })
    await page.getByTestId('auth-pin-input').fill(pinCode)
    await page.getByTestId('auth-pin-submit').click()
    await page.waitForURL('**/dashboard', { timeout: 15000 })
    await page.waitForSelector('[data-help-id="dashboard.root"]', { timeout: 15000 })
    await hideChrome()
    await wait(500)
  }

  async function screenshot(name, selector, options = {}) {
    if (!options.keepSystemStatusOpen) {
      await dismissSystemStatus()
    }
    const locator = page.locator(selector).first()
    if ((await locator.count()) === 0) {
      await page.screenshot({ path: filename(name), fullPage: false })
      return
    }

    await locator.scrollIntoViewIfNeeded().catch(() => undefined)
    await wait(options.delay || 200)
    await locator.screenshot({ path: filename(name) })
  }

  async function viewport(name, options = {}) {
    if (!options.keepSystemStatusOpen) {
      await dismissSystemStatus()
    }
    await hideChrome()
    await page.screenshot({ path: filename(name), fullPage: false })
  }

  async function dismissSystemStatus() {
    const viewportHeight = await page.evaluate(() => window.innerHeight).catch(() => 1080)
    await page.mouse.move(24, viewportHeight - 24).catch(() => undefined)
    await wait(150)
  }

  await login()

  await viewport('dashboard-overview-main')
  await screenshot('dashboard-navbar-overview', '[data-help-id="nav.root"]')

  await page.locator('[data-help-id="nav.system-status"]').hover()
  await wait(500)
  await viewport('dashboard-system-status-dropdown', { keepSystemStatusOpen: true })

  await screenshot('dashboard-security-alerts-none', '[data-help-id="dashboard.security-alerts"]')
  await page.evaluate(() => {
    const alerts = document.querySelector('[data-help-id="dashboard.security-alerts"]')
    if (!alerts) return
    alerts.innerHTML = `
      <section class="alert alert-warning shadow-sm border border-warning/40" style="margin: 0;">
        <div>
          <strong>Demo alert: visitor still checked in</strong>
          <div style="font-size: 0.875rem;">Sanitized training example. Confirm the visitor is still on site before acknowledging.</div>
        </div>
      </section>
    `
  })
  await screenshot('dashboard-security-alerts-active', '[data-help-id="dashboard.security-alerts"]')

  await page.reload()
  await page.waitForSelector('[data-help-id="dashboard.root"]', { timeout: 15000 })
  await hideChrome()
  await screenshot('dashboard-status-panel-focus', '[data-help-id="dashboard.status-stats"]')
  await screenshot('dashboard-quick-actions-focus', '[data-help-id="dashboard.stat.actions"]')
  await screenshot('dashboard-presence-grid-focus', '[data-help-id="dashboard.presence"]')
  await screenshot('dashboard-presence-search', '[data-help-id="dashboard.presence.filters"]')
  await screenshot('dashboard-person-card-focus', '[data-help-id="dashboard.presence.person-card"], [data-help-id="dashboard.presence.cards"]')

  const firstCard = page.locator('[data-help-id="dashboard.presence.person-card"]').first()
  if ((await firstCard.count()) > 0) {
    await firstCard.click()
    await wait(500)
    await viewport('dashboard-member-action-panel')
    await page.keyboard.press('Escape').catch(() => undefined)
  } else {
    await viewport('dashboard-member-action-panel')
  }

  const visitorCheckout = page.locator('[data-help-id="dashboard.presence.visitor-checkout"]').first()
  if ((await visitorCheckout.count()) > 0) {
    await visitorCheckout.scrollIntoViewIfNeeded()
    await wait(200)
    await visitorCheckout.screenshot({ path: filename('dashboard-visitor-checkout') })
  } else {
    await screenshot('dashboard-visitor-checkout', '[data-help-id="dashboard.presence"]')
  }

  const manual = page.locator('[data-help-id="dashboard.presence.manual-in-out"]').first()
  if ((await manual.count()) > 0) {
    await manual.click()
    await wait(700)
    await viewport('dashboard-manual-in-out-modal')
    await page.keyboard.press('Escape').catch(() => undefined)
  } else {
    await viewport('dashboard-manual-in-out-modal')
  }

  await screenshot('dashboard-lockup-ready-state', '[data-help-id="dashboard.status-stats"]')
}
JS

node - "$WORKFLOW_FILE" "$FRONTEND_URL" "$BADGE_NUMBER" "$PIN_CODE" "$ASSET_DIR" <<'NODE'
const fs = require('fs')

const [file, frontendUrl, badgeNumber, pinCode, assetDir] = process.argv.slice(2)
let source = fs.readFileSync(file, 'utf8')
const replacements = {
  __FRONTEND_URL__: JSON.stringify(frontendUrl),
  __BADGE_NUMBER__: JSON.stringify(badgeNumber),
  __PIN_CODE__: JSON.stringify(pinCode),
  __ASSET_DIR__: JSON.stringify(assetDir),
}

for (const [token, value] of Object.entries(replacements)) {
  source = source.replace(token, value)
}

fs.writeFileSync(file, source)
NODE

FRONTEND_URL="$FRONTEND_URL" BADGE_NUMBER="$BADGE_NUMBER" PIN_CODE="$PIN_CODE" ASSET_DIR="$ASSET_DIR" \
  playwright_cli -s="$SESSION_NAME" open --browser=chromium --config="$PLAYWRIGHT_CLI_CONFIG" "$FRONTEND_URL/login"
playwright_cli -s="$SESSION_NAME" resize 1920 1080
FRONTEND_URL="$FRONTEND_URL" BADGE_NUMBER="$BADGE_NUMBER" PIN_CODE="$PIN_CODE" ASSET_DIR="$ASSET_DIR" \
  playwright_cli -s="$SESSION_NAME" run-code --filename="$WORKFLOW_FILE"
playwright_cli -s="$SESSION_NAME" snapshot --filename="${RUN_DIR}/dashboard-wiki.yml" || true
playwright_cli -s="$SESSION_NAME" close || true

relocate_root_artifacts "$ROOT_ARTIFACTS_BEFORE"
rm -f "$ROOT_ARTIFACTS_BEFORE"

echo "Saved dashboard wiki screenshots to:"
echo "  ${ASSET_DIR}"
echo "Run artifacts:"
echo "  ${RUN_DIR}"
