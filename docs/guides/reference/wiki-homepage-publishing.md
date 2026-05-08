# Wiki Homepage Publishing

This guide covers how Sentinel maintains and publishes the Wiki.js home page.

## Source Files

- Home content: `docs/wiki/docs/home.md`
- Site logo: `docs/wiki/assets/wiki-dashboard/branding/sentinel-logo.png`
- Screenshot checklist: `docs/wiki/docs/image-capture-manifest.md`
- Publish script: `scripts/wiki/publish-homepage.mjs`

## Publish Home Page

Run from repo root:

```bash
pnpm wiki:ensure-api-key
node scripts/wiki/publish-homepage.mjs
```

The script will:

1. Read `WIKI_BASE_URL` and `WIKI_API_KEY` from environment, `.env`, or `deploy/.env`.
2. Run terminology validation against `docs/wiki` (`Day Duty` is disallowed).
3. Upsert slug `home` in locale `en` from `docs/wiki/docs/home.md`.
4. Upload the Sentinel logo to `/uploads/wiki-dashboard/branding/sentinel-logo.png`.
5. Apply Wiki.js site branding: title, description, company, footer, and logo URL.
6. Apply Sentinel theme injection defaults (`injectCSS`) unless `--skip-theme` is passed.

`pnpm wiki:ensure-api-key` creates or reuses the local Wiki.js publishing API key, writes it to
`deploy/.env`, and restarts the Wiki.js container so the token is trusted immediately.

## Optional Flags

- `--skip-theme` skip theme injection update
- `--dry-run` validate and print payload without mutating Wiki.js

## Terminology Check

Manual validation command:

```bash
rg -n "Day Duty" docs/wiki
```

Expected result: no matches.

## Sentinel Theme Injection

The publish script applies a sentinel-ready `injectCSS` block with:

- Sentinel color variables aligned to `apps/frontend-admin/src/app/globals.css`
- Dark Sentinel shell styling for the Wiki.js header and sidebar
- Page content typography, tables, screenshots, links, and callout styling
- Dashboard help links styled as compact action pills
- Responsive behavior for narrow viewports

`injectHead` and `injectBody` remain empty by default.

## Post-Publish Validation

1. Open root wiki URL and verify `home` loads.
2. Confirm the Sentinel logo appears in the Wiki.js header.
3. Confirm Dashboard fast-action links resolve.
4. Confirm screenshots load from `/uploads/wiki-dashboard/operations/`.
5. Update `docs/wiki/docs/image-capture-manifest.md` statuses as screenshots are captured/uploaded/linked.
