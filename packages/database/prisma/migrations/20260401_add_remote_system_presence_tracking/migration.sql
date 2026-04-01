CREATE TABLE "remote_systems" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "remote_systems_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "remote_systems_code_key" ON "remote_systems"("code");
CREATE INDEX "idx_remote_systems_is_active" ON "remote_systems"("is_active");
CREATE INDEX "idx_remote_systems_display_order" ON "remote_systems"("display_order");

ALTER TABLE "member_sessions"
    ADD COLUMN "remote_system_id" UUID,
    ADD COLUMN "remote_system_name_snapshot" VARCHAR(120) NOT NULL DEFAULT 'Unknown',
    ADD COLUMN "last_seen_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "ended_at" TIMESTAMP(6),
    ADD COLUMN "end_reason" VARCHAR(50);

UPDATE "member_sessions"
SET
    "remote_system_name_snapshot" = 'Legacy Session',
    "last_seen_at" = COALESCE("updated_at", "created_at", CURRENT_TIMESTAMP)
WHERE "remote_system_name_snapshot" = 'Unknown';

CREATE INDEX "idx_member_sessions_remote_system" ON "member_sessions"("remote_system_id");
CREATE INDEX "idx_member_sessions_last_seen_at" ON "member_sessions"("last_seen_at");
CREATE INDEX "idx_member_sessions_ended_at" ON "member_sessions"("ended_at");

ALTER TABLE "member_sessions"
    ADD CONSTRAINT "member_sessions_remote_system_id_fkey"
    FOREIGN KEY ("remote_system_id") REFERENCES "remote_systems"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION;
