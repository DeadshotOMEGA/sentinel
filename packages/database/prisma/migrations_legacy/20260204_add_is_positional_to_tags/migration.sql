-- Add is_positional flag to tags table
-- Positional tags (e.g., "Facility Manager") display as chips only, not in avatar
ALTER TABLE tags ADD COLUMN is_positional BOOLEAN NOT NULL DEFAULT false;
