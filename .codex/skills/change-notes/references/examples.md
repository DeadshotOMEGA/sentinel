# Change Notes Examples

Load this file when a fuller example would help draft or evaluate a PR description, release note, GitHub Release, or changelog entry.

## PR description example

````markdown
## Summary

- Adds a safer update flow for Sentinel appliance deployments.
- Requires operators to provide an explicit version number instead of allowing `latest`.
- Adds clearer update failure messages when the appliance cannot reach GHCR.

## Why this change was needed

The updater could previously be run in a way that made the deployed version unclear. Sentinel appliances should only run known, version-pinned releases so rollback and support remain predictable.

## What changed

### Operator-facing

- The updater now rejects empty versions and `latest`.
- Error messages now explain the expected version format: `vX.Y.Z`.

### Deployment/update

- Added validation before Docker Compose pulls release images.
- Improved GHCR reachability checks before starting the update.

## User impact

No direct change for attendance users.

## Operator impact

Operators must run updates with an explicit version, such as:

```bash
./update.sh --version v1.2.3
```

## Upgrade or migration notes

No database migration required.

## Risk and rollback notes

The main risk is blocking an update if the version value is malformed. Rollback remains safe because version-pinned images are still used.

## Testing performed

- Ran shellcheck on deployment scripts.
- Tested invalid versions: empty, `latest`, and `1.2.3`.
- Tested valid version: `v1.2.3`.

## Changelog candidates

- Improved appliance update safety by requiring explicit version-pinned releases.
- Added clearer update errors when the requested version is missing or invalid.
````

## Release note example

````markdown
# Sentinel v1.2.0

## Plain-language summary

This release improves appliance update safety and makes deployment failures easier for operators to understand.

## Highlights

- Safer updates using explicit version-pinned images.
- Clearer error messages when GHCR cannot be reached.
- Improved rollback confidence by avoiding ambiguous image tags.

## Changed

- The updater now rejects empty versions and `latest`.
- Update errors now explain the required version format.

## Fixed

- Fixed confusing update failures when a captive portal or network issue blocked GHCR access.

## Security

- Reduced the risk of accidentally deploying an unknown image by requiring explicit release versions.

## Deployment and upgrade notes

Update with:

```bash
./update.sh --version v1.2.0
```

No database migration is required.

No `.env` changes are required.

## Breaking changes

Operators can no longer update using `latest`.

## Known issues

None known.

## Rollback notes

Rollback remains supported using the existing rollback script.

## Verification checklist

- Confirm the frontend loads at `/`.
- Confirm the backend health check responds at `/healthz`.
- Confirm the deployed version shows `v1.2.0`.
- Confirm attendance scanning still works.
````
