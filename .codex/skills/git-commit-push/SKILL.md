---
name: git-commit-push
description: Analyze current git changes, create logical Conventional Commit batches, and push them safely to remote. Use when the user says work is finished and asks to commit and/or push, asks to split work into clean logical commits, or asks for commit message help before pushing.
---

# Git Commit Push

## Overview

Create clean git history from in-progress changes by selecting the right commit strategy, staging related files together, writing Conventional Commit messages, and pushing safely.

## Phase 1: Analyze

Run these commands to understand scope and safety before committing:

```bash
git status --short --branch
git diff --stat
git diff --cached --stat
git diff
git branch --show-current
git remote -v
```

Run extra targeted commands when needed:

```bash
git diff -- <path>
git diff --cached -- <path>
git log --oneline --decorate -n 10
```

Safety checks before committing:

- Confirm the repo is not in detached HEAD state. If detached, stop and ask the user how to proceed.
- Confirm at least one remote is configured before attempting push. If no remotes exist, stop and ask the user for target remote.
- Check for files that should not be committed (logs, build output, local secrets). Update `.gitignore` if recurring artifacts appear.
- If a single file mixes unrelated changes, plan to use `git add -p` when staging.

## Phase 2: Commit Strategy

Choose the strategy based on scope:

- Small change: one feature/fix, fewer than 3 files, or trivial edits. Use one commit.
- Large change: multiple features, 3+ substantial files, or mixed concerns. Use multiple logical commits.

When splitting commits:

- Group files by feature/purpose.
- Keep refactors separate from behavior changes.
- Keep docs/tests with the related feature or fix.
- Use `git add -p` for mixed hunks inside one file.
- Avoid staging unrelated files together.

## Branch Policy (Git Flow)

- Treat these as protected by default: `main`, `master`, `production`.
- Do not push directly to protected branches unless the user explicitly asks for a direct push.
- Treat `release/*` as stabilization branches: avoid direct commits when possible and prefer PRs from `feature/*`/`fix/*` into `release/*`.
- Allow normal push flow on working branches such as `rebuild`, `develop`, `feature/*`, `bugfix/*`, and `hotfix/*`.
- If currently on a protected branch and direct push was not explicitly requested, stop and ask how to proceed.

```bash
branch="$(git branch --show-current)"
case "$branch" in
  main|master|production)
    echo "Protected branch detected: $branch. Ask for explicit direct-push approval."
    exit 1
    ;;
esac
```

Release branch note:

- Use `release/vX.Y.Z` only for short-lived release coordination.
- Merge release PRs into `release/vX.Y.Z`, then merge `release/vX.Y.Z` to `main`, then tag `vX.Y.Z`.

## Commit Signing Preference

- Prefer signed commits by default with `git commit -S`.
- If signed commit fails (missing key/agent/config), stop and ask whether unsigned commits are acceptable.
- Do not silently downgrade from signed to unsigned commits.

## Phase 3: Create Commits

### Small Changes

1. Stage relevant files.
2. Commit once with Conventional Commits format.
3. Push branch to remote.

```bash
git add <files>
if ! git commit -S -m "type(scope): subject"; then
  echo "Signed commit failed. Ask the user whether to continue unsigned."
  exit 1
fi
branch="$(git branch --show-current)"
remote="$(git remote | head -n 1)"
if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
  git push
else
  git push -u "$remote" "$branch"
fi
```

### Large Changes

1. Stage first logical batch and commit.
2. Repeat for each batch.
3. Push after all commits.

Example:

```bash
# Feature A
git add src/feature-a.js src/feature-a-utils.js
git commit -S -m "feat(feature-a): implement new feature"

# Feature B
git add -p src/feature-b.js
git commit -S -m "feat(feature-b): add feature"

# Refactor
git add src/refactored-module.js
git commit -S -m "refactor(module): improve structure"

branch="$(git branch --show-current)"
remote="$(git remote | head -n 1)"
if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
  git push
else
  git push -u "$remote" "$branch"
fi
```

## Commit Message Format

Use `type(scope): subject` (scope is optional: `type: subject`).

Types:

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style/formatting
- `refactor` - Code restructuring
- `test` - Adding/updating tests
- `chore` - Maintenance tasks

Use imperative, concise subjects (for example: `fix(auth): handle expired refresh token`).

## Final Steps

1. Confirm expected files and clean tree with `git status --short`.
2. Push to remote using upstream if configured, otherwise set upstream using the first configured remote.
3. List newly created commits with `git log --oneline --decorate -n <count>`.
4. Report commit SHAs and messages to the user.

## Optional PR Step (Only On Explicit Request)

- Do not create a pull request by default.
- Create a PR only when the user explicitly asks and the branch is ready for merge/review.
- For work-in-progress branches, prefer draft PRs.

```bash
branch="$(git branch --show-current)"
if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is not installed. Ask the user whether to create PR manually."
  exit 1
fi
gh pr create --draft --base main --head "$branch"
```

## Failure Handling

- Push rejected (non-fast-forward):

```bash
git fetch --all --prune
branch="$(git branch --show-current)"
branch_rebase="$(git config --get branch."$branch".rebase || true)"
pull_rebase="$(git config --get pull.rebase || true)"
strategy="$branch_rebase"
if [ -z "$strategy" ]; then
  strategy="$pull_rebase"
fi

case "$strategy" in
  true) git pull --rebase ;;
  merges) git pull --rebase=merges ;;
  interactive) git pull --rebase=interactive ;;
  false) git pull --no-rebase ;;
  "")
    echo "No pull strategy configured. Ask the user whether to rebase or merge."
    exit 1
    ;;
  *)
    echo "Unsupported pull strategy: $strategy. Ask the user how to proceed."
    exit 1
    ;;
esac

git push
```

- No upstream on current branch:

```bash
branch="$(git branch --show-current)"
remote="$(git remote | head -n 1)"
git push -u "$remote" "$branch"
```

- Signed commit failure:

```bash
git commit -S -m "type(scope): subject"
# If signing fails, stop and ask whether unsigned commits are allowed.
```

- Commit hook failure: surface the hook error and stop. Do not bypass hooks unless the user explicitly requests it.
