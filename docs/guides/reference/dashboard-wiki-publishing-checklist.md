# Dashboard Wiki Publishing Checklist

Use this checklist when publishing Dashboard Driver.js help pages to `http://docs.sentinel.local/`.

## Preconditions

- Wiki.js is reachable at `http://docs.sentinel.local/`.
- `WIKI_BASE_URL` and `WIKI_API_KEY` are available in the environment, repo `.env`, or `deploy/.env`.
- Dashboard screenshots have been captured with sanitized demo data.
- Screenshot files are ready under `docs/wiki/assets/wiki-dashboard/operations/`. The dashboard publish command uploads them to Wiki.js Assets Manager under `/uploads/wiki-dashboard/operations/`.

Create or refresh the local publishing key before publishing:

```bash
pnpm wiki:ensure-api-key
```

## Validate Content

Run from repo root:

```bash
pnpm check:help-slugs
rg -n "TODO:|placehold.co" docs/wiki/operations/dashboard
rg -n "Day Duty" docs/wiki
```

Expected results:

- `pnpm check:help-slugs` passes.
- Dashboard placeholder search returns no matches.
- Terminology search returns no matches.

## Capture Screenshots

Start the frontend locally, then run:

```bash
FRONTEND_URL=http://localhost:3001 pnpm playwright-cli:capture:dashboard
```

Review files in `docs/wiki/assets/wiki-dashboard/operations/` before upload. Reject any screenshot that shows live operational data, private notes, or unexpected browser chrome.

## Dry-Run Publish

Run the grouped dashboard publisher with `--dry-run` first. It validates the Wiki.js API connection, checks the asset folder hierarchy, and reports every page create/update without changing content.

```bash
pnpm wiki:publish:dashboard:dry
```

## Publish

```bash
pnpm wiki:publish:dashboard
```

The command uploads screenshots first, then upserts the Dashboard hub and section pages using the existing Driver.js wiki slugs.

## Home And Theme Refresh

Publish the homepage, Sentinel logo, Wiki.js site branding, and Sentinel theme injection after page import:

```bash
pnpm wiki:publish:home
```

## Final Verification

- Open `http://docs.sentinel.local/operations/dashboard/overview`.
- Open `http://docs.sentinel.local/` and confirm it is a Dashboard-first landing page.
- Confirm the Sentinel logo loads from `/uploads/wiki-dashboard/branding/sentinel-logo.png`.
- Confirm every image loads from `/uploads/wiki-dashboard/operations/`.
- Click every grouped link on the overview page.
- Start each Dashboard guided procedure and confirm every Learn more link opens its matching Wiki.js page.
- Keep `docs/wiki/docs/image-capture-manifest.md` in sync with captured/uploaded status.
