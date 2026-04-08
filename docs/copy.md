[sentinel] Running one-shot safe migration deploy

> @sentinel/database@2.4.0 prisma:migrate:deploy:safe /app/packages/database
> tsx scripts/migrate-deploy-safe.ts

Datasource "db": PostgreSQL database "sentinel", schema "public" at "postgres:5432"

7 migrations found in prisma/migrations


No pending migrations to apply.
Loaded Prisma config from prisma.config.ts.

Prisma schema loaded from prisma/schema.prisma.
[sentinel] Verifying migration status
Loaded Prisma config from prisma.config.ts.

Prisma schema loaded from prisma/schema.prisma.
Datasource "db": PostgreSQL database "sentinel", schema "public" at "postgres:5432"

7 migrations found in prisma/migrations

┌─────────────────────────────────────────────────────────┐
│  Update available 7.6.0 -> 7.7.0                        │
│  Run the following to update                            │
│    npm i --save-dev prisma@latest                       │
│    npm i @prisma/client@latest                          │
└─────────────────────────────────────────────────────────┘
Database schema is up to date!
[sentinel] Verifying database schema matches the canonical Prisma schema
Loaded Prisma config from prisma.config.ts.


[-] Removed tables
  - live_duty_assignments

[*] Changed the `live_duty_assignments` table
  [-] Removed foreign key on columns (member_id)
  [-] Removed foreign key on columns (duty_position_id)
undefined
/app/packages/database:
 ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command failed with exit code 2: prisma migrate diff --from-schema prisma/schema.prisma --to-config-datasource --exit-code
[sentinel][warn] docker compose failed with 'docker'; retrying with sudo docker.
Loaded Prisma config from prisma.config.ts.


[-] Removed tables
  - live_duty_assignments

[*] Changed the `live_duty_assignments` table
  [-] Removed foreign key on columns (member_id)
  [-] Removed foreign key on columns (duty_position_id)
undefined
/app/packages/database:
 ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command failed with exit code 2: prisma migrate diff --from-schema prisma/schema.prisma --to-config-datasource --exit-code
[sentinel][warn] Canonical Prisma schema parity check failed. Capturing executable database-to-schema drift SQL.
Loaded Prisma config from prisma.config.ts.

[sentinel][warn] Detected non-allowlisted Prisma drift SQL:
[sentinel][warn]   CREATE TABLE "live_duty_assignments" ( "id" UUID NOT NULL DEFAULT gen_random_uuid(), "member_id" UUID NOT NULL, "duty_position_id" UUID NOT NULL, "notes" TEXT, "started_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "ended_at" TIMESTAMP(6), "ended_reason" VARCHAR(30), "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(6) NOT NULL, CONSTRAINT "live_duty_assignments_pkey" PRIMARY KEY ("id") ); CREATE INDEX "idx_live_duty_assignments_member" ON "live_duty_assignments"("member_id"); CREATE INDEX "idx_live_duty_assignments_position" ON "live_duty_assignments"("duty_position_id"); CREATE INDEX "idx_live_duty_assignments_ended_at" ON "live_duty_assignments"("ended_at"); ALTER TABLE "live_duty_assignments" ADD CONSTRAINT "live_duty_assignments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE NO ACTION; ALTER TABLE "live_duty_assignments" ADD CONSTRAINT "live_duty_assignments_duty_position_id_fkey" FOREIGN KEY ("duty_position_id") REFERENCES "duty_positions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
[sentinel][warn] Capturing human-readable drift summary (database -> schema).
Loaded Prisma config from prisma.config.ts.


[+] Added tables
  - live_duty_assignments

[*] Changed the `live_duty_assignments` table
  [+] Added index on columns (member_id)
  [+] Added index on columns (duty_position_id)
  [+] Added index on columns (ended_at)
  [+] Added foreign key on columns (member_id)
  [+] Added foreign key on columns (duty_position_id)

[sentinel][warn] Common cause: an older appliance database drifted from the canonical Prisma baseline.
[sentinel][warn] Only the exact DROP DEFAULT case for public.remote_systems.updated_at is auto-remediated.
[sentinel][warn] A pre-update backup was already created earlier in this run.
[sentinel][warn] No broad drift ignore was applied.
[sentinel][warn] For more detail, rerun on the appliance from any directory:
[sentinel][warn]   sudo docker compose --env-file /opt/sentinel/deploy/.env -f /opt/sentinel/deploy/docker-compose.yml --profile obs exec -T backend sh -lc 'cd /app && pnpm --filter @sentinel/database exec prisma migrate status'
[sentinel][warn]   sudo docker compose --env-file /opt/sentinel/deploy/.env -f /opt/sentinel/deploy/docker-compose.yml --profile obs exec -T backend sh -lc 'cd /app && pnpm --filter @sentinel/database exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma'
[sentinel][warn]   sudo docker compose --env-file /opt/sentinel/deploy/.env -f /opt/sentinel/deploy/docker-compose.yml --profile obs exec -T postgres psql -U sentinel -d sentinel -c "SELECT column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'remote_systems' AND column_name = 'updated_at';"
[sentinel][error] Database schema drift detected; canonical Prisma schema parity is not clean.
[ERROR] Script failed at line 399 with exit code 1.
[ERROR] See log: /tmp/sentinel_update_20260407_185355.log
[ERROR] Raw update output: /tmp/sentinel_update_raw_20260407_185355.log
