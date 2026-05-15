CREATE TABLE "unit_event_visitor_options" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "max_selections" INTEGER,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "unit_event_visitor_options_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_unit_event_visitor_options_event" ON "unit_event_visitor_options"("event_id");

ALTER TABLE "unit_event_visitor_options"
ADD CONSTRAINT "unit_event_visitor_options_event_id_fkey"
FOREIGN KEY ("event_id") REFERENCES "unit_events"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "visitors" ADD COLUMN "unit_event_visitor_option_id" UUID;
ALTER TABLE "visitor_groups" ADD COLUMN "unit_event_visitor_option_id" UUID;

CREATE INDEX "idx_visitors_unit_event_visitor_option" ON "visitors"("unit_event_visitor_option_id");
CREATE INDEX "idx_visitor_groups_unit_event_visitor_option" ON "visitor_groups"("unit_event_visitor_option_id");

ALTER TABLE "visitors"
ADD CONSTRAINT "visitors_unit_event_visitor_option_id_fkey"
FOREIGN KEY ("unit_event_visitor_option_id") REFERENCES "unit_event_visitor_options"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "visitor_groups"
ADD CONSTRAINT "visitor_groups_unit_event_visitor_option_id_fkey"
FOREIGN KEY ("unit_event_visitor_option_id") REFERENCES "unit_event_visitor_options"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
