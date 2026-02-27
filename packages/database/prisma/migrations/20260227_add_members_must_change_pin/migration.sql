-- v1.4.4 patch: backfill auth/session schema expectation from v1.4.3
ALTER TABLE "members"
ADD COLUMN IF NOT EXISTS "must_change_pin" BOOLEAN NOT NULL DEFAULT false;
