#!/usr/bin/env bash
set -euo pipefail

ITER="${1:-iteration-0}"
OUT_DIR="screenshots/kiosk/${ITER}"
mkdir -p "$OUT_DIR"

set -a
[ -f .env ] && source .env
[ -f apps/backend/.env ] && source apps/backend/.env
set +a

VIS_JSON="$(pnpm exec tsx scripts/visuals/prepare-kiosk-visual-data.ts)"
echo "$VIS_JSON" > "$OUT_DIR/_fixtures.json"

CLAUDE_BADGE="$(echo "$VIS_JSON" | node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync(0,'utf8'));process.stdout.write(j.claudeBadge)")"
UNKNOWN_BADGE="$(echo "$VIS_JSON" | node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync(0,'utf8'));process.stdout.write(j.unknownBadge)")"
UNASSIGNED_BADGE="$(echo "$VIS_JSON" | node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync(0,'utf8'));process.stdout.write(j.unassignedBadge)")"
INACTIVE_BADGE="$(echo "$VIS_JSON" | node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync(0,'utf8'));process.stdout.write(j.inactiveBadge)")"
LOST_BADGE="$(echo "$VIS_JSON" | node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync(0,'utf8'));process.stdout.write(j.lostBadge)")"
FUTURE_BADGE="$(echo "$VIS_JSON" | node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync(0,'utf8'));process.stdout.write(j.futureDutyWatchBadge||'')")"
LONG_NAME_BADGE="$(echo "$VIS_JSON" | node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync(0,'utf8'));process.stdout.write(j.longNameBadge||'VIS-LONGNAME-BADGE')")"

cat > "$OUT_DIR/_index.json" <<'JSON'
{
  "01-modal-baseline-before-scan": "Modal baseline before scan",
  "02-empty-input-disabled": "Empty input, submit disabled",
  "03-pre-submit-filled": "Badge entered before submit",
  "04-processing-state": "Processing state after submit",
  "05-failed-unknown-badge": "Failed scan unknown badge",
  "06-failed-inactive-badge": "Failed scan inactive badge",
  "07-failed-unassigned-badge": "Failed scan unassigned badge",
  "08-success-check-in": "Successful check-in (IN)",
  "09-success-check-out": "Successful check-out (OUT)",
  "10-duplicate-rapid-scan": "Duplicate rapid scan handling",
  "11-future-duty-watch": "Member scheduled for future duty watch",
  "12-no-duty-assignments": "Member with no duty assignments",
  "13-last-visit-panel": "Last visit panel populated",
  "14-scan-health-panel": "Scan health panel state",
  "15-long-name-overflow": "Long name/overflow handling",
  "16-mobile-viewport": "Mobile viewport modal",
  "17-focus-ring": "Focus ring/accessibility visual",
  "18-zoom-200": "200% zoom readability"
}
JSON

playwright-cli -s=kioskviz close >/dev/null 2>&1 || true
playwright-cli -s=kioskviz open http://localhost:3001/login >/dev/null

