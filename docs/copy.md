You are working on the Sentinel deployment/update system for a Linux appliance.

Context:
- Sentinel is deployed with Docker Compose from: /opt/sentinel/deploy
- The update flow installs a .deb package, then runs:
  ./update.sh --version v#.#.#
- A recent major release added and changed multiple Prisma tables/migrations.
- The current canonical source of truth should be the NEW repo Prisma schema + migrations, not legacy drift in older appliance databases.

Problem observed:
- The update process fails during the Prisma schema parity check.
- `prisma migrate status` reports:
  - Database schema is up to date
  - 6 migrations found
- But `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma` reports drift:
  - Changed the `remote_systems` table
  - Altered column `updated_at` (default changed from `Some(Now)` to `None`)
- This means the live appliance database still has a default of `now()` on `remote_systems.updated_at`, but the current Prisma schema does not define that default.
- The updater then exits with:
  - "Database schema drift detected; review the Prisma diff output above before retrying the update."

Important interpretation:
- The new Prisma schema/migrations should be treated as correct.
- The old appliance DB likely has legacy drift.
- This specific drift is probably fixed by bringing the database in line with the schema, likely:
  ALTER TABLE remote_systems ALTER COLUMN updated_at DROP DEFAULT;

Also observed:
- Running Docker Compose troubleshooting commands outside /opt/sentinel/deploy produced:
  "no configuration file provided: not found"
- So any troubleshooting or remediation commands should either:
  - `cd /opt/sentinel/deploy` first, or
  - use docker compose with an explicit project/compose file strategy.

What I want from you:
1. Analyze this issue and confirm the best fix strategy.
2. Determine whether the correct remediation is:
   - a one-time DB correction on the appliance,
   - a formal Prisma migration,
   - or update-script logic that safely handles known benign legacy drift.
3. Recommend the safest long-term fix.
4. Propose concrete changes to `update.sh` so this is handled better in future releases.
5. Produce code changes if appropriate.

Please think through the tradeoffs carefully.

Specific goals:
- Avoid silently masking real schema drift.
- Allow safe upgrades from older appliance databases.
- Keep the canonical repo schema as the source of truth.
- Preserve a strong safety posture in the updater.
- Improve diagnostics so operators get actionable remediation steps.

Please evaluate at least these options:

Option A:
- Keep strict parity enforcement.
- Detect this exact known legacy drift (`remote_systems.updated_at` default now() vs no default).
- Auto-remediate it before failing, with logging and clear safety checks.

Option B:
- Add a preflight drift remediation step before the parity check.
- For explicitly approved benign drifts, reconcile the DB to the schema automatically.
- Fail on any drift outside the approved allowlist.

Option C:
- Add a proper migration or migration-like compatibility patch to normalize older appliance DBs before running the strict parity check.

I want you to answer with:
1. Root-cause analysis
2. Recommended approach
3. Why that approach is safest
4. Exact changes to `update.sh`
5. Any changes needed in Prisma schema/migrations
6. Example shell code / patch
7. Improved operator-facing error messages
8. Suggested test plan

Additional implementation requirements:
- If auto-remediating, do not use a broad “ignore drift” approach.
- Only auto-fix this exact known drift if it matches precisely.
- Emit clear logs before and after remediation.
- Re-run the Prisma diff after remediation and only continue if clean.
- If remediation fails, stop safely with explicit instructions.
- Ensure commands are run from /opt/sentinel/deploy or otherwise reliably locate the Compose project.
- Consider that some systems may require `sudo docker compose`.
- Backups already happen before the update, but call out whether remediation should happen before or after backup.
- Recommend the best ordering.

Helpful observed command outputs:
- `prisma migrate status` says database schema is up to date.
- `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma` reports:
  remote_systems.updated_at default changed from Some(Now) to None
- Previous update log also described this as likely older appliance drift from the canonical Prisma baseline.

Please be opinionated and practical. I want a robust production-minded fix, not just theory.
