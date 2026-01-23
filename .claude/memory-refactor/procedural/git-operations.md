# Git Operations

## Rule

Validate git state before operations. Check preconditions to avoid failures.

## When This Applies

- Committing, merging, rebasing
- Switching branches
- Pushing to remote

## Pre-Operation Checks

```bash
# Before commit: check for staged changes
git diff --cached --quiet && echo "Nothing staged"

# Before branch switch: check for uncommitted changes
git status --porcelain | grep -q . && echo "Uncommitted changes"

# Before push: check if branch exists on remote
git ls-remote --heads origin branch-name
```

## Common Errors

| Error                         | Cause                  | Fix                        |
| ----------------------------- | ---------------------- | -------------------------- |
| `not a git repository`        | Wrong directory        | `cd` to repo root          |
| `merge conflict`              | Divergent changes      | Resolve conflicts manually |
| `detached HEAD`               | Checked out commit     | `git checkout branch-name` |
| `nothing to commit`           | No staged changes      | `git add` files first      |
| `rejected (non-fast-forward)` | Remote has new commits | `git pull --rebase` first  |

## Best Practice

Always run `git status` before destructive operations to understand current state.
