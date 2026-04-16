# Local Codex Instructions (Scripts)

## Scope

Applies when editing files under: `scripts/`

## Playwright Rules

- Canonical browser automation for Codex in this repo is `playwright-cli`.
- Use `scripts/playwright/` as the maintained Playwright CLI workflow.
- Use `.playwright-cli/` as the canonical local auth/artifact folder for that workflow.
- When using `playwright-cli` directly, pass `--config=.playwright-cli/cli.config.json` so the browser channel stays consistent.
- Keep workflow output organized under `.playwright-cli/auth`, `.playwright-cli/runs`, `.playwright-cli/logs`, and `.playwright-cli/artifacts`.
- Treat older one-off capture utilities under `scripts/visuals/` as legacy unless the task explicitly targets them.
- For Codex-driven browser QA, use the Sentinel bootstrap account:
  - Badge: `0000000000`
  - PIN: `0000`
- Treat `apps/frontend-admin` as desktop-only for Codex Playwright work unless the product requirements explicitly change.
- Codex Playwright work in this repo must use `1920x1080`.
- Do not add mobile, tablet, or responsive-breakpoint Playwright coverage for `apps/frontend-admin` unless the task explicitly requires a product change away from the desktop-only constraint.
- Do not use Playwright MCP tools when `playwright-cli` is available.

## Editing Guidance

- Keep shell scripts portable and explicit.
- Prefer environment-variable overrides for credentials, base URLs, and output paths.
- When a Playwright script writes artifacts, keep them under `test-results/` unless the task explicitly requires another location.
