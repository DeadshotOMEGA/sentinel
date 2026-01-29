-- Unit Event Types
CREATE TABLE "unit_event_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "default_duration_minutes" INTEGER NOT NULL DEFAULT 120,
    "requires_duty_watch" BOOLEAN NOT NULL DEFAULT false,
    "default_metadata" JSONB,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "unit_event_types_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_unit_event_types_category" ON "unit_event_types"("category");

-- Unit Events
CREATE TABLE "unit_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(200) NOT NULL,
    "event_type_id" UUID,
    "event_date" DATE NOT NULL,
    "start_time" TIME(6),
    "end_time" TIME(6),
    "location" VARCHAR(200),
    "description" TEXT,
    "organizer" VARCHAR(200),
    "requires_duty_watch" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "metadata" JSONB,
    "notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "unit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_unit_events_date" ON "unit_events"("event_date");
CREATE INDEX "idx_unit_events_status" ON "unit_events"("status");
CREATE INDEX "idx_unit_events_type" ON "unit_events"("event_type_id");

ALTER TABLE "unit_events" ADD CONSTRAINT "unit_events_event_type_id_fkey"
    FOREIGN KEY ("event_type_id") REFERENCES "unit_event_types"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION;

-- Unit Event Duty Positions
CREATE TABLE "unit_event_duty_positions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "max_slots" INTEGER NOT NULL DEFAULT 1,
    "is_standard" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "unit_event_duty_positions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "unit_event_duty_position_event_code_unique"
    ON "unit_event_duty_positions"("event_id", "code");
CREATE INDEX "idx_unit_event_duty_positions_event"
    ON "unit_event_duty_positions"("event_id");

ALTER TABLE "unit_event_duty_positions" ADD CONSTRAINT "unit_event_duty_positions_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "unit_events"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;

-- Unit Event Duty Assignments
CREATE TABLE "unit_event_duty_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "event_duty_position_id" UUID,
    "member_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'assigned',
    "is_volunteer" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_at" TIMESTAMP(6),
    "released_at" TIMESTAMP(6),
    "notes" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "unit_event_duty_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "unit_event_duty_assignment_unique"
    ON "unit_event_duty_assignments"("event_id", "member_id", "event_duty_position_id");
CREATE INDEX "idx_unit_event_duty_assignments_event"
    ON "unit_event_duty_assignments"("event_id");
CREATE INDEX "idx_unit_event_duty_assignments_member"
    ON "unit_event_duty_assignments"("member_id");

ALTER TABLE "unit_event_duty_assignments" ADD CONSTRAINT "unit_event_duty_assignments_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "unit_events"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "unit_event_duty_assignments" ADD CONSTRAINT "unit_event_duty_assignments_position_fkey"
    FOREIGN KEY ("event_duty_position_id") REFERENCES "unit_event_duty_positions"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "unit_event_duty_assignments" ADD CONSTRAINT "unit_event_duty_assignments_member_fkey"
    FOREIGN KEY ("member_id") REFERENCES "members"("id")
    ON DELETE RESTRICT ON UPDATE NO ACTION;
