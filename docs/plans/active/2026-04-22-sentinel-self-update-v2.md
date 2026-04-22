---
type: plan
title: "Sentinel self-update v2 implementation plan"
status: active
created: 2026-04-22
last_updated: 2026-04-22
lifecycle: active
reviewed: 2026-04-22
expires: 2026-06-30
ai:
  priority: high
  context_load: always
  triggers:
    - sentinel
    - updater
    - self-update
    - polkit
    - systemd
    - implementation
  token_budget: 2500
owner: Codex + Sentinel maintainer
stakeholders:
  - Sentinel appliance operator
  - Sentinel backend/frontend maintainers
  - Sentinel deployment owner
related_code:
  - deploy/deb/build-deb.sh
  - deploy/deb/assets/usr/lib/sentinel/sentinel-updater
  - deploy/deb/assets/usr/lib/sentinel/sentinel-update-bridge
  - apps/backend/src/routes
  - apps/frontend-admin/src/components/settings
related_plans: []
supersedes: null
superseded_by: null
---

# Sentinel Self-Update V2

**Status:** Active

**Owner:** Codex + Sentinel maintainer

**Timeline:** 2026-04-22 onward

**Current Phase:** Phases 1-3 manually validated on an Ubuntu VM; phases 4-6 are partially validated; published-release, UI, and rollback validation remain

## Executive Summary

Replace the legacy Sentinel web-triggered update path with a new appliance-style self-update subsystem that keeps the backend unprivileged, routes all privileged work through a root-owned updater CLI started by `sentinel-updater.service`, persists update job state on disk, and exposes reconnect-safe update status in the admin UI.

**In one sentence:** Sentinel will request updates through a narrow Unix-socket bridge, and only the host-side updater will install, restart, verify, and roll back the appliance.

**Key changes:**
- Introduce a new root-owned updater CLI, socket bridge, systemd units, and polkit policy/rule bundle
- Add backend admin endpoints for update trigger/status backed by persisted job files
- Add a Settings > Updates UI and navbar status wiring that no longer talks to GitHub directly

## Architecture Decisions Locked In

- The backend remains unprivileged.
- The bridge is Unix-domain-socket only and is not the installer.
- The updater is the only component allowed to invoke `apt-get` or `dpkg`.
- The current Docker/GHCR runtime remains in place for this phase.
- Mutable state moves to `/etc/sentinel`, `/var/lib/sentinel`, `/var/log/sentinel`, and `/run/sentinel`.
- The legacy web-triggered update path stays disabled during migration.

## Phase Plan

### Phase 1: Ownership and path normalization

**Goal:** Move updater config/state into stable appliance-owned paths and stop the legacy web queue from being the active path.

#### Tasks

- [x] Package root-owned updater assets under `deploy/deb/assets/...`
- [x] Migrate `/opt/sentinel/deploy/.env` to `/etc/sentinel/appliance.env` in package `postinst`
- [x] Migrate `/opt/sentinel/deploy/.appliance-state` to `/var/lib/sentinel/appliance/state.json`
- [x] Create `/var/lib/sentinel/updater/{jobs,downloads,backups}`, `/var/log/sentinel`, and `/run/sentinel`
- [x] Disable `sentinel-system-update-request.path/service` in package `postinst`
- [x] Manually verify path ownership/permissions on a test appliance

#### Files changed so far

- `deploy/deb/build-deb.sh`
- `deploy/deb/assets/usr/lib/sentinel/sentinel_update_common.py`
- `deploy/deb/assets/etc/systemd/system/sentinel-update-bridge.socket`
- `deploy/deb/assets/etc/systemd/system/sentinel-update-bridge.service`
- `deploy/deb/assets/etc/systemd/system/sentinel-updater.service`
- `deploy/deb/assets/usr/share/polkit-1/actions/com.deadshotomega.sentinel.update.start.policy`
- `deploy/deb/assets/etc/polkit-1/rules.d/49-sentinel-updater.rules`

#### Exit gate

