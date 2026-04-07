CREATE TABLE "live_duty_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "member_id" UUID NOT NULL,
    "duty_position_id" UUID NOT NULL,
    "notes" TEXT,
    "started_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(6),
    "ended_reason" VARCHAR(30),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "live_duty_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_live_duty_assignments_member" ON "live_duty_assignments"("member_id");
CREATE INDEX "idx_live_duty_assignments_position" ON "live_duty_assignments"("duty_position_id");
CREATE INDEX "idx_live_duty_assignments_ended_at" ON "live_duty_assignments"("ended_at");

ALTER TABLE "live_duty_assignments"
    ADD CONSTRAINT "live_duty_assignments_member_id_fkey"
    FOREIGN KEY ("member_id") REFERENCES "members"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "live_duty_assignments"
    ADD CONSTRAINT "live_duty_assignments_duty_position_id_fkey"
    FOREIGN KEY ("duty_position_id") REFERENCES "duty_positions"("id")
    ON DELETE RESTRICT ON UPDATE NO ACTION;
