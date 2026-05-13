# Local Codex Instructions

This directory uses AGENTS-authored rules.

- Read and follow this `AGENTS.md` before editing files in this directory.
- Treat `MUST`/`MUST NOT` in `AGENTS.md` as mandatory constraints.
- Treat `SHOULD` in `AGENTS.md` as defaults.
- If a deeper subdirectory has its own `AGENTS.md`, the deeper rules win.

## Wiki.js Documentation

- Pages under `docs/wiki/` are source pages for the live Wiki.js site at `http://docs.sentinel.local/`.
- Use root-relative Wiki.js links such as `/operations/dashboard/overview` inside wiki pages.
- Use uploaded Wiki.js assets under `/uploads/...` for wiki screenshots.
- Publishing should use the scripts in `scripts/wiki/`; those scripts can load `WIKI_BASE_URL` and `WIKI_API_KEY` from `deploy/.env` when the current shell does not export them.
- Never commit or quote the actual `WIKI_API_KEY`; keep it in ignored env files or the runtime environment.
