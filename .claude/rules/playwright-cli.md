---
paths:
  - 'apps/frontend-admin/**'
---

# CLAUDE Rules: Playwright CLI for Frontend Testing

## Scope

Applies when editing files under: `apps/frontend-admin/`

## Non-Negotiables (MUST / MUST NOT)

- MUST use `playwright-cli` (NOT Playwright MCP or `@playwright/test` directly) for browser interaction
- MUST take a snapshot after navigation or interaction to verify page state
- MUST close the browser session when done (`playwright-cli close`)
- MUST NOT leave browser sessions running after completing a task

## Workflow

### Visual Verification

When verifying frontend changes visually:

1. Ensure dev server is running (`pnpm dev:frontend` on port 3000)
2. `playwright-cli open http://localhost:3000/<route>`
3. `playwright-cli snapshot` — inspect element refs
4. Interact as needed (`click`, `fill`, `type`)
5. `playwright-cli screenshot` — capture visual state
6. `playwright-cli close`

### Debugging UI Issues

When investigating a UI bug:

1. `playwright-cli open http://localhost:3000/<route>`
2. `playwright-cli console` — check for JS errors
3. `playwright-cli network` — check for failed API calls
4. `playwright-cli snapshot` — inspect DOM structure
5. `playwright-cli close`

### Form Testing

When testing form flows:

1. `playwright-cli open http://localhost:3000/<form-route>`
2. `playwright-cli snapshot` — identify form field refs
3. `playwright-cli fill <ref> "value"` for each field
4. `playwright-cli click <submit-ref>`
5. `playwright-cli snapshot` — verify success/error state
6. `playwright-cli close`

## Defaults (SHOULD)

- SHOULD use `playwright-cli snapshot` over `screenshot` for DOM inspection (token-efficient)
- SHOULD use named sessions (`-s=test`) for multi-tab or parallel testing
- SHOULD capture screenshots for visual regressions or when sharing results with user