read -r -d '' JS_CHUNK1 <<'JS' || true
async page => {
  const outDir = '__OUT_DIR__'
  const claudeBadge = '__CLAUDE_BADGE__'
  const unknownBadge = '__UNKNOWN_BADGE__'
  const unassignedBadge = '__UNASSIGNED_BADGE__'
  const inactiveBadge = '__INACTIVE_BADGE__'
  const safe = async (fn) => { try { await fn() } catch {} }
  const shot = async (name) => page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true })
  page.setDefaultTimeout(2500)

  await safe(async () => { await page.goto('http://localhost:3001/login', { waitUntil: 'domcontentloaded' }) })
  await safe(async () => { await page.getByTestId('auth-badge-input').fill(claudeBadge) })
  await safe(async () => { await page.keyboard.press('Enter') })
  await safe(async () => { await page.getByTestId('auth-pin-input').fill('9999') })
  await safe(async () => { await page.keyboard.press('Enter') })
  await safe(async () => { await page.waitForURL('**/dashboard') })
  await safe(async () => { await page.getByTestId('quick-action-kiosk').click() })
  await safe(async () => { await page.getByTestId('kiosk-badge-input').waitFor({ state: 'visible' }) })

  await safe(async () => { await page.getByTestId('kiosk-badge-input').fill('') })
  await shot('01-modal-baseline-before-scan')
  await shot('02-empty-input-disabled')

  await safe(async () => { await page.getByTestId('kiosk-badge-input').fill(claudeBadge) })
  await shot('03-pre-submit-filled')

  await safe(async () => { await page.keyboard.press('Enter') })
  await page.waitForTimeout(80)
  await shot('04-processing-state')
  await page.waitForTimeout(700)
  await safe(async () => { await page.getByTestId('kiosk-badge-input').fill(unknownBadge) })
  await safe(async () => { await page.keyboard.press('Enter') })
  await page.waitForTimeout(350)
  await shot('05-failed-unknown-badge')

  await safe(async () => { await page.getByTestId('kiosk-badge-input').fill(inactiveBadge) })
  await safe(async () => { await page.keyboard.press('Enter') })
  await page.waitForTimeout(350)
  await shot('06-failed-inactive-badge')

  await safe(async () => { await page.getByTestId('kiosk-badge-input').fill(unassignedBadge) })
  await safe(async () => { await page.keyboard.press('Enter') })
  await page.waitForTimeout(350)
  await shot('07-failed-unassigned-badge')
}
JS

read -r -d '' JS_CHUNK2 <<'JS' || true
async page => {
  const outDir = '__OUT_DIR__'
  const claudeBadge = '__CLAUDE_BADGE__'
  const futureBadge = '__FUTURE_BADGE__' || '__CLAUDE_BADGE__'
  const lostBadge = '__LOST_BADGE__'
  const safe = async (fn) => { try { await fn() } catch {} }
  const shot = async (name) => page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true })
  page.setDefaultTimeout(2500)

  await safe(async () => { await page.goto('http://localhost:3001/login', { waitUntil: 'domcontentloaded' }) })
  await safe(async () => { await page.getByTestId('auth-badge-input').fill(claudeBadge) })
  await safe(async () => { await page.keyboard.press('Enter') })
  await safe(async () => { await page.getByTestId('auth-pin-input').fill('9999') })
  await safe(async () => { await page.keyboard.press('Enter') })
  await safe(async () => { await page.waitForURL('**/dashboard') })
  await safe(async () => { await page.getByTestId('quick-action-kiosk').click() })
  await safe(async () => { await page.getByTestId('kiosk-badge-input').waitFor({ state: 'visible' }) })

  await page.waitForTimeout(2600)
  await safe(async () => { await page.getByTestId('kiosk-badge-input').fill(claudeBadge) })
  await safe(async () => { await page.keyboard.press('Enter') })
  await page.waitForTimeout(500)
  await shot('08-success-check-in')

  await page.waitForTimeout(2600)
  await safe(async () => { await page.getByTestId('kiosk-badge-input').fill(claudeBadge) })
  await safe(async () => { await page.keyboard.press('Enter') })
  await page.waitForTimeout(500)
  await shot('09-success-check-out')

  await safe(async () => { await page.getByTestId('kiosk-badge-input').fill(claudeBadge) })
  await safe(async () => { await page.keyboard.press('Enter') })
  await page.waitForTimeout(150)
  await shot('10-duplicate-rapid-scan')

  await page.waitForTimeout(2600)
  await safe(async () => { await page.getByTestId('kiosk-badge-input').fill(futureBadge) })
  await safe(async () => { await page.keyboard.press('Enter') })
  await page.waitForTimeout(500)
  await shot('11-future-duty-watch')

  await page.waitForTimeout(2600)
  await safe(async () => { await page.getByTestId('kiosk-badge-input').fill(claudeBadge) })
  await safe(async () => { await page.keyboard.press('Enter') })
  await page.waitForTimeout(500)
  await shot('12-no-duty-assignments')
  await shot('13-last-visit-panel')

  await safe(async () => { await page.getByTestId('kiosk-badge-input').fill(lostBadge) })
  await safe(async () => { await page.keyboard.press('Enter') })
  await page.waitForTimeout(350)
  await shot('14-scan-health-panel')
}
JS

