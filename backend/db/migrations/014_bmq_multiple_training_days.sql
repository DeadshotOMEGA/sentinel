-- Migration: Support multiple training days for BMQ courses
-- BMQ courses can run on multiple days (e.g., Saturday AND Sunday)

-- Convert training_day (VARCHAR) to training_days (TEXT[])
ALTER TABLE bmq_courses
  ADD COLUMN training_days TEXT[];

-- Migrate existing data: convert single day to array
UPDATE bmq_courses
SET training_days = ARRAY[training_day]
WHERE training_day IS NOT NULL;

-- Set NOT NULL constraint after data migration
ALTER TABLE bmq_courses
  ALTER COLUMN training_days SET NOT NULL;

-- Drop old column
ALTER TABLE bmq_courses
  DROP COLUMN training_day;

-- Update comment
COMMENT ON COLUMN bmq_courses.training_days IS 'Days of week for training sessions (lowercase array, e.g., {"saturday", "sunday"})';