- [x] Package install creates the new directories with expected ownership
- [ ] Legacy update request units are disabled
- [x] Compatibility symlinks/files still let the existing appliance runtime boot

### Phase 2: Updater CLI manual root validation

**Goal:** Make the host-side updater able to run end-to-end without any frontend/backend dependency.

#### Tasks

- [x] Add `/usr/lib/sentinel/sentinel-updater`
- [x] Enforce stable-only version regex `^v[0-9]+\.[0-9]+\.[0-9]+$`
- [x] Persist `/var/lib/sentinel/updater/current-job.json`
- [x] Persist `/var/lib/sentinel/updater/jobs/<jobId>.json`
- [x] Use `/var/lib/sentinel/updater/update.lock` for single-flight locking
- [x] Implement state machine statuses from `requested` through `rolled_back`
- [x] Define one primary noninteractive install path and one fallback path only
- [x] Explicitly set `DEBIAN_FRONTEND=noninteractive` for package installs
- [x] Capture stdout/stderr for package-manager commands to root-owned logs
- [x] Manually run the updater as root against a real staged job on an appliance
- [ ] Manually verify noninteractive package-install failure behavior

#### Files changed so far

- `deploy/deb/assets/usr/lib/sentinel/sentinel-updater`
- `deploy/deb/assets/usr/lib/sentinel/sentinel_update_common.py`

#### Exit gate

- [ ] Root-only manual updater run can download, verify, install, restart, and health-check successfully
- [x] Failure cases are written to job state plus root-owned logs
- [ ] Rollback prerequisites are captured before `installing`

### Phase 3: Systemd wrapping and local bridge

**Goal:** Supervise updates through systemd and accept backend requests only through a narrow Unix socket.

#### Tasks

- [x] Add `sentinel-updater.service`
- [x] Add `sentinel-update-bridge.socket`
- [x] Add `sentinel-update-bridge.service`
- [x] Keep the bridge Unix-socket only under `/run/sentinel/update-bridge.sock`
- [x] Validate backend callers using peer credentials
- [x] Restrict bridge request payload to a tiny fixed schema
- [x] Ensure the bridge only writes job requests and starts `sentinel-updater.service`
- [x] Manually verify bridge socket permissions from the backend container context
- [x] Manually verify `systemctl start sentinel-updater.service` through the bridge path

#### Files changed so far

- `deploy/deb/assets/usr/lib/sentinel/sentinel-update-bridge`
- `deploy/deb/assets/etc/systemd/system/sentinel-update-bridge.socket`
- `deploy/deb/assets/etc/systemd/system/sentinel-update-bridge.service`
- `apps/backend/Dockerfile`
- `deploy/docker-compose.yml`

#### Exit gate

- [x] Backend container UID/GID can reach the socket
- [x] Non-allowed callers are denied
- [x] Bridge cannot perform installation work on its own

### Phase 4: Backend trigger and status

**Goal:** Expose the new admin update APIs and wire them to persisted job state plus the Unix socket bridge.

#### Tasks

- [x] Define new contracts/schemas for `/api/admin/system/update`
- [x] Add backend bridge client for `/run/sentinel/update-bridge.sock`
- [x] Add backend status reader for `/var/lib/sentinel/updater`
- [x] Add routes:
  - `GET /api/admin/system/update`
  - `POST /api/admin/system/update`
  - `GET /api/admin/system/update/:jobId`
- [x] Enforce `system:update` through `accountLevel >= ADMIN`
- [x] Remove frontend/backend reliance on `/api/network-settings/system-update-latest`
- [x] Add integration tests for auth, validation, duplicate-active-job rejection, and corrupt state handling

#### Files changed so far

- `packages/contracts/src/schemas/system-update.schema.ts`
- `packages/contracts/src/contracts/system-update.contract.ts`
- `packages/contracts/src/contracts/api.contract.ts`
- `packages/contracts/src/contracts/network-setting.contract.ts`

#### Exit gate

- [x] Backend can create a validated update job through the bridge
- [ ] Backend can read current and historical job state from disk
- [ ] Legacy network-settings update route is no longer part of the app path