read -r -d '' JS_CHUNK3 <<'JS' || true
async page => {
  const outDir = '__OUT_DIR__'
  const claudeBadge = '__CLAUDE_BADGE__'
  const longNameBadge = '__LONG_NAME_BADGE__'
  const safe = async (fn) => { try { await fn() } catch {} }
  const shot = async (name) => page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true })
  page.setDefaultTimeout(2500)

  await safe(async () => { await page.goto('http://localhost:3001/login', { waitUntil: 'domcontentloaded' }) })
  await safe(async () => { await page.getByTestId('auth-badge-input').fill(claudeBadge) })
  await safe(async () => { await page.keyboard.press('Enter') })
  await safe(async () => { await page.getByTestId('auth-pin-input').fill('9999') })
  await safe(async () => { await page.keyboard.press('Enter') })
  await safe(async () => { await page.waitForURL('**/dashboard') })
  await safe(async () => { await page.getByTestId('quick-action-kiosk').click() })
  await safe(async () => { await page.getByTestId('kiosk-badge-input').waitFor({ state: 'visible' }) })

  await page.waitForTimeout(2600)
  await safe(async () => { await page.getByTestId('kiosk-badge-input').fill(longNameBadge) })
  await safe(async () => { await page.keyboard.press('Enter') })
  await page.waitForTimeout(500)
  await shot('15-long-name-overflow')

  await safe(async () => { await page.setViewportSize({ width: 390, height: 844 }) })
  await page.waitForTimeout(200)
  await shot('16-mobile-viewport')

  await safe(async () => { await page.setViewportSize({ width: 1366, height: 900 }) })
  await safe(async () => { await page.getByTestId('kiosk-badge-input').focus() })
  await page.waitForTimeout(150)
  await shot('17-focus-ring')

  await safe(async () => { await page.evaluate(() => { document.body.style.zoom = '2' }) })
  await page.waitForTimeout(150)
  await shot('18-zoom-200')
  await safe(async () => { await page.evaluate(() => { document.body.style.zoom = '1' }) })
}
JS

replace_vars() {
  local s="$1"
  s="${s//__OUT_DIR__/$OUT_DIR}"
  s="${s//__CLAUDE_BADGE__/$CLAUDE_BADGE}"
  s="${s//__UNKNOWN_BADGE__/$UNKNOWN_BADGE}"
  s="${s//__UNASSIGNED_BADGE__/$UNASSIGNED_BADGE}"
  s="${s//__INACTIVE_BADGE__/$INACTIVE_BADGE}"
  s="${s//__LOST_BADGE__/$LOST_BADGE}"
  s="${s//__FUTURE_BADGE__/$FUTURE_BADGE}"
  s="${s//__LONG_NAME_BADGE__/$LONG_NAME_BADGE}"
  printf '%s' "$s"
}

playwright-cli -s=kioskviz run-code "$(replace_vars "$JS_CHUNK1")" >/tmp/kioskviz_${ITER}_1.log 2>&1
playwright-cli -s=kioskviz run-code "$(replace_vars "$JS_CHUNK2")" >/tmp/kioskviz_${ITER}_2.log 2>&1
playwright-cli -s=kioskviz run-code "$(replace_vars "$JS_CHUNK3")" >/tmp/kioskviz_${ITER}_3.log 2>&1

playwright-cli -s=kioskviz close >/dev/null 2>&1 || true

echo "Saved screenshots to $OUT_DIR"
