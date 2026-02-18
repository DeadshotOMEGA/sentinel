# Sentinel Codex System

This directory is a project-scoped Codex home for Sentinel.

## Tracked files

- `config.toml` stores project defaults and MCP server configuration.
- `bin/codex-project` starts Codex with `CODEX_HOME=.codex`.
- `.gitignore` keeps runtime/session artifacts out of git.

## Usage

Run Codex with project settings:

```bash
bash .codex/bin/codex-project
```

Inspect configured MCP servers:

```bash
bash .codex/bin/codex-project mcp list
```

## Notes

- On first run, the launcher links `~/.codex/auth.json` and `~/.codex/models_cache.json` when available.
- Update `LICENSE` and `EMAIL` in `.codex/config.toml` if your MCP server requires non-empty values.
