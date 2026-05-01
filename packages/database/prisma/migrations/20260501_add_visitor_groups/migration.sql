CREATE TABLE "visitor_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kiosk_id" VARCHAR(50) NOT NULL,
    "visit_reason" TEXT,
    "visit_purpose" VARCHAR(50),
    "purpose_details" TEXT,
    "event_id" UUID,
    "host_member_id" UUID,
    "check_in_method" VARCHAR(20) DEFAULT 'kiosk_self_service',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitor_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "visitor_group_vehicles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "visitor_group_id" UUID NOT NULL,
    "license_plate" VARCHAR(20) NOT NULL,
    "normalized_license_plate" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitor_group_vehicles_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "visitors"
ADD COLUMN "visitor_group_id" UUID;

CREATE INDEX "idx_visitor_groups_event_id" ON "visitor_groups"("event_id");
CREATE INDEX "idx_visitor_groups_host_member_id" ON "visitor_groups"("host_member_id");
CREATE INDEX "idx_visitor_groups_check_in_method" ON "visitor_groups"("check_in_method");
CREATE INDEX "idx_visitor_groups_created_at" ON "visitor_groups"("created_at" DESC);

CREATE UNIQUE INDEX "visitor_group_vehicles_group_plate_unique"
ON "visitor_group_vehicles"("visitor_group_id", "normalized_license_plate");
CREATE INDEX "idx_visitor_group_vehicles_visitor_group_id"
ON "visitor_group_vehicles"("visitor_group_id");
CREATE INDEX "idx_visitor_group_vehicles_normalized_license_plate"
ON "visitor_group_vehicles"("normalized_license_plate");

CREATE INDEX "idx_visitors_visitor_group_id" ON "visitors"("visitor_group_id");

ALTER TABLE "visitor_groups"
ADD CONSTRAINT "visitor_groups_event_id_fkey"
FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "visitor_groups"
ADD CONSTRAINT "visitor_groups_host_member_id_fkey"
FOREIGN KEY ("host_member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "visitor_group_vehicles"
ADD CONSTRAINT "visitor_group_vehicles_visitor_group_id_fkey"
FOREIGN KEY ("visitor_group_id") REFERENCES "visitor_groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "visitors"
ADD CONSTRAINT "visitors_visitor_group_id_fkey"
FOREIGN KEY ("visitor_group_id") REFERENCES "visitor_groups"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
