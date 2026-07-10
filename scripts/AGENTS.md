# Local Codex Instructions (Scripts)

## Scope

Applies when editing files under: `scripts/`

## Playwright Rules

- Canonical browser automation for Codex in this repo is `playwright-cli`.
- Use `scripts/playwright/` as the maintained Playwright CLI workflow.
- Use `.playwright-cli/` as the canonical local auth/artifact folder for that workflow.
- When opening a local browser session, pass `open --browser=chromium --config=.playwright-cli/cli.config.json` so the workflow uses the bundled Playwright browser instead of a possibly missing system Chrome install.
- Do not pass `--config` as a global `playwright-cli` option; commands such as `close`, `snapshot`, `screenshot`, and `state-load` do not accept it.
- Keep workflow output organized under `.playwright-cli/auth`, `.playwright-cli/runs`, `.playwright-cli/logs`, and `.playwright-cli/artifacts`.
- Treat older one-off capture utilities under `scripts/visuals/` as legacy unless the task explicitly targets them.
- For Codex-driven browser QA, use the Sentinel bootstrap account:
  - Badge: `0000000000`
- Treat `apps/frontend-admin` as desktop-only for Codex Playwright work unless the product requirements explicitly change.
- Codex Playwright work in this repo must use `1920x1080`.
- Do not add mobile, tablet, or responsive-breakpoint Playwright coverage for `apps/frontend-admin` unless the task explicitly requires a product change away from the desktop-only constraint.
- Do not use Playwright MCP tools when `playwright-cli` is available.

## Editing Guidance

- Keep shell scripts portable and explicit.
- Prefer environment-variable overrides for credentials, base URLs, and output paths.
- When a Playwright script writes artifacts, keep them under `test-results/` unless the task explicitly requires another location.

## Wiki.js Scripts

- Canonical Wiki.js base URL is `http://docs.sentinel.local/`.
- Wiki publishing/configuration scripts SHOULD load `WIKI_BASE_URL` and `WIKI_API_KEY` from the shell environment first, then repo `.env`, then `deploy/.env`.
- If the shell is missing Wiki.js env, check `deploy/.env` before reporting that publishing cannot run.
- Do not print, persist, or commit the actual `WIKI_API_KEY`; redact it in logs and summaries.
