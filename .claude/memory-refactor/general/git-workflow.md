# Git Conventions (Git Flow)

## Branch Naming

- `feature/*` — New features (branches from develop)
- `release/*` — Release preparation (branches from develop)
- `hotfix/*` — Emergency production fixes (branches from main)

## Protected Branches

- `main` — Production
- `develop` — Integration

## Commits

- Format: conventional commits (feat:, fix:, chore:, docs:, refactor:, test:)
- Always pull before push
- Rebase preferred over merge

## Push Authentication

- Run `gh auth setup-git` once per session to configure git credentials
- Then use standard `git push` commands
- If push fails with auth errors, re-run `gh auth setup-git`

## Tooling

- Use `git-flow-manager` agent for branch operations
