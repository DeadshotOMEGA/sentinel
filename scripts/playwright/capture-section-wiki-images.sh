#!/usr/bin/env bash
set -euo pipefail

SESSION_NAME="${SESSION_NAME:-section-wiki-images}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3001}"
BADGE_NUMBER="${BADGE_NUMBER:-0000000000}"
RUN_DATE="$(date +%F)"
STAMP="$(date +%Y%m%d-%H%M%S)"
RUN_DIR=".playwright-cli/runs/section-wiki/${RUN_DATE}/${STAMP}"
LOG_DIR=".playwright-cli/logs/section-wiki/${RUN_DATE}"
ASSET_DIR="${ASSET_DIR:-docs/wiki/assets/wiki-dashboard/operations}"
PLAYWRIGHT_CLI_CONFIG="${PLAYWRIGHT_CLI_CONFIG:-.playwright-cli/cli.config.json}"
WORKFLOW_FILE=".playwright-cli/artifacts/section-wiki-capture-${STAMP}.js"

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
  const appUrl = (path) => `${baseUrl.replace(/\/+$/, '')}${path}`

  async function hideChrome() {
    await page.addStyleTag({
      content: `
        nextjs-portal,
        [aria-label="Open Next.js Dev Tools"],
        [data-nextjs-toast],
        .nextjs-toast,
        [data-testid="dashboard-help-launcher"],
        [data-testid="history-help-launcher"],
        [data-testid="members-help-launcher"],
        [data-testid="events-help-launcher"],
        [data-testid="schedules-help-launcher"] {
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
        const isBottomRight = rect.left > window.innerWidth - 140 && rect.top > window.innerHeight - 140
        const hasVisibleText = Boolean(element.textContent?.trim())

        if (isBottomRight && !hasVisibleText) {
          element.setAttribute('data-sentinel-wiki-hidden', 'true')
          element.style.setProperty('display', 'none', 'important')
          element.style.setProperty('visibility', 'hidden', 'important')
        }
      }
    })
  }

  async function dismissSystemStatus() {
    const viewportHeight = await page.evaluate(() => window.innerHeight).catch(() => 1080)
    await page.mouse.move(24, viewportHeight - 24).catch(() => undefined)
    await wait(120)
  }

  async function login() {
    await page.goto(appUrl('/login'))
    await page.waitForLoadState('networkidle')
    await hideChrome()

    if (await page.getByTestId('auth-badge-input').isVisible().catch(() => false)) {
      await page.getByTestId('auth-badge-input').fill(badgeNumber)
      await page.keyboard.press('Enter')
    }

    await page.getByTestId('auth-remote-system-select').waitFor({ state: 'visible', timeout: 10000 })

    const remoteSelect = page.getByTestId('auth-remote-system-select').first()
    if (
      (await remoteSelect.isVisible().catch(() => false)) &&
      (await remoteSelect.evaluate((element) => element.tagName.toLowerCase()).catch(() => '')) ===
        'select'
    ) {
      const firstAvailable = await remoteSelect.evaluate((element) => {
        const select = element
        if (!(select instanceof HTMLSelectElement)) return ''
        const option = Array.from(select.options).find((candidate) => !candidate.disabled)
        return option?.value ?? ''
      })
      if (firstAvailable) {
        await remoteSelect.selectOption(firstAvailable)
      }
    }

    await page.getByTestId('auth-login-submit').click()
    await page.waitForURL('**/dashboard', { timeout: 15000 })
    await hideChrome()
  }

  async function viewport(name, options = {}) {
    if (!options.keepSystemStatusOpen) await dismissSystemStatus()
    await hideChrome()
    await page.screenshot({ path: filename(name), fullPage: false })
  }

  async function screenshotBox(name, selector, padding = 12, options = {}) {
    if (!options.keepSystemStatusOpen) await dismissSystemStatus()
    await hideChrome()
    const locator = page.locator(selector).first()
    if ((await locator.count()) === 0) {
      await viewport(name)
      return
    }
    await locator.scrollIntoViewIfNeeded().catch(() => undefined)
    await wait(options.delay ?? 200)
    const box = await locator.boundingBox()
    if (!box) {
      await viewport(name)
      return
    }
    const viewportSize = page.viewportSize() ?? { width: 1920, height: 1080 }
    const width = Math.max(box.width + padding * 2, options.minWidth ?? 0)
    const height = Math.max(box.height + padding * 2, options.minHeight ?? 0)
    const x = Math.max(0, Math.min(box.x + box.width / 2 - width / 2, viewportSize.width - width))
    const y = Math.max(0, Math.min(box.y + box.height / 2 - height / 2, viewportSize.height - height))
    await page.screenshot({
      path: filename(name),
      clip: {
        x,
        y,
        width: Math.min(viewportSize.width - x, width),
        height: Math.min(viewportSize.height - y, height),
      },
    })
  }

  async function openAndCapture(name, openerSelector, targetSelector) {
    const opener = page.locator(openerSelector).first()
    if ((await opener.count()) === 0) {
      await viewport(name)
      return
    }
    await opener.scrollIntoViewIfNeeded().catch(() => undefined)
    await opener.click().catch(() => undefined)
    await wait(700)
    await screenshotBox(name, targetSelector, 16, { minWidth: 620, minHeight: 360 })
    await page.keyboard.press('Escape').catch(() => undefined)
    await wait(250)
  }

  async function stageIfEmpty(selector, html) {
    await page.evaluate(
      ({ selector: targetSelector, html: targetHtml }) => {
        const target = document.querySelector(targetSelector)
        if (!target) return
        const hasRows = target.querySelector('tbody tr, .list-row, [data-sentinel-demo-row]')
        if (hasRows) return
        target.innerHTML = targetHtml
      },
      { selector, html },
    )
  }

  async function stageModal(name, title, body) {
    await page.evaluate(
      ({ name: modalName, title: modalTitle, body: modalBody }) => {
        document.querySelector('[data-sentinel-staged-modal]')?.remove()
        const modal = document.createElement('section')
        modal.setAttribute('data-sentinel-staged-modal', modalName)
        modal.className = 'rounded-box bg-base-100 text-base-content shadow-xl'
        modal.style.cssText =
          'position: fixed; z-index: 9999; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(760px, 82vw); border: 1px solid #d7dbe4; background: #fff; padding: 24px; box-shadow: 0 18px 42px rgba(31, 37, 56, 0.18);'
        modal.innerHTML = `
          <h2 style="font-size:1.25rem;font-weight:800;margin:0 0 .75rem;">${modalTitle}</h2>
          <div style="display:grid;gap:.75rem;">${modalBody}</div>
          <div style="display:flex;justify-content:flex-end;gap:.5rem;margin-top:1rem;">
            <button class="btn btn-ghost btn-sm">Cancel</button>
            <button class="btn btn-primary btn-sm">Save</button>
          </div>
        `
        document.body.appendChild(modal)
      },
      { name, title, body },
    )
    await screenshotBox(name, '[data-sentinel-staged-modal]', 18, { minWidth: 680, minHeight: 360 })
    await page.evaluate(() => document.querySelector('[data-sentinel-staged-modal]')?.remove())
  }

  async function stageEventDetail() {
    await page.evaluate(() => {
      document.querySelector('[data-sentinel-event-detail-demo]')?.remove()
      const demo = document.createElement('section')
      demo.setAttribute('data-sentinel-event-detail-demo', 'true')
      demo.className = 'bg-base-100 border shadow-sm'
      demo.style.cssText = 'padding:24px; margin:24px 0; display:grid; gap:16px;'
      demo.innerHTML = `
        <div data-help-id="events.detail.header" style="display:flex;justify-content:space-between;gap:16px;">
          <div>
            <h2 style="font-size:1.5rem;font-weight:800;margin:0 0 .5rem;">Saturday Training Day</h2>
            <div data-help-id="events.detail.status" style="display:flex;gap:.5rem;">
              <span class="badge badge-primary">Planned</span>
              <span class="badge badge-outline">Training</span>
            </div>
          </div>
          <div data-help-id="events.detail.actions" style="display:flex;gap:.5rem;">
            <button class="btn btn-outline btn-sm">Edit</button>
            <button class="btn btn-error btn-sm">Delete</button>
          </div>
        </div>
        <div data-help-id="events.detail.status-actions" style="display:flex;gap:.5rem;">
          <button class="btn btn-primary btn-sm">Confirm</button>
          <button class="btn btn-ghost btn-sm">Cancel</button>
          <button class="btn btn-ghost btn-sm">Postpone</button>
        </div>
        <div data-help-id="events.detail.tabs" class="tabs tabs-box"><button class="tab tab-active">Overview</button><button class="tab">Duty Watch</button></div>
        <div data-help-id="events.detail.overview" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;">
          <div class="rounded-box bg-base-200 p-3"><strong>Date</strong><br/>May 16, 2026</div>
          <div class="rounded-box bg-base-200 p-3"><strong>Location</strong><br/>HMCS Chippawa</div>
          <div class="rounded-box bg-base-200 p-3"><strong>Duty Watch</strong><br/>Required</div>
        </div>
        <div data-help-id="events.detail.duty-watch" class="rounded-box border border-base-300 p-3">
          <strong>Event Duty Watch</strong>
          <div style="display:flex;gap:.5rem;margin-top:.5rem;"><span class="badge badge-outline">GEO</span><span>S2 Lee assigned</span><button class="btn btn-ghost btn-xs">Change</button></div>
        </div>
      `
      document.querySelector('main')?.appendChild(demo)
    })
  }

  await login()

  await page.goto(appUrl('/checkins'))
  await page.waitForLoadState('networkidle')
  await hideChrome()
  await wait(500)
  await stageIfEmpty(
    '[data-help-id="history.records-table"]',
    `<div class="overflow-x-auto"><table class="table"><thead><tr><th>Timestamp</th><th>Type</th><th>Name</th><th>Direction</th><th>Method</th><th></th></tr></thead><tbody>
      <tr data-sentinel-demo-row><td>May 8, 2026<br/><span class="opacity-60">07:42</span></td><td><span class="badge badge-outline">Member</span></td><td>MS Demo Admin<br/><span class="opacity-60">D0001</span></td><td><span class="badge badge-primary">IN</span></td><td><span class="badge badge-outline">Badge</span></td><td><button data-help-id="history.edit-action" class="btn btn-ghost btn-xs">Edit</button></td></tr>
      <tr data-sentinel-demo-row><td>May 8, 2026<br/><span class="opacity-60">08:10</span></td><td><span class="badge badge-secondary">Visitor</span></td><td>Alex Visitor<br/><span class="opacity-60">Training Group</span></td><td><span class="badge badge-primary">IN</span></td><td><span class="badge badge-outline">Kiosk</span></td><td><button data-help-id="history.visitor-edit-action" class="btn btn-ghost btn-xs">Edit Visitor</button></td></tr>
    </tbody></table></div>`,
  )
  await viewport('history-overview')
  await screenshotBox('history-filters', '[data-help-id="history.filters"]', 12)
  await screenshotBox('history-records-table', '[data-help-id="history.records-table"]', 12)
  await screenshotBox('history-manual-correction', '[data-help-id="history.actions"], [data-help-id="history.manual-checkin"]', 12)
  await openAndCapture('history-manual-correction-modal', '[data-help-id="history.manual-checkin"]', '[data-help-id="history.manual-checkin-modal"]')
  await stageModal(
    'history-edit-member-record',
    'Edit Check-In Record',
    '<label class="select w-full"><span class="label">Direction</span><select><option>Check In</option><option>Check Out</option></select></label><label class="input w-full"><span class="label">Timestamp</span><input value="2026-05-08T07:42" /></label><label class="textarea w-full"><span class="label">Reason</span><textarea>Correct missed badge scan after DDS confirmation.</textarea></label>',
  )
  await stageModal(
    'history-edit-visitor-record',
    'Edit Visitor',
    '<label class="input w-full"><span class="label">Name</span><input value="Alex Visitor" /></label><label class="input w-full"><span class="label">Organization</span><input value="Training Group" /></label><label class="textarea w-full"><span class="label">Admin Notes</span><textarea>Confirmed by host before update.</textarea></label>',
  )

  await page.goto(appUrl('/members'))
  await page.waitForLoadState('networkidle')
  await hideChrome()
  await wait(500)
  await viewport('members-overview')
  await screenshotBox('members-filters', '[data-help-id="members.filters"]', 12)
  await screenshotBox('members-table', '[data-help-id="members.table"]', 12)
  await screenshotBox('members-row-actions', '[data-help-id="members.row-actions"], [data-help-id="members.table"]', 12)
  await screenshotBox('members-bulk-actions', '[data-help-id="members.bulk-actions"], [data-help-id="members.table"]', 12)
  await openAndCapture('members-create-member', '[data-help-id="members.create-member"]', '[data-help-id="members.member-form"]')
  await openAndCapture('members-create-civilian', '[data-help-id="members.create-civilian"]', '[data-help-id="members.member-form"]')
  await openAndCapture('members-import-csv', '[data-help-id="members.import-csv"]', '[data-help-id="members.import-dialog"]')
  await screenshotBox('members-sync-qualifications', '[data-help-id="members.sync-qualifications"]', 14, { minWidth: 300, minHeight: 84 })
  await screenshotBox('members-qualifications-tags', '[data-help-id="members.row-actions"], [data-help-id="members.table"]', 12)

  await page.goto(appUrl('/events'))
  await page.waitForLoadState('networkidle')
  await hideChrome()
  await wait(500)
  await viewport('events-overview')
  await screenshotBox('events-filters-list', '[data-help-id="events.filters"], [data-help-id="events.list"]', 12)
  await openAndCapture('events-create-event', '[data-help-id="events.create"]', '[data-help-id="events.form"]')
  await stageEventDetail()
  await screenshotBox('events-detail', '[data-sentinel-event-detail-demo]', 12)
  await screenshotBox('events-status-workflow', '[data-help-id="events.detail.status-actions"]', 14, { minWidth: 460, minHeight: 96 })
  await screenshotBox('events-duty-watch', '[data-help-id="events.detail.duty-watch"]', 14, { minWidth: 560, minHeight: 160 })
  await screenshotBox('events-edit-cancel-delete', '[data-help-id="events.detail.actions"]', 14, { minWidth: 320, minHeight: 96 })

  await page.goto(appUrl('/schedules'))
  await page.waitForLoadState('networkidle')
  await hideChrome()
  await wait(800)
  await viewport('schedules-overview')
  await screenshotBox('schedules-week-view', '[data-help-id="schedules.week-columns"]', 12)
  await screenshotBox('schedules-assign-dds', '[data-help-id="schedules.dds-card"]', 12)
  await screenshotBox('schedules-assign-duty-watch', '[data-help-id="schedules.duty-watch-card"]', 12)
  await screenshotBox('schedules-publish-edit', '[data-help-id="schedules.dds-card"], [data-help-id="schedules.duty-watch-card"]', 12)
  await stageModal(
    'schedules-member-picker',
    'Select Member',
    '<label class="input w-full"><span class="label">Search</span><input value="Sauk" /></label><ul class="list bg-base-100 rounded-box"><li class="list-row"><div class="size-10 rounded-box bg-base-300 text-center pt-2">DS</div><div><strong>MS Demo Scheduler</strong><br/><span class="opacity-60">D0002</span></div><span class="badge badge-outline">DDS</span></li><li class="list-row"><div class="size-10 rounded-box bg-base-300 text-center pt-2">DW</div><div><strong>S2 Demo Watch</strong><br/><span class="opacity-60">D0003</span></div><span class="badge badge-outline">SWK</span></li></ul>',
  )
  await stageModal(
    'schedules-night-overrides',
    'Duty Watch - Night Overrides',
    '<div class="tabs tabs-box"><button class="tab tab-active">Base</button><button class="tab">Friday</button><button class="tab">Saturday</button></div><div class="rounded-box border border-base-300 p-3"><strong>Friday Override</strong><br/>Replace base member only for the selected night.</div>',
  )
  await page.locator('[data-help-id="schedules.view-tabs"]').getByRole('tab', { name: /month/i }).click().catch(() => undefined)
  await wait(500)
  await screenshotBox('schedules-month-quarter-view', '[data-help-id="schedules.month-quarter-view"], [data-help-id="schedules.date-picker"]', 12)
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
playwright_cli -s="$SESSION_NAME" snapshot --filename="${RUN_DIR}/section-wiki.yml" || true
playwright_cli -s="$SESSION_NAME" close || true

relocate_root_artifacts "$ROOT_ARTIFACTS_BEFORE"
rm -f "$ROOT_ARTIFACTS_BEFORE"

echo "Saved section wiki screenshots to:"
echo "  ${ASSET_DIR}"
echo "Run artifacts:"
echo "  ${RUN_DIR}"
