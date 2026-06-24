#!/usr/bin/env bash
set -euo pipefail

SESSION_NAME="${SESSION_NAME:-dashboard-wiki-images}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3001}"
BADGE_NUMBER="${BADGE_NUMBER:-0000000000}"
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

    await page.getByTestId('auth-remote-system-select').waitFor({ state: 'visible', timeout: 10000 })
    await page.getByTestId('auth-login-submit').click()
    await page.waitForURL('**/dashboard', { timeout: 15000 })
    await page.waitForSelector('[data-help-id="dashboard.root"]', { timeout: 15000 })
    await hideChrome()
    await wait(500)
  }

  async function captureLoginFlow() {
    await page.goto(`${baseUrl.replace(/\/+$/, '')}/login`)
    await page.waitForLoadState('networkidle')
    await hideChrome()
    await wait(500)
    await viewport('sentinel-login-badge-entry')

    if (await page.getByTestId('auth-badge-input').isVisible().catch(() => false)) {
      await page.getByTestId('auth-badge-input').fill(badgeNumber)
      await page.keyboard.press('Enter')
    }

    await page.getByTestId('auth-remote-system-select').waitFor({ state: 'visible', timeout: 10000 })
    await wait(500)
    await viewport('sentinel-login-workstation-entry')

    await page.getByTestId('auth-login-submit').click()
    await page.waitForURL('**/dashboard', { timeout: 15000 })
    await page.waitForSelector('[data-help-id="dashboard.root"]', { timeout: 15000 })
    await hideChrome()
    await wait(500)
    await viewport('sentinel-login-dashboard-confirmation')
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

  async function screenshotBox(name, selector, padding = 12, options = {}) {
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
    const box = await locator.boundingBox()
    if (!box) {
      await page.screenshot({ path: filename(name), fullPage: false })
      return
    }

    const viewport = page.viewportSize() ?? { width: 1920, height: 1080 }
    const desiredWidth = Math.max(box.width + padding * 2, options.minWidth ?? 0)
    const desiredHeight = Math.max(box.height + padding * 2, options.minHeight ?? 0)
    const x = Math.max(0, Math.min(box.x + box.width / 2 - desiredWidth / 2, viewport.width - desiredWidth))
    const y = Math.max(0, Math.min(box.y + box.height / 2 - desiredHeight / 2, viewport.height - desiredHeight))

    await page.screenshot({
      path: filename(name),
      clip: {
        x,
        y,
        width: Math.min(viewport.width - x, desiredWidth),
        height: Math.min(viewport.height - y, desiredHeight),
      },
    })
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

  async function stagePresenceEmptyState() {
    await page.evaluate(() => {
      const cards = document.querySelector('[data-help-id="dashboard.presence.cards"]')
      if (!cards) return
      cards.innerHTML = `
        <div class="rounded-box border border-base-300 bg-base-100 p-8 text-center text-base-content/70" style="grid-column: 1 / -1;">
          <p style="font-weight: 700; color: #101828; margin-bottom: .25rem;">No people match this view</p>
          <p>Clear search and filters before deciding nobody is checked in.</p>
        </div>
      `
    })
  }

  async function stageVisitorCheckoutCard() {
    await page.evaluate(() => {
      const cards = document.querySelector('[data-help-id="dashboard.presence.cards"]')
      if (!cards) return
      cards.innerHTML = `
        <button type="button" data-help-id="dashboard.presence.person-card" class="btn h-auto min-h-32 justify-start border border-warning/40 bg-base-100 p-4 text-left shadow-sm" style="width: 320px;">
          <div style="display: flex; width: 100%; flex-direction: column; gap: .75rem;">
            <div style="display: flex; align-items: center; gap: .75rem;">
              <div class="badge badge-warning">VISITOR</div>
              <div>
                <h3 style="font-size: 1rem; font-weight: 700; margin: 0;">Alex Visitor</h3>
                <p style="font-size: .8rem; margin: 0; opacity: .72;">Training Group</p>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: .85rem;">Checked in 2h ago</span>
              <span data-help-id="dashboard.presence.visitor-checkout" class="btn btn-outline btn-warning btn-xs">Check out</span>
            </div>
          </div>
        </button>
      `
    })
  }

  async function stageDutyWatchCardIfMissing() {
    const existing = page.locator('[data-help-id="dashboard.stat.duty-watch"]').first()
    if ((await existing.count()) > 0) return

    await page.evaluate(() => {
      const stats = document.querySelector('[data-help-id="dashboard.status-stats"]')
      if (!stats) return
      const card = document.createElement('section')
      card.setAttribute('data-help-id', 'dashboard.stat.duty-watch')
      card.className = 'bg-base-100 shadow-sm border border-base-300'
      card.style.cssText =
        'width: 430px; min-height: 116px; padding: 24px 28px; display: flex; align-items: center; justify-content: space-between;'
      card.innerHTML = `
        <div>
          <p style="font-size:.8rem;color:#667085;margin:0 0 .5rem;">Duty Watch Tonight</p>
          <p style="font-size:2rem;font-weight:800;color:#f4b400;margin:0;">1/6</p>
          <p style="font-size:.85rem;color:#667085;margin:.5rem 0 0;">5 uncovered positions</p>
        </div>
        <div style="font-size:2rem;color:#1a7eea;">👥</div>
      `
      stats.prepend(card)
    })
  }

  await captureLoginFlow()

  await viewport('dashboard-overview-main')
  await screenshot('dashboard-navbar-overview', '[data-help-id="nav.root"]')
  await screenshotBox('dashboard-nav-brand', '[data-help-id="nav.brand"]', 10)
  await screenshotBox('dashboard-nav-links', '[data-help-id="nav.links"]', 10)
  await screenshotBox('dashboard-nav-help', '[data-help-id="nav.help"]', 10, {
    minWidth: 300,
    minHeight: 72,
  })
  await screenshotBox('dashboard-nav-user-menu', '[data-help-id="nav.user-menu"]', 10)

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
  await screenshotBox('dashboard-stat-dds', '[data-help-id="dashboard.stat.dds"]', 12)
  await stageDutyWatchCardIfMissing()
  await screenshotBox('dashboard-stat-duty-watch', '[data-help-id="dashboard.stat.duty-watch"]', 12)
  await screenshotBox('dashboard-stat-building', '[data-help-id="dashboard.stat.building"]', 12)
  await screenshotBox('dashboard-stat-lockup-holder', '[data-help-id="dashboard.stat.lockup-holder"]', 12)
  await screenshot('dashboard-quick-actions-focus', '[data-help-id="dashboard.stat.actions"]')
  await screenshotBox(
    'dashboard-action-open-lockup',
    '[data-help-id="dashboard.quick-actions.open-building"], [data-help-id="dashboard.quick-actions.execute-lockup"]',
    12,
    { minWidth: 300, minHeight: 96 },
  )
  await screenshotBox('dashboard-action-transfer-dds', '[data-help-id="dashboard.quick-actions.transfer-dds"]', 12, {
    minWidth: 300,
    minHeight: 96,
  })
  await screenshotBox(
    'dashboard-action-transfer-lockup',
    '[data-help-id="dashboard.quick-actions.transfer-lockup"]',
    12,
    { minWidth: 300, minHeight: 96 },
  )
  await screenshot('dashboard-presence-grid-focus', '[data-help-id="dashboard.presence"]')
  await screenshotBox('dashboard-presence-filters', '[data-help-id="dashboard.presence.filters"]', 12)
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

  await stageVisitorCheckoutCard()
  await screenshotBox('dashboard-visitor-card-checkout', '[data-help-id="dashboard.presence.person-card"]', 12)
  await screenshot('dashboard-visitor-checkout', '[data-help-id="dashboard.presence"]')

  await stagePresenceEmptyState()
  await screenshot('dashboard-presence-empty-state', '[data-help-id="dashboard.presence"]')

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

node - "$WORKFLOW_FILE" "$FRONTEND_URL" "$BADGE_NUMBER" "$ASSET_DIR" <<'NODE'
const fs = require('fs')

const [file, frontendUrl, badgeNumber, assetDir] = process.argv.slice(2)
let source = fs.readFileSync(file, 'utf8')
const replacements = {
  __FRONTEND_URL__: JSON.stringify(frontendUrl),
  __BADGE_NUMBER__: JSON.stringify(badgeNumber),
  __ASSET_DIR__: JSON.stringify(assetDir),
}

for (const [token, value] of Object.entries(replacements)) {
  source = source.replace(token, value)
}

fs.writeFileSync(file, source)
NODE

FRONTEND_URL="$FRONTEND_URL" BADGE_NUMBER="$BADGE_NUMBER" ASSET_DIR="$ASSET_DIR" \
  playwright_cli -s="$SESSION_NAME" open --browser=chromium --config="$PLAYWRIGHT_CLI_CONFIG" "$FRONTEND_URL/login"
playwright_cli -s="$SESSION_NAME" resize 1920 1080
FRONTEND_URL="$FRONTEND_URL" BADGE_NUMBER="$BADGE_NUMBER" ASSET_DIR="$ASSET_DIR" \
  playwright_cli -s="$SESSION_NAME" run-code --filename="$WORKFLOW_FILE"
playwright_cli -s="$SESSION_NAME" snapshot --filename="${RUN_DIR}/dashboard-wiki.yml" || true
playwright_cli -s="$SESSION_NAME" close || true

relocate_root_artifacts "$ROOT_ARTIFACTS_BEFORE"
rm -f "$ROOT_ARTIFACTS_BEFORE"

echo "Saved dashboard wiki screenshots to:"
echo "  ${ASSET_DIR}"
echo "Run artifacts:"
echo "  ${RUN_DIR}"
