CREATE TABLE "access_rules" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" VARCHAR(120) NOT NULL UNIQUE,
  "configured_minimum_level" INTEGER NOT NULL,
  "local_description" VARCHAR(500),
  "status" VARCHAR(30) NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_member_id" UUID
);

ALTER TABLE "access_rules"
  ADD CONSTRAINT "access_rules_updated_by_member_id_fkey"
  FOREIGN KEY ("updated_by_member_id") REFERENCES "members"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE INDEX "idx_access_rules_status" ON "access_rules"("status");
CREATE INDEX "idx_access_rules_updated_by_member" ON "access_rules"("updated_by_member_id");
