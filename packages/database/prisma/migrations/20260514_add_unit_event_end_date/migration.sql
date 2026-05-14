-- Add an optional end date for unit events so a single event can span multiple calendar days.
-- Existing rows stay valid as one-day events when end_date is NULL.
ALTER TABLE "unit_events" ADD COLUMN "end_date" DATE;

DROP INDEX IF EXISTS "idx_unit_events_date";
CREATE INDEX "idx_unit_events_date_range" ON "unit_events"("event_date", "end_date");