### Phase 5: Frontend update UI and progress

**Goal:** Show current version, latest version, and reconnect-safe progress in the admin UI.

#### Tasks

- [x] Add a Settings `Updates` panel
- [x] Add confirmation modal before starting an update
- [x] Show current version, latest version, and update-available state
- [x] Poll reconnect-safe job status while updates are active
- [x] Replace navbar GitHub fetch logic with backend-provided update status
- [x] Keep using raw DaisyUI classes where new controls are needed and existing `Dialog` for modal behavior

#### Exit gate

- [ ] Admin can start an update from the UI
- [ ] Browser refresh during update resumes status cleanly
- [ ] Navbar links to the Settings update panel instead of queueing legacy updates

### Phase 6: Polkit production enablement

**Goal:** Allow the stable backend-to-bridge-to-systemd path to run without a root password while remaining narrow by default.

#### Tasks

- [x] Package Sentinel polkit action file
- [x] Package narrow Sentinel polkit rule
- [x] Restrict the rule to the dedicated bridge identity and `sentinel-updater.service`
- [x] End-to-end verify bridge user can start the updater without prompting
- [x] End-to-end verify all other callers are denied by default

#### Exit gate

- [ ] Production path is enabled only after backend/frontend path is stable
- [ ] Non-bridge callers cannot start the updater service

### Phase 7: Hardening and rollback

**Goal:** Harden the service after real behavior is known and make rollback outcomes explicit for operators and the UI.

#### Tasks

- [x] Persist previous-version metadata and cached previous artifact metadata before install
- [x] Define rollback terminal states: `failed`, `rollback_attempted`, `rolled_back`
- [x] Restrict automatic rollback to `post_install`, `restarting`, and `health_check` failures
- [ ] Manually verify rollback artifact retention on disk
- [ ] Manually verify rollback behavior for restart and health-check failures
- [ ] Apply progressive systemd hardening after updater behavior is validated on a real appliance

#### Exit gate

- [ ] Rollback state transitions are visible in job state and UI
- [ ] Hardening settings are validated against real install/restart behavior

## Progress Snapshot

### Completed in code this session

- Added packaged updater assets, systemd units, and appliance polkit scaffolding
- Added Python updater helpers with job persistence, lock file support, noninteractive install environment handling, checksum validation, and rollback scaffolding
- Allowed updater validation to continue when the current published release lacks checksum metadata needed for rollback caching
- Made updater runtime-directory reuse tolerant of the unprivileged bridge service account
- Fixed the bridge polkit invocation and stale-request handling so failed pre-start attempts no longer strand a fake active job
- Switched backend container runtime to a fixed non-root `sentinel-backend` UID/GID for bridge peer-credential checks
- Mounted `/run/sentinel` and `/var/lib/sentinel/updater` into the backend container
- Added new contracts and schemas for the admin system-update API
- Added backend bridge/status services, routes, and route tests for the new admin update API
- Removed the frontend/backend app path that queued legacy `/api/network-settings/system-update-latest` requests
- Added the Settings `Updates` panel, confirmation modal, reconnect-safe polling hook, and navbar update-status link
- Updated release/package workflows to ship `SHA256SUMS.txt` alongside the `.deb`

### In progress right now

- Published-release end-to-end validation for install, restart, and health-check behavior
- Backend HTTP and frontend rendered validation through the running admin stack
- Rollback and hardening validation once a real install path is available

### Not yet verified manually

- Legacy update-request unit disablement on the appliance
- Successful target package install through the updater against a published release
- Backend HTTP trigger/status behavior through the running API
- Settings `Updates` page and navbar flow through the rendered admin UI
- Rollback behavior under real restart/health-check failures

## Manual Test Checkpoints

### Checkpoint A: Package install and path normalization

**Run when:** Phase 1 code is ready on a real Ubuntu test appliance

