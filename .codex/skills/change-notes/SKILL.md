---
name: change-notes
description: Use this skill whenever writing or reviewing commit messages, pull request descriptions, release notes, GitHub Releases, or changelog entries. The goal is to produce clear, human-readable change descriptions that explain what changed, why it matters, who is affected, and whether any action is required. Do not use this skill for code implementation unless the task includes change documentation.
---

# Human-Readable Change Notes Skill

Write change descriptions that can be understood by both developers and non-technical users.

Every commit, pull request, release note, and changelog entry should explain the change well enough to support future changelog writing.

Do not write vague entries like:

- fixed stuff
- update files
- misc cleanup
- improve UI
- bug fixes

Instead, explain the change in plain language.

## Core rule

For every meaningful change, capture:

1. What changed
2. Why it changed
3. Who is affected
4. What the user or operator will notice
5. Whether any action is required
6. Whether there is risk, migration, rollback, or compatibility impact

Use short, direct sentences.

Prefer:

```text
Fixed a bug where duplicate NFC scans could create duplicate attendance records.
```

Avoid:

```text
Fix NFC issue.
```

## Commit Messages

Commit messages should explain one focused change. A good commit message helps a future maintainer understand why the change exists without opening every file.

Use this format:

```text
<type>: <plain-language summary>

<what changed>
<why it changed>
<impact or risk, if any>
```

Use one of these Conventional Commit types:

- feat: New user-visible capability
- fix: Bug fix
- docs: Documentation-only change
- refactor: Internal restructuring with no intended behavior change
- test: Test changes
- chore: Maintenance, dependency, config, or tooling change
- ci: Continuous integration or automation workflow change
- build: Build system, packaging, or dependency pipeline change
- perf: Performance improvement
- security: Security-related change
- deploy: Installer, updater, release, Docker, CI/CD, or appliance deployment change
- db: Database schema, migration, seed, or Prisma-related change
- ux: User experience or interface clarity change

Before finalizing a commit message, ensure it answers:

- What changed?
- Why was it needed?
- Is this user-visible?
- Is this operator-visible?
- Does it affect deployment, update, rollback, backup, restore, database, authentication, permissions, or configuration?
- Does it require follow-up work?

Use concise examples:

```text
fix: prevent duplicate attendance records from repeated NFC scans

Adds a server-side duplicate check before creating an attendance record.
This prevents accidental double entries when a member taps their NFC tag more than once.
No database migration is required.
```

```text
deploy: reject unsafe latest image tags during updates

Updates the appliance updater to require an explicit vX.Y.Z version.
This prevents accidental deployment of untested images.
Operators must provide a version when running update.sh.
```

Avoid:

```text
fix: bug
```

```text
update updater
```

## Pull Request Descriptions

A PR description should explain the complete change set in a way that supports review, testing, release notes, and future changelog writing.

Use this template:

```markdown
## Summary

- Explain the change in 2-5 plain-language bullets.

## Why this change was needed

Explain the problem, gap, risk, or user need.

## What changed

### User-facing

- Include only if applicable.

### Admin/operator-facing

- Include only if applicable.

### Backend/API

- Include only if applicable.

### Database

- Include only if applicable.

### Deployment/update

- Include only if applicable.

### Documentation

- Include only if applicable.

### Tests

- Include only if applicable.

## User impact

Explain what a normal user will notice.

## Operator impact

Explain what an admin, maintainer, or installer operator will notice.

## Upgrade or migration notes

State one of:

- No upgrade action required.
- Database migration required.
- Configuration change required.
- Manual operator action required.

Include exact commands when known.

## Risk and rollback notes

Explain:

- Main risk
- How to verify the change
- Whether rollback is safe
- Any data compatibility concerns

## Testing performed

List actual checks run.

## Changelog candidates

Write human-readable bullets suitable for the release changelog.
```

When a fuller PR example would help, read `references/examples.md`.

PR writing rules:

- Write for a Staff Officer, department user, or appliance operator, not just another developer.
- Explain acronyms the first time unless they are already common in the project.
- Mention database migrations clearly.
- Mention config/env changes clearly.
- Mention breaking changes clearly.
- Mention security-sensitive changes clearly.
- Mention changes to install.sh, update.sh, rollback.sh, backup.sh, restore.sh, Docker, Caddy, GitHub Actions, or GHCR images clearly.
- Do not bury operational risks in technical details.

## Release Notes / GitHub Release Descriptions

Release notes should be readable by non-technical users and useful for operators performing upgrades. They should not be raw commit dumps.

Use this template:

```markdown
# Sentinel vX.Y.Z

## Plain-language summary

Briefly explain what this release does and why it matters.

## Highlights

- Important user-facing change
- Important operator-facing change
- Important fix or safety improvement

## Added

New features or capabilities.

## Changed

Behavior changes, UX changes, deployment changes, or process changes.

## Fixed

Bug fixes.

## Security

Security fixes, dependency vulnerability fixes, permission changes, authentication changes, or safer defaults.

## Deployment and upgrade notes

Include:

- Required version
- Required commands
- Database migration status
- Config/env changes
- Docker/GHCR image notes
- Service restart expectations

## Breaking changes

State `None` if there are no breaking changes.

## Known issues

State `None known` if there are no known issues.

## Rollback notes

Explain whether rollback is safe and include the rollback method if known.

## Verification checklist

List the practical checks an operator should complete after updating.
```

When a fuller release example would help, read `references/examples.md`.

Release note rules:

- Put the most important information first.
- Separate user-facing changes from operator/deployment changes.
- State clearly whether a database migration is required.
- State clearly whether configuration changes are required.
- State clearly whether rollback is safe.
- Use exact version numbers.
- Avoid developer-only wording unless it is in the technical/operator section.
- Do not include every commit. Summarize meaningful changes.

## Changelog Entry Standards

Use changelog categories inspired by Keep a Changelog:

- Added
- Changed
- Deprecated
- Removed
- Fixed
- Security

For Sentinel, also use these operational sections when relevant:

- Deployment
- Database
- Upgrade Notes
- Rollback Notes
- Known Issues

Each changelog bullet should follow this pattern:

```text
- <Plain-language change>. <Why it matters or who it affects.>
```

Examples:

```markdown
### Fixed

- Fixed duplicate attendance records from repeated NFC scans. This prevents accidental double-counting when a member taps their tag more than once.

### Deployment

- Added explicit version validation to the updater. Operators must now provide a version such as `v1.2.0`.

### Upgrade Notes

- No database migration is required.
```

## Required review before final output

Before producing a commit message, PR description, release note, or changelog entry, review it against this checklist:

- Is it understandable to a non-technical reader?
- Does it explain why the change matters?
- Does it identify user impact?
- Does it identify operator impact?
- Does it mention deployment/update impact if relevant?
- Does it mention database migration impact if relevant?
- Does it mention config/env changes if relevant?
- Does it mention security impact if relevant?
- Does it mention breaking changes if relevant?
- Does it avoid vague wording?
- Could this be copied into a changelog with minimal editing?

If any answer is missing, revise before finalizing.

## Output preference

When asked to write a commit message, PR description, release note, or changelog entry:

1. Produce the finished text first.
2. Then provide a short "Why this works" note only if helpful.
3. Do not over-explain unless asked.
