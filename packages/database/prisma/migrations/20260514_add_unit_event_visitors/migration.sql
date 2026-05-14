ALTER TABLE "visitors"
ADD COLUMN "unit_event_id" UUID;

ALTER TABLE "visitor_groups"
ADD COLUMN "unit_event_id" UUID;

CREATE INDEX "idx_visitors_unit_event" ON "visitors"("unit_event_id");
CREATE INDEX "idx_visitor_groups_unit_event_id" ON "visitor_groups"("unit_event_id");

ALTER TABLE "visitors"
ADD CONSTRAINT "visitors_unit_event_id_fkey"
FOREIGN KEY ("unit_event_id") REFERENCES "unit_events"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "visitor_groups"
ADD CONSTRAINT "visitor_groups_unit_event_id_fkey"
FOREIGN KEY ("unit_event_id") REFERENCES "unit_events"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
