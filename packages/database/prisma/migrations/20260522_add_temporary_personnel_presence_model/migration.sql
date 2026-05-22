-- Temporary Personnel presence model.
-- Keeps assignment-bound non-member presence separate from member check-ins and visitor sign-ins.

CREATE TABLE "temporary_personnel_assignments" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" varchar(200) NOT NULL,
  "sponsor_name" varchar(200) NOT NULL,
  "sponsor_member_id" uuid,
  "unit_event_id" uuid,
  "starts_at" timestamp(6) NOT NULL,
  "ends_at" timestamp(6) NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'draft',
  "notes" text,
  "ended_at" timestamp(6),
  "revoked_at" timestamp(6),
  "created_at" timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "temporary_personnel_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "temporary_personnel_assignments_sponsor_member_id_fkey"
    FOREIGN KEY ("sponsor_member_id") REFERENCES "members"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "temporary_personnel_assignments_unit_event_id_fkey"
    FOREIGN KEY ("unit_event_id") REFERENCES "unit_events"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE TABLE "temporary_personnel" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "assignment_id" uuid NOT NULL,
  "display_name" varchar(200) NOT NULL,
  "rank_prefix" varchar(50),
  "first_name" varchar(100),
  "last_name" varchar(100),
  "organization" varchar(200) NOT NULL,
  "role" varchar(100),
  "mobile_phone" varchar(25),
  "notes" text,
  "status" varchar(20) NOT NULL DEFAULT 'active',
  "ended_at" timestamp(6),
  "revoked_at" timestamp(6),
  "created_at" timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "temporary_personnel_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "temporary_personnel_assignment_id_fkey"
    FOREIGN KEY ("assignment_id") REFERENCES "temporary_personnel_assignments"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE "temporary_personnel_nfc_assignments" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "temporary_personnel_id" uuid NOT NULL,
  "badge_id" uuid NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'assigned',
  "assigned_at" timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ended_at" timestamp(6),
  "returned_at" timestamp(6),
  "created_at" timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "temporary_personnel_nfc_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "temporary_personnel_nfc_assignments_temporary_personnel_id_fkey"
    FOREIGN KEY ("temporary_personnel_id") REFERENCES "temporary_personnel"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "temporary_personnel_nfc_assignments_badge_id_fkey"
    FOREIGN KEY ("badge_id") REFERENCES "badges"("id")
    ON DELETE RESTRICT ON UPDATE NO ACTION
);

CREATE TABLE "temporary_personnel_checkins" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "temporary_personnel_id" uuid NOT NULL,
  "badge_id" uuid,
  "nfc_assignment_id" uuid,
  "direction" varchar(10) NOT NULL,
  "timestamp" timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "kiosk_id" varchar(50) NOT NULL,
  "method" varchar(30) NOT NULL DEFAULT 'badge',
  "reason" varchar(500),
  "created_by_admin" uuid,
  "created_at" timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "temporary_personnel_checkins_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "temporary_personnel_checkins_temporary_personnel_id_fkey"
    FOREIGN KEY ("temporary_personnel_id") REFERENCES "temporary_personnel"("id")
    ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "temporary_personnel_checkins_badge_id_fkey"
    FOREIGN KEY ("badge_id") REFERENCES "badges"("id")
    ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "temporary_personnel_checkins_nfc_assignment_id_fkey"
    FOREIGN KEY ("nfc_assignment_id") REFERENCES "temporary_personnel_nfc_assignments"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE INDEX "idx_temporary_personnel_assignments_status"
  ON "temporary_personnel_assignments" ("status");
CREATE INDEX "idx_temporary_personnel_assignments_dates"
  ON "temporary_personnel_assignments" ("starts_at", "ends_at");
CREATE INDEX "idx_temporary_personnel_assignments_sponsor_member_id"
  ON "temporary_personnel_assignments" ("sponsor_member_id");
CREATE INDEX "idx_temporary_personnel_assignments_unit_event_id"
  ON "temporary_personnel_assignments" ("unit_event_id");

CREATE INDEX "idx_temporary_personnel_assignment_id"
  ON "temporary_personnel" ("assignment_id");
CREATE INDEX "idx_temporary_personnel_status"
  ON "temporary_personnel" ("status");
CREATE INDEX "idx_temporary_personnel_display_name"
  ON "temporary_personnel" ("display_name");

CREATE INDEX "idx_temporary_personnel_nfc_assignments_person_id"
  ON "temporary_personnel_nfc_assignments" ("temporary_personnel_id");
CREATE INDEX "idx_temporary_personnel_nfc_assignments_badge_id"
  ON "temporary_personnel_nfc_assignments" ("badge_id");
CREATE INDEX "idx_temporary_personnel_nfc_assignments_status"
  ON "temporary_personnel_nfc_assignments" ("status");
CREATE INDEX "idx_temporary_personnel_nfc_assignments_assigned_at"
  ON "temporary_personnel_nfc_assignments" ("assigned_at");

CREATE INDEX "idx_temporary_personnel_checkins_person_timestamp"
  ON "temporary_personnel_checkins" ("temporary_personnel_id", "timestamp" DESC);
CREATE INDEX "idx_temporary_personnel_checkins_badge_id"
  ON "temporary_personnel_checkins" ("badge_id");
CREATE INDEX "idx_temporary_personnel_checkins_nfc_assignment_id"
  ON "temporary_personnel_checkins" ("nfc_assignment_id");
CREATE INDEX "idx_temporary_personnel_checkins_kiosk"
  ON "temporary_personnel_checkins" ("kiosk_id", "timestamp" DESC);
CREATE INDEX "idx_temporary_personnel_checkins_timestamp"
  ON "temporary_personnel_checkins" ("timestamp" DESC);
CREATE INDEX "idx_temporary_personnel_checkins_method"
  ON "temporary_personnel_checkins" ("method");
