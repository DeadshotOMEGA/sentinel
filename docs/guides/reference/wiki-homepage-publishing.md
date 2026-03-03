# Wiki Homepage Publishing

This guide covers how Sentinel maintains and publishes the Wiki.js home page.

## Source Files

- Home content: `docs/wiki/docs/home.md`
- Screenshot checklist: `docs/wiki/docs/image-capture-manifest.md`
- Publish script: `scripts/wiki/publish-homepage.mjs`

## Publish Home Page

Run from repo root:

```bash
node scripts/wiki/publish-homepage.mjs
```

The script will:

1. Read `WIKI_BASE_URL` and `WIKI_API_KEY` from environment or `.env`.
2. Run terminology validation against `docs/wiki` (`Day Duty` is disallowed).
3. Upsert slug `home` in locale `en` from `docs/wiki/docs/home.md`.
4. Apply Sentinel theme injection defaults (`injectCSS`) unless `--skip-theme` is passed.

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
- Home page hero and tile styling
- Screenshot placeholder card styling
- Responsive behavior for narrow viewports

`injectHead` and `injectBody` remain empty by default.

## Post-Publish Validation

1. Open root wiki URL and verify `home` loads.
2. Confirm fast-action links resolve.
3. Confirm placeholder images are visible.
4. Update `docs/wiki/docs/image-capture-manifest.md` statuses as screenshots are captured/uploaded/linked.