**Verify:**
- `/etc/sentinel/appliance.env` exists and is readable only by root
- `/var/lib/sentinel/appliance/state.json` exists and contains migrated state
- `/var/lib/sentinel/updater/{jobs,downloads,backups}` exists
- `sentinel-system-update-request.path/service` is disabled
- `sentinel-update-bridge.socket` is enabled

**Status:** Mostly validated on an Ubuntu VM; path ownership, migrated files, socket activation, and runtime compatibility passed, but legacy unit disablement still needs one explicit spot check

### Checkpoint B: Root updater CLI

**Run when:** Phase 2 code is ready on the appliance

**Verify:**
- `sentinel-updater run-current-job` processes a staged job file
- Package install runs fully unattended
- Journald and root-owned job logs capture stdout/stderr
- Failure does not hang waiting for input

**Status:** Partially validated on an Ubuntu VM; root-run updater execution, backup creation, job-state persistence, and expected failure logging passed, but the full install path still needs a published target release

### Checkpoint C: Bridge and systemd path

**Run when:** Phase 3 is wired on the appliance

**Verify:**
- Backend container user can connect to `/run/sentinel/update-bridge.sock`
- Invalid socket callers are rejected
- Bridge can start `sentinel-updater.service`
- Bridge cannot install packages or restart services itself

**Status:** Validated on an Ubuntu VM through the backend container, bridge socket, polkit, and `sentinel-updater.service`

### Checkpoint D: Backend and frontend end-to-end

**Run when:** Phases 4-5 are complete locally

**Verify:**
- Admin can start update from Settings
- Current/latest version and progress are visible after refresh
- Navbar uses backend update status instead of GitHub direct fetch
- Legacy update button/path is gone from the admin UI

**Status:** Not started

### Checkpoint E: Polkit and rollback

**Run when:** Phases 6-7 are complete on the appliance

**Verify:**
- No password prompt is shown to the operator
- Non-bridge callers are denied
- Health-check failure leads to rollback state handling
- Rollback failure leaves actionable terminal state and logs

**Status:** Partially validated on an Ubuntu VM; the no-prompt bridge start path and non-bridge denial behavior passed, but rollback behavior is still not manually validated

## Automated Verification Snapshot

- `pnpm --filter @sentinel/backend typecheck` ✅
- `pnpm --filter @sentinel/contracts build` ✅
- `pnpm --filter frontend-admin typecheck` ✅
- `pnpm --filter frontend-admin exec vitest run --root /home/sentinel000/Projects/Sentinel apps/backend/src/routes/system-update.test.ts apps/backend/src/routes/network-settings.test.ts` ✅
- `bash -n deploy/deb/build-deb.sh deploy/_common.sh` ✅
- `python3 -m py_compile deploy/deb/assets/usr/lib/sentinel/sentinel_update_common.py deploy/deb/assets/usr/lib/sentinel/sentinel-update-bridge deploy/deb/assets/usr/lib/sentinel/sentinel-updater` ✅
- `pnpm dev:all:core` ⚠️ blocked because Docker was not running on the workstation, so the Playwright/UI sanity check is still pending

## Resume Notes

When work resumes, continue in this order:

1. Bring Docker up on the workstation and rerun the local stack
2. Run the rendered sanity check for `/settings?tab=updates` at `1920x1080`
3. Stop for Checkpoint A/B/C manual validation before tightening polkit or hardening assumptions further
4. Continue with polkit appliance validation for the production path
5. Finish rollback drills and progressive service hardening

## Major Updates Log

- 2026-04-22: Created the active implementation plan and progress tracker for Sentinel Self-Update V2.
- 2026-04-22: Recorded current completed code changes for packaging, updater scripts, systemd units, polkit scaffolding, backend container UID/GID alignment, and contracts.
- 2026-04-22: Finished backend admin update routes/services/tests, replaced the navbar’s legacy update flow, added the Settings `Updates` panel, and updated release packaging to publish `SHA256SUMS.txt`.
- 2026-04-22: Recorded that rendered UI verification is pending because `pnpm dev:all:core` is currently blocked by Docker not running locally.
