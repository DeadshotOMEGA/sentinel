# Local Codex Instructions (Playwright CLI Scripts)

## Scope

Applies when editing files under: `scripts/playwright/`

## Purpose

These scripts are the maintained Playwright CLI utilities for:

- Codex visual QA
- authenticated screenshot capture
- repeatable dashboard and kiosk evidence generation

## Rules

- Use `playwright-cli`, not Playwright MCP, for these scripts.
- Treat `.playwright-cli/` as the canonical local state and artifact directory for Playwright CLI work in this repo.
- Do not recreate or rely on `.playwright/` for Codex Playwright workflows.
- When calling `playwright-cli` directly, pass `--config=.playwright-cli/cli.config.json` unless the task explicitly requires another config.
- Save auth state under `.playwright-cli/auth/`.
- Save scripted capture sets under `.playwright-cli/runs/<workflow>/<YYYY-MM-DD>/<run-id>/`.
- Save script-managed logs under `.playwright-cli/logs/<workflow>/<YYYY-MM-DD>/`.
- If `playwright-cli` emits root-level `console-*.log` or `page-*.yml` files, move them into the matching workflow log/run folder before the script exits.
- Default authentication should use the Sentinel bootstrap account:
  - Badge: `0000000000`
  - PIN: `0000`
- Support overrides via environment variables when a different account is intentionally required.
- Treat `apps/frontend-admin` as a desktop-only webapp for these workflows unless the product requirements explicitly change.
- Browser size for Codex Playwright work in this repo must be `1920x1080`.
- Do not add mobile, tablet, or responsive-breakpoint capture or test flows for `apps/frontend-admin` unless the task explicitly requires a product change away from the desktop-only constraint.
- Close sessions when capture is complete.
- Save authenticated state to `.playwright-cli/auth/bootstrap.json` unless the task explicitly overrides it.
- Prefer deterministic captures over exploratory flows; load auth state or log in directly instead of relying on leftover local browser state.

## Key Scripts

- `save-cli-auth-state.sh`
  - Canonical bootstrap-auth helper.
  - Logs in with the default Sentinel bootstrap account unless env overrides are provided.
  - Saves the shared auth state to `.playwright-cli/auth/bootstrap.json`.
  - Use this before any workflow that wants to load existing auth instead of logging in inline.
- `cli-capture.sh`
  - Generic ad hoc capture helper for an already-open session.
  - Saves one YAML snapshot and one PNG screenshot into `.playwright-cli/runs/<subdir>/<YYYY-MM-DD>/<run-id>/`.
  - Use this when you are inspecting manually and want to preserve the current browser state without building a dedicated script.

## Script Selection Guidance

- Need or refresh shared auth:
  - run `save-cli-auth-state.sh`
- Need a quick single capture from the current session:
  - run `cli-capture.sh`
- Need a repeatable scripted flow with setup, navigation, and multiple outputs:
  - use or create a dedicated workflow script such as `capture-dashboard-wiki-images.sh` or `kiosk-ux-capture.mjs`
- Do not add login bootstrapping to every script by default.
  - Prefer shared auth when the workflow does not need to prove the login flow itself.

## Codex Guidance

- For ad hoc frontend verification, prefer running these scripts or direct `playwright-cli` commands over writing new one-off automation.
- If a script here and a legacy script elsewhere overlap, prefer the script in this directory.
